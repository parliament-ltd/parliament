// EditorLeftRail — three tabs of draggable items: Layouts, Components,
// Schemes. Pulls layouts from libraryLayouts (IndexedDB seed), components
// from the in-memory catalog, schemes from src/lib/schemes.js.
//
// Each draggable card uses dnd-kit's useDraggable. Drag data carries
// `{ kind, ref, displayName }` — EditorView's onDragEnd routes by `kind`.

import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { initDB } from '../../lib/db'
import { SCHEMES } from '../../lib/schemes'
import { LAYOUT_SLOTS } from '../../lib/layoutMigration'

const TABS = [
  { id: 'layouts', label: 'Layouts' },
  { id: 'components', label: 'Components' },
  { id: 'schemes', label: 'Schemes' },
]

export default function EditorLeftRail({
  scope,
  currentLayoutRef,
  currentSchemeRef,
  placedComponentRefs,
  catalogEntries,
}) {
  const [tab, setTab] = useState('layouts')
  const [layouts, setLayouts] = useState([])

  useEffect(() => {
    let cancelled = false
    async function loadLayouts() {
      const db = await initDB()
      const all = await db.getAll('libraryLayouts')
      if (cancelled) return
      // Filter by scope so room editing doesn't see homepage layouts
      // and vice versa. A layout's `scopes` array can include both.
      const filtered = all.filter((l) =>
        Array.isArray(l.scopes) ? l.scopes.includes(scope) : true
      )
      setLayouts(filtered)
    }
    loadLayouts()
    return () => { cancelled = true }
  }, [scope])

  return (
    <aside className="bg-white border-r border-[var(--p-border)] flex flex-col overflow-hidden">
      <div className="flex border-b border-[var(--p-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-2 py-2.5 text-[11px] font-medium transition-colors border-b-[1.5px] ${
              tab === t.id
                ? 'text-[var(--p-gold-light)] border-[var(--p-gold-light)]'
                : 'text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)] border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'layouts' && (
          <LayoutsTab
            layouts={layouts}
            currentLayoutRef={currentLayoutRef}
          />
        )}
        {tab === 'components' && (
          <ComponentsTab
            entries={catalogEntries}
            placedRefs={placedComponentRefs}
          />
        )}
        {tab === 'schemes' && (
          <SchemesTab currentSchemeRef={currentSchemeRef} />
        )}
      </div>
    </aside>
  )
}

// ─── Tabs ────────────────────────────────────────────────

function LayoutsTab({ layouts, currentLayoutRef }) {
  if (!layouts.length) {
    return <div className="text-[10.5px] text-[var(--p-text-muted)]">No layouts available.</div>
  }
  return (
    <>
      <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5] pb-1">
        Drag a layout onto the canvas to swap. Components move to compatible slots.
      </div>
      {layouts.map((l) => (
        <LayoutCard
          key={l.id}
          id={l.id}
          displayName={l.displayName}
          description={l.description}
          status={l.status}
          isCurrent={l.id === currentLayoutRef}
          slots={LAYOUT_SLOTS[l.id] || []}
        />
      ))}
    </>
  )
}

function ComponentsTab({ entries, placedRefs }) {
  // Filter to entries that target room slots — homepage components
  // (blueprint, library, favorites, etc.) are mostly stack-targets and
  // would clutter a room editor, but for PR-8 we list everything.
  const sorted = [...entries].sort((a, b) => a.displayName.localeCompare(b.displayName))
  return (
    <>
      <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5] pb-1">
        Drag onto a slot to place. Configure in the right rail.
      </div>
      {sorted.map((entry) => {
        const ref = `${entry.name}@${entry.version}`
        return (
          <ComponentCard
            key={ref}
            ref_={ref}
            entry={entry}
            placed={placedRefs.has(ref)}
          />
        )
      })}
    </>
  )
}

function SchemesTab({ currentSchemeRef }) {
  return (
    <>
      <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5] pb-1">
        Drag a scheme onto the canvas to apply.
      </div>
      {SCHEMES.map((s) => {
        const ref = `${s.id}@1.0`
        const swatch = s.variants?.light?.['--p-gold-light'] || '#C4A94D'
        const bg = s.variants?.light?.['--p-bg-base'] || '#FFFFFF'
        return (
          <SchemeCard
            key={ref}
            ref_={ref}
            displayName={s.displayName}
            description={s.description}
            swatch={swatch}
            bg={bg}
            isActive={ref === currentSchemeRef}
          />
        )
      })}
    </>
  )
}

// ─── Cards ───────────────────────────────────────────────

function LayoutCard({ id, displayName, description, status, isCurrent, slots }) {
  const draggable = !isCurrent && status === 'available'
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `layout-${id}`,
    data: { kind: 'layout', ref: id, displayName },
    disabled: !draggable,
  })

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      className={`p-2 border rounded-md bg-white transition-colors ${
        draggable
          ? `cursor-grab hover:border-[var(--p-gold-light)] hover:bg-[rgba(196,169,77,0.04)] ${isDragging ? 'opacity-50' : ''}`
          : 'cursor-default opacity-60 bg-[var(--p-bg-subtle)]'
      } border-[var(--p-border)]`}
    >
      <LayoutWireframe slots={slots} />
      <div className="flex items-center gap-1.5 mt-1.5">
        <div className="text-[12px] font-medium text-[var(--p-text-primary)] flex-1 truncate">
          {displayName}
        </div>
        {isCurrent && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-[var(--p-bg-alt)] text-[var(--p-text-muted)]">
            Active
          </span>
        )}
        {status === 'coming-soon' && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-[var(--p-bg-alt)] text-[var(--p-text-muted)]">
            Soon
          </span>
        )}
      </div>
      {description && (
        <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.45]">{description}</div>
      )}
    </div>
  )
}

// Mini wireframe of the layout's slot inventory. Hardcoded geometries
// per layout id — for layouts not in this map we fall back to a flat
// row of equal-width slot rectangles.
function LayoutWireframe({ slots }) {
  if (!slots.length) {
    return <div className="w-full h-10 rounded bg-[var(--p-bg-subtle)] border border-[var(--p-border-subtle)]" />
  }
  return (
    <div className="w-full h-10 rounded bg-[var(--p-bg-subtle)] border border-[var(--p-border-subtle)] flex gap-1 p-1">
      {slots.slice(0, 4).map((s) => (
        <div
          key={s.id}
          className="border border-[var(--p-text-light)] rounded-sm flex-1"
          title={s.label}
        />
      ))}
    </div>
  )
}

function ComponentCard({ ref_, entry, placed }) {
  const draggable = true // even placed components can be re-dragged to a new slot
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `comp-${ref_}`,
    data: { kind: 'component', ref: ref_, displayName: entry.displayName },
    disabled: !draggable,
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 border rounded-md bg-white border-[var(--p-border)] transition-colors cursor-grab hover:border-[var(--p-gold-light)] hover:bg-[rgba(196,169,77,0.04)] ${
        isDragging ? 'opacity-50' : ''
      } ${placed ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className="text-[12px] font-medium text-[var(--p-text-primary)] flex-1 truncate">
          {entry.displayName}
        </div>
        {placed && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-[var(--p-bg-alt)] text-[var(--p-text-muted)]">
            Placed
          </span>
        )}
      </div>
      {entry.description && (
        <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.45] line-clamp-2">
          {entry.description}
        </div>
      )}
    </div>
  )
}

function SchemeCard({ ref_, displayName, description, swatch, bg, isActive }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scheme-${ref_}`,
    data: { kind: 'scheme', ref: ref_, displayName },
  })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 border rounded-md transition-colors cursor-grab ${
        isDragging ? 'opacity-50' : ''
      } ${isActive ? 'border-[var(--p-gold-light)]' : 'border-[var(--p-border)] hover:border-[var(--p-gold-light)]'}`}
      style={isActive ? { background: 'rgba(196,169,77,0.06)' } : undefined}
    >
      <div className="w-full h-7 rounded flex items-center px-2 gap-1.5" style={{ background: bg, border: `0.5px solid ${swatch}` }}>
        <span className="w-2 h-2 rounded-full" style={{ background: swatch }} />
        <span className="flex-1 h-0.5 rounded" style={{ background: swatch, opacity: 0.45 }} />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <div className="text-[12px] font-medium text-[var(--p-text-primary)] flex-1 truncate">
          {displayName}
        </div>
        {isActive && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-[var(--p-bg-alt)] text-[var(--p-text-muted)]">
            Active
          </span>
        )}
      </div>
      {description && (
        <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.45]">{description}</div>
      )}
    </div>
  )
}
