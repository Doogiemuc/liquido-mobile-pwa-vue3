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
						:date-text="d(new Date(poll.createdAt), 'shortDate')"
						@click="$root.gotoPoll"
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

		<!-- Team members as circles -->
		<section>
			<h2>{{ team.teamName }}</h2>
			<div id="memberCircles" class="member-grid mt-3 mb-3">
				<div v-for="member in members.slice(0,6)" :key="member.user.id" class="member-circle">
					<img :src="getImgUrl(member.user.picture)" class="member-avatar" alt="Member Avatar" />
					<div class="member-name">{{ member.user.name }}</div>
				</div>
				<div v-if="userIsAdmin" class="member-circle" @click="toggleInvite">
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

		<section v-if="userIsAdmin">
			<h2>Admin Einstellungen</h2>
			<p>Nur du kannst <router-link to="/new-poll">neue Abstimmungen erstellen</router-link>.</p>
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
				<button id="gotoPollsButton" type="button" class="btn btn-lg w-100 btn-primary" @click="gotoPolls">
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
import { useI18n } from "vue-i18n"
import config from "config"
import api from "@/services/liquido-graphql-client"
import LiquidoFooter from "@/components/liquido-footer.vue"
import PollCard from "@/components/poll-card.vue"
import QRCode from "qrcode"
import webauthnService from '@/services/webauthn-service.js'
import { store } from "@/services/store"

const router = useRouter()
const { t, d } = useI18n()

const team = ref({})

const currentUserName = api.getCachedUser()?.name
const userIsAdmin = api.isAdmin()
const userHasWebauthn = api.getCachedUser()?.hasWebauthn
const showInvite = ref(false)
const qrCodeDataUrl = ref("")

// Computed properties that might dynamically change their values
const members = computed(() => team.value?.members || [])
const pollsInVoting = computed(() => api.getCachedPolls().filter(p => p.status === "VOTING") || [])
const inviteLinkURL = computed(() => config.inviteLinkPrefix + team.value?.inviteCode)

let passkeyLabel = ref("passkeylabel")

onMounted(() => {
	team.value = api.getCachedTeam() || {}
	store.setHeaderTitle(team.value?.teamName || t("TeamHome"))
})

function getImgUrl(imgFile) {
	return config.avatarPath + "/" + imgFile
}

function gotoPolls() {
	router.push({ name: "polls" })
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

async function inviteMembers() {
	if (navigator.share) {
		try {
			await navigator.share({ title: "LIQUIDO Einladung", text: "Teammitglieder einladen", url: inviteLinkURL.value })
		} catch (err) { console.error("Error sharing", err) }
	} else {
		try { await navigator.clipboard.writeText(inviteLinkURL.value) }
		catch (err) { console.error("Failed to copy invite link", err) }
	}
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

/**
 * Register a new WebAuthn authenticator device.
 * Only a logged user is allowed to do this for his own account!
 */
async function setupPasskey() {
	if (!passkeyLabel.value) passkeyLabel.value = currentUserName.value + "-Passkey"
	webauthnService.registerWebauthn(passkeyLabel.value).then(() => {
		api.getCachedUser().hasWebauthn = true
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
