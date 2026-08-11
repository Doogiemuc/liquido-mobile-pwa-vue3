/**
 * Polly API client
 *
 * A Polly is the small, fun, cute sibling of a LIQUIDO poll: no team, no registration,
 * no login screen. You type a question and some options, tap your passkey, and share one link.
 *
 * This module is deliberately self-contained.
 *
 *   IT MUST NOT IMPORT liquido-graphql-client.js - and nothing outside src/polly/ may import it.
 *
 * That rule is the whole point. The first attempt at Polly reused the team client, and a polly
 * promptly leaked into the team's poll list through the shared pollsCache. Sharing bought little
 * and cost a discriminator field, a cache filter and two authorization regimes on one row.
 * So: own transport, own session, own state. The only thing Polly shares with LIQUIDO polls is
 * the winner algorithm, and that lives in the backend.
 */

import axios from "axios"
import config from "config"
import { PollyError, POLLY_STATUS } from "./polly-constants.js"
import { getSessionJwt, hasSession, setSession, clearSession } from "./polly-session.js"
import { pollyQueryMock, isPollyMockActive } from "./polly-client.mock.js"

const GRAPHQL = "/graphql"

/**
 * Our own axios instance.
 *
 * liquido-graphql-client.js mutates the *global* axios defaults (baseURL, Authorization header)
 * and installs global interceptors. Creating our own instance and attaching the polly JWT
 * per request keeps the two sessions from ever seeing each other's headers.
 */
const http = axios.create({
	baseURL: config.LIQUIDO_API_URL,
	timeout: 10000,
})

http.interceptors.request.use(req => {
	const jwt = getSessionJwt()
	if (jwt) req.headers.Authorization = "Bearer " + jwt
	return req
})

/** What we ask the backend to return for a polly. */
const POLLY_FIELDS = `{
	publicId
	title
	status
	createdAt
	votingEndAt
	numBallots
	isOwner
	alreadyVoted
	proposals { id title }
	winner { id title }
}`

/**
 * Send a GraphQL operation to the polly backend.
 * Rejects with { pollyErrorCode, msg } so callers can branch on a stable code.
 */
async function pollyQuery(query, variables) {
	if (isPollyMockActive()) return pollyQueryMock(query, variables)

	return http.post(GRAPHQL, { query, variables })
		.then(res => {
			// GraphQL answers HTTP 200 even for errors and puts them in an `errors` array
			if (res.data?.errors?.length > 0) {
				const first = res.data.errors[0]
				return Promise.reject({
					pollyErrorCode: first.extensions?.pollyErrorCode,
					msg: first.message,
				})
			}
			return res.data
		})
		.catch(err => {
			if (err?.pollyErrorCode !== undefined) return Promise.reject(err)	// already shaped above
			console.error("polly-client: request failed", err)
			return Promise.reject({ pollyErrorCode: undefined, msg: err?.message || "Network error" })
		})
}

const pollyApi = {

	PollyError,
	POLLY_STATUS,

	hasSession,
	setSession,
	clearSession,
	getSessionJwt,

	/** The one link the admin shares. Everybody opens the same URL - there is no admin link. */
	shareLinkFor(publicId) {
		return config.pollyLinkPrefix + publicId
	},

	/**
	 * Create a polly. It is open for voting immediately - there is no start step.
	 * Requires a passkey session; the caller becomes the owner.
	 *
	 * @param {String} title the question
	 * @param {Array} proposalTitles the options, in the order they were typed
	 */
	async createPolly(title, proposalTitles) {
		const query = `mutation createPolly($title: String!, $proposalTitles: [String!]!) {
			createPolly(title: $title, proposalTitles: $proposalTitles) ${POLLY_FIELDS}
		}`
		return pollyQuery(query, { title: (title || "").trim(), proposalTitles })
			.then(res => res.data.createPolly)
	},

	/**
	 * Read a polly by its public id.
	 * Works without a session (a friend just opened the link). With a session the answer
	 * also says whether this visitor owns it and whether they already voted.
	 */
	async getPolly(publicId) {
		const query = `query polly($publicId: String!) { polly(publicId: $publicId) ${POLLY_FIELDS} }`
		return pollyQuery(query, { publicId }).then(res => res.data.polly)
	},

	/** Change title or options. Owner only, and only while nobody has voted. */
	async editPolly(publicId, title, proposalTitles) {
		const query = `mutation editPolly($publicId: String!, $title: String!, $proposalTitles: [String!]!) {
			editPolly(publicId: $publicId, title: $title, proposalTitles: $proposalTitles) ${POLLY_FIELDS}
		}`
		return pollyQuery(query, { publicId, title: (title || "").trim(), proposalTitles })
			.then(res => res.data.editPolly)
	},

	/**
	 * Cast a ballot: the option ids in the voter's preferred order, favourite first.
	 *
	 * No voterToken. The passkey session identifies the voter, and the backend enforces
	 * one ballot per (polly, credential) with a unique constraint. That makes a polly ballot
	 * pseudonymous rather than truly anonymous - a deliberate trade for a poll among friends.
	 * A LIQUIDO team poll keeps the voterToken indirection and stays fully anonymous.
	 *
	 * voteOrder is declared [String!]!, not [ID!]!. The backend cannot offer an ID scalar here:
	 * MicroProfile's @Id applies to the outer type before SmallRye unwraps the collection, so a
	 * list of IDs is inexpressible, and the generated schema has no ID type at all. GraphQL
	 * requires a variable's named type to match the argument's exactly, so [ID!]! is rejected
	 * before any resolver runs. The values on the wire are identical either way.
	 */
	async voteInPolly(publicId, voteOrder) {
		const query = `mutation voteInPolly($publicId: String!, $voteOrder: [String!]!) {
			voteInPolly(publicId: $publicId, voteOrder: $voteOrder) ${POLLY_FIELDS}
		}`
		return pollyQuery(query, { publicId, voteOrder: (voteOrder || []).map(String) })
			.then(res => res.data.voteInPolly)
	},

	/** Close the polly and calculate the winner (Ranked Pairs, shared with LIQUIDO polls). Owner only. */
	async finishPolly(publicId) {
		const query = `mutation finishPolly($publicId: String!) { finishPolly(publicId: $publicId) ${POLLY_FIELDS} }`
		return pollyQuery(query, { publicId }).then(res => res.data.finishPolly)
	},

	/**
	 * Every polly this passkey created.
	 * This is why a polly needs no email: the passkey is both the login and the bookmark.
	 */
	async myPollys() {
		const query = `query myPollys { myPollys ${POLLY_FIELDS} }`
		return pollyQuery(query).then(res => res.data.myPollys || [])
	},
}

export default pollyApi
