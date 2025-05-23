<template>
	<header id="liquidoHeader">
		<div class="header-left" @click="clickBack">
			<a v-if="store.headerBackLink" href="#">
				<i class="fas fa-angle-left" />
			</a>
		</div>
		<div class="header-center" @click="clickHeaderCenter">
			<div class="liquido-claim">
				<i class="fas fa-university" />&nbsp;
				<span class="liquido" />
			</div>
			<div v-if="store.headerTitle" class="center-title">
				<h1>{{ store.headerTitle }}</h1>
			</div>
		</div>
		<div class="header-right">
			<!-- i class="fas fa-bars menu-icon" / -->
		</div>
	</header>
</template>

<script>
import EventBus from "@/services/event-bus.js"
import { store }  from "@/services/store.js"

/** 
 * After this many pixels the header title will scroll.
 * This should roughly equal to the empty padding+margin above the title font.
 */
const scrollAfterPx = 50

export default {
	name: "LiquidoHeader",
	
	data() {
		return {
			store,          // the title "store" that stores the current title. 
			showMenu: false,
			isSticky: false
		}
	},
	
	mounted() {
		// Add a scroll listener to dynamically fade the header text up and down when user scrolls
		document.getElementById("app").addEventListener("scroll", this.stickyHeader)
		this.stickyHeader()
	}	,

	beforeUnmount() {
		document.getElementById("app").removeEventListener("scroll")
	},

	methods: {
		/**
		 * When the main "app" is scrolled upwards for more then a given amount of pixels
		 * Then the "LIQUIDO" title will be replaced with the {{title}} of the page.
		 * The {{title}} will scroll into view from the bottom.
		 * (But all that only if the title is actually set.)
		 */
		stickyHeader() {
			let app = document.getElementById("app")
			let headerElem = document.getElementById("liquidoHeader")
			let pageTitleElem = document.getElementsByClassName("page-title")[0]
			if (!app || !headerElem) {
				return  // something is wrong, so just return
			}
			if (this.store.headerTitle == undefined) {
				headerElem.classList.remove("transition-header")
				if (pageTitleElem != null) {
					pageTitleElem.classList.remove("transition-page-title")
				}
			} else {				
				// we doo have a headerTitle
				if (this.isSticky === false && app.scrollTop > scrollAfterPx) {
					this.isSticky = true
					headerElem.classList.add("transition-header")
					if (pageTitleElem != null) {
						pageTitleElem.classList.add("transition-page-title")
					}
				} else if (this.isSticky === true && app.scrollTop < scrollAfterPx) {
					this.isSticky = false
					headerElem.classList.remove("transition-header")
					if (pageTitleElem != null) {
						pageTitleElem.classList.remove("transition-page-title")
					}
				}	
			}		
		},

		clickBack() {
			if (this.store.headerBackLink === "BACK") this.$router.go(-1)
			else if (this.store.headerBackLink) this.$router.push(this.store.headerBackLink)
		},
		
		clickHeaderCenter() {
			EventBus.emit(EventBus.Event.CLICK_HEADER_CENTER)
		},

		toggleMenu() {
			this.showMenu = !this.showMenu
		}

	}
}
</script>

<style lang="scss" scoped>

#liquidoHeader {
	display: flex;
	position: fixed;
	left: 0;
	top: 0;
	width: 100%;
	height: $header-height;

	color: white;

	flex-direction: row;
	justify-content: space-between;
	z-index: 999;
	transition: all 0.5s;
	background-color: $header_bg;
	opacity: 0.95;
	box-shadow: 0 2px 3px rgba(0, 0, 0, 0.3); /* horizontal, vertical, blur, color */
  z-index: 9999; /* make sure the header is on top of everything */
  
	
	// when user scrolls, then scroll LIQUIDO claim out towards the top
	// and let the center-title appear from the bottom
	&.transition-header {
		.liquido-claim {
			top: -1.5rem !important;
		}
		.center-title {
			top: 50% !important;
			transform: translate(-50%, -50%) !important;
			padding: 0;
			margin: 0;
			h1 {
				font-family: 'Libre Baskerville', serif;
				margin: 0;
				padding: 0;
			}
		}
	}
	
	.header-left {
		a {
			color: white !important
		}
		color: white;
		display: flex;
		flex: 0 0 30px;
		align-items: center;
		padding-left: 10px;
		font-size: 25px;
	}
	.header-center {
		flex-grow: 1;	
		text-align: center;
		position: relative;
		overflow: hidden;
		.liquido-claim {
			position: relative;
			top: 50%;
			transform: translateY(-50%);
			transition: top 0.5s;
			font-size: 1.5rem;
		}
		.center-title {
			position: absolute;
			top: 150%;
			left: 50%;
			width: 100%;
			transform: translateX(-50%);
			transition: top 0.5s;
			h2 { 
				margin: 0;
				//font-size: 1rem; 
			}
		}
	}
	.header-right {
		display: flex;
		flex: 0 0 30px;
		align-items: center;
		text-align: right;
		padding-right: 10px;
	}
	
}

</style>
