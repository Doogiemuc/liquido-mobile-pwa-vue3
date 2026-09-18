/**
 * Negative test case: a device with no WebAuthn support at all (no platform authenticator, or a
 * browser too old to implement the API) must still be able to register a team and log in - LIQUIDO
 * falls back to password-only auth, per welcome-chat.vue's prepareSetupPasskey().
 *
 * webauthnService.isWebAuthnSupported() delegates to @simplewebauthn/browser's real
 * browserSupportsWebAuthn(), which just checks for window.PublicKeyCredential - it is not app code
 * that can be stubbed from the outside. So this test removes that global before the page loads,
 * exactly what a genuinely unsupported browser looks like, rather than mocking our own function.
 * This is a different case from happy-case.cy.js's member who has WebAuthn available and simply
 * declines the ceremony - here the option is never offered in the first place.
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
		cy.get("#welcome-chat")
		cy.get('#userNameInput', { timeout: 8000 }).type(adminName).type("{enter}")

		// WHEN registering a new team, same as any other admin
		cy.get('#createNewTeamButton').scrollIntoView().should('be.visible').click()
		cy.get('#teamNameInput').type(teamName)
		cy.get('#adminEmailInput').type(adminEmail)
		cy.get('#adminPasswordInput').type(adminPassword)
		cy.get('#createNewTeamOkButton').click()

		// THEN registration still succeeds ...
		cy.get('#rootPopupModal').should('not.be.visible')
		cy.get('#newTeamCreatedBubble').should(() => {
			const jwt = localStorage.getItem("LIQUIDO_JWT")
			expect(jwt, "Expected to find a JWT in localStorage!").to.have.length.of.at.least(10)
		})

		// ... but the passkey step is skipped entirely - it is never shown, not shown-then-declined
		cy.get('#setupPasskeyCard').should('not.be.visible')
		cy.get('#setupPasskeyInfoCard').should('not.be.visible')

		// AND the team is reached with an invite code, exactly as with a passkey-capable device
		cy.get('#teamQrCode').scrollIntoView().should('be.visible')
		cy.get('#inviteCodeButton').should('have.attr', 'data-invitecode').and('match', /^[A-Za-z0-9]{8}$/)

		// AND back on the team page, the passkey reminder shows - this account genuinely has no
		// passkey registered, the same DOM hook the happy case's declining member checks
		cy.visit("/")
		cy.get("#team-home")
		cy.get("#passkeyButton").should("exist")
	})

})
