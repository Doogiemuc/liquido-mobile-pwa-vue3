---
applyTo: '**/*.{vue,js}'
description: 'Setup, architecture and conventions for Vue 3 development in the LIQUIDO mobile PWA'
---

# LIQUIDO — Vue development guide

Practical conventions and hard‑won lessons for working on this Vue 3 mobile PWA.
For the general project overview see [GEMINI.md](../../GEMINI.md); for the i18n deep‑dive see
[doc/ai/i18n-usage-notes.md](../../doc/ai/i18n-usage-notes.md).

## Environment & tooling (Windows)

- **Use `npm.cmd`, not `npm`.** In this PowerShell environment the `npm` / `yarn` shims are
  `.ps1` scripts blocked by the execution policy (`UnauthorizedAccess`). Call `npm.cmd …` directly.
- **This repo uses npm** (there is a `package-lock.json`, no `yarn.lock`) even though
  `package.json` has a `packageManager: yarn` field. Install deps with `npm.cmd install <pkg>`.
- **Dev server:** `npm.cmd run dev` (or `start`) — Vite over **HTTPS on port 3001** (self‑signed
  certs in `tls-certs/`), proxying `/graphql_proxy` to the backend.
- **Production build gotcha:** `npm.cmd run build` runs in `production` mode and the `config` alias
  in `vite.config.js` resolves `config/config.<NODE_ENV>` — but only `config.common.js` and
  `config.development.js` exist. So a plain build **fails** with `Could not load config/config.production`.
  To compile‑check locally, force dev mode:
  `$env:NODE_ENV="development"; npm.cmd run build`.
- **Unit tests:** `npx.cmd vitest run` for a one‑shot run (`npm run test:unit` starts watch mode).
  One existing test hits a live backend at `https://localhost:8443` and fails offline — that is
  pre‑existing, not your change.
- **Indentation is TABS.** Match the surrounding file.

## High‑level architecture (technical setup)

This is a single‑page Vue 3 app; there is no Vuex/Pinia and no SSR.

- **Bootstrap (`src/main.js`)** creates the app from `root-app.vue`, installs the **router** and
  **vue‑i18n (legacy mode, `allowComposition: true`)**, sets `app.config.globalProperties.$store`,
  and mounts `#app`. Bootstrap CSS is imported first, then `src/styles/liquido.css` **overrides** it.
- **Root component (`src/root-app.vue`)** is the app shell: it renders the header, a
  `<router-view>` wrapped in a `<Transition name="fade">`, the footer area and a shared popup modal.
  It exposes app‑wide helper methods that every page reaches via **`$root`** (see below) and computes
  `isHomeScreenPWA`.
- **Pages (`src/views/`)** are rendered by the router. **Services (`src/services/`)** hold all
  non‑UI logic. **Reusable UI (`src/components/`)** are the shared building blocks
  (e.g. `liquido-footer.vue`, `poll-card.vue`, `liquido-header.vue`, `popup-modal.vue`).
- **Global state** is a tiny `reactive()` object in [src/services/store.js](../../src/services/store.js)
  — currently just the header title / back‑target / right‑action. Import it directly
  (`import { store } from "@/services/store.js"`); in Options API it is also `this.$store`.
- **Data / API:** [src/services/liquido-graphql-client.js](../../src/services/liquido-graphql-client.js)
  (Axios + a populating‑cache) with a `.mock.js` twin for tests. Prefer `api.getCached*()` reads and
  the async `api.*` calls; do not fetch GraphQL directly from components.
- **Cross‑component events:** [src/services/event-bus.js](../../src/services/event-bus.js)
  (`EventBus.on/emit`, e.g. `POLL_LOADED`).
- **User feedback:** the single shared modal via `$root.showSuccess/showError/showWarning/showInfo`.

### `$root` helper methods

`$root` is the `root-app.vue` instance. Available everywhere:
`gotoPoll(id)`, `gotoPolls()`, `gotoTeam()`, `gotoCreateNewPoll()`,
`showSuccess/showError/showWarning/showInfo(msg, title, …)`,
`scrollToTop()`, `scrollToBottom()`, `scrollElemToTop(el)`.

- Options API: `this.$root.showError(...)`.
- `<script setup>`: `const { proxy } = getCurrentInstance(); proxy.$root.showError(...)`.

## Options API vs `<script setup>`

The codebase is **mostly legacy Options API** with a few newer **Composition API `<script setup>`**
views (`polls.vue`, `team-home.vue`, `cast-vote-v2.vue`). A migration is in progress — see
[doc/ai/AI-plan migrate to i18n v12.md](../../doc/ai/AI-plan%20migrate%20to%20i18n%20v12.md).
New components may use `<script setup>`, but respect the legacy‑mode constraints below.

## Internationalization (i18n)

Full details in [doc/ai/i18n-usage-notes.md](../../doc/ai/i18n-usage-notes.md). The essentials:

- vue‑i18n runs in **legacy mode** with `allowComposition: true`. Global messages live in
  `src/main.js`; component‑local messages use the Options **`i18n:` option**. There are **no
  `<i18n>` SFC blocks** (the Intlify Vite plugin is not installed).
- **Template `$t()` works everywhere** (legacy global injection).
- **Gotcha:** in `<script setup>`, `getCurrentInstance().proxy.$t` is **not** a function in this
  setup — it throws `proxy.$t is not a function`. Do **not** call `proxy.$t()`.
- **Recommended for new `<script setup>` components:** define a local static `messages` object and a
  tiny `t(key, params)` helper that interpolates `{placeholders}` (the same pattern as `loc()` in
  `src/components/Polly-vote.vue`), and use `t()` in both template and script. `cast-vote-content.vue`
  is a working example.

## Component & styling conventions

- **Routed components must have a single element root.** `<router-view>` passes
  `id="appContent" class="router-view container-lg"` as fallthrough attributes and wraps the page in a
  `<Transition>`; the page must not have multiple top‑level elements in the `<template>` root.
- **Styling:** Bootstrap 5 classes + **CSS custom properties** from
  [src/styles/liquido.css](../../src/styles/liquido.css) — e.g. `--primary`, `--secondary`,
  `--unit` (1rem base spacing), `--two`, `--liquido-border-radius`, `--header-bg`, `--light-bg`,
  `--proposal-icon-bg`, `--font-size-small`. Prefer these over hard‑coded values. Use scoped
  `<style scoped>` per component.
- **Scoped‑style `:root` pitfall:** Vue rewrites `:root` in a scoped block to `:root[data-v-…]`,
  which never matches `<html>`, so the variables silently disappear. Declare component‑local CSS
  variables on the **component root element**, not on `:root`.
- Reference components in templates with **kebab‑case** (`<poll-card>`, `<liquido-footer>`);
  imports auto‑resolve in `<script setup>`.
- Reusable slots: `liquido-footer.vue` exposes `#info`, `#left`, `#primary`; `poll-card.vue` takes
  `poll`, `showArrowRight`, `showProposals`.

## Quick gotcha checklist

- [ ] Ran commands with `npm.cmd` / `npx.cmd`.
- [ ] Compile‑checked with `$env:NODE_ENV="development"; npm.cmd run build`.
- [ ] New routed view has a single `<div>` root.
- [ ] No `proxy.$t()` in `<script setup>` — used a local `t()` mock or template `$t()`.
- [ ] Used liquido.css CSS variables + Bootstrap, scoped styles, tabs for indentation.

