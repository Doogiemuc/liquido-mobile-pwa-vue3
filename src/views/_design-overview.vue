<template>
	<div>
		<h1 id="design-page" class="page-title">LIQUIDO Design Overview</h1>
 
		<div class="text-center">
			<p v-if="currentUser">
				You are logged in as {{ currentUser.email }}
				<a href="#" @click.prevent="logout">Logout</a>
			</p>
			<button v-else type="button" class="btn btn-outline-secondary"
				@click="devLoginAdmin">
				<i class="fas fa-shield-alt me-2"></i>
				<span class="flex-grow-1 text-center">DevLogin as Admin</span>
			</button>
		</div>

		<div class="overview">
			<section v-for="page in pages" :key="page.name" class="overview-section">
				<h3 class="ms-3">{{ page.name }}</h3>
				<div class="page-preview-container">
					<iframe :src="page.route" class="page-iframe"></iframe>
				</div>
			</section>
		</div>

	</div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import api from "@/services/liquido-graphql-client.js"
import config from "config"
//import teamUserJwtMock from "@/mockdata/teamUserJwt.json"

const polls = api.getCachedPolls()
let firstPollId = 55555
let newPollId = 66666
let pollInVotingId = 77777
if (polls && polls.length > 0) {
	firstPollId = polls[0].id
	newPollId = polls.find(poll => poll.status === "ELABORATION").id
	pollInVotingId = polls.find(poll => poll.status === "VOTING").id
}

const pages = [
	{ name: 'Login', route: '/login' },
	{ name: 'Welcome', route: '/welcome' },
	{ name: 'Team', route: '/team' },
	{ name: 'List of Polls', route: '/polls' },
	{ name: 'New Poll', route: `/polls/${newPollId}` },
	{ name: 'Poll in Voting', route: `/polls/${pollInVotingId}` },
	{ name: 'Create a new poll', route: '/polls/create' },
	{ name: 'Add a proposal', route: `/polls/${firstPollId}/add` },
	{ name: 'Cast a vote', route: `/polls/${pollInVotingId}/castVote` },
	{ name: 'Login via SMS', route: '/login-via-sms' },
	{ name: 'Forgot password', route: '/forgotPassword' },
	{ name: '404 - not found', route: '/404' },

	{ name: 'Polly', route: '/polly/create' },
]

if (!config.mockBackend) console.log("==== Design overview: You might want to set config.mockBackend = true =======")

onMounted(() => {
	// iframes are now self-contained, no additional setup needed
})

const currentUser = computed(() => api.getCachedUser())

/** Quickly login as an admin user. This is available as a button in the mobile UI when in DEV env.  */
const devLoginAdmin = () => {
	if (import.meta.env.MODE !== "development" && import.meta.env.MODE !== "test") return
	api.logout()
	api.devLogin(config.devLogin.admin.email, config.devLogin.teamName, config.devLogin.token)
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
}

.overview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(375px, 1fr));
  gap: 2rem;
	
}

.page-preview-container {
	position: relative;
	height: 812px;
	min-height: 812px;
	max-height: 812px;
	border: 1px solid #333;
	border-radius: 15px;
	border-width: 5px;
	overflow: hidden;
	background-color: var(--app-background);
}

.page-iframe {
	width: 100%;
	height: 100%;
	border: none;
	background-color: white;
}


</style>
