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
						@click="devLoginMember">
						<i class="fas fa-user me-2"></i>
						<span class="flex-grow-1 text-center">DevLogin Member</span>
					</button>
					<button type="button" class="btn btn-outline-secondary"
						@click="devLoginAdmin">
						<i class="fas fa-shield-alt me-2"></i>
						<span class="flex-grow-1 text-center">DevLogin Admin</span>
					</button>
				</div>
			</div>
		</div>

		<div class="overview">
			<section v-for="page in pages" :key="page.name" class="overview-section">
				<h3 class="ms-2">{{ page.name }}</h3>
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
import { computed } from 'vue'
import api from "@/services/liquido-graphql-client.js"
import config from "config"

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

const currentUser = computed(() => api.getCachedUser())

/** Quickly login as a member user. This is available as a button in the design overview when in DEV env.  */
const devLoginMember = () => {
	if (import.meta.env.MODE !== "development" && import.meta.env.MODE !== "test") return
	api.logout()
	api.devLogin(config.devLogin.member.email, config.devLogin.teamName, config.devLogin.token)
		.then(() => {
			window.location.reload()
		})
		.catch(err => console.error("DevLogin Member failed!", err))
}

/** Quickly login as an admin user. This is available as a button in the design overview when in DEV env.  */
const devLoginAdmin = () => {
	if (import.meta.env.MODE !== "development" && import.meta.env.MODE !== "test") return
	api.logout()
	api.devLogin(config.devLogin.admin.email, config.devLogin.teamName, config.devLogin.token)
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
	padding-top: 0 !important;
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

.page-preview-container {
	position: relative;
	height: 780px;
	width: 390px;
	min-height: 780px;
	min-width: 390px;
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
