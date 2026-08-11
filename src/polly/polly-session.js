/**
 * The Polly session.
 *
 * Nothing more than a JWT the backend hands back after a passkey ceremony, kept under
 * its OWN localStorage key. A polly session and a LIQUIDO team session never meet:
 * the team router guard reads LIQUIDO_JWT and must never see a polly token, or it would
 * try to hydrate a team from it and log the user out.
 *
 * The token is long lived (about a month), so a returning voter taps nothing at all.
 */

const POLLY_JWT_KEY = "LIQUIDO_POLLY_JWT"

export function getSessionJwt() {
	try {
		return localStorage.getItem(POLLY_JWT_KEY) || undefined
	} catch (e) {
		return undefined		// private mode, storage disabled, ...
	}
}

export function setSession(jwt) {
	if (!jwt) return
	try {
		localStorage.setItem(POLLY_JWT_KEY, jwt)
	} catch (e) {
		console.warn("Polly: cannot persist session", e)
	}
}

export function clearSession() {
	try {
		localStorage.removeItem(POLLY_JWT_KEY)
	} catch (e) { /* nothing we can do */ }
}

/** Does this browser already hold a polly session? */
export function hasSession() {
	return !!getSessionJwt()
}
