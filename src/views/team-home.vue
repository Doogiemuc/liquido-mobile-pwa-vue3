<template>
	<div>
		<h2 id="team-home" class="page-title" :data-teamname="team.teamName" :data-username="currentUserName">
			Hallo {{ currentUserName }}!
		</h2>

		<section v-if="pollsInVoting.length > 0">
			<div class="polls-in-voting-container" ref="pollsInVotingContainer" >
				<div v-for="poll in pollsInVoting" :key="poll.id" class="poll-card-wrapper user-select-none">
					<poll-card
						:poll="poll"
						@click="gotoCastVote"
					/>
				</div>
			</div>
		</section>

		<!-- Passkey info box with fingerprint icon on the left -->
		<section>
			<div class="alert liquido-info alert-dismissible fade show" role="alert">
				<h2>Mache LIQUIDO sicher!</h2>
				<p>Melde dich in Zukunft ganz einfach mit Face-ID oder Fingerabdruck an.</p>
				<button id="passkeyButton" type="button" class="btn btn-primary" @click="setupPasskey">
					<i class="fas fa-fingerprint me-2" />Passkey einrichten
				</button>
				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
			</div>
		</section>

		<!--
			Reminder to confirm the email address. Only shown while it is actually unverified.

			The "neue schicken" link is real markup with a real @click, NOT part of a v-html string:
			Vue does not bind event handlers inside v-html, so a @click written in there would render
			as an inert attribute and silently do nothing.
		-->
		<section v-if="showVerifyEmailReminder">
			<div id="verifyEmailReminder" class="alert liquido-info" role="alert">
				<p v-if="verifyMailSent" id="verifyEmailReminderSent">
					Ok, ich habe dir eine neue E-Mail geschickt. Bitte schau in dein Postfach.
				</p>
				<p v-else>
					Deine Email Adresse ist noch nicht verifiziert. Ich hatte dir eine Email mit einem
					Bestätigen Link geschickt. Bitte klicke einmal auf diesen Link. Falls du die Email nicht
					mehr findest, kann ich dir auch noch eine
					<span id="resendEmailVerificationLink" class="inline-link" @click="sendNewEmailVerificationMail">neue schicken</span>.
				</p>
			</div>
		</section>

		<!-- Team members as circles -->
		<section>
			<h2>{{ team.teamName }}</h2>
			<div id="memberCircles" class="member-grid mt-3 mb-3">
				<div v-for="member in members.slice(0,6)" :key="member.user.id" class="member-circle"
					:data-member-name="member.user.name" :data-member-role="member.role">
					<img :src="getImgUrl(member.user.picture)" class="member-avatar" alt="Member Avatar" />
					<div class="member-name">{{ member.user.name }}</div>
				</div>
				<div v-if="userIsAdmin" id="inviteMemberCircle" class="member-circle" @click="toggleInvite">
					<i class="fas fa-plus-circle add-member-icon" :class="{ 'add-member-icon--open': showInvite }" />
					<div class="member-name">einladen</div>
				</div>
			</div>

			<!-- Invite panel: shown when admin clicks the + circle -->
			<div v-if="showInvite" class="invite-panel mt-3">
				<div class="text-center mb-3">
					<img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" class="qr-code-img" alt="QR Code" />
				</div>
				<p class="text-center mb-3" :data-invitecode="team.inviteCode" @click.prevent="shareLink()">
					<span class="invite-code">{{ team.inviteCode }} <i class="fas fa-share-alt ms-2" /></span>
				</p>
			</div>
		</section>

		<section v-if="userIsAdmin" id="adminSettingsSection">
			<h2>Admin Einstellungen</h2>
			<p>Nur du kannst <router-link to="/new-poll">neue Abstimmungen erstellen</router-link>.</p>
		</section>


		<!-- Switch team. Only shown at all when the user actually is in more than one team. -->
		<section v-if="canSwitchTeam" id="switchTeamSection" class="text-center mt-5">
			<button id="switchTeamButton" type="button" class="btn btn-outline-secondary"
				:aria-expanded="showTeamList" @click="showTeamList = !showTeamList">
				<i class="fas fa-right-left me-2" />{{ t("SwitchTeam") }}
				<i class="fas fa-angle-down ms-2" :class="{ 'team-list-caret--open': showTeamList }" />
			</button>

			<ul v-if="showTeamList" id="switchTeamList" class="team-list list-unstyled mt-2">
				<li v-for="userTeam in allUserTeams" :key="userTeam.id">
					<button type="button" class="team-list-item" :class="{ 'team-list-item--current': userTeam.id === team.id }"
						:data-teamid="userTeam.id" :disabled="userTeam.id === team.id" @click="selectTeam(userTeam.id)">
						<span>{{ userTeam.teamName }}</span>
						<i v-if="userTeam.id === team.id" class="fas fa-check ms-2" />
					</button>
				</li>
			</ul>
		</section>

		<section class="text-center mt-5">
			<button type="button" class="btn btn-outline-secondary" @click="logout">
				Logout
			</button>
		</section>
			

		<liquido-footer>
			<template #left>
				<RouterLink to="/userhome" class="footer-icon-container" aria-label="UserHome">
					<div class="footer-icon"><i class="far fa-user-circle"></i></div>
					<div class="footer-icon-title">{{ t('User') }}</div>
				</RouterLink>
			</template>
			<template #primary>
				<button id="gotoPollsButton" type="button" class="btn btn-primary" @click="gotoPolls">
					{{ t("gotoPolls") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</template>
		</liquido-footer>
		
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useLoc } from "@/services/liqui-loc.js"
import config from "config"
import api from "@/services/liquido-graphql-client"
import LiquidoFooter from "@/components/liquido-footer.vue"
import PollCard from "@/components/poll-card.vue"
import QRCode from "qrcode"
import webauthnService from '@/services/webauthn-service.js'
import loginAPI from "@/services/login-rest-client.js"
import { store } from "@/services/store"

const router = useRouter()
const { t } = useLoc()

const team = ref({})

// These all describe "the team I am currently in", so they MUST be refs, not values read once at
// setup: switching team replaces every one of them without the component ever unmounting. userIsAdmin
// especially - a user can be admin of one team and a plain member of the next, and it gates the
// invite circle and the whole admin section below.
const currentUserName = ref(undefined)

// Whether to nag about the unconfirmed address, and whether we already sent a fresh link.
// A ref, not a value read once: switching team re-runs loadTeam() without unmounting this component.
const emailVerified = ref(true)   // assume verified until we know otherwise, so the alert never flashes
const verifyMailSent = ref(false)
const userIsAdmin = ref(false)
const userHasWebauthn = ref(false)
const showInvite = ref(false)
const qrCodeDataUrl = ref("")

// All teams this user belongs to, and whether to offer switching at all.
const allUserTeams = ref([])
const showTeamList = ref(false)
const canSwitchTeam = computed(() => allUserTeams.value.length > 1)   // progressive disclosure

// Computed properties that might dynamically change their values
/**
 * Team members, in a stable order: admins first, then by join date, then by id as a tie-breaker.
 * The backend serves members from a HashSet, ie. in no particular order, and the template only
 * shows the first six. Without sorting, which six appear changes between reloads - which made
 * the Cypress team-home assertions fail about one run in four.
 */
const members = computed(() => {
	return [...(team.value?.members || [])].sort((a, b) => {
		if (a.role !== b.role) return a.role === "ADMIN" ? -1 : 1
		if (a.joinedAt !== b.joinedAt) return a.joinedAt < b.joinedAt ? -1 : 1
		return Number(a.user.id) - Number(b.user.id)
	})
})
const pollsInVoting = ref([])
const inviteLinkURL = computed(() => config.inviteLinkPrefix + team.value?.inviteCode)

let passkeyLabel = ref("passkeylabel")

onMounted(() => {
	refreshFromCache()
})

/**
 * (Re)read everything this page shows out of the api's local cache.
 * Called on mount, and again after switching team - which is why pollsInVoting is a ref filled here
 * rather than a computed: it reads api.getCachedPolls(), a plain function call with no reactive
 * dependency, so as a computed it would be evaluated once and then never update again.
 */
function refreshFromCache() {
	team.value = api.getCachedTeam() || {}
	allUserTeams.value = api.getAllUserTeams()
	currentUserName.value = api.getCachedUser()?.name
	userIsAdmin.value = api.isAdmin()
	userHasWebauthn.value = api.getCachedUser()?.hasWebauthn
	// Only nag when the backend actually told us it is unverified. If the field is missing (an older
	// cached login that predates it) treat it as verified rather than nagging on no evidence.
	emailVerified.value = api.getCachedUser()?.emailVerified !== false
	pollsInVoting.value = api.getCachedPolls().filter(p => p.status === "VOTING" && !p.userAlreadyVoted)
	store.setHeaderTitle(team.value?.teamName || t("TeamHome"))
}

/** Switch into another team of this user. Closes the list either way. */
async function selectTeam(teamId) {
	showTeamList.value = false
	if (teamId === team.value?.id) return
	showInvite.value = false     // the invite code belongs to the team we are leaving
	qrCodeDataUrl.value = ""
	try {
		await api.switchTeam(teamId)
		refreshFromCache()
	} catch (err) {
		console.error("Could not switch team", err)
	}
}

function getImgUrl(imgFile) {
	return config.avatarPath + "/" + imgFile
}

function gotoPolls() {
	router.push({ name: "polls" })
}

/**
 * The team page is the "what still wants something from me" surface: pollsInVoting is filtered to
 * polls that are open for voting AND that this user has not voted in yet, so every card here is a
 * ballot waiting to be cast. Clicking one therefore goes straight to it, skipping poll-show.
 *
 * This is the only place in the app that takes that shortcut - $root.gotoPoll() opens the poll page.
 * It is safe only because leaving cast-vote always walks back through poll-show, which is where the
 * ballot receipt and the admin's "finish voting phase" button live.
 */
function gotoCastVote(pollId) {
	router.push({ name: "castVote", params: { pollId } })
}

async function toggleInvite() {
	showInvite.value = !showInvite.value
	if (showInvite.value && !qrCodeDataUrl.value) {
		try {
			qrCodeDataUrl.value = await QRCode.toDataURL(inviteLinkURL.value, { scale: 8 })
		} catch (err) {
			console.error("Cannot create QR code", err)
		}
	}
}

function logout() {
	api.logout()
	router.push({ name: "login" })
}

async function shareLink() {
	if (navigator.share) {
		try {
			await navigator.share({
				title: "LIQUIDO Einladung",
				text: "Du bist eingeladen zu unserem Team auf LIQUIDO.",
				url: inviteLinkURL.value,
			});
		} catch (error) {
			console.error('Error sharing', error);
		}
	} else {
		// Fallback for browsers that don't support Web Share API
		try {
			await navigator.clipboard.writeText(inviteLinkURL.value);
			console.info('Invitation link copied to clipboard.');
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}
}

/** Nag only while the address really is unconfirmed. Hidden again as soon as it is verified. */
const showVerifyEmailReminder = computed(() => !emailVerified.value)

/**
 * Ask the backend for a fresh confirmation mail.
 *
 * Only reachable from here, where the user is logged in - the backend derives the recipient from the
 * JWT and there is deliberately no anonymous variant. Sending a new link invalidates the old one.
 */
async function sendNewEmailVerificationMail() {
	if (verifyMailSent.value) return   // already sent one; do not let an impatient double click spam
	verifyMailSent.value = true
	loginAPI.resendEmailVerification()
		.catch(err => {
			console.error("Cannot resend the email verification mail", err)
			verifyMailSent.value = false   // let them try again
		})
}

/**
 * Register a new WebAuthn authenticator device.
 * Only a logged user is allowed to do this for his own account!
 */
async function setupPasskey() {
	if (!passkeyLabel.value) passkeyLabel.value = currentUserName.value + "-Passkey"
	webauthnService.registerWebauthn(passkeyLabel.value).then(() => {
		api.getCachedUser().hasWebauthn = true
		userHasWebauthn.value = true
		console.log("setupPasskey SUCCESSFULL")
	}).catch(err => {
		//this.$root?.$refs?.mobileDebugLogRef?.info("setupPasskey: ERROR")
		//this.$root?.$refs?.mobileDebugLogRef?.info(err)
		console.log("setupPasskey ERROR", err)
	})
}


</script>

<style scoped>
section {
	margin-top: var(--two);  /* more relaxed space between sections on the team home page */
}

/* The "neue schicken" link inside the verify-email reminder. A span, not a button: it sits mid
   sentence, so it has to read as a link rather than interrupt the text with a control. */
.inline-link {
	color: var(--primary);
	text-decoration: underline;
	cursor: pointer;
}

.passkey-icon { font-size: 2.5rem; color: var(--primary); flex-shrink: 0; }
.passkey-title { margin: 0 0 0.25rem 0; }

.polls-in-voting-container {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	margin: 1rem 0;
	gap: 1rem;
	overflow-x: auto;
	overflow-y: visible;

	scroll-behavior: smooth;
	/* Hide scrollbar for Chrome, Safari and Opera */
	-ms-overflow-style: none;  /* IE and Edge */
	scrollbar-width: none;  /* Firefox */
	touch-action: pan-x;
	padding: 0.25rem 1rem 0.5rem 0;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.polls-in-voting-container::-webkit-scrollbar {
	display: none;
}

.poll-card-wrapper {
	min-width: 70vw;  /* must set a mind width for sideway scrolling */
	height: 10rem;    /* the cards wrapper defines the height */
}



.member-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 1rem 0.5rem;
	justify-items: center;
}
.member-circle {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	max-width: 6rem;
}
.member-avatar {
	width: 4rem; height: 4rem; border-radius: 50%; object-fit: cover;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.member-name {
	margin-top: 0.4rem; font-size: 0.8rem; text-align: center; color: var(--text-color);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
}
.add-member-icon {
	font-size: 4rem; color: var(--secondary); cursor: pointer;
	width: 4rem; height: 4rem; display: flex; align-items: center; justify-content: center;
	transition: color 0.2s;
}
.add-member-icon--open { color: var(--primary); }

/*
 * Team switcher. Styled by hand rather than with Bootstrap's .dropdown JS component: only
 * bootstrap's CSS is imported globally (main.js), its JS is pulled in per component, so a
 * data-bs-toggle="dropdown" here would silently do nothing.
 */
.team-list-caret--open {
	transform: rotate(180deg);
}
.team-list {
	display: inline-flex;
	flex-direction: column;
	gap: 0.25rem;
	margin: 0 auto;
	min-width: 12rem;
}
.team-list-item {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	padding: 0.5rem 1rem;
	border: 1px solid var(--state-new);
	border-radius: 0.25rem;
	background-color: white;
	color: var(--text-color);
}
.team-list-item--current {
	background-color: var(--state-new-bg);
	font-weight: bold;
	opacity: 1;      /* :disabled would otherwise grey out the team you are actually in */
}

.invite-panel {
	border-top: 1px solid var(--liquido-info-border-color);
	padding-top: 1rem;
}
.invite-code {
	border: 1px solid var(--state-new);
	background-color: var(--state-new-bg);
	border-radius: 0.25rem; 
	padding: 0.25rem 0.5rem;
	font-family: monospace;
}
.qr-code-img {
	width: 160px;
	height: 160px;
}

/* Tablet and up: show more members per row */
@media (min-width: 768px) {
	.member-grid {
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 1rem;
	}
}

/* Desktop fallback for larger screens */
@media (min-width: 1024px) {
	.member-grid {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
}
</style>
