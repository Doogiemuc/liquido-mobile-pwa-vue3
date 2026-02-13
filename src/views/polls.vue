<template>
	<div>
		<div id="pollsPage" class="d-flex justify-content-between align-items-center">
			<div>&nbsp;</div>
			<h1 class="page-title flex-grow-1">
				{{ pageTitleLoc }}
			</h1>
		</div>

		<div v-if="loading" class="my-3">
			<div class="spinner-border spinner-border-sm" role="status">{{ $t('Loading') }}</div>
		</div>

		<!-- Search -->
		<div v-if="showSearch" id="searchWrapper" class="search-wrapper">
			<input id="searchInput" class="form-control border-0" v-model="searchQuery" type="text" :placeholder="$t('Search')">
			<i v-if="searchQuery !== ''" class="fas fa-times search-icon" @click="clearSearchAndFilter"></i>
		</div>

		<!-- list of polls -->
		<div v-if="!loading" id="poll-list-wrapper" class="mb-5">

			<transition-group name="poll-list" id="poll-list" tag="div">
				<div v-for="poll in filteredPolls" :key="poll.id" class="poll-card-wrapper">
					<div class="poll-card card border-0" @click="goToPoll(poll.id)">
						<div class="card-body d-flex flex-nowrap align-items-center">
							<div class="flex-grow-0">
								<div v-if="poll.status === 'ELABORATION'" class="poll-icon-elaboration">
									<i class="far fa-comments" />
								</div>
								<div v-if="poll.status === 'VOTING'" class="poll-icon-voting">
									<i class="fas fa-person-booth" />
								</div>
								<div v-if="poll.status === 'FINISHED'" class="poll-icon-finished">
									<i class="fas fa-check-circle" />
								</div>

							</div>
							<div class="flex-grow-1">
								<h2 class="poll-title">{{ poll.title }}</h2>
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
							</div>
							<div class="flex-grow-0">
								<i class="fas fa-angle-right text-primary"></i>
							</div>
						</div>
					</div>
				</div>

			</transition-group>

			<p v-if="allPolls.length === 0 && !loading" class="text-center" v-html="$t('noPollYet')" />

			<div v-if="filteredPolls.length == 0 && allPolls.length > 0" id="emptySearchResultInfo" class="text-center" @click="clearSearchAndFilter">
				<p>{{ $t('noPollsMatchSearch') }}</p>
			</div>

		</div>
		
		<div v-if="$root.pollStatusFilter === 'ELABORATION'" class="liquido-info">
			<p v-if="hasPollInElaboration" v-html="$t('pollsInElaborationInfo')" />
			<p v-else v-html="$t('noPollsInElaboration')" />
			<p v-if="!hasPollInElaboration && hasPollInVoting" v-html="$t('butPollInVoting')" />
		</div>

		<div v-if="$root.pollStatusFilter === 'VOTING'" class="liquido-info">
			<p v-if="hasPollInVoting" v-html="$t('pollsInVotingInfo')" />
			<p v-else v-html="$t('noPollsInVoting')" />
			<p v-if="!hasPollInVoting && hasPollInElaboration" v-html="$t('butProposalsInDiscussion')" />
		</div>

		<div v-if="$root.pollStatusFilter === 'FINISHED'" class="liquido-info">
			<p v-if="hasFinishedPoll" v-html="$t('finishedPollsInfo')" />
			<p v-else v-html="$t('noFinishedPolls')" />
			<p v-if="!hasFinishedPoll && hasPollInVoting" v-html="$t('butPollInVoting')" />
		</div>
	
		<div v-if="filteredPolls.length > 5" class="text-end mt-5">
			<button id="scrollToTopButton" class="btn btn-secondary" @click="$root.scrollToTop">
				<i class="fas fa-angle-up" />
			</button>
		</div>

		<div v-if="userIsAdmin" id="createPollInfo" class="alert alert-admin mt-5">
			<p>
				{{ $t('onlyAdminCanCreateNewPolls') }}
			</p>
			<button id="createPollButton" class="btn btn-primary float-end" @click="gotoCreatePoll()">
				<i class="fas fa-shield-alt" /> {{ $t("createPoll") }} <i class="fas fa-angle-double-right" />
			</button>
		</div>

	</div>
</template>

<script>
/**
 * This is by far the most important view in the whole app.
 * Meanwhile I redesigned this page dozens of times ... and yet it's not perfect :-)
 * But it's getting better and better everytime! :-)
 */

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
					"<p>Diese Abstimmungen sind neu und werden gerade noch debatiert. Weitere Wahlvorschläge können noch hinzugefügt werden.</p>" +
					"<p>Sobald euer Admin eine Wahl startet, kannst du sicher und anonym deine Stimme abgeben.</p>",
				pollsInVotingInfo: "Diesen Abstimmungen laufen jetzt gerade. Wähle eine und gib deine Stimme ab.",
				finishedPollsInfo: "Diese Abstimmungen sind beendet.",
				finished: "abgeschlossen",
				noPollYet: "Euer Admin hat bisher noch keine Abstimmung erstellt.",
				noPollsMatchSearch: "",
				noPollsInElaboration: "Aktuell gibt es gerade keine Abstimmungen mit Wahlvorschläge die noch diskutiert werden können.",
				noPollsInVoting: "Es läuft gerade keine Abstimmungen, in der du deine Stimmen abgegeben könntest.",
				noFinishedPolls: "In eurem Team gibt es bisher noch keine abgeschlossenen Abstimmungen.",
				butProposalsInDiscussion: "Es gibt jedoch Abstimmungen in Diskussion. Dort könnt ihr die Wahlvorschlägen diskutieren.",
				butPollInVoting: "Es gibt jedoch eine <b>laufende Abstimmung</b> in der du deine Stimme abgeben kannst.",
				onlyAdminCanCreateNewPolls: "Nur du als Admin dieses Teams kannst neue Abstimmungen erstellen. " +
					"Jedes Teammitglied kann dann seinen Vorschlag zur Abstimmung hinzufügen.",
				createPoll: "Neue Abstimmung anlegen",
				votes: "0 Stimmen | 1 Stimme | {n} Stimmen",
				daysLeft: "Wahl Abgeschlossen | ein Tag noch | noch {n} Tage",
				numProposals: "Noch keine Vorschläge | ein Vorschlag | {n} Vorschläge",
			},
		},
	},
	name: "PollsList",
	components: { },
	data() {
		return {
			loading: true,
			showSearch: false,
			searchQuery: "",
			forceRefreshComputed: 0,
		}
	},

	computed: {
		pageTitleLoc() {
			switch (this.$root.pollStatusFilter) {
				case api.POLL_STATUS.ELABORATION:
					return this.$t("pollsInElaboration")
				case api.POLL_STATUS.VOTING:
					return this.$t("pollsInVoting")
				case api.POLL_STATUS.FINISHED:
					return this.$t("finishedPolls")
				default:
					return this.$t("YourPolls")
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
			let polls = api.getCachedPolls()
			return polls
				.filter((poll) => {
					if (this.$root.pollStatusFilter && poll.status !== this.$root.pollStatusFilter) return false
					return this.matchesSearch(poll)
				})
				.sort((p1,p2) => {
					//TODO: make it possible to sort polls by status, date created, ...
					return pollStatusOrder[p1.status] - pollStatusOrder[p2.status]
				})    
				
		},
		searchResultIsEmpty() {
			return this.allPolls.length > 0 && this.filteredPolls.length === 0 /* && this.searchQuery && this.searchQuery.trim().length > 0 */
		},
		hasPollInElaboration() {
			return api.getCachedPolls().filter(p => p.status === "ELABORATION").length
		},
		hasPollInVoting() {
			return api.getCachedPolls().filter(p => p.status === "VOTING").length
		},
		hasFinishedPoll() {
			return api.getCachedPolls().filter(p => p.status === "FINISHED").length
		}
	},
	
	created() {
		// When one or all polls change, the reflect the changes in the UI.
		EventBus.on(EventBus.Event.POLL_LOADED, () => this.pollsChanged())
		EventBus.on(EventBus.Event.POLLS_LOADED, () => this.pollsChanged())  // event param "polls" is not used here

		this.loading = false
		//We don't need to load polls here. They were already loaded at login.		
		//MAYBE: refresh on pull-down
	},
	
	mounted() {
		this.$store.setHeaderTitle(this.pageTitleLoc)
		this.$store.setHeaderBackTarget({name: "team"})
	},
	
	methods: {

		toggleSearch() {
			this.showSearch = !this.showSearch
		},

		/** Each poll has an icon, depending on its status */
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
		
		/** And the icons have different colors */
		pollIconClass(poll) {
			if (!poll) return undefined
			switch (poll.status) {
				case "ELABORATION":
					return "poll-icon-elaboration"
				case "VOTING":
					return "poll-icon-voting"
				case "FINISHED":
					return "poll-icon-finished"
				default:
					return undefined
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
			this.$router.push( {name: "showPoll", params: { pollId: pollId } })
		},

		gotoCreatePoll() {
			this.$router.push({ name: "createPoll" })
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
			this.$root.pollStatusFilter = undefined
		},

		// Transition Height - is ... again ... complex
		// https://stackoverflow.com/questions/3508605/how-can-i-transition-height-0-to-height-auto-using-css/30531678#30531678


		// VUE Stagering List transition
		// https://vuejs.org/guide/built-ins/transition-group.html#staggering-list-transitions

/*
		onBeforeEnter(el) {
      el.style.opacity = 0
      el.style.height = 0
    },
    onEnter(el, done) {
      gsap.to(el, {
        opacity: 1,
        height: '1.6em',
        delay: el.dataset.index * 0.15,
        onComplete: done
      })
    },
    onLeave(el, done) {
      gsap.to(el, {
        opacity: 0,
        height: 0,
        delay: el.dataset.index * 0.15,
        onComplete: done
      })
    }
*/


	},
}
</script>

<style>


/** MUST SET THE height TO A FIXED VALUE, for animating it. */
.poll-card-wrapper {
	height: 7rem;
	margin-bottom: 10px;
	overflow: hidden;
	transition: all 0.5s;
}

.poll-card {
	--iconSize: 40px;
	
	cursor: pointer;
	height: 100% !important;  /* bootstrap .card sets a height that we need to overwrite */
	border-radius: var(--liquido-border-radius);

	.card-body {
		padding: 0 10px;
	}
	
	.poll-icon-elaboration, .poll-icon-voting {
		color: white;
		background-color: var(--proposal-icon-bg);
		border-radius: 50%;
		text-align: center;
		font-size: var(--iconSize) * 0.5;
		line-height: var(--iconSize);
		min-width: var(--iconSize);
		max-width: var(--iconSize);
		width: var(--iconSize);
		min-height: var(--iconSize);
		max-height: var(--iconSize);
		height: var(--iconSize);
		margin: 0 10px 0 0;
	}

	.poll-icon-elaboration {
		background-color: lightgray;
	}

	.poll-icon-finished {
		font-size: var(--iconSize);
		color: var(--primary);
		filter: brightness(50%);
		margin: 0 10px 0 0;
	}

	.poll-title {
		color: black;    /* poll-titles are black, proposal titles are --primary! */
		font-size: 1.2rem !important;  /* a bit smaller than normal h2 */
		display: -webkit-box;
		-webkit-line-clamp: 2;  /* max 2 lines */
		-webkit-box-orient: vertical;
		overflow: hidden;
		
	}

	.poll-footer {
		font-size: 80%;
		color: #bbb;
		i:not(:first-child) {
			margin-left: 10px;
		}
	}
}

.search-wrapper {
	margin: 0px 40px 30px 40px;
	position: relative;
	overflow: hidden;
	.search-icon {
		color: var(--primary);
		position: absolute;
		top: 50%;
		right: 0.5em;
		transform: translateY(-50%);
	}
}

#emptySearchResultInfo {
	cursor: pointer;
}


/* Vue list transitions */
.poll-list-leave-to,
.poll-list-enter-from {
	opacity: 0;
	transform: scaleY(0);
	height: 0;
	margin: 0;
	padding: 0;
}
.poll-list-enter-active, .poll-list-leave-active .poll-card {
	opacity: 0.5;
}

</style>