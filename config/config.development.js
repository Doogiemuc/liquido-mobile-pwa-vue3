//
// Configuration for LIQUIDO mobile PWA in LOCAL DEVELOPMENT environment
//
import commonConfig from "./config.common.js"

let devConfig = {
	configSource: "development",
	// URL of liquido backend.
	// - localhost does not work on real mobile phone !
	// - HTTPS only does not work for WebAuthN !
	LIQUIDO_API_URL: "https://192.168.178.24:8443",   //TODO: Do I need to change this to a hostname for WebAuthn?  192.168.7.67  does NOT work!
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
