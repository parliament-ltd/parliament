// Retired with R14, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/components/build/wizard/WizardReceipt.jsx. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// WizardReceipt — chip strip showing prior selections (PR-13).
//
// Per parliament_wizard_v5.html lines 183–205. Each chip has a small
// gold dot plus the value. Chips animate in with a scale-up. Shown on
// every step from 1..5; step 6 (Ignition) has its own room-preview
// surface; step 7 (Done) has no receipt.
//
// PR-19g: items may now be either plain strings OR
// `{ label, layoutRef? }`. When `layoutRef` is set the chip renders a
// 24×16 mini-wireframe alongside the label so users see the layout
// abstract, not just the "Three-panel" jargon pill.

import { motion, AnimatePresence } from 'framer-motion'
import LayoutWireframe from './LayoutWireframe'

function normalizeItem(item) {
  if (!item) return null
  if (typeof item === 'string') return { label: item }
  if (!item.label) return null
  return item
}

export default function WizardReceipt({ items = [] }) {
  const visible = items.map(normalizeItem).filter(Boolean)
  return (
    <div className="flex flex-wrap gap-1.5 min-h-[22px] mb-5">
      <AnimatePresence>
        {visible.map((item) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[11px]"
            style={{
              background: 'var(--p-bg-subtle)',
              border: '0.5px solid var(--p-border)',
              color: 'var(--p-text-secondary)',
            }}
          >
            {item.layoutRef ? (
              <LayoutWireframe id={item.layoutRef} mini />
            ) : (
              <span
                className="w-[5px] h-[5px] rounded-full shrink-0"
                style={{ background: 'var(--p-gold-light)' }}
              />
            )}
            {item.label}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
