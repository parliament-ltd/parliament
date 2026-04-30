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
