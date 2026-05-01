# Parliament V2 — Phase 1 Testing Checklist

**Status:** Living document. Add to it as PRs land; check items off as they're verified.
**Audience:** Whoever is doing manual verification of a Phase 1 PR — usually after merge, before showing to others.
**Companion doc:** [phase-1-pr-plan.md](phase-1-pr-plan.md) defines each PR's exit criteria; this doc is the concrete walk-through that proves them.

How to use:
- Each PR has its own section: **Surface** (where to look), **Setup** (any data prerequisites), **Steps** (numbered, do these in order), **Expected** (what passing looks like).
- Items prefixed `[ ]` are pending. Tick them off in your fork or tracker; do not commit ticks to main without other reviewers seeing the run.
- PRs marked **🧱 Foundation** have no user-visible surface — they're verified via dev-only routes or by confirming later PRs work.
- PRs marked **👀 User-visible** are the ones to demo.
- "Fresh Parliament" means: open DevTools → Application → Storage → Clear site data → reload. (Or use a private window.) Do this before any test that needs a clean state.

---

## PR-0 — Documentation foundation

🧱 Foundation. No code. Verify the five canonical docs are on `main`:

- [ ] `refactor/v2-phase1-audit.md` exists
- [ ] `refactor/tier-classification.md` exists
- [ ] `refactor/phase-1-pr-plan.md` exists
- [ ] `refactor/glossary.md` exists
- [ ] `refactor/data-migration.md` exists

---

## PR-1 — Mode file format + IndexedDB v4

🧱 Foundation. Schema migration; nothing renders from it yet.

**Surface:** DevTools → Application → IndexedDB → `parliament` database.

**Setup:** A pre-PR-1 install (DB at v3) helps prove the migration. If you only have a fresh install, you'll see v4 directly.

**Steps:**
1. Open DevTools → Application → IndexedDB → `parliament`.
2. Confirm the database **version is 4**.
3. Confirm these stores exist (in addition to v1–v3 stores):
   - `modes`
   - `libraryLayouts`
   - `libraryRooms`
   - `libraryComponents`
   - `librarySchemes`
   - `libraryResources`
4. Open `libraryLayouts`. Should have 7 entries: 5 with `status: "available"` (three-panel, canvas-centric, document-centric, single-column-with-sheet, stacked-sections) and 2 with `status: "coming-soon"` (reading-pane, split-view).
5. Open `conversations` (if any exist). Every record should have a `room` field (value can be `null`).
6. Reload the app. Existing chats render normally — no behavior change vs. pre-PR-1.

**Expected:** All the new stores exist; layouts seeded; existing data untouched.

---

## PR-1b — Seed parliament@1.0 scheme and homepage mode

🧱 Foundation.

**Setup:** Fresh Parliament (or upgrade from PR-1).

**Steps:**
1. DevTools → IndexedDB → `librarySchemes`. Should have `parliament@1.0` with a populated `variants` snapshot (light / dark / hc-light / hc-dark).
2. Open `modes`. Should have one record with `id: "home_default"` and `scope: "homepage"`.

**Expected:** Both seeds present. Idempotent — reloading doesn't double-seed.

---

## PR-2 — Catalog scaffolding + first 3 entries

🧱 Foundation. Dev-only route.

**Surface:** `/catalog` (only available in `npm run dev`, not in production builds).

**Steps:**
1. `npm run dev` and open `/catalog`.
2. Page lists three entries: `messages@1.0`, `input@1.0`, `toc@1.0`.
3. Each entry shows its tier, slot targets, config schema fields.
4. Try the production build: `npm run build && npm run preview`. Visit `/catalog` — should 404 or fall through to homepage (route not registered in prod).

**Expected:** Dev-only catalog inspector works; production build doesn't ship the route.

---

## PR-3 — Mode reducer + `<RoomShell>` + hostAPI bus

🧱 Foundation. Dev-only verification.

**Surface:** `/catalog` debug route, plus a hand-built mode demo.

**Steps:**
1. In dev, navigate to the catalog debug surface.
2. Find the working chat demo rendered through `<RoomShell>`.
3. Open DevTools console. Watch for `hostAPI` debug logs when interacting with the demo.
4. Production routes (`/`, `/chat/:id`, `/settings`) still load via the V1 adapter routing — confirm by checking that an existing chat at `/chat/:id` opens normally.

**Expected:** RoomShell renders a working chat in dev. Production paths unchanged.

---

## PR-4a — Gold palette + a11y variants

👀 User-visible.

**Surface:** Every page; `/settings` for theme switching.

**Steps:**
1. Open the app at `/`. Default scheme should be Parliament (warm gold accents, no cold blue).
2. Open `/settings`. Toggle the theme between light and dark — colors swap, no broken contrast.
3. Mac: System Settings → Accessibility → Display → Increase Contrast. Reload. App should switch to a high-contrast variant. Toggle back off → reverts.
4. Mac: System Settings → Accessibility → Display → Reduce Motion. Reload. Framer Motion springs should collapse to instant transitions.
5. Spot-check copy: section labels are sentence case (no "Title Case Headings"), no em-dashes (`—`), wording uses "rooms" where appropriate.

**Expected:** Four parliament variants pass WCAG AA. Reduced-motion respected. No cold blue accent anywhere outside the Fresh Teal placeholder.

---

## PR-4b — 5 additional schemes + new token groups

👀 User-visible (once a scheme picker exists; for now via dev tools).

**Surface:** `/settings` → scheme picker, or DevTools.

**Setup:** Pick a place where the scheme can be applied. Scheme picker UI lands later — for now switch via `setSetting('scheme', '<id>')` in the console, then reload.

**Steps:**
1. DevTools → IndexedDB → `librarySchemes`. Confirm 6 schemes: `parliament@1.0`, `cool-bright`, `deep-calm`, `soft-violet`, `fresh-teal`, `amber-glow`. Each with 4 variants.
2. Apply each scheme one at a time. Every variant should:
   - Render readable text on backgrounds (AA contrast)
   - Have sensible blueprint tokens (`--bp-*`) — visible if you scrub the homepage blueprint section
   - Have sensible data-series tokens (`--token-data-series-1` through `-5`) — visible in any chart
3. Switch back to `parliament@1.0`.

**Expected:** All 6 schemes selectable; all 4 variants per scheme pass a11y.

---

## PR-5 — Shell-side catalog primitives

🧱 Foundation, mostly. Components are registered but the message-actions wiring is the user-visible bit.

**Surface:** Any chat conversation at `/chat/:id`.

**Setup:** A chat with at least one assistant message.

**Steps:**
1. Open a chat. Hover over an assistant message. The per-message action menu should appear.
2. Confirm these actions are present:
   - "Highlight selection" (from `highlights@1.0`)
   - "Add note here" (from `notes@1.0`)
   - "Branch from here" (from `branches@1.0`)
3. Click "Highlight selection". Select some text. The highlight should save and re-appear on reload.
4. Click "Add note here". Type a note. Save. Reload. Note should persist.
5. Click "Branch from here". Branch creation panel opens (the V2 panel from `branches@1.0`).
6. In dev, open `/catalog` and confirm all 8 PR-5 components render and validate.

**Expected:** Message action menu items come from catalog contributions. Each action works end-to-end.

---

## PR-6 — Homepage components + new homepage at `/`

👀 User-visible. **Demo target.**

**Surface:** `/` (new homepage), `/chats` (V1 selector preserved).

**Setup:** A few existing chats (5+ ideal) so the homepage feels populated. Bonus: a couple of branches.

**Steps:**

**Top bar:**
1. Open `/`. Top bar shows: Parliament mark, Edit homepage (disabled, "Editor coming soon" tooltip), + Build a room (disabled gold, "Builder coming soon"), Backup & Restore icon, settings gear.
2. Hover the disabled buttons — tooltips appear.
3. Click the settings gear → routes to `/settings`.

**Sections (4 by default):**
4. Homepage shows 4 sections in stacked-sections layout: **Blueprint**, **Chats**, **Library**, **Favorites**.

**Blueprint:**
5. Blueprint section renders without errors. If you have rooms, you see room outlines; otherwise, an empty state.

**Chats:**
6. Chats section shows the V6 selector inline (search, sort, view toggle Summary / Notes / Highlights / Branches).
7. Hovering a chat row in Chats glows the corresponding room on the Blueprint above (cross-section bus event from PR-3).
8. Clicking a chat title routes to `/chat/:id`.
9. Click "+ Add a note" inline → editor opens.
10. Bulk-select via checkboxes; bulk action bar appears.

**Library:**
11. Library section shows 5 tabs: **Rooms**, **Layouts**, **Components**, **Schemes**, **Resources**. (No "Sections" tab — hidden in Phase 1.)
12. Click Resources. 6 placeholder cards visible, each marked "coming soon".
13. Click a Resources card → read-only preview overlay opens.

**Favorites:**
14. Favorites section renders. Empty state if no favorites; otherwise shows saved snippets.

**V1 fallback:**
15. Visit `/chats`. The original V1 chat selector loads (table view).

**Expected:** New homepage renders with 4 sections; cross-section bus works (chat row → blueprint glow); V1 selector preserved at `/chats`.

---

## PR-7 — Backup & restore in V2 format

👀 User-visible. **Pause point** — verify thoroughly before Wave C.

**Surface:** Top-bar Database icon button on `/`, proactive banner on `/`, `Settings → Data & Backups`, Cmd+Shift+B from anywhere.

### Setup
- A Parliament with realistic data: ~5 chats with several messages each, at least 1 highlight + 1 note + 1 favorite, optionally 1 branch and 1 Pelican file upload.
- Make sure the homepage has been touched once (so `home_default` exists).

### Backup pane

**Modal entry points:**
- [ ] Click the Database icon in the top bar → modal opens to Backup tab.
- [ ] Press `Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Win) → modal opens to Backup tab from any route.
- [ ] `/settings` → Data & Backups → "Backup & restore" card → button opens the modal.

**Recommended "Everything" card:**
- [ ] Card shows accurate counts: chats, rooms, library items, total storage used.
- [ ] Click "Back up everything" → file downloads as `parliament-backup-YYYY-MM-DD.parliament`.
- [ ] Open the downloaded file in a text editor → JSON readable, contents structured per spec §3.2 (`format`, `version`, `createdAt`, `parliamentVersion`, `source`, `encrypted: false`, `manifest`, `contents.{chats, annotations, rooms, homepage, library, preferences}`).
- [ ] Toast: "Backed up to parliament-backup-2026-04-30.parliament". Modal closes after ~700ms.

**Custom categories:**
- [ ] Uncheck Annotations, Library, and Preferences. Click Create backup.
- [ ] Open downloaded file → `contents` only contains the checked keys. Unchecked keys are entirely absent (not empty arrays).

**Password protection:**
- [ ] Toggle "Password-protect this backup" on. Field appears with warning.
- [ ] Enter a password ≥8 chars. Click Create backup → file downloads as `parliament-backup-YYYY-MM-DD-encrypted.parliament`.
- [ ] Open the file in a text editor → no readable contents; `payload` is base64; `encryption.iterations: 210000`, `encryption.algorithm: "AES-GCM"`, `encryption.kdf: "PBKDF2-SHA256"`.
- [ ] Try a password <8 chars → toast warns, no download triggered.

**Filename de-duping:**
- [ ] Run two backups in the same calendar day. Second filename has `-2` suffix.

### Restore pane

**Drop / browse:**
- [ ] Open Restore tab. Drag the unencrypted backup onto the drop zone → preview appears showing created date, version, contents counts.
- [ ] Click "browse files" → file picker opens, selecting the backup loads it into the preview.
- [ ] Try a non-backup file (e.g., random `.txt`) → clear error: "This file is not a valid Parliament backup."
- [ ] Try a malformed JSON file → same error.

**Encrypted restore:**
- [ ] Drop the encrypted backup. Preview shows "Encrypted: yes — enter password below".
- [ ] Enter the wrong password → red error toast: "Incorrect password. Try again."
- [ ] Enter the correct password → preview unlocks with counts visible.

**Merge strategy (default):**
- [ ] In a fresh Parliament: drop an unencrypted backup, leave Merge selected, click Restore. App reloads. All chats/rooms/etc. from the backup are present.
- [ ] In a Parliament that already has the backup's contents: re-import the same file. Toast reports "X added, Y already existed, skipped." Existing data not duplicated.
- [ ] Backup contains a chat whose ID matches one already in IndexedDB but with different content: imported chat is renamed `(from backup)`, original kept.

**Replace strategy:**
- [ ] Switch to Replace. Red warning block appears with REPLACE input.
- [ ] Type "replace" (lowercase) → action button stays disabled.
- [ ] Type wrong text → button stays disabled.
- [ ] Type "REPLACE" → button enables.
- [ ] Click Replace everything → app wipes IndexedDB and reloads with backup contents only.

**Undo (Replace only):**
- [ ] After a Replace completes: undo toast appears at the bottom with countdown.
- [ ] Click "Undo restore" before 60s expires → Parliament reverts to pre-replace state, reloads.
- [ ] Wait 61s → toast disappears; backup is permanent.

### V1 backup migration

**V1 `.apb` (encrypted, 100k iterations):**
- [ ] If you have an existing V1 .apb backup: drop it. Preview shows "Legacy V1 encrypted backup (.apb)".
- [ ] Enter the V1 passphrase → contents unlock; restore works (merge or replace).

**V1 `.json` (plaintext export):**
- [ ] If you have a V1 .json export: drop it. Preview shows "Legacy V1 plaintext backup — will be migrated to V2 format on restore".
- [ ] Restore works.

### Threshold banner

The banner shows on `/` when **all** of:
- ≥5 chats OR ≥2 rooms OR account ≥7 days old
- Last backup was >30 days ago OR never
- Banner not dismissed in last 30 days

**Steps to verify:**
- [ ] Fresh Parliament with no chats: banner does **not** appear.
- [ ] Add 5+ chats. Reload `/`. Banner appears (gold-tinted, "Your Parliament lives in this browser").
- [ ] Click "Create a backup" → modal opens to Backup tab.
- [ ] Successfully back up → banner disappears immediately and stays gone.
- [ ] DevTools → IndexedDB → `settings`: `backupBannerDismissedAt` and `backupLog` records present.
- [ ] To force the banner back for testing: delete `backupLog` and `backupBannerDismissedAt` from settings, reload.

**Banner dismissal:**
- [ ] Click the X to dismiss. Banner hides. Reload — stays hidden.
- [ ] To verify 30-day cadence: edit `backupBannerDismissedAt` value to 31 days ago, reload — banner reappears.

### Top-bar status indicator

- [ ] Never backed up + account <7 days old → gold dot, "Never backed up".
- [ ] Never backed up + account ≥7 days old → amber dot.
- [ ] Last backup <14 days ago → gold dot, "Backed up N days ago".
- [ ] Last backup 14–44 days ago → amber dot.
- [ ] Last backup ≥45 days ago → red dot.
- [ ] Hover the indicator → tooltip with exact date.
- [ ] Click the indicator → modal opens to Backup tab.

To test thresholds, edit `backupLog` in settings to set an older `backedUpAt`, reload.

### Modal mechanics

- [ ] ESC closes the modal (any tab, any state).
- [ ] Clicking the backdrop closes the modal.
- [ ] Tab key cycles through interactive elements within the modal.
- [ ] Drop zone accepts keyboard activation (Enter / Space) for screen-reader users.

### Edge cases

- [ ] Backup during an active streaming response → no corruption; messages saved correctly.
- [ ] Large backup (100+ chats) → progress feels responsive; UI doesn't freeze for seconds.
- [ ] Corrupt encrypted file (truncated) → clear error message.
- [ ] Backup file with `version: 99` (manually edited) → "This backup was created by a newer version of Parliament. Please update to restore it."

---

## PR-8 — Three-rail editor

👀 User-visible. **Demo target.** Largest single feature in Phase 1.

**Surface:** `/edit/:roomId` (room editing) and `/edit-home` (homepage editing).

### Setup
- A homepage with the four default sections (any Parliament that's been opened on `/` once).
- For room editing: a saved mode in the `modes` IndexedDB table. None ship by default in Phase 1 — until PR-9 seeds room templates, you can create one by hand in DevTools or via the dev `/catalog` route's mode tooling.

### Entry points

- [ ] Top-bar **Edit homepage** button on `/` → opens `/edit-home`.
- [ ] Manually navigating to `/edit-home` loads the user's homepage mode for editing.
- [ ] Manually navigating to `/edit/<roomId>` loads that mode for editing. Bad ids show "Couldn't open the editor".

### Top bar

- [ ] Back arrow returns to `/`.
- [ ] "Editing" crumb visible.
- [ ] Room name input is inline-editable; typing updates the right-rail "Room" header live.
- [ ] Device chip toggles between Desktop and Mobile (writes `mode.deviceClass`).
- [ ] Scheme chip shows the current scheme's name and swatch.
- [ ] **Preview** button is disabled with tooltip "Preview launches with PR-9".
- [ ] **Save** disables when there are no unsaved changes (Save is greyed if `dirty=false`).
- [ ] **Build** is enabled when the holding tray is empty; disables to a "ghost" state when the tray has items.

### Left rail — Layouts

- [ ] Three tabs visible: Layouts, Components, Schemes.
- [ ] Layouts tab lists scope-appropriate layouts:
  - Room editor → `three-panel`, `canvas-centric`, `document-centric`, `single-column-with-sheet`. (`reading-pane` and `split-view` show "Soon" pill, can't be dragged.)
  - Homepage editor → only `stacked-sections`.
- [ ] Active layout shows an "Active" pill, can't be dragged.

### Left rail — Components

- [ ] All registered components listed (~17 entries).
- [ ] Components currently placed in the room show a "Placed" pill at reduced opacity.
- [ ] Cards are draggable by the body (cursor changes to grab).

### Left rail — Schemes

- [ ] All six V2 schemes listed with swatch.
- [ ] Active scheme shows an "Active" pill.

### Center canvas — selection

- [ ] Click empty canvas background → right rail shows "Room" with name / device class / scheme fields.
- [ ] Click a slot's border → right rail shows the slot label and capacity hint.
- [ ] Click a placed component → right rail shows that component's configSchema fields.
- [ ] Press Esc → selection returns to "Room". Esc inside a focused input does NOT trigger deselect.

### Center canvas — layouts

- [ ] Three-panel rendering matches the mockup geometry: 18% left rail / center / 24% right rail, input dock under center.
- [ ] Stacked-sections rendering shows vertical sections.
- [ ] Other layouts (canvas-centric, document-centric, single-column-with-sheet) fall back to a labeled grid with the diagnostic "This layout's runtime renderer ships in a later PR" — drops still work.

### Drag-and-drop — components

- [ ] Drag a Component card onto an empty slot → component lands; right rail auto-selects it.
- [ ] Drag a Component card onto a slot with content → component appends (stack-capacity slots) or replaces (single-capacity — verify the new instance shows up).
- [ ] Drag an already-placed component (clicking it on the canvas does NOT initiate a drag — the drag has to start from the left-rail card; this is a PR-8 limitation).
- [ ] Drop a Component on the empty canvas (not a slot) → toast: "Drop a component on a specific slot, not the canvas."

### Drag-and-drop — schemes

- [ ] Drag a Scheme card onto the canvas → scheme applies; toast confirms; top-bar chip updates.
- [ ] Dropping the active scheme is a no-op (toast: "That layout is already active." for layouts; for schemes the apply is idempotent).

### Drag-and-drop — layouts

- [ ] Drag a Layout card onto the canvas → migration dialog appears.
- [ ] Dialog title: "Switch to {layout name}?"
- [ ] Subtitle accurately reports orphan count vs. clean migration count.
- [ ] Each placed component appears in the dialog with either an arrow to its destination slot, or a gold-tinted "Holding tray ({reason})" row.
- [ ] **Cancel** discards the swap; canvas unchanged.
- [ ] **Switch layout** confirms; canvas re-renders against the new layout.
- [ ] Dropping the currently active layout → toast: "That layout is already active." No dialog opens.
- [ ] Esc inside the dialog cancels.

### Holding tray

- [ ] After a layout swap that orphans components, the gold tray appears below the canvas.
- [ ] Each chip shows the component's display name.
- [ ] Hovering a chip shows the orphan reason as a tooltip.
- [ ] Build button disables: tooltip "Empty the holding tray first".
- [ ] **X** on a chip removes it without re-placing.
- [ ] Drag a chip onto a slot → component re-enters the room at that slot; chip leaves the tray.
- [ ] When tray is empty, Build re-enables.

### Right rail — Room fields

- [ ] Name field bound to the top-bar name input.
- [ ] Device class segmented control toggles `mode.deviceClass`.
- [ ] Scheme select shows all six schemes; picking one updates the canvas live.

### Right rail — Slot fields

- [ ] Capacity hint matches the slot's declared capacity ("multiple components, stacked" vs "one component").

### Right rail — Component configSchema

For at least three different components (e.g. `messages`, `context`, `input`), verify:

- [ ] Boolean fields render as toggles.
- [ ] Number fields render as number inputs.
- [ ] Enum fields render as a segmented control (≤4 options) or select (>4).
- [ ] String fields render as text inputs.
- [ ] Changing a field updates the saved config (verify in DevTools after save).
- [ ] **Remove from spot** button removes the component; right rail returns to "Room".

### Homepage editor — section metadata

When editing a section component on `/edit-home`:

- [ ] "Section title" and "Section meta line" fields appear above the regular configSchema fields.
- [ ] Editing them updates `config.section.title` / `config.section.meta` in the saved mode.
- [ ] The homepage at `/` reflects the updated titles after Save + reload.

### Save round-trip

- [ ] Save persists the mode to IndexedDB. Save toast appears; dirty flag clears.
- [ ] Reload the editor → all configuration choices preserved (selection, layout, components in their slots, scheme).
- [ ] Open a chat / homepage that uses this mode → live render matches editor configuration.

### Selection model edge cases

- [ ] Removing the currently-selected component returns selection to "Room".
- [ ] After a layout swap, selection is reset to "Room" (orphaned-component selection would be confusing).
- [ ] Clicking on a placed component inside a slot stops propagation (the slot doesn't also get selected).

### Known limitations to verify (and not flag as bugs)

- [ ] Layouts other than `three-panel` and `stacked-sections` show the labeled-grid fallback canvas. This is expected until PR-9 lands runtime entries.
- [ ] **Preview** button is permanently disabled (tooltip says PR-9).
- [ ] **Build** is currently equivalent to Save (no separate ignition flow until PR-9).
- [ ] Undo / redo arrives in PR-8b (verify in that section).

---

## PR-8b — Editor undo / redo

👀 User-visible. Small feature; quick test.

**Surface:** `/edit/:roomId` and `/edit-home`. Same editor as PR-8.

### Setup
- Same as PR-8.

### Steps

- [ ] Top bar shows undo / redo affordance (small back / forward arrows next to Save).
- [ ] Place a component → press Cmd+Z (Mac) / Ctrl+Z (Win) → component removed.
- [ ] Press Cmd+Shift+Z (or Cmd+Y on Win) → component re-placed.
- [ ] Make 20+ varied edits (place, move, remove, swap layout, change config). Undo each in reverse order; redo each in forward order. State matches at every step.
- [ ] Inside a focused text input, Cmd+Z performs the input's native undo, NOT the editor's.
- [ ] Save the mode. Undo still works after save (history not cleared).
- [ ] Reload the page. Undo history is empty (session-scoped, per spec).

---

## PR-9 — Wizard + template gallery + ignition + layout runtimes + Preview

👀 User-visible. Largest single PR after PR-8 — exercises every builder path.

**Surface:** `/build` (entry, gallery, wizard) and the editor's Preview button. Also the homepage's "+ Build a room" button (now wired) and the editor canvas (live-geometry now available for canvas-centric / document-centric / single-column-with-sheet).

### Setup
- A signed-in browser with at least one available template (the seed runs on every `initDB()` call).

### Path A — homepage entry & template gallery

- [ ] On `/`, the **+ Build a room** button is enabled (no longer disabled with a "PR-9" tooltip).
- [ ] Clicking it routes to `/build`.
- [ ] `/build` shows the breadcrumb "Build a room" in the topbar and the heading "What kind of room do you want to build?"
- [ ] Five available templates appear: Writing Studio, Data Workspace, Drafting Desk, Pocket Chat, Quiet Room.
- [ ] Two coming-soon templates appear with a "Coming soon" pill: Kingfisher, Starling.
- [ ] Available cards have a colored icon tile; coming-soon cards are slightly faded.
- [ ] Click a coming-soon card → a read-only preview overlay opens, with the description and a note about which layout it uses. No "use" button. Esc / X closes.
- [ ] Click an available card (e.g. Writing Studio) → routes to `/edit/:newId` with the editor open on the new room. The room name matches the template's display name. The mode persists in IndexedDB.
- [ ] Re-navigate to `/build` after using a template → the same gallery shows; the previously-instantiated room is NOT mutated by re-clicking the same template (each click makes a fresh room).

### Path B — wizard

- [ ] On the entry screen, the **"Take the 30-second wizard"** button advances to step 2.
- [ ] Stepper at the top shows seven dots; the current one is gold-filled, completed ones are muted-gold, pending ones are grey.
- [ ] Clicking a past stepper dot jumps back to that step. Clicking a future dot does nothing.
- [ ] **Step 2 (Purpose):** five choices (Writing, Data analysis, Document drafting, Quick chat, Custom). Picking one highlights it; "Next" is disabled until a pick is made.
- [ ] **Step 3 (Device):** Desktop and Mobile. Defaults to Desktop. Picking Mobile resets any layout override.
- [ ] **Step 4 (Density + layout reveal):** three density choices. The Layout reveal box shows the auto-derived layout based on purpose + device + density. "Pick a different one" reveals a layout picker with four room layouts; choosing "Custom" purpose forces the picker open.
- [ ] **Step 5 (Features):** seven optional components (Highlights, Notes, Branches, Context meter, Voice input, Personas, Review). Features whose target slot doesn't exist in the chosen layout are disabled with "Not available in this layout". Toggling adds/removes from the config.
- [ ] **Step 6 (Name + scheme):** name field is required to advance. Six color schemes selectable; defaults to Parliament.
- [ ] **Step 7 (Ignition):** if no API key, button reads "Add API key in Settings" and routes to `/settings`. With a key, button reads "Ignite & open in editor"; clicking it triggers a brief gold shimmer pulse, then routes to `/edit/:newId`.

### "Open in editor" escape (step 3+)

- [ ] On steps 3, 4, 5, and 6, the footer shows an **"Open in editor"** button alongside Back / Next.
- [ ] Clicking it instantiates a mode using whatever's in the wizard config (filling defaults for unset fields) and routes to `/edit/:newId`.
- [ ] Step 1 and 2 do NOT show "Open in editor".

### Path identity check

- [ ] Pick a template via gallery → note its components / layout / scheme.
- [ ] Take the wizard with the matching purpose / device / density / features → the resulting mode file has the same layout, scheme, and component shape (component ids will differ; structure must match).
- [ ] Both paths persist mode files in IndexedDB; both can be re-opened from the editor without manual re-creation.

### Preview button

- [ ] In the editor (`/edit/:roomId` or `/edit-home`), the Preview button is enabled (no PR-9 tooltip).
- [ ] Clicking it opens a side sheet from the right with a read-only RoomShell render of the current draft.
- [ ] The sheet displays the room name in the header and a "Read-only preview — interactions are disabled" note in the footer.
- [ ] Esc closes the sheet. Clicking the backdrop closes it. Clicking inside doesn't close it.
- [ ] Unsaved edits in the editor show up in the preview without requiring a save (in-memory draft is what RoomShell renders).
- [ ] Pointer events on the inner RoomShell are disabled — clicking message components does nothing.

### Live-geometry layouts in the editor canvas

- [ ] Open the editor with a Data Workspace room → the canvas shows the canvas-centric live geometry, not the labeled-grid fallback.
- [ ] Open the editor with a Drafting Desk room → document-centric live geometry.
- [ ] Open the editor with a Pocket Chat room → single-column-with-sheet live geometry (narrower, mobile-shaped).
- [ ] Coming-soon layouts (Kingfisher, Starling) still trigger the labeled-grid fallback if a user manually swaps to them — those don't ship runtime entries in PR-9.

### Edge cases

- [ ] Wizard layout-reveal: choosing Mobile + any purpose ALWAYS yields single-column-with-sheet (overrides purpose-derived layout).
- [ ] Wizard layout-reveal: choosing Custom yields no auto-layout — picker stays open until user makes a choice. "Next" stays disabled.
- [ ] Features step: switching layouts after picking features does NOT silently drop incompatible features from the config — they remain in the config but are excluded from the final mode if their slot isn't in the layout. (Implementation detail: deferred prune happens at conversion.)
- [ ] Reload mid-wizard: state is in-memory only; the wizard restarts at step 1. (Documented as expected — no draft persistence in PR-9.)

### Known limitations to verify (and not flag as bugs)

- [ ] Coming-soon templates point at coming-soon layouts (`reading-pane@1.0`, `split-view@1.0`) which have catalog records but no runtime entries — preview is informational only.
- [ ] Drafting Desk and Data Workspace ship as functional skeletons (chat panel + input). Document canvas (PR-11b) and file shelf / chart canvas (PR-11a) fill in those layouts in later PRs.
- [ ] Wizard ignition uses the existing `useShimmer` hook for a brief gold pulse; there is no full power-on cascade like the V1 first-run experience.

---

## PR-10a — Wire `/chat/:id` through `<RoomShell>` + `createdInMode → room` migration

👀 User-visible. **Pause point** — verify thoroughly before PR-10b's adapter deletion.

**Surface:** `/chat/:id` for any existing conversation, plus DevTools → Application → IndexedDB for the migration audit.

### Setup

- An installed Parliament with conversations created across multiple V1 modes.
  Ideal: at least one conversation per recognized `createdInMode` value
  (`albatross`, `swift`, `pelican`, `secretarybird`) plus one with
  `createdInMode = null`. If you don't have variety, the synthetic-seed
  steps below produce equivalent coverage.
- DevTools open on the IndexedDB tab so the migration's effects are visible.

### Migration — happy path

- [ ] Boot the app on a Parliament with pre-PR-10a data (no `room` field
  on conversations, or `room: null` from the PR-1 schema bump). The
  homepage loads normally.
- [ ] DevTools → IndexedDB → `parliament` → `conversations`. Every record
  has a `room` field. Most are non-null mode ids of the form
  `mode_<uuid>`. The exact value is whatever the migration map yielded
  (see refactor/data-migration.md for the table).
- [ ] DevTools → `parliament` → `modes`. Every migrated conversation has
  a corresponding `scope: 'room'` record. The mode's `layout.ref` matches
  the template the migration map selected. Each migrated mode's
  `buildIntent.derivedFrom` ends in `-migration` (e.g.
  `'secretarybird-migration'`). `home_default` is still present.
- [ ] DevTools → `settings` table → record with `key:
  "migration_v2_chat_room_assigned"` and `value: true`.
- [ ] DevTools console → `localStorage.getItem('parliament-mode')` returns
  `null`. The legacy key was dropped.

### Per-`createdInMode` mapping spot checks

Verify the right template was instantiated for each known value:

- [ ] `createdInMode === 'albatross'` → mode's `layout.ref` is
  `three-panel@^1.0` and `meta.name` is "Writing Studio".
- [ ] `createdInMode === 'pelican'` → `canvas-centric@^1.0` / "Data Workspace".
- [ ] `createdInMode === 'secretarybird'` → `document-centric@^1.0` / "Drafting Desk".
- [ ] `createdInMode === 'swift'` → `single-column-with-sheet@^1.0` /
  "Pocket Chat". The mode's `buildIntent.derivedFrom` is
  `'swift-migration'` exactly — PR-10b uses this tag to inject
  `voice-input@1.0` into these specific rooms.
- [ ] `createdInMode === 'kingfisher'` or `'starling'` → falls back to
  `three-panel@^1.0` / "Writing Studio" (data-migration.md notes their
  intended layouts are coming-soon and the migration picks the closest
  available default).
- [ ] `createdInMode === null` and `localStorage[parliament-mode]` was
  set pre-deploy → migration consults the localStorage value and applies
  the same map, then drops the key.
- [ ] `createdInMode === null` with no localStorage hint → conversation's
  `room` stays `null` (Albatross fallback handles rendering).
- [ ] `createdInMode` value the map doesn't recognize (e.g. a hand-edited
  `'mystery-mode'`) → `room` stays `null`. **The migration does not guess.**

### Routing — happy path

- [ ] Open a migrated conversation at `/chat/:id`. The page renders the
  V2 `<RoomShell>` against the assigned mode (no Albatross sidebar /
  data-tour anchors). The room's layout shape is visible (three-panel
  for Writing Studio, document gutters for Drafting Desk, etc.).
- [ ] Open the homepage `/` — the chat row links still work; clicking a
  migrated chat lands on the V2 path.
- [ ] V1 selector preserved: `/chats` loads the original V1 chat selector
  table. Functions for filtering, sorting, bulk actions remain.

### Routing — Albatross fallback

The fallback is the recoverable state for conversations the migration
didn't assign cleanly. Verify it engages in three scenarios:

- [ ] Conversation with `room: null` (unmapped or unrecognized
  `createdInMode`) → `/chat/:id` renders the V1 Albatross adapter.
  Recognizable surfaces: `[data-tour="chat-actions"]`,
  `[data-tour="context-health"]`, the highlights / favorites / branches
  rails, the action panel with Collaboration Mode and Review buttons.
- [ ] Manually set a conversation's `room` to a mode id that does not
  exist (DevTools → IndexedDB edit), reload `/chat/:id` → Albatross
  fallback engages (mode-load failure path).
- [ ] Conversation id in the URL doesn't match any record → Albatross
  loads its own "conversation not found" path (existing V1 behavior;
  not changed by PR-10a).

### Idempotency

- [ ] Reload the app a second time. DevTools → `modes`: count is
  unchanged from the first migration run. No new mode records created.
- [ ] Spot-check one migrated conversation's `room` value before and
  after a reload — it's the same mode id (the per-conversation guard
  skips records that already have a non-null `room`).
- [ ] Manually set `migration_v2_chat_room_assigned` back to `false` in
  settings, then reload. Migration runs again but per-conversation
  guards skip every already-assigned conversation. New mode records
  appear only for any newly-introduced `room: null` rows. The legacy
  localStorage key is dropped again (no-op if already gone).

### Data integrity

The migration only adds the `room` field. Confirm it doesn't touch
anything else:

- [ ] Messages, highlights, notes, favorites, pins, files, file_data,
  sbrd_documents — counts unchanged before and after the first migration.
- [ ] `createdInMode` field is still present on conversation records
  (PR-12 strips it; until then it stays for debugging migration reports).
- [ ] Settings other than the migration flag are unchanged.
- [ ] Existing V1 critical flows still work end-to-end via the Albatross
  fallback (open a conversation with `room: null` to force the path):
  send a message, create a branch, add a highlight, add a note, export
  the chat.

### Edge cases

- [ ] **Empty Parliament.** Fresh install with no conversations. The
  migration runs, scans zero records, drops the legacy localStorage key,
  flips the settings flag. Boot completes without errors.
- [ ] **Crash mid-migration.** Simulate by killing the tab partway
  through a large migration (DevTools → Stop loading on a slow throttle).
  Reload. Migration retries from scratch on the next boot; the
  per-conversation guard skips conversations whose `room` was already
  assigned in the prior partial pass. Mode records from the partial pass
  remain — they're owned by their assigned conversations and weren't
  duplicated.
- [ ] **Private mode / localStorage unavailable.** Migration's
  localStorage read is wrapped in try/catch. If localStorage throws, the
  fallback falls through to "leave room: null" rather than failing the
  whole migration.
- [ ] **`libraryRooms` template missing.** Hand-delete one of the seeded
  templates (e.g. `data-workspace@1.0`) from `libraryRooms` then create
  a Pelican-tagged conversation with `room: null` and reset the migration
  flag. Reload. The migration logs an error, leaves that conversation's
  `room` null, and continues processing the rest of the batch. The
  batch's settings flag is still flipped to true on completion.

### Known limitations to verify (and not flag as bugs)

- [ ] **V2 chat surface renders catalog components in their preview
  shapes.** Opening a migrated conversation routes through `<RoomShell>`,
  but the `messages@1.0`, `input@1.0`, `branches@1.0`, `highlights@1.0`,
  `notes@1.0`, and `context@1.0` catalog entries currently use
  preview-shaped render functions. They display sample / empty state
  rather than the live conversation. Full ChatContext wiring lands in
  follow-up work between PR-10a's migration-validation checkpoint and
  PR-10b's adapter deletion. Until then, **users wanting full chat
  functionality should open conversations whose `room` is null** —
  those route through the Albatross fallback. (You can roll back any
  conversation to `room: null` via DevTools as a workaround.)
- [ ] Albatross adapter directory still exists. PR-10b deletes it; PR-10a
  deliberately keeps it as the rollback path.
- [ ] PWA cache name still `parliament-adapters-v1` (PR-10b rotates it).
- [ ] InputArea's built-in cardLayout mic button still present (PR-10b
  removes it; voice-input@1.0 takes over for migrated swift users).

---

## PR-10a.5 — Wire chat-essential catalog components to ChatContext

👀 User-visible. First slice of catalog data plumbing per
[v2-phase1-audit.md](v2-phase1-audit.md) §2.8a "Component data plumbing".

**Surface:** `/chat/:id` for any conversation whose `room` is non-null
(i.e. the migration assigned a Writing Studio / Pocket Chat / etc.
mode in PR-10a). Conversations with `room: null` continue to render
via the V1 Albatross adapter — unchanged from PR-10a.

### Setup

- A migrated conversation pointing at a Writing Studio mode (or any
  room mode whose components include `messages@1.0` + `input@1.0`).
  `pocket-chat`, `data-workspace`, `drafting-desk`, `quiet-room` all
  qualify — they all seed those two components.
- An API key configured in Settings (only required for the actual-send
  path; the inline-error path can be tested without one).

### Routing — V2 RoomShell path

- [ ] Open a migrated conversation. The page renders the V2 RoomShell
  layout (no Albatross sidebar / no `[data-tour="chat-actions"]`
  anchor). The mode's layout slots are visible.
- [ ] Brief loading flash before messages appear is OK (RoomShell
  gates the render until `loadMessages()` resolves).
- [ ] No flash of empty-state text inside `messages@1.0` — the gate
  prevents that.

### Messages list — live render

- [ ] Existing messages render with their content, user/assistant
  styling, and a per-role index counter (#1, #2, ...).
- [ ] Messages are sorted chronologically (oldest first).
- [ ] Markdown formatting works (headings, lists, code fences,
  fenced charts via the embedded `chart` language).
- [ ] Auto-scroll to the bottom on initial load.
- [ ] Hover a message — copy / favorite / note / branch / delete /
  more icons appear. Copy works (writes to clipboard). The other
  icons are no-op for now (next slice — see "Known limitations").

### Send — happy path

- [ ] Type a message in the input. Click Send.
- [ ] User message appears immediately with #N counter.
- [ ] Assistant placeholder appears beneath it. Streaming content
  fills in live.
- [ ] On completion, the assistant message reaches `incomplete: false`
  in IndexedDB. (DevTools → `messages` store, find the latest record.)
- [ ] Auto-scroll keeps the bottom visible during streaming.
- [ ] After the stream finishes the input is empty and the conversation
  title regenerates if it was the first user→assistant exchange (PR-9
  metadata generation still fires).

### Stop — abort an in-flight stream

- [ ] During streaming, the Send button transforms to a Stop button.
- [ ] Click Stop. The stream aborts.
- [ ] The partial assistant message persists with `incomplete: true`
  (DevTools confirms).

### Ghost-text Continue

- [ ] An existing `incomplete: true` message in IndexedDB renders with
  ghost text (50-60% opacity, dashed border around the card).
- [ ] A "Continue" button appears beneath the ghost message.
- [ ] Click Continue. `continueMessage` dispatches; the message heals
  in real time as new content streams in. On completion the dashed
  border becomes solid and `incomplete` flips to false.

### Send — no-API-key path

- [ ] Clear the encrypted API key from Settings (or open in a fresh
  Parliament with no key set yet).
- [ ] Type a message and click Send.
- [ ] Inline error appears above the input: "No API key configured.
  Add one in Settings to continue."
- [ ] Typed text is preserved in the input (not cleared).
- [ ] Editing the input clears the inline error.

### Send — offline / rate limit

- [ ] DevTools → Network → Offline. Click Send. Inline error: "You're
  offline. Reconnect to send."
- [ ] Inline rate-limit error surfaces if the API returns 429 (hard to
  reproduce on demand; flag for spot-check).

### Conversation switching

- [ ] Open conversation A. Note which messages render.
- [ ] Navigate to conversation B (different `id`, also migrated to a
  V2 room). Messages cleanly transition: A's messages disappear,
  B's messages appear. No briefly-visible mix of both.
- [ ] Navigate back to A — A's messages reappear.

### Albatross fallback unchanged

- [ ] Open a conversation with `room: null` (you can synth-edit one in
  DevTools → IndexedDB). The Albatross adapter renders, including its
  full sidebar / actions / context-health rails. Send works as in V1.
- [ ] Ghost-text messages still render correctly under Albatross.

### Known limitations to verify (and not flag as bugs)

- [ ] **Side-rail components still preview-shaped.** `branches@1.0`,
  `highlights@1.0`, `notes@1.0`, `context@1.0`, `collab-mode@1.0`,
  `review@1.0`, `voice-input@1.0`, `favorites@1.0`, and `toc@1.0`
  continue to render their PR-2 / PR-5 preview state inside RoomShell.
  The right-rail context meter shows zeros, the left rail's branch
  list shows "Main Thread" generically, etc. These wire in subsequent
  PR-10a.5 slices ahead of PR-10b's adapter deletion.
- [ ] **Per-message action icons are no-op (except copy).** Branch /
  delete / favorite / note / move-to-branch / hide all do nothing
  yet. The icons render so the layout is correct; click handlers
  arrive with the side-rail components that own those actions.
- [ ] **Tool toggles in the +menu are visible but inactive.** Web
  search, calculate, create_chart can be opened via the +menu but
  toggling them has no effect on the next send. Albatross fallback
  still drives tools end-to-end.
- [ ] **Collab-mode system prompts ignored.** Sends in the V2 path
  don't carry a system prompt. Users wanting persona presets can
  open the conversation under the Albatross fallback (set
  `room: null` in DevTools) until `collab-mode@1.0` wires up.
- [ ] **Mid-conversation key-failure / rate-limit banners** appear as
  small inline errors above the input rather than the V1 banner
  pattern. Functionally equivalent; visual treatment lands later.

---

## PR-10a.6 — Wire annotations + context meter to ChatContext

👀 User-visible. Second slice of catalog data plumbing. Brings per-message
annotations (star, note, highlight) and the live context meter online in
the V2 RoomShell chat path.

**Surface:** `/chat/:id` for any conversation whose `room` is non-null.
Albatross fallback (room: null) unchanged from prior PRs.

### Setup
- A migrated conversation pointing at Writing Studio (or any room mode
  that includes `messages@1.0` + `input@1.0` + at least two of
  `context@1.0` / `highlights@1.0` / `notes@1.0`). Writing Studio
  default seeds satisfy this.
- An API key configured (so the conversation has at least a few real
  messages to annotate).

### Per-message Star (favorite)

- [ ] Hover a message. Star icon visible.
- [ ] Click the Star. Icon fills with dusty-gold; the small star-cluster
  in the message header lights up.
- [ ] DevTools → IndexedDB → `parliament` → `favorites`: a record
  appears with `messageId` matching the starred message's id and
  `conversationId` matching the route id.
- [ ] Click the Star again. Record disappears from `favorites`. Icon
  returns to neutral.
- [ ] Star a message, navigate to `/`, navigate to a different
  conversation, then navigate back. Star state persists.
- [ ] On `/`, the Favorites homepage section shows the starred message
  snippet within a few seconds of returning to the homepage. (Note:
  the homepage favorites section reloads when conversations refresh,
  not via cross-context push — a slight delay is expected.)

### Per-message Note (StickyNote)

- [ ] Click the StickyNote icon on a message. Inline yellow note panel
  slides open beneath the message content.
- [ ] Type "test note". Click somewhere else (blur). Panel content
  saved.
- [ ] DevTools → `notes` store: a record with `messageId` and
  `text: "test note"`.
- [ ] Click the StickyNote icon again. Panel collapses (UI state). Note
  record stays in DB.
- [ ] Click the icon again. Panel reopens with the saved text.
- [ ] Edit the text to empty. Blur. The note record is deleted from
  IndexedDB.
- [ ] In the side-rail Notes pane (right-rail-extra in Writing Studio):
  the new note appears as a card with the message excerpt, role label,
  and trash icon.
- [ ] Click the side-rail note card. The viewport scrolls to the
  source message and its inline note panel reopens.
- [ ] Click the trash icon on the side-rail card. Note removed from
  side-rail and from the message's StickyNote indicator.
- [ ] Reload. All notes round-trip correctly.

### Highlights (text-selection popover)

- [ ] Select text inside a message (≥2 chars). Color-picker popover
  appears just above the selection.
- [ ] Click any color circle. Popover closes; the selected text
  renders inline as `<mark>` with the chosen background color.
- [ ] Other messages containing the same term ALSO get inline
  highlights (case-insensitive whole-word match — V1 behavior).
- [ ] DevTools → `highlights` store: one record per (term + message)
  occurrence got created — typically just the one for the message
  the user selected in. The whole-word matching expansion is at
  render time, not at write time.
- [ ] In the right-rail Highlights pane: the term appears as a row
  with the color dot, term text, and "N occurrence(s)" count.
- [ ] Hover the row → prev (◀) / next (▶) / trash icons appear.
- [ ] Click ▶. Viewport scrolls to the next message containing the
  term. Click again — cycles through all matches and wraps around.
- [ ] Click ◀. Cycles backward.
- [ ] Click trash. The term and all underlying records are removed;
  the inline `<mark>` background disappears across all messages.
- [ ] Click the side-rail "+ Add Highlight" affordance. Inline form
  expands. Type a term, pick a color, click Add. Records persist;
  inline marks appear on every matching message.
- [ ] Reload. Highlights round-trip correctly.

### Context meter (right-rail Context Health)

- [ ] On a fresh conversation, meter shows 0 messages, 0 tokens, 0%
  with a green-tinted progress bar.
- [ ] Send a message and let Claude respond. Meter updates: messages
  count goes up by 2, tokens reflect the input + output usage from
  the response, % is `tokens / contextWindow * 100`.
- [ ] Send several more messages. % climbs. The progress-bar tint
  follows the V1 thresholds (green → amber → red). Default warning
  threshold is 75% per the configSchema default.
- [ ] In a Compact display mode (config: `displayMode: 'compact'`,
  set via DevTools → IndexedDB or via the editor) the meter renders
  as a small pill instead of the full panel.

### Albatross fallback

- [ ] In DevTools, set a conversation's `room` field to null. Reload
  `/chat/<id>`. The V1 Albatross adapter renders. Star, note,
  highlight, context-meter — all work as in V1.
- [ ] Toggle a star in the Albatross adapter. Switch to a V2-routed
  conversation (different id, room non-null). The starred message in
  the Albatross adapter is unaffected by the V2 path. (Cross-adapter
  state isolation is the expected behavior.)

### Conversation switching

- [ ] Open conversation A. Star and note one of its messages.
- [ ] Navigate to conversation B (also V2-routed). Conversation B's
  own annotation state shows; A's stars/notes are NOT visible on B's
  messages.
- [ ] Navigate back to A. A's annotation state reappears.
- [ ] DevTools → Network: the page should not refetch annotations on
  every render — the load is once per conversation activation.

### Edge cases

- [ ] Open a conversation, immediately switch to a different one before
  the first finishes loading annotations. The second conversation
  shows its own annotations cleanly; no flash of A's data on B's
  messages. (RoomShellChatHost gating + AnnotationsContext's `loaded`
  flag together ensure this.)
- [ ] Star a message, then delete the message (if the slice ever wires
  delete — currently no-op). Refresh. The orphaned favorite record
  remains in DB but the homepage favorites surface skips it (already
  V1 behavior).
- [ ] In the side-rail Notes pane, click a note whose source message
  was deleted. (Manually delete via DevTools → `messages` store.)
  The note card disappears from the list automatically — `notes-render`
  filters out notes whose message is gone.

### Known limitations to verify (and not flag as bugs)

- [ ] **Branches still preview-shaped.** Left-rail branch list shows
  generic content; per-message branch icon is no-op. Next slice wires
  branches@1.0 + the BranchCreationPanel modal.
- [ ] **Hide / delete / move-to-branch on per-message menu still
  no-op.** These will land alongside branches.
- [ ] **Voice input still inert in V2 path.** InputArea's built-in mic
  button (cardLayout-only) covers V1 fallback; voice-input@1.0 wires
  in a later slice.
- [ ] **Collab-mode system prompts ignored on V2 sends.** Persona
  storage works (CollabModal still functions), but the active presets
  don't reach `sendMessage` yet.
- [ ] **Review modal still preview-shaped.**

---

## PR-10a.7 — Wire branches@1.0 + BranchCreationPanel to ChatContext

👀 User-visible. Third slice of catalog data plumbing. Brings the
side-rail branch list, the per-message Branch icon, and the
BranchCreationPanel modal online in the V2 RoomShell chat path.

**Surface:** `/chat/:id` for any conversation whose `room` is non-null
AND whose mode includes `branches@1.0` (Writing Studio + Pocket Chat
default seeds; Quiet Room intentionally omits it). Albatross fallback
(room: null) unchanged from prior PRs.

### Setup
- A migrated conversation pointing at Writing Studio (or any room mode
  whose components include `messages@1.0` + `input@1.0` + `branches@1.0`).
- An API key configured (only required for the Compressed Summary path
  + the preview button; Full History works without one).
- A second conversation belonging to the same parent (create one via
  the panel during the test) so the branch list shows ≥ 1 child.

### Side-rail branch list

- [ ] Open a fresh top-level conversation (no parent). Side rail shows
  a single "Main Thread" row with the live message count and 0 branches.
- [ ] Send a message and let Claude respond. Message count on the
  Main Thread row updates to reflect the new total.
- [ ] After creating a branch (per the steps below), the branch row
  appears in the same panel, sorted by `updatedAt` descending.
- [ ] Click a branch row. Navigation lands at `/chat/<branchId>` — the
  branch renders via RoomShell (because `room` was inherited from
  source) and the side rail now shows "← Parent conversation" + the
  current branch as the active row.
- [ ] Click "← Parent conversation". Returns to the parent.
- [ ] On a room that doesn't include `branches@1.0` (Quiet Room):
  the Branches side rail is absent (correct — the room just has
  messages + input). The per-message GitBranch icon is no-op there too.

### Per-message Branch icon

- [ ] Hover any message. GitBranch icon appears alongside the other
  per-message icons.
- [ ] Click it. BranchCreationPanel modal opens, anchored to that
  message ("Forking from message N of M" reflects the right index).
- [ ] Click outside the modal / press Esc / click Cancel. Modal closes.
  No partial state left behind (no orphaned conversation in
  IndexedDB → `conversations`).

### Compress Context action

- [ ] In the Branches side rail, a "Compress Context" button appears
  below the branch list (default config; configurable off via
  `showCompressButton: false`).
- [ ] With zero messages, the button is disabled.
- [ ] After at least one user→assistant exchange, click Compress
  Context. The panel opens anchored to the LATEST message (not an
  earlier one).

### Cmd/Ctrl+Shift+B keyboard shortcut

- [ ] On `/chat/:id` with messages, press Cmd+Shift+B (Mac) or
  Ctrl+Shift+B (others). Panel opens anchored to the latest message.
- [ ] Same shortcut while focused inside the input textarea — still
  fires (matches V1 behavior). Browser default doesn't open the
  bookmarks bar.
- [ ] On `/`, `/chats`, `/settings`, `/build`: shortcut is inert.
- [ ] On Quiet Room (no `branches@1.0` in the mode): shortcut still
  dispatches into BranchPanelContext but the panel doesn't render
  (no host component mounted). Acceptable Phase 1 behavior — no error.

### Full History branch creation

- [ ] Open the panel. Pick "Full History". The inline meter shows
  "Branch starts at X% context (same as current conversation)".
- [ ] Click Create Branch. Button shows "Creating…" briefly while
  the writes commit; navigation lands at `/chat/<newId>`.
- [ ] DevTools → IndexedDB → `parliament` → `conversations`: the new
  record has `parentId` = source id, `branchPoint` = anchor message id,
  `room` = source's room (non-null), `familyId` populated.
- [ ] DevTools → `messages` filtered by the new conversationId: every
  message up to and including the anchor is copied with original
  timestamps preserved. Timestamps later than the anchor are NOT
  copied.
- [ ] On the new branch, send a message. It works (the V2 chat path
  is fully alive).
- [ ] Navigate back to the parent. Side rail Branches now lists the
  new branch.

### Compressed Summary branch creation — preview path

- [ ] Open the panel. Pick Compressed Summary. The savings line shows
  immediately (e.g. "23% → ~3%, frees up 20%") — no API call yet.
- [ ] Click "Preview summary". Spinner appears beneath the button;
  Network tab shows ONE call to `api.anthropic.com/v1/messages`
  carrying the haiku model and the summary prompt.
- [ ] Summary text renders inline as Markdown. Caching: clicking
  "Preview summary" a second time toggles collapse without a
  second API call.
- [ ] Switch to Full History, then back to Compressed Summary. The
  cached preview is still expanded with the same text — same panel
  session keeps the cache.
- [ ] Close the panel (Cancel / outside click). Reopen it. Click
  Preview summary again — fires a fresh API call (cache clears on
  unmount).
- [ ] Without an API key configured: clicking Preview summary surfaces
  the inline error "No API key configured. Add one in Settings to
  preview a summary." panel doesn't crash.

### Compressed Summary branch creation — create path

- [ ] With Compressed Summary selected and an API key present, click
  Create Branch. Button shows "Compressing…" while the real Haiku
  call + branch creation runs.
- [ ] On success: navigation lands at `/chat/<newId>`. The new
  conversation has exactly one assistant message — the summary text.
- [ ] DevTools → `conversations`: title is "Summary: <parent title>",
  `parentId` + `branchPoint` set, `room` inherited.
- [ ] No API key configured → falls back to Full History silently
  (V1 behavior). New branch has all messages copied, not a summary.
- [ ] Force a failure (e.g. invalid API key, throw inside the provider)
  → falls back to Full History. Inline error in the panel describes
  what failed if the fallback also fails.

### Auto-compress (settings.autoCompress === 'automatic')

- [ ] In Settings, set `autoCompress` to "Automatic". Default
  threshold is 75% (configurable per branches@1.0 component config).
- [ ] On a conversation with `tokenUsage` already past the threshold,
  the panel auto-opens anchored to the latest message on next render.
- [ ] On a conversation below threshold, the panel does NOT auto-open.
- [ ] With `autoCompress` set to "Off" or "Ask first", auto-open does
  not fire even past threshold. (User can still open manually.)

### Conversation switching

- [ ] Open conversation A, open the branch panel anchored to a message,
  then navigate to conversation B (also V2-routed, also has branches).
  The panel closes cleanly. The side rail shows B's branches.
- [ ] Open A, open the panel, click Create Branch (Full History). The
  panel closes, nav lands on the new branch, side rail shows the
  parent + child arrangement on the new conversation's tree.

### Albatross fallback unchanged

- [ ] In DevTools, set a conversation's `room` field to null. Reload.
  Albatross adapter renders. The V1 BranchCreationPanel + V1 keyboard
  shortcut (also Cmd/Ctrl+Shift+B) work end-to-end. No double-firing
  from the V2 BranchShortcutHandler.

### Edge cases

- [ ] On a conversation with an `incomplete: true` last message, open
  the panel from that message. The "Response interrupted" warning
  banner appears in the panel. Both modes still work; Full History
  branch carries the incomplete record forward (matches V1).
- [ ] Branch a conversation, then branch the branch. Both create
  cleanly; the side rail on the original parent still shows just its
  direct children.
- [ ] DevTools → manually delete the latest message after opening the
  panel. The panel's anchor message becomes stale. Closing and
  reopening picks up the new latest message; creating a branch with
  the stale anchor surfaces an error inline rather than crashing.

### Known limitations to verify (and not flag as bugs)

- [ ] **"Send to branch" / "Pin for reference" message-transfer flows
  not yet wired in V2.** These are the next slice. The V1 Albatross
  fallback (room: null) handles them.
- [ ] **Hide message + 20-second undo timer still no-op.** Same slice
  as the message-transfer flows.
- [ ] **Move to branch in the per-message more-options menu still
  no-op.** Same slice.
- [ ] **`voice-input@1.0` still inert in V2.** InputArea's built-in
  mic (cardLayout-only) still covers V1 fallback.
- [ ] **Collab-mode system prompts ignored on V2 sends.** Persona
  storage works, but presets don't reach `sendMessage` yet.
- [ ] **Review modal still preview-shaped.**

---

## PR-10a.8 — Wire voice-input@1.0 + toc@1.0 to ChatContext

👀 User-visible. Fourth slice of catalog data plumbing. Closes the
two lighter remaining components before PR-10a.9 picks up
`collab-mode@1.0` + `review@1.0`.

**Surface:** `/chat/:id` for any conversation whose `room` is non-null
AND whose mode includes `voice-input@1.0` (Pocket Chat default seed)
or `toc@1.0` (no default seed; reachable via custom rooms or hand-built
modes — `/catalog` debug route also exercises toc).

### Setup
- A migrated Pocket Chat conversation (createdInMode = 'swift'
  → migrates to `pocket-chat@1.0` which includes `voice-input@1.0`
  in `input-dock`).
- For TOC: either edit a Writing Studio mode in DevTools to inject
  `toc@1.0` into a slot, or use the `/catalog` debug route which
  already includes `toc@1.0` in `left-rail`.

### voice-input — production mic button

- [ ] Open a Pocket Chat conversation. The mic button renders inside
  the input-dock next to the textarea: a small round-9 button with
  a Mic icon when idle, MicOff icon while listening.
- [ ] Hover the button. Border tints gold (--p-accent-gold). Idle
  tooltip: "Start voice input". Listening tooltip: "Stop listening".
- [ ] Click the button. Browser surfaces the mic permission prompt
  the first time (managed by the browser, not Parliament).
- [ ] Allow the prompt. Button turns red-bordered, icon flips to
  MicOff, `aria-pressed` becomes true.
- [ ] Speak a phrase. The textarea (input@1.0) receives the final
  transcript appended to its value (with a leading space if the
  textarea wasn't empty). Interim transcripts during speech do NOT
  populate the textarea — only finals (per input@1.0's
  `subscribeToVoice` filter).
- [ ] Click the mic again to stop. Border returns to neutral, icon
  flips back to Mic.
- [ ] On a browser without SpeechRecognition (Firefox without flag),
  the mic button collapses to a small disabled badge with a
  "Voice input not supported" tooltip. The textarea still works
  normally for keyboard input.
- [ ] On `/catalog` dev route: voice-input still renders the verbose
  preview card (with "Last transcript: …" footer) — production
  render is opt-in via the catalog manifest's `render` field.

### toc — table of contents derived from messages

- [ ] Open a conversation in a room that includes `toc@1.0`. The TOC
  renders a "TABLE OF CONTENTS" uppercase header followed by one
  row per user message.
- [ ] Each row's label is the user message's content with whitespace
  collapsed and truncated at 60 characters with a trailing "…".
  Long messages don't wrap into multiple lines.
- [ ] Assistant messages do NOT appear as rows (matches V1
  Albatross — only user messages anchor sections).
- [ ] Click a TOC row. The viewport smooth-scrolls to that message
  with `block: 'center'` positioning. The targeted message is
  identified by its `msg-{id}` DOM anchor (set by MessageCard).
- [ ] Send a new user message. Within one render the new row appears
  at the bottom of the TOC.
- [ ] If the conversation has more than `maxItems` user messages
  (default 50), the oldest rows drop off — the most-recent
  `maxItems` are retained.
- [ ] On a fresh conversation with zero user messages, the TOC shows
  the placeholder "Messages will appear here" inside its header.

### Bus integrity

- [ ] Open DevTools → Console. The room hostAPI publishes
  `voice-transcript` events on every interim + final transcript.
  No "publishing unknown event" warning fires (the event name is
  in the Phase 1 KNOWN_EVENTS set).
- [ ] In a room that has `voice-input@1.0` but NOT `input@1.0` (e.g.
  manually edited), publishing transcripts is silently dropped.
  No subscriber, no error.

### Conversation switching

- [ ] On a Pocket Chat conversation, start listening. Navigate to
  another conversation via the Chats list. The mic session aborts
  cleanly (useVoiceInput's unmount cleanup); no continued listening
  after the unmount.
- [ ] Returning to the original conversation: mic button starts
  fresh (not still-listening from before).

### Albatross fallback unchanged

- [ ] In DevTools, set a Pocket Chat conversation's `room` field to
  null. Reload. The V1 Albatross adapter renders. The cardLayout
  built-in mic still works (PR-10b is the cleanup point for that).
- [ ] No double-mic-button on the V2 Pocket Chat path (the
  cardLayout-only built-in mic is gated to V1 only).

### Known limitations to verify (and not flag as bugs)

- [ ] **NQ-6 empty-state for voice without input subscriber not yet
  implemented.** The audit plans an "Add an input component"
  empty state when no `input@1.0` is mounted; today the mic button
  silently publishes regardless. Defer to PR-11a / PR-10b cleanup.
- [ ] **Collab-mode system prompts ignored on V2 sends.** Persona
  storage works, but presets don't reach `sendMessage` yet — next
  slice (PR-10a.9).
- [ ] **Review modal still preview-shaped.** Same slice.
- [ ] **Per-message hide / move-to-branch / send-to-branch / pin
  still no-op.** Bundles with PR-10a.10 or PR-10b cleanup.

---

## How to add a section when a new PR lands

When a new PR merges:
1. Add a section using the template below.
2. Mark items `[ ]` until verified.
3. After the demo / review run, the verifier checks them off and notes any failures.

```markdown
## PR-N — <title>

👀 User-visible | 🧱 Foundation

**Surface:** <route or component>

**Setup:** <data prerequisites>

**Steps:**
1. ...
2. ...

**Expected:** <pass criteria>
```

---

## What's NOT covered here

- **Browser cross-compat.** Chrome / Edge / Firefox / Safari behavior differences. Spot-check before a release; not per-PR.
- **Mobile / touch.** Swift adapter still uses V1 paths; PR-10b is the cleanup point.
- **Performance benchmarks.** No regression budget yet — eyeball it.
- **Accessibility audits.** Beyond what's called out per PR — full a11y review is a Phase 2 task.
