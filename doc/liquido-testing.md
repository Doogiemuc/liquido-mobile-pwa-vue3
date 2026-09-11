# How to test LIQUIDO

There is a lot of setup and configuration for debugging and testing LIQUIDO.

## Preconditions for LIQUIDO FRONTEND

 * The LIQUIDO progressive web application PWA **must** be served via HTTPs with a valid TLS certificate.
 * Frontend must be able to reach the LIQUIDO Quarkus backend via HTTPS. Again with a valid and trusted TLS certificate.
 * Make sure that your certificates contains all required domains as SAN (subject alternative names)

## Preconditions for LIQUIDO BACKEND

There are several possibilities how you can configure the frontend to access the backend. The TLS certificate for the frontend is configured in `vite.config.js`. If frontend and backend run on the same host/IP then you can directly configure the `LIQUIDO_API_URL` in `./config/config.development.js`. 

If the backend is running on another machine you can configure a path proxy in vite that forwards requests for you. Set `LIQUIDO_API_URL: '/graphql_proxy'` in `./config/config.development.js`. and configure a `target` in `vite.config.js`. Plus you'll most likely need to fiddle around with path reqrites a bit :-) In this setup the LIQUIDO frontend simply sends backend requests to the configured local PATH and the vite proxy then forwards to the actual LIQUIDO backend running somewhere else.

## Additional requirements for WebAuthn

 * Frontend must be served on a real domain not just an IP address, Tip: Configure a domain in your local `/etc/hosts` or in your local DNS. The current dev host is `shadow.fritz.box` (resolved by the Fritz!Box DNS).
 * That domain must be configured in backend `application-dev.properties` — **three** settings, and all of them must agree:
   * `quarkus.webauthn.origins=https://shadow.fritz.box:3001` — with schema, domain **and** port!
   * `quarkus.webauthn.relying-party.id=shadow.fritz.box` — domain only, no schema, no port
   * `LIQUIDO_API_URL` in `./config/config.development.js` must point at the same host
 * The TLS certificate must list that domain in its SANs, and the mkcert CA must be installed on
   *this* machine (`mkcert -install`). See `liquido-backend-quarkus/docs/README-tech.md` — moving to a
   new laptop breaks both of these at once.
 * And obviously your hardware device must support WebAuthN (iOS Safari with Face ID, Chrome on Android with fingerprint, or desktop with platform authenticators)




# Test locally on a PC or laptop

Testing locally is easier. Testing on a real device requires much more setup.

## Start services

 * Start the LIQUIDO backend `./mvnw quarkus:dev`
 * Start the LIQUIDO frontend `npm run dev`
 * Navigate at least once to https://backend.host:8443/graphql/schema.graphql  => This is necessary at least once, to make the browser accept the self-signed certificate
 * Navigate to to https://backend.host:8443  -> should show now show the LIQUIDO API version
 * Open the LIQUIDO frontend in your browser. (Safari, Firefox, Chrome should all work just fine.)
 * Tip: Open developer tools in browser
 * Tip: The console output is also shown in the vite output.



# Remote testing on Safari for iOS

You must open all the URLs (incl the schema.graphql) at least once, for Safari to trust the self-signed certificates.

## Console.log

I played around a lot with a mobile-debug-log.vue component to make the console.log available really locally on a device. This does work. But it's a crude hack to redefineConsoleMethods(). And you loose the "this" context and cannot see anymorefrom which file a log statement initially came from.

[Vite can server.forwardConsole](https://vite.dev/config/server-options#server-forwardconsole) to its stdout

## Debugging with iOS Safari on a real device

You can see the remote console output from Safari for iOS on your local Safari. But must connect the device via a cable!
https://dev.to/nimajafari/remote-debugging-using-safari-on-ios-devices-with-macos-16p5 




# Automated tests

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
   (`multiteammember4711@liquido.vote` in both `multiTeamA4711` and `multiTeamB4711`) from the
   backend's `TestDataCreator` — fails against a bare/freshly-deployed backend that was never seeded.
 * `polly.cy.js` — the Polly flow (the simpler, teamless, passkey-only poll type).
 * `user-home-tests.cy.js.FIXME` — disabled (the `.FIXME` extension excludes it from
   `specPattern`), not currently run.

Run with `npm run test:e2e` (all specs) or `npx cypress run --e2e --spec tests/e2e/specs/<file>`
for one spec. `npx cypress open --e2e --browser firefox` for interactive mode. See `CLAUDE.md` §7
for the full command list.

**Testing rule:** never assert on displayed UI text (a translated/reworded string must not break
the suite) — assert on DOM ids or `data-*` attributes instead. See `CLAUDE.md` §3 for the full list
of rules and the `data-error-code` convention for error cases.

### WebAuthn/passkey ceremony in headless tests

A headless test browser has no authenticator. `navigator.credentials.create()` doesn't fail fast
there either — it just hangs indefinitely instead of rejecting, which used to make `happy-case.cy.js`
time out on the passkey step. `welcome-chat.vue`'s `setupPasskey()` now checks `window.Cypress`
(only ever set inside a Cypress run) and short-circuits straight to the same "registration failed"
path a real ceremony failure already takes, instead of calling the real WebAuthn API. That is why
the happy-case test can assert the passkey *failure* UI (the retry/"do it later" modal) even
though passkeys themselves are inherently untestable in an automated browser.

### Running against an already-deployed instance

`cypress.config.remote.js` points the suite at an already-deployed frontend/backend (e.g.
`https://liquido.dynv6.net`) instead of the local dev servers on `localhost:3001`/`:8443` — no local
Postgres or Quarkus needed:

```bash
npm run test:e2e:remote                                           # defaults to liquido.dynv6.net
CYPRESS_REMOTE_URL=https://staging.liquido.vote npm run test:e2e:remote
npm run cypress:open:remote                                        # interactive mode
```

Every spec creates real data (teams, polls, ballots) against whatever backend this points at —
never run it against a production instance with real users. `switch-team.cy.js` and the
password-login/forgot-password parts of `login-tests.cy.js` fail against a fresh deploy for the
same seed-data reason as above: they need `TestDataCreator`'s seeded users, which only exist in a
database that generator has actually run against.

### TODO: Tests to implement

 * Negative test cases
   * Cannot reach backend
   * Device does not support Passkey (`webauthnService.isWebAuthnSupported()` returning false —
     different from the ceremony itself failing, which `happy-case.cy.js` already covers)

