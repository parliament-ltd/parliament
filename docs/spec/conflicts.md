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

**Ruled 11 October 2026:**

- **C37. Yes. The bar is the only place a prompt is typed in a room.** "Let's keep it simple." A room's input block is where the bar docks and what holds the input features.
- **C20, reopened. Favourites become a collection.** This replaces the ruling of 23 September (pinned highlights). The migration planner changes to match before the dry run.
- **C73, first half. "Delete everything" deletes everything,** and the person must be sure before it happens. The safeguards are still being discussed.
- **C39, in progress.** Permanent removal of one item will exist. Candidate words: `wipe:` or `erase:`.
- **C71, direction.** Parliament is to be open source. The author address is to be removed from the history first; the method is not yet chosen.
- **"Don't save" for the key is to be fixed** (C73, second half), not hidden.

**Ruled 11 October 2026, second round:**

- **C71. Open source, after the refactor is finished.** The history is kept. The author address is rewritten on a copy to GitHub's no-reply address and pushed, `main` only, to a new public repository; this one stays private as the archive. No force push. The site lives at `parliament.ltd`, hosted through Netlify.
- **Redundancy.** A bundle of the whole repository is kept on a drive outside this machine. The recommended steps go into the plan: a mirror of the code on a second host once public, a standby copy of the site that `parliament.ltd` can be pointed at, each release saved with a checksum, backups for people's data, and two-factor with recovery codes on the accounts.
- **Keys are saved by default.** "Don't save" is an option for people who want it, off unless chosen, and it has to work.
- **C72. The spreadsheet library:** the fixed version is taken from the vendor into the repository, loaded only when a spreadsheet is opened, and run in a worker with limits.
- **C73 and C39. Removal.** "Delete everything" stays a button in Settings, never a command or a link. Its confirmation lists what goes and is armed by typing a word, a backup is offered first, and it says what it cannot reach. One item is removed with `erase:`, which takes explicit numbers only. (`erase:` is recorded on "fine with your lean"; say if `wipe:` was meant.)
- **C53. Boards are built from blocks and shipped arranged.** They are not editable in this refactor, and they must be built so that they can be made editable later.
- **One schema upgrade.** Everything that changes existing data happens in one upgrade to version 6, with one dry run.
- **Other people's blocks arrive by pull request only,** reviewed and shipped in the catalogue.
- **The order in `plan-brief.md` section 10 is accepted. The first thing Stefan wants to try is the welcome page.**
- **The fixes that are true on the live site today are part of the refactor,** not a separate branch.
- **C43. `pop:command` stays.** The bar can be popped into its own window and moved to another monitor. `bar:bottom` and the like are quick positions on the page.
- **C50. Ink,** for the focus ring and for marginalia under the pointer. Gold stays for the `api:` ignition and the edge of the hexagon.
- **C57. Both kinds of highlight are kept,** and each must be clearly shown for what it is. How they are named and drawn is still open.

**Ruled 12 October 2026:**

- **Privacy copy names no provider in a sentence.** It has to read true for Mistral, Ollama and providers that do not exist yet. `privacy-copy-draft.md` is revised to match.
- **C71, progress.** Stefan switched on GitHub's email privacy. This repository now commits with the no-reply address. GitHub will refuse a push of the older commits, which still carry the private address, so this branch cannot be pushed as it stands: the bundle is the backup until the history is rewritten.
- **The domain** is registered with Squarespace Domains. Its DNS is run by Netlify (found by lookup on 12 October). A mailbox at the domain is wanted.
- **C43, completed.** Welcome step 2 is `bar:bottom`. The welcome steps still introduce `pop:`. `bar:left`, `bar:center` and `bar:right` belong to the bar. `pop:left` and `pop:right` are for boards that have been popped.
- **C62. One request, not three.** Title, summary and tags come from a single call after the first answer, named on the Enter line, with a switch in Settings. "That follows Parliament's ethos."
- **C57 and C78. Three names.** A **highlight** is one passage marked where it sits. A **term** is a word or phrase lit wherever it appears in a chat; today's highlights carry over as terms. A **quote** is a passage kept beside the chat that the model never sees.
- **C56. Edits and asks take numbers,** are rows in the table only when filtered for, and are always cards in the Collection. To be tried and looked at again.
- **C70. Voice on the device only,** with a note beside the microphone about what the alternative would mean for privacy.
- **C40. `name:`. C41. `inspect:`. C42. `close:` and `open:`. C49. Lower-case branch letters.**
- **C46. Both `restore:` and `import:`.** `restore:` brings a backup back. `import:` brings in something made elsewhere, and later, things other people have built.
- **C47. `tour:` stays,** so someone who forgets a step can come back to it.

- **One address for now: `support@parliament.ltd`,** for security reports and everything else.
- **The registrar account is secured:** two-factor, domain lock, auto-renew and WHOIS privacy are all on (Stefan, 12 October).
- **Sequence.** The assumptions in `refactor-plan.md` section 3 are gone through with Stefan first. The CLAUDE.md update and stage 1 follow once that is done.
- **C65, corrected.** The three commits on `refactor/main` change files under `src/adapters/`, which the earlier refactor removed. Nothing can be brought over. The update notice is built fresh in stage 1; one of the two editor fixes already exists in today's code in another form, and the other is checked at stage 11.

**15 October 2026:**

- **`delete:` points to `erase:`.** Typing `delete:207` removes nothing: it answers "To remove something for good, use erase:" and fills in `erase:207` for Enter. One word stays destructive.
- **Found while testing the dry-run screen:** the start-up check that removes chats with no messages can remove a chat whose messages are still being written. A real restore writes chats and messages in separate steps, so another tab starting up in the middle of a restore could lose a restored chat. Fixed with the restore work in stage 2 (one write path, chats and their messages written together).

- **From the plan's assumptions:** A11, A13, A15, A19, A22 and A23 accepted as written. A13 (personas) and A19 (terms are numbered but not rows by default, and must still be found by search) are to be looked at again.
- **A1, items 1 to 5 and 10.** Follow the newest HTML mockups. `open:` takes a chat's number or its name; a name that matches several chats makes the Enter line list them. `api:` everywhere; `key:` is kept free for a possible sharing feature if Parliament ever has several users.
- **Round three of the plan's assumptions.** A2: the Lab is built to v7 (settles C38). A4, A7, A9, A10, A18: accepted. A5: `strain:` is cut; it was about site performance (settles C48). Every assumption in `refactor-plan.md` section 3 is now ruled.
- **Round two of the plan's assumptions.** A6: "Almanac" for now, with a plain-language pass on names before the welcome page, because obscure words are the worry. A8: Wikipedia, Hacker News and OpenAlex all ship; people pick. A12: web search is on for the next prompt only, to be looked at again. A14 (settles C27): three groups in the picker (models, models on your machine, sources), with the branch slider's sub-labels and details. A16, A17, A21: accepted. A20: `tour:` as proposed; `list:` is kept free for something like making a bulleted list.
- **Brave Search (C28): later, not in this refactor.** Unlike the three free sources it needs its own key and a card, and charges per search after a monthly credit. Whether a browser may call it directly is unverified.
- **C44. Escape and Backspace.** Escape never deletes text. It takes the field to the resting mode of the screen (search on the Almanac and the welcome page, prompt in a room and a docket), and what was typed stays with the mode that was left, so typing `>` again brings back an unfinished command. In the resting mode, Escape returns you to what you were doing. Backspace only deletes text; deleting the `>` leaves command mode. In prompt mode the `p>` is swallowed, so Backspace in an empty prompt does nothing.
- **A1, items 6 to 9 (table 5a, P6, P7, P8, P9):** accepted as written. Part 5a is now ruled in full.

- **DNS is with deSEC,** signed with DNSSEC, and no longer tied to Netlify. Mail is with Proton Mail, which holds `stef@parliament.ltd`. `support@parliament.ltd` is added as a second address for anything public; `stef@` stays the default. Records are in `docs/hosting.md`.

**16 October 2026:**

- **C83. A local estimate before sending; real counts after.** Nothing is sent without the user's consent, which is Enter.
- **C84. The app opts out of the browser's page translation when the first real translation ships.** In-app translation uses the browser's on-device translation, a local model, or the chosen provider with its cost on the Enter line.
- **C87. Language work goes where suggested** (groundwork in stage 3, welcome page translation-ready in stage 5, reply language in stage 7, the picker in stage 9). **The first languages to test are Japanese, Chinese, Swedish and Finnish,** which Stefan can review. Right-to-left support is still built into the groundwork and checked with a mirrored pseudo-language until a right-to-left language has a reviewer.
- **C88. Accepted:** ask the browser to keep Parliament's storage once there is something to keep, show the answer in Settings, nudge backups.
- **C49, extended. Branch letters skip i, l and o** (23 letters), because each reads as a digit beside a number.
- **How people switch language: ruled as suggested** (Stefan proposed a globe, `language:japanese` and perhaps a languages board on first load; the suggestion below was put to him and accepted):
  - `language:` works from the bar, accepting a code or a name in English or in the language itself (`language:ja`, `language:japanese`, `language:日本語`). The verb stays English, like every command; the Enter line answers in the language chosen.
  - The globe is worth having: someone faced with a language they cannot read needs a sign they recognise. It sits beside the current language's own name ("🌐 English ▾") as marginalia at the top of the welcome page and in Settings, and opens the numbered picker listing languages by their own names, never flags.
  - No board, and nothing in the way on first load. The browser already says which languages its user reads, so most people land in theirs; anyone else sees the globe straight away. A board is something you open, move and pop; a list of languages is a picker.
- **The globe means language.** Today a globe also marks web search: the room's input (`InputArea.jsx`) and the web-search glyph in Lab v6 and v7. Web search takes another mark wherever it is drawn next (first on the Library board, stage 5); which mark is open.
- **Suggested, not yet ruled, for when their stages come** (put to Stefan on 16 October after the ruling above):
  - Bare `language:` opens the picker. `language:browser` goes back to following the browser's languages.
  - The globe appears once a second language ships (stage 9). Until then a list of one would be an option that does nothing, so `language:` answers that only English is available.
  - Replies follow the interface language until "Reply in" is set (stage 7), so `language:japanese` alone gives Japanese replies too.
  - The choice is a setting of the person's, not the device's, and goes in the backup allowlist when the setting is added.
- **The dry run is approved.** Stefan read it on two backups of his own (one chat in one browser; 21 chats, 17 of them Secretarybird documents, in another) and on the sample. The version 6 upgrade is drafted next and shown to him before the database version goes up.
- **C91. Secretarybird documents stay as they are,** comments and suggestions included. To come back to and check: that Drafting Desk still shows them after the upgrade, and what becomes of them at stage 11.
- **C90, as revised: yes.** Rooms made from a built-in template record its key and keep their stored names; chat titles are not changed; the new screens treat template names, "Branch:" and "New conversation" as words of the interface.
- **The database version goes up at the stage 2 checkpoint,** after the write path, restore and backups, with a backup offered first. Until the write path exists, today's screens would create chats, notes and highlights with no number or docket, and removing a chat would leave its docket pointing at nothing.

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

- **Cmd/Ctrl+Shift+B is bound twice.** It opens the branch panel (`BranchShortcutHandler.jsx:41`) and the backup modal (`BackupContext.jsx:53`) at once on chat pages. **Fixed 20 October:** on a chat with messages it opens the branch panel only, and the backup window everywhere else; neither shortcut was removed. Which one a chat page should get is easy to swap if Stefan prefers the backup. **Ruled 20 October: keep the branch panel on chat pages** ("sounds good").
- **A merge restore that renames a conversation leaves broken references** (`backup.js:600-730`): `branchPoint`, child `parentId`, message ids on notes, highlights and favorites, and `pins.sourceMessageId` are not remapped. This matters before any migration.
- **The older import path (`db.js` `importData`, L979) likely throws on `sbrd_documents`.** It keys on `item.id || item.key`, but those records are keyed on `conversationId`.
- **The homepage Chats section loads the API key by a different setting than the rest of the app** (`settings.persistKey` against `settings.storageMode`, `chats-preview.jsx`).
- **In development, raising the version upgraded an open tab without the upgrade screen** (19 October). Saving the version change hot-reloaded the open dev tab, whose database code ran again and opened the database at version 6 straight away. It happened to the pane's dev copy of Stefan's second backup: the result checked out exactly as the dry run said (21 chats in 16 dockets, numbered together from 201 to 237, counter 238), and the backup file it came from is still on disk. On the live site nothing opens the database before the upgrade screen has cleared, and a new version always loads fresh, so the screen comes first. For a future version change in development: close the app's tabs first, or try it on the trial copy. The screen was then shown on a version 5 copy of the same backup in the trial database: a forced failure left it at version 5 and said why, and the real run upgraded it and opened the app.
- **A failed upgrade did not roll back** (found 19 October by the first automated database test). `idb` does not wait for an async upgrade function, so when the version 6 data step threw, the browser kept the half-made version 6: the new lists, and no numbers or dockets. Fixed the same day in `schema.js`: the upgrade abandons its own transaction on any failure, and the test checks that version 5 is left exactly as it was. The version 4 and 5 steps have the same shape; they ran long ago on every install, so they are left alone.
- **Opening a Secretarybird document writes it back** (found testing the upgraded copy, 16 October). Today's editor rewrites a document when it is opened, with no edit: a new date and an empty `suggestionStates`, and an empty document gains a blank paragraph. Nothing is lost (checked paragraph by paragraph on Stefan's data), and the live site does the same (one of his documents is dated minutes before his backup). Two consequences: a document's date says when it was last opened, and a restore comparing records would see an opened document as changed, so "identical items are skipped" would miss it. Stage 1 stopped the same habit for chats with no document; the rest belongs with the write path and restore (stage 2).
- **Settings that point at chats** (found in the dry run, 16 October). Secretarybird's Ripple stores `sbrd-ripple-scope-<chat id>` and `sbrd-ripple-manifest-<chat id>` (`RippleScopeModal.jsx`), and their values list other chats' ids. The backup allowlist (stage 2) has to carry these by pattern, and a restore that gives a chat a new id has to rewrite the key and the ids inside.

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
- **Approved 20 October, "for now"** ("looks good for now"): the sheet in `token-sheet.md` and `src/styles/tokens.css`, drawn at `/dev/tokens`. Chrome is drawn from it; values can still change.

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

**C75. From the four mockups supplied later on 11 October.** **BS** = `parliament-branch-slider-v9.html`, **CB** = `parliament-collection-board-v3.html`, **L6** = `parliament_lab_v6.html`, **SC** = `parliament_screens_v1.html`.

- **C38, now that L6 can be read.** By their header comments, L7 is L6 plus what L7 lists under "What this tries": the Blocks board, settings applied on click, input and messages allowed in any column, blocks reordered within a column, and the room line no longer showing a selected block's settings. L6 keeps the canvas style switch, which L7 drops. The two files have not been compared line by line.
- **C60, confirmed.** BS: `open:201a` is "its own card, full history, keeps its letter"; `open:201a summary` is "a new branch (next free letter) from a summary", costing one model call, with the context estimate worked out locally.
- **C27, picker groups, drawn a third way.** St: one flat list. Ruled 23 September: three groups (models, local models, sources). BS: two groups, "Models" with the local model inside it marked "free", and "Sources, no tokens" under four quiet labels (Reference, Research, Web and discussion, Media and data). BS says it "reverses the Sept 23 decision (flat list, no groups)". **Suggestion:** BS, since it is the newest drawing of the picker.
- **C28, the source list.** BS lists sixteen rows, twelve of them sources, among them arXiv, Kiwix and Brave Search, which its own header marks "not yet checked". arXiv cannot be reached from a browser. Brave needs a key. **Suggestion:** unchanged. Wikipedia, Hacker News and OpenAlex ship; the picker shows others greyed as "later" only if you want them advertised.

**C76. One prompt to several sources, in order.**
- BS: "All at once" (one reply from each, in a slider) or "One after another", where each source after the first runs on a condition: "if nothing is found", "if it fails", "after it finishes" or "always". Every prompt sent to several sources is kept as steps in the docket.
- D: a step has a prompt, a room and a model. It has no condition.
- **Suggestion:** "all at once" is built with the branch tabs. "One after another" follows once the docket can run, and the step record gets a condition field in the one schema upgrade so no second upgrade is needed for it.

**C77. The Collection's tabs, and where notes and quotes go.**
- CB: tabs are All, Highlights, Notes, Quotes.
- E (newer): tabs are All, Edits, Asks, Suggestions, Highlights. E's table says this replaces CB's tabs. Notes and quotes are not mentioned.
- **Suggestion:** nothing is lost: All, Highlights, Quotes, Notes, Edits, Asks, Suggestions, each shown only when it has something in it.

**C78. Quotes** (bears on C57 and on "Pin for reference" in C60).
- CB (Proposed): "'Quote' replaces 'pin for reference': a passage kept for you that the model never sees. `pin:` keeps its Almanac meaning, keep at the top."
- Code: "Pin for reference" copies a whole message into another chat.
- So the mockups have three kinds of marking where the code has one: a highlight (a passage marked in place), a quote (a passage kept beside the chat), and today's highlight (a phrase lit wherever it occurs).
- **Suggestion:** see the naming proposal put to Stefan on 11 October; rule on C57 and this together.

**C79. Summaries: rewritten, or dated and fixed?**
- AB §7 (Decided): "`summarize:207, 216` rewrites each item's own summary line."
- CB: "Summaries are dated and never change. When a source changes, the summary says so; `rewrite:` writes a new dated note beside it, and `compare:` shows the difference with no model call."
- These may be two different things: the one-line summary on a row in the table, and a summary note made in a collection. **Suggestion:** treat them so. A row's summary line can be rewritten with `summarize:`. A summary note in a collection is dated and fixed, and `rewrite:` makes a new one beside it.

**C80. Small ones from the four mockups.**
- CB uses `heading:` for a place in a collection; AB §6 uses `section:`. Suggest `heading:`, as the mockup draws it.
- CB: `delete:201c` keeps a branch's markings as cards and `delete:201c all` removes them too. With `erase:` ruled, suggest `erase:201c` and `erase:201c all`, the Enter line saying which.
- SC uses `delete:` on a saved arrangement. Suggest `forget:`, which already removes a saved search or collection.
- BS draws marginalia turning gold under the pointer. Ruled ink on 11 October (C50).
- BS: ⌥← and ⌥→ switch between replies from inside the field; ← and → when it is empty.

### 5c. Open in the documents themselves

Not repeated here, and still open: AB §10 (Symposium as a word, the collection's
purpose, the docket pin, two boards of one kind on a screen), W §12 (the licence
wording, the two links, step 8, small screens), W9 §7, E "Open questions"
(prompt edits and the model, version history, Ripple's reach, collab scope, sweep
reach, calm by default, focus per room), B "Still open" (quill colour, shared
docs).

## Part 6. Languages, providers and networks (added 16 October 2026)

From `parliament-languages-providers-networks.md` (**LPN**), dated 16 October,
the newest document. Its §0 records two decisions Stefan confirmed that day:
multi-language support is part of this refactor (groundwork, choosing a
language, reply language), and so are more providers, Mistral included.

**C81. The document's frame.**
- LPN is written against the old V2 plan: "Phase 1", and six V2 documents it says win over it (`parliament-v2-brief.md`, `parliament-v2-refactor-scope.md` and four more). None of the six is in the repository. CLAUDE.md says the old refactor is not a source of requirements.
- **Suggestion:** read LPN as a current spec document. Its decisions map onto the plan's stages; its references to V2 documents, "Agent-tier consent", the "model-picker field type" and commands such as `spread:` and `map:` are read as the nearest thing in this plan (the Enter line as consent, the picker of A14, today's verbs).

**C82. Mistral from the browser: allowed.**
- LPN §7.1 calls browser access unverified and cites a third-party report that it is blocked, with a native shell or a server relay as fallbacks.
- Tested on 16 October from origin `https://parliament.ltd`: `api.mistral.ai`, `api.eu.mistral.ai` and `api.us.mistral.ai` all answer the preflight with `access-control-allow-origin: *` and allow the `Authorization` header. The same was found on 23 September.
- **Suggestion:** no fallback is needed. A streaming test with a real key still comes first in stage 7. The three hosts go into the policy when Mistral ships.

**C83. Counting tokens before Enter.**
- LPN §3: use Anthropic's counting endpoint before sending, for real counts.
- Rule 1 of the plan: nothing leaves the device before Enter. The counting endpoint receives the whole prompt.
- **Suggestion:** the Enter line shows a local estimate before Enter; real counts come from each reply's usage figures after, for every provider.

**C84. The browser's own page translation.**
- Stefan, 16 October: concerned that Google Translate works against Parliament's privacy. When someone uses Chrome's built-in "Translate", the page's text, chats included, is sent to Google to be translated.
- LPN plans real translations of the interface, so nobody needs the browser's.
- **Suggestion:** the app opts out of page translation (`<meta name="google" content="notranslate">`, and `translate="no"` on the page), from when the first real translation ships, so nobody is left without a way to read it meanwhile. Any translation inside Parliament (a source result, a query) uses, in order: the browser's on-device translation where it exists, a model on your machine, or the provider you chose with its cost on the Enter line. Never a translation service in the background.

**C85. Consent for query translation.**
- LPN §6 and open question 6: query translation is probably "Agent-tier" and needs the V2 consent flow.
- In this plan the Enter line is the consent: it names every recipient and cost before anything goes.
- **Suggestion:** translating a query is one more line on the Enter line ("and translates your query with {model}, one small call"), off unless chosen.

**C86. Interface words in stored data.**
- LPN §5: mode files and backups store keys and ids, never translated strings.
- The migration planner wrote "Favorites" and "Untitled" into data.
- **Done, 16 October:** the Favorites collection is stored as a built-in key (`builtIn: 'favorites'`), and a missing title or name is stored as empty for the interface to fill in. A test checks that no interface word is written.

**C87. Where the language work goes in the plan.**
- **Suggestion:**
  - Stage 3 (shell and bar): the copy table is the translation catalogue from day one, with plurals that work in every language, dates and numbers through the browser's `Intl`, layout written to mirror for right-to-left scripts, `dir="auto"` on every message, a pseudo-language for testing, and a lint rule against hard-coded words.
  - Stage 5 (welcome page): built and checked in the pseudo-language, so no word is left untranslatable; shipped in English first.
  - Stage 7: "Reply in", added to the prompt for every provider and named on the Enter line; Mistral; language tags on models in the picker; English-only badges on sources.
  - Stage 9: the language picker in Settings, defaulting to the browser's languages, never to the network address.
  - First real languages (LPN suggests Arabic and Japanese, which test layouts hardest) once native reviewers are found.
- The choice of translation library (react-i18next or Lingui) is made at stage 3.

**C88. Safari can delete local data.**
- LPN §9: Safari deletes a site's stored data after seven days of browser use without a visit, unless installed (unverified).
- **Suggestion:** ask the browser to keep Parliament's storage (`navigator.storage.persist()`) once there is something to keep, show the answer in Settings, and nudge a backup after a few days without one. The request moves to stage 2, since it protects the data the upgrade produces.

**C89. Smaller items from LPN, each placed in a stage.**
- Chrome asks permission before a site reaches `localhost`, and a refusal is permanent until undone in site settings: an explanation before the first Ollama request and a recovery screen (stage 7).
- Never infer language or location from the network address (all stages; no change needed today).
- A stalled stream through a buffering proxy falls back to a request without streaming (stage 4).
- "This source isn't reachable from your current network", for sources that refuse VPN addresses (stage 7).
- The privacy list says which sources see the network address (`privacy-copy-draft.md`).
- Feature detection, never the browser's name, and a fallback instead of a missing feature: pop-outs in Safari open as ordinary windows, and the Enter line says so (stage 3).
- Kiwix: still later. Kiwix's own reader is GPL-3.0 and cannot be bundled with MIT code (LPN §7.4).

**C90. Interface words already in stored data** (found in the dry run, 16 October; bears on C86).
- C86: stored data holds keys and ids, never words of the interface, so a backup made in one language restores in another. The planner follows it. Records written before it do not:
  - A room made from a built-in template stores the template's English name and description as its own (`createModeFromTemplate` in `src/lib/modes.js`), for example "Writing Studio". Nothing records which template it came from, except `buildIntent.derivedFrom` on rooms the V2 migration made. A room made with no name is stored as "New room".
  - A fork is titled "Branch: <parent title>" in the chat's own title (`db.createBranch`), and a summary branch "Summary: …". A fork of a fork reads "Branch: Branch: …".
  - The homepage room is stored as "The Study" (`db.js`).
  - A chat made from `/chats` is stored with the title "New conversation" (`SelectorLayout.jsx`), and one made from the homepage takes its room's name as its title (`HomepageView.jsx`).
  - In Stefan's second backup (16 October): 19 rooms named "Drafting Desk", 2 "Writing Studio" and 1 "New room", all template words; 6 chats titled "New conversation".
- Done in the planner: docket and branch names drop every "Branch:" and "Summary:", but only on chats that were forked, so a title someone wrote as "Summary: Q3" keeps it. "New conversation" is read as no title. The chats' own titles are untouched.
- **First suggestion, withdrawn:** clear the template names and the title prefixes in the upgrade. Found while drafting it: today's screens read a room's stored name and a chat's stored title directly, and keep running until the new ones replace them. Clearing them would blank 19 room names in the app as it is now.
- **Suggestion, revised 16 October, and ruled yes the same day** (drafted in `v6Plan.js` and `v6Upgrade.js`):
  1. A room whose name is a built-in template's name records that template's key (`meta.template`). Its stored name stays. The new screens show the template's name in the reader's language while the stored name is still the template's English one, and the stored name once its owner renames it.
  2. Chat titles are not changed. The new screens read the "Branch:" and "Summary:" prefixes on a forked chat, and "New conversation", as no words of the person's, as the planner already does for dockets and branches.
  3. New rooms, chats and branches stop writing these words once the copy table exists (stage 3).
  4. "The Study" and "New room" are left alone; the homepage goes with R3.

**C91. Comments and suggestions inside Secretarybird documents** (found in the dry run of Stefan's second backup, 16 October).
- Secretarybird, the Drafting Desk room, keeps a chat's text in a document record, not in messages. In the second backup 17 of 21 chats are such documents. Their paragraphs hold 9 comments (a selected passage, a question and the model's answer), 57 suggestions from the model, and Ripple data.
- The new design has the same ideas under other names: an ask is typed, tied to a passage and answered in place (E), and suggestions come from Ripple and sweeps. The plan creates the lists of edits, asks and suggestions empty, filled from stage 11, and says Secretarybird's tracked-changes approach is not carried over. Nothing says what happens to the comments and suggestions already stored.
- Converting them in the one upgrade means guessing how an ask points at its passage, which is settled only with the editing engine (stage 11, C58). Leaving them means a second, small upgrade later if they are ever to appear in the Collection.
- **Suggestion:** the upgrade leaves documents exactly as they are, comments and suggestions included. Drafting Desk is a room, and rooms stay, so it goes on showing them as today. The dry run counts them, so nothing is out of sight. Whether they also become asks and suggestions in the Collection is decided at stage 11, with the engine.
- **Ruled 16 October: as suggested,** with a note to come back to it and check the behaviour: that Drafting Desk still shows every comment and suggestion after the upgrade (checked at the stage 2 checkpoint), and what becomes of them once the engine is chosen (stage 11).
- **Checked 16 October** on the trial copy of Stefan's second backup: Drafting Desk shows a document's 11 suggestions, its comment and its Ripple impact analysis after the upgrade. Stage 11 is still to come.

**Ruled 19 October, for the rest of stage 2:**
- **The key moves to the key store,** and the old copy in the settings list is removed once the new one has been read back and checked.
- **The browser is asked to keep Parliament's storage after the first chat exists, from a click** (C88).
- **Vitest 5,** as its own step, to clear the advisories left in Vitest 3.

**Ruled 19 October, at the stage 2 checkpoint:** the database version goes to 6, with the upgrade screen running the upgrade and reporting a failure instead of loading the app; tried on the pane's copy first. Then stage 3 starts with the pop-out prototype.

**C92. Choices made in the write path** (19 October; built this way, and **confirmed by Stefan as built** the same day). The write path (`src/lib/records.js`, its rules in `recordsModel.js`) sits behind `db.js`'s functions, so today's screens use it unchanged. At version 5 a write does what it always did, and is announced. At version 6 it also keeps the following true, in the same transaction:
- **A new chat starts a docket,** taking two numbers (ruled 23 September). A chat made from another (a fork, a document's branch, a summary branch) is the next letter in that chat's docket, in the same run, with where it was taken from.
- **Removing a chat takes its branch out of the docket.** The letter is not given out again (C17). When the last branch goes, the docket and its run go too: deleting means deleted, and a docket's name is its chat's title. Numbers are never reissued.
- **Steps follow the messages.** A prompt is a step; it reads "paused" while its reply streams and "done" once the reply completes, as the planner does. "Running" is shown from the stream itself, not stored, until the docket can run (stage 10).
- **A docket and its first branch take their name from the chat,** and follow it when the title call or a rename changes it, unless they were named otherwise. "New conversation" and "Branch:" are not names (C90).
- **New favourites also join the Favorites collection,** and leave it when unfavourited, while the heart exists (until R6).
- **Tags written to a chat are marked as the model's,** since only the tagging call writes them today.
- **Two repairs found on the way:** opening a Secretarybird document no longer rewrites it (the editor saves only after an edit, and a save of unchanged content writes nothing); and a document save no longer drops the older `suggestionStates` field, which two of Stefan's documents carry.
- **Not yet through the write path:** restore and the older JSON import still write records directly, so at version 6 what they bring in would have no numbers. Restore is the next piece; the older import goes with R10.

**Ruled 20 October: Lingui for the copy table** (the library C87 left to stage 3), over react-i18next: smaller, with build-time checks that suit the rule against hard-coded words. Packages to be named with their sizes before anything is fetched.

**C94. LibreWolf and Zen** (Stefan, 20 October: "can we also add librewolf and sen browsers and make sure we function with those?", "sen" taken to be Zen Browser. Safari is not a concern for now: his laptop runs Windows.)
- Both are built on Firefox, so they share its engine and what it lacks: no always-on-top window (`pop:command` opens an ordinary window there), no on-device speech recognition (voice stays hidden, C70). What Parliament relies on is present in current Firefox: IndexedDB, Web Crypto, BroadcastChannel, Web Locks, CompressionStream.
- **LibreWolf deletes cookies and website data whenever it closes** (its own features page, librewolf.net/docs/features). Website data includes IndexedDB, so by default everything a person makes in Parliament is gone the next time they open the browser, unless they allow parliament.ltd to keep its data (Firefox's Cookies and Site Data exceptions). Whether granting persistent storage (C88) protects a site from this is unverified. Nothing on the site survives the deletion, so Parliament cannot see afterwards that it happened, and it cannot read the setting beforehand.
- **LibreWolf turns on fingerprint resistance:** the browser reports its language as US English whatever the person reads (so the globe and `language:` matter there), the time zone as UTC (times of day would show in UTC), and WebGL is off. Nothing in Parliament uses WebGL or reads pixels back from a canvas (checked 20 October). Fingerprint resistance is also known to report no preference for reduced motion; unverified here.
- **Zen** leaves cookies, cache and privacy settings to Firefox's own (docs.zen-browser.app/security); fingerprint resistance appears to be off by default (not confirmed). It should behave as Firefox does.
- **Suggestion:**
  1. Test both with the list in `browsers.md`, alongside Chrome and Firefox. Safari waits.
  2. Where the browser has not agreed to keep Parliament's storage, the welcome page and Settings say so plainly, with how to let the site keep its data, and the backup reminder is stronger. The wording names no browser, since the app cannot tell which one it is in, and it holds for every browser that may delete site data.
  3. Find out in LibreWolf whether granting persistent storage survives closing the browser; the wording in 2 depends on it.
- **Ruled 20 October: yes.** When the browser has not agreed to keep the data, the welcome page and Settings say so plainly, with how to keep it, and backups are pushed harder. No browser is named.

**C93. Restore and backups: the plan** (19 October; **ruled yes, as suggested,** the same day). From stage 2 of the plan, P6 (ruled 15 October), audit finding T6, C35, and the race found on 15 October.
- **Today's restore,** read on 19 October (`backup.js` `restoreContents`, `restorePlan.js`):
  - It writes each kind of record in its own transaction, so another tab starting up between them can remove a chat whose messages are not written yet (15 October).
  - A chat whose id already exists comes in as a copy titled "… (from backup)": English written into data (C86), and the only sign that it is a copy.
  - It writes any setting the file names, except the saved key: the file is trusted.
  - A "replace" restore clears the settings, and the saved key with them.
  - It knows nothing of version 6, so what it brings in would have no numbers and no dockets.
- **Suggestion:**
  1. **One transaction for the whole restore:** all of it is written, or none of it. Nothing half-written can be seen or removed by another tab, and if the browser runs out of space, nothing is left behind and the restore says so.
  2. **Identical items are skipped (P6), compared on what the person can see:** a chat's title, its messages and their order, a note's text, a marking's text, a document's paragraphs and replies. Dates, sizes, numbers and fields the app keeps for itself are left out, so a document that was only opened since the backup counts as identical.
  3. **An item with the same id and different content comes in as a copy:** a new id, every reference to it rewritten, and `restoredFrom` on the record, so the new screens can say "restored, was 207". Today's screens show only the title, so the copy keeps "(from backup)" until the Almanac shows the marginalia (stage 6), and `nameFromChat` leaves the suffix out of names.
  4. **At version 6, what comes in is planned like the upgrade:** a format 1 file goes through the same planner, numbered from the counter, joining the existing Favorites collection. A format 2 file's numbers are remapped from the counter, keeping the old number in `restoredFrom`. A "replace" restore starts the counter again and keeps the file's numbers.
  5. **Restore stops trusting the file (T6):** only settings on the allowlist are written, including the Ripple settings named after a chat, rewritten when that chat's id changes. Each record is rebuilt from checked fields of the right type. The file size and the password-stretching count are capped.
  6. **A "replace" restore keeps the saved key,** as it keeps the browser's fingerprint, until the key moves to the key store.
  7. **Restore and backups format 2 are built together,** since one allowlist decides both what a backup may hold and what a restore accepts. The older JSON import goes through the same path (R10).
- **Built 19 October** (`backupSchema.js`, `backupData.js`, `restorePlan.js`, `records.fileRestored`), with tests on an in-memory database and a run in the browser on the trial copy. Two points to know:
  - **A merge rebuilds dockets from the chats it brings in.** Dockets hold nothing of their own yet: their names follow their chats, and their steps follow the messages. So a merge files each incoming chat by the write path's rules and ignores the file's dockets, and a "replace" of version 6 data keeps them as they are. Once dockets hold plans of their own (stage 10), a merge has to bring them in as well; to do then.
  - **Found on the way:** today's validator refused whole backups that the app itself writes. It refused a branch whose parent chat had been deleted, a chat whose room had been deleted, a favourite or highlight of a deleted message, a pinned reference whose source had been deleted, and a note in no chat (the one the scratchpad becomes). Neither of Stefan's backups had any of these, so both validated. Now the first four of these come in (the favourite or highlight of a deleted message is left out and counted), and the note comes in too.

## Part 7. The command layer (added 20 October 2026)

Found while building the parser and the verb registry (stage 3: `src/commands/parse.js`, `verbs.js`, `registry.js`). Every verb in the documents was listed, newest wins, rulings over documents. These are the points the documents leave open (C95 to C107; C108 and C109 are Stefan's own changes). Each is built as suggested, so a ruling either confirms it or changes one entry in `verbs.js`.

**C95. Board names as verbs.**
- The bar inventory (7 and 9 October, the newest) lists `alm:`, `lab:`, `sym:` and `library:` as current. The welcome steps teach `alm:` and `library:`.
- The arrangements spec (§4, 28 September) proposed that `alm:`, `sym:` and `library:` become shortcuts for `open:` or go, and that `lab:` stays. P3 (ruled) lets every board open by name: `open:library`.
- The editing spec and the branch slider draw short titles on the board strip (Sym:, Col:, Ref:, Alm:, Lib:, Dkt:), and `focus:sym col` takes them as words. The branch slider also writes `lib:` and `dkt:201` as if they were verbs.
- The arrangements spec and Lab v7 also have `settings:` and `home:` / `home:set`. What `sym:` goes to is open (arrangements §10).
- **Suggestion:** keep `alm:`, `lab:`, `library:` and `sym:` as verbs, each the same as `open:` for its board. `sym:` goes back to the last room. The short titles are words that `focus:` takes, not verbs. `settings:` and `home:` wait for their stages; `open:settings` works meanwhile.
- **Ruled 20 October: yes, keep the shortcuts** ("i'm good with lean, let's keep shortcuts"). Built this way.

**C96. No ranges.** The arrangements spec says in prose that removal took "ranges", but no document gives a syntax, `erase:` takes explicit numbers only (C39), and `run:` refuses ranges. **Suggestion:** no ranges anywhere for now; several numbers go with commas (`add:207, 216`). `201-205` reads as a word, and the Enter line says what the verb takes.

**C97. Second words for one act.** The bar inventory lists `reset:` (`refresh:`) and `from:` (`source:`). Its decisions keep one word per act, and `dup:` has no alias (C60). `help:` with a colon appears in Docket v12, Almanac v30 and the settings spec; C60 and stage 3 use `?` and `help`. **Suggestion:** `refresh:` and `source:` answer "That verb is now `reset:`" (or `from:`) and write it in. `help:` is read as well as `?` and `help`, since it can only ever mean help.

**C98. The bar's old words after C43.** `bar:pop` and `bar:dock` (settings spec §7, Almanac §4, Docket v12), `bar:foot` (dropped for `bottom`), `pop:center` (the hexagon, bar reference 9 October) and `pop:back command` (welcome §5) are in no ruling. **Suggestion:** `bar:pop` answers "use `pop:command`", `bar:foot` answers "use `bar:bottom`", `bar:hide` and `bar:show` answer with `focus:` and `calm:`. `bar:dock` and `pop:center` are not kept: `bar:center` places the bar, and `pop:back command` brings a popped bar back.

**C99. What may share a line.** No document says whether one line can hold several commands. Almanac v30 writes a filter with a minus to leave things out (`-tag:Research`). **Suggestion:** filters share a line (`type:chat -tag:essay`) and every other command runs alone; the Enter line says "One command at a time. Only filters share a line". The minus works on the filters that pick by kind or name (`type:` `room:` `tag:` `model:` `from:` `in:` `has:`), not on `cost:`, `since:`, `until:` or `sort:`.
- **Ruled 20 October: commands combine** ("i like the ability to combine commands yes, that adds power to the command bar"). Filters combining is built. Whether other commands may share a line too, and with what limits, is put to Stefan the same day; until then the registry lets filters share a line and nothing else.
- **Ruled 20 October, second answer: any commands may share a line, with the limits suggested** ("ok to let limits suggested, let's make a note to revisit this afterward once I can test out live"):
  - They run left to right, and the Enter line lists each before Enter.
  - If one fails, the rest do not run, and the Enter line says where it stopped.
  - `undo:` takes back the whole line in one step.
  - A command that sends something to a provider or source (`run:`, `summarize:` and the others marked as spending) stands alone, so its Enter line can name who receives it and what it costs; so does `erase:`, so it is plain what goes for good.
  - A verb that keeps the rest of the line as text (`tell:`, `note:`) comes last, since what follows it is its text.
  - **To revisit once Stefan can try it live** (stage 3's flag, then the welcome page): whether combining feels right, and whether the limits are the right ones.

**C100. What counts as a line shaped like a key.** The settings spec (§6): the history never stores a line containing `sk-` or "a run of 28+ key-like characters", and such a line is refused before Enter. Read literally, `sk-` anywhere catches `risk-analysis` and `task-list`, and any long run catches hyphenated tags and dates. **Built:** `sk-` at the start of a word, or a run of 28 or more letters, digits, hyphens and underscores that mixes capitals, small letters and digits, or holds six or more digits with only small letters and no hyphen. Tags and dates pass; keys are caught. A 40-character commit hash in a command is caught too, which is the safe side. Checked only in command mode: what a prompt may contain is stage 4's question. **Suggestion:** keep as built.

**C101. What the history of commands keeps.** The plan: commands only, never a prompt, a search or a line shaped like a key, and "the history never stores content". Two points it leaves open:
- `note:` and `tell:` carry writing (a note for people, a note for the model). Kept, it would be content in the history. **Built:** a line holding either is not kept. Names in quotes (`name:"Q2 evidence"`, `room:"Code Lab"`) are kept, since they are part of the command and worth recalling.
- How much is kept. **Built:** the last 500 lines, oldest dropped first, and a line run twice in a row kept once. Kept on this device only and never in a backup, as the version 6 list was made.
- **Suggestion:** keep as built.

**The boards registry and the arrangement** (20 October; `src/shell/boards.js`, `src/shell/arrangement.js`, `src/lib/arrangements.js`). The rulings settle that an arrangement includes popped windows, that every board opens by name, and that arrangements are kept as data from the start (P7); the mockups carry the behaviour and disagree in places. Built from Almanac v30 and Lab v7 where they agree; these are the points where nothing decides:

**C102. Each arrangement keeps its own state.** No document says whether there is one arrangement per device or one per shipped arrangement. **Built:** one each, kept on this device: the Almanac, the Lab, Settings, the docket, the welcome page, and each room its own. Leaving the Lab and coming back finds it as it was, and `reset:` has a default to return to. **Suggestion:** keep as built. **Ruled 20 October: keep as built.**

**C103. `move: … middle`.** Only welcome v9 glosses `move:` as "left, right or middle", for a verb the welcome page refuses; Almanac v30 and Lab v7 move to the left or right end. **Built:** left and right as the mockups do, the others shifting along; middle puts the board between the others. **Suggestion:** keep middle. **Ruled 20 October: yes.**

**C104. Bare `pop:back`.** Almanac v30 and Lab v7 bring every window back; welcome v9 asks for a name. **Built:** every window back, each to where it stood, with the Enter line saying how many; `pop:back library` brings one. The welcome page may still refuse the bare form as its lesson needs (stage 5). **Suggestion:** keep as built.
- **20 October:** Stefan asked whether this overlaps with `reset:`. Only when popping is the one thing changed. Bare `pop:back` brings the windows back to the page and leaves everything else as it is: boards opened, moved or closed, and where the bar sits. `reset:` puts the whole screen back as shipped: it closes the windows and the boards you opened, brings back the ones you closed, and returns the bar to its place. Put to Stefan whether to keep both.
- **Ruled 20 October: keep both `pop:back` and `reset:` as built.**

**C105. `pop:left` and `pop:right`.** Ruled only as being "for boards that have been popped" (C43); no document says what they do. **Built:** they place the window of the board the bar is pointed at on the left or the right of the screen. **Suggestion:** keep as built. **Ruled 20 October: yes.**

**C106. `bar:left`, `bar:center` and `bar:right`.** The settings spec (§7, 24 September): left and right make the field a square in a column of its own, with three lines kept for the Enter line, and `bar:bottom` puts the Enter line above the field. The bar reference (9 October, newer) used `pop:left`, `pop:right` and `pop:center` to move the field, and the hexagon it folds into, to that side; C43 (12 October) gave those words to `bar:`. **Built** as the newer: two separate choices, top or bottom, and left, centre or right, with the Enter line under the field either way. **Suggestion:** keep as built; the settings spec's square can come back once it can be seen beside this. **Ruled 20 October: keep `bar:left`, `bar:center` and `bar:right` as the side the field sits on.**

**C107. Which window stays on top, and what a reload does to windows.** The Almanac spec (§4) allows one always-on-top window per tab, and the browser gives only one. Nothing says which pop gets it. **Built:** the bar (`pop:command`) takes it where the browser has one; boards open ordinary windows, since a board kept on top would cover what you work in. A browser opens a window only after a click or a key, so after a reload whatever was popped comes back to the page instead of reopening. Each board's window has its own bar (C6), pointed at that board. **Suggestion:** keep as built. **Ruled 20 October: keep the always-on-top window for the bar, and bring popped boards back on reload.**

**C108. The folded field is a circle, not a hexagon.** **Ruled 20 October by Stefan:** "instead of a hexagon, let's adjust the shape to a circle, the same height as the search and command bar". This changes the bar reference (9 October) and the bar decisions: when a reply is being edited, the field slides into a circle 40px across, the field's own height. What stays: the mark inside (magnifier for search, the chevron rolling into the crescent moon for command, the quill in its ink pot for prompt), the slide and its timing, where it lands (`bar:left`, `bar:center`, `bar:right`, C106), hover, click and Cmd/Ctrl+K to open it, Escape to fold it again, and the edge turning gold on hover, the only gold at rest (C50, now on the circle). The bar decisions' open item, whether the moon reads as dark mode, still stands.

**C109. A reply being written when you leave its chat.** Today it keeps going unseen, blocks sending in every other chat, and can title the wrong chat when it ends (state audit §7). **Ruled 20 October by Stefan:** "given parliament's principles, we'd want to stop it and give a notice to the user that it was stopped. however, we should make this a setting that can be toggled on, opt-in if the user wants it completed." So by default leaving stops the reply and says so; a setting, off unless chosen, lets replies finish in the background, each saved to its own chat. Suggested details, put to Stefan the same day:
- **Leaving** is going to another chat or page, or closing the board that shows the chat. Switching browser tabs, or popping the board into a window, is not. Closing the browser tab always stops it.
- **The notice** is on the reply ("Stopped when you left the chat. What arrived is kept.") and once on the page you land on ("The reply in 207 stopped when you left it."), saying that the tokens already written are still charged.
- **The setting** covers replies in a chat you are watching. Docket runs, started on purpose with `run:` (stage 10), keep going until `stop:`. It reads "Finish replies after I leave a chat", is the person's preference and goes in backups, and has a switch in today's Settings until stage 9.

**Also built from the mockups** (no question):
- `open:` puts a board at the right end and points the bar at it; a board already here gets the bar, a popped one comes forward. No limit on how many; narrow windows stack (stage 14).
- `close:` never leaves the page without a board, and the welcome card stays; the bar goes to the board before. `pop:` keeps the last board on the page for the same reason.
- `reset:` closes the arrangement's windows and puts its boards and bar back; what each board shows stays ("your search and collection stay", Almanac v30).
- The bar's place is part of each arrangement, since the defaults differ: top on the Almanac, Settings and the Lab, bottom in a room and the docket.
- The board strip lists every board in the editing spec's order (Sym:, Col:, Ref:, Alm:, Lib:, Dkt:), marking open ones and the addressed one. What a click on a title does is drawn later: inline editing v5 toggles the board; the branch slider and the collection board write a shortcut. Suggested then: a click opens the board or points the bar at it, and never closes it, since a strip is easy to click by accident.
- Settings, Canvas and Blocks have no short title in any document, so they are not on the strip and `focus:` cannot name them.
- Stacked columns are in the data but nothing stacks yet: the Lab's Collection under Blocks comes with stage 13, the welcome page's right column with stage 5.
- For stage 9: the arrangements spec (§7) made window arrangements an optional backup category, while the settings spec, the Almanac spec and version 6 keep them on the device only. Built: on the device only.
  - **Ruled 20 October: window layouts go in a backup when the person chooses it** ("if possible, it'd be nice to have window layouts part of a backup if the user selects it"). Stage 9 adds the choice to `backup:`, off unless ticked. On restore, each arrangement is checked as it is when read from the device, and a window on a screen this computer does not have opens on the main screen (Almanac spec §4). The history of commands, focus sets and saved searches stay on the device.

**Also noted, for the stages that build them** (no question now):
- `set:room` means two things: the Settings setter for the room new dockets use, and Lab v7's `set:room rails right`. To settle at stage 9 or 13.
- Left out of the registry until their stages define them: `tour:docket` (arrangements §7; A20 does not cover it), `apply:` (Lab v7's collection; not in stage 13's list), `theme:any` (not defined), `export:room` (room files come later, C74).
- Rooms are addressed by name, not number, and `erase:` takes numbers only, so nothing says yet how a room is removed for good.
- The editing spec still writes `go:242`, `view:` and `delete:241` (now `jump:`, `markup:` and `drop:`); the welcome spec and its v9 mockup still teach `list:` and `key:` (now `tour:` and `api:`). Their wording is updated when stages 5 and 11 build from them.

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
