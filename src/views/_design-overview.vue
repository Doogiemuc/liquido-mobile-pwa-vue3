<template>
	<div>
		<h1 id="design-page" class="page-title">LIQUIDO Design Overview</h1>
 
		<p class="text-center" v-if="currentUser">You are logged in as {{ currentUser.email }}</p>

		<div class="overview">
			<section v-for="page in pages" :key="page.name" class="overview-section">
				<h3 class="ms-3">{{ page.name }}</h3>
				<div class="page-preview container">
					<component :is="page.component" v-bind="page.mockProps"/>
				</div>
			</section>
		</div>

	</div>
</template>

<script setup>
import { computed, onMounted, useTemplateRef } from 'vue'
import api from "@/services/liquido-graphql-client.js"

import config from "config"
import loginPage from "@/views/login-page.vue"
import welcomeChat from "@/views/welcome-chat.vue"
import teamHome from "@/views/team-home.vue"
import polls from "@/views/polls.vue"
import pollShow from "@/views/poll-show.vue"
import pollCreate from "@/views/poll-create.vue"
import proposalAdd from "@/views/proposal-add.vue"
import castVote from "@/views/cast-vote.vue"
import teamUserJwtMock from "@/mockdata/teamUserJwt.json"
import forgotPassword from "@/views/forgot-password.vue"
import pollyCreate from "@/views/polly-create.vue"
//import popupModal from "@/components/popup-modal.vue"

const firstPollId = new String(teamUserJwtMock.team.polls[0].id)
const pollInVoting = teamUserJwtMock.team.polls.find(poll => poll.status === "VOTING")
const pollInVotingId = new String(teamUserJwtMock.team.polls.find(poll => poll.status === "VOTING").id)


const pages = [
	{ name: 'Login', component: loginPage },
	{ name: 'Welcome', component: welcomeChat },
	{ name: 'Team', component: teamHome },
	{ name: 'List of Polls', component: polls },
	{ name: 'Show one Poll', component: pollShow, mockProps: { pollId: firstPollId } },
	{ name: 'Create a new poll', component: pollCreate },
	{ name: 'Add a proposal', component: proposalAdd, mockProps: { pollId: firstPollId } },
	{ name: 'Cast a vote', component: castVote, mockProps: { pollId: pollInVotingId } },
	{ name: 'Forgot password', component: forgotPassword },
	{ name: 'Polly', component: pollyCreate /*, mockProps: { initialPoll: pollInVoting } */ },
  // We cannot easily test our root popupModal
	// And it's static backdrop would cover everything :-(
	//  { name: 'Liquido Modal Popup', component: popupModal, mockProops: { id: "designOverviewMockModal" } },

]

if (!config.mockBackend) console.log("==== Design overview: You might want to set config.mockBackend = true =======")

//const rootModalRef = useTemplateRef('rootPopupModal')

onMounted(() => {
	/*
	//TODO: could offer a button to show it
  popupModalRef.value.showInfo(
		"This is our info modal with some longer text just to test it and preview it in our design overview.",
		"Modal Title"
	)
	*/
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

.page-preview {
	height: 812px;
	min-height: 812px;
	max-height: 812px;
  border: 1px solid #333;
	border-radius: 15px;
	border-width: 5px;
	overflow-x: hidden;
	overflow-y: auto;
	background-color: var(--app-background);
}


</style>
