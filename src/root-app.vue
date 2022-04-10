<template>
	<div id="rootApp">
		<liquido-header ref="liquido-header" :back-link="backLink" />
		<router-view v-slot="{ Component }">
			<transition :name="transitionName">
				<component :is="Component" id="appContent" class="router-view container-lg"/>
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
			this.scrollToTop()  // always scroll to top on every new page
		},
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
					console.error("No network. Backend is not reachable at all", res)  
					this.$refs.rootPopupModal.showWarning(this.$t("NetworkOffline"))
					//TODO: Do something: Show a general "offline" message (or implement an offline mode?)
				}
			})
	},
	methods: {
		//
		// Here comes some HTML UX magic.
		//

		/**
		 * INTERNAL: One step in an animation
		 * adapted https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
		 */
		step(timestamp, obj, attr, startTime, startValue, finalValue, durationMs) {
			if (startTime === undefined) startTime = timestamp
			const elapsed = timestamp - startTime
			obj[attr] = startValue + (finalValue - startValue) * (elapsed / durationMs)
			//console.log("animte", obj[attr])
			if (elapsed < durationMs) {
				window.requestAnimationFrame(timestamp => {
					this.step(timestamp, obj, attr, startTime, startValue, finalValue, durationMs)
				})
			} else {
				obj[attr] = finalValue  // make sure we have exactly the final value when animation finishes after durationMs
			}
		},
		
		/**
		 * Animate obj[attr] vom its current startVlaue to a finalValu in durationMs milliseconds.
		 */
		animate(obj, attr, finalValue, durationMs) {
			let startTime
			let startValue = obj[attr]
			window.requestAnimationFrame(timestamp => {
				this.step(timestamp, obj, attr, startTime, startValue, finalValue, durationMs)
			})
		},

		/** Scroll to top of page. No animation. */
		scrollToTop() {
			this.$nextTick(() => {
				document.getElementById("app").scrollTop = 0
			})
		},

		/** Animate scrolling to the very bottom of the page. */
		scrollToBottom(durationMs = 1000) {
			this.$nextTick(() => {
				let appContentHeight = document.getElementById("appContent").offsetHeight
				let appElem = document.getElementById("app")
				this.animate(appElem, "scrollTop", appContentHeight, durationMs)
			})
		},

		/**
		 * scroll an HTML elemant right under the header
		 * (as far up as possible, depending on content below the elem)
		 * @param {Object} elem the dom elem
		 * @param {Number} durationMs duration of scroll animation (default = 500 ms)
		 */
		scrollElemToTop(elem, durationMs = 500) {
			//This would exist, but not in Safari for iOS :-(  elem.scrollIntoView({ behavior: 'smooth' });
			let headerHeight = document.getElementById("liquidoHeader").offsetHeight + 10
			let appElem = document.getElementById("app")
			let scrollTopFinalValue = elem.offsetTop - headerHeight
			console.log("scrollElemToTop", elem, scrollTopFinalValue)
			this.animate(appElem, "scrollTop", scrollTopFinalValue, durationMs)
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

// Fade transtition
.fade-enter,
.fade-leave-to {
	opacity: 0;
}
.fade-leave-active {
	position: absolute;
	width: 100%;
}

// slide-left and slide-right transitions
.slide-left-enter-from,
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
.slide-right-enter-from {
	-webkit-transform: translate(-100%, 0);
	transform: translate(-100%, 0);
}

/* slide-up  ... not used
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
*/

</style>
