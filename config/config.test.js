//
// Configuration for LIQUIDO mobile PWA during testing environment
//

import commonConfig from "./config.common.js"

let testConfig = {
	configSource: "test",
	LIQUIDO_API_URL: "https://eu-central-1.aws.realm.mongodb.com/api/client/v2.0/app/liquido-atlas-app-ttixa/graphql",
	devLogin: {
		// default login only available in NODE_ENV=development
		adminEmail: "adminTeamOne@liquido.me",
		adminTeamname: "TeamOne",
		memberEmail: "member0@TeamOne.org",
		memberTeamname: "TeamOne",
		token: 998877,
	},
	jwtSecret: "liquido_jwt_secret_that_must_be_very_long%"
}

let mergedConfig = { ...commonConfig, ...testConfig }

export default mergedConfig