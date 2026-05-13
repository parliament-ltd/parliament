// stacked-sections@1.0 — homepage layout. A vertical stack of collapsible
// section cards rendered from a single `section-slot` (capacity: stack).
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1 (homepage scope):
//   section-slot (stack)
//
// Per [phase-1-pr-plan.md](refactor/phase-1-pr-plan.md) PR-6, the seeded
// homepage mode mounts four default components — blueprint, chats, library,
// favorites — into this slot, in that order. PR-14 added drag-to-reorder;
// PR-17 swapped HTML5 D&D for dnd-kit so reorder works on touch and via
// keyboard. The grabber is now a real <button> with announcements;
// dragging it picks up the section, dropping commits the new order.
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

import { useState, useMemo, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import SectionCard, { Grabber } from '../../components/SectionCard'
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
  // don't actually change the slot contents. Without this, every
  // render produces a new `[]` (when empty) or a new array reference,
  // which would cascade through the useMemo hooks below and the
  // SortableContext items array.
  const sections = useMemo(() => slotContents['section-slot'] || [], [slotContents])

  // Build spec lookup once per mode change. mode.components is the
  // canonical source for section metadata (title/meta) since slotContents
  // only carries pre-rendered React elements.
  const specs = useMemo(() => {
    const map = {}
    for (const c of mode?.components || []) map[c.id] = c
    return map
  }, [mode])

  // SortableContext needs a stable identity array of string IDs. Re-memoize
  // when the rendered section list changes order or membership.
  const sectionIds = useMemo(() => sections.map(n => n.key), [sections])

  // Drives the DragOverlay clone: non-null while a section is being dragged.
  const [activeId, setActiveId] = useState(null)

  // Guards against the race window where HomepageView's async refetch of
  // `mode` hasn't completed before the user starts a second drag. Without
  // this, drag-2's onDragEnd reads a stale `mode` prop and the splice math
  // is wrong, silently clobbering drag-1's reorder.
  const reorderingRef = useRef(false)

  // PointerSensor distance:4 matches the editor's convention
  // (src/views/EditorView.jsx:148) — small enough to feel responsive,
  // big enough that an accidental drift on a click doesn't pick up.
  // TouchSensor delay:250 + tolerance:5 lets the user scroll the page
  // with a quick swipe over a section, but a deliberate press-and-hold
  // picks up. KeyboardSensor with sortableKeyboardCoordinates is what
  // makes arrow keys actually move list items in a sortable context.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Screen-reader announcements. dnd-kit auto-mounts the visually-hidden
  // aria-live region — these strings get read on the corresponding events.
  const announcements = useMemo(() => ({
    onDragStart({ active }) {
      const idx = sections.findIndex(n => n.key === active.id)
      const title = resolveSectionTitle(specs[active.id])
      return `Picked up ${title} section. Position ${idx + 1} of ${sections.length}.`
    },
    onDragOver({ active, over }) {
      const title = resolveSectionTitle(specs[active.id])
      if (!over) return `${title} section is no longer over a drop target.`
      const idx = sections.findIndex(n => n.key === over.id)
      return `${title} section moved to position ${idx + 1} of ${sections.length}.`
    },
    onDragEnd({ active, over }) {
      const title = resolveSectionTitle(specs[active.id])
      if (!over) return `${title} section dropped.`
      const idx = sections.findIndex(n => n.key === over.id)
      return `${title} section dropped at position ${idx + 1} of ${sections.length}.`
    },
    onDragCancel({ active }) {
      const title = resolveSectionTitle(specs[active.id])
      return `Reordering cancelled. ${title} section returned to its original position.`
    },
  }), [sections, specs])

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    if (reorderingRef.current) return
    reorderingRef.current = true
    try {
      await persistReorder(mode, active.id, over.id)
    } finally {
      reorderingRef.current = false
    }
  }

  const handleDragCancel = () => setActiveId(null)

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
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements }}
    >
      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
        <div className="stacked-sections max-w-5xl mx-auto px-6 py-8">
          {sections.map((node, i) => {
            const spec = specs[node.key] || {}
            const section = spec.config?.section || {}
            const sectionId = node.key
            return (
              <SectionCard
                key={sectionId || i}
                sortableId={sectionId}
                sortable
                title={resolveSectionTitle(spec)}
                meta={section.meta}
              >
                {node}
              </SectionCard>
            )
          })}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <SectionDragPreview
            title={resolveSectionTitle(specs[activeId])}
            meta={specs[activeId]?.config?.section?.meta}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )

  // Lifted clone that follows the pointer/finger while a drag is in flight.
  // Renders a simplified section header — no body, no chevron, just the
  // grabber dots + title + meta with a drop shadow. Reuses every existing
  // `.section` and `.section-head` style; the `section-drag-preview` class
  // adds the shadow + grabbing cursor. Defined inline as a named function
  // so the file has no extra top-level component-shaped declarations.
  function SectionDragPreview({ title, meta }) {
    return (
      <div className="section section-drag-preview">
        <header className="section-head">
          <div className="section-grabber-handle"><Grabber /></div>
          <span className="section-title">{title}</span>
          {meta && <span className="section-meta">{meta}</span>}
        </header>
      </div>
    )
  }
  },
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
 *
 * On saveMode failure (validation, IDB error), logs to console and still
 * dispatches the change event so HomepageView re-fetches the unchanged
 * mode and the UI snaps back to its pre-drag order. Without this, a failed
 * save would leave the dnd-kit sibling transforms in their post-drop
 * positions while IndexedDB still held the old order.
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

  try {
    await saveMode({
      ...mode,
      components: [...updatedSectionSlot, ...otherComponents],
    })
  } catch (err) {
    console.error('[stacked-sections] saveMode failed during reorder:', err)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('homepage-mode-changed'))
  }
}
