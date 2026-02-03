<template>
	<div>
		<h1 id="login-page" class="page-title">{{ pageTitle }}</h1>

		<!-- Default Login with email & password  -->
		<div class="card" id="loginCard">
			<div class="card-body">

				<div class="text-center mb-3">
					<i class="fas fa-envelope fa-3x" style="color: var(--primary)"></i>
				</div>

				<liquido-input id="loginEmailInput" ref="emailInput" v-model="emailInputVal" v-model:state="emailInputState" type="email"
					:required=true :placeholder="$t('emailPlaceholder')"
					:invalid-feedback="$t('emailInvalid')" :feedback-placeholder="false" 
					@blur="checkEmailForLogin"
					@keyup="emailInputKeyUp" 
					tabindex="1" />

				<!-- Password input field (shown when email is validated) -->
				<div v-if="emailIsValid" class="password-field-animation">
					<!-- WebAuthn button - shown only if WebAuthn IS available -->
					<button v-if="webAuthnAvailable" id="loginWithWebAuthnButton" type="button" class="btn btn-primary w-100 d-flex align-items-center justify-content-center mt-3 mb-3"
						:disabled="loginWithWebAuthnButtonDisabled" @click="loginWithWebAuthn" tabindex="2">
						<i class="fa-solid fa-fingerprint"></i>
						<span class="flex-grow-1 text-center">{{ $t("LoginWithPasskey") }}</span>
					</button>

					<liquido-input id="loginPasswordInput" v-model="passwordInputVal" v-model:state="passwordInputState" class="mt-2"
						type="password" :minLength=10 :required=true :placeholder="$t('passwordPlaceholder')"
						:invalid-feedback="$t('passwordInputIsInvalid')"
						:feedback-placeholder="false" @keypress.enter="loginWithEmailPassword" tabindex="3" />
				</div>

				<button id="loginWithEmailPasswordButton" type="button"
					class="btn btn-primary w-100 text-center position-relative mt-3" :disabled="loginWithEmailPasswordButtonDisabled"
					@click="loginWithEmailPassword">
					<i class="fa-solid fa-sign-in-alt position-absolute top-50 start-0 translate-middle ms-3"></i>
					<span class="text-center">{{ loginButtonText }}</span>
				</button>	

				<div v-if="loginErrorMessage" id="loginErrorMessage" class="alert alert-danger mt-3" :data-loginErrorMessageId="loginErrorMessageId">
					{{ loginErrorMessage }}
				</div>

				<div v-if="emailIsValid" class="password-field-animation">

					<div class="horizontal-line">
						<span>
							{{ $t("orSignInWith") }}
						</span>
					</div>

					<div class="row mb-3">
						<div class="col">
							<!-- Signin with SMS -->
							<button type="button"
								class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
								@click="showSmsLoginCard = true">
								<i class="fa-solid fa-comment-sms"></i>
								<span class="flex-grow-1 text-center">{{ $t("SMS") }}</span>
							</button>
						</div>
						<div class="col">
								<!-- Signin with Google -->
							<button type="button"
								class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
								@click="startGoogleOneTapLogin">
								<i class="fa-brands fa-google"></i>
								<span class="flex-grow-1 text-center">{{ $t("Google") }}</span>
							</button>
						</div>
					</div>

					<div class="row">
						<div class="col">
							<!-- signin via Link sent to Email -->
							<button type="button"
								class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
								@click="startTelegramLogin">
								<i class="fa-regular fa-envelope"></i>
								<span class="flex-grow-1 text-center">{{ $t("EmailLink") }}</span>
							</button>
						</div>
						<div class="col">
							<!-- Signin with Authy App -->
							<button type="button"
								class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
								@click="startFacebookLogin">
								<i class="fa fa-shield-halved"></i>
								<span class="flex-grow-1 text-center">{{ $t("AuthyApp") }}</span>
							</button>
						</div>
					</div>

				</div>

			</div>
		</div>

		<!-- Password forgotten Link -->
		<div v-if="emailIsValid" class="forgot-password-link my-3">
			<router-link id="forgotPasswordLink" :to="{ name: 'forgotPassword' }">{{ $t('ForgotPassword') }}</router-link>
		</div>

		<!-- Login via SMS -->
		<div v-if="showSmsLoginCard" class="card border-0 shadow-sm mb-4">
			<div class="card-header">
				{{ $t("LoginViaSms") }}
			</div>
			<div class="card-body">
				<p>{{ $t('LoginViaSmsInfo') }}</p>
				<liquido-input id="mobilephoneInput" v-model="mobilephone" v-model:state="mobilephoneInputState"
					type="mobilephone" class="mb-3" :label="$t('YourMobilephone')" :placeholder="$t('MobilephonePlacehoder')"
					:invalid-feedback="$t('MobilephoneInvalid')" />
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

				<liquido-input id="authTokenInput" v-model="twillioAuthToken" v-model:state="authTokenInputState" type="text"
					placeholder="123456" class="mb-3" :label="$t('AuthTokenLabel')"
					:invalid-feedback="$t('authTokenInputInvalid')" :disabled="!tokenSentSuccessfully" :minLength=6 :maxLength=6
					:required="true" :show-counter="true">
				</liquido-input>

				<div v-if="tokenSentSuccessfully && !tokenErrorMessage" id="tokenSuccessMessage"
					class="alert alert-success mt-3">
					{{ $t("AuthtokenSentSuccessfully") }}
				</div>
				<div v-if="tokenErrorMessage" id="tokenErrorMessage" class="alert alert-danger mt-3">
					{{ tokenErrorMessage }}
				</div>
			</div>
		</div>

		<!-- Register as a new user -->
		<div class="forgot-password-link my-3">
			<router-link id="forgotPasswordLink" :to="{ name: 'welcome' }">{{ $t('Register') }}</router-link>
		</div>

		<div v-if="showDevLogin" class="d-flex flex-column px-3" style="margin-top: 8rem;">
			<!-- quick links only for development -->
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
import webauthnService from "@/services/webauthn-service.js"

const REQUEST_THROTTLE_SECS = 10

/** 
 * All possible error cases, used in automated tests.
 * (Never ever check for translated texts in automated tests! Instead use data-* attributes.)
 */
const ERROR = {
	UNKNOWN_USER_EMAIL: 1,
	PASSWORD_LOGIN_FAILED: 2,
	WEB_AUTHN_LOGIN_FAILED: 3,
	GOOGLE_LOGIN_NOT_AVAILABLE: 4
}

export default {
	i18n: {
		messages: {
			de: {
				Continue: "Ok",
				Login: "Login",
				LoginWithPassword: "Login mit Passwort",
				emailPlaceholder: "E-Mail",
				passwordPlaceholder: "Passwort",
				emailInvalid: "Ungültige Email. Vielleicht nur vertippt?",
				emailEmpty: "Bitte gib deine E-Mail Adresse ein.",
				emailNotFound: "Ich kenne diese E-Mail nicht.",
				passwordInputIsInvalid: "Mindestens 10 Zeichen.",
				passwordInputIsEmpty: "Bitte gib dein Passwort ein.",
				loginFailed: "Login fehlgeschlagen. Bitte check deine E-Mail und dein Passwort.",

				// Login via WebAuthn
				LoginWithPasskey: "Login mit Passkey",
				WebAuthnLoginFailed: "Login mit Passkey fehlgeschlagen. Bitte versuche es noch einmal oder log dich mit deinem Passwort ein.",

				// Login options
				AuthyApp: "Authy App",
				Google: "Google",
				Facebook: "Facebook",
				Apple: "Apple",
				SMS: "SMS",
				EmailLink: "Email Link",

				// Login via SMS
				LoginViaSms: "SMS Login",	
				LoginViaSmsInfo: "Ich schicke dir einen Zahlencode auf dein Handy. Mit diesem kannst du dich dann hier einloggen.",
				YourMobilephone: "Deine Handynummer",
				MobilephonePlacehoder: "0151 123456",
				MobilephoneInvalid: "Keine gültige Handynummer",
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
				GoogleLoginFailed: "Google-Login fehlgeschlagen.",

				// Login via E-Mail
				EmailSentSuccessfully: "Ok, ich habe dir eine Email mit einem Code geschickt.",
				CouldNotSendEmail: "Es gab ein Problem beim Verschicken der E-Mail. Bitte versuche es später noch einmal.",
				UserWithThatEmailNotFound: "Tut mir leid, ich kenne niemanden mit dieser E-Mail Adresse. Möchtest du dich <a href='/welcome'>zuerst registrieren</a>?",
				EmailTokenInvalid: "Der eingegebene E-Mail-Token ist ungültig.",
				
				// Forgot password / password reset
				ForgotPassword: "Passwort vergessen?",
				needEmailToResetPassword: "Bitte gib oben deine E-Mail Adresse ein, damit ich dir einen Link zum Zurücksetzen deines Passworts schicken kann.",
				PaswordResetEmailSentSuccessfully: "Ok, ich habe dir eine E-Mail geschickt, mit der du dein Passwort zurücksetzen kannst. Du kannst diese Seite jetzt schließen.",

				Register: "Neu registrieren",
				orSignInWith: "oder melde dich an mit",
				DevLoginAdmin: "devLogin: Admin",
				DevLoginMember: "devLogin: Member"				
			},
			en: {
				emailPlaceholder: "E-Mail",
				passwordPlaceholder: "Password",
				emailInvalid: "Invalid email. Maybe a typo?",
				emailEmpty: "Please enter your email address.",
				emailNotFound: "I don't know this email",
				passwordInputIsInvalid: "At least 10 characters.",
				passwordInputIsEmpty: "Please enter your password.",
				loginFailed: "Login failed. Please check your email and password.",
				orSignInWith: "or sign in with",
				Google: "Google",
				Email: "Email",
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
				LoginWithPasskey: "Login with Passkey",
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
			emailInputState: STATE.INIT, 		// synced states from liquido-inputs
			passwordInputVal: "",
			passwordInputState: STATE.INIT,
			loginErrorMessage: undefined, 	// error message below email password input
			loginErrorMessageId: undefined, // this is used for testing

			// WebAuthn login
			emailIsValid: false,						// Email has been checked in the backend and is valid
			webAuthnAvailable: false,				// Whether the email has a registered WebAuthn credential
			webAuthnCheckInProgress: false, // Prevent multiple concurrent checks
			webAuthnLoginInProgress: false,	// Prevent multiple concurrent login attempts

			// Login via E-Mail magic link
			emailSentSuccessfully: false,
			emailErrorMessage: undefined,
			emailCode: undefined,

			// Login via SMS
			showSmsLoginCard: false,
			mobilephone: "",
			twillioAuthToken: undefined,		// twilio authToken from SMS 
			mobilephoneInputState: STATE.INIT,    // synced states from liquido-inputs
			authTokenInputState: STATE.INIT,      // synced states from liquido-inputs
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
		loginButtonText() {
			if (this.emailIsValid) {	
				return this.$t("LoginWithPassword")
			} else {
				return this.$t("Continue")
			}
		},
		loginWithEmailPasswordButtonDisabled() {
			return this.emailInputState !== STATE.VALID || this.passwordInputState !== STATE.VALID
		},
		loginWithWebAuthnButtonDisabled() {
			return !this.webAuthnAvailable || this.webAuthnLoginInProgress || this.emailInputState !== STATE.VALID
		},
		requestTokenButtonDisabled() {
			return this.mobilephoneInputState !== STATE.VALID || this.waitUntilNextRequestSecs > 0
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
		authTokenInputState: function (newVal) {
			if (newVal === true) {
				this.loginWithAuthToken()
			}
		}
	},
	created() {
		this.$store.setHeaderTitle(this.pageTitle)
	},
	mounted() {
		// if email and a valid one time token is passed, then log in user
		if (this.email && this.emailToken) {
			this.loginWithEMailToken()
			return
		}
		this.$root.scrollToTop()
		let emailInputElem = document.getElementById("loginEmailInput")
		emailInputElem?.focus()

		//TODO: When user is already logged in (JWT from local storage), THEN show a "welcome back" message. User can jump to his team. Or join another team
		//TODO: Shall I allow to login as a different user?  NO => not in a voting app!
	},
	methods: {

		// =============== Simple Login via E-Mail & Password ==================

		focusPasswordInput() {
			this.$root.$nextTick(() => {
				let passwordInputElem = document.getElementById("loginPasswordInput")
				console.log("passwordInputElem", passwordInputElem)
				passwordInputElem?.focus()
			})
		},

		/**
		 * Offer email & password input as a fallback, when webauthn is not available or not setup yet.
		 */
		loginWithEmailPassword() {
			console.log("loginWithEmailPassword")
			this.loginErrorMessage = null
			api.loginWithEmailPassword(this.emailInputVal, this.passwordInputVal)
				.then(() => {
					this.$router.push({ name: "teamHome" })
				})
				.catch(err2 => {
					console.warn("Could not login with email & password", err2)
					this.loginErrorMessage = this.$t("loginFailed")
					this.loginErrorMessageId = ERROR.PASSWORD_LOGIN_FAILED
					this.passwordInputVal = ""
					//this.emailIsValid = false // let the password input field stay visible
				})
		},

		// =============== WebAuthn Passwordless Login ==================

		/**
		 * WHEN user blurs the input field presses enter, 
		 * THEN the email adress is validated against the backend.
		 * ELSE if this is just any other keypress in the email field,
		 * THEN invalidate the emailInputField
		 */
		emailInputKeyUp(event) {
			if (event.key === "Enter") {
				this.passwordInputVal = undefined
				this.checkEmailForLogin()
			} else {
				this.emailIsValid = false
				this.loginErrorMessage = null
				this.loginErrorMessageId = undefined
			}
		},


		/**
		 * Check if the entered email is registered at all and wether it has a WebAuthn authenticator.
		 * Called when loginEmailInput field is blurred or the Enter key is pressed.
		 */
		checkEmailForLogin() {
			console.log("checkEmailForLogin", this.emailIsValid, this.emailInputState)
			// Only check if email is valid and not already checking and only check once
			if (this.emailIsValid || this.emailInputState !== STATE.VALID || this.webAuthnCheckInProgress) {
				return
			}
			this.webAuthnCheckInProgress = true
			this.webAuthnAvailable = false
			this.emailIsValid = false
			this.loginErrorMessage = null
			this.loginErrorMessageId = undefined

			api.checkLoginEmail(this.emailInputVal)
				.then(response => {
					this.emailIsValid = true
					this.webAuthnAvailable = response.webauthn === true
					console.debug("WebAuthn available for email:", this.webAuthnAvailable)
					this.focusPasswordInput()
				})
				.catch(err => {
					if (err.response && err.response.status === 404) {
						this.loginErrorMessage = this.$t("emailNotFound")
						this.loginErrorMessageId = ERROR.UNKNOWN_USER_EMAIL
						console.log(this.$refs)
						this.$refs.emailInput.setValidState(STATE.INVALID)
					} else {
						console.warn("Could not check WebAuthn availability", err)
					}
					this.webAuthnAvailable = false
					this.emailIsValid = false
				})
				.finally(() => {
					this.webAuthnCheckInProgress = false
				})
		},

		/**
		 * Login with WebAuthn authenticator.
		 * Delegates to webauthnService.loginWithWebAuthn() which handles the complete ceremony.
		 */
		async loginWithWebAuthn() {
			if (!this.webAuthnAvailable || this.webAuthnLoginInProgress) return
			this.webAuthnLoginInProgress = true
			this.loginErrorMessage = null
			this.loginErrorMessageId = undefined
			try {
				let teamData = await webauthnService.loginWithWebAuthn(this.emailInputVal)
				api.login(teamData.team, teamData.user, teamData.jwt)
				this.$router.push({ name: "teamHome" })
			} catch (err) {
				console.error("Login page: WebAuthn login failed:", err)
				this.loginErrorMessage = this.$t("WebAuthnLoginFailed")
				this.loginErrorMessageId = ERROR.WEB_AUTHN_LOGIN_FAILED
			} finally {
				this.webAuthnLoginInProgress = false
			}
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
			console.log("Attempting google login: redirectUri=" + config.LIQUIDO_API_URL + "/auth/google/callback")

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
			this.loginErrorMessageId = undefined
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
				this.loginErrorMessageId = undefined
				window.google.accounts.id.initialize({
					client_id: config.googleClientId,
					//login_uri: config.LIQUIDO_API_URL + "/auth/google",   // used for ux_mode=redirect
					callback: this.handleGoogleOneTapResponse,
					auto_select: false,
					ux_mode: "popup",  // popup (default) or redirect
					scope: "openid email profile"
				})
				window.google.accounts.id.prompt(); // Show the Google login prompt
			} else {
				this.loginErrorMessage = this.$t("GoogleLoginCurrentlyNotAvailable")
				this.loginErrorMessageId = ERROR.GOOGLE_LOGIN_NOT_AVAILABLE
				console.error("Google login not available")
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
						this.$router.push({ name: "teamHome" })
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
				this.$router.push({ name: "polls" })
			}).catch(err => console.error("DevLogin Admin failed!", err))
		},

		/** Quickly login as a team member. This is available as a button in the mobile UI when in DEV env.  */
		devLoginMember() {
			if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") return
			api.logout()
			api.devLogin(config.devLogin.member.email, config.devLogin.teamName, config.devLogin.token)
				.then(() => {
					this.$root.scrollToTop()
					this.$router.push({ name: "polls" })
				})
				.catch(err => console.error("DevLogin Member failed!", err))
		},


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
					this.$router.push({ name: "teamHome" })
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
						err.response.data.liquidoErrorCode === api.err.CANNOT_LOGIN_EMAIL_NOT_FOUND) {
						//TODO: ask user if he wants to register
						console.log("There is no user with email: " + this.emailInput)
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
					this.$router.push({ name: "teamHome" })
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
			this.$router.push({ name: "welcome" })
		}
	}
}
</script>

<style>
#loginCard .card-body {
	padding: 3rem 10%;  
}


@keyframes growAndFadeIn {
	from {
		opacity: 0;
		max-height: 0;
		overflow: hidden;
	}

	to {
		opacity: 1;
		max-height: 200px;
	}
}

.password-field-animation {
	animation: growAndFadeIn 0.4s ease-out;
}

.button-outline-liquido {
	border-color: var(--bs-border-color) !important;
}

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

.forgot-password-link {
	text-align: center;
	font-size: 0.8rem;

	a {
		color: gray !important;
	}
}
</style>
