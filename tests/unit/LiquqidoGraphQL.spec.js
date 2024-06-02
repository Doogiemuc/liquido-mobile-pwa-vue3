/**
 * Unit tests for liquido-graphql-client.js
 * Now implemented with VUE testing "vitest"
 * 
 */

// Must run jasmine through babel for ES6 import: https://github.com/piecioshka/boilerplate-jasmine-babel
// import "jasmine";
// Tried several ways to get Yasmine, but that did't work:
// https://x-team.com/blog/setting-up-javascript-testing-tools-for-es6/
// https://itenium.be/blog/javascript/javascript-testing-jasmine-getting-started/

import { beforeAll, test, expect } from 'vitest'
import client from '@/services/liquido-graphql-client'
import config from "config"

let now,fix, t = {}

beforeAll(async () => {
	console.log("Running LIQUIDO Vitest Tests in '" + process.env.NODE_ENV +  "'. config.LIQUIDO_API_URL=" + config.LIQUIDO_API_URL)
	now = Date.now() % 1000000
	fix = {
		admin: {
			name: 'GAdmin-'+now,
			email: 'gAdmin-'+now+'@liquido.me',
			mobilephone: '+49 666 '+now
		},
		member: {
			name : 'GMember'+now,
			email: 'GMember-'+now+'@liquido.me',
			mobilephone: '+49 555 '+now
		},
		team: {
			teamName: 'GTeam '+now
		},
		poll: {
			title: "Poll from vitest " + now
		},
		proposal1: {
			title: "Vitest Proposal 1 " + now,
			description: "Dorem ipsum dolor umut asflkj lk adfg324ttmndv asdgsadg",
			icon: "cross"
		},
		proposal2: {
			title: "Second Proposal " + now,
			description: "This is the second proposal",
			icon: "cross"
		},
	}
})

test.only('GET GraphQL schmea', async function() {
	return client.getGraphQLSchema().then(res => {
		expect(res.data).to.contain("castVote")
	})
})

test('ADMIN:  create new team', async function() {
	// WHEN creating a new team
	return client.createNewTeam(fix.team.teamName, fix.admin)
		.then(team => {
			// THEN the correct teamName and admin email is returned
			expect(team.teamName).toBe(fix.team.teamName)
			//expect(user.email).toBe(fix.admin.email)
			console.debug("Successfully created Team", team.inviteCode)
			t.team = client.teamCache.getSync(client.TEAM_KEY)
			t.admin = client.teamCache.getSync(client.CURRENT_USER_KEY)
			t.adminJWT = client.teamCache.getSync(client.JWT_KEY)
		})
		.catch(err => {
			console.error("TEST ERROR", err)
			return Promise.reject(err)
		})
})

test ('MEMBER: joinTeam', async function() {
	client.logout()
	console.debug("Joining team " + t.team.teamName)
	return client.joinTeam(t.team.inviteCode, fix.member)
		.then(team2 => {
			expect(team2).to.not.be.null
			t.team = client.teamCache.getSync(client.TEAM_KEY)
			t.member = client.teamCache.getSync(client.CURRENT_USER_KEY)
			t.memberJWT = client.teamCache.getSync(client.JWT_KEY)
			console.debug("Successfully joined team")
		})
})

test('ADMIN:  create poll', async function() {
	client.login(t.team, t.admin, t.adminJWT)
	return client.createPoll(fix.poll.title)
		.then(poll => {
			console.log("Successfully created new Poll")
			t.poll = poll
		})
})

test('MEMBER: add proposal to poll', async function() {
	client.login(t.team, t.member, t.memberJWT)
	return client.addProposal(t.poll.id, fix.proposal1.title, fix.proposal1.description, fix.proposal1.icon)
		.then(poll => {
			console.log("Successfully added proposal to poll")
			t.poll = poll
		})
})

test('ADMIN:  add proposal to poll', async function() {
	client.login(t.team, t.admin, t.adminJWT)
	return client.addProposal(t.poll.id, fix.proposal2.title, fix.proposal2.description, fix.proposal2.icon)
		.then(poll => {
			console.log("Successfully added second proposal to poll")
			t.poll = poll
		})
})

test('MEMBER: like proposal', function() {
	client.login(t.team, t.member, t.memberJWT)
	return client.likeProposal(t.poll.id, t.poll.proposals[1].id)
		.then(poll => {
			console.log("Successfully liked proposal")
		})
})


test('ADMIN:  start voting phase', function() {
	client.login(t.team, t.admin, t.adminJWT)
	return client.startVotingPhase(t.poll.id)
		.then(poll => {
			expect(poll.status).toBe("VOTING")
			console.log("Started voting phase of poll")
		})
})

test('ADMIN:  load poll (in VOTING)', function() {
	client.login(t.team, t.admin, t.adminJWT)
	return client.getPollById(t.poll.id, true)
		.then(poll => {
			expect(poll.proposals).to.have.lengthOf.at.least(2)  // Need at least two proposals to be able to cast a vote
			expect(poll.status).toBe("VOTING")
			console.log("getPollById returned:", poll)
		})
})

test('MEMBER: cast vote', async function() {
	client.login(t.team, t.member, t.memberJWT)
	let voteOrderIds = t.poll.proposals.map(p => p.id).sort()  // Make sure we vote for the right proposal :-) Need to sort!
	let voterToken = await getVoterToken("dummySecret")
	let res = await castVote(t.poll.id, voteOrderIds, voterToken)
	t.ballot = res.ballot  // save last ballot
})

test('ADMIN: cast vote', async function() {
	client.login(t.team, t.admin, t.adminJWT)
	let voteOrderIds = t.poll.proposals.map(p => p.id).sort()
	let voterToken = await getVoterToken("dummySecret")
	let res = await castVote(t.poll.id, voteOrderIds, voterToken)
})


function getVoterToken(voterSecret) {
	return client.getVoterToken("dummySecret").then(voterToken => {
		//console.log("Got voterToken:", voterToken)
		expect(voterToken).to.have.lengthOf.at.least(5)
		return voterToken
	})
}

function castVote(pollId, voteOrderIds, voterToken) {
	return client.castVote(t.poll.id, voteOrderIds, voterToken).then(res => {
		console.log("casted Vote", res)
		expect(res.voteCount).toBeGreaterThanOrEqual(0)
		expect(res.ballot.checksum).to.have.lengthOf.at.least(5)
		return res
	})
}

test('MEMBER: verify ballot', function() {
	client.login(t.team, t.member, t.memberJWT)
	return client.verifyBallot(t.poll.id, t.ballot.checksum)
		.then(res => {
			//console.log("verifiyResult", res)
			expect(res.ballot)
			console.log("Successfully verified ballot with checksum")
		})
})

test('ADMIN:  finish voting phase', function() {
	client.login(t.team, t.admin, t.adminJWT)
  return client.finishVotingPhase(t.poll.id).then(winner => {
		console.log("Finished voting phase of poll:", winner)
		expect(winner.title).to.equal(fix.proposal1.title)
	})
})





