/**
 * End-2-end test cases for user authentication flow:
 * login via SMS, login via email, logout
 * anonymous access to allowed pages
 * 
 * Registration is already covered in happy-case.js
 */


let now = Date.now() % 10000
console.log("Running Cypress login-test.js (test_uuid="+now+")", "NODE_ENV="+process.env.NODE_ENV)

context('Login Test', () => {
	/** Test fixtures, fixed test data */
	before(() => {
		
	})

	beforeEach(() => {
		console.log("===================================================")
		console.log("    TEST CASE >>>", Cypress.mocha.getRunner().suite.ctx.currentTest.title, "<<<")
		console.log("===================================================")
		cy.fixture("liquido-test-fixtures.json").as("fix").then(testFixtures => {
			console.log("Loaded test fixtures", testFixtures)
		})
	})

	it('Anonymous access should lead to welcome-chat', function() {
		//WHEN anonymously accessing index
		cy.visit("/")
		//THEN should forward to welcome chat
		cy.get("#welcome-chat")
	})

	it('Anonymous access to restricted /polls page should be forwarded to login', function() {
		//WHEN anonymously trying to access /polls
		cy.visit("/polls")
		//THEN should forward to /login
		cy.get("#login-page")
	})

	it('Anonymous access to restricted /teams page should be forwarded to login', function() {
		//WHEN anonymously trying to access /polls
		cy.visit("/team")
		//THEN should forward to /login
		cy.get("#login-page")
	})

	it('Anonymous access to non existing page should show 404', function() {
		//WHEN anonymously trying to access non existing page
		cy.visit("/yxcvewtewasdvverg")
		//THEN not found page (404) is shown
		cy.get("#NotFoundPage")
	})

	// The SMS use case can completely and transparently be tested. 
	// Mocking is purely done in the backend.
	it('(Simulate) Login via SMS', function() {
		//GIVEN on login page
		cy.visit("/login")
		cy.get("#login-page")

		//WHEN enter mobile phone of test admin user
		cy.get("#mobilephoneInput").type(this.fix.admin.mobilephone)
		// AND click request SMS token button
		cy.get("#requestTokenButton").click()

		//THEN SMS token is sent
		cy.get("#tokenSuccessMessage").should("exist")
		cy.get("#tokenErrorMessage").should("not.exist")

		//WHEN enter (mock) SMS authToken
		cy.get("#authTokenInput").type(this.fix.devLogin.token).type("{enter}")
		//THEN user is logged in and teamHome is shown
		cy.get("#team-home")
	})

	it.only('(Simulate) Login via Email', function() {
		//GIVEN on login page
		cy.visit("/login")
		cy.get("#login-page")

		//WHEN enter mobile phone of test admin user
		cy.get("#loginEmailInput").type(this.fix.admin.email).type("{enter}")
		// AND click request SMS token button
		cy.get("#requestEmailButton").click()



		//THEN user is logged in and teamHome is shown
		//cy.get("#team-home")

	})

})