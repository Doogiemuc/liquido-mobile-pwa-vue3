// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })


/**
 * This can be used to login a given user.
 * If you have a JWT, then you can directly use it:
 * 
 *     localStorage.setItem("LIQUIDO_JWT", jwt)
 *     cy.visit("/")
 */
Cypress.Commands.add("devLogin", (email, teamName, token) => {
	cy.visit("/devLogin?email="+email+"&teamName="+teamName+"&token="+token).then((res => {
		console.log("Cypress command devLogin", res)
	}))
})