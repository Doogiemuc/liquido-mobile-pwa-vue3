
// Cypress default configuration
// Can be extended per environments

export default {
	e2e: {
    baseUrl: 'https://localhost:3001/',
		specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
  },
  
	// confidentail credentials
	env: {
		passwordSuffix: "_PWD",  // passwords of test users = email + passwordSuffix
		devLoginToken: "DEV_LOGIN_TOKEN_INT",
		testPasswordResetToken: "DEV_PASSWORD_RESET_TOKEN",
		mailtrap: {
			messagesUrl: "https://mailtrap.io/api/accounts/1416880/inboxes/1983138/messages",
			apiToken: "13d57536b61611395106a3992fc32bec"
		}
	},

	// public config vars
	expose: {
    LIQUIDO_API: 'https://localhost:8443/',
		// This user must exist in the DB.
		teamName: "RobTeam",
		admin: {
			name: "TestAdmin 4711",
			email: "testadmin4711@liquido.vote",
			mobilephone: "01515554711",
		},
		member: {
			name: "Member 1781788893728",
			email: "membr47110@liquido.vote",
			mobilephone: "01515551781788893728"
		},		
  },

  viewportWidth: 375,
  viewportHeight: 667,
  fixturesFolder: 'tests/e2e/fixtures',
  screenshotsFolder: 'tests/e2e/screenshots',
	videosFolder: 'tests/e2e/videos',
	video: false,
  
}