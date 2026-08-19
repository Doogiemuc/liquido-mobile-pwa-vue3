<template>
	<div id="rootApp" :class="{ 'is-pwa': isHomeScreenPWA }">
		<popup-modal
			id="rootPopupModal"
			ref="rootPopupModal"
			:type="modalType"
			:title="modalTitle"
			:message="modalMessage"
			:content-class="modalContentClass"
			:primary-button-text="modalPrimaryButtonText"
			:secondary-button-text="modalSecondaryButtonText"
			@clickPrimary="rootPopupClickPrimary"
			@clickSecondary="rootPopupClickSecondary"
		>
		</popup-modal>
		<liquido-header>
	
		</liquido-header>
		<router-view v-slot="{ Component }">
			<transition :name="transitionName">
				<component :is="Component" id="appContent" class="router-view container-lg" />
			</transition>
		</router-view>
		<mobile-debug-log v-if="config.showDebugLog" ref="mobileDebugLogRef"></mobile-debug-log>
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
//import liquidoHeader from "@/components/liquido-header.vue"
import liquidoHeader from "@/components/liquido-header.vue"
import popupModal from "@/components/popup-modal.vue"
import log from "loglevel"
import mobileDebugLog from "@/components/mobile-debug-log.vue"
import api from "@/services/liquido-graphql-client.js"
import EventBus from "@/services/event-bus.js"
import config from "config"

/**
 * joinTeam's `password` argument is non-null in the schema but is only used to CREATE a new user.
 * On the authenticated path the JWT identifies the caller and this value is never looked at, so a
 * placeholder is correct here - and necessary, because a user who logs in with a passkey has no
 * password for us to pass on.
 */
const PENDING_JOIN_PLACEHOLDER_PASSWORD = "unused-jwt-authenticates-this-join"

/** 
 * Pages will slide from right to left in this order 
 * Login and welcome page only do not slide, but fade in/out.
 * See router.js for the page names and their routes.
 */
const page_order = {
	"index": 0,
	"welcome": 1,
	"login": 1,     // welcome and login are on the same level, so they fade instead of sliding sideways
	"forgotPassword": 2,
	"userhome": 9,
	"team": 10,
	"polls": 11,
	"createPoll": 12,
	"newPoll": 12,      // the all-in-one editor sits at the same depth as createPoll
	"showPoll": 13,
	"addProposal": 14,
	"editPoll": 14,     // ...and its edit mode at the same depth as addProposal
	"castVote": 15,
}

/** Liquido Root App */
export default {
	i18n: {
		messages: {
			en: {
			},
			de: {
				// We carefully distinguish between these two cases!
				NetworkOffline: "Du bist offline. Bitte schalte dein WLAN ein.",
				BackendNotReachable: "Ich kann den LIQUIDO Server gerade nicht erreichen. Bitte prüfe ob du onlien bist.",
				DEV_OpenGraphQL: "DEV HINT: Open /graphql/schema.graphql",
				// Shown when a user logged in to accept an invite, but the join itself then failed.
				cannotJoinInvitedTeam: "Bitte entschuldige. Du bist erfolgreich eingeloggt, aber es gab gerade einen Fehler beim Beitreten in das neue Team. Bitte öffne den Einladungslink aus deiner Email noch einmal oder frag deinen Team-Admin."
			}
		},
	},
	name: "LiquidoApp",
	// Remark: vue-i18n is configured in main.js! Do not overwrite it here by setting the i18n: property
	components: { liquidoHeader, popupModal, mobileDebugLog },
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
		// Need to expose the module-level config import to the HTML template
		config() {
			return config
		},
		/** 
		 * Is our PWA currently running as a standalone web application on the iOS or android home screen 
		 * We need to adjust #appContent.margin-top accordingly.
		 */
		isHomeScreenPWA() {
			const iosStandalone = window.navigator.standalone === true  // Apple iOs specific
			const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches  // generic standard
			return iosStandalone || displayModeStandalone
		}
	},
	// watch the `$route` to determine the transition to use
	// https://router.vuejs.org/guide/advanced/transitions.html#per-route-transition
	watch: {
		$route(to, from) {
			//console.log("$route change from " + from.name + " to " + to.name)
			this.transitionName = "fade"  // default transition: fade between pages
			const fromOrder = page_order[from.name]
			const toOrder = page_order[to.name]
			if (fromOrder && toOrder) {	
				if (fromOrder < toOrder) { this.transitionName = "slide-left" }   // this is a prefix for the CSS classes. See CSS below 
				if (fromOrder > toOrder) { this.transitionName = "slide-right"}
			}
			
			/*
			let app = document.getElementById("app")
			if (from.name === "polls") {
				//console.log("Saving scroll pos of " + from.name + " = " + app.scrollTop)
				pollsScrollPos = app.scrollTop
			} else 
			if (to.name === "polls" && pollsScrollPos !== undefined) {
				//console.log("Restoring scroll pos of " + to.name + " = " + pollsScrollPos)
				//app.scrollTop = pollsScrollPos
			} else {
				// this.scrollToTop()   // this has a nasty UI bug, because it scrolls to the top of the page before the transition animation is finished
			}
			*/
		},
	},

	created() {
		
	},

	mounted() {
		
		
		// Enable my awesome mobile debug log on mobile devices.
		// This has some consequences ... be carefull ... you for example loose context and this conflicts with "loglevel" lib!
		// All log messages will come from mobile-debug-log.vue
		//this.$refs["mobileDebugLogRef"]?.redefineConsoleMethods()
		this.$refs["mobileDebugLogRef"]?.info(config.LIQUIDO_API_URL)
		this.$refs["mobileDebugLogRef"]?.debug(config)
		log.debug("Full LIQUIDO config:\n" + JSON.stringify(config, null, 2))

		const safeAreaTop = getComputedStyle(document.documentElement)
  		.getPropertyValue('--safe-area-inset-top')
		console.log('safe-area-inset-top:', safeAreaTop)
		this.$refs["mobileDebugLogRef"]?.debug("safe-area-inset-top: "+safeAreaTop)

		const safeAreaBottom = getComputedStyle(document.documentElement)
  		.getPropertyValue('--safe-area-inset-bottom')
		console.log('safe-area-inset-bottom:', safeAreaBottom)
		this.$refs["mobileDebugLogRef"]?.debug("safe-area-inset-bottom: "+safeAreaBottom)

		if (this.isHomeScreenPWA) {
			log.debug("I am a full screen web app");	
			this.$refs["mobileDebugLogRef"]?.debug("I am a full screen web app")
		}
	
		// Check if we can reach the liquido backend
		api.pingApi()
			.then(() => {
				console.log("We are online and backend is reachable at "+config.LIQUIDO_API_URL)
				this.$refs.rootPopupModal.hide()
			})
			.catch(res => {
				if (res.response && res.response.status === 401) {
					console.log("Login is expired")
					if (this.$route.name !== "login") this.$router.push({name: "login"})
				} else {
					console.error("Cannot reach backend at "+config.LIQUIDO_API_URL, res)
					this.showWarning(this.$t("BackendNotReachable"));
				}
			})
		
	},
	methods: {
		//
		// These methods are available as this.$root.<method> in all vue sub components of root-app
		//
		gotoPoll(pollId) {
			const poll = api.getCachedPolls().find(p => p.id == pollId)
			if (poll?.status === "FINISHED") {
				this.$router.push({name: "pollWinner", params: {pollId: pollId}})
			} else if (poll?.status === "VOTING" && !poll?.userAlreadyVoted) {
				this.$router.push({name: "castVote", params: {pollId: pollId}})
			} else {
				this.$router.push({name: "showPoll", params: {pollId: pollId}})
			}
		},
		
		gotoPolls() {
			this.$router.push({name: "polls"})
		},

		gotoCreateNewPoll() {
			this.$router.push({name: "newPoll"})
		},

		/**
		 * Go to the user's team after a successful login.
		 *
		 * If an inviteCode is sitting in the current route, the user got here from an invite link, found
		 * they were already registered, and logged in to prove it. Their JWT is exactly the identity
		 * proof that joinTeam wants, so finish that join first - otherwise they would land back in
		 * their OLD team and the invite would silently have done nothing.
		 *
		 * This is called while the router is still on /login, which is why the query is readable here
		 * and nothing had to be stored anywhere. Every login method funnels through this one method
		 * (password, passkey, Google, email token), so passkey users are covered too - which is the
		 * whole reason the join happens after login rather than on the join form.
		 */
		gotoTeam() {
			const inviteCode = this.$route.query.inviteCode
			if (inviteCode) {
				this.joinInvitedTeamThenGoToTeam(inviteCode)
			} else {
				this.$router.push({name: "team"})
			}
		},

		/**
		 * Complete a pending invite for the user who has just logged in, then show them the team.
		 *
		 * Navigates to /team either way. A failed join must not strand the user on the login page: the
		 * login itself succeeded, so they belong in the app. Only the invite is lost, and that is what
		 * the error message is for.
		 */
		async joinInvitedTeamThenGoToTeam(inviteCode) {
			const user = api.getCachedUser() || {}
			const member = { name: user.name, email: user.email }
			try {
				// joinTeam declares password as non-null, but the authenticated branch never reads it -
				// the JWT is the proof. Passing a placeholder is what lets a passkey user, who has no
				// password at all, join this way.
				const team = await api.joinTeam(inviteCode, member, PENDING_JOIN_PLACEHOLDER_PASSWORD)
				log.info("Joined invited team after login:", team?.teamName)
			} catch (err) {
				const errCode = err?.liquidoException?.liquidoErrorCode ?? err?.response?.data?.liquidoErrorCode
				if (errCode === api.err.CANNOT_JOIN_TEAM_ALREADY_MEMBER) {
					// Nothing went wrong - they were already in it. Not worth interrupting them for.
					log.info("Already a member of the invited team")
				} else {
					log.error("Could not join the invited team after login", err)
					this.showError(this.$t("cannotJoinInvitedTeam"), this.$t("Error"))
				}
			}
			this.$router.push({name: "team"})
		},

		/** 
		 * We have one beautiful error/success modal 
		 * that we reuse everywhere. This method is just a convenience shortcut
		 * available as this.$root.showError(errMsg, title) in all child components
		 */
		showError(errMsg, errTitle, primaryButtonText = this.$t('Ok'), secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			return this.$refs.rootPopupModal.showError(errMsg, errTitle, primaryButtonText, secondaryButtonText, primaryCallback, secondaryCallback)
		},
		showWarning(msg, title, primaryButtonText = this.$t('Ok'), secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			return this.$refs.rootPopupModal.showWarning(msg, title, primaryButtonText, secondaryButtonText, primaryCallback, secondaryCallback)
		},
		showSuccess(msg, title, primaryButtonText = this.$t('Ok'), secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			return this.$refs.rootPopupModal.showSuccess(msg, title, primaryButtonText, secondaryButtonText, primaryCallback, secondaryCallback)
		},
		showInfo(msg, title, primaryButtonText = this.$t('Ok'), secondaryButtonText = undefined, primaryCallback = undefined, secondaryCallback = undefined) {
			return this.$refs.rootPopupModal.showInfo(msg, title, primaryButtonText, secondaryButtonText, primaryCallback, secondaryCallback)
		},
		rootPopupClickPrimary(id) {
			EventBus.emit(EventBus.Event.ROOT_POPUP_CLICK_PRIMARY, id)
		},
		rootPopupClickSecondary(id) {
			EventBus.emit(EventBus.Event.ROOT_POPUP_CLICK_SECONDARY, id)
		},

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
		//TODO: Do this with  https://router.vuejs.org/guide/advanced/scroll-behavior.html#Delaying-the-scroll     "scrollBehaviour" in router!!!
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
		 * @param {Number} marginTop margin to the top of the page (default = 50 px)
		 * @param {Number} durationMs duration of scroll animation (default = 500 ms)
		 */
		scrollElemToTop(elem, marginTop = 55, durationMs = 500) {
			//This would exist, but not in Safari for iOS :-(  elem.scrollIntoView({ behavior: 'smooth' });
			if (!elem) return
			let appElem = document.getElementById("app")
			let scrollTopFinalValue = elem.offsetTop - marginTop
			console.log("scrollElemToTop id=", elem.id,  elem.offsetTop, "-", marginTop, "=", scrollTopFinalValue)
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

<style>
/* All root layout styles are consolidated in liquido.css */
</style>
