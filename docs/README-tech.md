# LIQUIDO Frontend — Technical Handbook

How to set up, run, build and deploy the LIQUIDO mobile PWA. Companion documents:

- [liquido-architecture.md](liquido-architecture.md): how the frontend is built.
- [liquido-testing.md](liquido-testing.md): **all** testing, the environments DEV / TEST / MOCK / INT, and
  what to configure where.
- [use-case-flows/liquido-use-cases.md](use-case-flows/liquido-use-cases.md): what the app does for its users.
- [../AGENTS.md](../AGENTS.md): rules for AI agents (and a good summary of the house style for humans, too).
- The backend's [README-tech.md](../../liquido-backend-quarkus/docs/README-tech.md): databases, TLS
  certificates, Docker deployment.

---

## Prerequisites

- **Node 22** (≥ 22.12) or **Node 24** — Vite 8 refuses older versions.
- **mkcert**, for a locally trusted TLS certificate (only needed for DEV with a real backend).
- Linux without a desktop: **Xvfb**, so Cypress can start.

## First-time setup

```bash
git clone https://github.com/Doogiemuc/liquido-mobile-pwa-vue3.git
cd liquido-mobile-pwa-vue3
npm install
npm test && npm run test:e2e:mock     # works right away, no backend or config needed
```

To develop against a real backend (environment DEV):

1. Copy `config/config.development.js.example` to `config/config.development.js` (gitignored). Keep
   `LIQUIDO_API_URL` as the backend's API root — `https://shadow.fritz.box:8443`, without `/graphql`.
2. TLS: the dev certificate pair in `tls-certs/liquido-local-{cert,key}.pem` is checked in. Its SANs
   cover `shadow.fritz.box`, `liquido.local`, `localhost` and two LAN IPs, and it is valid until 2028-12.
   Your browser trusts it only after `mkcert -install` with the CA that signed it — on a new machine,
   create a new pair as described in the backend's
   [README-tech.md → TLS](../../liquido-backend-quarkus/docs/README-tech.md#tls-for-local-development)
   and use the same pair in both repos.
3. Start the backend (`./mvnw quarkus:dev` in `liquido-backend-quarkus`), then the frontend with
   `npm run dev`, and open `https://shadow.fritz.box:3001`.

Everything else about the environments — host names, WebAuthn origins, which value must match which —
is in [liquido-testing.md §2](liquido-testing.md#2-environments-dev-test-mock-int).

## Daily commands

| Command | What it does |
|---|---|
| `npm run dev` (`npm start`) | Vite dev server with hot reload, HTTPS on port 3001 (DEV) |
| `npm run dev:mock` | The same with the built-in mock backend on port 3002 (MOCK) |
| `npm test` / `npm run test:unit` | vitest once / in watch mode |
| `npm run test:e2e:mock` | All Cypress specs against the mock |
| `npm run test:e2e` | All Cypress specs against your local backend |
| `npm run lint` | ESLint with `--fix`; `npx eslint src tests --ext .vue,.js` only reports |
| `npm run build` | Production bundle in `dist/` |
| `npm run preview` | Serve the built bundle locally |

`npm run build` uses `config/config.production.js`, which is gitignored. In a fresh clone without it,
check that everything compiles with `NODE_ENV=development npm run build` instead (PowerShell:
`$env:NODE_ENV="development"; npm.cmd run build`).

## Build and deploy

LIQUIDO runs on **GISMO**, a home server reachable as `https://liquido.dynv6.net` — the integration
environment INT. Caddy serves the frontend as static files from `/var/www/liquido-frontend`, with an SPA
fallback to `index.html` so that the Vue router works; API calls to `/api/v2/*` go to the backend container.

```bash
./deploy/build-and-deploy-local.sh   # on GISMO itself: npm run build, then rsync dist/ to /var/www/liquido-frontend
./deploy/build-and-deploy.sh         # the same from the laptop, via rsync over ssh
```

Deploying is always a deliberate human decision (AI agents must ask first). After a deploy, run the
regression in [liquido-testing.md §8](liquido-testing.md#8-regression-after-a-deploy). The backend is
deployed separately, see its [README-tech.md](../../liquido-backend-quarkus/docs/README-tech.md#deployment-gismo-environment-int).

## Testing on a phone

Passkeys and the PWA feel can only really be tested on a phone. That needs the dev certificate trusted
on the device and a real host name — step by step in [liquido-testing.md §7](liquido-testing.md#7-manual-testing--real-devices).

## Authentication providers

LIQUIDO's own logins are passkeys (WebAuthn), email + password, and an email login link. SMS login
exists in the code but is switched off (a phone number is optional and not collected). Notes on the
external providers:

**Google login** — the PWA uses Google's One Tap sign-in (`startGoogleOneTapLogin` in `login-page.vue`,
verified by the backend's `GoogleLogin.googleOneTapLogin`). OAuth client ids are configured in the
[Google Cloud Console](https://console.cloud.google.com/auth/clients?project=liquido-vote). Background:
[comparison of the OAuth flows](https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model#oauth_20_flow_comparison),
[how user authorization works](https://developers.google.com/identity/oauth2/web/guides/how-user-authz-works),
[server-side flow](https://developers.google.com/identity/protocols/oauth2/web-server#node.js_1).

**Apple login — not supported**, because ([details](https://github.com/pwa-builder/pwa-auth/blob/master/creating-apple-key.md)):
- It's not free: an Apple key needs a membership in Apple's Developer Program ($99/year; free for non-profits).
- You get no profile picture, and the user's full name only on the very first sign-in.
- The user may hide their real email behind an Apple relay address.

**Maybe later:** Passwordless.dev by Bitwarden.

## Recovering from dependency trouble

Lost in dependency hell after an npm upgrade? Rebuild the project skeleton from scratch and move the
sources over: in an empty directory run `npm create vue@latest`, answer yes to Vue Router, Vitest,
Cypress and ESLint/Prettier, then `npm install` the runtime libraries listed in
[liquido-architecture.md §1](liquido-architecture.md#1-tech-stack).

## History and references

LIQUIDO is a private hobby project that has grown over nearly a decade; its honest goal is never to be
finished, because it is a place to learn.

- The frontend was once deployed to [Fly.io](https://fly.io) (`fly.toml` and `Dockerfile` are left over
  from that and are unused) and to an IONOS web space by plain file copy. Today it runs on GISMO.
  How dynamic DNS with dynv6 behind a FritzBox works:
  https://nocksoft.de/tutorials/dyndns-fuer-ipv6-server-hinter-fritzbox-konfigurieren/
- In 2024 a backend on MongoDB Atlas with its GraphQL functions was tried as an alternative:
  https://www.mongodb.com/developer/products/realm/graphql-easy/
- Kudos to https://github.com/marvelapp/devices.css for the CSS-only phone frame
  (`public/index-with-frame.html`), and to the [FlexStart](https://bootstrapmade.com/demo/FlexStart/)
  Bootstrap template.
- Cypress was chosen over Playwright and has served well so far.
