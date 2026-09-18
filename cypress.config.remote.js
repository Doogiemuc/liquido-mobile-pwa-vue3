/**
 * Cypress config pinned to the "deployed" mode: the browser opens the DEPLOYED frontend and that
 * frontend calls the DEPLOYED backend, with no local dev server involved at all.
 *
 *   npm run test:e2e:deployed          (or the older alias, npm run test:e2e:remote)
 *   npx cypress open --config-file cypress.config.remote.js
 *
 * Point it somewhere other than https://liquido.dynv6.net with CYPRESS_REMOTE_URL, e.g.
 *   CYPRESS_REMOTE_URL=https://staging.liquido.vote npm run test:e2e:deployed
 *
 * NOTE: every run creates real teams, polls and ballots on whatever backend this points at - never
 * aim it at an instance with real users on it.
 *
 * To run YOUR OWN frontend against the deployed backend instead, that is a different mode:
 *   npm run test:e2e:remote-backend
 */
import { defineConfig } from "cypress";
import { configForMode } from "./tests/cypress-base-config.js"

export default defineConfig(configForMode("deployed"))
