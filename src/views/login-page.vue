<template>
	<div>
		<h1 id="page-title" class="page-title">{{ pageTitle }}</h1>

		<!-- Default Login with email & password  -->
		<div class="card">
			<div class="card-body">

				<liquido-input id="loginEmailInput" v-model="emailInputVal" v-model:state="emailInputState" type="email"
					:placeholder="$t('emailPlaceholder')"
					:required=true
					:empty-feedback="$t('emailEmpty')"
					:invalid-feedback="$t('emailInvalid')"/>

				<liquido-input id="loginPasswordInput" v-model="passwordInputVal" v-model:state="passwordInputState" type="password"
					:minLength=10 :required=true
					:placeholder="$t('passwordPlaceholder')"
					:invalid-feedback="$t('passwordInputIsInvalid')"
					@keypress.enter="loginWithEmailPassword" />

				<button id="loginWithEmailPasswordButton" type="button" class="btn btn-primary w-100" @click="loginWithEmailPassword">
					{{ $t("Login") }}
				</button>

				<div v-if="loginErrorMessage" id="loginErrorMessage" class="alert alert-danger mt-3" v-html="loginErrorMessage">
				</div>

				<div class="horizontal-line my-5">
					<span>
						{{ $t("orSignInWith") }}
					</span>
				</div>

				
				<div class="row g-2">
					<div class="col">
						<!-- Signin with Google -->
						<button type="button" class="btn btn-outline-secondary w-100" @click="startGoogleLogin()">
							<i class="fa-brands fa-google position-absolute start-0 ms-3 top-50 translate-middle-y"></i> 
							{{ $t("Google") }}
						</button>
					</div>
					<div class="col">
						<!-- Signin with Authy App -->
						<button type="button" class="btn btn-outline-secondary w-100" @click="startFacebookLogin()">
							<i class="fa fa-shield-halved position-absolute start-0 ms-3 top-50 translate-middle-y"></i> {{ $t("Authy") }}
						</button>
					</div>
				</div>
				<div class="row g-2">
					<div class="col">
						<!-- Signin with Apple -->
						<button type="button" class="btn btn-outline-secondary w-100 mt-3" @click="startAppleLogin()">
							<i class="fa-brands fa-apple position-absolute start-0 ms-3 top-50 translate-middle-y"></i> {{ $t("Apple") }}
						</button>

					</div>
					<div class="col mb-2">
						<!-- signin with Telegram -->
						<button type="button" class="btn btn-outline-secondary w-100 mt-3" @click="startTelegramLogin()">
							<i class="fa-brands fa-telegram position-absolute start-0 ms-3 top-50 translate-middle-y"></i> {{ $t("Telegram") }}
						</button>
					</div>
				</div>
			

			</div>
		</div>

		<div class="forgot-password-link my-3">
			<a href="#">{{ $t('forgotPassword') }}</a>
		</div>

		<!-- Login via SMS (disabled because expensive) -->
		<b-card v-if="false" class="border-0 shadow-sm mb-4" :header="$t('LoginViaSms')">
			<p>{{ $t('LoginViaSmsInfo') }}</p>
			<liquido-input id="mobilephoneInput" v-model="mobilephone" v-model:state="mobilephoneInputState"
				type="mobilephone" class="mb-3" :label="$t('yourMobilephone')" :placeholder="$t('mobilephonePlaceholder')"
				:invalid-feedback="$t('mobilephoneInvalid')" />
			<div class="text-end">
				<button id="requestTokenButton" :disabled="requestTokenButtonDisabled" class="btn btn-primary"
					@click="requestAuthToken">
					<div v-if="waitUntilNextRequestSecs > 0">
						{{ $t('TokenSent') }}&nbsp;<b-spinner small />
					</div>
					<div v-else>
						{{ $t('RequestTokenButton') }}
					</div>
				</button>
			</div>
			<b-collapse v-model="tokenSentSuccessfully" class="mt-3">
				<liquido-input id="authTokenInput" v-model="twillioAuthToken" v-model:state="authTokenInputState" type="text"
					placeholder="<123456>" class="mb-3" :label="$t('AuthTokenLabel')"
					:invalid-feedback="$t('authTokenInputInvalid')" :minLength=6 :maxLength=6 :required="true"
					:show-counter="true"></liquido-input>
			</b-collapse>
			<div v-if="tokenSentSuccessfully && !tokenErrorMessage" id="tokenSuccessMessage" class="alert alert-success mt-3">
				{{ $t("AuthtokenSentSuccessfully") }}
			</div>
			<div v-if="tokenErrorMessage" id="tokenErrorMessage" class="alert alert-danger mt-3" v-html="tokenErrorMessage">
			</div>
		</b-card>


		<!-- Register as a new user -->

		<div class="d-flex justify-content-center mt-5 px-3" style="max-width: 540px; margin: 0 auto;">
			<button id="registerButton" type="button" class="btn btn-outline-secondary w-100" @click="clickRegister()">
				<i class="fa-solid fa-user-plus me-2"></i> {{ $t("Register") }}
			</button>
		</div>

		<div v-if="showDevLogin" class="d-flex flex-column px-3" style="margin-top: 8rem;">
			<button type="button" class="btn btn-outline-secondary " @click="devLoginAdmin">
				<i class="fas fa-shield-alt"></i> {{ $t("DevLoginAdmin") }}
			</button>
			<button type="button" class="btn btn-outline-secondary mt-1" @click="devLoginMember">
				{{ $t("DevLoginMember") }}
			</button>
		</div>

	</div>
</template>

<script>
import config from "config"
import liquidoInput, { STATE } from "@/components/liquido-input.vue"
import api from "@/services/liquido-graphql-client.js"
import { store }  from "@/services/store.js"
//TODO: import WebAuthn from "@/services/quarkus-webauthn.js"

const REQUEST_THROTTLE_SECS = 10

export default {
  i18n: {
    messages: {
      de: {      
				emailPlaceholder: "Deine E-Mail",
        passwordPlaceholder: "Passwort",
        emailInvalid: "Ungültige Email. Vielleicht nur vertippt?",
				emailEmpty: "Bitte gib deine E-Mail Adresse ein.",
				passwordInputIsInvalid: "Passwort falsch. (Mindestens 10 Zeichen.)",
				loginFailed: "Login fehlgeschlagen. Bitte überprüfe deine E-Mail und dein Passwort.",
				
        RequestTokenButton: "Login-Token anfordern",
        TokenSent: "SMS verschickt ...",
        AuthTokenLabel: "Login-Token aus SMS",
        authTokenInputInvalid: "Der Login-Token hat genau sechs Ziffern.",
        MobilephoneNotFound: "Tut mir leid, ich kenne diese Telefonnummer in LIQUIDO nicht. Bitte <a href='/'>registriere dich zuerst.</a>",
        TokenInvalid: "Der eingegebene Login-Token wurde nicht akzeptiert. Hast du dich vielleicht einfach nur vertippt? Bitte versuche es noch einmal.",
        AuthtokenSentSuccessfully: "Ok, die SMS wurde verschickt. Bitte gib den Login-Token aus der SMS ein.",
        RequestAuthTokenError: "Login-Token konnte nicht angefordert werden. Bitte versuche es noch einmal.",
        
        EmailSentSuccessfully: "Ok, ich habe dir eine Email mit einem Code geschickt.",
        CouldNotSendEmail: "Es gab ein Problem beim Verschicken der E-Mail. Bitte versuche es später noch einmal.",
        UserWithThatEmailNotFound: "Tut mir leid, ich kenne niemanden mit dieser E-Mail Adresse. Möchtest du dich <a href='/welcome'>zuerst registrieren</a>?",
        orSignInWith: "oder melde dich an mit",
				Google: "Google",
        Facebook: "Facebook",
        Apple: "Apple",
        Telegram: "Telegram",
        LoginViaSms: "SMS Login",
        LoginViaSmsInfo: "Ich schicke dir einen Zahlencode auf dein Handy. Mit diesem kannst du dich dann hier einloggen.",

        forgotPassword: "Passwort vergessen?",
				Register: "Registrieren",
        DevLoginAdmin: "devLogin: Admin",
        DevLoginMember: "devLogin: Member",
        EmailTokenInvalid: "Der eingegebene E-Mail-Token ist ungültig.",
        GoogleLoginFailed: "Google-Login fehlgeschlagen."
      }
    }
  },
	components: { liquidoInput },
	props: {
		// These props are set from URL parameters, e.g. when user logs in via the email link
		email: { type: String, required: false, default: undefined },
		emailToken: { type: String, required: false, default: undefined },
	},
	data() {
		return {
			pageTitle: this.$t("Login"),
			store,
			// Login via email & password
			emailInputVal: "",
			emailInputState: undefined, 	// synced states from liquido-inputs
			passwordInputVal: "",
			passwordInputState: null,
			loginErrorMessage: undefined,

			// Forgot password -> send email with token
			emailSentSuccessfully: false,
			emailErrorMessage: undefined,
			emailCode: undefined,

			// auth token (via SMS)
			mobilephone: "",
			twillioAuthToken: undefined,		// twilio authToken from SMS 
			mobilephoneInputState: null,    // synced states from liquido-inputs
			authTokenInputState: null,      // synced states from liquido-inputs
			waitUntilNextRequestSecs: 0,    // Throttling: Only allow request auth token once every few seconds
			tokenSentSuccessfully: false,  	// token request returned success from backend. SMS should have been sent successfully
			tokenErrorMessage: undefined,   // we show different error messages, depending on error code from backend

			//TODO: count failed login attempts and then offer additional help
		}
	},
	computed: {
		showDevLogin() {
			return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
		},
		requestTokenButtonDisabled() {
			return this.mobilephoneInputState !== true || this.waitUntilNextRequestSecs > 0
		},
		adminEmail() {
			return config.devLogin.admin.email
		}
	},
	watch: {
		/** UX: When auth token format is valid, then immideately try to login with it. No extra "login" button step. */
		authTokenInputState: function(newVal) {
			if (newVal === true) {
				this.loginWithAuthToken()
			}
		}
	},
	created() {
		this.store.setHeaderTitle(this.pageTitle)

		/*
		console.debug("Initializing WebAuthn: " + config.LIQUIDO_API_URL + "/q/webauthn")
		this.webauthn = new WebAuthn({
			callbackPath: config.LIQUIDO_API_URL + '/q/webauthn/callback',
      registerPath: config.LIQUIDO_API_URL + '/q/webauthn/register',
      loginPath:    config.LIQUIDO_API_URL + '/q/webauthn/login'
		})
		*/
	},
	mounted() {

		this.$root.scrollToTop()

		// if email and token is passed, then log in user
		if (this.email && this.emailToken) {
			this.loginWithEMailToken()
		}

		//TODO: When user is already logged in (JWT from local storage), THEN show a "welcome back" message. User can jump to his team.
	},
	methods: {

		loginWithEmailPassword() {
			this.loginErrorMessage = null
			//BUFIX: When password is auto filled, then state is not valid.   if (this.emailInputState !== STATE.VALID || this.passwordInputState !== STATE.VALID) return	
			api.loginWithEmailPassword(this.emailInputVal, this.passwordInputVal)
				.then(() => {
					this.$router.push({name: "teamHome"})
				})
				.catch(err => {
					console.warn("Clould not login with email & password", err)
					this.loginErrorMessage = this.$t("loginFailed") 
				})
		},



		/** 
		 * Start the google login process only after the user clicked the Google button.
		 * Dynamically load the google-script and call the google login function.
		 */
		startGoogleLogin() {
			if (!document.getElementById("google-script")) {
				console.log("loading google script")
        const script = document.createElement("script");
        script.id = "google-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = this.loginWithGoogle; // Call login after script loads
        document.head.appendChild(script);
      } else {
        this.loginWithGoogle(); // If script is already loaded, start login
      }
		},

		/**
		 * Login with Google. This is called after the google script has been loaded.
		 */
		loginWithGoogle() {
			if (window.google && window.google.accounts) {
				window.google.accounts.id.initialize({
					client_id: config.googleClientId,
					login_uri: config.LIQUIDO_API_URL + "/auth/google",
					callback: this.handleGoogleResponse,
					auto_select: false,
					ux_mode: "redirect",
					scope: "openid email profile"
				});
				window.google.accounts.id.prompt(); // Show the Google login prompt
			} else {
				console.error("Google accounts not available")
			}
		},

		handleGoogleResponse(response) {
			console.log("Google login response", response)
			if (response.credential) {
				this.tokenErrorMessage = undefined
				api.logout()
				api.loginWithGoogle(response.credential)
					.then(() => {
						this.$router.push({name: "teamHome"})
					})
					.catch(err => {
						console.error("Google login failed", err)
						this.tokenErrorMessage = this.$t("GoogleLoginFailed")
					})
			} else {
				console.error("No credential in Google login response")
				this.tokenErrorMessage = this.$t("GoogleLoginFailed")
			}
		},

		/** Quickly login as an admin user. This is available as a button in the mobile UI when in DEV env.  */
		devLoginAdmin() {
			api.logout()
			api.devLogin(config.devLogin.admin.email, config.devLogin.teamName, config.devLogin.token).then(() => {
				this.$router.push({name: "polls"})
			}).catch(err => console.error("DevLogin Admin failed!", err))
		},

		/** Quickly login as a team member. This is available as a button in the mobile UI when in DEV env.  */
		devLoginMember() {
			api.logout()
			api.devLogin(config.devLogin.member.email, config.devLogin.teamName, config.devLogin.token)
				.then(() => {
					this.$router.push({name: "polls"})
				})
				.catch(err => console.error("DevLogin Member failed!", err))
		},

		// =============== WebAuthn FaceID ==================
		/*
		registerWebauthn() {
			console.log("webauthn.register: " + config.devLogin.admin.email)
			this.webauthn.register({
				name: config.devLogin.admin.email,
				displayName: config.devLogin.admin.name
			})
			.then(body => {
				console.log("WebAuthn: registered successfully", body)
			})
			.catch(err => {
				console.error("WebAuthn Rregistration failed"+JSON.stringify(err))
			})
		},
		*/


		// =============== login via Twillio (SMS) authToken ==================

		/** 
		 * Request a on time token for authentication. 
		 * Be nice to our backend API. We only allow this request once every n seconds.
		 */
		requestAuthToken() {
			if (this.waitUntilNextRequestSecs > 0) return
			this.waitUntilNextRequestSecs = REQUEST_THROTTLE_SECS

			let requestThrottler = setInterval(() => {
				if (this.waitUntilNextRequestSecs > 0) {
					this.waitUntilNextRequestSecs--
				} else {
					clearInterval(requestThrottler)
					this.waitUntilNextRequestSecs = 0
				}
			}, 1000);

			api.logout()
			this.twillioAuthToken = undefined
			this.tokenErrorMessage = undefined
			this.emailErrorMessage = undefined
			// WHEN testUser loggs in, THEN also send devLoginToken, so that backend fakes the request and will not call Twilio.
			let devLoginToken = this.mobilephone === config.devLogin.admin.mobilephone ? config.devLogin.token : undefined
			console.debug("requestAuthToken for", this.mobilephone, devLoginToken)

			api.requestAuthToken(this.mobilephone, devLoginToken)
				.then(res => {
					console.debug("Auth token requested successfull.", res)
					this.tokenSentSuccessfully = true
					this.tokenErrorMessage = undefined
				})
				.catch(err => {
					if (err.response &&
							err.response.data &&
							err.response.data.liquidoErrorCode === api.err.CANNOT_LOGIN_MOBILE_NOT_FOUND) {
						this.waitUntilNextRequestSecs = 0
						this.tokenSentSuccessfully = false
						this.tokenErrorMessage = this.$t("MobilephoneNotFound")
					} else {
						console.error("Cannot requestAuthToken", err)
						this.waitUntilNextRequestSecs = 1
						this.tokenSentSuccessfully = false
						this.tokenErrorMessage = this.$t("RequestAuthTokenError")
					}
				})
		},

		/**
		 * Login with the autoToken that the user has received and
		 * that he has manually entered. (2FA)
		 */
		loginWithAuthToken() {
			this.tokenErrorMessage = undefined
			api.loginWithAuthToken(this.mobilephone, this.twillioAuthToken)
				.then(() => {
					this.$router.push({name: "teamHome"})
				})
				.catch(err => {
					// Show a human readable error message
					console.error("Entered auth token is not valid", err)
					this.tokenErrorMessage = this.$t("TokenInvalid") 
				})
		},



		// ============== Login via Email =================


		/** Send a magic link that the user can login with for the next n hours. */
		sendForgotPasswordMail() {
			// Email login button might be disabled, when the email is not valid yet.
			// But the button is never shown as disabled for non logicall beautiful UX/UI reasons. :-)
			// So we check here if the current value of the liquido-input is actually valid.
			if (this.emailInputState !== true) return  
			console.log("requestEmailToken")
			this.tokenErrorMessage = undefined
			this.emailErrorMessage = undefined
			api.logout()  					// delete any previously stored JWT
			api.requestEmailToken(this.emailInput)
				.then(() => {
					console.log("Email login link sent successfully")
					this.emailErrorMessage = undefined
					this.emailSentSuccessfully = true
				})
				.catch(err => {
					//this.$root.scrollToBottom()
					if (err.response &&	
							err.response.data &&
							err.response.data.liquidoErrorCode === api.err.CANNOT_LOGIN_EMAIL_NOT_FOUND) 
					{
						//TODO: ask user if he wants to register
						console.log("There is no user with email: "+this.emailInput)
						this.emailSentSuccessfully = false
						this.emailErrorMessage = this.$t("UserWithThatEmailNotFound")
					} else {
						console.error("Could not send email link!", err)
						this.emailSentSuccessfully = false
						this.emailErrorMessage = this.$t("CouldNotSendEmail")
					}
				})
		},

		/**
		 * Login with authToken from E-Mail.
		 * This is called directly, when query parameters are passed.
		 */
		loginWithEMailToken() {
			this.tokenErrorMessage = undefined
			this.emailErrorMessage = undefined
			api.loginWithEmailToken(this.email, this.emailToken)   
				.then(() => {
					this.$router.push({name: "teamHome"})
				})
				.catch(err => {
					console.error("Cannot login with email token", err)
					this.tokenSentSuccessfully = false
					this.tokenErrorMessage = undefined
					this.emailErroMessage = this.$t("EmailTokenInvalid")
				})
		},



		/** Register button at the bottom of the page */
		clickRegister() {
			this.$router.push({name: "welcome"})
		}
	}
}
</script>

<style>

	.button-outline-liquido {
		border-color: var(--bs-border-color) !important;
	}

	.horizontal-line {
		text-align: center; border-bottom: 1px solid lightgrey; 
		line-height: 0;
	}
	.horizontal-line span {
		background: white; 
		color: lightgrey; 
		font-size: 0.8rem; 
		padding: 0 1rem;
	}

	.forgot-password-link {
		text-align: center; 
		font-size: 0.8rem;
		a {
			color: gray !important;
		}
	}

	/* exctly the same margin-top as our liquido-input */
	#loginWithEmailPasswordButton {
		margin-top: 12px;  
	}
	
</style>
