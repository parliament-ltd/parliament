import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  GitBranch, Trash2, StickyNote, Star, Copy, X, ArrowUp, FileText, Eye,
  Settings2, BookOpen, Zap, Square, AlertCircle, Highlighter, ChevronDown,
  ArrowRightCircle, GripHorizontal, List, MessageSquare,
} from 'lucide-react'
import { useChat } from '../../stores/ChatContext'
import { useConversations } from '../../stores/ConversationContext'
import { useSettings } from '../../stores/SettingsContext'
import { getProvider } from '../../providers'
import { loadApiKey } from '../../lib/crypto'
import {
  getFavorites, addFavorite, deleteFavorite,
  getNotes, addNote, updateNote, deleteNote,
  getHighlights, addHighlight, deleteHighlight,
  deleteMessage, getBranches,
  getConversation, createConversation, addMessage,
  getSetting, setSetting,
} from '../../lib/db'
import { SPRING_SNAPPY, SPRING_SMOOTH, SPRING_GENTLE, DUSTY_GOLD, getContextColor } from '../../lib/constants'

const SEND_DEBOUNCE_MS = 500
const COLLAB_PRESETS = [
  { id: 'challenge', label: 'Challenge Artifacts', desc: 'Self-critique outputs before presenting' },
  { id: 'reasoning', label: 'Show Reasoning', desc: 'Walk through thinking step by step' },
  { id: 'pushback', label: 'Push Back on Me', desc: 'Flag questionable assumptions' },
  { id: 'alternatives', label: 'Offer Alternatives', desc: 'Provide multiple approaches' },
  { id: 'uncertainty', label: 'Flag Uncertainty', desc: 'Distinguish confidence vs guesses' },
]

/* ── Mobile Message Card ─────────────────────────────────── */

function MobileMessageCard({ message, number, isFavorited, hasNote, isSelected, onSelect, onFavorite, onBranch, onNote, onCopy, onHide, onDelete, onMoveToBranch, onContinue }) {
  const isGhostText = message.incomplete && !isSelected

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isGhostText ? 0.55 : 1, y: 0 }}
      transition={SPRING_GENTLE}
      className={`relative ${message.role === 'user' ? 'ml-6' : 'mr-6'} mb-1`}
    >
      <motion.div
        onClick={() => onSelect(isSelected ? null : message.id)}
        animate={{ borderColor: isSelected ? '#B8A070' : isGhostText ? '#9B9A97' : '#DDDDE3' }}
        transition={{ duration: 0.15 }}
        className={`rounded-2xl border bg-white cursor-pointer ${isGhostText ? 'border-dashed' : ''}`}
      >
        {/* Persistent indicators */}
        {(isFavorited || hasNote) && (
          <div className="flex items-center gap-1.5 px-4 pt-2.5">
            {isFavorited && <Star className="w-3 h-3 flex-shrink-0" style={{ fill: DUSTY_GOLD, color: DUSTY_GOLD }} />}
            {hasNote && <StickyNote className="w-3 h-3 text-[#D9730D] flex-shrink-0" />}
          </div>
        )}

        {/* Message content */}
        <div className={`px-4 py-3 parliament-md text-[14px]`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
        </div>

        {/* Expanded action row — slides in when selected */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_SNAPPY}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-around px-2 py-2 border-t border-[#F1F1EF]">
                <ActionIcon icon={Star} label="Fav" color={isFavorited ? DUSTY_GOLD : '#787774'} filled={isFavorited} onClick={(e) => { e.stopPropagation(); onFavorite() }} />
                <ActionIcon icon={GitBranch} label="Branch" color="#7C6CD4" onClick={(e) => { e.stopPropagation(); onBranch() }} />
                <ActionIcon icon={StickyNote} label="Note" color="#D9730D" onClick={(e) => { e.stopPropagation(); onNote() }} />
                <ActionIcon icon={Copy} label="Copy" color="#787774" onClick={(e) => { e.stopPropagation(); onCopy() }} />
                <ActionIcon icon={ArrowRightCircle} label="Move" color="#B8A070" onClick={(e) => { e.stopPropagation(); onMoveToBranch() }} />
                <ActionIcon icon={Eye} label="Hide" color="#787774" onClick={(e) => { e.stopPropagation(); onHide() }} />
                <ActionIcon icon={Trash2} label="Delete" color="#E03E3E" onClick={(e) => { e.stopPropagation(); onDelete() }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Ghost text continue button */}
      {isGhostText && message.content && onContinue && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          className="mt-2 px-3 py-1.5 rounded-xl text-xs font-medium text-[#B8A070] border border-[#E9E9E7] active:border-[#B8A070] transition-colors"
        >
          Continue
        </motion.button>
      )}
    </motion.div>
  )
}

function ActionIcon({ icon: Icon, label, color, filled, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl active:bg-[#F7F6F3] transition-colors">
      <Icon className="w-4 h-4" style={filled ? { fill: color, color, strokeLinejoin: 'round' } : { color }} />
      <span className="text-[9px] font-medium" style={{ color }}>{label}</span>
    </button>
  )
}

/* ── Panel Row ───────────────────────────────────────────── */

function PanelRow({ icon: Icon, label, color, badge, expandable, expanded, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left active:bg-[#F7F6F3] transition-colors">
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
      <span className="flex-1 text-[14px] font-medium text-[#191919]">{label}</span>
      {badge != null && (
        <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '18', color }}>
          {badge}
        </span>
      )}
      {expandable && (
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={SPRING_SNAPPY}>
          <ChevronDown className="w-4 h-4 text-[#C0C8D4]" />
        </motion.div>
      )}
    </button>
  )
}

/* ── Unified Panel (bottom sheet) ───────────────────────── */

function UnifiedPanel({ open, onClose, messages, highlights, branches, currentConversation, activePresets, onTogglePreset, onNavigate, onOpenReview, onExport, onCompress }) {
  const [expandedSection, setExpandedSection] = useState(null)
  const [highlightCycleIdx, setHighlightCycleIdx] = useState({})

  const tocItems = useMemo(() =>
    messages.filter(m => m.role === 'user').map((m, i) => ({
      id: m.id,
      label: m.content?.slice(0, 55) + (m.content?.length > 55 ? '...' : '') || '',
    }))
  , [messages])

  const toggleSection = (section) => setExpandedSection(prev => prev === section ? null : section)

  const handleHighlightTap = (hl) => {
    const occ = messages.filter(m => m.content?.toLowerCase().includes(hl.text.toLowerCase())).map(m => m.id)
    if (occ.length === 0) return
    const currentIdx = (highlightCycleIdx[hl.text] || 0) % occ.length
    setHighlightCycleIdx(prev => ({ ...prev, [hl.text]: (currentIdx + 1) % occ.length }))
    document.getElementById(`msg-${occ[currentIdx]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    onClose()
  }

  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING_SMOOTH}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[#9B9A97]" />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-6" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}>

          {/* Navigate back to chats */}
          <PanelRow icon={MessageSquare} label="All Chats" color="#B8A070" onClick={() => { onClose(); onNavigate('/') }} />

          {/* Table of Contents */}
          <PanelRow icon={List} label="Contents" color="#787774" expandable expanded={expandedSection === 'toc'} onClick={() => toggleSection('toc')} />
          <AnimatePresence>
            {expandedSection === 'toc' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                <div className="pl-12 pr-4 pb-2 space-y-0.5">
                  {tocItems.length === 0 ? (
                    <p className="text-xs text-[#9B9A97] py-2">No messages yet</p>
                  ) : tocItems.map(item => (
                    <button key={item.id} onClick={() => { document.getElementById(`msg-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); onClose() }}
                      className="w-full text-left px-3 py-2 rounded-xl text-[13px] text-[#787774] active:bg-[#F7F6F3] active:text-[#191919] transition-colors truncate">
                      {item.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Highlights */}
          <PanelRow icon={Highlighter} label="Highlights" color="#0F7B6C" badge={highlights.length > 0 ? highlights.length : null} expandable expanded={expandedSection === 'highlights'} onClick={() => toggleSection('highlights')} />
          <AnimatePresence>
            {expandedSection === 'highlights' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                <div className="pl-12 pr-4 pb-2 space-y-1.5">
                  {highlights.length === 0 ? (
                    <p className="text-xs text-[#9B9A97] py-2">No highlights yet. Select text in messages to highlight.</p>
                  ) : highlights.map(hl => (
                    <button key={hl.id} onClick={() => handleHighlightTap(hl)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[#F1F1EF] active:bg-[#F7F6F3] transition-colors text-left">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hl.color }} />
                      <span className="text-xs font-medium text-[#191919] flex-1 truncate">{hl.text}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Branches */}
          <PanelRow icon={GitBranch} label="Branches" color="#7C6CD4" badge={branches.length > 1 ? branches.length : null} expandable expanded={expandedSection === 'branches'} onClick={() => toggleSection('branches')} />
          <AnimatePresence>
            {expandedSection === 'branches' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                <div className="pl-12 pr-4 pb-2 space-y-1.5">
                  {branches.map(branch => {
                    const isActive = branch.id === currentConversation?.id
                    return (
                      <button key={branch.id} onClick={() => { onClose(); onNavigate(`/chat/${branch.id}`) }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${isActive ? 'border-[#B8A070] bg-[#B8A070]/5' : 'border-[#F1F1EF] active:bg-[#F7F6F3]'}`}>
                        <div className="flex items-center gap-2">
                          <GitBranch className={`w-3 h-3 ${isActive ? 'text-[#B8A070]' : 'text-[#787774]'}`} />
                          <span className="text-xs font-medium text-[#191919] truncate flex-1">{branch.title || 'Untitled'}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collaboration Mode */}
          <PanelRow icon={Settings2} label="Collaboration Mode" color="#B8A070" expandable expanded={expandedSection === 'collab'} onClick={() => toggleSection('collab')} />
          <AnimatePresence>
            {expandedSection === 'collab' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                <div className="pl-12 pr-4 pb-2 space-y-1.5">
                  {COLLAB_PRESETS.map(preset => {
                    const active = activePresets.has(preset.id)
                    return (
                      <button key={preset.id} onClick={() => onTogglePreset(preset.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${active ? 'border-[#B8A070] bg-[#B8A070]/5' : 'border-[#F1F1EF] active:bg-[#F7F6F3]'}`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-[#B8A070] bg-[#B8A070]' : 'border-[#9B9A97]'}`}>
                            {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-medium block ${active ? 'text-[#191919]' : 'text-[#37352F]'}`}>{preset.label}</span>
                            <span className="text-[10px] text-[#787774]">{preset.desc}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick actions */}
          <PanelRow icon={BookOpen} label="Review" color="#787774" onClick={() => { onClose(); onOpenReview() }} />
          <PanelRow icon={FileText} label="Export to Markdown" color="#787774" onClick={() => { onClose(); onExport() }} />
          <PanelRow icon={Zap} label="Compress Context" color="#D9730D" onClick={() => { onClose(); onCompress() }} />
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Swift Chat Layout ───────────────────────────────────── */

export default function SwiftChatLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    messages, isStreaming, streamingContent, tokenUsage,
    loadMessages, sendMessage, continueMessage,
    stopGenerating, clearMessages,
    persistError, clearPersistError,
  } = useChat()
  const { conversations, updateConversation, loadConversations, createConversation } = useConversations()
  const { settings, refreshStorageEstimate } = useSettings()

  const [inputValue, setInputValue] = useState('')
  const [apiKey, setApiKey] = useState(null)
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedMsgId, setSelectedMsgId] = useState(null)
  const [hiddenMessages, setHiddenMessages] = useState(new Set())
  const [pendingDeletes, setPendingDeletes] = useState([])
  const [newChatFlash, setNewChatFlash] = useState(false)
  const [branchFlash, setBranchFlash] = useState(false)

  // Annotations
  const [favoritesMap, setFavoritesMap] = useState(new Map())
  const [notesMap, setNotesMap] = useState(new Map())
  const [highlightsList, setHighlightsList] = useState([])
  const [showNotes, setShowNotes] = useState(new Set())

  // Branching
  const [branches, setBranches] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [activePresets, setActivePresets] = useState(new Set())

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const lastSendTimeRef = useRef(0)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const clearMessagesRef = useRef(clearMessages)
  clearMessagesRef.current = clearMessages

  // Context health
  const modelInfo = useMemo(() => {
    const provider = getProvider('anthropic')
    const models = provider.getModels()
    return models.find(m => m.id === settings.defaultModel) || models[0]
  }, [settings.defaultModel])

  const totalTokens = tokenUsage.input + tokenUsage.output
  const contextWindow = modelInfo.contextWindow
  const contextUsage = contextWindow > 0 ? Math.min(Math.round((totalTokens / contextWindow) * 100), 100) : 0
  const contextThreshold = settings.contextThreshold || 80
  const contextColor = getContextColor(contextUsage, contextThreshold)

  const visibleMessages = messages.filter(m => !hiddenMessages.has(m.id))
  const hiddenCount = messages.length - visibleMessages.length

  // Load conversation and annotations
  useEffect(() => {
    if (!id) return
    setLoading(true)
    clearMessagesRef.current()
    setHiddenMessages(new Set())
    setSelectedMsgId(null)
    setFavoritesMap(new Map())
    setNotesMap(new Map())
    setHighlightsList([])
    setShowNotes(new Set())
    setBranches([])
    setCurrentConversation(null)

    Promise.all([
      loadApiKey(),
      loadMessages(id),
      getFavorites(id),
      getNotes(id),
      getHighlights(id),
      getBranches(id),
      getConversation(id),
    ]).then(([key, , favs, nts, hls, brs, conv]) => {
      setApiKey(key)
      const fm = new Map(favs.map(f => [f.messageId, f]))
      setFavoritesMap(fm)
      const nm = new Map(nts.map(n => [n.messageId, n]))
      setNotesMap(nm)
      setHighlightsList(hls)
      setBranches(brs)
      setCurrentConversation(conv)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id, loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (isStreaming || messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isStreaming])

  // Collab system prompt
  const buildCollabSystemPrompt = useCallback(() => {
    if (activePresets.size === 0) return null
    const lines = [
      ...COLLAB_PRESETS.filter(p => activePresets.has(p.id)).map(p => `• ${p.label}: ${p.desc}`),
    ]
    return lines.length > 0 ? `Please follow these collaboration preferences:\n${lines.join('\n')}` : null
  }, [activePresets])

  // Send message
  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isStreaming) return
    if (!apiKey) {
      setApiError({ type: 'key_failure', message: 'No API key. Add one in Settings.' })
      return
    }
    const now = Date.now()
    if (now - lastSendTimeRef.current < SEND_DEBOUNCE_MS) return
    lastSendTimeRef.current = now
    setInputValue('')
    setApiError(null)
    setSelectedMsgId(null)
    try {
      const provider = getProvider('anthropic')
      const collabPrompt = buildCollabSystemPrompt()
      await sendMessage(apiKey, id, trimmed, settings.defaultModel, provider, collabPrompt)
      await refreshStorageEstimate()
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setApiError({ type: 'key_failure', message: 'API key no longer working. Update in Settings.' })
      } else if (error.status === 429) {
        setApiError({ type: 'rate_limit', message: 'Rate limit reached. Wait a moment.' })
      } else if (error.name !== 'AbortError') {
        setApiError({ type: 'generic', message: error.message || 'Something went wrong.' })
      }
    }
  }, [inputValue, isStreaming, apiKey, id, settings.defaultModel, sendMessage, refreshStorageEstimate, buildCollabSystemPrompt])

  const handleContinue = useCallback(async (messageId) => {
    if (!apiKey) return
    setApiError(null)
    try {
      const provider = getProvider('anthropic')
      await continueMessage(apiKey, messageId, settings.defaultModel, provider, buildCollabSystemPrompt())
      await refreshStorageEstimate()
    } catch (error) {
      if (error.name !== 'AbortError') {
        setApiError({ type: 'generic', message: error.message || 'Failed to continue.' })
      }
    }
  }, [apiKey, settings.defaultModel, continueMessage, refreshStorageEstimate, buildCollabSystemPrompt])

  // Favorites
  const toggleFav = useCallback(async (msgId) => {
    const existing = favoritesMap.get(msgId)
    if (existing) {
      try { await deleteFavorite(existing.id) } catch {}
      setFavoritesMap(prev => { const n = new Map(prev); n.delete(msgId); return n })
    } else {
      try {
        const fav = await addFavorite({ conversationId: id, messageId: msgId })
        setFavoritesMap(prev => new Map(prev).set(msgId, fav))
      } catch {}
    }
  }, [id, favoritesMap])

  // Highlights
  const handleAddHighlight = useCallback(async (msgId, text, color) => {
    try {
      const hl = await addHighlight({ conversationId: id, messageId: msgId, text, color })
      setHighlightsList(prev => [...prev, hl])
    } catch {}
  }, [id])

  const handleRemoveHighlight = useCallback(async (hlId) => {
    try { await deleteHighlight(hlId) } catch {}
    setHighlightsList(prev => prev.filter(h => h.id !== hlId))
  }, [])

  // Copy message text
  const handleCopyText = useCallback((content) => {
    navigator.clipboard.writeText(content).catch(() => {})
    setSelectedMsgId(null)
  }, [])

  // Hide message
  const hideMessage = useCallback((msgId) => {
    setHiddenMessages(prev => new Set([...prev, msgId]))
    setSelectedMsgId(null)
  }, [])

  // Delete message
  const handleDelete = useCallback(async (msgId) => {
    const timeoutId = setTimeout(async () => {
      try { await deleteMessage(msgId) } catch {}
      setPendingDeletes(prev => prev.filter(d => d.msgId !== msgId))
    }, 3500)
    setPendingDeletes(prev => [...prev, { msgId, timeoutId }])
    setSelectedMsgId(null)
    hideMessage(msgId)
  }, [hideMessage])

  const handleUndoDelete = useCallback((msgId) => {
    const d = pendingDeletes.find(p => p.msgId === msgId)
    if (d) {
      clearTimeout(d.timeoutId)
      setPendingDeletes(prev => prev.filter(p => p.msgId !== msgId))
      setHiddenMessages(prev => { const n = new Set(prev); n.delete(msgId); return n })
    }
  }, [pendingDeletes])

  // Branch creation
  const handleCreateBranchFull = useCallback(async (messageId) => {
    try {
      const { createBranch } = await import('../../lib/db')
      const branchConv = await createBranch(id, messageId)
      await loadConversations()
      setBranches(await getBranches(id))
      navigate(`/chat/${branchConv.id}`)
    } catch (err) {
      console.error('Branch creation failed:', err)
    }
  }, [id, navigate, loadConversations])

  const handleCreateBranchCompressed = useCallback(async (messageId) => {
    if (!apiKey) return
    setBranchFlash(true)
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
      await provider.sendMessage(apiKey, summaryMessages, 'claude-haiku', (chunk) => { summaryText += chunk }, new AbortController().signal)
      if (!summaryText.trim()) throw new Error('Empty summary')
      const parentConv = await getConversation(id)
      const branchConv = await createConversation({
        title: `Summary: ${parentConv?.title || 'conversation'}`,
        model: parentConv?.model || settings.defaultModel,
        parentId: id,
        branchPoint: messageId,
      })
      await addMessage({ conversationId: branchConv.id, role: 'assistant', content: summaryText.trim(), tokenCount: 0 })
      await loadConversations()
      setTimeout(() => {
        setBranchFlash(false)
        navigate(`/chat/${branchConv.id}`)
      }, 1500)
    } catch (err) {
      console.error('Compressed branch failed:', err)
      setBranchFlash(false)
      await handleCreateBranchFull(messageId)
    }
  }, [id, apiKey, visibleMessages, settings.defaultModel, navigate, loadConversations, handleCreateBranchFull])

  // New chat
  const handleNewChat = useCallback(async () => {
    const conv = await createConversation()
    navigate(`/chat/${conv.id}`)
  }, [createConversation, navigate])

  // Export to Markdown
  const handleExportMarkdown = useCallback(() => {
    if (messages.length === 0) return
    const title = currentConversation?.title || 'Conversation'
    const date = new Date().toISOString().split('T')[0]
    const lines = [`# ${title}`, ``, `*Exported ${date}*`, ``]
    messages.forEach(m => {
      lines.push(`**${m.role === 'user' ? 'You' : 'Claude'}:** ${m.content}`)
      lines.push(``)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${date}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages, currentConversation])

  // Swipe gestures
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.time
    const isHorizontal = Math.abs(dx) > Math.abs(dy) * 2 && dt < 400
    if (!isHorizontal) return

    if (dx < -80) {
      // Swipe left → new chat
      setNewChatFlash(true)
      setTimeout(() => {
        setNewChatFlash(false)
        handleNewChat()
      }, 1200)
    } else if (dx > 80 && visibleMessages.length > 0) {
      // Swipe right → instant compressed branch from last message
      const lastMsg = visibleMessages[visibleMessages.length - 1]
      if (lastMsg) handleCreateBranchCompressed(lastMsg.id)
    }
  }, [visibleMessages, handleNewChat, handleCreateBranchCompressed])

  // Keyboard: Enter to send
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      isStreaming ? stopGenerating() : handleSend()
    }
  }, [isStreaming, stopGenerating, handleSend])

  // Auto-resize textarea
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }, [])

  if (loading) return null

  return (
    <div
      className="flex flex-col font-sans overflow-hidden bg-white text-[#191919]"
      style={{ height: '100dvh', maxWidth: 430, margin: '0 auto', position: 'relative' }}
    >
      {/* ── Top Bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)', paddingBottom: 4 }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setPanelOpen(true)}
          className="p-2 rounded-xl active:bg-[#F7F6F3] transition-colors"
        >
          <GripHorizontal className="w-5 h-5" style={{ color: contextColor }} />
        </motion.button>
      </motion.div>

      {/* ── API Key Error Banner ── */}
      <AnimatePresence>
        {apiError?.type === 'key_failure' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="px-5 py-3 bg-[#E03E3E]/10 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E03E3E] flex-shrink-0" />
            <p className="text-xs text-[#E03E3E] flex-1">{apiError.message}</p>
            <button onClick={() => setApiError(null)} className="p-1"><X className="w-3.5 h-3.5 text-[#E03E3E]" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Storage Quota Banner ── */}
      <AnimatePresence>
        {persistError === 'quota' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="px-5 py-3 bg-[#D9730D]/10 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#D9730D] flex-shrink-0" />
            <p className="text-xs text-[#D9730D] flex-1">Storage full — message may not be saved. Export and delete old chats to free space.</p>
            <button onClick={clearPersistError} className="p-1"><X className="w-3.5 h-3.5 text-[#D9730D]" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => { if (e.target === e.currentTarget) setSelectedMsgId(null) }}
      >
        {/* Empty state */}
        {visibleMessages.length === 0 && !isStreaming && hiddenCount === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <img src="/flight_logo.png" alt="" className="w-12 h-12 mb-4 object-contain" style={{ opacity: 0.26 }} />
            <p className="text-sm text-[#787774] mb-1">Start a conversation</p>
            <p className="text-xs text-[#9B9A97]">Type below, or swipe left to start fresh</p>
          </div>
        )}

        <div className="space-y-3">
          {visibleMessages.map((msg, idx) => {
            const isGhostText = msg.incomplete && !isStreaming
            const content = msg.incomplete && isStreaming && streamingContent ? streamingContent : msg.content
            return (
              <MobileMessageCard
                key={msg.id}
                message={{ ...msg, content }}
                number={idx + 1}
                isFavorited={favoritesMap.has(msg.id)}
                hasNote={notesMap.has(msg.id)}
                isSelected={selectedMsgId === msg.id}
                onSelect={setSelectedMsgId}
                onFavorite={() => toggleFav(msg.id)}
                onBranch={() => handleCreateBranchFull(msg.id)}
                onNote={() => setShowNotes(prev => { const n = new Set(prev); n.has(msg.id) ? n.delete(msg.id) : n.add(msg.id); return n })}
                onCopy={() => handleCopyText(msg.content)}
                onHide={() => hideMessage(msg.id)}
                onDelete={() => handleDelete(msg.id)}
                onMoveToBranch={() => {}}
                onContinue={isGhostText ? () => handleContinue(msg.id) : null}
              />
            )
          })}
        </div>

        {/* Hidden messages indicator */}
        {hiddenCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-3">
            <button onClick={() => setHiddenMessages(new Set())}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#E9E9E7] active:border-[#B8A070] transition-colors">
              <Eye className="w-3.5 h-3.5 text-[#787774]" />
              <span className="text-xs text-[#787774]">{hiddenCount} message{hiddenCount !== 1 ? 's' : ''} hidden</span>
            </button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Undo Delete Toast ── */}
      <AnimatePresence>
        {pendingDeletes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={SPRING_SNAPPY}
            className="mx-4 mb-2 px-4 py-3 rounded-2xl border border-[#E9E9E7] bg-white shadow-sm flex items-center justify-between gap-3">
            <span className="text-xs text-[#37352F]">
              {pendingDeletes.length === 1 ? 'Message deleted' : `${pendingDeletes.length} messages deleted`}
            </span>
            <button onClick={() => handleUndoDelete(pendingDeletes[pendingDeletes.length - 1].msgId)}
              className="text-xs font-medium text-[#B8A070] active:text-[#3A6AD4] shrink-0">
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Chat Toast ── */}
      <AnimatePresence>
        {newChatFlash && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={SPRING_SNAPPY}
            className="mx-4 mb-2 px-4 py-3 rounded-2xl border border-[#B8A070]/30 bg-[#B8A070]/5 flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-[#B8A070] flex-shrink-0" />
            <span className="text-xs font-medium text-[#191919]">Starting new chat</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Branch Toast ── */}
      <AnimatePresence>
        {branchFlash && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={SPRING_SNAPPY}
            className="mx-4 mb-2 px-4 py-3 rounded-2xl border border-[#7C6CD4]/30 bg-[#7C6CD4]/5 flex items-center gap-2.5">
            <GitBranch className="w-4 h-4 text-[#7C6CD4] flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-medium text-[#191919]">Branching with compressed summary</span>
              <span className="text-[10px] text-[#787774] block mt-0.5">Continuing in a fresh context window</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rate Limit Error ── */}
      <AnimatePresence>
        {apiError?.type === 'rate_limit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 py-1.5">
            <p className="text-xs text-[#D9730D]">{apiError.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Area ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.3 }}
        className="px-4 pt-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
      >
        <div className="flex items-end gap-2.5">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type here, or swipe left to start fresh."
            rows={1}
            className="flex-1 bg-white rounded-xl px-4 py-2.5 text-[#191919] outline-none placeholder:text-[#9B9A97] border transition-colors resize-none"
            style={{ borderColor: '#DDDDE3', maxHeight: 120, minHeight: 40, lineHeight: '20px', fontSize: 16 }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={isStreaming ? stopGenerating : handleSend}
            className="rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              width: 40, height: 40,
              borderColor: isStreaming ? '#E03E3E' : inputValue.trim() ? contextColor : '#DDDDE3',
              backgroundColor: isStreaming ? '#E03E3E' : inputValue.trim() ? contextColor : 'transparent',
            }}
          >
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div key="stop" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={SPRING_SNAPPY}>
                  <Square className="w-4 h-4 text-white" />
                </motion.div>
              ) : (
                <motion.div key="send" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={SPRING_SNAPPY}>
                  <ArrowUp className="w-5 h-5 transition-colors" style={{ color: inputValue.trim() ? '#FFFFFF' : contextColor }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Unified Panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <UnifiedPanel
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            messages={visibleMessages}
            highlights={highlightsList}
            branches={branches}
            currentConversation={currentConversation}
            activePresets={activePresets}
            onTogglePreset={(presetId) => setActivePresets(prev => { const n = new Set(prev); n.has(presetId) ? n.delete(presetId) : n.add(presetId); return n })}
            onNavigate={(path) => navigate(path)}
            onOpenReview={() => {}}
            onExport={handleExportMarkdown}
            onCompress={() => { if (visibleMessages.length > 0) handleCreateBranchCompressed(visibleMessages[visibleMessages.length - 1].id) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
