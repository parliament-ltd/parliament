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

## PR-10a.9 — Wire collab-mode@1.0 + review@1.0 to ChatContext

👀 User-visible. Fifth slice of catalog data plumbing. Closes the
two remaining components that need V1-modal extractions plus a live
sendMessage-flow integration.

**Surface:** `/chat/:id` for any conversation whose `room` is non-null
AND whose mode includes `collab-mode@1.0` and/or `review@1.0`. Default
seed templates don't include them yet — for testing, hand-edit the
mode in DevTools to inject the components into a slot (right-rail-extra
in Writing Studio works).

### Setup
- A migrated Writing Studio conversation with at least one user→assistant
  exchange so the synthesis path has something to work with.
- An API key configured (the synthesis call + the eventual send needs
  one; collab-mode UI works without).
- DevTools open to confirm IndexedDB writes (parrotPersonas key) and
  to capture network calls (system prompt threading).

### collab-mode — modal + apply

- [ ] Trigger button renders with label "Collaboration mode" and no
  badge when no presets are active.
- [ ] Click the trigger. CollabModal opens with the V1 design — five
  built-in presets (Challenge Artifacts, Show Reasoning, Push Back on
  Me, Offer Alternatives, Flag Uncertainty), Parrot Personas section
  (empty initially), Custom Interaction text area.
- [ ] Click a preset. The card lights gold. Click another. Both light
  (multi-select).
- [ ] Cancel. Close. Reopen. The previously-active presets are NOT
  remembered — only Apply commits state to the context.
- [ ] Pick "Show Reasoning" → Apply. Modal closes; trigger badge shows
  "1".
- [ ] Reopen the modal. The Show Reasoning card is already lit (seeded
  from context). Pick another preset → Apply. Badge shows "2".
- [ ] In the modal, type a Parrot Persona title + a custom instruction
  → "Save Persona". DevTools → IndexedDB → `settings` → `parrotPersonas`:
  the new persona record is appended.
- [ ] Edit the persona via the pencil icon. Save. Record updates.
- [ ] Delete the persona via trash. Record removed.
- [ ] With presets active, type a custom instruction without saving →
  Apply. The custom text persists in the trigger's badge count (now
  shows preset count + 1 for the custom string).

### System prompt threading — input@1.0 + ghost-continue

- [ ] With one preset active, type a message and click Send. Inspect
  the network request to `api.anthropic.com/v1/messages` — the body
  has `system: "<preset prompt text>"`.
- [ ] Multiple presets → `system` is the joined string with `\n\n`
  separator.
- [ ] Custom instruction added → appended after presets.
- [ ] Force a stream interruption (kill the network mid-stream). The
  resulting incomplete message renders with ghost text. Click Continue.
  The request body's `system` field carries the same active preset
  prompt — V1 parity preserved.

### Conversation switch lifetime

- [ ] On `/chat/X`, apply a preset. Badge shows "1".
- [ ] Navigate `/chat/X → / → /chat/X` (same conversation via Chats
  list). Badge still shows "1" — transient null during route nav
  doesn't wipe state.
- [ ] Navigate `/chat/X → /chat/Y` (different conversation, also
  V2-routed). Badge on Y shows "0" — state resets cleanly.
- [ ] Navigate back to X. Badge resets to "0" too — V1 lifetime is
  per-mount (NOT per-conversation across reloads).

### review — modal + synthesis

- [ ] Trigger button is disabled when the conversation has zero
  messages.
- [ ] With messages, click trigger. ReviewModal opens with the V1
  design.
- [ ] Header shows "Review · Reflect on your conversation".
- [ ] Summary depth toggle: "Brief" / "Detailed".
- [ ] "Include in review" chips show live counts: Highlights (N),
  Notes (N), Favorites (N) — pulled from AnnotationsContext.
- [ ] Disabled chips for categories with zero entries.
- [ ] Highlights / Notes sections list the active terms / note text.
- [ ] Session Stats block shows live token usage, message count, and
  estimated cost.
- [ ] Reflection Prompts derive from active annotations ("You
  highlighted references to X. What's your main takeaway?", etc.).
- [ ] Click "Generate Synthesis with Claude". Loading spinner appears
  inside the synthesis card.
- [ ] On success: the synthesis text renders inline as Markdown inside
  the card (gold-tinted background).
- [ ] Without an API key configured: the synthesis call surfaces an
  error inline ("No API key configured. Add one in Settings to
  generate a synthesis.") rather than crashing.
- [ ] Click "Save as Markdown". A `.md` file downloads. Open it: the
  conversation title, "Highlights" section, "Favorites" preview, and
  per-message inline notes round-trip. Favorited messages get a star
  in the Markdown body.

### Albatross fallback unchanged

- [ ] Set a conversation's `room` field to null in DevTools. Reload.
  V1 Albatross renders. The CollabModal + ReviewModal surface via
  the V1 right-rail action buttons. Both still work end-to-end as in
  V1.
- [ ] Active collab presets in V1 do not bleed into the V2 path
  (they're per-mount in both worlds).

### Edge cases

- [ ] Open the Collab modal, switch conversations mid-edit. The modal
  closes (component unmount); active state on the new conversation is
  empty.
- [ ] Generate a synthesis, then immediately close the modal. The next
  open shows a fresh state (no cached synthesis — the synthesis state
  lives in modal-local state by design).
- [ ] Save as Markdown with zero messages: button is gated upstream
  (trigger is disabled), so this case shouldn't fire.

### Known limitations to verify (and not flag as bugs)

- [ ] **Per-message hide / move-to-branch / send-to-branch / pin
  still no-op.** Bundles with PR-10a.10 or PR-10b cleanup.
- [ ] **Default seed templates don't include collab-mode or review.**
  Existing migrated conversations need DevTools mode editing to gain
  these components; new users compose them via the editor (PR-8).
  Adding to default seeds is a separate scope decision.
- [ ] **Active collab presets don't persist across browser reloads.**
  Per-conversation persistence is a Phase 2 question — Phase 1 keeps
  the V1 session-scoped lifetime.

---

## PR-10a.10 — Wire per-message Hide / Delete / Send to branch / Pin for reference

👀 User-visible. Sixth and final slice of catalog data plumbing
before PR-10b. Brings the per-message action menu fully online.

**Surface:** `/chat/:id` for any conversation whose `room` is non-null
(every default Writing Studio / Pocket Chat / Drafting Desk / Quiet
Room / Data Workspace migration). All four actions live on the
existing per-message hover icons + more-options menu in MessageCard.

### Setup
- Two migrated conversations (A and B). Easiest path: clear the
  `migration_v2_chat_room_assigned` setting in DevTools, create two
  conversations via the homepage, send a message in each.
- An API key only needed for the actual-send paths inside the
  conversation; the action flows themselves don't need one.

### Hide message — session-only

- [ ] Hover a message. Trash icon appears alongside the other icons.
  Open the more-options menu — "Hide message" is the first item with
  the Eye icon.
- [ ] Click "Hide message". The message disappears from the list. No
  UndoBanner appears (hide is not delete).
- [ ] DevTools → IndexedDB → `messages`: the record is still there.
- [ ] Refresh the page. The hidden message returns — V1 per-mount
  lifetime is preserved.
- [ ] Hide a message, navigate `/chat/X → / → /chat/X`. The hidden
  state persists (transient null doesn't wipe it).
- [ ] Hide a message, navigate `/chat/X → /chat/Y` (different conv).
  Y's hidden set is empty. Navigate back to X. X's hidden set was
  cleared on the leaving transition (V1 per-mount lifetime).

### Delete message — 20s undo

- [ ] Click the trash icon on any message. Message disappears
  immediately; an UndoBanner appears above the input area: "Message
  deleted · Undo".
- [ ] Click "Undo" within 20s. Message returns; banner dismisses.
  DevTools → `messages`: the record is still there.
- [ ] Click trash, wait 20s without clicking Undo. Banner auto-
  dismisses; DevTools → `messages`: the record is GONE.
- [ ] Click trash on multiple messages within the undo window. Banner
  shows "N messages deleted · Undo". Clicking Undo restores only the
  most recent (V1 behavior — Undo pops the latest one off the stack).
- [ ] Click trash, then immediately navigate to a different
  conversation. The pending-delete timer cancels — the record stays
  in IndexedDB. Verified by the V1 cleanup pattern.
- [ ] Click trash, close the browser tab. The next-load cleanup
  doesn't fire (timer was in-memory only) — record persists.

### Send to branch — copies the message

- [ ] Open the more-options menu → "Send to branch" with the
  ArrowRightCircle icon.
- [ ] Modal opens with title "SEND TO BRANCH", a search input, a
  "New conversation with this message" affordance, and the recent
  12 conversations (excluding the active one).
- [ ] Type into search. Results filter by conversation title + aiSummary
  (case-insensitive substring).
- [ ] Press Esc. Modal closes.
- [ ] Reopen, click a target conversation. Modal closes; the message
  is appended to that conversation's `messages` (DevTools confirms).
  No removal from the source conversation — "Send to branch" is a copy.
- [ ] Reopen, click "New conversation with this message". A fresh
  conversation is created with title `From: <source title>`,
  inheriting the source's room and model. The seed message is the
  one being sent.

### Pin for reference — visual quote block, no token cost

- [ ] Open the more-options menu → "Pin for reference" with the Pin
  icon (between "Send to branch" and "Copy text").
- [ ] Modal opens with title "PIN TO CONVERSATION" and CTA "New
  conversation pinned with this reference".
- [ ] Pick a target conversation. Modal closes.
- [ ] DevTools → `pins` store: a record appears with
  `targetConversationId`, `sourceConversationId` (= source's id),
  `sourceMessageId`, `content`.
- [ ] Navigate to the target conversation. A "PINNED REFERENCES (1)"
  block appears at the top of the message area, expanded by default,
  containing the pinned content quoted in a 3-line clamped box.
- [ ] Click the chevron / header. Block collapses; click again to
  expand.
- [ ] Hover a pin. An X appears in the top-right. Click X. Pin removes
  from the list AND from IndexedDB.
- [ ] Pin multiple messages. Block shows count and lists them in
  insertion order.
- [ ] Send a follow-up message. The Network tab's request body to
  `api.anthropic.com` does NOT include the pinned reference content
  in the messages array — pins are visual-only, Claude doesn't see them.

### Conversation switching

- [ ] Open conversation A, hide a message, then schedule a delete on
  another. Navigate to conversation B. The hidden set on B is empty;
  no UndoBanner.
- [ ] Navigate back to A. Both A's hidden set and pending deletes were
  reset on the leaving transition (V1 per-mount lifetime).
- [ ] Schedule a delete in A, navigate to B. The pending timer cancels
  — A's IndexedDB record is preserved.

### Albatross fallback unchanged

- [ ] Set a conversation's `room` field to null. Reload. V1 Albatross
  renders. Trash + "Move to branch" menu still work as in V1 (the
  V1 menu uses "Move to branch" wording; V2 uses "Send to branch").
- [ ] V1's pending-delete UndoBanner still surfaces alongside the V1
  text and behaves as before.

### Edge cases

- [ ] Pin a message, then delete the source message in the original
  conversation. The pin record stays (independent record). Display
  shows the snapshotted content from when the pin was created.
- [ ] With a pin block expanded, navigate away and back. The block
  re-renders at full state (expanded by default). The pins themselves
  reload from IndexedDB.
- [ ] Try to "Send to branch" or "Pin for reference" when there are
  zero other conversations. The modal shows "New conversation with
  this message" + "No other conversations found". The new-chat path
  still works.

### Known limitations to verify (and not flag as bugs)

- [ ] **Multi-select "Send to branch" mode not implemented.**
  CLAUDE.md describes a multi-select selection flow when viewing the
  parent of an active branch; that's a Phase 2 / follow-up scope.
  The current Send to branch is single-message only.
- [ ] **Hide is per-mount, not persisted across reloads.** Matches V1
  lifetime. If a future need surfaces, add a `hidden` flag to the
  message record (Phase 2).
- [ ] **The per-message contribution surface is still preview-only.**
  RoomShell aggregates `contributions.messageActions` from each
  catalog component, but MessageCard's menu still hard-codes Hide /
  Send / Pin / Copy. Rendering contributed actions in the menu is a
  Phase 2 question.

---

## PR-10b — Delete adapter directories + cleanup InputArea + rotate PWA cache

👀 User-visible. Point of no return — V2 RoomShell is the only chat path.
The V1 SelectorLayout / SettingsLayout still render at `/chats` and
`/settings`, but they're now top-level views rather than dispatched
through the bird-mode adapter pattern.

**Surface:** the whole app — `/chat/:id`, `/chats`, `/settings`,
plus boot-time migrations on first load.

### Setup
- A dev DB with at least three migrated conversations across different
  templates: a Writing Studio, a Pocket Chat, and a Quiet Room. The
  homepage / template gallery covers creation.
- One conversation deliberately stuck at `room: null` to verify repair
  works (DevTools → IndexedDB → `conversations` → set the active
  conversation's `room` to null and clear the `migration_v2_room_repair_done`
  setting; reload).
- A separate browser profile that already has the legacy
  `parliament-adapters-v1` cache populated (load any pre-PR-10b build
  on the profile first). Use this to verify the cache wipe.

### `/chat/:id` — V2 only, repair on demand

- [ ] Open a Writing Studio conversation. Renders through `<RoomShell>`;
  every per-message affordance, side rail, branches modal, collab /
  review modals work as before. No Albatross fallback.
- [ ] Open the conversation you stuck at `room: null`. After a brief
  loading frame the conversation re-resolves with a fresh Writing
  Studio room — DevTools → `conversations` → `room` is now a mode id;
  a corresponding entry exists in `modes` with
  `buildIntent.derivedFrom === 'null-room-repair'`.
- [ ] Force the repair to fail: delete the `writing-studio@1.0` record
  from `libraryRooms`, clear `migration_v2_room_repair_done`, reload.
  The `ConversationUnavailable` stub renders with "default room
  template is missing" detail and Back-to-homepage / Open-chat-list
  buttons. Re-seed by reloading after restoring the template.
- [ ] Open a non-existent `/chat/<random-uuid>` URL. The stub renders
  with "Conversation not found" detail.

### `/chats` — extracted V1 selector

- [ ] Loads. Search, sort, view toggle (Summary / Notes / Highlights /
  Branches), bulk actions, favorites sidebar, count badges, inline
  title/note edit — everything from the V1 surface still works.
- [ ] Click "+ New chat" in the header. New conversation lands in the
  table immediately. `room` is set on the new record before navigation
  (DevTools → `conversations` confirms); opening it routes through
  RoomShell with no flash through the repair branch.
- [ ] No "ModeMismatchBanner" appears regardless of how many migrated
  conversations exist. The banner was V1-only and was deleted in PR-10b.

### `/settings` — extracted V1 settings

- [ ] Loads. API key validate / save, model picker, usage / spending,
  context defaults, data & backups, appearance, about — every section
  works. Tour selectors still attach to their elements.
- [ ] No "Interface Mode" nav item or section. Sidebar shows seven
  items (API, Model, Usage, Context, Data, Appearance, About).

### Boot-time migrations

- [ ] DevTools → IndexedDB → `settings`. After a fresh first boot:
  - `migration_v2_chat_room_assigned` = true (PR-10a).
  - `migration_v2_room_repair_done` = true (PR-10b).
  - `migration_v2_voice_input_injected` = true (PR-10b).
- [ ] Force re-run by clearing one flag at a time — each migration
  short-circuits on the others' flags and only runs the cleared pass.
  No double-instantiation of rooms (per-conversation guards already
  in PR-10a's pass).

### Voice-input injection (mobile)

- [ ] Manually create a room mode in DevTools that mimics a pre-PR-10a.8
  swift migration: scope `room`, layout.ref `single-column-with-sheet@^1.0`,
  buildIntent `{ derivedFrom: 'swift-migration' }`, components include
  `messages@^1.0` + `input@^1.0` but NOT `voice-input@^1.0`. Set a
  conversation's `room` to its id. Clear
  `migration_v2_voice_input_injected` and reload.
- [ ] After reload the room's `components` array gains a
  `voice-input@^1.0` entry in `input-dock` (order 1). Open the
  conversation — the Pocket Chat sheet shows a working mic button
  alongside the textarea.
- [ ] Re-running the migration on the same room (clear flag, reload)
  is a no-op — the per-room "already includes voice-input" guard
  prevents duplicates.

### InputArea — mic button removed

- [ ] Open a Pocket Chat conversation. The cardLayout-only mic button
  is gone from the textarea row; voice input lives in the standalone
  voice-input@1.0 button next to it.
- [ ] Open a Writing Studio (desktop / inline layout) conversation.
  No regressions — the inline layout never had a mic button.

### PWA cache rotation

- [ ] Fresh browser profile: the SW registers, the precache populates,
  no `parliament-adapters-v1` cache exists. DevTools → Application →
  Cache Storage shows `parliament-modules-v2` (will be empty until
  some lazy chunks load) plus the workbox precache.
- [ ] Profile that had the legacy cache: on first load post-PR-10b
  the `parliament-adapters-v1` cache disappears within a few hundred
  ms (see `src/main.jsx`'s page-context cleanup). No 404s in the
  Network tab from old adapter chunk URLs.

### Out of scope (don't test here)

- [ ] Bundle size. Extracting the V1 layouts into the synchronous
  bundle increased main chunk size; lazy-loading is a Phase 2 follow-up.
- [ ] V2 settings redesign. Settings is still the V1 surface.
- [ ] Persistent hide-message across reloads. Still session-only per
  PR-10a.10.
- [ ] Rendering contributed messageActions in MessageCard's menu.
  The contribution machinery is in catalog manifests; the UI still
  hard-codes Hide / Send / Pin / Copy.
- [ ] voice-input NQ-6 empty-state ("Add an input component to use voice").

---

## PR-11a — Decompose Pelican into 5 catalog components

👀 User-visible. Largest decomposition in Phase 1. V1 Pelican
disappears as an adapter; the same data-analysis room is now expressed
as a Data Workspace template composed of file-shelf + chart-canvas +
table-canvas + summary-dashboard + column-inspector + the existing
messages / input / context catalog entries.

**Surface:** `/chat/:id` for any conversation in a Data Workspace room
(the `data-workspace@1.0` libraryRoom — open via the homepage's
"+ Build a room" → Data Workspace template, or via PR-10a-migrated
pelican conversations).

### Setup
- A Data Workspace conversation. Easiest path: open the homepage,
  use "+ Build a room" → Data Workspace, then open the resulting chat.
- Sample CSV / XLSX / JSON file at hand (any small dataset works).
- For migration testing: a pre-PR-11a conversation in the same dev DB
  whose mode uses `canvas-centric@^1.0` and lacks `file-shelf` in its
  components — DevTools → IndexedDB → `modes` → confirm the components
  array doesn't include a `file-shelf@^1.0` entry.

### Boot-time decomposition migration

- [ ] Fresh boot. DevTools → IndexedDB → `settings`. After init:
  - `migration_v2_pelican_room_decomposed` = true.
- [ ] DevTools → `modes` → any record where `layout.ref` starts
  `canvas-centric` and `buildIntent.derivedFrom` was previously
  `pelican-migration` now has `decomposedAt: 'pr-11a'` plus an
  8-component list (file-shelf + 3 canvases + column-inspector +
  context + messages + input). Components have fresh ids.
- [ ] Clear `migration_v2_pelican_room_decomposed`, reload. The pass
  re-runs but skips every room (per-room "already has file-shelf"
  guard); the flag flips back to true.

### Library re-seed

- [ ] DevTools → `libraryRooms` → `data-workspace@1.0` → `seedVersion`
  is 2 (PR-11a bump). Component list matches the PR-11a shape.
- [ ] Set `seedVersion: 1` on the record manually, reload. The seed
  function overwrites the record back to seedVersion 2 with the
  current component list.

### Data Workspace room — empty state

- [ ] Open a Data Workspace conversation that hasn't had any files
  uploaded. Left rail shows the file-shelf header with a "Drop files
  or browse" zone. Canvas region shows three stacked
  "<canvas> needs data — Add a File shelf component to this room to
  provide data" empty states (one per chart-canvas / table-canvas /
  summary-dashboard).
- [ ] Inspector slot shows the Column inspector "Load a file to
  inspect its schema" empty state plus the context meter.

### Soft-dependency contract

- [ ] DevTools edit a Data Workspace mode and remove the
  `file-shelf@^1.0` entry from its components, save. Reload the chat.
  Each remaining canvas (chart / table / summary) renders the
  `data-source-needed` empty-state template ("<canvas> needs data —
  Add a File shelf component to this room to provide data") instead
  of attempting to render against an unset file.
- [ ] Add the file-shelf entry back. Empty states disappear; each
  canvas renders normally against the active dataset.

### File upload + canvas rendering

- [ ] Upload a CSV via "Drop files or browse" or the + button. Parsing
  spinner appears, file lands in the file-shelf list, the new file is
  marked active + in-context.
- [ ] Chart canvas renders a bar chart (default chartType) auto-derived
  from the file's first numeric columns. Table canvas renders rows
  with sticky header + sortable columns + "Load more" pagination.
  Summary dashboard renders KPI placeholders + a "Generate insights"
  click-target.
- [ ] Click a column header in the table canvas. Sort indicator
  appears; rows reorder. Click again to flip direction.
- [ ] Click "Generate insights" in the summary dashboard. Composer-tier
  Haiku call fires (DevTools Network shows the request); insights /
  KPIs / quality block render once the response parses. A "Regenerate"
  link appears alongside the section heading. **Insights do NOT
  generate automatically on file upload** — Phase 1 ships zero
  Agent-tier (autonomous-call) components.
- [ ] Click a column row in the column inspector. The detail row
  expands with Unique / Nulls / Sample stats. Click again to collapse.

### File-context toggle

- [ ] Click the link icon on a file card. The file flips out of context
  (icon changes to broken-link). DevTools → `files` → the record's
  `inContext` is now `false`. The "N file(s) in context" subtitle
  decrements.
- [ ] DevTools → publish-event listener: calling
  `hostAPI.subscribe('file-context-changed', console.log)` from the
  catalog dev surface and toggling a file logs the event payload
  `{ fileIds, conversationId }`. (Production code reads via
  FileShelfContext, but the bus event still fires.)

### Conversation switch

- [ ] Open conversation A (Data Workspace), upload a file. Navigate
  to conversation B (Data Workspace, different conversation). B's
  file-shelf is empty (per-conversation file lists). Navigate back
  to A. The file is still there, parsed-data cache survives
  (no re-parse spinner).
- [ ] Navigate `/chat/A → / → /chat/A` (transient null window).
  File-shelf state survives the round trip — the "two distinct
  non-null ids" reset guard ignores the homepage detour.

### Out of scope (don't test here)

- [ ] V1's per-column "Group by / Filter / Visualize" action chips
  that populated the chat input. Cross-component compose dispatch
  beyond the three Phase 1 bus events is a Phase 2 concern.
- [ ] A standalone canvas component without file-shelf in a
  custom-built room (e.g. via the editor in PR-8). The empty-state
  contract is verified, but composing arbitrary subsets of the
  decomposition is a follow-up exercise.
- [ ] Storage / quota behavior on multi-MB datasets — same code paths
  as V1 Pelican; no PR-11a regression risk.

---

## PR-11b — Decompose Secretarybird into 3 catalog components

👀 User-visible. Largest single-file decomposition in Phase 1 (V1
SecretarybirdChatLayout was 2928 lines, the largest single file in the
V1 codebase). V1 Secretarybird disappears as an adapter; the same
document-editing room is now expressed as a Drafting Desk template
composed of document-canvas + claude-comments + ripple-analysis +
the existing messages / input catalog entries.

**Surface:** `/chat/:id` for any conversation in a Drafting Desk room
(the `drafting-desk@1.0` libraryRoom — open via the homepage's
"+ Build a room" → Drafting Desk template, or via PR-10a-migrated
secretarybird conversations).

### Setup
- A Drafting Desk conversation. Easiest path: open the homepage,
  use "+ Build a room" → Drafting Desk, then open the resulting chat.
- For migration testing: a pre-PR-11b conversation in the same dev DB
  whose mode uses `document-centric@^1.0` and lacks `document-canvas`
  in its components — DevTools → IndexedDB → `modes` → confirm the
  components array doesn't include a `document-canvas@^1.0` entry.
- For sbrd_documents survival testing: a pre-PR-11b secretarybird
  conversation with paragraphs / comments / ripple flags already
  saved to `sbrd_documents`.

### Boot-time decomposition migration

- [ ] Fresh boot. DevTools → IndexedDB → `settings`. After init:
  - `migration_v2_secretarybird_room_decomposed` = true.
- [ ] DevTools → `modes` → any record where `layout.ref` starts
  `document-centric` and `buildIntent.derivedFrom` was previously
  `secretarybird-migration` now has `decomposedAt: 'pr-11b'` plus a
  5-component list (document-canvas + claude-comments + ripple-analysis +
  messages + input). Components have fresh ids.
- [ ] Clear `migration_v2_secretarybird_room_decomposed`, reload.
  The pass re-runs but skips every room (per-room "already has
  document-canvas" guard); the flag flips back to true.

### Library re-seed

- [ ] DevTools → `libraryRooms` → `drafting-desk@1.0` → `seedVersion`
  is 2 (PR-11b bump). Component list matches the PR-11b shape.
- [ ] Set `seedVersion: 1` on the record manually, reload. The seed
  function overwrites the record back to seedVersion 2 with the
  current component list.

### Drafting Desk room — empty state

- [ ] Open a Drafting Desk conversation that has no saved document.
  The document slot renders the paper with one empty paragraph
  ("Start writing here…" placeholder). The margin slots show the
  Comments section (empty) and Ripple section (no impacts detected).
- [ ] Type into the first paragraph. Auto-save fires after 1s
  (DevTools → `sbrd_documents` shows the new record with the typed
  text in `paragraphs[0].text`).

### Soft-dependency contract

- [ ] DevTools edit a Drafting Desk mode and remove the
  `document-canvas@^1.0` entry from its components, save. Reload the chat.
  Each margin component (claude-comments / ripple-analysis) renders the
  `document-source-needed` empty-state template ("Comments needs a
  document — Add a Document canvas component to this room to enable
  annotations") instead of attempting to render against an absent
  paragraph state.
- [ ] Add the document-canvas entry back. Empty states disappear; both
  margin components render normally against the active document.

### Existing user data survives

- [ ] Open a pre-PR-11b secretarybird conversation that was saved with
  paragraphs / comments / ripple flags. The document loads correctly,
  comments appear in the claude-comments margin pane, ripple flags
  appear in ripple-analysis (when rippleEnabled is on). No data loss.
- [ ] sbrd_documents record schema unchanged: `{ conversationId,
  paragraphs, suggestionStates, submittedReplies, updatedAt }`. PR-11b
  doesn't bump `DB_VERSION` — the store is the same one PR-7's
  validator covered.

### Document editing surface

- [ ] Type a `/` at the start of an empty paragraph → slash menu opens
  with Title / Heading 1 / Heading 2 / Quote options. Arrow keys
  navigate, Enter commits, Escape closes.
- [ ] Press Enter mid-paragraph → split into two paragraphs, cursor
  lands in the new paragraph at offset 0.
- [ ] Press Backspace at the start of a non-first paragraph → merge
  into the previous paragraph, cursor lands at the join point.
- [ ] Edit a paragraph's text. Toggle the Markup button in the toolbar
  → the text becomes a transparent caret with a diff overlay showing
  the original (strikethrough red) and inserted (underlined blue)
  words. Toggle off — back to clean text.
- [ ] In Markup mode the comment / suggestion gutter appears at 35%
  width to the right of paragraphs that have annotations. Plain
  paragraphs span the full width.

### Comment add / reply / Claude reply lifecycle

- [ ] Highlight text inside a paragraph → floating "Add comment" button
  appears just above the selection. Click it → inline comment input
  opens with the highlighted text shown as the comment's anchor.
- [ ] Type a comment, press Enter → comment appears in the
  claude-comments margin pane and (in markup mode) inside the document
  gutter. Selected-text snippet shows above the comment body.
- [ ] Press Ctrl+Alt+M while text is selected → same flow without the
  floating button.
- [ ] Click "Reply" on a comment → reply input appears. Type a reply,
  press Enter → user reply persists below the comment in both surfaces.
- [ ] Click the trash icon on a comment (sidebar or gutter) → comment
  disappears from both surfaces.

### Submit & Branch flow

- [ ] Make some edits + add at least one comment. Click "Submit Edits"
  in the toolbar → confirmation modal opens with summary
  (paragraphs changed, comment count, ripple-will-run note).
- [ ] Click "Submit & Branch" → "Sending to Claude…" loader appears.
  DevTools Network shows a single Composer-tier `claude-sonnet`
  request whose system prompt includes the document state, the
  comments list, and the ripple-flag JSON shape (when rippleEnabled).
- [ ] Once the call returns: any commentReplies render as Claude's
  reasoning under the corresponding comment cards. Any rippleFlags
  render in the ripple-analysis pane. A new branch conversation is
  created with `parentId` = source id and `room` copied from the
  source. Toast appears: "Edits submitted. A new branch was created."
- [ ] Open the branch from the conversation list — it renders via
  RoomShell (Drafting Desk template), the document loads with its
  paragraphs, baselines reset to current text (no tracked-changes
  highlights), comments cleared.

### Ripple toggle + scope

- [ ] Toggle the Ripple bell in the ripple-analysis margin pane off.
  Submit Edits — the system prompt no longer asks Claude for
  rippleFlags / rippleSuggestions. Toggle back on, submit again —
  ripple shape returns to the prompt.
- [ ] Click "Expand Scope" → RippleScopeModal opens with a list of
  other conversations. Select a few. The token estimate updates.
  Click "Scan N Chats" → per-target Composer-tier `claude-haiku`
  calls fire (DevTools Network shows them sequentially); flag count
  surfaces on completion.
- [ ] Tick "Save Scope" before scanning → DevTools → `settings` key
  `sbrd-ripple-scope-<conversationId>` stores the selected ids.
- [ ] Tick "Generate Revision Manifest" → after scan,
  `sbrd-ripple-manifest-<conversationId>` stores the entries.

### Conversation switch lifecycle

- [ ] Open conversation A (Drafting Desk), edit some paragraphs.
  Navigate to conversation B (different Drafting Desk). B's
  document loads cleanly (its own paragraphs, not A's).
  Navigate back to A — A's edits are still there (auto-save
  persisted). UI state (markup mode, expanded comments,
  active-comment highlight) resets per V1 lifetime.
- [ ] Navigate `/chat/A → / → /chat/A` (transient null window).
  Document state survives — the "two distinct non-null ids"
  reset guard ignores the homepage detour.

### Albatross / V1 chat surface no longer exists

- [ ] `src/adapters/secretarybird/` directory is gone. No production
  imports survive.
- [ ] Production bundle (`dist/assets/index-*.js`) symbol-greps
  positive for `document-canvas`, `claude-comments`,
  `ripple-analysis`, `document-source-needed`,
  `migration_v2_secretarybird_room_decomposed`, `DocumentContext`,
  `DocumentProvider`. Confirms PR-11b code shipped in the build.

### Out of scope (don't test here)

- [ ] Per-edit ripple analysis. Project memory note
  `project_secretarybird_ripple_phase2` covers this Phase 2 surface
  (analysis runs on each edit, fix suggestions surface as
  claudeSuggestions, post-branch review flow). PR-11b stays with V1's
  cross-paragraph-on-Submit only behavior.
- [ ] Document-canvas autosave or version history beyond what V1
  secretarybird did (one record per conversation in `sbrd_documents`,
  branches create separate records).
- [ ] Per-component permission grants for `sbrd_documents` writes —
  Phase 2 consent flow.
- [ ] Cross-component compose dispatch beyond the three Phase 1 bus
  events (e.g. claude-comments populating the chat input). Same
  Phase 2 punt PR-11a took for column-inspector's V1 action chips.

---

## PR-12 — Phase 1 cleanup + exit-criteria summary

🧱 Foundation. PR-12 is housekeeping — deletes V1-era infrastructure
that the route layer / adapter pattern stopped consuming after PR-10b /
PR-11a / PR-11b, plus the seventh full Phase 1 file delete (`swift`
adapter) and a short list of stale root-level docs. There is no new
behavior; the verification surface is "things that should not exist
no longer exist" and "all prior PR sections still pass."

### What got deleted

- [ ] `src/adapters/` — gone entirely. The directory itself is removed,
      not just the files inside. Final adapter (`swift`) shed; albatross,
      kingfisher, starling went in PR-10b, pelican in PR-11a,
      secretarybird in PR-11b.
- [ ] `src/lib/modeSuggestions.js` — gone. V1's "switch to a different
      bird-mode" suggestion engine is no longer reachable.
- [ ] `src/components/core/ModeSuggestion.jsx` — gone. The UI that
      surfaced the V1 mode switch suggestion.
- [ ] `src/stores/ModeContext.jsx` — gone. The V1 active-mode context
      and its `MODE_CAPABILITIES` registry. `<ModeProvider>` wrapper
      removed from `src/App.jsx`.
- [ ] `src/lib/tokens.js` — gone. The duplicate model-info table; cost
      data now lives only on the provider abstraction with a structured
      `cost` field hospitable to non-Anthropic providers (`null`,
      `{ type: 'metered', inputPerMillion, outputPerMillion }`,
      `{ type: 'free-local' }`).
- [ ] Root-level V1 working docs: `ROADMAP.md`, `DECISIONS-LOG.md`,
      `SESSION-LOG-2026-03-02.md`, `session-summary-2026-03-07`,
      `session-summary-2026-03-12`, `implementation-guide.md`. All
      preceded the V2 refactor and contradict current architecture in
      places.
- [ ] `mockups/` — moved to `refactor/v1-mockups-archive/`. Files
      preserved verbatim per audit §3.12 / NQ-10.

### What got rewritten

- [ ] `CLAUDE.md` — a 70-ish line redirect pointing at the V2 doc
      surfaces in `refactor/`. The 438-line V1 spec it replaced is
      reachable via `git show 12e142f:CLAUDE.md`.
- [ ] `README.md` — went from the bare Vite template to a real
      project intro covering V2 vocabulary (rooms, layouts, schemes,
      catalog components, templates).
- [ ] `src/main.jsx` — replaced the PR-10b `parliament-adapters-v1`
      cache wipe (no longer needed pre-launch) with a belt-and-braces
      `localStorage.removeItem('parliament-mode')` that catches
      installs whose PR-10a migration short-circuited and never got
      to drop the legacy key.
- [ ] `src/providers/anthropic.js` `getModels()` — restructured cost
      shape; numbers identical to before.
- [ ] `src/providers/base.js` — interface docstring updated to
      document the new cost shape.
- [ ] `src/views/SettingsView.jsx` `ModelSection` — derives the model
      list from `getProvider().getModels()` instead of a hardcoded
      duplicate; only UI-only metadata (`description`, `speed`,
      `badge`) stays local. Eliminates the duplication audit §3.10
      called out.

### Verification — production-bundle symbol-grep

Run `npm run build`. Then in `dist/assets/index-*.js`:

- [ ] `MODE_CAPABILITIES` — 0 occurrences.
- [ ] `ModeProvider` — 0 occurrences.
- [ ] `ModeSuggestion` — 0 occurrences.
- [ ] `evaluateSuggestions` / `csv-to-pelican` / `stylus-to-secretarybird` —
      0 occurrences each.
- [ ] `inputCostPer1k` / `outputCostPer1k` — 0 occurrences (legacy
      tokens.js shape).
- [ ] `parliament-adapters-v1` — 0 occurrences (no live cache wipe).
- [ ] `parliament-mode` — present (one in `lib/migration.js` as the
      one-shot legacy localStorage fallback; one in `main.jsx` as the
      defensive boot-time `removeItem`). Schema strings of the form
      `"parliament-mode/1.0"` also still appear and are unrelated —
      those are the mode-file schema name in `lib/modes.js` /
      `lib/db.js`.

### Verification — clean build + lint

- [ ] `npm run build` exits 0.
- [ ] No `adapter-swift-*.js` chunk emitted in `dist/assets/`.
- [ ] Bundle size moves slightly downward vs PR-11b (deletion-only
      change; no expected size growth).

### Phase 1 exit-criteria checklist

This is the canonical exit-criteria pass for Phase 1. Each criterion
points back at the PR section that owns its detailed verification.

- [ ] **A new user can build a room via any of the three paths and
      it works.** Verified by PR-8 (template gallery), PR-8b (wizard),
      PR-9 (editor) sections.
- [ ] **An existing V1 user's data survives the migration:**
  - `createdInMode → room` mapping holds. PR-10a section.
  - `sbrd_documents` records intact for Drafting Desk rooms. PR-11b
    section.
  - `files` / `file_data` records intact for Data Workspace rooms.
    PR-11a section.
  - Messages, highlights, notes, branches, favorites, pins, and
    parrot personas all migrate. PR-7 / PR-10a sections.
- [ ] **All V1 features available somewhere — shell or catalog
      component.** Walked through in audit §2.4 surface map; verified
      across PR-10a.5 through PR-11b sections.
- [ ] **Homepage, template gallery, editor, wizard render per their
      mockups.** PR-5 (homepage), PR-8 (gallery + wizard), PR-9 (editor)
      sections.
- [ ] **Export and restore round-trip correctly.** PR-7 section
      (encrypted `.apb` + plain JSON), including the new V2 stores
      and `sbrd_documents` validators.
- [ ] **No V1 code paths remain for the bird-mode adapter pattern.**
      PR-10b / PR-11a / PR-11b deletion sections + PR-12 directory
      sweep above.

### Out of scope (don't test here)

- DB v5 schema bump that strips `createdInMode` and adds
  `permissionGrants` for the consent flow — Phase 2.
- Multi-provider work (Ollama / OpenAI / Mistral, CSP relaxation,
  per-provider auth, model-picker field type) — Phase 2.
- Onboarding tour rewrites beyond minimum selector reattachment —
  Phase 2.
- Continuous validation sidebar in the editor — Phase 2 (PR-8
  deferred section).
- Phase 2 Secretarybird ripple work — see project memory note.
- Resources content production (the 19 launch resources).
- Catalog publishing infrastructure (npx scaffold, validator, PR
  template) — Phase 2.

---

## PR-13 — Build wizard rewrite + first-run gate + Table of Contents

👀 User-visible. The largest UI change since PR-9 (the original
wizard). Replaces the gallery-first `/build` flow with a Welcome
screen and an 8-screen wizard matching `parliament_wizard_v5.html`
verbatim. Makes the wizard the first thing every new visitor sees.
Ships `toc@1.0` `response-headings` mode (markdown headings as
anchors) as the wizard's "Table of Contents" feature.

**Surface:** `/build` route — entered from "+ Build a room" on the
homepage top bar, OR automatically as the first-run landing.

### Setup
- For the first-run flow: DevTools → Application → Clear site data → reload.
- For "+ Build a room" flow: any homepage state with the gear icon visible.
- For Table of Contents verification: a known-valid Anthropic API key.

### First-run gate (HomepageView)

- [ ] Fresh Parliament. Browser lands on `/build` (Welcome screen),
      not on `/settings`.
- [ ] DevTools → IndexedDB → `parliament` → `settings` after the
      wizard completes — `tourCompleted_wizard` = true.
- [ ] Clear localStorage + the `parliament-keystore` IndexedDB but
      keep `tourCompleted_wizard` = true. Reload `/`. Routes to
      `/settings` (the recovery path), NOT `/build`. The user
      pastes a fresh key in Settings; from then on `/` shows the
      homepage.

### Screen 0 — Welcome + path picker

- [ ] Three path tiles render: "Guide me through it" (default
      selected), "Start from a template", "Build it myself".
- [ ] Click an unselected tile → it gets the gold border + tint
      bg; the icon swatch flips to gold-tint-2.
- [ ] "Let's go" with "Guide me through it" → step 1.
- [ ] "Let's go" with "Start from a template" → inline gallery
      view; Back arrow returns to the Welcome screen.
- [ ] "Let's go" with "Build it myself" → routes immediately to
      `/edit/:newId` with a fresh blank Writing-Studio shape.

### Screen 1 — Purpose (multi-select)

- [ ] Four tiles render: Writing / Research / Coding / Thinking.
- [ ] Toggle two tiles → both stay selected; "Build another room
      after this one" checkbox appears below.
- [ ] Untoggle one of the two → checkbox disappears; selection of
      the remaining tile persists.
- [ ] Continue is disabled until ≥ 1 tile is selected.

### Screen 2 — Device (multi-select)

- [ ] Two tiles: Desktop / Mobile. Multi-select works.
- [ ] Continue disabled with zero selections.
- [ ] Receipt chips at top show prior selections (Purpose values).

### Screen 3 — Density + revealed Layout

- [ ] Three density tiles: Minimal / Balanced / Full.
- [ ] Pick Minimal → the Layout section reveals with a 0.22s slide-
      in. The single-column-with-sheet card auto-selects with a
      gold-pulse ring (0.6s). Auto-note reads "Only one layout
      fits this density. Auto-selected for you."
- [ ] Pick Balanced → reveals three-panel only, also auto-pulse.
- [ ] Pick Full → reveals 3 layout cards (three-panel, canvas-
      centric, document-centric), no auto-select. Continue is
      disabled until the user picks one.
- [ ] Click "Preview" on any layout card → slide-in overlay from
      the right (380px wide), shows a larger wireframe + long
      description. Esc closes; click on the dark backdrop closes.

### Screen 4 — Features

- [ ] Seven rows render in this order: Table of Contents
      (`Writing` tag), Context Health, Highlights, Branches,
      Collaboration Mode (`AI behavior` tag), Open Room (`Human
      sharing` + `Coming soon` tags, opacity reduced, can't
      toggle), File Shelf (`Research`, `Coding` tags).
- [ ] Click any of the six available rows → gold border + tint;
      check fills with white check on gold.
- [ ] Click Open Room → no state change.

### Screen 5 — Name + scheme

- [ ] Empty room-name input is auto-focused. Continue disabled
      until non-whitespace text.
- [ ] Type "My Studio". Summary card name updates live.
- [ ] Six scheme cards: Parliament Default (selected, "Built in"
      pill), Cool Bright, Deep Calm, Soft Violet, Fresh Teal,
      Amber Glow. Click Soft Violet → summary card background
      turns violet; "Soft Violet" appears in summary tags.
- [ ] Summary tags reflect: Purposes, Devices, Density, Layout
      label, Scheme label, and any selected Features.

### Screen 6 — Ignition

- [ ] Header reads "Connect your API key". Room-preview card shows
      the room name with feature chips (layout label + scheme +
      selected features), all dashed-border + muted-text.
- [ ] Paste a known-bad key → click Validate → red border on
      input, red error: "This API key is not valid. Please check
      your key and try again."
- [ ] Paste a known-billing-error key (403) → amber border, amber
      error message about credits.
- [ ] Network offline → click Validate → red border + "Could not
      reach the Anthropic API…" message.
- [ ] Paste a valid key → click Validate. Sequence:
        - Sweep line slides down through the room card (~0.75s)
        - Room card border flashes solid gold + bg gold-tint
        - Each feature chip "lights" in cascade (110ms stagger):
          dashed border → solid gold border + tint bg + gold-deep
          text
        - Connected badge appears below the input with a pulsing
          gold dot (~1.2s after click): "Connected. Your room is
          ready."
        - Enter button reveals at bottom-right.
- [ ] Edit the input after a failure → red/amber border resets
      to default 0.5px border.
- [ ] After successful connection: DevTools → IndexedDB →
      `parliament-keystore` shows the encrypted key under the
      user's storageMode (default 'persistent').

### Screen 7 — Done

- [ ] Click Enter on screen 6 → screen 7 with checkmark icon, "{Name}
      is ready" headline, "Build another room" + "Go to your
      Parliament" buttons.
- [ ] If Build-another was checked on screen 1: subtitle reads
      "Your first room is built. You said you wanted another —
      start the wizard again, or jump into your Parliament now."
- [ ] DevTools → `modes` shows the new room. → `conversations`
      shows a fresh row whose `room` matches the new mode id.
- [ ] "Go to your Parliament" → `/`. Homepage shows the new
      conversation in the chats section.
- [ ] "Build another room" → screen 0 with config reset.

### Open in editor escape (steps 3–5)

- [ ] On step 3 (after picking density+layout), click "Open in
      editor" → routes to `/edit/:id`. The mode has the chosen
      layout + scheme + baseline messages/input components.
- [ ] On step 5 (after naming the room), click "Open in editor"
      → routes to `/edit/:id`. The mode includes the user's
      chosen features.

### Receipt chips + Track

- [ ] Track at top of steps 1–6 shows 6 dots; current step has
      gold ring; prior steps have gold-filled dots with
      checkmarks; future steps have grey outline.
- [ ] Receipt strip at top of steps 1–5 shows chips (gold-dot +
      label) for prior selections. Chip animation: scale-in 0.85→1
      on appear.

### Table of Contents (toc@1.0 response-headings mode)

- [ ] Build a room with the Table of Contents feature on, layout
      = three-panel.
- [ ] Open the new conversation. Ask Claude to write a long
      response with multiple `## Heading 2` and `### Heading 3`
      sections.
- [ ] As the response streams in, the TOC sidebar populates with
      one entry per heading. Indent reflects level (H2 deeper
      than H1; H3 deeper than H2).
- [ ] Click a TOC entry → smooth-scrolls the page so the
      corresponding heading is at the top of the viewport (the
      heading id `msg-{id}-h-{idx}` matches a real DOM element
      injected by MessageCard).

### Backwards-compat for toc@1.0 user-prompts mode

- [ ] Open the dev `/catalog` route. The `toc@1.0` preview still
      renders sample user-message labels (the `previewRender`
      surface). The dev hand-built mode at /catalog continues to
      ship `toc@1.0` with no `mode` config — defaults to
      `user-prompts`. No regression vs PR-10a.8.

### Production-bundle symbol-grep

- [ ] `tourCompleted_wizard` appears in the bundle (settings
      flag).
- [ ] `response-headings` and `user-prompts` both appear (mode
      config values).
- [ ] `BuildStepper` and `BuildSteps` are absent (deleted).
- [ ] `parliament_wizard_v5` does NOT appear (the spec is in
      ~/Desktop, not bundled).

### Out of scope (don't test here)

- Multi-provider validation flow (Ollama / OpenAI). Phase 2 — see
  audit §3.20.
- Real-time multi-user "Open Room" sharing. Coming-soon stub
  only. Needs server-side infrastructure that contradicts the
  no-backend constraint; revisit as a separate scope statement.
- Wizard state survival across page reloads. The wizard config
  is in-memory React state only; reload during the wizard
  resets to step 0. Persistence is not in PR-13's scope.
- Density-driven layout filtering when device = mobile only. The
  spec's `LAYOUTS_BY_DENSITY` table doesn't filter by device;
  PR-13 follows that. A mobile-only user picking Full density
  sees three layouts, two of which are desktop-feeling — that's
  intentional per the spec.

---

## PR-14 — Homepage v2 visual alignment

👀 User-visible. Replaces the v1 grid-of-rounded-boxes blueprint
with an SVG floor plan whose room shapes reflect their layouts.
Aligns chats / library / favorites to the spec
(`parliament_homepage_v2 (2).html`). Adds drag-to-reorder for
sections. Topbar swaps labelled buttons for borderless icons.

**Surface:** `/` route — landing homepage for any user with an
API key + a completed wizard.

### Setup
- A homepage with at least 1 user-built room (run the wizard or
  `seedTemplates` to instantiate one).
- ≥ 3 conversations with summaries + tags so the chats section
  has rendered topic chips.
- ≥ 1 starred favorite.

### DB schema bump v5

- [ ] Reload Parliament for the first time after PR-14 lands.
      DevTools → IndexedDB → `parliament` → `parliament` shows
      version = 5.
- [ ] DevTools → `libraryRooms` / `libraryLayouts` /
      `libraryComponents` / `librarySchemes`. Every record has
      `author: { name: 'Parliament', handle: 'parliament',
      verified: true }` and `installedCount: 0`.
- [ ] `libraryComponents` is non-empty — populated from the
      catalog manifest registry (~24 entries on a default install).

### Topbar icons

- [ ] Topbar shows: Parliament wordmark, breadcrumb slot,
      backup-status dot, Wrench, Home (gold), Database, Settings.
      No bordered button rectangles.
- [ ] Hover Wrench → tooltip "Edit homepage"; click → navigates
      to `/edit-home`.
- [ ] Hover Home → tooltip "Build a room"; click → navigates to
      `/build`.
- [ ] Hover Database → tooltip "Backup & restore (Cmd+Shift+B)";
      click opens the backup modal.
- [ ] Hover Settings → tooltip "Settings"; click navigates to
      `/settings`.

### Section card chrome

- [ ] Each section has a 14px-radius white card with a
      thin-rule header.
- [ ] Hover the section header → grabber dots appear at left.
- [ ] Click chevron → body collapses with a smooth height
      transition (~280ms); chevron rotates -90°.
- [ ] Click chevron again → body expands smoothly.
- [ ] `prefers-reduced-motion: reduce` enabled → collapse is
      instantaneous (no transition).

### Section drag-reorder

- [ ] Grab the chats section's grabber → drag onto the
      blueprint section header → drop. Chats now sits above
      blueprint.
- [ ] Reload `/`. The reorder persists.
- [ ] DevTools → `modes` → `home_default`. The `components`
      array reflects the new order, with `order: 0..N`
      renumbered for section-slot entries only.

### Blueprint floor plan

- [ ] Blueprint renders as one SVG canvas with a hatched outer
      wall and faux floor grid.
- [ ] Each room has an irregular path matching its layout
      (three-panel: bump on right edge; canvas-centric:
      chamfered bottom-right; document-centric: chamfered
      bottom-left; single-column-with-sheet: chamfered
      top-right corner).
- [ ] Two rooms with the same layout have visibly different
      bump positions / chamfer depths (per-room hash variability).
- [ ] Active room's interior shows up to 3 gold feature pills
      drawn from its components (TOC, BRANCHES, HIGHLIGHTS,
      FILE SHELF, etc.).
- [ ] Gold pawn marker breathes (2.5s loop) inside the room
      with the most-recent conversation. With zero rooms, the
      pawn rides next to "+ Build a room".
- [ ] Hover the pawn → "You are here" tooltip follows the
      cursor.
- [ ] Hover a chat row → its room's path lights gold (cross-
      section bus working).
- [ ] Click "+ Build a room" placeholder → navigates to
      `/build`.

### Chats section

- [ ] Toolbar shows search box (~280px) + view toggle pill on
      the right with Sparkles / StickyNote / Highlighter /
      GitBranch icons + their text labels.
- [ ] Each row is a 5-column grid: gold checkbox, title +
      summary, topic chips, relative date, absolute date.
- [ ] Tag chips have hash-stable colors — the same tag string
      always lights up the same color across reloads.
- [ ] Click a row checkbox → row highlights gold; the toolbar
      flips to a gold bulk-toolbar with "N selected", Pin,
      Regenerate summaries, Delete (red on hover), Clear.
- [ ] Click Pin → all selected conversations get `pinned:
      true` in IndexedDB; selection clears.
- [ ] Click Regenerate summaries → titles / summaries / tags
      regenerate via the provider; selection clears.
- [ ] Click Delete → confirm prompt; on accept the
      conversations are gone.
- [ ] Footer shows "X conversations" with the live count.

### Library section

- [ ] Filter chips: All (default active) / Rooms / Layouts /
      Components / Schemes / Resources. Active chip has gold
      tint + gold border.
- [ ] Library-search box is at the right of the chip row.
- [ ] All filter shows ~30+ items (rooms 7, layouts 7,
      components 24+, schemes 6, resources 6).
- [ ] Each card shows a type-specific preview: rooms = walls
      with door dot + gold input dock; layouts = panel
      rectangles; components = timeline track + dots; schemes
      = full color swatch in the scheme's accent; resources =
      gold-tinted icon.
- [ ] Type chips colored per kind (room=gold, layout=purple,
      component=teal, scheme=brown, resource=gold).
- [ ] Click a card → right-side 420px slide-in overlay
      appears.
- [ ] Overlay shows author / updated / installs / version;
      per-type extras: Includes (rooms), Slots (layouts),
      Fits in slots (components), Covers (resources).
- [ ] Esc closes the overlay; clicking the backdrop closes
      it.

### Favorites section

- [ ] Each card has a 3-line snippet, a meta line with a gold
      star + source conversation title.
- [ ] Hover a card → copy button fades in top-right with a
      slight lift.
- [ ] Click copy → button flashes gold with a checkmark for
      ~1.5s, snippet text in the clipboard.
- [ ] Click section "Edit" button → cards grow gold
      checkboxes; Edit button shows "Done".
- [ ] Click checkboxes on 2 favorites → toolbar flips to gold
      bulk-toolbar with "2 selected" + Trash + Done.
- [ ] Click Trash → confirm; favorites removed; edit mode
      exits.
- [ ] Outside edit mode, clicking a card navigates to its
      source conversation.

### Cleanup verification

- [ ] `dist/assets/index-*.js` does NOT contain the symbol
      `BluePreview`.
- [ ] `src/catalog/entries/blueprint-preview.jsx` and
      `src/catalog/layouts/section-card.jsx` are gone from
      disk.
- [ ] `npm run build` clean.

### Out of scope (parked for PR-15)

- Topbar / chats toolbar / library filter chip overflow on
  mobile widths. The spec uses fixed widths and assumes
  desktop; the mobile responsiveness pass is its own PR.

---

## PR-15 — Mobile responsiveness audit

👀 User-visible

**Surface:** topbar, homepage chats / library / favorites,
build wizard, editor, all routes below 768px.

**Setup:**
- Seeded DB with at least 4 conversations across 2+ rooms (so
  the chats grid has content to crush at narrow widths).
- Seeded library (Rooms, Layouts, Components, Schemes tabs all
  populated — PR-14 seeding handles this).
- At least 2 favorites pinned.
- Browser DevTools responsive mode for the 320 / 375 / 480 /
  640 / 768 / 1280 viewport sizes; ideally also a real iPhone
  or Android device for touch verification.

**Steps:**

### Topbar
1. Visit `/` at 1280px viewport. Confirm topbar reads:
   `[mark] Parliament  [breadcrumb]  ............  [BackupDot] [Wrench] [Home gold] [Database] [Settings]` — pixel-identical to PR-14.
2. Resize to 600px. Confirm wordmark still visible, all icons fit, no horizontal scroll.
3. Resize to 480px. Confirm "Parliament" wordmark disappears, bird-mark icon stays. All four right-side icons still fit. Outer padding tightens (`px-4`).
4. Resize to 320px (iPhone SE). Confirm topbar still fits without horizontal scroll. Breadcrumb (if non-empty) truncates with ellipsis instead of pushing icons offscreen.
5. Resize back up to 1280px. Wordmark reappears, padding goes back to `px-6`.

### Homepage chats section
6. At 1280px, confirm chats toolbar reads: `[280px search] ........ [Summary][Notes][Highlights][Branches]` pill on the right.
7. Resize to 600px. Search box stretches to fill remaining row; view-toggle still has labels.
8. Resize to 520px. View-toggle drops labels — only icons visible. Hover/long-press a toggle button shows the label as a native title tooltip.
9. Resize to 640px. Chat row still has 5 visual columns (checkbox + title/subtitle + topics + relative-date + absolute-date) at 641px+, then drops absolute-date at 640 and below.
10. Resize to 480px. Chat row drops the topics chip column too — only checkbox + title/subtitle + relative-date remain. Padding tightens.
11. Resize to 320px. Chat row still legible — title ellipsifies, summary clamps, relative-date right-aligned.

### Bulk toolbar
12. At 480px, click checkboxes on 3 rows. Bulk toolbar (`{n} selected · Pin · Regenerate · Delete · Clear`) wraps to 2 lines if needed without overflowing. Clear button stays right-aligned.

### Library + favorites
13. At 320px, library grid is 1-col, lib cards still readable.
14. At 480px, library grid is 2-col.
15. At 320px, favorites grid is 1-col.
16. Tap a library card. Overlay slides in from right; at 320px viewport, panel is full-width minus 5% (the existing `max-width: 95vw`). Close button works.

### Build wizard
17. Visit `/build` at 320px. Wizard panel is 580px-max but `px-4` keeps content clear of edges. Step screens render. Receipt + track render.
18. Open the layout preview overlay from screen 3 (Density+Layout) at 320px. Panel is 380px-max + 95vw — fits without horizontal scroll.

### Editor gate (the new behavior)
19. Visit `/edit-home` at 1280px. Full editor renders as PR-8 / PR-14.
20. Resize to 767px. Editor immediately replaces with full-screen card: "The editor needs a wider screen" + body copy mentioning V3 + "Back to home" button.
21. Click "Back to home". Returns to `/`.
22. Visit `/edit/:roomId` at 320px. Same gate panel renders.
23. Rotate device portrait → landscape (or resize 767 → 769). Gate disappears, editor mounts.
24. Resize 769 → 767 with the editor mounted. Gate appears, editor unmounts.

### Section reorder on touch (negative test)
25. On a real iOS Safari device (or DevTools mobile emulation toggled with Cmd+Opt+M), visit `/`. Confirm section grabber dot-grids are not visible on the left of `Blueprint` / `Chats` / `Library` / `Favorites` headers. The 24x24 hit-area wrapper is gone; nothing claims layout space for a feature that wouldn't work.
26. Trying to drag a section header on touch should not produce any visual drag affordance.
27. On desktop (mouse-primary), the grabber is still revealed on hover and section reorder still works.

### Regression: desktop above 768px
28. At 768px, 1024px, 1280px, 1440px — every surface looks pixel-identical to PR-14 (no extra rules accidentally activating above breakpoint).

**Expected:** Every step passes; no horizontal scroll at 320px on any route except the editor (which gates instead of scrolling).

### What's known-broken-but-deferred

- Multi-rail room layouts (three-panel / canvas-centric / document-centric) below 768px still render their full desktop rails and crush content. PR-16 adds narrow-mode collapse.
- HTML5 D&D for section reorder is gone on touch (intentional). PR-17 may revisit with dnd-kit.
- `/chats` V1 SelectorView is not in this PR.

---

## PR-16a — Blueprint variety + pills-on-all-rooms + per-turn model

👀 User-visible

**Surface:** the homepage Blueprint section + the data write that
backs the "Last spoken to" label.

**Setup:**
- Seeded with 6+ rooms covering all four layouts (three-panel,
  canvas-centric, document-centric, single-column-with-sheet) — at
  least 2 of each. Build them via `/build` if the seed doesn't have
  them.
- Each room with at least one conversation so "Last spoken to" has
  a value to display.
- A model picker accessible (Settings → Default model, or whatever
  surface allows changing the per-conversation model).

**Steps:**

### Shape variety
1. Visit `/`. Open the Blueprint section. Confirm **every layout
   has visible variety** — across rooms of the same layout, you
   should see at least two distinctly different shapes (e.g. a
   three-panel room with a right-rail bump and another with a
   dual-bump or tall-bump). Mirroring may also flip some bumps to
   the left side.
2. Reload the page. Every room renders the **same shape** it had
   before — variant + mirror are deterministic per room id.
3. Build a brand-new room via `/build`. The new room appears on the
   homepage with one of the variant shapes (which one depends on the
   new id's hash).

### Canvas-centric alcove (spec match)
4. Find a canvas-centric room with hash mod 3 = 0 (likely the most
   common variant). Confirm its **right edge protrudes outward** at
   the bottom (a small annex sticking out 12-14px), with a 45°
   diagonal transition into the protrusion. Other canvas-centric
   variants may show a top-right notch (corner cut out
   rectangularly) or a mid-right L-jog.

### Pills on every room
5. Confirm pills render on every room with mapped components — not
   just the active room. The active room (most-recent conversation)
   shows **gold pills** (`rgba(196,169,77,0.15)` bg). Other rooms
   show **gray pills** (`#F1F1EF` bg, slightly thinner — height 12
   vs 14, smaller text).
6. Hover a chat row in the Chats section → its room highlights
   gold, but its pill palette stays gray (palette is determined by
   active-room status, not hover).

### Interior wall hints
7. Inside each room, faint dashed lines or hatched rectangles
   suggest the layout's slot structure:
   - **three-panel**: two vertical dashed lines spanning ~75% of room height.
   - **canvas-centric**: a faint hatched rectangle in the upper portion.
   - **document-centric**: two horizontal dashed lines mid-height.
   - **single-column-with-sheet**: a narrow vertical hatched rectangle.
8. Hints are slightly perturbed per room (positions ±2-3px), so
   even rooms of the same layout don't have identical hint placement.

### "Last spoken to" friendly names
9. For a conversation whose `model` is `claude-sonnet-4-6`, the
   homepage label should read "Last spoken to **Claude Sonnet 4.6**"
   — not the raw kebab-case id.
10. Open a room's chat. Switch the model (e.g. Settings change, or
    via a model picker if one is exposed on /chat/:id). Send a
    message. Return to `/`. The "Last spoken to" line for that room
    should now show the new model name.

### Regression
11. Pawn breathing animation still runs on the active room.
12. Hover-cross-link still works: hovering a chat row lights up
    the corresponding room gold.
13. Empty homepage (zero rooms) still shows just the "+ Build a
    room" placeholder with the pawn next to it.
14. Single-room homepage shows the room with active gold pills + the
    placeholder beside it.
15. Long room names still ellipsify or wrap inside the room interior
    box; pills don't overflow the room footprint.

**Expected:** Every step passes; no rendering errors in the SVG;
the blueprint feels architecturally varied (not a grid of
identical shapes); the "Last spoken to" line always reflects the
most recent model used in each room.

### What's known-broken-but-deferred

- Mirror-induced bumps on rooms at the cluster edges may protrude
  slightly past the outer wall (rare; accepted as architectural quirk
  per design doc §2.5 "irregular hatching grammar").
- Per-turn `conversation.model` write-back is fire-and-forget; if it
  fails, the homepage label may lag the actual model used. Acceptable
  trade-off — the catch swallows errors silently rather than
  affecting the user-facing send flow.

---

## PR-16 — Multi-rail room layouts: responsive collapse below 768px

👀 User-visible

**Surface:** the three desktop-only room layouts at narrow viewport
widths — `three-panel`, `canvas-centric`, `document-centric`. New
shared primitives in `src/components/layouts/` provide hamburger
drawer + chrome bar + sheet vocabulary.

**Setup:**
- Seeded with at least one room for each of the three layouts. The
  default seed includes a three-panel room (Albatross-equivalent
  general chat) and the `/build` flow covers all three.
- Chrome (or any browser with DevTools device-emulation) — narrow
  testing is done by resizing or toggling device-emulation under
  768px width.
- For reduced-motion testing: DevTools "Rendering → Emulate CSS
  media feature prefers-reduced-motion: reduce" or system
  Accessibility → Reduce Motion.

**Steps:**

### Three-panel narrow
1. Open a three-panel room. Resize the window to <768px width (e.g.
   400px). Confirm:
   - Rails are gone from the body.
   - A thin chrome bar at the top shows two icons: hamburger (left)
     and PanelRight (right).
   - Default body shows messages + input dock at bottom.
2. Tap the hamburger icon. Confirm:
   - A drawer slides in from the left edge with a darkened scrim.
   - The drawer contains the left-rail content (chats list, etc.).
3. Press Esc. Drawer closes. Tap hamburger again, then click the
   scrim outside the drawer. Drawer closes.
4. Tap the PanelRight icon. Confirm:
   - The body swaps from messages to a vertical stack of right-rail
     content (sheet-of-boxes, branches, settings panel).
   - The PanelRight icon shows its active state (gold tint).
   - Input dock is hidden in this view.
5. Tap PanelRight again. Body swaps back to messages.
6. Resize back to ≥768px. Layout returns to the desktop three-rail
   composition with no leftover state artifacts.

### Canvas-centric narrow
7. Open a canvas-centric (Pelican-equivalent data workspace) room.
   Resize to <768px. Confirm:
   - Body shows the canvas (chart/table/dashboard) full-width.
   - A "CHAT" chevron handle sits below the canvas, above the input
     dock.
   - Input dock is at the bottom.
   - Chrome bar at top: hamburger + PanelRight (labeled
     "Inspector").
8. Tap the chevron. Chat-panel slides into view (instant — no
   animation; matches single-column-with-sheet). Tap again →
   collapses.
9. Tap PanelRight (Inspector). Body swaps to a stack of inspector
   components (column / schema details). Tap again → swaps back to
   canvas + sheet + input.
10. Tap the hamburger. File-shelf drawer opens.

### Document-centric narrow
11. Open a document-centric (Secretarybird-equivalent drafting)
    room. Resize to <768px. Confirm:
    - Document fills the body, scrolls vertically.
    - "CHAT" chevron handle at the bottom (no separate input dock —
      chat panel includes its own input).
    - Chrome bar: hamburger + PanelRight (labeled "Margin").
12. Tap chevron → chat panel reveals. Tap PanelRight → margin
    annotations show as the body. Tap hamburger → outline drawer.

### Reduced motion
13. Enable `prefers-reduced-motion` (DevTools or system). Tap
    hamburger. Drawer should appear instantly — no slide animation.
    Same for closing via Esc / scrim. Backdrop fade is also
    disabled.

### Untouched layouts
14. Open a single-column-with-sheet room (Swift-equivalent pocket
    chat) at <768px. Renders identically to its pre-PR behavior —
    sheet handle below input dock, no NarrowChrome / NarrowDrawer.
15. Visit `/` (homepage) at <768px. Renders per PR-14/PR-15 — no
    NarrowChrome introduced.
16. Open `/edit/:id` at <768px. Still shows PR-15's "needs wider
    screen" gate; no narrow editor. (No regression.)

### Desktop regression
17. Resize back to ≥768px on each layout from steps 1, 7, 11. Confirm
    pixel-identical desktop rendering — fixed-width rails restore,
    chrome bar disappears, drawer state is clean.

### Build / lint
18. `npm run build` — passes. Inspect `dist/assets/index-*.js` and
    confirm `NarrowDrawer`, `NarrowSheet`, `NarrowChrome` symbols
    appear (they're referenced from the layout files, so Rollup
    keeps them).
19. `npm run lint` — error count unchanged from the ~165-error
    pre-existing baseline.

**Expected:** Every step passes. Below 768px, the three rail layouts
present a coherent narrow tree with hamburger drawer for the primary
rail, chevron sheet for chat-panel (canvas/document layouts),
panel-toggle for the secondary content. Above 768px, behavior is
unchanged.

### What's known-broken-but-deferred

- Auto-open-sheet-on-send for canvas-centric/document-centric: the
  user must tap the chevron to see Claude's reply after sending.
  Manual; will be revisited if verification surfaces friction.
- URL-routed right panel: hardware back button leaves the chat
  rather than dismissing the panel (matches desktop behavior).
- Editor preview narrow rendering: editor is gated <768px, so the
  preview's RoomShell never enters narrow mode regardless of
  preview-pane width. Container-query rewrite is a future PR.

---

## PR-17 — dnd-kit migration for homepage section reorder

👀 User-visible

**Surface:** `/` homepage section reorder (Chats / Library / Favorites
/ Blueprint cards). Affects three files: stacked-sections layout,
SectionCard component, index.css. Adds `@dnd-kit/modifiers` dep.

**Setup:**
- A homepage with ≥ 3 sections (the default seed satisfies this:
  Blueprint, Chats, Library, Favorites).
- Browsers: Chrome desktop + Firefox desktop + Safari iOS + Chrome
  Android. The mobile cases are the load-bearing ones — PR-15 hid
  the grabber on touch primary devices specifically because the
  HTML5 implementation didn't work there.

**Steps — desktop pointer (Chrome + Firefox):**
1. Open `/`. Hover a section header → grabber dots fade in (the
   existing PR-14 hover-revealed affordance is preserved).
2. Press the grabber, move ≤ 3px without releasing → drag does NOT
   start (the 4px PointerSensor `distance` threshold gates it).
3. Press the grabber, move ≥ 5px → drag begins. The source section
   dims to 0.5 opacity; a lifted clone (`section-drag-preview`)
   appears at the cursor with a shadow.
4. Move the cursor horizontally → the clone stays vertically
   aligned and does NOT slide sideways (axis lock via
   `restrictToVerticalAxis`).
5. Move the cursor outside the `max-w-5xl` page container → the
   clone stays inside the container's horizontal bounds (parent
   lock via `restrictToParentElement`).
6. As the clone passes over neighboring sections, those sections
   smoothly transform-shift to make room.
7. Release on a different section → the order updates immediately;
   reload `/` → order persists.
8. DevTools → Application → IndexedDB → `parliament` → `modes` →
   `home_default` → `components[].order` is `0..N` for section-slot
   entries; non-section-slot entries are untouched.
9. Press Esc mid-drag → the drag cancels; order unchanged; the
   clone disappears.

**Steps — keyboard (any desktop browser, with a screen reader if
available — VoiceOver / NVDA / JAWS):**
1. Tab through the homepage until the grabber receives focus → a
   visible focus ring appears on the grabber button.
2. Screen reader announces "Reorder Library section, button" (or
   equivalent for whichever section's grabber is focused).
3. Press Space → screen reader announces "Picked up Library
   section. Position 2 of 4." (positions vary by current order).
4. Press Arrow Down → screen reader announces "Library section
   moved to position 3 of 4."; sibling sections visibly shift.
5. Press Space → screen reader announces "Library section dropped
   at position 3 of 4."; reorder persists across reload.
6. Press Tab → focus moves naturally to the next focusable element
   (not stuck on the grabber).
7. From step 3, instead of Space at step 5, press Esc → screen
   reader announces "Reordering cancelled. Library section
   returned to its original position."; the order is unchanged.

**Steps — touch (iOS Safari 16+ on iPhone, Chrome on Android):**
1. Open `/` on the device. Grabber dots are visible at rest (NOT
   hover-revealed — the PR-17 touch-media-query override).
2. The grabber hit area is comfortably finger-sized (40×40 vs the
   24×24 desktop size).
3. Tap a grabber and immediately release (<250ms) → nothing
   happens. No drag starts. No iOS magnifier/callout appears. No
   text gets selected. No scroll.
4. Tap and hold a grabber for ≥ 250ms without moving the finger
   → drag begins. The lifted clone tracks the finger.
5. During the 250ms delay, drift the finger up to 5px → drag still
   starts (within tolerance).
6. During the 250ms delay, drift the finger > 5px → drag does NOT
   start; the page scrolls normally.
7. Mid-drag, swipe the finger toward the screen edge → the clone
   stays inside the page container (parent lock).
8. Release on a target section → the order updates; pull-to-refresh
   or kill-and-reopen the tab → order persists.

**Steps — reduced motion (macOS or iOS preference enabled):**
1. macOS: System Preferences → Accessibility → Display → enable
   "Reduce motion". iOS: Settings → Accessibility → Motion → enable
   "Reduce Motion".
2. Reload `/`. Drag a section.
3. Sibling shift is instant (no animated tween between positions).
   The DragOverlay clone still tracks the pointer/finger — that's
   responsive feedback to input, not animation, so it stays.

**Steps — regression checks (these gestures should still work):**
1. Open a chat that has the file-shelf: drag a file from desktop
   onto it → upload starts as before. (FileShelf still uses HTML5
   drop; PR-17 did not touch it.)
2. Open Settings → Backup & Restore → drag a `.parliament` backup
   file onto the import drop zone → import flow starts. (Backup
   modal still uses HTML5 drop.)
3. Open the editor (`/editor/:roomId`) at ≥ 768px viewport → all
   three rails' dnd-kit drag/drop still works (PR-17 did not touch
   the editor's `useDraggable`/`useDroppable` wiring).

**Steps — lint + bundle (CI gates):**
1. `npm run lint` → 164 problems (162 errors + 2 warnings). One
   less than the PR-16 baseline of 165, because inlining the
   stacked-sections render function removed a pre-existing
   `react-refresh/only-export-components` error.
2. `npm run build` → clean build, no warnings.
3. Bundle delta: `dist/assets/index-*.js` gzipped size grows by no
   more than 3 kB versus PR-16 (the modifiers package + sortable
   keyboard coordinates).
4. Symbol-grep: `grep -c onSectionDragStart dist/assets/index-*.js`
   returns 0. Same for `onSectionDragOver`, `onSectionDragEnd`,
   `onSectionDrop`, `isDropTarget`, `dropTargetId`. The
   announcement string `"Picked up"` returns 1. The CSS class
   `section-drag-preview` returns 1 in JS and 1 in CSS.

**Expected:** Every step passes. Section reorder works on desktop
pointer (existing behavior preserved), keyboard (new), and touch
devices (new). Screen reader users hear what they're doing at each
step. The HTML5 D&D code path is completely gone from the bundle.
File-upload drop zones and editor drag-drop are unaffected.

### What's known-broken-but-deferred

- Library / Favorites overlay reorder: out of scope per scoping
  with user. Library/Favorites are catalog components that don't
  currently expose reorder UI. PR-17 makes the dnd-kit primitive
  available; future PR can apply it there if there's user demand.
- Reordering rooms inside the blueprint: deferred to the blueprint
  enhancements PR (PR-19 in the current ledger, which also covers
  the room "bloom" interaction + duplicate/merge actions).

---

## PR-18a — Mobile homepage polish + touch haptic

👀 User-visible

**Surface:** Homepage Chats section toolbar/footer, Library section
filters/search, Backup & Restore modal footer status + recommended
card, homepage section drag-start gesture.

**Setup:**
- Homepage with ≥ 3 sections and ≥ 1 conversation.
- A browser at < 768px viewport (Chrome DevTools mobile emulation
  or a real device) for H1 + H2.
- A real Android device for the haptic test (iOS does not implement
  the Web Vibration API).

**Steps — H1: Chats section view-toggle moves to footer on narrow:**
1. Open `/` at ≥ 768px viewport. The Chats section toolbar shows the
   search input + the view toggle (Summary / Notes / Highlights /
   Branches) on the right. (Unchanged from PR-14.)
2. Resize to < 768px (or open the homepage on a phone). The view
   toggle disappears from the toolbar. The search input now stretches
   the full width of the toolbar.
3. Scroll to the bottom of the Chats card. The view toggle now sits
   in the footer to the right of "N conversations".
4. Tap any toggle option (Notes / Highlights / Branches / Summary).
   The chat row second lines update as before — state is preserved
   across the toggle move.
5. Resize further to < 480px. The footer wraps so the toggle drops
   below the "N conversations" count rather than crowding it.
6. Select a chat row (checkbox) → the bulk toolbar appears in the
   header; the view toggle is hidden in the footer too while
   selection is active.

**Steps — H2: Library search input full-width on narrow:**
1. Open `/` at ≥ 768px viewport. The Library section filter chips
   row shows the chips on the left and a fixed 180px-wide search
   input on the right. (Unchanged from PR-14.)
2. Resize to < 600px. The search input wraps to its own row below
   the filter chips and stretches the full width of the section card.
3. Type a query — search functionality is unchanged.
4. Switch filter tabs — the search input stays on its full-width row.

**Steps — H3: Backup & Restore "Never backed up" copy:**
1. Open Settings → Backup & Restore on a fresh browser where no
   backup has been made.
2. Modal footer reads "Never backed up" (no "· This browser" suffix).
3. Create a backup. Reopen the modal. Footer now reads
   "Backed up ... · This browser" — the suffix is preserved for the
   with-backup case where it disambiguates which browser.

**Steps — H4: Backup & Restore recommended-card button layout:**
1. Open Settings → Backup & Restore.
2. The gold-tinted "Everything" recommended card now shows the
   Database icon + "Everything" title + "Recommended" pill + stats
   on the top row, and the "Back up everything" button stretches
   full-width below them.
3. Tap "Back up everything" → backup flow works as before.
4. The card layout works on both desktop and mobile (no media query
   gate — the stacked layout reads as a clearer primary action at
   all sizes).

**Steps — Haptic on section drag-start (Android only):**
1. Open `/` on a real Android device. System haptic feedback must
   be enabled (Settings → Sound & vibration → Vibration & haptics).
2. Press and hold a section's grabber for 250ms+. Drag starts.
3. A single brief vibration pulse fires at the moment the drag
   picks up — confirming the gesture registered.
4. Subsequent dragover events do NOT fire haptics (intentional —
   only the start pulse to avoid buzz-fatigue).
5. Open the same page on an iPhone or iPad. Press and hold the
   grabber for 250ms+. Drag starts visually but no haptic fires.
   This is expected — iOS Safari does not implement the Web
   Vibration API.
6. On a touchscreen laptop, mouse-press the grabber and drag.
   No haptic fires (pointerType !== 'touch' gates the call).

**Steps — Regression on previously-working flows:**
1. Desktop ≥ 768px: Chats toolbar layout unchanged — search +
   toggle on one row.
2. Desktop ≥ 600px: Library filter row layout unchanged — chips
   + 180px search inline.
3. Backup flow end-to-end still works (create, encrypt, download).
4. Section reorder (PR-17) still works on all platforms.

**Steps — Lint + bundle:**
1. `npm run lint` → 164 problems (162 errors + 2 warnings). Same
   as PR-17 post-merge baseline. No new errors.
2. `npm run build` → clean.
3. Symbol-grep: `grep -ohc "Back up everything" dist/assets/index-*.js`
   returns 1. `"This browser"` returns 1 (the with-backup path).
   `"Never backed up"` returns 2 (backup.js label constant + modal
   display). `navigator.vibrate` returns 1.

**Expected:** Every step passes. Mobile chats has a roomier search
+ footer-anchored view toggle. Mobile library has a full-width
search. Backup modal reads cleaner ("Never backed up" sans suffix,
primary action as a full-width button). Touch drag-start on Android
emits a brief haptic confirmation; iOS and desktop are unaffected.
No regressions on existing desktop or PR-17 behaviors.

### What's known-broken-but-deferred

- The "I" items batch is firmly PR-18b/c+ (input area redesign for
  mobile + mobile Settings redesign + `+` menu architecture as
  components-contribute-input-actions). See discussion notes —
  Web Search and File Attach become catalog components in their
  own PRs.
- No iOS haptic alternative shipped. The Web Vibration API is the
  only standard option for pure web pages, and Apple does not
  implement it. WKWebView-bridge approaches are out of scope for
  a pure browser app.

---

## PR-18b — Mobile input redesign + inputActions contribution infrastructure

👀 User-visible | 🧱 Foundation

**Surface:** `/chat/:id` input component (`input@1.0`) on viewports
<768px. The chat-input card on phones gains a mic↔send swap, a `+`
overflow that reads from sibling component contributions, and a
mask-image fade on messages above the input. Plus a new manifest
contribution type — `inputActions` — that mirrors `messageActions`
and is the foundation for PR-18d (`web-search@1.0`) and PR-18e
(`file-attach@1.0`).

**Setup:**
- Any room with `input@1.0` and `voice-input@1.0` mounted (the
  default Pocket Chat template satisfies this).
- Browser at <768px viewport (Chrome DevTools mobile emulation or
  a real phone). Both iOS Safari and Android Chrome should work,
  with the known iOS limitation that the Web Speech API requires
  a user gesture and works in Safari 17+ only.

**Steps — mic↔send swap on mobile:**
1. Open `/chat/:id` at <768px. The input renders as a card with
   `+` on the left and a mic icon on the right.
2. Type one character. The mic icon transforms into a Send arrow
   (gold filled).
3. Clear the text. The Send arrow transforms back to a mic icon.
4. Tap the mic. SpeechRecognition starts (voice-input@1.0
   subscribed to `input-action:voice-toggle` via the new event).
   Browser permission prompt may appear on first use.
5. Speak; final transcripts append to the textarea via the existing
   `voice-transcript` event. Mic transforms to Send (text now
   present).
6. Tap Send. Message sends.

**Steps — `+` overflow menu reads contributions:**
1. With Pocket Chat (default) mounted, tap the `+`. Menu opens with
   "Upload file" as the only item (file-upload is intrinsic for
   PR-18b; moves to `file-attach@1.0` in PR-18e). The hardcoded
   Web Search / Calculate / Create Chart stubs from V1 are gone.
2. Verify the bundled JS contains no `Create chart` string
   (`grep -ohc "Create chart" dist/assets/index-*.js` returns 0).
3. When PR-18d ships `web-search@1.0`, mount it in a room and
   reload. Tap the `+`: a "Web search" item appears in the
   overflow below "Upload file". (Not testable until PR-18d.)

**Steps — `+` disabled state (deferred until PR-18e):**
1. The V2 disabled-state code path is in place but currently
   unreachable: `overflowIsEmpty` is gated on intrinsic count === 0,
   and intrinsic file-upload always counts. Rollup dead-code-
   eliminates the disabled branch in production.
2. When PR-18e moves file-upload to `file-attach@1.0`, the gate
   will activate. PR-18e MUST re-verify: mount a room without
   any non-primary contributors; the `+` button renders disabled
   (opacity 0.4, `cursor: not-allowed`); hovering shows the title
   tooltip "Add components to enable more actions".

**Steps — message fade on mobile:**
1. Open `/chat/:id` at <768px with at least 5–10 messages in the
   conversation (scroll to fill the viewport above the input).
2. The bottom ~64px of visible message content fades into
   transparency, creating a soft transition into the input card
   below. The fade is positional — scrolling the message list
   does not move the fade band; it stays at the bottom of the
   visible area.
3. Confirm on iOS Safari (uses `-webkit-mask-image`) and Chrome
   Android (`mask-image`). Both prefixed and unprefixed
   declarations ship in `dist/assets/index-*.css`.
4. Above 768px: no fade. The `@media (max-width: 768px)` gate
   in `index.css` keeps desktop unchanged.

**Steps — voice-input render gating:**
1. On mobile (<768px), voice-input@1.0's own button is NOT visible
   anywhere. The mic affordance is exclusively the one rendered
   by `input@1.0` in its card layout right slot.
2. On desktop (≥768px), if voice-input@1.0 is mounted in a slot
   that has UI presence (e.g., the standalone Pocket Chat layout
   that puts it in `input-dock` next to `input@1.0`), its own
   button is visible there — unchanged from PR-10a.8.

**Steps — Desktop ≥768px regression:**
1. Open `/chat/:id` at ≥768px. Input renders inline (the existing
   desktop layout) by default — NOT as a card.
2. Send via Enter / Send button works as before. No mic↔send swap
   on desktop (the right-primary action slot is only honored in
   card layout per Swift V1 spec). Desktop honors the existing
   inline Send button behavior.
3. The `+` button in the inline layout opens PlusMenu with
   "Upload file" as the only item (same as mobile minus the
   contributions if no overflow contributors are mounted).
4. No mask fade on messages — desktop is unaffected.

**Steps — inputActions infrastructure plumbing:**
1. Open DevTools console on `/chat/:id` with any room. Type
   `window.__roomShellHostAPI?.getInputActions?.()` — if exposed,
   should return an array. (May not be exposed by default; this
   is a smoke-test invocation.)
2. Symbol-grep production bundle:
   - `grep -ohc "inputActions" dist/assets/index-*.js` → ≥2
   - `grep -ohc "getInputActions" dist/assets/index-*.js` → ≥1
   - `grep -ohc "_setInputActions" dist/assets/index-*.js` → ≥2
   - `grep -ohc "input-action:" dist/assets/index-*.js` → ≥2
   - `grep -ohc "voice-toggle" dist/assets/index-*.js` → ≥1
   - `grep -ohc "messages-fade-mask" dist/assets/index-*.{js,css}` → ≥1 each

**Steps — Lint + build:**
1. `npm run lint` → 164 problems (162 errors + 2 warnings). Same
   as PR-17/PR-18a baseline. No new errors.
2. `npm run build` → clean.

**Expected:** Every step passes. Mobile input matches the Swift V1
visual (card layout with `+` on left, mic↔send on right, message
fade above). The `inputActions` contribution type is fully wired
infrastructure ready for `web-search@1.0` (PR-18d) and
`file-attach@1.0` (PR-18e) to consume. voice-input@1.0 demonstrates
the contribution pattern end-to-end via the right-primary mic slot.
Desktop behavior is unchanged.

### What's known-broken-but-deferred

- The V2 disabled-state for `+` button is dead-code today. PR-18e
  flips the gate by moving file-upload out of `InputArea` to
  `file-attach@1.0`. Manual verification of the disabled tooltip
  is deferred to PR-18e's checklist.
- `web-search@1.0` and `file-attach@1.0` catalog components are
  separate PRs (18d/18e). PR-18b ships only the infrastructure.
- Mobile Settings redesign is PR-18c (separate scoping pass needed
  on the existing Settings content's grouping).
- Mic↔send swap is mobile-only by user direction (locked decision
  A1). Desktop continues to render Send always at rest.

---

## PR-18c — Mobile Settings chevron-expandable cards

👀 User-visible

**Surface:** `/settings` on viewports <768px. The page chrome changes
from the desktop left-nav + main-pane to a vertical list of
chevron-expandable rows. Each row's expanded panel renders the same
section component (`ApiSection` / `ModelSection` / etc.) the desktop
already renders — content semantics are identical across viewports.
Desktop Settings (≥768px) is untouched.

**Setup:**
- Browser at <768px viewport (DevTools mobile emulation at 375×667
  or a real phone). Both iOS Safari and Android Chrome should work.
- Optional: clear `tourCompleted_settings` in IndexedDB to verify
  the first-visit tour also lands on the mobile chevron rows.

**Steps — Layout + initial state:**
1. Open `/settings` at <768px. The page renders the mobile layout:
   small grey decorative handle pill at top-center, a single top row
   with a back arrow + "Settings" label, then seven section rows
   stacked vertically.
2. The first row (API Configuration) is expanded by default; the
   API key Input + Key Storage radio + "Get an API key" info card
   render below the row header.
3. The remaining six rows (Model Preferences, Usage & Spending,
   Context & Defaults, Data & Backups, Appearance, About & Security)
   are collapsed — only the icon + label + right-pointing chevron
   are visible.
4. Tap the back arrow → navigates to `/`.

**Steps — Multi-open accordion:**
1. Tap the Context & Defaults row. It expands; chevron rotates 90°
   to point down; Summary Depth + Context Threshold + Auto-Compress
   cards render. API row stays expanded.
2. Tap the Appearance row. Expands. Theme + Text Size cards render.
   API and Context rows still expanded.
3. Tap the Context row's chevron (or anywhere on the row). Collapses.
   API and Appearance stay expanded.
4. Tap the API row. Collapses. Appearance stays expanded.
5. The accordion height animation runs at ~250ms unless
   `prefers-reduced-motion` is set, in which case it's instant.

**Steps — Section content correctness:**
1. Expand API Configuration. Tap into the API key Input. Type a
   sample key (`sk-ant-test`). Storage Mode radio shows the two
   options. The "Get an API key" link works (opens
   console.anthropic.com in a new tab).
2. Expand Model Preferences. The 4 model cards render with cost +
   speed metadata. Tap a non-active card; the active outline + filled
   dot move to it. `settings.defaultModel` updates.
3. Expand Usage & Spending. Stats grid renders. Toggle Budget Alert
   on → the inline range slider appears with the existing height-auto
   reveal animation. Dismiss the "Set a spending limit on Anthropic"
   card.
4. Expand Context & Defaults. Summary Depth segmented control,
   Context Threshold slider, and Auto-Compress radio group all
   interactive.
5. Expand Data & Backups. Storage usage bar renders with the right
   color (green / orange / red based on percent). Tap "Backup &
   restore" → V2 backup modal opens, fills the viewport edge-to-edge
   (16px gutters from Modal's `mx-4`). Close the modal. Tap "Export
   Encrypted" → the export modal opens. Cancel. Tap "Import Backup"
   → import modal opens. Cancel. Tap "Delete Everything" → the
   delete-confirm modal opens. Cancel. All three modals work on
   mobile without horizontal scroll.
6. Expand Appearance. Theme buttons render; tap Dark → theme
   updates. Tap Light to restore.
7. Expand About & Security. The app version card + four privacy
   bullets + NetworkActivityCard all render.

**Steps — Title-hide inside expanded panels:**
1. Expand any section. The chevron-row header shows the section
   label (e.g., "API Configuration"). The expanded panel below does
   NOT repeat the title — only the section's subtitle ("Connect your
   Anthropic API key to start chatting") + cards. This is by design:
   `SettingsSection` calls `useIsNarrow(768)` and conditionally
   omits the `<h2>` on narrow.
2. At ≥768px, the same `SettingsSection` renders the title (the
   desktop right pane needs it). Verify by resizing the window from
   600 → 900px — the title pops back in.

**Steps — First-visit tour (if not yet completed):**
1. In DevTools → Application → IndexedDB → `parliament_db` →
   `settings`, delete the `tourCompleted_settings` entry. Reload
   `/settings`.
2. The 3-step `TourTooltip` appears, pointing in sequence at:
   - The API Configuration chevron row (`data-tour="settings-api"`)
   - The Context & Defaults chevron row (`data-tour="settings-context"`)
   - The Data & Backups chevron row (`data-tour="settings-data"`)
3. Sections do NOT auto-expand during the tour — the tooltip
   anchors to the collapsed rows. The user is expected to expand
   on their own after the tour. (Locked design decision D4.)
4. Complete the tour. `tourCompleted_settings` is now `true`;
   reload won't show the tour again.

**Steps — Reduced motion:**
1. In DevTools → Rendering, set "Emulate CSS prefers-reduced-motion"
   to "reduce". Reload `/settings`.
2. Toggling chevron rows expands/collapses instantly (no height
   animation, no chevron rotation tween). The mount animations on
   the section cards (initial `opacity: 0, y: 12 → 1, 0`) still
   play — those come from SettingsSection and were not gated this
   PR.

**Steps — Desktop ≥768px regression:**
1. Open `/settings` at ≥768px. The desktop layout renders: left
   sidebar nav + main pane on the right + the power-on shimmer
   sweep if the user just validated a key. None of the
   `mobile-settings-*` classes apply.
2. Click each nav item. `AnimatePresence mode="wait"` swap-fades
   between sections as before. All seven sections render correctly.
3. Validate a key. The shimmer sweep + Connected dot animation
   fire as in PR-11b/PR-12 baseline. Mobile-only changes did not
   regress the shimmer flow.
4. Resize from 800 → 600 → 800 px. The view re-renders into
   mobile then back into desktop without losing state (the page
   re-renders the same `SettingsView` instance; the multi-open
   `Set` resets if you fully unmount via route change, which is
   acceptable session-state behavior matching desktop's
   `activeSection` state).

**Steps — Symbol-grep bundled output:**
1. After `npm run build`:
   - `grep -ohc "mobile-settings-screen" dist/assets/index-*.js` → ≥1
   - `grep -ohc "mobile-settings-handle" dist/assets/index-*.js` → ≥1
   - `grep -ohc "mobile-settings-handle" dist/assets/index-*.css` → ≥1
   - `grep -ohc "mobile-settings-row" dist/assets/index-*.css` → ≥1
   - `grep -ohc "shimmer-sidebar-border" dist/assets/index-*.js` → ≥1
     (desktop UI is unchanged — this class still ships)
   - Note: Rollup mangles function names, so `MobileSettings` as a
     string is not a reliable signal. The className strings above are
     load-bearing on the rendered DOM and persist through minification.

**Steps — Lint + build:**
1. `npm run lint` → 164 problems (162 errors + 2 warnings). Same
   as PR-18b post-merge baseline. No new errors.
2. `npm run build` → clean.

**Expected:** Every step passes. The mobile Settings layout matches
the chevron-expandable cards pattern from "Menu for mobile settings.png"
applied to the existing Settings content. Section content semantics
(validation, modals, radios, sliders, segmented controls,
NetworkActivityCard) are identical to desktop. Desktop ≥768px is
unchanged.

### What's known-broken-but-deferred

- Shimmer + Connected pill: intentionally desktop-only this PR.
  Today validation runs through the desktop /build wizard. When
  Phase 2 multi-provider config (audit §3.20) brings key
  validation surfaces into mobile, revisit `validateKey`'s TODO
  comment and decide on the mobile shimmer/pill story then.
- Tour auto-expand: deferred. Tour anchors at the collapsed row;
  user expands the section themselves.
- Container-query layout for in-app embedded Settings (e.g., a
  Settings room embedded in a narrow rail): would need container
  queries to choose layout per available width, not per viewport.
  Not in scope; Settings only ships at the `/settings` full-page
  route today.

---

## PR-18d — web-search@1.0 catalog component

👀 User-visible

**Surface:** `/chat/:id` for any room that mounts web-search@1.0
(pre-mounted on Writing Studio, Data Workspace, Drafting Desk, and
Pocket Chat after PR-18d's seed bump). The `+` overflow menu gains a
"Web search" item; tapping it arms the Anthropic `web_search` tool
for the next outgoing message and renders a blue chip strip above
the textarea. The chip strip carries "· Uses API credits" copy
(cost transparency) and a × disarm button. After a successful send,
the chip auto-clears.

**Setup:**
- Fresh install (or: clear IndexedDB to force a re-seed of
  `libraryRooms`). The four affected templates seed at version 3 and
  include `web-search@^1.0`.
- Existing installs with templates at seedVersion 2 will re-seed on
  next page load because PR-18d bumps the versions to 3.

**Steps — Arm / disarm via `+` menu:**
1. Open a Pocket Chat room (or any of the four pre-mounted templates).
   The chat input renders normally.
2. Tap the `+` button. The menu opens. "Upload file" is at the top
   (intrinsic, PR-18e removes it). Below "Upload file", separated by
   a divider, is "Web search" with a Globe icon. (And, on rooms with
   voice-input@1.0 mounted, the mic is to the right of `+` — not in
   the overflow.)
3. Tap "Web search". The menu closes. A blue chip pill appears above
   the textarea: `🌐 Web search · Uses API credits ×`. On viewports
   ≥640px ("· Uses API credits" copy is shown); below that the copy
   is hidden to save room.
4. Tap `+` again. The menu reopens. "Web search" item still rendered
   normally (no separate armed visual on the menu item — the chip is
   the only armed signal).
5. Tap "Web search" again. The menu closes. The chip disappears.

**Steps — Disarm via chip strip:**
1. Open Pocket Chat. Tap `+` → "Web search" to arm. The chip appears.
2. Click the × on the chip. The chip disappears.
3. Reopen `+`. "Web search" item still tappable to re-arm.

**Steps — Auto-reset on send:**
1. Open Pocket Chat. Type "what's the weather in Tokyo today?" (or
   any prompt that would benefit from a search).
2. Arm Web search via the `+` menu.
3. Send the message. Chip should disappear during or immediately
   after the send.
4. Verify in DevTools → Network: the outgoing POST to
   `api.anthropic.com/v1/messages` body includes a top-level
   `tools` array with `{ "type": "web_search_20250305", "name":
   "web_search", "max_uses": 3 }`.
5. Send a second message ("can you elaborate?"). The chip is NOT
   present this time. The POST body should NOT include a `tools`
   array (the W1 per-message-toggle contract).
6. Re-arm web-search. Send. Chip disappears post-send. Round 3
   confirms the cycle works repeatedly.

**Steps — Multi-tap toggle:**
1. Open Pocket Chat. Tap `+` → "Web search" → menu closes → chip
   present.
2. Tap `+` → "Web search" → menu closes → chip gone.
3. Repeat 5 times. Each tap toggles cleanly. No stuck state.

**Steps — Cross-room isolation:**
1. Open Pocket Chat. Arm web-search. Chip present.
2. Navigate to a different room (e.g., Quiet Room).
3. The Quiet Room input has no chip — web-search is not mounted
   there. The `+` menu shows only "Upload file."
4. Return to Pocket Chat. The chip is gone (a new RoomShell instance
   was created on remount; hostAPI is fresh per room).

**Steps — Desktop ≥768px (inline layout):**
1. Open a Pocket Chat room at ≥768px (note: Pocket Chat uses the
   single-column-with-sheet layout; for desktop testing of the chip
   strip, use Writing Studio instead which renders three-panel).
2. Arm web-search via Writing Studio's `+`. The chip appears above
   the textarea (inside `p-4` wrapper, before the textarea form
   row).
3. Disarm via ×. Send a normal message. No chip; no `tools` in the
   outgoing API body.

**Steps — Quiet Room is unchanged:**
1. Open Quiet Room. Tap `+`. The menu opens with only "Upload file."
   No "Web search" entry. web-search@1.0 is not pre-mounted on
   Quiet Room by design.
2. Verify: `seedTemplates.js` shows `'quiet-room@1.0': 2` (unchanged).

**Steps — Provider neutrality:**
1. In DevTools console: `(await import('/src/providers/index.js'))
   .getProvider('anthropic').getAvailableTools()` — returns an array
   that includes `{ id: 'web_search', label: 'Web search',
   definition: { type: 'web_search_20250305', name: 'web_search',
   max_uses: 3 }, serverSide: true }`.
2. When Phase 2 ships other providers (OpenAI / Mistral), the same
   `getAvailableTools()` call against those providers returns their
   own web_search definitions; web-search@1.0 picks them up
   unchanged.

**Steps — Symbol-grep bundled output:**
1. After `npm run build`:
   - `grep -ohc "web-search" dist/assets/index-*.js` → ≥2
   - `grep -ohc "web_search_20250305" dist/assets/index-*.js` → ≥1
   - `grep -ohc "_armTool" dist/assets/index-*.js` → ≥2
   - `grep -ohc "getArmedTools" dist/assets/index-*.js` → ≥1
   - `grep -ohc "tool-armed-changed" dist/assets/index-*.js` → ≥2
   - `grep -ohc "message-sent" dist/assets/index-*.js` → ≥2
   - `grep -ohc "max_uses" dist/assets/index-*.js` → ≥1

**Steps — Lint + build:**
1. `npm run lint` → 164 problems (162 errors + 2 warnings). Same as
   PR-18c post-merge baseline. No new errors.
2. `npm run build` → clean.

**Expected:** Every step passes. The web-search inputAction is
visible in the `+` menu on the four pre-mounted templates. The chip
strip appears on arm and disappears on send or × click. The
outgoing API body includes the `tools` array only when armed.
Cross-room state is isolated. Quiet Room is unchanged. Provider
neutrality holds — web-search@1.0 doesn't import the Anthropic
provider directly; it discovers the tool via the provider abstraction.

### What's known-broken-but-deferred

- Rich result rendering — citations as clickable footnotes, "Search
  results" expandable above the assistant response. The text response
  streams as normal (Claude's synthesized answer with inline citation
  brackets), but the `server_tool_use` and `web_search_tool_result`
  content blocks are silently ignored by the provider stream parser.
  Separate PR for content-block handling in provider + MessageCard.
- Per-room configurable `max_uses`. Locked at 3 this PR.
- `+` menu item visual armed state. The chip strip is the only
  armed signal; the menu item itself has no "this is on right now"
  treatment.
- OpenAI / Mistral provider implementations of web_search. The
  catalog-component side is ready; the provider-side adapters are
  firmly Phase 2.

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
- **Mobile / touch.** As of PR-10b every chat path renders through `<RoomShell>`. Mobile-specific surfaces still need spot-checking on real devices, particularly the Pocket Chat sheet + voice input.
- **Performance benchmarks.** No regression budget yet — eyeball it.
- **Accessibility audits.** Beyond what's called out per PR — full a11y review is a Phase 2 task.
