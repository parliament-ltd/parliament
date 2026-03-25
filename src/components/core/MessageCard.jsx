import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Star, StickyNote, GitBranch, Trash2, MoreVertical,
  Eye, Copy, ArrowRightCircle, Pencil,
} from 'lucide-react'
import { SPRING_SNAPPY, SPRING_GENTLE, DUSTY_GOLD, HIGHLIGHT_COLORS } from '../../lib/constants'
import { indexOfWord } from '../../lib/textUtils'

/* ── Message entrance animation ─────────────────────────── */

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { ...SPRING_GENTLE, delay: i * 0.08 },
  }),
}

/* ── MessageCard ─────────────────────────────────────────── */

export default function MessageCard({
  id, type, content, number, index = 0,
  isGhostText = false,
  isFavorited = false, showNotes = false,
  savedNoteText = '',
  highlights = [],
  isPopoverActive = false, onPopoverChange,
  onNote, onFavorite, onNoteSave, onHighlight, onContinue, onDelete, onBranch,
  onHide, onCopyText, onMoveToBranch,
}) {
  const [noteText, setNoteText] = useState(savedNoteText)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [popoverPos, setPopoverPos] = useState(null)
  const contentRef = useRef(null)

  useEffect(() => {
    setNoteText(savedNoteText)
  }, [savedNoteText])

  const handleNoteBlur = () => {
    if (noteText !== savedNoteText) onNoteSave?.(noteText)
  }

  const handleCopy = () => {
    onCopyText?.()
    setCopied(true)
    setShowMenu(false)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleFavoriteClick = () => { onFavorite?.() }

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length < 2) {
      onPopoverChange?.(false)
      setPopoverPos(null)
      return
    }
    const range = selection.getRangeAt(0)
    if (!contentRef.current?.contains(range.commonAncestorContainer)) {
      onPopoverChange?.(false)
      setPopoverPos(null)
      return
    }
    const rect = range.getBoundingClientRect()
    const containerRect = contentRef.current.getBoundingClientRect()
    setPopoverPos({
      text,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top  - containerRect.top  - 8,
    })
    onPopoverChange?.(true)
  }, [onPopoverChange])

  const handleHighlightColor = (color) => {
    if (popoverPos?.text) onHighlight?.(popoverPos.text, color)
    setPopoverPos(null)
    onPopoverChange?.(false)
    window.getSelection()?.removeAllRanges()
  }

  /* ── Render content with highlights + Markdown ──────────── */

  const highlightTerms = useMemo(() => {
    if (!highlights.length) return []
    const seen = new Map()
    for (const hl of highlights) {
      const key = hl.text.toLowerCase()
      if (!seen.has(key)) {
        const bgColor = HIGHLIGHT_COLORS.find(c => c.color === hl.color)?.bg || 'rgba(74,122,229,0.15)'
        seen.set(key, { text: hl.text, bg: bgColor })
      }
    }
    return Array.from(seen.values())
  }, [highlights])

  const renderContent = useMemo(() => {
    if (!content) return null

    function highlightString(text) {
      const ranges = []
      for (const hl of highlightTerms) {
        let startIndex = 0
        while (startIndex < text.length) {
          const idx = indexOfWord(text, hl.text, startIndex)
          if (idx === -1) break
          ranges.push({ start: idx, end: idx + hl.text.length, bg: hl.bg })
          startIndex = idx + hl.text.length
        }
      }
      if (ranges.length === 0) return text

      ranges.sort((a, b) => a.start - b.start)
      const merged = [ranges[0]]
      for (let i = 1; i < ranges.length; i++) {
        const last = merged[merged.length - 1]
        if (ranges[i].start >= last.end) merged.push(ranges[i])
      }

      const fragments = []
      let cursor = 0
      for (const r of merged) {
        if (cursor < r.start) fragments.push(text.slice(cursor, r.start))
        fragments.push(
          <mark
            key={`hl-${r.start}`}
            style={{ backgroundColor: r.bg, borderRadius: '2px', padding: '0 1px', color: 'inherit' }}
          >
            {text.slice(r.start, r.end)}
          </mark>
        )
        cursor = r.end
      }
      if (cursor < text.length) fragments.push(text.slice(cursor))
      return fragments
    }

    function applyHighlights(children) {
      if (!highlightTerms.length) return children
      return React.Children.map(children, (child) => {
        if (typeof child === 'string') return highlightString(child)
        if (child && child.props && child.props.children) {
          return React.cloneElement(child, {
            ...child.props,
            children: applyHighlights(child.props.children),
          })
        }
        return child
      })
    }

    const highlightedComponents = highlightTerms.length > 0 ? {
      p:          ({ children, ...props }) => <p          {...props}>{applyHighlights(children)}</p>,
      li:         ({ children, ...props }) => <li         {...props}>{applyHighlights(children)}</li>,
      td:         ({ children, ...props }) => <td         {...props}>{applyHighlights(children)}</td>,
      th:         ({ children, ...props }) => <th         {...props}>{applyHighlights(children)}</th>,
      strong:     ({ children, ...props }) => <strong     {...props}>{applyHighlights(children)}</strong>,
      em:         ({ children, ...props }) => <em         {...props}>{applyHighlights(children)}</em>,
      h1:         ({ children, ...props }) => <h1         {...props}>{applyHighlights(children)}</h1>,
      h2:         ({ children, ...props }) => <h2         {...props}>{applyHighlights(children)}</h2>,
      h3:         ({ children, ...props }) => <h3         {...props}>{applyHighlights(children)}</h3>,
      h4:         ({ children, ...props }) => <h4         {...props}>{applyHighlights(children)}</h4>,
      blockquote: ({ children, ...props }) => <blockquote {...props}>{applyHighlights(children)}</blockquote>,
    } : {}

    return (
      <div className="parliament-md">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={highlightedComponents}>
          {content}
        </ReactMarkdown>
      </div>
    )
  }, [content, highlights, highlightTerms])

  return (
    <motion.div
      id={`msg-${id}`}
      custom={index}
      variants={index !== undefined ? messageVariants : undefined}
      initial={index !== undefined ? 'hidden' : false}
      animate={index !== undefined ? 'show' : { opacity: isGhostText ? 0.55 : 1 }}
      layout="position"
      className={`relative group ${type === 'user' ? 'ml-12' : 'mr-12'}`}
    >
      <motion.div
        whileHover={{ borderColor: '#E0E0E0' }}
        transition={{ duration: 0.2 }}
        className={`rounded-lg border transition-colors ${
          isGhostText ? 'border-dashed border-[#9B9A97]' : 'border-[#E9E9E7]'
        }`}
        style={{ backgroundColor: 'var(--p-bg-surface)' }}
      >
        {/* Header row */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--p-border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#9B9A97] opacity-0 group-hover:opacity-100 transition-opacity">
              #{number}
            </span>
            {(isFavorited || savedNoteText) && (
              <div className="flex items-center gap-1.5">
                {isFavorited && (
                  <Star
                    className="w-3 h-3"
                    style={{ fill: DUSTY_GOLD, color: DUSTY_GOLD, strokeLinejoin: 'round' }}
                  />
                )}
                {savedNoteText && <StickyNote className="w-3 h-3 text-[#D9730D]" />}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <MsgIconButton onClick={handleFavoriteClick} active={isFavorited} title="Favorite">
              <Star
                className="w-3.5 h-3.5"
                style={isFavorited ? { fill: DUSTY_GOLD, color: DUSTY_GOLD, strokeLinejoin: 'round' } : {}}
              />
            </MsgIconButton>
            <MsgIconButton onClick={onNote} active={showNotes} title="Add note">
              <StickyNote className="w-3.5 h-3.5" />
            </MsgIconButton>
            <MsgIconButton onClick={onBranch} title="Branch from here">
              <GitBranch className="w-3.5 h-3.5" />
            </MsgIconButton>
            <MsgIconButton onClick={onDelete} title="Delete message">
              <Trash2 className="w-3.5 h-3.5" />
            </MsgIconButton>
            <div className="relative">
              <MsgIconButton onClick={() => setShowMenu(!showMenu)} title="More options">
                <MoreVertical className="w-3.5 h-3.5" />
              </MsgIconButton>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-8 w-44 border border-[#E9E9E7] rounded-lg shadow-xl z-30 overflow-hidden bg-white"
                  >
                    <MenuButton icon={Eye} onClick={() => { onHide?.(); setShowMenu(false) }}>
                      Hide message
                    </MenuButton>
                    <MenuButton icon={ArrowRightCircle} onClick={() => { onMoveToBranch?.(); setShowMenu(false) }}>
                      Move to branch
                    </MenuButton>
                    <MenuButton icon={Copy} onClick={() => { handleCopy(); setShowMenu(false) }}>
                      {copied ? 'Copied!' : 'Copy text'}
                    </MenuButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 overflow-hidden relative" ref={contentRef} onMouseUp={handleMouseUp}>
          <div className="text-sm leading-relaxed text-[#191919]">
            {renderContent}
          </div>

          {/* Highlight color picker popover */}
          <AnimatePresence>
            {isPopoverActive && popoverPos && (() => {
              const showBelow = popoverPos.y < 40
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: showBelow ? -4 : 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: showBelow ? -4 : 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute z-40 flex items-center gap-1 px-2 py-1.5 bg-white border border-[#E9E9E7] rounded-lg shadow-lg"
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    left: Math.max(0, popoverPos.x - 60),
                    top:  showBelow ? popoverPos.y + 24 : popoverPos.y - 32,
                  }}
                >
                  <Pencil className="w-3 h-3 text-[#787774] mr-1" />
                  {HIGHLIGHT_COLORS.map((c) => (
                    <motion.button
                      key={c.id}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleHighlightColor(c.color)}
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: c.color }}
                      title={c.id}
                    />
                  ))}
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </div>

        {/* Notes panel */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_SNAPPY}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0">
                <div className="border border-[#E9E9E7] rounded-lg p-3" style={{ backgroundColor: '#FEFCE8' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-3.5 h-3.5 text-[#D9730D]" />
                    <span className="text-xs font-medium text-[#D9730D]">Note</span>
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onBlur={handleNoteBlur}
                    placeholder="Add a note about this message..."
                    className="w-full bg-transparent text-xs text-[#37352F] resize-none focus:outline-none placeholder:text-[#9B9A97]"
                    rows={2}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Ghost text continue button */}
      {isGhostText && content && onContinue && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onContinue}
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#B8A070] border border-[#E9E9E7] hover:border-[#B8A070] transition-colors"
        >
          Continue
        </motion.button>
      )}
    </motion.div>
  )
}

/* ── Internal sub-components ────────────────────────────── */

function MsgIconButton({ onClick, children, active = false, title }) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-[#B8A070]/15 text-[#B8A070]'
          : 'hover:bg-[#F1F1EF] text-[#787774] hover:text-[#191919]'
      }`}
    >
      {children}
    </motion.button>
  )
}

function MenuButton({ icon: Icon, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-xs text-[#37352F] hover:bg-[#F1F1EF] hover:text-[#191919] transition-colors flex items-center gap-2"
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  )
}
