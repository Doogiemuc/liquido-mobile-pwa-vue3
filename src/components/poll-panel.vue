<template>
	<div :id="pollCardId" :pollid="poll.id" :data-poll-status="poll.status" class="card poll-panel shadow">
		<h2 class="card-header poll-title">
			<!-- i class="fas fa-poll" /-->
			{{ poll ? poll.title : "" }}
		</h2>
		<div v-if="!poll.proposals || poll.proposals.length === 0" class="card-body">
			<p class="text-secondary">
				{{ $t("noProposalsInPollYet") }}
			</p>
		</div>
		<ul v-else class="list-group list-group-flush">
			<li v-for="prop in sortedProposals" :key="prop.id" class="list-group-item proposal-list-group-item user-select-none"
				:class="proposalListGroupItemClasses(prop.id)">
				<div class="proposal-header d-flex align-items-center">
					<div class="proposal-icon">
						<i class="fas fa-fw" :class="'fa-' + prop.icon"></i>
					</div>
					<div class="title-subtitle-wrapper">
						<h4 class="proposal-title">
							{{ prop.title }}
						</h4>
						<div v-if="subtitleUnderTitle" class="proposal-subtitle">
							<div v-if="prop.likedByCurrentUser" class="like-button liked">
								<i class="fas fa-thumbs-up"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
							</div>
							<div v-else-if="canLike(prop)" class="like-button can-like" @click="clickLike(poll.id, prop)">
								<i class="far fa-thumbs-up"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
							</div>
							<div v-else class="like-button">
								<i class="far fa-thumbs-up"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
							</div>
							<div class="created-date">
								<i class="far fa-clock"></i>&nbsp;{{ formatDate(prop.createdAt) }}
							</div>
							<div class="createdby-user">
								<i class="far fa-user"></i>&nbsp;{{ prop.createdBy.name }}
							</div>
						</div>
					</div>
				</div>
				<div class="proposal-description" v-html="prop.description"></div>
				<div v-if="!subtitleUnderTitle" class="proposal-subtitle mt-1">
					<div v-if="prop.likedByCurrentUser" class="like-button liked">
						<i class="fas fa-thumbs-up"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
					</div>
					<div v-else-if="canLike(prop)" class="like-button can-like" @click="clickLike(poll.id, prop)">
						<i class="far fa-thumbs-up"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
					</div>
					<div v-else class="like-button">
						<i class="far fa-thumbs-up"></i>&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
					</div>
					<div class="created-date">
						<i class="far fa-clock"></i>&nbsp;{{ formatDate(prop.createdAt) }}
					</div>
					<div class="createdby-user">
						<i class="far fa-user"></i>&nbsp;{{ prop.createdBy.name }}
					</div>
				</div>
			</li>
		</ul>
		<a v-if="poll.proposals && poll.proposals.length > 0" class="collapse-icon" :class="{ 'collapsed': collapsed }"
			href="#" @click.stop.prevent="toggleCollapse()">
			<i class="fa"></i>
		</a>
	</div>
</template>

<script>
import api from "@/services/liquido-graphql-client.js"
import dayjs from "dayjs"
import localizedFormat from 'dayjs/plugin/localizedFormat'
dayjs.extend(localizedFormat)

export default {
	i18n: {
		messages: {
			en: {},
			de: {
				noProposalsInPollYet: "Diese Abstimmung hat bisher noch keine Vorschläge bzw. Kandidat*innen.",
				addProposal: "Vorschlag hinzufügen",
			},
		},
	},
	name: "PollPanel",
	components: {},
	props: {
		poll: { type: Object, required: true },
		collapse: { type: Boolean, required: false, default: false },
	},
	data() {
		return {
			collapsed: this.collapse || this.poll.status === "FINISHED",
			subtitleUnderTitle: true,    // you have no idea how often I switched this. I can't decide if subtitle should be under title or not.
		}
	},
	computed: {
		pollCardId() { return "PollCard_" + this.poll.id },
		iconForPoll() {
			if (!this.poll) return undefined
			switch (this.poll.status) {
				case "ELABORATION":
					return "far fa-comments"        // or fa-poll?
				case "VOTING":
					return "fas fa-person-booth"    // or fa-vote-yea?
				case "FINISHED":
					return "fas fa-university"
				default:
					return "far fa-poll"
			}
		},
		pollStatusLoc() {
			if (!this.poll || !this.poll.id) return this.$t("Poll")
			if (!this.poll.proposals || this.poll.proposals.length === 0) return this.$t("newPoll")
			if (this.poll.status === "ELABORATION") return this.$t("pollInElaboration")
			if (this.poll.status === "VOTING") return this.$t("pollInVoting")
			if (this.poll.status === "FINISHED") return this.$t("finishedPoll")
			return this.$t("Poll")
		},
		/** 
		 * Proposals are sorted by their creation date.
		 * This is important: For example the order should not change when a user likes a proposal
		 * and the poll is then reloaded from the backend.
		 */
		sortedProposals() {
			if (!this.poll || !this.poll.proposals) return []
			return this.poll.proposals.toSorted((p1, p2) => p1.createdAt.localeCompare(p2.createdAt))
		}
	},
	mounted() {

	},
	methods: {
		formatDate(dateVal) {
			return dayjs(dateVal).format("L")
		},

		proposalListGroupItemClasses(propId) {
			let isWinner = this.poll.winner && propId === this.poll.winner.id
			return {
				"collapsed-proposal-panel": this.collapsed,
				"winner": this.poll.status === "FINISHED" && isWinner,
				"lost": this.poll.status === "FINISHED" && !isWinner,
			}
		},

		//TODO: "own-proposal": prop.createdBy.id === currentUser.id

		isCreatedByCurrentUser(prop) {
			let currentUser = api.getCachedUser() || {}
			return prop.createdBy.id === currentUser.id
		},

		/** 
		 * A proposal can be liked, when 
		 * the proposal is in ELABORATION, 
		 * it is not already liked
		 * nor created by the currently logged in user.
		 */
		canLike(prop) {
			return prop.status === "ELABORATION" && !prop.likedByCurrentUser && !this.isCreatedByCurrentUser(prop)
		},

		clickLike(pollId, prop) {
			if (this.canLike(prop)) api.likeProposal(pollId, prop.id)
		},

		toggleCollapse() {
			this.collapsed = !this.collapsed
		}

	}
}
</script>


<style>

/* size of proposal image */


.poll-panel {
	--proposal_icon_size: 2.5rem;

	.card-header {
		border-bottom: none;
		background-color: white;
	}

	.poll-title-icon {
		font-size: var(--proposal_icon_size);
	}

	.goto-poll-icon {
		line-height: 1.2; /* same as .card-header > h3 */
		float: right;
	}

	.collapse-icon {
		z-index: 999;
		position: absolute;
		font-size: 1.2rem;
		bottom: 0;
		right: 10px;
	}

	.collapse-icon .fa:before {
		content: "\f106";
	}

	.collapse-icon.collapsed .fa:before {
		content: "\f107";
	}


	/* list of proposals in poll */
	.proposal-list-group-item {
		height: 150px; /* MUST set height for collapse transition! */
		overflow: hidden;
		transition: height 0.5s;
		border: none;            /* TODO: or with border/divider between proposals in a poll???? => I changed this 1001 times :-) */

		&.collapsed-proposal-panel {
			height: 60px; /* just right enough to NOT see the description. */
			.proposal-description {
				display: none
			}
			
		}
		.proposal-header {
			margin-bottom: 6px;
		}

		.title-subtitle-wrapper {
			flex: 1;
			margin-left: 5px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.proposal-title {
			color: var(--primary);
			font-size: 1rem !important; /* a bit smaller then normal h4 for longer titles */
			margin: 0;
			padding: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.proposal-description {
			font-size: 1rem;
			overflow: hidden;
			line-height: 20px;
			height: 60px;    /* exactly enough for 4 lines of text */
		}

		.proposal-subtitle {
			font-size: 0.8rem;
			color: var(--secondary);
			margin-top: 5px;
			display: flex;
			align-items: center;

			.like-button {
				display: inline;
				padding: 1px 4px;
				border-radius: 5px;
			}

			.own-proposal {
				color: green;
			}

			.can-like {
				cursor: pointer;
				border: 1px solid #bbb;

				&:hover {
					color: var(--primary) !important;
					border-color: var(--primary) !important;
				}
			}

			.liked {
				border: 1px solid #bbb;
				background-color: #bbb;
				color: white;
				cursor: default;
			}

			.created-date {
				display: inline;
				margin-left: 1em;
			}

			.createdby-user {
				display: inline;
				margin-left: 1em;
			}

		}

		.proposal-icon {
			color: white;
			background-color: var(--proposal-icon-bg);
			border-radius: 50%;
			border: none;
			text-align: center;
			font-size: var(--proposal_icon_size) * 0.6;
			line-height: var(--proposal_icon_size);
			min-width: var(--proposal_icon_size);
			max-width: var(--proposal_icon_size);
			width: var(--proposal_icon_size);
			min-height: var(--proposal_icon_size);
			max-height: var(--proposal_icon_size);
			height: var(--proposal_icon_size);
		}
	}

	/* sepearator between proposals when poll-panel is expanded */
	.proposal-separator {
		border-top: 1px solid lightgrey;
		width: 50%;
		margin: 1rem 0;
	}

	.winner {
		background-color: var(--bs-success-bg-subtle) !important;
	}

	.lost {
		color: lightgray;

		.proposal-title {
			color: lightgray;
		}

		.proposal-description {
			color: lightgray;
		}

		.proposal-image {
			opacity: 0.5;
		}

		&.collapsed-proposal-panel {
			height: 0;
			margin: 0;
			padding: 0;
		}
	}

}
</style>
