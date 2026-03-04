import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Square, AlertCircle, ChevronLeft, ChevronRight,
  GitBranch, Trash2, MessageSquare,
  FileText, MoreVertical, StickyNote, Activity, Zap, Star,
  Eye, Copy, ArrowRightCircle, Settings2, BookOpen, PanelRight, X,
  Pencil, Info, ArrowRight,
} from 'lucide-react'
import { useChat } from '../stores/ChatContext'
import { useConversations } from '../stores/ConversationContext'
import { useSettings } from '../stores/SettingsContext'
import { getProvider } from '../providers'
import { loadApiKey } from '../lib/crypto'
import {
  getFavorites, addFavorite, deleteFavorite,
  getNotes, addNote, updateNote, deleteNote,
  getHighlights, addHighlight, deleteHighlight,
  deleteMessage, createBranch, getBranches,
  getConversation, createConversation, addMessage,
} from '../lib/db'

/* ── Animation Constants ─────────────────────────────────── */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }
const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 }
const SEND_DEBOUNCE_MS = 500

const HIGHLIGHT_COLORS = [
  { id: 'blue', color: '#4A7AE5', bg: 'rgba(74,122,229,0.15)' },
  { id: 'yellow', color: '#E5A620', bg: 'rgba(229,166,32,0.15)' },
  { id: 'green', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  { id: 'purple', color: '#7C6CD4', bg: 'rgba(124,108,212,0.15)' },
  { id: 'red', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
]

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
    messages, isStreaming, streamingContent, tokenUsage,
    loadMessages, sendMessage, continueMessage,
    stopGenerating, clearMessages,
  } = useChat()
  const { updateConversation, loadConversations } = useConversations()
  const { settings, refreshStorageEstimate } = useSettings()

  const [inputValue, setInputValue] = useState('')
  const [apiKey, setApiKey] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [hiddenMessages, setHiddenMessages] = useState(new Set())

  // Persisted annotations — Maps keyed by messageId → db record
  const [favoritesMap, setFavoritesMap] = useState(new Map()) // messageId → { id, conversationId, messageId }
  const [notesMap, setNotesMap] = useState(new Map())         // messageId → { id, conversationId, messageId, text }
  const [highlightsList, setHighlightsList] = useState([])    // Array of { id, conversationId, messageId, text, color }
  const [showNotes, setShowNotes] = useState(new Set())       // which note panels are open (UI-only)
  const [showAddHighlight, setShowAddHighlight] = useState(false)
  const [addHighlightText, setAddHighlightText] = useState('')
  const [addHighlightColor, setAddHighlightColor] = useState(HIGHLIGHT_COLORS[0].color)
  const [highlightOccurrenceIdx, setHighlightOccurrenceIdx] = useState({}) // highlightText → current index

  // Branching state
  const [branchPanelMessage, setBranchPanelMessage] = useState(null) // message to branch from, or null
  const [branches, setBranches] = useState([]) // branch conversations for this conversation
  const [currentConversation, setCurrentConversation] = useState(null) // loaded conversation record

  // Context health — derive from real token usage
  const modelInfo = useMemo(() => {
    const provider = getProvider('anthropic')
    const models = provider.getModels()
    return models.find(m => m.id === settings.defaultModel) || models[0]
  }, [settings.defaultModel])

  const totalTokens = tokenUsage.input + tokenUsage.output
  const contextWindow = modelInfo.contextWindow
  const contextUsage = contextWindow > 0 ? Math.min(Math.round((totalTokens / contextWindow) * 100), 100) : 0
  const contextThreshold = settings.contextThreshold || 80

  // Derive visible messages early — needed by highlight callbacks below
  const visibleMessages = messages.filter((m) => !hiddenMessages.has(m.id))
  const hiddenCount = messages.length - visibleMessages.length

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const lastSendTimeRef = useRef(0)
  const seenMessageIds = useRef(new Set())
  const clearMessagesRef = useRef(clearMessages)
  clearMessagesRef.current = clearMessages

  const getContextColor = (u) => u < (contextThreshold / 2) ? '#22C55E' : u < contextThreshold ? '#E5A620' : '#EF4444'

  const toggleNote = (msgId) =>
    setShowNotes((prev) => {
      const n = new Set(prev)
      n.has(msgId) ? n.delete(msgId) : n.add(msgId)
      return n
    })

  const toggleFav = useCallback(async (msgId) => {
    const existing = favoritesMap.get(msgId)
    if (existing) {
      // Remove from IndexedDB and state
      try { await deleteFavorite(existing.id) } catch {}
      setFavoritesMap(prev => { const n = new Map(prev); n.delete(msgId); return n })
    } else {
      // Add to IndexedDB and state
      try {
        const record = await addFavorite({ conversationId: id, messageId: msgId })
        setFavoritesMap(prev => new Map(prev).set(msgId, record))
      } catch {}
    }
  }, [favoritesMap, id])

  const handleNoteSave = useCallback(async (msgId, text) => {
    const existing = notesMap.get(msgId)
    if (existing) {
      if (text.trim()) {
        // Update existing note
        try {
          const updated = await updateNote(existing.id, text)
          setNotesMap(prev => new Map(prev).set(msgId, updated))
        } catch {}
      } else {
        // Empty text — delete the note
        try { await deleteNote(existing.id) } catch {}
        setNotesMap(prev => { const n = new Map(prev); n.delete(msgId); return n })
      }
    } else if (text.trim()) {
      // Create new note
      try {
        const record = await addNote({ conversationId: id, messageId: msgId, text })
        setNotesMap(prev => new Map(prev).set(msgId, record))
      } catch {}
    }
  }, [notesMap, id])

  const handleAddHighlight = useCallback(async (msgId, text, color) => {
    try {
      const record = await addHighlight({ conversationId: id, messageId: msgId, text, color })
      setHighlightsList(prev => [...prev, record])
    } catch {}
  }, [id])

  // Add a highlight from the sidebar (applies to ALL messages containing the text)
  const handleAddHighlightFromSidebar = useCallback(async (text, color) => {
    if (!text.trim()) return
    // Find the first message containing this text and store the highlight against it
    // The rendering logic will highlight all occurrences across all messages
    const firstMatch = visibleMessages.find(m => m.content?.includes(text.trim()))
    const msgId = firstMatch?.id || visibleMessages[0]?.id
    if (!msgId) return
    try {
      const record = await addHighlight({ conversationId: id, messageId: msgId, text: text.trim(), color })
      setHighlightsList(prev => [...prev, record])
    } catch {}
  }, [id, visibleMessages])

  const handleRemoveHighlight = useCallback(async (highlightId) => {
    try {
      await deleteHighlight(highlightId)
      setHighlightsList(prev => prev.filter(h => h.id !== highlightId))
    } catch {}
  }, [])

  // Find all message occurrences of a highlight term for prev/next navigation
  const getHighlightOccurrences = useCallback((text) => {
    const occurrences = []
    for (const msg of visibleMessages) {
      if (msg.content?.includes(text)) {
        occurrences.push(msg.id)
      }
    }
    return occurrences
  }, [visibleMessages])

  const navigateHighlight = useCallback((text, direction) => {
    const occurrences = getHighlightOccurrences(text)
    if (occurrences.length === 0) return
    const currentIdx = highlightOccurrenceIdx[text] || 0
    let nextIdx
    if (direction === 'next') {
      nextIdx = (currentIdx + 1) % occurrences.length
    } else {
      nextIdx = (currentIdx - 1 + occurrences.length) % occurrences.length
    }
    setHighlightOccurrenceIdx(prev => ({ ...prev, [text]: nextIdx }))
    const msgId = occurrences[nextIdx]
    document.getElementById(`msg-${msgId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [getHighlightOccurrences, highlightOccurrenceIdx])

  // Branch creation — "Full History" mode
  const handleCreateBranchFull = useCallback(async (messageId) => {
    try {
      const branchConv = await createBranch(id, messageId)
      await loadConversations()
      // Refresh branches list so sidebar updates immediately
      const updatedBranches = await getBranches(id)
      setBranches(updatedBranches)
      navigate(`/chat/${branchConv.id}`)
    } catch (err) {
      console.error('Branch creation failed:', err)
    }
  }, [id, navigate, loadConversations])

  // Branch creation — "Compressed Summary" mode
  // Creates a new conversation with a single AI-generated summary message
  // instead of copying all messages
  const handleCreateBranchCompressed = useCallback(async (messageId) => {
    if (!apiKey) return
    try {
      const provider = getProvider('anthropic')

      // Get messages up to branch point for the summary
      const branchIdx = visibleMessages.findIndex(m => m.id === messageId)
      const branchMessages = visibleMessages.slice(0, branchIdx + 1)

      // Build the summary prompt — truncate each message to keep it cheap
      const summaryMessages = branchMessages
        .map(m => ({ role: m.role, content: m.content?.slice(0, 500) || '' }))
      summaryMessages.push({
        role: 'user',
        content: 'Provide a concise summary of our conversation so far. Focus on key decisions, conclusions, and open questions. Keep it under 200 words. Respond with ONLY the summary, no preamble.',
      })

      // Use generateTitle-style non-streaming call via Haiku
      let summaryText = ''
      await provider.sendMessage(
        apiKey,
        summaryMessages,
        'claude-haiku',
        (chunk) => { summaryText += chunk },
        new AbortController().signal
      )

      if (!summaryText.trim()) {
        throw new Error('Empty summary generated')
      }

      // Look up parent conversation for title/model defaults
      const parentConv = await getConversation(id)
      const title = `Summary: ${parentConv?.title || 'conversation'}`

      // Create the branch conversation manually (not via createBranch,
      // since we don't want to copy messages — we want a fresh start with just the summary)
      const branchConv = await createConversation({
        title,
        model: parentConv?.model || settings.defaultModel,
        parentId: id,
        branchPoint: messageId,
      })

      // Add the summary as a single assistant message
      await addMessage({
        conversationId: branchConv.id,
        role: 'assistant',
        content: `**Conversation Summary**\n\n${summaryText.trim()}`,
        tokenCount: 0,
      })

      await loadConversations()
      const updatedBranches = await getBranches(id)
      setBranches(updatedBranches)
      navigate(`/chat/${branchConv.id}`)
    } catch (err) {
      console.error('Compressed branch failed:', err)
      // Fall back to full branch
      await handleCreateBranchFull(messageId)
    }
  }, [id, apiKey, visibleMessages, settings.defaultModel, navigate, loadConversations, handleCreateBranchFull])

  const hideMessage = useCallback((msgId) => {
    setHiddenMessages((prev) => {
      const n = new Set(prev)
      n.add(msgId)
      return n
    })
  }, [])

  const unhideMessage = useCallback((msgId) => {
    setHiddenMessages((prev) => {
      const n = new Set(prev)
      n.delete(msgId)
      return n
    })
  }, [])

  const handleDelete = useCallback(async (msgId) => {
    try {
      await deleteMessage(msgId)
    } catch {}
    // Also remove from local state so it disappears immediately
    hideMessage(msgId)
  }, [hideMessage])

  const handleCopyText = useCallback(async (content) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = content
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }, [])

  /* ── Lifecycle ─────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const key = await loadApiKey(settings.storageMode)
        if (!cancelled) setApiKey(key)
        await loadMessages(id)

        // Load persisted annotations
        const [favs, notes, highlights, branchList, convRecord] = await Promise.all([
          getFavorites(id),
          getNotes(id),
          getHighlights(id),
          getBranches(id),
          getConversation(id),
        ])
        if (!cancelled) {
          setFavoritesMap(new Map(favs.map(f => [f.messageId, f])))
          setNotesMap(new Map(notes.map(n => [n.messageId, n])))
          setHighlightsList(highlights)
          setBranches(branchList)
          setCurrentConversation(convRecord || null)
        }
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

  /* ── Derive TOC and sidebar data ──────────────────────── */

  const tocItems = visibleMessages
    .filter(msg => msg.role === 'user')
    .map((msg) => ({
      id: msg.id,
      label: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
    }))

  // Favorited messages for right sidebar
  const favoritedMessages = visibleMessages.filter((m) => favoritesMap.has(m.id))

  // Unique highlight terms for sidebar display, with occurrence counts
  const uniqueHighlights = useMemo(() => {
    const seen = new Map() // text → { ids: [highlightId, ...], color, count }
    for (const hl of highlightsList) {
      if (!seen.has(hl.text)) {
        // Count how many messages contain this text
        let count = 0
        for (const msg of visibleMessages) {
          if (msg.content?.includes(hl.text)) count++
        }
        seen.set(hl.text, { text: hl.text, color: hl.color, count, ids: [hl.id] })
      } else {
        seen.get(hl.text).ids.push(hl.id)
      }
    }
    return Array.from(seen.values())
  }, [highlightsList, visibleMessages])

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
                className="text-[#4A7AE5] hover:text-[#3A6AD4] transition-colors p-1.5 rounded hover:bg-[#EEEEEE]"
                title="Back to Chats"
              >
                <MessageSquare className="w-5 h-5" />
              </motion.button>
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

        {/* Scrollable Contents area */}
        <div className="flex-1 overflow-y-auto px-4 pt-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>
          {/* Table of Contents */}
          <motion.div
            variants={staggerContainer}
            initial={false}
            animate="show"
            className="space-y-1"
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
                  onClick={() => {
                    document.getElementById(`msg-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                >
                  {item.label}
                </NavItem>
              ))
            )}
          </motion.div>
        </div>

        {/* Actions — pinned at bottom */}
        <div className="px-4 pb-4 pt-3 flex-shrink-0" style={{ borderTop: '1px solid #F0F0F0' }}>
          <motion.div
            variants={staggerContainer}
            initial={false}
            animate="show"
            className="space-y-1"
          >
            <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-2">
              Actions
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
          {visibleMessages.length === 0 && !isStreaming && hiddenCount === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-[#EBEBEB] mb-3" />
              <p className="text-sm text-[#6B7C93] mb-1">Start a conversation</p>
              <p className="text-xs text-[#D5D5D5]">Type a message below to begin</p>
            </div>
          )}

          {visibleMessages.map((msg, idx) => {
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
                isFavorited={favoritesMap.has(msg.id)}
                showNotes={showNotes.has(msg.id)}
                savedNoteText={notesMap.get(msg.id)?.text || ''}
                highlights={highlightsList}
                onNote={() => toggleNote(msg.id)}
                onFavorite={() => toggleFav(msg.id)}
                onNoteSave={(text) => handleNoteSave(msg.id, text)}
                onHighlight={(text, color) => handleAddHighlight(msg.id, text, color)}
                onContinue={isGhostText ? () => handleContinue(msg.id) : null}
                onDelete={() => handleDelete(msg.id)}
                onHide={() => hideMessage(msg.id)}
                onCopyText={() => handleCopyText(msg.content)}
                onBranch={() => setBranchPanelMessage(msg)}
              />
            )
          })}

          {/* Hidden messages indicator */}
          {hiddenCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING_GENTLE}
              className="flex items-center justify-center py-2"
            >
              <motion.button
                whileHover={{ scale: 1.04, borderColor: '#4A7AE5' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setHiddenMessages(new Set())}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#EBEBEB] cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-[#6B7C93]" />
                <span className="text-xs text-[#6B7C93]">
                  {hiddenCount} message{hiddenCount !== 1 ? 's' : ''} hidden
                </span>
              </motion.button>
            </motion.div>
          )}

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
              className="flex-1 bg-white rounded-lg px-4 py-3 text-sm text-[#1E2532] resize-none outline-none placeholder:text-[#9CA3AF] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors"
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
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={SPRING_SNAPPY}
                  >
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
              className="flex flex-col flex-1 pt-10 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}
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
                <p className="text-xs text-[#6B7C93] mb-3">
                  Navigate through highlighted terms
                </p>
                <div
                  className="space-y-2"
                >
                  {uniqueHighlights.map((hl) => (
                    <motion.div
                      key={hl.text}
                      whileHover={interactiveHover}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-[#F0F0F0] rounded-lg group/hl cursor-pointer"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.5 }}
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: hl.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#1E2532] truncate">{hl.text}</div>
                        <div className="text-xs text-[#6B7C93]">
                          {hl.count} occurrence{hl.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/hl:opacity-100 transition-opacity">
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => { e.stopPropagation(); navigateHighlight(hl.text, 'prev') }}
                          className="p-1 hover:bg-[#EEEEEE] rounded text-[#6B7C93] hover:text-[#1E2532] transition-colors"
                          title="Previous occurrence"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => { e.stopPropagation(); navigateHighlight(hl.text, 'next') }}
                          className="p-1 hover:bg-[#EEEEEE] rounded text-[#6B7C93] hover:text-[#1E2532] transition-colors"
                          title="Next occurrence"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            // Delete all highlight records with this text
                            hl.ids.forEach(hlId => handleRemoveHighlight(hlId))
                          }}
                          className="p-1 hover:bg-[#EEEEEE] rounded text-[#6B7C93] hover:text-[#EF4444] transition-colors"
                          title="Remove highlight"
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}

                  {/* Add Highlight — collapsed / expanded */}
                  <AnimatePresence>
                    {showAddHighlight ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={SPRING_SNAPPY}
                        className="overflow-hidden"
                      >
                        <div className="border border-[#4A7AE5]/30 rounded-lg p-3 bg-white space-y-2">
                          <input
                            type="text"
                            value={addHighlightText}
                            onChange={(e) => setAddHighlightText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && addHighlightText.trim()) {
                                handleAddHighlightFromSidebar(addHighlightText, addHighlightColor)
                                setAddHighlightText('')
                                setShowAddHighlight(false)
                              }
                              if (e.key === 'Escape') {
                                setAddHighlightText('')
                                setShowAddHighlight(false)
                              }
                            }}
                            placeholder="Text to highlight..."
                            className="w-full bg-white rounded px-2 py-1.5 text-xs text-[#1E2532] outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors placeholder:text-[#D5D5D5]"
                            autoFocus
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {HIGHLIGHT_COLORS.map((c) => (
                                <motion.button
                                  key={c.id}
                                  whileHover={{ scale: 1.3 }}
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => setAddHighlightColor(c.color)}
                                  className="w-5 h-5 rounded-full border-2 shadow-sm"
                                  style={{
                                    backgroundColor: c.color,
                                    borderColor: addHighlightColor === c.color ? '#1E2532' : 'white',
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setAddHighlightText(''); setShowAddHighlight(false) }}
                                className="px-2 py-1 rounded text-[10px] font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#EEEEEE] transition-colors"
                              >
                                Cancel
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  if (addHighlightText.trim()) {
                                    handleAddHighlightFromSidebar(addHighlightText, addHighlightColor)
                                    setAddHighlightText('')
                                    setShowAddHighlight(false)
                                  }
                                }}
                                className="px-2 py-1 rounded text-[10px] font-semibold text-white bg-[#4A7AE5] hover:bg-[#3A6AD4] transition-colors"
                              >
                                Add
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.button
                        whileHover={{ ...interactiveHover, borderColor: '#4A7AE5', color: '#4A7AE5' }}
                        whileTap={interactiveTap}
                        onClick={() => setShowAddHighlight(true)}
                        className="w-full px-3 py-2 border border-dashed border-[#EBEBEB] rounded-lg text-xs text-[#6B7C93] transition-colors"
                      >
                        + Add Highlight
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Favorites Section */}
              <div className="p-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
                <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
                  Favorites {favoritedMessages.length > 0 && (
                    <span className="text-[#E5A620] normal-case tracking-normal">
                      ({favoritedMessages.length})
                    </span>
                  )}
                </h3>
                {favoritedMessages.length === 0 ? (
                  <p className="text-xs text-[#D5D5D5]">
                    Star a message to save it here
                  </p>
                ) : (
                  <div
                    className="space-y-2"
                  >
                    {favoritedMessages.map((msg) => (
                      <motion.button
                        key={msg.id}
                        whileHover={interactiveHover}
                        whileTap={interactiveTap}
                        onClick={() => {
                          document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}
                        className="w-full text-left px-3 py-2 bg-white border border-[#F0F0F0] rounded-lg group/fav hover:border-[#E5A620]/40 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Star className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ fill: '#E5A620', color: '#E5A620' }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-[#6B7C93] mb-0.5">
                              {msg.role === 'user' ? 'You' : 'Claude'}
                            </div>
                            <p className="text-xs text-[#1E2532] truncate">
                              {msg.content.slice(0, 80)}{msg.content.length > 80 ? '...' : ''}
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFav(msg.id)
                            }}
                            className="p-1 rounded opacity-0 group-hover/fav:opacity-100 hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#EF4444] transition-all"
                            title="Remove from favorites"
                          >
                            <X className="w-3 h-3" />
                          </motion.button>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Context Health Section */}
              <div className="p-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
                <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
                  Context Health
                </h3>
                <div className="space-y-3">
                  <MetricRow label="Messages" value={hiddenCount > 0 ? `${visibleMessages.length} / ${messages.length}` : `${messages.length}`} />
                  <MetricRow
                    label="Tokens"
                    value={`${totalTokens.toLocaleString()} / ${contextWindow.toLocaleString()}`}
                    color={getContextColor(contextUsage)}
                  />
                  <MetricRow
                    label="Context"
                    value={`${contextUsage}%`}
                    color={getContextColor(contextUsage)}
                  />
                  {/* Context bar */}
                  <div className="relative w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${contextUsage}%` }}
                      transition={{ ...SPRING_GENTLE, delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getContextColor(contextUsage) }}
                    />
                    {/* Threshold marker */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-[#6B7C93]/30"
                      style={{ left: `${contextThreshold}%` }}
                      title={`Threshold: ${contextThreshold}%`}
                    />
                  </div>
                </div>
                {contextUsage >= (contextThreshold / 2) && (
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
                          {contextUsage >= contextThreshold ? 'Context Nearly Full' : 'Approaching Limit'}
                        </div>
                        <div className="text-xs text-[#6B7C93] mt-1">
                          {contextUsage >= contextThreshold
                            ? 'Branch this conversation to free up context space.'
                            : 'Consider compressing the conversation or starting a new branch.'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Branches Section */}
              <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
                  Branches {branches.length > 0 && (
                    <span className="text-[#7C6CD4] normal-case tracking-normal">
                      ({branches.length})
                    </span>
                  )}
                </h3>
                <div
                  className="space-y-2"
                >
                  {/* If we're on a branch, show a link back to parent */}
                  {currentConversation?.parentId && (
                    <BranchItem
                      label="← Parent conversation"
                      messages={0}
                      onClick={() => navigate(`/chat/${currentConversation.parentId}`)}
                    />
                  )}
                  <BranchItem
                    label={currentConversation?.parentId ? (currentConversation.title || 'This branch') : 'Main Thread'}
                    messages={messages.length}
                    active
                  />
                  {branches.map((branch) => (
                    <BranchItem
                      key={branch.id}
                      label={branch.title || 'Untitled branch'}
                      messages={0}
                      onClick={() => navigate(`/chat/${branch.id}`)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Branch Creation Panel Modal */}
      <AnimatePresence>
        {branchPanelMessage && (
          <BranchCreationPanel
            message={branchPanelMessage}
            messageIndex={visibleMessages.findIndex(m => m.id === branchPanelMessage.id) + 1}
            totalMessages={visibleMessages.length}
            contextUsage={contextUsage}
            onClose={() => setBranchPanelMessage(null)}
            onBranchFull={() => {
              handleCreateBranchFull(branchPanelMessage.id)
              setBranchPanelMessage(null)
            }}
            onBranchCompressed={() => {
              handleCreateBranchCompressed(branchPanelMessage.id)
              setBranchPanelMessage(null)
            }}
          />
        )}
      </AnimatePresence>
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
  savedNoteText = '',
  highlights = [],
  onNote, onFavorite, onNoteSave, onHighlight, onContinue, onDelete, onBranch,
  onHide, onCopyText,
}) {
  const [noteText, setNoteText] = useState(savedNoteText)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectionPopover, setSelectionPopover] = useState(null) // { text, x, y }
  const contentRef = useRef(null)

  // Sync if savedNoteText changes (e.g. on load)
  useEffect(() => {
    setNoteText(savedNoteText)
  }, [savedNoteText])

  const handleNoteBlur = () => {
    if (noteText !== savedNoteText) {
      onNoteSave?.(noteText)
    }
  }

  const handleCopy = () => {
    onCopyText?.()
    setCopied(true)
    setShowMenu(false)
    setTimeout(() => setCopied(false), 1500)
  }

  // Text selection handler — show color picker popover
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length < 2) {
      setSelectionPopover(null)
      return
    }

    // Check the selection is within this message's content
    const range = selection.getRangeAt(0)
    if (!contentRef.current?.contains(range.commonAncestorContainer)) {
      setSelectionPopover(null)
      return
    }

    const rect = range.getBoundingClientRect()
    const containerRect = contentRef.current.getBoundingClientRect()

    setSelectionPopover({
      text,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    })
  }, [])

  const handleHighlightColor = (color) => {
    if (selectionPopover?.text) {
      onHighlight?.(selectionPopover.text, color)
    }
    setSelectionPopover(null)
    window.getSelection()?.removeAllRanges()
  }

  // Render content with highlights applied
  const renderContent = useMemo(() => {
    if (!highlights.length || !content) {
      return <span>{content}</span>
    }

    // Build a list of ranges to highlight
    const ranges = []
    for (const hl of highlights) {
      let startIndex = 0
      // Find all occurrences of this highlight text
      while (startIndex < content.length) {
        const idx = content.indexOf(hl.text, startIndex)
        if (idx === -1) break
        ranges.push({ start: idx, end: idx + hl.text.length, color: hl.color })
        startIndex = idx + hl.text.length
      }
    }

    if (ranges.length === 0) return <span>{content}</span>

    // Sort by start position, deduplicate overlaps (first wins)
    ranges.sort((a, b) => a.start - b.start)
    const merged = [ranges[0]]
    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1]
      if (ranges[i].start >= last.end) {
        merged.push(ranges[i])
      }
    }

    // Build fragments
    const fragments = []
    let cursor = 0
    for (const r of merged) {
      if (cursor < r.start) {
        fragments.push(<span key={`t-${cursor}`}>{content.slice(cursor, r.start)}</span>)
      }
      const bgColor = HIGHLIGHT_COLORS.find(c => c.color === r.color)?.bg || 'rgba(74,122,229,0.15)'
      fragments.push(
        <mark
          key={`h-${r.start}`}
          style={{
            backgroundColor: bgColor,
            borderRadius: '2px',
            padding: '0 1px',
            color: 'inherit',
          }}
        >
          {content.slice(r.start, r.end)}
        </mark>
      )
      cursor = r.end
    }
    if (cursor < content.length) {
      fragments.push(<span key={`t-${cursor}`}>{content.slice(cursor)}</span>)
    }
    return <>{fragments}</>
  }, [content, highlights])

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
            {/* Persistent indicators — visible without hover */}
            {(isFavorited || savedNoteText) && (
              <div className="flex items-center gap-1.5">
                {isFavorited && <Star className="w-3 h-3" style={{ fill: '#E5A620', color: '#E5A620' }} />}
                {savedNoteText && <StickyNote className="w-3 h-3 text-[#E5A620]" />}
              </div>
            )}
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
                    <MenuButton icon={Eye} onClick={() => { onHide?.(); setShowMenu(false) }}>
                      Hide message
                    </MenuButton>
                    <MenuButton icon={ArrowRightCircle} onClick={() => setShowMenu(false)}>
                      Move to branch
                    </MenuButton>
                    <MenuButton icon={Copy} onClick={() => setShowMenu(false)}>
                      Duplicate
                    </MenuButton>
                    <MenuButton icon={FileText} onClick={handleCopy}>
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
          <p className="text-sm leading-relaxed text-[#1E2532] whitespace-pre-wrap">
            {renderContent}
          </p>

          {/* Highlight color picker popover */}
          <AnimatePresence>
            {selectionPopover && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ duration: 0.12 }}
                className="absolute z-40 flex items-center gap-1 px-2 py-1.5 bg-white border border-[#EBEBEB] rounded-lg shadow-lg"
                style={{
                  left: Math.max(0, selectionPopover.x - 60),
                  top: selectionPopover.y - 32,
                }}
              >
                <Pencil className="w-3 h-3 text-[#6B7C93] mr-1" />
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
            )}
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
                    onBlur={handleNoteBlur}
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

function BranchItem({ label, messages, active = false, onClick }) {
  return (
    <motion.button
      whileHover={interactiveHover}
      whileTap={interactiveTap}
      onClick={onClick}
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
          {messages > 0 && <div className="text-xs text-[#6B7C93]">{messages} messages</div>}
        </div>
      </div>
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  Branch Creation Panel (Modal)                              */
/* ═══════════════════════════════════════════════════════════ */

function BranchCreationPanel({ message, messageIndex, totalMessages, contextUsage, onClose, onBranchFull, onBranchCompressed }) {
  const [mode, setMode] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [compressed, setCompressed] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  const compressedPct = Math.max(Math.round(contextUsage * 0.12), 2)

  const handleCreate = () => {
    if (!mode || compressing) return
    if (mode === 'compressed') {
      setCompressing(true)
      setTimeout(() => { setCompressing(false); setCompressed(true) }, 1500)
    } else {
      onBranchFull?.()
    }
  }

  const handleOpen = () => { onBranchCompressed?.() }

  let btnLabel = 'Create Branch'
  let BtnIcon = GitBranch
  if (compressing) { btnLabel = 'Compressing...'; BtnIcon = Zap }
  else if (compressed) { btnLabel = 'Open Branch'; BtnIcon = ArrowRight }

  const getColor = (p) => p < 50 ? '#22C55E' : p < 80 ? '#E5A620' : '#EF4444'
  let meterTarget = contextUsage
  if (compressed) meterTarget = compressedPct

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={SPRING_SNAPPY}
        className="relative z-10 bg-white border border-[#EBEBEB] rounded-xl w-full max-w-[420px] flex flex-col"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <div className="p-5 pb-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(124,108,212,0.1)' }}>
                <GitBranch className="w-4 h-4 text-[#7C6CD4]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1E2532]">Create Branch</div>
                <div className="text-[11px] text-[#6B7C93] mt-0.5">Forking from message {messageIndex} of {totalMessages}</div>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-lg text-[#6B7C93] hover:bg-[#EEEEEE] transition-colors">
              <X className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-semibold text-[#6B7C93] uppercase tracking-wider">Context window after branch</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: getColor(meterTarget) }}>{Math.round(meterTarget)}%</span>
            </div>
            <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${meterTarget}%` }} transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }} className="h-full rounded-full" style={{ backgroundColor: getColor(meterTarget) }} />
            </div>
          </div>
        </div>

        {/* Body — mode cards */}
        <div className="p-4 space-y-3">
          {/* Full History */}
          <motion.div
            whileHover={{ borderColor: mode === 'full' ? '#4A7AE5' : '#D5D5D5' }}
            onClick={() => { setMode('full'); setCompressed(false) }}
            className="rounded-lg p-4 cursor-pointer transition-colors"
            style={{ border: mode === 'full' ? '1.5px solid #4A7AE5' : '1px solid #EBEBEB', backgroundColor: mode === 'full' ? 'rgba(74,122,229,0.04)' : '#FFFFFF' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: mode === 'full' ? 'rgba(74,122,229,0.1)' : '#F5F5F5' }}>
                <Copy className="w-4 h-4" style={{ color: mode === 'full' ? '#4A7AE5' : '#6B7C93' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#1E2532]">Full History</div>
                <p className="text-xs text-[#6B7C93] mt-0.5">Copy all {messageIndex} messages as-is. Continue with the same context.</p>
                {mode === 'full' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#FAFAFA] border border-[#F0F0F0] rounded-lg">
                    <Info className="w-3 h-3 text-[#6B7C93] flex-shrink-0" />
                    <span className="text-[11px] text-[#6B7C93]">Branch starts at {contextUsage}% context — same as current conversation</span>
                  </motion.div>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${mode === 'full' ? 'border-[#4A7AE5] bg-[#4A7AE5]' : 'border-[#D5D5D5] bg-white'}`}>
                {mode === 'full' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </motion.div>

          {/* Compressed Summary */}
          <motion.div
            whileHover={{ borderColor: mode === 'compressed' ? '#4A7AE5' : '#D5D5D5' }}
            onClick={() => { setMode('compressed'); setCompressed(false) }}
            className="rounded-lg p-4 cursor-pointer transition-colors"
            style={{ border: mode === 'compressed' ? '1.5px solid #4A7AE5' : '1px solid #EBEBEB', backgroundColor: mode === 'compressed' ? 'rgba(74,122,229,0.04)' : '#FFFFFF' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: mode === 'compressed' ? 'rgba(74,122,229,0.1)' : '#F5F5F5' }}>
                <Zap className="w-4 h-4" style={{ color: mode === 'compressed' ? '#4A7AE5' : '#6B7C93' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#1E2532]">Compressed Summary</span>
                  <span className="text-xs font-semibold text-[#22C55E]">(saves context)</span>
                </div>
                <p className="text-xs text-[#6B7C93] mt-0.5">Start fresh with an AI-generated summary of the conversation so far.</p>
                {mode === 'compressed' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <Zap className="w-3 h-3 text-[#22C55E] flex-shrink-0" />
                      <span className="text-[11px] text-[#22C55E] font-semibold">{contextUsage}% → ~{compressedPct}% — frees up {contextUsage - compressedPct}%</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setPreviewExpanded(!previewExpanded) }} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A7AE5] bg-transparent border-none cursor-pointer p-0">
                      <ChevronRight className="w-3 h-3 transition-transform" style={{ transform: previewExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                      Preview summary
                    </button>
                    <AnimatePresence>
                      {previewExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                          <div className="px-3 py-2.5 bg-[#FAFAFA] border border-[#F0F0F0] rounded-lg">
                            <p className="text-[11px] text-[#4A5568] leading-relaxed italic">Summary will be generated when you create the branch. It captures key decisions, conclusions, and open questions.</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${mode === 'compressed' ? 'border-[#4A7AE5] bg-[#4A7AE5]' : 'border-[#D5D5D5] bg-white'}`}>
                {mode === 'compressed' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid #F0F0F0' }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B7C93] hover:text-[#1E2532] transition-colors">
            Cancel
          </motion.button>
          <motion.button
            whileHover={mode && !compressing ? { scale: 1.03 } : {}}
            whileTap={mode && !compressing ? { scale: 0.97 } : {}}
            onClick={compressed ? handleOpen : handleCreate}
            className="px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
            style={{
              border: mode ? 'none' : '1px solid #EBEBEB',
              background: mode ? 'linear-gradient(to right, #4A7AE5, #7C6CD4)' : '#FFFFFF',
              color: mode ? '#FFFFFF' : '#D5D5D5',
              cursor: mode && !compressing ? 'pointer' : 'not-allowed',
              opacity: (!mode || compressing) ? 0.7 : 1,
            }}
          >
            <BtnIcon className="w-3.5 h-3.5" />
            {btnLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}