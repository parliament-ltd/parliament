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

**21 October 2026:**

- **C114. (b): offered, never automatic.** A reply that stalls is stopped, what arrived is kept and marked, and the Enter line offers to send it again without streaming, naming the cost. Nothing goes without Enter ("i'm fine with lean").
- **C115. Answers from sources stay distinct unless the person acts on them.** Stefan: "if a user selects multiple sources to reply to a prompt, they should remain distinct and separate unless the user acts upon them." So an answer from Wikipedia is not sent to a model. The person's own prompts still go, and the Enter line says how many answers stay out. Bringing an answer into a prompt is an act on it, designed with branches in stage 8 for every source together. This replaces the first build, which sent such answers as quoted context.
- **C62, default.** The one request after a chat's first answer is on by default ("that's fine").
- **C124. The Almanac is an arrangement.** Stefan: "open: should not open the almanac unless they write open:alm. almanac is an arrangement." So `alm:` always goes to the Almanac's own screen, the welcome page included, and only `open:alm` (or `open:almanac`) puts the Almanac beside what is on screen. `library:` stays the same as `open:library` (C95). Welcome step 4 becomes `open:alm`, so the Almanac opens beside the card as v9 draws it (to confirm with Stefan). **Refined the same day by C125.**
- **C125. What is on screen is one editable space.** Stefan: "when i think of arrangements I view it as a editable space. so alm: would add the arrangement to the existing setup. thus, alm: would still open as intended, just as sym: or any of the other commands to open specific arrangements that include more than one board", and, asked whether `alm:` brings the Almanac and the Collection and whether that holds everywhere: "yes to both everywhere unless the user edits the almanac arrangement". So nothing switches screens. `alm:` brings the Almanac and the Collection beside what is here (or whatever the person has made the Almanac arrangement, once arrangements can be edited and kept, stage 14); `open:alm` opens the Almanac alone. `sym:` brings the last room, `tour:` the welcome card and its steps, `lab:` the Canvas and Blocks when the Lab is built. Supersedes C102. See Part 9.
- **C126. A narrow room puts the conversation first, and boards can be stretched.** Stefan: "if the user chooses to have a small room space then the priority should be on the conversation, yes", and on the suggestions (stretchable edges between boards now, with a command for the keyboard; no dragging boards to new places; ready-made shapes with stage 14): "i'm good with leans". See Part 9.
- **C127.** Not ruled yet; built as suggested (a docket gets a row once it holds a second branch).
- **The security notes (Part 10).** On the points that disagree with the repo: the V2 framing came from "the goal ... to open the app and create a community library"; on the vault, "whichever is most secure"; on in-browser models, "let's not relax the security policy"; on Brave and arXiv, "yep, that's correct"; on servers, "we don't have servers, that's correct" ("seems claude chat had some older context").
  - **S1. The vault: not now.** Piece 5 builds the key panel through the key module as planned. The vault is its own scope review with stage 7 or 15, and there the most secure design wins.
  - **S2. No outside code for now, kept open for later** ("perhaps no outside code for now, but keep open for future use"). The community library is the aim: for now community blocks come by pull request and ship in the catalogue after review. Running other people's code inside Parliament stays closed; if it opens later, it is in a sandboxed frame on another origin, after a scope review.
  - **S3. No in-browser models.** The strict policy stays. The names filter and the injection check run only through a local model (Ollama), and are offered only when one is connected; the filter for fixed formats (emails, phone numbers) is plain code and offered to everyone.
  - **S4. Lock Parliament: its own stage after stage 9,** shown before it changes stored data.
  - **S5. A corrected copy of the notes goes into `docs/spec/`** as `security-privacy-decisions.md`.
- **C116. Keep as built:** a reply that broke off or stalled spills too. **C117.** The focus ring at half its weight and tone.
- **R25 approved, with a condition** ("yes ... and let's ensure the prompt bar still retains those features before retiring"). Today's composer, the input box drawn by `input-render.jsx`, is retired only when both hold: today's chat page is replaced by the room in the shell, and the bar in prompt mode carries what the composer holds today: web search, voice input and file attach (R24's "features of input"). Until then it stays exactly as it is. In the shell the room already draws without it.
- **C137. `erase:` as suggested** ("Go on with stage 6, piece 4: erase:, as C137 suggests"): numbers only, a plan by its number with every chat in it, markings kept unless `all`, collections keeping a card. Built in piece 4; see Part 11.
- **R32 approved, the rest of it.** The three silent calls were replaced under C62; the three provider methods they called (`generateTitle`, `generateSummary`, `generateTags`) move to `src/deprecated/`, unused.

**22 October 2026, at the stage 6 checkpoint:**

- **A19, looked at again: keep.** Keywords and quotes are rows on Records only when filtered for or found by a search; they are always cards in the Collection.
- **R1 to R5, R7 to R9, R11 and R12 approved** (the blueprint section and overlay, the Study, `/chats`, the homepage's Chats, stats, scratchpad and Library sections, its top bar, homepage room files, the old styles). They move to `src/deprecated/` with their routes unhooked, nothing deleted, when `/` shows the new screens, as R15 is; the old styles go file by file.
- **R13 approved:** "Pin for reference" is renamed so it says it makes a quote; what it does and the stored quotes stay.
- **R27 approved:** the backup dot and banner go with the old homepage; Records' one line replaces them.
- **The new stored fields of stage 6 are approved:** `model` and `usage` on replies, `recordsCols` in the space, saved searches, `archived` and `tagsMine` on every kind, `pinned` and `tags` on quotes, `erasedFrom`, a collection's `order` and items of kind chat, plan and marking, and a note's `quotes` and `summary`.
- **R6, reopened (C20): "let's make favorite a tag."** Ruled the same day: yes, as C147 suggests ("agree with lean on favorites"). The homepage's favourites list is retired with the homepage; the heart stays and keeps a tagged quote.

**22 October 2026, after stage 7, piece 1:**

- **C153: yes.** Cost marks compare with Haiku 4.5's price, kept after Haiku 4.5 is retired.
- **C155: update.** Sonnet 5.5 is the default for whoever has not chosen a model. A model chosen in Settings stays as chosen.
- **C154: yes.** The key check, the title request and `summarize:` go to Haiku 5.5.
- **C149: yes.** `by:` chooses who answers.
- **C147 (c): the conversion runs once on its own** ("once on its own is fine"), after the dry run on Stefan's backups found nothing to convert.
- **Drafting Desk's review uses the default model** ("drafting desk can be default model"), not a fixed Sonnet 4.6, and goes to that model's provider.

**22 October 2026, at the stage 7 checkpoint:**

- **C166 (b): replies follow the language chosen, by default, and one choice does it all.** Stefan: "if a user selects Swedish as a language, shouldn't the model match? ... I think then reply should be on by default ... I just want to ensure once language has been set it's holistic and that the user does not need to select language in multiple places." Kept as built: until `reply:` is set, replies follow the interface's language. **For stage 9:** `language:` sets the interface, the replies and the Wikipedia edition at once; choosing a language with it ends a separate reply choice, so replies follow the new language, and its Enter line says so. `reply:` stays for replies in a language other than the page's, and `reply:off` for none. The verb `reply:` was not objected to; kept.
- **C167 (f): the privacy filter is off by default** ("ok"), the Enter line offering it when a prompt holds something it would swap.
- **C167 (d): Ollama's cloud models stay out** ("ok"). Asked why, whether for privacy, whether later, and how they differ from a hosted model such as the provider's: see C167 (d), answered.
- **C170: build the vault in stage 15** ("ok"), as suggested. Asked whether it is the most secure route: within a site with no servers, yes for keys; see C170, answered.
- **R22 and R23 approved** ("ok"): Collaboration mode's window and block, and its persona editor, move to `src/deprecated/` when today's chat page is replaced by the room in the shell (as R25), nothing deleted. **A13: personas stay as frameworks of yours, switched off.**
- **C163 (e), C161 and C162: yes** ("ok"). C163 (e) is built now: the Enter line says when a chat is longer than a model on this computer is likely to read. C161 waits for a key to try it with. C162 is a feature of its own, later.
- **The entries built as suggested are confirmed** ("ok"): C118 to C123, C127 to C130, C132 to C136, C138 to C146, C148, C150 to C152, and C156 to C169.
- **Mistral, tried by Stefan:** "while the mistral key seemed to work with the animation, i never received a reply. no error came up either." See C171.
- "good to go to next after these": stage 8 follows.

**23 October 2026, at the stage 8 checkpoint:**

- **C175 (a): any number of rooms.** Stefan: "the screen can open more than one room. the user can open any number of rooms." So `open:201b` opens the branch in a room of its own beside what is here, as slider v9 draws it ("its own card"), and the space holds as many rooms as the person opens. Today the space holds one room, and the room's parts read the one open chat; the work is planned as stage 8, piece 7, with the change to the space as kept on this device shown first.
- **R26 approved** ("ok"): the branch panel and Cmd/Ctrl+Shift+B move to `src/deprecated/` when today's chat page is replaced by the room in the shell (as R22 and R25), nothing deleted. Until then today's chat page keeps them.
- **The new optional fields are approved** ("ok"): `from` and `group` (C172), `summary` (C175), `included` (C176) on a message, and `again:` changing `group` on stored prompts (C177 (b)).
- **C176 (a), the command's name:** Stefan asked for more context; given at the checkpoint. Then: "include: is fine". **`include:` kept.**
- **C172 to C179, built as suggested:** listed at the checkpoint, each point in a line. Stefan: "5. C172. yes." Read as confirming the list, C172 to C179.
- "all good for build piece 7": piece 7, any number of rooms, goes ahead, with the change to the space kept on this device as shown.

**23 October 2026, at the stage 9 checkpoint:** Stefan: "approve all six as recommended."

- **R10 approved:** the older `.apb` and JSON export buttons go. `.parliament` only; reading old files stays for good (`restore:` reads `.apb` and JSON). Carried out with R37.
- **R28 approved:** the settings that do nothing go (automatic compression, the theme switch, session usage figures, the budget alert, summary depth, the context warning). The new Settings board never showed them; their stored values stay. Carried out with R37.
- **R37 approved (new):** the old Settings page at `/settings`, which duplicated the Settings board and still asked for no typed word before deleting everything, moves to `src/deprecated/`, nothing deleted. `/settings` opens the Settings board. Checked first that everything on it is on the board, or is R10 or R28 (C186).
- **The new settings are approved:** `newChatRoom` (C181 (i)) and `interfaceLanguage` (C184 (d)), both carried by backups; and the backup reminder's choice, stored by the old page and never read before, is read (C182 (e)).
- **Example words inside commands are translated:** the verbs and the command's form stay English in every language; the quoted words stand for the person's own text, so they are translated (`name:"Tornugglor"`). Japanese and Chinese brought in line (C184).
- **Window layouts on a merge:** "Add it to what is here" keeps this device's layouts; only a replace brings the file's (C182 (d)), kept.

**23 October 2026, on the Lock Parliament design (Part 15):** Stefan: "1. ok with lean. 2. ok. … 3. ok. 4. ok. 5. ok … 6. ok".

- **C187 to C192 ruled as suggested:** built in four pieces; each tab and each reload unlocks for itself; sealed and readable as listed; a passphrase of at least 12 characters and an hour's idle lock by default; passkeys an extra way in, tested at setup; the change to stored data approved as shown.
- **Stefan asked:** with one tab unlocked, what happens to a board that was in a window when its tab locked; should the window close? *Answered:* yes. A tab locks by reloading to the unlock screen, and a tab that reloads already closes every window it popped out (Shell.jsx, on `pagehide`), so no window goes on showing your words after its tab locks. After unlocking, those boards are back on the page in that tab, as after any reload today; `pop:` opens one in a window again. A window always belongs to the tab that opened it: another tab, locked or not, never draws it. Opening the windows again by themselves after an unlock is not proposed: a browser lets a page open a window only from a click, and an unlock by passkey may not count as one.

**23 October 2026, at the Lock Parliament checkpoint:** Stefan: "let's continue. ill do test of passkey later along with test of language". C193 to C195 kept as built. Trying a real passkey, and the four languages, is Stefan's, later; the stage stays open for what those tries find.

**23 October 2026, on the Plan board (C198 (i)):**
- **A step left empty is skipped** when its run comes (piece 3). "skip is fine."
- **Names edited on the board come later,** "as long as it's added later": with stage 11's editing.
- **Removing a step is wanted now.** Stefan: "people are more used to saying delete … i think delete is a stronger word", like "plan" for "docket".

**23 October 2026, one word for removing (C199):** Stefan: "Yes: delete: for everything, a second Enter for anything undo can't bring back, erase: and drop: point to delete:, × marks on steps and never-run branches, delete: alone points to the Settings button, no wipe:."
- **`delete:` is the word for removing anything.** This replaces the ruling of 15 October (`delete:` pointed to `erase:`, "one word stays destructive") and the bar decisions' `drop:` (7 October). `erase:` and `drop:` now answer "That verb is now delete:" and write it in.
- **A second Enter for anything undo cannot bring back:** a chat, a branch that has run, a plan with chats, a note, a keyword, a quote. The Enter line names each; the first Enter arms it, the second deletes. What has not been sent (a planned step, a branch that has never run, a plan with no chat) goes on one Enter, and `undo:` brings it back.
- **× marks** on a step not yet started and on a branch that has never run delete it at once. An exception to the Lab's rule that a click which removes waits for Enter (L7, C38): nothing has been sent, and `undo:` brings it back.
- **`delete:` alone** (or `delete:everything`) points to Delete everything, the button in Settings, and Enter opens Settings there. **No `wipe:` command:** Delete everything stays a button, never a command (C73, 11 October).

**23 October 2026, on C200 and C201:** C200 (j) kept as suggested ("Keep the C200 suggestions for the open points"). C201 (h): Stefan: "1. ok. 2. ok. 3. ok."
- **The slider's waiting tab** for a branch not yet sent comes with piece 5.
- **`by:wikipedia then sonnet`** sends one after another from the bar: each `then` "if nothing is found" after a source and "if it fails" after a model, changed in the picker.
- **`include:` with one after another** comes with piece 5.

**24 October 2026, at the stage 10 checkpoint:** Stefan: "i'm good with lean. let's leave test to later when i have a moment."
- **C197 to C203 kept as built.**
- **The new optional stored fields approved:** on a step, `id`, `prompt`, `addedAt`, `model`, `room` (only where it overrides), `condition`, `ended` (stopped, failed, stalled, left, unmet) and `group`; on a message a run sends, `step`; runs past the first; a branch with no chat until it runs; the setting `runWarn`. No new store, no version change.
- **The open points, as suggested:** the sample backup's rooms get the messages and input blocks (the sample file only, C202 (h) 1); each provider's spending-limits page is looked up, read only, and linked from Settings (C203 (d) 1); the step list's settings come with the Lab (C202 (h) 2); R38 approved (the four unused Enter-line messages go).
- **Trying it is Stefan's, later:** a two-branch run with his own key, one branch stopped mid-step, `undo:` stopping at the run; with the passkey and the four languages from before.

**24 October 2026, on stage 11's questions (C205):**
- **C58, ruled.** Stefan: "the user is meant to be able to edit the reply as well as their original prompt. i'm fine with tables and charts as whole blocks. we should allow editing for them later." So every word of a reply and of a prompt can be edited, as the editing spec has it. Tables and charts are whole blocks at first, struck or asked about as a unit; editing inside them comes later, and is now in the plan (stage 11, after its first pieces). The model's own bold, italics, code and links stay as they are shown; putting them on or taking them off yourself is not offered, as the spec has it ("Bold and italic shortcuts do nothing"), and the `/` menu still formats a line.
- **Direction from stage 11 on.** Stefan: "at the moment, i'm less concerned about the different rooms, and more so would like to ensure we have a solid room with in-line editing and all other features. other rooms can be added later as we get more time for them. however, push back on me. if we're already in a good position to release them as well, then let's go for it, but all rooms should have in-line editing. i imagine some of the former rooms will also merge." The direction is the editing spec's mockup, `parliament-inline-editing-v5.html` (branches with edits in place). See C207.
- **Asked:** what ProseMirror is needed for, and which prototypes need trying without an Android phone. Answered in C205 (h).
- **C209 (c): yes** (25 October). Stefan: "C209 (c): yes. Ctrl+Z undoes the last change with Parliament's own history, Ctrl+Y redoes, and the cards keep their undo." This replaces the editing spec's "The browser's ⌘Z is turned off in replies": the browser's own undo stays off, and Ctrl+Z (Cmd+Z) goes to Parliament's history, which understands struck words. Built in the spike the same day (C209 (e)).
- **The spike, on ProseMirror alone: yes.** Stefan: "Yes: fetch ProseMirror and build the stage 11 spike on it alone, with Writing Studio as the room. I'll do the input method and Narrator checks when it's ready." Then, on the risk: "i guess my one concern is what you've listed, that adding prosemirror can open up to potential vulnerabilities." Answered as it was fetched (pinned versions at least a month old, no install scripts, its code read for network and HTML use, paste taken as plain text, not in any ordinary build); see C208 (c).

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
- **The homepage Chats section loads the API key by a different setting than the rest of the app** (`settings.persistKey` against `settings.storageMode`, `chats-preview.jsx`). **Fixed 20 October (stage 4):** every key is now read by the gateway, by provider.
- **"Don't save" kept the key nowhere** (request-path audit 1a), so the chat said there was no key. **Fixed 20 October (stage 4):** the key module holds it for the tab, removes any saved copy, and moves the key when the choice changes.
- **In development, raising the version upgraded an open tab without the upgrade screen** (19 October). Saving the version change hot-reloaded the open dev tab, whose database code ran again and opened the database at version 6 straight away. It happened to the pane's dev copy of Stefan's second backup: the result checked out exactly as the dry run said (21 chats in 16 dockets, numbered together from 201 to 237, counter 238), and the backup file it came from is still on disk. On the live site nothing opens the database before the upgrade screen has cleared, and a new version always loads fresh, so the screen comes first. For a future version change in development: close the app's tabs first, or try it on the trial copy. The screen was then shown on a version 5 copy of the same backup in the trial database: a forced failure left it at version 5 and said why, and the real run upgraded it and opened the app.
- **A failed upgrade did not roll back** (found 19 October by the first automated database test). `idb` does not wait for an async upgrade function, so when the version 6 data step threw, the browser kept the half-made version 6: the new lists, and no numbers or dockets. Fixed the same day in `schema.js`: the upgrade abandons its own transaction on any failure, and the test checks that version 5 is left exactly as it was. The version 4 and 5 steps have the same shape; they ran long ago on every install, so they are left alone.
- **Opening a Secretarybird document writes it back** (found testing the upgraded copy, 16 October). Today's editor rewrites a document when it is opened, with no edit: a new date and an empty `suggestionStates`, and an empty document gains a blank paragraph. Nothing is lost (checked paragraph by paragraph on Stefan's data), and the live site does the same (one of his documents is dated minutes before his backup). Two consequences: a document's date says when it was last opened, and a restore comparing records would see an opened document as changed, so "identical items are skipped" would miss it. Stage 1 stopped the same habit for chats with no document; the rest belongs with the write path and restore (stage 2).
- **Wikipedia ranks a question by all its words** (found 20 October, stage 4 piece 4). "What is a barn owl?" answered from the page "American barn owl" rather than "Barn owl"; "Who wrote Hamlet?" found "Hamlet". The prompt goes to Wikipedia's search as typed, so words like "what is" and "who wrote" weigh in. Not changed: what is sent should match what is shown, and trimming the person's words would need its own rule. To look at with the sources in stage 7 (for example, a search that prefers a title match, or saying on the Enter line that the question goes as a search). **Built 22 October as C168:** a leading question phrase is left out of an English search, said on the Enter line first.
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
- All from 6 April: `974d659` (in the private archive; the space bar hijacked in comment and chat inputs), `50ecd25` (in the private archive; revision suggestions missing in scanned chats), `c2ed12a` (in the private archive; the update banner for the service worker moved to the app level).
- **Suggestion:** bring `c2ed12a` (in the private archive) onto this branch, since a new version, a security fix included, is never offered to an open tab today. Leave the two Secretarybird fixes until the editing engine is decided.

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

Found while building the parser and the verb registry (stage 3: `src/commands/parse.js`, `verbs.js`, `registry.js`). Every verb in the documents was listed, newest wins, rulings over documents. These are the points the documents leave open (C95 to C107 and C110; C108, C109 and C111 to C113 are Stefan's own changes). Each is built as suggested, so a ruling either confirms it or changes one entry in `verbs.js`.

**C95. Board names as verbs.**
- The bar inventory (7 and 9 October, the newest) lists `alm:`, `lab:`, `sym:` and `library:` as current. The welcome steps teach `alm:` and `library:`.
- The arrangements spec (§4, 28 September) proposed that `alm:`, `sym:` and `library:` become shortcuts for `open:` or go, and that `lab:` stays. P3 (ruled) lets every board open by name: `open:library`.
- The editing spec and the branch slider draw short titles on the board strip (Sym:, Col:, Ref:, Alm:, Lib:, Dkt:), and `focus:sym col` takes them as words. The branch slider also writes `lib:` and `dkt:201` as if they were verbs.
- The arrangements spec and Lab v7 also have `settings:` and `home:` / `home:set`. What `sym:` goes to is open (arrangements §10).
- **Suggestion:** keep `alm:`, `lab:`, `library:` and `sym:` as verbs, each the same as `open:` for its board. `sym:` goes back to the last room. The short titles are words that `focus:` takes, not verbs. `settings:` and `home:` wait for their stages; `open:settings` works meanwhile.
- **Ruled 20 October: yes, keep the shortcuts** ("i'm good with lean, let's keep shortcuts"). Built this way.

**C96. No ranges.** The arrangements spec says in prose that removal took "ranges", but no document gives a syntax, `erase:` takes explicit numbers only (C39), and `run:` refuses ranges. **Suggestion:** no ranges anywhere for now; several numbers go with commas (`add:207, 216`). `201-205` reads as a word, and the Enter line says what the verb takes. **Ruled 20 October: confirmed as built.**

**C97. Second words for one act.** The bar inventory lists `reset:` (`refresh:`) and `from:` (`source:`). Its decisions keep one word per act, and `dup:` has no alias (C60). `help:` with a colon appears in Docket v12, Almanac v30 and the settings spec; C60 and stage 3 use `?` and `help`. **Suggestion:** `refresh:` and `source:` answer "That verb is now `reset:`" (or `from:`) and write it in. `help:` is read as well as `?` and `help`, since it can only ever mean help. **Ruled 20 October: confirmed as built.**

**C98. The bar's old words after C43.** `bar:pop` and `bar:dock` (settings spec §7, Almanac §4, Docket v12), `bar:foot` (dropped for `bottom`), `pop:center` (the hexagon, bar reference 9 October) and `pop:back command` (welcome §5) are in no ruling. **Suggestion:** `bar:pop` answers "use `pop:command`", `bar:foot` answers "use `bar:bottom`", `bar:hide` and `bar:show` answer with `focus:` and `calm:`. `bar:dock` and `pop:center` are not kept: `bar:center` places the bar, and `pop:back command` brings a popped bar back. **Ruled 20 October: confirmed as built.**

**C99. What may share a line.** No document says whether one line can hold several commands. Almanac v30 writes a filter with a minus to leave things out (`-tag:Research`). **Suggestion:** filters share a line (`type:chat -tag:essay`) and every other command runs alone; the Enter line says "One command at a time. Only filters share a line". The minus works on the filters that pick by kind or name (`type:` `room:` `tag:` `model:` `from:` `in:` `has:`), not on `cost:`, `since:`, `until:` or `sort:`.
- **Ruled 20 October: commands combine** ("i like the ability to combine commands yes, that adds power to the command bar"). Filters combining is built. Whether other commands may share a line too, and with what limits, is put to Stefan the same day; until then the registry lets filters share a line and nothing else.
- **Ruled 20 October, second answer: any commands may share a line, with the limits suggested** ("ok to let limits suggested, let's make a note to revisit this afterward once I can test out live"):
  - They run left to right, and the Enter line lists each before Enter.
  - If one fails, the rest do not run, and the Enter line says where it stopped.
  - `undo:` takes back the whole line in one step.
  - A command that sends something to a provider or source (`run:`, `summarize:` and the others marked as spending) stands alone, so its Enter line can name who receives it and what it costs; so does `erase:`, so it is plain what goes for good.
  - A verb that keeps the rest of the line as text (`tell:`, `note:`) comes last, since what follows it is its text.
  - **To revisit once Stefan can try it live** (stage 3's flag, then the welcome page): whether combining feels right, and whether the limits are the right ones.

**C100. What counts as a line shaped like a key.** The settings spec (§6): the history never stores a line containing `sk-` or "a run of 28+ key-like characters", and such a line is refused before Enter. Read literally, `sk-` anywhere catches `risk-analysis` and `task-list`, and any long run catches hyphenated tags and dates. **Built:** `sk-` at the start of a word, or a run of 28 or more letters, digits, hyphens and underscores that mixes capitals, small letters and digits, or holds six or more digits with only small letters and no hyphen. Tags and dates pass; keys are caught. A 40-character commit hash in a command is caught too, which is the safe side. Checked only in command mode: what a prompt may contain is stage 4's question. **Suggestion:** keep as built. **Ruled 20 October: confirmed as built.**

**C101. What the history of commands keeps.** The plan: commands only, never a prompt, a search or a line shaped like a key, and "the history never stores content". Two points it leaves open:
- `note:` and `tell:` carry writing (a note for people, a note for the model). Kept, it would be content in the history. **Built:** a line holding either is not kept. Names in quotes (`name:"Q2 evidence"`, `room:"Code Lab"`) are kept, since they are part of the command and worth recalling.
- How much is kept. **Built:** the last 500 lines, oldest dropped first, and a line run twice in a row kept once. Kept on this device only and never in a backup, as the version 6 list was made.
- **Suggestion:** keep as built.
- **Ruled 20 October: confirmed as built.**

**The boards registry and the arrangement** (20 October; `src/shell/boards.js`, `src/shell/arrangement.js`, `src/lib/arrangements.js`). The rulings settle that an arrangement includes popped windows, that every board opens by name, and that arrangements are kept as data from the start (P7); the mockups carry the behaviour and disagree in places. Built from Almanac v30 and Lab v7 where they agree; these are the points where nothing decides:

**C102. Each arrangement keeps its own state.** No document says whether there is one arrangement per device or one per shipped arrangement. **Built:** one each, kept on this device: the Almanac, the Lab, Settings, the docket, the welcome page, and each room its own. Leaving the Lab and coming back finds it as it was, and `reset:` has a default to return to. **Suggestion:** keep as built. **Ruled 20 October: keep as built.** **Superseded 21 October by C125:** there is one space on this device, and the shipped arrangements are the sets of boards that `alm:`, `sym:`, `tour:` and `lab:` bring into it. `reset:` returns the space to the Almanac and the Collection. Arrangements kept under the old keys stay in the database, unread; nothing is deleted.

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
- **Ruled 20 October: yes, with those three details.**
- **Built 20 October** with the chat store (stage 3). Leaving a chat in today's screens stops its reply, unless the setting is on; the reply is marked and the notice shows once at the top of the page landed on, naming the chat by number. A stopped reply's record carries `stopReason: 'left'`, a new optional field on messages, which backups carry and the restore check accepts; older records and older backups are unaffected. The setting `finishRepliesOnLeave` is off by default, travels in backups, and has its switch under Usage & Spending in today's Settings. Docket runs do not exist yet; when they do, they are not covered.

**C110. Which Wikipedia addresses the site may reach.** Wikipedia ships as the first source (stage 4), so its address joins the connection policy, which held only Anthropic. Put to Stefan: every language edition (`https://*.wikipedia.org`), so answers come from the Wikipedia in the person's language, or English only for now. **Ruled 20 October: every language edition** (Stefan asked whether it slows anything; it does not, since the policy is a rule the browser checks and nothing is fetched until a prompt goes to Wikipedia).

**C111. The bar's motion is slower.** **Ruled 20 October by Stefan:** "the animation for the search and command bar is too fast, we need to slow it down a bit". Slowed by half again: a mode's fill wipes in over 420ms (was 280), pills, glyphs and the Enter line fade over 240ms (was 160), the field folds to its circle over 540ms (was 360), the chevron rolls into the moon over 690ms (was 460). The bar decisions asked that frequent motion stay under 400ms; the wipe and the fold now go past that, by Stefan's word. Easy to tune: the tokens and `src/chrome/motion.js` hold every value, and a test keeps them together.

**C112. Folding matches unfolding, and the chevron travels as it becomes the moon.** **Ruled 20 October by Stefan:** "the speed to open the bar is good, but the speed to close the bar is still too fast. the bar close should be the same as open and the moon transition, moving from the chevron on the left to the center and transitioning into the moon as it does so". Found: a style that set the folded field's flex basis snapped it shut, so only unfolding animated. Now both take 540ms. In command mode the chevron leaves the place of the typed `>` on the left, travels to the centre of the circle and becomes the moon over the same 540ms, and goes back as the field opens. This replaces the bar reference's moon, which rolled in place after the slide had landed.

**C113. A more deliberate chevron.** **Ruled 20 October by Stefan:** "can we be a bit more deliberate with the chevron animation, want to make sure ppl notice it, and not just a moon appearing". Folding in command mode now goes: the chevron appears where the `>` was (120ms) and holds (160ms); it travels to the centre (540ms), still a chevron for the first part of the way; it becomes the moon from 300ms into the travel, finishing just after the circle lands (540ms), growing slightly as it does. Opening runs back at once. Timings in the tokens and `src/chrome/motion.js`, checked by a test.

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

## Part 8. Sending (added 21 October 2026)

Found while building stage 4, pieces 4 and 5 (a room in the shell; sending by conversation).

**C114. The fallback when a network holds streamed replies.** The plan (stage 4) says a reply that stalls behind a proxy that holds streamed answers "falls back to a request without streaming". Some office and school networks hold a streamed reply until it has finished, or cut it off when it runs long. The rules it meets: Enter is the only confirmation, and the Enter line names every recipient and cost (plan, section 2, rules 1 and 2). By the time a stream looks stalled, the provider already has the request and is charging for it, so an automatic second request would spend again without a second Enter.
- **(a) Automatic:** after a stall, stop the stream and send the same prompt again without streaming. Seamless, but it can charge twice without asking.
- **(b) Offered:** after a stall (nothing at all for a set time, such as 30 seconds, when the provider otherwise sends a sign of life every few seconds), stop the stream, keep what arrived, and mark the reply cut off. The Enter line then offers "Enter sends it again without streaming, about N tokens, $X". Nothing goes without Enter.
- **(c) Remembered:** as (b), and when a reply on this device comes in all at once at the end (the sign of a network that holds streams), later sends on this device go without streaming, saying so on the Enter line. No extra request.
- **Suggestion:** (b) now, and (c) once there is a device on such a network to try it on.
- **Ruled 21 October: (b).** (c) waits until there is a device on such a network to try it on. **Built 21 October:** silence of 45 seconds counts as a stall (kept generous, since a stall leads to a second send); the reply keeps its place, marked; with nothing typed, the Enter line offers "Enter sends it again without streaming, about N tokens, $X to send".

**C115. What a model sees of an answer from a source.** A chat can now hold answers from Wikipedia (keyless prompts) followed by prompts to a model (once a key is added). Sent as they were, those answers went to the model as its own earlier replies: the model would take Wikipedia's words as things it had said.
- **First built:** an answer from a source went on the person's side, introduced by a line naming where it came from, so the model read it as quoted context.
- **The alternatives:** leave source answers out of what a model receives, or send them as before.
- **Ruled 21 October: they stay out unless the person acts on them** (see Rulings). Built so (`src/stores/sendHistory.js`): the person's prompts go, the answers do not, and the Enter line says "2 answers from Wikipedia stay out". The introducing line stays in the provider abstraction (`base.js`) for when the person brings an answer in (stage 8).

**C116. The ink pot.** **Given by Stefan on 21 October** (`parliament-inkpot.svg` and `.js`, with C114): the quill's ink pot in the prompt field is a quiet sign of a reply arriving. Built (`src/chrome/inkpot.js`, the drawing in `Fills.jsx`, the motion in `chrome.css`), with the file's own timings:
- While a reply arrives in the room on screen, the ink drains and the quill re-dips, over and over. Wikipedia's answers count too.
- When the reply has arrived, the quill dips once and the pot refills.
- When it is stopped, the ink freezes and spills down the side, and stays spilt until the next prompt. **Built so that a reply that broke off (an error or a stall) spills too,** since it did not arrive whole; a reply cut at the length limit refills, since it arrived and its card says it was cut. One line in `chatStore.js` changes either. **Ruled 21 October: keep as built.**
- At rest the pot now shows full of ink, as the drawing has it; before, the quill's pot was an outline.
- Moving to another room puts the pot back to rest. With reduced motion the quill and the surface keep still and only the slow drain shows.
- In the shell nothing stops a reply by hand yet (`stop:` comes later), so for now the spill shows when a reply breaks off or stalls.

**C117. A quieter focus ring.** **Ruled 21 October by Stefan:** "if items are selected, right now there's a dark outline, can we make this more discreet please? by at least half of its current tone/style". The ring round the selected field, and the keyboard focus outline in the new chrome, were 2px of full ink (editing spec, token sheet). Now 1px at half the ink's strength (`--ch-focus` and `--ch-focus-ink` in `tokens.css`). It stays ink, not gold (C50), and at about 3.3:1 against the paper it still meets the 3:1 asked of a focus mark. Rooms keep their own focus styles.

**Also, for the record** (built in piece 5, no question):
- Hidden messages, and messages waiting out their 20 seconds before being deleted, are no longer sent (request-path audit, item 5). The Enter line says how many stay out. A delete now completes after its 20 seconds even if the chat was left; before, leaving cancelled it silently.
- Replies cut off by the length allowed for one reply, or broken off by an error, are stored as cut off (`stopReason` 'limit' or 'error', beside C109's 'left') and say so. This is a new value in an optional field: nothing existing changes, and older backups read as before.
- C62 is built: one request after a chat's first answer, named on the Enter line, with its switch ("Name a new chat after its first answer") under Usage & Spending in today's Settings, on by default as the three calls were (ruled 21 October). The three old calls stay in the provider, unused; whether to retire them goes on the retirement list.

## Part 9. The welcome page (added 21 October 2026)

Found while splitting stage 5 into pieces. The documents: `welcome-spec-decisions.md` (30 September, eight steps), `welcome-inline-editing-spec.md` and `parliament_welcome_v9.html` (6 October, ten steps; they win where they differ), and the rulings since (C43, C44, A1, A6, A7, A20, C71, C94). Each is built as suggested, so a ruling changes one entry.

**C118. Where the welcome page lives until the shell replaces today's screens.** The plan (stage 5) says `/` shows the welcome page to someone new and the Almanac to someone with work, and that links carry numbers (`/207`). But the new shell is behind a flag (`/shell`, in development and `VITE_PROTOTYPES=1` builds), and today's `/` is The Study. **Suggestion:** for now, `/shell` opens on the welcome page for someone who has made nothing, and on the Almanac otherwise; `tour:` brings the welcome page back. `/` and the numbered links change when the flag is switched on for everyone.

**C119. Step 4 under the Escape rule.** Welcome v9's step 4 reads "esc, then `alm:`", from when Escape stepped back one mode at a time. C44 (ruled 15 October) took Escape straight to the resting mode, which on the welcome page is search, and suggested rewording step 4. After a prompt the field rests in prompt, where typing `>` at the start switches to the command line. **Suggestion:** step 4 reads "See what you have made · `alm:`" like the others, a click writes `>alm:`, and in prompt mode the line by the field says "`>` for the command line".
- **Changed by C124 (21 October):** `alm:` now goes to the Almanac's own screen, which would leave the welcome page. Step 4 reads "See what you have made · `open:alm`", which opens the Almanac beside the card. Typing `alm:` instead also crosses it off.
- **Changed back by C125 (21 October):** `alm:` brings the Almanac and the Collection beside the card, so step 4 reads "See what you have made · `alm:`" again, as suggested here.

**C120. When step 8 crosses off.** W §4 and §12: on seeing the key panel, since not everyone has a key on day one; the step's wording says "Add". **Suggestion:** on seeing the panel, as the spec decided. Saving a key there plays the gold ignition.

**C121. Where the steps' progress is kept.** No document says. **Suggestion:** a setting kept on this device only (`welcomeSteps`), not in backups: which steps are done, whether the list is put away (`tour:off`) and whether the ending was reached. It is not a new list and changes no stored data.

**C122. The letter.** The plan leaves its final wording to Stefan. W §3 and v9 give the text; two points meet later rules:
- "each request goes straight to the provider you pick, to a model running on your own machine, or just Wikipedia": the privacy copy names no provider in a sentence (12 October). Wikipedia is a source, not a provider, and is what answers without a key, so naming it reads true. The sentence stays true for every provider as written.
- The signature's em dash is W §3's one deliberate exception to the copy rule.
- **Suggestion:** ship v9's letter as written, from the copy table, for Stefan to edit there. Built so.

**C123. The footer.** v9: "Created with Claude Code · Open source on GitHub · Looking for other builders", both links placeholders. C71: the repository goes public after the refactor, and until then the footer says "MIT licensed. Source published at launch". **Suggestion:** "Created with Claude Code · MIT licensed. Source published at launch · Looking for other builders", with no link on the second, and the third a mail link to support@parliament.ltd (the one address for now, 12 October) until a page for builders exists.

**C124. What `alm:` does: open the Almanac here, or go to its screen.** C95 (ruled 20 October) kept `alm:`, `lab:`, `library:` and `sym:` "each the same as `open:` for its board", with `sym:` going back to the last room. Stage 4 built `alm:` as a jump to the Almanac's own screen, as the session's design had it, and `sym:` as a jump to the last room's screen. Welcome v9 (W §5) has `alm:`, `library:` and `api:` open on the right of the welcome card, stacked, which is `open:`.
- **Built for now:** `library:` is the same as `open:library` everywhere (C95). On the welcome page `alm:` opens the Almanac on the right (both readings agree there). Elsewhere `alm:` still goes to the Almanac's screen, as stage 4 built it.
- **The question:** away from the welcome page, should `alm:` open the Almanac beside what you are looking at (C95 as worded; the Almanac then sits beside a room, for instance), or take you to the Almanac's own screen (as built)? If it opens beside, going back to the Almanac's screen needs another way, which comes with screens (`arrange:`, stage 14).
- **Suggestion:** `alm:` opens beside, as C95 says, everywhere; `sym:` keeps going to the last room's screen; until screens arrive, `reset:` on a room's screen and `alm:` together give the Almanac back. One entry in `preview.js` changes it.
- **Ruled 21 October:** the Almanac is an arrangement. `alm:` always goes to its screen; `open:alm` puts it beside. Built so; see Rulings.
- **Refined the same day by C125:** an arrangement is brought into one space, not gone to.

**C125. One editable space (ruled 21 October; see Rulings).** Built so:
- **The space.** One arrangement on this device (`space`), kept as it is left. With none kept yet, someone who has made nothing starts with the welcome card, anyone else with the Almanac and the Collection (C118). The shipped arrangements are now sets of boards (`arrangementBoards`).
- **Bringing.** `alm:` brings whichever of the Almanac and the Collection are missing, beside what is here, and points the bar at the Almanac; with both here it offers to point the bar there. `sym:` brings the last room, or shows the last room in the room already here, or opens an empty room whose first prompt starts its chat. `tour:` brings the welcome card back on the left with its steps. `library:` is `open:library` (C95). They share a line with the other layout commands (C99), since none of them leaves the screen.
- **Where boards land.** The welcome card on the left; a room just after it (or at the end without it); other boards stack in the last column, beside the card (W §5).
- **A prompt with no room** starts its chat in a room beside what is here, as the first prompt on the welcome page does (W §5).
- **Closing.** A room and the welcome card close like any board ("Enter closes this room", "Enter closes the welcome page. `tour:` brings it back"). The card closes with `close:` while the bar points at it; `close:welcome` and `close:` by a room's number come with the Almanac (stage 6). Closing a room deletes nothing; its chat is kept.
- **Not yet:** a room beside other boards keeps its own side panels, so in a narrow column its messages have too little room. Drawing a room narrow (the chat card of W §5) is stage 5 piece 2. **Done with C126.**

**C126. Widths, and a room in a narrow column (ruled 21 October; see Rulings).** With one space (C125), a room often sits beside other boards. A room's layout draws two side panels of 288px each, so in a narrow column the conversation between them had no width. No document gives boards a width of their own: W §5 gives fixed shares for the welcome page (card 27 to 34%, chat the rest, the stack on the right 31 to 40%), and the arrangements spec (§5) decides "no drag and drop", with clicks that only move things around the screen acting at once. Built so:
- **A narrow room shows the conversation.** Below about 940px of its own width (two panels and a conversation you can read), a room draws the narrow form its layout already has for a narrow window: the conversation, with the side panels behind the menu and panel buttons at its top. In the shell that top line leaves out its link to today's home. The room's files are unchanged.
- **Stretchable edges.** The gap between two columns is a handle. Dragging it shares the width of those two columns between them; a double click puts both back to their usual widths. The handle takes keyboard focus, and the arrow keys move it. A stretch only changes the screen, so it acts at once, like bringing a window back.
- **`width:`, the same from the bar.** `width:60%` gives the board the bar points at that share of the width, `width:library 30%` a named board, `width:even` puts every board back to its usual width. From 10% to 90%. The room and the welcome card are reached the first way until rooms are named by number (stage 6). `reset:` puts the widths back too.
- **Kept with the space.** The space's record gains `widths`, a share for each board: an ordinary board 1, a main board (a room, the Almanac, the docket, Settings, the Canvas) 2. A board keeps its share when it moves, and has it again when it comes back. A space kept without widths reads as before, with the usual shares; nothing else in the record changes and the database version stays.
- **Least widths.** Each column keeps a least width (the welcome card 260px, a room 300px, the others 180px, so four boards fit a window 1024px wide). When the boards do not fit, the space scrolls sideways rather than squeezing them. An edge shares the width of the two columns beside it, so when both are at their least widths it cannot widen either: closing or popping a board makes room.
- **The welcome card** turns to one column (steps, field, letter) by its own width, below 760px, rather than whenever another board is beside it.
- **Not built:** dragging a board to another place (the arrangements spec's "no drag and drop"; `move:` and `swap:` do it), and ready-made shapes, which come with saved arrangements and the screens map (`arrange:`, stage 14).
- **Suggestion, built so:** the verb `width:` with percentages and `even`. A ruling on the name changes one entry in `verbs.js`.

**C127. Which rows the thin Almanac shows, and what a click does.** Every chat starts a docket (C18), and the two take a number each, so a new chat is 204 in docket 203. Almanac v30 lists dockets and chats as rows of their own; no document says what happens to a docket of one branch.
- **Built:** a row for every numbered chat, note, term and quote; a docket gets a row once it holds more than one branch (until then it is its one chat), and archived dockets stay out. Pinned rows first, then the most recently active (v30). Columns are v30's (type, id, title, room, tags, created, last active), fewer as the board narrows, the id always shown (almanac spec §3).
- A click on a row (or Enter on it) writes `open:<number>` in the bar, and Enter opens it, so the bar stays the one actor (C125). `open:` on a chat shows it in the room here, or brings a room beside; on a docket, its first branch; on a note, term or quote it says that comes later and that `inspect:` shows it now. `inspect:<number>` shows one thing in detail under the bar, like v30's peek; Escape closes it.
- A term takes the highlight's pink (it is today's highlight, C57); a quote, which v30 does not colour, is ink.
- **Suggestion:** keep as built. A ruling on dockets changes one line in `almanacRows.js`.

**C128. The thin Library.** Lab v7 draws the Library with thumbnails, ticks, details in place and actions on rooms; stage 5 asks only for a read-only board.
- **Built:** one read layer (`lib/catalogue.js`) over the code's own manifests: block manifests, the layout registry, the room templates and the themes. The stores give only your rooms, the layouts still to come and resources (none are stored yet, so that shelf says so). Web search, voice input and file attach show as features of the input block, not as blocks (AB §2), so no block in the list names a provider. Homepage blocks and the homepage layout are left out.
- The board: shelves as italic words along the top (all, rooms, boards, layouts, blocks, themes, resources), which only change the view and so act at once; groups with counts; each item its name, what it is, and one line of facts. The one action is "open" on a board, which writes `open:<board>` in the bar. The boards listed are the six that ship prebuilt; their one-line descriptions are new copy, from v7's where it has them.
- Names and descriptions of blocks, layouts and themes are the manifests' English words until the plain-language pass (A6) takes them into the copy table. Thumbnails (`LayoutSilhouette`), ticks and details come with the Lab (stage 13).
- **Suggestion:** keep as built.

**C129. The key panel, and a key in a prompt.** Built as settings spec §6 and Settings v1 draw it, with these choices:
- **Who is listed:** each built provider that takes a key (Anthropic today), and one line naming the built sources that need none ("Wikipedia needs no key."). Mistral, OpenAlex's optional key and Ollama join with stage 7.
- **What the panel knows:** whether each has a key and its last four characters, read inside `src/net`; the panel never holds a key. The password field is read once, on Save, and cleared. It carries the attributes password managers use to leave a field alone.
- **Save checks first,** with one short request to the key's own provider, and the panel says so before Save is pressed. Nothing is kept unless the provider accepts it, and the panel tells apart a key that was not accepted, an account that may be out of credit, and a check that did not get through (the provider's check now says which). The key is then kept as Settings says: saved, or for this tab only.
- **The ignition** plays once per new key: a key different from the one kept before. Saving the same key again does not play it; with reduced motion it does not play at all.
- Step 8 crosses off on seeing the panel (C120). The panel links the provider's key page, with a line on keeping a key for Parliament alone with its own spending limit, and on revoking one that leaks (security notes §2).
- **A key in a prompt** (new): the bar already refused a command line shaped like a key (stage 3); now a prompt that holds one is refused before Enter too, since it would be sent to the model, or to a source as a search. A prompt is held to a narrower test than a command, so people can still ask about a commit hash or the word "sk-": refused are `sk-` with a key's worth of characters after it, and a long run mixing capitals, small letters and digits.
- **Suggestion:** keep as built.

**C130. The ending, `focus:`, the small-screen line and the storage notice** (stage 5, piece 6). Built as W §7, §12 and C94 say, with these choices:
- **The ending:** when the eighth step crosses off, the steps go, "to Parliament" fades in under "Welcome", and the letter gives way to "Now, let’s focus:", where `focus:` writes itself in the bar. The sentence is translated whole and split where the command goes, so a language can put it anywhere.
- **`focus:`, first form:** every board but the room closes, windows included; the bar docks under the chat, which centres at up to 820px (so the room shows its conversation, C126); the field turns to prompt mode. The Enter line names what closes. With no room in the space it takes the last chat; with no chat it says "p> starts a chat". **`focus:off`** brings the space back as it was, windows and the bar's place included. `reset:` also ends it. `focus:save` and `focus:sym col` come with stage 14.
- **Stored:** the space's record gains an optional `focus`, the columns, windows, bar and addressed board from before, so `focus:off` works after a reload. It is checked like the space when read back; a space without it reads as before. No version change.
- **The small-screen line** sits under "Welcome" on windows narrower than 760px or on touch-only screens: "built for a computer for now; the phone comes later" (W §12.4).
- **The storage notice (C94):** on the welcome page, when the browser has not agreed to keep the data and there is something to lose (a chat). It names no browser, says how to keep the data, and offers "ask the browser again" (asked from the click) and "back up in Settings", today's Settings until `backup:` (stage 9). Settings already shows the answer (C88).
- **The pseudo-language check:** in the accented test language, every word of the chrome on the welcome page, the Almanac, the Library, the key panel and the Enter lines comes from the copy table. What stays plain is right: provider names, from the list; the catalogue's names and descriptions, until C131; and "3 hours ago" in a test language the browser's date formatting does not know (real languages are written in their own words). In the right-to-left test language the page mirrors: "Welcome" lines up with the steps on the right, the mark beside it, the boards run right to left, and nothing scrolls sideways.
- **Suggestion:** keep as built.

**C131. The plain-language pass on names (A6).** A6 kept "Almanac" for now, with a pass over every name a newcomer meets before the welcome page ships. Nothing is renamed yet; these are the names on the page's path, with suggestions. A rename changes the copy table and, where a command uses the word, the command too, in one change.

| Name today | What it is | Suggestion |
|---|---|---|
| Almanac | Everything you have made, in one table, by number | Keep. It is distinctive, and the board says what it is in one line |
| Docket | A plan of prompts, run in branches | **Plan**, with `plan:` beside `docket:` for a while |
| Collection | Things set side by side to compare or ask about | Keep |
| Reflection | Reads a chat and its markings back to you | Keep |
| Library, Lab, Room | | Keep |
| Sym (the room on the board strip) | Short for Symposium, the old name for the conversation | **Room** on the strip. `sym:` stays as a short command |
| The other strip titles: Col, Ref, Alm, Lib, Dkt | Short titles, also the words `focus:` takes | Full names on the strip, which has the room; the short words still work in commands |
| Term | A word or phrase lit wherever it appears | **Keyword** |
| Quote | A passage kept beside the chat, never sent | Keep |
| collab | How the AI works with you: challenge, reasoning, pushback, alternatives, uncertainty | **Approach** as the word people read; the command waits for your choice |
| Catalogue names | Themes ("Parliament Default", "Cool Bright"), layouts ("Three-panel", "Canvas-centric"), blocks ("Context health", "Ripple analysis") | Into the copy table in sentence case ("Cool bright", "Three panels"), with the renames above, so they translate |

- **Ruled 21 October, in part.** "plan is fine"; "room is fine" (weighed against "chat": a chat is one conversation and a room can hold many, and "room" means a place elsewhere online); "if we're changing these words than we need to change the commands as well (e.g., plan:, room:)". Reflection, Library, Lab, Quote and Collection stay. Still open: Almanac ("what are some alternatives?"), term ("more context"), and collab ("Approach seems too vague and too similar to plan").
- **What the commands become:** docket → **Plan**: `plan:` brings the Plan board, `new:plan` makes one, Plan on the strip. `plan:` today only points to `layout:` (the Lab's early word for a layout), so that pointer goes. Sym → **Room**: `room:` brings the last room, or a room by name, Room on the strip. The old verbs (`alm:`, `sym:`, `collab:`) answer with the new word, and Enter writes it in; old board words in a command (`close:almanac`) no longer fit, and the Enter line gives the new example. Stored names (the `dockets` store, addresses) do not change; documents keep their words, with this ruling.
- **One collision:** `room:` is already a filter on the Almanac (`room:"Code Lab"`, what was made in a room), and a word may not narrow on one board and act on another (almanac spec §4). **Suggestion:** the filter folds into `in:`, which already shows what is in a collection: `in:"Code Lab"` reads the same for a room, and where a room and a collection share a name, the Enter line asks which.
- **Ruled 21 October, second round:** "in: works"; term becomes **Keyword** ("i like keyword"); the Almanac becomes **Records** ("i like records, i think it fits with parliament"). So `records:` brings the Records arrangement (Records and the Collection), `open:records` the board alone, Records on the strip; `type:keyword` in place of `type:term`. Still open: collab, where Stefan asks about "framework" ("conveys that the reply is being positioned a certain way").
- **Ruled 21 October, third round:** collab becomes **Framework** ("Use Framework for collab: framework:pushback"), over the shorter "Frame" suggested. **All renames made:** Records (`records:`, `open:records`), Plan (`plan:`, `new:plan`), Room (`room:`), Keyword (`type:keyword`), Framework (`framework:`), the room filter folded into `in:`, and full names on the board strip (Room, Collection, Reflection, Records, Library, Plan). The welcome steps read `records:` and `pop:records`. Inside the app and in stored data the boards and kinds keep their ids (almanac, docket, term), so nothing kept changes. The specs, the plan and CLAUDE.md keep the old words, read with this ruling. **The catalogue's words are in the copy table** (`blocks`, `layouts`, `themes` and their About groups, and `templatesAbout`), in sentence case and plain words, true to what each does today. Following the rulings, the Highlights block is **Keywords** (it lists what are now keywords) and the Collaboration mode block is **Frameworks**; the layouts read Three panels, Canvas in the middle, Document in the middle, One column and a sheet. A test fails if a block, layout, theme or template is added without its words. The manifests keep their English for the code.

**R15, put to Stefan.** Today's app sends a new visitor through a build wizard before the homepage (the "first-run gate"), and shows one-time tooltip tours on a few screens, each remembered with a `tourCompleted_*` setting. The welcome page and `tour:` replace both. **Suggestion:** retire them when `/` shows the welcome page (the shell's flag switched on for everyone): the files go to `src/deprecated/`, and backups keep reading the old settings, so every backup stays readable. **Ruled 21 October: approved** ("ok"), carried out when `/` shows the welcome page.

## Part 10. The security and privacy notes of 21 October (added 21 October 2026)

Stefan's notes from a planning conversation, `parliament-security-privacy.md` (not in the repo), checked against the specs, the rulings and the code. Most of it agrees or is already built; these are the points that do not.

**Contradicts the repo**
- **Components "in the same context as the app", tiers, a consent flow, "community components", Phase 1 and 3** (§0, §1.2, §2, §6.5, §7). These are the V2 design. `mode-workshop-architecture.md` was never in the repo. The rule now is that other people's code does not run inside Parliament (CLAUDE.md; plan rule 9, ruled 11 October), and if runtime blocks ever come they go in a sandboxed frame on another origin (plan-brief, security audit). §1.2's second prompt ("Allow it to drive a model call?") meets plan rule 1, "Enter is the only confirmation"; its aim already holds, since outside text can never run a command or steer a run.
- **The key vault on `keys.parliament.ltd`** (§2 step 1). It keeps the promise of no backend and of each key going only to its provider, but it meets four hard rules: the main site forbids frames (`frame-src 'none'`, `X-Frame-Options: DENY`); a host is added only with its provider or source; cross-window messages carry ids and signals, never content (the vault would carry prompts and replies); and the gateway and its network log would split across two sites. For it to help, the key panel of stage 5 piece 5 must live inside the vault: a password field on the main page can be read by any script there. It stops a key being copied, not misused through the vault.
- **In-browser models** (§1.5 Prompt Guard, §4.1 "Patterns + names"). They need `'wasm-unsafe-eval'` in the strict CSP and a host to fetch weights from, both ruled out in writing by the audit unless reviewed. Through Ollama, already on the list, they need neither.
- **"Brave, arXiv and others"** (§0). Only Wikipedia ships; Hacker News and OpenAlex come with stage 7. Brave is later (C28), and arXiv cannot be reached from a browser (C28).
- **§1.4 "Convert HTML to plain text".** Sources already return plain text only; the plan says never to use a source's HTML.

**Marked done in the notes, not in the repo**
- §6.1's wording ("Your data never touches Parliament's servers") and §6.3's advice on extensions were written into `parliament-v2-brief.md`, which was never in the repo (C81). The wording also implies there are servers; the letter says "no servers and no accounts", and `privacy-copy-draft.md` names sources and local models too.

**Corrections to the current state**
- There is no "session only" mode keeping the key in sessionStorage. "Don't save" holds it in this tab's memory and removes any saved copy (stage 4, audit T4). Only the stale `SECURITY.md` still describes session-only.
- Saved keys sit in their own database, not in settings; backups use an allowlist that never includes them.
- The service worker waits for a reload and the update notice (it does not take over by itself), though a hostile deploy still runs on the next load.
- No document has a training or retention table. Welcome §3 says the major APIs "do not train by default"; if Mistral's free tier trains, as the notes say, copy built on that line would be wrong.

**Already built or planned:** sources kept out of model sends (C115); `img-src 'self' data:`; remote images never loaded, shown as links (T8); no `dangerouslySetInnerHTML` anywhere; links to web and mail only, opened with no opener; nothing fetched that is not on the list; keys out of backups; the backup password stretched further at stage 9; the unencrypted-backup warning at stage 9; the host's IP logs in the privacy draft; release checksums and two-factor at stage 15.

**New work, and where it would sit**
- Showing a link's full address before it opens: today the tooltip shows the host only. The shared Markdown component; small, could go with stage 6.
- The source envelope (labelled blocks, JSON-wrapped, a system line, invisible characters stripped, a badge on injection phrases): stage 8, when an answer is brought into a prompt.
- Training labels per provider, the Mistral checklist, retention badges: stage 7, on provider rows only, since copy names no provider in a sentence.
- The privacy filter (§4.1, patterns only): stage 7 or 8, covering every request, the title request and the resend included, with the Enter line saying what was swapped out.
- Local-only rooms: stage 7 (Ollama) and stage 13 (room settings); a new field in room files is a stored-data change.
- Trusted Types, published hashes, downloadable builds, hardware keys, required review, tagged deploys: stage 15.
- Lock Parliament (§6.2): encrypting chats is a second database upgrade after the one ruled "one schema upgrade", a new backup and restore path, and it meets the Almanac's indexes and search, docket runs under an idle lock, and "Web Crypto only" (passkeys use WebAuthn). Its own stage after stage 9.
- A security review route (§6.6): the repository stays private until stage 15 (C71), which an NLnet review or published hashes would need open.

**Questions (S1 to S5)**
- **S1. The vault.** Decide before stage 5 piece 5 (the key panel). **Suggestion:** not now. Build piece 5 as planned through the key module, and take up the vault with stage 7 or 15 as its own scope review.
- **S2. The V2 framing.** **Suggestion:** the repo's rules stand: no other people's code, Enter the only confirmation. The notes are corrected to match.
- **S3. In-browser models.** **Suggestion:** none for now; the names filter and the classifier run through Ollama, with patterns in plain code.
- **S4. Lock Parliament.** **Suggestion:** its own stage after stage 9, shown before it changes stored data.
- **S5. The notes themselves.** **Suggestion:** a corrected copy goes into `docs/spec/` as `security-privacy-decisions.md`, so its approved parts are on record.
- **Ruled 21 October: all five as suggested,** with S2 kept open for a community library later and S3 offered only with a local model. See Rulings. The corrected notes are `security-privacy-decisions.md`.

## Part 11. Records and the Collection (added 21 October 2026)

Found while splitting stage 6 into pieces. Read with C131 (Records, plan, keyword, `in:`). The documents: the Almanac spec and Almanac v30 (filters, row verbs, export), collection board v3 and the editing spec (the Collection), and the rulings since (A16 to A19, A23, C39, C56, C57, C78 to C80, C99). Each is built as suggested, so a ruling changes one entry; a letter names a point within an entry ("C132 (d): …").

**C132. How search and filters read** (piece 1). v30 draws the behaviour; these are the points it leaves open or that meet later rules.
- **(a) Search** narrows the board the bar points at as you type (collection board v3): for now Records, the Collection with piece 6. Every word must appear, in any order; quotes keep a phrase together. It reads titles, summaries, tags, room names, the text of notes, keywords and quotes, and the words inside chats and documents. It sends nothing. Elsewhere the Enter line says search works on Records.
- **(b) Filters are commands** (search is only search, Almanac spec §1): typed after `>`, applied on Enter, kept until cleared. Commas mean "or", a minus leaves out, two filters of one kind on one line must both hold, and a filter typed later replaces the earlier one of its kind (v30). Bare words beside filters, which v30 reads as a search, stay a search typed in search mode.
- **(c) The filters in force** read as one line at the top of Records, with how many rows show of how many. A click on one removes it. v30 has the click but no command for it, and every marginalia has a command (editing spec), so `clear:tag` removes one kind, and `clear:filters` all of them and the search.
- **(d) Kept for the tab,** not across a reload; a saved search (piece 2) is how one is kept. Nothing stored changes.
- **(e) Dates** for `since:` and `until:`: 7d, 3w, 2m, 1y, today, yesterday, a month's English name (the last one past), a date written 2026-09-01, or a date with slashes read in the order the reader's language writes dates (v30 writes 09/10/26, month first, which is US English only). The Enter line spells out the day it understood, so a misreading shows before Enter.
- **(f) `in:`** takes a room or a collection by name (C131). Where a room and a collection share the name, the Enter line asks which, and `in:"Code Lab" room` or `in:"Code Lab" collection` answers. Favorites is the one collection until piece 6.
- **(g) `model:`** takes any part of a model's name, or a source's name (`model:wikipedia`), since what people ask is what answered. Replies did not record their model, so an older reply counts as from its chat's last model, as the dry run said.
- **(h) `cost:`** takes dollars (`>0.50`, `<1`, `0.18`) and works on chats and plans. A cost is worked out from tokens and the list of prices, never guessed (v30). From now on each reply keeps the model that answered and its tokens in and out: `model` and `usage` on the message, **new optional fields, shown at the checkpoint**, carried in backups. Chats with replies from before, or with a reply stopped part way, have no cost; `cost:` leaves them out and the Enter line says how many. The one request for a new chat's title (C62) is not counted yet: the provider code does not return its tokens.
- **(i) `has:`** takes note, keyword, quote or highlight, and shows what holds one; **`from:`** takes a chat (its notes, keywords and quotes), a plan (its chats and theirs), a branch (`201b`) or a run (`from:run 1`); **`sort:`** takes created, active, oldest or newest, and pinned rows lead whatever the order (v30).
- **Suggestion:** keep as built.

**C133. A19 against the thin Records as built (C127).** A19 (ruled 15 October, to be looked at again): keywords and quotes take numbers like edits do and are rows only when filtered for; keywords are still found by search. The thin Records of stage 5 (C127) shows every keyword and quote as a row. **Built in piece 1 as A19 rules:** the table shows chats, plans and notes; keywords and quotes show under `type:keyword` or `type:quote`, or when a search finds their words. `has:` and `from:` alone do not bring them. One line in `recordsFilter.js` changes it. A19 itself is put to Stefan at the stage's checkpoint, as planned.

**C134. When `undo:` comes.** The plan puts `undo:` in stage 10 ("covers plans and records and stops at execution"); the verb registry marks it stage 6; v30's Enter lines promise it for stage 6's verbs ("undo: brings it back"). **Suggestion:** `undo:` arrives with piece 3 for what stage 6 changes (pins, archive, tags, names, saved searches, columns, collections, notes), one step per command line (C99), kept for the tab. Stage 10 extends it to plans and stops it at a run. `erase:` stays outside it.

**C135. Where archived things go.** v30 hides an archived row and draws no way back. **Suggestion:** `in:archive` shows what is archived, and `archive:off 209` brings one back, the way `hold:off` lets an edit go. Archiving a chat archives nothing else; a plan's row follows its chats.

**C136. Who made each tag.** The plan: "pins and tags on every kind, and who made each tag". Stored now: `tags`, a list of words, and on chats `tagsBy: 'model'` for the whole list (the model's tagging call wrote every tag there is). v30 draws each tag with who made it. **Suggestion:** an added optional field, `tagsMine`, listing the tags the person added; `tags` stays a list of words, so the index and every backup read as before. Shown at the checkpoint before anything writes it.

**C137. What `erase:` takes and does** (C39, C73, C80; collection board v3).
- **(a)** One or more numbers with commas (`erase:207, 216`), never a range, a filter or a name. Each is listed on the Enter line with its title, which ends "undo cannot bring them back". It runs on a line of its own (C99).
- **(b)** A plan's number erases the plan and every chat in it, each named on the Enter line; a branch (`erase:201c`) erases that chat.
- **(c)** Markings: by default a chat's notes, keywords and quotes stay, as items of their own with their text, marked as from an erased chat (`erasedFrom`, a new optional field, shown first); `erase:207 all` takes them too (C80). The Enter line says which before Enter.
- **(d)** Collections keep a card for what was erased, with its text where it had any and a dashed rule (collection board v3); Favorites drops it, as today.
- **Suggestion:** as above.
- **Ruled 21 October: as suggested** ("Go on with stage 6, piece 4: erase:, as C137 suggests"). **Built so in piece 4,** with these details: a kept note, keyword or quote is detached (no chat or message of its own) and carries `erasedFrom`, the number its chat had, **a new optional field, shown at the checkpoint**; Records marks it "from 204, erased". A restore keeps such a marking rather than leaving it out for want of its chat, and checks it. Erasing is one transaction, refused while a reply is still arriving in a chat it names, and refused whole if anything named is gone already. A room that showed an erased chat is left empty. `undo:` stops at an erase. Today's delete, on today's screens, still takes everything, as before.

**C138. What an export holds.** v30 and collection board v3: `export:md` or `export:jsonl`, of numbers, everything (`records`), a collection, or the table as filtered, with sources footnoted. **Suggestion:** with no numbers, the collection when the bar points at it, else the rows as filtered. Each item gives its number, kind, title, room, dates and tags; a chat its messages (you, the model's name, or the source's name) and markings; a source's page, revision and licence as footnotes. Hidden messages stay out, and the Enter line says how many, as it does for a prompt. No settings, no keys, no attachments' contents (their names only). The file is for reading elsewhere and cannot be restored; its name holds numbers and a date, never a title.
- **Built so in piece 5,** with these details: each thing goes in once (a plan over its chats, a chat with its notes, keywords and quotes, a marking alone only when its chat is not there); `export:` alone takes the table as it is shown, until the Collection can be the target (piece 6); the Markdown opens with a line saying it cannot be brought back in, and numbers its footnotes across the file; the JSONL uses the words people use for kinds (chat, plan, note, keyword, quote); a name of numbers when four or fewer (`parliament-204-206-2026-10-21.md`), else the first and how many more. Suggestion: keep as built.

**C139. One collection at a time, kept as it is made.** v30 has an unsaved working collection that `name:` keeps; collection board v3 has `new:collection`; the Lab saves on every command (A10). **Suggestion:** the Collection board shows one collection. `new:collection` makes an empty one, kept at once with no name (the copy table words it); `add:`, `rm:`, `heading:` and `name:` change the one shown; `open:"Q2 evidence"` shows another; `forget:` removes one (its items stay). Collections take no number (C17). Favorites is the first, built in. A collection holds a chat (live: everything marked in it) or one marking or message (collection board v3), and an item counts as the row it belongs to for `in:`.

**C140. Saved searches** (piece 2). Almanac v30 draws them in a rail beside the table, each a name and a description; a click opens one, and it "recomputes every time you open it". Built so:
- **(a) Where they show.** The space has no rail board, so they are one line at the top of Records, above the filters in force, shown only when one exists. A click shows one at once, since it only changes the view; `open:"Water tower"` does the same from the bar. The one on screen is marked while the view is still its own.
- **(b) What is kept.** The search words and the filters as commands (`type:chat since:7d`), not the rows they found, so a saved search is worked out again when opened: `since:7d` is the last seven days on the day it is opened. Kept on this device in the version 6 list `savedSearches`, never in a backup, as that list was made. Each record holds an id, the name, the search, the line of filters and two dates: **shown at the checkpoint.**
- **(c)** `save:"…"` with a name already saved replaces it, and the Enter line says so first. A search shaped like a key is refused, as the bar refuses one. Nothing searched or filtered: nothing to save.
- **(d)** A saved search whose filter no longer reads (a room renamed, a number erased) says which before Enter and does not open; `forget:` removes it.
- **(e)** `open:` takes a saved search's name (A1 lets `open:` take a name). Chats, rooms and collections by name join with their pieces; where names meet, the Enter line will ask which.
- **(f)** `forget:` removes a saved search now; collections (piece 6) and arrangements (stage 14) join it. Until `undo:` (piece 3) the Enter line does not offer one.
- **Suggestion:** keep as built.

**C141. Columns** (piece 2). v30: `cols:-room +created`, the title and the id always shown, `reset:` restoring the columns. Built so:
- **(a)** `cols:` with names takes columns away or brings them back; bare `cols:` says which show. Names: type, id, title, room, tags, created, active (v30's, with `date` for created and `last` for active). The title and the number stay (almanac spec §3).
- **(b)** Kept with the space, as an optional field (`recordsCols`) beside the widths (C126): on this device, read back with the same checks, and `reset:` puts them back. A space kept without it reads as before; **shown at the checkpoint.**
- **(c)** The board's width still decides what fits: a narrow Records drops columns as it does now, and a hidden column stays hidden at every width. v30's dragging of columns into another order is not built.
- **Suggestion:** keep as built.

**C143. The row verbs: the small choices** (piece 3). Almanac v30 has `pin:`, `archive:`, `copy:`, `rename:` (now `name:`), `tagadd:`, `retag:` and `untag:`; these are the points it leaves open. Built so:
- **(a) `pin:`** pins what it names; when every one named is pinned already, it unpins them (v30 decides by the first one named). A branch (`201b`) pins its chat, and a plan of one branch its chat, which stands for it (C127).
- **(b) Nothing here is activity.** Pinning, archiving, tagging and naming leave a row's "last active" time, so it keeps its place.
- **(c) `archive:`** works row by row: archiving a plan hides its row, not its chats. `archive:off 209` brings one back; `in:archive` shows only what is archived (C135); a room or collection called Archive is reached with `in:"Archive" room`.
- **(d) `name:207 "…"`** names a chat or a plan, up to 120 characters. A note, keyword or quote is its own words and takes no name (v30). A plan follows its first chat's name until it is named itself, as today.
- **(e) Tags** keep the case they were typed in, up to 40 characters, and match in any case, so Essay and essay are one tag. `tagadd:` and `untag:` take numbers until the Collection can be their target (piece 6); `untag:essay` alone takes the tag off everything, the Enter line saying how many. `retag:` renames a tag everywhere, merging into one that exists, and the tag becomes yours. A later tagging by the model keeps your tags.
- **(f) `copy:`** puts one thing on the clipboard as Markdown: a chat with who said what, sources as footnotes (page, revision, licence) and its notes, keywords and quotes; a plan as its chats in order; a note, keyword or quote as its words and where it came from. Hidden messages are known only while their chat is open in this tab; those are left out, and the line says how many.
- **(g) Several row commands share a line** (C99), and `undo:` takes the line back whole; mixing them with other kinds of command waits.
- **(h) New optional fields, shown at the checkpoint:** `archived` on chats, notes, keywords and quotes (plans have it); `tagsMine` (C136) on every kind; `pinned` and `tags` on quotes, which the upgrade gave the other kinds. Backups carry them; a restore checks them.
- **Suggestion:** keep as built.

**C144. The Collection, as built** (piece 6; C139 suggested, not yet ruled). Collection board v3 draws it; the editing spec adds tabs. These are the points they leave open:
- **(a) Which collection shows.** The space keeps it, as it keeps the chat a room shows. With none chosen, the one changed last; with none at all, the board says `new:collection` makes one. The collections are one line at the top, as saved searches are on Records; a click shows one, as `open:"…"` does.
- **(b) What a collection holds.** A chat or a plan, live: every note, keyword and quote in it, now and later (v3: "picking a chat holds all of it"). One note, keyword or quote by number (`add:218`). Messages, as Favorites holds them. Other collections and saved searches as sources (v3's picker) wait.
- **(c) Cards.** Notes, keywords, quotes (today's "Pin for reference" among them, A23), highlights once there are any, and messages. A card for something erased keeps its text where it has one, with a dashed rule (C137 (d)).
- **(d) Tabs** (A16, with C131's words): All, Highlights, Keywords, Quotes, Notes, and Messages for what Favorites holds (A16 names no tab for them), each shown only when it holds something; Edits, Asks and Suggestions join with stage 11. `type:keyword` on the Collection picks its tab.
- **(e) Orders:** your order, by source, by date, from marginalia or `sort:yours`, `sort:source`, `sort:newest`, `sort:oldest` on the Collection. Your order keeps headings: `heading:"Causes" before 215` places one, `move:218 after 214` moves a card or a heading's place. v3's dragging is not built (the arrangements spec: no drag and drop).
- **(f) The source picker** in the head lists plans and chats with numbered boxes; a click writes `add:204` or `rm:204` into the bar, since `add:` and `rm:` wait for Enter. The numbers set the order of the groups in "by source".
- **(g) `rm:`** takes out what was added. A card that is there because its chat is held comes out with that chat; the Enter line says so. `clear:` alone empties the collection on screen, only while the bar points at the Collection; what it held stays where it is.
- **(h) Search follows the board** the bar points at: Records and the Collection each keep their own, and the field shows the one of the board it points at. This changes C132 (a), where Records' search stayed in the field when the bar moved.
- **(i) `name:`** on the Collection names it; a name another collection has is refused. `open:` and `forget:` take a collection's name; where a saved search has the same name, `open:"X" collection` or `open:"X" search` says which.
- **(j) Stored:** a collection gains `order` (its cards and headings in your order) and items of kind chat, plan and marking, each with its number, beside today's messages. **Shown at the checkpoint.**
- **(k)** Selecting cards and the four acts (note, tag, summarize, prompt), and finding a card's passage, come with piece 7.
- **Suggestion:** keep as built.

**C145. The four acts, quoting and finding** (piece 7). Collection board v3 draws them; the editing spec adds "every marginalia has a command"; C57 and C78 named the three markings (a highlight is a passage marked where it sits, a term is today's highlight, a quote is a passage kept beside the chat that the model never sees). These are the points they leave open:
- **(a) Quoting a passage.** Select words in a chat: the menu over the selection gains Quote beside the term colours. A quote keeps the words and where they sit, takes the next number, and is kept beside its own chat with the quotes "Pin for reference" makes (A23), so nothing new is stored. It is never sent to a model unless the person acts on it. Marking a passage as a highlight, and a note on a passage, wait for the editing work (stage 11); a note on a message stays as it is.
- **(b) Marked in the chat.** A quoted passage is underlined in ink where it sits. A click on it finds its card (c).
- **(c) Finding, both ways.** `jump:218` scrolls to 218 on the board the bar points at: its card on the Collection, its passage in a room (a quote's words, a note's message, a keyword's first place). A card's number is a link that finds its passage, bringing its chat into the room if it is not there. A marked passage finds its card on the Collection; if the collection shown does not hold it, the Enter line says so and how to add it. Either way the spot flashes. On Records `jump:` scrolls to the row.
- **(d) Selecting cards.** A box on each card; the selection lasts for the tab and is not stored. The foot of the board names what is selected, by kind and number, and offers the four acts. Each act writes its command into the bar with the numbers, and Enter does it, so each can be typed without selecting anything.
- **(e) Note.** `note:214, 217 "Thread for the essay"` writes a note in the collection on screen, in your words, with 214 and 217 quoted beneath it, each pointing back. `note:"Check the dates"` writes one quoting nothing. It takes the next number and has no chat (v3: a note written here has no parent chat). It is never sent. **Stored:** a note with no chat, and `quotes`, the numbers it quotes. **Shown at the checkpoint.**
- **(f) Tag.** The Tag act writes `tagadd:"" 214, 217` with the caret between the quotes.
- **(g) Summarize.** On the Collection, `summarize:214, 217` writes a summary note: dated, never changed afterwards (C79, suggested). One call, to the small model that titles chats (C62), named on the Enter line with its cost before Enter; if a quote is among them, the line says it goes this once. On Records, `summarize:` (rewriting a row's summary line, C79) and `rewrite:` wait. **Stored:** a note with `summary`: the numbers, the date, the model. **Shown at the checkpoint.**
- **(h) Prompt.** With cards selected on the Collection, the Prompt act turns the bar to prompt mode, and a prompt starts a new chat about them: their words go first, in full, then what was typed. The Enter line names the room, the cost, and any quote going along. "From a summary" (a second call first) waits.
- **(i) `compare:218 231`** sets two notes, keywords or quotes side by side under the bar, as `inspect:` shows one, with what changed word by word. No model call. Comparing chats or runs waits.
- **Suggestion:** keep as built.

**C146. The rest of stage 6** (piece 8). The plan names three things; these are the points the documents leave open:
- **(a) The backup reminder on Records** (C94, R27). One line of marginalia at the top of Records, in ink, shown when `backupReminder.js` says it is due: after some work and thirty days without a backup, or from the first chat and after a day where the browser has not agreed to keep the data, in plainer words there. It offers "back up in Settings" (today's Settings, until `backup:` in stage 9) and "not now", which waits as long as the reminder does. The old banner stays on the old homepage until R27 is ruled. The line's command comes with `backup:`.
- **(b) A link's full address** (security notes §1.3). A link in a reply shows its whole address before it opens: on hover, and on keyboard focus. The address is shown as the browser reads it, so a look-alike name shows in its `xn--` form, and long ones wrap rather than being cut. On a touch screen the first tap shows the address and a second opens it.
- **(c) `close:` and `width:` by number** (C125). `close:204` and `width:204 40%` act on the room showing chat 204 (or plan 204's chat); if no room here shows it, the Enter line says so and how to show it. `close:welcome` closes the welcome card from wherever the bar points; `tour:` brings it back.
- **Suggestion:** keep as built.

**C147. Favourites as a tag** (R6 reopened, 22 October: "let's make favorite a tag, I think we discussed that before"). The history: on 23 September C20 folded favourites into pins, with "users can tag a pin `favorite` themselves"; on 11 October C20 was reopened and favourites became the built-in Favorites collection, which is what the version 6 upgrade made of them and what the heart fills today. What a tag changes:
- **(a) Anything with a number can carry it now:** `tagadd:favorite 204` on a chat, plan, note, keyword or quote, and `tag:favorite` on Records lists them. Built with one addition: a `tag:` filter counts as filtering for the keywords and quotes it names, so they are rows then (A19), and `tag:favorite` lists every favourite.
- **(b) A single message has no number,** and only numbered things carry tags, so the heart has to make one: a quote of the whole message, kept beside its chat and never sent, tagged `favorite`. A second click on the heart takes the tag off (and the quote, if the heart made it and nothing else holds it).
- **(c) The favourites you have** (messages in the Favorites collection) each become such a quote, tagged `favorite`. That changes stored data, so it is shown as a dry run first. The old `favorites` records stay, readable by old backups.
- **(d) The Favorites collection** stops being built in: an ordinary collection that can be renamed or forgotten, with `save:"Favorites"` over `tag:favorite` offered in its place. Nothing is deleted.
- **(e) The tag's word** is `favorite` in every language, so it matches across devices; it is shown as written, like any tag.
- **Suggestion:** as above.
- **Ruled 22 October: yes** ("agree with lean on favorites"). **Built so,** with one change to (b): a second click takes the tag off and the quote stays, since the heart cannot tell a quote it made from one the person kept on purpose; `erase:` removes it. (c) is built (`lib/favoriteTags.js`) and has not run: its dry run is shown on Stefan's data first, and it runs on his yes. Until then the heart still shows the old favourites and a click takes one back as before.
- **Dry run, 22 October,** on the three backups of Stefan's on this machine (16 and 17 October, one of them the 21-chat backup the version 6 dry run used): none holds a favourite or a quote, so the conversion would change nothing in them. Favourites made since then would show only in a newer backup.

**C134, as built (piece 3).** `undo:` takes back the last command line, whole: what it changed in rows, saved searches, the filters on Records and the space (boards, windows, the bar, columns). Kept for the tab, the last 50 lines. If something it changed has changed since (in another tab, say), undo stops there and says so rather than writing over it. Not taken back: a room's name (C40), what was sent or copied, and `erase:` (piece 4).

**C142. Drawing only the rows on screen** (piece 2). Built: Records draws the rows in view and about a screen either side; the rest are blank space of the height they will take, measured once drawn, so the scroll bar stays true. Screen readers are told the whole count and each row's place. One trade: Tab moves through the rows that are drawn, and scrolling draws more. **Suggestion:** keep as built.

## Part 12. Providers, sources and frameworks (added 22 October 2026)

Found while splitting stage 7 into pieces. Read with C131 (Records, Framework). The documents: the plan's stage 7, the languages, providers and networks notes (LPN, C81), the security notes (§1 to §4), branch slider v9 (the picker), the settings spec (§8, keys and models), the editing spec (`collab:`, now `framework:`, and `helper:`), and the rulings since (C15, C27, C28, C33, C34, A8, A13, A14, C82 to C89, S1 to S3). Each is built as suggested, so a ruling changes one entry.

**C148. Two groups in the picker, or three.** The plan's stage 7 (12 October) says "the picker in two groups (A14)", as branch slider v9 draws it: Models, with the local model among them marked free, and Sources, no tokens. A14 was ruled on 15 October as three groups: Models; On your machine; Sources, no tokens. A ruling beats the plan. **Built:** three groups, as ruled, and the plan's line corrected. A ruling for two moves the local models into Models, one entry in the picker.

**C149. A command for choosing who answers.** Every marginalia has a command (editing spec), and "answered by" in the prompt field opens the picker, but no document gives its command. The nearby words are taken: `model:` narrows Records (C132 (g)), and a word may not narrow on one board and act on another (almanac spec §4); `ask:` would read as the editing spec's asks; `set:default haiku` (settings spec) changes the default for new chats, not this one.
- **Suggestion:** `by:`, read as "answered by": `by:sonnet`, `by:wikipedia`, `by:hackernews`. It takes any part of a model's or a source's name, as `model:` does; where several match, the Enter line lists them. Bare `by:` says who answers here. A click on a row of the picker does the same at once, since it sends nothing and can be put back.
- Several names (`by:sonnet, wikipedia`) would send one prompt to several, which is branches (stage 8). Until then the Enter line says so, and the picker's boxes take one tick at a time.
- **Ruled 22 October: yes.**

**C150. Where the choice is kept.** A chat already keeps a `model` (since PR-16a: the model most recently used in it), and new chats take Settings' default. But the room in the shell sends every prompt with Settings' default whatever the chat says, and to Wikipedia whenever there is no key.
- `model` cannot carry the choice: every chat is made with Settings' model in it, even one Wikipedia answers because there is no key, so it would read as chosen when it was not.
- **Suggestion:** the choice belongs to the chat, in a new optional field, `answerer`: an id from the list, a model's (`claude-haiku-4-5`) or a source's (`wikipedia`), written only by `by:` or a click in the picker. A prompt goes to the chat's choice; a chat with none takes the default as today (Settings' model with a key, Wikipedia without), so nothing changes for a chat until someone chooses. In a room with no chat yet, the choice is held for the chat its next prompt starts. `model` keeps its meaning (the model last used). **The new field is shown at the checkpoint;** backups carry it and a restore checks it.
- If the chosen model needs a key that is not there, the Enter line says so and nothing goes. A prompt is never sent to someone other than the one the line names.
- `undo:` takes a choice back, as it does a pin.

**C151. Old model ids, and a model the list no longer offers.** Chats, replies and Settings hold short ids from before (`claude-sonnet`, `claude-opus`, `claude-haiku`), each standing for one model when it was written (Sonnet 4.6, Opus 4.6, Haiku 4.5). The plan: "a stored default model is checked against the provider's list".
- **Suggestion:** each old id is read as the model it stood for, never as the newest of its family, since a newer model is priced differently; nothing is rewritten. The picker lists the current lineup; older models stay in the list only to name and price what they answered.
- A chat or a default naming a model the list no longer offers is named on the Enter line with what to do (`by:` to choose another), and nothing is changed or sent in its place.

**C152. Auto.** The settings spec (§8) makes "Auto" the default: lookups go to a source at no cost, everything else to a named model. The almanac spec (§8) has the reference answer "already there when you stop typing", which breaks plan rule 1 (nothing is looked up while typing); Auto at Enter would still need a guess at what a prompt is.
- **Suggestion:** no Auto in this stage. Who answers is chosen; with no choice, the default answers as today. Auto can come later as a row of the picker, named on the Enter line before anything goes.

**C153. Cost marks, and which Haiku they compare with (C34).** The settings spec marks each model by its price per token beside Haiku's (Opus ×15, Sonnet ×3, Haiku 4.5 ×1). Prices checked on the provider's pricing page on 22 October, in US dollars per million tokens:

| Model | In / out | Mark beside Haiku 4.5 |
|---|---|---|
| Fable 5.1 | 10 / 50 | ×10 |
| Opus 5.5 | 4 / 20 | ×4 |
| Sonnet 5.5 | 2 / 10 | ×2 |
| Haiku 5.5 | 0.10 / 0.50; 0.50 / 2.50 for a prompt over 100,000 tokens | ×0.1 |
| Haiku 4.5, older | 1 / 5 | ×1 |

- The newest Haiku costs a tenth of Haiku 4.5, so beside it every other mark would grow tenfold (Fable ×100).
- **Suggestion, built so:** marks keep comparing with Haiku 4.5's price, the yardstick every document draws, and keep it after Haiku 4.5 is retired, so marks do not move when the lineup does. The picker says so once, at its foot. Input and output prices are added into one mark, since the two stand in another ratio at other providers. Below ×1, one figure (×0.1).
- Haiku 5.5's higher price for a long prompt is used by the Enter line, and by the costs on Records for each reply by its own input.
- **Found and corrected:** the old list priced Haiku 4.5 at $0.25 and $1.25 (it is $1 and $5) and Opus 4.6 and 4.7 at $15 and $75 (they are $5 and $25), so the costs Records showed for replies from those models since stage 6 were wrong.
- Not reflected: the provider's US-only processing (1.1×), cached input, and that its models from 4.7 on count about 30% more tokens for the same text, so the local estimate before Enter stays rough.
- **Ruled 22 October: yes,** Haiku 4.5's price is the yardstick.

**C154. The small requests move to Haiku 5.5.** A key's check, a new chat's one request for its title, summary and tags (C62), and `summarize:` went to Haiku 4.5, which the provider keeps "not sooner than October 15, 2026": it can be retired at any time, and those requests would then fail. **Built:** they go to Haiku 5.5, the newest and cheapest (a tenth of the price). The Enter line names their cost as before. A ruling for another model changes one line (`LIGHT_MODEL` in `providers/anthropic.js`). **Ruled 22 October: yes.**

**C155. The default for new chats.** Settings' default model is read as stored. With none stored, the code's default is `claude-sonnet`, which C151 reads as Sonnet 4.6 ($3 in, $15 out); Sonnet 5.5 is newer and costs less ($2, $10). Changing the code's default would move anyone who never chose, Stefan perhaps included, without asking. **Suggestion:** leave it until ruled. Either choose Sonnet 5.5 (today's Settings, or `by:sonnet` for one chat), or make Sonnet 5.5 the default for whoever has not chosen.
- **Ruled 22 October: update.** The code's default is Sonnet 5.5 (`claude-sonnet-5-5`), so whoever never chose a model gets it. Settings are stored only when changed, so a model someone chose in Settings stays theirs.

**C156. Hacker News and OpenAlex, as lists of results** (piece 2). The almanac spec (§8) gives sources three shapes (an article, a list of results, a record) and declarative manifests; LPN §6 and §8 give the language marks and the refusal from a network. Checked on 22 October (the research notes behind C153): both send the headers a browser needs; Hacker News is searched through Algolia, which allows 10,000 requests an hour from one address; OpenAlex allows about 100 searches a day without a key, shared by everyone on the same network, and its data is CC0. Built so:
- **(a) A list, up to five results,** each its title, a link, a date, a few facts and perhaps a passage: a Hacker News story with its points, comments and a link to its discussion; an OpenAlex work with its year, first three authors and its abstract. Hacker News's own text for a post is HTML and is never used (plan rule: no source HTML). A result with no title is left out.
- **(b) Still no code in a manifest.** Where a part is not at one path, the manifest names one of four readers the runner knows: the first path with a value, a link made from a template (the discussion's address), text rebuilt from an index of words (OpenAlex keeps abstracts so), and a few names from a list (authors). A reader the runner does not know reads nothing.
- **(c) Stored:** the chat keeps the list as plain text (titles, dates, passages, links: the source's words only, no words of the interface, C86) and, in the answer's note, `shape: 'list'` and `items`, each with short text, web links only and up to ten facts. **New optional fields in a message's source note, shown at the checkpoint;** backups carry them and a restore checks them.
- **(d) Drawn** as a numbered list in the chat: each title a link that shows its whole address before it opens (C146 (b)), then the date, facts and passage as text.
- **(e) In the picker:** "English only" beside Hacker News, "mostly English" beside OpenAlex (its records keep the language a work was written in), nothing beside Wikipedia, which answers in the reader's language; OpenAlex's row and its Enter line state the daily allowance.
- **(f) When a source turns the request away:** a 403 says the source is not answering from this network and that a VPN can cause this (LPN §8: never suggest a VPN as a way round, only turning one off for that source); a 429 says too many requests from this network for now.
- **(g) Not built:** OpenAlex's optional key (a tenfold allowance). It would go in the key panel and be sent in a header, never in an address. **Suggestion:** leave it out unless a hundred searches a day proves short.
- No licence is shown for Hacker News: none is published for its data (looked for on 22 October).
- **Suggestion:** keep as built.

**C157. The network log, grouped by host** (piece 2). The plan: "grouped by host, each named by who called it, with no query strings"; the privacy copy draft (item 17) words the card. Two records meet: the page's own log (every request it makes, host and path, never the query) and the gateway's (what made each request: a prompt, a key's check, the title request). Built so:
- Each host once, the busiest first: how many requests, how many failed, the last one's time, the provider or source it belongs to by the list (every Wikipedia language edition counts as Wikipedia), and what made its requests. A host on no list says so, and the page's own host is marked as this page.
- Where: the card in today's Settings until Settings v1 (stage 9), with the draft's wording (items 16 and 17) in place of the old claims, on the card and in "Check it yourself" above it, that only one provider's address should appear. What made a request is still the code's English word ("prompt", "check key") until the log moves to the new chrome and the copy table.
- **Suggestion:** keep as built.

**C158. The welcome letter's sentence about where requests go.** The letter (C122) says each request goes "to the provider you pick, to a model running on your own machine, or just Wikipedia". With Hacker News and OpenAlex shipped, that is no longer the whole list, and every claim must stay true (W §3). **Built:** the privacy copy draft's wording, "or to a public source such as Wikipedia". The letter is Stefan's to edit in the copy table.

**C159. Mistral, as built** (piece 3). LPN §7.1, C82, the security notes §3 and the settings spec §8. Prices checked on Mistral's pricing page on 22 October. Built so:
- **(a) The provider** (`providers/mistral.js`) behind the same interface as Anthropic's: streaming, the whole reply without streaming (C114), the same stall after 45 seconds of silence, a key check that lists the key's models and spends nothing, and why a reply stopped in the words the chat already reads. Only a message's words go; images and files attached in another provider's form are left out (the bar attaches nothing yet).
- **(b) The models,** fixed versions and never a `-latest` alias: Mistral Medium 3.5 ($1.50 / $7.50 per million tokens, ×2), Mistral Large 4 ($1.36 / $4.18, ×0.9, a **preview**), GLM 5.3 ($1.40 / $4.40, ×1, **made by Z.ai**), Mistral Large 3 ($0.50 / $1.50, ×0.3), Mistral Small 4 ($0.15 / $0.60, ×0.1). The picker says who made a model where that is not its provider, and marks a preview, as does the Enter line. **The API ids are as the docs give them, to confirm with a key:** a wrong one shows as an error on the first prompt to that model.
- **(c) Three addresses,** all in the connection policy: global, EU and US. **Where prompts are processed** is chosen in Mistral's row of the key panel (`api:mistral`): anywhere at list price, or in the EU or the US at 1.1 times the price, with "Your key, account and billing may still be handled elsewhere" (LPN: "processed in the EU" is true, "your data stays in the EU" is not). Kept as a setting of the person's, `mistralRegion`, which backups carry. **New setting, shown at the checkpoint.** The Enter line says when a prompt is processed in a region and costs more. Never chosen from the network address.
- **(d) Keys and sending by provider.** The shell knows which providers have a key; a prompt goes to the provider of the model that answers, with that provider's key, and so do continuing a reply and the whole-reply resend. A chat's one request for its title, summary and tags (C62) goes to the provider that answered, to its small model (Mistral Small 4 for Mistral), and the Enter line prices that. Settings' default model can still only be one of Anthropic's until Settings v1 (stage 9); Mistral is chosen per chat with `by:` or the picker.
- **(e) Not built here:** `summarize:` stays with Anthropic's small model; the training label, retention mark and Mistral's checklist come with piece 7; no language tags, since Mistral publishes no list of first-tier languages (looked for on 22 October).
- **Stefan's test first:** `api:mistral` and save a key; `by:mistral small` (or a click in the picker); one prompt. If it streams, the rest stands. If it fails, it comes back here before more is built on it.
- **Suggestion:** keep as built.

**C160. Naming Parliament to Wikipedia.** Asked by Stefan on 22 October: Wikimedia asks automated clients to identify themselves. Its User-Agent policy (now on foundation.wikimedia.org, edited March 2026) encourages, not requires, browser tools to send an `Api-User-Agent` header (a browser forbids pages to set `User-Agent`), as name, version and contact. Wikipedia's API accepts the header from any page (its answer to a browser's preflight lists it, checked 22 October). Since March 2026 Wikimedia rate-limits by how a client is identified (about 200 requests a minute for a browser without an account).
- **Built:** every Wikipedia lookup sends `Api-User-Agent: Parliament/0.5 (https://parliament.ltd; support@parliament.ltd)`. It names the app, the same for everyone, never the person. A manifest may ask for this one header and no other.
- **The cost:** a header of our own makes the browser ask Wikipedia first whether it may send it (one more short request before each lookup, carrying nothing of the person's). Links in answers are ordinary links and are not affected.
- **Suggestion:** keep. A ruling to drop it removes one line from `wikipedia.json`.

**C161. Anthropic's API version of 21 October.** Asked by Stefan on 22 October. Checked on the provider's migration guide that day: the new version (`2026-10-21`) refuses `temperature`, `top_p` and `top_k`, and two kinds of block, but only for requests that send that version. Parliament sends `2023-06-01`, which carries on with no end date published, and sends none of those fields: **not affected, nothing changed.** The new SDKs send the key as `Authorization: Bearer` instead of `x-api-key`; the API takes either, and calls `x-api-key` a "legacy fallback, still supported". Two notes for later:
- **Suggestion:** move to `Authorization: Bearer` and the new version together, once there is a key to try it with, so nothing changes untested.
- A key made without a workspace now needs an `anthropic-workspace-id` header, or every request is refused. Someone bringing such a key would see "The key was refused". **Suggestion:** say so in the key panel's guide to making a key (make it in a workspace), rather than ask for the id.

**C162. Two local models, for piece 4** (asked by Stefan on 22 October; facts from the providers' pages and Ollama's library that day).
- **Nemotron 3.5** (NVIDIA), chat models under the OpenMDW 1.1 licence, which allows commercial use and redistribution. The one to run on a computer is Lightning 30B-A3B (`nemotron-3.5-lightning` in Ollama, 19 to 25 GB to download). Its languages: English, Spanish, French, German, Italian and Japanese; not Swedish or Finnish. Bolt 74B-A9B needs about 25 GB; a small "E4B" (about 4 GB) is due on 23 October and is not in Ollama yet.
- **EmbeddingGemma 2** (Google), Apache 2.0: not a chat model but an embedding model (it turns text into numbers for finding things by meaning). The text-only build is about 300 MB (`embeddinggemma-2:270m`), over 100 languages (which ones is not published), 768 numbers per text.
- **Suggestion:** Parliament lists whatever models Ollama has on the machine (piece 4), so either works without being named in the code. Neither fits as a default to recommend: Lightning is large and misses Swedish and Finnish; the small Nemotron is not out. EmbeddingGemma 2 is not for answering prompts; it could later let Records find things by meaning on this machine, a new feature to put to Stefan on its own. The names filter and injection check (S3) need a small chat model; the E4B is worth a look once Ollama has it.

**C163. Models on this computer, through Ollama** (piece 4). C33, LPN §7.2 and §7.5, the research notes of 22 October. Ollama is not installed here, so piece 4 was tried against a stand-in that answers as Ollama does; Stefan tries it with Ollama itself. Built so:
- **(a) One address,** this computer on Ollama's own port (`http://localhost:11434`), the only one the connection policy allows. Ollama on another port cannot be reached, since the policy is fixed when the site is built.
- **(b) Looked for only when asked (C33).** `api:ollama` (or a click on "not checked" in the picker) shows Ollama's row in the key panel with why Parliament looks and that the browser may then ask whether this site may reach apps on the device; only the next click looks. If the browser has been told no, the row says how to allow it again, naming no browser (C94). It also says to put Parliament's own address in `OLLAMA_ORIGINS`, never `*`. Once a check has found Ollama, it is looked for again quietly on each start. **New setting `localChecked`, kept on this device only and never in a backup: shown at the checkpoint.**
- **(c) The models are whatever Ollama has,** named as Ollama names them and marked free. A chat keeps its choice as `ollama:` and the name (`answerer` now also takes a `/`, which some Ollama names hold). Before a check has listed it this time, a chosen local model is not sent to, and the Enter line says `api:ollama` checks.
- **(d) Sending:** Ollama's chat API, streamed; the Enter line says the prompt stays on this computer and costs nothing. A thinking model's thinking is not shown or kept. A stall is three minutes of silence, since a model can take a while to load. A chat's title request goes to the model that answered, free.
- **(e) Open, built at each model's default for now:**
  - **Thinking.** All three models Stefan named think before they answer, by default. That is slower, and nothing shows while it happens. **Suggestion:** leave it on; if it feels slow, a way to turn it off per model (Ollama's `think: false`), named on the Enter line.
  - **How much of a chat a local model reads.** Ollama gives a model about 4,000 tokens of a chat on a computer with under 24 GB of graphics memory, and silently drops the start of a longer one. **Suggestion:** say on the Enter line when a chat is longer than that for a local model, rather than ask Ollama for more (which takes memory the computer may not have).
- **(f) Stefan's three models** (Ollama's library, 22 October; all Apache 2.0, which allows commercial use and redistribution; which languages each covers well is not published):
  - **Bonsai 2** (Prism ML, weights of only three values, built on Qwen 3.5): `bonsai-2` is the 9B, 3.2 GB to download; `bonsai-2:27b` is 8.3 GB and still fits a 16 GB laptop. Thinks hard by default. It seems to need Ollama 0.40.6 or later (the version that added its file type; current is 0.40.8).
  - **Gemma 4** (Google): `gemma4` is the E4B, 6.6 to 9.5 GB; `gemma4:e2b` is smaller, `gemma4:12b` about 8 GB. Text and images. Context 128K to 256K.
  - **Qwen 3.5** (Alibaba): `qwen3.5` is the 9B, about 6.6 GB; 0.8B, 2B and 4B are smaller. Thinks by default.
- **Suggestion:** keep as built, with (e) to look at once Stefan has tried a model.

- **Tried with Ollama itself, 22 October** (Stefan's machine, Ollama 0.40.8, `bonsai-2:9b`): Ollama allowed the dev server's address with nothing set; the check found the model; one prompt ("In one sentence, what is a barn owl?") answered after about 11 minutes, with 1,178 tokens out, nearly all thinking, on the processor with a 4,096-token context. Nothing showed while it thought. This bears on (e): **suggestion, thinking off by default for models on this computer,** with a way to turn it on, both named on the Enter line.

**C164. Frameworks, as built** (piece 5). The editing spec's `collab:` (renamed by C131), C67, A13, and the spec's open question on scope. Built so:
- **(a) The five built in,** with the spec's names (Challenge artifacts, Show reasoning, Push back on me, Offer alternatives, Flag uncertainty) and glosses. Their instructions to the model are new, following the glosses (C67: "challenge" now asks the model to question what it is given, not to critique its own work). They are in English, as instructions to a model, not words of the interface.
- **(b) They belong to a chat** (the spec's open question; its mockup sets them for the whole chat), in the order chosen, until turned off: a new optional field on the chat, `frameworks`, its ids in order. In a room with no chat yet they are held for the chat the next prompt starts. **Shown at the checkpoint.**
- **(c) In the field,** before who answers: "framework: none", or "framework: Push back on me +1"; a click opens their picker under the field, Built in and Yours, a ticked box carrying its place in the stack; a click adds one at the end or takes it off, as `framework:` does. `framework:pushback, uncertain`, `framework:push back on me` (no quotes needed), `framework:off`, and bare `framework:` to see them. The Enter line of a prompt names them when a model answers (a source does not read them).
- **(d) A reply records what it was written under** and says so under it ("Written under Push back on me and Skeptic"): a new optional field on the message, `frameworks`, the ids and, for one of yours, its name at the time, so a reply can still name one later removed. **Shown at the checkpoint.**
- **(e) Your own, from the bar until Settings v1 (stage 9):** `new:framework "skeptic" "Doubt what I say, and ask for evidence."`; the same name again rewrites it (the Enter line says so first), and chats it is on use the new words from their next prompt; `forget:"skeptic"` removes it, chats it was on carry on without it; `undo:` takes either back. A built-in's name is refused for one of yours. Kept in the version 6 list `collabs`.
- **(f) Personas (A13):** the upgrade made each one of yours, switched off; none of Stefan's three backups has any, so nothing of his came across. Any that do appear under Yours, used only when chosen.
- **(g) Today's Collaboration mode** (its window and block, R22 and R23) no longer shapes prompts sent from the bar; it still works on today's chat page until retired. Its "on for this conversation" was kept in memory only, so nothing stored is lost.
- **(h) From a restored file,** frameworks of yours and the frameworks on a chat come in as they were; they go with a prompt only after the Enter line has named them, so nothing applies unseen.
- **Suggestion:** keep as built.

**C165. A model's thinking, shown as it goes; off by default.** Stefan, 22 October, after Bonsai 2 took about 11 minutes with nothing on screen: "if local models can take that long, it'd be kind of worth it to showcase the thinking so the user know the model is still performing ... some form of text that would showcase work and be clearly different from normal output"; "on by default with the option to turn it off". Built so:
- **(a) Shown as it comes,** above where the answer will be, in its own quiet style (small italic, a dotted rule on its side, the latest lines only) under a label with a running clock, "thinking · 2:31". Not the old ghost text: that already means an interrupted reply with Continue, and two meanings in one look would mislead.
- **(b) Folded once the answer starts,** to one line, "thought for 11 minutes · show", which opens it.
- **(c) Kept with the reply,** folded: a new optional field on the message, `thinking` (up to 20,000 characters) and `thinkingMs`, so the work behind a long wait can be read later. **Shown at the checkpoint.** Never sent to a model again (only a reply's own words are), left out of search, copy and export, and shown as plain text, never formatted.
- **(d) Off by default, ruled 22 October** (Stefan: "so with thinking off it runs faster? ... perhaps we have it default off, then if turned on we have the affordances we have designed"). `thinking:on` and `thinking:off` change it, a setting of the person's (`thinking`, carried by backups), and `undo:` takes it back. Off, Parliament asks a model that can think not to (Ollama's `think: false`), and only one that can, since Ollama refuses the request otherwise. Tried on 22 October with `bonsai-2:9b`: off, "Is a barn owl a raptor?" was answered in about 17 seconds (19 tokens); on, "Name one owl that lives in Sweden" thought for about 2½ minutes (shown live, then folded) before "Tawny owl".
- **(e) Before Enter,** the line says a model on this computer will think first and that it can take minutes, or that it answers straight away and `thinking:on` lets it think; the picker marks such a model "can think". Which models think is what Ollama says of each.
- **(f) For now only models on this computer** send their thinking: none of the hosted models is asked to think (that would cost tokens, and would be named with its cost when it comes).
- **Suggestion:** keep as built.

**C166. Reply language and translation, as built** (piece 6). LPN §3 and §6, C84, C85, C87, the 16 October suggestions under "How people switch language", the editing spec's `helper:`. Facts checked on the providers' and browser makers' own pages on 22 October (a research subagent; checked again by hand: the multilingual page, the Chrome version, Mistral's terms §4.2 and §4.3).
- **(a) The verb.** No document gives one: `language:` is the interface's (stage 9). **Built:** `reply:` with a code or a name, in English, in the language itself or in the interface's language (`reply:sv`, `reply:swedish`, `reply:svenska`, `reply:traditional chinese`); `reply:off` asks for none; bare `reply:` says how replies stand. A language is kept as its tag, never a name (C86). A setting of the person's, `replyLanguage`, which backups carry. **New setting, shown at the checkpoint.** Other words that would do: `replies:`, `answer:`.
- **(b) Until it is set.** LPN §3 and the 16 October suggestion: replies follow the interface's language. Today the interface is English for everyone, given because nothing else ships, not chosen. **Built:** following the interface asks for its language only where the browser lists that language among its person's (`navigator.languages`); otherwise nothing is asked. So someone whose browser lists English gets English asked for with every prompt, and a prompt written in Swedish then gets an English reply, where before this piece the model chose. `reply:off` gives the old way back. **Suggestion:** keep. The alternative: ask for nothing until `reply:` is set, or until an interface language other than English ships.
- **(c) What is sent.** One line in English after the frameworks, in the system prompt, to every provider and to models on this computer: "Write your replies in Swedish, whatever language I write in, unless I ask for another language." The "unless" leaves room for a prompt that asks for a translation. The Enter line says "Replies come in Swedish. reply: changes it" whenever the line is sent, and counts its characters. A source reads no system prompt.
- **(d) `helper:`, the model that reads text from sources** (editing spec: `helper:haiku`). Its first work is translating; edits and asks on a source's text join it with stage 11. `helper:haiku`, `helper:bonsai`, `helper:off`, bare `helper:`; a source is refused. Unchosen: a model on this computer once a check has listed one (C84 puts it before a provider), else the small model of a provider with a key, the default provider first (Haiku 5.5, else Mistral Small 4). A setting of the person's, `helper`, a model's id, which backups carry. **New setting, shown at the checkpoint.** The mockup kept one helper for everything (Sonnet 4.6, the default then); the cheapest suits translating, and the default model may suit stage 11's asks better, to look at then.
- **(e) Sources and languages.** Wikipedia is asked in the reply language's edition when one is chosen (else the interface's, as before), and in the English edition when nothing is found there (LPN §6), both said on the Enter line ("From its Swedish edition, or the English one if nothing is found there"). Following language links (the same article's title in the person's language, one request with `prop=langlinks`) is not built. Hacker News and OpenAlex keep "English only" and "mostly English"; Wikipedia's line in the picker already says "in your language", so no mark is added there. A prompt to an English-only source, from someone whose replies are in another language, says "Its answer comes in English. translate: puts it in Swedish afterwards".
- **(f) Translating an answer from a source: `translate:`** (LPN §6: per answer, on request, its cost shown). It takes the last answer from a source in the chat on screen, into the reply language (else the interface's), and names on the Enter line which answer, who translates it and the cost: "By this browser's own translation, which its maker says runs on this device. Nothing is sent"; "By bonsai-2:9b on this computer. Nothing leaves it"; or "By Haiku 5.5, which is sent the text: about 358 tokens, under $0.01". A list keeps its shape: each title and passage is translated on its own, and links, dates and facts stay. The model is told the text is material, never instructions, and characters a person cannot see are taken out first (security notes §1.4). A translation that comes back with a piece missing is not kept. **Stored:** `translation` on the message (the language, the language it was in, who translated it, when, and the translated titles and passages), beside the source's own words, which stay as they came. The answer shows its translation, with "Translated into Swedish by Haiku 5.5 · show the original" under it. **New optional field, shown at the checkpoint;** backups carry it and a restore checks it.
- **(g) Translating a question: `translate:on` and `translate:off`** (C85: opt-in, named on the Enter line). On, a question to a source that reads only or mostly English, from someone whose replies are in another language, is translated into English before it goes, unless the browser finds it is in English already: "Your question goes translated into English, which it reads best, unless it is in English already", with who translates it. If the translation fails, nothing is sent. **Stored:** the question as it went, `asked` on the person's message, shown under it ("Asked in English as “barn owls”"). **New optional field and setting (`translateQueries`), shown at the checkpoint.** **Found when tried:** bonsai-2:9b on Stefan's machine turned "tornugglor" (barn owls) into "sneaker shoes", and Hacker News was asked that. A small model on this computer translates poorly; the line under the prompt shows what was asked, so it can be seen.
- **(h) Language marks on models: none built.** The documents ask for language tags where the facts are published. Anthropic publishes figures only for Sonnet 4.5 and Haiku 4.5 (Swedish and Finnish not among the fourteen languages; Japanese and Chinese are), and says its models are "capable in many languages beyond those benchmarked"; nothing for the current models. Mistral now publishes a list of languages "with strong expected performance" (Swedish, Finnish, Japanese and Chinese among about forty), naming no model, with no tiers, and without English; Mistral Large 4's page says "160+ languages". Ollama's models publish nothing. **Suggestion:** no marks until a provider publishes them per model.
- **(i) The browser's own translation.** Found by feature detection (`Translator`, `LanguageDetector`), never the browser's name. Shipped in Chrome 138 and later, and in Edge by the browsers' compatibility data; not in Firefox (Mozilla is against the proposal) or Safari, and not in workers. One of Chrome's pages says not on phones (not checked by hand). Its makers say text never leaves the device, though the specification allows a translation in the cloud, so the copy says "which its maker says runs on this device". A language the browser has not fetched yet needs a key press or a click, which Enter is. **In the in-app browser** the interface exists but its check never answers, so each check now gives up after three seconds and the helper translates. **Not tried with a real browser translation:** for Stefan to try in Chrome (`reply:sv`, a question to Hacker News, `translate:`).
- **(j) C84's opt-out of the browser's page translation** waits for the first real interface language (stage 9), as ruled.
- **(k) Found and fixed on the way:** Settings loaded only the settings it already knew, so a new one was lost on reload (the three above added); a first prompt from a page with no room did not name the title request on its Enter line, though it was sent; and the small requests to a model on this computer let it think first, so one that thinks could spend its few tokens thinking and give back nothing (now asked not to).
- **Suggestion:** keep as built.

**C167. Privacy on every row, as built** (piece 7). Security notes §3 and §4.1, S3, the plan's "Across stages: security and privacy". Facts read on the providers' own pages on 22 October (a research subagent; Mistral's terms §4.2 and §4.3 checked again by hand). Each is kept in the one list (`data` in `list.js`, a model's own where it differs), dated, with the page that says so.
- **(a) Where they show.** On each model's row in the picker ("not trained on · kept up to 30 days"), and under each provider in the key panel with the day it was checked and a link, "where it says so". Names on rows only (security notes §3). Sources carry none: a question to one is a public search. The privacy card in Settings ("what leaves this browser") gets them with Settings v1 (stage 9).
- **(b) Anthropic.** Not trained on (commercial terms §B: "Anthropic may not train models on Customer Content from Services"; the privacy center adds feedback, and choosing to allow it). **How long it keeps what is sent, its own pages disagree:** the privacy center says inputs and outputs are deleted "within 30 days"; the API's page says conversation content "is not retained by default", and names a Console setting "Standard data retention (30-day retention)". **Built:** "kept up to 30 days", the longer reading. Flagged content is kept up to two years, said in the panel. **Fable 5.1 is kept 30 days or more** ("retained for at least 30 days", a support article of 1 September 2026), its row says so. No page of the provider's says seven days, though some blogs do. Found too: an organisation with zero retention by contract cannot call the API from a browser at all ("CORS is not supported for organizations with ZDR arrangements"), Parliament included; worth a line in the key panel's guide to keys, later.
- **(c) Mistral.** Free mode "may use your data (input and output) to train" unless you opt out; paid use leaves it to you, with no default stated; so its rows say "may be trained on unless you opt out". **The checklist** in its key panel row: where to opt out (its admin panel, Privacy, then Anonymous improvement data; the API's switch is separate from its others); preview models are trained on whatever you choose (terms §4.3: opt-outs, zero retention included, do not apply), so **Mistral Large 4**, marked "Public Preview", is said to be trained on, on its row, in the panel and on the Enter line ("its provider trains on what you send it, whatever you chose"); kept 30 days to watch for misuse (privacy policy, 3 September 2026); a region changes where prompts are processed, not how long they are kept; and that Parliament cannot see your settings there. Labs models (`labs-…`) are not in Parliament's list. One gap: no page says in so many words that "Public Preview" is a "Preview Model" under §4.3; built on that reading, the safe one.
- **(d) Ollama, and its cloud models.** *Ruled 22 October: they stay out. Stefan asked why, whether it is for privacy, whether they should come later, and how they differ from a hosted model such as the provider's. Answered:* a cloud model is a hosted model like any other, run on Ollama's servers (which say they neither keep nor train on what is sent), so privacy alone would not rule it out. It is left out for three other reasons: it would sit under "On your machine", where Parliament promises nothing leaves the computer; the page sends it to Ollama on this computer, which passes it on, so neither the connection policy nor the network log can see or name where it really goes, as they do for every hosted provider; and Parliament cannot price it, since Ollama bills its own plans. **Suggestion, for later:** a row of its own under Models, "through Ollama, on its servers", with its data facts and the Enter line saying the prompt leaves the computer through Ollama, if someone wants it.
  - As first written: a model on this computer sends nothing out (Ollama's FAQ). **Found:** Ollama now also lists cloud models (tags ending `cloud`, `remote_host` in what it lists), which run on Ollama's servers when asked through this computer. Before this piece, Parliament would have listed one as on this computer and said nothing left it. **Built:** they are left out of the picker, and the key panel says how many Ollama lists ("It also lists 2 models that run on its own servers, left out here"). **Suggestion:** keep them out; if wanted later, a row of their own that says prompts leave the computer.
- **(e) The privacy filter for fixed formats** (security notes §4.1). Email addresses, phone numbers (with a country code, national with a leading 0, or North American), bank account numbers (IBAN, by their check digits) and card numbers (by their Luhn digit) are swapped for placeholders like `[EMAIL_1]` in every request to a provider off this computer: the prompt, what goes along, the frameworks and the reply language's line, the title request, a resend without streaming and a continued reply. The same value is the same placeholder through a request. The reply's placeholders are put back as it arrives, so what is shown and kept holds the real values. One line tells the model of placeholders, only when something was swapped. A model on this computer gets the prompt as typed, since nothing leaves. **Not covered:** questions to sources (a search for a placeholder finds nothing), and a translation by a hosted helper; to look at with stage 8, where answers go into prompts. Dates, versions, years, sums and hashes are left alone (tested). `privacy:on`, `privacy:off`, bare `privacy:`; a setting of the person's, `privacyFilter`, which backups carry. **New setting, shown at the checkpoint.**
- **(f) Its default** (security notes §7, open). **Built off,** with the Enter line noticing: "It holds an email address. privacy:on swaps such things for placeholders before they go". Phone numbers come in many shapes, and a filter that swaps without being asked can change what is asked; on, the line names what it swaps each time ("Swapped for placeholders before it goes: an email address and a phone number. The reply puts them back"). The alternative: on by default, as the security notes leaned.
- **(g) Citations from a web search.** Anthropic's web search returns citations (an address, a title and the passage quoted, up to 150 characters), and the provider asks that they be shown to whoever reads the reply. They were dropped. **Now kept** on the reply, `citations` (each address once with up to three passages, web addresses only, at most 20), and shown under it as "Sources it cited", each a link that shows its whole address before it opens. **New optional field, shown at the checkpoint;** backups carry it and a restore checks it. Web search itself is still in today's chat page only; the bar gets it with R24 (stage 13). How a web search's citation streams is inferred from the provider's docs, which show the form for other citations; not tried with a real key.
- **Suggestion:** keep as built.

**C168. What a question to a source searches for** (piece 8; Part 4, "Wikipedia ranks a question by all its words"). Sent as typed, "What is a barn owl?" found "American barn owl", and "Barn owl" was not among Wikipedia's first five; "barn owl" alone finds it first (tried 22 October). Preferring a title that appears in the question does not help, since the right page is not among those found. **Built:** a leading question phrase and an article are left out of the search ("what is a", "who wrote", "how tall is the", "tell me about"), and a closing question mark, for an English search only; the Enter line says so before Enter ("It goes as a search for “barn owl”"), and the prompt keeps what was searched for, shown under it ("Searched for “barn owl”"), in the `asked` field of C166 (g). The prompt itself stays as typed. Other languages need their own phrases from someone who reads them (C87); Swedish and Finnish could come from Stefan. Tried with Wikipedia: "What is a barn owl?" now answers from "Barn owl". **Suggestion:** keep as built.

**C169. The names filter and the injection check, through a model on this computer only** (piece 8; S3; security notes §1.4, §1.5, §4.1).
- **(a) `privacy:names`:** as `privacy:on`, and people's names too, found first by a model on this computer (the helper when it is one, else the first Ollama lists) and swapped as `[NAME_1]`, whole words only. Offered only when one is connected: otherwise "Finding names needs a model on this computer, so nothing leaves it to find them. api:ollama looks for one". Found before anything is added to the chat or sent; if they cannot be found, nothing goes ("Names could not be found on this computer, so nothing was sent"). A chat's earlier messages are read once for the page, not with each prompt. The Enter line says "Names are found first by bonsai-2:9b on this computer and swapped too, which takes a while. A small model can miss some". **Tried with `bonsai-2:9b`:** "a thank-you note to Anna Lindqvist" went as "[NAME_1] Lindqvist": it found the first name and missed the last, after about a minute reading the whole chat the first time. A larger local model would do better; the line says a small one can miss some. The setting `privacyFilter` takes `names` too.
- **(b) The free check,** plain code, for everyone: words in text from a source that read like instructions to a model ("ignore previous instructions", "you are now a", "reveal your system prompt", tags like `<system>`) are marked under the answer, "Holds words that read like instructions to a model: … Shown as text, never followed", and blocked nowhere. When such an answer is translated by a model, its Enter line says so first. English phrasings only. Invisible characters are taken out before a source's text goes to a model (C166 (f)).
- **(c) `check:`,** the closer look: the free check's finding on the Enter line before Enter, then, with a model on this computer, Enter asks it whether the last answer from a source tries to instruct a model; free, nothing leaves, "a warning, never a guarantee". Without one, the Enter line says a model on this computer can look more closely. Tried with `bonsai-2:9b` on a Wikipedia answer: "finds nothing in it that tries to instruct a model".
- **(d) Not built:** the hosted check (a provider's model's yes or no, opt-in, named with its cost; security notes §1.5): the plan has it, S3 ruled the local one; stage 8, when answers go into prompts, is where a check has its real work. **Suggestion:** keep as built, the hosted check with stage 8.

**C170. The key vault: build it, or keep the layers** (piece 8; S1). Written up in `research/vault-scope-review.md`. In short: a key is stored encrypted, but code running on Parliament's page (a compromised package, a scripting bug) can read it and use it anywhere until it is revoked. A vault, a small page on another origin of Parliament's in a hidden frame with its own key panel, holding the keys and sending provider requests itself, is the one measure that stops a key being read; it does not stop the key being used through it while the page is open, and does not protect chats. It needs four narrow exceptions to the hard constraints (one allowed frame, one host of Parliament's own on the list, prompts and replies over one private channel to the frame, the gateway split in two with one log). **Suggestion:** since the most secure design wins (S1), build it in stage 15, before going public, as its own small site, after the request path is finished; keep Lock Parliament (after stage 9) and the stage 15 hardening as well; have an outside reviewer look at it with the key module.
- **Ruled 22 October: yes** ("ok"). Stefan asked whether it is the most secure route. *Answered:* for keys, within a site that has no servers, yes: it is the one measure that keeps a key from being read by code on the page, and with Lock Parliament its storage is also useless to someone who copies the browser's profile. What would go further breaks a hard constraint or makes things worse: a server holding the keys (a backend, and every key in one place), or a native app with the system's keychain (not a web page). No design in a browser stops a key being used through the page while it is open, or protects against malware or an extension that reads every page; the spending limit and a key for Parliament alone cover those.

**C171. A Mistral prompt that came back with nothing** (found by Stefan, 22 October, at the stage 7 checkpoint). His key passed its check and played the ignition, but a prompt to a Mistral model gave no reply and no error.
- **What the check does:** it lists the models the key may use and generates nothing, so a key can pass it while a prompt still fails.
- **What was found in the code:** a streamed reply that ended with no words was stored empty, and nothing was said. That matches what Stefan saw. What made it end empty is not known without the key; three causes fit: the newer Mistral models reason before they answer (docs.mistral.ai/capabilities/reasoning, read 22 October: Mistral Medium 3.5, Large 4 and GLM 5.3 by their ids, and `mistral-small-latest`, take `reasoning_effort`; the default is not published), so a reply could spend its time or its room reasoning unseen, or stall after 45 seconds of silence, which the line under the bar says only quietly; or the provider answered in a shape that is not a stream (an error sent as plain JSON), which was skipped.
- **Fixed:** (a) a reply that comes back with no words now says so on the Enter line, and why where known ("ran out of room before it said anything, perhaps spent reasoning first"), and nothing empty is kept; (b) a response that is not a stream is read for its error, which is then shown; (c) the hosted Mistral models whose ids the reasoning page lists are asked not to reason first (`reasoning_effort: "none"`; GLM 5.3, which does not take "none", is asked for "low"), as C165 (f) rules for hosted models, so a reply comes sooner and no tokens are spent unseen; (d) any thinking a model does send is shown as it comes, as for a model on this computer. Mistral Small 4 and Large 3 are not on the page by their fixed ids, so nothing is sent for them.
- **Still to try, with the key:** `by:mistral small`, a prompt; then `by:mistral medium`, a prompt. Each should now give a reply or a sentence saying why not. If Mistral Small 4 still comes back empty, the next step is to read what its fixed id answers, in the browser's network panel or with Stefan.
- **Suggestion:** keep as built.

## Part 13. Branches (added 22 October 2026)

Found while splitting stage 8 into pieces. The documents: the plan's stage 8, branch slider v9 (its header's changes and proposed rules carry the behaviour), the editing spec (`again:`, `to:`, `helper:`), the docket spec (branches and addresses), and the rulings since (C17, C18, C49, C115, C127, C149). Read with C131: the slider's "chat 201" with branches 201a to 201c is, in the data, plan 203 whose branches are chats of their own (204 is 203a, 205 is 203b), so a branch's address is the plan's number and a letter. Each is built as suggested, so a ruling changes one entry.

**C172. What a prompt to several makes** (piece 1).
- **(a) Branches are chats.** The data already has it so (C17, C18): each branch of a plan is a chat with its own number and letter. A prompt to three makes the chat on screen answer with the first, and two new chats, the next letters of its plan, answer with the others. Each new one starts from the same point: copies of the messages before the prompt, each copy keeping `from`, the message it was copied from (plan: "a branch copy keeps a link to the message it came from, which Ripple needs later"). Each keeps who answers it (`answerer`, C150) and the chat's frameworks.
- **(b) The prompt carries its group.** The person's message in each branch keeps `group`: an id and the chats it went to, in the order chosen, so a room showing any of them finds the others. **New optional fields on a message, `from` and `group`, shown at the checkpoint;** backups carry them and a restore checks them.
- **(c) Choosing several.** `by:sonnet, wikipedia, opus` (C149 left it for branches), or ticking boxes in the picker: each ticked box shows its number, the order of the tabs (slider v9 changes from v6); unticking closes the gap. With one, it is the chat's choice as before; with more, the choice is **held for the next prompt only**, in this tab, not stored: after it goes, each branch keeps its own. A reload before sending forgets it.
- **(d) All at once only.** "One after another" with a condition (slider v9, A15) is the plan's stage 10.
- **(e) The title request** (C62) goes once, for the chat on screen, not once per branch: the branches are one conversation.
- **(g) Found and fixed:** a branch made by forking copied a message's words only, so a copied answer from a source lost its note and would have been sent to a model as the model's own words (against C115). Copies are now whole.
- **(f) The Enter line** names each recipient with its cost and the total: "Enter sends this one prompt to 3, each a branch of 203: Sonnet 5.5, about 120 tokens, under $0.01; Wikipedia, no cost; Opus 5.5, about 120 tokens, under $0.01".
- **Suggestion:** keep as built.

**C173. The slider, as built** (piece 2). Branch slider v9 draws the behaviour; these are the points it leaves open.
- **(a) Where it sits:** in the room, in place of the replies to a prompt sent to several, under the prompt. One tab per branch in the order chosen: its letter, who answered (the model or source that wrote the reply, else the branch's choice), and "writing", "stopped" or "carried on". Arrows either side; ⌥← ⌥→ from the bar, and ← → when the bar is empty, step through the latest slider on screen, mirrored where the page reads right to left. The tab shown is kept for the page only.
- **(b) What a tab holds:** its branch's reply; with only the room's line carried on, the line goes on below the tabs (v9, state 4); once more than one is carried on, each tab holds its branch's whole thread from that prompt, and nothing goes below (v9, state 5). An older group the line is not part of (a copy made before it was asked) is drawn as plain messages.
- **(c) Under each reply:** `open:201b` "with its history" and `open:201b summary`, each a command a click writes into the bar, which waits for Enter. Where the chat carries on from another branch, the line says so (v9's proposed rule). The estimate of the room a summary frees comes with piece 4.
- **(d) Leaving, with branches (C109):** a chat is left, and a reply being written in it stopped, only when nothing on screen shows it: not its room and not a slider. So looking at another tab, or the room moving to the branch it carries on, never stops a branch still writing; leaving the room stops them all, unless replies are let finish.
- **(e) Another branch's messages** are drawn with plain cards fed from that chat and its stream (no notes, keywords or favourites on them in the slider; `open:` shows a branch with all of it).
- **(f) A room's contents write into the bar** through one event that takes only a command line (it starts with `>`), so text from a room can never run one.
- **Suggestion:** keep as built.

**C174. Where the next prompt goes among branches, as built** (piece 3). Slider v9: "Unticked, it follows the slide being viewed; once ticked it holds", and its proposed rules: "Replying from a branch makes it the line the chat continues on"; "Carrying on a sibling after that starts its own card". Built so:
- **(a) The rule:** before any branch is carried on, the prompt goes to the tab viewed. Once one is carried on alone, it goes to that line whatever tab is viewed, and the Enter line says so ("It carries 201b on, not the reply you are viewing. open:201c carries that one on in a room of its own"). `to:` holds one, several or all until changed; a held choice belongs to its prompt's branches and lapses with them.
- **(b) The room moves with the line:** a prompt to one branch other than the room's makes that branch the room's chat, and it carries on there ("It carries 201b on, and the room moves to it"). Nothing writing is stopped by the move (C173 (d)).
- **(c) Several at once:** each branch carries its own thread on, with its own answerer and its own frameworks; the Enter line names each and its cost ("Enter sends this to 201a, 201b and 201c, each carrying its own branch on"). The estimate uses the room's own history for each, so it is rough where the threads differ.
- **(d) In the field:** "to 201b · Wikipedia", "to 201a, 201c" or "to all 3" in place of "answered by" while a slider is on screen; a click opens **Reply to**, the branches with numbered boxes, where a click ticks or unticks one as `to:` does, and "all 3". The answer picker still opens with `by:`, for a new prompt to several, which comes before the branches.
- **(e)** `to:` takes addresses with commas (`to:201a, 201c`) as well as one and `all`, and works from any board, as `by:` does; the registry had it for rooms only.
- **Suggestion:** keep as built.

**C175. A branch in its own room, and from a summary, as built** (piece 4). Slider v9 and C60: `open:201a` is "its own card, full history, keeps its letter"; `open:201a summary` is "a new branch (next free letter) from a summary", one model call, with the context estimate worked out locally.
- **(a) "Its own card": ruled 23 October, any number of rooms (see Rulings; stage 8, piece 7).** As first built: the space holds one room (C125, C146 (c)), so `open:203b` shows the branch in the room here, with its whole history and its letter, or brings a room beside when none is on screen. The chat it replaces is one `open:` away. Two rooms side by side would need the space to hold several, which no stage plans. **Question for the checkpoint.**
- **(b) Who writes the summary:** the helper (`helper:`, C166 (d)): a model on this computer when a check has listed one (free, nothing leaves it), else the small model of a provider with a key. The Enter line names it with the tokens and the cost: "Enter starts 203d from a summary of 203b: one call to Haiku 5.5, about 10,250 tokens, $0.01".
- **(c) What it reads:** the branch as a model would be sent it (hidden messages and those being deleted stay out), each turn in a labelled tag: the person, a model by name, or a source. Answers from sources go in, marked as a source's, and the Enter line says so, since asking for the summary is acting on them (C115). Invisible characters are taken out, and the instructions say the turns are material, not instructions. A branch over about 100,000 tokens gives its latest part, and the Enter line says so. With the privacy filter on and the helper off this computer, what it finds is swapped for placeholders first and back in the summary.
- **(d) The new branch:** the plan's next letter, holding one message, the summary as the helper wrote it, with the helper's model id and `summary: { of, upTo }`, the branch it summarizes and the last message there when it was written. Who answers it and its frameworks come from that branch, and the room moves to it. Nothing is copied. **New optional field `summary` on a message, shown at the checkpoint;** backups carry it, and a restore checks it and rewrites both ids.
- **(e) What a model is sent:** the summary goes on the person's side, introduced as a summary a model wrote ("This conversation carries on from a summary of an earlier part of it, written by a model:"), so it is never taken as the model's own words and a chat never opens with a model's turn. Under it in the room: "A summary of 203b, written by Haiku 5.5. This branch carries on from it in place of that history".
- **(f) The context estimate:** characters over four, against what the branch's model reads at once (the list of models; a model on this computer 4,000 tokens, C163 (e)), the summary counted as 400 tokens. Under each reply in the slider ("context 41% → 7%", "context under 1%") and on the Enter line. With most hosted models now reading up to 1,000,000 tokens at once, most branches show under 1%; the estimate matters most for models on this computer and the 256,000-token Mistral models. A source's branch shows none.
- **(g) Its cost in Records:** the summary call's tokens are not kept as usage, so the new branch's cost leaves it out, as `summarize:` does (C145 (g)).
- **(h)** `open:203b summary` goes alone on its line, since it spends. It has no undo, as a fork has none; `erase:` removes the branch.
- **Suggestion:** keep as built; (a) is put to you at the checkpoint.

**C176. An answer from a source brought into a prompt, as built** (piece 5). C115 ruled that answers from sources stay out of what a model is sent unless the person acts on them; the security notes (§1.1 and §1.4, approved) set how such an answer goes. The documents leave the act itself open.
- **(a) The act: a new command, `include:`,** held for the next prompt only, in this tab. `include:` takes the last answer from a source in the room's chat; `include:201b` a branch's on screen, or several (`include:201b, 201c`), at most 5; `include:off` drops them. Its Enter line names the answer and says it goes as data. The prompt's line then says "It brings in the answer from Wikipedia, as material from a source" and counts it in the tokens. It goes to models only: a source is sent the words alone, and the held answer waits for a prompt to a model. **The name is a suggestion** (others: `with:`, `bring:`). **Question for the checkpoint.**
- **(b) On Enter:** the answer is read again from storage and checked in a worker made for the check and thrown away (invisible characters out, words that read like instructions found), with a time limit, as the spreadsheet reader runs. If it cannot be read or checked, nothing is sent.
- **(c) Kept on the prompt** as `included`: where it came from, its words as checked and the words flagged, so later turns send it again as it went and a backup keeps it. **New optional field `included` on a message, shown at the checkpoint;** a restore checks it and rewrites the message it came from.
- **(d) How it goes, behind the provider interface:** to Anthropic as `search_result` blocks before the prompt's words, each with the page's address and title, citations on (Anthropic's page on search results, read 22 October 2026: `source`, `title` and `content` required; `citations` optional and the same for every block in a request; no beta header; allowed beside text in a user message); a reply's citations of it show under the reply. To Mistral and Ollama as JSON before the prompt's words, so text inside cannot break out of its delimiters. For every provider, one line in the system prompt says the material is data, never instructions, and flagged words are named in a warning beside it. The privacy filter swaps what it finds in it too.
- **(e) In the room,** under the prompt: "With the answer from Wikipedia (Barn owl), sent as material from a source, marked as data", and, when words in it read like instructions, that they went marked.
- **Suggestion:** keep as built; the command's name is put to you.

**C177. Asking again, as built** (piece 5). The editing spec: `again:201a`, "Enter asks again from the edited prompt as 201d".
- **(a) Until editing comes (stage 11):** the branch's last prompt as it was sent, asked again as a new branch, the plan's next letter, by who answers that branch, with its frameworks and whatever it brought in from sources. The new branch is a whole copy up to the prompt (C172 (a)).
- **(b) Its reply joins the tabs under that prompt.** The prompt, and every prompt of its group, take the group with the new branch added (a change to the existing `group` field on stored prompts, no new field), so each room showing one of them shows the new tab. The new tab is viewed; the room stays where it is.
- **(c) Found and fixed:** once more than one branch carries on, each tab holds its whole thread (C173 (b)), and a later prompt to several in the line's own thread was drawn as plain messages. The line's tab now draws its thread as the room does, so that prompt has tabs of its own there.
- **(d) What it works on:** `again:` the room's chat; `again:201a` a branch on screen; a chat not on screen is opened first. It works from any board, as `to:` does (C174 (e)); the registry had it for rooms and plans only.
- **(e) The Enter line:** "Enter asks “Which places heard it?” again as 201d, beside 201a: Sonnet 5.5, about 116 tokens, under $0.01 to send", then "It brings in again what that prompt brought in from Wikipedia, as data" when it did, and "Its reply joins the tabs under that prompt, and the room stays where it is".
- **Suggestion:** keep as built.

**C178. Forking, as built** (piece 6). The docket spec (§3): forking writes a lettered branch into the chat's plan, from a message. C8, not ruled, suggested `new:branch 207` from the end, and forking mid-chat from the message itself in the room, "no extra syntax".
- **(a) The command:** `new:branch` forks the room's chat from its end; `new:branch 201a` (or `207`) a chat by its address; `new:branch 201a 2` after step 2, the person's second prompt and its reply, as the docket spec counts a fork point; `new:branch 201a 0` an empty branch of the plan. Each is the plan's next letter, a whole copy (C172 (a)), shown in the room. No call, no cost.
- **(b) From a message:** "Branch from here" on a message, in a room on the shell, writes that line into the bar for Enter, so the bar stays the one actor (C125, C173 (f)). From a reply, the fork ends with it; from a prompt, it ends before it, so it can be asked differently. On today's chat page it opens the branch panel as before, until R26 is ruled.
- **(c) The step number** is the one word more than C8 wanted: a click has to say in words where the fork is.
- **(d) R26** (the branch panel, and Cmd/Ctrl+Shift+B that opens it) is put to you: what it did is now `new:branch`, `open:… summary` and `again:`. Its summary sent each message cut to 500 characters to one fixed model and kept the summary as that model's own words, which C175 (e) fixes.
- **Suggestion:** keep as built.

**C179. The privacy filter on searches and translations, and the hosted check, as built** (piece 6).
- **(a) Searches** (C167 (e)): a source searches for words, and a search for a placeholder finds nothing, so with the filter on, what it finds is left out of the search instead: the fixed formats, and with `privacy:names` the names a model on this computer finds. The Enter line says so ("The privacy filter leaves an email address out of the search"), and with the filter off offers it ("It holds an email address, which a search sends as typed. privacy:on leaves such out"). The question shows the search as sent ("Searched for “Barn owl”"). A question with nothing else in it is not sent.
- **(b) Translations by a hosted helper** (C166): what goes is swapped for placeholders first and back in the translation, for a question before it goes to a source as well as an answer from one. `translate:` says so on its Enter line.
- **(c) The hosted check** (C169 (d); security notes §1.5): `check:` with no model on this computer and a hosted helper offers the helper, "Enter has Haiku 5.5 look more closely: one call, about 190 tokens, under $0.01. A check is a warning, never a guarantee", and says a model on this computer would do it free. It runs only on `check:` and Enter.
- **(d) Covered with stage 8 as well:** a branch's summary (C175 (c)) and an answer brought into a prompt (C176 (d)).
- **Suggestion:** keep as built.

**C180. Any number of rooms, as built** (piece 7; ruled 23 October, C175 (a)).
- **(a) Opening:** `open:204`, `open:201b`, `open:201b summary`, `new:branch` and `sym:` open a chat in a room of its own beside the room it came from. A chat open in a room already has the bar pointed at that room ("204 is open in a room already. Enter points the bar at it"); an empty room on screen takes the chat. No limit; the space scrolls sideways when the rooms outgrow the window.
- **(b) Where a prompt goes:** to the room the bar points at, else the room it pointed at last, else the last room on screen. A click on a room points the bar at it, and the Enter line names it ("→ 225 in Writing studio"). `to:` a branch other than the room's still moves that room to it in place (C174 (b)).
- **(c) Each room its own chat:** each room holds its chat's messages while it shows it, and its parts (messages, tabs, notes, keywords, favourites, the outline, the token counts, files) read that chat, not one open chat. A reply arriving in one room never redraws another, and leaving a room stops only its chat's reply (C109), unless another room or a slider shows it.
- **(d) Closing and widths:** `close:204` and `width:204 40%` find the room showing that chat among several, and say so ("Enter closes the room showing 204"). The word `room` in a command names the room a prompt goes to. `focus:` keeps that room alone, and `focus:off` brings the others back.
- **(e) Kept on this device, as shown at the checkpoint:** the first room is the board `room`, as before; others are `room-2`, `room-3` and so on, each with its chat in the space's context, and `lastRoom` names the room the bar pointed at last. A space kept before reads as it did; an older build reading the new space drops the extra rooms and keeps the first. Not in backups until stage 9 offers layouts.
- **(f) Not yet per room:** a Secretarybird document room (DocumentContext) and Collaboration mode (R22) still follow the room a prompt goes to.
- **Suggestion:** keep as built.

## Part 14. Settings and your data (added 23 October 2026)

Found while splitting stage 9 into pieces. The documents: the plan's stage 9, the settings spec (`settings-spec-decisions.md`) and Settings v1 (its header comment is the record for what it draws), with the rulings since (C27 to C36, C84, C87, C88, A21, the language ruling of 16 October, C166 (b)). Each is built as suggested, so a ruling changes one entry.

**C181. Settings as a board, as built** (piece 1).
- **(a) A board in the space** (C125): `open:settings` brings it beside what is here; `open:settings keys` (or any word in the spec's table: `backups`, `cost`, `privacy`…) points the bar at it and scrolls to that section, kept with the space. The rail folds away when the board is narrow.
- **(b) Every control runs its `set:` line**, as if typed and entered: the same words, the same `undo:`. Marginalia write a command into the bar for Enter (`api:anthropic`, `thinking:on`, `reply:`, `privacy:on`). No key is typed on Settings: each provider's field is the key panel under the bar (`api:`), as the spec's §6 asks.
- **(c) `set:` names:** `default`, `keys`, `title`, `finish`, `text`, `region`, `room`. Refused with a reason: `key` (keys never go in the bar), `compress` (it would write a branch unasked), and `summary`, `threshold`, `budget`, `theme` (nothing reads them; R28). `warn` comes with `run:` (stage 10).
- **(d) Only settings that do something are shown.** Not shown yet: the budget alert, summary depth, the context warning and automatic compression (R28, put to Stefan at the checkpoint); the warning before a costly run and the costliest runs (stage 10 records runs and their cost; this month's costliest chats stand in); hard limits (with stage 10, once each provider's own limits page is checked); desks (C32). The spec's "Auto" default is not built: the default is a model (Sonnet 5.5, C155), and with no key Wikipedia answers (C150).
- **(e) Spending:** this month in dollars, from the tokens each reply recorded, by the month it came (chat facts now keep it). Chats whose cost is not known are counted and said, never guessed.
- **(f) Text size:** the chrome's type sizes and the rooms' relative sizes scale together; the layout does not zoom, so stretching and measuring stay as they are.
- **(g) "Keeping keys"** moves every provider's key when it changes (the old page moved Anthropic's only).
- **(h) The rule** sits on the section the bar points at and slides as the card scrolls (C31); while a search hides it, on the first section still shown.
- **(i) New setting:** `newChatRoom`, the room a new chat starts in (`set:room`), a library template; none is the Writing Studio. **Shown at the checkpoint;** backups carry it.
- **Suggestion:** keep as built.

**C182. Backups from the bar, as built** (piece 2).
- **(a) `backup:`** opens a panel under the bar: what goes in (chats and plans, notes and markings, rooms, the library, your settings, window layouts; the last two off unless ticked), then a choice said plainly: with a password (encrypted; nobody can help if it is lost) or without (not encrypted: anyone who opens it can read your chats). Afterwards the bar names the file and says whether it is encrypted.
- **(b) `restore:` and `import:`** open a file picker first, and the panel says what the file is (its date, whether it is encrypted, what it holds) before anything happens (A21). `import:` of a file that is not a backup says so; room files come when they exist. An encrypted file asks for its password. Then: add it to what is here, or replace what is here. A replace first offers what is here as a download (with or without a password) and is armed by typing `replace` (T13). After a restore the page reads everything again.
- **(c) One minimum password length, 8 characters,** in the panel, the old backup window and the old Settings page. New files are stretched 600,000 times (T9); the count is in each file's header, so files made at 210,000 and 100,000 still open. The older `.apb` export on the old Settings page still writes its own format at 100,000 until R10 retires it.
- **(d) Window layouts** (ruled 20 October): in a backup only when ticked; the copy made before a database upgrade and the old window's "back up everything" leave them out. A restore checks each one as when reading it from this device. Adding to what is here keeps this device's layouts, since the layout here is what is on screen; a replace brings the file's; a replace from a file without layouts leaves this device's alone. Windows are not placed by screen yet, so a screen this computer lacks does not arise.
- **(e) The reminder:** `set:reminder daily|weekly|monthly|never` and its control in Settings, counted from the last backup. Monthly is the default, the rule the reminder always had; the old Settings page stored a choice that the reminder never read, and it is read now. Never means no reminder, even when the browser may clear the data; Storage in Settings still says so.
- **(f) Data and backups in Settings:** Backup and restore (writing `backup:` and `restore:` into the bar), with the format line the spec asks for, showing the real number ("Backups are format 2"): a file with no version is format 1, a newer one is refused with a message, and each migration is tested against a fixture. Then the reminder, storage and the last backup, read again when the panel closes.
- **(g) What "your settings" holds** is said truly (T13): the model for new chats, languages, the privacy filter, the scratchpad and personas, never keys. Keys live in their own database, which a replace does not touch.
- **Suggestion:** keep as built.

**C183. Delete everything, as built** (piece 3; C73, C39; audit T5).
- **(a) A button in Settings, never a command** (ruled 11 October): the red block at the foot of Data and backups, the one red in the product. Its first click opens the confirmation; nothing else reaches it. Search finds it ("delete", "erase", "wipe").
- **(b) The confirmation** lists what goes (the chats and plans counted, the markings counted, the rooms you built and the library, your keys by provider and the key that encrypts them, your settings, window layouts and the record of your backups, the copy kept for working offline), offers a backup first (`backup:` written into the bar), says what it cannot reach (backups you downloaded, files you saved elsewhere, what providers already received), and is armed only by typing `delete`. Enter in that field does nothing; the red button does it. Escape or "Keep it" closes it.
- **(c) What goes:** every database of Parliament's in this browser (its own, the key database, the trial copy, and the offline worker's), all of Cache Storage, the service worker, and local and session storage, all for this site only. A database on this site under another name is left alone.
- **(d) Other tabs:** the browser asks every tab holding a database to let go when it is deleted. Each Parliament tab now does, and covers its page with "Everything was deleted from this browser in another tab. Close this tab, or reload to start again." A tab that does not let go (an older build) is waited for: "Waiting for your other Parliament tabs to close."
- **(e) Nothing written back:** a tab that let go does not open the databases again until it reloads, so nothing in it recreates them. This tab is covered too ("Everything is deleted from this browser"); reloading starts Parliament afresh, which makes an empty database again.
- **(f) The old Settings page** (`/settings`) deletes everything the same way, and its warning now lists the rooms, the library, the keys and the offline copy. Its confirmation is still a plain "Delete Everything" button with no word to type, until the old page goes. Retiring `/settings` is not in section 6 yet; put to Stefan at the checkpoint.
- **Suggestion:** keep as built.

**C184. Languages, as built** (piece 4; ruled 16 October under "How people switch language"; C84, C87, C166 (b); LPN §2.2).
- **(a) `language:`** takes a code or a name, in English, in the language itself or in the page's (`language:sv`, `language:swedish`, `language:svenska`, `language:日本語`). `language:browser` goes back to following the browser, and bare `language:` opens the picker (both suggested 16 October, not yet ruled). The verb stays English. Its Enter line speaks the language chosen, as ruled: that language's words load as the command is typed, and until they have, the line is in the page's language.
- **(b) One choice does it all** (C166 (b)): the page, the replies (they follow the page's language even where the browser does not list it), and Wikipedia's edition. A reply language of their own (`reply:` with a language, or `reply:off`) ends, and the Enter line says so; one `undo:` puts both back. `reply:` can still give replies a language of their own afterwards.
- **(c) The picker** lists languages by their own names, with each one's name in the page's language beside it, never flags; a click runs `language:` as Enter would, so someone who cannot read the page can still pick theirs. **The globe** ("🌐 English ▾") is marginalia at the top of the welcome page and in Settings under Appearance, and opens the picker. It appears only once more than one language is offered (suggested 16 October): in development now, in production when the first language ships.
- **(d) A setting of the person's,** `interfaceLanguage` (a tag, or none to follow the browser's languages, never the network address), which backups carry (suggested 16 October). **New setting, shown at the checkpoint.**
- **(e) The drafts:** Japanese, Simplified Chinese, Swedish and Finnish, every word of the copy table, drafted by Claude for review (C87): one drafting agent per language, each checked by a script against the English (placeholders, plural and select cases, commands kept as typed, no dashes). Each language's glossary and the lines its drafter was unsure of are in `docs/translations/`. They are offered in development only, marked "draft" in the picker and on the Enter line, and production carries none of them. Shipping one moves it from `DRAFT_LANGUAGES` to `SHIPPED_LANGUAGES` in `src/i18n.js`.
- **(f) Chinese is Simplified** (`zh-Hans`), as the mainland writes it; `language:chinese` finds it, and `language:traditional chinese` says it is not here yet. Traditional Chinese would be a draft of its own.
- **(g) C84 is built and waiting:** once a second language ships, the page opts out of the browser's own translation (`translate="no"` and the notranslate meta). Nothing changes until then.
- **(h) What stays English for now:** words outside the copy table: older screens (the old `/settings` page, the Lab, parts of the rooms' blocks), and what a room's own theme draws. Those are words the refactor replaces or moves into the table as each stage reaches them.
- **(i) Found while drafting:** the backup panel compared the word typed to arm a replace with the English "replace", so a translated page could never go on. That word now has its own entry (`backup.replaceWord`), as Delete everything's has. Settings in a narrow card now puts each control under its words, since longer languages pushed choices off the edge. Open across the four drafts, listed in `docs/translations/README.md`: whether a person's example words inside a command are translated (Swedish and Finnish do, Japanese and Chinese do not; verbs stay English in all); two sentences joined on screen from two entries, which a translation cannot reorder; and `compare:` on languages written without spaces.
- **Suggestion:** keep as built, and read the drafts: Swedish and Finnish first, then Japanese and Chinese.

**C185. About, as built** (piece 5; audit T2; `privacy-copy-draft.md`, revised after Stefan's review on 12 October).
- **(a) The words are the draft's,** for Settings (drafts 12 to 16) and its one list, "What leaves your device", now in the copy table so later surfaces (README, SECURITY.md, the welcome letter at stage 15) can draw on the same entries. About shows what Parliament is ("MIT licensed. Source published at launch."), "How your data stays private" in four short paragraphs, the list, and the network log by host (built in piece 1).
- **(b) Each claim checked against the code today,** using the draft's own table: on-device voice only (C70) and the microphone allowed only for this site; one announced naming request with its switch in Settings (C62); one gateway, each key bound to its provider (stage 4); the policy written from `src/net/list.js` with a test that `netlify.toml` matches; the log grouped by host and named by caller; the backup window saying when a file is not encrypted (C182); the site on Netlify at parliament.ltd (`docs/hosting.md`).
- **(c) One claim needed a fix first:** the page opened a connection to Anthropic on every load (a `preconnect` hint in `index.html`), before any key or choice, which the draft's "stays on your device until you press Enter" rules out (also plan-brief rule 4, confirmed). The hint is gone; a provider is reached only when a request goes to it.
- **(d) Adjusted from the draft, where the app has grown since 12 October:** "Your prompt" adds that a summary, a translation or a check is named on the Enter line the same way before it goes (stage 7 and 8 requests); "A title" is called "A name for a new chat"; "Check it yourself" leaves out "The source is on GitHub" until the repository is public; the list ends by saying where Settings lists the providers and sources (under API keys). Two corrections found while translating: the draft said encryption "keeps it out of backups", but keys stay out of backups because a backup never includes them, so the line now says each key "is never put in a backup"; and "the published policy" now says "the security policy the site publishes", since two translators read it as a privacy policy. "The line under the field" is "the line under the bar", as everywhere else.
- **(e) Translated with the rest:** the four drafters drafted these entries too, held to the English claim for claim.
- **(f) Not yet applied:** the README, SECURITY.md, the manifest, the old `/settings` page and the welcome letter keep their words until stage 15 applies the draft everywhere (plan, stage 15).
- **Suggestion:** keep as built.

**C186. The old Settings page retired, as carried out** (R10, R28, R37; ruled 23 October).
- **(a) Checked first, section by section,** that the old page held nothing the Settings board lacks: the key and its check (the key panel, `api:`), the default model (`set:default`), finishing replies and naming new chats (`set:finish`, `set:title`), backups and restore (`backup:`, `restore:`, which reads `.apb` and JSON too), storage, the reminder, Delete everything, text size, and About with the network log. What it had beyond those is R10 (the export buttons) and R28 (the options nothing read).
- **(b) The page** moved to `src/deprecated/views/SettingsView.jsx`, with a note saying how to put it back; nothing deleted. `/settings` now goes to the shell, which opens the Settings board once the space is loaded and puts the address back to `/`.
- **(c) Two links pointed at the old page,** "back up in Settings" on Records' backup line and on the welcome page; each now writes `>open:settings data` into the bar, as marginalia do.
- **(d) Left as they are:** `db.js` `exportAllData` and `importData` (the old export and import) and `NetworkActivityCard`, which nothing built uses now; nothing is deleted without approval. The old backup window (`BackupRestoreModal`) is still opened by Cmd/Ctrl+Shift+B and by the Build page's top bar; it takes the same shortest password as `backup:` and offers window layouts, off unless ticked (C182).
- **Suggestion:** keep as carried out.

## Part 15. Lock Parliament (added 23 October 2026)

Found while designing the stage after stage 9 (S4; `security-privacy-decisions.md` §6.2). The design is `research/lock-parliament-design.md`, written after a read-only inventory of every place the app reads or writes your content and a check of passkey support against primary sources. It changes every stored record, so it is shown before anything is built that writes.

**C187. The design, in four pieces.** The lock's keys; sealed records and a three-step save; setup and unlock; backups, restore and Delete everything with the lock on. One random data key encrypts content; the passphrase, a recovery code and passkeys each wrap a copy of it. **Suggestion:** build it as designed.

**C188. Unlocking each tab.** §6.2 says Parliament "asks once when the browser opens, then stays unlocked until the browser closes". Two hard rules stand against that: keys never cross windows, and the browser offers no storage that lasts until it closes and no longer (anything that survives a reload survives in the profile a thief would copy). **Suggestion:** each new tab, and each reload, unlocks for itself; with a passkey that is one touch. Windows popped out from a tab open with it, since that tab draws them. The idle choices become 15 minutes, 1 hour, 8 hours, or until the tab closes. The other way, a background worker shared by Parliament's tabs holding the key while any is open, would keep the key in one place but pass your words from it to every tab, which the rule on messages between windows forbids.

**C189. What is sealed, and what stays readable.** Sealed: everything you wrote or that was said (chats, messages, files, documents, notes, keywords, quotes, plans and their steps, collections, frameworks, saved searches, the command history, text kept in settings) and the saved provider keys. Readable, so the app can find and order things before decrypting: numbers, dates, which records belong together, kinds; and rooms, the library, window layouts and preferences (the unlock screen needs your language). A copied profile shows how many things there are, when they were made, and roughly how long each is, never a word. **Suggestion:** as listed; sizes not hidden.

**C190. The passphrase and the idle time.** The lock guards everything, not one backup file, so a longer shortest passphrase than a backup's 8 characters. **Suggestion:** at least 12 characters; idle lock after 1 hour unless chosen otherwise.

**C191. Passkeys: an extra way in, never the only one.** Every current browser engine can give the bytes a passkey makes (WebAuthn PRF), but passkey makers differ (1Password has an open fault; Dashlane is reported not to support it; Windows Hello only lately), and asking the browser cannot tell. **Suggestion:** setup makes the passkey and unlocks with it at once, keeping it only if that works; the passphrase and recovery code always remain; setup says that deleting the passkey from a password manager removes that way in. `security-privacy-decisions.md` §6.2 already counts passkeys as meeting "Web Crypto only": WebAuthn gives the bytes, Web Crypto does the cryptography.

**C192. The change to stored data, shown before it is built.** With the lock on, each record of the stores listed becomes `{ id, <the readable fields>, sealed: { v: 1, iv, data } }`, the rest of its fields encrypted together and bound to its store and id; files' bytes are encrypted whole; the four tag indexes (never queried) hold nothing. The lock's own record goes in the key database beside the saved keys, as one more entry: no new store, no new database version. Turning the lock on rewrites everything in a single save, after offering a backup; turning it off rewrites it back. Backups keep their format, so every backup ever written stays readable; a restore encrypts what it writes while the lock is on. With the lock off, nothing on disk changes. **Suggestion:** approve the shape; nothing is rewritten except when a person turns the lock on, and while it is built only on trial copies.

**C193. Sealed records and the three-step save, as built** (piece 2).
- **(a) Fewer fields readable than drafted:** only each record's key and the fields the database's own lookups read (`src/lib/seal.js`). A message keeps only its id and its chat's id; its role, dates and the rest are sealed. A setting is sealed where it holds your words (personas, the old scratchpad, documents' ripple notes, the backup log). The tag indexes, which nothing queries, hold nothing.
- **(b) Each sealed record is bound** to its store and its key; a file's bytes are sealed apart from its other fields and come back as bytes. A record moved to another key or store, or opened with another data key, fails as damaged.
- **(c) The three-step save** (`src/lib/sealedDb.js`) stands in for the database's transactions with the lock on: reads opened before the caller sees them, writes kept aside and seen by the transaction's own later reads, and, once the caller has nothing pending, one real transaction that checks nothing read has changed, then writes everything sealed. The caller's code is unchanged. `records.js` works a change out again after a conflict (up to four times); the few other places that open a transaction themselves (a collection, a saved search, a file, a quote's tags, a restore) report a conflict as a failed save instead, which is rare: it needs another tab or a reply to change the same record in the same moment.
- **(d) One change for both:** the command history no longer walks the store with a cursor, which a staged transaction cannot do; it reads the whole (at most 500 lines) instead, the same with the lock on or off.
- **(e) Tested twice:** the tests of records, erasing, rows, backups and the command history run again through the sealed database (48 tests, unchanged), beside tests of what lies on disk, conflicts, and sealing everything and opening it again record for record.
- **(f) Nothing is sealed yet in the app:** `db.js` answers through the sealed database only once a tab has a data key, which only piece 3's unlock gives.
- **Suggestion:** keep as built.

**C194. Setup and unlock, as built** (piece 3).
- **(a) Nothing before the unlock:** a gate in front of the whole app (`components/UnlockGate.jsx`) shows only the unlock screen while the lock is on and this tab holds no key; nothing of yours is read or drawn first. The screen speaks the language chosen (a preference kept readable), offers the passkey when the lock has one, the passphrase, and the recovery code typed any way (spaces, dashes, case), and says plainly what happens when all three are lost: clearing the site's data in the browser removes everything, and Parliament starts again.
- **(b) Each tab for itself** (C188): a new tab or a reload asks; "Lock now" in Settings locks this tab at once. Setting the lock up and turning it off both end with the page reloading, so nothing read before stays in memory, and the new passphrase is tried at once.
- **(c) Idle:** checked every 15 seconds against the last key press, click or scroll; at the time chosen the tab locks by reloading (closing the windows it popped out, C188), except while a reply is arriving, when it waits for the reply to end.
- **(d) Setup, in Settings, Data and backups:** a passphrase of at least 12 characters, typed twice, and the idle time; the recovery code shown once and confirmed by typing its last four characters; a passkey if the browser does not rule it out, kept only if unlocking with it works (C191); then the warning and a backup offered first, and "Encrypt and lock". Once on: the idle time, Lock now, the passkeys (each removable), Change the passphrase, Add a passkey and New recovery code (each asking for the passphrase), and Turn the lock off (asking for it too).
- **(e) Two databases, written in a safe order:** the lock's record first, marked unfinished, then everything sealed in one save and the saved keys sealed, then the record marked finished. A stop anywhere leaves data the lock opens, and an unfinished set-up is finished at the next unlock. Turning off opens everything first, then removes the record.
- **(f) Saved keys** are sealed with the data key while the lock is on and can be read only once a tab is unlocked; a key saved while it is on is sealed as it is saved.
- **(g) Other tabs** are told by a signal carrying nothing but its name, and reload.
- **(h) Checked in the in-app browser** on the production build at an empty origin (the trial copy shares the key database with the pane's own data, so a test lock there would touch real saved keys): a short passphrase and a wrong confirmation refused; a saved search sealed on disk; the unlock screen after the reload; a wrong passphrase refused; the recovery code typed in lower case with spaces; Lock now; a second tab asking for itself; turning off, with the second tab reloading and opening, and everything readable again. The origin was cleared afterwards. **Not tried:** a real passkey, which needs Touch ID, Windows Hello or a phone (for Stefan, on `npm run dev` in his own browser, with no trial copy on); the idle wait itself.
- **(i) New words** (the unlock screen and the lock in Settings) are drafted in the four languages too, with their terms in each glossary (passphrase, recovery code, passkey, unlock) and their doubts listed (`docs/translations/`).
- **Suggestion:** keep as built.

**C195. Backups, restore and Delete everything with the lock on, as built** (piece 4).
- **(a) Backups** are made through the lock, so a file holds your words as you wrote them, encrypted by its own password or not, as always; the lock adds nothing to the file and needs nothing from it. A restore with the lock on seals what it writes. Every backup ever written still restores. The tests of making and restoring backups run again through the sealed database.
- **(b) The copy before a database upgrade** opened the database on its own, and with the lock on would have copied sealed bytes; it now reads through the lock, as this tab is unlocked by then.
- **(c) The unlock screen** reads its language without opening the database for an upgrade, so the upgrade screen is still first to see a pending upgrade and offer its backup.
- **(d) Delete everything** removes the lock with the key database (C183); nothing else was needed.
- **(e) For any later upgrade of stored records:** with the lock on, the database's own upgrade step runs before anything is unlocked and can wait for nothing, so it cannot open sealed records. An upgrade that changes them must run after the unlock, as a pass that can be resumed, as the lock's own finishing does. Recorded here for the next version.
- **(f) One rare case left as it is:** a set-up cut short that meets a pending upgrade at the same unlock: finishing the set-up opens the database first, so the upgrade runs before its screen. Both are rare; together, rarer.
- **Suggestion:** keep as built.

## Part 16. Plans and running (added 23 October 2026)

Found while splitting stage 10 into pieces, after a read of every document on plans and running (docket spec, docket v12's header, the Almanac spec, which wins on running, the boards decisions, the settings spec, the security notes) and a survey of the code stage 2 left (the `dockets` and `runs` stores, branches and letters, steps that follow a chat's messages, an unused stop signal and per-plan lock between tabs). On screen the docket is the plan (C131); stored names stay.

**C196. Stage 10 in six pieces, and the points the documents leave open.** Pieces: (1) steps that can be planned, ahead of any run; (2) the plan board, with `new:step`, `new:run`, `new:plan`, `hold:`, `move:` and editing a step; (3) the runner: `run:`, `stop:`, `stop:all`, one tab per plan, and `undo:` stopping at a run; (4) one after another, with conditions (A15); (5) `diff:` and the step list block; (6) spending and the warning before a costly run, then the checkpoint. Each built as suggested below:
- **(a) Cards side by side.** v12 caps a screen at three cards; the shell has no limit on boards (C180) and cannot yet address two boards of one kind (AB §10.5). **Suggestion:** the plan board shows one plan at one run; `open:run 2` changes the run, and `diff:` sets two runs side by side inside the board. Several plans side by side waits for two boards of one kind.
- **(b) A run opens no tabs** (A §10 against A §4; C7, not ruled). **Suggestion:** as C7 suggests: steps run in the background, each branch's chat appears in Records and in any room showing it.
- **(c) Which chat a branch address means once it has run more than once.** **Suggestion:** its chat in the latest run that has one; an older one by `open:run 2` on the board.
- **(d) A step's status while its reply arrives, and after.** C92 stored a reply still arriving as `paused`. **Suggestion:** the runner marks the step `running` and keeps it so until the reply ends: `done` when it is whole, `paused` when it is stopped, fails or stalls (a resend is offered, never made by itself, C114). A step left `running` when its tab closes reads as `paused` once no tab holds that plan. A prompt typed into a chat by hand keeps C92's way until stage 11.
- **(e) Conditions** (A15). **Suggestion:** read from the step before's status, never from any text a model or source wrote: "after it finishes" (done), "if it fails" (paused by failure), "always", and, for a source, "if nothing is found" (an answer that found nothing).
- **(f) A prompt typed into a chat whose branch is running.** **Suggestion:** refused while it runs ("201b is running; stop:201b, or wait"); otherwise it becomes the branch's next step in that run, as D §3.2 has it.
- **(g) `open:` with a plan's number** opened its first branch until the board existed (C127). **Suggestion:** it opens the plan board, as A §4 has it.
- **(h) What a run costs:** its steps' replies, from the tokens each recorded; the naming request and summaries are counted where they always were (C132 (h)).
- **(i) A merge restore** rebuilds plans from chats, so planned steps and later runs would be lost (C93). **Suggestion:** fixed with piece 1, before any plan holds steps of its own.
- **(j) Stored data.** New optional fields, shown at the stage's checkpoint: on a step, `id`, `prompt` and `addedAt` for a step planned ahead, its model, and a room only where it overrides the branch's (C1); on the user message a run sends, `step` (the planned step's id); runs numbered past 1; a branch in a run with no chat until it runs. No new store and no version change.
- **Suggestion:** build as above.

**C197. Steps that can be planned, as built** (stage 10, piece 1).
- **(a) A step planned ahead** carries an id, its prompt, a model, a room only where it overrides the branch's, a condition, and when it was added. It stays through the chat's own messages, after the steps that started: a prompt typed by hand takes the next place, and the planned steps follow it. A step is never planned before one that started.
- **(b) The message a run sends names its step** (`step`), so the planned step and the turn are one step, keeping what it was planned with. The model a reply names is the one that wrote it; until a reply comes, the one planned.
- **(c) Running stays running:** a step the runner marks running stays so while its reply arrives; the runner says how it ended (piece 3). A prompt typed by hand keeps C92's way.
- **(d) Changes refused once a step has started:** its prompt, model, room and condition change only while it is planned. `hold:` turns a branch's planned steps to waiting in one run, and back; refused while the branch runs.
- **(e) Runs past the first:** `new:run` copies the latest run forward, every step planned again with its prompt (a sent step's prompt is the text that was sent), waiting steps still waiting, no chat until the branch runs; the run before is untouched.
- **(f) A plan with nothing in it** (`new:plan`): numbered, branch a named for the plan, no chat. A branch can be added with no chat, and a branch moved before or after another, keeping its letter.
- **(g) A merge restore** brings a plan holding steps of its own in whole, as its own plan with new numbers, its chats and messages pointed at their new ids; a plan whose chats are partly here already and the same is filed from its chats as before. A run's steps from a file are checked (status, prompt as text, ids, model, condition) and cleaned to the fields a step has.
- **(h) One change to the version 6 upgrade's plan:** a step's model now comes from its reply where the reply names one (before, from the chat). It touches only upgrades still to run (an old backup restored, a browser not yet upgraded), and only that field.
- **(i) Tested** plain and through the lock: planned steps through messages, a message naming its step, places, changes, holds, runs, empty plans, moves, the restore, and the checks.
- **Suggestion:** keep as built.

**C198. The Plan board, as built** (stage 10, piece 2).
- **(a) The board** shows one plan at one run (C196 (a)): the one `open:` named, kept in the space's context (`docket: '201'`, or `'201:2'` for an earlier run), else the plan changed last. Its head: the number, the title, "run 1 of 2", branches and steps, how many held. Each branch: its address, its name (a click picks it), how many steps, its room, its chat's number (a click writes `open:204`) or "no chat until it runs", and a status only when there is something to know. Each step: its number, one pip per run (filled where that run reached the step; a click shows that run), its words, its model or "as the branch", its status. An add row under each branch writes `new:step 201a` into the bar; one at the end writes `new:branch`. Hover and focus are ink: the mockup's gold hovers are not followed (CLAUDE.md, conventions).
- **(b) Only the last run changes.** An earlier run shows as "an earlier run, kept as it was", with no fields and no add rows; a change there is refused, pointing at `open:run 2`. v12 calls it "a record", which assumes it ran; an earlier run may never have started.
- **(c) A step not yet started is written on the board,** kept as typed (a moment after typing stops, and on leaving the field); one that has started shows the words that were sent, fixed. Writing in place is not a command line, so `undo:` does not take it back, as elsewhere.
- **(d) The commands,** each saying before Enter that nothing is sent: `new:plan`, `new:plan "Grant application"`; `new:step`, `new:step 201b`, `new:step "…"`, `new:step 201b "…"` (at the end of the branch picked on the board, the one named, or the only one; a chat's own number names its branch); `new:run`; `new:branch` with the Plan board addressed, or `new:branch "Shorter"` anywhere: a branch with no chat until it runs (`new:branch 201a` still forks, C178); `hold:201c`, `hold:201b,201c`, `hold:off 201c`, and `hold:` or `hold:off` alone for the picked branch, refused while it runs; `move:201c after 201a` and `before`; `open:201` opens the Plan board (C196 (g)); `open:run 2`; `open:201b` for a branch that has not run shows its steps there. A step added to a held branch waits too, and the line says so.
- **(e) A prompt with the Plan board addressed** is a step at the end of the picked branch in the last run: "Enter adds this as step 3 of 201a in run 1. Nothing is sent". The field names no one who answers. Where it goes is read again at Enter.
- **(f) `undo:` takes each back:** a step, a run, a plan (it goes; its number is not given out again), a branch, a hold, a move. Refused, with nothing written, if the plan changed since.
- **(g) Records shows a plan with no chat yet.** Before, only plans of two or more branches; a plan of one chat is still that chat.
- **(h) Copy:** the board is named as `{board}` in a sentence ("on the {board} board"), so its name comes from the strip, as C185 did for Settings. `open:` no longer says "its first branch"; those two messages are unused (R38).
- **(i) Open points,** built the cautious way until ruled:
  1. Removing a planned step, or a branch with no chat, has no command yet (v12 has `delete:201d` for a branch; removing a step is not drawn). **Suggestion:** the runner skips a step left empty (piece 3); removal waits for stage 11's editing, unless you want `rm:` on the Plan board now.
  2. Branch and plan names are not edited on the board (v12 has fields); `name:` renames a plan from Records. **Suggestion:** with stage 11.
  3. The branch picked on the board is per tab and not kept.
- **(j) Tested:** the commands' Enter lines; undo plain and through the lock; Records; `open:`. Tried on a trial copy made from the sample: `open:201`, `new:plan`, a prompt planned as a step (nothing on the network), a step rewritten in place, `new:branch`, `new:step`, `hold:`, `move:`, `new:run`, a pip to the earlier run, `open:224b`, and `undo:` of `hold:off`, a step, a run and a plan; phone width. The trial copy was erased.
- **Suggestion:** keep as built.

**C199. `delete:`, as built** (ruled 23 October, in the Rulings section; replaces the ruling of 15 October and the bar decisions' `drop:`).
- **(a) The word.** `delete:` takes the place of `erase:` in the registry, with the same forms and `delete:201a 2` for a step. `erase:` and `drop:` answer "That verb is now delete:" and write it in. It still runs on a line of its own (C99). Copy that said "erased" says "deleted"; the copy ids keep the old word.
- **(b) What has not been sent goes on one Enter,** and `undo:` brings it back: a step not yet started, in the last run ("Enter deletes step 2 of 201a in run 1. undo: brings it back"); a branch that has never run, in any run, out of every run, its letter not given out again (the plan goes with its last branch, and the line says so); a plan with no chat. A step that has started stays with its chat. Several things on one line with any of these is refused: "Delete what has not been sent on a line of its own".
- **(c) What has been sent asks for a second Enter:** the line reads "Enter, then Enter again, deletes 207 “Water tower” for good", names what stays and what goes too (C137), and says undo cannot bring it back. The first Enter arms it ("Enter again deletes it for good. Escape keeps it"); any typing disarms it, so an edited line asks for both Enters again.
- **(d) The ×** on a step not yet started, and on a branch that has never run, in the last run: it runs the `delete:` it stands for at once, and the bar says what it did, with undo. It shows when the line is under the pointer or holds focus, and always where nothing hovers. No × on anything sent.
- **(e) `delete:` alone** (or `delete:everything`): "Delete everything is a button at the foot of Settings. Enter opens it there." No `wipe:`.
- **(f) Tested:** each path's Enter line and act; the records side plain and through the lock (a step, a branch, a plan, the refusals, undo). Tried on a trial copy made from the sample: × on a step and on a branch, undo, `delete:` on an empty plan and undo, a chat deleted with two Enters, an edited line disarmed, Escape, `delete:` alone, `erase:` and `drop:`. The trial copy was erased.
- **Suggestion:** keep as built.

**C200. The runner, as built** (stage 10, piece 3; almanac spec §5; C196).
- **(a) What `run:` runs.** Alone: every branch of the plan's last run with a step ready, not held, paused or running; the branches side by side, each branch's steps one after another, each sent once the reply before it has come back whole. `run:201b`: that branch where it has a step ready, or else the next run, made for it, the other branches waiting in it (A §5 item 2, read as "nothing left ready" rather than "any step started", so steps planned after a chat carry it on). A step left empty is skipped (ruled 23 October). A step that fails, stalls or is stopped pauses, saying why, and its branch stops there (conditions come with piece 4). `run:` alone leaves a paused branch, and says `run:201b` carries on from where it stopped.
- **(b) The Enter line** names how many steps, of which branches, in which run; who answers them, from the list; what goes before any reply, as "at least", since each step also sends the replies before it; that steps answered on this computer send nothing out; empty steps skipped; and that undo stops at a run. It refuses a step whose answerer needs a key, is not built, is gone or is unchecked, and a branch held, running, or with nothing to run; an earlier run is a record.
- **(c) Each step is sent as a prompt typed in its chat is:** to who answers it (the step's model, else the chat's, else the default), with the chat's frameworks, the reply language and the privacy filter, the message naming its step. No title request follows: a chat a run makes is named for its branch. A branch with no chat gets one in its first run, numbered and filed in the plan, the run and the branch, in its room or the default room. A run opens no tabs (C196 (b)): its chats show in Records and in any room showing them.
- **(d) One tab runs a plan** (a Web Lock per plan); from another: "Plan 201 is running in another tab". A step left running when its tab closed reads as paused, "its tab closed", once no tab holds the plan, checked whenever the Plan board reads it.
- **(e) `stop:`, `stop:201b`, `stop:201`, `stop:all`** as A §5: the running tab hears it over the bus (ids and signals only); `stop:all` also stops every reply in every window; `stop:` alone stops the plan on the Plan board, or the reply arriving in the room. The step running pauses, "stopped"; what is done stays done.
- **(f) `undo:` stops at a run.** The lines before it can no longer be taken back, and `undo:` says so before Enter: "Run 1 of plan 201 has started, and undo stops there. The plan is still yours to change: new:run plans it again."
- **(g) A prompt typed into a chat whose branch a run is sending to** is refused, before Enter when this tab runs it and at Enter from any tab (C196 (f)): "201b is running. stop:201b, or wait". The lock's idle clock waits while a run goes.
- **(h) Plans of one chat:** `open:` with such a plan's number opens it on the Plan board, though Records lists only the chat; `plan:` alone shows the plan of the chat in the room on screen.
- **(i) Stored data:** a paused step's `ended` ("stopped", "failed", "stalled", "left"), checked in backups. No new store, no version change.
- **(j) Open points,** built the cautious way until ruled:
  1. **Choosing who answers a step.** A step planned with no model goes to its chat's answerer, or the default. The board has no picker yet (docket spec §8 draws one in the step's marginalia). **Suggestion:** with the step list block, piece 5.
  2. **A source that reads only English:** a typed question is translated before it goes (C85); a run's step goes as written. **Suggestion:** the same translation, named on the Enter line, with piece 4.
  3. **After a stopped step,** the next step goes into a chat whose last prompt has no whole reply, so a model sees both prompts, as in a typed chat (seen on the trial: the local model answered the earlier one). **Suggestion:** keep; the board shows the stopped step.
- **(k) Tested:** the runner with every effect faked (order, empty steps, a failure, `stop:`, another tab, the next run); the records plain and through the lock; the Enter lines. Tried on a trial copy with a model on this computer (Ollama), nothing sent anywhere else: a run to the end, `stop:219a` and `stop:` partway through a reply, a prompt refused while its branch ran, a reload mid-run leaving "its tab closed", and `undo:` stopping at the run. Found and fixed there: the message a run sends lost its step on the way into storage. The trial copy was erased.
- **Suggestion:** keep as built.

**C201. One after another, with conditions, as built** (stage 10, piece 4; A15; C76; C172 (d); C196 (e); branch slider v9).
- **(a) The four conditions,** read from how a step ended, never from what a model or source wrote: once the step before finishes (the default: it answered, or a source found nothing), if it fails (failed, or the network held the reply), if nothing is found (a source answered and found nothing), and whatever happens. Nothing runs after a stop. A source that finds nothing is an answer, not a stop (it was read as stopped in piece 3, and is fixed).
- **(b) Whose ending a condition reads: the last step before it that ran,** not the one just above it. So a fallback that was not needed does not block what follows: Wikipedia, then a model "if nothing is found", then "once the step before finishes" runs after Wikipedia when Wikipedia found something. C196 (e) says "the step before"; this reads it as the step before that ran.
- **(c) A step not run on its condition** waits, saying "its condition was not met", and keeps its place in the branch. A step blocked by a failure stays ready and its branch stops there, as in piece 3, so `run:201b` carries on once the cause is fixed. `hold:off` lets go both kinds of waiting.
- **(d) Within a branch, on the Plan board:** each step after the first says when it runs; a click on a step not yet started goes through the four. Writing in place, it is not a command line, so `undo:` does not take it back.
- **(e) One prompt to several, one after another** (slider v9): with two or more ticked, the picker offers All at once or One after another, and under each after the first, when it runs; a click goes through the four. Held for the next prompt only, as the choice of several is (C172 (c)). As chosen, else if nothing is found after a source and if it fails after a model (v9 starts each on "if nothing is found", which never happens after a model). The Enter line names each in order with when it runs and its cost, and the total as what goes if every one runs. The branches are made as for all at once; the prompt is planned as a step in each, with its condition, and the runner sends them in turn, as a run of the plan, holding the plan's lock. The bar says afterwards which did not run: "219b did not run: its condition was not met".
- **(f) A step to a source that reads only English** goes translated first, as a typed question does (C85; the C200 suggestion), and the run's Enter line says so; the typed prompt and the run share one function for it.
- **(g) Stored data:** a waiting step's `ended`, "unmet"; a planned step's `condition` (the field from C196 (j)). Both checked in backups. No new store.
- **(h) Open points,** built the cautious way until ruled:
  1. **A tab for a branch not yet sent.** v9 draws one, "Waiting. Runs if 201b fails."; a branch shows in the slider only once its prompt has gone, and one that did not run shows on the Plan board. **Suggestion:** with the step list block, piece 5.
  2. **One after another from the bar.** `by:` with several sends all at once; the order and the conditions are chosen in the picker only. **Suggestion:** `by:wikipedia then sonnet`, each `then` "if nothing is found" after a source and "if it fails" after a model, changed in the picker; ask.
  3. **`include:` with one after another** is refused for now ("All at once does"). **Suggestion:** with piece 5.
- **(i) Tested:** the rule table; fallbacks, a failure and a chain, with every effect faked; the Enter lines; the records plain and through the lock. Tried on a trial copy with a model on this computer: three steps with the middle one "if the step before fails" (the first and last ran, the middle waited in its place), and one prompt to the local model then Wikipedia "if nothing is found" (the model answered, Wikipedia never ran, nothing went out). Found and fixed there: the shell's button reset outranked the Plan board's and the picker's button styles (pips' rings, the add rows' spacing, the ×'s hover, the picker's condition line); and steps that waited moved to the end of their branch. The trial copy was erased.
- **Suggestion:** keep as built.

**C202. `diff:`, the step list, and the points folded in, as built** (stage 10, piece 5; docket v12; AB §3; Lab v7; C196 (a); C200 (j); C201 (h), ruled 23 October).
- **(a) `diff:`** sets the run before beside the run on the Plan board (run 2 beside run 1), `diff:1` a run named, `diff:off` one again. What differs is marked in ink on both sides, as v12 draws it: a bar beside each line that differs (its words, who answers, its room or its condition), a pale wash on the words only that side has, "not in run 1" where the other run has no such step or branch. Space never counts. The run beside is read-only; on a narrow board the two stack. Kept in the board's context (`201:3+2`); `open:run` shows one run again.
- **(b) Who answers a step** (C200 (j) 1): a click on a planned step's model, or "as the branch", opens the picker under the bar, headed "Who answers step 2 of 201a", with "As the branch, now Sonnet 5.5" to let the branch decide. A model with no key writes `api:` instead. Applied at once, like writing in place, so outside `undo:`.
- **(c) `by:wikipedia then sonnet`** (ruled): `then` between names sends one after another; commas, all at once. Ticking in the picker keeps the order held; changing the order sets each condition back to its default.
- **(d) `include:` with one after another** (ruled): each model that runs gets the answers `include:` holds, as all at once does; sources get the words alone.
- **(e) The slider's waiting tab** (ruled): a branch whose turn has not come shows "waiting", and "Waiting. It runs if nothing is found before it."; one that did not run shows "did not run", and "It did not run: its condition was not met." For the room to find them, the steps of a prompt sent one after another carry its group.
- **(f) The step list,** a block a room can carry (AB §3; Lab v7): "Step list" in the catalogue, room only, placed today with the room editor (`/edit`), by the Lab later. It follows the room's chat: its branch's steps in its run, or in every run; or a plan pinned by its number, every branch. Each step's words as text and its status; the plan's number writes `open:` into the bar. It reads the plan through a store hook, never the database itself, and changes nothing.
- **(g) Stored data:** a planned step's `group` (the prompt to several it is one of), checked in backups. No new store.
- **(h) Open points,** built the cautious way until ruled:
  1. **Trial copies draw rooms blank:** the sample backup's rooms carry no blocks, so the slider and the step list were tried after giving the trial room two blocks by hand. **Suggestion:** give the sample's rooms the messages and input blocks (the sample file only), so a trial copy shows rooms.
  2. **The step list's settings** (this run or all runs, this chat or a pinned plan) are set in the room editor only. **Suggestion:** with the Lab, stage 13.
- **(i) Tested:** the comparison both ways; `diff:`, `by:` with `then`, the waiting tab, a step's group; the include line for one after another. Tried on a trial copy with a model on this computer: two runs side by side; a step's answerer chosen and let go; `by:bonsai then wikipedia` with Wikipedia "if nothing is found" (the model answered, the slider showed Wikipedia "did not run", nothing went out); the step list in the room's sheet, its link writing `open:219`. Found and fixed there: the step list's class name was the welcome page's, so its look was the welcome list's; `by:` alone opened the picker still choosing for a step; a source showed by its id on the board; with no answerer of its own a step showed two rows ticked. The trial copy was erased.
- **Suggestion:** keep as built.

**C203. Spending, as built** (stage 10, piece 6; settings spec §9; C181 (d) and (e)).
- **(a) This month** in Settings: one sentence of what was spent, in how many runs of plans and how many chats on their own, from the tokens each reply recorded, by the month it came. A run is a plan's chats in one run, where the plan has several branches or began with no chat, and any run past the first; a chat that is its own plan, run once, is a chat. Chats whose cost is not known are counted and said, never guessed (as C181 (e)).
- **(b) The four costliest runs** this month, each as its plan's number, title, run and cost; a click shows that run on the Plan board. With no run this month, the costliest chats stand in, as before.
- **(c) Warn before a costly run:** Off, $0.50, $1, $5, in Settings and as `set:warn off`, `set:warn 0.50`, `set:warn 1`, `set:warn 5`. At or above it, `run:`'s Enter line leads with what the run costs before any reply ("At least $3.00 to send: more than the $1.00 you asked to be warned at. Enter runs it all the same"). It warns; it stops nothing, as the spec has it. Stored as the setting `runWarn` and carried in backups.
- **(d) Open points:**
  1. **Hard limits:** each provider sets its own; the spec has Settings link to each provider's limits page rather than pretend to enforce one, and C181 (d) left it for stage 10, once each page is checked. Not built: the pages have not been checked. **Suggestion:** add the links once you confirm I may look them up (one page per provider, read only).
  2. **The monthly budget alert** stays off the board with R28.
- **(e) Tested:** the run and chat counts, a month's edges, `set:warn`, the line leading with the cost. Tried on a trial copy: the Settings row sets and shows the amount. The trial copy was erased.
- **Suggestion:** keep as built.

**C204. The stage 10 checkpoint's approved items, as carried out** (24 October; Rulings, 24 October).
- **(a) R38.** The four Enter-line messages are out of `src/copy.js` (`enter.openDocket`, `enter.openDocketHere`, `enter.erase`, `enter.promptManyOrderInclude`), and `npm run i18n` took them out of every catalogue. Nothing said them. The registry's test still listed `erase` among the answers the registry gives, which it has not since C199; it no longer does.
- **(b) The sample backup's rooms** (C202 (h) 1), in `src/lib/__fixtures__/sample-v5.json` only. Writing Studio (`mode_ws`, three panels) gets the messages and input blocks, in the conversation's place and the input's. The Essay room (`mode_essay`) gets the same, and its layout changes: `two-column@^1.0` was never one of Parliament's layouts, so the room drew only "Layout two-column@^1.0 is not registered". It is now `single-column-with-sheet@^1.0` (one column, with a sheet), so it draws, and a trial copy shows a second layout. What the tests expect of the sample held (its rooms' ids and names, the Writing Studio template, the counts). A new test checks that every room in the sample has a layout Parliament has, with the messages and input blocks in places that layout holds. Tried on a trial copy made from the sample: 209 in the Essay room and 202 in Writing studio both draw. The trial copy was erased.
- **(c) Hard limits** (settings spec §9; C203 (d) 1). Each provider's page for a monthly spending limit, read on the provider's own documentation on 24 October 2026, nothing signed in to:
  - Anthropic: the Billing page, `platform.claude.com/settings/billing`, its "Spend limits" part. A limit set there sits below the cap of the account's tier, and requests stop when it is reached.
  - Mistral: `admin.mistral.ai/organization/billing`, the organization's limit (a lower one per workspace is set under its workspaces). Access stops until the next month, or until the limit is raised.
  - Ollama runs on this computer and bills nothing, so it has none.
  Each is a `limitsPage` in the list of providers (`src/net/list.js`), beside `keysPage`: a link the person opens, never fetched. Settings' Spending section gains the row Settings v1 draws: "Hard limits", "For a cap that actually stops spending, set a monthly limit with each provider.", then each provider's name, from the list, as a link that opens in a new tab. Searching "cap", "limit", "billing" or a provider's name finds it. **The connection policy is unchanged:** a link is a page the person goes to, not a connection the page makes, so no host is added to the policy (`src/net/list.js`'s origins, `netlify.toml`); a test checks that neither page's host is in it. Tried on the trial copy: the row, both links, the search.
- **(d) The step list's settings** wait for the Lab (stage 13), as ruled. Nothing done.
- **(e) Found on the way:** the dev server and the build stopped on a style error, "Invalid code point". Tailwind reads every file in the project that git does not ignore, looking for class names, and the new handoff note `continuation-after-stage-10.md` holds a Windows path whose `\cc1ddf…` reads as a CSS escape for a character that cannot exist. `src/index.css` now tells Tailwind to skip `continuation-*.md`. The notes are unchanged.
- **(f) Open points:**
  1. **Anthropic's key page.** The keys link still names `console.anthropic.com/settings/keys`, which now sends every visit on to `platform.claude.com/settings/keys` (checked 24 October, headers only). **Suggestion:** point the link at the new address, so it does not lean on the redirect.
  2. **Currency.** Mistral's limit is in the organization's billing currency, which may be euros; the row names no currency. **Suggestion:** keep; the provider's page says.
- **Suggestion:** keep as built.

## Part 17. Editing in place (added 24 October 2026)

Read before planning stage 11: the editing spec (6 October), the welcome v9 spec, the plan's stage 11, the code audit `research/editing-code.md`, C54, C58, C61 and C91, and what stage 10 left (a step not yet sent is written on the Plan board; a sent one is fixed, C198 (c)).

**C205. Stage 11 starts with a spike: the plan, and what it needs first.**
- **(a) Why a spike.** Editing a reply means typing into text the browser draws, and the browser's own behaviour differs between browsers, input methods and phones. Striking instead of deleting is the hard part: every keystroke that would remove words must mark them instead, and the struck words must stay in the text, selectable and read out by a screen reader. Nothing in the code does this (the audit: Secretarybird compares against a saved copy and draws strikes in a layer above the text; the mockup stores HTML). So two small prototypes are built and tried against one checklist before anything is built for real.
- **(b) The two prototypes,** on a throwaway page `/dev/editing`, like `/dev/popout`: in development only, and in a production build only when built with `VITE_PROTOTYPES=1`. Neither reads or writes stored data; both edit the same sample reply, held in memory.
  - **A. The browser edits; Parliament keeps the record.** One editable area per reply. Each change the browser is about to make is announced first (the `beforeinput` event: typing, deleting a word, a new line, a paste); Parliament applies it to its own model of the reply (blocks of text with their marks) and draws the result, so a deletion becomes a strike there. Where the browser cannot announce a change ahead (text composed with an input method, some Android keyboards), Parliament reads what changed afterwards and reconciles. No new package.
  - **B. An editor framework: ProseMirror** (MIT licence). It does A's reconciling already, with years of fixes for input methods and Android, and lets every change be looked at before it lands, so a deletion can be turned into a strike. A reply is held in a schema Parliament writes (the spec's block kinds and the marks C58 allows), so nothing else can get in. It would be a new package in the build, run as part of Parliament's own scripts: the connection policy is unchanged. One framework is enough to compare with A; ProseMirror is suggested because it is the base several well-known editors are built on (Tiptap among them) and has the longest record with input methods.
  - **Both do the same things:** a sample reply with headings, a list, bold, a link, a table, a chart and a paragraph in Japanese; deleting strikes; typing adds words in blue; typing over a selection strikes and adds, as one edit; deleting your own added words removes them; Enter splits a block and Backspace at its start joins it to the one above; `/` at a line's start opens the block menu; beside the reply, each edit listed with its id, block and place, to see that it survives a split and a join; the browser's own undo off.
- **(c) The checklist,** each item tried in each prototype and the result written down:
  1. **Composing:** Japanese and Chinese typed with the Windows input method, including a conversion cancelled half way, and the Enter that confirms a conversion (it must not split the block).
  2. **Android:** the phone's own keyboard and Gboard, with word suggestions and swipe typing.
  3. **Selection across blocks:** from the middle of one block into the next; deleting it strikes both parts as one edit; typing over it.
  4. **Paste:** text copied from a web page or a document arrives as plain text (the stage's security rule); a paste over a selection strikes the selection.
  5. **Undo:** the browser's own undo does nothing in a reply; undo on an edit brings the words back exactly.
  6. **Screen readers:** Narrator (built into Windows) and NVDA read struck words as removed and added words as added, not as one run of text.
  7. **Also:** speed on a long reply (about 5,000 words); struck text still selectable and copied; how the model's own formatting looks once edited (C58).
  Tried in Chrome and Firefox on this computer (Chromium and Gecko; LibreWolf and Zen are Gecko, `browsers.md`).
- **(d) What comes out:** `research/editing-spike.md`: the checklist for both, the size each adds to the app, what each makes easy or hard later (asks, Ripple, sweeps), and a recommendation. You choose. The prototypes then move to `src/deprecated/` or go, on your approval.
- **(e) Needs from you before it starts:**
  1. **C58,** because it decides what a reply is made of in both prototypes. Suggestion as C58 has it: the model's bold, italics, inline code and links are kept and shown as marks on the words, never added or removed by you (formatting is not an edit); tables and charts are whole blocks that can be struck or asked about as a unit, not edited inside, at first. The reply's original text stays stored beside its blocks, unchanged, because the model goes on reading the original (spec, "When edits reach the model").
  2. **A yes to fetch ProseMirror's packages** from the npm registry for prototype B, as the spreadsheet package was asked for in stage 1. They stay on the spike's branch of work until you choose.
  3. **Your hands** for what a script cannot do: typing with a Japanese or Chinese input method, an Android phone, a screen reader. About twenty minutes per prototype. A phone reaches the dev server over the home network only while it is started for that (`vite --host`); an Android emulator on this computer is the other way.
- **(f) After the spike:** the choice of engine; C91 (whether Secretarybird's stored comments and suggestions become asks and suggestions in the Collection, or stay in Drafting Desk as they are); and whether A7 and A9 still stand as ruled on 15 October (welcome step 10 becomes "Send it with your next prompt"; an answered prompt stays a record, and editing it marks it up, with "ask again" making a new branch).
- **(g) Also waiting on stage 11, from earlier rulings:** plan and branch names edited on the Plan board (ruled 23 October, C198 (i) 2); the Secretarybird fix stranded on `refactor/main` to check (C65).
- **Suggestion:** as above. Nothing is built until (e) is answered.
- **(h) After Stefan's questions (24 October).** C58 is ruled (Rulings). He asked what ProseMirror is needed for, and has no Android phone.
  - **What it is for:** everything a browser lets someone do to text besides plain typing: composing Japanese or Chinese before it is committed, phone keyboards that rewrite whole words, spelling corrections, drag and drop, paste, a selection across paragraphs. Each, handled wrongly, can lose or garble the person's words. ProseMirror has years of fixes for them, and tracked changes (the same idea as striking instead of deleting) have been built on it before; Parliament writes its own rules on top. Its costs: a new package in the app (bundled like the Markdown and chart libraries, and it sends nothing anywhere), its own way of describing a document that the spec has to fit, and trust in its author.
  - **Revised suggestion:** with no Android phone, the cases where a hand-built engine (A) most often fails cannot be tried, and A would mostly rebuild what ProseMirror already does. Build the spike on ProseMirror only, against the checklist and the v5 mockup's own scenario (edit 201a's reply, edit 201a's prompt, the line counting what goes with the next prompt); bring A back only if ProseMirror fails a check. Android is written down as untried until a phone or an emulator is at hand.
  - **Stefan's part:** typing Japanese or Chinese with Windows' own input method (added under Windows' language settings), and Narrator (Ctrl+Windows+Enter) on a struck line: about fifteen minutes. Chrome and Firefox are tried by script here.

**C206. Stage 10's English, as the four drafters read it** (24 October). Drafting stage 10's words into Japanese, Chinese, Swedish and Finnish turned up English lines that say two things, or more than is true. Nothing is changed until ruled: a changed English line needs its four drafts again. Each drafts the English as it stands.
1. **Warn at the amount, or only above it.** The code warns when a run costs the amount set or more (`planVerbs.js`, `total >= f.warn`), as C203 (c) and `set:warn`'s line ("when it is {cost} or more") say. Settings' help says "Above this", and the warning itself "more than the {warn} you asked to be warned at"; the settings spec says "Above this amount". At exactly $1.00 they disagree. **Suggestion:** keep the code, and say it in both lines: "At this or more, the line under the bar leads with what a run costs, before Enter." and "At least {cost} to send: as much as the {warn} you asked to be warned at, or more. Enter runs it all the same".
2. **"Whatever happens."** The fourth condition reads "runs whatever happens" in the picker and on the Plan board, and "whatever the one before does" on the Enter line. Nothing runs after a stop (C201 (a)), so both say too much. **Suggestion:** one wording in all three: "runs however the one before ends, unless it is stopped".
3. **`delete:` mixing unsent and sent things.** "Delete what has not been sent on a line of its own" can be read as "delete the things that sit on a line of their own". **Suggestion:** "Put what has not been sent in a delete: line of its own".
4. **"Paid for."** `stop:`'s three lines say what is done "stays done and paid for", which reads either as "charged as usual" or as "already paid, so it is yours". **Suggestion:** "What is done stays done, and its cost stands".
5. **"# held"** at the head of the Plan board does not say what is held. **Suggestion:** "{count, plural, one {one branch held} other {# branches held}}".
6. **Smaller, each noted by one drafter:** "in a slider" (the picker's All at once) is the mockup's word and may mean nothing to a reader; `by:` with `then`, "each after the first on its condition", is compressed; the step list's "shows the whole plan" is half a sentence joined on screen to its `open:201` link (the README's open point on sentences joined from two entries); `run:`'s "At least N tokens to send, {cost}" leaves unsaid that the cost is a minimum too; "carries on from where one stopped" does not say which. **Suggestion:** take these with the plain-language pass on names (A6), and 1 to 5 now.

**C207. Which rooms get in-line editing, and when** (Stefan's direction, 24 October: one solid room first, every room with in-line editing, push back if the others are ready too).
- **Every room built today draws its conversation with the same block,** messages: Writing Studio and Quiet Room in their middle column, Pocket Chat in its one column, Data Workspace and Drafting Desk in a side chat panel. Editing built into that block reaches every room at once; no room needs editing built for it.
- **What differs by room is around the conversation:** Drafting Desk's main surface is Secretarybird's document editor, a second way of editing the same kind of text, with its own comments, suggestions and Ripple (C91); Data Workspace has charts and tables from a spreadsheet; Pocket Chat is laid out for a phone, not yet tried on one (C94); Kingfisher and Starling were never built.
- **Suggestion:**
  1. Build in-line editing into the messages block, and make Writing Studio, the room a new chat starts in, the solid room: everything v5 draws is built and tried there first.
  2. Quiet Room and Pocket Chat get it as they are, checked once at the end of stage 11. Data Workspace's chat panel gets it; its canvases do not change.
  3. Drafting Desk is the room to merge. Once in-line editing, asks and Ripple (stages 11 and 12) do what Secretarybird does, its retirement into Writing Studio is proposed as an R line, its stored documents still readable and shown (C91). Nothing goes before you approve that line.
  4. Kingfisher and Starling wait for the Lab (stage 13).

**C208. The editing spike, as built** (stage 11; C205 (h), ruled 24 October; `research/editing-spike.md`).
- **(a) What it is.** `/dev/editing`, in development or a build made with `VITE_PROTOTYPES=1`, never in an ordinary build: Writing studio's column with the v5 mockup's Murano story in branches 201a, 201b and 201c, a reply with every kind of block, and one of 5,000 words. The prompt and the reply are edited in place; a card per edit (find, hold back, undo); the line counting what goes; the note the model would be told; your part of the checklist; a log of what the browser reports. Nothing is stored or sent. In `src/spike/editing/` and `src/views/EditingSpike.jsx`, with 21 tests.
- **(b) How the rules sit.** On every change ProseMirror makes from what the browser did, not on keys, so they hold for any kind of typing: deleting the model's words strikes them; typed words are the person's, in blue, with an edit id; typing over a selection strikes and adds as one edit; deleting the person's own words removes them; splits, joins, block types and checklist ticks are formatting. Edits are anchored to a block id and offsets; one split by Enter keeps one id.
- **(c) ProseMirror and safety.** Five packages and two helpers by one author (MIT), no install scripts, each pinned to an exact version public for at least a month. Its code has no network calls, no running of text as code, no storage; the one HTML parse (a pasted or dropped clipboard, in a detached document) is never reached, because paste and drop are taken first, as plain text. About 187 KB, 58 KB compressed. The install's audit found three advisories already in the app, in build and lint tools only (`fast-uri`, `serialize-javascript`, `zod`), none in what reaches the browser.
- **(d) Tried by script in Chromium,** all as the spec has it: the v5 scenario (reply and prompt), Backspace, a strike across two paragraphs, Enter, a formatted paste (plain text only, no script ran), Ctrl+Z (nothing, and it says why), undo on a card (exact), the `/` menu, Backspace at a heading's start, a checklist tick, a table struck whole and restored, whole characters in Japanese and emoji, 0.6 to 5.1 ms per change on 5,000 words, and no policy violation under the real headers.
- **(e) Waiting for Stefan:** Japanese and Chinese with the Windows input method, composing over a selection, Narrator, a spelling correction, and Zen or LibreWolf (no Firefox driver here, so the Gecko engine was not tried by script, as C205 (h) hoped). Android untried. The engine is chosen after these.
- **(f) Open points,** each built the cautious way in the spike:
  1. **A word swapped whole** (autocorrect, a suggestion, a composed word committed) arrived as the smallest difference ("shor" struck, "ghos" added, the "t" kept). Swaps of the model's words are widened to whole words, in scripts with spaces between words only. **Suggestion:** keep.
  2. **Typing after Backspace** puts the new words before the strike ("feet ~~heels~~"), as tracked changes in a word processor do; typing over a selection puts them after. **Suggestion:** keep; the card reads struck → added either way.
  3. **Words typed beside an old strike join its edit.** **Suggestion:** in the build, never join an edit already sent; start a new one.
  4. **Drag and drop in a reply** is off. **Suggestion:** off in the build too, at first; moving words is a strike and an addition at once.
  5. **Lists are flat blocks,** which a screen reader does not hear as a list. **Suggestion:** real lists, or the matching labels, in the build.
  6. **Copying ProseMirror into the repository** (as C72 for the spreadsheet library), so any update is a change in git read line by line. **Suggestion:** yes, if ProseMirror is chosen.
  7. **The three advisories in build tools** (c). **Suggestion:** a small update of those tools on its own, after the spike; nothing that reaches the browser is affected.
- **Suggestion:** try your part of the checklist; the engine is chosen with what it finds.

**C209. Stefan's first try of the spike, and what changed** (25 October; `research/editing-spike.md`, "Stefan's first try").
- **(a) Worked as built,** in Chrome on Windows: Japanese and Chinese with the input method, paste, spelling correction, the long reply, most of Enter, Backspace and `/`.
- **(b) Fixed or changed, each waiting for his second try:**
  1. **Composing over a selection** ("the cursor jumps back and typing starts within the struck word"): the selection was struck when composing began, after the input method had taken its place. It is now struck on the input method's first key (229), before composing begins.
  2. **Selection across blocks** ("not able to highlight"): a drag starting inside a selection began a drag and drop, which is off, so nothing was selected. A press inside a selection now starts a new one.
  3. **The table** ("any edit crosses out entire table. need greater delineation"): typing or pasting on a selected table, chart or divider changes nothing and says why; Enter starts a line after it; its edges show on hover, a selected one has a frame and a line saying it is one block for now, a struck one a rule and "Struck as a whole: edit 244". Editing inside a table comes later in the stage, as ruled (C58).
  4. **Narrator** ("still reads word"): the words "removed" and "added" are now real, unseen words at each mark's edges, which Narrator reads in line; Japanese and Chinese lines carry their language (Narrator reads them with the language's voice, installed in Windows).
- **(c) Undo:** "works. but did not cancel the strikethrough". Undo on a card was not at fault: a stress test of 400 random runs, every edit undone from its card, always brings every word back, with nothing left struck (`track.fuzz.test.js`). Read as Ctrl+Z, which the editing spec turns off in a reply ("Undo is on the card. The browser's ⌘Z is turned off in replies, because it does not understand struck text"). **The question:** should Ctrl+Z (Cmd+Z) undo the last change, as people expect? The browser's own undo would stay off; Parliament would keep a history of its own changes, which understands struck words, so Ctrl+Z would bring a strike or a word back exactly as it was, one change at a time, and Ctrl+Y would redo. The cards keep their undo, which takes back one whole edit wherever it is. **Suggestion:** yes, both. It changes the spec's line, so it is yours to rule. No new package: ProseMirror's own steps can be undone.
- **(d) Still untried:** Zen or LibreWolf (Firefox's engine), Android.
- **(e) (c) as ruled, built in the spike** (25 October): Parliament keeps its own history of every change in a reply or a prompt, as the exact steps that take it back (`src/spike/editing/history.js`, no new package). Ctrl+Z (Cmd+Z) takes back the last change, strikes and all; typing done in one go (changes less than half a second apart) comes back as one step; Ctrl+Y and Ctrl+Shift+Z redo; Undo and Redo from the browser's own menu go to the same history. An undo from a card is a change like any other, so Ctrl+Z after it brings the edit back. Tested (6 tests), and tried in the browser: five Backspaces came back in one step, then a word typed over, then redone, then undone from the menu.
- **Suggestion:** try composing over a selection, selection across blocks, the table, Narrator and Ctrl+Z again. A reminder is set for 22:00 on 25 October.

**C210. Stage 11 in pieces, once the engine is chosen** (proposed 25 October; the editing spec, the welcome v9 spec, C54, C56, C58, C61, C91, C205 to C209). Nothing is built until you choose the engine after your second try (C209). Each piece is committed and checked before the next, as stage 10 was; where a point is open it is built as suggested, so a ruling changes one entry.
- **The pieces:**
  1. **The editor in the room.** The spike's rules moved into the messages block, so every room has them (C207), tried in Writing Studio first: striking, your words in blue, Enter, Backspace and `/`, paste as plain text, Ctrl+Z and Ctrl+Y (C209 (c)), markup · clean. A reply's editable form is stored the first time it is edited; its original text stays as it is, because the model goes on reading it. Each edit is a record with a number from the shared counter (C56), in the edits list the version 6 upgrade made empty for this. Backups carry both.
  2. **Prompts edited in place.** Each branch keeps its own copy of the first prompt; an answered prompt stays a record, and editing it marks it up (A9, C61); "ask again as 201d" makes a new branch from the edited wording. Plan and branch names edited on the Plan board come with this piece (ruled 23 October, C198 (i) 2).
  3. **Edits reach the model.** The line under the bar counts what goes ("3 edits go with your next prompt to 201a"); the note goes once, with the next prompt to that branch, as text only; "hold back" keeps one yours; Enter on an empty prompt sends just the edits; each card then reads "sent to Sonnet 5.5"; branch tabs count what waits. On a source's branch (Wikipedia), edits go to a model you choose, never to the source. The Enter line names who reads them and the cost, as every line does.
  4. **Asks.** Typed in place, tied to a passage or a point (Ctrl+K), kept as "ask 241" and a card, answered in place in green with accept or undo, sent with the next prompt or an empty Enter.
  5. **The Collection's cards.** Edit and ask cards, the Edits and Asks tabs (A16), `type:edit` and `type:ask` as filters on Records (C56), finding in both directions, markup · clean in the Collection.
  6. **Tables, then charts, edited inside** (C58, ruled 24 October).
  7. **Welcome steps 9 and 10** (A7: step 10 becomes "Send it with your next prompt"), `strikethrough:`, `markup:`, `tell:`; then the checkpoint, with Drafting Desk's future and C91 put to you.
- **Open points,** each with its suggestion:
  - **(a) Stored data** (shown before piece 1 writes anything): a reply's editable form as a new optional field on its message, `blocks` (each block's id, type and text, with the marks of edits; never markup); each edit a record in the existing `edits` list (number, chat, message or prompt, branch, what it struck and added, its place, held or sent, to whom and when); each ask likewise in `asks`. No new list and no version change. **Suggestion:** as above.
  - **(b) What the model reads after a prompt that carried edits.** The note goes once; in later turns it stays with the prompt it went with, so the model's history keeps it where it was told, never repeated. **Suggestion:** yes.
  - **(c) Prompt edits and the model** (the editing spec's own open question): told as a change ("your prompt said short story; it now says ghost story"), like replies, or read as the question it now is. **Suggestion:** told as a change; "ask again" is the way to send the edited wording as the question itself.
  - **(d) An edit beside one already sent** starts a new edit, never joins it (C208 (f) 3). **Suggestion:** yes.
  - **(e) ProseMirror's code copied into the repository** (C208 (f) 6, as C72 did for the spreadsheet library), so an update is a change in git that can be read line by line. **Suggestion:** yes, with piece 1.
  - **(f) Lists** read as lists by a screen reader (C208 (f) 5). **Suggestion:** decided in piece 1, with a Narrator check.
  - **(g) Asks' answers from the model** come back marked with each ask's number, read as text only, never as markup; an answer whose passage has changed since goes on its card only. **Suggestion:** yes.
  - **(h) A reply's language** for spelling and screen readers comes from the reply language (C166), not a guess from the script, as the spike does. **Suggestion:** yes.
  - **(i) Drag and drop** in a reply stays off at first (C208 (f) 4). **Suggestion:** yes.
- **Security and privacy,** as the plan has them: pasting inserts plain text; a reply's blocks hold types and text only; the count line is never hidden by `calm:`; hidden file text inside a stored prompt survives an edit to that prompt; edits and asks reach only the model the Enter line names.
- **Suggestion:** build in this order once the engine is chosen, with (a) shown to you first.

**C211. Stefan's second try of the spike, and what it found** (26 October, in Brave on Windows; C209).
- **(a) Worked:** Narrator ("removed:" and "added:"), Ctrl+Z and Ctrl+Y, and selection across blocks inside the reply: a drag from one paragraph into the next, Backspace, both parts struck, one card. Not tried this time: Japanese and Chinese, composing over a selection, paste, Enter, Backspace and `/`, the long reply, Zen or LibreWolf, Android.
- **(b) Fixed: typing over a selection across two paragraphs** (found while checking his try). The browser joins the two paragraphs itself and reports the change as everything up to the end of the joined line, so the model's words after the selection were struck and came back in blue as the person's, on a line of their own. Such a change is now cut down to what actually differs before the rules apply: the selection struck, the typed words straight after it, the rest of the line left as the model's, one edit. A letter typed that matches the one after the selection stays the person's. Two tests; tried in the browser.
- **(c) Spelling: "misspelled words now aren't identified as they were previously with a red line underneath."** Not found in the code. Typed by script, the editor gets no red line in this version or in the first try's version, while a plain text box on the same page does, so a script cannot show the difference; the unseen words for Narrator are not the cause (the same with them switched off). The first try was in Chrome, this one in Brave. **To try:** type a misspelt word in the checklist's "What happened" box in Brave, then in the reply in Chrome. If Brave underlines neither, it is Brave's own spell check setting; if Chrome underlines the reply, Brave is the difference; if only the box is underlined in both, the editor is, and the next step is to look again with real keys.
- **(d) New, in Stefan's words:** "i assumed we were working on the ability to edit across all blocks including the initially sent prompt. so i was testing to select the prompt and the reply. that is the behavior i'm looking for. the ability to take an initial prompt, it's first reply, and then delete and edit." Today the prompt and the reply are two editors, so no selection crosses from one into the other, and C210 builds prompt edits as a piece of their own (piece 2). Nothing in the editing spec asks for one selection over both. What it would change:
  - **One editor for a prompt and its reply,** the prompt a block of its own kind at the top, so a selection, a strike or typing can run across both. Each edit would still say where each of its parts is (prompt or reply), as a card already does for each block.
  - **What the model is told** (C210 (c)): an edit that runs from the prompt into the reply would be told as one change in two places ("your prompt said … and your reply began …").
  - **Ask again** (C61, A9): an edit whose prompt part changed could still make 201d from the edited wording; the reply part would go with it as a note.
  - **Only the first prompt and its reply,** as asked, or every prompt with its reply in a room.
- **Stefan, 26 October, widening it:** "the user should be able to mix and match anything from their prompt to editing and deleting replies from the model to make that into their next prompt within the branch. but we can return to this later." So the aim is larger than one selection: the person's prompt and the model's replies, struck, edited and combined, become the next prompt in the same branch. That touches C61 and A9 (an answered prompt stays a record; ask again makes a new branch), C210 (c) (prompt edits told as a change) and piece 2's plan, and the welcome's step 10 ("Send it with your next prompt").
- **Stefan, 26 October, making it exact:** "if the user takes an action that deletes the space between the prompt and the reply, then it should become the next prompt. however if no such action is taken, then it should not." So the prompt and the reply stay apart by default, with a gap between them, and edits in either stay edits as C210 has them. Only an act that removes that gap (Backspace or Delete across it, or a selection spanning both that is struck or typed over) joins them, and what is joined becomes the next prompt in the branch.
- **Deferred, by Stefan:** returned to later, before piece 2 of C210 is built. Nothing changes in the spike or the plan until then.
- **(e) The engine. Ruled 26 October by Stefan:** "i'm fine with prosemirror if you believe there are no security risks." Checked that day: the five packages and two helpers have no known vulnerabilities (`npm audit`, none in the whole app); they make no network calls, run no text as code and touch no storage (`research/editing-spike.md`, "ProseMirror and safety"); the one place they turn text into HTML, a pasted or dropped HTML clipboard, parsed where scripts cannot run, is never reached, because paste and drop are taken first as plain text; the spike's own drawing creates elements and never writes HTML; links keep only `http`, `https` and `mailto` addresses, read from the model's Markdown or the page alike; and the spike ran under the real security headers with no violation. No risk was found. What remains is trust in one author, which the exact pinned versions and the lockfile's checksums cover today and copying the code into the repository (C210 (e)) covers fully, so any update is read line by line. **So ProseMirror is chosen,** on these conditions, which the build keeps: paste and drop stay plain text only; nothing from a reply, a prompt or a source is ever written as HTML; links go through the same address check; the code is copied into the repository with piece 1; versions change only on purpose, after a read. C210's pieces may now begin, with its point (a), the stored data, shown to Stefan before piece 1 writes anything.

**C212. The stored data for stage 11, in full** (proposed 26 October; C210 (a); the editing spec, "What this changes technically"). Shown before anything is written, as the hard rules ask. Waiting for Stefan's approval.
- **(a) No upgrade.** The database stays at version 6. Nothing already stored is read, rewritten or moved: no migration runs. What is new is one optional field on a message and records in two lists the version 6 upgrade already made, empty, for this (`edits`, `asks`). A reply nobody edits is stored exactly as today.
- **(b) A reply's editable form: `blocks` on its message,** written the first time the reply is edited, and saved again half a second after each change and on leaving the room. Its `content` (what the model wrote) never changes, because the model goes on reading it. `blocks` is a list of blocks in Parliament's own plain form, never HTML and never the editor's own format, so a backup stays readable whatever editor follows:
  - each block: `id` (a short id, kept through splits and joins), `type` (paragraph, heading, list item, quote, code, divider, table, chart), the few settings its type has (a heading's level, a list's kind and tick, a code block's language), and its `text` as runs;
  - each run: the words, and its marks: the model's bold, italics, code and links as shown (links keep only `http`, `https`, `mailto`), and `struck` or `added` with the id of the edit it belongs to;
  - a table: its rows of cell text; a chart: the data it was drawn from, as the reply gave it; each with `struck` when struck whole.
  - **Marks point at an edit's id, not its number,** so a restore that gives an edit a new number never has to rewrite the reply.
- **(c) An edit: one record in `edits`,** written when the edit is first saved, which is when it takes its number from the shared counter (C56). Fields: `id`; `num`; `conversationId`; `messageId`; `part` (reply, or prompt from piece 2); `struck` and `added`, as plain text, for its card and for search; `places` (each part's block id and its start and end in that block, as the spec's anchors have it); `held` (kept back by the person); `sent` (the model it went to, when, and the prompt it went with), empty until sent; `createdAt`, `updatedAt`. The branch is read from the chat, not stored, so it can never disagree with it. An edit taken back whole (its card's undo, or Ctrl+Z to before it) is removed; its number is not used again, as with every numbered thing.
- **(d) An ask: one record in `asks`,** the same way, written from piece 4: `id`, `num`, `conversationId`, `messageId`, `part`, `places` (a passage, or one point), `question`, `answer` (its text, who answered and when) once answered, `state` (open, answered, accepted, taken back), `held`, `sent`, `createdAt`, `updatedAt`. Approved now so piece 4 needs no second showing; nothing is written before piece 4.
- **(e) Locked away like the rest.** With Parliament locked, a message is sealed whole already, `blocks` with it; edits and asks are sealed except their number and chat, which the lock's list already says (`seal.js`).
- **(f) Deleting a chat deletes its edits and asks** with its messages, in the same transaction. `erase:` keeps a chat's notes as items of their own (C137 (c)), but an edit means nothing without its reply, so edits and asks go even then. Erase everything removes them with the rest, as today.
- **(g) Backups.** A backup's chats carry each message's `blocks` and the chat's edits and asks, in the format 2 file as it is (no new format number). Both are optional when read, so every backup written before reads as it always has; an older Parliament reading a new backup should keep every reply as the model wrote it and leave the edits out, since a restore keeps only the fields it knows (`backupSchema.js`); (h) checks this rather than assuming it. A restore treats edits and asks as it treats notes: renumbered unless a replace keeps the file's numbers, and pointed at the restored chat and message. The counter after a replace that keeps numbers counts edits and asks too, so no number is given twice.
- **(h) Tested before piece 1 is committed:** an edited reply saved and read back the same; a restore of a backup from before stage 11; a new backup restored into today's build and into the last build before this change; a restore that renumbers, with the reply's marks still finding their edits; a locked database; deleting a chat.
- **Suggestion:** approve (a) to (h) as one. Nothing else changes in what is stored.
- **Approved 26 October by Stefan,** with one change: "let's not worry about older versions of parliament at the moment as there are no users. let's continue". So (h) drops the restore into the last build before this change, and (g)'s line on older builds is not a promise. Every backup written stays readable by this and later builds, as the hard rule has it.

**C213. Stage 11, piece 1, as built so far** (26 October; C207, C210 piece 1, C212). Each point built as suggested, so a ruling changes one entry.
- **(a) ProseMirror in the repository** (C210 (e), C211 (e)): the seven tarballs npm installed for the spike, matched to the lockfile's checksums, installed from `vendor/` like the spreadsheet library; sizes, hashes and how to update in `vendor/README.md`.
- **(b) The editing rules moved into the product,** `src/editing/`, from the spike, which stays as it was at `/dev/editing` for trying things. Edit ids on screen are short random ids; a block keeps its id through saves.
- **(c) Every finished reply is edited in place,** in every room, through the one card all rooms draw replies with (C207): striking, your words in blue, typing over, Enter, Backspace and `/` with its menu, paste as plain text, Ctrl+Z and Ctrl+Y, tables and charts as whole blocks. A reply still arriving, cut off, or an answer from a source is drawn as before and is not editable. What stays as it was: highlights and quoted passages are drawn over the words (a click on a quote still finds its card), the highlight and quote picker still opens on a selection and goes away when you type, headings keep the anchors the table of contents finds them by, charts are drawn by the same chart renderer, links keep only web and mail addresses, an image becomes a link named by its alt text, and HTML in a reply stays words.
- **(d) Stored as C212 has it:** a reply's `blocks` saved half a second after a change, on leaving the reply and when it leaves the screen; one record for each edit, numbered when first saved, changed in place, removed when taken back; removed with their message or chat. One detail beyond C212 (c): a record's key is its message's id and the edit's id together, and the edit's id is kept in `edit`, so a reply copied under a new message id keeps its records apart.
- **(e) `markup:on` and `markup:off`** in a room: clean shows the result only and is read-only until markup is on again; a setting of the person's, kept in backups.
- **(f) Backups** carry each reply's `blocks`, and each chat its edits and asks, in format 2 as it is. A restore treats them as it treats notes: none when their chat is here already and the same; under the new message ids when the chat comes in as a copy, kept apart from the original's; renumbered after their chat unless a replace keeps the file's numbers, when the counter counts them too. One whose reply is not in the file is left out and counted. Tested: into an empty database, as a copy beside the original, and with an edit pointing nowhere.
- **(g) Not in piece 1, as planned:** prompts edited in place (piece 2, and the joining rule of C211 (d)), what reaches the model (piece 3), cards in the Collection (piece 5).
- **(h) Fixed from Stefan's first try** (26 October, in Brave, on the spike page, which shares the code):
  1. "when striking through text that goes across multiple lines, the cursor jumps and can't go to the furthest left": a line starting with struck words started with the unseen "removed:" for screen readers, inside the struck words, and the cursor could not rest before it, so it went to the line above. At a line's start or end the unseen words now sit just outside the struck or added words; between two of them they stay inside, so a screen reader still hears them in order.
  2. "the backslash "/" doesn't open the normal backslash menu if in the middle of a strikethrough, it adds it as text": `/` opens the menu wherever nothing but struck words comes before it in the line, as Backspace already counts a line's start. After words still standing, it is typed.
  Both in the spike too. Tried in the browser: ArrowLeft from after the struck "T" rests before it and typing lands there; `/` after struck words opens the menu.
- **(i) From Stefan's second try** (26 October, Brave): "backslash only seems to work on a blank line. It should work if text is highlighted. For example, if the user wants to make a word mid-sentence a header." And "if striking through multiple lines and there is a blank line the cursor jumps the blank line. The user needs to be able to add something in that blank line."
  1. **`/` over selected words** opens the menu; what is picked turns them into a line of that kind. Words within one line are split onto a line of their own (a word mid-sentence becomes a heading); a selection across lines turns each line it touches. Layout, never an edit: nothing is struck or typed. The words either side keep their spaces as the model wrote them, so the line after may start with one.
  2. **The space between two blocks** reads as a blank line but held nothing. Clicking in it now opens an empty line there; typed in, it is an ordinary line with your words; left empty, it goes, and it is never saved while empty. **Ruled after his third try:** "The arrowup to start a new line is odd. it throws me off. can we keep arrows for navigation please." The arrow keys only move; at first they opened such a line too.
  3. **The spike page now runs the product's editing code** (`src/editing/`), so what is tried there is what a room does; its samples and checklist stay its own, and its chart sample is in the shape the chart tool gives.
  Tried in the browser on the spike page: ArrowDown from a paragraph's end opened a line and typing landed there; a press in the space between two lines opened one, and an empty one went when the cursor left; `/` over "stranger" mid-sentence, then Heading 2, made it a heading line of its own.
- **Tried in the browser,** in Writing Studio: typing over two words struck them and added the new ones as one edit, numbered 203 after its chat's 202, with the model's text unchanged; the edit came back after a reload; Ctrl+Z and Ctrl+Y; a click placed the cursor where it was clicked; `markup:off` and `markup:on`; the chart drawn as before.

**C214. Piece 2, and joining a prompt to its reply** (proposed 26 October; C210 piece 2, C211 (d), deferred by Stefan to "before piece 2"; the editing spec, "Editing prompts"; C61, A9). Waiting for Stefan.
- **Piece 2 as C210 has it:** your prompts edited in place like replies (struck, blue, one record for each edit, `part: prompt`); each branch keeps its own copy of the first prompt; an answered prompt stays a record and editing it marks it up; under an edited prompt, "your prompt in 201a, edited; the other branches keep theirs · ask again as 201d", and asking again starts a new branch from the edited wording.
- **The joining rule, as Stefan gave it:** a prompt and its reply stay apart, with a gap between them; only an act that removes the gap joins them, and what is joined becomes the next prompt in the branch.
- **(a) What joins them:** Backspace at the start of the reply (with nothing but struck words before the cursor), Delete at the end of the prompt, or a selection that runs from the prompt into the reply, struck or typed over. For the last, the prompt and its reply have to be one surface to select across: they are drawn by one editor, still looking like two cards, the prompt's and the reply's. **Suggestion:** all three, and so one editor for the pair, built in piece 2.
- **(b) What joining does:** it does not change the transcript. The words of both still standing, in order, with your own and without the struck ones, go into the bar as your next prompt, in prompt mode, to the same branch; you can go on editing them there, and Enter sends them, as any prompt. The prompt and reply stay as they were, with their edits. CLAUDE.md has the bar as the only place a prompt is typed, which this keeps. **Suggestion:** as above.
- **(c) The edits used:** edits in a prompt and reply that were joined went into that prompt, so they are not also sent as notes (piece 3). **Suggestion:** yes; their cards read "went into your prompt".
- **(d) Which prompts:** any prompt with its reply in a room, not only the first. **Suggestion:** any.
- **The question:** build piece 2 with (a) to (d) as suggested?
- **Ruled 26 October by Stefan:** "Yes, build piece 2 with C214 (a) to (d) as suggested."

**C215. Stage 11, piece 2, as built** (26 October; C214 as ruled; C210 piece 2; the editing spec, "Editing prompts"). Each point built as suggested, so a ruling changes one entry.
- **(a) A prompt and its finished reply are one editor,** drawn as the two cards they always were: each card's buttons, notes, lines and highlight picker are the card's own (`MessageCard`), around the card's part of the text (`EditableMessages`). A selection runs from one card into the other.
- **(b) Prompts are edited like replies:** struck, your words in blue, one record for each edit with `part: prompt`, saved beside what was written (C212). In a prompt Enter and `/` do nothing, as the spec has it; paste is one line. A prompt with no finished reply under it (one still arriving, cut off, or an answer from a source) or with branch tabs under it is edited on its own.
- **(c) Joining** (C214 (a), (b)): Backspace at the reply's start, Delete at the prompt's end, or a selection over both struck or typed over. The words of both still standing go to the bar as a prompt; the chat does not change, and a line under the cards says so. The bar is one line, so lines and paragraphs meet there with a space. A selection over both strikes what it covers first, as anywhere, and that is an edit in each card.
- **(d) Under an edited prompt:** "your prompt in 201a, edited; the other branches keep theirs · ask again as 201d", the middle part only where the plan has other branches. "ask again" writes `again:201a` into the bar, which waits for Enter, as every marginalia does; `again:` now asks the prompt as it stands, with any attached file's text it carried, never shown or edited. Earlier prompts and replies still go to the model as written; their edits go as notes in piece 3.
- **(e) Each branch keeps its own copy of the first prompt,** as it already did: a branch is a copy of its chat's messages, and an edit is to the copy on screen.
- **(f) Not in piece 2:** C214 (c), edits that went into a joined prompt not also sent as notes, waits for piece 3, which sends edits; until then nothing is sent either way. Prompts inside branch tabs, and a later prompt to several in a tab's thread, are drawn as before, not editable yet. A prompt's own Markdown (bold, a list) is shown as typed while it is edited, since a prompt's lines do not change kind.
- **(g) Fixed from Stefan's first try of piece 2** (26 October, a private window): "still not able to edit prompt and reply". With no key, a prompt is answered by Wikipedia, and piece 1 had left a source's answer out of editing, so nothing could be joined. A source's answer is now edited like a reply, read as plain text and never as Markdown, as the editing spec and the spike have it; its edits go to a model and never to the source (piece 3). Not yet: a source's list of results (Hacker News, OpenAlex) and an answer shown translated. Also: typing over a selection across both cards is now the editor's to make, so the browser never removes what lies between the cards; joined by typing, the bar is filled once the typing pauses and the cursor stays where it is, while Backspace and Delete take it to the bar.
- **(h) The spike page, one editor too** (Stefan, 26 October, on 201b: "i'd like to be able to select from the prompt down to the reply ... is there a way to prevent the selection boxes from preventing selecting multiple parts?"). The spike page still drew its prompt and reply as two editors, and a selection cannot cross from one editor into another. It now draws them as one, as a room does: the prompt's box, the line under it, then the reply, with a selection running from the prompt down into the reply. Joined there, the page says what a room would put in the bar, since the spike has no bar. Tried: from "works on Murano in 1880." into "From the article", struck in both and typed over; the line under the prompt then read "your prompt in 201b, edited; the other branches keep theirs".
- **Piece 2 tried by Stefan** (26 October, on the spike page): "it works. let's continue".
- **Tried in the browser:** a prompt and its reply drawn as two cards; "opening" struck and "ending" typed in a prompt, saved as edit 214, Enter doing nothing there, the line under it reading "your prompt in 207a, edited · ask again as 207b"; Backspace at a reply's start putting "Draft. First line New line here a stranger came." in the bar as a prompt with the chat unchanged; a selection from "aft." in the prompt to "First" in the reply struck in both and joined; `/` at a reply line's start opening the menu.

**C216. Piece 3, edits reaching the model** (proposed 26 October; C210 piece 3 and points (b) to (d); C214 (c); the editing spec, "When edits reach the model"). Waiting for Stefan, since (c) adds a field to what is stored.
- **(a) What goes:** every edit in the branch's prompts and replies not yet sent and not held back.
- **(b) How it goes:** with your next prompt to that branch, once, as a short note in text ahead of your words: "The person edited your reply. Each change, told once: In paragraph 2: "eleven years" was struck, and "nearly a century" written in its place." Prompt edits are told the same way, as a change (C210 (c)). The model goes on reading every message as written; the note says what changed. Afterwards each edit is marked sent: to which model, when, and with which prompt (`sent`, already in C212 (c)).
- **(c) Stored, the one change:** the note is kept on the prompt it went with, as a new optional field `told` (its text), so every later turn sends it where it was told and never again (C210 (b)). Backups carry it; a chat without it is read as before. No upgrade, nothing existing rewritten. **This is the part to approve.**
- **(d) The Enter line** counts what goes and who reads it, and its cost includes the note: "3 edits go with your next prompt to 201a · Sonnet 5.5 reads them".
- **(e) Enter on an empty field** sends just the edits: a prompt with no words of yours, its card reading "Your edits, told to Sonnet 5.5", and the model answers to them.
- **(f) Holding one back:** `hold:242` and `hold:off 242` (the verb is there for branches) keep an edit yours until let go; the cards that show this in the Collection come in piece 5.
- **(g) A source's answer:** its edits go to a model, never to the source (Wikipedia). On a source's branch they wait until a model answers there (`by:`), and the Enter line says so: "Wikipedia reads none; they go when a model answers here".
- **(h) Joined, then sent** (C214 (c)): the edits of a prompt and reply whose words went into the bar are marked as gone into that prompt when it is sent, so they are not told again; if the bar's words are cleared unsent, they go as usual.
- **(i) An edit beside one already sent** starts a new edit, never joins it (C210 (d)).
- **(j) Branch tabs** count the edits waiting in each branch, in your blue.
- **Suggestion:** approve (a) to (j) as one, (c) with them.
- **Ruled 26 October by Stefan:** "Approved, C216 (a) to (j), including the stored note. Build piece 3."

**C217. Stage 11, piece 3, as built** (26 October; C216 as ruled). Each point as C216 has it, with these details.
- **(a) The note** (`src/editing/told.js`): for each message with edits waiting, in the chat's order, the edits as the message's stored form has them: "The person edited your reply 2. Each change, told once: ...", "... their prompt 3 ...". An answer from a source never went to the model (C115), so a note of struck fragments would mean nothing to it: its words as the person left them go instead, marked as material from a source, not instructions.
- **(b) Sent once:** when a prompt goes to a model, the waiting edits are written into its note, kept on it as `told`, and each marked sent (to which model, when, with which prompt). Every later turn sends a prompt with its note ahead of its words; what was edited still goes as written. Edits of messages joined into that prompt are marked as gone into it instead, if the words sent still hold the draft's opening.
- **(c) The Enter line:** "3 edits go with it, told once · Haiku 5.5 reads them", the note counted in what is sent; on an empty field, "Nothing typed: just your 3 edits go, told to Haiku 5.5", and Enter sends a prompt of only the note, whose card reads "Your edits, told to Haiku 5.5"; with a source answering, "Wikipedia reads none of your 3 edits; they go when a model answers here (by:)".
- **(d) hold:242, hold:off 242** for edits of the chat here: a record change `undo:` takes back; one already told cannot be held.
- **(e) Closed:** what is typed or struck beside an edit already told starts a new edit.
- **(f) Branch tabs** show how many edits wait in each branch, in your blue.
- **Not tried in the browser:** a real send to a model, as the browser here has no key, and `hold:` there, as the bar stayed pointed at the welcome page in that layout. Tried: the Enter line with a source answering, "Wikipedia reads none of your 9 edits; they go when a model answers here (by:)". The note, what a model reads, holding, marking sent and closed edits are tested.

**C218. Piece 4, asks** (proposed 26 October; C210 piece 4 and (g); C212 (d); the editing spec, "Asks" and "Keyless sources"). Waiting for Stefan: (a) is a conflict, (c) adds to what is stored, (e) corrects piece 3.
- **What an ask is** (the spec): an instruction in your own words, tied to a passage you select or a point where the cursor is. A small box opens in the text, labelled ASK; Enter keeps it as "ask 241" (its number), Escape drops it. It goes with the next prompt to its branch, or on an empty Enter, like edits. The answer lands in place, in green, with the passage struck in green and "ask 241: accept · undo". Accept makes the answer part of the reply and the passage goes; undo puts the passage back and the answer goes.
- **(a) The key, a conflict.** The editing spec starts an ask with ⌘K/Ctrl+K in a reply. The bar decisions settled (P2, S6) that Cmd/Ctrl+K opens the bar from anywhere, "including inside a reply". Options:
  1. In a reply or prompt, Ctrl+K starts an ask; Ctrl+K again, in the empty ask box, goes on to the bar. Elsewhere Ctrl+K opens the bar as now.
  2. Ctrl+K always opens the bar; an ask starts with Ctrl+Shift+K, or from `ask:` in the bar.
  **Suggestion:** 1, as the spec has it, with the bar one press further while in a reply.
- **(b) How the model answers.** The note that goes with the prompt lists each ask with its number and its passage (or the words around its point), and asks the model to answer each in a block of its own, `[ask 241] ... [/ask]`, in its reply. Parliament takes those blocks out of the reply as it is shown and puts each answer in place, read as text only, never as markup (C210 (g)). What the model wrote is still stored as it wrote it. An answer whose passage has changed since it was asked goes on its card only.
- **(c) Stored, the change.** The asks list as approved (C212 (d)), and in a reply's stored form three more marks a run may carry: the passage an ask is about (`ask`), the answer waiting (`answer`), and the passage it would replace (`replaced`), each with the ask's id; and a point ask as a run of its own (`point`). Read back as text from outside, like the rest. No upgrade. **This is the part to approve.**
- **(d) What the model is told after:** accept and undo tell it nothing: an accepted answer is its own words. **Suggestion:** as above.
- **(e) A source's branch, correcting piece 3.** The spec has it that on a Wikipedia branch your edits and asks "go to a model you choose, never to Wikipedia", with your next prompt, the model named in a picker under the tab ("those go to Sonnet 4.6"), while the prompt itself searches Wikipedia again; and it says this supersedes the older rule that they wait. C216 (g), as I proposed it and built it, makes them wait until a model answers there. **Suggestion:** build the spec's way in this piece: with a prompt on a source's branch, its waiting edits and asks go at the same time to the model named under the tab (the default model, changed with a picker there), whose answer comes back under them; the Enter line names both.
- **(f) markup · clean:** shows the reply as it reads now, answers not yet accepted left out. **Suggestion:** as above.
- **(g) Cards** (the instruction, the answer, find, drop) come with the Collection in piece 5; until then a marker's accept and undo work in place.
- **Suggestion:** rule (a) and (e), approve (c), and the rest as above.
- **Ruled 26 October by Stefan:** "1. let's do option 2. this depends on the user behavior, right? if they choose to send it to the model or to keep it discreet. fine with rest, let's continue". So (a) is option 2: Ctrl+K always opens the bar; an ask starts with Ctrl+Shift+K, or with `ask:` in the bar. (c) approved, (e) the spec's way, the rest as suggested. On his question: yes, nothing goes until the person sends a prompt to that branch or an empty Enter, the Enter line names who would read it first, and `hold:` keeps an edit or ask yours until `hold:off`.

**C219. Stage 11, piece 4, as built** (26 October; C218 as ruled). Each point as C218 has it, with these details.
- **(a) Starting an ask:** Ctrl+Shift+K in a reply opens the ASK box under the selected words, or at the cursor for a point; Enter keeps it as "ask 203", Escape drops it. In a prompt, the note says asks are for replies. From the bar, `ask:` opens the same box in the reply last in focus, where its selection was, and `ask:"Add the year it opened"` keeps the ask there at once. With no reply in focus yet, the Enter line says "Click into a reply first, or select the words to ask about, then ask: again". The words travel from the bar to the reply as an event inside this window only.
- **(b) The note and the answer:** asks go in the same note as edits, each with its number and passage (or the words around its point), and the model is asked to answer each in `[ask 203] ... [/ask]`. Those blocks are taken out of the reply as shown; each answer is put in place as text, the passage struck in green and "ask 203: accept · undo" after it. An answer whose passage changed since it was asked is kept on its record only, for its card in piece 5.
- **(c) Stored, two fields more than C212 (d) listed, to approve:** each ask record also keeps `passage` (the words asked about, or the words around a point, so the note can quote them and a changed passage can be seen) and `point` (true for a point ask), besides `edit` (the mark's id in the stored form, as edits have). The answer is kept as `{ text, by, at, inPlace }`. The marks in the stored form are as approved. Backups carry the asks list; older backups read as before.
- **(e) A source's branch:** with a prompt there, waiting edits and asks go at the same time to the default model, and the Enter line names both: "Your 1 ask goes to Haiku 5.5 at the same time, about 300 tokens · Wikipedia reads none". The picker under the tab to choose another model is not built yet; until it is, the reader is the default model (`set:default`). With no key, the line says Wikipedia reads none and a model reads them once it has a key.
- **(f) markup:off** hides answers not yet accepted and the ask markers.
- **hold:203** and **hold:off 203** work on asks as on edits.
- **Tried in the browser:** Ctrl+Shift+K on a word of a Wikipedia answer, the box, Enter keeping "ask 203" and its record; `ask:"…"` at a cursor point; `ask:` opening the box from the bar with the focus in it; the refusal after a reload; markers read back after a reload; the Enter line with no key. **Not tried:** an answer coming back, as this browser has no key (the note, reading the answer blocks and placing them are tested). **Known:** the box stays where it opened if the page scrolls under it.
- **Confirmed 26 October by Stefan:** "Yes, ask: as built is right. Reflection stays for stage 12." So ask: is an ask on a spot in a reply, as Ctrl+Shift+K; discussing and reflecting on a whole chat is the Reflection board (stage 12). Still waiting: approval of the two stored fields in (c).
- **Approved for now, 26 October by Stefan:** "sounds good for now. let's review later after the refactor is done because there may be some overlap with ripple, and it'd be good to have a good cohesive look at it." So (c) stands. Asks are to be reviewed again, with Ripple, once the refactor is done.

**C220. Piece 5, the Collection's cards for edits and asks** (proposed 26 October; C210 piece 5; the editing spec, "The Collection"; inline editing v5 draws the cards; C56, C139, C144, C145, C199). Waiting for Stefan: (a) is a choice, (g) stores one setting.
- **(a) Where the cards show, a choice.** The spec has every edit and ask as a card "in the Collection beside the chat, grouped by branch". The Collection as built shows one collection at a time (C139, C144), and a collection that holds a chat or a plan shows everything marked in it, live. Options:
  1. Edits and asks join what a held chat or plan shows, like its notes and quotes. To see them beside a room, show a collection that holds that chat; when the collection shown does not, and the chat has edits or asks, the board's head says so and offers `add:201` for Enter.
  2. The Collection beside a room follows that room's chat on its own, an unsaved view named "from 201", and a saved collection is shown with `open:"…"` as now.
  **Suggestion:** 1. It keeps one way of showing things, and nothing new is stored; 2 can come later if 1 feels like a chore.
- **(b) An edit's card:** the struck words, an arrow, and your words in blue. Under it: its number, "edit", where it is (a link: "201a", or "your prompt in 201a"), and its state: "goes with your next prompt", "held back: stays yours", "goes to Haiku 5.5 with your next prompt; Wikipedia reads none", "sent to Haiku 5.5, 26 Oct", or "went into your prompt 209". Then "hold back" or "let it go" while it waits, and "undo".
- **(c) An ask's card:** "on" the passage it is about in italics (or "at a point in the reply"), the instruction, and the answer in green once it is there. Under it: its number, "ask", its branch as a link, "answered by Haiku 5.5" on a source's branch, and its state: "goes with your next prompt", "asked of Haiku 5.5", "answered in place", "answered here only: the passage changed since", "accepted", "taken back". Then "drop" while it waits, "accept" and "undo" once answered.
- **(d) What the buttons run.** Each is a command, run at once, as `hold:` already is from the bar: "hold back" and "let it go" are `hold:242` and `hold:off 242`; "accept" and "undo" on an answer are `accept:203` and `reject:203`, the same as the marker in the reply; "drop" is `delete:203`, which removes an ask not yet sent at once (C199), and `undo:` brings it back. "undo" on an edit is `undo:242`, new here: it takes the edit out of the reply, the struck words back and yours gone, even when the reply is not on screen. An edit already told to a model cannot be undone this way, since the model has been told; you change the text again, which is told as a new edit. `undo:` alone then brings an undone edit back.
- **(e) Tabs:** Edits and Asks join All, Highlights, Keywords, Quotes, Notes, each with its count and shown only when it holds something (A16, C144 (d)). Suggestions comes with Ripple in stage 12.
- **(f) Finding, both ways** (C145 (c)): a card's branch link brings that branch into the room and flashes the spot; the "ask 203" marker in a reply finds its card; a new edit flashes its card as it is made, when the Collection shown holds the chat; `jump:242` finds an edit or ask on the board the bar points at.
- **(g) markup · clean in the Collection's head,** apart from the chat's: clean shows each edit's result only (your words, or "removed") and each ask's answer only. `markup:off col` from the bar does the same. **Stored:** one setting, `collectionMarkup`, beside `markup`; no upgrade.
- **(h) A legend under the tabs** while markup is on: struck, yours removed · blue, yours added · green dotted, an answer. Rust for Ripple joins in stage 12.
- **(i) By source** groups a plan's cards by branch (201a, 201b), under the plan; your order and by date stay as built.
- **(j) Records:** `type:edit` and `type:ask` show edits and asks as rows, only under those filters, never in the table as it opens (C56): number, the words (struck → added, or the instruction), chat and branch, state.
- **(k) Selecting cards** for note, tag, summarize and prompt (C145 (d)) leaves edits and asks out for now: their words are already in the chat. **Suggestion:** later, if wanted.
- **Security and privacy:** every card shows its words as text, never markup, the model's answer included; the buttons change only the records and the reply they belong to; nothing on a card goes to a model.
- **Suggestion:** choose (a), approve (g), and the rest as above.
- **Ruled 26 October by Stefan:** "good with lean for option 1. let's also make sure collections can refer to more than one board". Asked what he meant, he chose two of four readings: a collection that holds several rooms' chats and plans, and a collection that comes up beside whichever of its rooms you are in. So (a) is option 1, with these two:
  - **(a1) Several rooms in one collection:** a collection already holds chats and plans from any room; their edits and asks join it the same way, and by source groups them by chat, then branch. A card's link finds its spot in the room on screen that shows its chat, else brings that chat into the room the bar points at (C145 (c)).
  - **(a2) Beside each of its rooms:** when the bar moves to another room, the Collection board shows a collection that holds that room's chat or plan. If the one on screen holds it, it stays; else the one changed last among those that do. If none holds it, the collection shown stays, and its head offers `add:201`. Showing another collection with `open:` while in a room is kept until the bar moves to another room. Nothing new is stored for this.
  - Then, while it was being built: "if a collection has multiple rooms, and more than one room is open, the collection doesn't need to appear more than once, most important is that a collection can hold items from more than one room". So one Collection board on screen, as now; (a1) comes first, and (a2) keeps the collection shown whenever it holds the room's chat.
  - (g) approved, the rest as suggested.

**C221. Stage 11, piece 5, as built** (26 October; C220 as ruled). Each point as C220 has it, with these details.
- **(a) Where they show:** a collection that holds a chat or a plan shows its edits and asks, from every room. When the bar moves to another room, the Collection keeps the collection on screen if it holds that room's chat, else shows the one changed last that does; if none does, the head says "The chat in the room, 202, is not in this collection" with `add:202` to write into the bar.
- **(b) An edit's card:** struck words → your words, then its number, "Edit", where it is ("201a", or "your prompt in 201a"), its state ("goes with your next prompt", "held back: stays yours", "sent to Haiku 5.5, 26 Oct", "went into a prompt"), and "hold back" or "let it go" and "undo" while it waits. Not built: the line for a source's branch ("goes to Haiku 5.5 with your next prompt; Wikipedia reads none"); there the card says "goes with your next prompt", and the Enter line names the reader as piece 4 built it.
- **(c) An ask's card:** "on “talons”" (or "at a point in the reply, after “Tyto i”"), the ask, the answer in green once it is there, then its number, "Ask", its branch, "answered by" when answered, its state, and "hold back" and "drop" while it waits, "accept" and "undo" once answered.
- **(d) The buttons and the commands:** each button runs its command at once, and the result is said under the bar, as a click on a plan's × is. `undo:242` takes a waiting edit out of the reply, on screen or not, by the editor's own rules; an edit already told is refused with a line that says why. `accept:203` and `reject:203` settle an answer; `accept:all` and `reject:all` settle every answer waiting in the chat the room shows (`accept:all` leaves out an answer kept on its card only). An answer kept on its card only (its passage changed) can only be let go: `reject:` marks it taken back. `delete:203` drops an ask not yet sent; one sent stays. `undo:` takes back each of these, putting the reply and its edits and asks back as they were, numbers included, unless the reply has changed since. `hold:` now finds an edit or ask from any board where editing commands work, not only in the room's chat. Other commands by number (`pin:`, `tagadd:`, `name:`, `add:`, `open:` and the rest) refuse an edit or ask with "242 is an edit or an ask. Its own commands act on it: hold:, undo:, accept:, reject:, jump:".
- **(e) Tabs:** Edits and Asks, with counts, shown when there are some.
- **(f) Finding:** a card's number and its branch link find the spot in the chat (the edit's words, or the ask's marker) and flash it. The "ask 203" marker in a reply is a link to its card; one not in the collection shown offers `add:202` (its chat). A new edit or ask flashes its card as it is made; adding a chat to a collection flashes nothing. `jump:242` finds an edit or ask.
- **(g) markup · clean** sits beside the orders, once there are edits or asks: clean shows your words alone (or "removed") and an answer alone. `markup:off col`, or `markup:off` with the bar on the Collection, does the same. **Stored:** the setting `collectionMarkup`, on by default, in backups with the other settings.
- **(h) The legend** sits under the tabs while markup is on: struck, blue, green dotted.
- **(i) By source** groups a plan's cards under the plan, then by branch ("Branch 203a").
- **(j) Records:** `type:edit` and `type:ask` list them, and nothing else does, not even a search. A row shows its kind, number, words (struck → added, or the ask) and when; its state is on its card, not in a column.
- **(k)** Not selectable for the four acts, as suggested.
- **Tried in the browser:** a collection holding the barn owl chat showing three asks and an edit made then; the edit's card flashing as it was made; hold back, let it go and undo from the card, the reply changing with it; drop on an ask and `undo:` bringing it back with its number; markup and clean; a card finding its edit in the chat; the "ask 203" marker finding its card; `type:edit,ask` on Records; the refusal for `pin:207`, and the line for `accept:` on Records. **Not tried:** accept and undo of a real answer, as this browser has no key (tested on the stored form); the Collection following the bar from one room to another, as the test layout has one room.

**C222. Piece 6, tables and charts edited inside** (proposed 26 October; C58, ruled 24 October; C210 piece 6; C211 (b) 3). No document says how; these are the points to settle. Today a table is one block of plain words (the model's bold, italics and links inside its cells are dropped), and a chart is one block holding what the chart tool gave: its kind, title, labels and series of numbers. Both can only be struck or asked about whole. Waiting for Stefan: (d) and (f) change what is stored.
- **(a) A table's cells are text you edit like any other.** Click into a cell and type; strike with Backspace, Delete or a selection; your words in blue; asks and highlights work in a cell. The model's bold, italics, code and links in a cell are kept, as in a paragraph. Tab and Shift+Tab move between cells; Enter moves to the cell below, as a cell holds one line. A selection can run across cells and rows: striking it strikes the words in each cell, as one edit. Selecting the whole table and pressing Backspace still strikes it whole.
- **(b) Rows and columns,** from `/` in a cell: "row below", "column after", "strike row", "strike column". A new row or column is yours, in blue, empty for you to fill. A struck one stays in place with a rule through it, as a struck table does now. The first row stays the header.
- **(c) What the model is told:** each change with where it is, named by the header and the row's first cell: "In the table after “Prices in 2025”, row Oslo, column Price: 12 → 14", "added a row: Bergen, 9", "removed the column Notes". Told once, like every edit.
- **(d) Stored, the change.** A table block's rows hold runs, like a paragraph's text, with the marks of edits and asks, in place of plain words; a table stored as plain words (pieces 1 to 5, and backups from them) reads as before. An edit's places name the row and column of each cell it touches. A row or column added or struck carries the edit's id, as a struck table does now. No upgrade. **This is the part to approve.**
- **(e) Built with Parliament's own table pieces,** not a further library (prosemirror-tables): markdown tables have no merged cells, and moving between cells is a few keys. No new package. **Suggestion:** as above.
- **(f) Charts, after tables have been tried.** The numbers behind a chart are shown as a table under it and edited like any table: the labels, the names of the series, and the values. A value must be a number; if it is not, the line under the bar says so and the chart leaves it out. The title is a line of text; the kind (bar, line, area, pie) is chosen from `/`. The chart redraws from the numbers as they read now: struck values leave it, yours join it. The model is told as for a table: "In the chart “Visitors”, March: 120 → 140", "kind: bar → line". **Stored:** the chart block keeps what the model gave, unchanged, beside the numbers as you edited them, held as a table's rows are in (d). No upgrade.
- **(g) Order:** tables first, tried in the browser and by you, then charts; each committed and checked.
- **(h) Screen readers:** real table markup, so Narrator names the row and column of a cell; "removed:" and "added:" as elsewhere.
- **(i) Narrow screens:** a wide table scrolls sideways inside its block, never the page.
- **Security and privacy:** a cell's words are text from outside like the rest, never markup; numbers are read as numbers only; nothing new goes to a model beyond the note of changes, which the Enter line counts as now.
- **Suggestion:** approve (d) and (f), and the rest as above.
- **Ruled 26 October by Stefan:** "Approved, C222 (a) to (i), including (d) and (f). Build tables first."

**C223. Stage 11, piece 6, tables as built** (26 October; C222 as ruled). Charts come next, after Stefan's try. Each point as C222 has it, with these details.
- **(a) Cells:** a table is now rows of cells, each cell a short line with an id of its own, edited by the same rules as every line: struck words, your words in blue, asks and highlights. The model's bold, italics, code and links in a cell are kept. Tab and Shift+Tab move along the rows; Tab past the last cell leaves the table to the browser, so the keyboard is never caught. Enter goes to the cell below, and past the last row to the line after the table (opened if there is none). Backspace at a cell's start does nothing: cells never join. A selection across cells, or from a cell into the line after the table, strikes the words in each as one edit and leaves the table's shape as it was. Selected whole (a click on its edge), the table is struck whole as before, and edits made inside it earlier are kept.
- **(b) Rows and columns:** `/` at a cell's start (or over selected words in a cell) offers Row below, Column after, Strike row, Strike column. A new row or column is yours, with a blue edge, and what you type in it belongs to the same edit; struck, it simply goes. A struck row or column stays, its cells faint with a rule through them. Ctrl+Z takes each back, and the card's undo takes back the whole edit.
- **(c) The note to the model,** as tried: "In the table after "Glass remembers the hand that rushed", row "1880", column "Furnaces": "31" was struck, and "33" written in its place", "a row was added: "1890", "40"", "the row "1870" was removed", "the column "Notes" was removed". A row is named by its first cell, a column by its header, in the model's words even when struck.
- **(d) Stored:** a table's rows hold cells, `{ id, text, header?, struck?, added? }`, the text runs as a paragraph's; an edit's places in a cell also name the table, row and column. A table stored as plain words before this piece reads as before, its first row the header. Backups carry the form as stored and read it back through the same reader. No upgrade.
- **(e)** No new package: the table's pieces are Parliament's own (`schema.js`, `keys.js`).
- **Also changed:** "/" now reads where the text goes in, not where the editor last saw the caret: after Home, a quick "/" was typed instead of opening the menu (found while trying this piece; it may also explain one of the earlier "/" reports).
- **Tests:** a new set for tables (reading, typing in a cell, selections across cells and out of the table, Backspace at a cell's start, rows and columns added and struck, the note, undo, the stored form, an answer placed in a cell, moving between cells), and the random-editing test now also adds and strikes rows and columns, 400 runs, every word back after undo.
- **Tried in the browser,** on the spike page's table (the same editor, schema and rules as a reply in a room): typing over "31", Tab to the next cell, `/` with Row below and typing into the new row, Strike row, a drag across a row's cells and Backspace, Enter down a column, Column after with Ctrl+Z taking it back, and the note to the model after each. **Not tried:** a table in a reply in a room, as the test data has none (no model key to ask for one); the room uses the same editor and menu, and its menu has the table choices.

**C224. Stage 11, piece 6, charts as built** (26 October; C222 (f) as ruled). With C223, piece 6 is done.
- **What a chart is now:** its drawing, a line saying what it is ("Bar chart. The title and numbers below are edited like any text; / in a cell changes the kind."), its title as a line of text, and its numbers as a table: a row for each label, a column for each series, the header row naming the series. All of it is edited by the same rules as any line and table: struck words, your words in blue, asks, rows and columns from `/`.
- **The drawing** is made from the numbers as they read now, after every change: struck words leave it, yours join it; a row or column struck whole leaves it. A row whose value is missing or is not a number is left out of the drawing, and the line under it names that row. Numbers are read as people write them: 120, -3.5, 1,200, 3,5. Built: that line is under the drawing, not under the bar, as C222 (f) had it, so it is seen where the chart is.
- **Its kind:** `/` in the chart's title or a cell offers Bar chart, Line chart, Area chart, Pie chart (in a cell, after the row and column choices). A kind other than the model's is an edit, "(yours)" on the line, told as "In the chart "Visitors": its kind was changed from bar to line"; back to the model's kind, it is no edit. Ctrl+Z and the card's undo take it back.
- **What the model is told,** as tried: "In the chart "Furnaces on Murano, by decade", row "1850s", column "Furnaces": "14" was struck, and "30" written in its place", the kind line above, and "In the chart "…", its title: …" for the title.
- **Keys:** Enter in the title goes to the numbers; Enter past the last row goes to the line after the chart; Backspace at the title's start does nothing. Selected whole, the chart is struck whole as before, its earlier edits kept. A chart's table is never struck alone: a selection over all of it strikes its words.
- **Stored:** the chart block keeps `data`, what the model gave, unchanged, beside `title` (runs), `rows` (as a table's), `kind`, and `kindEdit` when you changed the kind. A chart stored before this piece holds only `data`, and reads as before: its title and numbers are made from it. Backups carry it as stored. No upgrade.
- **Tests:** a new set for charts (reading, a number changed and redrawn, a row left out, numbers as written, the kind as an edit and back, the title, struck whole, Enter past the last row, the stored form both ways), and the random-editing test now has a chart in its reply and changes kinds too, 400 runs, every word and mark back after undo. It found that a selection over a chart's whole table struck that table as a block nothing could undo; fixed as above.
- **Tried in the browser,** on the spike page's chart: the drawing, title and numbers shown; 14 changed to 30 and the bar redrawn at once; Line chart from `/`, drawn as a line, told, and taken back with Ctrl+Z. **Not tried:** a chart in a reply in a room, as the test data has none.

**C225. Piece 7: welcome steps 9 and 10, `strikethrough:` and `tell:`** (proposed 26 October; C210 piece 7; welcome inline-editing spec §3 to §5; C54; A7, ruled 15 October; C121; C176). `markup:` was built in pieces 1 and 5. The stage 11 checkpoint follows this piece, with Drafting Desk's future and C91. **Ruled 26 October: (d) option 1, held for the next prompt like `include:`; the rest as suggested.**
- **(a) Step 9, "Strike through a line".** Shown after step 8 (the key), as welcome v9 has it, with "select words in a reply, then Ctrl+Shift+X"; a click writes `>strikethrough:` into the bar. Crossed off when an edit that strikes words is saved, however it was made.
- **(b) Step 10, "Send it with your next prompt"** (A7, from C54: v9's "Leave the AI a note" became this once edits go to the model by default). Crossed off when a prompt goes out carrying an edit, so the line under the field, which counts what goes, is what teaches it. With no key and a source answering, the line already says the source reads none and a model reads them once it has a key, which is why it follows step 8. The list's name becomes "Ten things to try"; the ending ("Welcome / to Parliament", then `focus:`) comes after step 10. Someone who finished the eight steps stays finished; someone part way through sees two more.
- **(c) `strikethrough:`** strikes the words selected in the reply last in focus, as `ask:` finds its reply (C218 (a)), the same as Ctrl+Shift+X there. With nothing selected, the Enter line says to select words in a reply first. It is an edit like any other: its card, `undo:242`, Ctrl+Z in the reply. `undo:` alone does not take it back, as the strike is made in the reply, not by the bar; the Enter line after it names the edit's number for `undo:`. The registry's "undo: can take it back" is changed to say so.
- **(d) `tell:"Keep it under a page"`, a choice.** A note in your words that the model reads with your next prompt to the branch here, once (E: "Note for the AI", renamed `tell:` by B). Options:
  1. Held for the next prompt, like `include:` (C176): nothing is stored until that prompt goes, then it goes in the prompt's note, told once, and is kept on the prompt as told. The line under the field counts it ("1 note goes with it"). `undo:` takes it back before then. A reload drops it, as it drops a held `include:`.
  2. Kept as a record until it goes, like an edit: a card in the Collection, `hold:`, survives a reload. A new list, so a stored-data change.
  **Suggestion:** 1. It is small and goes with the next prompt anyway; 2 can follow if notes should wait across sessions.
- **(e) On a source's branch,** a `tell:` note goes to the model that reads your edits there, as edits do (C218 (e)); with no key, the line says it waits.
- **Security and privacy:** a `tell:` note is your own text, sent only to the model the Enter line names, as text in the note; a line with `tell:` is never kept in the command history, as for `note:`.
- **Suggestion:** choose (d), and the rest as above.

**C226. Stage 11, piece 7 as built** (26 October; C225 as ruled). With it, stage 11's pieces are done; the checkpoint follows.
- **Welcome steps 9 and 10.** "Strike through a line", with "select words in a reply, then Ctrl+Shift+X" (⌘⇧X on a Mac); a click writes `>strikethrough:`. "Send it with your next prompt", with "p> and a prompt, with an edit waiting"; a click writes `p>`. The list is "Ten things to try". Both are crossed off from what is stored, as the numbered rows are read: step 9 when any edit strikes words, step 10 when any edit or ask has gone with a prompt. So someone who struck words before this piece finds step 9 crossed off already (the test data did). Someone who finished the eight stays finished; someone part way sees two more.
- **`strikethrough:`** strikes the words selected in the prompt or reply last in focus, the same as Ctrl+Shift+X there (which works in both). The Enter line says what it does; after Enter it says "Struck. It goes with your next prompt as an edit", and once the edit is saved, "Struck as edit 210. undo:210 takes it back". With nothing selected, or no reply clicked into, it says to select words in a reply first. Built differently from the registry: as `undo:` alone cannot take it back, a click on it in the list of commands writes it and waits for Enter, rather than running at once; the registry's rule is that nothing runs on a click that `undo:` cannot take back.
- **`tell:"Keep it under a page"`** (option 1): held in this tab for the next prompt to the chat in the room, nothing stored. Up to 10 notes of up to 1000 characters; the same note twice is refused. `undo:` takes it back; a reload drops it. The Enter line on a prompt counts it: "With it, told once: your note · Haiku 9 reads it". It goes at the end of the prompt's note, under "The person tells you, for this prompt, in their own words:", and is shown on the prompt as "Your note, told once: …", as text. It goes with any prompt sent to that chat from this tab: typed, with Enter on edits alone, or a prompt to several (to the chat here only). A note alone, with nothing typed and no edits waiting, does not send: it waits for a prompt.
- **On a source's branch** (C225 (e)): it goes to the model that reads edits there, at the same time ("Your note goes to Haiku 9 at the same time · Wikipedia reads none"); with no key, "Wikipedia reads no notes. Yours waits for a model with a key: api:", and it stays held.
- **Stored:** no new list and no change to stored data. The note is part of the prompt's `told` text, which piece 3 added; backups carry it as that. A line with `tell:` is never kept in the command history.
- **Tests:** steps 9 and 10 from rows, and progress kept; `strikethrough:` and `tell:` planned and refused; the notes on the Enter line, alone, with edits and on a source's branch; the note written and read back; the strike made and found. 1208 tests.
- **Tried in the browser,** in room 202: the ten steps, step 9 crossed off; a word selected, `strikethrough:`, struck, numbered 210, and taken back with `undo:210`; `tell:` held, counted on the prompt line as waiting for a key, and taken back with `undo:`. **Not tried:** a model reading a note, and step 10 crossed off, as the test data has no key; a note held in a room with no chat yet.

**C227. The stage 11 checkpoint** (proposed 26 October; refactor-plan.md, stage 11; C207, C91, C210 to C226). All seven pieces are built and committed. **Ruled 27 October: (b) option 1 and (c) option 1, both wait for stage 12; then the check in (d).**
- **(a) What to try,** with a key, in Writing Studio: strike words in a reply (select, Ctrl+Shift+X, or `strikethrough:`), type a replacement, ask about a passage (Ctrl+Shift+K, or `ask:`), add `tell:"Keep it under a page"`, then send a prompt and see the next reply say it read them, and the asks answered in place, to accept or undo. Then a table's cell and a chart's number changed; `markup:off`; the Collection's cards for edits and asks; `undo:` with an edit's number; the welcome list's steps 9 and 10. Not yet tried by me with a model, as the test data has no key; nor Zen, LibreWolf or Android (C209 (d)).
- **(b) Drafting Desk's future** (C207 (3), a choice). C207 ruled that its retirement into Writing Studio is proposed once in-place editing, asks and Ripple do what its document editor does. Stage 11 built the first two; Ripple and suggestions are stage 12. Options:
  1. Wait: propose the R line at the stage 12 checkpoint, when Ripple exists, and nothing changes now.
  2. Propose it now, to go after stage 12, so the decision is made today.
  **Suggestion:** 1. Until Ripple is built, Drafting Desk is the only place its documents' Ripple data shows, and comparing the two is the reason to wait.
- **(c) Secretarybird's stored comments and suggestions** (C91, a choice). In your second backup, Drafting Desk documents hold 9 comments (a passage, your question and the model's answer) and 57 suggestions from the model. They are shown in Drafting Desk as before (checked at stage 2). Options:
  1. Leave them where they are, decided again with (b): asks and suggestions are reviewed together with Ripple after the refactor (your ruling on asks, 26 October), and suggestions have no list to go into before stage 12.
  2. Turn the 9 comments into asks now, answered, with their passages, in a one-time upgrade shown to you first; the 57 suggestions wait for stage 12.
  **Suggestion:** 1. It changes no stored data, and nothing is out of sight.
- **(d) A check still to make** (C207 (2)): Quiet Room and Pocket Chat get in-place editing through the same messages block, but the test data has only Writing Studio installed, so they are not yet tried. **Suggestion:** I add both rooms to the trial copy and try a strike and an ask in each, before stage 12 starts.
- **Suggestion:** (b) 1, (c) 1, then (d), then stage 12.
- **(d) Checked 27 October** on the trial copy, in the in-app browser: with `set:room "Quiet room"`, then `set:room "Pocket chat"`, a prompt each started a new chat in that room (212 in Quiet Room, 216 in Pocket Chat, both answered by Wikipedia). In each, a passage selected and struck with Ctrl+Shift+X was saved as an edit (213, 217), and a passage asked about with Ctrl+Shift+K was kept as an ask with its marker (214, 218); in 212 the prompt line counted "1 edit and 1 ask" as waiting for a key. Nothing differed from Writing Studio. The room new chats start in was set back to Writing studio after. Pocket Chat was tried at desktop width, not on a phone (C94). Stage 11 is done.

**C228. Stage 12 in pieces: Ripple, sweeps, Reflection** (proposed 27 October; refactor-plan.md, stage 12; the editing spec, "Ripple across branches", "Sweeps", "Reflection" and its open questions; inline editing v5; C56, C164, C207, C220, C227). **Ruled 27 October: (b) 1, (c) 1, (h) 1, (i) 1, and the rest as suggested; the stored data shown in full, then piece 1.** Each piece is committed and checked before the next, as stage 11 was.
- **What exists today** (a survey of the code, 27 October):
  - **Ripple** exists only as Secretarybird's, inside Drafting Desk: a document-wide check folded into "Submit & Branch", and a scan across chosen documents, one call each to Haiku, its findings written into the other documents' paragraphs. Its prompts and the way it reads the model's JSON are what the plan salvages. It stays as it is until Drafting Desk's future is decided (C227 (b)).
  - **The Review modal** makes one call with the last 20 messages and the person's markings and asks for a synthesis; its "prompts for reflection" are built without a call. It stays until you have compared it with the Reflection board (the plan).
  - **Reflection** is a board name with a placeholder card. `sweep:` and `reflect:` are in the registry with nothing behind them. `accept:` and `reject:` act on answered asks only.
  - **The `suggestions` list** was made empty by the version 6 upgrade, with a number and a chat on each record; nothing reads or writes it yet, and backups leave it out.
- **The pieces:**
  1. **Suggestions in place.** A suggestion struck and suggested inside a reply, in rust with a dashed line for Ripple and green with a dotted line for a sweep, as v5 draws them; a marker, "ripple 244: accept · reject"; its card under a new Suggestions tab in the Collection ("the same as your edit 242 in 201a", or the framework and its rule), its count rust while any are open; the review bar, "‹ 1 of 3 › · accept · reject · accept all", with A, R and the arrow keys, moving the room to each branch and flashing the spot; `accept:244`, `reject:244`, `accept:all`, `reject:all`; `undo:` takes an accept or reject back. Nothing makes suggestions yet, so this piece is tried with suggestions made by its tests and on the spike page. The stored form (a) is shown to you in full before this piece writes anything.
  2. **Ripple.** `ripple:on` and `ripple:off`, also "ripple: off" in the room's head beside markup · clean. When on, the edits that go with a prompt to one branch are checked against the plan's other branches: a prompt edit against their prompts, a reply edit against their replies, one call per branch. The prompt's Enter line says so first, with who checks and the cost ("Ripple checks 201b and 201c: 2 calls to Haiku 5.5, about $0.01"). What comes back lands as suggestions in each branch; an accepted one becomes your edit there, in blue, and goes with your next prompt to it. The branch tabs count open suggestions in rust beside your blue.
  3. **Sweeps.** `sweep:201a pushback`: a framework's instruction applied to 201a's last reply, one call, the model asked for at most one suggestion per sentence, never joining sentences; they land in green. Accepted, a sweep suggestion becomes part of the reply, as an accepted answer does, so nothing is told to the model.
  4. **The Reflection board.** Opened as any board is (`open:reflection`, its title on the strip). Its head says "from 201 · reads, never writes". Two sections cost nothing: Marked so far (edits, asks, suggestions and highlights, and which branches) and Session (messages, tokens, cost). `reflect:` or its button is one call, named first ("Reflect · 1 call to Haiku 5.5"): a synthesis of what you have been steering toward and what you have not touched, three questions drawn from your own markings, and, when the replies show a pattern a framework could fix, a proposal ("Sweep 201a as Push back on me · 1 call"), which writes the `sweep:` line into the bar for your Enter.
  5. **Talk about the chat.** With the Reflection board addressed, the bar's prompt goes to the board, never into the chat: "Nothing said here goes back into 201" under the field; each message one call, named first; a question from the board, clicked, fills the field.
  6. **The checkpoint,** with Drafting Desk's retirement put as an R line (C227 (b)), Secretarybird's comments and suggestions (C91, C227 (c)), and the Review modal compared with the Reflection board.
- **Open points,** each with its suggestion:
  - **(a) Stored data** (shown in full before piece 1 writes anything, as C212 was). No upgrade and no version change. A suggestion is one record in the existing `suggestions` list: number (from the shared counter, C56), chat, message, prompt or reply, kind (ripple or sweep), the words struck and suggested as plain text, its place, where it came from (the edit and branch it carries, or the framework's name and the instruction it applied, as they were), the model that made it, its state (open, accepted, rejected), and when. In the reply's stored form, two new marks on runs carry the suggestion's id, as edits' marks do. Ripple on or off is a new optional field on the plan. Backups carry a chat's suggestions as they carry its edits and asks; every backup written before reads as it always has. Deleting a chat deletes its suggestions; the lock seals them as it does edits. **Suggestion:** approve this outline now; the full list follows with piece 1.
  - **(b) Ripple's reach** (the spec's open question; a choice). Branches are chats in a plan (C172 (a)), so "the other branches" are the plan's other chats. Options:
    1. Only the other branches of the plan the room shows.
    2. Those, and other plans or chats you name.
    **Suggestion:** 1. Each branch is one call, and the plan's branches are the ones that share a prompt; 2 can follow.
  - **(c) Who checks, sweeps and reflects** (a choice). Options:
    1. The helper model, the one `helper:` already names for summaries and Wikipedia text, so one setting covers the "small jobs" and the cost stays low.
    2. The model that answers in the branch.
    **Suggestion:** 1, as v5 draws it ("1 call to {helper}"). With no key for it, the line says what waits and why, as edits on a source's branch do.
  - **(d) When Ripple runs:** when edits go with a prompt (the spec), not as you type. A hold-back edit is not checked; nor is a source's branch, whose words the source wrote. **Suggestion:** yes.
  - **(e) Sweep's reach** (the spec's open question): the last reply of the branch named, from the bar or from Reflection's proposal; a whole branch or every branch later, if wanted. Without a framework named, the Enter line lists the chat's frameworks to pick one. **Suggestion:** yes.
  - **(f) What the model sends back is data.** Each suggestion comes back as JSON quoting the words it would change exactly; a quote that is not found once, exactly, in that reply or prompt is dropped, and the line says how many could not be placed. Suggested words are shown as text, never markup, and never run a command. Other branches' words go to the model as material, marked as such, and a source's answer goes through the same check as `include:` (C176). **Suggestion:** yes.
  - **(g) Version history** (the spec's open question): an accepted suggestion removes the words it replaced from the reply, and its card keeps both. **Suggestion:** the card is the record for now; a reply's history can follow if wanted. **Two counts on a tab** (blue and rust): as the spec draws them; moved to the Collection only if it reads as busy.
  - **(h) Reflection's source** (the spec's open question; a choice). Options:
    1. The chat the room shows and the other branches of its plan.
    2. That, or a collection, or a plan you name.
    **Suggestion:** 1 first, with 2 following in this stage if you want it now.
  - **(i) What Reflection keeps** (a choice). Options:
    1. Nothing stored: the synthesis, questions and talk stay until the tab closes; `note:` keeps any of it as a note in the Collection, and `export:md` saves it as a file.
    2. Each reflection kept as a record, a new list, so a version change shown first.
    **Suggestion:** 1. It keeps "reads, never writes" literal, and 2 can follow.
  - **(j) "Never writes" enforced:** the Reflection board's code gets a reader that only reads (the chat, its plan and their markings), and a lint rule refuses any import of the modules that write, checked by a test. **Suggestion:** yes.
  - **(k) The names on screen:** "ripple", "sweep", "Reflection", "Suggestions" as the spec has them; "collab" is "framework" everywhere (C131). Rust appears for Ripple only, green dotted for sweeps and asks' answers; gold is untouched. **Suggestion:** yes.
  - **(l) Not in this stage:** reviewing asks with Ripple side by side (your ruling: after the refactor); `calm:` and focus per room (stage 14).
- **Security and privacy:** every call is named with its model and cost before it runs and goes through the gateway; Ripple sends the plan's other branches only to the model the line names; what comes back is data, placed only where its quote matches; Reflection cannot write; nothing new is sent to any host.
- **Suggestion:** rule (b), (c), (h) and (i); then piece 1, with (a) shown in full first.

**C229. The stored data for suggestions, in full** (27 October; C228 (a), its outline approved; laid out as C212 was). Shown before piece 1 writes anything.
- **(a) No upgrade.** The database stays at version 6. Nothing already stored is read, rewritten or moved. What is new is records in the `suggestions` list, which the version 6 upgrade made empty for this, three optional fields on a run in a reply's stored form, and, from piece 2, one optional field on a plan.
- **(b) A suggestion: one record in `suggestions`,** written when it lands in a reply, which is when it takes its number from the shared counter (C56). Fields: `id` (the message's id and the suggestion's mark id, as an ask's is); `mark` (the id its marks in the reply carry); `num`; `conversationId`; `messageId`; `part` (reply or prompt); `kind` (ripple or sweep); `struck` and `suggested`, as plain text, for its card and for search; `places` (its block and its start and end there, as an edit's are); `from`, where it came from as it was then: for Ripple, the edit it carries (its number, its chat and its branch's address), for a sweep, the framework (its id, its name, and the instruction applied, word for word, so a later change to the framework leaves the card true); `model` (who made it); `state` (open, accepted, rejected); `createdAt`, `updatedAt`. Settled, a record stays, as the record of what was suggested and what you chose.
- **(c) In the reply's stored form,** a run gains `suggestOut` (words the suggestion would strike) or `suggestIn` (the words it suggests), each holding the suggestion's mark id, and `suggestKind` (ripple or sweep) for its colour. The suggested words are not the reply's until accepted: they are left out of the reply's words wherever those are read (copied, searched, joined into a prompt, sent), as an ask's answer is. A reply with no stored form yet gets one when its first suggestion lands, built from its text as editing does; its `content`, what the model wrote, never changes.
- **(d) Where one may land:** only on words that stand unmarked (no edit, ask or other suggestion on them), found exactly once in one line. Anything else is not placed, and the line that made it says how many were not.
- **(e) Settling:**
  - **Ripple, accepted:** the struck and suggested words become a new edit of yours, numbered and saved as any edit is, and it goes with your next prompt to that branch.
  - **A sweep, accepted:** the suggested words become the reply's, and the struck words go, as an accepted answer does.
  - **Rejected:** the suggested words go and the reply stays as it was.
  - The record's state changes; `undo:` puts the reply and the records back, as for asks.
- **(f) Ripple on or off,** from piece 2: `ripple` on a plan, true when on. Absent means off.
- **(g) Locked away, deleted, erased:** with Parliament locked, a suggestion is sealed except its number and chat, as the lock's list already says. Deleting a chat or a message deletes its suggestions with it, in the same transaction; `erase:` and Erase everything remove them too, as for edits and asks.
- **(h) Backups.** A chat in a backup carries its `suggestions`, in the format 2 file as it is, with no new format number. They are optional when read, so every backup written before reads as it always has. A restore treats them as asks: renumbered unless a replace keeps the file's numbers, pointed at the restored chat and message; the counter after a replace counts them.
- **(i) Tested before piece 1 is committed:** a suggestion placed and read back the same; placing refused on marked words or a passage found twice; accept and reject of each kind, and undo after each; the reply's words without the suggested words; a backup with suggestions restored, renumbered and as kept; a backup from before restored; deleting a chat and a message; a locked database.
- **Built as shown,** with piece 1 (C230).
- **One point for piece 3, not now:** an accepted sweep changes the reply, but the model that answers in the chat reads what it wrote, not the reply as edited, and the sweep was made by another call. Whether an accepted sweep is told to it as a change is put to you with piece 3.
- **Suggestion:** as above.

**C230. Stage 12, piece 1, as built: suggestions in place** (27 October; C228, C229).
- **In the reply:** Ripple's suggestion in rust, dashed; a sweep's in green, dotted. The words it would strike are struck in its colour, and the words it suggests follow, with a marker "ripple 219: accept · reject". "ripple 219" finds its card. A screen reader hears "suggested to remove: …" and "suggested: …" at their edges, as it hears "removed:" and "added:" for edits.
- **Settling in place:**
  - **A sweep's, accepted:** the suggested words become the reply's and the struck ones go.
  - **Ripple's, accepted:** the struck words are typed over with the suggested ones by the editing rules themselves, so it becomes an edit of yours, numbered, that goes with your next prompt.
  - **Rejected:** the reply stays as it was.
  - The record keeps what you chose. Ctrl+Z takes an accept back in one step, and the suggestion is open again.
- **The Collection:** a Suggestions tab, its count in rust while any wait. Each card shows:
  - where the suggestion came from ("the same as your edit 242 in 201a", or "framework: Push back on me, "…"");
  - the words struck → suggested, in its colour;
  - its number and branch, "by Haiku 5.5", and its state (waiting for you, accepted: now your edit, rejected);
  - accept and reject while it waits.

  The legend gains "rust, dashed: Ripple's suggestion". Over the tab, the review bar: "Review ‹ 1 of 2 › · accept · reject · accept all". Built as follows:
  - Its keys (a, r, and the left and right arrows) work while the Collection is addressed and nothing is being typed, so they never take a letter meant for the bar or a reply.
  - Moving finds the suggestion in its branch, the room following.
  - Its "accept all" accepts the ones it lists, by number.
- **From the bar:** `accept:219`, `reject:219, 220`, and `accept:all` / `reject:all`, which now take the suggestions waiting in the room's chat and its plan's other branches with the answers there. `undo:` takes any of them back. `undo:219` and `delete:219` point to accept: and reject:. A row is a suggestion only under `type:suggestion` in Records.
- **Stored as C229 shows,** with no upgrade.
- **Fixed in passing:** in clean view, the passage an ask's answer would replace was hidden; it now stands, as the spec has it ("pending answers and suggestions not yet applied").
- **Tests:** a new set for placing and settling, and one for the records. They cover:
  - placing: once only, on unmarked words, building a stored form for a reply never edited;
  - settling: each kind accepted and rejected, Ripple's accepted then undone from its card, from the bar on the stored form;
  - the records: numbered, opened again after Ctrl+Z, gone with the message and the chat, put back by undo:;
  - backups: kept, renumbered, a replace keeping numbers, a backup from before, one whose reply is not in the file;
  - the bar's lines.

  1,228 tests.
- **Tried in the browser,** on the trial copy, with a Ripple suggestion (219) and a sweep's (220) placed in 216's reply by the same storing function piece 2 will use:
  - both drawn in their colours with their markers;
  - the Suggestions tab and its review bar, 1 of 2;
  - `a` accepting 219, which became edit 221, struck and blue;
  - `undo:` putting it all back;
  - 220 accepted from its marker, and Ctrl+Z bringing it back open;
  - 219 accepted in place and taken back with one Ctrl+Z.
- **Not tried:** suggestions made by a model, which comes with piece 2.

**C231. Stage 12, piece 2: Ripple, its open points** (proposed 27 October; C228 piece 2, (b), (c), (d), (f); C229 (f); the editing spec, "Ripple across branches"). Each follows the rulings already made and is built as suggested, so a ruling changes one entry.
- **(a) What is compared.** An edit to a prompt is checked against the same prompt in each other branch of the plan (the first prompt against the first prompts, and so on); an edit to a reply against the same reply. All the edits going with one prompt go in one call per branch. A branch with no such prompt or reply is skipped.
- **(b) What the helper is sent:**
  - each edit, as the words struck and the words written, with the line it sits in before and after;
  - the other branch's prompt or reply as it reads now, your struck words left out and your own words in;
  - each in its own tag, said to be material, not instructions.

  Nothing else from the chats goes. Held-back edits are not sent. A source's branch is neither checked from nor into (C228 (d)), so Wikipedia's words never go to the helper this way.
- **(c) What comes back** is JSON: at most six suggestions per branch, each quoting the exact words it would change and giving the new words, and naming the edit it carries. It is read as data, placed only where its quote stands unmarked once (C229 (d)), and the words are shown as text. Nothing else the helper writes is shown.
- **(d) The prompt's Enter line,** before Enter: "Ripple checks 201b and 201c: 2 calls to Haiku 5.5, about $0.01". If the helper has no key, the line says "Ripple is on, but checking needs a key for the helper: api:", and the prompt goes without it. After Enter the bar says "Ripple: 2 suggestions in 201b, none in 201c" once the checks end, and names any branch it could not check. The prompt goes whatever Ripple does.
- **(e) The switch.** `ripple:on` and `ripple:off` act on the plan of the chat in the room. It is kept on the plan (C229 (f)), so every branch shares it, and `undo:` takes it back. A click on "ripple: off" in the room's head writes `>ripple:on` into the bar and waits for Enter, since it costs; the head shows it only when the chat is in a plan with other branches. In a chat with none, the line says there is nothing to check.
- **(f) When.** Once, the moment a prompt carrying edits goes to a branch, Enter on edits alone included. It never runs as you type, and never twice for the same edits.
- **(g) On the branch tabs,** open suggestions are counted in rust beside your blue.
- **(h) A suggestion's `from`** holds the edit's number, its chat's number and its branch's address (C229 (b)), so its card reads "the same as your edit 242 in 201a".
- **Security and privacy:** one call per branch, through the gateway, to the helper the line names, with the cost named first. The helper sees your edits and the other branches' words only. What it returns cannot run a command, write HTML or land anywhere its quote does not match.
- **Suggestion:** build as above.

**C232. Stage 12, piece 2, as built: Ripple** (27 October; C231 as proposed).
- **The check:** `lib/ripple.js` matches each edit going with a prompt to the same turn in each other branch of the plan, and sends one call per branch to the helper. The call is a new `ripple` method on each provider (Anthropic, Mistral, Ollama on this computer), through the gateway. Its instructions and the reading of its answer are shared (`providers/shared.js`):
  - each edit goes with the line it sits in, before and after;
  - each matching prompt or reply of the other branch goes in a tag with an id, as it reads now;
  - text inside cannot close its tag;
  - the answer is JSON. A suggestion is kept only if it carries an edit that was sent, quotes a part that was sent, fits on one line and is short. At most six per branch.
- **Landing:** each is placed where its quote stands unmarked once, and stored as C229 has it, with "the same as your edit 242 in 201a" on its card. If the reply changed while the check ran, it is placed again on what it is now. The bar says what happened when all the checks have ended: "Ripple: 1 suggestion, in 201b", or "nothing to carry over in the branch it checked", with what could not be placed and which branches could not be checked. The prompt goes whatever Ripple does.
- **The switch:** "ripple: off" in the room's head when its chat is in a plan with other branches; a click writes `>ripple:on` into the bar. Turned on, it reads "ripple: on" in rust. `ripple:on` and `ripple:off` name the plan, the branches and who checks ("Enter turns Ripple on for plan 215: when edits go with a prompt, Haiku 5.5 checks 215a for the same change, one call per branch"), or say a key is needed. `undo:` takes either back. Kept on the plan as `ripple`, carried by backups.
- **The prompt's line:** "Ripple checks 201b and 201c: 2 calls to Haiku 5.5, under $0.01", or "Ripple is on, but checking … needs a model with a key: api:". Ripple runs only when a model answers the branch and the prompt goes to that one branch: not on a source's branch (C228 (d)), and not for a prompt to several or to several branches at once, whose other branches are the ones being written.
- **Branch tabs:** open suggestions counted in rust beside your blue.
- **Found and fixed while building:**
  - **A new branch copied its parent's open suggestions,** with no records behind them, as markers with no number. A branch's copies now leave suggestions out: the struck words stand and the suggested ones go. They stay with the original.
  - **A second room on screen (`room-2`, C175 (a)) refused the commands that work in a room** (`tell:`, `ripple:`), saying they work on Rooms. The bar now counts any room as a room.
- **Tests:**
  - the matching and the request, a source's answer never sent, tags kept in;
  - reading what comes back;
  - the whole check with a stand-in for the helper, from an edit in one chat to a stored suggestion in the other: placed, none to suggest, could not place, could not check;
  - `ripple:on` and `ripple:off`;
  - the prompt's line, priced and unpriced, with and without a key, and silent when a source answers;
  - a branch copied without suggestions;
  - a second room taking `tell:`.

  1,244 tests.
- **Tried in the browser,** on the trial copy. Its chats are all answered by Wikipedia, so I made a second branch of my test chat 216 (`new:branch 216`, now 223, plan 215) and marked both test replies as a model's, in the trial copy only. Then:
  - "ripple: off" shows in 223's head;
  - a click writes `>ripple:on`, whose line said a key is needed;
  - Enter turned it on, the head read "ripple: on" and the plan kept it;
  - `ripple:off`, then `undo:`, put it back on.

  Plan 215 is left with Ripple on.
- **Not tried:** a real check by a model, as the trial copy has no key. The same path is covered end to end with a stand-in for the helper, and the landing was tried in the browser in piece 1.

**C233. Stage 12, piece 3: sweeps, its open points** (proposed 27 October; **ruled 27 October: (a) option 1, told once, as built**; C228 piece 3, (c), (e); C229, its point for piece 3; the editing spec, "Sweeps"). Built as suggested, so a ruling changes one entry. (a) is the choice C229 left for this piece.
- **(a) An accepted sweep and the chat's model** (a choice). The model that answers in the chat reads what it wrote, not the reply as edited, and the sweep was made by the helper in another call. So once you accept a sweep's suggestion, the reply you read and the reply the model reads differ. Options:
  1. **Told once, with your next prompt to that branch,** as an edit is: "You accepted a change suggested under the framework Push back on me to your reply 2: "…" now reads "…"". It is counted on the prompt's line ("With it, told once: 2 changes you accepted from a sweep"). The suggestion's record gains an optional `sent` (to whom, when, with which prompt), as an edit's has, so it is told only once. That one field is the only change to stored data, shown here.
  2. **Not told:** the spec's line ("the model wrote it, so there is nothing to tell it"). The model goes on reading the reply as it wrote it.

  **Suggestion:** 1. The spec's line assumed the chat's own model wrote the sweep, which, with the helper making it (C228 (c)), it does not.
- **(b) What `sweep:` sweeps:**
  - `sweep:201a pushback` (or `sweep:216 pushback`) applies that framework's instruction to that branch's last reply, a model's.
  - `sweep:201a` alone lists the chat's frameworks on the line to pick one; `sweep:` alone, the room's chat.
  - A framework is named as `framework:` takes it: a built-in's id, or a name or its start.
  - A source's answer is not swept, as Ripple does not check into one: its words are the source's.
- **(c) What the helper is sent:** the framework's name and instruction, as the person's rule, and the reply as it reads now, in a tag it cannot close, as material. Nothing else from the chat.
- **(d) What comes back:** JSON, at most 30 suggestions, each quoting a sentence or part of one exactly and giving it rewritten under the rule. It must never join or split sentences; a quote over a line break is dropped. Each lands as C229 (d) has it, in green, dotted, its card naming the framework and the instruction applied.
- **(e) The Enter line:** "Enter sweeps 201a's last reply as Push back on me: one call to Haiku 5.5, about $0.01. At most one suggestion per sentence". Or "needs a model with a key: api:". After it: "Sweep: 4 suggestions in 201a", with what could not be placed. A sweep cannot be taken back by `undo:`, as it spends; its suggestions are rejected one by one or with `reject:all`.
- **(f) Reflection's proposal** ("Sweep 201a as Editor · 1 call") comes with the Reflection board in piece 4, and writes this same command into the bar.
- **Security and privacy:** one call, named with its model and cost first, through the gateway, to the helper. What comes back is data, placed only where its quote matches.
- **Suggestion:** (a) 1, and the rest as above.

**C234. Stage 12, piece 3, as built: sweeps** (27 October; C233 as suggested, (a) built as option 1, so a ruling of option 2 takes out one part).
- **`sweep:`:** `sweep:201a pushback` (a branch), `sweep:216 editor` (a chat's number), `sweep:201a` (lists the chat's frameworks to pick from), `sweep:` (the room's chat). A framework is named as `framework:` takes it, a name's start included ("push"). The Enter line: "Enter sweeps 215b's last reply as Push back on me: one call to Haiku 5.5, under $0.01. At most one suggestion per sentence". It refuses with a reason:
  - a source's answer ("211a was answered by a source, whose words are not swept");
  - a plan without a branch named;
  - a word that names no framework;
  - no key ("Sweeping 215b as Push back on me needs a model with a key: api:").
- **The call:** a new `sweep` method on each provider, through the gateway, to the helper. It sends the framework's name and instruction as the rule, and the last reply a model wrote, as it reads now, in tags it cannot close. Nothing else is sent. What comes back is JSON: at most 30 suggestions, each on one line, changed, and quoted once. They land in green as C229 has them, the card naming the framework and the instruction applied. The bar is free meanwhile, and says when the sweep ends: "Sweep: 4 suggestions in 215b", or that the framework would change nothing, or that it did not come back.
- **(a), option 1:** an accepted sweep change is told once, with the next prompt to that branch, in the same note as edits:
  - the note reads "The person accepted changes to your reply 1 that another model suggested under their rule "Editor". Your reply now reads: - "…" now reads "…"";
  - the prompt's line counts them ("With it, told once: 2 changes you accepted from a sweep · Sonnet 5.5 reads them");
  - the record keeps `sent` and is never told again;
  - its card reads "accepted: told with your next prompt", then "accepted, told to Sonnet 5.5, 27 October".

  The one change to stored data is `sent` on a suggestion record, carried by backups.
- **Landing shared:** Ripple's and sweeps' suggestions land through one function (`landSuggestions`), placed again if the reply changed meanwhile.
- **Tests:**
  - the Enter lines and their refusals;
  - what is sent, tags kept in;
  - reading what comes back;
  - the last reply a model wrote, never a source's;
  - from landing to acceptance to the note told once and never again;
  - the prompt's count.

  1,252 tests.
- **Tried in the browser,** on the trial copy, with no key:
  - `sweep:215b` asked for a framework;
  - `sweep:215b push` named Push back on me and said a key is needed;
  - `sweep:211a push` refused a source's answer.
- **Not tried:** a real sweep by a model, as the trial copy has no key. The landing and accepting were tried in the browser in piece 1, with a sweep suggestion placed by the same function.

**C235. Stage 12, piece 4: the Reflection board, its open points** (proposed 27 October; C228 pieces 4 and 5, (c), (h), (i), (j); the editing spec, "Reflection"; inline editing v5). Built as suggested, so a ruling changes one entry.
- **(a) Talking about the chat comes with the board,** pieces 4 and 5 together. The board's field rests in prompt mode, as the board registry has it, so a prompt typed with Reflection addressed must go to the board from the start, never into the chat. **Suggestion:** yes.
- **(b) What it reads:** the chat in the room and the other branches of its plan (C228 (h), option 1). It is opened with `open:reflection` or its title on the strip. Its head reads "from 201 · reads, never writes", 201 being the plan when it has other branches, else the chat. With no room on screen it says to open one.
- **(c) What costs nothing:**
  - **Marked so far:** your edits, asks, suggestions, keywords, quotes and notes, counted, and in which branches.
  - **Session:** messages, tokens as the providers reported them, and the cost.
- **(d) Reflect,** the button or `reflect:`, is one call to the helper (C228 (c)), named first: "Enter reflects on 201 and its branches: one call to Haiku 5.5, about $0.02". It goes under the room chat's frameworks, named on the line, so Push back on me changes what it notices. What it is sent, each part in a tag, as material:
  - each branch's turns as they read now, a source's answer marked as a source's, and the oldest left out past about 24,000 characters (the line says when);
  - your markings: edits, asks and their answers, notes, keywords, quotes, suggestions and what you chose;
  - the frameworks there are, so it can propose a sweep.
- **(e) What comes back** is JSON, shown as text:
  - a synthesis of what you have been steering toward and what you have not touched, at most about 200 words;
  - three questions drawn from your markings;
  - a proposal or none: a branch it read, a framework among yours and the built-in ones, and why.

  The proposal's button writes `>sweep:201a pushback` into the bar for your Enter (C233 (f)).
- **(f) Talk about the chat:** with the board addressed, the field's prompt goes to the board, and "Nothing said here goes back into 201" is said under it. Each message is one call to the helper, named first, with the same material and the talk so far. A question, clicked, fills the field.
- **(g) What it keeps** (C228 (i), option 1): the reflection and the talk stay in the tab until it closes, or until the room shows another chat. "keep as a note" writes `>note:"…"` with the synthesis into the bar, so it goes into the Collection as your note. A file of it can follow if wanted.
- **(h) Reads, never writes, enforced** (C228 (j)):
  - the board and its module (`lib/reflection.js`) read only through what they are given: rows on screen and a reader of messages;
  - a lint rule refuses, in those files, any import of the database, the records module or the stores;
  - a test checks the rule holds;
  - the calls go through the gateway, as every call does.
- **(i) The Review modal** stays as it is, to be compared at the checkpoint.
- **Security and privacy:** every call names its model and cost first and goes through the gateway to the helper. The chats go to it as material, a source's text marked as such. What comes back is shown as text and can only write a command into the bar for your Enter.
- **Suggestion:** build as above.

**C236. Stage 12, pieces 4 and 5, as built: the Reflection board and the talk about the chat** (27 October; C235 as suggested).
- **The board:** `open:reflection` (or its title on the strip) opens it beside the room. It replaces the placeholder. Its head reads "from 215 · reads, never writes". With no room on screen it says to open one.
  - **Marked so far, no call:** "1 edit, 1 ask, and 2 suggestions, across 215a".
  - **Session, no call:** "4 messages · no tokens reported · cost not known", from what the providers reported and Records knows.
- **Reflect,** the button or `reflect:`. The button writes `>reflect:` into the bar, and Enter runs it. The line reads "Enter reflects on 215 and its branches: one call to Haiku 5.5, under $0.01", with "Under Push back on me" when the chat has frameworks, and "It is long: the oldest turns are left out" when it is. Without a key it says one is needed.
  - **The call:** a new `reflect` method on each provider, through the gateway, to the helper. It is sent:
    - the branches' turns as they read now, a source's marked as text fetched from a website;
    - the markings, as text;
    - the frameworks, with the chat's own as the helper's standing instructions;
    - all in tags the text cannot close.
  - **Shown as text:**
    - the synthesis, with "keep as a note" (writes `>note:"…"` into the bar) and "reflect again";
    - three questions, each of which, clicked, writes `p>…` into the bar to talk about;
    - a proposal, kept only for a branch it read and a framework it was offered. Its button writes `>sweep:215a pushback` for your Enter.
- **The talk:** with the board addressed, the bar's prompt goes to the board, never to the chat. The field's margin reads "→ Reflection", not the room's chat. The line says "Enter asks Haiku 5.5 about 215: one call, under $0.01 · Nothing said here goes back into 215". Each message is one call (`reflectTalk`) with the same material, the synthesis and the talk so far. The board shows it as text, the answer arriving in place of "Writing…".
- **What it keeps:** the reflection and the talk stay in this tab, and are cleared when the room shows another chat. Nothing is stored.
- **Reads, never writes** (C228 (j)):
  - the board and `lib/reflection.js` are given what they read: rows, and a reader of messages;
  - a lint rule refuses, in those two files, imports of the database, the records module, the stores, migrations, backups and restores, the providers and the gateway;
  - a test follows every local import from both files, and finds none of those reached, directly or sideways.
- **Tests:**
  - what it reads, counts and sends, tags kept in, a source marked;
  - reading what comes back, a proposal kept only when it fits;
  - reading only through the reader given;
  - `reflect:` and the talk on the Enter line;
  - the import walk.

  1,260 tests.
- **Tried in the browser,** on the trial copy, with no key:
  - `open:reflection` opened it beside room 223;
  - it read plan 215 and counted its markings and messages;
  - Reflect wrote `>reflect:`, whose line said a key is needed;
  - with the board addressed, a prompt showed "→ Reflection" and the same, and went nowhere.
- **Not tried:** a synthesis or a talk by a model, as the trial copy has no key.
- **Next:** the stage 12 checkpoint (C228 piece 6): Drafting Desk's R line, Secretarybird's comments and suggestions, and the Review modal against this board.

**C237. The stage 12 checkpoint** (proposed 27 October; **ruled 27 October: (b) option 2, Drafting Desk kept for now; (c) option 2, with it; (d) R40 approved**; refactor-plan.md, stage 12; C207 (3), C91, C227 (b) and (c), C228 to C236). All pieces are built and committed. Waiting for Stefan: (b), (c) and (d) are choices.
- **(a) What to try, with a key,** since nothing in stage 12 has yet been tried with a model:
  - **Ripple:** in a plan with two branches answered by a model, `ripple:on` from the room's head, an edit in 201a, then a prompt. The line names the checks and the cost; the suggestions land in 201b in rust; review them from the Collection's Suggestions tab with a and r. An accepted one is your edit, blue, and goes with your next prompt there.
  - **A sweep:** `sweep:201a pushback`, its suggestions in green; accept one and see the next prompt's line say it is told.
  - **Reflection:** `open:reflection`, Reflect, the three questions, the proposal's button, and a question or two typed with the board addressed.
- **(b) Drafting Desk** (C207 (3), C227 (b); a choice). Stages 11 and 12 now do what Secretarybird does to a reply: tracked edits, comments as asks answered in place, the model's suggestions, Ripple, and branching from an edit. One thing they do not do: a long document of your own as the main surface. In Parliament your own words are prompts. In your second backup, 17 of 21 chats are Drafting Desk documents. Proposed as **R39**:
  1. **Retire it into Writing Studio after a conversion:** each document becomes a chat in Writing Studio, its text the chat's first prompt, yours to edit in place. Its comments become answered asks, its suggestions open suggestions, its Ripple notes notes. This would be a piece of its own, a change to stored data shown first and tried on a copy of your backup, and only then would Drafting Desk go.
  2. **Keep it as a room for now,** its documents as they are, and decide after the refactor, with the review of asks and Ripple you asked for (26 October).

  **Suggestion:** 2. Writing in a document of your own is a different way of working from editing a reply, and choosing how it should look in Parliament is better done after the refactor, with asks and Ripple in view, than hurried into a conversion of most of your chats now. R39 stays in the table, deferred.
- **(c) Secretarybird's comments and suggestions** (C91; a choice that follows (b)). They are shown in Drafting Desk as they always were.
  1. **With (b) 1:** converted with the documents. The 9 comments become asks, answered and accepted. The 57 suggestions become open suggestions marked "from Secretarybird", in the Suggestions tab.
  2. **With (b) 2:** left as they are, decided with Drafting Desk.

  **Suggestion:** 2.
- **(d) The Review modal against the Reflection board** (the plan: "the Review modal itself stays until you have compared the two").

  | | Review modal (today) | Reflection board |
  | --- | --- | --- |
  | What it reads | The open chat: its last 20 messages, each cut to 300 characters; highlights, notes, favourites | The chat and its plan's other branches as they read now, and every marking: edits, asks and answers, suggestions and what you chose, notes, keywords, quotes |
  | Its call | One call to Haiku, with no instructions and nothing marked as material; cost worked out at fixed prices | One call to the helper, named with its cost before Enter, the chat's frameworks shaping it, text marked as material |
  | What it gives | A synthesis (brief or detailed); questions made without a call from counts | A synthesis, three questions drawn from your markings, and a proposal of a sweep |
  | Your own reflection | A text box, kept nowhere | The talk about the chat, and "keep as a note" into the Collection |
  | Kept | Save as Markdown | In the tab, and as a note |
  | Writes to the chat | Not intended to | Cannot: enforced by a lint rule and a test |
  | Only it has | Brief or detailed; category toggles; a Markdown file | |

  Proposed as **R40**: the Review block and its modal (`review*.jsx`, `ReviewModal.jsx`) move to `src/deprecated/`. Rooms that hold the block keep it in their stored list: a room skips a block it does not know, so nothing breaks and nothing stored changes. Options:
  1. **Approve R40 now.** If a Markdown file of a reflection is wanted, it is added to the board, as `export:md` on Reflection.
  2. **Keep both until the Lab** (stage 13), where blocks are looked at together.

  **Suggestion:** 1. Reflection does all it did, with the model and cost named first and the chat's text sent as material.
- **(e) Not in this checkpoint:** reviewing asks with Ripple (your ruling, after the refactor), and C219's asks as built, approved for now.
- **Suggestion:** (b) 2, (c) 2, (d) 1; then stage 13, the Lab.

**C238. Stage 13 in pieces: the Lab** (proposed 27 October; **ruled 27 October: (h) 1, features of input in this stage; (i) 1, local-only rooms; the rest as suggested**; refactor-plan.md, stage 13; the arrangements spec §2 to §5, §7, §8; Lab v7 and v6; A2, A10, C37, C38, C53, C63, C66, C95, C125, C126, C128, C131, C199, C207 (4)). Waiting for Stefan: (h), (i) and (k) are choices; the rest is built as suggested unless ruled otherwise. Each piece is committed and checked before the next.
- **What exists today** (a survey of the code and documents, 27 October):
  - Rooms are mode records (layout, theme, blocks with slot, order and settings, device), drawn by `RoomShell`, which skips what it does not know. Five templates are seeded, with Kingfisher and Starling as "coming soon", empty.
  - The old editor (`/edit`, about 4,000 lines with its rails, tray, dialogs and drag and drop) and the build wizard (`/build`, about 3,000 lines) still work, reached only from today's chat page.
  - In the shell: the Lab's arrangement is declared (Library | Canvas | Blocks), but the Canvas and Blocks draw as placeholders. `lab:`, `edit:`, `done:`, `place:`, `layout:`, `theme:`, `device:` and the room forms of `new:`, `add:`, `rm:` and `set:` answer "not built yet". The Library board is read-only.
  - A room's device is stored but read by nothing. Fifteen block settings are declared that nothing reads (the audit). Layout slots exist in three copies, with fallbacks; slot capacity is not checked.
  - No tests cover rooms, the editor or the catalogue's registry.
- **The pieces:**
  1. **The Lab and the Canvas.**
     - `lab:` brings the Lab (Library | Canvas | Blocks, bar on top, resting in search, as declared, C125), and `done:` takes you back to what you had. `edit:"Reading room"` opens a room there, and `new:room` opens a blank one.
     - The Canvas draws the room by slot ("room for 2 more"), in v7's style, with the room line: its name, then Layout, Theme and Built for, then name and inspect.
     - `layout:`, `theme:`, `name:` and `device:` act on the room in the Lab. Every command saves (A10) and is one step for `undo:`.
     - A layout change keeps each block where it has room, else its next fit, else takes it out, the Enter line saying which. The layout manifest becomes the one list of slots and capacities (R36).
  2. **The Blocks board.**
     - Rows by slot ("2 of 3"); each opens to Sits in (`place:`), Features, Settings, move up and move down, inspect and rm.
     - `add:`, `rm:`, `place:` and `set:keywords colour yellow`. One of each block per room (C63); messages and input stay.
     - Settings apply on click and are echoed under the field with undo; anything that moves, removes or spends waits for Enter (A2, C38). Only settings something reads are shown.
  3. **The Library in full.** Ticking blocks, layouts and themes, and "add to room", which writes `add:`; details opening in place; a room's one action (edit, or duplicate for a template); `duplicate:` copies a room as "Writing studio 2" and opens it in the Lab.
  4. **Trying a room and the guide.**
     - `p>` in the Lab tries the room: a chat in it, tagged "tried in the Lab", the Enter line naming the cost.
     - `new:room guided` (and the first visit) asks six questions, each writing its command: layout, device, place, web search, theme, name.
  5. **Built for a phone** (C238 (g)) and local-only rooms (C238 (i)).
  6. **Features of input** (R24, C238 (h)): web search, voice and attaching files become features of the input block, carried by the bar in prompt mode; then R25 can be carried out.
  7. **The checkpoint,** with R14, R16 to R21, R24, R33, R34 and R36, and the settings nothing reads.
- **Open points,** each with its suggestion:
  - **(a) What the Lab holds:** the Library, the Canvas and the Blocks board, as v7 draws it and the shell already declares it; the Collection can be called in (`open:collection`). **Suggestion:** yes.
  - **(b) Click or Enter** (A2, ruled): a setting, a theme or a device applies on click, echoed, and `undo:` takes it back. A layout, `place:`, `rm:`, `add:`, `duplicate:` and anything that spends wait for Enter. **Suggestion:** as ruled.
  - **(c) `done:`** is in the plan and the command list but defined nowhere. **Suggestion:** it leaves the Lab for what you had before, with the room you edited in its room. Nothing is left to save, since every command saved.
  - **(d) `edit:` on a board.** C53 keeps boards (Records, the Collection, the Plan) not editable in this refactor, against the arrangements spec. **Suggestion:** C53 stands. `edit:` takes rooms, and on a board says boards are not editable yet.
  - **(e) `set:room`** already means the room new chats start in (Settings). **Suggestion:** it keeps that meaning. A room's panel buttons stay as stored and are not offered in this stage.
  - **(f) Names:** C131's: Keywords, Frameworks, "Three panels" and so on, not the mockups' older words. **Suggestion:** yes.
  - **(g) Built for:** `device:mobile` draws the room in its narrow form, rails folded into a sheet, whatever its width; `device:desktop`, as now, narrow only when narrow. The stored device is read for the first time. **Suggestion:** yes.
  - **(h) Features of input** (a choice). This is the largest piece. Web search on for the next prompt only (C66, "to be looked at again"), voice on the device only (C70), and attaching files, all in the bar, in place of three blocks. Options:
    1. In this stage, as piece 6, its own open points proposed then.
    2. A stage of its own after the Lab, so the Lab is tried sooner.

    **Suggestion:** 1, as the plan has it, since the guide's web search question and the Blocks board's Features both need it.
  - **(i) Local-only rooms** (a choice; the plan's security line for stage 13). A room setting, "only models on this computer", under which the Enter line refuses to send to a hosted model or a source. It is a new optional field on a room, `localOnly`, shown here; nothing else in what is stored changes. Options:
    1. Now, in piece 5.
    2. Later.

    **Suggestion:** 1. It is small, and it makes "built for" and privacy something a room can promise.
  - **(j) Kingfisher and Starling** (C207 (4)) stay "coming soon": building them is a design of their own. **Suggestion:** after the refactor.
  - **(k) The old editor and wizard** (a choice, at the checkpoint). R14 and R16 to R21, R33 and R34 retire them once the Lab does what they do. Until then `/edit` and `/build` keep working. **Suggestion:** put to you at the checkpoint, item by item, as usual.
  - **(l) Stored data:** no new list and no version change. Rooms stay mode records; each command writes the room once, and `undo:` writes it back as it was. A tried chat is an ordinary chat with a tag. New: `localOnly` on a room, if (i) 1. Backups carry rooms as they are. **Suggestion:** approve this outline; anything more is shown before it is written.
  - **(m) Security:**
    - Catalogue entries reach the network, keys and stored data only through what a room gives them, held by a lint rule like Reflection's;
    - an entry that calls a model must say so in its manifest;
    - no drag and drop (R16);
    - a click that would remove, move or spend writes the command and waits for Enter.

    **Suggestion:** yes.
- **Suggestion:** rule (h) and (i); then piece 1, with (l) as outlined.

**C239. Stage 13, piece 1, as built: the Lab and the Canvas** (27 October; C238 as ruled).
- **Into and out of the Lab:**
  - `lab:` keeps what is on screen and lays out the Library, the Canvas and the Blocks board, the bar on top, with the room on screen on the Canvas ("Enter opens Pocket chat in the Lab. Each change there is saved as you make it, and undo: takes it back"); with no room, it opens empty.
  - `edit:"Writing studio"` puts a room on the Canvas by its name or its start; a number is refused ("edit: takes a room, by its name").
  - `new:room` makes a room with the conversation in three panels and opens it.
  - `done:` brings back what was on screen. The Lab, and what was there before it, survive a reload.
  - `undo:` after `new:room` takes the room out again while it is still as it was made, and the screen back.
- **The Canvas:**
  - The room by slot, in its own theme ("the sheet: Keywords, Branches · room for more"; a slot that holds one, "full").
  - The room line: the name; Layout, its four choices; Theme, its six; Built for, computer or phone; and "name".
  - A theme or a device, clicked, runs at once and is echoed under the field ("Ran theme:"Deep calm". undo: takes it back").
  - A layout, clicked, writes `>layout:"Three panels"` and waits for Enter, since it moves blocks.
- **The commands:**
  - `layout:"Three panels"`, `theme:"Deep calm"`, `device:mobile` and, with the Canvas addressed, `name:"Essay room"` act on the room on the Canvas, or out of the Lab on the room on screen. Each is saved at once (A10) and is one step for `undo:`, which puts the room back as it was.
  - Layouts and themes are named in your words (C131) or by their start.
- **The layout rule** (refactor-plan.md §4): each block keeps its slot where the new layout has it and room in it, else takes its next fit (its first choice first), else comes out. The Enter line says each ("Keywords moves from the sheet to the left rail"; "… has no place in it and comes out of the room; undo: puts it back"). Exceptions:
  - The conversation is placed first, and a layout with no place for it is refused.
  - The input block stays whatever the layout, as the bar's dock (C37).
  - The slots and their capacity come from the layout manifests alone (R36's replacement in use; the old copies stay until R36 is approved).
- **Features of input:** an older room's web search, voice input and file attach blocks show as features of its input ("Input · voice input, web search, file attach"), and go where the input goes; piece 6 makes them features in full.
- **The Enter line** names a room's blocks and slots in your words (`block`, `fromSlot`, `toSlot` in the copy table). A second room board, or the Canvas or Blocks board in the Lab, counts as the right board for the commands that build.
- **Stored data:** none new. A room is saved as the mode record it is, and the space keeps the Lab's "before" beside `focus:`'s.
- **Tests:**
  - the layout rule: kept, moved, out, the conversation refused, a slot that holds one, features carried;
  - the room by slot;
  - every command's Enter line and act, and their refusals;
  - opening, moving and leaving the Lab, through a reload.

  1,270 tests.
- **Tried in the browser,** on the trial copy:
  - `lab:` with room 223 open put Pocket chat on the Canvas, its choices marked (One column and a sheet, Parliament, phone);
  - Deep calm, clicked, painted it at once;
  - a click on Three panels wrote the command, whose line named the two moves, and Enter made them;
  - `undo:` put the layout back; a reload kept the Lab; `done:` brought the space back;
  - `new:room` made an unnamed room in the Lab, and `undo:` took it out.

  The test room's theme was put back to Parliament.
- **Next:** piece 2, the Blocks board.

**C240. Stage 13, piece 2: the Blocks board, its open points** (proposed 27 October; C238 piece 2; Lab v7; A2, C38, C63). Built as suggested, so a ruling changes one entry.
- **(a) The settings shown: 15, the ones something reads in the new screens.**
  - Branches: parent link, new-branch mode, compress button, threshold.
  - Chart: kind.
  - Context: threshold, display.
  - Notes: order.
  - Steps: which runs, which plan, the pinned plan.
  - Table of contents: what it lists, how many, where it cuts.

  Not shown:
  - the input block's three settings, since the bar is the composer there (C37);
  - voice's language, which comes with piece 6;
  - Frameworks (the old Collaboration block), retired by R22.

  Ten declared settings are read by nothing:
  - Context's auto-compress;
  - the file shelf's types;
  - Keywords' colour and add form;
  - Messages' timestamps and density;
  - Notes' add button;
  - the dashboard's sample rows;
  - the table's page size;
  - voice's button label.

  They are not shown, and their declarations are proposed for removal at the checkpoint (R41), the values rooms hold staying. **Suggestion:** yes.
- **(b) The words `set:` takes** (commands stay English): `set:<block> <setting> <choice>`.
  - **Blocks** by their name in your words or a short word: `keywords`, `chart`, `context`, `notes`, `steps`, `contents`, `branches` and the rest.
  - **Settings and their choices:**
    - `branches parent on|off`
    - `branches mode full|summary`
    - `branches compress on|off`
    - `branches threshold 75`
    - `chart kind bar|line|area|scatter|pie`
    - `context threshold 75`
    - `context display meter|compact|ambient`
    - `notes order newest|oldest|message`
    - `steps show run|all`
    - `steps follow chat|plan`
    - `steps plan 201`
    - `contents lists prompts|headings`
    - `contents most 50`
    - `contents cut 60`
  - **Limits:** a threshold from 10 to 100; numbers whole and within sensible bounds.

  **Suggestion:** yes.
- **(c) The words `place:` takes for where:**
  - `left`, `right`, `extra` (the lower right rail), `middle`, `bottom`, `panel`, `margin`, `sheet`, `outline`, `canvas`, `document`, `inspector`, each meaning the matching slot of the room's layout;
  - `up` and `down`, to move a block within its slot.

  A block placed where it is not built for is allowed, the line saying it may be cramped (v7). A full slot is refused ("the conversation holds one; rm: something first"). **Suggestion:** yes.
- **(d) The click rule** (A2, C38, as in piece 1): a setting's choice, clicked on the Blocks board, runs at once and is echoed. Anything that moves or removes a block (Sits in, move up and down, rm) writes its command and waits for Enter, as `add:` does.
- **(e) One of each block** (C63); messages and input stay. Web search, voice and files are features, not blocks, and are not offered here until piece 6.
- **(f) Pointing both ways:** a block clicked on the Canvas opens its row on the Blocks board, and the row marks its block on the Canvas.
- **(g) Stored data:** none new. A block's settings are its `config` in the room's record, as today; each command is one step for `undo:`.
- **Suggestion:** build as above.

**C241. Stage 13, piece 2, as built: the Blocks board** (27 October; C240 as suggested).
- **The Blocks board,** beside the Canvas in the Lab:
  - Every block in the room on the Canvas, grouped by where it sits ("the sheet · 2"; a slot that holds one, "1 of 1"), each with a chevron that opens its row.
  - An open row shows Sits in (each slot of the layout, "(not built for it)" where it does not fit), the block's settings as segmented choices, and move up, move down and rm. Messages and input say "every room has one" in place of rm.
  - A closed row carries a short state ("the whole history", "your prompts").
  - Under the slots, "Not in the room": the blocks that fit somewhere in this layout, each writing `>add:`.
- **The click rule** (C240 (d)): a setting's choice runs at once and is echoed under the field ("Ran set:branches parent off. undo: takes it back"). Sits in, move up and down, rm and add write their command and wait for Enter. A number setting offers its presets and "other", which writes `>set:contents most ` to type the rest.
- **The echo with the field at rest:** a click's echo used to show only while the bar was in command mode; with the field empty in search it showed the resting hint instead. It now shows the echo in both (`EnterLine`, `told`). This also fixes piece 1's theme and device clicks, and the Settings board's.
- **Pointing both ways** (C240 (f)): a block clicked on the Canvas opens and marks its row on the Blocks board and scrolls it into view; a row opened there marks the block on the Canvas. The pick is the screen's only, not stored, and clears when another room comes onto the Canvas.
- **The commands,** with the Canvas or the Blocks board addressed in the Lab (`src/lib/labBlocks.js`, pure):
  - `add:keywords`, `add:keywords, contents`: each into its first free place by its fits, first choice first; one of each (C63); a block with no free place is refused.
  - `rm:context`: out of the room ("The Library keeps it"); messages and input stay.
  - `place:notes right` and the other words of C240 (c); `place:context up` and `down` within its slot. A place it is not built for is allowed with "may be cramped"; a full slot that holds one is refused ("Only one block fits in the conversation, and it has one. Move that first"); a word with no slot in this layout lists the words that have one. `place:` takes one block at a time.
  - `set:notes order oldest` and the rest of C240 (b). A number out of bounds, an unknown setting or choice, and a value already set are each said. `set:steps plan 201` also pins the step list to that plan, as the block reads it (C202).
  - Blocks are named by their short word (keywords, chart, table, contents, files, dashboard, inspector, document, comments, ripple, frameworks), their name in your words, or its start.
  - Outside the Lab, `add:` and `rm:` stay the Collection's; `place:` in a room says it moves a block in the Lab.
  - Each is saved at once and is one step for `undo:`, as piece 1's.
- **The settings:** fourteen, not fifteen as C240 (a) counted; the list there is complete and is what was built. Their labels and choices are in the copy table (`blocksBoard`), the command words stay English.
- **The verb list:** `place:` takes the new where-words and up and down; `set:`'s example and forms now show a block's setting (`set:notes order oldest`, `set:contents most 50`). Its old example, `set:input web search on`, comes back with piece 6.
- **Stored data:** none new. A block's settings are its `config` in the room's record.
- **Tests:** naming a block and a place; add, rm, place and set, each with its refusals, through the bar's preview, on fixture layouts (the catalogue cannot load in tests). 1,284 tests; 30 lint warnings, all older.
- **Tried in the browser,** on the trial copy, with Pocket chat on the Canvas:
  - the board drew its three slots and the blocks not in the room;
  - "off" on Branches' link to its parent applied, was echoed, and `undo:` took it back, as it did a theme;
  - `place:branches up` swapped Branches and Keywords on both boards;
  - `add:contents` put the table of contents in the sheet, and `set:contents most 30` showed 30 among its presets;
  - `rm:messages` was refused;
  - Keywords clicked on the Canvas opened and marked its row; a row opened marked its block.

  Each change was undone; Pocket chat is as it was.
- **Next:** piece 3, the Library in full.

**C242. Stage 13, piece 3: the Library in full, its open points** (proposed 27 October; C238 piece 3; Lab v7 and its v6 notes; A2, C38, C53, C63, C131). Built as suggested, so a ruling changes one entry.
- **What the Library is today:** a read-only list by shelf (your rooms, templates, boards, layouts, blocks, themes, resources), with the shelves along the top and one action, a board's "open". Nothing on it can be chosen, and the bar's search does not narrow it.
- **(a) Ticking.** In the Lab, with a room on the Canvas, blocks, layouts and themes get a tick box. Rooms, boards and resources do not, since they do not go into a room.
  - Something already in the room shows its box greyed, "in this room".
  - A line under the shelves says what is ticked, with "add to room" and "clear" ("2 ticked: Keywords, Deep calm"). With nothing ticked it says how: "tick blocks, a layout or a theme, then add them to the room together".
  - Ticks survive a change of shelf or search, as in Records. A tick drops once its item is in the room, and all of them when another room comes onto the Canvas.
  - Out of the Lab there is no room to add to, so no boxes.
  - Ticks are the screen's only, never stored.

  **Suggestion:** yes.
- **(b) "add to room"** writes `>add:keywords, "Three panels", "Deep calm"` and waits for Enter, since it moves blocks (A2). So `add:` takes a layout and a theme as well as blocks:
  - In one Enter, the layout first (piece 1's layout rule, the moves said), then the theme, then each block to its first free place in the new layout.
  - Refused: two layouts or two themes ("A room has one layout. Untick one"); a room, board or resource ("Only blocks, a layout and a theme go into a room").
  - In the Lab, with the Library addressed, `add:` goes to the room, as with the Canvas or Blocks board. With the Collection called in and addressed, `add:` stays the Collection's.

  **Suggestion:** yes.
- **(c) Details open in place.** A click on an item opens its details under it, one at a time; a second click or "close" shuts them. The tick box only ticks.
  - For a block: where it fits, the settings it has (from piece 2), and the rooms that use it.
  - For a layout: its places, by name.
  - For a theme: the rooms painted in it.
  - For a room: its layout, theme, what it is built for, and its blocks.

  v7 opens a popped-out Library's details in a side column. **Suggestion:** in place there too for now, the side column at the polish stage.
- **(d) A room's one action:**
  - your room: "edit here", which writes `>edit:"Pocket chat"`, or "on the Canvas" when it is there;
  - a template: "duplicate", which writes `>duplicate:"Writing studio"`, since a template is not edited itself;
  - a board keeps "open";
  - anything coming soon has none.

  **Suggestion:** yes.
- **(e) `duplicate:"Writing studio"`** copies a room, yours or a template, and opens the copy in the Lab. It waits for Enter.
  - The copy is named "Writing studio 2", or the next number free.
  - It takes the layout, theme, what it is built for, and every block with its settings; never its chats.
  - `undo:` takes the copy away while it is still as made, and puts the screen back, as after `new:room`.
  - It works out of the Lab too, and opens it.
  - `duplicate:` of a collection or a plan, in the command list since stage 6, stays "not built yet".

  **Suggestion:** yes.
- **(f) Search.** With the Library addressed, the bar's search narrows it to what matches in a name, a description or a feature, the Enter line counting ("4 items match"), as Settings does. **Suggestion:** yes.
- **(g) Stored data:** none new. A duplicate is a room record like any other; ticks and open details are not kept.
- **Suggestion:** build as above.

**C243. Stage 13, piece 3, as built: the Library in full** (27 October; C242 as suggested).
- **Ticking** (C242 (a)):
  - In the Lab with a room on the Canvas, blocks, layouts and themes carry a tick box; what the room has shows greyed, "in this room".
  - The line under the shelves: "2 ticked: Keywords, Deep calm · add to room · clear", or at rest "tick blocks, a layout or a theme, then add them to the room together".
  - Ticks survive a shelf or a search, drop once their item is in the room, and clear when another room comes onto the Canvas. They are never stored.
- **"add to room"** (C242 (b)) writes `>add:keywords, "Deep calm"` and waits for Enter.
  - `add:` takes a layout and a theme as well as blocks: the layout first, by piece 1's rule, its moves said; then the theme; then each block to its first free place. The line: "Enter changes Quiet room · It is painted in Deep calm · Keywords goes in the left rail".
  - It refuses two layouts or two themes ("A room has one theme. Untick one of Deep calm or Parliament"), a room's name ("… is a room. Only blocks, a layout and a theme go into a room; edit: opens a room"), and a list that is all in the room already.
  - With the Library addressed in the Lab, `add:`, `rm:`, `place:` and `set:` act on the room, as with the Canvas or Blocks board. `name:` there still names what it named before; only the Canvas and Blocks board name the room.
- **Details in place** (C242 (c)): a click on a name opens its details under it, one at a time, with "close".
  - Block: where it fits, its settings, the rooms that use it.
  - Layout: its places, the rooms that use it.
  - Theme: the rooms painted in it.
  - Room: its layout, theme, what it is built for, its blocks.

  A popped-out Library opens them in place too; the side column waits for the polish stage.
- **A room's one action** (C242 (d)):
  - your room: "edit here" (`>edit:"Pocket chat"`), or "on the Canvas";
  - a template: "duplicate" (`>duplicate:"Writing studio" template`);
  - a board: "open";
  - coming soon: none.
- **`duplicate:`** (C242 (e)):
  - `duplicate:"Writing studio"` copies your room by that name, else the template.
  - `duplicate:"Writing studio" template` takes the template whatever you have: a template and a room made from it share a name, so the Library's "duplicate" writes this form. This form was added in building and was not in C242.
  - `duplicate:` alone copies the room on the Canvas, or out of the Lab the room on screen.
  - The copy, named with the next number free ("Data workspace 2"), takes the layout, theme, device and every block with its settings and fresh ids, never chats. It opens in the Lab.
  - `undo:` takes it away while it is as made, and puts the screen back.
  - A template coming soon is refused. `duplicate:` moved from the collection group to building in the command list; a collection's or a plan's copy is not offered.
- **Search** (C242 (f)): with the Library addressed, the bar's search narrows it by name, about and features, counting what shows on the shelf chosen ("3 items match"; "Nothing in the Library matches").
- **The catalogue** (`lib/catalogue.js`) now also gives:
  - a room's block keys and device;
  - a layout's slots;
  - a block's fits, first choice first.

  It reads nothing new.
- **Stored data:** none new. A duplicate is a room record like any other.
- **Tests:**
  - `add:` with a layout and a theme, and its refusals, with the Library addressed;
  - `duplicate:`: yours first, the template, the next number, coming soon, none named.

  1,289 tests; 30 lint warnings, all older.
- **Tried in the browser,** on the trial copy, with Quiet room on the Canvas:
  - Keywords and Deep calm ticked; Three panels, Parliament, Messages and Input greyed;
  - "add to room" wrote the line, and Enter put Keywords in the left rail and painted the room; the ticks cleared; `undo:` took it back;
  - Notes' and Pocket chat's details opened in place, one at a time;
  - "chart" in the search showed three items, and none on the Themes shelf, the Enter line agreeing;
  - "duplicate" on Data workspace made "Data workspace 2" with its eight blocks, open in the Lab, and `undo:` took it away.

  The trial copy is as it was.
- **Next:** piece 4, trying a room and the guide.

**C244. Stage 13, piece 4: trying a room and the guide, its open points** (proposed 27 October; **ruled 27 October: (a) 1, the room itself; the rest as suggested**; C238 piece 4; Lab v7 and its v5 and v6 notes; A2, C38, C147). (a) is a choice; the rest is built as suggested unless ruled otherwise.
- **What exists today:**
  - A prompt with no room on screen starts a new chat in your default room (Settings), and the room opens as a board.
  - In the Lab, the Canvas draws the room by slot; it is a plan of the room, not the room itself.
  - Tags on chats exist: the model's, and your own, which a model's tagging keeps. `favorite` is a fixed one-word tag (C147).
- **(a) Where a tried room shows** (a choice). v7 draws the exchange as bubbles inside the Canvas's messages slot. Options:
  1. **The room itself opens in the Lab beside the Canvas,** as a room board: its real theme and blocks, live, the reply streaming as in any room. Changes made on the Canvas show in it at once.
  2. **The exchange shows in the Canvas's messages slot,** as v7 draws it: your prompt and the reply as text, the rest of the Canvas unchanged.

  **Suggestion:** 1. The Canvas is a plan of slots, so trying the room there would show a sketch, not the room. The room board already draws rooms, so nothing is built twice.
- **(b) What `p>` does in the Lab:**
  - With the Canvas, Blocks board or Library addressed and a room on the Canvas, a prompt starts a new chat in that room, not in your default room.
  - The Enter line says so, with who answers and the cost as for any prompt ("→ a new chat in Quiet room, tagged tried").
  - After it, the room's board is addressed, and later prompts carry on in that chat as in any room.
  - With no room on the Canvas, a prompt goes as it does elsewhere.

  **Suggestion:** yes.
- **(c) The tag:** `tried`, one fixed word like `favorite`, kept as one of your own tags so a model's tagging keeps it. `tag:tried` in Records finds every tried chat. A tried chat is an ordinary chat, numbered, in Records. v7's "tried in the Lab" would need quotes to filter by. **Suggestion:** `tried`.
- **(d) The guide's questions:** five now, each answer writing its command into the field, Enter running it.
  - What is this room for? (the layout: writing long pieces, talking things through, tables and data, quick questions);
  - Where will you use it? (at a desk, on a phone);
  - What should be in reach? (keywords and notes, branches, context health, the step list);
  - How should it feel? (four themes);
  - What is it called? (three names, or your own).

  v7's sixth, "Should it search the web?", joins with piece 6, where web search becomes a feature of input. **Suggestion:** yes.
- **(e) How the guide moves:**
  - It moves on when that kind of command runs on the room, clicked or typed.
  - An answer that is true already reads "as it is", and a click on it moves on with no command.
  - "skip this one" and "put the guide away"; at the end, "The room is built", with `undo:` to take any step back.
  - It shows on the Canvas, above the room.

  **Suggestion:** yes.
- **(f) When the guide comes:**
  - `new:room guided` makes a room and opens the guide.
  - The empty Lab offers it: "edit:"Writing studio" puts one here, new:room makes one, or new:room guided walks you through it".
  - C238 also says "the first visit". Showing it on the first visit would need a new stored flag. The empty Lab is what a first visit sees, so it is offered there instead.

  **Suggestion:** no stored flag.
- **(g) What is kept:**
  - The guide is the screen's: a reload or `done:` puts it away.
  - A tried chat is a chat record like any other, its tag in the fields chats already have.
  - Nothing new is stored.

  **Suggestion:** yes.

**C245. Stage 13, piece 4, as built: trying a room and the guide** (27 October; C244 as ruled).
- **Trying the room** (C244 (a) 1, (b)):
  - In the Lab with no room open, a prompt starts a new chat in the room on the Canvas, not in your default room. The Enter line says "→ a new chat in Essay room, tagged tried", then who answers and the cost, as for any prompt.
  - The room then opens in the Lab as a fourth board, beside the Blocks board, live in its own theme with its real blocks, and is addressed. Later prompts carry on in that chat, as in any room.
  - To try afresh, close the room; the next prompt starts another tried chat.
  - Four boards fit side by side at desktop width.
- **The tag** (C244 (c)): `tried`, kept in the chat's tags and as one of your own tags (`tagsMine`), as `favorite` is; `tag:tried` in Records finds them.
- **A fix found in building:** `undo:` after `new:room` or `duplicate:` took the room away if it was still as made. A chat tried in it since would have lost its room. It now keeps any room a chat lives in.
- **A second fix, found in trying it:** the tried room took the room board the space had before the Lab ("room"), since the Lab did not count it as taken. So `done:` brought the space back with the tried chat (225) where chat 216 had been. In the Lab, the rooms of the space before it now count as taken, and a tried room gets a board of its own ("room-2"). On the trial copy the screen still shows 225 in 216's place, from before the fix; `open:216` brings 216 back.
- **The guide** (C244 (d), (e), (f)), on the Canvas above the room:
  - "1 of 5" and a track of five dots, the question, what it does, and the answers, each showing the command it writes. An answer the room has already reads "as it is", and a click on it moves on.
  - The five questions are layout, built for, blocks, theme and name. The name question offers three names and "Your own", which writes `>name:"` to finish.
  - It moves on when its question's command runs on its room, clicked or typed. It has "skip this one" and "put the guide away", and ends with "The room is built." and how `undo:` takes a step back.
  - `new:room guided` opens it. The empty Lab's words offer it.
  - It is the screen's only: `done:`, another room on the Canvas, or a reload puts it away. `undo:` takes a step's change back but does not move the guide back.
  - The web search question waits for piece 6.
- **Stored data:** none new. A tried chat is a chat record, its tag in the fields chats have.
- **Tests:**
  - the guide's five questions;
  - what each answer writes, and "as it is";
  - how it moves, and only for its room;
  - `new:room guided`;
  - a tried room on a board of its own, `done:` bringing back the room that was there.

  1,294 tests; 30 lint warnings, all older. Trying calls the model or source, so it was tried in the browser, not in a test.
- **Tried in the browser,** on the trial copy:
  - `new:room guided` made a room and opened the guide. "Talking things through" read "as it is" and moved on.
  - "On a phone" wrote `device:mobile`, and Enter ran it and moved the guide on. "Keywords and notes" wrote `add:keywords, notes` and did the same.
  - The theme was skipped. "Essay room" named it, and the guide said the room is built.
  - `p>Who built the first lighthouse?` said "→ a new chat in Essay room, tagged tried". Wikipedia answered (the trial copy has no key), and chat 225 opened beside the Canvas in Essay room, carrying the tag `tried` in its record.

  Essay room and chat 225 are left on the trial copy; removing them is a deletion, so it waits for Stefan.
- **Next:** piece 5, built for a phone and local-only rooms.

**C246. Stage 13, piece 5: built for a phone and local-only rooms, its open points** (proposed 27 October; C238 (g), (i) ruled 1, (l); security-privacy-decisions §4.3; C126, C169). Built as suggested, so a ruling changes one entry. (c) is a change to stored data, shown here before it is written.
- **What exists today:**
  - `device:mobile` is stored (piece 1), and the Canvas draws a phone room as one column, but a room on screen ignores it.
  - A room on screen draws its layout's narrow form when its own board is narrow: the conversation, with the side panels behind buttons at its top (C126).
  - Ollama is the one model on this computer (stage 7). The privacy filter's names check already runs only there (C169).
- **(a) Built for a phone:**
  - A room built for a phone draws its narrow form wherever it shows, at any width, in a column no wider than a phone's (about 480 pixels), centred.
  - A room built for a computer stays as it is: narrow only when its board is.

  **Suggestion:** yes.
- **(b) The setting:**
  - `local:on` and `local:off`, on the room in the Lab, or out of the Lab on the room on screen, as `device:` is.
  - The Canvas's room line gains "Sends to: anyone · this computer only", which applies on click and is echoed, `undo:` taking it back (A2).
  - It is a new verb, `local:`, in the building group.

  **Suggestion:** yes.
- **(c) The stored field** (a change to stored data, shown first). One optional field on a room record (the `modes` store):

  ```
  { ...room as today, localOnly: true }
  ```

  - It is present only when on: `local:off` takes it away, so a room never set keeps the record it has.
  - Templates carry none.
  - There is no migration and no version change.
  - Backups keep rooms whole, so it travels in them. Restore's check of a room accepts it only as true or false. Every backup written before has none, so its rooms read as "anyone", and all stay readable.

  **Suggestion:** approve.
- **(d) What it holds back.** A local-only room's chats go only to a model on this computer:
  - **Prompts** (typed, a resend, a continue): to a hosted model or a source, the Enter line refuses them ("Essay room sends only to models on this computer: by: one, or local:off").
  - **The safety net:** the chat store checks again at the moment of sending, wherever the send began, a plan's run included. So nothing reaches a hosted model even by a path the Enter line does not see.
  - **Title and tags:** already go to whoever answered, so they stay on this computer.
  - **The helper's work:** Ripple, sweeps, Reflection and its talk, summaries and summary branches, translating replies.
    - It goes only when the helper is a model on this computer; otherwise the command is refused on the Enter line.
    - Ripple's checks with a prompt are skipped, the line saying so.
    - A simplification: while a local-only room is on screen, these commands are refused whichever chat they name.
  - **Answers from sources** already held with `include:` go to the local model as data, as today. Nothing is sent to the source.

  **Suggestion:** yes.
- **(e) Where it shows:**
  - the Canvas's room line;
  - the Library's room details ("Sends to: this computer only");
  - the Enter line of any prompt in it, which names the model on this computer as for any prompt.

  **Suggestion:** yes.
- **(f) What can be tried:** the trial copy has no Ollama, so the refusals can be tried in the browser, and a local answer only in tests. **Suggestion:** say so in the as-built entry.

**C247. Stage 13, piece 5, as built: built for a phone and local-only rooms** (27 October; C246 as suggested; the field approved in C238 (i), (l)).
- **Built for a phone** (C246 (a)): a room built for a phone draws its layout's narrow form wherever it shows, the side panels behind the button at its top, in a column no wider than 480 pixels, centred. A room built for a computer stays as it was. The room board reads the stored device for the first time.
- **`local:on` and `local:off`** (C246 (b)):
  - A new verb in the building group, on the room in the Lab, or out of the Lab on the room on screen.
  - The Canvas's room line has "Sends to: anyone · this computer only", which applies on click and is echoed ("Ran local:off. undo: takes it back").
  - The Library's room details say "Sends to".
- **The stored field** (C246 (c)):
  - `localOnly: true` on the room record while on; `local:off` takes the field away, so a room never set keeps its record.
  - Restore's check of a room accepts it only as true or false. Rooms in backups written before have none, and read as "anyone".
  - The catalogue reads it for the Library.
- **What it holds back** (C246 (d)):
  - **A prompt** to a hosted model or a source is refused on the Enter line: "Essay room sends only to models on this computer, and Wikipedia is not one. by: a model on this computer, or local:off". A prompt to several needs every one on this computer.
  - **The safety net:** the chat store checks again at the moment of sending, for a prompt, a resend, a continue and a source's search, wherever it began (a plan's run included). It reads the chat's room, and stops anything bound off this computer, saying "Nothing was sent: this room sends only to models on this computer".
  - **The helper's commands** (`summarize:`, `sweep:`, `reflect:`, `ripple:` on, `translate:`, a summary branch) and the talk on the Reflection board are refused while such a room is on screen, unless the helper is a model on this computer ("… and there is no helper on it. helper: a model on this computer first"). `ripple:off` is not refused.
  - **Ripple's checks** with a prompt are skipped, the line saying "Ripple does not check from here: its helper is not on this computer".
  - **Title and tags** go to whoever answered, as before.
- **Not covered:** the room the Enter line knows is the room tried in the Lab, or the room on screen. A prompt into another room's chat by a path the Enter line does not see is stopped by the safety net, not refused beforehand.
- **Stored data:** the one field above. Nothing else changes; no migration, no version change.
- **Tests:**
  - `local:on` and `local:off`, the field set and taken away;
  - a backup's room with none, true, or a wrong value;
  - a prompt refused to a hosted model and to a source, and let through to a model on this computer;
  - the helper's commands refused, `ripple:off` not, and a helper on this computer let through.

  1,298 tests; 30 lint warnings, all older. The safety net in the chat store is not covered by a test (the store cannot load in tests); it was read through, and the Enter line's refusal was tried in the browser. The trial copy has no Ollama, so a local answer was not tried.
- **Tried in the browser,** on the trial copy:
  - Essay room and Pocket chat, both built for a phone, drew their narrow form. One widened to 900 pixels kept its room at 480, centred.
  - `local:on` on Essay room, from its room on screen, stored `localOnly: true` on it alone.
  - A prompt there was refused, Wikipedia named; `sweep:` was refused, there being no helper.
  - In the Lab, the Canvas showed "Sends to: this computer only". A click on "anyone" ran `local:off`, echoed it, and the field was gone from the record. The Library's details said "Sends to: anyone".
- **Next:** piece 6, features of input.

**C248. Stage 13, piece 6: features of input, its open points** (proposed 27 October; C238 (h) ruled 1; R24, R25; C37, C66, A12, C70, C167 (g); the globe means language, 15 October). Built as suggested, so a ruling changes one entry.
- **What exists today:**
  - Web search, voice input and file attach are three blocks. Each draws into today's composer (`InputArea.jsx`), on today's chat page only.
  - Web search arms Anthropic's search tool for the next message (up to 3 searches) and drops it after. Citations are kept (C167 (g)).
  - Voice transcribes on this device only, or stays off with a note (C70).
  - Files: up to 10 a message, 10 MB each, text up to 200 KB.
    - Text and code go inside the prompt and are kept with it.
    - Images and PDFs go to Anthropic's models only and are not kept, only their names. Mistral and Ollama are given the words alone, and nothing says so.
  - The bar, the composer in the new screens (C37), has none of the three.
- **(a) Features of the room's input block.** Web search, voice and files are each on or off for a room, as the input block's settings:
  - **Commands:** `set:input web on`, `set:input voice off`, `set:input files on`.
  - **Where they show:** the Blocks board's Input row, and the guide's sixth question, "Should it search the web?".
  - **Stored as keys in the input block's `config`** (`webSearch`, `voice`, `files`), which every room has already. There is no new field on the room.
  - **Older rooms:** a room that has the old block for a feature reads as on for it, and one without as off, until `set:` writes the key. Writing Studio, Data Workspace, Drafting Desk and Pocket Chat have web search; Pocket Chat has all three; Quiet Room none.
  - **With no room yet** (the first prompt of a new chat), the bar offers all three.

  **Suggestion:** yes.
- **(b) Web search in the bar:**
  - In prompt mode, the field's marginalia shows "web search" as a word, since the globe means language. A click, or `web:`, holds it for the next prompt only (A12), in this tab; `web:off` drops it.
  - It is offered only where the one answering can search: today Anthropic's models. Otherwise `web:` says who cannot.
  - The Enter line says "It may search the web: up to 3 searches, about $0.01 each, on top of the tokens".
  - In a prompt to several, it goes with each that can search, and the line names those that cannot.
  - After the prompt goes, it is dropped. The citations show under the reply, as built.

  **Suggestion:** yes.
- **(c) Voice in the bar** (C70):
  - A microphone in the marginalia, only where the browser can transcribe on this device. The words go into the field, and nothing is sent until Enter.
  - Where a one-time language pack is needed, the microphone's note says so before it downloads.
  - Where the browser cannot transcribe on the device, the room's voice shows as "voice: off in this browser", with the note about what the alternative would send.
  - No command: voice needs the microphone, and the button is reachable by keyboard.

  **Suggestion:** yes.
- **(d) Files in the bar:**
  - "attach" in the marginalia, or `attach:`, opens the file picker, as `restore:` does. The files are held for the next prompt only, listed under the field, each with its size and a ×.
  - The limits are as today.
  - The Enter line names them and counts text files in the tokens.
  - Text and code go to any model, inside the prompt, kept with it as today.
  - Images and PDFs go only to a model that reads them (today Anthropic's). Otherwise they stay out, and the line says so: "report.pdf stays out: Mistral is not given PDFs here". This replaces today's silent dropping.
  - A source is sent the words alone. The privacy filter reads text files, not images or PDFs, and the line says so when it is on.

  **Suggestion:** yes.
- **(e) R24 and R25.**
  - The three old blocks stay in the catalogue and in rooms, read as features (a). Nothing is deleted now.
  - At the checkpoint (piece 7), R24 (their nine files) and R25 (today's composer, whose condition is that the bar carries these three) are put to you, item by item, with whether today's chat page has been replaced.

  **Suggestion:** yes.
- **(f) Stored data:** none new.
  - The features are keys in the input block's `config`.
  - Files are kept as today: text in the prompt, an image's or PDF's name in `attachmentMeta`.
  - What is held for the next prompt is this tab's only.

**C249. Stage 13, piece 6, as built: features of input** (27 October; C248 as suggested).
- **What a room offers** (C248 (a)):
  - The input block has three settings: Web search, Voice and Files. They show on the Blocks board's Input row, with `set:input web on` and the like, in place of piece 2's note.
  - Each is a key in the input block's `config` (`webSearch`, `voice`, `files`).
  - Unset, a feature is on where the room has the old block, so Pocket chat offers all three, Quiet room none.
  - The Canvas names the features that are on beside Input.
  - With no room yet, the bar offers all three.
- **In the prompt field's marginalia,** before the frameworks and who answers: "web search", "voice" (or "voice off" where the browser cannot transcribe on the device, its note saying what the alternative would send), and "attach". Each shows only where the room offers it. A held one is in ink, underlined.
  - **"voice off":** C248 said "voice: off in this browser"; the shorter words fit the field, and the note keeps the rest.
- **Web search** (C248 (b)):
  - A click, or `web:`, holds it for the next prompt only, in this tab, for this room; `web:off` drops it.
  - It is offered only where the one answering can search: the provider has the search tool, today Anthropic.
  - Refusals: "Wikipedia cannot search the web here. by: a model that can"; "Web search is off in Essay room. set:input web on turns it on".
  - The prompt's line says "It may search the web: up to 3 searches, about $0.01 each, on top of the tokens". In a prompt to several, it names those that cannot.
  - The tool goes with the send to each one that can search, and the held search is dropped once the prompt goes.
- **Voice** (C248 (c), C70): the on-device recognition already built (`useVoiceInput`). A click starts listening ("listening"); each finished phrase is added to the field; nothing is sent until Enter.
- **Files** (C248 (d)):
  - A click on "attach", or `attach:`, opens the picker for several files. Each is checked and read as today's composer does.
  - They are held for the next prompt, listed under the field ("With your next prompt: notes.md 12 B ×"), up to 10.
  - The prompt's line names what goes, and counts text files in the tokens. It says what stays out ("report.pdf stays out: Mistral is not given images or PDFs here"), that a source is sent the words alone, and that the privacy filter does not read images or PDFs.
  - Packing (`lib/inputFeatures.js`): text and code inside the words, marked as data, kept with the message; images and PDFs a part of this send only, to Anthropic's models; their names in `attachmentMeta`. Each answerer of a prompt to several gets what it can take.
- **The guide's sixth question,** "Should it search the web?" ("Yes, when I ask" writes `set:input web on`; "No" reads "as it is" in a room without it).
- **The copy pipeline:** I had been running `lingui extract` alone, which keeps an English entry's old wording when it changes. `npm run i18n` (extract with overwrite) is the project's way, and is used from here. It changed no English already committed.
- **Not done:** the three old blocks and today's composer stay, for R24 and R25 at the checkpoint (C248 (e)). An empty prompt with only files held is not sent: the prompt still needs words.
- **Stored data:** none new. On the trial copy, Essay room's input now carries `files: false`, written by turning Files on and off again in the browser; it reads as before.
- **Tests:**
  - what a room offers, from its settings or its old blocks;
  - the guide's question;
  - files packed for one who reads them, for one who does not, and for a source;
  - `web:` and `attach:` with their refusals;
  - the verb list.

  1,304 tests; 30 lint warnings, all older.
- **Tried in the browser,** on the trial copy, where Wikipedia answers and the browser cannot transcribe on the device:
  - Pocket chat's field showed "voice off" and "attach", and no web search, since Wikipedia cannot search; `web:` said so.
  - In the Lab, Essay room's Input row showed the three features off. "on" for Files ran `set:input files on`, echoed, and the Canvas named "file attach". In the Lab the field then offered only "attach", and `web:` said web search is off in Essay room. Files was turned off again.

  Not tried in the browser: a web search, voice and choosing files, which need a key, a browser that transcribes on the device and a native file dialog. They are covered by the tests above and by the code they reuse. The trial copy's bar was moved to the top (`bar:top`) to read the field.
- **Next:** piece 7, the checkpoint.

**C250. The stage 13 checkpoint** (proposed 27 October; **ruled 27 October, as suggested: (b) R14, R16 to R21 and R33 approved, panel buttons stay as stored; (c) R34 approved; (d) R36 approved; (e) R24 approved on R25's condition; (f) option 1, R42 as piece 8; (g) R41 approved; (h) the test data kept. (b), (c), (d) and (g) carried out now**; refactor-plan.md, stage 13 and §6; C238 to C249). Pieces 1 to 6 are built and committed.
- **(a) What to try,** on the trial copy:
  - **Building:** `lab:`, then `edit:"Pocket chat"`.
    - On the Canvas, change the layout (it writes the command; Enter moves the blocks), the theme, Built for, and Sends to.
    - On the Blocks board, open a row: settings apply on click; move up and down, Sits in and rm write commands.
    - In the Library, tick a block and a theme and press "add to room"; click a name for its details.
    - `undo:` takes back each step, and `done:` returns to what you had.
  - **A new room:** `new:room guided` and its six questions; `duplicate:"Writing studio" template`.
  - **Trying it:** in the Lab with no room open, `p>` a question. The room opens beside the Canvas, the chat tagged `tried`.
  - **Phone and local:**
    - A room built for a phone keeps a phone's width at any size.
    - `local:on` in a room, then a prompt to Wikipedia, is refused before Enter.
  - **With a key** (nothing in piece 6 has been tried with a model):
    - in a room with web search on, an Anthropic model answering: "web search" in the field, then a question that needs the web, and the citations under the reply;
    - "attach" a PDF and a text file, to Anthropic's model and then to Mistral's, reading the Enter line each time;
    - voice, in desktop Chrome, where speech can stay on the device.
- **(b) The old editor and the build wizard: R14, R16 to R21, R33.** The old way of building a room, at `/edit` and `/build`, about 5,600 lines. It is reached today only from the wrench on today's chat page and from the wizard itself.

  | Line | What it is | What does it now |
  | --- | --- | --- |
  | R14 | The build wizard, `/build` (purpose, device, layout, features, name, ignition) | `new:room guided`; the templates in the Library and `duplicate:` |
  | R16 | Dragging blocks in the editor | `place:`, move up and down |
  | R17 | The holding tray, where removed blocks wait | `rm:` (the Library keeps every block) and `undo:` |
  | R18 | The inspector, the editor's right rail | The room line and the Blocks board |
  | R19 | The editor's left rail and top-bar pills | The Library board and the bar |
  | R20 | The preview sheet | Trying the room with `p>` |
  | R21 | The dialogs for swapping a layout and applying another room | The Enter line saying what moves; `duplicate:` |
  | R33 | The Showcase, glow and connector lines in the editor | Nothing |

  **What the Lab does not do that the editor did:** set a room's panel buttons (which side panels get a button when the room is narrow). C238 (e) left these as stored, still drawn, not offered. Nothing else is missing.

  **How it would be carried out, as R40 was:**
  - `/edit`, `/edit/:id` and `/build` open the Lab on the new screens, with that room on the Canvas.
  - The files move to `src/deprecated/`.
  - Every room the editor or the wizard made stays as it is, and nothing stored changes.
  - `@dnd-kit`, the drag library, stays while R34 holds it.

  **Suggestion:** approve all eight; panel buttons stay as stored.
- **(c) R34: dragging sections in the stacked-sections layout.** That layout belonged to the old homepage, the Study, already retired (R3, R11). Only its drag-to-reorder goes; the layout's file stays, as the line says. With R16 and R34 both done, `@dnd-kit` can leave the dependencies (stage 15). **Suggestion:** approve.
- **(d) R36: the old slot tables.** A layout's places used to be written in three spots: the layout's own file (the one the Lab now reads), a fallback table used only by the old editor's layout swap, and empty placeholder lists in the code that seeds the Library's layout records. The fallback table goes with the editor, and the placeholders go from the code. The layout records already stored on your device stay untouched; the Library reads them only for descriptions and "coming soon". **Suggestion:** approve, carried out with (b).
- **(e) R24 and R25: the three old feature blocks and today's composer.**
  - R25 was approved on a condition with two parts:
    - the bar carries web search, voice and files: now true (piece 6);
    - today's chat page is replaced by the room on the new screens: not yet true.
  - Today's chat page still draws the old composer, and the composer still uses the three blocks. Retiring them now would take web search, voice and files away from that page.

  **Suggestion:** approve R24 on R25's condition, both carried out with (f).
- **(f) Today's chat page, proposed as R42** (a choice of when). `/chat/:id` is the old page for one chat.
  - **Who waits on it:** R22 (the collaboration window), R25 and R26 (the branch panel) were each approved "when today's chat page is replaced". R24 would join them. No stage of the plan says when that happens.
  - **A problem found in reading for this checkpoint:** the branches block, in a room on the new screens, opens a branch by going to today's chat page. That leaves the new screens. Not yet tried in the browser.
  - **R42:**
    - `/chat/:id` opens that chat in its room on the new screens;
    - the branches block opens branches there;
    - `ChatView` moves to `src/deprecated/`;
    - then R22, R24, R25 and R26 are carried out together.

    Nothing stored changes.
  - **Options:**
    1. **Now, as piece 8 of this stage,** proposed first like any piece.
    2. **In stage 14 or 15.**

  **Suggestion:** 1. It unblocks four approved retirements and fixes the branches block, and the bar now carries everything the old page's composer did.
- **(g) R41: the settings nothing reads** (C240 (a)). Ten settings are declared by blocks but read by no code:
  - Context's auto-compress;
  - the file shelf's types;
  - Keywords' colour and add form;
  - Messages' timestamps and density;
  - Notes' add button;
  - the dashboard's sample rows;
  - the table's page size;
  - voice's button label.

  Their declarations go from the blocks' files. Any value a room holds stays in its record, unread, as now. The input block's three composer settings (placeholder, voice transcripts, card layout) become unread with R25, and would join R41 then. **Suggestion:** approve.
- **(h) Test data on the trial copy:** Essay room (made by `new:room guided` in piece 4) and chat 225 (tried there, a Wikipedia answer about lighthouses). Options:
  1. **Keep them.**
  2. **Erase both,** with `erase:225` and the room after it.

  **Suggestion:** your call; nothing depends on them.
- **Not in this checkpoint:** R39 (Drafting Desk), deferred until after the refactor (C237).
- **Carried out, 27 October** ((b), (c), (d), (g) as ruled):
  - **(b) The old editor and the build wizard.**
    - 29 files moved to `src/deprecated/`, keeping their paths, each headed with its line and how to restore it, and listed in its README:
      - `EditorView.jsx` and `BuildView.jsx`;
      - the editor's nine components;
      - the wizard's gallery and its thirteen steps and parts;
      - four modules only they used: `editorReducer.js`, `editorHistory.js`, `buildWizard.js` and `layoutMigration.js`.
    - `/edit`, `/edit/:id` and `/build` now open the Lab on the new screens, with that room on the Canvas. So the wrench on today's chat page leads there.
    - Panel buttons stay as stored and still draw.
    - The editor's styles in `index.css` stay, for R12.
  - **(c) R34:** the drag to reorder is out of the stacked-sections layout and `SectionCard`; the sections draw in their stored order. Nothing live imports `@dnd-kit` now; it leaves the dependencies at stage 15.
  - **(d) R36:**
    - The fallback table went with `layoutMigration.js`.
    - The seven empty `slots: []` placeholders are out of the code that seeds the Library's layout records. No check of a record or a backup needs them.
    - Records already stored keep theirs, untouched.
  - **(g) R41:** the ten declarations are out of the blocks' `configSchema`.
    - Two blocks' schemas are now empty: Messages and Keywords.
    - Voice's button label was read only by the dev catalogue's preview, which shows its fallback, "Speak".
    - Values rooms hold stay in their records.
  - **Not touched:** `src/lib/refs.js`, `components/Button.jsx` and `components/Card.jsx` are now used by nothing outside `src/deprecated/`. They are not in these lines, so they stay for a later one.
  - **Checks:** `npm run check` passes: 1,304 tests, 30 lint warnings, all older.
  - **Tried in the browser:**
    - `/edit/<Essay room's id>?tab=components` opened the Lab with Essay room on the Canvas.
    - `/build` opened the empty Lab, which offers the guide.
    - After a fresh load, no request failed.
- **Next:** piece 8, today's chat page (R42), proposed first.

**C251. Stage 13, piece 8: today's chat page (R42), its open points** (proposed 27 October; C250 (f) ruled 1; R22, R23, R24, R25, R26, R41; C173 (f), C175, C178, C248). Built as suggested, so a ruling changes one entry.
- **What exists today** (a survey of the code, 27 October):
  - `/chat/:id` draws `ChatView`: one chat in its room, full page, with a wrench to the old editor. Nothing on the new screens links to it, with one exception, the Branches block.
  - **The Branches block,** inside a room on the new screens, leaves them for today's chat page in three ways:
    - a click on a branch in its list;
    - the branch panel's "Full history";
    - the panel's "Compressed summary".
  - **Two other pieces still run inside rooms on the new screens:**
    - the messages' "Branch from here" opens the branch panel (R26), except in a plan, where it already writes `new:branch`;
    - "Continue" on a cut-off reply sends collaboration mode's instructions (R22), not the chat's frameworks.
  - **Collaboration mode** keeps nothing stored: its choice was in memory only.
  - **The old feature blocks:** in rooms on the new screens, voice still draws a microphone that feeds nothing, and attaching files mounts a hidden file picker.
- **(a) `/chat/:id`** shows that chat in its room on the new screens, as `open:` does, so old bookmarks and links keep working. A chat that is not there says so in its room's board. `ChatView` moves to `src/deprecated/`. Its wrench led to the old editor; `edit:` and `lab:` do that now. **Suggestion:** yes.
- **(b) The Branches block on the new screens.** Each action writes its command into the bar for Enter, as the step list and the branch slider do (C173 (f)):
  - **A branch in its list:** a click writes `open:225`.
  - **The button, now "Carry on":** it writes what the block's "New branches carry" setting names. "The whole history" writes `new:branch 225`; "a summary" writes `open:225 summary` (C175).
  - **At the threshold** (the block's "Warns at"), the block says "Context 80% full", with the same command to click. It never acts by itself.
    - Today, with the app's auto-compress set to automatic, the panel opened by itself at the threshold.
    - That setting has not been offered anywhere since the old Settings page went (R37), and it is no longer read; any value stays where it is.
  - So the block's four settings keep their jobs: the parent link, the button, what it carries, and where it warns.

  **Suggestion:** yes.
- **(c) "Branch from here"** on a message writes `new:branch` with that chat's address or number and the step, in every room on the new screens: `new:branch 225 2`, as in a plan now (C178). The branch panel never opens. **Suggestion:** yes.
- **(d) "Continue"** on a cut-off reply sends under the chat's frameworks and reply language, as the bar's prompts do, in place of collaboration mode's text. **Suggestion:** yes.
- **(e) The retirements, carried out together, nothing deleted and nothing stored changed:**
  - **R22, R23:** the collaboration window, its block (three files) and its state move to `src/deprecated/`, their provider unmounted.
    - Rooms that hold the block keep it in their stored list, and a room skips a block it does not know.
    - `frameworks` stops meaning that block in `add:` and `set:`.
  - **R24:** the nine feature-block files move, and the catalogue stops listing them.
    - Rooms keep the old blocks in their lists, still read as "feature on" (C248 (a)).
    - The three small registries they used (armed tools, attachments, input actions) go from `hostAPI.js`. The room frame stops collecting input actions.
    - The voice transcript event, one of the original three, stays.
  - **R25:** the composer (`input-render.jsx`, its preview, `InputArea.jsx`) moves.
    - The input block stays: every room has one, the Lab places it, and its settings are the features. It draws nothing, since the bar is the composer.
    - Its three composer settings go, as R41 said.
  - **R26:** the branch panel, its state and its shortcut move, their provider and handler unmounted. Ctrl/Cmd+Shift+B then does only what it already does on the new screens: open the backup window.
  - **Tests** that name the old blocks as strings stay true: the names still mean "feature on".
- **(f) What today's chat page did that the new screens do not:** nothing is lost.
  - The room board finds a chat and repairs a missing room as the page did.
  - Its wrench is `edit:`.
  - Its page-wide colours are the room's own board.
- **(g) Stored data:** none changes.

**C252. Stage 13, piece 8, as built: today's chat page retired** (27 October; C251 as suggested; C250 (e), (f)).
- **(a) `/chat/:id`** now shows that chat in its room on the new screens, as `open:` does, and the room is addressed. `ChatView` moved to `src/deprecated/`.
- **(b) The Branches block:**
  - Rewritten as described in C251 (b).
  - It reads its chat through `useRoomChat`, so with several rooms open each shows its own.
  - It imports no database or provider any more: the panel's own summary call (one fixed model, each message cut to 500 characters) went with R26.
- **(c) "Branch from here"** writes `new:branch` in every room: with the chat's plan address in a plan (`new:branch 215a 0`), else its number.
- **(d) "Continue"** sends under the chat's frameworks and reply language. The shell gives them to the room board (`systemFor`), and the message actions read them from it.
- **(e) Carried out, 21 files moved to `src/deprecated/`,** keeping their paths, each headed and listed in its README:
  - **R42:** `ChatView.jsx`.
  - **R22, R23:** `CollabModal.jsx`, the three collaboration block files and `CollabModeContext.jsx`. Its provider is gone from `App.jsx`, and `frameworks` no longer names the block in `add:` and `set:`.
  - **R24:** the nine web search, voice and file attach files, no longer registered in the catalogue. `hostAPI.js` lost its input actions, armed tools and attachments, with their events; the voice transcript event stays. `RoomShell` no longer collects input actions.
  - **R25:** `input-render.jsx`, `input-preview.jsx` and `InputArea.jsx`. The input block stays, drawing nothing; its description says what it holds now, and its three composer settings are gone (R41).
  - **R26:** `BranchCreationPanel.jsx`, `BranchPanelContext.jsx` and `BranchShortcutHandler.jsx`, their provider and handler gone from `App.jsx`.
- **Stored data:** none changed. Rooms keep the collaboration block and the three old feature blocks in their lists; a room skips them, and the three still read as features on.
- **Checks:** `npm run check` passes: 1,304 tests, 30 lint warnings, all older. No live code imports any moved file.
- **Tried in the browser,** on the trial copy:
  - `/chat/<216's id>` opened 216 in a room of its own on the new screens.
  - In its sheet, the Branches block listed the parent and its branch. A click on Snowy owl wrote `>open:223`, and "Carry on in a branch" wrote `>new:branch 216`. Neither left the new screens; neither was run.
  - "Branch from here" on the first prompt wrote `>new:branch 215a 0`, and its line read "Enter starts 215c, an empty branch beside 215a". Not run.
  - No microphone, collaboration button or hidden file picker is left in the rooms, and nothing failed to load.

  Not tried: Continue on a cut-off reply, which needs a model.
- **Noticed, not changed:** the Parliament mark in a narrow room's header is labelled "Go to The Study", the retired homepage. It takes you to the new screens; only its words are old.
  - **Changed after (27 October):** it now reads "Go to Parliament's start", read aloud and on hover, from one new copy entry (`room.home`), in both places the mark is drawn (`NarrowChrome` and the single column with sheet layout). The copy table had no wording for going home, so this is new; a ruling changes one entry.
- **Stage 13:** all eight pieces are built. Still open from its lines: R39 (Drafting Desk), deferred until after the refactor; `@dnd-kit` leaving the dependencies, at stage 15.

**C253. Stage 14 in pieces: focus, calm, screens, small screens** (proposed 27 October; **ruled 27 October, as suggested: (b) 1, focus per room on the room record; (c) 1, calm off for someone new; (i) 1, narrow windows and the phone as proposed, built last; the rest as suggested**; refactor-plan.md, stage 14; the editing spec, "Focus", "Calm", "Legibility"; the arrangements spec §7a, §8; `parliament_screens_v1.html`; welcome spec §12.4; C98, C126, C135, C182). Waiting for Stefan: (b), (c) and (i) are choices; the rest is built as suggested unless ruled otherwise. Each piece is committed and checked before the next.
- **What exists today** (a survey of the code and documents, 27 October):
  - **Focus:** `focus:` clears the screen to the chat alone and `focus:off` brings back what was there (stage 5, C135). `focus:save` and `focus:room collection` answer "not built yet".
  - **Calm:** `calm:` is in the command list and not built.
  - **Legibility:** the editing spec's contrast and size rules are already the chrome's tokens: marginalia at 62% ink, 11.5px, rust #94491F.
  - **Windows and screens:**
    - `pop:library display 2` is read and stored, but a window opens on the screen it is popped from: nothing places it on another screen.
    - `arrange:` answers "not built yet".
    - The space and the Lab's "before" are kept per device in the `arrangements` store. Window layouts travel in a backup only when ticked (C182).
  - **Small screens:**
    - Under 900 pixels wide, the boards stack one under another, each at full width.
    - Rooms draw their narrow form by their own width (C126).
    - The welcome page says "built for a computer for now" on narrow and touch screens (W §12.4).
    - No mockup draws a phone.
- **The pieces:**
  1. **Focus sets.**
     - `focus:room collection` focuses on those boards, left to right, and keeps them as your set; `focus:save` keeps what is on screen; `focus:` alone uses your set (until you make one, the chat alone).
     - At the end of the board strip, "focus: off ▾": a click toggles, and the caret opens a picker with numbered ticks.
     - While focused, a click on a board in the strip says "focus:off to arrange freely". Anything that needs a board focus hides (finding a card, a sweep's review) turns focus off and says so.
  2. **Calm.**
     - `calm:` and `calm:off`, with "calm: off" in the strip, a click toggling.
     - What waits until you are near (hover, or keyboard focus inside), as the spec's table has it:
       - a reply's marginalia but its first;
       - the board heads' marginalia;
       - the inline markers, as small numbered dots;
       - replies shown as their result, with a mark in the margin;
       - Collection cards folded to their result;
       - the legend as "colours ▾";
       - the review keys.
     - Never calmed: the field, the Enter line, the review bar, the count line.
  3. **Saved arrangements.**
     - `arrange:save "Review desk"` keeps what is on screen, windows and their screens included; `arrange:"Review desk"` switches to it, one step for `undo:`.
     - `arrange:"Review desk" 207` switches with 207 in its room.
     - `name:`, `duplicate:` and `forget:` on a saved one, as for saved searches.
  4. **The screens map and other screens.**
     - Bare `arrange:` shows the map, as `parliament_screens_v1.html` draws it: each screen labelled, the boards and windows on it, the addressed board in navy, and saved arrangements to switch to. Everything on it writes an existing command. Escape closes it.
     - `pop:library display 2` places the window on that screen.
     - "Extra screen detected", once, under the field.
  5. **Small screens:** a narrow window and a phone, as (i) decides.
  6. **The checkpoint.**
- **Open points,** each with its suggestion:
  - **(a) The words `focus:` takes:** the boards' names as the strip shows them and C131 settled: `room`, `collection`, `reflection`, `records`, `library`, `plan`. So `focus:room collection`, not the spec's older `focus:sym col`. **Suggestion:** yes.
  - **(b) Whose focus set** (a choice). The editing spec says "Focus is per room", and lists focus per room among its open questions.
    1. **Per room:** each room keeps its own set, as an optional field on the room record, `focus: ["room", "collection"]` (a change to stored data, shown here). It travels with the room in backups. A room with none uses the chat alone.
    2. **One set for you,** kept on this device as a setting, whatever room is on screen.

    **Suggestion:** 1, as the spec says. A writing room and a data room want different boards beside them, and the set should go where the room goes.
  - **(c) Calm for someone new** (a choice; the plan's "needs from you").
    1. **Off:** everything shows, as today, and the strip's "calm: off" is there to find. The welcome page's steps rely on reading marginalia, which calm would hide until you are near it.
    2. **On:** a new screen starts quiet, and detail comes as you move to it.

    **Suggestion:** 1. Someone new learns Parliament from what the marginalia says. Calm is for when you know it.
  - **(d) Where calm is kept:** a setting on this device, like the arrangement, not in backups. **Suggestion:** yes.
  - **(e) "Near" on a touch screen,** where there is no hover: near is the item last tapped, and a tap elsewhere calms it again. **Suggestion:** yes.
  - **(f) Saved arrangements, stored:** records in the existing `arrangements` store, `{ id: "saved:…", name: "Review desk", …the space as kept today }` (shown here). There is no new store and no version change.
    - They travel in a backup only when window layouts are ticked (C182).
    - On restore, a window on a screen this computer does not have opens on the main screen, as ruled.
    - `forget:` on one asks for nothing more than a saved search does, and `undo:` brings it back.

    **Suggestion:** yes.
  - **(g) Other screens, and the browser's permission:**
    - Placing a window on another screen uses the browser's window management (Chromium only). It asks your permission once, the first time, and the Enter line says so before Enter: "The browser will ask once whether Parliament may place windows on your screens."
    - In Safari and Firefox the map says they cannot place windows on other screens, and `pop:… display 2` opens on this one, saying so.
    - The site's permissions header gains `window-management=(self)`, explicitly. It takes effect when the site is next deployed, which is not part of this stage.
    - The screens' names and sizes stay in the page; nothing is sent.

    **Suggestion:** yes.
  - **(h) "Extra screen detected":** shown once per setup, as marginalia under the field, when the browser reports a second screen (which it does without asking). A click writes `arrange:`. Remembered on this device so it does not come back for the same screens. **Suggestion:** yes.
  - **(i) Small screens** (a choice; the plan's "needs from you": no mockup draws a phone).
    1. **As proposed:**
       - In a narrow window (760 to 1,100 pixels), at most two boards side by side, the rest beneath.
       - On a phone (under 760, or touch-only):
         - one board at a time, full width;
         - the strip across the top switches between the open boards;
         - the bar at the bottom;
         - no popping or focus;
         - rooms in their narrow form.
       - The welcome page's "built for a computer for now" line goes once this is tried.
    2. **Narrow windows only now** (the two-board rule), the phone waiting for a mockup.

    **Suggestion:** 1, built last in the stage so it can be changed after you try it on a phone.
  - **(j) Stored data, in all:**
    - the room's optional `focus` (if (b) 1);
    - saved arrangements as records in the existing store;
    - two device settings: calm, and the screens already noticed.

    No migration, and every backup stays readable. **Suggestion:** approve this outline; anything more is shown before it is written.

**C254. Stage 14, piece 1, as built: focus sets** (27 October; C253 as ruled).
- **`focus:room collection`** (C253 (a)):
  - It focuses on those boards, left to right, each in a column of its own, the rest closed and kept for `focus:off`. The bar is at the bottom, as for the first form.
  - It takes the boards by the names the strip shows: room, collection, reflection, records, library, plan. A word that is not one is named, with the list.
  - Already focused, it changes the set, and `focus:off` still brings back what was there before focus began.
  - Its line: "Enter focuses on the chat and Collection, in that order. Nothing is lost, and focus:off brings back what was here", then "It is kept as the focus of Essay room: focus: alone brings it back".
- **Kept with the room** (C253 (b) 1):
  - The set is saved on the record of the room on screen as `focus: ["room", "collection"]`, one step for `undo:`.
  - With no room on screen it still focuses, saying it is not kept.
  - `focus:` alone uses the room's set, or the chat alone while it has none.
  - `focus:save` keeps the boards on screen as the room's set, without changing the screen.
  - Restore's check of a room accepts the field only as a list of names.
- **In the Lab,** every form of `focus:` says "focus: works outside the Lab. done: leaves it first".
- **The strip** ends with "focus: off ▾" or "focus: on ▾".
  - A click on the words runs `focus:` or `focus:off` at once and echoes it ("Ran focus:off. undo: takes it back").
  - The caret opens the boards with numbered ticks, the room's set ticked to start. Each tick writes the line, `focus:room collection records`, into the bar for Enter.
    - **A change from the spec:** it says ticking sets the focus. Writing the line lets several boards be chosen before the screen changes, and Enter keeps it with the room.
- **While focused,** a click on a board in the strip that focus hides does not rearrange, and says "The screen is in focus. focus:off to arrange freely".
- **Finding a card** (a click on a quoted passage) turns focus off first when the Collection is hidden, saying "Focus is off, to show Collection. focus: brings it back".
  - That case is in the code and not yet tried in the browser.
  - A sweep's review reaches the Collection the same way, through finding.
- **Stored data:** the room's optional `focus`, as shown in C253 (b) and ruled. Nothing else.
- **Tests:**
  - a set laid out and changed while focused, and `focus:off` after;
  - focus turned off for a hidden board;
  - the commands' lines and acts, names, `focus:save`, `focus:` with a set, no room, the Lab;
  - a room record with a focus, and with a wrong one.

  1,311 tests; 30 lint warnings, all older.
- **Tried in the browser,** on the trial copy, with Essay room's chat (225) on screen:
  - `focus:room collection` showed its two lines, and Enter left 225 and the Collection, storing `["room", "collection"]` on Essay room.
  - A click on Records in the strip said the screen is in focus. A click on "focus: on" brought every board back.
  - `focus:` alone focused on Essay room's set again.
  - The picker showed "1 the chat 2 Collection", and ticking Records wrote `>focus:room collection records`.

  Essay room keeps that set; the screen is back as it was.
- **Next:** piece 2, calm.

**C255. Stage 14, piece 2: calm, its open points** (proposed 27 October; C253 (c), (d), (e) as ruled; the editing spec, "Calm"). Built as suggested, so a ruling changes one entry.
- **What exists today:**
  - A reply can already be read "clean", the result only, with `markup:off`. That view is also read-only.
  - Ask and suggestion markers read "ask 241: accept · undo".
  - The Collection's legend, its review bar with the keys line, and the branch slider's line ("open:201a · with its history · …") all draw in full.
  - Nothing yet reads the setting calm will use.
- **(a) What calm folds, mapped from the spec's table to what is on screen now.** Each comes back in full when you are near it:
  - **A board's head:** its title only; the marginalia beside it waits.
  - **A reply:** it reads as it stands, as `markup:off` shows it.
    - Your edits show as their result. Answers and suggestions not yet accepted are not shown. A small blue tick in the margin says something is marked.
    - Unlike `markup:off`, it stays editable: being near shows the markup, and you edit with it in view.
  - **Inline markers:** the ask and suggestion markers become small dots with their numbers, green for asks and sweeps, rust for Ripple.
  - **The branch slider's line:** its first item only, `open:201a`.
  - **Collection cards:** one line, the result. An edit shows what it became; a quote or note its first line; the card's marginalia waits.
  - **The Collection's legend:** "colours ▾".
  - **The review keys line:** hidden. The tab counts are dimmed.

  **Suggestion:** yes.
- **(b) What "near" is:**
  - the board, for its head;
  - the reply, for itself;
  - the card;
  - the legend;
  - the slider.

  Near means hover, keyboard focus inside it, or on a touch screen the last one tapped (C253 (e)). **Suggestion:** yes.
- **(c) Never calmed:**
  - the field and its marginalia;
  - the Enter line;
  - the review bar's buttons;
  - the count line under the field;
  - the strip, which says "calm: on" or "calm: off".

  **Suggestion:** yes.
- **(d) The commands:**
  - `calm:` and `calm:off`; the strip's "calm: off" toggles with a click, echoed, one step for `undo:`.
  - The setting is kept on this device and not in backups (C253 (d)). It is off for someone new (C253 (c)).
  - With reduced motion, nothing fades.

  **Suggestion:** yes.
- **(e) Stored data:** one device setting, `calm`. **Suggestion:** yes.

**C256. Stage 14, piece 2, as built: calm** (27 October; C255 as suggested).
- **`calm:` and `calm:off`:**
  - Each is a setting of this device, `calm`, off for someone new, one step for `undo:`.
  - The lines: "Enter calms the screen: details wait until you are near them"; "Enter shows every detail again".
  - The strip has "calm: off" before "focus: off ▾"; a click toggles and echoes ("Ran calm:off. undo: takes it back").
  - The setting is kept on this device and stays out of backups. It survives a reload, after a fix found in trying it: the settings store reads only the keys it lists, so `calm` is now listed, off.
- **What folds** (C255 (a)), all by the shell's `calm` class in the stylesheet:
  - **Board heads:** title only.
  - **Replies:** read as `markup:off` shows them, but editable.
    - Struck words go, added words are plain, and answers and suggestions not yet accepted are not shown.
    - A blue ✓ in the margin marks a reply with anything marked.
  - **Ask and suggestion markers:** small dots with their numbers (the markers now carry `data-num`). Green for asks and sweeps, rust for Ripple; a marker without a number is a plain dot.
  - **The branch slider's line:** its first `open:` only.
  - **Collection cards:** one line, the result.
    - An edit that only removed words says "removed", as `markup:off` does: found in trying it, where such cards folded to nothing.
    - An answered ask shows its answer.
  - **The legend:** "colours ▾". It can take keyboard focus, so it opens without a pointer.
  - **The review keys line:** hidden, and the tab counts dimmed.
- **Near** (C255 (b)): hover, or keyboard focus inside. On a touch screen, the shell marks the tapped element and every one around it as near, until the next tap.
- **Never calmed:** the field, the Enter line, the review bar's buttons, the count line and the strip.
- **Stored data:** the device setting `calm`. Nothing else.
- **Tests:** the commands and their lines. 1,313 tests; 30 lint warnings, all older. What folds is styling, tried in the browser rather than tested.
- **Tried in the browser,** on the trial copy:
  - `calm:` folded the boards' heads to their titles and the Collection's cards to one line, the legend to "colours ▾".
  - 216's reply showed its markers as dots 218, 219 (rust) and 220, with a ✓ in its margin.
  - Near on that reply brought back "ripple 219: accept · reject" and the suggestions in place.
  - Calm survived a reload. "calm: on" in the strip turned it off, `undo:` brought it back, and `calm:off` ended it.

  The trial copy is as it was.
- **Next:** piece 3, saved arrangements.

**C257. Stage 14, piece 3: saved arrangements, its open points** (proposed 27 October; C253 piece 3 and (f) as ruled; the arrangements spec §7a, §8; C125, C182). Built as suggested, so a ruling changes one entry.
- **What exists today:**
  - The screen is one space, kept per device in the `arrangements` store under `space`, with the Lab's and focus's "before" inside it.
  - The store travels in a backup when window layouts are ticked (C182). A restore checks each record, and drops one it cannot read.
  - `arrange:` answers "not built yet".
- **(a) What a saved arrangement keeps:**
  - the boards and their columns;
  - popped windows with their screen and side;
  - the widths, where the bar sits, which board the bar points at, Records' columns;
  - what non-room boards show (the collection shown, the plan, the Settings section).

  It does not keep which chats rooms show: a saved arrangement is a desk, not a session. Saving while in the Lab is refused ("done: first"). Saving while focused keeps what is on screen, without the focus. **Suggestion:** yes.
- **(b) The commands:**
  - `arrange:save "Review desk"` keeps the screen under that name. If the name is taken, the Enter line says it replaces that one.
  - `arrange:"Review desk"` switches to it, by its name or its start. The room in it shows the chat the bar points at now.
  - `arrange:"Review desk" 207` switches with 207 in its room.
  - Switching ends focus. It is one step for `undo:`, which brings back the screen as it was. Windows open and close as the arrangement says.
  - `forget:"Review desk"` removes one, as for a saved search, with the same "which kind?" question when a search, collection or framework shares the name. `undo:` brings it back.
  - Bare `arrange:` lists your arrangements, until piece 4 makes it the map.

  **Suggestion:** yes.
- **(c) `name:` and `duplicate:` on a saved arrangement** need one to point at, and the map (piece 4) is where you point. Until then, saving under a new name and forgetting the old does the same. **Suggestion:** build them with the map.
- **(d) Stored data** (shown in C253 (f), ruled):
  - Records in the existing `arrangements` store, `{ id: "saved:…", name: "Review desk", columns, popped, addressed, bar, widths, recordsCols, resting, context, updatedAt }`.
  - Restore's check accepts the new kind of id with its name, up to 80 characters.
  - A version from before this skips such a record on restore, as it skips any it cannot read. So every backup, old or new, stays readable.

  **Suggestion:** yes.

**C258. Stage 14, piece 3, as built: saved arrangements** (27 October; C257 as suggested).
- **`arrange:save "Review desk"`** keeps what is on screen, as C257 (a) says, under that name. It is one step for `undo:`.
  - The line: "Enter keeps what is on screen as Review desk, windows and their screens included. The chats in rooms are not kept".
  - A name already used says it replaces that one, and keeps its id.
- **`arrange:"Review desk"`** (or its start) switches to it, ending focus if focused ("…, ending focus. undo: brings back the screen as it is").
  - The room in it shows the chat the bar points at; `arrange:"Review desk" 207` puts 207 there.
  - A desk with several rooms opens the others empty, since chats are not kept: seen in trying a desk of three rooms.
- **`forget:"Review desk"`** (or with `arrangement` after it) takes it away, and `undo:` brings it back. A name shared with a saved search, collection or framework asks which kind.
- **Bare `arrange:`** lists them ("Your arrangements: Review desk. arrange:"name" switches to one"), or says none is saved, until piece 4 makes it the map.
- **The Lab:** all forms but the list say "arrange: works outside the Lab".
- **Stored data:**
  - Records `saved:…` in the existing `arrangements` store, with their name, as shown in C257 (d).
  - `cleanArrangement` reads them like the space: a name of 1 to 80 characters, no focus or Lab "before".
  - They travel in backups when window layouts are ticked. A version from before skips them.
  - `name:` and `duplicate:` on them come with the map (C257 (c)).
- **Tests:**
  - what one keeps and leaves out;
  - a name required;
  - switching with the chat here or one named;
  - every line of `arrange:`;
  - forgetting.

  1,320 tests; 30 lint warnings, all older.
- **Tried in the browser,** on the trial copy:
  - `arrange:save "Trial desk"` kept the screen.
  - `focus:` cleared it to 225 and the Collection. `arrange:"Trial"` switched back, ending focus, 225 in the first room and the other two empty. `undo:` returned to the focused screen.
  - After a reload, `arrange:` listed Trial desk. `forget:` removed it, `undo:` brought it back, and forgetting it again left none.

  The trial copy is as it was.
- **Next:** piece 4, the screens map.

**C259. Stage 14, piece 4: the screens map and other screens, its open points** (proposed 27 October; **ruled 27 October, as suggested: (h) 1, `name:` with two names, no `duplicate:` for arrangements**; C253 piece 4, (g) and (h) as ruled; C257 (c); `parliament_screens_v1.html`; the arrangements spec §7a). Waiting for Stefan: (h) is a choice. The rest is built as suggested, so a ruling changes one entry.
- **What exists today:**
  - `pop:library display 2` is read and stored with the window, but the window opens on the screen it is popped from.
  - Bare `arrange:` lists the saved arrangements (C258).
  - The browser can say whether a second screen is attached without asking anything. Its size, its position and placing windows on it need the browser's permission. Only Chrome and Edge have this.
- **(a) What the map draws,** as the mockup does:
  - Each screen as a box, labelled "Display 2, 2560 wide", with ", this window" on the one Parliament is on.
  - The boards on the page sit in this window's box, side by side as on screen. Each popped window sits in the box of its screen. The board the bar points at has the navy rule. An empty screen says "nothing here yet".
  - Under the map, one line of marginalia, every part of which writes its command:
    - what is on screen, by the saved arrangement's name when it is exactly one of them;
    - `arrange:save "…" keeps it`;
    - `reset: returns it to its default`;
    - Escape goes back.
  - Then your saved arrangements, each writing `arrange:"Review desk"`.
  - A click on a board writes the command that moves it: `pop:library display 2` onto the other screen, or `pop:back library` for a window already there.
  - The map takes the place of the boards while it is open. The boards stay as they are underneath: nothing closes, nothing is lost.

  It also opens in the Lab, where switching and saving are still refused, as built. **Suggestion:** yes.
- **(b) When it shows:**
  - The map shows while the field reads `arrange:` alone, before Enter, and Enter keeps it open.
  - While it is open, a command you type shows on it before Enter: the Library faded with "moving to display 2", and its outline on the other screen with "will land here".
  - After Enter it shows the result. Escape closes it; nothing else does.

  **Suggestion:** yes, as the mockup's steps draw it.
- **(c) How screens are numbered:** the main screen, the one the computer calls main, is display 1. The others are numbered left to right as they stand, top to bottom where stacked. So `display 2` keeps meaning the same screen wherever Parliament's own window is, and a saved arrangement keeps placing windows where it did. **Suggestion:** yes.
- **(d) When the browser asks, and what the map shows first:**
  - Until the browser has been allowed, it says only that another screen is attached, not which or how big. So the map before Enter draws "this screen" and "another screen", without numbers or sizes.
  - Enter on `arrange:`, with a second screen attached, asks the browser once; so does Enter on `pop:… display 2`. The Enter line says so before Enter: "the browser asks once whether Parliament may place windows on your screens".
  - Once allowed, the map has its numbers and sizes and the question does not come again.
  - If it was refused, the map says "The browser was told not to let Parliament place windows. Its site settings can change that", and `pop:… display 2` opens the window here, saying so.

  **Suggestion:** yes.
- **(e) Placing a window:**
  - `pop:library display 2` opens the window at the top of that screen, at the size windows have today. `pop:left` and `pop:right` then place it at that screen's edge.
  - A screen that is not connected, in a saved arrangement, a restore or the command, opens the window here: "Display 3 is not connected. Enter opens the Library in its own window here", as ruled.
  - The screens' names and sizes stay in the page; nothing is sent.

  **Suggestion:** yes.
- **(f) Browsers that cannot place windows:**
  - The map draws one screen and says "This browser cannot place boards on other screens. Everything else works here." The mockup also names Chrome and Edge; the copy names no browser (C94), as C260 records.
  - `pop:… display 2` says "This browser cannot place windows on other screens. Enter opens the Library in its own window here".
  - With one screen: "No external screen detected. Connect one and boards can go on it."

  **Suggestion:** yes.
- **(g) "Extra screen detected":**
  - Shown once, as marginalia under the field: "Extra screen detected · arrange across screens", the click writing `arrange:`. It shows when a second screen is attached at start, or plugged in while Parliament is open.
  - Remembered on this device until the computer is back to one screen, so it comes again the next time a screen is attached, not every time Parliament opens.

  **Suggestion:** yes.
- **(h) `name:` and `duplicate:` on a saved arrangement** (a choice; C253 piece 3 named both, C257 (c) left them to the map). The map points at no single saved arrangement, so each needs the name typed.
  1. **`name:"Review desk" "Two screens"`** renames one, from anywhere, and `undo:` names it back. No `duplicate:`: `arrange:"Review desk"` then `arrange:save "Two screens"` makes the copy, and `duplicate:` stays a word for rooms.
  2. **Both:** `name:` as in 1, and `duplicate:"Review desk" arrangement` keeping a copy as "Review desk 2".

  **Suggestion:** 1. A second word for what two commands already do adds a form to learn for little.
- **(i) The site's permissions header** gains `window-management=(self)` (C253 (g), ruled). It takes effect at the next deploy, which is not part of this stage.
- **(j) Stored data:**
  - One device setting, the screens already noticed for (g), not in backups.
  - With (h), a saved arrangement's name changes in place.

  Nothing else is new; `display` on a window is already stored. **Suggestion:** yes.

**C260. Stage 14, piece 4, as built: the screens map and other screens** (27 October; C259 as ruled: (h) 1).
- **The map** (`ScreensMap.jsx`, `shell/screensMap.js`):
  - It shows while the field reads `arrange:` alone, and Enter keeps it open. Escape closes it. It stands where the boards are, and the boards stay drawn underneath, out of sight.
  - Each screen is a box: "Display 2, 2560 wide", with ", this window" on Parliament's own. Before the browser says more, the boxes are "This screen, 1536 wide, this window" (its width is known without asking) and "Another screen" in a dashed outline.
  - The boards on the page sit side by side. Windows sit over them at the lower right, as on a screen, or in the middle of another screen. The board the bar points at has the navy rule.
  - A command typed while it is open shows before Enter: the board faded with "moving to display 2", "moving to its own window" or "coming back to this window", and its outline where it will land.
  - A click on a board writes `pop:library display 2`, or `pop:back library` for a window.
  - Under the screens:
    - what is on screen, by the saved arrangement's name when it is exactly one, with rooms by the number of their chat;
    - `arrange:save "…" keeps it`, `reset: returns it to its default` and "Escape goes back", each writing its command or closing the map;
    - then "Saved" and your arrangements, each writing `arrange:"…"`.
  - At its foot, "No external screen detected", "This browser cannot place boards on other screens", or "The browser was told not to let Parliament place windows".
- **Its Enter line:**
  - "Enter keeps this view open. pop:library display 2 puts a board on the other screen".
  - With one screen, or the permission refused: "… Escape goes back".
  - With a second screen not yet allowed: "… The browser asks once whether Parliament may place windows on your screens", and that Enter asks.
- **Other screens** (`shell/screens.js`):
  - Screens are numbered with the main one first, then left to right. The browser is asked only from an Enter that said so: the map's, or `pop:… display 2` and switching to a saved arrangement that places a window.
  - A window opens at the top of its screen, and `pop:left` and `pop:right` work on that screen. A saved arrangement moves a window already open to its screen.
  - `pop:library display 2` says before Enter which of these holds:
    - it goes there;
    - the browser asks first;
    - "Display 2 is not connected" (one screen comes before the permission);
    - the browser cannot;
    - it was refused.

    In the last three the window opens here.
  - The screens' names and sizes stay in the page.
- **"Extra screen detected · arrange across screens"** shows under the field when a second screen is attached, at start or later. The click writes `arrange:`, and the map's Enter ends the note. The device setting `screensNoticed` keeps it from coming back until the computer is down to one screen; it is not in backups.
- **`name:"Review desk" "Two screens"`** renames a saved arrangement from anywhere, keeping its id; `undo:` names it back. The Enter line refuses a name another arrangement has, or the same name. No `duplicate:` (C259 (h) 1, as ruled).
- **The permissions header:** `window-management=(self)` in `securityHeaders.js` and `netlify.toml`, which a test keeps equal. It takes effect at the next deploy.
- **Departures, for Stefan:**
  - **The mockup's foot line names Chrome and Edge.** The copy rule from C94 names no browser, since Parliament cannot tell which it is in, and a test holds it. So the line says only "Everything else works here." C259 (f) is corrected to match.
  - **Bare `arrange:` now opens the map, not the list of names** (C258). The names are on the map, and `arrangeList` is gone.
- **Tests:**
  - numbering screens;
  - reading them without and with the permission;
  - where a window opens;
  - every `pop:… display` line;
  - when to ask;
  - what the map draws, before and after a line;
  - its foot;
  - the arrangement on screen by name;
  - the command a click writes;
  - the map's Enter lines;
  - renaming.

  1,331 tests; 30 lint warnings, all older.
- **Tried in the browser,** on the trial copy. The in-app browser can place windows, has one screen, and has the permission refused. It never opens pop-up windows, even directly, so a window on another screen is not tried here.
  - `arrange:` showed the map: one screen 1536 wide with nine boards, the room addressed, "No external screen detected".
  - Enter kept it. `pop:library display 2` showed the Library leaving and its outline landing, with "Display 2 is not connected…". Enter was refused by the pane's pop-up block, as any `pop:` is.
  - A second screen was simulated. The note showed, and its click wrote `arrange:`. The map showed "Another screen" and the refused line. Enter ended the note.
  - `arrange:save "Trial desk"` then showed it under "Saved" and named the screen. `name:"Trial" "Two screens"` renamed it, and `undo:` named it back.
  - `forget:` took it away, and Escape brought the boards back as they were. After a reload, the setting was back to false and only the space was stored.
- **Not tried:**
  - two real screens;
  - the browser's question;
  - a window placed on display 2.

  These need Chrome or Edge with a second screen attached; they are on the checkpoint's list. If the question takes more than a few seconds to answer, the browser may block the window that Enter then opens; a second Enter opens it.
- **Next:** piece 5, small screens.

**C261. Stage 14, piece 5: small screens, its open points** (proposed 27 October; C253 (i) 1 as ruled; C126; C246 (a); welcome spec §12.4). Built as suggested, so a ruling changes one entry. No mockup draws a phone, so this is built to be tried and changed at the checkpoint.
- **What exists today:**
  - Under 900 pixels wide, the boards stack in one column, sharing the window's height, and the edges between them hide.
  - Rooms take a height from the window, and draw their narrow form by their own width (C126). A room built for a phone draws it at any width (C246 (a)).
  - The bar sits where `bar:` put it, at the top or the bottom.
  - The strip lists every board on one line that wraps, rooms as one "Room:".
  - The welcome page says "built for a computer for now; the phone comes later" on narrow and touch screens.
- **(a) Where the lines fall,** as ruled:
  - **A phone:** under 760 pixels wide, or a screen with touch and no pointer that hovers, at any width. A tablet counts as a phone.
  - **A narrow window:** 760 to 1,100 pixels.
  - **Wider:** as today. Today's stacking under 900 goes.

  The layout follows the screen as it is now, so turning a tablet or narrowing a window changes it at once.

  **Suggestion:** as ruled. If a tablet feels cramped with one board when you try it, it can take the narrow window's layout instead.
- **(b) A narrow window:**
  - Two boards side by side, in their order; a third and more go beneath, two to a row.
  - Each row is the height a board has today, and the page scrolls down. Columns share a row evenly: the widths set with `width:` or by dragging are kept for a wider window, and the edges hide.
  - `width:` says "width: works on a wider window" instead of changing anything.

  **Suggestion:** yes.
- **(c) A phone, one board at a time:**
  - The board the bar points at fills the screen. The others stay open out of sight, keeping where they were scrolled. If the bar points at a window, the first board shows.
  - **The strip across the top switches:**
    - A tap on an open board shows it. A tap on one not open opens it, as today.
    - Each open room has its own entry, "Room: 225", so a second room can be reached.
    - The strip is one line that scrolls sideways.
    - "calm: off" stays; "focus: off ▾" goes.
  - No swiping between boards for now: a room's own content scrolls, and a swipe would fight it.

  **Suggestion:** yes.
- **(d) The bar on a phone:**
  - It sits at the bottom whatever `bar:` says. The place you chose is kept for wider screens.
  - `bar:top` says "On a phone the bar stays at the bottom. bar:top works on a wider screen".
  - The field folds and opens as it does today.

  **Suggestion:** yes.
- **(e) Commands that do not fit a phone** say so before Enter and change nothing:
  - `pop:`: "pop: works on a wider screen. On a phone one board shows at a time".
  - `focus:` and `focus:off`: "On a phone one board shows at a time, so focus: is not needed".
  - `width:`: as in (b).
  - `bar:top`: as in (d).

  Everything else works as on a computer. `open:` shows what it opens; `close:` shows the board before it. `arrange:` shows one screen; switching to a saved arrangement shows the board it points at. Windows already open, from a wider window made narrow, stay as they are.

  **Suggestion:** yes.
- **(f) Rooms on a phone** draw their narrow form at any width, a tablet's included: the conversation, with the side panels behind their buttons (C126). **Suggestion:** yes.
- **(g) The welcome page on a phone:**
  - It is the one board, with the field in its card as today.
  - Its line "built for a computer for now; the phone comes later" stays until you have tried the phone at the checkpoint, and goes on your yes there.

  **Suggestion:** yes.
- **(h) Stored data:** none. The layout follows the screen; nothing is kept, and the space is unchanged. **Suggestion:** yes.

**C262. Stage 14, piece 5, as built: small screens** (27 October; C261 as suggested).
- **The sizes** (`shell/sizes.js`):
  - A phone is under 760 pixels wide, or a touch screen that does not hover. A narrow window is 760 to 1,100 pixels. Wider is as before.
  - The shell's class follows the screen as it changes, and nothing is stored. Today's stacking under 900 pixels is gone.
- **A narrow window:** two boards to a row in their order, the rest beneath, two to a row; the page scrolls down. The edges hide, and widths set for a wider window wait for one. `width:` says "width: works on a wider window".
- **A phone:**
  - **What shows:** the board the bar points at, alone and full width. The others stay open out of sight, keeping where they were scrolled. With the bar at a window, the first board shows.
  - **Rooms** draw their narrow form at any width.
  - **The bar** sits at the bottom whatever `bar:` chose, except on the welcome page, where the field stays in its card.
  - **The strip** is one line that scrolls sideways. Each open room has its own entry, "Room: 225", that shows that room. The one on screen has a navy underline. "calm: off" stays; "focus: off ▾" goes.
  - **The strip shows on a phone whenever more than one board is open, the welcome page among them**, since it is the only way to move between boards. A wider screen still hides it while the welcome page is open. The welcome page has no entry on the strip; `tour:` brings it, as on a computer.
- **Said before Enter on a phone, changing nothing:**
  - `pop:`: "pop: works on a wider screen. On a phone one board shows at a time".
  - `focus:` (and `focus:off`): "On a phone one board shows at a time, so focus: is not needed".
  - `bar:top`: "On a phone the bar stays at the bottom. bar:top works on a wider screen".

  `pop:back` still works, so windows opened on a wider window can come home. `bar:left` and the like are kept for wider screens.
- **The welcome page's line** "built for a computer for now; the phone comes later" stays until you try a phone at the checkpoint (C261 (g)).
- **Stored data:** none.
- **Tests:**
  - the three sizes;
  - each refusal, and what passes: `pop:back`, `bar:left`, `pop:` in a narrow window, `width:` when wide, `open:` on a phone.

  1,334 tests; 30 lint warnings, all older.
- **Tried in the in-app browser,** on the trial copy:
  - **At 900 pixels:** the welcome page and room 225 on the first row, 223 and 216 on the second, the Collection's column full width beneath. No sideways scroll.
  - **At a phone's 375 pixels:** room 225 alone, in its narrow form, with the bar at the bottom. The strip read "Room: 225 · Room: 223 · Room: 216 · Collection…". A tap on 223 showed that room, the bar following.
  - **The refusals:** `pop:library`, `focus:` and `bar:top` each said their line.
  - **`open:records`** showed Records alone, fitting the width.
  - **Undoing my changes:** a tap on 225 put the trial copy back as it was.
  - The pane's own width, 1,024 pixels, is now a narrow window, two boards to a row, as ruled.
- **Not tried:**
  - a real phone or tablet;
  - a touch screen wider than 760;
  - the on-screen keyboard with the bar at the bottom.

  These are for the checkpoint.
- **Next:** piece 6, the stage 14 checkpoint.

**C263. The stage 14 checkpoint** (proposed 27 October; **ruled 27 October, as suggested: (b) 1, the phone line stays until a real phone is tried; (c) 1, tablets as ruled; (d) the C94 rule kept; (e) 1,100 kept; (f) the focus set kept as test data**; refactor-plan.md, stage 14; C253 to C262). Pieces 1 to 5 are built and committed. No retirement line belongs to this stage. Waiting for Stefan: (b) and (c) are choices; the rest is a yes or no.
- **(a) What to try,** on the trial copy (localhost:5174, on this computer). Nothing here needs a key.
  - **Focus sets** (C254):
    - In the Essay room, `focus:room collection`: the chat and the Collection, left to right, kept as the room's set.
    - `focus:off`, then `focus:` alone uses the set again.
    - At the strip's end, "focus: off ▾": a click toggles, and the caret opens the picker with numbered ticks.
    - While focused, a click on a board not on screen says "focus:off to arrange freely".
  - **Calm** (C256): `calm:`, or "calm: off" on the strip.
    - A reply's marginalia after the first, the board heads' marginalia, the markers (now small numbered dots), Collection cards (folded to their result) and the legend ("colours ▾") wait until you move near.
    - The field, the Enter line and the review bar never calm.
  - **Saved arrangements** (C258):
    - `arrange:save "Review desk"`; change the screen; `arrange:"Review"` switches back; `undo:` returns.
    - `arrange:"Review desk" 207` puts 207 in its room.
    - `name:"Review desk" "Two screens"` renames it; `forget:"Two screens"` takes it away.
  - **The screens map** (C260):
    - Type `arrange:` and the map shows before Enter; Enter keeps it.
    - With it open, type `pop:library display 2` and watch the Library leave and land before Enter. A click on a board writes its command. Escape closes the map.
  - **A second screen,** in Chrome or Edge on this computer, with a screen attached:
    - "Extra screen detected · arrange across screens" under the field.
    - The map's Enter says the browser asks once; answer it. The map then has "Display 1, … this window" and "Display 2, … wide".
    - `pop:library display 2` opens the Library on that screen, and `pop:right` puts it at that screen's edge.
    - Save that as an arrangement and switch away and back: the window returns to display 2.
    - After a reload, the numbers come without asking. Detach the screen, then attach it again: the note comes back once.
  - **Small screens** (C262):
    - Narrow the window to between 760 and 1,100 pixels: two boards to a row.
    - Under 760, or Chrome's device mode for a phone: one board at a time. The strip scrolls sideways with each room by its number, and the bar sits at the bottom.
    - `pop:`, `focus:` and `bar:top` each say why not.
- **Not tried by me,** and only you can try them:
  - **Two real screens:** the browser's question, a window on display 2, moving it by switching arrangements.
  - **A real phone or tablet:** the on-screen keyboard with the bar at the bottom; calm's "near" by tapping.

  A phone cannot reach the trial copy, which runs only on this computer. It can be tried on the first deploy preview (stage 15), or now in Chrome's device mode, which is close but not the same.
- **(b) The welcome page's phone line** (a choice; C261 (g)). Under "Welcome", on a phone or touch screen, the page says "built for a computer for now; the phone comes later". With piece 5, the phone has a layout, so the line is no longer quite true.
  1. **Keep it until you have tried a real phone,** on a deploy preview in stage 15, and remove it then on your yes.
  2. **Remove it now,** on the strength of device mode.

  **Suggestion:** 1. The line costs nothing while it stays, and a real phone is where the bar at the bottom and the keyboard meet.
- **(c) A tablet** (a choice; C261 (a), as ruled in C253 (i)). A touch screen counts as a phone at any width, so an iPad shows one board at a time.
  1. **Keep it as ruled,** and decide again once you have used it on a tablet.
  2. **A touch screen 760 pixels or wider gets the narrow window's layout,** two boards to a row; only phones show one at a time.

  **Suggestion:** 1 until it is tried. Two boards on a tablet held upright are each about the width of a phone, which may be worse, not better.
- **(d) A departure to confirm** (C260). The screens mockup's line says "Chrome and Edge can; everything else works here." The copy rule from C94 names no browser, since Parliament cannot tell which one it is in, and a test holds it. So the line reads "This browser cannot place boards on other screens. Everything else works here." **Suggestion:** keep the rule; the browser support table planned for stage 15 is where browsers are named.
- **(e) The cut-off for a narrow window,** 1,100 pixels, as ruled. A laptop window 1,024 pixels wide, or a browser beside another window, now shows two boards to a row rather than a row that scrolls sideways. **Suggestion:** keep it, and say if it feels wrong in use; the number is in one place.
- **(f) Test data on the trial copy:** the Essay room keeps the focus set `["room", "collection"]` from piece 1. Every other test arrangement was forgotten, and the screens setting is back to false. **Suggestion:** keep the focus set as test data, as with C250 (h).
- **Next:** stage 15, close-out and going public, proposed in pieces first as this stage was.

**C264. Stage 15 in pieces: close-out, the vault, going public** (proposed 27 October; **ruled 27 October: (b) R30, R35 and R31 approved as proposed, and the leftovers of R9, R10 and R12; (e) `keys.parliament.ltd`, the four exceptions approved, an outside review once public; (f) changed to 2: no draft deploy, everything is tried on the live site, from a list of every change (`parliament_refactor_live_testing`); (g) 1, with going public; (h) 1; (i) reopened: Codeberg's terms, since July 2026, bar projects mostly written with AI, so the mirror's host is chosen again, and the standby's host was asked about; the rest as suggested. (i) then ruled the same day: Bitbucket for the mirror for now, every release pushed to GitHub and Bitbucket together (Radicle, peer to peer, kept in mind for later; a mirror can move at any time); Cloudflare Pages for the standby, its setup shown step by step again at piece 8.** "Project Apollo" is renamed Parliament in the README and SECURITY.md; refactor-plan.md, stage 15 and §6; C71, C94, C170, C263; `research/vault-scope-review.md`; `privacy-copy-draft.md`; `research/security-audit.md` §3; `browsers.md`; `docs/hosting.md`). Waiting for Stefan: (b), (e), (f), (g), (h) and (i) are choices or approvals; the rest is built as suggested unless ruled otherwise. Nothing is pushed, deployed or made public without your yes at that step.
- **What exists today** (a survey of the code, the history and the documents, 27 October):
  - **Retirement lines.** Only three were never put to you: R30 (four unused files), R31 (old process documents) and R35 (the Inter font). R39 (Drafting Desk) waits until after the refactor, as ruled.
    - Four approved lines are not quite finished: `HomepageTopBar.jsx` (R9) and `exportAllData` in `db.js` (R10) are still in live code with nothing using them; old styles remain in `index.css` (R12, "file by file"); and the homepage scope is still read in `modes.js` (R11), which old rooms may need.
    - The plan's table does not show the approvals given at the stage 6 checkpoint (R1 to R13, R27); the rulings are in this file.
  - **Dependencies.**
    - `@dnd-kit` (four packages) is used by nothing live.
    - The Inter font is imported in `main.jsx` but no style names it, so the system fonts show.
    - Most versions are ranges (`^`); a lockfile pins what is installed.
  - **The words.**
    - The privacy draft is applied in Settings (About, the four paragraphs, "What leaves your device") and the network card.
    - Not yet applied: the README and SECURITY.md (both still say "Project Apollo", Anthropic only, session-only keys, old backups); the app's manifest ("chat interface for Claude"); and one comment in `networkLog.js`.
    - SECURITY.md's policy block is out of date, and nothing tests it.
    - There is no verb reference and no changelog; the update notice says only "reload".
  - **The security policy.** Nothing in the built app needs `'unsafe-inline'` for styles or `data:` for images, as far as a search finds: the only style elements are in development screens. Trusted Types has three known blockers, none in Parliament's own code (security audit §3). The vault is not built.
  - **The history.** 733 commits.
    - Your personal address is the author on 455 of them, and the committer on 294.
    - Your first name appears in 104 tracked files, mostly the spec documents.
    - The two logos in `public/` carry your full name in their file details (the PNG's embedded author field).
    - No key, password or `.env` file is tracked; the key-like strings are test placeholders.
    - This branch cannot be pushed as it stands, since GitHub refuses commits with the private address (C71, 12 October). So nothing on it can reach Netlify by a push today.
  - **Hosting and the repository.**
    - Netlify builds `main` with no settings for previews.
    - There is no `.github/` folder (no workflows, no reporting policy), no contributing guide and no changelog. The licence is MIT.
    - `browsers.md` has the tested-in table; nothing in Settings shows what this browser can do.
- **The pieces,** each committed and checked before the next:
  1. **Tidy the code.**
     - R30 and R35, item by item, as (b) rules.
     - `@dnd-kit` leaves the dependencies (approved with R16 and R34).
     - The unfinished parts of R9, R10 and R12 are carried out; R11's reading of old rooms stays.
     - Every dependency is pinned to the exact version installed.
     - The plan's table is brought up to date with the rulings.
  2. **The vault, designed and tried** (C170, ruled). A vault is a second, very small site of Parliament's own (for example `keys.parliament.ltd`), loaded invisibly inside the main page. It alone holds the API keys, so code on the main page, even a compromised package, can never read a key; it can only ask the vault to send a request to a listed provider.
     - This piece writes the design against today's request path, including the channel between the page and the vault, the vault's own key panel, and how each provider's request goes through it.
     - It then tries the one unknown on two local addresses: whether each browser keeps the vault's storage.
     - Nothing stored changes in this piece.
  3. **The vault, built:**
     - the vault page as its own small build, with its own key panel (`api:` opens it);
     - requests to keyed providers sent through it, the gateway's log kept on the main page;
     - existing keys moved into it once, which is a change to stored data, shown before it runs;
     - the four narrow exceptions written into CLAUDE.md, as (e) asks.

     Lock Parliament's passphrase or passkey also guards the vault's storage.
  4. **The policy, tightened:**
     - styles without `'unsafe-inline'`;
     - images without `data:`;
     - Trusted Types, with the three blockers fixed as the audit says;
     - the vault's single framed origin.

     Each is tried under `vite preview`, which serves the real headers on this computer, then on a preview deploy (f).
  5. **The words:**
     - the privacy draft applied everywhere still left: README, SECURITY.md, the manifest;
     - SECURITY.md's policy block written from `securityHeaders.js` by a script, with a test that fails when they differ;
     - the verb reference, `docs/verbs.md`, generated from the registry, with a test that it is current;
     - a "This browser" section in Settings from feature detection: what works here and what happens instead, with `browsers.md` as the full table;
     - a changelog, whose newest entry the update notice shows.
  6. **Ready for the public:**
     - the history sweep and the address rewrite, on a copy, as (h) rules, with a check that no private address is left;
     - a contributing guide and the block guide;
     - the files GitHub reads for private vulnerability reporting;
     - a release zip with its checksum, and a scorecard workflow (OpenSSF) that runs on GitHub only;
     - the commit ids in CLAUDE.md and the spec updated on the copy.

     Nothing is pushed in this piece.
  7. **Going public and the release,** each step on your yes:
     - the copy's `main` pushed to a new public repository;
     - Netlify pointed at it;
     - `parliament.ltd` serving the new Parliament, with the one schema upgrade running on each person's data at their next visit, its copy-before-upgrade first;
     - the vault's site deployed.
  8. **Redundancy:**
     - a mirror on a second host;
     - the headers written also as a `_headers` file that other static hosts read, generated with a test;
     - a standby copy of the site on a second host;
     - the two-factor and recovery-code checks on your accounts, a list for you.
  9. **The checkpoint,** on the live site:
     - stage 4's production checks;
     - a real phone and the welcome page's phone line (C263 (b));
     - two screens;
     - the vault in each browser.
- **Open points,** each with its suggestion:
  - **(a) The order** above: tidy first, the vault before the policy (the policy has to name the vault), words before the copy is made public, the release with going public (see (g)). **Suggestion:** yes.
  - **(b) Approve, item by item:**
    - **R30:** `src/hooks/useMode.js`, `src/components/core/ToolToggles.jsx` and `src/components/core/CitedMarkdown.jsx` move to `src/deprecated/`, and `public/flight_logo.png` to `src/deprecated/public/`. Nothing uses them.
    - **R35:** the Inter font package and its import go. Nothing changes on screen, since no style names it.
    - **R31:** `refactor/` stays in the repository, since it explains how the code got here. The untracked `continuation-*.md` notes and `.pr-body.md` are never published: they are added to `.gitignore` and stay on this computer.
    - **Leftovers of approved lines:** `HomepageTopBar.jsx` (R9) and `exportAllData` (R10) move to `src/deprecated/`. R12's remaining old styles go, each rule checked unused, listed in its commit.

    **Suggestion:** approve all four.
  - **(c) Exact versions:** each `^` range becomes the version the lockfile already installs, so a fresh install builds the same thing. Updates come by hand, one at a time, with the check. **Suggestion:** yes.
  - **(d) The changelog:** a `CHANGELOG.md` in plain words, one entry per release. The update notice shows the newest entry's lines above "reload". **Suggestion:** yes.
  - **(e) The vault's address and its exceptions** (choices and an approval).
    - **Its address:** `keys.parliament.ltd`, as the scope review used, or another name you prefer. It needs a DNS record at deSEC and a second Netlify site, which you create when piece 7 comes.
    - **The four exceptions,** each narrow and written into CLAUDE.md's hard constraints with its reason (scope review §2 B):
      - one framed origin, the vault, where frames are otherwise forbidden;
      - one more host, Parliament's own;
      - prompts and replies crossing to the vault frame over one private channel, never the tab-to-tab one, and never a key;
      - the gateway's decision and log on the page, the send in the vault.

      CLAUDE.md says these constraints change only with a scope review, so this is that approval.
    - **An outside review** of the vault and the key module (security notes §6.6): ask once the repository is public, or not now.

    **Suggestion:** `keys.parliament.ltd`; approve the four; ask for the review once public.
  - **(f) How to try a build on Netlify before going public** (a choice). The branch cannot be pushed until the history is rewritten, so the usual preview, made from a push, is not available.
    1. **A draft deploy from this computer** with Netlify's command-line tool: it uploads the built site to a private, unlisted address, with the real headers, and changes nothing on `parliament.ltd`. It needs the tool installed (a download, asked first) and your Netlify login on this computer, which you do.
    2. **Wait for going public,** and try everything on the live site.

    **Suggestion:** 1. It is where the real phone, the policy trials and the vault get tried before anyone else sees them.
  - **(g) When the new Parliament reaches `parliament.ltd`** (a choice). Today the site runs `main` as it was before the refactor, and the people who use it have data in the old shape.
    1. **With going public:** the rewritten `main` goes to the public repository, Netlify builds from it, and the site changes once.
    2. **Before going public:** this needs the push allowed, either your GitHub setting that blocks pushes with the private address turned off for one push, or the rewrite done first. Then a second change when the public repository takes over.

    **Suggestion:** 1. One switch, after the draft deploy has been tried; the schema upgrade, its dry run on your data done in stage 2, runs then.
  - **(h) What the public history holds** (a choice). C71 ruled: history kept, the address rewritten to the no-reply address, on a copy, `main` only, this repository kept private.
    1. **As ruled, and the logos cleaned:**
      - The address is rewritten.
      - The full name in the two logos' file details is removed from every version in the history, not only the current one: it is the only place your full name appears.
      - Your first name stays in the spec documents, where it records who ruled.
    2. **As 1, and your first name replaced** by "the author" in every file and every past version.
    3. **As ruled only:** the address rewritten, nothing else.

    Rewriting needs `git-filter-repo`, a small tool, downloaded only on your yes.

    **Suggestion:** 1.
  - **(i) The mirror and the standby** (a choice of hosts).
    - **The mirror,** a read-only copy of the public code: Codeberg, run by a non-profit in Germany; or GitLab.
    - **The standby site,** ready if Netlify fails: Cloudflare Pages, which reads the `_headers` file, so the security policy comes with it. GitHub Pages cannot send headers, so it would serve Parliament without its policy, and is not suggested.

    **Suggestion:** Codeberg and Cloudflare Pages. Each needs an account, which you create.
  - **(j) What only you can do,** listed so nothing waits unseen. Each is asked for when its piece comes:
    - log in to Netlify's tool (f);
    - create the public repository and the vault's site and DNS record (e);
    - switch on private vulnerability reporting;
    - check the `support@` mailbox exists at Proton;
    - set Netlify to deploy only from tagged releases;
    - two-factor and recovery codes on GitHub, Netlify, the mirror and the standby.
  - **(k) Stored data,** in all: the keys moved into the vault, once, shown before it runs. Every backup stays readable, since keys are never in one. Nothing else. **Suggestion:** approve the outline; the move itself is shown before it is built.
  - **(l) After the refactor, not in this stage:** R39 (Drafting Desk), the parked PR-50a and b, the compressed-summary branch, and reviewing asks with Ripple. Each is noted so it is not lost. **Suggestion:** yes.

**C265. The welcome page's letter and steps, rewritten by Stefan** (ruled and built 27 October; welcome spec §3 and §4; C43, C118, C120, C225).
- **The letter** is Stefan's own, in five paragraphs, exactly as he wrote it, with "All the best," and "Stef" under it in place of "So Lov".
  - It is not to be edited for style; any change to it is his.
  - It names Claude, deliberately: an exception to the convention that copy names no provider in a sentence.
  - It says the app can be used offline. That holds with a model on your own computer; Stefan chose the words with that known.
  - The page now draws five paragraphs and the two-line closing.
- **The steps,** ten as before:
  - **Step 2, `bar:bottom`, stays** (C43): moving things around is part of the lesson.
  - **Step 3 is "Ask a question".** With no key saved, its line reads "p> and a question, answered from Wikipedia with no AI". With a key saved, it reads "p> and a question", since a model would answer.
  - **Step 6 is "Pop a board into its own window",** in the command's own words (`pop:records`).
  - **Step 7 is "Open the Lab, where rooms are built"** (`lab:`), crossed off when the Lab opens, in place of the Library. A Library step ticked before counts as the Lab's, so no one loses progress.
- **The draft translations** (Japanese, Chinese, Swedish, Finnish) keep the old letter and steps until they are translated again; they show only in development builds.
- **Tests:** the steps and their commands; the Lab step from the arrangement; the old Library tick read as the Lab's; the copy rules, which now know "I've", "I'm", "I'd" and "Ruby". 1,335 tests.
- **Tried in the browser:** the trial copy's welcome page shows the letter word for word, the closing, and the ten steps with the new words.

**C266. Stage 15, piece 1, as built: the code tidied** (27 October; C264 (b), (c) as ruled).
- **Moved to `src/deprecated/`,** each with a header saying what it was, its line and how to put it back, and listed in the folder's README:
  - **R30:** `hooks/useMode.js`, `components/core/ToolToggles.jsx` and `components/core/CitedMarkdown.jsx`, plus `public/flight_logo.png` (to `src/deprecated/public/`), so the site no longer serves it.
  - **R9:** `components/HomepageTopBar.jsx`.
  - **R10:** `exportAllData`, out of `db.js` into `lib/exportAllData.js`. Files it made still restore.
  - **R12, the second part:** 167 rules of `src/index.css` (about 830 lines; the file goes from 2,521 lines to 1,686), into `styles/index-old.css`, each with the comment above it, the media query around it, its old line and the classes nothing draws. A rule moved only when every one of its selectors names a class that no live file mentions, whole or built in a template. A rescan finds none left.
    - They are the old editor, its library, rails, tray and showcase; the wizard; the old Settings page and its mobile sheet; `/chats`; the section drag; and the old Drafting Desk chat input.
- **R11:** `modes.js` still reads homepage-scope rooms, so old records and backups read, as ruled.
- **R35:** the Inter font package and its import in `main.jsx` are gone. Nothing named the font, so nothing on screen changes.
- **`@dnd-kit`:** all four packages left the dependencies (R16, R34). Only files in `src/deprecated/` named it.
- **Exact versions** (C264 (c)): every `^` range in `package.json` is now the version the lockfile had installed, so nothing installed changes. For example, React 19.2.4, Vite 7.3.7, React Router 7.18.4.
- **R31:** `refactor/` stays. `continuation-*.md` and `.pr-body.md` are in `.gitignore`, kept on this computer and never published.
- **The plan's table** now notes each approval and how it was carried out, the stage 6 ones (R1 to R13, R27) included.
- **Found, proposed as R43:** `src/hooks/useShimmer.js`, the old "power-on shimmer", is used by nothing. It is not on any approved line, so it stays until ruled.
- **Tests:** 1,335. Lint: 30 warnings, all older; the moved `exportAllData` imports `initDB` from where it used to live, as other moved files do. The build passes.
- **Tried in the browser** on the trial copy, after a reload: the welcome page, the rooms and the Collection, then `lab:` (the Library, the Canvas and the Blocks board) and `done:`, all drawn as before.
- **Seen in passing:** the board strip shows the Collection's raw id where its name should be. It is older than this piece and offered as a separate task.
  - **Fixed (27 October):** the strip now names the collection as the Collection board's head does ("Collection: Reading list", or "Untitled collection" for one with no name). A collection it cannot find shows nothing after the title. Tried in the browser with a named and an unnamed collection.

**C267. Stage 15, piece 2: the vault, its open points** (proposed 27 October; **ruled 27 October, as suggested: (d) 1, keys moved once over the private channel; (e) 1, the page lends the vault its unlocked key**; C170, C264 (e) as ruled; `research/vault-scope-review.md`). Waiting for Stefan: (d) and (e) are choices; the rest is designed as suggested. The design goes in `research/vault-design.md`; nothing in the app changes in this piece.
- **What exists today:**
  - The gateway (`src/net/gateway.js`) is the one way out. It asks the key module for a provider's key and hands it to that provider's code.
  - The provider's code builds the request and puts the key in a header. Anthropic uses `x-api-key` to `api.anthropic.com`; Mistral uses `Authorization` to its three addresses.
  - Ollama and the sources take no key.
  - Keys are saved encrypted in their own database, or held in the tab's memory ("Don't save").
- **(a) What the vault does: it adds the key, nothing more.**
  - The page builds each request as today, with a stand-in where the key goes, and hands it to the vault.
  - The vault checks the address against that provider's own list, puts the real key in that provider's header, sends it, and passes the reply back as it arrives.
  - Provider code stays on the page, so the vault stays small (a few hundred lines), easy to review and rarely deployed. A change to how Parliament talks to a model never touches it.
  - The other way, all provider code inside the vault, makes the vault large and deployed with every provider change, which defeats keeping it rare and checked.

  **Suggestion:** the vault adds the key.
- **(b) What the vault allows:** for each keyed provider, its origins and the few paths Parliament uses:
  - Anthropic: `/v1/messages` and `/v1/messages/count_tokens`, plus the key check.
  - Mistral: `/v1/chat/completions` and `/v1/models`.

  Anything else is refused and said back to the page. So code on the page can use a key only for what Parliament already does with it, never, for instance, a provider's account or key-management addresses. **Suggestion:** yes.
- **(c) The channel:**
  - One private channel (a `MessageChannel`) between the page and its vault frame. It opens only after each side checks the other's exact address.
  - Messages carry a request, the reply's status, its pieces as they arrive, the end, an error, or "stop". Never a key.
  - Replies come back as pieces in messages rather than as a handed-over stream, which not every browser on the list can pass.
  - The network log stays on the page; the vault reports each request it made, and the page's log shows it as today.

  **Suggestion:** yes.
- **(d) Moving the keys people already have** (a choice). When the vault arrives, saved keys sit in the page's own database.
  1. **Moved once, over the private channel,** then deleted from the page's database. Shown before it runs. A key crosses between the page and its vault once: a narrow exception to "never in a cross-window message", within the third of the four approved exceptions. Code on the page could read those keys before the move anyway, so the move adds no exposure.
  2. **Pasted again:** the vault's panel asks for each key once, and the page's copies are deleted once the vault holds one. No key ever crosses, at the cost of finding each key again.

  **Suggestion:** 1. Few people are affected, and it is the same key either way. 2 is the stricter reading of the rule; say if you prefer it.
- **(e) Lock Parliament and the vault** (a choice). With the lock on, chats are sealed under a key that exists only while Parliament is unlocked. Without help, the vault's keys would stay encrypted only the way they are today, which a copied browser profile can undo.
  1. **The page lends the vault its unlocked key:** the lock's data key goes over the private channel at unlock. It is a key the browser will not let anyone read out, only use. The vault seals the API keys under it, and forgets it when Parliament locks.
  2. **The vault has its own lock,** and you unlock twice.
  3. **The vault ignores the lock;** its keys are encrypted as today.

  **Suggestion:** 1. One unlock, and a copied profile gets nothing, as C170 promised. It needs one more line in the exceptions: the lock's unreadable key may cross to the vault frame, never an API key.
- **(f) The vault's own key panel:**
  - `api:` shows the vault's field inside the key panel, as a frame: the field, Save, "Don't save" and Remove. Everything else in the panel stays on the page (training labels, guides, Ollama).
  - The vault checks a typed key with its provider itself, and tells the page only the outcome (saved, new, not accepted, out of credit, not reached), which the panel shows as today.
  - Its few words come with it; English for now.

  **Suggestion:** yes.
- **(g) Its site and headers:**
  - `keys.parliament.ltd` is a second, small build from this repository (`vault/`), deployed on its own, rarely, with published file hashes.
  - It may be framed only by `https://www.parliament.ltd`.
  - Its policy connects only to the keyed providers.
  - It sends `Origin-Agent-Cluster`, so the two pages can never be merged into one by the browser's old `document.domain` rule.
  - The main site's policy then allows one frame, the vault, and **drops Anthropic and Mistral from its own connections**: the page itself can no longer reach a keyed provider at all.
  - In development, the vault runs on `localhost:5175` beside the app.

  **Suggestion:** yes.
- **(h) When the vault cannot be reached** (blocked, offline, failed to load), keyed models say so on the Enter line before Enter ("the key store did not open"). Local models and sources work as before. **Suggestion:** yes.
- **(i) The one unknown, tried in this piece:** whether a browser keeps the vault's storage when it is only ever opened inside the page's frame, across reloads and tabs. Both addresses are the same site, so it should.
  - Tried here in Chromium on two local addresses, with a different site as the control.
  - The trial pages are kept in `scripts/vault-trial/` so you can run the same check in Firefox, LibreWolf and Zen.

  **Suggestion:** yes.
- **(j) Stored data:** the vault's own database at its own address, holding keys only. With (d) 1, the page's saved keys are deleted after the move, shown first. Nothing in chats or backups changes. **Suggestion:** approve the outline; the move is shown before it is built (piece 3).

**C268. Stage 15, piece 2, as built: the vault designed and its storage tried** (27 October; C267 as suggested where it is not a choice; (d) and (e) wait for Stefan).
- **The design** is `research/vault-design.md`. In short:
  - The vault adds the key and nothing more. Provider code stays on the page and builds each request with a stand-in, `⟨vault:anthropic⟩`, using a `fetch` the gateway gives it. The vault checks the address against its own list, puts the real key in that provider's header, sends it, and passes the reply back in pieces.
  - What the vault allows: Anthropic's `/v1/messages` and `/v1/messages/count_tokens`; Mistral's `/v1/chat/completions` and `/v1/models`; a short list of header names. Anything else is refused.
  - One private channel, opened after each side checks the other's exact address. It carries requests, replies in pieces, "stop", the keys' status (never a key) and a note of each request for the page's network log.
  - The vault's own key field sits inside the `api:` panel as a frame, so a typed key never touches the page; the page learns only the outcome.
  - Headers: the vault may be framed only by the page and sends `Origin-Agent-Cluster`. The page allows that one frame and drops Anthropic and Mistral from its own connections, so the page itself can no longer reach a keyed provider.
  - The wording of the four approved exceptions for CLAUDE.md, added when the vault is built.
  - The order of piece 3's build.
  - Both ways for (d) and (e), marked as waiting.
- **The trial** (`scripts/vault-trial/`, run with `node scripts/vault-trial/server.mjs`): a page on `localhost:5190` framing a vault on `localhost:5191`, the same site and different origins, as `www` and `keys` will be. The control is `127.0.0.1:5190`, a different site. In Chromium:
  - the framed vault kept its value across a reload and in a second tab;
  - opened on its own address, the vault saw the same value, so its storage is not split off for being framed;
  - the control saw nothing, so the check tells the two apart;
  - replies in pieces arrived in order, and a whole stream could be handed across;
  - the browser declined the frame's request to keep its storage. The design says what follows: keys pasted again if the browser clears them; chats unaffected.
- **Not tried:**
  - Firefox, LibreWolf and Zen;
  - closing the browser between write and read.

  The trial pages are kept so these can be run as written on the page.
- **Nothing in the app changed.** The trial is not part of the build; `.claude/launch.json` (local, not in the repository) has a `vault-trial` entry for it.
- **Next:** piece 3, the vault built, once (d) and (e) are ruled.

**C269. Stage 15, piece 3, as built: the key vault** (27 to 28 October; C267 as ruled; `research/vault-design.md`).
- **The vault site** (`vault/`, built with `vite.vault.config.js` into `vault/dist`; `npm run dev:vault` runs it on `localhost:5175`):
  - `allow.js`, its own list:
    - Anthropic `POST /v1/messages` and `/v1/messages/count_tokens`;
    - Mistral `POST /v1/chat/completions` and `GET /v1/models`;
    - five header names.

    It sets the key header itself and ignores whatever the page put there.
  - `store.js`, keys in its own database, `parliament-keys`:
    - each encrypted with AES-GCM under a device key the browser will not let anyone read out;
    - sealed again under the lock's lent key while Lock Parliament is on;
    - "Don't save" held in the frame's memory.
  - `channel.js`, the private channel: requests in, replies back in pieces, "stop", the keys' status (never a key), a note of each request for the page's network log. Status goes before each answer, so the page is never behind.
  - `main.js`, the frame's page: it answers only the page's exact address. Its key field shows only while the page lays the frame over the key panel.
  - About 15 kB of plain, unminified script, to be read and checked.
- **The page's side:**
  - `src/net/vaultClient.js` opens the frame and the channel. It turns a provider's fetch into a vault request and the pieces back into an ordinary reply.
  - The gateway is unchanged: it now gets the stand-in `vault:saved` where it got a key.
  - Anthropic's and Mistral's code send through the `fetch` they are given (`_fetch` in `base.js`). Ollama and the sources go straight out as before.
  - **Checking a typed key:** the page builds the provider's own check as today, with `vault:typed` where the key goes. The vault sends it with the typed key. The page judges the answer and tells the vault to keep it, saved or held, or let it go.
- **The key panel:** where the field was, an empty slot. The vault's frame is laid over it, in its own matching style, only while the slot is wholly in view. The page passes the field its few words (label, placeholder, Save, checking), so the vault needs no copy table of its own: a small departure from the design, which had it carry them. Save and Escape in the vault's field reach the panel as before.
- **The move of existing keys (C267 (d)), as it runs at the live switch:**
  - When Parliament opens, the page reads each key it kept the old way, saved in `parliament-keystore` (or held in the tab). With Lock Parliament on, this happens after unlocking.
  - It sends each key to the vault, once, over the private channel. The vault keeps it as it was kept, saved or held, unless it already holds a key for that provider; then the vault's stays.
  - Only after the vault confirms is the page's copy deleted.
  - A move cut short leaves the page's copy, and the next start finishes it. Nothing else in either database changes, and backups never held keys.
- **The lock (C267 (e)):**
  - Unlocking lends the vault the data key, and the vault seals its keys under it.
  - Locking takes it back; turning the lock off has the vault open its keys first.
  - Tried in tests; not tried in the browser with a lock on.
- **Delete everything** asks the vault to delete its database first.
- **If the vault cannot be reached** (C267 (h)): after 8 seconds, the key panel says "the key store did not open; reload to try again". A prompt to a keyed model says "… the key store did not open, so no key can be used. Reload to try again; models on this computer and sources still work". Local models and sources work.
- **Headers:**
  - The page now allows one frame, `https://keys.parliament.ltd`. Its own connections drop Anthropic and Mistral, so the page itself can no longer reach a keyed provider.
  - The vault's headers live in `vault/netlify.toml` (its own policy, `frame-ancestors https://www.parliament.ltd`, `Origin-Agent-Cluster`). They equal `VAULT_HEADERS` in `securityHeaders.js`, and its connections equal the vault's own list, both held by tests.
  - The list (`src/net/list.js`) gives the page's origins and the vault's apart.
- **CLAUDE.md** carries the four approved exceptions, with the move and the lent key named in the third.
- **`npm run check`** now also builds the vault.
- **Tests:**
  - **The vault:** its list, the store (held and saved, sealed and opened under a lent key, erased) and the channel (the key added and never sent back, refusals, the typed key, the move).
  - **The page with the vault:** the client joined to the vault's real channel code, a reply passed back whole, a refusal, the typed check, stop, and no frame at all.
  - **The headers and the list;** the prompt line when the vault did not open.

  1,350 tests.
- **Tried in the browser,** the trial copy on `localhost:5174` and the vault on `localhost:5175`:
  - The vault's frame mounted at start.
  - `api:anthropic` showed the vault's field laid exactly over the slot, matching. Save on an empty field came back "Paste the key first". Escape in the vault's field closed the panel and put the frame away.
  - **The move:** a made-up value planted in the page's old store moved into the vault after a reload. The panel then showed it ("ends MOVE"), and the page kept no copy. It was then removed.
  - With the vault's server stopped, both keyed providers said the key store did not open.
  - Before building on it, the trial showed Chromium lets a lent key that cannot be read out reach the vault and be used there.
- **Not tried,** for the live site and your keys:
  - a real key checked and a real reply streamed through the vault;
  - the lock with the vault in a browser;
  - the vault under its real headers on its own address;
  - Firefox and the other browsers.
- **Not part of this piece:**
  - deploying the vault, its tagged releases and published hashes (piece 7);
  - the outside review (once public).

  Locally, `vite preview` of the app still points at `keys.parliament.ltd`; piece 4 sets it to the local vault for the policy trials.

**C270. Stage 15, piece 4: the policy tightened, its open points** (proposed 28 October; C264 as ruled; `research/security-audit.md` §1, §3; T-items in the security notes). Built as suggested, so a ruling changes one entry. Tried here under the real headers, with `vite preview`, and then on the live site from the testing list (C264 (f), changed to 2).
- **What exists today:**
  - The page's policy allows styles from the site plus `'unsafe-inline'`, and images from the site plus `data:`. It names the vault as its one frame (C269). Trusted Types are not asked for.
  - The audit found nothing in the built app that needs inline styles or `data:` images. It found three things that Trusted Types would stop, none in Parliament's own code:
    - the markdown reader's way of decoding `&amp;` and the like;
    - the service worker's registration;
    - the service worker's own loader.
  - Since the audit, two more such places: the spreadsheet reader's and the source checker's workers, started from a URL.
- **(a) Styles from the site only:** `style-src 'self'`, no `'unsafe-inline'`.
  - React, the animations and Parliament's own code set styles through the browser's style properties, which the policy does not touch.
  - The development-only screens that write a `<style>` are not in the built app.
  - Popped windows take their styles as links to the built stylesheet already.

  **Suggestion:** yes.
- **(b) Images from the site only:** `img-src 'self'`, no `data:`. Remote images are never loaded already; nothing uses a `data:` image. **Suggestion:** yes.
- **(c) Trusted Types, for the page itself:**
  - The browser refuses to turn text into HTML or into a script's address anywhere on the page, unless Parliament's own short policy says yes. Any slip that would let a reply's text run as code is stopped by the browser, not only by care.
  - The rule goes in a tag inside the page (`<meta http-equiv="Content-Security-Policy">` in `index.html`), not in the header. That way the service worker and the two workers, which load their own scripts in ways the rule would stop, are not covered, while every page and popped window is.
  - Supported in Chrome and Edge, Safari 26 and Firefox 148; a browser without it ignores the tag and is as safe as today.

  **Suggestion:** yes.
- **(d) Parliament's one policy** (`src/lib/trustedTypes.js`, loaded before anything else):
  - It lets a script's address through only when it is one of this site's own built files: `/assets/…js`, or `/sw.js`.
  - It refuses all HTML and all script text.
  - It is named `default`, so the few libraries that hand the browser a plain address, for workers and the service worker, pass through it; the tag allows no other policy.

  **Suggestion:** yes.
- **(e) The markdown reader's entity decoder** is pointed at its plain build, which decodes `&amp;` from a table rather than through HTML. So markdown never comes near the browser's HTML parser. **Suggestion:** yes.
- **(f) The vault too:**
  - Its page gets the same tag, with no policy at all (`trusted-types 'none'`), since its code has nothing to pass.
  - Its policy already allows nothing inline and no images.

  **Suggestion:** yes.
- **(g) Trying it here, under the real headers:**
  - `vite preview` serves the built app with the page's headers and the built vault with the vault's. Each is told the other's local address (`localhost:4173` and `localhost:5176`) by one setting, so the trial is exactly the live arrangement on two local addresses.
  - **Tried:**
    - the welcome page;
    - rooms and markdown with `&amp;` in it;
    - editing a reply, pasting into it, copying from it;
    - Records, the Collection, the Plan board and a chart;
    - a spreadsheet read in its worker;
    - the service worker;
    - a popped window;
    - the key panel with the vault's field;
    - the console, for anything the policy refused.

  **Suggestion:** yes.
- **(h) Not added:** `upgrade-insecure-requests`, which could interfere with Ollama on `http://localhost:11434` (audit §1). **Suggestion:** leave it out.
- **(i) Stored data:** none.

**C271. Stage 15, piece 4, as built: the policy tightened** (28 October; C270 as suggested).
- **The page's policy** (`securityHeaders.js`, `netlify.toml`, kept equal by the test): `style-src 'self'` and `img-src 'self'`. `'unsafe-inline'` and `data:` are gone. The frame allowed is the vault's (C269).
- **Trusted Types,** in a tag placed first in each built page's head by the build (`vite.config.js`, `vite.vault.config.js`), not in development:
  - the page: `require-trusted-types-for 'script'; trusted-types default`;
  - the vault: the same with `trusted-types 'none'`.

  Not in the header, so the service worker and the workers load as before.
- **The policy** (`src/lib/trustedTypes.js`, loaded first by `main.jsx`): a script's address only when it is one of this site's own built files, `/assets/…js` or `/sw.js`. Never HTML, never script text. Named `default`, so the service worker's registration and Vite's worker loaders pass through it.
- **The markdown reader's entity decoder** is pointed at its plain build (`resolve.alias`): `&amp;` is decoded from a table, never through the HTML parser. The built bundle carries the table and not the HTML version.
- **Left as they are, checked:**
  - **The editor's own clipboard parser** (ProseMirror's) writes HTML, but the editor never reaches it: paste is read as plain text by Parliament's own handler, and drop is off (C210 (i)). Were it reached, the policy would refuse it, and the paste would fail rather than parse HTML.
  - **React's internal HTML writes** are only for features Parliament does not use.
- **A local trial under the real headers** (C270 (g)): `node scripts/policy-trial.mjs` builds both sites, each told the other's local address, and serves them with `vite preview`. The app is on `localhost:4173`, the vault on `localhost:5176`. `trialHeaders()` swaps the addresses, and the headers are otherwise the deployed ones.
- **Tests:**
  - the policy (own scripts only; HTML, script text, other sites' addresses, `data:` and `javascript:` refused; one `default` policy, made once);
  - the page's policy without `'unsafe-inline'` or `data:`;
  - both tags;
  - the trial's address swap.

  1,353 tests.
- **Tried in the browser,** under the real headers on `localhost:4173` and `localhost:5176`, after clearing an old service worker left on that port:
  - The built page carried its tag, the policy was in place, and the service worker registered through it. The vault's frame mounted.
  - A question went to Wikipedia; the answer came in a room, its page and text drawn.
  - A word in the reply was struck in place. A paste went in as plain text; the HTML it carried was ignored, and the script planted in it never ran.
  - This site's spreadsheet worker started. A worker from another site, HTML written from text and a foreign script address were each refused, with Parliament's own words. A style attribute set from script was not applied: the style rule at work.
  - `api:anthropic` showed the vault's field laid over the slot, the vault reached through the frame under both policies ("needs a key", not "did not open").
  - The vault's own page carried its tag, its stylesheet from itself, and nothing in its console.
  - Throughout, nothing else was refused.
- **Not tried:**
  - copying from a reply (the automated Ctrl+C did not reach the page as a real copy);
  - a chart in a reply;
  - a spreadsheet actually read;
  - a popped window (the in-app browser opens none);
  - Firefox and Safari.

  These are on the live testing list, with the console open.

**C272. Stage 15, piece 5: the words, its open points** (proposed 28 October; **ruled 28 October: (a) 1, the letter's first sentence; the rest as suggested**; C264 as ruled; `privacy-copy-draft.md`, reviewed 12 October; C265; `browsers.md`; C94). Waiting for Stefan: (a) is a choice. The rest is built as suggested, so a ruling changes one entry.
- **What exists today:**
  - The privacy draft is applied in Settings and the network card.
  - The README and SECURITY.md still describe the old app.
  - The manifest says "a power-user chat interface for Claude".
  - There is no verb reference, no changelog, and nothing in Settings says what this browser can do.
  - The draft was written before the vault (C269), so a few of its sentences about keys are no longer quite true, in both directions.
- **(a) The one line that says what Parliament is** (a choice). It is used in Settings' About, the app's manifest (what a phone shows when Parliament is installed) and the README's first line. Today it reads "A place to work with AI on your own terms". You said you were not sure Parliament can say "on your own terms".
  1. **Your letter's first sentence:** "Parliament is an attempt to rethink how we interact with AI." In the manifest, without its name: "An attempt to rethink how we interact with AI."
  2. **Keep** "A place to work with AI on your own terms".
  3. **A line of your own.**

  **Suggestion:** 1. It is yours already, and it says what the letter goes on to explain.
- **(b) The sentences the vault changes,** shown before and after; the rest of the draft is applied as reviewed.
  - **Settings, "Keys are encrypted on this device"** becomes "Keys are kept in Parliament's key vault":
    - Was: "Each key is encrypted before it is stored, is sent only to its own provider, and is never put in a backup. Encryption protects a key on disk. It cannot protect against code running inside the page, so Parliament loads no code from anywhere else."
    - Becomes: "Each key is kept by Parliament's key vault, a small page of its own at keys.parliament.ltd, encrypted, and is sent only to its own provider, never put in a backup. Code running on Parliament's page cannot read a key; it can only ask the vault to send to a provider on its list. Parliament loads no code from anywhere else."
  - **"The app itself":** "from parliament.ltd" becomes "from parliament.ltd and keys.parliament.ltd". The rest stands.
  - **The key panel's line:** "Encrypted in this browser. Each goes only to its own provider." becomes "Kept in the key vault, encrypted, in this browser. Each goes only to its own provider."
  - **Save's line:** "…then keeps it encrypted in this browser" becomes "…then the key vault keeps it, encrypted, in this browser".
  - **SECURITY.md draft 4** (the encryption key) gains the vault in the same words.
  - **SECURITY.md draft 6:** "the page can connect only to itself and to the providers and sources listed" becomes "the page connects only to itself, a model on your own machine and the sources listed; providers that take a key are reached only through the key vault, which connects to nothing else".

  **Suggestion:** yes.
- **(c) The README:**
  - the line from (a);
  - what Parliament is: boards, the bar, rooms built from blocks, sources without AI first;
  - draft 1 and "What leaves your device";
  - the key vault in two sentences;
  - running it on your own computer (`npm install`, `npm run dev`, `npm run dev:vault`);
  - links to the verb reference, SECURITY.md, the browser table and the changelog; the MIT licence.

  No mention of anything not yet true. The contributing guide comes with piece 6. **Suggestion:** yes.
- **(d) SECURITY.md:**
  - drafts 2 to 9, with (b);
  - a section on the key vault and its four exceptions;
  - Trusted Types (C271);
  - both sites' policies, written into it from `securityHeaders.js` by a script, with a test that fails when they differ;
  - reporting privately through GitHub's Security tab or support@parliament.ltd. The tab works once you switch on private reporting, at going public.

  **Suggestion:** yes.
- **(e) The verb reference,** `docs/verbs.md`, written from the registry: every verb with its example, its forms, what it does in its own words, the boards it works on, and whether `undo:` takes it back, grouped as the `?` reference groups them. A test fails when it is out of date; `npm run reference` writes it and the policy block together. **Suggestion:** yes.
- **(f) "This browser" in Settings,** a section in About, from feature detection, naming no browser (C94):
  - Each thing Parliament uses, with "works here" or what happens instead: a window that stays on top; windows on other screens; keeping your data; voice on this device; passkeys for the lock; compressed backups; tabs telling each other what changed; Trusted Types.
  - `browsers.md` stays the full table, linked from the README.

  **Suggestion:** yes.
- **(g) The changelog:**
  - `CHANGELOG.md` in plain words, newest first. Its first entry is the refactor, as version 0.5.0 (the version Parliament already gives Wikipedia), dated at the switch.
  - The build writes the newest entry to `/changelog.json`, which the service worker does not keep. When a new version is waiting, the update notice fetches it and shows its lines above "reload". So the notice says what the new version brings, not what the running one did.
  - `package.json` goes to 0.5.0.

  **Suggestion:** yes.
- **(h) The network log's comment** in `networkLog.js` ("only Anthropic's API is contacted") is corrected. **Suggestion:** yes.
- **(i) Stored data:** none.

**C273. Stage 15, piece 5, as built: the words** (28 October; C272 as suggested, (a) built as its suggestion 1 until ruled).
- **The line that says what Parliament is:** "Parliament is an attempt to rethink how we interact with AI." It appears in Settings' About and the README; the manifest has "An attempt to rethink how we interact with AI. No accounts, no servers. Your work is stored in your browser." If C272 (a) is ruled otherwise, these three places change.
- **The vault's sentences** (C272 (b)), as shown there:
  - "Keys are kept in Parliament's key vault" and its paragraph;
  - "The app itself" naming both addresses;
  - the key panel's line and Save's line.
- **README.md, rewritten:**
  - what Parliament is: boards, the bar, rooms, sources before AI, taking part;
  - "What leaves your device";
  - the vault in two sentences;
  - who it can talk to;
  - running it locally;
  - links;
  - the licence.
- **SECURITY.md, rewritten:**
  - drafts 2 to 9;
  - the vault and its four exceptions;
  - Lock Parliament;
  - the policy block for both sites and their Trusted Types tags, then the policy in words, and Trusted Types;
  - backups;
  - what we don't do;
  - private reporting through the Security tab or support@parliament.ltd.
- **Written from the code** by `npm run reference` (`scripts/write-reference.mjs`):
  - `docs/verbs.md`, every built command by the `?` reference's groups, with its forms, what it does, where it works and whether `undo:` takes it back, then those named but not built yet (`resources:`, `rewrite:`). From `src/commands/referenceDoc.js`.
  - SECURITY.md's policy block, between its markers. From `src/lib/policyDoc.js`.

  `src/lib/generatedDocs.test.js` fails when either is out of date.
- **This browser** (Settings, About): eight things Parliament uses, each "Works here." or what happens instead, found by trying each one (`src/shell/thisBrowser.js`), naming no browser:
  - a window that stays on top;
  - boards on other screens;
  - asking to keep your data;
  - voice on this device;
  - passkeys for the lock;
  - smaller backups;
  - tabs telling each other what changed;
  - a check on turning text into HTML.

  Settings' search finds it by "browser".
- **The changelog:**
  - `CHANGELOG.md`, its first entry "0.5.0, not yet released", eight lines; `package.json` is 0.5.0. The heading takes its date at the switch.
  - The build writes the newest entry to `/changelog.json`. When a new version is waiting, the update notice fetches it (`waitingVersionNotes` in `src/net`, a request to this site's own file) and shows its first four lines, as text, above "reload".
- **The network log's comment** no longer says only Anthropic is contacted.
- **Tests:**
  - the two generated documents;
  - the changelog (the newest entry, the notice's lines, the file's entry for this version, no em dashes);
  - This browser (none and all, a failed voice check);
  - the copy rules, which now know "HTML".

  1,359 tests.
- **Tried in the browser,** on the trial copy: Settings' About showed the new line and the vault's paragraph. This browser said "Works here." for seven things, and for voice, "Voice is off: here it would mean sending your audio away".
- **Not tried:** the update notice with the changelog's lines, which needs a second deploy to show; it is on the live testing list.

**C274. Stage 15, piece 6: ready for the public, its open points** (proposed 28 October; **ruled 28 October: (b) 1, git's own filter-branch, no download; the rest as suggested**; C71; C264 (h) 1 and (i) as ruled). Waiting for Stefan: (b) is a choice. The rest is built as suggested. Nothing is pushed in this piece.
- **What the history holds** (a sweep of every commit, 28 October):
  - **753 commits on this branch.** Your personal address is the author on 455 and the committer on 294; the rest use the no-reply address, or GitHub's own for merges. Commit messages hold none.
  - **Your full name** appears only inside the logos' file details: all four versions of three images (`parliament_logo.png`, `flight_logo.png`, and an older `logo.png` deleted in October but still in the history). Each names you in full as its author and carries the Canva document, user and brand ids the images were made with.
  - Elsewhere your surname appears only inside your handle, Solofsson25, which stays.
  - **No key, private key or `.env` file** in any version; the key-like strings are test placeholders.
  - The three stashes on this computer are not part of any branch and do not go.
- **(a) The copy:**
  - A fresh clone of this repository in a folder beside it, `C:\Users\stefan\Desktop\parliament-public`, with `main` moved up to this branch's latest commit (`main` has nothing this branch lacks) and every other branch and tag left out.
  - Only the copy is rewritten. This repository stays as it is, the private archive.

  **Suggestion:** yes.
- **(b) How the history is rewritten** (a choice; C264 (h) named `git-filter-repo`, downloaded on your yes).
  1. **With git's own `filter-branch`,** already on this computer: no download. Slower (a few minutes for 753 commits) and older, but enough for two plain changes.
  2. **With `git-filter-repo`,** the tool most people use now, downloaded from its project (a Python script). It needs Python, which is not on this computer, so it is two downloads.

  **Suggestion:** 1. Nothing to install, and the check in (d) proves the result either way.
- **(c) What the rewrite changes, and nothing else:**
  - every author and committer address that is your personal one becomes `200635734+Solofsson25@users.noreply.github.com`; names stay as they are;
  - every version of the three images loses its file details: the text the image carries beside the picture. The picture stays byte for byte as it was (`scripts/png-text.mjs`, written for this);
  - the current images in this repository lose them too, by an ordinary commit, so the live site no longer serves them.
  - Your first name stays in the spec documents, as ruled.

  **Suggestion:** yes.
- **(d) The check after it:** on the copy, every commit is searched for your personal address, your surname outside your handle, the images' author and Canva ids, keys and `.env` files. The copy's newest commit must hold exactly the same files as this branch (the same tree, image details aside). The result is written in the as-built entry. **Suggestion:** yes.
- **(e) Commit ids quoted in documents:** CLAUDE.md's archive pointers and the spec's mentions of commits change with the rewrite.
  - On the copy only, one commit maps each old id to its new one.
  - An id from a branch that does not go public (the September and V1 archives) is said to be in the private archive, not given a new id.

  **Suggestion:** yes.
- **(f) Two guides:**
  - **`CONTRIBUTING.md`:** how to propose a change, run `npm run check`, keep to the hard constraints, and that the spec and its rulings decide.
  - **`docs/blocks.md`:** how a block is built (its entry, its settings, what it may and may not touch), and that blocks arrive by pull request and ship after review.

  **Suggestion:** yes.
- **(g) What GitHub reads:**
  - `SECURITY.md` (rewritten in piece 5) becomes the Security tab's policy.
  - `.github/workflows/check.yml` runs `npm run check` on every pull request and every push to `main`.
  - `.github/workflows/scorecard.yml` runs OpenSSF Scorecard weekly and on pushes to `main`; it only reports, on GitHub.
  - Both workflows read only, and use actions pinned to exact commits.
  - No automatic dependency pull requests: versions are pinned and updated by hand (C264 (c)). GitHub's security alerts are a setting you can switch on.

  **Suggestion:** yes.
- **(h) A release** (`scripts/release.mjs`):
  - it runs the check, builds the app and the vault, and packs each into its own archive;
  - it writes `SHA256SUMS` for the archives and every file of the vault (its published hashes, C170);
  - it tags the version locally.
  - With `--push`, run only on your yes in piece 7, it pushes `main` and the tag to GitHub and to Bitbucket together (C264 (i)).

  **Suggestion:** yes.
- **(i) Stored data:** none.

**C275. Stage 15, piece 6, as built: ready for the public** (28 October; C274 as ruled, (b) 1; **ruled 28 October: (a) 2, the logos' Content Credentials and EXIF removed too; (b) 1, the birds mark's removed too**). Nothing is pushed.
- **The logos, cleaned here:** the current `public/parliament_logo.png` and `src/deprecated/public/flight_logo.png` no longer carry their text (the author's full name, the XMP block and the Canva document, user and brand ids), nor, by (a), their Content Credentials and EXIF block. The picture is unchanged, byte for byte, and each file is about 17 KB smaller. `scripts/png-text.mjs` lists or removes all three.
- **Two guides:**
  - `CONTRIBUTING.md`: an issue first for anything larger than a fix; the spec and its rulings decide; the rules every change keeps; `npm run check`; security problems reported privately, as SECURITY.md says.
  - `docs/blocks.md`: what a block is, its entry and settings, what it may and may not touch, and that blocks arrive by pull request and ship after review.
- **What GitHub reads:**
  - SECURITY.md, rewritten in piece 5, is the Security tab's policy.
  - `.github/workflows/check.yml` runs `npm ci` and `npm run check` on every pull request and every push to `main`.
  - `.github/workflows/scorecard.yml` runs OpenSSF Scorecard every Monday and on pushes to `main`, and publishes its report to the OpenSSF. It changes nothing.
  - Both read only; Scorecard also asks GitHub for the token it publishes with. Every action is pinned to an exact commit, its release named beside it.
  - No automatic dependency pull requests (C264 (c)).
- **The release,** `scripts/release.mjs`: it runs the check, builds the app and the vault, and packs each into `release/<version>/`, which is not tracked. It writes `SHA256SUMS` with each archive and every file the vault serves (C170), then tags the version here. `--dry` stops before the tag. `--push`, only on your yes in piece 7, pushes `main` and the tag to GitHub and Bitbucket together. A dry run passed.
- **The public copy,** `scripts/public-copy.mjs`, with git's own `filter-branch`, as ruled:
  - It clones this branch to `C:\Users\stefan\Desktop\parliament-public` as `main` alone, with no remote, other branch or tag, and rewrites only the clone. This repository is not touched.
  - It names nothing it removes. The personal address is read from the history; the full name and the Canva ids from the old logos' own text.
  - What it changes: a personal address on a commit becomes the no-reply one; every version of every image loses its text, its EXIF block and its Content Credentials; in every version of every text file, the full name or the surname on its own becomes the first name, a personal address (also when written as a search pattern) the no-reply one, and a Canva id the word "removed".
  - A safety stop: it works out every change first, and rewrites nothing if more than 50 text file versions would change. `--plan` lists the changes and stops.
  - Then one commit on the copy brings the commit ids quoted in the documents into line with the new history. An id of a commit that stays private keeps its id and is marked "in the private archive", never inside a piece of code.
  - Then the sweep: every commit and every version of every file, in any case, with backslashes ignored, and each image's every byte as well as its text. No version of an image may keep any file detail.
- **The copy, as made** from this branch once (a) and (b) were built, so it holds this entry as it stood before their rulings were recorded:
  - Found in the history: one personal address, one full name, four Canva ids.
  - Changed: ten file versions.
    - Six are of the logos: every version of the three images that carried any detail (`public/logo.png` was deleted in October). The copy keeps four image versions, since cleaned versions of one logo are often the same file. Each carries only its picture and its size.
    - Three are text: two versions of this file, which quoted the full name while C274 was proposed and ruled, and the first version of the script, which held the address as a search pattern.
    - One is the birds mark's only version, which loses its Content Credentials by (b).
  - 769 commits, each with the no-reply address as author and committer, or GitHub's own as the committer of 161 made on its website (132 of them merges). The dates are kept, so making the copy again gives the same ids.
  - Its files are this branch's, exactly, apart from its last commit, the ids.
  - Commit ids: 24 now follow the public history, CLAUDE.md's three archive pointers among them (the V1, V2 and September commits are all on this branch, so all three go public). 11 mentions of five commits, on `refactor/main` and the parked PR-50 branch, are marked "in the private archive".
  - The sweep: 769 commits and 4,620 file versions; nothing found.
  - A second search, written apart from the script, read every object's raw bytes: the address, the full name, the middle name and the four ids appear nowhere, and the surname only inside the handle. A listing of every image version, PNG and SVG, found no file detail left.
  - Neither search can read inside a compressed archive or base64. The eight `.tgz` files in `vendor/` (ProseMirror and SheetJS, kept by C72 and C210 (e)) were unpacked and searched apart, with nothing found. The one base64 block is in (b).
- **On the way, and fixed:**
  - The first run's sweep found that the script itself held the address and the Canva ids, and that C274 quoted the full name. The script was rewritten to name nothing and to clean text files too.
  - Two runs stopped on small bugs before writing anything.
  - One misread a lone space in the logos' text as a full name, and would have removed every space from every text file. It was stopped before it finished. Since then a full name is two words or more, the safety stop and `--plan` exist, and the no-reply addresses are known.
  - The run in the night of 28 October passed its own sweep, but two things were missing. Ids of commits that stay private were not marked, and a search outside the script found the address in the script's first version, written as a search pattern, which neither the rewrite nor the sweep had recognised. Both were fixed, the sweep made stricter, and the copy made again.
  - That copy was clean, but kept the logos' Content Credentials. Once (a) was ruled the copy was made again, and once more after (b).
- **Eight folders beside the repository,** kept because the script deletes nothing: `parliament-public.first-try` to `parliament-public.seventh-try`, and `parliament-public-plan`, about 380 MB in all. Each is an earlier attempt, none needed for reference: what they hold is in this repository or made again by the script. The first five and the plan's still hold the personal address somewhere, in their history or in one old file; the sixth holds the logos' Content Credentials, the seventh the birds mark's. None is ever published. **On your yes, 28 October, all eight went to the Recycle Bin,** where they can be restored until it is emptied, which is yours to do. `parliament-public`, the copy, stays.
- **For piece 7:** the copy lags this branch by the commits made since. Just before the push it is made again from this branch's newest commit, the earlier copy moved aside first. So the public history holds everything up to then, with the same ids for what is already there, and the sweep runs again.
- **Tests:** 1,359. Lint: 30 warnings, all older. The build passes. The copy's files differ from this branch only in the commit ids of ten documents, which no test reads.
- **Not tried:** the two workflows, which run only on GitHub, and `--push`. Both come in piece 7.
- **Stored data:** none.
- **(a) The logos' Content Credentials** (a choice). Besides the text, every version of the two current logos carries two blocks the rewrite leaves; the older `logo.png` carries only the second:
  - **Content Credentials (C2PA):** a note Canva signs and adds to what it makes, about 17 KB. It says the image was created with "Canva AI" and is a composite that includes AI-generated material, with Canva's certificates and the signing date in March 2026. It names no one and holds none of the ids.
  - **EXIF:** 180 bytes of version numbers.

  1. **Keep them.** Anyone can check that the logos were made with an AI tool, which suits a project about AI, and they name no one.
  2. **Remove them** from every version, as the text was. Each image gets about 17 KB smaller, and the record of how it was made goes.

  **Suggestion:** 1. If 2, the rewrite removes them, this repository's logos lose them by a commit, and the copy is made again.

  **Ruled 2, and built:**
  - `png-text.mjs` removes both blocks with the text, so the rewrite does too.
  - This repository's two logos lost them by a commit. Every version had an orientation of normal or none, so nothing on screen turns.
  - The sweep fails if any version of an image keeps any of them.
  - The copy was made again.
- **(b) The birds mark's Content Credentials** (a choice). Parliament's mark, `docs/spec/parliament-birds.svg`, carries Content Credentials too, in base64 inside its `<metadata>`, so neither search could read them. Decoded, they were checked apart. The file has one version, from 21 October.
  - They are a note Anthropic signs, about 6 KB, added by its file tools when Claude provided the file. It says Claude provided the file at a user's request and may have made or changed it. It names no one and holds none of the ids.
  - The mark the app draws, `src/chrome/BirdsMark.jsx`, is made from the drawing alone and carries none of it.
  - The image cleaning reads PNGs only, so (a) does not reach this file.

  1. **Remove them,** as for the logos. The rewrite takes the `<metadata>` block out of that version, this repository's file loses it by a commit, and the copy is made again. The drawing is unchanged.
  2. **Keep them.** They say openly that Claude made the file, as the commits' co-author lines already do.

  **Suggestion:** 1, to match (a).

  **Ruled 1, and built:**
  - `scripts/svg-details.mjs` lists or removes an SVG's Content Credentials. The rewrite removes them from every version of every SVG.
  - This repository's birds mark lost them by a commit, from 8,832 bytes to 1,058. Only the `<metadata>` block and its namespace went; the drawing is the same, character for character.
  - The sweep fails if any version of an SVG keeps a `<metadata>` block or any C2PA.
  - The copy was made again.

**C276. Stage 15, piece 7: going public, its steps and open points** (proposed 28 October; **ruled 28 October, as suggested: (a) 1, the organization `parliament-ltd`; (b) yes; (c) yes; (d) 1, auto publishing locked; (e) all; (f) yes**; C264 (e), (g), (i), (j) and (k) as ruled; C275; the live testing list). Nothing is pushed, linked or deployed without your yes at that step, and the push cannot be taken back.
- **What exists today:**
  - This repository is private on GitHub (`Solofsson25/project-apollo`). Netlify's site `project-apollo-v1` builds its `main`, which is Parliament as it was before the refactor. This branch has never been pushed.
  - The public copy (C275) is clean, with `main` only and no remote. It lags this branch by the commits made since it was made.
  - Version 0.5.0. The changelog's heading says "0.5.0, not yet released"; it takes its date at the switch (C273).
  - The vault's site is configured in `vault/netlify.toml`, framed only by `https://www.parliament.ltd`, and the page frames only `https://keys.parliament.ltd`. Neither the vault's site nor its DNS record exists yet.
  - Nothing pins the Node version Netlify builds with. The check runs on Node 24, here and on GitHub.
  - Two finished fixes sit on branches of their own: the narrow room's mark, "Go to The Study" becoming "Go to Parliament's start" (`claude/bold-booth-2e563d`), and the board strip naming the collection rather than its id (`claude/strip-collection-name`). The first conflicts only in the generated translation files, which `npm run i18n` writes again; the second merges cleanly.
  - Git signs in through Git Credential Manager, which opens your browser the first time it meets a host.
  - The upgrade screen offers each person a backup file before their data is upgraded, and a failed upgrade rolls itself back. Once upgraded, data cannot be opened by the old version.
- **The steps,** in order, each on your yes:
  1. **Ready here** (me):
     - the two fixes merged, as (b) rules; Node pinned, as (c) rules; the changelog's heading dated the day of the switch;
     - `npm run check`, and a commit;
     - the copy made again from this branch's newest commit, at `C:\Users\stefan\Desktop\parliament` (f), with both searches;
     - in the copy, `npm ci` (packages from npm, at the lockfile's exact versions) and `node scripts/release.mjs`: the check, both builds, both archives, `SHA256SUMS`, and the tag `v0.5.0`.

     Nothing leaves this computer.
  2. **Two empty repositories** (you): `parliament` on GitHub, public, under the owner (a) chooses, with nothing in it (no README, licence or `.gitignore`), so the push lands as it is; and `parliament` in the Bitbucket workspace `parliament-ltd`, public, also empty.
  3. **The push** (me, on your yes): the copy gets the two remotes, and `node scripts/release.mjs --push` sends `main` and `v0.5.0` to both. Git Credential Manager asks you to sign in to each, in your browser, the first time. This cannot be taken back.
  4. **GitHub's settings** (you), listed in (e). Then a GitHub release for `v0.5.0` with the two archives and `SHA256SUMS` attached, which publishes the vault's hashes (C170). I check that the two workflows ran.
  5. **The vault's site** (you, step by step, with me checking):
     - a new Netlify site from the public repository, with base directory `vault`;
     - its custom domain `keys.parliament.ltd`, and at deSEC a CNAME from `keys` to the site's `netlify.app` name;
     - its certificate, issued by Netlify.

     I check that the vault answers with its own policy. It comes before the switch, since the new page sends keyed requests only through it.
  6. **A backup** (you) on the old site: Settings, export, kept somewhere safe.
  7. **The switch** (you, step by step):
     - On `project-apollo-v1`, auto publishing is locked (d), then the site is linked to the public repository's `main`.
     - Netlify builds it, and the build waits. You open it at its own address, then publish it, and `parliament.ltd` serves the new Parliament.
     - Each person's data is upgraded once, at their next visit, after the screen that offers a backup.
     - Undoing it is one click, publishing the previous build, but anyone whose data was upgraded cannot open the old version. Their backup restores in the new one. So undoing is for the first minutes only.
  8. **After it:** the live testing list, its "Stage 15" and "After the switch" sections first. `docs/hosting.md` records the repository, the vault's site and its record. Work continues as (f) says.
- **(a) The owner of the public repository** (a choice).
  1. **An organization, `parliament-ltd`,** free, with you as its owner, matching the Bitbucket workspace: `github.com/parliament-ltd/parliament`. The project is not tied to your personal account, and handing it on later means adding an owner, not moving the repository. Netlify is given access to the organization's repository when the site is linked.
  2. **Your account:** `github.com/Solofsson25/parliament`. Nothing to set up.

  Either way the commits show your handle, as C274 ruled, unless you rename the account before the push. **Suggestion:** 1.
- **(b) The two fixes,** merged into this branch before the final copy, the translation files written again, with the check, so they ship in 0.5.0. Otherwise they land later as ordinary commits on the public repository. **Suggestion:** yes.
- **(c) Node 24 for both sites:** `NODE_VERSION = "24"` in both `netlify.toml` files, as the check uses. **Suggestion:** yes.
- **(d) Netlify publishes only what you publish** (a choice; C264 (j), "deploy only from tagged releases").
  1. **Auto publishing locked** on both sites. Every push to `main` still builds, at its own address, but a site changes only when you press "Publish deploy" on a release's build. One click per release, the build can be looked at first, and going back is publishing an earlier one.
  2. **A `release` branch** as each site's production branch, moved to each tag by `release.mjs --push`. Automatic, but one more branch, and nothing to look at before it is live.

  On a build's own address, the keyed providers do not answer, since the vault is framed only by `www.parliament.ltd`; everything else can be tried there. **Suggestion:** 1.
- **(e) GitHub's settings at going public,** each yours to switch, from your action steps and C264 (j):
  - private vulnerability reporting, so SECURITY.md's way of reporting works;
  - a ruleset on `main` that blocks force pushes and deletion;
  - secret scanning, with push protection;
  - Dependabot alerts on, its automatic pull requests off (C264 (c));
  - CodeQL's default setup, which runs on GitHub and only reports;
  - release immutability, switched on before the `v0.5.0` release is made;
  - the description, "An attempt to rethink how we interact with AI.", and the website, `https://parliament.ltd`.

  **Suggestion:** all of them.
- **(f) Where work continues after the push:** in the public repository's folder, `C:\Users\stefan\Desktop\parliament`. This folder stops changing.
  - Why: making the copy again replaces its last commit, the one for the ids. The public `main` would then no longer follow from what was pushed, and only a force push could send it.
  - Claude's notes for this project and the local `.claude` settings are copied to the new folder. The worktrees and stashes stay here.
  - This folder and its private GitHub repository stay as the private archive. The earlier copy, `parliament-public`, goes to the Recycle Bin on your yes.
  - CLAUDE.md's archive pointers and its line on rewritten ids are brought up to date in the first commit after the push.

  **Suggestion:** yes.
- **(g) Stored data,** as ruled (C264 (k)): the one upgrade at each person's next visit, with its backup offered first, and the keys moved into the vault once (C267 (d)). Nothing else.

**C277. Stage 15, piece 7, step 5: the vault's site, and its published hashes** (proposed 28 October; **ruled 28 October: (a) 1**; C170; C274 (h); C276). The vault serves the released code, but the release's list of its files' hashes was made from this computer's copy, whose line ends differ from the ones Netlify builds with.
- **The vault's site, checked from outside:**
  - Netlify's site `parliament-keys` serves the vault built from `v0.5.0`.
  - `keys.parliament.ltd` is a CNAME to `parliament-keys.netlify.app`, at deSEC and in public DNS.
  - HTTPS, with a Let's Encrypt certificate for `parliament.ltd` and `*.parliament.ltd`, valid to 9 December and renewed by Netlify. Plain HTTP is sent to HTTPS.
  - Every header as `vault/netlify.toml` sets it. On the `netlify.app` address, Netlify adds `preload` to HSTS, as it does for its own domain.
- **What differs from `SHA256SUMS`:**
  - The repository stores every line end as LF, and Netlify's checkout keeps them. On this computer git writes them as CRLF, the Windows way (`core.autocrlf`), and the release was built here. The vault's stylesheet and page keep their line ends in the build, and the script's file name follows the stylesheet's.
  - So the script Netlify serves is the released one, byte for byte, under another name. The stylesheet and the page differ in their line ends alone.
  - Built here from a checkout of `v0.5.0` that keeps LF, the vault is exactly the three files `keys.parliament.ltd` serves.
  - The app's archive too: 17 of its 20 files are the same. `index.html` and the manifest differ in their line ends alone, and `sw.js` only in its record of those two.
  - The `v0.5.0` release is immutable, so its `SHA256SUMS` cannot be replaced. Anyone who checks the vault against it finds two files missing and a different page, and anyone who builds it on Windows gets the same wrong answer.
- **(a) The fix** (a choice).
  1. **0.5.1, before the switch.**
     - A `.gitattributes` file keeps LF in every checkout, on any computer. No file in the repository changes, since each is stored with LF; only this folder's copies are written again.
     - `release.mjs` refuses to release from a checkout whose line ends differ from the repository's.
     - Version 0.5.1, its changelog saying why, released as before: the check, both builds, `SHA256SUMS` and the tag. Its vault lines are the three files `keys.parliament.ltd` serves now, so the vault is not deployed again.
     - On your yes, `main` and the tag go to both remotes, with the CLAUDE.md commit, and you make the GitHub release as for 0.5.0. The switch then publishes 0.5.1, so both sites match a release.
  2. **Leave it until the next release.** Until then the vault's one published check fails for anyone who runs it, just as Parliament goes public.

  **Suggestion:** 1.

  **Ruled 1, and built:**
  - `.gitattributes` keeps LF in every checkout. No file in the repository changed; this folder's 682 copies were written again with LF, and git found no difference in any of them.
  - `release.mjs` refuses to release, even as a dry run, while any file here has Windows line ends. Tried on a copy with two such files: it stopped and said why.
  - Version 0.5.1 in `package.json` and in the lockfile, which still said 0.0.0. A backup now records 0.5.1 as the version that wrote it (`src/lib/backup.js`): a value in the file, not its format, so every backup reads as before. The changelog's newest entry says why 0.5.1 exists.
  - The release's `SHA256SUMS` lists the vault's three files with exactly the hashes `keys.parliament.ltd` serves now (the script `f0c26e7a…`, the stylesheet `d36e4daf…`, the page `57600c6d…`), so the vault is not deployed again.
  - A fresh clone, with this computer's Windows setting left on, had no file with Windows line ends, and built all 20 of the app's files and all 3 of the vault's exactly as the release's archives hold them.
  - Tests: 1,359. Lint: 30 warnings, all older. The build passes.
  - Released here as `v0.5.1`. Nothing pushed: `main` and the tag go to both remotes on your yes, with the CLAUDE.md commit, and then you make the GitHub release, as for 0.5.0. The switch then publishes 0.5.1.
  - **Noticed, not changed:** the version is written by hand in three places. `src/lib/modes.js` still gives rooms 0.4.0, though its comment says to raise it at each release; `src/catalog/dev-modes.js` says 0.5.0. Reading `package.json` instead is for a later piece.

**C278. Stage 15, piece 7, as built: going public** (29 October; C276 as ruled; C277 as ruled). Parliament is public, and `parliament.ltd` serves 0.5.1.
- **Ready here** (step 1): the two fixes merged (C276 (b)), Node 24 on both sites ((c)), the changelog dated 28 October. The copy made again at `C:\Users\stefan\Desktop\parliament`, and `v0.5.0` released from it.
- **The repositories** (steps 2 and 3): `parliament-ltd/parliament`, public, on GitHub under the organization `parliament-ltd` and on Bitbucket in the workspace of that name. `main` and `v0.5.0` pushed to both, then `v0.5.1` (C277). No force push.
- **GitHub's settings** (step 4), as (e) lists them. Checked from outside: the description and the website; private vulnerability reporting on; an active ruleset on `main` that blocks deletion and force pushes; both releases immutable. Secret scanning and Dependabot show only to you. CodeQL, the check and Scorecard ran on the new `main` and passed.
- **The releases:** `v0.5.0` on 28 October, and `v0.5.1` the same day, for its vault hashes (C277). Each carries its two archives and `SHA256SUMS`, exactly the files built here.
- **The vault's site** (step 5): `parliament-keys`, from the `vault` folder, at `keys.parliament.ltd`, auto publishing locked. It serves exactly the three files `v0.5.1`'s `SHA256SUMS` lists, every header as set. The build Netlify made after the push waits unpublished: its files are the same, so the vault is not deployed again.
- **The backup** (step 6), made by you on the old site before the switch.
- **The switch** (step 7), 29 October:
  - `project-apollo-v1` locked first, then linked to the public repository's `main`.
  - Its build, checked at its own address before publishing: 19 of the app's 20 files exactly as the `v0.5.1` archive holds them (the 20th below), every header as set, a missing asset answered 404 and any other path with the app.
  - Published. `www.parliament.ltd` serves the same files. `parliament.ltd`, plain HTTP and old paths redirect to it. The page frames only `keys.parliament.ltd`, the vault lets only `www.parliament.ltd` frame it, and SECURITY.md quotes the live policy word for word.
- **After it** (step 8): `docs/hosting.md` records the repository, both sites, the vault's record and how a release is published. The live testing list is yours to go through, its "Stage 15" and "After the switch" sections first; its line on the narrow room's mark now says the fix shipped in 0.5.0.
- **Noticed, not changed:**
  - The 20th file, `sw.js`, lists the same 17 files with the same revisions as the archive's, in another order, since Netlify's computers sort file names differently from this one. Browsers take the two alike, and `SHA256SUMS` covers only the archives and the vault's files, so nothing published is wrong. But the app's archive is not byte for byte what the site serves. Sorting the list in the build (`vite.config.js`, the service worker's `manifestTransforms`) would make them the same; for the next release.
  - Still open from (f): the earlier copy, `parliament-public`, goes to the Recycle Bin on your yes. The standby site is piece 8.

**C279. After the switch: three fixes, a smaller first release, and its open points** (proposed 29 October; **ruled 29 October: as suggested ("ok with lean"), and (f) lists every command on every board, "a holistic resource"**; C95; C126; C130; C238 (e); C250; C265; welcome spec §2, §3, §14; Almanac v30; welcome v9; bar reference). From your first look at the live site. The fixes are built; (a) to (g) wait for you. Everything is on the branch `claude/after-switch`, nothing pushed or published.
- **Built:**
  - **`settings:` opens Settings**, and `settings:data` one section of it, as `open:settings` does (C181). The arrangements spec names the verb; C95 left it for its stage, and it was never added, so the bar said "No command called settings:".
  - **The quill no longer covers the marginalia.** The 42px kept for the quill (bar reference) was zeroed by the chrome's reset for buttons once who answers became a button (stage 7), so its last 30px ran under the quill at every width. It is now 11.5px clear, as drawn. On a narrow field the marginalia shorten with an ellipsis rather than run past the edge; see (g).
  - **Reflection keeps its own class.** It shared one with the `?` reference, so Reflection's body took the reference's card, shadow and 52vh limit, and the reference took Reflection's spacing. Each looks as built again; Reflection's headings keep their capitals, as inline editing v5 draws them.
  - Tests: 1,360. Lint: 30 warnings, all older. The build passes. Tried in the browser: `settings:data` opens Settings at its data section, and the quill sits clear of the marginalia.
- **(a) A smaller first release** (a choice). Your words: hide the Lab and the other rooms until they are designed, so the default room is what people get, with inline editing, Ripple and the rest.
  - **How:** one switch in the code, off for this release, so nothing is deleted. While off:
    - the Lab is not offered: `lab:`, the "Building rooms" commands (`edit:`, `done:`, `place:`, `layout:`, `theme:`, `device:`, `local:`, and `set:` in a room) and `new:room`;
    - no room but Writing Studio is offered: Data Workspace, Drafting Desk, Pocket Chat and Quiet Room;
    - those commands answer "Not in this release" if typed, and leave `?` and Tab;
    - the welcome page's `lab:` step goes, see (d).
  - **What stays:** anything someone has already made. A room, a chat in another room or a Drafting Desk document already in Records still opens, since hiding it would hide their own work. Only making new ones waits.
  - **How I read "extend the columns":** people cannot change what the columns hold or pick another layout, which is the Lab's work. The buttons that open and close the columns stay, as (b) suggests. Tell me if you meant no side columns at all.
  - **Other boards:** you said "certain boards". Records, the Collection, the Library, the Plan board, Reflection and Settings stay unless you name one.

  **Suggestion:** yes, as above.
- **(b) A room's columns** (a choice).
  - **Today:** a room at least 940px wide shows both side columns, 288px each, so beside another board its chat gets 360 to 440px. Under 940px it switches to its narrow form, with the columns behind buttons at its top (C126). Nothing tells a room whether it is alone on screen.
  - **Suggested:**
    1. **Alone on screen** (the only board, or popped into its own window): as today, columns open.
    2. **Sharing the screen:** the columns start closed, each a thin strip with a button, and the chat takes the room's width. A button opens its column over the chat's edge, inside the room; Escape, the button again or a click on the chat closes it. This is your "pop out and close", kept inside the room.
    3. The narrow form only when the room is too narrow for a chat at all, about 600px, rather than 940px. So a focused room (`focus:`, 820px) keeps its columns behind its side buttons rather than switching to the narrow form.
    4. Open or closed is not remembered: each room starts as above. Remembering it would be a new stored field, shown first.
  - **Columns as real boards** (movable, poppable, in the arrangement): not now. The arrangements spec keeps boards out of rooms, it would change stored arrangements, and "pop" already means a window of its own.
  - **The stored panel buttons** (`panelButtons`, C238 (e), C250) chose which columns had a button in the wide form. Under this every column with blocks has one, so they stop mattering; they stay stored, unchanged.

  **Suggestion:** 1 to 4.
- **(c) `letter:`** (a choice). Welcome spec §14 already sketches it: letters ship with each release and nothing is fetched, the welcome letter is letter one, and `letter:all` lists every letter, "a changelog written by a person".
  - **Built as:** `letter:` opens the newest letter, `letter:1` one by its number, `letter:all` the list. A letter opens in a panel under the bar, as `?` does, and Escape closes it.
  - Letters live in the copy table like the welcome letter now, so they can be translated. Letter one is today's letter, word for word (C265).
  - Which letters someone has read is kept on this device, as the welcome steps are, and is not backed up. No stored data changes shape.
  - **Secret or announced:**
    1. **Secret:** no notice anywhere. `letter:` is in `?` and Tab like any command, so whoever reads the list finds it. Your idea.
    2. **Announced,** as §14 has it: one line of marginalia under a board's heading while a letter is unread.

  **Suggestion:** 1, and a later letter can be announced by its release's changelog line if you want it read.
- **(d) The welcome page without the letter** (with (c)). The steps and the bar only, in one column; the storage notice stays. `tour:` already brings back just the steps. The letter's first sentence stays in About and in the manifest (C272 (a)). This replaces welcome spec §2 and §3's letter beside the steps. With (a), the `lab:` step goes, leaving nine.

  **Suggestion:** yes.
- **(e) The birds on first load** (a choice). One bird, then two, then three, then the welcome page fades in.
  - Only on the very first visit, the same moment the welcome page first shows; never again.
  - About 1.2 seconds in all. The screen is blank today while the browser's storage opens, so most of it costs nothing.
  - A key or a click skips it. With reduced motion, all three birds show at once and the page follows.
  - The mark is one shape holding three birds; it is split into three so each can come in. Drawn with the stylesheet, since the policy allows no inline style or script.
  - The language ruling asks for "nothing in the way on first load"; short and skippable keeps to it.

  **Suggestion:** yes.
- **(f) The command menu** (a choice).
  - **Almanac v30** (23 September) draws `?` as groups flowing into as many 318px columns as fit, two to four, each row the command and its description, a hairline under each heading and the keys at its foot. Settings v1 and Lab v6 and v7 use the same.
  - **Welcome v9** (6 October), the newest, draws it in two fixed columns. CLAUDE.md takes the newest mockup, so v30 needs your yes.
  - **Today:** one column, under a bar 720px at most. More than two columns needs the panel to reach across the screen under the bar.
  1. **v30:** the panel as wide as the screen, its groups in as many columns as fit, with headings, hairlines and the keys at the foot. The sizes rise to the token sheet's smallest, 11.5px. Opening and the keys stay as today.
  2. **v9:** two fixed columns, under the bar.

  **Suggestion:** 1. v30's narrowing as you type after `?`, and the arrow keys walking the list, could follow later.
- **(g) Narrow fields** (a choice). In the welcome card's bar and on a phone, the marginalia now shorten rather than run under the quill, but the prompt itself still has little room: about 80px in the welcome card.
  1. On a narrow field only who answers shows; voice, attach and the framework hide there. `attach:` and `framework:` still work from the bar.
  2. The prompt keeps a least width, and the marginalia shorten further.

  **Suggestion:** 1.
- **Noticed, not changed:**
  - `collection:`, `reflection:`, `almanac:` and `docket:` answer "No command called". `records:` brings the Collection; the last two are the old names. A word for each, if you want them.
  - In a second room and in the Lab, Tab does not complete the commands that work there (`tell:`, `place:` and the like), since it asks with the board's own name.
  - The narrow room's top line and the column buttons have English written into the code rather than the copy table; (b) moves them there.
- **Ruled and built, 29 October** (tests 1,388, lint 30 older warnings, the build passes; tried in the browser). **Released as `v0.6.0` the same day:** the GitHub release immutable, its files the ones built here; the site's build checked at its own address (19 of 20 files exact, `sw.js` the same list in another order, as C278 notes) and published; the vault not deployed again, its files unchanged.
  - **(a)** `src/lib/release.js` holds the switch, off. The Lab's commands and `new:room` say "comes in a later release" and leave `?` and Tab; `docs/verbs.md` lists them under "In a later release". The Library shows Writing Studio's template and no shelf for layouts, blocks or themes. A space left in the Lab, and the old `/edit` and `/build` addresses, open the start. Every room someone made still opens; nothing stored changed. The Lab's tests run with the switch on.
  - **(b)** A room alone and at least 940px wide has its columns open, each with a button that folds it to a strip. Sharing the screen, or narrower, each column is a 24px strip with its button, and the chat takes the room's width; a column opens over the chat's edge and closes on Escape, its button or a click on the chat, one side at a time. The narrow form only under 600px or on a phone. Writing Studio, Data Workspace and Drafting Desk alike. Nothing remembered; the stored panel buttons are no longer read and stay stored. The column and narrow top-line labels are in the copy table.
  - **(c)** `letter:`, `letter:1` and `letter:all` open a panel under the bar, as `inspect:` does; Escape closes it. Letter one is the welcome letter, word for word, dated 28 October. Which were read is a setting on this device, not backed up.
  - **(d)** The welcome page is one column: the heading, nine steps, the bar, then the ending. Its screen-reader name for the steps reads "Things to try".
  - **(e)** On the very first start only: one bird, then two, then three, about 1.2 seconds, then the page fades in. A key or a click skips it; with reduced motion the three show at once for 0.4 seconds. The welcome card's mark is unchanged to the pixel. 64px wide, a size no mockup draws.
  - **(f)** `?` lists every command on every board, in v30's flowing columns across the stage: four at 1440px, under a "Commands" heading, keys at the foot. A command for another board is fainter, with where it works beside it. Text at 11.5px. On a phone each command sits above its description. In the welcome card it keeps to the card's column, one wide.
  - **(g)** On a bar 560px wide or less, only who answers shows beside a prompt; in the welcome card the prompt now has 342px rather than 80.
  - **Also asked on 29 October:** "Built for computer, phone later" is in the welcome page's foot with the other marginalia, on every screen; the language sits in the card's top corner.
- **For you:**
  - Letter one's third paragraph says rooms are built from blocks and that you can make layouts and themes. In this release that waits with the Lab. It is your words (C265), so it is unchanged.
  - The welcome page's foot still says "MIT licensed. Source published at launch", which the launch has made untrue.
  - Data Workspace and Drafting Desk keep their chat in the right column, so sharing the screen their chat is behind the right strip. Neither is offered to new people now.
  - The birds' size and the reduced-motion pause, the `?` panel pushing the boards down rather than floating over them (v30 floats it), and its one column in the welcome card are first choices, easy to change.
  - The four draft languages lack the new strings and still say "that works here" for `?`.

**C280. One bar, one point of control; the menus and the chat after the first release** (29 October; **ruled by Stefan as he asked for each, 29 October**; replaces C6's "each window keeps its own bar"; C279; the bar reference; inline editing v5; Almanac v30). **Released as `v0.7.0` and published, 29 October:** the GitHub release immutable, its files the ones built here; the site's build checked at its own address (19 of 20 files exact, `sw.js` the same list in another order, C278) and published; the vault not deployed again, its files unchanged; the check, Scorecard and CodeQL passed on `main`.
- **Ruled and built:**
  - **One bar.** "There should only be one bar, one point of control." A popped board has no bar of its own; the one bar, on the page or in its own window (`pop:command`), commands every board, and focusing a popped board points it there. Ctrl+K and `/` reach it from any window. A popped board's window cannot bring the page forward (the browser lets a page raise the windows it opened, not the other way), so after Ctrl+K there it says where the bar is. Checked in a real Chrome: never more than one bar in any window.
  - **Popped windows** open at the size the board showed on the page, leaving room for the window's frame, and the board fills its window.
  - **The command menu as a board:** `open:commandmenu` beside the work, `pop:commandmenu` into a window. `commandmenu`, since `command` is the bar's own word. A click writes a command into the bar.
  - **`close:letter`** closes the letter, as Escape does.
  - **The welcome page's first step** says the keys: "Ctrl+K then >" (⌘K on a Mac).
  - **"answered from multiple"** when several sources are ticked, "answered by multiple" when a model is among them.
  - **The ink pot shows on a fast answer:** a first dip as a reply starts, at least 1.5 seconds of drain, then the refill, holding its level through the refill's delay. The drawing's own cycle is unchanged; with reduced motion only the slow drain shows.
  - **Every menu in the command menu's layout:** who answers, frameworks, languages and reply to, in Almanac v30's columns as `?` is, one shared piece (`Menu.jsx`). A click outside closes a menu; with the bar at the bottom they open above it and the bar never moves.
  - **A room is its chat:** "I've changed my mind on columns, let's hide those for now." `COLUMNS = false` in `src/lib/release.js` hides every side column; `true` brings C279 (b) back unchanged. The strip of old icons on each card is hidden too (`CARD_HEAD = false`).
  - **The chat as the newer mockups draw it:** the prompt in a quiet box at most 600px (v5), the reply as serif text on the board at most 640px (the bar reference's 15.5px), a source's answer with a rule at its edge, marginalia under each in italic serif. Gold is gone from the chat's buttons and links.
  - **A selection can run from a prompt into its reply,** and across cards, in Chrome and Firefox (`src/editing/across.js`). Strike-through and the ask box work as before inside one prompt and its reply.
  - **The language in the top corner** shows only with more than one language to choose; the live site has English alone until the drafts are reviewed.
  - Tests: 1,424. Lint: 30 warnings, all older. Both builds pass.
- **For you:**
  - **Hidden with the columns:** the branch list (`open:201a`, `new:branch` and Records still reach branches), the highlights and notes lists (in Records), the context meter, and Data Workspace's file shelf, so a Data Workspace cannot load a file. Neither Data Workspace nor Drafting Desk is offered now; their chat sits in their right column, so beside another board it is behind a strip.
  - **Hidden with the old card strip, and no command for them yet:** favourite one message, a note on one message, delete one message, hide one, send one to a branch, quote a whole message. Commands for them, or v5's selection menu, are for a later piece.
  - **First choices, easy to change:** the reply 640px wide and 15.5px; names in the menus in mono, as commands are; every menu as wide as the screen; in the welcome card a menu opens under the field and the card re-centres; a board brought back with `pop:back` returns as a column of its own.
  - **Unused now, kept:** the old `.ch-answers` styles and the copy entry `picker.models` ("Models"). Each goes only on your yes.
  - Still open from C279: letter one's third paragraph, and the foot's "Source published at launch".

**C281. After trying 0.7.0: the edited prompt, the marks, switching who answers** (29 October; **ruled by Stefan as he asked for each, 29 October**; replaces C255 (a)'s blue tick and C214 (b)'s editing of the joined words in the bar; C172 (c); C280; inline editing v5). **Built on `claude/after-0.7`, not released.**
- **Ruled and built:**
  - **No blue ticks.** "There are little blue checkmarks after I deleted part of a prompt and reply, can we not have those?" They were calm's mark for a reply holding edits it hides (C255 (a): "a small blue tick"), drawn on the block and on each edited card, so one deletion gave three, two of them over the words. The mark is now what inline editing v5 draws: a 2px rule at the reply's edge, in the colour of struck words. A source's answer already has a rule there, and it darkens instead. Near it, the markup shows and the rule goes. An edited prompt has none, since its line underneath already says it was edited.
  - **The edited prompt is held, not written out.** "Instead of writing the entire text, which can be a lot, let's have a placeholder." After a deletion across a prompt and its reply, the field shows "Your edited prompt" and holds the words; Enter sends them unchanged. Typing replaces them; Backspace, Delete and Escape clear them; `>` and `s>` keep them. The Enter line adds "Typing replaces it. Escape clears it". Not "resend": the words go as a new prompt and include the reply's.
  - **Step 9 crosses off** the moment a prompt goes out carrying an edit: to the model answering, to the model that reads edits beside a source, or as joined words with edits in them. Before, the held words were cleared only when a prompt went to a model, so a new prompt typed over them, or one sent to a source, left their edits out and the step open.
  - **The tab shows the three birds** (`public/favicon.svg`), dark on a light tab bar and light on a dark one. The PNG stays for browsers that cannot show an SVG icon, and for the home screen.
  - **`close:tour`** closes the welcome page, as `close:welcome` does.
  - **"The bar points here" is gone** from every board; the addressed board's dark line still shows it. The copy entry `shell.addressed` is unused, kept.
  - **markup · clean in a room's head**, as the newer mockup draws it; only the Collection had it. Each runs its command, `markup:on` or `markup:off`.
  - **Typing closes a menu:** who answers, frameworks and languages close as the bar is typed in, as on a click outside (C280). `?` stays open, to type from it.
  - **Switching who answers mid-chat.** "Shouldn't be locked into one model." A click on a name in who answers, or Enter, answers with it alone from then on (`by:`; `undo:` takes it back). Its box, or Shift and a click, adds it beside the others as a branch, as C172 (c) has a tick do. Before, a click always added.
  - Tests: 1,436. Lint: 30 warnings, all older. Both builds pass.
- **For you:**
  - **A key for one provider, Settings' model another's.** C150: a chat with no choice takes Settings' model when its provider has a key, else Wikipedia. So with only a Mistral key, and Settings' model Sonnet 5.5, a new prompt still goes to Wikipedia, and the Enter line still says "A model reads them once it has a key". This is likely why step 9 stayed open after the Mistral key went in. **Suggestion:** with no key for Settings' model's provider, the default is the first current model of a provider that has a key (the default provider first, then the list's order; Mistral Medium 3.5 today), named on the Enter line before anything goes. Wikipedia answers only with no key at all. Nothing stored changes. Changes C150, so it waits for your yes.
  - **The language picker** shows only with more than one language to choose (C280), and the live site has English alone. Review a draft language to ship, or show the picker anyway?
  - **A room's title "appears on hover":** not found. A name given with `name:` always shows in the room's head, after its number and the chat's title. Where is it seen only on hover?
  - **Editing the held words:** C214 (b) had them editable in the bar; now they are edited in the chat. Should a key (End or →) write them out in the field?
  - **Joined words sent to a source:** step 9 crosses, but their edits are not marked as gone into that prompt, so the line says the source reads none of them and they wait for the next model as a note. Mark them as gone into it, as when joined words go to a model (an existing field, no schema change)?
  - **Small, not fixed:** the line under the cards, "Your prompt and this reply, as they read now, are in the bar as your next prompt", stays after the words are sent or cleared.
  - Still open: letter one's third paragraph; the foot's "Source published at launch"; commands for the one-message actions; removing `.ch-answers`, `picker.models` and `shell.addressed`, each only on your yes.

**C282. After trying C281: close: everywhere, the start card, Wikipedia, four languages in beta** (30 October; **ruled by Stefan as he asked for each, 30 October**; replaces C125's "not when it is the last board", C279's welcome page without the strip, English alone (C87, C184), and part of C255 (a) on a room's head; C160 and C84 kept). **Built on `claude/after-0.7`, not released.**
- **Ruled and built:**
  - **`close:` on every board.** Every board already closed by its name. Two gaps: the welcome page alone said "The last board stays open", so on a first start `close:tour` and `close:welcome` did nothing; and `close:room` was not understood. Now `close:room` closes the room the bar points at (`pop:`, `move:`, `swap:` and `width:` take `room` too), "No room is open" when there is none, and a room in a sentence is "Room", as the strip names it.
  - **The start card.** "Instead of opening a room if the welcome is closed, let's have the logo center screen along with the bar ... we don't take actions on their behalf." When the welcome page closes with nothing else open: the birds in the middle of the screen, the bar under them, and three lines, each command a link that writes it in the bar: "p> and a question opens a room", "open:records lists what you have made, and open: with its number opens one again", "tour: brings the steps back". It gives way to the first board opened, and `tour:` brings the welcome page back in its place. A stored arrangement may now name the board `start`: a new value in an existing field, no schema change (an older Parliament would not know it).
  - **The strip beside the welcome page.** "The top bar was hidden while welcome was on." It shows whenever a board is open beside the welcome page; the welcome page or the start card alone still has none. Not greyed: grey reads as switched off, and every word on the strip works.
  - **Why the title "appeared on hover" and the markup switch was missing:** calm was on, and calm's switch is on the strip the welcome page hid. Calm now leaves a room's names (the chat's title and the room's) and its markup switch in view.
  - **markup · clean on a room once its chat holds edits,** asks or suggestions, as the Collection's already did ("if someone edits a board, let's show the markup on/off switch").
  - **Step 8 says Backspace** (⌫ on a Mac): Backspace over words selected in a reply strikes them.
  - **Languages.** Chinese (Simplified), Japanese, Swedish and Finnish ship, each marked "in beta" in the picker and on `language:`'s line ("This translation is in beta: some words may still read oddly"). Spanish is listed "coming soon" and cannot be picked; `language:es` says it is coming. The globe shows, now there is more than one language. The lines added since the drafts of 23 and 24 October (about 660 in each) were drafted on 30 October; terms and doubts are in `docs/translations/`. Two effects: a browser set to one of the four starts in it (C87); and with a second language shipped the page opts out of the browser's own translation (C84), so someone who reads Spanish or German gets English rather than the browser's translation.
  - **Wikipedia, only ever read.** Already so (C160 and stage 4): one request per prompt, asking for the article's opening section only, as plain text, at most 6,000 characters, never an image, no cookies, no referrer, and naming Parliament with `Api-User-Agent` and a contact address. Now:
    - each request is a GET with no body, in the code and in a test: nothing made here, edits included, is ever sent;
    - the name sent carries the release's own version (it said 0.5);
    - the link to the article sends `https://www.parliament.ltd/` as its referrer, the address alone, so Wikipedia can see readers came from Parliament; `noopener` still keeps the article's page from reaching back. Every other link, and the site's own `no-referrer` policy, are unchanged.
  - **Also fixed:** "Suggestion {num} was accepted already" and "…rejected already" are one line with a select, so each language words both states (the state came through in English).
  - Tests: 1,439. Lint: 30 warnings, all older. Both builds pass.
- **For you:**
  - **Step 9** ("Send it with your next prompt") needs a key, since only a model reads edits. Keyless choices from the advanced list (welcome spec §13): ask two sources at once (p>, then a second source's box in who answers), highlight a passage, or start a collection.
  - **A toggle for the whole article:** not built. **Suggestion:** none. The article's link is the way to the whole article: a page view, with Wikipedia's own banner, and nothing more fetched by Parliament.
  - **Small, not fixed:** where a send is slow (about 15 seconds in the test browser, where the key vault cannot be reached), a second Enter sends the prompt again.
  - Still open from C281: Settings' model with no key while another provider has one (C150); a key to write the held words out in the field; the line under the cards that stays. On joined words sent to a source: kept as they are, "never send back".

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

- V1 spec: `git show f12a0be:CLAUDE.md`
- V2 Phase 1 CLAUDE.md: `git show <commit before this rewrite>:CLAUDE.md`
```
