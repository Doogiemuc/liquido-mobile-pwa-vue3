import axios from "axios"
import { get, isValidString, set } from "@kubric/litedash"
import config from "config"
import teamUserJwtMock from "@/mockdata/teamUserJwt.json"
import LiquidoExceptionCodes from "@/services/LiquidoExceptionCodes.js"

const deepClone = val => JSON.parse(JSON.stringify(val))
const nowIso = () => new Date().toISOString()

class MockLiquidoError extends Error {
	constructor(code, message) {
		super(message)
		this.code = code
	}
}

/**
 * Creates the initial mock state object.
 * Clones the seed data from teamUserJwtMock and calculates the next available IDs 
 * for polls and proposals to ensure unique ID generation during the session.
 */
const createState = () => {
	const seed = deepClone(teamUserJwtMock)
	const pollIds = (seed.team?.polls || []).map(p => p.id)
	const proposalIds = (seed.team?.polls || []).flatMap(p => (p.proposals || []).map(pr => pr.id))

	
	seed.team.polls.forEach(poll => {
		if (poll.status == 'VOTING') {
			// mock dates  poll.votingStartAt and votingEndAt for polls in voting
			const msInDay = 1000 * 60 * 60 * 24;																// I LOVE time calculations :-) If we'll ever understand why we humans have sooo much trouble grasping the concept of time, we'll be able to explore space.
			const randomPast = Date.now() + (-4 + Math.random()*3) * msInDay   	// 1-4 days in the past
			const randomDuration = (7 + Math.random()*7) * msInDay							// 7-14 days duration for voting
			poll.votingStartAt = new Date(randomPast).toISOString()
			poll.votingEndAt   = new Date(randomPast + randomDuration).toISOString();
		}
		// Ballots that "other team members" already cast. The real backend counts rows in the
		// ballots table, so a poll that is being voted on or is already finished must show a
		// number in both states - not just in VOTING. Ballots cast by the mock user during the
		// session are added on top of this baseline, see enrichPollForCurrentUser().
		if (poll.status == 'VOTING' || poll.status == 'FINISHED') {
			poll.numBallots = Math.floor(Math.random() * 12)										// 0-11 fake ballots
		}
		console.debug("MOCK: created new mockstate")
	})

	return {
		team: seed.team,
		//currentUser: seed.user,
		//jwt: seed.jwt,
		issuedAuthTokensByMobile: {},
		voterTokensByPollAndUser: {},
		ballotsByPollAndUser: {},
		nextPollId: Math.max(0, ...pollIds) + 1,
		nextProposalId: Math.max(0, ...proposalIds) + 1,
	}
}

const MOCK_STATE_KEY = "LIQUIDO_MOCK_STATE"

/**
 * Persists the current mock state to the browser's sessionStorage.
 * This allows the mock "database" to survive page reloads within the same tab.
 * @param {Object} state - The mock state object to save.
 */
const saveMockState = (state) => {
	try {
		if (typeof window !== 'undefined' && window.sessionStorage) {
			window.sessionStorage.setItem(MOCK_STATE_KEY, JSON.stringify(state))
		}
	} catch (e) {
		console.error("Failed to save mock state to sessionStorage", e)
	}
}

/**
 * Loads the mock state from sessionStorage.
 * If no saved state is found, it initializes a new state using createState().
 * @returns {Object} The loaded or newly created mock state.
 */
const loadMockState = () => {
	try {
		if (typeof window !== 'undefined' && window.sessionStorage) {
			const saved = window.sessionStorage.getItem(MOCK_STATE_KEY)
			if (saved) {
				console.log("MOCK: loaded mock state from sessionStorage")
				return JSON.parse(saved)
			}
		}
	} catch (e) {
		console.error("Failed to load mock state from sessionStorage", e)
	}
	return createState()
}

let mockState = loadMockState()
let mockRequestInterceptorInstalled = false

const asInt = value => parseInt(value, 10)
const ballotKey = (pollId, userId) => `${pollId}:${userId}`
const stripQuotes = value => (value || "").replace(/^"|"$/g, "")

const argFromQuery = (query, key, defaultValue = undefined) => {
	const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const regex = new RegExp(`${escapedKey}\\s*:\\s*([^,)]+)`, "i")
	const match = query.match(regex)
	if (!match) return defaultValue
	return stripQuotes(match[1].trim())
}

const voteOrderFromQuery = query => {
	const match = query.match(/voteOrderIds\s*:\s*\[([^\]]*)\]/i)
	if (!match) return []
	return match[1]
		.split(",")
		.map(it => it.trim())
		.filter(Boolean)
		.map(it => parseInt(it, 10))
		.filter(Number.isFinite)
}

const rejectLiquido = (code, message) => {
	throw new MockLiquidoError(code, message)
}

const mockErrorResponse = err => {
	if (!(err instanceof MockLiquidoError)) return err
	const liquidoException = {
		liquidoErrorCode: err.code,
		msg: err.message,
	}
	return {
		msg: err.message,
		liquidoException,
		errors: [
			{
				message: err.message,
				extensions: { liquidoException },
			},
		],
		response: {
			data: {
				liquidoErrorCode: err.code,
				msg: err.message,
			},
		},
	}
}

const detectOperation = query => {
	const operations = [
		"createNewTeam", "joinTeam", "createPoll", "addProposal", "likeProposal", "startVotingPhase",
		"finishVotingPhase", "castVote", "loginWithEmailPassword", "googleOneTapLogin", "loginWithAuthToken",
		"requestPasswordReset", "resetPassword", "requestEmailLoginLink", "teamForInviteCode", "loginWithJwt",
		"devLogin", "authToken", "voterToken", "verifyBallot", "myBallot", "polls", "poll", "team", "ping",
	]
	for (const name of operations) {
		if (new RegExp(`\\b${name}\\s*\\(`).test(query) || new RegExp(`\\b${name}\\b`).test(query)) {
			return name
		}
	}
	return null
}

const findMemberByEmail = email => (mockState.team.members || []).find(m => m.user?.email === email)
const findMemberByMobile = mobile => (mockState.team.members || []).find(m => m.user?.mobilephone === mobile)
const findMemberByUserId = userId => (mockState.team.members || []).find(m => String(m.user?.id) === String(userId))
const findPoll = pollId => (mockState.team.polls || []).find(p => p.id === pollId)

const jwtFromAuthHeader = () => {
	const authHeader = axios.defaults.headers.common.Authorization || ""
	const match = authHeader.match(/^Bearer\s+(.+)$/i)
	return match ? match[1] : undefined
}

const findMemberByJwt = jwt => {
	if (jwt === teamUserJwtMock.jwt) return findMemberByUserId(teamUserJwtMock.user.id)
	const match = (jwt || "").match(/^mock-jwt-(.+)$/)
	if (!match) return undefined
	return findMemberByUserId(match[1])
}

const currentUserOrThrow = () => {
	if (!mockState.currentUser) {
		rejectLiquido(LiquidoExceptionCodes.UNAUTHORIZED, "Mock user is not authenticated")
	}
	return mockState.currentUser
}

/**
 * Central login method for mock backend.
 * Simulates the complete login logic that happens in the real graphQlApi.login() method.
 * This sets up the mock state properly so that subsequent API calls work correctly.
 * 
 * @param {String} email email of the user to log in
 * @returns {Object} login result { team, user, jwt } ready to be passed to real graphQlApi.login()
 * @throws MockLiquidoError if email is not found
 */
const loginMock = email => {
	const member = findMemberByEmail(email)
	if (!member) {
		rejectLiquido(LiquidoExceptionCodes.UNAUTHORIZED, "Cannot mockLogin: user email not found: " + email)
	}

	const user = member.user

	// Simulate the cache initialization that happens in graphQlApi.login()
	mockState.currentUser = deepClone(user)
	mockState.jwt = `mock-jwt-${user.id}`
	saveMockState(mockState)

	console.log("Mock login successful for <" + user.email + "> into team '" + mockState.team.teamName + "'")

	return {
		team: deepClone(mockState.team),
		user: deepClone(user),
		jwt: mockState.jwt,
	}
}

const countVotesForPoll = pollId => Object.keys(mockState.ballotsByPollAndUser)
	.filter(key => key.startsWith(`${pollId}:`)).length

const currentUserId = () => mockState.currentUser?.id

const hasCurrentUserVoted = pollId => {
	const userId = currentUserId()
	if (userId == null) return false
	return Boolean(get(mockState, `ballotsByPollAndUser.${ballotKey(pollId, userId)}`))
}

const enrichPollForCurrentUser = poll => ({
	...deepClone(poll),
	userAlreadyVoted: hasCurrentUserVoted(poll.id),
	// The backend derives numBallots live from the ballots table (PollEntity.getNumBallots()).
	// Mirror that here: the seeded baseline plus every ballot cast during this mock session.
	numBallots: (poll.numBallots || 0) + countVotesForPoll(poll.id),
})

const enrichTeamForCurrentUser = team => ({
	...deepClone(team),
	polls: (team.polls || []).map(enrichPollForCurrentUser),
})




	
const queryHandlers = {
	ping: () => "MOCK responses are active!",
	team: () => enrichTeamForCurrentUser(mockState.team),
	loginWithJwt: () => {
		console.log("========> MOCKED loginWithJwt")
		const member = findMemberByJwt(jwtFromAuthHeader())
		if (!member) {
			rejectLiquido(LiquidoExceptionCodes.JWT_TOKEN_INVALID, "Invalid mock JWT")
		}
		return loginMock(member.user.email)
	},
	requestEmailLoginLink: (query, variables = {}) => {
		const email = get(variables, "email", argFromQuery(query, "email"))
		if (!findMemberByEmail(email)) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_LOGIN_EMAIL_NOT_FOUND, "Unknown email")
		}
		return true
	},
	loginWithEmailPassword: (query, variables = {}) => {
		const email = get(variables, "email", argFromQuery(query, "email"))
		if (!findMemberByEmail(email)) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_LOGIN_EMAIL_NOT_FOUND, "Unknown email")
		}
		return loginMock(email)
	},
	requestPasswordReset: (query, variables = {}) => {
		const email = get(variables, "email", argFromQuery(query, "email"))
		if (!findMemberByEmail(email)) {
			rejectLiquido(LiquidoExceptionCodes.WONT_RESET_PASSWORD, "Cannot reset password for unknown email")
		}
		return true
	},
	resetPassword: (query, variables = {}) => {
		const email = get(variables, "email", argFromQuery(query, "email"))
		if (!findMemberByEmail(email)) {
			rejectLiquido(LiquidoExceptionCodes.WONT_RESET_PASSWORD, "Cannot reset password for unknown email")
		}
		return true
	},
	googleOneTapLogin: () => {
		const user = currentUserOrThrow()
		return loginMock(user.email)
	},
	authToken: (query, variables = {}) => {
		const mobilephone = get(variables, "mobilephone", argFromQuery(query, "mobilephone"))
		const member = findMemberByMobile(mobilephone)
		if (!member) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_LOGIN_MOBILE_NOT_FOUND, "Unknown mobilephone")
		}
		set(mockState, `issuedAuthTokensByMobile.${mobilephone}`, config.devLogin.mockSmsToken)
		return true
	},
	loginWithAuthToken: (query, variables = {}) => {
		const mobilephone = get(variables, "mobilephone", argFromQuery(query, "mobilephone"))
		const authToken = get(variables, "authToken", argFromQuery(query, "authToken"))
		const member = findMemberByMobile(mobilephone)
		if (!member) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_LOGIN_MOBILE_NOT_FOUND, "Unknown mobilephone")
		}
		if (get(mockState, `issuedAuthTokensByMobile.${mobilephone}`) !== authToken) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_LOGIN_TOKEN_INVALID, "Invalid auth token")
		}
		return loginMock(member.user.email)
	},
	devLogin: (query, variables = {}) => {
		const email = get(variables, "email", argFromQuery(query, "email"))
		if (!findMemberByEmail(email)) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_LOGIN_EMAIL_NOT_FOUND, "Unknown user for devLogin")
		}
		return loginMock(email)
	},
	polls: () => (mockState.team.polls || []).map(enrichPollForCurrentUser),
	poll: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Poll ${pollId} not found`)
		return enrichPollForCurrentUser(poll)
	},
	voterToken: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const user = currentUserOrThrow()
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Poll ${pollId} not found`)
		const token = `mock-voter-${pollId}-${user.id}`
		set(mockState, `voterTokensByPollAndUser.${ballotKey(pollId, user.id)}`, token)
		return token
	},
	myBallot: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const user = currentUserOrThrow()
		return deepClone(get(mockState, `ballotsByPollAndUser.${ballotKey(pollId, user.id)}`, null))
	},
	verifyBallot: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const checksum = get(variables, "checksum", argFromQuery(query, "checksum"))
		const match = Object.entries(mockState.ballotsByPollAndUser)
			.find(([key, ballot]) => key.startsWith(`${pollId}:`) && ballot?.checksum === checksum)
		return match ? deepClone(match[1]) : null
	},
	teamForInviteCode: (query, variables = {}) => {
		const inviteCode = get(variables, "inviteCode", argFromQuery(query, "inviteCode"))
		if (inviteCode !== mockState.team.inviteCode) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_JOIN_TEAM_INVITE_CODE_INVALID, "Invite code not found")
		}
		return deepClone(mockState.team)
	},
}

const mutationHandlers = {
	createNewTeam: (query, variables = {}) => {
		const teamName = get(variables, "teamName", argFromQuery(query, "teamName", "Mock Team"))
		const admin = get(variables, "admin", { name: "Mock Admin", email: `admin.${Date.now()}@mock.local` })
		const userId = Date.now()
		const adminUser = {
			id: userId,
			name: admin.name || "Mock Admin",
			email: admin.email || `admin.${userId}@mock.local`,
			mobilephone: admin.mobilephone || null,
			picture: admin.picture || "Avatar1.png",
			website: admin.website || null,
		}
		const newTeam = {
			id: userId,
			teamName,
			inviteCode: Math.random().toString(36).slice(2, 10),
			members: [{ role: "ADMIN", joinedAt: nowIso(), user: adminUser }],
			polls: [],
		}
		// Initialize mockState for the newly created team
		mockState = {
			...mockState,
			team: newTeam,
			currentUser: adminUser,
			jwt: `mock-jwt-${userId}`,
			issuedAuthTokensByMobile: {},
			voterTokensByPollAndUser: {},
			ballotsByPollAndUser: {},
			nextPollId: 1,
			nextProposalId: 1,
		}
		saveMockState(mockState)
		
		// Return login result with the newly created team and admin
		return {
			team: deepClone(newTeam),
			user: deepClone(adminUser),
			jwt: mockState.jwt,
		}
	},
	joinTeam: (query, variables = {}) => {
		const inviteCode = get(variables, "inviteCode", argFromQuery(query, "inviteCode"))
		if (inviteCode !== mockState.team.inviteCode) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_JOIN_TEAM_INVITE_CODE_INVALID, "Invite code invalid")
		}
		const memberInput = get(variables, "member", null)
		if (!memberInput || !isValidString(memberInput.email)) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_REGISTER_NEED_EMAIL, "Email is required")
		}
		const existing = findMemberByEmail(memberInput.email)
		if (existing) {
			// User already exists, just log them in
			return loginMock(existing.user.email)
		}
		// Create new team member
		const newUser = {
			id: Date.now(),
			name: memberInput.name || memberInput.email,
			email: memberInput.email,
			mobilephone: memberInput.mobilephone || null,
			picture: memberInput.picture || "Avatar1.png",
			website: memberInput.website || null,
		}
		mockState.team.members.push({ role: "MEMBER", joinedAt: nowIso(), user: newUser })
		saveMockState(mockState)
		// Log in the newly created member
		return loginMock(newUser.email)
	},
	createPoll: (query, variables = {}) => {
		const title = get(variables, "title", argFromQuery(query, "title", "New Mock Poll"))
		const poll = {
			id: mockState.nextPollId++,
			title,
			status: "ELABORATION",
			createdAt: nowIso(),
			updatedAt: nowIso(),
			votingStartAt: null,
			votingEndAt: null,
			userAlreadyVoted: false,
			proposals: [],
			winner: null,
		}
		mockState.team.polls.unshift(poll)
		return enrichPollForCurrentUser(poll)
	},
	addProposal: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Poll ${pollId} not found`)
		const user = currentUserOrThrow()
		poll.proposals.push({
			id: mockState.nextProposalId++,
			title: get(variables, "title", argFromQuery(query, "title", "Mock proposal")),
			description: get(variables, "description", argFromQuery(query, "description", "")),
			icon: get(variables, "icon", argFromQuery(query, "icon", "vote-yea")),
			status: poll.status === "VOTING" ? "VOTING" : "ELABORATION",
			createdAt: nowIso(),
			numSupporters: 0,
			likedByCurrentUser: false,
			createdBy: deepClone(user),
		})
		poll.updatedAt = nowIso()
		return deepClone(poll)
	},
	likeProposal: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const proposalId = asInt(get(variables, "proposalId", argFromQuery(query, "proposalId", "-1")))
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Poll ${pollId} not found`)
		const proposal = (poll.proposals || []).find(p => p.id === proposalId)
		if (!proposal) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Proposal ${proposalId} not found`)
		proposal.likedByCurrentUser = !proposal.likedByCurrentUser
		proposal.numSupporters = Math.max(0, (proposal.numSupporters || 0) + (proposal.likedByCurrentUser ? 1 : -1))
		poll.updatedAt = nowIso()
		return deepClone(poll)
	},
	startVotingPhase: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Poll ${pollId} not found`)
		poll.status = "VOTING"
		poll.votingStartAt = nowIso()
		poll.updatedAt = nowIso()
		;(poll.proposals || []).forEach(p => {
			if (p.status === "ELABORATION") p.status = "VOTING"
		})
		return deepClone(poll)
	},
	finishVotingPhase: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Poll ${pollId} not found`)
		const winner = (poll.proposals || [])
			.slice()
			.sort((a, b) => (b.numSupporters || 0) - (a.numSupporters || 0))[0] || null
		poll.status = "FINISHED"
		poll.votingEndAt = nowIso()
		poll.updatedAt = nowIso()
		poll.winner = winner ? deepClone(winner) : null
		;(poll.proposals || []).forEach(proposal => {
			proposal.status = winner && proposal.id === winner.id ? "WINNER" : "LOST"
		})
		return deepClone(winner)
	},
	castVote: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const voteOrderIds = variables?.voteOrderIds || voteOrderFromQuery(query)
		const voterToken = get(variables, "voterToken", argFromQuery(query, "voterToken"))
		const user = currentUserOrThrow()
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Poll ${pollId} not found`)
		const expectedToken = get(mockState, `voterTokensByPollAndUser.${ballotKey(pollId, user.id)}`)
		if (!expectedToken || expectedToken !== voterToken) {
			rejectLiquido(LiquidoExceptionCodes.INVALID_VOTER_TOKEN, "Invalid voter token")
		}
		const proposalIds = new Set((poll.proposals || []).map(p => p.id))
		if (voteOrderIds.length === 0 || voteOrderIds.some(id => !proposalIds.has(id))) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_CAST_VOTE, "Invalid vote order")
		}
		const ballot = {
			level: 0,
			checksum: `mock-${pollId}-${user.id}-${Date.now()}`,
			voteOrder: voteOrderIds.map(id => ({ id })),
		}
		set(mockState, `ballotsByPollAndUser.${ballotKey(pollId, user.id)}`, ballot)
		poll.userAlreadyVoted = true
		poll.updatedAt = nowIso()
		return {
			voteCount: countVotesForPoll(pollId),
			ballot: deepClone(ballot),
		}
	},
}

export const graphQlQueryMock = function(query, variables) {
	console.log("MOCK request for", query, variables)
	try {
		const operation = detectOperation(query)
		if (!operation) {
			return Promise.reject(`Unhandled mock query: ${query}`)
		}
		const isMutation = /^\s*mutation\b/.test(query)
		const handler = isMutation ? mutationHandlers[operation] : queryHandlers[operation]
		if (!handler) {
			return Promise.reject(`Unhandled mock ${isMutation ? "mutation" : "query"}: ${operation}`)
		}
		const payload = handler(query, variables)
		saveMockState(mockState)
		if (operation === "myBallot") {
			return Promise.resolve({ data: { myBallot: payload, ballot: payload } })
		}
		return Promise.resolve({ data: { [operation]: payload } })
	} catch (err) {
		return Promise.reject(mockErrorResponse(err))
	}
}

/**
 * Resets the global mockState to its initial default values and 
 * persists this reset state to sessionStorage.
 */
export const resetGraphQlMockState = function() {
	mockState = createState()
	saveMockState(mockState)
}

/**
 * Initializes the Liquido GraphQL mock environment.
 * This function restores state from storage, seeds the application's internal 
 * teamCache if a valid session exists, and installs axios interceptors to 
 * mock specific REST endpoints (like WebAuthn).
 */
export const initializeLiquidoGraphQlMock = function(graphQlApi, teamCache) {
	console.warn("==================================")
	console.warn("======== MOCK is active! =========")
	console.warn("==================================")
	if (typeof window !== 'undefined' && window.sessionStorage && !window.sessionStorage.getItem(MOCK_STATE_KEY)) {
		resetGraphQlMockState()
	} else {
		mockState = loadMockState()
	}

	/**
	 * Only seed the app's internal cache if we have a mock session saved 
	 * AND there isn't a real JWT in localStorage being handled by the router.
	 */
	if (mockState.currentUser && localStorage.getItem(graphQlApi.LIQUIDO_JWT_KEY) === mockState.jwt) {
		teamCache.put(graphQlApi.TEAM_KEY, mockState.team)
		teamCache.put(graphQlApi.CURRENT_USER_KEY, mockState.currentUser)
		teamCache.put(graphQlApi.JWT_KEY, mockState.jwt)
		graphQlApi.putPollsIntoCache(mockState.team.polls)
	}

	if (mockRequestInterceptorInstalled) return
	mockRequestInterceptorInstalled = true

	axios.interceptors.request.use(config => {
		if (config.url.includes("/login/check-login-email")) {
			const email = config.params.email
			const member = mockState.team.members.find(m => m.user.email === email)
			if (member) {
				console.log("MOCK: /check-login-email for " + email + " -> existing user")
				config.adapter = config => {
					return Promise.resolve({
						data: { status: "REGISTERED", webauthn: true },
						status: 200,
						statusText: "OK",
						headers: { "Content-Type": "application/json" },
						config: config,
						request: {},
					})
				}
			} else {
				console.log("MOCK: /check-login-email for " + email + " -> email not registered")
				config.adapter = config => {
					return Promise.resolve({
						data: { status: "UNKNOWN", webauthn: false },
						status: 200,
						statusText: "OK",
						headers: { "Content-Type": "application/json" },
						config: config,
						request: {},
					})
				}
			}
		} else if (
			config.url.includes("/webauthn/register-options-challenge") ||
			config.url.includes("/webauthn/register") ||
			config.url.includes("/webauthn/login-options-challenge")
		) {
			console.log("MOCK: /webauthn mock request to " + config.url + " -> simulating connection error")
			config.adapter = config => {
				const error = new Error("Network Error")
				error.code = "ECONNREFUSED"
				error.config = config
				error.request = {}
				return Promise.reject(error)
			}
		}
		return config
	})
}
