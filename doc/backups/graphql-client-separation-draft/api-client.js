/**
 * LIQUIDO API client for GraphQL.
 * 
 * Every call to the backend goes through this class.
 */

import axios from "axios"
import config from "config"
import log from 'loglevel'

/*
  # Architecture design decisions in api-client.js

	We do not do (much) error handling here. This lies in the responsibility of the caller
	We only do simple sanity checks where we can prevent unneccessary calls to the backend.

	The class handles transparent caching of fetched data. Vue components do not directly access the cache.
	Callers can force a refetch when needed. (I thought about this decission a lot and went back and forth.
	The alternative would be to make Vue components handle the cache. An let this only be a pure GraphQL client.
*/

if (!config || !config.LIQUIDO_API_URL) {
	console.error("liquido-graphql-client: ERROR I have no config!")
} else {
	if (process.env.NODE_ENV === "development") {
		console.log("liquido-graphql-client => " + config.LIQUIDO_API_URL)
	}
}

// Configure axios HTTP REST client to point to our graphQL backend
axios.defaults.baseURL = config.LIQUIDO_API_URL

/** This will be called for HTTP resopnse status 2xx */
let onSuccess = (response) => response

/** 
 * This will be called for any other response status
 * First we check if there is a network error
 * Then we check for severe errors 5xx, and log them.
 * For all others we let the normal flow continue.
 */
let onError   = (error) => {
	if (!error.response) {
		log.warn("Network error: no response at all")
	} else 
	if (error.data && error.data.includes("ECONNREFUSED") ||
		error.response && error.response.body && error.response.body.includes("ECONNREFUSED")) {
		log.warn("Network connection refused.")
	} else
	if (error.response && error.response.status >= 500) { 
		log.error("api-client: Internal Server Error(500):", error) 
	} else {
		console.error("Very strange unknown HTTP error", error)
	}

	// try to log some additional debug info
	if (error.response && error.response.data) {
		let msg = "liquido-graphql-client: error.response.data=" + JSON.stringify(error.response.data)
		if (error.response.data.liquidoErrorPayload) {
			msg += "\nLiquidoErrorPayLoad:", JSON.stringify(error.response.data.liquidoErrorPayload)
		}
		log.debug(msg)
	}
	return Promise.reject(error);
}

/**
 * Sophisticated logging of HTTP error messages is crucial!
 * You have no idea how many times this has saved me!
 */
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
const GRAPHQL = '/graphql'      // ==================== BASE PATH FOR GRAPHQL endpoint  //TODO: should that be in config.common.js ?
async function graphQlQuery(query, variables) {
	//console.debug("GraphQL Query with " + axios.defaults.headers.common["Authorization"])
	return axios.post(GRAPHQL, { query, variables })
		.then(res => {
			if (res.data && res.data.errors && res.data.errors.length > 0) {
				// graphQL's way of returning errors, as defined in the GraphQL spec
				// https://graphql.org/learn/serving-over-http/#http-status-codes
				log.info("graphQlQuery() received data errors:", res.data.errors)   
				if (res.data.errors[0].extensions) {
					console.info("graphQlQuery() first liquidoException: "+JSON.stringify(res.data.errors[0].extensions))
					// add the first liquidoException to the response data, so that the caller can handle it more easily
					res.data.liquidoException = res.data.errors[0].extensions.liquidoException
				}
				return Promise.reject(res.data)
			}
			return res.data // This is the axios HTTP "data". The graphQL response contains another "res.data.data" and the "res.data.errors" attribute. I know, it's confusing.
		})
}



/** Shorthands for JQL return values */
const JQL_USER = `{ id name email mobilephone picture website } `
const JQL_TEAM_MEMBER = `{ role joinedAt user ${JQL_USER} } `
const JQL_PROPOSAL =  `{ id title description icon status createdAt numSupporters likedByCurrentUser createdBy ${JQL_USER} } `   // no "is" before likedByCurrentUser!
const JQL_POLL = `{ id title status votingStartAt votingEndAt proposals ${JQL_PROPOSAL} winner ${JQL_PROPOSAL}  } `  //TODO: numBallots duelMatrix { data }
const JQL_TEAM = `{ id teamName inviteCode ` +
		`members ${JQL_TEAM_MEMBER} ` +
		`polls ${JQL_POLL} } `
const JQL = {
	TEAM: JQL_TEAM,
	PROPOSAL: JQL_PROPOSAL,
	CREATE_OR_JOIN_TEAM_RESULT: `{ ` +
		`team ${JQL_TEAM} ` +
		`user ${JQL_USER} ` + 
		`jwt } `, 
	POLL: JQL_POLL,
}

/**
 * ===================== exported API methods =======================
 */
const apiClient = {

  // Implementation note: All API methods do not have any error handling.
	// There is only some logging in the axios interceptor above.
	// If something goes wrong, then the caller is responsible to catch()
	// and process the error.

	pingApi() {
		return axios.post(GRAPHQL, { query: "{ ping }" })
	},

	/**
	 * get GraphQL schema.
	 * This can also be used to check if the backend GraphQL API is up and running.
	 * @returns the GraphQL schema
	 */ 
	getGraphQLSchema() {
		return axios.get('/graphql/schema.graphql')
	},
	
	/****************************************************************
	 * API calls against backend
	 * that can be executed anonymously, eg. for logging in
	 * create or join a team
	 *****************************************************************/

	/**
	 * Load data about the user's team. This call must be authenticated with a JWT already set in axios.
	 * @returns {Promise<any>} Info about user's team
	 */
	async loginWithJwt() {
		let graphQL = `query { loginWithJwt ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		const res = await graphQlQuery(graphQL)
		return res.data.loginWithJwt
	},

	/**
	 * When an already registered user wants to login, 
	 * LIQUIDO can send him a magic link via email.
	 * The user MUST have access to his own email inbox.
	 * 
	 * @param {String} email email of a registered user
	 * @returns Promise.resolve(), when email was sent successfully
	 */
	async requestEmailToken(email) {
		if (!email) throw new Error("Need email to log in!")
		let graphQL = `query { requestEmailToken(email: "${email}") }`
		return graphQlQuery(graphQL)
	},

	/**
	 * login with link from email (contains email and authToken)
	 */
	async loginWithEmailPassword(email, password) {
		if (!email) throw new Error("Need email to log in!")
		if (!password) throw new Error("Need password to log in!")
		let graphQL = `query { loginWithEmailPassword(email: "${email}", password: "${password}") ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL).then(response => response.data.loginWithEmailPassword)
	},

	/**
	 * Request a password reset for a user.
	 * @param {String} email must be a registered user email
	 * @returns 
	 */
	async requestPasswordReset(email) {
		if (!email) throw new Error("Need email to request password reset!")
		let graphQL = `query { requestPasswordReset(email: "${email}") }`
		const res = await graphQlQuery(graphQL)
		return res.data.requestPasswordReset
	},

	async resetPassword(email, resetPasswordToken, newPassword) {
		let graphQL = `query { resetPassword(email: "${email}", resetPasswordToken: "${resetPasswordToken}", newPassword: "${newPassword}") }`
		const res = await graphQlQuery(graphQL)
		return res.data.resetPassword
	},


	/**
	 * Request auth token for login. 
	 * Backend will call Twilio API to send a one time login token to the user
	 * @param mobilephone Users mobilephone that must exist in the DB
	 * @param devLoginToken (optional) TESTs can send the devLoginToken to fake the request.
	 */
	async requestAuthToken(mobilephone, devLoginToken) {
		let graphQL = `query { authToken(mobilephone: "${mobilephone}", devLoginToken: "${devLoginToken}") }`
		return graphQlQuery(graphQL)
	},

	/**
	 * try to login with they authToken that the user has entered.
	 */
	async loginWithAuthToken(mobilephone, authToken) {
		if (!mobilephone) throw new Error("Need mobilephone to log in!")
		if (!authToken) throw new Error("Need authToken to log in!")
		let graphQL = `query { loginWithAuthToken(mobilephone: "${mobilephone}", authToken: "${authToken}") ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL).then(response => response.data.loginWithAuthToken)
	},

	/** 
	 * [DEV] Quick development login. This calls the REST backend!
	 * @param email users email. User must exist in team
	 * @param teamName team to login
	 * @param token valid and correct devLogin.token. Will be validated in backend. This is like a simulated SMS token.
	 * @return login data with team, user and jwt (same as a joinTeam calls)
	 */
	devLogin(email, teamName, devLoginToken) {
		if (!["development", "test", "int"].includes(process.env.NODE_ENV))
			return Promise.reject("devLogin is only allowed in NODE_ENV development, test or int")
		if (!email || !teamName || !devLoginToken) 
			return Promise.reject("Need email, teamName and devLoginToken!")
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
		let graphQL = `query { devLogin(email: "${email}", devLoginToken: "${devLoginToken}") ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		return graphQlQuery(graphQL)
			.then(res => res.data.devLogin)
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
		log.debug("createNewTeam Query:\n", graphQL, "variables:\n", JSON.stringify(variables))

		const res = await graphQlQuery(graphQL, variables)
		return res.data.createNewTeam
			// There is deliberately no error handling here, because we can't handle the error in this method :-)
			// Only catch errors if you can do something about it. Otherwise simply let the rejection bubble up the call chain.
			// Further up some UI method will do something about the error, e.g. show an meaningful error message to the user.
	},

	/**
	 * Get info about a team that I like to join, when I have an inviteCode
	 * @param {String} inviteCode a team's inviteCode
	 * @returns the team
	 */
	getTeamForInviteCode(inviteCode) {
		let graphQL = `query { getTeamForInviteCode(inviteCode: "${inviteCode}") ${JQL.TEAM} }`
		let variables = {
			inviteCode: inviteCode
		}
		return graphQlQuery(graphQL, variables).then(res => res.data.getTeamForInviteCode)
	},

	async joinTeam(inviteCode, member, password) {
		let graphQL = `mutation joinTeam($inviteCode: String!, $member: UserEntityInput!, $password: String!) { ` + 
			` joinTeam(inviteCode: $inviteCode, member: $member, password: $password) ${JQL.CREATE_OR_JOIN_TEAM_RESULT} }`
		let variables = {
			inviteCode: inviteCode,
			member: member,
			password: password
		}
		const res = await graphQlQuery(graphQL, variables)
		return res.data.joinTeam
	},

	/**********************************************************************
	 * API calls against backend that need to be authenticated with a JWT
	 **********************************************************************/

	createPoll(pollTitle) {
		let graphQL = `mutation {	createPoll(title: "${pollTitle}") ${JQL.POLL}	}`
		return graphQlQuery(graphQL).then(res => res.data.createPoll)
	},

	/**
	 * Get a poll by its ID.
	 * @param {number} pollId poll.id to load
	 * @returns {Promise<object>} the poll object
	 */
	getPollById(pollId) {
		let graphQL = `query { poll(pollId:${pollId}) ${JQL.POLL} }`
		return graphQlQuery(graphQL).then(res => res.data.poll)
	},

	/**
	 * Fetch all polls of team from backend
	 * @returns {Promise<Array>} polls
	 */
	getPolls() {
		let graphQL = `query { polls ${JQL.POLL} }`
		return graphQlQuery(graphQL).then(res => res.data.polls)
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
	addProposal(pollId, title, description, icon) {
		let graphQL = `mutation { addProposal(pollId: "${pollId}", title: "${title}", description: "${description}", icon: "${icon}") ${JQL.POLL} }`
		return graphQlQuery(graphQL).then(res => res.data.addProposal)
	},

	/**
	 * Like ("support") a proposal in a poll.
	 * Will update the poll in pollsCache and notify listeners POLL_LOADED
	 * 
	 * @param {Number} pollId a poll
	 * @param {Number} proposalId a proposal in that poll
	 * @returns {Object} the updated poll
	 */
	likeProposal(pollId, proposalId) {
		let graphQL = `mutation { likeProposal(pollId: "${pollId}", proposalId: "${proposalId}") ${JQL.POLL} }`
		return graphQlQuery(graphQL).then(res => res.data.likeProposal)
	},

	startVotingPhase(pollId) {
		let graphQL = `mutation { startVotingPhase(pollId: "${pollId}") ${JQL.POLL} }`
		return graphQlQuery(graphQL).then(res => res.data.startVotingPhase)
	},

	/**
	 * Get team from backend.
	 * @returns {Promise<object>}
	 */
	getTeam() {
		let graphQL = `query { team ${JQL.TEAM} }`
		return graphQlQuery(graphQL).then(res => res.data.team)
	},

	/**
	 * Finish the currently runnign voting phase of a poll in VOTING.
	 * @param {Number} pollId poll.id in VOTING
	 * @returns {Promise<object>} the winning proposal
	 */
	finishVotingPhase(pollId) {
		let graphQL = `mutation { finishVotingPhase(pollId: "${pollId}") ${JQL.PROPOSAL} }`
		return graphQlQuery(graphQL).then(res => res.data.finishVotingPhase)
	},

	/** Get one-time voterToken for a poll */
	async getVoterToken(pollId) {
		let graphQL = `query { voterToken(pollId: "${pollId}") }`
		return graphQlQuery(graphQL).then(res => {
			console.debug("Successfully received VoterToken for poll(id="+pollId+")")  // do not log the token!
			return res.data.voterToken
		})
	},

	castVote(pollId, voteOrderIds, voterToken) {
		let voteOrderStr = "[" + voteOrderIds.join(",") + "]"
		log.debug("Cast vote in poll(id="+pollId+") => ", voteOrderStr)
		let graphQL = `mutation { castVote(pollId: "${pollId}", voteOrderIds: ${voteOrderStr}, voterToken: "${voterToken}") ` +
			`{ voteCount ballot { level checksum voteOrder { id } } } }`
		return graphQlQuery(graphQL).then(res => res.data.castVote)
	},

	/** Get voter's ballot if he voted already. MAY return null if not. */
	getMyBallot(pollId) {
		let graphQL = `query { myBallot(pollId: "${pollId}") ` +
			`{ level checksum voteOrder { id } } }`
		return graphQlQuery(graphQL).then(res => res.data.ballot)
	},

	/** Verify a voter's ballot with its checksum. */
	verifyBallot(pollId, checksum) {
		let graphQL = `query { verifyBallot(pollId: "${pollId}", checksum: "${checksum}") ` +
			`{ level checksum voteOrder { id } } }`  
		// returns user's ballot if found
		return graphQlQuery(graphQL).then(res => res.data.verifyBallot)
	},

	/** Liquido backend error codes. Must match LiquidoException.java from backend*/
	err: {
		CANNOT_REGISTER_NEED_EMAIL: 1,
		CANNOT_REGISTER_NEED_MOBILEPHONE: 2,

		// Create New Team
		TEAM_WITH_SAME_NAME_EXISTS: 10,
		CANNOT_CREATE_TEAM_ALREADY_REGISTERED: 11,      // Edge case: When a user is already registered and want's to create a team, ...
		// Join a team
		CANNOT_JOIN_TEAM_INVITE_CODE_INVALID: 12,
		CANNOT_JOIN_TEAM_ALREADY_MEMBER: 13,						// with the same email or mobilephone
		CANNOT_JOIN_TEAM_ALREADY_ADMIN: 14,
		CANNOT_CREATE_TWILIO_USER: 15,
		USER_EMAIL_EXISTS: 16,                         	// user with that email already exists
		USER_MOBILEPHONE_EXISTS: 17,                   	// user with that mobile phone already exists
		PASSWORD_TOO_SHORT: 18,

		//Login Errors
		CANNOT_LOGIN_MOBILE_NOT_FOUND: 20,       		// when requesting an SMS login token and mobile number is not known
		CANNOT_LOGIN_EMAIL_NOT_FOUND: 21,          	// when requesting a login email and email is not known
		CANNOT_LOGIN_TOKEN_INVALID: 22,            	// when a email or sms login token is invalid or expired
		CANNOT_LOGIN_TEAM_NOT_FOUND: 23,           	// when changing team
		CANNOT_LOGIN_USER_NOT_MEMBER_OF_TEAM: 24,  	// when changing team and user is not member or admin of target team
		CANNOT_LOGIN_INTERNAL_ERROR: 25,  	// when sending of email is not possible
		CANNOT_REQUEST_SMS_TOKEN: 26,              	// eg. when entered mobile number is not valid
		WONT_RESET_PASSWORD: 28,	  // Someone requested a password reset for a non registered email.
		

		//JWT Errors  // these are now handled by Quarkus
		JWT_TOKEN_INVALID: 30,
		JWT_TOKEN_EXPIRED: 31,

		// use case errors
		INVALID_VOTER_TOKEN: 50,
		CANNOT_CREATE_POLL: 51,
		CANNOT_JOIN_POLL: 52,
		CANNOT_ADD_PROPOSAL: 53,
		CANNOT_START_VOTING_PHASE: 54,
		CANNOT_ASSIGN_PROXY: 55,                // assign or remove
		CANNOT_ASSIGN_CIRCULAR_PROXY: 56,
		CANNOT_REMOVE_PROXY: 57,
		CANNOT_CAST_VOTE: 58,
		CANNOT_GET_TOKEN: 59,
		CANNOT_FINISH_POLL: 60,
		NO_DELEGATION: 61,
		NO_BALLOT: 62,                          // 204: voter has no ballot yet. This is OK and not an error.
		INVALID_POLL_STATUS: 63,
		PUBLIC_CHECKSUM_NOT_FOUND: 64,
		CANNOT_ADD_SUPPORTER: 65,              // e.g. when user tries to support his own proposal

		CANNOT_CALCULATE_UNIQUE_RANKED_PAIR_WINNER: 70,    // this is only used in the exceptional situation, that no unique winner can be calculated in RankedPairVoting
		CANNOT_VERIFY_CHECKSUM: 80,              // ballot's checksum could not be verified

		// general errors
		GRAPHQL_ERROR: 400,                     // e.g. missing required fields, invalid GraphQL query, ...
		UNAUTHORIZED: 401,                     // when client tries to call something without being authenticated!
		CANNOT_FIND_ENTITY: 404,                  // 404: cannot find entity
		INTERNAL_ERROR: 500
	},

	/** default JQL queries for common models */
	JQL: JQL,

	isErrorCode: function(rejectedPromiseErr, errCode) {
		return rejectedPromiseErr &&
			  rejectedPromiseErr.liquidoException &&
				rejectedPromiseErr.liquidoException.liquidoErrorCode === errCode
	}
}
export default apiClient
