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
	
	beforeEach(() => {
		console.log("===================================================")
		console.log("    TEST CASE >>>", Cypress.mocha.getRunner().suite.ctx.currentTest.title, "<<<")
		console.log("===================================================")
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
		cy.get("#mobilephoneInput").type(Cypress.env("admin").mobilephone)
		// AND click request SMS token button
		cy.get("#requestTokenButton").click()

		//THEN SMS token is sent
		cy.get("#tokenSuccessMessage").should("exist")
		cy.get("#tokenErrorMessage").should("not.exist")

		//WHEN enter (mock) SMS authToken
		cy.get("#authTokenInput").type(Cypress.env("devLoginToken")).type("{enter}")

		//THEN user is logged in and teamHome is shown
		cy.get("#team-home")
	})

	it('(Simulate) Login via Email', function() {
		//GIVEN on login page
		cy.visit("/login")
		cy.get("#login-page")

		//WHEN test user enters his email
		cy.get("#loginEmailInput").type(Cypress.env("admin").email).type("{enter}")
		// AND click request Email button
		cy.get("#requestEmailButton").click()

		//THEN email is sent.
		cy.get("#emailSuccessMessage").should("exist")
		cy.get("#emailErrorMessage").should("not.exist")

		//Now user clicks on the link in the email
		//TODO: get login link from eg. mailtrap.io

		// GIVEN the received email message
		cy.request({
			url: Cypress.env("mailtrap").messagesUrl,
			headers: {
				"Api-Token": Cypress.env("mailtrap").apiToken
			}
		}).then(res => {
			let messages = res.body
			messages.sort((a,b) => a.created_at < b.created_at)    // sort newest message first
			//  AND the HTML body of the message
			cy.request({
				url: Cypress.env("mailtrap").messagesUrl+"/"+messages[0].id+"/body.html",
				headers: {
					"Api-Token": Cypress.env("mailtrap").apiToken
				}
			}).then(res2 => {
				// THEN the mail body contains a loginLink
				let messageHtml = res2.body
				console.log("msaasdfb body", messageHtml)
				const regex = /<a.*?id='loginLink'.*href='(.*?)'>/;   // LIQUIDO HTML messages use single quotes!
				let match = messageHtml.match(regex)
				console.log(match)
				assert.isArray(match, "Cannot find loginLink in email body.")
				
				let loginLink = match[1] // first capturing group
				assert.isString(loginLink)
				console.log("LoginLink", loginLink)

				cy.visit(loginLink)
				cy.get("#team-home")
			})
		})

	})

})