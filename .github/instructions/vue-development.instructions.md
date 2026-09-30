---
applyTo: '**/*.{vue,js}'
description: 'LIQUIDO Vue frontend architecture, tooling, routing, state, API gateway, and implementation conventions'
---

# LIQUIDO — Vue frontend development guide

This repository is the mobile-first Vue 3 progressive web app for secure and private voting.
The frontend is a single-page application with a central API gateway, a router guard-based auth flow,
and a shared design system built on Bootstrap plus LIQUIDO CSS variables.

Use this guide as the default implementation and workflow reference for future frontend work.

## 1. Environment and tooling

- Use `npm` / `npx` on macOS and Linux.
- Use `npm.cmd` / `npx.cmd` in Windows PowerShell, because the `npm` shim can be blocked by execution policy.
- The app runs as a Vite HTTPS dev server on port `3001` with self-signed TLS certificates from `tls-certs/`.
- The backend should be reached through the configured `LIQUIDO_API_URL` in `config/config.development.js` (gitignored — copy `config.development.js.example`).
- `npm run dev:mock` serves the same app on port `3002` with the mock backend instead (`config/config.mock.js`, checked in). No backend and no config file needed.
- The bare `config` import resolves to `config/config.<name>.js`, where `<name>` is `LIQUIDO_CONFIG` if set, else `NODE_ENV`.
- When running a local build check, force development mode rather than a production build:
  - macOS/Linux: `NODE_ENV=development npm run build`
  - Windows PowerShell: `$env:NODE_ENV="development"; npm.cmd run build`
- A plain production build is not a reliable local compile check in this repo because the environment alias expects the development config to exist.
- Indentation is tabs. Match the surrounding file exactly.
- Unit tests use Vitest; a one-shot run is `npm test` (`npx vitest run`, or `npx.cmd vitest run` on Windows).
- `npx eslint src tests --ext .vue,.js` is clean — zero errors, zero warnings. Keep it that way.

## 2. High-level architecture

This is a single-page Vue 3 app with no SSR, no Vuex/Pinia, and a very small reactive UI state layer.

- `src/main.js` is the app bootstrap. It reads the environment config, enables full `loglevel` logging in development/test, imports Bootstrap CSS first, and then imports `src/styles/liquido.css` so LIQUIDO design-token overrides win.
- `src/root-app.vue` is the app shell. It renders the shared header, the routed page content, the footer area, and the shared popup modal.
- `src/views/` contains route page implementations.
- `src/components/` contains reusable UI building blocks.
- `src/services/` contains non-UI logic such as the router, GraphQL client, auth helpers, event bus, store, and WebAuthn service.
- Global state lives in `src/services/store.js` as a tiny `reactive()` object used for header title, back target, and shared UI actions.
- The router is in `src/services/router.js` and includes a global authentication navigation guard.
- All backend access must flow through the single gateway module `src/services/liquido-graphql-client.js`.
- There is no mock twin of the client any more. With `config.mockBackend` enabled the client only changes its base URL to the dev server's own origin, where `vite-plugin-mock-backend.js` answers from `mock-backend/` — see §9.

## 3. Routing and auth lifecycle

The router uses `createWebHistory(config.BASE_URL)` and disables default scroll behavior, leaving scroll management to `root-app.vue`.

The authoritative route list is `src/services/router.js`. `meta.public` is the only flag — there are no role guards in the router; admin-vs-member is decided per component with `api.isAdmin()`, and enforced by the backend.

Public routes:
- `/login`, `/welcome`
- `/forgotPassword`, `/resetPassword`, `/verifyEmail`, `/login-via-sms`
- `/polly`, `/polly/:publicId` (the teamless Polly poll type)
- `/impressum`, `/agb`, `/datenschutz`
- `/404`, and any unknown path redirects there

Protected routes include:
- `/team`
- `/userhome`
- `/polls`
- `/polls/new` and `/polls/:pollId/edit` — the all-in-one poll editor
- `/polls/:pollId`
- `/polls/:pollId/add` — the old two-step flow, deprecated but deliberately kept reachable
- `/polls/:pollId/castVote`
- `/polls/:pollId/winner`

Order matters: `/polls/new` must be declared before `/polls/:pollId`.

Development-only routes can be added for `MODE === "development"` (for example `/devLogin` and `/_design-overview`).

The navigation guard runs `tryToAuthenticate()` before allowing navigation:
1. If the cached session is already present and `api.isAuthenticated()` is true, authentication resolves immediately.
2. Otherwise the router reads the JWT from `localStorage` and attempts `api.loginWithJwt(jwt)`.
3. Expired or invalid JWTs are removed from storage.

Routing behavior is intentionally strict:
- authenticated users are redirected to `/team` when they visit `/`
- anonymous users are redirected to `/welcome` for protected routes when targeting `/`
- anonymous users are redirected to `/login` for other protected targets

## User-facing error messages

**NEVER show raw backend error messages, exception details, or stack traces to the user.**
Backend messages (e.g. `err.message`, `liquidoException.msg`, HTTP status text) may leak internal
implementation details or confuse users with technical jargon.

Always show a fixed, **localized** string:
```js
// ✅ correct
this.$root.showError(this.$t('errorUnexpected'), this.$t('Error'))

// ❌ wrong — leaks backend internals
this.$root.showError(err.message, 'Error')
this.$root.showError(err.liquidoException?.msg, 'Error')
```

Log the full technical error to the console for debugging, then show only the safe UI message.
The global error boundary in `src/main.js` (`app.config.errorHandler` and `unhandledrejection`)
already follows this rule and reloads the window when the user dismisses the modal.

## 4. API gateway

The API gateway is the only module that should talk to the backend.

Responsibilities:
- GraphQL transport over Axios
- JWT lifecycle management
- Storage of JWT in `localStorage` (`LIQUIDO_JWT_KEY`)
- In-memory caching for team/user/polls data
- Centralized error handling and auth state hydration

Key cached accessors:
- `api.getCachedUser()`
- `api.getCachedTeam()`
- `api.getCachedPolls()`
- `api.isAdmin()`
- `api.isAuthenticated()`

The server-side auth lifecycle should be kept consistent:
- `loginWithJwt(jwt)` populates the in-memory cache and persists session state
- `logout()` clears JWT and empties caches cleanly

## 5. Authentication methods

LIQUIDO supports several login flows and they should all be routed through the central API client:

- JWT auto-login from local storage
- Email + password login
- Email magic-link / token login
- SMS login
- WebAuthn / Passkey passwordless login and 2FA registration
- Forgot / reset password flow
- Dev login in development mode for testing automation

## 6. WebAuthn and security expectations

- WebAuthn integration lives in `src/services/webauthn-service.js` and uses `@simplewebauthn/browser`.
- The frontend must be served over HTTPS on a trusted domain, not only an IP.
- For local debugging and authentication testing, configure the domain in `hosts` or local DNS so the browser sees a real host name.
- Backend `quarkus.webauthn.origins` must include the frontend origin including schema, domain, and port.
- For mobile Safari/iOS and other platform authenticators, test with real hardware where possible.

## 7. Component and styling conventions

- Prefer `<script setup>` (Composition API) for new components — it is the target the app is migrating to. When editing an existing Options API file, match what is there; do not rewrite it as a side effect.
- Routed components must have a single top-level root element.
- Use Bootstrap 5 utility classes together with LIQUIDO design tokens from `src/styles/liquido.css`.
- Prefer LIQUIDO CSS custom properties such as `--primary`, `--secondary`, `--unit`, `--two`, `--header-bg`, and `--light-bg` over hard-coded values.
- Scoped styles should not rely on `:root`; in scoped Vue styles, component-level CSS variables must be declared on the component root element.
- Reusable UI components should be imported with kebab-case names in templates.
- Use the shared modal feedback helpers exposed through `$root`: `showSuccess`, `showError`, `showWarning`, and `showInfo`.
- Use the shared `$root` helper methods for navigation and screen scrolling wherever possible.

## 8. Internationalization conventions

- Localisation is **liqui-loc**, the project's own library in `src/services/liqui-loc.js`. vue-i18n has been removed.
- Global messages are defined in `globalTranslations` in `src/main.js`. German is the only complete locale; `en: {}` is normal.
- Component-local messages go in the `i18n: { messages: { en: {}, de: {…} } }` component option — not in an `<i18n>` SFC block.
- `$t`, `$tc`, `$d` and `$fromNow` are global properties: use them in templates and as `this.$t("...")` in Options API components.
- In `<script setup>`, call `useLoc()`. Unlike vue-i18n's `useI18n()`, it also sees the component's own messages.
- Never write `v-html="$t(…)"`. Messages containing HTML go through `<liqui-loc-html>`, which escapes parameters and sanitises.
- A missing key logs a warning and renders the key itself — treat those warnings as real gaps.

## 9. Mock backend conventions

When `config.mockBackend === true` (always in `config/config.mock.js`, served by `npm run dev:mock`), the frontend still makes exactly the HTTP calls it makes against the real backend. `vite-plugin-mock-backend.js` answers them inside the Vite dev server:

- `mock-backend/liquido-mock-domain.js` — the state and the GraphQL query/mutation handlers. No Node-only APIs, because vitest (`config/config.test.js`, no dev server) calls it in-process.
- `mock-backend/liquido-mock-http-server.js` — Node-only HTTP layer: `/graphql`, `/login/*`, `/webauthn/*`, and the mock-only `POST /mock/reset`.

This is what lets the same Cypress spec run against the mock and the real backend. Do not reintroduce a client-side shortcut that bypasses the network.

Mock backend rules:
- Maintain all mutable state in the single `mockState` object. It lives in the dev server process, not in the browser — restart the server or `POST /mock/reset` for a fresh one. Nothing is persisted to `sessionStorage` any more.
- Seed state from `src/mockdata/teamUserJwt.json` and derive new IDs safely.
- Return data of the same shape as the real backend: the mock goes through the real `isAdmin()` and `jwt-util.js` (it mints structurally real JWTs for that reason).
- Centralize login state changes through `loginMock(email)` so all login variants stay consistent.
- When returning poll objects, use `enrichPollForCurrentUser()` rather than a raw deep copy, so derived flags like `userAlreadyVoted` stay accurate.
- Add new GraphQL operation handlers in `detectOperation()`. Its `operations` list is order-sensitive: the first name found anywhere in the query string wins.
- Domain errors should use `rejectLiquido(code, message)` with the proper `LiquidoExceptionCodes` constant.

## 10. Quick gotcha checklist

- [ ] On Windows, use `npm.cmd` and `npx.cmd`.
- [ ] On macOS/Linux, use `npm` and `npx`.
- [ ] Used `NODE_ENV=development` or `$env:NODE_ENV="development"` for local build checks.
- [ ] Kept backend access in the GraphQL gateway instead of calling the backend directly from components.
- [ ] Used LIQUIDO CSS variables and Bootstrap together, not hard-coded colors.
- [ ] Kept routed page templates to a single root element.
- [ ] When a new mock GraphQL handler returns a poll, made sure it passes through `enrichPollForCurrentUser()`.
- [ ] When adding a new mock operation, registered its operation name in `detectOperation()`.
