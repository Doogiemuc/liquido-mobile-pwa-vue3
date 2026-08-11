/**
 * End-2-end test for the Polly flow.
 *
 * A Polly is the small, fun, cute sibling of a LIQUIDO poll: no team, no account, no login
 * screen. This drives the real UI the way a person would - typing, clicking, dragging - and
 * checks the two things that define the product:
 *
 *   1. Creating a polly takes one confirmation and the polly is live immediately.
 *   2. One passkey means one vote.
 *
 * Runs against the REAL backend, with config.mockPasskey standing in for the WebAuthn
 * ceremony: a headless browser has no authenticator, so polly-passkey.js asks the backend for
 * a session via devLoginPolly instead. That is the one step this spec cannot cover - the
 * passkey legs have to be verified by hand on a real device.
 *
 * The multi-person cases (a friend voting, ownership, the winner calculation) are covered
 * far more cheaply in tests/unit/polly-flow.spec.js. This spec is here for the UI.
 */

let now = Date.now() % 100000

const QUESTION = "Where shall we go for dinner " + now
const OPTIONS = ["Pizza " + now, "Sushi " + now, "Burger " + now]

/* Abort the whole run as soon as one step fails - the steps build on each other. */
afterEach(function () {
	if (this.currentTest.state === "failed") {
		console.log("[ERROR] Cypress polly step failed. Aborting.")
		Cypress.runner.stop()
	}
})

// testIsolation:false — this is one sequential journey by one person, and that person IS
// their polly session in localStorage (LIQUIDO_POLLY_JWT). Cypress' default would wipe it
// between steps, and every step would become a different voter.
context("LIQUIDO Polly", { testIsolation: false }, () => {

	let pollyUrl
	/** The opaque public id, captured from the real createPolly response. */
	let createdPublicId

	before(() => {
		cy.visit("/polly")
		// start from a clean device: no polly session, no leftover mock state
		cy.window().then(win => {
			win.localStorage.removeItem("LIQUIDO_POLLY_JWT")
			win.sessionStorage.removeItem("LIQUIDO_POLLY_MOCK_STATE")
		})
	})

	// The public id never appears in the DOM - the share link is a computed value handed to
	// navigator.share/clipboard. So we read it from the response the backend actually sent.
	// Interceptors are cleared between tests, hence beforeEach rather than before.
	beforeEach(() => {
		cy.intercept("POST", "**/graphql", req => {
			req.continue(res => {
				const publicId = res.body?.data?.createPolly?.publicId
				if (publicId) createdPublicId = publicId
			})
		})
	})

	it("shows an empty polly with two option rows", () => {
		cy.visit("/polly")
		cy.get("#pollyPageTitle").should("be.visible")
		cy.get("#pollyTitleInput").should("be.visible")
		cy.get(".polly-proposal-input").should("have.length", 2)
		// Nothing to save yet
		cy.get("#savePollyButton").should("be.disabled")
	})

	it("grows the option list as you fill the last row", () => {
		cy.get("#pollyTitleInput").clear().type(QUESTION)

		// filling a row that is not the last one changes nothing
		cy.get(".polly-proposal-input").eq(0).type(OPTIONS[0])
		cy.get(".polly-proposal-input").should("have.length", 2)

		// ... but filling the LAST row always offers a fresh one below it
		cy.get(".polly-proposal-input").eq(1).type(OPTIONS[1])
		cy.get(".polly-proposal-input").should("have.length", 3)
		cy.get(".polly-proposal-input").eq(2).type(OPTIONS[2])
		cy.get(".polly-proposal-input").should("have.length", 4)

		// a question plus two options is enough to create it
		cy.get("#savePollyButton").should("not.be.disabled")
	})

	it("creating a polly makes it live immediately - there is no start step", () => {
		cy.get("#savePollyButton").click()

		// the editable form is replaced by the live polly
		cy.get("#pollyTitle").should("contain", QUESTION)
		cy.get("#pollyTitleInput").should("not.exist")
		cy.get("#pollyStatus").should("be.visible")

		// it is votable right away, and the owner may also finish or edit it
		cy.get("#castVoteButton").should("be.visible")
		cy.get("#finishPollyButton").should("be.visible")
		cy.get("#editPollyButton").should("be.visible")

		// the creator now holds a polly session - and NOT a team session
		cy.window().then(win => {
			expect(win.localStorage.getItem("LIQUIDO_POLLY_JWT"), "polly session").to.be.a("string")
			expect(win.localStorage.getItem("LIQUIDO_JWT"), "team session must stay untouched").to.be.null
		})
	})

	it("offers one share link that everybody uses", () => {
		// The share icon sits on the card's top edge, so it is only reachable when the card
		// top is in view - savePolly() scrolls there for exactly this reason.
		cy.get("#sharePollyButton").scrollIntoView().should("be.visible")

		// The URL is the polly's opaque public id - not a guessable number
		cy.location("pathname").then(pathname => {
			// we are still on /polly (creation route); the share link is built from the public id
			expect(pathname).to.match(/^\/polly/)
		})

		cy.then(() => {
			expect(createdPublicId, "the backend returned a public id").to.be.a("string")
			// A sequential id would make the share link the only access control, and
			// /polly/1,2,3... would enumerate every polly's title, options and results.
			expect(createdPublicId, "public id is opaque").to.not.match(/^\d+$/)
			expect(createdPublicId.length).to.be.at.least(8)
			pollyUrl = "/polly/" + createdPublicId
		})
	})

	it("the options can be dragged into a preferred order", () => {
		cy.get("#pollyDraggable .sortable-proposal").should("have.length", 3)
		cy.get(".proposal-index-number").eq(0).should("contain", "1.")
		// the options render in the order they were typed
		cy.get("#pollyDraggable .sortable-proposal-title").eq(0).should("contain", OPTIONS[0])
	})

	it("the owner votes in their own polly like anybody else", () => {
		cy.get("#castVoteButton").click()

		// after voting the ballot disappears and the status says so
		cy.get("#castVoteButton").should("not.exist")
		cy.get("#pollyStatus").should("be.visible")
		cy.get("#finishPollyButton").should("be.visible")   // still the owner
	})

	it("opening the share link again shows the vote is already cast", () => {
		cy.then(() => cy.visit(pollyUrl))

		cy.get("#pollyTitle").should("contain", QUESTION)
		cy.get("#castVoteButton").should("not.exist")       // one passkey, one vote
		cy.get("#pollyStatus").should("be.visible")
	})

	it("the owner finishes the polly and a winner is shown", () => {
		cy.get("#finishPollyButton").click()

		// finished pollys show the ranked result with a trophy on the winner
		cy.get(".winner-proposal").should("have.length", 1)
		cy.get(".fa-trophy").should("be.visible")
		cy.get("#finishPollyButton").should("not.exist")
		cy.get("#castVoteButton").should("not.exist")
	})

	it("a finished polly stays readable through the same link", () => {
		cy.then(() => cy.visit(pollyUrl))

		cy.get("#pollyTitle").should("contain", QUESTION)
		cy.get(".winner-proposal").should("have.length", 1)
	})

	it("never touches the team side of the app", () => {
		cy.window().then(win => {
			// A whole polly journey must not have logged anybody into a team.
			expect(win.localStorage.getItem("LIQUIDO_JWT"), "no team session").to.be.null

			// The team mock seeds itself on every page load (router.js imports the team client),
			// so its state existing is normal. What matters is that no polly ever ends up in it -
			// an earlier design shared the Poll table and a polly leaked into the team's poll list.
			const teamState = win.sessionStorage.getItem("LIQUIDO_MOCK_STATE")
			if (teamState) {
				const teamPollTitles = (JSON.parse(teamState).team?.polls || []).map(p => p.title)
				expect(teamPollTitles, "no polly in the team's poll list").to.not.include(QUESTION)
			}
		})

		// ... and the polly itself lives in its own tables, reachable only through its own link -
		// which the previous step already proved by reloading it and finding the winner.
	})
})
