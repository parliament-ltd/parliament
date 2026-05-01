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
- New `lib/modes.js`: `loadMode(id), saveMode(mode), listModes(), createModeFromTemplate(template)`. Save flow stamps `schema`, `parliamentVersion`, and `meta.modified`; preserves `id`, `meta.created`, `meta.author`, `buildIntent` when present (the `parliament_mode_file_format.md` spec is not yet committed; this contract is implemented and documented in `lib/modes.js` directly).
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
  - `configSchema` (stable camelCase keys; field shape `{ type, default?, label?, options? }` enforced by [src/catalog/validate.js](src/catalog/validate.js))
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

**Deferred (tracked in follow-up PRs):**
- **Undo / redo** — the reducer is shaped for it; implementation lands in PR-8b.
- **Runtime entries for `canvas-centric@1.0`, `document-centric@1.0`, `single-column-with-sheet@1.0`** — editor previews their slot inventory but the canvas falls back to a labeled grid until those layouts ship in PR-9 (which needs them anyway for templates that default to those layouts).
- **Preview button** in the editor top bar — placeholder until PR-9's ignition step ships.
- **Continuous validation sidebar** (architecture §"Drag-and-Drop Composition") — non-blocking warnings surface in an inspector panel. Phase 2 work; not required to ship Phase 1.

**Risk:** High. Largest single feature in Phase 1. dnd-kit integration is mature but the visual feedback layer is custom.

---

### PR-8b — Editor undo / redo

**Goal:** Rich undo across editor mutations (architecture calls this non-negotiable).

**Scope:**
- History stack wrapping `editorReducer` — preserves the last 20+ states across PLACE_COMPONENT, MOVE_COMPONENT, REMOVE_COMPONENT, SWAP_LAYOUT, APPLY_SCHEME, UPDATE_COMPONENT_CONFIG, RESTORE_FROM_TRAY, DISMISS_FROM_TRAY.
- `Cmd+Z` / `Ctrl+Z` undo, `Cmd+Shift+Z` / `Ctrl+Shift+Z` (or `Cmd+Y`) redo, both gated against typing in inputs.
- Visual undo / redo affordance in the editor top bar (small back / forward arrows next to Save).
- Selection state restoration on undo (selecting the component you just removed feels right; selecting the room after a SWAP_LAYOUT is fine).
- Save MARK_SAVED resets the dirty flag but does not clear history — users can still undo past a save.

**Dependencies:** PR-8.

**Exit criteria:**
- Twenty operations of any mix can be undone in order; redo replays them.
- Refresh discards history (it's session-scoped) — no need to persist.
- Keyboard shortcuts skip when focus is in a text input or contenteditable.

**Risk:** Low–medium. The reducer is already pure; wrapping it is a small mechanical lift. Risk is in the keyboard-shortcut hygiene around text inputs.

---

### PR-9 — Wizard + template gallery + ignition

**Goal:** All three builder paths converging on the same mode file format.

**Scope:**
- Seven-step wizard per [parliament_wizard_v5.html](refactor/parliament_wizard_v5.html) and `build-ui-decisions.md` (entry → purpose → device → density + layout reveal → features → name + scheme → ignition).
- Five-card template gallery per [parliament_template_gallery_v2.html](refactor/parliament_template_gallery_v2 (1).html).
- **5 available templates** (Writing Studio, Data Workspace, Drafting Desk, Pocket Chat, Quiet Room) + **2 coming-soon templates** (Kingfisher (deep reading), Starling (collaboration)) per NQ-3.
- All available templates default to `parliament@1.0` scheme per NQ-9.
- Coming-soon templates point at the coming-soon layouts (`reading-pane@1.0`, `split-view@1.0`) seeded in `libraryLayouts`.
- Runtime entries (slot inventory + React render fn) for `canvas-centric@1.0`, `document-centric@1.0`, `single-column-with-sheet@1.0` — required by the templates that default to those layouts. Editor canvas (from PR-8) auto-upgrades from its labeled-grid fallback to the live geometry when these register.
- Ignition step uses [useShimmer](src/hooks/useShimmer.js) gold sweep on API key validation.
- Wire the editor top bar's **Preview** button (placeholder from PR-8) to a read-only render of the current draft mode (uses `<RoomShell>` against the in-memory draft, opens in a side sheet or new route).
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

### PR-10a.5 — Wire chat-essential catalog components to ChatContext

**Goal:** Make `<RoomShell>` actually render a working chat — messages list, send/stop, ghost-text continue — for conversations whose migration assigned a room. Closes the gap that PR-2 / PR-5 left when they shipped catalog entries as "thin render shims around existing core/components" without saying how the shims access live conversation state.

**Scope:**
- Rewrite `messages@1.0` render function to self-bind to `useChat()` / `useConversations()` (per §2.8a "Component data plumbing"). Real messages render with MessageCard. Ghost text + Continue button surface for `incomplete: true` messages. Streaming content appears live inside the assistant placeholder.
- Rewrite `input@1.0` render function to self-bind to `useChat()` + `useSettings()` + the provider abstraction. Send dispatches `useChat().sendMessage()`. Stop dispatches `stopGenerating()`. Voice-transcript bus subscription preserved from PR-5. The built-in cardLayout mic stays for V1 fallback (PR-10b removes it).
- Update `ChatView.jsx` to activate the conversation in ChatContext when the route mounts: `loadMessages(id)`, set API key, expose system-prompt scaffolding (collab presets land in a later slice). The activation runs whether the route renders RoomShell or falls through to Albatross — Albatross continues calling `loadMessages` itself, so the redundant call is harmless.
- Documentation: §2.8a in [v2-phase1-audit.md](v2-phase1-audit.md) captures the self-bind-via-hooks rule, this PR section captures the slice that lands first.
- **Out of scope (next slices, before PR-10b):** branches, highlights, notes, context meter, collab-mode, review, voice-input, favorites, toc — all stay preview-shaped in this PR. Conversations whose migration left `room: null` continue to render via the V1 Albatross adapter; nothing in PR-10a.5 changes that path.

**Dependencies:** PR-10a.

**Exit criteria:**
- Open a migrated conversation at `/chat/:id` → message history renders correctly via RoomShell. Sending a message persists, streams the assistant reply, and reaches `incomplete: false` on completion.
- An interrupted `incomplete: true` message renders as ghost text with a Continue button that dispatches `continueMessage`.
- Stop button aborts an in-flight stream cleanly.
- Conversations with `room: null` continue to render via the Albatross adapter unchanged.
- `npm run build` clean. No regressions in homepage / editor / wizard surfaces.

**Risk:** Medium. The render-function rewrite is mechanical, but the conversation-activation lifecycle in ChatView has subtle ordering with ChatContext — wrong order leaves messages empty on first render or double-loads them. Mitigated by mirroring Albatross's existing init pattern.

---

### PR-10a.6 — Wire annotations + context meter to ChatContext

**Goal:** Second slice of catalog data plumbing (after PR-10a.5). Brings the per-message Star / StickyNote / text-highlight workflows online in the V2 RoomShell chat path, plus a live context meter.

**Scope:**
- New `src/stores/AnnotationsContext.jsx` — provides `{favorites, notes, highlights, showNotes, toggleFavorite, toggleNotePanel, saveNote, deleteNote, addHighlight, addHighlightFromSidebar, deleteHighlights, navigateHighlight}`. Watches `useChat().activeConversationId`; (re)loads annotations on conversation change. Exposes a `loaded` flag plus stable empty-collection references during the unloaded state so consumer memos stay stable across conversation switches.
- Mounted in App.jsx between `ChatProvider` and `BrowserRouter` so every route — including the V1 Albatross adapter on the room: null fallback path — has access. Albatross continues to manage its own annotation state directly off IndexedDB; the new context coexists without interference.
- New `context-render.jsx` — reads `useChat().tokenUsage` + `useSettings().defaultModel` + provider model info → `<ContextMeter>`.
- New `highlights-render.jsx` — aggregates raw highlight records into the (term, color, count, ids) shape `<HighlightList>` expects, dispatches add/remove/navigate via the annotations context.
- New `notes-render.jsx` — side-rail summary list of all conversation notes; clicking a note expands the inline panel on its source message and scrolls to it.
- `messages-render.jsx` updated — pulls favorites/notes/highlights from the annotations context, passes the relevant per-message slice to `MessageCard`, wires `onFavorite` / `onNote` / `onNoteSave` / `onHighlight` to dispatch through context mutators.
- Catalog manifests for `context@1.0`, `highlights@1.0`, `notes@1.0` updated to point `render` at the new live components. `previewRender` stays unchanged for the dev `/catalog` route.
- Documentation: §2.8a in [v2-phase1-audit.md](v2-phase1-audit.md) per-component table updated to mark the four newly-wired components.
- **Out of scope (next slice, before PR-10b):** branches@1.0 + BranchCreationPanel, voice-input@1.0, collab-mode@1.0 system-prompt wiring, review@1.0 modal, toc@1.0, hide/delete with undo. The branch icon on each message is still a no-op; the Albatross fallback path handles branches end-to-end for users who want the V1 surface.

**Dependencies:** PR-10a.5.

**Exit criteria:**
- Star a message → favorite persists; reload → star still set. Star icon reflects state across the message and the homepage favorites surface.
- Click StickyNote → inline note panel opens, type → blur → text persists; reload → note re-appears with the same text. Side-rail Notes pane lists all notes; clicking one scrolls to its message and reopens the panel.
- Select text in a message → popover with color picker → click a color → highlight persists, the term renders inline as `<mark>` on every matching message, the side-rail Highlights pane lists the term with occurrence count and prev/next navigation.
- Context meter shows live token usage, message count, and threshold-tinted progress bar. The right-rail Context Health pane updates as messages stream in.
- Albatross fallback (room: null conversations) unchanged; no double-write to IndexedDB stores.
- `npm run build` clean.

**Risk:** Medium. AnnotationsContext is the first shared cross-component state we've added in V2; if its load timing is wrong, messages@1.0 and the side-rail components see different states briefly. Mitigated by the `loaded` gate plus the stable empty-collection references that prevent consumer-memo invalidation.

---

### PR-10a.7 — Wire branches@1.0 + BranchCreationPanel to ChatContext

**Goal:** Third slice of catalog data plumbing (after PR-10a.5 and PR-10a.6). Brings the side-rail branch list, the per-message Branch icon, and the BranchCreationPanel modal online in the V2 RoomShell chat path. Closes the last major chat-surface gap before PR-10b can delete adapter directories — what remains after this slice is `voice-input@1.0`, `collab-mode@1.0` system-prompt wiring, `review@1.0` modal, `toc@1.0`, and the message-transfer / hide / delete actions.

**Scope:**
- New `src/stores/BranchPanelContext.jsx` — small shared dispatch context. Owns `openForMessageId` (null when closed) plus `openBranchPanel(messageId)` / `closeBranchPanel()` mutators. Mounted in App.jsx between `AnnotationsProvider` and `BrowserRouter` so every `/chat/:id` surface (the per-message GitBranch icon in `messages@1.0`, the Compress Context action in `branches@1.0`, the Cmd/Ctrl+Shift+B keyboard shortcut) can dispatch into the same modal without expanding the hostAPI bus past its three-event Phase 1 cap (per audit NQ-4). Same precedent as AnnotationsContext from PR-10a.6.
- New `src/components/BranchCreationPanel.jsx` — extracted from the V1 Albatross adapter's inline modal. Two modes (Full History / Compressed Summary), inline context meter showing projected post-branch usage, savings display for Compressed mode (e.g. "62% → ~8%, frees up 54%"), collapsible summary preview generated lazily on click, gold shimmer on the primary CTA. Single-click create — no fake "Compressing…" delay; the real Haiku call + branch creation runs while the button shows progress.
- New `src/catalog/entries/branches-render.jsx` — live render. Self-binds to `useChat()` / `useConversations()` / `useSettings()` / `useBranchPanel()`. Renders the V1 BranchList against the active conversation's children (parentId === activeConversationId), exposes a "Compress Context" action button below the list (default-on; configurable via `showCompressButton`), and mounts the BranchCreationPanel modal whenever the shared context reports an open message id. Auto-compress on threshold cross preserved (gated behind `settings.autoCompress === 'automatic'`).
- New `src/components/BranchShortcutHandler.jsx` — global Cmd/Ctrl+Shift+B listener mounted inside the router, gated to `/chat/:id`. Opens the panel anchored to the latest message. Lives at App.jsx (not inside `branches-render`) so the shortcut works app-wide even on rooms that don't include `branches@1.0` in their mode file.
- `messages-render.jsx` — wires `onBranch={() => openBranchPanel(msg.id)}` on every MessageCard. The per-message GitBranch icon was a no-op since PR-10a.5; now it opens the panel anchored to that message.
- `branches@1.0` catalog manifest — `render` now points at `BranchesRender` (live). `previewRender` unchanged for the dev `/catalog` route. Config schema gains `showCompressButton` and `contextThreshold` (the Settings → component-config migration per audit §3.6).
- `lib/db.js` — `createBranch` now copies `room` from the source conversation onto the new branch record, and `createConversation` accepts an explicit `room` option for the Compressed Summary path. Without this, V2 branches would land at `room: null` and route through the Albatross fallback even when the parent uses RoomShell.
- Documentation: §2.8a in [v2-phase1-audit.md](v2-phase1-audit.md) per-component table updated to mark `branches@1.0` as wired in PR-10a.7. This PR section captures the slice. New PR-10a.7 section in [phase-1-testing.md](phase-1-testing.md) following the PR-10a.6 structure.
- **Out of scope (next slice, before PR-10b):** "Send to branch" / "Pin for reference" message-transfer flows, Hide message + 20-second undo timer, per-message Move to branch, `voice-input@1.0`, `collab-mode@1.0` system prompts, `review@1.0`, `toc@1.0`. The Albatross fallback path continues to handle the deferred actions for users on `room: null` conversations.

**Dependencies:** PR-10a.6.

**Exit criteria:**
- Open a migrated conversation in a room that includes `branches@1.0` (Writing Studio default seeds satisfy this). Side-rail Branches pane shows "Main Thread" with the live message count; no children renders empty list correctly.
- Click the GitBranch icon on any message → BranchCreationPanel opens anchored to that message, "Forking from message N of M" reflects the right index. Click outside / Cancel / Esc closes cleanly.
- Pick Full History → Create Branch → new conversation with `parentId` + `branchPoint` set, all messages up to the fork point copied, `room` inherited from source, navigation lands at `/chat/<newId>` rendered via RoomShell.
- Pick Compressed Summary → click Preview summary → Haiku call fires, result renders inline, cached for the panel session. Closing and reopening the panel clears the cache. Click Create Branch → real Haiku summary persists as the new branch's first assistant message; navigation lands on the branch.
- A failed compressed-summary call falls back to Full History silently (V1 behavior). No API key configured → falls back to Full History.
- Click "Compress Context" in the side rail → panel opens anchored to the latest message.
- Press Cmd/Ctrl+Shift+B anywhere on `/chat/:id` → panel opens anchored to the latest message; shortcut is inert on `/`, `/chats`, `/settings`, etc.
- Albatross fallback (room: null conversations) unchanged — the V1 adapter's own branch flow still works end-to-end.
- `npm run build` clean. No regressions in homepage / editor / wizard / annotations / context-meter surfaces.

**Risk:** Medium. The branch-panel-state context is a new shared surface (third one in V2 after Annotations + Backup). Risk concentrates in conversation-switch lifecycle: if the panel is open and the user navigates away, the next mount must start clean. Mitigated by the modal's local cache + explicit close-on-navigate via `closeBranchPanel()` in the create handlers. Compressed-summary path is a real user-action Composer-tier model call (per [tier-classification.md](tier-classification.md)) — preview generation is gated behind explicit click so users who close the panel without previewing don't burn tokens.

---

### PR-10a.8 — Wire voice-input@1.0 + toc@1.0 to ChatContext

**Goal:** Fourth slice of catalog data plumbing (after PR-10a.5 / PR-10a.6 / PR-10a.7). The lighter half of what's left before PR-10b: voice-input + toc are both small, read-only, and require no new shared state. Closes them out so the next slice (PR-10a.9) can focus on `collab-mode@1.0` + `review@1.0` — the two remaining components that touch the `sendMessage` flow and need real V1-modal extractions.

**Scope:**
- New `src/catalog/entries/voice-input-render.jsx` — production render. Tight mic-only button (rounded full, 9×9 grid units), turns red while listening. Publishes every interim + final transcript via `hostAPI.publish('voice-transcript', { text, isFinal })`; `input@1.0`'s existing subscription (PR-10a.5) appends finalized text to its value. Browser handles mic permission — no Parliament consent flow per [tier-classification.md](tier-classification.md).
- `voice-input@1.0` manifest now points `render` at `VoiceInputRender` (production button) and `previewRender` at the existing `VoiceInputPreview` (verbose explanatory card for the dev `/catalog` route). Both publish on the bus identically; only the surface UI differs.
- New `src/catalog/entries/toc-render.jsx` — self-binds to `useChat().messages`. Derives a list of user-role labels (matches V1 Albatross — assistant replies don't anchor a section), truncated at `truncateAt` chars (default 60), capped at `maxItems` most-recent entries (default 50). Click → `scrollIntoView({behavior:'smooth', block:'center'})` on the `msg-{id}` DOM anchor that `MessageCard` already sets.
- `toc@1.0` manifest now points `render` at `TocRender` (live). `previewRender` unchanged for the dev `/catalog` route.
- Documentation: §2.8a in [v2-phase1-audit.md](v2-phase1-audit.md) per-component table updated to mark `voice-input@1.0` and `toc@1.0` as wired in PR-10a.8. New PR-10a.8 section in [phase-1-testing.md](phase-1-testing.md) following the PR-10a.7 structure.
- **Out of scope (next slice, before PR-10b):** `collab-mode@1.0` system-prompt wiring, `review@1.0` modal, plus the message-transfer / hide / move-to-branch / delete actions. None of those land here.
- **Templates unchanged.** Pocket Chat already seeds `voice-input@1.0` into `input-dock`; Writing Studio / Quiet Room / Drafting Desk / Data Workspace continue to omit voice-input (and TOC) so users opt in via the editor (PR-8) when they want them. The dev `/catalog` route's hand-built mode (`THREE_PANEL_DEMO_MODE`) already includes `toc@1.0` in `left-rail`.

**Dependencies:** PR-10a.7.

**Exit criteria:**
- Open a Pocket Chat conversation. Mic button renders in the input-dock alongside the textarea. Click toggles between Mic and MicOff icons; "Listening…" state is reflected in `aria-pressed` and red border. On browsers without `SpeechRecognition` (Firefox without flag), the button collapses to a small disabled badge with a "Voice input not supported" tooltip rather than disappearing.
- Speaking a final transcript while voice-input is active fires `voice-transcript` on the room bus; `input@1.0` appends the trimmed text to its value (existing PR-10a.5 contract).
- Open a conversation in a hand-built room that includes `toc@1.0`. The TOC renders a "TABLE OF CONTENTS" header followed by one row per user message (truncated). Click a row → viewport scrolls to that message.
- Sending a new user message updates the TOC live (new row appears at the bottom; cap kicks in past `maxItems`).
- The dev `/catalog` route still renders the verbose voice-input preview card (no regression on the catalog debug surface).
- `npm run build` clean. No regressions in homepage / editor / wizard / messages / input / annotations / context / branches surfaces.

**Risk:** Low. Both renders are leaf components: voice-input is a single button that calls into the existing `useVoiceInput` hook (untouched) and the existing bus contract; toc is a pure derivation from `useChat().messages` with the same scroll-into-view pattern that PR-10a.6's `notes-render` already uses. No new shared state, no IndexedDB writes, no API calls.

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
| C | PR-8, PR-8b, PR-9, PR-10a, PR-10a.5, PR-10a.6, PR-10a.7, PR-10a.8, PR-10b, PR-11a, PR-11b, PR-12 | Builder paths + chat-shell migration + cleanup |

**Total: 21 PRs** including PR-0.

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
- **Editor: continuous validation sidebar** (architecture §"Drag-and-Drop Composition") — non-blocking warnings surface in an inspector panel. PR-8 ships drops without blocking; the warning surface is Phase 2 work.
