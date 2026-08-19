/**
 * Reading our own JSON Web Token.
 *
 * <b>None of this is a security boundary.</b> The browser has no key and cannot verify a signature,
 * and the token it is reading came out of its own localStorage anyway. Everything here decides what
 * the UI SHOWS. Every actual permission is enforced by the backend, which does verify the signature
 * on every single request - so a user who hand-edits their token only changes which buttons appear,
 * and then gets a LiquidoException the moment they press one.
 *
 * Lives in its own module because both liquido-graphql-client.js and its mock need it, and the mock
 * is imported by the client - importing back the other way would be circular.
 */

/**
 * The role name the backend puts into the JWT's "groups" claim.
 * Mirrors JwtTokenUtils.LIQUIDO_ADMIN_ROLE in the Quarkus backend. Change one, change the other.
 */
export const LIQUIDO_ADMIN_ROLE = "LIQUIDO_ADMIN"

/** Everyone who is logged in has this role. JwtTokenUtils.LIQUIDO_USER_ROLE. */
export const LIQUIDO_USER_ROLE = "LIQUIDO_USER"

/**
 * Decode the payload of a JWT. Returns undefined for anything that is not a decodable JWT,
 * rather than throwing: a missing or malformed token simply means "no claims", and every caller
 * treats that as the least privileged answer.
 *
 * @param {String} jwt a JSON web token, "header.payload.signature"
 * @returns {Object} the decoded payload, or undefined
 */
export function decodeJwtPayload(jwt) {
	if (typeof jwt !== "string") return undefined
	const segments = jwt.split(".")
	if (segments.length !== 3) return undefined
	try {
		// base64url -> base64, then a UTF-8 safe atob: names and emails are not always ASCII.
		const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/")
		const json = decodeURIComponent(
			atob(base64)
				.split("")
				.map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
				.join("")
		)
		return JSON.parse(json)
	} catch (e) {
		console.warn("Cannot decode JWT payload", e)
		return undefined
	}
}

/**
 * Does this JWT carry the given role in its "groups" claim?
 * @param {String} jwt a JSON web token
 * @param {String} role e.g. LIQUIDO_ADMIN_ROLE
 */
export function jwtHasRole(jwt, role) {
	const groups = decodeJwtPayload(jwt)?.groups
	return Array.isArray(groups) && groups.includes(role)
}
