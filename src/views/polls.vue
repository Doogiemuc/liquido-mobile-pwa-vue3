<template>
	<div>
		<liquido-header ref="liquido-header"></liquido-header>
		<h1 id="polls-page" class="page-title">
			{{ pageTitleLoc }}
		</h1>

		<div v-if="loading" class="my-3">
			<div class="spinner-border spinner-border-sm" role="status">{{ $t('Loading') }}</div>
		</div>

		<!-- Search -->
		<div id="searchWrapper" class="search-wrapper" :class="showSearchClass">
			<input id="searchInput" class="form-control border-0" v-model="searchQuery" type="text" :placeholder="$t('Search')">
			<i v-if="searchQuery !== ''" class="fas fa-times search-icon" @click="clearSearchAndFilter"></i>
		</div>

		<!-- list of polls -->
		<div v-if="!loading" id="poll-list-wrapper" class="mb-5">

			<transition-group name="poll-list" id="poll-list" tag="div">
				<div v-for="poll in filteredPolls" :key="poll.id" class="poll-card-wrapper mb-3">
					<poll-card class="shadow-sm" :poll="poll" @click="goToPoll" />
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

		<polls-footer v-model="pollStatusFilter" @search-clicked="toggleSearch"></polls-footer>

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
import pollsFooter from "@/components/polls-footer.vue"
import liquidoHeader from "@/components/liquido-header.vue"
import PollCard from "@/components/poll-card.vue"


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
					"<p>Diese Abstimmungen sind neu und werden gerade noch debatiert. Weitere Vorschläge können noch hinzugefügt werden.</p>" +
					"<p>Sobald euer Admin eine Wahl startet, kannst du sicher und anonym deine Stimme abgeben.</p>",
				pollsInVotingInfo: "Diesen Abstimmungen laufen jetzt gerade. Wähle eine und gib deine Stimme ab.",
				finishedPollsInfo: "Diese Abstimmungen sind beendet.",
				New: "Neu",    		// Neue Abstimmung "elaboratin", "debattiert", ...
				noPollYet: "Euer Admin hat bisher noch keine Abstimmung erstellt.",
				noPollsMatchSearch: "",
				noPollsInElaboration: "Aktuell gibt es gerade keine Abstimmungen mit Vorschläge die noch diskutiert werden können.",
				noPollsInVoting: "Es läuft gerade keine Abstimmungen, in der du deine Stimmen abgegeben könntest.",
				noFinishedPolls: "In eurem Team gibt es bisher noch keine abgeschlossenen Abstimmungen.",
				butProposalsInDiscussion: "Es gibt jedoch Abstimmungen in Diskussion. Dort könnt ihr die Vorschlägen diskutieren.",
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
	components: { liquidoHeader, pollsFooter, PollCard },
	data() {
		return {
			loading: true,
			showSearch: false,
			searchQuery: "",
			pollStatusFilter: api.POLL_STATUS.ALL_POLLS,
			forceRefreshComputed: 0,
		}
	},

	computed: {
		pageTitleLoc() {
			switch (this.pollStatusFilter) {
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
					if (this.pollStatusFilter && poll.status !== this.pollStatusFilter) return false
					return this.matchesSearch(poll)
				})
				.sort((p1,p2) => {
					//TODO: make it possible to sort polls by status, date created, ...
					return pollStatusOrder[p1.status] - pollStatusOrder[p2.status]
				})    
				
		},
		showSearchClass() {
			return this.showSearch ? "" : "search-hidden"
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
		this.searchQuery = undefined
		this.pollStatusFilter = undefined
		this.showSearch = false
	},
	
	methods: {
		toggleSearch() {
			this.searchQuery = undefined
			this.showSearch = !this.showSearch
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
			this.pollStatusFilter = undefined
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
	min-width: 80%;
	min-height: 7rem;
	overflow: visible; /* for shadow */
}

.search-wrapper {
	margin: 0 2rem 2rem 2rem;
	position: relative;
	max-height: 4rem;
	opacity: 1;
	transition: all 0.4s ease;
	overflow: hidden;
	
	.search-icon {
		color: var(--primary);
		position: absolute;
		top: 50%;
		right: 0.5em;
		transform: translateY(-50%);
		cursor: pointer;
	}
}

.search-hidden {
	max-height: 0;
	opacity: 0;
	margin: 0 2rem;
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