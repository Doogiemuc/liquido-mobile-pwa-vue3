const { defineConfig } = require('cypress')

module.exports = defineConfig({
  env: {
    LIQUIDO_API: 'http://localhost:8080/liquido-api',
    devLoginToken: '998877',
		// These settings MUST match the values from application-prod.yml on the PROD machine!
		admin: {
			teamName: "ProdAdminTeam",
			name: "Prod Admin",
			email: "adminProdTeam@liquido.vote",
			mobilephone: "+4915162963154",
			website: "www.liquido.vote"
		},
  },
  viewportWidth: 375,
  viewportHeight: 667,
  fixturesFolder: 'tests/e2e/fixtures',
  screenshotsFolder: 'tests/e2e/screenshots',
	video: true,                // in PROD do encode videos of what was tested
  videosFolder: 'tests/e2e/videos',
  e2e: {
    baseUrl: 'http://localhost:3001/',
    specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/index.js',
  },
})
