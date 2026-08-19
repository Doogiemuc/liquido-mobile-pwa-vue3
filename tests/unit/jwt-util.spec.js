import { describe, it, expect, vi } from "vitest"
import { decodeJwtPayload, jwtHasRole, LIQUIDO_ADMIN_ROLE, LIQUIDO_USER_ROLE } from "@/services/jwt-util.js"

/**
 * Build a structurally real, unsigned JWT the way the backend shapes one.
 * Note the UTF-8 step: a real JWT's segments are base64url over UTF-8 BYTES. Passing a string
 * straight to btoa() would encode Latin-1 instead, and throw outright above U+00FF.
 */
const makeJwt = payload => {
	const b64url = obj => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
		.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
	return b64url({ alg: "RS256", typ: "JWT" }) + "." + b64url(payload) + ".signaturedoesnotmatterhere"
}

describe("decodeJwtPayload", () => {
	it("decodes the payload of a well formed token", () => {
		const jwt = makeJwt({ sub: "admin@liquido.vote", teamId: "42", groups: [LIQUIDO_USER_ROLE] })
		expect(decodeJwtPayload(jwt)).toEqual({ sub: "admin@liquido.vote", teamId: "42", groups: [LIQUIDO_USER_ROLE] })
	})

	it("handles non-ASCII claims", () => {
		// Names are not always ASCII, and a naive atob() mangles them.
		const jwt = makeJwt({ sub: "björn.müller@liquido.vote", name: "Björn Müller" })
		expect(decodeJwtPayload(jwt).name).toBe("Björn Müller")
	})

	// Every one of these must answer "no claims" rather than throw: callers treat undefined as the
	// least privileged answer, and a token can be absent, truncated or hand-edited in localStorage.
	it.each([
		["undefined", undefined],
		["null", null],
		["a number", 12345],
		["an empty string", ""],
		["the old mock-jwt-<id> format", "mock-jwt-4711"],
		["too few segments", "header.payload"],
		["too many segments", "a.b.c.d"],
		["a payload that is not base64", "header.!!!not base64!!!.sig"],
		["a payload that is not JSON", "header." + btoa("plain text") + ".sig"],
	])("returns undefined for %s", (_label, input) => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
		expect(decodeJwtPayload(input)).toBeUndefined()
	})
})

describe("jwtHasRole", () => {
	it("is true when the groups claim carries the role", () => {
		const jwt = makeJwt({ groups: [LIQUIDO_USER_ROLE, LIQUIDO_ADMIN_ROLE] })
		expect(jwtHasRole(jwt, LIQUIDO_ADMIN_ROLE)).toBe(true)
	})

	it("is false for a member, who only carries the user role", () => {
		const jwt = makeJwt({ groups: [LIQUIDO_USER_ROLE] })
		expect(jwtHasRole(jwt, LIQUIDO_ADMIN_ROLE)).toBe(false)
	})

	it("is false when there is no groups claim at all", () => {
		expect(jwtHasRole(makeJwt({ sub: "someone@liquido.vote" }), LIQUIDO_ADMIN_ROLE)).toBe(false)
	})

	it("is false when groups is not an array", () => {
		expect(jwtHasRole(makeJwt({ groups: LIQUIDO_ADMIN_ROLE }), LIQUIDO_ADMIN_ROLE)).toBe(false)
	})

	it("is false without a token, so the UI shows the least it can", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
		expect(jwtHasRole(undefined, LIQUIDO_ADMIN_ROLE)).toBe(false)
		expect(jwtHasRole("", LIQUIDO_ADMIN_ROLE)).toBe(false)
	})

	it("does not match a role by prefix", () => {
		// "LIQUIDO_ADMIN_READONLY" must not satisfy a check for "LIQUIDO_ADMIN".
		expect(jwtHasRole(makeJwt({ groups: ["LIQUIDO_ADMIN_READONLY"] }), LIQUIDO_ADMIN_ROLE)).toBe(false)
	})
})
