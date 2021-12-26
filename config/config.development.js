//
// Configuration for LIQUIDO mobile PWA in LOCAL DEVELOPMENT environment
//
import _ from "lodash"
import commonConfig from "./config.common.js"

let config = {
	configSource: "development",
	//default from config.common.js: LIQUIDO_API_URL: "/liquido-api/v3",  // will be proxied by Vue devServer. See vue.config.js
	
	devLogin: {
		// default logins for login page only available in NODE_ENV=development
		adminEmail: "adminTeamOne@liquido.me",
		adminTeamname: "TeamOne",
		memberEmail: "member0@TeamOne.org",
		memberTeamname: "TeamOne",
		token: 998877,
	}
}

export default _.merge(commonConfig, config)  // Mind the parameter order _merge(target, sources...)
