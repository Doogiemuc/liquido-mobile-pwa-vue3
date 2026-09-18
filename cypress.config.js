/**
 * Default Cypress configuration.
 *
 * The mode - which frontend the browser opens and which backend it talks to - comes from
 * LIQUIDO_E2E_MODE, and defaults to "local" (local frontend, local backend on :8443). See the
 * table at the top of tests/cypress-base-config.js, or use one of the npm run test:e2e:* scripts.
 */
import { defineConfig } from "cypress";
import { configForMode } from "./tests/cypress-base-config.js"

export default defineConfig(configForMode())
