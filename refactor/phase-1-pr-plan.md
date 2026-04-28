# Parliament V2 — Phase 1 PR Plan

**Status:** Single source of truth for the Phase 1 refactor.
**Audience:** Engineers implementing Phase 1 and reviewers approving each PR.
**Companion docs:** [v2-phase1-audit.md](v2-phase1-audit.md), [tier-classification.md](tier-classification.md), [glossary.md](glossary.md), [data-migration.md](data-migration.md).

15 PRs in three waves, plus a docs-only **PR-0**. Each PR has a clear scope, a list of dependencies on prior PRs, exit criteria, and a risk note.

---

## Working agreements

- **Touch one phase at a time.** Phase 2 work (pipelines, Agent tier, consent flow, model-picker) does not land in Phase 1 PRs.
- **Catalog entries are source of truth** for component behavior. Not code comments, not mockups, not inferred intent.
- **New capabilities get catalog entries before code.** Piece-by-piece walkthrough pattern.
- **When specs and mockups disagree, ask.** Don't silently pick.
- **Pause-point PRs are not skippable.** PR-3, PR-7, PR-9, and PR-10a each end with a review checkpoint before the next wave begins.

---

## Wave 0 — Documentation foundation

### PR-0 — Docs-only foundation

**Goal:** Five canonical Phase 1 docs in place before any code lands.

**Scope:**
- `refactor/v2-phase1-audit.md` (this audit, final form)
- `refactor/tier-classification.md` (user-action vs autonomous rule)
- `refactor/phase-1-pr-plan.md` (this doc)
- `refactor/glossary.md` (V1↔V2 vocabulary)
- `refactor/data-migration.md` (IndexedDB v3→v4 schema diff + migration map)

**Exit criteria:**
- All five docs committed to `main`.
- No code changes.

**Risk:** None. Docs only.

---

## Wave A — Foundation (no user-visible change)

### PR-1 — Mode file format + IndexedDB v4

**Goal:** Schema in place for the V2 catalog and mode files. Existing app behavior unchanged.

**Scope:**
- Bump `DB_VERSION` to 4.
- Add 6 new stores: `modes, libraryLayouts, libraryRooms, libraryComponents, librarySchemes, libraryResources`.
- Add `room: null` field to existing `conversations` records during migration.
- Add `status: 'available' | 'beta' | 'coming-soon'` field to `libraryLayouts`, `libraryRooms`, `libraryResources`.
- New `lib/modes.js`: `loadMode(id), saveMode(mode), listModes(), createModeFromTemplate(template)`. Save flow per `parliament_mode_file_format.md` §9.
- New `lib/catalog.js`: registry skeleton with `getComponent`, `listComponents`, `getLayout`, `getScheme`, `getRoom`, `getResource`.
- Migration seeds `libraryLayouts` with 5 available + 2 coming-soon entries (placeholders only; layout details land in PR-3).
- Schema validators for all 6 new stores added to `lib/validate.js`.
- `lib/validate.js` also gains a validator for `sbrd_documents` (existing pre-V2 gap).
- Define a shared `UNIVERSAL_SLOTS` constant that layout entries reference.

**Dependencies:** PR-0.

**Exit criteria:**
- `npm run build` clean.
- IndexedDB upgrades from v3 to v4 on app load.
- Existing user data round-trips: load existing conversations/messages/etc., re-render, no behavior change.
- New stores exist but are empty/seeded only.

**Risk:** Low. Additive schema. No code consumes the new stores yet.

---

### PR-2 — Catalog scaffolding + first 3 entries + tier rule

**Goal:** Component catalog data structure alive. Three primitives wrapped without moving source code.

**Scope:**
- New `src/catalog/` directory.
- Define the catalog manifest format with these fields:
  - Identity: `name, version, displayName, author, description`
  - `tier` (Reader/Composer/Integrator/Agent/Utility)
  - `slotTargets: [{ slot, primary?, fallbackOk? }]`
  - `capabilityRequirements`
  - `configSchema` (with stable camelCase keys per `parliament_mode_file_format.md` §3.1)
  - `softDependencies?: [{ component, fallbackUI }]` (for empty-state contracts)
  - `contributions?: { messageActions?: [...] }` (per NQ-5.8 — components contribute per-message menu items)
  - `render` and optional `previewRender`
- Wire three catalog entries that wrap existing primitives without moving them: `messages@1.0` ([core/MessageList](src/components/core/MessageList.jsx) + [core/MessageCard](src/components/core/MessageCard.jsx)), `input@1.0` ([core/InputArea](src/components/core/InputArea.jsx)), `toc@1.0` ([core/TOC](src/components/core/TOC.jsx)).
- Add a developer-only `/catalog` debug route gated behind `import.meta.env.DEV`.
- Top-of-file comment in `src/catalog/index.js` references [tier-classification.md](tier-classification.md) with the user-action-vs-autonomous rule.

**Dependencies:** PR-1.

**Exit criteria:**
- `/catalog` route lists the three entries in dev.
- Each entry passes manifest validation.
- No production routes use the catalog yet.

**Risk:** Low. Dev-only surface; existing routes untouched.

---

### PR-3 — Mode reducer + `<RoomShell>` + hostAPI event bus

**Goal:** Architectural bedrock for V2 — the mode→layout→slot→component pipeline plus the small inter-component bus.

**Scope:**
- New `useMode(roomId)` hook (replaces ModeContext for V2 routes; ModeContext stays in App.jsx for V1 fallback).
- New `<RoomShell mode={mode}>` that resolves layout, slots, components and renders.
- hostAPI event bus (publish/subscribe) with three Phase 1 events:
  - `voice-transcript`
  - `row-hover`
  - `file-context-changed`
- Bus exposed to components via the catalog runtime as `hostAPI.publish(event, payload)` and `hostAPI.subscribe(event, handler)`.
- Hand-built mode file used at `/catalog` debug route to render a working room with the three PR-2 components.

**Dependencies:** PR-1, PR-2.

**Exit criteria:**
- `<RoomShell>` renders a working chat in dev with a hand-built mode file.
- Bus publish/subscribe works between two components in the same room.
- Production routes (`/`, `/chat/:id`, `/settings`) still use V1 adapters.

**Pause point:** ⚠️ **Architecture review.** Is the catalog/mode/render pipeline shaped correctly? This is the structural foundation; later PRs assume it's right.

**Risk:** Medium. Bus surface is small but new. RoomShell must handle missing components gracefully (empty slots, missing softDependencies).

---

## Wave B — Visual system + new homepage

### PR-4a — Gold palette + copy conventions + Parliament Default a11y variants

**Goal:** Visual system migration for the existing scheme. Parliament Default is fully a11y-compliant before any new homepage code lands.

**Scope:**
- Audit and fix any surface still using cold blue accent or V1 green outside Fresh Teal scheme (Fresh Teal doesn't exist yet — the V1 green can stay in modeSuggestions.js until PR-12 deletes it).
- Apply copy conventions: sentence case, no em-dashes, "rooms" wording where user-facing.
- Add high-contrast light + high-contrast dark variants for `parliament@1.0` scheme. Wire `prefers-contrast: more` per architecture §6g.
- Verify `prefers-reduced-motion` respected by all motion tokens.

**Dependencies:** PR-1.

**Exit criteria:**
- All four `parliament@1.0` variants pass WCAG AA contrast checks.
- `prefers-contrast: more` triggers high-contrast variant.
- No surface uses cold blue (`#4A7AE5`) outside the Fresh Teal placeholder.

**Risk:** Low. Token swaps + copy edits; behavior unchanged.

---

### PR-4b — 5 additional schemes + new token groups

**Goal:** Full V2 scheme library ready for shipping.

**Scope:**
- Five new schemes with all four a11y variants each: `cool-bright, deep-calm, soft-violet, fresh-teal, amber-glow`.
- New blueprint token group: `--bp-floor, --bp-wall, --bp-hatch, --bp-line, --bp-label, --bp-soft, --bp-grid` (values per scheme).
- New data-series token group: `--token-data-series-1` through `--token-data-series-5` (values per scheme).
- Seed all 6 schemes into `librarySchemes` with embedded snapshots.

**Dependencies:** PR-4a.

**Exit criteria:**
- All 6 schemes selectable via the editor (post-PR-8) — for now via dev tooling.
- All schemes pass a11y checks for all four variants.
- Blueprint and data-series tokens have meaningful values per scheme.

**Risk:** Medium. Substantial design lift (5 schemes × 4 variants × 2 new token groups). Implementation is mostly token files; design review is the bottleneck.

---

### PR-5 — Remaining shell-side catalog primitives

**Goal:** All shell-side V1 functionality describable as mode files.

**Scope:**
- Catalog entries (manifest + thin render shim around existing core/components):
  - `highlights@1.0` — contributes "Highlight selection" message action.
  - `notes@1.0` — contributes "Add note here" message action.
  - `branches@1.0` — contributes "Branch from here" message action; owns the BranchCreationPanel modal.
  - `context@1.0` — `contextThreshold` and `autoCompress` move from app settings to component config (precedence per audit §3.6).
  - `collab-mode@1.0` — Parrot Personas storage moves with the component.
  - `review@1.0` — Composer tier per [tier-classification.md](tier-classification.md).
  - `voice-input@1.0` — new component, publishes `voice-transcript` events. Browser handles mic permission.
- Update `input@1.0` to subscribe to `voice-transcript` events and append to its value (controlled by `subscribeToVoice` config field, default `true`).
- The InputArea built-in mic button stays in V1 cardLayout for now — removed at PR-10b.

**Dependencies:** PR-3, PR-4a.

**Exit criteria:**
- All eight components register in catalog and pass validation.
- Manual test: hand-built mode file with all components renders correctly at `/catalog` debug route.
- `voice-input@1.0` published transcripts appear in `input@1.0` field.

**Risk:** Medium. Components reference the bus and message-action contributions — patterns from PR-3.

---

### PR-6 — Homepage components + new homepage at `/`

**Goal:** New blueprint-led homepage live at `/`. V1 chat selector accessible at `/chats`.

**Scope:**
- Catalog entries: `blueprint@1.0, chats@1.0, library@1.0, favorites@1.0, quick-stats@1.0, recent-activity@1.0, scratchpad@1.0`.
- `chats@1.0` is the V6 selector refactored into a homepage component, preserving every V1 behavior as default config.
- `library@1.0` shows **5 visible categories**: Rooms, Layouts, Components, Schemes, Resources. Sections is **hidden** in Phase 1 per NQ-8.
- Resources tab visible with **6 placeholder coming-soon cards** drawn from `parliament_v2_resources_spec.md` §4. Click → read-only preview overlay.
- `blueprint@1.0` subscribes to `row-hover` events; `chats@1.0` publishes them. Hovering a chat row glows the corresponding room on the blueprint.
- Replace `SelectorView` at `/` with `<RoomShell>` rendered against the seeded homepage mode (with `scope: 'homepage'`).
- Preserve V1 selector at `/chats` for users who prefer the table view.
- Top bar: Parliament mark, breadcrumb slot, Edit homepage button (dead until PR-8 — disabled with "Editor coming soon" tooltip), + Build a room (gold primary, dead until PR-9), settings gear, Backup & Restore button (dead until PR-7).

**Dependencies:** PR-4a, PR-5.

**Exit criteria:**
- `/` renders the new homepage with 4 default sections (Blueprint, Chats, Library, Favorites).
- Hovering a chat row highlights its room on the blueprint.
- Library shows 5 categories with Resources placeholder cards visible.
- V1 chat selector available at `/chats`.
- All V1 selector functionality (search, sort, bulk actions, view toggles) works as defaults.

**Risk:** Medium-high. Largest user-visible change so far. Cross-section interactions exercise the bus from PR-3.

---

### PR-7 — Backup & restore in V2 format

**Goal:** Users have a working safety net for the V2 cutover.

**Scope:**
- New file format: `.parliament` extension (per `parliament_backup_restore_implementation.md` §3).
- Encryption: PBKDF2 with SHA-256 at **210,000 iterations** (V1 used 100k), AES-256-GCM. Reuse helpers from [crypto.js](src/lib/crypto.js); raise iteration count to 210k.
- Backup payload nested as `contents.{chats, annotations, rooms, homepage, library, preferences}` per spec §3.2.
- Include all V2 stores **AND** fix the V1 gap by including `files` and `file_data`.
- Validators for every store including `sbrd_documents` and the new V2 ones.
- Import handles legacy V1 `.apb` files via migration path.
- Threshold-based proactive banner per spec §5.1: ≥5 chats OR ≥2 rooms OR ≥7 days old; 30-day dismissal cadence.
- Top-bar status indicator with color thresholds (gold <14d, amber 14-44d, red 45+d).
- `Cmd+Shift+B` keyboard shortcut.
- Modal with Backup and Restore tabs unifying both flows.
- Wire the homepage's Backup & Restore button (placeholder from PR-6) to open the modal.

**Dependencies:** PR-1, PR-6.

**Exit criteria:**
- Full backup → file downloads with expected filename.
- Custom backup with categories unchecked → file only contains those categories.
- Password-protected backup → unreadable without password.
- Restore unencrypted backup into fresh Parliament (merge) → all items present.
- Restore encrypted backup with correct password → works.
- Wrong password → clear error.
- V1 `.apb` import → upgrades on read.
- Threshold banner appears/hides correctly across the lifecycle.
- All testing-checklist items in `parliament_backup_restore_implementation.md` §10 pass.

**Pause point:** ⚠️ **Data review.** Does backup/restore round-trip work for real users with real data? Confirm before Wave C lands.

**Risk:** Medium. Encryption + migration is high-stakes. Existing user data must survive the round-trip cleanly.

---

## Wave C — Builder paths and chat-shell migration

### PR-8 — Three-rail editor

**Goal:** Open-composer path live for both rooms and homepage.

**Scope:**
- Three-rail editor per [parliament_editor_v2.html](refactor/parliament_editor_v2 (1).html).
- Left rail: Layouts/Components/Schemes tabs from catalog.
- Center: live canvas with slot rendering.
- Right rail: properties panel rendered from each component's `configSchema`.
- Drag-and-drop via `dnd-kit` (per architecture's drag-and-drop section).
- Migration dialog when a layout changes; holding tray for orphaned components per design-decisions §4.
- Editor writes to a draft mode file in memory; persists to `modes` on Save.
- Routes: `/edit/:roomId` for room editing, `/edit-home` for homepage editing.
- Wire the homepage "Edit homepage" button (placeholder from PR-6) to `/edit-home`.

**Dependencies:** PR-3, PR-5, PR-6.

**Exit criteria:**
- A user can build any room from scratch using the editor.
- Homepage editing works at `/edit-home` with the same editor + `scope: 'homepage'` mode.
- Migration dialog appears when changing layouts; holding tray catches orphans.
- Round-trip: build a mode in editor, save, reload page, mode reloads identically.

**Risk:** High. Largest single feature in Phase 1. dnd-kit integration is mature but the visual feedback layer is custom.

---

### PR-9 — Wizard + template gallery + ignition

**Goal:** All three builder paths converging on the same mode file format.

**Scope:**
- Seven-step wizard per [parliament_wizard_v5.html](refactor/parliament_wizard_v5.html) and `build-ui-decisions.md` (entry → purpose → device → density + layout reveal → features → name + scheme → ignition).
- Five-card template gallery per [parliament_template_gallery_v2.html](refactor/parliament_template_gallery_v2 (1).html).
- **5 available templates** (Writing Studio, Data Workspace, Drafting Desk, Pocket Chat, Quiet Room) + **2 coming-soon templates** (Kingfisher (deep reading), Starling (collaboration)) per NQ-3.
- All available templates default to `parliament@1.0` scheme per NQ-9.
- Coming-soon templates point at the coming-soon layouts (`reading-pane@1.0`, `split-view@1.0`) seeded in `libraryLayouts`.
- Ignition step uses [useShimmer](src/hooks/useShimmer.js) gold sweep on API key validation.
- "Open in editor" escape hatch wired from wizard step 3+ onward.
- Wire the homepage "+ Build a room" button (placeholder from PR-6) to the entry screen.

**Dependencies:** PR-6, PR-8.

**Exit criteria:**
- A user can complete each builder path and produce a valid mode file.
- All three paths produce structurally identical mode files for the same choices.
- Coming-soon templates render with read-only preview, no install path.
- Round-trip: mode built via wizard opens cleanly in editor and back.

**Pause point:** ⚠️ **UX review.** Are all three builder paths feeling right? Especially the wizard's pacing.

**Risk:** Medium. Wizard logic is meaningful but well-specified. Risk concentrates in the layout-reveal step (step 4) which auto-selects based on density + purpose.

---

### PR-10a — Wire `/chat/:id` through `<RoomShell>` + `createdInMode → room` migration

**Goal:** Chat view is V2. Albatross still exists as fallback for safety.

**Scope:**
- `/chat/:id` no longer routes through `ChatView` adapter selection. Loads conversation, reads `conversation.room`, loads the mode, renders `<RoomShell>`.
- One-time migration step at first load post-deploy:
  - Every existing conversation gets `conversation.room` set per the migration map in [data-migration.md](data-migration.md).
  - The legacy `localStorage[parliament-mode]` value is consulted only for users with `createdInMode = null` (no V1 hint), then dropped.
  - `createdInMode` field stays in records (not stripped) for at least one release.
- **Albatross adapter still exists** as fallback for any conversation whose migration didn't assign a room cleanly. This is the recoverable state — if rollback is needed, it's still possible.
- `/chats` route preserved (V1 selector fallback).

**Dependencies:** PR-9.

**Exit criteria:**
- Every existing conversation opens via `<RoomShell>` against its assigned room.
- Migration map produces a sensible default for every legacy `createdInMode` value.
- Existing user data survives: load existing IndexedDB, render in V2 UI, edit, reload, data intact.
- All V1 critical flows still work: send message, create branch, add highlight, export chat.

**Pause point:** ⚠️ **Migration validation.** Did existing users' conversations come through cleanly? **PR-10b proceeds only after this checkpoint passes.**

**Risk:** High. One-time migration affects all existing users. Reversibility hinges on Albatross adapter still being present.

---

### PR-10b — Delete adapter directories + cleanup InputArea + rotate PWA cache

**Goal:** Point of no return. V2 is the only path.

**Scope:**
- Delete `src/adapters/albatross/`, `src/adapters/kingfisher/`, `src/adapters/starling/`.
- Delete `src/adapters/withComingSoon.jsx`.
- Remove InputArea's built-in mic button (the cardLayout-only feature).
- Rotate PWA cache name from `parliament-adapters-v1` to `parliament-modules-v2` in [vite.config.js](vite.config.js). Update `runtimeCaching` rule to match new chunk patterns.
- One-time cleanup that wipes the old `parliament-adapters-v1` cache on first V2 boot (handled in service worker activation).
- Inject `voice-input@1.0` into any conversation's room mode file where `createdInMode === 'swift'` (per [data-migration.md](data-migration.md)) — this preserves mic access for existing mobile users.
- Update `vite.config.js` `manualChunks` to remove deleted adapter entries.
- Delete `src/views/ChatView.jsx`, `src/views/SelectorView.jsx`, `src/views/SettingsView.jsx` adapter-routing logic (the routes themselves remain, but they no longer pick adapters).

**Dependencies:** PR-10a, **PR-10a checkpoint passed**.

**Exit criteria:**
- `npm run build` clean.
- No references to deleted adapter directories anywhere in `src/`.
- Existing mobile users (post-PR-10a migration to pocket-chat) have working voice via the injected component.
- PWA cache cleanly rotates: old cache wiped on first boot, new cache populates correctly.
- No 404s for old adapter chunk URLs.

**Risk:** High. Point-of-no-return. If problems surface, rollback requires reverting both PR-10a and PR-10b together.

---

### PR-11a — Decompose Pelican into 6 catalog components

**Goal:** Pelican functionality fully expressed as catalog components.

**Scope:**
- Six catalog entries:
  - `file-shelf@1.0` — owns `files` and `file_data` IndexedDB stores. Publishes `file-context-changed`.
  - `chart-canvas@1.0` — Reader; chart-type config (bar/line/area/scatter/pie); subscribes to `file-context-changed`.
  - `table-canvas@1.0` — Reader; sort/density/columns config.
  - `summary-dashboard@1.0` — Reader; KPI/column-stat config.
  - `column-inspector@1.0` — Reader; column schema view.
  - (Reuses existing `messages@1.0` + `input@1.0` for inspector chat.)
- Each canvas component renders the shared empty-state template ("Add a File shelf component to provide data") when `file-shelf@1.0` isn't present in the room (per audit risk 3.17).
- Update Data Workspace template (PR-9) to use the decomposition: file-shelf in `left-rail`, chart-canvas + table-canvas + column-inspector in `canvas` (stack capacity).
- Migrate any conversation with `createdInMode === 'pelican'` to the updated Data Workspace template.
- Move PelicanContext's file-staging slice into `file-shelf@1.0`'s scoped state.
- Move `lib/fileParser.js` to be a `file-shelf@1.0` internal helper (or keep at lib/ if used elsewhere — verify).
- Delete `src/adapters/pelican/`.
- Delete [PelicanContext](src/stores/PelicanContext.jsx).

**Dependencies:** PR-10b.

**Exit criteria:**
- Pelican-equivalent functionality available via the Data Workspace template.
- A user can compose a custom data-analysis room with any subset of canvas components.
- A canvas component without file-shelf shows the empty state.
- Existing Pelican users' files/data preserved.

**Risk:** High. Largest decomposition. Multiple components share state via the bus.

---

### PR-11b — Decompose Secretarybird into 3 catalog components

**Goal:** Secretarybird functionality fully expressed as catalog components.

**Scope:**
- Three catalog entries:
  - `document-canvas@1.0` — Composer; owns `sbrd_documents` IndexedDB store. Reads/writes paragraphs, suggestionStates, submittedReplies.
  - `claude-comments@1.0` — Composer; comment sidebar + lifecycle. Generates Claude replies on user click.
  - `ripple-analysis@1.0` — Composer; cross-paragraph analysis runs on user-initiated Submit.
- Update Drafting Desk template (PR-9) to use the decomposition: document-canvas in `document` slot, claude-comments + ripple-analysis in `margin` slots.
- Migrate any conversation with `createdInMode === 'secretarybird'` to the updated Drafting Desk template.
- Delete `src/adapters/secretarybird/`.

**Dependencies:** PR-10b. (Independent of PR-11a; can run in parallel.)

**Exit criteria:**
- Secretarybird-equivalent functionality available via Drafting Desk template.
- Existing Secretarybird users' documents preserved (`sbrd_documents` reads correctly under the new component).
- Tracked changes, ripple analysis, comments all work.

**Risk:** High. Secretarybird is the largest single V1 file (2928 lines). Decomposition cleanliness is hard to verify without thorough manual testing.

---

### PR-12 — Cleanup

**Goal:** Phase 1 closeout.

**Scope:**
- Delete `src/lib/modeSuggestions.js` and `src/components/core/ModeSuggestion.jsx`.
- Consolidate `src/lib/tokens.js` cost data into `src/providers/anthropic.js` with shape-flexibility for non-Anthropic providers (`cost: null` or `cost: { type: 'free-local' }` placeholders supported).
- Delete `src/stores/ModeContext.jsx` (still mounted from PR-3 backwards-compat).
- Strip the legacy `parliament-mode` localStorage key on app load.
- Archive `mockups/*.jsx` to `refactor/v1-mockups-archive/` (don't delete; preserve for fidelity reference).
- Delete V1-era stale docs: `CLAUDE.md`, `ROADMAP.md`, `DECISIONS-LOG.md`, `SESSION-LOG-2026-03-02.md`, `session-summary-2026-03-07`, `session-summary-2026-03-12`, `implementation-guide.md`. Replace `CLAUDE.md` with a redirect to `refactor/parliament-v2-brief.md`.
- Update `README.md` to V2 vocabulary.
- Run the Phase 1 exit-criteria checklist from `parliament-v2-refactor-scope.md` §1.8 and confirm.

**Dependencies:** PR-11a, PR-11b.

**Exit criteria:**
- Phase 1 exit criteria from refactor-scope §1.8 satisfied:
  - A new user can build a room via any of the three paths and it works.
  - An existing V1 user's data survives the migration.
  - All V1 features available somewhere (shell or catalog component).
  - Homepage, template gallery, editor, wizard render per their mockups.
  - Export and restore round-trip correctly.
  - No V1 code paths remain for the bird-mode adapter pattern.
- All linters/typecheckers clean.

**Risk:** Low. Mostly housekeeping; the structural work happened in earlier PRs.

---

## Wave summary

| Wave | PRs | Description |
|---|---|---|
| 0 | PR-0 | Documentation foundation (5 docs, no code) |
| A | PR-1, PR-2, PR-3 | Foundation (no user-visible change) |
| B | PR-4a, PR-4b, PR-5, PR-6, PR-7 | Visual system + new homepage + V2 backup |
| C | PR-8, PR-9, PR-10a, PR-10b, PR-11a, PR-11b, PR-12 | Builder paths + chat-shell migration + cleanup |

**Total: 16 PRs** including PR-0.

## Pause points

- After **PR-3**: architecture review.
- After **PR-7**: data review.
- After **PR-9**: UX review.
- After **PR-10a**: migration validation (PR-10b proceeds only after this passes).

## Out of Phase 1 (do not land in any of these PRs)

- Pipelines (architecture §5).
- Agent-tier components (Summarizer, etc.).
- Consent flow UI.
- Model-picker field type.
- Catalog publishing infrastructure (npx scaffold, validator, PR template).
- Community submissions.
- Cross-mode data sharing (Persister tier, sharedStores).
- Resources content production (the 19 launch resources).
- Onboarding tour rewrites (beyond minimum selector reattachment).
- Multi-provider work (Ollama, Mistral, OpenAI).
