<template>
	<div>
		<h1 id="poll-show" class="page-title">
			{{ this.pageTitleLoc }}
		</h1>

		<div v-if="loadingPoll" class="my-3">
			<b-spinner small />&nbsp;{{ $t('Loading') }}
		</div>
	
		<poll-panel v-if="poll.id" :poll="poll" :read-only="true" class="mb-4" />

		<div v-if="showError"	class="alert alert-danger mb-3">
			<div v-html="$t('cannotFindPoll', {pollId: pollId})" />
			<b-button variant="primary" class="float-end" @click="gotoPolls()">
				{{ $t("Back") }}
			</b-button>
		</div>

		<!-- Text info -->
		<div class="text-muted">
			<p v-if="poll.status === 'ELABORATION' && poll.proposals && poll.proposals.length > 0" v-html="$t('pollInElaborationInfo')" />
			<p v-if="poll.status === 'ELABORATION' && !userIsAdmin && userAlreadyHasProposal" v-html="$t('alreadyAddedProposal')" />
			<p v-if="poll.status === 'ELABORATION' && !userIsAdmin && !userAlreadyHasProposal" v-html="$t('canAddProposal')" />
			<p v-if="poll.status === 'VOTING' && !poll.usersBallot" v-html="$t('votingPhaseInfo')" />
			<p v-if="poll.status === 'VOTING' &&  poll.usersBallot" v-html="$t('alreadyVotedInfo')" />
			<p v-if="poll.status === 'FINISHED'" id="finishedPollInfo">
					{{ $t('finishedPollInfo', {
						winnerTitle: poll.winner ? poll.winner.title : "",
						numBallots: poll.numBallots,
					}) }}
				</p>
		</div>

		

		<!-- Action button -->
		<div class="d-flex justify-content-end mt-3">
		
			<b-button v-if="poll.status === 'VOTING' && !poll.usersBallot" id="goToCastVoteButton" variant="primary" @click="clickCastVote()">
				<i class="fas fa-person-booth" />
				{{ $t("goToCastVote") }}
				<i class="fas fa-angle-double-right" />
			</b-button>

			<b-button v-else-if="poll.status === 'VOTING' && poll.usersBallot" variant="primary" @click="clickCastVote()">
				<i class="fas fa-person-booth" />
				{{ $t("editOwnVote") }}
				<i class="fas fa-angle-double-right" />
			</b-button>
	
			<b-button v-else-if="showAddProposal" id="addProposalButton" variant="primary" @click="clickAddProposal()">
				{{ $t("addProposal") }}
				<i class="fas fa-angle-double-right" />
			</b-button>
		
		</div>

		<!-- Admin only functions -->

		<div v-if="showStartVotingPhase" class="alert alert-admin mt-5">
			<i class="fas fa-shield-alt float-end"></i>
			<p v-html="$t('startVotingPhaseInfo')" />
			<b-button id="startVoteButton" :disabled="startVoteLoading" variant="primary" class="float-end" @click="clickStartVote()">
				<b-spinner v-if="startVoteLoading" small />
				<i v-else class="fas fa-user-shield" />
				{{ $t("startVotingPhase") }}
			</b-button>
		</div>

		<div v-if="showFinishVotingPhase" class="alert alert-admin mt-5">
			<i class="fas fa-shield-alt float-end"></i>
			<p v-html="$t('finishVotingPhaseInfo', {numBallots: poll.numBallots})" />
			<b-button id="finishVoteButton" :disabled="finishVoteLoading" variant="primary" class="float-end" @click="clickFinishVote()">
				<b-spinner v-if="finishVoteLoading" small />
				<i v-else class="fas fa-user-shield" />
				{{ $t("finishVotingPhase") }}
			</b-button>
		</div>

		<popup-modal 
			id="votingPhaseStartedModal"
			ref="votingPhaseStartedModal"
			type="success"
		>
			{{ $t("votingPhaseStartedSuccessfully") }}
		</popup-modal>
	</div>
</template>

<script>
import pollPanel from "@/components/poll-panel.vue"
import popupModal from "@/components/popup-modal.vue"
import polly from '@/components/polly.vue'
import EventBus from "@/services/event-bus.js"
import { store }  from "@/services/store.js"
import api from "@/services/liquido-graphql-client.js"
import log from 'loglevel'

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				cannotFindPoll: "<h4>Fehler</h4><hr/><p>Diese Abstimmung konnte nicht gefunden werden.</p>",
				pollInElaborationInfo: 
					"<p>Diese Abstimmung wird gerade noch debatiert.</p>" +
					"<p>Wenn euer Admin die Wahl startet, kannst du anonym deine Stimme abgeben.</p>",
				canAddProposal: 
					"Du kannst in dieser Abstimmung jetzt deinen eigenen Wahlvorschlag hinzufügen.",
				alreadyAddedProposal: 
					"Du hast bereits einen Wahlvorschlag in dieser Abstimmung hinzugefügt.",
				addProposal: "Vorschlag hinzufügen",
				startVotingPhaseInfo: 
					"Hallo Admin! Möchstest du die Wahlphase für diese Abstimmung starten? Dann sind die Wahlvorschläge fixiert und dein Team kann abstimmen.",
				startVotingPhase: "Wahlphase starten",
				finishVotingPhaseInfo: "Hallo Admin! Bisher wurden in dieser Abstimmung {numBallots} Stimmen abgegeben.",
				finishVotingPhase: "Wahlphase schließen",
				votingPhaseStartedSuccessfully: "Die Wahlphase dieser Abstimmung ist jetzt gestartet.",
				votingPhaseInfo: "Die Wahlphase dieser Abstimmung läuft gerade.",
				goToCastVote: "Stimme abgeben",
				editOwnVote: "Stimmzettel ändern",
				alreadyVotedInfo:
					"<p>Du hast in dieser Abstimmung bereits eine Stimme abgegeben.</p><p>So lange die Wahlphase dieser Abstimmung noch läuft, "+
					"kannst du in <span class='liquido'></span> die Prio Reihenfolge auf deinem Stimmzettel auch noch ändern wenn du möchstest.</p>",
				finishedPollInfo: "Diese Abstimmung ist abgeschlossen. Gewonnen hat der Vorschlag '{winnerTitle}'. " +
					"Es wurden {numBallots} Stimmen abgegeben.",
				backToPolls: "zurück",
			},
		},
	},
	components: { pollPanel, popupModal, polly },
	props: {
		// Allow number or string that contains an integer. Url parameter is passed as String, 
		// but $router.push({name: "pollShow", params: {pollId: 4711 }}) can be passed as number. We'll accept both
		pollId: { required: true, validator: function(val) {
			return !isNaN(val) | !isNaN(parseInt(val)) 
		} }, 
	},
	data() {
		return {
			store,
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
			this.loadPoll()  // necessary when navigating from /poll/:id1 to another /poll/:id2
		},
	},
	created() {
		this.loadPoll().then(() => {
			// when poll is loaded, set page title in liquido-header according to poll's status
			this.store.setHeaderTitle(this.pageTitleLoc)
		})
		EventBus.on(EventBus.Event.POLL_LOADED, (loadedPoll) => {
			if (loadedPoll.id === this.poll.id) {
				console.log("poll-show.vue: Poll.id=" + this.poll.id + " was reloaded", loadedPoll)
				this.poll = loadedPoll
			}
		})
	},
	mounted() {
		this.store.setHeaderTitle(this.pageTitleLoc)
		this.store.setHeaderBackLink("/polls")   // Back is go to list of polls. (Do NOT use "BACK". User could come from propsoal-add!)
		this.$root.scrollToTop()  // the polls list stays. But one poll is always shown from the top
	},
	methods: {
		loadPoll() {
			if (!this.pollId || this.pollId < 0) {
				console.warn("Need pollId!")
				return
			} 
			this.loadingPoll = true
			// Here we do not force a refresh. Fetch from cache if possible.
			// (When user clicks on cast vote we load everything freshly.)
			return api.getPollById(this.pollId)
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

		goToPolls() {
			this.$router.push({name: "polls"})
		},

		
		clickAddProposal() {
			this.$router.push("/polls/" + this.poll.id + "/add")
		},

		clickCastVote() {
			this.$router.push("/polls/" + this.poll.id + "/castVote")
		},

		clickStartVote() {
			if (this.startVoteLoading) return  // do not allow double click
			this.startVoteLoading = true
			api.startVotingPhase(this.poll.id).then(poll => {
				this.startVoteLoading = false
				this.poll = poll  // startVotingPhase returns updated poll in new status
				this.$refs["votingPhaseStartedModal"].show()
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
