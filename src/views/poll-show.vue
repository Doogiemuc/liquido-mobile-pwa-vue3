<template>
	<div>
		<h2 id="poll-show" class="page-title">
			{{ this.pageTitleLoc }}
		</h2>

		<div v-if="loadingPoll" class="my-3">
			<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>&nbsp;{{ $t('Loading') }}
		</div>
	
		<poll-card v-if="poll.id && !loadingPoll" :poll="poll" :show-arrow-right="false" :show-proposals="true" :proposals-expanded="true" class="shadow-sm mb-4" @edit-proposal="gotoEditProposal" />

		<div v-if="showError"	class="alert alert-danger mb-3">
			<liqui-loc-html tag="div" msg-key="cannotFindPoll" :params="{pollId: pollId}" />
			<button type="button" class="btn btn-primary float-end" @click="$root.gotoPolls">
				{{ $t("Back") }}
			</button>
		</div>

		<div v-if="!showError && poll.status === 'ELABORATION' && userIsAdmin()" class="alert alert-admin">
			<liqui-loc-html tag="p" msg-key="PollInElaboration_Admin" />
			<button id="editPollButton" type="button" class="btn btn-primary float-end" @click="clickEditPoll()">
				{{ $t("editPoll") }}
			</button>
		</div>

		<!-- Every child below is status specific, so the alert must not render when none of them would:
		     an admin looking at an ELABORATION poll already has the alert-admin box above, and this one
		     would be an empty coloured box under it. -->
		<div v-if="!showError && !hasAlreadyVoted && !(poll.status === 'ELABORATION' && userIsAdmin())" class="alert liquido-info">
			<template v-if="poll.status === 'ELABORATION' && !userIsAdmin()">
				<p>{{ $t('PollInElaboration_MemberInfo') }}</p>
				<p v-if="poll.membersCanAddProposals">{{ $t('MembersCanAddProposals') }}</p>
				<p v-if="!poll.membersCanAddProposals" id="onlyAdminAddsProposalsInfo">{{ $t('OnlyAdminCanAddProposals') }}</p>
				<p v-if="myEditableProposal()" id="canEditOwnProposalInfo">{{ $t('canEditOwnProposal') }}</p>
				<p>{{$t('MemberCanCastVote_WhenStarted')}}</p>

				<!--
					One button, because two would compete. A member who already has a proposal is offered
					"edit" - that they may also add another is said in the text above, and does not fit
					on a button.
				-->
				<button v-if="myEditableProposal()" id="editMyProposalButton" type="button" class="btn btn-primary float-end" @click="clickEditMyProposal()">
					{{ $t("editMyProposal") }}
				</button>
				<button v-else-if="poll.membersCanAddProposals" id="addProposalButton" type="button" class="btn btn-primary float-end" @click="clickAddProposal()">
					{{ $t("addProposal") }}
				</button>
			</template>

			<p v-if="poll.status === 'VOTING'">
				{{ $t('votingPhaseIsRunning') }}	
				<router-link :to="{name: 'castVote'}">{{ $t('votingPhaseInfo') }}</router-link>
			</p>
			<p v-if="poll.status === 'FINISHED'" id="finishedPollInfo">
				{{ $t('finishedPollInfo', {
					winnerTitle: poll.winner ? poll.winner.title : "",
					numBallots: poll.numBallots,
				}) }}
			</p>
		</div>

		<div v-if="hasAlreadyVoted" id="alreadyVotedInfo" class="already-voted-ballot">
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
			<template #primary>
				<!--
					A poll in ELABORATION has exactly ONE footer action, never two.

					For the admin that action is "start the voting phase" - it is the only thing only they
					can do, and it is what moves the poll forward. Adding a proposal is deliberately NOT
					here: it sits on the page, next to the proposals it adds to (see above).

					For an ordinary member there is nothing to do in the footer at all, so they get Back.
					The admin also falls back to Back while showStartVotingPhase is false, which happens
					when the poll does not have the two proposals a vote needs yet.
				-->
				<button v-if="poll.status === 'ELABORATION' && !showStartVotingPhase" id="backToPollsButton" type="button" class="btn btn-outline-secondary" @click="gotoPolls()">
					<i class="fas fa-angle-double-left" />
					{{ $t("Back") }}
				</button>

				<button v-if="poll.status === 'VOTING' && !hasAlreadyVoted" id="goToCastVoteButton" type="button" class="btn btn-primary" @click="clickCastVote()">
					<i class="fas fa-person-booth" />
					{{ $t("goToCastVote") }}
					<i class="fas fa-angle-double-right" />
				</button>

				<button v-else-if="poll.status === 'VOTING' && hasAlreadyVoted" id="alreadyVotedButton" type="button" class="btn btn-primary" disabled="true">
					{{ $t("alreadyVotedButton") }}
				</button>
	
				<button v-else-if="showStartVotingPhase" id="startVoteButton" type="button" :disabled="startVoteLoading"
					class="btn btn-primary" @click="clickStartVote()">
					<span v-if="startVoteLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
					<i v-else class="fas fa-user-shield me-2" />
					{{ $t("startVotingPhase") }}
				</button>
			</template>
		</liquido-footer>

		<!-- Admin only functions -->

		<!--
			Its own popup-modal rather than the shared root one, because this dialog needs a body of its
			own: the warning AND an input for the runtime. Same approach cast-vote.vue takes for its
			ballot confirmation.
		-->
		<popup-modal id="startPollModal" ref="startPollModal">
			<template #modal-body>
				<p id="startPollConfirmMessage">{{ $t("startPollConfirmMessage") }}</p>
				<liquido-input
					id="pollDurationInput"
					v-model="pollDurationDays"
					type="number"
					:label="$t('pollDurationLabel')"
					:min="1"
					:max="365"
					:invalid-feedback="$t('pollDurationInvalid')"
					required
				/>
			</template>
		</popup-modal>

		<div v-if="showFinishVotingPhase" class="alert alert-admin mt-5">
			<liqui-loc-html tag="p" msg-key="finishVotingPhaseInfo" :params="{numBallots: poll.numBallots}" />
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
import popupModal from "@/components/popup-modal.vue"
import liquidoInput from "@/components/liquido-input.vue"
import config from "config"
import EventBus from "@/services/event-bus.js"
import api from "@/services/liquido-graphql-client.js"
import log from 'loglevel'

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				cannotFindPoll: "<h4>Fehler</h4><hr/><p>Diese Abstimmung konnte nicht gefunden werden.</p>",
				PollInElaboration_Admin:
					"<p>Du hast diese Abstimmung neu angelegt. Jetzt kannst du noch weitere Vorschläge hinzufügen.</p>" +
					"<p>Sobald du die Abstimmung startest, können deine Teammitglieder dann hier anonym und sicher ihre Stimme abgeben.</p>",
				PollInElaboration_MemberInfo:
					"Diese Abstimmung ist gerade neu angelegt worden.",
				MembersCanAddProposals:  // for member and admin
					"Jeder im Team kann noch weitere Vorschläge zur dieser Abstimmung hinzufügen.",
				OnlyAdminCanAddProposals:
					"Nur euer Admin kann noch weitere Vorschläge zu dieser Abstimmung hinzufügen.",
				MemberCanCastVote_WhenStarted:
					"Sobald euer Admin die Abstimmung startet, kannst du dann hier anonym und sicher deine Stimme abgeben.",

				yourBallot: "Dein Stimmzettel",
				onlyAdminAddsProposals:
					"In dieser Abstimmung legt nur der Admin die Vorschläge fest.",
				addProposal: "Vorschlag hinzufügen",
				editPoll: "Abstimmung bearbeiten",
				editMyProposal: "Vorschlag bearbeiten",
				canEditOwnProposal: "Du kannst deinen eigenen Vorschlag bearbeiten",
				startVotingPhaseInfo: 
					"Hallo Admin! Möchstest du die diese Abstimmung starten? Dann sind die Vorschläge fixiert und dein Team kann abstimmen.",
				startVotingPhase: "Abstimmung starten",
				startPollConfirmTitle: "Abstimmung starten?",
				startPollConfirmMessage: "Bist du sicher? Sobald die Abstimmung gestartet ist, können keine Vorschläge mehr hinzugefügt werden.",
				startPollConfirmButton: "Jetzt starten",
				pollDurationLabel: "Laufzeit in Tagen",
				pollDurationInvalid: "Bitte gib eine Laufzeit zwischen 1 und 365 Tagen an.",
				cancel: "Abbrechen",
				finishVotingPhaseInfo: "Hallo Admin! Bisher wurden in dieser Abstimmung {numBallots} Stimmen abgegeben.",
				finishVotingPhase: "Abstimmung beenden",
				votingPhaseStartedSuccessfully: "Die Abstimmung ist jetzt gestartet.",
				votingPhaseIsRunning: "Diese Abstimmung läuft gerade.",
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
	components: { PollCard, liquidoFooter, liquidoBallot, popupModal, liquidoInput },
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
			/** Runtime the admin picks in the start-poll dialog. Prefilled from the frontend config. */
			pollDurationDays: Number(config.pollDefaultRuntimeDays) || 7,
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
		hasAlreadyVoted() {
			return this.poll.status === "VOTING" && !!this.existingBallot
		},
		/** The voting phase can be started by the admin when there are at least two proposals */
		showStartVotingPhase() {
			return this.userIsAdmin() && this.poll.status === "ELABORATION" && this.poll.proposals && this.poll.proposals.length > 1
		},
		showFinishVotingPhase() {
			return this.userIsAdmin() && this.poll.status === "VOTING"  //TODO: and this.poll.numBallots > 0
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
		/**
		 * A METHOD, deliberately not a computed. api.isAdmin() decodes the cached JWT and has no
		 * reactive dependency, so a computed wrapping it would evaluate once and cache that answer for
		 * the life of the component - going stale as soon as it changes (a switchTeam re-mints the
		 * token, and a user can be admin of one team and a plain member of the next).
		 */
		userIsAdmin() {
			return api.isAdmin()
		},

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
		
		/**
		 * The current user's own proposal in this poll, or undefined.
		 *
		 * Same rule as poll-card.canEditProposal and the backend's PollService.updateProposalInPoll:
		 * you may edit your own proposal while the poll is in ELABORATION, and there is deliberately
		 * no admin override - rewriting someone else's words is a trust problem.
		 *
		 * A method rather than a computed on purpose: api.getCachedUser() is not reactive, so a
		 * computed could latch onto whatever it read before the cache was warm.
		 *
		 * Members may add more than one proposal. This returns the first; the rest stay reachable
		 * through the pencils on the poll card and in the editor.
		 */
		myEditableProposal() {
			if (this.poll.status !== "ELABORATION") return undefined
			const currentUserId = api.getCachedUser()?.id
			if (!currentUserId) return undefined
			return (this.poll.proposals || []).find(prop => prop.createdBy?.id === currentUserId)
		},

		/** Admin: open the editor on the whole poll - its title, its icon and any proposal. */
		clickEditPoll() {
			this.$router.push({name: "editPoll", params: {pollId: this.poll.id}})
		},

		/** Member: open the editor with their own proposal already expanded. */
		clickEditMyProposal() {
			const own = this.myEditableProposal()
			if (own) this.gotoEditProposal(own.id)
			else this.clickAddProposal()
		},

		clickAddProposal() {
			// The editor shows the whole poll with an empty row at the bottom, so "add a proposal"
			// and "edit my own" are the same page now.
			this.$router.push({name: "editPoll", params: {pollId: this.poll.id}})
		},

		/** Edit one of your own proposals. Emitted by the pencil in poll-card.vue. */
		gotoEditProposal(proposalId) {
			this.$router.push({name: "editPoll", params: {pollId: this.poll.id}, query: {edit: proposalId}})
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

		/**
		 * Starting a poll freezes its proposals, so ask before doing it - and take the chance to let
		 * the admin choose how long it runs, instead of silently applying a server default.
		 */
		clickStartVote() {
			if (this.startVoteLoading) return  // do not allow double click
			this.pollDurationDays = Number(config.pollDefaultRuntimeDays) || 7   // reset on every open
			this.$refs.startPollModal.showInfo(
				undefined,   // body comes from the #modal-body slot
				this.$t("startPollConfirmTitle"),
				this.$t("startPollConfirmButton"),
				this.$t("cancel"),
				this.confirmStartVote
			)
		},

		/** The admin confirmed: start the voting phase for the number of days he chose. */
		confirmStartVote() {
			if (this.startVoteLoading) return  // do not allow double click
			this.startVoteLoading = true
			api.startVotingPhase(this.poll.id, this.pollDurationDays).then(poll => {
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

		gotoPolls() {
			this.$root.gotoPolls()
		}

	}
}
</script>

<style>


</style>
