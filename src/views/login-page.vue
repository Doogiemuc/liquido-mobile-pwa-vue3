<template>
	<div>
		<h1 id="login-page" class="page-title">{{ pageTitle }}</h1>

		<!-- Default Login with email & password  -->
		<div class="card">
			<div class="card-body">
				
				<div class="text-center my-3">
					<i class="fas fa-user-circle fa-3x" style="color: var(--primary)"></i>
				</div>

				<liquido-input id="loginEmailInput" v-model="emailInputVal" v-model:state="emailInputState" type="email"
					:required=true
					:placeholder="$t('emailPlaceholder')"
					:empty-feedback="$t('emailEmpty')"
					:invalid-feedback="$t('emailInvalid')"
					:feedback-placeholder="true"/>

				<liquido-input id="loginPasswordInput" v-model="passwordInputVal" v-model:state="passwordInputState" type="password"
					:minLength=10 
					:required=true
					:placeholder="$t('passwordPlaceholder')"
					:empty-feedback="$t('passwordInputIsEmpty')"
					:invalid-feedback="$t('passwordInputIsInvalid')"
					:feedback-placeholder="true"
					@keypress.enter="loginWithEmailPassword" />

				<button id="loginWithEmailPasswordButton" 
					type="button" 
					class="btn btn-primary w-100 text-center position-relative" 
					:disabled="loginWithEmailPasswordButtonDisabled"
					@click="loginWithEmailPassword">
					<i class="fa-solid fa-sign-in-alt position-absolute top-50 start-0 translate-middle ms-3"></i>
					<span class="text-center">{{ $t("Login") }}</span>
				</button>

				<div v-if="loginErrorMessage" id="loginErrorMessage" class="alert alert-danger mt-3">
					{{ loginErrorMessage }}
				</div>

				

				<div class="horizontal-line my-5">
					<span>
						{{ $t("orSignInWith") }}
					</span>
				</div>


				
				<div class="row g-2">
					<div class="col">
						<!-- Signin with Google -->
						<button type="button" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center" @click="startGoogleOneTapLogin">
							<i class="fa-brands fa-google"></i>
							<span class="flex-grow-1 text-center">{{ $t("Google") }}</span>
						</button>
					</div>
					<div class="col">
						<!-- Signin with Authy App -->
						<button type="button" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center" @click="startFacebookLogin">
							<i class="fa fa-shield-halved"></i>
							<span class="flex-grow-1 text-center">{{ $t("AuthyApp") }}</span>
						</button>
					</div>
				</div>
				<div class="row g-2">
					<div class="col">
						<!-- Signin with Apple -->
						<button type="button" class="btn btn-outline-secondary w-100 mt-3 d-flex align-items-center justify-content-center" @click="startAppleLogin">
							<i class="fa-brands fa-apple"></i>
							<span class="flex-grow-1 text-center">{{ $t("Apple") }}</span>
						</button>

					</div>
					<div class="col mb-2">
						<!-- signin with Telegram -->
						<button type="button" class="btn btn-outline-secondary w-100 mt-3 d-flex align-items-center justify-content-center" @click="startTelegramLogin">
							<i class="fa-brands fa-telegram"></i>
							<span class="flex-grow-1 text-center">{{ $t("Telegram") }}</span>
						</button>
					</div>
				</div>
			

			</div>
		</div>

		<!-- Password forgotten Link -->
		<div class="forgot-password-link my-3">
			<router-link id="forgotPasswordLink" :to="{ name: 'forgotPassword' }">{{ $t('ForgotPassword') }}</router-link>
		</div>

		<!-- Login via SMS (disabled because sending SMS is expensive :-( -->
		<div v-if="false" class="card border-0 shadow-sm mb-4">
			<div class="card-header">
				{{ $t("LoginViaSms") }}
			</div>
			<div class="card-body">
				<p>{{ $t('LoginViaSmsInfo') }}</p>
				<liquido-input id="mobilephoneInput" v-model="mobilephone" v-model:state="mobilephoneInputState"
					type="mobilephone" class="mb-3" :label="$t('yourMobilephone')" :placeholder="$t('mobilephonePlaceholder')"
					:invalid-feedback="$t('mobilephoneInvalid')" />
				<div class="text-end">
					<button id="requestTokenButton" :disabled="requestTokenButtonDisabled" class="btn btn-primary"
						@click="requestAuthToken">
						<div v-if="waitUntilNextRequestSecs > 0">
							{{ $t('TokenSent') }}&nbsp;<div class="spinner-border spinner-border-sm" role="status"></div>
						</div>
						<div v-else>
							{{ $t('RequestTokenButton') }}
						</div>
					</button>
				</div>
				
				<liquido-input id="authTokenInput" 
					v-model="twillioAuthToken" 
					v-model:state="authTokenInputState" 
					type="text"
					placeholder="<123456>" 
					class="mb-3" 
					:label="$t('AuthTokenLabel')"
					:invalid-feedback="$t('authTokenInputInvalid')"
					:disabled="!tokenSentSuccessfully"
					:minLength=6 :maxLength=6 :required="true"
					:show-counter="true">
				</liquido-input>
				
				<div v-if="tokenSentSuccessfully && !tokenErrorMessage" id="tokenSuccessMessage" class="alert alert-success mt-3">
					{{ $t("AuthtokenSentSuccessfully") }}
				</div>
				<div v-if="tokenErrorMessage" id="tokenErrorMessage" class="alert alert-danger mt-3">
					{{ tokenErrorMessage }}
				</div>
			</div>
		</div>

		<!-- Register as a new user -->
		<div class="d-flex justify-content-center mt-5 px-3" style="max-width: 540px; margin: 0 auto;">
			<button id="registerButton" type="button" class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center" @click="clickRegister()">
				<i class="fa-solid fa-user-plus me-2"></i>
				<span class="flex-grow-1 text-center">{{ $t("Register") }}</span>
			</button>
		</div>

		<div v-if="showDevLogin" class="d-flex flex-column px-3" style="margin-top: 8rem;">
			<!-- quick links only for development -->
			<button type="button" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" @click="devLoginAdmin">
				<i class="fas fa-shield-alt me-2"></i>
				<span class="flex-grow-1 text-center">{{ $t("DevLoginAdmin") }}</span>
			</button>
			<button type="button" class="btn btn-outline-secondary mt-1 d-flex align-items-center justify-content-center" @click="devLoginMember">
				<span class="flex-grow-1 text-center">{{ $t("DevLoginMember") }}</span>
			</button>
			<a class="btn btn-outline-secondary mt-1 d-flex align-items-center justify-content-center" 
				:href="graphQlSchmeaURL">
				<span class="flex-grow-1 text-center">graphql.schemea</span>
			</a>
		</div>

	</div>
</template>

<script>
import config from "config"
import liquidoInput, { STATE } from "@/components/liquido-input.vue"
import api from "@/services/liquido-graphql-client.js"
//TODO: import WebAuthn from "@/services/quarkus-webauthn.js"

const REQUEST_THROTTLE_SECS = 10

export default {
  i18n: {
    messages: {
			de: {      
				emailPlaceholder: "E-Mail",
				passwordPlaceholder: "Passwort",
				emailInvalid: "Ungültige Email. Vielleicht nur vertippt?",
				emailEmpty: "Bitte gib deine E-Mail Adresse ein.",
				passwordInputIsInvalid: "Mindestens 10 Zeichen.",
				passwordInputIsEmpty: "Bitte gib dein Passwort ein.",
				loginFailed: "Login fehlgeschlagen. Bitte überprüfe deine E-Mail und dein Passwort.",

				// Password reset
				needEmailToResetPassword: "Bitte gib oben deine E-Mail Adresse ein, damit ich dir einen Link zum Zurücksetzen deines Passworts schicken kann.",
				PaswordResetEmailSentSuccessfully: "Ok, ich habe dir eine E-Mail geschickt, mit der du dein Passwort zurücksetzen kannst. Du kannst diese Seite jetzt schließen.",

				// Login via Magic Email Link
				RequestTokenButton: "Login-Token anfordern",
				TokenSent: "SMS verschickt ...",
				AuthTokenLabel: "Login-Token aus SMS",
				authTokenInputInvalid: "Der Login-Token hat genau sechs Ziffern.",
				MobilephoneNotFound: "Tut mir leid, ich kenne diese Telefonnummer in LIQUIDO nicht. Bitte <a href='/'>registriere dich zuerst.</a>",
				TokenInvalid: "Der eingegebene Login-Token wurde nicht akzeptiert. Hast du dich vielleicht einfach nur vertippt? Bitte versuche es noch einmal.",
				AuthtokenSentSuccessfully: "Ok, die SMS wurde verschickt. Bitte gib den Login-Token aus der SMS ein.",
				RequestAuthTokenError: "Login-Token konnte nicht angefordert werden. Bitte versuche es noch einmal.",

				// Google Login
				GoogleLoginCurrentlyNotAvailable: "Der Google Login ist leider gerade nicht verfügbar.",

				EmailSentSuccessfully: "Ok, ich habe dir eine Email mit einem Code geschickt.",
				CouldNotSendEmail: "Es gab ein Problem beim Verschicken der E-Mail. Bitte versuche es später noch einmal.",
				UserWithThatEmailNotFound: "Tut mir leid, ich kenne niemanden mit dieser E-Mail Adresse. Möchtest du dich <a href='/welcome'>zuerst registrieren</a>?",
				orSignInWith: "oder melde dich an mit",
				AuthyApp: "Authy App",
				Google: "Google",
				Facebook: "Facebook",
				Apple: "Apple",

				Telegram: "Telegram",
				LoginViaSms: "SMS Login",
				LoginViaSmsInfo: "Ich schicke dir einen Zahlencode auf dein Handy. Mit diesem kannst du dich dann hier einloggen.",

				ForgotPassword: "Passwort vergessen?",
				Register: "Neu registrieren",
				DevLoginAdmin: "devLogin: Admin",
				DevLoginMember: "devLogin: Member",
				EmailTokenInvalid: "Der eingegebene E-Mail-Token ist ungültig.",
				GoogleLoginFailed: "Google-Login fehlgeschlagen.",

				// WebAuthn translations (DE)
				webauthnRegisterPrompt: "Face ID / Fingerabdruck registrieren",
				webauthnAuthPrompt: "Mit Face ID / Fingerabdruck bestätigen",
				webauthnSuccess: "Authentifizierung erfolgreich. Weiterleitung...",
				webauthnFailure: "Authentifizierung fehlgeschlagen. Bitte versuche es erneut.",
				webauthnUnsupported: "Dein Gerät/Browser unterstützt keine biometrische Authentifizierung.",
				webauthnStarting: "Starte Authentifizierungsgerät...",
				webauthnWaitingForDevice: "Bitte bestätige die Aktion auf deinem Gerät.",
				webauthnRegisterTitle: "WebAuthn Registrierung",
				webauthnAuthTitle: "WebAuthn Bestätigung"
			},
			en: {
				emailPlaceholder: "E-Mail",
				passwordPlaceholder: "Password",
				emailInvalid: "Invalid email. Maybe a typo?",
				emailEmpty: "Please enter your email address.",
				passwordInputIsInvalid: "At least 10 characters.",
				passwordInputIsEmpty: "Please enter your password.",
				loginFailed: "Login failed. Please check your email and password.",
				orSignInWith: "or sign in with",
				Google: "Google",
				Facebook: "Facebook",
				Apple: "Apple",
				Telegram: "Telegram",
				LoginViaSms: "SMS Login",
				LoginViaSmsInfo: "I will send you a numeric code via SMS which you can use to login.",
				ForgotPassword: "Forgot password?",
				Register: "Register",
				DevLoginAdmin: "devLogin: Admin",
				DevLoginMember: "devLogin: Member",
				EmailTokenInvalid: "The provided email token is invalid.",
				GoogleLoginFailed: "Google login failed.",

				// Google Login
				GoogleLoginCurrentlyNotAvailable: "Google Login currently not available",

				// WebAuthn translations (EN)
				webauthnRegisterPrompt: "Register Face ID / Touch ID",
				webauthnAuthPrompt: "Verify with Face ID / Touch ID",
				webauthnSuccess: "Authentication successful. Redirecting...",
				webauthnFailure: "Authentication failed. Please try again.",
				webauthnUnsupported: "Your device/browser does not support biometric authentication.",
				webauthnStarting: "Starting authentication device...",
				webauthnWaitingForDevice: "Please confirm the action on your device.",
				webauthnRegisterTitle: "WebAuthn Registration",
				webauthnAuthTitle: "WebAuthn Verification"
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
			// Login via email & password
			emailInputVal: "",
			emailInputState: undefined, 	// synced states from liquido-inputs
			passwordInputVal: "",
			passwordInputState: undefined,
			loginErrorMessage: undefined, // error message below email password input

		
			// Login via E-Mail magic link
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
		loginWithEmailPasswordButtonDisabled() {
			return this.emailInputState !== STATE.VALID || this.passwordInputState !== STATE.VALID
		},
		requestTokenButtonDisabled() {
			return this.mobilephoneInputState !== true || this.waitUntilNextRequestSecs > 0
		},
		adminEmail() {
			return config.devLogin.admin.email
		},
		graphQlSchmeaURL() {
			return config.LIQUIDO_API_URL + '/graphql/schema.graphql'
		}
	},
	watch: {
		/** UX: When last character of auth token is entered and token is valid, then immideately try to login with it. No extra click necessary. */
		authTokenInputState: function(newVal) {
			if (newVal === true) {
				this.loginWithAuthToken()
			}
		}
	},
	created() {
		this.$store.setHeaderTitle(this.pageTitle)

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
		// if email and a valid one time token is passed, then log in user
		if (this.email && this.emailToken) {
			this.loginWithEMailToken()
		}
		this.$nextTick(() => this.$root.scrollToTop())
		//TODO: When user is already logged in (JWT from local storage), THEN show a "welcome back" message. User can jump to his team. 
		//TODO: Shall I allow to login as a different user?  NO => not in a voting app!
	},
	methods: {

		// =============== Simple Login via E-Mail & Password ==================

		loginWithEmailPassword() {
			console.log("loginWithEmailPassword")
			this.loginErrorMessage = null
			api.loginWithEmailPassword(this.emailInputVal, this.passwordInputVal)
				.then(() => {
					this.$router.push({name: "teamHome"})
				})
				.catch(err2 => {
					console.warn("Could not login with email & password", err2)
					this.loginErrorMessage = this.$t("loginFailed")
				})
		},

		// =============== Google Oauth - Authorization Code Flow ==================
		// Very nice comparission of both Oauth Flows:
		// https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model#oauth_20_flow_comparison 

    /**
     * Start the Google OAuth Authorization Code Flow.
     * This will redirect the user to Google's OAuth endpoint with response_type=code.
     * After login/consent, Google will redirect back to our backend with an authorization code.
		 * https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#obtainingaccesstokens
		 * https://developers.google.com/identity/oauth2/web/guides/how-user-authz-works 
		 * https://developers.google.com/identity/protocols/oauth2/web-server#node.js_1  
     */
    startGoogleLoginAuthorizationCodeFlow() {
        const clientId = config.googleClientId;
        const redirectUri = encodeURIComponent(config.LIQUIDO_API_URL + "/auth/google/callback");
        const scope = encodeURIComponent("openid email profile");
        const state = encodeURIComponent(Math.random().toString(36).substring(2)); // Optional: use a real CSRF token in production
				console.log("Attempting google login: redirectUri="+config.LIQUIDO_API_URL + "/auth/google/callback")

        const googleAuthUrl =
            `https://accounts.google.com/o/oauth2/v2/auth` +
            `?client_id=${clientId}` +
            `&redirect_uri=${redirectUri}` +
            `&response_type=code` +
            `&scope=${scope}` +
            `&state=${state}` +
            `&access_type=offline` +
            `&prompt=consent`;

        // Optionally store state in localStorage/sessionStorage for CSRF protection
        localStorage.setItem("google_oauth_state", state);

        // Redirect to Google OAuth
        window.location.href = googleAuthUrl;
    },


		// =============== Google OAuth - Implicit Flow / Google One Tap  ==================
   	// This works, but is less secure than the Authorization Code Flow above.
		// https://developers.google.com/identity/gsi/web/reference/js-reference#google.accounts.id.prompt
	
		/** 
		 * (1) Start the google login process.
		 * For keep data privacy, this is done only <b>after</b> the user clicked the Google button.
		 * Only then we ynamically load the google-script and call the google login function.
		 */
		startGoogleOneTapLogin() {
			this.loginErrorMessage = undefined
			if (!document.getElementById("google-script")) {
				console.log("loading google script")
        const script = document.createElement("script");
        script.id = "google-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = this.loginWithGoogleOneTap; // Call google login function after script has been loaded
        document.head.appendChild(script);
      } else {
        this.loginWithGoogleOneTap(); // If script is already loaded, start login
      }
		},

		/**
		 * 2. Login with Google. This is called after the google script has been loaded.
		 * https://developers.google.com/identity/gsi/web/reference/js-reference#google.accounts.id.initialize
		 */
		loginWithGoogleOneTap() {
			if (window.google && window.google.accounts) {
				this.loginErrorMessage = undefined
				window.google.accounts.id.initialize({
					client_id: config.googleClientId,
					//login_uri: config.LIQUIDO_API_URL + "/auth/google",   // used for ux_mode=redirect
					callback: this.handleGoogleOneTapResponse,
					auto_select: false,
					ux_mode: "popup",  // popup (default) or redirect
					scope: "openid email profile"
				});
				window.google.accounts.id.prompt(); // Show the Google login prompt
			} else {
				this.loginErrorMessage = this.$t("GoogleLoginCurrentlyNotAvailable")
				console.error("Google accounts not available")
			}
		},

		/**
		 * 3. After a successful Google login, this callback is called.
		 * @param response Contains users's clientId and a Google JWT token in response.credential
		 */
		handleGoogleOneTapResponse(response) {
			console.log("Google login response", response)
			if (response.credential) {
				this.tokenErrorMessage = undefined
				api.logout()
				api.googleOneTapLogin(response.credential)
					.then(() => {
						this.$router.push({name: "teamHome"})
					})
					.catch(err => {
						console.error("Google One Tap login failed", err)
						this.tokenErrorMessage = this.$t("GoogleLoginFailed")
					})
			} else {
				console.error("No credential in Google One Tap login response")
				this.tokenErrorMessage = this.$t("GoogleLoginFailed")
			}
		},



		/** Quickly login as an admin user. This is available as a button in the mobile UI when in DEV env.  */
		devLoginAdmin() {
			if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") return
			api.logout()
			api.devLogin(config.devLogin.admin.email, config.devLogin.teamName, config.devLogin.token).then(() => {
				this.$root.scrollToTop()
				this.$router.push({name: "polls"})
			}).catch(err => console.error("DevLogin Admin failed!", err))
		},

		/** Quickly login as a team member. This is available as a button in the mobile UI when in DEV env.  */
		devLoginMember() {
			if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") return
			api.logout()
			api.devLogin(config.devLogin.member.email, config.devLogin.teamName, config.devLogin.token)
				.then(() => {
					this.$root.scrollToTop()
					this.$router.push({name: "polls"})
				})
				.catch(err => console.error("DevLogin Member failed!", err))
		},

		// =============== Login via WebAuthn ==================
		/*
		TODO
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



		// =============== login via E-Mail magic link ==================


		/** Send a magic link that the user can login with for the next n hours. */
		sendMagicLoginLinkMail() {
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
