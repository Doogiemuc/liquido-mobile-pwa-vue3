# How to test LIQUIDO

There is a lot of setup and configuration for debugging and testing LIQUIDO. This doc covers manual
testing (local and on a real device) and the automated Cypress e2e suite, including the test-data
contract both rely on.

1. [Manual testing setup](#1-manual-testing-setup)
2. [Testing on a real device](#2-testing-on-a-real-device)
3. [Test data & fixtures](#3-test-data--fixtures)
4. [Automated tests (Cypress)](#4-automated-tests-cypress)

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
  false`) that walks a brand new team through the entire product against the real backend: create
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
* `user-home-tests.cy.js.FIXME` — disabled (the `.FIXME` extension excludes it from `specPattern`),
  not currently run.

Run with `npm run test:e2e` (all specs) or `npx cypress run --e2e --spec tests/e2e/specs/<file>` for
one spec. `npx cypress open --e2e --browser firefox` for interactive mode. See `CLAUDE.md` §7 for the
full command list.

**Testing rule:** never assert on displayed UI text (a translated/reworded string must not break the
suite) — assert on DOM ids or `data-*` attributes instead. See `CLAUDE.md` §3 for the full list of
rules and the `data-error-code` convention for error cases.

### 4.1 WebAuthn/passkey ceremony in headless tests

A headless test browser has no authenticator, and `navigator.credentials.create()` doesn't fail fast
there either — by default it just hangs indefinitely instead of rejecting. `welcome-chat.vue`'s
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
and needs Xvfb or an equivalent instead.

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
