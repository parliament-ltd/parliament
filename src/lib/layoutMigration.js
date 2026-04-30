// Layout migration — what happens to placed components when the user
// swaps the canvas's layout for a different one.
//
// Source of truth: each (sourceLayout, targetLayout) pair declares how
// every component slot maps from the source's slot inventory to the
// target's. Components in slots that have no compatible destination
// become "orphans" and land in the holding tray (per
// refactor/parliament_v2_design_decisions.md §4).
//
// PR-8 ships the mapping for the two runtime-rendered layouts —
// `three-panel@1.0` and `stacked-sections@1.0`. The other three available
// layouts (canvas-centric, document-centric, single-column-with-sheet)
// have catalog records but no runtime renderer yet; users dragging them
// in still get a migration preview (we know the target slot inventory
// from refactor/v2-phase1-audit.md §2.1) but the canvas will show a
// "Layout not yet renderable" diagnostic until those layouts ship in
// later PRs.

import { normalizeRef } from './refs'

// Slot inventory per layout. Mirrors the layouts that will eventually be
// registered. This is the source of truth for "where can a component
// land in this layout?" during migration. When a layout's runtime entry
// lands, this can be derived from layoutEntry.slots — until then it's
// duplicated here so the editor stays useful.
//
// Keys use the bare-version form ('three-panel@1.0') — callers must
// normalize mode-file refs (which often carry `^`/`~` prefixes) before
// indexing in. Use getLayoutSlots() below to do that automatically.
export const LAYOUT_SLOTS = {
  'three-panel@1.0': [
    { id: 'left-rail',        capacity: 'single', label: 'Left rail' },
    { id: 'msg-area',         capacity: 'single', label: 'Message area' },
    { id: 'input-dock',       capacity: 'single', label: 'Input dock' },
    { id: 'right-rail',       capacity: 'stack',  label: 'Right rail' },
    { id: 'right-rail-extra', capacity: 'stack',  label: 'Right rail (extra)' },
  ],
  'canvas-centric@1.0': [
    { id: 'left-rail',  capacity: 'single', label: 'Left rail' },
    { id: 'canvas',     capacity: 'single', label: 'Canvas' },
    { id: 'chat-panel', capacity: 'stack',  label: 'Chat panel' },
    { id: 'inspector',  capacity: 'stack',  label: 'Inspector' },
    { id: 'input-dock', capacity: 'single', label: 'Input dock' },
  ],
  'document-centric@1.0': [
    { id: 'outline',    capacity: 'single', label: 'Outline' },
    { id: 'document',   capacity: 'single', label: 'Document' },
    { id: 'margin',     capacity: 'stack',  label: 'Margin' },
    { id: 'chat-panel', capacity: 'stack',  label: 'Chat panel' },
  ],
  'single-column-with-sheet@1.0': [
    { id: 'msg-area',   capacity: 'single', label: 'Message area' },
    { id: 'input-dock', capacity: 'single', label: 'Input dock' },
    { id: 'sheet',      capacity: 'stack',  label: 'Sheet' },
  ],
  'stacked-sections@1.0': [
    { id: 'section-slot', capacity: 'stack', label: 'Sections' },
  ],
}

// For each target layout, declare which slots a component can fall
// through to when its current slot doesn't exist in the target. Read
// top-to-bottom; first match wins. The `null` fallback means "no place
// — orphan to holding tray with this reason."
//
// Mapping is per source-slot-id → target-slot-id. It's keyed on slot id
// rather than component ref because a layout swap should think in
// spatial terms ("the thing in the left rail goes where?") rather than
// per-component ones.
const SLOT_FALLBACKS = {
  'three-panel@1.0': {
    'left-rail':         { slot: 'left-rail',  reason: null },
    'msg-area':          { slot: 'msg-area',   reason: null },
    'input-dock':        { slot: 'input-dock', reason: null },
    'right-rail':        { slot: 'right-rail', reason: null },
    'right-rail-extra':  { slot: 'right-rail-extra', reason: null },
    'canvas':            { slot: 'msg-area',   reason: null },
    'chat-panel':        { slot: 'right-rail', reason: null },
    'inspector':         { slot: 'right-rail-extra', reason: null },
    'outline':           { slot: 'left-rail',  reason: null },
    'document':          { slot: 'msg-area',   reason: null },
    'margin':            { slot: 'right-rail', reason: null },
    'sheet':             { slot: 'right-rail', reason: null },
    'section-slot':      { slot: null, reason: 'no section slot in three-panel' },
  },
  'canvas-centric@1.0': {
    'left-rail':         { slot: 'left-rail',  reason: null },
    'msg-area':          { slot: 'chat-panel', reason: null },
    'input-dock':        { slot: 'input-dock', reason: null },
    'right-rail':        { slot: 'inspector',  reason: null },
    'right-rail-extra':  { slot: 'inspector',  reason: null },
    'canvas':            { slot: 'canvas',     reason: null },
    'chat-panel':        { slot: 'chat-panel', reason: null },
    'inspector':         { slot: 'inspector',  reason: null },
    'outline':           { slot: 'left-rail',  reason: null },
    'document':          { slot: 'canvas',     reason: null },
    'margin':            { slot: 'inspector',  reason: null },
    'sheet':             { slot: 'inspector',  reason: null },
    'section-slot':      { slot: null, reason: 'no section slot in canvas-centric' },
  },
  'document-centric@1.0': {
    'left-rail':         { slot: 'outline',    reason: null },
    'msg-area':          { slot: null, reason: 'document takes the center' },
    'input-dock':        { slot: 'chat-panel', reason: null },
    'right-rail':        { slot: 'chat-panel', reason: null },
    'right-rail-extra':  { slot: 'margin',     reason: null },
    'canvas':            { slot: 'document',   reason: null },
    'chat-panel':        { slot: 'chat-panel', reason: null },
    'inspector':         { slot: 'margin',     reason: null },
    'outline':           { slot: 'outline',    reason: null },
    'document':          { slot: 'document',   reason: null },
    'margin':            { slot: 'margin',     reason: null },
    'sheet':             { slot: 'chat-panel', reason: null },
    'section-slot':      { slot: null, reason: 'no section slot in document-centric' },
  },
  'single-column-with-sheet@1.0': {
    'left-rail':         { slot: null, reason: 'no left rail in this layout' },
    'msg-area':          { slot: 'msg-area',   reason: null },
    'input-dock':        { slot: 'input-dock', reason: null },
    'right-rail':        { slot: 'sheet',      reason: null },
    'right-rail-extra':  { slot: 'sheet',      reason: null },
    'canvas':            { slot: 'msg-area',   reason: null },
    'chat-panel':        { slot: 'msg-area',   reason: null },
    'inspector':         { slot: 'sheet',      reason: null },
    'outline':           { slot: null, reason: 'no outline slot in this layout' },
    'document':          { slot: null, reason: 'no document slot in this layout' },
    'margin':            { slot: 'sheet',      reason: null },
    'sheet':             { slot: 'sheet',      reason: null },
    'section-slot':      { slot: null, reason: 'no section slot in this layout' },
  },
  'stacked-sections@1.0': {
    // Homepage scope is special — almost any component repurposes into a
    // section. We don't usually swap to/from stacked-sections for room
    // editing, but the editor handles homepage editing too via
    // `/edit-home`, so being explicit avoids surprises.
    'left-rail':         { slot: 'section-slot', reason: null },
    'msg-area':          { slot: 'section-slot', reason: null },
    'input-dock':        { slot: null, reason: 'homepage has no input dock' },
    'right-rail':        { slot: 'section-slot', reason: null },
    'right-rail-extra':  { slot: 'section-slot', reason: null },
    'canvas':            { slot: 'section-slot', reason: null },
    'chat-panel':        { slot: 'section-slot', reason: null },
    'inspector':         { slot: 'section-slot', reason: null },
    'outline':           { slot: 'section-slot', reason: null },
    'document':          { slot: 'section-slot', reason: null },
    'margin':            { slot: null, reason: 'homepage has no margin slot' },
    'sheet':             { slot: 'section-slot', reason: null },
    'section-slot':      { slot: 'section-slot', reason: null },
  },
}

/**
 * Look up slot inventory for a layout ref. Normalizes the ref so
 * callers can pass either `three-panel@1.0` or `three-panel@^1.0`.
 */
export function getLayoutSlots(ref) {
  return LAYOUT_SLOTS[normalizeRef(ref)] || []
}

/**
 * Compute what happens to each placed component when swapping layouts.
 *
 * @param {object} args
 * @param {string} args.fromLayout - current layout ref (e.g. 'three-panel@^1.0')
 * @param {string} args.toLayout   - target layout ref
 * @param {Array<{id, ref, slot}>} args.components - mode.components
 * @returns {{moves: Array<{compId, fromSlot, toSlot}>, orphans: Array<{compId, fromSlot, reason}>, targetSlots: Array}}
 */
export function planLayoutMigration({ fromLayout, toLayout, components = [] }) {
  void fromLayout
  const targetKey = normalizeRef(toLayout)
  const fallbacks = SLOT_FALLBACKS[targetKey] || {}
  const targetSlots = LAYOUT_SLOTS[targetKey] || []
  const targetSlotIds = new Set(targetSlots.map((s) => s.id))

  const moves = []
  const orphans = []
  for (const c of components) {
    if (!c?.id || !c?.slot) continue
    // Same slot id exists in the target → keep the component there.
    if (targetSlotIds.has(c.slot)) {
      moves.push({ compId: c.id, fromSlot: c.slot, toSlot: c.slot })
      continue
    }
    const fb = fallbacks[c.slot]
    if (fb && fb.slot) {
      moves.push({ compId: c.id, fromSlot: c.slot, toSlot: fb.slot })
    } else {
      orphans.push({
        compId: c.id,
        fromSlot: c.slot,
        reason: fb?.reason || `slot '${c.slot}' has no place in this layout`,
      })
    }
  }
  return { moves, orphans, targetSlots }
}

/**
 * Apply a precomputed migration to the components array. Components in
 * `moves` get their `slot` updated; components in `orphans` are stripped
 * from the array entirely (the editor stores them in tray state instead).
 */
export function applyLayoutMigration({ components, moves, orphans }) {
  const orphanIds = new Set(orphans.map((o) => o.compId))
  const moveById = new Map(moves.map((m) => [m.compId, m.toSlot]))
  return components
    .filter((c) => !orphanIds.has(c.id))
    .map((c) => {
      const toSlot = moveById.get(c.id)
      return toSlot ? { ...c, slot: toSlot } : c
    })
}
