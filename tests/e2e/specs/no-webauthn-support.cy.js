/**
 * Negative test case: a device with no WebAuthn support at all (no platform authenticator, or a
 * browser too old to implement the API) must still be able to register a team and log in - LIQUIDO
 * falls back to password-only auth, per welcome-chat-v2.vue's passkeySupported check.
 *
 * webauthnService.isWebAuthnSupported() delegates to @simplewebauthn/browser's real
 * browserSupportsWebAuthn(), which just checks for window.PublicKeyCredential - it is not app code
 * that can be stubbed from the outside. So this test removes that global before the page loads,
 * exactly what a genuinely unsupported browser looks like, rather than mocking our own function.
 * This is a different case from happy-case.cy.js's member who has WebAuthn available and simply
 * declines the ceremony: here the passkey step still appears (with an explanatory message and
 * only a Skip button), but the registration form and its submit button are never offered at all.
 */

const now = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
console.log("Running Cypress no-webauthn-support test (run id=" + now + ")")

context('Registration without WebAuthn support', () => {

	it('Falls back to password-only registration when the device has no WebAuthn support', function() {
		const adminName = 'Cypress NoWebAuthn-' + now
		const teamName = 'Cypress NoWebAuthn Team ' + now
		const adminEmail = 'cypressNoWebAuthn-' + now + '@liquido.vote'
		const adminPassword = adminEmail + 'pwd'

		localStorage.removeItem("LIQUIDO_JWT")

		// GIVEN a browser without WebAuthn support at all
		cy.visit("/", {
			onBeforeLoad(win) {
				delete win.PublicKeyCredential
			},
		})
		cy.get('#welcomeV2CreateTeamButton').scrollIntoView().should('be.visible').click()

		// WHEN registering a new team, same as any other admin
		cy.get('#welcomeV2NicknameInput').type(adminName)
		cy.get('#welcomeV2TeamNameInput').type(teamName)
		cy.get('#welcomeV2EmailInput').type(adminEmail)
		cy.get('#welcomeV2PasswordInput').type(adminPassword)
		cy.get('#welcomeV2RegisterSubmitButton').should('not.be.disabled').click()

		// THEN registration still succeeds ...
		cy.get('#welcomeV2RegisterError').should('not.exist')
		cy.get('#welcomeV2PasskeyCard').should(() => {
			const jwt = localStorage.getItem("LIQUIDO_JWT")
			expect(jwt, "Expected to find a JWT in localStorage!").to.have.length.of.at.least(10)
		})

		// ... but the ceremony itself is never offered - the passkey step explains why and only
		// offers Skip, rather than showing the label input and setup button and then failing them
		cy.get('[data-qa="passkeyNotSupportedMessage"]').scrollIntoView().should('be.visible')
		cy.get('#welcomeV2PasskeyLabelInput').should('not.exist')
		cy.get('#welcomeV2SetupPasskeyButton').should('not.exist')

		// WHEN he skips it - the only available action - he reaches the first-proposal choice, same
		// as an admin who declined a genuinely offered passkey would
		cy.get('#welcomeV2SkipPasskeyButton').click()
		cy.get('#welcomeV2FirstProposalCard').scrollIntoView().should('be.visible')
		cy.get('#welcomeV2GotoTeamButton').click()
		cy.get("#team-home")

		// AND the team is reached with an invite code, exactly as with a passkey-capable device
		cy.get('#inviteMemberButton').click()
		cy.get('[data-invitecode]').should('have.attr', 'data-invitecode').and('match', /^[A-Za-z0-9]{8}$/)

		// AND back on the team page, the passkey reminder shows - this account genuinely has no
		// passkey registered, the same DOM hook the happy case's declining member checks
		cy.visit("/")
		cy.get("#team-home")
		cy.get("#passkeyButton").should("exist")
	})

})
