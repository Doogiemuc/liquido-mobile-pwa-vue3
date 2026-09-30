/**
 * An admin can finish a running poll straight from the ballot page (cast-vote.vue).
 *
 * A running poll the user has not voted in yet opens the ballot directly - from the poll list and
 * from the shortcut on team-home - and never the detail page (poll-show.vue). So an admin who has
 * not voted, and maybe never will, needs the "finish voting phase" action on the ballot page too.
 * happy-case.cy.js only covers the other path: its admin votes first, and then finishes on the
 * detail page.
 *
 * MOCK MODE ONLY. It relies on the mock seed (src/mockdata/teamUserJwt.json): testadmin4711 is the
 * admin of the seed team, poll 305 is in VOTING and he has not voted in it, and mock1 is a plain
 * member of the same team. A real backend has no such fixed poll, so the spec skips itself there.
 */

const POLL_ID = 305
const ADMIN_EMAIL = "testadmin4711@liquido.vote"
const MEMBER_EMAIL = "mock1@liquido.vote"
const pollCard = `.poll-card[data-poll-id="${POLL_ID}"]`

/** Log in through the dev-only /devLogin route. The mock does not check the token. */
function devLogin(email) {
	localStorage.removeItem("LIQUIDO_JWT")
	cy.visit(`/devLogin?email=${encodeURIComponent(email)}&token=${Cypress.env("devLoginToken")}`)
	cy.get("#team-home")
}

/**
 * Wait until root-app.vue's page slide transition has finished. While it runs, the page sits in a
 * transformed container, and Cypress then considers the position:fixed modal not visible.
 */
function waitForPageTransition() {
	cy.get("[class*='-enter-active'], [class*='-leave-active']").should("not.exist")
}

context("Admin finishes a poll from the ballot page", { testIsolation: false }, () => {

	before(function() {
		if (Cypress.expose("mode") !== "mock") this.skip()
		cy.request("POST", "/mock/reset")   // fresh mock data: poll 305 is in VOTING again
	})

	it("[Member] A member sees no finish action on the ballot page", function() {
		devLogin(MEMBER_EMAIL)
		cy.visit(`/polls/${POLL_ID}/castVote`)
		cy.get("#cast-vote-page")
		cy.get("#castVoteButton").should("exist")   // page has finished loading
		cy.get("#finishVoteButton").should("not.exist")
	})

	it("[Admin] The poll list opens a running poll directly on the ballot, and Back returns to the list", function() {
		devLogin(ADMIN_EMAIL)
		cy.visit("/polls")
		cy.get(pollCard).should("have.attr", "data-poll-status", "VOTING")

		// WHEN he clicks the running poll he has not voted in yet
		cy.get(pollCard).first().click()

		// THEN he lands on the ballot in one step, not on the detail page
		cy.get("#cast-vote-page")
		cy.location("pathname").should("eq", `/polls/${POLL_ID}/castVote`)

		// AND Back goes up to the list again
		waitForPageTransition()
		cy.get("#liquidoHeader .header-action-btn--left").click()
		cy.get("#polls-page")
		cy.location("pathname").should("eq", "/polls")
	})

	it("[Admin] Admin finishes the poll from the ballot page, after confirming", function() {
		// GIVEN the admin on the ballot of the running poll, reached via the shortcut on team-home
		// (a plain variable, not an alias: Cypress re-runs an aliased query, and this card is gone
		// once we are on the ballot page)
		let numBallots
		cy.visit("/team")
		cy.get(`.polls-in-voting-container ${pollCard}`).invoke("attr", "data-num-ballots").then(n => { numBallots = n })
		cy.get(`.polls-in-voting-container ${pollCard}`).click()
		cy.get("#cast-vote-page")
		waitForPageTransition()

		// THEN the admin box at the bottom shows the same number of ballots as the poll card
		cy.get("#finishVoteButton").scrollIntoView().should("be.visible")
		cy.then(() => {
			expect(numBallots, "number of ballots on the team-home card").to.match(/^\d+$/)
			cy.get(".alert-admin[data-num-ballots]").should("have.attr", "data-num-ballots", numBallots)
		})

		// WHEN he clicks finish, but cancels the confirmation
		cy.get("#finishVoteButton").click()
		cy.get("#finishPollModal").should("be.visible")
		cy.get("#finishPollModalSecondaryButton").click()

		// THEN nothing happened: still on the ballot, and the poll is still running
		cy.get("#finishPollModal").should("not.be.visible")
		cy.location("pathname").should("eq", `/polls/${POLL_ID}/castVote`)
		cy.get(pollCard).should("have.attr", "data-poll-status", "VOTING")

		// WHEN he clicks finish again and confirms
		cy.get("#finishVoteButton").click()
		cy.get("#finishPollModal").should("be.visible")
		cy.get("#finishPollModalPrimaryButton").click()

		// THEN he goes forward to the winner page of the now finished poll
		cy.get("#poll-winner-page")
		cy.location("pathname").should("eq", `/polls/${POLL_ID}/winner`)
		cy.get(pollCard).should("have.attr", "data-poll-status", "FINISHED")

		// AND Back goes up to the list, where the poll is finished too
		waitForPageTransition()
		cy.get("#liquidoHeader .header-action-btn--left").click()
		cy.get("#polls-page")
		cy.get(pollCard).should("have.attr", "data-poll-status", "FINISHED")

		// AND team-home no longer offers it as a poll to vote in
		cy.visit("/team")
		cy.get("#team-home")
		cy.get(`.polls-in-voting-container ${pollCard}`).should("not.exist")
	})
})
