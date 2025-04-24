//
// Configuration for LIQUIDO mobile PWA in LOCAL DEVELOPMENT environment
//
import commonConfig from "./config.common.js"

let devConfig = {
	configSource: "development",
	
	// Connection to LIQUIDO backend 
	//LIQUIDO_API_URL: "https://localhost:8443",

	// Secure HTTPS with IP, because localhost does not work when testing on a real mobile device.
	//LIQUIDO_API_URL: "https://192.168.178.103:8443", // gismo
	LIQUIDO_API_URL: "https://localhost:8443", // local development server

	googleClientId: "673421517010-lkmgt75rsmgua6aojhpp6crjg1opuhvo.apps.googleusercontent.com",
	 
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
