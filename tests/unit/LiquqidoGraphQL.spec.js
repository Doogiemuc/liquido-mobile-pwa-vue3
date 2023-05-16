/**
 * Unit tests for liquido-graphql-client.js
 * 
 * Must run jasmine through babel for ES6 import: https://github.com/piecioshka/boilerplate-jasmine-babel
 */
// import "jasmine";

// Tried several other ways that did't work:
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
			expect(poll.status).toBe("VOTING")
			console.log("getPollById", poll)
		})
})

test('MEMBER: cast vote', function() {
	client.login(t.team, t.member, t.memberJWT)
	let voteOrderIds = t.poll.proposals.map(p => p.id)
	return client.getVoterToken("dummySecret")
		.then(voterToken => {
			console.log("Got voterToken:", voterToken)
			expect(voterToken).to.have.lengthOf.at.least(5)
			return client.castVote(t.poll.id, voteOrderIds, voterToken)
				.then(res => {
					console.log("casted Vote", res)
					expect(res.ballot.checksum).to.have.lengthOf.at.least(5)
					return res
				})
			})
	
})




