 <template>
	<b-card 
		:id="pollCardId"
		:pollid="poll.id"
		:data-poll-status="poll.status"
		class="poll-panel border-0 shadow-sm" 
	>
		<template #header>
			<h4 class="poll-title">
				<!-- i class="fas fa-poll" /-->
				{{ poll ? poll.title : "" }}
			</h4>
		</template>
		<div v-if="!poll.proposals || poll.proposals.length === 0" class="card-body">
			<p class="text-secondary">
				<small>{{ $t("noProposalsInPollYet") }}</small>
			</p>
		</div>
		<b-list-group v-else flush>
			<b-list-group-item v-for="prop in sortedProposals" :key="prop.id" class="proposal-list-group-item" :class="proposalListGroupItemClasses(prop.id)">
				<div class="proposal-header d-flex align-items-center">
					<div class="proposal-image">
						<i class="fas fa-fw" :class="'fa-' + prop.icon" />
					</div>
					<h4 class="proposal-title">
						{{ prop.title }}
					</h4>
				</div>
				<div class="proposal-description" v-html="prop.description"></div>
				<div class="proposal-subtitle">
					<div v-if="prop.likedByCurrentUser" class="like-button liked">
						<i class="fas fa-thumbs-up" />&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
					</div>
					<div v-else-if="canLike(prop)" class="like-button can-like" @click="clickLike(poll.id, prop)">
						<i class="far fa-thumbs-up" />&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
					</div>
					<div v-else class="like-button">
						<i class="far fa-thumbs-up" />&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
					</div>
					<div class="created-date">
						<i class="far fa-clock" />&nbsp;{{ formatDate(prop.createdAt) }}
					</div>
					<div class="createdby-user">
						<i class="far fa-user" />&nbsp;{{ prop.createdBy.name }}
					</div>
				</div>
				
			</b-list-group-item>
		</b-list-group>
		<a
				v-if="poll.proposals && poll.proposals.length > 0"
				class="collapse-icon"
				:class="{'collapsed' : collapsed}"
				href="#"
				@click.stop.prevent="toggleCollapse()"
			>
			<i class="fa" />
		</a>
	</b-card>
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
				noProposalsInPollYet: "Diese Abstimmung enthält bisher noch keine Wahlvorschläge oder Kandidat*innen.",
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
			collapsed: this.collapse || this.poll.status === "FINISHED"
		}
	},
	computed: {
		pollCardId() { return "PollCard_"+this.poll.id },
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
			return this.poll.proposals.toSorted((p1,p2) => p1.createdAt.localeCompare(p2.createdAt))
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
				"collapsed-proposal-panel" : this.collapsed,
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
			return prop.status === "ELABORATION" &&  !prop.likedByCurrentUser && !this.isCreatedByCurrentUser(prop)
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


<style lang="scss">
/* BUG: this does not work when style is "scoped"

/* size of proposal image */
$proposal_img_size: 32px;

.poll-panel {

	.card-header {   
		background-color: white;
		padding: 10px 0;
		text-align: center;
	}

	.card-body {
		padding-top: 0;  // proposal-list-group-item  handles vertical padding
	}

	.poll-title {
		margin: 0;
		font-weight: bold;
	}
	
	.poll-title-icon {
		font-size: $proposal_img_size;
	} 

	.goto-poll-icon {
		line-height: 1.2; // same as .card-header > h3
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


	// list of proposals in poll
	.proposal-list-group-item {
		height: 	160px;           			// exactly 3 lines of description. MUST set height for collapse transition!
		overflow: hidden;
		padding: 15px 0 15px 0;
		transition: height 0.5s;
		border: none;

		&.collapsed-proposal-panel {
			height: 55px;    							// just right enough to NOT see the description.
			.proposal-separator {
				margin: 10px 0;
			}
		}
		.proposal-header {
			margin-bottom: 6px;
		}			

		.proposal-title {
			font-size: 1rem !important;   // a bit smaller for longer titles
			margin: 0 0 0 10px;
			padding: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.proposal-description {
			font-size: 0.8rem;
			overflow: hidden;
			line-height: 20px;
			height: 60px;     		// exactly enough for 4 lines of text
		}

		.proposal-subtitle {
			font-size: 0.8rem;
			color: #bbb;
			margin-top: 8px;

			.like-button {
				cursor: pointer;
				display: inline;
				padding: 1px 2px;
				border-radius: 5px;
			}
			.own-proposal {
				color: green;
			}
			.can-like {
				cursor: pointer;
				border: 1px solid #bbb;
				&:hover	{
					color: $primary !important;
					border-color: $primary !important;
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

		.proposal-image {
			color: white;
			background-color: $header-bg;
			border-radius: 50%;
			border: none;
			text-align: center;
			//font-size: 1.2em;
			line-height: $proposal_img_size;
			min-width: $proposal_img_size;
			max-width: $proposal_img_size;
			width: $proposal_img_size;
			min-height: $proposal_img_size;
			max-height: $proposal_img_size;
			height: $proposal_img_size;
		}

		

	}

	// sepearator between proposals when poll-panel is expanded
	//.proposal-list-group-item:not(:last-child):not(.collapsed-proposal-panel)
	.proposal-separator {
		//transition: all 0.5s;		
		border-top: 1px solid red; //lightgrey;//  rgba(128,128,128, 0.5);
		width: 50%;
		margin: 1rem 0;
	}

	.winner {
		background-color: $header-bg;
	}

	.lost {
		color: grey;
		.proposal-title {
			text-decoration: line-through;
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

	
	

	//BUGFIX for bootstrap: inherit border-radius in list-group-flush wrapper
	/*
	.list-group-flush {
		border-radius: inherit;
	}
	*/
}

</style>
