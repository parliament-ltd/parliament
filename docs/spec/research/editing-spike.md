# The editing spike (stage 11, C205)

Added 24 October 2026. Not an audit: the stage 11 spike. Can a reply and its
prompt be edited in place on ProseMirror, under the editing spec's rules, in
every way a person types? Built on ProseMirror alone, as revised and approved
the same day (C205 (h): no Android phone to try a hand-built engine on).

**Where it stands:** everything a script can try works in Chromium, including
under the site's real security headers. What needs a person (typing with an
input method, a screen reader, a spelling correction) and the Firefox engine
(Zen, LibreWolf) wait for Stefan. Android is untried. No recommendation
until those are in.

## How to open it

```
npm run dev
```

then `http://localhost:5173/dev/editing`. It is in no ordinary build: only in
development, or in a build made with `VITE_PROTOTYPES=1` (then `npm run
preview -- --port 4173` serves it under the real headers, at
`http://localhost:4173/dev/editing`).

Nothing on the page is stored or sent. The replies live in the page's memory
and go when it closes. The checklist's ticks and notes are kept in that
browser only, and "Copy the results" puts them on the clipboard for the chat.

## What was built

| File | What it is |
|---|---|
| `src/spike/editing/schema.js` | A reply as a flat list of blocks, each with an id: paragraph, heading 1 to 3, list item (bulleted, numbered, checklist), quote, code block, divider, table, chart. Marks: the model's own (bold, italic, code, link: shown, never applied, C58) and the two an edit leaves, struck and added, each carrying its edit's id. Tables and charts are whole blocks. Everything draws through ProseMirror's arrays, never as HTML |
| `src/spike/editing/fromMarkdown.js` | A reply's stored Markdown read into those blocks, with the parser react-markdown already uses. The stored text is never changed |
| `src/spike/editing/track.js` | The rules (below), applied to every change before it lands; undo from a card; every edit with its place (block id and offsets); the note the model would be told |
| `src/spike/editing/keys.js` | Enter, Backspace, Delete, the `/` menu, a checklist box, paste, drop, and the browser's undo and bold turned off |
| `src/spike/editing/samples.js` | The v5 mockup's scenario (the Murano story, branches 201a, 201b, 201c), a reply with every kind of block (with Japanese and Chinese lines), and a reply of 5,000 words |
| `src/views/EditingSpike.jsx` | The page: Writing studio's column with the branch tabs, the editable prompt and reply, the line counting what goes, a card per edit (find, hold back, undo), the note, the checklist, and a log of what the browser reports while you type |
| `src/spike/editing/track.test.js` | 21 tests of the rules and keys, run without a browser |

## How the rules sit

ProseMirror turns whatever the browser did (a key, a composed word, a phone
keyboard's correction, a paste, a cut) into one kind of change. The rules
are applied to that change, not to keys, so they hold the same way for every
kind of typing (editing spec, "Editing replies"):

- Deleting the model's words strikes them. They stay in the reply.
- Typed words are the person's, in blue, with an edit id.
- Typing over a selection strikes it and puts the new words straight after
  it: one edit, one id.
- Deleting the person's own words removes them.
- A split, a join, a change of block type and a checklist tick are
  formatting, never an edit.

Before an input method starts, the cursor already carries the person's mark,
so a composed word is drawn as theirs from its first character, and the
change ProseMirror reads while composing lands exactly as the browser made
it. Over a selection, the selection is struck the moment composing starts,
so nothing is rewritten under a word while it is being composed.

## Tried, by script, in Chromium (the in-app browser)

Real key events where the window allowed it, the browser's own text
insertion otherwise.

| Check | Result |
|---|---|
| v5's scenario: "eleven years" typed over with "nearly a century" in 201a | One edit, struck then blue; the card and the note right |
| v5's scenario: "short" to "ghost" in 201a's prompt | One edit, prompt only; the line under the prompt says the other branches keep theirs |
| Backspace five times at the end of "heels", then "feet" | "heels" struck as one edit, "feet" joined to it; the cursor stayed before the strike |
| Selection across two paragraphs, Backspace | Both parts struck, one edit, both paragraphs kept |
| Enter in the middle of a line | A new block with its own id; an edit split by Enter stays one edit with a place in each block (test) |
| Paste of formatted HTML with an image and a script | Plain text only; no image, no script ran, no bold; over a selection it struck the selection |
| Ctrl+Z | Nothing changes; the page says undo is on each card |
| Undo on a card | The words come back exactly (a test compares the whole document) |
| `/` at a line's start, typed filter, Enter | The menu; "Heading 1"; typing after it blue |
| Backspace at a heading's start | It turns plain; no edit |
| A checklist box | Ticks in place; no edit |
| A table: click, Backspace | Selected as a whole, struck as a whole; undo from its card restores it |
| A Japanese character and an emoji with a skin tone, Backspace | The whole character struck, never half of one (test) |
| 5,000 words: typing, Backspace and Enter in the middle | 0.6 to 5.1 ms per change, rules and redraw included (a screen frame is 16 ms) |
| Under the real headers (`VITE_PROTOTYPES=1`, `vite preview`) | No policy violation while loading, typing over, pasting or switching branches |

## Waiting for Stefan

On the page, under "Your part of the checklist", each with what to do:

1. Japanese with the Windows input method: convert, confirm with Enter (the
   line must not split), cancel with Escape.
2. Chinese with Microsoft Pinyin, the same.
3. Composing over a selection.
4. Narrator, with "say marks" on and off: does it tell removed from added?
5. A spelling correction from the browser's menu.
6. Zen or LibreWolf (Firefox's engine): no Firefox driver is installed here,
   so the Gecko engine was not tried by script, as C205 (h) had hoped.
7. Android: untried, no phone (C205 (h)).

## Found on the way, and what was done

1. **A word swapped in one go reads as a strange strike.** When the browser
   swaps a word whole (autocorrect, a keyboard's suggestion, a composed word
   committed, here "short" to "ghost"), ProseMirror sees only the smallest
   difference and kept the shared last letter: "shor" struck, "ghos" added,
   and the "t" left standing between them and the rest. Such swaps of
   the model's words are now widened to whole words. Only in scripts that
   put spaces between words; Japanese and Chinese are left as they come.
2. **Typing after Backspace puts the new words before the strike**
   ("feet ~~heels~~"), as a word processor's tracked changes do: the cursor
   stays where Backspace left it. Typing over a selection puts them after.
   The card reads struck → added either way.
3. **Words typed beside an old strike join its edit,** even one already sent.
   In the spike nothing is truly sent; the build must start a new edit
   beside a sent one.
4. **Drag and drop is off in the spike.** Moving words would be a strike and
   an addition at once, and dropped content would have to be read like a paste.
5. **Lists are flat blocks,** so a screen reader does not hear "list, 3
   items". The build needs real lists or the matching labels.
6. **Block ids stay unique:** a split the browser makes itself (a phone
   keyboard's Enter) copied the line's id; a guard now gives it a new one.
7. **The Markdown reader** comes in through react-markdown. A build would
   name it as Parliament's own dependency.
8. **The `/` menu's filter read keys only,** so text from an input method or
   a phone keyboard went into the line instead. It now reads typed text.

## ProseMirror and safety

- **Fetched** on Stefan's yes (24 October), after his concern that a new
  package can open the door to vulnerabilities. Five packages and two small
  helpers, all by one author, MIT licence, none with an install script, each
  pinned to an exact version public for at least a month (not the release
  made that morning). The lockfile's checksums mean nothing changes unless
  someone updates on purpose.
- **Read before use:** no network calls, no running of text as code, no
  cookies or storage. The one place it turns text into HTML is a pasted or
  dropped HTML clipboard, parsed in a detached document where scripts do
  not run; the spike takes paste and drop first, as plain text, so that path
  is never reached.
- **Not in the app:** only on `/dev/editing`, in development or a prototype
  build. An ordinary build leaves it out.
- **Size:** about 187 KB, 58 KB compressed (the charts library the app
  already ships is 417 KB). The spike's page is 225 KB, 72 KB compressed,
  with the Markdown reader and the samples.
- **Already in the app, found by the install's audit:** three advisories, in
  build and lint tools only (`fast-uri`, `serialize-javascript`, `zod`),
  none in what reaches the browser. Not touched here.
- **A stronger step, if chosen:** copy ProseMirror's code into the
  repository, as ruled for the spreadsheet library (C72), so any update is a
  change in git that can be read line by line.
