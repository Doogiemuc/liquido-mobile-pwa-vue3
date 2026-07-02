<template>
	<div>

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

		<div v-if="!loading" class="cast-vote-wrapper">
			<!-- Drop target: the user drops & sorts the proposals he wants to vote for -->
			<div class="vote-drop-target">
				<h2 class="drop-target-title">{{ $t('yourBallot') }}</h2>
				<p v-if="proposalsInBallot.length === 0" class="drop-placeholder" v-html="$t('dropTargetInfo')"></p>
				<div class="cast-vote-container">
					<div class="index-number-container">
						<div v-for="(prop, index) in proposalsInBallot" :key="prop.id" class="proposal-index-number">
							{{ index + 1 }}.
						</div>
					</div>

					<draggable id="ballotDraggable" v-model="proposalsInBallot" class="draggable" group="proposals" item-key="id"
						:disabled="loading || castVoteLoading" :swap-threshold="0.5" :delay="40" :animation="500"
						:can-scroll-x="false">
						<template #item="{ element: law }">
							<div class="card shadow-sm law-panel d-flex flex-row align-items-center user-select-none">
								<div class="law-icon">
									<i class="fas fa-fw" :class="'fa-' + law.icon" />
								</div>
								<div class="d-flex flex-column text-truncate">
									<h4 class="law-title">
										{{ law.title }}
									</h4>
									<div class="law-subtitle">
										<div :class="{ supported: law.likedByCurrentUser }" class="d-inline">
											<i :class="{
													far: !law.likedByCurrentUser,
													fas: law.likedByCurrentUser,
												}"
												class="fa-thumbs-up"
											></i>
											&nbsp;<span class="numLikes">{{ law.numSupporters }}</span>
										</div>
										<i class="far fa-user ms-2"></i>&nbsp;{{ law.createdBy.name }}
									</div>
								</div>

								<div class="drag-handle">
									<i class="fas fa-bars"></i>
								</div>
							</div>
						</template>
					</draggable>
				</div>
				<div v-if="proposalsInBallot.length > 0 && proposalsInBallot.length < poll?.proposals.length" class="text-center mb-2">...</div>
			</div>

			<!-- Upward arrow hint: drag proposals up from the available list into your ballot -->
			<div class="drag-up-arrow" aria-hidden="true">
				<svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M50 8 L92 46 L68 46 L68 92 L32 92 L32 46 L8 46 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
				</svg>
			</div>

			<!-- Available proposals in the poll. Drag them up into the drop target above. -->
			<div class="available-proposals">
				<h2 class="drop-target-title">{{ $t('availableProposals') }}</h2>
				<p v-if="availableProposals.length === 0" class="drop-placeholder" v-html="$t('youVotedForAllProposals')"></p>
				<draggable id="availableDraggable" v-model="availableProposals" class="draggable" group="proposals" item-key="id"
					:disabled="loading || castVoteLoading" :swap-threshold="0.5" :delay="40" :animation="500"
					:can-scroll-x="false">
					<template #item="{ element: law }">
						<div class="card shadow-sm law-panel d-flex flex-row align-items-center user-select-none">
							<div class="law-icon">
								<i class="fas fa-fw" :class="'fa-' + law.icon" />
							</div>
							<div class="d-flex flex-column text-truncate">
								<h4 class="law-title">
									{{ law.title }}
								</h4>
								<div class="law-subtitle">
									<div :class="{ supported: law.likedByCurrentUser }" class="d-inline">
										<i :class="{
												far: !law.likedByCurrentUser,
												fas: law.likedByCurrentUser,
											}"
											class="fa-thumbs-up"
										></i>
										&nbsp;<span class="numLikes">{{ law.numSupporters }}</span>
									</div>
									<i class="far fa-user ms-2"></i>&nbsp;{{ law.createdBy.name }}
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
			<template #info>
				<div class="cast-vote-footer-info">
					<p v-html="$t('castVoteFooterInfo')"></p>
				</div>
			</template>
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
				dropTargetInfo: "Schiebe die Vorschläge, die du unterstützen möchtest, hierher. Du musst nicht alle auswählen. Sortiere die ausgewählten Vorschläge anschließend per Drag & Drop – dein Favorit steht oben.",
				youVotedForAllProposals: "Sehr gut, du hast alle Vorschläge sortiert.",
				availableProposals: "Verfügbare Vorschläge",
				castVoteInfo:
					"<p>In <span class='liquido'></span> stimmst du nicht nur für <em>einen</em> Vorschlag, sondern erstellst eine Rangfolge derjenigen Vorschläge, " +
					"die du unterstützen möchtest. Ziehe diese auf den Stimmzettel oben und ordne sie nach deiner Präferenz - dein Favorit ganz oben. " +
					"Vorschläge die du nicht unterstützen möchtest lässt du ganz einfach unten.</p>" +
					"<p>Deine stimme ist sicher und anonym. Niemand kann zurückverfolgen wie du abgestimmt hast.</p>",
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
				this.loading = false
			})
			.catch(err => {
				console.error("Cannot get data to cast vote!", err)
				this.loading = false
			})

	},

	mounted() {
		this.$root.scrollToTop()
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


	},
}
</script>

<style>

.page-title {
	margin-top: 0 !important;
	margin-right: calc(-1*var(--unit)) !important;
	margin-bottom: 0 !important;
	margin-left: calc(-1*var(--unit)) !important;
	background-color: var(--header-bg);
	padding-top: var(--unit) !important;
	padding-bottom: var(--unit) !important;
}

 .drop-target-title {
	margin-top: var(--unit);
	margin-bottom: var(--unit);
	text-align: center;
 }

.poll-card-wrapper {
	height: 8rem;
	background-color: var(--header-bg);
	margin-left: calc(-1*var(--unit));
	margin-right: calc(-1*var(--unit));
	padding: 0 var(--unit) var(--unit) var(--unit);

	
}

.cast-vote-wrapper {
	--polly-proposal-height: 4rem;
	--polly-proposal-margin-bottom: 0.5rem;
	margin-top: var(--two);

	/* Drop target where the user drops & sorts the proposals he wants to vote for */
	.vote-drop-target {
		position: relative;
		margin: 0;
		padding: 0 var(--unit) 0 0.5rem;
		background-color: var(--light-bg);
		border: 1px dashed var(--secondary);
		border-radius: var(--liquido-border-radius);
	}

	.drop-placeholder {
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

	.cast-vote-container {
		display: flex;
		flex-direction: row;
		width: 100%;
	}

	.index-number-container {
		width: var(--unit);
	}

	.proposal-index-number {
		color: var(--text-color);
		height: var(--polly-proposal-height);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--polly-proposal-margin-bottom);
		padding: 0;
		/*
		border-left: 1px dotted grey;
		border-top: 1px dotted grey;
		border-bottom: 1px dotted grey;
		border-radius: 0.25rem;
		/*border-bottom-left-radius: var(--liquido-border-radius);*/
	}
	
	.draggable {
		flex-grow: 1;
		min-height: calc(2 * var(--polly-proposal-height) + 3rem);
		.sortable-ghost {
			opacity: 0.2;
		}
		.sortable-chosen {
			z-index: 999;
			-webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
			box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
			/*transform: translate(3px, 3px);*/
		}
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
		padding: 0 var(--unit) 0 var(--unit);
		/*
		background-color: var(--tertiary);
		border: 1px dashed var(--secondary);
		border-radius: var(--liquido-border-radius);*/
		
	}

	.available-proposals-title {
		font-size: 1rem;
		color: var(--secondary);
		margin-bottom: 0.5rem;
	}

	

	/* keep this similar to poll-panel.vue */
	.law-panel {   
		height: var(--polly-proposal-height);
		overflow: hidden;
		margin-bottom: var(--polly-proposal-margin-bottom);
		cursor: grab;
		
		.law-title {
			color: var(--primary);
			margin-bottom: 0.4rem;
			padding: 0;
			font-size: 0.8rem !important;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.law-subtitle {
			font-size: 10px;
			color: #bbb;
			margin-bottom: 5px;
		}
		.law-icon {
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

		.law-description {
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
