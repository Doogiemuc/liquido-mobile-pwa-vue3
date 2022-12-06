const { defineConfig } = require('cypress')

module.exports = defineConfig({
  env: {
    LIQUIDO_API: 'http://localhost:8080/liquido-api',
    devLoginToken: '998877',
		// this is our default test user. Can be overwritten per env
		admin: {
			teamName: "LocalTeam",
			name: "Local Admin",
			email: "adminLocalTeam@liquido.vote",
			mobilephone: "+4955511111",
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
    baseUrl: 'http://localhost:3001/',
    specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/index.js',
  },
})
