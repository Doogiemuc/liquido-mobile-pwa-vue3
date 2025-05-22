<script setup>
import { reactive, computed, onMounted, defineModel, watch, watchEffect,ref /*, unref, watch, nextTick*/ } from 'vue'

// ========== VUE Model (for isValid state)
const isValid = defineModel('isValid')

const emit = defineEmits(['update:isValid'])

// ========== VUE PROPERTIES
const props = defineProps({
	poll: {
		type: Object,
		required: false,
		default(rawProps) {
			return {  // default data for an empty new poll
				title: "",
				status: "NEW",
				pollType: "CHOOSE_ONE",
				usersCanAddProposals: true,
				maxProposalsPerUser: 1,    // -1 for: Users can add any number of poposals
				canChangeOwnVote: true,    // Can a user still change his own vote, after he has casted it? But only until the poll is finished.
				proposals: [
					{
						id: 1,
						title: ""
					},
					{
						id: 2,
						title: ""
					}
				]
			}
		}
	},
	isValid: false
})

// The prop is the initial value. Here we copy that to a local proxy that can change.
// https://vuejs.org/guide/components/props.html#one-way-data-flow

//TODO: use provide-inject instead: https://vuejs.org/guide/components/provide-inject.html#app-level-provide
//Bug: Now poll is disconnected from the initially passed props.poll
const poll = reactive(props.poll)




// ========== Types of polls
//TODO: PollTypes

const POLL_TYPE = {
	CHOOSE_ONE: 1,  // Each voter has one vote that he can give to exactly one proposal.
	CHOOSE_ANY: 2,  // Each voter can select one or many proposals
	DOT_VOTING: 3,  // Each voter has a number of "dots" or "likes" that he can distribute over the proposals. One proposal can receive more than one "dot".
	// Plus-Minus  
	// Reactions - with many smileys
	LIQUIDO: 4      // Each voter sorts the proposals/nominations into their preferred order, from top to bottom
}



// ========== Computed properties
const isNew    = computed(() => poll.status == "NEW")         // newly created poll. Not yet persisted. (This status only exists in the frontend.)
const isInElaboration = computed(() => poll.status == "ELABORATION")    // first status after stored in DB
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
const hasDuplicateTitles = computed(() => {
  for (let i = 0; i < poll.proposals.length-1; i++) {
		const prop1 = poll.proposals[i]
		for (let j = i+1; j < poll.proposals.length; j++) {
			const prop2 = poll.proposals[j];
			if (prop1.title === prop2.title) return true
		}
	}
	return false
})
const isValidComputed = computed(() => {
	let res = propHasTitle(0) && propHasTitle(1) && 
		poll.title !== undefined && poll.title.trim() !== "" && !hasDuplicateTitles.value
	console.log("isVAlid computed", res)
	return res
})

// ========== WATHCERS
watch(isValidComputed, (newVal) => {
	console.log("watcher isValidComputed = ", newVal, "emmitting event")
	emit('update:isValid', newVal)
})

// ========== METHODS

function propHasTitle(index) {
	if (index >= poll.proposals.length) return false
	if (!poll.proposals[index].title) return false
	if (poll.proposals[index].title.trim() === "") return false
	return true
}


/** 
 * Check if a proposal's title is a duplicate of anothe title.
 * @return true, when the title at this index is a duplicate 
 */
function isDuplicatePropTitle(index) {
	if (!propHasTitle(index)) return false   // empty is not counted as a duplicate
	return poll.proposals.some((prop, loopIndex) => 
		loopIndex !== index && 
		poll.proposals[index].title === poll.proposals[loopIndex].title
	)
}

/**
 * Calculate width of votometer bar.
 * The proposal with the most votes has 100% width.
 * All other proposals have relative width to that.
 * @param {Number} index index of proposal
 */
function votometerStyle(index) {
	let maxVotes = 0;
	poll.proposals.forEach(prop => maxVotes = Math.max(maxVotes, prop.numSupporters))
	let percent = poll.proposals[index].numSupporters / maxVotes * 100
	return { width: "calc(" + percent + "% - 10px)" }
}

onMounted(async() => {
	const pollTitle = document.querySelector("input#poll-title")  //TODO: Does not work yet??? DOM update timing???
	if (pollTitle) pollTitle.focus()
});

/** 
 * Can the currently logged in user still vote for this proposal? 
 * 1. If poll type only allows to choose one proposal and voter has already voted, then return false
 * 2. ELSE If iser hasn't vote for this proposal yet, then he can still vote.
 * 
 */
function canVoteFor(prop) {
	//TODO: if (poll.pollType === POLL_TYPE.DOT_VOTING) ... count number of already casted dots ...
	if (poll.pollType === POLL_TYPE.CHOOSE_ONE && hasVoted.value) return false
	return !prop.supporters.some(u => u.id == user.id)
}

function addProposal() {
	//TODO: addProposal in backend has somem more restrictions, eg. a normal user may only have one proposal in a "big" poll.  => Is this a seperate type of QuickPoll?
	poll.proposals.push({
		id: Date.now(),
		title: "",
		status: "NEW",
		createdAt: new Date().toISOString(),
		createdBy: {},
		supporters: []	
	})
}

function deleteProposal(index) {
	if (poll.proposals.length <= 2) return;  // Must always have at lest two proposal inputs
	poll.proposals.splice(index, 1);
}

/**
 * GIVEN user leaves an input field
 *   AND there are more than two input fields
 *  WHEN an input field is empty
 *  THEN delete it
 *  ELSE
 *  WHEN the last input field is filled
 *  THEN add another input field at the bottom.
 */
function onProposalBlurr(evt, index) {
	let len = poll.proposals.length
	if (len >= 2 && poll.proposals[index]) {
		if(index < len-1 && !propHasTitle(index)) {
			deleteProposal(index)
		} else if (index === len-1 && propHasTitle(index)) {
			addProposal()
		}
	}
}

/**
 * If last proposals is filled, then add a new empty one below.
 * If user pressed enter on an empty title, remove this proposal. But only if there are more then two proposals.
 * If proposal title is a duplicate, then mark it as invalid.
 */
function onProposalTitleChange(evt, index) {
	let len = poll.proposals.length
	if (index === len-1 && propHasTitle(index)) {
		addProposal()
	} else if (evt.key == 'Enter' && len >= 2 && !propHasTitle(index)) {
		deleteProposal(index)
	}
}

/**
 * Save the edited poll.
 * (Removes the last porposal if its title is empty.)
 */
function savePoll() {
	if (!propHasTitle(poll.proposals.length-1)) poll.proposals.pop()
	emit('savePoll', this.poll)
}



function likeProposal(prop) {
	if (poll.status != "VOTING" || prop == null) return
	if (!prop.supporters.some(u => u.id == user.id))
		prop.supporters.push(user)
}

</script>

<template>

	<div>
	
		<div class="card polly-card user-select-none border-0 shadow">
			<div class="card-header">
				<input v-if="isNew" type="text" class="form-control poll-title" id="pollTitle" v-model="poll.title" :placeholder="$t('pollTitle')">
				<h1 v-if="inVoting" class="poll-title" id="pollTitle">{{ poll.title }}</h1>	
			</div>

			<div v-if="isNew" class="card-body">
				<TransitionGroup name="fade" class="proposal-list-container" tag="ul">
					<li v-for="(prop, index) in poll.proposals" :key="prop.id" class="polly-proposal-wrapper d-flex">
						<input 
							v-model="prop.title"
							:placeholder="$t('Proposal')"
							type="text" 
							class="form-control flex-fill polly-proposal-input"
							:class="{'is-invalid': isDuplicatePropTitle(index) }"
							@blur="(evt) => onProposalBlurr(evt, index)"
							@change="(evt) => onProposalTitleChange(evt, index)">
						<div class="thumbs-up p-1">
							<i class="fas fa-bars"></i>
						</div>
					</li>
				</TransitionGroup>
			</div>

			<ul v-if="inVoting" class="list-group" tag="div">
				<li v-for="(prop, index) in poll.proposals" :key="prop.id" @click="likeProposal(prop)" class="list-group-item prop-list-item d-flex position-relative" :class="{'canVote': canVoteFor(prop), 'hasVoted': prop.isLikedByCurrentUser}">
					<div v-if="isFinished" class="votometer" :style="votometerStyle(index)"></div>
					<div class="thumbs-up p-1 z-index-500">
						<i class="fa-regular fa-thumbs-up"></i>
					</div>
					<div class="flex-grow-1 p-1 z-index-500 proposal-title">
						{{ prop.title }}
					</div>
					<div v-if="isFinished" class="p-1 z-index-500 text-secondary">{{ prop.supporters.length }}</div>
				</li>
			</ul>

			<div v-if="!isNew" class="card-footer">
				<div class="row justify-content-between">
					<div v-if="inVoting && !hasVoted" class="col text-start text-muted">
						Cast your vote!
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

// A bootstrap card, but with no borders.
.polly-card {
	.poll-title {
		border: none;
		//background-color: rgba(0, 0, 0, 0);   // MAYBE? Currently we show the input field also for the title?
		//margin: 0;
		//padding: 0;
		font-size: 1.1rem;
		font-weight: bold;
		text-align: center;
	}
	.card-header {
		border: none
	}
	.card-footer {
		border-top: none;
		background-color: white;
	}
	.proposal-list-container {
		position: relative;
		padding: 0;
		list-style-type: none;
		margin: 0;
	}

	.polly-proposal-wrapper {
		height: 30px;    // !!!MUST!!! set fixed height for vue list transition animations!
		width: 100%;
		box-sizing: border-box;
		&:not(:last-child) {
			margin-bottom: 10px;  // need a margin, otherwiese the focus frame around the input is not visible completely
		}
	}

	.polly-proposal-input::placeholder,
	.poll-title::placeholder {
		color: lightgrey;
	}

	.proposal-title {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

}

// ======== VUE List Transition ======
// https://vuejs.org/guide/built-ins/transition-group.html

/* 1. declare transition */
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

/* 2. declare enter from and leave to state */
.fade-enter-from,
.fade-leave-to {
  opacity: 0.5;
  transform: translateY(-15px) scaleY(0.01);  // order is important!
}

/* 3. ensure leaving items are taken out of layout flow so that moving
      animations can be calculated correctly. .... Necessary???*/
.fade-leave-active {
  //position: absolute;
}


.prop-list-item.canVote:hover {
	background-color: #a1afff;
}

.thumbs-up {
	color: rgba(0,0,0, 0.1);
	margin-left: 5px;
}
.prop-list-item.canVote:hover .thumbs-up {
	color: green !important;
}
.prop-list-item.hasVoted .thumbs-up {
	color: green !important;
}

.z-index-500 {
	z-index: 500;  // BEFORE / ABOVE the votometer!
}

.votometer {
	position: absolute;
	//TODO: only a bar below the text with animation from left to right
	left: 5px;   // The votomoter has some margin arround it.
	top: 5px;    // This gives a nice effect when voting. It "locks" onto the proposal.
	bottom: 5px;
	right: 5px;
	z-index: 100;  // BEHIND the text
	background-color: #a1afff;
	width: 0px;
}

</style>