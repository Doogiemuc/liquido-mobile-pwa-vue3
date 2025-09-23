<script setup>
/**
 * Polly.vue
 * 
 * A little mobile voting component.
 * In a Polly the voter doesn't cast a vote for just one proposal (or candidate).
 * Instead every voter sorts all proposal into their preferred order.
 */

import {
	ref,
	reactive,
	computed,
	//	watch,
	onMounted,
	nextTick,
} from 'vue'
import { VueDraggableNext as draggable } from 'vue-draggable-next'
import * as bootstrap from 'bootstrap'

// TODO: Not yet implemented:  Types of polls
// "CHOOSE_ONE": Each voter has one vote that he can give to exactly one proposal.
// "CHOOSE_ANY": Each voter can select one or many proposals
// "SORT":       Each voter sorts the proposals/nominations into their preferred order, from top to bottom.
// "DOT_VOTING": Each voter has a number of "dots" that he can distribute over the proposals. One proposal can receive more than one "dot".
/*
const POLL_TYPE = {
	CHOOSE_ONE: 1,
	CHOOSE_ANY: 2,
	SORT: 3,        //  <== for now only this mode is implemented since all other modes are subsets of this
	DOT_VOTING: 4
}
*/

/* Status flow of a poll */
const POLL_STATUS = {
	NEW: "NEW",
	ELABORATION: "ELABORATION",
	PREPARE_START: "PREPARE_START",  // this status only exists in the frontend. Here we ask for user's email
	IN_VOTING: "VOTING",
	FINISHED: "FINISHED"
}

const props = defineProps({
	/* We just simply accept one large poll JSON object as input. This makes updating it really easy. */
	poll: {
		type: Object,
		required: true
	}

})

// The prop is the initial value. Here we copy that to a local proxy that can change.
// https://vuejs.org/guide/components/props.html#one-way-data-flow
// TODO: use provide-inject instead: https://vuejs.org/guide/components/provide-inject.html#app-level-provide
//console.log("props", JSON.stringify(props, null, 2))
const poll = reactive(props.poll);


/*
Example "poll" object with its properties:

		{
			"title": "What shall we do tonight?",
			"proposals": [   // Proposals have an sorted order in this array!
				{
					"id": 4711   // any arbitrary ID
					"title": "Go to Rave",
				},
				{
					"id": 4712
					"title": "Go a nice restaurant and do some dinner",
				},
				{
					"id": 4713
					"title": "Cinema is nice",
				}
			],
			"status": "VOTING",
			"alreadyVoted": false  // Has the current user already casted a vote in this poll
			"numVoters": 0,        // How many persons have casted their vote in this poll.
		}

*/


/**
 * Initialize default values of poll if not yet set
 * My dear VUE: tell my how to do this otherwise! :-)
 */
if (!poll.status) poll.status = POLL_STATUS.NEW
if (!poll.numVoters) poll.numVoters = 0
if (!poll.proposals) poll.proposals = [
	{
		id: Date.now(),
		title: "",
	},
	{
		id: Date.now() + 17,
		title: "",
	}
]
// default values for each proposal
for (let i = 0; i < poll.proposals.length; i++) {
	const prop = poll.proposals[i]
	if (!prop.id) prop.id = Date.now() + i   // random unique ID
	if (!prop.title) prop.title = ""
	// if (!prop.votes) prop.votes = 0  // only needed for other poll types
}

// IF  Poll is new 
// AND last element has a title
// THEN add another empty proposal input at the bottom.
// (It will be removed when saving.)
if (poll.status == POLL_STATUS.NEW && propHasTitle(poll.proposals.length - 1)) addProposal()

console.log("reactive poll", JSON.stringify(poll, null, 2))

//TODO: Dummy user for testing
const user = reactive({
	id: Date.now(),
	name: "Donald Duck",
	email: "dummy@domain.org"
});

// ========== Computed Properties ===========

const isNew = computed(() => poll.status == POLL_STATUS.NEW);
const inElaboration = computed(() => poll.status == POLL_STATUS.ELABORATION);
const prepareStart = computed(() => poll.status == POLL_STATUS.PREPARE_START);
const inVoting = computed(() => poll.status == POLL_STATUS.IN_VOTING);
const isFinished = computed(() => poll.status == POLL_STATUS.FINISHED);
const pollHasTitle = computed(() => /\S/.test(poll.title) && poll.title.length > 2)

/** A poll needs at least a title and two proposals */
const saveIsActive = computed(() => {
	return pollHasTitle.value && propHasTitle(0) && propHasTitle(1);
});

const userEmailIsValid = computed(() => {
	return isEmail(user.email)
})

function propHasTitle(index) {
	const title = poll.proposals?.[index]?.title;
	return typeof title === "string" && title.trim().length > 0;
}

/** Popup when user clicks save. */
let askEmailModal;

onMounted(() => {
	console.log("Polly poll", poll)
	askEmailModal = new bootstrap.Modal(document.getElementById('askEmailModal'), {})
	const pollTitleInput = document.getElementById("pollTitleInput")
	if (pollTitleInput) pollTitleInput.focus();
});

function addProposal() {
	poll.proposals.push({
		id: Date.now(),  // random unique ID
		title: "",
	});
}

function deleteProposal(index) {
	console.log("deleteProposal(index=" + index + ")");
	if (poll.proposals.length <= 2) return; // Must always have at lest two proposal inputs
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
	let len = poll.proposals.length;
	if (len >= 2 && poll.proposals[index]) {
		if (index < len - 1 && !propHasTitle(index)) {
			deleteProposal(index);
		} else if (index === len - 1 && propHasTitle(index)) {
			addProposal();
		}
	}
}

/**
 * Find proposals with duplicate titles. And mark the input fields as invalid.
 * Empty titles are ok.
 * (This code is AI generated.)
 */
function checkForDuplicateTitles() {
	let pollyProposalInputs = document.getElementsByClassName("polly-proposal-input") || [];
	// This may happen in some very exceptional cases. But marking is fine.
	if (pollyProposalInputs.length != poll.proposals.length) {
		return;
	}

	// Create a map to track occurrences of each title
	const titleOccurrences = new Map();

	// Step 1: Count occurrences of each non-empty title
	for (let i = 0; i < poll.proposals.length; i++) {
		const title = poll.proposals[i].title.trim();
		if (title !== "") {
			if (!titleOccurrences.has(title)) {
				titleOccurrences.set(title, []);
			}
			titleOccurrences.get(title).push(i); // Store the indices where the title appears
		}
	}

	// Step 2: Mark inputs as valid/invalid based on duplicates
	for (let i = 0; i < poll.proposals.length; i++) {
		const title = poll.proposals[i].title.trim();

		if (title !== "" && titleOccurrences.get(title)?.length > 1) {
			// If the title is duplicated, add the "is-invalid" class
			pollyProposalInputs[i].classList.add("is-invalid");
		} else {
			// Otherwise, remove the "is-invalid" class
			pollyProposalInputs[i].classList.remove("is-invalid");
		}
	}
}


/**
 * If last proposals is filled, then add a new empty one below.
 * If user pressed enter on an empty title, remove this proposal. But only if there are more then two proposals.
 * Then check for duplicate titles.
 */
function onProposalKeyup(evt, index) {
	let len = poll.proposals.length;
	if (index === len - 1 && propHasTitle(index)) {
		addProposal();
	} else if (evt.key == "Enter" && len >= 2 && !propHasTitle(index)) {
		deleteProposal(index);
	} else {
		checkForDuplicateTitles()
	}
}

/**
 * Save the edited poll.
 * (Removes the last porposal if its title is empty.)
 */
function savePoll() {
	if (!propHasTitle(poll.proposals.length - 1)) poll.proposals.pop()
	poll.status = POLL_STATUS.ELABORATION
}

/** Go back to edit mode. This is only allowed if there no votes yet. */
function editPoll() {
	poll.status = POLL_STATUS.NEW
	onProposalKeyup({}, poll.proposals.length - 1) // to add an empty proposal at the end
}

function clickStartPollButton() {
	//poll.status = POLL_STATUS.PREPARE_START
	//askEmailModal.show()
	poll.status = POLL_STATUS.IN_VOTING
}

function startPoll() {
	//TODO: call backend, store user, send email, ...
	askEmailModal.hide()
	console.log("Sending an email to ", user.email)
	poll.status = POLL_STATUS.IN_VOTING
}

function cancelStartPoll() {
	poll.status = POLL_STATUS.ELABORATION
}

function devReopenPoll() {
	poll.status = POLL_STATUS.ELABORATION
}

//TODO: send request to backend.
function castVote() {
	// will then receive an updated poll with current votes, that we mock here
	poll.numVoters++
	poll.alreadyVoted = true
}

function finishPoll() {
	poll.status = POLL_STATUS.FINISHED
}

/** Check if a string looks like an email adress */
const eMailRegEx = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,64}/
function isEmail(s) {
	return eMailRegEx.test(s)
}


</script>

<template>
	<div class="polly">

		<div class="card polly-card user-select-none">
			<div class="card-header position-relative">
				<input v-if="isNew" type="text" class="form-control poll-title-input" id="pollTitleInput" v-model="poll.title"
					placeholder="Polly Title" />
				<h1 v-else class="poll-title" id="pollTitle">{{ poll.title }}</h1>
				<span @click="shareLinkToPoll" class="fa-stack share-poll-icon" title="Share Poll">
					<i class="fa-solid fa-circle fa-stack-2x" style="color:#EEE"></i>
					<i class="fa-solid fa-arrow-up-from-bracket fa-stack-1x"></i>
				</span>
				
			</div>

			<div v-if="isNew" class="card-body">
				<TransitionGroup name="fade" class="polly-proposals-wrapper" tag="ul">
					<li v-for="(prop, index) in poll.proposals" :key="prop.id" class="polly-proposal d-flex align-items-center">
						<input v-model="prop.title" placeholder="Add a proposal" type="text"
							class="form-control flex-grow-1 polly-proposal-input" @blur="(evt) => onProposalBlurr(evt, index)"
							@keyup="(evt) => onProposalKeyup(evt, index)" />
					</li>
				</TransitionGroup>
			</div>

			<div v-if="inElaboration || prepareStart || isFinished" class="card-body">
				<!-- read-only view of the poll -->
				<div class="polly-proposals-wrapper position-relative">
					<div v-for="(proposal, index) in poll.proposals" class="polly-proposal d-flex align-items-center">
						<div v-if="isFinished" class="text-secondary me-2">
							{{ index + 1 }}.
						</div>
						<div class="flex-grow-1 form-control readonly-proposal">
							{{ proposal.title }}
						</div>
					</div>
				</div>
			</div>
			<div v-if="inVoting" class="card-body d-flex flex-row">
				<div class="me-1">
					<div v-for="(prop, index) in poll.proposals" :key="prop.id" class="proposal-index-number">
						{{ index + 1 }}.
					</div>
				</div>
				<div class="polly-proposals-wrapper">
				
					<draggable id="draggableProposals" v-model="poll.proposals" itemKey="id" :animation="500" ghost-class="ghost"
						drag-class="drag" chosen-class="chosen" can-scroll-x="false">
						
						<div v-for="prop in poll.proposals" class="polly-proposal sortable-proposal d-flex align-items-center position-relative form-control">
							<div class="arrow-up pos-top-middle">&nbsp;</div>
							<div class="sortable-proposal-content">
								{{ prop.title }}
							</div>
							<div class="proposal-bars ms-1">
								<i class="fas fa-grip-vertical"></i>
							</div>
							<div class="arrow-up pos-bottom-middle-down">&nbsp;</div>
						</div>
							
						
					</draggable>
				</div>
			</div>

			<div class="card-footer">
				<!-- poll footer with status and buttons -->
				<div class="d-flex align-items-center">
					<div class="flex-grow-1 footer-status">
						&nbsp;
						<Transition name="slide-up">
							<div v-if="isNew">New Polly</div>
							<div v-else-if="inElaboration">Poll not yet started</div>
							<div v-else-if="prepareStart">Starting poll ...</div>
							<div v-else-if="inVoting && !poll.alreadyVoted">Sort proposals</div>
							<div v-else-if="inVoting && poll.alreadyVoted">THX for voting!</div>
							<div v-else-if="isFinished">Poll is finished ({{ poll.numVoters }} voters)</div>
							<div v-else>&nbsp;</div>
						</Transition>
					</div>
					<div v-if="isNew" class="text-end">
						<button @click="savePoll" :disabled="!saveIsActive" type="button"
							class="btn btn-sm btn-primary save-button">
							<i class="fa-regular fa-save"></i>&nbsp;Save
						</button>
					</div>
					<div v-if="inElaboration" class="text-end">
						<button @click="editPoll" type="button" class="btn btn-sm btn-secondary me-2">
							<i class="fa-regular fa-edit"></i>&nbsp;Edit
						</button>
						<button @click="clickStartPollButton" type="button" class="btn btn-sm btn-primary">
							<i class="fa-solid fa-play"></i>&nbsp;Start Poll
						</button>
					</div>
					<div v-if="prepareStart" class="text-end">
						<button type="button" class="btn btn-sm btn-primary disabled" disabled>
							<i class="fa-solid fa-play"></i>&nbsp;Start Poll
						</button>
					</div>
					<div v-if="inVoting" class="text-end">
						<button @click="finishPoll" type="button" class="btn btn-sm btn-secondary me-2">
							<i class="fa-regular fa-circle-check"></i>&nbsp;Finish Poll
						</button>
						<button v-if="!poll.alreadyVoted" @click="castVote" type="button" class="btn btn-sm btn-primary">
							<i class="fa-solid fa-person-booth"></i>&nbsp;Cast Vote
						</button>
					</div>

				</div>
			</div>
		</div>


		<!-- Bootstrap Modal: Ask user for their email -->
		<div class="modal fade" id="askEmailModal" data-bs-backdrop="static" tabindex="-1"
			aria-labelledby="askEmailModalLabel" aria-hidden="true">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header bg-secondary-subtle">
						<h5 class="modal-title" id="askEmailModalLabel">Start Poll</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
							@click="cancelStartPoll"></button>
					</div>
					<div class="modal-body">
						You’ll receive a private admin link to manage your poll, and a separate voting link to share with your
						friends.
						<div class="d-flex mt-2">
							<div class="flex-grow-1">
								<input id="userEmailInput" type="email" v-model="user.email" class="form-control form-control-sm"
									placeholder="Your email" @keyup.enter="userEmailIsValid && startPoll()" aria-label="Your Email">
							</div>
							<div>
								<button type="button" class="btn btn-primary btn-sm ms-2" data-bs-dismiss="modal" @click="startPoll"
									:disabled="!userEmailIsValid">Send</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

	</div>
</template>

<style lang="scss">
// A bootstrap card for creating a poll

$arrow-size: 10px;
$proposal-bg: #e6f0ff;
$polly-proposal-height: 40px;
$polly-proposal-margin-bottom: 16px;

.polly-card {
	max-width: 1024px;

	.card-header {
		display: flex;
		justify-content: center;
		align-items: center;
		border-bottom: none;
		height: 4rem; // Must have fixed height!
		text-align: center;
	}

	.share-poll-icon {
		cursor: pointer;
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		//font-size: 1.25rem;

		&:hover {
			color: $primary;
		}
	}

	.poll-title-input {
		margin: 0;
		padding: 0;
		font-size: 1.25rem;
		font-weight: bold;
		text-align: center;

		&::placeholder {
			color: lightgrey;
		}
	}

	.poll-title {
		margin: 0;
		padding: 0;
		font-size: 1.25rem;
		font-weight: bold;
		text-align: center;

	}

	.polly-proposal-input::placeholder {
		color: lightgrey;
	}

	.readonly-proposal {
		background-color: #EEE;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pos-top-middle {
		position: absolute;
		top: -$arrow-size;
		left: 50%
	}

	.pos-bottom-middle-down {
		position: absolute;
		bottom: -$arrow-size;
		left: 50%;
		transform: rotate(180deg);
	}

	.arrow-up {
		width: 0;
		height: 0;
		border-left: $arrow-size solid transparent;
		border-right: $arrow-size solid transparent;
		border-bottom: $arrow-size solid $proposal-bg;
	}

	// Polly footer
	.card-footer {
		border-top: none;
		//background-color: white;
	}

	.footer-status {
		position: relative;
		font-size: 0.8rem;
	}

	.footer-status div {
		position: absolute;
		left: 0;
		top: 0;
	}
}


// ======== Proposals List =============
// Each proposal has a fixed height and a margin-bottom.
// This is important for the VUE list transition to work properly.


// Wrapper around the proposals list
.polly-proposals-wrapper {
	position: relative;
	padding: 0;
	margin: 0;
	list-style-type: none;
	min-width: 0; // must set to keep flexbox from growing too wide
	flex-grow: 1;
}

// Each proposal. This is used for editable and non-editable views.
.polly-proposal {
	height: $polly-proposal-height;
	box-sizing: border-box;

	&:not(:last-child) {
		margin-bottom: $polly-proposal-margin-bottom;
	}
}

// The index number at the left side of the sortable proposals. (These are fixed and don't move.)
.proposal-index-number {
	height: $polly-proposal-height;
	display: flex;
	align-items: center;
	justify-content: center;

	&:not(:last-child) {
		margin-bottom: $polly-proposal-margin-bottom;
	}
}

// additional styles for sortable proposals
.sortable-proposal {
	//background-color: $proposal-bg !important;
}

.sortable-proposal-content {
	flex-grow: 1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.proposal-bars {
	color: #CCC;
}


// ======== VUE List Transition - used for sortable proposals ======
// https://vuejs.org/guide/built-ins/transition-group.html
// DON'T TOUCH THIS! :-)  This is delicate!


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
	transform: translateY(-50%) scaleY(0); // order is important!
	padding: 0 !important;
	margin: 0 !important;
}

/* 3. ensure leaving items are taken out of layout flow so that moving
      animations can be calculated correctly. */
.fade-leave-active {
	position: absolute;
}


// ========= Slid-up VUE transition - used for status in footer ========
// adapted from https://vuejs.org/guide/built-ins/transition
.slide-up-enter-active,
.slide-up-leave-active {
	transition: all 0.25s ease-out;
}

.slide-up-enter-from {
	opacity: 0;
	transform: translateY(30px);
}

.slide-up-leave-to {
	opacity: 0;
	transform: translateY(-30px);
}

// ========= For VUE.draggable@next ========

.ghost {
	// for drop placeholder
	//border: 1px solid red;
}

.chosen {
	// for the chosen item
	opacity: 0.3;
}

.drag {
	// for the dragging item
	//opacity: 1.0;
	//border: 1px solid blue;
}


//===== small utility classes =======

.cursor-move {
	cursor: move;
}

.info-icon {
	font-size: 0.5rem;
	margin-left: 0.25rem;
}


.thx-for-voting {
	transition: opacity;
	transition-duration: 1s;
	opacity: 0;
}

.thx-for-voting-show {
	opacity: 1;
}

.z-index-500 {
	z-index: 500; // BEFORE / ABOVE the votometer!
}
</style>
