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

let now,fix

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
		}
	}
})

test('create new team', async function() {
	// WHEN creating a new team
	return client.createNewTeam(fix.team.teamName, fix.admin)
		.then(team => {
			// THEN the correct teamName and admin email is returned
			expect(team.teamName).toBe(fix.team.teamName)
			//expect(user.email).toBe(fix.admin.email)
			console.debug("Successfully created Team", team.inviteCode)
			fix.team = team  // remember the created team
		})
		.catch(err => {
			console.error("TEST ERROR", err)
		})
	
	
})

test ('joinTeam', async function() {
	client.logout()
	console.debug("Joining team " + fix.team.teamName)
	return client.joinTeam(fix.team.inviteCode, fix.member)
	.then(team2 => {
		console.debug("Successfully joined team")
	})
})