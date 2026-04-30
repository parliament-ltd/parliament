// EditorMigrationDialog — modal that previews what happens to placed
// components when the user drops a new layout onto the canvas.
//
// Lists every placed component and either the destination slot in the
// new layout (a "move") or a holding-tray entry with a reason ("no
// matching slot in this layout"). Confirm dispatches SWAP_LAYOUT;
// cancel discards.

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { getLayoutSlots } from '../../lib/layoutMigration'
import { findCatalogEntry } from '../../lib/refs'

const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }

export default function EditorMigrationDialog({
  targetLayoutRef,
  plan,
  mode,
  catalogEntries,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const targetSlots = getLayoutSlots(targetLayoutRef)
  const slotById = Object.fromEntries(targetSlots.map((s) => [s.id, s]))

  const placedById = Object.fromEntries(
    (mode?.components || []).map((c) => [c.id, c])
  )
  const findEntry = (ref) => findCatalogEntry(catalogEntries, ref)

  const orphanCount = plan.orphans.length
  const layoutDisplayName = friendlyLayoutName(targetLayoutRef)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-5"
        style={{ backgroundColor: 'rgba(25, 25, 25, 0.32)' }}
        onClick={onCancel}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={SPRING_SMOOTH}
          onClick={(e) => e.stopPropagation()}
          className="w-[480px] max-w-[94vw] max-h-[80vh] bg-[var(--p-bg-surface)] border border-[var(--p-border)] rounded-xl shadow-2xl shadow-black/20 p-6 flex flex-col gap-4"
        >
          <div>
            <div className="text-base font-medium text-[var(--p-text-primary)]">
              Switch to {layoutDisplayName}?
            </div>
            <div className="text-[12.5px] text-[var(--p-text-secondary)] leading-[1.55] mt-1">
              {orphanCount === 0
                ? `All ${plan.moves.length} placed component${plan.moves.length === 1 ? '' : 's'} ${plan.moves.length === 1 ? 'has' : 'have'} a matching spot in the new layout.`
                : `${orphanCount} of your component${orphanCount === 1 ? '' : 's'} ${orphanCount === 1 ? "doesn't" : "don't"} have a place in this layout. They'll move to a holding tray below the canvas where you can reassign or remove them.`}
            </div>
          </div>

          <div className="bg-[var(--p-bg-subtle)] rounded-md p-2.5 flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
            {plan.moves.length === 0 && plan.orphans.length === 0 && (
              <div className="text-[11.5px] text-[var(--p-text-muted)] text-center py-2">
                Empty room — nothing to migrate.
              </div>
            )}
            {plan.moves.map((m) => {
              const spec = placedById[m.compId]
              const entry = findEntry(spec?.ref)
              const targetSlot = slotById[m.toSlot]
              return (
                <div
                  key={m.compId}
                  className="flex items-center gap-2 text-[12px] text-[var(--p-text-secondary)] px-1.5 py-1 rounded"
                >
                  <span className="whitespace-nowrap">{entry?.displayName || spec?.ref || m.compId}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--p-text-muted)] flex-shrink-0" />
                  <span className="whitespace-nowrap font-medium text-[var(--p-text-primary)]">
                    {targetSlot?.label || m.toSlot}
                  </span>
                </div>
              )
            })}
            {plan.orphans.map((o) => {
              const spec = placedById[o.compId]
              const entry = findEntry(spec?.ref)
              return (
                <div
                  key={o.compId}
                  className="flex items-center gap-2 text-[12px] px-1.5 py-1 rounded"
                  style={{ background: 'rgba(196, 169, 77, 0.08)', color: '#8B6A10' }}
                >
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="whitespace-nowrap">{entry?.displayName || spec?.ref || o.compId}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--p-gold-muted)] flex-shrink-0" />
                  <span className="whitespace-nowrap font-medium" style={{ color: '#8B6A10' }}>
                    Holding tray ({o.reason})
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)] transition-colors"
            >
              Switch layout
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function friendlyLayoutName(ref) {
  const map = {
    'three-panel@1.0': 'Three-panel',
    'canvas-centric@1.0': 'Canvas-centric',
    'document-centric@1.0': 'Document-centric',
    'single-column-with-sheet@1.0': 'Single column with sheet',
    'stacked-sections@1.0': 'Stacked sections',
  }
  return map[ref] || ref
}
