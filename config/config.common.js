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
	BASE_URL: "/",                   				   				// Used for loading JS libs in browser. MUST end with '/'
	LIQUIDO_API_URL: "https://api.liquido.vote",  		// URI to Backend API. 
	showDebugLog: false,
	mockBackend: false,
	
	//TODO: implement these settings per Team! in the backend!
	usernameMinLength: 3,
	inviteCodeLength: 8,			       				// used for validating inviteCodes in welcome-chat.vue
	minPasswordLength: 10, 									// used in forgot-password.vue
	allowMembersToInvite: true,
	pollTitleMinLength: 10,
	avatarPath: "./img/avatars",
	inviteLinkPrefix: "http://app.liquido.vote/welcome?inviteCode=",
	//TODO: adminMustConfirmNewMembers: ...
	//TODO: voting algorith: absoluteMajority or margin

	// Dummy data for mocked login. Must be same as mockdata/teamUserJwt.json
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