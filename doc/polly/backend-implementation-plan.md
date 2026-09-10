# Polly — Quarkus backend implementation plan

> **For a fresh chat.** This document is self-contained: it carries the finished frontend
> contract, the decisions already taken (and why), and the traps we already fell into.
> The frontend is **done and green**; the backend is the only missing half.

---

## 1. What a Polly is

LIQUIDO already has team polls: an admin, members, and genuinely anonymous ranked voting
protected by voterTokens. A **Polly** is the opposite end of that spectrum — simple, fun,
cute. Same clever idea (you *sort* the options instead of picking one), none of the ceremony:

- **No team, no account, no login screen.** Identity is a passkey, nothing else.
- **One link.** `/polly/:publicId`. Whoever opens it is recognised by their own passkey, so
  the creator sees Edit/Finish and everybody else gets a ballot. No admin link, nothing
  secret in the URL.
- **No email anywhere.** The passkey is both the login and the bookmark (`myPollys`).
- **Two states.** `VOTING → FINISHED`. A polly is live the instant it is created — there is
  no elaboration phase and no start step.

Flow diagram: `doc/use-case-flows/polly.mermaid`.

---

## 2. Decisions already taken — please do not re-litigate

| Decision | Why |
|---|---|
| **Own tables** (`polly`, `polly_proposal`, `polly_ballot`) — *not* the existing `Poll` table | We tried sharing. It needed a nullable `team_id`, an `isPolly` discriminator, a cache filter and two authorization regimes on one row — and a polly still leaked into a team's poll list. See §7. |
| **Own endpoints** — *not* reusing `castVote` / `voterToken` | Once voterTokens are gone (below) there is nothing left to share at the transport level. |
| **Share exactly one thing: Ranked Pairs** | It is the one genuinely valuable, hard-to-duplicate piece of logic. Everything else is thin plumbing. |
| **No voterTokens.** A passkey identifies the voter | voterTokens exist so a LIQUIDO poll ballot is *truly* unlinkable — a paranoid voter can cast via cURL from anywhere. A polly does not need that. |
| **Ballots are pseudonymous, deliberately** | The server *can* link a passkey to its ballot. Right trade for "where shall we go for dinner", wrong one for a real election. The UI already says so in both languages. |
| **Opaque `public_id`, never the PK** | With a sequential id the share link is the only access control, and `/polly/1,2,3…` would enumerate every polly's title, options and results. |

### The "huge duplication" worry, sized honestly

What a team poll carries that a polly does **not**: proposal descriptions, icons, supporter
counts and likes, proxies and delegation, checksums, duel matrices, team membership,
voterTokens.

What is actually duplicated: `id, title, status, ordered option titles, ballots` plus six
thin resolvers. That is plumbing, not logic — and the polly version is far smaller than the
poll version.

---

## 3. Data model

```
polly            id, public_id, title, status, owner_key, created_at,
                 voting_end_at, winner_proposal_id
polly_proposal   id, polly_id, title, sort_order
polly_ballot     id, polly_id, voter_key, vote_order, created_at
                 UNIQUE (polly_id, voter_key)   <-- one vote per passkey, enforced by the DB
```

`status ∈ {VOTING, FINISHED}`. Nothing else.

Two key derivations from the WebAuthn credential id:

- `owner_key = HMAC(serverSecret, credentialId)` — stable per credential. Ownership + `myPollys`.
- `voter_key = HMAC(serverSecret, credentialId ‖ pollyId)` — per polly. Backs the unique
  constraint, and means the same person is unlinkable *across* different pollys.

Never store the raw credential id on a ballot. With the HMAC, a stolen database alone cannot
link voters to ballots (the server still can — that is the accepted trade).

`public_id`: ~10 chars base58, indexed, unique.

**Put the one-vote rule in the database constraint, not in application logic.** It is the
single most important invariant of the product and it should not depend on remembering a
check in some code path.

---

## 4. The contract the frontend already calls

This is implemented and tested against a mock. Match it exactly, or change both sides
together. Source of truth: `src/polly/polly-client.js`.

### Returned shape (every operation returns this)

```graphql
{
  publicId title status createdAt votingEndAt
  numBallots            # vote count, shown to the owner
  isOwner               # drives the Edit/Finish buttons
  alreadyVoted          # drives the ballot vs "you already voted"
  proposals { id title }
  winner { id title }   # null until FINISHED
}
```

`isOwner` and `alreadyVoted` are **per caller** — computed from the session, `false` when
there is no session.

### Operations

| Operation | Signature | Auth | Rules |
|---|---|---|---|
| `createPolly` | `(title: String!, proposalTitles: [String!]!)` | passkey | Creates it **already in VOTING**. Caller becomes owner. Needs a title and ≥2 options. |
| `polly` | `(publicId: String!)` | **optional** | Public read — the link must work before any passkey tap. |
| `editPolly` | `(publicId: String!, title: String!, proposalTitles: [String!]!)` | owner | Only while `numBallots == 0`. |
| `voteInPolly` | `(publicId: String!, voteOrder: [ID!]!)` | passkey | `voteOrder` = proposal ids, favourite first. Rejects a duplicate `voter_key`. |
| `finishPolly` | `(publicId: String!)` | owner | Runs Ranked Pairs, stores the winner, sets FINISHED. |
| `myPollys` | `()` | passkey | Everything this `owner_key` created. Replaces the "email me my link" step. |

### Error contract

GraphQL returns HTTP 200; the client reads `errors[0].extensions.pollyErrorCode`:

```
POLLY_NOT_FOUND · ALREADY_VOTED · NOT_POLLY_OWNER
POLLY_ALREADY_STARTED · POLLY_FINISHED · NEED_PASSKEY · INVALID_POLLY
```

These are **strings in their own namespace** — deliberately *not* the numeric
`LiquidoException` codes. `src/services/LiquidoExceptionCodes.js` is untouched.

### REST — passkey ceremony

Four endpoints, callable with no session. All use `withCredentials: true` (the challenge
cookie must travel back).

| Endpoint | Notes |
|---|---|
| `GET  /polly/webauthn/register-options-challenge` | **`residentKey: "required"`** — a discoverable credential is what makes usernameless return visits work. No email, no username. |
| `POST /polly/webauthn/register` | Body = attestation. Returns `{ jwt }`. |
| `GET  /polly/webauthn/login-options-challenge` | **Empty `allowCredentials`** — the browser offers whatever passkey it holds for the domain. This is what lets the share link carry no secret. |
| `POST /polly/webauthn/login` | Body = assertion. Returns `{ jwt }`. |

The JWT is polly-scoped, **~30 days** (one tap on first use, zero taps afterwards). The
frontend stores it under `LIQUIDO_POLLY_JWT` — a *different* key from the team's
`LIQUIDO_JWT`, on purpose. Reuse the existing relying-party config and `@simplewebauthn`
server side, but expose separate endpoints: the current `/webauthn/*` ones assume a
logged-in team member, which a polly voter never is.

---

## 5. The one shared thing

Extract Tideman Ranked Pairs into a pure function with no entity coupling:

```java
RankedPairs.determineWinner(List<List<ProposalId>> ballots) -> ProposalId
```

Both `finishVotingPhase` (team polls) and `finishPolly` call it. Winning-votes vs margin is
discussed in `doc/ai/ranked-pair-voting-doc.md` — whichever variant you pick must live in
this one function, so a fix reaches both products.

This extraction is the only change to existing backend code. Everything else is additive.

---

## 6. Suggested order

1. Extract `RankedPairs` from the current poll code; keep team polls green.
2. Tables + entities + the `owner_key` / `voter_key` HMAC helper.
3. The four `/polly/webauthn/*` endpoints and the polly JWT.
4. The six GraphQL operations.
5. Point the frontend at it (§8) and walk the real flow.

---

## 7. Traps we already hit — worth knowing

- **Sharing the `Poll` table leaked.** A polly created anonymously appeared in a team's poll
  list after login, because the login payload seeds the frontend's poll cache from
  `team.polls`. Two separate code paths had the same hole. Separate tables make the whole
  class of bug impossible — that is why we reversed course.
- **Enforce one-vote at the DB level.** Our first design checked it when *issuing a token*,
  which locked out anyone who opened the page and wandered off without voting. Key the rule
  on the **ballot**, not on any earlier step.
- **A polly must be readable with no session.** Do not demand a passkey just to look at one;
  the friend has not decided to vote yet.
- **`numBallots`, `isOwner`, `alreadyVoted` are per-caller.** Returning a cached
  polly-shaped object without recomputing these for the current session will show the wrong
  buttons to the wrong people.

---

## 8. How to verify against the real frontend

The frontend runs against its mock today. To point it at Quarkus:

```js
// config/config.development.js
mockBackend: false,      // use the real backend
mockPasskey: false,      // do the real WebAuthn ceremony
```

Then:

```bash
NODE_ENV=development npm run dev          # https://localhost:3001
NODE_ENV=development npx vitest run       # 28 unit tests (25 polly, mock-only)
NODE_ENV=development npx cypress run --e2e --spec tests/e2e/specs/polly.cy.js
NODE_ENV=development npx cypress run --e2e --spec tests/e2e/specs/happy-case.cy.js
```

- `tests/e2e/specs/polly.cy.js` (10 tests) drives the real UI: create → live immediately →
  share link → drag to sort → vote → already-voted → finish → winner.
- `happy-case.cy.js` (12 tests) is the team-flow regression — it must stay green.
- **WebAuthn needs a real hostname, not an IP**, and the frontend origin must be in
  `quarkus.webauthn.origins` including scheme, host and port. Test the passkey legs on real
  hardware; a headless browser cannot drive an authenticator (which is what `mockPasskey`
  exists for).

Worth covering server-side: two credentials voting in the same polly, the same credential
twice (must hit the unique constraint), a non-owner attempting `editPolly` / `finishPolly`,
editing after the first ballot, and that `public_id` values are not sequential.

---

## 9. Frontend files worth reading first

| File | Why |
|---|---|
| `src/polly/polly-client.js` | The exact queries, variables and expected fields |
| `src/polly/polly-constants.js` | Error codes and statuses |
| `src/polly/polly-passkey.js` | The ceremony the REST endpoints must satisfy |
| `src/polly/polly-client.mock.js` | A **working reference implementation** of every rule — ownership, the one-vote constraint, winner calculation |
| `tests/unit/polly-flow.spec.js` | 25 tests describing the intended behaviour |
| `doc/liquido-architecture.md` §8b | Polly vs LIQUIDO poll, side by side |

`polly-client.mock.js` is the fastest way to see the intended semantics — it is small and
every rule in it is one the backend now needs to enforce for real.

---

## 10. Deferred, not forgotten

- **Polly admin → real LIQUIDO team.** Nothing here blocks it: when a polly owner registers
  a team, attach their existing credential to the new `UserEntity` and re-point their pollys
  by `owner_key`.
- **Garbage collection.** Pollys and their ballots should expire; decide a retention window.
- **Multi-device.** Synced passkeys (iCloud / Google) give one credential across a person's
  devices, which is what makes "one vote per passkey" hold. An unsynced authenticator per
  device means two credentials and two votes. Probably a line of UI copy rather than
  engineering, but worth a decision.
- **No WebAuthn at all** (older or locked-down browsers) locks a friend out entirely. The UI
  shows a clear message; decide whether a fallback is ever wanted.
