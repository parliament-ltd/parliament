// DocumentParagraph — single contentEditable paragraph row with tracked
// changes overlay, slash-command menu, comment gutter (when markup is on),
// and Claude-suggestion / Claude-origin affordances. Lifted from V1
// secretarybird ChatLayout.jsx — same surface, preserved behavior.
//
// All state lives in DocumentContext; this component is a pure render
// + controlled editor that calls into the shared mutators.

import { useRef, useState, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertTriangle, Lightbulb } from 'lucide-react'
import { SPRING_GENTLE } from '../../../lib/constants'
import { getTextOffset, setCursorAt } from './diff'
import { DiffText, HighlightedText, ClaudeInlineSuggestionPreview } from './renderers'
import { ClaudeOriginCard, ClaudeSuggestionCard, MarginComment } from './cards'

const GOLD = '#B8A070'
const SUGGESTION = '#22C55E'
const RIPPLE_WARN = '#E5A620'
const RIPPLE_OPP = '#4A7AE5'

const SLASH_OPTIONS = [
  { id: 'title', label: 'Title',     description: 'Document title',       type: 'title'    },
  { id: 'h1',    label: 'Heading 1', description: 'Large section title',  type: 'heading'  },
  { id: 'h2',    label: 'Heading 2', description: 'Subsection title',     type: 'heading2' },
  { id: 'quote', label: 'Quote',     description: 'Blockquote callout',   type: 'quote'    },
]

export default function DocumentParagraph({
  para,
  index,
  showMarkup,
  selected,
  placeholder,
  paragraphs,
  addingComment,
  newCommentText,
  expandedComments,
  activeCommentId,
  hoveredRipple,
  rippleEnabled,
  replyingTo,
  setReplyingTo,
  replyInputs,
  setReplyInputs,
  submittedReplies,
  onSelect,
  onTextChange,
  onSplit,
  onMerge,
  onTypeChange,
  onCommentTextChange,
  onAddComment,
  onCancelComment,
  onStartAddComment: _onStartAddComment,
  onSetActiveComment,
  onClearActiveComment,
  onToggleComment,
  onDeleteComment,
  onHoverRipple,
  onSubmitReply,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAcceptOrigin,
  onRejectOrigin,
}) {
  const editRef = useRef(null)
  const isComposing = useRef(false)
  const skipNextSync = useRef(false)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)

  useLayoutEffect(() => {
    const el = editRef.current
    if (!el || skipNextSync.current) { skipNextSync.current = false; return }
    const target = String(para.text ?? '')
    if (el.textContent !== target) {
      const sel = window.getSelection()
      let savedOffset = null
      if (sel?.rangeCount && el.contains(sel.anchorNode)) {
        savedOffset = getTextOffset(el, sel.anchorNode, sel.anchorOffset)
      }
      el.textContent = target
      if (savedOffset !== null) setCursorAt(el, savedOffset)
    }
  }, [para.text])

  const handleInput = (e) => {
    if (isComposing.current) return
    skipNextSync.current = true
    const text = e.currentTarget.textContent
    onTextChange(para.id, text)
    const trimmed = text.trim()
    if (trimmed.startsWith('/') && !trimmed.includes('\n')) {
      setSlashOpen(true)
      setSlashFilter(trimmed.slice(1).toLowerCase())
      setSlashIndex(0)
    } else {
      setSlashOpen(false)
    }
  }

  const handleKeyDown = (e) => {
    if (isComposing.current) return

    if (slashOpen) {
      const filtered = SLASH_OPTIONS.filter(opt =>
        opt.label.toLowerCase().includes(slashFilter) || opt.id.includes(slashFilter),
      )
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashIndex(i => (i + 1) % Math.max(filtered.length, 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashIndex(i => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const opt = filtered[slashIndex]
        if (opt && onTypeChange) {
          onTypeChange(para.id, opt.type)
          onTextChange(para.id, '')
          setSlashOpen(false)
          skipNextSync.current = false
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlashOpen(false)
        return
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const sel = window.getSelection()
      if (!sel?.rangeCount) return
      const offset = getTextOffset(editRef.current, sel.anchorNode, sel.anchorOffset)
      onSplit(para.id, offset)
      requestAnimationFrame(() => {
        const allEditables = Array.from(document.querySelectorAll('[data-para-id] [data-editable]'))
        const currentIdx = allEditables.indexOf(editRef.current)
        const nextEl = allEditables[currentIdx + 1]
        if (nextEl) { nextEl.focus(); setCursorAt(nextEl, 0) }
      })
    }

    if (e.key === 'Backspace') {
      const sel = window.getSelection()
      if (
        sel?.isCollapsed
        && sel.anchorOffset === 0
        && getTextOffset(editRef.current, sel.anchorNode, sel.anchorOffset) === 0
      ) {
        e.preventDefault()
        const idx = paragraphs.findIndex(p => p.id === para.id)
        if (idx === 0) return
        const prevPara = paragraphs[idx - 1]
        const joinAt = prevPara.text.length
        onMerge(para.id)
        requestAnimationFrame(() => {
          const prevEl = document.querySelector(`[data-para-id="${prevPara.id}"] [data-editable]`)
          if (prevEl) { prevEl.focus(); setCursorAt(prevEl, joinAt) }
        })
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (!text) return
    document.execCommand('insertText', false, text)
  }

  const hasComments     = para.comments?.length > 0
  const hasSuggestions  = para.claudeSuggestions?.length > 0
  const hasOrigin       = para.claudeOrigin === true
  const hasGutterContent = hasComments || hasSuggestions || hasOrigin
  const hasRipple       = para.ripple && rippleEnabled
  const isRippleHovered = hoveredRipple === para.id
  const activeComment   = para.comments?.find(c => c.id === activeCommentId) ?? null
  const activeHighlight = activeComment?.selectedText || null

  if (para.type === 'title') {
    return (
      <motion.div
        data-para-id={para.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: Math.min(index * 0.04, 0.3) }}
        className="mb-10 mt-2"
        onClick={onSelect}
      >
        <div className="relative">
          <h1
            ref={editRef}
            data-editable
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => { isComposing.current = true }}
            onCompositionEnd={e => { isComposing.current = false; handleInput(e) }}
            className="text-3xl font-bold leading-tight tracking-tight outline-none"
            style={{ caretColor: GOLD, color: (showMarkup || activeHighlight) ? 'transparent' : 'var(--p-text-primary)' }}
          />
          {(showMarkup || activeHighlight) && (
            <h1 className="absolute inset-0 text-3xl font-bold leading-tight tracking-tight pointer-events-none select-none" style={{ color: 'var(--p-text-primary)' }}>
              {activeHighlight
                ? <HighlightedText text={para.text} highlight={activeHighlight} />
                : <DiffText baseline={para.baseline} text={para.text} />}
            </h1>
          )}
        </div>
      </motion.div>
    )
  }

  if (para.type === 'heading') {
    return (
      <motion.div
        data-para-id={para.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: Math.min(index * 0.04, 0.3) }}
        className="mb-8 mt-4"
        onClick={onSelect}
      >
        <div className="relative">
          <h1
            ref={editRef}
            data-editable
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => { isComposing.current = true }}
            onCompositionEnd={e => { isComposing.current = false; handleInput(e) }}
            className="text-2xl font-semibold leading-tight tracking-tight outline-none"
            style={{ caretColor: GOLD, color: (showMarkup || activeHighlight) ? 'transparent' : 'var(--p-text-primary)' }}
          />
          {(showMarkup || activeHighlight) && (
            <h1 className="absolute inset-0 text-2xl font-semibold leading-tight tracking-tight pointer-events-none select-none" style={{ color: 'var(--p-text-primary)' }}>
              {activeHighlight
                ? <HighlightedText text={para.text} highlight={activeHighlight} />
                : <DiffText baseline={para.baseline} text={para.text} />}
            </h1>
          )}
        </div>
      </motion.div>
    )
  }

  if (para.type === 'heading2') {
    return (
      <motion.div
        data-para-id={para.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: Math.min(index * 0.04, 0.3) }}
        className="mb-6 mt-3"
        onClick={onSelect}
      >
        <div className="relative">
          <h2
            ref={editRef}
            data-editable
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => { isComposing.current = true }}
            onCompositionEnd={e => { isComposing.current = false; handleInput(e) }}
            className="text-xl font-semibold leading-tight outline-none"
            style={{ caretColor: GOLD, color: (showMarkup || activeHighlight) ? 'transparent' : 'var(--p-text-primary)' }}
          />
          {(showMarkup || activeHighlight) && (
            <h2 className="absolute inset-0 text-xl font-semibold leading-tight pointer-events-none select-none" style={{ color: 'var(--p-text-primary)' }}>
              {activeHighlight
                ? <HighlightedText text={para.text} highlight={activeHighlight} />
                : <DiffText baseline={para.baseline} text={para.text} />}
            </h2>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      data-para-id={para.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_GENTLE, delay: Math.min(index * 0.04, 0.3) }}
      className="relative group mb-6"
      onClick={() => { onClearActiveComment(); if (!addingComment && editRef.current) editRef.current.focus() }}
    >
      <div className="flex">
        <div style={{ width: showMarkup && hasGutterContent ? '65%' : '100%' }} className="flex-shrink-0 transition-all duration-200">
          <div
            className={`relative transition-colors duration-200 rounded-lg px-2 py-1 -mx-2 ${
              isRippleHovered ? 'ring-1 ring-[#E5A620]/40 bg-[#E5A620]/[0.03]' : ''
            }`}
            style={{
              ...(selected && !isRippleHovered ? { backgroundColor: 'rgba(184,160,112,0.05)' } : {}),
              ...(hasOrigin ? { borderLeft: `2px solid ${SUGGESTION}50`, paddingLeft: '10px', backgroundColor: `${SUGGESTION}05` } : {}),
            }}
          >
            <div className="relative">
              <div
                ref={editRef}
                data-editable
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onCompositionStart={() => { isComposing.current = true }}
                onCompositionEnd={e => { isComposing.current = false; handleInput(e) }}
                className={`text-base leading-[1.85] outline-none w-full${para.type === 'quote' ? ' italic pl-4 border-l-2' : ''}`}
                style={{
                  caretColor: GOLD,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '1.85em',
                  color: (showMarkup || activeHighlight)
                    ? 'transparent'
                    : (para.type === 'quote' ? 'var(--p-text-secondary)' : 'var(--p-text-primary)'),
                  ...(para.type === 'quote' ? { borderLeftColor: `${GOLD}50` } : {}),
                }}
              />
              {(showMarkup || activeHighlight) && (
                <p
                  className={`absolute inset-0 text-base leading-[1.85] pointer-events-none select-none${para.type === 'quote' ? ' italic pl-4 border-l-2' : ''}`}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    minHeight: '1.85em',
                    color: para.type === 'quote' ? 'var(--p-text-secondary)' : 'var(--p-text-primary)',
                    ...(para.type === 'quote' ? { borderLeftColor: `${GOLD}50` } : {}),
                  }}
                >
                  {activeHighlight
                    ? <HighlightedText text={para.text} highlight={activeHighlight} />
                    : <DiffText baseline={para.baseline} text={para.text} />}
                </p>
              )}
              {!para.text && placeholder && !slashOpen && (
                <div
                  className="absolute inset-0 text-base leading-[1.85] pointer-events-none select-none"
                  style={{ color: 'var(--p-text-muted)', fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  {placeholder}
                </div>
              )}
              {slashOpen && (() => {
                const filtered = SLASH_OPTIONS.filter(opt =>
                  opt.label.toLowerCase().includes(slashFilter) || opt.id.includes(slashFilter),
                )
                if (!filtered.length) return null
                return (
                  <div
                    className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#E9E9E7] shadow-md py-1 w-52"
                    style={{ zIndex: 50, fontFamily: 'system-ui, sans-serif' }}
                    onMouseDown={e => e.preventDefault()}
                  >
                    {filtered.map((opt, i) => (
                      <div
                        key={opt.id}
                        className="px-3 py-2 cursor-pointer transition-colors"
                        style={{ backgroundColor: i === slashIndex ? `${GOLD}18` : 'transparent' }}
                        onMouseEnter={() => setSlashIndex(i)}
                        onClick={() => {
                          if (onTypeChange) onTypeChange(para.id, opt.type)
                          onTextChange(para.id, '')
                          setSlashOpen(false)
                          skipNextSync.current = false
                        }}
                      >
                        <div className="text-[12px] font-medium text-[#1E2532]">{opt.label}</div>
                        <div className="text-[10px] text-[#6B7C93]">{opt.description}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {showMarkup && hasSuggestions && (
              <div className="mt-2 space-y-2">
                {para.claudeSuggestions.map(sugg => (
                  <div key={sugg.id} className="pl-3 border-l-2 py-0.5" style={{ borderColor: `${SUGGESTION}40` }}>
                    <p className="text-[10px] font-semibold mb-0.5" style={{ color: SUGGESTION, fontFamily: 'system-ui, sans-serif' }}>
                      Suggested edit
                    </p>
                    <p className="text-base leading-[1.85]">
                      <ClaudeInlineSuggestionPreview text={para.text} suggestion={sugg} />
                    </p>
                  </div>
                ))}
              </div>
            )}

            {showMarkup && hasOrigin && (
              <div className="mt-1 flex items-center gap-1.5" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <Sparkles className="w-3 h-3" style={{ color: SUGGESTION }} />
                <span className="text-[10px] font-medium" style={{ color: SUGGESTION }}>Added by Claude</span>
              </div>
            )}

            {para.claudeNote && showMarkup && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg border"
                style={{ backgroundColor: `${SUGGESTION}08`, borderColor: `${SUGGESTION}20` }}
              >
                <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: SUGGESTION }} />
                <span className="text-[11px] text-[#4A5568] leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {para.claudeNote}
                </span>
              </motion.div>
            )}

            {hasRipple && showMarkup && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onMouseEnter={() => onHoverRipple(para.id)}
                onMouseLeave={() => onHoverRipple(null)}
                className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                style={{
                  backgroundColor: para.ripple.type === 'contradiction' ? `${RIPPLE_WARN}0D` : `${RIPPLE_OPP}0A`,
                  borderColor: para.ripple.type === 'contradiction' ? `${RIPPLE_WARN}30` : `${RIPPLE_OPP}25`,
                }}
              >
                {para.ripple.type === 'contradiction'
                  ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: RIPPLE_WARN }} />
                  : <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: RIPPLE_OPP }} />}
                <span className="text-[11px] text-[#4A5568] leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {para.ripple.summary}
                </span>
              </motion.div>
            )}

            <AnimatePresence>
              {addingComment && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 mt-3"
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Add a comment…"
                    value={newCommentText}
                    onChange={e => onCommentTextChange(e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') { e.preventDefault(); onAddComment(para.id) }
                      if (e.key === 'Escape') onCancelComment()
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#FFF9E6] border border-[#E5D9A8] rounded-lg focus:outline-none focus:border-[#B8A070] transition-colors text-[#1E2532]"
                  />
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => onAddComment(para.id)} className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg text-white flex-shrink-0" style={{ backgroundColor: GOLD }}>
                    Add
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={onCancelComment} className="px-2 py-1.5 text-[11px] text-[#6B7C93] hover:bg-[#F5F5F5] rounded-lg transition-colors flex-shrink-0">
                    Cancel
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {showMarkup && hasGutterContent && (
          <div style={{ width: '35%' }} className="flex-shrink-0 pl-6 relative">
            <div className="absolute left-0 top-3 w-6 h-px bg-[#EBEBEB]" />
            <div className="space-y-2">
              {hasOrigin && (
                <ClaudeOriginCard
                  onAccept={() => onAcceptOrigin(para.id)}
                  onReject={() => onRejectOrigin(para.id)}
                />
              )}
              {hasSuggestions && para.claudeSuggestions.map(sugg => (
                <ClaudeSuggestionCard
                  key={sugg.id}
                  suggestion={sugg}
                  onAccept={() => onAcceptSuggestion(para.id, sugg.id)}
                  onReject={() => onRejectSuggestion(para.id, sugg.id)}
                />
              ))}
              {para.comments?.map(comment => (
                <MarginComment
                  key={comment.id}
                  comment={comment}
                  expanded={expandedComments.has(comment.id)}
                  isActive={activeCommentId === comment.id}
                  onToggle={() => onToggleComment(comment.id)}
                  onActivate={() => onSetActiveComment(comment.id)}
                  onDelete={onDeleteComment ? () => onDeleteComment(para.id, comment.id) : undefined}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyInput={replyInputs[comment.id] || ''}
                  onReplyChange={v => setReplyInputs(prev => ({ ...prev, [comment.id]: v }))}
                  submittedReplies={submittedReplies[comment.id] || []}
                  onSubmitReply={() => onSubmitReply(comment.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
