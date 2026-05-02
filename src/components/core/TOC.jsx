import { motion } from 'framer-motion'
import { SPRING_SMOOTH } from '../../lib/constants'

/**
 * Table of contents.
 *
 * Items: { id, label, level? } — `level` is 1-4 (markdown heading level
 * in response-headings mode); omitted/1 for flat lists like the
 * user-prompts mode. The level controls indent and font size; the click
 * target stays the same.
 */
export default function TOC({ items = [], onNavigate }) {
  return (
    <>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--p-text-muted)] px-3 py-2">
          Items will appear here
        </p>
      ) : (
        items.map((item) => (
          <TOCItem
            key={item.id}
            level={item.level || 1}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </TOCItem>
        ))
      )}
    </>
  )
}

/* ── Internal sub-component ─────────────────────────────── */

const LEVEL_INDENT = { 1: 'pl-3', 2: 'pl-6', 3: 'pl-9', 4: 'pl-12' }
const LEVEL_TEXT = { 1: 'text-sm', 2: 'text-[13px]', 3: 'text-xs', 4: 'text-xs' }

function TOCItem({ children, onClick, level }) {
  const indent = LEVEL_INDENT[level] || LEVEL_INDENT[1]
  const text = LEVEL_TEXT[level] || LEVEL_TEXT[1]
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_SMOOTH}
      onClick={onClick}
      className={`w-full text-left ${indent} pr-3 py-1.5 rounded-lg ${text} text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors truncate`}
    >
      {children}
    </motion.button>
  )
}
