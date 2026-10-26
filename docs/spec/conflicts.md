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
