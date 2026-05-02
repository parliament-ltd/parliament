# V1 mockup archive

Standalone `.jsx` mockup files used during the original V1 design pass and
the run-up to V2. Preserved (not deleted) per [v2-phase1-audit.md](../v2-phase1-audit.md)
§3.12 / NQ-10 — they remain useful as a fidelity reference when checking
whether a V2 catalog component matches the visual intent it inherited from
V1.

These files are NOT part of the application build. They:

- Are not imported by anything in `src/`.
- Live in `refactor/` (excluded from production bundling).
- Use V1 vocabulary (modes, Albatross / Pelican / Secretarybird, etc.) and
  V1 design tokens. Cross-reference with the current implementation rather
  than treating these as authoritative.

## Mockup index

| File | What it depicts |
|---|---|
| `chat-interface-final.jsx` | V1 desktop chat conversation surface |
| `chat-interface-mobile.jsx` | V1 mobile (Swift) chat surface |
| `chat-selector-v6.jsx` | **V1 final** chat selector (flat branch model, global view toggle, count badges, inline summaries / notes / highlights / branches) |
| `chat-selector-v2.jsx` | Superseded V1 selector (nested branch model) |
| `chat-selector.jsx` | Earliest V1 selector iteration |
| `chat-selector-mobile.jsx` | V1 mobile selector |
| `branch-panel-v3.jsx` | Branch creation panel (Full History / Compressed Summary modes, inline context meter, savings animation) |
| `settings.jsx` | V1 settings page (all sections) |
| `settings-mobile.jsx` | V1 mobile settings layout |
| `pelican-mode.jsx` | V1 Pelican workspace (three-panel: file shelf + canvas + inspector). Reference for the Phase 1 catalog decomposition into `file-shelf@1.0` / `chart-canvas@1.0` / `table-canvas@1.0` / `summary-dashboard@1.0` / `column-inspector@1.0` against `canvas-centric@1.0`. |

## Why archive instead of delete?

The audit deliberately preserves the visual record. V1 ran for over a year
with these mockups as the design source of truth, and the V2 catalog
components are intended to reproduce their look-and-feel. If a regression
report says "this used to feel different," the relevant mockup here is
where to start.

When a V2 surface has fully diverged from its V1 source, the corresponding
mockup can be removed in a future cleanup PR — but only after deliberate
review, not as part of a routine sweep.
