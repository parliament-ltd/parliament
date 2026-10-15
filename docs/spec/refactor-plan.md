# Refactor plan

Written 12 October 2026. This replaces `change-plan.md` of 24 September, whose
areas 0 and 1 are built and stay as they are.

Built from `plan-brief.md` (the analysis), the five code audits in `research/`,
and every ruling in `conflicts.md` up to 12 October. Where this plan and a
ruling disagree, the ruling wins and the plan is wrong.

**How to read it.** Section 2 is the rules. Section 3 lists what you ruled and,
separately, what I have assumed where you have not ruled: check that second
table first. Section 4 is what gets built once and used everywhere. Section 5 is
the stages, each ending with something you can try. Section 6 is everything
proposed for retirement, one line each, for you to approve one at a time.

## 1. Where this is going

- **The model.** What is on your screen is an **arrangement** of **boards**. A
  **room** is a board built around a conversation. Boards are made of
  **blocks**. One **bar** is the actor on every board: search, `>` command,
  `p>` prompt.
- **The first thing to try is the welcome page:** its eight steps working end to
  end in a clean browser, with no key. Stages 1 to 5 exist to get there.
- **The refactor is finished before Parliament goes public.** Going public is
  the last stage, and it includes the fixes that make the app's claims true.
- **You are the only user today.** So the work stays on this branch, behind a
  flag where it replaces a screen, and reaches `parliament.ltd` when you say.

## 2. Rules the plan is held to

From your handoff, unchanged:

1. Nothing is deleted without your approval, item by item. Approved items move to `src/deprecated/` or behind a flag first.
2. Stop and ask when something is unclear. A conflict is recorded in `conflicts.md`, not resolved quietly.
3. Newer documents beat older ones; a mockup's header beats its companion document. `README.md` has the order.
4. Salvage first. Where something should be rebuilt, the plan says why and gives the options.
5. No migration or schema change touches stored data before you have seen a dry run.
6. Small commits on the branch. No push, no deploy.
7. The Almanac's table layout does not change without discussion.
8. Copy is sentence case with no em dashes.

Security and privacy, part of every stage (from `plan-brief.md` section 8 and
`research/security-audit.md`):

1. **Enter is the only confirmation.** Nothing leaves the device before it, and nothing is looked up while you type.
2. **The Enter line names every recipient** before sending, with what goes along and the cost where it can be worked out.
3. **One gateway for every outbound request.** A lint rule keeps blocks from reaching the network, the keys or the database any other way.
4. **Keys** live in their own store, never in a backup, the command line, its history, a saved button or a message between windows. Each is sent only to its own provider's fixed address. A provider's address is never read from a room file, a setting or a backup.
5. **Text from outside is data.** Model output, source text, pasted text, restored backups and imported files are shown as text and can never run a command.
6. **The policy is strict and listed host by host,** with exact ports for anything on localhost.
7. **No user content in addresses or window titles.**
8. **Pop-outs** are blank same-origin windows drawn by the page that opened them. They never navigate elsewhere.
9. **Other people's code does not run inside Parliament.** Blocks arrive by pull request (ruled 11 October).
10. **Deleting means deleted.**
11. **Claims stay true,** and one list feeds every place a claim is made (`privacy-copy-draft.md`).
12. **The service worker stores no provider's or source's response.**

## 3. What the plan stands on

### Ruled

| Topic | Ruling | When |
|---|---|---|
| Composer | The bar is the only place a prompt is typed in a room (C37) | 11 Oct |
| Favourites | Become a collection called Favorites, in their order (C20) | 11 Oct |
| Boards | Built from blocks, shipped arranged, editable later (C53) | 11 Oct |
| Stored data | One schema upgrade, one dry run | 11 Oct |
| Blocks by others | By pull request only | 11 Oct |
| Order | As proposed; the welcome page first | 11 Oct |
| Going public | After the refactor. History kept, author address rewritten on a copy, new public repository (C71) | 11 Oct |
| Fixes true today | Part of the refactor, not a separate branch | 11 Oct |
| Keys | Saved by default; "Don't save" is opt-in and must work | 11 Oct |
| Spreadsheets | Fixed library vendored, loaded on demand, run in a worker (C72) | 11 Oct |
| Removal | `erase:` for one item, explicit numbers only. "Delete everything" is a Settings button with safeguards (C39, C73) | 11 Oct |
| The bar's place | `bar:top`, `bar:bottom`, `bar:left`, `bar:center`, `bar:right`. `pop:command` gives the bar its own window. `pop:left` and `pop:right` place popped boards (C43) | 11 and 12 Oct |
| Gold | Ink for focus and for marginalia under the pointer. Gold on the `api:` ignition and the hexagon's edge (C50) | 11 Oct |
| After a first answer | One call for title, summary and tags, named on the Enter line, with a switch in Settings (C62) | 12 Oct |
| Markings | Highlight (a passage), term (a phrase lit everywhere), quote (kept beside the chat, never sent) (C57, C78) | 12 Oct |
| Edits and asks | Numbered. Rows only when filtered for. Always cards in the Collection (C56) | 12 Oct |
| Voice | On the device only, with a note about privacy (C70) | 12 Oct |
| Verbs | `name:`, `inspect:`, `close:` and `open:`, `restore:` and `import:` both, `tour:` kept (C40 to C42, C46, C47) | 12 Oct |
| Letters | Lower case: `201a` (C49) | 12 Oct |
| Privacy copy | Names no provider in a sentence | 12 Oct |

Earlier rulings still in force are in `conflicts.md` (Rulings) and
`inventory.md` (rulings 1 to 11).

### Assumed, not ruled

I have taken the register's suggestion on each of these so the plan could be
written. None is built until its stage. Strike any you disagree with.

| # | Assumption | Affects |
|---|---|---|
| A1 | The ten changes by date in `conflicts.md` table 5a hold (no dotted borders, `api:` everywhere, every board opens by name, and so on) | Stages 3 to 5 |
| A2 | The Lab is built to v7: the Blocks board, with small reversible changes applied on click (C38) | Stage 13 |
| A3 | One Escape rule: it steps toward the mode a screen rests in, then clears, then returns you to what you were doing (C44) | Stage 3 |
| A4 | `hold:` and `hold:off` mean "keep this from going until I say", for branches and for edits (C45) | Stages 10, 11 |
| A5 | `strain:` is not built until you say what it shows (C48) | none |
| A6 | The table board is called Almanac, not History, until you decide (C52) | Stage 5 |
| A7 | Welcome step 10 becomes "Send it with your next prompt" (C54) | Stage 11 |
| A8 | The second keyless source for the advanced list is Hacker News (C55) | Stage 7 |
| A9 | A prompt that has been answered stays locked as a record; editing it marks it up and "ask again" makes a new branch (C61) | Stage 11 |
| A10 | The Lab saves on every command, with `undo:` as the way back. A room holds one of each block (C63) | Stage 13 |
| A11 | The notice that a new version of the app is ready is built fresh. The three commits stranded on `refactor/main` change files that no longer exist, so nothing can be brought over (C65) | Stage 1 |
| A12 | Web search is a feature of input, shown in the prompt field and named on the Enter line each time it goes (C66) | Stage 4 |
| A13 | Personas become "yours" collabs, all switched off, listed in the dry run (C67) | Stages 2, 7 |
| A14 | The picker follows the branch slider: two groups, Models and Sources (C75) | Stage 7 |
| A15 | "One after another" with conditions comes after the docket can run; the step record gets its condition field in the one upgrade (C76) | Stages 2, 10 |
| A16 | Collection tabs: All, Highlights, Terms, Quotes, Notes, Edits, Asks, Suggestions, each shown only when it holds something (C77) | Stage 6 |
| A17 | A row's summary line can be rewritten with `summarize:`; a summary note in a collection is dated and fixed (C79) | Stage 6 |
| A18 | `heading:` in a collection; `erase:201c` and `erase:201c all`; `forget:` for a saved arrangement (C80) | Stages 6, 14 |
| A19 | Terms and quotes take numbers like edits do, and are rows only when filtered for | Stage 2 |
| A20 | `tour:` takes over from `list:`: `tour:` shows the steps, `tour:off` puts them away, `tour:advanced` shows the second list. `list:` answers "That verb is now tour:" | Stage 5 |
| A21 | `import:` opens a file and says what it is before anything happens. A backup is handed to `restore:`. A room file, when those exist, adds a room | Stage 9 |
| A22 | One command runs tests, lint and build. The same check runs on every pull request once there is a repository it can be pushed to. The new core modules carry JSDoc types | Stages 1, 15 |
| A23 | Existing "Pin for reference" records are shown as quotes of a whole message. Nothing is converted or lost | Stage 6 |

## 4. What gets built once

These are the pieces every board uses. Getting them right is most of the
refactor; the boards are then mostly drawing.

| Piece | What it is | From existing code | New |
|---|---|---|---|
| **Shell** | Owns the bar, the board strip, the navy rule, keys, pop-out windows and the arrangement. Not a board; cannot be removed | Nothing; today each route is its own page | All of it |
| **Boards registry** | Each board registers a name, short title (`Sym:`, `Col:`), placement, what it may do, its verbs and its component. Rooms are boards made from mode files | `RoomShell`'s resolve pipeline; `modes.js` | The registry |
| **Arrangements** | Which boards are open and where, saved per device, with shipped defaults and `reset:` | `chosenHomeRoomId` for `home:set` | The store |
| **Verb registry and parser** | One entry per verb: example, gloss, what it takes, the Enter-line preview, the action, and flags (spends, undoable, applies on click). The Enter line, completion, `?` and the reference are generated from it. A renamed-verbs map answers "That verb is now …" | `addresses.js` (built in area 1) | Everything else. There is no command layer of any kind today |
| **Stores with selectors** | Plain modules keyed by conversation, read with `useSyncExternalStore`, so one stream never redraws its neighbours and several can run at once | `ChatContext` kept as a facade; the pattern already exists in `networkLog.js` | `chatStore.js`, a records layer that announces changes |
| **Gateway** | The one way out to a provider or source. Picks the key by provider, labels each request with who made it, refuses what a board did not declare | The provider interface; the stream parser; `networkLog.js`'s buffer | The gateway, the lint rule, the prompt envelope recorded on each reply |
| **Key module** | One place that holds keys: encrypted in their own store, or in memory when "Don't save" is on | `crypto.js` primitives | Provider dimension, in-memory holder, a presence check that does not decrypt |
| **Providers and sources list** | One registry that the picker, the policy, the network log and the privacy copy all read | `base.js`, `anthropic.js` | Mistral, Ollama, source manifests |
| **Copy table and token sheet** | Every user-facing noun in one file; one set of chrome colours and sizes | Room themes in `schemes.js` stay as they are | Both. The mockups do not share one sheet today (C51) |
| **Version 6 of the stored data** | Every new list and field, created in one upgrade | `v6Plan.js`, the dry-run screen, `UpgradeGate`, the backup format chain | The revised planner (stage 2) |
| **A flag for the new shell** | The app keeps working while the shell is built; each old screen is retired only when its replacement is approved | | The flag |

### Rebuilt rather than adapted, and why

| What | Why it cannot be adapted | Options | Proposed |
|---|---|---|---|
| How conversation state is held | One conversation and one stream are assumed throughout. Each streamed chunk reaches all 21 files that read the chat state. React context has no selectors | Split contexts (not enough); a store library (new dependency); a plain store module | The plain store, taken up board by board in the ten-step order in `research/state-architecture.md` 11b |
| The editor's view layer | Its controller is the drag handler. The new controller is parse, plan, show on the Enter line, Enter, dispatch | none | Rebuild the view; keep the reducer and the 50-step history |
| The slot model | Three drifted copies; 13 slot ids against the mockup's five words; capacity is declared and never checked | none | The layout manifest becomes the single source |
| What happens to blocks when a layout changes | Today's rule moves by slot and assumes a holding tray | none | Per block: keep its slot if it has room, else its next fit, else take it out and say so |
| One read layer for the catalogue | Layout knowledge is repeated in about ten places and references are spelled three ways, which already causes wrong labels | none | One function returns rooms, layouts, blocks, themes, boards and resources |
| Theme scope | A room's theme is set on the whole page | none | Set on the room's wrapper. Hard-coded colours inside blocks limit how true this is at first |
| Chrome and room styles | One 3,300-line stylesheet mixes both | none | A separate chrome layer that room themes cannot reach |
| Keys and backups | A blocklist of one settings key. Every new key would leak | none | Keys in their own store; backups built from an allowlist |
| Key handling across windows | 14 listeners on one document | none | One key manager in the shell, attached to each window it draws into |
| What a reply is, once editable | One markdown string; Secretarybird's editor cannot be the engine (it compares against a baseline, it does not record edits) | (a) reconcile the browser's own edits against a model; (b) an editor framework such as ProseMirror or Lexical; (c) the browser's EditContext | A spike of (a) and (b) against one checklist before stage 11. Your call after it |

### Kept as it is

Rooms, mode files, `RoomShell`, the four room layouts, the six themes, the
catalogue contract, the per-room bus, the provider interface, key encryption,
the `.parliament` backup and everything from area 0, file parsing for CSV and
JSON, `editorReducer.js` and `editorHistory.js`, the pure modules in `src/lib/`
with their tests, the Review modal for now, and the nine design snapshots.

## 5. Stages

Each stage ends with something you can try and a checkpoint. Retirements are
put to you at the checkpoint of the stage that makes them possible; the R
numbers refer to section 6. After every stage the backup bundle is refreshed.

| # | Stage | Depends on | You can try at the end |
|---|---|---|---|
| 0 | Safety | | Done in September |
| 1 | Groundwork | | The app as it is, with fewer sharp edges |
| 2 | Stored data, version 6 | 1 | The dry run on your own backup, then your data with numbers |
| 3 | Shell and bar | 2 | The new bar over today's screens |
| 4 | A room in the shell, no key needed | 3 | A question answered from Wikipedia in a clean browser |
| 5 | **The welcome page** | 4 | All eight steps, start to finish |
| 6 | Almanac and Collection in full | 5 | Filter, collect, quote, erase |
| 7 | Providers, sources and collab | 4 | Mistral, a local model, Hacker News, standing instructions |
| 8 | Branches | 6, 7 | One prompt to three sources, as tabs |
| 9 | Settings and your data | 3, 7 | Settings v1; a "Delete everything" that does |
| 10 | Docket and running | 8 | Run a two-branch docket and stop it |
| 11 | Editing in place | 8 | Strike, add, ask, send |
| 12 | Ripple, sweeps, Reflection | 11 | Carry an edit across branches |
| 13 | The Lab | 3 | Build a room by command |
| 14 | Focus, calm, screens, small screens | 6, 8 | Your own focus set; the screens map |
| 15 | Close-out and going public | all | The public repository |

Stages 9 and 13 can run beside the others once stage 3 exists.

### Stage 0. Safety (done)

Restore keeps references, backup format versioning with fixtures, handling of
upgrades from another tab, the backup offered before a schema upgrade, and
Vitest. Also built: `addresses.js`, `docketModel.js`, `migrations/v6Plan.js`,
the dry-run screen at `/dev/migration`, `bus.js`. 34 tests pass. The database is
still at version 5.

### Stage 1. Groundwork

Small, independent fixes that everything later leans on. Nothing here changes
how the app looks.

- **Changed**
  - The lint configuration, so its false alarms on `motion` stop hiding the ten real findings.
  - Dependencies updated inside their allowed ranges (the router, the dev server). This changes `package-lock.json` only.
  - Two habits that dirty the data the migration will read: an empty document record written for every chat opened, and empty chats deleted at every start, including one another tab has just made.
  - The site's headers: `base-uri`, `form-action`, `frame-src`, the two cross-origin headers and a fuller Permissions-Policy. The same policy is applied to `vite preview`, so a regression shows before deploy.
  - The spreadsheet library: the fixed version vendored into the repository, loaded only when a spreadsheet is opened, parsed in a worker with a size limit and a timeout.
  - Voice: the microphone appears only where the browser can transcribe on the device, with the note beside it.
- **Added**
  - A notice that a new version of the app is ready, as one line of marginalia with a reload (A11). The app already knows when an update is waiting and shows nothing, so a security fix can sit unused in an open tab.
  - One command that runs tests, lint and build (A22). It becomes a check on every pull request at stage 15: GitHub now refuses pushes of this branch, because its older commits carry the private address.
- **Salvaged:** everything; these are repairs.
- **Security and privacy:** this stage closes audit findings T1 (spreadsheets), T3 (voice), T7 (headers) and T10 (dependencies).
- **You can try:** upload a spreadsheet; the microphone in Chrome on desktop and in another browser.
- **Needs from you:** a yes to fetch the spreadsheet package from the vendor's site (I will name the file and its size first).

### Stage 2. Stored data, version 6

The one upgrade. Every list and field the whole plan needs is created here, so
later stages fill lists that already exist. **Nothing is written to your data
until you have read the dry run and said go.**

- **Kept:** the long ids that records are keyed by, so nothing that points at a record breaks. Messages are not rewritten: a reply keeps its original text, and its editable form is stored only the first time it is edited.
- **Added, as lists**
  - Dockets and runs. A step can carry a condition (A15).
  - Collections, with their headings and the notes that travel with them.
  - Markings in three kinds: highlights, terms and quotes. Today's highlights become terms, unchanged.
  - Edits, asks and suggestions. Created empty; filled from stage 11.
  - Collabs, and on each reply a record of which collabs, provider and model produced it and what it cost.
  - Arrangements and focus sets, saved searches, and the command history.
  - A cache for source answers.
- **Added, as fields**
  - A number on every chat, note, docket, highlight, term, quote, edit and ask, from one counter that starts at 201.
  - The docket, branch letter (lower case) and run on each chat.
  - Pins and tags on every kind, and who made each tag.
  - Indexes on type, time, number, room and tags, which the table needs once it is large.
- **Changed, as data** (each line appears in the dry run)
  - Each family of branches becomes one docket; each chat with no family becomes a docket of its own.
  - Numbers are assigned in order of creation.
  - Favourites become a collection called Favorites, in their order. The old list stays readable.
  - The scratchpad text becomes a note.
  - Personas become "yours" collabs, switched off (A13).
  - Keys move out of the settings list into the key store. This also stops a "replace" restore from wiping the key.
- **Changed, as code**
  - `v6Plan.js` and its tests, for everything above.
  - Restore: identical items are skipped; an item whose number collides comes in under a new number, with every reference rewritten and "restored, was 207" in its marginalia.
  - Backups: format version 2, built from an allowlist of what may be exported. A file with no version reads as format 1 (C35).
  - One write path for records that announces each change, in this tab and across tabs.
- **Salvaged:** the planner, the dry-run screen, the upgrade gate and the backup format chain from September. **New:** the lists above and the notifying write path.
- **Security and privacy:** keys can no longer reach a backup. Restore stops trusting the file: only known settings are written, each record is rebuilt from checked fields, and file size and the key-stretching count are capped (audit T6).
- **You can try:** the dry run. Export a backup, open `/dev/migration`, load the file. It lists every docket it would make, every number, every favourite, persona and term it would move, and anything it could not place. Then, on your word, the upgrade, with a backup offered first.
- **Needs from you:** the dry run on your real data, and your eye on A13, A15 and A19.

### Stage 3. Shell and bar

The spine. Built behind a flag, so today's screens keep working underneath.

- **Before anything else: a pop-out prototype.** The audit found that in a popped window today there are no styles, no shortcuts and no working text selection, and that animations and timers stall when the tab that opened it is hidden. `pop:command` puts the thing everything is typed through into such a window. A throwaway prototype answers whether that can be made dependable before the welcome page promises it.
- **Added**
  - One token sheet and the copy table. You approve the sheet before any chrome is drawn (C51).
  - A chrome style layer that room themes cannot reach, and a room's theme moved from the whole page onto the room (C64).
  - The parser and the verb registry, with the renamed-verbs answers.
  - The field: three modes, 40px tall, 14px corners, fills that wipe in from the left, the Enter line, marginalia inside the prompt field.
  - `/` and Cmd/Ctrl+K; the one Escape rule (A3); the field resets to `>` after a command.
  - Minimising to the hexagon when you click into a reply, and `bar:top`, `bar:bottom`, `bar:left`, `bar:center`, `bar:right`.
  - The boards registry, the arrangement, the board strip and the navy rule; `open:`, `close:`, `move:`, `swap:`, `reset:`, `pop:` and `pop:back`.
  - `?` and `help`, generated from the registry.
  - A history of commands. Commands only: never a prompt, a search, or a line shaped like a key.
  - The first steps toward the new stores: each board is told which conversation it shows, instead of reading the address bar, and stream state moves into a store.
- **Changed:** the double binding of Cmd/Ctrl+Shift+B.
- **Salvaged:** `addresses.js`, `bus.js`, the ignition animations (for `api:` later). **Rebuilt:** everything else here is new; no command layer exists.
- **Security and privacy:** the history never stores content. Window titles and addresses carry numbers and kinds only. A popped window is blank, same-origin and never navigated, and takes its styles from the built stylesheet, not copied text, so the policy can lose `'unsafe-inline'`.
- **You can try:** switch the flag on. Type `>`, then `?`. Move the bar with `bar:bottom`. Click away and watch it fold to the hexagon. Open and close a board. Pop one into a window.
- **Needs from you:** approval of the token sheet; your verdict on the pop-out prototype; A1 and A3.

### Stage 4. A room in the shell, no key needed

The first prompt on the welcome page is answered from Wikipedia, so a keyless
source has to work before the page can.

- **Kept:** rooms and `RoomShell`, drawn in their own themes inside the room.
- **Changed**
  - A room is hosted as a board. Its input block becomes the place the bar docks and the holder of the input features (C37).
  - Messages move into the new store and are sent by conversation, not by whatever chat is on screen.
  - The three silent calls after a first answer become one, named on the Enter line (C62). With no key, the title is the first words of the prompt and nothing is sent.
  - A stream that outlives its chat can no longer title another chat from the wrong messages.
- **Added**
  - The gateway, and the lint rule that makes it the only way out.
  - The key module, with "Don't save" working and saving as the default.
  - The list of providers and sources, and Wikipedia as the first source: a manifest with no code in it, plain text only, its licence and revision shown.
  - "Answered from" in the prompt field, and the Enter line naming where a prompt will go.
  - `name:` for the room.
  - One shared Markdown component in place of six set-ups.
- **Salvaged:** `InputArea.jsx`'s feature logic, `fileUpload.js`, the stream parser and error mapping in `anthropic.js`, `networkLog.js`. **Rebuilt:** how a request reaches a provider (13 places read the key and 17 fetch a provider today).
- **Security and privacy:** a prompt to Wikipedia is a search sent to a third party, so it is named before Enter and never sent while typing. Source requests carry no credentials. Source text is shown as text, never as HTML, and can never run a command. What is sent finally matches what is shown: hidden and deleted messages stop going out. A reply cut off by a limit or an error is marked as cut off. This stage closes audit findings T4 ("Don't save") and T8 (Markdown).
- **You can try:** in a private window with no key: `>`, `bar:bottom`, `p>` and a question. The answer comes from Wikipedia. Then `name:"…"`.
- **Needs from you:** nothing new. R25 is put to you here.

### Stage 5. The welcome page

Your first target. The page is the lesson: every step is a real command.

- **Added**
  - The page: one large card, the letter, the eight steps, the field with no box at rest, the footer, the ending ("Welcome / to Parliament"), and the line that offers `focus:`.
  - Steps as ruled: step 2 is `bar:bottom`; step 6, `pop:almanac`, is where `pop:` is introduced; step 8 is `api:`.
  - A thin Almanac board: the table with your rows and their numbers, pinned rows first, open by number, `inspect:`. Enough for step 4.
  - A thin Library board, read-only: rooms, layouts, blocks, themes and resources from the one catalogue read layer. Enough for step 7.
  - The `api:` panel, with the gold ignition once per new key. Enough for step 8.
  - `focus:` and `focus:off` in their first form: the chat alone, and back.
  - `tour:`, `tour:off` (A20).
  - One line on small or touch-only screens: "built for a computer for now; the phone comes later".
- **Changed:** `/` shows the welcome page to someone new and the Almanac to someone with work. Links carry numbers (`/207`); old links still resolve.
- **Salvaged:** `IgnitionStep.jsx`'s key check and `useShimmer.js`; the pin-first ordering and search from `SelectorLayout.jsx`; `LibraryCard`, `LayoutSilhouette` and the pure helpers in `EditorLibraryMode.jsx`. **Rebuilt:** the catalogue read layer.
- **Security and privacy:** no key is ever typed into the bar; `api:` opens a panel with a password field that password managers are told to leave alone, and a line that looks like a key is refused before Enter. The footer says "MIT licensed. Source published at launch" until the repository is public (C71). The letter's sentence about where requests go reads true for every provider.
- **You can try:** the whole page in a clean browser profile, steps 1 to 8, then the ending and `focus:`.
- **Needs from you:** the letter's final wording, the two footer links, and whether step 8 crosses off on seeing the key panel or on saving a key. R15 is put to you here.

### Stage 6. Almanac and Collection in full

- **Added**
  - Every filter (`type:`, `room:`, `tag:`, `model:`, `from:`, `in:`, `has:`, `cost:`, `since:`, `until:`, `sort:`), saved searches, `cols:`, and rows drawn only when on screen.
  - Row verbs: `pin:`, `archive:`, `copy:`, `export:`, the tag verbs, and `erase:`.
  - The Collection, to collection board v3 and the editing spec: cards, not a table; highlights, terms, quotes and notes; the four acts (note, tag, summarize, prompt); headings; a numbered source picker; finding a marking from its card and its card from the marking.
  - `new:collection`, `add:`, `rm:`, `compare:`, `heading:`, `note:`.
  - The backup reminder as one line of marginalia at the top, in ink, only when it is news.
  - The Almanac export of selected rows as markdown or JSONL.
- **Changed:** "Pin for reference" becomes a quote (A23).
- **Salvaged:** bulk actions and family grouping from `SelectorLayout.jsx`; today's highlights, notes and annotations code. **New:** the Collection.
- **Security and privacy:** `erase:` takes explicit numbers only, names what will go on the Enter line, and cannot be undone, so the line says so. Erasing something with markings says what happens to them first. Exports footnote their sources.
- **You can try:** your migrated data. Filter it, pin, collect a few things, quote a passage, write a note that quotes them, erase one item.
- **Needs from you:** A16 to A19, A23. Retirements R1 to R9, R11 to R13 and R27 are put to you here.

### Stage 7. Providers, sources and collab

Can start as soon as stage 4 is done, beside stages 5 and 6.

- **Added**
  - Mistral (a streaming test with a real key comes first; if it fails it comes back to you), and Ollama on exact local ports, checked only when you ask.
  - Hacker News and OpenAlex, with OpenAlex's daily allowance stated where it is picked.
  - The current model lineup with cost marks, and the picker in two groups with numbered boxes (A14).
  - The network log grouped by host, each named by who called it, with no query strings.
  - `collab:`: five built in, your own, stacking in the order ticked, kept until turned off, and named on each reply. `helper:` for the model that reads keyless-source text.
- **Changed:** the model list and prices; a stored default model is checked against the provider's list. Citations a provider returns with a web search are kept and shown; today they are dropped.
- **Salvaged:** the five presets and `buildSystemPrompt`'s join from Collaboration mode. **New:** stored collabs and the record on each reply.
- **Security and privacy:** each key goes only to its own provider's fixed address. The policy lists each host exactly, and localhost by exact port. The page connects only to providers you have set up. Settings tells people to allow Parliament's own address in Ollama, not every site. Collabs and personas that arrive in a restored file are shown before they are applied.
- **You can try:** the same question to Mistral, a local model and Hacker News; `collab:pushback`.
- **Needs from you:** the cost marks for the newer models (C34), and A8, A13, A14. R22 and R23 are put to you here.

### Stage 8. Branches

Built to branch slider v9 and the editing spec.

- **Added**
  - One prompt to several sources at once, answered as tabs in a slider, each a lettered branch (`201a`, `201b`).
  - The reply target in the field (`to:201a`, `to:all`), and ⌥← ⌥→ to move between replies.
  - `open:201a` (its own card, full history) and `open:201a summary` (a new branch from a summary; one model call, said first).
  - `again:` for asking again from a reworded prompt as a new branch.
- **Changed:** forking writes a lettered branch into the chat's docket. Several streams run at once without redrawing each other.
- **Salvaged:** `db.createBranch` and the summary path in `branches-render.jsx`. **Rebuilt:** how branches are shown.
- **Security and privacy:** the Enter line lists every source a prompt will go to and what each costs. A branch copy keeps a link to the message it came from, which Ripple needs later.
- **You can try:** tick three sources, send one prompt, reply to one branch, then to all three.
- **Needs from you:** nothing new. R26 is put to you here.

### Stage 9. Settings and your data

Built to Settings v1. Can run beside stages 5 to 8.

- **Added**
  - One stacked card with a rail, sections you can address, `set:`, and search that narrows to matching rows.
  - `backup:`, `restore:` and `import:` (A21).
  - "Delete everything" that removes everything: both databases, the caches and the service worker. Its confirmation lists what will go, is armed by typing a word, offers a backup first, and says what it cannot reach (files you saved, what providers already hold). Other open tabs are told to close.
  - The switch for the title call, the "Don't save" option, text size, and the room for new dockets.
  - About, with the new privacy copy and the network log.
- **Changed:** backups say plainly when they are not encrypted, use one minimum password length, and stretch a password further in new files. A "replace" restore offers what it is about to replace as a download first.
- **Salvaged:** the storage estimate, reminder, danger zone and key check from `SettingsView.jsx`; `BackupRestoreModal`. **New:** the layout and the verbs.
- **Security and privacy:** this stage closes audit findings T2 (copy), T5 ("Delete everything"), T9 (backups) and T13. "Delete everything" is never a command, a link, or something a saved button, a reply or a file can set off.
- **You can try:** Settings v1; a backup with and without a password; "Delete everything" in a throwaway profile, then check that nothing is left.
- **Needs from you:** C27, C28 and C33 as they bear on Settings, and A21. R10 and R28 are put to you here.

### Stage 10. Docket and running

Built to docket v12.

- **Added**
  - The docket board, branch lines, steps, run pips and record cards; the step list as a block a room can carry.
  - `new:step`, `new:branch`, `new:run`, `hold:`, `move:`, `diff:`.
  - `run:`, `stop:` and `stop:all`. Only the tab holding a docket's lock runs it; `stop:all` crosses windows.
  - `undo:` that covers plans and records and stops at execution.
  - "One after another" with a condition per step (A15).
  - This month's spend and the warning before a costly run, in Settings.
- **Salvaged:** `docketModel.js`, `bus.js`. **New:** the runner.
- **Security and privacy:** before Enter, `run:` states the steps, rooms, models and cost. Stopping is not undoing and the line says so. Text from a source or a model can never start or steer a run.
- **You can try:** run a two-branch docket, stop one branch mid-step, see it paused with its cost, and see `undo:` refuse to go past the run.
- **Needs from you:** A4, A15.

### Stage 11. Editing in place

The piece with the most risk in it. It starts with a spike, not with building.

- **First: the engine spike.** Two small prototypes, one letting the browser edit and reconciling each change against a model of the reply, one on an editor framework. Both are run against one checklist: languages typed by composing, Android keyboards, selection across blocks, paste, undo, screen readers. You choose after seeing both. C58 (how tables, charts, bold and links in a reply are shown and stored) has to be answered first.
- **Added, after the spike**
  - A reply as blocks, stored the first time it is edited. Its original text stays beside them, because the model goes on reading the original.
  - Striking instead of deleting, your words in blue, one id per edit, each edit a card in the Collection, undo on the card.
  - Edits sent with the next prompt, once, as a note of what changed. The line under the field always counts what will go. "Hold back" keeps one yours.
  - `markup:on` and `markup:off`, `tell:`, `strikethrough:`, the `/` menu for formatting.
  - Asks: typed, tied to a passage or a point, answered in place in green, accepted or undone.
  - Welcome steps 9 and 10 (A7).
- **Salvaged from Secretarybird:** the `/` menu's filtering and keys, the split and join of blocks as a pattern, two caret helpers, the cards after restyling. **Not carried over:** its tracked-changes approach, which compares against a baseline and cannot place a deletion among repeated words.
- **Security and privacy:** pasting inserts plain text. A reply's blocks hold a type and text only, never markup. The count line is never hidden by `calm:`. Hidden file text inside a stored prompt survives an edit to that prompt.
- **You can try:** strike a line, type a replacement, ask for a rewrite of a passage, send, and see the next reply say it read them.
- **Needs from you:** an answer on C58, the choice of engine after the spike, and A7, A9.

### Stage 12. Ripple, sweeps, Reflection

- **Added**
  - Ripple across branches, off by default, each check one model call that says so first; suggestions in rust, reviewed one at a time.
  - Sweeps: a collab's rule applied across a reply or a branch, as suggestions in green.
  - The Reflection board. It reads a chat and its markings and never writes to them.
- **Salvaged:** the per-target loop and response parsing from `RippleAnalysis`; the synthesis recipe from the Review modal. The Review modal itself stays until you have compared the two.
- **Security and privacy:** each of these names its model and its cost before it runs. Reflection gets a read-only handle on the data, so "never writes" is enforced and not only promised.
- **You can try:** edit one branch with Ripple on and review what it proposes for the others; open `Ref: 201` and press Reflect.
- **Needs from you:** the open items the editing spec lists for itself: Ripple's reach, the scope of a collab, how far a sweep goes.

### Stage 13. The Lab

Built to Lab v7 (A2). Can run beside the others once stage 3 exists.

- **Added**
  - The Library board in full: ticking, "add to room", details opening in place.
  - The Canvas in the "medium" style, the room line, and the Blocks board, which lists only settings that do something.
  - Commands: `add:`, `rm:`, `place:`, `layout:`, `theme:`, `device:`, `set:`, `name:`, `duplicate:`, `edit:`, `done:`. Each is one step for `undo:`.
  - The guide (`new:room guided`), where each answer writes a command.
  - Trying a room with `p>`, kept as chats tagged "tried in the Lab".
  - `new:block`, which opens the resources for building a block in the repository.
- **Changed:** web search, file attach and voice become features of input. The 15 declared settings that nothing reads are either wired up or put to you for removal. "Built for" a phone starts to mean something.
- **Salvaged:** the reducer and its history, the plan-then-apply shape of a layout change, the wizard's questions and its rule for required blocks, the settings-to-control mapping. **Rebuilt:** the editor's view layer, the slot model, the layout-change rule (section 4).
- **Security and privacy:** catalogue entries can reach the network, keys and data only through the scoped interface, checked by the lint rule. Capability labels become a contract: an entry that calls a model must say so.
- **You can try:** build a room from nothing by command; `set:` a block's setting; change the layout and `undo:`.
- **Needs from you:** A2, A10. Retirements R14, R16 to R21, R24, R33, R34 and R36 are put to you here.

### Stage 14. Focus, calm, screens, small screens

- **Added:** your own focus sets (`focus:sym col`, `focus:save`), `calm:`, saved arrangements and the screens map (`arrange:`), and the stacked layouts for narrow windows.
- **Security and privacy:** placing a window on another screen asks the browser's permission once, and the Enter line says so before it happens.
- **You can try:** a focus set of the chat and the Collection; `calm:`; the map with a second screen attached.
- **Needs from you:** whether calm is the starting state for someone new; a phone layout you are happy with, which the mockups do not yet draw.

### Stage 15. Close-out and going public

- **Close-out**
  - Every retirement still open is put to you.
  - The privacy copy is applied everywhere from `privacy-copy-draft.md`, and each claim is checked against behaviour one last time. SECURITY.md's policy block is generated from `netlify.toml`, with a test.
  - The verb reference is generated from the registry.
  - Dependencies nothing uses any more are removed, on approval (R16, R35).
  - Trials on a deploy preview: the policy without `'unsafe-inline'` for styles and without `data:` for images.
- **Going public**
  - A sweep of the whole history for anything personal.
  - The author address rewritten to the no-reply address on a copy. A check that none is left. `main` pushed to a new public repository. This repository stays private as the archive.
  - The commit ids quoted in `CLAUDE.md` and the spec files are updated, since every id changes.
  - A contributing guide, the block guide, and private vulnerability reporting switched on.
- **Redundancy**
  - A mirror of the public repository on a second host.
  - Headers moved into a file that a second static host also reads, and a standby copy of the site deployed there.
  - Each release saved as a zip with a checksum.
  - Accounts: two-factor and stored recovery codes for GitHub, Netlify and the registrar.
- **You can try:** the public repository, and the site served from the standby.
- **Done early, on 15 October:** DNS moved to deSEC with DNSSEC, and mail set up at Proton. The records are in `docs/hosting.md`.
- **Needs from you:** a yes before the public push, which cannot be taken back. R31 is put to you here.

## 6. Retirement proposals

Nothing below is removed until you approve that line. Approved items move to
`src/deprecated/` or behind a flag first. Stored data is never dropped: old lists
stay readable so every backup ever written still restores.

| # | What | Where | Replaced by | Stage |
|---|---|---|---|---|
| R1 | Blueprint section of the homepage | `src/catalog/entries/blueprint*.jsx`, `src/lib/blueprintShapes.js` | Nothing; dropped with the homepage | 6 |
| R2 | Blueprint overlay and its Cmd/Ctrl+. shortcut | `src/components/BlueprintOverlay.jsx` | Nothing | 6 |
| R3 | The Study: the homepage view and its seeded mode | `src/views/HomepageView.jsx`, `home_default`, `/edit-home` | The Almanac and the welcome page | 6 |
| R4 | The `/chats` selector | `src/views/SelectorView.jsx`, `SelectorLayout.jsx` | The Almanac | 6 |
| R5 | The homepage Chats section | `src/catalog/entries/chats*.jsx` | The Almanac | 6 |
| R6 | Favourites as a feature | `favorites*.jsx`, the heart on messages, the favourite functions in `AnnotationsContext` | The Favorites collection. The old list stays readable | 6 |
| R7 | Quick stats, recent activity, the homepage scratchpad | `quick-stats.jsx`, `recent-activity.jsx`, `scratchpad.jsx` | The Almanac's columns; a free-standing note | 6 |
| R8 | The homepage Library section | `src/catalog/entries/library*.jsx` | The Library board | 6 |
| R9 | The homepage top bar | `src/components/HomepageTopBar.jsx` | The bar | 6 |
| R10 | The older `.apb` and JSON export buttons | `SettingsView.jsx`, `db.js` `exportAllData` | `.parliament` only. Reading old files stays for good | 9 |
| R11 | Homepage-scope mode files and `/edit-home` | `scope: 'homepage'` in `modes.js` | No homepage room | 6 |
| R12 | Old chrome styles | `index.css` rules for the Study, `/chats`, the top bar, old gold states | The chrome layer. Removed file by file, each listed in its commit | 6 onward |
| R13 | "Pin for reference" as a label | `messages-render.jsx` | A quote. The stored pins stay | 6 |
| R14 | The build wizard as a page | `/build`, `BuildView.jsx`, `src/components/build/**` | The guide in the Lab; templates in the Library | 13 |
| R15 | Tooltip tours, the first-run gate and their flags | `TourTooltip.jsx`, `tourCompleted_*` | The welcome steps and `tour:` | 5 |
| R16 | Drag and drop in the editor, then `@dnd-kit` | Drag wiring in `EditorView.jsx` and the editor components | Commands | 13, 15 |
| R17 | The holding tray | `EditorHoldingTray.jsx`, four reducer actions, its styles | `rm:` and `undo:` | 13 |
| R18 | The inspector | `EditorRightRail.jsx` | The room line, the Blocks board, `inspect:` | 13 |
| R19 | The editor's left rail and top-bar pills | `EditorLeftRail.jsx`, `EditorTopBar.jsx` | The Library board and the bar | 13 |
| R20 | The preview sheet | `EditorPreviewSheet.jsx` | Trying the room with `p>` | 13 |
| R21 | The layout-swap and apply-room dialogs | `EditorMigrationDialog.jsx`, `EditorApplyRoomDialog.jsx` | The Enter line stating the plan; `duplicate:` | 13 |
| R22 | Collaboration mode's window and block | `CollabModal.jsx`, `collab-mode*.jsx`, `CollabModeContext` | The `collab:` picker in the field | 7 |
| R23 | The persona editor inside that window | `CollabModal.jsx` | "Yours" collabs | 7 |
| R24 | Web search, voice input and file attach as separate blocks | Nine files and three small registries | Features of input | 13 |
| R25 | The room's own composer on screen | The composer drawn by `input-render.jsx`. `InputArea.jsx`'s logic is kept behind the bar | The bar in prompt mode | 4 |
| R26 | The branch panel and its shortcut | `BranchCreationPanel.jsx`, `BranchPanelContext.jsx`, `BranchShortcutHandler.jsx` | `open:` with or without a summary, `again:` | 8 |
| R27 | The backup status dot and banner | `BackupStatusIndicator.jsx`, `BackupReminderBanner.jsx` | One line of marginalia on the Almanac | 6 |
| R28 | Settings options that go or do nothing | "Automatic" compression, the theme switch, session usage figures; the budget alert, summary depth and last-backup values, which nothing reads | Removed by the Settings spec. Stored values stay | 9 |
| R30 | Files nothing uses today | `src/hooks/useMode.js`, `src/components/core/ToolToggles.jsx`, `src/components/core/CitedMarkdown.jsx`, `public/flight_logo.png` | Nothing | any |
| R31 | Old process documents | `refactor/`, the `continuation-*.md` notes, `.pr-body.md` | An archive, if you want one. Decide what is published before going public | 15 |
| R32 | The three silent calls after a first answer | `src/stores/ChatContext.jsx` | One named call (C62) | 4 |
| R33 | The Showcase, the room-source glow and connector lines in the editor | `src/components/editor/` | Nothing | 13 |
| R34 | Reordering by drag in the stacked-sections layout | `stacked-sections.jsx`, `SectionCard.jsx` | Move up, move down. The layout itself stays | 13 |
| R35 | The Inter font package | `@fontsource-variable/inter`, shipped and never applied | The system fonts already in use | 15 |
| R36 | The old slot tables and fallback rule | `SLOT_FALLBACKS` and the three copies of slot data | The layout manifest | 13 |

R29 (install and update state that nothing displays) is withdrawn: stage 1
displays it.

Rewritten rather than retired, because they will no longer be true: `README.md`,
`SECURITY.md`, the About copy in Settings.

## 7. What I need from you, in order

1. **Strike anything in the "Assumed" table you disagree with.** A2 (Lab v7), A19 (terms and quotes numbered), A20 (`tour:` in place of `list:`) and A21 (what `import:` does) are the ones I am least sure you would choose.
2. **Stage 1:** a yes to fetch the spreadsheet package.
3. **Stage 2:** the dry run on your real data.
4. **Stage 3:** the token sheet, and your verdict on the pop-out prototype.
5. **Later, when their stage comes:** C58 and the engine choice (stage 11); the cost marks (stage 7); where DNS lives and a mailbox (stage 15).

## Appendix. Proposed update to CLAUDE.md

Not applied. CLAUDE.md still names four spec files and describes the September
direction. Proposed changes, for your approval:

- **Read this first.** In place of the four file names: "The design is defined by the documents in `docs/spec/`. `docs/spec/README.md` lists them by date and says which wins. Rulings are in `docs/spec/conflicts.md`. The plan is `docs/spec/refactor-plan.md`."
- **Orientation.** In place of the Almanac, Docket, Symposium and command line list:
  - "What is on screen is an **arrangement** of **boards**. A **room** is a board built around a conversation. Boards are made of **blocks**."
  - "The boards: Almanac, Collection, Library, Docket, Reflection, Settings, and every room."
  - "**The bar** is one field read three ways (search, `>` command, `p>` prompt). It is the actor on every board, and the only place a prompt is typed."
  - "The Lab is the arrangement where rooms are built, by command."
- **Working files.** Add `refactor-plan.md`, `plan-brief.md` and `research/`. Say that `change-plan.md` is the September plan, kept for the record.
- **Hard constraints.** Add:
  - "Every outbound request goes through the gateway. Blocks do not import the providers, the key module or the database directly."
  - "Keys live in their own store and are never written to a backup."
  - "Other people's code does not run inside Parliament. Blocks arrive by pull request."
  - "Text from outside (model output, sources, pasted text, restored and imported files) is data and can never run a command."
  - Change "each listed in `netlify.toml`" to "each listed in `netlify.toml` when it ships".
- **Conventions.** Add: "Gold appears on the `api:` ignition and the edge of the minimised bar, and nowhere else. Keyboard focus is ink." "Branch letters are lower case." "Copy names no provider in a sentence."
- **Going.** Point at section 6 of the plan in place of the short list.

