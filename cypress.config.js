const { defineConfig } = require('cypress')

module.exports = defineConfig({
	//TODO: set different configuraiton parameters according to NODE_ENV: LOCAL,TEST,INT,PROD
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
  },
  viewportWidth: 375,
  viewportHeight: 667,
  fixturesFolder: 'tests/e2e/fixtures',
  screenshotsFolder: 'tests/e2e/screenshots',
	video: false,
  videosFolder: 'tests/e2e/videos',
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
		/*
    setupNodeEvents(on, config) {
      return require('./tests/e2e/plugins/index.js')(on, config)
    },
		*/
    baseUrl: 'http://localhost:3001/',
    specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/index.js',
  },
})
