//
// Configuration for LIQUIDO mobile PWA in LOCAL DEVELOPMENT environment
//
import commonConfig from "./config.common.js"

let devConfig = {
	configSource: "development",
	//default from config.common.js: LIQUIDO_API_URL: "/liquido-api/v3",  // will be proxied by Vue devServer. See vue.config.js
	voterTokenSecret: "devVoterTokenSecret",
	inviteLinkPrefix: "http://www.liquido.me/invite?inviteCode=",

	devLogin: {
		// default logins for login page only available in NODE_ENV=development
		adminEmail: "adminTeamOne@liquido.me",
		adminTeamname: "TeamOne",
		memberEmail: "member0@TeamOne.org",
		memberTeamname: "TeamOne",
		token: 998877,
	}
}
let mergedConfig = { ...commonConfig, ...devConfig }  // Mind the parameter order _merge(target, sources...)

export default mergedConfig
