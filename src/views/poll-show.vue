<template>
	<div>
		<h2 id="poll-show" class="page-title">
			{{ this.pageTitleLoc }}
		</h2>

		<div v-if="loadingPoll" class="my-3">
			<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>&nbsp;{{ $t('Loading') }}
		</div>
	
		<poll-card v-if="poll.id" :poll="poll" :show-arrow-right="false" :show-proposals="true" class="mb-4" />

		<div v-if="showError"	class="alert alert-danger mb-3">
			<div v-html="$t('cannotFindPoll', {pollId: pollId})" />
			<button type="button" class="btn btn-primary float-end" @click="$root.gotoPolls">
				{{ $t("Back") }}
			</button>
		</div>

		<div v-if="!showError" class="alert liquido-info">
			<p v-if="poll.status === 'ELABORATION'" v-html="$t('pollInElaborationInfo')" />
			<p v-if="poll.status === 'VOTING' && !poll.usersBallot">
				{{ $t('votingPhaseIsRunngin') }}
				<router-link :to="{name: 'castVote'}">{{ $t('votingPhaseInfo') }}</router-link>
			</p>
			<p v-if="poll.status === 'VOTING' &&  poll.usersBallot" v-html="$t('alreadyVotedInfo')" />
			<p v-if="poll.status === 'FINISHED'" id="finishedPollInfo">
				{{ $t('finishedPollInfo', {
					winnerTitle: poll.winner ? poll.winner.title : "",
					numBallots: poll.numBallots,
				}) }}
			</p>
		</div>

		<liquido-footer>
			<template #info>
				<p v-if="poll.status === 'ELABORATION' && !userIsAdmin && !userAlreadyHasProposal" v-html="$t('canAddProposal')" />	
				<p v-if="poll.status === 'ELABORATION' && !userIsAdmin && userAlreadyHasProposal" v-html="$t('alreadyAddedProposal')" />
			</template>
			<template #primary>
				<button v-if="poll.status === 'VOTING' && !poll.usersBallot" id="goToCastVoteButton" type="button" class="btn btn-lg w-100 btn-primary" @click="clickCastVote()">
					<i class="fas fa-person-booth" />
					{{ $t("goToCastVote") }}
					<i class="fas fa-angle-double-right" />
				</button>

				<button v-else-if="poll.status === 'VOTING' && poll.usersBallot" type="button" class="btn btn-primary btn-lg" @click="clickCastVote()">
					<i class="fas fa-person-booth" />
					{{ $t("editOwnVote") }}
					<i class="fas fa-angle-double-right" />
				</button>
	
				<button v-else-if="showAddProposal" id="addProposalButton" type="button" class="btn btn-primary btn-lg" @click="clickAddProposal()">
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
				alreadyVotedInfo:
					"<p>Du hast in dieser Abstimmung bereits eine Stimme abgegeben.</p>",
				finishedPollInfo: "Diese Abstimmung ist abgeschlossen. Gewonnen hat der Vorschlag '{winnerTitle}'. " +
					"Es wurden {numBallots} Stimmen abgegeben.",
				backToPolls: "zurück",
			},
		},
	},
	components: { PollCard, liquidoFooter },
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
				console.log("poll-show.vue: Poll.id=" + this.poll.id + " was reloaded", loadedPoll)
				this.poll = loadedPoll
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
					this.loadingPoll = false
					this.showError = false
				})
				.catch(err => {
					console.warn("Cannot find poll.id=" + this.pollId, err)
					this.loadingPoll = false
					this.showError = true
				})
		},
		
		clickAddProposal() {
			this.$router.push({name: "addProposal", params: {pollId: this.poll.id}})
		},

		clickCastVote() {
			this.$router.push({name: "castVote", params: {pollId: this.poll.id} })
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
