<template>
	<div>
		<!--
			The landing hero. An anonymous visitor sees this first and nothing else: the LIQUIDO mark,
			the claim, and no header. It is deliberately one screen tall MINUS a few rem, so the first
			chat bubble below always runs off the bottom edge. That half-visible bubble is the whole
			"scroll down" hint - no arrow needed.
		-->
		<div id="welcomeHero" class="welcome-hero">
			<!-- Only reserves the spot. The icon itself is #liquidMark, which is position:fixed and
			     therefore out of the flow, because it has to survive the trip into the header. -->
			<div ref="heroIconSlot" class="hero-icon-slot" aria-hidden="true" />
			<liqui-loc-html id="liquidoClaim" class="liquido-hero-claim" tag="p" msg-key="liquidoClaim" />
		</div>

		<!--
			The LIQUIDO mark: the big university icon of the hero, which flows up into the header while
			the visitor scrolls. Teleported to <body> because #appContent is transformed during the
			page-slide transition, and a transformed ancestor would demote this position:fixed element
			to position:absolute halfway through the animation.
		-->
		<Teleport to="body">
			<div id="liquidMark" ref="liquidMark" class="liquid-mark" :class="{ 'liquid-mark--mock': isMockBackend }" aria-hidden="true">
				<div class="liquid-goo">
					<span class="liquid-blob" />
					<span class="liquid-drop liquid-drop--a" />
					<span class="liquid-drop liquid-drop--b" />
				</div>
				<i ref="markIcon" class="fas fa-university liquid-icon" />
			</div>

			<!--
				The one way back in for somebody who already has an account but no JWT on this device -
				a different browser, a new phone. Everyone else registers by simply talking to the chat
				below, so this is the exception path and is deliberately the quietest thing on the page.
			-->
			<button
				v-if="showLoginButton"
				id="welcomeLoginButton"
				class="hero-login"
				type="button"
				@click="goToLogin"
			>
				{{ $t("Login") }}
			</button>

			<!-- Makes the blob and its trailing drops melt into each other instead of looking like
			     three separate circles: blur, then crank up the alpha contrast so the blurred halos
			     snap back into one surface wherever they overlap. -->
			<svg class="liquid-goo-filter" aria-hidden="true" focusable="false">
				<defs>
					<filter id="liquidGoo" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blurred" />
						<feColorMatrix
							in="blurred"
							mode="matrix"
							values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
							result="goo"
						/>
						<feBlend in="SourceGraphic" in2="goo" />
					</filter>
				</defs>
			</svg>
		</Teleport>

		<!-- Welcome -->
		<div id="welcome-chat" :class="{ 'hide-left': !FLOW.Welcome }" class="card chat-bubble chat-left mt-3">
			<liqui-loc-html class="card-body" tag="div" msg-key="welcome" />
		</div>

		<!-- What's your name? -->
		<div :class="{ 'hide-left': !FLOW.WhatsYourName }" class="card chat-bubble chat-left">
			<div class="card-body">
				<liqui-loc-html v-if="FLOW.InviteCodeValid" tag="p" msg-key="hasInviteCodeForTeam" :params="{ adminName: adminName, teamName: team.teamName }" />
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
					:max-length="100"
					:invalid-feedback="$t('userNameInvalid')"
					:disabled="FLOW.NiceToMeetYou"
					@keyup.enter="userNameSubmit()"
					@blur="userNameSubmit()"
				/>

				<!--
					The second way back in. #welcomeLoginButton catches a returning visitor on arrival,
					top right; this catches the one who scrolled straight past it and only realises here -
					asked for a nickname - that they do not need to register at all. A real button, not a
					link inside a message: an @click inside a v-html string never binds.
				-->
				<p v-if="showLoginButton" class="login-in-chat">
					{{ $t("alreadyRegistered") }}
					<button id="welcomeLoginInChat" class="login-in-chat-link" type="button" @click="goToLogin">
						{{ $t("Login") }}
					</button>
				</p>
			</div>
		</div>

		<!-- Nice to meet you bubble -->
		<div :class="{ 'hide-left': !FLOW.NiceToMeetYou }" class="card chat-bubble chat-left">
			<liqui-loc-html class="card-body" tag="div" msg-key="niceToMeetYou" :params="{ nickname: user.name }" />
		</div>

		<!-- create or join a team bubble -->
		<div id="createOrJoinBubble" :class="{ 'hide-left': !FLOW.CreateOrJoinTeam, 'collapse-max-height': FLOW.InviteCodeValid }" class="card chat-bubble chat-left">
			<liqui-loc-html class="card-body" tag="div" msg-key="createOrJoin" />
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
						:placeholder="$t('inviteCodePlaceholder')"
						:valid-func="isInviteCodeSyntaxValid"
						:max-length="100"
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
						:max-length="200"
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
						:max-length="200"
						:invalid-feedback="$t('passwordInvalid')"
						:disabled="FLOW.JoinTeamSuccessfull"
						tabindex="4"
						@keyup.enter="joinTeam()"
					/>

					<div class="d-flex justify-content-between align-items-center">
						<a href="#" tabindex="4" 
							class="cancel-link"
							:class="{ 'invisible' : FLOW.JoinTeamSuccessfull || FLOW.InviteCodeValid }"
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
				<liqui-loc-html tag="p" msg-key="JoinedTeamSuccessfully" :params="{ teamName: team.teamName }" />
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
						:max-length="100"
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
						:max-length="200"
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
						:max-length="200"
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
				<liqui-loc-html tag="h3" msg-key="SetupPasskeyTitle" />
				<liqui-loc-html tag="p" msg-key="SetupPasskeyInfo" />
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
					:min-length="3"
					:max-length="200"
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
				<liqui-loc-html tag="p" msg-key="JoinTeamFinished" :params="{ teamName: team.teamName }" />
				<button
					id="joinedTeamGoToTeamButton"
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
				<button id="inviteCodeButton" :data-invitecode="team.inviteCode" class="btn btn-primary position-relative w-100" @click="shareLink">
					<i class="fas fa-external-link-alt position-absolute top-50 start-0 translate-middle ms-3" />
					{{ $t("shareLink", {teamName: team.teamName, inviteCode: team.inviteCode}) }}
				</button>
				
				<p class="mt-3">{{ $t("scanQrCode") }}</p>
				<div class="text-center mb-3">
					<img id="qrCodeImg" src="" class="qr-code">
				</div>
				<liqui-loc-html tag="p" msg-key="teamInfo" />
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
				<liqui-loc-html tag="p" msg-key="pollInfo" />
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
//import EventBus from "@/services/event-bus.js"
import webauthnService from "@/services/webauthn-service"

const eMailRegEx = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,64}$/

/**
 * How long the landing hero has the stage to itself before the chat starts below it.
 * Deliberately NOT scaled down in dev/test like chatDelayMs: half a second is short enough not to
 * slow anything down, and it is the one beat that makes the page read as a landing page first and
 * a chat second.
 */
const FIRST_BUBBLE_DELAY_MS = 500

/**
 * Over how many pixels of scrolling the LIQUIDO mark travels from the hero into the header.
 * Much shorter than the hero itself, so the mark is home and the header is solid long before the
 * hero has left the screen.
 */
const MARK_TRAVEL_PX = 220

/** How long the mark keeps jiggling after it has landed in the header. */
const MARK_WOBBLE_MS = 750

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Smooth 0..1 ramp between two thresholds - no corners, unlike a plain clamp. */
const smoothstep = (from, to, x) => {
	const t = clamp01((x - from) / (to - from))
	return t * t * (3 - 2 * t)
}

/** Decelerating, no overshoot. */
const easeOutCubic = t => 1 - Math.pow(1 - t, 3)

/**
 * Decelerating WITH a small overshoot: the value sails a little past its target and comes back.
 * This is what keeps the mark from looking like it is on rails - it flows past the header for a
 * moment and then settles, the way a drop of liquid would.
 */
const easeOutBack = (t, overshoot = 0.9) => {
	const c1 = overshoot
	const c3 = c1 + 1
	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}


export default {
	i18n: {
		messages: {
			en: {
				// The punchline on the landing hero, above the fold. Shown as plain text, not as a chat bubble.
				liquidoClaim: "Secure, anonymous, fair and <em>liquid</em> voting for everyone.",
				welcome:
					"<p>Here you do not just vote for <em>one</em> proposal. Everyone on your team sorts the proposals "+
					"by their own preference, and a clever algorithm works out which proposal has the broadest support.</p>",
				alreadyRegistered: "Already have an account?",
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
				// The punchline on the landing hero, above the fold. Shown as plain text, not as a chat bubble.
				liquidoClaim: "Sichere, anonyme, faire und <em>liquide</em> Abstimmungen für alle.",
				welcome:
					"<p>Hier stimmst du nicht nur für <em>einen</em> Vorschlag, sondern jeder in eurem Team sortiert Vorschläge nach der eigenen Präferenz. " + 
					"Ein cleverer Algorithmus berechnet daraus dann den Vorschlag mit der größten Zustimmung.</p>",
				hasInviteCodeForTeam: "Hey, du wurdest von <b>{adminName}</b> in das Team <b>{teamName}</b> eingeladen.",
				whatsYourName: "Darf ich fragen wie du heißt?",
				yourNickname: "Dein Spitzname",
				// Offered under the nickname field, in the chat bot's own "du" voice.
				alreadyRegistered: "Schon dabei?",
				userNameInvalid: "Bitte mindestens " + config.usernameMinLength + " Zeichen!",
				niceToMeetYou: "Hallo <b>{nickname}</b>, freut mich, dich kennen zu lernen!",

				// Create or join team
				createOrJoin: "Möchtest du ein eigenes neues Team gründen? Oder hast du einen Einladungscode bekommen und möchtest einem bestehenden Team beitreten?",

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
				YourEMail: "Deine E-Mail",
				emailPlaceholder: "info@domain.de",
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
				pollInfo: "Möchtest du jetzt gleich eine erste Abstimung für dein Team erstellen?",
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
				email: undefined
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

			// Our polite and nice chat bot logic :-)   Much faster/shorter delay when testing
			chatDelayMs: window.Cypress || import.meta.env.MODE === "development" || import.meta.env.MODE === "test" ? 100 : 1000,

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
		adminName() {
			const firstAdmin = this.team?.members?.find(member => member.role === 'ADMIN')
			return firstAdmin?.user?.name ?? "Admin"
		},
		showLoginButton() {
			return !this.FLOW.NiceToMeetYou
		},
		/** Reddens the mark as a mock-backend warning. See .liquid-mark--mock. */
		isMockBackend() {
			return !!config.mockBackend
		},
		joinTeamOkButtonDisabled() {
			return this.FLOW.JoinTeamClicked ||
				!this.isInviteCodeSyntaxValid(this.inviteCodeInputField) || 
				!this.isEmailValid(this.user.email)
		},
		createNewTeamOkButtonDisabled() {
			return this.FLOW.CreateTeamClicked || 
					!this.isTeamNameValid(this.team.teamName) || 
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
					log.debug("Valid invite code for team", team.teamName)
					this.team = team
				}).catch(err => {
					console.warn("Cannot find team for invite code", this.inviteCodeQueryParam, err)
				})
		} else if (this.inviteCodeQueryParam) {
			console.warn("Got inviteCode in URL with invalid syntax.")
		}
	},
	/**
	 * Start the welcome chat bot
	 */
	mounted() {
		/*
		//TODO: When user is already registered, then
		 Greet him with his username.
		 Offer to login into his existing team.
		 Or let him choose to create or join another team.
		 ====> this is a quite different flow.  => Seperate page???
		*/

    this.startChatAnimation()
		this.initLiquidMark()

		//this._debugDesignMode() // only for debugging
	},
	beforeUnmount() {
		this.teardownLiquidMark()
	},
	methods: {
		/**
		 * Show the first chat bubbles, one by one.
		 * Everything is offset by FIRST_BUBBLE_DELAY_MS, so the hero is alone on screen for a moment
		 * before the conversation starts underneath it.
		 */
		startChatAnimation() {
			if (this.chatAnimationStarted) return  // start chat animation only once
			this.chatAnimationStarted = true
			this.$root.scrollToTop()
			window.setTimeout(() => {
				this.FLOW.Welcome = true
			}, FIRST_BUBBLE_DELAY_MS)
			window.setTimeout(() => {
				this.FLOW.WhatsYourName = true
			}, FIRST_BUBBLE_DELAY_MS + this.chatDelayMs*2)
			window.setTimeout(() => {
				this.FLOW.NicknameInput = true
				this.$nextTick(() => {
					// preventScroll, because the nickname input sits a full screen below the hero: without
					// it the browser would yank the landing page out of view before it has been read.
					document.getElementById("userNameInput")?.focus({ preventScroll: true })
				})
			}, FIRST_BUBBLE_DELAY_MS + this.chatDelayMs*2.5)
		},

		// ========= the LIQUIDO mark flowing from the hero into the header ==============

		/**
		 * The big university icon in the hero is not an icon in the page flow - it is #liquidMark, a
		 * position:fixed element that sits exactly on top of the empty slot in the hero and flows into
		 * the header's own icon as the visitor scrolls.
		 *
		 * Doing it with one element that never changes parents is what keeps the morph seamless: the
		 * header hides its own icon for as long as the mark is alive (store.heroMarkActive), so there
		 * is no hand-over at the end and therefore nothing that could flicker.
		 *
		 * All state here lives on `this` OUTSIDE of data(): it is rewritten on every animation frame
		 * and must not drag Vue's reactivity - and the render itself only ever touches inline styles.
		 */
		initLiquidMark() {
			this.$store.setHeroMarkActive(true)
			this.markRaf = undefined
			this.markLanded = false
			this.markWobbleStartedAt = 0
			this.markEndScale = 0.25
			this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
			this.markScrollElem = document.getElementById("app") || document.scrollingElement
			// Synchronously, before the first paint: without it the header would flash in fully opaque
			// for one frame, because its CSS falls back to "no hero" when --hero-progress is unset.
			document.documentElement.style.setProperty("--hero-progress", "0")
			this.onMarkScroll = () => this.requestMarkFrame()
			// --hero-mark-size is a vw clamp, so a resize can change how far the mark has to shrink.
			this.onMarkResize = () => {
				this.measureLiquidMark()
				this.requestMarkFrame()
			}
			this.markScrollElem?.addEventListener("scroll", this.onMarkScroll, { passive: true })
			window.addEventListener("resize", this.onMarkResize, { passive: true })
			this.$nextTick(() => {
				this.measureLiquidMark()
				this.renderLiquidMark()
			})
		},

		teardownLiquidMark() {
			this.markScrollElem?.removeEventListener("scroll", this.onMarkScroll)
			window.removeEventListener("resize", this.onMarkResize)
			if (this.markRaf) window.cancelAnimationFrame(this.markRaf)
			document.documentElement.style.removeProperty("--hero-progress")
			this.$store.setHeroMarkActive(false)
		},

		/** Coalesce a burst of scroll events into one render per frame. */
		requestMarkFrame() {
			if (this.markRaf) return
			this.markRaf = window.requestAnimationFrame(() => {
				this.markRaf = undefined
				this.renderLiquidMark()
			})
		},

		/**
		 * How far the mark has to shrink. Measured from the two FONT SIZES rather than from the two
		 * bounding boxes, because the mark's box also holds the blob behind the icon - it is the
		 * glyphs that have to end up the same size.
		 */
		measureLiquidMark() {
			const headerIcon = document.querySelector("#liquidoHeader .liquido-claim i")
			const markIcon = this.$refs.markIcon
			if (!headerIcon || !markIcon) return
			const from = parseFloat(window.getComputedStyle(markIcon).fontSize)
			const to = parseFloat(window.getComputedStyle(headerIcon).fontSize)
			if (from > 0 && to > 0) this.markEndScale = to / from
		},

		/**
		 * One frame of the morph. Position, size and shape are deliberately NOT in step:
		 *
		 *  - position leads and overshoots slightly (easeOutBack), so the mark arrives and settles
		 *    instead of stopping dead,
		 *  - size lags a few percent behind (easeOutCubic on a delayed t), so the mark is still big
		 *    while it is already moving - the follow-through that makes it read as liquid being
		 *    pulled up rather than a picture being scaled down,
		 *  - and it squashes and stretches along the direction of travel, hardest in the middle of
		 *    the journey where it is fastest.
		 */
		renderLiquidMark() {
			const mark = this.$refs.liquidMark
			const slot = this.$refs.heroIconSlot
			if (!mark || !slot) return
			const headerIcon = document.querySelector("#liquidoHeader .liquido-claim i")

			// --- read ---
			const scrollTop = this.markScrollElem ? this.markScrollElem.scrollTop : window.scrollY
			const p = clamp01(scrollTop / MARK_TRAVEL_PX)
			const from = slot.getBoundingClientRect()          // scrolls away with the page
			const to = headerIcon ? headerIcon.getBoundingClientRect() : from   // invisible, but it keeps its box

			const pPos = this.reduceMotion ? p : easeOutBack(p)
			const pSize = this.reduceMotion ? p : easeOutCubic(clamp01((p - 0.12) / 0.88))

			// Fastest in the middle, nothing at either end. The exponent skews the peak towards the
			// start, where the mark breaks away from the hero.
			let stretch = this.reduceMotion ? 0 : Math.sin(Math.PI * Math.pow(p, 0.7)) * 0.85
			stretch += this.markWobble()

			const scale = 1 + (this.markEndScale - 1) * pSize
			const cx = (from.left + from.width / 2) + ((to.left + to.width / 2) - (from.left + from.width / 2)) * pPos
			const cy = (from.top + from.height / 2) + ((to.top + to.height / 2) - (from.top + from.height / 2)) * pPos

			// --- write ---
			mark.style.transform =
				`translate3d(${(cx - mark.offsetWidth / 2).toFixed(2)}px, ${(cy - mark.offsetHeight / 2).toFixed(2)}px, 0) ` +
				`scale(${(scale * (1 - 0.17 * stretch)).toFixed(4)}, ${(scale * (1 + 0.24 * stretch)).toFixed(4)})`
			mark.style.setProperty("--goo", Math.abs(stretch).toFixed(3))
			// The blob evaporates on arrival, leaving just the icon - the header has no disc behind it.
			mark.style.setProperty("--blob-opacity", (1 - smoothstep(0.6, 1, p)).toFixed(3))
			document.documentElement.style.setProperty("--hero-progress", p.toFixed(3))

			// Landing: give it one short settle, but only on the way in.
			const landed = p > 0.995
			if (landed && !this.markLanded && !this.reduceMotion) this.markWobbleStartedAt = performance.now()
			this.markLanded = landed
		},

		/**
		 * A damped oscillation that decays to zero, added on top of the squash & stretch when the mark
		 * touches down in the header. Returns 0 (and costs nothing) once it has died away.
		 */
		markWobble() {
			if (!this.markWobbleStartedAt) return 0
			const t = (performance.now() - this.markWobbleStartedAt) / MARK_WOBBLE_MS
			if (t >= 1) {
				this.markWobbleStartedAt = 0
				return 0
			}
			this.requestMarkFrame()  // nothing else is driving frames while the user holds still
			const decay = (1 - t) * (1 - t)
			return Math.sin(t * Math.PI * 3) * decay * 0.45
		},

		/* username must not be empty and contain at least n chars */
		isUsernameValid(val) {
			return val !== undefined && val !== null && val.trim().length >= config.usernameMinLength
		},

		/* invite must be ast least 6 chars */
		isInviteCodeSyntaxValid(val) {
			return val !== undefined && val !== null && val.trim().length === config.inviteCodeLength
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

		/**
		 * Ask the backend to send the welcome mail, after the user has successfully registered.
		 *
		 * Deliberately fire-and-forget: not awaited, and a failure is only logged. The registration
		 * has already succeeded at this point, so a mail problem must not block the chat from moving
		 * on or show the user an error about something they cannot act on.
		 *
		 * The backend picks the admin or member variant itself from the JWT, so both the createNewTeam
		 * and the joinTeam path call this the same way.
		 */
		sendWelcomeMail() {
			api.sendWelcomeMail()
				.catch(err => log.warn("Could not send welcome mail (registration itself was fine)", err))
		},

		/** Create a new team */
		createNewTeam() {
			if (this.createNewTeamOkButtonDisabled) return
			this.FLOW.CreateTeamClicked = true  // prevent accidentical second click on button
			this.FLOW.CreateTeamSuccessfull = false
			let admin = {
				name: this.user.name,
				email: this.user.email,
				picture: "Avatar1.png",      //TODO: let user change his data later (Avatar, website but also change email)
				//website: ...
			}
			api.createNewTeam(this.team.teamName, admin, this.plainPassword)
				.then((team) => {
					//Keep in mind: From this point on the user is already logged in! And has a JWT in its browser's localStorage.
					this.team = team
					this.sendWelcomeMail()
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
				email: this.user.email,
				picture: "Avatar1.png",      //TODO: let user change his Avatar later
				//website: ...
			}
			api.joinTeam(this.inviteCodeInputField, newMember, this.plainPassword)
				.then(team => {
					this.FLOW.JoinTeamSuccessfull = true
					this.team = team
					this.sendWelcomeMail()
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
			// Passkeys can't be driven from an automated test by clicking through a real ceremony -
			// that's the whole point of them. A headless Cypress browser has no authenticator, and
			// navigator.credentials.create() just hangs instead of failing fast, so by default take
			// the same "failed" path a real ceremony failure would take. The one exception: a spec
			// that has registered a Chrome DevTools Protocol virtual authenticator (see
			// setupVirtualAuthenticator() in happy-case.cy.js) sets window.__cypressWebAuthnAvailable
			// first, in which case the real call below genuinely succeeds against that authenticator.
			const registerPromise = (window.Cypress && !window.__cypressWebAuthnAvailable)
				? Promise.reject(new Error("Passkey registration is not testable in Cypress"))
				: webauthnService.registerWebauthn(this.passkeyLabel)
			registerPromise
				.then(() => {
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
					this.$root.showInfo(
						this.$t('SetupPasskeyInfoMessage'),
						this.$t('SetupPasskeyInfoTitle'),
						this.$t('TryAgain'),
						this.$t('OkLater'),
						() => { this.passkeyTryAgain() },
						() => { this.passkeyRegisterLater() }
					)
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
			this.$router.push({name: "newPoll"})
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
		 * show all bubbles and fill in dummy data 
		 */
		_debugDesignMode() {
			this.user = {
				name: "Debug User",
				email: "debugtestr@liquido.vote"
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

<style scoped>

/****** Landing hero *******/

/*
 * One screen tall MINUS 8rem, so that the first chat bubble underneath always runs off the bottom
 * edge of the phone. That cut-off bubble is the scroll hint - which is why the 8rem is a fixed
 * value and not a fraction: it has to stay smaller than a chat bubble at every viewport size.
 * #appContent already pads the header height and the safe area away above us, so subtract both.
 *
 * The mark and the claim sit near the TOP of that box rather than in its middle: the icon is the
 * first thing on the page, and the empty space below the claim is what the bubble grows into.
 */
.welcome-hero {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	gap: var(--two);
	min-height: calc(100vh - var(--liquido-header-height) - env(safe-area-inset-top) - 8rem);
	min-height: calc(100svh - var(--liquido-header-height) - env(safe-area-inset-top) - 8rem);
	padding-top: clamp(1.5rem, 6vh, 3rem);
	padding-bottom: var(--unit);
	text-align: center;
}

/* Reserves the mark's place in the hero. #liquidMark is position:fixed and out of the flow. */
.hero-icon-slot {
	flex: none;
	width: var(--hero-mark-size);
	height: var(--hero-mark-size);
}

.liquido-hero-claim {
	margin: 0;
	max-width: 20rem;
	font-family: var(--serif-font);
	font-size: clamp(1.45rem, 6.8vw, 2.1rem);
	line-height: 1.35;
	color: var(--primary);
	text-wrap: balance;   /* no lonely "alle." on a line of its own */
	animation: claim-rise 900ms 200ms cubic-bezier(0.22, 0.9, 0.24, 1) both;
}

.liquido-hero-claim :deep(em) {
	font-style: italic;
}

@keyframes claim-rise {
	from { opacity: 0; transform: translateY(1.25rem); }
	to   { opacity: 1; transform: none; }
}


/****** The LIQUIDO mark, flowing from the hero into the header *******/

/*
 * Teleported to <body>, so no ancestor transform can turn this position:fixed element into a
 * position:absolute one mid-flight. renderLiquidMark() writes the transform, --goo (how hard it is
 * being stretched right now) and --blob-opacity on every frame; everything else is expressed
 * relative to those, so the JS never has to know about colours or shapes.
 */
.liquid-mark {
	--goo: 0;
	--blob-opacity: 1;
	position: fixed;
	left: 0;
	top: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--hero-mark-size);
	height: var(--hero-mark-size);
	transform-origin: center center;
	pointer-events: none;   /* never steals a tap, and never "covers" an element for Cypress */
	will-change: transform;
	z-index: 10000;         /* one above #liquidoHeader: once it lands, the mark IS the header's icon */
}

.liquid-goo {
	position: absolute;
	inset: 0;
	opacity: var(--blob-opacity);
	filter: url(#liquidGoo);
}

.liquid-blob {
	position: absolute;
	inset: 0;
	background: var(--light-bg);
	/* Never quite a circle, and never the same shape twice. This is what makes the mark look like a
	   drop of liquid even while the page is standing still. */
	border-radius: 58% 42% 46% 54% / 47% 52% 48% 53%;
	animation: blob-morph 7s ease-in-out infinite;
}

/*
 * Two smaller drops that only leave the blob while it is actually moving (--goo). The gooey filter
 * melts them back into it, so they read as liquid being dragged behind rather than as loose circles.
 */
.liquid-drop {
	position: absolute;
	left: 50%;
	top: 50%;
	background: var(--light-bg);
	border-radius: 50%;
	opacity: calc(var(--goo) * 1.6);
}
/* Trails just far enough to bulge out of the blob's lower edge, never far enough to come loose. */
.liquid-drop--a {
	width: 24%;
	height: 24%;
	transform: translate(-85%, calc(-50% + var(--goo) * 300%));
}
/* This one does come loose, and the filter draws the neck between the two while it goes. */
.liquid-drop--b {
	width: 15%;
	height: 15%;
	transform: translate(55%, calc(-50% + var(--goo) * 560%));
}

.liquid-icon {
	position: relative;   /* above .liquid-goo, and NOT inside the blur */
	font-size: calc(var(--hero-mark-size) * 0.52);
	line-height: 1;
	color: var(--primary);
}

/*
 * config.mockBackend is on, so there is no backend at all behind this page - liquido-header.vue
 * reddens the LIQUIDO mark to say so. On THIS page the header's own icon is invisible and the mark
 * stands in for it, so the warning has to be painted here instead.
 *
 * It is red for the whole flight, hero included, not only once it has landed in the header: a
 * warning that appears after you scroll is a warning you can miss. The blob stays brand blue, so
 * the red reads as a state and not as a redesign.
 */
.liquid-mark--mock .liquid-icon {
	color: var(--destructive);
}

/*
 * The Login, top right. Three things about it are deliberate:
 *
 * 1. It does NOT fade in along --hero-progress the way everything else in the header does. A
 *    returning visitor arrives at the top of the page, and that is exactly where they look for the
 *    way in - so it has to be readable in the very first frame, over a header that is still
 *    completely transparent.
 * 2. The whole box is the tap target, not the few glyphs of the word: it takes the header's full
 *    height and at least its height in width, so it covers the same corner block as the header's
 *    own .header-right and is comfortable to hit with a thumb.
 * 3. It stays quiet - text, no button chrome. Registering here means talking to the chat, so the
 *    page itself is the primary call to action and this is the exception path. The mark is the one
 *    loud thing on this screen and it keeps the stage to itself.
 *
 * env(safe-area-inset-top) rather than 0, to line up with .is-pwa #liquidoHeader, which pads itself
 * down by exactly that when LIQUIDO runs from the home screen.
 */
.hero-login {
	position: fixed;
	top: env(safe-area-inset-top, 0px);
	right: 0;
	z-index: 10001;   /* above #liquidoHeader (9999) and above the mark (10000) */
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: var(--liquido-header-height);
	height: var(--liquido-header-height);
	padding: 0 var(--unit);
	border: 0;
	background: none;
	font-family: inherit;
	font-size: 0.9375rem;
	line-height: 1;
	color: var(--primary);
	text-decoration: underline;
	text-decoration-color: var(--light-border);
	text-underline-offset: 3px;
	cursor: pointer;
}

.hero-login:hover {
	text-decoration-color: var(--primary);
}
.hero-login:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: -4px;
	border-radius: var(--liquido-border-radius);
}

/*
 * The Login's second home, under the nickname field. The top-right one catches a returning visitor
 * on arrival; this one catches them at the moment of commitment, when the chat asks for a nickname
 * and they realise they already have an account.
 *
 * It stays quieter than the top-right one and quieter still than the field above it: the nickname
 * IS the primary action in this card, and a returning visitor is the rare case. Padding on the link
 * with matching negative margins buys a thumb-sized hit area without moving the text, which a bare
 * one-line link would not give.
 */
.login-in-chat {
	margin: 0;
	text-align: right;
	font-size: var(--font-size-small);
	color: var(--secondary);
}

.login-in-chat-link {
	display: inline-block;
	padding: 0.4rem 0.25rem;
	margin: -0.4rem -0.25rem;
	border: 0;
	background: none;
	font: inherit;
	color: var(--primary);
	text-decoration: underline;
	text-decoration-color: var(--light-border);
	text-underline-offset: 3px;
	cursor: pointer;
}
.login-in-chat-link:hover {
	text-decoration-color: var(--primary);
}
.login-in-chat-link:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: 0;
	border-radius: var(--liquido-border-radius);
}

/* The filter only has to exist; it must not take up any space. */
.liquid-goo-filter {
	position: absolute;
	width: 0;
	height: 0;
	pointer-events: none;
}

@keyframes blob-morph {
	0%, 100% { border-radius: 58% 42% 46% 54% / 47% 52% 48% 53%; }
	25%      { border-radius: 45% 55% 62% 38% / 55% 41% 59% 45%; }
	50%      { border-radius: 52% 48% 38% 62% / 60% 55% 45% 40%; }
	75%      { border-radius: 63% 37% 53% 47% / 42% 58% 42% 58%; }
}

/* renderLiquidMark() already drops the overshoot, the squash and the wobble; this takes care of the
   two animations that run on their own. */
@media (prefers-reduced-motion: reduce) {
	.liquido-hero-claim { animation: none; }
	.liquid-blob { animation: none; border-radius: 50%; }
}


.date-pill {
	font-size: 0.7rem;
	font-family:'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
	opacity: 0.5;
	color: var(--text-color);
	background-color: var(--tertiary);
	border-radius: 1rem;
	padding: 0.1rem 0.5rem;
	text-align: center;
	width: fit-content;
	margin: 0.5rem auto;
}

/****** Chat bubbles *******/
.chat-bubble {
  /* border: none; */
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
/*
.chat-bubble .card-body {
  padding: 0.5rem;
}
*/
.chat-bubble .card-body ul {
  padding-inline-start: 25px;
}
.chat-bubble .card-body p:last-child {
  margin-bottom: 0;
}

.chat-left {
  position: relative;
	color: var(--chat-left-color);
  background-color: var(--chat-left-bg);
	border-color: var(--chat-left-border-color);
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
  color: var(--chat-right-color);
  background-color: var(--chat-right-bg);
	border-color: var(--chat-right-border-color);
  margin-left: 2rem;
  margin-bottom: 1rem;
	box-shadow: var(--liquido-shadow);
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
