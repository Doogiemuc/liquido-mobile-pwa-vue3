<script setup>
/**
 * polly-vote.vue
 *
 * The whole Polly UI in one component: writing a polly, voting in one, and seeing the result.
 *
 * A polly has only two states, and it is live from the moment it exists:
 *
 *   DRAFT (client only, never saved)  ->  VOTING  ->  FINISHED
 *
 * Everyone opens the same link. Whoever created the polly is recognised by their passkey
 * and gets the admin buttons; everyone else gets a ballot. In a Polly you do not pick one
 * option - you drag them all into your preferred order, favourite on top.
 */

import { ref, reactive, computed, onMounted, getCurrentInstance } from 'vue'
import draggable from 'vuedraggable'
import config from "config"
import pollyApi from '@/polly/polly-client.js'
import passkey from '@/polly/polly-passkey.js'
import { PollyError, POLLY_STATUS } from '@/polly/polly-constants.js'
import { usePollyI18n } from '@/polly/polly-i18n.js'
import liquidoInput from './liquido-input.vue'

const t = usePollyI18n()
const { proxy } = getCurrentInstance()

const props = defineProps({
	/** Set when we arrived through a share link. Absent means "write a new polly". */
	publicId: {
		type: String,
		required: false,
		default: undefined,
	},
})

/** Client-only state, before the polly has ever been saved. */
const DRAFT = "DRAFT"

const TITLE_MIN_LENGTH = config.pollTitleMinLength

/* ========================= state ========================= */

function emptyProposal(offset = 0) {
	return { id: "new-" + (Date.now() + offset), title: "" }
}

/** The polly we are working with. Shaped like the backend's answer, plus the DRAFT status. */
const polly = reactive({
	publicId: undefined,
	title: "",
	status: DRAFT,
	numBallots: 0,
	isOwner: true,				// while drafting, it is yours by definition
	alreadyVoted: false,
	proposals: [emptyProposal(1), emptyProposal(2)],
	winner: null,
})

const isLoading = ref(false)
const isSaving = ref(false)
const isVoting = ref(false)
const isFinishing = ref(false)
/** Set when we are editing an already saved polly, so Save knows to update rather than create. */
const isEditing = ref(false)

/* ========================= computed ========================= */

const isDraft = computed(() => polly.status === DRAFT)
const inVoting = computed(() => polly.status === POLLY_STATUS.VOTING)
const isFinished = computed(() => polly.status === POLLY_STATUS.FINISHED)

/** The editable form is shown for a brand new polly and when the owner reopens one. */
const isEditable = computed(() => isDraft.value || isEditing.value)

const titleIsValid = computed(() =>
	typeof polly.title === "string" && polly.title.trim().length >= TITLE_MIN_LENGTH)

function proposalHasTitle(index) {
	const title = polly.proposals?.[index]?.title
	return typeof title === "string" && title.trim().length > 0
}

/** A polly needs a question and at least two options. */
const canSave = computed(() => titleIsValid.value && proposalHasTitle(0) && proposalHasTitle(1))

/** Only the owner may edit, and only while nobody has voted. */
const canEdit = computed(() => polly.isOwner && polly.numBallots === 0 && inVoting.value)

const canVote = computed(() => inVoting.value && !polly.alreadyVoted && !isEditable.value)

const shareLink = computed(() => polly.publicId ? pollyApi.shareLinkFor(polly.publicId) : "")

/* ========================= lifecycle ========================= */

onMounted(async () => {
	if (props.publicId) {
		await loadPolly()
	} else {
		document.getElementById("pollyTitleInput")?.focus()
	}
})

async function loadPolly() {
	isLoading.value = true
	try {
		// Do NOT prompt for a passkey just to look at a polly. We only need one to vote,
		// and asking before the visitor knows what they are looking at is rude.
		const loaded = await pollyApi.getPolly(props.publicId)
		Object.assign(polly, loaded)
	} catch (err) {
		showProblem(err, 'PollyNotFound')
	} finally {
		isLoading.value = false
	}
}

/* ========================= editing the option list ========================= */

function addProposal() {
	polly.proposals.push(emptyProposal(polly.proposals.length))
}

function deleteProposal(index) {
	if (polly.proposals.length <= 2) return		// always keep two input rows
	polly.proposals.splice(index, 1)
}

/**
 * GIVEN the user leaves an input field
 *   AND there are more than two of them
 *  WHEN this field is empty
 *  THEN drop it
 *  ELSE WHEN it is the last one and it now has text
 *  THEN offer another empty one below.
 */
function onProposalBlur(evt, index) {
	const len = polly.proposals.length
	if (len >= 2 && polly.proposals[index]) {
		if (index < len - 1 && !proposalHasTitle(index)) {
			deleteProposal(index)
		} else if (index === len - 1 && proposalHasTitle(index)) {
			addProposal()
		}
	}
}

/** Typing in the last field grows the list; Enter on an empty one removes it. */
function onProposalKeyup(evt, index) {
	const len = polly.proposals.length
	if (index === len - 1 && proposalHasTitle(index)) {
		addProposal()
	} else if (evt.key === "Enter" && len >= 2 && !proposalHasTitle(index)) {
		deleteProposal(index)
	} else {
		markDuplicateTitles()
	}
}

/** Mark options that say the same thing twice. Empty ones are fine. */
function markDuplicateTitles() {
	const inputs = document.getElementsByClassName("polly-proposal-input") || []
	if (inputs.length !== polly.proposals.length) return

	const seen = new Map()
	polly.proposals.forEach((proposal, i) => {
		const title = proposal.title.trim()
		if (!title) return
		if (!seen.has(title)) seen.set(title, [])
		seen.get(title).push(i)
	})

	polly.proposals.forEach((proposal, i) => {
		const title = proposal.title.trim()
		const isDuplicate = title !== "" && seen.get(title)?.length > 1
		inputs[i].classList.toggle("is-invalid", isDuplicate)
	})
}

function cleanedProposalTitles() {
	return polly.proposals.map(p => p?.title?.trim()).filter(Boolean)
}

/* ========================= actions ========================= */

/**
 * Create the polly. This is the one moment that needs the user's device.
 *
 * The passkey does double duty: it makes this browser someone the backend can recognise
 * again, and it makes that someone the owner. There is no start step afterwards - the polly
 * is open for voting the instant it exists.
 */
async function savePolly() {
	if (isSaving.value || !canSave.value) return
	isSaving.value = true
	try {
		await passkey.ensurePasskeySession()

		const saved = isEditing.value
			? await pollyApi.editPolly(polly.publicId, polly.title, cleanedProposalTitles())
			: await pollyApi.createPolly(polly.title, cleanedProposalTitles())

		Object.assign(polly, saved)
		isEditing.value = false
		// Typing down a long list leaves the page scrolled. Bring the whole card back into
		// view so the creator actually sees their new polly - and the share icon, which sits
		// on the card's top edge and would otherwise stay above the fold.
		proxy?.$root?.scrollToTop()
	} catch (err) {
		showProblem(err, 'CannotSave')
	} finally {
		isSaving.value = false
	}
}

/** Reopen the form. Purely local - nothing is sent until Save. */
function editPolly() {
	if (!canEdit.value) return
	isEditing.value = true
	if (proposalHasTitle(polly.proposals.length - 1)) addProposal()
}

/**
 * Cast the ballot: the options in the order they were dragged into, favourite first.
 * A voter who has no passkey yet gets one here, with a single tap.
 */
async function castVote() {
	if (isVoting.value || !canVote.value) return
	isVoting.value = true
	try {
		await passkey.ensurePasskeySession()
		const voteOrder = polly.proposals.map(p => p.id)
		Object.assign(polly, await pollyApi.voteInPolly(polly.publicId, voteOrder))
	} catch (err) {
		showProblem(err, 'CannotSave')
	} finally {
		isVoting.value = false
	}
}

/** Close the polly and reveal the winner. Owner only. */
async function finishPolly() {
	if (isFinishing.value) return
	isFinishing.value = true
	try {
		Object.assign(polly, await pollyApi.finishPolly(polly.publicId))
	} catch (err) {
		showProblem(err, 'CannotSave')
	} finally {
		isFinishing.value = false
	}
}

/** Share the one link, via the native share sheet on mobile and the clipboard elsewhere. */
async function sharePolly() {
	if (!polly.publicId) return
	try {
		if (navigator.share) {
			await navigator.share({ title: polly.title, url: shareLink.value })
		} else {
			await navigator.clipboard.writeText(shareLink.value)
			proxy?.$root?.showSuccess(t('LinkCopied'), "")
		}
	} catch (err) {
		console.debug("Polly: share cancelled", err)		// dismissing the sheet is not an error
	}
}

/* ========================= errors ========================= */

/** Turn a backend error code into something a human wants to read. */
function showProblem(err, fallbackKey) {
	const messageKey = {
		[PollyError.NEED_PASSKEY]: 'NeedPasskey',
		[PollyError.POLLY_NOT_FOUND]: 'PollyNotFound',
		[PollyError.ALREADY_VOTED]: 'AlreadyVoted',
		[PollyError.NOT_POLLY_OWNER]: 'NotOwner',
		[PollyError.POLLY_ALREADY_STARTED]: 'CannotEditAnymore',
	}[err?.pollyErrorCode] || fallbackKey

	// Being told you already voted is information, not a failure
	if (err?.pollyErrorCode === PollyError.ALREADY_VOTED) {
		polly.alreadyVoted = true
		proxy?.$root?.showInfo(t(messageKey), "")
		return
	}
	console.warn("Polly problem:", err)
	proxy?.$root?.showError(t(messageKey), "")
}
</script>

<template>
	<div class="polly">
		<!-- No <liquido-header> here: root-app.vue already renders the one shared header. -->
		<div class="card polly-card position-relative user-select-none">
			<button v-if="polly.publicId && !isEditable" id="sharePollyButton" type="button"
				class="polly-share-btn" :title="t('Share')" :aria-label="t('Share')" @click="sharePolly">
				<i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i>
			</button>

			<div class="card-header polly-card-header">
				<i class="fas fa-scale-balanced polly-card-icon" aria-hidden="true"></i>
				<liquido-input v-if="isEditable"
					id="pollyTitleInput"
					class="polly-title-input"
					v-model="polly.title"
					:minLength="TITLE_MIN_LENGTH"
					:required="true"
					:placeholder="t('PollyTitlePlaceholder')"
					:empty-feedback="t('PollyTitleEmptyFeedback', {minLength: TITLE_MIN_LENGTH})"
					:invalid-feedback="t('PollyTitleInvalidFeedback', {minLength: TITLE_MIN_LENGTH})"
					:feedback-placeholder="false"
					/>
				<h1 v-else class="polly-title" id="pollyTitle">{{ polly.title }}</h1>
			</div>

			<!-- writing a polly: a growing list of option inputs -->
			<div v-if="isEditable" class="card-body polly-card-body">
				<TransitionGroup name="fade" class="polly-proposals-wrapper" tag="ul">
					<li v-for="(prop, index) in polly.proposals" :key="prop.id" class="polly-proposal">
						<input v-model="prop.title" :placeholder="t('AddProposalPlaceholder')" type="text"
							class="form-control flex-grow-1 polly-proposal-input" @blur="(evt) => onProposalBlur(evt, index)"
							@keyup="(evt) => onProposalKeyup(evt, index)" />
					</li>
				</TransitionGroup>
			</div>

			<!-- voting: drag the options into your preferred order -->
			<div v-if="inVoting && !isEditable && !polly.alreadyVoted" class="card-body polly-card-body">
				<div class="polly-rank-grid">
					<div class="polly-rank-numbers" aria-hidden="true">
						<div v-for="(prop, index) in polly.proposals" :key="prop.id" class="proposal-index-number">
							{{ index + 1 }}
						</div>
					</div>
					<div class="polly-proposals-wrapper">
						<draggable id="pollyDraggable" v-model="polly.proposals" class="draggable" item-key="id"
								handle=".proposal-bars"
								ghost-class="polly-ghost" chosen-class="polly-chosen" drag-class="polly-drag"
								:swap-threshold="0.5" :delay="40" :animation="500" :can-scroll-x="false">
							<template #item="{ element: prop }">
								<div class="polly-proposal sortable-proposal user-select-none">
									<div class="sortable-proposal-title">{{ prop.title }}</div>
									<span class="proposal-bars" :title="t('SortProposals')" :aria-label="t('SortProposals')" role="button" tabindex="0">
										<i class="fas fa-grip-lines" aria-hidden="true"></i>
									</span>
								</div>
							</template>
						</draggable>
					</div>
				</div>
			</div>

			<!-- read-only: already voted, or the polly is over -->
			<div v-if="(inVoting && polly.alreadyVoted && !isEditable) || isFinished" class="card-body polly-card-body">
				<div class="polly-rank-grid">
					<div v-if="isFinished" class="polly-rank-numbers" aria-hidden="true">
						<div v-for="(proposal, index) in polly.proposals" :key="proposal.id" class="proposal-index-number">
							{{ index + 1 }}
						</div>
					</div>
					<div class="polly-proposals-wrapper">
						<div v-for="proposal in polly.proposals" :key="proposal.id" class="polly-proposal">
							<div class="readonly-proposal"
								:class="{ 'winner-proposal': isFinished && polly.winner && proposal.id === polly.winner.id }">
								<span class="sortable-proposal-title">{{ proposal.title }}</span>
								<i v-if="isFinished && polly.winner && proposal.id === polly.winner.id"
									class="fas fa-trophy ms-1" :title="t('Winner')"></i>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- status line -->
			<div v-if="!isEditable && polly.publicId" id="pollyStatus" class="polly-status">
				<span v-if="isFinished">{{ t('PollyFinished', { count: polly.numBallots }) }}</span>
				<span v-else-if="polly.alreadyVoted">{{ t('AlreadyVoted') }}</span>
				<span v-else-if="polly.isOwner">{{ t('NumBallots', { count: polly.numBallots }) }}</span>
				<span v-else>{{ t('SortProposals') }}</span>
			</div>

			<div class="card-footer polly-card-footer">
				<div class="polly-actions">
					<!-- writing or editing -->
					<button v-if="isEditable" id="savePollyButton" @click="savePolly" :disabled="!canSave || isSaving"
						type="button" class="btn btn-primary polly-btn">
						<i class="fa-solid fa-fingerprint" aria-hidden="true"></i><span>{{ isEditing ? t('Save') : t('CreatePolly') }}</span>
					</button>

					<!-- live polly -->
					<template v-if="!isEditable && inVoting">
						<button v-if="canEdit" id="editPollyButton" @click="editPolly" type="button" class="btn btn-outline-secondary polly-btn">
							<i class="fa-regular fa-edit" aria-hidden="true"></i><span>{{ t('Edit') }}</span>
						</button>
						<!-- The owner votes in their own polly like anybody else -->
						<button v-if="canVote" id="castVoteButton" @click="castVote" :disabled="isVoting" type="button" class="btn btn-primary polly-btn">
							<i class="fa-solid fa-person-booth" aria-hidden="true"></i><span>{{ t('CastVote') }}</span>
						</button>
						<button v-if="polly.isOwner" id="finishPollyButton" @click="finishPolly" :disabled="isFinishing"
							type="button" class="btn polly-btn polly-btn-quiet">
							<i class="fa-regular fa-circle-check" aria-hidden="true"></i><span>{{ t('FinishPolly') }}</span>
						</button>
					</template>
				</div>
			</div>
		</div>

		<!-- A polly is not a LIQUIDO poll, and the difference is worth being honest about -->
		<p v-if="isEditable" class="polly-hint text-secondary">
			<i class="fa-solid fa-fingerprint" aria-hidden="true"></i><span>{{ t('CreatePollyHint') }}</span>
		</p>
		<p v-else class="polly-hint text-secondary">
			<i class="fa-solid fa-user-group" aria-hidden="true"></i><span>{{ t('PrivacyNote') }}</span>
		</p>
	</div>
</template>

<style>

.polly-card {
	--proposal-bg: #e6f0ff;
	--proposal-border: #cddffb;
	--polly-proposal-height: 44px;
	--polly-proposal-gap: 10px;
	--polly-section-gap: 1.5rem;
	--polly-card-padding: 1.5rem;

	max-width: 1024px;
	margin-inline: auto;
	border: 1px solid var(--bs-border-color, #e5e7eb);
	border-radius: 1rem;
	box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
	overflow: hidden;

	/* ---------- share ---------- */
	.polly-share-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 2.25rem;
		height: 2.25rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--bs-border-color, #e5e7eb);
		border-radius: 50%;
		background-color: white;
		color: var(--secondary);
		padding: 0;
		line-height: 1;
		transition: color .15s ease, background-color .15s ease, border-color .15s ease;

		&:hover {
			color: var(--primary);
			background-color: var(--proposal-bg);
			border-color: var(--proposal-border);
		}
		&:active { transform: translateY(1px); }
		&:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
	}

	/* ---------- header ---------- */
	.polly-card-header {
		border-bottom: none;
		background-color: white;
		padding: var(--polly-card-padding) var(--polly-card-padding) 0;
		text-align: center;
	}

	.polly-card-icon {
		display: block;
		font-size: 2rem;
		line-height: 1;
		color: var(--primary);
		margin-bottom: 1rem;
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
		margin: 0 auto;
		padding: 0;
		max-width: 34ch;
		font-size: 1.25rem;
		line-height: 1.35;
		font-weight: bold;
		text-align: center;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;  /* max 2 lines */
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* ---------- body ---------- */
	.polly-card-body {
		padding: var(--polly-section-gap) var(--polly-card-padding) 0;
	}

	.polly-rank-grid {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.polly-rank-numbers {
		display: flex;
		flex-direction: column;
		gap: var(--polly-proposal-gap);
		flex: 0 0 auto;
	}

	/* The index number at the left side of the proposals. (These are fixed and don't move.) */
	.proposal-index-number {
		height: var(--polly-proposal-height);
		min-width: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		font-size: var(--font-size-small);
		font-variant-numeric: tabular-nums;
		color: var(--secondary);
	}

	/* Wrapper around the proposals list */
	.polly-proposals-wrapper {
		position: relative;
		padding: 0;
		margin: 0;
		list-style-type: none;
		min-width: 0; /* must set to keep flexbox from growing too wide */
		flex: 1 1 auto;
	}

	.draggable,
	ul.polly-proposals-wrapper,
	.polly-proposals-wrapper > div:not(.draggable) {
		display: flex;
		flex-direction: column;
		gap: var(--polly-proposal-gap);
	}

	/* Each proposal. This is used for all views. (editable, sortable, read-only) */
	.polly-proposal {
		position: relative;
		height: var(--polly-proposal-height);
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.polly-proposal-input::placeholder {
		color: lightgrey;
	}

	.sortable-proposal,
	.readonly-proposal {
		height: var(--polly-proposal-height);
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.75rem;
		border-radius: 0.6rem;
		border: 1px solid var(--proposal-border);
		background-color: var(--proposal-bg);
		min-width: 0;
	}

	.readonly-proposal {
		background-color: var(--bs-secondary-bg);
		border-color: var(--bs-border-color, #e5e7eb);
	}

	.winner-proposal {
		background-color: var(--proposal-bg);
		border-color: var(--proposal-border);
		font-weight: bold;
	}

	.sortable-proposal-title {
		flex: 1 1 auto;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* drag handle: a real affordance, bigger touch target */
	.proposal-bars {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 100%;
		margin-right: -0.25rem;
		color: #b6bec9;
		cursor: grab;
		transition: color .15s ease;

		&:hover { color: var(--primary); }
		&:active { cursor: grabbing; }
		&:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 0.4rem; }
	}

	/* ---------- status ---------- */
	.polly-status {
		margin: var(--polly-section-gap) var(--polly-card-padding) 0;
		padding-top: 0.75rem;
		border-top: 1px solid var(--bs-border-color, #e5e7eb);
		text-align: center;
		font-size: var(--font-size-small);
		color: var(--secondary);
	}

	/* ---------- footer ---------- */
	.polly-card-footer {
		border-top: none;
		background-color: white;
		padding: var(--polly-section-gap) var(--polly-card-padding) var(--polly-card-padding);
	}

	.polly-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.polly-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding-inline: 1rem;
		border-radius: 0.6rem;
		font-weight: 500;

		i { font-size: 0.95em; line-height: 1; }
		&:disabled { opacity: 0.55; }
		&:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; box-shadow: none; }
	}

	/* "Beenden" ends the polly: quiet at rest, destructive-tinted on hover */
	.polly-btn-quiet {
		border: 1px solid transparent;
		color: var(--secondary);
		background-color: transparent;

		&:hover:not(:disabled) {
			color: var(--destructive, #b42318);
			border-color: currentColor;
			background-color: transparent;
		}
	}

	@media (max-width: 480px) {
		--polly-card-padding: 1.25rem;

		.polly-actions {
			flex-direction: column-reverse;
			align-items: stretch;
		}
		.polly-btn { width: 100%; }
	}
}

.polly-hint {
	max-width: 1024px;
	margin: 1rem auto 0;
	display: flex;
	align-items: flex-start;
	gap: 0.5rem;
	font-size: var(--font-size-small);
	color: var(--secondary);

	i { margin-top: 0.2em; }
}

/* ========= For VUE.draggable@next ======== */
.draggable {
	/* the placeholder gap: a slim dashed insertion slot instead of the old arrow diamonds */
	.polly-ghost {
		opacity: 1;

		.sortable-proposal {
			background-color: transparent;
			border: 1px dashed var(--primary);
			box-shadow: none;
		}
		.sortable-proposal-title,
		.proposal-bars { opacity: 0.25; }
	}

	.polly-chosen .sortable-proposal,
	.polly-drag .sortable-proposal {
		box-shadow: 0 8px 20px rgba(16, 24, 40, 0.18);
	}

	.polly-chosen,
	.polly-drag { z-index: 999; }
}

/* ===== small utility classes ======= */
.cursor-move {
	cursor: move;
}

</style>
