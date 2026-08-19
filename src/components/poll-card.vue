<template>
	<div class="poll-card card border-opacity-25" :data-poll-status="poll.status" :data-poll-id="poll.id">
		<div class="card-body d-flex flex-nowrap" :class="{ clickable: !showProposals }" @click="$emit('click', poll.id)">
			<div class="flex-grow-1 d-flex flex-column justify-content-between">
				<div class="poll-eyebrow">
					<div class="poll-pill-group">
						<span v-if="poll.status === 'ELABORATION'" class="badge rounded-pill poll-status-pill elaboration-pill">{{ $t('New') }}</span>
						<span v-if="poll.status === 'VOTING'" class="badge rounded-pill poll-status-pill in-voting-pill">
							<i class="fas fa-circle"></i>&nbsp;{{ $t('InVoting') }}
						</span>
						<span v-if="poll.status === 'VOTING' && poll.userAlreadyVoted" class="badge rounded-pill poll-status-pill voted-chip" :title="$t('votes', 1)">
							<i class="fas fa-check"></i>&nbsp;{{ $t('voted') }}
						</span>
						<span v-if="poll.status === 'FINISHED'" class="badge rounded-pill poll-status-pill finished-pill">{{ $t('Finished') }}</span>
						<span v-if="poll.status === 'FINISHED'" class="poll-finished-date">{{ votingEndAtDateLoc }}</span>
					</div>
					<div class="num-proposals">
						<i class="far fa-lightbulb"></i>&nbsp;{{ poll?.proposals.length }}
					</div>
				</div>
				<h2 class="poll-title">{{ poll.title }}</h2>
				<div class="poll-footer">
					<div v-if="poll.status === 'ELABORATION'" class="d-flex justify-content-between">
						<span>{{ $tc('numProposals', poll.proposals?.length || 0)}}</span>
						<span>{{ $t('awaitingStart') }}</span>
					</div>
					<div v-if="poll.status === 'VOTING'" class="d-flex justify-content-between">
						<!-- i class="fas fa-person-booth"></i>&nbsp; -->
						<span>{{ $tc('votes', poll.numBallots || 0) }}</span>
						<span>{{ $t('endsIn') }}&nbsp;{{ timeLeft }}</span>
					</div>
					<div v-if="poll.status === 'FINISHED'">
						<i class="fas fa-trophy"></i>&nbsp;{{ poll?.winner?.title }}
					</div>
					<div v-if="poll.status === 'VOTING'" class="poll-progress-bar">
						<div class="poll-progress-bar-inner" :style="progressBarWidth"></div>
					</div>
				</div>
			</div>
			<div v-if="showArrowRight" class="flex-grow-0 align-self-center ms-1">
				<i class="fas fa-angle-right"></i>
			</div>
		</div>

		<!-- Toggle bar: only shown in detail view when proposals are available -->
		<button v-if="showProposals && poll.proposals && poll.proposals.length > 0"
			class="proposals-toggle-bar"
			:aria-expanded="isExpanded"
			@click.stop="isExpanded = !isExpanded">
			<i class="fas" :class="isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
		</button>

		<!-- List of proposals, only shown in detail view (e.g. on the poll-show page) -->
		<div v-if="showProposals && poll.proposals && poll.proposals.length > 0"
			class="proposal-list-wrapper"
			:style="proposalListWrapperStyle">
		<ul class="list-group list-group-flush proposal-list">
			<li v-for="prop in sortedProposals" :key="prop.id"
				class="list-group-item proposal-list-group-item"
				:data-proposal-id="prop.id"
				:class="proposalListGroupItemClasses(prop.id)">
				<div class="proposal-icon">
					<i class="fas fa-fw" :class="'fa-' + prop.icon"></i>
				</div>
				<div class="proposal-body flex-grow-1">
					<h3 class="proposal-title">{{ prop.title }}</h3>
					
					<div class="proposal-subtitle">
						<span v-if="prop.likedByCurrentUser" class="like-button liked">
							<i class="fas fa-heart"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
						</span>
						<span v-else-if="canLike(prop)" class="like-button can-like" @click.stop="clickLike(poll.id, prop)">
							<i class="far fa-heart"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
						</span>
						<span v-else class="like-button">
							<i class="far fa-heart"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
						</span>
						<span v-if="canEditProposal(prop)" class="edit-button" :title="$t('editProposal')"
							@click.stop="$emit('edit-proposal', prop.id)">
							<i class="fas fa-pencil-alt"></i>
						</span>
						<span class="createdby-user">
							{{ $t('createdBy') }}&nbsp;{{ prop.createdBy.name }}
						</span>
					</div>

					<div class="proposal-description">{{ prop.description }}</div>
					
				</div>
			</li>
		</ul>
		</div>
	</div>
</template>

<script>
import api from "@/services/liquido-graphql-client.js"
import dayjs from "dayjs"
import 'dayjs/locale/de'
//import 'dayjs/locale/en'
import localizedFormat from "dayjs/plugin/localizedFormat"
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(localizedFormat) // https://day.js.org/docs/en/plugin/localized-format
dayjs.extend(relativeTime)    // for flexible display of relative distance to a point in time in the future (votingEndsAt)
dayjs.locale('de')

export default {
	name: "PollCard",
	emits: ["click", "edit-proposal"],
	i18n: {
		messages: {
			de: {
				// Poll related translations (zero|singular|plural style)
				numProposals: "0 Vorschläge | 1 Vorschlag | {n} Vorschläge",
				votes: "Noch keine Stimmen | 1 Stimme abgegeben | {n} Stimmen abgegeben",
				daysLeft: "Beendet | noch ein Tag | noch {n} Tage",
				endsIn: "endet",
				awaitingStart: "wird bald gestartet",
				voted: "abgestimmt",
				createdBy: "von",
				editProposal: "Deinen Vorschlag bearbeiten"
			},
			en: {
				// Poll related translations (singular|dual|plural style)
				numProposals: "No proposals | 1 proposal | {n} proposals",
				votes: "0 votes | 1 vote | {n} votes",
				daysLeft: "Voting finished | 1 day left | {n} days left",
				endsIn: "ends",
				awaitingStart: "awaiting start",
				voted: "voted",
				createdBy: "by"
			}
		}
	},
	props: {
		poll: {
			type: Object,
			required: true,
		},
		numVoters: {			// When passed, shows  "3/24 votes"
			type: Number,
			required: false
		},
		showArrowRight: {		// Show the chevron arrow on the right side of the card (e.g. in the polls list)
			type: Boolean,
			default: true
		},
		showProposals: {		// When true, the poll's list of proposals is shown below the summary (e.g. on the poll-show page)
			type: Boolean,
			default: false
		},
		proposalsExpanded: {	// Initial expanded/collapsed state of the proposal list (only relevant when showProposals is true)
			type: Boolean,
			default: false
		}

	},
	data() {
		return {
			isExpanded: this.proposalsExpanded,
		}
	},
	computed: {
		votingEndAtDateLoc() {
			return dayjs(this.poll.votingEndAt).format("L")
		},
		timeLeft() {
			if (this.poll?.votingEndAt && this.poll?.status === "VOTING") {
				let end = dayjs(this.poll.votingEndAt)
				if (dayjs().isAfter(end)) {
					return ""  // this should not happen
				}
				return end.fromNow()  // e.g. "in 5 days" https://day.js.org/docs/en/display/from-now#list-of-breakdown-range
			} 
			return ""  // BUGFIX must not return undefined
		},
		/** Calculate the percentage of the time between votingStartAt and votingEndAt that has already elapsed. */
		progressBarWidth() {
			let start = dayjs(this.poll.votingStartAt)
			let end   = dayjs(this.poll.votingEndAt)
			let durationMs = end.diff(start)       // mind order
			let elapsedMs  = dayjs().diff(start)
			let widthPercent = elapsedMs / durationMs * 100
			widthPercent = Math.min(100, Math.max(0, widthPercent))  // clamp between 0..100
			return { "width": widthPercent+"%" };
		},
		/**
		 * Proposals sorted by their creation date.
		 * This keeps the order stable, e.g. it does not change when a user likes a proposal
		 * and the poll is then reloaded from the backend.
		 */
		sortedProposals() {
			if (!this.poll || !this.poll.proposals) return []
			return this.poll.proposals.toSorted((p1, p2) => p1.createdAt.localeCompare(p2.createdAt))
		},
		/** Controls the height transition of the proposal list wrapper. */
		proposalListWrapperStyle() {
			const n = this.poll.proposals?.length || 0
			return {
				maxHeight: this.isExpanded ? `calc(${n} * var(--proposal-height))` : '0px',
				overflow: 'hidden',
				transition: 'max-height 0.35s ease',
			}
		},
	},
	methods: {
		/** CSS classes for a proposal list item, highlighting the winner/losers of a FINISHED poll. */
		proposalListGroupItemClasses(propId) {
			let isWinner = this.poll.winner && propId === this.poll.winner.id
			return {
				"winner": this.poll.status === "FINISHED" && isWinner,
				"lost": this.poll.status === "FINISHED" && !isWinner,
			}
		},
		isCreatedByCurrentUser(prop) {
			let currentUser = api.getCachedUser() || {}
			return prop.createdBy.id === currentUser.id
		},
		/**
		 * A proposal can be liked, when it is in ELABORATION,
		 * it is not already liked, nor created by the currently logged in user.
		 */
		canLike(prop) {
			return prop.status === "ELABORATION" && !prop.likedByCurrentUser && !this.isCreatedByCurrentUser(prop)
		},
		clickLike(pollId, prop) {
			if (this.canLike(prop)) api.likeProposal(pollId, prop.id)
		},
		/**
		 * You may edit your OWN proposal, and only as long as the poll has not started.
		 * Same rule as the backend enforces in PollService.updateProposalInPoll - there is
		 * deliberately no admin override: rewriting someone else's words is a trust problem.
		 */
		canEditProposal(prop) {
			return this.poll.status === "ELABORATION" && this.isCreatedByCurrentUser(prop)
		}
	},
}
</script>

<style scoped>


/* Component-local sizing variables. They must live on .poll-card (the component root), NOT on
   :root — Vue scoped styles rewrite ":root" to ":root[data-v-xxx]", which never matches <html>,
   so the variables would be undefined and the fixed heights would silently break. */
.poll-card {
	--poll-card-height: 10rem;   /* This is crucial for list animations to work correctly. The card must have a fixed height, otherwise the animation will be jumpy. */
	--proposal-height: 10rem;	   /* Each proposal has the same height. These 10rem lead to exactly four lines of description. */
}


.poll-card {
	/* --iconSize: 40px;   polls had an icon long ago. Just yet another thing we simplified, although it hurts at first */
	height: 100%;
	border-radius: var(--liquido-border-radius);
	border-color: rgba(0, 0, 0, 0.1);
	
	.card-body {
		padding: var(--unit);
		height: var(--poll-card-height);   /* This is crucial for list animations to work correctly. The card must have a fixed height, otherwise the animation will be jumpy. */
		position: relative;   /* needed for absolute-positioned children if any */
		
		/* Only the upper summary part of the card navigates. Show the pointer only there (i.e. in the polls list). */
		&.clickable {
			cursor: pointer;
		}
	}

}

.poll-card .poll-eyebrow {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	font-size: var(--font-size-small);
}

.poll-pill-group {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	min-width: 0;
}

.poll-finished-date {
	white-space: nowrap;
}

.num-proposals {
	color: var(--secondary);
	font-size: 0.8rem;
}

.poll-card .poll-title {
	color: var(--text-color);
	/*font-size: 1rem !important;*/
	font-weight: normal;
	margin: 0;
	padding: 0;
	display: -webkit-box;
	line-clamp: 2;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.poll-card .poll-footer {
	font-size: 0.8rem; /* needs to be smaller than our standard  var(---font-size-small);  0.9rem */
	color: var(--secondary);
}

.poll-progress-bar {
	width: 100%;
	height: 4px;
	margin-top: 0.25rem;
	background-color: #eee;
	z-index: 100;
	border-radius: 999px;
	
	.poll-progress-bar-inner {
		width: 80%;
		height: 4px;
		background-color: var(--state-voting);
		z-index: 101;
		border-radius: 999px;
	}
}

/*********** Rounded pills for poll status *****************/
/* Moved to src/styles/liquido.css - poll-create.vue uses the same pills, and this <style> block
   is scoped, so they never reached it. Do not re-add them here. */

/* Toggle bar between the summary and the proposal list */
.proposals-toggle-bar {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	width: 100%;
	padding: 0.35rem 0.75rem;
	cursor: pointer;
	background: none;
	border: none;
	border-top: 1px solid rgba(0, 0, 0, 0.08);
	color: var(--secondary);
	font-size: 0.8rem;
}

.proposals-toggle-bar:hover {
	color: var(--primary);
}

/* List of proposals shown at the bottom of the card (only when showProposals is true) */
.poll-card .proposal-list-group-item {
	display: flex;
	align-items: stretch;   /* let .proposal-body stretch to the full, fixed row height */
	gap: var(--unit);				/* gap between icon and (title, subtitle) */
	/*padding: var(--unit);  we use bootstrap default padding */
	border: none;
	height: var(--proposal-height);
	max-height: var(--proposal-height);
	overflow: hidden;
	&:not(:last-child) {
		content: "<div class='proposal-list-group-item-divider'></div>";
	}
}

/* The proposal icon, centered in a fixed-width column on the left */
.poll-card .proposal-icon {
	flex: 0 0 auto;
	margin: 0.5rem 0 0 0;   /* vertically centered left of proposal title and subtitle */
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 50%;
	background-color: var(--proposal-icon-bg);
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.4rem;
}

/* The right side: title, description and subtitle share the same left indentation.
   A flex column so the description can flex to fill the remaining height and truncate,
   while the title and subtitle keep their natural height and the subtitle stays visible. */
.poll-card .proposal-body {
	display: flex;
	flex-direction: column;
	height: 100%;   /* fill the fixed row height */
	min-width: 0;   /* allow the title's text-overflow: ellipsis to work inside the flex row */
}

.poll-card .proposal-title {
	flex: 0 0 auto;   /* one line high; never shrink */
	color: var(--primary);
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.poll-card .proposal-subtitle {
	flex: 0 0 auto;   /* keep the likes/creator line fully visible; never shrink */
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: var(--font-size-small);
	color: var(--secondary);
	margin: 0;
}

.poll-card .proposal-subtitle .like-button {
	padding: 1px 10px 1px 0;   /* little bit bigger click are */
	border-radius: 5px;
}

.poll-card .proposal-subtitle .can-like {
	cursor: pointer;
}

/* Pencil sits next to the like button; the author's name stays pushed to the right,
   which space-between alone would no longer do with three children. */
.poll-card .proposal-subtitle .edit-button {
	padding: 1px 6px;
	border-radius: 5px;
	cursor: pointer;
}

.poll-card .proposal-subtitle .edit-button:hover {
	color: var(--primary);
}

.poll-card .proposal-subtitle .createdby-user {
	margin-left: auto;
}

.poll-card .proposal-subtitle .can-like:hover {
	color: var(--primary);
	border-color: var(--primary);
}

.poll-card .proposal-subtitle .liked {
	/*border: 1px solid #bbb;
	background-color: #bbb;*/
	color: var(--primary);
	cursor: default;
}

.poll-card .proposal-description {
	flex: 1 1 auto;    /* take the remaining height */
	margin-top: 0.25rem;
	min-height: 0;     /* allow it to shrink below its content height so it can be clipped */
	font-size: var(--font-size-small);
	color: var(--secondary);
	overflow: hidden;  /* truncate longer descriptions so every proposal stays the same height */
}

/* FINISHED poll: highlight the winner, dim the losers */
.poll-card .proposal-list-group-item.winner {
	background-color: var(--bs-success-bg-subtle);
}

.poll-card .proposal-list-group-item.lost,
.poll-card .proposal-list-group-item.lost .proposal-title,
.poll-card .proposal-list-group-item.lost .proposal-description,
.poll-card .proposal-list-group-item.lost .proposal-subtitle {

	color: lightgray;
}
</style>
