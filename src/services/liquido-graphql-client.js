/**
 * LIQUIDO GraphQL client
 * 
 * Every call to the backend goes through this class.
 * Here we also handle data caching.
 * And login and logout because the currently logged in use with his team is also cached.
 */
import axios from "axios"
import config from "config"
import PopulatingCache from "populating-cache"
import EventBus from "@/services/event-bus"
import log from "@/components/mobile-debug-log.js"

/*
  # Architecture design decisions in liquido-graphql-client.js

	We do not do (much) error handling here. This lies in the responsibility of the caller
	We only do simple sanity checks where we can prevent unneccessary calls to the backend.

	The class handles transparent caching of fetched data. Clients do not directly access the cache.
	Clients can `force` a refetch when needed.

	This is a service class. It does not have a frontend. It does no navigation.
*/


//TODO: refactor / split into api-client.js, local-cache.js and liquido-auth.js  <= not that easy!

if (!config || !config.LIQUIDO_API_URL) {
	log.error("liquido-graphql-client: ERROR I have no config!")
} else {
	log.debug("liquido-graphql-client => " + config.LIQUIDO_API_URL)
}

// Configure axios HTTP REST client to point to our graphQL backend
axios.defaults.baseURL = config.LIQUIDO_API_URL
const GRAPHQL = "/graphql"

/**
 * This is the central API client that calls the backend.
 * Errors are logged here. But must be handled by the caller!
 * 
 * @param {String} graphql GraphQL Query. This is NOT JSON! This is GraphQL syntax!
 * @returns GraphQL result as specified by GraphQL-spec { data: {}, errors: [] }
 */
const graphQlQuery = function(query, variables) {
	return axios.post(GRAPHQL, { query: query, variables: variables })
		.then(res => {
			if (res.errors && res.errors.length > 0) {
				log.error("graphQlQueryy errors: ", JSON.stringify(res.errors))   // graphQL's way of returning errors
			}
			return res.data // This is the axios HTTP "data". The graphQL response contains another "data" (and an "error") attribute. I know, it's confusing.
		})  
		.catch(err => {
			log.error("graphQlQuery throws: ", err)
			return Promise.reject(err)
		})
}



/** Shorthands for JQL return values */
const JQL_PROPOSAL =  "{ id, title, description, icon, status, createdAt, numSupporters, isLikedByCurrentUser, createdBy { id name email } }"
const JQL_POLL = `{ id, title, status, votingStartAt votingEndAt proposals ${JQL_PROPOSAL} winner ${JQL_PROPOSAL} numBallots duelMatrix { data } }`
const JQL_TEAM = "team { id, teamName, inviteCode, " +
		"admins  { id, email, name, website, picture, mobilephone } " +
		"members { id, email, name, website, picture, mobilephone } " +
		`polls ${JQL_POLL} }`
const JQL = {
	TEAM: JQL_TEAM,
	PROPOSAL: JQL_PROPOSAL,  // Javascript cannot reference own object property. So JQL_PROPOSAL must be its own const above. :-(
	CREATE_OR_JOIN_TEAM_RESULT: `{ ${JQL_TEAM} user { id, email, name, website, picture, mobilephone } jwt }`,  // login data
	POLL: JQL_POLL,
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
			EventBus.emit(EventBus.POLLS_LOADED, res.data.team.polls)
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
			EventBus.emit(EventBus.POLLS_LOADED, res.data.polls)
			return res.data.polls
		})
	} else if (path[0].polls) {
		console.debug("Fetch one poll from backend: "+JSON.stringify(path))
		let pollId = path[0].polls
		let graphQL = `query { poll(pollId:${pollId}) ${JQL.POLL} }`
		return graphQlQuery(graphQL).then(res => {
			EventBus.emit(EventBus.POLL_LOADED, res.data.poll)  // notify listeners that ONE poll has been (re)loaded from the backend
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
 * Sophisticated logging of HTTP error messages is crucial!
 */
axios.interceptors.response.use(function (response) {
	// Any status code that lie within the range of 2xx cause this function to trigger
	return response;
}, function (error) {

	//handle general connection errors.
	if (error.data && error.data.includes("ECONNREFUSED")) return Promise.reject(error)
	
	// Any status codes that falls outside the range of 2xx cause this function to trigger
	if (error.response.status >= 500) console.error("liquido-graphql-api ERROR:", error)
	if (error.response && error.response.data) {
		let msg = "liquido-graphql-api: " + error.response.data.message
		if (error.response.data.liquidoErrorPayload)
			msg += "\n" + JSON.stringify(error.response.data.liquidoErrorPayload)
		console.debug(msg, error.response.data)
		log.error(msg)
	}
	return Promise.reject(error);
});

/**
 * ===================== exported API methods =======================
 */
let graphQlApi = {

	async pingApi() {
		return axios.post(GRAPHQL, {query: "query { ping }"})
	},

	/**
	 * Login user into team. Store JWT for future requests.
	 * Will also put currentUser, team and jwt into the `teamCache`
	 * @param {Object} team Team with members[] and polls[]
	 * @param {Object} user currently logged in user
	 * @param {String} jwt JsonWebToken
	 */
	login(team, user, jwt) {
		this.teamCache.put(this.TEAM_KEY, team)
		// Set user.isAdmin = true if user is admin. This must of course also be secured in the backend!
		if (team.admins.find(u => u.id === user.id)) user.isAdmin = true
		this.teamCache.put(this.CURRENT_USER_KEY, user)
		this.teamCache.put(this.JWT_KEY, jwt)
		this.putPollsIntoCache(team.polls)
		localStorage.setItem(this.LIQUIDO_JWT_KEY, jwt)
		axios.defaults.headers.common["Authorization"] = "Bearer " + jwt
		EventBus.emit(EventBus.LOGIN, {team, user, jwt})
		console.debug("Login <"+user.email+"> into team '" + team.teamName  + "'")
	},

	logout() {
		axios.defaults.headers.common["Authorization"] = undefined
		let userEmail = this.getCachedUser() ? this.getCachedUser().email : ""
		console.debug("Logout <"+userEmail+">")
		localStorage.removeItem(this.LIQUIDO_JWT_KEY)
		axios.defaults.headers.common["Authorization"] = undefined
		this.teamCache.emptyCache()
		this.pollsCache.emptyCache()
		EventBus.emit(EventBus.LOGOUT, userEmail)
	},

	/* ===== Synchronous utility methods that do not call the backend ========= */

	/** Check if there currently is an authenticated user. This is called quite often and needs to be sync and fast. */
	isAuthenticated() {
		return axios.defaults.headers.common["Authorization"] !== undefined && this.getCachedUser() !== undefined
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
	 * Check if currently logged in user is the admin of his team. 
	 * @return false if no one is logged in or currently logged in user is not the admin
	 */
	isAdmin() {
		let cachedUser = this.getCachedUser()
		let team        = this.getCachedTeam()
		if (!cachedUser || !team || !team.admins) return false
		return team.admins.map(admin => admin.id).includes(cachedUser.id)
	},

	/**
	 * Put the given array of polls into the cache under their ids.
	 * This will <b>replace</b> these polls in the cache.
	 * @param {Array} pollsArray array of polls
	 */
	putPollsIntoCache(pollsArray) {
		if (!Array.isArray(pollsArray)) {
			log.warn("Need array of polls to putPollsIntoCache!")
			return
		}
		EventBus.emit(EventBus.POLLS_LOADED, pollsArray)
		pollsArray.forEach(poll => {

			this.pollsCache.put("polls/"+poll.id, poll)
		})
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
				this.login(res.data.loginWithJwt.team, res.data.loginWithJwt.user, res.data.loginWithJwt.jwt)
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
	requestEmailToken(email) {
		if (!email) throw new Error("Need email to log in!")
		let graphQL = `query { requestEmailToken(email: "${email}") }`
		return graphQlQuery(graphQL)  // no return value
	},

	//TODO: loginWithEmailToken

	/**
	 * Request auth token for login. This will send an SMS.
	 */
	requestAuthToken(mobilephone) {
		let graphQL = `query { authToken(mobilephone: "${mobilephone}") }`
		return graphQlQuery(graphQL)
	},

	/**
	 * try to login with they authToken that the user has entered.
	 */
	loginWithAuthToken(mobilephone, authToken) {
		if (!mobilephone) throw new Error("Need mobilephone to log in!")
		if (!authToken) throw new Error("Need authToken to log in!")
		let graphQL = `query { loginWithAuthToken(mobilephone: "${mobilephone}", authToken: "${authToken}") ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL).then(res => {
			this.login(res.data.loginWithAuthToken.team, res.data.loginWithAuthToken.user, res.data.loginWithAuthToken.jwt)
			return res.data.loginWithAuthToken
		})
	},

	/** 
	 * [DEV] Quick development login. This calls the REST backend!
	 * @param email users email. User must exist in team
	 * @param teamName team to login
	 * @param token valid and correct devLogin.token. Will be validated in backend. This is like a simulated SMS token.
	 * @return login data with team, user and jwt (same as a joinTeam calls)
	 */
	async devLogin(email, teamName, token) {
		if (!["development", "test", "int"].includes(process.env.NODE_ENV))
			return Promise.reject("devLogin is only allowed in NODE_ENV development, test or int")
		if (!email || !teamName || !token) 
			return Promise.reject("Need email, teamName and devlogin.token!")
		return axios({
			method: "GET", 
			url: "/dev/getJWT",
			params: {
				email: email,
				teamName: teamName,
				token: token
			}
		}).then(res => {
			console.log("API: devLogin for <"+email+"> in team '"+teamName+"'", res.data)
			this.login(res.data.team, res.data.user, res.data.jwt)
			return res.data
		}).catch(err => { 
			console.error("API: devLogin failed: ", err)
			return Promise.reject("devLogin failed"+JSON.stringify(err))
		})
	},

	/**
	 * Create a new team. 
	 * @param {Object} newTeam teamName, adminName, adminEmail and adminMobilephone
	 */
	async createNewTeam(teamName, admin) {
		let graphQL = `mutation createNewTeam($teamName: String!, $admin: UserModelInput!) { ` + 
			` createNewTeam(teamName: $teamName, admin: $admin) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		let variables = {
			teamName: teamName,
			admin: admin
		}

		//let graphQL = `mutation { createNewTeam(teamName: "${teamName}", adminName: "${admin.name}",` +
		//	`adminMobilephone: "${admin.mobilephone}", adminEmail: "${admin.email}", adminPicture: "${admin.picture}") ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL, variables)
			.then(res => {
				let team = res.data.createNewTeam.team
				this.login(
					team,
					res.data.createNewTeam.user,  // admin
					res.data.createNewTeam.jwt
				)
				console.debug("Created new team:", team)
				return team
			})
			// There is deliberately no error handling here, because we can't handle the error in this method :-)
			// Only catch errors if you can do something about it. Otherwise simply let the rejection bubble up the call chain.
			// Further up some UI method will do something about the error, e.g. show an meaningful error message to the user.
	},

	async joinTeam(inviteCode, member) {
		let graphQL = `mutation joinTeam($inviteCode: String!, $member: UserModelInput!) { ` + 
			` joinTeam(inviteCode: $inviteCode, member: $member) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		let variables = {
			inviteCode: inviteCode,
			member: member
		}
		return graphQlQuery(graphQL, variables)
			.then(res => {
				let team = res.data.joinTeam.team
				this.login(
					team,
					res.data.joinTeam.user,
					res.data.joinTeam.jwt
				)
				console.debug("Joined team:", team)
				return team
			})
	},

	/**********************************************************************
	 * API calls against backend that need to be authenticated with a JWT
	 **********************************************************************/

	async createPoll(pollTitle) {
		//TODO: BUGFIX: Do I need the brackets after mutation ?
		let graphQL = `mutation {	createPoll(title: "${pollTitle}") ${JQL.POLL}	}`
		return graphQlQuery(graphQL)
			.then(res => {
				let poll = res.data.createPoll
				this.pollsCache.put("polls/"+poll.id, poll)
				console.debug("Created new poll:", poll)
				return poll
			})
	},

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
	 * Synchronously get currently cached polls (optionally filterd by status).
	 * 
	 * @param {String} status Optionally filter by status. If ELABORATION|VOTING|FINISHED only polls of that status are returned. 
	 *      If undefined, then all polls in the cache will be returned.
	 * @returns {Array} array of locally cached polls or empty array if nothing is there
	 */
	getCachedPolls(status) {
		let cacheData = this.pollsCache.getCacheData()
		if (!cacheData || !cacheData.polls) return []
		return cacheData.polls.filter(poll => !status ||  poll.status === status)  // Keep in mind that "filter" creates a copy of the polls array!
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
		let graphQL = `mutation { addProposal(pollId: "${pollId}", title: "${title}", description: "${description}", icon: "${icon}") ${JQL.POLL} }`
		return graphQlQuery(graphQL)
			.then(res => {
				let poll = res.data.addProposal
				this.pollsCache.put("polls/"+poll.id, poll)
				console.debug("Added proposal to poll:", poll)
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
		let graphQL = `mutation { likeProposal(pollId: "${pollId}", proposalId: "${proposalId}") ${JQL.POLL} }`
		return graphQlQuery(graphQL)
			.then(res => {
				let poll = res.data.likeProposal
				this.pollsCache.put("polls/"+poll.id, poll)
				console.debug(`User likes proposal.id=${proposalId} in poll.id=${pollId}`)
				EventBus.emit(EventBus.POLL_LOADED, poll)
				return poll
			})
	},

	async startVotingPhase(pollId) {
		let graphQL = `mutation { startVotingPhase(pollId: "${pollId}") ${JQL.POLL} }`
		return graphQlQuery(graphQL)
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
		let graphQL = `mutation { finishVotingPhase(pollId: "${pollId}") ${JQL.PROPOSAL} }`
		return graphQlQuery(graphQL)
			.then(res => {
				console.debug(`Finsihed voting phase of poll.id=${pollId}`)
				return res.data.finishVotingPhase
			})
	},

	/** Get voterToken (cached) */
	async getVoterToken(tokenSecret, becomePublicProxy = false) {
		return this.teamCache.get(this.VOTER_TOKEN_KEY, {
			fetchFunc: async function() {
				let graphQL = `query { voterToken(tokenSecret: "${tokenSecret}", becomePublicProxy: ${becomePublicProxy}) }`
				const res = await graphQlQuery(graphQL);
				console.debug("GetVoterToken: OK, received valid voterToken from backend."); // SECURITY: Do not log secret voterToken!
				return res.data.voterToken;
			}
		})
	},

	async castVote(pollId, voteOrderIds, voterToken) {
		let voteOrderStr = "[" + voteOrderIds.join(",") + "]"
		console.debug("Cast vote in poll(id="+pollId+") => ", voteOrderStr)
		let graphQL = `mutation { castVote(pollId: "${pollId}", voteOrderIds: ${voteOrderStr}, voterToken: "${voterToken}") ` +
			`{ voteCount ballot { level checksum voteOrder { id } } } }`
		return graphQlQuery(graphQL)
			.then(res => {
				console.debug("CastVote: Ballot was casted successfully.")
				return res.data.castVote
			})
	},

	/** Get voter's ballot if he voted already. MAY return null if not. */
	async getBallot(pollId, voterToken) {
		let graphQL = `query { ballot(pollId: "${pollId}", voterToken: "${voterToken}") ` +
			`{ level checksum voteOrder { id } } }`
		return graphQlQuery(graphQL)
			.then(res => {
				console.debug("User's ballot in poll(id="+pollId+") is", res.data.ballot)
				return res.data.ballot
			})
	},

	/** Verify a voter's ballot with its checksum. */
	async verifyBallot(pollId, checksum) {
		let graphQL = `query { verifyBallot(pollId: "${pollId}", checksum: "${checksum}") ` +
			`{ level checksum voteOrder { id } } }`  
		// returns user's ballot if found
		return graphQlQuery(graphQL)
	},

	/** Liquido backend error codes. See LiquidoException.java */
	err: {
		TEAM_WITH_SAME_NAME_EXISTS: 1,

		//Join Team errors
		CANNOT_JOIN_TEAM_INVITE_CODE_INVALID: 10, 
		CANNOT_JOIN_TEAM_ALREADY_MEMBER: 11, 						// there already is a member : or admin) with the same email
		CANNOT_JOIN_TEAM_ALREADY_ADMIN: 12, 
		CANNOT_REGISTER_NEED_EMAIL: 13, 
		CANNOT_REGISTER_NEED_MOBILEPHONE: 14, 
		CANNOT_CREATE_TWILIO_USER: 15, 
		USER_EMAIL_EXISTS: 16,                           // user with that email  already exists
		USER_MOBILEPHONE_EXISTS: 17,                     // user with that mobilephone already exists

		//Login Errors
		CANNOT_LOGIN_MOBILE_NOT_FOUND: 20, 					// when requesting an SMS login token and mobile number is not known
		CANNOT_LOGIN_EMAIL_NOT_FOUND: 21,    				// when requesting a login email and email is not known
		CANNOT_LOGIN_TOKEN_INVALID: 22,      				// when a email or sms login token is invalid or expired
		CANNOT_LOGIN_TEAM_NOT_FOUND: 23,            // when changing team
		CANNOT_LOGIN_USER_NOT_MEMBER_OF_TEAM: 24,   // when changing team and user is not member of target team
		CANNOT_LOGIN_INTERNAL_ERROR: 25, 		        // when sending of email is not possible

		//JWT Erros
		JWT_TOKEN_INVALID: 30, 
		JWT_TOKEN_EXPIRED: 31, 

		// use case errors
		INVALID_VOTER_TOKEN: 50, 
		CANNOT_CREATE_POLL: 51, 
		CANNOT_JOIN_POLL: 52, 
		CANNOT_ADD_PROPOSAL: 53, 
		CANNOT_START_VOTING_PHASE: 54, 
		CANNOT_SAVE_PROXY: 55, 								  // assign or remove
		CANNOT_ASSIGN_CIRCULAR_PROXY: 56, 
		CANNOT_CAST_VOTE: 57, 
		CANNOT_GET_TOKEN: 58, 
		CANNOT_FINISH_POLL: 59, 
		NO_DELEGATION: 60, 
		NO_BALLOT: 61,   												// 204: voter has no ballot yet. This is OK and not an error.
		INVALID_POLL_STATUS: 62, 
		PUBLIC_CHECKSUM_NOT_FOUND: 63, 
		CANNOT_ADD_SUPPORTER: 64, 							// e.g. when user tries to support his own proposal

		CANNOT_CALCULATE_UNIQUE_RANKED_PAIR_WINNER: 70, 		// this is only used in the exceptional situation, that no unique winner can be calculated in RankedPairVoting
		CANNOT_VERIFY_CHECKSUM: 80, 						// ballot's checksum could not be verified

		// general errors
		GRAPHQL_ERROR: 400,                     // e.g. missing required fields, invalid GraphQL query, ...
		UNAUTHORIZED: 401,                      // when client tries to call something without being authenticated!
		CANNOT_FIND_ENTITY: 404,                // 404: cannot find entity
		INTERNAL_ERROR: 500,
	},

	/** client side caches */
	teamCache: teamCache,
	pollsCache: pollsCache,

	/** Keys for the above caches */
	JWT_KEY: "jwt",
	CURRENT_USER_KEY: "currentUser",       // key for current user object in teamCache
	TEAM_KEY: "team",
	VOTER_TOKEN_KEY: "voterToken",
	LIQUIDO_JWT_KEY: "LIQUIDO_JWT",        // JWT in localStorage

	/** default JQL queries for common models */
	JQL: JQL,

}

export default graphQlApi
