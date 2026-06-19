
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

	resetPassword(email, resetPasswordToken, newPassword) {
		if (!email || !resetPasswordToken || !newPassword) throw new Error("Need email,resetPasswordRoken and newPassword to set new password!")
		return axios.get("/login/resetPassword", {
			params: { 
				email: email,
				resetPasswordToken: resetPasswordToken,
				newPassword: newPassword
			}
		}).then(res => res.data)
	},

	err: liquidoExceptionCodes
}

export default loginAPI

