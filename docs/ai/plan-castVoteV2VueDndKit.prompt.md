# Plan: Cast-Vote v2 with Vue DnD Kit

Port `doc/ai/cast-vote-react.tsx` into a new `<script setup>` page `cast-vote-v2.vue`, driving all drag & drop with **`@vue-dnd-kit/core`**. The library is a Vue-native twin of the React `@dnd-kit` — so the port stays faithful: `DnDProvider` ≈ `DndContext`, `makeDraggable`/`makeDroppable` ≈ `useSortable`/`useDroppable`, `DragPreview` ≈ `DragOverlay` (rotation), and `event.helpers.suggestSort('vertical')` replaces the manual `arrayMove`/slot logic. Bootstrap styling; standard `poll-card.vue` on top and `liquido-footer.vue` at the bottom.

## Library API mapping

| React `@dnd-kit` | Vue DnD Kit v2 |
|---|---|
| `DndContext` | `<DnDProvider>` |
| `useSortable` / `useDraggable` | `makeDraggable(ref, opts, payload)` |
| `useDroppable` | `makeDroppable(ref, opts, payload)` |
| `<DragOverlay>` + rotation | `<DragPreview>` + CSS/custom render |
| `arrayMove` / reorder logic | `event.helpers.suggestSort('vertical')` |
| `overSlotIndex` highlight | `isDragOver` placement from make* |

- `yarn add @vue-dnd-kit/core`. Peer dep Vue 3 (app has 3.5.21). No vite plugin / no global registration.
- `<DnDProvider>` wraps subtree needing DnD (wrap the page, not whole app). Has `#preview` slot.
- `makeDraggable(ref, options?, payload?)`:
  - options: disabled, groups, id, dragHandle (css sel), activation {distance, delay}, events, render (overlay comp).
  - payload `() => [index, itemsArray]` → populates event.draggedItems[].{index,item,items}.
  - returns: isDragging, isDragOver (IPlacement {top,right,bottom,left,center}), isAllowed, selected.
- `makeDroppable(ref, options?, payload?)`:
  - options: disabled, groups, events {onEnter,onDrop,onLeave}.
  - payload `() => itemsArray`.
  - returns: isAllowed, isDragOver (IPlacement).
  - onDrop event: draggedItems, dropZone{items,placement}, hoveredDraggable{items}, helpers, provider.
- `event.helpers.suggestSort('vertical')` → { sourceItems, targetItems, sameList }. Cross-list pattern: update source from result.sourceItems; if !sameList, update target from result.targetItems. Identify lists by `srcItems === proposalsInBallot.value`.
- `<DragPreview>` = floating overlay (class `.dnd-kit-preview`). Rotation → GLOBAL CSS on inner clone `.dnd-kit-preview > * { transform: rotate(2deg) scale(1.02); box-shadow }`. Do NOT override transform on `.dnd-kit-preview` root (used for translate positioning).
- `makeAutoScroll` available (optional, for auto-scroll near edges on long lists / mobile).

## Confirmed decisions (from user)
- New file `src/views/cast-vote-v2.vue` + new route (keep old cast-vote.vue).
- Full working page: real API (getPollById, getMyBallot, getVoterToken, castVote, verifyBallot), checksum.
- Reuse existing app i18n keys (de/en) — copy the castVote* messages from old page.
- Use vue-dnd-kit library (@vue-dnd-kit/core) for all DnD.

## Data model
- `proposalsInBallot` = ref([]) of proposal OBJECTS (rank = index+1).
- `availableProposals` = ref([]) of proposal OBJECTS (pool).
- totalSlots = poll.proposals.length. Empty slots rendered for indices [ballot.length .. totalSlots-1].
- voteOrderIds = proposalsInBallot.map(p => p.id) for castVote.
- Proposal shape: { id, title, icon, numSupporters, likedByCurrentUser, createdBy:{name,id}, status, description }.

## Steps
1. **Deps** — `yarn add @vue-dnd-kit/core` (no vite plugin / no global registration needed; Vue 3 peer dep already satisfied).
2. **Route** — add `castVoteV2` → `/polls/:pollId/castVoteV2` in `router.js` (`props: true`), old `castVote` route untouched.
3. **View skeleton** — new `cast-vote-v2.vue`: port the state + `created()` API chain from `cast-vote.vue` (load poll, existing ballot, cast vote, verify checksum). `$root.showSuccess/showError/scrollToTop` via `getCurrentInstance().proxy.$root`. i18n via local `useI18n({ useScope:'local', messages })` copying the `castVote*` keys.
4. **Draggable item** — new `cast-vote-proposal-card.vue` (a component is required since `makeDraggable` can't run inside a parent `v-for`). Props: `proposal, index, items, variant('ballot'|'pool'), rank`. makeDraggable(root, {groups:['proposals'], activation}, () => [index, items]). Dims via `isDragging`, shows drop indicator via `isDragOver` placement, emits `remove`. Ballot variant = rank-circle + title/subtitle + grip + X remove. Pool variant = icon + title/subtitle + grip.
5. **Layout (Bootstrap)** — page title → loading spinner → `<poll-card :show-arrow-right="false">` → "Dein Stimmzettel" heading+subtitle → **ballot droppable zone** (filled items via v-for + numbered empty slots) → up-arrow hint (optional) → "Verfügbare Vorschläge" divider → **pool droppable zone** → info/checksum alerts → `<liquido-footer>` with `#info` + `#primary` cast-vote button. *depends on 3, 4*.
6. **Wire drop zones** — `makeDroppable(ballotRef, {groups:['proposals'], events:{onDrop: applySort}}, () => proposalsInBallot.value)` and same for poolRef; `applySort` runs `suggestSort('vertical')` and updates both arrays (cross-list pattern from the library's Sorting Lists example). Zone highlight via `isDragOver`. *depends on 5*.
7. **Drag overlay** — `<DragPreview>` in the provider `#preview` slot + **global** CSS rotating/scaling the clone (`rotate(2deg) scale(1.02)` + shadow) to match the React tilt.
8. **CSS port** — translate `doc/ai/cast-vote-react-styles.css` receipt/slot/pool visuals to Bootstrap + liquido vars (`--primary`, `--unit`, `--liquido-border-radius`, `--secondary`, `--proposal-icon-bg`, `--light-bg`, `--header-bg`, `--font-size-small`), reusing patterns from the old page's `<style>`; drop the Tailwind oklch tokens + dark mode.

## Relevant files
- `src/views/cast-vote-v2.vue` *(new)* — provider, zones, ported API logic, poll-card, footer, DragPreview.
- `src/components/cast-vote-proposal-card.vue` *(new)* — `makeDraggable` item wrapper (both variants).
- `src/services/router.js` (~line 86) — add `castVoteV2` route.
- `src/views/poll-show.vue` (near line 41 goToCastVoteButton) — optional temporary link to reach v2 for testing.
- `package.json` — dependency @vue-dnd-kit/core (via yarn add).
- Reused unchanged: `src/components/poll-card.vue`, `src/components/liquido-footer.vue`, `api`, `store`.
- `$root` helpers (showSuccess/showError/scrollToTop) in `<script setup>`: use `getCurrentInstance().proxy.$root`.

## Verification
1. `yarn dev` (https://localhost:3001), navigate `/polls/:id/castVoteV2` (poll in VOTING).
2. Pool→ballot drag: item moves, gains a rank, leaves pool; rotated overlay while dragging; drop-position indicator + zone highlight show.
3. Reorder within ballot (suggestSort vertical). Drag ballot→pool removes it (rank renumbers).
4. Remove (X) on ballot item returns it to pool.
5. Cast/update vote → api.getVoterToken + castVote; success modal; checksum button + verify works.
6. poll-card renders at top; liquido-footer standard with working cast button (disabled when ballot empty / not VOTING).
7. Mobile/touch: drag works, page still scrolls (activation delay or dragHandle). `yarn test:unit` still green.
8. Old cast-vote.vue + /castVote route untouched.

## Further considerations
1. **Slot behavior** — (A, recommended) library-native list sorting: filled rows show rank 1..N, empty numbered slots are visual affordances, drop position shown by placement indicator. (B) faithful React fixed-slot dropping (each empty slot its own droppable) — more custom, works against the library's model.
2. **Overlay tilt** — (A, recommended) CSS rotate/scale on the cloned `DragPreview`. (B) custom `#preview` component rendering the card for pixel-perfect control.
3. **Mobile activation** — use `activation: { delay: 150, distance: 5 }` (mirrors the React `TouchSensor`) and/or a grip `dragHandle` so vertical scrolling still works on touch.

## Excluded scope
- Old cast-vote.vue and its route stay as-is.
- React's custom drag-hint animation + IntersectionObserver (drop or simplify) — excluded unless requested.
- Tailwind oklch design tokens, dark mode.
