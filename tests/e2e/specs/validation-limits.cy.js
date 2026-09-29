/**
 * E2E coverage for the validation limits served by `query liquidoConfig` (usernameMinLength,
 * pollTitleMinLength, ...) and now actually enforced server-side via @Size on UserEntity.name /
 * PollEntity.title (see LiquidoConfigMatchesEntityTest.java in the backend).
 *
 * The frontend's own validation is a UX nicety, not a security boundary - so besides the one
 * UI-level test, this spec calls the GraphQL API directly with cy.request(), bypassing the
 * frontend's own liquido-input checks entirely, to prove the backend rejects a too-short value
 * even from a client that skips the form.
 */

const now = Date.now() % 1000000

context("Validation limits", () => {

	it("Frontend blocks registration with a too-short nickname", () => {
		//GIVEN the create-team registration form
		cy.visit("/welcome")
		cy.get("#welcomeV2CreateTeamButton").scrollIntoView().should("be.visible").click()

		//WHEN filling in an otherwise-valid form but a too-short nickname (below usernameMinLength)
		cy.get("#welcomeV2NicknameInput").type("Al")
		cy.get("#welcomeV2TeamNameInput").type("ValidationTestTeam" + now)
		cy.get("#welcomeV2EmailInput").type("valtest" + now + "@liquido.vote")
		cy.get("#welcomeV2PasswordInput").type("valtest" + now + "@liquido.votepwd")

		//THEN the submit button stays disabled - the frontend never even tries the mutation
		cy.get("#welcomeV2RegisterSubmitButton").should("be.disabled")
	})

	it("Backend rejects registration with a too-short username via a direct API call", function() {
		const apiUrl = Cypress.expose("LIQUIDO_API")
		// mock mode: no real backend to attack, the mocked client answers in-process
		if (!apiUrl) this.skip()

		//GIVEN an attacker who skips the frontend entirely and calls the GraphQL API directly
		const graphQL = `mutation createNewTeam($teamName: String!, $admin: UserEntityInput!, $password: String!) { createNewTeam(teamName: $teamName, admin: $admin, password: $password) { team { id } } }`

		//WHEN registering with a 2-character username (below usernameMinLength)
		cy.request({
			method: "POST",
			url: apiUrl + "graphql",
			body: {
				query: graphQL,
				variables: {
					teamName: "AttackerTeam" + now,
					admin: { name: "Al", email: "attacker" + now + "@liquido.vote" },
					password: "attacker" + now + "@liquido.votepwd",
				},
			},
			failOnStatusCode: false,
		}).then(res => {
			//THEN the mutation is rejected - the too-short name is never persisted
			expect(res.body.errors, "expected a GraphQL error for a 2-character username").to.exist
			expect(res.body.data && res.body.data.createNewTeam, "createNewTeam must not return a team").to.not.exist
		})
	})

	it("Backend rejects a poll created with a too-short title, even from an already-registered attacker", function() {
		const apiUrl = Cypress.expose("LIQUIDO_API")
		if (!apiUrl) this.skip()

		//GIVEN an attacker who DID register validly, so they hold a real, valid JWT
		const registerGraphQL = `mutation createNewTeam($teamName: String!, $admin: UserEntityInput!, $password: String!) { createNewTeam(teamName: $teamName, admin: $admin, password: $password) { jwt } }`

		cy.request({
			method: "POST",
			url: apiUrl + "graphql",
			body: {
				query: registerGraphQL,
				variables: {
					teamName: "AttackerTeam2" + now,
					admin: { name: "Attacker" + now, email: "attacker2" + now + "@liquido.vote" },
					password: "attacker2" + now + "@liquido.votepwd",
				},
			},
		}).then(res => {
			const jwt = res.body.data.createNewTeam.jwt
			expect(jwt, "registration must have produced a JWT to attack with").to.be.a("string")

			//WHEN that authenticated attacker calls createPoll directly with a 2-character title
			// (below pollTitleMinLength), skipping the frontend's own poll-edit.vue validation
			const pollGraphQL = `mutation createPoll($title: String!) { createPoll(title: $title) { id } }`
			cy.request({
				method: "POST",
				url: apiUrl + "graphql",
				headers: { Authorization: "Bearer " + jwt },
				body: { query: pollGraphQL, variables: { title: "Ab" } },
				failOnStatusCode: false,
			}).then(pollRes => {
				//THEN the mutation is rejected - the too-short title is never persisted
				expect(pollRes.body.errors, "expected a GraphQL error for a 2-character poll title").to.exist
				expect(pollRes.body.data && pollRes.body.data.createPoll, "createPoll must not return a poll").to.not.exist
			})
		})
	})
})
