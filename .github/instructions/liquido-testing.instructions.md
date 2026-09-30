---
applyTo: '**/*.{js,ts,vue,cy.js}'
description: 'LIQUIDO Cypress E2E testing workflow, prerequisites, and verification conventions'
---

# LIQUIDO — Testing guide

Testing is a core part of LIQUIDO development. The frontend is a privacy-sensitive mobile PWA, so automated end-to-end coverage must be treated as a first-class part of the delivery workflow.

The full, authoritative guide is `docs/liquido-testing.md`; the testing rules are in `CLAUDE.md` §3. This file is the short version. When they disagree, those two win.

## 1. Quick start — no backend needed

From a fresh clone, with Node 22.12+ or 24:

```bash
npm install
npm test                 # unit tests (vitest)
npm run test:e2e:mock    # starts a mock dev server on https://localhost:3002, runs every Cypress spec, stops it
npm run test:all         # both
```

No config file, backend, database or `/etc/hosts` entry is needed: `config/config.test.js`, `config/config.mock.js` and the dev TLS certificates in `tls-certs/` are checked in. On a Linux machine without a desktop, install Xvfb; Cypress starts it on its own.

The mock run is **not fully green yet** — a few specs need the backend's fixed seed identities, which the mock does not have. `docs/liquido-testing.md` §0 lists exactly which cases fail and the expected result. Anything beyond that list is a real failure.

One spec, or interactively:

```bash
npm run dev:mock                                                                     # terminal 1
LIQUIDO_E2E_MODE=mock npx cypress run --e2e --spec tests/e2e/specs/happy-case.cy.js  # terminal 2
LIQUIDO_E2E_MODE=mock npx cypress open --e2e
```

## 2. The four e2e modes

`LIQUIDO_E2E_MODE` picks which frontend the browser opens and which backend that frontend talks to. The table lives at the top of `tests/cypress-base-config.js`:

| mode | frontend | backend | script |
|---|---|---|---|
| `local` (default) | `https://shadow.fritz.box:3001` | `https://shadow.fritz.box:8443` | `npm run test:e2e` |
| `mock` | `https://localhost:3002` | none — the mock dev server | `npm run test:e2e:mock` |
| `remote-backend` | `https://shadow.fritz.box:3001` | `liquido.dynv6.net` | `npm run test:e2e:remote-backend` |
| `deployed` | `liquido.dynv6.net` | `liquido.dynv6.net` | `npm run test:e2e:deployed` |

- `local` and `remote-backend` need `config/config.development.js` (gitignored — copy `config.development.js.example`) set to match, and the dev server restarted. A mismatch between the mode and that file **aborts the run** on purpose.
- The local frontend must be opened as `shadow.fritz.box`, not `localhost`: the real backend accepts passkeys only from that exact origin. Mock mode has no such check, which is why it can use `localhost`.
- `local`, `remote-backend` and `deployed` create real teams, polls and ballots. Never point them at an instance with real users.

Configuration files:
- `cypress.config.js` → the mode from `LIQUIDO_E2E_MODE`
- `cypress.config.remote.js` → pins the `deployed` mode (`CYPRESS_REMOTE_URL` aims it elsewhere)
- `tests/cypress-base-config.js` → the mode table, viewport, and the values below

## 3. Test values

- Secrets live in `env` and are read with `cy.env([...])`: `passwordSuffix`, `devLoginToken`, `testPasswordResetToken`. The last two must match the backend's dev profile.
- Public values live in `expose` and are read with `Cypress.expose(...)`: `mode`, `LIQUIDO_API`, and the fixed seed identities (`teamName`, `admin`, `multiTeam`).
- Never commit a real credential to `tests/cypress-base-config.js`. The Mailtrap API token is read from the `MAILTRAP_API_TOKEN` environment variable.
- The viewport is mobile: `375 × 667`.

## 4. Rules for writing specs

- **Never assert on text displayed in the UI.** A translated or reworded UI must not break the suite. Assert on DOM ids (`#createPollButton`) or `data-*` attributes (`[data-poll-id]`, `[data-row-state]`, …). Error cases carry `data-error-code` — assert on that, not on the message. If no hook exists, add `data-qa="…"` to the component. The only acceptable text assertions are on data the test itself typed.
- **DOM ids are a public contract.** Renaming one breaks e2e — grep the specs first.
- **`should('be.visible')` does not scroll.** On the small viewport, use `.scrollIntoView().should('be.visible')` for anything below the fold.
- **Never edit source while Cypress is running** — Vite HMR mid-run produces failures that look real and are not.
- **The same spec source must work against the mock and the real backend.** A `cy.request()` straight to the backend must be guarded: `if (!Cypress.expose("LIQUIDO_API")) this.skip()` — it is `null` in mock mode.
- `happy-case.cy.js` is one sequential flow that stops on the first failure. The steps after a failure are reported as *skipped*, not failed — always read the "Skipped:" count.
- `tests/e2e/support/commands.js` is **not loaded** (`supportFile: false`), so its `cy.devLogin()` is not available in specs.

## 5. The mock backend

- It is a real HTTP server: `vite-plugin-mock-backend.js` answers the frontend's requests inside the Vite dev server, from `mock-backend/`. That is why `cy.intercept()` / `cy.wait()` work unchanged against it. Do not reintroduce a client-side shortcut.
- Its state lives in the **dev server process**, shared by every tab and spec. For a fresh database, restart the dev server or `POST /mock/reset` (the red LIQUIDO icon in the header does that).
- Its state is **not** in `sessionStorage` any more. The `sessionStorage.removeItem("LIQUIDO_MOCK_STATE")` still in `happy-case.cy.js` has no effect — do not copy it into new specs.
- WebAuthn: the mock serves a valid challenge, so the CDP virtual authenticator in the spec runs a real client-side ceremony; the mock does not verify the result. Real passkeys still need a real device and a real backend.
- The Polly mock (`src/polly/polly-client.mock.js`) is not part of this yet and still runs in the browser.

## 6. Manual testing with a real backend

- Frontend and backend must both be served over HTTPS with trusted certificates whose SANs cover every host name used.
- For WebAuthn, the frontend must be reached via a real domain name (currently `shadow.fritz.box`), and the backend's `quarkus.webauthn.origins` must list it with schema, host and port.
- Start the backend with `./mvnw quarkus:dev`, the frontend with `npm run dev`, and open the backend's `/graphql/schema.graphql` once so the browser trusts its certificate.
- iOS Safari: open every URL once to trust the certificates; remote-debug over a cable from Safari on macOS.

Details: `docs/liquido-testing.md` §1–2.

## 7. Coverage

Negative cases that exist:
- backend unreachable — `login-tests.cy.js`
- device without WebAuthn support — `no-webauthn-support.cy.js`

Still missing:
- passkey supported, but registration fails because the origin/domain is wrong
- a Ranked Pairs tie on the winner page (`docs/liquido-testing.md` §4.5)

When a change touches polls or voting, run `happy-case.cy.js` and the relevant negative case.

## 8. Quick checklist

- [ ] `npm test` passes.
- [ ] `npm run test:e2e:mock` shows no failures beyond the known list in `docs/liquido-testing.md` §0.
- [ ] For a run against a real backend: the mode matches `config/config.development.js`, and the dev server was restarted after changing it.
- [ ] New assertions use ids or `data-*` attributes, never UI text.
- [ ] Any auth or WebAuthn change is also verified in a real browser, not only in automated tests.
