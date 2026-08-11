/**
 * Mock backend for the Polly module.
 *
 * Entirely separate from liquido-graphql-client.mock.js: its own state, its own
 * sessionStorage key, its own id space. A polly in here can never turn up in the team's
 * poll list, because the two mocks share no data at all.
 */

import config from "config"
import { PollyError, POLLY_STATUS } from "./polly-constants.js"
import { getSessionJwt } from "./polly-session.js"

const MOCK_STATE_KEY = "LIQUIDO_POLLY_MOCK_STATE"

const deepClone = val => JSON.parse(JSON.stringify(val))
const nowIso = () => new Date().toISOString()

export const isPollyMockActive = () => config.mockBackend === true

const createState = () => ({
	pollys: [],
	/** Credentials "registered on this device". Cleared to simulate a different phone. */
	credentials: [],
	nextProposalId: 1,
	nextCredentialId: 1,
})

let mockState = loadState()

function loadState() {
	try {
		if (typeof window !== "undefined" && window.sessionStorage) {
			const saved = window.sessionStorage.getItem(MOCK_STATE_KEY)
			if (saved) return JSON.parse(saved)
		}
	} catch (e) {
		console.error("POLLY MOCK: cannot load state", e)
	}
	return createState()
}

function saveState() {
	try {
		if (typeof window !== "undefined" && window.sessionStorage) {
			window.sessionStorage.setItem(MOCK_STATE_KEY, JSON.stringify(mockState))
		}
	} catch (e) {
		console.error("POLLY MOCK: cannot save state", e)
	}
}

/** Tests call this to start from a clean slate. */
export function resetPollyMockState() {
	mockState = createState()
	saveState()
}

const rejectPolly = (pollyErrorCode, msg) => {
	const err = new Error(msg)
	err.pollyErrorCode = pollyErrorCode
	throw err
}

/**
 * Short opaque public id.
 * Never the database key: with a sequential id the share link would be the only access
 * control, and /polly/1,2,3... would enumerate every polly ever created.
 */
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const newPublicId = () => Array.from({ length: 10 },
	() => BASE58[Math.floor(Math.random() * BASE58.length)]).join("")

/* ===================== identity ===================== */

/**
 * The JWT stands in for "this browser holds credential X".
 * The real backend derives the same thing from a verified WebAuthn assertion.
 * We read it from the very same place polly-session.js writes it, so a page reload
 * (or a test that clears storage) behaves exactly like the real thing.
 */
const jwtForCredential = credentialId => `mock-polly-jwt-${credentialId}`

function currentCredential() {
	const match = (getSessionJwt() || "").match(/^mock-polly-jwt-(.+)$/)
	return match ? match[1] : undefined
}

function currentCredentialOrThrow() {
	const credentialId = currentCredential()
	if (!credentialId) rejectPolly(PollyError.NEED_PASSKEY, "No polly passkey session")
	return credentialId
}

/**
 * Stands in for HMAC(serverSecret, credentialId + pollyId).
 * Per polly on purpose: the same person is unlinkable across different pollys.
 */
const voterKey = (credentialId, publicId) => `vk:${credentialId}:${publicId}`

/** Stands in for HMAC(serverSecret, credentialId) - stable, used for ownership and myPollys. */
const ownerKey = credentialId => `ok:${credentialId}`

/* ===================== passkey ceremony ===================== */

/**
 * Simulates the two WebAuthn ceremonies. `register` mints a new credential for this
 * "device"; `login` returns the one already there, and fails if there is none - which is
 * exactly what makes ensurePasskeySession() fall through to registration on a first visit.
 */
export async function pollyPasskeyMock(kind) {
	if (kind === "register") {
		const credentialId = String(mockState.nextCredentialId++)
		mockState.credentials.push(credentialId)
		saveState()
		console.log("POLLY MOCK: registered passkey", credentialId)
		return { jwt: jwtForCredential(credentialId) }
	}

	const credentialId = mockState.credentials[mockState.credentials.length - 1]
	if (!credentialId) {
		return Promise.reject({ pollyErrorCode: PollyError.NEED_PASSKEY, msg: "No passkey on this device" })
	}
	console.log("POLLY MOCK: logged in with passkey", credentialId)
	return { jwt: jwtForCredential(credentialId) }
}

/**
 * Test helper: forget this browser's passkey, as if a friend opened the link on their own
 * phone. Their next ensurePasskeySession() registers a fresh credential, i.e. a new voter.
 */
export function __mockNewDevice() {
	mockState.credentials = []
	saveState()
}

/* ===================== data ===================== */

const findPolly = publicId => mockState.pollys.find(p => p.publicId === publicId)

const findPollyOrThrow = publicId => {
	const polly = findPolly(publicId)
	if (!polly) rejectPolly(PollyError.POLLY_NOT_FOUND, `Polly ${publicId} not found`)
	return polly
}

/** Shape a polly the way the backend would, for whoever is asking. */
function view(polly) {
	const credentialId = currentCredential()
	return {
		publicId: polly.publicId,
		title: polly.title,
		status: polly.status,
		createdAt: polly.createdAt,
		votingEndAt: polly.votingEndAt,
		numBallots: polly.ballots.length,
		isOwner: !!credentialId && polly.ownerKey === ownerKey(credentialId),
		alreadyVoted: !!credentialId && polly.ballots.some(b => b.voterKey === voterKey(credentialId, polly.publicId)),
		proposals: deepClone(polly.proposals),
		winner: polly.winner ? deepClone(polly.winner) : null,
	}
}

function requireOwner(polly) {
	const credentialId = currentCredentialOrThrow()
	if (polly.ownerKey !== ownerKey(credentialId)) {
		rejectPolly(PollyError.NOT_POLLY_OWNER, "Only the polly owner may do that")
	}
	return credentialId
}

/**
 * Tideman Ranked Pairs, simplified here to counting first preferences.
 * The real backend shares the full implementation with LIQUIDO polls - that is the one
 * piece of logic the two products genuinely have in common.
 */
function determineWinner(polly) {
	const firstPreferences = new Map()
	polly.ballots.forEach(ballot => {
		const top = ballot.voteOrder[0]
		if (top != null) firstPreferences.set(String(top), (firstPreferences.get(String(top)) || 0) + 1)
	})
	return polly.proposals
		.slice()
		.sort((a, b) => (firstPreferences.get(String(b.id)) || 0) - (firstPreferences.get(String(a.id)) || 0))[0] || null
}

const handlers = {

	createPolly: variables => {
		const credentialId = currentCredentialOrThrow()
		const titles = (variables.proposalTitles || []).map(t => t?.trim()).filter(Boolean)
		if (!variables.title?.trim()) rejectPolly(PollyError.INVALID_POLLY, "A polly needs a title")
		if (titles.length < 2) rejectPolly(PollyError.INVALID_POLLY, "A polly needs at least two options")

		const polly = {
			publicId: newPublicId(),
			title: variables.title.trim(),
			// Live immediately. There is no elaboration phase and no start step.
			status: POLLY_STATUS.VOTING,
			createdAt: nowIso(),
			votingEndAt: null,
			ownerKey: ownerKey(credentialId),
			proposals: titles.map(title => ({ id: String(mockState.nextProposalId++), title })),
			ballots: [],
			winner: null,
		}
		mockState.pollys.push(polly)
		saveState()
		return view(polly)
	},

	polly: variables => view(findPollyOrThrow(variables.publicId)),

	editPolly: variables => {
		const polly = findPollyOrThrow(variables.publicId)
		requireOwner(polly)
		if (polly.status === POLLY_STATUS.FINISHED) rejectPolly(PollyError.POLLY_FINISHED, "Polly is finished")
		if (polly.ballots.length > 0) {
			rejectPolly(PollyError.POLLY_ALREADY_STARTED, "Cannot change a polly once somebody has voted")
		}
		const titles = (variables.proposalTitles || []).map(t => t?.trim()).filter(Boolean)
		if (titles.length < 2) rejectPolly(PollyError.INVALID_POLLY, "A polly needs at least two options")

		polly.title = variables.title.trim()
		polly.proposals = titles.map((title, i) => ({
			id: polly.proposals[i]?.id || String(mockState.nextProposalId++),
			title,
		}))
		saveState()
		return view(polly)
	},

	voteInPolly: variables => {
		const credentialId = currentCredentialOrThrow()
		const polly = findPollyOrThrow(variables.publicId)
		if (polly.status === POLLY_STATUS.FINISHED) rejectPolly(PollyError.POLLY_FINISHED, "Polly is finished")

		const key = voterKey(credentialId, polly.publicId)
		// Stands in for UNIQUE(polly_id, voter_key). One vote per passkey, enforced by the
		// database rather than by application logic that could be forgotten in some code path.
		if (polly.ballots.some(b => b.voterKey === key)) {
			rejectPolly(PollyError.ALREADY_VOTED, "You already voted in this polly")
		}

		const validIds = new Set(polly.proposals.map(p => String(p.id)))
		const voteOrder = (variables.voteOrder || []).map(String)
		if (voteOrder.length === 0 || voteOrder.some(id => !validIds.has(id))) {
			rejectPolly(PollyError.INVALID_POLLY, "Invalid vote order")
		}

		polly.ballots.push({ voterKey: key, voteOrder, createdAt: nowIso() })
		saveState()
		return view(polly)
	},

	finishPolly: variables => {
		const polly = findPollyOrThrow(variables.publicId)
		requireOwner(polly)
		polly.status = POLLY_STATUS.FINISHED
		polly.votingEndAt = nowIso()
		polly.winner = determineWinner(polly)
		saveState()
		return view(polly)
	},

	myPollys: () => {
		const credentialId = currentCredentialOrThrow()
		const key = ownerKey(credentialId)
		return mockState.pollys.filter(p => p.ownerKey === key).map(view)
	},
}

/** Work out which operation a query string is asking for. Longest names first. */
function detectOperation(query) {
	for (const name of ["createPolly", "editPolly", "voteInPolly", "finishPolly", "myPollys", "polly"]) {
		if (new RegExp(`\\b${name}\\b`).test(query)) return name
	}
	return undefined
}

export function pollyQueryMock(query, variables = {}) {
	const operation = detectOperation(query)
	if (!operation || !handlers[operation]) {
		return Promise.reject({ msg: "POLLY MOCK: unhandled operation in " + query })
	}
	try {
		const payload = handlers[operation](variables)
		return Promise.resolve({ data: { [operation]: payload } })
	} catch (err) {
		return Promise.reject({ pollyErrorCode: err.pollyErrorCode, msg: err.message })
	}
}
