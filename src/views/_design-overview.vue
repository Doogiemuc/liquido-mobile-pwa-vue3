<template>
	<div>
		<div class="d-flex justify-content-between m-3">
			<h1 id="design-page">LIQUIDO Design Overview</h1>
	
			<div class="text-center">
				<p v-if="currentUser">
					Logged in as <b>{{ currentUser.email }}</b>
					<a class="ms-5" href="#" @click.prevent="logout">Logout</a>
				</p>
				<div v-else class="button-group">
					<button type="button" class="btn btn-outline-secondary"
						:disabled="!seedMemberEmail" @click="devLoginMember">
						<i class="fas fa-user me-2"></i>
						<span class="flex-grow-1 text-center">{{ seedMemberEmail || "DevLogin Member" }}</span>
					</button>
					<button type="button" class="btn btn-outline-secondary"
						:disabled="!seedAdminEmail" @click="devLoginAdmin">
						<i class="fas fa-shield-alt me-2"></i>
						<span class="flex-grow-1 text-center">{{ seedAdminEmail || "DevLogin Admin" }}</span>
					</button>
				</div>
			</div>
		</div>

		<div class="overview">
			<section v-for="page in pages" :key="page.name" class="overview-section" :class="{ 'page-dimmed': page.dimmed }">
				<h1 class="ms-2">{{ page.name }}</h1>
				<h2 class="ms-2">
					<a :href="page.route" target="_blank" rel="noopener" class="page-link"><pre>{{ page.route }}</pre></a>
				</h2>
				<div class="page-preview-container">
					<iframe 
						:src="page.route" 
						class="page-iframe">
					</iframe>
				</div>
			</section>
		</div>

	</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from "@/services/liquido-graphql-client.js"
import config from "config"

const polls = api.getCachedPolls()
let newPollId = 66666
let pollInVotingId = 77777
if (polls && polls.length > 0) {
	newPollId = polls.find(poll => poll.status === "ELABORATION")?.id || newPollId
	pollInVotingId = polls.find(poll => poll.status === "VOTING")?.id || pollInVotingId
}
let inviteCode = api.getCachedTeam()?.inviteCode || "mock-invite-code"

const pages = [
	{ name: 'Login', route: '/login' },
	{ name: 'Welcome', route: '/welcome' },
	{ name: 'Join a Team', route: `/welcome?inviteCode=${inviteCode}` },
	{ name: 'Welcome v2', route: '/welcome-v2' },
	{ name: 'Welcome v2 - with invite', route: `/welcome-v2?inviteCode=${inviteCode}` },
	{ name: 'Team', route: '/team' },
	{ name: 'User home', route: '/userhome' },
	{ name: 'List of Polls', route: '/polls' },
	{ name: 'New Poll', route: `/polls/${newPollId}` },
	{ name: 'Poll in Voting', route: `/polls/${pollInVotingId}` },
	
	/*
	{ name: 'Create a new poll (OLD)', route: '/polls/create' },
	{ name: 'Add a proposal (OLD)', route: `/polls/${firstPollId}/add` },
	 */
	{ name: 'Create new poll (admin only)', route: '/polls/new' },
	{ name: 'Edit Poll', route: `/polls/${newPollId}/edit` },
	{ name: 'Cast a vote', route: `/polls/${pollInVotingId}/castVote` },
	{ name: 'Forgot password', route: '/forgotPassword' },
	{ name: 'Verify email', route: '/verifyEmail?verifyToken=mock-token' },
	{ name: 'Page not found', route: `/404`, dimmed: true },  // placeholder to seperate polly
	{ name: 'Polly', route: '/polly' },
	{ name: 'Impressum', route: '/impressum' },
	{ name: 'AGB', route: '/agb' },
	{ name: 'Datenschutz', route: '/datenschutz' },
]

if (!config.mockBackend) console.log("==== Design overview: You might want to set config.mockBackend = true =======")

const currentUser = computed(() => api.getCachedUser())

// The seed team's name and its admin/member emails now carry a timestamp (TestDataCreator adds a
// new testTeam<millis> on every run instead of replacing a fixed one), so they can no longer be
// hard-coded in config.devLogin. Fetch the newest seed team instead and devLogin as one of ITS users.
const seedTeamName = ref(null)
const seedAdminEmail = ref(null)
const seedMemberEmail = ref(null)

onMounted(() => {
	if (import.meta.env.MODE !== "development" && import.meta.env.MODE !== "test") return
	if (currentUser.value) return
	api.getNewestSeedTeam(config.devLogin.token)
		.then(team => {
			seedTeamName.value = team.teamName
			const members = team.members || []
			const admin = members.find(m => m.role === "ADMIN")
			const otherMembers = members.filter(m => m.role !== "ADMIN")
			const member = otherMembers[Math.floor(Math.random() * otherMembers.length)]
			seedAdminEmail.value = admin?.user?.email
			seedMemberEmail.value = member?.user?.email
		})
		.catch(err => console.error("Could not load newest seed team for DevLogin", err))
})

/** Quickly login as a member user. This is available as a button in the design overview when in DEV env.  */
const devLoginMember = () => {
	if (import.meta.env.MODE !== "development" && import.meta.env.MODE !== "test") return
	if (!seedMemberEmail.value) return
	api.logout()
	api.devLogin(seedMemberEmail.value, seedTeamName.value, config.devLogin.token)
		.then(() => {
			window.location.reload()
		})
		.catch(err => console.error("DevLogin Member failed!", err))
}

/** Quickly login as an admin user. This is available as a button in the design overview when in DEV env.  */
const devLoginAdmin = () => {
	if (import.meta.env.MODE !== "development" && import.meta.env.MODE !== "test") return
	if (!seedAdminEmail.value) return
	api.logout()
	api.devLogin(seedAdminEmail.value, seedTeamName.value, config.devLogin.token)
		.then(() => {
			window.location.reload()
		})
		.catch(err => console.error("DevLogin Admin failed!", err))
}

const logout = () => {
	api.logout()
	window.location.reload()
}


</script>

<style>
#app {
	background-color: white !important;
	width: 100%;
	max-width: 100%;
}

#appContent {
	background-color: white !important;
	width: 100%;
	max-width: 100%;
	padding-top: 0 !important;  /* Remove the top padding to avoid extra space at the top of the design overview page. */
}

#liquidoHeader {
	display: none; /* Hide the header to avoid extra space at the top of the design overview page. */
}

.button-group {
	display: flex;
	gap: 1rem;
	justify-content: center;
	flex-wrap: wrap;
	margin-bottom: 1rem;
}

.button-group .btn {
	min-width: 150px;
}

.overview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(375px, 1fr));
  gap: 2rem;
	
}

.page-link {
	color: inherit;
	text-decoration: none;
}

.page-link:hover {
	text-decoration: underline;
}

.page-preview-container {
	position: relative;
	/* iPhone 17  https://developer.apple.com/design/human-interface-guidelines/layout#Specifications */
	width: 402px;
	height: 874px;
	min-height: 780px;
	min-width: 390px;
	border: 1px solid #333;
	border-radius: 15px;
	overflow: hidden;
	background-color: var(--app-background);
}

.page-iframe {
	width: 100%;
	height: 100%;
	border: none;
	background-color: white;
}

.page-dimmed {
	opacity: 0.2;
}

</style>
