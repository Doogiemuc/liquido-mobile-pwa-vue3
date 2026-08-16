/**
 * LIQUIDO GraphQL client
 * 
 * Every call to the backend goes through this class.
 * Here we also handle data caching.
 * And login and logout because the currently logged in user with his team is also cached.
 */

import axios from "axios"
import config from "config"
import PopulatingCache from "populating-cache"
import EventBus from "@/services/event-bus.js"
import { graphQlQueryMock, initializeLiquidoGraphQlMock } from "./liquido-graphql-client.mock.js"
/** Liquido backend error codes. Must match LiquidoException.java from backend*/
import LiquidoExceptionCodes from "./LiquidoExceptionCodes.js"

const logNetworkCall = (level, message) => {
	EventBus.emit(EventBus.Event.MOBILE_DEBUG_LOG, { level, message })
}

const GRAPHQL = '/graphql'      // ==================== BASE PATH FOR GRAPHQL endpoint  //TODO: should that be in config.common.js ?

/*
  # Architecture design decisions in liquido-graphql-client.js

	We do not do (much) error handling here. This lies in the responsibility of the caller
	We only do simple sanity checks where we can prevent unneccessary calls to the backend.

	The class handles transparent caching of fetched data. Vue components do not directly access the cache.
	Callers can force a refetch when needed. (I thought about this decission a lot and went back and forth.
	The alternative would be to make Vue components handle the cache. An let this only be a pure GraphQL client.
	Component -> GraphQLClient -> Cache    OR   Component -> Cache -> GraphQLClient)

	This is a service class. It does not have a frontend. It does no navigation.
*/


//TODO: refactor / split into api-client.js, local-cache.js and liquido-auth.js  <= not that easy!

if (!config || !config.LIQUIDO_API_URL) {
	console.error("liquido-graphql-client: ERROR I have no config!")
} else {
	if (import.meta.env.MODE === "development") {
		console.log("liquido-graphql-client => " + config.LIQUIDO_API_URL + " in NODE_ENV=" + import.meta.env.MODE)
	}
}

// Configure axios HTTP REST client to point to our graphQL backend
axios.defaults.baseURL = config.LIQUIDO_API_URL

// Default global timeout = 10 secs
axios.defaults.timeout = 10000

/** This will be called for HTTP resopnse status 2xx */
let onSuccess = (response) => {
	if (response.config.url !== GRAPHQL) logNetworkCall("debug", `${response.config?.method?.toUpperCase()} ${response.config?.url} -> ${response.status}`)
	return response
}

/** 
 * Sophisticated logging of HTTP error messages is crucial!
 * You have no idea how many times this has saved me! 
 * This will be called for any response status >=400
 * 
 * First we check if there is a network error
 * Then we check for severe errors 5xx, and log them.
 * For all others we let the normal flow continue.
 */
let onError   = (error) => {
	logNetworkCall("warn", `${error.config?.method?.toUpperCase()} ${error.config?.url} -> ${error.response?.status || error.message}`)
	if (!error.response) {
		console.warn("Network error: no response at all")
	} else 
	if (error.data && error.data.includes("ECONNREFUSED") ||
		error.response && error.response.body && error.response.body.includes("ECONNREFUSED")) {
		console.warn("ECONNREFUSED: Network connection refused.")
	} else if (error.response && error.response.status >= 400 && error.response.status < 500) { 
		console.warn("liquido-graphql-client: Invalid request (4xx):", error) 
	} else if (error.response && error.response.status >= 500) { 
		console.error("liquido-graphql-client: Internal Server Error(5xx):", error) 
	} else {
		console.error("Very strange unknown HTTP error", error)
	}

	// try to log some additional debug info
	if (error.response && error.response.data) {
		let msg = "liquido-graphql-client: error.response.data=" + JSON.stringify(error.response.data)
		if (error.response.data.liquidoErrorPayload)
			msg += "\nLiquidoErrorPayLoad:", JSON.stringify(error.response.data.liquidoErrorPayload)
		console.debug(msg)
	}
	return Promise.reject(error);
}


axios.interceptors.request.use(request => {
	let message = `${request.method?.toUpperCase()} ${request.url}`
	if (request.url !== GRAPHQL) logNetworkCall("debug", message)
	return request
})
axios.interceptors.response.use(onSuccess, onError)

/**
 * This is the central API client that calls the backend.
 * Errors are logged here. But must be handled by the caller!
 * GraphQL always returns HTTP 200.
 * If there was an error, then the response will contain an `errors` array.
 * 
 * @param {String} graphql GraphQL Query. This is NOT JSON! This is GraphQL syntax!
 * @returns GraphQL result as specified by GraphQL-spec { data: {}, errors: [] }
 */
const graphQlQuery = function(query, variables) {
	if (config.mockBackend) {
		return graphQlQueryMock(query, variables)
	} else {
		logNetworkCall("debug", query?.slice(0,40))
		return axios.post(GRAPHQL, { query: query, variables: variables })
			.then(res => {
				// graphQL's way of returning errors, as defined in the GraphQL spec
				// https://graphql.org/learn/serving-over-http/#http-status-codes
				if (res.data && res.data.errors && res.data.errors.length > 0) {
					console.info("graphQlQuery() received liquidoException: "+JSON.stringify(res.data.errors[0]?.extensions.liquidoException), res.data)
					// add the first liquidoException to the response data, so that the caller can handle it more easily
					res.data.liquidoException = res.data.errors[0].extensions.liquidoException
					return Promise.reject(res.data)
				}
				return res.data // This is the axios HTTP "data". The graphQL response contains another "res.data.data" and the "res.data.errors" attribute. I know, it's confusing.
			})
			// No error handling here! Upstream caller is responsible to handle errors
	}
}


/** Shorthands for JQL return values */
const JQL_LOGIN_USER = `{ id name email mobilephone picture website hasWebauthn } `
const JQL_USER = `{ id name email mobilephone picture website  } `
const JQL_TEAM_MEMBER = `{ role joinedAt user ${JQL_USER} } `
const JQL_PROPOSAL =  `{ id title description icon status createdAt numSupporters likedByCurrentUser createdBy ${JQL_USER} } `   // no "is" before likedByCurrentUser!
const JQL_POLL = `{ id title status createdAt updatedAt votingStartAt votingEndAt userAlreadyVoted numBallots membersCanAddProposals proposals ${JQL_PROPOSAL} winner ${JQL_PROPOSAL}  } `  //TODO: duelMatrix { data }
const JQL_TEAM = `{ id teamName inviteCode ` +
		`members ${JQL_TEAM_MEMBER} ` +
		`polls ${JQL_POLL} } `
/** All teams of the logged in user, for the team switcher. Just enough to label and switch. */
const JQL_TEAM_SUMMARY = `{ id teamName } `

// POLLY - quick and easy little polls
const JQL_POLLY = `{ id title status createdAt updatedAt userAlreadyVoted proposals ${JQL_PROPOSAL} winner ${JQL_PROPOSAL}  } `


const JQL = {
	TEAM: JQL_TEAM,
	PROPOSAL: JQL_PROPOSAL,
	CREATE_OR_JOIN_TEAM_RESULT: `{ ` +
		`team ${JQL_TEAM} ` +
		`user ${JQL_LOGIN_USER} ` +
		`teams ${JQL_TEAM_SUMMARY} ` +
		`jwt } `,
	POLL: JQL_POLL,
	POLLY: JQL_POLLY
}



// ============ Client side cache for team and user data ================

/**
 * This fetch func loads the team data from the backend
 */
const fetchTeamFunc = function(path) {
	if (path === "team") {
		console.debug("fetchTeamFunc: Fetch own team from backend")
		let graphQL = `query { team ${JQL.TEAM} }`
		return graphQlQuery(graphQL).then(res => {
			EventBus.emit(EventBus.Event.POLLS_LOADED, res.data.team.polls)
			return res.data.team
		})
	} else {
		return Promise.reject(new Error("Invalid path fetchTeamFunc(path="+JSON.stringify(path)+")"))
	}
}

const teamsCacheConfig = {
	fetchFunc: fetchTeamFunc,
	ttl: 10*60*1000,		// 10 minutes for team cache
	referencedPathAttr: "$ref",
	idAttr: "id",
}

const teamCache = new PopulatingCache(teamsCacheConfig)

// ============ Client side cache for polls and their proposals ================

/**
 * Fetch all polls or one poll from backend
 * @param path "polls" or {poll: 4711} for one specific poll
 * @emits event POLL_LOADED or POLLS_LOADED
 */
const fetchPollFunc = function(path) {
	if (path[0] === "polls") {
		console.debug("fetchPollFunc: Fetch all polls of team from backend")
		let graphQL = `query { polls ${JQL.POLL} }`
		return graphQlQuery(graphQL).then(res => {
			EventBus.emit(EventBus.Event.POLLS_LOADED, res.data.polls)
			return res.data.polls
		})
	} else if (path[0].polls) {
		console.debug("Fetch one poll from backend: "+JSON.stringify(path))
		let pollId = path[0].polls
		let graphQL = `query poll($pollId: BigInteger!) { poll(pollId: $pollId) ${JQL.POLL} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId) }).then(res => {
			EventBus.emit(EventBus.Event.POLL_LOADED, res.data.poll)  // notify listeners that ONE poll has been (re)loaded from the backend
			return res.data.poll
		})
	} else {
		return Promise.reject(new Error("Cannot fetch poll(s) at path: "+JSON.stringify(path)))
	}
}

const pollsCacheConfig = {
	fetchFunc: fetchPollFunc,
	ttl: 60*1000,				// 60 seconds for polls Cache
	referencedPathAttr: "$ref",
	idAttr: "id",
}

const pollsCache = new PopulatingCache(pollsCacheConfig)
pollsCache.put("polls", [])  // make sure there is at least an empty array, until polls are loaded from backend (after login)


/**
 * ===================== exported API methods =======================
 */
let graphQlApi = {

  // Implementation note: All API methods do not have any error handling.
	// There is only some logging in the axios interceptor above.
	// If something goes wrong, then the caller is responsible to catch()
	// and process the error.

	/** Ping the backend to check if it's alive and reachable. */
	async pingApi() {
		return graphQlQuery("query { ping }")
	},

	/**
	 * get GraphQL schema.
	 * This can also be used to check if the backend GraphQL API is up and running.
	 * @returns the GraphQL schema
	 */ 
	async getGraphQLSchema() {
		return axios.get('/graphql/schema.graphql')
	},
	

	/**
	 * Login user into team. Store JWT for future requests.
	 * Will also put currentUser, team and jwt into the `teamCache`.
	 * This is called with the response data from a createNewTeam() or jointTeam() call.
	 * @param {Object} team Team with members[] and polls[]
	 * @param {Object} user currently logged in user
	 * @param {String} jwt JsonWebToken received from server
	 * @param {Array} teams (optional) all teams this user is a member of, for the team switcher
	 */
	login(team, user, jwt, teams) {
		this.teamCache.put(this.TEAM_KEY, team)
		this.teamCache.put(this.CURRENT_USER_KEY, user)
		this.teamCache.put(this.JWT_KEY, jwt)
		this.teamCache.put(this.ALL_USER_TEAMS_KEY, teams || [])
		this.putPollsIntoCache(team.polls)
		if (localStorage != null) localStorage.setItem(this.LIQUIDO_JWT_KEY, jwt)
		axios.defaults.headers.common["Authorization"] = "Bearer " + jwt
		console.debug("Login <"+user.email+"> into team '" + team.teamName  + "'")
		EventBus.emit(EventBus.Event.LOGIN, {team, user, jwt})
	},

	logout() {
		axios.defaults.headers.common["Authorization"] = undefined
		let userEmail = this.getCachedUser() ? this.getCachedUser().email : ""
		console.debug("Logout <"+userEmail+">")
		if (localStorage != null) localStorage.removeItem(this.LIQUIDO_JWT_KEY)
		delete axios.defaults.headers.common["Authorization"]
		this.teamCache.emptyCache()
		this.pollsCache.emptyCache()
		EventBus.emit(EventBus.Event.LOGOUT, userEmail)
	},

	/**
	 * Switch the current session into another team of the same user.
	 * The user MUST already be logged in, and MUST be a member of that team. The backend checks both.
	 * On success this replaces the whole login state, including the JWT, exactly like a fresh login.
	 *
	 * @param {Number} teamId id of another team of the currently logged in user
	 * @returns {Object} login data with the new team, user and jwt
	 */
	async switchTeam(teamId) {
		let graphQL = `mutation switchTeam($teamId: BigInteger!) { switchTeam(teamId: $teamId) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL, { teamId: Number(teamId) })
			.then(response => {
				let res = response.data.switchTeam
				// MUST empty the polls cache BEFORE login() refills it.
				// putPollsIntoCache() only ever puts under "polls/<id>", it never removes. Without this
				// the previous team's polls would stay behind and getCachedPolls() would hand back a
				// mix of two teams' polls - in a voting app. We cannot just call logout() instead,
				// because that also drops the JWT and emits LOGOUT.
				this.pollsCache.emptyCache()
				this.login(res.team, res.user, res.jwt, res.teams)
				console.debug("Switched into team:", res.team.teamName)
				return res
			})
	},

	/**
	 * This sets a special header `jwtTokenString` which is used by the
	 * MongoDB Atlas GraphQL endpoint.
	 * @param {String} jwt JsonWebToken
	 */
	setJwtTokenString(jwt) {
		axios.defaults.headers.common["jwtTokenString"] = jwt
	},

	/* ===== Synchronous utility methods that do not call the backend ========= */

	/** 
	 * Check if there currently is an authenticated user. 
	 * This is called quite often and needs to be sync and fast!
	 */
	isAuthenticated() {
		const memoryJwt = this.teamCache.getSync(this.JWT_KEY, false)
		const persistentJwt = localStorage.getItem(this.LIQUIDO_JWT_KEY)
		
		return memoryJwt !== undefined && 
			memoryJwt === persistentJwt &&
			this.getCachedTeam() !== undefined &&
			this.getCachedUser() !== undefined
	},

	/** 
	 * Synchrounously get the currently logged in user from local cache.
	 * May return undefined but will not throw when value is expired.
	 * @return {Object} Currently logged in user from local cache or undefined if no one is logged in or login is expired
	 */
	getCachedUser() {
		return this.teamCache.getSync(this.CURRENT_USER_KEY, false)
	},

	/**
	 * Synchronously get the current user's team from the local cache.
	 * @returns currently logged in user (if any)
	 */
	getCachedTeam() {
		return this.teamCache.getSync(this.TEAM_KEY, false)
	},

	/**
	 * Synchronously get ALL teams that the logged in user is a member of.
	 * Note the deliberately different name: getCachedTeam() above returns the ONE team the user is
	 * currently logged into, this returns EVERY team they belong to. Two very different things, so
	 * they do not get two near-identical names.
	 *
	 * @returns {Array} array of { id, teamName }, or an empty array when no one is logged in
	 */
	getAllUserTeams() {
		return this.teamCache.getSync(this.ALL_USER_TEAMS_KEY, false) || []
	},

	/** 
	 * Check if currently logged in user is the admin of his team. 
	 * @return false if no one is logged in or currently logged in user is not the admin
	 */
	isAdmin() {
		let cachedUser = this.getCachedUser()
		let team        = this.getCachedTeam()
		if (!cachedUser || !team) return false
		return team.members.filter(tm => tm.role == "ADMIN").map(admin => admin.user.id).includes(cachedUser.id)
	},

	/**
	 * Put the given array of polls into the cache under their ids.
	 * This will <b>replace</b> these polls in the cache.
	 * @param {Array} pollsArray array of polls
	 */
	putPollsIntoCache(pollsArray) {
		if (!Array.isArray(pollsArray)) {
			console.warn("Need array of polls to putPollsIntoCache!")
			return
		}
		pollsArray.forEach(poll => {
			this.pollsCache.put("polls/"+poll.id, poll)
		})
		EventBus.emit(EventBus.Event.POLLS_LOADED, pollsArray)
	},

	/****************************************************************
	 * API calls against backend
	 * that can be executed anonymously, eg. for logging in
	 * create or join a team
	 *****************************************************************/

	/**
	 * Load data about the user's team. This call must be authenticated with a JWT.
	 * @returns Info about user's team
	 * @rejects When JWT is missing, invalid, expired, ...
	 */
	loginWithJwt(jwt) {
		if (!jwt) throw new Error("Need JWT to login!")
		let graphQL = `query { loginWithJwt ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		axios.defaults.headers.common["Authorization"] = "Bearer " + jwt
		return graphQlQuery(graphQL)
			.then(res => {
				this.login(res.data.loginWithJwt.team, res.data.loginWithJwt.user, res.data.loginWithJwt.jwt, res.data.loginWithJwt.teams)
				return res.data.loginWithJwt
			})
	},

	/**
	 * When an already registered user wants to login, 
	 * LIQUIDO can send him a magic link via email.
	 * The user MUST have access to his own email inbox.
	 * 
	 * @param {String} email email of a registered user
	 * @returns Promise.resolve(), when email was sent successfully
	 */
	requestEmailLoginLink(email) {
		if (!email) throw new Error("Need email to log in!")
		let graphQL = `query requestEmailLoginLink($email: String!) { requestEmailLoginLink(email: $email) }`
		return graphQlQuery(graphQL, { email })
	},

	/**
	 * login with link from email (contains email and authToken)
	 */
	loginWithEmailPassword(email, password) {
		if (!email) throw new Error("Need email to log in!")
		if (!password) throw new Error("Need password to log in!")
		let graphQL = `query loginWithEmailPassword($email: String!, $password: String!) { loginWithEmailPassword(email: $email, password: $password) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL, { email, password }).then(response => {
			let res = response.data.loginWithEmailPassword
			this.login(res.team, res.user, res.jwt, res.teams)
			return res
		})
	},

	/**
	 * Request a password reset for a user.
	 * @param {String} email must be a registered user email
	 * @returns 
	 */
	requestPasswordReset(email) {
		if (!email) throw new Error("Need email to request password reset!")
		return axios.get('/login/requestPasswordResetEmail', {
			params: { email: email }
		}).then(res => res.data)
		/*
		//MAYBE: change requestPasswordReset email back to GraphQL, once the Quarkus bug is fixed
		let graphQL = `query { requestPasswordReset(email: "${email}") }`
		return graphQlQuery(graphQL)
			.then(res => {
				return res.data.requestPasswordReset
			})
				*/
	},

	/**
	 * Set a new password with the one-time token from the reset email.
	 * POST with a JSON body, not GET with query params - a one-time token and a plaintext password
	 * must not land in access logs or browser history. The backend only accepts POST; GET answers 405.
	 */
	resetPassword(email, resetPasswordToken, newPassword) {
		return axios.post('/login/resetPassword', {
			email: email,
			resetPasswordToken: resetPasswordToken,
			newPassword: newPassword
		}).then(res => res.data)
		/*
		let graphQL = `query { resetPassword(email: "${email}", resetPasswordToken: "${resetPasswordToken}", newPassword: "${newPassword}") }`
		return graphQlQuery(graphQL)
			.then(res => {
				return res.data.resetPassword
			})
		*/
	},

	/**
	 * Google OneTap Login: send the googleIdToken to the backend
	 * and receive login info in response	
	 */
	googleOneTapLogin(googleIdToken) {
		let graphQL = `query googleOneTapLogin($googleIdToken: String!) { googleOneTapLogin(googleIdToken: $googleIdToken) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL, { googleIdToken }).then(response => {
			let res = response.data.googleOneTapLogin
			this.login(res.team, res.user, res.jwt, res.teams)
			return res
		})
	},


	/**
	 * Request auth token for login. 
	 * Backend will call Twilio API to send a one time login token to the user
	 * @param mobilephone Users mobilephone that must exist in the DB
	 * @param devLoginToken (optional) TESTs can send the devLoginToken to fake the request.
	 */
	requestAuthToken(mobilephone, devLoginToken) {
		let graphQL = `query authToken($mobilephone: String!, $devLoginToken: String!) { authToken(mobilephone: $mobilephone, devLoginToken: $devLoginToken) }`
		return graphQlQuery(graphQL, { mobilephone, devLoginToken })
	},

	/**
	 * try to login with they authToken that the user has entered.
	 */
	loginWithAuthToken(mobilephone, authToken) {
		if (!mobilephone) throw new Error("Need mobilephone to log in!")
		if (!authToken) throw new Error("Need authToken to log in!")
		let graphQL = `query loginWithAuthToken($mobilephone: String!, $authToken: String!) { loginWithAuthToken(mobilephone: $mobilephone, authToken: $authToken) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL, { mobilephone, authToken }).then(response => {
			let res = response.data.loginWithAuthToken
			this.login(res.team, res.user, res.jwt, res.teams)
			return res
		})
	},

	/* ================== WebAuthn REST client ==================== */

	//TODO:  Move the WebAuthnREST client into webauthn-service.js  But then what about mocking?

	/**
	 * Check if that email is a registered user, ie. that email is known
	 * in the backend database.
	 * Will also return if that user has WebAuthn authenticators.
	 * This is used in the login flow to determine if we should show the "Login with WebAuthn" button.
	 * This method calls a special REST endpoint. No login is required to call this endpoint.
	 * 
	 * @param {String} email The user's email address
	 * @return {Object } { status: "REGISTERED", email: "<registered_email>", webauthn: true }  or { status: "UNKNOWN" } if user is not registered
	 */
	async checkLoginEmail(email) {
		if (!email) throw new Error("Email is required to check WebAuthn availability")
		return axios.get('/login/check-login-email', {
			params: { email: email }
		}).then(res => res.data)
	},

	/**
	 * Request webauthn registration options (challenge, rp, user, pubKeyCredParams)
	 * for the currently logged in user. Must be authenticated!
	 * This sets a cookie!
	 */
	async getWebAuthnRegistrationChallenge() {
		// quarkus-security-webauthn would provide it's own endpoint: /q/webauthn/register-options-challenge?username=testuser
		// But we use our own custom implementation, adapted to liquido authentication scheme via JWT.
		return axios.get(
			'/webauthn/register-options-challenge',
			{ withCredentials: true }  // required!
		).then(res => { 
				console.log("GET /webauthn/register-options-challenge", res.data)
				return res.data
			})
	},

	/**
	 * Submit attestation (credential) back to server for verification and receive final login payload
	 * Must send above cookie!
	 * @param {Object} credentialResponse JSON response as returned by getWebAuthnRegistrationChallenge()
	 * @param {String} authenticatorLabel name of this authenticator
	 * @return HTTP 204
	 */
	async submitWebAuthnRegistration(credentialResponse, authenticatorLabel) {
		return axios({
			method: 'POST',
			url: '/webauthn/register',
			params: {
				label: authenticatorLabel  // Yes POST requests may have URL query parameters!
			},
			data: credentialResponse,
			withCredentials: true  // required. Sends cookie that was set in GET /register-options-challenge back to server
		}).then(res => {
			console.log("POST /webauthn/register SUCCESSFULLY registered new authenticator", res.data)
			return res.data
		})
	},

	/**
	 * Request authentication options (challenge, allowCredentials) from backend.
	 * Typically called after validating password on server side.
	 * @param {String} email
	 * @param {String} password (optional) - server may require password to issue assertion options
	 */
	async getWebAuthnLoginChallenge(email, password) {
		if (!email) throw new Error("Need email for getting WebAuthn login-options-challenge")
		return axios.get('/webauthn/login-options-challenge', { 
			params: { email: email, password: password },
			withCredentials: true  // required!
		}).then(res => res.data)
	},

	/**
	 * Submit assertion (credential) to server for verification and receive final login payload
	 * @param {Object} credentialResponse
	 */
	async submitWebAuthnLogin(credentialResponse) {
		return axios({
			method: 'POST',
			url: '/webauthn/login',
			data: credentialResponse,
			withCredentials: true
		}).then(res => res.data)
	},

	/** 
	 * [DEV] Quick development login. This calls the REST backend!
	 * @param email users email. User must exist in team
	 * @param teamName team to login, optional for the client; the backend mock only needs email
	 * @param token valid and correct devLogin.token. Will be validated in backend. This is like a simulated SMS token.
	 * @return login data with team, user and jwt (same as a joinTeam calls)
	 */
	async devLogin(email, teamName, devLoginToken) {
		if (!["development", "test", "int"].includes(import.meta.env.MODE))
			return Promise.reject("devLogin is only allowed in NODE_ENV development, test or int")
		if (!email || !devLoginToken) 
			return Promise.reject("Need email and devLoginToken!")
		/*
		return axios({
			method: "GET", 
			url: "/dev/getJWT",
			params: {
				email: email,
				teamName: teamName,
				token: devLoginToken
			}
		*/
		let graphQL = `query devLogin($email: String!, $devLoginToken: String!) { devLogin(email: $email, devLoginToken: $devLoginToken) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL, { email, devLoginToken })
			.then(res => {
				console.log("API: devLogin <"+email+">")
				this.login(res.data.devLogin.team, res.data.devLogin.user, res.data.devLogin.jwt, res.data.devLogin.teams)
				return res.data.devLogin
			})
	},

	/**
	 * Create a new team. 
	 * @param {String} teamName name of new team
	 * @param {Object} admin first admin of new team 
	 */
	async createNewTeam(teamName, admin, password) {
		let graphQL = `mutation createNewTeam($teamName: String!, $admin: UserEntityInput!, $password: String!) { ` + 
			` createNewTeam(teamName: $teamName, admin: $admin, password: $password) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		let variables = {
			teamName: teamName,
			admin: admin,
			password: password
		}
		//console.log("createNewTeam Query:\n", graphQL, "variables:\n", JSON.stringify(variables))

		return graphQlQuery(graphQL, variables)
			.then(res => {
				//console.log("CreateNewTeam returned\n", JSON.stringify(res, null, 2))
				let team = res.data.createNewTeam.team
				this.login(
					team,
					res.data.createNewTeam.user,  // admin
					res.data.createNewTeam.jwt,
					res.data.createNewTeam.teams
				)
				console.debug("Created new team:", team)
				return team
			})
			// There is deliberately no error handling here, because we can't handle the error in this method :-)
			// Only catch errors if you can do something about it. Otherwise simply let the rejection bubble up the call chain.
			// Further up some UI method will do something about the error, e.g. show an meaningful error message to the user.
	},

	/**
	 * Get info about a team that I like to join, when I have an inviteCode
	 * @param {String} inviteCode a team's inviteCode
	 * @returns the team
	 */
	async getTeamForInviteCode(inviteCode) {
		let graphQL = `query teamForInviteCode($inviteCode: String!) { teamForInviteCode(inviteCode: $inviteCode) ${JQL.TEAM} }`
		return graphQlQuery(graphQL, { inviteCode })
			.then(res => res.data.teamForInviteCode)
	},

	/**
	 * Join a team with inviteCode
	 * @param {String} inviteCode alphanumerical invite code that the admin of the team shared
	 * @param {Object} member user data of the new team member that want's to join
	 * @param {String} password plain text password of the new user
	 */
	async joinTeam(inviteCode, member, password) {
		//TODO: password only as a fallback for passkey
		let graphQL = `mutation joinTeam($inviteCode: String!, $member: UserEntityInput!, $password: String!) { ` + 
			` joinTeam(inviteCode: $inviteCode, member: $member, password: $password) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		let variables = {
			inviteCode: inviteCode,
			member: member,
			password: password
		}
		return graphQlQuery(graphQL, variables)
			.then(res => {
				let team = res.data.joinTeam.team
				this.login(
					team,
					res.data.joinTeam.user,
					res.data.joinTeam.jwt,
					res.data.joinTeam.teams
				)
				console.debug("Joined team:", team)
				return team
			})
	},

	/**********************************************************************
	 * Polly
	 **********************************************************************/

	/**
	 * A Polly is a quick and easy poll.
	 * @param {Object} polly a polly object with title and proposals[] (each proposal has title, description, icon)
	 */
	async savePolly(polly) {
		const proposalTitles = (polly.proposals || [])
			.map(proposal => proposal?.title?.trim())
			.filter(Boolean)
		let graphQL = `mutation savePolly($title: String!, $proposalTitles: [String!]!) { savePolly(title: $title, proposalTitles: $proposalTitles) ${JQL_POLLY} }`
		return graphQlQuery(graphQL, {
			title: polly.title.trim(),
			proposalTitles,
		}).then(res => {
			let polly = res.data.savePolly
			console.debug("Saved new polly:", polly)
			return polly
		})
	},

	/**
	 * Edit an existing polly (title and proposals).
	 * @param {Number} pollId polly ID
	 * @param {String} title new polly title
	 * @param {Array} proposalTitles array of proposal title strings
	 * @returns {Object} the updated polly
	 */
	async editPolly(pollId, title, proposalTitles) {
		let graphQL = `mutation editPolly($pollId: BigInteger!, $title: String!, $proposalTitles: [String!]!) { editPolly(pollId: $pollId, title: $title, proposalTitles: $proposalTitles) ${JQL_POLLY} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId), title: title.trim(), proposalTitles })
			.then(res => {
				let polly = res.data.editPolly
				console.debug("Updated polly:", polly)
				return polly
			})
	},

	/**
	 * Start the voting phase for a polly.
	 * Backend will send admin link and share link to the user's email.
	 * @param {Number} pollId polly ID
	 * @param {String} userEmail email to send links to
	 * @returns {Object} the polly in VOTING status
	 */
	async startPolly(pollId, userEmail) {
		let graphQL = `mutation startPolly($pollId: BigInteger!, $userEmail: String!) { startPolly(pollId: $pollId, userEmail: $userEmail) ${JQL_POLLY} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId), userEmail })
			.then(res => {
				console.debug("Started polly voting phase:", res.data.startPolly)
				return res.data.startPolly
			})
	},

	/**
	 * Cast a vote in a polly (sorted proposal order).
	 * @param {Number} pollId polly ID
	 * @param {Array} voteOrderIds array of proposal IDs in voter's preferred order
	 * @param {String} voterToken one-time voter token
	 * @returns {Object} ballot confirmation with checksum
	 */
	async castVoteInPolly(pollId, voteOrderIds, voterToken) {
		console.debug("Cast vote in polly(id=" + pollId + ") => ", voteOrderIds)
		let graphQL = `mutation castVoteInPolly($pollId: BigInteger!, $voteOrderIds: [BigInteger]!, $voterToken: String!) { castVoteInPolly(pollId: $pollId, voteOrderIds: $voteOrderIds, voterToken: $voterToken) { voteCount ballot { level checksum voteOrder { id } } } }`
		return graphQlQuery(graphQL, { pollId: Number(pollId), voteOrderIds: voteOrderIds.map(Number), voterToken })
			.then(res => {
				console.debug("Polly vote cast successfully.")
				return res.data.castVoteInPolly
			})
	},

	/**
	 * Finish the voting phase of a polly and calculate the winner.
	 * @param {Number} pollId polly ID
	 * @returns {Object} the winning proposal
	 */
	async finishPolly(pollId) {
		let graphQL = `mutation finishPolly($pollId: BigInteger!) { finishPolly(pollId: $pollId) ${JQL_PROPOSAL} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId) })
			.then(res => {
				console.debug(`Finished polly voting phase. Winner: polly(id=${pollId})`)
				return res.data.finishPolly
			})
	},



	/**********************************************************************
	 * API calls against backend that need to be authenticated with a JWT
	 **********************************************************************/

	/**
	 * Admin creates a new poll.
	 * @param {String} pollTitle title of the new poll
	 * @param {Date|String} pollStartDate poll start timestamp (Date or ISO string)
	 * @param {Date|String} pollEndDate poll end timestamp (Date or ISO string)
	 * @param {Boolean} membersCanAddProposals when true, team members may add proposals to this poll.
	 *        Default false: only the admin may. Chosen at creation and not changeable afterwards.
	 */
	async createPoll(pollTitle, pollStartDate, pollEndDate, membersCanAddProposals = false) {
		if (!pollStartDate || !pollEndDate) throw new Error("Need pollStartDate and pollEndDate to create poll")
		let startDate = new Date(pollStartDate)
		let endDate = new Date(pollEndDate)

		let graphQL = `mutation createPoll($title: String!, $membersCanAddProposals: Boolean, $startDate: DateTime!, $endDate: DateTime!) { createPoll(title: $title, membersCanAddProposals: $membersCanAddProposals, startDate: $startDate, endDate: $endDate) ${JQL.POLL} }`
		return graphQlQuery(graphQL, {
			title: pollTitle,
			membersCanAddProposals,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
		})
			.then(res => {
				let poll = res.data.createPoll
				this.pollsCache.put("polls/"+poll.id, poll)
				console.debug("Created new poll:", poll)
				return poll
			})
	},

	/**
	 * Get a poll by its ID. Will try to fetch it from the cache first.
	 * If the poll is not in the cache or expired, then it will be fetched from the backend.
	 * @param {Number} pollId poll.id to load
	 * @param {Boolean} force force a refresh from the backend
	 * @returns the poll object
	 * @rejects when pollId is not a number or poll not found
	 */
	async getPollById(pollId, force = false) {
		//console.debug("getPollById(id="+pollId+", force="+force+")")
		return this.pollsCache.get("polls/"+pollId, {
			callBackend: force ? this.pollsCache.FORCE_BACKEND_CALL : this.pollsCache.CALL_BACKEND_WHEN_EXPIRED
		})
	},

	/** 
	 * Fetch polls from cache. This might call the backend if polls are expired
	 * @param {Boolean} force pass true, if you want to force a refresh from the backend
	 * @returns {Promise} polls from cache (or empty array)
	 */
	async getPolls(force = false) {
		return this.pollsCache.get("polls", {
			callBackend: force ? this.pollsCache.FORCE_BACKEND_CALL : this.pollsCache.CALL_BACKEND_WHEN_EXPIRED
		}).then(polls => polls || [])
	},

	/** 
	 * Synchronously get all currently cached polls.
	 * 
	 * @returns {Array} array of all locally cached polls or empty array if nothing is there
	 */
	getCachedPolls() {
		let cacheData = this.pollsCache.getCacheData()
		if (!cacheData || !cacheData.polls) return []
		return cacheData.polls
	},

	/**
	 * Add a new proposal to a poll.
	 * Keep in mind that a member may only add one proposal per poll. The backend will check this.
	 * Will update the poll in local pollsCache
	 * 
	 * @param {String} pollId poll ID
	 * @param {String} title proposal title
	 * @param {String} description proposal description
	 * @param {String} icon name of fontawesome icon (without any "fa-" prefix. Just the name)
	 * @returns {Object} the updated poll with the added proposal
	 */
	async addProposal(pollId, title, description, icon) {
		let graphQL = `mutation addProposal($pollId: BigInteger!, $title: String!, $description: String!, $icon: String!) { addProposal(pollId: $pollId, title: $title, description: $description, icon: $icon) ${JQL.POLL} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId), title, description, icon })
			.then(res => {
				let poll = res.data.addProposal
				this.pollsCache.put("polls/"+poll.id, poll)
				console.debug("Added proposal to poll:", poll)
				return poll
			})
	},

	/**
	 * Edit your OWN proposal. Only possible while the poll has not started yet.
	 * The backend refuses anything else: somebody else's proposal, or a poll already in VOTING.
	 *
	 * @param {Number} pollId the poll containing the proposal
	 * @param {Number} proposalId the proposal to edit. Must be your own.
	 * @param {String} title new title. Must be unique within the poll.
	 * @param {String} description new description
	 * @param {String} icon name of a fontawesome icon (without any "fa-" prefix)
	 * @returns {Object} the updated poll
	 */
	async updateProposal(pollId, proposalId, title, description, icon) {
		let graphQL = `mutation updateProposal($pollId: BigInteger!, $proposalId: BigInteger!, $title: String!, $description: String!, $icon: String!) { updateProposal(pollId: $pollId, proposalId: $proposalId, title: $title, description: $description, icon: $icon) ${JQL.POLL} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId), proposalId: Number(proposalId), title, description, icon })
			.then(res => {
				let poll = res.data.updateProposal
				this.pollsCache.put("polls/"+poll.id, poll)
				console.debug("Updated proposal in poll:", poll)
				return poll
			})
	},

	/**
	 * Like ("support") a proposal in a poll.
	 * Will update the poll in pollsCache and notify listeners POLL_LOADED
	 * 
	 * @param {Number} pollId a poll
	 * @param {Number} proposalId a proposal in that poll
	 * @returns {Object} the updated poll
	 */
	async likeProposal(pollId, proposalId) {
		let graphQL = `mutation likeProposal($pollId: BigInteger!, $proposalId: BigInteger!) { likeProposal(pollId: $pollId, proposalId: $proposalId) ${JQL.POLL} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId), proposalId: Number(proposalId) })
			.then(res => {
				let poll = res.data.likeProposal
				this.pollsCache.put("polls/"+poll.id, poll)
				console.debug(`User likes proposal.id=${proposalId} in poll.id=${pollId}`)
				EventBus.emit(EventBus.Event.POLL_LOADED, poll)
				return poll
			})
	},

	async startVotingPhase(pollId) {
		let graphQL = `mutation startVotingPhase($pollId: BigInteger!) { startVotingPhase(pollId: $pollId) ${JQL.POLL} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId) })
			.then(res => {
				let poll = res.data.startVotingPhase
				//TODO: invalidate cache for pollId
				console.debug("Started voting phase of poll", poll)
				return poll
			})
	},

	/**
	 * Finish the currently runnign voting phase of a poll in VOTING.
	 * @param {Number} pollId poll.id in VOTING
	 * @returns {Object} the winning proposal
	 */
	async finishVotingPhase(pollId) {
		let graphQL = `mutation finishVotingPhase($pollId: BigInteger!) { finishVotingPhase(pollId: $pollId) ${JQL.PROPOSAL} }`
		return graphQlQuery(graphQL, { pollId: Number(pollId) })
			.then(res => {
				console.debug(`Finsihed voting phase of poll.id=${pollId}`)
				return res.data.finishVotingPhase
			})
	},

	/** Get one-time voterToken for a poll */
	async getVoterToken(pollId) {
		let graphQL = `query voterToken($pollId: BigInteger!) { voterToken(pollId: $pollId) }`
		return graphQlQuery(graphQL, { pollId: Number(pollId) }).then(res => {
			console.debug("Successfully received VoterToken for poll(id="+pollId+")")  // do not log the token!
			return res.data.voterToken
		})
	},

	async castVote(pollId, voteOrderIds, voterToken) {
		console.debug("Cast vote in poll(id="+pollId+") => ", voteOrderIds)
		let graphQL = `mutation castVote($pollId: BigInteger!, $voteOrderIds: [BigInteger]!, $voterToken: String!) { castVote(pollId: $pollId, voteOrderIds: $voteOrderIds, voterToken: $voterToken) ` +
			`{ voteCount ballot { level checksum voteOrder { id } } } }`
		return graphQlQuery(graphQL, { pollId: Number(pollId), voteOrderIds: voteOrderIds.map(Number), voterToken })
			.then(res => {
				console.debug("CastVote: Ballot was casted successfully.")
				return res.data.castVote
			})
	},

	/** Get voter's ballot if he voted already. MAY return null if not. */
	async getMyBallot(pollId) {
		let graphQL = `query myBallot($pollId: BigInteger!) { myBallot(pollId: $pollId) ` +
			`{ level checksum voteOrder { id } } }`
		return graphQlQuery(graphQL, { pollId: Number(pollId) })
			.then(res => {
				if (res.data.myBallot) {
					console.debug(`User's ballot in poll(id=${pollId}) is`, res.data.myBallot)
				} else {
					console.debug(`User has not voted yet in poll(id=${pollId})`)
				}
				return res.data.myBallot
			})
	},

	/** Verify a voter's ballot with its checksum. */
	async verifyBallot(pollId, checksum) {
		let graphQL = `query verifyBallot($pollId: BigInteger!, $checksum: String!) { verifyBallot(pollId: $pollId, checksum: $checksum) ` +
			`{ level checksum voteOrder { id } } }`
		// returns user's ballot if found
		return graphQlQuery(graphQL, { pollId: Number(pollId), checksum }).then(res => res.data.verifyBallot)
	},

	/** poll status constants (trying to have one central definition for the whole client here) */
	POLL_STATUS: {
		ALL_POLLS: undefined,  // <= used in polls.vue & polls-footer.vue for filtering
		ELABORATION: "ELABORATION",
		VOTING: "VOTING",
		FINISHED: "FINISHED"
	},

	/** client side caches */
	teamCache: teamCache,
	pollsCache: pollsCache,

	/** Keys for the above caches */
	JWT_KEY: "jwt",
	CURRENT_USER_KEY: "currentUser",       // key for current user object in teamCache
	TEAM_KEY: "team",                      // the ONE team the user is currently logged into
	ALL_USER_TEAMS_KEY: "allUserTeams",    // ALL teams the user is a member of (for the team switcher)
	VOTER_TOKEN_KEY: "voterToken",
	LIQUIDO_JWT_KEY: "LIQUIDO_JWT",        // JWT in localStorage

	/** default JQL queries for common models */
	JQL: JQL,

	/** Error codes from LIQUIDO backend. This is read from an automatically generated file LiquidoExceptionCodes.js */
	err: LiquidoExceptionCodes,
}

if (config.mockBackend) initializeLiquidoGraphQlMock(graphQlApi, teamCache)


export default graphQlApi
