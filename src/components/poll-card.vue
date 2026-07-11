<template>
	<div class="poll-card card border-opacity-25" :data-poll-status="poll.status">
		<div class="card-body d-flex flex-nowrap" :class="{ clickable: !showProposals }" @click="$emit('click', poll.id)">
			<div class="flex-grow-1 d-flex flex-column justify-content-between">
				<div class="poll-eyebrow">
					<span v-if="poll.status === 'ELABORATION'" class="badge rounded-pill poll-status-pill elaboration-pill">{{ $t('New') }}</span>
					<span v-if="poll.status === 'VOTING'" class="badge rounded-pill poll-status-pill in-voting-pill">
						<i class="fas fa-circle"></i>&nbsp;{{ $t('InVoting') }}
					</span>
					<span v-if="poll.status === 'FINISHED'" class="badge rounded-pill poll-status-pill finished-pill">{{ $t('Finished') }}</span>
					<span v-if="poll.status === 'FINISHED'" class="float-end">{{ votingEndAtDateLoc }}</span>
				</div>
				<h2 class="poll-title">{{ poll.title }}</h2>
				<div class="poll-footer">
					
					<div v-if="poll.status === 'ELABORATION'">
						{{ $tc('numProposals', poll.proposals?.length || 0)}}&nbsp;&middot;&nbsp;{{ $t('awaitingStart') }} 
					</div>
					<div v-if="poll.status === 'VOTING'">
						<!-- i class="fas fa-person-booth"></i>&nbsp; -->
						{{ $tc('votes', poll.numBallots || 0) }}&nbsp;&middot;&nbsp;{{ $t('endsIn') }}&nbsp;{{ timeLeft }}
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

		<!-- List of proposals, only shown in detail view (e.g. on the poll-show page) -->
		<ul v-if="showProposals && poll.proposals && poll.proposals.length > 0" class="list-group list-group-flush proposal-list">
			<li v-for="prop in sortedProposals" :key="prop.id"
				class="list-group-item proposal-list-group-item"
				:class="proposalListGroupItemClasses(prop.id)">
				<div class="proposal-icon">
					<i class="fas fa-fw" :class="'fa-' + prop.icon"></i>
				</div>
				<div class="proposal-body flex-grow-1">
					<h3 class="proposal-title">{{ prop.title }}</h3>
					<div class="proposal-description" v-html="prop.description"></div>
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
						<span class="createdby-user">
							{{ $t('createdBy') }}&nbsp;{{ prop.createdBy.name }}
						</span>
					</div>
					
				</div>
			</li>
		</ul>
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
	emits: ["click"],
	i18n: {
		messages: {
			de: {
				// Poll related translations (zero|singular|plural style)
				numProposals: "0 Vorschläge | 1 Vorschlag | {n} Vorschläge",
				votes: "Noch keine Stimmen | 1 Stimme abgegeben | {n} Stimmen abgegeben",
				daysLeft: "Beendet | noch ein Tag | noch {n} Tage",
				endsIn: "endet",
				awaitingStart: "wird bald gestartet",
				createdBy: "von"
			},
			en: {
				// Poll related translations (singular|dual|plural style)
				numProposals: "No proposals | 1 proposal | {n} proposals",
				votes: "0 votes | 1 vote | {n} votes",
				daysLeft: "Voting finished | 1 day left | {n} days left",
				endsIn: "ends",
				awaitingStart: "awaiting start",
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
		}
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
	--proposal-height: 10rem;		 /* Each proposal has the same height. */
}


.poll-card {
	/* --iconSize: 40px;   polls had an icon long ago. Just yet another thing we simplified, although it hurts at first */
	height: 100%;
	border-radius: var(--liquido-border-radius);
	border-color: rgba(0, 0, 0, 0.1);
	
	.card-body {
		padding: var(--unit);
		height: var(--poll-card-height);   /* This is crucial for list animations to work correctly. The card must have a fixed height, otherwise the animation will be jumpy. */
		
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
	font-size: var(--font-size-small);
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
	font-size: var(---font-size-small);
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


.in-voting-pill .fa-circle {
	animation: in-voting-circle-pulse 2s linear infinite;
}

@keyframes in-voting-circle-pulse {
	0%, 100% {
		color: var(--state-voting);
		filter: opacity(0.2);
		transform: scale(0.5);
	}

	50% {
		filter: opacity(1.0);
		transform: scale(0.8);
	}
}

/* List of proposals shown at the bottom of the card (only when showProposals is true) */
.poll-card .proposal-list {
	border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.poll-card .proposal-list-group-item {
	display: flex;
	align-items: stretch;   /* let .proposal-body stretch to the full, fixed row height */
	gap: 0.75rem;
	padding: var(--unit);
	height: var(--proposal-height);
	max-height: var(--proposal-height);
	overflow: hidden;
}

/* The proposal icon, centered in a fixed-width column on the left */
.poll-card .proposal-icon {
	flex: 0 0 auto;
	align-self: center;   /* vertically center the icon within the fixed-height row */
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
	margin: 0 0 0.5rem 0;
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
	margin-top: 0.5rem;
}

.poll-card .proposal-subtitle .like-button {
	padding: 1px 6px;
	border-radius: 5px;
}

.poll-card .proposal-subtitle .can-like {
	cursor: pointer;
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
	flex: 1 1 auto;    /* take the remaining height between the title and the subtitle */
	min-height: 0;     /* allow it to shrink below its content height so it can be clipped */
	font-size: var(--font-size-small);
	color: var(--text-color);
	overflow: hidden;  /* truncate longer descriptions so every proposal stays the same height */
}

/* FINISHED poll: highlight the winner, dim the losers */
.poll-card .proposal-list-group-item.winner {
	background-color: var(--bs-success-bg-subtle);
}

.poll-card .proposal-list-group-item.lost,
.poll-card .proposal-list-group-item.lost .proposal-title,
.poll-card .proposal-list-group-item.lost .proposal-description {
	color: lightgray;
}
</style>
