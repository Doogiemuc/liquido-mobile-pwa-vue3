<template>
	<nav id="navbar">
		<div id="teamButton" class="team-button">
			<a href="#" aria-label="Team" @click="goToTeam()">
				<div class="nav-bar-icon">
					<i class="fas fa-users"></i>
				</div>
				<div class="icon-title">{{ $t("team") }}</div>
			</a>
		</div>
		<div id="pollsInDiscussionArrow" :class="discussButtonClass" class="discuss-button">
			<a href="#" aria-label="Polls to discuss" @click="clickPollsInDiscussion()">
				<div class="nav-bar-icon">
					<i class="fas fa-comments"></i>
					<span class="counter-badge">{{ pollsInElaboration.length }}</span>
				</div>
				<div class="icon-title">{{ $t("discuss") }}</div>
			</a>
		</div>
		<div id="pollsInVotingArrow" :class="voteButtonClass" class="vote-button">
			<a href="#" aria-label="Polls in voting" @click="clickPollsInVoting()">
				<div class="nav-bar-icon">
					<i class="fas fa-person-booth"></i>
					<span class="counter-badge">{{ pollsInVoting.length }}</span>
				</div>
				<div class="icon-title">{{ $t("vote") }}</div>
			</a>
		</div>
		<div id="finishedPollsArrow" :class="finishedButtonClass" class="finished-button">
			<a href="#" aria-label="Finished polls" @click="clickFinishedPolls()">
				<div class="nav-bar-icon">
					<i class="fas fa-check-circle"></i>
					<span class="counter-badge">{{ pollsFinished.length }}</span>
				</div>
				<div class="icon-title">{{ $t("finished") }}</div>
			</a>
		</div>
		<div id="infoButton" class="info-button">
			<a href="#" aria-label="Info" @click="goToInfo()">
				<div class="nav-bar-icon">
					<i class="fas fa-info"></i>
				</div>
				<div class="icon-title">{{ $t("info") }}</div>
			</a>
		</div>
	</nav>
</template>

<script>
import EventBus from "@/services/event-bus"
import api from "@/services/liquido-graphql-client"



export default {
	name: "LiquidoFooter",
	i18n: {
		messages: {
			de: {
				team: "Team",
				discuss: "Debate",
				vote: "Vote",
				finished: "Finished",   // abgeschlossen?  final? fertig?  verb: entscheiden?
				info: "Info"
			},
			en: {
				team: "Team",
				discuss: "Discuss",  // debate
				vote: "Vote",
				finished: "Finished",
				info: "Info"
			}
		}
	},
	data() { 
		return {
			selectedItem: -1,         // selectedItem in navbar.  -1 - show all polls,  1 - discuss, 2 - vote, 3 - finished
			forceRefreshComputed: 0   
		} 
	},
	computed: {
		pollsInElaboration() {
			this.forceRefreshComputed;
			let res = api.getCachedPolls("ELABORATION")
			return res
		},
		pollsInVoting() {
			this.forceRefreshComputed;
			return api.getCachedPolls("VOTING")
		},
		pollsFinished() {
			this.forceRefreshComputed;
			return api.getCachedPolls("FINISHED")
		},
		discussButtonClass() {
			return { 
				selected: this.selectedItem === 1 || this.selectedItem === -1,
				disabled: this.pollsInElaboration.length === 0
			}
		},
		voteButtonClass() {
			return { 
				selected: this.selectedItem === 2 || this.selectedItem === -1,
				disabled: this.pollsInVoting.length === 0
			}
		},
		finishedButtonClass() {
			return { 
				selected: this.selectedItem === 3 || this.selectedItem === -1,
				disabled: this.pollsFinished.length === 0
			}
		},
	},
	watch: {
		/*
		// when navigating via URL, updated navbar accordingly
		"$route.name": function(routeName) {
			//console.log("navbar-bottom route.name changed to ", routeName)
			if (this.$route.params)
				this.setPollFilter(this.$route.params.status)
		}
		*/	
	},
	created() {
		EventBus.on(EventBus.Event.POLLS_LOADED, () => {  // MUST use arrow-function to keep `this` reference!
			// hack to make computed properties refresh their value
			// https://logaretm.com/blog/2019-10-11-forcing-recomputation-of-computed-properties/
			this.forceRefreshComputed++;  
		})
		EventBus.on(EventBus.Event.POLL_LOADED, () => {
			this.forceRefreshComputed++;
		})
		EventBus.on(EventBus.Event.LOGIN, () => {
			this.forceRefreshComputed++;
		})
		// Check what needs to be the selected, depending on (query) params
		/*
		if (this.$route.query && this.$route.query.status) {
			this.setPollFilter(this.$route.query.status)
		} else if (this.$route.params && this.$route.params.status) {
			this.setPollFilter(this.$route.params.status)
		}
		*/
	},
	mounted() {
		//console.log("navbar-bottom mounted: forceRefreshComputed")
		//this.forceRefreshComputed++;
	},
	methods: {

		setPollFilter(newFilterValue) {
			console.log("Navbar.setPollFilter", newFilterValue)
			switch (newFilterValue) {
				case "ELABORATION":
					this.selectedItem = 1
					break
				case "VOTING":
					this.selectedItem = 2
					break
				case "FINISHED":
					this.selectedItem = 3
					break
				default:
					newFilterValue = undefined
					this.selectedItem = -1
			}
			// If we are not on the polls page already, then navigate there.
			if (this.$route && this.$route.name !== "polls") {
				this.$router.push({name: "polls", params: { status: newFilterValue }})
			}
			EventBus.emit(EventBus.Event.POLL_FILTER_CHANGED, newFilterValue)
		},

		goToTeam() {
			if (this.selectedItem !== 0) {  // prevent firing an unnecessary event
				this.selectedItem = 0
			}
			this.$router.push({name: "teamHome"})
		},

		goToInfo() {
			if (this.selectedItem !== 0) {
				this.selectedItem = 0
			}
			//this.$router.push({name: "aboutPage"})
		},

		/**
		 * Behaviour of the three buttons in the navbar<
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
			if (this.selectedItem === 0 || this.selectedItem === 1) {
				this.setPollFilter(undefined)
			} else {
				this.setPollFilter("ELABORATION")
			}
			
		},

		clickPollsInVoting() {
			if (this.selectedItem === 0 || this.selectedItem === 2) {
				this.setPollFilter(undefined)
			} else {
				this.setPollFilter("VOTING")
			}
		},

		clickFinishedPolls() {
			if (this.selectedItem === 0 || this.selectedItem === 3) {
				this.setPollFilter(undefined)
			} else {
				this.setPollFilter("FINISHED")
			}
		},

	},
}
</script>

<style lang="scss" scoped>

$arrowColor: white; //#bbcaec;
$arrowWidth: 15px;
$arrowHeight: 30px;  // half height
$arrowGap: 3px;

#navbar {
	position: fixed;
	width: 100%;
	max-width: $app-max-width;
	//height: 2 * $arrowHeight + 4 * $arrowGap;
	bottom: 0;
	z-index: 999;
	font-size: 1.2rem;
	padding: 10px 5px 20px 5px;  // a bit more padding at the bottom for iOS swipe-up bar
	margin: 0 0;
	box-shadow: 0 0 0.25rem rgba(0,0,0,0.6);
	background-color: $navbar-bg;
	display: flex;
	flex-wrap: nowrap;
	justify-content: space-between;
	
	.team-button, .discuss-button, .vote-button, .finished-button, .info-button {
		text-align: center;
		margin: 0;
		padding: 0;
		height: 2 * $arrowHeight;   // Buttons MUST have a fixed height!
		position: relative;
		transition: background-color 0.5s;
		a { 
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

	.discuss-button, .vote-button, .finished-button {
		min-width: 30px;
		flex-grow: 1;
		//line-height: 1.1;
		background-color: $arrowColor;
		&::after {
			-webkit-transition: background-color 0.5s ease, border-color 0.5s ease;
			-moz-transition: background-color 0.5s ease, border-color 0.5s ease;
			/* please note that transitions are not supported in IE 9 and there is no -ms prefix */
			transition: background-color 0.5s ease, border-color 0.5s ease;
		}
		&.selected::after {
			border-color: transparent transparent transparent $primary;
		}
		&::before {
			-webkit-transition: background-color 0.5s ease, border-color 0.5s ease;
			-moz-transition: background-color 0.5s ease, border-color 0.5s ease;
			/* please note that transitions are not supported in IE 9 and there is no -ms prefix */
			transition: background-color 0.5s ease, border-color 0.5s ease;
		}
		&.selected::before {
			border-color: $primary $primary $primary transparent;
		}
	}

	.team-button, .info-button {
		flex-grow: 1;
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
	}

	.discuss-button {
		position: relative;
		border-top-left-radius: 10px;
		border-bottom-left-radius: 10px;
		//margin-left: 5px;
		margin-right: $arrowWidth + $arrowGap;
		flex-grow: 2;
		&::after {
			position: absolute;
			content: "";
			top: 0px;
			right: -$arrowWidth+1;
			width: 0px;
			height: 0px;
			border-style: solid;
			border-width: $arrowHeight 0 $arrowHeight $arrowWidth;
			border-color: transparent transparent transparent $arrowColor;
			z-index: 150;
		}	
	}

	.vote-button {
		flex-grow: 2;
		margin-right: $arrowWidth + $arrowGap;
		&::before {
			position: absolute;
			content: "";
			top: 0px;
			left: -$arrowWidth;
			width: 0px;
			height: 0px;
			border-style: solid;
			border-width: $arrowHeight 0 $arrowHeight $arrowWidth;
			border-color: $arrowColor $arrowColor $arrowColor transparent;		
		}
		&::after {
			position: absolute;
			content: "";
			top: 0px;
			right: -$arrowWidth+1;
			width: 0px;
			height: 0px;
			border-style: solid;
			border-width: $arrowHeight 0 $arrowHeight $arrowWidth;
			border-color: transparent transparent transparent $arrowColor;
			z-index: 150;
		}
	}

	.finished-button {
		flex-grow: 2;
		border-top-right-radius: 10px;
		border-bottom-right-radius: 10px;
		//margin-right: 5px;
		padding: 0;
		background-color: $arrowColor;
		&::before {
			position: absolute;
			content: "";
			top: 0px;
			left: -$arrowWidth+1;
			width: 0px;
			height: 0px;
			border-style: solid;
			border-width: $arrowHeight 0 $arrowHeight $arrowWidth;
			border-color: $arrowColor $arrowColor $arrowColor transparent;		
		}
	}

	.selected {
		a {	color: white !important; }
		background-color: $primary;
		.counter-badge {
			color: $primary !important;
			border: 1px solid $primary !important;
		}
	}
	.disabled {
		a { color: lightgray !important; }
		.counter-badge {
			color: lightgray !important;
			border: 1px solid lightgray !important;
		}
	}
	.disabled.selected {
		a {
			opacity: 0.8;
			color: gray !important; 
		}
		.counter-badge {
			opacity: 0.8;
			color: $primary !important;
			background: gray !important;
			border: 1px solid $primary !important;
		}
	}

	.nav-bar-icon {
		position: relative;
		display: inline-block;
		font-size: 22px;
	}
	.counter-badge {
		position: absolute;
		text-align: center;
		top: 0;
		right: 0;
		color: $primary;
		background-color: white;
		border: 1px solid $primary;
		border-radius: 1em;
		font-size: 0.8rem;
		height: 1.2em;
		min-width: 1.2em;
		overflow: hidden;
		line-height: 1;
		transform: translate(10px, -3px)
	}
	.icon-title {
		font-size: 10px;
		text-decoration: none;
		line-height: 1.0;
	}

}	


/* DEPRECATED: This was from an old layout with a larger circle in the middle
.circle-1 {
	background: white;
	width: 50px;
	height: 50px;
	border: 1px solid $primary;
	border-radius: 50%;
	font-size: 1.9rem;
	position: fixed;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
}
*/

</style>
