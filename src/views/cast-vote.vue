<template>
	<div>
		<h2 id="cast-vote-page" class="page-title">
			<i class="fas fa-person-booth" />
			&nbsp;{{ $t("castVoteTitle") }}
		</h2>

		<b-card class="ballot-card mb-5">
			<template #header>
				<h4 class="poll-title">
					<i class="fas fa-poll" />
					&nbsp;{{ poll ? poll.title : "" }}
				</h4>
			</template>
			<div v-if="loading" class="draggable">
				<b-spinner small />&nbsp;{{ $t('Loading') }}
			</div>
			<draggable v-else
				id="myDraggable"
				v-model="proposalsInBallot"
				class="draggable"
				item-key="id"
				:disabled="loading || castVoteLoading"
				:swap-threshold="0.5"
				:delay="40"
				:animation="500"
				:can-scroll-x="false"
			>
				
				<law-panel
					v-for="proposal in proposalsInBallot"
					:law="proposal"
					:key="proposal.id"
					:read-only="true"
					:collapse="true"
				/>
			
			</draggable>
		</b-card>

		<div v-if="canCastVote" class="text-center mb-5">
			<b-button id="castVoteButton" variant="primary" size="lg" :disabled="loading || castVoteLoading" @click="clickCastVote()">
				<i v-if="!castVoteLoading" class="fas fa-vote-yea"></i>
				<b-spinner v-if="castVoteLoading" small />
				{{ isUpdatableBallot ? $t("updateBallotButton") : $t("castVoteButton") }}
			</b-button>
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
				<b-button id="verifyBallotButton" variant="primary" size="sm" @click="verifyBallot">
					{{ existingBallot.checksum }}
					<i v-if="ballotIsVerified" class="fas fa-check-circle text-success"></i>
				</b-button>
			</div>
			<p v-if="ballotIsVerified" id="ballotIsVerifiedInfo">
				{{ $t('ballotIsVerified') }}
			</p>
		</div>

		<popup-modal 
			id="castVoteSuccessModal"
			ref="castVoteSuccessModal"
			type="success"
		>
			<template #default>
				<div class="text-center">
					<p>{{ isFirstVote ? $t("voteCastedSuccessfully") : $t("voteUpdatedSuccessfully") }}</p>
					<p v-if="voteCount > 1">
						{{ $t('voteCountedNTimes', {voteCount: voteCount}) }}
					</p>
				</div>
			</template>
		</popup-modal>

		<popup-modal 
			id="errorModal"
			ref="errorModal"
			type="error"
			:message="$t('voteCastError')"
		></popup-modal>
		
		<div class="alert liquido-info">
			<i class="fas fa-info-circle float-end" />
			<p v-html="$t('castVoteInfo')"></p>
		</div>

		<b-button @click="goBack()">
			<i class="fas fa-angle-left" />
		</b-button>

	</div>
</template>

<script>
import config from "config"
import lawPanel from "@/components/law-panel.vue"
import popupModal from "@/components/popup-modal.vue"
import { store } from "@/services/store.js"
import api from "@/services/liquido-graphql-client.js"
import { VueDraggableNext } from 'vue-draggable-next'
import _ from "lodash"  // for cloneDeep
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
				castVoteInfo: 
					"<p>In <span class='liquido'></span> stimmst du nicht nur für <em>einen</em> der Vorschläg, sondern du sortierst " +
					"<em>alle</em> Vorschläge nach deiner Präferenz.</p>" +
					"<p>Schiebe deinen Favoriten ganz nach oben. Ordne alle anderen Vorschläge gemäß deiner persönlichen Reihenfolge darunter an.</p>",
				voteCountedNTimes: "Deine Stimme als Proxy wurde {voteCount} mal gezählt.",
				yourBallot: "Dein Stimmzettel:",
				updateBallotButton: "Eigene Stimme aktualisieren",
				castVoteButton: "Diese Stimme abgeben",
				voteCastedSuccessfully: "Deine Stimme wurde erfolgreich gezählt.",
				voteUpdatedSuccessfully: "Deine Stimme wurde erfolgreich aktualisiert.",
				voteCastError: "Es gab leider einen technischen Fehler beim Abgeben deiner Stimme. Bitte versuche es später noch einmal.",
				updateBallotInfo: "Du hast in dieser Abstimmung bereits eine Stimme abgegeben. In <span class='liquido'></span> kannst du deinen Stimmzettel " + 
					"auch jetzt noch ändern, so lange die Wahlphase dieser Abstimmung noch läuft.",
				checksumOfYourBallot: "Mit dieser Checksumme kannst du prüfen ob dein Stimmzettel korrekt gezählt wurde:",
				verifyBallotButton: "Prüfen",
				ballotIsVerified: "Deine Stimme wurde erfolgreich gezählt.",
				backToPolls: "Zurück zu euren Abstimmungen"
			},
		},
	},
	components: { lawPanel, draggable: VueDraggableNext, popupModal },
	props: {
		// the cast-vote page only receives the pollId and reloads the poll from the backend
		pollId: { type: String, required: true },
	},
	data() {
		return {
			store,
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

		this.store.setHeaderTitle($t("castVoteTitle"))
		
		/** 
		 * Force refresh of the poll we want to cast a vote on. Load the from the backend.
		 */
		let loadPoll = () => api.getPollById(this.pollId, true).then(poll => {
			this.poll = poll
			if (!this.poll) throw new Error("Cannot find poll(id=" + this.pollId + ")") //TODO: show user error message to user. offer back button
			return poll
		}).catch(err => console.warn("Cannot get poll.id="+this.pollId, err))
		
		/**
		 * Get the user's voter token.
		 * TODO: We could make this more secury by letting the user provide his own voterTokenSecret.
		 *       But then a human would need to remember a secret. And humans are not good in remembering things.
		 */
		let getVoterToken = () => api.getVoterToken(config.voterTokenSecret)
			.catch(err => console.error("Cannot get voterToken of user", err))

		/**
		 * Check if current user already coted in this poll. Then he would have a ballot.
		 * Keep in mind, that the ballot of a user can only be fetched, if the user's secret voterToken is known.
		 */
		let getExistingBallot = (voterToken) => api.getBallot(this.pollId, voterToken).then(ballot => {
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
				this.proposalsInBallot = _.cloneDeep(this.poll.proposals)
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
		function easeOutCubic (t, b, c, d) {
			return c * ((t = t / d - 1) * t * t + 1) + b;
		}

		/**
		 * If this is the first time that the user votes at all,
		 * then show a little UX animation as a hint 
		 * that proposals can be dragged.
		 * 
		 * Move the top proposal in a cubic circular motion to the bottom.
		 */
		let showDraggingHint = async function() {
			let element = document.querySelector("#myDraggable > div")
			if (element == null) {
				log.warn("No proposals in poll!")  // This should never happen.
				return
			}
			element.classList.add("sortable-chosen")
			const delayMs = 5
			const dragHeight = element.clientHeight * 2
			const dragWidth  = dragHeight / 10
			const step = 1 / dragHeight
			const startX = element.style.left
			const startY = element.style.top
			for (let time = 0; time < 1; time += step) {
				let i  = easeOutCubic(time, 0, 1, 1)
				let dx = Math.sin(i * Math.PI) * dragWidth
				let dy = i * dragHeight
				element.style.top = dy + "px"
				element.style.left = dx + "px"
				await delay(delayMs)
			}
			for (let time = 1; time >= 0; time -= step) {
				let i  = easeOutCubic(time, 0, 1, 1)
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
			.then(getVoterToken)
			.then(getExistingBallot)  		// with voter Token, if any
			.then(setProposalsInBallot)		// set proposals (and sort them in the voteOrder of the users ballot if he already voted)
			.then(() => {
				this.loading = false
				setTimeout(function() {
					showDraggingHint()
				}, 500)
				
			})
			.catch(err => {
				console.error("Cannot get data to cast vote!", err)
				this.loading = false
			})
				
	},
	mounted() {
		
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

			log.debug("CAST VOTE: poll.id="+this.poll.id, "voteOrderIds", voteOrderIds)
			return api.getVoterToken(config.voterTokenSecret).then((voterToken) => {
				console.debug("Received voter token. Now casting vote ...")
				api.castVote(this.poll.id, voteOrderIds, voterToken).then(castVoteResponse => {
					console.info("Vote casted successfully.", castVoteResponse)
					this.existingBallot = castVoteResponse.ballot
					this.voteCount = castVoteResponse.voteCount
					this.castVoteLoading = false
					this.$refs["castVoteSuccessModal"].show()
				})
			}).catch((err) => {
				console.error("Cannot cast vote", err)
				this.castVoteLoading = false
				this.$refs["errorModal"].show()
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

		goBack() {
			this.$router.go(-1)
		}

	},
}
</script>

<style lang="scss">
.card-header {   
	background-color: white;
	border-bottom-color: lightgray;
	margin: 0;
}

.poll-title {
	margin: 0;
	font-weight: bold;
}


/*
.ballot-card {
	.card-header {
		padding: 0.5rem;
		background-color: $header-bg;

		.poll-title {
			margin: 0;
			font-size: 14px;
			font-weight: bold;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
}
*/

.draggable {
	//background-color: $input-bg;
	//padding: 1rem;

	.law-panel:not(:last-child) {
		margin-bottom: 1rem;
		cursor: grab;
	}

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

#verifyBallotButton {
	font-family: monospace;
	margin: 0 auto;
}


</style>
