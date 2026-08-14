/**
 * Component tests for the Switch-Team control on the team home page.
 *
 * Two things are worth a test here and neither is obvious from reading the template:
 *  1. the progressive-disclosure rule - the control must be completely absent for the single-team
 *     user, who is nearly every user;
 *  2. that switching updates the page IN PLACE. The component never unmounts on a switch, so
 *     anything read once during setup would silently keep showing the old team. That is exactly the
 *     trap pollsInVoting / userIsAdmin fell into before they became refs driven by refreshFromCache().
 */

import { beforeEach, describe, expect, test, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { createI18n } from "vue-i18n"
import TeamHome from "@/views/team-home.vue"
import api from "@/services/liquido-graphql-client"

// team-home.vue is <script setup>, so it calls useRouter() / useI18n() directly rather than reaching
// for `this`. Neither can be supplied through mount()'s `mocks` option, which only patches the
// options-API context - they need a real plugin and a module mock respectively.
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Same shape as main.js: legacy mode with allowComposition, which is what makes useI18n() work
// inside <script setup> in this project.
const i18n = createI18n({
	locale: "de", fallbackLocale: "de", allowComposition: true, silentFallbackWarn: true,
	messages: { de: { TeamHome: "Team", SwitchTeam: "Team wechseln", gotoPolls: "Abstimmungen", User: "Profil" } },
})

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const teamA = { id: 1, teamName: "Team Alpha", inviteCode: "AAAA", members: [], polls: [] }
const teamB = { id: 2, teamName: "Team Beta", inviteCode: "BBBB", members: [], polls: [] }
const bothTeams = [{ id: 1, teamName: "Team Alpha" }, { id: 2, teamName: "Team Beta" }]

/**
 * Mount team-home with the api stubbed to describe a given cached session.
 * Awaits a tick, because the page fills itself from the cache in onMounted - so the very first
 * render is still empty and asserting against it would test nothing.
 */
async function mountTeamHome({ team, teams, isAdmin = false, polls = [] }) {
	vi.spyOn(api, "getCachedTeam").mockReturnValue(team)
	vi.spyOn(api, "getAllUserTeams").mockReturnValue(teams)
	vi.spyOn(api, "getCachedUser").mockReturnValue({ id: 7, name: "Multi Team User", hasWebauthn: false })
	vi.spyOn(api, "isAdmin").mockReturnValue(isAdmin)
	vi.spyOn(api, "getCachedPolls").mockReturnValue(polls)

	const wrapper = mount(TeamHome, {
		global: {
			plugins: [i18n],
			stubs: { LiquidoFooter: true, PollCard: true, RouterLink: true },
		},
	})
	await flush()
	return wrapper
}

describe("team-home switch team control", () => {

	beforeEach(() => vi.restoreAllMocks())

	test("is absent for a user who belongs to only one team", async () => {
		const wrapper = await mountTeamHome({ team: teamA, teams: [{ id: 1, teamName: "Team Alpha" }] })
		expect(wrapper.find("#switchTeamSection").exists()).toBe(false)
	})

	test("is shown for a user who belongs to more than one team", async () => {
		const wrapper = await mountTeamHome({ team: teamA, teams: bothTeams })
		expect(wrapper.find("#switchTeamSection").exists()).toBe(true)
		// The list itself stays collapsed until asked for.
		expect(wrapper.find("#switchTeamList").exists()).toBe(false)
	})

	test("lists every team of the user, marking the current one", async () => {
		const wrapper = await mountTeamHome({ team: teamA, teams: bothTeams })
		await wrapper.find("#switchTeamButton").trigger("click")

		const items = wrapper.findAll("#switchTeamList button")
		expect(items).toHaveLength(2)
		expect(items.map(i => i.text())).toEqual(["Team Alpha", "Team Beta"])
		// You cannot "switch" into the team you are already in.
		expect(items[0].attributes("disabled")).toBeDefined()
		expect(items[1].attributes("disabled")).toBeUndefined()
	})

	test("picking another team switches and updates the page in place", async () => {
		const switchTeam = vi.spyOn(api, "switchTeam").mockImplementation(async () => {
			// After a real switch the cache describes the NEW team - including a different admin role.
			api.getCachedTeam.mockReturnValue(teamB)
			api.isAdmin.mockReturnValue(true)
			return { team: teamB }
		})

		const wrapper = await mountTeamHome({ team: teamA, teams: bothTeams, isAdmin: false })
		expect(wrapper.text()).toContain("Team Alpha")

		await wrapper.find("#switchTeamButton").trigger("click")
		await wrapper.findAll("#switchTeamList button")[1].trigger("click")
		await flush()

		expect(switchTeam).toHaveBeenCalledWith(2)
		expect(wrapper.text()).toContain("Team Beta")
		expect(wrapper.text()).not.toContain("Team Alpha")
		// The list closes again after choosing.
		expect(wrapper.find("#switchTeamList").exists()).toBe(false)
		// And the admin-only section appears, because this user IS an admin of the new team.
		expect(wrapper.find("#memberCircles .add-member-icon").exists()).toBe(true)
	})

	test("a failed switch leaves the page showing the team we are still in", async () => {
		vi.spyOn(api, "switchTeam").mockRejectedValue(new Error("not a member"))

		const wrapper = await mountTeamHome({ team: teamA, teams: bothTeams })
		await wrapper.find("#switchTeamButton").trigger("click")
		await wrapper.findAll("#switchTeamList button")[1].trigger("click")
		await flush()

		expect(wrapper.text()).toContain("Team Alpha")
	})
})
