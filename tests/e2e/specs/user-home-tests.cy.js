context('User Home - Edit User Data', () => {
	it('user can edit and save user data', function() {
		cy.visit('/user-home')

		cy.contains('button', /edit/i).click()

		const newName = 'Test User'
		const newEmail = 'test@example.com'
		const newWebsite = 'https://example.com'
		const newMobile = '+49123456789'

		cy.get('#userNameInput').clear().type(newName)
		cy.get('#userEmailInput').clear().type(newEmail)
		cy.get('#userWebsiteInput').clear().type(newWebsite)
		cy.get('#userMobilephoneInput').clear().type(newMobile)

		cy.contains('button', /save/i).click()

		cy.get('#userNameInput').should('be.disabled')
		cy.get('#userEmailInput').should('be.disabled')

		cy.get('#userNameInput').should('have.value', newName)
		cy.get('#userEmailInput').should('have.value', newEmail)
		cy.get('#userWebsiteInput').should('have.value', newWebsite)
		cy.get('#userMobilephoneInput').should('have.value', newMobile)
	})
})
