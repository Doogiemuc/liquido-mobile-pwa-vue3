<template>
	<div>
		<h1 id="polls-page" class="page-title">
			{{ $t('Polls') }}
		</h1>

		<!-- Search -->
		<div id="searchWrapper" class="search-wrapper mb-4" :class="showSearchClass">
			<input
				id="searchInput"
				class="form-control"
				v-model="searchQuery"
				type="text"
				:placeholder="$t('Search')"
			/>
			<i
				v-if="searchQuery"
				class="fas fa-times search-icon"
				@click="clearSearchAndFilter"
			/>
		</div>

		<!-- POLL SECTIONS -->
		<div id="poll-list-wrapper" class="mb-5">

			<div v-if="loading" class="text-center my-5">
				<div class="spinner-border text-secondary" role="status">
					<span class="visually-hidden">{{ $t('Loading') }}</span>
				</div>
			</div>

			<PollListSection
				v-for="section in activeSections"
				:key="section.status"
				:title="$t(section.title)"
				:polls="groupedPolls[section.status]"
				class="poll-section"
				@select="goToPoll"
			/>

		</div>

		<p
			v-if="polls.length === 0"
			class="text-center"
			v-html="$t('noPollYet')"
		/>

		<div
			v-if="polls.length > 0 && filteredCount === 0"
			class="text-center"
			@click="clearSearchAndFilter"
		>
			<p>{{ $t('noPollsMatchSearch') }}</p>
		</div>

		<div v-if="polls.length > 5" class="text-end mt-5">
			<button class="btn btn-sm btn-outline-secondary" @click="scrollToTop">
				<i class="fas fa-angle-up" />
			</button>
		</div>

		<div v-if="userIsAdmin" class="alert alert-admin mt-5">
			<p>{{ $t('onlyAdminCanCreateNewPolls') }}</p>
			<button id="createNewPollButton" class="btn btn-primary float-end" @click="gotoCreateNewPoll">
				{{ $t("createNewPoll") }}
			</button>
		</div>

		<polls-footer
			v-model="pollStatusFilter"
			@search-clicked="toggleSearch"
		/>
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useI18n } from 'vue-i18n'
import EventBus from "@/services/event-bus"
import api from "@/services/liquido-graphql-client"
import { store } from "@/services/store"
import PollsFooter from "@/components/polls-footer.vue"
import PollListSection from "@/components/poll-list-section.vue"
import { useRouter} from 'vue-router'
const router = useRouter()


const { t } = useI18n()


/* -----------------------
   STATE
----------------------- */

const showSearch = ref(false)
const searchQuery = ref("")
const pollStatusFilter = ref(api.POLL_STATUS.ALL_POLLS)

const polls = ref([])
const loading = ref(false)

/* -----------------------
   LIFECYCLE
----------------------- */

function syncPolls() {
	polls.value = api.getCachedPolls() || []
}

onMounted(() => {
	store.setHeaderTitle(t('Polls'))
	/*
	if (api.isAdmin()) {
		store.setHeaderRight('createNewPoll')
	}
	*/
	EventBus.on(EventBus.Event.POLL_LOADED, syncPolls)
	EventBus.on(EventBus.Event.POLLS_LOADED, syncPolls)
	
	syncPolls()
	if (polls.value.length === 0) loading.value = true
	api.getPolls().finally(() => { loading.value = false })

	scrollToTop()
})

/* -----------------------
   SEARCH
----------------------- */

function matchesSearch(poll) {
	if (!searchQuery.value?.trim()) return true

	const Q = searchQuery.value.trim().toUpperCase()

	if (poll.title?.toUpperCase().includes(Q)) return true

	if (poll.proposals) {
		for (const p of poll.proposals) {
			if (
				p.title?.toUpperCase().includes(Q) ||
				p.description?.toUpperCase().includes(Q) ||
				p.createdBy?.name?.toUpperCase().includes(Q) ||
				p.createdBy?.email?.toUpperCase().includes(Q)
			) {
				return true
			}
		}
	}

	return false
}

/* -----------------------
   GROUPING
----------------------- */

const groupedPolls = computed(() => {
	const groups = {
		[api.POLL_STATUS.VOTING]: [],
		[api.POLL_STATUS.ELABORATION]: [],
		[api.POLL_STATUS.FINISHED]: []
	}

	for (const poll of polls.value) {
		if (pollStatusFilter.value && poll.status !== pollStatusFilter.value) continue
		if (!matchesSearch(poll)) continue
		groups[poll.status]?.push(poll)
	}

	/*
	//TODO: sort polls in voting by remaining days.  Sort others by dateCreated
	for (const key of Object.keys(groups)) {
		groups[key].sort((a, b) =>
			pollStatusOrder[a.status] - pollStatusOrder[b.status]
		)
	}
	*/

	return groups
})

const filteredCount = computed(() => {
	return Object.values(groupedPolls.value).flat().length
})

const sections = [
	{ status: api.POLL_STATUS.VOTING, title: "InVoting" },
	{ status: api.POLL_STATUS.ELABORATION, title: "New" },
	{ status: api.POLL_STATUS.FINISHED, title: "Finished" }
]

const activeSections = computed(() => {
	return sections /*.filter(
		s => (groupedPolls.value[s.status]?.length || 0) > 0 
	) */
})

/* -----------------------
   UI HELPERS
----------------------- */

const showSearchClass = computed(() =>
	showSearch.value ? "" : "search-hidden"
)

const userIsAdmin = computed(() =>
	api.isAdmin()
)

/* -----------------------
   ACTIONS
----------------------- */

function toggleSearch() {
	searchQuery.value = ""
	showSearch.value = !showSearch.value
}

function clearSearchAndFilter() {
	searchQuery.value = ""
	pollStatusFilter.value = undefined
}

function goToPoll(id) {
	// keep compatibility with event payload
	const pollId = typeof id === "object" ? id?.id : id
	const poll = api.getCachedPolls().find(p => p.id == pollId)
	if (poll?.status === "FINISHED") {
		router.push({ name: "pollWinner", params: { pollId } })
	} else {
		router.push({ name: "showPoll", params: { pollId } })
	}
}

function gotoCreateNewPoll() {
	router.push({ name: "createPoll" })
}

function scrollToTop() {
	// no this.$root in VUE's new composition API
	//TODO: create a "composable", ie. a standard imported module, for all the util functions in root-app.vue
	document.getElementById("app").scrollTop = 0
}
</script>

<style>
.search-wrapper {
	position: relative;
	max-height: 4rem;
	transition: all 0.4s ease;
	overflow: hidden;
}

.search-hidden {
	max-height: 0;
	opacity: 0;
	margin: 0 2rem;
}

#emptySearchResultInfo {
	cursor: pointer;
}

.poll-section {
	margin-bottom: 1rem;
	&.empty {
		margin-bottom: 0;
	}
}

.alert-admin {
	margin-top: 2rem;
}
</style>