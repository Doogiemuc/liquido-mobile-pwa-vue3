<template>
	<div>
		<h2 id="poll-show" class="page-title">
			{{ this.pageTitleLoc }}
		</h2>

		<div v-if="loadingPoll" class="my-3">
			<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>&nbsp;{{ $t('Loading') }}
		</div>
	
		<poll-card v-if="poll.id && !loadingPoll" :poll="poll" :show-arrow-right="false" :show-proposals="true" :proposals-expanded="true" class="shadow-sm mb-4" />

		<div v-if="showError"	class="alert alert-danger mb-3">
			<div v-html="$t('cannotFindPoll', {pollId: pollId})" />
			<button type="button" class="btn btn-primary float-end" @click="$root.gotoPolls">
				{{ $t("Back") }}
			</button>
		</div>

		<div v-if="!showError && !hasAlreadyVoted" class="alert liquido-info">
			<p v-if="poll.status === 'ELABORATION'" v-html="$t('pollInElaborationInfo')" />
			<p v-if="poll.status === 'VOTING' && !hasAlreadyVoted">
				{{ $t('votingPhaseIsRunngin') }}
				<router-link :to="{name: 'castVote'}">{{ $t('votingPhaseInfo') }}</router-link>
			</p>
			<p v-if="poll.status === 'FINISHED'" id="finishedPollInfo">
				{{ $t('finishedPollInfo', {
					winnerTitle: poll.winner ? poll.winner.title : "",
					numBallots: poll.numBallots,
				}) }}
			</p>
		</div>

		<div v-if="hasAlreadyVoted" id="isUpdateableBallotInfo" class="already-voted-ballot">
			<h2 class="page-title mt-5">{{ $t('yourBallot') }}</h2>
			<p class="page-subtitle text-center">{{ $t('alreadyVotedSubtitle') }}</p>
			<liquido-ballot
				:proposals="proposalsInBallot"
				:created-by-label="$t('createdBy')"
				:interactive="false"
				:disabled="true"
				:show-drag-handle="false"
				draggable-id="pollShowBallotDraggable"
			/>

			<div class="alert liquido-info mt-4">
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
		</div>

		<liquido-footer>
			<template #info>
				<p v-if="poll.status === 'ELABORATION' && !userIsAdmin && !userAlreadyHasProposal" v-html="$t('canAddProposal')" />	
				<p v-if="poll.status === 'ELABORATION' && !userIsAdmin && userAlreadyHasProposal" v-html="$t('alreadyAddedProposal')" />
			</template>
			<template #primary>
				<button v-if="poll.status === 'VOTING' && !hasAlreadyVoted" id="goToCastVoteButton" type="button" class="btn btn-primary" @click="clickCastVote()">
					<i class="fas fa-person-booth" />
					{{ $t("goToCastVote") }}
					<i class="fas fa-angle-double-right" />
				</button>

				<button v-else-if="poll.status === 'VOTING' && hasAlreadyVoted" id="alreadyVotedButton" type="button" class="btn btn-primary" disabled="true">
					{{ $t("alreadyVotedButton") }}
				</button>
	
				<button v-else-if="showAddProposal" id="addProposalButton" type="button" class="btn btn-primary" @click="clickAddProposal()">
					{{ $t("addProposal") }}
					<i class="fas fa-angle-double-right" />
				</button>
			</template>
		</liquido-footer>

		<!-- Admin only functions -->

		<div v-if="showStartVotingPhase" class="alert alert-admin mt-5">
			<p v-html="$t('startVotingPhaseInfo')" />
			<button id="startVoteButton" type="button" :disabled="startVoteLoading" class="btn btn-primary float-end" @click="clickStartVote()">
				<span v-if="startVoteLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
				<i v-else class="fas fa-user-shield" />
				{{ $t("startVotingPhase") }}
			</button>
		</div>

		<div v-if="showFinishVotingPhase" class="alert alert-admin mt-5">
			<p v-html="$t('finishVotingPhaseInfo', {numBallots: poll.numBallots})" />
			<button id="finishVoteButton" type="button" :disabled="finishVoteLoading" class="btn btn-primary float-end" @click="clickFinishVote()">
				<span v-if="finishVoteLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
				<i v-else class="fas fa-user-shield" />
				{{ $t("finishVotingPhase") }}
			</button>
		</div>
	</div>
</template>

<script>
import PollCard from "@/components/poll-card.vue"
import liquidoFooter from "@/components/liquido-footer.vue"
import liquidoBallot from "@/components/liquido-ballot.vue"
// import polly from '@/components/polly.vue'
import EventBus from "@/services/event-bus.js"
import api from "@/services/liquido-graphql-client.js"
import log from 'loglevel'
import { RouterLink } from "vue-router"

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				cannotFindPoll: "<h4>Fehler</h4><hr/><p>Diese Abstimmung konnte nicht gefunden werden.</p>",
				pollInElaborationInfo: 
					"<p>Diese Abstimmung ist gerade neu angelegt worden. Es können auch noch weitere Vorschläge hinzugefügt werden.</p>" +
					"<p>Sobald die Wahl startet, kannst du hier anonym und sicher deine Stimme abgeben.</p>",
				canAddProposal: 
					"Du kannst einen eigenen Vorschlag zu dieser Abstimmung hinzufügen.",
				yourBallot: "Dein Stimmzettel",
				alreadyAddedProposal: 
					"Du hast deinen Vorschlag bereits zu dieser Abstimmung hinzugefügt.",
				addProposal: "Vorschlag hinzufügen",
				startVotingPhaseInfo: 
					"Hallo Admin! Möchstest du die diese Abstimmung starten? Dann sind die Vorschläge fixiert und dein Team kann abstimmen.",
				startVotingPhase: "Abstimmung starten",
				finishVotingPhaseInfo: "Hallo Admin! Bisher wurden in dieser Abstimmung {numBallots} Stimmen abgegeben.",
				finishVotingPhase: "Abstimmung beenden",
				votingPhaseStartedSuccessfully: "Die Abstimmung ist jetzt gestartet.",
				votingPhaseIsRunngin: "Diese Abstimmung läuft gerade.",
				votingPhaseInfo: "Du kannst jetzt deine Stimme abgeben.",
				goToCastVote: "Zur Abstimmung",
				editOwnVote: "Stimmzettel ändern",
				alreadyVotedSubtitle: "Du hast diese Stimme bereits abgegeben:",
				alreadyVotedButton: "Stimme bereits abgegeben",
				checksumOfYourBallot: "Mit dieser Checksumme kannst du prüfen ob deine Stimme korrekt gezählt wurde:",
				verifyBallotButton: "Prüfen",
				ballotIsVerified: "Deine Stimme wurde erfolgreich gezählt.",
				createdBy: "von",
				finishedPollInfo: "Diese Abstimmung ist abgeschlossen. Gewonnen hat der Vorschlag '{winnerTitle}'. " +
					"Es wurden {numBallots} Stimmen abgegeben.",
				backToPolls: "zurück",
			},
		},
	},
	components: { PollCard, liquidoFooter, liquidoBallot },
	props: {
		// Allow number or string that contains an integer. Url parameter is passed as String, 
		// but $router.push({name: "pollShow", params: {pollId: 4711 }}) can be passed as number. We'll accept both
		pollId: { required: true, validator: function(val) {
			return !isNaN(val) | !isNaN(parseInt(val)) 
		} }, 
	},
	data() {
		return {
			poll: {},
			showError: false,
			loadingPoll: true,
			startVoteLoading: false,
			finishVoteLoading: false,
			existingBallot: undefined,
			proposalsInBallot: [],
			ballotIsVerified: false,
		}
	},
	computed: {
		pageTitleLoc() {
			if (!this.poll || !this.poll.id) return this.$t("Poll")
			if (!this.poll.proposals || this.poll.proposals.length === 0) return this.$t("newPoll")
			if (this.poll.status === "ELABORATION") return this.$t("pollInElaboration")
			if (this.poll.status === "VOTING") return this.$t("pollInVoting")
			if (this.poll.status === "FINISHED") return this.$t("finishedPoll")
			return this.$t("Poll")
		},
		userIsAdmin() {
			return api.isAdmin()
		},
		hasAlreadyVoted() {
			return this.poll.status === "VOTING" && !!this.existingBallot
		},
		userAlreadyHasProposal() {
			let currentUser = api.getCachedUser()
			if (!this.poll || !this.poll.proposals || !currentUser) return false
			return this.poll.proposals.filter((prop) => prop.createdBy.id === currentUser.id).length > 0
		},

		/** 
		 * A user can add his own proposal
		 * if the poll is in status ELABORATION and he did not add a proposal to this poll yet 
		 * or he is an admin. (Admin can also add multiple proposals.) 
		 */
		showAddProposal() {
			if (this.poll.status !== "ELABORATION") return false
			if (this.userIsAdmin) return true
			if (!this.poll.proposals || this.poll.proposals.length === 0) {
				return true
			}
			return !this.userAlreadyHasProposal
		},
		/** The voting phase can be started by the admin when there are at least two proposals */
		showStartVotingPhase() {
			return this.userIsAdmin && this.poll.status === "ELABORATION" && this.poll.proposals && this.poll.proposals.length > 1
		},
		showFinishVotingPhase() {
			return this.userIsAdmin && this.poll.status === "VOTING"  //TODO: and this.poll.numBallots > 0
		},
	},
	watch: {
		pollId: function(/*val*/) {
			this.loadPoll()  // necessary when navigating from one poll to another
		},
	},
	created() {
		this.loadPoll().then(() => {
			// when poll is loaded, set page title in liquido-header according to poll's status
			this.$store.setHeaderTitle(this.pageTitleLoc)
		})
		EventBus.on(EventBus.Event.POLL_LOADED, (loadedPoll) => {
			if (loadedPoll.id === this.poll.id) {
				console.log("poll-show.vue: Poll.id=" + this.poll.id + " has bee reloaded.")
				this.poll = loadedPoll
				this.loadExistingBallot()
			}
		})
	},
	mounted() {
		this.$store.setHeaderTitle(this.pageTitleLoc)
		this.$store.setHeaderBackTarget({ name: "polls" })   // Back is go to list of polls. (Do NOT use "BACK". User could come from propsoal-add!)
		this.$root.scrollToTop()  // the polls list stays. But one poll is always shown from the top
	},
	methods: {
		loadPoll() {
			if (!this.pollId || this.pollId < 0) {
				console.warn("Need pollId!")
				return
			} 
			this.loadingPoll = true
			// Reload poll from backend. Could also use cached version
			return api.getPollById(this.pollId, true)
				.then(receivedPoll => {
					this.poll = receivedPoll
					this.showError = false
					return this.loadExistingBallot()
				})
				.then(() => {
					this.loadingPoll = false
				})
				.catch(err => {
					console.warn("Cannot find poll.id=" + this.pollId, err)
					this.loadingPoll = false
					this.showError = true
				})
		},

		loadExistingBallot() {
			this.existingBallot = undefined
			this.proposalsInBallot = []
			this.ballotIsVerified = false
			if (this.poll.status !== "VOTING") return Promise.resolve()

			return api.getMyBallot(this.poll.id)
				.then(ballot => {
					this.existingBallot = ballot
					this.setProposalsInBallot(ballot)
				})
				.catch(err => console.warn("Cannot get ballot of user", err))
		},

		setProposalsInBallot(ballot) {
			if (!ballot || !this.poll.proposals) {
				this.proposalsInBallot = []
				return
			}

			let proposalsById = {}
			this.poll.proposals.forEach(prop => proposalsById[prop.id] = prop)
			this.proposalsInBallot = ballot.voteOrder
				.map(elem => proposalsById[elem.id])
				.filter(Boolean)
		},
		
		clickAddProposal() {
			this.$router.push({name: "addProposal", params: {pollId: this.poll.id}})
		},

		clickCastVote() {
			this.$router.push({name: "castVote", params: {pollId: this.poll.id} })
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
				this.ballotIsVerified = false
			})
		},

		clickStartVote() {
			if (this.startVoteLoading) return  // do not allow double click
			this.startVoteLoading = true
			api.startVotingPhase(this.poll.id).then(poll => {
				this.startVoteLoading = false
				this.poll = poll  // startVotingPhase returns updated poll in new status
				this.$root.showSuccess(this.$t("votingPhaseStartedSuccessfully"), "")
        document.getElementsByTagName("html").scrollTop = 0
				//$("html, body").animate({ scrollTop: 0 }, 500)
			}).catch(err => {
				this.startVoteLoading = false
				log.error("Cannot start voting phase of poll(id="+this.poll.id+")", err)
			})
		},

		clickFinishVote() {
			if (this.finishVoteLoading) return  // do not allow double click
			this.finishVoteLoading = true
			api.finishVotingPhase(this.poll.id).then(winner => {
				this.finishVoteLoading = false
				// Locally update poll status also in cache. No need to reload poll from backend
				this.poll.status = "FINISHED"
				this.poll.winner = winner
				api.pollsCache.put("poll/"+this.poll.id, this.poll)
        document.getElementsByTagName("html").scrollTop = 0
				//$("html, body").animate({ scrollTop: 0 }, 500)
			}).catch(err => {
				this.finishVoteLoading = false
				log.error("Cannot finish voting phase of poll(id="+this.poll.id+")", err)
			})
		},
	},
}
</script>

<style>


</style>
