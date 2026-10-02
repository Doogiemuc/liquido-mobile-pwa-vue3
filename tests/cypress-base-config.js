/**
 * Cypress configuration, shared by every cypress.config*.js in the repo root.
 *
 * <h2>The three modes</h2>
 *
 * Which frontend the browser opens, and which backend that frontend talks to, are two separate
 * questions. Pick a pair with LIQUIDO_E2E_MODE. Each mode belongs to one of the environments in
 * docs/liquido-testing.md (DEV, MOCK, INT):
 *
 *   mode             | env  | frontend                  | backend API root         | what it is for
 *   -----------------|------|---------------------------|--------------------------|----------------------------
 *   local (default)  | DEV  | shadow.fritz.box:3001     | shadow.fritz.box:8443    | the normal full-stack run
 *   mock             | MOCK | localhost:3002            | none - mock dev server   | frontend only, no backend
 *   deployed         | INT  | liquido.dynv6.net         | liquido.dynv6.net/api/v2 | test a deployment
 *
 * The local frontend is opened by hostname, not "localhost" and not a bare IP: WebAuthn ties a
 * credential to the exact origin it was created on, and the backend's dev profile only accepts
 * https://shadow.fritz.box:3001 (quarkus.webauthn.origins in application-dev.properties). Any other
 * host would make every passkey ceremony fail its origin check.
 *
 * Mock mode is the exception, and deliberately on localhost: there is no backend origin check to
 * satisfy - the mock backend takes the relying party id from the request's own Host header - so it
 * needs no /etc/hosts entry, and a fresh clone can run it as is. Its own port 3002 keeps it clear of
 * a normal dev server already running on 3001. `npm run test:e2e:mock` starts that server itself.
 *
 * Point the deployed mode somewhere else with CYPRESS_REMOTE_URL.
 *
 * <h2>The half Cypress cannot set</h2>
 *
 * Cypress only decides which URL the browser opens. Which backend the FRONTEND calls is baked into
 * the dev server's config file (mockBackend and LIQUIDO_API_URL), read once when it starts:
 * config/config.development.js for local, which therefore has to be set accordingly and the dev
 * server restarted, and the checked-in config/config.mock.js for mock.
 * Getting this wrong is the dangerous case: the suite would pass against mocked data while you
 * believe it just proved a real backend works. So the mode is checked against that file below, and
 * a mismatch stops the run instead of quietly producing a green lie.
 *
 * <h2>Careful with the deployed mode</h2>
 *
 * Every run creates real teams, polls and ballots on whatever backend it points at. Never aim it
 * at an instance with real users on it.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))

// See the WebAuthn note above: must stay shadow.fritz.box, not localhost or a bare IP.
const LOCAL_FRONTEND = "https://shadow.fritz.box:3001"
const LOCAL_BACKEND = "https://shadow.fritz.box:8443"
// See the mock note above. Must match the port `npm run dev:mock` starts the dev server on.
const MOCK_FRONTEND = "https://localhost:3002"
const DEPLOYED = (process.env.CYPRESS_REMOTE_URL || "https://liquido.dynv6.net").replace(/\/+$/, "")
// Behind Caddy the backend does not live at the site root but under /api/v2/ (Caddyfile:
// `handle /api/v2/*` strips that prefix, then proxies to Quarkus). It is the same path that
// config/config.production.js has in LIQUIDO_API_URL. The local dev backend on :8443 has no prefix.
const DEPLOYED_API = DEPLOYED + "/api/v2"

/**
 * frontend = what the browser opens;
 * backend  = the backend's API ROOT that the SPECS call directly - the base that "graphql" or
 *            "graphql/schema.graphql" is appended to (null: there is none, mock mode);
 * wantApi  = what the frontend dev server's LIQUIDO_API_URL must start with (null: not checked);
 * configFile = the config/ file that frontend's dev server reads, checked below (null: not ours).
 *
 * `backend` and the frontend's LIQUIDO_API_URL are the same thing seen from two sides: both are the
 * API root, and both get "/graphql" appended. That is why wantApi is just an origin prefix of it.
 */
const MODES = {
	local:            { frontend: LOCAL_FRONTEND, backend: LOCAL_BACKEND, wantMock: false, wantApi: LOCAL_BACKEND, configFile: "config.development.js" },
	mock:             { frontend: MOCK_FRONTEND,  backend: null,          wantMock: true,  wantApi: null,          configFile: "config.mock.js" },
	deployed:         { frontend: DEPLOYED,       backend: DEPLOYED_API,  wantMock: null,  wantApi: null,          configFile: null },
}

/** The mode this run uses, unless a config file asks configForMode() for a specific one. */
export const mode = process.env.LIQUIDO_E2E_MODE || "local"

/**
 * Read mockBackend and LIQUIDO_API_URL out of config/<configFile>.
 *
 * Deliberately a forgiving text scan rather than an import: config.development.js is gitignored, so
 * it may not exist at all, and importing it would make this config async, which Cypress does not
 * want. When anything is unclear this returns undefined and the caller stays quiet - a guess here
 * would be worse than no check.
 */
function readDevConfig(configFile) {
	try {
		const src = fs.readFileSync(path.join(HERE, "..", "config", configFile), "utf8")
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
	if (!picked.configFile) return                    // deployed: the served bundle has its own config
	const dev = readDevConfig(picked.configFile)
	if (!dev) return                                  // cannot tell - say nothing
	const file = `config/${picked.configFile}`
	const hint = `Fix ${file} and RESTART the dev server (vite reads it at startup).`

	if (dev.mockBackend !== undefined && dev.mockBackend !== picked.wantMock) {
		throw new Error(
			`LIQUIDO_E2E_MODE=${mode} needs mockBackend: ${picked.wantMock} in ${file}, ` +
			`but it is ${dev.mockBackend}. ${hint}`
		)
	}
	// Only meaningful when the frontend really talks to a backend.
	if (picked.wantApi && dev.apiUrl && !dev.apiUrl.startsWith(picked.wantApi)) {
		throw new Error(
			`LIQUIDO_E2E_MODE=${mode} needs LIQUIDO_API_URL to point at ${picked.wantApi} in ` +
			`${file}, but it is "${dev.apiUrl}". ${hint}`
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
	// These are the DEV values - see "What to configure where" in docs/liquido-testing.md.
	env: {
		passwordSuffix: "_PWD",  // passwords of test users = email + passwordSuffix
		devLoginToken: "devLoginTokenDev",
		testPasswordResetToken: "PASSWORD_RESET_TOKEN_DEV",
		mailtrap: {
			messagesUrl: "https://mailtrap.io/api/accounts/1416880/inboxes/1983138/messages",
			// A real credential, so never in this file: export MAILTRAP_API_TOKEN before running Cypress.
			// Only the skipped magic-link test in login-tests.cy.js reads it.
			apiToken: process.env.MAILTRAP_API_TOKEN,
		}
	},

	// public config vars
	expose: {
		/** Which pairing this run uses, so a spec can skip what its mode cannot do. */
		mode: name,
		/**
		 * API root of the backend the SPECS may call directly, ending in "/" - append "graphql" to get
		 * the GraphQL endpoint: https://liquido.dynv6.net/api/v2/ , https://shadow.fritz.box:8443/ .
		 * Null in mock mode where there is no backend at all. Guard every cy.request() to it with this.
		 * NOT the site origin: on a deployment that would hit Caddy's SPA fallback and answer HTML.
		 */
		LIQUIDO_API: picked.backend ? picked.backend + "/" : null,
		/*
		 * The seeded identities these specs sign in as. Every one of them is a FIXED name that the
		 * backend's TestFixtures.java declares as a constant and TestDataCreator purges and recreates
		 * on every seed run - which is the only reason they can safely be hard-coded here.
		 *
		 * Do NOT point any of this at the seed team (testTeam<millis>): its name and its admin's email
		 * carry the timestamp of the run that created them, so no constant here could follow them.
		 *
		 * Keep in sync with liquido-backend-quarkus/src/test/java/org/liquido/TestFixtures.java.
		 */

		/** The team the login specs sign in to. Nothing else may mutate it. */
		teamName: "loginTeam",
		/**
		 * The login identity. Owned by login-tests.cy.js alone: that spec asserts this display NAME
		 * appears in #memberCircles, and resets this password back to <email>_PWD, so it must not live
		 * in scratchTeam, where any test is free to rename anybody.
		 */
		admin: {
			name: "Login Admin",
			email: "loginadmin@liquido.vote",
		},
		/** The two-team scenario switch-team.cy.js switches between, and the user who is in both. */
		multiTeam: {
			email: "multiteammember@liquido.vote",
			teamA: "multiTeamA",
			teamB: "multiTeamB",
		},
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
