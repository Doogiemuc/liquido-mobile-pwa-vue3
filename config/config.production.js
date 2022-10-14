//
// Configuration for LIQUIDO mobile PWA in PROD environment
//
import commonConfig from "./config.common.js"

let prodConfig = {
	configSource: "production",
	BASE_URL: "/liquido-mobile/",   // Base URL for router and links in HTML head must end with '/'
	LIQUIDO_API_URL: "http://52.59.209.46:7180/liquido-api/v3",
	voterTokenSecret: "prod%Voter§Token4Secret",
	inviteLinkPrefix: "http://www.liquido.me/invite?inviteCode=",
}

let mergedConfig = { ...commonConfig, ...prodConfig }

export default mergedConfig