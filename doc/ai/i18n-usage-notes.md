# i18n Usage in liquido-mobile-pwa-vue3 — Analysis & Patterns

> Research notes gathered before building `cast-vote-v2.vue`. Describes how this repo
> currently uses **vue-i18n `^9.7.1` in legacy mode**, how component-local ("custom")
> message sections work, and the recommended **two `<script>` blocks** pattern for new
> Composition-API (`<script setup>`) files.

---

## TL;DR

- vue-i18n runs in **legacy mode** (no `legacy: false`) with **`allowComposition: true`** — see [`src/main.js`](../../src/main.js).
- **Global** messages live in `main.js` (`globalTranslations`, `de` + `en`).
- **Component-local** messages use the legacy **`i18n:` component option** (NOT `<i18n>` SFC blocks — the Vite plugin for those is not installed).
- Most components are **Options API** and use `this.$t()` / `$t()`.
- A few newer files are **Composition API `<script setup>`** and currently rely on **global** messages via `useI18n()` — except the Polly module, which ships its own `polly-i18n.js` to stay self-contained.
- To keep **component-local** messages in a **`<script setup>`** file while still in legacy mode, use **two script blocks**: a plain `<script>` exporting `{ i18n: { messages } }` next to `<script setup>`. Template `$t()` sees the merged messages; there are caveats for script-side lookups (below).

---

## 1. Global configuration (legacy mode) — `src/main.js`

The **active** instance is created in legacy mode. `legacy: false` is *not* set, so Options-API
i18n behavior (`this.$t`, per-component `i18n:` option) stays enabled. `allowComposition: true`
is what additionally permits `useI18n()` inside `<script setup>`.

```js
// src/main.js (active config)
const i18n = new createI18n({
  locale: "de",
  fallbackLocale: "de",
  warnHtmlInMessage: 'off',   // don't warn about HTML in messages
  silentFallbackWarn: true,
  allowComposition: true,     // "you need to specify that!" — enables useI18n() in legacy mode
  messages: globalTranslations
})
```

`globalTranslations` holds `en` and `de` maps (e.g. `Ok`, `Cancel`, `Poll`, `Polls`, and a few
page-specific keys that were promoted to global such as `noPollYet`, `onlyAdminCanCreateNewPolls`,
`createNewPoll`).

The app is then wired as:

```js
const rootApp = createApp({ i18n, router, ...RootApp })
rootApp.use(router)
rootApp.use(i18n)
rootApp.mount("#app")
```

### Planned future config (currently commented out)

`main.js` also keeps a commented-out **Composition-mode** config as a migration target:

```js
/*
const i18n = new createI18n({
  legacy: false,            // required to use the Composition API fully
  locale: "de",
  fallbackLocale: "de",
  strictMessage: false,
  escapeHtml: true,         // XSS-safe interpolation
  escapeParameter: true,
  warnHtmlMessage: false,
  warnHtmlInMessage: 'off',
  missingWarn: false,
  globalInjection: true,    // $t available everywhere without import
  messages: globalTranslations
})
*/
```

> Migration direction: `legacy: false` + `globalInjection: true`, then move component messages to
> `useI18n({ useScope: 'local', messages })`. See `doc/ai/AI-plan migrate to i18n v12.md`.

### No `<i18n>` SFC custom blocks

[`vite.config.js`](../../vite.config.js) only registers `@vitejs/plugin-vue`. There is **no**
`@intlify/unplugin-vue-i18n`, so `<i18n>` **SFC custom blocks are not supported**. "Custom i18n
sections" in this repo therefore means the **`i18n:` component option**, not `<i18n>` blocks.

---

## 2. Pattern A — Options API with the `i18n:` option (the common case)

Most components are Options API and declare a local `i18n:` option. These messages are **merged
with** the global ones and are reachable via `this.$t()` / `$t()` in the template.

```js
// e.g. src/components/poll-card.vue
export default {
  name: "PollCard",
  i18n: {
    messages: {
      de: { numProposals: "0 Vorschläge | 1 Vorschlag | {n} Vorschläge", /* ... */ },
      en: { numProposals: "No proposals | 1 proposal | {n} proposals", /* ... */ }
    }
  },
  // ...
}
```

Files using this pattern include:
`cast-vote.vue`, `poll-card.vue`, `poll-show.vue`, `poll-create.vue`, `proposal-add.vue`,
`login-page.vue`, `login-via-sms.vue`, `join-team.vue`, `forgot-password.vue`, `dev-login.vue`,
`not-found-page.vue`, `polls-footer.vue`, `poll-panel.vue`, `root-app.vue`.
(`polly-create.vue` is the same idea via `export default defineComponent({ i18n: { … } })`.)

Usage in template/script: `{{ $t('key') }}`, `$tc('plural', n)`, `this.$t('key', { param })`.

---

## 3. Pattern B — Composition API (`<script setup>`) using global `useI18n()`

The already-migrated `<script setup>` views call `useI18n()` and depend on **global** messages
(no component-local `i18n:` option present).

```js
// src/views/polls.vue
<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()          // global composer (legacy + allowComposition)
// ...
</script>
```

```js
// src/views/team-home.vue
<script setup>
import { useI18n } from "vue-i18n"
const { t, d } = useI18n()       // t = translate, d = date formatting
// template uses t("gotoPolls"), t("TeamHome"), etc. (keys are GLOBAL)
</script>
```

- In this legacy + `allowComposition` setup, `useI18n()` returns the **global** composer.
- `polls.vue` works because its keys were added to `globalTranslations` in `main.js`.
- Template can use either `$t()` (legacy global injection) or the composer's `t()`.

Files: `src/views/polls.vue`, `src/views/team-home.vue`.

---

## 4. Pattern C — Polly's own translator in `src/polly/polly-i18n.js`

The Polly module keeps its own translations, on purpose: `src/polly/` is self-contained and must not
depend on the rest of the app (see §8b of `doc/liquido-architecture.md`). Messages live in
[`src/polly/polly-i18n.js`](../../src/polly/polly-i18n.js), and components get a `t()` from
`usePollyI18n()`:

```js
// src/components/polly-vote.vue
<script setup>
import { usePollyI18n } from '@/polly/polly-i18n.js'
const t = usePollyI18n()
// template: t('SortProposals'), t('NumBallots', { count: polly.numBallots })
</script>
```

`usePollyI18n()` reads the **app's current locale** from `useI18n().locale` (the global composer, which
works in legacy mode) and falls back to `en` when the i18n plugin isn't installed — so it still works in
a unit test that mounts the component bare. Placeholders are interpolated with the same `{param}` syntax
vue-i18n uses.

> Historical note: an earlier `Polly-vote.vue` had an inline `loc()` helper that **hard-coded** `"de"`.
> That is gone — `usePollyI18n()` follows the real locale. This pattern is only appropriate because of
> Polly's deliberate module isolation; for everything else use Pattern A or B.

---

## 5. The "two `<script>` blocks" pattern for new `<script setup>` files

In **legacy mode** the component-local `i18n:` **option can only live in an Options `<script>`
block** — it cannot be expressed inside `<script setup>`. To keep a component's own message section
*and* write the logic in Composition API, use **both** blocks in the same SFC:

```vue
<template>
  <!-- Template resolves $t() against component-local i18n merged with global -->
  <h2>{{ $t('castVoteTitle') }}</h2>
</template>

<!-- Block 1: plain Options <script> — ONLY carries the component-local i18n messages -->
<script>
export default {
  i18n: {
    messages: {
      de: { castVoteTitle: "Stimme abgeben", /* … */ },
      en: { castVoteTitle: "Cast your vote", /* … */ }
    }
  }
}
</script>

<!-- Block 2: <script setup> — all Composition-API logic -->
<script setup>
import { ref, computed, onMounted, getCurrentInstance } from "vue"
// props, refs, API calls, etc.
</script>
```

### How resolution behaves here (important caveats)

- **Template `$t('key')`** → resolves against the **component-local `i18n` messages merged with
  global**. ✅ This is the reliable path and mirrors the Options-API components.
- **`useI18n().t('key')` inside `<script setup>`** → returns the **global** composer in legacy +
  `allowComposition`, so it generally **does *not* see the component-local `i18n:` messages**. For
  script-side strings, either:
  - keep those specific keys in **global** `main.js`, or
  - read them through the template (`$t`), or
  - build the string from keys that exist globally.
- Order of blocks doesn't matter functionally, but keep the Options `<script>` minimal (messages
  only) so it's clearly "just the i18n section".

> Net effect: the two-block pattern is ideal when the component-local strings are consumed in the
> **template** via `$t()`. Purely script-side local strings are the one rough edge in legacy mode.

---

## 6. Implications for `cast-vote-v2.vue`

- Preferred approach (consistent with the rest of the codebase): use the **two-block pattern** —
  a plain `<script>` with `i18n: { messages: { de, en } }` (copy the `castVote*` keys from the
  existing `cast-vote.vue`) plus a `<script setup>` for logic — and reference strings via `$t()`
  in the template.
  - This **supersedes** the earlier plan note about `useI18n({ useScope: 'local', messages })`,
    which is unreliable under legacy + `allowComposition`.
- For any strings needed in **script** (e.g. building a success/error message for
  `$root.showSuccess/showError`), prefer keys that are already **global**, or expose them via a
  computed that uses the instance proxy (`getCurrentInstance().proxy.$t(...)`).
- `$t()` still works in the template of a `<script setup>` SFC because legacy mode keeps global
  injection for the template.

---

## 7. Quick reference

| Concern | This repo (legacy mode) |
| --- | --- |
| i18n mode | Legacy (`legacy` unset) + `allowComposition: true` |
| Global messages | `globalTranslations` in `src/main.js` |
| Component-local messages | `i18n:` **component option** (Options `<script>`) |
| `<i18n>` SFC blocks | ❌ not supported (no `@intlify/unplugin-vue-i18n` in Vite) |
| Options API translate | `this.$t()`, `$t()`, `$tc()` |
| `<script setup>` translate (current) | `useI18n()` → global `t`/`d`; template `$t()` |
| Local messages in `<script setup>` | **Two blocks**: `<script>{ i18n:{messages} }</script>` + `<script setup>`, use `$t()` in template |
| Custom/manual approach | `src/polly/polly-i18n.js` → `usePollyI18n()` (Polly module only, for isolation) |
| Future migration | `legacy: false` + `globalInjection: true` + `useI18n({ useScope:'local', messages })` |

### Files referenced
- Global config: `src/main.js`, `vite.config.js`
- Options `i18n:` examples: `src/components/poll-card.vue`, `src/views/cast-vote.vue`
- `<script setup>` + global `useI18n()`: `src/views/polls.vue`, `src/views/team-home.vue`
- Polly's own translator: `src/polly/polly-i18n.js`, used by `src/components/polly-vote.vue`
- Migration notes: `doc/ai/AI-plan migrate to i18n v12.md`
