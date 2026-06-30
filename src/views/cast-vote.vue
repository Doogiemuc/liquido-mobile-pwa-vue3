<template>
	<div>

		<h2 id="cast-vote-page">{{ poll ? poll.title : "" }}</h2>

		<div v-if="loading" class="draggable">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">{{ $t('Loading') }}</span>
			</div>
			&nbsp;{{ $t('Loading') }}
		</div>

		<div id="castVoteInfo" class="alert liquido-info cast-vote-info-top">
			<p>{{ $t('dragInfo') }}</p>
		</div>

		<div v-if="!loading" class="cast-vote-container">
			<div class="index-number-container">
				<div v-for="(prop, index) in poll.proposals" :key="prop.id" class="proposal-index-number">
					{{ index + 1 }}.
				</div>
			</div>
			
			<draggable id="myDraggable" v-model="proposalsInBallot" class="draggable" item-key="id"
				:disabled="loading || castVoteLoading" :swap-threshold="0.5" :delay="40" :animation="500"
				:can-scroll-x="false">

				<div v-for="law in proposalsInBallot" :key="law.id" class="card shadow-sm law-panel d-flex flex-row align-items-center user-select-none">
					<div class="law-icon">
						<i class="fas fa-fw" :class="'fa-' + law.icon" />
					</div>
					<div class="d-flex flex-column text-truncate">
						<h4 class="law-title">
							{{ law.title }}
						</h4>
						<div class="law-subtitle">
							<div :class="{ supported: law.supportedByCurrentUser }" class="d-inline">
								<i :class="{
										far: !law.supportedByCurrentUser,
										fas: law.supportedByCurrentUser,
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
			</draggable>

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
				<button v-if="canCastVote" id="castVoteButton" type="button" class="btn btn-primary btn-lg w-100" :disabled="loading || castVoteLoading" @click="clickCastVote()">
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
import { VueDraggableNext } from 'vue-draggable-next'
import liquidoFooter from "@/components/liquido-footer.vue";
import log from "loglevel"

export default {
	i18n: {
		messages: {
			en: {
				castVoteTitle: "Cast your vote",
				castVoteInfo: "Please sort the proposals into your personally preferred order. With your favorite proposal at the top.",
				castVote: "Cast vote",
				yourBallot: "Your ballot",
			},
			de: {
				castVoteTitle: "Abstimmen",
				dragInfo: "Sortiere die Vorschläge per Drag & Drop. Schiebe deinen Favoriten ganz nach oben.",
				castVoteFooterInfo:
					"In <span class='liquido'></span> stimmst du nicht nur für <em>einen</em> Vorschlag, sondern sortiere " +
					"<em>alle</em> Vorschläge nach deiner Präferenz.",
				voteCountedNTimes: "Deine Stimme als Proxy wurde {voteCount} mal gezählt.",
				yourBallot: "Dein Stimmzettel:",
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
	components: { draggable: VueDraggableNext, liquidoFooter },
	props: {
		// the cast-vote page only receives the pollId and reloads the poll from the backend
		pollId: { type: String, required: true },
	},
	data() {
		return {
			loading: true,
			poll: undefined,
			proposalsInBallot: [],
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
			return this.poll && this.poll.status === "VOTING"
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
				let proposalsById = {}
				this.poll.proposals.forEach(prop => proposalsById[prop.id] = prop)
				this.existingBallot = ballot
				this.proposalsInBallot = ballot.voteOrder.map(elem => proposalsById[elem.id])
			} else {
				// Create a shallow copy of the proposals array for local sorting. This prevents mutating the original `this.poll.proposals` array.
				this.proposalsInBallot = [...this.poll.proposals]
			}
			this.loading = false
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
			let element = document.querySelector("#myDraggable > div")
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
				let dy = i * dragHeight
				element.style.top = dy + "px"
				element.style.left = dx + "px"
				await delay(delayMs)
			}
			for (let time = 1; time >= 0; time -= step) {
				let i = easeOutCubic(time, 0, 1, 1)
				let dx = Math.sin(i * Math.PI) * dragWidth
				let dy = i * dragHeight
				element.style.top = dy + "px"
				element.style.left = dx + "px"
				await delay(delayMs)
			}
			element.style.top = startY
			element.style.left = startX
			element.classList.remove("sortable-chosen")
		}


		loadPoll()
			.then(getExistingBallot)  		// get existing ballot of user (if he alreay casted a vote)
			.then(setProposalsInBallot)		// set proposals (and sort them in the voteOrder of the users ballot if he already voted)
			.then(() => {
				this.loading = false
				setTimeout(function () {
					showDraggingHint()
				}, 500)

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

.cast-vote-poll-title {
	padding: 0.5rem 1rem;
	text-align: center;
	color: black;
}

.cast-vote-info-top {
	margin: 1rem;
}

.cast-vote-container {	
	margin-top: 1rem;
	display: flex;
	flex-direction: row;
	width: 100%;
	padding-right: 0.5rem;

	--polly-proposal-height: 4rem;
	--polly-proposal-margin-bottom: 0.5rem;
	
	.index-number-container {
		width: 1rem;  /* same as cast-vote-info-top */
	}

	.proposal-index-number {
		color: var(--secondary);
		height: var(--polly-proposal-height);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--polly-proposal-margin-bottom);
		padding: 0 5px;
		/*
		border-left: 1px dotted grey;
		border-top: 1px dotted grey;
		border-bottom: 1px dotted grey;
		border-radius: 0.25rem;
		/*border-bottom-left-radius: var(--liquido-border-radius);*/
	}
	
	.draggable {
		flex-grow: 1;
		.sortable-ghost {
			opacity: 0.1;
		}
		.sortable-chosen {
			z-index: 999;
			-webkit-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
			box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
			/*transform: translate(3px, 3px);*/
		}
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
