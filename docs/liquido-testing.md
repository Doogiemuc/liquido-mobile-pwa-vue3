# How to test LIQUIDO

There is a lot of setup and configuration for debugging and testing LIQUIDO. This doc covers manual
testing (local and on a real device) and the automated Cypress e2e suite, including the test-data
contract both rely on.

0. [Quick start from a fresh clone](#0-quick-start-from-a-fresh-clone)
1. [Manual testing setup](#1-manual-testing-setup)
2. [Testing on a real device](#2-testing-on-a-real-device)
3. [Test data & fixtures](#3-test-data--fixtures)
4. [Automated tests (Cypress)](#4-automated-tests-cypress)

---

## 0. Quick start from a fresh clone

Everything below runs **without a backend, without a database and without any config file you have
to create first** — the e2e suite runs against the mock backend built into the dev server
([§4.6](#46-the-mock-backend)).

**Prerequisites**
* **Node 22** (≥ 22.12) or **Node 24**. Vite 8 and `start-server-and-test` both refuse older ones.
* On a **Linux machine without a desktop**: `Xvfb` installed (`apt install xvfb`). Cypress starts it
  on its own when `DISPLAY` is unset — you do not need `xvfb-run`. macOS, Windows and any Linux
  desktop need nothing extra.
* Network access during `npm install`: it downloads the Cypress binary (several hundred MB, cached
  in `~/.cache/Cypress` afterwards).

**Run it**

```bash
git clone https://github.com/Doogiemuc/liquido-mobile-pwa-vue3.git
cd liquido-mobile-pwa-vue3
npm install

npm test                 # unit tests (vitest), ~ 10 s
npm run test:e2e:mock    # starts the mock dev server on https://localhost:3002, runs every Cypress spec, stops it
npm run test:all         # both, in that order
```

`test:e2e:mock` needs port **3002** free. It does not touch 3001, so a normal `npm run dev` can keep
running alongside.

**What makes this work without setup**

| Needed | Where it comes from |
|---|---|
| Unit-test config | `config/config.test.js` — checked in, no secrets |
| E2E config | `config/config.mock.js` — checked in, no secrets; `npm run dev:mock` selects it via `LIQUIDO_CONFIG=mock` |
| TLS certificate | `tls-certs/liquido-local-*.pem` — checked in (a local mkcert pair, covers `localhost`). Cypress's browser accepts it without `mkcert -install`; `start-server-and-test` is told to with `START_SERVER_AND_TEST_INSECURE=1` |
| A backend | the mock, served by the dev server itself |
| A hostname in `/etc/hosts` | not needed — mock mode runs on `localhost` ([why](#46-the-mock-backend)) |
| Cypress config | `cypress.config.js` + `tests/cypress-base-config.js` — checked in |

`config/config.development.js` is **not** needed for any of this. It is gitignored and only
required for `npm run dev` against a real backend (copy it from `config.development.js.example`).

**One spec, or interactively.** `test:e2e:mock` always runs the whole suite. For anything else,
start the mock dev server yourself and point Cypress at it in a second terminal:

```bash
npm run dev:mock                                                                     # terminal 1
LIQUIDO_E2E_MODE=mock npx cypress run --e2e --spec tests/e2e/specs/happy-case.cy.js  # terminal 2
LIQUIDO_E2E_MODE=mock npx cypress open --e2e                                         # or interactively
```

The mock's data lives in that dev server process and survives between runs — restart it (or click
the red LIQUIDO icon in the app's header) for an empty database.

**Expected result — the mock run is not fully green yet.** `npm test` and `happy-case.cy.js` pass
completely. These e2e cases fail in mock mode, and therefore `test:e2e:mock` (and `test:all`)
**exits non-zero** today:

| Spec | Case | Why it fails in mock mode |
|---|---|---|
| `login-tests.cy.js` | Login via email & password | Signs in as the backend's fixed seed identity (`loginadmin@liquido.vote`, [§3](#3-test-data--fixtures)), which the mock's data does not contain |
| `switch-team.cy.js` | both cases | Same reason: needs the seeded `multiTeamA`/`multiTeamB` member |
| `polly-happy-case.cy.js` | the friend's vote | The Polly mock still runs in the browser (`src/polly/polly-client.mock.js`) and cannot tell the friend's "device" from the creator's |

By design, and not failures: the two cases in `login-tests.cy.js` and the two in
`validation-limits.cy.js` that call a real backend's HTTP API directly skip themselves in mock mode
(`Cypress.expose("LIQUIDO_API")` is `null` there).

The other three modes (`local`, `remote-backend`, `deployed`) need a real backend and some setup —
see [§1](#1-manual-testing-setup) and [§4](#4-automated-tests-cypress).

---

## 1. Manual testing setup

### 1.1 Preconditions for the frontend

* The LIQUIDO progressive web app (PWA) **must** be served via HTTPS with a valid TLS certificate.
* The frontend must be able to reach the LIQUIDO Quarkus backend via HTTPS — again with a valid,
  trusted TLS certificate.
* Make sure your certificate contains all required domains as SANs (subject alternative names).

### 1.2 Preconditions for the backend

There are several ways to configure the frontend to reach the backend. The TLS certificate for the
frontend is configured in `vite.config.js`. If frontend and backend run on the same host/IP, you can
directly configure `LIQUIDO_API_URL` in `./config/config.development.js`.

If the backend runs on another machine, configure a path proxy in Vite that forwards requests for
you: set `LIQUIDO_API_URL: '/graphql_proxy'` in `./config/config.development.js`, and configure a
`target` in `vite.config.js` (plus, most likely, some path rewrites). In this setup the frontend
sends backend requests to the configured local path, and the Vite proxy forwards them to the actual
LIQUIDO backend running elsewhere.

### 1.3 Additional requirements for WebAuthn on real phones

* The frontend must be served on a real domain, not just an IP address. Tip: configure a domain in
  your local `/etc/hosts` or local DNS. The current dev host is `shadow.fritz.box` (resolved by the
  Fritz!Box DNS).
* That domain must be configured in the backend's `application-dev.properties` — **three** settings,
  and all of them must agree:
  * `quarkus.webauthn.origins=https://shadow.fritz.box:3001` — with schema, domain **and** port!
  * `quarkus.webauthn.relying-party.id=shadow.fritz.box` — domain only, no schema, no port
  * `LIQUIDO_API_URL` in `./config/config.development.js` must point at the same host
* The TLS certificate must list that domain in its SANs, and the mkcert CA must be installed on
  *this* machine (`mkcert -install`). See `liquido-backend-quarkus/docs/README-tech.md` — moving to
  a new laptop breaks both of these at once.
* And obviously your hardware device must support WebAuthn (iOS Safari with Face ID, Chrome on
  Android with fingerprint, or desktop with platform authenticators).

### 1.4 Start services locally

Testing locally is easier than testing on a real device.

* Start the LIQUIDO backend: `./mvnw quarkus:dev`
* Start the LIQUIDO frontend: `npm run dev`
* Navigate at least once to `https://backend.host:8443/graphql/schema.graphql` — this is necessary
  once, to make the browser accept the self-signed certificate.
* Navigate to `https://backend.host:8443` — should now show the LIQUIDO API version.
* Open the LIQUIDO frontend in your browser (Safari, Firefox, Chrome should all work fine).
* Tip: open developer tools in the browser — the console output is also mirrored in the Vite output.

---

## 2. Testing on a real device

### 2.1 Remote testing on Safari for iOS

You must open all the URLs (including `schema.graphql`) at least once, for Safari to trust the
self-signed certificates.

You can see the remote console output from Safari for iOS on your local Safari, but you must
connect the device via cable:
https://dev.to/nimajafari/remote-debugging-using-safari-on-ios-devices-with-macos-16p5

### 2.2 Console.log on a real device

There was an attempt at a `mobile-debug-log.vue` component to make `console.log` available locally
on a device. It does work, but it's a crude hack that redefines the console methods — you lose the
`this` context and can no longer see which file a log statement originally came from.

[Vite can `server.forwardConsole`](https://vite.dev/config/server-options#server-forwardconsole) to
its stdout instead, which is the better option going forward.

---

## 3. Test data & fixtures

Backend and e2e tests share one database, seeded and cleaned up by the backend's
`TestDataCreator`/`TestDataPurger` (see `liquido-backend-quarkus/AGENTS.md`). The frontend's Cypress
specs consume that seed directly, so the contract below is required reading before touching any spec
that logs in as a fixed identity rather than creating its own team through the UI.

### 3.1 Context

E2E and backend tests share one database. Left unmanaged that creates two opposing problems:

**Nothing is ever cleaned up.** Every Cypress run that creates a team through the UI leaves it there
— GISMO's `liquido-int` has held over 50 teams at a time from `happy-case.cy.js` runs alone.

**And a shared seed is fragile.** A fixture other tests rely on needs a stated contract about what a
test may touch, or two specs mutating the same "shared" user race each other.

The resolution is a two-tier fixture plus a **manual, on-demand sweep**. Cleanup deliberately does
**not** run through the product API: exposing a destructive "purge" endpoint would have to be guarded
by config (Quarkus `LaunchMode` is `NORMAL` on GISMO, which is exactly where the residue accumulates,
so the same guard that disables `devLogin` there would disable a purge endpoint precisely where it's
needed). Keeping the sweep in `src/test` means **no destructive code ships in the deployed artifact
at all**.

Outcome: a seed with an explicit, executable contract; a database that stops growing; and mutation
tests that are repeatable without per-test fixture creation.

### 3.2 The fixture contract

`TestDataCreator` produces **five** teams:

| Team | Name | Lifecycle | Contract |
|---|---|---|---|
| Seed | `testTeam<millis>` | **Added** fresh each run, never purged by the seeder | Tests may rely on its defined state. May **add** users and polls, and vote in polls they created. Must not change existing users. |
| Scratch | `scratchTeam` | Purged + recreated each run | Assume **nothing** except that it exists. Any test may change anything. |
| Multi A/B | `multiTeamA`, `multiTeamB` | Purged + recreated each run | Owned solely by `switch-team.cy.js`. Fixed team names, user names and emails. |
| Login | `loginTeam` | Purged + recreated each run | Owned solely by `login-tests.cy.js`. Fixed email **and display name**. Nothing mutates it except the idempotent password reset. |

For the four fixed-name teams, members are purged **unconditionally** — including users who also
belong to other teams (this is what makes a fixed-email multi-team member recreatable run after run).

Two rules carry over into every test that touches the seed and must stay:
- A test may vote only in polls **it created** — voting twice in a found poll returns `ALREADY_VOTED`.
- Mutations must be idempotent: write a run-unique value, or rewrite the same deterministic one.
  `login-tests.cy.js`'s password-reset test already does the latter and is the model.

The fixed identities the specs log in as (`loginadmin@liquido.vote`, the `multiTeamA`/`multiTeamB`
member, etc.) are not repeated here — they live in `tests/cypress-base-config.js`, the one place per
repo to change when the fixtures move.

### 3.3 Cleaning up leftover test data

`TestDataPurgeSweep` (backend, `@Tag("purgeTestData")`) is the manual, on-demand broom — it is
**dry-run by default** and refuses any database outside its allowlist. Run it from
`liquido-backend-quarkus`:

```bash
# See what WOULD go (deletes nothing):
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/liquido-int \
  ./mvnw -B test -Dmaven.surefire.includedGroups=purgeTestData -Dmaven.surefire.excludedGroups=""

# Do it:
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/liquido-int \
  ./mvnw -B test -Dmaven.surefire.includedGroups=purgeTestData -Dmaven.surefire.excludedGroups="" \
  -Dpurge.dry-run=false -Dpurge.confirm=liquido-int
```

It removes leftover `Cypress *` teams, seed teams older than the newest 5, polls appended to the
current seed team, and users left with no team membership at all. It does **not** touch
`createFreshTeam` leftovers (backend-only, ad hoc teams with no shared prefix to match on). See
`liquido-backend-quarkus/AGENTS.md` → "Cleaning up test data" for the full detail.

---

## 4. Automated tests (Cypress)

The e2e suite uses **Cypress** (not Playwright — this section used to say otherwise). Specs live in
`tests/e2e/specs/`:

* `happy-case.cy.js` — **the primary regression test.** One long, sequential flow (`testIsolation:
  false`) that walks a brand new team through the entire product — against the real backend or the
  mock, with the identical spec source: create
  team → register passkey → create a poll with two proposals → a member joins, adds and edits their
  own proposal → admin starts voting → member casts a vote and verifies its checksum → admin
  finishes voting → winner is shown. An `afterEach` stops the whole run on the first failure, so a
  failing early step hides everything after it — read the "Skipped:" count, not just "Passing:".
* `login-tests.cy.js` — anonymous access, route guards, login via email/password, forgot-password.
* `switch-team.cy.js` — switching between a user's teams. Needs the seeded multi-team scenario
  (`multiteammember@liquido.vote` in both `multiTeamA` and `multiTeamB`) from the backend's
  `TestDataCreator` — fails against a bare/freshly-deployed backend that was never seeded. See
  [§3 Test data & fixtures](#3-test-data--fixtures).
* `polly-happy-case.cy.js` — the Polly flow (the simpler, teamless, passkey-only poll type), from
  writing the question to the winner, with a friend opening the share link and voting differently.
  It registers a **Chrome virtual authenticator** rather than mocking the passkey, so the WebAuthn
  ceremony genuinely completes and the spec runs against a real deployment. That is not a detail:
  the mock-based spec this replaced could not run in `deployed` mode at all, and the first run of
  the real one found a cookie-path bug that had been breaking Polly registration in production.
* `no-webauthn-support.cy.js` — a device with **no** WebAuthn support at all must still be able to
  register password-only. Deletes `window.PublicKeyCredential` before the page loads, so
  `browserSupportsWebAuthn()` genuinely returns false rather than stubbing our own code, and
  asserts the passkey step is never offered (as opposed to offered-and-declined, which
  `happy-case.cy.js` covers).
* `validation-limits.cy.js` — the length limits served by `query liquidoConfig`: once in the UI
  (the submit button stays disabled), and twice straight against the GraphQL API with `cy.request()`,
  proving the backend rejects a too-short value even from a client that skips the form. The two API
  cases skip themselves in mock mode.
* `user-home-tests.cy.js.FIXME` — disabled (the `.FIXME` extension excludes it from `specPattern`),
  not currently run.

Run with `npm run test:e2e` (all specs, against the local backend) or
`npx cypress run --e2e --spec tests/e2e/specs/<file>` for one spec.
`npx cypress open --e2e --browser firefox` for interactive mode. Without a backend:
`npm run test:e2e:mock`, see [§0](#0-quick-start-from-a-fresh-clone). Which frontend and backend a
run uses is picked by `LIQUIDO_E2E_MODE` — the table of the four modes is at the top of
`tests/cypress-base-config.js`, and `CLAUDE.md` §7 has the full command list.

**Testing rule:** never assert on displayed UI text (a translated/reworded string must not break the
suite) — assert on DOM ids or `data-*` attributes instead. See `CLAUDE.md` §3 for the full list of
rules and the `data-error-code` convention for error cases.

### 4.1 WebAuthn/passkey ceremony in headless tests

A headless test browser has no authenticator, and `navigator.credentials.create()` doesn't fail fast
there either — by default it just hangs indefinitely instead of rejecting. `welcome-chat-v2.vue`'s
`setupPasskey()` guards against this: whenever `window.Cypress` is set (only true inside a Cypress
run) **and** no virtual authenticator has been registered, it short-circuits straight to the same
"registration failed" path a real ceremony failure already takes, instead of calling the real
WebAuthn API. That is the default for every passkey step except one.

`happy-case.cy.js` exercises **both** outcomes for real, not just the failure path: the admin
genuinely registers a passkey, the member declines, and later assertions confirm `team-home.vue`'s
passkey reminder is gone for the admin and still shown for the member. The admin's registration
works via a **Chrome DevTools Protocol virtual authenticator** — `setupVirtualAuthenticator()` in the
spec calls `Cypress.automation("remote:debugger:protocol", ...)` to issue `WebAuthn.enable` then
`WebAuthn.addVirtualAuthenticator` (`protocol: "ctap2"`, `transport: "internal"`,
`automaticPresenceSimulation: true`), then sets `window.__cypressWebAuthnAvailable = true` on the
page. That flag is what lets `setupPasskey()`'s guard let the real ceremony through for that one
step — the resulting credential is genuine (Chrome's own compliant virtual implementation, not a
faked response), so the backend accepts it exactly like a real device's. Chromium-family browsers
only (Cypress's bundled Electron qualifies; Firefox does not support this CDP domain at all).

### 4.2 Running against an already-deployed instance

`cypress.config.remote.js` points the suite at an already-deployed frontend/backend (e.g.
`https://liquido.dynv6.net`) instead of the local dev servers on `localhost:3001`/`:8443` — no local
Postgres or Quarkus needed:

```bash
npm run test:e2e:remote                                           # defaults to liquido.dynv6.net
CYPRESS_REMOTE_URL=https://staging.liquido.vote npm run test:e2e:remote
npm run cypress:open:remote                                        # interactive mode
```

Every spec creates real data (teams, polls, ballots) against whatever backend this points at — never
run it against a production instance with real users. `switch-team.cy.js` and the password-login/
forgot-password parts of `login-tests.cy.js` fail against a fresh deploy for the same seed-data
reason as [§3](#3-test-data--fixtures): they need `TestDataCreator`'s seeded users, which only exist
in a database that generator has actually run against.

### 4.3 Running locally on GISMO, without touching public DNS at all

`liquido.dynv6.net`'s public DNS record has repeatedly gone stale (the FritzBox's DDNS client
doesn't reliably update it whenever the home connection's public IP rotates). That only breaks
reaching the site from *outside* GISMO. Claude Code sessions in this project run directly on GISMO
itself, not via SSH from a laptop, so a local test run has no reason to go anywhere near the public
internet or its DNS at all:

```bash
./deploy/test-e2e-local.sh                                         # full happy-case.cy.js
./deploy/test-e2e-local.sh tests/e2e/specs/polly-happy-case.cy.js  # a specific spec
```

This still uses `cypress.config.remote.js` (so it exercises the real deployed backend/frontend, same
as `test:e2e:remote`), but resolves `liquido.dynv6.net` straight to `127.0.0.1` inside an
unprivileged mount namespace (`unshare -Urm` bind-mounting a private `/etc/hosts` — the real system
one is never touched), so requests hit Caddy directly on this host with the correct Host/SNI for its
site block to match. No DNS lookup, no dependency on the FritzBox's DDNS being current.

This is a *local* check only — it says nothing about whether the public internet can actually reach
GISMO (DNS, FritzBox port-forwarding, and Caddy's real TLS cert all have to work together for that).
For genuine outside-the-network verification, run the suite from somewhere that is actually outside
GISMO's own network — e.g. a cloud CI runner, or (for a Claude Code session) a remote-isolated agent.
The same IPv4-forcing `unshare` technique still applies there, just pointed at the real public IP
instead of `127.0.0.1`, since that runner's network is genuinely elsewhere.

**Why the script exports `DISPLAY`.** Cypress's own Electron shell needs a real X display (or Xvfb)
just to launch, even for a fully "headless" run — `--headless` only concerns the *browser under
test*, not the Cypress app driving it. Without one, `npx cypress run` fails immediately. GISMO isn't
a headless-only box: it already has a real X display running via its desktop session (lightdm),
consistently at `:1` in practice, so the script just does `export DISPLAY="${DISPLAY:-:1}"` and
reuses whatever is already there rather than installing or starting anything. This is specific to
GISMO having a desktop session at all — a genuinely headless environment (e.g. a cloud CI runner or
a remote-isolated agent for the outside-the-network verification above) has no `:1` to fall back to,
and needs Xvfb or an equivalent instead. Having it installed is enough: when `DISPLAY` is unset,
Cypress starts Xvfb itself. (This script's `${DISPLAY:-:1}` default is exactly what would stop that
from happening on such a machine — there, run `npx cypress` directly.)

### 4.4 Negative test cases

Both of the negative cases this section used to list as TODO now exist:

* **Cannot reach backend** — `login-tests.cy.js`, last test. `cy.intercept` forces every GraphQL
  call to fail at the *network* level (not with an HTTP error status), which is what `root-app.vue`'s
  `api.pingApi()` on mount exists to catch, and asserts the warning modal actually appears.
* **Device does not support Passkey** — `no-webauthn-support.cy.js`, see the spec list above.

### 4.5 TODO: tests to implement

* A genuine Ranked Pairs **tie** (more than one undefeated proposal) on the winner page. The backend
  reports it via `publishedTally.winnerIds`, and `poll-winner.vue` renders an explanation instead of
  a winner, but no e2e spec reaches that state: the happy case casts a single ballot, and a tie needs
  two voters who split 1:1 on one pair while both beating a third proposal. The pure algorithm side
  is covered by `tests/unit/ranked-pairs.spec.js` and the backend's `PublishedTallyTest`.

### 4.6 The mock backend

`LIQUIDO_E2E_MODE=mock` runs the e2e suite with no backend at all. The requirement that shaped it:
**the spec source must be identical** against the mock and against the real backend. A spec that
waits for a request (`cy.intercept(...).as(...)` + `cy.wait(...)`) can only do that if the request
actually goes over the network — so the mock is a real HTTP server, not a swapped-in client.

| File | Role |
|---|---|
| `config/config.mock.js` | `mockBackend: true`. Selected by `npm run dev:mock` (`LIQUIDO_CONFIG=mock`, see `vite.config.js`) |
| `vite-plugin-mock-backend.js` | Mounts the mock as dev-middleware in the Vite dev server, when `config.mockBackend` is on |
| `mock-backend/liquido-mock-http-server.js` | Node-only HTTP layer: `/graphql`, `/graphql/schema.graphql`, `/login/*`, `/webauthn/*`, and the mock-only `/mock/reset` |
| `mock-backend/liquido-mock-domain.js` | The "database" and the GraphQL query/mutation handlers. No Node APIs, so vitest can load it too |

With `mockBackend` on, `liquido-graphql-client.js` only changes its base URL: it sends every request
to the dev server's own origin instead of `LIQUIDO_API_URL`, and the middleware answers it. Nothing
else in the app knows it is talking to a mock, except the red LIQUIDO icon in the header, which is
there so nobody forgets.

**State** lives in the dev server process: one shared database for every tab and every spec, like a
real backend, and gone when the server stops. `POST /mock/reset` (the red icon) empties it.

**vitest** has no dev server. Under `config/config.test.js` (`configSource: "test"`) the client
calls `liquido-mock-domain.js` in-process instead, and specs reset it between tests with
`resetGraphQlMockState()`.

**Why `localhost`, when the other modes insist on `shadow.fritz.box`:** the real backend accepts a
passkey only from the one origin in its `quarkus.webauthn.origins`. The mock has no such list — it
takes the relying-party id from the request's own `Host` header — so any host works, and `localhost`
needs no `/etc/hosts` entry. Port 3002 keeps it clear of a normal dev server on 3001.

**WebAuthn in the mock** is a deliberately simple workaround, not an implementation. The mock serves
a spec-valid challenge, so the browser (in the e2e run: Chrome's CDP virtual authenticator, [§4.1](#41-webauthnpasskey-ceremony-in-headless-tests))
runs the real client-side ceremony. The attestation or assertion that comes back is **not
verified** — registration simply sets the user's `hasWebauthn`, which makes the team page drop its
passkey reminder, exactly as `happy-case.cy.js` checks. Real passkeys still need a real device and a
real backend.

**Emails** are not sent. The endpoints that would send one (welcome, password reset, login link)
answer like the backend does; the password-reset and login-link tokens are kept in the mock's state
(and logged to the dev server's console). There is no route yet for a spec to read them, which is
why the password-reset round trip in `login-tests.cy.js` still needs a real backend.

**Not covered by it yet:** the fixed seed identities of [§3](#3-test-data--fixtures) (see the
failing cases in [§0](#0-quick-start-from-a-fresh-clone)), and Polly, whose mock
(`src/polly/polly-client.mock.js`) still runs in the browser.
