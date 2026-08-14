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
			poll.numBallots    = Math.floor(Math.random() * 12)									// 0-11 fake ballots

		}
		console.debug("MOCK: created new mockstate")
	})

	const nextPollId = Math.max(0, ...pollIds) + 1
	const nextProposalId = Math.max(0, ...proposalIds) + 1

	return {
		// A mock user can be a member of SEVERAL teams, so the mock holds a list and remembers which
		// one is current -- exactly the shape the real backend has. `teams[currentTeamIndex]` is what
		// used to be the single `mockState.team`; reach for it through currentTeam().
		teams: [seed.team, createSecondTeam(seed, nextPollId, nextProposalId)],
		currentTeamIndex: 0,
		//currentUser: seed.user,
		//jwt: seed.jwt,
		issuedAuthTokensByMobile: {},
		voterTokensByPollAndUser: {},
		ballotsByPollAndUser: {},
		nextPollId: nextPollId + 1,          // +1 for the poll createSecondTeam() just used
		nextProposalId: nextProposalId + 3,  // +3 for its three proposals
	}
}

/**
 * A SECOND team, so that the team switcher can be exercised with a mocked backend.
 *
 * It deliberately shares the seed team's admin (who is the default mock login) and two of its
 * members, because the switcher only appears for a user who is in more than one team. The rest of
 * the seed team's members stay in one team, which keeps the "single-team user sees no switcher"
 * case reachable too.
 *
 * Derived from the seed rather than written into teamUserJwt.json so that the two teams cannot drift
 * apart: the shared people here are by construction the very same user objects.
 */
const createSecondTeam = (seed, pollId, firstProposalId) => {
	const userByEmail = email => (seed.team.members || []).find(m => m.user?.email === email)?.user

	// The roles are swapped round on purpose. testadmin4711 is the ADMIN of the first team but only a
	// MEMBER here, because a user is not automatically an admin of every team they belong to - and the
	// team page hides its admin-only parts accordingly. Switching should visibly change that.
	const roles = [
		["testmember4711@liquido.vote", "ADMIN"],
		["testadmin4711@liquido.vote", "MEMBER"],
		["membr47110@liquido.vote", "MEMBER"],
	]
	const members = roles
		.map(([email, role]) => ({ role, user: userByEmail(email) }))
		.filter(m => m.user)
		.map(m => ({ role: m.role, joinedAt: nowIso(), user: deepClone(m.user) }))

	const proposal = (offset, title, description, icon) => ({
		id: firstProposalId + offset,
		title, description, icon,
		status: "PROPOSAL",
		createdAt: nowIso(),
		numSupporters: 0,
		likedByCurrentUser: false,
		createdBy: deepClone(members[0].user),
	})

	return {
		id: seed.team.id + 1,
		teamName: "Second Mock Team",
		inviteCode: "SECOND01",
		members,
		polls: [{
			id: pollId,
			title: "Where should the second team meet?",
			status: "ELABORATION",
			createdAt: nowIso(),
			updatedAt: nowIso(),
			userAlreadyVoted: false,
			winner: null,
			proposals: [
				proposal(0, "In the park", "Fresh air, and free.", "tree"),
				proposal(1, "At the office", "Boring, but it always works.", "building"),
				proposal(2, "Online", "Nobody has to travel.", "video"),
			],
		}],
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
				const state = JSON.parse(saved)
				// A state saved before the mock grew a team LIST has a single `team` and no `teams`.
				// Such a state would break every currentTeam() call, so start over instead.
				if (!Array.isArray(state.teams)) {
					console.log("MOCK: discarding mock state from an older schema")
					return createState()
				}
				console.log("MOCK: loaded mock state from sessionStorage")
				return state
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

const stringArrayArgFromQuery = (query, key) => {
	const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const regex = new RegExp(`${escapedKey}\\s*:\\s*\\[([^\]]*)\\]`, "i")
	const match = query.match(regex)
	if (!match) return []
	return match[1]
		.split(",")
		.map(item => stripQuotes(item.trim()))
		.filter(Boolean)
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
	// ORDER MATTERS: the first name found anywhere in the query string wins, and the query string
	// includes the whole result selection. So an operation whose result mentions "team" or "polls"
	// - which every login-shaped one does - must be listed BEFORE those generic names, or it gets
	// misrouted to them. That is why switchTeam sits at the very front.
	const operations = [
		"switchTeam",
		"createNewTeam", "joinTeam", "savePolly", "editPolly", "startPolly", "castVoteInPolly", "finishPolly", "createPoll", "addProposal", "likeProposal", "startVotingPhase",
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

/** The team the mock session is currently scoped to. This replaced the old single currentTeam(). */
const currentTeam = () => mockState.teams[mockState.currentTeamIndex]

/** Every team the given email is a member (or admin) of - the mock's TeamMemberEntity.findTeamsByMember. */
const teamsOfMember = email =>
	(mockState.teams || []).filter(t => (t.members || []).some(m => m.user?.email === email))

/**
 * Members are looked up across ALL teams, not just the current one: a user who belongs only to the
 * second team must still be able to log in. Prefer a hit in the current team so that "who am I"
 * stays stable while a session is scoped somewhere.
 */
const findMemberIn = (team, predicate) => (team?.members || []).find(predicate)
const findMemberAnywhere = predicate =>
	findMemberIn(currentTeam(), predicate) ||
	(mockState.teams || []).flatMap(t => t.members || []).find(predicate)

const findMemberByEmail = email => findMemberAnywhere(m => m.user?.email === email)
const findMemberByMobile = mobile => findMemberAnywhere(m => m.user?.mobilephone === mobile)
const findMemberByUserId = userId => findMemberAnywhere(m => String(m.user?.id) === String(userId))
const findPoll = pollId => (currentTeam().polls || []).find(p => p.id === pollId)
const pollyCreatorUser = () => deepClone(mockState.currentUser || {
	id: 0,
	name: "Polly Creator",
	email: "polly@mock.local",
	mobilephone: null,
	picture: "Avatar1.png",
	website: null,
})

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
 * Mirrors the real JwtTokenUtils.doLoginInternal(): the session is scoped to ONE team, which is the
 * requested one if given, otherwise the team the session is already in when the user belongs to it
 * (the mock's stand-in for lastTeamId), otherwise their first team.
 *
 * @param {String} email email of the user to log in
 * @param {Number} teamId (optional) pin the session to this team of the user
 * @returns {Object} login result { team, user, jwt, teams } ready to be passed to real graphQlApi.login()
 * @throws MockLiquidoError if email is not found, or is not a member of teamId
 */
const loginMock = (email, teamId) => {
	const member = findMemberByEmail(email)
	if (!member) {
		rejectLiquido(LiquidoExceptionCodes.UNAUTHORIZED, "Cannot mockLogin: user email not found: " + email)
	}

	const user = member.user
	const usersTeams = teamsOfMember(user.email)
	if (usersTeams.length === 0) {
		rejectLiquido(LiquidoExceptionCodes.CANNOT_LOGIN_USER_NOT_MEMBER_OF_TEAM, "Mock user is not member of any team")
	}

	let team
	if (teamId != null) {
		team = usersTeams.find(t => t.id === teamId)
		if (!team) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_LOGIN_USER_NOT_MEMBER_OF_TEAM,
				`Mock user <${user.email}> is not a member of team ${teamId}`)
		}
	} else {
		team = usersTeams.find(t => t.id === currentTeam().id) || usersTeams[0]
	}
	mockState.currentTeamIndex = mockState.teams.indexOf(team)

	// Simulate the cache initialization that happens in graphQlApi.login()
	mockState.currentUser = deepClone(user)
	mockState.jwt = `mock-jwt-${user.id}`
	saveMockState(mockState)

	console.log("Mock login successful for <" + user.email + "> into team '" + team.teamName + "'")

	return {
		team: deepClone(team),
		user: deepClone(user),
		jwt: mockState.jwt,
		// ALL teams of this user, so the frontend can offer the team switcher.
		teams: usersTeams.map(t => ({ id: t.id, teamName: t.teamName })),
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
})

const enrichTeamForCurrentUser = team => ({
	...deepClone(team),
	polls: (team.polls || []).map(enrichPollForCurrentUser),
})




	
const queryHandlers = {
	ping: () => "MOCK responses are active!",
	team: () => enrichTeamForCurrentUser(currentTeam()),
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
		const teamId = get(variables, "teamId", argFromQuery(query, "teamId"))
		return loginMock(email, teamId != null && teamId !== "null" ? asInt(teamId) : undefined)
	},
	polls: () => (currentTeam().polls || []).map(enrichPollForCurrentUser),
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
		if (inviteCode !== currentTeam().inviteCode) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_JOIN_TEAM_INVITE_CODE_INVALID, "Invite code not found")
		}
		return deepClone(currentTeam())
	},
}

const mutationHandlers = {
	/**
	 * Switch the session into another team of the current user. loginMock() does the membership
	 * check and rejects a team the user does not belong to, exactly as the real backend does.
	 */
	switchTeam: (query, variables = {}) => {
		const user = currentUserOrThrow()
		const teamId = asInt(get(variables, "teamId", argFromQuery(query, "teamId", "-1")))
		return loginMock(user.email, teamId)
	},
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
		// Initialize mockState for the newly created team. Registering as a brand-new user starts a
		// brand-new world, so the team list is reset to just this one rather than appended to - the
		// previous teams belonged to whoever was mocked before.
		mockState = {
			...mockState,
			teams: [newTeam],
			currentTeamIndex: 0,
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
	savePolly: (query, variables = {}) => {
		const title = get(variables, "title", argFromQuery(query, "title", "New Polly")).trim()
		const proposalTitles = get(variables, "proposalTitles", stringArrayArgFromQuery(query, "proposalTitles"))
			.map(proposalTitle => proposalTitle?.trim())
			.filter(Boolean)
		if (proposalTitles.length < 2) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_CREATE_POLL || LiquidoExceptionCodes.CANNOT_SAVE, "Need at least two proposals")
		}
		const createdBy = pollyCreatorUser()
		const poll = {
			id: mockState.nextPollId++,
			title,
			status: "ELABORATION",
			createdAt: nowIso(),
			updatedAt: nowIso(),
			votingStartAt: null,
			votingEndAt: null,
			userAlreadyVoted: false,
			proposals: proposalTitles.map(proposalTitle => ({
				id: mockState.nextProposalId++,
				title: proposalTitle,
				description: "",
				icon: "vote-yea",
				status: "ELABORATION",
				createdAt: nowIso(),
				numSupporters: 0,
				likedByCurrentUser: false,
				createdBy: deepClone(createdBy),
			})),
			winner: null,
		}
		currentTeam().polls.unshift(poll)
		return enrichPollForCurrentUser(poll)
	},
	editPolly: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Polly ${pollId} not found`)
		const title = get(variables, "title", argFromQuery(query, "title", "")).trim()
		const proposalTitles = get(variables, "proposalTitles", stringArrayArgFromQuery(query, "proposalTitles"))
			.map(proposalTitle => proposalTitle?.trim())
			.filter(Boolean)
		if (proposalTitles.length < 2) {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_SAVE, "Need at least two proposals")
		}
		poll.title = title
		poll.proposals = proposalTitles.map((proposalTitle, i) => {
			const existing = poll.proposals[i]
			return {
				id: existing?.id || mockState.nextProposalId++,
				title: proposalTitle,
				description: existing?.description || "",
				icon: existing?.icon || "vote-yea",
				status: existing?.status || "ELABORATION",
				createdAt: existing?.createdAt || nowIso(),
				numSupporters: existing?.numSupporters || 0,
				likedByCurrentUser: existing?.likedByCurrentUser || false,
				createdBy: existing?.createdBy || deepClone(pollyCreatorUser()),
			}
		})
		poll.updatedAt = nowIso()
		return enrichPollForCurrentUser(poll)
	},
	startPolly: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const userEmail = get(variables, "userEmail", argFromQuery(query, "userEmail"))
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Polly ${pollId} not found`)
		if (poll.status !== "ELABORATION") {
			rejectLiquido(LiquidoExceptionCodes.CANNOT_START_VOTING, "Polly is not in ELABORATION status")
		}
		console.log("MOCK: Sending admin and share links to " + userEmail)
		poll.status = "VOTING"
		poll.votingStartAt = nowIso()
		poll.updatedAt = nowIso()
		;(poll.proposals || []).forEach(p => {
			if (p.status === "ELABORATION") p.status = "VOTING"
		})
		return enrichPollForCurrentUser(poll)
	},
	castVoteInPolly: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const voteOrderIds = variables?.voteOrderIds || voteOrderFromQuery(query)
		const voterToken = get(variables, "voterToken", argFromQuery(query, "voterToken"))
		const user = currentUserOrThrow()
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Polly ${pollId} not found`)
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
			checksum: `mock-polly-${pollId}-${user.id}-${Date.now()}`,
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
	finishPolly: (query, variables = {}) => {
		const pollId = asInt(get(variables, "pollId", argFromQuery(query, "pollId", "-1")))
		const poll = findPoll(pollId)
		if (!poll) rejectLiquido(LiquidoExceptionCodes.CANNOT_FIND_ENTITY, `Polly ${pollId} not found`)
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
	joinTeam: (query, variables = {}) => {
		const inviteCode = get(variables, "inviteCode", argFromQuery(query, "inviteCode"))
		if (inviteCode !== currentTeam().inviteCode) {
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
		currentTeam().members.push({ role: "MEMBER", joinedAt: nowIso(), user: newUser })
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
		currentTeam().polls.unshift(poll)
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
		teamCache.put(graphQlApi.TEAM_KEY, currentTeam())
		teamCache.put(graphQlApi.CURRENT_USER_KEY, mockState.currentUser)
		teamCache.put(graphQlApi.JWT_KEY, mockState.jwt)
		// Restore the user's team list too, or the team switcher would silently disappear on reload.
		teamCache.put(graphQlApi.ALL_USER_TEAMS_KEY,
			teamsOfMember(mockState.currentUser.email).map(t => ({ id: t.id, teamName: t.teamName })))
		graphQlApi.putPollsIntoCache(currentTeam().polls)
	}

	if (mockRequestInterceptorInstalled) return
	mockRequestInterceptorInstalled = true

	axios.interceptors.request.use(config => {
		if (config.url.includes("/login/check-login-email")) {
			const email = config.params.email
			const member = currentTeam().members.find(m => m.user.email === email)
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
