# Welcome: spec decisions

Companion to `parliament_welcome_v8.html`. Dated 30 September 2026.
Follows the visual values of Lab v7 and Almanac v30. Where this doc and the
mockup's header comment disagree, the header comment wins.

---

## 1. What the page is for

The first thing a new person sees. It teaches the command line by having them
use it: every step is a real command, and the screen rearranges itself as they
go. There is no tour card and no separate onboarding. The page itself is the
lesson.

---

## 2. At rest

- **One large card**, almost the size of the screen (20px inset), with the
  footer below it.
- **Left column:** "Welcome" in 16px serif, the eight steps under it, and the
  field directly under the steps.
- **Right column:** the letter, level with step 1.
- **The field has no box at rest.** No border, no shadow, only a faint rule
  underneath (`rgba(25,25,25,.12)`). The command and prompt fills are Lab v7's,
  unchanged: the star lattice on navy, and the mosaic on bone.
- **One line of marginalia by the field:** `> to begin`. Nothing else. Import
  and the tour are found in the command line, so the first thing anyone learns
  is that the field is a command line.
- **No page hatch, no dotted borders.** Both are retired. Cards carry the faint
  lift shadow only.

---

## 3. The letter

Serif, 13px, ink-2, 46ch wide. Text as shipped in v8:

> Parliament is a place to work with AI on your own terms. It is early, and
> still being built.
>
> It runs in your browser, with no servers and no accounts. Your chats and keys
> stay on this computer, and each request goes straight to the provider you
> pick, to a model running on your own machine, or just Wikipedia. There are no
> ads.
>
> With the goal of rethinking how we interact with AI, it is yours to shape.
> Rooms are built from blocks, layouts and themes. You create the space, you
> choose how to interact.
>
> Most AI apps are built for passive consumption. You ask something, you
> receive a response. Here you steer from a command line: branch chats,
> highlight, add and combine notes across chats, plan a run of prompts, and
> more. Let's take back control.
>
> — So Lov

- **"It is early, and still being built"** is deliberate. Parliament asks for
  trust with keys and work; saying it is unfinished makes rough edges read as
  honest, and it matches the call for builders in the footer.
- **The signature is in the letter's colour**, not ink.
- **The signature dash is an em dash**, a deliberate exception to the no em
  dash rule in the copy conventions. It is the only one.
- **Every claim must stay true.** The letter names no competitors and uses no
  statistics. What it rests on, checked 30 September 2026:
  - Consumer plans of the major chat apps may train on conversations unless the
    user opts out (ChatGPT Free, Plus, Pro; Claude Free, Pro, Max since the
    August 2025 terms). Their APIs do not train on inputs or outputs by
    default. Bring-your-own-key calls go through API terms.
  - ChatGPT began showing ads to Free and Go users on 9 February 2026.
  - Research links heavy passive reliance on AI with weaker critical thinking
    (Gerlich 2025, 666 participants), without establishing cause. "Keep you
    thinking" is an aim, not a claim.
  - If Parliament ever adds a server, analytics, or ads, the second paragraph
    must change the same day.

---

## 4. The steps

Numbered 1 to 8, in the same serif as "Welcome", 13px, not bold. One line
each: what to do, then the command in ink-3. Clicking the command writes it
into the field. No heading, no count, no rules between lines, no footer. Done
steps are struck through in ink-3; the next unfinished number turns ink. Steps
cross off in any order.

| # | Step | Command | Crossed off when |
|---|------|---------|------------------|
| 1 | Open the command line | `>` | the field enters command mode |
| 2 | Pop the command bar out | `pop:command` | the field docks at the foot |
| 3 | Ask something | `p>` and a question | a prompt is sent |
| 4 | See what you have made | esc, then `alm:` | the Almanac opens |
| 5 | Name the room | `name:"…"` | the room is named |
| 6 | Move it to another monitor | `pop:almanac` | any board is popped |
| 7 | Browse tools to add and customize | `library:` | the Library opens |
| 8 | Add an AI API key | `key:` | Settings opens at the key |

- **Order teaches.** The prompt comes before the Almanac so the Almanac is not
  empty. Naming the room comes after the Almanac so the rename shows in its row.
- **Step 4 names Escape** because it is the first time someone has to leave
  prompt mode on purpose.
- **Step 8 crosses off on seeing the key panel, not saving a key.** Not
  everyone has a key on day one. See Open, item 3.
- `list:off` puts the steps away; `list:` brings them back. There is no
  on-screen "skip".

---

## 5. How the screen changes

- **`pop:command`**: the field lifts out of the card and docks at the foot of
  the screen, 640px wide; the card shortens to make room. Docked, the line of
  marginalia sits above the field and `?` opens upward. `pop:back command`
  returns it.
- **The first prompt** opens the chat in a card of its own. The welcome card
  slides left and narrows to a single column (steps, field, then letter).
- **`alm:`, `library:`, `key:`** open on the right, stacked, newest scrolled
  into view.
- **`pop:almanac`** opens a real browser window that can be dragged to another
  monitor. If the browser blocks it, the window is drawn in the page with
  "bring it back". Closing the real window brings the board back.
- Cards arrive with a short rise (`pip`, 0.3s). Reduced motion turns it off.

---

## 6. The field

- **Three modes**, as everywhere: search (drawn SEARCH pill, magnifier),
  command (`>`, navy fill, COMMAND pill, mono white type, navy rule down the
  left edge of the page), prompt (`p>`, mosaic fill, ink PROMPT pill, quill).
- **The field stays in the mode you left it in.** After a command runs, the
  field keeps `>`, so it is never typed twice. After a prompt is sent, it stays
  in prompt.
- **Escape steps back one mode:** prompt → command line → search. Backspace on
  an empty prompt does the same. In prompt mode the line by the field says
  `esc back to the command line`.
- **The command line's marginalia leads with the next unfinished step's
  command**, then `p>`, `import:` (until there is a chat), and `?`.
- **The prompt line shows the room and the source:** `→ unnamed room ·
  answered from Wikipedia ▾`. Without a key the source is Wikipedia; after a
  key is saved it becomes the provider.

---

## 7. The ending

- When the last step is crossed off, the steps fade, and the heading finishes
  its own sentence: **"Welcome / to Parliament"**, the second line in the same
  16px serif, fading in.
- The letter gives way to one line in the same size: **"Now, let's focus:"**,
  with `focus:` underlined and clickable.
- **`focus:`** clears the screen to the chat alone. Every board closes,
  popped windows included; nothing is lost. The chat card centres at up to
  820px, the field docks under it, and the field switches to prompt mode. The
  Enter line names what will close before Enter is pressed.
- **`focus:off`** brings the welcome card back.

---

## 8. Verbs on this page

| Verb | Does |
|------|------|
| `p>` | start a prompt |
| `name:"…"` | name the room |
| `import:` | open import (a backup file) |
| `key:` / `settings:` | open Settings at the key |
| `alm:` | open the Almanac |
| `library:` | open the Library |
| `close:<board>` | take a board off the screen |
| `pop:command`, `pop:<board>` | dock the field, or give a board its own window |
| `pop:back <thing>` | return it |
| `focus:`, `focus:off` | the chat alone, and back |
| `list:`, `list:off` | the steps back, or away |
| `help`, `?` | every command |

`move:` is listed but refused in the mockup ("boards sit on the right in this
test").

---

## 9. The footer

Anchored at the foot of the screen, outside the card, italic serif marginalia:

`Created with Claude Code · Open source on GitHub · Looking for other builders`

- Transparency is the point: how it was made, where the code is, and that
  help is wanted.
- Both links are placeholders (`GITHUB_URL`, `CONTRIB_URL`, top of the script).
  The builders link should land on a CONTRIBUTING.md or a pinned issue that
  says what kind of help is wanted.

---

## 10. Decided along the way

1. The tour card and its `tour:` verb are replaced by the steps.
2. Import and tour marginalia under "Welcome" are gone; import is a command.
3. Marginalia starts as `> to begin` only.
4. The field loses its box at rest; a faint rule underneath is enough.
5. The steps lost their heading ("Getting around"), count, rules, "skip the
   list" and "? when you are lost".
6. `name:` names the room, following Lab v6. `rename:` is not used.
7. Chat opens in its own card, because the welcome card is not a conversation.
8. The finished heading reads "Welcome / to Parliament", not a repeat of
   "Welcome" in marginalia.

---

## 11. Changes required elsewhere

- **`key:` versus `api:`.** Settings spec §15 made `api:` the verb for the key
  panel on every surface. This page uses `key:`. Pick one; the likely answer
  is `api:` everywhere, with `key:` as an alias for new people.
- **`focus:` and `list:`** are new verbs, and so is `new:block`. Add them to
  the verb table; `focus:` is useful on every surface, `list:` (with
  `list:advanced`) only here.
- **`pop:command`** must dock the field on every surface, not only here, and
  `pop:back command` must return it.
- **The command line stays in command mode after a run** on this page. The
  Almanac clears the field after a run. Choose one rule for every surface.
- **Escape from prompt goes to the command line here**, and to search in the
  Almanac. Same: choose one.
- **Wikipedia as the keyless default source** needs to hold wherever a prompt
  can be sent without a key.

---

## 12. Open

1. **"Open source" may not be accurate.** An April chat set Parliament up under
   the Business Source License; the V2 brief says "open-source,
   source-available"; an older plan names MIT. A BSL project is
   source-available, not open source. If it is still BSL, the footer should
   read "Source available on GitHub".
2. **The GitHub and contributing URLs** are placeholders.
3. **Does step 8 cross off on seeing the key panel, or on saving a key?** The
   wording says "Add"; the behaviour says "see".
4. **Small screens.** The page assumes a keyboard, and step 6 cannot work on a
   phone. Proposed: one line of marginalia under "Welcome", on narrow or
   touch-only screens only: "built for a computer for now; the phone comes
   later". The phone layout here is a rough fallback, not a design.
5. **Where boards go when there are many.** The right column stacks and
   scrolls. Fine for three; untested beyond.

---

## 13. The advanced list

A second list for after the first, offered and never pushed. After "Now,
let's focus:", one line of marginalia, "or go further", writes
`list:advanced`. The basic list teaches getting around; this one teaches
working: several sources, a collection, then shaping the space, then making
something new.

Same treatment as the basic list: the serif, one line per step, the command in
ink-3, struck through when done, any order. It is long enough to need three
short headings in the same serif; they make it read as small lists, not one
long one.

Verbs follow Branch Slider v9 (the numbered source picker, reply tabs) and
Collection Board v3 (`new:collection`, `note:`, `compare:`, `summarize:`).

| # | Step | Command |
|---|------|---------|
| | *Sources* | |
| 1 | Ask two sources at once | `p>`, then tick two in *answered from ▾* |
| 2 | Compare their answers | `compare:201a 201b` |
| | *Collection* | |
| 3 | Highlight a passage | select it, then *highlight* |
| 4 | Start a collection | `new:collection` |
| 5 | Write a note that quotes them | select the cards, then `note:"…"` |
| 6 | Summarize them | `summarize:` |
| | *Space* | |
| 7 | Add a column | `layout:"Three-panel"` |
| 8 | Add a block | `place:notes right` |
| 9 | Save your screen | `arrange:save "Research"` |
| 10 | Open this room in the Lab | `edit:"Reading room"` |
| | *Make* | |
| 11 | Create your own block | `new:block` |

- **Step 1 needs no key.** Wikipedia and arXiv are both keyless sources, so
  two answers arrive as tabs (201a, 201b) on day one.
- **Step 2 compares with no model call**, word by word.
- **Step 4's collection takes this chat as its source**, so the highlight from
  step 3 is already in it.
- **Step 6 is the only step that spends tokens.** It is marked optional and
  needs a key. If the list must be shorter, it is the one to drop.
- **Order matters.** Sources first, so there is something to compare; the
  collection next, so there is something to keep; the space after, so the
  room is shaped around real work; the Lab last but one, where the changes
  show on the Canvas; making a block last.

### `new:block`

Opens a Resources card. Everything in it is a file people can take wherever
they build: Claude Code, their own editor, anywhere else.

- **A block guide** (`BLOCKS.md`): what a block is, where it can sit, how it
  reads its room.
- **The reference for what a block may touch**, already in the Library as
  "Component catalogue and hostAPI".
- **A starter block**: a small working example to copy.
- **A prompt for Claude Code** that points it at the guide and the reference.
- **How to load a finished block**, so it appears in the Library as yours.

It pairs with "Looking for other builders" in the footer.

### Believed settled elsewhere

Noted so they are checked, not reopened:

- `compare:` on replies and branches, not only notes.
- A verb for highlighting a selection.
- What a block written by someone else may touch, especially anything near
  keys.

---

## 14. Later

Ideas to keep, not to build yet.

### `letter:`: updates, in the same voice

- **Letters ship with each release.** Updating Parliament brings the new
  letter with it, so nothing is fetched and nothing appears in the network log.
- **An unread letter shows as one line of marginalia** under the heading, for
  example "a new letter from So Lov". Clicking it writes `letter:`.
- **`letter:all`** lists every letter, newest first: a changelog written by a
  person, not release notes.
- The welcome letter is letter one.

### A header and footer you build yourself

- **Anchored bars at the top and bottom of the screen**, each with empty
  buttons the user can add to. A button is a label tied to a command. Anyone
  who wants a nav can build one; nobody is given one they did not ask for.
- **The header and footer are blocks.** They live in the arrangement like
  everything else, can be added or removed in the Lab, and are saved with
  desks (`arrange:save`).
- **Buttons follow the Enter rule.** Screen-only, reversible commands (`alm:`,
  `focus:`, `pop:`) run on click. Anything that changes or deletes things
  writes the command into the field and waits for Enter, so a button can never
  do something the Enter line has not described.
- **Made with a command**, for example `nav:add "History" alm:`. Avoid `save:`,
  which the Almanac uses for searches.
- **Key commands can never be saved to a button**, for the same reason keys
  never pass through the command line: the line keeps a history.
