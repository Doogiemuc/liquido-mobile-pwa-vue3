<script setup>
import { createApp, ref, unref, reactive, computed, watch, onMounted, nextTick } from 'vue'

const user = {
	id: 4711,
	name: "Donald Duck",
	email: "donald@entenhausen.de"
}

const poll = reactive({
	title: "Dummy Poll",
	status: "NEW",
	proposals: [
		{
			title: "P1",
			placeholder: "Proposal 1",
			supporters: []
		},
		{
			title: "P2",
			placeholder: "Proposal 2",
			supporters: []
		}
	],
	voteOnlyOnce: false,
	canChangeVote: true,
	showResult: true
})

const isNew    = computed(() => poll.status == "NEW")
const inVoting = computed(() => poll.status == "VOTING")
const isFinished = computed(() => poll.status == "FINISHED")
const hasVoted = computed(() => poll.proposals.some(prop =>
	prop.supporters.some(u => u.id == user.id)
))
const sumVotes = computed(() => {
	let sumVotes = 0
	poll.proposals.forEach(prop => sumVotes += prop.supporters.length)
	return sumVotes
})
const saveIsActive = computed(() => {
	return poll.proposals.every(prop => 
		prop.title !== undefined && prop.title.trim().length > 0
	)
})

/**
 * Calculate width of votometer bar.
 * The proposal with the most votes has 100% width.
 * All other proposals have relative width to that.
 * @param {Number} index index of proposal
 */
function votometerStyle(index) {
	let maxVotes = 0;
	poll.proposals.forEach(prop => maxVotes = Math.max(maxVotes, prop.supporters.length))
	let percent = poll.proposals[index].supporters.length / maxVotes * 100
	return { width: percent + "%" }
}

onMounted(() => {
	const pollTitle = document.querySelector(
			".poll-title"
		)
		pollTitle.focus()
});

/** 
 * Can the currently logged in user still vote for this proposal? 
 * 1. If voteOnlyOnce is true and user has not voted anywhere yet  ELSE
 * 2. User hasn't vote for this proposal yet
 * 
 */
function canVoteFor(prop) {
	if (poll.voteOnlyOnce && hasVoted.value) return false
	return !prop.supporters.some(u => u.id == user.id)
}

function hasVotedFor(prop) {
	return prop.supporters.some(u => u.id == user.id)
}

function addProposal() {
	poll.proposals.push({
		title: "",
		placeholder: "Proposal " + (poll.proposals.length + 1),
		supporters: []
	})
	nextTick(() => {
		const lastProposal = document.querySelector(".polly-proposal-wrapper:last-child")
		const lastInput = document.querySelector(".polly-proposal-wrapper:last-child input")
		lastProposal.classList.add("fadeIn")
		setTimeout(() => {
			lastProposal.classList.remove("fadeIn")
			lastInput.focus();
		}, 10)
	})
}

function deleteProposal(index) {
	if (poll.proposals.length <= 1) return;
	poll.proposals.splice(index, 1);
	poll.proposals.forEach((prop, index) => {
		prop.placeholder = "Proposal " + (index + 1);
	});
}

function onProposalKeyPress(evt, index) {
	if (evt.keyCode == 13 && index == poll.proposals.length - 1) addProposal();
}

function savePoll() {
	poll.status = "VOTING"
}

function editPoll() {
	poll.status = "NEW"
}

function finishPoll() {
	poll.status = "FINISHED"
}


function castVote(prop) {
	if (poll.status != "VOTING" || prop == null) return
	if (!prop.supporters.some(u => u.id == user.id))
		prop.supporters.push(user)
}


</script>

<template>
	<div class="container">
	
		<div class="card polly-card">
			<div class="card-header">
				<input v-if="isNew" type="text" class="form-control poll-title" id="pollTitle" v-model="poll.title" placeholder="<Poll Title>">
				<h1 v-if="inVoting" class="poll-title" id="pollTitle">{{ poll.title }}</h1>	
			</div>

			<div v-if="isNew" class="card-body">
				<div class="proposals">
					<div v-for="(prop, index) in poll.proposals" class="polly-proposal-wrapper d-flex">
						<input v-model="prop.title" @keypress="(evt) => onProposalKeyPress(evt, index)" type="text" class="form-control p-1 flex-fill polly-proposal-input" :placeholder="prop.placeholder">
						<div @click="deleteProposal(index)" class="delete-proposal-icon">&#x2715;</div>
					</div>
				</div>
			</div>

			<ul v-if="inVoting" class="list-group list-group-flush user-select-none">
				<li v-for="(prop, index) in poll.proposals" @click="castVote(prop)" class="list-group-item prop-list-item d-flex position-relative" :class="{'canVote': canVoteFor(prop), 'hasVoted': hasVotedFor(prop)}">
					<div v-if="poll.showResult" class="votometer" :style="votometerStyle(index)"></div>
					<div class="thumbs-up p-1">
						<i class="fa-regular fa-thumbs-up"></i>
					</div>
					<div class="flex-fill p-1">{{ prop.title }}</div>
					<div v-if="poll.showResult" class="p-1 text-secondary">{{ prop.supporters.length }}</div>					
				</li>
			</ul>

			<div class="card-footer user-select-none">
				<div class="row justify-content-between">
					<div v-if="isNew" class="col text-start">
						<button @click="addProposal" type="button" class="btn btn-secondary plus-button">+</button>
					</div>
					<div v-if="isNew" class="col text-end">
						<button @click="savePoll" :disabled="!saveIsActive" type="button" class="btn btn-primary save-button">Save</button>
					</div>

					<div v-if="inVoting && !hasVoted" class="col text-start text-muted">
						Cast your vote
					</div>
					<div v-if="inVoting && hasVoted" class="col text-start text-muted">
						THX for voting
					</div>
					<div v-if="isFinished" class="col text-start text-muted">
						Poll is finished
					</div>
					<div v-if="inVoting" class="col text-end text-muted">
						{{ sumVotes }} votes
					</div>
				</div>
			</div>
		</div>

		
	

		<div class="card polly-card2 rounded-4 user-select-none mt-5">
			<div class="card-header rounded-4">
				<input v-if="isNew" type="text" class="form-control poll-title" id="pollTitle" v-model="poll.title" placeholder="<Poll Title>">
				<h1 v-if="inVoting" class="poll-title" id="pollTitle">{{ poll.title }}</h1>	
			</div>

			<div v-if="isNew" class="card-body">
				<div class="proposals">
					<div v-for="(prop, index) in poll.proposals" class="polly-proposal-wrapper d-flex">
						<div class="thumbs-up p-1">
							<i class="fa-regular fa-thumbs-up"></i>
						</div>
						<input v-model="prop.title" @keypress="(evt) => onProposalKeyPress(evt, index)" type="text" class="form-control p-1 flex-fill polly-proposal-input" :placeholder="prop.placeholder">
						<div @click="deleteProposal(index)" class="delete-proposal-icon">&#x2715;</div>
					</div>
				</div>
			</div>

			<ul v-if="inVoting" class="list-group list-group-flush">
				<li v-for="(prop, index) in poll.proposals" @click="castVote(prop)" class="list-group-item prop-list-item d-flex position-relative" :class="{'canVote': canVoteFor(prop), 'hasVoted': hasVotedFor(prop)}">
					<div v-if="poll.showResult" class="votometer" :style="votometerStyle(index)"></div>
					<div class="thumbs-up p-1">
						<i class="fa-regular fa-thumbs-up"></i>
					</div>
					<div class="flex-fill p-1">{{ prop.title }}</div>
					<div v-if="poll.showResult" class="p-1 text-secondary">{{ prop.supporters.length }}</div>
				</li>
			</ul>

			<div class="card-footer rounded-4">
				<div class="row justify-content-between">
					<div v-if="isNew" class="col text-start">
						<button @click="addProposal" type="button" class="btn btn-secondary rounded-circle plus-button">+</button>
					</div>
					<div v-if="isNew" class="col text-end">
						<button @click="savePoll" :disabled="!saveIsActive" type="button" class="btn btn-primary rounded-pill save-button">Save</button>
					</div>

					<div v-if="inVoting && !hasVoted" class="col text-start text-muted">
						Cast your vote
					</div>
					<div v-if="inVoting && hasVoted" class="col text-start text-muted">
						THX for voting
					</div>
					<div v-if="isFinished" class="col text-start text-muted">
						Poll is finished
					</div>
					<div v-if="inVoting" class="col text-end text-muted">
						{{ sumVotes }} votes
					</div>
				</div>
			</div>
		</div>


	</div>

</template>

<style lang="scss">

.polly-card {
	width: 400px;
}

.polly-card2 {
	width: 400px;
	.card-header {
		border-bottom: none;
		background-color: white;
		
	}
	.poll-title {
		border: none;
	}
	.card-footer {
		border-top: none;
		background-color: white;
	}
	.polly-proposal-input {
		border: none;
		border-radius: 0;
		margin-bottom: 0 !important;
	}
	.prop-list-item {
		border-bottom: none;
	}
	.list-group {
		border: none;
	}
	.card-footer {
		border-top: none;
		font-size: 70%;
	}
	.votometer {
		border-radius: 50rem;
		margin: 5px;
	}
}

.poll-title {
  background-color: rgba(0, 0, 0, 0);
	margin: 0;
	font-size: 1.5rem;
	font-weight: bold;
	text-align: center;
}

.polly-proposal-wrapper {
	position: relative;
	height: 2rem;   // MUST set height to be able to animate it!
	transition: all 0.5s;
}

.polly-proposal-wrapper:hover:not(:first-child) .delete-proposal-icon {
	display: inline;
}

.fadeIn {
	height: 0;
	transform: scaleY(0) translateX(1rem);
	
}

.polly-proposal-input {
	border: none;
	border-radius: 0;
	//border-bottom: 1px dotted #ccc;
	margin-bottom: 0 !important;
}


.delete-proposal-icon {
	position: absolute;
	display: none;
	color: grey;
	top: 0;
	right: 5px;
	cursor: pointer;
}

.prop-list-item {
	z-index: 600;
}
.prop-list-item.canVote:hover {
	background-color: #FAFAFA;
}

.thumbs-up {
	color: rgba(0,0,0, 0.1);
}
.prop-list-item.canVote:hover .thumbs-up {
	color: green !important;
}
.prop-list-item.hasVoted .thumbs-up {
	color: green !important;
}


.votometer {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	z-index: 500;
	background-color: rgba(12,34,128, 0.1);
	width: 0px;
}



</style>
