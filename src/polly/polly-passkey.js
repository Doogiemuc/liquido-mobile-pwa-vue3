/**
 * Polly passkey
 *
 * In a Polly the passkey *is* the identity. There is no email, no password and no
 * registration form. One tap on Face-ID / fingerprint / device PIN and you are someone
 * the backend can recognise again.
 *
 * Two properties make this work without any account:
 *
 *  - The credential is *discoverable* (a resident key), so on the way back the browser can
 *    offer it without us knowing any username. That is why the share link needs no secret
 *    token: whoever opens it is identified by their own device.
 *  - The credential is scoped to our domain, not to a single polly. So a friend who voted
 *    in one polly is already known in the next one and taps nothing at all.
 *
 * The backend never stores the raw credential id against a ballot. It stores
 * HMAC(serverSecret, credentialId + pollyId), which enforces one vote per person per polly
 * while keeping a stolen database from linking voters to ballots.
 *
 * This file deliberately does not use webauthn-service.js: that one requires a logged-in
 * LIQUIDO team member, which a polly voter never is.
 */

import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import axios from "axios"
import config from "config"
import { PollyError } from "./polly-constants.js"
import { setSession, hasSession } from "./polly-session.js"
import { pollyPasskeyMock, isPollyMockActive } from "./polly-client.mock.js"

const http = axios.create({
	baseURL: config.LIQUIDO_API_URL,
	timeout: 10000,
	withCredentials: true,		// required: the challenge cookie must travel back to the server
})

/**
 * A WebAuthn ceremony cannot be faked over HTTP - it happens inside the browser and needs a
 * real authenticator, which a headless browser does not have. With mockPasskey we therefore
 * skip the ceremony: against the mock backend the mock invents a credential, and against a
 * real backend we ask it for a session directly via devLoginPolly (see below).
 *
 * NEVER enable this in production. The backend refuses devLoginPolly there anyway.
 */
const isMockPasskey = () => config.mockPasskey === true

/**
 * Development only: get a polly session from the real backend without a passkey.
 *
 * This exists because the passkey legs are the one part of Polly that automated tests cannot
 * reach - Cypress drives a browser with no authenticator attached. Everything *after* the
 * ceremony is the actual product, and this lets the e2e suite cover all of it. The ceremony
 * itself has to be verified by hand on a real device.
 *
 * The backend guards this with the same three checks as the team devLogin: never in prod,
 * never without a configured token, never with the wrong one.
 */
async function devLoginPolly() {
	// A fresh credential id means a fresh person. The session is then kept in localStorage,
	// so a reload or a second visit is the same person again - exactly like a real passkey.
	const credentialId = "devLogin-" + Date.now() + "-" + Math.random().toString(36).slice(2)
	const query = `query devLoginPolly($devLoginToken: String!, $credentialId: String!) {
		devLoginPolly(devLoginToken: $devLoginToken, credentialId: $credentialId)
	}`

	const res = await http.post("/graphql", {
		query,
		variables: { devLoginToken: config.devLogin?.token, credentialId },
	})
	if (res.data?.errors?.length > 0) {
		const first = res.data.errors[0]
		console.error("POLLY devLogin failed", first)
		return Promise.reject({ pollyErrorCode: first.extensions?.pollyErrorCode, msg: first.message })
	}

	const jwt = res.data?.data?.devLoginPolly
	console.log("POLLY: devLogin session (no passkey) for", credentialId)
	setSession(jwt)
	return jwt
}

/** Can this device do passkeys at all? Some older or locked-down browsers cannot. */
export function isSupported() {
	if (isMockPasskey()) return true
	try {
		return typeof window !== 'undefined' && browserSupportsWebAuthn()
	} catch (e) {
		return false
	}
}

/** Register a new passkey for this device and start a polly session. */
export async function register() {
	if (isPollyMockActive()) {
		const { jwt } = await pollyPasskeyMock("register")
		setSession(jwt)
		return jwt
	}
	if (isMockPasskey()) return devLoginPolly()

	const options = await http.get('/polly/webauthn/register-options-challenge').then(r => r.data)
	const credential = await startRegistration({ optionsJSON: options })
	const { jwt } = await http.post('/polly/webauthn/register', credential).then(r => r.data)
	setSession(jwt)
	return jwt
}

/**
 * Log in with a passkey this device already holds.
 * Deliberately usernameless: the backend answers with an empty `allowCredentials`, so the
 * browser offers whatever passkey it has for our domain.
 */
export async function login() {
	if (isPollyMockActive()) {
		const { jwt } = await pollyPasskeyMock("login")
		setSession(jwt)
		return jwt
	}
	if (isMockPasskey()) return devLoginPolly()

	const options = await http.get('/polly/webauthn/login-options-challenge').then(r => r.data)
	const assertion = await startAuthentication({ optionsJSON: options })
	const { jwt } = await http.post('/polly/webauthn/login', assertion).then(r => r.data)
	setSession(jwt)
	return jwt
}

/**
 * Make sure we have a polly session, asking the user for as little as possible.
 *
 *   already have one -> nothing happens, no prompt at all
 *   have a passkey   -> one tap to log in
 *   first time ever  -> one tap to register
 *
 * We cannot distinguish "has a passkey" from "first time" without asking the browser, so we
 * try login first and fall back to registration. If the user dismisses the device prompt this
 * rejects - callers should treat that as "they changed their mind", not as a failure to report.
 */
export async function ensurePasskeySession() {
	if (hasSession()) return

	if (!isSupported()) {
		return Promise.reject({ pollyErrorCode: PollyError.NEED_PASSKEY, msg: "This browser cannot do passkeys" })
	}

	try {
		return await login()
	} catch (err) {
		console.debug("Polly passkey: no usable credential yet, registering a new one", err)
		return await register()
	}
}

export default {
	isSupported,
	ensurePasskeySession,
	register,
	login,
}
