
import axios from 'axios'
import liquidoExceptionCodes from "@/services/LiquidoExceptionCodes.js"  // Liquido backend error codes. Must match LiquidoException.java from backend

/**
 * HTTP Client for the login related REST endpoints
 */
const loginAPI = {

	/**
	 * Request a password reset for a user.
	 * @param {String} email must be a registered user email
	 * @returns 
	 */
	requestPasswordReset(email) {
		if (!email) throw new Error("Need email to request password reset!")
		return axios.get("/login/requestPasswordResetEmail", {
			params: { email: email }
		}).then(res => res.data)
	},

	/**
	 * Set a new password with the one-time token from the reset email.
	 *
	 * POST with a JSON body, NOT a GET with query params: this carries a one-time token and a
	 * plaintext password, and query strings end up in server access logs, proxy logs and browser
	 * history. The backend only accepts POST here (LoginRestAPI.resetPassword) - a GET answers 405.
	 * The body keys must match the ResetPasswordRequest record field-for-field.
	 */
	resetPassword(email, resetPasswordToken, newPassword) {
		if (!email || !resetPasswordToken || !newPassword) throw new Error("Need email,resetPasswordRoken and newPassword to set new password!")
		return axios.post("/login/resetPassword", {
			email: email,
			resetPasswordToken: resetPasswordToken,
			newPassword: newPassword
		}).then(res => res.data)
	},

	/**
	 * Confirm an email address with the token from the welcome mail's "verify your email" link.
	 *
	 * POST with a JSON body for the same reason as resetPassword: a token in a query string ends up
	 * in access logs, proxy logs and browser history. The body key must match VerifyEmailRequest.
	 *
	 * Note this is NOT the magic-link login ("emailToken"): confirming an address returns no session
	 * and no JWT. The user still signs in normally afterwards.
	 */
	verifyEmail(verifyToken) {
		if (!verifyToken) throw new Error("Need verifyToken to verify an email address!")
		return axios.post("/login/verifyEmail", {
			verifyToken: verifyToken
		}).then(res => res.data)
	},

	/**
	 * Ask the backend to send a fresh "confirm your address" mail to the CURRENT user.
	 *
	 * Takes no arguments: the backend reads the recipient from the JWT, so this can only ever mail
	 * you. There is deliberately no anonymous variant that accepts an email address - that would let
	 * anyone make LIQUIDO send mail to a stranger. So this is only callable while logged in.
	 *
	 * Sending a new link invalidates the previous one.
	 */
	resendEmailVerification() {
		return axios.post("/login/resendEmailVerification").then(res => res.data)
	},

	err: liquidoExceptionCodes
}

export default loginAPI

