<template>
	<div class="poll-card card" @click="$emit('click', poll.id)">
		<div class="card-body d-flex flex-nowrap align-items-center">
			<div class="flex-grow-1">
				<div class="poll-eyebrow">
					<span v-if="poll.status === 'ELABORATION'" class="badge rounded-pill elaboration-pill">{{ $t('New') }}</span>
					<span v-if="poll.status === 'VOTING'" class="badge rounded-pill voting-pill">{{ $t('InVoting') }}</span>
					<span v-if="poll.status === 'FINISHED'" class="badge rounded-pill finished-pill">{{ $t('Finished') }}</span>
					<span v-if="showDate" class="poll-created-date">{{ createdDate }}</span>
				</div>
				<h2 class="poll-title">{{ poll.title }}</h2>
				<div class="poll-footer">
					<div v-if="poll.status === 'ELABORATION'">
						<i class="far fa-lightbulb"></i>&nbsp;{{ $tc('numProposals', poll.proposals?.length || 0) }}
					</div>
					<div v-if="poll.status === 'VOTING'">
						<i class="fas fa-person-booth"></i>&nbsp;{{ $tc('votes', poll.numBallots || 0) }}
					</div>
					<div v-if="poll.status === 'FINISHED'">
						<i class="fas fa-check-circle"></i>&nbsp;{{ $t('finished') }}
					</div>

					<div v-if="poll.status === 'VOTING'"><i class="far fa-clock"></i>&nbsp;{{ $tc('daysLeft', daysLeft) }}</div>
				</div>
			</div>
			<div class="flex-grow-0">
				<i class="fas fa-angle-right text-primary"></i>
			</div>
		</div>
	</div>
</template>

<script>
import dayjs from "dayjs"
import localizedFormat from "dayjs/plugin/localizedFormat"

dayjs.extend(localizedFormat)

export default {
	name: "PollCard",
	emits: ["click"],
	props: {
		poll: {
			type: Object,
			required: true,
		},
		showDate: {
			type: Boolean,
			default: true,
		},
		dateText: {
			type: String,
			default: undefined,
		},
	},
	computed: {
		createdDate() {
			if (this.dateText) return this.dateText
			if (!this.poll?.createdAt) return ""
			return dayjs(this.poll.createdAt).format("L")
		},
		daysLeft() {
			if (this.poll?.votingEndAt && this.poll?.status === "VOTING") {
				let end = dayjs(this.poll.votingEndAt)
				let diff = end.diff(dayjs(), "day")
				return diff > 0 ? diff : 1
			}
			return 0
		},
	},
}
</script>

<style>
.poll-card {
	--iconSize: 40px;

	cursor: pointer;
	height: 100% !important;
	border-radius: var(--liquido-border-radius);
}

.poll-card .card-body {
	padding: 0 1rem;
}

.poll-card .poll-eyebrow {
	font-size: 80%;
}

.poll-card .elaboration-pill {
	background-color: var(--elaboration-bg);
}

.poll-card .voting-pill {
	background-color: var(--voting-bg);
}

.poll-card .finished-pill {
	background-color: var(--finished-bg);
}

.poll-card .poll-created-date {
	float: right;
	color: var(--secondary);
}

.poll-card .poll-title {
	color: black;
	font-size: 1.2rem !important;
	margin: 0.5rem 0;
	display: -webkit-box;
	line-clamp: 2;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.poll-card .poll-footer {
	display: flex;
	gap: 1rem;
	font-size: 80%;
	color: var(--secondary);
}
</style>