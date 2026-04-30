// Layout registry — V2 catalog layouts (PR-3 onward).
//
// IndexedDB libraryLayouts records carry browsable metadata only
// (displayName, description, status). Runtime shape — slot inventory and
// the React render function — lives here, paired by the same
// `name@version` ref. RoomShell looks up layouts here, never from
// IndexedDB.

import threePanel      from './three-panel'
import stackedSections from './stacked-sections'
import { validateLayoutManifest, layoutRef } from './validate'

const REGISTRY = new Map()

function register(entry) {
  const result = validateLayoutManifest(entry)
  if (!result.valid) {
    const ref = entry?.name && entry?.version ? layoutRef(entry) : '<unknown>'
    throw new Error(`Layout manifest invalid for ${ref}: ${result.errors.join('; ')}`)
  }
  REGISTRY.set(layoutRef(entry), entry)
}

// Phase 1 layouts. PR-3 shipped `three-panel@1.0`; PR-6 adds
// `stacked-sections@1.0` for the homepage. The remaining three available
// layouts (`canvas-centric`, `document-centric`,
// `single-column-with-sheet`) are seeded as catalog records by PR-1 and
// gain runtime entries here in later PRs as their consuming surfaces land.
register(threePanel)
register(stackedSections)

/**
 * Look up a layout entry by `name@version` ref. Exact-match in PR-3.
 */
export function getLayoutEntry(ref) {
  return REGISTRY.get(ref) || null
}

export function listLayoutEntries() {
  return [...REGISTRY.values()]
}

export { validateLayoutManifest, layoutRef }
