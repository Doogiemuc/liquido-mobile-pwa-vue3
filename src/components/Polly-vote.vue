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
	getCurrentInstance,
	ref,
	reactive,
	computed,
	//	watch,
	onMounted,
} from 'vue'
import draggable from 'vuedraggable'
import * as bootstrap from 'bootstrap'
import config from "config"
import api from '@/services/liquido-graphql-client.js'
import liquidoInput from './liquido-input.vue'
import liquidoHeader from './liquido-header.vue'

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
    "StartPollyInfo": "You’ll receive a private admin link to manage your polly, and a public voting link to share with your friends.",
		"StartPolly": "Start Polly",
    "FinishPolly": "Finish Polly",
    "CastVote": "Cast Vote",
    "NewPolly": "New Polly",
    "PollyNotYetStarted": "Polly not yet started",
    "StartingPolly": "Starting polly ...",
    "SortProposals": "Sort proposals",
		"PollySaveError": "Could not save polly. Please try again.",
    "ThxForVoting": "THX for voting!",
    "PollFinished": "Polly is finished ({numVoters} voters)"
  },
  "de": {
    "AddProposalPlaceholder": "Weiteren Vorschlag hinzufügen",
    "PollyTitlePlaceholder": "Polly Titel",
    "PollyTitleEmptyFeedback": "Bitte gib einen Titel ein (mindestens {minLength} Zeichen).",
		"PollyTitleInvalidFeedback": "Bitte mindestens {minLength} Zeichen.",
		"StartPollyInfo": "Ich schicke dir zwei Links: Einen privaten Admin-Link nur für dich. Und einen öffentlchen Link für deine Freunden, mit dem sie abstimmen können.",
    "StartPolly": "Abstimmung starten",
    "FinishPolly": "Abstimmung beenden",
    "CastVote": "Abstimmen",
    "NewPolly": "Neues Polly",
    "PollyNotYetStarted": "Noch nicht gestartet",
    "StartingPolly": "Wird gestartet ...",
    "SortProposals": "Sortiere jetzt die Vorschläge",
		"PollySaveError": "Sorry, da ist etwas schief gelaufen. Dein Polly konnte gerade nicht gespeichert werden. Bitte versuche es noch einmal.",
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
		return Object.prototype.hasOwnProperty.call(params, placeholder) ? params[placeholder] : match;
	});
}

// ============================================================

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

/* Status flow of a polly */
const POLL_STATUS = {
	NEW: "NEW",
	ELABORATION: "ELABORATION",			 // saved, but not yet started. The polly is still editable.
	PREPARE_START: "PREPARE_START",  // this status only exists in the frontend. Here we ask for user's email
	IN_VOTING: "VOTING",
	FINISHED: "FINISHED"
}

// ============================================================

/** Optional initialPolly property that can be passed. Wll be mereded with default's for required fields. */
const props = defineProps({
  initialPolly: {
    type: Object,
    required: false,
    default: () => ({})
  }
})

function createEmptyProposal(offset = 0) {
  return {
    id: Date.now() + offset,
    title: ""
  }
}

function createDefaultPolly() {
  return {
    title: "",
    status: POLL_STATUS.NEW,
    proposals: [
      createEmptyProposal(1),
      createEmptyProposal(2)
    ],
    alreadyVoted: false,
    numVoters: 0
  }
}

function normalizePolly(input = {}) {
  const base = createDefaultPolly()

  const merged = {
    ...base,
    ...input,
  }

  if (!Array.isArray(input.proposals) || input.proposals.length === 0) {
    merged.proposals = base.proposals
  } else {
    merged.proposals = input.proposals.map((p, i) => ({
      id: p.id ?? Date.now() + i,
      title: p.title ?? ""
    }))

    while (merged.proposals.length < 2) {
      merged.proposals.push(createEmptyProposal(merged.proposals.length))
    }
  }

  return merged
}

/** This is the local VUE reactive object that we work with */
const polly = reactive(
  normalizePolly(structuredClone(props.initialPolly))
)
const { proxy } = getCurrentInstance()
const isSaving = ref(false)
const isStarting = ref(false)
const isCastingVote = ref(false)
const isFinishing = ref(false)

// IF  Polly is new 
// AND last element has a title
// THEN add another empty proposal input at the bottom.
// (It will be removed when saving.)
if (polly.status == POLL_STATUS.NEW && propHasTitle(polly.proposals.length - 1)) addProposal()

//TODO: Dummy user for testing
const user = reactive({
	id: Date.now(),
	name: "Donald Duck",
	email: "dummy@domain.org"
});

// ========== Computed Properties ===========

const isNew = computed(() => polly.status == POLL_STATUS.NEW);
const inElaboration = computed(() => polly.status == POLL_STATUS.ELABORATION);
const prepareStart = computed(() => polly.status == POLL_STATUS.PREPARE_START);
const inVoting = computed(() => polly.status == POLL_STATUS.IN_VOTING);
const isFinished = computed(() => polly.status == POLL_STATUS.FINISHED);

function pollyTitleValid() {
	return typeof polly.title === "string" && polly.title.trim().length >= config.pollTitleMinLength;
}

/** A polly needs at least a title and two proposals */
const saveIsActive = computed(() => {
	return pollyTitleValid() && propHasTitle(0) && propHasTitle(1);
});

const userEmailIsValid = computed(() => {
	return isEmail(user.email)
})


// ========== Methods ===========
function propHasTitle(index) {
	const title = polly.proposals?.[index]?.title;
	return typeof title === "string" && title.trim().length > 0;
}

/** Popup when user clicks save. */
let askEmailModal;

onMounted(() => {
	console.log("Polly", polly)
	askEmailModal = new bootstrap.Modal(document.getElementById('askEmailModal'), {})
	const pollTitleInput = document.getElementById("pollTitleInput")
	if (pollTitleInput) pollTitleInput.focus();
});

function addProposal() {
	polly.proposals.push({
		id: Date.now(),  // random unique ID
		title: "",
	});
}

function deleteProposal(index) {
	console.log("deleteProposal(index=" + index + ")");
	if (polly.proposals.length <= 2) return; // Must always have at lest two proposal inputs
	polly.proposals.splice(index, 1);
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
	let len = polly.proposals.length;
	if (len >= 2 && polly.proposals[index]) {
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
	if (pollyProposalInputs.length != polly.proposals.length) {
		return;
	}

	// Create a map to track occurrences of each title
	const titleOccurrences = new Map();

	// Step 1: Count occurrences of each non-empty title
	for (let i = 0; i < polly.proposals.length; i++) {
		const title = polly.proposals[i].title.trim();
		if (title !== "") {
			if (!titleOccurrences.has(title)) {
				titleOccurrences.set(title, []);
			}
			titleOccurrences.get(title).push(i); // Store the indices where the title appears
		}
	}

	// Step 2: Mark inputs as valid/invalid based on duplicates
	for (let i = 0; i < polly.proposals.length; i++) {
		const title = polly.proposals[i].title.trim();

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
	let len = polly.proposals.length;
	if (index === len - 1 && propHasTitle(index)) {
		addProposal();
	} else if (evt.key == "Enter" && len >= 2 && !propHasTitle(index)) {
		deleteProposal(index);
	} else {
		checkForDuplicateTitles()
	}
}

function cleanedProposalTitles() {
	return (polly.proposals || [])
		.map(proposal => proposal?.title?.trim())
		.filter(Boolean)
}

/**
 * Save the edited polly.
 * (Removes the last porposal if its title is empty.)
 */
async function savePolly() {
	if (isSaving.value) return
	isSaving.value = true
	try {
		const savedPolly = await api.savePolly({
			title: polly.title,
			proposals: cleanedProposalTitles().map(title => ({ title })),
		})
		Object.assign(polly, normalizePolly(structuredClone(savedPolly)))
		polly.status = POLL_STATUS.ELABORATION
	} catch (err) {
		console.error("Cannot save polly", err)
		proxy?.$root?.showError(loc('PollySaveError'), "")
	} finally {
		isSaving.value = false
	}
}

/** Go back to edit mode. This is only allowed if there no votes yet. */
async function editPolly() {
	if (polly.numVoters > 0) {
		//TODO: Show a modal that says "Cannot edit polly anymore, when there are already votes"

		console.warn("Cannot edit polly with votes")
		return
	}
	if (isSaving.value) return
	isSaving.value = true
	try {
		const updatedPolly = await api.editPolly(
			polly.id,
			polly.title,
			cleanedProposalTitles()
		)
		Object.assign(polly, normalizePolly(structuredClone(updatedPolly)))
		polly.status = POLL_STATUS.NEW
		onProposalKeyup({}, polly.proposals.length - 1) // to add an empty proposal at the end
	} catch (err) {
		console.error("Cannot edit polly", err)
		proxy?.$root?.showError(loc('PollySaveError'), "")
	} finally {
		isSaving.value = false
	}
}

function clickStartPollyButton() {
	polly.status = POLL_STATUS.PREPARE_START
	askEmailModal.show()
	//Debug: polly.status = POLL_STATUS.IN_VOTING
}

async function startPolly() {
	if (isStarting.value) return
	isStarting.value = true
	try {
		const updatedPolly = await api.startPolly(polly.id, user.email)
		Object.assign(polly, normalizePolly(structuredClone(updatedPolly)))
		askEmailModal.hide()
		console.log("Polly started, email sent to", user.email)
		polly.status = POLL_STATUS.IN_VOTING
	} catch (err) {
		console.error("Cannot start polly", err)
		proxy?.$root?.showError(loc('PollySaveError'), "")
	} finally {
		isStarting.value = false
	}
}

function cancelStartPolly() {
	polly.status = POLL_STATUS.ELABORATION
}

/*
function devReopenPolly() {
	polly.status = POLL_STATUS.ELABORATION
}
*/

async function castVoteInPolly() {
	if (isCastingVote.value) return
	isCastingVote.value = true
	try {
		// Extract proposal IDs in current sorted order
		const voteOrderIds = polly.proposals.map(p => p.id)
		// TODO: Retrieve voterToken via getVoterTokenForPolly(polly.id)
		const voterToken = "mock-voter-token-123" // Placeholder - will be fetched from backend
		
		const updatedPolly = await api.castVoteInPolly(polly.id, voteOrderIds, voterToken)
		Object.assign(polly, normalizePolly(structuredClone(updatedPolly)))
		polly.alreadyVoted = true
		console.log("Vote cast successfully")
	} catch (err) {
		console.error("Cannot cast vote", err)
		proxy?.$root?.showError(loc('PollySaveError'), "")
	} finally {
		isCastingVote.value = false
	}
}

async function finishPolly() {
	if (isFinishing.value) return
	isFinishing.value = true
	try {
		const updatedPolly = await api.finishPolly(polly.id)
		Object.assign(polly, normalizePolly(structuredClone(updatedPolly)))
		polly.status = POLL_STATUS.FINISHED
		console.log("Polly finished, winner:", updatedPolly.winner?.title)
	} catch (err) {
		console.error("Cannot finish polly", err)
		proxy?.$root?.showError(loc('PollySaveError'), "")
	} finally {
		isFinishing.value = false
	}
}

function shareLinkToPolly() {
	// TODO: Generate and share public voting link
	console.log("TODO: Share link to polly", polly.id)
}

/** Check if a string looks like an email adress */
const eMailRegEx = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,64}/
function isEmail(s) {
	return eMailRegEx.test(s)
}


</script>

<template>
	<div class="polly">
		<liquido-header ref="liquido-header"></liquido-header>
		<div class="card polly-card position-relative user-select-none">
			<span v-if="inVoting" @click="shareLinkToPolly" class="fa-stack share-polly-icon" title="Share Polly">
				<i class="fa-solid fa-circle fa-stack-2x" style="color:var(--proposal-icon-bg)"></i>
				<i class="fa-solid fa-arrow-up-from-bracket fa-stack-1x"></i>
			</span>
			<div class="card-header pb-3">
				<div class="text-center my-3">
					<i class="fas fa-scale-balanced fa-3x" style="color: var(--primary)"></i>
				</div>
				<liquido-input v-if="isNew" 
					id="pollTitleInput"
					class="polly-title-input"
					v-model="polly.title"
					:minLength=10 
					:required=true
					:placeholder="loc('PollyTitlePlaceholder')"
					:empty-feedback="loc('PollyTitleEmptyFeedback', {minLength: 10})"
					:invalid-feedback="loc('PollyTitleInvalidFeedback', {minLength: 10})"
					:feedback-placeholder=false
					/>
				<h1 v-else class="polly-title" id="pollyTitle">{{ polly.title }}</h1>
			</div>
			<div v-if="isNew" class="card-body">
				<TransitionGroup name="fade" class="polly-proposals-wrapper" tag="ul">
					<li v-for="(prop, index) in polly.proposals" :key="prop.id" class="polly-proposal">
						<input v-model="prop.title" :placeholder="loc('AddProposalPlaceholder')" type="text"
							class="form-control flex-grow-1 polly-proposal-input" @blur="(evt) => onProposalBlurr(evt, index)"
							@keyup="(evt) => onProposalKeyup(evt, index)" />
					</li>
				</TransitionGroup>
			</div>

			<!-- read-only view of the polly -->
			<div v-if="inElaboration || prepareStart || isFinished" class="card-body">
				<div class="polly-proposals-wrapper">
					<div v-for="(proposal, index) in polly.proposals" :key="proposal.id" class="polly-proposal">
						<div v-if="isFinished" class="text-secondary me-2">
							{{ index + 1 }}.
						</div>
						<div class="flex-grow-1 form-control readonly-proposal">
							{{ proposal.title }}
						</div>
					</div>
				</div>
			</div>

			<!-- polly inVoting where user can drag proposals up and down -->
			<div v-if="inVoting" class="card-body d-flex flex-row">
				<div class="me-1">
					<div v-for="(prop, index) in polly.proposals" :key="prop.id" class="proposal-index-number">
						{{ index + 1 }}.
					</div>
				</div>
				<div class="polly-proposals-wrapper">
					<draggable id="pollyDraggable" v-model="polly.proposals" class="draggable" item-key="id"
							:swap-threshold="0.5" :delay="40" :animation="500" :can-scroll-x="false">
						<template #item="{ element: prop }">
							<div class="form-control polly-proposal sortable-proposal user-select-none">
								<div class="arrow-up pos-top-middle">&nbsp;</div>
								<div class="sortable-proposal-title">
									{{ prop.title }}
								</div>
								<div class="proposal-bars">
									<i class="fas fa-bars"></i>
								</div>
								<div class="arrow-up pos-bottom-middle-down">&nbsp;</div>
							</div>
						</template>
					</draggable>
				</div>
			</div>

			<!-- Polly footer with button -->
			<div class="card-footer">
				<div class="d-flex align-items-center justify-content-end">
					<div v-if="isNew" class="text-end">
						<button @click="savePolly" :disabled="!saveIsActive || isSaving" type="button"
							class="btn btn-primary">
							<i class="fa-regular fa-save"></i>&nbsp;{{loc('Save')}}
						</button>
					</div>
					<div v-if="inElaboration" class="text-end">
						<button v-if="polly.numVoters === 0" @click="editPolly" :disabled="isSaving" type="button" class="btn btn-secondary me-2">
							<i class="fa-regular fa-edit"></i>&nbsp;{{loc('Edit')}}
						</button>
						<button @click="clickStartPollyButton" :disabled="isStarting" type="button" class="btn btn-primary">
							<i class="fa-solid fa-play"></i>&nbsp;{{loc('StartPolly')}}
						</button>
					</div>
					<div v-if="prepareStart" class="text-end">
						<button type="button" class="btn btn-primary disabled" disabled>
							<i class="fa-solid fa-play"></i>&nbsp;{{loc('StartPolly')}}
						</button>
					</div>
					<div v-if="inVoting" class="text-end">
						<button @click="finishPolly" :disabled="isFinishing" type="button" class="btn btn-secondary me-2">
							<i class="fa-regular fa-circle-check"></i>&nbsp;{{loc('FinishPolly')}}
						</button>
						<button v-if="!polly.alreadyVoted" @click="castVoteInPolly" :disabled="isCastingVote" type="button" class="btn btn-primary">
							<i class="fa-solid fa-person-booth"></i>&nbsp;{{loc('CastVote')}}
						</button>
					</div>
				</div>
			</div>
		</div>


		<!-- Bootstrap Modal: Ask user for their email -->
		<div class="modal fade" id="askEmailModal" data-bs-backdrop="static" tabindex="-1"
			aria-labelledby="askEmailModalLabel" aria-hidden="true">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header bg-secondary-subtle">
						<h4 class="modal-title" id="askEmailModalLabel">{{ loc('StartPolly') }}</h4>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"
							@click="cancelStartPolly"></button>
					</div>
					<div class="modal-body">
						{{ loc('StartPollyInfo') }}
						<div class="d-flex mt-2">
							<div class="flex-grow-1">
								<input id="userEmailInput" type="email" v-model="user.email" class="form-control form-control-sm"
									placeholder="Your email" @keyup.enter="userEmailIsValid && startPolly()" aria-label="Your Email">
							</div>
							<div>
								<button type="button" class="btn btn-primary btn-sm ms-2" data-bs-dismiss="modal" @click="startPolly"
									:disabled="!userEmailIsValid">{{ loc('Send') }}</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

	</div>
</template>

<style>

.polly-card {
	--arrow-size: 10px;
	--proposal-bg: #e6f0ff;
	--polly-proposal-height: 40px;
	--polly-proposal-margin-bottom: 20px;

	max-width: 1024px;

	.share-polly-icon {
		cursor: pointer;
		color: white;
		position: absolute;
		top: -0.4rem;
		right: -0.4rem;

		&:hover {
			color: var(--primary);
		}
	}

	.polly-title-input {
		text-align: center;
		padding: 0;
		input {
			font-size: 1.2rem;
			font-weight: bold;
			text-align: center;
		}
	}

	.polly-title {
		margin: 0;
		padding: 0;
		font-size: 1.25rem;
		font-weight: bold;
		text-align: center;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;  /* max 2 lines */
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.pos-top-middle {
		position: absolute;
		top: calc(-1*var(--arrow-size));
		left: 50%
	}

	.pos-bottom-middle-down {
		position: absolute;
		bottom: calc(-1*var(--arrow-size));
		left: 50%;
		transform: rotate(180deg);
	}

	.arrow-up {
		width: 0;
		height: 0;
		border-left: var(--arrow-size) solid transparent;
		border-right: var(--arrow-size) solid transparent;
		border-bottom: var(--arrow-size) solid var(--proposal-bg);
	}

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
		font-size: var(--font-size-small);
	}

	.footer-status div {
		position: absolute;
		left: 0;
		top: 0;
	}

	/**
	 * ======== Proposals List =============
	 * Each proposal has a fixed height and a margin-bottom.
	 * This is important for the VUE list transition to work properly
	 */

	.readonly-proposal {
		background-color: var(--bs-secondary-bg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Wrapper around the proposals list */
	.polly-proposals-wrapper {
		position: relative;
		padding: 0;
		margin: 0;
		list-style-type: none;
		min-width: 0; /* must set to keep flexbox from growing too wide */
		flex-grow: 1;
	}

	/* Each proposal. This is used for all views. (editable, sortable, read-only) */
	.polly-proposal {
		position: relative;
		height: var(--polly-proposal-height);
		display: flex;
		align-items: center;
		/* BUGFIX: Every polly-proposal has this margin at the bottom. Also the last one! But cannot remove it, otherwise the drag-fallback also would have this margin and the view jumps a bit up and down. */
		margin-bottom: var(--polly-proposal-margin-bottom);
	}

	.polly-proposal-input::placeholder {
		color: lightgrey;
	}

	/* The index number at the left side of the sortable proposals. (These are fixed and don't move.) */
	.proposal-index-number {
		height: var(--polly-proposal-height);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--polly-proposal-margin-bottom);
	}

	.sortable-proposal {
		background-color: var(--proposal-bg);
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


/* ========= For VUE.draggable@next ======== */
.draggable {
	.sortable-ghost {
		opacity: 0.1;
	}

	.sortable-chosen {
		z-index: 999;
		-webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
		box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
	}
}

/* ===== small utility classes ======= */
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

</style>
