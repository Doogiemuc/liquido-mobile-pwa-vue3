import axios from "axios"
import teamUserJwtMock from "@/mockdata/teamUserJwt.json"

export const graphQlQueryMock = function(query, variables) {
	console.log("MOCK request for ", query, variables)
	if (query.includes("ping")) {
		return Promise.resolve({
			data: {
				ping: "MOCK responses are active!",
			},
		})
	} else if (query.includes("createNewTeam(")) {
		console.log("MOCK: devLogin")
		return Promise.resolve({
			data: {
				createNewTeam: teamUserJwtMock,
			},
		})
	} else if (query.includes("devLogin(")) {
		const match = query.match(/devLogin\(email: ?"([\w\@.]+)"/)
		if (match && match[1]) {
			const email = match[1]

			const member = teamUserJwtMock.team.members.find(m => m.user.email === email)
			if (!member) {
				console.error("Cannot find user <" + email + "> in team!")
			} else {
				console.log("MOCK: devLogin for member", member)
			}
			teamUserJwtMock.user = member.user
			return Promise.resolve({
				data: {
					devLogin: teamUserJwtMock,
				},
			})
		}
	} else if (query.includes("loginWithJwt")) {
		console.log("MOCK: loginWithJwt")
		return Promise.resolve({
			data: {
				loginWithJwt: teamUserJwtMock,
			},
		})
	} else if (query.includes("polls")) {
		console.log("MOCK: query all polls")
		return Promise.resolve({
			data: {
				polls: teamUserJwtMock.team.polls,
			},
		})
	} else if (query.includes("poll(pollId:")) {
		const match = query.match(/poll\(pollId:(\d+)\)/)
		if (match && match[1]) {
			const pollId = parseInt(match[1], 10)
			console.log("MOCK: query poll(id=" + pollId + ")")
			const poll = teamUserJwtMock.team.polls.find(p => p.id === pollId)
			return Promise.resolve({
				data: {
					poll: poll,
				},
			})
		}
	} else if (query.includes("myBallot")) {
		console.log("MOCK: myBallot")
		return Promise.resolve({
			data: {
				myBallot: undefined,
			},
		})
	}
	console.error("Unhandled mock query " + query)
	return Promise.reject("Unhandled mock query:" + query)
}

export const initializeLiquidoGraphQlMock = function(graphQlApi, teamCache) {
	console.warn("==================================")
	console.warn("======== MOCK is active! =========")
	console.warn("==================================")

	//TODO: When backend is mocked, do not login a user by default. Instead allow devLogin. Also via URL, e.g. for design-overview
	teamCache.put(graphQlApi.TEAM_KEY, teamUserJwtMock.team)
	teamCache.put(graphQlApi.CURRENT_USER_KEY, teamUserJwtMock.user)
	teamCache.put(graphQlApi.JWT_KEY, teamUserJwtMock.jwt)
	graphQlApi.putPollsIntoCache(teamUserJwtMock.team.polls)
	//better: graphQlApi.login(teamUserJwtMock.team, teamUserJwtMock.user, teamUserJwtMock.jwt)

	axios.interceptors.request.use(config => {
		if (config.url.includes("/webauthn/check-login-email")) {
			const email = config.params.email
			const member = teamUserJwtMock.team.members.find(m => m.user.email === email)
			if (member) {
				console.log("MOCK: /check-login-email for " + email + " -> existing user")
				config.adapter = config => {
					return Promise.resolve({
						data: { email: email, webauthn: false },
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
					return Promise.reject({
						isAxiosError: true,
						response: {
							data: { msg: "Email not registered" },
							status: 404,
							statusText: "Not Found",
							headers: { "Content-Type": "application/json" },
							config: config,
							request: {},
						},
					})
				}
			}
		}
		return config
	})
}
