<template>
	<div>
		<div class="liquido-hero">
			<h2 id="cast-vote-page" class="page-title">
				{{ $t('castVotePageTitle') }}
			</h2>

			<div v-if="loading" class="draggable">
				<div class="spinner-border" role="status">
					<span class="visually-hidden">{{ $t('Loading') }}</span>
				</div>
				&nbsp;{{ $t('Loading') }}
			</div>

			<div v-if="!loading" class="poll-card-wrapper">
				<poll-card :poll="poll" :show-arrow-right="false" class="poll-card shadow-sm"></poll-card>
			</div>
		</div>

		<div>
			<h2 class="page-title">{{ $t('yourBallot') }}</h2>
			<p class="page-subtitle text-center">{{ $t('castVoteSubtitle') }}</p>
		</div>
		

		<div v-if="!loading" class="cast-vote-wrapper">
			<liquido-ballot
				class="shadow"
				:proposals="proposalsInBallot"
				:proposal-count="poll?.proposals?.length"
				:show-empty-slots="!hasAlreadyVoted"
				:empty-slot-title="emptySlotTitle"
				:created-by-label="$t('createdBy')"
				:interactive="!hasAlreadyVoted"
				:disabled="loading || castVoteLoading || hasAlreadyVoted"
				:show-drag-handle="!hasAlreadyVoted"
				:is-dragging-over="isDraggingOverBallot"
				:move="onDragMove"
				draggable-id="ballotDraggable"
				@update:proposals="proposalsInBallot = $event"
				@drag-end="onDragEnd"
			/>

		
			
			<!-- Available proposals (only shown if user has not yet casted his vote) -->

			<div v-if="!hasAlreadyVoted" class="d-flex justify-content-around align-items-center">
				<!-- Upward arrow hint: drag proposals up from the available list into your ballot -->
				<div  class="drag-up-arrow" aria-hidden="true">
					<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
						<path d="M50 4 L92 23 L68 23 L68 46 L32 46 L32 23 L8 23 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
					</svg>
				</div>
				<h2 class="available-proposals-title">{{ $t('availableProposals') }}</h2>
				<!-- Upward arrow hint: drag proposals up from the available list into your ballot -->
				<div class="drag-up-arrow" aria-hidden="true">
					<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
						<path d="M50 4 L92 23 L68 23 L68 46 L32 46 L32 23 L8 23 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
					</svg>
				</div>
			</div>
			<div v-if="!hasAlreadyVoted || availableProposals.length > 0" class="available-proposals">	
				
				<p v-if="availableProposals.length === 0" class="available-proposals-empty" v-html="$t('youVotedForAllProposals')"></p>

				<draggable v-if="!hasAlreadyVoted" id="availableDraggable" v-model="availableProposals" class="draggable" group="proposals" item-key="id"
					:disabled="loading || castVoteLoading" :swap-threshold="0.5" :delay="40" :animation="500"
					:move="onDragMove" @end="onDragEnd"
					:can-scroll-x="false">
					<template #item="{ element: proposal }">
						<liquido-proposal :proposal="proposal" />
					</template>
				</draggable>
				
			</div>
		</div>

		<div class="page-subtitle mt-5">
			<p v-html="$t('castVoteInfo')"></p>
		</div>

		<liquido-footer>
			<template #primary>
				<button v-if="loading || castVoteLoading" id="loadingButton" type="button" class="btn btn-primary" disabled="true">
					<div class="spinner-border" role="status">
						<span class="visually-hidden">{{ $t("Loading") }}</span>	
					</div>
				</button>
				<button v-else-if="hasAlreadyVoted" id="alreadyVotedButton" type="button" class="btn btn-primary" disabled="true">
					{{ $t("alreadyVotedButton") }}
				</button>
				<button v-else id="castVoteButton" type="button" class="btn btn-primary" :disabled="!canCastVote" @click="clickCastVote()">
					<i class="fas fa-vote-yea"></i>
					{{ $t("castVoteButton") }}
				</button>
			</template>
		</liquido-footer>

		<popup-modal id="confirmVoteModal" ref="confirmVoteModal" primary-button-icon="fas fa-vote-yea">
			<template #modal-body>
				<p>{{ confirmationMessage }}</p>
				<liquido-ballot
					class="shadow"
					:proposals="proposalsInBallot"
					:created-by-label="$t('createdBy')"
					draggable-id="confirmationBallotDraggable"
				/>
			</template>
		</popup-modal>
	</div>
</template>

<script>
//import config from "config"
import api from "@/services/liquido-graphql-client.js"
import draggable from 'vuedraggable'
import liquidoFooter from "@/components/liquido-footer.vue";
import pollCard from "@/components/poll-card.vue"
import popupModal from "@/components/popup-modal.vue"
import liquidoProposal from "@/components/liquido-proposal.vue"
import liquidoBallot from "@/components/liquido-ballot.vue"
import log from "loglevel"

export default {
	i18n: {
		messages: {
			en: {
				castVoteTitle: "Cast your vote",
				castVoteInfo: "Please sort the proposals into your personally preferred order. With your favorite proposal at the top.",
				castVote: "Cast vote",
				yourBallot: "Your ballot",
				dropProposalsHere: "Drop the proposals that you want to vote for here. And sort them according to your preferences.",
				availableProposals: "Available proposals",
				confirmVoteTitle: "Confirm ballot",
				confirmVoteMessage: "Please review your ballot. Do you want to cast this vote now?",
				confirmVoteBallot: "Your ballot:",
				confirmVoteButton: "Cast final vote",
				cancel: "Edit ballot",
			},
			de: {
				// User can cast a vote
				castVotePageTitle: "Stimme abgeben",
				castVoteBallotTitle: "Dein Stimmzettel",
				castVoteSubtitle: "Ziehe die Vorschläge, welche du unterstützen möchtest, in die Slots und ordne sie nach deiner Präferenz.",
				castVoteButton: "Diese Stimme abgeben",

				// User has already voted
				voteCastedPageTitle: "Abstimmung",   // just generic
				voteCastedBallot: "Abgegebener Stimmzettel",
				voteCastedSubtitle: "Danke, du hast diese Stimme abgegeben.",
				alreadyVotedButton: "Stimme bereits abgegeben",

				favoriteDropTargetInfo: "Slot 1 - dein Lieblingsvorschlag",
				emptySlotNumber: "Slot {n} - leer",
				
				youVotedForAllProposals: "Danke dass du alle Vorschläge unterstützt. Sortiere sie oben nach deiner Präferenz und gib dann deine Stimme ab.",
				availableProposals: "Verfügbare Vorschläge",
				castVoteInfo:
					"<p>In <span class='liquido'></span> stimmst du nicht nur für <em>einen</em> Vorschlag, sondern erstellst eine Rangfolge derjenigen Vorschläge, " +
					"die du unterstützen möchtest. Ziehe diese auf den Stimmzettel oben und ordne sie nach deiner Präferenz - dein Favorit ganz oben. " +
					"Vorschläge die du nicht unterstützen möchtest lässt du ganz einfach unten.</p>" +
					"<p><i class='fa fa-shield-halved'></i> Deine stimme ist sicher und anonym. Niemand kann zurückverfolgen wie du abgestimmt hast.</p>",
				
				createdBy: "von",

				voteCountedNTimes: "Deine Stimme als Proxy wurde {voteCount} mal gezählt.",
				yourBallot: "Dein Stimmzettel",
				updateBallotButton: "Eigene Stimme aktualisieren",
				
				confirmVoteTitle: "Stimmzettel bestätigen",
				confirmVoteMessage: "Bitte prüfe deinen Stimmzettel. Möchtest du diese Stimme jetzt so abgeben? Du kannst deine Stimme später nicht mehr ändern!",
				confirmVoteBallot: "Dein Stimmzettel:",
				confirmVoteButton: "Stimme final abgeben",
				cancel: "Stimmzettel bearbeiten",
				voteCastedSuccessfully: "Deine Stimme wurde erfolgreich gezählt.",
				voteUpdatedSuccessfully: "Deine Stimme wurde erfolgreich aktualisiert.",
				voteCastError: "Es gab leider einen technischen Fehler beim Abgeben deiner Stimme. Bitte versuche es später noch einmal.",
				updateBallotInfo: "Du hast in dieser Abstimmung bereits eine Stimme abgegeben. In <span class='liquido'></span> kannst du deinen Stimmzettel " +
					"auch jetzt noch ändern, so lange die Abstimmung noch läuft.",
				checksumOfYourBallot: "Mit dieser Checksumme kannst du prüfen ob deine Stimme korrekt gezählt wurde:",
				verifyBallotButton: "Prüfen",
				ballotIsVerified: "Deine Stimme wurde erfolgreich gezählt.",
				backToPolls: "Zurück zu euren Abstimmungen"
			},
		}
	},
	components: { draggable, liquidoFooter, pollCard, popupModal, liquidoBallot, liquidoProposal },
	props: {
		// the cast-vote page only receives the pollId and reloads the poll from the backend
		pollId: { type: String, required: true },
	},
	data() {
		return {
			loading: true,
			poll: undefined,
			proposalsInBallot: [],
			availableProposals: [],
			collapsed: true,
			existingBallot: undefined,
			voteCount: 0,
			castVoteLoading: false,
			confirmationMessage: "",
			isDraggingOverBallot: false,   // highlight the ballot while a proposal is dragged over it
			draggingHintObserver: null,
		}
	},
	computed: {
		canCastVote() {
			return this.poll && this.poll.status === "VOTING" && !this.hasAlreadyVoted && this.proposalsInBallot.length > 0 
		},
		hasAlreadyVoted() {
			return this.existingBallot
		},
		isUpdatableBallot() {
			return false  //  voters are not allowed to update their ballot
			// this.poll && this.poll.status === "VOTING" && this.existingBallot
		},
	},
	created() {
		this.loading = true
		
		/** 
		 * Force refresh of the poll we want to cast a vote on. Load the from the backend.
		 */
		let loadPoll = () => api.getPollById(this.pollId, true).then(poll => {
			this.poll = poll
			return poll
		}).catch(err => console.warn("Cannot get poll.id=" + this.pollId, err))


		//TODO: Check if user has a valid RightToVote. If not, show an error.

		/**
		 * Check if current user already voted in this poll. Then he would have a ballot.
		 * Keep in mind, that the ballot of a user can only be fetched, if the user's secret voterToken is known.
		 */
		let getExistingBallot = () => api.getMyBallot(this.pollId).then(ballot => {
			this.existingBallot = ballot  // may be undefined!
			return ballot
		}).catch(err => console.warn("Cannot get ballot of user", err))

		/**
		 * When the user has already voted, then sort the proposals in this poll according to the user's vote.
		 */
		let setProposalsInBallot = (ballot) => {
			if (ballot) {
				// User already voted: pre-fill the drop target with his previous vote order.
				// The remaining proposals (not in his ballot) stay in the available list below.
				let proposalsById = {}
				this.poll.proposals.forEach(prop => proposalsById[prop.id] = prop)
				this.existingBallot = ballot
				let votedIds = new Set(ballot.voteOrder.map(elem => elem.id))
				this.proposalsInBallot = ballot.voteOrder.map(elem => proposalsById[elem.id])
				this.availableProposals = this.poll.proposals.filter(prop => !votedIds.has(prop.id))
			} else {
				// First vote: the drop target starts empty. All proposals are available to be dragged in.
				// Create a shallow copy so we don't mutate the original `this.poll.proposals` array.
				this.proposalsInBallot = []
				this.availableProposals = [...this.poll.proposals]
			}
			this.loading = false
		}

		loadPoll()
			.then(getExistingBallot)  		// get existing ballot of user (if he already casted a vote)
			.then(ballot => {
				if (ballot) {
					this.$root.gotoPoll(this.pollId)
					return
				}
				setProposalsInBallot(ballot)
			})		// this page is only for casting; when already voted we forward to poll detail
			.then(() => {
				if (this.hasAlreadyVoted) return
				// Poll loading is complete, now set up the dragging hint observer
				this.$store.setHeaderTitle(this.$t("castVotePageTitle"))
				this.$store.setHeaderBackTarget({name: "showPoll", params: {pollId: this.pollId} })
				this.$nextTick(() => {
					this.setupDraggingHintObserver()
				})
			})
			.catch(err => {
				console.error("Cannot get data to cast vote!", err)
				this.loading = false
			})

	},

	mounted() {
		this.$root.scrollToTop()
		// TEST HELPER: expose a hook so Cypress e2e tests can fill the ballot without
		// simulating native drag'n'drop (vuedraggable/SortableJS). Guarded by window.Cypress.
		if (window.Cypress) {
			window.liquidoCastVoteTest = {
				addFirstProposalToBallot: () => this.addFirstProposalToBallot(),
			}
		}
	},

	beforeUnmount() {
		if (this.draggingHintObserver) {
			this.draggingHintObserver.disconnect()
		}
		if (window.Cypress) delete window.liquidoCastVoteTest
	},
	methods: {
		/** 
		 * Show one empty slot for every proposal in the ballot 
		 * But the ballot is set to overflow: hidden and has a minHeight, 
		 * just right to show at least two slots and one half one. 
		 * To visualy give a hint that the user CAN drag more proposals up into the ballot,
		 * but does not have to.
		 */
		emptySlotTitle(index) {
			if (index == 0) {
				return this.$t('favoriteDropTargetInfo')
			} else {
				return this.$t('emptySlotNumber', { n: index+1 })
			}
		},

		/** Collapse the descriptions of all proposals in the ballot (not used) */
		toggleBallotCollapse() {
			this.$refs["proposalsInBallot"].forEach(pollPanel => {
				//console.log("toogle collapse on", pollPanel)
				pollPanel.toggleCollapse()
			})
			this.collapsed = !this.collapsed
		},

		/**
		 * vuedraggable/Sortable `move` callback: fires while a proposal is dragged over a list.
		 * Highlight the ballot while the drag hovers over it. Always returns true (never blocks a drop).
		 */
		onDragMove(evt) {
			this.isDraggingOverBallot = !!(evt.to && evt.to.id === "ballotDraggable")
			return true
		},

		/** Reset the ballot highlight when the drag ends (drop or cancel). */
		onDragEnd() {
			this.isDraggingOverBallot = false
		},

		/**
		 * TEST HELPER (Cypress e2e only): programmatically move the first available proposal
		 * into the ballot. This lets the happy-case e2e test fill the ballot without having to
		 * simulate native HTML5 drag'n'drop, which is unreliable with vuedraggable/SortableJS.
		 * Exposed on `window.liquidoCastVoteTest` from mounted() when `window.Cypress` is set.
		 * @returns {boolean} true if a proposal was moved, false if none were available.
		 */
		addFirstProposalToBallot() {
			if (this.availableProposals.length === 0) return false
			const proposal = this.availableProposals.shift()
			this.proposalsInBallot.push(proposal)
			return true
		},

		clickCastVote() {
			if (!this.canCastVote || this.castVoteLoading) return

			this.confirmationMessage = this.$t("confirmVoteMessage")
			this.$refs.confirmVoteModal.showInfo(
				this.confirmationMessage,
				this.$t("confirmVoteTitle"),
				this.$t("confirmVoteButton"),
				this.$t("cancel"),
				this.confirmCastVote,
				this.closeVoteConfirmation
			)
		},

		closeVoteConfirmation() {
			this.$refs.confirmVoteModal.hide()
		},

		confirmCastVote() {
			this.closeVoteConfirmation()
			this.castVoteLoading = true
			let voteOrderIds = this.proposalsInBallot.map(proposal => proposal.id)

			//TODO: start a timer for timeout

			log.debug("CAST VOTE: poll.id=" + this.poll.id, "voteOrderIds", voteOrderIds)
			return api.getVoterToken(this.pollId).then((voterToken) => {
				console.debug("Received voter token. Now casting vote ...")
				return api.castVote(this.poll.id, voteOrderIds, voterToken).then(castVoteResponse => {
					console.info("Vote casted successfully.", castVoteResponse)
					this.existingBallot = castVoteResponse.ballot
					this.voteCount = castVoteResponse.voteCount
					this.castVoteLoading = false
					this.$root.showSuccess(this.$t("voteCastedSuccessfully"), "")
					this.$root.gotoPoll(this.pollId)
				})
			}).catch((err) => {
				console.error("Cannot cast vote: " + err?.liquidoException?.liquidoErrorMessage, err)
				this.castVoteLoading = false
				this.$root.showError(this.$t('voteCastError'), "")
			})
		},

		setupDraggingHintObserver() {
			// Get the fixed footer height from CSS variable
			const footerHeight = getComputedStyle(document.documentElement).getPropertyValue('--liquido-footer-height').trim()
			
			// Create observer to watch for when the first available proposal becomes visible
			// Use rootMargin to exclude the area covered by the fixed footer plus 1 rem extra space
			this.draggingHintObserver = new IntersectionObserver((entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						showDraggingHint()
						this.draggingHintObserver.unobserve(entry.target)  // only run once
					}
				})
			}, { 
				threshold: 1.0,
				rootMargin: `0px 0px -${footerHeight} 0px`
			})

			const element = document.querySelector("#availableDraggable > div")
			if (element) {
				this.draggingHintObserver.observe(element)
			}
		}
	}
}



let delay = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Some math magic :-) taken from https://spicyyoghurt.com/tools/easing-functions
 * @param {Number} t current "time", e.g. 0 to 1
 * @param {Number} b start value
 * @param {Number} c value delta (b + c = end value)
 * @param {Number} d final value of time at the end, e.g. 1
 */
function easeOutCubic(t, b, c, d) {
	return c * ((t = t / d - 1) * t * t + 1) + b;
}

/**
 * If this is the first time that the user votes at all,
 * then show a little UX animation as a hint 
 * that proposals can be dragged.
 * 
 * Move the top proposal in a cubic circular motion to the bottom.
 */
let showDraggingHint = async function () {
	let element = document.querySelector("#availableDraggable > div")
	if (element == null) {
		log.warn("No proposals in poll!")  // This should never happen.
		return
	}
	element.classList.add("sortable-chosen")
	const delayMs = 5
	const dragHeight = element.clientHeight * 2
	const dragWidth = dragHeight / 10
	const step = 1 / dragHeight
	const startX = element.style.left
	const startY = element.style.top
	for (let time = 0; time < 1; time += step) {
		let i = easeOutCubic(time, 0, 1, 1)
		let dx = Math.sin(i * Math.PI) * dragWidth
		let dy = -i * dragHeight
		element.style.top = dy + "px"
		element.style.left = dx + "px"
		await delay(delayMs)
	}
	for (let time = 1; time >= 0; time -= step) {
		let i = easeOutCubic(time, 0, 1, 1)
		let dx = Math.sin(i * Math.PI) * dragWidth
		let dy = -i * dragHeight
		element.style.top = dy + "px"
		element.style.left = dx + "px"
		await delay(delayMs)
	}
	element.style.top = startY
	element.style.left = startX
	element.classList.remove("sortable-chosen")
}

</script>

<style>


 /* Hero below liquido-header with same white background as header */
.liquido-hero {
	padding: var(--unit);
	
	margin-right: calc(-1*var(--unit)) !important;
	margin-left: calc(-1*var(--unit)) !important;
	background-color: var(--header-bg);
}

/* Poll-card.vue needs a wrapper to define its height. */
.poll-card-wrapper {
	height: 10rem;
	padding-bottom: var(--unit);
}

/* The wrapper is hidden until poll is loaded. */
.cast-vote-wrapper {
	/* 
		These heights are extremly important.  
	  The minHeight of both draggable areas is calcolated based on these. 
	*/
	--polly-proposal-height: 4rem;
	--polly-proposal-margin-bottom: 0.5rem;

	/* The ballot where the user drops & sorts the proposals he wants to vote for */
	.the-ballot {
		position: relative;
		margin: 0;
		/* UX fix: the draggable has the padding-bottom, to react quicker, when dragging a proposal upwards */
		padding: var(--unit) var(--unit) 0 var(--unit);  
		background-color: var(--ballot-bg);
		border: 1px solid var(--ballot-border);
		border-radius: var(--liquido-border-radius);
		transition: background-color 0.15s ease, border-color 0.15s ease;

		/* Highlighted while the user drags a proposal over the ballot. */
		&.ballot-drag-over {
			filter: brightness(1.1);
		}

		/* Empty placeholder slots, behind the proposals in the ballot */
		.empty-slots-behind {
			position: absolute;
			top: var(--unit);
			bottom: 0;
			left: var(--unit);
			right: var(--unit);
			overflow: hidden;
			z-index: 1;
		}
		/* Must also position the draggable absolute with a higher z-index *before* the .empty-slots-behind */
		#ballot-draggable {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			z-index: 10;
			height: 500px;
		}
	}

	/* One empty ballot slot. Dimmed and dashed. */
	--empty-slot-color: rgba(255, 255, 255, 0.5);
	.empty-slot {
		height: var(--polly-proposal-height);
		margin-bottom: var(--polly-proposal-margin-bottom);
		border: 1px dashed var(--empty-slot-color);
		border-radius: var(--liquido-border-radius);
		background-color: rgba(0,0,0, 0.02);  /* just a tiny little bit darker */
		color: var(--empty-slot-color);
		.rank-circle {
			border: 1px solid rgba(0, 0, 0, 0.2);
			background-color: rgba(0, 0, 0, 0.1);
			color: var(--empty-slot-color);
		}
	}

	/* The extra slot at the very bottom of the ballot fades out towards the bottom. */
	.empty-slot-faded {
		-webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0) 100%);
		mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0) 100%);
	}


	/** Common class for both draggable lists */
	.draggable {
		position: relative;
		flex-grow: 1;
		min-height: calc(2 * (var(--polly-proposal-height) + var(--polly-proposal-margin-bottom)) + var(--unit));	
		padding-bottom: var(--unit);
		z-index: 20;

		/* the currently chosen proposal (right after long press) */
		.sortable-chosen {
			z-index: 999;
			-webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
			box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
			transform: rotate(1deg);
			cursor: grab;
		}

		/* the proposal currently beeing dragged */
		.sortable-drag {
			transform: rotate(1deg);
			cursor: grab;
		}

		/* the drop target */
		.sortable-ghost {
			opacity: 0.2;
			transform: rotate(1deg);
		}
	}


	/* Ranking number at the left of a proposal in the ballot (replaces the proposal icon). */
	.rank-circle {
		position: relative;
		--rank-circle-size: 32px;
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 0.75rem;
		width: var(--rank-circle-size);
		height: var(--rank-circle-size);
		border-radius: 50%;
		/*border: 1px solid rgba(0, 0, 0, 0.3);*/
		background-color: var(--primary);
		color: white;
		font-family: var(--sans-serif-font);
		font-size: 1rem;
		line-height: 1;
		z-index: 30;
	}

	/*  UX idea - connect the order-numbers in the ballot, to emphasize order. not yet perfect
	#ballotDraggable .proposal-panel:not(:last-child) .rank-circle:after {
		content: "";
		position: absolute;
		top: var(--rank-circle-size);
		background-color: var(--primary);
		width: 2px;
		height: var(--polly-proposal-height);
		z-index: 25;
	}	
	*/

	/* Info text that the user can still add further proposals into the ballot. */
	.ballot-footer-info {
		
		color: var(--secondary);
		text-align: center;
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		margin: 0;
		padding: 0;
		
	 }

	/* Upward arrow hint between the ballot drop target and the available proposals */
	.drag-up-arrow {
		width: var(--two);
		height: var(--unit);
		color: var(--secondary);
	}

	.drag-up-arrow svg {
		display: block;
		width: 100%;
		height: 100%;
	}


	/* List of proposals still available to be dragged into the drop target */
	.available-proposals {
		position: relative;
		margin: 0;
		padding: 0 var(--unit) var(--unit) var(--unit); /* no padding-top so that the "AVAILABLE PROPOSALS" text is exactly horizontally centered between the two groups */
		/*border: 1px solid var(--tertiary);
		border-radius: var(--liquido-border-radius); */
	}

	.available-proposals-title {
		font-size: 0.6rem !important;
		color: var(--secondary);
		text-transform: uppercase;
		letter-spacing: 0.4em;
		margin: var(--two) 0;
	}

	/** Shown when there are no more available proposals and the user dragged all proposals to the top */
	.available-proposals-empty {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		margin: 0;
		padding: 1.5rem;
		color: var(--secondary);
		pointer-events: none;
	}
	


	.proposal-panel-readonly {
		cursor: default;
	}
}


#verifyBallotButton {
	font-family: monospace;
	margin: 0 auto;
}
</style>
