<template>
	<header id="liquidoHeader" class="liquido-header shadow-sm">
		<div class="header-left">
			<a v-if="backLink" href="#" @click="goBack">
				<i class="fas fa-angle-left" />
			</a>
		</div>
		<div class="liquido-title">
			<i class="fas fa-university" />&nbsp;
			<span class="liquido" @click="clickLiquidoTitle()" />
		</div>
		<div class="header-right">
			<a v-if="isAuthenticated" href="#" aria-label="Team Home" @click="clickTeamIcon()">
				<i class="fas fa-users" />
			</a>
		</div>
	</header>
</template>

<script>
import EventBus from "@/services/event-bus"

export default {
	name: "LiquidoHeader",
	i18n: {
		messages: {
			en: {},
			de: {},
		},
	},
	props: {
		// show a "backlink". You can pass an URL or the keyworkd "BACK" to use browsers back
		backLink: { type: String, required: false, default: undefined },
	},
	
	data() {
		return {
			filterByStatus: "ELABORATION",
			isAuthenticated: false
		}
	},
	computed: {
		height() {
			return document.getElementById("liquidoHeader").offsetHeight
		},
	},
	mounted() {
		//MAYBE: make header smaller when user scrolls down
		//$("#app").scroll(this.transitionHeader)

		// Cannot simply do this with a computed property, because this.$api.isAuthenticated is not reactive.
		//TODO: Can we make it reactive? maybe with Vue.$set ?
		EventBus.on(EventBus.Event.LOGIN,  () => {
			this.isAuthenticated = true
		})
		EventBus.on(EventBus.Event.LOGOUT, () => {
			this.isAuthenticated = false
		})
	},
	methods: {
    /* DEPRECATED
		transitionHeader() {
			if (document.getElementById("app").scrollTop > 50) {
        document.getElementsByClassName(".liquido-header").classList.add("scrolled")
        document.getElementById("navArrows").classList.add("scrolled")
			} else {
        document.getElementsByClassName(".liquido-header").classList.remove("scrolled")
        document.getElementById("navArrows").classList.remove("scrolled")
			}
		},
    */

		goBack() {
			//console.log("Back", this.backLink)
			if (this.backLink === "BACK") this.$router.go(-1)
			else if (this.backLink) this.$router.push(this.backLink)
		},

		clickLiquidoTitle() {
			/*
			//TOOD: what todo when clicking header? Where to go? => Maybe List of polls?
			if (this.$route.path !== "/welcome" && this.$route.path !== "/polls" && this.$route.path !== "/login") {
				this.$router.push({name: "polls"})
			}
			*/
		},

		clickTeamIcon() {
			if (this.$route.path === "/welcome") {
				this.$router.push({name: "login"})
			} else if (this.$route.path !== "/team") {
				this.$router.push({name: "teamHome"})
			}
		},

	},
}
</script>

<style lang="scss" scoped>
.liquido-header {
	position: fixed;
	top: 0;
	width: 100%;
	max-width: 1140px;  // same as .container
	z-index: 100;
	transition: 0.3s; /* Add a transition effect when scrolling */
	color: $primary;
	background-color: $header-bg;
	border-bottom: 1px solid rgba(0, 0, 0, 0.2);
	font-size: 1.5rem;
	display: flex;
	flex-direction: row;
	

	.header-left {
		width: 2em;
		text-align: left;
		padding-left: 10px;
	}
	.liquido-title {
		flex-grow: 1;	
		text-align: center;
	}
	.header-right {
		width: 2em;
		text-align: right;
		padding-right: 10px;
	}
	
}

.liquido-header.scrolled {
	font-size: 1rem;
}

</style>
