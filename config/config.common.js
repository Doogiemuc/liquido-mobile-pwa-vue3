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
	//LIQUIDO_API_URL: "https://localhost:8443",  		// URI to Backend API. 
	mockBackend: false,
	
	//TODO: implement these settings per Team! in the backend!
	usernameMinLength: 3,
	inviteCodeLength: 8,			       				// used for validating inviteCodes in welcome-chat.vue
	minPasswordLength: 10, 									// used in forgot-password.vue
	allowMembersToInvite: true,
	pollTitleMinLength: 10,
	avatarPath: "./img/avatars",
	inviteLinkPrefix: "http://localhost:3001/welcome?inviteCode=",
	//TODO: adminMustConfirmNewMembers: ...

}