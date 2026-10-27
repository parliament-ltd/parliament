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

### Assumed, then ruled

I took the register's suggestion on each of these so the plan could be written.
Stefan went through all of them on 15 October; each row now says
how it was ruled.

| # | Assumption | Affects |
|---|---|---|
| A1 | The ten changes by date in `conflicts.md` table 5a hold. **Ruled 15 Oct, all ten.** Follow the newest HTML mockups; `open:` takes a chat's number or its name; `key:` is kept free for a possible sharing feature | Stages 3 to 5 |
| A2 | **Ruled 15 Oct: v7.** The Lab is built to v7: the Blocks board, with small reversible changes applied on click (C38) | Stage 13 |
| A3 | **Ruled 15 Oct, as revised.** Escape never deletes text. It takes the field to the mode the screen rests in, keeping what you typed in the mode you left; in the resting mode it returns you to what you were doing. Backspace leaves a mode only by deleting a leader you can see: deleting the `>` leaves command mode (C44) | Stage 3 |
| A4 | **Ruled 15 Oct: yes.** `hold:` and `hold:off` mean "keep this from going until I say", for branches and for edits (C45) | Stages 10, 11 |
| A5 | **Ruled 15 Oct: cut.** `strain:` was about site performance and is not needed now (C48) | none |
| A6 | **Ruled 15 Oct: yes for now, to be looked at again,** with a plain-language pass on names before stage 5. The table board is called Almanac, not History, until you decide (C52) | Stage 5 |
| A7 | **Ruled 15 Oct: yes.** Welcome step 10 becomes "Send it with your next prompt" (C54) | Stage 11 |
| A8 | **Ruled 15 Oct: all three ship** (Wikipedia, Hacker News, OpenAlex), and people pick any two. The second keyless source for the advanced list is Hacker News (C55) | Stage 7 |
| A9 | **Ruled 15 Oct: yes.** A prompt that has been answered stays locked as a record; editing it marks it up and "ask again" makes a new branch (C61) | Stage 11 |
| A10 | **Ruled 15 Oct: yes.** The Lab saves on every command, with `undo:` as the way back. A room holds one of each block (C63) | Stage 13 |
| A11 | **Ruled 15 Oct: yes.** The notice that a new version of the app is ready is built fresh. The three commits stranded on `refactor/main` change files that no longer exist, so nothing can be brought over (C65) | Stage 1 |
| A12 | **Ruled 15 Oct: on for the next prompt only, to be looked at again after other changes.** Web search is a feature of input, shown in the prompt field and named on the Enter line each time it goes (C66) | Stage 4 |
| A13 | **Ruled 15 Oct: yes, and to be looked at again at stage 7.** Personas become "yours" collabs, all switched off, listed in the dry run (C67) | Stages 2, 7 |
| A14 | **Ruled 15 Oct: three groups** (Models; On your machine; Sources, no tokens), with the branch slider's sub-labels for sources, numbered boxes, cost marks and one line of description per row (C27, C75) | Stage 7 |
| A15 | **Ruled 15 Oct: yes.** "One after another" with conditions comes after the docket can run; the step record gets its condition field in the one upgrade (C76) | Stages 2, 10 |
| A16 | **Ruled 15 Oct: yes.** Collection tabs: All, Highlights, Terms, Quotes, Notes, Edits, Asks, Suggestions, each shown only when it holds something (C77) | Stage 6 |
| A17 | **Ruled 15 Oct: yes.** A row's summary line can be rewritten with `summarize:`; a summary note in a collection is dated and fixed (C79) | Stage 6 |
| A18 | **Ruled 15 Oct: yes.** `heading:` in a collection; `erase:201c` and `erase:201c all`; `forget:` for a saved arrangement (C80) | Stages 6, 14 |
| A19 | **Ruled 15 Oct: yes, to be looked at again later.** Terms and quotes take numbers like edits do, and are rows only when filtered for. Terms must still be found by search in the Almanac | Stage 2 |
| A20 | **Ruled 15 Oct.** `tour:` shows the steps, `tour:off` puts them away, `tour:advanced` shows the second list. `list:` is kept free for another use, such as making a bulleted list | Stage 5 |
| A21 | **Ruled 15 Oct: yes.** `import:` opens a file and says what it is before anything happens. A backup is handed to `restore:`. A room file, when those exist, adds a room | Stage 9 |
| A22 | **Ruled 15 Oct: yes.** One command runs tests, lint and build. The same check runs on every pull request once there is a repository it can be pushed to. The new core modules carry JSDoc types | Stages 1, 15 |
| A23 | **Ruled 15 Oct: yes.** Existing "Pin for reference" records are shown as quotes of a whole message. Nothing is converted or lost | Stage 6 |

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

**Status, 15 October: done.** `npm run check` passes: 41 tests, no lint errors (29 Fast Refresh warnings), build. Known lint findings in components the plan reworks are marked at the line with their stage. The production audit is clean.

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

**Status, 16 October:** the planner follows every ruling, and the dry run is approved (on two of Stefan's backups and a sample that reaches every part of the plan). The upgrade is drafted (`migrations/v6Upgrade.js`) and can be tried on a throwaway copy from `/dev/migration`. The database is still at version 5. It goes to 6 only after the write path below gives every new chat, note and marking a number, since today's screens keep creating them until the new ones replace them. The key moves in its own step: it lives in a separate database, outside the upgrade's transaction.

**19 October:** the write path is built (`records.js`, `recordsModel.js`, choices in C92) and tried on both versions: at version 5 writes are as before and announced; on the trial copy at version 6 new chats, forks, messages, notes, terms, quotes and favourites keep numbers, dockets, steps and the Favorites collection true. Still to do in this stage: restore, backups, the key, keeping storage.

**19 October, later:** restore and backups format 2 are built (C93). One allowlist decides what a backup holds and what a restore accepts; a restore is one transaction, skips identical items and brings changed ones in as copies, and at version 6 numbers and files what comes in by the write path's rules. Automated database tests run on fake-indexeddb (103 tests). Still to do in this stage: the key out of the settings list, asking the browser to keep storage (C88), then the checkpoint and the version going up.

**Checkpoint, 19 October:** everything in this stage is built and tested except raising the version. The saved key lives in the key database (moved on first read, the old copy removed once checked), and the browser is asked once, on the first prompt sent, to keep Parliament's storage, with the answer in Settings. Vitest 5 clears the last audit findings. 111 tests, including the database ones. The database is still at version 5: raising it is put to Stefan at this checkpoint, with the upgrade gate made to report a failed upgrade instead of loading the app on top of it.

**Done, 19 October:** the version is 6 (approved at the checkpoint). The upgrade screen runs the upgrade itself; a failure leaves the data at its old version and the screen says why. Tried on a version 5 copy of Stefan's second backup in the trial database, failure and success both. parliament.ltd is unchanged until a deploy. **Stage 2 is done.**

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
- **Also (16 October):** stored data holds keys and ids, never words of the interface, so a backup made in one language restores in another (C86, done in the planner). Branch letters skip i, l and o. Once there is data worth keeping, the browser is asked to keep Parliament's storage, which matters most in Safari (C88). A restore writes each chat together with its messages, so a tab starting up meanwhile cannot remove a half-written chat.
- **Security and privacy:** keys can no longer reach a backup. Restore stops trusting the file: only known settings are written, each record is rebuilt from checked fields, and file size and the key-stretching count are capped (audit T6).
- **You can try:** the dry run. Export a backup, open `/dev/migration`, load the file. It lists every docket it would make, every number, every favourite, persona and term it would move, and anything it could not place. Then, on your word, the upgrade, with a backup offered first.
- **Needs from you:** the dry run on your real data, and your eye on A13, A15 and A19.

### Stage 3. Shell and bar

The spine. Built behind a flag, so today's screens keep working underneath.

**Status, 20 October:** the pop-out prototype is built and run in Chrome: a bar popped into the always-on-top window stays at full speed while its tab is hidden (`research/popout-prototype.md`); keys inside the window, closing, the real headers, Firefox, LibreWolf and Zen are still to check before stage 5 (Safari waits, C94). The token sheet is drafted for approval (`token-sheet.md`, drawn at `/dev/tokens`). The copy table is set up on Lingui (ruled 20 October): `src/copy.js` with fixed ids, English as the source, an accented test language (en-XA) and a mirrored one (ar-XB) generated on every compile, plurals that work in every language, the language taken from the browser and never the network address, and a lint rule against hard-coded words in the new chrome's folders. `npm run check` collects and compiles the catalogues first. The parser and the verb registry are built (`src/commands/`): the 81 current verbs in the documents, in one array, each with what it takes, where it works, whether it spends, undoes or applies on a click, and a translated gloss. 17 renamed and 7 retired words answer with what to type now, and a mistyped verb with the one it is likely to be. The Enter line's answer, completion and the `?` reference are generated from the array. Nothing is drawn yet, and no verb runs: each verb's action comes with its stage. The points the documents leave open are C95 to C105. Commands can share a line (C99). The field's behaviour (the modes and their leaders, Escape and Backspace as ruled in A3, the reset to `>`, folding to the hexagon), the keys that reach it and the history of commands are built as logic with tests, waiting for the drawing. So are the boards registry and the arrangement: `open:`, `close:`, `move:`, `swap:`, `pop:`, `pop:back`, `bar:` and `reset:` each say before Enter what they would do, each arrangement is kept on this device, and the strip knows what to show. Features are found by looking for them, never by the browser's name. The doubled Cmd/Ctrl+Shift+B is fixed. The token sheet is approved, for now. **The new shell is drawn at `/shell`** (in development, and in builds made with `VITE_PROTOTYPES=1`), beside today's screens: the board strip, the boards as placeholders with the navy rule, the field in its three modes with the Enter line, `?`, the history on the arrow keys, Tab completion, and `open:`, `close:`, `move:`, `swap:`, `bar:` and `reset:`, each kept on this device. `pop:` opens real windows: blank, same-origin and never navigated, styled by links to the built stylesheet, each board's with its own bar; the bar takes the window that stays on top where there is one (C107). The field folds into a circle while a reply is edited (C108): the slide, the mark inside (the chevron rolling into the moon in command mode), hover, a click or Cmd/Ctrl+K to open it, Escape to fold it and return the caret. The first steps toward the new stores are taken: a room tells its blocks which conversation they show (no more reading the address bar), and the reply being written lives in a store kept by conversation, so the rest of the page no longer redraws for each piece of it, each chat can stream on its own, and a reply that ends after its chat was left fills only its own chat. Leaving a chat stops its reply and says so, unless the person opts in to finishing it (C109). Stage 3 is ready for its checkpoint.

- **Before anything else: a pop-out prototype.** The audit found that in a popped window today there are no styles, no shortcuts and no working text selection, and that animations and timers stall when the tab that opened it is hidden. `pop:command` puts the thing everything is typed through into such a window. A throwaway prototype answers whether that can be made dependable before the welcome page promises it.
- **Added**
  - One token sheet and the copy table. You approve the sheet before any chrome is drawn (C51).
  - A chrome style layer that room themes cannot reach, and a room's theme moved from the whole page onto the room (C64).
  - The parser and the verb registry, with the renamed-verbs answers.
  - The field: three modes, 40px tall, 14px corners, fills that wipe in from the left, the Enter line, marginalia inside the prompt field.
  - `/` and Cmd/Ctrl+K; the one Escape rule (A3); the field resets to `>` after a command.
  - Minimising to a circle when you click into a reply (a circle, not the hexagon, ruled 20 October, C108), and `bar:top`, `bar:bottom`, `bar:left`, `bar:center`, `bar:right`.
  - The boards registry, the arrangement, the board strip and the navy rule; `open:`, `close:`, `move:`, `swap:`, `reset:`, `pop:` and `pop:back`.
  - `?` and `help`, generated from the registry.
  - A history of commands. Commands only: never a prompt, a search, or a line shaped like a key.
  - The first steps toward the new stores: each board is told which conversation it shows, instead of reading the address bar, and stream state moves into a store.
  - **Languages, from day one (C87):** the copy table is the translation catalogue, with plurals that work in every language; dates, numbers and money through the browser's `Intl`; layout written with start and end rather than left and right, so it mirrors for right-to-left scripts; `dir="auto"` on every message; a pseudo-language (and a mirrored one) for testing; a lint rule against hard-coded words. The library (react-i18next or Lingui) is chosen here. Commands stay English.
  - Feature detection, never the browser's name. Where a feature is missing the Enter line says what happens instead: in Firefox, LibreWolf, Zen and Safari a pop-out opens as an ordinary window that does not stay on top.
- **Changed:** the double binding of Cmd/Ctrl+Shift+B.
- **Salvaged:** `addresses.js`, `bus.js`, the ignition animations (for `api:` later). **Rebuilt:** everything else here is new; no command layer exists.
- **Security and privacy:** the history never stores content. Window titles and addresses carry numbers and kinds only. A popped window is blank, same-origin and never navigated, and takes its styles from the built stylesheet, not copied text, so the policy can lose `'unsafe-inline'`.
- **You can try:** switch the flag on. Type `>`, then `?`. Move the bar with `bar:bottom`. Click away and watch it fold to the hexagon. Open and close a board. Pop one into a window.
- **Needs from you:** approval of the token sheet; your verdict on the pop-out prototype; A1 and A3. Once the flag is on, a second look at commands sharing a line and their limits (C99, to revisit live).

### Stage 4. A room in the shell, no key needed

The first prompt on the welcome page is answered from Wikipedia, so a keyless
source has to work before the page can.

**Status, 21 October: all six pieces built; ready for the checkpoint.** Built in six pieces, each committed and checked before the next:
1. **Groundwork (done):** the list of providers and sources (`src/net/list.js`), with the site's connection policy now generated from it and unchanged; the key module (`src/net/keyring.js`), one key per provider, saved by default or held for the tab with "Don't save"; and the gateway (`src/net/gateway.js`), which refuses what is not shipped, picks the key by provider, and labels each request. Not yet in use.
2. **Every request through the gateway (done):** chat send, Continue, the title, summary and tags, branch summaries, the review synthesis, both regenerate paths, the document review, the dashboard and the ripple scan; key checks through `gateway.check`; presence checks that decrypt nothing; Settings and the setup wizard keep keys through the key module, so "Don't save" works, and changing how the key is kept moves it. A lint rule, itself tested, keeps provider code, key functions and the network reachable only through `src/net`.
3. **Wikipedia, the first source (done):** a manifest with no code in it (`src/net/sources/wikipedia.json`), read by one runner for every source (`src/net/sources.js`); plain text only, in the person's language, with its page, revision and licence; no credentials and no referrer; addresses checked against the list. Every language edition joins the connection policy (C110). The network log keeps addresses without their query, so searches never reach it. Checked with real lookups in English and Swedish.
4. **A room in the shell (done):** a room hosted as a board (`src/chrome/RoomBoard.jsx`), its theme set on the room and not the page (C64), its input block left out so the bar is the only composer (C37). `alm:` and `sym:` go between screens, each keeping its own arrangement (C95, C102); `sym:` goes to the last room, or an empty room whose first prompt starts its chat. (Changed in stage 5 by C125: one space, and `alm:` and `sym:` bring their boards into it.) `p>` sends to the room on screen: to the provider with a key, to Wikipedia without one (`askSource` in the chat context), the answer kept as text with where it came from. The Enter line names who receives a prompt and, with a key, a local estimate of its tokens and cost (C83); marginalia in the prompt field says "answered from Wikipedia" or "answered by" the model. An untitled chat is titled from the prompt's first words, sending nothing. Checked in the in-app browser with real Wikipedia answers in a clean origin with no key.
5. **Sending by conversation (done):** messages are kept by chat in the chat store, and a send builds its history from the chat it goes to. Hidden messages and messages waiting to be deleted are not sent, and the Enter line says how many stay out; a delete completes even if the chat was left. Answers from sources are not sent to a model unless the person acts on them (C115, ruled 21 October; the act comes with stage 8), and the Enter line says how many stay out. Replies cut off by the length limit or an error are marked as cut off and say so. One request for title, summary and tags replaces three (C62), named on the Enter line with its cost, with a switch in Settings, on by default; off, or with no key, a chat is titled from its first words. A reply that stalls behind a network that holds streamed replies is stopped and marked, and the Enter line offers to send it again without streaming, naming the cost; it is never resent unasked (C114 (b), ruled 21 October).
6. **The rest (done):** `name:` for the room (C40): the person's own words kept on the room record, shown in the room's header and on the Enter line ("→ 202 in Owl questions"), with built-in rooms shown by their template's name in the reader's language until named (C90). One shared Markdown component (`src/components/core/Markdown.jsx`) in place of the five live set-ups, with one fixed policy: raw HTML shown as text, links to web and mail only and opened with no opener, images never loaded but shown as links (closes audit T8). R25 put to Stefan at the checkpoint.

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
  - Before Enter, the line under the field shows a local estimate of the tokens; real counts are taken from each reply afterwards. Nothing is sent to count (C83).
  - A reply that stalls behind a proxy that holds streamed answers falls back to a request without streaming.
- **Salvaged:** `InputArea.jsx`'s feature logic, `fileUpload.js`, the stream parser and error mapping in `anthropic.js`, `networkLog.js`. **Rebuilt:** how a request reaches a provider (13 places read the key and 17 fetch a provider today).
- **Security and privacy:** a prompt to Wikipedia is a search sent to a third party, so it is named before Enter and never sent while typing. Source requests carry no credentials. Source text is shown as text, never as HTML, and can never run a command. What is sent finally matches what is shown: hidden and deleted messages stop going out. A reply cut off by a limit or an error is marked as cut off. This stage closes audit findings T4 ("Don't save") and T8 (Markdown).
- **You can try:** in a private window with no key: `>`, `bar:bottom`, `p>` and a question. The answer comes from Wikipedia. Then `name:"…"`.
- **To try once pushed to production** (Stefan, 21 October: tested there rather than now):
  - In a private window with no key: `/shell`, `>sym:`, then `p>` and a question; the answer comes from Wikipedia with its page, revision and licence. Then `>name:"…"`, and `>alm:` and `>sym:` bringing their boards beside what is there (C125). The ink pot drains and refills.
  - With a key: the Enter line's cost before a send, and "After the answer, one short request for its title, summary and tags" on a chat's first prompt; the title, summary and tags arriving in the chat lists; hidden messages named as staying out; the switch "Name a new chat after its first answer" in Settings.
  - A reply cut off by the length limit or an error, marked as cut off; a stalled reply (on a network that holds streamed replies) offered again without streaming, with its cost; the ink pot spilling.
  - Under the real headers: the connection policy lets Wikipedia through in every language edition (C110).
- **Needs from you:** nothing new. R25 is put to you here. **Ruled 21 October:** R25 approved, carried out only once the bar carries the composer's features (with R24); R32 approved.

### Stage 5. The welcome page

Your first target. The page is the lesson: every step is a real command.

**Status, 21 October: all six pieces built; ready for the checkpoint.** Built in six pieces, each committed and checked before the next. Where a point is open, it is built as suggested in `conflicts.md` (C118 to C123, C125 to C130), so a ruling changes one entry. Names ruled and made (C131): Records, Plan, Room, Keyword, Framework, with the commands. R15 approved for when `/` shows the welcome page. The catalogue's names and descriptions are in the copy table too.
1. **The page:** the welcome screen in the shell: one large card with "Welcome", the eight steps as ruled (2 `bar:bottom`, 6 `pop:almanac`, 8 `api:`), the letter, the field in the card with no box at rest, and the footer. Steps cross off from what really happens, kept on this device. `tour:` and `tour:off` (A20). `/shell` opens on it for someone who has made nothing (C118).
2. **The first prompt beside it:** `p>` starts a chat in its own card on the right of the welcome card, which narrows to one column; boards the steps open stack on the right. **Done, with C125 and C126 (ruled 21 October):** what is on screen is one space; `alm:`, `sym:` and `tour:` bring their boards into it, and a prompt with no room starts its chat in a room beside the card. A narrow room shows the conversation first, its side panels behind the buttons at its top. The edges between boards stretch (drag, double click, arrow keys), `width:` does the same from the bar, and the widths are kept with the space. The welcome card turns to one column by its own width.
3. **A thin Almanac:** rows with their numbers, pinned first, `open:` by number, `inspect:`. Enough for steps 4 and 5. **Done:** the table of v30's columns, fewer as the board narrows; a click writes `open:<number>` in the bar; `open:` shows a chat in the room or brings one beside; `inspect:` shows one thing in detail under the bar. Which rows it shows is C127. The welcome page also shows Parliament's mark before "Welcome".
4. **A thin Library:** read-only, from one read layer of the catalogue. Enough for step 7. **Done:** `lib/catalogue.js` returns your rooms, the templates, the boards, layouts, blocks, themes and resources from the code's own manifests (the stores only for your rooms and what is still to come); the board lists them by shelf, with facts as marginalia and "open" on boards (C128).
5. **The key panel:** `api:` opens a password field password managers leave alone, checked and kept through the key module, with the gold ignition once per new key. Enough for step 8. It suggests a key for Parliament alone with a spending limit, and links a "revoke and replace" guide (security notes §2; the vault waits, S1). **Done:** `api:`, `api:<provider>` and `api:new` open the panel under the bar; Save checks the key with its provider first, then keeps it through the key module; the gold ignition plays once per new key; a prompt holding a key is refused before Enter (C129).
6. **The ending and the rest:** "Welcome / to Parliament", "Now, let's focus:", `focus:` and `focus:off`, the line for small screens, the storage notice (C94), the pseudo-language check; then the plain-language pass on names (A6) and R15 put to Stefan. **Done (C130),** with the names (C131) and R15 put to Stefan; renames wait for his choices.

Steps 9 and 10 of welcome v9 (strike a line, leave the AI a note) need editing in place and come with stage 11 (A7); the ending then moves after step 10.

- **Added**
  - The page: one large card, the letter, the eight steps, the field with no box at rest, the footer, the ending ("Welcome / to Parliament"), and the line that offers `focus:`.
  - Steps as ruled: step 2 is `bar:bottom`; step 6, `pop:almanac`, is where `pop:` is introduced; step 8 is `api:`.
  - A thin Almanac board: the table with your rows and their numbers, pinned rows first, open by number, `inspect:`. Enough for step 4.
  - A thin Library board, read-only: rooms, layouts, blocks, themes and resources from the one catalogue read layer. Enough for step 7.
  - The `api:` panel, with the gold ignition once per new key. Enough for step 8.
  - `focus:` and `focus:off` in their first form: the chat alone, and back.
  - `tour:`, `tour:off` (A20).
  - One line on small or touch-only screens: "built for a computer for now; the phone comes later".
  - Where the browser has not agreed to keep Parliament's data, the page says so plainly, with how to let the site keep it, and offers a backup (C94). It names no browser.
  - Before this stage ships: a plain-language pass over every name a newcomer meets (Almanac, Docket, Collection, collab, term, quote, the short board titles in the strip), made in the copy table, with you (A6).
  - Built ready for translation and checked in the pseudo-language; shipped in English first. How people switch language is ruled (`conflicts.md`, 16 October): `language:` in the bar, and the globe beside the language's own name as marginalia at the top of this page and in Settings. No languages board and nothing on first load.
- **Changed:** `/` shows the welcome page to someone new and the Almanac to someone with work. Links carry numbers (`/207`); old links still resolve.
- **Salvaged:** `IgnitionStep.jsx`'s key check and `useShimmer.js`; the pin-first ordering and search from `SelectorLayout.jsx`; `LibraryCard`, `LayoutSilhouette` and the pure helpers in `EditorLibraryMode.jsx`. **Rebuilt:** the catalogue read layer.
- **Security and privacy:** no key is ever typed into the bar; `api:` opens a panel with a password field that password managers are told to leave alone, and a line that looks like a key is refused before Enter. The footer says "MIT licensed. Source published at launch" until the repository is public (C71). The letter's sentence about where requests go reads true for every provider.
- **You can try:** the whole page in a clean browser profile, steps 1 to 8, then the ending and `focus:`.
- **Needs from you:** the letter's final wording, the two footer links, and whether step 8 crosses off on seeing the key panel or on saving a key. R15 is put to you here.

### Stage 6. Almanac and Collection in full

Read with C131: the Almanac is **Records**, a docket a **plan**, a term a **keyword**, and the `room:` filter is folded into `in:`.

**Status, 21 October: split into eight pieces**, each committed and checked before the next. Points the documents leave open are C132 to C139, each built as suggested so a ruling changes one entry. A19 and retirements R1 to R9, R11 to R13 and R27 are put to Stefan at the stage's checkpoint, after piece 8. **Checkpoint, 22 October:** all eight pieces done. A19 kept; R1 to R5, R7 to R9, R11, R12, R13 and R27 approved, the homepage ones carried out when `/` shows the new screens; the new stored fields approved. R6 reopened as favourites becoming a tag (C147), ruled yes the same day. **Stage 6 finished, 22 October:** `/` opens the new screens and `/chats`, `/edit-home` and `/shell` lead there; the approved retirements are in `src/deprecated/` (R1 to R5, R7, R8, R11, the first part of R12, R15, R27; the old top bar stays for the build wizard until R14); "Pin for reference" reads "Quote in a chat" and the chat's panel "Quotes" (R13); the heart keeps a quote of the whole message tagged `favorite`, `tag:favorite` lists every favourite, and Favorites is an ordinary collection (C147). The conversion of old favourites into tagged quotes is built and has not run: its dry run is shown on Stefan's data first.
1. **Search and every filter.** On Records the bar's search narrows the table as you type: titles, summaries, tags, rooms, notes, keywords, quotes, and the words inside chats and documents. Every filter (`type:`, `tag:`, `model:`, `from:`, `in:`, `has:`, `cost:`, `since:`, `until:`, `sort:`), commas for "or" and a minus to leave out, with the Enter line saying how many rows will show. The filters in force are one line at the top of Records; a click on one removes it (`clear:tag`), and `clear:filters` removes them all. Keywords and quotes are rows when filtered for or found by a search (A19). From now on each reply keeps the model that answered and its tokens, so `cost:` can be worked out (C132). *Try:* type a word in the bar on Records; `>type:chat`; `>tag:x -tag:y`; `>since:7d sort:oldest`; `>type:keyword`; `>clear:filters`. **Done, 21 October:** `lib/recordsFilter.js` (the view, every filter, dates), `lib/chatFacts.js` (what is inside each chat, read once and kept until it changes), the line of filters on Records, and `model` and `usage` on new replies (carried in backups, checked on restore). Checked in the in-app browser on the pane's two chats, in English and both test languages.
2. **Saved searches, columns and long tables.** `save:"…"` and `forget:`, the saved searches at the top of Records; `cols:-room +created`, kept on this device; rows drawn only when on screen. *Try:* save a search, reload, run it again, forget it; hide a column; a table of thousands of rows. **Done, 21 October:** `lib/savedSearches.js` (kept on this device, worked out again when opened, C140), `open:"…"` for a saved one, the saved searches and a `save:` link at the top of Records; `cols:` kept with the space, put back by `reset:` (C141); `chrome/rowWindow.js`, drawing only the rows in view (C142). Checked in the in-app browser on the pane's chats, and on 3,000 test chats in the trial copy (`parliament-v6-trial`), where 24 to 37 rows are drawn at a time.
3. **Row verbs and undo.** `pin:`, `archive:` (C135), `copy:`, `name:207 "…"`, `tagadd:`, `retag:`, `untag:` (C136), each saying before Enter what it changes, and `undo:` for them (C134). *Try:* pin a chat, tag three things, rename a tag, archive one and bring it back, undo each. **Done, 21 October:** `lib/rowVerbs.js` (each verb planned before Enter, several on one line), `records.changeRecords` (all or nothing, refusing what changed meanwhile, "last active" untouched), `lib/recordsMarkdown.js` for `copy:` (and `export:` next), and `undo:` in the shell for the last 50 lines of the tab (C134, C143). New optional fields: `archived` and `tagsMine` on every kind, `pinned` and `tags` on quotes. Checked in the in-app browser on the pane's chats, each change taken back, the clipboard stood in for inside the page.
4. **`erase:`.** One thing or more for good, by number: the Enter line names what goes, what happens to its markings, and that undo cannot bring it back (C137). *Try:* erase a test chat that has a keyword; then one with `all`. **Done, 21 October:** `records.eraseRecords` (all or nothing; today's delete shares its removal), `rowVerbs.planErase` (everything named on the Enter line), kept markings detached and marked `erasedFrom` and kept by a restore (C137, ruled as suggested). Checked in the in-app browser on test items in the trial copy only.
5. **Export.** `export:md` and `export:jsonl` of rows by number, of the table as filtered, or of a collection, with sources footnoted (C138). *Try:* export two chats as Markdown and read the file. **Done, 21 October:** `lib/recordsExport.js`: what an export holds (each thing once: a plan over its chats, a chat with its markings), Markdown with a line saying what it is and footnotes numbered across the file, JSONL one line per thing, a name of numbers and a day; `copy:` now shares it. `export:` alone takes the table as shown. Checked in the in-app browser on the pane's chats, the download stood in for inside the page.
6. **The Collection, as cards.** To collection board v3 and the editing spec: cards, tabs by kind shown only when they hold something (A16), three orders and `heading:`, the numbered source picker; `new:collection`, `add:`, `rm:`, `name:`, `clear:`, `forget:`; Favorites is the first collection; "Pin for reference" shows as a quote (A23) (C139). *Try:* `new:collection`, add three things, a heading, name it, reload. **Done, 21 October:** `lib/collections.js` (what a collection holds, and a write that refuses one changed meanwhile), `lib/collectionCards.js` (the cards, each once, and the three orders), `lib/collectionVerbs.js` (each command planned before Enter), `chrome/CollectionBoard.jsx`. A held chat or plan shows its markings live; `undo:` takes collection changes back; search follows the board the bar points at, each board keeping its own (C144 (h)). New on stored collections: `order` and items of kind chat, plan and marking (shown at the checkpoint). Checked in the in-app browser in the trial copy only, with four test markings seeded there.
7. **The four acts, and finding.** Note, tag, summarize and prompt over selected cards (`summarize:` names its one model call and cost first); quoting a passage from a chat; `compare:` with no model call; a card's number finds its passage in the chat, and a marked passage finds its card. *Try:* quote a passage, write a note quoting two cards, compare two. **Done, 21 October:** `lib/cardActs.js` (each act planned before Enter), `lib/wordDiff.js` and `chrome/Compare.jsx` for `compare:`, `records.addOwnNote` (a note with no chat, taken back by `undo:`), a `summarize` call in the provider interface, and Quote in the menu over a selection in a chat. A box on each card selects it; the acts write their commands into the bar; Prompt turns the bar to a prompt about the cards. `jump:` finds a number on the board the bar points at, a card's number finds its passage, and a quoted passage finds its card (C145). New stored fields: `quotes` and `summary` on notes (shown at the checkpoint); collections' `order` is now kept by backups too. Checked in the in-app browser in the trial copy, the key check and the gateway stood in for inside the page so nothing was sent.
8. **The rest.** The backup reminder as one line of marginalia at the top of Records (C94); a link's full address before it opens (security notes §1.3); `close:` and `width:` by a room's number, and `close:welcome` (C125). Then the checkpoint. **Done, 22 October:** the backup reminder as one line on Records, worded more plainly where the browser has not agreed to keep the data, with "back up in Settings" and "not now" (the old banner stays until R27 is ruled); a link in a reply shows its whole address on hover, on keyboard focus, and at a first tap on a touch screen, a look-alike name in its `xn--` form; `close:204` and `width:204 60%` act on the room showing that chat, and `close:welcome` closes the welcome card from anywhere (C146). Checked in the in-app browser in the trial copy.

- **Added**
  - Every filter (`type:`, `room:`, `tag:`, `model:`, `from:`, `in:`, `has:`, `cost:`, `since:`, `until:`, `sort:`), saved searches, `cols:`, and rows drawn only when on screen.
  - Row verbs: `pin:`, `archive:`, `copy:`, `export:`, the tag verbs, and `erase:`.
  - The Collection, to collection board v3 and the editing spec: cards, not a table; highlights, terms, quotes and notes; the four acts (note, tag, summarize, prompt); headings; a numbered source picker; finding a marking from its card and its card from the marking.
  - `new:collection`, `add:`, `rm:`, `compare:`, `heading:`, `note:`.
  - The backup reminder as one line of marginalia at the top, in ink, only when it is news; sooner and plainer where the browser has not agreed to keep the data (C94, `backupReminder.js`).
  - The Almanac export of selected rows as markdown or JSONL.
- **Changed:** "Pin for reference" becomes a quote (A23).
- **Salvaged:** bulk actions and family grouping from `SelectorLayout.jsx`; today's highlights, notes and annotations code. **New:** the Collection.
- **Security and privacy:** `erase:` takes explicit numbers only, names what will go on the Enter line, and cannot be undone, so the line says so. Erasing something with markings says what happens to them first. Exports footnote their sources.
- **You can try:** your migrated data. Filter it, pin, collect a few things, quote a passage, write a note that quotes them, erase one item.
- **Needs from you:** A16 to A19, A23. Retirements R1 to R9, R11 to R13 and R27 are put to you here.

### Stage 7. Providers, sources and collab

Can start as soon as stage 4 is done, beside stages 5 and 6.

Read with C131: collab is now **Framework** (`framework:`), the Almanac **Records**.

**Status, 22 October: split into eight pieces**, each committed and checked before the next. Points the documents leave open are C148 onward, each built as suggested so a ruling changes one entry. The picker has the three groups A14 ruled, not the two this section first said (C148). The cost marks (C34), A8, A14, a second look at personas (A13), and retirements R22 and R23 are put to Stefan at the checkpoint, after piece 8. **All eight pieces done, 22 October** (C148 to C170); the checkpoint is with Stefan. C34 was ruled as C153, A8 and A14 on 15 October; **Checkpoint ruled 22 October** (Rulings section): replies follow the language chosen, and `language:` at stage 9 sets everything at once; the filter off by default; Ollama's cloud models out; the vault at stage 15; R22 and R23 approved; A13 kept; C163 (e) built. Stefan's Mistral try came back with nothing: fixed so an empty reply is never silent and hosted Mistral models are asked not to reason first (C171), to try again with the key.
1. **Who answers: the picker and the lineup.** The current models with dated ids, prices and cost marks against Haiku (C34), in one list that the picker, the Enter line and the costs on Records all read; the picker in the three groups ruled (Models, On your machine, Sources with no tokens), with numbered boxes, a cost mark and one line on each row, opened from "answered by" in the prompt field; `by:` chooses who answers in this chat, one at a time until branches (stage 8); a stored default checked against the list. *Try:* click "answered from Wikipedia" in the prompt field; `>by:` and `>by:sonnet` with no key (it says one is needed); with a key, `>by:haiku`, a prompt, and the Enter line naming Haiku and its cost. **Done, 22 October:** `net/answerers.js` (the picker's rows, cost marks, finding by name, who answers a chat), the current lineup in `providers/anthropic.js` with prices checked that day and the old short ids read as the models they stood for (C151, C153), `chrome/AnswerPicker.jsx`, `by:` in the registry and the preview, and `answerer` on a chat, **a new optional field, shown at the checkpoint** (C150). The small requests moved to Haiku 5.5 (C154). Old prices corrected, so costs on Records change (C153). Checked in the in-app browser on the trial copy, the key and the gateway stood in for inside the page so nothing was sent to a provider.
2. **Hacker News and OpenAlex, and the network log by host.** Two manifests read by the one runner, as lists of results; "English only" on both; OpenAlex's daily allowance stated where it is picked; "This source isn't reachable from your current network" when a source refuses the network; both hosts join the connection policy; the network log grouped by host, each request named by what made it, no queries. *Try:* `>by:hackernews` and a question, `>by:openalex` and a question, then the log. **Done, 22 October:** `net/sources/hackernews.json` and `openalex.json`, read by the one runner as lists of results with four named readers and no code (C156); both hosts in the connection policy; a list drawn in the chat with each link showing its address before it opens; "English only" and "mostly English" in the picker, OpenAlex's allowance on its row and its Enter line; a refusal from the network said as such. **New optional fields in a source answer's note (`shape`, `items`), shown at the checkpoint.** `net/requestLog.js` groups the log by host, named from the list, with what made each request; today's Settings card shows it with the draft wording (C157). The welcome letter's sentence now names public sources (C158). Also, before this piece: Sonnet 5.5 the default (C155), and the favourites conversion running once on its own at start (C147). Checked in the in-app browser with real lookups, on the trial copy and under the site's real headers (`vite preview`).
3. **Mistral.** The provider behind the interface (streaming, the whole reply without streaming, the key check), its three addresses with a processing region and its price, dated model ids, which company made each model, Labs and Preview models marked, its first-tier languages; the key panel lists it. *First:* Stefan streams one reply with his own key; if it fails, it comes back to him before more is built on it. *Try:* `api:mistral`, `>by:mistral`, a prompt; the region. **Built, 22 October; waiting on Stefan's test with a key:** `providers/mistral.js` behind the interface, its three addresses in the connection policy, the region in its key panel row (`mistralRegion`, **a new setting, shown at the checkpoint**), its models with who made them and a preview marked, keys and sending by the provider of the model that answers, and the title request to that provider (C159). The small requests' instructions moved to `providers/shared.js`. Checked in the in-app browser with a key and the gateway stood in for, so nothing was sent to Mistral. Also: Drafting Desk's review uses the default model (ruled 22 October), Wikipedia lookups name Parliament (C160), and the questions on Anthropic's new API version and two local models answered (C161, C162).
4. **Ollama.** On its exact local port, checked only when asked (C33): an explanation before the browser's prompt for reaching this machine, and how to allow it again if it was refused; the models on the machine, marked free; Settings saying to allow Parliament's own address in Ollama, not every site. *Try, with Ollama running:* its check, `>by:` a local model, a prompt. **Built, 22 October; waiting on Stefan's try with Ollama itself:** `providers/ollama.js` on `http://localhost:11434` (in the connection policy); Ollama's row in the key panel, looked for only when asked, with why before the browser asks, how to allow it again, and `OLLAMA_ORIGINS` set to Parliament's own address; the models it has in the picker, free; prompts streamed, thinking left out (C163). **New setting `localChecked`, on this device only, shown at the checkpoint.** Checked in the in-app browser against a stand-in Ollama, since none is installed here. Also: Mistral's key worked in Stefan's local test (22 October). **Then, with Ollama and `bonsai-2:9b` on Stefan's machine:** a model's thinking is shown as it goes, under a clock, and folds to one line when the answer starts; kept with the reply, never sent back; **off by default** (ruled 22 October), `thinking:on` to turn it on (C165). **New optional fields `thinking` and `thinkingMs` on a reply, and the setting `thinking`, shown at the checkpoint.**
5. **Frameworks.** `framework:` with the five built in and your own, stacking in the order ticked, kept with the chat until turned off, named on the Enter line and on each reply; their picker in the field (Built in, Yours); your own written from the bar until Settings (stage 9); personas looked at again (A13); frameworks and personas arriving in a restored file shown before they apply. *Try:* `>framework:pushback, uncertain`, a prompt, the reply naming both; `>framework:off`. **Done, 22 October:** `lib/frameworks.js` (the five built in, stacking, reading the command), `lib/frameworkStore.js` (yours, in the `collabs` list), `chrome/FrameworkPicker.jsx` and "framework:" in the prompt field, `new:framework` and `forget:` for yours, the Enter line naming them, and each reply recording and naming what it was written under (C164). **New optional fields, shown at the checkpoint:** `frameworks` on a chat and on a reply. Checked in the in-app browser on the trial copy, the gateway stood in for with a canned reply. Piece 4 also tried with Ollama itself and `bonsai-2:9b` (C163).
6. **Reply language and translation.** A language for replies, separate from the interface, added to the prompt for every provider and named on the Enter line; language tags on models, and "English only" or "in your language" on sources; translating a query or a result, opt-in and named on the Enter line, by the browser's on-device translation, a local model or the chosen provider (C84, C85); `helper:`, the model that reads text from sources. *Try:* replies in Swedish to a prompt in English; translate a Hacker News result. **Done, 22 October:** `lib/languages.js` (finding a language by its code or any of its names, what replies are in, the line sent to models), `reply:` (C166 (a) to (c)), the line in the system prompt for every provider and on the Enter line; Wikipedia asked in the reply language's edition, then the English one; `helper:` (C166 (d)); `translate:` for the last answer from a source and `translate:on` for questions to English-only sources (`net/translate.js`: the browser's own translation by feature detection, else the helper; `lib/translations.js`; a `translate` method on each provider). **New optional fields `translation` and `asked` on a message, and the settings `replyLanguage`, `helper` and `translateQueries`, shown at the checkpoint.** No language marks on models: none are published per model (C166 (h)). Checked in the in-app browser on the trial copy: `reply:svenska` and a prompt whose system line asks for Swedish (the key and the provider stood in for), real lookups to Hacker News and Swedish Wikipedia, a translation stood in for, and a real one by bonsai-2:9b on Stefan's machine, of an answer and of a question. The pane's own translation never answers its check, so the browser's path is still to try in Chrome. Fixed on the way: new settings lost on reload, a first prompt with no room not naming the title request, and the small requests to a local model letting it think.
7. **Privacy on every row.** A training label and a retention mark on each provider's row, and the Mistral checklist (security notes §3); the privacy filter for fixed formats (emails, phone numbers), plain code, with the Enter line saying what is swapped (its default is open, §7); citations a provider returns with a web search kept and shown. *Try:* a prompt holding an email address with the filter on; a reply with web search and its citations. **Done, 22 October:** what each provider does with what it is sent, in the one list (`data`: training, how long kept, the day checked and the page), on each model's row in the picker and under each provider in the key panel, with Mistral's checklist and its preview model marked as trained on (C167 (a) to (c)); Ollama's cloud models left out, since they run on its servers (C167 (d)); `lib/privacyFilter.js` and `privacy:`, swapping email addresses, phone numbers, IBANs and card numbers for placeholders in every request off this computer and back in the reply, named on the Enter line, off by default with the line noticing (C167 (e), (f)); web search citations kept and shown (C167 (g)). **New setting `privacyFilter` and optional field `citations` on a reply, shown at the checkpoint.** Checked in the in-app browser on the trial copy with the key and the provider stood in for: the marks, the panel, a prompt holding an email address and a phone number sent with placeholders and answered with them put back, and a reply's citations.
8. **The rest, then the checkpoint.** Wikipedia's search ranking (`conflicts.md` Part 4); the names filter and the injection check offered only with a local model (S3); the vault's scope review written up (S1). Then the checkpoint, with R22 and R23. **Done, 22 October:** `lib/searchWords.js`, a question to a source searched for without its leading question words, said on the Enter line and kept with the prompt (C168); `privacy:names`, names found by a model on this computer and swapped too, and `check:` with the free check of `lib/injection.js` marking words that read like instructions under a source's answer, both offered only with a local model (C169); `research/vault-scope-review.md`, put as C170. Checked in the in-app browser: "What is a barn owl?" answered from "Barn owl"; names found and a check run by `bonsai-2:9b` on Stefan's machine. No new stored field: the setting `privacyFilter` takes `names` too.

- **Added**
  - Mistral (a streaming test with a real key comes first; if it fails it comes back to you), and Ollama on exact local ports, checked only when you ask.
  - Hacker News and OpenAlex, with OpenAlex's daily allowance stated where it is picked.
  - The current model lineup with cost marks, and the picker in three groups with numbered boxes (A14, as ruled; this line said two until C148).
  - The network log grouped by host, each named by who called it, with no query strings.
  - `collab:`: five built in, your own, stacking in the order ticked, kept until turned off, and named on each reply. `helper:` for the model that reads keyless-source text.
  - **Reply in:** a language for replies, separate from the interface, added to the prompt for every provider and named on the Enter line.
  - Mistral's three addresses (global, EU, US), with a processing-region setting and its price; dated model ids in rooms, never `-latest`; which company made each model; language tags on models; "English only" badges on sources.
  - Translating a query or a result is opt-in and named on the Enter line, by the browser's on-device translation, a local model or the chosen provider (C84, C85).
  - Before the first request to a model on this machine, an explanation of the browser's permission prompt; if it was refused, how to allow it again.
  - "This source isn't reachable from your current network" for sources that refuse a VPN's address.
- **Changed:** the model list and prices; a stored default model is checked against the provider's list. Citations a provider returns with a web search are kept and shown; today they are dropped.
- **Salvaged:** the five presets and `buildSystemPrompt`'s join from Collaboration mode. **New:** stored collabs and the record on each reply.
- **Security and privacy:** each key goes only to its own provider's fixed address. The policy lists each host exactly, and localhost by exact port. The page connects only to providers you have set up. Settings tells people to allow Parliament's own address in Ollama, not every site. Collabs and personas that arrive in a restored file are shown before they are applied.
- **You can try:** the same question to Mistral, a local model and Hacker News; `collab:pushback`.
- **Needs from you:** the cost marks for the newer models (C34), A8 and A14, and a second look at how personas came across (A13). R22 and R23 are put to you here.

### Stage 8. Branches

Built to branch slider v9 and the editing spec.

Read with C131: a docket is a **plan**, so a branch's address is its plan's number and a letter (`203b`), and the slider's "chat 201" is plan 203 with its chats as branches.

**Status, 22 October: split into six pieces**, each committed and checked before the next. Points the documents leave open are C172 onward (`conflicts.md` Part 13), each built as suggested so a ruling changes one entry.
1. **One prompt to several.** `by:` with several names, or several boxes ticked in the picker in the order wanted, held for the next prompt; the Enter line names each recipient and its cost; on Enter the chat on screen answers with the first, and each other is a new lettered branch of its plan, taken from the same point, all writing at once; each copy of a message keeps a link to the one it came from; the prompt in each carries the group it was sent with. *Try:* tick three, one prompt, three replies writing at once, the plan on Records. **Done, 22 October:** `by:` with several names and the picker's numbered boxes, held for the next prompt (C172 (c)); the Enter line naming each with its cost and the total; on Enter, the chat here answers with the first and each other is a new branch of its plan, made from the same point with whole copies that keep `from`, each with its own `answerer` and the chat's frameworks, the prompt in each carrying `group`; one title request for all. **New optional fields `from` and `group` on a message, shown at the checkpoint;** a restore rewrites both. Found and fixed: a branch's copies dropped a source answer's note, so a copied Wikipedia answer would have gone to a model as its own words (C115). Checked in the in-app browser on the trial copy: three branches of plan 201, a real Wikipedia answer and two stood-in models.
2. **The slider.** The replies to one prompt as tabs (letter, who answered, writing, stopped, continued), arrows either side, ⌥← ⌥→ in the field and ← → when it is empty; under each reply `open:203b` and `open:203b summary`; one branch carried on shows below the tabs, several each in their tab; a branch writing in a tab is never stopped by looking at another. *Try:* switch tabs while all three write. **Done, 22 October:** `lib/branchGroups.js` (what a room draws), `stores/branchView.js` (the tab shown, stepping), `components/core/BranchSlider.jsx` in the room's message list, the other branches read from their chats and watched while shown, a chat left only when nothing on screen shows it (`watch` in the chat store), ⌥← ⌥→ and ← → in the bar, and marginalia writing `open:` into the bar (C173). No new stored field. Checked in the in-app browser on the trial copy: the three branches of plan 201 as tabs, a real Wikipedia answer in b, the keys stepping through them.
3. **The reply target.** `to:203b`, `to:all`, `to:203a, 203c`; "to 203a · all three" in the field and its picker of branches with numbered boxes; it follows the tab viewed until held; replying to one makes it the line the room carries on; replying to several carries each on; the Enter line names each and its cost. *Try:* reply to one branch, then to all three. **Done, 22 October:** `replyTargets` in `lib/branchGroups.js`, `to:` in `lib/branchVerbs.js`, `chrome/ReplyPicker.jsx` from "to 201b" in the field, the room moving to the branch it carries on, several carried on at once (C174). No new stored field: what `to:` holds is kept for the tab. Checked in the in-app browser on the trial copy: a prompt from tab b went to Wikipedia's branch and the room moved to 203; viewing c kept the prompt on b, said so; `to:all` sent the next prompt to all three, two writing at once in their tabs.
4. **A branch in its own room, and from a summary.** `open:203b` shows it in a room of its own beside; `open:203b summary` starts the next letter from a summary of it, one model call named with its cost and the room it frees. *Try:* both, from a long branch. **Done, 22 October:** `open:203b` shows the branch in the room here, or brings a room beside, keeping its letter (the space holds one room: C175 (a), put to Stefan); `open:203b summary` has the helper write a summary of the branch, its turns labelled and a source's answers marked, then the plan's next letter starts from it alone, with the branch's answerer and frameworks, and the room moves to it; the Enter line names the call, its tokens and cost, the context estimate, and the sources that go in; the slider shows "context 41% → 7%" beside each `open:… summary` (`lib/branchSummary.js`, `summarizeChat` on each provider). A model is sent the summary on the person's side, said to be one (C175 (e)). **New optional field `summary` on a message, shown at the checkpoint;** a restore rewrites it. Checked in the in-app browser on the trial copy with a stood-in key and model: 201a summarized into 201d, the room moving to it, the next prompt carrying the summary; `open:201a` back to its whole history; 201b's line naming 201e and Wikipedia.
5. **Asking again, and an answer brought into a prompt.** `again:203a` asks a branch's last prompt again as a new branch (from the edited prompt once editing comes, stage 11); an answer from a source brought into a prompt on purpose (C115) as labelled, untrusted data, invisible characters out and words that read like instructions marked, for every provider. *Try:* `again:`, and a Wikipedia answer brought into a prompt to a model. **Done, 22 October:** `include:` (a new command, its name put to Stefan: C176 (a)) holds an answer from a source for the next prompt; on Enter it is read again and checked in a worker (`lib/sourceCheck.js`), kept on the prompt as `included`, and sent to Anthropic as `search_result` blocks and to the others as JSON, with a system line saying it is data and flagged words named (`withIncluded` in `providers/shared.js`); the prompt's line says so and counts it; the room says it under the prompt. `again:` asks a branch's last prompt again as the plan's next letter, by its answerer, with what it brought in, and the new reply joins the prompt's tabs (C177); the line's tab now draws a later prompt's tabs inside it (C177 (c)). **New optional field `included` on a message, shown at the checkpoint;** `group` on stored prompts changes when one is asked again. Checked in the in-app browser on the trial copy with a stood-in key and model: Wikipedia's answer in 201b brought into a prompt to Sonnet in 201a, sent with it and shown under it; the check run in a worker; `again:` making 201f, its tab writing at once beside 201a and 201e, the request carrying the Wikipedia answer again.
6. **The rest, then the checkpoint.** Forking from a message writes a lettered branch through the same path; the hosted injection check (C169 (d)); the privacy filter's reach over questions to sources and translations (C167 (e)). Then the checkpoint, with R26. **Done, 22 October:** `new:branch` from a chat's end, or after a step (`new:branch 201a 2`), the next letter of its plan, shown in the room; "Branch from here" on a message writes that line into the bar in the shell (C178). With the privacy filter on, what it finds is left out of a search and swapped in a translation by a hosted helper (C179 (a), (b)); `check:` offers a hosted helper, with its cost, when no model on this computer is connected (C179 (c)). No new stored field. Checked in the in-app browser on the trial copy: "Branch from here" writing `new:branch 201a 1`, Enter making 201g with one step; a question to Wikipedia with an email address in it searched for "Barn owl". **The checkpoint is with Stefan; answered 23 October, in part (see Rulings).**
7. **Any number of rooms** (ruled 23 October, C175 (a); proposed, waiting for the go-ahead). The space holds as many rooms as the person opens; `open:` of a chat or branch not on screen opens it in a room of its own beside; each room shows its own chat, with its own tabs, notes and reply arriving; a prompt goes to the room the bar points at, else the room it pointed at last; `close:204` and `width:204` name a room by its chat. **A change to the space kept on this device, shown first:** extra rooms are kept as boards `room-2`, `room-3` and so on, each with its chat; a space kept before reads as it did. *Try:* open three branches side by side, a reply arriving in each. **Done, 23 October (C180):** `isRoom` and the room boards in `shell/boards.js`; `currentRoom`, `roomsIn`, `planRoom` opening beside and `planShowInRoom` moving a room in place in `shell/arrangement.js`; each room holding its own chat (`holdChat` in the chat context, `stores/useRoomChat.js` for a room's parts, notes and keywords per room); the shell drawing every room and sending a prompt to the current one. Checked in the in-app browser on a trial copy made from the invented sample: three rooms opened side by side; a question to Wikipedia in 225, a fork opening beside as 226, a second question landing in 226 only; a click on 225 moving the bar there; both rooms back after a reload; `close:226` closing the right one.

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

**Status, 23 October: split into five pieces**, each committed and checked before the next. Points the documents leave open are C181 onward (`conflicts.md` Part 14), each built as suggested so a ruling changes one entry.
1. **Settings as a board.** One stacked card with a rail and six sections (API keys, Spending, Context and defaults, Data and backups, Appearance, About), each with its alias; the navy rule on the section; `open:settings <section>`; search that narrows to matching rows; `set:` with its registry, each setting's Enter line, undo, and refusals that explain (`set:key`, `set:compress`); a click on a control runs its `set:` line. Text size that works. Only settings that do something are shown. *Try:* `open:settings keys`, `set:text large`, search "backup". **Done, 23 October (C181):** `chrome/SettingsBoard.jsx` and its styles; `lib/settingVerbs.js` (`set:` and its names); `open:settings <section>` in the arrangement; spending by month in the chat facts; text size through the type tokens; "Keeping keys" moving every provider's key; `set:room` for the room a new chat starts in. **New setting `newChatRoom`, shown at the checkpoint.** Checked in the in-app browser on a trial copy made from the invented sample: `open:settings keys` beside Records; the sections, rail and rule; "backup" narrowing the card to two rows; the Large text size applied by a click and taken back by `undo:`.
2. **Backups.** `backup:`, `restore:`, `import:` (A21); "not encrypted" said plainly; one minimum password length; a password stretched further in new files; a "replace" restore offers what it replaces as a download first; layouts in a backup when ticked; the reminder from Settings; the last backup and whether the browser keeps the data. *Try:* a backup with and without a password, then a restore. **Done, 23 October (C182):** `chrome/BackupPanel.jsx` under the bar; `backup:`, `restore:` and `import:` in the bar; `BACKUP_PASSWORD_MIN` everywhere a password is asked for; 600,000 rounds in new files; the layouts category; `set:reminder` and the Data and backups rows. Checked in the in-app browser on a trial copy, downloads and the file picker stood in for inside the page so nothing left it: a short password refused; an encrypted backup with layouts (600,000 in its header, no readable text, a wrong password refused); a backup without a password; a merge that skipped everything; a replace, after keeping what was here, that brought the layout back and left the key store alone; `import:` of a text file.
3. **Delete everything.** Both databases, the caches and the service worker; the confirmation lists what goes, is armed by typing a word, offers a backup first and says what it cannot reach; other tabs are told to close. Never a command. *Try:* in a throwaway profile, then check nothing is left. **Done, 23 October (C183):** `lib/eraseAll.js` (what goes), `lib/deleteEverything.js` (the one way in), `chrome/DeleteEverything.jsx` in Settings, the cover in `DbStateNotice`, and both database modules letting go for good when a deletion asks. Checked in the in-app browser on the production build at a fresh origin (no keys, made seconds before), with a second tab open: the list, the button held until the word was typed, then no database, cache, worker or stored value left, both tabs covered, and none of it written back.
4. **Languages.** `language:` and the globe; the picker listing languages by their own names; the browser's languages by default; `language:` setting the interface, replies and Wikipedia's edition at once (C166 (b)); Japanese, Chinese, Swedish and Finnish drafted for Stefan's review, shipped once reviewed, with the page opting out of the browser's translation then (C84). *Try:* `language:sv`. **Done, 23 October (C184):** `language:` and `language:browser`, `chrome/LanguagePicker.jsx`, `chrome/Globe.jsx` on the welcome page and in Settings, `components/InterfaceLanguage.jsx`, the Enter line spoken in the language chosen, the setting `interfaceLanguage` (**new, shown at the checkpoint**), and C84's opt-out ready for the first language shipped. The four drafts: every word of the copy table, one drafting agent per language, each checked by a script against the English; glossaries and doubts in `docs/translations/`; offered in development only, and left out of the production build. Checked in the in-app browser on a trial copy: the picker, the globe, each language chosen and shown, replies following the page, `undo:`, and the choice kept across a reload.
5. **About, then the checkpoint.** The privacy copy (`privacy-copy-draft.md`, T2) and the network log by host. Then the checkpoint, with R10 and R28. **Done, 23 October (C185):** About with the draft's words for Settings and its list "What leaves your device", each claim checked against the code; the page no longer connects to a provider on load. Checked in the in-app browser on a trial copy. **Checkpoint ruled 23 October** (Rulings section): R10, R28 and R37 approved and carried out (C186); the new settings approved; example words in commands translated; layouts on a merge kept as built. **Stage 9 done.**

- **Added**
  - One stacked card with a rail, sections you can address, `set:`, and search that narrows to matching rows.
  - `backup:`, `restore:` and `import:` (A21).
  - Window layouts in a backup when the person ticks them (ruled 20 October), off unless chosen. A restore checks each arrangement as it does when reading one from the device, and a window on a screen this computer lacks opens on the main screen. The history of commands, focus sets and saved searches stay on the device.
  - "Delete everything" that removes everything: both databases, the caches and the service worker. Its confirmation lists what will go, is armed by typing a word, offers a backup first, and says what it cannot reach (files you saved, what providers already hold). Other open tabs are told to close.
  - The switch for the title call, the "Don't save" option, text size, and the room for new dockets.
  - The language picker, opened by the globe or `language:`, listing languages by their own names, defaulting to the browser's languages and never to the network address. Whether the browser keeps Parliament's storage, and the last backup, shown plainly.
  - First real languages, reviewed by Stefan: Japanese, Chinese, Swedish, Finnish (C87). When the first one ships, the app opts out of the browser's page translation (C84).
  - About, with the new privacy copy and the network log.
- **Changed:** backups say plainly when they are not encrypted, use one minimum password length, and stretch a password further in new files. A "replace" restore offers what it is about to replace as a download first.
- **Salvaged:** the storage estimate, reminder, danger zone and key check from `SettingsView.jsx`; `BackupRestoreModal`. **New:** the layout and the verbs.
- **Security and privacy:** this stage closes audit findings T2 (copy), T5 ("Delete everything"), T9 (backups) and T13. "Delete everything" is never a command, a link, or something a saved button, a reply or a file can set off.
- **You can try:** Settings v1; a backup with and without a password; "Delete everything" in a throwaway profile, then check that nothing is left.
- **Needs from you:** C27, C28 and C33 as they bear on Settings, and A21. R10 and R28 are put to you here.

### Stage 10. Docket and running

Built to docket v12.

**Status, 23 October: split into six pieces**, each committed and checked before the next; the points the documents leave open are C196 (`conflicts.md` Part 16), each built as suggested so a ruling changes one entry.
1. **Steps that can be planned.** A step written ahead of any run keeps its prompt through later messages; the runner's message binds to its step; runs past the first; a branch with no chat until it runs; readers for runs; a merge restore that keeps plans' own steps (C93). **Done, 23 October (C197):** planned steps in `docketModel.js` and `recordsModel.js` (they survive a chat's messages; a run's message binds to its step; running stays running), `records.js` (`planStep`, `changeStep`, `holdBranch`, `newRun`, `newPlan`, `newPlanBranch`, `moveBranch`), `db.getPlan`, a merge restore bringing whole plans, and runs' steps checked and cleaned in backups. Tested plain and through the lock.
2. **The plan board.** One plan at one run: branch lines, steps, status chips, pips, the add row; `new:step`, `new:run`, `new:plan`, editing a ready step, `hold:` and `hold:off`, `move:`; `open:` with a plan's number opens it. **Done, 23 October (C198):** `chrome/PlanBoard.jsx` from `lib/planBoard.js`; the commands in `lib/planVerbs.js`, a prompt on the board planned as a step, `undo:` for each through `records.putPlanBack`, and plans with no chat in Records. Tried on a trial copy. Then `delete:` as the one word for removing (C199): what has not been sent goes on one Enter or an ×, with undo; what has been sent asks for a second Enter.
3. **The runner.** `run:` (A §5.2's policy; the Enter line naming steps, rooms, models and cost), steps sent in order, `stop:`, `stop:201b`, `stop:all` across tabs, one tab per plan (Web Locks), the lock's idle clock waiting, and `undo:` stopping at a run. **Done, 23 October (C200):** `lib/runner.js` (what runs, and the loop, its effects passed in), `records.createPlanChat`, `markStep`, `settleLeft`, `run:` and `stop:` in `planVerbs.js`, wired in the Shell with a Web Lock per plan and stop signals on the bus. Tried with a model on this computer.
4. **One after another,** with conditions read from status (A15). **Done, 23 October (C201):** conditions in the runner (a step runs on how the last step that ran ended; a fallback not needed waits in its place), set by a click on the Plan board; one prompt to several, one after another, from the picker, sent by the runner; steps to sources that read only English translated first. Tried with a model on this computer.
5. **`diff:` and the step list block.** **Done, 23 October (C202):** `diff:` sets two runs side by side on the Plan board with what differs marked in ink; the step list in the catalogue, placed with the room editor until the Lab; and the points folded in: who answers a step, `by:… then …`, `include:` with one after another, the slider's waiting tab.
6. **Spending:** this month's runs, the costliest, the warning before a costly run (`set:warn`), then the checkpoint. **Done, 24 October (C203):** this month by runs of plans and chats on their own, the four costliest runs opening on the Plan board, and `set:warn` with run:'s line leading with the cost above it. **Checkpoint ruled 24 October** (Rulings section): C197 to C203 kept as built; the new stored fields approved; the sample rooms, the spending-limit links and R38 to be carried out; the step list's settings with the Lab. Trying it is Stefan's, later. **Stage 10 is done.** **The approved items carried out, 24 October (C204):** R38; the sample backup's rooms drawn (their blocks, and a layout Parliament has for the Essay room); each provider's page for a monthly limit linked from Settings, the connection policy unchanged.

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

**Status, 24 October: the spike is planned, not started** (C205, `conflicts.md` Part 17): two prototypes on `/dev/editing` (the browser edits and Parliament keeps the record; ProseMirror), one checklist, a report in `research/editing-spike.md`. C58 ruled 24 October. Revised the same day (C205 (h)): the spike on ProseMirror alone, the hand-built engine only if it fails a check. **Built, 24 October (C208; `research/editing-spike.md`):** `/dev/editing`, the v5 scenario working in Chromium and under the real headers. **Your first try, 25 October (C209):** input methods, paste, spelling and the long reply work; composing over a selection, selection across blocks, the table and Narrator fixed or changed, waiting for a second try; Ctrl+Z ruled (Parliament's own history; Ctrl+Y redoes; the cards keep their undo) and built. **The build, in seven pieces, is proposed as C210,** to start once you choose the engine. Zen, LibreWolf and Android untried. The engine is chosen after. **Built, 26 October:** ProseMirror chosen (C211 (e)), and the seven pieces built and committed (C210 to C226): replies and prompts edited in place, edits told once with the next prompt, asks, the Collection's cards, tables and charts edited inside, `strikethrough:`, `tell:` and welcome steps 9 and 10. **The checkpoint is C227,** waiting for you.

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
- **Later in the stage, after its first pieces (C58, ruled 24 October):** editing inside tables, then charts. Until then each is a whole block, struck or asked about as a unit.
- **Rooms (C207):** in-line editing is built into the messages block, so every room has it; Writing Studio is the room it is built and tried in first. Drafting Desk is proposed for merging into it once stages 11 and 12 do what Secretarybird does.
- **Needs from you:** the choice of engine after the spike, and A7, A9 (C58 was ruled on 24 October). Also C91, ruled to be looked at again here: what becomes of the comments and suggestions inside Secretarybird documents.

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
- **Browser support:** a table on the site and in Settings, kept from feature detection: what works in Chromium, Firefox and its forks LibreWolf and Zen, Safari and on phones, and what happens instead where something does not. Tested from `browsers.md` (C94); Safari waits, since it is not a concern for now.
- **You can try:** the public repository, and the site served from the standby.
- **Done early, on 15 October:** DNS moved to deSEC with DNSSEC, and mail set up at Proton. The records are in `docs/hosting.md`.
- **Needs from you:** a yes before the public push, which cannot be taken back. R31 is put to you here.

### Across stages: security and privacy (ruled 21 October)

From `security-privacy-decisions.md` (rulings S1 to S5 in `conflicts.md`). Each item goes in with the stage named; none relaxes the security policy.

- **Stage 5, piece 5:** the `api:` panel suggests a key for Parliament alone, in its own workspace with a spending limit, and links a short "revoke and replace" guide.
- **Stage 6:** a link shows its full address before it opens (the shared Markdown component).
- **Stage 7:** a training label and a retention mark on each provider's row; the Mistral checklist, with Labs and Preview models marked in the picker; the privacy filter for fixed formats (emails, phone numbers), plain code, for everyone; the names filter and the injection check through a local model only, offered when one is connected (S3); a hosted check, opt-in and named with its cost. The vault's scope review, with stage 7 or 15, where the most secure design wins (S1).
- **Stage 8:** an answer brought into a prompt goes as labelled, untrusted data (`search_result` blocks, or JSON-wrapped), with invisible characters stripped and injection phrases marked, in a worker.
- **Stage 9:** the settings copy stops overstating what encryption at rest protects (already planned, T2).
- **After stage 9:** Lock Parliament, its own stage (S4): chats encrypted with a passkey or passphrase. A second database upgrade, shown before it runs, with every backup still readable. **Status, 23 October: designed** (`research/lock-parliament-design.md`), in four pieces: the lock's keys; sealed records and a three-step save; setup and unlock; backups, restore and Delete everything with the lock on, then the checkpoint. Put to Stefan before building: C187 to C192 (`conflicts.md` Part 15), including the stored-data change. **Ruled 23 October: all as suggested** (Rulings section). **Piece 1 done, 23 October:** `lib/lockKeys.js` (the data key; wrapping by passphrase at 600,000 rounds, by a 120-bit recovery code, by a passkey's PRF bytes; unlocking each way; changing the passphrase, renewing the code, adding and removing passkeys; damage told apart from a wrong passphrase), `lib/lockPasskey.js` (a passkey made and tested by unlocking with it at once), and the lock's record in the key database (`keyStore.js`). Nothing stored changes yet. **Piece 2 done, 23 October (C193):** `lib/seal.js` (sealed records, bound to store and key, only the key and indexed fields readable), `lib/sealedDb.js` (the database with the lock on: one-step reads and writes opened and sealed; transactions staged in three steps, with a conflict check and a retry in `records.js`; sealing everything and opening it again in one save), the command history without cursors, and `db.js` answering through the sealed database once a tab has a key. Five test files run twice, the second time sealed. **Piece 3 done, 23 October (C194):** `lib/lockSession.js` (unlocking, setting up, turning off, changes; two databases written in a safe order; an unfinished set-up finished at the next unlock), `components/UnlockGate.jsx` (nothing before the unlock; the idle lock; other tabs reloading on a signal), `chrome/LockPanel.jsx` in Settings, saved keys sealed under the lock. Checked in the in-app browser on the production build at an empty origin, cleared afterwards. Not tried: a real passkey. **Piece 4 done, 23 October (C195):** backups made through the lock and restores sealed on the way in; the copy before an upgrade read through the lock; the unlock screen's language read without opening the database for an upgrade; a constraint recorded for later upgrades of sealed records. **Checkpoint, 23 October:** kept as built; Stefan tries a real passkey later, with the languages.
- **Stage 13:** local-only rooms, a room setting (a new field in room files, shown first).
- **Stage 15:** Trusted Types and styles without `unsafe-inline`, trialled; exact dependency versions; hardware keys, review before merging and deploys from tagged builds; published file hashes and downloadable builds once the repository is public; a changelog in the update notice; advice on extensions in the browser support table; OpenSSF Scorecard.
- **Open:** the privacy filter's default, and which security review route first.

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
| R10 | The older `.apb` and JSON export buttons | `SettingsView.jsx`, `db.js` `exportAllData` | `.parliament` only. Reading old files stays for good. **Approved 23 October,** carried out with R37 | 9 |
| R11 | Homepage-scope mode files and `/edit-home` | `scope: 'homepage'` in `modes.js` | No homepage room | 6 |
| R12 | Old chrome styles | `index.css` rules for the Study, `/chats`, the top bar, old gold states | The chrome layer. Removed file by file, each listed in its commit | 6 onward |
| R13 | "Pin for reference" as a label | `messages-render.jsx` | A quote. The stored pins stay | 6 |
| R14 | The build wizard as a page | `/build`, `BuildView.jsx`, `src/components/build/**` | The guide in the Lab; templates in the Library | 13 |
| R15 | Tooltip tours, the first-run gate and their flags | `TourTooltip.jsx`, `tourCompleted_*` | The welcome steps and `tour:`. **Approved 21 October,** carried out when `/` shows the welcome page; old backups keep reading the flags | 5 |
| R16 | Drag and drop in the editor, then `@dnd-kit` | Drag wiring in `EditorView.jsx` and the editor components | Commands | 13, 15 |
| R17 | The holding tray | `EditorHoldingTray.jsx`, four reducer actions, its styles | `rm:` and `undo:` | 13 |
| R18 | The inspector | `EditorRightRail.jsx` | The room line, the Blocks board, `inspect:` | 13 |
| R19 | The editor's left rail and top-bar pills | `EditorLeftRail.jsx`, `EditorTopBar.jsx` | The Library board and the bar | 13 |
| R20 | The preview sheet | `EditorPreviewSheet.jsx` | Trying the room with `p>` | 13 |
| R21 | The layout-swap and apply-room dialogs | `EditorMigrationDialog.jsx`, `EditorApplyRoomDialog.jsx` | The Enter line stating the plan; `duplicate:` | 13 |
| R22 | Collaboration mode's window and block | `CollabModal.jsx`, `collab-mode*.jsx`, `CollabModeContext` | The `collab:` picker in the field. **Approved 22 October,** carried out when today's chat page is replaced by the room in the shell (as R25) | 7 |
| R23 | The persona editor inside that window | `CollabModal.jsx` | "Yours" collabs. **Approved 22 October,** with R22 | 7 |
| R24 | Web search, voice input and file attach as separate blocks | Nine files and three small registries | Features of input, carried by the bar in prompt mode. R25 waits for this | 13 |
| R25 | The room's own composer on screen | The composer drawn by `input-render.jsx`. `InputArea.jsx`'s logic is kept behind the bar | The bar in prompt mode. **Approved 21 October, on condition:** only once today's chat page is replaced and the bar carries web search, voice input and file attach (with R24) | 4, carried out with R24 |
| R26 | The branch panel and its shortcut | `BranchCreationPanel.jsx`, `BranchPanelContext.jsx`, `BranchShortcutHandler.jsx` | `open:` with or without a summary, `again:`, `new:branch`. **Approved 23 October,** carried out when today's chat page is replaced by the room in the shell (as R22 and R25) | 8 |
| R27 | The backup status dot and banner | `BackupStatusIndicator.jsx`, `BackupReminderBanner.jsx` | One line of marginalia on the Almanac | 6 |
| R28 | Settings options that go or do nothing | "Automatic" compression, the theme switch, session usage figures; the budget alert, summary depth and last-backup values, which nothing reads | Removed by the Settings spec. Stored values stay. **Approved 23 October,** carried out with R37 | 9 |
| R30 | Files nothing uses today | `src/hooks/useMode.js`, `src/components/core/ToolToggles.jsx`, `src/components/core/CitedMarkdown.jsx`, `public/flight_logo.png` | Nothing | any |
| R31 | Old process documents | `refactor/`, the `continuation-*.md` notes, `.pr-body.md` | An archive, if you want one. Decide what is published before going public | 15 |
| R32 | The three silent calls after a first answer | `src/stores/ChatContext.jsx`: **done 21 October** under C62's ruling. The three provider methods they called (`generateTitle`, `generateSummary`, `generateTags`): **approved 21 October,** moved to `src/deprecated/` | One named call (C62) | 4 |
| R33 | The Showcase, the room-source glow and connector lines in the editor | `src/components/editor/` | Nothing | 13 |
| R34 | Reordering by drag in the stacked-sections layout | `stacked-sections.jsx`, `SectionCard.jsx` | Move up, move down. The layout itself stays | 13 |
| R35 | The Inter font package | `@fontsource-variable/inter`, shipped and never applied | The system fonts already in use | 15 |
| R36 | The old slot tables and fallback rule | `SLOT_FALLBACKS` and the three copies of slot data | The layout manifest | 13 |
| R37 | The old Settings page | `src/views/SettingsView.jsx`, the `/settings` route | The Settings board; `/settings` opens it. **Approved 23 October,** moved to `src/deprecated/` (C186) | 9 |
| R38 | Four Enter-line messages nothing says any more (**approved 24 October; carried out 24 October, C204**) | `enter.openDocket`, `enter.openDocketHere` ("Enter opens its first branch…"), `enter.erase` (the old answer to `delete:`) and `enter.promptManyOrderInclude` in `src/copy.js` | `open:` with a plan's number opens the Plan board (C198); `delete:` is the word (C199); `include:` goes with one after another (C202) | 10 |

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
6. **Once pushed to production:** the stage 4 checks listed under "To try once pushed to production" in stage 4 (noted 21 October).

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

