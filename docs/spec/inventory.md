# Inventory

Phase 0 of the Almanac, Docket and command line refactor (Almanac spec §13).
Generated 23 September 2026 from `src/`, `refactor/`, the root handoff files and
the four files in `docs/spec/`. Branch `claude/almanac-docket-inventory`, cut
from `main` at ae464a3 (PR-50a/b are not on it).

**The State column is a draft.** Anything marked `?` is a guess. Only you know
the State column for certain, so correct it in place.

- **Live**: in `src/` on `main`, reachable in the app.
- **Mockup**: HTML or JSX prototype only (`docs/spec/*.html`, `refactor/v1-mockups-archive/`).
- **Specced**: described in a document, no code anywhere.
- **Named**: mentioned as a concept only.

## Rulings so far (23 September 2026)

1. **The Almanac is new.** The §13 seed rows marked Live were aspirational. The
   Almanac replaces the chat history (`/chats` and the homepage Chats section),
   and the blueprint is to go. Removal still goes item by item through the
   change plan.
2. **Symposium is the new chat room**, and more than one room: it is the flow of
   chats from room to room, possibly on different models, as the docket directs.
3. **`lab:` goes to `/edit`.** The Lab, editor and wizard are the next piece of
   work after this refactor, not part of it.
4. **This is a new refactor.** The only spec documents are the four in
   `docs/spec/`. `refactor/` is the old V2 Phase 1 refactor: background for how
   the code got here, not a source of requirements. Docs that `refactor/` cites
   but that are missing from the repo are ignored.
5. **The design style of the two mockups replaces everything**, across all
   surfaces.
6. **The Almanac can run.** Comments and toasts in v30 saying otherwise are left
   over and are not conflicts.
7. **Branch base is `main`.** The unmerged PR-50a/b work
   (`claude/pr50-house-visualizer-contract`, house@1.0 visualizer and homepage
   default swap) is parked. Return to it once this refactor lands and decide
   which of its ideas survive.
8. **The Almanac replaces The Study as the homepage.** It can also be opened from
   anywhere with the command line, or popped out and placed on any screen. From a
   chat you can go to it or pop it out.
9. **Rooms keep their own colour schemes inside the room.** The new style governs
   everything around them.
10. **Dark mode is deferred.** The mockups are the guide: bone off-white, ink, navy
    for certain items, gold for the live action.
11. **Design work still owed, as separate steps:** the Symposium room flow (popping
    out and comparing is central to it), and the Lab, wizard and editor. For each, I
    export standalone HTML snapshots of the current screens so you can design them
    outside Claude Code.

Nothing in the new vocabulary exists in code. Searches for almanac, docket,
symposium, marginalia, command line, numeric ids, runs, steps, statuses, sources,
pop-outs and cross-tab messaging all came back empty. Every record id is a UUID.

## The spine: command line

| What it is | State | Where | Blocks |
|---|---|---|---|
| Command line as built in v30 (one field, three modes) | Mockup | `docs/spec/parliament_almanac_v30.html` (field ~L204-280, CMDS ~L1459, leaders ~L2262); Almanac spec §1 | Every verb below; Almanac, Docket and Symposium integration |
| Leaders `>`, `p>`, `s>` and long forms | Mockup | v30 ~L2262-2290; Almanac spec §1 | Prompt mode everywhere |
| Enter line (reserved hint line, pre() previews) | Mockup | v30 ~L263, ~L1962; Almanac spec §2 | Execution guards (it is the only guard, §5) |
| Enter line stating rooms, models and cost before a run | Specced | Almanac spec §2, §5.1; docket v12 divergence 2 | `run:` shipping |
| `idsIn` / `addrsIn` parsers | Mockup | v30 ~L915-935 | Address verbs, numeric ids |
| Verb registry (CMDS, one array driving hints, `?` and docs) | Mockup | v30 CMDS; docket v12 VERBS ~L994 | Help panel, generated docs |
| Filter schemes (`type:` `room:` `tag:` `model:` `from:` `in:` `has:` `cost:` `since:` `until:` `sort:`) | Mockup | v30 ~L1152-1330, ~L1651 | Almanac search |
| `from:` (chat, docket, branch across runs, one run) | Mockup (partial?) | v30 ~L1654; Almanac spec §4 | Needs runs to exist |
| `new:` (chat, docket, room; step, run, branch in a docket) | Mockup | v30 ~L1478; docket v12 ~L994 | Docket, room builder |
| `open:` (by kind; adds a card on multi-card surfaces) | Mockup | v30 ~L1463; docket v12 ~L1105 | Multi-card surfaces |
| `open:` taking a branch address | Specced | Almanac spec §3; docket v12 divergence 8 | |
| `run:` and `RUNPOL` | Mockup | v30 ~L1513; docket v12 ~L1056 | Execution engine |
| `new:run` | Mockup | docket v12 ~L1053 | Runs data model |
| `stop:` / `stop:all` | Mockup | v30 ~L1531; docket v12 ~L1078 | Cross-window channel |
| `stop:all` across windows (storage event) | Specced | Almanac spec §5; docket v12 divergence 7 | Cross-tab channel (none exists) |
| `undo:` with the execution boundary | Mockup (Almanac only) | v30 ~L1861; Almanac spec §5.4; not in docket v12 | Docket undo |
| `hold:` (park a branch) | Mockup | docket v12 ~L1022 | `waiting` status |
| `move:`, `delete:`, `close:` (docket) | Mockup | docket v12 ~L1035, ~L1046, ~L1117 | |
| `diff:` / `diff:off` between two runs | Mockup | docket v12 ~L652; docket spec §8 | Runs data model |
| `diff:` between two dockets (matching) | Specced | Almanac spec §12 | Out of scope |
| `pop:` (panel or addressable thing) | Mockup (Almanac panels, dockets) | v30 ~L1014, ~L1836 | Pop-out windows |
| `bar:` positions and states | Mockup | v30 ~L1744-1770; docket v12 ~L1128 | |
| `layout:`, `move:` (panels), `swap:`, `hide:`, `show:`, `reset:`, `refresh:` | Mockup | v30 ~L1728-1810 | |
| `arrange:` (desks, per device) | Mockup (partial) | v30 ~L1809-1835; Almanac spec §4 | Out of scope; Window Management API |
| `?` and `help` reference panel | Mockup | v30 ~L2028-2110; docket v12 `help:` ~L1140, NOTES ~L1230 | |
| `?` bound in the docket | Specced | docket v12 divergence 6 | |
| ⌘K from anywhere, including inside fields | Specced | Almanac spec §1; docket spec §5; docket v12 divergence 6. v30 binds `/` only (~L2555) | Symposium and docket routes in |
| `/` shortcut outside fields | Mockup | v30 ~L2555 | |
| Command history (↑ ↓, kept between visits) | Mockup | v30 ~L1409 | |
| Go-to verbs `alm:`, `lab:`, `sym:` | Mockup | v30 ~L1461-1470 | Surfaces they point at |
| `co:`, `add:`, `rm:`, `name:`, `clear:`, `compare:`, `export:` (collection) | Mockup | v30 ~L1550-1600 | Collection panel |
| `pin:`, `rename:`, `archive:`, `peek:`, `read:`, `note:`, `copy:`, `dup:`, `forget:`, tag verbs, `cols:` | Mockup | v30 ~L1604-1725 | Numeric ids |
| Navy rule on the addressed surface, permanent | Specced | Almanac spec §7; v30 and docket v12 both still show it only in command mode on a single surface | |
| Bar placements (inline, parked, popped) | Mockup | docket v12 ~L335; docket spec §5 | |
| Border engine (key / structural / none, SVG overlay) | Mockup | v30 ~L637-720; docket v12 ~L551 | Visual pass |
| Key element is the bar | Specced | Almanac spec §5.5 (border left to the visual pass) | |
| Generated docs site from the verb table | Specced | docket spec §6 | Verb registry |
| `docs:` verb | Named | docket spec §6 | Docs site |

## Addresses and data

| What it is | State | Where | Blocks |
|---|---|---|---|
| Flat numeric id space (201, 251) | Specced | Almanac spec §3; v30 uses `id+200`. Code: every record is `crypto.randomUUID()` (`src/lib/db.js:436`) | Every verb that takes an id; the id column |
| Branch letters (A, B, never reshuffled or reissued, I and O skipped, doubling past Z) | Mockup | docket v12; docket spec §2; v30 ADDR regex | Data model |
| Docket / branch / run / step / chat model | Mockup | docket v12 DATA ~L605; docket spec §1 | Docket, execution, Symposium fork |
| Branch as today's data (separate conversation, `parentId`, `branchPoint` message id, `familyId`, no letters) | Live | `src/lib/db.js:548-622`; `src/catalog/entries/branches-render.jsx:117-184` | Mapping onto spec branches (§3) |
| Compressed-summary branch | Live | `branches-render.jsx:125-184`; `BranchCreationPanel.jsx` | Same |
| Status vocabulary ready / running / done / waiting / paused | Mockup | v30 ~L130-143; docket v12 header. No status strings in code | Docket, `stop:` |
| Cost per run | Mockup | docket v12 `cost:{1:..}` | Execution |
| IndexedDB `parliament` v5 (conversations, messages, notes, highlights, favorites, pins, files, sbrd_documents, modes, library stores) | Live | `src/lib/db.js:7-126` | Any schema change |
| Export and import | Live | Live as `.parliament` backup: `src/lib/backup.js`, `BackupContext.jsx`, `BackupRestoreModal.jsx`. Older `.apb`/JSON path still in `SettingsView.jsx:759,782`. Almanac-style markdown/JSONL export is Mockup (v30 ~L1866) | Format versioning |
| Format versioning (version field plus migration path on import) | Specced, and owed? | Almanac spec §10. Partly present: envelope has `version: 1` and rejects newer; older files converted by shape (`backup.js:313-347`, `flatV1ToContents`). No per-version record migration | Any schema change (your rule 7) |
| Cross-tab channel (storage event) | Specced | Almanac spec §5, §10. Code has no storage listener, BroadcastChannel or locks; data is in IndexedDB, localStorage is essentially unused | `stop:all`, stale-tab marginalia |
| Stale-tab marginalia; orphaned pop-out message on `beforeunload` | Specced | Almanac spec §10 | Tabs and pop-outs |
| Fan-out opens tabs | Specced | Almanac spec §10 | Execution of multi-room runs |
| Directory handles (File System Access) | Named, cut | Almanac spec §10 | |
| Almanac layout persisted in localStorage (`almanac-layout`) | Mockup | v30 ~L963 | Conflicts with IndexedDB-only settings today |

## Almanac

| What it is | State | Where | Blocks |
|---|---|---|---|
| Almanac table, filters, collection | Mockup | v30. Replaces the Live chat history below | Almanac work |
| Chat history: `/chats` selector | Live, to be replaced | `src/views/SelectorView.jsx`, `SelectorLayout.jsx` | Almanac |
| Chat history: homepage Chats section | Live, to be replaced | `src/catalog/entries/chats*.jsx` | Almanac |
| `id` column (always visible, draggable, cannot be hidden) | Mockup | v30 ~L334, ~L1718 | Numeric ids |
| Kept searches rail (left panel) | Mockup | v30 LEFT ~L174, ~L2126 | |
| Collection panel and working set | Mockup | v30 RIGHT ~L452, ~L2294 | |
| Containers render contents live, by pointer | Mockup | v30 header comment | |
| Peek | Mockup | v30 ~L1384 | |
| Compare (two items, or runs as a matrix) | Mockup | v30 ~L2419 | |
| Kind pills (chat blue, note purple, highlight pink, docket teal) | Mockup | v30 ~L415 | |
| Marginalia (italic serif, clickable) | Mockup | v30 header, ~L484, ~L882 | |
| Caret on picker marginalia | Mockup | docket v12 ~L240 | |
| Three-slot layout, pop-out panels | Mockup | v30 ~L946-1100 | |
| Narrow floor (stack below ~1500px for three cards) | Specced | Almanac spec §9; docket spec §9 | |
| Pinned rows lead | Live (in `/chats`) and Mockup | `SelectorLayout.jsx:977-993`; v30 ~L2223 | |

## Docket

| What it is | State | Where | Blocks |
|---|---|---|---|
| Docket at v12 | Mockup | `docs/spec/parliament_docket_v12.html` | Needs data model and execution |
| Cards (a docket at a run, cap of three) | Mockup | docket v12 ~L642 | Multi-card surface |
| Run pips | Mockup | docket v12 ~L279, ~L729 | |
| Record cards | Mockup | docket v12 ~L416 | |
| Locked steps (done, running, paused) | Mockup | docket v12 ~L902 | |
| Room on the branch, steps override | Specced | Almanac spec §9; docket v12 divergence 3 | |
| Empty-docket first-run help | Specced | docket spec §6; docket v12 divergence 8 | `new:docket` |
| Opening a docket enters command mode | Mockup | docket v12 ~L1275 | |
| Popped docket that can run | Mockup (float only) | v30 ~L1097, ~L1836 | Pop-outs, execution |

## Symposium and chat

| What it is | State | Where | Blocks |
|---|---|---|---|
| Symposium (the flow of chats from room to room, per the docket) | Specced | Named in the specs; no design yet beyond docket spec §3. Today's single chat room is `/chat/:id` via `src/views/ChatView.jsx` and `RoomShell` | Docket data model; the Symposium design |
| Chat composer | Live | `src/catalog/entries/input-render.jsx`, `src/components/core/InputArea.jsx` | ⌘K inside the composer |
| Forking writes a branch into the docket | Specced | docket spec §3 | Docket data model |
| Free typing appends a step to the current run | Specced | docket spec §3 | Same |
| Forking a standalone chat creates a docket | Specced | docket spec §3 | Same |
| Branch shortcut Cmd/Ctrl+Shift+B | Live | `src/components/BranchShortcutHandler.jsx:41-57`. Also bound by `BackupContext.jsx:53-65` on every route (double fire on `/chat/:id`) | |
| Notes, highlights, favorites | Live | `src/stores/AnnotationsContext.jsx`; `db.js:708-790` | Markings as Almanac rows |
| Pins (copy a message into another chat) | Live | `db.js:793`; `messages-render.jsx:162-228` | Clash with `pin:` meaning (annotation) |
| Multi-card / split chat | Specced | `split-view@1.0`, `reading-pane@1.0` exist as coming-soon records only (`db.js:255-271`) | `open:` as split |
| Tabs diverging / "this tab is stale" | Specced | Almanac spec §10 | Cross-tab channel |

## Models and sources

| What it is | State | Where | Blocks |
|---|---|---|---|
| Provider abstraction (Anthropic only) | Live | `src/providers/base.js`, `anthropic.js`, `index.js` | |
| Model choice | Live | Global default only: Settings, `SettingsView.jsx:490-520`. No per-step or per-room picker | Answered-by picker |
| Answered-by picker (flat list by cost mark) | Mockup | v30 / docket v12 pickers; Almanac spec §8 | |
| Cost marks (×15, ×3, ×1, free, 0 tokens) | Specced | Almanac spec §8. Code shows $ per million tokens | |
| Local models (Llama via Ollama) | Named | `base.js:31` reserves `{type:'free-local'}`; Phase 2 in `CLAUDE.md` | CSP change (`http://localhost:*`) |
| Sources: responder / material / trigger | Specced | Almanac spec §8 | |
| Declarative source manifests | Specced | Almanac spec §8 | |
| The three render shapes (article, results list, record) | Specced | Almanac spec §8 | |
| Wikipedia as a source | Specced | Almanac spec §8 | CSP `connect-src` (only `api.anthropic.com` today, `netlify.toml`) |
| Narrow keyless APIs (arXiv, Europe PMC, HN Algolia, Open Library, Openverse, Wikidata) | Specced | Almanac spec §8 | Same CSP constraint |
| News source | Named | Almanac spec §8 ("later") | |
| Web search tool (Anthropic server-side) | Live | `anthropic.js:134-158`; `web-search@1.0` | |

## Rooms, Lab and existing V2 surfaces

| What it is | State | Where | Blocks |
|---|---|---|---|
| Rooms, mode files, `RoomShell`, layouts, schemes, catalog | Live | `src/lib/modes.js`, `src/components/RoomShell.jsx`, `src/catalog/`, `src/lib/schemes.js` | Where Almanac and Docket live as surfaces |
| The Study (homepage) | Live | `src/views/HomepageView.jsx` | Almanac placement |
| Blueprint (homepage section and Cmd/Ctrl+. overlay) | Live, to go | `src/catalog/entries/blueprint*.jsx`, `src/components/BlueprintOverlay.jsx`, `src/lib/blueprintShapes.js` | Retirement list in the change plan |
| The Lab (room editor) | Live; next refactor | `/edit`, `src/views/EditorView.jsx`, `src/components/editor/`. Target of `lab:` | |
| Build wizard (room builder by template) | Live; next refactor | `/build`, `src/lib/buildWizard.js`, `src/components/build/wizard/` | |
| Room builder (target of `new:room`) | Named | Almanac spec §13; out of scope, lands with the Lab work | `new:room` |
| Library overlay (catalog browser) | Live | `src/components/LibraryOverlay.jsx`, `library*.jsx` | |
| Editor undo | Live | `src/lib/editorHistory.js` (editor only, 50 steps) | `undo:` scope |
| Backup undo toast (60 s) | Live | `BackupUndoToast.jsx` | |
| Blueprint overlay Cmd/Ctrl+. | Live | `src/components/BlueprintOverlay.jsx:29-48` | |
| Document canvas word diff | Live | `src/components/core/sbrd/diff.js` | Reuse for docket diff? |
| Voice input | Live | `useVoiceInput.js`, `voice-input-render.jsx` (Pocket Chat rooms) | Spec treats voice as Named, V2 |
| Voice on the prompt line | Named | Almanac spec §11 | Out of scope |
| Component tiers (utility … persister) | Live as constants | `src/lib/catalog.js:22-29`, enforced editorially | Consent flow |
| Consent flow | Specced | Almanac spec §11 (tiering for model-proposed actions). The old refactor's version is in `refactor/tier-classification.md`, background only | `invoke:` |
| `invoke:` and `analyze:` | Named | Almanac spec §11 | Out of scope |
| Free-speech interpretation on the prompt line | Named | Almanac spec §11 | Out of scope |
| `PANELS` registration rule | Mockup | v30 ~L952; Almanac spec §9 | |

## Parked

| What it is | State | Where | Return when |
|---|---|---|---|
| PR-50a/b: house@1.0 visualizer, homepage default swap, saved-seed migration | Unmerged branch | `claude/pr50-house-visualizer-contract` (abe2ac5 (in the private archive), 8f7c5cb (in the private archive)) | After this refactor lands; keep what survives the new direction |
| Compressed-summary branch | Live | `src/catalog/entries/branches-render.jsx`, `BranchCreationPanel.jsx` | Kept as a docket branch (change plan 5.7); you want to rethink it after this refactor |

## Settings (added 24 September 2026)

| What it is | State | Where | Blocks |
|---|---|---|---|
| Settings as built (one section at a time, gold, Anthropic only) | Live | `src/views/SettingsView.jsx`; snapshot `docs/design-snapshots/settings-current.html` | |
| Settings v1 (stacked card, rail, section rule, aliases) | Mockup | `docs/spec/parliament_settings_v1.html`; `settings-spec-decisions.md` | Change plan area 6b |
| `api:` key panel, on every surface | Mockup | v1; St §6 | Keys for several providers (area 6) |
| `set:` and the `SETTERS` registry | Mockup | v1; St §5 | Command bar (area 2) |
| `open:settings`, `pop:settings`, `pop:back`, `backup:`, `restore:` | Mockup | v1; St §5 | Command bar, pop-outs |
| `bar:` positions and states | Mockup | v1 (built there); St §7; A §4 | Command bar |
| Section navy rule | Mockup | v1; St §3 | |
| Warn before a costly run | Mockup | v1; St §9 | Run cost (area 8) |
| Desks on this device | Mockup | v1; St §12 | `arrange:` (out of scope) |

## The October documents (added 12 October 2026)

Rows for what the thirteen later spec files add. Rulings 3 and 11 above are
changed by them: the Lab is now in scope, and the flow between rooms is partly
designed. Later rulings are in `conflicts.md`; the plan is `refactor-plan.md`.

| What it is | State | Where | Blocks |
|---|---|---|---|
| Arrangements, boards, rooms, blocks as the model | Specced | `arrangements-boards-blocks-decisions.md` §1, §2. Code has pages and routes | The shell (plan stage 3) |
| The board strip (`Alm:`, `Sym:`, `Col:`, `Ref:`, `Lib:`, `Dkt:`) | Mockup | Inline editing v5; branch slider v9 | Boards registry |
| The bar: 40px field, fills that wipe, marginalia in the prompt field | Mockup | `parliament-bar-reference.html` | Stage 3 |
| The bar minimised to a hexagon; `bar:left`, `bar:center`, `bar:right` | Mockup | Bar reference; ruled 12 Oct | Stage 3 |
| `pop:command`: the bar in its own window | Specced | Ruled 11 Oct. The welcome mockup draws it docking at the foot | Pop-out prototype |
| The bar as the only composer in a room | Specced | Ruled 11 Oct (C37). Code: `InputArea.jsx`, `input-render.jsx` are Live | Stage 4 |
| Renamed-verb answers ("That verb is now …") | Mockup | Bar reference | Verb registry |
| The welcome page: letter, steps, ending, footer | Mockup | `parliament_welcome_v9.html` | Stages 2 to 5 |
| `tour:` and the advanced list | Specced | Welcome spec §13; ruled 12 Oct | Stage 5 |
| Tooltip tours and the first-run gate | Live, to be replaced | `TourTooltip.jsx`, `tourCompleted_*` | Retirement R15 |
| Several sources answering one prompt, as tabs | Mockup | `parliament-branch-slider-v9.html` | Stage 8 |
| The numbered picker, grouped into Models and Sources | Mockup | Branch slider v9 | Stage 7 |
| "One after another" with a condition per source | Mockup | Branch slider v9 | Docket running (stage 10) |
| `open:201a` and `open:201a summary` | Mockup | Branch slider v9. Code: the compressed-summary branch is Live | Stage 8 |
| Reply to one branch or all (`to:`) | Mockup | Branch slider v9; editing spec | Stage 8 |
| The Collection as cards, with headings and a source picker | Mockup | `parliament-collection-board-v3.html` | Stage 6 |
| Highlight (a passage) | Mockup | Collection board v3; editing spec | Stage 6 |
| Term (a phrase lit everywhere in a chat) | Live, as "highlights" | `AnnotationsContext`, the Highlights block | Renamed in stage 2 |
| Quote (kept beside the chat, never sent) | Mockup | Collection board v3. Code: "Pin for reference" is Live | Stage 6 |
| Editing replies and prompts in place: strike, add, one id per edit | Mockup | `parliament-inline-editing-v5.html`. Code: Secretarybird is Live and is not this | The engine spike (stage 11) |
| Edits sent with the next prompt; hold back; the count line | Mockup | Editing spec | Stage 11 |
| Asks | Mockup | Editing spec | Stage 11 |
| The `/` menu and blocks inside a reply | Mockup. Live in the document canvas only | Editing spec; `DocumentParagraph.jsx` | Stage 11 |
| `markup:`, `tell:`, `strikethrough:`, `again:`, `drop:`, `jump:` | Mockup | Bar decisions; editing spec | Their stages |
| Ripple across branches | Mockup. Code: `RippleAnalysis` is Live and checks documents across chats | Editing spec | Stage 12 |
| Sweeps | Mockup | Editing spec | Stage 12 |
| The Reflection board | Mockup. Code: the Review modal is Live and stays for now | Editing spec | Stage 12 |
| `collab:` standing instructions | Mockup. Code: Collaboration mode and personas are Live | Editing spec | Stage 7 |
| `helper:` for text from a keyless source | Mockup | Editing spec | Stage 7 |
| `focus:` sets and `calm:` | Mockup | Editing spec; welcome v9 | Stages 5 and 14 |
| The Lab as boards: Library, Canvas, Blocks | Mockup | `parliament_lab_v6.html`, `parliament_lab_v7_blocks.html`. Code: the editor is Live | Stage 13 (C38) |
| The guide in the Lab (`new:room guided`) | Mockup. Code: the wizard is Live | Lab v6 and v7; `buildWizard.js` | Stage 13 |
| Web search, voice input and file attach as features of input | Specced. Live as separate blocks | Arrangements doc §2 | Stage 13 |
| The screens map (`arrange:`) | Mockup | `parliament_screens_v1.html` | Stage 14 |
| `erase:` for one item | Specced | Ruled 11 Oct (C39). Code can delete one chat or message today | Stage 6 |
| "Delete everything" that deletes everything | Specced. Live and incomplete | Ruled 11 Oct (C73); `db.js` `clearAllData` | Stage 9 |
| `restore:` and `import:` | Specced | Ruled 12 Oct (C46) | Stage 9 |
| One call for title, summary and tags | Specced. Live as three silent calls | Ruled 12 Oct (C62); `ChatContext.jsx` | Stage 4 |
| The gateway for every outbound request | Specced | `refactor-plan.md` section 4. Code: 17 places fetch a provider | Stage 4 |
| The key module with a working "Don't save" | Specced. Live and broken | Ruled 11 Oct; `crypto.js` | Stage 4 |
| The privacy copy | Draft | `privacy-copy-draft.md` | Stage 15 |
