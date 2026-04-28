# Parliament V1 → V2 Glossary

**Status:** Active reference for the Phase 1 refactor.
**Audience:** Anyone reading Phase 1 specs, PRs, or commits and trying to map terms between the V1 codebase and the V2 architecture.
**Companion docs:** [v2-phase1-audit.md](v2-phase1-audit.md), [tier-classification.md](tier-classification.md), [phase-1-pr-plan.md](phase-1-pr-plan.md), [data-migration.md](data-migration.md).

This is a working glossary, not a complete dictionary. It records the V1↔V2 vocabulary mapping that came up during the section-by-section audit review, the terms that were ambiguous and got resolved, and the user-facing vs. technical distinctions that matter for Phase 1.

---

## V1 → V2 vocabulary mapping

| V1 term | V2 term | Notes |
|---|---|---|
| Mode | **Room** | "Room" is user-facing in V2. "Mode" is reserved for the file format and internal architecture only — `parliament-mode/1.0` schema, the `modes` IndexedDB store. Users say "room"; code says "mode" only inside the file/storage layer. |
| Bird-mode adapter | (gone) | The adapter pattern is retired entirely. No `src/adapters/`. Functionality moves to catalog components. |
| Albatross | **Three-panel layout** + the V2 Writing Studio template + decomposed catalog components | "Albatross" no longer exists as a code path. The desktop layout it expressed is `three-panel@1.0`. The functionality lives in the catalog. |
| Pelican | **Canvas-centric layout** + Data Workspace template + 6 catalog components (`file-shelf, chart-canvas, table-canvas, summary-dashboard, column-inspector` + reused `messages, input`) | Same rule. Pelican-the-mode survives as a room template. Pelican-the-adapter-directory goes away. |
| Secretarybird | **Document-centric layout** + Drafting Desk template + 3 catalog components (`document-canvas, claude-comments, ripple-analysis`) | Same. |
| Swift | **Single-column-with-sheet layout** + Pocket Chat template + reused catalog components | Same. |
| Kingfisher | **Coming-soon room template "Kingfisher (deep reading)"** + coming-soon `reading-pane@1.0` layout | Stays in the library as coming-soon, both as a room template and a layout. |
| Starling | **Coming-soon room template "Starling (collaboration)"** + coming-soon `split-view@1.0` layout | Same. |
| Selector | **Homepage** (the new V2 surface) | The V1 selector becomes the **Chats section** of the new homepage. The V1 selector route is preserved at `/chats` for users who prefer the table view. |
| Chat selector | **Chats section** | The `chats@1.0` catalog component on the homepage. Same V6 functionality, different framing. |
| `createdInMode` field | (deprecated) | Used once during PR-10a's migration to assign a `room` to existing conversations. Stays in records for one release for debugging, then stripped. |
| `parliament-mode` localStorage | (gone) | Stripped on first V2 boot per PR-12. Last value consulted only at PR-10a migration. |
| MODE_CAPABILITIES | (gone) | Dead code at runtime. Deleted in PR-12. |
| Mode suggestions (`csv → pelican`, etc.) | (removed entirely) | No V2 equivalent. The implicit V2 successor would be "room/template suggestions" but that's deferred indefinitely. |

---

## V2 vocabulary

The four-layer composition model:

| Term | Definition |
|---|---|
| **Layout** | The spatial spine. Declares which slots exist and where they sit. Examples: `three-panel`, `canvas-centric`, `document-centric`, `single-column-with-sheet`, `stacked-sections`. |
| **Slot** | A named region inside a layout that can hold components. Universal slots (`left-rail`, `right-rail`, `right-rail-extra`, `msg-area`, `input-dock`) mean the same thing across layouts. Layout-specific slots (`canvas`, `chat-panel`, `document`, `margin`, `sheet`, `section-slot`) have unique semantics. |
| **Component** | The furniture that fills slots. Each component has a manifest (tier, slot targets, capability requirements, config schema, render function). Examples: `messages@1.0`, `input@1.0`, `branches@1.0`, `voice-input@1.0`. |
| **Scheme** | A full design identity — color, typography, spacing, radii, motion. Six ship at V2: `parliament`, `cool-bright`, `deep-calm`, `soft-violet`, `fresh-teal`, `amber-glow`. Each ships in four accessibility variants. |

Plus:

| Term | Definition |
|---|---|
| **Feature** | A user-facing capability that maps to one or more components. Users think in features ("highlights"); the system stores components ("highlights@1.0"). The wizard speaks in features. |
| **Catalog** | The full registry of layouts, components, schemes, and resources users can install. Backed by IndexedDB tables (`libraryLayouts`, `libraryComponents`, `librarySchemes`, etc.). |
| **Library** | The user-facing surface for browsing the catalog. Six categories: Rooms, Layouts, Components, Schemes, Sections (hidden in V2), Resources (visible with coming-soon placeholders). |
| **Mode file** | The JSON document describing how a single interface surface looks and behaves. Schema: `parliament-mode/1.0`. Stored in the `modes` IndexedDB table. Each user has one homepage mode (`scope: 'homepage'`) and N room modes (`scope: 'room'`). |
| **Room template** | A pre-composed mode file in `libraryRooms`. Users instantiate a template into a personal room via the wizard or template gallery. Five available + 2 coming-soon ship at V2. |
| **Shell** | The outermost permanent infrastructure: homepage, top bar, Settings, API key entry. Not a catalog component. Settings cannot be a feature because rooms depend on it. |

---

## Component tier vocabulary

Defined fully in [tier-classification.md](tier-classification.md). Quick reference:

| Tier | Definition | Phase 1? |
|---|---|---|
| **Utility** | Pure rendering, no data access. | Yes |
| **Reader** | Reads conversation context. No model calls. | Yes |
| **Composer** | Drafts messages (user sends), saves own preferences. Makes model calls **only in direct response to a user action**. | Yes |
| **Integrator** | Network calls to declared hosts. Stacks with other tiers. | Phase 2+ for new components; existing V1 features (Network Activity Card) stay shell-level. |
| **Agent** | Makes **autonomous** model calls (pipeline-driven, event-driven, etc.). Requires explicit consent at first use per `consent-flow-ui-spec.md`. | Phase 2 — first Agent component is `summarizer@1.0`. |
| **Persister** | Reads/writes to shared local stores across modes. | Phase 2.5+ (reserved). |

---

## hostAPI bus events (Phase 1)

The hostAPI publish/subscribe bus carries three Phase 1 events:

| Event | Publisher | Subscribers | Purpose |
|---|---|---|---|
| `voice-transcript` | `voice-input@1.0` | `input@1.0` (subscribes by default) | Speech-to-text result; consumer appends to draft. |
| `row-hover` | `chats@1.0` | `blueprint@1.0` | Hovering a chat row glows the corresponding room on the blueprint. |
| `file-context-changed` | `file-shelf@1.0` | `chart-canvas@1.0`, `table-canvas@1.0`, `summary-dashboard@1.0`, `column-inspector@1.0` | Active file or in-context set changed; canvas components re-render. |

**Plus the message-action contribution pattern:** components contribute per-message menu items via their manifest's `contributions: { messageActions: [...] }` field. `messages@1.0` collects contributions from active siblings and surfaces them in the per-message menu. Used by `branches@1.0` ("Branch from here"), `highlights@1.0` ("Highlight selection"), `notes@1.0` ("Add note here").

Phase 2+ events (not Phase 1): `onModeEnter`/`onModeExit`, `theme-changed`, `presence-state-changed`, `input-received`/`output-ready` (pipeline progress), `permission-granted`/`permission-revoked`.

---

## Library status field

Per NQ-1, library entries (layouts, rooms, resources) carry a status field:

| Value | Meaning |
|---|---|
| `available` | Fully implemented, installable. |
| `beta` | Functional but rough edges or incomplete. V1 carried this for Pelican and Secretarybird. |
| `coming-soon` | Visible in the library as a placeholder; not installable. Click → read-only preview. |

`libraryComponents` and `librarySchemes` don't currently use the field (all available at V2 launch). Field can be added if needed later.

---

## Disambiguations and "subtle but real" distinctions

These came up during the audit review and are easy to confuse:

### "Pelican" — three different things

- **The Pelican mode** (V1) — a user-facing experience. Survives in V2 as the **Data Workspace** room template plus the canvas-centric layout plus the catalog components.
- **`PelicanContext`** (V1) — a React Context state container at `src/stores/PelicanContext.jsx`. Owned mode-specific state. Goes away in PR-11a; its file-staging slice becomes scoped state on `file-shelf@1.0`.
- **`src/adapters/pelican/`** (V1) — the directory holding Pelican's adapter implementation. Decomposed into catalog components in PR-11a; directory deleted.

When you read "Pelican" in any V2 doc, check which of these is meant. Most often it's the first (the user-facing experience), since the second and third are V1 implementation details that go away.

### "Mode" — file format vs. user concept

- In **architecture / file format / storage** docs, "mode" means a mode file (`parliament-mode/1.0`). The `modes` IndexedDB table stores them.
- In **user-facing copy**, "mode" doesn't appear. Users see "rooms" everywhere.

V1 conflated the two — `MODE_CAPABILITIES`, `parliament-mode` localStorage, "Interface Mode" settings section. V2 separates them.

### "Branches" — feature, component, and conversation graph

- **Branch (the feature)** — V1 and V2. Creating a copy of a conversation from a specific message.
- **`branches@1.0`** (V2 catalog component) — the optional sidebar that shows the branch tree. **Owns the BranchCreationPanel modal** per the §5.8 decision. Adding it to a room enables both the sidebar AND the "Branch from here" message action.
- **The branch graph** (data) — the parent/child relationships stored in `conversations.parentId, parentTitle, branchPoint, familyId`. Independent of whether `branches@1.0` is in any room.

If a user removes `branches@1.0` from their room, branches data still exists in IndexedDB. They just can't *create* new branches from that room until they add the component back. (Branches created in *other* rooms still appear when those rooms are open.)

### "File-shelf" — a component, not a slot

V1 and the architecture doc both used "file shelf" descriptively. The `file-shelf@1.0` catalog component fits in the universal `left-rail` slot — there is **no `file-shelf` slot type**. This trips up first readers because the term "file shelf" appears in three places: a catalog spec example (descriptive), an audit table (corrected), and the component name. Always interpret as the component.

### "Coming soon" — applies to layouts, rooms, and resources

V1 used "Coming Soon" as a banner on Kingfisher and Starling falling through to Albatross. V2 moves this concept into the library:

- 2 coming-soon **layouts** (`reading-pane@1.0`, `split-view@1.0`) — placeholder library entries.
- 2 coming-soon **rooms** (Kingfisher, Starling templates) — point at the coming-soon layouts.
- 6 coming-soon **resources** — placeholder cards for future Guides/References/etc.

All three click through to the same read-only preview surface (per NQ-2). Sections category is hidden, not coming-soon (per NQ-8).

### "Default model" vs. "model-picker"

- **`defaultModel`** (V1 setting, preserved in V2 Phase 1) — the user's globally chosen default model. Set in app Settings.
- **`model-picker`** (V2 Phase 2 field type) — a config schema field type that lets a specific component override the default. Lives on Summarizer in Phase 2; not on any Phase 1 component.

Phase 1 has only the app-level default. Per-component override is Phase 2.

### "Tour state" vs. "user preferences"

The `tourCompleted_*` settings live in the `settings` IndexedDB table but are **user data, not room data**. They migrate as-is (they're already user-scoped). V2's Phase 1 keeps them; full tour rewrites are deferred.

### `.parliament` vs. `.apb`

- **`.apb`** (V1 backup format) — encrypted with PBKDF2 100k iterations + AES-GCM. Top-level `{ ciphertext, iv, salt, version }`.
- **`.parliament`** (V2 backup format) — encrypted with PBKDF2 **210k** iterations + AES-256-GCM. Nested `{ format, version, manifest, contents | payload }`. Manifest unencrypted so restore preview shows contents before password entry.

V2's import handles both. V2 only writes `.parliament`.

---

## Common questions that come from skimming

> Why is Review classified as Composer when it makes a model call?

Because the user clicked "Generate synthesis" — the call rides on a direct user action. See [tier-classification.md](tier-classification.md) for the full rule.

> Why is the file-shelf component allowed in `left-rail`? Doesn't it need its own slot?

No — the spec uses universal slots for it. See `parliament_component_catalog_v0_1.md` §8 compatibility matrix. Component fitting in a universal slot is more flexible: a user composing a writing room could put file-shelf in their `left-rail` for reference docs.

> Why are Kingfisher and Starling "coming soon" if they were modes in V1?

V1 stubbed both (4-line files that fell through to Albatross). They never had real implementations. V2 keeps them visible as planned future rooms with placeholder library entries. When their layouts (`reading-pane@1.0`, `split-view@1.0`) ship in a future release, the cards become installable.

> Why does Phase 1 have no Agent components?

The first Agent component is `summarizer@1.0`, which depends on the consent flow UI infrastructure. Both ship in Phase 2. Phase 1 preserves V1 behavior — every model call in V1 is user-initiated, so every component making model calls is Composer.

> Why is the Sections library category hidden in Phase 1?

Per NQ-8: "Sections" is vague without something concrete to show. Resources at least has the resource-type vocabulary defined (Guides, References, etc.). Sections — "user-saved arrangements of components" — needs the editor + room ecosystem maturity to be meaningful, which is V3 territory. Hidden until there's something real.

> Why is the V1 mockups directory archived rather than deleted?

Per NQ-10: it's static reference material useful for "did we preserve this V1 behavior?" investigations during Phase 1. Costs nothing to keep. Moved to `refactor/v1-mockups-archive/` in PR-12.
