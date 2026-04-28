import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING_SNAPPY } from '../../lib/constants'

/**
 * Renders markdown with highlighted inline citations.
 *
 * When Claude uses web_search, it typically embeds citations as markdown links:
 *   According to [recent data](https://example.com/article), ...
 *
 * We intercept these links and render them as:
 * - Pale blue highlighted text
 * - A tooltip on hover showing the source domain
 *
 * Regular links (non-citation) are rendered normally.
 */
export default function CitedMarkdown({ content, className = '' }) {
  return (
    <div className={`apollo-md ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: CitationLink,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function CitationLink({ href, children }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef(null)

  // Treat all links in assistant output as potential citations
  let domain = ''
  try {
    domain = new URL(href).hostname.replace(/^www\./, '')
  } catch {
    // Not a valid URL — render as plain link
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#B8A070] underline">
        {children}
      </a>
    )
  }

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current)
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(false), 150)
  }

  return (
    <span className="relative inline">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline rounded px-0.5 cursor-pointer transition-colors"
        style={{
          backgroundColor: 'rgba(184, 160, 112, 0.14)',
          color: 'inherit',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(184, 160, 112, 0.4)',
        }}
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
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="absolute bottom-full left-0 mb-1.5 z-50 pointer-events-auto"
          >
            <span
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap shadow-lg"
              style={{
                backgroundColor: '#1E2532',
                color: '#FFFFFF',
                maxWidth: 280,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: 'rgba(184,160,112,0.45)' }}
              />
              <span className="truncate">{domain}</span>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
