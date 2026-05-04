// Blueprint shape system (PR-14).
//
// Pure functions that pack N user rooms into a fixed viewBox and produce
// the SVG path geometry the floor-plan renderer draws. Two halves:
//
//   1. Per-layout shape signature  — each known layout maps to a base
//      irregular path (three-panel has a bump on the right edge,
//      canvas-centric has a chamfered bottom-right corner, etc.). The
//      irregularity is what makes the blueprint feel hand-drawn rather
//      than a grid of rectangles. Per refactor/parliament_v2_design_decisions.md
//      §2.5: "Rooms can have one irregular edge or subtle character
//      detail within the hatching grammar. This is rare and meaningful,
//      not decorative."
//
//   2. Hash-derived per-room variability — within the same layout, each
//      room's bump position / chamfer depth shifts deterministically by
//      its id-derived seed. Two `three-panel` rooms differ by a few px
//      so they don't look photocopied.
//
// No React, no IndexedDB, no DOM. Pure inputs → pure outputs. Renderer
// reads the output and mounts SVG. Future V3 work (rooms growing with
// usage, doorways between branched chats — see design doc §8) plugs in
// as additional inputs to packRooms() without touching the renderer.

// ─── Constants ───────────────────────────────────────────────

export const VIEWBOX_PAD = 28        // outer wall margin (matches spec ≈28)
export const WALL_THICKNESS = 6      // outer wall stroke width (spec uses 7)
export const ROW_HEIGHT = 200        // target room interior height
export const ROOM_GAP = 14           // gap between rooms in a row
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

// ─── Layout signature shape generators ───────────────────────
//
// Each generator takes a bounding box { x, y, width, height } and a
// hash seed, and returns:
//   { path: 'M ... Z', interior: { x, y, width, height } }
// `interior` is the inset box renderer uses to place labels + pills,
// excluding any irregular protrusion.

const layoutFor = (ref) => (ref || '').split('@')[0].split('/').pop()

/**
 * Three-panel: a wide rectangle with a small bump on the right edge.
 * Reads as "the right rail tucks out a hair." Per design doc §2.5.
 */
function threePanelPath(box, seed) {
  const { x, y, width: w, height: h } = box
  // Bump centered on right edge mid-height. Vertical offset shifts ±15%
  // of room height via seed slot 0; depth varies 8–14px via slot 1.
  const bumpY = y + h * (0.55 + 0.12 * pertub(seed, 0))
  const bumpHeight = 28
  const bumpDepth = 10 + Math.round(2 * pertub(seed, 1))
  const top = y
  const bottom = y + h
  const right = x + w
  const left = x
  // CW from top-left:
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
  return { path: d, interior: { x: x + 8, y: y + 8, width: w - 16, height: h - 16 } }
}

/** Canvas-centric: chamfered bottom-right corner. */
function canvasCentricPath(box, seed) {
  const { x, y, width: w, height: h } = box
  const cut = 12 + Math.round(4 * pertub(seed, 0))
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
  return { path: d, interior: { x: x + 8, y: y + 8, width: w - 16, height: h - 16 } }
}

/** Document-centric: chamfered bottom-left corner (the "page corner" feel). */
function documentCentricPath(box, seed) {
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
  return { path: d, interior: { x: x + 8, y: y + 8, width: w - 16, height: h - 16 } }
}

/** Single-column-with-sheet: chamfered top-right corner (mobile feel). */
function singleColumnPath(box, seed) {
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
  return { path: d, interior: { x: x + 8, y: y + 8, width: w - 16, height: h - 16 } }
}

/** Fallback: plain rectangle for unknown layouts. */
function rectanglePath(box) {
  const { x, y, width: w, height: h } = box
  const right = x + w
  const bottom = y + h
  const d = `M ${x} ${y} L ${right} ${y} L ${right} ${bottom} L ${x} ${bottom} Z`
  return { path: d, interior: { x: x + 8, y: y + 8, width: w - 16, height: h - 16 } }
}

const SHAPE_GENERATORS = {
  'three-panel':              threePanelPath,
  'canvas-centric':           canvasCentricPath,
  'document-centric':         documentCentricPath,
  'single-column-with-sheet': singleColumnPath,
}

/**
 * Build a single room's path geometry.
 *
 * @param {object} args
 * @param {{x,y,width,height}} args.box
 * @param {string} args.layoutRef — full mode-file ref like 'three-panel@^1.0'
 * @param {string} args.roomId — used as hash seed for per-room variability
 * @returns {{ path: string, interior: object }}
 */
export function buildRoomPath({ box, layoutRef, roomId }) {
  const layout = layoutFor(layoutRef)
  const generator = SHAPE_GENERATORS[layout] || rectanglePath
  const seed = hashString(roomId)
  return generator(box, seed)
}

/** Build the +Build-a-room placeholder path (always a plain rect). */
export function buildPlaceholderPath(box) {
  return rectanglePath(box).path
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
export function packRooms(rooms, { includePlaceholder = true } = {}) {
  const items = rooms.map(r => ({
    id: r.id,
    layoutRef: r.layoutRef,
    kind: 'room',
    width: Math.round(aspectFor(r.layoutRef) * ROW_HEIGHT),
  }))

  if (includePlaceholder) {
    items.push({
      id: '__placeholder__',
      layoutRef: null,
      kind: PLACEHOLDER_KIND,
      width: Math.round(PLACEHOLDER_ASPECT * ROW_HEIGHT),
    })
  }

  // Greedy row packing.
  const rows = [[]]
  let rowWidth = 0
  for (const it of items) {
    const projected = rowWidth + (rowWidth > 0 ? ROOM_GAP : 0) + it.width
    if (projected > TARGET_INNER_WIDTH && rows[rows.length - 1].length > 0) {
      rows.push([])
      rowWidth = it.width
      rows[rows.length - 1].push(it)
    } else {
      rows[rows.length - 1].push(it)
      rowWidth = projected
    }
  }

  // Convert rows into placed boxes.
  const placedRooms = []
  let cursorY = VIEWBOX_PAD
  for (const row of rows) {
    let cursorX = VIEWBOX_PAD
    for (const it of row) {
      placedRooms.push({
        id: it.id,
        layoutRef: it.layoutRef,
        kind: it.kind,
        box: { x: cursorX, y: cursorY, width: it.width, height: ROW_HEIGHT },
      })
      cursorX += it.width + ROOM_GAP
    }
    cursorY += ROW_HEIGHT + ROW_GAP
  }

  // Final viewBox extends to whichever is wider: target inner width or
  // the actual content. The right edge needs ~12px slack for three-panel
  // bumps that protrude past the box width.
  const widest = placedRooms.reduce((max, r) => {
    // three-panel rooms protrude ~14px to the right via the bump
    const protrusion = layoutFor(r.layoutRef) === 'three-panel' ? 14 : 0
    return Math.max(max, r.box.x + r.box.width + protrusion)
  }, VIEWBOX_PAD + TARGET_INNER_WIDTH)

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
 * Choose where to put the gold pawn marker.
 *
 * Per the user's PR-14 direction: when the user has zero rooms, the pawn
 * lives next to the "+ Build a room" placeholder (drawing the eye toward
 * the first build action). Once any room exists, the pawn moves into the
 * room owning the most-recently-updated conversation. Falls back to the
 * first placed room when no conversation has a room set yet.
 *
 * @param {object} args
 * @param {Array<{ id, kind, box, layoutRef }>} args.placedRooms
 * @param {string|null} args.activeRoomId — room id of latest conversation
 * @returns {{ x, y } | null} — center coords inside the chosen target's
 *   interior box, or null if nothing to mark
 */
export function placePawn({ placedRooms, activeRoomId }) {
  const realRooms = placedRooms.filter(r => r.kind === 'room')
  if (realRooms.length === 0) {
    // No rooms yet — pawn rides next to the placeholder.
    const ph = placedRooms.find(r => r.kind === PLACEHOLDER_KIND)
    if (!ph) return null
    return {
      x: ph.box.x - 18,
      y: ph.box.y + ph.box.height / 2,
    }
  }
  // Prefer the room matching activeRoomId; fall back to the first.
  const target = realRooms.find(r => r.id === activeRoomId) || realRooms[0]
  // Place pawn near the bottom of the room, just above the feature pills.
  return {
    x: target.box.x + target.box.width * 0.35,
    y: target.box.y + target.box.height * 0.78,
  }
}
