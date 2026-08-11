/**
 * Polly flow tests.
 *
 * Drives the whole use case through the real polly client against the polly mock backend:
 * create with one passkey tap -> friends vote through one link -> owner finishes.
 *
 * Run with NODE_ENV=development, because the bare "config" import is aliased to
 * config/config.<NODE_ENV> and only the development config enables the mock backend.
 *
 *   NODE_ENV=development npx vitest run tests/unit/polly-flow.spec.js
 */

import { beforeEach, describe, test, expect } from "vitest"
import pollyApi from "@/polly/polly-client.js"
import passkey from "@/polly/polly-passkey.js"
import { PollyError, POLLY_STATUS } from "@/polly/polly-constants.js"
import { resetPollyMockState } from "@/polly/polly-client.mock.js"
import { clearSession } from "@/polly/polly-session.js"
import config from "config"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const QUESTION = "Where shall we go for dinner?"
const OPTIONS = ["Pizza", "Sushi", "Burger"]

/**
 * Become a brand new person with their own phone and their own passkey.
 * Registering directly (rather than wiping the mock) means every identity in a test keeps
 * existing, so we can switch back and forth exactly like several real people would.
 * @returns the session token identifying this person, to hand to asPerson() later
 */
async function asNewPerson() {
	clearSession()
	await passkey.register()
	return pollyApi.getSessionJwt()
}

/** Come back as someone we met earlier, on their own device. */
function asPerson(sessionJwt) {
	pollyApi.setSession(sessionJwt)
}

/** Nobody at all: no session, no passkey. This is a friend who has just opened the link. */
function asStranger() {
	clearSession()
}

/** Create a polly the way the UI does: one passkey tap, and it is live. */
async function createPolly(title = QUESTION, options = OPTIONS) {
	await passkey.ensurePasskeySession()
	return pollyApi.createPolly(title, options)
}

beforeEach(() => {
	localStorage.clear()
	resetPollyMockState()
})

describe("setup", () => {
	test("development runs against the mock backend with the passkey ceremony stubbed", () => {
		expect(config.mockBackend).toBe(true)
		expect(config.mockPasskey).toBe(true)
		expect(config.pollyLinkPrefix).toBeTruthy()
	})
})

describe("creating a polly", () => {
	test("one passkey tap and the polly is live immediately - there is no start step", async () => {
		const polly = await createPolly()

		expect(polly.status).toBe(POLLY_STATUS.VOTING)
		expect(polly.publicId).toBeTruthy()
		expect(polly.isOwner).toBe(true)
		expect(polly.numBallots).toBe(0)
		expect(polly.proposals.map(p => p.title)).toEqual(OPTIONS)
	})

	test("the public id is opaque, not a guessable sequence", async () => {
		const first = await createPolly()
		await asNewPerson()
		const second = await pollyApi.createPolly("Another question entirely", ["Yes", "No"])

		expect(first.publicId).not.toEqual(second.publicId)
		expect(first.publicId).not.toMatch(/^\d+$/)
		expect(first.publicId.length).toBeGreaterThanOrEqual(8)
	})

	test("a polly needs a question and at least two options", async () => {
		await passkey.ensurePasskeySession()
		await expect(pollyApi.createPolly("", OPTIONS)).rejects.toMatchObject({ pollyErrorCode: PollyError.INVALID_POLLY })
		await expect(pollyApi.createPolly(QUESTION, ["Only one"])).rejects.toMatchObject({ pollyErrorCode: PollyError.INVALID_POLLY })
	})

	test("creating without a passkey is refused", async () => {
		await expect(pollyApi.createPolly(QUESTION, OPTIONS)).rejects.toMatchObject({
			pollyErrorCode: PollyError.NEED_PASSKEY,
		})
	})
})

describe("one link for everyone", () => {
	test("the creator is recognised by their passkey and sees admin rights", async () => {
		const polly = await createPolly()
		const owner = pollyApi.getSessionJwt()

		asStranger()
		asPerson(owner)							// the creator comes back on their own phone

		expect((await pollyApi.getPolly(polly.publicId)).isOwner).toBe(true)
	})

	test("a friend opening the same link is not the owner", async () => {
		const polly = await createPolly()
		await asNewPerson()

		expect((await pollyApi.getPolly(polly.publicId)).isOwner).toBe(false)
	})

	test("a polly can be read with no session at all, so the link works before any tap", async () => {
		const polly = await createPolly()
		asStranger()			// no passkey, no session

		const seen = await pollyApi.getPolly(polly.publicId)
		expect(seen.title).toBe(QUESTION)
		expect(seen.isOwner).toBe(false)
		expect(seen.alreadyVoted).toBe(false)
	})

	test("an unknown link gives a clean not-found", async () => {
		await expect(pollyApi.getPolly("doesNotExist")).rejects.toMatchObject({
			pollyErrorCode: PollyError.POLLY_NOT_FOUND,
		})
	})
})

describe("voting", () => {
	test("a friend votes with no account, just one passkey tap", async () => {
		const polly = await createPolly()
		await asNewPerson()

		const voted = await pollyApi.voteInPolly(polly.publicId, polly.proposals.map(p => p.id))

		expect(voted.numBallots).toBe(1)
		expect(voted.alreadyVoted).toBe(true)
	})

	test("the owner votes in their own polly like everybody else", async () => {
		const polly = await createPolly()

		const voted = await pollyApi.voteInPolly(polly.publicId, polly.proposals.map(p => p.id))

		expect(voted.numBallots).toBe(1)
		expect(voted.alreadyVoted).toBe(true)
		expect(voted.isOwner).toBe(true)		// voting does not cost them their admin rights
	})

	test("the same passkey cannot vote twice, even in a fresh session", async () => {
		const polly = await createPolly()
		const me = pollyApi.getSessionJwt()
		await pollyApi.voteInPolly(polly.publicId, polly.proposals.map(p => p.id))

		asStranger()
		asPerson(me)							// same passkey, brand new session

		await expect(pollyApi.voteInPolly(polly.publicId, polly.proposals.map(p => p.id)))
			.rejects.toMatchObject({ pollyErrorCode: PollyError.ALREADY_VOTED })
	})

	test("different people each get their own vote", async () => {
		const polly = await createPolly()

		for (let i = 0; i < 3; i++) {
			await asNewPerson()
			await pollyApi.voteInPolly(polly.publicId, polly.proposals.map(p => p.id))
		}

		expect((await pollyApi.getPolly(polly.publicId)).numBallots).toBe(3)
	})

	test("voting without a passkey is refused", async () => {
		const polly = await createPolly()
		asStranger()

		await expect(pollyApi.voteInPolly(polly.publicId, polly.proposals.map(p => p.id)))
			.rejects.toMatchObject({ pollyErrorCode: PollyError.NEED_PASSKEY })
	})

	test("a vote order referring to unknown options is refused", async () => {
		const polly = await createPolly()
		await expect(pollyApi.voteInPolly(polly.publicId, ["9999"]))
			.rejects.toMatchObject({ pollyErrorCode: PollyError.INVALID_POLLY })
	})
})

describe("editing", () => {
	test("the owner may fix the wording while nobody has voted", async () => {
		const polly = await createPolly()

		const edited = await pollyApi.editPolly(polly.publicId, "Where shall we eat tonight?", ["Pizza", "Ramen"])

		expect(edited.title).toBe("Where shall we eat tonight?")
		expect(edited.proposals.map(p => p.title)).toEqual(["Pizza", "Ramen"])
	})

	test("editing is refused once somebody has voted", async () => {
		const polly = await createPolly()
		const owner = pollyApi.getSessionJwt()

		await asNewPerson()
		await pollyApi.voteInPolly(polly.publicId, polly.proposals.map(p => p.id))

		asPerson(owner)							// the owner, on their own device, tries to change it
		await expect(pollyApi.editPolly(polly.publicId, "Too late to change this", ["A", "B"]))
			.rejects.toMatchObject({ pollyErrorCode: PollyError.POLLY_ALREADY_STARTED })
	})

	test("a friend cannot edit someone else's polly", async () => {
		const polly = await createPolly()
		await asNewPerson()

		await expect(pollyApi.editPolly(polly.publicId, "Hijacked completely", ["A", "B"]))
			.rejects.toMatchObject({ pollyErrorCode: PollyError.NOT_POLLY_OWNER })
	})
})

describe("finishing", () => {
	test("the winner reflects the ballots that were cast", async () => {
		const polly = await createPolly()
		const owner = pollyApi.getSessionJwt()
		const sushi = polly.proposals.find(p => p.title === "Sushi")
		const rest = polly.proposals.filter(p => p.id !== sushi.id).map(p => p.id)

		// two friends both put Sushi on top
		for (let i = 0; i < 2; i++) {
			await asNewPerson()
			await pollyApi.voteInPolly(polly.publicId, [sushi.id, ...rest])
		}

		asPerson(owner)							// the owner closes it
		const finished = await pollyApi.finishPolly(polly.publicId)

		expect(finished.status).toBe(POLLY_STATUS.FINISHED)
		expect(finished.winner.title).toBe("Sushi")
		expect(finished.numBallots).toBe(2)
	})

	test("a friend cannot finish someone else's polly", async () => {
		const polly = await createPolly()
		await asNewPerson()

		await expect(pollyApi.finishPolly(polly.publicId))
			.rejects.toMatchObject({ pollyErrorCode: PollyError.NOT_POLLY_OWNER })
	})

	test("a finished polly takes no more votes", async () => {
		const polly = await createPolly()
		await pollyApi.finishPolly(polly.publicId)

		await asNewPerson()
		await expect(pollyApi.voteInPolly(polly.publicId, polly.proposals.map(p => p.id)))
			.rejects.toMatchObject({ pollyErrorCode: PollyError.POLLY_FINISHED })
	})
})

describe("myPollys replaces the email", () => {
	test("a passkey finds back everything it created", async () => {
		await passkey.ensurePasskeySession()
		await pollyApi.createPolly("First question here", ["A", "B"])
		await pollyApi.createPolly("Second question here", ["C", "D"])

		const mine = await pollyApi.myPollys()
		expect(mine).toHaveLength(2)

		await asNewPerson()
		expect(await pollyApi.myPollys()).toHaveLength(0)
	})
})

describe("isolation from the team app", () => {
	test("the polly session lives under its own storage key", async () => {
		await passkey.ensurePasskeySession()

		expect(localStorage.getItem("LIQUIDO_POLLY_JWT")).toBeTruthy()
		// The team router guard reads LIQUIDO_JWT. A polly must never put anything there,
		// or the guard would try to hydrate a team from it and log the user out.
		expect(localStorage.getItem("LIQUIDO_JWT")).toBeNull()
	})

	test("creating a polly leaves the team's cached poll list untouched", async () => {
		const api = (await import("@/services/liquido-graphql-client.js")).default
		const before = api.getCachedPolls().map(p => p.id)

		await createPolly()

		expect(api.getCachedPolls().map(p => p.id)).toEqual(before)
	})

	/**
	 * The module boundary, enforced rather than remembered.
	 *
	 * The first version of Polly reused liquido-graphql-client.js, and a polly promptly
	 * leaked into the team's poll list through the shared pollsCache. Keeping the two
	 * import graphs disjoint is what makes that class of bug impossible, so it is worth
	 * a test rather than a comment somebody will edit away.
	 */
	test("the two modules never import each other", () => {
		// vitest.config.js pins `root` to the repo, and vitest runs with cwd there.
		// (import.meta.url is not a file:// URL under vitest's transform, so fileURLToPath fails.)
		const root = process.cwd()

		const filesUnder = dir => fs.existsSync(dir)
			? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
				const full = path.join(dir, entry.name)
				return entry.isDirectory() ? filesUnder(full) : [full]
			})
			: []

		// Match real import/from statements only - the files talk *about* each other in comments,
		// and explaining the boundary must not count as crossing it.
		const importsOf = file => [...fs.readFileSync(file, "utf8")
			.matchAll(/(?:^|\n)\s*(?:import\s[^\n]*?from\s+|import\s+)["']([^"']+)["']/g)]
			.map(match => match[1])

		const pollyFiles = filesUnder(path.join(root, "src/polly"))
		expect(pollyFiles.length).toBeGreaterThan(0)

		const offenders = pollyFiles
			.filter(file => importsOf(file).some(spec => spec.includes("liquido-graphql-client")))
			.map(file => path.relative(root, file))
		expect(offenders, "src/polly must not import the team client").toEqual([])

		// ... and nothing outside the module may reach into it, except the views that render it
		const allowedOutside = ["src/components/polly-vote.vue", "src/views/polly-page.vue"]
		const outsideOffenders = ["src/services", "src/components", "src/views"]
			.flatMap(dir => filesUnder(path.join(root, dir)))
			.filter(file => importsOf(file).some(spec => spec.startsWith("@/polly/")))
			.map(file => path.relative(root, file))
			.filter(rel => !allowedOutside.includes(rel))
		expect(outsideOffenders, "only the polly views may import the polly module").toEqual([])
	})
})

