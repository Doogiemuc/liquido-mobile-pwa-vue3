<template>
	<div id="app">
		<liquido-header ref="liquido-header" :back-link="backLink" />
		<router-view id="appContent" class="router-view container-lg" v-slot="{ Component }">
			<transition :name="transitionName">
				<keep-alive>
					<component :is="Component" />
				</keep-alive>
			</transition>
		</router-view>
		<navbar-bottom v-if="showNavbarBottom"></navbar-bottom>
		<popup-modal 
			id="rootPopupModal"
			ref="rootPopupModal"
			:type="modalType"
			:title="modalTitle"
			:message="modalMessage"
			:content-class="modalContentClass"
			:primary-button-text="modalPrimaryButtonText"
			:secondary-button-text="modalSecondaryButtonText"
		>
		</popup-modal>
		<mobile-log-viewer v-if="showDebugLog"></mobile-log-viewer>
	</div>
</template>

<script>
import liquidoHeader from "@/components/liquido-header"
import navbarBottom from "@/components/navbar-bottom"
import popupModal from "@/components/popup-modal"
import mobileLogViewer from "@/components/mobile-debug-log.vue"
import api from "@/services/liquido-graphql-client"

/** Pages will slide from right to left in this order */
const page_order = {
	"index": 0,
	"welcome": 1,
	"login": 2,
	"teamHome": 3,
	"polls": 4,
	"createPoll": 5,
	"showPoll": 6,
	"addProposal": 7,
	"castVote": 8,
}


/** Liquido Root App */
export default {
	name: "LiquidoApp",
	// Remark: vue-i18n is configured in main.js! Do not overwrite it here by setting the i18n: property
	components: { liquidoHeader, navbarBottom, popupModal, mobileLogViewer },
	data() { 
		// These data attributes are reactive and available in EVERY sub-component as this.$root.<attributeName>
		return {
			transitionName: "", 	// CSS sliding transition between page components
			// Global popup-modal
			modalType: "success",
			modalTitle: "",
			modalMessage: "",
			modalContentClass: undefined,
			modalPrimaryButtonText: undefined,
			modalSecondaryButtonText: undefined,
		}
	},
	computed: {
		/**
		 * Show appropriate backlink in liquido-header
		 *
		 * show one poll -> back to list of polls
		 * add proposal  -> back to poll
		 * cast vote     -> back to poll
		 * otherwise don't show a back link
		 */
		backLink() {
			if (/^\/polls\/\d+$/.test(this.$route.path)) {
				return "/polls"
			} else if (/^\/polls\/\d+\/castVote$/.test(this.$route.path)) {
				return "BACK"
			} else if (/^\/polls\/\d+\/add$/.test(this.$route.path)) {
				return "BACK"
			}
			return undefined
		},
		/** which footer to show */
		showNavbarBottom() {
			return this.$route.path.match(/(polls|polls\/\d+)$/)
		},
		showDebugLog() {
			return false
		}
	},
	// watch the `$route` to determine the transition to use
	// https://router.vuejs.org/guide/advanced/transitions.html#per-route-transition
	watch: {
		$route(to, from) {
			this.transitionName = ""
			const fromOrder = page_order[from.name]
			const toOrder = page_order[to.name]
			if (to.name === "login") { this.transitionName = "" } else 
			if (fromOrder < toOrder) { this.transitionName = "slide-left" } else
			if (fromOrder > toOrder) { this.transitionName = "slide-right"}
			else { this.transitionName = "fade" }  // default is fade
		},
	},
	created() {
	},
	mounted() {
		api.pingApi()
			.catch(res => {
				if (res.response && res.response.status === 401) {
					console.info("Login is expired")
					if (this.$route.name !== "login") this.$router.push({name: "login"})
				} else
				if (res.response && res.response.status > 200) {
					console.error("Network seems ok, but cannot ping backend", res)
					this.$refs.rootPopupModal.showWarning(this.$t("BackendNotReachable"))
				} else {
					// This can only happen when backend is down while client clicks.
					console.error("Backend is not reachable at all", res)  
					this.$refs.rootPopupModal.showWarning(this.$t("NetworkOffline"))
				}
			})
	},
	methods: {
		//
		// Here comes some HTML UX magic.
		//

		/** scroll to top of page */
		scrollToTop() {
			this.$nextTick(() => {
				document.getElementsByTagName("html")[0].scrollTop = 0
			})
		},

		/** Animate scrolling to the very bottom of the page. */
		scrollToBottom() {
			this.$nextTick(() => {
        console.log("TODO: scrollToBottom not implemented yet")
				//$("html").animate({ scrollTop: $("#app").height() }, 1000)
			})
		},

		/**
		 * scroll an HTML elemant right under the header
		 * (as far up as possible, depending on content below the elem)
		 * @param {String} elem JQuery selector for dom elem
		 * @param {Number} margin margin below headerHeight in pixels (default 0)
		 */
		scrollElemToTop(/*elem, margin = 0*/) {
			//let scrollTop = $("#app").scrollTop() + $(elem).offset().top - margin
			this.$nextTick(() => {
        console.log("TODO: scrollElemToTop not implemented yet")
				//$("html").animate({ scrollTop: scrollTop }, 1000)
			})
		},

		/** Check if the bottom of elem is scrolled into view */
		isBottomInView(elem) {
			let docViewTop = window.scrollTop
			let docViewBottom = docViewTop + document.body.clientHeight
			let elemTop = elem.offsetTop
			let elemBottom = elemTop + elem.height
			return elemBottom <= docViewBottom
		},
	},
}
</script>

<style lang="scss">
// Import liquido global styles
@import "styles/liquido.scss";

// Slide animation between pages
.router-view {
	transition: all 0.5s ease-in-out;
}
.fade-enter,
.fade-leave-to {
	opacity: 0;
}
.fade-leave-active {
	position: absolute;
	width: 100%;
}

.slide-left-enter,
.slide-right-leave-to {
	-webkit-transform: translate(100%, 0);
	transform: translate(100%, 0);
}
.slide-left-leave-active,
.slide-right-leave-active {
	position: absolute;
	width: 100%;
}
.slide-left-leave-to,
.slide-right-enter {
	-webkit-transform: translate(-100%, 0);
	transform: translate(-100%, 0);
}

.slide-up-enter {
	-webkit-transform: translate(0, 100%);
	transform: translate(0, 100%);
}
.slide-up-leave-active {
	position: absolute;
	width: 100%;
}
.slide-up-leave-to {
	-webkit-transform: translate(0, 0);
	transform: translate(0, 0);
}

</style>
