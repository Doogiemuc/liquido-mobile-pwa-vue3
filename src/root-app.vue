<template>
	<div id="rootApp">
		<liquido-header ref="liquido-header"></liquido-header>
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
		<router-view v-slot="{ Component }">
			<transition :name="transitionName">
				<component :is="Component" id="appContent" class="router-view container-lg"/>
			</transition>
		</router-view>
		<navbar-bottom v-if="showNavbarBottom"></navbar-bottom>
		<mobile-log-viewer  v-if="showDebugLog" ref="mobileLogViewRef"></mobile-log-viewer>
	</div>
</template>

<script>
/**
 * This rootApp is the root in the DOM tree.
 * It is responsible for routing between pages,
 * the slide left-right transition,
 * the global popup for infos and errors
 * and it offers some utility functions that are available to all components.
 */
import liquidoHeader from "@/components/liquido-header.vue"
import navbarBottom from "@/components/navbar-bottom.vue"
import popupModal from "@/components/popup-modal.vue"
import mobileLogViewer from "@/components/mobile-debug-log.vue"
import api from "@/services/liquido-graphql-client.js"
import EventBus from "@/services/event-bus.js"

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

/** save and restore the up/down scroll position of polls page (that shows the possibly long list of polls)  */
let pollsScrollPos = undefined

/** Liquido Root App */
export default {
	name: "LiquidoApp",
	// Remark: vue-i18n is configured in main.js! Do not overwrite it here by setting the i18n: property
	components: { liquidoHeader, navbarBottom, popupModal, mobileLogViewer },
	data() { 
		// These data attributes are reactive and available in EVERY sub-component as this.$root.<attributeName>
		return {
			transitionName: "", 	// CSS sliding transition between page components
			pollStatusFilter: undefined, 
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
		/* DEPRECATED: each component now sets its own backlink

		 * Show appropriate backlink in liquido-header
		 *
		 * show one poll -> back to list of polls
		 * add proposal  -> back to poll
		 * cast vote     -> back to poll
		 * otherwise don't show a back link
		 
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
		*/

		/** Shall the navbar be shown in the footer */
		showNavbarBottom() {
			return this.$route.path.match(/(polls|polls\/\d+)$/)
		},

		showDebugLog() {
			return process.env.NODE_ENV !== 'production'
		}
	},
	// watch the `$route` to determine the transition to use
	// https://router.vuejs.org/guide/advanced/transitions.html#per-route-transition
	watch: {
		$route(to, from) {
			console.log("$route change from " + from.name + " to " + to.name)
			this.transitionName = ""
			const fromOrder = page_order[from.name]
			const toOrder = page_order[to.name]
			if (to.name === "login") { this.transitionName = "" } else 
			if (fromOrder < toOrder) { this.transitionName = "slide-left" } else
			if (fromOrder > toOrder) { this.transitionName = "slide-right"}
			else { this.transitionName = "fade" }  // default is fade

			let app = document.getElementById("app")
			if (from.name === "polls") {
				//console.log("Saving scroll pos of " + from.name + " = " + app.scrollTop)
				pollsScrollPos = app.scrollTop
			} else 
			if (to.name === "polls" && pollsScrollPos !== undefined) {
				console.log("Restoring scroll pos of " + to.name + " = " + pollsScrollPos)
				app.scrollTop = pollsScrollPos
			} else {
				this.scrollToTop()
			}
		},
	},

	mounted() {
		EventBus.on(EventBus.Event.POLL_FILTER_CHANGED, (newFilter) => {
			console.log("Root app POLL_FILTER_CHANGED to", newFilter)
			this.pollStatusFilter = newFilter
		})

		//TODO: should I move this to main.js? Would be first. But there I cannot display any error.
		api.pingApi()
			.catch(res => {
				if (res.response && res.response.status === 401) {
					console.log("Login is expired")
					if (this.$route.name !== "login") this.$router.push({name: "login"})
				} else
				if (res.response && res.response.status > 200) {
					console.error("Network seems ok, but cannot ping backend", res)
					this.$refs.rootPopupModal.showWarning(this.$t("BackendNotReachable"))
				} else {
					console.error("No network. Backend is not reachable at all", res)  
					this.$refs.rootPopupModal.showWarning(this.$t("NetworkOffline"))
					//TODO: Do something: Show a general "offline" message at the top and implement an offline mode(?)
				}
			})

			// This has some consequences ... be carefull
			//this.$refs["mobileLogViewRef"].redefineConsoleMethods()
			//Check: does this also work?  mobileLogViewer.redefineConsoleMethods();
	},
	methods: {
		//
		// These methods are available as this.$root.<method> in all vue sub components of root-app
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
		 * Animate obj[attr] vom its current startVlaue to a finalValue in durationMs milliseconds.
		 * The animation will be performed with the window.requestAnimationFrame() method.
		 * 
		 * @param obj a javascript object
		 * @param attr name of attribute in obj that shall be animated
		 * @param finalValue the final value that obj[attr] shall be animated to
		 * @param durationMs how long the duration shall take in milliseconds
		 * 
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
		scrollElemToTop(elem, marginTop = 0, durationMs = 500) {
			//This would exist, but not in Safari for iOS :-(  elem.scrollIntoView({ behavior: 'smooth' });
			if (!elem) return
			let appElem = document.getElementById("app")
			let scrollTopFinalValue = elem.offsetTop - marginTop
			console.log("scrollElemToTop", elem.offsetTop, "-", marginTop, "=", scrollTopFinalValue)
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

// MUST set this to #appContent and not #rootApp, otherwise page jumps when slide left-right
#appContent {
	padding-top: $header-height;  // padding so that page content can bee seen under liquido-header
}

// Slide animation between pages
.router-view {
	transition: all 0.5s ease-in-out;
}

// Fade transtition (used in lists)
.fade-enter,
.fade-leave-to {
	opacity: 0;
}
.fade-leave-active {
	position: absolute;
	top: 0;
	width: 100%;
}

// Slide left-right animations on navigation

// This is added to the page that enters from the leeft
.slide-left-enter-from,
// or leaves to the right
.slide-right-leave-to {
	-webkit-transform: translate(100%, 0);
	transform: translate(100%, 0);
}
// This class is added to the page that leaves
.slide-left-leave-active,
.slide-right-leave-active {
	position: absolute;  // MUST position this page absolute, so that incomign page is shown correctly
	top: 0;
	width: 100%;
}
// This class is added to the page that leaves to the left
.slide-left-leave-to,
// or enters from the right
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
