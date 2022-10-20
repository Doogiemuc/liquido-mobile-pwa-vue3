//
// Configuration for LIQUIDO mobile PWA in PROD environment
//
import commonConfig from "./config.common.js"

let prodConfig = {
	configSource: "production",
	LIQUIDO_API_URL: "http://52.59.209.46:7180/liquido-api/v3",
	BASE_URL: "/",   // Base URL for router and links in HTML head must end with '/'
	voterTokenSecret: "prod%Voter§Token4Secret",
	inviteLinkPrefix: "http://app.liquido.vote/invite?inviteCode=",
}

let mergedConfig = { ...commonConfig, ...prodConfig }

export default mergedConfig