<template>
	<div>
		<h1 id="login-page" class="page-title">{{ $t('Login') }}</h1>

		<div v-if="showDevLogin" class="mb-3">
			<button type="button" class="btn btn-primary" @click="devLoginAdmin">
				<i class="fas fa-shield-alt"></i> {{ $t("DevLoginAdmin") }}
			</button>
			<button type="button" class="btn btn-primary ms-3" @click="devLoginMember">
				{{ $t("DevLoginMember") }}
			</button>
		</div>

		<!-- Login via SMS -->

		<b-card class="chat-bubble input-bubble" :header="$t('LoginViaSms')">
			<p>{{ $t('LoginViaSmsInfo') }}</p>
			<liquido-input
				id="mobilephoneInput"
				v-model="mobilephone"
        v-model.sync="mobilephoneInputState"
				type="mobilephone"
				class="mb-3"
				:label="$t('yourMobilephone')"
				:placeholder="$t('mobilephonePlaceholder')"
				:invalid-feedback="$t('mobilephoneInvalid')"
			/>
			<div class="text-right">
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
					v-model="authToken"
          v-model.state="authTokenInputState"
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
				v-if="tokenSentSuccessfully" 
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

		<b-card class="chat-bubble shadow-sm input-bubble" :header="$t('LoginViaEmail')">
			<p>{{ $t('LoginViaEmailInfo') }}</p>
			<liquido-input
				id="loginEmailInput"
				v-model="emailInput"
				v-model.state="emailInputState"
        type="email"
				class="mb-3"
				:label="$t('yourEMail')"
				:placeholder="$t('emailPlaceholder')"
				:invalid-feedback="$t('emailInvalid')"
				@keypress.enter="requestEmailToken"
			/>
			<div class="text-right">
				<button id="requestEmailButton" type="button" :disabled="sendLinkButtonDisabled" class="btn btn-primary" @click="requestEmailToken">
					{{ $t("SendLink") }}
				</button>
			</div>
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
		</b-card>

		<div class="text-center mt-5">
			<button id="registerButton" type="button" class="btn btn-primary" @click="clickRegister()">
				{{ $t("Register") }}
			</button>
		</div>
	</div>
</template>

<script>
import config from "config"
import liquidoInput from "@/components/liquido-input"
import api from "@/services/liquido-graphql-client"

const REQUEST_THROTTLE_SECS = 10

export default {
	i18n: {
		messages: {
			de: {
				LoginViaSms: "Login per SMS",
				LoginViaSmsInfo: "Ich kann dir ein Login-Token per SMS schicken. Mit diesem Zahlencode kannst du dich dann einloggen.",
				yourMobilephone: "Deine Handynummer",
				mobilephonePlaceholder: "+49 151 1111111",
				mobilephoneInvalid: "Handynummer ungültig",
				RequestTokenButton: "Login-Token anfordern",
				TokenSent: "SMS verschickt ...",
				AuthTokenLabel: "Login-Token aus SMS",
				authTokenInputInvalid: "Der Login-Token hat genau sechs Ziffern.",
				MobilephoneNotFound: "Tut mir leid, ich kenne diese Telefonnummer in LIQUIDO nicht. Bitte <a href='/'>registriere dich zuerst.</a>",
				TokenInvalid: "Der eingegebene Login-Token wurde nicht akzeptiert. Hast du dich vielleicht einfach nur vertippt? Bitte versuche es noch einmal.",
				TokenDoesNotBelongToMobilephone: "Dieser Login-Token gehört jemand anderem. Du darfst dich nur mit <b>deinem Token von deinem Handy</b> einloggen.",
				AuthtokenSentSuccessfully: "Ok, die SMS wurde verschickt. Bitte gib den Login-Token aus der SMS ein.",
				RequestAuthTokenError: "Login-Token konnte nicht angefordert werden. Bitte versuche es noch einmal.",

				LoginViaEmail: "Login per Email",
				yourEMail: "Deine Email",
				LoginViaEmailInfo: "Ich kann dir einen magischen Link per E-Mail schicken. Klicke in der E-Mail auf den Link um dich einzuloggen.",
				SendLink: "Link zuschicken",
				emailPlaceholder: "info{'@'}domain.de",
				emailInvalid: "E-Mail ungültig",
				EmailSentSuccessfully: "Ok, die Email mit deinem Login Link wurde verschickt.",
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
		email: { type: String, required: false, default: undefined },
		teamName: { type: String, required: false, default: undefined },
	},
	data() {
		return {
			// Login via email
			emailInput: "",
			emailInputState: null,		// synced states from liquido-inputs
			emailSentSuccessfully: false,
			emailErrorMessage: undefined,

			// auth token (via SMS)
			mobilephone: "",
			authToken: undefined,
			mobilephoneInputState: null,    // synced states from liquido-inputs
			authTokenInputState: null,      // synced states from liquido-inputs
			waitUntilNextRequestSecs: 0,    // Throttling: Only allow request auth token once every few seconds
			tokenSentSuccessfully: false,  // token request returned success from backend. SMS should have been sent successfully
			tokenErrorMessage: undefined,       // we show different error messages, depending on error code from backend

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
	},
	watch: {
		/** UX: When auth token format is valid, then immideately try to login with it. No extra "login" button step. */
		authTokenInputState: function(newVal) {
			if (newVal === true) {
				this.loginWithAuthToken()
			}
		}
	},
	mounted() {
		this.$root.scrollToTop()
	},
	methods: {
		/** Quickly login as an admin user. This is available as a button in the mobile UI when in DEV env.  */
		devLoginAdmin() {
			api.logout()
			api.devLogin(config.devLogin.adminEmail, config.devLogin.adminTeamname, config.devLogin.token).then(() => {
				this.$router.push({name: "teamHome"})
			}).catch(err => console.error("DevLogin Admin failed!", err))
		},

		/** Quickly login as a team member. This is available as a button in the mobile UI when in DEV env.  */
		devLoginMember() {
			api.logout()
			api.devLogin(config.devLogin.memberEmail, config.devLogin.memberTeamname, config.devLogin.token).then(() => {
				this.$router.push({name: "teamHome"})
			}).catch(err => console.error("DevLogin Member failed!", err))
		},

		/** Send a magic link that the user can login with for the next n hours. */
		requestEmailToken() {
			console.log("requestEmailToken")
			if (this.emailInputState !== true) return  // When user presses return and input state is not yet valid
			api.logout()  // delete any previously stored JWT
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
			this.authToken = undefined
			this.tokenErrorMessage = undefined
			console.debug("requestAuthToken", this.mobilephone)

			api.requestAuthToken(this.mobilephone)
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

		loginWithAuthToken() {
			this.tokenErrorMessage = undefined
			api.loginWithAuthToken(this.mobilephone, this.authToken)
				.then(() => {
					this.$router.push({name: "teamHome"})
				})
				.catch(err => {
					// Show a usefull, human readable error message that actually describes what happend
					this.tokenSentSuccessfully = false
					if (err.response &&	err.response.data) {
						if(err.response.data.liquidoErrorCode === api.err.CANNOT_LOGIN_TOKEN_INVALID) {
							console.log("The entered auth token was invalid.")
							this.tokenErrorMessage = this.$t("TokenInvalid")
						} else
						if(err.response.data.liquidoErrorCode === api.err.CANNOT_LOGIN_MOBILE_NOT_FOUND) {
							console.log("No user with that mobilephone.")
							this.tokenErrorMessage = this.$t("TokenDoesNotBelongToMobilephone")
						} else
						if(err.httpStatus === 401 || err.response.data.liquidoErrorCode === api.err.UNAUTHORIZED) {
							console.log("Cannot login with token. User is not authorized.")
							this.tokenErrorMessage = this.$t("TokenInvalid") 
						}
					} else {
						console.error("Something is wrong with our auth backend", err)
						this.tokenErrorMessage = this.$t("TokenInvalid") 
					}					
				})
		},

		clickRegister() {
			this.$router.push({name: "welcome"})
		}
	}
}
</script>

<style></style>
