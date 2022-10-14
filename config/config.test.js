//
// Configuration for LIQUIDO mobile PWA during testing environment
//
import commonConfig from "./config.common.js"

let testConfig = {
	configSource: "test",
	LIQUIDO_API_URL: "/liquido-api/v3",
	BASE_URL: "/",
	voterTokenSecret: "test44VoterTokenSecret",
	devLogin: {
		// default login only available in NODE_ENV=development
		adminEmail: "adminTeamOne@liquido.me",
		adminTeamname: "TeamOne",
		memberEmail: "member0@TeamOne.org",
		memberTeamname: "TeamOne",
		token: 998877,
	}
}

let mergedConfig = { ...commonConfig, ...testConfig }

export default mergedConfig