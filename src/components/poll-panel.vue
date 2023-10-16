<template>
	<b-card 
		:id="pollCardId"
		:pollid="poll.id"
		:data-poll-status="poll.status"
		no-body
		class="poll-panel border-0 shadow" 
		:class="{'read-only': readOnly}"
		@click="goToPoll(poll.id)"
	>
		<b-card-body>
			<h1 class="card-title">
				{{ poll.title }}
			</h1>
		</b-card-body>
		<div v-if="!poll.proposals || poll.proposals.length === 0" class="card-body">
			<p class="text-secondary">
				<small>{{ $t("noProposalsInPollYet") }}</small>
			</p>
		</div>
		<b-list-group v-else flush>
			<b-list-group-item v-for="prop in poll.proposals" :key="prop.id" class="proposal-list-group-item" :class="proposalListGroupItemClasses(prop.id)">
				<div class="proposal-separator"></div>
				<div class="proposal-header d-flex align-items-center">
					<div class="proposal-image">
						<i class="fas fa-fw" :class="'fa-' + prop.icon" />
					</div>
					<div class="proposal-header-text d-flex flex-column text-truncate">
						<h4 class="proposal-title">
							{{ prop.title }}
						</h4>
						<div :class="propSubtitleClasses(prop)">
							<div v-if="canLike(prop)" class="like-button like-button-active" @click.stop.prevent="clickLike(poll.id, prop.id)">
								<i class="far fa-thumbs-up" />&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
							</div>
							<div v-else class="like-button" @click.stop.prevent="">
								<i class="fas fa-thumbs-up" />&nbsp;<span class="numLikes">{{ prop.numSupporters }}</span>
							</div>
							<div class="created-date">
								<i class="far fa-clock" />&nbsp;{{ formatDate(prop.createdAt) }}
							</div>
							<div class="createdby-user">
								<i class="far fa-user" />&nbsp;{{ prop.createdBy.name }}
							</div>
						</div>
					</div>
					
				</div>
				<div class="proposal-description" v-html="prop.description"></div>
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
import api from "@/services/liquido-graphql-client"
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
		readOnly: { type: Boolean, required: false, default: false },
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

		propSubtitleClasses(prop) {
			let currentUser = api.getCachedUser() || {}
			return { 
				"proposal-subtitle": true,
				"liked": prop.isLikedByCurrentUser, 
				"own-proposal": prop.createdBy.id === currentUser.id
			}
		},

		isCreatedByCurrentUser(prop) {
			let currentUser = api.getCachedUser() || {}
			return prop.createdBy.id === currentUser.id
		},

		/** 
		 * A proposal can be liked, when 
		 * we are not in readonly mode,
		 * the proposal is in ELABORATION, 
		 * it is not already liked
		 * nor created by the currently logged in user.
		 */
		canLike(prop) {
			return !this.readOnly && prop.status === "ELABORATION" &&  !prop.isLikedByCurrentUser && !this.isCreatedByCurrentUser(prop)
		},

		clickLike(pollId, proposalId) {
			api.likeProposal(pollId, proposalId)
		},

		toggleCollapse() {
			this.collapsed = !this.collapsed
		},

		goToPoll(pollId) {
			if (!this.readOnly) this.$router.push("/polls/" + pollId)
		},

		goToAddProposal(pollId) {
			this.$router.push("/polls/" + pollId + "/add")
		},
	},
}
</script>


<style lang="scss">
/* BUG: this does not work when style is "scoped"

/* size of proposal image */
$proposal_img_size: 32px;

.poll-panel {

	&:not(.read-only) {
		cursor: pointer;
	}

	.card-subtitle {
		color: $primary;
		font-size: 0.8rem !important;
		text-transform: uppercase;
		font-weight: bold;
		margin-top: 5px;
	}

	.card-header {   
		position: relative;
		//border-bottom: none;
		//margin: 0;
		//padding: 1em 10px;
	}
	
	.card-title {
		font-size: 1.2rem !important;      // Need more space for longer poll titles
		font-weight: bold;
		margin-bottom: 0;
		//white-space: nowrap;
		//overflow: hidden;
		//text-overflow: ellipsis;
	}

	.poll-title-icon {
		width: $proposal_img_size -3;
		text-align: center;
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
		//opacity: 0.5;
	}

	.collapse-icon .fa:before {
		content: "\f106";
	}

	.collapse-icon.collapsed .fa:before {
		content: "\f107";
	}

	.card-body {
		padding-bottom: 0;
	}

	.list-group {
		margin-bottom: 1em;  						// space for collapse icon
	}

	// list of proposals in poll
	.proposal-list-group-item {
		height: 	130px;           			// exactly 4 lines of description
		overflow: hidden;
		margin: 0 0 0 10px;            	// no margin at the top and bottom, the separator handles that		                           
		padding: 0;
		transition: height 0.5s;
		border: none;

		&.collapsed-proposal-panel {
			height: 60px;    // just right enough to NOT see the description.
			.proposal-separator {
				margin: 10px 0;
			}
		}			
		.proposal-header-text {
			margin: 0;
		}

		.proposal-title {
			margin-bottom: 3px;
			padding: 0;
			//font-size: 1rem !important;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.proposal-subtitle {
			font-size: 0.6rem;
			color: #bbb;
			margin-bottom: 3px;
			//font-family: Helvetica, sans-serif;
			cursor: pointer;

			.like-button {
				//font-size: 1rem;
				border: 1px solid #bbb;
				border-radius: 5px;
				display: inline;
				padding: 0 2px;
			}
			.like-button-active {
				cursor: pointer;
			}
			&.liked .like-button {
				background-color: $header-bg;
				color: white;
			}
			.created-date {
				display: inline;
				margin-left: 1em;
			}
			.createdby-user {
				display: inline;
				margin-left: 1em;
			}
			/*
			&.own-proposal {
				color: green;
			}
			*/
		}

		.proposal-image {
			color: white;
			background-color: $header-bg;
			border-radius: 50%;
			border: 1px solid lightgray;
			text-align: center;
			//font-size: 1.2em;
			line-height: $proposal_img_size;
			min-width: $proposal_img_size;
			max-width: $proposal_img_size;
			width: $proposal_img_size;
			min-height: $proposal_img_size;
			max-height: $proposal_img_size;
			height: $proposal_img_size;
			margin-right: 6px;
		}

		.proposal-description {
			font-size: 0.8rem;
			overflow: hidden;
			line-height: 18px;  // exactly enough for 4 lines of text
		}
		//TODO: only in browser (not on mobile) -  only for polls in ELABORATION - and only if can like
		.like-button:hover {
			color: green !important;
		}

	}

	// sepearator between proposals when poll-panel is expanded
	//.proposal-list-group-item:not(:last-child):not(.collapsed-proposal-panel)
	.proposal-separator {
			transition: all 0.5s;		
			border-top: 1px solid rgba(128,128,128, 0.1);
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
