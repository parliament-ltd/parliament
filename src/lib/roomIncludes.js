// Room "Includes" + pill builders (PR-19j).
//
// Extracted from RoomDetailsOverlay so the desktop expand-in-place
// rendering in blueprint-render.jsx AND the mobile bottom-sheet overlay
// consume the same derivation logic — keeps the room-detail surface
// coherent across viewports.

import { getEntry as getComponentEntry } from '../catalog'

const LAYOUT_LABELS = {
  'three-panel':              'Three-panel',
  'canvas-centric':           'Canvas-centric',
  'document-centric':         'Document-centric',
  'single-column-with-sheet': 'Single column',
}

const SCHEME_LABELS = {
  parliament:    'Parliament Default',
  'cool-bright': 'Cool Bright',
  'deep-calm':   'Deep Calm',
  'soft-violet': 'Soft Violet',
  'fresh-teal':  'Fresh Teal',
  'amber-glow':  'Amber Glow',
}

const PILL_LABELS = {
  toc:         'TOC',
  branches:    'BRANCHES',
  highlights:  'HIGHLIGHTS',
  'file-shelf':'FILE SHELF',
  context:     'CONTEXT',
  notes:       'NOTES',
  review:      'REVIEW',
}

export function normalizeRef(ref) {
  if (typeof ref !== 'string' || !ref.includes('@')) return ref
  const [name, versionSpec = ''] = ref.split('@', 2)
  const trimmed = versionSpec.replace(/^[\^~]/, '').replace(/^(\d+\.\d+)\.0$/, '$1')
  return `${name}@${trimmed}`
}

export function refName(ref) {
  return String(ref || '').split('@')[0]
}

/**
 * Build the bulleted "Includes" list for a room: one row per layout,
 * one per scheme, one per unique component (with the catalog
 * description). Returns `[]` when room is null.
 */
export function buildIncludes(room) {
  if (!room) return []
  const out = []
  const layoutRef = room.layout?.ref
  if (layoutRef) {
    out.push({
      kind: 'layout',
      name: LAYOUT_LABELS[refName(layoutRef)] || refName(layoutRef) || 'Layout',
      desc: 'Spatial arrangement — where rails, canvas, and chat sit.',
    })
  }
  const schemeKey = refName(room.scheme?.ref)
  const schemeName = SCHEME_LABELS[schemeKey]
  if (schemeName) {
    out.push({
      kind: 'scheme',
      name: schemeName,
      desc: 'Color scheme and typography.',
    })
  }
  const seen = new Set()
  for (const c of room.components || []) {
    const norm = normalizeRef(c.ref)
    if (seen.has(norm)) continue
    seen.add(norm)
    const entry = getComponentEntry(norm)
    if (!entry) continue
    out.push({
      kind: 'component',
      name: entry.displayName || refName(c.ref),
      desc: entry.description || '',
    })
  }
  return out
}

/**
 * Build the short uppercase pill labels for a room. Mirrors the
 * blueprint card palette so the overlay reads as a richer view of the
 * same surface. Returns `[]` when room is null.
 */
export function buildPillLabels(room) {
  if (!room) return []
  const seen = new Set()
  const out = []
  for (const c of room.components || []) {
    const l = PILL_LABELS[refName(c.ref)]
    if (l && !seen.has(l)) { seen.add(l); out.push(l) }
  }
  return out
}

export { LAYOUT_LABELS, SCHEME_LABELS, PILL_LABELS }
