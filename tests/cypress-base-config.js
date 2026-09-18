/* eslint-env node */
/**
 * Cypress configuration, shared by every cypress.config*.js in the repo root.
 *
 * <h2>The four modes</h2>
 *
 * Which frontend the browser opens, and which backend that frontend talks to, are two separate
 * questions. Pick a pair with LIQUIDO_E2E_MODE:
 *
 *   mode             | frontend               | backend                  | what it is for
 *   -----------------|------------------------|--------------------------|----------------------------
 *   local (default)  | localhost:3001         | localhost:8443           | the normal full-stack run
 *   mock             | localhost:3001         | none - mocked in the app | frontend only, no backend
 *   remote-backend   | localhost:3001         | liquido.dynv6.net        | your code, real data
 *   deployed         | liquido.dynv6.net      | liquido.dynv6.net        | smoke-test a deployment
 *
 * Point the deployed modes somewhere else with CYPRESS_REMOTE_URL.
 *
 * <h2>The half Cypress cannot set</h2>
 *
 * Cypress only decides which URL the browser opens. Which backend the FRONTEND calls is baked into
 * config/config.development.js (mockBackend and LIQUIDO_API_URL) and is read when the dev server
 * starts - so `mock` and `remote-backend` also need that file set accordingly, and the dev server
 * restarted. Getting this wrong is the dangerous case: the suite would pass against mocked data
 * while you believe it just proved a real backend works. So the mode is checked against that file
 * below, and a mismatch stops the run instead of quietly producing a green lie.
 *
 * <h2>Careful with the two deployed modes</h2>
 *
 * Every run creates real teams, polls and ballots on whatever backend it points at. Never aim them
 * at an instance with real users on it.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))

const LOCAL_FRONTEND = "https://localhost:3001"
const LOCAL_BACKEND = "https://localhost:8443"
const DEPLOYED = (process.env.CYPRESS_REMOTE_URL || "https://liquido.dynv6.net").replace(/\/+$/, "")

/** frontend = what the browser opens; backend = what the SPECS call directly (null: there is none) */
const MODES = {
	local:            { frontend: LOCAL_FRONTEND, backend: LOCAL_BACKEND, wantMock: false, wantApi: LOCAL_BACKEND },
	mock:             { frontend: LOCAL_FRONTEND, backend: null,          wantMock: true,  wantApi: null },
	"remote-backend": { frontend: LOCAL_FRONTEND, backend: DEPLOYED,      wantMock: false, wantApi: DEPLOYED },
	deployed:         { frontend: DEPLOYED,       backend: DEPLOYED,      wantMock: null,  wantApi: null },
}

/** The mode this run uses, unless a config file asks configForMode() for a specific one. */
export const mode = process.env.LIQUIDO_E2E_MODE || "local"

/**
 * Read mockBackend and LIQUIDO_API_URL out of config/config.development.js.
 *
 * Deliberately a forgiving text scan rather than an import: the file is gitignored, so it may not
 * exist at all, and importing it would make this config async, which Cypress does not want. When
 * anything is unclear this returns undefined and the caller stays quiet - a guess here would be
 * worse than no check.
 */
function readDevConfig() {
	try {
		const src = fs.readFileSync(path.join(HERE, "..", "config", "config.development.js"), "utf8")
		const uncommented = src.replace(/^\s*\/\/.*$/gm, "")
		const mock = uncommented.match(/mockBackend\s*:\s*(true|false)/)
		const api = uncommented.match(/LIQUIDO_API_URL\s*:\s*["'`]([^"'`]+)["'`]/)
		return {
			mockBackend: mock ? mock[1] === "true" : undefined,
			apiUrl: api ? api[1] : undefined,
		}
	} catch {
		return undefined   // no such file, or unreadable - nothing to check against
	}
}

/** Stop the run when the dev server is serving a different pairing than the mode promises. */
function assertFrontendMatchesMode(mode, picked) {
	if (picked.wantMock === null) return              // deployed: the served bundle has its own config
	const dev = readDevConfig()
	if (!dev) return                                  // cannot tell - say nothing
	const hint = "Fix config/config.development.js and RESTART the dev server (vite reads it at startup)."

	if (dev.mockBackend !== undefined && dev.mockBackend !== picked.wantMock) {
		throw new Error(
			`LIQUIDO_E2E_MODE=${mode} needs mockBackend: ${picked.wantMock} in config/config.development.js, ` +
			`but it is ${dev.mockBackend}. ${hint}`
		)
	}
	// Only meaningful when the frontend really talks to a backend.
	if (picked.wantApi && dev.apiUrl && !dev.apiUrl.startsWith(picked.wantApi)) {
		throw new Error(
			`LIQUIDO_E2E_MODE=${mode} needs LIQUIDO_API_URL to point at ${picked.wantApi} in ` +
			`config/config.development.js, but it is "${dev.apiUrl}". ${hint}`
		)
	}
}

/**
 * Build the Cypress config for one mode. Exported so a config file can pin a mode outright -
 * cypress.config.remote.js pins "deployed" - rather than depending on an environment variable
 * being set before this module is imported, which ESM import hoisting makes fragile.
 */
export function configForMode(name = mode) {
	const picked = MODES[name]
	if (!picked) {
		throw new Error(`LIQUIDO_E2E_MODE="${name}" is not a mode. Pick one of: ${Object.keys(MODES).join(", ")}`)
	}
	assertFrontendMatchesMode(name, picked)

	console.log(
		`Cypress LIQUIDO_E2E_MODE=${name}  frontend=${picked.frontend}  ` +
		`backend=${picked.backend ?? "(mocked in the app)"}`
	)

	return {
	e2e: {
		baseUrl: picked.frontend + "/",
		specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
		supportFile: false,
	},

	// confidentail credentials
	// These MUST match the local backend's dev profile (liquido-backend-quarkus/config/application-dev.properties):
	//   liquido.dev-login-token           -> devLoginToken
	//   liquido.test-password-reset-token -> testPasswordResetToken
	// This file is the DEFAULT (local) config. The INT values live in cypress.config.INT.js.
	env: {
		passwordSuffix: "_PWD",  // passwords of test users = email + passwordSuffix
		devLoginToken: "devLoginTokenDev",
		testPasswordResetToken: "PASSWORD_RESET_TOKEN_DEV",
		mailtrap: {
			messagesUrl: "https://mailtrap.io/api/accounts/1416880/inboxes/1983138/messages",
			apiToken: "13d57536b61611395106a3992fc32bec"
		}
	},

	// public config vars
	expose: {
		/** Which pairing this run uses, so a spec can skip what its mode cannot do. */
		mode: name,
		/**
		 * Base URL of the backend the SPECS may call directly, or null in mock mode where there is
		 * no backend at all. Guard every cy.request() to it with this.
		 */
		LIQUIDO_API: picked.backend ? picked.backend + "/" : null,
		// This user must exist in the DB.
		teamName: "RobTeam",
		admin: {
			name: "TestAdmin 4711",
			email: "testadmin4711@liquido.vote",
			mobilephone: "01515554711",
		},
		member: {
			name: "Member 1781788893728",
			email: "membr47110@liquido.vote",
			mobilephone: "01515551781788893728"
		}
	},

	/**
	 * Scroll an element to the MIDDLE of the viewport before acting on it, not to the top.
	 * #liquidoHeader is position:fixed, so Cypress' default ('top') parks the element underneath it
	 * and then refuses to click, complaining that it is covered. That only stayed invisible for as
	 * long as no page was tall enough to scroll that far - welcome-chat's landing hero is.
	 */
	scrollBehavior: 'center',

	viewportWidth: 375,
	viewportHeight: 667,
	fixturesFolder: 'tests/e2e/fixtures',
	screenshotsFolder: 'tests/e2e/screenshots',
	videosFolder: 'tests/e2e/videos',
	video: false,
	}
}
