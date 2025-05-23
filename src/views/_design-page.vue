<template>
	<div>
		<h1 id="design-page" class="page-title">{{ $t('pageTitle') }}</h1>

		<!-- Design of Login -->
		<div class="card mb-3">
			<div class="card-body">

				<liquido-input id="emailInput" v-model="emailInputVal" v-model:state="emailInputState" type="email"
					:placeholder="$t('emailPlaceholder')"
					:required=true
					:empty-feedback="$t('emailEmpty')"
					:invalid-feedback="$t('emailInvalid')"/>

				<liquido-input id="passwordInput" v-model="passwordInputVal" v-model:state="passwordInputState" type="password"
					:minLength=10 :required=true
					:placeholder="$t('passwordPlaceholder')"
					:invalid-feedback="$t('passwordInputIsInvalid')"
					/>

				<button id="loginWithEmailPasswordButton" type="button" class="btn btn-primary w-100 mb-3">
					{{ $t("Login") }}
				</button>

		
				<!-- Secondary button inside card -->
				<div class="row g-2">
					<div class="col">
						<button type="button" class="btn btn-outline-secondary w-100">
							<i class="fa-brands fa-google position-absolute start-0 ms-3 top-50 translate-middle-y"></i> 
							{{ $t("Google") }}
						</button>
					</div>
					<div class="col">
						<button type="button" class="btn btn-outline-secondary w-100">
							<i class="fa fa-shield-halved position-absolute start-0 ms-3 top-50 translate-middle-y"></i> {{ $t("Authy") }}
						</button>
					</div>
				</div>
		
			</div>
		</div>

		<!-- Primary text on app background -->
		<div class="mb-3">
			This is a paragraph of primary text on app background. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
			lorem ipsum dolor sit amet, consectetur adipiscing elit. loginWithEmailPasswordButton loginWithEmailPasswordButton
		</div>

		<!-- Secondary small text on app background -->
		<div class="text-small text-muted text-center my-3">
			Small secondary text on app background
		</div>

		<!-- Secondary Button with outline on app background -->
		<div class="d-flex justify-content-center mb-3" style="max-width: 540px; margin: 0 auto;">
			<button id="registerButton" type="button" class="btn btn-outline-secondary w-100">
				<i class="fa-solid fa-user-plus me-2"></i> Grey outline Button
			</button>
		</div>

		<!-- CHAT -->

		<h1 class="page-title mt-5 mb-3">Chat</h1>

		<div id="welcomeBubble" :class="{ 'hide-left': flowState < 1 }" class="card chat-bubble chat-left shadow-sm">
			<div class="card-body" v-html="$t('welcome')">
			</div>
		</div>

		<div :class="{ 'hide-left': flowState < 2 }" class="chat-bubble chat-left shadow-sm">
			<div class="card-body">
				{{ $t('whatsYourName') }}
			</div>
		</div>
		

		<div :class="{ 'hide-right': flowState < 3 }" class="card chat-bubble chat-right shadow-sm">
			<div class="card-body">
				<liquido-input
					id="userNameInput"
					ref="userNameInput"
					v-model="userName"
					class="mb-2"
					:label="$t('yourNickname')"
					:valid-func="isUsernameValid"
					:maxlength="100"
					:invalid-feedback="$t('userNameInvalid')"
				/>
			</div>
		</div>





		<!-- POLLS -->

		<h1 class="page-title my-5">Polls</h1>

		<!-- list of polls -->
		<div id="poll-list-wrapper" class="mb-5">

			<transition-group name="poll-list" id="poll-list" tag="div">
				<div v-for="poll in mockPolls" :key="poll.id" class="poll-card-wrapper">
					<div class="poll-card card border-0">
						<div class="card-body d-flex flex-nowrap align-items-center">
							<div class="flex-grow-0">
								<div class="poll-icon">
									<i :class="iconForPoll(poll)" />
								</div>
							</div>
							<div class="flex-grow-1">
								<h3 class="poll-title">{{ poll.title }}</h3>
								<div class="poll-footer">
									<div v-if="poll.status === 'VOTING'">
										<i class="fas fa-person-booth"></i>&nbsp;{{ $tc('votes', poll.numBallots) }}
										<i class="far fa-calendar-alt"></i>&nbsp;{{ $tc('daysLeft', daysLeft(poll) ) }}
									</div>
									<div v-else-if="poll.status === 'FINISHED'">
										<i class="far fa-check-circle"></i>&nbsp;{{ $t('finished') }}
									</div>
									<div v-else>
										<i class="far fa-lightbulb"></i>&nbsp;{{ $tc('numProposals', poll.proposals.length ) }}
									</div>
								</div>
							</div>
							<div class="flex-grow-0 color-primary">
								<i class="fas fa-angle-right"></i>
							</div>
						</div>
					</div>
				</div>
			</transition-group>

		</div>


	</div>
</template>

<script>
import config from "config"
import liquidoInput, { STATE } from "@/components/liquido-input.vue"
import { store }  from "@/services/store.js"
import dayjs from "dayjs"
import loginWithJwtResponse from "@/../tests/mocks/loginWithJwtResponse.json"

export default {
  i18n: {
    messages: {
      de: {      
				pageTitle: "LIQUIDO UI Design",
				Login: "Login",
				emailPlaceholder: "Deine E-Mail",
        passwordPlaceholder: "Passwort",
        emailInvalid: "Ungültige Email. Vielleicht nur vertippt?",
				emailEmpty: "Bitte gib deine E-Mail Adresse ein.",
				passwordInputIsInvalid: "Passwort falsch. (Mindestens 10 Zeichen.)",
				userNameInvalid: "Bitte mindestens 5 Zeichen!",
				loginFailed: "Login fehlgeschlagen. Bitte überprüfe deine E-Mail und dein Passwort.",
				
        EmailSentSuccessfully: "Ok, ich habe dir eine Email mit einem Code geschickt.",
        CouldNotSendEmail: "Es gab ein Problem beim Verschicken der E-Mail. Bitte versuche es später noch einmal.",
        UserWithThatEmailNotFound: "Tut mir leid, ich kenne niemanden mit dieser E-Mail Adresse. Möchtest du dich <a href='/welcome'>zuerst registrieren</a>?",
        orSignInWith: "oder melde dich an mit",
				Google: "Google",
        Facebook: "Facebook",
        Apple: "Apple",
        Telegram: "Telegram",
        
        forgotPassword: "Passwort vergessen?",
				Register: "Registrieren",
        
        GoogleLoginFailed: "Google-Login fehlgeschlagen.",

				welcome:
					"<p>Willkommen bei <span class='liquido'></span>, der freien, sicheren und liquiden e-voting App für euer Team.</p>"+
					"<p>In Liquido wählst du nicht einfach nur einen Vorschlag oder stimmst nur für einen Kandidaten. Stattdessen sortiert jeder im Team "+
					"Wahlvorschläge nach seiner eigenen Priorität. Liquido berechnet daraus dann mit einem cleveren Algorithmus den Sieger der Wahl.</p>",
				whatsYourName: "Darf ich fragen wie du heißt?",
				yourNickname: "Dein Spitzname",

				// POLLS
				daysLeft: "Wahl Abgeschlossen | ein Tag noch | noch {n} Tage",
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
			pageTitle: this.$t("LIQUIDO UI Design"),

			mockPolls: loginWithJwtResponse.data.loginWithJwt.team.polls,

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

			userName: undefined,
			userNameInputState: undefined,
			userNameInputVal: "",

			flowState: 4
		}
	},
	created() {
		this.store.setHeaderTitle(this.pageTitle)
	},
	mounted() {
		this.$root.scrollToTop()
	},
	methods: {
		/* username must not be empty and contain at least n chars */
		isUsernameValid(val) {
			return val !== undefined && val !== null && val.trim().length >= 5
		},

		iconForPoll(poll) {
			if (!poll) return undefined
			switch (poll.status) {
				case "ELABORATION":
					return "far fa-comments"   // or fa-poll?
				case "VOTING":
					return "fas fa-person-booth"
				case "FINISHED":
					return "fas fa-check-circle"
				default:
					return "far fa-vote-yea"
			}
		},

		/** 
		 * How many days are left for vorting?
		 * Always return at least "1" day, until poll is in VOTING.
		 */
		daysLeft(poll) {
			if (poll.votingEndAt && poll.status === "VOTING") {
				let end = dayjs(poll.votingEndAt)
				let diff = end.diff(dayjs(), "day")
				return diff > 0 ? diff : 1
			} else {
				return 0
			}
		},



	}
}
</script>

<style lang="scss">


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




	/* ========= POLLS ========== */
	/** MUST SET THE height TO A FIXED VALUE, for animating it. */
	.poll-card-wrapper {
		height: 6rem;
		margin-bottom: 10px;
		overflow: hidden;
		transition: all 1s;
	}
	
	.poll-card {
		cursor: pointer;
		height: 100% !important;  // bootstrap .card sets a height that we need to overwrite
		
		.card-body {
			padding-left: 0;
			padding-right: 10px;
		}

		.poll-icon {
			color: white;
			background-color: $icon-bg;
			border-radius: 50%;
			text-align: center;
			font-size: 20px;
			line-height: 31px;
			min-width: 32px;
			max-width: 32px;
			width: 32px;
			min-height: 32px;
			max-height: 32px;
			height: 32px;

			margin: 0 10px;
		}

		.poll-title {
			color: $primary;
			font-size: 1.0rem !important;   // smaller than normal H3
		}

		.poll-footer {
			font-size: 80%;
			color: #bbb;
			i:not(:first-child) {
				margin-left: 10px;
			}
		}
	}


</style>
