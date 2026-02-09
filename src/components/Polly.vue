<script setup>
/**
 * Polly.vue
 * 
 * A little mobile voting component.
 * In a Polly the voter doesn't cast a vote for just one proposal (or candidate).
 * Instead every voter sorts all proposal into their preferred order.
 */

import {
	//ref,
	reactive,
	computed,
	//	watch,
	onMounted,
} from 'vue'
import { VueDraggableNext as draggable } from 'vue-draggable-next'
import * as bootstrap from 'bootstrap'
import config from "config"
import liquidoInput from './liquido-input.vue'

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

const globalTranslations = {
	"en": {
		"Save": "Save",
		"Edit": "Edit",
		"Send": "Send"
	},
	"de": {
		"Save": "Speichern",
		"Edit": "Bearbeiten",
		"Send": "Senden"
	}
}

const messages = {
  "en": {
    "AddProposalPlaceholder": "Add another proposal",
    "PollyTitlePlaceholder": "Polly Title",
    "PollyTitleEmptyFeedback": "Please enter a title (at least {minLength} characters).",
    "PollyTitleInvalidFeedback": "Title is too short, minimum {minLength} characters.",
    "StartPollInfo": "You’ll receive a private admin link to manage your poll, and a public voting link to share with your friends.",
		"StartPoll": "Start Poll",
    "FinishPoll": "Finish Poll",
    "CastVote": "Cast Vote",
    "NewPolly": "New Polly",
    "PollNotYetStarted": "Poll not yet started",
    "StartingPoll": "Starting poll ...",
    "SortProposals": "Sort proposals",
    "ThxForVoting": "THX for voting!",
    "PollFinished": "Poll is finished ({numVoters} voters)"
  },
  "de": {
    "AddProposalPlaceholder": "Weiteren Vorschlag hinzufügen",
    "PollyTitlePlaceholder": "Polly Titel",
    "PollyTitleEmptyFeedback": "Bitte gib einen Titel ein (mindestens {minLength} Zeichen).",
		"PollyTitleInvalidFeedback": "Titel ist zu kurz, mindestens {minLength} Zeichen.",
		"StartPollInfo": "Ich schicke dir zwei Links: Einen privaten Admin-Link nur für dich. Und einen öffentlchen Link für deine Freunden, mit dem sie abstimmen können.",
    "StartPoll": "Abstimmung starten",
    "FinishPoll": "Abstimmung beenden",
    "CastVote": "Abstimmen",
    "NewPolly": "Neues Polly",
    "PollNotYetStarted": "Noch nicht gestartet",
    "StartingPoll": "Wird gestartet ...",
    "SortProposals": "Sortiere jetzt die Vorschläge",
    "ThxForVoting": "Danke für deine Stimme!",
    "PollFinished": "Abstimmung beendet. ({numVoters} Teilnehmer)"
  }
}

/**
 * Unbelievablly clever localization function. Supports:
 * fallback to another language, global translations, and parameter replacement.
 * @param key The key to be localized
 * @param params An object with parameters to replace in the localized string
 */
function loc(key, params = {}) {
	const lang = "de"  // TODO: navigator.language.startsWith("en") ? "en" : "de";
	let message;

	if (messages[lang] && messages[lang][key]) {
		message = messages[lang][key];
	} else if (messages["en"] && messages["en"][key]) {
		message = messages["en"][key];
	} else if (globalTranslations[lang] && globalTranslations[lang][key]) {
		message = globalTranslations[lang][key];
	} else if (globalTranslations["en"] && globalTranslations["en"][key]) {
		message = globalTranslations["en"][key];
	} else {
		console.warn("Missing translation for key '" + key + "'");
		return key;
	}

	return message.replace(/\{(\w+)\}/g, (match, placeholder) => {
		return params.hasOwnProperty(placeholder) ? params[placeholder] : match;
	});
}


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
console.log("Polly.vue init poll", JSON.stringify(poll, null, 2))

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

function pollTitleValid() {
	return typeof poll.title === "string" && poll.title.trim().length >= config.pollTitleMinLength;
}

/** A poll needs at least a title and two proposals */
const saveIsActive = computed(() => {
	return pollTitleValid() && propHasTitle(0) && propHasTitle(1);
});

const userEmailIsValid = computed(() => {
	return isEmail(user.email)
})


// ========== Methods ===========
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
	poll.status = POLL_STATUS.PREPARE_START
	askEmailModal.show()
	//Debug: poll.status = POLL_STATUS.IN_VOTING
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
		<div class="card polly-card position-relative user-select-none">
			<span v-if="inVoting" @click="shareLinkToPoll" class="fa-stack share-poll-icon" title="Share Poll">
				<i class="fa-solid fa-circle fa-stack-2x" style="color:var(--proposal-icon-bg)"></i>
				<i class="fa-solid fa-arrow-up-from-bracket fa-stack-1x"></i>
			</span>
			<div class="card-header pb-3">
				<div class="text-center my-3">
					<i class="fas fa-scale-balanced fa-3x" style="color: var(--primary)"></i>
				</div>
				<liquido-input v-if="isNew" 
					id="pollTitleInput"
					class="poll-title-input"
					v-model="poll.title"
					:minLength=10 
					:required=true
					:placeholder="loc('PollyTitlePlaceholder')"
					:empty-feedback="loc('PollyTitleEmptyFeedback', {minLength: 10})"
					:invalid-feedback="loc('PollyTitleInvalidFeedback', {minLength: 10})"
					:feedback-placeholder=false
					/>
				<h1 v-else class="poll-title" id="pollTitle">{{ poll.title }}</h1>
			</div>
			<div v-if="isNew" class="card-body">
				<TransitionGroup name="fade" class="polly-proposals-wrapper" tag="ul">
					<li v-for="(prop, index) in poll.proposals" :key="prop.id" class="polly-proposal">
						<input v-model="prop.title" :placeholder="loc('AddProposalPlaceholder')" type="text"
							class="form-control flex-grow-1 polly-proposal-input" @blur="(evt) => onProposalBlurr(evt, index)"
							@keyup="(evt) => onProposalKeyup(evt, index)" />
					</li>
				</TransitionGroup>
			</div>

			<!-- read-only view of the poll -->
			<div v-if="inElaboration || prepareStart || isFinished" class="card-body">
				<div class="polly-proposals-wrapper">
					<div v-for="(proposal, index) in poll.proposals" class="polly-proposal">
						<div v-if="isFinished" class="text-secondary me-2">
							{{ index + 1 }}.
						</div>
						<div class="flex-grow-1 form-control readonly-proposal">
							{{ proposal.title }}
						</div>
					</div>
				</div>
			</div>

			<!-- poll inVoting where user can drag proposals up and down -->
			<div v-if="inVoting" class="card-body d-flex flex-row">
				<div class="me-1">
					<div v-for="(prop, index) in poll.proposals" :key="prop.id" class="proposal-index-number">
						{{ index + 1 }}.
					</div>
				</div>
				<div class="polly-proposals-wrapper">
					<draggable id="pollyDraggable" v-model="poll.proposals" class="draggable" item-key="id"
							:swap-threshold="0.5" :delay="40" :animation="500" :can-scroll-x="false">
						<div v-for="prop in poll.proposals" :id="prop.id" class="form-control polly-proposal sortable-proposal user-select-none">
							<div class="arrow-up pos-top-middle">&nbsp;</div>
							<div class="sortable-proposal-title">
								{{ prop.title }}
							</div>
							<div class="proposal-bars">
								<i class="fas fa-bars"></i>
							</div>
							<div class="arrow-up pos-bottom-middle-down">&nbsp;</div>
						</div>
					</draggable>
				</div>
			</div>

			<!-- Polly footer with button -->
			<div class="card-footer">
				<div class="d-flex align-items-center justify-content-end">
					<div v-if="isNew" class="text-end">
						<button @click="savePoll" :disabled="!saveIsActive" type="button"
							class="btn btn-primary">
							<i class="fa-regular fa-save"></i>&nbsp;{{loc('Save')}}
						</button>
					</div>
					<div v-if="inElaboration" class="text-end">
						<button @click="editPoll" type="button" class="btn btn-secondary me-2">
							<i class="fa-regular fa-edit"></i>&nbsp;{{loc('Edit')}}
						</button>
						<button @click="clickStartPollButton" type="button" class="btn btn-primary">
							<i class="fa-solid fa-play"></i>&nbsp;{{loc('StartPoll')}}
						</button>
					</div>
					<div v-if="prepareStart" class="text-end">
						<button type="button" class="btn btn-primary disabled" disabled>
							<i class="fa-solid fa-play"></i>&nbsp;{{loc('StartPoll')}}
						</button>
					</div>
					<div v-if="inVoting" class="text-end">
						<button @click="finishPoll" type="button" class="btn btn-secondary me-2">
							<i class="fa-regular fa-circle-check"></i>&nbsp;{{loc('FinishPoll')}}
						</button>
						<button v-if="!poll.alreadyVoted" @click="castVote" type="button" class="btn btn-primary">
							<i class="fa-solid fa-person-booth"></i>&nbsp;{{loc('CastVote')}}
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
						<h4 class="modal-title" id="askEmailModalLabel">{{ loc('StartPoll') }}</h4>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
							@click="cancelStartPoll"></button>
					</div>
					<div class="modal-body">
						{{ loc('StartPollInfo') }}
						<div class="d-flex mt-2">
							<div class="flex-grow-1">
								<input id="userEmailInput" type="email" v-model="user.email" class="form-control form-control-sm"
									placeholder="Your email" @keyup.enter="userEmailIsValid && startPoll()" aria-label="Your Email">
							</div>
							<div>
								<button type="button" class="btn btn-primary btn-sm ms-2" data-bs-dismiss="modal" @click="startPoll"
									:disabled="!userEmailIsValid">{{ loc('Send') }}</button>
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
$polly-proposal-margin-bottom: 20px;

.polly-card {
	max-width: 1024px;

	.share-poll-icon {
		cursor: pointer;
		color: var(--icon-color);
		position: absolute;
		top: -0.4rem;
		right: -0.4rem;
		//font-size: 1.25rem;

		&:hover {
			color: var(--primary);
		}
	}

	.poll-title-input {
		text-align: center;
		padding: 0;
		input {
			font-size: 1.2rem;
			font-weight: bold;
			text-align: center;
		}
	}

	.poll-title {
		margin: 0;
		padding: 0;
		font-size: 1.25rem;
		font-weight: bold;
		text-align: center;

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

	// no borders
	.card-header {
		border-bottom: none;
		background-color: white;
	}
	.card-footer {
		border-top: none;
		background-color: white;
		margin-bottom: 1rem;
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


	// ======== Proposals List =============
	// Each proposal has a fixed height and a margin-bottom.
	// This is important for the VUE list transition to work properly.

	.readonly-proposal {
		background-color: var(--bs-secondary-bg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	// Wrapper around the proposals list
	.polly-proposals-wrapper {
		position: relative;
		padding: 0;
		margin: 0;
		list-style-type: none;
		min-width: 0; // must set to keep flexbox from growing too wide
		flex-grow: 1;
	}

	// Each proposal. This is used for all views. (editable, sortable, read-only)
	.polly-proposal {
		position: relative;
		height: $polly-proposal-height;
		display: flex;
		align-items: center;
		//BUGFIX: Every polly-proposal has this margin at the bottom. Also the last one! But cannot remove it, otherwise the drag-fallback also would have this margin and the view jumps a bit up and down.
		margin-bottom: $polly-proposal-margin-bottom;
	}

	.polly-proposal-input::placeholder {
		color: lightgrey;
	}

	// The index number at the left side of the sortable proposals. (These are fixed and don't move.)
	.proposal-index-number {
		height: $polly-proposal-height;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: $polly-proposal-margin-bottom;
	}

	.sortable-proposal {
		background-color: $proposal-bg;
	}

	.sortable-proposal-title {
		flex-grow: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.proposal-bars {
		color: #CCC;
	}

}




// ========= For VUE.draggable@next ========
.draggable {
	.sortable-ghost {
		opacity: 0.1;
	}

	.sortable-chosen {
		z-index: 999;
		-webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
		box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
		//transform: translate(3px, 3px);
	}
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

#askEmailModal .modal-dialog {
	margin-top: 5rem;  // space for liquido-header
}

</style>
