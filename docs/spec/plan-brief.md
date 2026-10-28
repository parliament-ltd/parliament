# Plan brief

The analysis behind the next refactor plan. Written 11 October 2026 at the end
of a long session, so a new session can write `refactor-plan.md` without redoing
the reading. Read `README.md` in this folder first for the list of documents and
which one wins.

This is a brief, not the plan. Everything marked **suggestion** or **question**
is waiting on Stefan. Code facts marked "confirm in research" are to be checked
against the audits in `research/` before they go into the plan.

## 1. Where the work stands

- **Branch:** `claude/almanac-docket-inventory`, cut from `main` at ae464a3. Nothing is pushed. `main` has not moved.
- **Done and committed:**
  - Phase 0 inventory (`inventory.md`), with rulings 1 to 11.
  - Phase 1 conflict register (`conflicts.md`): S1 to S12 confirmed, C1 to C26 ruled, C27 to C36 open.
  - Phase 2 plan of 24 September (`change-plan.md`): order, Vitest, model lineup, number-only links, one-by-one retirements all approved.
  - **Area 0, safety:** merge restore keeps references (`src/lib/restorePlan.js`), older import fixed, backup format chain (`backupMigrations.js`, `backupFormat.js`, fixture and tests), other-tab upgrade handling, `UpgradeGate` (backup offered before a schema upgrade), Vitest.
  - **Area 1, planning half only:** `src/lib/addresses.js`, `docketModel.js`, `migrations/v6Plan.js` (pure plan of the schema 5 to 6 migration), the dev-only dry run at `/dev/migration`, `bus.js`. 34 tests pass. **The database is still at version 5. Nothing has migrated.**
  - Nine design snapshots of the app as built, in `docs/design-snapshots/`.
- **Waiting on Stefan since September:**
  - The migration dry run on his real data. He said he would come back to it.
  - C27 to C36 (Settings). Some are now settled by the new documents; see section 4.
  - Whether CLAUDE.md may list the newer spec files. It still names four.
- **New on 11 October:** nine more spec files (see `README.md`), this brief, and code audits in `research/`.

## 2. What Stefan asked for on 11 October

In his words, condensed:

1. Take every document into account, and mind the dates, since some are iterations of others.
2. Check the current code, this chat's history, and the new documents.
3. Write a thorough plan to refactor and evolve Parliament. The work stays on a branch.
4. Say which parts of the current code may no longer be used.
5. Make sure new changes take security and privacy into account.
6. Salvage and add on rather than rebuild.
7. Where something should be rebuilt because software or best practice has moved on, say so, and discuss it.
8. Ask questions along the way.

Standing rules from the original brief still apply:

- Nothing is deleted without approval, item by item. Prefer `src/deprecated/` or a flag.
- Stop and ask when anything is unclear. Propose, then act. Each phase ends with a checkpoint.
- Small commits on a branch. Never push to the live site.
- Do not change the Almanac table layout without discussion.
- Copy is sentence case with no em dashes (the welcome letter's signature dash is the one exception, by decision).
- Never run a migration or schema change without showing it first. Format versioning comes before any schema change (done in area 0).

## 3. What the new documents change

### The model (arrangements doc, 28 September)

| Word | Means | In code |
|---|---|---|
| Arrangement | What is on your screen or screens, popped windows included. What used to be a page | new |
| Board | Something built from blocks: Almanac (or History), Library, Collection, Docket, Reflection, Settings, and every room | new registry |
| Room | A board built around a conversation: one messages block, one input block | mode file, `RoomShell` |
| Block | A piece: messages, input, highlights, notes, contents, the table, the filter rail | "component" in code, the catalogue and the mode file |
| Block feature | Something a block can do, set with `set:`. Web search, voice input and file attach are features of input | new field on catalogue entries |
| Theme | Colour and type inside a room | "scheme" in code and the mode file |
| Layout | Where blocks go inside a room | unchanged |

**Decided there:**
- Pages are arrangements. Anything can be opened, closed, moved or popped at any time from the command line.
- The Library, Collection and Docket are boards, shipped prebuilt and editable in the Lab like any room.
- The Lab is an arrangement of two boards, Library and Canvas. No drag and drop. No inspector. No holding tray. The guide lives in the Lab (`new:room guided`) and each answer writes a command.
- Every user-facing noun lives in one copy table, so a rename is a one-file change.
- Customisation is never required. Ship sample sets. `reset:` returns a shipped arrangement to its default.
- Dropped with the homepage: the blueprint and its overlay, the room spotlight, quick stats, recent activity.
- `backup:` and `restore:` open their windows. `summarize:`, `settings:`, `resources:`, `new:room`, `duplicate:`, `tour:`, `inspect:`, `theme:`, `name:` decided as verbs (several since changed; see section 5).
- Restore collisions: identical items are skipped; an item with a colliding id and different content comes in as a copy with a new id, every reference inside the backup is rewritten, and its marginalia says "restored, was 207". The preview gives counts first.
- Backup categories: window arrangements become an option; homepage configuration is dropped.
- Performance rules belong in the block contract from the start: each block subscribes only to the data it shows, streaming must not re-render neighbours, no broadcast repaints, row virtualisation and IndexedDB indexes for large tables, lazy loading of blocks not on screen.

**Proposed there, not confirmed:** the Almanac is an arrangement whose middle board is called History; one level deep (boards never go inside rooms); the docket's step list is a block a room can carry; execution becomes a declared `execute` capability; floors (the command line is part of the shell, the Lab cannot edit its own arrangement, at least one arrangement contains a room); Favorites become a collection; tags keep who made them; `home:` and `home:set`.

### The first run (welcome docs, 30 September and 6 October)

- One large card: a letter from So Lov, numbered steps in the same serif, and the field. Each step is a real command and the screen rearranges as you go. No tour card.
- Eight steps in v8; v9 adds two (strike through a line; leave the AI a note).
- Without a key, prompts are answered from Wikipedia. So a keyless source has to work before the welcome page can.
- When the steps are done, "Welcome" becomes "Welcome / to Parliament" and one line offers `focus:`.
- A footer: "Created with Claude Code · Open source on GitHub · Looking for other builders". The welcome spec itself doubts "open source" (possibly Business Source License).
- An advanced list (`list:advanced`) of eleven steps, ending in `new:block`, which opens a resources card on writing a block.
- No page hatch and no dotted borders. Both are retired. Cards carry a faint lift shadow only.

### Editing in place (6 October)

- Every reply and every prompt is editable in place. Deleting strikes instead of removing. Typed words are yours, in blue. A replacement is one edit with one id.
- Each edit is a card in the Collection. Undo is on the card; the browser's undo is off in replies.
- A reply becomes a list of blocks (id, type, text). Anchors point at a block id and an offset. `/` at the start of a line formats it. Formatting is never an edit and never reaches the model.
- **Edits go to the model with the next prompt by default**, once, as a note of what changed. "Hold back" keeps one yours. The line under the field counts what will go. This reverses welcome v9.
- Asks: a typed instruction tied to a passage or a point. The answer lands in place, in green, with accept or undo.
- Branches each keep their own edits, asks, and their own copy of the first prompt. Reply to one branch or all.
- Text from a keyless source can be edited and asked about; those go to a model you choose (`helper:`), never to the source.
- Ripple, off by default: when edits are sent, a model call checks the other branches and suggests the same change, in rust, reviewed one at a time.
- `collab:` replaces Parrots and the Collaboration Mode modal: saved standing instructions, five built in plus your own, stacking in the order ticked.
- Reflection is its own board that reads a chat and its markings and never writes. Sweeps apply a collab's rule across a reply or branch as suggestions.
- `focus:` keeps a set of boards you choose; `calm:` shows less detail until you are near it.
- Legibility: marginalia at 62% ink and 11.5px, darker `ink-2` and `ink-3`, a distinct underline per mark, visible keyboard focus, reduced motion respected.
- The in-chat Review modal is not replaced. It is to be reviewed separately.

### The bar (7 October, updated 9 October)

- One field, three modes. 40px tall, 14px corners. Fills wipe in from the left over 280ms.
- **In a room the field rests in prompt mode and is docked at the foot of the screen.** Its placeholder is "Reply to 201a" and its marginalia reads "collab: none · to 201a · all three". The mockup has no other composer.
- Clicking into a reply minimises the field to a 40px hexagon at the centre; `pop:left`, `pop:right` and `pop:center` choose where it lands. Hover, click or Cmd/Ctrl+K opens it again in the mode it was left in.
- Escape in a room: command goes to prompt; prompt with text clears; an empty prompt goes back to editing.
- After a command runs, the field resets to `>` and keeps focus.
- An old verb typed into the field answers "That verb is now …".
- Gold only on the `api:` ignition, and on the hexagon's edge on hover.
- No hiding the bar.

## 4. Earlier rulings the new documents reverse, settle or extend

| Earlier | Now | Source |
|---|---|---|
| C5: the structural dotted border stays wherever the mockups draw it | Dotted borders and the page hatch are retired. No SVG border engine is needed. Lab v7 still draws them; it predates the decision | welcome spec §2, 30 Sep |
| C4, unruled: marginalia stays ink on hover | Not settled. Welcome v9, Lab v7 and Settings v1 turn marginalia gold-deep under the pointer; inline editing v5 keeps it ink with an underline, and the bar decisions say gold only on the ignition. Now part of C50 (corrected in section 13) | Settings §4, v5, bar decisions |
| C17: four kinds take a number | Edits, asks, Ripple suggestions and sweep suggestions also take numbers from the same counter ("ask 241", "edit 242", "ripple 244"). `type:edit` is a filter | editing spec, bar doc |
| C20: each favourite becomes a pinned highlight | **Proposed:** favourites become a collection called Favorites, in their existing order. `v6Plan.js` still does pinned highlights. Needs a ruling | arrangements §7 |
| C21: the Almanac is an app surface, not composed from parts | Boards are built from blocks and are editable in the Lab. How soon is a staging question (section 9) | arrangements §2 |
| C29: which shortcut the hint shows | Settled: `/` jumps to the field when no other text field has focus; Cmd/Ctrl+K works anywhere, including inside a reply | bar doc |
| C30: a popped command line wears no rule | Consistent with everything since | Settings §7 |
| C32: leave desks out until `arrange:` exists | An arrangement includes popped windows (decided), but the 7 Oct inventory still lists `arrange:` as deferred | arrangements §2, bar doc |
| `open:settings` as the one named place `open:` accepts | No longer an exception: every board opens by name (`open:library`, `open:collection`) | arrangements §4 |
| Inventory ruling 11: the room-to-room flow still needs design | Partly supplied: branch tabs, reply to one or all, edits per branch. The mockup that draws it (branch slider v9) was not supplied | editing spec |
| Lab, wizard and editor out of scope | In scope: the Lab is designed (v6, v7), and the wizard becomes a guide inside it | arrangements §5 |
| Area 0 restore: a colliding conversation always comes in as a copy titled "(from backup)" | Identical items are skipped; different ones come in as a copy with marginalia "restored, was 207". With numbers, every restore into a non-empty database collides on numbers, so numbers must be remapped and references to them rewritten | arrangements §7 |
| Change plan 2.2 (dotted border engine), 2.10 (bar placements), 3 (Almanac as one surface), 5 (Symposium first pass) | To be rewritten in the new plan | above |

**Still open from September:** C27 (picker groups; the newer documents describe a numbered multi-select picker but the mockup is missing), C28 (which sources Settings lists), C33 (when to check for Ollama), C34 (cost marks for Fable 5.1 and the Mistral models), C35 (read a backup with no version field as format 1; cheap, do it), C31 and C36 stand.

## 5. Conflicts and gaps inside the new documents

Candidates for `conflicts.md` Part 5, numbered from C37. Each needs a ruling
unless marked settled.

**C37. Is the bar the only composer in a room?**
- Lab v7 (about 29 Sep): Input is a block every room has; it "can sit in any column", with settings for send key and height.
- Bar reference (9 Oct) and editing spec (6 Oct): the field, docked at the foot in prompt mode, is where you reply. "In the product it is the field, addressed to the board like any other."
- **Suggestion:** the bar is the composer. A room's input block becomes the place the bar docks and the holder of the input features. Where web search, file attach and voice input show up (marginalia in the prompt field, as `collab:` and `to:` do?) needs an answer. Decides what happens to `InputArea.jsx` and `input-render.jsx`.

**C38. Lab v6 or v7.**
- The arrangements doc names v6 as current. Only v7 was supplied, and its header says "an alternative to v6, not a replacement. Compare the two."
- v7 adds a third board, Blocks, and a new rule: reversible, local changes apply on click and are echoed under the field with undo; anything that moves, removes, spends or cannot be undone waits for Enter. The arrangements doc decided that every click that changes a room writes the command and waits for Enter.
- **Question.**

**C39. `delete:`.**
- 28 Sep: "Decided. `delete:` is universal: ids, ranges, branches, dockets, rooms." Lab v7 has `delete:"Essay room"`. Docket v12 has `delete:` for steps and branches.
- 7 Oct: "`delete:` stays out of the vocabulary … Sent work is archived, never deleted." `drop:` removes things not yet sent.
- Newer wins, but that leaves no way to permanently remove one chat, note, room or docket except "Delete everything" in Settings. The app can delete a single chat and a single message today. **This is a privacy question as much as a naming one.**
- **Suggestion:** permanent removal of one item must exist. The word, and where it lives, is Stefan's call.

**C40. `name:` or `rename:`.** 28 Sep and 30 Sep say `name:` everywhere. The 7 Oct doc lists it as open and shows `rename:` as current for items. **Suggestion:** `name:`.

**C41. `inspect:` or `peek:`.** 28 Sep decided `inspect:`, no alias. The 7 Oct inventory lists `peek:` (`read:`) as current. **Suggestion:** `inspect:`; the inventory was rebuilt from transcripts.

**C42. `close:` and `open:`, or `hide:` and `show:`.** 28 Sep proposed retiring `hide:` and `show:`; Lab v2 onward and the welcome page use `close:`. The 7 Oct inventory lists `hide:` and `show:` as current. **Suggestion:** `close:` and `open:` for boards; `cols:` for columns.

**C43. Where the bar sits, and the word for it.**
- Almanac §4 and Settings §7: `bar:top`, `bar:bottom`, `bar:left`, `bar:right` (a square), `bar:pop`, `bar:dock`.
- Welcome (30 Sep): `pop:command` lifts the field out and docks it at the foot; "must dock the field on every surface".
- Bar reference (9 Oct): the field is at the foot in a room, and `pop:left`, `pop:right`, `pop:center` choose where the hexagon lands.
- The 7 Oct inventory lists only `bar:top` and `bar:bottom` as current.
- `pop:` otherwise means "its own window". Almanac §4 says a scheme may not differ in kind across surfaces.
- **Question:** one scheme for the bar's position, and its default per surface (top on the Almanac and Settings, foot in a room?).

**C44. The Escape ladder.**
- Almanac §1: Escape goes back to search.
- Welcome v9: prompt, then command line, then search. Backspace on an empty prompt also steps back.
- Bar reference (9 Oct, "this comment wins"): command to prompt; prompt with text clears; empty prompt goes back to editing. Backspace never changes mode.
- **Suggestion:** one rule. Escape steps toward the surface's resting mode; at rest it clears the text; at rest and empty it returns focus to what you were doing. Backspace never changes mode. Welcome step 4 ("esc, then `alm:`") is reworded.

**C45. `hold:` has three meanings.** Docket v12: park a branch (the same command un-parks it). Lab: the holding tray, dropped. Editing spec: `hold:242` keeps an edit from going to the model, `hold:off 242` lets it go. **Suggestion:** one act, "keep this from going until I say": `hold:` and `hold:off` for branches and edits alike.

**C46. `import:` or `restore:`.** Almanac, Settings and the arrangements doc say `backup:` and `restore:`. The welcome page and the 7 Oct inventory say `import:`. **Question.**

**C47. `tour:`.** 28 Sep: decided, tours the current arrangement. 30 Sep: "the tour card and its `tour:` verb are replaced by the steps." 7 Oct inventory: current. **Question.** Until answered: no `tour:`; `list:` brings the welcome steps back.

**C48. `strain:`.** Listed on 7 Oct as current since 20 Sep, "context and storage". No other document defines it. **Question:** what it shows.

**C49. Branch letters: `201B` or `201a`.** Docket and Almanac documents use capitals. Every October document uses lower case. `addresses.js` reads either and prints capitals. **Question.**

**C50. Keyboard focus ring.** Editing spec (6 Oct): a 2px ink outline. Bar reference (9 Oct), welcome v9, Lab v7, Settings: gold-deep. **Question.**

**C51. One token sheet.** `--ink-2` is #787774 (welcome v9), #5F5E59 (editing v5), #45433f (bar reference). `--ink-3` is #9B9A97, #6F6E69, #6b6964. Marginalia is 46% or 62% ink. **Suggestion:** take the bar reference where it defines a value, the editing spec's legibility table otherwise, and show Stefan one sheet to approve before the chrome is built.

**C52. Is the table board called History?** Proposed 28 Sep. But the board strip on 6 Oct lists "Alm:" beside "Sym:", "Col:", "Ref:", "Lib:", "Dkt:". **Question.**

**C53. Boards editable in the Lab.** Decided 28 Sep, but Lab v7 lists `open:` and `edit:` on the Almanac and Docket as "not built here". **Suggestion:** build boards on the block system so they can be edited, ship them prebuilt, and add `edit:` for boards later.

**C54. Welcome steps 9 and 10.** Step 10 is "Leave the AI a note … Note for the AI". The editing spec, which wins, says edits go by default and the note for the AI became `tell:`. **Question:** what step 10 becomes.

**C55. The advanced list needs two keyless sources on day one,** and names Wikipedia and arXiv. arXiv sends no cross-origin headers and cannot be called from a browser (checked 23 Sep; see `change-plan.md`). **Suggestion:** Wikipedia with Hacker News or OpenAlex.

**C56. What gets a row and a pill.** `type:edit` exists as a filter, so edits appear in the table. Do asks and suggestions? What colour are their pills? Heavy editing will consume numbers quickly. **Question.**

**C57. A highlight: a term or a passage?** Today's Highlights block describes "saved highlight terms" with jumps between occurrences (confirm in research). The editing spec's Highlight card is "the passage". **Question** once the audit confirms.

**C58. Rich content inside editable replies.** The block types are text, headings, lists, checklist, quote, code block, divider. Model replies also contain bold, italics, inline code, links, citations, tables and charts. The spec says bold and italic shortcuts do nothing, but not how existing formatting is shown, stored or anchored. **Question;** it shapes the editing engine.

**C59. The Lab v7 catalogue lists a Collaboration block** described as "someone else in the room with you, and what they are looking at", needing the network. That would need a server, which the hard constraints forbid. **Suggestion:** treat it as the old Collaboration mode under a misleading description; it goes, replaced by `collab:`.

**C60. Small ones, suggestions only:**
- `dup:`: no alias (7 Oct beats 28 Sep). `key:`: no alias.
- Cmd/Ctrl+K stays; it is the only way to the field from inside a reply.
- After a run the field resets to `>` everywhere (settles welcome spec §11).
- `open:201a summary` looks like today's compressed-summary branch and `open:201a` like the full-history one. Confirm when the branch slider mockup arrives.
- "Send to branch" and "Pin for reference" on a message have no place in the new documents. Keep until asked.
- Collab scope, sweep reach, Reflection's source, calm by default, focus per room: all listed as open in the editing spec itself.
- The moon in the hexagon may read as dark mode; the bar doc asks for a test.
- `?` in the docket was built as `help:`. `new:api` as an alias is undecided.

## 6. Verbs, reconciled

Status: **ok** (documents agree or the newest is clear), **ask** (section 5),
**later** (out of the first builds). The registry in code should carry a
`RENAMED` map so an old verb answers "That verb is now …", as the bar reference
does.

| Verb | Does | Status |
|---|---|---|
| `>` `p>` `prompt>` `s>` `search>` | Leaders, position 0 only | ok |
| `?` `help` | Every command | ok (`help:` in the docket: C60) |
| `open:` | Bring a board or item here, or focus it. `open:201a`, `open:201a summary` | ok |
| `close:` | Take a board off the screen; nothing is lost | ask C42 |
| `pop:` `pop:back` | A board in its own window, and back | ok; `pop:command`, `pop:left` etc: ask C43 |
| `move:` `swap:` | Where a board sits; `move:201C after 201A` in a docket | ok |
| `arrange:` `arrange:save` | Switch to or save an arrangement; bare shows the screens map | later |
| `reset:` | A shipped arrangement back to its default | ok |
| `focus:` `focus:save` `focus:off` | Keep a chosen set of boards | ok |
| `calm:` `calm:off` | Less detail until you are near it | ok |
| `bar:` | Where the field sits | ask C43 |
| `alm:` `sym:` `lab:` `library:` `settings:` `resources:` | Shortcuts for opening a board | ok; `alm:` naming: C52 |
| `home:` `home:set` | Go home; choose home (Almanac, a room, a docket, or last) | ok (proposed) |
| `jump:` | Scroll to an id on this board | ok (was `go:`) |
| `new:` | chat, docket, room, collection; step, run, branch in a docket; `new:room guided`; `new:block` | ok |
| `edit:` `done:` | Open a board in the Lab; leave | ok |
| `duplicate:` | Copy a room, collection or docket | ok (was `dup:`) |
| `name:` | Name whatever is addressed; with an id, an item | ask C40 |
| `layout:` `theme:` `device:` | A room's shape, colour and type, what it is built for | ok |
| `add:` `rm:` | Into or out of whatever is addressed (room or collection) | ok |
| `place:` | Put a block in a chosen slot | ok |
| `set:` | A block's settings and features; a setting on Settings | ok |
| `inspect:` | One thing in detail | ask C41 |
| `apply:` `compare:` `section:` `clear:` | Collection | ok; the collection itself is open |
| `note:` | A note for people; with no id, a free-standing note | ok |
| `tell:` | A note the model reads with the next prompt | ok |
| `summarize:` | Rewrite an item's summary line; a collection's description | ok; spends tokens, so the Enter line must say so |
| `pin:` `archive:` `copy:` `export:` | Items | ok |
| `tagadd:` `retag:` `untag:` | Tags | ok |
| `forget:` | Remove a saved search or collection | ok |
| `delete:` | Permanent removal | ask C39 |
| `drop:` | Remove something not yet sent: an ask, a pending edit, a queued step | ok |
| `save:` | Keep this search | ok |
| Filters: `type:` `room:` `tag:` `model:` `from:` (`source:`) `in:` `has:` `cost:` `since:` `until:` `sort:` `clear:filters` | Narrow the table. `sort:created`, not `sort:added` | ok |
| `cols:` | Table columns; the id column cannot be hidden | ok |
| `run:` `new:run` `stop:` `stop:all` `diff:` | Execution | ok |
| `again:` | Ask again from an edited prompt as a new branch | ok |
| `to:` | Reply target: one branch or all | ok |
| `hold:` `hold:off` | Keep a branch from running, or an edit from going | ask C45 |
| `undo:` `undo:242` | Take back the last command, or one edit; stops at execution | ok |
| `strikethrough:` | Strike a passage | ok (was `strike:`) |
| `markup:on` `markup:off` | Marks or the clean result | ok (was `view:`) |
| `accept:` `reject:` (`all`) | Settle an answer or a suggestion | ok |
| `ripple:on` `ripple:off` | Carry edits across branches; a call per check | ok |
| `helper:` | The model that reads keyless-source text | ok |
| `collab:` | Standing instructions; `collab:off` | ok |
| `reflect:` `sweep:` | One call each; named before they run | ok |
| `api:` `api:<provider>` `api:new` | The key panel. No key ever in the command line | ok (was `key:`, `add:key`) |
| `backup:` | Back up | ok |
| `restore:` or `import:` | Bring a backup in | ask C46 |
| `list:` `list:off` `list:advanced` | The welcome steps | ok |
| `tour:` | A walk through an arrangement | ask C47 |
| `strain:` | Context and storage | ask C48 |
| `hide:` `show:` `peek:` `read:` `rename:` `dup:` `key:` `go:` `view:` `strike:` `scheme:` `plan:` `co:` `c:` `d:` `docs:` | Old names | answer "That verb is now …" |
| `invoke:` `analyze:` `nav:add` `letter:` | Later | later |

## 7. The current code against the new design

To be confirmed against `research/lab-code.md`, `research/editing-code.md`,
`research/request-path.md` and `research/state-architecture.md`.

### Kept

- Rooms: mode files (`src/lib/modes.js`), `RoomShell`, the four room layouts, the six themes (`schemes.js`), the catalogue contract.
- Lab v7's catalogue shows which blocks stay: messages, input, branches, context health, contents, highlights, notes, comments, review, document canvas, chart canvas, table canvas, scratchpad, file shelf, column inspector, summary dashboard, ripple analysis. It adds a step list block. "Stacked sections" stays as a room layout (today it is homepage only).
- The provider interface (`src/providers/base.js`), key encryption (`crypto.js`), the `.parliament` backup and everything from area 0.
- File parsing and the data workspace blocks.
- The Review modal, for now.
- Area 1's `addresses.js`, `docketModel.js`, `bus.js`, and the dry-run screen.

### Salvaged into something new

| From | Into |
|---|---|
| Secretarybird: `src/components/core/sbrd/*`, `DocumentCanvas`, `DocumentContext` (paragraphs with id, type, text, baseline; word diff; `/` menu; tracked changes; comments with model replies; accept and clear; the Markup switch) | The editing-in-place engine. The editing spec says it builds on this. Its paragraph shape is already close to the spec's block |
| `RippleAnalysis` and its prompt and parsing | Ripple across branches. Same idea, different reach |
| `CollabModal`, `CollabModeContext`: the five presets, whose names match the five built-in collabs exactly; `parrotPersonas` in settings | `collab:`. Presets become built-in collabs; personas become "yours" |
| `ReviewModal`: synthesis call, reflection prompts, session stats, save as Markdown | The Reflection board, when its turn comes. The modal stays meanwhile |
| `BranchCreationPanel`, `db.createBranch`, the compressed-summary path in `branches-render.jsx` | `open:201a` and `open:201a summary`; a fork that writes a lettered branch |
| `editorReducer.js`, `editorHistory.js` (undo and redo, 50 steps), `layoutMigration.js` | The Lab's commands: each verb dispatches a reducer action; undo already exists |
| `EditorLibraryMode.jsx` (the selection "bag", tabs, details), `LibraryOverlay`, `LibraryCard`, `LayoutSilhouette` | The Library board: ticking is the bag; details open in place |
| `EditorCanvas.jsx` | The Canvas, redrawn in the "medium" style |
| `buildWizard.js` (purposes, devices, densities, `deriveLayout`) | The guide in the Lab; each answer writes a command |
| `IgnitionStep.jsx` key validation and `useShimmer.js` | The `api:` panel and its gold ignition |
| `SelectorLayout.jsx` search, sort, pin-first ordering, family grouping, bulk actions | History board filters, `pin:`, `summarize:` |
| `NetworkActivityCard`, `networkLog.js` | The network log grouped by host, each named by who called it |
| `SettingsView.jsx` section logic (storage estimate, reminder, danger zone, key check) | Settings v1 |
| `web-search`, `voice-input`, `file-attach` entries and `ToolToggles` | Features of input |
| `chosenHomeRoomId` setting | `home:set` |
| `BackupRestoreModal` | Opened by `backup:` and `restore:`; categories change |
| The nine design snapshots | A record of everything retired |

### No longer used, if the new design holds

Each is a proposal. R1 to R13 are in `change-plan.md` (blueprint, its overlay,
the Study, `/chats`, the homepage Chats section, favourites, quick stats, recent
activity, scratchpad on the homepage, the homepage Library section, the top bar,
the older export buttons, homepage-scope mode files, old chrome CSS, the "Pin for
reference" label). New candidates:

| # | What | Where | Replaced by |
|---|---|---|---|
| R14 | The build wizard as a page | `/build`, `BuildView.jsx`, `src/components/build/**` (13 wizard files, `TemplateGallery`) | The guide in the Lab; templates in the Library |
| R15 | Tooltip tours and their flags | `TourTooltip.jsx`, `tourCompleted_*` | The welcome steps and `list:` |
| R16 | Drag and drop in the editor | The drag wiring in `EditorView.jsx` and the editor components; `@dnd-kit/*` if nothing else needs it | Commands |
| R17 | The holding tray | `EditorHoldingTray.jsx` and its reducer actions | `rm:` and `undo:` |
| R18 | The inspector | `EditorRightRail.jsx` | The room line, the Blocks board, `inspect:` |
| R19 | The editor's left rail and top bar | `EditorLeftRail.jsx`, `EditorTopBar.jsx` | The Library board, the bar, the room line |
| R20 | The preview sheet | `EditorPreviewSheet.jsx` | Trying the room with `p>` |
| R21 | The layout-swap and apply-room dialogs | `EditorMigrationDialog.jsx`, `EditorApplyRoomDialog.jsx` | The Enter line stating the consequences (confirm against Lab v6) |
| R22 | Collaboration mode's window and block | `CollabModal.jsx`, `collab-mode*.jsx` | The `collab:` picker in the field |
| R23 | Parrots in Settings | The persona editor in `SettingsView.jsx` | "Your own" collabs |
| R24 | Web search, voice input, file attach as separate blocks | Their catalogue entries | Features of input |
| R25 | The room's own composer, if C37 is confirmed | `InputArea.jsx`, `input-render.jsx` | The bar in prompt mode |
| R26 | The branch panel and its shortcut | `BranchCreationPanel.jsx`, `BranchPanelContext.jsx`, `BranchShortcutHandler.jsx` | `open:` with or without a summary, `again:` (pending the branch slider mockup) |
| R27 | The backup status dot and banner | `BackupStatusIndicator.jsx`, `BackupReminderBanner.jsx` | One line of marginalia at the top of the Almanac, in ink, only when it is news |
| R28 | "Automatic" compression, the theme switch, session usage figures | Settings | Removed by the Settings spec |
| R29 | Install and update state that nothing displays | `PWAContext.jsx` | Decide: show it (see section 8) or remove it |
| R30 | Files that appear unused today | `src/views/RoomDemo.jsx`, `src/views/SchemePicker.jsx`, `src/hooks/useMode.js`, `src/catalog/dev-modes.js` | Confirm in research |
| R31 | Old process documents | `refactor/`, `continuation-*.md`, `pr-19g-library-jargon.md`, `.pr-body.md` | Archive, if Stefan wants |

Not retired, but to be rewritten because they will no longer be true:
`README.md`, `SECURITY.md`, the About copy in Settings.

### Rebuild rather than adapt: to discuss

1. **How conversation state is held.** `ChatContext` holds one active conversation and one stream (confirm in research). The new design shows several branches at once, streams into several, draws boards in pop-out windows, and forbids neighbours re-rendering per token.
   - **Suggestion:** small external stores read with `useSyncExternalStore` and selectors, keyed by conversation, added beside the contexts and taken up board by board. No new dependency.
2. **How the editor is driven.** Drag and drop gives way to commands by decision. The reducer and history are sound and stay; the interaction layer is rewritten.
3. **What a reply is.** One markdown string becomes blocks with anchored marks. The engine is the riskiest piece of interface work in the plan.
   - **Option a:** grow Secretarybird's approach. Let the browser edit, then reconcile each input event against the model by common prefix and suffix, turning deletions into strikes. Small, no dependency, and it survives input methods that compose text (Asian-language input, Android keyboards), which cannot be intercepted.
   - **Option b:** adopt an editor framework (ProseMirror or Lexical) with a custom "strike instead of delete" rule. More robust selection and input handling; a large dependency and its own model to learn.
   - **Option c:** the browser's EditContext API. Not in every browser (to verify).
   - **Suggestion:** spike a and b against the same checklist (composed input, Android, undo, selection across blocks, screen readers, paste) before committing. C58 has to be answered first.
4. **Keys and backups.** Backups exclude keys by a blocklist of one settings key. With several providers that will leak. Move keys to their own store and build backups from an allowlist.
5. **Key handling across windows.** Listeners on `document` and lookups by id assume one document. Pop-outs need one shell-level key manager that attaches to each window it draws into.
6. **Chrome and room styles.** `src/index.css` is about 3,300 lines mixing both. The new chrome needs its own token layer, scoped so room themes cannot reach it and it cannot reach rooms.
7. **Dependencies** (confirm in `research/security-audit.md`): the spreadsheet library as published on npm may be unmaintained there with known advisories; `@dnd-kit` and the bundled Inter font may have no users left.
8. **Updates.** The service worker waits for approval that no screen ever asks for. A new version, including a security fix, may not reach an open tab. Surface it as one line of marginalia, which is also where the planned `letter:` notice would sit.
9. **Tooling, optional:** about 120 existing lint errors, no continuous integration. A check that runs tests, lint and build on every pull request would be cheap. Types by JSDoc for the new core modules. Stefan's call.

## 8. Security and privacy

Stefan asked that new changes take both into account. Findings in today's code
are provisional until `research/security-audit.md` is read.

### Rules proposed for the plan

1. **Enter is the only confirmation. Nothing leaves the device before it.** No lookups while typing. Almanac §8 says "the reference answer is already there when you stop typing"; that would send keystrokes to Wikipedia unasked, and should not be built that way.
2. **The Enter line names every recipient before sending:** which provider or source, how many edits and asks go with it, and the cost where it can be worked out.
3. **One gateway for every outbound request.** A board declares what it may do (`execute`, a source, the network). The gateway refuses what was not declared and labels each request with who made it, which is also what the Settings network log needs. Today tiers are "enforced editorially, not in code".
4. **Keys:** their own store; never in a backup; never in the command line, its history, a saved button, or a cross-window message; each sent only to its own provider's host; typed only into password fields.
5. **Text from outside is data.** Model output, source text, pasted text, restored backups and imported room files are shown as text or through the existing markdown renderer, never as HTML, and never read as commands. Pasting into a reply inserts plain text.
6. **The content security policy stays strict and listed host by host:** one host per provider and source, exact localhost ports rather than a wildcard, and the missing baseline directives added (to be listed from the audit).
7. **No user content in addresses or titles.** Links carry numbers (`/207`). Page and window titles carry kinds and numbers, never a chat's title or a search.
8. **Pop-outs** are same-origin windows drawn by the page that opened them. They never navigate elsewhere. External links open with `noopener noreferrer`.
9. **Other people's code does not run inside Parliament.** See below.
10. **Deleting means deleted.** One item can be removed for good (C39). "Delete everything" removes both databases, the caches and anything else left in the browser. Today it leaves rooms, the library and the key store's database.
11. **Claims stay true.** The letter, the README, SECURITY.md and the About copy are checked against behaviour at each release.
12. **The service worker never stores a provider's or a source's response.** Today that rule names only Anthropic's host.

### What each new feature needs

| Feature | Risk | In the plan |
|---|---|---|
| Edits go to the model by default | Struck and added text leaves the device without a per-edit choice | The count line is always shown (the spec already says it is never calmed); hold back per card; sent state on each card |
| Keyless sources | A prompt to Wikipedia is a search sent to a third party, with the reader's address | Named on the Enter line before sending; never on keystrokes; "auto" routing says where the prompt will go |
| Source text shown in a chat | Third-party text rendered in the page | Plain text only. Thumbnails need an image host in the policy; leave them out at first |
| Source text sent on to a model with asks | Text from the web inside a prompt | Mark it as quoted material in the request. Low impact while models have no tools that act |
| Editable replies | Pasted markup; scripts in content | Plain-text paste; no HTML sinks; blocks hold text and a type only |
| Pop-out windows | A window handle to another origin; shortcuts and styles missing in the child | Same-origin blank windows only; portal rendering |
| Several providers | A key sent to the wrong host; keys in backups | Rules 3 and 4 |
| Ollama and Kiwix on localhost | A wildcard port lets the page reach any local service | Exact ports. Chrome and Firefox ask permission; Safari cannot reach localhost from a secure page (checked 23 Sep) |
| The command history | Private text kept on disk | Commands only, not prompts or searches; never a line that looks like a key |
| Collabs and `tell:` | Instructions restored from someone else's backup or room file | Shown in the restore preview before anything is applied |
| Reflection "reads, never writes" | A promise the code must keep | A read-only data handle, enforced by the gateway |
| `summarize:`, Ripple, sweeps, Reflect | Spending without warning | Each names its model and its cost on the Enter line; Ripple stays off by default |
| Restore | A crafted file writing unexpected stores or keys | Allowlist of stores and settings keys; size limits; validators for every new store |
| Window titles and the board strip | Chat titles in the operating system's window list and browser history | Rule 7 |
| Voice input | The browser's speech service may send audio to its maker, which is not "a provider you pick" | Verify per browser; use on-device recognition where it exists; otherwise say so beside the microphone |

### Other people's blocks

The advanced welcome list ends with `new:block`, and its resources card includes
"how to load a finished block". The welcome spec notes "what a block written by
someone else may touch, especially anything near keys" as believed settled
elsewhere. No supplied document settles it.

A block loaded at run time and run inside the app could read every chat, use the
stored key, and send both out through any allowed host or by navigating the
page. The current policy also forbids running such code at all, which is good.

**Suggestion:** in this refactor, a block reaches other people by pull request
and ships in the catalogue after review. `new:block` opens resources for building
one in the repository. Loading blocks at run time waits for its own design, built
on a sandboxed frame with no access to the app's data and a narrow message
interface. Source manifests are different: they hold no code, but a new host
still needs a policy change, so they also arrive by pull request.

### Claims to keep true

- The letter: "each request goes straight to the provider you pick, to a model running on your own machine, or just Wikipedia." Adding Hacker News and OpenAlex makes "or just Wikipedia" incomplete. Voice input may contradict it today.
- The footer: "Open source on GitHub". The repository's licence decides whether that is accurate (in the audit).
- Library resources are labelled "by Anthropic", "@kindred", "@dispatch" in the mockup and in today's homepage. If Anthropic did not write them, the label should not say so.
- SECURITY.md and the About copy still say only Anthropic's host is contacted.

## 9. Architecture, proposed

1. **A shell.** It owns the bar, the board strip, the navy rule, key handling, pop-out windows and the arrangement (which boards are open, where). It is not a board and cannot be removed (the arrangements doc's floor).
2. **A boards registry.** Each board registers a name, short title (`Sym:`, `Col:`), aliases, placement, capabilities, its verbs and its component. Rooms are boards made from mode files. Shipped boards start prebuilt (C53).
3. **Arrangements as data,** saved per device, with shipped defaults and `reset:`. Focus sets per room. Window positions are an optional backup category.
4. **A verb registry.** One entry per verb: name, example, gloss, group, the boards it applies to, what it takes (ids, addresses, board names, block names), `pre()` for the Enter line, `run()`, and flags: spends tokens, undoable, applies on click or waits for Enter. The Enter line, completion, `?`, the renamed-verb answers and the reference document are generated from it.
5. **Stores with selectors** for the new boards, per conversation for streams (section 7).
6. **A provider and source gateway** with capability checks and request labels (section 8).
7. **A copy table** for every user-facing noun, and **one token sheet** for the chrome.
8. **One schema upgrade.** Create every new store in version 6, with one data transform shown in the dry run: numbers, dockets and runs, favourites (per the ruling on C20), the scratchpad note, tag provenance, parrots to collabs, keys to their own store. Later features then fill stores that already exist. One backup prompt and one dry run for Stefan instead of several. **A question for him.**
9. **Messages are not rewritten by the migration.** A reply keeps its original text; blocks are stored the first time it is edited or marked.
10. **A flag for the new shell** while it is built, so the app keeps working and each old screen is retired only when its replacement is approved.

## 10. Milestones, proposed order

Each ends with something Stefan can try, and with its retirements put to him one
by one.

| # | Milestone | Depends on | Needs from Stefan first |
|---|---|---|---|
| M0 | Safety | | Done |
| M1 | Data foundation: revised version 6 plan, dry run on his data, migrate | M0 | The dry run; C20, C39, C49; the one-upgrade question |
| M2 | Shell and bar: tokens, copy table, stores, verb registry, the field with its hexagon, boards and arrangements, pop-outs | M1 | C43, C44, C50, C51; the verb rulings |
| M3 | Rooms in the shell: today's chat hosted as a board, the bar as composer, `collab:` | M2 | C37 |
| M4 | Almanac: the table board, filters, `inspect:`, pins, tags, a first Collection | M2 | C52, C56; the collection board mockup |
| M5 | Providers, keys and sources: gateway, key store, `api:` panel and ignition, the model lineup, Mistral, Ollama, Wikipedia, Hacker News, OpenAlex, policy and header hardening | M2 | C27, C28, C33, C34 |
| M6 | Branches: tabs, several sources at once, reply to one or all, `again:`, `open:` with or without a summary, forks as lettered branches | M3, M5 | The branch slider mockup |
| M7 | Welcome: the first-run page with eight steps, `list:`, the keyless default | M3, M4, M5 | C54, C55; licence wording; the two links |
| M8 | Settings v1 | M2, M5 | |
| M9 | Docket and execution: the board, `run:`, `stop:`, the undo boundary | M4, M6 | |
| M10 | Editing in place: blocks, strike and add, cards, sending, `markup:`, `tell:`, asks; then welcome steps 9 and 10 | M6 | C57, C58; the engine spike |
| M11 | Ripple, sweeps, Reflection | M10 | The open items in the editing spec |
| M12 | The Lab: Library and Canvas (and Blocks), commands, the guide, features of input, catalogue fields | M2 | C38 |
| M13 | `focus:`, `calm:`, arrangements across screens, narrow layouts | M4, M6 | The screens mockup |
| M14 | Close-out: remaining retirements, README and SECURITY rewritten, the generated verb reference, dependency clean-up | all | |

M8 and M12 can run beside the others once M2 exists.

## 11. Questions for Stefan, in order of how much they change the plan

1. **Missing mockups.** Can you send the branch slider (v9), the collection board (v3), Lab v6 and Screens v1? Is `parliament-bar-final.html` the bar reference file you sent?
2. **The composer (C37).** In a room, is the bar the only place you type a prompt?
3. **Lab v6 or v7 (C38),** and with it the rule that small reversible changes apply on click.
4. **Removing one thing for good (C39).** What is the word, now that `delete:` is out?
5. **Boards in the Lab (C53).** Ship them prebuilt and make them editable later?
6. **One schema upgrade (section 9, item 8).** One bigger step with one dry run, or several small ones?
7. **Favourites (C20).** A collection called Favorites, or pinned highlights?
8. **Other people's blocks (section 8).** By pull request only, for now?
9. **The order in section 10.** What do you want to be using first?
10. **The verb rulings:** C40 to C50, most of them one word each.
11. **The editing engine (section 7, item 3) and rich content in replies (C58).**
12. **Tooling (section 7, item 9):** a check on every pull request? JSDoc types for the new core?
13. **Still open from September:** the dry run on your data; C27, C28, C33, C34; whether CLAUDE.md may list the newer spec files.

## 12. What the next session should produce

1. Read `README.md`, this brief, `conflicts.md`, `change-plan.md`, and every file in `research/`.
2. Correct sections 7 and 8 of this brief against the research.
3. Put the questions in section 11 to Stefan before writing anything long. His answers change the plan.
4. Write `docs/spec/refactor-plan.md`, replacing `change-plan.md` (which keeps a one-line pointer to it). For each milestone: kept, changed, added, retired, salvage, security and privacy notes, and what Stefan can try at the end.
5. Add Part 5 to `conflicts.md` (C37 onward) and the new rows to `inventory.md`.
6. Propose the CLAUDE.md update. Do not apply it without approval.
7. Revise `src/lib/migrations/v6Plan.js` and its tests only after the rulings on C20, C39 and C49, and show the dry run before anything migrates.

## 13. Corrections from the research

Added after the audits came back. **Where this section and sections 7 or 8
disagree, this section is right.** Each audit's full report is in `research/`.

### From `research/request-path.md`

- **R23 is wrong.** There is no persona editor in Settings. Personas exist only inside the Collaboration window, as `{ id, title, instruction }` in one settings value, `parrotPersonas`. The spec's description of Parrots (a default model, tool preferences, its own store, a `parrotId` on conversations) matches nothing in the code.
- **Ticking a saved persona has never changed what is sent.** Only the five presets and the custom text reach the model. After a migration to collabs, ticked personas would start to take effect for the first time. Stefan should know before it happens.
- **Collab state is memory only.** It resets on reload and on changing chat, and no reply records which presets applied. "Until turned off" and "a reply names the collabs it worked under" both need new stored fields.
- **The five presets match the built-in collabs in name only.** Two ids differ (`alternatives`, `uncertainty`), and the existing "challenge" text asks the model to critique its own output, where the spec says "question what it is given".
- **Three model calls happen that nobody asks for:** a title, a summary and tags, on Haiku, after the first exchange of every chat. No setting turns them off and nothing says so beforehand. See C62.
- **"Automatic" compression spends nothing.** It only opens the branch panel.
- **Components call the provider directly.** Thirteen places read the key and seventeen fetch a provider. Tiers and `capabilityRequirements` gate nothing at run time, and six entries declare less than they do. The gateway in section 9 is a real change, and for first-party code it holds only with a lint rule and a single import path.
- **What is sent is not what is shown.** Hidden messages, and messages deleted earlier in a session, are still sent. A reply cut off by the token limit or by a stream error is stored as complete. A stream keeps running after you leave the chat. The token meter over-counts. Any promise that the Enter line names what goes needs the real payload first.
- **"Do not save" for the key is broken:** nothing holds the key, so sending fails.
- **Only web search can be switched on.** `ToolToggles.jsx` is unused. The calculator and chart tools are declared but unreachable. Search results and citation data from the provider are dropped; only links the model writes survive.
- **The file shelf's "in context" files never reach the model,** though the screen says they do. Three of its buttons do nothing.
- **The network log cannot say who made a request,** and it records query strings, which would expose source searches. It also misses anything that is not a page fetch: the preconnect to Anthropic on every page load (before any key or choice), the service worker, and speech recognition.
- **The production headers disable the microphone** (`Permissions-Policy: microphone=()`), so voice input probably fails on the deployed site while working locally. Not tested.
- **A "replace" restore clears the settings store, stored key included.** The separate key store in section 9 fixes this as a side effect.
- **The Review window is thinner than the editing spec's "carried forward" table says:** no branch chips, no pins toggle, the reflection text is thrown away, and "Save as Markdown" exports the chat, not the review.
- **The ignition and the Settings shimmer are two separate animations,** both in `#D4A843`, not the `#C4A94D` the bar document cites.
- **Several settings are stored and read by nothing:** the budget alert, the backup reminder frequency, summary depth, last backup. The "current session" figures in Settings are literal zeros.
- **Choosing a home room creates a new empty chat on every visit to `/`.**

### From `research/editing-code.md`

- **Secretarybird cannot be the editing engine.** The salvage row in section 7 overstates it. Its editor lets the browser edit one element per paragraph and reads the text back. Tracked changes are not recorded: they are a word-level comparison of the text against a baseline, drawn in a non-interactive overlay above text made transparent. Struck words never exist in the editable text. There are no edit records, no edit ids and no offsets.
- **What does carry over is smaller:** the paragraph list with its split, join and retype functions (as a pattern), the filtering and keyboard handling of the `/` menu, two caret helpers, the suggestion and comment cards, the selection tooltips, and the scaffolding for model calls.
- **Option a in section 7 still stands, but as new work,** not as "growing Secretarybird". The comparison-against-baseline approach must not be carried over: it orders added words before struck ones, works on whole words, cannot place a deletion among repeated words, and treats splitting or joining a paragraph as an edit.
- **Keep `content` as the original string beside the new blocks and edits.** About 25 places read it as a string, and the spec says the model keeps reading the original.
- **Highlights are terms matched across the whole conversation,** not anchored passages. C57 is a real question.
- **Three commits sit on `refactor/main` and never reached `main`** (all 6 April): two Secretarybird fixes (`974d659` (in the private archive), the space bar hijacked in comment and chat inputs; `50ecd25` (in the private archive), revision suggestions missing in scanned chats) and `c2ed12a` (in the private archive), which moves the update banner for the service worker to the app level. The last one bears on section 7, item 8. See C65.
- **Every chat that is opened gets an empty document record,** because the document provider is mounted app-wide and saves a seed paragraph a second later. That clutters the data the migration reads and should be fixed before it.
- **Accept All and Clear All both accept every suggestion.** Neither discards, and there is no undo.
- **No HTML sinks** in the editing or message code. The fragile parts are three uses of the deprecated `execCommand`, rich `contentEditable` with no `beforeinput` handling, and input-method handling that rests on one flag.
- **Each message card animates its position** (`layout="position"`), which will fight live edits in place.

### From `research/lab-code.md`

- **The theme of a room is applied to the whole page in a chat** (`data-scheme` on `<html>`), and only to a wrapper in the editor. The dark and high-contrast variants do not scope at all. "A theme applies inside the edges of the room only" is not true today and must be made true before the new chrome sits beside a room. See C64.
- **There is no command layer of any kind.** The reducer has an action for most Lab commands, but each takes ids and slot ids. Nothing resolves names, finds a first free slot, checks capacity or refuses to remove a required block.
- **The slot vocabulary is the largest structural gap.** Code has 13 slot ids with "single" or "stack" capacity. Lab v7 uses five words (left, right, main, input, sheet) with numeric capacities. `slotTargets` is declared on all 27 entries and never consulted; templates and the wizard contradict it in at least nine places.
- **15 of the 33 settings that room blocks declare are read by nothing,** including message density and timestamps and the highlight colour. The Blocks board in Lab v7 would show settings that do not work.
- **"Built for" (desktop or phone) is stored and ignored.** Layouts switch on the width of the window.
- **The input block takes its chat from the address bar,** so it cannot send from the Lab. Trying a room with `p>` needs that changed.
- **Undo already makes "no holding tray" possible:** it is a whole-state snapshot, 50 deep. But the name and device of a room are not undoable, typing in a setting burns a step per keystroke, and undo after saving leaves the unsaved-changes flag wrong.
- **`@dnd-kit` cannot be dropped yet.** Six files import it, and one is the stacked-sections layout, which the layout registry loads at start. Lab v7 keeps that layout for rooms, so its reorder-by-drag code has to go first.
- **R30 corrected.** Unused today: `src/hooks/useMode.js`, `src/components/core/ToolToggles.jsx`, `src/components/core/CitedMarkdown.jsx`. Dev-only, and in use by the `/catalog` page: `RoomDemo.jsx`, `SchemePicker.jsx`, `catalog/dev-modes.js`.
- **Web search and file attach are already "features of input" in mechanism:** they draw nothing and talk to the input over the bus of the room. Folding them in is about 250 lines moved and a change to stored rooms.
- **Rebuild, per the audit:** the view layer of the editor (its controller is the drag handler); the slot model, with the layout as the single source; the rule for what happens to blocks on a layout change; one read layer for the catalogue (layout knowledge is duplicated in about ten places and references are spelled three ways, which already causes wrong labels); theme scoping.
- **Mockup descriptions that do not match the code:** Collaboration (a second person, against system-prompt presets), Summary dashboard (a conversation summary, against dataset statistics), Ripple (later messages, against document consistency), Review, Chart, Table, File shelf. The step list has no code.

### From `research/state-architecture.md`

- **Section 7, item 1 is confirmed, with a concrete shape.** One conversation and one stream are assumed throughout. Each streamed chunk sets state in a provider at the root of the app whose value is rebuilt every render, and 21 files read it. The audit recommends a plain store module keyed by conversation, read with `useSyncExternalStore`, with `ChatContext` kept as a facade over it. Splitting contexts is not enough: React context has no selectors.
- **A ten-step order of least risk** is in the report (section 11b). It starts with a tiny per-board "which conversation" context to replace reading the address bar, then stream state, then messages, then per-board providers, one write path that emits change signals, lazy blocks, and pop-outs last.
- **Four providers do work for every chat whatever room it is in** (documents, the file shelf, collab, the branch panel). They should be mounted per board, only when a block needs them. This is also what writes the empty document records noted above.
- **Pop-outs are harder than section 9 implies.** State reaches through a portal; the page does not. In a popped window today: no styles; none of the 14 window or document key listeners fire; all 12 selection reads look at the wrong window, which breaks highlighting and all editing; lookups by id fail; menus do not close on an outside click; width checks measure the wrong window; the clipboard, confirm boxes and the file picker act on the opener.
- **The highest risk in pop-outs is animation and timers.** They run on the clock of the window that opened the pop-out. When that tab is hidden its frames stop, so cards that mount invisible may stay invisible and a running timer may stall. **This should be prototyped before pop-outs are promised anywhere,** including welcome step 6.
- **Lazy loading is blocked by three things:** `db.js` imports the whole catalogue (an import cycle), manifests and render code are not split everywhere, and there is no loading or error boundary per block.
- **The table is fine in memory for a few thousand rows.** The work is one write path that notifies, fixed-height windowed rows, and at larger scale indexes on type, time, number, room and tags. Indexes mean a schema change, so they belong in the one upgrade of section 9, item 8.
- **Lint:** the count of about 120 errors is inflated by false positives on `motion`. Fix the config first so the real hook-rule findings (ten sites) can be read. There is no type checking and no continuous integration.
- **Defects found in passing:** Continue shows no progress and can be clicked twice; a stream that outlives its chat can title another chat from the wrong messages; empty chats are deleted at every start, including one another tab has just made; search boxes promise more than they search; the Inter font is shipped and precached but never applied; Tailwind may be scanning the old worktrees under `.claude/` (unverified).

### From `research/security-audit.md`

The fifth audit, filed after the rest of this section was written (commit
930e4b5). Its sections 18 (findings T1 to T16) and 19 (other people's blocks)
are the parts to read. Against sections 7 and 8 above:

- **The twelve rules in section 8 hold, and nothing found lets a remote party read chats or a key** without the user opening a malicious file, restoring a malicious backup, or a dependency being compromised. There are no HTML sinks, no `eval`, no WebAssembly, and no other origin for scripts, fonts or images.
- **Section 7, item 7 (dependencies), confirmed and sharpened.**
  - `xlsx` 0.18.5 is the one known-vulnerable path that touches untrusted input: two high advisories, no fix on npm (the registry copy is frozen at 2022; fixed versions come only from the vendor's own site). It parses uploaded files and restored backup blobs on the main thread with no size limit, and it sits in the main bundle for every user. See C72.
  - `@dnd-kit` is imported by six files and can go only when drag and drop does. The Inter font is imported, shipped and precached (218 KB) but never applied. `framer-motion` is used in 57 files, so moving the chrome to CSS transitions is a rewrite, not a dependency drop: new chrome uses CSS, rooms keep what they have. `recharts` serves one file and is a 417 KB chunk.
  - `react-router-dom` has twelve advisories, none of which appears to apply to how it is used; an update inside the allowed range clears them. The dev tools carry advisories that matter on this Windows machine while `npm run dev` runs (vite, esbuild), also fixed inside the range.
- **Rule 4 (keys), confirmed, with additions.** The backup blocklist holds one settings key, so every new provider key would be exported. The older export buttons write the key's ciphertext into the file, and the older import path applies no blocklist. Add to the rule: a provider's address is never taken from a room file, a setting or a backup; a stored default model is checked against the provider's own list; key and backup-password fields tell password managers to leave them alone; the page preconnects only to providers the user has set up (today it preconnects to Anthropic on every load, before any key exists).
- **The key is protected at rest and in exports, and not against script running in the page.** Any code in the origin can open both databases and ask the browser to decrypt. "Even scripts running on the page cannot export the raw encryption key" is true and misleading. This is the fact that decides rule 9.
- **Rule 5 (text from outside is data), with additions.** Never use an HTML field from a source (Wikipedia offers one). Source requests go without credentials. Text from a source or a model can never trigger a command, which matters once dockets run steps unattended. One shared Markdown component replaces the six files that each set up their own: today remote images in a reply are stopped only by the hosting header, and four sites render links that navigate the app's own tab.
- **Rule 6 (the policy), with the list it asked for.** Missing today: `base-uri`, `form-action`, `frame-src`, COOP and CORP, and a fuller Permissions-Policy. `'unsafe-inline'` for styles and `data:` for images both look removable, to be trialled on a deploy preview. Trusted Types is feasible with three small accommodations. The policy exists only as a Netlify header, so `npm run dev` and `vite preview` run with none: put it in the preview config so regressions show before deploy. Use exact hosts, not `https://*.wikipedia.org` as the change plan's network table had it, and never a wildcard port on localhost.
- **Rule 8 (pop-outs), with one constraint.** A blank window opened by the page is same-origin and inherits its policy. Its styles must come from a link to the built CSS file, not copied style text, or `'unsafe-inline'` has to stay. Whether COOP `same-origin` is compatible with such windows is unverified: test it in the pop-out prototype.
- **Rule 9 (other people's blocks): the audit reaches the same answer, and adds a step.** Review and ship in the catalogue for this refactor. Write the capability-scoped host interface now and make first-party blocks use it: a lint rule that keeps catalogue entries from importing the providers, the key module or the database directly, and the underscore methods on `hostAPI` no longer callable by every block. Blocks loaded at run time, if ever wanted, run in a sandboxed frame served from a separate origin. Rule out in writing any design that needs another script host, `blob:` scripts or `'unsafe-eval'` in the app's own policy.
- **Rule 10 (deleting means deleted), confirmed with the list.** "Delete everything" leaves every room the user built, the five library stores, the key store's database, Cache Storage and the service worker. See C73.
- **Rule 11 (claims), confirmed at length.** Nineteen statements in the README, SECURITY.md, Settings and the manifest are listed in the audit's item 11; twelve are not accurate as written. SECURITY.md prints a policy that is not the deployed one and describes a key mode that no longer exists. The network log sees only requests the page makes with `fetch`, not "every outbound request". See C68 and C69.
- **The licence is MIT,** which answers the welcome spec's worry about the Business Source License. But the repository is private, so "Open source on GitHub" is not accurate until it is public. Publishing the history also publishes one personal email address on all 467 commits. See C71.
- **Rule 12 (the service worker stores no provider response), confirmed.** Every API call is a POST and the rule is network-only.
- **Rule 7 (no user content in addresses or titles): clean today.** One edge: a restored backup can carry ids that are arbitrary strings, which would show in `/chat/<id>`. Number-only links close it.
- **Voice input, confirmed in detail.** By default the browser sends audio to its maker's service, which neither the policy nor the network log can see. An on-device option exists (Chrome desktop from 139; not Chrome on Android, not Safari, Firefox in preview only). The production header `microphone=()` very likely disables the feature on the live site, untested. See C70.
- **"Do not save" for the key is broken in two ways:** sending fails because nothing holds the key, and switching to it does not remove a key already stored, which other code paths go on using. See C73.
- **Restore trusts the file too much.** Any settings key and value is written, records are copied whole without checking fields the validators do not name, there is no cap on file or blob size, and the key-stretching count is read from the file with no upper bound. A crafted backup cannot run script while there are no sinks, but it can plant settings and personas, freeze views, and feed a malicious spreadsheet to the vulnerable parser. A "replace" restore is not atomic and its undo copy lives in memory for 60 seconds.
- **Backups are unencrypted by default,** the key-stretching count (210,000) is below the current recommendation for SHA-256 (600,000), and the minimum password length is enforced in one of three places. Old files stay readable when the count rises, because each file records its own.
- **Nothing enforces the capability labels on catalogue entries, and some are wrong.** No continuous integration, no dependency update automation, and the Node version is not pinned.
- **Several of these are true on the live site today,** not only after the refactor: the claims, voice input, "Do not save", "Delete everything", and the spreadsheet parser. Whether they are fixed ahead of the refactor is a question for Stefan (section 11, added below).

New conflicts from this audit are C68 to C74 in `conflicts.md`.

**Added to section 11's questions:**

14. **Fixes that are true on the live site today.** Ship a small set ahead of the refactor from its own branch off `main` (the spreadsheet parser, the privacy copy, "Do not save", "Delete everything", voice input), or fold them into the milestones?
15. **The spreadsheet parser (C72):** drop `.xlsx` and `.xls` for now, or vendor the fixed version from the vendor's site and parse in a worker?
16. **Voice input (C70):** remove it, or allow the microphone and use on-device recognition only?
17. **Going public (C71):** when does the repository open, and should the author address on the history be dealt with first?

### From a recheck of the mockups, while writing the register

- **Section 4's row on C4 was wrong.** It said clickable marginalia turns gold-deep under the pointer "in every newer mockup". Inline editing v5 (6 Oct) keeps marginalia ink with an underline on hover and draws the focus ring in ink. The bar reference file (9 Oct) draws the focus ring in gold-deep, while its own decisions document says gold appears only on the `api:` ignition and on the edge of the hexagon. So gold at rest is one open question covering both the focus ring and marginalia; it is C50 in `conflicts.md`.
- **C20 (favourites) and C67 (personas) are entries in the register** that this brief only mentions in passing (section 3 and the request-path notes above).
- **The register gives a suggestion for every entry,** including the ones marked "Question" in section 5. Where the two differ, the register is newer.

### New conflicts and questions these raise

**C61. Is the prompt of a step locked or editable?** Docket spec §1 and `docketModel.js`: a step that has produced a turn is locked, "because a transcript exists and rewriting the prompt would make the record a lie". Editing spec: every prompt is editable in place, struck and blue, per branch. **Suggestion:** both hold. An edit to a prompt is a marking on the transcript, and the original stays visible, struck. The step in the run does not change; "ask again as 201d" makes a new branch from the edited wording. To confirm.

**C62. The three automatic calls after a first exchange.** They spend without being asked or announced, which breaks proposed rule 2, and a reader with no key has no model to make them. **Question:** keep them and say so on the Enter line; make them on request (`summarize:` already exists as a verb); or drop them when the answer came from a keyless source.

**C63. Does the Lab save on every command, or keep a separate save?** Today saving is explicit, with an unsaved-changes flag and a first-time "Build" step. Lab v7 applies settings on click and shows no save. **Question.** Also: may a room hold two of the same block, given that commands address blocks by name?

**C64. Theme scope.** Decided by the arrangements doc (inside the edges of the room only); not how the code works. No question for Stefan, but it is work, and the hard-coded colours inside blocks limit how true it can be made.

**C65. The three commits on `refactor/main`.** **Question:** bring them onto this branch?

**C66. What "web search on" means.** Offered for each message, as today, or sent with every message? The guide in Lab v7 says "Yes, when I ask".
