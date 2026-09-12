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
 * `no-webauthn-support.cy.js` — a device with **no** WebAuthn support at all must still be able to
   register password-only. Deletes `window.PublicKeyCredential` before the page loads, so
   `browserSupportsWebAuthn()` genuinely returns false rather than stubbing our own code, and
   asserts the passkey step is never offered (as opposed to offered-and-declined, which
   `happy-case.cy.js` covers).
 * `user-home-tests.cy.js.FIXME` — disabled (the `.FIXME` extension excludes it from
   `specPattern`), not currently run.

Run with `npm run test:e2e` (all specs) or `npx cypress run --e2e --spec tests/e2e/specs/<file>`
for one spec. `npx cypress open --e2e --browser firefox` for interactive mode. See `CLAUDE.md` §7
for the full command list.

**Testing rule:** never assert on displayed UI text (a translated/reworded string must not break
the suite) — assert on DOM ids or `data-*` attributes instead. See `CLAUDE.md` §3 for the full list
of rules and the `data-error-code` convention for error cases.

### WebAuthn/passkey ceremony in headless tests

A headless test browser has no authenticator, and `navigator.credentials.create()` doesn't fail
fast there either — by default it just hangs indefinitely instead of rejecting. `welcome-chat.vue`'s
`setupPasskey()` guards against this: whenever `window.Cypress` is set (only true inside a Cypress
run) **and** no virtual authenticator has been registered, it short-circuits straight to the same
"registration failed" path a real ceremony failure already takes, instead of calling the real
WebAuthn API. That is the default for every passkey step except one.

`happy-case.cy.js` exercises **both** outcomes for real, not just the failure path: the admin
genuinely registers a passkey, the member declines, and later assertions confirm `team-home.vue`'s
passkey reminder is gone for the admin and still shown for the member. The admin's registration
works via a **Chrome DevTools Protocol virtual authenticator** — `setupVirtualAuthenticator()` in
the spec calls `Cypress.automation("remote:debugger:protocol", ...)` to issue `WebAuthn.enable`
then `WebAuthn.addVirtualAuthenticator` (`protocol: "ctap2"`, `transport: "internal"`,
`automaticPresenceSimulation: true`), then sets `window.__cypressWebAuthnAvailable = true` on the
page. That flag is what lets `setupPasskey()`'s guard let the real ceremony through for that one
step — the resulting credential is genuine (Chrome's own compliant virtual implementation, not a
faked response), so the backend accepts it exactly like a real device's. Chromium-family browsers
only (Cypress's bundled Electron qualifies; Firefox does not support this CDP domain at all).

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

### Running locally on GISMO, without touching public DNS at all

`liquido.dynv6.net`'s public DNS record has repeatedly gone stale (the FritzBox's DDNS client
doesn't reliably update it whenever the home connection's public IP rotates). That only breaks
reaching the site from *outside* GISMO. Claude Code sessions in this project run directly on
GISMO itself, not via SSH from a laptop, so a local test run has no reason to go anywhere near the
public internet or its DNS at all:

```bash
./deploy/test-e2e-local.sh                              # full happy-case.cy.js
./deploy/test-e2e-local.sh tests/e2e/specs/polly.cy.js  # a specific spec
```

This still uses `cypress.config.remote.js` (so it exercises the real deployed backend/frontend,
same as `test:e2e:remote`), but resolves `liquido.dynv6.net` straight to `127.0.0.1` inside an
unprivileged mount namespace (`unshare -Urm` bind-mounting a private `/etc/hosts` — the real system
one is never touched), so requests hit Caddy directly on this host with the correct Host/SNI for
its site block to match. No DNS lookup, no dependency on the FritzBox's DDNS being current.

This is a *local* check only — it says nothing about whether the public internet can actually
reach GISMO (DNS, FritzBox port-forwarding, and Caddy's real TLS cert all have to work together for
that). For genuine outside-the-network verification, run the suite from somewhere that is actually
outside GISMO's own network — e.g. a cloud CI runner, or (for a Claude Code session) a remote-
isolated agent. The same IPv4-forcing `unshare` technique still applies there, just pointed at the
real public IP instead of `127.0.0.1`, since that runner's network is genuinely elsewhere.

### Negative test cases

Both of the negative cases this section used to list as TODO now exist:

 * **Cannot reach backend** — `login-tests.cy.js`, last test. `cy.intercept` forces every GraphQL
   call to fail at the *network* level (not with an HTTP error status), which is what `root-app.vue`'s
   `api.pingApi()` on mount exists to catch, and asserts the warning modal actually appears.
 * **Device does not support Passkey** — `no-webauthn-support.cy.js`, see the spec list above.

### TODO: Tests to implement

 * A genuine Ranked Pairs **tie** (more than one undefeated proposal) on the winner page. The
   backend reports it via `publishedTally.winnerIds`, and `poll-winner.vue` renders an explanation
   instead of a winner, but no e2e spec reaches that state: the happy case casts a single ballot, and
   a tie needs two voters who split 1:1 on one pair while both beating a third proposal. The pure
   algorithm side is covered by `tests/unit/ranked-pairs.spec.js` and the backend's
   `PublishedTallyTest`.

