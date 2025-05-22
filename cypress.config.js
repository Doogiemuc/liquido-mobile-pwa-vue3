//const { defineConfig } = require('cypress')

import { defineConfig } from 'cypress'

let now = 4711  // "id" of test data

//module.exports = defineConfig({
export default defineConfig({
	e2e: {
		baseUrl: 'http://localhost:3001/',
		//specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',  // which tests to run
	},
  env: {
    LIQUIDO_API: 'http://localhost:8080/liquido-api',
    devLoginToken: '998877',
		// this is our default test user. Can be overwritten per env
		admin: {
			teamName: "testTeam"+now,
			name: "TestAdmin "+now,
			email: "testadmin"+now+"@liquido.vote",
			password: "testadmin"+now+"@liquido.votepwd",
			mobilephone: "+49555"+now,
			website: "www.liquido.vote"
		},
		mailtrap: {
			messagesUrl: "https://mailtrap.io/api/accounts/1416880/inboxes/1983138/messages",
			apiToken: "13d57536b61611395106a3992fc32bec"
		}
  },
  viewportWidth: 375,
  viewportHeight: 667,
  fixturesFolder: 'tests/e2e/fixtures',
  screenshotsFolder: 'tests/e2e/screenshots',
	video: false,
  videosFolder: 'tests/e2e/videos',
  e2e: {
    baseUrl: 'http://localhost:4173/',
    specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/index.js',
  },
})
