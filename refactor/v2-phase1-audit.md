# Parliament V2 — Phase 1 Refactor Audit

**Branch:** `claude/v2-refactor-audit`
**Status:** Final form. Reflects all decisions from the section-by-section review.
**Companion docs:** [tier-classification.md](tier-classification.md), [phase-1-pr-plan.md](phase-1-pr-plan.md), [glossary.md](glossary.md), [data-migration.md](data-migration.md).

This document is the prerequisite for Phase 1 work as described in `parliament-v2-refactor-scope.md` §2. It inventories the V1 codebase, maps each V1 surface onto the V2 four-layer composition model, identifies the migration risks, summarizes the Phase 1 execution order, and records the resolved decisions.

The five sections below correspond to the original audit task list. Section 4 (PR plan) is summarized here; the canonical source is `phase-1-pr-plan.md`.

---

## 1. V1 codebase inventory

### 1.1 Build, hosting, and security baseline

- React 19 + Vite 7 + Tailwind 4, single-page app.
- Build target: static `dist/`, hosted on Netlify per [netlify.toml](netlify.toml).
- **CSP** allows scripts from self only and connects only to `self` + `https://api.anthropic.com`. Workers and manifest from self. No third-party origins anywhere. Hard constraint V2 must preserve.
- **Service worker** (PWA via `vite-plugin-pwa`) with two security-relevant rules in [vite.config.js](vite.config.js):
  - `urlPattern: /^https:\/\/api\.anthropic\.com\//` is `NetworkOnly` with explicit "no exceptions" comment. Streaming responses must travel directly from the browser to api.anthropic.com — the SW never caches, buffers, or inspects them. V2 preserves this rule verbatim.
  - Per-adapter code splitting via `manualChunks` produces `adapter-albatross.js`, `adapter-pelican.js`, etc. A runtime cache `parliament-adapters-v1` holds them after first activation. **This cache name must rotate on V2 cutover** (see §3 risk H).
- Strict mode root in [main.jsx](src/main.jsx); fetch is wrapped at boot by [installFetchLogger()](src/lib/networkLog.js) so the Network Activity card shows every outbound request.

### 1.2 Routing, view shells, and the bird-mode adapter pattern

There are exactly three routes in [App.jsx:23-28](src/App.jsx):

| Route | View shell | Purpose |
|---|---|---|
| `/` | [SelectorView](src/views/SelectorView.jsx) | Conversation list / homepage |
| `/chat/:id` | [ChatView](src/views/ChatView.jsx) | Active conversation |
| `/settings` | [SettingsView](src/views/SettingsView.jsx) | Settings |

Each view is a thin shell that lazy-loads one of six adapters keyed by `mode` from [ModeContext](src/stores/ModeContext.jsx).

| Mode | ChatLayout | SelectorLayout | SettingsLayout | Notes |
|---|---|---|---|---|
| `albatross` | 2180 lines | 1573 lines | 1115 lines | The "real" desktop adapter; everything else delegates back to it for at least one route. |
| `swift` | 948 lines | 537 lines | **1234 lines** | Real and distinct for **all three routes** — the only mode besides Albatross with that property. The mobile adapter set. |
| `pelican` | 86 lines (real) | 9 lines (re-exports Albatross) | 8 lines (re-exports Albatross, with comment "Settings are global") | Real chat adapter with 7 sub-components in `src/adapters/pelican/components/` and its own [PelicanContext](src/stores/PelicanContext.jsx). |
| `secretarybird` | 2928 lines (real, the largest single file) | 1 line, re-export | 1 line, re-export | Real chat adapter (document editor, tracked changes, ripple analysis, comments). Owns the `sbrd_documents` IndexedDB store. |
| `kingfisher` | 4 lines (`withComingSoon(Albatross)`) | 4 lines (same) | 4 lines (same) | Stub. All three layouts use `withComingSoon`. Falls through to Albatross with an amber banner. |
| `starling` | 4 lines (same) | 4 lines (same) | 4 lines (same) | Stub. Same pattern. |

[withComingSoon.jsx](src/adapters/withComingSoon.jsx) is a 73-line wrapper that injects a fixed banner and dismisses to localStorage per mode.

**`MODE_CAPABILITIES` is dead code at runtime.** A grep across `src/` for `.can(`, `.is(`, `useMode().capabilities`, or any importer of `MODE_CAPABILITIES` returns zero matches. The map's *keys* (mode names) are alive — they're used inside `ModeContext.jsx` itself for validity guards on lines 87 and 111. The *values* (`{ layout, input, gestures, sidebars, contextHealth, selection, animations, touchTargets, fileHandling, toolUse }`) are documentation in the form of a constant. Deleting the map costs nothing for the values; the validity-guard logic must be preserved as the migration step that maps legacy `localStorage[parliament-mode]` to a default room.

### 1.3 State management

**Five contexts at app level**, plus **one mode-specific context** (`PelicanContext`) mounted *inside* the Pelican `ChatLayout` rather than at App.jsx. Wired in [App.jsx:18-34](src/App.jsx).

| Context | Owns |
|---|---|
| [PWAContext](src/stores/PWAContext.jsx) | Online/offline flag, SW update lifecycle, install-prompt deferral, install banner. |
| [ModeContext](src/stores/ModeContext.jsx) | Active mode, stored mode, capability lookup, persisted to localStorage as `parliament-mode`. |
| [SettingsContext](src/stores/SettingsContext.jsx) | Twelve named settings (storageMode, defaultModel, theme, fontSize, contextThreshold, autoCompress, summaryDepth, budgetAlert, budgetEnabled, backupReminder, lastBackup, spendingLimitDismissed). Storage estimate. Theme class on `<html>`. |
| [ConversationContext](src/stores/ConversationContext.jsx) | Conversation list, active conversation id, integrity check on mount, CRUD wrappers. |
| [ChatContext](src/stores/ChatContext.jsx) | Active conversation messages, streaming state, abort controller, incremental persistence (every 3s), client-side tool loop (max 5 turns), continue-from-ghost, auto-generation of title/summary/tags after first exchange. |
| [PelicanContext](src/stores/PelicanContext.jsx) | **Mode-specific.** Pelican-only file staging, in-context flags, canvas view, chart type, table sort, inspector state, parsed-data session cache. Mounted inside the Pelican `ChatLayout`, not at app level. |

| Mode | Has own React Context? | Has own IndexedDB store? |
|---|---|---|
| Albatross | no | no |
| Swift | no | no |
| **Pelican** | **yes** (`PelicanContext`) | yes (`files`, `file_data`) |
| Secretarybird | no | yes (`sbrd_documents`) |
| Kingfisher | n/a (stub) | no |
| Starling | n/a (stub) | no |

Pelican is the only mode with its own React Context; that pattern (mode-specific context mounted by the adapter) goes away in V2 — `file-shelf@1.0` will own its file-staging state internally rather than via a global per-mode context.

### 1.4 IndexedDB

**Two databases.**

**`parliament` (current `DB_VERSION = 3`, [db.js](src/lib/db.js)) — 10 stores:**

| Store | Key | Indexes | Purpose |
|---|---|---|---|
| `conversations` | `id` | `updatedAt` | Records: `id, title, model, parentId, branchPoint, createdInMode, pinned, storageBytes, createdAt, updatedAt`. Optional fields added by ChatContext after creation: `aiSummary, familyId, parentTitle, tags`. |
| `messages` | `id` | `conversationId` | Messages with role/content/tokenCount/incomplete/createdAt. |
| `highlights` | `id` | `conversationId` | Highlighted passages. |
| `notes` | `id` | `conversationId` | Per-message and per-conversation notes. |
| `favorites` | `id` | `conversationId` | Starred messages. |
| `pins` | `id` | `targetConversationId` | Cross-conversation pinned references (branch transfer). |
| `settings` | `key` | — | Key-value store. The encrypted API key lives here under `parliament-api-key`. |
| `files` | `id` | `conversationId` | Pelican file metadata (added at v2 migration). |
| `file_data` | `fileId` | — | Pelican compressed file bytes. |
| `sbrd_documents` | `conversationId` | — | Secretarybird document state (added at v3 migration). |

**`parliament-keystore` (separate database, [crypto.js:15-23](src/lib/crypto.js)):**

One store, `encryption-keys`, holding a single non-extractable AES-GCM CryptoKey. Deliberately separate from `parliament` so [clearAllData](src/lib/db.js:601) does not destroy the key.

**Backup format ([exportAllData](src/lib/db.js:558-572)):** emits `{ conversations, messages, highlights, notes, favorites, pins, settings, sbrd_documents, exportedAt, version: 1 }`. **Known gap:** `files` and `file_data` are not included in the export. [validateBackup](src/lib/validate.js) checks all included stores including cross-references, but **does not validate `sbrd_documents`** (the validator skips unknown stores).

**Encryption:** API key uses non-extractable AES-GCM stored locally. Backups use PBKDF2 (100k iterations, SHA-256) → AES-GCM. Plain-JSON export also offered. **V2 raises iterations to 210k per `parliament_backup_restore_implementation.md`.**

### 1.5 Provider layer

[providers/base.js](src/providers/base.js) defines: `validateKey, sendMessage, getModels, countTokens, getAvailableTools, generateTitle, generateSummary, generateTags, getContinueInstruction`. [providers/anthropic.js](src/providers/anthropic.js) is the only implementation.

Notable behavior:

- Models hardcoded with short ids (`claude-haiku, claude-sonnet, claude-opus, claude-opus-4-7`) and resolved to API ids on send.
- Streaming via SSE parsed inline. Aborted via AbortController.
- Tool support: built-in `web_search` (server-side), client-side `calculate` (uses [mathEval.js](src/lib/mathEval.js)) and `create_chart` (returns a marker JSON that MessageCard renders via ChartRenderer).
- Tool loop in [ChatContext.sendMessage](src/stores/ChatContext.jsx:117-299) with `MAX_TOOL_TURNS = 5`. The `create_chart` special case (fenced-code-block embedding) is V1 jank; V2's `visualization@1.0` is a parallel concept (Phase 2).
- Lightweight Haiku calls for title/summary/tags after first user→assistant exchange.

**Multi-provider readiness for Ollama and others** (firmly Phase 2+): provider interface stays generic, model-info consolidation in PR-12 doesn't bake in Anthropic-specific shapes (`cost` may be `null` or `{ type: 'free-local' }`). Ollama brings new concerns (no API key, HTTP localhost, dynamic model list, no spending-limit applicability) that the abstraction must absorb cleanly.

### 1.6 Library helpers (lib/)

| File | Lines | Purpose |
|---|---|---|
| [constants.js](src/lib/constants.js) | 30 | `SPRING_*`, `DUSTY_GOLD`, `HIGHLIGHT_COLORS`, `getContextColor`. |
| [crypto.js](src/lib/crypto.js) | 225 | API key + export encryption (V1: 100k PBKDF2; V2 spec: 210k). |
| [db.js](src/lib/db.js) | 609 | All IndexedDB CRUD, including `runIntegrityCheck` and `exportAllData`/`importData`/`clearAllData`. |
| [fileParser.js](src/lib/fileParser.js) | 282 | CSV/TSV/XLSX/JSON parsing for Pelican. |
| [fileUpload.js](src/lib/fileUpload.js) | 109 | Reads attachments and formats them inline as message content. |
| [mathEval.js](src/lib/mathEval.js) | 224 | Safe expression evaluator for the calculate tool. |
| [modeSuggestions.js](src/lib/modeSuggestions.js) | 66 | Three rules (csv→pelican, stylus→secretarybird, kingfisher commented out). **Removed entirely in V2** (per §2.7). |
| [networkLog.js](src/lib/networkLog.js) | 97 | Wraps `window.fetch`; 100-entry ring buffer subscribed to by `NetworkActivityCard`. |
| [textUtils.js](src/lib/textUtils.js) | 38 | `includesWord`, `indexOfWord` for highlight matching. |
| [tokens.js](src/lib/tokens.js) | 53 | Model info and cost estimation. **Duplicates** a subset of `anthropic.js#getModels` with inconsistent units (per-1k vs per-1M). Consolidate to provider in PR-12. |
| [validate.js](src/lib/validate.js) | 219 | Backup schema validation, cross-reference and cycle detection. |

### 1.7 Custom hooks (hooks/)

- [useShimmer.js](src/hooks/useShimmer.js) — drives the gold ignition sweep on API key validation. Reused by V2's wizard step 6 ignition moment per `build-ui-decisions.md` §6.
- [useVoiceInput.js](src/hooks/useVoiceInput.js) — Web Speech API wrapper. In V1, consumed only by InputArea in cardLayout (Swift). In V2, consumed by `voice-input@1.0` catalog component (per §2.3).

### 1.8 Shared and core components

`src/components/` (shell-level UI primitives):

- `Button, Card, IconButton, Input, Modal, RadioGroup, SectionLabel, SegmentedControl, Toggle` — design-system primitives.
- `CollabModal` (471 lines) — Collaboration Mode presets + Parrot Personas CRUD. Reused by Albatross and Swift chat layouts.
- `ReviewModal` (374 lines) — synthesizes a conversation via Claude.
- `NetworkActivityCard` (83 lines) — surfaces the fetch log inside Settings.
- `TourTooltip` (242 lines) — onboarding tour primitive.
- `ErrorBoundary` (136 lines) — top-level and per-route boundary.

`src/components/core/` (chat-surface primitives — strongest seed for V2 catalog entries):

- `BranchList, ChartRenderer, CitationLink, CitedMarkdown, ContextMeter` (already supports `displayMode: 'meter' | 'compact' | 'ambient'`), `HighlightList, InputArea` (with cardLayout flag for mobile), `MessageCard, MessageList, ModeSuggestion, NoteList` (stub), `TOC, ToolToggles`.

**Note on `ChartRenderer` vs Phase-2 Visualization:** The V1 `ChartRenderer` is the spiritual ancestor of the V2 `visualization@1.0` component. They share rendering machinery (Recharts) but are surface-different — Phase 1 keeps `ChartRenderer` as-is for the `create_chart` tool flow; Phase 2 ships `visualization@1.0` as a separate pipeline-driven catalog component. Don't merge them prematurely.

### 1.9 V1-era stale documentation

Repo root contains several files the V2 briefing explicitly excludes from references: `CLAUDE.md`, `ROADMAP.md`, `DECISIONS-LOG.md`, `SESSION-LOG-2026-03-02.md`, `session-summary-2026-03-07`, `session-summary-2026-03-12`, `implementation-guide.md`. Listed here only so anyone reading the audit knows they exist and were intentionally skipped. Replaced/deleted in PR-12.

### 1.10 Mockups directory

`mockups/*.jsx` contains V1-era reference files (chat-interface-final, chat-interface-mobile, chat-selector-{,v2,v6,mobile}, branch-panel-v3, pelican-mode, settings, settings-mobile). Not V2 references. **Archived to `refactor/v1-mockups-archive/` in PR-12** (per NQ-10) rather than deleted, so the visual record is preserved.

---

## 2. V1 → V2 catalog mapping

### 2.1 Layouts

Six layouts seeded in `libraryLayouts` for Phase 1. Names follow `parliament_v2_design_decisions.md` §2.

| V2 layout id | Replaces | Scope | Status | Slot inventory |
|---|---|---|---|---|
| `three-panel@1.0` | Albatross ChatLayout | `room` | available | `left-rail`, `msg-area`, `input-dock`, `right-rail`, `right-rail-extra` |
| `canvas-centric@1.0` | Pelican ChatLayout | `room` | available | `left-rail`, `canvas`, `chat-panel` |
| `document-centric@1.0` | Secretarybird ChatLayout | `room` | available | `document`, `margin` (left), `margin` (right), `input-dock` |
| `single-column-with-sheet@1.0` | Swift ChatLayout | `room` | available | `msg-area`, `input-dock`, `sheet` |
| `stacked-sections@1.0` | new (V2 homepage) | `homepage` | available | `section-slot` (×N, stackable) |
| `reading-pane@1.0` | (Kingfisher's planned layout) | `room` | coming-soon | placeholder; spec deferred |
| `split-view@1.0` | (Starling's planned layout) | `room` | coming-soon | placeholder; spec deferred |

The two coming-soon layouts ship as placeholder library entries with wireframe previews; click → read-only preview overlay (per NQ-2).

### 2.2 Slots

**Universal slots** (must mean the same across layouts per architecture §3): `left-rail, right-rail, right-rail-extra, msg-area, input-dock`.

**Layout-specific slots** (genuinely unique semantics):

- `canvas` — center artifact region; canvas-centric only.
- `chat-panel` — secondary chat region, smaller than msg-area; canvas-centric and document-centric.
- `document` — editable rich-text canvas; document-centric only.
- `margin` — narrow gutter for document annotations; document-centric only.
- `sheet` — bottom-up panel; single-column-with-sheet only.
- `section-slot` — homepage stacked sections only.

**No `file-shelf` slot.** That was a misreading on my part of the architecture doc's example; the catalog draft never declared one. The `file-shelf@1.0` component fits in `left-rail` (universal), giving more flexibility for user-composed rooms.

### 2.3 Components

| V2 component id | Tier (Phase 1) | Scope | Slot targets | V1 source | Notes |
|---|---|---|---|---|---|
| `input@1.0` | Composer | room | `input-dock`, `msg-area`, `sheet` | [InputArea](src/components/core/InputArea.jsx) | Built-in mic button removed at PR-10b; voice published via bus. |
| `messages@1.0` | Reader | room | `msg-area`, `chat-panel` | [MessageList](src/components/core/MessageList.jsx) + [MessageCard](src/components/core/MessageCard.jsx) | Per-message action menu **composed from active components' contributions** (per 5.8 decision). |
| `toc@1.0` | Reader | room | `left-rail`, `right-rail`, `right-rail-extra`, `sheet`, `margin` | [TOC](src/components/core/TOC.jsx) | |
| `highlights@1.0` | Reader (writes own annotations) | room | `left-rail`, `right-rail`, `right-rail-extra`, `margin`, `sheet` | [HighlightList](src/components/core/HighlightList.jsx) + selection logic in MessageCard | **Contributes message action**: "Highlight selection". |
| `notes@1.0` | Reader (writes own annotations) | room | `left-rail`, `right-rail`, `right-rail-extra`, `margin`, `sheet` | Per-message note editor inside MessageCard + `notesMap` | **Contributes message action**: "Add note here". |
| `branches@1.0` | Composer | room | `left-rail`, `right-rail`, `right-rail-extra`, `margin`, `sheet` | [BranchList](src/components/core/BranchList.jsx) + BranchCreationPanel | **Contributes message action**: "Branch from here". Owns the modal per NQ-5.8 decision. |
| `context@1.0` | Reader | room | `right-rail`, `right-rail-extra`, `left-rail`, `sheet` | [ContextMeter](src/components/core/ContextMeter.jsx) | `contextThreshold` and `autoCompress` move from app settings to component config. |
| `collab-mode@1.0` | Composer | room | `right-rail`, `right-rail-extra`, `left-rail`, `input-dock`, `sheet` | [CollabModal](src/components/CollabModal.jsx) | System-prompt builder, not autonomous. Parrot Personas storage moves with it. |
| `review@1.0` | Composer | room | `right-rail`, `sheet` | [ReviewModal](src/components/ReviewModal.jsx) | Composer per the user-action-vs-autonomous rule (see [tier-classification.md](tier-classification.md)). |
| `voice-input@1.0` | Composer | room | `input-dock`, `right-rail`, `sheet`, almost any small slot | [useVoiceInput](src/hooks/useVoiceInput.js) | Browser-level mic permission. Publishes `voice-transcript` events on the hostAPI bus. |
| `file-shelf@1.0` | Composer | room | `left-rail`, `right-rail`, `right-rail-extra`, `canvas` | [FileShelf](src/adapters/pelican/components/FileShelf.jsx) + PelicanContext file-staging slice + [fileParser.js](src/lib/fileParser.js) | Owns `files` and `file_data` IndexedDB stores. Publishes `file-context-changed` events. |
| `chart-canvas@1.0` | Reader | room | `canvas`, `msg-area`, `right-rail` | [ChartCanvas](src/adapters/pelican/components/ChartCanvas.jsx) | Independent component (per §2.4). Reads file context via bus. |
| `table-canvas@1.0` | Reader | room | `canvas`, `msg-area` | [TableCanvas](src/adapters/pelican/components/TableCanvas.jsx) | Independent. |
| `summary-dashboard@1.0` | Reader | room | `canvas`, `msg-area`, `right-rail` | [SummaryDashboard](src/adapters/pelican/components/SummaryDashboard.jsx) | Independent. |
| `column-inspector@1.0` | Reader | room | `chat-panel`, `right-rail`, `right-rail-extra` | The schema/column part of [InspectorPanel](src/adapters/pelican/components/InspectorPanel.jsx) | Reuses `messages@1.0` + `input@1.0` for the chat half (per §5.7). |

**Secretarybird decomposition** (PR-11b):

- `document-canvas@1.0` (Composer) — editable document, tracked changes, slash menu. Owns `sbrd_documents` IndexedDB store.
- `claude-comments@1.0` (Composer) — comment sidebar and lifecycle. Generates Claude replies on user click.
- `ripple-analysis@1.0` (Composer) — cross-paragraph analysis, runs on user-initiated Submit.

### 2.4 Three separate canvas components (decision)

Per Parliament's manifesto of giving users choice, the Pelican center decomposes into **three independent components** rather than one bundled canvas:

- `chart-canvas@1.0`, `table-canvas@1.0`, `summary-dashboard@1.0` are each Reader-tier with independent config.
- The `canvas` slot has `stack` capacity — multiple components in declared order.
- The V1 toolbar (Chart | Table | Summary tabs) **disappears** — users compose what they want by adding/removing components.
- Empty state when no `file-shelf@1.0` is present in the room: shared template "Add a File shelf component to provide data" (NQ-7).

### 2.5 Tier classification rule

**Components that make model calls in direct response to a user action are Composer (or below) and don't require consent. Components that make autonomous model calls are Agent and require consent (Phase 2).**

Phase 1 application:

| Component | Trigger | Phase 1 tier |
|---|---|---|
| `input@1.0` (send message) | user clicks Send | Composer |
| `review@1.0` (synthesis) | user clicks Generate | Composer |
| `branches@1.0` (compressed summary) | user clicks Compress | Composer |
| Auto title/summary/tags | tied to user's send action | Composer (per NQ-5) |
| `voice-input@1.0` | user clicks mic | Composer (browser handles mic permission) |
| `summarizer@1.0` (Phase 2) | pipeline data arrives | Agent — needs Phase 2 consent flow |

Full guidance and edge cases in [tier-classification.md](tier-classification.md).

### 2.6 Schemes

Six schemes per `build-ui-decisions.md` §5:

- `parliament@1.0` — current Parliament Default.
- `cool-bright@1.0`, `deep-calm@1.0`, `soft-violet@1.0`, `fresh-teal@1.0`, `amber-glow@1.0` — new for V2.

**Each scheme requires four accessibility variants** per architecture §6g: light, dark, high-contrast light, high-contrast dark. The current `parliament@1.0` ships only light + dark today — high-contrast variants are new design work.

**New token groups required for Phase 1:**

- **Blueprint tokens**: `--bp-floor, --bp-wall, --bp-hatch, --bp-line, --bp-label, --bp-soft, --bp-grid` (per [parliament_homepage_v2.html](refactor/parliament_homepage_v2 (2).html) lines 25-32). Required for the new homepage's blueprint section.
- **Data-series tokens**: `--token-data-series-1` through `--token-data-series-5`. Required for `chart-canvas@1.0` to use scheme-aware colors. V1's `SERIES_COLORS` array in [PelicanContext](src/stores/PelicanContext.jsx) becomes scheme tokens.

Total Phase-1 scheme effort: 6 schemes × 4 variants × full token set including the two new groups. Real design lift, not just code (see PR-4a / PR-4b in `phase-1-pr-plan.md`).

### 2.7 Homepage components (new)

Per `parliament_component_catalog_v0_1.md` §6 and `parliament_v2_design_decisions.md` §5:

- `blueprint@1.0` (essential) — floor-plan view of rooms. Subscribes to `row-hover` events.
- `chats@1.0` (essential) — V6 selector refactored. Largest config schema in the catalog. Publishes `row-hover`.
- `library@1.0` (essential) — browseable catalog with **5 visible categories** (Rooms, Layouts, Components, Schemes, Resources). Sections is **hidden in V2** per NQ-8.
- `favorites@1.0` (optional) — saved messages grid.
- `quick-stats@1.0`, `recent-activity@1.0`, `scratchpad@1.0` (optional).

**Resources tab** ships visible with **6 placeholder coming-soon cards** drawn from `parliament_v2_resources_spec.md` §4, biased toward creation help (per §8 decision):

| Title | Format | Targets |
|---|---|---|
| Your first room: a walkthrough | Guide | rooms |
| Editing a built room | Guide | rooms, layouts, components |
| Component catalog | Reference | components, layouts |
| Help me add a feature | Prompt recipe | components |
| Design a scheme to match my brand | Prompt recipe | schemes |
| The Newsroom | Example project | rooms |

Each renders as a card with a "Coming soon" tag and target pills; click → read-only preview. Future Resources work replaces placeholders with real content.

### 2.8 What does NOT become a catalog component in Phase 1

- **Settings** — shell-level. Architecture §3: "Settings cannot be a feature because rooms depend on it."
- **API key entry / ignition** — shell-level. The wizard's step 6 ignition moment uses [useShimmer](src/hooks/useShimmer.js).
- **Network Activity card** — stays in Settings → About. Transparency feature; doesn't make sense as a placeable component.
- **Onboarding tours** — shell-level. Tour state persists per route via `tourCompleted_*` settings.
- **PWA install / SW update banners** — shell-level via PWAContext.
- **CollabModal's Parrot Personas storage** — moves *with* `collab-mode@1.0`, not a separate component.

### 2.8a Component data plumbing (the self-bind rule)

The catalog manifest table in §2.3 says what each component wraps but
not how the wrapper accesses live conversation data. The rule, recorded
here so it doesn't keep slipping into "implementation detail" status:

**Components that need active-conversation state self-bind via existing
React contexts.** They call `useChat()`, `useConversations()`,
`useSettings()` directly inside their render function. RoomShell does
NOT plumb conversation data through props or hostAPI events.

Why:
- App.jsx mounts ConversationProvider / ChatProvider / SettingsProvider
  around every route. Any RoomShell descendant is already inside those
  providers and can subscribe.
- Re-renders stay scoped per CLAUDE.md's state-management guidance — a
  component that only reads `messages` doesn't re-render when streaming
  state flips, etc.
- The hostAPI bus stays small. Three Phase 1 events (`voice-transcript`,
  `row-hover`, `file-context-changed`) are enough; we don't need a
  `messages-changed` event to mirror state every component already
  reaches via `useChat()`.

What this means in practice for each component:

| Component | What it self-binds to | Wired in |
|---|---|---|
| `messages@1.0` | `useChat()` for messages + streaming, `useAnnotations()` for stars/notes/highlights, `useBranchPanel()` for branch dispatch, `useCollabMode()` for ghost-continue system prompt, `useConversations()` for the Send-to-branch / Pin-for-reference target picker. Owns hide / delete (20s undo) / send-to-branch / pin-for-reference flows. Renders pinned references at the top of msg-area as collapsible quote blocks. Owns the per-message action menu surface; reads contributed actions off `hostAPI.getMessageActions()` (UI surfacing of contributions still deferred). | PR-10a.5 + PR-10a.6 + PR-10a.7 + PR-10a.9 + PR-10a.10 |
| `input@1.0` | `useChat().sendMessage` / `stopGenerating` / `isStreaming`, `useSettings().defaultModel`, `loadApiKey()`. Subscribes to `voice-transcript` events on the bus when `subscribeToVoice` config is on. | PR-10a.5 |
| `context@1.0` | `useChat().tokenUsage`, `useChat().messages.length`, `useSettings().defaultModel` + provider model lookup for the window size. Threshold + display mode read from per-component config (audit §3.6). | PR-10a.6 |
| `highlights@1.0` | `useAnnotations().highlights` (raw records) aggregated by term into HighlightList shape. `addHighlightFromSidebar`, `deleteHighlights`, `navigateHighlight` mutators dispatched on the side-rail surface. | PR-10a.6 |
| `notes@1.0` | `useAnnotations().notes` + `useChat().messages`. Side-rail summary list of all conversation notes; click a note to open its inline panel on the source message and scroll to it. The inline note panel itself lives on `messages@1.0`'s MessageCard. | PR-10a.6 |
| `branches@1.0` | `useChat().messages` + `tokenUsage` for the panel's projected-context meter, `useConversations()` for the side-rail branch list, `useSettings()` for the auto-compress threshold + active model context window, `useBranchPanel()` for the shared open/close dispatch. Owns the `BranchCreationPanel` modal. Per-message GitBranch icon (rendered by `messages@1.0`) and the app-wide Cmd/Ctrl+Shift+B keyboard shortcut both dispatch into `openBranchPanel(messageId)`. | PR-10a.7 |
| `favorites@1.0` | Cross-cutting homepage component (already wired pre-PR-10a.6 via `favorites-preview.jsx`). The chat-rail per-message Star icon dispatches through `useAnnotations().toggleFavorite`. | PR-10a.6 (toggle) |
| `collab-mode@1.0` | `getSetting('parrot-personas')` (preserved in CollabModal), scoped active-presets state via new `CollabModeContext`. `useCollabMode().buildSystemPrompt()` is consumed by `input@1.0` (sendMessage) and `messages@1.0` ghost-continue (continueMessage). State resets on a transition between two distinct non-null `activeConversationId`s — matches V1 Albatross's per-mount lifetime; transient nulls during route nav back to the same conversation are ignored. | PR-10a.9 |
| `review@1.0` | `useChat().messages` + `tokenUsage`, `useAnnotations().highlights` / `notes` / `favorites` (Map → array conversion for V1 ReviewModal contract), `useConversations()` for branches off the active conversation, `useSettings()` for storage mode + active-model context window. Owns the synthesis call (Composer-tier Haiku call against the last 20 messages with optional annotation context — same recipe as V1 Albatross) and the Markdown export (lifted from V1's handleExportMarkdown). | PR-10a.9 |
| `voice-input@1.0` | `useVoiceInput()` hook. Publishes `voice-transcript` events on the room hostAPI bus on every interim + final transcript; `input@1.0`'s subscription appends finalized text to its value. Production render is a tight mic-only button (separate from the verbose `/catalog` preview card). PR-10b removed InputArea's built-in cardLayout mic — `voice-input@1.0` is the only voice surface. | PR-10a.8 (PR-10b removes InputArea fallback) |
| `toc@1.0` | `useChat().messages` for the table-of-contents derivation. User-role messages only (matches V1 Albatross), labels truncated to `truncateAt` chars (default 60), most-recent `maxItems` retained (default 50). Click → `scrollIntoView` on `msg-{id}` (set by MessageCard). | PR-10a.8 |

**Conversation activation is the route shell's job.** When `/chat/:id`
loads a conversation, the route calls `useChat().loadMessages(id)` and
sets the API key. After that, every component reading `useChat()` sees
the right messages without RoomShell knowing anything about the
conversation. This activation lives in the same view that resolves the
mode (currently `ChatView.jsx`) — not in RoomShell or in any catalog
component.

**Why the existing catalog renders are preview-shaped.** PR-2 / PR-3 /
PR-5 wired the manifests and the `/catalog` debug surface, but their
render functions take props the surface passes from sample data — the
shims work for the debug route but show empty state under RoomShell on
production routes. The wiring lands in slices ahead of PR-10b's adapter
deletion:

- **PR-10a.5** — `messages@1.0`, `input@1.0`, conversation activation in ChatView.
- **PR-10a.6** — `context@1.0`, `highlights@1.0`, `notes@1.0`, plus per-message Star/StickyNote/highlight handlers wired through a new `AnnotationsContext` shared with the side-rail components.
- **PR-10a.7** — `branches@1.0` live BranchList, the `BranchCreationPanel` modal owned by branches@1.0, the per-message GitBranch icon → openBranchPanel dispatch, the Compress Context action, and the app-wide Cmd/Ctrl+Shift+B keyboard shortcut. New `BranchPanelContext` shares modal open-state across `messages@1.0` (icon trigger), `branches@1.0` (Compress Context + modal host), and the global shortcut handler.
- **PR-10a.8** — `voice-input@1.0` production render (tight mic button publishing `voice-transcript` on the room bus, complete loop with `input@1.0`'s existing subscription) and `toc@1.0` production render (user-message-derived headings list with click-to-scroll). Both light, no new shared contexts.
- **PR-10a.9** — `collab-mode@1.0` live trigger + active-count badge; new `CollabModeContext` shares the active system prompt with `input@1.0` (sendMessage) and `messages@1.0` ghost-continue. `review@1.0` live trigger + Composer-tier synthesis call wired to `useChat()` + `useAnnotations()` + provider; Markdown export lifted from V1.
- **PR-10a.10** — per-message message actions wired in `messages@1.0`: Hide (session-only), Delete (with 20s undo banner + IndexedDB delete), Send to branch (target-picker modal → copies into target's messages), Pin for reference (target-picker modal → writes to existing `pins` store; renders as collapsible quote-block list at the top of the active conversation's msg-area). New extracted `SelectConversationModal` shared by both transfer flows. After this lands, the V2 chat surface has parity with V1 for every per-message affordance plus the new V2 Pin flow.
- **PR-10b** — adapter directories deleted (`albatross/`, `kingfisher/`, `starling/`, plus `withComingSoon.jsx`). `/chats` and `/settings` rendered the V1 selector + settings layouts via the bird-mode adapter pattern; PR-10b extracts those layouts out to `src/views/SelectorLayout.jsx` and inlines settings into `src/views/SettingsView.jsx`, dropping the InteractionMode picker (modes don't drive routing anymore). `ChatView.jsx` no longer falls back to Albatross — a null-room conversation is repaired on the spot via `assignDefaultRoom()` (a fresh Writing Studio mode), with a diagnostic stub if even the repair fails. Boot-time migrations gain two passes: `migrateRepairNullRooms` (assigns Writing Studio to anything PR-10a left at null) and `migrateInjectVoiceInput` (per data-migration.md §"Voice-input migration"). InputArea's cardLayout-only mic button is removed in favor of `voice-input@1.0`. The PWA cache name rotates from `parliament-adapters-v1` to `parliament-modules-v2`; the chunk pattern matches `catalog-/component-/module-` and the legacy adapter cache is wiped from `main.jsx` on first V2 boot.

**A new context for shared annotation state.** PR-10a.6 introduces
`AnnotationsContext` (mounted between `ChatProvider` and
`BrowserRouter` in App.jsx). It owns per-conversation favorites /
notes / highlights state, watching `useChat().activeConversationId`
to (re)load on conversation change. Both the per-message handlers in
`messages@1.0` and the side-rail lists in `highlights@1.0` /
`notes@1.0` consume the same in-memory copy, so a write through one
surface (e.g. clicking a Star in messages) updates the other (e.g.
the favorites count in the side-rail) without bus events or polling.
This is a deliberate exception to the "self-bind to existing
contexts" wording above — the new context IS now an existing context.
The bus stays capped at the three Phase 1 events per NQ-4.

**A second shared context for the branch panel.** PR-10a.7 follows
the same precedent with `BranchPanelContext` — pure UI dispatch
(open / close + `openForMessageId`). Three surfaces dispatch into it:
the per-message GitBranch icon on `messages@1.0`, the Compress Context
button inside `branches@1.0`'s side rail, and the app-wide
Cmd/Ctrl+Shift+B keyboard shortcut handler mounted at App.jsx. Only
`branches@1.0` mounts the modal, so the panel only renders when the
active room actually includes a branches surface — but the dispatch
itself is global, which keeps the keyboard shortcut behaving the same
across rooms. Lazy preview generation lives in the modal's local
state, NOT in the context, so closing the panel always clears the
preview cache.

**A third shared context for collab-mode state.** PR-10a.9 adds
`CollabModeContext` for the system-prompt builder. `collab-mode@1.0`'s
modal writes the active preset set + custom-instruction text via
`apply()`; `input@1.0`'s send and `messages@1.0`'s ghost-continue both
read `buildSystemPrompt()` and thread the result into `sendMessage` /
`continueMessage`'s existing `systemPrompt` argument. State resets when
`activeConversationId` transitions between two distinct non-null ids —
matches V1 Albatross's per-mount lifetime. Transient nulls (e.g.
ChatView's `clearMessages()` during route nav back to the SAME
conversation) are ignored, so the active preset survives a quick trip
to the homepage and back. Per-conversation persistence across browser
reloads is a Phase 2 concern (probably belongs on the room's permission
grants or a per-conversation settings record); Phase 1 keeps the
session-scoped V1 lifetime.

### 2.9 Things that don't fit cleanly

- **`pins` IndexedDB store** — used by branch-transfer "Pin for reference" flow. Stays as backing data for `branches@1.0`. Not a Persister-tier concern (Persister is reserved for cross-mode shared stores per architecture §5g).
- **`createdInMode` field on conversations** — used in PR-10a for one-time migration to `room` field. Not stripped on read/write afterward (kept in records for at least one release for debugging) but no longer consulted anywhere.
- **`ModeSuggestion` and `modeSuggestions.js`** — removed entirely in PR-12. No V2 equivalent.
- **`tourCompleted_*` settings** — user data, not room data. Stays in `settings` IndexedDB store and migrates as-is.
- **Pelican's session-only parsed-data cache** — component-internal state, not a catalog concern.

---

## 3. Migration risks

### 3.1 — Mode file format scaffolding and IndexedDB v4

Per [data-migration.md](data-migration.md):

- Bump `DB_VERSION` to 4.
- **6 new stores** in PR-1: `modes, libraryLayouts, libraryRooms, libraryComponents, librarySchemes, libraryResources`.
- `libraryLayouts`, `libraryRooms`, and `libraryResources` carry a `status: 'available' | 'beta' | 'coming-soon'` field (per NQ-1, extends V1's existing beta tag for Pelican/Secretarybird).
- Add `room` field to existing `conversations` records at v4 migration, default `null`. Filled in by PR-10a's one-time migration step.
- Phase 2's `permissionGrants` store is NOT pre-reserved (added later as DB v5).

### 3.2 — Bird-mode adapter pattern is load-bearing in routing

`SelectorView`, `ChatView`, `SettingsView` all delegated to `LAYOUTS[mode] ?? AlbatrossLayout`. Migration plan:

- Each conversation gets a `room` field pointing at a mode file in the user's `modes` table.
- `/chat/:id` reads `conversation.room`, loads the mode, renders `<RoomShell>`.
- `localStorage[parliament-mode]` retired entirely after PR-10a's one-time migration.

**Resolved in PR-10b.** `ChatView` now renders `<RoomShell>` exclusively — null-room conversations are repaired in place via `assignDefaultRoom()` (which assigns a fresh Writing Studio room) with a diagnostic stub if the repair itself fails. `SelectorView` and `SettingsView` no longer pick adapters: they render the V1 selector layout (extracted to `src/views/SelectorLayout.jsx`) and the V1 settings layout (inlined into `src/views/SettingsView.jsx`) directly. Boot-time migrations (`migrateRepairNullRooms`, `migrateInjectVoiceInput`) run alongside PR-10a's pass to keep existing data routable. Per [data-migration.md](data-migration.md), the `createdInMode` → template migration map covers all V1 mode names including the K/S stubs (which fall to `writing-studio`).

### 3.3 — ChatContext tool loop is provider-aware in subtle ways

[ChatContext.sendMessage](src/stores/ChatContext.jsx:117-299) inlines knowledge of `tool_use` content blocks, `create_chart`'s "embed-as-fenced-block" treatment, and `MAX_TOOL_TURNS = 5`. **Phase 1 leaves it as-is.** The `create_chart` flow continues working through PR-12. Phase 2's `visualization@1.0` is a parallel concept (pipeline-driven), not a replacement.

### 3.4 — Secretarybird stores content in `sbrd_documents`, not `messages`

Two consequences:

- The integrity check in [runIntegrityCheck](src/lib/db.js:537-554) has a special case ("don't delete Secretarybird conversations without messages if they have a sbrd_document"). Survives Phase 1.
- **Backup validator gap:** [validate.js](src/lib/validate.js) does not validate `sbrd_documents`. PR-7 adds validators for all stores including `sbrd_documents` and the new V2 ones.

### 3.5 — Branch creation multi-store atomicity (low impact, defer fix)

[createBranch](src/lib/db.js:164-228) does six writes across multiple separate transactions. Worst case (orphaned branch with zero messages) is already handled by the integrity check on next load. Remaining cases are cosmetic (stale `storageBytes`).

**Phase 1: don't fix.** Flagged as known debt. The `branches@1.0` catalog component preserves V1 behavior verbatim. If reports surface post-launch, wrap steps 3-6 in a single multi-store IDB transaction as a small follow-up PR.

### 3.6 — Settings → component config precedence

Several V1 settings move from app-level to component-level:

| V1 setting | V2 home |
|---|---|
| `contextThreshold` | `context@1.0` config |
| `autoCompress` | `context@1.0` config |
| `summaryDepth` | `review@1.0` config |
| `defaultModel` | stays app-level (Phase 2 adds per-component override via `model-picker`) |

**Precedence rule:** the V1 app setting becomes the default for new component instances. Migrated rooms get the V1 setting baked into component config at PR-10a. Subsequent app-setting changes don't retroactively affect existing rooms — the app setting is "factory default for new rooms" only. Per-room editing in the editor wins.

### 3.7 — Schemes need new token groups for accessibility variants

Per §2.6 — 6 schemes × 4 variants × full token set including the new blueprint and data-series groups. Substantial design lift. Split across PR-4a (gold + Parliament Default's variants) and PR-4b (5 additional schemes) in [phase-1-pr-plan.md](phase-1-pr-plan.md).

### 3.8 — Pelican files not in V1 backup format

Pre-existing gap. PR-7 fixes it: V2 backup includes `files` and `file_data`. Validators added.

### 3.9 — Encryption key DB is separate by design

[clearAllData](src/lib/db.js:601-609) intentionally does not clear `parliament-keystore`. V2 preserves this isolation. The new V2 stores all join `parliament` (the data DB), not `parliament-keystore`.

### 3.10 — Model info source-of-truth duplication and multi-provider readiness

Models listed in both [providers/anthropic.js](src/providers/anthropic.js) and [tokens.js](src/lib/tokens.js) with inconsistent units. PR-12 consolidates to provider with **shape-flexibility for non-Anthropic providers** — `cost` field can be `null` or `{ type: 'free-local' }` for future Ollama. Architectural decisions like per-provider auth model (`validateConnection()` for keyless local providers) and CSP relaxation for `http://localhost:*` are firmly Phase 2+.

### 3.11 — Onboarding tour selectors break when adapter elements move

V1 tours target `data-tour="settings-api"`, `data-tour="chat-input"`, etc. — Albatross-specific. **Phase 1 does the minimum:** keep `tourCompleted_*` settings, attach existing selectors to roughly equivalent new shell elements, accept that some tours need full rewrites. Returning users with `tourCompleted_*` set don't see re-tours. Full tour rewrites become a follow-up scope statement.

### 3.12 — Mockups directory archived, not deleted

Per NQ-10, `mockups/*.jsx` moved to `refactor/v1-mockups-archive/` in PR-12 rather than deleted. Preserves the visual record for future fidelity validation.

### 3.13 — Voice input infrastructure depends on the hostAPI event bus

`voice-input@1.0` publishes transcripts via the bus; `input@1.0` subscribes. Same bus serves homepage cross-section interactions. **PR-3 ships the bus as part of `<RoomShell>`** — without it both features are inert.

### 3.14 — Mobile users lose voice unless mobile-default seeds with `voice-input@1.0`

InputArea's built-in mic button was removed at PR-10b. The Pocket Chat seed (PR-10a.8 onward) includes `voice-input@1.0` in `input-dock`, so new mobile rooms get a mic automatically. Pre-PR-10a.8 swift-migrated rooms predate that seed update; PR-10b's `migrateInjectVoiceInput` (lib/migration.js) sweeps any room with `layout.ref` starting `single-column-with-sheet` AND `buildIntent.derivedFrom === 'swift-migration'` and injects `voice-input@1.0` into `input-dock` if it isn't already present. Per-room and whole-pass idempotent so users who edited their room or already had the up-to-date seed are unaffected.

### 3.15 — Tier classification rule must be documented

Without writing down the user-action-vs-autonomous rule in a durable doc, future contributors will look at "Review calls model" and "fix" it to Agent tier, regressing Phase 1 UX. **PR-2 ships [tier-classification.md](tier-classification.md)** as the durable record.

### 3.16 — Universal slots must mean the same thing across layouts

Architecture §3 requires this. PR-1 enforces via a shared `UNIVERSAL_SLOTS` constant that layout entries reference rather than redeclare. Otherwise different layouts could subtly diverge (one's `left-rail` has `stack` capacity, another's `single`) and component slot-target declarations wouldn't fit predictably.

### 3.17 — Canvas components need empty states when `file-shelf@1.0` is missing

Per §2.4 and NQ-7. Each of `chart-canvas, table-canvas, summary-dashboard` renders a shared empty-state template ("Add a File shelf component to this room to provide data") when no file-shelf is present. Component-level health-check pattern; PR-2 catalog manifest includes an optional `softDependencies: [{ component, fallbackUI }]` field.

### 3.18 — `createdInMode` migration is one-shot and irreversible

PR-10a's migration assigns `room` based on `createdInMode`. After that, `createdInMode` is meaningless. Phase 1 keeps the field in records for at least one release for debugging — strip in a later cleanup PR.

### 3.19 — PWA cache invalidation on V2 cutover

`vite.config.js` declares `cacheName: 'parliament-adapters-v1'` with per-adapter chunk patterns. After PR-10b/PR-11b there are no adapter chunks. **PR-10b rotates the cache name to `parliament-modules-v2`** and adds one-time cleanup that wipes the old cache on first V2 boot. Cleanup runs from page context (`src/main.jsx`) rather than the SW activate event because vite-plugin-pwa's `generateSW` strategy doesn't expose a hook for custom listeners; `caches.delete` is callable from the window and idempotent, which is functionally equivalent. PR-12 can drop the cleanup snippet once all live users have rotated past V2 boot.

### 3.20 — Multi-provider CSP coupling (out of Phase 1, flag for later)

CSP currently allows `connect-src 'self' https://api.anthropic.com`. Adding Ollama (Phase 2+) requires CSP relaxation for `http://localhost:*` and updates to `netlify.toml`. Worth flagging the coupling so it doesn't surprise.

---

## 4. Phase 1 execution order (summary)

**Canonical source: [phase-1-pr-plan.md](phase-1-pr-plan.md).**

15 PRs in three waves, plus a docs-only **PR-0** that ships this audit + the four companion docs *before* code begins.

**PR-0 — Documentation foundation** (this audit + tier-classification + phase-1-pr-plan + glossary + data-migration).

**Wave A — Foundation (no user-visible change):**
- PR-1 — Mode file format + IndexedDB v4 (6 new tables).
- PR-2 — Catalog scaffolding + first 3 entries + tier rule documentation.
- PR-3 — Mode reducer + `<RoomShell>` + hostAPI event bus.

**Wave B — Visual system + new homepage:**
- PR-4a — Gold palette audit + copy conventions + Parliament Default a11y variants.
- PR-4b — 5 additional schemes × 4 variants + blueprint and data-series token groups.
- PR-5 — Remaining shell-side catalog primitives (highlights, notes, branches, context, collab-mode, review, voice-input).
- PR-6 — Homepage components + new homepage at `/`.
- PR-7 — Backup & restore in V2 format (`.parliament` extension, 210k PBKDF2, all V2 stores).

**Wave C — Builder paths and chat-shell migration:**
- PR-8 — Three-rail editor (rooms + homepage editing).
- PR-9 — Wizard + template gallery + ignition (5 available templates + 2 coming-soon).
- PR-10a — Wire `/chat/:id` through `<RoomShell>` + `createdInMode → room` migration. Albatross still exists as fallback.
- PR-10a.5 — Wire chat-essential catalog components (messages, input) to ChatContext + activate conversation in ChatView. First slice of the catalog-data plumbing work flagged by §2.8a.
- PR-10a.6 — Wire annotations (favorites toggle, notes panel + side-rail list, highlights with selection popover) + context meter via a new shared AnnotationsContext.
- PR-10a.7 — Wire `branches@1.0` (live side-rail list + Compress Context action) + the BranchCreationPanel modal owned by branches@1.0; per-message GitBranch icon and app-wide Cmd/Ctrl+Shift+B both dispatch through a new shared `BranchPanelContext`.
- PR-10a.8 — Wire `voice-input@1.0` (production tight mic button + bus publish) and `toc@1.0` (user-message headings + scroll).
- PR-10a.9 — Wire `collab-mode@1.0` system-prompt builder via a new shared `CollabModeContext` consumed by `input@1.0` + `messages@1.0` ghost-continue, plus `review@1.0` live render with synthesis call + Markdown export.
- PR-10a.10 — Wire per-message Hide / Delete (20s undo) / Send to branch / Pin for reference. New `SelectConversationModal` extracted from V1's MoveToBranchModal serves both transfer flows. Pinned references render as a collapsible quote-block list at the top of the active conversation's msg-area.
- PR-10b — Delete adapter directories (Albatross, Kingfisher, Starling) + remove InputArea built-in mic + rotate PWA cache + inject `voice-input@1.0` for migrated mobile users.
- PR-11a — Decompose Pelican into 6 catalog components.
- PR-11b — Decompose Secretarybird into 3 catalog components.
- PR-12 — Cleanup (delete `withComingSoon`, `modeSuggestions`, `ModeSuggestion`; consolidate `tokens.js` to provider; archive mockups; update README/SECURITY/etc.).

**Pause points:** after PR-3 (architecture review), PR-7 (data review), PR-9 (UX review), PR-10a (migration validation — must pass before PR-10b lands).

---

## 5. Resolved decisions and remaining open questions

### 5.1 Decisions captured during the section-by-section review

| # | Topic | Decision |
|---|---|---|
| Section 2 #1 | File-shelf naming | No `file-shelf` slot. Component fits in universal `left-rail`. |
| Section 2 #2 | Layout differences and coming-soon | Six layouts ship: 5 available, 2 coming-soon. Both K/S layouts seeded as library entries. |
| Section 2 #4 | Pelican center decomposition | Three independent components (chart, table, summary) per Parliament manifesto. |
| Section 2 #5 | Tier classification | User-action → Composer (no consent); autonomous → Agent (Phase 2 consent). |
| Section 2 #8 | Resources scope | Visible tab with 6 coming-soon placeholder cards drawn from `parliament_v2_resources_spec.md` §4. |
| Section 2 #9 | Voice input | Separate `voice-input@1.0` catalog component publishing on hostAPI bus. |
| Section 3.1 | IndexedDB v4 | 6 new stores including `libraryResources` with status field. |
| Section 3.5 | Branch atomicity | Defer fix; integrity check covers worst case. |
| Section 3.10 | Multi-provider | Provider abstraction stays generic; Ollama-specific work is Phase 2+. |
| Section 3.11 | Tour rewrites | Bare-minimum selector reattachment; full rewrites later. |
| 5.1 | Scheme list | Six schemes per `build-ui-decisions.md`. |
| 5.2 | Settings hierarchy | Per-component wins; app setting = factory default for new rooms. |
| 5.4 | Mobile layout | `single-column-with-sheet@1.0` is its own layout. |
| 5.5 | `parliament-mode` localStorage | One-time migration to `room` field, then drop. |
| 5.6 | Mode suggestions | Remove entirely. |
| 5.7 | Inspector composition | Three components: `column-inspector@1.0` + reused `messages` + reused `input`. |
| 5.8 | BranchCreationPanel | Owned by `branches@1.0` component (modal contributed via message-action contribution pattern). |
| 5.9 | Pins and Persister | Pins ride through Phase 1 untouched; not Persister tier. |
| 5.10 | `single-column-with-sheet` | Distinct layout, not folded into `single-column`. |
| 5.11 | Onboarding tours | Keep state, attach selectors, defer rewrites. |
| 5.12 | Service worker cache | Rotate cache name in PR-10b. |
| NQ-1 | Status field shape | `status: 'available' \| 'beta' \| 'coming-soon'` (extends V1's beta usage). |
| NQ-2 | Coming-soon click behavior | Read-only preview. |
| NQ-3 | Coming-soon room template names | Mix: bird name + descriptive subtitle (e.g., "Kingfisher (deep reading)"). |
| NQ-4 | hostAPI bus surface (Phase 1) | Three events: `voice-transcript, row-hover, file-context-changed`. Plus message-action contribution pattern. |
| NQ-5 | Auto-title/summary/tags tier | Composer (rides on user send action). |
| NQ-6 | Voice without input subscriber | Voice component renders empty state ("Add an input component"). |
| NQ-7 | Canvas empty state | Shared template across all three canvas components. |
| NQ-8 | Sections library category | Hidden in Phase 1 (vague concept; show when there's something concrete). |
| NQ-9 | Default scheme per template | Parliament Default for all five available templates (changing scheme without notice would confuse users). |
| NQ-10 | V1 mockups | Archive to `refactor/v1-mockups-archive/`, don't delete. |
| NQ-11 | PR-0 docs | Five docs: this audit + tier-classification + phase-1-pr-plan + glossary + data-migration. |

### 5.2 Open questions deferred to Phase 2+

These are flagged for future scope statements, not Phase 1 work:

- **Cross-component event bus expansion**: `onModeEnter/Exit`, `theme-changed`, `presence-state-changed`, `input-received/output-ready`, `permission-granted/revoked`. Land alongside the features that need them.
- **Per-component model override**: full `model-picker` field type per `model-picker-field-type-spec.md`. Phase 2.
- **Consent flow UI**: per `consent-flow-ui-spec.md`. Blocks all Agent-tier components (Phase 2).
- **Pipeline bus**: per architecture §5. Foundation for Summarizer, Visualization, Merge. Phase 2.
- **Ollama and other providers**: validateConnection auth model, CSP relaxation, free-local cost shape. Phase 2+.
- **Resource content production**: 19 launch resources per `parliament_v2_resources_spec.md` §4 replacing the placeholder cards. Separate scope statement.
- **Onboarding tour rewrites**: alongside Resources content work.

---

## Appendix A: V1 source size summary

```
2928  secretarybird/ChatLayout.jsx     ← largest single file, riskiest decomposition
2180  albatross/ChatLayout.jsx
1573  albatross/SelectorLayout.jsx
1234  swift/SettingsLayout.jsx
1115  albatross/SettingsLayout.jsx
 948  swift/ChatLayout.jsx
 609  lib/db.js
 537  swift/SelectorLayout.jsx
 493  pelican/components/InspectorPanel.jsx
 471  components/CollabModal.jsx
 439  stores/ChatContext.jsx
 410  components/core/InputArea.jsx
 392  components/core/MessageCard.jsx
 382  pelican/components/SummaryDashboard.jsx
 374  components/ReviewModal.jsx
 367  pelican/components/FileShelf.jsx
 282  lib/fileParser.js
 246  components/core/ChartRenderer.jsx
 242  components/TourTooltip.jsx
 231  pelican/components/ChartCanvas.jsx
 229  stores/PelicanContext.jsx
 225  lib/crypto.js
 224  lib/mathEval.js
 219  lib/validate.js
 205  pelican/components/TableCanvas.jsx
 158  components/core/HighlightList.jsx
 149  stores/PWAContext.jsx
 139  stores/ModeContext.jsx
 136  components/ErrorBoundary.jsx
 126  components/core/ContextMeter.jsx
 109  lib/fileUpload.js
 108  components/core/CitedMarkdown.jsx
 107  components/core/CitationLink.jsx
  97  lib/networkLog.js
  95  stores/SettingsContext.jsx
  93  pelican/components/EmptyCanvas.jsx
  86  pelican/ChatLayout.jsx
  86  stores/ConversationContext.jsx
  83  components/NetworkActivityCard.jsx
  73  adapters/withComingSoon.jsx
  70  components/core/MessageList.jsx
  69  components/core/BranchList.jsx
  66  components/core/ModeSuggestion.jsx
  66  lib/modeSuggestions.js
  60  components/RadioGroup.jsx
  59  components/Input.jsx
  56  components/Modal.jsx
  53  components/core/ToolToggles.jsx
  53  lib/tokens.js
  49  components/Button.jsx
  44  components/IconButton.jsx
  41  components/core/TOC.jsx
  38  lib/textUtils.js
  34  components/Card.jsx
  30  components/SegmentedControl.jsx
  30  lib/constants.js
  29  components/Toggle.jsx
  21  components/core/NoteList.jsx
   7  components/SectionLabel.jsx
```

Total V1 surface that Phase 1 touches: ≈ 22,000 lines, of which ≈ 7,800 (the four real-distinct adapters) are decomposed into catalog components by the end. The remainder is moved/wrapped into catalog components or stays as shell infrastructure.
