import { defineConfig } from "cypress";

const now = 4711; // "id" of test data

export default defineConfig({
  e2e: {
    baseUrl: 'https://localhost:3001/',
    specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/index.js',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  env: {
    LIQUIDO_API: 'http://localhost:8080/liquido-api',
    devLoginToken: '998877',
		testPasswordResetToken: 'asdsadfASDF2334',
		// this is our default test user. Can be overwritten per env
		admin: {
			teamName: "testTeam"+now,
			name: "TestAdmin "+now,
			email: "testadmin"+now+"@liquido.vote",
			// passwords for test users are created by TestUserCreator.java
			mobilephone: "+49555"+now,
			website: "www.liquido.vote"
		},
		passwordSuffix: "_PWD",  // passwords of test users = email + passwordSuffix
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
  
})
