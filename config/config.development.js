//
// Configuration for LIQUIDO mobile PWA in LOCAL DEVELOPMENT environment
//
import commonConfig from "./config.common.js"

let devConfig = {
	configSource: "development",
	LIQUIDO_API_URL: "https://localhost:8443",
	voterTokenSecret: "devVoterTokenSecret",

	devLogin: {
		teamName: "LocalTeam",
		admin: {
			name: "Local Admin",
			email: "testadmin4711@liquido.vote",
			mobilephone: "+495554711",
		},
		member: {
			name: "Local Member",
			email: "testmember4711@liquido.vote",
			mobilephone: "+496664711"
		},		
		token: "devLoginTokenDev",
	}
}
let mergedConfig = { ...commonConfig, ...devConfig }  // Mind the parameter order _merge(target, sources...)

export default mergedConfig
