# Parliament — Almanac and the command line: decisions

Companion to `parliament_almanac_v30.html`. Dated 23 September 2026. Second pass.
Reads alongside `docket-spec-decisions.md` and `parliament_docket_v11.html`.

The mockup carries what can be demonstrated: the leader grammar, the reference
panel, the verb table, the navy rule, the four statuses. Its inline comments are
the record for those and should be treated as authoritative where the two
disagree. This document holds what the mockup cannot show — rules that live in
other surfaces, behaviours with no visible state, and the reasoning behind
choices that look arbitrary from the code alone.

Supersedes the command-line sections of every earlier handoff.

---

## 1. One field, three modes

The bar is one text buffer read three ways. A leader at position 0 switches the
reading; the rest of the line is untouched. Type `water tower`, get nothing
useful, go to the front, type `p>` — the field is now a prompt about water
towers without retyping. Escape back and the text is still there in search.

| Leader | Long form | Mode | Chip |
|---|---|---|---|
| *(none)* | | Search | drawn: bone inside, ink rule |
| `>` | `command>` | Command | filled navy, white mono |
| `p>` | `prompt>` | Prompt | filled ink |
| `s>` | `search>` | back to Search | resolves to the magnifier |

- **Leaders only at position 0**, case-insensitive. Anywhere else they are
  characters.
- **Command keeps its `>` in the field**, because deleting it is how you leave.
  **Prompt swallows its `p>`**, so the field holds nothing but the question.
- `s>` is the non-Escape way out of prompt. On a surface already resting in
  search it is a harmless no-op, allowed rather than an error, because someone
  arriving from a room does not know which surface they are on.
- **Search is only search.** It never interprets, never proposes, never runs. A
  docket is started from command; a question is written in prompt. Free-speech
  interpretation (§11) does not get the bare field.

**Routes in:** `/` and `⌘K` in the Almanac. `/` is swallowed inside any text
field, so on prose surfaces `⌘K` is the only route, and it must fire from inside
textareas and composers. **The hint line advertises only what works where you
are.** Advertising a key that does nothing is worse than advertising none.

---

## 2. The Enter line

One reserved line of fixed height under the field. It **changes what it says
rather than appearing**, so nothing below it ever moves. Upright serif for what
you type, italic for the gloss, semicolons between, gold on hover.

It is the best documentation in this product: contextual, always on, and it says
what Enter will do before you press it.

It is also now the **only guard on execution** (§5), which raises its
requirements. Before a run it must state what will run, in which rooms, on which
models, and what it will cost where cost can be computed without a call.

---

## 3. Addresses

- `201` is a docket, `201A`/`201B` its branches. Steps are ordinals inside a
  branch. **The address stops at two levels.**
- **A run is never part of an address.** The run is an argument to a verb.
- Letters are assigned at creation, **never reshuffled and never reissued**.
- **I and O are skipped.** `201I` is one glance from `2011` in a mono column.
- Past Z letters double — `201AA`, `201AB` — with no limit.
- **Ids are always visible and never change colour.** Mono, `--p-ink-3`, no
  fill. An address is a constant; a number that shifts with the mode invites the
  reader to work out what the shift means. This holds on both surfaces that
  carry ids: the `id` column in the table and the `.rowid` badge on collection
  cards.
- **The id column cannot be hidden** (`cols:-id` refuses) but can be dragged
  anywhere in the order.

**Two parsers, deliberately.** `idsIn` reads row ids and is what Items and
Collection verbs use, because `pin:` and `copy:` act on rows. `addrsIn` reads
addresses and is used only by verbs that can take a branch: `new:branch`,
`open:`, `pop:`, `from:`, `run:`, `stop:`. Widening `idsIn` instead would have
quietly made a dozen verbs accept something they cannot act on.

**Noun classes.** The grammar has two: **addressable things** (ids and
addresses) and **named parts of the page** (panels, columns). A verb takes one
class or the other, and within a class it works on everything — there are no
subsets to discover. Where a verb genuinely cannot apply, the error says why.
`pop:` is the only verb that takes both.

**Annotation verbs work on anything addressable.** `pin:201B` is meaningful: pin
is an annotation, not a sort order, and its effect is surface-local — top of the
list in the Almanac, marked in the docket, weighted in ranking. `rename:`,
`peek:` and `copy:` likewise. Open: whether `archive:201B` and parking a branch
are one act or two. Currently two.

---

## 4. Verbs

**`new:` makes, `open:` arrives.** This replaced `c:` and `d:`, which were each
doing two unrelated jobs — beginning a thing and arriving at one that already
exists — and `c:` was silently doing a third, branching, decided by the state of
whatever you pointed it at.

- `new:` takes an object from a registry, the same shape as the layout verbs:
  **chat, docket, room** anywhere; **step, run, branch** inside a docket.
  `new:branch 207` from outside writes a branch into that chat's docket;
  bare `new:branch` inside a docket adds one to the current docket.
- `open:207` resolves by kind: a docket opens, a chat picks up where it left
  off, a note starts a chat about itself.
- **`open:` is also the split.** On a multi-card surface it adds a card rather
  than navigating — *bring it onto the surface I'm on*. **`split:` should not be
  built**; a second verb for this would be the same overlap `c:`/`p>` had.
- **`p>` sits in Start** as the one leader that begins something. It carries a
  `lead` property rather than a scheme, so picking it from the reference types
  the leader instead of running. `>` does not belong there (you would be reading
  it inside the panel it opens) and `s>` is a return, not a start.

**Mutation verbs are surface-local in vocabulary.** `move:` takes panels in the
Almanac (`move:collection left`) and branches in the docket (`move:201C after
201A`), with different argument grammars — slots take left/right, order takes
after/before. Forcing one grammar on both would make each worse.

**But a scheme may not differ in KIND across surfaces.** This is what `run:`
broke: a filter here, a verb there. Vocabulary can vary; whether a word narrows
or acts cannot. `run:` is now always the verb, and the old filter is absorbed
into `from:` — `from:203` a chat or docket, `from:201B` a branch across every run
of its life, `from:run 3` one run.

**`pop:` gives you that thing's own view.** A popped *panel* carries its parent
surface's rules; a popped *surface* carries its own. So a popped docket can run
while a popped table still cannot. This also keeps the live chat out without an
exception: a chat's own view is its record, and the composer lives in the
Symposium. A branch has no standalone view, so `pop:201B` pops the docket with B
addressed.

**`bar:` carries two axes.** top / bottom / left / right are **positions**; pop
and dock are **states**. A position only means something relative to a surface,
and a popped bar has no surface — so **any position implies dock**, and nothing
needs to remember which screen it came from; it returns to the addressed card.
`left` and `right` make the field a **square**, which reserves three lines for
the Enter line so nothing below it moves when the gloss wraps. Any other
position makes it a line again. Popping keeps whatever shape it had.

**`layout:` is the roots; `arrange:` is the forest.** Layout works at a granular
level — slots, panels, the shape of one page. Arrange is holistic and does
exactly two things: save a desk and open one. There is no `arrange:default` and
no arrange-level tinkering; anything granular is `layout:` or the individual
verbs. They stay apart because a page layout travels between devices and a
window arrangement does not. `arrange:save "Review desk"`
records which things are popped and where; `arrange:"Review desk" 207` sets it
up with docket 207 in the docket slot; bare resumes what was there last. Layout
and contents are separate, which is what makes one desk reusable.

Arrangements are **saved per device**. Constraints to surface rather than hide:
placing windows on named screens needs the Window Management API (Chromium
only, one permission grant); pop-up blockers allow one window per click, so the
Enter line may have to say *opens 1 of 3, click to place the next*; one
always-on-top window maximum, so a desk can hold at most one; when a saved
monitor is missing, windows fall back to the main screen and a toast says so.
**Grey out rather than hide** where the API is absent — a command that silently
is not there is harder to explain than one visibly unavailable.

**`?` is the binding, `help` is the word.** Both open the same panel. Someone
who does not know the grammar types the word.

**The reference shows no totals.** Not in the header, not on the group
headings. A count of everything goes stale the moment a verb is added, and
nobody opens a panel to learn how many things are in it. A count while
*narrowing* is the exception and stays: it is feedback on what was just typed,
it cannot go stale, and it disappears with the query.

---

## 5. Execution

**The rule that the Almanac launches and never runs anything is retired.** It
was a surface-level rule in a product where the actor is the bar — the docket has
no run button either, on the grounds that the docket does not execute, the
command line does. If that holds there it holds everywhere.

Consequences, each of which needs handling:

1. **The Enter line is the only guard.** See §2. Exact-request inspection is now
   a requirement, not an improvement.
2. **`run:201B` depends on state.** If that branch has not run in the current
   run, it runs there. If it has, `run:` makes a new run and runs it in that.
   The Enter line says which: *Enter runs 201B in run 3* against *Enter makes
   run 4 and runs 201B in it*.
3. **`run:` takes one address at a time**, governed by `RUNPOL = {max:1,
   ranges:false}` rather than a buried check, with the Enter line **generated
   from the policy** so raising the cap is one number. Lists are wanted later —
   running three dockets to compare outputs is real — and at that point the
   line's job is to show the *size* of what was asked for, not to refuse it.
4. **`undo:` stops at a run.** Stated boundary:

   > Undo covers commands that change a plan or rearrange the record: adding and
   > deleting steps and branches, moving them, renaming, parking, collection and
   > pin changes, layout. It stops at execution. A run that has spent tokens or
   > produced a turn cannot be taken back, because a transcript exists and
   > un-writing it would make the record a lie. Undo reaches back to the last
   > thing that ran and no further.

   And when someone tries: *Run 3 of 201B has already produced turns. Undo stops
   there. The plan is still yours to change — `new:run` copies it forward.*

5. **The key element is the bar.** It is the only thing in Parliament that acts
   and it is present on every surface. Whatever its border does is a question
   for the visual pass, with no prior commitment attached.

**`stop:`** halts. `stop:` bare halts the addressed card, `stop:201B` one
branch, `stop:all` everything anywhere. **`stop:all` is the first thing that
must cross windows**, because fan-out opens tabs and each tab is its own
instance; the `storage` event is the channel. Stopping is not undoing — steps
already done stay done and stay paid, and the Enter line says so before you
commit. A step halted mid-flight becomes **`paused`**: not `done` (no turn
exists), not `ready` (it started and cost something), not `waiting` (that is
parked before the fact). Collapsing it into any of those would hide a run that
looks untouched but carries a charge.

---

## 6. Status vocabulary

One vocabulary across both surfaces. The Almanac previously used `waiting` to
mean *has not run yet*, which is the opposite of what it means here.

| Value | Meaning | Mark |
|---|---|---|
| `ready` | Has not run yet | **Silent** |
| `running` | Happening now | Filled ink, pulsing |
| `done` | Produced a turn; locked | Filled ink |
| `waiting` | Deliberately parked | Dashed outline |
| `paused` | Halted mid-flight | Dashed outline, type one step quieter |

`ready` is silent so that a mark always means there is news, and *has not
started* is not news. Everything else carries a mark, including `waiting`:
parking a branch is a decision someone made, which is news.

`waiting` rather than `held` as the stored value, because `held` needs a label
map to render as *waiting on* and this does not. `waiting` and `paused` both
mean deliberately not running; the line between them is that **`waiting` never
started and `paused` started and was halted**. They share the dashed dot and
differ only in type colour, one step quieter for `paused`, because the
distinction is fine and a second dot shape would claim it is larger than it is.
If it proves thin in use, merge them rather than explain them.

---

## 7. The navy rule

**The addressed surface wears a 2px navy rule down its left edge, permanently.**
Not only in command mode, not only when a second card appears.

The reasoning is that a marker which arrives when a second card does has two
states to learn — absent means one card, present means this one — where
always-on has one: *this is what you are addressing*. It decouples cleanly,
because the navy field fill already says command mode and the rule never needed
to say it too.

The accepted cost: on a single-card surface the rule carries no information at
that moment. It becomes **frame** and earns its meaning when a second card
arrives. It should therefore be designed as frame — quiet enough to live with
all day — rather than as an alert that happens never to switch off. Whether 2px
navy is the right weight for a permanent element is a question for the visual
pass.

**A popped panel does not wear it**; commands still act on the page that opened
it. A popped surface wears its own.

Nothing else marks the addressee. **The other cards do not dim** — they are
usually the reference you opened the command line to act on, and a reference you
cannot read is worse than an unmarked one. Ids do not change colour (§3).

Open: whether prompt mode gets a rule of its own in ink, or the rule belongs to
command mode alone.

---

## 8. Sources

**One word, three roles**, and they behave differently enough to need naming:

- **Responder** — answers a prompt directly; appears in the picker.
- **Material** — answers nothing; feeds a later step via carry.
- **Trigger** — fires a step (an RSS item arriving, an inbound message).

A source can hold two of these. The picker, the carry setting and the scheduling
logic are three separate surfaces, and one word was hiding that.

**The picker is a single flat list, ordered by cost mark. No groups.**

| Option | Mark |
|---|---|
| Claude Opus 5 | ×15 |
| Claude Sonnet 5 | ×3 |
| Claude Haiku 4.5 | ×1 |
| Llama 3.1, local | free |
| Wikipedia | 0 tokens |
| Narrow keyless APIs | 0 tokens |
| News | later |

The ordering does the arguing: Wikipedia at zero sitting next to Opus at ×15
makes the case in the place where the decision happens. **Do not add groups** —
a local model is still a model, and a third tier reintroduces the source chip
that merging deleted. Cost marks are multipliers rather than dollar figures, so
they survive price changes and match the comparison people actually make.
Default is auto: when a prompt looks like a lookup, the reference answer is
already there when you stop typing.

**The third category** is the narrow, free, CORS-open, keyless APIs: arXiv,
Europe PMC, Hacker News via Algolia, Open Library, Openverse, Wikidata. Each
answers one kind of question extremely well at zero tokens. That is a stronger
frugality story than general web search and a more honest one — the point is not
*search without ads*, it is *some questions do not need a model*.

**Sources are declarative JSON manifests**: endpoint template, response mapping,
CORS status. Three render shapes, no more: **Article** (title, extract, link,
thumbnail), **Results list** (title, snippet, link, date), **Record** (labelled
fields). If a source needs custom code it is not a source, it is an Integrator
component. This is what makes a source the one catalog item a stranger can
safely contribute: a manifest has nothing to execute.

**Wikipedia**: summary endpoint by default (keyless, CORS-open, returns title,
extract, description, thumbnail), full article on request, section selection
later. Send a descriptive `User-Agent` and cache aggressively. Attribution is
CC BY-SA with the revision id.

---

## 9. Frame and fixtures

- **Pills are never interactive; marginalia always is.** One testable question
  for anything new: *does clicking it do something?* If yes, marginalia. If no,
  pill.
- **Marginalia that opens a picker grows a caret on hover; marginalia that
  navigates never does.**
- **Room is marginalia wherever it is currently a chip**, on every surface. The
  Almanac's `room` column is a column, not a chip, and is unaffected. **Do not
  change the table layout without discussing it.**
- **Room belongs to the branch, not the step.** Steps inherit it and show a room
  only when they override. This is not suppressing a repeated value; it is
  showing the value where it lives, so §8 of the docket spec survives intact and
  fifteen steps in one room stop printing it fifteen times.
- **The docket kind pill is teal**, not gold. The kind pills are a hue family —
  blue chat, purple note, pink highlight — and docket had taken the one hue
  reserved for live action. Gold is the only colour appearing in both the pills
  and the chrome, so a gold docket pill near a gold running mark is confusable
  in a way a blue chat pill never is. Changing one pill is cheaper than
  weakening the rule.
- **A component is not finished until it is registered** in `PANELS` with at
  least one alias. Otherwise you get a panel you can see and cannot address.
- **Narrow, not mobile.** Three cards need roughly 1500px; below the floor they
  stack vertically. A 900px window on a desktop should behave like a phone
  rather than squeezing. Wider screens may go wider than three.
- **Copy:** no em dashes, sentence case.
- **The HTML is the source of truth for visual values.** Colours, weights,
  spacing and motion come from the current mockup. Earlier design documents
  holding alternative values are superseded and should not be consulted.

---

## 10. Data

- **Format versioning is owed already.** A version field in the export envelope
  and a migration path on import. Every backup ever written must stay readable,
  which constrains schema changes indefinitely. The failure is silent — nothing
  breaks until someone restores a six-month-old file.
- **Directory handles (File System Access) are cut** for now. Download path only.
- **Fan-out opens tabs, not panes.** A tab is a whole frame and a room scheme can
  own it; two schemes in one frame fight. Browsers allow multiple tabs from one
  user gesture, which the Enter keypress is. **No permission dialog** — the
  Enter line states it (*Enter runs 3 steps, opening 2 tabs*) and then does it.
- **Tabs diverge; pop-outs orphan.** Two tabs are two instances sharing
  localStorage, so a stale tab says so in its marginalia rather than reloading
  under someone's hands. A popped window borrows the opener's renderer, so on
  `beforeunload` the parent writes a plain line into each child while it still
  can — *this window's page has closed* — rather than leaving a husk that looks
  fine and does nothing.

---

## 11. V2

**`invoke:` and `analyze:` are two verbs, deliberately.** `invoke:sonnet on
summarizer` *attaches* a model to a component and is an Agent-tier grant that
opens the consent flow the first time. `analyze:207` is a one-off — the model
reads it, replies, nothing is attached. Keeping them apart means the Enter line
never has to guess which you meant. Model names resolve against the picker.

**The rule that makes it safe:** a command you type is you acting directly, and
Enter is the confirmation, backed by the Enter line. Anything a **model**
produces lands as planned docket nodes or draft text, **never as commands that
run**. Consent tiering — drafting auto, creating one-tap, publishing and network
always explicit — governs model-proposed actions only. A human typing `run:201`
and reading the Enter line has already met the bar.

Free-speech interpretation and voice ride on the prompt line, not the bare
field. Search is only search.

---

## 12. Diffing two dockets

`diff:` operates on whatever is open, with no distinction to learn. Two runs of
one docket align by branch letter and ordinal, which is free, so the change bar
and the word-level wash both work.

Two different dockets share no positions, and **degrading gracefully is the
fallback, not the feature.** Comparing two dockets that approach similar work
differently is a thing nothing else in the product does, and it deserves real
matching rather than a shrug. Match on branch names first, then step names, then
leave the remainder unmatched. That is a matching problem, not a rendering one,
and it should be scoped as its own piece of work rather than as a caveat on
`diff:`.

---

## 13. The inventory

**This is the first task, not an item in a list.**

Almost everything in both spec documents is written as though the code exists.
Some of it does, some exists only as a mockup, some has only ever been described
in a chat. None of this is visible from inside the repo: a mockup and an
implementation look identical from inside an HTML file, and a specced-only
feature leaves no trace at all. Without the inventory the first thing that
happens is time spent fixing something that was never built, or refactoring
around a component that exists only as a paragraph.

One table, one row per surface or component, four columns.

| Column | What it holds |
|---|---|
| **What it is** | The name used in the specs, so the documents and the table agree |
| **State** | Live, Mockup, Specced or Named |
| **Where** | The file, or the document and section |
| **Blocks** | What cannot proceed until this moves |

- **Live** — ships in V1, users touch it.
- **Mockup** — a working HTML or JSX prototype, not in the product.
- **Specced** — described in a document, no code anywhere.
- **Named** — mentioned as a concept, nothing more.

**Generate it, then correct it.** Walking the repo and the documents produces a
draft; the State column is the part only the author knows. Writing it by hand
from scratch is slower and less complete.

Rows to seed it, from what has surfaced so far:

| What it is | State |
|---|---|
| Almanac table, filters, collection | Live |
| Export and import | Live |
| Command line as built in v30 | Mockup |
| Docket at v11 | Mockup |
| Pane-signal treatment | Mockup |
| Answered-by picker | Mockup |
| Wikipedia as a source | Specced |
| The three render shapes | Specced |
| Format versioning | Specced, and owed |
| Consent flow | Specced |
| Room builder | Named — and `new:room` already points at it |
| `invoke:` and `analyze:` | Named |
| Voice | Named |

---

## 14. Still open

1. **Matching two dockets for `diff:`** — §12. Scoped but not designed.
2. **Whether `waiting` and `paused` stay separate** or merge, once either has
   been used in anger.
3. **`new:branch` across surfaces** — writing a branch into a chat's docket needs
   the docket side to exist.
4. **Room as marginalia** on every surface where it is currently a chip. Symposium
   and docket work. The Almanac's `room` column is unaffected.
