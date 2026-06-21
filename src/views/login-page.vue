<template>
	<div>
		<liquido-header></liquido-header>

		<h1 id="login-page" class="page-title">{{ $t("Login") }}</h1>

		<div class="card loginCard m-3" id="loginCard">
			<form ref="loginForm" class="card-body p-4" autocomplete="on" @submit.prevent="submitLoginForm">

				<div class="text-center mb-3">
					<i v-if="step === 2 && webAuthnAvailable" class="fa-solid fa-fingerprint fa-3x"
						style="color: var(--primary)"></i>
					<i v-else class="fas fa-envelope fa-3x" style="color: var(--primary)"></i>
				</div>

				<!-- Email input — always visible for iOS autofill -->
				<div class="mb-3">
					<input id="loginEmailInput" ref="emailInput" v-model="emailInputVal" name="username" type="email"
						class="form-control" :class="{ 'is-invalid': emailError }" autocomplete="username" inputmode="email"
						autocapitalize="none" spellcheck="false" :placeholder="$t('emailPlaceholder')" required tabindex="1"
						@input="onEmailInput" @blur="onEmailBlur" @change="syncLoginInputs" />
				</div>

				<!-- Password input — always visible for iOS autofill -->
				<div class="mb-3">
					<input id="loginPasswordInput" ref="passwordInput" v-model="passwordInputVal" name="password"
						class="form-control" :class="{ 'is-invalid': passwordError }" type="password"
						autocomplete="current-password" :placeholder="$t('passwordPlaceholder')" tabindex="3"
						@input="onPasswordInput" @blur="onPasswordBlur" @change="syncLoginInputs" />
				</div>

				<!-- WebAuthn passkey button — hero action when available -->
				<button v-if="webAuthnAvailable" id="loginWithWebAuthnButton" type="button"
					class="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center mb-3"
					:disabled="webAuthnLoginInProgress" @click="loginWithWebAuthn" tabindex="2">
					<i class="fa-solid fa-fingerprint me-2 fa-lg"></i>
					<span>{{ $t("LoginWithPasskey") }}</span>
				</button>

				<!-- Step 1: Continue button -->
				<button v-show="step === 1" id="continueButton" type="submit" class="btn btn-primary w-100 text-center mb-3"
					:disabled="checking">
					<span v-if="checking" class="spinner-border spinner-border-sm me-2" role="status"></span>
					{{ $t("Continue") }}
				</button>

				<!-- Step 2: Login button -->
				<button v-show="step === 2" id="loginWithEmailPasswordButton" type="submit"
					:class="['btn w-100 text-center position-relative mb-3', webAuthnAvailable ? 'btn-outline-primary' : 'btn-primary']">
					<i class="fa-solid fa-sign-in-alt position-absolute top-50 start-0 translate-middle ms-3"></i>
					<span class="text-center">{{ $t("LoginWithPassword") }}</span>
				</button>

				<!-- Error Message (always below active button, reserving visual height) -->
				<div id="loginErrorMessage" class="alert alert-warning text-center mb-3 login-error-container"
					:class="{ 'invisible': !loginErrorText }" :data-loginErrorMessageId="loginErrorMessageId">
					<small>{{ loginErrorText || '&nbsp;' }}</small>
				</div>



				<!-- Alternative login methods -->
				<div id="loginExtras">

					<div class="horizontal-line">
						<span>{{ $t("orSignInWith") }}</span>
					</div>

					<div class="row mb-3">
						<div class="col">
							<button type="button"
								class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
								@click="requestEmailLoginLink">
								<i class="fa-regular fa-envelope"></i>
								<span class="flex-grow-1 text-center">{{ $t("EmailLoginLink") }}</span>
							</button>
						</div>
						<div class="col">
							<button type="button"
								class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
								@click="startGoogleOneTapLogin">
								<i class="fa-brands fa-google"></i>
								<span class="flex-grow-1 text-center">{{ $t("Google") }}</span>
							</button>
						</div>
					</div>

					<!-- div class="row">
						<div class="col">
							<button type="button" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
								@click="$router.push({ name: 'loginSms' })">
								<i class="fa-solid fa-comment-sms"></i>
								<span class="flex-grow-1 text-center">{{ $t("SMS") }}</span>
							</button>
						</div>
						<div class="col">
							<button type="button" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
								@click="startAuthyLogin">
								<i class="fa fa-shield-halved"></i>
								<span class="flex-grow-1 text-center">{{ $t("AuthyApp") }}</span>
							</button>
						</div>
					</div -->
				</div>

			</form>
		</div>

		<!-- Password forgotten Link -->
		<div class="forgot-password-link my-3">
			<router-link id="forgotPasswordLink" :to="{ name: 'forgotPassword' }">{{ $t('ForgotPassword')
			}}</router-link>
		</div>

		<!-- Register -->
		<div class="register-link my-3">
			<router-link id="RegisterLink" :to="{ name: 'welcome' }">{{ $t('Register') }}</router-link>
		</div>

		<!-- Dev login (only in development/test) -->
		<div v-if="showDevLogin" class="d-flex flex-column px-3" style="margin-top: 8rem;">
			<button type="button" class="btn btn-outline-secondary d-flex align-items-center justify-content-center"
				@click="devLoginAdmin">
				<i class="fas fa-shield-alt me-2"></i>
				<span class="flex-grow-1 text-center">{{ $t("DevLoginAdmin") }}</span>
			</button>
			<button type="button" class="btn btn-outline-secondary mt-1 d-flex align-items-center justify-content-center"
				@click="devLoginMember">
				<span class="flex-grow-1 text-center">{{ $t("DevLoginMember") }}</span>
			</button>
			<a class="btn btn-outline-secondary mt-1 d-flex align-items-center justify-content-center"
				:href="graphQlSchemaURL">
				<span class="flex-grow-1 text-center">graphql.schema</span>
			</a>
		</div>

	</div>
</template>

<script>
import config from "config"
import liquidoHeader from "@/components/liquido-header.vue"
import api from "@/services/liquido-graphql-client.js"
import teamUserJwtMock from "@/mockdata/teamUserJwt.json"
import webauthnService from "@/services/webauthn-service.js"

const EMAIL_REG_EX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,256}$/

const ERROR = {
	PASSWORD_LOGIN_FAILED: 2,
	WEB_AUTHN_LOGIN_FAILED: 3,
	GOOGLE_LOGIN_NOT_AVAILABLE: 4
}

export default {
	i18n: {
		messages: {
			de: {
				Continue: "Weiter",
				LoginWithPassword: "Login mit Passwort",
				orUsePassword: "oder mit Passwort",
				Email: "E-Mail",
				Password: "Passwort",
				emailPlaceholder: "E-Mail",
				passwordPlaceholder: "Passwort",
				emailInvalid: "Ungültige Email. Vielleicht nur vertippt?",
				emailNotFound: "Tut mir leid, ich kenne diese E-Mail nicht.",
				passwordInputIsInvalid: "Das Passwort muss mindestens 10 Zeichen haben.",
				loginFailed: "Login fehlgeschlagen. Bitte check deine E-Mail und dein Passwort.",
				changeEmail: "Andere E-Mail",

				LoginWithPasskey: "Login mit Passkey",
				WebAuthnLoginFailed: "Login mit Passkey fehlgeschlagen. Bitte versuche es noch einmal oder log dich mit deinem Passwort ein.",

				AuthyApp: "Authy App",
				Google: "Google",
				SMS: "SMS",
				EmailLoginLink: "Email Link",

				GoogleLoginCurrentlyNotAvailable: "Der Google Login ist leider gerade nicht verfügbar.",
				GoogleLoginFailed: "Google-Login fehlgeschlagen.",

				ForgotPassword: "Passwort vergessen?",
				Register: "Neu registrieren",
				orSignInWith: "oder melde dich an mit",
				DevLoginAdmin: "devLogin: Admin",
				DevLoginMember: "devLogin: Member",
			},
			en: {
				Continue: "Continue",
				LoginWithPassword: "Login with password",
				orUsePassword: "or use password",
				Email: "Email",
				Password: "Password",
				emailPlaceholder: "E-Mail",
				passwordPlaceholder: "Password",
				emailInvalid: "Invalid email. Maybe a typo?",
				emailNotFound: "I don't know this email.",
				passwordInputIsInvalid: "At least 10 characters for password.",
				loginFailed: "Login failed. Please check your email and password.",
				changeEmail: "Change email",

				LoginWithPasskey: "Login with Passkey",
				WebAuthnLoginFailed: "WebAuthn login failed. Please try again or use your password.",

				AuthyApp: "Authy App",
				Google: "Google",
				SMS: "SMS",
				EmailLoginLink: "Email Link",

				GoogleLoginCurrentlyNotAvailable: "Google Login currently not available",
				GoogleLoginFailed: "Google login failed.",

				ForgotPassword: "Forgot password?",
				Register: "Register",
				orSignInWith: "or sign in with",
				DevLoginAdmin: "devLogin: Admin",
				DevLoginMember: "devLogin: Member",
			}
		}
	},
	components: { liquidoHeader },
	props: {
		email: { type: String, required: false, default: undefined },
		emailToken: { type: String, required: false, default: undefined },
	},
	data() {
		return {
			step: 1,
			emailInputVal: "",
			emailInputTouched: false,
			passwordInputVal: "",
			passwordInputTouched: false,
			webAuthnAvailable: false,
			webAuthnLoginInProgress: false,
			checking: false,
			loginErrorMessage: undefined,
			loginErrorMessageId: undefined,
			emailError: null,
			passwordError: null,
		}
	},
	computed: {
		showDevLogin() {
			return import.meta.env.MODE === "development" || import.meta.env.MODE === "test"
		},
		graphQlSchemaURL() {
			return config.LIQUIDO_API_URL + '/graphql/schema.graphql'
		},
		emailInputIsValid() {
			return EMAIL_REG_EX.test((this.emailInputVal || "").trim())
		},
		passwordInputIsValid() {
			return (this.passwordInputVal || "").length >= 10
		},
		loginErrorText() {
			return this.emailError || this.passwordError || this.loginErrorMessage || null
		}
	},
	watch: {
		emailInputVal() {
			this.clearErrors()
			if (this.step === 2) {
				this.step = 1
				this.webAuthnAvailable = false
				this.loginErrorMessage = undefined
			}
		}
	},
	created() {
		this.$store.setHeaderTitle(this.$t("Login"))
	},
	mounted() {
		if (this.email && this.emailToken) {
			this.loginWithEMailToken()
			return
		}
		document.getElementById("loginEmailInput")?.focus()

		// Detect browser / iOS autofill which may not emit input/change events
		const onAutoFill = (e) => {
			if (e.animationName === 'onAutoFillStart') {
				this.$nextTick(() => {
					this.syncLoginInputs()
					// If email was autofilled and valid, continue to step 2 automatically
					if (this.emailInputIsValid && this.step === 1) {
						setTimeout(() => this.continueWithEmail(), 200)
					}
				})
			}
		}

		const emailEl = this.$refs.emailInput
		const passwordEl = this.$refs.passwordInput
		if (emailEl) emailEl.addEventListener('animationstart', onAutoFill, false)
		if (passwordEl) passwordEl.addEventListener('animationstart', onAutoFill, false)

		// Fallback: sync shortly after mount in case animation isn't supported
		setTimeout(() => this.syncLoginInputs(), 300)
	},
	methods: {

		// =============== Two-Step Flow ==================

		submitLoginForm() {
			this.syncLoginInputs()
			if (this.step === 1) {
				this.continueWithEmail()
			} else {
				this.loginWithEmailPassword()
			}
		},

		syncLoginInputs() {
			if (this.$refs.emailInput) this.emailInputVal = this.$refs.emailInput.value
			if (this.$refs.passwordInput) this.passwordInputVal = this.$refs.passwordInput.value
		},

		setLoginError(message, id = undefined) {
			this.loginErrorMessage = message
			this.loginErrorMessageId = id
			if (this.step === 2) {
				this.passwordError = message
			} else {
				this.emailError = message
			}
		},

		clearErrors() {
			this.emailError = null
			this.passwordError = null
			this.loginErrorMessage = null
			this.loginErrorMessageId = null
		},

		/** only validate the email input field, when it is blurred. Not while typing. */
		onEmailBlur() {
			this.emailInputTouched = true
			const email = (this.emailInputVal || "").trim()
			if (email && this.emailInputIsValid) {
				this.emailError = null	
				this.continueWithEmail()
			} else {
				this.emailError = this.$t("emailInvalid")
			}		
		},

		onEmailInput() {
			this.syncLoginInputs()
			this.clearErrors()
		},

		onPasswordInput() {
			this.syncLoginInputs()
			this.clearErrors()
		},

		onPasswordBlur() {
			this.passwordInputTouched = true
			const password = (this.passwordInputVal || "").trim()
			if (password && !this.passwordInputIsValid) {
				this.passwordError = this.$t("passwordInputIsInvalid")
			} else {
				this.passwordError = null
			}
		},

		continueWithEmail() {
			this.syncLoginInputs()
			this.emailInputTouched = true
			const email = (this.emailInputVal || "").trim()
			if (!email) return
			if (!this.emailInputIsValid) {
				this.emailError = this.$t("emailInvalid")
				return
			}
			this.clearErrors()
			this.checking = true

			api.checkLoginEmail(email)
				.then(result => {
					if (result.status === "REGISTERED") {
						this.webAuthnAvailable = !!result.webauthn
						this.step = 2
					} else {
						this.setLoginError(this.$t("emailNotFound"), ERROR.EMAIL_NOT_FOUND)
					}
				})
				.catch(() => {
					// Network error — still allow login attempt
					this.step = 2
				})
				.finally(() => {
					this.checking = false
				})
		},

		backToEmail() {
			this.step = 1
			this.webAuthnAvailable = false
			this.passwordInputVal = ""
			this.passwordInputTouched = false
			this.clearErrors()
			this.$nextTick(() => document.getElementById("loginEmailInput")?.focus())
		},

		// =============== Login with Email & Password ==================

		loginWithEmailPassword() {
			this.syncLoginInputs()
			this.emailInputTouched = true
			this.passwordInputTouched = true
			const password = (this.passwordInputVal || "").trim()
			if (!password) return
			if (!this.passwordInputIsValid) {
				this.passwordError = this.$t("passwordInputIsInvalid")
				return
			}
			this.emailError = null
			this.passwordError = null
			this.loginErrorMessage = null
			api.loginWithEmailPassword(this.emailInputVal, this.passwordInputVal)
				.then(() => this.$root.gotoTeam())
				.catch(err => {
					console.warn("Could not login with email & password", err)
					this.setLoginError(this.$t("loginFailed"), ERROR.PASSWORD_LOGIN_FAILED)
					this.passwordInputVal = ""
				})
		},

		// =============== WebAuthn Passkey Login ==================

		async loginWithWebAuthn() {
			if (!this.webAuthnAvailable || this.webAuthnLoginInProgress) return
			this.webAuthnLoginInProgress = true
			this.passwordError = null
			this.loginErrorMessage = null
			try {
				const teamData = await webauthnService.loginWithWebAuthn(this.emailInputVal)
				api.login(teamData.team, teamData.user, teamData.jwt)
				this.$root.gotoTeam()
			} catch (err) {
				console.error("WebAuthn login failed:", err)
				this.setLoginError(this.$t("WebAuthnLoginFailed"), ERROR.WEB_AUTHN_LOGIN_FAILED)
			} finally {
				this.webAuthnLoginInProgress = false
			}
		},

		// =============== Google One Tap ==================

		startGoogleOneTapLogin() {
			this.clearErrors()
			if (!document.getElementById("google-script")) {
				const script = document.createElement("script")
				script.id = "google-script"
				script.src = "https://accounts.google.com/gsi/client"
				script.onload = this.loginWithGoogleOneTap
				document.head.appendChild(script)
			} else {
				this.loginWithGoogleOneTap()
			}
		},

		loginWithGoogleOneTap() {
			if (window.google && window.google.accounts) {
				this.clearErrors()
				window.google.accounts.id.initialize({
					client_id: config.googleClientId,
					callback: this.handleGoogleOneTapResponse,
					auto_select: false,
					ux_mode: "popup",
					scope: "openid email profile"
				})
				window.google.accounts.id.prompt()
			} else {
				this.setLoginError(this.$t("GoogleLoginCurrentlyNotAvailable"), ERROR.GOOGLE_LOGIN_NOT_AVAILABLE)
			}
		},

		handleGoogleOneTapResponse(response) {
			if (response.credential) {
				api.logout()
				api.googleOneTapLogin(response.credential)
					.then(() => this.$root.gotoTeam())
					.catch(() => { this.setLoginError(this.$t("GoogleLoginFailed")) })
			} else {
				this.setLoginError(this.$t("GoogleLoginFailed"))
			}
		},

		// =============== Email Magic Link ==================

		requestEmailLoginLink() {
			this.clearErrors()
			api.logout()
			api.requestEmailLoginLink(this.emailInputVal)
				.then(() => { this.clearErrors() })
				.catch(() => { this.setLoginError(this.$t("emailNotFound")) })
		},

		loginWithEMailToken() {
			this.clearErrors()
			api.loginWithEmailToken(this.email, this.emailToken)
				.then(() => this.$root.gotoTeam())
				.catch(err => {
					console.error("Cannot login with email token", err)
					this.setLoginError(this.$t("loginFailed"))
				})
		},

		// =============== Dev Login ==================

		devLoginAdmin() {
			if (import.meta.env.MODE !== "development" && import.meta.env.MODE !== "test") return
			api.logout()
			api.devLogin(this.getDevLoginUserEmail("ADMIN"), /*teamName*/null , config.devLogin.token)
				.then(() => this.$root.gotoPolls())
				.catch(err => console.error("DevLogin Admin failed!", err))
		},

		devLoginMember() {
			if (import.meta.env.MODE !== "development" && import.meta.env.MODE !== "test") return
			api.logout()
			api.devLogin(this.getDevLoginUserEmail("MEMBER"), /*teamName*/null, config.devLogin.token)
				.then(() => this.$root.gotoPolls())
				.catch(err => console.error("DevLogin Member failed!", err))
		},

		//TODO: REMOVE THIS!  Have static devLogin.member.email!!!  And configure per env!

		getDevLoginUserEmail(role) {
			if (!config.mockBackend) {
				return role === "ADMIN" ? config.devLogin.admin.email : config.devLogin.member.email
			}
			const teamMembers = teamUserJwtMock?.team?.members || []
			const match = teamMembers.find(m => m.role === role)
			return match?.user?.email || (role === "ADMIN" ? config.devLogin.admin.email : config.devLogin.member.email)
		},
	}
}
</script>

<style>
.horizontal-line {
	text-align: center;
	margin-top: 2rem;
	margin-bottom: 2rem;
	border-bottom: 1px solid lightgrey;
	line-height: 0;
}

.horizontal-line span {
	background: white;
	color: lightgrey;
	font-size: 0.8rem;
	padding: 0 1rem;
}

.forgot-password-link,
.register-link {
	text-align: center;

	a {
		color: gray !important;
	}
}

.login-error-container {
	height: 3.5rem;
	padding: 0.25rem 1rem !important;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

/* Autofill detection: some browsers (iOS/Safari) don't emit input/change when
   they autofill. Use a tiny CSS animation on :-webkit-autofill and listen for
   the animationstart event to sync Vue's v-model with the DOM value. */
input:-webkit-autofill {
	-webkit-animation-name: onAutoFillStart;
	-webkit-animation-duration: 0.01s;
	animation-name: onAutoFillStart;
	animation-duration: 0.01s;
}

@-webkit-keyframes onAutoFillStart {
	from {}

	to {}
}

@keyframes onAutoFillStart {
	from {}

	to {}
}
</style>
