/**
 * Common LIQUIDO PWA configuration that is used in all environments.
 * This file is merged into the environment specific configs.
 * 
 * This is different from plain vue environment variables that can be set via .env.production files.
 * https://cli.vuejs.org/guide/mode-and-env.html#environment-variables
 * 
 * LIQUIDO Config is "statically" imported into the scripts.
 */

export default {
	configSource: "common",
	BASE_URL: "/",                   				// Used for loading JS libs in browser. MUST end with '/'
	LIQUIDO_API_URL: undefined,  						// MUST set this in your env config
	showDebugLog: false,
	mockBackend: false,
	
	// ---- FALLBACK for global settings that are normally fetched from backend ----
	//
	// These are fetched from the backend at startup (query liquidoConfig -> root-app.loadLiquidoConfig)
	// and overwritten with its answer. They are kept here only so the app still works when the backend
	// is unreachable. Do NOT tune these to change behaviour - change them in the backend's
	// LiquidoConfig, or the two will disagree again and the server will reject what the client accepted.
	
	usernameMinLength: 3,										// used in login.vue and register.vue 
	inviteCodeLength: 8,			       				// used for validating inviteCodes in welcome-chat.vue
	minPasswordLength: 10, 									// used in forgot-password.vue
	pollTitleMinLength: 5,									// poll titles must be unique within one team. used in poll-add.vue
	pollDefaultRuntimeDays: 7,
	proposalTitleMinLength: 3,							// Used in proposal-add.vue
	proposalDescriptionMinLength: 20,				// backend owns this; LiquidoConfigMatchesEntityTest locks it to ProposalEntity's @Size(min)
	inviteLinkPrefix: "http://app.liquido.vote/welcome?inviteCode=",


	// ---- frontend only settings ------
	avatarPath: "./img/avatars",
	
	
	// Dummy data for mocked login. Must be same as @/mockdata/teamUserJwt.json
	devLogin: {
		teamName: "DevLogin Team",
		token: "XXXXX_DevLoginToken",
		mockSmsToken: "123456",
		member: {
			name: "DevLogin Member",
			email: "membr47113@liquido.vote",
			mobilephone: "01515551754552747221",

		},
		admin: {
			name: "TestAdmin 4711",
			email: "testadmin4711@liquido.vote",
			mobilephone: "01515554711"
		}
	}

}