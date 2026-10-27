// stacked-sections@1.0 — homepage layout. A vertical stack of collapsible
// section cards rendered from a single `section-slot` (capacity: stack).
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1 (homepage scope):
//   section-slot (stack)
//
// Per [phase-1-pr-plan.md](refactor/phase-1-pr-plan.md) PR-6, the seeded
// homepage mode mounts four default components — blueprint, chats, library,
// favorites — into this slot, in that order. PR-14 added drag-to-reorder and
// PR-17 moved it to dnd-kit; it was taken out with R34 (approved 27 October
// 2026, C250 (c)): a room's blocks are reordered in the Lab, with
// place:<block> up and down. The sections draw in their stored order.
//
// Section metadata (title, meta line) lives on the mode-file component spec
// under `config.section`: `{ title, meta }`. The layout reads it from each
// child's spec via the slotContents structure. RoomShell currently flattens
// slotContents to React elements only, so PR-6 stamps section metadata
// onto the spec at seed time and the layout reads it back via
// `mode.components` lookup.

import { useMemo } from 'react'
import SectionCard from '../../components/SectionCard'
import { getEntry as getComponentEntry } from '..'

// Strip semver-range prefixes from a `name@version` ref so it matches
// the catalog registry keys. Mirrors RoomShell's normalizer.
function normalizeRef(ref) {
  if (typeof ref !== 'string' || !ref.includes('@')) return ref
  const [name, versionSpec = ''] = ref.split('@', 2)
  const trimmed = versionSpec.replace(/^[\^~]/, '').replace(/^(\d+\.\d+)\.0$/, '$1')
  return `${name}@${trimmed}`
}

// Resolve a section title with a defensive fallback chain:
//   1. spec.config.section.title (canonical, set by the seed in db.js)
//   2. catalog entry's displayName (e.g. 'Library', 'Chats')
//   3. the ref's bare name as a last resort
//
// Defends against modes whose components were created before
// config.section was added, or whose section config got stripped by an
// earlier editor flow.
function resolveSectionTitle(spec) {
  const fromConfig = spec?.config?.section?.title
  if (fromConfig) return fromConfig
  const entry = getComponentEntry(normalizeRef(spec?.ref))
  if (entry?.displayName) return entry.displayName
  const bareName = String(spec?.ref || '').split('@')[0]
  if (bareName) {
    return bareName.charAt(0).toUpperCase() + bareName.slice(1).replace(/-/g, ' ')
  }
  return 'Section'
}

// One inlined named-function render keeps react-refresh happy
// (no extra top-level component-shaped declarations in this file).
// Pattern mirrors src/catalog/layouts/single-column-with-sheet.jsx.
export default {
  name: 'stacked-sections',
  version: '1.0',
  displayName: 'Stacked sections',
  scope: 'homepage',
  slots: [
    { id: 'section-slot', capacity: 'stack' },
  ],


  render: function StackedSectionsRender({ slotContents = {}, mode }) {
  // Memoize sections so its identity is stable across renders that
  // don't actually change the slot contents.
  const sections = useMemo(() => slotContents['section-slot'] || [], [slotContents])

  // Build spec lookup once per mode change. mode.components is the
  // canonical source for section metadata (title/meta) since slotContents
  // only carries pre-rendered React elements.
  const specs = useMemo(() => {
    const map = {}
    for (const c of mode?.components || []) map[c.id] = c
    return map
  }, [mode])

  if (sections.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-sm text-[var(--p-text-secondary)] px-5 py-4 rounded-xl border border-dashed border-[var(--p-border)] bg-white">
          No sections mounted on this homepage yet.
        </div>
      </div>
    )
  }

  return (
    <div className="stacked-sections max-w-5xl mx-auto px-6 py-8">
      {sections.map((node, i) => {
        const spec = specs[node.key] || {}
        const section = spec.config?.section || {}
        return (
          <SectionCard key={node.key || i} title={resolveSectionTitle(spec)} meta={section.meta}>
            {node}
          </SectionCard>
        )
      })}
    </div>
  )
  },
}
