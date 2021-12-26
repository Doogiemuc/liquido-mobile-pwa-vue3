<template>
	<div>
		<h2 id="cast-vote-page" class="page-title">
			<i class="fas fa-person-booth" />
			&nbsp;{{ $t("castVoteTitle") }}
		</h2>

		<b-card no-body class="ballot-card mb-5">
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
				:disabled="loading || castVoteLoading"
				:swap-threshold="0.5"
				:delay="40"
				:animation="500"
				:can-scroll-x="false"
			>
				<law-panel
					v-for="(prop) in proposalsInBallot"
					ref="proposalInBallot"
					:key="prop.id"
					:law="prop"
					:read-only="true"
					:collapse="true"
				/>
			</draggable>
			<div class="collapse-icon-wrapper">
				<a
					v-if="poll && poll.proposals && poll.proposals.length > 0"
					class="collapse-icon"
					:class="{'collapsed' : collapsed}"
					href="#"
					@click="toggleBallotCollapse()"
				>
					<i class="fa" />
				</a>
			</div>
		</b-card>

		<div v-if="canCastVote" class="text-center mb-5">
			<b-button id="castVoteButton" variant="primary" size="lg" :disabled="loading || castVoteLoading" @click="clickCastVote()">
				<i v-if="!castVoteLoading" class="fas fa-vote-yea"></i>
				<b-spinner v-if="castVoteLoading" small />
				{{ isUpdatableBallot ? $t("updateBallotButton") : $t("castVoteButton") }}
			</b-button>
		</div>

		<div v-if="isUpdatableBallot" id="isUpdateableBallotInfo" class="alert liquido-info">
			<i class="fas fa-info-circle float-right" />
			<p v-html="$t('updateBallotInfo')"></p>
		</div>

		<div v-if="hasBallot" class="alert liquido-info">
			<p>
				{{ $t("checksumOfYourBallot") }}
			</p>
			<div class="text-center mb-2">
				<b-button id="verifyBallotButton" variant="primary" size="sm" @click="verifyBallot">
					{{ existingBallot.checksum }}
					<i v-if="ballotIsVerified" class="fas fa-check-circle"></i>
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
			<i class="fas fa-info-circle float-right" />
			<p v-html="$t('castVoteInfo')"></p>
		</div>
	</div>
</template>

<script>
import config from "config"
import lawPanel from "@/components/law-panel"
import popupModal from "@/components/popup-modal"

//import Sortable from 'sortablejs'
import draggable from "vuedraggable"
import _ from "lodash"
const log = require("loglevel")

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
				backToPolls: "Zurück zur den Abstimmungen",
				updateBallotInfo: "Du hast in dieser Abstimmung bereits eine Stimme abgegeben. In <span class='liquido'></span> kannst du deinen Stimmzettel " + 
					"auch jetzt noch ändern, so lange die Wahlphase dieser Abstimmung noch läuft.",
				checksumOfYourBallot: "Mit dieser Checksumme kannst du prüfen ob dein Stimmzettel korrekt gezählt wurde:",
				verifyBallotButton: "Prüfen",
				ballotIsVerified: "Deine Stimme wurde erfolgreich gezählt."
			},
		},
	},
	components: { lawPanel, draggable, popupModal },
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
		
		/** 
		 * Force refresh of the poll we want to cast a vote on. Load the from the backend.
		 */
		let loadPoll = () => this.$api.getPollById(this.pollId, true).then(poll => {
			this.poll = poll
			if (!this.poll) throw new Error("Cannot find poll(id=" + this.pollId + ")") //TODO: show user error message to user. offer back button
			return poll
		}).catch(err => console.warn("Cannot get poll.id="+this.pollId, err))
		
		/**
		 * Get the user's voter token.
		 * TODO: We could make this more secury by letting the user provide his own voterTokenSecret.
		 *       But then a human would need to remember a secret. And humans are not good in remembering things.
		 */
		let getVoterToken = () => this.$api.getVoterToken(config.voterTokenSecret)
			.catch(err => console.warn("Cannot get voterToken of user", err))

		/**
		 * Check if current user already coted in this poll. Then he would have a ballot.
		 * Keep in mind, that the ballot of a user can only be fetched, if the user's secret voterToken is known.
		 */
		let getExistingBallot = (voterToken) => this.$api.getBallot(this.pollId, voterToken).then(ballot => {
			this.existingBallot = ballot  // may be undefined!
			if (this.existingBallot) this.isFirstVote = false
			return ballot
		}).catch(err => console.warn("Cannot get ballot of user", err))

		/**
		 * TODO: when the user has already voted, then sort the proposals in this poll according to the user's vote.
		 *
		let setVoteOrder = () => {
			let proposalsById = {}
			this.poll.proposals.forEach(prop => proposalsById[prop.id] = prop)
			if (ballot) {
				this.existingBallot = ballot
				this.proposalInBallot = ballot.voteOrderIds.map(id => proposalsById[id])
			} else {
				this.proposalsInBallot = _.cloneDeep(this.poll.proposals)
			}
			this.loading = false
		}
		*/

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
		 * then show a little UX animation as a hint, that proposals can be dragged.
		 */
		let showDraggingHint = async function() {
			let element = document.querySelector("#myDraggable > div")
			element.classList.add("sortable-chosen")
			const delayMs = 10
			const dragHeight = element.height() * 3
			const dragWidth  = 15;
			const steps = dragHeight / 2
			for (let time = 0; time < 1; time = time + 1/steps) {
				let i  = easeOutCubic(time, 0, 1, 1)
				let dx = Math.sin(i * Math.PI) * 20
				let dy = i * dragHeight
				element.offset({ top: element.offsetTop + dy, left: element.offsetLeft + dx })
				await delay(delayMs)
			}
			for (let time = 1; time >= 0; time = time - 1/steps) {
				let i  = easeOutCubic(time, 0, 1, 1)
				let dx = Math.sin(i * Math.PI) * dragWidth
				let dy = i * dragHeight
				element.offset({ top: element.offsetTop + dy, left: element.offsetLeft + dx })
				await delay(delayMs)
			}
			//element.offset(elemPos)		
			element.classList.remove("sortable-chosen")
		}

		loadPoll()
			.then(getVoterToken)
			.then(voterToken => getExistingBallot(voterToken))
			.then(() => {
				this.proposalsInBallot = _.cloneDeep(this.poll.proposals)
				//TODO: if there is an existing ballot, then sort proposals in that order
				this.loading = false
			})
			.then(() => {
				setTimeout(function() {
					showDraggingHint()
				}, 1000)
				
			})
			.catch(err => {
				console.error("Cannot get data to cast vote!", err)
				this.loading = false
			})
		

		
	},
	mounted() {
		
	},
	methods: {
		/** Collapse the descriptions of all proposals in the ballot */
		toggleBallotCollapse() {
			this.$refs["proposalInBallot"].forEach(pollPanel => {
				//console.log("toogle collapse on", pollPanel)
				pollPanel.toggleCollapse()
			})
			this.collapsed = !this.collapsed
		},

		async clickCastVote() {
			this.castVoteLoading = true
			let voteOrderIds = this.proposalsInBallot.map(proposal => +proposal.id)

			//TODO: start a timer for timeout

			log.debug("CAST VOTE: poll.id="+this.poll.id, "voteOrderIds", voteOrderIds)
			this.$api.getVoterToken(config.voterTokenSecret).then((voterToken) => {
				console.debug("Received voter token. Now casting vote ...")
				this.$api.castVote(this.poll.id, voteOrderIds, voterToken).then(castVoteResponse => {
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

		async verifyBallot() {
			if (!this.existingBallot || this.ballotIsVerified) return
			this.$api.verifyBallot(this.poll.id, this.existingBallot.checksum).then(ballot => {
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

<style lang="scss">
#app .page-title {
	margin-top: 1rem;
	margin-bottom: 1rem;
}

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

.draggable {
	background-color: $input-bg;
	padding: 1rem;

	.law-panel {
		margin-bottom: 1rem;  // need some space between proposals to make it easier to drag & sort them
		cursor: grab;
	}

/*
	.law-panel.simulate-drag {
		z-index: 999;  // above second proposal
		transition: all 1s;
		animation: slide-down 0.5s ease 1s 2 alternate;
	}

	@keyframes slide-down {
		to {
			transform: translate(0px, 4em);
		}
	}
*/

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

.collapse-icon {
	position: absolute;
	bottom: 0;
	right: 3px;
	opacity: 0.5;
	}

.collapse-icon .fa:before {
	content: "\f139";
}

.collapse-icon.collapsed .fa:before {
	content: "\f13a";
}

#verifyBallotButton {
	font-family: monospace;
	margin: 0 auto;
}




</style>
