# Parliament — Docket: decisions not in the mockup

Companion to `parliament_docket_v11.html`. Dated 22 September 2026.

The mockup carries everything that can be demonstrated: the document layout, the
diff marks, the run pips, the three bar placements, the verb table, the record
cards, the caret affordance. Its header comment is the record for all of that
and should be treated as authoritative where the two disagree.

This document holds what the mockup cannot show — rules that live in other
surfaces, behaviours with no visible state, and the changes the Almanac needs
to stay consistent with what the docket now does.

---

## 1. The model

Five objects, and the whole design falls out of getting these right.

| Object | What it is | Lifetime |
|---|---|---|
| **Docket** | A plan | Permanent. Runs do not replace it |
| **Branch** | An alternative path through that plan | Permanent, in every run |
| **Run** | One execution of the docket | Permanent once made |
| **Step** | One prompt, belonging to one branch in one run | Owned by its run |
| **Chat** | What running a branch produced | Joins the flat id space |

**Shared across every run:** a branch's letter and its name.
**Owned by one run:** its steps, their prompts, rooms, models, status and cost.

This division is what makes per-run editing safe. Editing step 2 of 201B while
standing in run 3 edits run 3's copy and touches nothing else. A step that has
already produced a turn is locked, because a transcript exists and rewriting the
prompt would make the record a lie. `new:run` copies the current run's plan
forward, so a run is a fresh sheet with last time's writing already on it.

**The trunk is 201A.** There are no steps belonging to a docket directly. This
removes a special case from the data, from the grammar and from the reading.

**Cost belongs to the run.** A docket has no single cost; each run has one.

---

## 2. Addressing

- `201` is the docket. `201A`, `201B` are branches. Steps are ordinals inside
  their branch. **The address stops at two levels.** `201B3` is one character
  past readable, and a step is only ever addressed while you are looking at the
  docket it lives in.
- **A run is not part of an address.** No `201/3`, no `201#3`. The card's chrome
  says which run; the run is an argument to a verb (`open:run 1`). A third
  syntax level would collide with letters the moment anyone wrote `201B/3`.
- **Letters are assigned at creation and never reshuffle.** Move a branch and
  the document reads A, C, B. That is correct. A letter that moves when you drag
  is not an address, and every note or saved search pointing at 201B would
  silently point somewhere else.
- **Letters are never reissued.** Delete 201C and no future branch takes that
  letter. A docket edited heavily can reach `201AB` with four branches showing.
  Accepted.
- **I and O are skipped**, giving 24 letters. The address is typed and read
  aloud, and `201I` sits one glance from `2011` in a mono column.
- **Past Z the letters double** — AA, AB — with no limit. A limit you hit is
  worse than an address one character longer.
- **Ids are always visible and never change colour.** Mono, `--p-ink-3`, no
  fill. An address is a constant; a number that shifts with the mode invites
  the reader to work out what the shift means.

---

## 3. Branch — unification with the Symposium

**A branch is an alternative path, whether you planned it here or forked it from
a chat.** These were two objects sharing a name; they are now one object.

The argument: fork chat 251 at message 4 and that fork is an alternative path
through the same work. If it is not a docket branch, the docket has stopped
being the record of what you tried, and two competing structures now describe
one exploration. That is how plan documents die.

Three consequences, all of which need Symposium-side work:

1. **Forking a chat writes a branch into its docket.** Steps up to the fork
   point are copied; the new branch continues differently. Fork points land
   cleanly because one step is one prompt and one answer, so message boundaries
   *are* step boundaries.
2. **Typing freely in the Symposium appends a step to the current run.**
   Otherwise the chat drifts ahead of the docket and fork points stop lining up.
   This collapses "the plan" and "the record" into one list, which is already
   what per-run ownership implies.
3. **Forking a standalone chat creates a docket.** A chat with no plan has
   nothing to write into, so branching makes one: 201A is the path you were on,
   201B is the fork. Good moment to introduce dockets to someone who never asked
   for one — the plan appears exactly when there is something to plan.

A branch that arrived by forking should say so in its marginalia:
`forked from chat 251, at step 2`.

---

## 4. Runs and chats

A run does not make a new docket. **A run makes chats.** Running 201 a fourth
time produces chats that join the flat id space alongside notes and highlights.
Each carries `from 201B, run 4` in its marginalia, and `from:201B` gathers every
run of that branch across the docket's whole life.

The branch address is the connective tissue between runs, which is exactly what
makes it worth never reshuffling.

**Run immutability should be shown, not captioned.** The Almanac currently
states the rule in the pop-out's footer text. Locked steps, record cards and the
`new:run` / `run:` split now carry it structurally; the caption can go.

---

## 5. The command line

**Placement.** Three, all separate from the cards — it never enters one.

- **In the document**, travelling under the selected line. Single card only.
- **Below the cards**, fixed. Whenever more than one card is open.
- **Popped**, a window the user places, which never moves again.

Position never carries the addressing. Four marks do: the navy rule on the
addressed card, the same rule on the bar when it is detached or popped, the
target at the head of the hint line, and the selection wash on the line itself.
This is what lets the bar stay put instead of chasing the addressee, and a bar
that moves when you click is worse than one that tells you what it is pointed at.

**The navy rule generalises from v26.** With one surface it appears only while
the command line is open. With two or more it is on permanently, because a
prompt lands in one of them too — "which am I editing" is a live question at all
times, not only in command mode.

**⌘K, not `/`.** `/` cannot be a global jump on a surface built for prose: it is
a character you might legitimately be typing, and focus is usually inside a
field. ⌘K must fire from inside textareas and composers, which is where it
currently does not.

**The hint line advertises the shortcut that works where you are.** The Almanac
says "press / or ⌘K" because both work there. The Symposium and the docket say
⌘K only. Advertising a key that does nothing is worse than advertising none.

**Opening a docket enters command mode.** Entering is not resting: Escape goes
to prompt and prompt is where you stay, so `>` still means one thing everywhere
and the Escape ladder still has a bottom. The cost is one Escape for someone who
opened the docket to write; the gain is that nobody has to guess `run:` exists.

**`new:` makes, `run:` starts.** Creating a run and running it are two acts, and
the gap between them is where you edit the plan before it goes — which is what
per-run editing is for.

---

## 6. Help, in three places

Not one dismissible banner. Three different needs, only one of which is
banner-shaped.

**The empty docket is the first-run help.** A new docket has no steps, so the
document area is free, and that is where orientation belongs: one branch line,
two greyed example steps in place, the hint line saying what Enter does. It
dismisses itself the moment you write something, so there is no preference to
store and nothing to turn off. The empty state has to be designed anyway,
because `new:docket` produces one.

**`?` is the in-the-moment help.** The verb table plus the six notes that do not
fit in a gloss. Built in v11 as `help:`; it needs the `?` binding.

**The docs site is the reference.** Full grammar, edge cases, what happens to a
letter when you drag. Two things keep it from rotting: reach it from inside (a
`docs:` verb, or `?` entries linking out), and **generate it from the verb
table** rather than writing it by hand. The examples and glosses live in one
array; the day the docs are typed separately is the day they start drifting.

The hint line is the best documentation in this product — contextual, always on,
and it says what Enter will do before you press it. The docs site supplements
that; it does not replace it.

---

## 7. Changes required in the Almanac

The docket is now ahead of the Almanac in several places.

**Verb table.**
- `new:run` and `run:` replace the single `run:`.
- `new:branch <chat id>` must write a branch into that chat's docket, per §3.
- `new:docket` opens an empty docket with the command line already entered.

**Status vocabulary.** The Almanac uses `done` / `running` / `waiting`, where
`waiting` means "has not run yet". That is the docket's `ready`, and the word
`waiting` is what the docket uses for a branch deliberately parked. Four values,
one vocabulary:

| Value | Meaning | Chip |
|---|---|---|
| `ready` | Has not run yet | **Silent** |
| `running` | Happening now | Filled ink |
| `done` | Produced a turn; locked | Ink wash |
| `held` | Deliberately parked; will not run | Dashed outline |

`ready` is silent so that a chip always means there is news. The peek panel
currently prints raw status, so it needs a label map — `held` renders as
"waiting on", not "held".

**Answered-by picker** needs a third group for local models. `llama3.1:8b ·
local` already appears as a step's model in v28, but the picker has only
*Models* and *Sources, no tokens*.

**Room moves to marginalia** on every surface where it is currently a chip. It
is already marginalia in the peek panel; the table column is a column, not a
chip, and is unaffected.

**`.k-dock`** uses a gold tint for the docket type pill, which is a non-live use
of gold under the rule at the top of v24. Worth a look — either the rule admits
type pills as an exception, or that pill changes.

---

## 8. Rules worth restating

**Pills are never interactive; marginalia always is.** Check v28: every kind
pill and tag is a `<span>`, the mode chip is a `<span>` with `pointer-events:
none`, and every marginalia item that does something is a `<button>`. This is a
better statement of rule 2 than identity-versus-behaviour, it explains the
search bar's mode pill, and it gives one testable question for anything new:
*does clicking it do something?* If yes, marginalia. If no, pill.

Corollary, built in v11: **marginalia that opens a picker grows a caret on card
hover; marginalia that navigates never does.** Room, model and the run open
menus and get one; a chat number does not.

**Marginalia appears on every step, always.** The diff washes what differs
rather than hiding what matches. Suppressing unchanged items would make
marginalia mean "look here", which is the change bar's job, and would make the
same line read differently depending on what else happened to be open beside it.
A line should say the same thing alone as it does in company.

**Difference is marked in ink, never in colour.** Neither run is the original,
so nothing can be "added" or "removed" — green and red import a base-and-patch
idea that does not hold between siblings, spend two hues the palette has not
got, and fail for roughly one man in twelve. Italics are unavailable: italic
serif already means marginalia. A change bar in the gutter says which lines
differ; a pale ink wash says which words. Both symmetric, both on both cards.

**The docket has no key element.** With the trigger gone, nothing carries the
progressive dash. The alternative is to give it to the field, but the border
spec says the key border is static, and a dash that appears only when Enter
would run something is not static. The honest reading: the docket does not
execute, the command line does. **This is a decision, not an oversight, and
should be written into the border spec rather than inferred from its absence.**

---

## 9. Mobile

Stack vertically. Cards go one above the other; the diff marks survive
unchanged, since a gutter change bar and a word wash do not care about width.

One consequence to accept: **comparison becomes scroll-and-remember rather than
see-at-once.** That puts more weight on the navy rule, because "which card am I
editing" can no longer be answered by position at all.

---

## 10. Still open

1. **Does `run:201B` stay one run?** Built as: yes, the other branches are
   parked inside it, so numbering and pips stay honest. Worth confirming after
   someone uses it for a week.
2. **Room repeats on every step** of a branch that never changes room. This is
   redundancy *within* a card, not between them, and it will only show its
   teeth on a docket with fifteen steps in one room.
3. **The third card.** Three is the cap and a fourth closes the oldest. Three
   needs about 1500px before the columns stop squeezing.
4. **Does a branch become a row in the Almanac table?** Branches now have
   addresses. Suggested: addressable but not listed — reachable by typing the
   address, appearing as rows only under a grouping mode.
5. **`diff:` between two dockets**, rather than two runs of one. Currently
   nothing is marked, on the grounds that two dockets share no positions.
