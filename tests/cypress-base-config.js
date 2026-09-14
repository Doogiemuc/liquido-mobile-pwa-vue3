
// Cypress default configuration
// Can be extended per environments

export default {
	e2e: {
    baseUrl: 'https://localhost:3001/',
		specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
  },
  
	// confidentail credentials
	// These MUST match the local backend's dev profile (liquido-backend-quarkus/config/application-dev.properties):
	//   liquido.dev-login-token           -> devLoginToken
	//   liquido.test-password-reset-token -> testPasswordResetToken
	// This file is the DEFAULT (local) config. The INT values live in cypress.config.INT.js.
	env: {
		passwordSuffix: "_PWD",  // passwords of test users = email + passwordSuffix
		devLoginToken: "devLoginTokenDev",
		testPasswordResetToken: "PASSWORD_RESET_TOKEN_DEV",
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
		}
  },

	/**
	 * Scroll an element to the MIDDLE of the viewport before acting on it, not to the top.
	 * #liquidoHeader is position:fixed, so Cypress' default ('top') parks the element underneath it
	 * and then refuses to click, complaining that it is covered. That only stayed invisible for as
	 * long as no page was tall enough to scroll that far - welcome-chat's landing hero is.
	 */
	scrollBehavior: 'center',

  viewportWidth: 375,
  viewportHeight: 667,
  fixturesFolder: 'tests/e2e/fixtures',
  screenshotsFolder: 'tests/e2e/screenshots',
	videosFolder: 'tests/e2e/videos',
	video: false,
  
}