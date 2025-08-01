<template>
	<div>
		<h1 id="forgot-password-page" class="page-title">{{ pageTitle }}</h1>

		<!-- Step1: Request password reset -->
		<div class="card" v-if="!resetPasswordToken">
			<div class="card-body">

				<p class="text-center">{{ $t('RequestPasswordResetInfo') }}</p>

				<liquido-input
				  id="emailInput"
					v-model="emailInputVal"
					v-model:state="emailInputState"
					type="email"
					:placeholder="$t('emailPlaceholder')"
					:required=true
					:empty-feedback="$t('emailEmpty')"
					:feedback-placehoder=true
					:invalid-feedback="$t('emailInvalid')"/>

				<div id="requestPasswordResetErrorMessage" class="alert alert-danger" v-if="requestPasswordResetErrorMessage">
					{{ resetPasswordErrorequestPasswordResetErrorMessagerMessage }}
				</div>

				<div id="requestPasswordResetSuccessMessage" class="alert alert-success" v-if="requestPasswordResetSuccessMessage">
					{{ requestPasswordResetSuccessMessage }}
				</div>	

				<button id="requestPasswordResetButton" type="button" class="btn btn-primary my-3 w-100" 
					@click="requestPasswordReset"
					:disabled="requestPasswordResetButtonDisabled">
					{{ $t('SendMail') }}
				</button>
			</div>
		</div>

		<!-- Step2: Reset password with token-->
		<div class="card" v-if="resetPasswordToken">
			<div class="card-body">

				<p class="text-center">Reset password for</p>
				<p class="text-center">{{ email }}</p>

				<liquido-input
					id="newPasswordInput1" 
					v-model="newPasswordInput1Val" 
					v-model:state="newPasswordInput1State" 
					:placeholder="$t('NewPassword')"
					:required=true
					:min-length=minPasswordLength
					:empty-feedback="$t('NewPasswordEmpty')"
					:feedback-placehoder=true
					:invalid-feedback="$t('NewPasswordInvalid')"
					type="password"
				/>

				<liquido-input
					id="newPasswordInput2" 
					v-model="newPasswordInput2Val" 
					v-model:state="newPasswordInput2State" 
					:validFunc="newPasswordInput2ValidFunc"
					:placeholder="$t('RepeatNewPassword')"
					:required=true
					:min-length=minPasswordLength
					:empty-feedback="$t('NewPasswordEmpty')"
					:feedback-placehoder=true
					:invalid-feedback="$t('SecondPasswordInvalid')"
					type="password"
				/>

				<div id="resetPasswordErrorMessage" class="alert alert-danger" v-if="resetPasswordErrorMessage">
					{{ resetPasswordErrorMessage }}
				</div>

				<div id="resetPasswordSuccessMessage" class="alert alert-success" v-if="resetPasswordSuccessMessage">
					{{ resetPasswordSuccessMessage }}
				</div>	

				<button id="resetPasswordButton" type="button" class="btn btn-primary my-3 w-100" 
					@click="clickResetPasswordButton"
					:disabled="resetPasswordButtonDisabled">
					{{ primaryActionButtonText }}
				</button>
			</div>
		</div>
	
		<div class="back-to-login-link my-5">
			<router-link :to="{ name: 'login' }">{{ $t('BackToLogin') }}</router-link>
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
				// Step 1: Request password reset      
				ForgotPassword: "Passwort vergessen",
				ResetPassword: "Passwort zurücksetzen",
				RequestPasswordResetInfo: "Passwort vergessen? Kein Problem. Gib deine registriere E-Mail Adresse ein. Wir schicken dir dann einen Link, mit dem du dein Passwort zurücksetzen kannst.",
				SendMail: "Mail schicken",
				emailPlaceholder: "Deine E-Mail",
        emailInvalid: "Ungültige Email. Vielleicht nur vertippt?",
				emailNotFound: "Ich kenne keinen User mit dieser E-mail.",
				emailEmpty: "Bitte gib deine E-Mail Adresse ein.",

				// Step 2: Reset password with token
				NewPassword: "Neues Passwort",
				RepeatNewPassword: "Passwort wiederholen",
				NewPasswordEmpty: "Bitte gib dein neues Passwort ein.",
				NewPasswordInvalid: "Dein Passwort muss mindestens " + config.minPasswordLength +" Zeichen lang sein.",
				SecondPasswordInvalid: "Die beiden Passwörter müssen identisch sein.",
				WontResetPassword: "Kann Passwort nicht zurücksetzen. Diese E-Mail Adresse ist nicht registriert.",
				RequestPasswordResetFailed: "Es gab einen Fehler. Bitte versuche es später noch einmal.",
				PasswordResetEmailSentSuccessfully: "Ok, ich habe dir eine E-Mail geschickt, mit der du dein Passwort zurücksetzen kannst. Du kannst diese Seite jetzt schließen.",
				PasswordResetInfo: "Gib dein neues Passwort ein. Das Passwort muss mindestens " + config.minPasswordLength +" Zeichen lang sein.",
				PasswordsDontMatch: "Du musst das Passwort zweimal identisch eingeben.",
				PasswordResetSuccessful: "Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt mit deinem neuen Passwort einloggen.",
				PasswordResetFailed: "Passwort kann nicht zurückgesetzt werden.",
				BackToLogin: "Zurück zum Login",
      }
    }
  },
	components: { liquidoInput },
	data() {
		return {
			pageTitle: this.$t("ForgotPassword"),
			store,
			
			// Step1: Request password reset
			emailInputVal: this.$route.query.email || null,
			emailInputState: undefined, 	// synced states from liquido-inputs
			requestPasswordResetErrorMessage: null,
			requestPasswordResetSuccessMessage: null,

			// Step 2: Reset password with token
			email: this.$route.query.email || null, // email from the reset password email, if available
			resetPasswordToken: this.$route.query.resetPasswordToken || null, // token from the reset password email, if available
			
			minPasswordLength: config.minPasswordLength,
			newPasswordInput1Val: "",
			newPasswordInput1State: undefined,
			newPasswordInput2Val: "",
			newPasswordInput2State: undefined,
			resetPasswordErrorMessage: null,
			resetPasswordSuccessMessage: null,
			primaryActionButtonText: this.$t("RequestPasswordReset"),
		}
	},
	computed: {
		requestPasswordResetButtonDisabled() {
			return this.emailInputState !== STATE.VALID || this.resetPasswordSuccessMessage !== null
		},

		resetPasswordButtonDisabled() {
			return this.newPasswordInput1State !== STATE.VALID || this.newPasswordInput2State !== STATE.VALID
		}

	},
	
	created() {
		if (this.email && this.resetPasswordToken) {
			this.store.setHeaderTitle(this.ForgotPassword)
			this.pageTitle = this.$t("ResetPassword")
			this.emailInputVal = this.email
			this.resetPasswordErrorMessage=null
			this.resetPasswordSuccessMessage=null
			this.primaryActionButtonText=this.$t("ResetPassword")
			//this.resetPassword()
		}
		else {
			this.store.setHeaderTitle(this.ForgotPassword)
			this.pageTitle = this.$t("ForgotPassword")
			this.resetPasswordSuccessMessage=null
			this.resetPasswordErrorMessage=null
			this.primaryActionButtonText=this.$t("RequestPasswordReset")
		}
	},
	mounted() {
		this.$root.scrollToTop()
	},
	methods: {
		
		/**
		 * Step1: Request a password reset email
		 */
		requestPasswordReset() {
			this.requestPasswordResetErrorMessage = null
			this.requestPasswordResetSuccessMessage = null
			if (this.emailInputState !== STATE.VALID) {
				this.resetPasswordErrorMessage = this.$t("needEmailToResetPassword")
				return
			}
			api.requestPasswordReset(this.emailInputVal)
				.then(() => {
					this.requestPasswordResetSuccessMessage = this.$t("PasswordResetEmailSentSuccessfully")
				})
				.catch(err => {
					console.log("err in client", err)
					if (err.liquidoException && err.liquidoException.liquidoErrorCode === api.err.WONT_RESET_PASSWORD) {
						this.resetPasswordErrorMessage = this.$t("WontResetPassword")
						return
					}
					console.error("Could not request password reset", err)
					this.resetPasswordErrorMessage = this.$t("RequestPasswordResetFailed")
				})
		},

		clickResetPasswordButton() {
			if (this.primaryActionButtonText == this.$t("BackToLogin")) {
				this.$router.push({ name: "login" })
			} else {
				this.resetPassword()
			}
		},

		/**
		 * Step2: Reset password with token
		 * @param email registered email address
		 * @param resetPasswordToken one time token from the password reset email
		 */
		resetPassword() {
			this.resetPasswordErrorMessage = null
			this.resetPasswordSuccessMessage = null
			api.resetPassword(this.email, this.resetPasswordToken, this.newPasswordInput1Val)
				.then(() => {
					this.resetPasswordSuccessMessage = this.$t("PasswordResetSuccessful")
					this.primaryActionButtonText = this.$t("BackToLogin")
				})
				.catch(err => {
					console.error("Could not reset password with token", err)
					this.resetPasswordErrorMessage = this.$t("PasswordResetFailed")
				})
		},

		newPasswordInput2ValidFunc() {
			return this.newPasswordInput1Val === this.newPasswordInput2Val
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
