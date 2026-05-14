// EditorLeftRail — three tabs of draggable library cards: Layouts,
// Components, Schemes. Cards render through the shared `<LibraryCard>`
// primitive (src/components/LibraryCard.jsx) so a Highlights card here
// and a Highlights card on the homepage look like the same thing.
//
// PR-19c rewrite:
//   - Switched to LibraryCard everywhere.
//   - Layouts: distinct per-layout silhouettes via <LayoutSilhouette>.
//   - Layouts: "Current" pill (renamed from "Active").
//   - Components: lucide icon centered in the preview area (reads
//     `entry.icon` added to manifests in PR-19c).
//   - Components: "Homepage" pill + grey-out when the component's
//     `surfaces` excludes the current editor scope.
//   - Schemes: 3-color swatch (bg + accent + soft stripe). Fixed a
//     pre-existing bug where the SchemesTab built `${s.id}@1.0` (double
//     `@1.0`) and looked up `--p-gold-light` keys that don't exist in
//     the SCHEMES const.

import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { initDB } from '../../lib/db'
import { SCHEMES } from '../../lib/schemes'
import LibraryCard from '../LibraryCard'

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
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'layouts' && (
          <LayoutsTab layouts={layouts} currentLayoutRef={currentLayoutRef} />
        )}
        {tab === 'components' && (
          <ComponentsTab
            entries={catalogEntries}
            placedRefs={placedComponentRefs}
            scope={scope}
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
    <div className="lrail-cards">
      <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5] pb-2">
        Drag a layout onto the canvas to swap. Components move to compatible slots.
      </div>
      {layouts.map((l) => (
        <DraggableLayoutCard
          key={l.id}
          layout={l}
          isCurrent={l.id === currentLayoutRef}
        />
      ))}
    </div>
  )
}

function ComponentsTab({ entries, placedRefs, scope }) {
  const sorted = [...entries].sort((a, b) => a.displayName.localeCompare(b.displayName))
  return (
    <div className="lrail-cards">
      <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5] pb-2">
        Drag onto a slot to place. Configure in the right rail.
      </div>
      {sorted.map((entry) => {
        const ref = `${entry.name}@${entry.version}`
        // PR-19c: filter by surfaces. Components scoped to a different
        // surface (e.g. homepage-only blueprint while editing a room) get
        // greyed out + a "Homepage"/"Room" pill instead of being hidden.
        const surfaces = entry.surfaces || ['both']
        const fits = surfaces.includes(scope) || surfaces.includes('both')
        return (
          <DraggableComponentCard
            key={ref}
            ref_={ref}
            entry={entry}
            placed={placedRefs.has(ref)}
            disabled={!fits}
            surfaceLabel={!fits ? surfaceMismatchLabel(surfaces) : null}
          />
        )
      })}
    </div>
  )
}

function SchemesTab({ currentSchemeRef }) {
  return (
    <div className="lrail-cards">
      <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5] pb-2">
        Drag a scheme onto the canvas to apply.
      </div>
      {SCHEMES.map((s) => {
        const ref = s.id // already 'parliament@1.0' etc — no second @1.0 needed
        return (
          <DraggableSchemeCard
            key={ref}
            ref_={ref}
            scheme={s}
            isActive={ref === currentSchemeRef}
          />
        )
      })}
    </div>
  )
}

// ─── Draggable card wrappers ─────────────────────────────

function DraggableLayoutCard({ layout, isCurrent }) {
  const isComingSoon = layout.status === 'coming-soon'
  const draggable = !isCurrent && !isComingSoon
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `layout-${layout.id}`,
    data: { kind: 'layout', ref: layout.id, displayName: layout.displayName },
    disabled: !draggable,
  })

  const statusLabel = isCurrent ? 'Current' : (isComingSoon ? 'Soon' : null)

  return (
    <LibraryCard
      item={{ ...layout, kind: 'layout' }}
      dragRef={setNodeRef}
      dragListeners={draggable ? listeners : undefined}
      dragAttributes={draggable ? attributes : undefined}
      isDragging={isDragging}
      disabled={!draggable}
      statusLabel={statusLabel}
    />
  )
}

function DraggableComponentCard({ ref_, entry, placed, disabled, surfaceLabel }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `comp-${ref_}`,
    data: { kind: 'component', ref: ref_, displayName: entry.displayName },
    disabled,
  })

  const statusLabel = surfaceLabel || (placed ? 'Placed' : null)

  return (
    <LibraryCard
      item={{
        ...entry,
        id: ref_,
        kind: 'component',
        // Surfaces flow through manifest; icon was added in PR-19c.
      }}
      dragRef={setNodeRef}
      dragListeners={!disabled ? listeners : undefined}
      dragAttributes={!disabled ? attributes : undefined}
      isDragging={isDragging}
      disabled={disabled}
      statusLabel={statusLabel}
    />
  )
}

function DraggableSchemeCard({ ref_, scheme, isActive }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scheme-${ref_}`,
    data: { kind: 'scheme', ref: ref_, displayName: scheme.displayName },
  })

  return (
    <LibraryCard
      item={{ ...scheme, kind: 'scheme' }}
      dragRef={setNodeRef}
      dragListeners={listeners}
      dragAttributes={attributes}
      isDragging={isDragging}
      statusLabel={isActive ? 'Active' : null}
    />
  )
}

// ─── Helpers ─────────────────────────────────────────────

function surfaceMismatchLabel(surfaces) {
  if (surfaces.includes('homepage') && !surfaces.includes('room')) return 'Homepage'
  if (surfaces.includes('room') && !surfaces.includes('homepage')) return 'Room'
  return null
}
