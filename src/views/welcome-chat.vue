<template>
	<div id="welcome-chat">
		<!-- Welcome -->
		<div id="welcomeBubble" :class="{ 'hide-left': !FLOW.Welcome }" class="card chat-bubble chat-left mt-3">
			<div class="card-body" v-html="$t('welcome')"></div>
		</div>

		<!-- What's your name? -->
		<div :class="{ 'hide-left': !FLOW.WhatsYourName }" class="card chat-bubble chat-left">
			<div class="card-body">
				<p v-if="FLOW.InviteCodeValid" v-html="$t('hasInviteCodeForTeam', { teamName: team.teamName })"></p>
				<p>{{ $t('whatsYourName') }}</p>
			</div>
		</div>

		<!-- Nickname input -->
		<div id="usernameCard" :class="{ 'collapse-max-height': !FLOW.NicknameInput }" class="card chat-bubble chat-right">
			<div class="card-body">
				<liquido-input
					id="userNameInput"
					ref="userNameInput"
					v-model="user.name"
					class="mb-2"
					:label="$t('yourNickname')"
					:valid-func="isUsernameValid"
					:maxlength="100"
					:invalid-feedback="$t('userNameInvalid')"
					:disabled="FLOW.NiceToMeetYou"
					@keyup.enter="userNameSubmit()"
					@blur="userNameSubmit()"
				/>
			</div>
		</div>

		<!-- Login button -->
		<div v-if="showLoginButton" class="login-link">
			<button class="btn btn-primary btn-sm" @click="goToLogin">{{ $t('Login') }}</button>
		</div>

		<!-- Nice to meet you bubble -->
		<div :class="{ 'hide-left': !FLOW.NiceToMeetYou }" class="card chat-bubble chat-left">
			<div class="card-body" v-html="$t('niceToMeetYou', { nickname: user.name })" />
		</div>

		<!-- create or join a team bubble -->
		<div id="createOrJoinBubble" :class="{ 'hide-left': !FLOW.CreateOrJoinTeam, 'collapse-max-height': FLOW.InviteCodeValid }" class="card chat-bubble chat-left">
			<div class="card-body" v-html="$t('createOrJoin')" />
		</div>

		<!-- create or join a team buttons -->
		<div id="createOrJoinButtons" :class="{ 'hide-left': !FLOW.CreateOrJoinTeam }" class="mb-3 transition-all">
			<button
				id="createNewTeamButton"
				:class="{
					'btn-primary': true,
					'moveToCenterFromLeft btn-light': FLOW.CreateTeamForm,
					opacity0: FLOW.JoinTeamForm,
				}"
				class="btn"
				@click="chooseCreateNewTeam()"
			>
				{{ $t("createNewTeamButton") }}
			</button>

			<button
				id="joinTeamButton"
				:class="{
					'btn-primary': true,
					'moveToCenterFromRight btn-light': FLOW.JoinTeamForm,
					opacity0: FLOW.CreateTeamForm,
				}"
				class="btn"
				@click="chooseJoinTeam()"
			>
				{{ $t("joinTeamButton") }}
			</button>
			
		</div>

		<!-- Join a team - form -->
		<div id="JoinTeamForm" :class="{ 'collapse-max-height': !FLOW.JoinTeamForm }" class="card chat-bubble chat-right">
			<div class="card-header">
				{{ $t("JoinTeam") }}
			</div>	
			<div class="card-body">
				<form>
					<liquido-input
						id="inviteCodeInput"
						ref="inviteCodeInput"
						v-model="inviteCodeInputField"
						class="mb-3"
						:label="$t('inviteCode')"
						placeholder="$t('inviteCodePlaceholder')"
						:valid-func="isInviteCodeSyntaxValid"
						:maxlength="100"
						:invalid-feedback="$t('inviteCodeInvalid')"
						:disabled="FLOW.JoinTeamSuccessfull"
						tabindex="1"
					/>

					<liquido-input
						id="userEmailInput"
						ref="userEmailInput"
						v-model="user.email"
						class="mb-3"
						:label="$t('YourEMail')"
						:valid-func="isEmailValid"
						:maxlength="200"
						:invalid-feedback="$t('emailInvalid')"
						:disabled="FLOW.JoinTeamSuccessfull"
						tabindex="3"
					/>

					<liquido-input
						id="userPasswordInput"
						ref="userPasswordInput"
						v-model="plainPassword"
						type="password"
						class="mb-3"
						:label="$t('Password')"
						:valid-func="isPasswordValid"
						:maxlength="200"
						:invalid-feedback="$t('passwordInvalid')"
						:disabled="FLOW.JoinTeamSuccessfull"
						tabindex="4"
						@keyup.enter="joinTeam()"
					/>

					<div class="d-flex justify-content-between align-items-center">
						<a href="#" tabindex="4" 
							class="cancel-link"
							:class="{ 'invisible' : FLOW.JoinTeamSuccessfull }"
							@click="cancelCreateOrJoinTeam()">
							{{ $t("Cancel") }}
						</a>
						<button
							id="joinTeamOkButton"
							:disabled="joinTeamOkButtonDisabled"
							class="btn btn-primary"
							tabindex="4"
							type="button"
							@click="joinTeam()"
						>
							{{ $t("Ok") }}
						</button>
					</div>
				</form>
			</div>
		</div>

		<!--Joined team successfully -->
		<div id="joinedTeamBubble" :class="{ 'collapse-max-height': !FLOW.JoinTeamSuccessfull }" class="card chat-bubble chat-left">
			<div class="card-body">
				<p v-html="$t('JoinedTeamSuccessfully', { teamName: team.teamName })" />
			</div>
		</div>





		<!-- Create a new team - form -->
		<div id="createNewTeamCard" :class="{ 'collapse-max-height': !FLOW.CreateTeamForm }" class="card chat-bubble chat-right">
			<div class="card-header">
				{{ $t("CreateNewTeam") }}
			</div>	
			<div class="card-body">
				<form>
					<liquido-input
						id="teamNameInput"
						ref="teamNameInput"
						v-model="team.teamName"
						class="mb-3"
						:label="$t('teamName')"
						:valid-func="isTeamNameValid"
						:maxlength="100"
						:invalid-feedback="$t('teamNameInvalid')"
						:disabled="FLOW.CreateTeamSuccessfull"
						tabindex="1"
					/>

					<liquido-input
						id="adminEmailInput"
						ref="adminEmailInput"
						v-model="user.email"
						class="mb-3"
						:label="$t('YourEMail')"
						:valid-func="isAdminEmailValid"
						:maxlength="200"
						:invalid-feedback="$t('emailInvalid')"
						:disabled="FLOW.CreateTeamSuccessfull"
						tabindex="2"
					/>

					<liquido-input
						id="adminPasswordInput"
						ref="adminPasswordInput"
						type="password"
						v-model="plainPassword"
						class="mb-3"
						:label="$t('Password')"
						:placeholder=undefined
						:valid-func="isPasswordValid"
						:maxlength="200"
						:invalid-feedback="$t('passwordInvalid')"
						:disabled="FLOW.CreateTeamSuccessfull"
						tabindex="3"
						@keyup.enter="createNewTeam()"
					/>


					<small class="text-secondary">{{ $t("youWillBecomeAdmin") }}</small>

					<div class="d-flex justify-content-between align-items-center mt-3">
						<a href="#" tabindex="4" 
							class="cancel-link" 
							:class="{ 'invisible' : FLOW.CreateTeamSuccessfull }"
							@click="cancelCreateOrJoinTeam()">
							{{ $t("Cancel") }}
						</a>
						<button
							id="createNewTeamOkButton"
							:disabled="createNewTeamOkButtonDisabled"
							class="btn btn-primary"
							tabindex="3"
							type="button"
							@click="createNewTeam()"
						>
							{{ $t("Ok") }}
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- New team created successfully -->
		<div id="newTeamCreatedBubble" :class="{ 'collapse-max-height': !FLOW.CreateTeamSuccessfull }" class="card chat-bubble chat-left">
			<div class="card-body">
				<p>{{ $t("TeamCreatedSuccessfully") }}</p>
			</div>
		</div>

		<!-- Setup Passkey Info -->
		<div id="setupPasskeyInfoCard" :class="{ 'collapse-max-height': !FLOW.SetupPasskey }" class="card chat-bubble chat-left">
			<div class="card-body">
				<h3 v-html="$t('SetupPasskeyTitle')"></h3>
				<p v-html="$t('SetupPasskeyInfo')" />
			</div>
		</div>

		<!-- Setup Passkey - label and button -->
		<div id="setupPasskeyCard" :class="{ 'collapse-max-height': !FLOW.SetupPasskey }" class="card chat-bubble chat-right">
			<div class="card-body">
				<liquido-input
					id="passkeyInput"
					ref="passkeyInput"
					v-model="passkeyLabel"
					class="mb-3"
					:label="$t('PasskeyLabel')"
					:minlength="3"
					:maxlength="200"
					:invalid-feedback="$t('PasskeyLabelInvalid')"
					:disabled="FLOW.RegistrationFinished"
				/>
				<button
					id="setupPasskeyButton"
					class="btn btn-primary d-flex align-items-center float-end w-100"
					type="button"
					:disabled="FLOW.RegistrationFinished"
					@click="setupPasskey()"
				>
					<i class="fas fa-fingerprint" />
					<span class="flex-grow-1 text-center">{{ $t("SetupPasskeyButton") }}</span>
					<span v-if="FLOW.SetupPasskeySuccessfull" style="color: #0E0;">
						<i class="fa-solid fa-check"></i>
					</span>
				</button>
			</div>
		</div>


		<!-- JoinTeam and Passkey successfull: GoToTeam Button -->
		<div id="JoinTeamFinishedCard" :class="{ 'collapse-max-height': !(FLOW.RegistrationFinished && FLOW.JoinTeamSuccessfull) }" class="card chat-bubble chat-left">
			<div class="card-body">
				<p v-html="$t('JoinTeamFinished', { teamName: team.teamName })"></p>
				<button
					id="gotoTeamButton"
					class="btn btn-primary w-100"
					type="button"
					@click="$root.gotoTeam"
				>
					<i class="fas fa-users" />
					{{ $t("gotoTeam") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</div>
		</div>



		<!-- CreatTeam Successfull and registration finished: Admin can invite members via QR -->
		<div id="teamQrCode" :class="{ 'collapse-max-height': !(FLOW.RegistrationFinished && FLOW.CreateTeamSuccessfull) }" class="card chat-bubble chat-left">
			<h3 class="card-header">
				{{ $t("InviteFriendsTitle") }}
			</h3>
			<div class="card-body">
				<p>{{ $t("ShareLinkInfo") }}</p>
				<button class="btn btn-primary position-relative w-100" @click="shareLink">
					<i class="fas fa-external-link-alt position-absolute top-50 start-0 translate-middle ms-3" />
					{{ $t("shareLink", {teamName: team.teamName, inviteCode: team.inviteCode}) }}
				</button>
				
				<p class="mt-3">{{ $t("scanQrCode") }}</p>
				<div class="text-center mb-3">
					<img id="qrCodeImg" src="" class="qr-code">
				</div>
				<p v-html="$t('teamInfo')" />
				<button
					id="gotoTeamButton"
					class="btn btn-primary float-end mb-3"
					type="button"
					@click="$root.gotoTeam"
				>
					<i class="fas fa-users" />
					{{ $t("gotoTeam") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</div>
		</div>

		<!-- Admin can create a first poll -->
		<div :class="{ 'collapse-max-height': !(FLOW.RegistrationFinished && FLOW.CreateTeamSuccessfull) }" class="card chat-bubble chat-left">
			<div class="card-body">
				<p v-html="$t('pollInfo')" />
				<button
					id="gotoCreatePollButton"
					class="btn btn-primary float-end mb-3"
					type="button"
					@click="gotoCreatePoll()"
				>
					<i class="fas fa-user-shield" />
					{{ $t("createPoll") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</div>
		</div>

		


	</div> <!-- end of container -->

</template>

<script>

/* 
   Add a dot to this line, when you updated welcome-chat and are still not happy! :-)
   ..................................................
*/

import config from "config"
import QRCode from "qrcode"
import liquidoInput from "@/components/liquido-input.vue"
import api from "@/services/liquido-graphql-client.js"
import log from 'loglevel'
import EventBus from "@/services/event-bus.js"
import webauthnService from "@/services/webauthn-service"

const eMailRegEx = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,64}$/

//Kinda relaxed check for mobilephone number. But see https://github.com/google/libphonenumber/blob/master/FALSEHOODS.md    :-)
const mobilephoneRegEx = /(^\+[1-9]{2}[0-9 ]{1,20}$)|(^0[0-9]{3,5} *[-/]? *[0-9 ]{1,50}$)/

export default {
	i18n: {
		messages: {
			en: {
				welcome: 
					"Welcome to <span class='liquido'></span> - the free, secure and liquid eVoting platform. "+
					"With this mobile app you can create polls and then take votes with your team.",
				whatsYourName: "How shall I call you?",
				createOrJoin: "Do you want to <em>join an existing team</em> with an invitation code or <em>create a new team</em>?",
				joinTeamButton: "Join a team",
				createNewTeamButton: "Create new team",

				OkTeamCreatedSuccessfully: "Ok your team has been created successfully.",
				shareThisLink: "Share this link",
				tellInvitationCode: "or tell them your invitation code:",
				scanQrCode: "or let them scan this QR code:",
				createPoll: "Create a poll",
			},
			de: {
				welcome:
					"<p>Willkommen bei <span class='liquido'></span>!</p>"+
					"<p>Der App für sichere, faire und <em>liquide</em> Abstimmungen.</p>"+
					"<p>Hier stimmst du nicht nur für einen <em>einzelnen</em> Vorschlag, sondern jeder in eurem Team sortiert <em>alle</em> Vorschläge nach der eigenen Präferenz. " + 
					"Ein cleverer Algorithmus berechnet daraus dann den Vorschlag mit der größten Zustimmung.</p>",
				hasInviteCodeForTeam: "Hey, du wurdest in das Team <b>{teamName}</b> eingeladen.",
				whatsYourName: "Darf ich fragen wie du heißt?",
				yourNickname: "Dein Spitzname",
				userNameInvalid: "Bitte mindestens " + config.usernameMinLength + " Zeichen!",
				niceToMeetYou: "Hallo <b>{nickname}</b>, freut mich, dich kennen zu lernen! Ich benötige jetzt bitte noch deine E-Mail und ein Passwort.",

				// Create or join team
				createOrJoin: "Möchtest du ein neues Team gründen? Oder hast du einen Einladungscode bekommen und möchtest einem bestehenden Team beitreten?",

				// Create a new team
				CreateNewTeam: "Neues Team gründen",
				createNewTeamButton: "Team gründen",
				teamName: "Team Name",
				teamNameInvalid: "Bitte mindestens 6 Zeichen als Teamname!",
				youWillBecomeAdmin: "Du wirst der Admin des neuen Teams.",
				TeamCreatedSuccessfully: "Ok, dein neues Team ist angelegt. Ich habe dir auch bereits eine E-Mail mit allen Infos geschickt.",

				// Join an existing team
				JoinTeam: "Einem Team beitreten",
				joinTeamButton: "Team beitreten",
				inviteCode: "Einladungscode",
				inviteCodePlaceholder: "AB12CD34",
				inviteCodeInvalid: "Einladungscode muss genau 6 Zeichen lang sein.",
				yourMobilephone: "Deine Handynummer",
				mobilephonePlaceholder: "+49 555 111111",
				mobilephoneInvalid: "Keine gültige Handynummer",
				YourEMail: "Deine E-Mail",
				emailPlaceholder: "info{'@'}domain.de",
				emailInvalid: "E-Mail Adresse ungültig",
				passwordInvalid: "Bitte mindestens " + config.minPasswordLength + " Zeichen!",

				JoinedTeamSuccessfully: "Ok, du bist dabei. Willkommen im Team <b>{teamName}</b>. Ich habe dir auch bereits eine E-Mail mit allen Infos geschickt.",  // Shown after JoinTeamInput bubble
				JoinTeamFinished: "Hier geht's weiter:",  // last message with GoToTeam button
				
				// QR code bubble
				InviteFriendsTitle: "Freunde einladen",
				ShareLinkInfo: "Teile diesen Link mit deinen Freunden:",
				shareLink: "{teamName} ({inviteCode})",
				scanQrCode: "Oder lass sie einfach diesen QR code scannen:",
				teamInfo: "Du findest diesen QR Code später auch auf deiner Team Seite wieder.",
				gotoTeam: "Zu deinem Team",

				// Setup Passkey bubble
				PassKey: "Passkey",
				SetupPasskeyTitle: "<span class='liquido'></span> ist sicher!",
				SetupPasskeyInfo: "<p>Um sicherzustellen, dass niemand deine Stimme missbrauchen kann, richte bitte jetzt deinen Passkey ein. Künftig kannst du dich damit schnell und sicher per Fingerabdruck, Face-ID oder Geräte-PIN einloggen.</p>" +
					"<p>Keine Sorge, dein Passkey bleibt auf deinem Gerät. Es werden keine biometrischen Daten gespeichert oder übertragen.</p>",
				PasskeyLabel: "Passkey Name",  // the label of the input field
				PasskeyLabelInvalid: "Bitte mindestens 3 Zeichen!",
				SetupPasskeyButton: "Passkey registrieren",
				SetupPasskeyInfoTitle: "Passkey Hinweis",
				SetupPasskeyInfoMessage: "Dein Passkey konnte leider gerade nicht registriert werden. Bitte versuche es erneut. Oder du kannst die Registrierung später auch noch auf deiner Team Seite abschließen.",
				TryAgain: "Noch mal versuchen",
				OkLater: "Ok, später",

				// Admin: Create first poll bubble
				pollInfo: "Möchtest du jetzt gleich eine erste <i class='fas fa-poll'></i> Abstimung für dein Team erstellen?",
				createPoll: "Abstimmung anlegen",

				// Error messages
				teamWithSameNameExists: "Ein Team mit diesem Namen existiert bereits. Bitte wählen einen anderen Namen für dein Team. Oder kann es sein, dass du dich einloggen möchtest?",
				cannotCreateNewTeam: "Es tut uns sehr leid, das neue Team konnt nicht angelegt werden. Bitte versuche es später noch einmal.",
				cannotJoinTeam: "Du kannst diesem Team nicht beitreten.",
				cannotJoinTeamInviteCodeInvalid: "Dieser Einladungscode ist ungültig. Hast du dich vielleicht nur vertippt?",
			},
		},
	},
	name: "WelcomeChat",
	components: { liquidoInput },
	props: {
		// URL query parameter "?inviteCode=ABC123", mapped in router.js
		inviteCodeQueryParam: { type: String, required: false },
	},
	data() {
		return {
			// user data from input fields
			user: {
				name: undefined,
				email: undefined,
				mobilephone: undefined
			},
			plainPassword: undefined,

			// initialize the value of the input field with the passed inviteCode (if any)
			inviteCodeInputField: this.inviteCodeQueryParam,

			// The "name" of this passkey. To distinguish it from further passkees a user might register later.
			passkeyLabel: undefined,

			// newly created Team, or team loaded from passed inviteCode
			team: {
				//teamName: undefined,
				//inviteCode: "A3F43D",
				//admins: [ ]
			},

			// Our polite and nice chat bot logic :-)
			chatDelayMs: 1000, //window.Cypress || process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" ? 100 : 1000,

			// Semaphore so that the chat animation is only started once. This is for example relevant when the window is reloaded in the browser
			chatAnimationStarted: false,


			
			// Unbelievably clever use case flow status engine (c)2026 :-)
			// Chat bubbles are consecutively blended in along these states.
			FLOW: {
				Welcome: false,
				WhatsYourName: false,
				NicknameInput: false,
				NiceToMeetYou: false,

				InviteCodeValid: false,						// a valid invite code that was also validated at the backend was passed as URL parameter

				CreateOrJoinTeam: false,  					// show CreateOrJoinTeam bubble and the two buttons below

				// Variant A: join an existing team
				JoinTeamForm: false,								
				JoinTeamClicked: false,
				JoinTeamSuccessfull: false,					// user successfully joined an existing team => continue with setup passkey

				// Variant B: create a new team
				CreateTeamForm: false,							// show the create new team form
				CreateTeamClicked: false,						// semaphor to prevent double clicking
				CreateTeamSuccessfull: false,				// user successfully created a new team => continue with setup passkey

				// then continue in both cases
				SetupPasskey: false,
				SetupPasskeyClicked: false,
				SetupPasskeySuccessfull: false,

				RegistrationFinished: false,				// used to disable several inputs & controls in "older" chat messages 
			},			
				
		}
	},
	computed: {
		showLoginButton() {
			return !this.FLOW.NiceToMeetYou
		},
		joinTeamOkButtonDisabled() {
			return this.FLOW.JoinTeamClicked ||
				!this.isInviteCodeSyntaxValid(this.inviteCodeInputField) || 
				!this.isEmailValid(this.user.email)
		},
		createNewTeamOkButtonDisabled() {
			return this.FLOW.CreateTeamClicked || 
					!this.isTeamNameValid(this.team.teamName) || 
					//!this.isMobilephoneValid(this.user.mobilephone) || 
					!this.isAdminEmailValid(this.user.email)  || 
					!this.isPasswordValid(this.plainPassword)	
		},
		inviteLinkURL() {
			return config.inviteLinkPrefix + this.team.inviteCode
		},
	},
	watch: {
		
	},
	created() {
		// If a valid inviteCode was passed as URL parameter, then try to load team
		if (this.isInviteCodeSyntaxValid(this.inviteCodeQueryParam)) {
			this.inviteCodeInputField = this.inviteCodeQueryParam
			api.getTeamForInviteCode(this.inviteCodeInputField)
				.then(team => {
					this.FLOW.InviteCodeValid = true
					log.debug("Invite code is valid for team", team)
					this.team = team
				}).catch(err => {
					console.warn("Cannot find team for invite code", this.inviteCodeQueryParam)		
				})
		} else if (!!this.inviteCodeQueryParam) {
			console.warn("Got inviteCode in URL with invalid syntax.")
		}
	},
	/**
	 * Start the welcome chat bot
	 */
	mounted() {
		if (api.isAuthenticated()) {
			//TODO: Check if user is already logged in. If so, then welcome him. User may want to join yet another existing team.
			this.$root.gotoTeam()
			return
		}

    this.startChatAnimation()

		//this._debugDesignMode() // only for debugging
	},
	methods: {
		/**
		 * Show the first chat bubbles, one by one
		 */
		startChatAnimation() {
			if (this.chatAnimationStarted) return  // start chat animation only once
			this.chatAnimationStarted = true
			this.FLOW.Welcome = true
			this.$root.scrollToTop()
			window.setTimeout(() => {
				this.FLOW.WhatsYourName = true
			}, this.chatDelayMs*2)
			window.setTimeout(() => {
				this.FLOW.NicknameInput = true
				this.$nextTick(() => {
					document.getElementById("userNameInput").focus()
				})
			}, this.chatDelayMs*2.5)
		},

		/* username must not be empty and contain at least n chars */
		isUsernameValid(val) {
			return val !== undefined && val !== null && val.trim().length >= config.usernameMinLength
		},

		/* invite must be ast least 6 chars */
		isInviteCodeSyntaxValid(val) {
			return val !== undefined && val !== null && val.trim().length === config.inviteCodeLength
		},

		isMobilephoneValid(val) {
			return val !== undefined && val !== null && mobilephoneRegEx.test(val)
		},

		/* user's email must match regex */
		isEmailValid(val) {
			return val !== undefined && val !== null && eMailRegEx.test(val)
		},

		isPasswordValid(val) {
			return val !== undefined && val !== null && val.trim().length >= config.minPasswordLength
		},

		/* team name must be at least 6 chars */
		isTeamNameValid(val) {
			return val !== undefined && val !== null && val.trim().length >= 6
		},

		/* admin email must match regex */
		isAdminEmailValid(val) {
			return val !== undefined && val !== null && eMailRegEx.test(val)
		},

		// ========= these methods control the FLOW through our chat ==============

		/* username can be submitted by pressing ENTER or by blurring the field or by clicking on "done" on the iOS keyboard */
		userNameSubmit() {
			this.$refs.userNameInput.validateField(true)
			if (this.FLOW.NicknameInput && this.isUsernameValid(this.user.name)) {
				this.user.name = this.user.name.trim()
				this.FLOW.NiceToMeetYou = true
				document.getElementById("userNameInput").blur()
				setTimeout(() => {
					this.$root.scrollElemToTop(document.getElementById("usernameCard"))
					if (this.FLOW.InviteCodeValid) {
						this.FLOW.CreateOrJoinTeam = true
						this.chooseJoinTeam()
					} else {
						this.FLOW.CreateOrJoinTeam = true
					}
				}, this.chatDelayMs)
			}
		},

		/** User chooses to join an existing team */
		chooseJoinTeam() {
			if (this.FLOW.CreateOrJoinTeam  || this.FLOW.InviteCodeValid) {
				this.FLOW.CreateTeamForm = false
				this.FLOW.JoinTeamForm = true
				this.$nextTick(() => {
					if (this.FLOW.InviteCodeValid) {
						// when invite code was already passed via URL, then jump directly to userEmailInput field.
						document.getElementById("userEmailInput").focus()
					} else {
						document.getElementById("inviteCodeInput").focus()
					}
				})
			}
		},
		cancelCreateOrJoinTeam() {
			// When the user cancels, we keep the already entered data!
			// For example the email can be reused in create new team flow.
			this.FLOW.JoinTeamForm = false
			this.FLOW.JoinTeamClicked = false
			this.FLOW.JoinTeamSuccessfull = false
			this.FLOW.CreateTeamForm = false
			this.FLOW.CreateTeamClicked = false
			this.FLOW.CreateTeamSuccessfull = false
			this.FLOW.CreateOrJoinTeam = true
			this.$root.scrollToBottom()
		},

		/** User chooses to create a new team */
		chooseCreateNewTeam() {
			if (this.FLOW.CreateOrJoinTeam) {
				this.FLOW.JoinTeamForm = false
				this.FLOW.CreateTeamForm = true
				this.$nextTick(() => {
					document.getElementById("teamNameInput").focus()
					this.$root.scrollElemToTop(document.getElementById("createOrJoinButtons"))  
				})
			}
		},

		/** Create a new team */
		createNewTeam() {
			if (this.createNewTeamOkButtonDisabled) return
			this.FLOW.CreateTeamClicked = true  // prevent accidentical second click on button
			this.FLOW.CreateTeamSuccessfull = false
			let admin = {
				name: this.user.name,
				mobilephone: this.user.mobilephone,
				email: this.user.email,
				picture: "Avatar1.png",      //TODO: let user change his data later (Avatar, website but also change mobilephone or email)
				//website: ...
			}
			api.createNewTeam(this.team.teamName, admin, this.plainPassword)
				.then((team) => {
					//Keep in mind: From this point on the user is already logged in! And has a JWT in its browser's localStorage.
					this.team = team
					this.newTeamCreatedSuccessfully()
				})
				.catch((err) => {			//TODO: Error handling: What to do if createTeam call to backend does not work.  Try again?
					let errCode = err?.response?.data?.liquidoErrorCode 
					// err && err.response && err.response && err.response.data ? err.response.data.liquidoErrorCode : undefined
					// https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining  Here Babel is cool. Ey, you need this cool top notch language feature. Just "install" it :-)
					// Update 2025: Optional chaining is now part of the JS standard. So no need to use Babel for this. :-)
					if (errCode === api.err.TEAM_WITH_SAME_NAME_EXISTS) {
						this.$root.showError(this.$t("teamWithSameNameExists"), this.$t("Error"))
					} else 
					//MAYBE: if moblephone or email is already registered, THEN forward to login
					{
						this.$root.showError(this.$t("cannotCreateNewTeam"), this.$t("Error"))
						log.error("Cannot create new team", err)
					}
					this.FLOW.CreateTeamClicked = false
					this.FLOW.CreateTeamSuccessfull = false
					this.FLOW.CreateTeamForm = true
				})
		},

		/**
		 * When creating a new team was successfull, then
		 * Create a QR code for inviting friends to this team,
		 * and then prepare setting up a passkey
		 */
		newTeamCreatedSuccessfully() {
			let QRcodeOpts = { scale: 10 }
			QRCode.toDataURL(this.inviteLinkURL, QRcodeOpts, function (err, url) {
				if (err) {
					console.warn("Cannot create QR code", err)
				} else {
					let img = document.getElementById("qrCodeImg")
					img.src = url
				}
			})
			this.FLOW.CreateTeamSuccessfull = true
			this.$nextTick(() => {
				this.$root.scrollElemToTop(document.getElementById("newTeamCreatedBubble"))
				this.prepareSetupPasskey()
			})
		},

	
		/** User has an inviteCode and entered all data, then he can now join an existing team */
		joinTeam() {
			if (this.joinTeamOkButtonDisabled) return
			this.FLOW.JoinTeamClicked = true
			this.FLOW.JoinTeamSuccessfull = false
			log.info(this.user.name + " <" + this.user.email + "> joins team with invite code " + this.inviteCodeInputField)
			let newMember = {
				name: this.user.name,
				mobilephone: this.user.mobilephone,
				email: this.user.email,
				picture: "Avatar1.png",      //TODO: let user change his Avatar later
				//website: ...
			}
			api.joinTeam(this.inviteCodeInputField, newMember, this.plainPassword)
				.then(team => {
					this.FLOW.JoinTeamSuccessfull = true
					this.team = team
					this.$nextTick(() => {
						this.$root.scrollElemToTop(document.getElementById("JoinTeamForm"))
						setTimeout(() => {
							this.prepareSetupPasskey()
						}, this.chatDelayMs)
					})
				})
				.catch(err => {
					let errCode = err?.response?.data?.liquidoErrorCode
					if (errCode === api.err.CANNOT_JOIN_TEAM_INVITE_CODE_INVALID) {
						this.$root.$refs.rootPopupModal.showError(this.$t("cannotJoinTeamInviteCodeInvalid"), this.$t("Error"))	
					} else {
						log.info("Cannot join team", err)
						this.$root.$refs.rootPopupModal.showError(this.$t("cannotJoinTeam"), this.$t("Error"))
					}					
					this.FLOW.JoinTeamClicked = false
					this.FLOW.JoinTeamSuccessfull = false
					this.FLOW.JoinTeamForm = true
				})
		},


		/**
		 * Prepare setting up a passkey, if the local device supports it.
		 * If not, then we can skip this step and only work with a password.
		 */
		prepareSetupPasskey() {
			this.$root?.$refs?.mobileDebugLogRef?.info("prepareSetupPasskey")
			this.passkeyLabel = this.user.name + "-" + this.$t('Passkey')
			if (webauthnService.isWebAuthnSupported()) {
				this.passkeyLabel = this.user.name + "-" + this.$t('Passkey')
				window.setTimeout(() => {
					this.FLOW.SetupPasskey = true
					this.$nextTick(() => {
						this.$root.scrollElemToTop(document.getElementById("setupPasskeyInfoCard"))			
					})
				}, this.chatDelayMs)
			} else {
				this.FLOW.PassKeyNotSupported = true
				this.FLOW.RegistrationFinished = true
			}
		},
	
		/**
		 * Register a new webauthn passkey at our backend
		 */
		setupPasskey() {
			this.$root?.$refs?.mobileDebugLogRef?.info("setupPasskey: START")
			if (!this.FLOW.SetupPasskey || this.FLOW.SetupPasskeyClicked) return
			this.FLOW.SetupPasskeyClicked = true
			this.FLOW.SetupPasskeySuccessfull = false
			if (!this.passkeyLabel) this.passkeyLabel = this.user.name + "-" + this.$t('Passkey')
			webauthnService.registerWebauthn(this.passkeyLabel)
				.then(res => {
					this.$root?.$refs?.mobileDebugLogRef?.info("setupPasskey: SUCCESSFULL")
					this.FLOW.SetupPasskeySuccessfull = true
					this.FLOW.RegistrationFinished = true
					this.$nextTick(() => {
						this.$root.scrollElemToTop(document.getElementById("setupPasskeyCard"))
					})
				}).catch(err => {
					this.$root?.$refs?.mobileDebugLogRef?.info("setupPasskey: ERROR")
					this.$root?.$refs?.mobileDebugLogRef?.info(err)
					console.log("SetupPasskeyError", err)
					
					// Show root modal with two buttons: Try Again (primary) and Ok Later (secondary)
					this.$root.$refs.rootPopupModal.showInfo(
						this.$t('SetupPasskeyInfoTitle'),
						this.$t('SetupPasskeyInfoMessage'),
						this.$t('TryAgain'),
						this.$t('OkLater')
					)
					/* Subscribe to click events once(!) */
					EventBus.once(EventBus.Events.ROOT_POPUP_CLICK_PRIMARY, () => {
						this.passkeyTryAgain()
					})
					EventBus.once(EventBus.Events.ROOT_POPUP_CLICK_SECONDARY, () => {
						this.passkeyRegisterLater()
					})
				})
		},

		passkeyTryAgain() {
			console.log("Setup passkey again.")
			this.$root.$refs.rootPopupModal.hide()
			this.FLOW.SetupPasskeyClicked = false
			this.FLOW.SetupPasskeySuccessfull = false
			this.FLOW.RegistrationFinished = false
		},
		
		passkeyRegisterLater() {
			console.log("User will setup passkey laster.")
			this.$root.$refs.rootPopupModal.hide()
			this.FLOW.SetupPasskeyClicked = true
			this.FLOW.SetupPasskeySuccessfull = false
			this.FLOW.RegistrationFinished = true
			this.$nextTick(() => {
				this.$root.scrollElemToTop(document.getElementById("setupPasskeyCard"))
			})
		},

		gotoCreatePoll() {
			this.$router.push({name: "createPoll"})
		},

		goToLogin() {
			this.$router.push({ name: 'login' })
		},

		shareLink() {
			if (navigator.share) {
				navigator
					.share({
						title: "LIQUIDO Einladung: " + this.team.teamName,
						//BUGFIX: don't use "text" field, then sharing URLs doesn't work anymore on iOS
						url: this.inviteLinkURL
					})
					.then(() => {
						log.debug("Invite has been sent!")
					})
					.catch(console.error)
			} else {
				log.debug("No native support")
			}
		},

		/**
		 * For debugging the design:
		 * set everything to enabled and shown
		 * and fill in dummy values where possible
		 */
		_debugDesignMode() {
			this.user = {
				name: "Debug User",
				email: "debugtestr@liquido.vote",
				mobilephone: "123 " + Math.round(Math.random()*1000000)
			},
			this.team = {
				teamName: "DummyDesign Team",
				inviteCode: "A3F43D",
				//admins: [ ]
			}
				
			this.passkeyLabel = this.user.name + "-" + this.$t('Passkey')

			this.FLOW.Welcome= true
			this.FLOW.WhatsYourName= true
			this.FLOW.NicknameInput= true
			this.FLOW.NiceToMeetYou= true

			this.FLOW.InviteCodeValid= true

			this.FLOW.CreateOrJoinTeam= true

			// Variant A: join an existing team
			this.FLOW.JoinTeamForm= true					
			this.FLOW.JoinTeamClicked= true
			this.FLOW.JoinTeamSuccessfull= true

			// Variant B: create a new team
			this.FLOW.CreateTeamForm= true
			this.FLOW.CreateTeamClicked= true
			this.FLOW.CreateTeamSuccessfull= true

			// then continue in both cases
			this.FLOW.SetupPasskey= true
			this.FLOW.SetupPasskeyClicked= false
			this.FLOW.SetupPasskeySuccessfull= true

			this.FLOW.RegistrationFinished= true
		}


	},
}
</script>

<style>
/****** Chat bubbles *******/
.chat-bubble {
  border: none;
  margin-bottom: 1rem;
  opacity: 1;
  transform: none;
  max-height: 1000px;
	/* box-shadow: 0.1rem 0.1rem 0.25rem rgba(32, 32, 32, 0.2); */
  -webkit-transition: all 0.5s ease;
  -moz-transition: all 0.5s ease;
  -o-transition: all 0.5s ease;
  transition: all 0.5s ease;
}
.chat-bubble .card-header {
	border: none;
	/*padding: 0.5rem; Bootstrap's default is fine. "Don't be afraid of whitespace!"  :-)  */  
}
.chat-bubble .card-body {
  /*padding: 0.5rem;*/
}
.chat-bubble .card-body ul {
  padding-inline-start: 25px;
}
.chat-bubble .card-body p:last-child {
  margin-bottom: 0;
}

.chat-left {
  position: relative;
	color: #1e3a8a;  /* dark blue */
  background-color: var(--chat-left-bg);
  margin-right: 2rem;
  margin-bottom: 1rem;
  &::before {
    content: '';
    position: absolute;
    bottom: 5px;
    left: -10px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 6px 10px 6px 0;
    border-color: transparent var(--chat-left-bg) transparent transparent;
  }
}

.chat-right {
  position: relative;
  background-color: var(--chat-right-bg);
  margin-left: 2rem;
  margin-bottom: 1rem;
	box-shadow: 0.1rem 0.1rem 0.25rem rgba(32, 32, 32, 0.2);
  &::before {
    content: '';
    position: absolute;
    bottom: 5px;
    right: -10px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 6px 0 6px 10px;
    border-color: transparent transparent transparent var(--chat-right-bg);
  }
}


.hide-left {
	opacity: 0;
	transform: translateX(-20px);
}

.hide-right {
	opacity: 0;
	transform: translateX(20px);
}

.collapse-max-height {
	display: none !important;
	/*
	max-height: 0;
	overflow: hidden;
	margin-top: 0;
	margin-bottom: 0;
	border: none;
	*/
}

.login-link {
	z-index: 999;
	position: fixed;
	bottom: 2rem;
	right: 2rem;
}

#createOrJoinButtons {
	width: 100%;
	height: 40px;
	position: relative;
}
#joinTeamButton {
	position: absolute;
	transition: all 0.5s ease;
	right: 0;
	top: 0;
	width: calc(50% - 5px);
	white-space: nowrap;
	overflow: hidden;
}
#createNewTeamButton {
	position: absolute;
	transition: all 0.5s ease;
	left: 0;
	top: 0;
	width: calc(50% - 5px);
	white-space: nowrap;
	overflow: hidden;
}
#joinTeamOkButton {
	width: 50%
}
#createNewTeamOkButton {
	width: 50%;
}
.moveToCenterFromLeft {
	left: 0 !important;
	width: 100% !important;
	transform: none;
}
.moveToCenterFromRight {
	right: 0 !important;
	width: 100% !important;
	transform: none;
}

.qr-code {
	width: 90%;
	max-width: 300px;
}

.opacity0 {
	opacity: 0;
	width: 0 !important;
}
</style>
