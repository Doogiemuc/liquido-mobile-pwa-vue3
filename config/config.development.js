//
// Configuration for LIQUIDO mobile PWA in LOCAL DEVELOPMENT environment
//
import commonConfig from "./config.common.js"

let devConfig = {
	configSource: "development",
	//default from config.common.js: LIQUIDO_API_URL: "/liquido-api/v3",  // will be proxied by Vue devServer. See vue.config.js
	voterTokenSecret: "devVoterTokenSecret",

	//can point local dev environment to some other backend, eg.
	//LIQUIDO_API_URL: "http://52.59.209.46:7180/liquido-api/v3",

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
