// NarrowDrawer — left-edge slide-in drawer used by room layouts in
// narrow mode (PR-16). Mirrors EditorPreviewSheet's modal pattern
// (scrim + spring transition + Esc/scrim dismiss) but anchored to the
// left edge.
//
// Animation respects `prefers-reduced-motion` via Framer Motion's
// useReducedMotion() hook. No focus trap (matches EditorPreviewSheet
// and LibraryOverlay convention).

import { useEffect } from 'react'
// `motion` is aliased to `Motion` so the no-unused-vars rule (which
// only allows unused names matching /^[A-Z_]/u) doesn't flag the import
// when used solely via JSX namespace syntax (<Motion.div>).
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion'

const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }

export default function NarrowDrawer({ open, onClose, children }) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const slideTransition = reduceMotion ? { duration: 0 } : SPRING_GENTLE
  const fadeTransition = reduceMotion ? { duration: 0 } : { duration: 0.15 }

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeTransition}
          className="fixed inset-0 z-[140] flex justify-start"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
          aria-modal="true"
          role="dialog"
        >
          <Motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={slideTransition}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-72 bg-white border-r border-[var(--p-border)] shadow-2xl shadow-black/20 flex flex-col overflow-y-auto"
          >
            {children}
          </Motion.aside>
        </Motion.div>
      )}
    </AnimatePresence>
  )
}
