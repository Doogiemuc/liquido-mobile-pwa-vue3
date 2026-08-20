# CLAUDE.md

Guidance for Claude Code when working in the LIQUIDO mobile PWA (Vue 3 frontend).

For the technical overview — tech stack, bootstrap sequence, cache design, build and deploy —
read **[doc/liquido-architecture.md](doc/liquido-architecture.md)** first. This file does not repeat
it. What follows is what that document does not tell you: what LIQUIDO is *for*, and the things in
this codebase that will cost you an hour if you learn them the hard way.

> ⚠️ The architecture doc's **route table and poll-lifecycle section have drifted**. The authoritative
> route list is `src/services/router.js`; the current one is reproduced below. There is no separate
> `NEW` poll status — a poll starts in `ELABORATION`.

---

## 1. What LIQUIDO actually does

LIQUIDO is an app for **teams to make decisions together, anonymously and fairly**. It is not a
survey tool. Two ideas drive every design decision in here:

**You do not vote for one option — you rank them.** A voter drags the proposals they support into a
personal order of preference and simply leaves out the ones they don't. Counting is by
[Ranked Pairs](doc/ai/ranked-pair-voting-doc.md): every proposal is compared against every other,
and the winner is the one that beats each rival in a head-to-head majority. The practical effect,
and the reason the product exists: the option **most people can live with** wins, even when two loud
camps would otherwise deadlock.

**Ballots are anonymous, and provably so.** The backend never links a ballot to a user. It stores a
`RightToVote` derived from `sha3_256(email + serverSalt)`, and the ballot is FK'd only to that hash.
A voter gets a checksum back and can verify their own ballot was counted, without anyone being able
to work backwards to who they are. This is why the email address is treated as voter identity, and
why anything touching it deserves care.

### The lifecycle, in human terms

```
  Team                Poll                                       Vote
  ────                ────                                       ────
  Admin creates   →   Admin creates a poll with its first    →   Admin starts the voting phase
  a team              two proposals (a choice needs two)         (proposals freeze — nobody may
     ↓                        ↓                                   add or edit any more)
  Members join    →   Members add their own proposals            ↓
  via invite code     (only if the admin allowed it) and     →   Each member ranks the proposals
                      "like" the ones they support               and casts one anonymous ballot
                                                                  ↓
                                                             Admin finishes the phase →
                                                             Ranked Pairs computes the winner
```

Poll statuses are exactly three: **`ELABORATION`** (collecting and debating proposals),
**`VOTING`** (ballots being cast), **`FINISHED`** (winner known).

### Who may do what — and why it is asymmetric

Everything below is enforced by the backend; the frontend only decides what to *show*.

| While in `ELABORATION` | Admin | Member |
|---|---|---|
| Rename the poll | ✅ | ❌ |
| Add a proposal | ✅ always | only if `poll.membersCanAddProposals` |
| Edit a proposal | **own only** | **own only** |
| Delete a proposal | ✅ any | ❌ |

The asymmetry on the middle two rows is deliberate, not an oversight: **an admin may take a proposal
off the ballot, but may not rewrite what somebody else wrote.** A removal is visible to its author; a
silent edit is not. Do not "fix" this by adding an admin override.

`membersCanAddProposals` is chosen when the poll is created and is **not changeable afterwards** —
the backend has no mutation for it. Once voting starts, everything freezes.

---

## 2. The Happy Case, step by step

`tests/e2e/specs/happy-case.cy.js` is **Robert's primary regression test**. It is one sequential
flow — `testIsolation: false`, and an `afterEach` aborts the whole run on the first failure — that
walks a brand new team through the entire product, using only the UI, against the real backend.

Read it as documentation of the intended user journey:

1. **The PWA loads.** Sanity check that the app is served at all.
2. **An admin creates a team.** Nickname → "create team" → team name, email, password. Registers a
   passkey (WebAuthn), gets a welcome mail, and receives a JWT.
3. **The admin returns and is logged in automatically** from the JWT in `localStorage`, and sees the
   admin-only section plus the reminder that their email is not confirmed yet.
4. **The admin creates a poll with its first two proposals on one page** — title, two proposals with
   descriptions, an icon picked from the FontAwesome grid, and the "members may add proposals"
   checkbox ticked. A poll needs two alternatives to be a choice at all, so the editor starts with
   two rows.
5. **The admin adds a third proposal and deletes it again**, proving admin delete works and survives
   a reload.
6. **A member joins the team** with the invite code, registers their own passkey, and lands on the
   team page. They can see the poll but cannot start the vote.
7. **The member browses the poll** and sees the admin's two proposals.
8. **The member adds their own proposal** in the same editor — the poll title is read-only for them,
   the admin's proposals are read-only, and there is exactly one empty row for theirs.
9. **The member edits their own proposal, and only their own.** The pencil appears on their row and
   on no other.
10. **A second poll, created with the checkbox left off, is admin-only.** The member sees an
    explanation instead of an input, even if they reach the editor by URL.
11. **The member likes a proposal.** Like counts go from 0 to 1.
12. **The admin starts the voting phase**, confirms the warning, and shortens the runtime to 3 days.
    The test asserts the chosen duration actually reached the backend.
13. **The member casts a vote** — drags a proposal into the ballot, confirms, and then *verifies
    their ballot's checksum*, which is the anonymity guarantee in action.
14. **The admin finishes the voting phase.** The poll becomes `FINISHED` and a winner is highlighted.
15. **The winner page shows the winning proposal.**

**One trap with this spec:**

**A failure hides everything after it.** The `afterEach` calls `Cypress.runner.stop()`, so if step 9
fails, steps 10–15 are *skipped* — not passed. Always read the "Skipped:" count, not just
"Passing:". Steps 12 and 13 (start voting, cast vote) had silently never executed for a long time
because of a failure back at step 10.

The fail-fast itself is deliberate and correct: the steps build on each other, so once one breaks the
rest would fail anyway. The exit code **is** trustworthy — a failing run exits `1`, verified with a
probe spec. (An earlier version of this file claimed it exits `0`; that was wrong, and came from
misreading a shell pipeline's exit status rather than Cypress's.)

---

## 3. Testing rules

**NEVER assert on text displayed in the UI.** This is a hard rule from Robert. A translated or
reworded UI must not break the suite.

- Assert on **DOM ids** (`#createPollButton`), or on **`data-*` attributes** where an id does not fit
  (`[data-poll-id]`, `[data-proposal-id]`, `[data-row-state]`, `[data-member-name]`,
  `[data-poll-status]`).
- Need to distinguish error cases? Put the code in the DOM — error elements carry
  `:data-error-code="…"` (the backend's `liquidoErrorCode`) — and assert on that, not on the message.
- If the hook you need does not exist, **add `data-qa="someId"` to the component** rather than
  reaching for the text.
- The only acceptable text assertions are on **data the test itself entered** (a poll title it typed),
  and even then prefer an id.

**DOM ids are a public contract.** They are camelCase (`#pollTitleInput`), page-title anchors are
kebab-case (`#poll-show`, `#poll-edit`). Renaming one breaks e2e — grep the spec first.

**`should('be.visible')` does not scroll.** Cypress only auto-scrolls for *actions*. On the 375×667
mobile viewport a poll card with a few proposals is taller than the screen, so anything below it
needs `.scrollIntoView().should('be.visible')`. This is not a weaker assertion — a genuinely hidden
element still fails.

**Never edit source while Cypress is running.** Vite HMR (or a Quarkus hot reload) mid-run produces
failures that look real and are not.

---

## 4. House style

Match the surrounding file. Broadly:

- **Hard tabs**, no semicolons, double quotes in `<script>`, single quotes in templates.
- **`<script setup>` Composition API is the target — prefer it for anything new.** It is more modern
  and more capable, and the app is migrating to it mid-term (a full migration will be planned
  separately). Today 6 of 32 SFCs use it: `polls.vue`, `team-home.vue`, `join-team-v2.vue`,
  `_design-overview.vue`, `liquido-proposal.vue`, `Polly-vote.vue`.
  The other 26 are still Options API — **that is legacy, not the house style.** `poll-edit.vue` and
  `poll-card-edit.vue` were written in Options API; treat that as a miss to be migrated, not a
  precedent to copy.
  When *editing* an existing Options API file, match what is there — do not rewrite it wholesale as a
  side effect of an unrelated change. Leave that to the planned migration.
- **Imports keep the file extension** — `@/components/foo.vue`, `@/services/bar.js`. The `@` alias is
  `src/`, and a bare `config` resolves to `config/config.<MODE>.js`.
- **kebab-case filenames**, PascalCase `name:` (they often do not match — that is fine,
  `vue/multi-word-component-names` is off).
- `.then()/.catch()` chains are preferred over `async/await` in views — except where a genuine
  sequential loop makes `await` clearer.
- Run `npx eslint src --ext .vue,.js` before finishing. Two pre-existing errors are expected
  (`liquido-graphql-client.mock.js` no-useless-escape, `team-home.vue` unused `inviteMembers`).

### i18n

Legacy vue-i18n mode. German is the only complete locale; `en: {}` is normal.

- Component-local messages go in the `i18n: { messages: { en: {}, de: {…} } }` **component option**,
  not an `<i18n>` SFC block (no custom-block plugin is configured).
- **`$t` is not callable in `<script setup>`** with this setup — `useI18n()` returns the *global*
  composer and cannot see component-local keys. `Polly-vote.vue` hand-rolled a `loc()` helper to work
  around this; do not copy that.
  **This is the main thing standing between the app and a full `<script setup>` migration**, and it is
  a vue-i18n configuration problem, not a reason to keep writing Options API. Until it is resolved,
  a new `<script setup>` component that needs its own strings can put them in the global catalogue in
  `main.js` (which `useI18n()` *can* see) rather than falling back to Options API.
- See `doc/ai/i18n-usage-notes.md`, and `doc/ai/AI-plan migrate to i18n v12.md` for the planned fix.

---

## 5. Gotchas that have actually bitten

**`api.isAdmin()` is not reactive — use a method, not a `computed`.** It reads the cached JWT
synchronously and decodes it (`jwtHasRole(teamCache.getSync(JWT_KEY), LIQUIDO_ADMIN_ROLE)`). Nothing
in that chain is reactive, so a Vue `computed` wrapping it latches whatever it saw on its first
evaluation and never re-runs.

No component is known to be broken by this today: the router guard awaits `tryToAuthenticate()`
before any route resolves, so the cache is warm by first render, and the answer only *changes* on a
`switchTeam` — which happens on `team-home.vue`, where it is correctly held in a ref and refreshed.
`poll-show.vue:241` and `polls.vue:209` do still wrap it in a `computed`; they get away with it only
because navigating back to them remounts the component. Treat that as fragile, not as the pattern to
copy.

**What it reads:** the JWT's `groups` claim, via `jwt-util.js` — the same claim
`JwtTokenUtils.isAdmin()` authorises on in the backend, so the two agree by construction. The backend
re-mints the token on every login *and* every `switchTeam`, so the answer is correct **per team** (a
user can be admin of one team and a plain member of the next). It is **not** a security boundary: the
browser cannot verify a signature, so this decides what to *show* and the backend decides what is
*allowed*.

**`@click` inside a `v-html` string does not bind.** Vue renders it as an inert attribute and it
silently does nothing. Clickable things must be real template markup.

**Vue scoped styles rewrite `:root`** to `:root[data-v-x]`, which never matches `<html>`. Component
CSS variables must be declared on the component's own root element — see the comment in
`poll-card.vue`.

**`poll-card.vue` has a fixed-height contract.** `--poll-card-height` and `--proposal-height` are
pinned at `10rem` because its list transitions go jumpy otherwise, and three call sites re-assert
`height: 10rem` on their wrappers. That is why the editable variant is a separate component
(`poll-card-edit.vue`) rather than a mode of it.

**Validation limits come from the backend.** `query liquidoConfig` is fetched at startup in
`root-app.vue` and merged over `config/config.common.js`. Those local values are **fallbacks for an
unreachable backend**, not the truth — change the rule in the backend's `LiquidoConfig`, or the two
drift and the server rejects what the client accepted. (`proposalDescriptionMinLength` had already
drifted to 10 against the backend's `@Size(min = 20)`.) `avatarPath` is the exception: it points at
files bundled with this PWA, so it stays local.

**`LiquidoExceptionCodes.js` is generated**, not hand-written. It comes from the backend's
`LiquidoExceptionJsonGenerator` and a backend test fails the build if the copy drifts.

**`popup-modal.vue` derives its button ids from its own id** — `#confirmDeleteModalPrimaryButton`,
not `#modalPrimaryButton`. `root-app.vue` always mounts `#rootPopupModal`, so an unscoped selector
grabs the wrong button.

**The mock backend shares code with the real client.** `config.mockBackend` swaps in
`liquido-graphql-client.mock.js`, but it *decorates* the real `graphQlApi` — it does not replace
`isAdmin()` or `jwt-util.js`. If you change how the client reads something, the mock must produce
data of the same shape (it mints structurally real JWTs for exactly this reason). Its `operations`
list is **order-sensitive**: the first name found anywhere in the query string wins.

---

## 6. Routes

Order matters: `/polls/create` and `/polls/new` are declared **before** `/polls/:pollId`, or the param
route swallows them.

| Path | Name | Public | Notes |
|---|---|---|---|
| `/login` `/welcome` `/joinTeam` | | ✅ | registration + login |
| `/forgotPassword` `/resetPassword` | | ✅ | |
| `/verifyEmail` | verifyEmail | ✅ | opened from a mail, `?verifyToken=` |
| `/team` | team | 🔒 | team home |
| `/userhome` | userhome | 🔒 | |
| `/polls` | polls | 🔒 | list |
| `/polls/new` | newPoll | 🔒 | **the all-in-one poll editor** |
| `/polls/:pollId/edit` | editPoll | 🔒 | same editor, existing poll |
| `/polls/:pollId` | showPoll | 🔒 | read-only poll |
| `/polls/:pollId/castVote` | castVote | 🔒 | rank + submit ballot |
| `/polls/:pollId/winner` | pollWinner | 🔒 | |
| `/polly/create` | createPolly | ✅ | separate, simpler poll type |
| `/devLogin` `/_design-overview` | | | **development mode only** |

`/polls/create` (`poll-create.vue`) and `/polls/:pollId/add` (`proposal-add.vue`) are the **old**
two-step flow, now **deprecated**. Nothing links to them any more — `polls.vue` and `poll-show.vue`
point at the editor — but they are **deliberately kept and reachable by URL** while the new editor is
still being exercised, and will be removed in a future release. **Do not delete them**, and keep them
working: they are the fallback if the editor turns out to have a problem.

**Adding a route?** Also add its name to the `page_order` map in `root-app.vue`, or the page-slide
transition picks the wrong direction. And add the page to `_design-overview.vue`, a dev-only gallery
of every screen — it is the fastest way for Robert to review a new page.

There are **no role guards in the router**. `meta.public` is the only flag; admin-vs-member is
enforced per-component via `api.isAdmin()`, and properly by the backend.

---

## 7. Commands

```bash
npm run dev            # Vite dev server, HTTPS on :3001 (mkcert certs in tls-certs/)
npm run build          # production bundle
npx vitest run         # unit tests
npx eslint src --ext .vue,.js
npx cypress run --e2e --spec tests/e2e/specs/happy-case.cy.js
```

**Both dev servers are Claude's to manage** — Vite on `https://localhost:3001` and the Quarkus
backend on `https://localhost:8443`. Start the frontend via `preview_start {name: "liquido-pwa"}`,
never a bare Bash dev server. **Leave both running when a larger task is finished** so Robert can
test immediately.

The e2e suite runs against the **real backend and the real `LIQUIDO-DEV` database** — every run
leaves a team behind. `config.development.js` can flip `mockBackend: true` for a backend-free run
(remember to restore it).

The backend lives in the sibling repo `../liquido-backend-quarkus` and has its own `CLAUDE.md` and a
detailed `AGENTS.md` — read those before touching the API, the schema or the seed data.
