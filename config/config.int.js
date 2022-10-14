//
// Configuration for LIQUIDO mobile PWA in INT environment   (AWS local apache on lightsail instance)
//
import commonConfig from "./config.common.js"

let intConfig = {
	configSource: "int",
	LIQUIDO_API_URL: "http://52.59.209.46:7180/liquido-api/v3",
	BASE_URL: "/liquido-mobile/",   // Base URL for router and links in HTML head must end with '/'
	voterTokenSecret: "intVoterTokenSecret234",
}

let mergedConfig = { ...commonConfig, ...intConfig }

export default mergedConfig