<template>
	<div>
		<h1 id="forgot-password-page" class="page-title">{{ pageTitle }}</h1>

		<!-- Step1: Request password reset email  -->
		<div class="card" v-if="!resetPasswordToken">
			<div class="card-body">

				<liquido-input
				  id="emailInput"
					v-model="emailInputVal"
					v-model:state="emailInputState"
					type="email"
					:placeholder="$t('emailPlaceholder')"
					:required=true
					:empty-feedback="$t('emailEmpty')"
					:feedback-placehoder="true"
					:invalid-feedback="$t('emailInvalid')"/>

				<div class="alert alert-danger" v-if="resetPasswordErrorMessage">
					{{ resetPasswordErrorMessage }}
				</div>

				<div class="alert alert-success" v-if="resetPasswordSuccessMessage">
					{{ resetPasswordSuccessMessage }}
				</div>	

				<div class="alert alert-info" v-if="resetPasswordInfoMessage">
					{{ resetPasswordInfoMessage }}
				</div>

				<button id="requestPasswordResetButton" type="button" class="btn btn-primary my-3 w-100" 
					@click="requestPasswordReset"
					:disabled="resetPasswordResetButtonDisabled">
					{{ $t('SendMail') }}
				</button>
			</div>
		</div>

		<!-- Step2: Reset password with token-->
		<div class="card" v-if="resetPasswordToken">
			<div class="card-body">

				<p>Reset password for:</p>
				{{ email }}

				<liquido-input
					id="newPasswordInput1" 
					v-model="newPasswordInput1Val" 
					v-model:state="newPasswordInput1State" 
					:placeholder="$t('NewPassword')"
					:required=true
					:empty-feedback="$t('NewPasswordEmpty')"
					feedback-placehoder="true"
					:invalid-feedback="$t('NewPasswordInvalid')"
					type="password"
				/>

				<liquido-input
					id="newPasswordInput1" 
					v-model="newPasswordInput2Val" 
					v-model:state="newPasswordInput2State" 
					:placeholder="$t('RepeatNewPassword')"
					:required=true
					:empty-feedback="$t('NewPasswordEmpty')"
					feedback-placehoder="true"
					:invalid-feedback="$t('NewPasswordInvalid')"
					type="password"
				/>

				<div class="alert alert-danger" v-if="resetPasswordErrorMessage">
					{{ resetPasswordErrorMessage }}
				</div>

				<div class="alert alert-success" v-if="resetPasswordSuccessMessage">
					{{ resetPasswordSuccessMessage }}
				</div>	

				<div class="alert alert-info" v-if="resetPasswordInfoMessage">
					{{ resetPasswordInfoMessage }}
				</div>

				<button id="resetPasswordButton" type="button" class="btn btn-primary my-3 w-100" 
					@click="requestPasswordReset"
					:disabled="resetPasswordButtonDisabled">
					{{ primaryActionButtonText }}
				</button>
			</div>
		</div>
	
		<div class="back-to-login-link my-5">
			<a href="#" @click="backToLogin">{{ $t('BackToLogin') }}</a>
		</div>

	</div>
</template>

<script>
import liquidoInput, { STATE } from "@/components/liquido-input.vue"
import api from "@/services/liquido-graphql-client.js"
import { store }  from "@/services/store.js"
import config from "config"


export default {
  i18n: {
    messages: {
      de: {      
				ForgotPassword: "Passwort vergessen",
				ResetPassword: "Passwort zurücksetzen",
				SendMail: "Mail schicken",
				emailPlaceholder: "Deine E-Mail",
        emailInvalid: "Ungültige Email. Vielleicht nur vertippt?",
				emailNotFound: "Ich kenne keinen User mit dieser E-mail.",
				emailEmpty: "Bitte gib deine E-Mail Adresse ein.",
				NewPassword: "Neues Passwort",
				RepeatNewPassword: "Passwort wiederholen",
				NewPasswordEmpty: "Bitte gib dein neues Passwort ein.",
				NewPasswordInvalid: "Dein Passwort muss mindestens " + config.minPasswordLength +" Zeichen lang sein.",
				RequestPasswordResetInfo: "Gib deine registriere E-Mail Adresse ein. Wir schicken dir dann einen Link, mit dem du dein Passwort zurücksetzen kannst.",
				RequestPasswordResetFailed: "Es gab einen Fehler. Bitte versuche es später noch einmal.",
				PasswordResetEmailSentSuccessfully: "Ok, ich habe dir eine E-Mail geschickt, mit der du dein Passwort zurücksetzen kannst. Du kannst diese Seite jetzt schließen.",
				PasswordResetInfo: "Gib dein neues Passwort ein. Das Passwort muss mindestens " + config.minPasswordLength +" Zeichen lang sein.",
				PasswordsDontMatch: "Du musst das Passwort zweimal identisch eingeben.",
				PasswordResetFailed: "Passwort kann nicht zurückgesetzt werden.",
				BackToLogin: "Zurück zum Login",
      }
    }
  },
	components: { liquidoInput },
	props: {
		email: { type: String, required: false, default: undefined },
		resetPasswordToken: { type: String, required: false, default: undefined }
	},
	data() {
		return {
			pageTitle: this.$t("ForgotPassword"),
			store,
			// Login via email & password
			emailInputVal: this.email || "",
			emailInputState: undefined, 	// synced states from liquido-inputs
			newPasswordInput1Val: "",
			newPasswordInput1State: undefined,
			newPasswordInput2Val: "",
			newPasswordInput2State: undefined,
			resetPasswordInfoMessage: this.$t("RequestPasswordResetInfo"),
			resetPasswordErrorMessage: null,
			resetPasswordSuccessMessage: null,
			primaryActionButtonText: this.$t("RequestPasswordReset"),
		}
	},
	computed: {
		resetPasswordResetButtonDisabled() {
			return this.emailInputState !== STATE.VALID || this.resetPasswordSuccessMessage !== null
		}
	},
	
	created() {
		this.store.setHeaderTitle(this.pageTitle)
		if (this.emailInputVal && this.resetPasswordToken) {
			this.pageTitle = this.$t("ResetPassword")
			this.resetPasswordInfoMessage=this.$t("PasswordResetInfo")
			this.resetPasswordErrorMessage=null
			this.resetPasswordSuccessMessage=null
			this.primaryActionButtonText=this.$t("ResetPassword")
			this.resetPassword()
		}
		/* else {
			this.resetPasswordInfoMessage=this.$t("PasswordResetInfo"),
			this.resetPasswordErrorMessage=null,
			this.resetPasswordSuccessMessage=null,
			this.primaryActionButtonText=this.$t("RequestPasswordReset"),
		}
		*/	
	},
	mounted() {
		this.$root.scrollToTop()
	},
	methods: {

		/**
		 * Step1: Request a password reset email
		 */
		requestPasswordReset() {
			this.resetPasswordErrorMessage = null
			this.resetPasswordSuccessMessage = null
			if (this.emailInputState !== STATE.VALID) {
				this.resetPasswordErrorMessage = this.$t("needEmailToResetPassword")
				return
			}
			api.requestPasswordReset(this.emailInputVal)
				.then(() => {
					this.resetPasswordSuccessMessage = this.$t("PasswordResetEmailSentSuccessfully")
				})
				.catch(err => {
					console.log("err in client", err)
					if (err.liquidoException && err.liquidoException.liquidoErrorCode === api.err.ERROR_CODES.CANNOT_RESET_PASSWORD_EMAIL_NOT_FOUND) {
						this.resetPasswordErrorMessage = this.$t("EmailNotFound")
						return
					}
					console.error("Could not request password reset", err)
					this.resetPasswordErrorMessage = this.$t("RequestPasswordResetFailed")
				})
		},

		/**
		 * Step2: Reset password with token
		 * @param email registered email address
		 * @param resetPasswordToken one time token from the password reset email
		 */
		resetPassword() {
			this.resetPasswordErrorMessage = null
			this.resetPasswordSuccessMessage = null
			this.api.resetPassword(this.emailInputVal, this.resetPasswordToken)
				.then(() => {
					this.resetPasswordSuccessMessage = this.$t("PasswordResetEmailSentSuccessfully")
				})
				.catch(err => {
					console.error("Could not reset password with token", err)
					this.resetPasswordErrorMessage = this.$t("PasswordResetFailed")
				})
		},

		backToLogin() {
			this.$router.push({ name: "login" })
		},
	}
}
</script>

<style>

	.button-outline-liquido {
		border-color: var(--bs-border-color) !important;
	}

	.back-to-login-link {
		text-align: center; 
		font-size: 0.8rem;
		a {
			color: gray !important;
		}
	}
	
</style>
