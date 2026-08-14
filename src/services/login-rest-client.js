
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

	err: liquidoExceptionCodes
}

export default loginAPI

