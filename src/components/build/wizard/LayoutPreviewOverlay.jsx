// LayoutPreviewOverlay — slide-in panel from right showing layout details
// (PR-13).
//
// Per parliament_wizard_v5.html lines 858–950, 1348–1362. Backdrop
// fades in (rgba(25,25,25,0.32)); panel slides in from right (380px,
// 0.22s slide+fade). Esc and click-outside close.

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { LAYOUT_META } from '../../../lib/buildWizard'
import LayoutWireframe from './LayoutWireframe'

export default function LayoutPreviewOverlay({ layoutId, onClose }) {
  useEffect(() => {
    if (!layoutId) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [layoutId, onClose])

  return (
    <AnimatePresence>
      {layoutId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-end"
          style={{ background: 'rgba(25, 25, 25, 0.32)' }}
        >
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="h-screen overflow-y-auto p-6 flex flex-col gap-4"
            style={{
              width: 380,
              maxWidth: '95vw',
              background: 'var(--p-bg-surface)',
              borderLeft: '0.5px solid var(--p-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[17px] font-medium" style={{ color: 'var(--p-text-primary)' }}>
                {LAYOUT_META[layoutId]?.label || 'Layout'}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                style={{ background: 'transparent', color: 'var(--p-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--p-bg-subtle)'; e.currentTarget.style.color = 'var(--p-text-secondary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--p-text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <LayoutWireframe id={layoutId} />
            <div className="text-[13px] leading-[1.6]" style={{ color: 'var(--p-text-secondary)' }}>
              {LAYOUT_META[layoutId]?.long}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
