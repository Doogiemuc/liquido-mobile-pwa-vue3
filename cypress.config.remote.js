/**
 * Cypress config for running the e2e suite against an already-deployed frontend/backend
 * (e.g. https://liquido.dynv6.net) instead of the local dev servers on localhost:3001/:8443.
 *
 * Usage:
 *   npx cypress run --config-file cypress.config.remote.js --spec tests/e2e/specs/happy-case.cy.js
 *   npx cypress open --config-file cypress.config.remote.js
 *   (or: npm run test:e2e:remote)
 *
 * Point it at a different deployment by setting CYPRESS_REMOTE_URL, e.g.:
 *   CYPRESS_REMOTE_URL=https://staging.liquido.vote npm run test:e2e:remote
 *
 * NOTE: every e2e spec creates real data (teams, polls, ballots) against whatever backend
 * this points at - never run it against a real production instance with real users on it.
 */
import { defineConfig } from "cypress";
import baseConfig from "./tests/cypress-base-config.js"

const REMOTE_URL = process.env.CYPRESS_REMOTE_URL || "https://liquido.dynv6.net"

export default defineConfig({
	...baseConfig,
	e2e: {
		...baseConfig.e2e,
		baseUrl: REMOTE_URL,
	},
	expose: {
		...baseConfig.expose,
		LIQUIDO_API: REMOTE_URL + "/",
	}
})
