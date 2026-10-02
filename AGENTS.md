# AGENTS.md — LIQUIDO mobile PWA (Vue 3 frontend)

The main instructions for AI agents working in this repository (`CLAUDE.md` only imports this file;
`GEMINI.md` and `.github/instructions/` point here). Rules live here; explanations live in the docs this
file links to. Do not copy those docs into here.

## 1. What LIQUIDO is, and where to find what

LIQUIDO is an app for **teams to make decisions together, anonymously and fairly**. Members don't vote
for one option — they **rank** the proposals, and Ranked Pairs picks the option most people can live
with. **Ballots are anonymous, and provably so**: the backend never links a ballot to a user, yet every
voter can verify their own ballot was counted. Treat everything that touches the email address (the
voter's identity) with care.

| Topic | Document |
|---|---|
| What users can do, business rules, the screen flow | [docs/use-case-flows/liquido-use-cases.md](docs/use-case-flows/liquido-use-cases.md) |
| Frontend architecture: stack, bootstrap, config, routes, API client, caches, Polly | [docs/liquido-architecture.md](docs/liquido-architecture.md) |
| **All testing**: environments DEV/TEST/MOCK/INT, what to configure where, seed data, specs, mock backend | [docs/liquido-testing.md](docs/liquido-testing.md) |
| Setup, TLS, build and deploy of the frontend | [docs/README-tech.md](docs/README-tech.md) |
| The backend (sibling repo `../liquido-backend-quarkus`) — read before touching the API, schema or seed data | [AGENTS.md](../liquido-backend-quarkus/AGENTS.md), [architecture](../liquido-backend-quarkus/docs/liquido-architecture.md) |
| Ranked Pairs explained | [docs/ai/ranked-pair-voting-doc.md](docs/ai/ranked-pair-voting-doc.md) |

---

## 2. Agent workflow: branch, commit, push, merge, deploy (standing policy, 2026-10-02)

The same policy applies to both LIQUIDO repos.

- **Branch:** one feature branch per session, and all work happens on it — never directly on `main`.
  Before the first change, propose a branch name that says what the work is (`mock-mode`,
  `fix-winner-tie`) and ask Robert whether it is OK; create it only once he agrees, cut from a freshly
  fetched `origin/main` (`main` moves while you work — that's also how you notice a fix already landed).
- **A merged branch is finished.** Follow-up work starts a **new** branch from the freshly merged
  `main`; never stack new commits on merged history. Check first:
  `git fetch origin main && git log --oneline origin/main..HEAD`.
- **Commit: not after every prompt.** When a fix or a step of a feature is complete and verified (lint
  and tests clean), *suggest* a commit — say briefly what it would contain — and commit once Robert agrees.
  Unfinished work stays uncommitted.
- **Push: every commit, right away**, to the same branch (`git push -u origin <branch>`).
- **Merge: NEVER on your own**, including bringing `main` into the feature branch. Pull requests are
  Robert's to open unless he asks.
- **Merge conflicts: NEVER resolve on your own.** Don't pick a side, don't hand-edit conflict markers.
  Report which files conflict and what each side changed, then let Robert decide. Frontend commit `6718da6`
  (2026-09-10) resolved a dozen conflicts by taking one branch's version wholesale and silently deleted
  the `loadLiquidoConfig()` backend-config sync and `team-home.vue`'s direct-to-ballot shortcut.
- **Deploy: NEVER on your own. Always ask before running a deploy, every single time, no exceptions** —
  not even for an obviously small, already-tested change. Deploy scripts: `./deploy/build-and-deploy-local.sh`
  (frontend) and `sg docker -c "./deploy/deployToGismo-docker.sh"` (backend).
- **Always fine, never gated:** `npx vitest run`, `npx eslint …`, `./mvnw test`, and the e2e suite
  against whatever is *already* deployed (`./deploy/test-e2e-local.sh`).
- **After an approved deploy**, run the full regression automatically —
  [liquido-testing.md §8](docs/liquido-testing.md#8-regression-after-a-deploy).

## 3. Commands and environments

```bash
npm run dev            # DEV: Vite on https://shadow.fritz.box:3001 (needs config/config.development.js)
npm run dev:mock       # MOCK: the same on https://localhost:3002, with the mock backend
npm run build          # production bundle (config/config.production.js)
npm test               # vitest, once; `npm run test:unit` is watch mode
npm run test:e2e:mock  # MOCK e2e: starts its own dev server, runs all Cypress specs, stops it
npm run test:e2e       # DEV e2e (mode local)
npx eslint src tests --ext .vue,.js
```

The four environments — **DEV** (laptop, hot reload), **TEST** (backend `./mvnw test`), **MOCK**
(frontend without backend), **INT** (GISMO) — their URLs, config files and Cypress modes are in
[liquido-testing.md §2](docs/liquido-testing.md#2-environments-dev-test-mock-int). `LIQUIDO_API_URL` is
always the **API root**, never ending in `/graphql`.

**Where sessions run.** Agent sessions normally run **on GISMO**, the integration server (INT). GISMO
runs no dev servers and no mock e2e: verify there with vitest, eslint and — after an approved deploy —
`./deploy/test-e2e-local.sh`. Only in a session on the **developer laptop** are the two dev servers
(Vite on :3001, Quarkus on :8443) yours to manage: start the frontend via `preview_start {name: "liquido-pwa"}`
(`.claude/launch.json`), never a bare Bash dev server, and leave both running when a larger task is
finished so Robert can test immediately.

## 4. House style

Match the surrounding file. Broadly:

- **Hard tabs**, no semicolons, double quotes in `<script>`, single quotes in templates.
- **`<script setup>` Composition API is the target — prefer it for anything new.** Today 7 of 36 SFCs
  use it (`polls.vue`, `team-home.vue`, `welcome-chat-v2.vue`, `join-team-v2.vue`, `_design-overview.vue`,
  `liquido-proposal.vue`, `polly-vote.vue`). The others are Options API — that is legacy, not the house
  style; `poll-edit.vue` and `poll-card-edit.vue` are misses to migrate, not precedents. When *editing* an
  Options API file, match what is there — no wholesale rewrites as a side effect; a migration will be
  planned separately.
- **Imports keep the file extension** — `@/components/foo.vue`, `@/services/bar.js`. `@` is `src/`; a bare
  `config` resolves to `config/config.<name>.js` (`LIQUIDO_CONFIG` if set, else `NODE_ENV`).
- **kebab-case filenames**, PascalCase `name:` (they often don't match — fine, `vue/multi-word-component-names` is off).
- `.then()/.catch()` chains are preferred over `async/await` in views — except where a genuine
  sequential loop makes `await` clearer.
- Routed page components have a **single top-level root element**.
- Styling: Bootstrap 5 utility classes plus the LIQUIDO design tokens from `src/styles/liquido.css`
  (`--primary`, `--secondary`, `--unit`, `--two`, …) — no hard-coded colours or spacings.
- User feedback goes through the shared `$root` helpers `showSuccess` / `showError` / `showWarning` / `showInfo`.
- All backend access goes through `src/services/liquido-graphql-client.js` (Polly: `src/polly/polly-client.js`) —
  never call the backend directly from a component.
- On Windows PowerShell use `npm.cmd` / `npx.cmd` (the `npm` shim can be blocked by execution policy).
- Run `npx eslint src tests --ext .vue,.js` before finishing. It is **clean** — zero errors, zero
  warnings — so anything it reports is yours to fix. `tests/` is linted too (Cypress specs get
  `plugin:cypress/recommended`; `cypress/unsafe-to-chain-command` is off on purpose, see `.eslintrc.cjs`).

### i18n — liqui-loc

Our own library in `src/services/liqui-loc.js`; vue-i18n was removed. German is the only complete
locale; `en: {}` is normal ([english-translation-gaps.md](docs/english-translation-gaps.md) lists what's missing).

- Component-local messages stay in the `i18n: { messages: { en: {}, de: {…} } }` **component option**,
  not an `<i18n>` SFC block. liqui-loc reads them from `$options`.
- `$t` / `$tc` / `$d` / `$fromNow` are global properties (templates and Options API `this`). In
  `<script setup>` call `useLoc()` — it sees the component's own messages as well as the global ones.
- Never write `v-html="$t(…)"`. Messages containing HTML go through `<liqui-loc-html>`, which escapes each
  parameter, interpolates, then sanitises.
- A missing key logs a warning once and renders the key itself. Those warnings are real gaps — fix them.

## 5. Gotchas that have actually bitten

**Never show raw backend error messages to the user** — no `err.message`, no `liquidoException.msg`, no
stack traces: they leak internals and confuse users. Log the technical error to the console, then show a
fixed, **localised** string, e.g. `this.$root.showError(this.$t('errorUnexpected'), this.$t('Error'))`.
The global error boundary in `src/main.js` (`app.config.errorHandler`, `unhandledrejection`) already does this.

**`api.isAdmin()` is not reactive — call it from a method, never a `computed`.** It decodes the cached
JWT synchronously; a `computed` latches its first answer and never re-runs, but the answer changes on
`switchTeam` (a user can be admin of one team and member of the next). Every call site is a method or
plain function today (`polls.vue`, `poll-show.vue`, `cast-vote.vue`, `poll-edit.vue`, `welcome-chat-v2.vue`)
— keep it that way. It reads the JWT's `groups` claim, the same one the backend authorises on, but it is
**not** a security boundary: it decides what to *show*, the backend decides what is *allowed*.

**`@click` inside a `v-html` string does not bind.** It renders as an inert attribute. Clickable things
must be real template markup.

**Vue scoped styles rewrite `:root`** to `:root[data-v-x]`, which never matches `<html>`. Declare component
CSS variables on the component's own root element (see the comment in `poll-card.vue`).

**`poll-card.vue` has a fixed-height contract.** `--poll-card-height` and `--proposal-height` are pinned at
`10rem`, or its list transitions go jumpy; three call sites re-assert `height: 10rem`. That's why the
editable variant is a separate component (`poll-card-edit.vue`).

**Validation limits come from the backend.** `query liquidoConfig` is fetched at startup in `root-app.vue`
and merged over `config/config.common.js`, whose values are only **fallbacks** for an unreachable backend.
Change a rule in the backend's `LiquidoConfig`, not here (`proposalDescriptionMinLength` once drifted to
10 against the backend's 20). `avatarPath` is the exception: it points at files bundled with this PWA.

**`LiquidoExceptionCodes.js` is generated** by the backend's `LiquidoExceptionJsonGenerator`, and a backend
test fails if the copy drifts. Don't hand-edit it.

**`popup-modal.vue` derives its button ids from its own id** — `#confirmDeleteModalPrimaryButton`, not
`#modalPrimaryButton`. `root-app.vue` always mounts `#rootPopupModal`, so an unscoped selector grabs the wrong button.

**The mock backend is a real HTTP server, not a swapped-in client.** With `config.mockBackend` on, the
frontend makes exactly the calls it makes against Quarkus, and `vite-plugin-mock-backend.js` answers them
— which is what lets `cy.intercept()`/`cy.wait()` work unchanged. Do not reintroduce a client-side
shortcut (vitest is the one exception, in-process). It must return data of the same shape as the backend.
Details: [liquido-testing.md §6.6](docs/liquido-testing.md#66-the-mock-backend).

## 6. Routes — the rules

The authoritative route list is `src/services/router.js`; the table is in
[liquido-architecture.md §5](docs/liquido-architecture.md#5-routing--authentication-guard).

- **Order matters:** `/polls/new` is declared **before** `/polls/:pollId`, or the param route swallows it.
- **Adding a route?** Also add its name to the `page_order` map in `root-app.vue` (or the page-slide
  transition picks the wrong direction), and add the page to `_design-overview.vue`, the dev-only gallery
  of every screen — the fastest way for Robert to review a new page.
- There are **no role guards in the router**. `meta.public` is the only flag; admin-vs-member is decided
  per component via `api.isAdmin()`, and enforced by the backend.
- **`/polls/:pollId/add`** (`proposal-add.vue`, the old two-step flow) is deprecated and unlinked, but
  **deliberately kept and reachable by URL** as a fallback for the new editor. Do not delete it, keep it working.
- **Retired on purpose — do not restore:** `/polls/create` (`poll-create.vue`, replaced by the all-in-one
  editor `/polls/new`, commit `16ac374`) and `/joinTeam` (`join-team-v2.vue`, replaced by `welcome-chat-v2.vue`
  at `/welcome?inviteCode=`). Both `.vue` files are still in the repo, unused — ask before deleting them.

## 7. Testing — the hard rules

Full rules and reasons: [liquido-testing.md §6.4](docs/liquido-testing.md#64-writing-e2e-tests--the-rules).

- **NEVER assert on text displayed in the UI** — a hard rule from Robert. Use DOM ids or `data-*`
  attributes (`data-error-code` for error cases); add a `data-qa` hook if one is missing.
- **DOM ids are a public contract** — grep the specs before renaming one.
- **`should('be.visible')` does not scroll** — use `.scrollIntoView().should('be.visible')` below the fold.
- **Never edit source while Cypress is running.**
- **`happy-case.cy.js` stops at the first failure** — read the "Skipped:" count, not just "Passing:".
- Respect the fixture contract ([§3](docs/liquido-testing.md#3-test-data--fixtures)): vote only in polls
  your test created, keep mutations idempotent, never mutate another spec's fixed-name team.
- The mock e2e run has a documented set of known failures (§1 of the testing doc); anything beyond that list is real.

## 8. Product rules — do not "fix" these

Explained in [liquido-use-cases.md](docs/use-case-flows/liquido-use-cases.md); the backend enforces them,
the frontend only decides what to show.

- Poll statuses are exactly **`ELABORATION` → `VOTING` → `FINISHED`**. There is no `NEW`.
- **An admin may delete any proposal but edit only their own** — a removal is visible to its author, a
  silent edit is not. Do not add an admin override.
- `membersCanAddProposals` is chosen at poll creation and cannot be changed afterwards.
- Once voting starts, proposals are frozen. A cast vote is final.
- A Polly ballot is *pseudonymous* (private among friends), a team poll ballot is *anonymous* — keep that
  difference visible in the UI. Nothing under `src/polly/` imports `liquido-graphql-client.js`, and vice versa.
