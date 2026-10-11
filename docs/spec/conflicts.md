# Conflict register

Phase 1 of the Almanac, Docket and command line refactor. Started 23 September 2026.

Every place the four spec files disagree with each other or with the code. The old
`refactor/` docs are background only (inventory ruling 4), so they appear here only
where the code they describe is in the way.

Each entry gives both sides, then a **suggestion**. A suggestion is not a decision.
Rule on it with the entry number, for example "C7: yes" or "C7: no, pills everywhere".

Abbreviations: **A** = `almanac-spec-decisions.md`, **D** = `docket-spec-decisions.md`,
**v30** = `parliament_almanac_v30.html`, **v12** = `parliament_docket_v12.html`.
Line numbers are approximate.

## Rulings

**Ruled 23 September 2026:**

- **C15. The network is no longer limited to Anthropic.**
  - Providers: Anthropic, Mistral and Ollama (local).
  - Sources: Wikipedia, Hacker News, OpenAlex and the Guardian Open Platform.
  - Later: offline archives such as Kiwix, served locally, as a source component scoped to localhost.
  - Open follow-ups are under C15.
- **C17. Four kinds get a number: chats, notes, highlights and dockets.**
  - These are also the four kind pills (blue chat, purple note, pink highlight, teal docket), and each is a row with an id column.
  - All four share one number space and numbers never overlap, so `open:207` knows the kind from the number alone.
  - Branches get an address, not a number: docket number plus letter (`201B`, and `201AA` past Z). Letters are never reshuffled or reissued, and I and O are skipped.
  - Branches are not rows. They are found by typing the address, and appear as rows only under a grouping mode.
  - Steps are ordinals inside their branch (step 2 of 210B). The address stops at two levels, so there is no `201B2`.
  - A run is never part of an address. It is an argument (`open:run 3`, `from:run 3`), and the card's chrome names it.
  - Running a docket creates chats, not a docket. Each chat gets its own number and carries `from 201B, run 4` in its marginalia.
  - Still open: the starting number and the digit ceiling.
- **C18 and C19. Every chat belongs to a docket.** No chat stands alone. This overrides D §3.3, which assumed standalone chats. For the migration, existing chats may become dockets of their own. How branch families map is still open.
- **C20. Favorites fold into pins.** Users can tag a pin `favorite` themselves. The message-level detail is still open.

**Ruled 23 September 2026, second round:**

- **Part 1 is confirmed, with two changes.**
  - **S2:** the picker has three groups: models, local models, and sources that are not models (Wikipedia and the like). This overrides A §8's "no groups".
  - **S6:** every surface advertises both `/` and ⌘K. `/` still types a slash while the cursor is in a text field. ⌘K works everywhere.
- **C1.** Room is stored on the branch within each run, so a new run can change it. Steps show a room only when they override.
- **C5. The key element and its progressive dash are old design and are discarded.** This includes the `prog` tier of the border engine and the trigger's dash.
  - The search, command and prompt field is built exactly as in the mockups.
  - The mockups are the explicit design instruction and the most up to date.
  - The structural dotted border stays wherever the mockups draw it.
- **C6.** A popped Almanac can run. Each window keeps its own bar, and the navy rule shows which one is addressed.
- **C14. BroadcastChannel** is used between tabs, with Web Locks so only one tab executes a run. Pop-outs share the opener's state directly.
  - Security rule: messages carry ids and signals only, never message content or keys.
- **C15, follow-up.**
  - Multi-provider support (Mistral, Ollama) is in this refactor.
  - The Guardian is a future source.
  - arXiv, Europe PMC, Open Library, Openverse and Wikidata come later, unless one proves trivial.
  - This refactor ships Wikipedia, Hacker News and OpenAlex.
- **C17, follow-up.** Numbering starts at 201, so every id has at least three digits and never reads as a run or step number. There is no upper digit limit.
- **C18.** Each existing branch family becomes one docket: the root is branch A and each fork takes the next letter, all in run 1. The migration is shown before it runs.
- **C20, follow-up.** Each favorited message becomes a pinned highlight of that message.
- **The collection panel's Prompt/Send button** and its composer are removed on trial. Prompting happens only through `p>` in the bar, which carries the ticked rows.
- **`new:chat`** creates a docket and its first chat, so it uses two numbers.
- **The CLAUDE.md rewrite is approved and applied.** Wording changes on the way in:
  - "API key" became "API keys".
  - The read-first block's line "the rest of this file describes V2 Phase 1" now points to the rulings instead.

## Part 1. Settled by precedence

These look settled under the precedence rules (newer beats older; A wins where it
speaks). They are listed so you can confirm them in one go. A single "Part 1: yes"
covers all of them.

| # | Topic | Older side | Winning side | Result |
|---|---|---|---|---|
| S1 | Status vocabulary | D §7: `ready`, `running`, `done`, `held` (rendered "waiting on") | A §6; v12 header | `ready`, `running`, `done`, `waiting`, `paused`. `held` appears nowhere in code or stored data, so no migration is needed |
| S2 | Answered-by picker | D §7: add a third group for local models | A §8; v12 divergence 4 | One flat list ordered by cost mark, no groups |
| S3 | Docket kind pill | D §7: gold `.k-dock`, "worth a look" | A §9; v30 L415 | Teal |
| S4 | `run:201B` | D §10.1; v12 (always makes a new run) | A §5.2; v12 divergence 1 | Runs in the current run if 201B has not run there, otherwise makes a new run. The Enter line says which |
| S5 | Navy rule | D §5; v30 L344; v12 L401 (only while the command line is open on a single surface) | A §7; v12 divergence 5 | Permanent on the addressed surface |
| S6 | ⌘K | v12 binds `/` only | A §1; D §5; v12 divergence 6 | ⌘K fires from anywhere, including inside fields. The docket and Symposium advertise ⌘K only; the Almanac advertises `/` and ⌘K |
| S7 | Enter line before a run | v12 names the run only | A §2; v12 divergence 2 | States what will run, in which rooms, on which models, and cost where it can be computed without a call |
| S8 | `stop:all` | v12 reaches open cards only | A §5; v12 divergence 7 | Crosses windows. The channel is C14 |
| S9 | Docket verbs not built in v12 | v12 divergence 8 | A §3, §4, §5; D §6 | Build `undo:`, `new:branch <chat id>`, `open:` with branch addresses, `pop:`, `from:`, empty-docket help |
| S10 | `run:` as a filter | Earlier Almanac versions | A §4; v30 L1654 | `run:` is only a verb. Provenance goes through `from:` |
| S11 | "The Almanac never runs anything" | v30 `launch()` toast, comments at L546, L946, L1912 | A §5; your ruling 6 | Retired. The leftovers get cleaned up when the Almanac is built |
| S12 | Room shown as a chip | v30 header L11 ("Chips ... (type, room)") | A §9 | Room is marginalia wherever it was a chip. The table's `room` column stays a column |

## Part 2. Open: the specs disagree with each other

**C1. Where room lives, across runs.**
- A §9: "Room belongs to the branch, not the step. Steps inherit it and show a room only when they override."
- D §1 and v12 DATA: a branch keeps only its letter and name across runs. The run owns "the steps, their prompts, rooms, models".
- The question: if room belongs to the branch, is it one room for the branch in every run, or a room per branch *per run* (so run 4 can move 201B to another room)?
- **Suggestion:** per branch per run, stored on the branch's entry inside the run. That keeps D §1's promise that editing in one run touches nothing else, and still satisfies A §9. Steps store a room only when they override it.

**C2. Status marks look different on the two surfaces.**
- v30 (L129-148): a 9px dot. `done` is filled ink, `running` pulses by box-shadow, `waiting` and `paused` are dashed.
- v12 (L288-305): a pill with text. `done` is an ink wash, `running` is filled ink with a pulsing inner dot, `waiting` and `paused` are dashed outlines.
- A §6's "Mark" column describes the dot. D §7's "Chip" column describes the pill.
- **Suggestion:** keep both. The vocabulary is shared; the rendering belongs to the surface (a dot in dense lists, a pill on a document line). Say so in the component, so nobody "fixes" one to match the other.

**C3. `ready` is not silent in v30.**
- A §6 and v12: `ready` is silent, with no mark.
- v30 L135-136 and L1138 draw a grey outlined dot for `ready`.
- **Suggestion:** silent everywhere. v30 is out of step with its own comment at L130.

**C4. Marginalia turns gold on card hover in v30.**
- v30 L487: `.mc:hover .marg{color:var(--p-gold-deep)}`. The v30 header also calls marginalia "gold-muted".
- v30 L69: "Gold means the live action, and nothing else". v12 marginalia never turns gold.
- **Suggestion:** follow v12. Marginalia stays ink, and hovering a button inside it goes to full ink with an underline (both files already do this).

**C5. What carries the key element (the progressive dash border).**
- v30 L546 and L714: the trigger in the collection card is "the one key element in the whole surface". The search field carries it on the middle card.
- A §5.5: "The key element is the bar", with its border left to a visual pass.
- D §8 and the v12 header: the docket has no key element, and D asks for that to be written into the border spec.
- **Suggestion:** A §5.5. The bar is the only key element on every surface, and the v30 trigger loses its dash. Until the visual pass, the bar keeps v30's static progressive dash. Tell me if you would rather decide the border now.

**C6. A popped Almanac, and whether it runs.**
- A §4: "a popped docket can run while a popped table still cannot". v30 L950: "a popped table still never executes".
- Your rulings 6 and 8: the Almanac can run, and it can be popped out from a chat and placed on any screen.
- A §4's own rule is "a popped panel carries its parent surface's rules; a popped surface carries its own". Popping the whole Almanac from a chat is popping a surface. Popping just its table from the Almanac is popping a panel.
- **Suggestion:** both run, since the Almanac runs and a panel inherits from it. The line in A §4 becomes stale. Separately: while the Almanac is popped from a chat, commands typed in the chat's bar address the chat, and the Almanac's own bar addresses the Almanac, which wears its own navy rule. Confirm.

**C7. Fan-out and pop-up blockers contradict each other.**
- A §10: "Browsers allow multiple tabs from one user gesture, which the Enter keypress is. No permission dialog."
- A §4: "pop-up blockers allow one window per click, so the Enter line may have to say *opens 1 of 3, click to place the next*".
- Chromium and Firefox allow one `window.open` per user activation, so A §4 matches how browsers behave and A §10 does not.
- **Suggestion:** a run that needs several rooms opens one tab on Enter. Further tabs open one per click, or the steps that do not need their own frame run in the background with no tab. This is a design question for the Symposium work (inventory ruling 11). Until then, `run:` in the Almanac and docket runs steps without opening tabs.

**C8. `new:branch` from a command: where is the fork point?**
- D §3: forking happens at a message (`forked from chat 251, at step 2`).
- A §4 and v30 L1490: `new:branch 207` makes "a branch from the end of" the chat.
- **Suggestion:** bare `new:branch 207` forks from the end. Forking mid-chat is done from the message itself in the Symposium, which is where you can see the message. No extra syntax.

**C9. Help panel counts.**
- A §4: no totals, except while narrowing.
- v30 L2029 comment: "Grouped, headed and counted". v30 L2063 then removes the total.
- **Suggestion:** A §4. Only the L2029 comment is stale.

**C10. `open:` uses the wrong parser in v30.**
- A §3 and v30 L915: `open:` reads addresses (`addrsIn`).
- v30 L1463: `open:` calls `idsIn`, so `open:201B` would not resolve.
- **Suggestion:** `addrsIn`, per the spec.

**C11. A halted step is called "stopped" in v30.**
- A §5 and v12: `paused`. v30 `stop:` Enter line (L1540): "a step mid-flight is marked stopped".
- **Suggestion:** `paused`.

**C12. Parking a branch: `hold:` exists only in the docket.**
- v12 has `hold:` (sets `waiting`) and `delete:`. v30 has neither, but has `archive:` and `forget:`. A §3 leaves open whether `archive:201B` and parking are one act.
- **Suggestion:** one shared verb registry, where each verb declares which surfaces and noun classes it accepts. `hold:` applies to branches wherever they are addressed, including from the Almanac. `archive:` stays a separate act, which A §3 calls the current state. `delete:` (docket: steps, branches) and `forget:` (Almanac: rows) stay separate words for different nouns, which A §4 allows ("vocabulary can vary; kind cannot").

**C13. Where the Almanac's layout is saved, and whether it "travels".**
- A §4: "a page layout travels between devices and a window arrangement does not". v30 L949: "A saved arrangement is a Lab layout, not a private Almanac setting". v30 L963 saves to `localStorage['almanac-layout']`.
- The app has no accounts or sync, so nothing travels between devices except by export.
- **Suggestion:** Almanac layouts are stored in IndexedDB with the rest of the data and included in the backup, which is how they travel. Window arrangements (`arrange:`, out of scope) are per device and not in the backup. Whether a layout is also "a Lab layout" waits for the Lab work.

## Part 3. Open: the specs against the code

**C14. Storage and cross-window signals** (you asked what the code does).
- **What the code does:**
  - All data and settings live in IndexedDB database `parliament` v5 (`src/lib/db.js`), plus a separate key store for the API key.
  - localStorage is essentially unused: one legacy key is read once and removed.
  - Tabs share IndexedDB, so they see each other's writes, but nothing tells a tab that something changed. There is no `storage` listener, BroadcastChannel or lock.
  - A schema upgrade in one tab is blocked while an older tab holds the database open, and nothing handles that today.
- **What the spec needs:**
  - A signal channel for `stop:all` (A §5).
  - Stale-tab marginalia (A §10).
  - The orphaned pop-out message on `beforeunload` (A §10).
  - Per-device storage for arrangements (out of scope).
  - A §5 names the `storage` event as the channel, and A §10 says the tabs "share localStorage".
- **Suggestion:**
  - Data stays in IndexedDB. Nothing moves to localStorage.
  - The signal channel is `BroadcastChannel('parliament')`. It is same-origin, holds nothing at rest, and reaches pop-outs and tabs alike. The `storage` event would mean writing throwaway keys into localStorage only to trigger it.
  - IndexedDB gets an `onversionchange` handler, so an old tab closes its connection and says so before a migration.
  - This is a change of mechanism, not of what the spec asks for, so it needs your yes.

**C15. Network constraint against sources and local models.**
- The CLAUDE.md hard constraints say "connections to self + `api.anthropic.com` only" and "zero network requests except to the Anthropic API". The CSP in `netlify.toml` enforces this (`connect-src 'self' https://api.anthropic.com`).
- A §8: Wikipedia and six keyless APIs as sources, and a local Llama model in the picker (which needs `http://localhost:*`).
- **Suggestion:** this is the "scope review" the constraint asks for. Widen `connect-src` to a fixed, named list: the Wikipedia REST host plus each keyless API host as it ships, one line per source manifest. Local models wait until the provider interface grows a second provider. The constraint text in CLAUDE.md changes with it (C22). Wikipedia is the first host.

**C16. Wikipedia `User-Agent`.**
- A §8: "Send a descriptive User-Agent".
- Browsers do not let page scripts set `User-Agent`. Wikimedia's documented equivalent for browser clients is the `Api-User-Agent` header.
- **Suggestion:** send `Api-User-Agent` and note the substitution in the manifest.

**C17. Numeric ids against UUIDs.**
- A §3 and v30: one flat numeric id space (`201`, `251`). The v30 address regex takes 3 to 4 digits and the mockup numbers from 201.
- Code: every record is keyed by `crypto.randomUUID()`.
- Questions:
  - (a) Which kinds get a number? Chats, notes, highlights and dockets are specced. The code also has favorites, message pins, files and documents.
  - (b) What number does counting start at?
  - (c) Is the 4-digit ceiling (9999) intended?
- **Suggestion:**
  - Add a `num` field alongside the UUID. The UUID stays the key, so nothing that references records breaks.
  - Numbers are assigned in creation order starting at 201, unless you would rather start at 1.
  - The address regex has no upper digit limit.
  - Only chats, notes, highlights and dockets get numbers. This backfill is a migration and will be shown to you before it runs (your rule 7).

**C18. Existing branches against spec branches.**
- Code (`db.js:548`): a branch is a whole copied conversation linked by `parentId`, `branchPoint` (a message id) and `familyId`. It has no letters and no docket.
- D §3: forking writes a lettered branch into a docket, and forking a standalone chat creates a docket.
- **Suggestion:**
  - Existing branch families stay as plain chats with their provenance kept in marginalia (`branched from 207`). No dockets are created retroactively.
  - Only forks made after the change follow D §3.
  - The other option is to convert each family into a docket, which is a migration you would see first. I lean against it: it invents plans after the fact.

**C19. Chats are multi-turn today; a docket step is one prompt and one answer.**
- D §3: "one step is one prompt and one answer", and typing freely in the Symposium appends a step to the current run.
- Code: a chat is an open-ended list of messages, with no notion of a run or step.
- **Suggestion:** a chat that belongs to a docket gets its steps from its turns: turn N is step N of that branch in that run. A standalone chat has no steps until it is forked (C18). This is data-model work, detailed in the change plan.

**C20. The word "pin" means two things.**
- A §3: `pin:` is an annotation (top of the list in the Almanac, marked in the docket).
- Code: the `pins` store copies a message into another chat for reference (`db.js:793`, "Pin for reference" in `messages-render.jsx`). Code also has per-conversation `pinned` (which does match A §3) and a separate `favorites` store.
- **Suggestion:** `pin:` is the conversation `pinned` flag, extended to any row. The message-copy feature keeps its data but its UI label changes to "carry to" or similar. Favorites need a ruling: fold them into pins, or keep them as a filter (`has:favorite`).

**C21. Almanac as the homepage against every surface being a room.**
- CLAUDE.md: "every chat surface now renders through `<RoomShell>` against a mode file". The Study is a homepage-scope mode file.
- Your ruling 8: the Almanac replaces the Study. The Almanac in v30 is fixed chrome with its own three-slot layout and `layout:` verbs, not a room.
- **Suggestion:**
  - The Almanac is an app surface, not a mode file, so it does not go through `RoomShell`.
  - Rooms stay mode files, and the Symposium renders rooms.
  - Homepage-scope mode files (`home_default`, "The Study") are proposed for retirement in the change plan, not deleted now.

**C22. CLAUDE.md contradicts the new direction.** The proposed rewrite is at the foot of this file. Contradictions:
- Its "where to look" table sends readers to `refactor/` as the canonical spec.
- It describes the product as rooms plus homepage (the Study, the blueprint) and names none of Almanac, Docket, Symposium or the command line.
- Its network constraint forbids sources (C15).
- It files local models under Phase 2, while A §8 puts them in the picker.
- Its "What's gone" list is about V1 and says nothing about the old V2 Phase 1 concepts now going.
- "Project Apollo" is the repo name; the product is Parliament.

**C23. The old visual system in code against the mockups.**
- Code tokens (`--p-bg-*`, `--p-text-*`, `--p-gold*`, in `src/lib/schemes.js` and `src/index.css`) and gold for selected and active states: pinned icons, sort arrows, the selected model, focus borders, the default highlight colour `#B8A070`, the "+ Build a room" button, and the backup indicator (gold, amber, red).
- Catalog type tags: room gold, layout violet, component teal, scheme orange. Motion uses Framer Motion springs.
- The mockups: bone paper `#FCFCFA`, ink `#191919`, navy for command mode, and gold for the live action only (search engaged, trigger hover, keyboard focus). The kind pill hue family is blue, purple, pink and teal. Motion is short CSS transitions.
- Your rulings 5, 9 and 10 settle direction: the mockups replace the app's chrome, and rooms keep their schemes inside.
- **Suggestion:** new chrome tokens are taken verbatim from the mockups' `:root`. Every gold use outside the live action moves to ink.
- **Open detail:** the highlight kind is pink in v30, but highlights in rooms are drawn gold today. Suggest that highlights inside a room follow the room's scheme, and the Almanac pill is pink.

**C24. Voice.**
- A §11 lists voice as Named, for V2, riding on the prompt line.
- Code: `voice-input@1.0` is Live in Pocket Chat rooms.
- **Suggestion:** leave the room component alone. The prompt-line voice is out of scope, as the brief says.

**C25. Two export paths, and the Almanac export.**
- Code: the versioned `.parliament` backup (`backup.js`, envelope `version: 1`), and an older `.apb`/JSON export still offered in Settings (`SettingsView.jsx:759`, no format field).
- v30 L1866: an Almanac export of selected rows as markdown or JSONL.
- A §10: format versioning and a migration path are owed.
- **Suggestion:**
  - The `.parliament` backup is the one restorable format. It gets per-version record migration on import before any schema change.
  - The Almanac export is a read-only content export and is not restorable.
  - The older Settings export goes on the retirement list.

**C26. Model list.**
- A §8's picker: Claude Opus 5, Sonnet 5, Haiku 4.5, marked ×15, ×3, ×1.
- The mockups' sample data: Opus 4.6, Sonnet 4.6. Code: Haiku 4.5, Sonnet 4.6, Opus 4.6, Opus 4.7.
- The current Anthropic lineup is Opus 5.5, Sonnet 5, Haiku 4.5 and Fable 5.1.
- **Suggestion:** update the provider's model list to the current lineup when the picker is built. Cost marks are stored per model as fixed multipliers, as A §8 intends. Which models appear is your call.

## Part 3b. Settings (added 24 September 2026)

From `settings-spec-decisions.md` and `parliament_settings_v1.html`, both dated
23 September. Abbreviations: **St** = the Settings decisions doc, **v1** = the
Settings mockup.

**C27. Picker groups.**
- St §14.1 and v1 divergence 1 keep the answered-by picker as one flat list with no groups, and group by provider only on Settings.
- Your earlier ruling (Part 1, S2 as amended) gives the picker three groups: models, local models, and sources.
- **Suggestion:** keep your ruling for the picker, and keep St's provider groups on Settings. The two lists do different jobs: choosing an answerer, and managing keys.

**C28. The source list on Settings.**
- St §8 lists Wikipedia, arXiv, Europe PMC, Hacker News, Open Library, Openverse, Wikidata, OpenAlex and News.
- Your C15 rulings put only Wikipedia, Hacker News and OpenAlex in this refactor, and drop arXiv, which cannot be reached from a browser.
- **Suggestion:** Settings lists the sources that ship. Others appear as they ship. arXiv does not appear.

**C29. Which shortcut the hint line shows.**
- St §5 and v1: "/ or ⌘K" when focus is outside a field, "⌘K" alone when it is inside one, because `/` types a slash there.
- Your S6 ruling: reference both on every surface.
- **Suggestion:** St's version, on every surface. Both keys are shown everywhere, except while the cursor is in a text field, where only the one that works is shown. It is consistent across surfaces and never advertises a key that does nothing.

**C30. A popped command line and the navy rule.**
- St §7: a popped command line is a panel and does not wear the rule; the docket mockup's popped bar should lose its rule. This matches A §7.
- v12 (and change plan 2.9 and 2.10) drew the rule on a popped bar.
- **Suggestion:** St. The change plan is updated to match.

**C31. The rule follows the section.**
- St §3: on a long, sectioned surface the navy rule marks the addressed section and slides as you scroll, replacing the page-edge rule.
- A §7 says the page. St records this as a deliberate generalisation, and the Almanac keeps the page rule.
- **Suggestion:** build it on Settings. The docket waits, per St §16.5.

**C32. Desks on Settings.**
- St §12 lists "desks on this device", made with `arrange:save`.
- `arrange:` is out of scope for this refactor.
- **Suggestion:** leave the desks list out until `arrange:` is built. An empty list for a feature that does not exist would be the dead option St §12 warns against for themes.

**C33. Finding Ollama on your machine.**
- St §6 has the key panel say "no key · found on your machine" for Ollama. Knowing that means calling `localhost:11434`.
- Chrome, and soon Firefox, show a local network permission prompt the first time a site calls localhost (change plan, network check results). Probing every time Settings or `api:` opens would put that prompt in front of people who never use Ollama.
- **Suggestion:** probe only after you ask: a Check button on the Ollama row, or once Ollama has been chosen as a model. Until then it says "not checked". On Safari it says Ollama cannot be reached from Safari, greyed rather than hidden.

**C34. Cost marks still owed.**
- St §16.1: marks for Fable 5.1, Mistral Large and Mistral Small are `×?`.
- **Suggestion:** compute each mark from the provider's published price per token against Haiku 4.5, rounded, and fix it in the model list. I need current prices for those three. Tell me the marks, or I look them up when area 6 starts.

**C35. Backup version rule.**
- St §11: "a file with no version field is format 1. Every backup written so far has none."
- In fact every `.parliament` file already carries `version: 1` (`backup.js` since PR-9). The older `.apb` and JSON exports carry one too.
- The rule is still worth having, and it is cheap. **Suggestion:** a `parliament-backup` file with no version field is read as format 1 instead of rejected. The other two rules, refusing newer files with a message and keeping migrations forever with fixtures, already hold since area 0.

**C36. Settings in the plan.**
- Earlier ruling: Settings only takes the new fonts and colours in this refactor.
- St and v1 are a full redesign. It depends on:
  - the bar (area 2)
  - keys and models (area 6)
  - run cost, for "this month" and the warn threshold (area 8)
  - the backup changes (area 0, done)
- **Suggestion:** Settings becomes its own area in the change plan, after area 6. The parts that need run cost land with area 8.

## Part 4. Code issues found on the way (not spec conflicts)

- **Cmd/Ctrl+Shift+B is bound twice.** It opens the branch panel (`BranchShortcutHandler.jsx:41`) and the backup modal (`BackupContext.jsx:53`) at once on chat pages.
- **A merge restore that renames a conversation leaves broken references** (`backup.js:600-730`): `branchPoint`, child `parentId`, message ids on notes, highlights and favorites, and `pins.sourceMessageId` are not remapped. This matters before any migration.
- **The older import path (`db.js` `importData`, L979) likely throws on `sbrd_documents`.** It keys on `item.id || item.key`, but those records are keyed on `conversationId`.
- **The homepage Chats section loads the API key by a different setting than the rest of the app** (`settings.persistKey` against `settings.storageMode`, `chats-preview.jsx`).

## Part 5. The October documents (added 11 October 2026)

From the nine spec files supplied on 11 October (indexed in `README.md`), read
against each other, against the September documents, and against the code audits
in `research/`. The reasoning behind each entry is in `plan-brief.md`, sections
4, 5 and 13. Entry numbers match the brief.

Abbreviations: **AB** = `arrangements-boards-blocks-decisions.md` (28 Sep).
**L7** = the header comment of `parliament_lab_v7_blocks.html` (about 29 Sep).
**W** = `welcome-spec-decisions.md` (30 Sep). **W9** =
`welcome-inline-editing-spec.md` and `parliament_welcome_v9.html` (6 Oct).
**E** = `editing-in-place-spec.md` (6 Oct), and **v5** its mockup. **B** =
`bar-and-commands-decisions.md` (7 Oct, updated 9 Oct). **BR** = the header
comment of `parliament-bar-reference.html` (9 Oct). **St**, **A**, **D**, **v30**
and **v12** as above.

B's command inventory says it was "rebuilt from transcripts because the v30 file
itself was not readable". Where it lists a verb as current against a decision
made elsewhere, the entry treats that as a question, not as the newer document
winning.

### 5a. Earlier rulings and plans the October documents change

These look settled by date. "Part 5a: yes" confirms them all, or name a row.

| # | Earlier | Now | Source | Result |
|---|---|---|---|---|
| P1 | C5: the structural dotted border stays wherever the mockups draw it | "No page hatch, no dotted borders. Both are retired." Cards carry a faint lift shadow only | W §2 | No border engine is built (change plan 2.2 goes). L7 still draws dotted outlines; it predates the decision |
| P2 | C29: which shortcut the hint line shows | `/` jumps to the field when no other text field has focus. Cmd/Ctrl+K opens it from anywhere, including inside a reply, where `/` belongs to the block menu | B "The field"; BR | Settled. Cmd/Ctrl+K stays (B lists "confirm it stays" as open) |
| P3 | St §5: `open:settings` is the one named place `open:` accepts | Every board opens by name: `open:library`, `open:collection`, `open:history` | AB §2, §4 | No exception to keep |
| P4 | Inventory ruling 3 and CLAUDE.md: the Lab, wizard and editor are a later step | The Lab is designed, and the wizard becomes a guide inside it (`new:room guided`) | AB §5 | In scope. Where it falls in the order is a plan question |
| P5 | Inventory ruling 11: the room-to-room flow still needs design | Partly supplied: branch tabs, reply to one branch or all, edits and asks per branch | E "Branches" | The mockup that draws it (`parliament-branch-slider-v9.html`) has not been supplied |
| P6 | Area 0, as built: a colliding conversation comes in as a copy titled "(from backup)" | Identical items are skipped. An item with a colliding id and different content comes in as a copy with a new id, every reference inside the backup rewritten, marginalia "restored, was 207". Counts first | AB §7 (Decided) | `restorePlan.js` changes. Once items carry numbers, every restore into a database that is not empty collides on numbers, so numbers are remapped and references to them rewritten |
| P7 | C32: leave desks out until `arrange:` exists | An arrangement includes popped windows (AB §2, Decided), while B's inventory lists `arrange:` as deferred | AB §2; B | Arrangements are stored as data from the start. The `arrange:` verb, saved desks and the screens map come later |
| P8 | D §6 and change plan 2.12: a `docs:` verb later | `docs:` is dropped. The generated verb reference is one of the resources | AB §7 | `resources:` carries it |
| P9 | Change plan 3.5 to 3.8: `co:`, page-level `layout:` | `co:` is replaced by `add:` and the collection card. The Almanac's page-level `layout:` moves to `arrange:`; `layout:` means the shape of a room only | B inventory; AB §4 (Decided) | Rewritten in the new plan |
| P10 | St §15, W §11: `api:` or `key:` | `api:` everywhere, no alias | B "Decisions" | Welcome step 8 reads `api:` |

### 5b. Open

**C20, reopened. Favourites.**
- Ruled 23 September: each favourited message becomes a pinned highlight of that message. `src/lib/migrations/v6Plan.js` does this today.
- AB §7 (Proposed): "Favorites migrate into a collection called Favorites, in their existing order, rather than becoming pinned highlights. Replaces ruling C20."
- **Suggestion:** the collection. It keeps their order, loses nothing, and does not fill the table with highlights of whole messages. It needs the collections store to exist in version 6. Rule on it before the dry run, since the planner changes with it.

**C37. Is the bar the only composer in a room?**
- L7: messages and input are two blocks every room must have (`rm:` refuses them). "Input can sit in any column", with settings for send key and height. AB §2 (Proposed): every room has one messages block and one input block.
- B "The field": "The resting mode follows the surface: search on the Almanac and the welcome page, prompt in a room." The prompt field carries the marginalia "collab: none · to 201a · all three". E "Reflection": "In the mockup the reflection's input sits inside the board. In the product it is the field, addressed to the board like any other."
- Code: the composer is `InputArea.jsx` through `input-render.jsx`, and it takes its chat from the address bar.
- **Suggestion:** the bar is the composer. A room's input block becomes the place the bar docks and the holder of the input features (web search, file attach, voice input), shown as marginalia in the prompt field the way `collab:` and `to:` are. This decides what happens to `InputArea.jsx` (retirement R25).

**C38. Lab v6 or v7.**
- AB names `parliament_lab_v6.html` as the current mockup. It has not been supplied.
- L7: "An alternative to parliament_lab_v6.html, not a replacement. Compare the two." It adds a third board, Blocks, and moves a selected block's settings from the room line to that board.
- AB §5 (Decided): "Clicks that change a room write the command and wait for Enter."
- L7 (proposed rule): "reversible, local changes apply at once and are echoed; anything that moves, removes, spends or cannot be undone waits for Enter."
- The Lab audit adds: 15 of the 33 settings that blocks declare are read by nothing, so a Blocks board built as drawn would show settings that do nothing.
- **Suggestion:** none until v6 can be read beside v7. If v7: the Blocks board lists only settings that work.

**C39. Removing one thing for good.**
- AB §4: "`delete:` | Destroys it | Decided". AB §7: "`delete:` is universal: ids, ranges, branches, dockets, rooms." D and v12 use `delete:` for steps and branches. L7 has `delete:"Essay room"`.
- B "Decisions": "`delete:` stays out of the vocabulary so nobody tries `delete:207` on a chat. Sent work is archived, never deleted." `drop:` removes things not yet sent.
- B is newer, but it leaves no way to remove one chat, note, room or docket for good except "Delete everything" in Settings. The app can delete one chat and one message today.
- This is a privacy question as much as a naming one. Someone who pastes something they should not have needs a way to make it gone.
- **Suggestion:** permanent removal of one item exists. It is a deliberate act with its own word, it names what will be destroyed on the Enter line, and `archive:` stays the everyday verb. The word, and whether it lives in the field or only on the item, is your call.

**C40. `name:` or `rename:`.**
- AB §4: "Decided. `name:` replaces `rename:` everywhere." W §10: "`name:` names the room, following Lab v6. `rename:` is not used."
- B's inventory lists `rename:` as current for items and `name:` for collections, and lists "Naming a room" as open.
- **Suggestion:** `name:` everywhere. `rename:` answers "That verb is now name:".

**C41. `inspect:` or `peek:`.**
- AB §4: "Decided. `inspect:` replaces `peek:` and its alias `read:`. One word, no alias."
- B's inventory lists `peek:` (`read:`) as current.
- **Suggestion:** `inspect:`.

**C42. `close:` and `open:`, or `hide:` and `show:`.**
- AB §4 (Proposed): "`hide:` and `show:` retire; `close:` and `open:` do their job." L7 and W §8 use `close:`.
- B's inventory lists `swap:`, `hide:`, `show:`, `cols:` and `move:` as current for panels and columns.
- **Suggestion:** `close:` and `open:` for boards, `cols:` for columns. `hide:` and `show:` answer with the new verb.

**C43. Where the bar sits, and the word for it.**
- St §7: `bar:top` (the default), `bar:bottom`, `bar:left` and `bar:right` (a square in its own column), `bar:pop` (its own window), `bar:dock`.
- W §5 and §11: `pop:command` lifts the field out and docks it at the foot of the screen, and "must dock the field on every surface".
- B and BR (9 Oct): editing a reply minimises the field to a hexagon at the centre. "`pop:left` and `pop:right` move where it lands, and `pop:center` returns it."
- B's inventory: only `bar:top` and `bar:bottom` are current; `pop:command` is listed under "own window".
- So `pop:` means three things: a board in its own window, docking the field at the foot, and where the minimised field lands. A §4 says a scheme may differ in vocabulary across surfaces but not in kind.
- **Suggestion:** `pop:` keeps one meaning, its own window. `bar:` says where the field sits, open or minimised (`bar:top`, `bar:bottom`, `bar:left`, `bar:right`, `bar:center`). The default is top on the Almanac and Settings and bottom in a room. Welcome step 2 becomes `bar:bottom`. This renames two things you chose recently, so it needs your yes.

**C44. The Escape ladder.**
- A §1: Escape goes back to search, and the text is still there.
- W §6: "Escape steps back one mode: prompt → command line → search. Backspace on an empty prompt does the same."
- BR ("this comment wins"): "Escape: command → prompt; prompt with text → clears; empty prompt → back to editing. Backspace never changes mode in prompt."
- D §5: opening a docket enters command mode, and Escape goes to prompt, where the docket rests.
- **Suggestion:** one rule. Escape steps toward the resting mode of the surface (search on the Almanac and the welcome page, prompt in a room and a docket). At rest with text, it clears the text. At rest and empty, it returns focus to what you were doing. Backspace never changes mode. Welcome step 4 ("esc, then `alm:`") is reworded.

**C45. `hold:` has three meanings.**
- D and v12: `hold:` parks a branch, and the same command lets it go.
- AB §4: "`hold:` is dropped", meaning the Lab's holding tray.
- E: `hold:242` keeps an edit from going to the model; `hold:off 242` lets it go.
- **Suggestion:** one act, "keep this from going until I say". `hold:` and `hold:off` for branches and edits alike. The Lab meaning stays dropped.

**C46. `import:` or `restore:`.**
- A, St and AB §7 (Decided): "`backup:` and `restore:` open their modals."
- W §8 and B's inventory: `import:` opens import (a backup file). B lists `backup:` as proposed and does not list `restore:`.
- **Suggestion:** `restore:`, paired with `backup:` as Settings has it. `import:` answers with the new verb, and stays free for bringing in a room file later.

**C47. `tour:`.**
- AB §7: "Decided. `tour:` tours the current arrangement; `tour:docket` tours one board."
- W §10 (two days later): "The tour card and its `tour:` verb are replaced by the steps."
- B's inventory lists `tour:` as current.
- **Suggestion:** no `tour:`. `list:` brings the welcome steps back. The tooltip tours in the code go with it (retirement R15).

**C48. `strain:`.**
- B's inventory: "`strain:` | Settings | context and storage | Sep 20 | Current". No other document defines it.
- **Suggestion:** not built until you say what it shows. If it means the context meter and the storage estimate, it can open Settings at those two rows.

**C49. Branch letters: `201B` or `201a`.**
- D, A and the September rulings write capitals. Every October document writes lower case.
- `src/lib/addresses.js` reads either and prints capitals.
- **Suggestion:** read either, print lower case, store one case. Rule on it before the migration, since letters are written into stored data.

**C50. Gold at rest: the focus ring and marginalia under the pointer.**
- B "Decisions": "Gold only on the `api:` ignition." B "Minimising": the hexagon edge turns gold on hover, "the only gold at rest".
- E "Legibility": "Keyboard focus is always visible: a 2px ink outline on anything focused." v5 draws it in ink, and marginalia buttons go to ink with an underline on hover.
- The bar reference file itself (9 Oct), welcome v9, Lab v7 and Settings v1 all draw the focus ring in gold-deep. Welcome v9 and Lab v7 turn a card's marginalia gold-deep when the card is hovered; Settings v1 turns marginalia buttons gold-deep.
- C4's suggestion was that marginalia stays ink. No ruling on it is recorded above.
- **Suggestion:** ink for both. It follows the two newest decisions documents and keeps gold for the ignition. The gold focus ring in the bar reference file is treated as left over from the shared stylesheet.

**C51. One token sheet.**
- `--ink-2` is #787774 (welcome v9), #5F5E59 (E "Legibility") and #45433f (bar reference). `--ink-3` is #9B9A97, #6F6E69 and #6b6964. Marginalia is ink at 46% (welcome v9, Lab v7, Settings v1) or 62% (v5, bar reference).
- **Suggestion:** take the bar reference where it defines a value and E's legibility table otherwise, and show you one sheet to approve before any chrome is built.

**C52. Is the table board called History?**
- AB §2 (Proposed): the Almanac is an arrangement whose middle board is History.
- E "Focus" (newer): the board strip shows "Sym:, Col:, Ref:, Alm:, Lib:, Dkt:".
- **Suggestion:** keep "Almanac" for the board until you decide. Board names live in the copy table, so the rename is one line whenever it comes.

**C53. Boards editable in the Lab** (changes ruling C21).
- C21, ruled: the Almanac is an app surface, not composed from parts.
- AB §2 (Decided): the Library, Collection and Docket "ship prebuilt and are editable in the Lab like any room".
- L7, "Not built here": `open:` and `edit:` on the Almanac and Docket boards.
- **Suggestion:** build boards on the block system so they can be edited, ship them prebuilt, and add `edit:` for boards after the rooms work in the Lab.

**C54. Welcome steps 9 and 10.**
- W9 §3: step 10 is "Leave the AI a note", done with "Note for the AI".
- E, which says it wins: edits go to the model by default, and B renames the note for the AI to `tell:`.
- **Suggestion:** step 9 stays (strike through a line). Step 10 becomes "Send it with your next prompt", crossed off when a prompt goes out carrying an edit, so the count line under the field is what teaches it. The other candidate is `tell:"…"`.

**C55. The advanced list needs two keyless sources on day one.**
- W §13: "Wikipedia and arXiv are both keyless sources."
- arXiv sends no cross-origin headers and cannot be called from a browser (checked 23 September; see `change-plan.md`). You dropped it.
- **Suggestion:** Wikipedia with Hacker News. OpenAlex is the third, with its keyless budget of about 100 searches a day stated where it is picked.

**C56. What gets a number, a row and a pill** (extends ruling C17).
- C17, ruled: four kinds take a number (chats, notes, highlights, dockets), and those are the four pills.
- E and W9 give ids from the same counter to edits, asks, Ripple suggestions and sweep suggestions ("ask 241", "edit 242", "ripple 244", "sweep 245"). B adds `type:edit` as a filter.
- Heavy editing will use numbers quickly.
- **Suggestion:** they take numbers from the shared counter, as drawn, so `jump:242` and `undo:242` work. They are rows only under their own `type:` filter, never in the default table. Pill colours wait for the collection board mockup.

**C57. A highlight: a term or a passage?**
- Code (`research/editing-code.md`): a highlight is a term, matched everywhere it occurs in the conversation.
- E: the Highlight card shows "the passage", and anchors point to a block id and an offset.
- **Suggestion:** both, as two kinds in one store. Existing highlights stay terms and are not converted. New ones made by selecting text are passages. Rule on it before the migration, since highlights take numbers.

**C58. Rich content inside editable replies.**
- E: block types are text, three headings, two lists, checklist, quote, code block and divider. "Bold and italic shortcuts do nothing."
- Model replies today also hold bold, italics, inline code, links, citations, tables and charts. No document says how these are shown, stored or anchored once a reply is editable.
- **Suggestion:** inline formatting from the model is kept and shown as marks on the text, and is not something you can apply. Tables and charts are whole blocks that can be struck or asked about as a unit but not edited inside, at first. This has to be answered before the editing engine is chosen.

**C59. Lab v7 lists a Collaboration block.**
- L7's catalogue describes it as "someone else in the room with you, and what they are looking at", needing the network. That would need a server, which the hard constraints forbid.
- Code: the block is the system-prompt presets (Collaboration mode).
- **Suggestion:** it is the old Collaboration mode under a misleading description. It goes, replaced by `collab:`.

**C60. Small ones.** Each is a suggestion; say if any is wrong.
- `duplicate:` has no alias (B, against AB §7's `dup:`). `api:` has no alias (B, against W §11's `key:`).
- After a command runs the field resets to `>` and keeps focus, on every surface (B; settles W §11).
- `open:201a summary` is today's compressed-summary branch and `open:201a` the full-history one. To confirm when the branch slider mockup arrives.
- "Send to branch" and "Pin for reference" on a message have no place in the new documents. Kept until you say.
- The `?` panel in the docket was built as `help:`. Suggest `?` and `help` everywhere, with no colon.
- `new:api` as an alias for `api:new`: suggest no, for the same one-syntax reason B gives.
- B's test of whether the moon in the hexagon reads as dark mode stays owed.

**C61. Is the prompt of a step locked, or editable?**
- D §1 and `docketModel.js`: a step that has produced a turn is locked, "because a transcript exists and rewriting the prompt would make the record a lie".
- E "Editing prompts": every prompt is editable in place, struck and blue, per branch.
- **Suggestion:** both hold. An edit to a prompt is a marking on the transcript, with the original visible and struck. The step in the run does not change. "Ask again as 201d" makes a new branch from the edited wording.

**C62. Three model calls nobody asks for.**
- Code (`research/request-path.md`): after the first exchange of every chat, a title, a summary and tags are requested on Haiku. No setting turns them off and nothing says so beforehand.
- A §2 and E: the Enter line names what will go before it goes. `summarize:` exists as a verb. A reader with no key has no model to make these calls.
- **Suggestion:** keep the title, since an untitled table is unusable, and name it once on the Enter line of a first prompt ("and one small call for a title"). Summary and tags become `summarize:` and a tagging verb, on request. With a keyless source, the title is the first words of the prompt and no call is made.

**C63. Does the Lab save on every command?**
- Code: saving is explicit, with an unsaved-changes flag and a first-time "Build" step.
- L7 applies settings on click and shows no save.
- **Suggestion:** every command saves, and `undo:` is the way back. Also to rule: may a room hold two of the same block, given that commands address blocks by name? Suggest no, for now.

**C64. Theme scope.**
- AB §2 (Proposed): "A room's theme applies inside its edges only."
- Code (`research/lab-code.md`): in a chat the theme is set on `<html>` and recolours the whole page.
- No ruling needed. It is work that comes before the new chrome can sit beside a room, and hard-coded colours inside blocks limit how true it can be made at first.

**C65. Three commits on `refactor/main` that never reached `main`.**
- All from 6 April: `974d659` (the space bar hijacked in comment and chat inputs), `50ecd25` (revision suggestions missing in scanned chats), `c2ed12a` (the update banner for the service worker moved to the app level).
- **Suggestion:** bring `c2ed12a` onto this branch, since a new version, a security fix included, is never offered to an open tab today. Leave the two Secretarybird fixes until the editing engine is decided.

**C66. What "web search on" means.**
- Code: offered to the model on each message while the toggle is on.
- L7's guide: "Yes, when I ask."
- **Suggestion:** a feature of input set with `set:input web search on`, shown as marginalia in the prompt field, and named on the Enter line of every prompt it goes with.

**C67. Personas are not what the spec describes.**
- E "Carried forward": Parrots are saved personas with a system prompt, an optional default model and tool preferences, their own store, a `parrotId` on each conversation, and a "My Parrots" section in Settings. Your own collabs "are written in Settings, where My Parrots was".
- Code (`research/request-path.md`): personas are `{ id, title, instruction }` in one settings value, edited only inside the Collaboration window. Ticking one has never changed what is sent to the model. Only the five presets and the custom text go.
- So after the move to `collab:`, a ticked persona would take effect for the first time. Two of the five preset ids differ from the built-in collabs, and the existing "challenge" text asks the model to critique its own output, where E says "question what it is given".
- **Suggestion:** personas become "yours" collabs, all switched off, listed in the dry run. The five built-ins take E's wording. Where your own are written (Settings, or the picker in the field) waits for the collab mockup.

**C68. Documents that describe a policy the site does not have.**
- CLAUDE.md: provider and source hosts are "each listed in `netlify.toml`". Only Anthropic is listed (`research/security-audit.md`, item 1).
- SECURITY.md prints a content security policy that differs from the deployed one, and describes a "session-only" key mode that no longer exists.
- No ruling needed on the first: hosts are added as each provider or source ships, and the CLAUDE.md update can say so. SECURITY.md is rewritten from `netlify.toml` (see C69).

**C69. What the app says about privacy against what it does.**
- The README, SECURITY.md, the Settings "About" copy, the network log card and the manifest make nineteen statements, listed word for word in the audit's item 11. Twelve are not accurate as written. Examples: "The only network requests the app makes are directly from your browser to Anthropic's API when you send a message" (three more calls follow a first exchange, a key check sends one, and the page preconnects on every load); "It never leaves your browser" of the key (it is sent to Anthropic with every request); the network log "records every outbound request" (it sees only what the page fetches).
- W §3: "Every claim must stay true."
- The live site shows this copy today.
- **Suggestion:** rewrite the copy to list what really leaves the device, and rename the log "requests made by this page". Do it ahead of the refactor, in a small branch off `main`, since it does not depend on any new design. Your call on the timing.

**C70. Voice input** (reopens C24).
- C24's suggestion was to leave the room's voice block alone; no ruling on it is recorded above. AB §2 (Decided): voice input is a feature of the input block.
- Audit: the production header `Permissions-Policy: microphone=()` very likely disables it on the live site (not tested). Where it does run, the browser sends the audio to its maker's speech service by default, which the content security policy cannot limit and the network log cannot see. W §3 says each request goes "straight to the provider you pick, to a model running on your own machine, or just Wikipedia".
- On-device recognition exists in Chrome on desktop (from 139), not in Chrome on Android or Safari, and in Firefox preview builds only.
- **Suggestion:** on-device only. Allow the microphone in the header, ask for local processing, and show the microphone only where the browser can do it on the device, with one line saying so. Otherwise remove voice input until that reaches more browsers.

**C71. "Open source on GitHub", and going public.**
- W §9: the footer reads "Created with Claude Code · Open source on GitHub · Looking for other builders". W §12 doubts "open source", in case the licence is the Business Source License.
- Audit, item 12: `LICENSE` is MIT. The repository is private, and Settings already says "Open source and community-driven" beside a disabled "View on GitHub" button.
- Publishing the repository publishes its history, which carries one personal email address as author on all 467 commits. The no-force-push rule means the history cannot be rewritten in place.
- **Suggestion:** until the repository is public, the footer and Settings say "MIT licensed. Source published at launch". Decide how to publish (the existing history, or a fresh repository started from a single commit) before the welcome page ships.

**C72. The spreadsheet parser.**
- `xlsx` 0.18.5 from npm has two high advisories and no fix on npm; fixed versions are distributed only from the vendor's own site. It parses uploaded files and restored backup blobs, on the main thread, with no size limit, and loads for every user.
- L7 keeps the table canvas and the file shelf, so spreadsheets stay part of the product.
- **Suggestion:** vendor the fixed version (0.20.3) into the repository from the vendor's site, load it only when a spreadsheet is opened, parse in a worker, and cap the file size. The other option is to drop `.xlsx` and `.xls` and keep CSV, TSV and JSON until this is done. Either way, 0.18.5 should not stay. Fetching the vendor's package needs your yes.

**C73. Two controls that do not do what they say.**
- "Delete everything" (St §11; audit item 8): the copy says "Permanently delete all data from this browser". It leaves every room you built, the five library stores, the key store's database, the caches and the service worker.
- "Don't save" for the key (audit item 5): sending fails because nothing holds the key, and switching to it does not remove a key already stored.
- **Suggestion:** "Delete everything" removes all of it, and its confirmation lists what goes. The key store rebuild (one module, one in-memory holder) fixes "Don't save"; until then the option is hidden rather than left broken.

**C74. Rooms "can be exported as a mode file and shared".**
- The editor says so (`EditorRightRail.jsx:364`). AB §6 lists "Mode file" as the Library's export. W §13 promises "how to load a finished block".
- Code: no room import or export exists. A room from someone else can arrive only inside a restored backup.
- **Suggestion:** the sentence goes with the inspector (R18). Room files are their own later item: data only, validated on the way in, with any standing instructions they carry shown before anything is applied.

### 5c. Open in the documents themselves

Not repeated here, and still open: AB §10 (Symposium as a word, the collection's
purpose, the docket pin, two boards of one kind on a screen), W §12 (the licence
wording, the two links, step 8, small screens), W9 §7, E "Open questions"
(prompt edits and the model, version history, Ripple's reach, collab scope, sweep
reach, calm by default, focus per room), B "Still open" (quill colour, shared
docs).

## Proposed CLAUDE.md rewrite

Applied 23 September 2026 (see Rulings). Kept here as the record of what was proposed.

```markdown
# CLAUDE.md: Parliament

## Read this first
(unchanged block)

## Orientation

Parliament is a client-side AI workspace. No backend, no accounts. Users bring
their own Anthropic API key; everything else lives in the browser's IndexedDB.

It is mid-refactor to a new direction, defined only by the four files in
`docs/spec/`:

- **Almanac**: the homepage. One table of everything you have made (chats,
  notes, highlights, dockets), addressed by number. Can also be opened or
  popped out from anywhere.
- **Docket**: a plan of steps across branches and runs.
- **Symposium**: the flow of chats from room to room that a docket directs.
- **The command line**: one field read three ways (search, `>` command,
  `p>` prompt). It is the actor on every surface; surfaces do not execute.

Rooms (mode files rendered by `<RoomShell>`, with their own colour schemes)
stay. The Lab (`/edit`), wizard (`/build`) and editor are redesigned in a
later step.

Working files: `docs/spec/inventory.md` (what exists), `docs/spec/conflicts.md`
(rulings), `docs/spec/change-plan.md` (the plan).

`refactor/` holds the previous refactor (V2 Phase 1). It explains how the
current code got here. It is not a source of requirements, and documents it
cites that are missing from the repo are gone.

## Hard constraints (do not relax without scope review)

- Pure client-side. No backend, no servers, no accounts.
- Strict CSP. Scripts from self only. Connections only to self, the model
  providers (Anthropic, Mistral, Ollama on localhost) and the named source
  hosts (Wikipedia, Hacker News via Algolia, OpenAlex), each listed in
  `netlify.toml`. A new host is added only with its provider or source. No
  third-party scripts, analytics or tracking.
- Cross-window messages (BroadcastChannel) carry ids and signals only, never
  content or keys.
- API key encrypted at rest via Web Crypto (AES-GCM, non-extractable). Web
  Crypto only for anything cryptographic.
- Provider abstraction always. Model calls go through `src/providers/`,
  against the interface in `src/providers/base.js`. Every provider key is
  encrypted the same way as the Anthropic key.
- Stored data: never run a migration or schema change without showing it
  first. Every backup ever written must stay readable.
- Nothing is deleted without explicit approval, item by item. Prefer
  `/deprecated` or a flag.

## Conventions

- Visual values come from the mockups in `docs/spec/`. Gold means the live
  action and nothing else. Light mode only for now.
- Copy: sentence case, no em dashes.

## Going (proposed, pending approval item by item)

The Study and homepage-scope mode files, the blueprint and its Cmd/Ctrl+.
overlay, the `/chats` selector and homepage Chats section (replaced by the
Almanac). See the retirement section of `docs/spec/change-plan.md`.

## Archive pointers

- V1 spec: `git show 12e142f:CLAUDE.md`
- V2 Phase 1 CLAUDE.md: `git show <commit before this rewrite>:CLAUDE.md`
```
