<template>
	<div>
		<h1 id="design-page" class="page-title">LIQUIDO Design Overview</h1>
 
		<p class="text-center" v-if="currentUser">You are logged in as {{ currentUser.email }}</p>

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
import { computed, onMounted, useTemplateRef } from 'vue'
import api from "@/services/liquido-graphql-client.js"

import config from "config"
import teamUserJwtMock from "@/mockdata/teamUserJwt.json"

const firstPollId = new String(teamUserJwtMock.team.polls[0].id)
const newPollId = new String(teamUserJwtMock.team.polls.find(poll => poll.status === "ELABORATION").id)
//const pollInVoting = teamUserJwtMock.team.polls.find(poll => poll.status === "VOTING")
const pollInVotingId = new String(teamUserJwtMock.team.polls.find(poll => poll.status === "VOTING").id)


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
	{ name: 'Forgot password', route: '/forgotPassword' },
	{ name: 'Polly', route: '/polly/create' },
]

if (!config.mockBackend) console.log("==== Design overview: You might want to set config.mockBackend = true =======")

onMounted(() => {
	// iframes are now self-contained, no additional setup needed
})

const currentUser = computed(() => api.getCachedUser())

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
