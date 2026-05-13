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

### PR-10a.9 — Wire collab-mode@1.0 + review@1.0 to ChatContext

**Goal:** Fifth slice of catalog data plumbing. Closes the two remaining components that need real V1-modal extractions plus a live `sendMessage`-flow integration. After this lands the only deferred V2 chat-shell work before PR-10b is the per-message message-transfer / hide / move-to-branch / delete actions (one PR-10a.10 or fold into PR-10b).

**Scope:**
- New `src/stores/CollabModeContext.jsx` — small shared dispatch context. Owns `activePresets: Set<string>`, `customInstruction: string`, `apply(presets, instruction)`, `clear()`, `buildSystemPrompt()`, `activeCount`. State resets when `useChat().activeConversationId` transitions between two distinct non-null ids; transient nulls (e.g. ChatView's `clearMessages()` during route nav back to the SAME conversation) are ignored. Built-in preset prompt strings inlined as `PRESET_PROMPTS` so callers don't depend on the modal's component file. Mounted in App.jsx alongside `AnnotationsProvider` + `BranchPanelProvider`.
- New `src/catalog/entries/collab-mode-render.jsx` — production render. Trigger button with active-count badge. Modal seeded from context state; `onApply` pushes back via `apply()`.
- New `src/catalog/entries/review-render.jsx` — production render. Trigger button (disabled when no messages). Self-binds to `useChat()` + `useAnnotations()` + `useConversations()` + `useSettings()`. Owns the synthesis call (Composer-tier Haiku call against the most recent ~20 messages with optional annotation context — same recipe as V1 Albatross) and the Markdown export (lifted from V1's `handleExportMarkdown`).
- `input-render.jsx` — calls `useCollabMode().buildSystemPrompt()` and threads the result into `sendMessage`'s existing `systemPrompt` argument.
- `messages-render.jsx` — same threading for `continueMessage` so resumed turns keep the active instructions.
- `collab-mode@1.0` + `review@1.0` manifests now point `render` at the production components. `previewRender` unchanged for the dev `/catalog` route.
- Documentation: §2.8a in [v2-phase1-audit.md](v2-phase1-audit.md) per-component table updated to mark both as wired in PR-10a.9; new third-shared-context paragraph documents `CollabModeContext`. New PR-10a.9 section in [phase-1-testing.md](phase-1-testing.md) following the PR-10a.8 structure.
- **Out of scope (next slice, before PR-10b):** Send-to-branch / Pin-for-reference message-transfer flows, Hide message + 20-second undo timer, per-message Move to branch.
- **Templates unchanged.** Default seed templates (Writing Studio etc.) don't include `collab-mode@1.0` or `review@1.0`. Existing migrated conversations get them via DevTools mode editing or a future editor pass; new users compose them via the editor (PR-8). Adding to default seeds is a separate scope decision.

**Dependencies:** PR-10a.8.

**Exit criteria:**
- Open a conversation in a room that includes `collab-mode@1.0`. Trigger button renders; clicking opens the V1 CollabModal seeded from current context state. Picking a preset and clicking "Apply to Conversation" dismisses the modal; the trigger now shows an active-count badge.
- Send a message — DevTools Network shows the request body's `system` field carrying the active preset's prompt text. Continuing a ghost-text message threads the same system prompt.
- Save a Parrot Persona inside the modal — IndexedDB `settings` store key `parrotPersonas` updated.
- Navigate `/chat/X → / → /chat/X` — active preset persists. Navigate `/chat/X → /chat/Y` (different id) — active preset clears (V1 lifetime).
- Open a conversation in a room that includes `review@1.0`. Trigger button is disabled when there are zero messages. With messages, opens the V1 ReviewModal seeded with live highlights / notes / favorites / messages / token usage. Reflection prompts derive from active annotations.
- Click "Generate Synthesis with Claude" — Composer-tier Haiku call fires; result renders inline in the modal as Markdown.
- Click "Save as Markdown" — file downloads with the conversation title, highlights summary, favorites preview, and per-message inline notes.
- Albatross fallback (room: null conversations) unchanged — V1 collab + review surfaces still work end-to-end.
- `npm run build` clean.

**Risk:** Medium. The `CollabModeContext` reset semantics are subtle: V1's per-mount lifetime needs to be preserved without leaking the active state across conversation boundaries OR wiping it during transient null windows. Mitigated by the "two distinct non-null ids" guard in the reset effect and verified live (preset survives same-conv nav, clears on different-conv nav). Synthesis path is a real Composer-tier model call but only fires on explicit user click — no autonomous spend.

---

### PR-10a.10 — Wire per-message Hide / Delete / Send to branch / Pin for reference

**Goal:** Sixth and final slice of catalog data plumbing before PR-10b. Brings the per-message action menu online — Hide, Delete (with 20s undo), Send to branch, Pin for reference — and renders pinned references inline on the target conversation. After this lands the V2 chat surface has parity with V1 for every per-message affordance plus the new V2 Pin flow, so PR-10b's adapter deletion is unblocked.

**Scope:**
- New `src/components/SelectConversationModal.jsx` — extracted from V1's inline `MoveToBranchModal`. Reusable target-conversation picker with search, "New conversation with this message" affordance, recent-12 list. Title + new-chat label parametrized so the same component serves both Send-to-branch and Pin-for-reference flows.
- `messages-render.jsx` — wires every per-message action:
  - **Hide** (Eye menu): session-only `Set` of hidden ids; filters `visibleMessages`. Refresh forgets the hide. Per-conversation reset on `activeConversationId` change between two distinct non-null ids (same guard pattern as `CollabModeContext`).
  - **Delete** (trash icon): hides the message immediately, schedules an IndexedDB delete after 20s, surfaces an inline UndoBanner above the input. Undo clears the timer and unhides. Conversation switch cancels in-flight timers so a delete doesn't fire after the user navigated away.
  - **Send to branch** (ArrowRightCircle menu — V1 label updated from "Move to branch" per CLAUDE.md V2 vocabulary): opens `SelectConversationModal`; on select, copies the message content into the target conversation's messages via `addMessage`. New-chat path creates a fresh conversation seeded with the source's room + model + the message content.
  - **Pin for reference** (Pin menu, V2-new): opens the same modal; on select, writes a record to the existing `pins` IndexedDB store via `addPin`. Renders pinned references as a collapsible "PINNED REFERENCES" block at the top of the active conversation's msg-area. Each pin shows a 3-line clamped preview + a hover-only X to remove. Pins are visual-only — Claude does NOT see them on subsequent sends, matching CLAUDE.md's spec.
- `src/components/core/MessageCard.jsx` — adds `onPinForReference` prop and a "Pin for reference" menu item alongside Hide / Send to branch / Copy text. Renames "Move to branch" label to "Send to branch". Uses lucide's `Pin` icon for the new menu entry.
- Documentation: §2.8a in [v2-phase1-audit.md](v2-phase1-audit.md) per-component table updated. New PR-10a.10 section in [phase-1-testing.md](phase-1-testing.md) following the PR-10a.9 structure.
- **Out of scope (Phase 2 / future):** Multi-select "Send to branch" mode for bulk transfer (CLAUDE.md describes this as a selection mode in the parent's UI). Persistent hide across reloads. The per-message action menu items contributed by other catalog components (the contribution machinery exists since PR-3, but rendering them in MessageCard's menu still defers to a Phase 2 surface).

**Dependencies:** PR-10a.9.

**Exit criteria:**
- Open a conversation in a Writing Studio room. Hover any message → trash icon visible alongside the existing per-message icons. Open the more-options menu → "Hide message", "Send to branch", "Pin for reference", "Copy text" entries visible in that order.
- Click trash → message disappears from the list; UndoBanner appears above the input ("Message deleted · Undo"). Click Undo within 20s → message returns; banner disappears. Don't click Undo for 20s → IndexedDB record actually deletes.
- Click "Hide message" menu → message disappears from the list; UndoBanner does NOT appear; IndexedDB record stays intact. Refresh → hidden message returns (V1 lifetime).
- Click "Send to branch" → modal opens with title "Send to branch", search filter on conversation title + aiSummary, "New conversation with this message" CTA, recent-12 list. Selecting a target appends the message to that conversation's messages. Selecting "New conversation with this message" creates a fresh conversation with the source's room + model and seeds it with the message.
- Click "Pin for reference" → same modal with title "Pin to conversation". Selecting a target writes a `pins` record. If the target IS the active conversation, the new pin appears immediately at the top of the message area as a quote block. Hovering a pin reveals an X that removes it.
- Conversation switch resets the hidden set, cancels pending deletes, and reloads pins for the new conversation. Same-conversation route nav (e.g. /chat/X → / → /chat/X) preserves hidden / pending-delete state.
- Albatross fallback (room: null conversations) unchanged — V1 trash + Move-to-branch flows still work.
- `npm run build` clean.

**Risk:** Medium. Three live IndexedDB write paths (delete, addMessage to other conv, addPin) can fail individually; each is wrapped with a tolerance try/catch and logs in dev mode. The 20s deferred-delete timer is the trickiest part — pending timers must cancel on conversation switch AND on component unmount, otherwise a stale `db.delete` fires against a record the user has since navigated away from. Mitigated by `pendingDeletesRef` cleanup in both effects and verified live (delete + switch + return → record persists; delete + wait 20s → record actually gone).

---

### PR-10b — Delete adapter directories + cleanup InputArea + rotate PWA cache

**Goal:** Point of no return. V2 is the only path.

**Scope:**
- Delete `src/adapters/albatross/`, `src/adapters/kingfisher/`, `src/adapters/starling/`, and `src/adapters/withComingSoon.jsx`.
- Migrate `/chats` and `/settings` off the Albatross adapter **before** the directory is deleted. Path (a) per the scope statement: extract the V1 SelectorLayout to `src/views/SelectorLayout.jsx` (`SelectorView` becomes a thin onboarding-redirect wrapper that renders it), and inline the V1 SettingsLayout into `src/views/SettingsView.jsx`. Both extractions drop the dead bird-mode bits — the InteractionMode picker (settings) and ModeMismatchBanner (selector) — and patch up `+ New chat` so it eagerly assigns a Writing Studio room before navigating instead of relying on a stale `createdInMode` value.
- Drop the Albatross fallback from `src/views/ChatView.jsx`. A null-room conversation triggers an in-place repair via `assignDefaultRoom()` (re-resolves on the next render); a small `ConversationUnavailable` stub renders if the repair itself fails (writing-studio template missing, IndexedDB write fails, etc).
- Extend `src/lib/migration.js` with two new boot-time passes wired alongside the existing PR-10a `migrateChatRoomAssignments` in `ConversationContext`:
  - `migrateRepairNullRooms` — assigns Writing Studio to any conversation PR-10a left at `room: null` (idempotent, separate guard key).
  - `migrateInjectVoiceInput` — per [data-migration.md](data-migration.md) §"Voice-input migration": injects `voice-input@1.0` into legacy swift-migrated rooms (`layout.ref` starts `single-column-with-sheet` AND `buildIntent.derivedFrom === 'swift-migration'`) that don't already include it. Whole-pass and per-room idempotent.
- Remove InputArea's built-in cardLayout mic button. `voice-input@1.0` (PR-10a.8 production render) is the only voice surface.
- Rotate the PWA cache name in `vite.config.js` from `parliament-adapters-v1` to `parliament-modules-v2`. Update the `runtimeCaching` `urlPattern` to match the new `catalog-/component-/module-` chunk-name pattern, bump `maxEntries` to 50, and switch `globIgnores` to match. Drop the deleted adapters' `manualChunks` entries (pelican / secretarybird / swift entries also drop because no production import path reaches them anymore — Rollup tree-shakes them out, and PR-11a/b will delete the directories outright).
- Wipe the legacy `parliament-adapters-v1` runtime cache on first V2 boot. Done from page context (`src/main.jsx`) rather than the SW activate event, because vite-plugin-pwa's `generateSW` strategy doesn't expose a custom-listener hook; `caches.delete` is callable from the window and idempotent. PR-12 can drop the snippet once all live users have rotated past V2 boot.

**Dependencies:** PR-10a, **PR-10a checkpoint passed**.

**Exit criteria:**
- `npm run build` clean.
- No references to deleted adapter directories anywhere in `src/`.
- Existing mobile users (post-PR-10a migration to pocket-chat) have working voice via the injected component.
- PWA cache cleanly rotates: old cache wiped on first boot, new cache populates correctly.
- No 404s for old adapter chunk URLs.

**Out of scope (Phase 2 / follow-ups):**
- A redesigned V2 settings page. Settings stays as the extracted V1 layout; redesign is a separate scope statement.
- Dynamic code-splitting of the extracted V1 layouts. Bringing them into the synchronous main bundle (path (a)) is intentional for safety; if bundle size becomes a problem, lazy-loading these views is a small follow-up.
- Tour-selector reattachment beyond the V1 surface. The `data-tour` selectors continue to target the moved layouts; tours that broke during the V2 transition still need rewrites per audit §3.11.

**Risk:** High. Point-of-no-return. If problems surface, rollback requires reverting both PR-10a and PR-10b together.

---

### PR-11a — Decompose Pelican into 5 catalog components

**Goal:** Pelican functionality fully expressed as catalog components.

**Scope:**
- Five new catalog entries (plus reuse of existing `messages@1.0` + `input@1.0` for the conversational analysis side of the room):
  - `file-shelf@1.0` — Composer tier. Owns `files` and `file_data` IndexedDB stores via the new App.jsx-mounted [FileShelfContext](src/stores/FileShelfContext.jsx). Publishes `file-context-changed` on the room hostAPI bus on every change to the staged-files set or the in-context subset.
  - `chart-canvas@1.0` — Reader. Recharts-backed; reads parsed data from FileShelfContext. `chartType` config (bar/line/area/scatter/pie).
  - `table-canvas@1.0` — Reader. Sortable, paginated grid; sticky header; right-aligned numerics; per-component sort state.
  - `summary-dashboard@1.0` — Composer. KPI cards + AI-generated insights + distributions + data-quality flags. **Generation gated behind an explicit "Generate insights" click** — V1 Pelican auto-generated on file load, which would have made this an Agent-tier component (autonomous model call) per [tier-classification.md](tier-classification.md); Phase 1 ships zero Agent components.
  - `column-inspector@1.0` — Reader. Type-tagged column list with null counts, sample values, and an expand-to-detail row. V1 Pelican's InspectorPanel embedded a chat surface alongside the schema view; the catalog decomposition splits those — messages@1.0 + input@1.0 own chat, column-inspector owns just the columns. The "Group by / Filter / Visualize" per-column action chips are not wired in PR-11a (cross-component compose dispatch beyond the three Phase 1 bus events is a Phase 2 concern).
- New `src/catalog/emptyStates.jsx` — shared empty-state templates keyed by manifest `softDependencies[].fallbackUI`. The chart / table / summary trio declares `softDependencies: [{ component: 'file-shelf@1.0', fallbackUI: 'data-source-needed' }]`. RoomShell's softDependencies aggregation (formerly deferred per `RoomShell.jsx` "Intentionally deferred behaviors" note) now substitutes the empty-state for the dependent component's render whenever the dependency isn't present in the room. Closes audit §3.17.
- Update [canvas-centric@1.0](src/catalog/layouts/canvas-centric.jsx) layout: bump `canvas` slot capacity from `single` to `stack` so chart-canvas + table-canvas + summary-dashboard coexist (V1 Pelican toggled between them via tabs; the V2 decomposition stacks vertically and scrolls).
- Update Data Workspace template seed: file-shelf in `left-rail`; chart-canvas + table-canvas + summary-dashboard stacked in `canvas`; column-inspector + context in `inspector`; messages in `chat-panel`; input in `input-dock`. Bump the template's seedVersion in [seedTemplates.js](src/lib/seedTemplates.js) and extend `seedLibraryRooms` so existing libraryRooms records re-seed on next boot when their stored seedVersion is below the current.
- New `migrateDecomposeDataWorkspaceRooms` pass in [lib/migration.js](src/lib/migration.js), wired alongside the existing PR-10a/PR-10b passes in `ConversationContext`. Rewrites every mode in the `modes` store that uses `canvas-centric@^1.0` AND doesn't already include `file-shelf@1.0` to the new component list. Per-room idempotent (skips rooms already on the new shape) + whole-pass guard via `migration_v2_pelican_room_decomposed`. Tags rewritten modes with `buildIntent.derivedFrom = 'pelican-decomposition'` (preserving any prior `pelican-migration` tag) plus `decomposedAt: 'pr-11a'`.
- Delete `src/adapters/pelican/` and [PelicanContext](src/stores/PelicanContext.jsx). The component sources move to `src/components/core/` (FileShelf, ChartCanvas, TableCanvas, SummaryDashboard, ColumnInspector) and consume FileShelfContext directly. `lib/fileParser.js` stays in `lib/` — it's used by both file-shelf and column-inspector + summary-dashboard.

**Dependencies:** PR-10b.

**Exit criteria:**
- Pelican-equivalent functionality available via the Data Workspace template.
- A user can compose a custom data-analysis room with any subset of canvas components.
- A canvas component without file-shelf renders the shared `data-source-needed` empty state.
- Existing Pelican users' files / file_data preserved (the stores are unchanged; only the components reading them moved).
- `npm run build` clean.

**Risk:** High. Largest decomposition. State is shared via FileShelfContext rather than the bus (the bus is non-sticky; a late subscriber would miss the most recent payload), but the bus event still fires for forward-compat — same precedent as AnnotationsContext / BranchPanelContext / CollabModeContext.

---

### PR-11b — Decompose Secretarybird into 3 catalog components

**Goal:** Secretarybird functionality fully expressed as catalog components.

**Scope:**
- Three new catalog entries (plus reuse of existing `messages@1.0` + `input@1.0` for the conversational drafting side of the room):
  - `document-canvas@1.0` — Composer tier. Owns the `sbrd_documents` IndexedDB store via the new App.jsx-mounted [DocumentContext](src/stores/DocumentContext.jsx). Auto-saves paragraphs / submittedReplies via 1s debounce. Owns the toolbar (Markup, Accept All, Clear All, Export, Submit Edits), the contentEditable paper + slash menu + tracked-changes overlay, the floating selection→Add-Comment tooltip, and the Submit & Branch flow (single combined Composer-tier Claude call against the V1 verbatim prompt — comment replies + optional ripple flags + ripple suggestions in one JSON blob — followed by `createConversation` that copies the source's `room`). Targets the `document` slot in document-centric@1.0 (capacity: `single`).
  - `claude-comments@1.0` — Composer tier. Per-paragraph comment sidebar with reply lifecycle. User-driven add / delete / reply; Claude replies on user comments come from document-canvas's Submit & Branch flow (NOT autonomous — Phase 1 ships zero Agent components per [tier-classification.md](tier-classification.md)). Targets the `margin` slot (capacity: `stack`, order 0).
  - `ripple-analysis@1.0` — Composer tier. Cross-paragraph analysis flag list + dismiss UI; cross-document scan via the Expand Scope modal (per-target Composer-tier Haiku call, only fires on user click). Owns the Ripple toggle that gates whether Submit asks Claude for ripple flags. Targets the `margin` slot (order 1, after claude-comments).
- New `document-source-needed` empty-state template in `src/catalog/emptyStates.jsx` (margin-shape variant — smaller form factor than the canvas `data-source-needed` template). The claude-comments / ripple-analysis pair declare `softDependencies: [{ component: 'document-canvas@1.0', fallbackUI: 'document-source-needed' }]`. RoomShell's softDependencies aggregation (introduced in PR-11a) substitutes the empty-state for the dependent component's render whenever the dependency isn't present in the room.
- Update Drafting Desk template seed: document-canvas in `document`; claude-comments + ripple-analysis stacked in `margin`; messages + input in `chat-panel`. Bump `drafting-desk@1.0` seedVersion to 2 in [seedTemplates.js](src/lib/seedTemplates.js) — PR-11a's `seedVersionFor()` helper handles re-seeding on next boot when stored version is below current.
- New `migrateDecomposeDraftingDeskRooms` pass in [lib/migration.js](src/lib/migration.js), wired alongside the existing PR-10a/PR-10b/PR-11a passes in `ConversationContext`. Mirrors the PR-11a pass shape: rewrites every mode using `document-centric@^1.0` AND not already including `document-canvas@1.0` to the new component list. Per-room idempotent (skips rooms already on the new shape) + whole-pass guard via `migration_v2_secretarybird_room_decomposed`. Tags rewritten modes with `buildIntent.derivedFrom = 'secretarybird-decomposition'` (preserving any prior `secretarybird-migration` tag from PR-10a) plus `decomposedAt: 'pr-11b'`. Covers both PR-10a-secretarybird-migrated rooms AND fresh drafting-desk rooms created from the V1 placeholder seed.
- New App.jsx-mounted `DocumentContext` (the fifth shared context after Annotations / BranchPanel / CollabMode / FileShelf). Lifetime mirrors FileShelfContext: resets when `useChat().activeConversationId` transitions between two distinct non-null ids; transient nulls ignored. The bus stays at three Phase 1 events — PR-11b does not expand it.
- The 2928-line V1 [SecretarybirdChatLayout](src/adapters/secretarybird/ChatLayout.jsx) is decomposed into focused files under `src/components/core/`:
  - `DocumentCanvas.jsx` — toolbar, paper, paragraph rendering, Submit confirmation modal, toast.
  - `ClaudeComments.jsx` — sidebar comment + suggestion list.
  - `RippleAnalysis.jsx` — sidebar ripple flag list + Expand Scope trigger.
  - `sbrd/DocumentParagraph.jsx` — single contentEditable row with slash menu, diff overlay, inline gutter.
  - `sbrd/cards.jsx` — ClaudeOriginCard / ClaudeSuggestionCard / MarginComment / CommentCard / RippleCard / SidebarSectionLabel primitives.
  - `sbrd/diff.js` — wordDiff + DOM cursor helpers.
  - `sbrd/renderers.jsx` — DiffText / HighlightedText / ClaudeInlineSuggestionPreview.
  - `sbrd/RippleScopeModal.jsx` — cross-document scan modal.
  The V1 sidebar Chat tab is dropped — `messages@1.0` + `input@1.0` in `chat-panel` own conversational drafting. Free-form Claude responses no longer auto-inject as paragraph adds/edits (V1's `parseClaudeResponse` add/edit JSON action blocks); that surface goes away with the V1 sidebar Chat tab. The on-Markup-toggle ripple scan from V1 is also dropped — Phase 1 keeps ripple analysis to the Submit-triggered flow per the brief's "stay with V1's existing ripple analysis surface (cross-paragraph on Submit only)".
- Delete `src/adapters/secretarybird/`. The integrity check special case in [db.js](src/lib/db.js:842-859) ("don't delete sbrd-document-bearing conversations whose messages is empty") is a runtime invariant on the `sbrd_documents` store — survives the decomposition unchanged.

**Dependencies:** PR-10b. (Independent of PR-11a; runs in parallel.)

**Exit criteria:**
- Secretarybird-equivalent functionality available via the Drafting Desk template.
- A user can compose a custom drafting room with any subset of the decomposition (e.g. document-canvas alone, document-canvas + claude-comments).
- A margin component without document-canvas renders the shared `document-source-needed` empty state.
- Existing Secretarybird users' `sbrd_documents` records preserved (the store is unchanged; only the components reading them moved).
- Tracked changes, comment add / reply / delete, Submit & Branch with comment replies + ripple flags, Expand Scope cross-document scan all work.
- `npm run build` clean.

**Risk:** High. Largest single-file decomposition (2928 lines). State is shared via DocumentContext rather than the bus (the bus is non-sticky; a late subscriber would miss the most recent payload), but the same precedent as AnnotationsContext / BranchPanelContext / CollabModeContext / FileShelfContext applies. Decomposition cleanliness is hard to verify without thorough manual testing — production-bundle symbol-grep covers structural verification when the dev server is unavailable; live testing checklist in [phase-1-testing.md](phase-1-testing.md) §PR-11b.

---

### PR-12 — Cleanup

**Goal:** Phase 1 closeout.

**Scope:**
- Delete `src/lib/modeSuggestions.js` and `src/components/core/ModeSuggestion.jsx`.
- Consolidate `src/lib/tokens.js` cost data into `src/providers/anthropic.js` with shape-flexibility for non-Anthropic providers (`cost: null` or `cost: { type: 'free-local' }` placeholders supported).
- Delete `src/stores/ModeContext.jsx` (still mounted from PR-3 backwards-compat).
- Delete `src/adapters/swift/` (the last bird-mode adapter directory; severed from routing in PR-10b but the source files lingered).
- Strip the legacy `parliament-mode` localStorage key on app load + drop the PR-10b `parliament-adapters-v1` cache wipe (no installed user base).
- Archive `mockups/*.jsx` to `refactor/v1-mockups-archive/` (don't delete; preserve for fidelity reference).
- Delete V1-era stale docs: `ROADMAP.md`, `DECISIONS-LOG.md`, `SESSION-LOG-2026-03-02.md`, `session-summary-2026-03-07`, `session-summary-2026-03-12`, `implementation-guide.md`. Replace `CLAUDE.md` with a short redirect to `refactor/v2-phase1-audit.md` and the rest of `refactor/`.
- Update `README.md` to V2 vocabulary.
- Run the Phase 1 exit-criteria checklist and confirm — section added to `phase-1-testing.md` PR-12.

**Dependencies:** PR-11a, PR-11b.

**Exit criteria:**
- Phase 1 exit criteria satisfied (verified via the testing-checklist PR-12 section):
  - A new user can build a room via any of the three paths and it works.
  - An existing V1 user's data survives the migration.
  - All V1 features available somewhere (shell or catalog component).
  - Homepage, template gallery, editor, wizard render per their mockups.
  - Export and restore round-trip correctly.
  - No V1 code paths remain for the bird-mode adapter pattern.
- `npm run build` clean. Production bundle no longer ships
  `MODE_CAPABILITIES`, `ModeProvider`, `ModeSuggestion`,
  `evaluateSuggestions`, `inputCostPer1k` / `outputCostPer1k`, or
  `parliament-adapters-v1` symbols. `src/adapters/` directory removed.

**Risk:** Low. Mostly housekeeping; the structural work happened in earlier PRs. Risk vector is "deletion of a load-bearing import" — mitigated via production-bundle symbol-grep before / after each deletion (the build-success signal alone doesn't catch this — Rollup tree-shakes orphans without complaining; the bundle-grep proves the symbol actually leaves the artifact).

---

### PR-13 — Build wizard rewrite + first-run gate + Table of Contents

**Goal:** Make the build-a-room flow match the user's fine-tuned wizard spec (`parliament_wizard_v5.html`) verbatim. Make the wizard the first thing every new visitor sees AND the destination of every "+ Build a room" click. Ship Table of Contents as a real `response-headings` mode on `toc@1.0`. Stub Open Room as a coming-soon-tagged feature.

**Scope:**
- New screens 0 (Welcome + 3-path picker) and 7 (Done). Replaces the gallery-first entry of the V1 PR-9 wizard.
- Multi-select Purpose (Writing / Research / Coding / Thinking) and Device (Desktop / Mobile). "Build another room afterward" checkbox surfaces on step 1 when ≥ 2 purposes are selected.
- Density-driven layout reveal in step 3. `LAYOUTS_BY_DENSITY`: minimal → single-column-with-sheet, balanced → three-panel, full → all three of three-panel / canvas-centric / document-centric. Single-layout densities auto-select with a gold-pulse animation.
- Inline layout preview overlay (right-side slide-in panel, Esc closes).
- Features step lists Table of Contents / Context Health / Highlights / Branches / Collaboration Mode / Open Room (coming-soon, not selectable) / File Shelf with category tags per spec.
- Name + scheme step with live summary card whose background follows the chosen scheme.
- Ignition step: paste the API key, click Validate → call `getProvider().validateKey()`. On success: sweep animation through the room preview, room border flashes solid gold, feature chips light in cascade, Connected badge breathes, Enter button reveals. On failure: red / amber border + spec'd error copy.
- Done step with "Build another room" / "Go to your Parliament" CTAs.
- HomepageView first-run gate: no API key + no `tourCompleted_wizard` → `/build`. Returning users with no key but a completed wizard fall back to `/settings` (recovery path).
- Extend `toc@1.0` with a `mode` config option: `'user-prompts'` (default, V1 parity) or `'response-headings'` (NEW — scans assistant-message markdown headings, hierarchical H1–H4). Wizard's Table of Contents feature ships with `mode: 'response-headings'`.
- `MessageCard.jsx` injects sequential heading anchor ids (`msg-{messageId}-h-{idx}`) on every h1..h4 it renders, regardless of highlight state. The `response-headings` toc mode reconstructs the same ids in document order.
- `buildAndOpenRoom(config)` adds a fresh conversation tied to the new mode (existing `createConversation` from `lib/db.js`), so the homepage shows the new room after the user completes the wizard.

**Dependencies:** PR-12.

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-13 section pass.
- `npm run build` clean. Bundle no longer ships `BuildStepper` / `BuildSteps`. Symbol-grep confirms `tourCompleted_wizard`, `response-headings`, `user-prompts`, `table-of-contents` are present.
- A new visitor sees the wizard (not /settings); a returning user with a completed wizard sees the homepage.
- A successful wizard run produces a persisted mode + a fresh conversation in it; the homepage chats list shows that conversation.

**Risk:** Medium. UI rewrite touching the first-run flow. Mitigated by reusing existing primitives (`validateKey`, `saveApiKey`, `createModeFromTemplate`, `createConversation`, `TemplateGallery`, `loadHomepageMode`) and following the spec verbatim for layout. Multi-provider work stays out per audit §3.20.

---

### PR-14 — Homepage v2 visual alignment

**Goal:** Bring the homepage UI flush with the user's `parliament_homepage_v2 (2).html` spec and the principles in `parliament_v2_design_decisions.md`. Replace the v1 grid-of-rounded-boxes blueprint with a real SVG floor plan whose room shapes reflect their layouts. Align chats, library, and favorites sections to the spec's grids, chips, and bulk-toolbar affordances. Make sections drag-reorderable.

**Scope:**
- DB schema bump v4 → v5: add `author` and `installedCount` to `libraryRooms` / `libraryLayouts` / `libraryComponents` / `librarySchemes`. Migration backfills `{ author: { name: 'Parliament', handle: 'parliament', verified: true }, installedCount: 0 }` on existing rows. Seed updates apply the same to new rows.
- New `seedLibraryComponents()` step seeds the `libraryComponents` table from the in-memory catalog manifest registry (`src/catalog/index.js`). Required for the library section's Components tab to have anything to show.
- New `src/lib/blueprintShapes.js` — pure functions: per-layout SVG path generators (three-panel bump, canvas-centric chamfer, document-centric chamfer, single-column chamfer), djb2 hash → per-room variability, greedy left-to-right bin-packing with row wrap, pawn placement helper.
- New `src/catalog/entries/blueprint-render.jsx` — replaces blueprint-preview.jsx. Single SVG canvas with hatched outer wall, floor grid, irregular per-layout rooms, breathing gold pawn marker, dimension ticks, "+ Build a room" placeholder, hover-cross-link with chats@1.0 via the existing `PHASE_1_EVENTS.ROW_HOVER` bus.
- New `src/components/SectionCard.jsx` — replaces the inline `src/catalog/layouts/section-card.jsx`. Adds chevron rotation, animated max-height collapse via `requestAnimationFrame` measurement, hover-revealed grabber, and HTML5 native drag-reorder handlers. Layout owns the drag state.
- `stacked-sections@1.0` rewires drag-reorder: on drop, reorders the section-slot subset of `mode.components`, renumbers `order`, calls `saveMode`, dispatches a `homepage-mode-changed` CustomEvent on `window`. HomepageView listens and re-fetches.
- Topbar (`HomepageTopBar.jsx`): swap labelled buttons for borderless icon buttons — Wrench (Edit homepage), Home (+ Build a room, gold accent), Database (Backup), Settings. BackupStatusIndicator dot stays.
- `chats@1.0` rebuild: 5-column grid (`28px 1fr 180px 90px 90px`), custom 15px gold checkbox, view toggle with Sparkles/StickyNote/Highlighter/GitBranch icons, gold bulk toolbar (Pin / Regenerate summaries / Delete / Clear) replaces the search+toggle when any row is selected, topic chips with `hash(tag) % 8` palette, footer with conversation count.
- `library@1.0` rebuild: filter chips (All / Rooms / Layouts / Components / Schemes / Resources), library-search box, type-specific preview thumbnails (room walls + door + input dock; layout panels; component timeline track + dots; scheme color swatch from variants; resource icon), colored type chip per kind, author byline + install count + "Add →" CTA.
- New `src/components/LibraryOverlay.jsx` — right-side 420px slide-in panel replacing the centered modal. Per-type extra blocks (`Includes` / `Slots` / `Fits in slots` / `Covers`) derived live from manifest data; resources' `covers` ships in the static `RESOURCES` const.
- `favorites@1.0` rebuild: hover-revealed copy button (Copy → Check flash 1.5s), gold star icon + source title meta line, 3-line snippet clamp. Section-level Edit button toggles bulk-select mode (gold checkboxes per card → bulk-toolbar with Remove + Done).
- All visual classes (`.section`, `.bp-*`, `.chats-*`, `.library-*`, `.lib-*`, `.ov-*`, `.favs-*`, `.bulk-*`) live under a new "Homepage v2 (PR-14)" block in `src/index.css` with a `prefers-reduced-motion` override that drops the pawn-breathe / bulk-slide-in / overlay-slide animations.
- Pawn placement deviates from spec/§5: pawn rides next to "+ Build a room" when zero rooms exist; once any room exists, it moves to the room owning the most-recently-updated conversation.

**Dependencies:** PR-13.

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-14 section pass.
- `npm run build` clean. Symbol-grep confirms `bp-floorgrid` / `chat-row` / `library-grid` / `ov-backdrop` / `favs-grid` / `BlueprintRender` are present in the production bundle. The old `blueprint-preview.jsx` and `src/catalog/layouts/section-card.jsx` files no longer exist on disk and their `BluePreview` symbol no longer appears in `dist/assets/index-*.js`.
- A user with one or more rooms sees an SVG floor plan with room-specific shapes; hover a chat row → its room's path lights gold. Drag a section's grabber → the order persists across reload.
- The library Components tab is no longer empty.

**Risk:** Medium. Large visual rewrite touching the most-trafficked surface. Mitigated by keeping the data layer (`listModes`, `useConversations`, `loadHomepageMode`) untouched and handling reorder via a single `saveMode` write per drop. Mobile responsiveness is parked for PR-15 — fixed widths in the topbar / chats toolbar will cut off below ~768px until then.

---

### PR-15 — Mobile responsiveness audit

**Goal:** Close the cosmetic gaps PR-14's desktop-first spec left below 768px without redesigning any surface. Every change is either a CSS media query (cosmetic, scoped) or a thin route-level gate (the editor) so PR-16 can pick up the architectural multi-rail collapse work cleanly.

**Scope:**
- New `src/lib/useViewportWidth.js` — exports `useIsNarrow(threshold = 768)`. ~15 lines, SSR-safe via `typeof window` guard. First custom hook in the codebase, justified by two consumers: PR-15's editor gate and PR-16's room-layout narrow-mode switching.
- `HomepageTopBar.jsx`: hide the "Parliament" wordmark below 480px (`hidden min-[480px]:inline`); breadcrumb gets `min-w-0 truncate` so long values ellipsify instead of pushing icons offscreen; outer padding goes from `px-6` to `px-4 sm:px-6` to reclaim 16px on narrow.
- `EditorView.jsx`: above the existing `loadError` block, gate on `useIsNarrow(768)` and render a new inline `EditorTooNarrow` component — full-screen `<Card>` ([Card.jsx](../src/components/Card.jsx)) with copy explaining the editor needs a wider screen, `<Button>` ([Button.jsx](../src/components/Button.jsx)) "Back to home". Hook-driven so portrait → landscape transitions without reload.
- New "PR-15: Mobile responsive overrides" block at the end of `src/index.css`:
  - `.chats-search { width: auto; flex: 1 1 0 }` at `max-width: 600px` (was fixed 280px)
  - `.view-toggle button span { display: none }` at `max-width: 520px` (icon-only pill; titles preserved on buttons for tooltip a11y)
  - `.chat-row` grid drops absolute date at 640px and topics at 480px; padding tightens at 480px
  - `.bulk-toolbar { flex-wrap: wrap }` at 480px
- Extends the existing `@media (hover: none) and (pointer: coarse)` block: `.section-grabber-handle { display: none }` because HTML5 native drag-and-drop is broken on iOS Safari and unreliable on Android Chrome — section reorder remains a desktop feature until PR-17 migrates it to dnd-kit.

**Out of scope** (deferred):
- Multi-rail room-layout narrow modes (three-panel / canvas-centric / document-centric → hamburger-left + full-screen-right pattern below 768px) — PR-16.
- HTML5 D&D → dnd-kit migration for section reorder — PR-17 (optional).
- Mobile editor (wizard-per-section, library-card icon abstractions, tap-to-place) — V3.
- Wild Card Creator (DeviceMotionEvent spin-to-roll) — V3.
- `/chats` V1 SelectorView responsive — its own future pass.
- Settings — explicitly out of scope per `CLAUDE.md`.

**Dependencies:** PR-14.

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-15 section pass.
- `npm run build` clean. Symbol-grep confirms `useIsNarrow` is in the production JS bundle and the new `@media (max-width: 600px)` / `@media (max-width: 520px)` / `@media (max-width: 640px)` / `@media (max-width: 480px)` rules for chats-* / chat-row / bulk-toolbar are present in `dist/assets/index-*.css`.
- At 320px / 375px viewport widths: topbar fits without horizontal scroll, chat rows render legibly with title + relative-date, library is 1-col, favorites is 1-col, library overlay is full-bleed with 5% margin.
- `/edit/:id` and `/edit-home` show the gate panel below 768px with a working "Back to home" button.
- Desktop (≥768px) is pixel-identical to PR-14.

**Risk:** Low. No data-layer changes, no architecture changes. Largest exposure is the editor gate's resize-listener correctness (handled by useIsNarrow). Section reorder regressions on touch are explicitly accepted (was never functional on iOS Safari).

---

### PR-16a — Blueprint variety + pills-on-all-rooms + per-turn model

**Goal:** Lift the homepage SVG blueprint from "every room of the same layout looks identical" to a curated-but-unpredictable shape system, where each room renders one of ~5–6 visually distinct shapes per layout. Pills render on every room (active gold, others gray) so the user always sees a room's feature footprint at a glance. The "Last spoken to" line accurately reflects the most-recent model used in each room. Canvas-centric rooms get the spec's outward alcove instead of the current inward chamfer.

**Scope:**
- `src/lib/blueprintShapes.js`: 3 curated shape variants per layout (12 generators total — 4 of them existing PR-14 code kept verbatim as variant 0; 8 new). Variant picked by `hash mod 3`. Hash bit 8 controls horizontal mirroring. Added `mirrorPath(d, axisX)` helper. `ROOM_GAP` widened 14→24 and `VIEWBOX_PAD` 28→32 so adjacent left+right protrusions don't collide.
- New exported `interiorHints({ box, layoutRef, roomId })` returning dashed-line/rect specs that hint at the layout's slot structure (three-panel shows two faint vertical rails, canvas-centric shows a faint canvas frame, document-centric shows two horizontal page bands, single-column shows a narrow vertical column). Hash-perturbed by ±2-3px per room.
- `src/catalog/entries/blueprint-render.jsx`: `<FeaturePills>` now renders on every room, with a `PILL_PALETTE` const switching between active (gold, h=14) and inactive (gray, h=12, smaller text) variants per spec. Added `MODEL_DISPLAY` map next to the existing `LAYOUT_DISPLAY` / `SCHEME_DISPLAY` and a `modelLabel(raw)` helper that maps known model ids to friendly names ("Claude Sonnet 4.6") and humanizes unknowns. `interiorHints()` rendered inside each `<Room>` between the fill and the border.
- `src/stores/ChatContext.jsx`: `sendMessage` now writes `conversation.model = model` on every turn (fire-and-forget, same pattern as the existing title/summary/tags writes). Anchors the homepage's "Last spoken to" label and reflects the user's actual most-recent model. No schema bump — uses the existing `model` field. Comment explains the semantic shift from "creation default" → "most recently used."

**Out of scope (deferred):**
- PR-16: room-layout responsive collapse below 768px (multi-rail → hamburger-left + full-screen-right).
- PR-17: HTML5 D&D → dnd-kit migration for section reorder.
- V3: Wild Card Creator (DeviceMotionEvent spin), mobile editor (wizard-per-section), voice-to-build.
- V3 design doc §8: doorways between branched chats.

**Dependencies:** PR-15.

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-16a section pass.
- `npm run build` clean. Symbol-grep confirms `interiorHints`, `MODEL_DISPLAY`, `mirrorPath`, and at least 8 new shape generator function names are present in `dist/assets/index-*.js`.
- For 6+ seeded rooms across all four layouts, the blueprint shows visible variety per layout — e.g. some three-panel rooms have right-bumps, some left-bumps, some dual-bumps; some canvas-centric rooms have alcoves, some have notches, some have L-jogs. Same room id renders the same shape across reloads.
- Pills render on every room; active room is gold, others are gray.
- Sending a message in a model different from the conversation's stored value updates `conversation.model` and the homepage label reflects it on next visit.
- Canvas-centric rooms protrude outward (alcove); no canvas-centric rooms have chamfered-inward corners as their primary character.

**Risk:** Low-medium. Shape file is heavily refactored but the public API stays the same (`buildRoomPath` still returns `{ path, interior }`). Largest exposure is the bin-packer geometry interaction with mirrored protrusions on edge rooms — partially mitigated by the wider `ROOM_GAP` and `VIEWBOX_PAD`. Mirror-induced bump-vs-wall protrusion is accepted as architectural quirk if it shows.

---

### PR-16 — Multi-rail room layouts: responsive collapse below 768px

**Goal:** Three of the five room layouts — `three-panel`, `canvas-centric`, `document-centric` — render fixed-width rails that crush content below 768px. PR-16 adds a narrow-mode branch to each that swaps to a chrome bar + drawer + state-toggled panel composition, second consumer of the `useIsNarrow(768)` hook PR-15 introduced. Single-column-with-sheet stays untouched (already mobile-native); stacked-sections is homepage-only.

**Scope:**
- New `src/components/layouts/NarrowDrawer.jsx` — left-edge slide-in drawer. Mirrors `EditorPreviewSheet`'s Framer Motion modal pattern (`SPRING_GENTLE` slide + scrim fade), anchored left with `x: '-100%'` → `0`. Esc + scrim-click dismiss. Width 288px (`w-72`). Uses `useReducedMotion()` to drop transition duration to 0 when the user prefers reduced motion. `aria-modal="true"` + `role="dialog"`; no programmatic focus trap (matches `EditorPreviewSheet` / `LibraryOverlay` convention).
- New `src/components/layouts/NarrowSheet.jsx` — chevron-handle expandable panel. Aesthetically mirrors the existing pattern in [single-column-with-sheet.jsx:62-79](../src/catalog/layouts/single-column-with-sheet.jsx); extracted because canvas-centric and document-centric narrow modes need the same handle vocabulary above the input dock. Single-column-with-sheet itself is NOT refactored to consume this — its sheet sits below the input, the new primitive sits above. Open/close is instant (no motion), matching the existing single-column behavior.
- New `src/components/layouts/NarrowChrome.jsx` — thin h-10 top bar with two `<IconButton>` slots. Hamburger (`Menu` icon, left) opens the drawer; `PanelRight` icon (right) toggles the secondary-content panel. Both buttons are conditional on the layout actually having content for that side. Reuses the existing [IconButton.jsx](../src/components/IconButton.jsx) primitive.
- `three-panel.jsx`: convert to a named-function `render` so `useState` is legal (mirrors `single-column-with-sheet`'s pattern). Adds `useIsNarrow(768)` gate. Narrow tree: NarrowChrome at top, body swaps between msgs+input and right-rail+right-rail-extra (stacked) based on `panelOpen`, drawer holds left-rail.
- `canvas-centric.jsx`: same shape, but the body in default narrow state shows canvas (full body) → NarrowSheet labeled "Chat" wrapping the chat-panel slot → input-dock at bottom. Inspector folds into the panel-toggle slot. Auto-open-sheet-on-send is **not** in scope — user taps the chevron to see Claude's reply.
- `document-centric.jsx`: same shape. Document fills the body, NarrowSheet labeled "Chat" wraps chat-panel, margin folds into the panel-toggle slot. No input-dock slot exists for this layout — chat components carry their own input, so the sheet's inner content includes both messages and input.

**Out of scope (deferred):**
- Auto-open-sheet-on-send for canvas-centric/document-centric (event-coupling layout↔chat-context). Easy follow-up if verification reveals friction.
- URL-routed right panel (history.pushState + popstate) — current state-only swap means hardware back button leaves the chat. Acceptable; same as desktop today.
- Editor preview narrow rendering — `useIsNarrow` reads viewport not container, and the editor itself is gated <768px, so narrow-mode never triggers inside the preview. Container-query rewrite is a possible future PR.
- Refactoring `single-column-with-sheet` to consume `NarrowSheet`. Different sheet position; same handle. Not worth the churn.
- Stacked-sections — homepage layout, not at `/chat/:id`. Already responsive per PR-14/PR-15.

**Dependencies:** PR-15 (`useIsNarrow` hook), PR-16a.

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-16 section pass.
- `npm run build` clean. Symbol-grep confirms `NarrowDrawer`, `NarrowSheet`, `NarrowChrome` are present in `dist/assets/index-*.js`.
- At <768px viewport, three-panel / canvas-centric / document-centric rooms render with chrome bar + drawer + sheet, no horizontal scroll, no crushed rails.
- At ≥768px viewport, all three layouts render pixel-identically to their pre-PR state.
- `prefers-reduced-motion` (DevTools emulate or system setting) drops drawer slide duration to 0; no other motion is introduced.
- No new lint errors versus the ~165 pre-existing baseline.

**Risk:** Low-medium. The layout files are converted from arrow `render` to named-function `render` to make `useState` legal — same conversion `single-column-with-sheet` did at PR-7, no precedent break. Largest exposure is unfamiliar narrow-mode branches in three layout files; tested by resizing each layout's example room across the 768px boundary. Sheet ergonomics for canvas-centric (no auto-open on send) is an explicit accepted trade-off; adjustable in a follow-up.

### PR-17 — dnd-kit migration for homepage section reorder

**Goal:** PR-14 shipped homepage section reorder via native HTML5 drag-and-drop. PR-15 confirmed it's broken on iOS Safari (no `dragstart` fires from touch) and unreliable on Android Chrome, and defensively hid the grabber handle on touch-primary devices. PR-17 swaps the HTML5 implementation for dnd-kit so reorder works on touch (250ms long-press), keyboard (Tab → Space → arrows → Space), and adds proper screen-reader announcements. The grabber handle returns on touch with a finger-sized 40px hit target.

**Scope:**
- [src/catalog/layouts/stacked-sections.jsx](../src/catalog/layouts/stacked-sections.jsx): rewrite the render to wrap section list in `<DndContext>` + `<SortableContext>`. Sensors: `PointerSensor { distance: 4 }` (matches editor convention) + `TouchSensor { delay: 250, tolerance: 5 }` + `KeyboardSensor { coordinateGetter: sortableKeyboardCoordinates }`. Modifiers: `restrictToVerticalAxis` + `restrictToParentElement` (axis lock prevents the dragged clone sliding horizontally; parent lock keeps it inside the max-w-5xl container). `<DragOverlay>` renders a simplified lifted clone (`SectionDragPreview` inline named function) following the pointer. Custom `accessibility.announcements` strings for screen readers ("Picked up Library section. Position 2 of 4."). `persistReorder` keeps the existing splice + reindex + saveMode + `homepage-mode-changed` event flow; wrap saveMode in try/catch so a failed save snaps the UI back via the same event. A `reorderingRef` guard rejects a second `onDragEnd` while a save is in flight (race window between HomepageView's async refetch and a fast second drag).
- [src/components/SectionCard.jsx](../src/components/SectionCard.jsx): use `useSortable` internally. Drop the four `onSection*` callback props + `isDragging`/`isDropTarget` props; add `sortable` + `sortableId`. Grabber wrapper converts from `<div draggable>` to `<button type="button">` with an `aria-label` so KeyboardSensor has a focusable activator and screen readers have a name. Destructure useSortable outputs at the hook call site (a stricter `react-hooks/refs` lint rule mis-flags property access on the hook return value). Export `Grabber` as a named export so stacked-sections's drag preview can reuse the dot pattern.
- [src/index.css](../src/index.css): delete the unused `.section.drop-target` rule (dnd-kit's SortableContext makes siblings shift naturally, no drop-target highlight needed). Reset button chrome on `.section-grabber-handle` (background/border/padding zero) since the element is now a `<button>`. Add `touch-action: none` + `-webkit-user-select: none` so iOS Safari doesn't scroll the page or surface the long-press text callout while the user is initiating a drag. New `.section-drag-preview` class adds a drop shadow + grabbing cursor to the DragOverlay clone. Inside the existing `(hover: none) and (pointer: coarse)` block: remove the PR-15 `display: none` hide; add `opacity: 1` on the inner `.section-grabber` (no hover state on touch) and bump the handle to `40x40` for finger-sized hit area. New `@media (prefers-reduced-motion: reduce) .section { transition: none !important }` for the sibling-shift animation.
- [package.json](../package.json): add `@dnd-kit/modifiers ^9.0.0` (~1.5 kB gz). Other `@dnd-kit/*` packages were already installed at PR-8.

**Out of scope (deferred):**
- Adding reorder to library / favorites overlays — not requested by the user; sections are the only top-level draggable surface today.
- Adding reorder to rooms in the blueprint — blueprint enhancements are PR-19 territory (bloom UX + duplicate/merge actions).
- Refactoring the editor's existing dnd-kit usage to match PR-17's patterns. The editor uses `useDraggable`/`useDroppable` (free-form) and doesn't need `useSortable` — no churn.

**Dependencies:** PR-14 (sets up the HTML5 implementation PR-17 replaces); PR-15 (hides the grabber on touch as a defensive measure; PR-17 un-hides it).

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-17 section pass.
- `npm run lint` returns ≤ baseline (165 problems). PR-17 actually lands at 164 because inlining the render function eliminates a pre-existing `react-refresh/only-export-components` error.
- `npm run build` clean. Bundle delta under +3 kB gz versus PR-16.
- Symbol-grep of `dist/assets/index-*.js` returns 0 hits for the removed HTML5 D&D identifiers (`onSectionDragStart`, `onSectionDragOver`, `onSectionDragEnd`, `onSectionDrop`, `isDropTarget`, `dropTargetId`). Announcements text ("Picked up", "Position N of M") is present.
- Manual: desktop pointer reorder still works; keyboard reorder (Tab → Space → arrows → Space) now works with audible announcements; iOS Safari + Android Chrome touch reorder works (250ms long-press); `prefers-reduced-motion` skips the sibling-shift tween.

**Risk:** Low-medium. The persistence logic is unchanged — only the gesture layer swaps. The race-window between two quick drags is guarded by `reorderingRef`. The largest unknown is mobile Safari + Chrome touch behavior with `touch-action: none` + the 250ms TouchSensor delay; PR-15 hid the grabber for this exact reason. Verification on real devices is the gate.

### PR-18a — Mobile homepage polish + touch haptic

**Goal:** Five small mobile-polish items + a haptic confirmation on touch drag-start. All from a user fine-tuning pass after PR-17 verification on real Android and iOS devices. No new primitives, no architectural changes — pure surface-level adjustments to existing components and the new dnd-kit gesture.

**Scope:**
- [src/catalog/entries/chats-preview.jsx](../src/catalog/entries/chats-preview.jsx) (H1): below 768px the view-toggle (Summary / Notes / Highlights / Branches) moves out of the toolbar and into the footer alongside the conversation count. Frees the toolbar for a full-width search input on phones. Uses the existing `useIsNarrow(768)` hook. The toggle JSX is extracted to a `viewToggle` const that gets rendered in either the toolbar (`!isNarrow`) or the footer (`isNarrow && !hasSelection`).
- [src/index.css](../src/index.css) (H1 + H2): new `@media (max-width: 480px)` rule wraps the `.chat-footer` so the toggle drops below the count on the smallest viewports rather than crowding it. New `@media (max-width: 600px)` rule pushes `.library-search` to `width: 100%; flex-basis: 100%; margin-left: 0` so it wraps to a full-width row below the filter chips inside `.library-filters` (the parent already has `flex-wrap: wrap`).
- [src/components/BackupRestoreModal.jsx](../src/components/BackupRestoreModal.jsx) (H3 + H4): the modal footer status line changes from `'Never backed up · This browser'` to plain `'Never backed up'` — keeps the `· This browser` suffix only when there *is* a backup, where it actually disambiguates which browser was used. The recommended-backup card restructures to `flex flex-col gap-3.5` so the `Back up everything` button stacks below the icon + title + stats row and stretches to full-width. Reads as a clearer primary action; works on both desktop and mobile.
- [src/catalog/layouts/stacked-sections.jsx](../src/catalog/layouts/stacked-sections.jsx) (haptic): `handleDragStart` now calls `navigator.vibrate?.(10)` when the activator event's `pointerType === 'touch'`. Android touch drag-start fires a brief haptic confirming the gesture registered. iOS Safari ignores it (no Web Vibration API). Desktop pointer drags skip the call entirely so touchscreen laptops don't vibrate on mouse drag.

**Out of scope (deferred):**
- The "I" items batch (input area redesign for mobile + mobile Settings redesign + `+` menu architecture). Deferred to PR-18b/c and a separate components-as-input-actions PR batch (see chat history with the user — Web Search and File Attach get their own catalog components that contribute `inputActions` via a new contribution type).
- A configurable haptic strength / disable toggle. iOS users get nothing regardless; Android users with OS haptics disabled get nothing regardless. A custom Settings toggle would only matter for Android users who want zero haptic feedback for this app specifically — not enough demand signal yet.

**Dependencies:** PR-14 (chats@1.0 + library@1.0 components), PR-15 (`useIsNarrow` hook), PR-17 (dnd-kit handleDragStart, where the haptic call lives).

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-18a section pass.
- `npm run lint` returns 164 problems (162 errors + 2 warnings) — same as PR-17 post-merge baseline.
- `npm run build` clean.
- Symbol-grep confirms `"Back up everything"` (1), `"This browser"` (1 — only the with-backup path), `"Never backed up"` (2 — backup.js label + modal display), and `navigator.vibrate` (1) all ship in `dist/assets/index-*.js`.

**Risk:** Low. Each item is a small isolated adjustment. The haptic addition is gated on `pointerType === 'touch'` so it can't fire on unintended platforms. The H1 change has the most blast radius (a structural toggle-position swap based on viewport) but lives behind the same `useIsNarrow` hook that PR-15/PR-16 already established.

### PR-18b — Mobile input redesign + inputActions contribution infrastructure

**Goal:** Redesign the chat input for mobile to match the Swift V1 pattern (a card with `+` on the left and a button on the right that swaps between mic when text is empty and Send when text is present), with message content fading into transparency as it approaches the input. Alongside the visual redesign, introduce a new manifest contribution type — `inputActions` — that mirrors the existing `messageActions` aggregation pattern in RoomShell. Sibling components in a room declare what they contribute to the input's `+` menu (and to the right-side primary slot via a `primary: 'right'` flag); `input@1.0` reads from `hostAPI.getInputActions()` at render time.

**Scope:**
- [src/components/RoomShell.jsx](../src/components/RoomShell.jsx): mirror the existing messageActions aggregation block at lines 186-196 to collect `inputActions` from every mounted component. Stamp each contribution with `componentId` + `contributedBy`. After the resolve loop, publish via `hostAPI._setInputActions(list)`. ~20 lines of additions, verbatim shape match.
- [src/lib/hostAPI.js](../src/lib/hostAPI.js): add private `inputActions` slot + `getInputActions()` reader + `_setInputActions(list)` writer mirroring the messageActions pair. Extend the dev-mode `KNOWN_EVENTS` check to allow `input-action:*` prefix events (the dynamic event names for invoked contributions) without warning.
- [src/catalog/entries/voice-input.jsx](../src/catalog/entries/voice-input.jsx): contributes `{ id: 'voice-toggle', label: 'Voice input', iconName: 'Mic', primary: 'right' }` — the first input-action consumer. Convention introduced by PR-18b: contributions with `primary: 'right'` render as the right-side button (mic↔send slot); contributions without `primary` go in the `+` overflow.
- [src/catalog/entries/voice-input-render.jsx](../src/catalog/entries/voice-input-render.jsx): subscribe to `input-action:voice-toggle` and call `toggle()` (start/stop SpeechRecognition). On narrow viewports (<768px) return `null` so voice-input's own button doesn't duplicate the one rendered by `input@1.0` in its mobile card. Desktop slot rendering is unchanged.
- [src/components/core/InputArea.jsx](../src/components/core/InputArea.jsx): refactor PlusMenu from an inner `const PlusMenu = () => (...)` to `function renderPlusMenu()` returning JSX (avoids the `react-hooks/static-components` lint rule's component-during-render flag). PlusMenu now reads `overflowActions` from props and renders contribution items via an icon-name lookup (`ICON_BY_NAME = { Mic, Globe, Paperclip }`); the hardcoded Web Search / Calculate / Create Chart `TOOL_META` stubs are removed. Right-side button gains a fourth state — when text is empty AND not streaming AND a `rightPrimaryAction` exists, render that action's icon (the mic for voice-toggle). Tap publishes `input-action:${id}` via `onInvokeAction`. V2 disabled-state hook for the `+` button is in place, gated on `overflowActions.length === 0 && intrinsicMenuItemCount === 0`; with intrinsic file-upload always present in PR-18b the gate doesn't fire (Rollup dead-code-eliminates the disabled branch), but the infrastructure activates in PR-18e when file-upload moves out to `file-attach@1.0`.
- [src/catalog/entries/input-render.jsx](../src/catalog/entries/input-render.jsx): import `useIsNarrow(768)` and force `cardLayout` on for narrow viewports regardless of config. Memoize the split of `hostAPI.getInputActions()` into `rightPrimaryAction` + `overflowActions`. New `handleInvokeAction(id, payload)` callback publishes `input-action:${id}` on the bus. Drop the old `availableTools` / `activeTools` / `onToggleTool` props (replaced by the contribution model).
- [src/catalog/entries/input-preview.jsx](../src/catalog/entries/input-preview.jsx): update the preview's InputArea props to match the new shape (`rightPrimaryAction={null}`, `overflowActions={[]}`, `onInvokeAction={() => {}}`).
- [src/components/core/MessageList.jsx](../src/components/core/MessageList.jsx): add `messages-fade-mask` class to the scroll container. Inert above 768px; activates the mask-image rule below.
- [src/index.css](../src/index.css): new `@media (max-width: 768px) .messages-fade-mask { mask-image: linear-gradient(to bottom, black 0, black calc(100% - 64px), transparent 100%) }` rule with `-webkit-mask-image` fallback for Safari.

**Out of scope (deferred):**
- `web-search@1.0` catalog component (PR-18d) — will contribute an overflow `inputAction` and own the Anthropic web search tool wiring.
- `file-attach@1.0` catalog component (PR-18e) — will replace the intrinsic file-upload entry. When it ships, `intrinsicMenuItemCount` drops to 0 and the V2 `+` disabled-state activates for rooms without contributors.
- Mobile Settings redesign — see the separate PR-18c entry below (when that ships).
- Mic↔send swap on the desktop inline layout: the user's locked decision A1 was mobile-specific. Desktop continues to render Send always.

**Dependencies:** PR-17 (no direct dep; PR-18a's haptic is unaffected). PR-10a.5 input-render, PR-10a.8 voice-input split, PR-15 useIsNarrow hook.

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-18b section pass.
- `npm run lint` returns 164 problems (162 errors + 2 warnings) — same as PR-17/PR-18a baseline. No new errors.
- `npm run build` clean.
- Symbol-grep of `dist/assets/index-*.js` confirms `inputActions` (×2), `getInputActions` (×1), `_setInputActions` (×2), `input-action:` (×2), `voice-toggle` (×1), and `messages-fade-mask` (in JS + CSS) all ship. `Create chart` (one of the removed stub tool labels) returns 0. `Web search` returns 1 — but unrelated to the removed PlusMenu stub: it's the Anthropic provider's own web_search tool description in the provider registry (orthogonal to the input UI).

**Risk:** Medium. The InputArea refactor changes a high-traffic surface. The PlusMenu function-vs-component refactor was a forced lint fix (the rule `react-hooks/static-components` activated at some point post-PR-17; baseline cleared at 164 only after the refactor). The mic↔send swap state machine has four branches (streaming/has-text/right-primary/empty) — verification on real devices is the gate. The disabled-state path is dead-code today; PR-18e is the moment it goes live, so PR-18e MUST re-verify the tooltip rendering manually.

### PR-18c — Mobile Settings chevron-expandable cards

**Goal:** Apply the chevron-expandable cards pattern from the "Menu for mobile settings.png" mockup to `/settings` below 768px. Multi-open accordion: each section row toggles independently; the first section (API Configuration) is expanded on first paint so the most important config is one tap away. Section content is unchanged — the seven section components the desktop already renders are reused verbatim inside the accordion panels, so semantics, validation flows, and modals are identical across viewports. Desktop Settings (≥768px) is untouched per CLAUDE.md (the desktop redesign is firmly out of Phase 1).

**Scope:**
- [src/views/SettingsView.jsx](../src/views/SettingsView.jsx): import `useIsNarrow` + `useReducedMotion` + `ChevronRight`. Add `useIsNarrow(768)` to the top of `SettingsView`. Extract a `sectionForId(id)` closure that returns the right `<ApiSection / ModelSection / ... />` for a given nav id with all its props wired — both desktop's `AnimatePresence mode="wait"` and the mobile accordion call this same function so the section components don't fork. Add `MobileSettings` (named function) — owns the multi-open `expanded: Set<sectionId>` state initialized to `new Set([NAV_ITEMS[0].id])`, the top bar (back arrow + "Settings" label), the decorative grey handle, and a vertical list of `MobileSettingsRow` per nav item. Add `MobileSettingsRow` — chevron row (icon + label + animated chevron) + `AnimatePresence` height-auto accordion panel. `useReducedMotion()` gates both the chevron rotation and the panel expand/collapse. `data-tour` attributes ride along from `NAV_ITEMS` onto the mobile rows so the existing first-visit tour works in either viewport mode.
- [src/views/SettingsView.jsx](../src/views/SettingsView.jsx): also modify `SettingsSection` to call `useIsNarrow(768)` internally and hide the `<h2>` title on narrow (the chevron row already shows the section label, so rendering it again inside the panel would be duplication). The subtitle stays as in-context copy above the cards.
- [src/index.css](../src/index.css): new `.mobile-settings-screen` wrapper + `.mobile-settings-handle` decorative pill + `.mobile-settings-header` flex row + `.mobile-settings-list` flex column + `.mobile-settings-section` card border + `.mobile-settings-row` 56px-min-height touch target with focus-visible outline + `.mobile-settings-panel` / `.mobile-settings-panel-inner` accordion containers. All classes only render via the `MobileSettings` JSX branch; desktop is untouched.

**Locked design decisions:**
- **D1 multi-open accordion** — user closes via the chevron when they want to. Trade-off: more vertical scroll when several are open; gain: can read two adjacent sections without re-tapping.
- **D2 first-section initial expansion** — `NAV_ITEMS[0]` is API today, matches the desktop default `useState('api')`. If the nav order ever reshuffles, mobile follows.
- **D3 hide title inside the expanded panel** — keep subtitle; section row label IS the title.
- **D4 tour anchors stay on chevron rows** — tooltips point at the collapsed row; the user expands as discovery, no auto-expand.
- **D5 decorative handle** — small grey pill at top-center, visual only, no gesture binding.
- **Shimmer + connection pill: skip on mobile.** Today validation happens during the desktop /build wizard (mobile users arrive with a key already saved). A TODO comment in `validateKey` flags revisiting when Phase 2 multi-provider config (audit §3.20) brings validation surfaces into mobile — that's when the sweep + Connected dot would want to fire on the mobile header too.

**Out of scope (deferred):**
- Desktop Settings redesign (CLAUDE.md: stays as V1 layout per the original audit decision).
- Tour auto-expand behavior (D4 picked manual expansion).
- Settings content reorganization — pattern transfer only, the seven sections + their cards stay as-is.
- Shimmer / connection pill on mobile (see TODO in `validateKey`).

**Dependencies:** PR-15 useIsNarrow hook, PR-16 narrow-branch precedent. PR-18a / PR-18b did not touch SettingsView.

**Exit criteria:**
- All criteria in `phase-1-testing.md` PR-18c section pass.
- `npm run lint` returns 164 problems (162 errors + 2 warnings) — same as PR-18b post-merge baseline. No new errors.
- `npm run build` clean.
- Symbol-grep of `dist/assets/index-*.js` confirms `MobileSettings` (×1+), `MobileSettingsRow` (×1+), `mobile-settings-handle` (in JS + CSS), `mobile-settings-row` (in JS + CSS) all ship. Desktop-only strings (`shimmer-sidebar-border`, the left-nav slide-in) remain present — desktop UI is unchanged.

**Risk:** Low. Reuses the seven existing section components verbatim — no new validation or modal logic, no new state semantics. The accordion height-auto animation pattern is already used elsewhere in this file (UsageSection's budget alert). The data-tour attr transfer to the mobile row uses the same string IDs (`settings-api`, `settings-context`, `settings-data`) so the TourTooltip targets resolve regardless of viewport.

---

## Wave summary

| Wave | PRs | Description |
|---|---|---|
| 0 | PR-0 | Documentation foundation (5 docs, no code) |
| A | PR-1, PR-2, PR-3 | Foundation (no user-visible change) |
| B | PR-4a, PR-4b, PR-5, PR-6, PR-7 | Visual system + new homepage + V2 backup |
| C | PR-8, PR-8b, PR-9, PR-10a, PR-10a.5, PR-10a.6, PR-10a.7, PR-10a.8, PR-10a.9, PR-10a.10, PR-10b, PR-11a, PR-11b, PR-12 | Builder paths + chat-shell migration + cleanup |
| D | PR-13 | Phase 1 polish — wizard rewrite + first-run gate + TOC component |
| D | PR-14 | Homepage v2 visual alignment — SVG blueprint, drag-reorder sections, spec-aligned chats/library/favorites |
| D | PR-15 | Mobile responsiveness audit — cosmetic media queries + editor narrow-screen gate |
| D | PR-16a | Blueprint variety — multiple shape variants per layout + mirroring + interior hints + pills on all rooms + per-turn model |
| D | PR-16 | Multi-rail room layouts collapse below 768px — NarrowChrome + NarrowDrawer + NarrowSheet primitives, narrow branches in three-panel / canvas-centric / document-centric |
| D | PR-17 | dnd-kit migration for homepage section reorder — touch + keyboard reorder + screen-reader announcements |
| D | PR-18a | Mobile homepage polish — Chats toolbar / Library search / Backup modal copy + button layout + touch haptic on section drag-start |
| D | PR-18b | Mobile input redesign — card layout via useIsNarrow, mic↔send swap, mask-image fade on messages, `inputActions` contribution infrastructure mirroring messageActions |
| D | PR-18c | Mobile Settings — chevron-expandable cards pattern at <768px, multi-open accordion, decorative handle, section-title hide via SettingsSection useIsNarrow, shimmer/connection-pill desktop-only |

**Total: 31 PRs** including PR-0.

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
