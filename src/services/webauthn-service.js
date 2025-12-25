//  https://simplewebauthn.dev/docs/packages/browser
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'

/**
 * Minimal client-side wrapper around @simplewebauthn/browser
 * Exposes simple functions that the UI can call with server-provided options.
 */

export function supportsWebAuthn() {
	try {
		return typeof window !== 'undefined' && browserSupportsWebAuthn()
	} catch (e) {
		return false
	}
}

/**
 * Start a registration ceremony using server-provided registrationOptions.
 * Returns the credential response that must be sent to the server.
 * @param {Object} registrationOptions - options from server (JSON)
 */
export async function startRegistrationFlow(registrationOptions) {
	if (!supportsWebAuthn()) throw new Error('WebAuthn not supported in this browser')
	try {
		const credential = await startRegistration({ optionsJSON: registrationOptions })  // this will ask user for biometric, eg. fingerprint
		return credential
	} catch (err) {
		console.error(err)
		throw err
	}
}

/**
 * Start an authentication ceremony using server-provided authenticationOptions.
 * Returns the credential response that must be sent to the server.
 * @param {Object} authenticationOptions - options from server (JSON)
 */
export async function startAuthenticationFlow(authenticationOptions) {
	if (!supportsWebAuthn()) throw new Error('WebAuthn not supported in this browser')
	try {
		const credential = await startAuthentication({ optionsJSON: authenticationOptions })
		return credential
	} catch (err) {
		console.error(err)
		throw err
	}
}
