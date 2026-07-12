<template>
	<div>
		<div class="liquido-hero">
			<h2 id="cast-vote-page" class="page-title">{{ $t('castVoteTitle') }}</h2>

			<div v-if="loading" class="draggable">
				<div class="spinner-border" role="status">
					<span class="visually-hidden">{{ $t('Loading') }}</span>
				</div>
				&nbsp;{{ $t('Loading') }}
			</div>

			<div v-if="!loading" class="poll-card-wrapper">
				<poll-card :poll="poll" :show-arrow-right="false" class="poll-card"></poll-card>
			</div>
		</div>

		<h2 class="page-title mt-5">{{ $t('yourBallot') }}</h2>
		<p class="page-subtitle text-center" v-html="$t('castVoteSubtitle')"></p>

		<div v-if="!loading" class="cast-vote-wrapper">
			<!-- Drop target: the user drops & sorts the proposals he wants to vote for -->
			<div class="the-ballot">
				<div class="empty-slots-behind">
					<div class="empty-slot d-flex flex-row align-items-center user-select-none" aria-hidden="true">
						<div class="rank-circle">
							1
						</div>
						<div class="d-flex">
							<p class="mb-0">{{ $t('favoriteDropTargetInfo') }}</p>
						</div>
					</div>
					<div class="empty-slot d-flex flex-row align-items-center user-select-none" aria-hidden="true">
						<div class="rank-circle">
							2
						</div>
						<div class="d-flex">
							<p class="mb-0">{{ $t('secondDropTargetInfo', { n: 2 })	 }}</p>
						</div>
					</div>
				</div>
				
				<draggable 
					id="ballotDraggable" 
					v-model="proposalsInBallot" 
					class="draggable ballot-draggable" 
					group="proposals" 
					item-key="id"
					animation="500"
					swapThreshold="0.60"
					:disabled="loading || castVoteLoading" 
					:can-scroll-x="false">
					<template #item="{ element: proposal, index }">
						<div class="card shadow-sm proposal-panel d-flex flex-row align-items-center user-select-none">
							<div class="rank-circle">
								{{ index + 1 }}
							</div>
							<div class="d-flex flex-column text-truncate">
								<h4 class="proposal-title">
									{{ proposal.title }}
								</h4>
								<div class="proposal-subtitle">
									<div :class="{ supported: proposal.likedByCurrentUser }" class="d-inline">
										<i :class="{
												far: !proposal.likedByCurrentUser,
												fas: proposal.likedByCurrentUser,
											}"
											class="fa-thumbs-up"
										></i>
										&nbsp;<span class="numLikes">{{ proposal.numSupporters }}</span>
									</div>
									<i class="far fa-user ms-2"></i>&nbsp;{{ proposal.createdBy.name }}
								</div>
							</div>

							<div class="drag-handle">
								<i class="fas fa-bars"></i>
							</div>
						</div>
					</template>
					
					<!-- template #footer>
						
						<div v-if="proposalsInBallot.length === 0 && availableProposals.length > 0" class="empty-slot d-flex flex-row align-items-center user-select-none" aria-hidden="true">
							<div class="rank-circle">
								1
							</div>
							<div class="d-flex">
								<p class="mb-0">{{ $t('favoriteDropTargetInfo') }}</p>
							</div>
						</div>
						
						<div v-if="proposalsInBallot.length < 2" class="empty-slot d-flex flex-row align-items-center user-select-none" aria-hidden="true">
							<div class="rank-circle">
							  {{ proposalsInBallot == 0 ? 2 : proposalsInBallot.length + 1 }}
							</div>
							<div class="d-flex">
								<p class="mb-0">{{ $t('secondDropTargetInfo', { n: proposalsInBallot == 0 ? 2 : proposalsInBallot.length + 1 }) }}</p>
							</div>
						</div>
					</template -->


				</draggable>
				<!-- div v-if="proposalsInBallot.length < poll?.proposals.length" class="text-center ballot-footer-info">
					{{ $t('canAddProposalsIntoBallot') }}
				</div -->
			</div>

			
			
			<!-- Upward arrow hint: drag proposals up from the available list into your ballot -->
			<div class="drag-up-arrow" aria-hidden="true">
				<svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M50 8 L92 46 L68 46 L68 92 L32 92 L32 46 L8 46 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
				</svg>
			</div>

			
			
			
			<!-- Available proposals  -->

			 <h2 class="page-title">{{ $t('availableProposals') }}</h2>
			<div class="available-proposals">	
				<p v-if="availableProposals.length === 0" class="available-proposals-empty" v-html="$t('youVotedForAllProposals')"></p>
				<draggable id="availableDraggable" v-model="availableProposals" class="draggable" group="proposals" item-key="id"
					:disabled="loading || castVoteLoading" :swap-threshold="0.5" :delay="40" :animation="500"
					:can-scroll-x="false">
					<template #item="{ element: proposal }">
						<div class="card shadow-sm proposal-panel d-flex flex-row align-items-center user-select-none">
							<div class="proposal-icon">
								<i class="fas fa-fw" :class="'fa-' + proposal.icon" />
							</div>
							<div class="d-flex flex-column text-truncate">
								<h4 class="proposal-title">
									{{ proposal.title }}
								</h4>
								<div class="proposal-subtitle">
									<div :class="{ supported: proposal.likedByCurrentUser }" class="d-inline">
										<i :class="{
												far: !proposal.likedByCurrentUser,
												fas: proposal.likedByCurrentUser,
											}"
											class="fa-thumbs-up"
										></i>
										&nbsp;<span class="numLikes">{{ proposal.numSupporters }}</span>
									</div>
									<i class="far fa-user ms-2"></i>&nbsp;{{ proposal.createdBy.name }}
								</div>
							</div>

							<div class="drag-handle">
								<i class="fas fa-bars"></i>
							</div>
						</div>
					</template>
				</draggable>
			</div>
		</div>

		<div class="page-subtitle mt-5">
			<p v-html="$t('castVoteInfo')"></p>
		</div>


		<div v-if="isUpdatableBallot" id="isUpdateableBallotInfo" class="alert liquido-info">
			<i class="fas fa-info-circle float-end" />
			<p v-html="$t('updateBallotInfo')"></p>
		</div>

		<div v-if="hasBallot" class="alert liquido-info">
			<p>
				{{ $t("checksumOfYourBallot") }}
			</p>
			<div class="text-center mb-2">
				<button id="verifyBallotButton" class="btn btn-primary btn-sm" @click="verifyBallot">
					{{ existingBallot.checksum }}
					<i v-if="ballotIsVerified" class="fas fa-check-circle text-success"></i>
				</button>
			</div>
			<p v-if="ballotIsVerified" id="ballotIsVerifiedInfo">
				{{ $t('ballotIsVerified') }}
			</p>
		</div>

		<liquido-footer>
			<template #primary>
				<button v-if="poll && poll.status === 'VOTING'" id="castVoteButton" type="button" class="btn btn-primary btn-lg w-100" :disabled="loading || castVoteLoading || !canCastVote" @click="clickCastVote()">
					<div v-if="castVoteLoading" class="spinner-border" role="status">
						<span class="visually-hidden">{{ $t("Loading") }}</span>	
					</div>
					<i v-if="!castVoteLoading" class="fas fa-vote-yea"></i>
					{{ isUpdatableBallot ? $t("updateBallotButton") : $t("castVoteButton") }}
				</button>
			</template>
		</liquido-footer>
	</div>
</template>

<script>
//import config from "config"
import api from "@/services/liquido-graphql-client.js"
import draggable from 'vuedraggable'
import liquidoFooter from "@/components/liquido-footer.vue";
import pollCard from "@/components/poll-card.vue"
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
			},
			de: {
				castVoteTitle: "Stimme abgeben",
				castVoteSubtitle: "Ziehe die Vorschläge, welche du unterstützen möchtest, in die Slots.<br/>Sortiere sie auf deinem Stimmzettel.",
				favoriteDropTargetInfo: "Slot 1 - dein Lieblingsvorschlag",
				secondDropTargetInfo: "Slot 2 - leer",
				
				youVotedForAllProposals: "Sehr gut, du hast alle Vorschläge sortiert. Du kannst deinen Stimmzettel jetzt abgeben.",
				availableProposals: "Verfügbare Vorschläge",
				castVoteInfo:
					"<p>In <span class='liquido'></span> stimmst du nicht nur für <em>einen</em> Vorschlag, sondern erstellst eine Rangfolge derjenigen Vorschläge, " +
					"die du unterstützen möchtest. Ziehe diese auf den Stimmzettel oben und ordne sie nach deiner Präferenz - dein Favorit ganz oben. " +
					"Vorschläge die du nicht unterstützen möchtest lässt du ganz einfach unten.</p>" +
					"<p><i class='fa fa-shield-halved'></i> Deine stimme ist sicher und anonym. Niemand kann zurückverfolgen wie du abgestimmt hast.</p>",
				
				voteCountedNTimes: "Deine Stimme als Proxy wurde {voteCount} mal gezählt.",
				yourBallot: "Dein Stimmzettel",
				updateBallotButton: "Eigene Stimme aktualisieren",
				castVoteButton: "Diese Stimme abgeben",
				voteCastedSuccessfully: "Deine Stimme wurde erfolgreich gezählt.",
				voteUpdatedSuccessfully: "Deine Stimme wurde erfolgreich aktualisiert.",
				voteCastError: "Es gab leider einen technischen Fehler beim Abgeben deiner Stimme. Bitte versuche es später noch einmal.",
				updateBallotInfo: "Du hast in dieser Abstimmung bereits eine Stimme abgegeben. In <span class='liquido'></span> kannst du deinen Stimmzettel " +
					"auch jetzt noch ändern, so lange die Abstimmung noch läuft.",
				checksumOfYourBallot: "Mit dieser Checksumme kannst du prüfen ob dein Stimmzettel korrekt gezählt wurde:",
				verifyBallotButton: "Prüfen",
				ballotIsVerified: "Deine Stimme wurde erfolgreich gezählt.",
				backToPolls: "Zurück zu euren Abstimmungen"
			},
		},
	},
	components: { draggable, liquidoFooter, pollCard },
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
			isFirstVote: true,		// used for showing the correct confirmation message
			ballotIsVerified: false,
			draggingHintObserver: null,
		}
	},
	computed: {
		canCastVote() {
			return this.poll && this.poll.status === "VOTING" && this.proposalsInBallot.length > 0
		},
		hasBallot() {
			return this.existingBallot
		},
		isUpdatableBallot() {
			return this.poll && this.poll.status === "VOTING" && this.existingBallot
		},
	},
	created() {
		this.loading = true
		this.$store.setHeaderTitle(this.$t("castVoteTitle"))
		this.$store.setHeaderBackTarget({name: "showPoll", params: {pollId: this.pollId} })

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
			if (this.existingBallot) this.isFirstVote = false
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
			.then(setProposalsInBallot)		// pre-fill drop target from ballot, or start with an empty drop target
			.then(() => {
				// Poll loading is complete, now set up the dragging hint observer
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
	},

	beforeUnmount() {
		if (this.draggingHintObserver) {
			this.draggingHintObserver.disconnect()
		}
	},
	methods: {
		/** Collapse the descriptions of all proposals in the ballot (not used) */
		toggleBallotCollapse() {
			this.$refs["proposalsInBallot"].forEach(pollPanel => {
				//console.log("toogle collapse on", pollPanel)
				pollPanel.toggleCollapse()
			})
			this.collapsed = !this.collapsed
		},

		clickCastVote() {
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
					
					// Build success message
					let successMsg = this.isFirstVote ? this.$t("voteCastedSuccessfully") : this.$t("voteUpdatedSuccessfully")
					if (this.voteCount > 1) {
						successMsg += "\n" + this.$t('voteCountedNTimes', { voteCount: this.voteCount })
					}
					this.$root.showSuccess(successMsg, "")
				})
			}).catch((err) => {
				console.error("Cannot cast vote", err)
				this.castVoteLoading = false
				this.$root.showError(this.$t('voteCastError'), "")
			})
		},

		verifyBallot() {
			if (!this.existingBallot || this.ballotIsVerified) return
			return api.verifyBallot(this.poll.id, this.existingBallot.checksum).then(ballot => {
				if (!ballot) {
					console.warn("Could not find a ballot for that checksum.")
				} else {
					console.debug("Ballot verified successfully.", ballot)
					this.ballotIsVerified = true
				}
			}).catch(err => {
				console.error("Cannot verify ballot with checksum!", err)
				//TODO: show error message
				this.ballotIsVerified = false
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
		},

	},
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
	margin-top: 0 !important;
	margin-right: calc(-1*var(--unit)) !important;
	margin-left: calc(-1*var(--unit)) !important;
	background-color: var(--header-bg);
}

.poll-card-wrapper {
	height: 10rem;  /* must not be smaller. For Polls with two lines of text in the title */
	margin-bottom: var(--two);
}

.cast-vote-wrapper {
	--polly-proposal-height: 4rem;
	--polly-proposal-margin-bottom: 0.5rem;

	/* The ballot where the user drops & sorts the proposals he wants to vote for */
	.the-ballot {
		position: relative;
		margin: 0;
		/* UX fix: the draggable has the padding-bottom, to react quicker, when dragging a proposal upwards */
		padding: var(--unit) var(--unit) 0 var(--unit);  
		background-color: var(--light-bg);
		border: 1px solid var(--light-border);
		border-radius: var(--liquido-border-radius);
	}

	.the-ballot {
		.empty-slots-behind {
			position: absolute;
			top: var(--unit);
			left: var(--unit);
			right: var(--unit);
			z-index: 1;
		}
		#ballot-draggable {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			z-index: 10;
			height: 500px;
		}
	}

	/* Empty ballot slot. Dimmed and dashed. */
	.empty-slot {
		height: var(--polly-proposal-height);
		margin-bottom: var(--polly-proposal-margin-bottom);
		border: 1px dashed var(--secondary);
		border-radius: var(--liquido-border-radius);
		/*background-color: var(--tertiary);*/
		color: rgba(0, 0, 0, 0.2);
		.rank-circle {
			border: 1px solid rgba(0, 0, 0, 0.);
			background-color: transparent;
			color: rgba(0, 0, 0, 0.2);
		}
	}

	/* The extra slot at the very bottom of the ballot fades out towards the bottom. */
	.empty-slot--faded {
		-webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
		mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
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

	.draggable {
		position: relative;
		flex-grow: 1;
		min-height: calc(2 * var(--polly-proposal-height) + 3rem);
		padding-bottom: var(--unit);
		z-index: 20;
		/* the drop target */
		.sortable-ghost {
			opacity: 0.2;
		}
		/* the chosen icon */
		.sortable-chosen {
			z-index: 999;
			-webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
			box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
			transform: rotate(1deg);
		}
		/* the icon currently beeing dragged */
		.sortable-drag {
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
		/*font-weight: bold;*/
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


	/** like bootstraps text-small our our info alert. But here must match the rest of the ballot */
	.ballot-footer-info {
		font-size: var(--font-size-small);
		text-align: center;
		color: rgba(0, 0, 0, 0.5)
	 }



	/* Upward arrow hint between the ballot drop target and the available proposals */
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

	/* List of proposals still available to be dragged into the drop target */
	.available-proposals {
		position: relative;
		margin: 0;
		padding: var(--unit);
		border: 1px dashed var(--secondary);
		border-radius: var(--liquido-border-radius);
	}
	

	/* keep this similar to poll-panel.vue */
	.proposal-panel {   
		height: var(--polly-proposal-height);
		/*overflow: hidden;*/
		margin-bottom: var(--polly-proposal-margin-bottom);
		cursor: grab;
		
		.proposal-title {
			color: var(--primary);
			margin-bottom: 0.4rem;
			padding: 0;
			font-size: 0.8rem !important;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.proposal-subtitle {
			font-size: 10px;
			color: #bbb;
			margin-bottom: 5px;
		}
		.proposal-icon {
			--proposal_icon_size: 32px;
			color: white;
			background-color: var(--proposal-icon-bg);
			margin: 0 0.75rem;
			border-radius: 50%;
			border: none;
			text-align: center;
			line-height: var(--proposal_icon_size);
			min-width: var(--proposal_icon_size);
			max-width: var(--proposal_icon_size);
			width: var(--proposal_icon_size);
			min-height: var(--proposal_icon_size);
			max-height: var(--proposal_icon_size);
			height: var(--proposal_icon_size);
		}

		.proposal-description {
			font-size: 12px;
			overflow: hidden;
		}

		.supported {
			color: green;
		}

		.drag-handle {
			position: absolute;
			right: 10px;
			top: 50%;
			transform: translateY(-50%);
			opacity: 0.3;
		}
	}
}


#verifyBallotButton {
	font-family: monospace;
	margin: 0 auto;
}
</style>
