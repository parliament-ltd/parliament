// DocumentCanvas — render component for document-canvas@1.0.
//
// Owns the paper / contentEditable surface, the in-document toolbar
// (Markup toggle, Accept All, Clear All, Export, Submit Edits),
// the floating selection→Add-Comment tooltip, the Submit & Branch
// confirmation modal, and the Markup-mode inline gutter.
//
// All persistent state lives in DocumentContext; this component is
// a controlled view that calls into the context's mutators.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Eye, EyeOff, CheckCheck, Eraser, Download,
  ChevronDown, GitBranch, Bell,
} from 'lucide-react'
import { SPRING_SMOOTH, SPRING_GENTLE } from '../../lib/constants'
import { wordDiff } from './sbrd/diff'
import DocumentParagraph from './sbrd/DocumentParagraph'
import { useDocument } from '../../stores/DocumentContext'

const GOLD = '#B8A070'
const DELETION = '#EF4444'
const INSERTION = '#4A7AE5'
const SUGGESTION = '#22C55E'
const RIPPLE_WARN = '#E5A620'

function ToolButton({ icon: Icon, label, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      title={label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors text-[#6B7C93] hover:text-[#1E2532]"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden xl:inline">{label}</span>
    </motion.button>
  )
}

function SummaryRow({ icon: Icon, label, count, color, suffix }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span className="text-[11px] text-[#4A5568] flex-1">{label}</span>
      {count != null && <span className="text-[11px] font-semibold" style={{ color }}>{count}</span>}
      {suffix && <span className="text-[10px] text-[#6B7C93]">{suffix}</span>}
    </div>
  )
}

export default function DocumentCanvas() {
  const {
    paragraphs,
    counts,
    showMarkup, setShowMarkup,
    rippleEnabled,
    selectedParagraph, setSelectedParagraph,
    expandedComments,
    activeCommentId, setActiveCommentId,
    hoveredRipple, setHoveredRipple,
    replyingTo, setReplyingTo,
    replyInputs, setReplyInputs,
    submittedReplies,
    addingCommentToParaId, setAddingCommentToParaId,
    newCommentText, setNewCommentText,
    selectionInfo, setSelectionInfo,
    submitting, showSubmitConfirm, setShowSubmitConfirm,
    toast, conversationTitle,
    updateParagraphText, splitParagraph, mergeParagraph, setParagraphType,
    toggleExpandedComment, submitReply, addComment, deleteComment,
    acceptSuggestion, rejectSuggestion, acceptOrigin, rejectOrigin,
    acceptAll, clearAll, submitAndBranch,
  } = useDocument()

  const canvasRef = useRef(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)
  const showMarkupRef = useRef(showMarkup)
  useEffect(() => { showMarkupRef.current = showMarkup }, [showMarkup])

  // ── Selection → comment tooltip ───────────────────────────────────
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          setSelectionInfo(null)
          return
        }
        const selectedText = sel.toString().trim()
        let node = sel.anchorNode?.nodeType === Node.TEXT_NODE
          ? sel.anchorNode.parentElement
          : sel.anchorNode
        while (node) {
          if (node.dataset?.paraId) break
          node = node.parentElement
        }
        if (!node?.dataset?.paraId || node.dataset.paraId === 'empty') {
          setSelectionInfo(null)
          return
        }
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setSelectionInfo({ paraId: node.dataset.paraId, selectedText, rect })
      }, 10)
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [setSelectionInfo])

  // ── Ctrl+Alt+M — open comment for current selection ─────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.code === 'KeyM') {
        e.preventDefault()
        const sel = window.getSelection()
        const selectedText = sel?.toString()?.trim()
        if (!selectedText) return
        let node = sel.anchorNode?.nodeType === Node.TEXT_NODE
          ? sel.anchorNode.parentElement
          : sel.anchorNode
        while (node) {
          if (node.dataset?.paraId) break
          node = node.parentElement
        }
        const paraId = node?.dataset?.paraId
        if (!paraId) return
        setSelectionInfo({ paraId, selectedText, rect: sel.getRangeAt(0).getBoundingClientRect() })
        setAddingCommentToParaId(paraId)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setSelectionInfo, setAddingCommentToParaId])

  // ── Prevent canvas scroll-hijack in edit mode ────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onKeyDown = (e) => {
      if (showMarkupRef.current) return
      if (e.target?.contentEditable === 'true') return
      if (e.key === ' ' || e.key === 'PageDown' || e.key === 'PageUp') {
        e.preventDefault()
        const editables = canvas.querySelectorAll('[data-editable]')
        const el = editables[editables.length - 1]
        if (el) {
          el.focus()
          if (e.key === ' ') document.execCommand('insertText', false, ' ')
        }
      }
    }
    canvas.addEventListener('keydown', onKeyDown, true)
    return () => canvas.removeEventListener('keydown', onKeyDown, true)
  }, [])

  // ── Close export menu on outside click ────────────────────────────
  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  // ── Export handlers ───────────────────────────────────────────────
  const handleCopyCleanText = () => {
    const text = paragraphs.map(p => {
      if (p.type === 'title')    return p.text
      if (p.type === 'heading')  return `# ${p.text}`
      if (p.type === 'heading2') return `## ${p.text}`
      if (p.type === 'quote')    return `> ${p.text}`
      return p.text
    }).join('\n\n')
    navigator.clipboard.writeText(text).catch(() => {})
    setShowExportMenu(false)
  }

  const handleExportWithMarkup = () => {
    const lines = []
    for (const p of paragraphs) {
      const prefix = p.type === 'heading' ? '# '
        : p.type === 'heading2' ? '## '
        : p.type === 'quote' ? '> '
        : ''
      let content = p.text
      if (p.text !== p.baseline) {
        const parts = wordDiff(p.baseline, p.text)
        content = parts.map(part => {
          if (part.type === 'deleted')  return `~~${part.text}~~`
          if (part.type === 'inserted') return `**${part.text}**`
          return part.text
        }).join('')
      }
      lines.push(prefix + content)
      for (const c of p.comments || []) {
        lines.push('')
        lines.push(`> **Comment:** ${c.text}`)
        if (c.claudeReply) lines.push(`> *Claude: ${c.claudeReply.text}*`)
      }
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${conversationTitle || 'document'}.md`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }


  return (
    <div
      className="relative h-full flex flex-col text-[#1E2532] overflow-hidden"
      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
    >
      {/* ═══ TOOLBAR ═══════════════════════════════════════════════ */}
      <div
        className="sbrd-toolbar flex items-center justify-between px-4 h-12 border-b border-[#F0F0F0] bg-white flex-shrink-0"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#1E2532]">Document</span>
          <div className="h-4 w-px bg-[#EBEBEB]" />
          <span className="text-xs text-[#6B7C93]">
            {paragraphs.length} paragraph{paragraphs.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-[#F5F5F5]">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-[#9B9A97]"
            title="Highlight text then press Ctrl+Alt+M to add a comment"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comment</span>
            <span className="text-[10px] text-[#C0C8D4] ml-0.5">Ctrl+Alt+M</span>
          </div>
          <div className="h-4 w-px bg-[#EBEBEB] mx-1" />
          <ToolButton icon={CheckCheck} label="Accept All" onClick={acceptAll} />
          <div className="h-4 w-px bg-[#EBEBEB] mx-1" />
          <ToolButton icon={Eraser} label="Clear All" onClick={clearAll} />
          <div className="h-4 w-px bg-[#EBEBEB] mx-1" />
          <div className="relative" ref={exportMenuRef}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-[#6B7C93] hover:text-[#1E2532] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Export</span>
              <ChevronDown className="w-3 h-3" />
            </motion.button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#E9E9E7] shadow-lg z-50 py-1 w-48"
                >
                  <button onClick={handleCopyCleanText} className="w-full text-left px-3 py-2 text-xs text-[#1E2532] hover:bg-[#F5F5F5] transition-colors">
                    Copy Clean Text
                  </button>
                  <button onClick={handleExportWithMarkup} className="w-full text-left px-3 py-2 text-xs text-[#1E2532] hover:bg-[#F5F5F5] transition-colors">
                    Export with Markup
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMarkup(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={showMarkup ? { backgroundColor: 'rgba(184,160,112,0.1)', color: GOLD } : { color: '#6B7C93' }}
            title={showMarkup ? 'Hide tracked changes' : 'Show tracked changes'}
          >
            {showMarkup ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Markup
          </motion.button>

          <div className="h-4 w-px bg-[#EBEBEB]" />

          <motion.button
            whileHover={counts.hasSubmittableChanges && !submitting ? { scale: 1.02 } : {}}
            whileTap={counts.hasSubmittableChanges && !submitting ? { scale: 0.97 } : {}}
            onClick={() => counts.hasSubmittableChanges && !submitting && setShowSubmitConfirm(true)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              counts.hasSubmittableChanges ? 'text-white shadow-sm' : 'sbrd-btn-idle cursor-not-allowed'
            }`}
            style={counts.hasSubmittableChanges ? { backgroundColor: GOLD, border: `1px solid ${GOLD}` } : {}}
          >
            <Send className="w-3.5 h-3.5" />
            Submit Edits
          </motion.button>
        </div>
      </div>

      {/* ═══ FLOATING COMMENT TOOLTIP ══════════════════════════════ */}
      <AnimatePresence>
        {selectionInfo && !addingCommentToParaId && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed',
              top: selectionInfo.rect.top - 40,
              left: selectionInfo.rect.left + selectionInfo.rect.width / 2 - 72,
              zIndex: 60,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                setAddingCommentToParaId(selectionInfo.paraId)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white shadow-lg whitespace-nowrap"
              style={{ backgroundColor: GOLD }}
            >
              <MessageSquare className="w-3 h-3" />
              Add comment
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ DOCUMENT CANVAS ═══════════════════════════════════════ */}
      <div ref={canvasRef} data-tour="sbrd-canvas" className="flex-1 overflow-y-auto sbrd-canvas">
        <div
          className="sbrd-paper mx-auto px-8 py-10 min-h-full bg-white"
          style={{ maxWidth: '860px', marginTop: '16px', marginBottom: '16px', borderRadius: '2px' }}
          onClick={(e) => {
            if (!showMarkup && e.target === e.currentTarget && paragraphs.length > 0) {
              const lastId = paragraphs[paragraphs.length - 1].id
              const el = document.querySelector(`[data-para-id="${lastId}"] [data-editable]`)
              if (el) {
                el.focus()
                const r = document.createRange()
                r.selectNodeContents(el)
                r.collapse(false)
                window.getSelection().removeAllRanges()
                window.getSelection().addRange(r)
              }
            }
          }}
        >
          {showMarkup && (
            <div className="flex mb-6 pb-2 border-b border-[#F0F0F0]" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ width: '65%' }}>
                <span className="text-[10px] font-semibold text-[#D5D5D5] uppercase tracking-wider">Document</span>
              </div>
              <div style={{ width: '35%' }} className="pl-6">
                <span className="text-[10px] font-semibold text-[#D5D5D5] uppercase tracking-wider">Comments</span>
              </div>
            </div>
          )}

          {paragraphs.map((para, index) => (
            <DocumentParagraph
              key={para.id}
              para={para}
              index={index}
              showMarkup={showMarkup}
              selected={selectedParagraph === para.id}
              placeholder={index === 0 ? 'Start writing here…' : undefined}
              paragraphs={paragraphs}
              addingComment={addingCommentToParaId === para.id}
              newCommentText={newCommentText}
              expandedComments={expandedComments}
              activeCommentId={activeCommentId}
              hoveredRipple={hoveredRipple}
              rippleEnabled={rippleEnabled}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyInputs={replyInputs}
              setReplyInputs={setReplyInputs}
              submittedReplies={submittedReplies}
              onSelect={() => setSelectedParagraph(para.id === selectedParagraph ? null : para.id)}
              onTextChange={updateParagraphText}
              onSplit={splitParagraph}
              onMerge={mergeParagraph}
              onTypeChange={setParagraphType}
              onCommentTextChange={setNewCommentText}
              onAddComment={addComment}
              onCancelComment={() => {
                setAddingCommentToParaId(null)
                setNewCommentText('')
                setSelectionInfo(null)
              }}
              onStartAddComment={() => setAddingCommentToParaId(para.id)}
              onSetActiveComment={(id) => setActiveCommentId(prev => prev === id ? null : id)}
              onClearActiveComment={() => setActiveCommentId(null)}
              onToggleComment={toggleExpandedComment}
              onDeleteComment={deleteComment}
              onHoverRipple={setHoveredRipple}
              onSubmitReply={submitReply}
              onAcceptSuggestion={acceptSuggestion}
              onRejectSuggestion={rejectSuggestion}
              onAcceptOrigin={acceptOrigin}
              onRejectOrigin={rejectOrigin}
            />
          ))}
        </div>
      </div>

      {/* ═══ SUBMIT CONFIRMATION MODAL ═════════════════════════════ */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            onClick={() => !submitting && setShowSubmitConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={SPRING_SMOOTH}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl shadow-black/10 border border-[#E9E9E7] p-6 w-[420px]"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {submitting ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: GOLD, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#1E2532]">Sending to Claude…</p>
                    <p className="text-xs text-[#6B7C93] mt-1">
                      {counts.pendingComments > 0
                        ? 'Claude is reviewing your comments and edits.'
                        : 'Claude is reviewing your edits.'}
                      {rippleEnabled ? ' Impact analysis running.' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(184,160,112,0.1)' }}>
                      <Send className="w-5 h-5" style={{ color: GOLD }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E2532]">Submit Edits to Claude</h3>
                      <p className="text-xs text-[#6B7C93] mt-1 leading-relaxed">
                        {counts.pendingComments > 0
                          ? 'Your edits and comments will be sent to Claude for review. A branch will preserve the current version.'
                          : 'Your edits will be sent to Claude. A branch will be created to preserve the current version.'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#F5F5F5] rounded-xl p-4 mb-4 space-y-2">
                    <SummaryRow icon={Eraser} label="Paragraphs changed" count={paragraphs.filter(p => p.text !== p.baseline).length} color={INSERTION} />
                    <SummaryRow icon={MessageSquare} label="Comments" count={counts.pendingComments} color={GOLD} />
                    {rippleEnabled && (
                      <SummaryRow icon={Bell} label="Ripple impact analysis" count={null} color={RIPPLE_WARN} suffix="will run" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ backgroundColor: 'rgba(184,160,112,0.08)' }}>
                    <GitBranch className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
                    <span className="text-[11px] leading-relaxed" style={{ color: GOLD }}>
                      A new branch will be created. You can return to this version anytime.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowSubmitConfirm(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#F5F5F5] rounded-lg transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={submitAndBranch}
                      className="px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm"
                      style={{ backgroundColor: GOLD }}
                    >
                      Submit & Branch
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOAST ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={SPRING_GENTLE}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-medium"
            style={{ backgroundColor: '#1E2532', color: 'white', fontFamily: 'system-ui, sans-serif' }}
          >
            <CheckCheck className="w-3.5 h-3.5" style={{ color: SUGGESTION }} />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
