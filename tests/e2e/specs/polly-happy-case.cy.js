/**
 * End-2-end HAPPY CASE test for the LIQUIDO **Polly** flow.
 *
 * A Polly is the small, fast sibling of a LIQUIDO poll: no team, no account, no login screen.
 * One opaque link that everybody opens, an identity that is nothing but a passkey, and the same
 * core idea - you *sort* the options instead of picking one.
 *
 * This walks the normal, successful journey exactly as two people would live it:
 *
 *   1. Someone opens the app and writes a question with a few options.
 *   2. Creating it makes it live immediately - there is no "start the vote" step.
 *   3. They share one link, and vote in their own polly.
 *   4. A FRIEND opens that link, and votes with a different order of preference.
 *   5. The owner sees both ballots, finishes the polly, and a winner is shown.
 *   6. The finished polly stays readable through the very same link.
 *
 * No error cases and no edge cases - those live in polly.cy.js and in the backend's PollyTests.
 *
 * <h2>Why this uses real passkeys, and how a second person is simulated</h2>
 *
 * A Polly identity IS a passkey, so a test that mocks the passkey away is not testing a Polly.
 * polly.cy.js takes that shortcut deliberately (config.mockPasskey), which is why it cannot run
 * against a real deployment. This spec instead registers a Chrome DevTools virtual authenticator,
 * the same way happy-case.cy.js does for the team flow, so the WebAuthn ceremony genuinely
 * completes and this runs against any real backend.
 *
 * That also buys the thing the product is actually about: **a second voter**. Swapping the virtual
 * authenticator for a fresh one, and dropping the polly session, is a new device with no
 * credentials - which is exactly what "a friend opens your link" looks like to the backend.
 */

const now = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const QUESTION = `Where shall we go for dinner ${now}`
/** Typed in this order, and - because the owner accepts the default order - also their ballot. */
const OPTIONS = [`Pizza ${now}`, `Sushi ${now}`, `Burger ${now}`]

/** The polly's opaque public id, captured once it is live. Its share link is built from this. */
let publicId
let pollyUrl

/** The CDP id of the virtual authenticator currently plugged in, so it can be unplugged again. */
let authenticatorId

/**
 * The owner's polly session, kept so they can come back after the friend has voted.
 *
 * On a real phone the owner simply still has it - they never logged out. Here the browser is shared
 * between both people, so the friend's turn overwrites it and it has to be put back by hand.
 */
let ownerSession

/**
 * Plug in a fresh virtual WebAuthn authenticator and return to a state with NO credentials on it.
 *
 * Chromium's WebAuthn testing API stands in for the fingerprint sensor a headless browser does not
 * have. Removing the previous authenticator first is the important half: leaving it plugged in
 * would let the browser answer the next usernameless login with the credential it already holds,
 * and the "friend" would silently be the same person - the test would still pass, while proving
 * nothing about a second voter.
 * https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
 */
function plugInFreshAuthenticator() {
	cy.then(() => Cypress.automation("remote:debugger:protocol", { command: "WebAuthn.enable", params: {} }))
	cy.then(() => {
		if (!authenticatorId) return
		return Cypress.automation("remote:debugger:protocol", {
			command: "WebAuthn.removeVirtualAuthenticator",
			params: { authenticatorId },
		}).then(() => { authenticatorId = undefined })
	})
	cy.then(() => Cypress.automation("remote:debugger:protocol", {
		command: "WebAuthn.addVirtualAuthenticator",
		params: {
			options: {
				protocol: "ctap2",
				transport: "internal",            // a platform authenticator, ie. Face-ID / fingerprint
				hasResidentKey: true,             // discoverable, so the usernameless login path works
				hasUserVerification: true,
				isUserVerified: true,
				automaticPresenceSimulation: true, // completes on its own, like a real fingerprint would
			},
		},
	})).then(res => { authenticatorId = res.authenticatorId })
}

/** Forget the polly session in this browser, so the next ceremony starts from nothing. */
function forgetPollySession() {
	cy.window().then(win => win.localStorage.removeItem("LIQUIDO_POLLY_JWT"))
}

/* When one step fails the rest cannot mean anything - they build on each other. Stop the run. */
afterEach(function() {
	if (this.currentTest.state === "failed") {
		console.log("[ERROR] Cypress polly happy case step failed. Aborting.")
		Cypress.runner.stop()
	}
})

// testIsolation:false - this is one journey, and the person IS their polly session in
// localStorage. Cypress' default would wipe it between steps and every step would be a stranger.
context("LIQUIDO Polly Happy Case", { testIsolation: false }, () => {

	before(() => {
		cy.visit("/polly")
		cy.window().then(win => {
			win.localStorage.removeItem("LIQUIDO_POLLY_JWT")
			win.localStorage.removeItem("LIQUIDO_JWT")
		})
	})

	it("A blank polly is offered straight away, with no login and two empty options", () => {
		cy.visit("/polly")

		// No account, no team, no login screen - the page you land on is already the editor.
		cy.get("#pollyPageTitle").scrollIntoView().should("be.visible")
		cy.get("#pollyTitleInput").scrollIntoView().should("be.visible")
		cy.get(".polly-proposal-input").should("have.length", 2)

		// AND there is nothing to save yet
		cy.get("#savePollyButton").should("be.disabled")
	})

	it("The owner writes a question and three options", () => {
		cy.get("#pollyTitleInput").clear().type(QUESTION)

		// Filling the LAST row always offers a fresh one underneath, so the list grows as you type
		// and you are never asked up front how many options you want.
		cy.get(".polly-proposal-input").eq(0).type(OPTIONS[0])
		cy.get(".polly-proposal-input").should("have.length", 2)
		cy.get(".polly-proposal-input").eq(1).type(OPTIONS[1])
		cy.get(".polly-proposal-input").should("have.length", 3)
		cy.get(".polly-proposal-input").eq(2).type(OPTIONS[2])
		cy.get(".polly-proposal-input").should("have.length", 4)

		// A question plus two options is a choice, so it can be created now
		cy.get("#savePollyButton").should("not.be.disabled")
	})

	it("Creating it makes it live immediately - there is no start step", () => {
		// The owner's passkey is registered during save, so the ceremony must be able to succeed
		plugInFreshAuthenticator()

		cy.get("#savePollyButton").click()

		// THEN the editor is replaced by the live polly, carrying the question that was typed
		cy.get("#pollyTitle").should("contain", QUESTION)
		cy.get("#pollyTitleInput").should("not.exist")
		cy.get("#pollyStatus").scrollIntoView().should("be.visible")

		// AND it is votable right away - no separate "start the voting phase" anywhere
		cy.get("#castVoteButton").scrollIntoView().should("be.visible")
		// AND, being the owner, they may also close it
		cy.get("#finishPollyButton").scrollIntoView().should("be.visible")

		// AND nobody was logged into a team along the way. A Polly is a different product.
		cy.window().then(win => {
			ownerSession = win.localStorage.getItem("LIQUIDO_POLLY_JWT")
			expect(ownerSession, "polly session").to.be.a("string")
			expect(win.localStorage.getItem("LIQUIDO_JWT"), "team session must stay untouched").to.be.null
		})

		// AND no vote has been cast yet
		cy.get("#pollyStatus").should("have.attr", "data-num-ballots", "0")
	})

	it("There is one share link, and it gives nothing away", () => {
		cy.get("#sharePollyButton").scrollIntoView().should("be.visible")

		cy.get("#sharePollyButton").invoke("attr", "data-public-id").then(id => {
			publicId = id
			pollyUrl = "/polly/" + publicId

			expect(publicId, "a polly is addressed by a public id").to.be.a("string")
			// A sequential id would make the share link the only access control, and /polly/1,2,3...
			// would enumerate the question, the options and the result of every polly ever created.
			expect(publicId, "the id must be opaque, not a row number").to.not.match(/^\d+$/)
			expect(publicId.length, "roughly 58 bits of base58").to.be.at.least(8)
		})
	})

	it("The owner votes in their own polly, keeping the order they typed", () => {
		// The options are offered in the order they were written, each numbered - that IS the ballot,
		// and accepting it as it stands is a legitimate vote.
		cy.get("#pollyDraggable .sortable-proposal").should("have.length", 3)
		cy.get(".proposal-index-number").eq(0).should("contain", "1.")
		cy.get("#pollyDraggable .sortable-proposal-title").eq(0).should("contain", OPTIONS[0])
		cy.get("#pollyDraggable .sortable-proposal-title").eq(2).should("contain", OPTIONS[2])

		cy.get("#castVoteButton").click()

		// A vote can only be cast once, so it is confirmed first - via the shared root popup
		cy.get("#rootPopupModal").should("be.visible")
		cy.get("#rootPopupModalPrimaryButton").click()

		// THEN the ballot is replaced by the read-only list, and the vote is counted
		cy.get("#castVoteButton").should("not.exist")
		cy.get("#pollyStatus").scrollIntoView().should("be.visible")
			.should("have.attr", "data-already-voted", "true")
			.should("have.attr", "data-num-ballots", "1")

		// AND the owner may still close the polly
		cy.get("#finishPollyButton").scrollIntoView().should("be.visible")
	})

	it("A friend opens the share link and votes with a different order of preference", () => {
		// A different device with a different passkey - which is all a Polly identity is.
		plugInFreshAuthenticator()
		forgetPollySession()

		cy.visit(pollyUrl)

		// THEN the friend sees the same question ...
		cy.get("#pollyTitle").should("contain", QUESTION)
		// ... and gets a ballot of their own: the owner's vote is not theirs
		cy.get("#castVoteButton").scrollIntoView().should("be.visible")
		cy.get("#pollyStatus").should("have.attr", "data-already-voted", "false")
		// ... but they are NOT the owner, so they cannot close somebody else's polly
		cy.get("#finishPollyButton").should("not.exist")
		cy.get("#editPollyButton").should("not.exist")

		// WHEN they sort the options differently: the third option up to second place, behind the
		// first. Dragging is what a person does here; the helper does it to the same state the drag
		// would, because native HTML5 drag'n'drop is not reliably simulable in Cypress.
		cy.window().then(win => {
			expect(win.liquidoPollyTest, "polly test helper should be exposed on window").to.exist
			win.liquidoPollyTest.moveProposalToTop(2)   // [C, A, B]
			win.liquidoPollyTest.moveProposalToTop(1)   // [A, C, B]
		})

		// THEN the ballot shows that order, favourite still first
		cy.get("#pollyDraggable .sortable-proposal-title").eq(0).should("contain", OPTIONS[0])
		cy.get("#pollyDraggable .sortable-proposal-title").eq(1).should("contain", OPTIONS[2])
		cy.get("#pollyDraggable .sortable-proposal-title").eq(2).should("contain", OPTIONS[1])

		// WHEN the friend casts that ballot
		cy.get("#castVoteButton").click()
		cy.get("#rootPopupModal").should("be.visible")
		cy.get("#rootPopupModalPrimaryButton").click()

		// THEN their vote counts as a second, separate ballot
		cy.get("#castVoteButton").should("not.exist")
		cy.get("#pollyStatus").scrollIntoView()
			.should("have.attr", "data-already-voted", "true")
			.should("have.attr", "data-num-ballots", "2")
	})

	it("One passkey means one vote, so re-opening the link offers no second ballot", () => {
		cy.visit(pollyUrl)

		cy.get("#pollyTitle").should("contain", QUESTION)
		cy.get("#castVoteButton").should("not.exist")
		cy.get("#pollyStatus").scrollIntoView()
			.should("have.attr", "data-already-voted", "true")
			.should("have.attr", "data-num-ballots", "2")
	})

	it("The owner comes back, finishes the polly, and the winner is the option both ranked first", () => {
		// The owner is their passkey, so being the owner again means plugging that authenticator back
		// in. There is no "log in as" - and this is the one place a virtual authenticator cannot help,
		// because the credential itself was thrown away with the device. Restore the session instead:
		// it is the same thing the browser would still be holding on the owner's own phone.
		cy.window().then(win => win.localStorage.setItem("LIQUIDO_POLLY_JWT", ownerSession))
		cy.visit(pollyUrl)

		// THEN they are the owner again, and both ballots are in
		cy.get("#pollyStatus").scrollIntoView().should("have.attr", "data-num-ballots", "2")
		cy.get("#finishPollyButton").scrollIntoView().should("be.visible").click()

		// THEN the result is revealed, with exactly one winner
		cy.get(".winner-proposal").should("have.length", 1)
		cy.get(".fa-trophy").scrollIntoView().should("be.visible")

		// AND it is the RIGHT one. Both voters put OPTIONS[0] first, so it beats each of the others
		// head to head - the Condorcet winner. The two disagreed about second and third place, which
		// is what makes this a real count rather than one ballot copied twice.
		cy.get(".winner-proposal").should("contain", OPTIONS[0])

		// AND the polly is over: nobody can vote any more, not even the owner
		cy.get("#castVoteButton").should("not.exist")
		cy.get("#finishPollyButton").should("not.exist")
	})

	it("The finished polly stays readable through the very same link", () => {
		cy.visit(pollyUrl)

		cy.get("#pollyTitle").should("contain", QUESTION)
		cy.get(".winner-proposal").should("have.length", 1).and("contain", OPTIONS[0])
		cy.get("#castVoteButton").should("not.exist")
	})

	it("The whole journey never touched the team side of the app", () => {
		cy.window().then(win => {
			// Nobody registered, nobody joined a team, nobody logged in.
			expect(win.localStorage.getItem("LIQUIDO_JWT"), "no team session").to.be.null
		})
	})
})
