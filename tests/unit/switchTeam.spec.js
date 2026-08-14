/**
 * Unit tests for switching between the teams of one user.
 *
 * These run against the mock backend (config.test.js sets mockBackend: true), so they need no server.
 * The mock holds TWO teams that share some members, which is what lets both sides of the
 * progressive-disclosure rule be tested here: a shared member gets a switcher, a member of only the
 * first team does not.
 */

import { beforeEach, describe, expect, test } from 'vitest'
import client from '@/services/liquido-graphql-client'
import { resetGraphQlMockState } from '@/services/liquido-graphql-client.mock.js'
import teamUserJwtMock from '@/mockdata/teamUserJwt.json'

const FIRST_TEAM_ID = teamUserJwtMock.team.id
const SECOND_TEAM_ID = teamUserJwtMock.team.id + 1

/** Shared by both mock teams - see createSecondTeam() in the mock. */
const MULTI_TEAM_EMAIL = "testadmin4711@liquido.vote"
/** A member of the first mock team only. */
const SINGLE_TEAM_EMAIL = "mock1@liquido.vote"

/** A poll id belonging to no team, standing in for "a poll of the team we left". */
const FOREIGN_POLL_ID = 999001

const login = email => client.devLogin(email, null, "dummyDevLoginToken")

describe("switchTeam", () => {

	beforeEach(() => {
		resetGraphQlMockState()
		client.logout()
	})

	test("a user of several teams gets all of them, alongside the one they are in", async () => {
		await login(MULTI_TEAM_EMAIL)

		// getCachedTeam() is the ONE team we are in; getAllUserTeams() is EVERY team we belong to.
		expect(client.getCachedTeam().id).toBe(FIRST_TEAM_ID)
		expect(client.getAllUserTeams().map(t => t.id)).toEqual([FIRST_TEAM_ID, SECOND_TEAM_ID])
	})

	test("a user of one team gets exactly one, so no switcher is offered", async () => {
		await login(SINGLE_TEAM_EMAIL)

		// team-home.vue shows the switch control only when this is > 1 (progressive disclosure).
		expect(client.getAllUserTeams()).toHaveLength(1)
	})

	test("getAllUserTeams() is empty after logout, so a switcher cannot linger", async () => {
		await login(MULTI_TEAM_EMAIL)
		client.logout()
		expect(client.getAllUserTeams()).toEqual([])
	})

	test("switching team re-issues the session and lands in the requested team", async () => {
		await login(MULTI_TEAM_EMAIL)

		const res = await client.switchTeam(SECOND_TEAM_ID)

		expect(res.team.id).toBe(SECOND_TEAM_ID)
		expect(client.getCachedTeam().id).toBe(SECOND_TEAM_ID)
		expect(client.teamCache.getSync(client.JWT_KEY)).toBe(res.jwt)
		expect(client.isAuthenticated()).toBe(true)
		// The team list itself is unchanged - switching does not change what you are a member of.
		expect(client.getAllUserTeams().map(t => t.id)).toEqual([FIRST_TEAM_ID, SECOND_TEAM_ID])
	})

	test("switching shows the new team's polls and only those", async () => {
		await login(MULTI_TEAM_EMAIL)
		const firstTeamPollIds = client.getCachedPolls().map(p => p.id)
		expect(firstTeamPollIds.length).toBeGreaterThan(0)

		await client.switchTeam(SECOND_TEAM_ID)

		const secondTeamPollIds = client.getCachedPolls().map(p => p.id)
		expect(secondTeamPollIds.length).toBeGreaterThan(0)
		// Not one poll of the team we left may survive the switch - in a voting app that would be bad.
		expect(secondTeamPollIds.filter(id => firstTeamPollIds.includes(id))).toEqual([])
	})

	/**
	 * The regression that switchTeam() empties pollsCache for.
	 * putPollsIntoCache() only ever PUTs under "polls/<id>", it never removes, so without the explicit
	 * wipe anything already cached outlives the switch.
	 */
	test("switching team drops polls that are not in the new team", async () => {
		await login(MULTI_TEAM_EMAIL)
		client.pollsCache.put("polls/" + FOREIGN_POLL_ID, { id: FOREIGN_POLL_ID, title: "Poll of the team we left", status: "VOTING" })
		expect(client.getCachedPolls().map(p => p.id)).toContain(FOREIGN_POLL_ID)

		await client.switchTeam(SECOND_TEAM_ID)

		expect(client.getCachedPolls().map(p => p.id)).not.toContain(FOREIGN_POLL_ID)
	})

	test("switching back and forth keeps working", async () => {
		await login(MULTI_TEAM_EMAIL)

		await client.switchTeam(SECOND_TEAM_ID)
		expect(client.getCachedTeam().id).toBe(SECOND_TEAM_ID)

		await client.switchTeam(FIRST_TEAM_ID)
		expect(client.getCachedTeam().id).toBe(FIRST_TEAM_ID)
	})

	test("switching into a team the user does not belong to is rejected", async () => {
		await login(SINGLE_TEAM_EMAIL)   // member of the first team only

		await expect(client.switchTeam(SECOND_TEAM_ID)).rejects.toBeDefined()

		// The existing session must survive a refused switch untouched.
		expect(client.getCachedTeam().id).toBe(FIRST_TEAM_ID)
		expect(client.isAuthenticated()).toBe(true)
	})
})
