// Slot vocabulary for the V2 catalog.
//
// Layouts declare a slot inventory; components declare which slots they fit.
// Universal slots mean the same functional thing across every layout —
// a `left-rail` in canvas-centric is the same kind of region as a `left-rail`
// in three-panel. Layout-specific slots have unique semantics that components
// reason about (e.g. `document` is only meaningful in document-centric).
//
// See refactor/glossary.md and refactor/v2-phase1-audit.md §2.2 for the full
// rationale. The shape of these slots will be consumed by PR-3's RoomShell.

/**
 * Universal slots — must mean the same thing across all layouts.
 * Components targeting these slots can fit in any layout that exposes them.
 */
export const UNIVERSAL_SLOTS = Object.freeze({
  LEFT_RAIL: 'left-rail',
  RIGHT_RAIL: 'right-rail',
  RIGHT_RAIL_EXTRA: 'right-rail-extra',
  MSG_AREA: 'msg-area',
  INPUT_DOCK: 'input-dock',
})

/**
 * Frozen array form for iteration / membership checks.
 */
export const UNIVERSAL_SLOT_IDS = Object.freeze(Object.values(UNIVERSAL_SLOTS))

/**
 * Layout-specific slots — unique semantics per layout. Components targeting
 * one of these only fit in the layouts that expose it.
 */
export const LAYOUT_SPECIFIC_SLOTS = Object.freeze({
  CANVAS: 'canvas',                 // canvas-centric only
  CHAT_PANEL: 'chat-panel',         // canvas-centric, document-centric
  DOCUMENT: 'document',             // document-centric only
  MARGIN: 'margin',                 // document-centric only
  SHEET: 'sheet',                   // single-column-with-sheet only
  SECTION_SLOT: 'section-slot',     // stacked-sections only (homepage)
})

export const LAYOUT_SPECIFIC_SLOT_IDS = Object.freeze(Object.values(LAYOUT_SPECIFIC_SLOTS))

/**
 * All known slot ids. Used by validators to check that a component's
 * declared slot targets reference real slots.
 */
export const ALL_SLOT_IDS = Object.freeze([
  ...UNIVERSAL_SLOT_IDS,
  ...LAYOUT_SPECIFIC_SLOT_IDS,
])

/**
 * Slot capacity values. A layout declares a capacity per slot.
 *  - 'single':  one component max
 *  - 'stack':   ordered list of components
 *  - 'overlay': multiple components render simultaneously (toasts, floats)
 */
export const SLOT_CAPACITY = Object.freeze({
  SINGLE: 'single',
  STACK: 'stack',
  OVERLAY: 'overlay',
})

export const SLOT_CAPACITY_VALUES = Object.freeze(Object.values(SLOT_CAPACITY))

/**
 * Quick check: is the given slot id known to V2?
 */
export function isKnownSlot(slotId) {
  return ALL_SLOT_IDS.includes(slotId)
}

/**
 * Quick check: is the given slot id one of the universal set?
 */
export function isUniversalSlot(slotId) {
  return UNIVERSAL_SLOT_IDS.includes(slotId)
}
