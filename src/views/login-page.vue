<template>
	<div>
		<h1 id="login-page" class="page-title">{{ pageTitle }}</h1>

		<!-- h3>WebAuthn</h3>
		<div v-if="showDevLogin" class="d-flex justify-content-between mb-3">
			<button type="button" class="btn btn-primary" @click="registerWebauthn">
				Register {{ adminEmail }}
			</button>
			<button type="button" class="btn btn-primary" @click="loginWebauthn">
				Login
			</button>
		</div -->

		<!-- Login via SMS (disabled because expensive) -->
		<b-card v-if="false" class="border-0 shadow-sm mb-4" :header="$t('LoginViaSms')">
			<p>{{ $t('LoginViaSmsInfo') }}</p>
			<liquido-input
				id="mobilephoneInput"
				v-model="mobilephone"
        v-model:state="mobilephoneInputState"
				type="mobilephone"
				class="mb-3"
				:label="$t('yourMobilephone')"
				:placeholder="$t('mobilephonePlaceholder')"
				:invalid-feedback="$t('mobilephoneInvalid')"
			/>
			<div class="text-end">
				<button id="requestTokenButton" :disabled="requestTokenButtonDisabled" class="btn btn-primary" @click="requestAuthToken">
					<div v-if="waitUntilNextRequestSecs > 0">
						{{ $t('TokenSent') }}&nbsp;<b-spinner small />
					</div>
					<div v-else>
						{{ $t('RequestTokenButton') }}
					</div>
				</button>
			</div>
			<b-collapse v-model="tokenSentSuccessfully" class="mt-3">
				<liquido-input
					id="authTokenInput"
					v-model="twillioAuthToken"
          v-model:state="authTokenInputState"
					type="text"
					placeholder="<123456>"
					class="mb-3"
					:label="$t('AuthTokenLabel')"
					:invalid-feedback="$t('authTokenInputInvalid')"
					:minlength="6"
					:maxlength="6"
					:required="true"
					:show-counter="true"
				></liquido-input>
			</b-collapse>
			<div 
				v-if="tokenSentSuccessfully && !tokenErrorMessage" 
				id="tokenSuccessMessage"
				class="alert alert-success mt-3"
			>
				{{ $t("AuthtokenSentSuccessfully") }}
			</div>
			<div 
				v-if="tokenErrorMessage" 
				id="tokenErrorMessage"
				class="alert alert-danger mt-3"
				v-html="tokenErrorMessage"
			></div>
		</b-card>
		
		<!-- Login via Email -->
		<div class="d-grid mb-3 col-8 mx-auto">
			<liquido-input
				id="loginEmailInput"
				v-model="emailInput"
				v-model:state="emailInputState"
				type="email"
				class="mb-1"
				:label="$t('EMail')"
				:placeholder="$t('emailPlaceholder')"
				:invalid-feedback=undefined
				@keypress.enter="requestEmailToken"
			/>
			
				<button id="requestEmailButton" type="button" :disabled="sendLinkButtonDisabled" class="btn btn-primary" @click="requestEmailToken">
					<i class="fas fa-envelope me-2"></i> {{ $t("EMailLogin") }}
				</button>
			
			<div 
				v-if="emailSentSuccessfully"
				id="emailSuccessMessage"
				class="alert alert-success mt-3"
			>
				{{ $t("EmailSentSuccessfully") }}
			</div>
			<div 
				v-if="emailErrorMessage"
				id="emailErrorMessage"
				class="alert alert-danger mt-3"
				v-html="emailErrorMessage"
			></div>

		</div>
		

		<!-- Signin with Google -->
		<div class="d-grid mb-3 col-8 mx-auto mt-5">
			<button type="button" class="btn btn-primary" @click="startGoogleLogin()">
				<i class="fa-brands fa-google me-2"></i> {{ $t("LoginWithGoogle") }}
			</button>

			<button id="registerButton" type="button" class="btn btn-primary mt-5" @click="clickRegister()">
				<i class="fa-solid fa-user-plus me-2"></i> {{ $t("Register") }}
			</button>
		</div>


		<div v-if="showDevLogin" class="d-grid col-8 mx-auto mt-5">
			<hr/>
			<button type="button" class="btn btn-secondary mt-2" @click="devLoginAdmin">
				<i class="fas fa-shield-alt"></i> {{ $t("DevLoginAdmin") }}
			</button>
			<button type="button" class="btn btn-secondary mt-3" @click="devLoginMember">
				{{ $t("DevLoginMember") }}
			</button>
		</div>

	</div>
</template>

<script>
import config from "config"
import liquidoInput from "@/components/liquido-input.vue"
import api from "@/services/liquido-graphql-client.js"
import { store }  from "@/services/store.js"
// import WebAuthn from "@/services/quarkus-webauthn.js"

const REQUEST_THROTTLE_SECS = 10

export default {
	i18n: {
		messages: {
			de: {
				LoginWithGoogle: "Google Login",
				LoginViaEmail: "E-Mail Login",
				LoginViaSms: "SMS Login",
				LoginViaSmsInfo: "Ich schicke dir einen Zahlencode auf dein Handy. Mit diesem kannst du dich dann hier einloggen.",
				yourMobilephone: "Deine Handynummer",
				mobilephonePlaceholder: "+49 151 1111111",
				mobilephoneInvalid: "Handynummer ungültig",
				RequestTokenButton: "Login-Token anfordern",
				TokenSent: "SMS verschickt ...",
				AuthTokenLabel: "Login-Token aus SMS",
				authTokenInputInvalid: "Der Login-Token hat genau sechs Ziffern.",
				MobilephoneNotFound: "Tut mir leid, ich kenne diese Telefonnummer in LIQUIDO nicht. Bitte <a href='/'>registriere dich zuerst.</a>",
				TokenInvalid: "Der eingegebene Login-Token wurde nicht akzeptiert. Hast du dich vielleicht einfach nur vertippt? Bitte versuche es noch einmal.",
				AuthtokenSentSuccessfully: "Ok, die SMS wurde verschickt. Bitte gib den Login-Token aus der SMS ein.",
				RequestAuthTokenError: "Login-Token konnte nicht angefordert werden. Bitte versuche es noch einmal.",

				EMailLogin: "Email Login",
				LoginViaEmailInfo: "Ich kann dir einen login Link per E-Mail schicken.",
				SendLink: "Link zuschicken",
				emailPlaceholder: "info{'@'}domain.de",
				emailInvalid: "E-Mail ungültig",
				EmailSentSuccessfully: "Ok, Email wurde verschickt. Klicke in der E-Mail auf den Login Link.",
				CouldNotSendEmail: "Es gab ein Problem beim Verschicken der E-Mail. Bitte versuche es später noch einmal.",
				UserWithThatEmailNotFound: "Tut mir leid, ich kenne niemanden mit dieser E-Mail Adresse. Möchtest du dich <a href='/welcome'>zuerst registrieren</a>?",

				Register: "Registrieren",
				
				DevLoginAdmin: "devLogin: Admin",
				DevLoginMember: "devLogin: Member",
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
			// Login via email
			emailInput: "",
			emailInputState: null,					// synced states from liquido-inputs
			emailSentSuccessfully: false,
			emailErrorMessage: undefined,

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
		sendLinkButtonDisabled() {
			return this.emailInputState !== true
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
					//callback: this.handleGoogleResponse,
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



		// ============== Login via Email link =================


		/** Send a magic link that the user can login with for the next n hours. */
		requestEmailToken() {
			console.log("requestEmailToken")
			if (this.emailInputState !== true) return  // When user presses return and input state is not yet valid
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
					this.$root.scrollToBottom()
					if (err.response &&	
							err.response.data &&
							err.response.data.liquidoErrorCode === api.err.CANNOT_LOGIN_EMAIL_NOT_FOUND) 
					{
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
	.card-header {   
		background-color: white !important;
		margin: 0;
		font-weight: bold;
	}
</style>
