// Blueprint shape system (PR-14, expanded in PR-16a).
//
// Pure functions that pack N user rooms into a fixed viewBox and produce
// the SVG path geometry the floor-plan renderer draws. Three halves:
//
//   1. Per-layout shape signature  — each known layout maps to a small
//      family of irregular paths (three-panel has bumps where the rails
//      slot in, canvas-centric has an alcove or notch, document-centric
//      has chamfered "page corners," single-column has mobile-feel
//      capsule corners). The irregularity is what makes the blueprint
//      feel hand-drawn rather than a grid of rectangles. Per
//      refactor/parliament_v2_design_decisions.md §2.5: "Rooms can have
//      one irregular edge or subtle character detail within the hatching
//      grammar. This is rare and meaningful, not decorative."
//
//   2. Variant + mirror picking — within the same layout, each room's
//      shape is picked from a curated set (3 variants per layout) by
//      `hash mod 3`, then optionally mirrored horizontally by another
//      hash bit. Same room id always renders the same shape. The
//      combination of variant + mirror gives ~5–6 visually distinct
//      shapes per layout. Per-room id seed also perturbs the bump
//      depths and positions by a few pixels.
//
//   3. Interior wall hints — `interiorHints()` returns dashed-line +
//      rect specs the renderer paints inside the room. These hint at
//      the layout's slot structure without drawing components — a
//      three-panel room shows two faint vertical lines where the
//      rails would be; a canvas-centric room shows a faint canvas
//      frame; etc. Pulled from the spec at lines 1043–1108.
//
// No React, no IndexedDB, no DOM. Pure inputs → pure outputs. Renderer
// reads the output and mounts SVG. Future V3 work (rooms growing with
// usage, doorways between branched chats — see design doc §8) plugs in
// as additional inputs to packRooms() without touching the renderer.

// ─── Constants ───────────────────────────────────────────────

// PR-40 polish: dimensions match refactor/blueprint_with_room_modal.html
// so the rendered floor plan reads at the same proportions as the
// mockup. ROW_HEIGHT bumped 55 → 110, gaps 14/10 → 22/22, and
// TARGET_INNER_WIDTH 170 → 600 so single-row floor plans don't
// collapse the viewBox onto the rooms and render them oversized.
// With these defaults the floor plan stays in the ~680px-wide viewBox
// ballpark even when the user only has 1–2 rooms — matching the
// "zoomed-out architect's drawing" feel of the mockup.
export const VIEWBOX_PAD = 22        // outer wall margin (mockup uses 22)
export const WALL_THICKNESS = 4      // outer wall stroke width (mockup)
export const ROW_HEIGHT = 110        // target room interior height
export const ROW_GAP = 22            // gap between rows (becomes the horizontal hallway height)
export const TARGET_INNER_WIDTH = 720 // floor inner width — rooms in a row distribute to fill this
// PR-40 polish: padding INSIDE the floor before the first room (and
// after the last) so the irregular shape generators' outward bumps
// (~12 SVG units deep) have room to fit without crossing the dark
// wall border. Top/bottom of first/last row also picks up this pad.
export const INNER_PAD = 14
// Minimum gap between rooms within a row. The row distribution pass
// can grow gaps up to whatever leftover space remains after packing
// — the larger the gap, the more it reads as a corridor.
export const ROOM_GAP = 22

// Per-layout aspect ratio (width / ROW_HEIGHT). Loosely follows the
// proportions in refactor/parliament_homepage_v2 (2).html with small
// normalization so all rooms share a single ROW_HEIGHT.
const LAYOUT_ASPECT = {
  'three-panel':              1.25,
  'canvas-centric':           0.95,
  'document-centric':         0.70,
  'single-column-with-sheet': 0.60,
}

// Fallback aspect for layouts we don't have a signature shape for yet
// (community layouts will land here in V3). Renders as a plain rectangle
// at 1:1 — still inside the blueprint hatching grammar, just no character
// detail. Better than crashing.
const DEFAULT_ASPECT = 1.0

// PR-19e: system rooms (The Study, The Lab) — straight-edge cards with
// distinct signature shapes (Study = bottom-left desk wedge; Lab =
// top-right workbench notch). PR-19f packs them AFTER user rooms so the
// user's own work anchors row 1 and system rooms flow in naturally.
// Aspect ratio bumped to 1.10 (was 0.55) to give the new shapes room
// to breathe and let The Study's four component pills fit on one row.
export const SYSTEM_KIND = 'system'
const SYSTEM_ASPECT = 1.10
export const SYSTEM_ROOM_IDS = {
  STUDY: '__study__',
  LAB: '__lab__',
}

// ─── Hash + seeded perturbation ──────────────────────────────

/**
 * Stable djb2 hash of a string → unsigned 32-bit int. Used as the seed
 * for per-room shape variability so the same room id always renders the
 * same path. Rooms with no id (shouldn't happen, but defensive) hash to 0.
 */
export function hashString(s) {
  if (!s) return 0
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/** Map a hash to a float in [-1, 1] — used to shift positions/depths. */
function pertub(hash, slot) {
  const x = (hash >>> (slot * 4)) & 0xff
  return (x / 127.5) - 1.0
}

/** Standard interior inset — labels and pills sit inside this padded box. */
function interiorBox(box) {
  return { x: box.x + 8, y: box.y + 8, width: box.width - 16, height: box.height - 16 }
}

// ─── Layout signature shape generators ───────────────────────
//
// Each generator takes a bounding box { x, y, width, height } and a
// hash seed, and returns:
//   { path: 'M ... Z', interior: { x, y, width, height } }
// `interior` is the inset box renderer uses to place labels + pills,
// excluding any irregular protrusion. Mirroring (when applied later)
// flips the path's x-coordinates around the box's vertical center but
// leaves `interior` alone — labels stay centered.

const layoutFor = (ref) => (ref || '').split('@')[0].split('/').pop()

// ─── Three-panel variants (3) ────────────────────────────────

/** v0: right-rail bump (sidebar tucks out right). */
function threePanelRightBumpPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const bumpY = y + h * (0.55 + 0.12 * pertub(seed, 0))
  const bumpHeight = 28
  const bumpDepth = 10 + Math.round(2 * pertub(seed, 1))
  const top = y, bottom = y + h, right = x + w, left = x
  const d = [
    `M ${left} ${top}`,
    `L ${right} ${top}`,
    `L ${right} ${bumpY}`,
    `L ${right + bumpDepth} ${bumpY}`,
    `L ${right + bumpDepth} ${bumpY + bumpHeight}`,
    `L ${right} ${bumpY + bumpHeight}`,
    `L ${right} ${bottom}`,
    `L ${left} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v1: dual-bump (both rails tuck out — symmetric three-panel feel). */
function threePanelDualBumpPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const bumpY = y + h * (0.5 + 0.10 * pertub(seed, 0))
  const bumpHeight = 22
  const bumpDepth = 8 + Math.round(2 * pertub(seed, 1))
  const top = y, bottom = y + h, right = x + w, left = x
  const d = [
    `M ${left} ${top}`,
    `L ${right} ${top}`,
    `L ${right} ${bumpY}`,
    `L ${right + bumpDepth} ${bumpY}`,
    `L ${right + bumpDepth} ${bumpY + bumpHeight}`,
    `L ${right} ${bumpY + bumpHeight}`,
    `L ${right} ${bottom}`,
    `L ${left} ${bottom}`,
    `L ${left} ${bumpY + bumpHeight}`,
    `L ${left - bumpDepth} ${bumpY + bumpHeight}`,
    `L ${left - bumpDepth} ${bumpY}`,
    `L ${left} ${bumpY}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v2: tall right-bump (a thicker sidebar — bump spans ~50% of height). */
function threePanelTallBumpPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const bumpY = y + h * (0.25 + 0.10 * pertub(seed, 0))
  const bumpHeight = h * 0.5
  const bumpDepth = 10 + Math.round(2 * pertub(seed, 1))
  const top = y, bottom = y + h, right = x + w, left = x
  const d = [
    `M ${left} ${top}`,
    `L ${right} ${top}`,
    `L ${right} ${bumpY}`,
    `L ${right + bumpDepth} ${bumpY}`,
    `L ${right + bumpDepth} ${bumpY + bumpHeight}`,
    `L ${right} ${bumpY + bumpHeight}`,
    `L ${right} ${bottom}`,
    `L ${left} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v3: spec-aligned right-edge tab — narrower bump centered on the
 *  right side, matching parliament_homepage_v2.html lines 1040-1041
 *  (Writing Studio shape). Differs from v0/v1/v2 by being shorter and
 *  more centered, evoking a sidebar notch rather than a full half-edge. */
function threePanelSpecTabPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const tabHeight = Math.min(132, h * 0.65)
  const tabDepth = 12
  const top = y, bottom = y + h, right = x + w, left = x
  const tabY = y + (h - tabHeight) / 2 + Math.round(4 * pertub(seed, 0))
  const d = [
    `M ${left} ${top}`,
    `L ${right} ${top}`,
    `L ${right} ${tabY}`,
    `L ${right + tabDepth} ${tabY}`,
    `L ${right + tabDepth} ${tabY + tabHeight}`,
    `L ${right} ${tabY + tabHeight}`,
    `L ${right} ${bottom}`,
    `L ${left} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

// ─── Canvas-centric variants (3) ─────────────────────────────

/**
 * v0: bottom-right alcove — small protrusion outward at the bottom of the
 * right edge, with a 45° transition. Spec match (homepage v2 lines
 * 1073-1077). Replaces PR-14's chamfer-in.
 */
function canvasCentricAlcovePath(box, seed) {
  const { x, y, width: w, height: h } = box
  const right = x + w
  const bottom = y + h
  const altopY = y + h * (0.62 + 0.06 * pertub(seed, 0))
  const depth = 12 + Math.round(2 * pertub(seed, 1))
  const transition = depth // 45° diagonal
  const d = [
    `M ${x} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${altopY}`,
    `L ${right + depth} ${altopY + transition}`,
    `L ${right + depth} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v1: top-right notch — small rectangular bite out of the top-right corner. */
function canvasCentricTopNotchPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const right = x + w
  const bottom = y + h
  const notchInset = 28 + Math.round(4 * pertub(seed, 0))
  const notchDepth = 12 + Math.round(2 * pertub(seed, 1))
  const d = [
    `M ${x} ${y}`,
    `L ${right - notchInset} ${y}`,
    `L ${right - notchInset} ${y + notchDepth}`,
    `L ${right} ${y + notchDepth}`,
    `L ${right} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v3: spec-aligned BR chamfer-out — straight right edge to ~70% of
 *  height, then a 12px diagonal protrusion to a new wider right edge
 *  through the bottom. Matches parliament_homepage_v2.html lines
 *  1073-1077 (Code Lab shape). Differs from the alcove (v0) by being
 *  a single chamfer transition rather than a rectangular alcove. */
function canvasCentricSpecChamferPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const right = x + w
  const bottom = y + h
  const chamY = y + h * (0.7 + 0.04 * pertub(seed, 0))
  const depth = 12
  const d = [
    `M ${x} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${chamY}`,
    `L ${right + depth} ${chamY + depth}`,
    `L ${right + depth} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v2: mid-right L-jog — right edge extends outward for the middle ⅓. */
function canvasCentricLJogPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const right = x + w
  const bottom = y + h
  const jogStart = y + h * (0.32 + 0.04 * pertub(seed, 0))
  const jogEnd = y + h * (0.68 + 0.04 * pertub(seed, 1))
  const depth = 8 + Math.round(2 * pertub(seed, 2))
  const trans = 8
  const d = [
    `M ${x} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${jogStart - trans}`,
    `L ${right + depth} ${jogStart}`,
    `L ${right + depth} ${jogEnd}`,
    `L ${right} ${jogEnd + trans}`,
    `L ${right} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

// ─── Document-centric variants (3) ───────────────────────────

/** v0: bottom-left chamfer (the "page corner" feel — current PR-14 shape). */
function documentCentricBottomLeftPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const cut = 12 + Math.round(4 * pertub(seed, 0))
  const right = x + w
  const bottom = y + h
  const d = [
    `M ${x} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${bottom}`,
    `L ${x + cut} ${bottom}`,
    `L ${x} ${bottom - cut}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v1: top-right chamfer — turned-over page. */
function documentCentricTopRightPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const cut = 12 + Math.round(4 * pertub(seed, 0))
  const right = x + w
  const bottom = y + h
  const d = [
    `M ${x} ${y}`,
    `L ${right - cut} ${y}`,
    `L ${right} ${y + cut}`,
    `L ${right} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v2: double-corner chamfer (TL + BR) — asymmetric "creased page" feel. */
function documentCentricDoubleCornerPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const cut = 10 + Math.round(2 * pertub(seed, 0))
  const right = x + w
  const bottom = y + h
  const d = [
    `M ${x + cut} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${bottom - cut}`,
    `L ${right - cut} ${bottom}`,
    `L ${x} ${bottom}`,
    `L ${x} ${y + cut}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

// ─── Single-column-with-sheet variants (3) ───────────────────

/** v0: top-right chamfer — current PR-14 mobile-feel shape. */
function singleColumnTopRightPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const cut = 10 + Math.round(3 * pertub(seed, 0))
  const right = x + w
  const bottom = y + h
  const d = [
    `M ${x} ${y}`,
    `L ${right - cut} ${y}`,
    `L ${right} ${y + cut}`,
    `L ${right} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v1: bottom-right chamfer — also mobile-feel, mirrored vertically. */
function singleColumnBottomRightPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const cut = 10 + Math.round(3 * pertub(seed, 0))
  const right = x + w
  const bottom = y + h
  const d = [
    `M ${x} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${bottom - cut}`,
    `L ${right - cut} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v3: spec-aligned phone chamfer — small straight drop then diagonal,
 *  evoking a phone's chamfered top corner. The right edge below the
 *  chamfer sits inset (CUT-IN) so the room narrows below — the
 *  "phone in a case" feel from parliament_homepage_v2.html lines
 *  1096-1100 (Pocket shape). Differs from v0 (simple 45° chamfer) by
 *  having a 12px vertical drop before the diagonal. */
function singleColumnSpecPhoneChamferPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const right = x + w
  const bottom = y + h
  const drop = 12
  const inset = 8 + Math.round(2 * pertub(seed, 0))
  const d = [
    `M ${x} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${y + drop}`,
    `L ${right - inset} ${y + drop + inset}`,
    `L ${right - inset} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

/** v2: capsule — both right corners chamfered, "phone in a hand" feel. */
function singleColumnCapsulePath(box, seed) {
  const { x, y, width: w, height: h } = box
  const cut = 8 + Math.round(2 * pertub(seed, 0))
  const right = x + w
  const bottom = y + h
  const d = [
    `M ${x} ${y}`,
    `L ${right - cut} ${y}`,
    `L ${right} ${y + cut}`,
    `L ${right} ${bottom - cut}`,
    `L ${right - cut} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: d, interior: interiorBox(box) }
}

// ─── System room signature shapes (PR-19f) ────────────────────
//
// The Study and The Lab follow the same straight-edge grammar as user
// rooms but with one distinct character detail per room, so they read
// as siblings of user rooms rather than a separate visual species.
//
// Study = bottom-left chamfered corner (a desk-wedge — reading nook
// feel). Lab = top-right rectangular notch (a workbench cubby —
// pulled-out tool drawer feel). Both share the inset interior so
// labels + pills stay centered inside the visible body.

/**
 * The Study — bottom-left desk wedge. A single 22px diagonal chamfer
 * at the bottom-left corner. Same path grammar as
 * documentCentricBottomLeftPath but with a deeper cut so the gesture
 * reads clearly at the system room's larger aspect ratio.
 */
export function studyShape(box) {
  const { x, y, width: w, height: h } = box
  const cut = 22
  const right = x + w
  const bottom = y + h
  const d = [
    `M ${x} ${y}`,
    `L ${right} ${y}`,
    `L ${right} ${bottom}`,
    `L ${x + cut} ${bottom}`,
    `L ${x} ${bottom - cut}`,
    'Z',
  ].join(' ')
  return { path: roundPath(d), interior: interiorBox(box) }
}

/**
 * The Lab — top-right workbench cubby. Small rectangular notch cut
 * inward from the top-right corner (~22px inset × ~16px deep).
 */
export function labShape(box) {
  const { x, y, width: w, height: h } = box
  const inset = 22
  const depth = 16
  const right = x + w
  const bottom = y + h
  const d = [
    `M ${x} ${y}`,
    `L ${right - inset} ${y}`,
    `L ${right - inset} ${y + depth}`,
    `L ${right} ${y + depth}`,
    `L ${right} ${bottom}`,
    `L ${x} ${bottom}`,
    'Z',
  ].join(' ')
  return { path: roundPath(d), interior: interiorBox(box) }
}

// ─── Path rounding (mini-map) ─────────────────────────────────
//
// All variant generators above emit polygons made of `M` + `L` commands
// closed with `Z`. For the mini-map redesign we want every interior
// vertex to be rounded with a small radius (~4-5 svg units), preserving
// the per-variant character (bumps, notches, chamfers) while softening
// the silhouette. roundPath() parses the M/L/Z path, and for each
// vertex of the closed polygon, trims `radius` along the incoming and
// outgoing edges, replacing the sharp corner with a quadratic Bezier
// (Q) through the trim points.
//
// Trim distance is capped at half the adjacent edge length so very
// short edges (e.g. the 12px depth of a sidebar bump perpendicular to
// the wall) don't over-round into themselves.

/**
 * Round every interior vertex of an M/L/Z polygon path.
 *
 * @param {string} d — SVG path string with only M, L, Z commands
 * @param {number} [radius=5] — max trim distance from each vertex along
 *   each adjacent edge
 * @returns {string} — new path string with rounded corners
 */
export function roundPath(d, radius = 5) {
  const tokens = d.trim().split(/\s+/)
  const points = []
  let i = 0
  while (i < tokens.length) {
    const cmd = tokens[i]
    if (cmd === 'M' || cmd === 'L') {
      const x = parseFloat(tokens[i + 1])
      const y = parseFloat(tokens[i + 2])
      points.push({ x, y })
      i += 3
    } else if (cmd === 'Z' || cmd === 'z') {
      i += 1
    } else {
      // unknown token (curves we don't generate); bail out
      return d
    }
  }
  const n = points.length
  if (n < 3) return d

  const trims = []
  for (let k = 0; k < n; k++) {
    const prev = points[(k - 1 + n) % n]
    const curr = points[k]
    const next = points[(k + 1) % n]
    const v1x = prev.x - curr.x
    const v1y = prev.y - curr.y
    const v2x = next.x - curr.x
    const v2y = next.y - curr.y
    const len1 = Math.hypot(v1x, v1y) || 1
    const len2 = Math.hypot(v2x, v2y) || 1
    const r1 = Math.min(radius, len1 / 2)
    const r2 = Math.min(radius, len2 / 2)
    trims.push({
      curr,
      tIn:  { x: curr.x + (v1x / len1) * r1, y: curr.y + (v1y / len1) * r1 },
      tOut: { x: curr.x + (v2x / len2) * r2, y: curr.y + (v2y / len2) * r2 },
    })
  }

  const f = (n) => n.toFixed(2)
  const parts = []
  for (let k = 0; k < n; k++) {
    const { curr, tIn, tOut } = trims[k]
    if (k === 0) {
      parts.push(`M ${f(tIn.x)} ${f(tIn.y)}`)
    } else {
      parts.push(`L ${f(tIn.x)} ${f(tIn.y)}`)
    }
    parts.push(`Q ${f(curr.x)} ${f(curr.y)} ${f(tOut.x)} ${f(tOut.y)}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

// ─── Fallback ─────────────────────────────────────────────────

/** Plain rectangle for unknown layouts. */
function rectanglePath(box) {
  const { x, y, width: w, height: h } = box
  const right = x + w
  const bottom = y + h
  const d = `M ${x} ${y} L ${right} ${y} L ${right} ${bottom} L ${x} ${bottom} Z`
  return { path: d, interior: interiorBox(box) }
}

// ─── Variant tables ──────────────────────────────────────────

// PR-19a added a fourth, spec-aligned variant for the three layouts
// the parliament_homepage_v2.html mockup explicitly draws (three-panel
// = Writing Studio's right-edge tab; canvas-centric = Code Lab's
// chamfer-out at ~70%; single-column-with-sheet = Pocket's phone-style
// chamfer-in). document-centric stays at three because the mockup
// doesn't draw a document room — the existing three already cover its
// design space.
const SHAPE_VARIANTS = {
  'three-panel': [
    threePanelRightBumpPath,
    threePanelDualBumpPath,
    threePanelTallBumpPath,
    threePanelSpecTabPath,
  ],
  'canvas-centric': [
    canvasCentricAlcovePath,
    canvasCentricTopNotchPath,
    canvasCentricLJogPath,
    canvasCentricSpecChamferPath,
  ],
  'document-centric': [
    documentCentricBottomLeftPath,
    documentCentricTopRightPath,
    documentCentricDoubleCornerPath,
  ],
  'single-column-with-sheet': [
    singleColumnTopRightPath,
    singleColumnBottomRightPath,
    singleColumnCapsulePath,
    singleColumnSpecPhoneChamferPath,
  ],
}

// ─── Mirroring ───────────────────────────────────────────────

/**
 * Reflect every coordinate pair in an SVG path string across a vertical
 * axis. Only handles `M x y`, `L x y`, and `Z` — the only commands the
 * generators above produce. Negative numbers are preserved, decimals are
 * preserved, command order is preserved.
 *
 * Note: mirroring flips the path's winding direction (CW → CCW).
 * SVG's default `nonzero` fill rule renders both directions identically
 * for simple closed polygons, which is all we generate, so this is safe.
 */
export function mirrorPath(d, axisX) {
  return d.replace(/([ML])\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, cmd, x, y) => {
    const mx = 2 * axisX - parseFloat(x)
    return `${cmd} ${mx} ${y}`
  })
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Build a single room's path geometry. Internally:
 *  - hash the room id → seed
 *  - pick a variant index (seed mod 3)
 *  - decide whether to mirror (seed bit 8)
 *  - apply per-room px-level perturbations inside the variant
 *
 * Same room id always returns the same shape (deterministic across
 * reloads). Different room ids of the same layout get different
 * variant + mirror combinations from a pool of ~6 unique outcomes.
 *
 * @param {object} args
 * @param {{x,y,width,height}} args.box
 * @param {string} args.layoutRef — full mode-file ref like 'three-panel@^1.0'
 * @param {string} args.roomId — used as hash seed for per-room variability
 * @returns {{ path: string, interior: object }}
 */
export function buildRoomPath({ box, layoutRef, roomId }) {
  const layout = layoutFor(layoutRef)
  const variants = SHAPE_VARIANTS[layout]
  if (!variants) {
    const r = rectanglePath(box)
    return { path: roundPath(r.path), interior: r.interior }
  }

  const seed = hashString(roomId)
  const variant = variants[seed % variants.length]
  const { path, interior } = variant(box, seed)

  // Mirror bit lives in seed bit 8 — separate from the slots used by
  // pertub() (slots 0–4) so mirror choice doesn't correlate with bump
  // depth/position.
  const shouldMirror = ((seed >>> 8) & 1) === 1
  const raw = shouldMirror ? mirrorPath(path, box.x + box.width / 2) : path

  // Mini-map redesign: round every interior vertex so the rooms read
  // as soft cards on a page rather than sharp polygons. Per-variant
  // bump/notch/chamfer character is preserved (the trim radius is
  // small relative to those features); only the corners soften.
  return { path: roundPath(raw), interior }
}

// ─── Interior wall hints ─────────────────────────────────────
//
// Returns an array of SVG node specs the renderer paints inside each
// room. These are dashed-line / dashed-rect hints that suggest the
// layout's slot structure (rails, canvas, page bands, mobile column)
// without rendering actual components. Hash-perturbed so each room's
// hints are slightly shifted.
//
// Renderer maps these specs to <line>/<rect> elements with
// stroke="#C8C2B8" and the appropriate dasharray. Spec source:
// refactor/parliament_homepage_v2 (2).html lines 1043-1108.

/**
 * @param {object} args
 * @param {{x,y,width,height}} args.box
 * @param {string} args.layoutRef
 * @param {string} args.roomId
 * @returns {Array<{type: 'line' | 'rect', ...}>}
 */
export function interiorHints({ box, layoutRef, roomId }) {
  const layout = layoutFor(layoutRef)
  const seed = hashString(roomId)
  const { x, y, width: w, height: h } = box

  if (layout === 'three-panel') {
    // Two vertical rails at ~17% and ~87% of width, spanning ~75% height.
    const leftX = x + w * 0.17 + Math.round(2 * pertub(seed, 2))
    const rightX = x + w * 0.87 + Math.round(2 * pertub(seed, 3))
    const lineTop = y + h * 0.20
    const lineBottom = y + h * 0.92
    return [
      { type: 'line', x1: leftX,  y1: lineTop, x2: leftX,  y2: lineBottom },
      { type: 'line', x1: rightX, y1: lineTop, x2: rightX, y2: lineBottom },
    ]
  }

  if (layout === 'canvas-centric') {
    // A single dashed-stroke rectangle in the upper portion — the canvas
    // frame. Width ~60%, height ~50%, centered horizontally.
    const rectW = w * 0.62
    const rectH = h * 0.46
    const rectX = x + (w - rectW) / 2 + Math.round(2 * pertub(seed, 2))
    const rectY = y + h * 0.18 + Math.round(2 * pertub(seed, 3))
    return [
      { type: 'rect', x: rectX, y: rectY, width: rectW, height: rectH, hatched: true },
    ]
  }

  if (layout === 'document-centric') {
    // Two faint horizontal page bands — at ~30% and ~55% of room height.
    const lineLeft = x + w * 0.18
    const lineRight = x + w * 0.82
    const band1Y = y + h * 0.30 + Math.round(2 * pertub(seed, 2))
    const band2Y = y + h * 0.55 + Math.round(2 * pertub(seed, 3))
    return [
      { type: 'line', x1: lineLeft, y1: band1Y, x2: lineRight, y2: band1Y },
      { type: 'line', x1: lineLeft, y1: band2Y, x2: lineRight, y2: band2Y },
    ]
  }

  if (layout === 'single-column-with-sheet') {
    // A narrow vertical column hint, centered horizontally, occupying
    // ~45% of room height in the upper-middle.
    const rectW = w * 0.42
    const rectH = h * 0.46
    const rectX = x + (w - rectW) / 2
    const rectY = y + h * 0.30 + Math.round(2 * pertub(seed, 2))
    return [
      { type: 'rect', x: rectX, y: rectY, width: rectW, height: rectH, hatched: true },
    ]
  }

  return []
}

// ─── Bin-packing ─────────────────────────────────────────────

function aspectFor(layoutRef) {
  return LAYOUT_ASPECT[layoutFor(layoutRef)] ?? DEFAULT_ASPECT
}

/**
 * Pack a list of rooms into rows. Greedy: keep adding to the current row
 * until adding another room would exceed TARGET_INNER_WIDTH, then wrap.
 *
 * PR-19f: system rooms (The Study + The Lab, when `includeSystem`) are
 * appended AFTER user rooms so the user's own work anchors row 1. With
 * natural packing they often wrap onto row 2 — that's the point.
 *
 * @param {Array<{id: string, layoutRef: string}>} rooms
 * @param {{ includeSystem?: boolean }} options
 * @returns {{
 *   viewBox: { width: number, height: number },
 *   wallBox: { x, y, width, height },
 *   floorBox: { x, y, width, height },
 *   placedRooms: Array<{ id, layoutRef, kind, box }>,
 * }}
 */
export function packRooms(rooms, { includeSystem = false } = {}) {
  const items = []

  for (const r of rooms) {
    items.push({
      id: r.id,
      layoutRef: r.layoutRef,
      kind: 'room',
      width: Math.round(aspectFor(r.layoutRef) * ROW_HEIGHT),
    })
  }

  if (includeSystem) {
    items.push({
      id: SYSTEM_ROOM_IDS.STUDY,
      layoutRef: null,
      kind: SYSTEM_KIND,
      width: Math.round(SYSTEM_ASPECT * ROW_HEIGHT),
    })
    items.push({
      id: SYSTEM_ROOM_IDS.LAB,
      layoutRef: null,
      kind: SYSTEM_KIND,
      width: Math.round(SYSTEM_ASPECT * ROW_HEIGHT),
    })
  }

  // Floor inner area available for rooms is TARGET_INNER_WIDTH minus
  // INNER_PAD on each side so first/last room have margin for their
  // outward bumps.
  const rowBudget = TARGET_INNER_WIDTH - 2 * INNER_PAD

  // PR-40 polish: pack rooms into rows using ROOM_GAP as the minimum
  // gap. After packing we'll distribute leftover space across the
  // gaps so each row spans the full rowBudget (and the rooms reach
  // the floor edges).
  const rowSpecs = []  // [{ items: [...], totalRoomWidth: number }]
  let currentRow = []
  let currentRoomWidth = 0

  function commitRow() {
    if (currentRow.length === 0) return
    rowSpecs.push({ items: currentRow, totalRoomWidth: currentRoomWidth })
    currentRow = []
    currentRoomWidth = 0
  }

  for (const item of items) {
    const projected =
      currentRoomWidth +
      (currentRow.length > 0 ? ROOM_GAP : 0) +
      item.width
    if (currentRow.length > 0 && projected > rowBudget) {
      commitRow()
    }
    currentRow.push(item)
    currentRoomWidth += (currentRow.length > 1 ? ROOM_GAP : 0) + item.width
  }
  commitRow()

  // Floor width is fixed by TARGET_INNER_WIDTH so the layout reads as
  // the "architect's drawing" zoom even when there are only 1–2 rooms.
  const floorWidth = TARGET_INNER_WIDTH
  const totalWidth = floorWidth + 2 * VIEWBOX_PAD
  const totalHeight =
    2 * VIEWBOX_PAD + 2 * INNER_PAD +
    rowSpecs.length * ROW_HEIGHT +
    Math.max(0, rowSpecs.length - 1) * ROW_GAP

  // Place rooms — distribute each row's leftover width evenly across
  // its (N-1) inter-room gaps. Those gaps become the vertical
  // hallway zones the renderer paints behind the rooms.
  const placedRooms = []
  const hallways = []
  for (let r = 0; r < rowSpecs.length; r++) {
    const spec = rowSpecs[r]
    const numRooms = spec.items.length
    const numGaps = Math.max(0, numRooms - 1)
    // leftover = budget after rooms + minimal gaps. Pour it across
    // the gaps so the row spans the full rowBudget.
    const sumRoomWidths = spec.items.reduce((s, it) => s + it.width, 0)
    const leftoverSpace = Math.max(0, rowBudget - sumRoomWidths - numGaps * ROOM_GAP)
    const extraPerGap = numGaps > 0 ? leftoverSpace / numGaps : 0
    const finalGapWidth = ROOM_GAP + extraPerGap

    const rowY = VIEWBOX_PAD + INNER_PAD + r * (ROW_HEIGHT + ROW_GAP)
    let cursorX = VIEWBOX_PAD + INNER_PAD

    for (let i = 0; i < numRooms; i++) {
      const item = spec.items[i]
      placedRooms.push({
        id: item.id,
        layoutRef: item.layoutRef,
        kind: item.kind,
        box: { x: cursorX, y: rowY, width: item.width, height: ROW_HEIGHT },
      })
      cursorX += item.width
      if (i < numRooms - 1) {
        // Vertical hallway in this gap. Spans the full row height +
        // a small overshoot at top/bottom so the hallway visually
        // extends to the row-separating hallways above/below.
        hallways.push({
          orientation: 'vertical',
          x: cursorX,
          y: rowY,
          width: finalGapWidth,
          height: ROW_HEIGHT,
        })
        cursorX += finalGapWidth
      }
    }

    // Horizontal hallway between rows (full floor inner width).
    if (r < rowSpecs.length - 1) {
      hallways.push({
        orientation: 'horizontal',
        x: VIEWBOX_PAD + INNER_PAD,
        y: rowY + ROW_HEIGHT,
        width: rowBudget,
        height: ROW_GAP,
      })
    }
  }

  return {
    viewBox: { width: totalWidth, height: totalHeight },
    wallBox: {
      // Shift wall path inward by an extra 2 units so a 2-unit gap
      // separates the wall's inner edge from the floor, per the
      // mockup. The architecture feel comes from those small strips
      // of "between" space between wall, floor, and outer pad.
      x: VIEWBOX_PAD - WALL_THICKNESS / 2 - 2,
      y: VIEWBOX_PAD - WALL_THICKNESS / 2 - 2,
      width: totalWidth - 2 * VIEWBOX_PAD + WALL_THICKNESS + 4,
      height: totalHeight - 2 * VIEWBOX_PAD + WALL_THICKNESS + 4,
    },
    floorBox: {
      x: VIEWBOX_PAD,
      y: VIEWBOX_PAD,
      width: totalWidth - 2 * VIEWBOX_PAD,
      height: totalHeight - 2 * VIEWBOX_PAD,
    },
    placedRooms,
    hallways,
  }
}

// ─── Pawn placement ──────────────────────────────────────────

/**
 * Pick where the gold pawn marker should sit. Returns absolute SVG
 * coordinates {x, y} or null if no rooms are placed yet.
 *
 * If activeRoomId is given and matches a placed user room, the pawn
 * lands inside it (centered horizontally, ~80% down). Otherwise it
 * rests on The Study — the default surface the user is viewing when
 * they see the blueprint. Falls through to the first user room as a
 * last resort (e.g. if `includeSystem` was false).
 */
export function placePawn({ placedRooms, activeRoomId }) {
  if (!Array.isArray(placedRooms) || placedRooms.length === 0) return null

  const active = activeRoomId
    ? placedRooms.find(p => p.kind === 'room' && p.id === activeRoomId)
    : null

  if (active) {
    return {
      x: active.box.x + active.box.width / 2,
      y: active.box.y + active.box.height * 0.78,
    }
  }

  const study = placedRooms.find(p => p.kind === SYSTEM_KIND && p.id === SYSTEM_ROOM_IDS.STUDY)
  if (study) {
    return {
      x: study.box.x + study.box.width / 2,
      y: study.box.y + study.box.height * 0.78,
    }
  }

  const first = placedRooms.find(p => p.kind === 'room')
  if (first) {
    return {
      x: first.box.x + first.box.width / 2,
      y: first.box.y + first.box.height * 0.78,
    }
  }
  return null
}
