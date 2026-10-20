# Token sheet

Drafted 20 October 2026 for Stefan's approval (refactor-plan.md, stage 3;
C51). One set of colours, type, shapes and motion for the new chrome, settled
before any chrome is drawn. The values are in `src/styles/tokens.css`, not yet
loaded by the app, and drawn at `/dev/tokens` in development.

**Rule** (C51, A1): the newest mockup that defines a value wins. That is the
bar reference (`parliament-bar-reference.html`, 9 October) where it defines
one, then the editing spec's legibility table and its mockup (6 October),
then the older mockups. Rooms keep their own themes: the chrome's tokens are
prefixed `--ch-`, and room themes use `--p-`, so a room cannot reach them.
Light mode only for now.

Contrast is against the paper colour `#FCFCFA`. Small text needs 4.5:1
(WCAG AA, as the editing spec asks).

## Colours

| Token | Value | Contrast | Use | Source |
|---|---|---|---|---|
| `paper` | #FCFCFA | | The page | All |
| `surface` | #FFFFFF | | Cards, the open field | All |
| `subtle` | #FAF9F5 | | Table heads, quiet fills | All |
| `tray` | #F6F5F1 | | Trays in the Collection | Editing v5, Collection v3 |
| `ink` | #191919 | 17.1 | Text | All |
| `ink-2` | #45433F | 9.6 | Secondary text | Bar reference |
| `ink-3` | #6B6964 | 5.3 | Ids, struck words | Bar reference |
| `marg` | ink at 62% | 4.9 | Marginalia, the Enter line | Bar reference, editing spec |
| `soft` | ink at 30% | | Dashed outlines; never text | Editing v5 |
| `wash`, `wash-2` | ink at 4.5%, 7.5% | | A selected row, a done pill | Editing v5, welcome v9 |
| `divider`, `rule` | ink at 8% | | Hairlines, rules | Bar reference |
| `border`, `border-2` | #E9E9E7, #F1F1EF | | Card edges, inner hairlines | All |
| `tri` | rgba(122,120,114,.17) | | The prompt fill's mosaic | Editing v5, welcome v9 |
| `navy` | rgb 22, 38, 70 | 14.6 | Command mode, the navy rule | Bar reference |
| `navy-2` | rgb 38, 56, 92 | 11.3 | Second navy | Bar reference |
| `gold` | #C4A94D | 2.2 | The `api:` ignition only, never text | Bar reference (C50) |
| `gold-deep` | #8B6A10 | 4.9 | The hexagon's edge on hover | Bar reference (C50) |
| `gold-glow` | rgba(196,169,77,.35) | | The ignition's glint | Bar reference |
| `you` | #2B5CB8 | 6.1 | Your words, solid underline | Bar reference |
| `ai` | #2E7458 | 5.4 | An ask's answer or a sweep, dotted underline | Editing v5 |
| `rust` | #94491F | 6.3 | Ripple, dashed underline | Bar reference, editing spec |
| `mark-edit`, `mark-ask`, `mark-note`, `mark-high`, `mark-quote` | the colours above at 45%, pink at 40%, ink at 28% | | Underlines and highlights in a reply | Editing v5 |

**Kinds**, text on a tint (Almanac v30), each now 4.5 or more:

| Kind | Text | Tint | Contrast |
|---|---|---|---|
| Chat | #2F5BC4 | blue at 11% | 5.3 |
| Note | #5A4AB0 | purple at 12% | 5.9 |
| Highlight | #B63674 | pink at 11% | 4.7 |
| Docket | #0E728D | teal at 12% | 4.7 |

## Type

System sans for the interface, a serif for marginalia and letters, mono for
ids (stacks from the bar reference).

| Token | Size | Use |
|---|---|---|
| `t-display` | 22px | The welcome page's largest line |
| `t-title` | 18px | Titles |
| `t-lead` | 15.5px | Headings inside cards |
| `t-body` | 14px | The field, rows, body |
| `t-small` | 12.5px | Secondary labels, table cells |
| `t-marg` | 11.5px | Marginalia, the Enter line, legends: the smallest for words |
| `t-id` | 10.5px | Ids, in mono: the smallest text of all |

Line height 1.5, and 1.6 for reading.

## Shape and motion

- Corners: 4px (the hexagon, chips), 6px (inputs), 8px (buttons), 14px (the
  open field), 16px (cards). The field is 40px tall.
- Cards carry a faint lift (`0 1px 2px rgba(40,36,28,.035)` and a half-pixel
  ring at 5%), no borders or hatching (welcome spec §2).
- Keyboard focus: a 2px ink outline on anything focused (editing spec).
- Easing `cubic-bezier(.65,0,.35,1)`. A mode's fill wipes in over 280ms; the
  field folds to the hexagon over 360ms; the chevron rolls into the moon over
  460ms; hover opens after 140ms and closes 600ms after leaving. With reduced
  motion every duration is multiplied by 0.001.

## Where the mockups differ

| Token | The sheet takes | It leaves |
|---|---|---|
| `ink-2` | #45433F, bar reference (9.6) | #5F5E59, editing spec (6.3); #787774, older mockups (4.4) |
| `ink-3` | #6B6964, bar reference (5.3) | #6F6E69, editing spec (5.0); #9B9A97, older (2.7) |
| `marg` | ink at 62% (4.9) | ink at 46% in welcome v9, the Lab, Settings and the Almanac (3.0, too faint) |
| `you` | #2B5CB8, bar reference | #2F5DA8, editing spec |
| `rule` | ink at 8%, bar reference | ink at 12%, welcome v9 |
| Highlight label | #B63674, darkened | #BE3878, Almanac v30 (4.4, just short) |
| Docket label | #0E728D, darkened | #0E7490, Almanac v30 (4.5, on the edge) |
| Serif stack | without Times New Roman, bar reference | with it, editing spec |

## Left behind

From mockups older than the welcome and editing decisions:

- The page hatch and dotted borders (`paper-hatch`, `hatch-gap`, `ink-dot`,
  `line-a`, `line-w`, `p-line-soft`, `paper-ink`): retired (welcome spec §2,
  P1).
- Gold for selected and active states (`gold-light`, `gold-muted`, the gold
  tints): gold is the ignition and the hexagon's edge only (C50).
- Marginalia at 46% and the paler greys: the legibility table.

## Open

- Labels for terms, quotes, edits, asks and suggestions: no mockup draws them
  yet (C56, C77).
- Dark mode: later.
