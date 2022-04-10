import { createRouter, createWebHistory } from 'vue-router'
import welcomeChat from "@/views/welcome-chat"
import loginPage from "@/views/login-page"
import teamHome from "@/views/team-home"
import pollsPage from "@/views/polls"
import showPoll from "@/views/poll-show"
import api from "@/services/liquido-graphql-client"
//import config from "config"
const log = require("loglevel")
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
			emailToken: route.query.token
		}),
		meta: {
			public: true
		}
	},
	{
		// Development login that can be used in testing
		path: "/devLogin",
		name: "devLogin",
		component: () => import("@/views/dev-login"),
		props: route => ({ 
			email: route.query.email,
			teamName: route.query.teamName,
			token: route.query.token
		}),
		meta: {
			public: true
		}
	},
	{
		path: "/welcome",
		name: "welcome",
		component: welcomeChat,
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
		component: () => import("@/views/poll-create"),
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
		component: () => import("@/views/proposal-add"),
		props: true,
	},
	{
		path: "/polls/:pollId/castVote",
		name: "castVote",
		component: () => import("@/views/cast-vote"),
		props: true,
	},
	{
		path: "/404",
		name: "pageNotFound",
		component: () => import("@/views/not-found-page"),
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
	//vue-router History mode needs web-server configuration https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations
	//VUE2: mode: "history",     // hash -> with "#" in URL    or "history" -> needs web server configuration
  history: createWebHistory(),
	//base: config.BASE_URL || "/",
	/*
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
 * @return A Promise that will resolve to the login data or reject when no or invalid JWT.
 */
async function tryToAuthenticate() {
	if (api.isAuthenticated()) return Promise.resolve(IS_ALREADY_AUTHENTICATED);  // although JWT could be expired, but this way we save one backend call
	let jwt = localStorage.getItem(api.LIQUIDO_JWT_KEY);
	if (jwt) {
		console.log("Attempting to login with JWT from localStorage ...", jwt)
		return api.loginWithJwt(jwt)
			.then(res => {
				log.info("Successfully authenticated from localStorage")
				return Promise.resolve(res)
			})
			.catch(err => {
				// return liquido error code, eg. JWT_TOKEN_EXPIRED or JWT_TOKEN_INVALID
				let errCode = err.response &&	err.response.data ? err.response.data.liquidoErrorCode : -1
				if (errCode === api.err.JWT_TOKEN_EXPIRED || errCode === api.err.JWT_TOKEN_INVALID) {
					//TODO: Can I refresh the token in this case? Or should I forward returning user to login page?
					log.debug("Removing expired JWT from localStorage")
					api.logout()
				} else {
					log.error("Cannot login with JWT", err)
				}
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
	return tryToAuthenticate().then(() => {
		log.debug("vue-router: authenticated", routeFrom.path, routeFrom.params, "=>", routeTo.path, routeTo.params)
		if (routeTo.path === "/" || routeTo.path === "/index.html") {
			return {name: "teamHome"}  
		} else {
			return true // allow navigation
		}
	}).catch(() => {
		if (process.env.NODE_ENV === "development")
			log.debug("vue-router: anonymous", routeFrom.path, "=>", routeTo.path)
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

