//
// Configuration for LIQUIDO mobile PWA in LOCAL DEVELOPMENT environment
//
import commonConfig from "./config.common.js"

let devConfig = {
	configSource: "development",
	// URL of liquido backend.
	
	// Default URL 
	//LIQUIDO_API_URL: "http://localhost:8080",

	// Secure HTTPS with IP, because localhost does not work when testing on a real mobile device.
	LIQUIDO_API_URL: "https://192.168.178.24:8443",   

	// Used for testing
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
