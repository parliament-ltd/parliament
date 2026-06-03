// EditorHoldingTray — the gold-tinted strip below the canvas that
// catches components orphaned by a layout swap AND any components
// added through Library mode's apply-on-close (PR-45).
//
// PR-46b: chips are now mini lib-cards rather than pills, so the tray
// preview reads as the same kind of "card" the user picked in Library.
// Each card is a drag source; hover reveals an x badge in the top-
// right corner.
//
// While the tray is non-empty, EditorTopBar's Build button is disabled
// (the topbar reads `trayBlockingBuild`). EditorView's onSave also
// guards on the tray.

import { X } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { listEntries as listCatalogEntries } from '../../catalog'
import { findCatalogEntry } from '../../lib/refs'
import LibraryCard from '../LibraryCard'

export default function EditorHoldingTray({ tray, onDismiss }) {
  if (!tray || tray.length === 0) return null
  const entries = listCatalogEntries()
  return (
    <div
      className="max-w-[920px] mx-auto mt-3 mb-6 px-4 py-3 rounded-lg border flex items-start gap-4 flex-wrap"
      style={{
        background: 'rgba(196, 169, 77, 0.08)',
        borderColor: 'var(--p-gold-light)',
      }}
      role="region"
      aria-label="Holding tray"
    >
      <div className="flex flex-col gap-0.5 min-w-[170px] max-w-[230px] pt-1">
        <div
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: '#8B6A10' }}
        >
          Holding tray
        </div>
        <div className="text-[10.5px] text-[var(--p-text-muted)] leading-[1.5]">
          Drag a component onto the canvas.
        </div>
      </div>
      <div className="tray-mini-grid flex-1">
        {tray.map((chip) => (
          <TrayCard
            key={chip.compId}
            chip={chip}
            entry={findCatalogEntry(entries, chip.ref)}
            onDismiss={() => onDismiss(chip.compId)}
          />
        ))}
      </div>
    </div>
  )
}

function TrayCard({ chip, entry, onDismiss }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tray-${chip.compId}`,
    data: {
      kind: 'component',
      ref: chip.ref,
      fromTray: true,
      trayCompId: chip.compId,
      componentId: chip.compId,
    },
  })
  const label = entry?.displayName || chip.ref || 'Component'
  const item = entry
    ? { ...entry, id: chip.ref, kind: 'component' }
    : {
        id: chip.ref,
        kind: 'component',
        displayName: label,
      }
  return (
    <div
      className={`tray-mini-card${isDragging ? ' is-dragging' : ''}`}
      title={chip.reason ? `Orphaned: ${chip.reason}` : 'Drag onto the canvas'}
    >
      <LibraryCard
        item={item}
        dragRef={setNodeRef}
        dragListeners={listeners}
        dragAttributes={attributes}
        isDragging={isDragging}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="tray-mini-card-x"
        aria-label={`Dismiss ${label}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}
