// WizardReceipt — chip strip showing prior selections (PR-13).
//
// Per parliament_wizard_v5.html lines 183–205. Each chip has a small
// gold dot plus the value. Chips animate in with a scale-up. Shown on
// every step from 1..5; step 6 (Ignition) has its own room-preview
// surface; step 7 (Done) has no receipt.
//
// Items prop is a flat array of strings (purpose values, device values,
// density, layout label, scheme label). Falsy entries are skipped.

import { motion, AnimatePresence } from 'framer-motion'

export default function WizardReceipt({ items = [] }) {
  const visible = items.filter(Boolean)
  return (
    <div className="flex flex-wrap gap-1.5 min-h-[22px] mb-5">
      <AnimatePresence>
        {visible.map((label) => (
          <motion.div
            key={label}
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
            <span
              className="w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: 'var(--p-gold-light)' }}
            />
            {label}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
