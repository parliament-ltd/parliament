// Shared empty-state templates for soft dependencies (PR-11a, PR-11b).
//
// A catalog entry can declare `softDependencies: [{ component, fallbackUI }]`
// to say "I need component X to be present in the room; if it isn't,
// render the fallbackUI keyed below instead of my real UI."
//
// PR-11a wired the first keys:
//   - 'data-source-needed' for the chart / table / summary canvas trio
//     (which need file-shelf@1.0 to supply data)
//   - 'component-not-present' generic fallback the validator points at
//     if the manifest doesn't name a known key.
//
// PR-11b adds:
//   - 'document-source-needed' for the claude-comments / ripple-analysis
//     pair (which need document-canvas@1.0 to supply paragraph state).
//
// Aggregation lives in RoomShell — it walks each component's manifest
// softDependencies, checks whether the dependency is present in the
// resolved component list, and if not substitutes this template's
// component for the real render. The component's real render function
// never runs in that case.
//
// Audit §3.17 "Canvas components need empty states when file-shelf@1.0
// is missing" + NQ-7 — Phase 1 ships the chart-canvas / table-canvas /
// summary-dashboard trio with this contract; future canvas-shaped
// components (Phase 2 visualization@1.0 etc.) reuse the same template.

import { Database, FileText, Plus } from 'lucide-react'

function CanvasEmptyState({ componentDisplayName, missingComponentDisplay }) {
  return (
    <div className="flex items-center justify-center px-8 py-12">
      <div className="max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#B8A070]/8 border border-dashed border-[#B8A070]/25 flex items-center justify-center mx-auto mb-4">
          <Database className="w-5 h-5 text-[#B8A070]/50" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--p-text-primary)] mb-1.5">
          {componentDisplayName} needs data
        </h3>
        <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed">
          Add a <span className="font-medium text-[var(--p-text-primary)]">{missingComponentDisplay}</span> component
          to this room to provide data.
        </p>
        <p className="text-[11px] text-[var(--p-text-muted)] mt-3 flex items-center justify-center gap-1">
          <Plus className="w-3 h-3" />
          Open the editor to add components.
        </p>
      </div>
    </div>
  )
}

function MarginEmptyState({ componentDisplayName, missingComponentDisplay }) {
  return (
    <div className="px-4 py-6">
      <div className="text-center">
        <div className="w-10 h-10 rounded-2xl bg-[#B8A070]/8 border border-dashed border-[#B8A070]/25 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-4 h-4 text-[#B8A070]/50" />
        </div>
        <h3 className="text-xs font-semibold text-[var(--p-text-primary)] mb-1">
          {componentDisplayName} needs a document
        </h3>
        <p className="text-[11px] text-[var(--p-text-secondary)] leading-relaxed">
          Add a <span className="font-medium text-[var(--p-text-primary)]">{missingComponentDisplay}</span> component
          to this room to enable annotations.
        </p>
      </div>
    </div>
  )
}

function GenericMissing({ componentDisplayName, missingComponentDisplay }) {
  return (
    <div className="m-4 px-4 py-3 rounded-lg border border-[var(--p-border)] bg-[var(--p-code-bg,#F7F6F3)] text-sm text-[var(--p-text-secondary)]">
      <span className="font-medium text-[var(--p-text-primary)]">{componentDisplayName}</span> needs{' '}
      <span className="font-medium text-[var(--p-text-primary)]">{missingComponentDisplay}</span> in this room.
    </div>
  )
}

/**
 * Map of fallbackUI key → React component. Each component is invoked with
 *   { componentDisplayName, missingComponent, missingComponentDisplay }
 * so it can render a contextual message without RoomShell having to
 * decide on copy. Unknown keys fall through to the generic template.
 */
export const EMPTY_STATE_TEMPLATES = Object.freeze({
  'data-source-needed': CanvasEmptyState,
  'document-source-needed': MarginEmptyState,
  'component-not-present': GenericMissing,
})

export function getEmptyStateTemplate(key) {
  return EMPTY_STATE_TEMPLATES[key] || EMPTY_STATE_TEMPLATES['component-not-present']
}
