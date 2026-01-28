//  https://simplewebauthn.dev/docs/packages/browser
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import api from "@/services/liquido-graphql-client.js"

const webauthnAPI = {

	/** "Carefully" check if the local device supports WebAuthN */
	isWebAuthnSupported() {
		try {
			return typeof window !== 'undefined' && browserSupportsWebAuthn()
		} catch (e) {
			return false
		}
	},

	/**
	 * Register a biometric (fingerprint, Face-ID or Device-PIN) authenticator for a logged-in user.
	 */
	async registerWebauthn(authenticatorLabel) {
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
			//     Keep ind mind: This only works, when frontend and backend are served on the same DOMAIN!
			const verifyResp = await api.submitWebAuthnRegistration(credential, authenticatorLabel)
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
	},

	/**
	 * Login with WebAuthn authenticator (passwordless login).
	 * This handles the complete login ceremony:
	 * 1. Gets authentication options (challenge) from backend
	 * 2. Prompts user for biometric confirmation
	 * 3. Submits assertion to backend for verification
	 * 4. Returns login response containing user, team, and JWT
	 * 
	 * @param {String} email - User's email address
	 * @return {Object} Login response { user, team, jwt }
	 * @throws Error if WebAuthn not supported, not available for email, or authentication fails
	 */
	async loginWithWebAuthn(email) {
		if (!browserSupportsWebAuthn()) throw new Error('WebAuthn not supported in this browser')
		if (!email) throw new Error('Email is required for WebAuthn login')
		try {
			//console.log("WebAuthn login: Starting authentication for", email)
			
			// (1) Get WebAuthn authentication options (challenge) from backend
			const authOptions = await api.getWebAuthnLoginChallenge(email)
			//console.log("WebAuthn login: Received authentication options", authOptions)
			
			// (2) Start WebAuthn authentication ceremony (user confirms with biometric)
			console.log("WebAuthn biometric login: Waiting for device ...")
			const assertion = await startAuthentication({ optionsJSON: authOptions })
			//console.log("WebAuthn login: User confirmed with biometric", assertion)
			
			// (3) Submit assertion to backend for verification
			const teamDataResponse = await api.submitWebAuthnLogin(assertion)
			//console.log("WebAuthn login: Successfully authenticated", teamDataResponse)
			return teamDataResponse
		} catch (err) {
			console.error('WebAuthn login ERROR', err)
			throw err
		}
	}
}

export default webauthnAPI;
