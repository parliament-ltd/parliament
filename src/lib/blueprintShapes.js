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

export const VIEWBOX_PAD = 32        // outer wall margin (PR-16a: was 28; +4 to give edge protrusions breathing room)
export const WALL_THICKNESS = 6      // outer wall stroke width (spec uses 7)
export const ROW_HEIGHT = 200        // target room interior height
export const ROOM_GAP = 24           // gap between rooms in a row (PR-16a: was 14; +10 so adjacent bump+mirror-bump pairs don't collide)
export const ROW_GAP = 18            // gap between rows
export const TARGET_INNER_WIDTH = 620 // packs to this before wrapping

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

// "+ Build a room" placeholder dimensions. Always inserted last.
const PLACEHOLDER_ASPECT = 0.85
export const PLACEHOLDER_KIND = 'placeholder'

// PR-19e: system rooms (The Study, The Lab) — compact rectangular cards
// that anchor the floor plan. Injected at the head of the room list so
// they read as the primary navigation surfaces.
export const SYSTEM_KIND = 'system'
const SYSTEM_ASPECT = 0.55
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

// ─── Fallback ─────────────────────────────────────────────────

/** Plain rectangle for unknown layouts (and the placeholder). */
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
  if (!variants) return rectanglePath(box)

  const seed = hashString(roomId)
  const variant = variants[seed % variants.length]
  const { path, interior } = variant(box, seed)

  // Mirror bit lives in seed bit 8 — separate from the slots used by
  // pertub() (slots 0–4) so mirror choice doesn't correlate with bump
  // depth/position.
  const shouldMirror = ((seed >>> 8) & 1) === 1
  if (!shouldMirror) return { path, interior }

  const axisX = box.x + box.width / 2
  return { path: mirrorPath(path, axisX), interior }
}

/** Build the +Build-a-room placeholder path (always a plain rect). */
export function buildPlaceholderPath(box) {
  return rectanglePath(box).path
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
 * Always appends a "+ Build a room" placeholder as the final entry,
 * which can land in the last row (if it fits) or wrap to a new row.
 *
 * @param {Array<{id: string, layoutRef: string}>} rooms
 * @param {{ includePlaceholder?: boolean }} options
 * @returns {{
 *   viewBox: { width: number, height: number },
 *   wallBox: { x, y, width, height },
 *   floorBox: { x, y, width, height },
 *   placedRooms: Array<{ id, layoutRef, kind, box }>,
 * }}
 */
export function packRooms(rooms, { includePlaceholder = true, includeSystem = false } = {}) {
  const items = []

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

  for (const r of rooms) {
    items.push({
      id: r.id,
      layoutRef: r.layoutRef,
      kind: 'room',
      width: Math.round(aspectFor(r.layoutRef) * ROW_HEIGHT),
    })
  }

  if (includePlaceholder) {
    items.push({
      id: '__placeholder__',
      layoutRef: null,
      kind: PLACEHOLDER_KIND,
      width: Math.round(PLACEHOLDER_ASPECT * ROW_HEIGHT),
    })
  }

  const placedRooms = []
  const rowWidths = []
  let cursorY = VIEWBOX_PAD
  let row = []
  let rowWidth = 0

  function commitRow() {
    if (row.length === 0) return
    let cursorX = VIEWBOX_PAD
    for (const item of row) {
      placedRooms.push({
        id: item.id,
        layoutRef: item.layoutRef,
        kind: item.kind,
        box: { x: cursorX, y: cursorY, width: item.width, height: ROW_HEIGHT },
      })
      cursorX += item.width + ROOM_GAP
    }
    rowWidths.push(rowWidth)
    cursorY += ROW_HEIGHT + ROW_GAP
    row = []
    rowWidth = 0
  }

  for (const item of items) {
    const projected = rowWidth + (row.length > 0 ? ROOM_GAP : 0) + item.width
    if (rowWidth > 0 && projected > TARGET_INNER_WIDTH) {
      commitRow()
    }
    row.push(item)
    rowWidth += (row.length > 1 ? ROOM_GAP : 0) + item.width
  }
  commitRow()

  const widest = rowWidths.reduce((mx, w) => Math.max(mx, w), VIEWBOX_PAD + TARGET_INNER_WIDTH)
  const totalWidth = widest + VIEWBOX_PAD
  const totalHeight = cursorY - ROW_GAP + VIEWBOX_PAD

  return {
    viewBox: { width: totalWidth, height: totalHeight },
    wallBox: {
      x: VIEWBOX_PAD - WALL_THICKNESS / 2,
      y: VIEWBOX_PAD - WALL_THICKNESS / 2,
      width: totalWidth - 2 * VIEWBOX_PAD + WALL_THICKNESS,
      height: totalHeight - 2 * VIEWBOX_PAD + WALL_THICKNESS,
    },
    floorBox: {
      x: VIEWBOX_PAD,
      y: VIEWBOX_PAD,
      width: totalWidth - 2 * VIEWBOX_PAD,
      height: totalHeight - 2 * VIEWBOX_PAD,
    },
    placedRooms,
  }
}

// ─── Pawn placement ──────────────────────────────────────────

/**
 * Pick where the gold pawn marker should sit. Returns absolute SVG
 * coordinates {x, y} or null if no rooms are placed yet.
 *
 * If activeRoomId is given and matches one of the placed rooms, the
 * pawn lands inside that room (centered horizontally, ~80% down). If
 * not — including when the user has zero rooms — the pawn lands next
 * to the placeholder.
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

  // PR-19e: if no user room is active, rest the pawn on The Study —
  // that's the default landing and the surface the user is currently
  // viewing when they see the blueprint inside it.
  const study = placedRooms.find(p => p.kind === SYSTEM_KIND && p.id === SYSTEM_ROOM_IDS.STUDY)
  if (study) {
    return {
      x: study.box.x + study.box.width / 2,
      y: study.box.y + study.box.height * 0.78,
    }
  }

  const placeholder = placedRooms.find(p => p.kind === PLACEHOLDER_KIND)
  if (placeholder) {
    return {
      x: placeholder.box.x + 28,
      y: placeholder.box.y + placeholder.box.height / 2,
    }
  }

  // Fallback: first room
  const first = placedRooms.find(p => p.kind === 'room')
  if (first) {
    return {
      x: first.box.x + first.box.width / 2,
      y: first.box.y + first.box.height * 0.78,
    }
  }
  return null
}
