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
	LIQUIDO_API_URL: "/liquido-api/v3",  		// Path to Backend API. This will be proxied by Vue devServer in dev. See vue.config.js
	
	usernameMinLength: 5,
	inviteCodeLength: 8,			       				// used for validating inviteCodes in welcome-chat.vue
	pollTitleMinLength: 10,
	avatarPath: "./img/avatars",
	voterTokenSecret: "dummyVoterTokenSecret",  // change this for production builds !!!
	inviteLinkPrefix: "http://localhost:3001/welcome?inviteCode=",

	//TODO: implement these settings per Team! in the backend!
	allowMembersToInvite: true,

	// This is used in tests. 
	// For testing against prod, this has to match spring's application.local configuratin in PROD!
	devLogin: {
		teamName: "LocalTeam",
		admin: {
			name: "Local Admin",
			email: "adminLocalTeam@liquido.vote",
			mobilephone: "+4955511111",
		},
		member: {
			name: "Local Member",
			email: "localTestUser12@liquido.vote",
			mobilephone: "+4955522222"
		},		
		token: "XXXXXXX",
	}
}