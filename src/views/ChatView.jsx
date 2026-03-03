import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Square, AlertCircle, Search, Bookmark,
  GitBranch, Trash2, ChevronLeft, ChevronRight, MessageSquare,
  FileText, MoreVertical, StickyNote, Activity, Zap, Star,
  Eye, Copy, ArrowRightCircle, Settings2, BookOpen, PanelRight, X
} from 'lucide-react'
import { useChat } from '../stores/ChatContext'
import { useConversations } from '../stores/ConversationContext'
import { useSettings } from '../stores/SettingsContext'
import { getProvider } from '../providers'
import { loadApiKey } from '../lib/crypto'

/* ── Animation Constants ─────────────────────────────────── */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }
const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 }
const SEND_DEBOUNCE_MS = 500

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const staggerItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: SPRING_SMOOTH },
}
const interactiveHover = { x: 4 }
const interactiveTap = { scale: 0.98 }
const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { ...SPRING_GENTLE, delay: i * 0.08 },
  }),
}

/* ── Main ChatView ───────────────────────────────────────── */

export default function ChatView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    messages, isStreaming, streamingContent,
    loadMessages, sendMessage, continueMessage,
    stopGenerating, clearMessages,
  } = useChat()
  const { updateConversation } = useConversations()
  const { settings, refreshStorageEstimate } = useSettings()

  const [inputValue, setInputValue] = useState('')
  const [apiKey, setApiKey] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [favorites, setFavorites] = useState(new Set())
  const [showNotes, setShowNotes] = useState(new Set())
  const [contextUsage] = useState(65) // TODO: wire to real token tracking in Step 9

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const lastSendTimeRef = useRef(0)
  const seenMessageIds = useRef(new Set())
  const clearMessagesRef = useRef(clearMessages)
  clearMessagesRef.current = clearMessages

  const getContextColor = (u) => u < 50 ? '#22C55E' : u < 80 ? '#E5A620' : '#EF4444'

  const toggleNote = (msgId) =>
    setShowNotes((prev) => {
      const n = new Set(prev)
      n.has(msgId) ? n.delete(msgId) : n.add(msgId)
      return n
    })

  const toggleFav = (msgId) =>
    setFavorites((prev) => {
      const n = new Set(prev)
      n.has(msgId) ? n.delete(msgId) : n.add(msgId)
      return n
    })

  /* ── Lifecycle ─────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const key = await loadApiKey(settings.storageMode)
        if (!cancelled) setApiKey(key)
        await loadMessages(id)
      } catch {
        // Conversation may not exist
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
      clearMessagesRef.current()
      seenMessageIds.current.clear()
    }
  }, [id, settings.storageMode, loadMessages])

  useEffect(() => {
    if (!loading) {
      messages.forEach((m) => seenMessageIds.current.add(m.id))
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (!isStreaming && apiError?.type === 'rate_limit') {
      setApiError(null)
    }
  }, [isStreaming]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handlers ──────────────────────────────────────────── */

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isStreaming) return
    if (!apiKey) {
      setApiError({ type: 'key_failure', message: 'No API key configured. Add one in Settings to continue.' })
      return
    }
    const now = Date.now()
    if (now - lastSendTimeRef.current < SEND_DEBOUNCE_MS) return
    lastSendTimeRef.current = now
    setInputValue('')
    setApiError(null)
    try {
      const provider = getProvider('anthropic')
      await sendMessage(apiKey, id, trimmed, settings.defaultModel, provider)
      await refreshStorageEstimate()
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setApiError({ type: 'key_failure', message: 'Your API key is no longer working. Your conversation is safe — update your key in Settings to continue.' })
      } else if (error.status === 429) {
        setApiError({ type: 'rate_limit', message: 'Rate limit reached. Please wait a moment.' })
      } else if (error.name !== 'AbortError') {
        setApiError({ type: 'generic', message: error.message || 'Something went wrong. Please try again.' })
      }
    }
  }, [inputValue, isStreaming, apiKey, id, settings.defaultModel, sendMessage, refreshStorageEstimate])

  const handleContinue = useCallback(async (messageId) => {
    if (!apiKey) return
    setApiError(null)
    try {
      const provider = getProvider('anthropic')
      await continueMessage(apiKey, messageId, settings.defaultModel, provider)
      await refreshStorageEstimate()
    } catch (error) {
      if (error.name !== 'AbortError') {
        setApiError({ type: 'generic', message: error.message || 'Failed to continue. Please try again.' })
      }
    }
  }, [apiKey, settings.defaultModel, continueMessage, refreshStorageEstimate])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      isStreaming ? stopGenerating() : handleSend()
    }
  }

  /* ── Derive TOC from messages ──────────────────────────── */

  const tocItems = messages.map((msg, i) => ({
    id: msg.id,
    label: msg.role === 'user'
      ? msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : '')
      : `Response ${Math.ceil((i + 1) / 2)}`,
    role: msg.role,
    number: i + 1,
  }))

  /* ── Loading ───────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center font-sans text-[#6B7C93]">
        <p className="text-sm">Loading conversation...</p>
      </div>
    )
  }

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="flex h-screen text-[#1E2532] font-sans overflow-hidden relative bg-white">

      {/* ═══ Left Sidebar ═══ */}
      <motion.div
        initial={{ x: -288 }}
        animate={{ x: 0 }}
        transition={SPRING_SMOOTH}
        className="w-72 flex flex-col flex-shrink-0"
        style={{ borderRight: '1px solid #F0F0F0' }}
      >
        {/* Sidebar header */}
        <div className="p-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/')}
                className="text-[#6B7C93] hover:text-[#1E2532] transition-colors p-1.5 rounded hover:bg-[#EEEEEE]"
                title="Back to Chats"
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
              <motion.div
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}
              >
                <MessageSquare className="w-5 h-5 text-[#4A7AE5]" />
              </motion.div>
            </div>
            <div className="flex items-center gap-1">
              <SidebarIconButton title="Undo (Ctrl+Z)">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </SidebarIconButton>
              <SidebarIconButton title="Redo (Ctrl+Y)">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </SidebarIconButton>
            </div>
          </motion.div>
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Table of Contents */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-1 mb-6"
          >
            <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-2">
              Contents
            </h3>
            {tocItems.length === 0 ? (
              <p className="text-xs text-[#D5D5D5] px-3 py-2">
                Messages will appear here
              </p>
            ) : (
              tocItems.map((item) => (
                <NavItem
                  key={item.id}
                  indent={item.role === 'assistant'}
                  onClick={() => {
                    document.getElementById(`msg-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                >
                  <span className="text-[10px] font-mono text-[#D5D5D5] mr-2">
                    #{item.number}
                  </span>
                  {item.label}
                </NavItem>
              ))
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-1"
          >
            <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-2">
              Quick Actions
            </h3>
            <ActionButton icon={Settings2}>Collaboration Mode</ActionButton>
            <ActionButton icon={BookOpen}>Review</ActionButton>
            <ActionButton icon={GitBranch}>Branch Conversation</ActionButton>
            <ActionButton icon={FileText}>Export to Markdown</ActionButton>
            <ActionButton icon={Activity}>Compress Context</ActionButton>
            <ActionButton icon={Zap}>Keyboard Shortcuts</ActionButton>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ Main Chat Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Key failure banner */}
        <AnimatePresence>
          {apiError?.type === 'key_failure' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3 bg-[#EF4444]/10 border-b border-[#EF4444]/20 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
              <p className="text-xs text-[#EF4444]">{apiError.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-[#EBEBEB] mb-3" />
              <p className="text-sm text-[#6B7C93] mb-1">Start a conversation</p>
              <p className="text-xs text-[#D5D5D5]">Type a message below to begin</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isNew = !seenMessageIds.current.has(msg.id)
            if (isNew) seenMessageIds.current.add(msg.id)
            const isGhostText = msg.incomplete && !isStreaming

            return (
              <MessageCard
                key={msg.id}
                id={msg.id}
                type={msg.role}
                content={
                  msg.incomplete && isStreaming && streamingContent
                    ? streamingContent
                    : msg.content
                }
                number={idx + 1}
                index={isNew ? idx : undefined}
                isGhostText={isGhostText}
                isFavorited={favorites.has(msg.id)}
                showNotes={showNotes.has(msg.id)}
                onNote={() => toggleNote(msg.id)}
                onFavorite={() => toggleFav(msg.id)}
                onContinue={isGhostText ? () => handleContinue(msg.id) : null}
                onDelete={() => {}}
                onBranch={() => {}}
              />
            )
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Inline errors */}
        <AnimatePresence>
          {apiError?.type === 'rate_limit' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-6 py-1.5"
            >
              <p className="text-xs text-[#E5A620]">{apiError.message}</p>
            </motion.div>
          )}
          {apiError?.type === 'generic' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-6 py-1.5"
            >
              <p className="text-xs text-[#EF4444]">{apiError.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="relative p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SMOOTH, delay: 0.4 }}
            className="flex items-stretch gap-3"
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-white rounded-lg px-4 py-3 text-sm text-[#1E2532] resize-none outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors"
              rows={3}
            />
            <motion.button
              whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
              whileTap={{ scale: 0.97 }}
              onClick={isStreaming ? stopGenerating : handleSend}
              className={`px-5 rounded-lg font-semibold text-sm border bg-white transition-colors flex items-center gap-2 ${
                isStreaming
                  ? 'border-[#EF4444]/30 text-[#EF4444] hover:border-[#EF4444]'
                  : 'border-[#EBEBEB] text-[#1E2532] hover:border-[#4A7AE5] hover:text-[#4A7AE5]'
              }`}
            >
              <AnimatePresence mode="wait">
                {isStreaming ? (
                  <motion.div
                    key="stop"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={SPRING_SNAPPY}
                    className="flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={SPRING_SNAPPY}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* ═══ Right Sidebar ═══ */}
      <motion.div
        animate={{ width: rightSidebarCollapsed ? 48 : 320 }}
        transition={SIDEBAR_RESIZE}
        className="flex flex-col relative overflow-hidden flex-shrink-0"
        style={{ borderLeft: '1px solid #F0F0F0' }}
      >
        <AnimatePresence mode="wait">
          {rightSidebarCollapsed ? (
            <motion.button
              key="expand"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING_SNAPPY}
              onClick={() => setRightSidebarCollapsed(false)}
              className="p-3 hover:bg-[#EEEEEE] transition-colors mt-10"
              style={{ color: getContextColor(contextUsage) }}
              title="Expand sidebar"
            >
              <PanelRight className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col flex-1 pt-10"
            >
              {/* Highlights Section */}
              <div className="p-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">
                    Highlights
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRightSidebarCollapsed(true)}
                    className="p-1 rounded hover:bg-[#EEEEEE] transition-colors"
                    style={{ color: getContextColor(contextUsage) }}
                    title="Collapse sidebar"
                  >
                    <PanelRight className="w-5 h-5" />
                  </motion.button>
                </div>
                <p className="text-xs text-[#6B7C93] mb-4">
                  Navigate through highlighted terms
                </p>
                {/* Placeholder for Step 10 */}
                <motion.button
                  whileHover={{ ...interactiveHover, borderColor: '#4A7AE5', color: '#4A7AE5' }}
                  whileTap={interactiveTap}
                  className="w-full px-3 py-2 border border-dashed border-[#EBEBEB] rounded-lg text-xs text-[#6B7C93] transition-colors"
                >
                  + Add Highlight
                </motion.button>
              </div>

              {/* Context Health Section */}
              <div className="p-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
                <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
                  Context Health
                </h3>
                <div className="space-y-3">
                  <MetricRow label="Messages" value={`${messages.length}`} />
                  <MetricRow
                    label="Context"
                    value={`${contextUsage}%`}
                    color={getContextColor(contextUsage)}
                  />
                  {/* Context bar */}
                  <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${contextUsage}%` }}
                      transition={{ ...SPRING_GENTLE, delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getContextColor(contextUsage) }}
                    />
                  </div>
                </div>
                {contextUsage >= 50 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING_GENTLE, delay: 0.5 }}
                    className="mt-4 p-3 bg-white rounded-lg border border-[#EBEBEB]"
                  >
                    <div className="flex items-start gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
                      >
                        <Activity
                          className="w-4 h-4 mt-0.5"
                          style={{ color: getContextColor(contextUsage) }}
                        />
                      </motion.div>
                      <div>
                        <div
                          className="text-xs font-semibold"
                          style={{ color: getContextColor(contextUsage) }}
                        >
                          {contextUsage >= 80 ? 'Context Nearly Full' : 'Approaching Limit'}
                        </div>
                        <div className="text-xs text-[#6B7C93] mt-1">
                          Consider compressing the conversation or starting a new branch.
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Branches Section */}
              <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
                  Branches
                </h3>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                >
                  {/* TODO: Wire to real branch data in Step 11 */}
                  <BranchItem label="Main Thread" messages={messages.length} active />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  Sub-components                                            */
/* ═══════════════════════════════════════════════════════════ */

function SidebarIconButton({ children, title, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="text-[#6B7C93] hover:text-[#1E2532] transition-colors p-1.5 rounded hover:bg-[#EEEEEE]"
      title={title}
    >
      {children}
    </motion.button>
  )
}

function NavItem({ children, active = false, indent = false, onClick }) {
  return (
    <motion.button
      variants={staggerItem}
      whileHover={interactiveHover}
      whileTap={interactiveTap}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
        indent ? 'pl-8' : ''
      } ${active ? 'text-[#1E2532] font-semibold' : 'text-[#6B7C93] hover:text-[#1E2532]'}`}
    >
      {children}
    </motion.button>
  )
}

function ActionButton({ icon: Icon, children, onClick, badge = null }) {
  return (
    <motion.button
      variants={staggerItem}
      whileHover={interactiveHover}
      whileTap={interactiveTap}
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#4A5568] hover:bg-white hover:text-[#4A7AE5] transition-colors flex items-center gap-2"
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate flex-1">{children}</span>
      {badge !== null && (
        <span className="w-4 h-4 rounded-full bg-[#4A7AE5]/15 text-[#4A7AE5] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {badge}
        </span>
      )}
    </motion.button>
  )
}

/* ── Message Card ─────────────────────────────────────────── */

function MessageCard({
  id, type, content, number, index = 0,
  isGhostText = false,
  isFavorited = false, showNotes = false,
  onNote, onFavorite, onContinue, onDelete, onBranch,
}) {
  const [noteText, setNoteText] = useState('')
  const [showMenu, setShowMenu] = useState(false)

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
        className={`rounded-xl border transition-colors ${
          isGhostText ? 'border-dashed border-[#D5D5D5]' : 'border-[#EBEBEB]'
        }`}
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header row — visible on hover */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#D5D5D5] opacity-0 group-hover:opacity-100 transition-opacity">
              #{number}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <MsgIconButton
              onClick={onFavorite}
              active={isFavorited}
              title="Favorite"
            >
              <Star
                className="w-3.5 h-3.5"
                style={isFavorited ? { fill: '#E5A620', color: '#E5A620' } : {}}
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

            {/* More menu */}
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
                    className="absolute right-0 top-8 w-44 border border-[#EBEBEB] rounded-lg shadow-xl z-30 overflow-hidden bg-white"
                  >
                    <MenuButton icon={Eye} onClick={() => setShowMenu(false)}>
                      Hide message
                    </MenuButton>
                    <MenuButton icon={ArrowRightCircle} onClick={() => setShowMenu(false)}>
                      Move to branch
                    </MenuButton>
                    <MenuButton icon={Copy} onClick={() => setShowMenu(false)}>
                      Duplicate
                    </MenuButton>
                    <MenuButton icon={FileText} onClick={() => setShowMenu(false)}>
                      Copy text
                    </MenuButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 overflow-hidden">
          <p className="text-sm leading-relaxed text-[#1E2532] whitespace-pre-wrap">
            {content}
          </p>
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
                <div
                  className="border border-[#EBEBEB] rounded-lg p-3"
                  style={{ backgroundColor: '#FEFCE8' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-3.5 h-3.5 text-[#E5A620]" />
                    <span className="text-xs font-semibold text-[#E5A620]">Note</span>
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this message..."
                    className="w-full bg-transparent text-xs text-[#4A5568] resize-none focus:outline-none placeholder:text-[#D5D5D5]"
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
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4A7AE5] border border-[#EBEBEB] hover:border-[#4A7AE5] transition-colors"
        >
          Continue
        </motion.button>
      )}
    </motion.div>
  )
}

function MsgIconButton({ onClick, children, active = false, title }) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-[#4A7AE5]/15 text-[#4A7AE5]'
          : 'hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532]'
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
      className="w-full text-left px-3 py-2 text-xs text-[#4A5568] hover:bg-[#EEEEEE] hover:text-[#1E2532] transition-colors flex items-center gap-2"
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  )
}

/* ── Right Sidebar helpers ───────────────────────────────── */

function MetricRow({ label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING_SMOOTH}
      className="flex items-center justify-between text-xs"
    >
      <span className="text-[#6B7C93]">{label}</span>
      <span className="font-semibold" style={{ color: color || '#1E2532' }}>
        {value}
      </span>
    </motion.div>
  )
}

function BranchItem({ label, messages, active = false }) {
  return (
    <motion.button
      variants={staggerItem}
      whileHover={interactiveHover}
      whileTap={interactiveTap}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
        active
          ? 'bg-white border border-[#4A7AE5] shadow-sm'
          : 'bg-white border border-[#F0F0F0] hover:border-[#D5D5D5]'
      }`}
    >
      <div className="flex items-center gap-2">
        <GitBranch className={`w-3.5 h-3.5 ${active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[#1E2532] truncate">{label}</div>
          <div className="text-xs text-[#6B7C93]">{messages} messages</div>
        </div>
      </div>
    </motion.button>
  )
}