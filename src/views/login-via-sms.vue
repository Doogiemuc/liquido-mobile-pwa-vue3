<template>
	<div>
		<liquido-header></liquido-header>

		<h1 id="login-via-sms-page" class="page-title">{{ pageTitle }}</h1>

		<div class="card loginCard" id="smsLoginCard">
			<div class="card-body">
				<div class="text-center mb-3">
					<i class="fas fa-sms fa-3x" style="color: var(--primary);"></i>
				</div>
				<p>{{ $t('LoginViaSmsInfo') }}</p>
				<liquido-input
					id="mobilephoneInput"
					v-model="mobilephone"
					v-model:state="mobilephoneInputState"
					type="mobilephone"
					class="mb-3"
					:label="$t('YourMobilephone')"
					:placeholder="$t('MobilephonePlacehoder')"
					:invalid-feedback="$t('MobilephoneInvalid')"
				/>
				<div class="text-end">
					<button
						id="requestTokenButton"
						:disabled="requestTokenButtonDisabled"
						class="btn btn-primary"
						@click="requestAuthToken"
					>
						<div v-if="waitUntilNextRequestSecs > 0">
							{{ $t('TokenSent') }}&nbsp;<div class="spinner-border spinner-border-sm" role="status"></div>
						</div>
						<div v-else>
							{{ $t('RequestTokenButton') }}
						</div>
					</button>
				</div>

				<div v-if="tokenSentSuccessfully && !tokenErrorMessage" id="tokenSuccessMessage" class="alert alert-success mt-3">
					{{ $t("AuthtokenSentSuccessfully") }}
				</div>
				<div v-if="tokenErrorMessage" id="tokenErrorMessage" class="alert alert-danger mt-3">
					{{ tokenErrorMessage }}
				</div>

				<div v-if="tokenSentSuccessfully" class="password-field-animation mt-3">
					<liquido-input
						id="authTokenInput"
						v-model="twillioAuthToken"
						v-model:state="authTokenInputState"
						type="text"
						placeholder="123456"
						class="mb-3"
						:label="$t('AuthTokenLabel')"
						:invalid-feedback="$t('authTokenInputInvalid')"
						:minLength="6"
						:maxLength="6"
						:required="true"
						:show-counter="true"
						@keypress.enter="loginWithAuthToken"
					>
					</liquido-input>

					<button
						id="loginWithAuthTokenButton"
						type="button"
						class="btn btn-primary w-100"
						:disabled="loginWithAuthTokenButtonDisabled"
						@click="loginWithAuthToken"
					>
						{{ $t('Login') }}
					</button>
				</div>
			</div>
		</div>

		<div class="muted-centered-link my-3">
			<router-link :to="{ name: 'login' }">{{ $t('BackToLogin') }}</router-link>
		</div>
	</div>
</template>

<script>
import config from "config"
import liquidoInput, { STATE } from "@/components/liquido-input.vue"
import liquidoHeader from "@/components/liquido-header.vue"
import api from "@/services/liquido-graphql-client.js"

const REQUEST_THROTTLE_SECS = 10

export default {
	i18n: {
		messages: {
			de: {
				Login: "Login",
				LoginViaSms: "SMS Login",
				LoginViaSmsInfo: "Ich schicke dir einen Zahlencode auf dein Handy. Mit diesem kannst du dich dann hier einloggen.",
				YourMobilephone: "Deine Handynummer",
				MobilephonePlacehoder: "0151 123456",
				MobilephoneInvalid: "Keine gultige Handynummer",
				RequestTokenButton: "Login-Token anfordern",
				TokenSent: "SMS verschickt ...",
				AuthTokenLabel: "Login-Token aus SMS",
				authTokenInputInvalid: "Der Login-Token hat genau sechs Ziffern.",
				MobilephoneNotFound: "Tut mir leid, ich kenne diese Telefonnummer in LIQUIDO nicht. Bitte <a href='/'>registriere dich zuerst.</a>",
				TokenInvalid: "Der eingegebene Login-Token wurde nicht akzeptiert. Hast du dich vielleicht einfach nur vertippt? Bitte versuche es noch einmal.",
				AuthtokenSentSuccessfully: "Ok, die SMS wurde verschickt. Bitte gib den Login-Token aus der SMS ein.",
				RequestAuthTokenError: "Login-Token konnte nicht angefordert werden. Bitte versuche es noch einmal.",
				BackToLogin: "Zuruck zum Login"
			},
			en: {
				Login: "Login",
				LoginViaSms: "SMS Login",
				LoginViaSmsInfo: "I will send you a numeric code via SMS which you can use to login.",
				YourMobilephone: "Your mobile phone",
				MobilephonePlacehoder: "0151 123456",
				MobilephoneInvalid: "Invalid mobile phone number",
				RequestTokenButton: "Request login token",
				TokenSent: "SMS sent ...",
				AuthTokenLabel: "Login token from SMS",
				authTokenInputInvalid: "The login token has exactly six digits.",
				MobilephoneNotFound: "Sorry, I do not know this mobile number in LIQUIDO.",
				TokenInvalid: "The entered login token was not accepted. Please try again.",
				AuthtokenSentSuccessfully: "SMS sent. Please enter the login token from the message.",
				RequestAuthTokenError: "Could not request login token. Please try again.",
				BackToLogin: "Back to login"
			}
		}
	},
	components: { liquidoInput, liquidoHeader },
	data() {
		return {
			pageTitle: this.$t("LoginViaSms"),
			mobilephone: "",
			twillioAuthToken: undefined,
			mobilephoneInputState: STATE.INIT,
			authTokenInputState: STATE.INIT,
			waitUntilNextRequestSecs: 0,
			tokenSentSuccessfully: false,
			tokenErrorMessage: undefined
		}
	},
	computed: {
		requestTokenButtonDisabled() {
			return this.mobilephoneInputState !== STATE.VALID || this.waitUntilNextRequestSecs > 0
		},
		loginWithAuthTokenButtonDisabled() {
			return this.authTokenInputState !== STATE.VALID
		}
	},
	created() {
		this.$store.setHeaderTitle(this.pageTitle)
		this.$store.setHeaderBackTarget("BACK")
	},
	mounted() {
		this.$root.scrollToTop()
	},
	methods: {
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
			}, 1000)

			api.logout()
			this.twillioAuthToken = undefined
			this.tokenErrorMessage = undefined
			let devLoginToken = this.mobilephone === config.devLogin.admin.mobilephone ? config.devLogin.token : undefined

			api.requestAuthToken(this.mobilephone, devLoginToken)
				.then(() => {
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
			api.loginWithAuthToken(this.mobilephone, this.twillioAuthToken)
				.then(() => {
					this.$root.gotoTeam()
				})
				.catch(err => {
					console.error("Entered auth token is not valid", err)
					this.tokenErrorMessage = this.$t("TokenInvalid")
				})
		}
	}
}
</script>

<style>
.loginCard {
	margin-left: 1rem;
	margin-right: 1rem;

	.card-body {
		padding: 3rem 1.5rem;
	}
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

.muted-centered-link {
	text-align: center;
	a {
		color: gray !important;
	}
}
</style>
