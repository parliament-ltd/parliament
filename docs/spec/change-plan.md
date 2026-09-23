# Change plan

Phase 2 of the Almanac, Docket and command line refactor. Drafted 23 September 2026.

Built on the rulings in `docs/spec/inventory.md` and `docs/spec/conflicts.md`.
Section references: **A** = `almanac-spec-decisions.md`, **D** =
`docket-spec-decisions.md`, **v30** and **v12** = the mockups, **C** and **S**
numbers = the conflict register.

Each area lists what is **kept**, **changed** and **added**, with the reason tied to
a spec section. Everything proposed for removal is in the retirement section at
the end, one item per line, so you can approve each on its own. Nothing is removed
until you do.

Each area is split into steps. A step is one reviewable commit or a short run of
them, and it ends with something you can check in the app.

## Order, and why it differs from the brief

The brief's order was: data model, command bar, Almanac, Docket, Symposium,
sources, execution. I propose one change and two additions.

1. **Area 0, safety, comes first.** Two bugs in restore and import would corrupt
   references during any migration, and A §10 makes format versioning a
   precondition for schema changes. Your rule 7 says the same.
2. **Area 2 opens with the new chrome** (tokens, fonts, dotted borders), because
   the bar is the first thing drawn in the new style and everything after it
   builds on the same tokens.
3. **Multi-provider (area 6) comes before execution (area 8)**, because `run:`
   has to know which provider a step's model belongs to and what it costs.
4. **Cross-window signals are part of area 1**, because pop-outs (area 3) and
   `stop:all` (area 8) both need them.

| # | Area | Depends on |
|---|---|---|
| 0 | Safety: restore fixes, format versioning, test harness | |
| 1 | Data model, numbers, migration, cross-window signals | 0 |
| 2 | New chrome and the command bar | 1 (ids for address verbs) |
| 3 | Almanac | 1, 2 |
| 4 | Docket | 1, 2 |
| 5 | Symposium, first pass | 1, 2, 4 |
| 6 | Multi-provider and the answered-by picker | 0 (key store) |
| 7 | Sources | 2, 6 |
| 8 | Execution: `run:`, `new:run`, `stop:`, undo boundary | 4, 5, 6 |
| 9 | Retirements you approve | 3 |

Areas 6 and 7 can run in parallel with 3 to 5 if that is useful.

**Approved 23 September 2026:**
- The order above.
- Vitest as a dev-only dependency.
- The compressed-summary branch stays (5.7), and you want to return to it later.
- The model list is the current lineup: Opus 5.5, Sonnet 5, Haiku 4.5, Fable 5.1.
- Settings takes the new fonts and colours now, with a standalone HTML snapshot provided for you to redesign it elsewhere.
- arXiv is dropped.
- Retirements are approved one by one as each area lands.

Out of scope, per the brief:
- the room builder and wizard, and the Lab and editor redesign
- `invoke:` and `analyze:`
- voice on the prompt line
- `diff:` between two dockets
- `arrange:`
- dark mode (inventory ruling 10)

Where a step touches one of these, it says so.

---

## Area 0. Safety

**Kept:**
- The `.parliament` backup, its envelope, and its encryption (PBKDF2 at 210k iterations, AES-GCM).
- Reading older `.apb` and JSON files on import.

**Changed:**
- **0.1 Merge restore remaps references.** When a restored conversation is renamed on collision, its `branchPoint`, children's `parentId`, and the message ids on notes, highlights, favorites and pins follow it. This bug is in `backup.js:600-730` (conflicts Part 4).
- **0.2 Older import path fixed** for `sbrd_documents` (`db.js` `importData`, L979).
- **0.3 Format versioning** (A §10).
  - The envelope keeps `version`. Import gains an ordered list of migrations, `migrateContents(v1 -> v2 -> ...)`, applied before validation, so a file of any past version is lifted to the current one.
  - A fixture of each past version lives in the repo and is restored in tests.
  - This lands before any schema change.
- **0.4 IndexedDB `onversionchange`.** An open tab closes its connection and says so when another tab upgrades the database (C14). Today an upgrade would stall.

**Added:**
- **0.5 A test harness** (Vitest, dev dependency only, nothing shipped). It covers pure logic only: backup migrations, the parsers, letter assignment and the id counter. The app has no tests today.
- **0.6 An automatic backup before any migration.** Before a database upgrade runs, the app writes a `.parliament` backup and offers it as a download, so there is a way back.

**Check:** restore a backup containing branches into a database that already holds them, and confirm notes and highlights still point at the right messages.

---

## Area 1. Data model, numbers, migration, cross-window signals

This is the area most likely to raise questions. **The migration is shown to you
as a dry run before it touches your data** (rule 7). See 1.6.

**Kept:**
- UUIDs as primary keys everywhere, so nothing that references a record breaks.
- Messages, files, documents, rooms (mode files) and library stores, unchanged.
- Existing `parentId`, `branchPoint` and `familyId` fields stay as history. They are no longer the source of truth for branching.

**Added:** new stores and fields, in database version 6.

| Record | New or changed | Shape (sketch) | Spec |
|---|---|---|---|
| `dockets` store | new | `{id, num, title, createdAt, updatedAt, pinned, tags, archived, branches: [{letter, name, createdAt, deletedAt?, forkedFrom?: {chatNum, step}}], order: [letters], nextLetter}` | D §1, §2; A §3 |
| `runs` store | new | `{id, docketId, n, createdAt, cost, branches: {[letter]: {status, room, steps: [{prompt, room?, model, status, chatId?, tokens?, cost?}]}}}` | D §1; C1 |
| conversations | fields added | `num`, `docketId`, `branch` (letter), `run` (n). Every chat belongs to a docket (C18) | D §4 |
| notes, highlights | fields added | `num`, `pinned`, `tags` | C17, A §3 |
| settings | new keys | `nextNum` (starts at 201, no ceiling), `schemaVersion` | C17 |

Rules, each with a unit test:
- **1.1 One number space.**
  - Chats, notes, highlights and dockets draw from one counter, starting at 201 and never reused.
  - A deleted item's number is retired with it, so `open:207` always means one thing.
- **1.2 Letters.**
  - A to Z without I and O (24 letters), then AA, AB and so on.
  - A letter is assigned at creation and never reissued: `nextLetter` only moves forward (D §2).
  - Moving a branch changes `order`, never a letter.
- **1.3 Statuses.** `ready`, `running`, `done`, `waiting`, `paused`, stored as themselves (S1).
- **1.4 Room lives on the branch inside each run**, and a step stores one only when it overrides (C1).
- **1.5 Steps from turns.**
  - In a chat that belongs to a docket, the Nth user turn is step N of that branch in that run.
  - A step that has produced a turn, or started and was halted, is locked (D §1, v12).

**1.6 The migration** (database version 5 to 6):
1. Each **branch family** (conversations sharing a `familyId`, or linked by `parentId`) becomes one docket.
   - The root chat is branch A and each fork takes the next letter in creation order, all in run 1 (C18).
   - Forks record `forkedFrom` with the step derived from `branchPoint`.
2. Each **chat with no family** becomes a docket of its own, with that chat as branch A, run 1.
3. **Numbers** are assigned to every chat, note, highlight and docket in creation order, from 201.
4. Each **favorited message** becomes a highlight of the whole message, pinned (C20). The `favorites` records stay in place, read-only, until you approve retirement R6.
5. The **scratchpad** homepage text (settings key `scratchpad-text`) becomes a note, so it survives the Study going.
6. Docket titles come from the root chat's title.

How you see it first:
- **Dry run.** A dev-only screen reads a `.parliament` backup file, runs the migration in memory, and shows a report:
  - every docket it would create, with its branches
  - every number it would assign
  - every favorite and note it would convert
  - anything it could not place

  Nothing is written.
- **Your go-ahead**, then the real upgrade, with the automatic backup from 0.6 first.

**1.7 Cross-window signals** (C14):
- **BroadcastChannel.** A small bus on `BroadcastChannel('parliament')` carries messages such as `{type: 'changed', kind, num}`, `{type: 'stop', scope}` and `{type: 'hello', tabId}`. It carries ids and signals only, never content or keys.
- **Web Locks.** Only the tab holding a docket's lock executes it.
- **Stale tabs.** When another tab writes a record this tab is showing, the record's marginalia says this tab is stale, rather than reloading under your hands (A §10).

**1.8 Backup format version 2.**
- The backup adds `dockets` and `runs` and the new fields.
- The migration from 0.3 lifts version 1 files by running the same steps as 1.6, so an old backup restores into the new model.

**Check:** the dry-run report against a fresh backup of your data. Then, after the upgrade, every chat is in a docket and every number is unique.

---

## Area 2. New chrome and the command bar

The command bar is the spine (brief). It is built once and mounted on every surface.

**Kept:**
- Rooms and `RoomShell`, drawn with their own schemes inside the room (ruling 9).
- Routes `/chat/:id`, `/settings`, `/edit`, `/build`.

**Changed:**
- **2.1 Chrome tokens** are taken verbatim from the mockups' `:root`:
  - paper `#FCFCFA`, ink `#191919`, ink-2 and ink-3, borders, gold
  - navy and hatching for command mode, bone ruling for prompt mode
  - the serif stack for marginalia, and mono for ids

  They are scoped to app chrome, so room schemes are untouched. Gold is used only for the live action: the engaged search field, focus, and hover on the one thing that acts (v30 L69).
- **2.2 Structural dotted borders**, drawn as the mockups draw them (an SVG overlay sized to the element's perimeter). There is no progressive dash and no key element (C5).

**Added:**
- **2.3 Parser module**, with tests:
  - leaders at position 0, case-insensitive: `>`, `command>`, `p>`, `prompt>`, `s>`, `search>`
  - `normLine` (a bare verb name runs, so `reset` and `reset:` are the same)
  - `cmdOf`
  - `idsIn` for row ids and `addrsIn` for addresses (A §3). Both use the C17 number rules, with no 3-to-4-digit cap.
  - filter lines (commas OR, repeats AND, a leading `-` negates, a later scheme replaces an earlier one)
- **2.4 Verb registry.** One array of verbs, each declaring:
  - `s`, `sig`, `eg`, gloss and group
  - which surfaces it appears on and which noun class it takes
  - `pre()`, which returns the Enter-line text or `{bad}`
  - `run()`

  The Enter line, Tab completion, the `?` panel and the docs are all generated from it (D §6). Surfaces register their own vocabulary (A §4). A verb cannot be a filter on one surface and an action on another (S10).
- **2.5 The field.**
  - One text buffer in three modes: search (drawn pill), command (navy), prompt (bone ruling).
  - Built exactly to v30's `.sfield`, including the pill, the magnifier and quill, and the hatching (C5).
  - Command keeps its `>`; prompt swallows its `p>`; Escape walks back down (A §1).
- **2.6 The Enter line.**
  - One reserved line under the field that changes what it says instead of appearing (A §2).
  - Semicolon-separated, and trimmed from the end so it never wraps.
  - At rest it shows `/` and ⌘K on every surface (S6).
- **2.7 Routes in.**
  - ⌘K / Ctrl+K from anywhere, including inside text fields.
  - `/` when the cursor is not in a text field.
  - `?` and `help` open the reference panel.
  - Also fixes the double Cmd/Ctrl+Shift+B binding (conflicts Part 4).
- **2.8 Reference panel**, per v30: grouped, walkable with arrow keys, no totals, and a count only while narrowing (A §4).
- **2.9 Navy rule.** It is shown permanently on the addressed surface and designed as frame, not alert (A §7). A popped panel does not wear it; a popped surface wears its own.
- **2.10 Bar placements.**
  - **Inline:** one card, travelling under the selected line.
  - **Detached strip:** more than one card.
  - **Parked:** `bar:top` or `bar:foot`.
  - **Popped:** `bar:pop`.
  - `bar:left` and `bar:right` make it square (D §5, A §4).
- **2.11 History.** ↑ and ↓ recall earlier lines, kept in IndexedDB.
- **2.12 Generated verb reference.** A script writes `docs/verbs.md` from the registry, so the docs cannot drift (D §6). A docs site and a `docs:` verb come later.

**Check:** on every surface, ⌘K from inside the chat composer opens command mode. `?` lists the verbs. The Enter line previews each verb before Enter.

---

## Area 3. Almanac

**Changed:**
- **3.1 `/` becomes the Almanac** (ruling 8).
  - The Study stays reachable behind a flag until retirement R3 is approved.
  - The Almanac is an app surface, not a mode file (C21).

**Added**, built to v30:
- **3.2 The table.**
  - Columns: type, id, title, room, tags, added, last active, exactly as v30 has them. Layout changes need discussion (A §9).
  - The id column cannot be hidden (`cols:-id` refuses) but can be dragged anywhere.
  - Pinned rows lead.
  - Kind pills: blue chat, purple note, pink highlight, teal docket.
  - Room is a column in the table and marginalia elsewhere (S12).
- **3.3 Filter schemes:** `type:`, `room:`, `tag:`, `model:`, `from:`, `in:`, `has:`, `cost:`, `since:`, `until:`, `sort:`, and bare words.
  - `from:` covers a chat or docket, a branch across every run (`from:201B`), or one run (`from:run 3`).
  - Branches are not rows. Typing an address finds them, and they appear as rows only under a grouping mode (C17).
- **3.4 Kept searches rail**, with `save:`.
- **3.5 Collection panel and working set**, with `add:`, `rm:`, `co:`, `name:`, `clear:`, `compare:` and `export:`.
  - The Prompt/Send trigger and its composer are removed on trial. `p>` carries the ticked rows instead (ruling).
  - Containers render their contents live, by pointer (v30 header).
- **3.6 Peek and read:** `peek:`, `read:` and `note:`.
- **3.7 Row verbs:** `pin:`, `rename:`, `archive:`, `copy:`, `dup:`, `forget:`, the tag verbs and `cols:`.
  - `forget:` removes a row, so it goes through undo and never deletes anything past a run.
- **3.8 Layout verbs:** `layout:`, `move:`, `swap:`, `hide:`, `show:`, `reset:` and `refresh:`. Three slots; the table always takes the flexible column. Stored in IndexedDB and included in backups (C13).
- **3.9 Pop-out.**
  - `pop:` a panel, or `pop:alm` for the whole Almanac, from anywhere, including from a chat (ruling 8).
  - The popped window is drawn by the opener's React tree through a portal, so it shares live state. Document Picture-in-Picture is used for always-on-top where the browser has it.
  - When the opener closes, the popped window is told so (A §10).
  - A popped Almanac can run (C6).
- **3.10 Almanac export** of selected rows as markdown or JSONL (v30 L1866). This is read-only and separate from the backup (C25).
- **3.11 Go-to verbs:** `alm:`, `lab:` (to `/edit`) and `sym:`.
- **3.12 Narrow layout.** Below the floor, panels stack vertically rather than squeeze (A §9).
- **3.13 v30 leftovers are not built:**
  - the `launch()` "never runs" toast (S11)
  - the ready dot (C3)
  - gold marginalia on hover (C4)
  - `open:` with `idsIn` (C10)
  - "stopped" (C11)

**Check:** your own data, migrated, in the table. Filter, pin, collect, export, and pop the table onto a second screen.

---

## Area 4. Docket

**Added**, built to v12 with its header's divergences resolved toward the spec:
- **4.1 Route `/docket/:num`.** `open:201` and `open:201B` lead here, with B addressed.
- **4.2 Cards.**
  - A card is a docket at a run, with a cap of three; a fourth closes the oldest.
  - Clicking a card addresses it. A pip opens that run as a card beside this one.
  - Record cards; chrome that states the card's state once.
- **4.3 Branch lines.**
  - Letter, name, the room on the branch for this run, and steps as ordinals.
  - Marginalia on every step, always (D §8). Steps show a room only when they override (C1).
  - A caret appears on marginalia that opens a picker.
- **4.4 Editing within a run.** Only `ready` and `waiting` steps are editable. `done`, `running` and `paused` are fixed.
- **4.5 Verbs:**
  - `new:step`, `new:branch`, `new:run`
  - `hold:` (sets `waiting`) and `move:` (`move:201C after 201A`)
  - `delete:` (the letter is never reissued), `open:`, `close:`, `diff:off` and `bar:`
  - `run:` and `stop:` arrive in area 8.
- **4.6 Status marks.** Pills on the docket and dots in dense lists (C2), sharing one vocabulary. `ready` is silent.
- **4.7 Diff between runs of one docket.** A change bar in the gutter and a word wash, in ink only, on both cards. Editable steps show the bar only. This reuses the existing LCS `wordDiff` (`src/components/core/sbrd/diff.js`) if it gives the same result as v12.
- **4.8 Opening a docket enters command mode.** Escape goes to prompt, where the docket rests (D §5).
- **4.9 Empty-docket first-run help**, which dismisses itself when you type (D §6).
- **4.10 Narrow layout.** Cards stack, and the diff marks survive (D §9).

**Check:** a migrated branch family, opened as a docket. Open run 1 and a new run side by side and edit a step in one.

---

## Area 5. Symposium, first pass

The room-to-room flow still needs design (ruling 11). This pass wires the chat
surface into the new model without deciding its final shape.

**Kept:**
- `/chat/:id` renders through `RoomShell` in the chat's room.

**Changed:**
- **5.1 Chats open by number** (`/chat/207`). UUID links still resolve.
- **5.2 The command bar** is mounted in the chat, resting in prompt. ⌘K reaches command mode from inside the composer.
- **5.3 Typing freely appends a step** to the current run of the chat's branch (D §3.2).
- **5.4 Forking writes a branch into the chat's docket.**
  - Steps up to the fork point are copied, and the branch carries `forked from chat 251, at step 2` in its marginalia (D §3).
  - The existing branch panel (`BranchCreationPanel`) is restyled and pointed at this.
- **5.5 `new:chat`** creates a docket and its first chat, using two numbers (ruling).
- **5.6 `new:branch 207`** forks from the end of 207 into its docket (C8).
- **5.7 The compressed-summary branch** stays, as a branch whose first step is the summary. Tell me if it should go instead.

**Not in this pass:**
- the flow from room to room
- opening tabs for multi-room runs (C7)
- comparing inside the Symposium

Before that work starts, I export standalone HTML snapshots of the current chat screens for you to design against.

---

## Area 6. Multi-provider and the answered-by picker

**Kept:**
- The provider interface in `src/providers/base.js`, and its cost shape (`metered` or `free-local`).

**Changed:**
- **6.1 Key store.** It holds one encrypted key per provider, each encrypted the same way as the Anthropic key today. Settings gets a keys section.
- **6.2 Anthropic model list** updated to the current lineup. Each model carries a fixed cost mark (×15, ×3, ×1) as A §8 intends. Which models appear is your call (C26).

**Added:**
- **6.3 Mistral provider.** The browser check is pending (see "Checks before building").
- **6.4 Ollama provider.**
  - No key, and a model list read from the local server.
  - Settings shows the one line needed to allow this site (`OLLAMA_ORIGINS`).
  - The cost mark is `free`.
- **6.5 The answered-by picker.** Three groups: models, local models, and sources (0 tokens). The order inside each group is by cost mark (S2 as amended).
- **6.6 CSP** adds each provider's host as it ships (CLAUDE.md).

---

## Area 7. Sources

**Added:**
- **7.1 Source manifests.**
  - Declarative JSON: id, name, roles (responder, material, trigger), endpoint template, response mapping, render shape, host.
  - Nothing in a manifest executes (A §8).
  - A source that needs code is an Integrator component, not a source.
- **7.2 The three render shapes:** article, results list, record.
- **7.3 First sources:** Wikipedia (summary endpoint, full article on request, CC BY-SA attribution with revision id), Hacker News via Algolia, and OpenAlex.
- **7.4 A cache in IndexedDB**, used aggressively as A §8 asks.
- **7.5 Api-User-Agent** in place of User-Agent for Wikimedia (C16).
- **7.6 CSP** gets one host per shipped source.

**Later, not in this refactor:**
- the Guardian
- arXiv, Europe PMC, Open Library, Openverse and Wikidata, unless one proves trivial once 7.1 exists
- Kiwix on localhost
- auto-lookup ("the reference answer is already there when you stop typing")

---

## Area 8. Execution

**Added:**
- **8.1 `new:run`** copies the current run's plan forward. Paused steps come across as `ready` (v12).
- **8.2 `run:`**
  - One address at a time, governed by `RUNPOL = {max: 1, ranges: false}`, with the Enter line generated from the policy (A §5.3).
  - `run:201B` runs in the current run if B has not run there, and otherwise makes a new run. The Enter line says which (S4).
  - Before Enter it states steps, rooms, models, and cost where it can be computed without a call (S7).
  - It skips paused branches and says so.
- **8.3 The runner.**
  - Executes a branch's steps in order, as turns in that branch's chat for this run.
  - Runs in the tab that holds the docket's lock (1.7).
  - Opens no tabs yet (C7).
- **8.4 `stop:`, `stop:201B` and `stop:all`.**
  - `stop:all` crosses windows over the channel.
  - A step halted mid-flight becomes `paused`, locked, with its spend shown.
  - Stopping is not undoing, and the Enter line says so before you commit.
- **8.5 `undo:`**
  - Covers plan and record changes: steps, branches, moves, renames, parking, collections, pins, layout.
  - Stops at execution, with A §5.4's wording.

**Check:** run a two-branch docket, stop one branch mid-step, confirm it shows `paused` with its cost, and confirm `undo:` refuses past the run.

---

## Design steps owed (not in this plan)

Each gets its own step, with standalone HTML snapshots of the current screens
exported for you to design outside Claude Code:

1. **The Symposium room-to-room flow**, including popping out and comparing.
2. **The Lab, wizard and editor** (`/edit`, `/build`, `/edit/:roomId`).
3. **Settings.** In this plan it only takes the new tokens; a real redesign would be a later step. Tell me if Settings should wait entirely.

---

## Retirement proposals

Nothing below is removed until you approve that line. Approved items move to
`src/deprecated/` or go behind a flag first, and are removed only when you say so.
Stored data is never dropped: stores stay readable so old backups still restore.

| # | What | Where | Why | Proposed handling |
|---|---|---|---|---|
| R1 | Blueprint homepage section | `src/catalog/entries/blueprint.jsx`, `blueprint-render.jsx`, `src/lib/blueprintShapes.js` | Ruling 1: the blueprint goes | Move to `src/deprecated/` after area 3 lands |
| R2 | Blueprint overlay and its Cmd/Ctrl+. shortcut | `src/components/BlueprintOverlay.jsx` | Same | Move to deprecated; free the shortcut |
| R3 | The Study: the homepage view and seeded homepage mode | `src/views/HomepageView.jsx`, `home_default` seed in `db.js`, `/edit-home` route | Ruling 8: the Almanac replaces it | Flag off after area 3; keep the mode record in the database |
| R4 | `/chats` selector | `src/views/SelectorView.jsx`, `SelectorLayout.jsx`, route `/chats` | Ruling 1: the Almanac replaces chat history | Route redirects to `/`; files to deprecated |
| R5 | Homepage Chats section | `src/catalog/entries/chats.jsx`, `chats-preview.jsx` | Same | Deprecated with R3 |
| R6 | Favorites | `favorites.jsx`, `favorites-preview.jsx`, `AnnotationsContext` favorite functions, the heart icon on messages | C20: folded into pins | UI goes after migration 1.6; the `favorites` store stays read-only for old backups |
| R7 | Other homepage-only sections | `quick-stats.jsx`, `recent-activity.jsx`, `scratchpad.jsx` (all `surfaces: ['homepage']`) | No homepage to live on | Deprecated with R3. The scratchpad text becomes a note first (1.6) |
| R8 | Homepage Library section | `src/catalog/entries/library.jsx`, `library-preview.jsx` | No homepage; the Lab already has a Library mode (`EditorLibraryMode.jsx`) | Deprecated with R3; the Lab's copy stays |
| R9 | Homepage top bar | `src/components/HomepageTopBar.jsx` | Replaced by the command bar | Deprecated with R3 |
| R10 | Older `.apb` and JSON export in Settings | `SettingsView.jsx:759,782`, `db.js` `exportAllData` | One restorable format (C25) | Remove the export buttons; keep importing old files for good |
| R11 | Homepage-scope mode files and `/edit-home` | `scope: 'homepage'` in `modes.js`, `EditorView scope="homepage"` | No homepage room (C21) | Flag off; decide with the Lab work |
| R12 | Old chrome styles | `index.css` rules for the Study, `/chats`, the top bar and old gold states | Superseded by the new chrome (ruling 5) | Removed file by file as each surface is rebuilt, each listed in its commit |
| R13 | "Pin for reference" label on messages | `messages-render.jsx` | "Pin" now means the row annotation (C20) | Rename in the UI only (to "carry to" or your word); the data stays |

---

## Network check results

Checked 23 September 2026 with live requests from origin `https://example.netlify.app`,
plus vendor docs and source code.

| Service | From a browser | Conditions | CSP host |
|---|---|---|---|
| Mistral | Yes | `access-control-allow-origin: *` on the preflight and on error responses; `Authorization` is allowed. No official statement about browser use either way. Keyed streaming not yet tested | `https://api.mistral.ai` |
| Ollama (local) | Chrome and Firefox: yes. **Safari: no** | The user sets `OLLAMA_ORIGINS` to Parliament's origin and restarts Ollama. **Chrome** (since 142) shows a one-time local network permission prompt. **Firefox** is rolling out the same prompt. **Safari** blocks an HTTPS page from calling `http://localhost` at all | `http://localhost:11434 http://127.0.0.1:11434` |
| Kiwix (later) | Same as Ollama | Current `kiwix-serve` sends `Access-Control-Allow-Origin: *`. Search returns XML, not JSON | the user's port on localhost |
| Wikipedia | Yes | Send `Api-User-Agent` (C16). Use `en.wikipedia.org/w/rest.php/v1/search/page` for search: the `api.wikimedia.org` core API is being deprecated | `https://*.wikipedia.org` |
| Hacker News (Algolia) | Yes | None | `https://hn.algolia.com` |
| OpenAlex | Yes | **Keyless use has a daily budget of about 100 searches.** A free key raises it tenfold. The old `mailto` polite pool is gone | `https://api.openalex.org` |
| Wikidata (later) | Yes | Only with `origin=*` on the request | `https://www.wikidata.org` |
| Open Library (later) | Yes | None | `https://openlibrary.org` |
| Europe PMC (later) | Yes | None | `https://www.ebi.ac.uk` |
| Openverse (later) | Yes | Anonymous use is throttled lower | `https://api.openverse.org` |
| arXiv (later) | **No** | No CORS headers at all. It cannot be reached without a server, which the no-backend rule forbids | none |

What changes in the plan:
- **6.4 Ollama.**
  - Settings explains the `OLLAMA_ORIGINS` line and the browser prompt.
  - On Safari the picker shows local models greyed out, with the reason, rather than hiding them (A §4, "grey out rather than hide").
- **7.3 OpenAlex.** Works keyless. Settings takes an optional free key (encrypted like the others), and the Enter line or source marginalia says when the day's budget is spent.
- **arXiv** leaves the "later" list unless you accept a server. Suggest dropping it.
- **Mistral streaming** gets a keyed test at the start of area 6. If it fails, that comes back to you.
