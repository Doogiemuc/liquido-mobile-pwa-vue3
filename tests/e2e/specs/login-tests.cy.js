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
	
	/**
	 * Check if backend is available at all.
	 *
	 * Skipped in the "mock" mode, where there deliberately is no backend to reach - the frontend
	 * answers its own queries there. Cypress.expose("LIQUIDO_API") is null in exactly that case,
	 * and cy.request(null) would fail the whole suite before the first test body ran.
	 */
	before(() => {
		cy.visit("/login")
		cy.get("#login-page")
		cy.get("#rootPopupModal").should("not.be.visible")

		const apiUrl = Cypress.expose("LIQUIDO_API")
		if (apiUrl) {
			cy.request(apiUrl).then(res => {
				expect(res.status, "Check if backend is available.").to.equal(200)
			})
		} else {
			cy.log(`LIQUIDO_E2E_MODE=${Cypress.expose("mode")}: no backend to ping`)
		}
	})

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

	it('The welcome page opens on its landing hero, with the first chat bubble below the fold', function() {
		//WHEN anonymously accessing index
		cy.visit("/")

		// NB: deliberately NO .scrollIntoView() anywhere in this test. It is the one test about what
		// the visitor sees BEFORE touching the screen, and every assertion below reads a bounding rect
		// against the unscrolled viewport. Scrolling here would not strengthen it, it would erase it.

		//THEN the landing hero is there, with the LIQUIDO mark and the claim ...
		cy.get("#welcomeHero").should("be.visible")
		cy.get("#liquidoClaim").should("be.visible")
		// (not be.visible for the mark: it is pointer-events:none, so Cypress' hit test looks straight
		// through it and reports the empty hero slot underneath as "covering" it.)
		cy.get("#liquidMark").should($mark => {
			expect($mark[0].getBoundingClientRect().width, "the LIQUIDO mark has a size").to.be.greaterThan(0)
			expect(getComputedStyle($mark[0]).opacity).to.not.equal("0")
		})

		// ... and the first chat bubble starts BELOW the bottom edge of the phone. That cut-off
		// bubble is the page's only "scroll down" hint, so it is worth a test.
		cy.get("#welcome-chat").should($bubble => {
			expect($bubble[0].getBoundingClientRect().bottom).to.be.greaterThan(Cypress.config("viewportHeight"))
		})

		// AND while the visitor is still up here, the header has not appeared yet
		cy.get("#liquidoHeader").should($header => {
			expect(getComputedStyle($header[0]).backgroundColor).to.match(/rgba\(.*,\s*0\)$/)
		})

		// AND the one way back in for a returning user without a JWT is readable right away, in the
		// top right - it must NOT wait for the header to fade in, or it is invisible on arrival.
		cy.get("#welcomeLoginButton").should("be.visible").and($login => {
			const login = $login[0].getBoundingClientRect()
			const header = Cypress.$("#liquidoHeader")[0].getBoundingClientRect()
			expect(login.top, "sits in the header band").to.be.at.least(header.top - 1)
			expect(login.bottom, "sits in the header band").to.be.at.most(header.bottom + 1)
			expect(login.left, "sits in the right-hand half").to.be.greaterThan(Cypress.config("viewportWidth") / 2)
			// The whole block is the tap target, not just the glyphs of the word.
			expect(login.height, "comfortable tap target").to.be.at.least(44)
			expect(login.width, "comfortable tap target").to.be.at.least(44)
		})
	})

	it('The landing Login leads to the login page', function() {
		//GIVEN an anonymous visitor on the welcome page
		cy.visit("/")

		//WHEN they take the way back in
		cy.get("#welcomeLoginButton").click()

		//THEN they land on the login page
		cy.get("#login-page")
	})

	it('The chat offers the Login a second time, under the nickname field', function() {
		//GIVEN an anonymous visitor who scrolled past the top-right Login and reached the nickname step
		cy.visit("/")
		// Wait for the card to actually OPEN, not just to exist: until FLOW.NicknameInput it carries
		// .collapse-max-height (display:none), and .scrollIntoView() on a display:none element is a
		// no-op that the retried should() below would never redo.
		cy.get("#usernameCard", { timeout: 8000 }).should("not.have.css", "display", "none")

		//THEN the chat offers the way back in a second time, right there in the card
		cy.get("#welcomeLoginInChat")
			.scrollIntoView().should("be.visible")
			.and($link => {
				const card = Cypress.$("#usernameCard")[0].getBoundingClientRect()
				const link = $link[0].getBoundingClientRect()
				expect(link.top, "sits inside the nickname card").to.be.at.least(card.top)
				expect(link.bottom, "sits inside the nickname card").to.be.at.most(card.bottom)
			})

		//AND it reaches the login page too
		cy.get("#welcomeLoginInChat").click()
		cy.get("#login-page")
	})

	it('Both Login offers step aside once the visitor has committed to registering', function() {
		//GIVEN an anonymous visitor on the welcome page
		cy.visit("/")

		//WHEN they give a nickname, and are therefore registering rather than returning
		cy.get("#userNameInput", { timeout: 8000 }).type("Returning Visitor").type("{enter}")

		//THEN neither offer is in the way any more
		cy.get("#welcomeLoginButton").should("not.exist")
		cy.get("#welcomeLoginInChat").should("not.exist")
	})

	it('Scrolling down flows the LIQUIDO mark up into the header', function() {
		//GIVEN the welcome page, where the mark starts out on the hero and not in the header
		cy.visit("/")
		cy.get("#liquidMark").should($mark => {
			expect($mark[0].getBoundingClientRect().top, "mark starts below the header").to.be.greaterThan(60)
		})

		//WHEN the visitor scrolls past the end of the mark's travel
		cy.get("#app").scrollTo(0, 400)

		//THEN the mark has arrived inside the header ...
		cy.get("#liquidMark").should($mark => {
			const mark = $mark[0].getBoundingClientRect()
			const header = Cypress.$("#liquidoHeader")[0].getBoundingClientRect()
			expect(mark.top, "mark landed below the top of the header").to.be.at.least(header.top - 1)
			expect(mark.bottom, "mark landed above the bottom of the header").to.be.at.most(header.bottom + 1)
		})

		// ... and the header itself is no longer transparent
		cy.get("#liquidoHeader").should($header => {
			expect(getComputedStyle($header[0]).backgroundColor).to.not.match(/rgba\(.*,\s*0\)$/)
		})
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
		cy.get("#notFoundCard")
	})

	// The SMS use case can completely and transparently be tested.
	// Mocking is purely done in the backend.
	// Still skipped, and now doubly so: a mobilephone is optional in LIQUIDO and is not collected in
	// the UI, so the /login-via-sms route was removed and the backend's requestSmsToken /
	// loginWithSmsToken are commented out. Restore all three before un-skipping this.
	it.skip('(Simulate) Login via SMS', function() {
		//GIVEN on login page
		cy.visit("/login")
		cy.get("#login-page")

		//WHEN enter mobile phone of test admin user
		cy.get("#mobilephoneInput").type(Cypress.expose("admin").mobilephone)
		// AND click request SMS token button
		cy.get("#requestTokenButton").click()

		//THEN SMS token is sent
		cy.get("#tokenSuccessMessage").should("exist")
		cy.get("#tokenErrorMessage").should("not.exist")

		//WHEN enter (mock) SMS authToken
		cy.get("#authTokenInput").type(Cypress.expose("devLoginToken")).type("{enter}")

		//THEN user is logged in and teamHome is shown
		cy.get("#team-home")
	})

	it('Login via email & password', function() {
		cy.visit("/login")
		cy.get("#login-page")

		//WHEN test user enters his email & password
		cy.get("#loginEmailInput").type(Cypress.expose("admin").email)
		cy.get("#continueButton").click()
		
		cy.env(["passwordSuffix"])
			.then(({ passwordSuffix }) => {
				return Cypress.expose("admin").email + passwordSuffix
			})
			.then(password => {
				cy.get("#loginPasswordInput").type(password)
			})
		
		// AND click login button
		cy.get("#loginWithEmailPasswordButton").click()

		//THEN user is logged in and teamHome is shown
		cy.get("#team-home")
		// AND the user is shown in the team
		cy.get("#memberCircles").contains(Cypress.expose("admin").name)
	})

	it('Unknown email shows not found message', function() {
		cy.intercept("GET", "**/webauthn/check-login-email*", {
			statusCode: 200,
			body: { status: "UNKNOWN" }
		})

		cy.visit("/login")
		cy.get("#login-page")

		cy.get("#loginEmailInput").type("unknown-user@example.com")
		cy.get("#continueButton").click()

		// No .scrollIntoView(): an error the user has to scroll to find is an error they miss. This
		// asserts the stronger property, that it lands where they are already looking.
		cy.get("#loginErrorMessage").should("be.visible")
	})

		
	
	it('Forgot password flow', function() {
		// Needs the backend's own testPasswordResetToken and a real reset round-trip, so there is
		// nothing for it to do in the "mock" mode.
		if (!Cypress.expose("LIQUIDO_API")) this.skip()
		cy.visit("/login")
		cy.get("#login-page")

		// ======== Step 1: Request password reset ========

		// Click "Forgot password" link
		cy.get("#forgotPasswordLink").click()

		// Should be on forgot password page
		cy.get("#forgot-password-page")

		// Enter email and request password reset
		cy.get("#emailInput").type(Cypress.expose("admin").email)
		cy.get("#requestPasswordResetButton").click()

		// Should show success message and no error message
		cy.get("#requestPasswordResetSuccessMessage").should("be.visible")   // no scroll: see the note on #loginErrorMessage
		cy.get("#requestPasswordResetErrorMessage").should("not.exist")

		// ========= Step 2: Reset password with token ========
		//
		// We cannot read the REAL token here: GISMO sends the reset mail through a real SMTP relay
		// (smtp.ionos.de), not a catcher this suite can query, and the backend's matching test/dev
		// bypass ("testPasswordResetToken") is deliberately disabled there - see
		// UserService#resetPassword's "[TEST/DEV]" shortcut and its dummy-value config on GISMO (same
		// situation as the verify-email link, see happy-case.cy.js). So this step cannot complete a
		// real reset. It uses that same always-wrong token on purpose and asserts the honest outcome:
		// a real round trip to the backend that correctly rejects it.
		//
		// This used to assert `#resetPasswordSuccessMessage should not.be.empty` and then log in with
		// the "reset" password - which PASSED even though the reset always failed. chai-jquery's
		// `.empty` is backed by jQuery's `:empty` pseudo-selector, and `.is()` on a zero-length
		// collection always returns false, so `not.be.empty` on an element that does not exist at all
		// is vacuously true. This test had never actually proven a password reset works on GISMO.

		cy.env(["testPasswordResetToken"]).then(({testPasswordResetToken}) => {
			cy.visit(`/resetPassword?email=${encodeURIComponent(Cypress.expose("admin").email)}&resetPasswordToken=${testPasswordResetToken}`)
		})
		cy.get("#forgot-password-page")

		cy.env(["passwordSuffix"]).then(({passwordSuffix}) => {
			const newPassword = Cypress.expose("admin").email + passwordSuffix
			cy.get("#newPasswordInput1").type(newPassword) // first input
			cy.get("#newPasswordInput2").type(newPassword) // second input

			// Click reset password button
			cy.get("#resetPasswordButton").click()

			// THEN the backend genuinely rejects the (wrong, on purpose) token - a real error from a
			// real call, not silence. No scroll: see the note on #loginErrorMessage above.
			cy.get("#resetPasswordErrorMessage").should("be.visible")
			cy.get("#resetPasswordSuccessMessage").should("not.exist")
		})

		// Login with the existing (unchanged) password is already covered by
		// "Login via email & password" above - nothing was actually reset here to log in with.
	})


	it.skip('(Simulate) Login via E-Mail Magic Link', function() {
		//GIVEN on login page
		cy.visit("/login")
		cy.get("#login-page")

		//WHEN test user enters his email
		cy.get("#loginEmailInput").type(Cypress.expose("admin").email).type("{enter}")
		// AND click request Email button
		cy.get("#requestEmailButton").click()

		//THEN email is sent.
		cy.get("#emailSuccessMessage").should("exist")
		cy.get("#emailErrorMessage").should("not.exist")

		// GIVEN the received email message
		cy.request({
			url: Cypress.expose("mailtrap").messagesUrl,
			headers: {
				"Api-Token": Cypress.expose("mailtrap").apiToken
			}
		}).then(res => {
			let messages = res.body
			messages.sort((a,b) => a.created_at < b.created_at)    // sort newest message first
			//  AND the HTML body of the message
			cy.request({
				url: Cypress.expose("mailtrap").messagesUrl+"/"+messages[0].id+"/body.html",
				headers: {
					"Api-Token": Cypress.expose("mailtrap").apiToken
				}
			}).then(res2 => {
				// THEN the email body contains a loginLink
				let messageHtml = res2.body
				console.log("msaasdfb body", messageHtml)
				const regex = /<a.*?id='loginLink'.*href='(.*?)'>/;   // LIQUIDO HTML messages use single quotes!
				let match = messageHtml.match(regex)
				console.log(match)
				assert.isArray(match, "Cannot find loginLink in email body.")
				
				let loginLink = match[1] // first capturing group
				assert.isString(loginLink)
				console.log("LoginLink", loginLink)

				// WHEN user clics on the login link
				cy.visit(loginLink)
				
				// THEN he is logged in
				cy.get("#team-home")
			})
		})

	})

	it('Shows a warning when the LIQUIDO backend cannot be reached', function() {
		// Only meaningful where the frontend really issues GraphQL over HTTP. In the "mock" mode the
		// mocked client answers in-process and no POST /graphql is ever sent, so there is no request
		// to fail and cy.wait() below would simply time out.
		if (!Cypress.expose("LIQUIDO_API")) this.skip()

		// GIVEN the backend is completely unreachable - every GraphQL call fails at the network level,
		// not with an HTTP error status. root-app.vue's mounted() pings the backend on every page load
		// (api.pingApi()) specifically to catch this case.
		cy.intercept("POST", "**/graphql", { forceNetworkError: true }).as("graphqlDown")

		// WHEN the app loads (the frontend's own static assets are still reachable - only the backend
		// API call fails, which is the realistic case: the site is up, the backend is not)
		cy.visit("/")
		cy.wait("@graphqlDown")

		// THEN a warning is shown, instead of the app silently failing or hanging
		cy.get("#rootPopupModal").should("be.visible")
		cy.get("#rootPopupModalPrimaryButton").should("be.visible")
	})

})
