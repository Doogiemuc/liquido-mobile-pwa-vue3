Updated todo list

Recommended migration path: do it in two stages, not a big-bang jump.

1. Stabilize on Vue-i18n 9 while you migrate components
- Keep your current major for now in package.json.
- Your current bootstrap in main.js is still in legacy-style setup (Options API friendly), and you already have a commented composition-mode config there, which is a great migration hint.
- Goal of this phase: convert components incrementally without changing runtime mode yet.

2. Stop creating new Options API i18n usage
- For any new page/component (like your newer composition files), use useI18n directly.
- Avoid adding new component-local i18n blocks in Options API style.
- This prevents deeper legacy lock-in while old pages continue to work.

3. Migrate component-by-component to composition i18n calls
- For each component, replace this.$t usage patterns with composition usage.
- Start with leaf pages/components first (few dependencies), then shared/layout components.
- Keep behavior identical; do not redesign text keys during this step.

4. Centralize messages before the final cutover
- Move scattered local messages into shared locale modules gradually.
- Keep key names stable, and add a simple key-naming convention now.
- This reduces breakage when legacy mode is removed.

5. Run a bridge cutover on Vue-i18n 9 first
- Flip your app config in main.js to composition mode (legacy false) while still on v9.
- Fix all runtime/template issues in this mode first.
- This is the critical safety step: if you pass here, v12 upgrade is mostly package/API cleanup, not architecture shock.

6. Upgrade to v12 only after the app is composition-clean
- Once all pages work without legacy APIs, then move dependency to v12 in package.json.
- Expect some API/typing cleanup, but much lower risk than upgrading first.
- Validate route-by-route smoke tests and core auth/poll/vote flows.

Practical order for your repo
- First migrate modern pages (you already started, e.g. polls.vue, team-home-v2.vue).
- Then migrate older high-traffic Options pages like login/polls details/cast vote.
- Last migrate root/layout and shared components.

Why this path is safest
- You separate two risks:
1. Paradigm migration (Options -> Composition)
2. Library major upgrade (9 -> 12)
- Doing them together makes failures hard to diagnose.
- Doing them sequentially gives you quick rollback points and smaller PRs.

If you want, I can draft a concrete migration checklist for your top 10 components in this repo (in recommended order), with exact “before/after” patterns for each one.


# ============= Migration PLAN =====================

Updated todo list

I’ll quickly scan the repo for components still using Options API and legacy i18n patterns, then I’ll give you a concrete prioritized migration checklist tied to real files.

Searched for regex `export default\s*\{` (`**/src/**/*.vue`), 23 results

Searched for regex `this\.\$t\(|\$t\(|i18n:\s*\{` (`**/src/**/*.vue`), 200 results

Searched for text `<script setup>` (`**/src/views/**/*.vue`), 3 results

Perfect. I scanned your codebase and you now have a clear, low-risk migration queue.

Progress update:
- Options API is still dominant across views/components.
- Only a few views are already on script setup: polls.vue, team-home-v2.vue, _design-overview.vue.
- There is already one composition-style pitfall in team-home-v2.vue: this.$t and this.inviteLinkURL are used inside script setup (that will break once you cut over).

What’s next:
- Use the checklist below as your migration backlog.
- Finish this backlog on vue-i18n 9 first, then switch runtime mode, then upgrade to 12.

**Migration Checklist (Top 10, in order)**
1. root-app.vue
Reason: app shell, global popup, navigation transitions, most shared i18n dependencies.
Target: remove component-local Options i18n block and make script-side messages use composition helpers only.

2. liquido-header.vue
Reason: appears on nearly every page.
Target: remove script-side this.$t usage and migrate to composition pattern.

3. liquido-footer.vue
Reason: shared global navigation footer.
Target: composition-safe translation calls and props text handling.

4. liquido-input.vue
Reason: reused by login, join, create, reset flows.
Target: standardize validation/error text retrieval via composition i18n.

5. poll-card.vue
Reason: used in central poll listing and team home voting strip.
Target: replace pluralization usage with composition-safe calls.

6. poll-panel.vue
Reason: poll detail rendering is core flow and translation-heavy.
Target: convert computed labels to composition i18n helpers.

7. login-page.vue
Reason: highest traffic auth screen, lots of error text and script-side translation.
Target: replace all this.$t error-building with composition t calls.

8. cast-vote.vue
Reason: core product value flow; heavy script-side status and success/error strings.
Target: move message assembly and plural text to composition helpers.

9. poll-show.vue
Reason: central poll lifecycle actions (start/finish voting).
Target: composition-safe text in computed/method branches.

10. welcome-chat.vue
Reason: onboarding and team creation/joining, many local messages.
Target: migrate local message usage and script-side prompts.

**Pattern To Apply In Every Converted File**
- In script setup, use useI18n and never use this.$t, this.$d, this.$n.
- Keep template translation syntax stable while migrating, but remove script-side this usage.
- For plural text, move away from legacy-only helper patterns and use composition-compatible calls.
- Keep keys unchanged during migration. Rename keys only after cutover.

**Bridge Strategy (Your Exact Path)**
1. Stay on vue-i18n 9 while doing the 10-file migration.
2. Enforce rule: no new Options API i18n blocks.
3. After backlog, switch i18n runtime to composition mode in main.js.
4. Fix remaining runtime issues.
5. Upgrade dependency in package.json to v12.
6. Run smoke tests on login, team, polls, cast-vote, and poll lifecycle flows.

**Immediate Fix You Should Do Now**
- team-home-v2.vue has script setup code using this.$t and this.inviteLinkURL.  
That should be converted immediately to composition-safe calls so this file is future-proof before you proceed with the wider migration.

If you want, I can now generate a component-by-component done checklist with concrete search/replace targets for each of the 10 files (very actionable, PR-ready).