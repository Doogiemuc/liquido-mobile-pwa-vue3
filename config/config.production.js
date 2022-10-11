//
// Configuration for LIQUIDO mobile PWA in PROD environment
//
import commonConfig from "./config.common.js"

let prodConfig = {
	configSource: "production",
	BASE_URL: "/liquido-mobile",
	LIQUIDO_API_URL: "http://ec2-34-253-48-76.eu-west-1.compute.amazonaws.com/liquido-api/v3",
	voterTokenSecret: "prod%Voter§Token4Secret",
	inviteLinkPrefix: "http://www.liquido.me/invite?inviteCode=",
}

let mergedConfig = { ...commonConfig, ...prodConfig }

export default mergedConfig