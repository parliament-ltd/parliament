// Retired with R20, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/components/editor/EditorPreviewSheet.jsx. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// EditorPreviewSheet — read-only render of the in-memory draft mode
// (PR-9). The Preview button in EditorTopBar opens this sheet, which
// renders <RoomShell> against state.mode (the current draft, including
// any unsaved edits). Esc or the close button dismisses.
//
// The sheet is decorative — pointer-events on the inner RoomShell are
// disabled so accidental clicks don't try to send messages or open
// modals (most components rely on conversation context that isn't
// loaded in the editor anyway). This is "see what it'll look like",
// not "interact with the room before saving".

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye } from 'lucide-react'
import RoomShell from '../RoomShell'

const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }

export default function EditorPreviewSheet({ open, mode, onClose }) {
  // Esc to close. Mounted/unmounted with the sheet so it doesn't
  // compete with EditorView's Esc-deselect outside preview.
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[150] flex justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={SPRING_GENTLE}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-5xl bg-white border-l border-[var(--p-border)] shadow-2xl shadow-black/20 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--p-border)]">
              <div className="flex items-center gap-2 text-[var(--p-text-primary)]">
                <Eye className="w-3.5 h-3.5 text-[var(--p-gold-light)]" />
                <span className="text-sm font-medium">Preview</span>
                <span className="text-xs text-[var(--p-text-muted)]">— {mode?.meta?.name || 'Untitled room'}</span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--p-text-secondary)] hover:bg-[var(--p-bg-subtle)] hover:text-[var(--p-text-primary)] transition-colors"
                aria-label="Close preview"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div
              className="flex-1 min-h-0 overflow-hidden bg-[var(--p-bg-base)]"
              style={{ pointerEvents: 'none' }}
            >
              <RoomShell mode={mode} />
            </div>
            <div className="px-5 py-3 border-t border-[var(--p-border)] text-[10.5px] uppercase tracking-wider font-medium text-[var(--p-text-muted)] text-center">
              Read-only preview — interactions are disabled
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
