import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING_SNAPPY } from '../../lib/constants'
import { shownAddress } from '../../lib/safeUrl'

// Reject unsafe URL schemes (javascript:, data:, vbscript:, file:) — anything
// that could execute code or exfiltrate via the renderer. Relative URLs and
// http(s) are allowed.
const UNSAFE_SCHEME = /^\s*(javascript|data|vbscript|file):/i
function sanitizeHref(href) {
  if (typeof href !== 'string') return null
  if (UNSAFE_SCHEME.test(href)) return null
  return href
}

/**
 * Renders a markdown link as a highlighted inline citation. Before it opens,
 * it shows its whole address: on hover, on keyboard focus, and on a touch
 * screen at the first tap, the second opening it (C146 (b)).
 *
 * Internal/relative links → plain styled link, its address as its title.
 */
export default function CitationLink({ href, children }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const hideTimeoutRef = useRef(null)
  const touched = useRef(false) // the last press was a finger

  const safeHref = sanitizeHref(href)
  if (!safeHref) {
    // Missing href or unsafe scheme — render link text as plain span.
    return <span>{children}</span>
  }

  const address = shownAddress(safeHref)

  if (!address) {
    return (
      <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-[#B8A070] underline" title={safeHref}>
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
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-description={address}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onPointerDown={(e) => { touched.current = e.pointerType === 'touch' }}
        onClick={(e) => {
          // A finger has no hover: the first tap shows where it goes.
          if (touched.current && !showTooltip) { e.preventDefault(); show() }
        }}
        style={{
          backgroundColor: 'rgba(184, 160, 112, 0.14)',
          borderBottom: '1px solid rgba(184, 160, 112, 0.45)',
          borderRadius: 2,
          padding: '0 2px',
          color: 'inherit',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.15s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(184, 160, 112, 0.24)' }}
        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(184, 160, 112, 0.14)' }}
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
              className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium shadow-lg"
              style={{ backgroundColor: '#1E2532', color: '#FFFFFF', width: 'max-content', maxWidth: 'min(420px, 80vw)' }}
            >
              <span
                className="w-2.5 h-2.5 mt-[3px] rounded-sm flex-shrink-0 bg-[#B8A070] opacity-70"
              />
              <span dir="ltr" style={{ overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{address}</span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
