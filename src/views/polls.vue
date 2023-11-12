<template>
	<div>
		
		<h1 id="polls-title" class="page-title">{{ pageTitleLoc }}</h1>

		<div v-if="loading" class="my-3">
			<b-spinner small />&nbsp;{{ $t('Loading') }}
		</div>

		<!-- Search -->
		<div v-if="allPolls.length > 3" class="search-wrapper">
			<input id="searchInput" class="form-control" v-model="searchQuery" type="text" :placeholder="$t('Search')">
			<i v-if="searchQuery == ''" class="fas fa-search search-icon"></i>
			<i v-else class="fas fa-times search-icon" @click="clearSearchAndFilter"></i>
		</div>

		<!-- list of polls -->
		<div v-if="!loading" class="poll-list mb-5">
			<transition-group name="poll-list" class="poll-list-transition" tag="div">
				<div v-for="poll in filteredPolls" :key="poll.id" class="poll-panel-wrapper" @click="goToPoll(poll.id)">
					<b-row class="poll-panel-inner">
						<b-col class="poll-icon-col">
							<div class="poll-icon"><i :class="iconForPoll(poll)"></i></div>
						</b-col>
						<b-col class="poll-col-2">
							<h3 class="poll-title">
								{{ poll.title }}
							</h3>
							<div class="poll-footer">
								<div v-if="poll.status === 'VOTING'">
									<i class="fas fa-person-booth"></i>&nbsp;{{ $tc('votes', poll.numBallots) }}
									<i class="far fa-calendar-alt"></i>&nbsp;{{ $tc('daysLeft', daysLeft(poll) ) }}
								</div>
								<div v-else-if="poll.status === 'FINISHED'">
									<i class="far fa-check-circle"></i>&nbsp;{{ $t('finished') }}
								</div>
								<div v-else>
									<i class="far fa-lightbulb"></i>&nbsp;{{ $tc('numProposals', poll.proposals.length ) }}
								</div>
							</div>
						</b-col>
						<b-col class="poll-col-3">
							<div class="show-poll-details">
								<i class="fas fa-angle-right"></i>
							</div>
						</b-col>
					</b-row>
				</div>
			</transition-group>
		
			<!-- list of polls (previous version with poll panels)
			<transition-group name="poll-list" tag="div">
				<poll-panel 
					v-for="poll in filteredPolls"
					:key="poll.id"
					:poll="poll"
					:collapse="true"
					class="shadow-sm"
				/>
			</transition-group -->
			

			<p v-if="allPolls.length === 0 && !loading" class="text-center" v-html="$t('noPollYet')" />

			<div v-if="filteredPolls.length == 0" id="emptySearchResultInfo" class="text-center" @click="clearSearchAndFilter">
				<p>{{ $t('noPollsMatchSearch') }}</p>
			</div>

		</div>
		
		<div v-if="pollStatusFilter === 'ELABORATION'" class="alert text-muted">
			<p v-if="hasPollInElaboration" v-html="$t('pollsInElaborationInfo')" />
			<p v-else v-html="$t('noPollsInElaboration')" />
			<p v-if="!hasPollInElaboration && hasPollInVoting" v-html="$t('butPollInVoting')" />
		</div>

		<div v-if="pollStatusFilter === 'VOTING'" class="alert text-muted">
			<p v-if="hasPollInVoting" v-html="$t('pollsInVotingInfo')" />
			<p v-else v-html="$t('noPollsInVoting')" />
			<p v-if="!hasPollInVoting && hasPollInElaboration" v-html="$t('butProposalsInDiscussion')" />
		</div>

		<div v-if="pollStatusFilter === 'FINISHED'" class="alert text-muted">
			<p v-if="hasFinishedPoll" v-html="$t('finishedPollsInfo')" />
			<p v-else v-html="$t('noFinishedPolls')" />
			<p v-if="!hasFinishedPoll && hasPollInVoting" v-html="$t('butPollInVoting')" />
		</div>
	
		<div v-if="userIsAdmin" id="createPollInfo" class="alert alert-admin">
			<p>
				<i class="fas fa-shield-alt float-end"></i>
				{{ $t('onlyAdminCanCreateNewPolls') }}
			</p>
			<b-button id="createPollButton" variant="primary" class="float-end" @click="gotoCreatePoll()">
				<i class="fas fa-shield-alt" /> {{ $t("createPoll") }} <i class="fas fa-angle-double-right" />
			</b-button>
		</div>

	</div>
</template>

<script>
/**
 * This is by far the most important view in the whole app.
 * Meanwhile I redesigned this page dozens of times ... and yet it's not perfect :-)
 * But it's getting better and better everytiem! :-)
 */

// import pollPanel from "../components/poll-panel"
import EventBus from "@/services/event-bus"
import api from "@/services/liquido-graphql-client"
import dayjs from "dayjs"

const pollStatusOrder = {
	ELABORATION: 0,
	VOTING: 1,
	FINISHED: 2,
}

export default {
	i18n: {
		messages: {
			en: {
				noPollsInElaboration: "There currently are no polls whose proposals can still be discussed.",
				noPollsInVoting: "There currently are no polls open for voting.",
				noFinishedPolls: "There are no finished polls yet.",
				butProposalsInDiscussion: "However there are proposals that you can discuss.",
				butPollInVoting: "However there is a poll in which you can vote.",
			},
			de: {
				pollsInElaborationInfo: 
					"<p>Diese Abstimmungen werden gerade noch diksutiert. Weitere Wahlvorschläge können noch hinzugefügt werden.</p>" +
					"<p>Wenn euer Admin eine Abstimmung startet, könnt ihr darin eure Stimme abgeben.</p>",
				pollsInVotingInfo: "In diesen Abstimmungen kannst du jetzt deine Stimme abgeben.",
				finishedPollsInfo: "Diese Abstimmungen sind beendet.",
				finished: "abgeschlossen",
				noPollYet: "Euer Admin hat bisher noch keine Abstimmung erstellt.",
				noPollsMatchSearch: "- // -",
				noPollsInElaboration: "Aktuell gibt es gerade keine Abstimmungen mit Wahlvorschläge die noch diskutiert werden können.",
				noPollsInVoting: "Es läuft gerade keine Abstimmungen, in der du deine Stimmen abgegeben könntest.",
				noFinishedPolls: "In eurem Team gibt es bisher noch keine abgeschlossenen Abstimmungen.",
				butProposalsInDiscussion: "Es gibt jedoch Abstimmungen in Diskussion. Dort könnt ihr die Wahlvorschlägen diskutieren.",
				butPollInVoting: "Es gibt jedoch eine <b>laufende Abstimmung</b> in der du deine Stimme abgeben kannst.",
				onlyAdminCanCreateNewPolls: "Nur du als Admin dieses Teams kannst neue Abstimmungen erstellen. " +
					"Jedes Teammitglied kann dann seinen Wahlvorschlag zur Abstimmung hinzufügen.",
				createPoll: "Neue Abstimmung anlegen",
				votes: "0 Stimmen | 1 Stimme | {n} Stimmen",
				daysLeft: "Wahl Abgeschlossen | ein Tag noch | noch {n} Tage",
				numProposals: "Noch keine Wahlvorschläge | ein Wahlvorschlag | {n} Wahlvorschläge",
			},
		},
	},
	name: "PollsList",
	//components: { pollPanel },
	props: {
		//status: { type: String, required: false, default: undefined },
	},
	data() {
		return {
			loading: true,
			searchQuery: "",
			/**current filter for poll status, undefined|ELABORATION|VOTING|FINISHED */
			//pollStatusFilter: undefined,
			forceRefreshComputed: 0   
		}
	},
	computed: {
		pollStatusFilter() {
			console.log("poll get computed pollStatusFilter", this.$root.pollStatusFilter)
			return this.$root.pollStatusFilter
		},
		pageTitleLoc() {
			switch (this.$root.pollStatusFilter) {
				case "ELABORATION":
					return this.$t("pollsInElaboration")
				case "VOTING":
					return this.$t("pollsInVoting")
				case "FINISHED":
					return this.$t("finishedPolls")
				default:
					return this.$t("YourPolls")
			}
		},
		iconForFilter() {
			switch (this.$root.pollStatusFilter) {
				case "ELABORATION":
					return "fas fa-comments"
				case "VOTING":
					return "fas fa-person-booth"
				case "FINISHED":
					return "fas fa-check-circle"
				default:
					return "fas fa-vote-yea"
			}
		},
		userIsAdmin() {
			return api.isAdmin()
		},
		allPolls() {
			this.forceRefreshComputed;		
			let polls = api.getCachedPolls()
			return polls
		},
		filteredPolls() {
			// Implementation note:
			// We could hold a local copy of all polls in this component. 
			// But that would need to be updated whenver polls are loaded from the backend.
			// So we reference the list of polls from the cache.
			// Sadly the javascript Arry.filter method creates a copy of the array.
			// So VUE's reactive updates do not work when the data changes in the cache.
			// Therefore we have to force a recompute of this "computed" value with a nice hack:
			this.forceRefreshComputed;
			return api.getCachedPolls(this.$root.pollStatusFilter)
				.filter((poll) => this.matchesSearch(poll))
				.sort((p1,p2) => {
					//sort polls by status
					
					//TODO: make it possible to sort polls by date created
					
					return pollStatusOrder[p1.status] - pollStatusOrder[p2.status]
				})    
				
		},
		searchResultIsEmpty() {
			return this.allPolls.length > 0 && this.filteredPolls.length === 0 /* && this.searchQuery && this.searchQuery.trim().length > 0 */
		},
		hasPollInElaboration() {
			return api.getCachedPolls("ELABORATION").length > 0
		},
		hasPollInVoting() {
			return api.getCachedPolls("VOTING").length > 0
		},
		hasFinishedPoll() {
			return api.getCachedPolls("FINISHED").length > 0
		}
	},
	created() {
		console.log("==== Polls component created", this.$root.pollStatusFilter)

		// When poll filter changes in navbar, then force a recompute of computed values (mainly "filteredPolls")
		EventBus.on(EventBus.Event.POLL_FILTER_CHANGED, (/*newFilterValue*/) => this.forceRefreshComputed++)

		// When one or all polls change, the reflect the changes in the UI.
		EventBus.on(EventBus.Event.POLL_LOADED, () => this.pollsChanged())
		EventBus.on(EventBus.Event.POLLS_LOADED, () => this.pollsChanged())  // event param "polls" is not used here

		this.loading = false

		/*
		// We don't need to load polls here. They were already loaded at login.
		
		//TODO: refresh on pull-down
		
		this.loading = true
		api.getPolls()
			.then(() => {
				console.log("Loading polls")
				this.forceRefreshComputed++
				this.loading = false
			})
			.catch(err => {
				this.loading = false
				console.error("Canont load polls", err)
			})
		*/
	},
	mounted() {
		
	},
	methods: {
		iconForPoll(poll) {
			if (!poll) return undefined
			switch (poll.status) {
				case "ELABORATION":
					return "far fa-comments"   // or fa-poll?
				case "VOTING":
					return "fas fa-person-booth"
				case "FINISHED":
					return "fas fa-check-circle"
				default:
					return "far fa-vote-yea"
			}
		},

		/** 
		 * How many days are left for vorting?
		 * Always return at least "1" day, until poll is in VOTING.
		 */
		daysLeft(poll) {
			if (poll.votingEndAt && poll.status === "VOTING") {
				let end = dayjs(poll.votingEndAt)
				let diff = end.diff(dayjs(), "day")
				return diff > 0 ? diff : 1
			} else {
				return 0
			}

		},

		/**
		 * Called when the data of one or all polls was updated or reloaded from the backend
		 * Force a refresh of computed values to update the view.
		 */
		pollsChanged() {
			console.log("pollsChanged")
			this.forceRefreshComputed++
		},

		goToPoll(pollId) {
			this.$router.push("/polls/" + pollId)
		},

		gotoCreatePoll() {
			this.$router.push("/polls/create")
		},

		/** Try to flexibly match as much as possible. Case insesitive */
		matchesSearch(poll) {
			if (!this.searchQuery || this.searchQuery.trim === "") return true
			let Q = this.searchQuery.trim().toUpperCase()
			if (poll.title && poll.title.toUpperCase().includes(Q)) return true
			if (poll.proposals) {
				poll.proposals.forEach((prop) => {
					if (prop.title.toUpperCase().includes(Q)) return true
					if (prop.description.toUpperCase().includes(Q)) return true
					if (prop.createdBy.name.toUpperCase().includes(Q)) return true
					if (prop.createdBy.email.toUpperCase().includes(Q)) return true
				})
			}
			return false
		},

		clearSearchAndFilter() {
			console.log("Clear Search and PollFilter")
			this.searchQuery = undefined
			EventBus.emit(EventBus.Event.POLL_FILTER_CHANGED, undefined)
		}
	},
}
</script>

<style scoped lang="scss">
.poll-list {
	
}

.poll-panel-wrapper {
	display: grid;
	grid-template-rows: 1fr;
	transition: all 0.5s ease-out;
}
.poll-panel-inner {
	position: relative;
	cursor: pointer;
	overflow: hidden;

	&:first-child {
		.poll-col-2{
			border-top: 1px solid rgba(0,0,0, 0.1);
		}
	}
	.poll-icon-col {
		flex: 0 0 50px;  // do not grow or shrink, fixed width
		display: flex;
		align-items: center;
	}
	.poll-col-2 {
		//margin-right: 10px;
		padding: 1.5em 0;
		border-bottom: 1px solid rgba(0,0,0, 0.1);
	}
	.poll-col-3 {
		flex: 0 0 50px;
		text-align: right;
	}

	
	.poll-icon {
		color: white;
		background-color: $icon-bg;
		border-radius: 50%;
		//border: 1px solid $icon-bg;
		text-align: center;
		font-size: 20px;
		line-height: 31px;
		min-width: 32px;
		max-width: 32px;
		width: 32px;
		min-height: 32px;
		max-height: 32px;
		height: 32px;
	}
	.poll-title {
		color: $primary;
		//font-family: Helvetica, sans-serif;
		//font-size: 1.1rem !important;
		//font-weight: bold;
		//margin: 0;
	}
	.poll-footer {
		font-size: 80%;
		color: #bbb;
		i:not(:first-child) {
			margin-left: 10px;
		}
	}
	.show-poll-details {
		position: absolute;
		font-size: 1.2rem;
		top: 50%;
		transform: translateY(-50%);
		color: $primary;
		//opacity: 0.5;
		cursor: pointer
	}
}


.search-wrapper {
	margin: 30px 40px 0 40px;
	color: $secondary;
	position: relative;
	.search-icon {
		position: absolute;
		top: 0.6em;
		right: 0.5em;
		//transform: translateX(-150%);
	}
}

#emptySearchResultInfo {
	cursor: pointer;
}

/* Vue list transitions */

.poll-list-transition {
}

.poll-list-leave-to, .poll-list-enter-from {
	opacity: 0;
	grid-template-rows: 0fr;
	//height: 0 !important;
	//max-height: 0 !important;
	//margin-bottom: 0rem !important;
}
.poll-list-enter-active, .poll-list-leave-active {
	//border: 1px solid red;
}

#createPollInfo {
	margin-top: 8rem;
}

</style>