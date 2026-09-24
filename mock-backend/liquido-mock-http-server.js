/**
 * The mock backend, as an actual Node HTTP handler - see vite-plugin-mock-backend.js, which mounts
 * handleMockRequest() below as Vite dev-middleware.
 *
 * This runs INSIDE the Vite dev server process, not in the browser - config.mockBackend now only
 * changes where the frontend points its network calls (see liquido-graphql-client.js), not how it
 * makes them. Every call, mocked or real, is a genuine fetch/XHR that Cypress's cy.intercept()/
 * cy.wait() can see - that is the whole point: the SAME e2e spec source works unmodified against
 * either backend. What used to be a client-side axios adapter override (invisible to Cypress) is
 * now a real HTTP round trip that a fake server happens to answer.
 *
 * Separate from liquido-mock-domain.js (state, GraphQL query/mutation handlers, login) because THIS
 * file uses Node-only APIs (crypto, Buffer, raw HTTP req/res) that must never end up in the browser
 * bundle - liquido-graphql-client.js only ever imports the domain file, directly, for the vitest
 * (config.test.js) path. Ported from the old src/services/liquido-graphql-client.mock.js, which did
 * the REST/WebAuthn mocking below via a client-side axios interceptor instead.
 */
import crypto from "node:crypto"
import LiquidoExceptionCodes from "@/services/LiquidoExceptionCodes.js"
import {
	runMockOperation,
	setAuthHeader,
	findMemberByCurrentAuthHeader,
	findMemberByEmail,
	currentTeam,
	loginMock,
	generateMockToken,
	mockState,
	MockLiquidoError,
} from "./liquido-mock-domain.js"

/** Reads and JSON-parses a request body. Resolves {} for an empty body (e.g. a bare POST). */
const readJsonBody = req => new Promise((resolve, reject) => {
	let raw = ""
	req.on("data", chunk => { raw += chunk })
	req.on("end", () => {
		if (!raw) return resolve({})
		try { resolve(JSON.parse(raw)) } catch (err) { reject(err) }
	})
	req.on("error", reject)
})

/** Writes a JSON 200 response for a mocked REST endpoint (as opposed to a mocked GraphQL query). */
const writeRestSuccess = (res, data) => {
	res.statusCode = 200
	res.setHeader("Content-Type", "application/json")
	res.end(JSON.stringify(data ?? {}))
}

/**
 * Writes a JSON error response for a mocked REST endpoint, carrying `liquidoErrorCode` at the top
 * level of the body - the shape join-team-v2.vue/welcome-chat-v2.vue read REST errors from
 * (`err.response.data.liquidoErrorCode`). verifyEmail is the one exception (see below): it reads a
 * nested `liquidoException.liquidoErrorCode` instead, so it builds its own body.
 */
const writeRestError = (res, status, liquidoErrorCode, msg) => {
	res.statusCode = status
	res.setHeader("Content-Type", "application/json")
	res.end(JSON.stringify({ liquidoErrorCode, msg }))
}

/**
 * Handles one POST /graphql body {query, variables} and writes the GraphQL-shaped JSON response -
 * always HTTP 200, per the GraphQL-over-HTTP convention liquido-graphql-client.js's real-backend
 * branch already expects (a query-level failure is an `errors` array, not an HTTP error status).
 */
const writeGraphQlResponse = (res, query, variables) => {
	res.statusCode = 200
	res.setHeader("Content-Type", "application/json")
	try {
		res.end(JSON.stringify({ data: runMockOperation(query, variables) }))
	} catch (err) {
		if (err instanceof MockLiquidoError) {
			const liquidoException = { liquidoErrorCode: err.code, msg: err.message }
			res.end(JSON.stringify({ data: null, errors: [{ message: err.message, extensions: { liquidoException } }] }))
		} else {
			res.end(JSON.stringify({ data: null, errors: [{ message: String(err?.message || err) }] }))
		}
	}
}

const handleCheckLoginEmail = (res, email) => {
	const member = currentTeam().members.find(m => m.user.email === email)
	if (member) {
		console.log("MOCK: /check-login-email for " + email + " -> existing user")
		writeRestSuccess(res, { status: "REGISTERED", webauthn: true })
	} else {
		console.log("MOCK: /check-login-email for " + email + " -> email not registered")
		writeRestSuccess(res, { status: "UNKNOWN", webauthn: false })
	}
}

const handleRequestPasswordResetEmail = (res, email) => {
	if (!findMemberByEmail(email)) {
		console.log("MOCK: /login/requestPasswordResetEmail for " + email + " -> unknown email")
		writeRestError(res, 400, LiquidoExceptionCodes.WONT_RESET_PASSWORD, "Cannot reset password for unknown email")
		return
	}
	const resetToken = generateMockToken("mock-reset-token")
	mockState.passwordResetTokensByEmail[email] = resetToken
	console.log("MOCK: /login/requestPasswordResetEmail for " + email + " -> token " + resetToken)
	writeRestSuccess(res, {})
}

const handleResetPassword = (res, body) => {
	const { email, resetPasswordToken } = body || {}
	const expectedToken = mockState.passwordResetTokensByEmail[email]
	if (!findMemberByEmail(email) || !expectedToken || expectedToken !== resetPasswordToken) {
		console.log("MOCK: /login/resetPassword for " + email + " -> invalid or expired token")
		writeRestError(res, 400, LiquidoExceptionCodes.WONT_RESET_PASSWORD, "Cannot reset password: invalid or expired token")
		return
	}
	delete mockState.passwordResetTokensByEmail[email]   // one-time use, like the real backend
	console.log("MOCK: /login/resetPassword for " + email + " -> success")
	writeRestSuccess(res, {})
}

const handleRequestEmailLoginLink = (res, email) => {
	if (!findMemberByEmail(email)) {
		console.log("MOCK: /login/requestEmailLoginLink for " + email + " -> unknown email")
		writeRestError(res, 400, LiquidoExceptionCodes.CANNOT_LOGIN_EMAIL_NOT_FOUND, "Unknown email")
		return
	}
	const loginToken = generateMockToken("mock-login-token")
	mockState.emailLoginTokensByEmail[email] = loginToken
	console.log("MOCK: /login/requestEmailLoginLink for " + email + " -> token " + loginToken)
	writeRestSuccess(res, {})
}

/**
 * Always rejects: there is no real mailer/token issuance to check against in mock mode, so this
 * only ever proves the ROUTE resolves and the app handles a genuine rejection - exactly what
 * happy-case.cy.js's verify-email step tests, with a deliberately-wrong token. verify-email.vue
 * reads the error code from a NESTED `liquidoException.liquidoErrorCode`, unlike the flatter shape
 * the other REST endpoints above use - see verify-email.vue/login-rest-client.js.
 */
const handleVerifyEmail = res => {
	res.statusCode = 400
	res.setHeader("Content-Type", "application/json")
	res.end(JSON.stringify({
		liquidoException: { liquidoErrorCode: LiquidoExceptionCodes.EMAIL_VERIFICATION_TOKEN_INVALID, msg: "Invalid or expired verification token" },
	}))
}

/** The domain part of a Host header ("shadow.fritz.box:3001" -> "shadow.fritz.box"), for rp.id/rpId. */
const rpIdFromHost = host => (host || "").split(":")[0]

/**
 * Registration options for the CURRENTLY LOGGED IN user (see webauthn-service.js's
 * registerWebauthn(), which requires api.isAuthenticated() before calling this). This has to be a
 * real, spec-shaped PublicKeyCredentialCreationOptionsJSON: the browser's own WebAuthn
 * implementation validates rp.id against the page's actual origin before it will even talk to the
 * (possibly virtual) authenticator - that is not something a mock can hand-wave away.
 *
 * What happens on the way BACK (handleWebAuthnRegister below) is a different story: nothing here
 * verifies the resulting attestation cryptographically, because the ceremony that produced it
 * already genuinely happened in the browser against a real (if virtual) authenticator - verifying
 * it server-side would only be proving WebAuthn itself works, which is exactly the part that can
 * only be meaningfully tested on a real device anyway. See this file's module doc comment.
 */
const handleWebAuthnRegisterOptions = (res, req) => {
	const member = findMemberByCurrentAuthHeader()
	if (!member) {
		writeRestError(res, 401, LiquidoExceptionCodes.UNAUTHORIZED, "Must be logged in to register a passkey")
		return
	}
	const user = member.user
	writeRestSuccess(res, {
		rp: { name: "LIQUIDO", id: rpIdFromHost(req.headers.host) },
		user: {
			id: Buffer.from(String(user.id)).toString("base64url"),
			name: user.email,
			displayName: user.name,
		},
		challenge: crypto.randomBytes(32).toString("base64url"),
		pubKeyCredParams: [
			{ alg: -7, type: "public-key" },    // ES256
			{ alg: -257, type: "public-key" },  // RS256
		],
		timeout: 60000,
		attestation: "none",
		authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "preferred" },
		excludeCredentials: [],
	})
}

/**
 * Accepts the registration response - deliberately without verifying the attestation, see
 * handleWebAuthnRegisterOptions's doc comment above - and marks the user as having a passkey now,
 * the one piece of state a real registration actually changes as far as the rest of the app can
 * see (team-home.vue's passkeyButton reminder reads user.hasWebauthn).
 */
const handleWebAuthnRegister = res => {
	const member = findMemberByCurrentAuthHeader()
	if (!member) {
		writeRestError(res, 401, LiquidoExceptionCodes.UNAUTHORIZED, "Must be logged in to register a passkey")
		return
	}
	member.user.hasWebauthn = true
	writeRestSuccess(res, {})
}

/**
 * The email a webauthn login ceremony is currently in progress for, set by
 * handleWebAuthnLoginOptions and consumed by handleWebAuthnLogin. Not exercised by
 * happy-case.cy.js (the admin only ever REGISTERS a passkey; "returning admin" reuses the stored
 * JWT directly, not a webauthn login) - this exists only so the route does not hard-fail. The mock
 * never stores a real credential-to-user mapping the way a real backend would, so it trusts
 * whichever email the preceding login-options-challenge named; that is deferred non-happy-path
 * scope to tighten later, same as the rest of this file's error-case coverage.
 */
let pendingWebAuthnLoginEmail

const handleWebAuthnLoginOptions = (res, req, url) => {
	pendingWebAuthnLoginEmail = url.searchParams.get("email")
	writeRestSuccess(res, {
		challenge: crypto.randomBytes(32).toString("base64url"),
		timeout: 60000,
		rpId: rpIdFromHost(req.headers.host),
		allowCredentials: [],
		userVerification: "preferred",
	})
}

const handleWebAuthnLogin = res => {
	const member = findMemberByEmail(pendingWebAuthnLoginEmail)
	if (!member) {
		writeRestError(res, 401, LiquidoExceptionCodes.CANNOT_LOGIN_EMAIL_NOT_FOUND, "Unknown email for webauthn login")
		return
	}
	writeRestSuccess(res, loginMock(member.user.email))
}

/**
 * The mock backend's one entry point: handles a request if it recognizes the path, and writes the
 * response itself. Returns true if it handled the request, false if the caller (the Vite plugin)
 * should call next() and let some other middleware take it.
 */
export async function handleMockRequest(req, res) {
	const url = new URL(req.url, "http://mock-backend")
	const pathname = url.pathname
	setAuthHeader(req.headers.authorization)
	const match = (method, path) => req.method === method && pathname === path

	try {
		if (match("POST", "/graphql")) {
			const { query, variables } = await readJsonBody(req)
			writeGraphQlResponse(res, query, variables)
		} else if (match("GET", "/login/check-login-email")) {
			handleCheckLoginEmail(res, url.searchParams.get("email"))
		} else if (match("POST", "/login/welcomeMail")) {
			// No real mailer in mock mode - just acknowledge the request the way the backend would.
			writeRestSuccess(res, {})
		} else if (match("GET", "/login/requestPasswordResetEmail")) {
			handleRequestPasswordResetEmail(res, url.searchParams.get("email"))
		} else if (match("POST", "/login/resetPassword")) {
			handleResetPassword(res, await readJsonBody(req))
		} else if (match("GET", "/login/requestEmailLoginLink")) {
			handleRequestEmailLoginLink(res, url.searchParams.get("email"))
		} else if (match("POST", "/login/verifyEmail")) {
			await readJsonBody(req)
			handleVerifyEmail(res)
		} else if (match("GET", "/webauthn/register-options-challenge")) {
			handleWebAuthnRegisterOptions(res, req)
		} else if (match("POST", "/webauthn/register")) {
			await readJsonBody(req)  // a real attestation, deliberately not verified - see the doc comment above
			handleWebAuthnRegister(res)
		} else if (match("GET", "/webauthn/login-options-challenge")) {
			handleWebAuthnLoginOptions(res, req, url)
		} else if (match("POST", "/webauthn/login")) {
			await readJsonBody(req)
			handleWebAuthnLogin(res)
		} else {
			return false
		}
	} catch (err) {
		console.error("MOCK backend: error handling " + req.method + " " + pathname, err)
		res.statusCode = 500
		res.setHeader("Content-Type", "application/json")
		res.end(JSON.stringify({ msg: String(err?.message || err) }))
	}
	return true
}
