import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Square, AlertCircle, ChevronLeft, ChevronRight,
  GitBranch, Trash2, MessageSquare, Search,
  FileText, MoreVertical, StickyNote, Activity, Zap, Star,
  Eye, Copy, ArrowRightCircle, Settings2, BookOpen, PanelRight, X,
  Pencil, Info, ArrowRight, Download, Command,
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
import CollabModal from '../components/CollabModal'
import ReviewModal from '../components/ReviewModal'

/* ── Animation Constants ─────────────────────────────────── */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }
const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 }
const SEND_DEBOUNCE_MS = 500

/* ── Dusty Gold Design Tokens ────────────────────────────── */
/* Used for: favorites star, branch creation moment, milestone flashes */

const DUSTY_GOLD = '#C4A94D'

/* ── Branch creation flash keyframes (injected once) ─────── */

const MILESTONE_STYLE_ID = 'apollo-milestone-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(MILESTONE_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = MILESTONE_STYLE_ID
  style.textContent = `
    @keyframes apolloBranchFlash {
      0% { box-shadow: 0 0 0px rgba(196,169,77,0); }
      50% { box-shadow: 0 0 16px rgba(196,169,77,0.35); }
      100% { box-shadow: 0 0 0px rgba(196,169,77,0); }
    }
    .apollo-branch-flash {
      animation: apolloBranchFlash 0.8s ease-out;
    }
  `
  document.head.appendChild(style)
}

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

/* ── Markdown Styles ─────────────────────────────────────── */
/* Scoped styles for rendered Markdown inside message cards   */

const MD_STYLE_ID = 'apollo-markdown-styles'
if (typeof document !== 'undefined' && !document.getElementById(MD_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = MD_STYLE_ID
  style.textContent = `
    .apollo-md h1, .apollo-md h2, .apollo-md h3,
    .apollo-md h4, .apollo-md h5, .apollo-md h6 {
      font-weight: 600;
      margin-top: 1em;
      margin-bottom: 0.4em;
      line-height: 1.3;
      color: #1E2532;
    }
    .apollo-md h1 { font-size: 1.15em; }
    .apollo-md h2 { font-size: 1.08em; }
    .apollo-md h3 { font-size: 1em; }
    .apollo-md h4, .apollo-md h5, .apollo-md h6 { font-size: 0.92em; }
    .apollo-md p { margin-bottom: 0.6em; }
    .apollo-md p:last-child { margin-bottom: 0; }
    .apollo-md ul, .apollo-md ol {
      margin: 0.4em 0 0.6em 1.2em;
      padding: 0;
    }
    .apollo-md li { margin-bottom: 0.2em; }
    .apollo-md code {
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
      font-size: 0.88em;
      background: rgba(0,0,0,0.05);
      padding: 0.15em 0.35em;
      border-radius: 3px;
    }
    .apollo-md pre {
      background: #F5F5F5;
      border: 1px solid #EBEBEB;
      border-radius: 6px;
      padding: 0.75em 1em;
      overflow-x: auto;
      margin: 0.6em 0;
    }
    .apollo-md pre code {
      background: transparent;
      padding: 0;
      font-size: 0.85em;
    }
    .apollo-md blockquote {
      border-left: 3px solid #EBEBEB;
      padding-left: 0.8em;
      margin: 0.5em 0;
      color: #6B7C93;
    }
    .apollo-md strong { font-weight: 600; }
    .apollo-md a { color: #4A7AE5; text-decoration: underline; }
    .apollo-md hr {
      border: none;
      border-top: 1px solid #EBEBEB;
      margin: 0.8em 0;
    }
    .apollo-md table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.5em 0;
      font-size: 0.9em;
    }
    .apollo-md th, .apollo-md td {
      border: 1px solid #EBEBEB;
      padding: 0.35em 0.6em;
      text-align: left;
    }
    .apollo-md th { background: #F5F5F5; font-weight: 600; }
    .apollo-md mark {
      border-radius: 2px;
      padding: 0 1px;
      color: inherit;
    }
  `
  document.head.appendChild(style)
}


/* ── Case-insensitive search helper ──────────────────────── */

function indexOfCI(str, search, fromIndex = 0) {
  const strLower = str.toLowerCase()
  const searchLower = search.toLowerCase()
  return strLower.indexOf(searchLower, fromIndex)
}

function includesCI(str, search) {
  return str.toLowerCase().includes(search.toLowerCase())
}

// Word-boundary-aware version: only matches if the found substring
// is bounded by non-alphanumeric characters (or string edges)
function indexOfWord(str, search, fromIndex = 0) {
  const strLower = str.toLowerCase()
  const searchLower = search.toLowerCase()
  let pos = fromIndex
  while (pos < strLower.length) {
    const idx = strLower.indexOf(searchLower, pos)
    if (idx === -1) return -1

    // Check word boundaries
    const charBefore = idx > 0 ? strLower[idx - 1] : ' '
    const charAfter = idx + searchLower.length < strLower.length
      ? strLower[idx + searchLower.length]
      : ' '

    const isWordBoundaryBefore = !/[a-z0-9]/.test(charBefore)
    const isWordBoundaryAfter = !/[a-z0-9]/.test(charAfter)

    // For multi-word search terms, only check outer boundaries
    // For single-word terms, require both boundaries
    if (isWordBoundaryBefore && isWordBoundaryAfter) {
      return idx
    }

    // Not a word boundary match — advance past this occurrence
    pos = idx + 1
  }
  return -1
}

function includesWord(str, search) {
  return indexOfWord(str, search) !== -1
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
  const { conversations, updateConversation, loadConversations, createConversation } = useConversations()
  const { settings, refreshStorageEstimate } = useSettings()

  const [inputValue, setInputValue] = useState('')
  const [apiKey, setApiKey] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [hiddenMessages, setHiddenMessages] = useState(new Set())
  const [activePopoverMsgId, setActivePopoverMsgId] = useState(null) // only one color picker at a time
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showCollabModal, setShowCollabModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showSelectChatModal, setShowSelectChatModal] = useState(false)

  // Collaboration mode state
  const [activePresets, setActivePresets] = useState(new Set())
  const [customInstruction, setCustomInstruction] = useState('')

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
  const [compressBannerDismissed, setCompressBannerDismissed] = useState(false)
  const [pendingDeletes, setPendingDeletes] = useState([]) // [{ msgId, timeoutId }]
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
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const lastSendTimeRef = useRef(0)
  const seenMessageIds = useRef(new Set())
  const clearMessagesRef = useRef(clearMessages)
  clearMessagesRef.current = clearMessages

  const getContextColor = (u) => u < (contextThreshold / 2) ? '#22C55E' : u < contextThreshold ? '#E5A620' : '#EF4444'

  const togglePreset = useCallback((presetId) => {
    setActivePresets(prev => {
      const n = new Set(prev)
      n.has(presetId) ? n.delete(presetId) : n.add(presetId)
      return n
    })
  }, [])

  const toggleNote = (msgId) =>
    setShowNotes((prev) => {
      const n = new Set(prev)
      n.has(msgId) ? n.delete(msgId) : n.add(msgId)
      return n
    })

  const toggleFav = useCallback(async (msgId) => {
    const existing = favoritesMap.get(msgId)
    if (existing) {
      try { await deleteFavorite(existing.id) } catch {}
      setFavoritesMap(prev => { const n = new Map(prev); n.delete(msgId); return n })
    } else {
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
        try {
          const updated = await updateNote(existing.id, text)
          setNotesMap(prev => new Map(prev).set(msgId, updated))
        } catch {}
      } else {
        try { await deleteNote(existing.id) } catch {}
        setNotesMap(prev => { const n = new Map(prev); n.delete(msgId); return n })
      }
    } else if (text.trim()) {
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
    // ── case-insensitive match ──
    const firstMatch = visibleMessages.find(m => m.content && includesWord(m.content, text.trim()))
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
  // ── case-insensitive ──
  const getHighlightOccurrences = useCallback((text) => {
    const occurrences = []
    for (const msg of visibleMessages) {
      if (msg.content && includesWord(msg.content, text)) {
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
      const updatedBranches = await getBranches(id)
      setBranches(updatedBranches)
      navigate(`/chat/${branchConv.id}`)
    } catch (err) {
      console.error('Branch creation failed:', err)
    }
  }, [id, navigate, loadConversations])

  // Branch creation — "Compressed Summary" mode
  const handleCreateBranchCompressed = useCallback(async (messageId) => {
    if (!apiKey) return
    try {
      const provider = getProvider('anthropic')
      const branchIdx = visibleMessages.findIndex(m => m.id === messageId)
      const branchMessages = visibleMessages.slice(0, branchIdx + 1)
      const summaryMessages = branchMessages
        .map(m => ({ role: m.role, content: m.content?.slice(0, 500) || '' }))
      summaryMessages.push({
        role: 'user',
        content: 'Provide a concise summary of our conversation so far. Focus on key decisions, conclusions, and open questions. Keep it under 200 words. Respond with ONLY the summary, no preamble.',
      })

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

      const parentConv = await getConversation(id)
      const title = `Summary: ${parentConv?.title || 'conversation'}`
      const branchConv = await createConversation({
        title,
        model: parentConv?.model || settings.defaultModel,
        parentId: id,
        branchPoint: messageId,
      })

      await addMessage({
        conversationId: branchConv.id,
        role: 'assistant',
        content: summaryText.trim(),
        tokenCount: 0,
      })

      await loadConversations()
      const updatedBranches = await getBranches(id)
      setBranches(updatedBranches)
      navigate(`/chat/${branchConv.id}`)
    } catch (err) {
      console.error('Compressed branch failed:', err)
      await handleCreateBranchFull(messageId)
    }
  }, [id, apiKey, visibleMessages, settings.defaultModel, navigate, loadConversations, handleCreateBranchFull])

  // New chat — create a conversation and navigate to it
  const handleNewChat = useCallback(async () => {
    const conv = await createConversation()
    navigate(`/chat/${conv.id}`)
  }, [createConversation, navigate])

  // Preview summary for the branch creation panel — generates but does NOT create the branch
  const handlePreviewSummary = useCallback(async (messageId) => {
    if (!apiKey) throw new Error('No API key configured.')
    const provider = getProvider('anthropic')
    const branchIdx = visibleMessages.findIndex(m => m.id === messageId)
    const branchMessages = visibleMessages.slice(0, branchIdx + 1)
    const summaryMessages = branchMessages
      .map(m => ({ role: m.role, content: m.content?.slice(0, 500) || '' }))
    summaryMessages.push({
      role: 'user',
      content: 'Provide a concise summary of our conversation so far. Focus on key decisions, conclusions, and open questions. Keep it under 200 words. Respond with ONLY the summary, no preamble.',
    })
    let summaryText = ''
    await provider.sendMessage(
      apiKey,
      summaryMessages,
      'claude-haiku',
      (chunk) => { summaryText += chunk },
      new AbortController().signal
    )
    if (!summaryText.trim()) throw new Error('Empty summary generated')
    return summaryText.trim()
  }, [apiKey, visibleMessages])

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

  const handleDelete = useCallback((msgId) => {
    hideMessage(msgId)
    const timeoutId = setTimeout(async () => {
      try { await deleteMessage(msgId) } catch {}
      setPendingDeletes(prev => prev.filter(p => p.msgId !== msgId))
    }, 20000)
    setPendingDeletes(prev => [...prev, { msgId, timeoutId }])
  }, [hideMessage])

  const handleUndoDelete = useCallback((msgId) => {
    setPendingDeletes(prev => {
      const entry = prev.find(p => p.msgId === msgId)
      if (entry) clearTimeout(entry.timeoutId)
      return prev.filter(p => p.msgId !== msgId)
    })
    unhideMessage(msgId)
  }, [unhideMessage])

  const handleCopyText = useCallback(async (content) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
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

  // Build the combined system prompt from active collab presets + custom instruction
  const buildCollabSystemPrompt = useCallback(() => {
    const parts = []
    // Import preset definitions
    const presetDefs = [
      { id: 'challenge', prompt: 'Before presenting any artifact or substantial output, critically evaluate it first. Identify assumptions, potential gaps, and weaknesses. Present your self-critique alongside the output.' },
      { id: 'reasoning', prompt: 'Walk me through your reasoning before giving me the answer. Show your thought process step by step.' },
      { id: 'pushback', prompt: "Push back if my assumptions are wrong. Don't just agree with me — tell me when you think I'm heading in the wrong direction." },
      { id: 'alternatives', prompt: "When answering, provide alternative approaches or perspectives. Don't just give one answer — show me the landscape of options." },
      { id: 'uncertainty', prompt: "Tell me what you're uncertain about. Distinguish between what you're confident in and where you're making educated guesses." },
    ]
    for (const p of presetDefs) {
      if (activePresets.has(p.id)) parts.push(p.prompt)
    }
    if (customInstruction?.trim()) parts.push(customInstruction.trim())
    return parts.length > 0 ? parts.join('\n\n') : ''
  }, [activePresets, customInstruction])

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
      const collabPrompt = buildCollabSystemPrompt()
      await sendMessage(apiKey, id, trimmed, settings.defaultModel, provider, collabPrompt)
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
  }, [inputValue, isStreaming, apiKey, id, settings.defaultModel, sendMessage, refreshStorageEstimate, buildCollabSystemPrompt])

  const handleContinue = useCallback(async (messageId) => {
    if (!apiKey) return
    setApiError(null)
    try {
      const provider = getProvider('anthropic')
      const collabPrompt = buildCollabSystemPrompt()
      await continueMessage(apiKey, messageId, settings.defaultModel, provider, collabPrompt)
      await refreshStorageEstimate()
    } catch (error) {
      if (error.name !== 'AbortError') {
        setApiError({ type: 'generic', message: error.message || 'Failed to continue. Please try again.' })
      }
    }
  }, [apiKey, settings.defaultModel, continueMessage, refreshStorageEstimate, buildCollabSystemPrompt])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      isStreaming ? stopGenerating() : handleSend()
    }
  }

  /* ── Export to Markdown ──────────────────────────────────── */

  const handleExportMarkdown = useCallback(() => {
    if (messages.length === 0) return

    const title = currentConversation?.title || 'Conversation'
    const date = new Date().toISOString().split('T')[0]
    const lines = []

    lines.push(`# ${title}`)
    lines.push(``)
    lines.push(`*Exported ${date} — ${messages.length} messages*`)
    lines.push(``)

    // Highlights summary
    if (highlightsList.length > 0) {
      const uniqueTerms = [...new Set(highlightsList.map(h => h.text))]
      lines.push(`## Highlights`)
      lines.push(``)
      uniqueTerms.forEach(t => lines.push(`- ${t}`))
      lines.push(``)
    }

    // Favorites summary
    const favMsgs = messages.filter(m => favoritesMap.has(m.id))
    if (favMsgs.length > 0) {
      lines.push(`## Favorites`)
      lines.push(``)
      favMsgs.forEach((m, i) => {
        const preview = m.content.slice(0, 120).replace(/\n/g, ' ')
        lines.push(`${i + 1}. **${m.role === 'user' ? 'You' : 'Claude'}:** ${preview}${m.content.length > 120 ? '...' : ''}`)
      })
      lines.push(``)
    }

    // Messages
    lines.push(`---`)
    lines.push(``)

    for (const msg of messages) {
      const label = msg.role === 'user' ? '### You' : '### Claude'
      const isFav = favoritesMap.has(msg.id) ? ' ⭐' : ''
      lines.push(`${label}${isFav}`)
      lines.push(``)
      lines.push(msg.content)
      lines.push(``)

      // Include note if present
      const note = notesMap.get(msg.id)
      if (note?.text) {
        lines.push(`> **Note:** ${note.text}`)
        lines.push(``)
      }
    }

    // Trigger download
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}-${date}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [messages, currentConversation, highlightsList, favoritesMap, notesMap])

  /* ── Compress Context (opens branch panel for last message) */

  const handleCompressContext = useCallback(() => {
    if (visibleMessages.length === 0) return
    // Open the branch creation panel from the last message
    const lastMsg = visibleMessages[visibleMessages.length - 1]
    setBranchPanelMessage(lastMsg)
  }, [visibleMessages])

  /* ── Auto-compress trigger ──────────────────────────────── */

  // Reset dismissed state when context drops back below threshold
  useEffect(() => {
    if (contextUsage < contextThreshold) {
      setCompressBannerDismissed(false)
    }
  }, [contextUsage, contextThreshold])

  // Fire auto-compress when threshold is crossed
  useEffect(() => {
    if (
      contextUsage >= contextThreshold &&
      settings.autoCompress === 'automatic' &&
      !isStreaming &&
      visibleMessages.length > 0 &&
      !branchPanelMessage
    ) {
      handleCompressContext()
    }
  }, [contextUsage, contextThreshold, settings.autoCompress, isStreaming, visibleMessages.length, branchPanelMessage, handleCompressContext])

  /* ── Global Keyboard Shortcuts ─────────────────────────── */

  useEffect(() => {
    const handler = (e) => {
      const isMod = e.metaKey || e.ctrlKey
      const tag = document.activeElement?.tagName

      // Don't intercept when typing in inputs/textareas (except specific combos)
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA'

      // Ctrl/Cmd + Enter — send message (works even in textarea)
      if (isMod && e.key === 'Enter') {
        e.preventDefault()
        isStreaming ? stopGenerating() : handleSend()
        return
      }

      // Escape — stop streaming or close modals
      if (e.key === 'Escape') {
        if (isStreaming) { stopGenerating(); return }
        if (showShortcutsModal) { setShowShortcutsModal(false); return }
        if (showSelectChatModal) { setShowSelectChatModal(false); return }
        if (showCollabModal) { setShowCollabModal(false); return }
        if (showReviewModal) { setShowReviewModal(false); return }
        if (branchPanelMessage) { setBranchPanelMessage(null); return }
        return
      }

      // Ctrl/Cmd + ? (or Ctrl+Shift+/) — toggle keyboard shortcuts
      if (isMod && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault()
        setShowShortcutsModal(prev => !prev)
        return
      }

      // Skip remaining shortcuts if user is typing
      if (isTyping) return

      // Ctrl/Cmd + Shift + E — export to markdown
      if (isMod && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        handleExportMarkdown()
        return
      }

      // Ctrl/Cmd + H — toggle right sidebar
      if (isMod && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault()
        setRightSidebarCollapsed(prev => !prev)
        return
      }

      // Ctrl/Cmd + / — toggle right sidebar (alias)
      if (isMod && e.key === '/') {
        e.preventDefault()
        setRightSidebarCollapsed(prev => !prev)
        return
      }

      // Ctrl/Cmd + K — select chat (quick switcher)
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setShowSelectChatModal(prev => !prev)
        return
      }

      // Ctrl/Cmd + Shift + N — new chat
      if (isMod && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        handleNewChat()
        return
      }

      // Ctrl/Cmd + Shift + B — branch conversation from last message
      if (isMod && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault()
        handleCompressContext()
        return
      }

      // Ctrl/Cmd + . — focus input
      if (isMod && e.key === '.') {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }

      // Home — scroll to top of conversation
      if (e.key === 'Home') {
        e.preventDefault()
        messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // End — scroll to bottom of conversation
      if (e.key === 'End') {
        e.preventDefault()
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        return
      }

      // Ctrl/Cmd + Shift + C — open Collaboration Mode
      if (isMod && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault()
        setShowCollabModal(prev => !prev)
        return
      }

      // Ctrl/Cmd + Shift + R — open Review
      if (isMod && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault()
        setShowReviewModal(prev => !prev)
        return
      }

    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isStreaming, stopGenerating, handleSend, showShortcutsModal, showSelectChatModal, showCollabModal, showReviewModal, branchPanelMessage, handleExportMarkdown, handleCompressContext, handleNewChat])

  /* ── Derive TOC and sidebar data ──────────────────────── */

  const tocItems = visibleMessages
    .filter(msg => msg.role === 'user')
    .map((msg) => ({
      id: msg.id,
      label: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
    }))

  const favoritedMessages = visibleMessages.filter((m) => favoritesMap.has(m.id))

  // Unique highlight terms with occurrence counts — case-insensitive
  const uniqueHighlights = useMemo(() => {
    const seen = new Map()
    for (const hl of highlightsList) {
      const key = hl.text.toLowerCase()
      if (!seen.has(key)) {
        let count = 0
        for (const msg of visibleMessages) {
          if (!msg.content) continue
          let idx = 0
          while ((idx = indexOfWord(msg.content, hl.text, idx)) !== -1) {
            count++
            idx += hl.text.length
          }
        }
        seen.set(key, { text: hl.text, color: hl.color, count, ids: [hl.id] })
      } else {
        seen.get(key).ids.push(hl.id)
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
          </motion.div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>
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

        <div className="px-4 pb-4 pt-3 flex-shrink-0">
          <motion.div
            variants={staggerContainer}
            initial={false}
            animate="show"
            className="space-y-1"
          >
            <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-2">
              Actions
            </h3>
            <ActionButton icon={Settings2} onClick={() => setShowCollabModal(true)} badge={activePresets.size > 0 ? activePresets.size : null}>Collaboration Mode</ActionButton>
            <ActionButton icon={BookOpen} onClick={() => setShowReviewModal(true)}>Review</ActionButton>
            <ActionButton icon={FileText} onClick={handleExportMarkdown}>Export to Markdown</ActionButton>
            <ActionButton icon={Activity} onClick={handleCompressContext}>Compress Context</ActionButton>
            <ActionButton icon={Zap} onClick={() => setShowShortcutsModal(true)}>Keyboard Shortcuts</ActionButton>
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
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4"
          onMouseDown={() => {
            // Dismiss any active highlight popover when clicking in the messages area
            // (the popover's own clicks stopPropagation, so they won't trigger this)
            if (activePopoverMsgId) setActivePopoverMsgId(null)
          }}
        >
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
                isPopoverActive={activePopoverMsgId === msg.id}
                onPopoverChange={(active) => setActivePopoverMsgId(active ? msg.id : null)}
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

        {/* Undo delete toast */}
        <AnimatePresence>
          {pendingDeletes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={SPRING_SNAPPY}
              className="mx-4 mb-2 px-4 py-3 rounded-xl border border-[#EBEBEB] bg-white shadow-sm flex items-center justify-between gap-3"
            >
              <span className="text-xs text-[#4A5568]">
                {pendingDeletes.length === 1 ? 'Message deleted' : `${pendingDeletes.length} messages deleted`}
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleUndoDelete(pendingDeletes[pendingDeletes.length - 1].msgId)}
                className="text-xs font-semibold text-[#4A7AE5] hover:text-[#3A6AD4] transition-colors shrink-0"
              >
                Undo
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-compress banner */}
        <AnimatePresence>
          {contextUsage >= contextThreshold &&
           settings.autoCompress === 'prompt' &&
           !compressBannerDismissed &&
           visibleMessages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={SPRING_SNAPPY}
              className="mx-4 mb-2 px-4 py-3 rounded-xl border border-[#E5A620]/40 bg-[#E5A620]/5 flex items-center gap-3"
            >
              <Activity className="w-4 h-4 text-[#E5A620] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1E2532]">
                  Context window is {contextUsage}% full
                </p>
                <p className="text-xs text-[#6B7C93] mt-0.5">
                  Branch this conversation to continue with a fresh context window.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCompressContext}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] shrink-0 flex items-center gap-1.5"
              >
                <GitBranch className="w-3 h-3" />
                Branch now
              </motion.button>
              <button
                onClick={() => setCompressBannerDismissed(true)}
                className="text-[#6B7C93] hover:text-[#1E2532] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
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
              <div className="p-4 pb-6">
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
                <div className="space-y-2">
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

                  {/* Add Highlight */}
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

              {/* Favorites Section — dusty gold star treatment */}
              <div className="p-4 pb-6">
                <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
                  Favorites {favoritedMessages.length > 0 && (
                    <span style={{ color: DUSTY_GOLD }} className="normal-case tracking-normal">
                      ({favoritedMessages.length})
                    </span>
                  )}
                </h3>
                {favoritedMessages.length === 0 ? (
                  <p className="text-xs text-[#D5D5D5]">
                    Star a message to save it here
                  </p>
                ) : (
                  <div className="space-y-2">
                    {favoritedMessages.map((msg) => (
                      <motion.button
                        key={msg.id}
                        whileHover={interactiveHover}
                        whileTap={interactiveTap}
                        onClick={() => {
                          document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}
                        className="w-full text-left px-3 py-2 bg-white border border-[#F0F0F0] rounded-lg group/fav transition-colors"
                        style={{ '--hover-border': DUSTY_GOLD + '66' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = DUSTY_GOLD + '66'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#F0F0F0'}
                      >
                        <div className="flex items-start gap-2">
                          {/* Dusty gold star with warm shadow and soft corners */}
                          <Star
                            className="w-3 h-3 mt-0.5 flex-shrink-0"
                            style={{
                              fill: DUSTY_GOLD,
                              color: DUSTY_GOLD,
                              strokeLinejoin: 'round',
                              strokeLinecap: 'round',
                            }}
                          />
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
              <div className="p-4 pb-6">
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
                  <div className="relative w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${contextUsage}%` }}
                      transition={{ ...SPRING_GENTLE, delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getContextColor(contextUsage) }}
                    />
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
                <div className="space-y-2">
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
            onPreviewSummary={handlePreviewSummary}
          />
        )}
      </AnimatePresence>

      {/* Select Chat Modal (Ctrl+K) */}
      <AnimatePresence>
        {showSelectChatModal && (
          <SelectChatModal
            conversations={conversations}
            currentId={id}
            onClose={() => setShowSelectChatModal(false)}
            onSelect={(convId) => { navigate(`/chat/${convId}`); setShowSelectChatModal(false) }}
          />
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
        )}
      </AnimatePresence>

      {/* Collaboration Mode Modal */}
      <AnimatePresence>
        {showCollabModal && (
          <CollabModal
            onClose={() => setShowCollabModal(false)}
            activePresets={activePresets}
            onTogglePreset={togglePreset}
            customInstruction={customInstruction}
            onCustomInstructionChange={setCustomInstruction}
          />
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <ReviewModal
            onClose={() => setShowReviewModal(false)}
            messages={messages}
            highlights={highlightsList}
            notes={Array.from(notesMap.values())}
            favorites={favoritedMessages}
            branches={branches}
            tokenUsage={tokenUsage}
            contextUsage={contextUsage}
            onExportMarkdown={handleExportMarkdown}
            onGenerateSynthesis={async (options) => {
              // Build a synthesis prompt from the conversation and annotations
              if (!apiKey) throw new Error('No API key configured.')
              const provider = getProvider('anthropic')
              const depth = options.depth === 'detailed' ? 'detailed' : 'brief'

              let annotationContext = ''
              if (options.includeHighlights && highlightsList.length > 0) {
                const terms = [...new Set(highlightsList.map(h => h.text))].join(', ')
                annotationContext += `\nHighlighted terms: ${terms}`
              }
              if (options.includeNotes && notesMap.size > 0) {
                const noteTexts = Array.from(notesMap.values()).map(n => n.text).join('; ')
                annotationContext += `\nUser notes: ${noteTexts}`
              }
              if (options.includeFavorites && favoritedMessages.length > 0) {
                const favPreviews = favoritedMessages.map(m => m.content.slice(0, 100)).join('; ')
                annotationContext += `\nFavorited messages: ${favPreviews}`
              }

              const synthMessages = messages
                .slice(-20)
                .map(m => ({ role: m.role, content: m.content?.slice(0, 300) || '' }))
              synthMessages.push({
                role: 'user',
                content: `Provide a ${depth} synthesis of our conversation.${annotationContext}\n\nFocus on: key decisions, conclusions, open questions, and action items. ${depth === 'brief' ? 'Keep it under 150 words.' : 'Be thorough but concise, under 400 words.'} Respond with ONLY the synthesis.`,
              })

              let result = ''
              await provider.sendMessage(
                apiKey,
                synthMessages,
                'claude-haiku',
                (chunk) => { result += chunk },
                new AbortController().signal
              )
              return result.trim()
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
  isPopoverActive = false, onPopoverChange,
  onNote, onFavorite, onNoteSave, onHighlight, onContinue, onDelete, onBranch,
  onHide, onCopyText,
}) {
  const [noteText, setNoteText] = useState(savedNoteText)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [popoverPos, setPopoverPos] = useState(null) // { text, x, y } — position only, visibility controlled by parent
  const contentRef = useRef(null)

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

  // Favorite click — straight passthrough, no animation
  const handleFavoriteClick = () => {
    onFavorite?.()
  }

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
      y: rect.top - containerRect.top - 8,
    })
    onPopoverChange?.(true)
  }, [onPopoverChange])

  const handleHighlightColor = (color) => {
    if (popoverPos?.text) {
      onHighlight?.(popoverPos.text, color)
    }
    setPopoverPos(null)
    onPopoverChange?.(false)
    window.getSelection()?.removeAllRanges()
  }

  // ── Render content with highlights + Markdown ──────────
  //
  // Strategy: render Markdown first via ReactMarkdown with custom
  // component renderers. For each text-bearing element (p, li, td,
  // strong, em, etc.) we intercept the children and apply highlight
  // matching on the raw text fragments, wrapping matches in <mark>.

  // Build a sorted, merged list of highlight terms for reuse
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

    // Helper: walk React children and apply highlights to string nodes
    function applyHighlights(children) {
      if (!highlightTerms.length) return children

      return React.Children.map(children, (child) => {
        // Only process string nodes
        if (typeof child === 'string') {
          return highlightString(child)
        }
        // Recurse into React elements that have children
        if (child && child.props && child.props.children) {
          return React.cloneElement(child, {
            ...child.props,
            children: applyHighlights(child.props.children),
          })
        }
        return child
      })
    }

    // Split a string by highlight matches and return fragments with <mark>
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

      // Sort and merge (first wins on overlap)
      ranges.sort((a, b) => a.start - b.start)
      const merged = [ranges[0]]
      for (let i = 1; i < ranges.length; i++) {
        const last = merged[merged.length - 1]
        if (ranges[i].start >= last.end) {
          merged.push(ranges[i])
        }
      }

      const fragments = []
      let cursor = 0
      for (const r of merged) {
        if (cursor < r.start) {
          fragments.push(text.slice(cursor, r.start))
        }
        fragments.push(
          <mark
            key={`hl-${r.start}`}
            style={{
              backgroundColor: r.bg,
              borderRadius: '2px',
              padding: '0 1px',
              color: 'inherit',
            }}
          >
            {text.slice(r.start, r.end)}
          </mark>
        )
        cursor = r.end
      }
      if (cursor < text.length) {
        fragments.push(text.slice(cursor))
      }
      return fragments
    }

    // Custom components that apply highlight processing to their children
    const highlightedComponents = highlightTerms.length > 0 ? {
      p: ({ children, ...props }) => <p {...props}>{applyHighlights(children)}</p>,
      li: ({ children, ...props }) => <li {...props}>{applyHighlights(children)}</li>,
      td: ({ children, ...props }) => <td {...props}>{applyHighlights(children)}</td>,
      th: ({ children, ...props }) => <th {...props}>{applyHighlights(children)}</th>,
      strong: ({ children, ...props }) => <strong {...props}>{applyHighlights(children)}</strong>,
      em: ({ children, ...props }) => <em {...props}>{applyHighlights(children)}</em>,
      h1: ({ children, ...props }) => <h1 {...props}>{applyHighlights(children)}</h1>,
      h2: ({ children, ...props }) => <h2 {...props}>{applyHighlights(children)}</h2>,
      h3: ({ children, ...props }) => <h3 {...props}>{applyHighlights(children)}</h3>,
      h4: ({ children, ...props }) => <h4 {...props}>{applyHighlights(children)}</h4>,
      blockquote: ({ children, ...props }) => <blockquote {...props}>{applyHighlights(children)}</blockquote>,
    } : {}

    return (
      <div className="apollo-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={highlightedComponents}
        >
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
        className={`rounded-xl border transition-colors ${
          isGhostText ? 'border-dashed border-[#D5D5D5]' : 'border-[#EBEBEB]'
        }`}
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header row */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#D5D5D5] opacity-0 group-hover:opacity-100 transition-opacity">
              #{number}
            </span>
            {(isFavorited || savedNoteText) && (
              <div className="flex items-center gap-1.5">
                {isFavorited && (
                  <Star
                    className="w-3 h-3"
                    style={{
                      fill: DUSTY_GOLD,
                      color: DUSTY_GOLD,
                      strokeLinejoin: 'round',
                    }}
                  />
                )}
                {savedNoteText && <StickyNote className="w-3 h-3 text-[#E5A620]" />}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <MsgIconButton
              onClick={handleFavoriteClick}
              active={isFavorited}
              title="Favorite"
            >
              <Star
                className="w-3.5 h-3.5"
                style={isFavorited ? {
                  fill: DUSTY_GOLD,
                  color: DUSTY_GOLD,
                  strokeLinejoin: 'round',
                } : {}}
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

        {/* Content — Markdown rendered */}
        <div className="px-4 py-4 overflow-hidden relative" ref={contentRef} onMouseUp={handleMouseUp}>
          <div className="text-sm leading-relaxed text-[#1E2532]">
            {renderContent}
          </div>

          {/* Highlight color picker popover — flips below if near top */}
          <AnimatePresence>
            {isPopoverActive && popoverPos && (() => {
              const showBelow = popoverPos.y < 40
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: showBelow ? -4 : 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: showBelow ? -4 : 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute z-40 flex items-center gap-1 px-2 py-1.5 bg-white border border-[#EBEBEB] rounded-lg shadow-lg"
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    left: Math.max(0, popoverPos.x - 60),
                    top: showBelow
                      ? popoverPos.y + 24
                      : popoverPos.y - 32,
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
/*  Select Chat Modal (Ctrl+K quick switcher)                  */
/* ═══════════════════════════════════════════════════════════ */

function SelectChatModal({ conversations, currentId, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    if (!q) return sorted.slice(0, 12)
    return sorted
      .filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.aiSummary?.toLowerCase().includes(q)
      )
      .slice(0, 12)
  }, [conversations, query])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="relative z-10 bg-white border border-[#EBEBEB] rounded-xl w-full max-w-[480px] overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <Search className="w-4 h-4 text-[#D5D5D5] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && filtered.length > 0) onSelect(filtered[0].id)
            }}
            placeholder="Search chats..."
            className="flex-1 text-sm text-[#1E2532] bg-transparent outline-none placeholder:text-[#D5D5D5]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#D5D5D5] hover:text-[#6B7C93] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[#D5D5D5]">No chats found</p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="w-full text-left px-4 py-2.5 transition-colors"
                style={{ backgroundColor: c.id === currentId ? '#F5F7FF' : 'transparent' }}
                onMouseEnter={e => { if (c.id !== currentId) e.currentTarget.style.backgroundColor = '#FAFAFA' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = c.id === currentId ? '#F5F7FF' : 'transparent' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-[#D5D5D5] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1E2532] truncate font-medium"
                      style={{ color: c.id === currentId ? '#4A7AE5' : '#1E2532' }}>
                      {c.title || 'New Conversation'}
                    </p>
                    {c.aiSummary && (
                      <p className="text-[11px] text-[#9CA7B8] truncate mt-0.5">{c.aiSummary}</p>
                    )}
                  </div>
                  {c.id === currentId && (
                    <span className="text-[10px] font-semibold text-[#4A7AE5] flex-shrink-0">current</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 flex items-center gap-1" style={{ borderTop: '1px solid #F0F0F0' }}>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[#EBEBEB] bg-[#FAFAFA] text-[#6B7C93]" style={{ fontFamily: 'monospace' }}>↵</kbd>
          <span className="text-[10px] text-[#D5D5D5] ml-1">to open</span>
          <span className="text-[10px] text-[#D5D5D5] mx-2">·</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[#EBEBEB] bg-[#FAFAFA] text-[#6B7C93]" style={{ fontFamily: 'monospace' }}>Esc</kbd>
          <span className="text-[10px] text-[#D5D5D5] ml-1">to close</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  Branch Creation Panel (Modal) — with dusty gold flash     */
/* ═══════════════════════════════════════════════════════════ */

function BranchCreationPanel({ message, messageIndex, totalMessages, contextUsage, onClose, onBranchFull, onBranchCompressed, onPreviewSummary }) {
  const [mode, setMode] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [compressed, setCompressed] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [previewContent, setPreviewContent] = useState(null)   // null = not fetched, string = cached result
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)

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
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(124,108,212,0.1)',
                }}
              >
                <GitBranch
                  className="w-4 h-4"
                  style={{
                    color: '#7C6CD4',
                  }}
                />
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
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (!previewExpanded) {
                          setPreviewExpanded(true)
                          // Only fetch if not already cached
                          if (previewContent === null && !previewLoading) {
                            setPreviewLoading(true)
                            setPreviewError(null)
                            try {
                              const text = await onPreviewSummary(message.id)
                              setPreviewContent(text)
                            } catch (err) {
                              setPreviewError('Could not generate preview. You can still create the branch.')
                            } finally {
                              setPreviewLoading(false)
                            }
                          }
                        } else {
                          setPreviewExpanded(false)
                        }
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A7AE5] bg-transparent border-none cursor-pointer p-0"
                    >
                      <ChevronRight className="w-3 h-3 transition-transform" style={{ transform: previewExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                      {previewLoading ? 'Generating preview...' : 'Preview summary'}
                    </button>
                    <AnimatePresence>
                      {previewExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                          <div className="px-3 py-2.5 bg-[#FAFAFA] border border-[#F0F0F0] rounded-lg">
                            {previewLoading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-[#4A7AE5] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                <p className="text-[11px] text-[#6B7C93]">Generating summary...</p>
                              </div>
                            ) : previewError ? (
                              <p className="text-[11px] text-[#E5A620] leading-relaxed">{previewError}</p>
                            ) : previewContent ? (
                              <p className="text-[11px] text-[#4A5568] leading-relaxed">{previewContent}</p>
                            ) : null}
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

        {/* Footer — dusty gold gradient CTA */}
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
              background: mode
                ? 'linear-gradient(to right, #C9A84C, #C4A94D)'
                : '#FFFFFF',
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

/* ═══════════════════════════════════════════════════════════ */
/*  Keyboard Shortcuts Modal                                   */
/* ═══════════════════════════════════════════════════════════ */

const SHORTCUTS = [
  { keys: ['Ctrl', 'Enter'], desc: 'Send message (or stop streaming)' },
  { keys: ['Shift', 'Enter'], desc: 'New line in message input' },
  { keys: ['Escape'], desc: 'Stop streaming / close modal' },
  { keys: ['Ctrl', 'Shift', 'N'], desc: 'New chat' },
  { keys: ['Ctrl', 'K'], desc: 'Select chat' },
  { keys: ['Ctrl', 'Shift', 'E'], desc: 'Export to Markdown' },
  { keys: ['Ctrl', 'Shift', 'B'], desc: 'Branch conversation' },
  { keys: ['Ctrl', 'Shift', 'C'], desc: 'Collaboration Mode' },
  { keys: ['Ctrl', 'Shift', 'R'], desc: 'Review' },
  { keys: ['Ctrl', 'H'], desc: 'Toggle right panel' },
  { keys: ['Ctrl', '.'], desc: 'Focus message input' },
  { keys: ['Home'], desc: 'Scroll to top' },
  { keys: ['End'], desc: 'Scroll to bottom' },
  { keys: ['Ctrl', 'Shift', '?'], desc: 'Toggle keyboard shortcuts' },
]

// Detect Mac for display
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

function ShortcutsModal({ onClose }) {
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
        className="relative z-10 bg-white border border-[#EBEBEB] rounded-xl w-full max-w-sm flex flex-col"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(74,122,229,0.1)' }}>
              <Command className="w-4 h-4 text-[#4A7AE5]" />
            </div>
            <div className="text-sm font-semibold text-[#1E2532]">Keyboard Shortcuts</div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-lg text-[#6B7C93] hover:bg-[#EEEEEE] transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 space-y-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-[#4A5568]">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#6B7C93] border border-[#EBEBEB] bg-[#FAFAFA]"
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', minWidth: 22, textAlign: 'center' }}
                  >
                    {k === 'Ctrl' ? (IS_MAC ? '⌘' : 'Ctrl') : k === 'Shift' ? (IS_MAC ? '⇧' : 'Shift') : k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-1">
          <p className="text-[10px] text-[#D5D5D5] text-center">
            Press <kbd className="px-1 py-0.5 rounded text-[10px] font-semibold border border-[#EBEBEB] bg-[#FAFAFA]" style={{ fontFamily: 'monospace' }}>{IS_MAC ? '⌘' : 'Ctrl'}</kbd> + <kbd className="px-1 py-0.5 rounded text-[10px] font-semibold border border-[#EBEBEB] bg-[#FAFAFA]" style={{ fontFamily: 'monospace' }}>?</kbd> anytime to toggle
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}