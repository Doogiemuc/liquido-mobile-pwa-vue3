/**
 * End-2-end test for switching between the teams of one user.
 *
 * <h3>Preconditions</h3>
 * Needs the seeded multi-team scenario from TestDataCreator: the user
 * `multiteammember4711@liquido.vote` is a member of BOTH `multiTeamA4711` and `multiTeamB4711`,
 * while `testadmin4711@liquido.vote` belongs to one team only. Both halves matter - the whole point
 * of the feature is that the control appears for the first user and not for the second.
 */

const MULTI_TEAM = {
	email: "multiteammember4711@liquido.vote",
	teamA: "multiTeamA4711",
	teamB: "multiTeamB4711",
}

context('Switch Team', () => {

	/** Log in with email & password, the way login-tests.cy.js does. */
	const loginWith = email => {
		cy.visit("/login")
		cy.get("#login-page")
		cy.get("#loginEmailInput").type(email)
		cy.get("#continueButton").click()
		cy.env(["passwordSuffix"])
			.then(({ passwordSuffix }) => email + passwordSuffix)
			.then(password => cy.get("#loginPasswordInput").type(password))
		cy.get("#loginWithEmailPasswordButton").click()
		cy.get("#team-home")
	}

	/** Read the team name the page is currently showing. */
	const currentTeamName = () => cy.get("#team-home").invoke("attr", "data-teamname")

	it('A user of only one team is offered no team switcher', function() {
		loginWith(Cypress.expose("admin").email)

		// Progressive disclosure: nothing at all, not even a disabled control.
		cy.get("#switchTeamSection").should("not.exist")
		cy.get("#switchTeamButton").should("not.exist")
	})

	it('A user of several teams can switch, and the page follows', function() {
		loginWith(MULTI_TEAM.email)

		// The switcher is offered ...
		cy.get("#switchTeamButton").should("be.visible")
		// ... and the list is collapsed until asked for.
		cy.get("#switchTeamList").should("not.exist")

		cy.get("#switchTeamButton").click()
		cy.get("#switchTeamList").should("be.visible")

		// Both teams are listed, and the one we are in is marked as current and not clickable.
		cy.get("#switchTeamList button").should("have.length", 2)
		cy.get("#switchTeamList button").contains(MULTI_TEAM.teamA).should("exist")
		cy.get("#switchTeamList button").contains(MULTI_TEAM.teamB).should("exist")

		currentTeamName().then(teamBefore => {
			const other = teamBefore === MULTI_TEAM.teamA ? MULTI_TEAM.teamB : MULTI_TEAM.teamA

			// WHEN switching into the other team
			cy.get("#switchTeamList button").contains(other).click()

			// THEN the page shows that team, in place, without a reload
			cy.get(`#team-home[data-teamname="${other}"]`)
			// AND the list has closed again
			cy.get("#switchTeamList").should("not.exist")
			// AND the header title followed along
			cy.contains(other)

			// AND the choice survives a full reload: the router logs back in via the stored JWT, and
			// the backend resolves the team from lastTeamId. This is the part that would silently
			// regress if switchTeam stopped persisting.
			cy.reload()
			cy.get(`#team-home[data-teamname="${other}"]`)

			// Leave the seeded user in the team they started in, so this spec can run again unchanged.
			cy.get("#switchTeamButton").click()
			cy.get("#switchTeamList button").contains(teamBefore).click()
			cy.get(`#team-home[data-teamname="${teamBefore}"]`)
		})
	})
})
