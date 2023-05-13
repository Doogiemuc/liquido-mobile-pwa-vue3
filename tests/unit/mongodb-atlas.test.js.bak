import { describe, it } from 'vitest'
import api from './src/services/liquido-graphql-client'
import config from "config"  // alias for config/config.test.js (see vitest.config.ts)
import jsonwebtoken from 'jsonwebtoken'
import { expect } from 'chai'
// import { expect } from 'chai'

//console.log(config)

let team1 = undefined
let team2 = undefined
let poll1 = undefined

let jwtSecret = "liquido_jwt_secret_that_must_be_very_long%"

function createLiquidoJwt(name, email, mobilephone) {
	return jsonwebtoken.sign(
		{ 
			name: name,
			email: email,
			mobilephone: mobilephone 
		}, 
		jwtSecret,
		{ 
			expiresIn: Math.floor(Date.now() / 1000) + (60 * 60),
			audience: "liquido-users",
			issuer: "liquidoStatic",
			subject: "RegistrationApiUser"
		}
	)
}

describe('MongoDB Atlas tests', () => {

	/**
	 * PING API
	 * (Return code of 401 - access denied is also ok)
	 */
  it('ping API', async () => {
		api.pingApi()
			.then(res => {
				expect(res.status).to.equal(401)
			})
			.catch(err => {
				expect(err.status).to.equal(401)
			})
	})

	/**
	 * Create first team
	 */
	it.only('createNewTeam 1', async () => {
		let now = Date.now()
		let newTeam = {
			teamName: "Test_"+now,
			admins: [{
				name: "Test Admin_"+now,
				email: "admin_"+now+"@liquido.app",
				mobilephone: "+49 151 "+now
			}]
		}

		var token = createLiquidoJwt("RegistrationApiUser", "registration@liquido.me", "+49 555 11111")
		api.setJwtTokenString(token)
		let team = await api.createNewTeam(newTeam)
		console.log("TEST: created team", team)
		expect(team._id).to.be.a('string')
		expect(team.inviteCode).to.be.a('string')
		return team
	 })
  
})