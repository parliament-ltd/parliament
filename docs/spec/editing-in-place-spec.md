# Editing in place: replies, prompts, asks, Ripple, collab, Reflection, focus and calm

Oct 6, 2026 · @Just call me Sam

## Purpose and sources

In Parliament the conversation is working material: every reply and every prompt can be edited in place, and every change is kept as a card in the Collection. Other tools edit a separate document beside the chat; Parliament edits the chat itself.

This spec covers v5, `parliament-inline-editing-v5.html`. It builds on:

- `welcome-inline-editing-spec.md` and `parliament_welcome_v9.html` (strike, the Collection card, notes for the AI). Where they disagree, this spec wins.
- `parliament-branch-slider-v9.html` (branch tabs, reply to one or all, `open:` with or without a summary).
- `parliament-collection-board-v3.html` (cards, ids, finding an item in both directions).
- Secretarybird mode (`secretarybird-mode.jsx`) and the Ripple notes (`starling-ripple-and-naming.md`): three colours for struck, added and suggested text, accept or reject, a markup switch, and Ripple.

## Editing replies

Every reply is editable, always: click in and type. There is no edit mode and no edit button.

- **Deleting strikes.** The words stay in the reply, struck through, in ink-3.
- **Typing adds your words in your ink**, a blue.
- **Typing over a selection** strikes it and puts your words straight after it. The struck and added halves are one edit with one id, for example *eleven years → nearly a century*.
- **Deleting your own added words removes them.** They were never the AI's, so there is nothing to keep.
- **Each edit is a card in the Collection,** updated live as you type: what was struck, what was added, the branch, and its state.
- **Undo is on the card.** The browser's ⌘Z is turned off in replies, because it does not understand struck text.
- **Formatting is not an edit.** Enter starts a new block and / formats a line (see Blocks and the / menu); neither creates a card or reaches the model. Bold and italic shortcuts do nothing.

Hovering a reply shows a faint wash; focus adds a hairline ring, as in welcome v9.

## Editing prompts

Your own prompts are editable the same way, struck and blue, with a card for each edit. A prompt edit stays in its branch.

- **Each branch keeps its own copy of the first prompt.** The prompt bubble shows the copy for the branch being viewed. Editing it while viewing 201a changes 201a's copy only.
- **Why:** people reword a prompt to see a different reply, not to change every branch at once. Carrying an edit to the other branches is Ripple's job, never automatic.
- **A follow-up prompt** belongs to its branch, and so do its edits.
- **Under an edited prompt** a line reads *your prompt in 201a, edited; the other branches keep theirs · ask again as 201d*. Asking again starts a new branch from the edited wording and leaves 201a, b and c as they were. New fan-outs take new letters.
- **In a prompt the selection menu offers strikethrough only.** Asks and highlights are for replies; ⌘K in a prompt says so.

## When edits reach the model

Edits go to the model with the next prompt to their branch, once, as a note of what changed. The original is not replaced in what the model reads; telling it once keeps the cost down.

- **The default is that edits go.** This reverses welcome v9, where edits stayed yours until you chose "Note for the AI".
- **Hold back** on a card keeps that edit yours; it never goes until you let it go.
- **The line under the field counts what will go:** *3 edits and 2 asks go with your next prompt to 201a*.
- **Enter on an empty field** sends just the pending edits and asks, with no new prompt.
- **After sending,** each card reads *sent to Sonnet 4.6, Oct 6*. The model's next reply says it has read them.
- **The branch tab counts** pending edits and asks in your ink, for example *a Sonnet 4.6 3*.

## Asks

An ask is an instruction to the AI, typed in your own words and tied to a passage or a point in a reply. There are no quick-action buttons; "expand", "more concise" and "make these names sound more Italian" are all just typed.

1. **Start one.** Select text and choose *ask* (⌘K), or place the caret and press ⌘K for a point, such as "add some historical data after this point".
2. **Write it.** A small box opens in the text, labelled ASK. Its placeholder suggests two examples, which teaches the idea without buttons.
3. **Keep it.** Enter leaves a marker, *ask 241*, and a card. Escape drops it.
4. **It waits.** Like edits, an ask runs with the next prompt to its branch, or on an empty Enter.
5. **The answer lands in place,** in green, with the original struck in green and a marker: *ask 241: accept · undo*.
6. **Settle it.** Accept makes the answer part of the reply; undo puts the original back. Both work inline and on the card, which keeps the instruction and the answer.

A queued ask can be dropped from its card. Clicking a marker finds its card.

## Branches

Each branch keeps its own edits and asks, and they only ever go to that branch.

- **Replying to one branch** sends that branch's pending edits and asks.
- **Replying to all three** sends each branch its own. The line under the field lists them per branch: *Each branch gets its own: 201a: 1 edit and 1 ask · 201c: 1 ask*.
- **Tabs carry two counts** when needed: pending edits and asks in your blue, open Ripple suggestions in rust.
- **The reply target** is the toggle from the slider spec, *to 201a · all three*, with the placeholder repeating it.

## Keyless sources

Text from Wikipedia, or any keyless source, comes in as text you can highlight, edit and ask about like any reply. Those edits and asks go to a model you choose, never to Wikipedia.

- **Said once, in place.** Under the Wikipedia tab: *Wikipedia supplies the text. Mark it, edit it, ask about it: those go to Sonnet 4.6, never to Wikipedia.* The model name is a picker.
- **Named wherever it matters after that:** the ask box (*ASK · SONNET 4.6*), its marker (*ask 248 · Sonnet 4.6*), the card (*answered by Sonnet 4.6*), and the line under the field (*1 edit and 1 ask go to Sonnet 4.6 with your next prompt · Wikipedia reads none*).
- **A prompt typed to the Wikipedia branch searches Wikipedia again.** The placeholder suggests one: *find me examples of Murano glass*. The results come in as text, ready to mark, edit or ask about.
- **This supersedes welcome v9's rule** that notes on a Wikipedia branch wait for the next prompt to a model.

## Ripple across branches

Ripple carries an edit from one branch to the others, as suggestions you accept or reject. It is off by default because each check is a model call.

- **The switch** is marginalia in the chat's head, beside *markup · clean*: *ripple: off*. Turning it on says once what it does and that it costs a call per check.
- **When it runs:** when edits are sent. It looks in the other branches for the same thing. A prompt edit is checked against the other branches' prompts; a reply edit against their replies.
- **Suggestions appear in place,** in rust: the words struck, the suggested words after them, and a marker *ripple 244: accept · reject*. They also appear as cards under the Collection's Ripple tab, each saying *the same as your edit 242 in 201a*.

Reviewing them is one pass:

1. The Ripple tab opens with a review bar: *‹ 1 of 3 ›, accept, reject, accept all*.
2. Moving through suggestions switches the chat to that branch and flashes the spot. Suggestions are ordered by branch.
3. A accepts, R rejects, and the arrow keys move, whenever no text is being edited.
4. **An accepted suggestion becomes your edit** in that branch, in your blue, and goes with your next prompt there like any other.
5. A rejected one leaves the branch as it was.

In the mockup Ripple matches words. In the product it should also catch meaning (a changed date, a renamed character described differently), which is what the model call buys.

## The Collection

Every edit, ask and Ripple suggestion is a card in the Collection beside the chat, grouped by branch. The Collection is the record; the chat is where the change lives.

| Card | Shows | Actions |
| --- | --- | --- |
| Edit | struck → added, the branch or *your prompt in 201a*, its state | find, hold back or let it go, undo |
| Ask | the passage it is on, the instruction, the answer once there | find, drop (queued), accept or undo (answered) |
| Ripple | *the same as your edit 242 in 201a*, struck → suggested | find, accept, reject |
| Highlight | the passage | find |
| Sweep | the collab and its rule, struck → suggested sentence | find, accept, reject |

- **Tabs:** All, Edits, Asks, Suggestions (Ripple and sweeps), Highlights, each with a count. The Suggestions count turns rust while any are open.
- **markup · clean** in the Collection's head, separate from the chat's. Clean shows each edit's result only.
- **Finding in both directions:** a card's branch link moves the chat there and flashes the spot; clicking an ask or Ripple marker in the chat finds its card; new edits flash their card as they are made.
- **A legend** under the tabs names the four colours while markup is on.

## Colour and vocabulary

Four marks, toned down from Secretarybird's to suit Parliament's palette. Gold stays reserved for the live action.

| Mark | Means | Mockup value |
| --- | --- | --- |
| Struck, ink-3 | yours, removed | ink-3 with an ink line |
| Blue | yours, added | #2F5DA8, solid underline |
| Green, dotted underline | an ask's answer, waiting for you | #2E7458 |
| Rust, dotted underline | a Ripple suggestion, waiting for you | #94491F, dashed underline |
| Green, struck and dotted | a sweep suggestion, waiting for you | #2E7458, as an ask's answer |

- **markup · clean** in the chat's head: clean shows the result without markup and is read-only. From Secretarybird's markup switch.
- **Selection menu:** *strikethrough ⌘⇧X · ask ⌘K · highlight*.
- **Commands:** `strikethrough:` (proposed, replacing `strike:`: gentler and more exact). Asks need no command, since they are always tied to a spot. `open:201a` and `open:201a summary` are unchanged. collab: sets standing instructions (see collab:).

## Decisions and what they replace

| Decision | Replaces |
| --- | --- |
| Edits go with the next prompt by default; hold back keeps one yours | v9: yours until "Note for the AI" |
| The model is told once, as a note; the original is not replaced in what it reads | v9 open item 1 (now closed) |
| Prompt edits stay in their branch; only Ripple carries them across | v2 mockup: shared prompt edits went to every branch |
| Asks are typed; no quick-action buttons | Expand / More detail / More concise as buttons |
| Keyless-source edits and asks go to a chosen model, named in place | v9: they wait for the next prompt to a model |
| Ripple is opt-in, marginalia in the chat head, reviewed one at a time | Secretarybird: a toolbar toggle and notifications |
| `strikethrough:` | `strike:` (v9 open item 4) |
| Edits get their own Collection tab, with markup and clean | Collection board v3 tabs: All, Highlights, Notes, Quotes |
| Replies take blocks through /; formatting is never an edit | v3: Enter and formatting did nothing in a reply |
| collab: for standing instructions, built in and your own, stacking | Parrots and the Collaboration Mode modal |
| Reflection is its own board, Ref:, that reads and never writes | The review modal's synthesis, prompts and reflection box (the modal itself stays for now) |
| Sweeps share Ripple's review bar under a Suggestions tab | v3: a Ripple tab |
| focus: keeps a set you choose (focus:sym col), saved with focus:save | Welcome v8/v9: focus: always meant the chat alone |
| calm: for less detail; nothing removed, detail on approach | A hide-marginalia button (rejected) |
| Marginalia at 62% ink and 11.5px; a distinct underline per mark | 46% ink at 10.5–11px; colour alone for blue, green and rust |

The in-chat review modal in the current code is not replaced by any of this; it is reviewed separately.

## Blocks and the / menu

Replies take blocks, as Secretarybird offered: type / at the start of a line to format it. Formatting is yours and is never an edit, so it never reaches the model.

- **The menu:** Text, Heading 1, Heading 2, Heading 3, Bulleted list, Numbered list, Checklist, Quote, Code block, Divider. Typing after / filters it; arrows and Enter pick; Escape or Backspace on an empty filter closes it. Its footer says *Formatting is yours; it is never sent to the model.*
- **Enter starts a new block.** The text after the caret moves into it. Enter on an empty list item leaves the list.
- **Backspace at the start of a line:** a formatted block becomes plain text; a plain one joins the line above.
- **Checklist boxes tick in place.** Ticking is not an edit.
- **Words are still edits.** Text typed into a new block is blue and gets a card; the block's type does not.
- **Not offered:** date and dropdown, which belong to documents rather than replies.

What this changes technically:

1. **Storage.** A reply is a list of blocks, each with an id, a type and its text, rather than one HTML string. Type and text are stored apart, so a formatting change can never produce an edit.
2. **Anchors.** Edits, asks, highlights and suggestions point to a block id and an offset in it, not into the whole reply. They survive splits and joins; an edit split by Enter stays one edit because both halves share its id.
3. **Input handling.** Parliament handles Enter, Backspace at a line start and / itself rather than leaving them to the browser, whose behaviour differs.
4. **What the model is told.** Edits are described as text only (struck words, added words, where), so formatting never leaks into the note.

## collab:

A collab is a saved standing instruction about how the AI should work, sent with every prompt until turned off. It replaces both Parrots and the Collaboration Mode modal: they were the same thing, a system-prompt addition, and instructions about behaviour change outputs more reliably than personas do.

| Collab | Command | What it asks |
| --- | --- | --- |
| Challenge artifacts | `collab:challenge` | Question what it is given instead of taking it as settled |
| Show reasoning | `collab:reasoning` | Lay out the steps before the answer |
| Push back on me | `collab:pushback` | Disagree when it thinks you are wrong |
| Offer alternatives | `collab:alts` | Give two or three ways, not one |
| Flag uncertainty | `collab:uncertain` | Say how sure it is, and where it is guessing |
| Your own (Editor in the mockup) | `collab:editor` | Make each sentence more concise; never combine sentences |

- **In the field:** marginalia beside the reply target, *collab: none*, or *collab: Editor +1* when set. It opens a picker in the answered-by picker's shape, grouped *Built in* and *Yours*, with numbered boxes.
- **They stack** in the order ticked. The line under the field names them: *collab: Editor, Flag uncertainty goes with each prompt*.
- **The command** sets them directly: `>collab:editor`, `>collab:pushback, uncertain`, `>collab:off`.
- **A reply names the collabs it worked under.**
- **Your own** are written in Settings, where *My Parrots* was. The bird name can stay as the Settings label if wanted; the command and the marginalia say collab.

## Reflection

Reflection is its own board, `Ref: 201`, where you and the AI talk about a chat without touching it. It reads the chats it is given and everything marked in them; it never writes to them.

| Section | What it shows | Cost |
| --- | --- | --- |
| Marked so far | Counts of edits, asks, suggestions and highlights, and which branches | No call |
| Session | Messages, tokens, cost | No call |
| Synthesis | What you have been steering toward, and what you have not touched | Reflect: one call |
| Prompts for reflection | Three questions drawn from your own markings | Same call |
| A proposal | A sweep, when replies show a pattern a collab could fix | The sweep is one more call |
| Talk about the chat | A conversation about the chat; clicking a prompt fills it | A call per message |

- **It opens free.** Nothing is spent until Reflect, which names its model: *Reflect · 1 call to Sonnet 4.6*.
- **Kept separate.** The board's head says *reads, never writes*, and its input says *Nothing said here goes back into 201*.
- **Its source** is picked like any board's: a chat, several, a docket or a collection.
- **A collab shapes it.** Reflecting under *Push back on me* or a Skeptic of your own changes what it notices.
- **The in-chat review modal is not replaced.** It is reviewed separately against this board.

In the mockup the reflection's input sits inside the board. In the product it is the field, addressed to the board like any other.

## Sweeps

A sweep applies a collab's rule across a reply, a branch or every branch, as one suggestion per sentence. Ripple carries your edit; a sweep carries a rule.

1. **Start one** from a Reflection proposal (*Sweep 201a as Editor · 1 call*), or from the chat with a collab set.
2. **Suggestions land in place,** in green: the sentence struck in green, the suggested one after it, and a marker *sweep 245 · Editor: accept · reject*.
3. **They join Ripple's suggestions** under the Collection's Suggestions tab. Each card names its rule: *collab: Editor, "Make each sentence more concise. Never combine sentences."*
4. **One review bar for both:** *Review · 4 sweep suggestions from Editor · ‹ 1 of 4 › · accept · reject · accept all*, with A, R and the arrow keys.
5. **Accepted, a sweep suggestion becomes part of the reply,** like an answered ask; the model wrote it, so there is nothing to tell it. An accepted Ripple suggestion becomes your edit and goes with your next prompt.

A sweep is one model call and says so before it runs. The rule is the collab's own text, so a sweep is only as good as the collab it uses.

## Focus

`focus:` clears the screen to a set of boards you choose, and `focus:off` brings back what you had open. Nothing closes for good; focus only decides what is on screen. Until you set your own, focus keeps the chat alone, as in the welcome page.

**To make your own focus,** name the boards after `focus:`, in the order you want them left to right:

- `focus:sym col` keeps the chat and the Collection.
- `focus:sym ref` keeps the chat and the Reflection board.
- `focus:col` keeps the Collection alone.

This focuses straight away and keeps that set as your focus. The names are the boards' own short titles, as the board strip shows them (Sym:, Col:, Ref:, Alm:, Lib:, Dkt:).

**To save what is on screen now** as your focus, arrange the boards you want, then run `focus:save`. The Enter line names them first: *Enter keeps what is on screen now as your focus: sym col ref*.

**To use it,** run `focus:` alone; it clears to your saved set. `focus:off` returns to the boards you had open before.

**Without typing:** the board strip ends with marginalia, *focus: off ▾*. Clicking *focus* turns it on or off. The caret opens a picker with every board and numbered boxes; ticking sets your focus, and the numbers set the order left to right, as numbers do in every picker.

- **While focused,** clicking a board title in the strip does not rearrange; it says *focus:off to arrange freely*.
- **If something needs a board focus hides** (finding a card, a sweep's review), focus turns off and says so, and `focus:` brings it back.
- **Focus is per room.** Each room keeps its own saved set.

## Calm

`calm:` is a less detailed way to see the same screen; `calm:off` shows every detail again. Focus decides which boards are on screen; calm decides how much each one shows. Nothing is removed or hidden behind a button: detail waits until you are near it, by hover or keyboard focus. The board strip shows its state, *calm: off*, and clicking it toggles.

| At rest in calm | When you are near it |
| --- | --- |
| A reply shows one marginalia, `open:201a` | The rest: *with its history · open:201a summary* |
| Board heads show their title only | Their marginalia |
| Inline markers are small numbered dots, green or rust | The full marker: *ask 241: accept · undo* |
| Replies read as they stand: your edits as their result, pending answers and suggestions not yet applied, a blue tick in the margin where anything is marked | The reply you hover or are editing shows full markup |
| Collection cards fold to one line, the result only | The whole card, with its marginalia |
| The legend folds to *colours ▾* | The legend |
| Review keys line hidden; tab counts dimmed | Unchanged otherwise |

The review bar, the Enter line and the field are never calmed: what will happen next is always in full.

## Legibility

These apply everywhere, calm or not. Small text must reach 4.5:1 contrast on the paper colour (WCAG AA).

| Token | Was | Now | Contrast on #FCFCFA |
| --- | --- | --- | --- |
| Marginalia | ink at 46% | ink at 62% | 2.9:1 → 4.9:1 |
| ink-3 (ids, struck words) | #9B9A97 | #6F6E69 | 2.7:1 → 5.0:1 |
| ink-2 | #787774 | #5F5E59 | 4.4:1 → passes |
| Rust (Ripple) | #A8572A | #94491F | 5.0:1 → 6.3:1 |
| Blue, green | unchanged | unchanged | 6.3:1, 5.4:1 |

- **Size:** marginalia, markers, the legend and the Enter line at 11.5px or larger; ids may stay at 10.5px mono.
- **Not colour alone.** Each mark has its own underline: your words solid blue, an ask's answer or a sweep dotted green, Ripple dashed rust. Struck text keeps its line. Markers keep their words (*ask*, *sweep*, *ripple*), and in calm the dots keep their numbers.
- **Keyboard focus** is always visible: a 2px ink outline on anything focused, including the / menu and the pickers.
- **Reduced motion** turns off flashes, fades and smooth scrolling.

## Every marginalia has a command

Anything clickable in marginalia can be done from the command line, and every command says what Enter will do before it runs. In the mockup, type `>` in the field to try them.

| Marginalia | Command | Enter line |
| --- | --- | --- |
| focus: off ▾ | `focus:`, `focus:sym col`, `focus:save`, `focus:off` | *Enter focuses on sym col, in that order, and keeps it as your focus* |
| calm: off | `calm:`, `calm:off` | *Enter calms the screen: details wait until you are near them* |
| markup · clean | `view:clean`, `view:markup`; add `col` for the Collection | *Enter shows the chat clean, without markup* |
| ripple: off | `ripple:on`, `ripple:off` | *Enter turns Ripple on; each check is a model call* |
| to 201a · all three | `to:201a`, `to:all` | *Enter sends the next prompt to all three* |
| collab ▾ | `collab:editor`, `collab:pushback, uncertain`, `collab:off` | *Enter sets collab: Editor for every prompt until turned off* |
| accept · reject · accept all | `accept:244`, `reject:244`, `accept:all`, `reject:all` | *Enter accepts suggestion 244* |
| undo (an edit) | `undo:242` | *Enter undoes edit 242 and puts the text back* |
| hold back · let it go | `hold:242`, `hold:off 242` | *Enter holds edit 242 back; it stays yours* |
| Wikipedia's model ▾ | `helper:haiku` | *Enter makes haiku the model for Wikipedia text* |
| an id on a card | `go:242` | *Enter finds 242 in the chat* |
| ask again as 201d | `again:201a` | *Enter asks again from the edited prompt as 201d* |
| Reflect | `reflect:` | *Enter reflects on 201: one call to Sonnet 4.6* |
| Sweep 201a as Editor | `sweep:201a editor` | *Enter sweeps 201a as Editor: one suggestion per sentence, one call* |
| open:201a, open:201a summary | `open:` | unchanged |
| drop (a queued ask) | `delete:241` | reuses delete |
| strikethrough | `strikethrough:` | proposed |

Eleven of these are new verbs. Each should mean the same act on every board: `view:clean` makes whichever board it addresses clean, not only the chat.

## Open questions

- [ ] **Prompt edits and the model.** Should an edited prompt be told as a change ("short story" became "ghost story"), like replies, or read as the question it now is? Your own words may deserve the second.
- [ ] **Version history.** Struck words keep the original visible, but an accepted ask or Ripple suggestion removes it. Is the card enough of a record, or does a reply need history?
- [ ] **Two counts on a tab.** Blue for pending, rust for Ripple. If it reads as busy, the Ripple count moves to the Collection tab only.
- [ ] **Ripple's reach.** Only the other branches of this chat, or other chats in the same docket too?
- [ ] **Notes for the AI versus notes to yourself.** v9's "Note for the AI" is now just an edit or an ask; the Collection's `note:` is never sent. Check no surface still uses "note" for both.
- [ ] **Update `welcome-inline-editing-spec.md`** to the default that edits go, and to `strikethrough:`.

* [ ] **Collab scope.** Per chat, per branch, or per reply target? The mockup sets it for the whole chat.
* [ ] **Sweep reach.** A reply, a branch, or every branch; and should a sweep also be startable from the chat, not only from Reflection?
* [ ] **Reflection's source.** Defaults to the chat beside it; confirm it can take a docket or a collection.
* [ ] **The Settings label.** Keep "My Parrots" for your own collabs, or call them collabs everywhere.

- [ ] **Calm by default?** Calm could be the starting state for new users, with `calm:off` once they are comfortable, or stay opt-in.
- [ ] **Focus per room.** Confirm each room keeps its own saved focus, and what a new room starts with.
- [ ] **The new verbs.** Check all eleven against existing commands for collisions before Claude Code builds them.

## Carried forward: the Review modal and Parrots

Neither is replaced by this spec. Both come from the February and March mockups (`chat-interface-final.jsx`, CLAUDE.md, ROADMAP step 10, the 21 March modes chat) and are recorded here so they are not lost.

| Concept | What it was | Status |
| --- | --- | --- |
| Review modal | Centred modal from Quick Actions (BookOpen icon): "Reflect on your conversation" | Kept; to be re-fitted to boards and branches |
| Branches to review | Chips to pick any set of branches, at least one | Maps to the numbered branch picker |
| Summary depth | Brief (highlights and notes only) or detailed (full content, more tokens), with a token note | Same frugality pattern as `open: … summary` |
| Category toggles | Highlights, notes, favorites, pinned references, all on by default | Now Collection tabs; add edits, asks, Ripple |
| Synthesis | An API call summarising the conversation and annotations | Reflection board: Reflect, one call, named before it runs |
| Prompts for reflection | Questions drawn from your own highlights and notes | Reflection board, from one Reflect call |
| Your reflection | A text box; becomes a note | Talk about the chat, on the Reflection board |
| Session stats | Tokens, messages, cost | Belongs with context health |
| Collaboration activity | Which collaboration presets were on: Challenge Artifacts, Show Reasoning, Push Back on Me, Offer Alternatives, Flag Uncertainty | The five built-in collabs; Reflection can name which were on |
| Save as Markdown, Dismiss | Export the review, or close it without a trace | `export:md` |
| Parrots | Saved personas: a system prompt, optional default model and tool preferences; picked per conversation; a selector in the input area; "My Parrots" in Settings; its own IndexedDB store and a `parrotId` on each conversation; works in every mode | Merged into collab: (your own collabs); the persona framing dropped, the standing instructions kept |
