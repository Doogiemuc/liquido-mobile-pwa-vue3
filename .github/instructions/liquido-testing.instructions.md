---
applyTo: '**/*.{js,ts,vue,cy.js}'
description: 'LIQUIDO Cypress E2E testing workflow, prerequisites, and verification conventions'
---

# LIQUIDO — Testing guide

Testing is a core part of LIQUIDO development. The frontend is a privacy-sensitive mobile PWA, so automated end-to-end coverage must be treated as a first-class part of the delivery workflow.

This repository already has a Cypress E2E setup and should be used as the default regression and UX safety net.

## 1. Prerequisites for local frontend testing

The frontend must be served over HTTPS with a valid trusted TLS certificate.

Required conditions:
- Frontend runs on HTTPS, typically via the Vite dev server and `tls-certs/` certificates.
- The frontend can reach the LIQUIDO Quarkus backend over HTTPS.
- The certificate must include all required domains as SAN entries.
- For WebAuthn, the frontend must be reachable via a real domain name, not just an IP address.

Recommended local setup:
- start the backend with the Quarkus dev server
- start the frontend with `npm run dev`
- visit the backend GraphQL schema URL once in the browser to trust the self-signed certificate
- visit the backend root once to confirm the API version is reachable
- open the frontend in a browser and inspect the Vite dev output / browser console when debugging

## 2. Backend connectivity patterns

There are two common local testing setups:

1. Frontend and backend on the same host or IP
   - configure `LIQUIDO_API_URL` directly in `config/config.development.js`

2. Frontend and backend on different machines
   - set `LIQUIDO_API_URL` to `/graphql_proxy`
   - configure the Vite proxy target in `vite.config.js`
   - adjust path rewrite rules if needed

In the proxy setup, the frontend sends requests to a local path, and Vite forwards them to the actual backend server.

## 3. WebAuthn-specific testing requirements

For WebAuthn and Passkey-related flows:
- serve the frontend on a real domain, not an IP-only address
- add that domain to the backend `application-dev.properties` origin whitelist, including schema, host, and port
- use a hardware authenticator supported by the browser and OS, such as iPhone Face ID, Android fingerprint, or a desktop platform authenticator

## 4. Mobile Safari / iOS remote testing notes

When testing on iOS Safari:
- open every relevant URL at least once so Safari trusts the self-signed certificates
- include the schema endpoint in the trust flow
- use a physical cable connection for remote debugging from Safari on macOS

For console access on remote devices, the repo already contains a crude mobile debug overlay approach via `mobile-debug-service.js` and `mobile-debug-log.vue`. This is useful for debugging on-device logs, but it intentionally sacrifices some file-origin detail and `this` context fidelity.

## 5. Automated E2E setup

The repo uses Cypress as the main E2E framework.

Primary scripts:
- `npm run test:e2e` → headless Cypress run
- `npm run cypress:open` → interactive Cypress runner in Chrome

Key configuration sources:
- `cypress.config.js` → default local config
- `cypress.config.INT.js` → integration environment overrides
- `tests/cypress-base-config.js` → shared base URL, credentials, viewport, and fixture paths

Default local base URL:
- `https://localhost:3001/`

Default test spec pattern:
- `tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}`

## 6. Test environment conventions

The current Cypress setup uses a mobile viewport:
- `viewportWidth: 375`
- `viewportHeight: 667`

Common test environment variables:
- `passwordSuffix: "_PWD"`
- `devLoginToken: "DEV_LOGIN_TOKEN_INT"`
- `testPasswordResetToken: "DEV_PASSWORD_RESET_TOKEN"`
- Mailtrap credentials and endpoint are wired through `Cypress.env()`

## 7. Cypress workflow expectations

When adding or editing E2E tests:
- prefer real user flows over overly mocked UI assertions
- keep tests focused on actual navigation, login, poll lifecycle, and voting behavior
- use the real app route structure and live DOM interactions
- do not assert on test-only mock artifacts unless the test explicitly verifies the real integration contract

Useful repository patterns:
- `cy.visit("/")` and route-specific visits are used throughout the specs
- `cy.request()` is used for backend-facing setup and validation
- custom command helpers live in `tests/e2e/support/commands.js`
- dev login helper flows should use the real route and token input contract, not a fake shortcut

## 8. Mock-state reset rule

The mock backend persists state under `sessionStorage` with the key `"LIQUIDO_MOCK_STATE"`.

This means Cypress tests must reset that state explicitly in their `before()` hooks when they rely on a clean mock environment.

Repository precedent:
- `sessionStorage.removeItem("LIQUIDO_MOCK_STATE")` in the test setup before running the scenario

This is necessary to avoid cross-test contamination and state bleed between runs.

## 9. Test coverage priorities

The existing automated coverage is centered on the main happy path for LIQUIDO user flows. The documentation also explicitly calls out the following negative tests as important future work:

- backend unreachable
- device does not support Passkey / WebAuthn
- Passkey is supported but registration fails because the origin/domain is wrong

These should be formalized as future Cypress regression scenarios.

## 10. Good testing practices for LIQUIDO

- Verify the app in the same way a real mobile user would interact with it.
- Re-run a scenario after any routing, auth, or voting-flow change.
- Treat certificate and origin trust as part of the test environment, not as an optional local detail.
- Prefer stable selectors and meaningful user-visible assertions over brittle implementation details.
- When a change touches polling or voting flow, validate it with the Cypress happy-path suite and the relevant negative case.

## 11. Quick testing checklist

- [ ] Dev backend is running.
- [ ] Frontend is running on HTTPS via the local Vite server.
- [ ] The backend schema URL has been visited once to trust the self-signed cert.
- [ ] The E2E test environment is using the correct Cypress config.
- [ ] Test state is reset before the scenario if the mock backend is involved.
- [ ] Any auth or WebAuthn change is verified on a real browser environment, not only in unit tests.
