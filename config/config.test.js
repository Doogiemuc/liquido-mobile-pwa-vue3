//
// Configuration for LIQUIDO mobile PWA during testing environment
//
import commonConfig from "./config.common.js"

let testConfig = {
	configSource: "test",
	LIQUIDO_API_URL: "http://localhost:8080",  //  "/liquido-api/v3",
	BASE_URL: "/",
	voterTokenSecret: "test44VoterTokenSecret",
}

let mergedConfig = { ...commonConfig, ...testConfig }

export default mergedConfig