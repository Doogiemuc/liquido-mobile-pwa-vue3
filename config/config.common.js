/**
 * Common LIQUIDO PWA configuration that is used in all environments.
 * This file is merged into the environment specific configs.
 * 
 * This is different from plain vue environment variables that can be set via .env.production files.
 * https://cli.vuejs.org/guide/mode-and-env.html#environment-variables
 * 
 * LiQUIDO Config is "statically" imported into the scripts.
 */

export default {
	configSource: "common",
	BASE_URL: "/",                   // URL path to index.html
	LIQUIDO_API_URL: "/liquido-api/v3",  // will be proxied by Vue devServer. See vue.config.js
	usernameMinLength: 5,
	inviteCodeLength: 6,			       // used for validating inviteCodes in welcome-chat.vue
	pollTitleMinLength: 10,
	voterTokenSecret: "dummyVoterTokenSecret",  // change this for production builds !!!
	avatarPath: "./img/avatars",
	inviteLinkPrefix: "http://www.liquido.me/invite?inviteCode=",

	//TODO: implement these settings per Team!
	allowMembersToInvite: true,
}