<template>
	<div>
		<div id="welcome-chat" class="mt-3">
			<b-card id="welcomeBubble" :class="{ 'hide-left': flowState < 1 }" class="chat-bubble shadow-sm">
				<b-card-text v-html="$t('welcome')" />
			</b-card>

			<b-card :class="{ 'hide-left': flowState < 2 }" class="chat-bubble shadow-sm">
				<b-card-text v-html="$t('whatsYourName')" />
			</b-card>

			<b-card :class="{ 'hide-right': flowState < 3 }" class="chat-bubble shadow-sm chat-right">
				<liquido-input
					id="userNameInput"
					ref="userNameInput"
					v-model="user.name"
					class="mb-3"
					:label="$t('yourNickname')"
					:valid-func="isUsernameValid"
					:maxlength="100"
					:invalid-feedback="$t('userNameInvalid')"
					:disabled="flowState != 3"
					@keyup.enter="userNameSubmit"
					@blur="userNameSubmit"
				/>
			</b-card>

			<div :class="{ 'collapse-max-height': flowState < 4 }" class="transition-all">
				<b-card :class="{ 'hide-left': flowState < 4 }" class="chat-bubble shadow-sm">
					<b-card-text v-html="$t('niceToMeetYou', { nickname: user.name })" />
				</b-card>
			</div>


			<!-- create or join a team buttons -->
			<div :class="{ 'collapse-max-height': flowState < 5 }" class="transition-all">
				<b-card	id="createOrJoinBubble"	:class="{ 'hide-left': flowState < 5 }"	class="chat-bubble shadow-sm">
					<b-card-text v-html="$t('createOrJoin')" />
				</b-card>

				<div id="joinOrCreateButtons" :class="{ 'hide-left': flowState < 6 }" class="mb-3 transition-all">
					<button
						id="joinTeamButton"
						:class="{
							'btn-primary': true,
							'moveToCenterFromLeft active': flowState >= 10 && flowState <= 12,
							opacity0: ![6,10,11,12].includes(flowState),
						}"
						class="btn"
						@click="chooseJoinTeam()"
					>
						{{ $t("joinTeamButton") }}
					</button>
					<button
						id="createNewTeamButton"
						:class="{
							'btn-primary': true,
							'moveToCenterFromRight active': flowState >= 20,
							opacity0: [10,11,12].includes(flowState),
						}"
						class="btn"
						@click="chooseCreateNewTeam()"
					>
						{{ $t("createNewTeamButton") }}
					</button>
				</div>
			</div>

			<!-- Join a team - form (flowState == 10) -->
			<b-card :class="{ 'collapse-max-height': ![10,11,12].includes(flowState) }" class="chat-bubble chat-right">
				<form id="joinTeamForm">
					<liquido-input
						id="inviteCodeInput"
						ref="inviteCodeInput"
						v-model="inviteCode"
						class="mb-3"
						:label="$t('inviteCode')"
						placeholder="ABC123"
						:valid-func="isInviteCodeValid"
						:maxlength="100"
						:invalid-feedback="$t('inviteCodeInvalid')"
						:disabled="flowState !== 10"
						tabindex="1"
					/>

					<liquido-input
						id="userMobilephoneInput"
						ref="userMobilephoneInput"
						v-model="user.mobilephone"
						class="mb-3"
						:label="$t('yourMobilephone')"
						:placeholder="$t('mobilephonePlaceholder')"
						:valid-func="isMobilephoneValid"
						:maxlength="100"
						:invalid-feedback="$t('mobilephoneInvalid')"
						:disabled="flowState !== 10"
						tabindex="2"
					/>

					<liquido-input
						id="userEmailInput"
						ref="userEmailInput"
						v-model="user.email"
						class="mb-3"
						:label="$t('yourEMail')"
						:placeholder="$t('emailPlaceholder')"
						:valid-func="isEmailValid"
						:maxlength="200"
						:invalid-feedback="$t('emailInvalid')"
						:disabled="flowState !== 10"
						tabindex="3"
					/>

					<div class="d-flex justify-content-between align-items-end">
						<small :class="{ invisible: flowState !== 10 }" class="ms-1">
							<a href="#" tabindex="4" @click="cancelJoinTeam()">{{ $t("Cancel") }}</a>
						</small>
						<b-button
							id="joinTeamOkButton"
							:disabled="joinTeamOkButtonDisabled"
							variant="primary"
							tabindex="3"
							@click="joinTeam()"
						>
							{{ $t("Ok") }}
							<i class="fas fa-angle-double-right" />
						</b-button>
					</div>
				</form>
			</b-card>

			<!--Joined team successfully (flowState == 12) -->
			<b-card	id="joinedTeamBubble"	:class="{ 'collapse-max-height': flowState !== 12 }" class="chat-bubble shadow-sm">
				<p v-html="$t('joinedTeamSuccessfully', { teamName: team.teamName })" />
				<b-button
					id="joinedTeamGoToTeamButton"
					variant="primary"
					class="float-right mb-1"
					@click="gotoTeam"
				>
					{{ $t("gotoTeam") }}
					<i class="fas fa-angle-double-right" />
				</b-button>
			</b-card>






			<!-- Create a new team - form (flowState == 20) -->

			<b-card :class="{ 'collapse-max-height': ![20,21,22].includes(flowState) }" class="chat-bubble chat-right">
				<form id="createNewTeamForm">
					<liquido-input
						id="teamNameInput"
						ref="teamNameInput"
						v-model="team.teamName"
						class="mb-3"
						:label="$t('teamName')"
						:valid-func="isTeamNameValid"
						:maxlength="100"
						:invalid-feedback="$t('teamNameInvalid')"
						:disabled="flowState !== 20"
						tabindex="1"
					/>

					<liquido-input
						id="adminMobilephoneInput"
						ref="adminMobilephoneInput"
						v-model="user.mobilephone"
						class="mb-3"
						:label="$t('yourMobilephone')"
						:placeholder="$t('mobilephonePlaceholder')"
						:valid-func="isMobilephoneValid"
						:maxlength="100"
						:invalid-feedback="$t('mobilephoneInvalid')"
						:disabled="flowState !== 20"
						tabindex="2"
					/>

					<liquido-input
						id="adminEmailInput"
						ref="adminEmailInput"
						v-model="user.email"
						class="mb-3"
						:label="$t('adminEmail')"
						:valid-func="isAdminEmailValid"
						:maxlength="200"
						:invalid-feedback="$t('emailInvalid')"
						:disabled="flowState !== 20"
						tabindex="3"
						@keyup.enter="createNewTeam()"
					/>

					<small class="ml-1">{{ $t("youWillBecomeAdmin") }}</small>

					<div class="d-flex justify-content-between align-items-center mt-3">
						<small :class="{ invisible: flowState !== 20 }" class="ms-1">
							<a href="#" tabindex="4" @click="cancelCreateNewTeam()">{{ $t("Cancel") }}</a>
						</small>
						<b-button
							id="createNewTeamOkButton"
							:disabled="createNewTeamOkButtonDisabled"
							variant="primary"
							tabindex="3"
							@click="createNewTeam()"
						>
							{{ $t("Ok") }}
							<i class="fas fa-angle-double-right" />
						</b-button>
					</div>
				</form>
			</b-card>

			<!-- New team created successfully (flowState == 22) -->

			<b-card	id="newTeamCreatedBubble"	:class="{ 'collapse-max-height': flowState !== 22 }" class="chat-bubble shadow-sm">
				<p>{{ $t("teamCreated") }}</p>
				<p class="text-center mb-2">
					<a id="inviteLink" :href="inviteLinkURL" @click.prevent="shareLink()">
						{{ $t("shareThisLink", {inviteCode: team.inviteCode}) }}
						<i class="fas fa-external-link-alt" />
					</a>
				</p>
			</b-card>

			<b-card	:class="{ 'collapse-max-height': flowState !== 22 }" class="chat-bubble shadow-sm">
				<p>{{ $t("scanQrCode") }}</p>
				<div class="text-center">
					<img id="qrCodeImg" src="" class="qr-code">
				</div>
				<p v-html="$t('teamInfo')" />
				<b-button
					id="gotoTeamButton"
					variant="primary"
					class="float-right mb-3"
					@click="gotoTeam"
				>
					<i class="fas fa-users" />
					{{ $t("gotoTeam") }}
					<i class="fas fa-angle-double-right" />
				</b-button>
			</b-card>

			<b-card :class="{ 'collapse-max-height': flowState !== 22 }" class="chat-bubble shadow-sm">
				<p v-html="$t('pollInfo')" />
				<b-button
					id="gotoCreatePollButton"
					variant="primary"
					class="float-right mb-3"
					@click="gotoCreatePoll()"
				>
					<i class="fas fa-user-shield" />
					{{ $t("createPoll") }}
					<i class="fas fa-angle-double-right" />
				</b-button>
			</b-card>
		</div> <!-- end of container -->
	</div>
</template>

<script>
import config from "config"
import QRCode from "qrcode"
import liquidoInput from "@/components/liquido-input"
import api from "@/services/liquido-graphql-client"
const log = require("loglevel")

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

				teamCreated: "Ok your team has been created. Now you can invite your friends to join your team:",
				shareThisLink: "Share this link",
				tellInvitationCode: "or tell them your invitation code:",
				scanQrCode: "or let them scan this QR code:",
				createPoll: "Create a poll",
			},
			de: {
				welcome:
					"<p>Willkommen bei <span class='liquido'></span>, der freien, sicheren und liquiden e-voting App für euer Team.</p>"+
					"<p>In Liquido wählst du nicht einfach nur einen Vorschlag oder stimmst nur für einen Kandidaten. Stattdessen sortiert jeder im Team "+
					"Wahlvorschläge nach seiner eigenen Priorität. Liquido berechnet daraus dann mit einem cleveren Algorithmus den Sieger der Wahl.</p>",
				whatsYourName: "Darf ich fragen wie du heißt?",
				yourNickname: "Dein Spitzname",
				userNameInvalid: "Bitte mindestens " + config.usernameMinLength + " Zeichen!",
				niceToMeetYou: "Hallo <b>{nickname}</b> ! Schön dich kennen zu lernen.",
				createOrJoin: "Möchtest du <ul><li>mit einem Einladungscode einem bestehenden <b>Team beitreten</b></li><li>oder möchtest du ein <b>neues Team gründen?</b></li></ul>",

				joinTeamButton: "Team beitreten",
				inviteCode: "Einladungscode",
				inviteCodeInvalid: "Einladungscode muss genau 6 Zeichen lang sein.",
				yourMobilephone: "Deine Handynummer",
				mobilephonePlaceholder: "+49 555 111111",
				mobilephoneInvalid: "Keine gültige Handynummer",
				yourEMail: "Deine E-Mail",
				emailPlaceholder: "info{'@'}domain.de",
				emailInvalid: "E-Mail ungültig",

				joinedTeamSuccessfully: "Herzlich willkommen im Team <b>{teamName}</b>. Viel Spaß beim Abstimmen und Wählen!",
				gotoTeam: "Zum Team",

				createNewTeamButton: "Neues Team",
				teamName: "Team Name",
				teamNameInvalid: "Bitte mindestens 6 Zeichen als Teamname!",
				adminEmail: "Admin E-Mail",
				youWillBecomeAdmin: "Du wirst Admin des neuen Teams.",

				teamCreated: "Ok, dein Team ist angelegt. Du kannst jetzt deine Freunde in dein Team einladen.",
				shareThisLink: "Teile diesen Link ({inviteCode})",
				tellInvitationCode: "Oder nutze einfach diesen Einadungscode:",
				scanQrCode: "Oder lass sie diesen QR code scannen:",
				teamInfo: "Du findest diese Infos später jederzeit wieder auf eurer Team Seite.",
				pollInfo: 
					"Möchtest du jetzt gleich eine erste Abstimung (<i class='fas fa-poll'></i>) für dein Team erstellen? Jedes Teammitglied kann dann " +
					"seinen eigenen Wahlvorschlag (<i class='fas fa-vote-yea'></i>) hinzufügen.",
				createPoll: "Abstimmung anlegen",

				teamWithSameNameExists: "Ein Team mit diesem Namen existiert bereits. Bitte wählen einen anderen Namen für dein Team.",
				cannotCreateNewTeam: "Es tut uns sehr leid, das neue Team konnt nicht angelegt werden. Bitte versuche es später noch einmal.",
				cannotJoinTeam: "Du kannst diesem Team nicht beitreten.",
				cannotJoinTeamInviteCodeInvalid: "Dieser Einladungscode ist ungültig. Hast du dich vielleicht nur vertippt?",
			},
		},
	},
	name: "WelcomeChat",
	components: { liquidoInput },
	data() {
		return {
			user: {
				name: undefined,
				email: undefined,
				mobilephone: undefined
			},

			inviteCode: undefined,    // inviteCode when joining an existing team

			// newly created or joined Team
			team: {
				//name: undefined,
				//inviteCode: "A3F43D",
				//inviteLink: "http://liquido.me/invite/A3F43D_static",
				//qrCode: "/img/qrcode.svg",
			},

			/*
				user flow:   chat bubbles are consecutively blended in along this flowState.
				 0 - empty chat
				 1 - first welcome message bubble
				 2 - blend in: What's your name
				 3 - blend in: nickname input
				 4 - Nice to meet you bubble
				 5 - create or join Team bubble
				 6 - create or join Team buttons
				 
				 10 - join a team form
				 11 - clicked on joinTeam button, waiting for server reply
				 12 - new team joined successfully

				 20 - create new team form
				 21 - clicked on createTeam button,  waiting for server reply
				 22 - new team created successfully

				 TODO: 24 - add first poll in new team (optional)
				 
			*/
			flowState: 0,

			//Semaphore so that the chat animation is only started once. This is for example relevant when the window is reloaded in the browser
			chatAnimationStarted: false,
		}
	},
	computed: {
		joinTeamOkButtonDisabled() {
			return !this.isInviteCodeValid(this.inviteCode) || 
						!this.isEmailValid(this.user.email) || 
						this.flowState > 10
		},
		createNewTeamOkButtonDisabled() {
			return !this.isTeamNameValid(this.team.teamName) || 
						!this.isMobilephoneValid(this.user.mobilephone) || 
						!this.isAdminEmailValid(this.user.email)  || 
						this.flowState > 20
		},
		inviteLinkURL() {
			return config.inviteLinkPrefix + this.team.inviteCode
		},
	},
	watch: {
		/*
		"flowState": function(newVal, oldVal) {
			log.debug(" ====>>> flowState", oldVal, "=>", newVal)
		}
		*/		
	},
	created() {
		
	},
	/**
	 * Here we check if the backend is available.
	 * If not, then we show an error modal.
	 * If the backend is available, but the user's browser has an expired JWT,
	 * this means that the user is registered. Then we forward him to the login page.
	 * By default scroll to the top of the page (e.g. when reloading the page)
	 * When the bottom of the #welcomeBubble becomes visible (or already is visible on larger screens)
	 * then start the chat animation ONCE
	 */
	mounted() {
		document.getElementsByTagName("html").scrollTop = 0

		//TODO: Check if user is already logged in. If so, then welcome him.

		this.flowState = 0
    this.startChatAnimation()
	},
	methods: {
		/**
		 * Show the first chat bubbles, one by one
		 */
		startChatAnimation() {
			if (this.chatAnimationStarted) return  // start chat animation only once
			this.chatAnimationStarted = true
			let smallDelay = 500  //ms
			let mediumDelay = 2500 // ms

			// If we are running inside a Cypress test, then speedup animation.
			if (window.Cypress || process.env.NODE_ENV === "development") {
				smallDelay = 100
				mediumDelay = 200
			}

			window.setTimeout(() => {
				this.flowState = 1
			}, smallDelay)
			window.setTimeout(() => {
				this.flowState = 2
			}, mediumDelay)
			window.setTimeout(() => {
				this.flowState = 3
				this.$root.scrollToBottom()
			}, smallDelay + mediumDelay)
		},

		/* username must not be empty and contain at least n chars */
		isUsernameValid(val) {
			return val !== undefined && val !== null && val.trim().length >= config.usernameMinLength
		},

		/* username can be submitted by pressing ENTER or by blurring the field or by clicking on "done" on the iOS keyboard */
		userNameSubmit() {
			this.$refs.userNameInput.validateField(true)
			if (this.isUsernameValid(this.user.name) && this.flowState === 3) {
				this.user.name = this.user.name.trim()
				this.flowState = 4
				document.getElementById("userNameInput").blur()
				this.$root.scrollToBottom()
				let mediumTimeout = 1500
				if (window.Cypress) mediumTimeout = 100
				setTimeout(() => {
					this.flowState = 6
					this.$root.scrollToBottom()
				}, mediumTimeout)
			}
		},

		/* invite must be ast least 6 chars */
		isInviteCodeValid(val) {
			return val !== undefined && val !== null && val.trim().length === config.inviteCodeLength
		},

		isMobilephoneValid(val) {
			return val !== undefined && val !== null && mobilephoneRegEx.test(val)
		},

		/* user's email must match regex */
		isEmailValid(val) {
			return val !== undefined && val !== null && eMailRegEx.test(val)
		},

		/* team name must be at least 6 chars */
		isTeamNameValid(val) {
			return val !== undefined && val !== null && val.trim().length >= 6
		},

		/* admin email must match regex */
		isAdminEmailValid(val) {
			return val !== undefined && val !== null && eMailRegEx.test(val)
		},

		/** Click join team button */
		chooseJoinTeam() {
			if (this.flowState === 6) {
				this.flowState = 10
				this.$root.scrollToBottom()
			}
		},
		cancelJoinTeam() {
			this.flowState = 6
			this.$root.scrollToBottom()
		},

		chooseCreateNewTeam() {
			if (this.flowState === 6) {
				this.flowState = 20
				this.$root.scrollToBottom()
				document.getElementById("teamNameInput").focus()
			}
		},
		cancelCreateNewTeam() {
			this.flowState = 6
			this.$root.scrollToBottom()
		},

		/** Create a new team */
		createNewTeam() {
			if (this.createNewTeamOkButtonDisabled) return
			//TODO: show loading icon
			this.flowState = 21
			let admin = {
				name: this.user.name,
				mobilephone: this.user.mobilephone,
				email: this.user.email,
				picture: "Avatar1.png",      //TODO: let user change his Avatar later
				//website: ...
			}
			api.createNewTeam(this.team.teamName, admin)
				.then((team) => {
					this.team = team
					this.createTeamQRCode()
					this.flowState = 22
					this.$nextTick(() => {
						this.$root.scrollElemToTop(document.getElementById("newTeamCreatedBubble"))
					})
				})
				.catch((err) => {			// on error show modal
					let errCode = err && err.response && err.response && err.response.data ? err.response.data.liquidoErrorCode : undefined
					// https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining  Here Babel is cool. Ey, you need this cool top notch language feature. Just "install" it :-)
					//MAYBE:  let errCode = err?.response?.data?.liquidoErrorCode  
					if (errCode === api.err.TEAM_WITH_SAME_NAME_EXISTS) {
						this.$root.$refs.rootPopupModal.showError(this.$t("teamWithSameNameExists"), this.$t("Error"))
					} else {
						this.$root.$refs.rootPopupModal.showError(this.$t("cannotCreateNewTeam"), this.$t("Error"))
						log.error("Cannot create new team", err)
					}
					this.flowState = 20
				})
		},

		createTeamQRCode() {
			let QRcodeOpts = { scale: 10 }
			QRCode.toDataURL(this.inviteLinkURL, QRcodeOpts, function (err, url) {
				if (err) {
					console.warn("Cannot create QR code", err)
				} else {
					let img = document.getElementById("qrCodeImg")
					img.src = url
				}
			})
		},

		gotoTeam() {
			this.$router.push({name: "teamHome"})
		},

		gotoCreatePoll() {
			this.$router.push({name: "createPoll"})
		},

		/** Join an existing team */
		joinTeam() {
			this.flowState = 11
			log.info(this.user.name + " <" + this.user.email + "> joins team with invite code " + this.inviteCode)
			let newMember = {
				name: this.user.name,
				mobilephone: this.user.mobilephone,
				email: this.user.email,
				picture: "Avatar1.png",      //TODO: let user change his Avatar later
				//website: ...
			}
			api.joinTeam(this.inviteCode, newMember)
				.then(team => {
					this.flowState = 12
					this.team = team
					this.$nextTick(() => {
						let headerHeight = this.$root.$refs["liquido-header"].offsetHeight
						this.$root.scrollElemToTop("#joinedTeamBubble", headerHeight)
					})
				})
				.catch(err => {
					let errCode = err && err.response && err.response && err.response.data ? err.response.data.liquidoErrorCode : undefined
					if (errCode === api.err.CANNOT_JOIN_TEAM_INVITE_CODE_INVALID) {
						this.$root.$refs.rootPopupModal.showError(this.$t("cannotJoinTeamInviteCodeInvalid"), this.$t("Error"))	
					} else {
						log.info("Cannot join team", err)
						this.$root.$refs.rootPopupModal.showError(this.$t("cannotJoinTeam"), this.$t("Error"))
					}					
					this.flowState = 10
				})
		},

		shareLink() {
			if (navigator.share) {
				navigator
					.share({
						title: "Share LIQUIDO invite",
						url: this.team.inviteLink,
					})
					.then(() => {
						log.debug("Invite has been sent!")
					})
					.catch(console.error)
			} else {
				log.debug("No native support")
			}
		},
	},
}
</script>

<style lang="scss">

.createOrJoinTable {
	td {
		width: 50%;
	}
	td:fist-child() {
		border-right: 1px solid grey;
	}
}

#joinOrCreateButtons {
	width: 100%;
	height: 40px;
	position: relative; // Cannot use flex  and justify-content: space-between, because that cannot be animated
}
#joinTeamButton {
	position: absolute;
	transition: all 0.5s ease;
	left: 0;
	top: 0;
}
#createNewTeamButton {
	position: absolute;
	transition: all 0.5s ease;
	right: 0;
	top: 0;
}
#createNewTeamOkButton {
	width: 50%;
}
.moveToCenterFromLeft {
	left: 50% !important;
	transform: translateX(-50%);
}
.moveToCenterFromRight {
	right: 50% !important;
	transform: translateX(50%);
}

label {
	font-size: 14px;
	font-weight: bold;
	margin: 0;
	//color: rgb(86, 9, 109);
}

.qr-code {
	width: 80%;
	max-width: 300px;
}

.opacity0 {
	opacity: 0;
}
</style>
