//  https://simplewebauthn.dev/docs/packages/browser
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import api from "@/services/liquido-graphql-client.js"

const webauthnAPI = {
	/**
	 * Register a biometric (fingerprint, Face-ID or Device-PIN) authenticator for a logged-in user.
	 */
	async registerWebauthn() {
		if (!browserSupportsWebAuthn()) return Promise.reject("WebAuthn not supported in this browser")
		if (!api.isAuthenticated()) return Promise.reject("You must be logged in to register an authenticator.")
		try {
			// (1) Get challenge (a random byte number) from server
			console.log("getWebAuthnRegistrationChallenge for ", api.getCachedUser().email)
			const optionsResp = await api.getWebAuthnRegistrationChallenge()
			
			// (2) Aks hardware device for user's confirmation
			console.log(" WebAuthn: Waiting for device ...")
			const credential = await startRegistration({ optionsJSON: optionsResp })  // this will ask user for biometric, eg. fingerprint
			console.log("Credentials from startRegistrationFlow", credential)

			// (3) Submit our confirmed private key to the server to register this authenticator
			const verifyResp = await api.submitWebAuthnRegistration(credential)
			console.log("Successfully registered authenticator", verifyResp)

			return Promise.resolve("Successfully registered authenticator")
		} catch (err) {
			console.error('RegisterWebauthn ERROR', err)
			return Promise.reject("RegisterWebauthn ERROR: "+JSON.stringify(err))
		}
	},

	/**
	 * Start an authentication ceremony using server-provided authenticationOptions.
	 * Returns the credential response that must be sent to the server.
	 * @param {Object} authenticationOptions - options from server (JSON)
	 */
	async startAuthenticationFlow(authenticationOptions) {
		if (!browserSupportsWebAuthn()) throw new Error('WebAuthn not supported in this browser')
		try {
			const credential = await startAuthentication({ optionsJSON: authenticationOptions })
			return credential
		} catch (err) {
			console.error(err)
			throw err
		}
	}
}

export default webauthnAPI;
