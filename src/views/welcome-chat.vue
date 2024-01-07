 <template>
	<div>
		<div id="welcome-chat" class="mt-3">
			<b-card id="welcomeBubble" :class="{ 'hide-left': flowState < FLOW.Welcome }" class="chat-bubble shadow-sm">
				<b-card-text v-html="$t('welcome')" />
			</b-card>

			<b-card :class="{ 'hide-left': flowState < FLOW.WhatsYourName }" class="chat-bubble shadow-sm">
				<b-card-text v-html="$t('whatsYourName')" />
			</b-card>

			<b-card :class="{ 'hide-right': flowState < FLOW.NicknameInput }" class="chat-bubble shadow-sm chat-right">
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

			<div v-if="flowState <= FLOW.NicknameInput" class="login-link">
				<a href="/login">{{$t('login')}}</a>
			</div>

			<b-card :class="{ 'hide-left': flowState < FLOW.NiceToMeetYou }" class="chat-bubble shadow-sm">
				<b-card-text v-html="$t('niceToMeetYou', { nickname: user.name })" />
			</b-card>
			
			<!-- when invite code is passed as URL parameter -->
			<b-card	:class="{ 'hide-left': flowState != FLOW.InviteCodePassed }"	class="chat-bubble shadow-sm">
				<b-card-text v-html="$t('inviteCodePassed')" />
			</b-card>

			<!-- create or join a team bubble -->
			<b-card	id="createOrJoinBubble"	:class="{ 'hide-left': flowState < FLOW.CreateOrJoinTeam }"	class="chat-bubble shadow-sm">
				<b-card-text v-html="$t('createOrJoin')" />
			</b-card>

			<!-- create or join a team buttons -->
			<div id="createOrJoinButtons" :class="{ 'hide-left': flowState < FLOW.CreateOrJoinTeam }" class="mb-3 transition-all">
				<button
					id="joinTeamButton"
					:class="{
						'btn-primary': true,
						'moveToCenterFromLeft active': inJoinTeamFlow,
						opacity0: inCreateTeamFlow,
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
						'moveToCenterFromRight active': inCreateTeamFlow,
						opacity0: inJoinTeamFlow,
					}"
					class="btn"
					@click="chooseCreateNewTeam()"
				>
					{{ $t("createNewTeamButton") }}
				</button>
			</div>
			



			<!-- Join a team - form -->
			<b-card :class="{ 'collapse-max-height': !inJoinTeamFlow }" class="chat-bubble chat-right">
				<form id="joinTeamForm">
					<liquido-input
						id="inviteCodeInput"
						ref="inviteCodeInput"
						v-model="inviteCodeInputField"
						class="mb-3"
						:label="$t('inviteCode')"
						placeholder="ABC123"
						:valid-func="isInviteCodeValid"
						:maxlength="100"
						:invalid-feedback="$t('inviteCodeInvalid')"
						:disabled="flowState !== FLOW.JoinTeamForm"
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
						:disabled="flowState !== FLOW.JoinTeamForm"
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
						:disabled="flowState !== FLOW.JoinTeamForm"
						tabindex="3"
					/>

					<div class="d-flex justify-content-between align-items-end">
						<small :class="{ invisible: flowState !== FLOW.JoinTeamForm }" class="ms-1">
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

			<!--Joined team successfully -->
			<b-card	id="joinedTeamBubble"	:class="{ 'collapse-max-height': flowState !== FLOW.JoinTeamSuccessfull }" class="chat-bubble shadow-sm">
				<p v-html="$t('joinedTeamSuccessfully', { teamName: team.teamName })" />
				<b-button
					id="joinedTeamGoToTeamButton"
					variant="primary"
					class="float-end mb-1"
					@click="gotoTeam"
				>
					{{ $t("gotoTeam") }}
					<i class="fas fa-angle-double-right" />
				</b-button>
			</b-card>






			<!-- Create a new team - form -->
			<b-card :class="{ 'collapse-max-height': !inCreateTeamFlow }" class="chat-bubble chat-right">
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
						:disabled="flowState !== FLOW.CreateTeamForm"
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
						:disabled="flowState !== FLOW.CreateTeamForm"
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
						:disabled="flowState !== FLOW.CreateTeamForm"
						tabindex="3"
						@keyup.enter="createNewTeam()"
					/>

					<small class="ml-1">{{ $t("youWillBecomeAdmin") }}</small>

					<div class="d-flex justify-content-between align-items-center mt-3">
						<small :class="{ invisible: flowState !== FLOW.CreateTeamForm }" class="ms-1">
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

			<!-- New team created successfully -->

			<b-card	id="newTeamCreatedBubble"	:class="{ 'collapse-max-height': flowState !== FLOW.CreateTeamSuccessfull }" class="chat-bubble shadow-sm">
				<p>{{ $t("teamCreated") }}</p>
				<p class="text-center mb-2">
					<a id="inviteLink" :href="inviteLinkURL" :data-invitecode="team.inviteCode" @click.prevent="shareLink()">
						{{ $t("shareThisLink", {teamName: team.teamName, inviteCode: team.inviteCode}) }}
						<i class="fas fa-external-link-alt" />
					</a>
				</p>
			</b-card>

			<b-card	:class="{ 'collapse-max-height': flowState !== FLOW.CreateTeamSuccessfull }" class="chat-bubble shadow-sm">
				<p>{{ $t("scanQrCode") }}</p>
				<div class="text-center">
					<img id="qrCodeImg" src="" class="qr-code">
				</div>
				<p v-html="$t('teamInfo')" />
				<b-button
					id="gotoTeamButton"
					variant="primary"
					class="float-end mb-3"
					@click="gotoTeam"
				>
					<i class="fas fa-users" />
					{{ $t("gotoTeam") }}
					<i class="fas fa-angle-double-right" />
				</b-button>
			</b-card>

			<b-card :class="{ 'collapse-max-height': flowState !== FLOW.CreateTeamSuccessfull }" class="chat-bubble shadow-sm">
				<p v-html="$t('pollInfo')" />
				<b-button
					id="gotoCreatePollButton"
					variant="primary"
					class="float-end mb-3"
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
import liquidoInput from "@/components/liquido-input.vue"
import api from "@/services/liquido-graphql-client.js"
import log from 'loglevel'

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
				login: "Login",
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
				youWillBecomeAdmin: "Du wirst der Admin des neuen Teams.",

				teamCreated: "Ok, dein neues Team ist angelegt. Mit diesem Link kannst du deine Freunde in dein Team einladen:",
				shareThisLink: "LIQUIDO Einladung: {teamName} ({inviteCode})",
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

			// initialize the value of the input field with the passed inviteCode (if any)
			inviteCodeInputField: this.inviteCodeQueryParam,

			// newly created Team, or team loaded from passed inviteCode
			team: {
				//teamName: undefined,
				//inviteCode: "A3F43D",
				//admins: [ ]
			},

			// Our polite and nice chat bot logic :-)
			// Chat bubbles are consecutively blended in along these states.
			//TODO: create a plantUML flow chart for this.  /welcome -> IF logged in THEN Greet -> create new Team or join team, switch team?
			FLOW: {
				Start: 0,
				Welcome: 1,											// animate / fade-in the next chat-bubble
				WhatsYourName: 2,								
				NicknameInput: 3,
				NiceToMeetYou: 4,

				InviteCodePassed: 10,
				PassedInviteCodeIsInvalid: 11,

				CreateOrJoinTeam: 30,  					// show CreateOrJoinTEam bubble and the two blue buttons below

				JoinTeamForm: 40,								// show the input form
				JoinTeamClicked: 41,						// user has clicked the submit button. Waiting for server response...
				JoinTeamSuccessfull: 42,

				CreateTeamForm: 50,
				CreateTeamClicked: 51,
				CreateTeamSuccessfull: 52,
			},
			flowState: 0,

			//Semaphore so that the chat animation is only started once. This is for example relevant when the window is reloaded in the browser
			chatAnimationStarted: false,
		}
	},
	computed: {
		inJoinTeamFlow() {
			return [
				this.FLOW.JoinTeamForm,
				this.FLOW.JoinTeamClicked,
				this.FLOW.JoinTeamSuccessfull
			].includes(this.flowState)
		},
		inCreateTeamFlow() {
			return [
				this.FLOW.CreateTeamForm,
				this.FLOW.CreateTeamClicked,
				this.FLOW.CreateTeamSuccessfull
			].includes(this.flowState)
		},
		joinTeamOkButtonDisabled() {
			return !this.isInviteCodeValid(this.inviteCodeInputField) || 
						!this.isEmailValid(this.user.email) || 
						this.flowState >= this.FLOW.JoinTeamClicked
		},
		createNewTeamOkButtonDisabled() {
			return !this.isTeamNameValid(this.team.teamName) || 
						!this.isMobilephoneValid(this.user.mobilephone) || 
						!this.isAdminEmailValid(this.user.email)  || 
						this.flowState >= this.FLOW.CreateTeamClicked
		},
		inviteLinkURL() {
			return config.inviteLinkPrefix + this.team.inviteCode
		},
	},
	watch: {
		// "flowState": function(newVal, oldVal) {
		// 	log.debug(" ====>>> flowState", oldVal, "=>", newVal)
		// }
	},
	created() {
		// If a valid inviteCode was passed as URL parameter, then try to load team
		if (this.isInviteCodeValid(this.inviteCode)) {
			log.debug("have invite coce", this.inviteCode)
			api.getTeamForInviteCode(this.inviteCode).then(team => {
				log.debug("Found team info ", team)
				this.teamFromInviteCode = team
				this.inviteCodeInputField = team.inviteCode
			})
		}
	},
	/**
	 * Start the welcome chat bot
	 */
	mounted() {
		document.getElementsByTagName("html").scrollTop = 0
		//TODO: Check if user is already logged in. If so, then welcome him. User may want to join an exiting team.
		this.flowState = this.FLOW.Start
    this.startChatAnimation()
	},
	methods: {
		/**
		 * Show the first chat bubbles, one by one
		 */
		startChatAnimation() {
			if (this.chatAnimationStarted) return  // start chat animation only once
			this.chatAnimationStarted = true
			let smallDelay = 500   // ms
			let mediumDelay = 2000 // ms

			// If we are running inside a Cypress test, then speedup animation.
			if (window.Cypress || process.env.NODE_ENV === "development") {
				smallDelay = 100
				mediumDelay = 200
			}

			window.setTimeout(() => {
				this.flowState = this.FLOW.Welcome
			}, smallDelay)
			window.setTimeout(() => {
				this.flowState = this.FLOW.WhatsYourName
			}, mediumDelay)
			window.setTimeout(() => {
				this.flowState = this.FLOW.NicknameInput
				//this.$root.scrollToBottom()
			}, smallDelay + mediumDelay)
		},

		/* username must not be empty and contain at least n chars */
		isUsernameValid(val) {
			return val !== undefined && val !== null && val.trim().length >= config.usernameMinLength
		},

		/* username can be submitted by pressing ENTER or by blurring the field or by clicking on "done" on the iOS keyboard */
		userNameSubmit() {
			this.$refs.userNameInput.validateField(true)
			if (this.isUsernameValid(this.user.name) && this.flowState === this.FLOW.NicknameInput) {
				this.user.name = this.user.name.trim()
				this.flowState = this.FLOW.NiceToMeetYou
				document.getElementById("userNameInput").blur()
				this.$root.scrollToBottom()
				let mediumTimeout = 1500
				if (window.Cypress) mediumTimeout = 100
				setTimeout(() => {
					this.flowState = this.FLOW.CreateOrJoinTeam
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
			if (this.flowState === this.FLOW.CreateOrJoinTeam) {
				this.flowState = this.FLOW.JoinTeamForm
				this.$root.scrollToBottom()
			}
		},
		cancelJoinTeam() {
			this.flowState = this.FLOW.CreateOrJoinTeam
			this.$root.scrollToBottom()
		},

		chooseCreateNewTeam() {
			console.log("chooseCreateNewTEam", this.team)
			if (this.flowState === this.FLOW.CreateOrJoinTeam) {
				this.flowState = this.FLOW.CreateTeamForm
				this.$root.scrollToBottom()
				document.getElementById("teamNameInput").focus()
			}
		},
		cancelCreateNewTeam() {
			this.flowState = this.FLOW.CreateOrJoinTeam
			this.$root.scrollToBottom()
		},

		/** Create a new team */
		createNewTeam() {
			if (this.createNewTeamOkButtonDisabled) return
			this.flowState = this.FLOW.CreateTeamClicked
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
					this.flowState = this.FLOW.CreateTeamSuccessfull
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
					} else 
					//TODO: if moblephone or email is already registered, THEN forward to login
					{
						this.$root.$refs.rootPopupModal.showError(this.$t("cannotCreateNewTeam"), this.$t("Error"))
						log.error("Cannot create new team", err)
					}
					this.flowState = this.FLOW.CreateTeamForm
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
			if (this.joinTeamOkButtonDisabled) return
			this.flowState = this.FLOW.JoinTeamClicked
			log.info(this.user.name + " <" + this.user.email + "> joins team with invite code " + this.inviteCodeInputField)
			let newMember = {
				name: this.user.name,
				mobilephone: this.user.mobilephone,
				email: this.user.email,
				picture: "Avatar1.png",      //TODO: let user change his Avatar later
				//website: ...
			}
			api.joinTeam(this.inviteCodeInputField, newMember)
				.then(team => {
					this.flowState = this.FLOW.JoinTeamSuccessfull
					this.team = team
					this.$nextTick(() => {
						this.$root.scrollElemToTop(document.getElementById("joinedTeamBubble"))
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
					this.flowState = this.FLOW.JoinTeamForm
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

.login-link {
	z-index: 999;
	position: fixed;
	bottom: 2rem;
	right: 10px;	
	a {
		padding: 1rem 0 1rem 1rem;
	}
}

.createOrJoinTable {
	td {
		width: 50%;
	}
	td:fist-child() {
		border-right: 1px solid grey;
	}
}

#createOrJoinButtons {
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
	width: 50%;
	transform: translateX(-50%);
}
.moveToCenterFromRight {
	right: 50% !important;
	width: 50%;
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
