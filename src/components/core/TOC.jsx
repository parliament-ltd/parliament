import { motion } from 'framer-motion'
import { SPRING_SMOOTH } from '../../lib/constants'

/**
 * Table of contents derived from user messages.
 * Renders a scrollable list of truncated message labels that scroll-jump
 * to the target message on click.
 */
export default function TOC({ items = [], onNavigate }) {
  return (
    <>
      {items.length === 0 ? (
        <p className="text-xs text-[#D5D5D5] px-3 py-2">
          Messages will appear here
        </p>
      ) : (
        items.map((item) => (
          <TOCItem key={item.id} onClick={() => onNavigate(item.id)}>
            {item.label}
          </TOCItem>
        ))
      )}
    </>
  )
}

/* ── Internal sub-component ─────────────────────────────── */

function TOCItem({ children, onClick }) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_SMOOTH}
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6B7C93] hover:text-[#1E2532] transition-colors truncate"
    >
      {children}
    </motion.button>
  )
}
