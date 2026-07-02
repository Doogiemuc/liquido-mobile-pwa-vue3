<template>
	<div class="poll-card card border-opacity-25" @click="$emit('click', poll.id)">
		<div class="card-body d-flex flex-nowrap">
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
	</div>
</template>

<script>
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
				awaitingStart: "wird bald gestartet"
			},
			en: {
				// Poll related translations (singular|dual|plural style)
				numProposals: "No proposals | 1 proposal | {n} proposals",
				votes: "0 votes | 1 vote | {n} votes",
				daysLeft: "Voting finished | 1 day left | {n} days left",
				endsIn: "ends",
				awaitingStart: "awaiting start"
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
		showArrowRight: {
			required: false,
			default: true
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
		}
	},
}
</script>

<style scoped>
.poll-card {
	/* --iconSize: 40px;   polls had an icon long ago. Just yet another thing we simplified, although it hurts at first */
	cursor: pointer;
	height: 100%;
	border-radius: var(--liquido-border-radius);
	border-color: rgba(0, 0, 0, 0.1);
	
	.card-body {
		padding: var(--unit);
	}

}

.poll-card .poll-eyebrow {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
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
	font-size: 0.7rem;
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
</style>
