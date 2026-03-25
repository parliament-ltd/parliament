import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING_SNAPPY } from '../../lib/constants'

/**
 * Renders a markdown link as a highlighted inline citation with hover tooltip.
 * Used by MessageCard for assistant messages when web search is enabled.
 *
 * External links → pale blue highlight + domain tooltip on hover.
 * Internal/relative links → plain styled link.
 */
export default function CitationLink({ href, children }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const hideTimeoutRef = useRef(null)

  if (!href) {
    return <span>{children}</span>
  }

  let domain = null
  try {
    const url = new URL(href)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      domain = url.hostname.replace(/^www\./, '')
    }
  } catch {
    // Relative or non-http URL — render as plain link
  }

  if (!domain) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#4A7AE5] underline">
        {children}
      </a>
    )
  }

  const show = () => {
    clearTimeout(hideTimeoutRef.current)
    setShowTooltip(true)
  }

  const hide = () => {
    hideTimeoutRef.current = setTimeout(() => setShowTooltip(false), 120)
  }

  return (
    <span className="relative inline">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={show}
        onMouseLeave={hide}
        style={{
          backgroundColor: 'rgba(74, 122, 229, 0.12)',
          borderBottom: '1px solid rgba(74, 122, 229, 0.4)',
          borderRadius: 2,
          padding: '0 2px',
          color: 'inherit',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(74, 122, 229, 0.22)' }}
        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(74, 122, 229, 0.12)' }}
      >
        {children}
      </a>
      <AnimatePresence>
        {showTooltip && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={SPRING_SNAPPY}
            onMouseEnter={show}
            onMouseLeave={hide}
            className="absolute bottom-full left-0 mb-1.5 z-50 pointer-events-auto"
          >
            <span
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap shadow-lg"
              style={{ backgroundColor: '#1E2532', color: '#FFFFFF', maxWidth: 260 }}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-[#4A7AE5] opacity-60"
              />
              <span className="truncate">{domain}</span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
