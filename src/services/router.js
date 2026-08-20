import { createRouter, createWebHistory } from 'vue-router'
import { store }  from "@/services/store.js"
import api from "@/services/liquido-graphql-client.js"
import config from "config"
import log from 'loglevel'
import welcomeChat from "@/views/welcome-chat.vue"
import joinTeamV2 from '../views/join-team-v2.vue'
//import { route } from 'fontawesome'
if (import.meta.env.MODE === "development") log.enableAll()

const routes = [
	
	// ========= public routes ============
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
		component: () => import("@/views/login-page.vue"),
		props: route => ({
			email: route.query.email,
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
		path: "/join-v2",
		name: "joinTeamV2",
		component: joinTeamV2,
		// `props: true` would only pass route.params, and this path has none.
		// The inviteCode arrives as a query parameter: /join-v2?inviteCode=ABC123
		props: route => ({
			inviteCodeQueryParam: route.query.inviteCode
		}),
		meta: {
			public: true
		}
	},


	// ========= authenticated pages ============

	{
		path: "/team",
		name: "team",
		component: () => import("@/views/team-home.vue"),
		props: true,  // teamId, teamName, teamLogoUrl
	},
	{
		path: "/userhome",
		name: "userhome",
		component: () => import("@/views/user-home.vue"),
	},
	{
		path: "/polly/create",
		name: "createPolly",
		component: () => import("@/views/polly-create.vue"),
		meta: {
			public: true
		}
	},
	{
		path: "/polls",
		name: "polls",
		component: () => import("@/views/polls.vue"),
	},
	{
		path: "/polls/create",
		name: "createPoll",
		component: () => import("@/views/poll-create.vue"),
	},
	{
		// The all-in-one editor: create a poll and its proposals on one page.
		// MUST stay above "/polls/:pollId", or the param route swallows "new".
		path: "/polls/new",
		name: "newPoll",
		component: () => import("@/views/poll-edit.vue"),
	},
	{
		path: "/polls/:pollId",
		name: "showPoll",
		component: () => import("@/views/poll-show.vue"),
		props: true,
	}, 
	{
		// The same editor again, now editing a poll that already exists (ELABORATION only).
		path: "/polls/:pollId/edit",
		name: "editPoll",
		component: () => import("@/views/poll-edit.vue"),
		props: true,
	},
	{
		path: "/polls/:pollId/add",
		name: "addProposal",
		component: () => import("@/views/proposal-add.vue"),
		props: true,
	},
	{
		// Edit your OWN proposal, while the poll has not started yet.
		// Same component as addProposal: it switches to edit mode when a proposalId is present.
		path: "/polls/:pollId/editProposal/:proposalId",
		name: "editProposal",
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
		path: "/polls/:pollId/winner",
		name: "pollWinner",
		component: () => import("@/views/poll-winner.vue"),
		props: true,
	},
	{	
		path: "/forgotPassword",
		name: "forgotPassword",
		component: () => import("@/views/forgot-password.vue"),
		meta: {
			public: true
		}
	},
	// No "/login-via-sms" route: a mobilephone is optional in LIQUIDO and is no longer collected
	// anywhere in the UI, and the backend's requestSmsToken/loginWithSmsToken are commented out, so
	// the page's api calls hit operations that do not exist in the schema. login-via-sms.vue is kept
	// in the repo on purpose as the starting point for when SMS login is actually built.
	{	
		path: "/resetPassword",
		name: "resetPassword",
		component: () => import("@/views/forgot-password.vue"),
		// Optional query parameters: emailInputVal, resetPasswordToken
		meta: {
			public: true
		}
	},
	{
		// Public: the user clicks this straight out of their mail client, not logged in.
		path: "/verifyEmail",
		name: "verifyEmail",
		component: () => import("@/views/verify-email.vue"),
		props: route => ({ verifyToken: route.query.verifyToken }),
		meta: { public: true },
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

if (import.meta.env.MODE === "development") {
	routes.push({
		// Development login that can be used in testing
		path: "/devLogin",
		name: "devLogin",
		component: () => import("@/views/dev-login.vue"),
		props: route => ({
			email: route.query.email,
			teamName: route.query.teamName,
			// dev-login.vue declares this prop as `token`, and cy.devLogin() sends ?token=...
			// Mapping it to `emailToken` here meant the prop was never set and devLogin always
			// failed with "Need email and devLoginToken!".
			token: route.query.token
		}),
		meta: {
			public: true
		}
	})
	routes.push({
    path: '/_design-overview',
    component: () => import('@/views/_design-overview.vue'),
		meta: {
			public: true
		}
  })
}

const router = createRouter({
	// We use `createWebHistory()` for clean URL paths.
	// `createWebHashHistory()` with the hash(#) in the URL was necessary for iOS web app, but now also works fine like this.
	history: createWebHistory(config.BASE_URL),

	// Disable scroll behavior to prevent history.state warnings
	// Scroll position is managed in root-app.vue watch.$route instead
	scrollBehavior: () => false,
	
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
					localStorage.removeItem(api.LIQUIDO_JWT_KEY)
					log.debug("Removed expired/invalid JWT from localStorage")
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
		store.setHeaderBackTarget(undefined)
		store.clearHeaderRight()
	}
	
	return tryToAuthenticate().then(() => {
		log.debug("vue-router: authenticated", routeFrom.path, routeFrom.params, "=>", routeTo.path, routeTo.params)
		if (routeTo.path === "/" || routeTo.path === "/index.html") {
			return {name: "team"}  
		} else {
			return true // allow authenticated navigation
		}
	}).catch(() => {
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

