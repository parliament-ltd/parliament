import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, X, ArrowRight } from 'lucide-react'
import { SPRING_SNAPPY } from '../../lib/constants'

const MODE_LABELS = {
  albatross:     'Albatross',
  swift:         'Swift',
  kingfisher:    'Kingfisher',
  secretarybird: 'Secretarybird',
  starling:      'Starling',
  pelican:       'Pelican',
}

/**
 * Displays a context-aware mode switch suggestion above the input area.
 * Props:
 *   suggestion — { id, targetMode, message, cta } or null
 *   onSwitch(mode)  — called when user clicks Switch button
 *   onDismiss()     — called when user clicks X (dismisses this session only)
 *   onDisable()     — called when user clicks "Turn off" (persists to settings)
 */
export default function ModeSuggestion({ suggestion, onSwitch, onDismiss, onDisable }) {
  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          key={suggestion.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={SPRING_SNAPPY}
          className="mx-4 mb-2 px-4 py-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg-subtle)] flex items-center gap-3"
        >
          <Lightbulb className="w-4 h-4 text-[#B8A070] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--p-text-primary)]">{suggestion.message}</p>
            <p className="text-xs text-[var(--p-text-secondary)] mt-0.5">{suggestion.cta}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSwitch(suggestion.targetMode)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#B8A070]/50 bg-transparent text-[var(--p-text-primary)] shrink-0 flex items-center gap-1.5 hover:border-[#B8A070] transition-colors"
          >
            <ArrowRight className="w-3 h-3" />
            Switch to {MODE_LABELS[suggestion.targetMode]}
          </motion.button>
          <button
            onClick={onDisable}
            className="text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors text-[11px] shrink-0"
            title="Turn off mode suggestions"
          >
            Turn off
          </button>
          <button
            onClick={onDismiss}
            className="text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
