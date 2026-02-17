<template>
	<nav id="pollsNavbar">
		<a href="" class="team-button" aria-label="Team" @click.prevent="$root.gotoTeam">
			<i class="fas fa-users"></i>
			<div class="icon-title">{{ $t("team") }}</div>
		</a>
		<div id="navbar-arrows">
			<div id="pollsInDiscussionArrow" :class="discussButtonClass" class="discuss-button">
				<a href="" aria-label="Polls to discuss" @click.prevent="clickPollsInDiscussion">
					<div class="arrow-icon">
						<i class="fas fa-lightbulb"></i>
						<span class="counter-badge">{{ pollsInElaboration.length }}</span>
					</div>
					<div class="arrow-title">{{ $t("New") }}</div>
				</a>
			</div>
			<div id="pollsInVotingArrow" :class="voteButtonClass" class="vote-button">
				<a href="" aria-label="Polls in voting" @click.prevent="clickPollsInVoting">
					<div class="arrow-icon">
						<i class="fas fa-person-booth"></i>
						<span class="counter-badge">{{ pollsInVoting.length }}</span>
					</div>
					<div class="arrow-title">{{ $t("InVoting") }}</div>
				</a>
			</div>
			<div id="finishedPollsArrow" :class="finishedButtonClass" class="finished-button">
				<a href="" aria-label="Finished polls" @click.prevent="clickFinishedPolls">
					<div class="arrow-icon">
						<i class="fas fa-check-circle"></i>
						<span class="counter-badge">{{ pollsFinished.length }}</span>
					</div>
					<div class="arrow-title">{{ $t("FinishedAbbr") }}</div>
				</a>
			</div>
		</div>
		<a href="" aria-label="Info" class="search-button" @click.prevent="clickSearch">
			<i class="fas fa-search"></i>
			<div class="icon-title">{{ $t("Search") }}</div>
		</a>
	</nav>
</template>

<script>
import api from "@/services/liquido-graphql-client.js"

export default {
	name: "LiquidoFooter",
	i18n: {
		messages: {
			en: {
				FinishedAbbr: "Finished"
			},
			de: {
				FinishedAbbr: "Abgeschl."
			},
		}
	},
	props: {
		modelValue: { type: String, required: false, default: api.POLL_STATUS.ALL_POLLS },
	},
	emits: ['update:modelValue'],
	data() {
		return {
			selectedFilter: this.modelValue,
			//forceRefreshComputed: 0
		} 
	},
	computed: {
		pollsInElaboration() {
			//this.forceRefreshComputed;
			let allPolls = api.getCachedPolls()
			return allPolls.filter(poll => poll.status === api.POLL_STATUS.ELABORATION)
		},
		pollsInVoting() {
			//this.forceRefreshComputed;
			let allPolls = api.getCachedPolls()
			return allPolls.filter(poll => poll.status === api.POLL_STATUS.VOTING)
		},
		pollsFinished() {
			//this.forceRefreshComputed;
			let allPolls = api.getCachedPolls()
			return allPolls.filter(poll => poll.status === api.POLL_STATUS.FINISHED)
		},
		discussButtonClass() {
			return { 
				deselected: this.selectedFilter !== api.POLL_STATUS.ELABORATION && this.selectedFilter !== api.POLL_STATUS.ALL_POLLS,
				disabled: this.pollsInElaboration.length === 0
			}
		},
		voteButtonClass() {
			return { 
				deselected: this.selectedFilter !== api.POLL_STATUS.VOTING && this.selectedFilter !== api.POLL_STATUS.ALL_POLLS,
				disabled: this.pollsInVoting.length === 0
			}
		},
		finishedButtonClass() {
			return { 
				deselected: this.selectedFilter !== api.POLL_STATUS.FINISHED && this.selectedFilter !== api.POLL_STATUS.ALL_POLLS,
				disabled: this.pollsFinished.length === 0
			}
		},
	},
	mounted() {
		this.selectedFilter = api.POLL_STATUS.ALL_POLLS
	},
	watch: {
		selectedFilter(newValue) {
			this.$emit('update:modelValue', newValue)
		},
		modelValue(newValue) {
			this.selectedFilter = newValue
		}
	},
	methods: {

		/**
		 * Behaviour of the three buttons in the navbar
		 * 
		 * 1. Debate
		 * 2. Vote
		 * 3. Finished
		 * 
		 * Initially all three are selected.
		 * When user clicks one of them, then only this button is selected.
		 * When user clicks the currently selected button again, 
		 * then all buttons are selected and all polls are shown.
		 */

		clickPollsInDiscussion() {
			if (this.selectedFilter === api.POLL_STATUS.ELABORATION) {
				this.selectedFilter = api.POLL_STATUS.ALL_POLLS
			} else {
				this.selectedFilter = api.POLL_STATUS.ELABORATION
			}			
		},

		clickPollsInVoting() {
			if (this.selectedFilter === api.POLL_STATUS.VOTING) {
				this.selectedFilter = api.POLL_STATUS.ALL_POLLS
			} else {
				this.selectedFilter = api.POLL_STATUS.VOTING
			}
		},

		clickFinishedPolls() {
			if (this.selectedFilter === api.POLL_STATUS.FINISHED) {
				this.selectedFilter = api.POLL_STATUS.ALL_POLLS
			} else {
				this.selectedFilter = api.POLL_STATUS.FINISHED
			}
		},

		goToInfo() {
			this.$router.push({name: "info"}) // TODO
		},

	},
}
</script>

<style>
#pollsNavbar {
	--arrowColor: white;  /* TEXT color */
	--arrowBgColor: var(--primary);
	--arrowGapColor: white;
	--arrowWidth: 15px;
	--arrowHeight: 60px;
	--arrowGap: -10px;  /* negative margin, higher values = smaller gap */

	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	
	margin: 0;
	padding: 0;
	background: var(--header-bg);
	border-top: 1px solid lightgray;
	box-shadow: 0 -5px 10px rgba(0, 0, 0, 0.1);
	z-index: 999;
	/*will-change: transform;*/

	.counter-badge {
		position: absolute;
		text-align: center;
		top: 0;
		color: var(--primary);
		background-color: var(--arrowColor);
		border: 1px solid rgba(47, 141, 255, 0.5);
		border-radius: 1em;
		font-size: 1rem;
		height: 1.2em;
		min-width: 1.2em;
		overflow: hidden;
		line-height: 1.1;
	}

	.icon-title {
		font-size: 10px;
		text-decoration: none;
		line-height: 1.0;
		margin-top: 0.5rem;
	}

	.team-button, .search-button {	
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-size: 1.5rem;
		color: var(--primary);
		padding: 1.2rem 1rem 0.8rem 1rem;  /*UI glitch: needs a bit more padding at the top to visually look centers */
		text-decoration: none;
	}

	#navbar-arrows {
		flex-grow: 1;  /* the arrows take up as much width as possible */
		color: var(--arrowColor);
		background-color: var(--arrowGapColor);
		transition: background-color 0.5s;
		overflow: hidden;
		
		display: flex;
		flex-wrap: nowrap;
		justify-content: center;
		align-items: stretch;
		gap: 0;
		height: var(--arrowHeight);
		border: none;  
		border-radius: var(--liquido-border-radius);
		
		.discuss-button, .vote-button, .finished-button {
			min-width: 30px;
			flex-grow: 1;
			position: relative;
			opacity: 1.0;  /* will be dimmed when deselected */

			font-size: 1.5rem;
			color: var(--arrowColor);
			background-color: var(--arrowBgColor);
			
			.arrow-icon {
				position: relative;
				display: inline-block;	
			}

			.arrow-title {
				font-size: 10px;
			}

			a {
				color: var(--arrowColor);
				position: relative;
				text-decoration: none;
				width: 100%;
				height: 100%;
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
			}
		}
		
		.deselected {
			opacity: 0.6;
			/*
			a {	color: white !important; }
			background-color: var(--arrowColorSelected);
			.counter-badge {
				color: var(--primary) !important;
			}
			*/
		}


		.discuss-button {
			flex-basis: 22%;
			border-top-left-radius: var(--border-radius);
			border-bottom-left-radius: var(--border-radius);
			/* Arrow shape using clip-path */
			clip-path: polygon(0 0, calc(100% - var(--arrowWidth)) 0, 100% 50%, calc(100% - var(--arrowWidth)) 100%, 0 100%, 0% 50%);
			z-index: 2;
			margin-right: var(--arrowGap);
		}

		.vote-button {
			flex-basis: 36%;
			z-index: 3;
			clip-path: polygon(0 0, calc(100% - var(--arrowWidth)) 0, 100% 50%, calc(100% - var(--arrowWidth)) 100%, 0 100%, var(--arrowWidth) 50%);
		}

		.finished-button {
			flex-basis: 22%;
			z-index: 4;
			border-top-right-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
			clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, var(--arrowWidth) 50%);
			margin-left: var(--arrowGap);
		}
		

		/* OLD VERSION:  Arrow dividers between buttons 
		.discuss-button::after,
		.vote-button::after {
			content: '';
			position: absolute;
			right: -10px;
			width: 0;
			height: 0;
			border-left: 8px solid var(--arrowColor);
			border-top: 20px solid transparent;
			border-bottom: 20px solid transparent;
			z-index: 1;
			transition: border-color 0.5s ease;
		}
			*/
		
		/*
		.vote-button::before,
		.finished-button:before {
			content: '';
			position: absolute;
			left: -10px;
			width: 0;
			height: 0;
			border-right: 8px solid var(--arrowColor);
			border-top: 20px solid transparent;
			border-bottom: 20px solid transparent;
			z-index: 1;
			transition: border-color 0.5s ease;
		}
			*/
		
		/*
		.finished-button::before {
			content: '';
			position: absolute;
			left: -10px;
			width: 0;
			height: 0;
			border-left: 8px solid var(--arrowColor);
			border-top: 20px solid transparent;
			border-bottom: 20px solid transparent;
			z-index: 1;
			transition: border-color 0.5s ease;
		}
			*/
		
		/* Selected state arrow dividers 
		.discuss-button.selected::after {
			border-left-color: var(--arrowColorSelected);
		}
		
		.vote-button.selected::after {
			border-left-color: var(--arrowColorSelected);
		}
		
		.vote-button.selected::before {
			border-right-color: var(--arrowColorSelected);
		}
		
		.finished-button.selected::before {
			border-right-color: var(--arrowColorSelected);
		}
			*/

		/*
		.disabled {
			a { color: lightgray !important; }
			.counter-badge {
				color: lightgray !important;
			}
		}
		.disabled.selected {
			a {
				opacity: 0.8;
				color: lightgray !important; 
			}
			.counter-badge {
				opacity: 0.8;
				color: var(--primary) !important;
				background: lightgray !important;
			}
		}
			*/
	}


}	


/* DEPRECATED: This was from an old layout with a larger circle in the middle
.circle-1 {
	background: white;
	width: 50px;
	height: 50px;
	border: 1px solid var(--primary);
	border-radius: 50%;
	font-size: 1.9rem;
	position: fixed;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
}
*/

</style>