# Spec index

Every design document for the refactor, in date order, with what wins where they
disagree. Written 11 October 2026.

File dates on disk are download dates and say nothing. The dates below are the
ones written inside each document.

## Current documents

| Date | File | What it is | Mockup it speaks for |
|---|---|---|---|
| 22 Sep | `docket-spec-decisions.md` | Docket model, addressing, branches, runs | `parliament_docket_v12.html` |
| 23 Sep | `almanac-spec-decisions.md` | The bar's three modes, addresses, verbs, execution, statuses, sources, data | `parliament_almanac_v30.html` |
| 23 Sep | `settings-spec-decisions.md` | Settings, `api:` key panel, `set:`, `bar:` positions | `parliament_settings_v1.html` |
| 28 Sep, second revision | `arrangements-boards-blocks-decisions.md` | The model: arrangements, boards, rooms, blocks, features, themes. Verbs. The Lab. The collection. Homepage review. Screens. Performance | `parliament_lab_v6.html`, `parliament_screens_v1.html` (neither supplied) |
| about 29 Sep | `parliament_lab_v7_blocks.html` | The Lab with a third board, Blocks. Its header calls it "an alternative to v6, not a replacement" | itself |
| 30 Sep | `welcome-spec-decisions.md` | The first-run page: letter, eight steps, the field, the ending, the advanced list | `parliament_welcome_v8.html` (not supplied; v9 replaces it) |
| 6 Oct | `welcome-inline-editing-spec.md` | Welcome v9: editable replies, strike, note for the AI, two more steps | `parliament_welcome_v9.html` |
| 6 Oct | `editing-in-place-spec.md` | Editing replies and prompts, asks, Ripple, the Collection's cards, collab, Reflection, sweeps, focus, calm, legibility | `parliament-inline-editing-v5.html` |
| 7 Oct, updated 9 Oct | `bar-and-commands-decisions.md` | The field, minimising to a hexagon, gold, seven renamed verbs, the command inventory | `parliament-bar-reference.html` |

Working files written during the refactor: `inventory.md`, `conflicts.md`,
`change-plan.md` (the 24 September plan, due to be replaced by
`refactor-plan.md`), `plan-brief.md` (the analysis the new plan is built from),
and `research/` (code audits).

## What wins

1. **A mockup's header comment beats its companion document** on anything the
   mockup shows. Every decisions document says so about its own mockup.
2. **Newer beats older.** In practice, for each topic:
   - **The bar** (modes, Escape, keys, minimising, gold): `parliament-bar-reference.html`, 9 October.
   - **Verb names**: `bar-and-commands-decisions.md`, 7 October. Its inventory was rebuilt from chat transcripts, so where it lists an older verb as "current" against a later decision (for example `peek:`, `rename:`, `hide:`), treat that as a question, not a ruling.
   - **Editing, asks, Ripple, collab, Reflection, focus, calm, legibility**: `editing-in-place-spec.md`, 6 October. It says it wins over the welcome v9 spec where they differ.
   - **The first-run page**: `parliament_welcome_v9.html`, then `welcome-spec-decisions.md`, except where the two documents above override it.
   - **The model and the Lab**: `arrangements-boards-blocks-decisions.md`, 28 September.
   - **Docket, addresses, statuses, execution, sources**: the Almanac and docket documents, as ruled in `conflicts.md`.
3. **Visual values come from the newest mockup that draws the thing.** The mockups do not share one token sheet: `--ink-2`, `--ink-3` and marginalia opacity differ between welcome v9, inline editing v5 and the bar reference. One sheet has to be settled before the new chrome is built.
4. **Rulings in `conflicts.md` stand** unless a later document reverses them. The ones the new documents reverse are listed in `plan-brief.md`.

## Superseded, kept for the record

In `superseded/`. Do not build from these.

| File | Replaced by |
|---|---|
| `components-and-arrangements-decisions.md` (28 Sep, earlier session) | `arrangements-boards-blocks-decisions.md`, which says it replaces it |
| `bar-and-commands-decisions-2026-10-07.md` | `bar-and-commands-decisions.md`. One line differs: the hexagon now lands at the centre, and `pop:left`, `pop:right`, `pop:center` move it |
| `parliament-bar-reference-2026-10-07.html` (downloaded as "rounder field") | `parliament-bar-reference.html`, which carries the 9 October update |

Three attachments were byte-identical to files already here and were not copied
again: docket v12, the Settings decisions, and the original Claude Code prompt.

## Referenced but not supplied

| File | Named by | Needed for |
|---|---|---|
| `parliament-branch-slider-v9.html` | editing spec, welcome spec §13 | Branch tabs, reply to one or all, `open:` with or without a summary, the numbered source picker. The conversation board cannot be planned in detail without it |
| `parliament-collection-board-v3.html` | editing spec, welcome spec §13 | Collection cards, ids, finding in both directions, `new:collection`, `note:`, `compare:`, `summarize:` |
| `parliament_lab_v6.html` | arrangements doc | The decided Lab. v7 calls itself an alternative to it |
| `parliament_screens_v1.html` | arrangements doc §7a | The `arrange:` map across screens |
| `parliament-bar-final.html` | bar decisions doc | Believed to be `parliament-bar-reference.html` under another name. To confirm |
| The power-on shimmer spec | bar decisions doc | Timing and colour of the `api:` ignition |
| `parliament_welcome_v8.html` | welcome spec | Not needed; v9 replaces it |
| `secretarybird-mode.jsx`, `starling-ripple-and-naming.md` | editing spec | History only. Secretarybird's code is in `src/components/core/sbrd/` |
