// Layout registry — V2 catalog layouts (PR-3 onward).
//
// IndexedDB libraryLayouts records carry browsable metadata only
// (displayName, description, status). Runtime shape — slot inventory and
// the React render function — lives here, paired by the same
// `name@version` ref. RoomShell looks up layouts here, never from
// IndexedDB.

import threePanel             from './three-panel'
import stackedSections        from './stacked-sections'
import canvasCentric          from './canvas-centric'
import documentCentric        from './document-centric'
import singleColumnWithSheet  from './single-column-with-sheet'
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

// Phase 1 layouts.
//   PR-3:  three-panel@1.0
//   PR-6:  stacked-sections@1.0 (homepage)
//   PR-9:  canvas-centric@1.0, document-centric@1.0,
//          single-column-with-sheet@1.0 — the templates that default to
//          these layouts also ship in PR-9, so the editor's labeled-grid
//          fallback no longer applies to them.
// Coming-soon catalog records (`reading-pane@1.0`, `split-view@1.0`)
// remain seeded without runtime entries.
register(threePanel)
register(stackedSections)
register(canvasCentric)
register(documentCentric)
register(singleColumnWithSheet)

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
