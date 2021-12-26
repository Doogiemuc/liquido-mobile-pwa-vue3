//
// Configuration for LIQUIDO mobile PWA during testing environment
//

import _ from "lodash"
import commonConfig from "./config.common.js"

let config = {
	devLogin: {
		// default logins for login page only available in NODE_ENV=development
		adminEmail: "adminTeamOne@liquido.me",
		adminTeamname: "TeamOne",
		memberEmail: "member0@TeamOne.org",
		memberTeamname: "TeamOne",
		token: 998877,
	}
}

_.merge(config, commonConfig)

export default config