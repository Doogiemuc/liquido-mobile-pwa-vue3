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
- The backend should be reached through the configured `LIQUIDO_API_URL` in `config/config.development.js`.
- When running a local build check, force development mode rather than a production build:
  - macOS/Linux: `NODE_ENV=development npm run build`
  - Windows PowerShell: `$env:NODE_ENV="development"; npm.cmd run build`
- A plain production build is not a reliable local compile check in this repo because the environment alias expects the development config to exist.
- Indentation is tabs. Match the surrounding file exactly.
- Unit tests use Vitest; a one-shot run is `npx vitest run` or `npx.cmd vitest run` on Windows.

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
- `src/services/liquido-graphql-client.mock.js` is the mock twin used when `config.mockBackend` is enabled.

## 3. Routing and auth lifecycle

The router uses `createWebHistory(config.BASE_URL)` and disables default scroll behavior, leaving scroll management to `root-app.vue`.

Public routes:
- `/login`
- `/welcome`
- `/forgotPassword`
- `/resetPassword`
- `/login-via-sms`
- `/404`
- any fallback redirect to `/404`

Protected routes include:
- `/team`
- `/userhome`
- `/polls`
- `/polls/create`
- `/polls/:pollId`
- `/polls/:pollId/add`
- `/polls/:pollId/castVote`

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

## Component & styling conventions

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

- Routed components must have a single top-level root element.
- Use Bootstrap 5 utility classes together with LIQUIDO design tokens from `src/styles/liquido.css`.
- Prefer LIQUIDO CSS custom properties such as `--primary`, `--secondary`, `--unit`, `--two`, `--header-bg`, and `--light-bg` over hard-coded values.
- Scoped styles should not rely on `:root`; in scoped Vue styles, component-level CSS variables must be declared on the component root element.
- Reusable UI components should be imported with kebab-case names in templates.
- Use the shared modal feedback helpers exposed through `$root`: `showSuccess`, `showError`, `showWarning`, and `showInfo`.
- Use the shared `$root` helper methods for navigation and screen scrolling wherever possible.

## 8. Internationalization conventions

- Vue i18n runs in legacy mode with `allowComposition: true`.
- Global messages are defined in `src/main.js`.
- Component-local messages should be provided through the Vue `i18n:` option in Options API components.
- There are no SFC `<i18n>` blocks in this codebase.
- In `<script setup>`, use `useI18n()` to get a `t` function and use it for both script and template logic.
- In Options API components, use `this.$t("...")`.

## 9. Mock backend conventions

When `config.mockBackend === true` in `config/config.development.js`, the app replaces the real GraphQL API with the mock implementation.

Mock backend rules:
- Maintain all mutable state in a single `mockState` object.
- Persist it to `sessionStorage` under `"LIQUIDO_MOCK_STATE"` after mutating operations.
- Seed state from `src/mockdata/teamUserJwt.json` and derive new IDs safely.
- Centralize login state changes through `loginMock(email)` so all login variants stay consistent.
- When returning poll objects, use `enrichPollForCurrentUser()` rather than a raw deep copy, so derived flags like `userAlreadyVoted` stay accurate.
- Add new GraphQL operation handlers in `detectOperation()`.
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
