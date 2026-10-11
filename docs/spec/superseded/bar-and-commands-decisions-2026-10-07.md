# Parliament: the bar and its commands, decisions

Oct 7, 2026 · @Just call me Sam

## Summary

The bar keeps one field with three modes, minimises to a hexagon by sliding when you edit a reply in place, and spends gold only on the `api:` ignition. Seven commands are renamed or replaced: `api:`, `duplicate:`, `strikethrough:`, `jump:`, `drop:`, `markup:` and `tell:`. Hiding the bar is dropped in favour of `focus:` and `calm:`.

The reference file is `parliament-bar-final.html`. Where this doc and the file disagree on behaviour, the file's header comment is authoritative, as with the Almanac, docket and Settings specs. The fills in the file are the SVG from the welcome flow; the field CSS follows the v5 inline-editing mockup.

## Decisions

All decided on 7 October 2026 unless marked.

| Decision | Replaces | Why |
| --- | --- | --- |
| `api:` connects a key, everywhere | `key:` in the welcome flow | Names what you connect, not one part of it. Matches the Settings spec. No alias, so one action has one syntax |
| `duplicate:` copies collections and rooms | `dup:` for collections | One spelling for one idea; clearer to a newcomer |
| `strikethrough:` strikes a passage | `strike:` (proposed Oct 6) | Says exactly what happens. Tab completion absorbs the length |
| `jump:242` scrolls to an id on this board, listed under Go to | `go:242` (Oct 7) | Navigation belongs in Go to, and `go:` read as if it should move between surfaces |
| `drop:` removes things not yet sent: asks, pending edits, queued steps | `delete:241` (Oct 7) | `delete:` stays out of the vocabulary so nobody tries `delete:207` on a chat. Sent work is archived, never deleted |
| `markup:on` and `markup:off` | `view:markup`, `view:clean` | Two states, one word that says what changes. Keeps `view:` away from `show:` |
| `note:` is a note for people; `tell:` is read by the model with the next prompt | one `note:` for both | Same word, two audiences. A note may later be for a team when docs are shared |
| No bar hiding. `focus:` and `calm:` cover reading and quiet | `bar:hide` / `bar:show` (proposed today) | The bar is the only navigation, so losing it is losing the app. Two existing verbs already serve the intent |
| Minimise by sliding, ending in a hexagon | the seeds and dust studies | Minimise fires on every click into a reply, so it gets the short, legible animation |
| Gold only on the `api:` ignition | gold on `room:`, `run:`, `accept:`, `name:`, `save:` | Hold the rest. Gold stays rare enough to mean something |

**On `note:` and teams.** Notes written inline are for the user today and for collaborators once docs can be shared. The shared-doc work on record is Starling, with Ripple, rather than Swallow; worth confirming which mode carries it. `tell:` may later need a per-recipient form if several models read a doc.

## The field

One field, three modes, and the left always names the mode while the right carries the glyph. The open field is 40px tall with 14px corners.

|  | Search | Command | Prompt |
| --- | --- | --- | --- |
| Enter with | resting mode, `s>` or `search>` | `>` at position 0 | `p>` or `prompt>` at position 0 |
| Pill | SEARCH, drawn: paper fill, 1px ink rule, ink type | COMMAND, navy2 `rgb(38,56,92)`, white type | PROMPT, ink fill, paper type |
| Fill | white | navy `rgb(22,38,70)` with star dots, 0.55px, opacity varied | paper `#FCFCFA`, mosaic skewed -17°, 0.7px lines |
| Type | 13.5px sans, ink | 13px mono, white with navy halo; the `>` stays in the field | 13.5px sans, ink; `p>` is swallowed |
| Right side | magnifier, 15px | nothing | marginalia, then the quill in its ink pot, 21px |
| Leaves by | n/a | deleting the `>`, or Escape | `s>`, or Escape. Never Backspace on an empty field |

- **The fill wipes in from the left** over 280ms when the mode changes.
- **Marginalia in the prompt field** reads *collab: none · to 201a · all three*, italic serif at 11.5px and 62% ink (4.9:1). Each item is interactive and has a command (`collab:`, `to:`). It hides in command mode.
- **The Enter line** is one reserved row under the field that changes wording and never pushes anything down. It reads *→ target · what Enter will do · how to leave*. Every command previews here before Enter.
- **Keys.** `/` jumps to the field when no other text field has focus. Cmd/Ctrl+K opens it from anywhere, including inside a reply, because `/` belongs to the reply's block menu while writing.
- **After a command runs,** the field resets to `>` and keeps focus, so the next command is ready.
- **The resting mode follows the surface:** search on the Almanac and the welcome page, prompt in a room.

## Minimising while editing in place

Clicking into a reply to edit it slides the field into a 40px hexagon at its right edge; hovering it, clicking it, or pressing Cmd/Ctrl+K slides it back open in the mode it was left in.

**Closing**

1. The pill, text and marginalia fade over 140ms.
2. The left edge sweeps right over 360ms, `cubic-bezier(.65,0,.35,1)`. The right edge never moves, so the magnifier and ink pot stay where they were.
3. Once the slide lands, the shape becomes a pointy-topped hexagon with 4px rounded corners and a hairline edge. It is never applied mid-slide, so the bar never stretches into a hexagon.
4. Command only: the chevron fades in at the glyph slot, then rolls into a crescent moon over 460ms.

**Opening** reverses this: the hexagon lifts first, the moon rolls back to a chevron, the field slides open, and the caret returns to the field. Escape closes it again and puts the caret back where it was in the reply.

- **The mark in the hexagon:** magnifier for search, crescent moon for command, quill in its ink pot for prompt. The fill matches the mode.
- **The morph** samples both shapes to 136 matched points: outer edge to outer arc, inner edge to inner arc, flat ends to horns. A turn of up to 14° rides the middle. It reverses from wherever it is, so a cancelled hover never jumps.
- **Hover opens after 140ms** of intent and does not take focus. If nothing is typed, it closes 600ms after the pointer leaves.
- **The hexagon edge turns gold on hover.** That is the only gold at rest, and it signals the shape can be acted on.
- **Reduced motion** swaps shapes without travel and shows the moon directly.
- **Accessibility.** The minimised field is a button named "Minimised. Search, command or prompt", reachable by Tab, opened by Enter or Space.

## Gold and motion

The only command with a gold animation is `api:`: when a new key is saved, a gold sweep crosses the field and the cards glint top to bottom, once per new key.

- **Gold means live action and is always transient.** It lands on the thing a command touched, never on the bar, and settles back to ink. The power-on shimmer spec governs timing and colour (`#C4A94D`, glow `rgba(196,169,77,.35)`).
- **Running `api:` again with a key already saved** does nothing visible. The Enter line points to `api:new` instead.
- **How often an animation plays sets how long it may last.** Frequent actions (minimise, mode changes) stay under 400ms and show where things went. Rare, deliberate ones may take longer.

**On hold:** the door draw with gold wash on first entry to a room (`room:`), gold step dots while `run:` executes, gold-to-ink on `accept:`, `name:` settling from gold, a glint on `save:`. All are prototyped in the v2 study and can be revisited.

**Not pursued:**

| Study | What it did | Why not |
| --- | --- | --- |
| Seeds (v3) | Field broke into triangular shards that drifted away, leaving a hexagon | Too long for an action that fires on every click into a reply |
| Dust (v4) | `bar:hide` turned the field into 3px grains on the wind | Bar hiding was dropped. Kept as a technique if a rare, deliberate moment needs it |

## Command inventory

Every command found in the chats, with the date it first appeared, rebuilt from transcripts because the v30 file itself was not readable. Retired commands stay listed so their replacements can be traced.

| Command | Group | Does | First seen | Status |
| --- | --- | --- | --- | --- |
| `>` | Leader | opens the command line | Sep 17 | Current |
| `p>` / `prompt>` | Leader, listed in Start | switches to prompt | Sep 17 | Current. `p:` alias rejected Sep 23 |
| `s>` / `search>` | Leader | returns to search | Sep 21 | Current |
| `?` / `help` | Help | every command | Sep 17 | Current. Docket built it as `help:`; open |
| `/` | Key | jumps to the field | Sep 18 | Current |
| Cmd/Ctrl+K | Key | opens the field from anywhere | Sep 17 | Kept: the only shortcut that works inside a reply |
| `alm:` `lab:` `sym:` | Go to | move between surfaces | Sep 17 | Current |
| `library:` `tour:` | Go to | Library page, guided tour | Sep 30 | Current |
| `jump:` | Go to | scroll to an id on this board | Oct 7 | **Renamed today** from `go:` |
| `c:` / `c:n` | Start | new chat / continue | Sep 17 | Replaced Sep 23 by `new:` and `open:` |
| `d:` / `d:n` | Start | new docket / open | Sep 17 | Replaced Sep 23 by `new:` and `open:` |
| `new:` | Start | chat, docket, room; step, run, branch in a docket | Sep 23 | Current |
| `open:` | Start | arrive at a thing; adds a card on multi-card surfaces | Sep 23 | Current. `split:` rejected |
| `run:` | Run | start a run, one address only | Sep 23 | Current. Was a filter Sep 18, moved to `from:run n` |
| `stop:` / `stop:all` | Run | halt a run | Sep 23 / Sep 29 | Current |
| `diff:` | Run | compare what is open | Sep 23 | Current |
| `again:` | Run | ask again as a new branch | Oct 7 | New |
| `invoke:` `analyze:` | Run | model-driven commands | Sep 29 | V2, out of scope |
| `type:` `room:` `tag:` | Filters | narrow the table | Sep 17 | Current. `type:edit` added Oct 7 |
| `model:` `from:` (`source:`) `in:` `has:` `cost:` `since:` `until:` | Filters | narrow the table | Sep 18 | Current |
| `sort:` | Filters | created, active, oldest, newest | Sep 17 | Current. `sort:added` became `sort:created` |
| `clear:filters` | Filters | remove every filter | Sep 18 | Current |
| `save:` | Search | keep this search | Sep 17 | Current |
| `co:` | Collection | collection from ids | Sep 17 | Replaced by `add:` and the collection card |
| `add:` `rm:` `clear:` `compare:` | Collection | build and use the collection | Sep 17 | Current |
| `name:` | Collection | name a collection | Sep 17 | Current. See open items for rooms |
| `duplicate:` | Collection, rooms | copy under a new name | Sep 18 | **Renamed today** from `dup:` |
| `forget:` | Collection | remove a saved search or collection | Sep 18 | Current |
| `tagadd:` `retag:` `untag:` | Tags | tag, rename, remove | Sep 17 | Current |
| `rename:` `pin:` `archive:` | Items | one thing at a time | Sep 17 | Current |
| `undo:` | Items | take back the last command; stops at execution | Sep 17 | Current. Takes an id as of Oct 7 |
| `peek:` (`read:`) `copy:` `export:` | Items | read in place, copy markdown, export | Sep 18 | Current |
| `note:` | Items | a note for people | Sep 18 | Current. Scope confirmed today |
| `tell:` | Editing | a note the model reads with the next prompt | Oct 7 | **New today** |
| `drop:` | Editing | remove an unsent ask, edit or step | Oct 7 | **New today**, replaces `delete:` |
| `delete:` | n/a | permanent deletion | Sep 18 | Rejected. Use `archive:` or `drop:` |
| `strikethrough:` | Editing | strike a passage | Oct 6 | **Renamed today** from `strike:` |
| `ripple:` `to:` `accept:` `reject:` `hold:` `helper:` `reflect:` `sweep:` `collab:` | Editing | inline editing and review | Oct 7 | New |
| `markup:on` / `markup:off` | Layout | marked-up or clean replies | Oct 7 | **Renamed today** from `view:` |
| `focus:` `focus:save` `focus:off` `calm:` `calm:off` | Layout | what is on screen, how much detail | Oct 7 | New. Replace bar hiding |
| `bar:top` / `bar:bottom` | Layout | field position | Sep 18 | Current. `foot` dropped for `bottom` |
| `bar:hide` / `bar:show` | Layout | hide the field | Oct 7 | Dropped today |
| `swap:` `hide:` `show:` `cols:` `move:` | Layout | panels and columns | Sep 18 | Current |
| `pop:table` `pop:command` `pop:<id>` `pop:back` `pop:library` | Layout | own window | Sep 18 / Sep 20 | Current |
| `reset:` (`refresh:`) | Layout | original layout, pop-outs closed | Sep 18 | Current |
| `arrange:` | Layout | saved window arrangements | Sep 23 | Deferred |
| `set:` | Layout | block settings | Sep 28 | Proposed |
| `edit:` `done:` | Building | edit a room in place | Sep 20 | Current |
| `api:` / `api:new` | Settings | connect or replace a key | Sep 24 | Current. Replaces `add:key` and `key:` |
| `import:` | Settings | open import | Sep 30 | Current |
| `backup:` | Settings | back up | Sep 28 | Proposed |
| `strain:` | Settings | context and storage | Sep 20 | Current |

## Still open, and changes elsewhere

**Open**

- [ ] **Naming a room.** Sep 29 used `name:` for rooms; the welcome flow used `rename:` because `name:` names collections. Pick one.
- [ ] **Quill colour.** The ink pot quill is ink in v5; earlier notes mention a gold quill. The reference file uses ink.
- [ ] **The moon reads as dark mode.** A crescent is the common icon for dark mode and do-not-disturb. Test whether people read the command hexagon as a theme toggle.
- [ ] **Cmd/Ctrl+K.** It was slated for retirement on Sep 23 but is now the only way to open the field from inside a reply. Confirm it stays.
- [ ] **Shared docs.** Confirm whether team notes belong to Starling or Swallow, and whether `tell:` needs a recipient once several models read one doc.
- [ ] **`?` in the docket,** built as `help:`.
- [ ] **`new:api`** as an alias for `api:new`.

**Changes required elsewhere**

- **Welcome flow:** `key:` becomes `api:` in the tour, the marginalia and the verbs table.
- **Inline-editing spec and v5 mockup:** `go:` → `jump:`, `delete:` → `drop:`, `view:` → `markup:`, `strike:` → `strikethrough:`, and the note for the AI → `tell:`.
- **Almanac spec:** `dup:` → `duplicate:`; add `jump:` to the Go to group; record that `delete:` stays out of the vocabulary.
- **Claude Code prompt:** the field and minimise behaviour follow `parliament-bar-final.html`; the verb registry takes the renames above.
