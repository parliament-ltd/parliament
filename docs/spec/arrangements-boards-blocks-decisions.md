# Arrangements, boards and blocks: decisions

Revised September 28, 2026, second revision. Replaces "Components and
arrangements: decisions" from earlier the same day, and folds in the homepage
and Lab review (`parliament-homepage-current.html`,
`parliament-lab-current.html`), Lab v1 to v6 and Screens v1. The current
mockups are `parliament_lab_v6.html` and `parliament_screens_v1.html`.

Status marks: **Decided** (you ruled on it), **Proposed** (suggested, not yet
confirmed), **Open**, **Deferred**.

---

## 1. Glossary

**Decided, as working names.** These are placeholders until better words turn
up. Every user-facing noun lives in one copy table in the code, so renaming is
a one-file change rather than a refactor.

| Word | Means |
|---|---|
| **Arrangement** | What is on your screen or screens, popped windows included. What used to be called a page. |
| **Board** | Something built from blocks. The Almanac, Library, Collection, Docket, and every room. |
| **Room** | A board built around a conversation. Every room is a board; not every board is a room. |
| **Block** | A piece: messages, input, highlights, notes, contents, the table, the filter rail. |
| **Block feature** | Something a block can do, switched on or off or set to a value. Web search is a feature of the input block. |
| **Theme** | The colour and type inside a room. Replaces "scheme". |
| **Layout** | Where blocks go inside a room. Kept separate from arrangement. |

"Component" stays in the code, the catalogue contract and the mode file. It is
never shown to users.

**The test for which level a thing belongs to:** if it can be opened, closed,
moved or popped on its own, it is a board. If it only works as part of
something, it is a block. If it changes what a block does, it is a feature.

---

## 2. The model

**Decided.** Pages are **arrangements**: predetermined combinations the user
does not have to follow. Anything can be opened, called and closed at any time
from the command line.

**Decided.** An arrangement includes popped windows. This settles what the
earlier doc deferred as "folding window arrangements into arrangements".

**Decided.** The Library, Collection and Docket are **boards**. They ship
prebuilt and are editable in the Lab like any room. They are the built object;
blocks are the pieces.

**Decided.** The Lab is an **arrangement** of two boards: the Library and the
Canvas. The collection is not part of it, but can be called into it at any
time (`open:collection`, or `add:`/`compare:` with the collection addressed).

**Proposed.** The Almanac is an arrangement too: its middle board is
**History** (everything you have made, in one table) and the collection sits
beside it. "Almanac" stays as the arrangement's name. This replaces "the
Almanac is a board" wherever it appears below.

**Decided.** A **room** is a board built around a conversation. The current
pages are not rooms.

**Decided.** Blocks are interface; **content** is what they show. The docket's
steps, the Almanac's rows and a room's messages are content, not blocks. So
"add a block to the docket" and "add a step to the docket" never mean the same
thing.

### Rules for rooms

- **Proposed. One level deep.** Rooms go inside arrangements. Boards never go
  inside rooms.
- **Proposed. Every room has one conversation:** one messages block and one
  input block. This replaces "exactly one Symposium per room".
- **Open.** Whether "Symposium" stays a user-facing word, and what `sym:` goes
  to, now that the conversation is what a room is rather than a component in
  it.
- **Proposed. Scope follows the boundary.** A room's theme applies inside its
  edges only. A room declares the capabilities its blocks need, and consent
  prompts name the room.
- **Proposed. Editing enters the room.** In the Lab a room selects as one
  board; `edit:` exposes its slots.

### Blocks outside rooms

**Proposed.** A block placed straight into an arrangement (notes on their own,
for example) gets a one-block board around it automatically, so the level test
never breaks.

### Block features

**Decided.** Web search, voice input and file attach are **features of the
input block**, not blocks.

**Proposed.** "Feature" is a describing word, not a separate noun in the
grammar. Switching web search on and setting the default highlight colour are
both changes to a block: both are marginalia pickers on the block, and both go
through `set:` (`set:input web search on`). In the Library a block's entry lists
its features, and searching "web search" finds the input block with that line
marked.

**Proposed.** Features never contain features, and blocks never contain blocks.

---

## 3. Placement

**Decided.** Some blocks cannot go in rooms. Placement comes from what a block
reads:

| Placement | Reads | Examples |
|---|---|---|
| Arrangement only | Across all records | Almanac, Library, Settings (boards) |
| Room only | One conversation | Contents, highlights, branch view |
| Either | Works alone, or scopes to a conversation | Notes, source panel |

**Proposed.** Placement is a field on each catalogue entry, alongside which
slots a block fits.

### The docket

**Proposed.** The docket is a board, so under the one-level rule it cannot sit
inside a room. What goes in a room is the docket's **step list block**,
following that room's conversation. The docket board in an arrangement shows
whichever docket you address. This keeps "either" from the earlier doc without
nesting a board inside a room.

It must say which it is following, with marginalia such as "following this
chat" or "201". **Open:** whether a pin is needed to hold a room's docket still
while viewing other chats.

---

## 4. Verbs

**Decided.** A verb does the same act on every board and every item. The
target is the one named, or the one the navy rule is on.

| Verb | Does | Status |
|---|---|---|
| `open:` | Brings a board or item onto this screen, or focuses it if it is already here | Proposed |
| `close:` | Takes it off the screen; nothing is lost | Proposed |
| `pop:` / `pop:back` | Its own window, or back | Decided (Almanac) |
| `move:` | Where it sits | Decided (Almanac) |
| `arrange:` | Switches to, or saves, a whole arrangement | Proposed |
| `edit:` | Opens a board in the Lab. On an item: *207 is a chat; edit: works on boards* | Proposed |
| `add:` / `rm:` | Into, or out of, whatever the navy rule is on: the room, or the collection | Decided |
| `delete:` | Destroys it | Decided |
| `inspect:` | One thing in detail, anywhere | Decided |
| `set:` | A block's settings and features | Proposed |
| `name:` | Names or renames whatever the navy rule is on; with an id, an Almanac item | Decided |
| `theme:` | A room's colour and type | Decided |

Three levels of "make it go away": `close:` takes it off the screen, `rm:`
takes it out of a container, `delete:` destroys it.

- **Decided.** `inspect:` replaces `peek:` and its alias `read:`. One word, no
  alias.
- **Decided.** `theme:` replaces `scheme:`. The mode file may keep `scheme`
  internally.
- **Proposed.** `hide:` and `show:` retire; `close:` and `open:` do their job.
- **Proposed.** `rm:` follows the navy rule. With the canvas addressed,
  `rm:notes` takes notes out of the room; with the collection addressed, out of
  the collection. `hold:` is dropped: the holding tray existed because drag and
  drop needed somewhere to set things down, and commands move things directly.
- **Proposed.** `alm:`, `sym:` and `library:` become shortcuts for `open:`, or go.
  `lab:` stays, because the Lab is the shell's editor, not a board. This
  answers the earlier doc's open item on naming shipped arrangements:
  `open:history` focuses the History board or adds it here;
  `arrange:"Almanac"` switches to the shipped arrangement (if §2's proposal
  holds).
- **Decided.** `layout:` is the shape of a room, and stays separate from
  arrangement. In the Lab, "save this arrangement" must never be able to mean
  the room on the Canvas. The Almanac's page-level `layout:` moves to
  `arrange:`.
- **Decided.** `name:` replaces `rename:` everywhere.
- **Decided.** `add:` puts things into the addressed container. With the Canvas
  addressed, blocks go to their first free place, a layout replaces the
  layout, and a theme repaints the room. A room has one layout and one theme,
  and the Enter line refuses two. `place:` stays for choosing a slot.

---

## 5. The Lab

- **Decided.** The Lab is the Library and the Canvas (§2). The middle board is
  called **Canvas**, plainly, so it can be called like the others.
- **Decided.** The Lab's three jobs are the field's three modes. Search finds
  things in the Library (where the Lab rests), `>` changes the room, `p>` tries
  the room.
- **Decided.** Trying a room with `p>` keeps the exchange as chats, tagged
  "tried in the Lab", and the Enter line says it spends tokens.
- **Decided.** No drag and drop. Clicks that change a room write the command
  and wait for Enter. Clicks that only move things around the screen act at
  once: bringing a window back, opening a closed board.
- **Decided.** No "pop out" text on any board, as in the Almanac. A clear board
  name is what matters; popping is found through the field.
- **Decided.** The inspector is dropped. `inspect:` replaces it.
- **Decided. The room line.** Under the Canvas's top row, one line, centred
  vertically: the room's name, its pickers on the left (layout, theme, built
  for), its actions at the right end (name, inspect). Select a block and the
  same line reads "Writing Studio / Highlights" with that block's pickers.
  It changes what it says rather than moving. Each picker's menu opens with a
  heading naming what it changes, so the line shows values without keys. Rail
  buttons live in the room's details.
- **Decided. Library details open in place.** In its slot, the Library opens
  an item's details right under the item clicked. Popped out, it shows them in
  a side column beside the grid. Clicking a row opens details; the checkbox
  selects.
- **Decided. Ticking.** Blocks, layouts and themes have checkboxes; rooms,
  boards and resources do not, because they do not go into a room. A line
  under the filters says what is ticked, with "add to room" (which writes
  `add:`) and "clear". Ticks survive a change of filter or search. Anything
  with no free place stays ticked.
- **Decided.** The Library's marginalia is facts only. Rooms keep one action
  (edit here, or duplicate); boards keep open.
- **Decided.** The Library is one board, callable anywhere, and keeps room
  templates, every layout, resources, coming-soon items (greyed) and the
  detail information.
- **Decided.** The guide lives in the Lab: on a first visit, dismissable, and
  on `new:room guided` at any time. Each answer writes a command.
- **Decided. Slot highlighting.** Hovering a block in the Library, or typing
  `place:` with a block named, lights up where it fits: its best free slot
  strongest, other fitting slots gently, full or unsuitable ones dimmed with a
  one-line reason. Navy, not gold.
- **Decided. The medium canvas.** The earlier canvas's depth (the well, the
  lifted room, soft slot areas, raised blocks, the theme's accent dot, message
  bubbles) with the Almanac's type (letter-spaced slot labels, a block's state
  as one line of italic marginalia, features as tags, the navy rule for
  selection). The style switch in Lab v6 goes before handoff.
- **Deferred.** Editing layouts by rows and columns.

---

## 6. The collection

**Open. Revisit the collection in its own session.** It has to justify the
space it takes. Two ideas to start from: it takes space only when something is
in it, and it turns a set into a next step (a docket built from what is
collected, a draft from its sources, a comparison kept as a note).

- **Decided.** The collection is a board, connected to a source. It starts the
  moment something is added; its source is wherever that first thing came
  from. Nobody types a source.
- **Decided.** Visible numbering, section breaks (`section:`), notes in context
  (a note on a collected thing that travels with the collection, not the
  thing), and pinning a collection.
- **Proposed.** The four actions stay in the same four places for every source;
  only the third changes meaning.

| Source | Compare | Third | Ask (`p>`) | Export |
|---|---|---|---|---|
| Almanac | Diff two, align more | Open | A synthesis, kept as a chat | md or jsonl |
| Library | Side by side, differences washed | Apply | "How are these different?" | Mode file |

- **Proposed. Facts are free; the model is for judgment.** "Used in 2 of your
  rooms" is read from your data and shown as marginalia at no cost. The
  comparison table spends no tokens. Questions of judgment go through `p>`.
- **Proposed.** `p>` goes to the addressed board: the room when the canvas is
  addressed, the collection when the collection is.

---

## 7. From the homepage review

The Almanac replaces the homepage. These are the things the homepage had that
the Almanac did not.

### Commands

- **Decided.** `backup:` and `restore:` open their modals. With arguments,
  `backup:` pre-fills categories.
- **Proposed.** The backup nudge is marginalia at the top of the Almanac, not a
  banner, and only appears when it is news: never backed up, or past the
  reminder interval. Ink, not gold.
- **Decided.** `summarize:207, 216` rewrites each item's own summary line.
- **Proposed.** `summarize:"Q2 evidence"` writes a collection's description line;
  `p>` "summarize these" writes one synthesis as a new chat. The Enter line
  states the difference.
- **Decided.** `delete:` is universal: ids, ranges, branches, dockets, rooms.
  `archive:` stays alongside it.
- **Proposed.** `delete:` never picks its own target; records outlive their
  parents (chats keep "from a deleted docket"); a deleted branch's letter is
  never reissued; running things must be stopped first; Library items cannot be
  deleted; `undo:` works until you leave the page.
- **Decided.** `note:"text"` with no id makes a free-standing note. Replaces the
  scratchpad on the homepage; the scratchpad block stays for rooms.
- **Decided.** `settings:` and `settings:data`. Delete everything stays a button
  in Settings, not a verb.
- **Decided.** `resources:` from anywhere, as a pop-out; resources also live in
  the Library. The docket spec's `docs:` verb is dropped; the generated verb
  reference is one of the resources.
- **Decided.** `new:room` opens the Lab. `duplicate:` (alias `dup:`) is universal
  and copies a room, collection or docket, opening the Lab for a room.
- **Proposed.** Names resolve to yours first, then templates; a copy takes a name
  that does not collide ("Writing Studio 2").
- **Decided.** `tour:` tours the current arrangement; `tour:docket` tours one
  board.
- **Proposed.** `home:` goes home; `home:set "Writing Studio"` changes where home
  is. Home may be the Almanac (default), a room, a docket, or `last`.
- **Decided.** Rooms are addressed by name, not id, for now.
- **Decided.** Dropped with the homepage: the blueprint and its overlay, the room
  spotlight, quick stats, and recent activity (the Almanac's columns cover it).

### Contradictions resolved

- **Decided. Restore collisions.** Identical items are skipped. An item with a
  colliding id and different content comes in as a copy with a new id; every
  reference inside the backup is rewritten to match, and its marginalia says
  "restored, was 207". The preview gives counts before anything changes.
- **Proposed. Old formats.** The .apb and JSON writers go; their readers stay,
  so every backup ever written still restores. Every future `.parliament`
  version keeps a reader too.
- **Decided. Backup categories.** Window arrangements become an option.
  Homepage configuration is dropped.
- **Proposed.** One category, "layouts and preferences", covers the whole
  platform.
- **Proposed. Favorites** migrate into a collection called Favorites, in their
  existing order, rather than becoming pinned highlights. Replaces ruling C20.
- **Proposed. Tags.** AI-made and user-made tags share one pill, as v30 already
  draws them. Who made each is kept in the data, so `inspect:` can say
  "suggested by the model" and AI tags can be cleared together.

---

## 7a. Screens

- **Proposed.** No new verbs. Bare `arrange:` shows a map of the arrangement
  across screens; everything done there is an existing verb (`pop:library
  display 2`, `pop:back`, `move:`, `open:`, `close:`, `arrange:save`,
  `reset:`, and `name:`, `duplicate:`, `delete:` on a saved arrangement).
- **Proposed.** Nothing happens by itself when a screen is connected.
- **Proposed.** "Extra screen detected" appears once, as marginalia under the
  field; clicking it writes `arrange:`. Placing a window on another screen asks
  the browser's permission once, and the Enter line says so first.
- **Proposed.** With one screen, `arrange:` shows the map and a line at the
  bottom says "No external screen detected". In a browser that cannot place
  windows on other screens, that line says so instead.
- **Proposed.** Each screen is labelled with marginalia: which display, how
  wide, and whether this window is on it.

See `parliament_screens_v1.html`.

---

## 8. Customization

**Decided.** Customization is part of Parliament's purpose and is never
required. Ship sample sets of everything. Arrangements can be saved. `reset:`
returns a shipped arrangement to its suggested default.

### Proposed floors

- The command line stays part of the shell, not a board, so `lab:` always works.
- The Lab cannot edit its own arrangement.
- At least one arrangement contains a room.
- Config is editable; invariants are not. The Almanac's columns and the docket's
  marginalia density can change. Runs being immutable, selection surviving a
  change of search, and collections holding pointers cannot.

### Proposed: execution becomes a capability

"Only the Symposium executes" was a surface rule. It becomes a declared
`execute` capability. Rooms and the docket declare it; the Almanac does not
unless deliberately given it.

---

## 9. Performance

Unchanged from the earlier doc. Composability costs little; the risk is live
blocks updating more than they need to.

- **Streaming.** Tokens in a conversation must not re-render neighbours. Each
  block subscribes only to the data it shows.
- **Running docket timer.** Its own narrow update path.
- **Broadcast repaints.** Replace `paintAll()` with repainting only what changed.
- **Large Almanacs.** A few thousand chats is fine. Tens of thousands need row
  virtualization and IndexedDB indexes for search.
- **Lazy loading.** Code for blocks not in the current arrangement loads only
  when placed.

Cheap if they are in the component contract from the start; expensive to
retrofit.

---

## 10. Open

1. Whether "Symposium" stays a user-facing word, and where `sym:` goes. Kept
   for now: it names a flow across rooms and screens, not one screen.
2. The Almanac as an arrangement, with History as its middle board (§2).
3. The collection's purpose and features (§6).
4. Docket pin (§3).
5. Two boards of the same kind on one screen: how to call each (for example
   `pop:canvas "Essay room"`).

## 11. Deferred

- Editing layouts by rows and columns.
- Mobile behaviour of arbitrary arrangements.

## 12. Changes required elsewhere

- **Almanac spec and v30.** `peek:` and `read:` become `inspect:`; `scheme`
  becomes theme; `hide:`/`show:` retire if §4 is confirmed; page `layout:` moves
  to `arrange:` if §4 is confirmed; add `backup:`, `restore:`, `delete:`,
  `summarize:`, `settings:`, `resources:`, `tour:`, `duplicate:` and `home:`.
  "The room is a lens, not a fourth surface" is superseded. `rename:` becomes
  `name:`. The table board is called History if §2's proposal holds.
- **Refactor docs.** "A room is a special type of component that holds
  components" becomes "a room is a board built around a conversation".
- **Component catalogue.** Add placement, the features each block offers, and
  capability declarations. Messages and input are blocks; web search, voice
  input and file attach become features of input. Homepage-scoped components
  (Blueprint, Chats, Favorites, Library, Quick stats, Recent activity) retire.
- **Lab mockups.** v1 to v5 are superseded by `parliament_lab_v6.html`.
- **Claude Code prompt.** On hold.
