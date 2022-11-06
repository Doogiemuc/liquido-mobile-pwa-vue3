//
// Configuration for LIQUIDO mobile PWA in PROD environment
//
import commonConfig from "./config.common.js"

let prodConfig = {
	configSource: "production",

	// Secure HTTPS connection. Requires a valid certificate to be configured in our Spring backend!
	LIQUIDO_API_URL: "https://api.liquido.vote:7180/liquido-api/v3",

	BASE_URL: "/",   // Base URL for vue-router and links in HTML head. This URL must end with '/'!
	voterTokenSecret: "prod%Voter§Token4Secret",
	inviteLinkPrefix: "https://app.liquido.vote/welcome?inviteCode=",
}

let mergedConfig = { ...commonConfig, ...prodConfig }

export default mergedConfig