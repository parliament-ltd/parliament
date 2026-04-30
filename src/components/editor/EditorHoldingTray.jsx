// EditorHoldingTray — the gold-tinted strip below the canvas that
// catches components orphaned by a layout swap (per
// refactor/parliament_v2_design_decisions.md §4).
//
// Each chip is a draggable that carries its component spec back to a
// slot via dnd-kit. The "X" dismisses the chip without re-placing.
//
// While the tray is non-empty, EditorTopBar's Build button is disabled
// (the topbar reads `trayBlockingBuild`). EditorView's onSave also
// guards on the tray.

import { X } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { listEntries as listCatalogEntries } from '../../catalog'
import { findCatalogEntry } from '../../lib/refs'

export default function EditorHoldingTray({ tray, onDismiss }) {
  if (!tray || tray.length === 0) return null
  const entries = listCatalogEntries()
  return (
    <div
      className="max-w-[920px] mx-auto mt-3 mb-6 px-3 py-2.5 rounded-lg border flex items-center gap-3 flex-wrap"
      style={{
        background: 'rgba(196, 169, 77, 0.08)',
        borderColor: 'var(--p-gold-light)',
      }}
      role="region"
      aria-label="Holding tray"
    >
      <div
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: '#8B6A10' }}
      >
        Holding tray
      </div>
      <div className="flex-1 min-w-[180px] text-[10.5px] text-[var(--p-text-muted)]">
        Drag these into a slot, or remove them. Build is disabled until the tray is empty.
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tray.map((chip) => (
          <TrayChip
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

function TrayChip({ chip, entry, onDismiss }) {
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
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] cursor-grab transition-opacity ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{
        background: 'rgba(196, 169, 77, 0.08)',
        border: '0.5px dashed var(--p-gold-light)',
        color: '#8B6A10',
      }}
      title={chip.reason ? `Orphaned: ${chip.reason}` : 'Drag to a slot or dismiss'}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-[var(--p-gold-muted)] hover:text-[#E03E3E] transition-colors flex items-center"
        aria-label={`Dismiss ${label}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}
