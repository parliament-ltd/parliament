import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getConversation, getBranches, createConversation,
  getSbrdDocument, saveSbrdDocument,
} from '../../lib/db'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Strikethrough, MessageSquare, Send, GitBranch,
  AlertTriangle, Lightbulb, ChevronDown, Check, X, Eye, EyeOff,
  Bell, BellOff, Eraser, PanelRight,
  Sparkles, PenLine, Type, CornerDownRight, Clock, ArrowRight,
  CheckCheck,
} from 'lucide-react'
import { SPRING_SMOOTH, SPRING_GENTLE } from '../../lib/constants'

/* ─── Animation ──────────────────────────────────────────── */

const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 }
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
}
const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: SPRING_SMOOTH },
}

/* ─── Colors ─────────────────────────────────────────────── */

// Chrome accent — dusty gold (replaces blue for all UI chrome)
const GOLD = '#B8A070'

// Editorial colors — fixed regardless of theme (per design spec)
const DELETION   = '#EF4444'
const INSERTION  = '#4A7AE5'
const SUGGESTION = '#22C55E'
const RIPPLE_WARN = '#E5A620'
const RIPPLE_OPP  = '#4A7AE5'

/* ═══════════════════════════════════════════════════════════ */
/*  ROOT COMPONENT                                             */
/* ═══════════════════════════════════════════════════════════ */

export default function SecretarybirdChatLayout() {
  const navigate = useNavigate()
  const { id } = useParams()

  // ── Persistent document state (loaded from / saved to IndexedDB) ──
  const [paragraphs,       setParagraphs]       = useState([])
  const [suggestionStates, setSuggestionStates] = useState({})
  const [submittedReplies, setSubmittedReplies] = useState({})

  // ── Conversation metadata ──────────────────────────────────────────
  const [conversationTitle, setConversationTitle] = useState('')
  const [branches,          setBranches]          = useState([])
  const [loaded,            setLoaded]            = useState(false)

  // ── Load document + metadata on mount ─────────────────────────────
  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      const [conv, doc, branchList] = await Promise.all([
        getConversation(id),
        getSbrdDocument(id),
        getBranches(id),
      ])
      if (cancelled) return
      setConversationTitle(conv?.title || 'Untitled')
      setBranches(branchList)
      if (doc) {
        if (doc.paragraphs)       setParagraphs(doc.paragraphs)
        if (doc.suggestionStates) setSuggestionStates(doc.suggestionStates)
        if (doc.submittedReplies) setSubmittedReplies(doc.submittedReplies)
      }
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  // ── Auto-save (1 s debounce) ───────────────────────────────────────
  const saveTimerRef = useRef(null)
  useEffect(() => {
    if (!loaded || !id) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveSbrdDocument(id, { paragraphs, suggestionStates, submittedReplies })
    }, 1000)
    return () => clearTimeout(saveTimerRef.current)
  }, [paragraphs, suggestionStates, submittedReplies, loaded, id])

  // ── UI-only state (not persisted) ─────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarTab,       setSidebarTab]       = useState('comments')
  const [activeTool,       setActiveTool]       = useState('select')
  const [showMarkup,       setShowMarkup]       = useState(true)
  const [rippleEnabled,    setRippleEnabled]    = useState(true)
  const [expandedComments,  setExpandedComments]  = useState(new Set())
  const [hoveredRipple,     setHoveredRipple]     = useState(null)
  const [chatInput,         setChatInput]         = useState('')
  const [replyingTo,        setReplyingTo]        = useState(null)
  const [replyInputs,       setReplyInputs]       = useState({})
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  // ── Derived state ──────────────────────────────────────────────────
  const hasEdits = paragraphs.some(p =>
    p.segments?.some(s => s.type === 'deletion' || s.type === 'insertion') ||
    (p.segments?.some(s => s.type === 'suggestion') && !suggestionStates[p.id])
  )

  const contextUsage = 58
  const getContextColor = (u) => u < 50 ? '#22C55E' : u < 80 ? RIPPLE_WARN : DELETION

  // ── Handlers ──────────────────────────────────────────────────────
  const acceptSuggestion = (paraId) =>
    setSuggestionStates(prev => ({ ...prev, [paraId]: 'accepted' }))
  const rejectSuggestion = (paraId) =>
    setSuggestionStates(prev => ({ ...prev, [paraId]: 'rejected' }))

  const updateParagraph = (paraId, newText) => {
    setParagraphs(prev => prev.map(p => {
      if (p.id !== paraId) return p
      if (p.type === 'heading') return { ...p, text: newText }
      return { ...p, segments: [{ type: 'text', content: newText }] }
    }))
  }

  const insertParagraphAfter = (paraId) => {
    const newId = `p${Date.now()}`
    setParagraphs(prev => {
      const idx = prev.findIndex(p => p.id === paraId)
      const at = idx === -1 ? prev.length : idx + 1
      const copy = [...prev]
      copy.splice(at, 0, { id: newId, type: 'paragraph', segments: [{ type: 'text', content: '' }], comments: [] })
      return copy
    })
    // Focus the new paragraph after React renders it
    setTimeout(() => {
      const el = document.querySelector(`[data-para-id="${newId}"]`)
      if (el) {
        el.focus()
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
    }, 30)
  }

  const toggleComment = (commentId) =>
    setExpandedComments(prev => {
      const n = new Set(prev)
      n.has(commentId) ? n.delete(commentId) : n.add(commentId)
      return n
    })

  const submitReply = (commentId) => {
    const text = replyInputs[commentId]?.trim()
    if (!text) return
    setSubmittedReplies(prev => ({
      ...prev,
      [commentId]: [...(prev[commentId] || []), { text }],
    }))
    setReplyInputs(prev => ({ ...prev, [commentId]: '' }))
    setReplyingTo(null)
  }

  const handleSubmitAndBranch = async () => {
    setShowSubmitConfirm(false)
    // Flush any pending auto-save immediately
    clearTimeout(saveTimerRef.current)
    await saveSbrdDocument(id, { paragraphs, suggestionStates, submittedReplies })
    // Create a branch conversation preserving the pre-edit state
    const branch = await createConversation({
      title: `Branch: ${conversationTitle || 'Untitled'}`,
      parentId: id,
    })
    await saveSbrdDocument(branch.id, {
      paragraphs,
      suggestionStates: {},
      submittedReplies: {},
    })
    // Refresh branch list
    const updated = await getBranches(id)
    setBranches(updated)
  }

  const pendingComments    = paragraphs.reduce((a, p) => a + (p.comments?.length || 0), 0)
  const pendingRipples     = paragraphs.filter(p => p.ripple).length
  const pendingSuggestions = paragraphs.filter(
    p => p.segments?.some(s => s.type === 'suggestion') && !suggestionStates[p.id]
  ).length

  // ── Formatted branch list for History tab ─────────────────────────
  const branchCards = [
    {
      id,
      label: conversationTitle || 'Current draft',
      time: 'Now',
      active: true,
      paragraphs: paragraphs.length,
    },
    ...branches.map(b => ({
      id: b.id,
      label: b.title,
      time: new Date(b.createdAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
      active: false,
      paragraphs: null,
    })),
  ]

  return (
    <div
      className="flex h-screen text-[#1E2532] overflow-hidden relative"
      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
    >

      {/* ═══ TOOLBAR ══════════════════════════════════════════ */}
      <div
        className="sbrd-toolbar absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-12 border-b border-[#F0F0F0]"
      >
        {/* Left: back button + mode label + doc info */}
        <div className="flex items-center gap-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')}
            className="p-1.5 rounded transition-colors text-[#B8A070] hover:text-[#1E2532]"
            title="Back to Chats"
          >
            <MessageSquare className="w-4 h-4" />
          </motion.button>
          <div className="h-4 w-px bg-[#EBEBEB]" />
          <span className="text-sm font-semibold text-[#1E2532]">Secretarybird</span>
          <div className="h-4 w-px bg-[#EBEBEB]" />
          <span className="text-xs text-[#6B7C93]">{conversationTitle}{conversationTitle ? ' — ' : ''}{paragraphs.length} paragraphs</span>
        </div>

        {/* Center: marking tool selector */}
        <div
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-[#F5F5F5]"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <ToolButton icon={Type}         label="Select"    active={activeTool === 'select'}        onClick={() => setActiveTool('select')} />
          <ToolButton icon={Strikethrough} label="Delete"   active={activeTool === 'strikethrough'} onClick={() => setActiveTool('strikethrough')} activeColor={DELETION} />
          <ToolButton icon={PenLine}       label="Insert"   active={activeTool === 'insert'}        onClick={() => setActiveTool('insert')}        activeColor={INSERTION} />
          <ToolButton icon={MessageSquare} label="Comment"  active={activeTool === 'comment'}       onClick={() => setActiveTool('comment')} />
          <div className="h-4 w-px bg-[#EBEBEB] mx-1" />
          <ToolButton icon={Eraser}        label="Clear All" onClick={() => {}} />
        </div>

        {/* Right: toggles + context + submit */}
        <div className="flex items-center gap-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
          {/* Markup toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMarkup(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              showMarkup
                ? 'text-[#B8A070]'
                : 'text-[#6B7C93] hover:bg-[#F5F5F5]'
            }`}
            style={showMarkup ? { backgroundColor: 'rgba(184,160,112,0.1)' } : {}}
          >
            {showMarkup ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Markup
          </motion.button>

          {/* Ripple toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setRippleEnabled(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              rippleEnabled
                ? 'bg-[#E5A620]/10 text-[#E5A620]'
                : 'text-[#6B7C93] hover:bg-[#F5F5F5]'
            }`}
          >
            {rippleEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            Ripple
          </motion.button>

          <div className="h-4 w-px bg-[#EBEBEB]" />

          {/* Context health bar */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${contextUsage}%` }}
                transition={SPRING_GENTLE}
                className="h-full rounded-full"
                style={{ backgroundColor: getContextColor(contextUsage) }}
              />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: getContextColor(contextUsage) }}>
              {contextUsage}%
            </span>
          </div>

          <div className="h-4 w-px bg-[#EBEBEB]" />

          {/* Submit button */}
          <motion.button
            whileHover={hasEdits ? { scale: 1.02 } : {}}
            whileTap={hasEdits ? { scale: 0.97 } : {}}
            onClick={() => hasEdits && setShowSubmitConfirm(true)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              hasEdits
                ? 'text-white shadow-sm'
                : 'bg-[#F5F5F5] text-[#6B7C93] cursor-not-allowed'
            }`}
            style={hasEdits ? { backgroundColor: GOLD } : {}}
          >
            <Send className="w-3.5 h-3.5" />
            Submit Edits
          </motion.button>
        </div>
      </div>

      {/* ═══ DOCUMENT CANVAS ══════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto pt-12 sbrd-canvas">
        <div
          className="sbrd-paper mx-auto px-8 py-10 min-h-full bg-white"
          style={{
            maxWidth: '1100px',
            marginTop: '16px',
            marginBottom: '16px',
            borderRadius: '2px',
          }}
        >
          {/* Column headers — visible only when markup is on */}
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

          {paragraphs.length === 0 ? (
            <div
              data-para-id="empty"
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const text = e.currentTarget.textContent.trim()
                  if (text) {
                    setParagraphs([{ id: `p${Date.now()}`, type: 'paragraph', segments: [{ type: 'text', content: text }], comments: [] }])
                  }
                }
              }}
              onBlur={(e) => {
                const text = e.currentTarget.textContent.trim()
                if (text) {
                  setParagraphs([{ id: `p${Date.now()}`, type: 'paragraph', segments: [{ type: 'text', content: text }], comments: [] }])
                }
              }}
              className="text-base leading-[1.85] text-[#9B9A97] outline-none cursor-text"
              style={{ minHeight: '1.85em' }}
            >
            </div>
          ) : paragraphs.map((para, index) => (
            <DocumentParagraph
              key={para.id}
              para={para}
              index={index}
              showMarkup={showMarkup}
              suggestionState={suggestionStates[para.id]}
              onAcceptSuggestion={() => acceptSuggestion(para.id)}
              onRejectSuggestion={() => rejectSuggestion(para.id)}
              expandedComments={expandedComments}
              onToggleComment={toggleComment}
              hoveredRipple={hoveredRipple}
              onHoverRipple={setHoveredRipple}
              rippleEnabled={rippleEnabled}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyInputs={replyInputs}
              setReplyInputs={setReplyInputs}
              submittedReplies={submittedReplies}
              onSubmitReply={submitReply}
              onUpdateParagraph={updateParagraph}
              onInsertAfter={insertParagraphAfter}
            />
          ))}
        </div>
      </div>

      {/* ═══ RIGHT SIDEBAR ════════════════════════════════════ */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? 48 : 320 }}
        transition={SIDEBAR_RESIZE}
        className="flex flex-col flex-shrink-0 pt-12 overflow-hidden bg-white border-l border-[#F0F0F0]"
      >
        {sidebarCollapsed ? (
          /* Collapsed icon strip */
          <div className="flex flex-col items-center pt-3 gap-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 rounded-lg hover:bg-[#F5F5F5] transition-colors"
              style={{ color: GOLD }}
              title="Expand sidebar"
            >
              <PanelRight className="w-4 h-4" />
            </motion.button>
            <SidebarIconButton
              icon={MessageSquare}
              count={pendingComments}
              active={sidebarTab === 'comments'}
              onClick={() => { setSidebarCollapsed(false); setSidebarTab('comments') }}
            />
            <SidebarIconButton
              icon={Bell}
              count={pendingRipples}
              badgeColor={RIPPLE_WARN}
              active={sidebarTab === 'ripple'}
              onClick={() => { setSidebarCollapsed(false); setSidebarTab('ripple') }}
            />
            <SidebarIconButton
              icon={GitBranch}
              active={sidebarTab === 'branches'}
              onClick={() => { setSidebarCollapsed(false); setSidebarTab('branches') }}
            />
            <SidebarIconButton
              icon={Sparkles}
              active={sidebarTab === 'chat'}
              onClick={() => { setSidebarCollapsed(false); setSidebarTab('chat') }}
            />
          </div>
        ) : (
          /* Expanded sidebar */
          <div className="flex flex-col h-full" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Tab bar */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#F0F0F0]">
              <div className="flex items-center gap-0.5">
                {[
                  { id: 'comments', icon: MessageSquare, count: pendingComments, title: 'Comments' },
                  { id: 'ripple',   icon: Bell,          count: pendingRipples,  title: 'Ripple', badgeColor: RIPPLE_WARN },
                  { id: 'branches', icon: GitBranch,     title: 'Version History' },
                  { id: 'chat',     icon: Sparkles,      title: 'Chat with Claude' },
                ].map(tab => (
                  <motion.button
                    key={tab.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSidebarTab(tab.id)}
                    title={tab.title}
                    className={`relative p-2 rounded-lg transition-colors ${
                      sidebarTab === tab.id
                        ? 'text-[#B8A070]'
                        : 'text-[#6B7C93] hover:bg-[#F5F5F5]'
                    }`}
                    style={sidebarTab === tab.id ? { backgroundColor: 'rgba(184,160,112,0.1)' } : {}}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.count > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-white px-1 py-0 rounded-full min-w-[14px] text-center"
                        style={{ backgroundColor: tab.badgeColor || GOLD }}
                      >
                        {tab.count}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 rounded hover:bg-[#F5F5F5] text-[#6B7C93] hover:text-[#1E2532] transition-colors"
                title="Collapse sidebar"
              >
                <PanelRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {sidebarTab === 'comments' && (
                  <motion.div
                    key="comments"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={SPRING_SMOOTH}
                    className="p-4 space-y-3"
                    variants={staggerContainer}
                  >
                    <SidebarSectionLabel label="Active Comments" count={pendingComments} />
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                      {paragraphs.filter(p => p.comments?.length > 0).flatMap(para =>
                        para.comments.map(comment => (
                          <CommentCard
                            key={comment.id}
                            comment={comment}
                            expanded={expandedComments.has(comment.id)}
                            onToggle={() => toggleComment(comment.id)}
                            onJump={() => setSelectedParagraph(para.id)}
                            replyingTo={replyingTo}
                            setReplyingTo={setReplyingTo}
                            replyInput={replyInputs[comment.id] || ''}
                            onReplyChange={(v) => setReplyInputs(prev => ({ ...prev, [comment.id]: v }))}
                            submittedReplies={submittedReplies[comment.id] || []}
                            onSubmitReply={() => submitReply(comment.id)}
                          />
                        ))
                      )}
                      {paragraphs.filter(p => p.claudeNote).map(para => (
                        <ClaudeNoteCard
                          key={`note-${para.id}`}
                          note={para.claudeNote}
                          onJump={() => setSelectedParagraph(para.id)}
                        />
                      ))}
                    </motion.div>
                  </motion.div>
                )}

                {sidebarTab === 'ripple' && (
                  <motion.div
                    key="ripple"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={SPRING_SMOOTH}
                    className="p-4 space-y-3"
                  >
                    <SidebarSectionLabel label="Impact Analysis" count={pendingRipples} />
                    {!rippleEnabled && (
                      <p className="px-3 py-2.5 bg-[#F5F5F5] rounded-lg text-[11px] text-[#6B7C93] leading-relaxed">
                        Ripple is off. Enable it in the toolbar to detect cross-section impacts when you submit edits.
                      </p>
                    )}
                    {rippleEnabled && (
                      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                        {paragraphs.filter(p => p.ripple).map(para => (
                          <RippleCard
                            key={`ripple-${para.id}`}
                            ripple={para.ripple}
                            onJump={() => setSelectedParagraph(para.id)}
                            onHover={() => setHoveredRipple(para.id)}
                            onLeave={() => setHoveredRipple(null)}
                          />
                        ))}
                        {pendingRipples === 0 && (
                          <div className="px-3 py-6 text-center">
                            <CheckCheck className="w-6 h-6 mx-auto mb-2" style={{ color: SUGGESTION }} />
                            <p className="text-xs text-[#6B7C93]">No impacts detected</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {sidebarTab === 'branches' && (
                  <motion.div
                    key="branches"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={SPRING_SMOOTH}
                    className="p-4 space-y-3"
                  >
                    <SidebarSectionLabel label="Version History" />
                    <p className="text-[11px] text-[#6B7C93] leading-relaxed">
                      Each submission creates a branch. Navigate back to any previous version — nothing is lost.
                    </p>
                    <div className="space-y-0.5">
                      {branchCards.map((branch, i) => (
                        <BranchCard key={branch.id} branch={branch} isLast={i === branchCards.length - 1} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {sidebarTab === 'chat' && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={SPRING_SMOOTH}
                    className="flex flex-col h-full"
                    style={{ minHeight: 'calc(100vh - 96px)' }}
                  >
                    <div className="flex-1 p-4 space-y-3">
                      <SidebarSectionLabel label="Chat with Claude" />
                      <div className="px-3 py-2.5 bg-[#F5F5F5] rounded-xl rounded-bl-md text-[11px] text-[#4A5568] leading-relaxed">
                        I've made some suggestions based on your edits. The atmosphere changes are looking strong — the "bruised twilight" and personified gas station details create a much more unsettling tone. Want me to continue this style into the remaining paragraphs?
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <ChatShortcut label="Continue style" />
                        <ChatShortcut label="Review all changes" />
                        <ChatShortcut label="Check consistency" />
                      </div>
                    </div>
                    <div className="p-3 border-t border-[#F0F0F0]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ask Claude about your draft..."
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          className="flex-1 px-3 py-2 bg-[#F5F5F5] border border-[#EBEBEB] rounded-lg text-xs focus:outline-none transition-colors text-[#1E2532]"
                          style={{ fontFamily: 'system-ui, sans-serif' }}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 rounded-lg text-white transition-colors"
                          style={{ backgroundColor: GOLD }}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══ SUBMIT CONFIRMATION MODAL ════════════════════════ */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            onClick={() => setShowSubmitConfirm(false)}
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
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(184,160,112,0.1)' }}>
                  <Send className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1E2532]">Submit Edits to Claude</h3>
                  <p className="text-xs text-[#6B7C93] mt-1 leading-relaxed">
                    Your markups and comments will be sent to Claude for processing. A branch will be created to preserve the current version.
                  </p>
                </div>
              </div>

              {/* Edit summary */}
              <div className="bg-[#F5F5F5] rounded-xl p-4 mb-4 space-y-2">
                <SummaryRow icon={Strikethrough}  label="Deletions"          count={3}                color={DELETION} />
                <SummaryRow icon={PenLine}         label="Insertions"         count={2}                color={INSERTION} />
                <SummaryRow icon={MessageSquare}   label="Comments"           count={pendingComments}  color={GOLD} />
                {pendingSuggestions > 0 && (
                  <SummaryRow icon={Sparkles}      label="Pending suggestions" count={pendingSuggestions} color={SUGGESTION} />
                )}
                {rippleEnabled && (
                  <SummaryRow icon={Bell}          label="Ripple analysis"    count={null} color={RIPPLE_WARN} suffix="will run after" />
                )}
              </div>

              {/* Branch notice */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                style={{ backgroundColor: 'rgba(184,160,112,0.08)' }}
              >
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
                  onClick={handleSubmitAndBranch}
                  className="px-5 py-2 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  style={{ backgroundColor: GOLD }}
                >
                  Submit & Branch
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  DOCUMENT PARAGRAPH                                         */
/* ═══════════════════════════════════════════════════════════ */

function DocumentParagraph({
  para, index, showMarkup,
  suggestionState, onAcceptSuggestion, onRejectSuggestion,
  expandedComments, onToggleComment, hoveredRipple, onHoverRipple, rippleEnabled,
  replyingTo, setReplyingTo, replyInputs, setReplyInputs, submittedReplies, onSubmitReply,
  onUpdateParagraph, onInsertAfter,
}) {
  const hasComments  = para.comments?.length > 0
  const hasSuggestion = para.segments?.some(s => s.type === 'suggestion')
  const hasRipple    = para.ripple && rippleEnabled
  const isRippleHovered = hoveredRipple === para.id

  if (para.type === 'heading') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: index * 0.05 }}
        className="mb-8 mt-4 flex"
      >
        <div style={{ width: '65%' }}>
          <h1
            data-para-id={para.id}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdateParagraph(para.id, e.currentTarget.textContent.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onInsertAfter(para.id) }
            }}
            className="text-2xl font-semibold text-[#1E2532] leading-tight tracking-tight outline-none cursor-text"
            style={{ caretColor: GOLD }}
          >
            {para.text}
          </h1>
        </div>
        <div style={{ width: '35%' }} />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_GENTLE, delay: index * 0.05 }}
      className="relative group mb-6"
    >
      <div className="flex">
        {/* Document column — 65% */}
        <div style={{ width: '65%' }} className="flex-shrink-0">
          <div
            className={`relative transition-colors duration-200 rounded-lg px-2 py-1 -mx-2 focus-within:bg-[rgba(184,160,112,0.05)] ${
              isRippleHovered ? 'ring-1 ring-[#E5A620]/40 bg-[#E5A620]/[0.03]' : ''
            }`}
          >
            {/* Paragraph text with inline edits — directly editable */}
            <p
              data-para-id={para.id}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onUpdateParagraph(para.id, e.currentTarget.textContent)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); onInsertAfter(para.id) }
              }}
              className="text-base leading-[1.85] text-[#1E2532] outline-none"
              style={{ caretColor: GOLD, cursor: 'text' }}
            >
              {para.segments?.map((seg, i) => (
                <InlineSegment key={i} segment={seg} showMarkup={showMarkup} suggestionState={suggestionState} />
              ))}
            </p>

            {/* Claude note */}
            {para.claudeNote && showMarkup && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: `${SUGGESTION}08`,
                  borderColor: `${SUGGESTION}20`,
                }}
              >
                <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: SUGGESTION }} />
                <span className="text-[11px] text-[#4A5568] leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {para.claudeNote}
                </span>
              </motion.div>
            )}

            {/* Suggestion accept / reject bar */}
            {hasSuggestion && showMarkup && !suggestionState && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-2"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={e => { e.stopPropagation(); onAcceptSuggestion() }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={{ backgroundColor: `${SUGGESTION}18`, color: SUGGESTION }}
                >
                  <Check className="w-3 h-3" />
                  Accept
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={e => { e.stopPropagation(); onRejectSuggestion() }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#6B7C93] hover:bg-[#F5F5F5] transition-colors"
                >
                  <X className="w-3 h-3" />
                  Reject
                </motion.button>
                <span className="text-[10px] text-[#6B7C93] ml-1">Claude's suggestion</span>
              </motion.div>
            )}

            {/* Accepted / rejected indicator */}
            {suggestionState && showMarkup && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 mt-2 text-[10px] font-medium"
                style={{
                  color: suggestionState === 'accepted' ? SUGGESTION : '#6B7C93',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {suggestionState === 'accepted' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {suggestionState === 'accepted' ? 'Suggestion accepted' : 'Suggestion rejected'}
              </motion.div>
            )}

            {/* Ripple inline indicator */}
            {hasRipple && showMarkup && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onMouseEnter={() => onHoverRipple(para.id)}
                onMouseLeave={() => onHoverRipple(null)}
                className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                style={{
                  backgroundColor: para.ripple.type === 'contradiction'
                    ? `${RIPPLE_WARN}0D` : `${RIPPLE_OPP}0A`,
                  borderColor: para.ripple.type === 'contradiction'
                    ? `${RIPPLE_WARN}30` : `${RIPPLE_OPP}25`,
                }}
              >
                {para.ripple.type === 'contradiction' ? (
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: RIPPLE_WARN }} />
                ) : (
                  <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: RIPPLE_OPP }} />
                )}
                <span className="text-[11px] text-[#4A5568] leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {para.ripple.summary}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Comment gutter — 35%, always present */}
        <div style={{ width: '35%' }} className="flex-shrink-0 pl-6 relative">
          {hasComments && showMarkup && (
            <>
              {/* Connector line */}
              <div className="absolute left-0 top-3 w-6 h-px bg-[#EBEBEB]" />
              <div className="space-y-2">
                {para.comments.map(comment => (
                  <MarginComment
                    key={comment.id}
                    comment={comment}
                    expanded={expandedComments.has(comment.id)}
                    onToggle={() => onToggleComment(comment.id)}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyInput={replyInputs[comment.id] || ''}
                    onReplyChange={(v) => setReplyInputs(prev => ({ ...prev, [comment.id]: v }))}
                    submittedReplies={submittedReplies[comment.id] || []}
                    onSubmitReply={() => onSubmitReply(comment.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  INLINE SEGMENT                                             */
/* ═══════════════════════════════════════════════════════════ */

function InlineSegment({ segment, showMarkup, suggestionState }) {
  if (segment.type === 'text') {
    return <span>{segment.content}</span>
  }

  if (segment.type === 'deletion') {
    if (!showMarkup) return null
    return (
      <span style={{ color: DELETION, textDecoration: 'line-through', textDecorationColor: DELETION, opacity: 0.75 }}>
        {segment.content}
      </span>
    )
  }

  if (segment.type === 'insertion') {
    return (
      <span style={{
        color: showMarkup ? INSERTION : 'inherit',
        fontWeight: showMarkup ? 500 : 400,
        borderBottom: showMarkup ? `1.5px solid ${INSERTION}50` : 'none',
      }}>
        {segment.content}
      </span>
    )
  }

  if (segment.type === 'suggestion') {
    if (suggestionState === 'rejected') return null
    const accepted = suggestionState === 'accepted'
    return (
      <span style={{
        color: accepted ? 'inherit' : showMarkup ? SUGGESTION : 'inherit',
        fontWeight: accepted ? 400 : showMarkup ? 500 : 400,
        borderBottom: showMarkup && !accepted ? `1.5px solid ${SUGGESTION}50` : 'none',
        backgroundColor: showMarkup && !accepted ? `${SUGGESTION}0C` : 'transparent',
        borderRadius: showMarkup && !accepted ? '2px' : 0,
        padding: showMarkup && !accepted ? '0 2px' : 0,
        transition: 'color 0.3s, background-color 0.3s',
      }}>
        {segment.content}
      </span>
    )
  }

  return <span>{segment.content}</span>
}

/* ═══════════════════════════════════════════════════════════ */
/*  MARGIN COMMENT                                             */
/* ═══════════════════════════════════════════════════════════ */

function MarginComment({
  comment, expanded, onToggle,
  replyingTo, setReplyingTo, replyInput, onReplyChange, submittedReplies, onSubmitReply,
}) {
  const isReplying = replyingTo === comment.id

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING_SMOOTH}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <div
        className="px-3 py-2 bg-[#FFF9E6] border border-[#E5D9A8] rounded-lg cursor-pointer hover:bg-[#FFF5D6] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] text-[#6B5D1F] leading-relaxed">{comment.text}</p>
          {comment.claudeReply && (
            <ChevronDown
              className="w-3 h-3 flex-shrink-0 mt-0.5 transition-transform"
              style={{ color: '#B5A353', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          )}
        </div>
      </div>

      {/* Claude reasoning reply + user replies */}
      <AnimatePresence>
        {expanded && comment.claudeReply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING_SMOOTH}
            className="overflow-hidden"
          >
            <div className="ml-3 mt-1 pl-3 border-l-2 border-[#22C55E]/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-2.5 h-2.5" style={{ color: SUGGESTION }} />
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>Claude</span>
              </div>
              <p className="text-[10px] text-[#4A5568] leading-relaxed">{comment.claudeReply.text}</p>

              {/* Submitted user replies */}
              {submittedReplies.map((reply, i) => (
                <div key={i} className="mt-2 pt-2 border-t border-[#22C55E]/15">
                  <p className="text-[10px] text-[#6B5D1F] leading-relaxed">{reply.text}</p>
                </div>
              ))}

              {/* Reply button / input */}
              {!isReplying ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); setReplyingTo(comment.id) }}
                  className="mt-1.5 text-[9px] font-medium transition-colors"
                  style={{ color: `${GOLD}99` }}
                  onMouseEnter={e => e.currentTarget.style.color = GOLD}
                  onMouseLeave={e => e.currentTarget.style.color = `${GOLD}99`}
                >
                  Reply
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING_SMOOTH}
                  className="flex items-center gap-1.5 mt-2"
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Reply to Claude..."
                    value={replyInput}
                    onChange={e => onReplyChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') onSubmitReply()
                      if (e.key === 'Escape') setReplyingTo(null)
                    }}
                    className="flex-1 px-2 py-1 text-[10px] bg-white border border-[#E5D9A8] rounded focus:outline-none focus:border-[#B8A070] transition-colors text-[#1E2532]"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onSubmitReply}
                    className="p-1 rounded transition-colors"
                    style={{ color: GOLD }}
                  >
                    <Send className="w-3 h-3" />
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  SIDEBAR COMPONENTS                                         */
/* ═══════════════════════════════════════════════════════════ */

function SidebarIconButton({ icon: Icon, count, badgeColor, onClick, active }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="relative p-2 rounded-lg transition-colors"
      style={
        active
          ? { backgroundColor: 'rgba(184,160,112,0.1)', color: GOLD }
          : { color: '#6B7C93' }
      }
    >
      <Icon className="w-4 h-4" />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-white px-1 py-0 rounded-full min-w-[14px] text-center"
          style={{ backgroundColor: badgeColor || GOLD }}
        >
          {count}
        </span>
      )}
    </motion.button>
  )
}

function SidebarSectionLabel({ label, count }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">{label}</h3>
      {count !== undefined && (
        <span className="text-[10px] font-semibold" style={{ color: GOLD }}>{count}</span>
      )}
    </div>
  )
}

function CommentCard({
  comment, expanded, onToggle, onJump,
  replyingTo, setReplyingTo, replyInput, onReplyChange, submittedReplies, onSubmitReply,
}) {
  const isReplying = replyingTo === comment.id

  return (
    <motion.div
      variants={staggerItem}
      className="px-3 py-2.5 bg-[#FFF9E6] border border-[#E5D9A8] rounded-xl"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[11px] text-[#6B5D1F] leading-relaxed flex-1">{comment.text}</p>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onJump}
          className="p-1 rounded flex-shrink-0 transition-colors"
          style={{ color: '#B5A353' }}
          title="Jump to paragraph"
        >
          <ArrowRight className="w-3 h-3" />
        </motion.button>
      </div>
      {comment.claudeReply && (
        <div className="mt-2 pt-2 border-t border-[#E5D9A8]/50">
          <div
            className="flex items-center gap-1.5 mb-1 cursor-pointer"
            onClick={onToggle}
          >
            <Sparkles className="w-2.5 h-2.5" style={{ color: SUGGESTION }} />
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>Claude's reasoning</span>
            <ChevronDown
              className="w-3 h-3 ml-auto transition-transform"
              style={{ color: SUGGESTION, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-[10px] text-[#4A5568] leading-relaxed">{comment.claudeReply.text}</p>

                {/* Submitted user replies */}
                {submittedReplies.map((reply, i) => (
                  <div key={i} className="mt-2 pt-2 border-t border-[#E5D9A8]/40">
                    <p className="text-[10px] text-[#6B5D1F] leading-relaxed">{reply.text}</p>
                  </div>
                ))}

                {/* Reply button / input */}
                {!isReplying ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setReplyingTo(comment.id)}
                    className="mt-1.5 text-[9px] font-medium transition-colors"
                    style={{ color: `${GOLD}99` }}
                    onMouseEnter={e => e.currentTarget.style.color = GOLD}
                    onMouseLeave={e => e.currentTarget.style.color = `${GOLD}99`}
                  >
                    Reply
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING_SMOOTH}
                    className="flex items-center gap-1.5 mt-2"
                  >
                    <input
                      autoFocus
                      type="text"
                      placeholder="Reply to Claude..."
                      value={replyInput}
                      onChange={e => onReplyChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') onSubmitReply()
                        if (e.key === 'Escape') setReplyingTo(null)
                      }}
                      className="flex-1 px-2 py-1 text-[10px] bg-white border border-[#E5D9A8] rounded focus:outline-none focus:border-[#B8A070] transition-colors text-[#1E2532]"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={onSubmitReply}
                      className="p-1 rounded transition-colors"
                      style={{ color: GOLD }}
                    >
                      <Send className="w-3 h-3" />
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

function ClaudeNoteCard({ note, onJump }) {
  return (
    <motion.div
      variants={staggerItem}
      className="px-3 py-2.5 rounded-xl border"
      style={{ backgroundColor: `${SUGGESTION}08`, borderColor: `${SUGGESTION}20` }}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: SUGGESTION }} />
        <p className="text-[11px] text-[#4A5568] leading-relaxed flex-1">{note}</p>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onJump}
          className="p-1 rounded flex-shrink-0 transition-colors"
          style={{ color: `${SUGGESTION}80` }}
        >
          <ArrowRight className="w-3 h-3" />
        </motion.button>
      </div>
    </motion.div>
  )
}

function RippleCard({ ripple, onJump, onHover, onLeave }) {
  const isWarning = ripple.type === 'contradiction' || ripple.type === 'dependency_break'
  const color = isWarning ? RIPPLE_WARN : RIPPLE_OPP
  const Icon  = isWarning ? AlertTriangle : Lightbulb
  const typeLabel = {
    contradiction:    'Contradiction',
    dependency_break: 'Dependency Break',
    opportunity:      'Opportunity',
    tone_shift:       'Tone Shift',
    duplication:      'Duplication',
  }[ripple.type] || ripple.type

  return (
    <motion.div
      variants={staggerItem}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="px-3 py-2.5 rounded-xl border cursor-pointer transition-colors"
      style={{ backgroundColor: `${color}0C`, borderColor: `${color}25` }}
    >
      <div className="flex items-start gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{typeLabel}</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                backgroundColor: ripple.severity === 'high'   ? `${DELETION}18`
                                : ripple.severity === 'medium' ? `${RIPPLE_WARN}18`
                                : 'rgba(107,124,147,0.12)',
                color:           ripple.severity === 'high'   ? DELETION
                                : ripple.severity === 'medium' ? RIPPLE_WARN
                                : '#6B7C93',
              }}
            >
              {ripple.severity}
            </span>
          </div>
          <p className="text-[11px] text-[#4A5568] leading-relaxed">{ripple.summary}</p>
          <p className="text-[10px] text-[#6B7C93] mt-1.5 flex items-center gap-1">
            <CornerDownRight className="w-2.5 h-2.5" />
            {ripple.sourceEdit}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onJump}
          className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors"
          style={{ color }}
        >
          Go to paragraph
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="text-[10px] font-semibold text-[#6B7C93] px-2 py-1 rounded-md hover:bg-[#F5F5F5] transition-colors"
        >
          Dismiss
        </motion.button>
      </div>
    </motion.div>
  )
}

function BranchCard({ branch, isLast }) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
      style={branch.active ? { backgroundColor: 'rgba(184,160,112,0.07)', border: `1px solid rgba(184,160,112,0.2)` } : {}}
    >
      <div className="flex flex-col items-center">
        <div
          className="w-2.5 h-2.5 rounded-full border-2"
          style={branch.active
            ? { borderColor: GOLD, backgroundColor: GOLD }
            : { borderColor: '#D5D5D5', backgroundColor: 'white' }
          }
        />
        {!isLast && <div className="w-px h-6 bg-[#EBEBEB] mt-1" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold truncate"
            style={{ color: branch.active ? GOLD : '#1E2532' }}
          >
            {branch.label}
          </span>
          {branch.active && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ color: GOLD, backgroundColor: 'rgba(184,160,112,0.12)' }}
            >
              CURRENT
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="w-2.5 h-2.5 text-[#6B7C93]" />
          <span className="text-[10px] text-[#6B7C93]">{branch.time}</span>
          <span className="text-[10px] text-[#6B7C93]">· {branch.paragraphs} paragraphs</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Toolbar helper ─────────────────────────────────────── */

function ToolButton({ icon: Icon, label, active, onClick, activeColor }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
        active
          ? 'bg-white shadow-sm text-[#1E2532]'
          : 'text-[#6B7C93] hover:text-[#1E2532]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" style={active && activeColor ? { color: activeColor } : {}} />
      <span className="hidden xl:inline">{label}</span>
    </motion.button>
  )
}

/* ─── Modal helper ───────────────────────────────────────── */

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

/* ─── Sidebar chat helper ────────────────────────────────── */

function ChatShortcut({ label }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
      style={{
        color: GOLD,
        backgroundColor: 'rgba(184,160,112,0.08)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {label}
    </motion.button>
  )
}
