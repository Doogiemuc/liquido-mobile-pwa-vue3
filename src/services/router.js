import { createRouter, createWebHistory } from 'vue-router'
import welcomeChat from "@/views/welcome-chat.vue"
import loginPage from "@/views/login-page.vue"

//TODO: load these as dynamic dependencies (only on demand later)
//      https://router.vuejs.org/guide/advanced/lazy-loading.html
import teamHome from "@/views/team-home.vue"
import pollsPage from "@/views/polls.vue"
import showPoll from "@/views/poll-show.vue"
import { store }  from "@/services/store.js"
import api from "@/services/liquido-graphql-client.js"
import config from "config"
import log from 'loglevel'
if (process.env.NODE_ENV === "development") log.enableAll()

const routes = [
	{
		path: "/",
		name: "index",
		// Will forward anonymous to /welcome 
		// With valid JWT to /team
		// and with expired JWT to /login
	},
	{
		path: "/login",
		name: "login",
		component: loginPage,
		props: route => ({
			email: route.query.email,
			emailToken: route.query.emailToken
		}),
		meta: {
			public: true
		}
	},
	{
		// Development login that can be used in testing
		path: "/devLogin",
		name: "devLogin",
		component: () => import("@/views/dev-login.vue"),
		props: route => ({ 
			email: route.query.email,
			teamName: route.query.teamName,
			emailToken: route.query.emailToken
		}),
		meta: {
			public: true
		}
	},
	{
		path: "/welcome",
		name: "welcome",
		component: welcomeChat,
		props: route => ({
			inviteCodeQueryParam: route.query.inviteCode
		}),
		meta: {
			public: true
		}
	},
	{
		path: "/team",
		name: "teamHome",
		component: teamHome
	},
	{
		path: "/polls",
		name: "polls",
		component: pollsPage,
		props: true  // status=ELABORATION|VOTING|FINISHED  or undefined
	},
	{
		path: "/polls/create",
		name: "createPoll",
		component: () => import("@/views/poll-create.vue"),
	},
	{
		path: "/polls/:pollId",
		name: "showPoll",
		component: showPoll,  // MUST import these directly, otherwiese navguard problems when using the navbar
		props: true,
	}, 
	{
		path: "/polls/:pollId/add",
		name: "addProposal",
		component: () => import("@/views/proposal-add.vue"),
		props: true,
	},
	{
		path: "/polls/:pollId/castVote",
		name: "castVote",
		component: () => import("@/views/cast-vote.vue"),
		props: true,
	},
	{
		path: "/design",
		name: "liquidoDesign",
		component: () => import("@/views/_design-page.vue"),
		meta: {
			public: true
		}
	},
	{
		path: "/404",
		name: "pageNotFound",
		component: () => import("@/views/not-found-page.vue"),
		//props: true,  //MAYBE: where to go "back" ?
		meta: {
			public: true
		}
	},
	{
		path: "/:pathMatch(.*)*",
		redirect: "404",
	},
]

const router = createRouter({
	// The history mode withouth hash "#" needs a special web-server configuration! 
	// https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations
	// Its advantage is that it provides clean SEO conform URLs, e.g. /liquido-mobile/login
  history: createWebHistory(config.BASE_URL),  // createWebHashHistory(config.BASE_URL),
	//base: config.BASE_URL || "/",
	/*

	//TODO: https://router.vuejs.org/guide/advanced/scroll-behavior.html
	scrollBehavior(to, from, savedPosition) {
		if (savedPosition) {
			log.debug("Returning to saved scroll position", savedPosition)
			return savedPosition
		} else {
			return { x: 0, y: 0 }
		}
	},
	*/
	routes,
})

const IS_ALREADY_AUTHENTICATED = -1
const IS_ANONYMOUS = -99

/**
 * On every request we try to authenticate the current user.
 * IF the user is already successfully authenticated (JWT, team & user info is loaded)
 * THEN return immideately (even if the JWT might be expired)
 * IF there is a stored JWT in localStorage, 
 * THEN try to authenticate with it against the backend.
 * IF this fails, then remove the (expired or invalid) JWT from localstorage
 * ELSE return login information
 * 
 * @return A Promise that will resolve to the login data or reject when no, invalid or expired JWT.
 */
async function tryToAuthenticate() {
	if (api.isAuthenticated()) return Promise.resolve(IS_ALREADY_AUTHENTICATED);  // although JWT could be expired, but this way we save one backend call
	let jwt = localStorage.getItem(api.LIQUIDO_JWT_KEY);
	//log.debug("tryToAuthenticate jwt: ", jwt)
	if (jwt) {
		log.debug("Attempting to login with JWT from localStorage ...")
		return api.loginWithJwt(jwt)
			.then(res => {
				log.info("Successfully authenticated from localStorage")
				return Promise.resolve(res)
			})
			.catch(err => {
				// return liquido error code, eg. JWT_TOKEN_EXPIRED or JWT_TOKEN_INVALID
				let errCode = err.response &&	err.response.data ? err.response.data.liquidoErrorCode : -1
				if (errCode === api.err.JWT_TOKEN_EXPIRED || errCode === api.err.JWT_TOKEN_INVALID) {
					log.debug("Removing expired JWT from localStorage")
				} else {
					log.debug("Cannot login with JWT. Will be removed.")  // err has already been logged
				}
				api.logout()
				return Promise.reject(err)
			})
	}
	else return Promise.reject(IS_ANONYMOUS) // no JWT, not authenticated at all
}


/**
 * Vue Router - Navigation guard
 * 
 * 1) Try to authenticate
 *
 * IF user is already authenticated THEN continue
 * ELSE IF there is a stored JWT in localStorage
 * THEN try to login with it at the backend.
 * 
 * IF user is now authenticated
 * 	IF an authenticated user navigates to '/'
 *  THEN forard him directly to his team-home page.
 *  ELSE let him continue
 * 
 * IF user is still not authenticated
 *   IF route is public then continue
 *   ELSE IF he navigates to "/" forward him to "/welcome"
 *   ELSE forward to "/login"
 * 
 * VUE Router next (for VUE 3)
 * https://next.router.vuejs.org/guide/advanced/navigation-guards.html#navigation-guards
 */
router.beforeEach(async (routeTo, routeFrom) => {
	//log.debug("beforeEach ENTER", routeFrom.path, "=>", routeTo.path)
	
	// Clear header title. Page may set it later when it is mounted.
	if (routeFrom.path !== routeTo.path) {
		//console.log("===== Router: Clear header")
		store.setHeaderTitle(undefined)
		store.setHeaderBackLink(undefined)
	}
	
	return tryToAuthenticate().then(() => {
		//log.debug("vue-router: authenticated", routeFrom.path, routeFrom.params, "=>", routeTo.path, routeTo.params)
		if (routeTo.path === "/" || routeTo.path === "/index.html") {
			return {name: "teamHome"}  
		} else {
			return true // allow authenticated navigation
		}
	}).catch(() => {
		//log.debug("vue-router: anonymous", routeFrom.path, "=>", routeTo.path)
		if (routeTo.meta.public) {
			return true
		} else if (routeTo.path === "/" || routeTo.path === "/index.html") {
			return {name: "welcome"}
		}	else {		
			return {name: "login"}
		}
	})
})

export default router

