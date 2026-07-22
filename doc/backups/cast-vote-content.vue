<template>
	<div class="cast-vote-content">
		<h2 id="cast-vote-v2-page" class="liquido-hero page-title">{{ t('castVoteTitle') }}</h2>

		<div v-if="loading" class="text-center py-4">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">{{ t('Loading') }}</span>
			</div>
			&nbsp;{{ t('Loading') }}
		</div>

		<!-- Kept mounted (v-show, not v-if): makeDroppable registers the ballot/pool zones inside its
		     onMounted hook, but this component mounts while the poll is still loading. With v-if the zone
		     elements wouldn't exist yet and would never register as drop targets. -->
		<div v-show="!loading">
			<!-- Standard poll-card at the top -->
			<div v-if="poll" class="poll-card-wrapper">
				<poll-card :poll="poll" :show-arrow-right="false" class="poll-card" />
			</div>

			<h2 class="page-title">{{ t('yourBallot') }}</h2>
			<p class="page-subtitle text-center">{{ t('castVoteSubtitle') }}</p>

			<!-- BALLOT drop zone: ranked slots the voter fills & sorts -->
			<div ref="ballotZone" class="ballot-zone" :class="{ 'is-drag-over': !!ballotDragOver }">
				<div class="receipt-edge" aria-hidden="true"></div>

				<cast-vote-proposal-card
					v-for="(proposal, i) in proposalsInBallot"
					:key="proposal.id"
					:proposal="proposal"
					:index="i"
					:items="proposalsInBallot"
					variant="ballot"
					:rank="i + 1"
					:disabled="castVoteLoading"
					:remove-label="t('removeFromBallot')"
					@remove="removeFromBallot"
				/>

				<!-- Numbered empty slots for the remaining ranks -->
				<div
					v-for="(rank, idx) in emptySlotRanks"
					:key="'empty-' + rank"
					class="empty-slot d-flex flex-row align-items-center user-select-none"
					:class="{ 'empty-slot--active': !!ballotDragOver && idx === 0 }"
					aria-hidden="true"
				>
					<div class="rank-circle">{{ rank }}</div>
					<div class="empty-slot-label">
						<template v-if="!!ballotDragOver && idx === 0">{{ t('dropHere') }}</template>
						<template v-else-if="rank === 1">{{ t('favoriteDropTargetInfo') }}</template>
						<template v-else>{{ t('secondDropTargetInfo', { n: rank }) }}</template>
					</div>
				</div>
			</div>

			<div v-if="proposalsInBallot.length < totalSlots" class="text-center ballot-footer-info">
				{{ t('canAddProposalsIntoBallot') }}
			</div>

			<!-- Upward arrow hint: drag proposals up into the ballot -->
			<div class="drag-up-arrow" aria-hidden="true">
				<svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M50 8 L92 46 L68 46 L68 92 L32 92 L32 46 L8 46 Z"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linejoin="round"
						stroke-linecap="round"
						vector-effect="non-scaling-stroke"
					/>
				</svg>
			</div>

			<h2 class="page-title">{{ t('availableProposals') }}</h2>

			<!-- POOL drop zone: proposals still available to be dragged up -->
			<div ref="poolZone" class="pool-zone" :class="{ 'is-drag-over': !!poolDragOver }">
				<p
					v-if="availableProposals.length === 0"
					class="drop-placeholder"
					v-html="t('youVotedForAllProposals')"
				></p>
				<cast-vote-proposal-card
					v-for="(proposal, i) in availableProposals"
					:key="proposal.id"
					:proposal="proposal"
					:index="i"
					:items="availableProposals"
					variant="pool"
					:disabled="castVoteLoading"
				/>
			</div>

			<div class="page-subtitle mt-5">
				<p v-html="t('castVoteInfo')"></p>
			</div>

			<div v-if="isUpdatableBallot" id="isUpdateableBallotInfo" class="alert liquido-info">
				<i class="fas fa-info-circle float-end" />
				<p v-html="t('updateBallotInfo')"></p>
			</div>

			<div v-if="hasBallot" class="alert liquido-info">
				<p>{{ t("checksumOfYourBallot") }}</p>
				<div class="text-center mb-2">
					<button id="verifyBallotButton" class="btn btn-primary btn-sm" @click="verifyBallot">
						{{ existingBallot.checksum }}
						<i v-if="ballotIsVerified" class="fas fa-check-circle text-success"></i>
					</button>
				</div>
				<p v-if="ballotIsVerified" id="ballotIsVerifiedInfo">{{ t('ballotIsVerified') }}</p>
			</div>
		</div>

		<liquido-footer>
			<template #info>
				<div v-if="!loading" class="cast-vote-footer-info">
					{{ t('slotsFilledInfo', { filled: proposalsInBallot.length, total: totalSlots }) }}
				</div>
			</template>
			<template #primary>
				<button
					v-if="poll && poll.status === 'VOTING'"
					id="castVoteButton"
					type="button"
					class="btn btn-primary btn-lg w-100"
					:disabled="loading || castVoteLoading || !canCastVote"
					@click="clickCastVote()"
				>
					<div v-if="castVoteLoading" class="spinner-border spinner-border-sm" role="status">
						<span class="visually-hidden">{{ t("Loading") }}</span>
					</div>
					<i v-if="!castVoteLoading" class="fas fa-vote-yea"></i>
					{{ isUpdatableBallot ? t("updateBallotButton") : t("castVoteButton") }}
				</button>
			</template>
		</liquido-footer>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from "vue"
import { makeDroppable } from "@vue-dnd-kit/core"
import api from "@/services/liquido-graphql-client.js"
import { store } from "@/services/store.js"
import log from "loglevel"
import pollCard from "@/components/poll-card.vue"
import liquidoFooter from "@/components/liquido-footer.vue"
import CastVoteProposalCard from "@/components/cast-vote-proposal-card.vue"

const props = defineProps({
	// the cast-vote page only receives the pollId and reloads the poll from the backend
	pollId: { type: String, required: true },
})

// proxy === the component's public instance ("this"). Used only to reach the global $root
// helpers (showSuccess / showError / scrollToTop).
const { proxy } = getCurrentInstance()

// Local, static German texts + a tiny t() stand-in instead of vue-i18n (matches the app
// default locale "de", and the loc() pattern already used in Polly-vote.vue).
const messages = {
	castVoteTitle: "Stimme abgeben",
	Loading: "Lade ...",
	yourBallot: "Dein Stimmzettel",
	castVoteSubtitle: "Ziehe Vorschläge in die Slots und sortiere sie.",
	favoriteDropTargetInfo: "Slot 1 – dein Lieblingsvorschlag",
	secondDropTargetInfo: "Slot {n} – leer",
	dropHere: "Hier loslassen",
	canAddProposalsIntoBallot:
		"Du kannst weitere Vorschläge unterstützen und hier auf deinem Stimmzettel einsortieren.",
	availableProposals: "Verfügbare Vorschläge",
	youVotedForAllProposals:
		"Sehr gut, du hast alle Vorschläge sortiert. Du kannst deinen Stimmzettel jetzt abgeben.",
	castVoteInfo:
		"<p>In <span class='liquido'></span> stimmst du nicht nur für <em>einen</em> Vorschlag, sondern erstellst eine Rangfolge derjenigen Vorschläge, " +
		"die du unterstützen möchtest. Ziehe diese auf den Stimmzettel oben und ordne sie nach deiner Präferenz - dein Favorit ganz oben. " +
		"Vorschläge die du nicht unterstützen möchtest lässt du ganz einfach unten.</p>" +
		"<p><i class='fa fa-shield-halved'></i> Deine stimme ist sicher und anonym. Niemand kann zurückverfolgen wie du abgestimmt hast.</p>",
	updateBallotInfo:
		"Du hast in dieser Abstimmung bereits eine Stimme abgegeben. In <span class='liquido'></span> kannst du deinen Stimmzettel " +
		"auch jetzt noch ändern, so lange die Abstimmung noch läuft.",
	checksumOfYourBallot:
		"Mit dieser Checksumme kannst du prüfen ob dein Stimmzettel korrekt gezählt wurde:",
	ballotIsVerified: "Deine Stimme wurde erfolgreich gezählt.",
	slotsFilledInfo: "{filled} von {total} Slots belegt",
	removeFromBallot: "Aus Stimmzettel entfernen",
	updateBallotButton: "Eigene Stimme aktualisieren",
	castVoteButton: "Diese Stimme abgeben",
	voteCountedNTimes: "Deine Stimme als Proxy wurde {voteCount} mal gezählt.",
	voteCastedSuccessfully: "Deine Stimme wurde erfolgreich gezählt.",
	voteUpdatedSuccessfully: "Deine Stimme wurde erfolgreich aktualisiert.",
	voteCastError:
		"Es gab leider einen technischen Fehler beim Abgeben deiner Stimme. Bitte versuche es später noch einmal.",
}

/** Minimal static stand-in for $t: looks up a German string and interpolates {params}. */
function t(key, params = {}) {
	const msg = messages[key]
	if (msg == null) return key
	return msg.replace(/\{(\w+)\}/g, (m, p) =>
		Object.prototype.hasOwnProperty.call(params, p) ? params[p] : m
	)
}

/* ----------------------- STATE ----------------------- */
const loading = ref(true)
const poll = ref(undefined)
const proposalsInBallot = ref([]) // proposal objects, in rank order (index 0 = rank 1)
const availableProposals = ref([]) // the pool
const existingBallot = ref(undefined)
const voteCount = ref(0)
const castVoteLoading = ref(false)
const isFirstVote = ref(true)
const ballotIsVerified = ref(false)

/* ----------------------- COMPUTED ----------------------- */
const canCastVote = computed(
	() => poll.value && poll.value.status === "VOTING" && proposalsInBallot.value.length > 0
)
const hasBallot = computed(() => !!existingBallot.value)
const isUpdatableBallot = computed(
	() => poll.value && poll.value.status === "VOTING" && !!existingBallot.value
)
const totalSlots = computed(() => poll.value?.proposals?.length || 0)
const emptySlotRanks = computed(() => {
	const ranks = []
	for (let i = proposalsInBallot.value.length; i < totalSlots.value; i++) ranks.push(i + 1)
	return ranks
})

/* ----------------------- DRAG & DROP ----------------------- */
// Two droppable lists (ballot + pool). Both accept the same "proposals" group, so items
// can move freely between them. isDragOver drives the drop-target highlight.
const ballotZone = ref(null)
const poolZone = ref(null)

const { isDragOver: ballotDragOver } = makeDroppable(
	ballotZone,
	{ groups: ["proposals"], events: { onDrop: applySort } },
	() => proposalsInBallot.value
)
const { isDragOver: poolDragOver } = makeDroppable(
	poolZone,
	{ groups: ["proposals"], events: { onDrop: applySort } },
	() => availableProposals.value
)

/**
 * Cross-list sort / transfer via the library's high-level helper (mirrors its
 * "Sorting Lists" example). suggestSort returns new source/target arrays; we update the
 * source list, and when the item crossed to the other list we update the target too.
 * Lists are identified by array identity (the same ref passed to the payload factories).
 */
function applySort(e) {
	const result = e.helpers.suggestSort("vertical")
	if (!result) return

	const srcItems = e.draggedItems[0]?.items
	const tgtItems = e.hoveredDraggable?.items ?? e.dropZone?.items
	if (!srcItems) return

	if (srcItems === proposalsInBallot.value) {
		proposalsInBallot.value = result.sourceItems
	} else if (srcItems === availableProposals.value) {
		availableProposals.value = result.sourceItems
	}

	if (!result.sameList && tgtItems) {
		if (tgtItems === proposalsInBallot.value) {
			proposalsInBallot.value = result.targetItems
		} else if (tgtItems === availableProposals.value) {
			availableProposals.value = result.targetItems
		}
	}
}

/** The X button on a ballot row: take the proposal out of the ballot, back into the pool. */
function removeFromBallot(proposal) {
	proposalsInBallot.value = proposalsInBallot.value.filter((p) => p.id !== proposal.id)
	if (!availableProposals.value.some((p) => p.id === proposal.id)) {
		availableProposals.value = [...availableProposals.value, proposal]
	}
}

/* ----------------------- DATA LOADING ----------------------- */
function loadData() {
	loading.value = true
	store.setHeaderTitle(t("castVoteTitle"))
	store.setHeaderBackTarget({ name: "showPoll", params: { pollId: props.pollId } })

	// Force refresh of the poll we want to cast a vote on.
	const loadPoll = () =>
		api
			.getPollById(props.pollId, true)
			.then((p) => {
				poll.value = p
				return p
			})
			.catch((err) => console.warn("Cannot get poll.id=" + props.pollId, err))

	// Check if the current user already voted (then they have a ballot).
	const getExistingBallot = () =>
		api
			.getMyBallot(props.pollId)
			.then((ballot) => {
				existingBallot.value = ballot // may be undefined
				if (existingBallot.value) isFirstVote.value = false
				return ballot
			})
			.catch((err) => console.warn("Cannot get ballot of user", err))

	// Pre-fill the ballot from a previous vote, or start empty with all proposals in the pool.
	const setProposalsInBallot = (ballot) => {
		if (ballot) {
			const proposalsById = {}
			poll.value.proposals.forEach((prop) => (proposalsById[prop.id] = prop))
			existingBallot.value = ballot
			const votedIds = new Set(ballot.voteOrder.map((elem) => elem.id))
			proposalsInBallot.value = ballot.voteOrder.map((elem) => proposalsById[elem.id])
			availableProposals.value = poll.value.proposals.filter((prop) => !votedIds.has(prop.id))
		} else {
			proposalsInBallot.value = []
			availableProposals.value = [...poll.value.proposals]
		}
		loading.value = false
	}

	loadPoll()
		.then(getExistingBallot)
		.then(setProposalsInBallot)
		.catch((err) => {
			console.error("Cannot get data to cast vote!", err)
			loading.value = false
		})
}

/* ----------------------- ACTIONS ----------------------- */
function clickCastVote() {
	castVoteLoading.value = true
	const voteOrderIds = proposalsInBallot.value.map((proposal) => proposal.id)
	log.debug("CAST VOTE: poll.id=" + poll.value.id, "voteOrderIds", voteOrderIds)
	return api
		.getVoterToken(props.pollId)
		.then((voterToken) =>
			api.castVote(poll.value.id, voteOrderIds, voterToken).then((castVoteResponse) => {
				existingBallot.value = castVoteResponse.ballot
				voteCount.value = castVoteResponse.voteCount
				castVoteLoading.value = false
				let successMsg = isFirstVote.value
					? t("voteCastedSuccessfully")
					: t("voteUpdatedSuccessfully")
				if (voteCount.value > 1) {
					successMsg += "\n" + t("voteCountedNTimes", { voteCount: voteCount.value })
				}
				proxy.$root.showSuccess(successMsg, "")
			})
		)
		.catch((err) => {
			console.error("Cannot cast vote", err)
			castVoteLoading.value = false
			proxy.$root.showError(t("voteCastError"), "")
		})
}

function verifyBallot() {
	if (!existingBallot.value || ballotIsVerified.value) return
	return api
		.verifyBallot(poll.value.id, existingBallot.value.checksum)
		.then((ballot) => {
			if (!ballot) {
				console.warn("Could not find a ballot for that checksum.")
			} else {
				ballotIsVerified.value = true
			}
		})
		.catch((err) => {
			console.error("Cannot verify ballot with checksum!", err)
			ballotIsVerified.value = false
		})
}

/* ----------------------- LIFECYCLE ----------------------- */
loadData()

onMounted(() => {
	proxy.$root.scrollToTop()
})
</script>

<style scoped>
.liquido-hero {
	margin-top: 0 !important;
	margin-right: calc(-1 * var(--unit)) !important;
	margin-bottom: 0 !important;
	margin-left: calc(-1 * var(--unit)) !important;
	background-color: var(--header-bg);
	padding-top: var(--unit) !important;
	padding-bottom: var(--unit) !important;
}

/* Hero below liquido-header, same background */
.poll-card-wrapper {
	height: 10rem; /* room for two-line poll titles */
	background-color: var(--header-bg);
	margin-left: calc(-1 * var(--unit));
	margin-right: calc(-1 * var(--unit));
	padding: 0 var(--unit) var(--unit) var(--unit);
}

/* Ballot "receipt" drop zone where the voter drops & sorts their preferred proposals. */
.ballot-zone {
	position: relative;
	margin: 0;
	padding: var(--unit);
	background-color: var(--light-bg);
	border: 2px dashed var(--secondary);
	border-radius: var(--liquido-border-radius);
	transition: border-color 0.15s ease, background-color 0.15s ease;
}
.ballot-zone.is-drag-over {
	border-color: var(--primary);
	background-color: #e2edfb;
}

/* Perforated receipt edge (decorative) */
.receipt-edge {
	height: 8px;
	margin: -0.5rem -0.5rem 0.75rem -0.5rem;
	background-image: radial-gradient(circle, transparent 0, transparent 4px, var(--light-bg) 4px);
	background-size: 12px 12px;
	background-position: -6px -6px;
	opacity: 0.6;
}

/* Empty ballot slot: dashed, dimmed, numbered. */
.empty-slot {
	height: 4rem;
	margin-bottom: 0.5rem;
	border: 1px dashed var(--secondary);
	border-radius: var(--liquido-border-radius);
	color: rgba(0, 0, 0, 0.3);
	transition: all 0.15s ease;
}
.empty-slot:last-child {
	margin-bottom: 0;
}
.empty-slot .rank-circle {
	border: 1px solid rgba(0, 0, 0, 0.3);
	background-color: transparent;
	color: rgba(0, 0, 0, 0.3);
}
.empty-slot--active {
	border-color: var(--primary);
	background-color: rgba(30, 58, 95, 0.06);
	color: var(--primary);
}
.empty-slot--active .rank-circle {
	border-color: var(--primary);
	background-color: var(--primary);
	color: white;
}
.empty-slot-label {
	font-size: var(--font-size-small);
}

/* Rank circle used by the numbered empty slots (filled rows style it in the card component). */
.rank-circle {
	--rank-circle-size: 32px;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 0.75rem;
	width: var(--rank-circle-size);
	height: var(--rank-circle-size);
	border-radius: 50%;
	background-color: var(--primary);
	color: white;
	font-size: 1rem;
	font-weight: bold;
	line-height: 1;
}

.ballot-footer-info {
	font-size: var(--font-size-small);
	text-align: center;
	color: rgba(0, 0, 0, 0.5);
	margin-top: 0.5rem;
}

/* Upward arrow hint between the ballot and the pool */
.drag-up-arrow {
	width: 7rem;
	height: var(--two);
	margin: 10px auto;
	color: var(--secondary);
}
.drag-up-arrow svg {
	display: block;
	width: 100%;
	height: 100%;
}

/* Pool of proposals still available to be dragged up into the ballot. */
.pool-zone {
	position: relative;
	margin: 0;
	padding: var(--unit);
	min-height: 4rem;
	border: 1px dashed var(--secondary);
	border-radius: var(--liquido-border-radius);
	transition: border-color 0.15s ease, background-color 0.15s ease;
}
.pool-zone.is-drag-over {
	border-color: var(--primary);
	background-color: rgba(30, 58, 95, 0.04);
}
.drop-placeholder {
	text-align: center;
	color: var(--secondary);
	padding: 1rem;
	margin: 0;
}

.cast-vote-footer-info {
	font-size: var(--font-size-small);
	color: var(--secondary);
}
</style>
