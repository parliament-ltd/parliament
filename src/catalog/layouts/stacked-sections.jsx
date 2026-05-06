// stacked-sections@1.0 — homepage layout. A vertical stack of collapsible
// section cards rendered from a single `section-slot` (capacity: stack).
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1 (homepage scope):
//   section-slot (stack)
//
// Per [phase-1-pr-plan.md](refactor/phase-1-pr-plan.md) PR-6, the seeded
// homepage mode mounts four default components — blueprint, chats, library,
// favorites — into this slot, in that order. PR-14 added drag-to-reorder:
// dragging a section's grabber dispatches an HTML5 drag, dropping it on
// another section reshuffles the list, and the new order persists back to
// the homepage mode-file's `components[].order` values via saveMode().
//
// On successful reorder, the layout dispatches a `homepage-mode-changed`
// CustomEvent on window. HomepageView listens and re-fetches the mode so
// the new order survives a reload (and so other sub-trees that depend on
// the homepage mode pick it up).
//
// Section metadata (title, meta line) lives on the mode-file component spec
// under `config.section`: `{ title, meta }`. The layout reads it from each
// child's spec via the slotContents structure. RoomShell currently flattens
// slotContents to React elements only, so PR-6 stamps section metadata
// onto the spec at seed time and the layout reads it back via
// `mode.components` lookup.

import { useState, useMemo } from 'react'
import SectionCard from '../../components/SectionCard'
import { saveMode } from '../../lib/modes'
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

export default {
  name: 'stacked-sections',
  version: '1.0',
  displayName: 'Stacked sections',
  scope: 'homepage',
  slots: [
    { id: 'section-slot', capacity: 'stack' },
  ],

  render: StackedSectionsRender,
}

function StackedSectionsRender({ slotContents = {}, mode }) {
  const sections = slotContents['section-slot'] || []

  // Build spec lookup once per mode change. mode.components is the
  // canonical source for section metadata (title/meta) since slotContents
  // only carries pre-rendered React elements.
  const specs = useMemo(() => {
    const map = {}
    for (const c of mode?.components || []) map[c.id] = c
    return map
  }, [mode])

  // Drag state — which section index is being dragged, and which is
  // currently the visual drop target. Local to this component; persists
  // back to the mode file only on `drop`.
  const [draggingId, setDraggingId] = useState(null)
  const [dropTargetId, setDropTargetId] = useState(null)

  const onDragStart = (sectionId) => (e) => {
    setDraggingId(sectionId)
    // Required for Firefox to allow the drag to start.
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', sectionId)
  }

  const onDragOver = (sectionId) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (sectionId !== dropTargetId) setDropTargetId(sectionId)
  }

  const onDragEnd = () => {
    setDraggingId(null)
    setDropTargetId(null)
  }

  const onDrop = (targetId) => async (e) => {
    e.preventDefault()
    const sourceId = draggingId || e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    setDropTargetId(null)
    if (!sourceId || sourceId === targetId) return
    await persistReorder(mode, sourceId, targetId)
  }

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
        const sectionId = node.key
        return (
          <SectionCard
            key={sectionId || i}
            title={resolveSectionTitle(spec)}
            meta={section.meta}
            draggable
            isDragging={draggingId === sectionId}
            isDropTarget={dropTargetId === sectionId && draggingId !== sectionId}
            onSectionDragStart={onDragStart(sectionId)}
            onSectionDragOver={onDragOver(sectionId)}
            onSectionDragEnd={onDragEnd}
            onSectionDrop={onDrop(sectionId)}
          >
            {node}
          </SectionCard>
        )
      })}
    </div>
  )
}

/**
 * Move the component with id=sourceId so it lands immediately before the
 * component with id=targetId in mode.components, then renumber every
 * section-slot component's `order` field 0..N. Persists via saveMode and
 * dispatches `homepage-mode-changed` so HomepageView re-fetches.
 *
 * Non-section-slot components in mode.components are left in place — only
 * the section-slot subset is reordered. (Phase 1 only has section-slot
 * children on the homepage, but stays defensive for future homepage layouts
 * that mix slot capacities.)
 */
async function persistReorder(mode, sourceId, targetId) {
  if (!mode || !Array.isArray(mode.components)) return

  const sectionSlotComponents = mode.components.filter(c => c.slot === 'section-slot')
  const otherComponents = mode.components.filter(c => c.slot !== 'section-slot')
  const sourceIdx = sectionSlotComponents.findIndex(c => c.id === sourceId)
  const targetIdx = sectionSlotComponents.findIndex(c => c.id === targetId)
  if (sourceIdx === -1 || targetIdx === -1) return

  // Pull the source out, then splice it before the target's current index.
  // Removing first means we have to recompute the insertion index when
  // the source originally sat above the target.
  const reordered = [...sectionSlotComponents]
  const [moved] = reordered.splice(sourceIdx, 1)
  const insertAt = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx
  reordered.splice(insertAt, 0, moved)

  // Renumber order 0..N within section-slot. Other slots keep their orders
  // so non-section-slot components stay sorted correctly inside their slot.
  const updatedSectionSlot = reordered.map((c, i) => ({ ...c, order: i }))

  await saveMode({
    ...mode,
    components: [...updatedSectionSlot, ...otherComponents],
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('homepage-mode-changed'))
  }
}
