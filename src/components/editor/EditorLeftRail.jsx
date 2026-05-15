// EditorLeftRail — four tabs of draggable library cards: Layouts,
// Components, Schemes, Rooms. Cards render through the shared
// `<LibraryCard>` primitive (src/components/LibraryCard.jsx) so a
// Highlights card here and a Highlights card on the homepage look like
// the same thing.
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
//
// PR-19d additions:
//   - Rooms tab: lists every user-built mode (homepage pinned top, then
//     rooms by meta.modified desc). Drag a room onto the canvas to
//     trigger EditorApplyRoomDialog. Click is intentionally no-op —
//     drag is the only verb.
//   - Cross-scope rule: in a room editor, homepage rows are draggable
//     (modal disables Components). In the homepage editor, room rows
//     are greyed out with a "Room only" status pill.
//   - Tab state is URL-synced via ?tab=. Initial tab respects the
//     query; default is 'rooms' on /edit (blank) and 'layouts' elsewhere.

import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useSearchParams } from 'react-router-dom'
import { initDB } from '../../lib/db'
import { SCHEMES } from '../../lib/schemes'
import LibraryCard from '../LibraryCard'

const TABS = [
  { id: 'layouts', label: 'Layouts' },
  { id: 'components', label: 'Components' },
  { id: 'schemes', label: 'Schemes' },
  { id: 'rooms', label: 'Rooms' },
]

export default function EditorLeftRail({
  scope,
  currentLayoutRef,
  currentSchemeRef,
  placedComponentRefs,
  catalogEntries,
  modes,
  defaultTab = 'layouts',
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = TABS.some((t) => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : defaultTab
  const [tab, setTab] = useState(initialTab)
  const [layouts, setLayouts] = useState([])

  function selectTab(id) {
    setTab(id)
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('tab', id)
      return p
    }, { replace: true })
  }

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
            onClick={() => selectTab(t.id)}
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
        {tab === 'rooms' && (
          <RoomsTab modes={modes} editorScope={scope} />
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

function RoomsTab({ modes, editorScope }) {
  if (!Array.isArray(modes)) {
    return <div className="text-[10.5px] text-[var(--p-text-muted)]">Loading rooms…</div>
  }
  if (modes.length === 0) {
    return <div className="text-[10.5px] text-[var(--p-text-muted)]">No rooms yet. Build one to see it here.</div>
  }
  const sorted = sortRooms(modes)
  return (
    <div className="lrail-cards">
      <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5] pb-2">
        Drag a room onto the canvas to apply its layout, scheme, and components.
      </div>
      {sorted.map((mode) => {
        const isHomepage = mode.scope === 'homepage'
        // Room-scope rooms can't be dropped into the homepage editor —
        // they'd swap the homepage's layout to a room-only one. Disable
        // with a "Room only" pill. Homepage rooms in the room editor
        // are draggable (modal handles disabling Components).
        const fits = isHomepage || editorScope === 'room'
        const statusLabel = isHomepage ? 'Homepage' : (!fits ? 'Room only' : null)
        return (
          <DraggableRoomCard
            key={mode.id}
            mode={mode}
            disabled={!fits}
            statusLabel={statusLabel}
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

function DraggableRoomCard({ mode, disabled, statusLabel }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `room-${mode.id}`,
    data: { kind: 'room', ref: mode.id },
    disabled,
  })

  const displayName = mode.meta?.name?.trim() || (mode.scope === 'homepage' ? 'Homepage' : 'Untitled')

  return (
    <LibraryCard
      item={{
        id: mode.id,
        kind: 'room',
        displayName,
        layoutId: mode.layout?.ref || null,
        author: 'You',
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

// Homepage pinned to the top; everything else sorted by modified desc
// (most recently edited first).
function sortRooms(modes) {
  const homepage = modes.filter((m) => m.scope === 'homepage')
  const rooms = modes.filter((m) => m.scope !== 'homepage')
  rooms.sort((a, b) => {
    const am = a.meta?.modified || ''
    const bm = b.meta?.modified || ''
    return bm.localeCompare(am)
  })
  return [...homepage, ...rooms]
}
