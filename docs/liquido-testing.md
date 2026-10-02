# How to test LIQUIDO

The one place for everything about testing LIQUIDO — frontend **and** backend: the environments, what
to configure where, the test data both sides share, every test suite, and how to test on a real device.
The backend repo ([liquido-backend-quarkus](../../liquido-backend-quarkus)) links here instead of
keeping its own copy.

0. [Overview](#0-overview)
1. [Quick start from a fresh clone](#1-quick-start-from-a-fresh-clone)
2. [Environments: DEV, TEST, MOCK, INT](#2-environments-dev-test-mock-int)
3. [Test data & fixtures](#3-test-data--fixtures)
4. [Backend tests (JUnit)](#4-backend-tests-junit)
5. [Frontend unit tests (vitest)](#5-frontend-unit-tests-vitest)
6. [End-to-end tests (Cypress)](#6-end-to-end-tests-cypress)
7. [Manual testing & real devices](#7-manual-testing--real-devices)
8. [Regression after a deploy](#8-regression-after-a-deploy)

---

## 0. Overview

| Test suite | Where | Tests what | Runs in |
|---|---|---|---|
| Backend JUnit (`./mvnw test`) | `liquido-backend-quarkus/src/test/java` | Voting algorithms, authentication, use cases and invariants, over real HTTP against a Quarkus test instance | TEST |
| `TestDataCreator` | same | The whole happy path through the GraphQL API — and it **is** the seed generator (§3) | TEST |
| Frontend unit tests (vitest) | `tests/unit` | Services, components, the mock backend's domain logic | MOCK (in-process) |
| End-to-end (Cypress) | `tests/e2e/specs` | The real PWA in a real browser, step by step through the UI | DEV, MOCK or INT |

## 1. Quick start from a fresh clone

Everything below runs **without a backend, without a database and without any config file you have
to create first** — the e2e suite runs against the mock backend built into the dev server (§6.6).

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
| A hostname in `/etc/hosts` | not needed — mock mode runs on `localhost` (§6.6) |
| Cypress config | `cypress.config.js` + `tests/cypress-base-config.js` — checked in |

`config/config.development.js` is **not** needed for any of this. It is gitignored and only
required for `npm run dev` against a real backend (environment DEV, copy it from `config.development.js.example`).

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
| `login-tests.cy.js` | Login via email & password | Signs in as the backend's fixed seed identity (`loginadmin@liquido.vote`, §3), which the mock's data does not contain |
| `switch-team.cy.js` | both cases | Same reason: needs the seeded `multiTeamA`/`multiTeamB` member |
| `polly-happy-case.cy.js` | the friend's vote (the 4 steps after it are then skipped, fail-fast) | The Polly mock still runs in the browser (`src/polly/polly-client.mock.js`) and cannot tell the friend's "device" from the creator's |

By design, and not failures: the two cases in `login-tests.cy.js` and the two in
`validation-limits.cy.js` that call a real backend's HTTP API directly skip themselves in mock mode
(`Cypress.expose("LIQUIDO_API")` is `null` there), and `login-tests.cy.js` has two more `it.skip`
cases that are pending in every mode.

So a run from a fresh clone ends like this today (last checked 2026-10-02) — anything else is news:

```
  ✔  finish-poll-from-ballot.cy.js  3 tests  3 passing
  ✔  happy-case.cy.js           17 tests   17 passing
  ✖  login-tests.cy.js          12 tests    7 passing   1 failing   4 pending
  ✔  no-webauthn-support.cy.js   1 test     1 passing
  ✖  polly-happy-case.cy.js     10 tests    5 passing   1 failing               4 skipped
  ✖  switch-team.cy.js           2 tests                2 failing
  ✔  validation-limits.cy.js     3 tests    1 passing               2 pending
```

The other environments need a real backend and some setup — see §2.

---

## 2. Environments: DEV, TEST, MOCK, INT

LIQUIDO runs in four environments. The names match the databases (`LIQUIDO-DEV`, `LIQUIDO-TEST`,
`liquido-int`) and the Quarkus profiles (`dev`, `test`); a future production environment would be PROD.
The Cypress mode names (`local`, `mock`, `deployed`) are older and describe what the browser opens —
the table maps them.

| Environment | Runs on | Browser opens | Backend API (GraphQL) | Backend | DB | Cypress mode | Commands |
|---|---|---|---|---|---|---|---|
| **DEV** — local development with hot reload | laptop | `https://shadow.fritz.box:3001` | `https://shadow.fritz.box:8443/graphql` | `quarkus:dev`, HTTPS only | LIQUIDO-DEV | `local` | `./mvnw quarkus:dev` · `npm run dev` · `npm run test:e2e` |
| **TEST** — automated backend tests | laptop, GISMO | – | `http://localhost:8081/graphql` | its own Quarkus test instance, plain HTTP | LIQUIDO-TEST | – | `./mvnw test` · `./mvnw test -Dtest=…` · reseed (§3.4) |
| **MOCK** — frontend without a backend | laptop (vitest also on GISMO) | `https://localhost:3002` | `https://localhost:3002/graphql`, answered by Vite middleware; vitest: in-process, no HTTP | `mock-backend/` | in memory | `mock` | `npm test` · `npm run test:e2e:mock` · `npm run dev:mock` |
| **INT** — integration on GISMO | GISMO | `https://liquido.dynv6.net` (static files, Caddy) | `https://liquido.dynv6.net/api/v2/graphql` — Caddy strips `/api/v2` and forwards to `http://localhost:8080/graphql` | Docker container `liquido-backend` | liquido-int | `deployed` | e2e: `./deploy/test-e2e-local.sh` (on GISMO) · `npm run test:e2e:deployed` (elsewhere); deploy (**ask first**): `./deploy/build-and-deploy-local.sh` · `sg docker -c "./deploy/deployToGismo-docker.sh"` |

**URLs.** The backend always serves from its root (`/graphql`, `/login/*`, `/webauthn/*`,
`/polly/webauthn/*`). Only INT has the `/api/v2` prefix, added and stripped by Caddy —
`quarkus.http.root-path` is a build-time property, so the prefix cannot live in Quarkus per deployment.
The frontend's `LIQUIDO_API_URL` and Cypress's `LIQUIDO_API` both hold the **API root** (e.g.
`https://shadow.fritz.box:8443` or `https://liquido.dynv6.net/api/v2`); the code appends `/graphql`
etc. itself, so never end it in `/graphql`.

**GISMO is INT only.** GISMO is the integration environment: a real frontend served by Caddy against a
real backend in Docker. No DEV servers and no MOCK e2e runs there. What does run on GISMO besides INT:
the backend tests (TEST, against GISMO's own `LIQUIDO-TEST`) and vitest, as part of the regression
after a deploy (§8). AI agent sessions normally run on GISMO itself.

### 2.1 DEV — local development with hot reload

* Frontend: `npm run dev` → Vite on `https://shadow.fritz.box:3001`, config `config/config.development.js`
  (gitignored, copy `config.development.js.example`; `mockBackend: false`).
* Backend: `./mvnw quarkus:dev` → `https://shadow.fritz.box:8443`, config
  `config/application-dev.properties` (gitignored), database `LIQUIDO-DEV`, seeded from the dump (§3.4).
  Dev UI at `https://shadow.fritz.box:8443/q/dev/`.
* **Why `shadow.fritz.box` and not `localhost`:** WebAuthn ties a passkey to the exact origin it was
  created on, and the backend accepts only the origin in `quarkus.webauthn.origins`. A real host name is
  also what a phone on the LAN can reach (§7). `shadow.fritz.box` is the developer laptop, resolved by
  the FritzBox's DNS.
* Needs: the mkcert certificate with that host name in its SANs and the mkcert CA installed on this
  machine (see the backend's [README-tech.md → TLS](../../liquido-backend-quarkus/docs/README-tech.md#tls-for-local-development)),
  and the three WebAuthn settings in the table below agreeing with each other.
* Browse once to `https://shadow.fritz.box:8443/graphql/schema.graphql` so the browser accepts the
  backend's certificate; `https://shadow.fritz.box:8443` then shows the API version.
* e2e: `npm run test:e2e` (mode `local`). It checks `config.development.js` against the mode and
  **aborts on a mismatch** (`mockBackend: true`, or an API URL on another host), because the
  alternative is a green suite that only proved the mock works. Every run leaves a team behind in `LIQUIDO-DEV`.

### 2.2 TEST — automated backend tests

* `./mvnw test` boots its own Quarkus instance on `http://localhost:8081` (Quarkus' test port, plain
  HTTP; `TestFixtures.LIQUIDO_API`). Tests call it over real HTTP with RestAssured.
* Config: `config/application-test.properties` (gitignored) — copy
  `config/application-test.properties.example`, which lists every key. Database `LIQUIDO-TEST`.
* Needs a seeded `LIQUIDO-TEST`: without it Quarkus cannot boot and the tests error rather than fail.
  Seeding is `TestDataCreator` (§3).
* Details: §4.

### 2.3 MOCK — frontend without a backend

* **vitest:** `npm test`. Config `config/config.test.js` (`configSource: "test"`, `mockBackend: true`).
  There is no dev server, so the client calls `mock-backend/liquido-mock-domain.js` in-process.
* **e2e:** `npm run test:e2e:mock` (or `npm run dev:mock` + Cypress mode `mock`). Config
  `config/config.mock.js`, dev server on `https://localhost:3002`; the mock is a real HTTP server inside
  Vite (§6.6). The red LIQUIDO icon in the header shows that the mock is active.
* A second variant exists: `npm run dev` with `mockBackend: true` in your `config.development.js`
  serves the mock on :3001. Cypress mode `local` refuses to run against that, on purpose.

### 2.4 INT — integration on GISMO

* Frontend: static files in `/var/www/liquido-frontend`, served by Caddy at `https://liquido.dynv6.net`,
  built with `config/config.production.js` (gitignored; `LIQUIDO_API_URL: "https://liquido.dynv6.net/api/v2"`).
* Backend: Docker container `liquido-backend` (`network_mode: host`, port 8080), prod profile plus
  `~/Coding/liquido/config/application-gismo.properties` via `QUARKUS_CONFIG_LOCATIONS`; database
  `liquido-int`; WebAuthn origin `https://liquido.dynv6.net`. Details: the backend's
  [README-tech.md → Deployment](../../liquido-backend-quarkus/docs/README-tech.md#deployment-gismo-environment-int).
* e2e on GISMO itself: `./deploy/test-e2e-local.sh [spec]` (§6.5). From any other machine:
  `npm run test:e2e:deployed` (alias `test:e2e:remote`), or `npm run cypress:open:remote`.
  `CYPRESS_REMOTE_URL` points it at another deployment.
* Every run creates real teams, polls and ballots — never aim it at an instance with real users.
  `switch-team.cy.js` and the password parts of `login-tests.cy.js` need the fixed-name seed teams
  (§3), which exist only in a database `TestDataCreator` has run against.
* ⚠️ Never `drop-and-create` or run `TestDataCreator` against `liquido-int`.

### 2.5 What to configure where

✱ = these values must agree with each other.

| Setting | DEV | TEST | MOCK | INT |
|---|---|---|---|---|
| Frontend config file | `config/config.development.js` (gitignored, from `.example`) | – | `config/config.test.js` (vitest), `config/config.mock.js` (e2e) — both checked in | `config/config.production.js` (gitignored) |
| `LIQUIDO_API_URL` (API root) | `https://shadow.fritz.box:8443` | – | not called (set anyway) | `https://liquido.dynv6.net/api/v2` |
| `mockBackend` | `false` | – | `true` | `false` |
| Backend config file | `config/application-dev.properties` (gitignored) | `config/application-test.properties` (gitignored, from `.example`) | – | `~/Coding/liquido/config/application-gismo.properties` + `docker/.env` |
| Datasource | `LIQUIDO-DEV` | `LIQUIDO-TEST` | – | `liquido-int` |
| ✱ `quarkus.webauthn.origins` | `https://shadow.fritz.box:3001` (scheme, host **and** port) | – | – (the mock uses the request's Host) | `https://liquido.dynv6.net` |
| ✱ `quarkus.webauthn.relying-party.id` | `shadow.fritz.box` (host only) | – | – | `liquido.dynv6.net` |
| ✱ Frontend host in Cypress | `LOCAL_FRONTEND` in `tests/cypress-base-config.js` | – | `MOCK_FRONTEND` | `CYPRESS_REMOTE_URL` (default `https://liquido.dynv6.net`) |
| ✱ `liquido.dev-login-token` ↔ Cypress `env.devLoginToken` | `devLoginTokenDev` ↔ `devLoginTokenDev` | `devLoginTokenTest` (fixed: `PollyTests` hard-codes it) | – | in `application-gismo.properties` |
| ✱ `liquido.test-password-reset-token` ↔ Cypress `env.testPasswordResetToken` | `PASSWORD_RESET_TOKEN_DEV` ↔ same | any value, but must be set | – | in `application-gismo.properties` |
| ✱ `liquido.hash-secret` | **identical** to TEST, or ballots cannot be found across the two | identical to DEV | – | its own |
| TLS | mkcert pair: `tls-certs/` (frontend) and `src/main/resources/` (backend) | none (HTTP) | `tls-certs/` | Let's Encrypt, by Caddy |
| Host name | `shadow.fritz.box` in DNS or `/etc/hosts` | `localhost` | `localhost` | public DNS `liquido.dynv6.net` (dynv6) |

---

## 3. Test data & fixtures

Backend tests and the e2e specs rely on data that the backend's `TestDataCreator` seeds and
`TestDataPurgeSweep` cleans up. Read this before touching any test that logs in as a fixed identity
rather than creating its own team.

### 3.1 How the seed data flows

```
TestDataCreator (./mvnw test, tag testDataCreator)
    └─▶ LIQUIDO-TEST ──pg_dump --data-only --disable-triggers──▶ liquido-testData.sql (backend repo root, gitignored)
                                                                       └──psql──▶ LIQUIDO-DEV ──▶ DEV + Cypress mode local
```

`liquido-int` (INT) is **never** seeded this way.

### 3.2 `TestDataCreator` is both the seed generator *and* the happy-path test

`TestDataCreator.createTestData()` walks through the **entire real-world use case** with the same
GraphQL calls the app sends: register an admin → a member joins → create polls and proposals → like →
start voting → cast votes → verify a ballot → finish voting → check the winner. Running it exercises the
full happy path and *is* the seeding mechanism. One method, two jobs, by design.

It is excluded from normal builds by `@Tag("testDataCreator")` plus `maven.surefire.excludedGroups=testDataCreator`
in `pom.xml`, and opted into with the `-D` flags in §3.4. Since so much depends on its exact output, grep
for the ids, emails and titles it creates before changing it.

### 3.3 The fixture contract

`TestDataCreator` produces **five** teams in two tiers:

| Team | Name | Lifecycle | Contract |
|---|---|---|---|
| Seed | `testTeam<millis>` | **Added** fresh on every run, never purged by the seeder | Tests may rely on its defined state (7 members; polls in ELABORATION, admin-only, VOTING and FINISHED). May **add** users and polls, and vote in polls they created. Must not change existing rows. |
| Scratch | `scratchTeam` | Purged + recreated each run | Assume **nothing** except that it exists. Any test may change anything. |
| Multi A/B | `multiTeamA`, `multiTeamB` | Purged + recreated each run | Owned solely by `switch-team.cy.js` (and `SwitchTeamTests` builds its own). Fixed names and emails; `multiteammember@liquido.vote` is in both. |
| Login | `loginTeam` | Purged + recreated each run | Owned solely by `login-tests.cy.js`. Fixed email `loginadmin@liquido.vote` **and** display name. Nothing mutates it except the idempotent password reset. |

For the four fixed-name teams, members are purged **unconditionally** — including users who also belong
to other teams; that is what makes a fixed-email multi-team member recreatable run after run. The fixed
identities live in `TestFixtures.java` (backend) and `tests/cypress-base-config.js` (frontend) — keep
those two in sync.

**The two rules** (asserted by `SeedContractTests`):

1. **APPEND freely.** A test may add polls, proposals, likes, ballots and its own voter tokens to the
   seed team. Nothing may depend on the seed team's exact counts.
2. **Never change the identity or relationships of seed rows** — delegations, team membership,
   passwords, `lastTeamId`. Those alter other tests' *preconditions* rather than adding to them.
   Need isolation? `LiquidoTestUtils.createFreshTeam(prefix)` (timestamp-based, safe to call any number
   of times). `UseCaseTests.proxyCastsVoteForVoter` is the worked example: it used to delegate inside the
   seed team, permanently making the seed admin a proxy.

And on the e2e side: a test may vote only in polls **it created** (voting twice returns
`ALREADY_VOTED`), and mutations must be idempotent — write a run-unique value, or rewrite the same
deterministic one, like `login-tests.cy.js`'s password reset.

**Ask for the row you mean, by name.** `util.getSeedTeam()` / `getSeedAdmin()` / `getSeedMember()` /
`getSeedTeamMember()`, plus `getAnyUser()` for tests that need *a* user and assert nothing about which.
The seed team's name carries a timestamp, so find it by PREFIX — never by `TestFixtures.teamName`, which
only names the team *this* JVM would create. These helpers replaced `getRandomTeam/Admin/User()`, which
were `findAll().firstResultOptional()` with no `ORDER BY` — not random, just "first row of an unordered
scan", which Postgres is free to change whenever a row is UPDATEd (and every login updates one). That is
what made leftover throwaway teams able to break unrelated tests. Anchoring by name is *why* nothing
cleans the database up: nothing reads the garbage.

**Traps worth knowing:**

- **`devLogin` logs a user into their `lastTeamId`**, which `joinTeam` rewrites. A user in two teams
  logs into whichever they joined last, and every team-scoped call afterwards fails with
  `Poll(id=…) not found`. Use `devLoginInto(email, teamId)` to pin the team; `seedRandomProposals` does.
- **`TeamEntity.members` is an unordered `HashSet`.** Never assume `get(0)` is the admin — filter by
  role or email, or use a fresh team.
- **`@TestTransaction` does not roll back HTTP-triggered mutations.** The server runs each request in
  its own transaction. If a test persists something directly via JPA and a following HTTP call must see
  it, commit it first with `QuarkusTransaction.requiringNew().run(...)`.
- **Assert only over your own data.** `UseCaseTests` once asserted the *whole* `voting_tokens` table
  was empty; one abandoned token anywhere broke it permanently and blamed the wrong test.
- `LiquidoTestUtils.createTeam()` hard-codes a mobile number tied to the seed constants — call it once
  (the seeder does), use `createFreshTeam(prefix)` everywhere else.

### 3.4 Reseeding

⚠️ **Only against a throwaway database:** `LIQUIDO-TEST` / `LIQUIDO-DEV` on a laptop, or GISMO's own
`LIQUIDO-TEST`. **Never** `liquido-int`, staging or PROD — `drop-and-create` wipes the whole schema.
Name the database explicitly on the command line so config resolution cannot surprise you.

1. Stop `quarkus:dev` first — it holds the old schema, and `clean` pulls `target/` out from under it.
2. Recreate the schema and seed `LIQUIDO-TEST` (run in `liquido-backend-quarkus`):
   ```bash
   QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/LIQUIDO-TEST \
   QUARKUS_HIBERNATE_ORM_SCHEMA_MANAGEMENT_STRATEGY=drop-and-create \
   QUARKUS_HIBERNATE_ORM_DATABASE_GENERATION=drop-and-create \
   ./mvnw -B test -Dmaven.surefire.includedGroups=testDataCreator -Dmaven.surefire.excludedGroups=""
   ```
   **Both** schema variables are needed; the legacy `database.generation` key otherwise silently wins and
   no schema gets created. The run also writes `liquido-testData.sql` (needs `pg_dump` on the PATH).
3. Run the full suite normally (`./mvnw -B clean test`, no variables) to confirm a clean baseline.
4. To seed `LIQUIDO-DEV` (DEV): recreate its schema by starting `quarkus:dev` **once** with
   `QUARKUS_DATASOURCE_JDBC_URL=…/LIQUIDO-DEV` and the two schema variables, and stop it as soon as it is
   up (a live reload with those variables would drop everything again). Then restore the dump as
   superuser and restart `quarkus:dev` normally:
   `psql -h localhost -U postgres -d "LIQUIDO-DEV" -f liquido-testData.sql`.

**The dump must be produced with `--disable-triggers`** — not cosmetic. The schema has circular foreign
keys (`polls.winner_id → proposals` while `proposals.poll_id → polls`, the same between `polly` and
`polly_proposal`, plus self-referencing `righttovote`). A `--data-only` dump writes tables in one flat
order, and no order satisfies a cycle, so without the flag the dump is **silently unrestorable** —
`pg_dump` succeeds, warns on stderr, and the failure only shows later as `violates foreign key constraint`.
`TestDataCreator.extractPostgresData()` passes the flag; don't remove it. Restoring needs a superuser
because of it. `liquido-testData.sql` is gitignored: regenerate it after any schema or seed change.

### 3.5 Cleaning up leftover test data

Nothing cleans up automatically, by design (see "ask for the row you mean" above). Leftovers do
accumulate though — `liquido-int` once held 71 teams and `LIQUIDO-TEST` over 800.

`TestDataPurgeSweep` (`@Tag("purgeTestData")`) is the manual, on-demand broom. It is **dry-run by
default**, refuses any database outside `TestDataPurger.PURGEABLE_DATABASES` (`LIQUIDO-TEST`,
`LIQUIDO-DEV`, `liquido-int`), and when actually deleting also requires `-Dpurge.confirm=<dbname>` matching
the JDBC URL — the target is named twice, by two different mechanisms. Run it in `liquido-backend-quarkus`:

```bash
# See what WOULD go (deletes nothing):
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/liquido-int \
  ./mvnw -B test -Dmaven.surefire.includedGroups=purgeTestData -Dmaven.surefire.excludedGroups=""

# Do it:
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/liquido-int \
  ./mvnw -B test -Dmaven.surefire.includedGroups=purgeTestData -Dmaven.surefire.excludedGroups="" \
  -Dpurge.dry-run=false -Dpurge.confirm=liquido-int
```

It removes teams the e2e suite created (`Cypress *`), seed teams older than the newest 5, polls that
tests appended to the current seed team, and users left with no membership at all. It does **not**
touch `createFreshTeam` leftovers — those have no shared prefix, so there is nothing safe to match on.

It is deliberately **not** reachable from the product API. Quarkus' `LaunchMode` is `NORMAL` on GISMO —
exactly where the residue is — so the guard that protects `devLogin` would disable a purge endpoint
precisely where it is needed, and the alternative (a config flag) is a destructive endpoint one copied
properties line away from production. Keeping the sweep in `src/test` means no destructive code ships in
the deployed artifact at all.

---

## 4. Backend tests (JUnit)

Run in `liquido-backend-quarkus` (environment TEST):

```bash
./mvnw clean test                                        # everything (needs a seeded LIQUIDO-TEST)
./mvnw test -Dtest=UseCaseTests                          # one class
./mvnw test -Dtest=UseCaseTests#proxyCastsVoteForVoter   # one method
```

- `skipITs` defaults to `true`, so failsafe integration tests don't run in a normal build.
- Opt-in tags, excluded by default: `testDataCreator` (§3.4) and `purgeTestData` (§3.5).
- Two tests in `AuthenticationTests` are `@Disabled` on purpose — they only work in a manual debug run.
- Tests that guard a past bug — keep them green, don't "simplify" them away: `SeedContractTests` (the
  fixture contract), `CastVoteOverrideTest` (re-delegation must stay possible), `ErrorCodesInSyncTest`
  (the frontend's `LiquidoExceptionCodes.js` matches the backend), `LiquidoConfigMatchesEntityTest`
  (validation limits match the entity annotations), `GraphQLSchemaExposureTest` (no sensitive field in
  the generated schema — never weaken it), `PollTeamScopingTests` (team = tenant boundary).

## 5. Frontend unit tests (vitest)

```bash
npm test             # once (npx vitest run)
npm run test:unit    # watch mode
```

Config `config/config.test.js` (environment MOCK, in-process). Specs reset the mock state between tests
with `resetGraphQlMockState()`. `tests/unit/polly-flow.spec.js` also asserts the module boundary between
Polly and the team-poll client (see [liquido-architecture.md §8b](liquido-architecture.md)).

---

## 6. End-to-end tests (Cypress)

### 6.1 The specs

Specs live in `tests/e2e/specs/`:

* `happy-case.cy.js` — **the primary regression test**, see §6.3.
* `finish-poll-from-ballot.cy.js` — an admin finishes a running poll straight from the ballot page,
  after a confirmation they can also cancel. A running poll the user has not voted in yet opens the
  ballot directly (from the poll list and from team-home), so an admin who has not voted never sees
  the detail page — `happy-case.cy.js` only covers the admin who votes first and finishes there. Also
  checks that Back from the ballot returns to the list, and that a member gets no finish action.
  **Mock mode only**: it relies on the mock seed's poll 305, and skips itself in every other mode.
* `login-tests.cy.js` — anonymous access, route guards, login via email/password, forgot-password,
  and "cannot reach backend".
* `switch-team.cy.js` — switching between a user's teams. Needs the seeded multi-team scenario (§3.3).
* `polly-happy-case.cy.js` — the Polly flow, from writing the question to the winner, with a friend
  opening the share link and voting differently. It registers a **Chrome virtual authenticator** rather
  than mocking the passkey, so the WebAuthn ceremony genuinely completes and the spec runs against a real
  deployment. The first run of the real one found a cookie-path bug that had been breaking Polly
  registration in production.
* `no-webauthn-support.cy.js` — a device with **no** WebAuthn support must still be able to register
  password-only. Deletes `window.PublicKeyCredential` before the page loads, so
  `browserSupportsWebAuthn()` genuinely returns false, and asserts the passkey step is never offered.
* `validation-limits.cy.js` — the length limits served by `query liquidoConfig`: once in the UI (the
  submit button stays disabled), and twice straight against the GraphQL API with `cy.request()`, proving
  the backend rejects a too-short value even from a client that skips the form.
* `user-home-tests.cy.js.FIXME` — disabled (the `.FIXME` extension excludes it from `specPattern`).

### 6.2 Modes and commands

`LIQUIDO_E2E_MODE` picks which frontend the browser opens and which backend that frontend talks to
(table at the top of `tests/cypress-base-config.js`):

| Mode | Environment | Command |
|---|---|---|
| `local` *(default)* | DEV | `npm run test:e2e` |
| `mock` | MOCK | `npm run test:e2e:mock` |
| `deployed` | INT | `./deploy/test-e2e-local.sh` on GISMO, `npm run test:e2e:deployed` elsewhere |

```bash
npx cypress run --e2e --spec tests/e2e/specs/happy-case.cy.js   # one spec (mode from LIQUIDO_E2E_MODE)
npm run cypress:open                                            # interactive (Firefox)
```

Cypress only decides which URL the browser opens. Which backend the *frontend* calls is fixed in the
dev server's config, read once at startup — so after changing `config.development.js`, restart the dev
server. Modes that skip what they cannot do read `Cypress.expose("mode")` / `Cypress.expose("LIQUIDO_API")`.

### 6.3 The happy case, step by step

`happy-case.cy.js` is one sequential flow (`testIsolation: false`) that walks a brand new team through
the entire product, using only the UI — against the real backend or the mock, with identical spec
source. Read it as documentation of the intended user journey
([use cases](use-case-flows/liquido-use-cases.md)):

1. **The PWA loads.**
2. **An admin creates a team** — nickname → "create team" → team name, email, password; registers a
   passkey, gets a welcome mail and a JWT.
3. **The returning admin is logged in automatically** from the JWT in `localStorage`, sees the admin
   section and the reminder that their email is not confirmed yet.
4. **The verify-email link from the welcome mail resolves.**
5. **The admin creates a poll with its first two proposals on one page** — title, two proposals with
   descriptions and icons, "members may add proposals" ticked.
6. **The admin deletes a proposal and adds another** while the poll is in ELABORATION.
7. **A member joins the team** with the invite code (declining the passkey) and lands on the team page.
8. **The member sees the team and the poll**, but cannot start the vote.
9. **The member adds their own proposal** in the editor — title read-only, the admin's proposals read-only.
10. **The member edits their own proposal, and only their own.**
11. **A poll created with the checkbox left off is admin-only** — the member sees an explanation instead
    of an input, even when reaching the editor by URL.
12. **The member likes a proposal.**
13. **The admin starts the voting phase** and shortens the runtime; the test asserts the duration reached the backend.
14. **The member casts a vote** and verifies the ballot's checksum — the anonymity guarantee in action.
15. **The admin votes too**, so the poll has more than one ballot.
16. **The admin finishes the voting phase** — the poll is `FINISHED`, `votingEndAt` is checked.
17. **The winner page shows the winning proposal**, the duel matrix and the Ranked Pairs graph.

**A failure hides everything after it.** An `afterEach` calls `Cypress.runner.stop()`, so if step 9
fails, steps 10–17 are *skipped* — not passed. Always read the "Skipped:" count, not just "Passing:".
(Start voting and cast vote had silently never executed for a long time because of an earlier failure.)
The fail-fast itself is deliberate, and the exit code is trustworthy: a failing run exits non-zero.

### 6.4 Writing e2e tests — the rules

* **Never assert on text displayed in the UI.** A translated or reworded UI must not break the suite.
  Assert on **DOM ids** (`#createPollButton`) or **`data-*` attributes** (`[data-poll-id]`,
  `[data-proposal-id]`, `[data-row-state]`, `[data-member-name]`, `[data-poll-status]`). Error cases:
  error elements carry `:data-error-code="…"` (the backend's `liquidoErrorCode`) — assert on that. If the
  hook you need doesn't exist, add `data-qa="someId"` to the component. The only acceptable text
  assertions are on data the test itself entered, and even then prefer an id.
* **DOM ids are a public contract.** camelCase (`#pollTitleInput`); page-title anchors are kebab-case
  (`#poll-show`, `#poll-edit`). Renaming one breaks e2e — grep the specs first.
* **`should('be.visible')` does not scroll.** Cypress only auto-scrolls for *actions*. On the 375×667
  viewport, anything below the fold needs `.scrollIntoView().should('be.visible')` — not a weaker
  assertion, a hidden element still fails. (That's why `cypress/unsafe-to-chain-command` is off in `.eslintrc.cjs`.)
* **`popup-modal.vue` derives its button ids from its own id** — `#confirmDeleteModalPrimaryButton`, not
  `#modalPrimaryButton`; `root-app.vue` always mounts `#rootPopupModal`.
* **Never edit source while Cypress is running.** Vite HMR (or a Quarkus hot reload) mid-run produces
  failures that look real and are not.
* **The same spec source must work in every mode.** Guard every `cy.request()` straight to the backend
  with `if (!Cypress.expose("LIQUIDO_API")) this.skip()` — it is `null` in mock mode.
* Secrets go in `env` (read with `cy.env([...])`: `passwordSuffix`, `devLoginToken`,
  `testPasswordResetToken`), public values in `expose` (`Cypress.expose(...)`: `mode`, `LIQUIDO_API`,
  the fixed seed identities). Never commit a real credential; the Mailtrap token comes from `MAILTRAP_API_TOKEN`.
* `tests/e2e/support/commands.js` is **not loaded** (`supportFile: false`), so its `cy.devLogin()` is not
  available in specs. The viewport is mobile, 375 × 667.
* The mock's state is no longer in `sessionStorage`: the `sessionStorage.removeItem("LIQUIDO_MOCK_STATE")`
  still in `happy-case.cy.js` has no effect — don't copy it into new specs.
* Any change to authentication or WebAuthn must also be tried in a real browser, not only in automated tests.

### 6.5 Specialities

**WebAuthn in a headless browser.** A headless test browser has no authenticator, and
`navigator.credentials.create()` doesn't fail fast there — it hangs. `welcome-chat-v2.vue`'s
`setupPasskey()` therefore short-circuits to the "registration failed" path whenever `window.Cypress`
is set **and** no virtual authenticator was registered. `happy-case.cy.js` exercises **both** outcomes for
real: the admin registers a passkey via a **Chrome DevTools Protocol virtual authenticator** —
`setupVirtualAuthenticator()` issues `WebAuthn.enable` and `WebAuthn.addVirtualAuthenticator`
(`protocol: "ctap2"`, `transport: "internal"`, `automaticPresenceSimulation: true`) through
`Cypress.automation("remote:debugger:protocol", ...)` and sets `window.__cypressWebAuthnAvailable = true`
— and the member declines. The credential is genuine, so the backend accepts it like a real device's.
Chromium-family browsers only (Cypress's Electron qualifies; Firefox does not).

**`./deploy/test-e2e-local.sh` on GISMO** runs a spec in mode `deployed` without touching public DNS:
inside an unprivileged mount namespace (`unshare -Urm`) it bind-mounts a private `/etc/hosts` that maps
`liquido.dynv6.net` to `127.0.0.1`, so requests hit Caddy on the same machine with the right Host/SNI.
The real `/etc/hosts` is never touched. (The public DNS record has gone stale before, when the FritzBox's
DDNS client missed an IP change.) This is a *local* check only — it proves nothing about reaching GISMO
from the internet; for that, run the suite from a machine outside GISMO's network.

```bash
./deploy/test-e2e-local.sh                                         # happy-case.cy.js
./deploy/test-e2e-local.sh tests/e2e/specs/polly-happy-case.cy.js  # one spec
./deploy/test-e2e-local.sh 'tests/e2e/specs/*.cy.js'               # all specs
```

**Why the script exports `DISPLAY`.** Cypress's own Electron shell needs an X display (or Xvfb) just to
launch, even for a "headless" run. GISMO has a desktop session at `:1`, so the script does
`export DISPLAY="${DISPLAY:-:1}"`. On a genuinely headless machine (a CI runner) there is no `:1`;
install Xvfb and run `npx cypress` directly — Cypress starts Xvfb itself when `DISPLAY` is unset.

**Negative cases that exist:** "cannot reach backend" (`login-tests.cy.js`, last test — `cy.intercept`
forces every GraphQL call to fail at the network level and asserts the warning modal from
`root-app.vue`'s `api.pingApi()`), and "device does not support passkeys" (`no-webauthn-support.cy.js`).

**Still to write:** a case where the device supports passkeys but registration fails because the
origin/domain is wrong; and a genuine Ranked Pairs **tie** on the winner page. The backend reports it via
`publishedTally.winnerIds` and `poll-winner.vue` renders an explanation, but no spec reaches that
state — it needs two voters who split 1:1 on one pair while both beating a third proposal. The algorithm
side is covered by `tests/unit/ranked-pairs.spec.js` and the backend's `PublishedTallyTest`.

### 6.6 The mock backend

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
else in the app knows it is talking to a mock, except the red LIQUIDO icon in the header. The mock goes
through the real `isAdmin()` and `jwt-util.js`, so it mints structurally real JWTs and must return data
of the same shape as the backend. Its `operations` list is **order-sensitive**: the first operation name
found anywhere in the query string wins.

**State** lives in the dev server process: one shared database for every tab and every spec, gone when
the server stops. `POST /mock/reset` (the red icon) empties it. **vitest** has no dev server; under
`config.test.js` the client calls `liquido-mock-domain.js` in-process.

**Why `localhost`:** the real backend accepts a passkey only from the origin in
`quarkus.webauthn.origins`. The mock has no such list — it takes the relying-party id from the
request's own `Host` header — so any host works, and `localhost` needs no `/etc/hosts` entry.

**WebAuthn in the mock** is a deliberately simple workaround: the mock serves a spec-valid challenge,
the browser (Chrome's virtual authenticator in e2e) runs the real client-side ceremony, and the result is
**not verified** — registration simply sets the user's `hasWebauthn`. Real passkeys still need a real
device and a real backend.

**Emails** are not sent. The password-reset and login-link tokens are kept in the mock's state (and
logged to the dev server's console); there is no route yet for a spec to read them, which is why the
password-reset round trip in `login-tests.cy.js` still needs a real backend.

**Extending the mock:** keep all mutable state in the single `mockState` object (seeded from
`src/mockdata/teamUserJwt.json`); change the logged-in user only through `loginMock(email)`; return polls
through `enrichPollForCurrentUser()` so derived flags like `userAlreadyVoted` stay right; register a new
GraphQL operation in `detectOperation()`; and reject with `rejectLiquido(code, message)` using a
`LiquidoExceptionCodes` constant.

**Not covered yet:** the fixed seed identities of §3 (see the failing cases in §1), and Polly, whose
mock (`src/polly/polly-client.mock.js`) still runs in the browser.

---

## 7. Manual testing & real devices

**Desktop browser (DEV).** Start both servers (§2.1), open `https://shadow.fritz.box:3001` in Safari,
Firefox or Chrome. Tip: the browser console output is mirrored in Vite's output (`server.forwardConsole`).

**WebAuthn on a real phone** needs:
* The frontend served on a real domain, not an IP — `shadow.fritz.box` via the FritzBox's DNS.
* The three WebAuthn settings in §2.5 agreeing, and the certificate listing that domain.
* A device that supports passkeys (iOS Safari with Face ID, Chrome on Android with fingerprint, or a
  desktop platform authenticator).

**Trusting the dev certificate on iOS:**
1. Find the mkcert root CA with `mkcert -CAROOT` and get `rootCA.pem` onto the phone (AirDrop, mail, download).
2. Install it: Settings → General → "Profile downloaded".
3. Enable full trust: Settings → General → About → Certificate Trust Settings.
4. Open `https://shadow.fritz.box:8443/graphql/schema.graphql` once in Safari, then the frontend.

**Remote console of Safari on iOS:** connect the device by cable and use Safari's Develop menu on the Mac
(https://dev.to/nimajafari/remote-debugging-using-safari-on-ios-devices-with-macos-16p5).
`mobile-debug-log.vue` offers an on-device log overlay (`config.showDebugLog`), but it redefines the
console methods, so you lose the original file and line of each log statement.

---

## 8. Regression after a deploy

Deploying to INT is always a human decision. After an approved deploy, run the **full** regression — not
just one spec:

```bash
# liquido-mobile-pwa-vue3
npx vitest run
./deploy/test-e2e-local.sh 'tests/e2e/specs/*.cy.js'

# liquido-backend-quarkus — additionally, if the backend was deployed
./mvnw test
```

In mode `deployed`, `finish-poll-from-ballot.cy.js` skips itself (it needs the mock seed), and the
specs that need the fixed-name seed teams (§3.3) only pass if `liquido-int` contains them.
