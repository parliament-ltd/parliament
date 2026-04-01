import { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getConversation, getBranches, createConversation,
  getSbrdDocument, saveSbrdDocument, listConversations, updateConversation,
} from '../../lib/db'
import { getProvider } from '../../providers'
import { loadApiKey } from '../../lib/crypto'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, GitBranch,
  AlertTriangle, Lightbulb, ChevronDown, Check, X, Eye, EyeOff,
  Bell, BellOff, Eraser, PanelRight,
  Sparkles, CornerDownRight, ArrowRight,
  CheckCheck, Download,
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

const GOLD      = '#B8A070'
const DELETION  = '#EF4444'
const INSERTION = '#4A7AE5'
const SUGGESTION = '#22C55E'
const RIPPLE_WARN = '#E5A620'
const RIPPLE_OPP  = '#4A7AE5'

/* ─── Word-level diff ─────────────────────────────────────── */
// Tokenises by words + surrounding whitespace, runs LCS, returns
// an array of { type: 'unchanged'|'deleted'|'inserted', text }.

function wordDiff(original, current) {
  const tokenise = str => str.match(/\S+|\s+/g) || []
  const orig = tokenise(original)
  const curr = tokenise(current)
  const m = orig.length, n = curr.length

  // Build LCS table
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = orig[i] === curr[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  // Traceback
  const parts = []
  let i = 0, j = 0
  while (i < m || j < n) {
    if (i < m && j < n && orig[i] === curr[j]) {
      parts.push({ type: 'unchanged', text: curr[j] }); i++; j++
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      parts.push({ type: 'inserted', text: curr[j] }); j++
    } else {
      parts.push({ type: 'deleted', text: orig[i] }); i++
    }
  }
  return parts
}

/* ─── Diff renderer ───────────────────────────────────────── */

function DiffText({ baseline, text }) {
  const t = text    == null ? '' : String(text)
  const b = baseline == null ? '' : String(baseline)
  if (!b || b === t) return <span style={{ color: 'var(--p-text-primary)' }}>{t}</span>
  const parts = wordDiff(b, t)
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'unchanged') return <span key={i} style={{ color: 'var(--p-text-primary)' }}>{part.text}</span>
        if (part.type === 'deleted')
          return <span key={i} style={{ color: DELETION, textDecoration: 'line-through', opacity: 0.7 }}>{part.text}</span>
        return <span key={i} style={{ color: INSERTION, fontWeight: 500, borderBottom: `1.5px solid ${INSERTION}50` }}>{part.text}</span>
      })}
    </>
  )
}

/* ─── Comment selection highlight renderer ───────────────── */

function HighlightedText({ text, highlight }) {
  if (!highlight) return <span style={{ color: 'var(--p-text-primary)' }}>{text}</span>
  const idx = text.indexOf(highlight)
  if (idx === -1) return <span style={{ color: 'var(--p-text-primary)' }}>{text}</span>
  return (
    <>
      {idx > 0 && <span style={{ color: 'var(--p-text-primary)' }}>{text.slice(0, idx)}</span>}
      <mark style={{ backgroundColor: 'rgba(255, 213, 50, 0.38)', color: 'var(--p-text-primary)', borderRadius: '2px', padding: '1px 0' }}>
        {text.slice(idx, idx + highlight.length)}
      </mark>
      {idx + highlight.length < text.length && <span style={{ color: 'var(--p-text-primary)' }}>{text.slice(idx + highlight.length)}</span>}
    </>
  )
}

/* ─── Migrate old segments-based paragraphs ──────────────── */

function migrateParagraph(p) {
  if (p.text !== undefined && p.text !== null) {
    // Ensure both fields are always strings
    return { ...p, text: String(p.text ?? ''), baseline: String(p.baseline ?? p.text ?? '') }
  }
  // Convert old segments array to text + baseline
  const text = (p.segments || [])
    .filter(s => s.type !== 'deletion')
    .map(s => s.content).join('')
  const baseline = (p.segments || [])
    .filter(s => s.type !== 'insertion' && s.type !== 'suggestion')
    .map(s => s.content).join('')
  const result = { ...p, text, baseline }
  delete result.segments
  return result
}

/* ─── Parse Claude response into paragraphs ──────────────── */

function parseResponseToParas(responseText) {
  const lines = responseText.trim().split('\n')
  const result = []
  let buffer = []
  const flush = () => {
    const content = buffer.join(' ').trim()
    if (content) {
      result.push({
        id: `ai-${crypto.randomUUID()}`,
        type: 'paragraph',
        text: content,
        baseline: content,
        comments: [],
      })
    }
    buffer = []
  }
  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      flush()
    } else if (t.startsWith('# ')) {
      flush()
      result.push({
        id: `ai-${crypto.randomUUID()}`,
        type: 'heading',
        text: t.slice(2).trim(),
        baseline: t.slice(2).trim(),
        comments: [],
      })
    } else {
      buffer.push(t)
    }
  }
  flush()
  return result
}

/* ─── Parse structured Claude response ───────────────────── */
// Extracts ```json``` action blocks from Claude's response.
// Returns { adds: [...paragraphs with claudeOrigin:true], edits: [{paraId, suggestions}] }
// Falls back to plain-paragraph parsing if no JSON blocks found.

function parseClaudeResponse(responseText, currentParagraphs) {
  const result = { adds: [], edits: [] }

  // Build a set of existing paragraph texts so we can skip duplicates.
  // Claude sometimes echoes existing content inside "add" blocks — this guard
  // prevents those from doubling up in the document.
  const existingTexts = new Set(currentParagraphs.map(p => p.text.trim()))

  const jsonBlockRe = /```json\s*([\s\S]*?)```/g
  let match
  while ((match = jsonBlockRe.exec(responseText)) !== null) {
    try {
      const action = JSON.parse(match[1].trim())
      if (action.type === 'add' && Array.isArray(action.paragraphs)) {
        for (const p of action.paragraphs) {
          const text = String(p.text || '')
          // Skip if this text is already in the document
          if (existingTexts.has(text.trim())) continue
          result.adds.push({
            id: `ai-${crypto.randomUUID()}`,
            type: p.type === 'heading' ? 'heading' : 'paragraph',
            text,
            baseline: text,
            comments: [],
            claudeOrigin: true,
          })
          // Register the new text so subsequent blocks can't re-add it either
          existingTexts.add(text.trim())
        }
      } else if (action.type === 'edit' && action.paraId) {
        const paraExists = currentParagraphs.some(p => p.id === action.paraId)
        if (paraExists && Array.isArray(action.suggestions)) {
          result.edits.push({
            paraId: action.paraId,
            suggestions: action.suggestions.map((s, i) => ({
              id: s.id || `s-${Date.now()}-${i}`,
              find: String(s.find || ''),
              replace: String(s.replace || ''),
              reasoning: String(s.reasoning || ''),
            })),
          })
        }
      }
    } catch (_) {
      // Skip malformed JSON blocks
    }
  }
  // Fallback: no JSON blocks — treat full response as new paragraphs (Option A),
  // again filtering against existing content to avoid echoed text being re-added.
  if (result.adds.length === 0 && result.edits.length === 0) {
    result.adds = parseResponseToParas(responseText)
      .filter(p => !existingTexts.has(p.text.trim()))
      .map(p => ({ ...p, claudeOrigin: true }))
  }
  return result
}

/* ─── Claude inline suggestion diff renderer ─────────────── */
// Shows a single find→replace suggestion inline with green diff.

function ClaudeInlineSuggestionPreview({ text, suggestion }) {
  if (!suggestion.find) {
    return <span style={{ color: SUGGESTION, fontWeight: 500 }}>{suggestion.replace}</span>
  }
  const idx = text.indexOf(suggestion.find)
  if (idx === -1) {
    return (
      <>
        <span style={{ color: 'var(--p-text-primary)' }}>{text}</span>
        <span style={{ color: SUGGESTION, fontWeight: 500 }}> → {suggestion.replace}</span>
      </>
    )
  }
  return (
    <>
      <span style={{ color: 'var(--p-text-primary)', opacity: 0.45 }}>{text.slice(0, idx)}</span>
      <span style={{ color: SUGGESTION, textDecoration: 'line-through', opacity: 0.75 }}>{suggestion.find}</span>
      <span style={{ color: SUGGESTION, fontWeight: 500, borderBottom: `1.5px solid ${SUGGESTION}50` }}>{suggestion.replace}</span>
      <span style={{ color: 'var(--p-text-primary)', opacity: 0.45 }}>{text.slice(idx + suggestion.find.length)}</span>
    </>
  )
}

/* ─── DOM cursor helpers ─────────────────────────────────── */

function getTextOffset(container, node, offset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let total = 0, cur
  while ((cur = walker.nextNode())) {
    if (cur === node) return total + offset
    total += cur.length
  }
  return total
}

function setCursorAt(container, targetOffset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let remaining = targetOffset, cur
  while ((cur = walker.nextNode())) {
    if (remaining <= cur.length) {
      const range = document.createRange()
      range.setStart(cur, remaining)
      range.collapse(true)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    remaining -= cur.length
  }
  // Fall back: end of container
  const range = document.createRange()
  range.selectNodeContents(container)
  range.collapse(false)
  window.getSelection().removeAllRanges()
  window.getSelection().addRange(range)
}

/* ═══════════════════════════════════════════════════════════ */
/*  ROOT COMPONENT                                             */
/* ═══════════════════════════════════════════════════════════ */

export default function SecretarybirdChatLayout() {
  const navigate = useNavigate()
  const { id } = useParams()

  // ── Persistent document state ──────────────────────────────────────
  const [paragraphs,       setParagraphs]       = useState([])
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
        if (doc.paragraphs?.length) setParagraphs(doc.paragraphs.map(migrateParagraph))
        if (doc.submittedReplies)   setSubmittedReplies(doc.submittedReplies)
      }
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  // ── Derive title from title/h1 paragraph ──────────────────────────
  useEffect(() => {
    if (!loaded || !id) return
    const titlePara = paragraphs.find(p => p.type === 'title') ?? paragraphs.find(p => p.type === 'heading')
    const derived = titlePara?.text?.trim() || ''
    if (derived && derived !== conversationTitle) {
      setConversationTitle(derived)
      updateConversation(id, { title: derived }).catch(() => {})
    }
  }, [paragraphs, loaded, id])

  // ── Auto-save (1 s debounce) ───────────────────────────────────────
  const saveTimerRef = useRef(null)
  useEffect(() => {
    if (!loaded || !id) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveSbrdDocument(id, { paragraphs, submittedReplies })
    }, 1000)
    return () => clearTimeout(saveTimerRef.current)
  }, [paragraphs, submittedReplies, loaded, id])

  // ── UI-only state ─────────────────────────────────────────────────
  const [sidebarCollapsed,    setSidebarCollapsed]    = useState(false)
  const [sidebarTab,          setSidebarTab]          = useState('comments')
  const [activeTool,          setActiveTool]          = useState(null) // null = free edit; 'comment' = comment tool
  const [showMarkup,          setShowMarkup]          = useState(false)
  const [rippleEnabled,       setRippleEnabled]       = useState(true)
  const [selectedParagraph,   setSelectedParagraph]   = useState(null)
  const [expandedComments,    setExpandedComments]    = useState(new Set())
  const [activeCommentId,     setActiveCommentId]     = useState(null)
  const [hoveredRipple,       setHoveredRipple]       = useState(null)
  const [chatInput,           setChatInput]           = useState('')
  const [replyingTo,          setReplyingTo]          = useState(null)
  const [replyInputs,         setReplyInputs]         = useState({})
  const [showSubmitConfirm,   setShowSubmitConfirm]   = useState(false)
  const [submitting,          setSubmitting]          = useState(false)
  const [showExportMenu,      setShowExportMenu]      = useState(false)
  const [rippleScanning,      setRippleScanning]      = useState(false)
  const [showRippleScopeModal, setShowRippleScopeModal] = useState(false)
  const exportMenuRef = useRef(null)

  // Keep a ref in sync so event listeners can read showMarkup without stale closures
  const showMarkupRef = useRef(showMarkup)
  useEffect(() => { showMarkupRef.current = showMarkup }, [showMarkup])

  // ── Comment tool state ────────────────────────────────────────────
  const [addingCommentToParaId, setAddingCommentToParaId] = useState(null)
  const [newCommentText,        setNewCommentText]        = useState('')
  const [selectionInfo,         setSelectionInfo]         = useState(null) // { paraId, selectedText, rect }
  const canvasRef = useRef(null)

  // ── Chat panel state ──────────────────────────────────────────────
  const [chatMessages,      setChatMessages]      = useState([])
  const [chatStreaming,      setChatStreaming]      = useState(false)
  const [chatStreamingText, setChatStreamingText] = useState('')
  const chatAbortRef  = useRef(null)
  const chatScrollRef = useRef(null)

  // ── Derived state ─────────────────────────────────────────────────
  const hasEdits             = paragraphs.some(p => p.text !== p.baseline)
  const hasSubmittableChanges = hasEdits || paragraphs.some(p => p.comments?.length > 0)

  const contextUsage = useMemo(() => {
    const docChars  = paragraphs.reduce((s, p) => s + (p.text?.length || 0), 0)
    const chatChars = chatMessages.reduce((s, m) => s + (m.content?.length || 0), 0)
    return Math.min(100, Math.round(Math.ceil((docChars + chatChars) / 4) / 200000 * 100))
  }, [paragraphs, chatMessages])

  const getContextColor = u => u < 50 ? SUGGESTION : u < 80 ? RIPPLE_WARN : DELETION

  // ── Paragraph editing handlers ────────────────────────────────────

  const handleParagraphTextChange = useCallback((paraId, newText) => {
    setParagraphs(prev => prev.map(p => p.id === paraId ? { ...p, text: newText } : p))
  }, [])

  const handleSplitParagraph = useCallback((paraId, cursorOffset) => {
    setParagraphs(prev => {
      const idx = prev.findIndex(p => p.id === paraId)
      if (idx === -1) return prev
      const para = prev[idx]
      const before = para.text.slice(0, cursorOffset)
      const after  = para.text.slice(cursorOffset)
      const newPara = {
        id: `p-${crypto.randomUUID()}`,
        type: para.type === 'heading' ? 'paragraph' : para.type,
        text: after,
        baseline: after,
        comments: [],
      }
      return [...prev.slice(0, idx), { ...para, text: before }, newPara, ...prev.slice(idx + 1)]
    })
  }, [])

  const handleMergeParagraph = useCallback((paraId) => {
    setParagraphs(prev => {
      const idx = prev.findIndex(p => p.id === paraId)
      if (idx === 0) return prev
      const prevPara = prev[idx - 1]
      const currPara = prev[idx]
      const mergedText = prevPara.text + currPara.text
      // Merge cursor goes to join point — handled by the component via focusMergeAt
      return [
        ...prev.slice(0, idx - 1),
        { ...prevPara, text: mergedText },
        ...prev.slice(idx + 1),
      ]
    })
    // Return the join offset so the caller can position cursor
    return paragraphs.find(p => p.id === paraId) ? paragraphs[paragraphs.findIndex(p => p.id === paraId) - 1]?.text?.length ?? 0 : 0
  }, [paragraphs])

  const handleParagraphTypeChange = useCallback((paraId, newType) => {
    setParagraphs(prev => prev.map(p => p.id === paraId ? { ...p, type: newType } : p))
  }, [])

  // ── Comment handlers ──────────────────────────────────────────────

  const toggleComment = id =>
    setExpandedComments(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const submitReply = (commentId) => {
    const text = replyInputs[commentId]?.trim()
    if (!text) return
    setSubmittedReplies(prev => ({ ...prev, [commentId]: [...(prev[commentId] || []), { text }] }))
    setReplyInputs(prev => ({ ...prev, [commentId]: '' }))
    setReplyingTo(null)
  }

  const handleAddComment = (paraId) => {
    const text = newCommentText.trim()
    if (!text) return
    const selectedText = selectionInfo?.paraId === paraId ? selectionInfo.selectedText : null
    setParagraphs(prev => prev.map(p =>
      p.id === paraId
        ? { ...p, comments: [...(p.comments || []), { id: `c${Date.now()}`, text, selectedText, claudeReply: null }] }
        : p
    ))
    setNewCommentText('')
    setAddingCommentToParaId(null)
    setSelectionInfo(null)
  }

  // ── Accept All — apply Claude suggestions, reset baselines ───────

  const handleClearAll = () => {
    setParagraphs(prev => {
      // Apply all pending Claude suggestions to their paragraphs
      const withSuggestions = prev.map(p => {
        if (!p.claudeSuggestions?.length) return p
        let text = p.text
        for (const sugg of p.claudeSuggestions) {
          if (sugg.find) text = text.replace(sugg.find, sugg.replace)
        }
        return { ...p, text, claudeSuggestions: undefined }
      })
      // Reset baselines, clear all annotations (accept claudeOrigin paragraphs in-place)
      return withSuggestions.map(p => ({
        ...p,
        baseline: p.text,
        comments: [],
        claudeNote: undefined,
        claudeOrigin: undefined,
        ripple: undefined,
      }))
    })
  }

  // ── Export handlers ───────────────────────────────────────────────

  const handleCopyCleanText = () => {
    const text = paragraphs.map(p => {
      if (p.type === 'title')    return p.text
      if (p.type === 'heading')  return `# ${p.text}`
      if (p.type === 'heading2') return `## ${p.text}`
      if (p.type === 'quote')    return `> ${p.text}`
      return p.text
    }).join('\n\n')
    navigator.clipboard.writeText(text)
    setShowExportMenu(false)
  }

  const handleExportWithMarkup = () => {
    const lines = []
    for (const p of paragraphs) {
      const prefix = p.type === 'heading' ? '# ' : p.type === 'heading2' ? '## ' : p.type === 'quote' ? '> ' : ''
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

  // Close export menu on outside click
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

  // ── Markup toggle with ripple scan ────────────────────────────────

  const handleToggleMarkup = async () => {
    const turningOn = !showMarkup
    setShowMarkup(turningOn)
    if (!turningOn || !rippleEnabled || !hasEdits || rippleScanning) return
    setRippleScanning(true)
    try {
      const apiKey = await loadApiKey()
      if (!apiKey) return
      const provider = getProvider('anthropic')
      const changedParas = paragraphs.filter(p => p.text !== p.baseline && !p.claudeOrigin)
      if (!changedParas.length) return
      const editSummary = changedParas.map(p =>
        `[${p.id}] changed from: "${p.baseline.slice(0, 100)}" → to: "${p.text.slice(0, 100)}"`
      ).join('\n')
      const allParas = paragraphs.map(p => `[${p.id}] ${p.type === 'heading' || p.type === 'heading2' ? '# ' : ''}${p.text}`).join('\n\n')
      const systemPrompt = `You are analyzing a document for cross-paragraph consistency impacts from recent edits.\n\nFull document:\n${allParas}\n\nRecent edits:\n${editSummary}\n\nRespond ONLY with valid JSON (no prose, no fences):\n{"rippleFlags":[{"paraId":"...","type":"contradiction|dependency_break|opportunity|tone_shift","severity":"low|medium|high","summary":"...","sourceEdit":"..."}]}\n\nOnly flag genuine cross-paragraph impacts. Return empty rippleFlags array if none.`
      const abort = new AbortController()
      let resp = ''
      await provider.sendMessage(apiKey, [{ role: 'user', content: 'Analyze.' }], 'claude-haiku', chunk => { resp += chunk }, abort.signal, systemPrompt)
      const match = resp.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (parsed.rippleFlags?.length) {
          setParagraphs(prev => prev.map(p => {
            const flag = parsed.rippleFlags.find(f => f.paraId === p.id)
            return flag ? { ...p, ripple: flag } : p
          }))
        }
      }
    } catch (_) {}
    finally { setRippleScanning(false) }
  }

  // ── Claude suggestion accept / reject handlers ────────────────────

  const handleAcceptSuggestion = useCallback((paraId, suggId) => {
    setParagraphs(prev => prev.map(p => {
      if (p.id !== paraId) return p
      const sugg = p.claudeSuggestions?.find(s => s.id === suggId)
      if (!sugg) return p
      const newText = sugg.find ? p.text.replace(sugg.find, sugg.replace) : p.text
      const remaining = (p.claudeSuggestions || []).filter(s => s.id !== suggId)
      return { ...p, text: newText, claudeSuggestions: remaining.length ? remaining : undefined }
    }))
  }, [])

  const handleRejectSuggestion = useCallback((paraId, suggId) => {
    setParagraphs(prev => prev.map(p => {
      if (p.id !== paraId) return p
      const remaining = (p.claudeSuggestions || []).filter(s => s.id !== suggId)
      return { ...p, claudeSuggestions: remaining.length ? remaining : undefined }
    }))
  }, [])

  // Keep a Claude-origin paragraph (strip flag, accept baseline)
  const handleAcceptOrigin = useCallback((paraId) => {
    setParagraphs(prev => prev.map(p =>
      p.id === paraId ? { ...p, claudeOrigin: undefined, baseline: p.text } : p
    ))
  }, [])

  // Remove a Claude-origin paragraph entirely
  const handleRejectOrigin = useCallback((paraId) => {
    setParagraphs(prev => prev.filter(p => p.id !== paraId))
  }, [])

  // ── Submit & branch ───────────────────────────────────────────────

  const handleSubmitAndBranch = async () => {
    setSubmitting(true)

    // Snapshot current state — will be updated if Claude responds
    let finalParagraphs = paragraphs

    try {
      const apiKey = await loadApiKey()
      if (apiKey) {
        const provider = getProvider('anthropic')

        // Build document context showing tracked changes
        const docLines = paragraphs.map(p => {
          const prefix = p.type === 'heading' ? '# ' : ''
          const changed = p.text !== p.baseline ? ` (changed from: "${p.baseline}")` : ''
          return `[${p.id}] ${prefix}${p.text}${changed}`
        }).join('\n\n')

        // Collect all comments
        const allComments = paragraphs.flatMap(p =>
          (p.comments || []).map(c => ({
            commentId: c.id, paraId: p.id,
            selected: c.selectedText ? `on "${c.selectedText}" ` : '',
            text: c.text,
          }))
        )

        const commentLines = allComments.length
          ? allComments.map(c => `[${c.commentId} on ${c.paraId}] ${c.selected}"${c.text}"`).join('\n')
          : '(no comments)'

        const systemPrompt = `You are reviewing a document submission with tracked changes and user comments.

Document state (paragraphs show current text; changed paragraphs note the original):
${docLines}

User comments:
${commentLines}

Respond ONLY with a valid JSON object — no prose, no markdown fences:
{
  "commentReplies": [{"commentId": "...", "reply": "..."}]${rippleEnabled ? `,
  "rippleFlags": [{"paraId": "...", "type": "contradiction|dependency_break|opportunity|tone_shift|duplication", "severity": "low|medium|high", "summary": "...", "sourceEdit": "..."}],
  "rippleSuggestions": [{"paraId": "...", "suggestions": [{"find": "exact text to find", "replace": "replacement", "reasoning": "brief reason"}]}]` : ''}
}

Reply to every comment helpfully and concisely.${rippleEnabled ? ' Include rippleFlags only for genuine cross-paragraph impacts caused by the edits — omit if none. Include rippleSuggestions with concrete fix suggestions for flagged paragraphs — omit if none.' : ''}`

        let fullResponse = ''
        const abort = new AbortController()
        await provider.sendMessage(
          apiKey,
          [{ role: 'user', content: 'Please review the submission above.' }],
          'claude-sonnet',
          chunk => { fullResponse += chunk },
          abort.signal,
          systemPrompt,
        )

        // Parse JSON from Claude's response
        try {
          const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            finalParagraphs = paragraphs.map(p => ({
              ...p,
              ripple: rippleEnabled
                ? (parsed.rippleFlags?.find(r => r.paraId === p.id) ?? p.ripple)
                : p.ripple,
              comments: (p.comments || []).map(c => {
                const rep = parsed.commentReplies?.find(r => r.commentId === c.id)
                return rep ? { ...c, claudeReply: { text: rep.reply } } : c
              }),
            }))
            if (rippleEnabled && parsed.rippleSuggestions?.length) {
              finalParagraphs = finalParagraphs.map(p => {
                const entry = parsed.rippleSuggestions.find(r => r.paraId === p.id)
                if (!entry?.suggestions?.length) return p
                const newSuggs = entry.suggestions.map((s, i) => ({
                  id: `rs-${Date.now()}-${i}`,
                  find: String(s.find || ''),
                  replace: String(s.replace || ''),
                  reasoning: String(s.reasoning || ''),
                }))
                return { ...p, claudeSuggestions: [...(p.claudeSuggestions || []), ...newSuggs] }
              })
            }
            setParagraphs(finalParagraphs)
            // Switch to comments tab so the user sees Claude's replies
            setSidebarCollapsed(false)
            setSidebarTab('comments')
          }
        } catch (_) { /* malformed JSON — proceed without replies */ }
      }
    } catch (_) { /* API unavailable — still create branch */ }

    // Save current version (with any Claude replies) then create branch
    clearTimeout(saveTimerRef.current)
    await saveSbrdDocument(id, { paragraphs: finalParagraphs, submittedReplies })
    const branch = await createConversation({ title: `Branch: ${conversationTitle || 'Untitled'}`, parentId: id })
    const freshParagraphs = finalParagraphs.map(p => ({ ...p, baseline: p.text, comments: [] }))
    await saveSbrdDocument(branch.id, { paragraphs: freshParagraphs, submittedReplies: {} })
    const updated = await getBranches(id)
    setBranches(updated)
    setSubmitting(false)
    setShowSubmitConfirm(false)
  }

  // ── Claude chat → document ────────────────────────────────────────

  const handleChatSend = async () => {
    const text = chatInput.trim()
    if (!text || chatStreaming) return
    const userMsg = { role: 'user', content: text }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatStreaming(true)
    setChatStreamingText('')
    try {
      const apiKey = await loadApiKey()
      if (!apiKey) throw new Error('Add an API key in Settings to use chat.')
      const provider = getProvider('anthropic')

      // Snapshot paragraphs so parseClaudeResponse can validate paraIds
      const currentParas = paragraphs
      const docWithIds = currentParas.length
        ? currentParas.map(p => p.type === 'heading' ? `[${p.id}] # ${p.text}` : `[${p.id}] ${p.text}`).join('\n\n')
        : '(empty document)'

      const systemPrompt = `You are a writing assistant embedded in a document editor. You can add new paragraphs or suggest inline edits to existing ones.

Current document (each paragraph has an ID in square brackets):
${docWithIds}

RESPONSE FORMAT:
Wrap each action in a \`\`\`json ... \`\`\` block. You may include multiple blocks. Follow them with natural language commentary if helpful.

To add NEW paragraphs (content that does not already exist in the document):
\`\`\`json
{ "type": "add", "paragraphs": [{ "type": "paragraph", "text": "..." }] }
\`\`\`

To suggest edits to an existing paragraph (shown as green strikethrough/replace):
\`\`\`json
{ "type": "edit", "paraId": "exact-id-from-document", "suggestions": [{ "id": "s1", "find": "exact text to replace", "replace": "replacement text", "reasoning": "brief reason" }] }
\`\`\`

Rules:
- ONLY include genuinely new text in "add" blocks — never repeat or paraphrase existing paragraph content.
- For add requests, use only "add" blocks. For edit requests, use only "edit" blocks. You may combine both.
- Keep each "find" value short, unique, and verbatim from the paragraph text.
- Use "paragraph" or "heading" for the type in add blocks.
- Only reference paraIds that exist in the document above.`

      // PHASE 2 — Ripple: after Claude responds with edits, run a second pass
      // to detect cross-paragraph impacts (contradictions, dependency breaks, opportunities).
      // Store results as para.ripple = { type, severity, summary, sourceEdit }.

      const abortController = new AbortController()
      chatAbortRef.current = abortController
      let fullResponse = ''
      await provider.sendMessage(apiKey, newMessages, 'claude-sonnet',
        chunk => { fullResponse += chunk; setChatStreamingText(fullResponse) },
        abortController.signal, systemPrompt,
      )
      setChatMessages(prev => [...prev, { role: 'assistant', content: fullResponse }])
      setChatStreamingText('')

      const actions = parseClaudeResponse(fullResponse, currentParas)
      if (actions.adds.length > 0 || actions.edits.length > 0) {
        setParagraphs(prev => {
          let updated = [...prev]
          // Apply inline edit suggestions to their paragraphs
          for (const edit of actions.edits) {
            updated = updated.map(p =>
              p.id === edit.paraId
                ? { ...p, claudeSuggestions: [...(p.claudeSuggestions || []), ...edit.suggestions] }
                : p
            )
          }
          // Append Claude-origin paragraphs at the end
          return [...updated, ...actions.adds]
        })
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setChatMessages(prev => [...prev, { role: 'assistant', content: err.message, error: true }])
        setChatStreamingText('')
      }
    } finally {
      setChatStreaming(false)
      chatAbortRef.current = null
    }
  }

  // ── Auto-scroll chat ──────────────────────────────────────────────

  useEffect(() => {
    if (chatScrollRef.current)
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatMessages, chatStreamingText])

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
  }, [])

  // ── Ctrl+Alt+M — open comment for current selection ───────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.code === 'KeyM') {
        e.preventDefault()
        // Read the live DOM selection — don't rely on selectionInfo state
        const sel = window.getSelection()
        const selectedText = sel?.toString()?.trim()
        if (!selectedText) return
        // Walk up to find [data-para-id]
        let node = sel.anchorNode?.nodeType === Node.TEXT_NODE
          ? sel.anchorNode.parentElement
          : sel.anchorNode
        while (node) {
          if (node.dataset?.paraId) break
          node = node.parentElement
        }
        const paraId = node?.dataset?.paraId
        if (!paraId) return
        // Store the selection so handleAddComment can attach selectedText to the comment
        setSelectionInfo({ paraId, selectedText, rect: sel.getRangeAt(0).getBoundingClientRect() })
        setAddingCommentToParaId(paraId)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Prevent canvas scroll-hijack in edit mode ─────────────────────
  // When no contentEditable is focused (e.g. user clicked toolbar then back),
  // Space / PageDown / PageUp scroll the overflow container instead of typing.
  // Scoped to canvasRef so sidebar inputs are never affected — events in the
  // sidebar don't pass through the canvas element at all.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onKeyDown = (e) => {
      if (showMarkupRef.current) return  // markup mode — no editables
      if (e.target?.contentEditable === 'true') return  // document paragraph — all good
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
    // Capture phase so we intercept before the scroll event fires
    canvas.addEventListener('keydown', onKeyDown, true)
    return () => canvas.removeEventListener('keydown', onKeyDown, true)
  }, [])

  // ── Derived counts ────────────────────────────────────────────────

  const pendingComments     = paragraphs.reduce((a, p) => a + (p.comments?.length || 0), 0)
  const pendingSuggestions  = paragraphs.reduce((a, p) => a + (p.claudeSuggestions?.length || 0) + (p.claudeOrigin ? 1 : 0), 0)
  const pendingRipples      = paragraphs.filter(p => p.ripple).length

  const branchCards = [
    { id, label: conversationTitle || 'Current draft', time: 'Now', active: true, paraCount: paragraphs.length },
    ...branches.map(b => ({
      id: b.id,
      label: b.title,
      time: new Date(b.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      active: false,
      paraCount: null,
    })),
  ]

  // ── Deletion / insertion counts for submit modal ──────────────────
  const deletionCount  = paragraphs.filter(p => p.text !== p.baseline && wordDiff(p.baseline, p.text).some(d => d.type === 'deleted')).length
  const insertionCount = paragraphs.filter(p => p.text !== p.baseline && wordDiff(p.baseline, p.text).some(d => d.type === 'inserted')).length

  return (
    <div
      className="flex h-screen text-[#1E2532] overflow-hidden relative"
      style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
    >

      {/* ═══ TOOLBAR ══════════════════════════════════════════ */}
      <div className="sbrd-toolbar absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-12 border-b border-[#F0F0F0]">

        {/* Left: back + title */}
        <div className="flex items-center gap-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')}
            className="p-1.5 rounded transition-colors text-[#B8A070] hover:text-[#1E2532]"
            title="Back to Chats"
          >
            <MessageSquare className="w-4 h-4" />
          </motion.button>
          <div className="h-4 w-px bg-[#EBEBEB]" />
          <span className="text-sm font-semibold text-[#1E2532]">Secretarybird</span>
          <div className="h-4 w-px bg-[#EBEBEB]" />
          <span className="text-xs text-[#6B7C93]">
            {conversationTitle}{conversationTitle ? ' — ' : ''}{paragraphs.length} paragraph{paragraphs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Center: Comment shortcut hint + Clear All + Export */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-[#F5F5F5]" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-[#9B9A97]" title="Highlight text then press Ctrl+Alt+M to add a comment">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comment</span>
            <span className="text-[10px] text-[#C0C8D4] ml-0.5">Ctrl+Alt+M</span>
          </div>
          <div className="h-4 w-px bg-[#EBEBEB] mx-1" />
          <ToolButton icon={Eraser} label="Clear All" onClick={handleClearAll} />
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
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#E9E9E7] shadow-lg z-50 py-1 w-48"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
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

        {/* Right: toggles + context + submit */}
        <div className="flex items-center gap-2" style={{ fontFamily: 'system-ui, sans-serif' }}>

          {/* Markup toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleMarkup}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              showMarkup ? 'text-[#B8A070]' : 'text-[#6B7C93] hover:bg-[#F5F5F5]'
            }`}
            style={showMarkup ? { backgroundColor: 'rgba(184,160,112,0.1)' } : {}}
            title={showMarkup ? 'Hide tracked changes' : 'Show tracked changes'}
          >
            {showMarkup ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Markup
          </motion.button>

          {/* Ripple toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setRippleEnabled(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              rippleEnabled ? 'bg-[#E5A620]/10 text-[#E5A620]' : 'text-[#6B7C93] hover:bg-[#F5F5F5]'
            }`}
          >
            {rippleEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            Ripple
            {rippleScanning && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse ml-0.5" style={{ backgroundColor: RIPPLE_WARN, display: 'inline-block' }} />
            )}
          </motion.button>

          <div className="h-4 w-px bg-[#EBEBEB]" />

          {/* Context bar */}
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

          <div className="h-4 w-px" style={{ backgroundColor: 'var(--p-border)' }} />

          {/* Submit */}
          <motion.button
            whileHover={hasSubmittableChanges && !submitting ? { scale: 1.02 } : {}}
            whileTap={hasSubmittableChanges && !submitting ? { scale: 0.97 } : {}}
            onClick={() => hasSubmittableChanges && !submitting && setShowSubmitConfirm(true)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              hasSubmittableChanges ? 'text-white shadow-sm' : 'cursor-not-allowed'
            }`}
            style={hasSubmittableChanges
              ? { backgroundColor: GOLD, borderColor: GOLD, border: '1px solid' }
              : { backgroundColor: '#191919', border: '1px solid #4A4540', color: 'white' }
            }
          >
            <Send className="w-3.5 h-3.5" />
            Submit Edits
          </motion.button>
        </div>
      </div>

      {/* ═══ FLOATING COMMENT TOOLTIP (selection-triggered) ══ */}
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
                e.preventDefault() // keep selection alive
                setAddingCommentToParaId(selectionInfo.paraId)
                // Don't clear selectionInfo here — handleAddComment needs it to attach selectedText to the comment
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

      {/* ═══ DOCUMENT CANVAS ══════════════════════════════════ */}
      <div ref={canvasRef} className="flex-1 overflow-y-auto pt-12 sbrd-canvas">
        <div
          className="sbrd-paper mx-auto px-8 py-10 min-h-full bg-white"
          style={{ maxWidth: '860px', marginTop: '16px', marginBottom: '16px', borderRadius: '2px' }}
          onClick={(e) => {
            // Clicking on the paper background (not a paragraph) focuses the last editable para
            if (!showMarkup && e.target === e.currentTarget && paragraphs.length > 0) {
              const lastId = paragraphs[paragraphs.length - 1].id
              const el = document.querySelector(`[data-para-id="${lastId}"] [data-editable]`)
              if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); window.getSelection().removeAllRanges(); window.getSelection().addRange(r) }
            }
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
            <div className="relative">
              <div
                contentEditable
                suppressContentEditableWarning
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const text = e.currentTarget.textContent.trim()
                    if (text) {
                      setParagraphs([{ id: `p${Date.now()}`, type: 'paragraph', text, baseline: text, comments: [] }])
                    }
                  }
                }}
                onBlur={(e) => {
                  const text = e.currentTarget.textContent.trim()
                  if (text) {
                    setParagraphs([{ id: `p${Date.now()}`, type: 'paragraph', text, baseline: text, comments: [] }])
                  }
                }}
                className="text-base leading-[1.85] outline-none cursor-text relative z-10"
                style={{ minHeight: '1.85em', caretColor: GOLD, color: 'var(--p-text-primary)' }}
              />
              <div className="absolute inset-0 pointer-events-none select-none text-base leading-[1.85]" style={{ color: 'var(--p-text-muted)', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Start writing here…
              </div>
            </div>
          ) : paragraphs.map((para, index) => (
            <DocumentParagraph
              key={para.id}
              para={para}
              index={index}
              showMarkup={showMarkup}
              selected={selectedParagraph === para.id}
              activeTool={activeTool}
              onSelect={() => setSelectedParagraph(para.id === selectedParagraph ? null : para.id)}
              onTextChange={handleParagraphTextChange}
              onSplit={handleSplitParagraph}
              onMerge={handleMergeParagraph}
              paragraphs={paragraphs}
              addingComment={addingCommentToParaId === para.id}
              newCommentText={newCommentText}
              onCommentTextChange={setNewCommentText}
              onAddComment={handleAddComment}
              onCancelComment={() => { setAddingCommentToParaId(null); setNewCommentText(''); setSelectionInfo(null) }}
              onStartAddComment={() => setAddingCommentToParaId(para.id)}
              expandedComments={expandedComments}
              activeCommentId={activeCommentId}
              onSetActiveComment={id => setActiveCommentId(prev => prev === id ? null : id)}
              onClearActiveComment={() => setActiveCommentId(null)}
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
              onAcceptSuggestion={handleAcceptSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
              onAcceptOrigin={handleAcceptOrigin}
              onRejectOrigin={handleRejectOrigin}
              onTypeChange={handleParagraphTypeChange}
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
          <div className="flex flex-col items-center pt-3 gap-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 rounded-lg hover:bg-[#F5F5F5] transition-colors"
              style={{ color: GOLD }}
              title="Expand sidebar"
            >
              <PanelRight className="w-4 h-4" />
            </motion.button>
            <SidebarIconButton icon={MessageSquare} count={pendingComments + pendingSuggestions} active={sidebarTab === 'comments'} onClick={() => { setSidebarCollapsed(false); setSidebarTab('comments') }} />
            <SidebarIconButton icon={Bell} count={pendingRipples} badgeColor={RIPPLE_WARN} active={sidebarTab === 'ripple'} onClick={() => { setSidebarCollapsed(false); setSidebarTab('ripple') }} />
            <SidebarIconButton icon={GitBranch} active={sidebarTab === 'branches'} onClick={() => { setSidebarCollapsed(false); setSidebarTab('branches') }} />
            <SidebarIconButton icon={Sparkles} active={sidebarTab === 'chat'} onClick={() => { setSidebarCollapsed(false); setSidebarTab('chat') }} />
          </div>
        ) : (
          <div className="flex flex-col h-full" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Tab bar */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#F0F0F0]">
              <div className="flex items-center gap-0.5">
                {[
                  { id: 'comments', icon: MessageSquare, count: pendingComments + pendingSuggestions, title: 'Comments & Suggestions' },
                  { id: 'ripple',   icon: Bell,          count: pendingRipples,  title: 'Ripple', badgeColor: RIPPLE_WARN },
                  { id: 'branches', icon: GitBranch,     title: 'Version History' },
                  { id: 'chat',     icon: Sparkles,      title: 'Chat with Claude' },
                ].map(tab => (
                  <motion.button
                    key={tab.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSidebarTab(tab.id)}
                    title={tab.title}
                    className={`relative p-2 rounded-lg transition-colors ${sidebarTab === tab.id ? 'text-[#B8A070]' : 'text-[#6B7C93] hover:bg-[#F5F5F5]'}`}
                    style={sidebarTab === tab.id ? { backgroundColor: 'rgba(184,160,112,0.1)' } : {}}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-white px-1 py-0 rounded-full min-w-[14px] text-center" style={{ backgroundColor: tab.badgeColor || GOLD }}>
                        {tab.count}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
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
                  <motion.div key="comments" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={SPRING_SMOOTH} className="p-4 space-y-3">
                    {pendingSuggestions > 0 && (
                      <>
                        <SidebarSectionLabel label="Claude Suggestions" count={pendingSuggestions} />
                        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                          {paragraphs.filter(p => p.claudeOrigin).map(para => (
                            <ClaudeOriginCard
                              key={`origin-${para.id}`}
                              onJump={() => setSelectedParagraph(para.id)}
                              onAccept={() => handleAcceptOrigin(para.id)}
                              onReject={() => handleRejectOrigin(para.id)}
                            />
                          ))}
                          {paragraphs.filter(p => p.claudeSuggestions?.length > 0).flatMap(para =>
                            para.claudeSuggestions.map(sugg => (
                              <ClaudeSuggestionCard
                                key={sugg.id}
                                suggestion={sugg}
                                onJump={() => setSelectedParagraph(para.id)}
                                onAccept={() => handleAcceptSuggestion(para.id, sugg.id)}
                                onReject={() => handleRejectSuggestion(para.id, sugg.id)}
                              />
                            ))
                          )}
                        </motion.div>
                      </>
                    )}
                    <SidebarSectionLabel label="Comments" count={pendingComments} />
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                      {paragraphs.filter(p => p.comments?.length > 0).flatMap(para =>
                        para.comments.map(comment => (
                          <CommentCard
                            key={comment.id}
                            comment={comment}
                            expanded={expandedComments.has(comment.id)}
                            isActive={activeCommentId === comment.id}
                            onToggle={() => toggleComment(comment.id)}
                            onActivate={() => setActiveCommentId(prev => prev === comment.id ? null : comment.id)}
                            onJump={() => setSelectedParagraph(para.id)}
                            replyingTo={replyingTo}
                            setReplyingTo={setReplyingTo}
                            replyInput={replyInputs[comment.id] || ''}
                            onReplyChange={v => setReplyInputs(prev => ({ ...prev, [comment.id]: v }))}
                            submittedReplies={submittedReplies[comment.id] || []}
                            onSubmitReply={() => submitReply(comment.id)}
                          />
                        ))
                      )}
                      {paragraphs.filter(p => p.claudeNote).map(para => (
                        <ClaudeNoteCard key={`note-${para.id}`} note={para.claudeNote} onJump={() => setSelectedParagraph(para.id)} />
                      ))}
                      {pendingComments === 0 && !paragraphs.some(p => p.claudeNote) && (
                        <p className="text-[11px] text-[#6B7C93] text-center py-6">
                          {pendingSuggestions === 0 ? 'No comments yet. Highlight text then press Ctrl+Alt+M to annotate.' : 'No user comments yet.'}
                        </p>
                      )}
                    </motion.div>
                  </motion.div>
                )}

                {sidebarTab === 'ripple' && (
                  <motion.div key="ripple" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={SPRING_SMOOTH} className="p-4 space-y-3">
                    <SidebarSectionLabel label="Impact Analysis" count={pendingRipples} />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowRippleScopeModal(true)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-medium transition-colors"
                      style={{ backgroundColor: '#191919', border: '1px solid #4A4540', color: 'white', fontFamily: 'system-ui, sans-serif' }}
                    >
                      <span>Expand Scope</span>
                      <ChevronDown className="w-3 h-3" />
                    </motion.button>
                    {!rippleEnabled && (
                      <p className="px-3 py-2.5 bg-[#F5F5F5] rounded-lg text-[11px] text-[#6B7C93] leading-relaxed">
                        Ripple is off. Enable it in the toolbar to detect cross-section impacts.
                      </p>
                    )}
                    {rippleEnabled && (
                      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                        {paragraphs.filter(p => p.ripple).map(para => (
                          <RippleCard
                            key={`ripple-${para.id}`}
                            ripple={para.ripple}
                            paraText={para.text}
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
                  <motion.div key="branches" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={SPRING_SMOOTH} className="p-4 space-y-3">
                    <SidebarSectionLabel label="Version History" />
                    <p className="text-[11px] text-[#6B7C93] leading-relaxed">Each submission creates a branch. Navigate back to any previous version — nothing is lost.</p>
                    <div className="space-y-0.5">
                      {branchCards.map((branch, i) => (
                        <BranchCard key={branch.id} branch={branch} isLast={i === branchCards.length - 1} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {sidebarTab === 'chat' && (
                  <motion.div key="chat" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={SPRING_SMOOTH} className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 96px)' }}>

                    {/* Messages */}
                    <div ref={chatScrollRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
                      <SidebarSectionLabel label="Chat with Claude" />
                      {chatMessages.length === 0 && !chatStreaming && (
                        <>
                          <div className="px-3 py-2.5 rounded-xl rounded-bl-md text-[11px] leading-relaxed" style={{ backgroundColor: '#191919', border: '1px solid #3A3730', color: 'white' }}>
                            Ask me to write content, continue the story, suggest edits, or review your draft. My response will be added as new paragraphs in the document.
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <ChatShortcut label="Continue the story" onClick={() => setChatInput('Continue the story in the same style')} />
                            <ChatShortcut label="Write a new section" onClick={() => setChatInput('Write a new section')} />
                            <ChatShortcut label="Review my changes" onClick={() => setChatInput('Review the changes I\'ve made and give feedback')} />
                          </div>
                        </>
                      )}
                      {chatMessages.map((msg, i) => (
                        msg.role === 'user' ? (
                          <div key={i} className="ml-3 px-3 py-2 bg-[#F5F5F5] rounded-xl rounded-br-sm text-[11px] text-[#1E2532] leading-relaxed">
                            {msg.content}
                          </div>
                        ) : msg.error ? (
                          <div key={i} className="px-3 py-2 bg-red-50 border border-red-100 text-red-600 text-[11px] rounded-xl leading-relaxed">
                            {msg.content}
                          </div>
                        ) : (
                          /* Completed assistant response — compact indicator, full text stays in state for API context */
                          <div key={i} className="flex items-center gap-1.5 px-1 py-1 text-[11px]">
                            <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: SUGGESTION }} />
                            <span style={{ color: SUGGESTION }}>Done — see document</span>
                          </div>
                        )
                      ))}
                      {/* Streaming: show the text being written in real time */}
                      {chatStreaming && (
                        <div className="px-3 py-2.5 rounded-xl rounded-bl-sm text-[11px] text-[#4A5568] leading-relaxed" style={{ backgroundColor: `${SUGGESTION}08`, border: `1px solid ${SUGGESTION}20` }}>
                          {chatStreamingText ? (
                            <>
                              {chatStreamingText}
                              <span className="inline-block w-1 h-3 bg-current opacity-60 ml-0.5 animate-pulse" />
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: GOLD, animationDelay: `${i * 0.15}s` }} />
                              ))}
                              <span className="text-[10px] text-[#6B7C93]">Writing to document…</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-[#F0F0F0]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ask Claude about your draft…"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend() } }}
                          disabled={chatStreaming}
                          className="flex-1 px-3 py-2 rounded-lg text-xs focus:outline-none transition-colors disabled:opacity-50"
                          style={{ backgroundColor: '#191919', border: '1px solid #3A3730', color: 'white', fontFamily: 'system-ui, sans-serif' }}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={chatStreaming ? () => { chatAbortRef.current?.abort(); setChatStreaming(false) } : handleChatSend}
                          className="p-2 rounded-lg text-white transition-colors flex-shrink-0"
                          style={{ backgroundColor: chatStreaming ? DELETION : GOLD }}
                        >
                          {chatStreaming ? <X className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
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

      {/* ═══ RIPPLE SCOPE MODAL ═══════════════════════════════ */}
      <AnimatePresence>
        {showRippleScopeModal && (
          <RippleScopeModal
            currentId={id}
            currentTitle={conversationTitle}
            onClose={() => setShowRippleScopeModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ SUBMIT CONFIRMATION MODAL ════════════════════════ */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            onClick={() => !submitting && setShowSubmitConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={SPRING_SMOOTH}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl shadow-black/10 border border-[#E9E9E7] p-6 w-[420px]"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {submitting ? (
                /* Loading state */
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: GOLD, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#1E2532]">Sending to Claude…</p>
                    <p className="text-xs text-[#6B7C93] mt-1">
                      {pendingComments > 0 ? 'Claude is reviewing your comments and edits.' : 'Claude is reviewing your edits.'}
                      {rippleEnabled ? ' Impact analysis running.' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                /* Confirmation state */
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(184,160,112,0.1)' }}>
                      <Send className="w-5 h-5" style={{ color: GOLD }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E2532]">Submit Edits to Claude</h3>
                      <p className="text-xs text-[#6B7C93] mt-1 leading-relaxed">
                        {pendingComments > 0
                          ? 'Your edits and comments will be sent to Claude for review. A branch will preserve the current version.'
                          : 'Your edits will be sent to Claude. A branch will be created to preserve the current version.'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#F5F5F5] rounded-xl p-4 mb-4 space-y-2">
                    <SummaryRow icon={Eraser}        label="Paragraphs changed" count={paragraphs.filter(p => p.text !== p.baseline).length} color={INSERTION} />
                    <SummaryRow icon={MessageSquare} label="Comments"           count={pendingComments} color={GOLD} />
                    {rippleEnabled && <SummaryRow icon={Bell} label="Ripple impact analysis" count={null} color={RIPPLE_WARN} suffix="will run" />}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ backgroundColor: 'rgba(184,160,112,0.08)' }}>
                    <GitBranch className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
                    <span className="text-[11px] leading-relaxed" style={{ color: GOLD }}>A new branch will be created. You can return to this version anytime.</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSubmitConfirm(false)} className="px-4 py-2 text-xs font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#F5F5F5] rounded-lg transition-colors">Cancel</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSubmitAndBranch} className="px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm" style={{ backgroundColor: GOLD }}>Submit & Branch</motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  DOCUMENT PARAGRAPH — contentEditable with tracked changes  */
/* ═══════════════════════════════════════════════════════════ */

const SLASH_OPTIONS = [
  { id: 'title', label: 'Title',     description: 'Document title',       type: 'title'    },
  { id: 'h1',    label: 'Heading 1', description: 'Large section title',  type: 'heading'  },
  { id: 'h2',    label: 'Heading 2', description: 'Subsection title',     type: 'heading2' },
  { id: 'quote', label: 'Quote',     description: 'Blockquote callout',   type: 'quote'    },
]

function DocumentParagraph({
  para, index, showMarkup, selected, activeTool,
  onSelect, onTextChange, onSplit, onMerge, paragraphs,
  addingComment, newCommentText, onCommentTextChange, onAddComment, onCancelComment, onStartAddComment,
  expandedComments, activeCommentId, onSetActiveComment, onClearActiveComment,
  onToggleComment, hoveredRipple, onHoverRipple, rippleEnabled,
  replyingTo, setReplyingTo, replyInputs, setReplyInputs, submittedReplies, onSubmitReply,
  onAcceptSuggestion, onRejectSuggestion, onAcceptOrigin, onRejectOrigin,
  onTypeChange,
}) {
  const editRef = useRef(null)
  const isComposing = useRef(false)
  const skipNextSync = useRef(false)
  const [slashOpen,   setSlashOpen]   = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashIndex,  setSlashIndex]  = useState(0)

  // Sync para.text → DOM whenever text changes.
  // showMarkup is NOT a dependency — contentEditable is always mounted now.
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
    if (text === '/' || (text.startsWith('/') && !text.includes('\n'))) {
      setSlashOpen(true)
      setSlashFilter(text.slice(1).toLowerCase())
      setSlashIndex(0)
    } else {
      setSlashOpen(false)
    }
  }

  const handleKeyDown = (e) => {
    if (isComposing.current) return

    // Slash menu navigation
    if (slashOpen) {
      const filtered = SLASH_OPTIONS.filter(opt =>
        opt.label.toLowerCase().includes(slashFilter) || opt.id.includes(slashFilter)
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
      // Focus the new paragraph after state updates
      requestAnimationFrame(() => {
        const idx = paragraphs.findIndex(p => p.id === para.id)
        const nextPara = paragraphs[idx + 1]
        if (nextPara) {
          const nextEl = document.querySelector(`[data-para-id="${nextPara.id}"] [data-editable]`)
          if (nextEl) { nextEl.focus(); setCursorAt(nextEl, 0) }
        }
      })
    }

    if (e.key === 'Backspace') {
      const sel = window.getSelection()
      if (sel?.isCollapsed && sel.anchorOffset === 0 && getTextOffset(editRef.current, sel.anchorNode, sel.anchorOffset) === 0) {
        e.preventDefault()
        const idx = paragraphs.findIndex(p => p.id === para.id)
        if (idx === 0) return
        const prevPara = paragraphs[idx - 1]
        const joinAt = prevPara.text.length
        onMerge(para.id)
        // Focus previous paragraph at join point
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

  const handleClick = () => {
    if (activeTool === 'comment') {
      onStartAddComment()
      onSelect()
    } else {
      onSelect()
    }
  }

  const hasComments     = para.comments?.length > 0
  const hasSuggestions  = para.claudeSuggestions?.length > 0
  const hasOrigin       = para.claudeOrigin === true
  const hasGutterContent = hasComments || hasSuggestions || hasOrigin
  const hasRipple       = para.ripple && rippleEnabled
  const isRippleHovered = hoveredRipple === para.id

  // Highlight the selected text that an active comment was made on
  const activeComment   = para.comments?.find(c => c.id === activeCommentId) ?? null
  const activeHighlight = activeComment?.selectedText || null

  if (para.type === 'title') {
    return (
      <motion.div
        data-para-id={para.id}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: Math.min(index * 0.04, 0.3) }}
        className="mb-10 mt-2"
        onClick={handleClick}
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
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_GENTLE, delay: Math.min(index * 0.04, 0.3) }}
        className="mb-8 mt-4"
        onClick={handleClick}
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
      <motion.div data-para-id={para.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: Math.min(index * 0.04, 0.3) }} className="mb-6 mt-3" onClick={handleClick}>
        <div className="relative">
          <h2 ref={editRef} data-editable contentEditable suppressContentEditableWarning
            onInput={handleInput} onKeyDown={handleKeyDown} onPaste={handlePaste}
            onCompositionStart={() => { isComposing.current = true }}
            onCompositionEnd={e => { isComposing.current = false; handleInput(e) }}
            className="text-xl font-semibold leading-tight outline-none"
            style={{ caretColor: GOLD, color: (showMarkup || activeHighlight) ? 'transparent' : 'var(--p-text-primary)' }}
          />
          {(showMarkup || activeHighlight) && (
            <h2 className="absolute inset-0 text-xl font-semibold leading-tight pointer-events-none select-none" style={{ color: 'var(--p-text-primary)' }}>
              {activeHighlight ? <HighlightedText text={para.text} highlight={activeHighlight} /> : <DiffText baseline={para.baseline} text={para.text} />}
            </h2>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      data-para-id={para.id}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_GENTLE, delay: Math.min(index * 0.04, 0.3) }}
      className="relative group mb-6"
      onClick={() => { onClearActiveComment(); if (editRef.current) editRef.current.focus() }}
    >
      <div className="flex">
        {/* Document column */}
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
            {/* Paragraph text — always editable. Overlay shows diff or highlight without blocking input. */}
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
                  color: (showMarkup || activeHighlight) ? 'transparent' : (para.type === 'quote' ? 'var(--p-text-secondary)' : 'var(--p-text-primary)'),
                  ...(para.type === 'quote' ? { borderLeftColor: `${GOLD}50` } : {}),
                }}
              />
              {/* Overlay — diff in markup mode, or highlight when a comment is active */}
              {(showMarkup || activeHighlight) && (
                <p
                  className={`absolute inset-0 text-base leading-[1.85] pointer-events-none select-none${para.type === 'quote' ? ' italic pl-4 border-l-2' : ''}`}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: '1.85em', color: para.type === 'quote' ? 'var(--p-text-secondary)' : 'var(--p-text-primary)', ...(para.type === 'quote' ? { borderLeftColor: `${GOLD}50` } : {}) }}
                >
                  {activeHighlight
                    ? <HighlightedText text={para.text} highlight={activeHighlight} />
                    : <DiffText baseline={para.baseline} text={para.text} />}
                </p>
              )}
              {/* Slash command menu */}
              {slashOpen && (() => {
                const filtered = SLASH_OPTIONS.filter(opt =>
                  opt.label.toLowerCase().includes(slashFilter) || opt.id.includes(slashFilter)
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

            {/* Claude inline suggestion previews — markup mode only */}
            {showMarkup && hasSuggestions && (
              <div className="mt-2 space-y-2">
                {para.claudeSuggestions.map(sugg => (
                  <div
                    key={sugg.id}
                    className="pl-3 border-l-2 py-0.5"
                    style={{ borderColor: `${SUGGESTION}40` }}
                  >
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

            {/* Claude-origin label — markup mode only */}
            {showMarkup && hasOrigin && (
              <div className="mt-1 flex items-center gap-1.5" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <Sparkles className="w-3 h-3" style={{ color: SUGGESTION }} />
                <span className="text-[10px] font-medium" style={{ color: SUGGESTION }}>Added by Claude</span>
              </div>
            )}

            {/* Claude note */}
            {para.claudeNote && showMarkup && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg border"
                style={{ backgroundColor: `${SUGGESTION}08`, borderColor: `${SUGGESTION}20` }}
              >
                <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: SUGGESTION }} />
                <span className="text-[11px] text-[#4A5568] leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>{para.claudeNote}</span>
              </motion.div>
            )}

            {/* Ripple indicator */}
            {hasRipple && showMarkup && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                onMouseEnter={() => onHoverRipple(para.id)}
                onMouseLeave={() => onHoverRipple(null)}
                className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                style={{
                  backgroundColor: para.ripple.type === 'contradiction' ? `${RIPPLE_WARN}0D` : `${RIPPLE_OPP}0A`,
                  borderColor:     para.ripple.type === 'contradiction' ? `${RIPPLE_WARN}30` : `${RIPPLE_OPP}25`,
                }}
              >
                {para.ripple.type === 'contradiction'
                  ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: RIPPLE_WARN }} />
                  : <Lightbulb    className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: RIPPLE_OPP }} />
                }
                <span className="text-[11px] text-[#4A5568] leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>{para.ripple.summary}</span>
              </motion.div>
            )}

            {/* Comment tool inline form */}
            {addingComment && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-3"
                onClick={e => e.stopPropagation()}
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
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => onAddComment(para.id)} className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg text-white flex-shrink-0" style={{ backgroundColor: GOLD }}>Add</motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onCancelComment} className="px-2 py-1.5 text-[11px] text-[#6B7C93] hover:bg-[#F5F5F5] rounded-lg transition-colors flex-shrink-0">Cancel</motion.button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Comment / suggestion gutter */}
        {showMarkup && hasGutterContent && (
          <div style={{ width: '35%' }} className="flex-shrink-0 pl-6 relative">
            <div className="absolute left-0 top-3 w-6 h-px bg-[#EBEBEB]" />
            <div className="space-y-2">
              {/* Claude-origin card */}
              {hasOrigin && (
                <ClaudeOriginCard
                  onAccept={() => onAcceptOrigin(para.id)}
                  onReject={() => onRejectOrigin(para.id)}
                />
              )}
              {/* Claude suggestion cards */}
              {hasSuggestions && para.claudeSuggestions.map(sugg => (
                <ClaudeSuggestionCard
                  key={sugg.id}
                  suggestion={sugg}
                  onAccept={() => onAcceptSuggestion(para.id, sugg.id)}
                  onReject={() => onRejectSuggestion(para.id, sugg.id)}
                />
              ))}
              {/* User comments */}
              {para.comments.map(comment => (
                <MarginComment
                  key={comment.id}
                  comment={comment}
                  expanded={expandedComments.has(comment.id)}
                  isActive={activeCommentId === comment.id}
                  onToggle={() => onToggleComment(comment.id)}
                  onActivate={() => onSetActiveComment(comment.id)}
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

/* ═══════════════════════════════════════════════════════════ */
/*  MARGIN COMMENT                                             */
/* ═══════════════════════════════════════════════════════════ */

function MarginComment({ comment, expanded, isActive, onToggle, onActivate, replyingTo, setReplyingTo, replyInput, onReplyChange, submittedReplies, onSubmitReply }) {
  const isReplying = replyingTo === comment.id
  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={SPRING_SMOOTH} style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div
        className="px-3 py-2 bg-[#FFF9E6] rounded-lg cursor-pointer hover:bg-[#FFF5D6] transition-colors"
        style={{ border: isActive ? `1.5px solid ${GOLD}` : '1px solid #E5D9A8' }}
        onClick={() => { onActivate(); onToggle() }}
      >
        {comment.selectedText && (
          <p className="text-[10px] text-[#9B8A2F] italic leading-relaxed mb-1.5 pb-1.5 border-b border-[#E5D9A8]/60 truncate">
            "{comment.selectedText}"
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] text-[#6B5D1F] leading-relaxed">{comment.text}</p>
          {comment.claudeReply && (
            <ChevronDown className="w-3 h-3 flex-shrink-0 mt-0.5 transition-transform" style={{ color: '#B5A353', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && comment.claudeReply && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING_SMOOTH} className="overflow-hidden">
            <div className="ml-3 mt-1 pl-3 border-l-2 border-[#22C55E]/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-2.5 h-2.5" style={{ color: SUGGESTION }} />
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>Claude</span>
              </div>
              <p className="text-[10px] text-[#4A5568] leading-relaxed">{comment.claudeReply.text}</p>
              {submittedReplies.map((reply, i) => (
                <div key={i} className="mt-2 pt-2 border-t border-[#22C55E]/15">
                  <p className="text-[10px] text-[#6B5D1F] leading-relaxed">{reply.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Reply section — always available */}
      <div className="mt-1.5" onClick={e => e.stopPropagation()}>
        {!isReplying ? (
          <motion.button whileTap={{ scale: 0.95 }} onClick={e => { e.stopPropagation(); setReplyingTo(comment.id) }} className="text-[9px] font-medium transition-colors" style={{ color: `${GOLD}99` }} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = `${GOLD}99`}>Reply</motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SMOOTH} className="flex items-center gap-1.5">
            <input
              autoFocus type="text" placeholder="Reply…"
              value={replyInput} onChange={e => onReplyChange(e.target.value)}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); onSubmitReply() } if (e.key === 'Escape') setReplyingTo(null) }}
              className="flex-1 px-2 py-1 text-[10px] bg-white border border-[#E5D9A8] rounded focus:outline-none focus:border-[#B8A070] transition-colors text-[#1E2532]"
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onSubmitReply} className="p-1 rounded transition-colors" style={{ color: GOLD }}><Send className="w-3 h-3" /></motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  SIDEBAR COMPONENTS                                         */
/* ═══════════════════════════════════════════════════════════ */

function SidebarIconButton({ icon: Icon, count, badgeColor, onClick, active }) {
  return (
    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClick} className="relative p-2 rounded-lg transition-colors" style={active ? { backgroundColor: 'rgba(184,160,112,0.1)', color: GOLD } : { color: '#6B7C93' }}>
      <Icon className="w-4 h-4" />
      {count > 0 && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-white px-1 py-0 rounded-full min-w-[14px] text-center" style={{ backgroundColor: badgeColor || GOLD }}>{count}</span>}
    </motion.button>
  )
}

function SidebarSectionLabel({ label, count }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">{label}</h3>
      {count !== undefined && <span className="text-[10px] font-semibold" style={{ color: GOLD }}>{count}</span>}
    </div>
  )
}

function CommentCard({ comment, expanded, isActive, onToggle, onActivate, onJump, replyingTo, setReplyingTo, replyInput, onReplyChange, submittedReplies, onSubmitReply }) {
  const isReplying = replyingTo === comment.id
  return (
    <motion.div
      variants={staggerItem}
      className="px-3 py-2.5 bg-[#FFF9E6] rounded-xl cursor-pointer transition-colors"
      style={{ border: isActive ? `1.5px solid ${GOLD}` : '1px solid #E5D9A8' }}
      onClick={onActivate}
    >
      {comment.selectedText && (
        <p className="text-[10px] text-[#9B8A2F] italic leading-relaxed mb-1.5 pb-1.5 border-b border-[#E5D9A8]/60 truncate">
          "{comment.selectedText}"
        </p>
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[11px] text-[#6B5D1F] leading-relaxed flex-1">{comment.text}</p>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={e => { e.stopPropagation(); onJump() }} className="p-1 rounded flex-shrink-0 transition-colors" style={{ color: '#B5A353' }} title="Jump to paragraph"><ArrowRight className="w-3 h-3" /></motion.button>
      </div>
      {comment.claudeReply && (
        <div className="mt-2 pt-2 border-t border-[#E5D9A8]/50">
          <div className="flex items-center gap-1.5 mb-1 cursor-pointer" onClick={onToggle}>
            <Sparkles className="w-2.5 h-2.5" style={{ color: SUGGESTION }} />
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>Claude's reasoning</span>
            <ChevronDown className="w-3 h-3 ml-auto transition-transform" style={{ color: SUGGESTION, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <p className="text-[10px] text-[#4A5568] leading-relaxed">{comment.claudeReply.text}</p>
                {submittedReplies.map((reply, i) => (
                  <div key={i} className="mt-2 pt-2 border-t border-[#E5D9A8]/40"><p className="text-[10px] text-[#6B5D1F] leading-relaxed">{reply.text}</p></div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {/* Reply section — always available */}
      <div className="mt-2">
        {!isReplying ? (
          <motion.button whileTap={{ scale: 0.95 }} onClick={e => { e.stopPropagation(); setReplyingTo(comment.id) }} className="text-[9px] font-medium transition-colors" style={{ color: `${GOLD}99` }} onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = `${GOLD}99`}>Reply</motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SMOOTH} className="flex items-center gap-1.5">
            <input
              autoFocus type="text" placeholder="Reply…"
              value={replyInput} onChange={e => onReplyChange(e.target.value)}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); onSubmitReply() } if (e.key === 'Escape') setReplyingTo(null) }}
              className="flex-1 px-2 py-1 text-[10px] bg-white border border-[#E5D9A8] rounded focus:outline-none focus:border-[#B8A070] transition-colors text-[#1E2532]"
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onSubmitReply} className="p-1 rounded transition-colors" style={{ color: GOLD }}><Send className="w-3 h-3" /></motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function ClaudeNoteCard({ note, onJump }) {
  return (
    <motion.div variants={staggerItem} className="px-3 py-2.5 rounded-xl border" style={{ backgroundColor: `${SUGGESTION}08`, borderColor: `${SUGGESTION}20` }}>
      <div className="flex items-start gap-2">
        <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: SUGGESTION }} />
        <p className="text-[11px] text-[#4A5568] leading-relaxed flex-1">{note}</p>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onJump} className="p-1 rounded flex-shrink-0 transition-colors" style={{ color: `${SUGGESTION}80` }}><ArrowRight className="w-3 h-3" /></motion.button>
      </div>
    </motion.div>
  )
}

/* ─── Claude-origin paragraph card (Keep / Remove) ──────── */

function ClaudeOriginCard({ onAccept, onReject, onJump }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={SPRING_SMOOTH}
      className="px-3 py-2.5 rounded-lg border"
      style={{ backgroundColor: `${SUGGESTION}08`, borderColor: `${SUGGESTION}30`, fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: SUGGESTION }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>Added by Claude</span>
        {onJump && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onJump} className="ml-auto p-0.5 rounded" style={{ color: `${SUGGESTION}70` }}>
            <ArrowRight className="w-3 h-3" />
          </motion.button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <motion.button
          whileTap={{ scale: 0.95 }} onClick={onAccept}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold text-white"
          style={{ backgroundColor: SUGGESTION }}
        >
          <Check className="w-2.5 h-2.5" /> Keep
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }} onClick={onReject}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold text-[#6B7C93] border border-[#E5E7EB] hover:bg-[#F5F5F5] transition-colors"
        >
          <X className="w-2.5 h-2.5" /> Remove
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ─── Claude suggestion card (Accept / Reject per chunk) ─── */

function ClaudeSuggestionCard({ suggestion, onAccept, onReject, onJump }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={SPRING_SMOOTH}
      className="px-3 py-2.5 rounded-lg border"
      style={{ backgroundColor: `${SUGGESTION}08`, borderColor: `${SUGGESTION}30`, fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: SUGGESTION }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>Suggested edit</span>
        {onJump && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onJump} className="ml-auto p-0.5 rounded" style={{ color: `${SUGGESTION}70` }}>
            <ArrowRight className="w-3 h-3" />
          </motion.button>
        )}
      </div>
      {suggestion.reasoning && (
        <div className="mb-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] text-[#6B7C93] hover:text-[#4A5568] transition-colors"
          >
            <ChevronDown
              className="w-3 h-3 transition-transform"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            Reasoning
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <p className="text-[10px] text-[#4A5568] leading-relaxed mt-1 pl-2 border-l-2" style={{ borderColor: `${SUGGESTION}40` }}>
                  {suggestion.reasoning}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <motion.button
          whileTap={{ scale: 0.95 }} onClick={onAccept}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold text-white"
          style={{ backgroundColor: SUGGESTION }}
        >
          <Check className="w-2.5 h-2.5" /> Accept
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }} onClick={onReject}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold text-[#6B7C93] border border-[#E5E7EB] hover:bg-[#F5F5F5] transition-colors"
        >
          <X className="w-2.5 h-2.5" /> Reject
        </motion.button>
      </div>
    </motion.div>
  )
}

function RippleCard({ ripple, paraText, onJump, onHover, onLeave }) {
  const isWarning = ripple.type === 'contradiction' || ripple.type === 'dependency_break'
  const color = isWarning ? RIPPLE_WARN : RIPPLE_OPP
  const Icon  = isWarning ? AlertTriangle : Lightbulb
  const typeLabel = { contradiction: 'Contradiction', dependency_break: 'Dependency Break', opportunity: 'Opportunity', tone_shift: 'Tone Shift', duplication: 'Duplication' }[ripple.type] || ripple.type
  return (
    <motion.div variants={staggerItem} onMouseEnter={onHover} onMouseLeave={onLeave} className="px-3 py-2.5 rounded-xl border cursor-pointer transition-colors" style={{ backgroundColor: `${color}0C`, borderColor: `${color}25` }}>
      <div className="flex items-start gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{typeLabel}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: ripple.severity === 'high' ? `${DELETION}18` : ripple.severity === 'medium' ? `${RIPPLE_WARN}18` : 'rgba(107,124,147,0.12)', color: ripple.severity === 'high' ? DELETION : ripple.severity === 'medium' ? RIPPLE_WARN : '#6B7C93' }}>{ripple.severity}</span>
          </div>
          <p className="text-[11px] text-[#4A5568] leading-relaxed">{ripple.summary}</p>
          {paraText && (
            <p className="text-[10px] text-[#6B7C93] mt-1.5 flex items-center gap-1">
              <CornerDownRight className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate italic">&ldquo;{paraText.slice(0, 80)}{paraText.length > 80 ? '…' : ''}&rdquo;</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-5">
        <motion.button whileTap={{ scale: 0.97 }} onClick={onJump} className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors" style={{ color }}>Go to paragraph</motion.button>
        <motion.button whileTap={{ scale: 0.97 }} className="text-[10px] font-semibold text-[#6B7C93] px-2 py-1 rounded-md hover:bg-[#F5F5F5] transition-colors">Dismiss</motion.button>
      </div>
    </motion.div>
  )
}

function BranchCard({ branch, isLast }) {
  return (
    <motion.div whileHover={{ x: 2 }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors" style={branch.active ? { backgroundColor: 'rgba(184,160,112,0.07)', border: `1px solid rgba(184,160,112,0.2)` } : {}}>
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: branch.active ? GOLD : '#D1D5DB', backgroundColor: branch.active ? GOLD : 'white' }} />
        {!isLast && <div className="w-px flex-1 mt-1" style={{ backgroundColor: '#E5E7EB', minHeight: '16px' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-[#1E2532] truncate">{branch.label}</p>
        <p className="text-[10px] text-[#6B7C93]">{branch.time}{branch.paraCount != null ? ` · ${branch.paraCount} paragraphs` : ''}</p>
      </div>
    </motion.div>
  )
}

/* ─── Toolbar helpers ────────────────────────────────────── */

function ToolButton({ icon: Icon, label, active, onClick, activeColor }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }} onClick={onClick} title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${active ? 'bg-white shadow-sm text-[#1E2532]' : 'text-[#6B7C93] hover:text-[#1E2532]'}`}
    >
      <Icon className="w-3.5 h-3.5" style={active && activeColor ? { color: activeColor } : {}} />
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

function ChatShortcut({ label, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClick}
      className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
      style={{ color: GOLD, backgroundColor: 'rgba(184,160,112,0.08)', fontFamily: 'system-ui, sans-serif' }}
    >
      {label}
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  RIPPLE SCOPE MODAL                                         */
/* ═══════════════════════════════════════════════════════════ */

function RippleScopeModal({ currentId, currentTitle, onClose }) {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [generateManifest, setGenerateManifest] = useState(false)
  const [saveScope, setSaveScope] = useState(false)

  useEffect(() => {
    listConversations().then(all => setConversations(all.filter(c => c.id !== currentId)))
  }, [currentId])

  const toggleAll = () => {
    if (selected.size === conversations.length) setSelected(new Set())
    else setSelected(new Set(conversations.map(c => c.id)))
  }

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  // Rough token estimate: ~500 tokens per chat scanned
  const estTokens = selected.size * 500
  const estCost = (estTokens / 1000000 * 3).toFixed(2)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={SPRING_SMOOTH}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl shadow-black/10 border border-[#E9E9E7] p-6 w-[480px] max-h-[70vh] flex flex-col"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--p-text-primary)' }}>Expand Ripple Scope</h3>
            <p className="text-xs text-[#6B7C93] mt-1">Select chats to scan for cross-document consistency impacts.</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#6B7C93]"><X className="w-4 h-4" /></motion.button>
        </div>

        {/* Select all */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-[#6B7C93] uppercase tracking-wider">Chats</span>
          <button onClick={toggleAll} className="text-[10px] font-medium transition-colors" style={{ color: GOLD }}>
            {selected.size === conversations.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto space-y-1 mb-4 min-h-0">
          {conversations.length === 0 && (
            <p className="text-[11px] text-[#6B7C93] text-center py-6">No other chats found.</p>
          )}
          {conversations.map(conv => (
            <label key={conv.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F5F5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={selected.has(conv.id)}
                onChange={() => toggle(conv.id)}
                className="rounded"
                style={{ accentColor: GOLD }}
              />
              <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--p-text-primary)' }}>{conv.title || 'Untitled'}</span>
            </label>
          ))}
        </div>

        {/* Token estimate */}
        {selected.size > 0 && (
          <div className="px-3 py-2 rounded-lg bg-[#F5F5F5] mb-4 text-[11px] text-[#6B7C93]">
            Scanning {selected.size} chat{selected.size !== 1 ? 's' : ''} · ~{estTokens.toLocaleString()} tokens · estimated cost ${estCost}
          </div>
        )}

        {/* Options */}
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={generateManifest} onChange={e => setGenerateManifest(e.target.checked)} style={{ accentColor: GOLD }} />
            <div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--p-text-primary)' }}>Generate Revision Manifest</span>
              <p className="text-[10px] text-[#6B7C93]">Save results as a persistent manifest you can act on later</p>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={saveScope} onChange={e => setSaveScope(e.target.checked)} style={{ accentColor: GOLD }} />
            <div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--p-text-primary)' }}>Save Scope</span>
              <p className="text-[10px] text-[#6B7C93]">Remember this chat list across sessions</p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <motion.button whileTap={{ scale: 0.97 }} onClick={onClose} className="px-4 py-2 text-xs font-semibold text-[#6B7C93] hover:bg-[#F5F5F5] rounded-lg transition-colors">Cancel</motion.button>
          <motion.button
            whileHover={selected.size > 0 ? { scale: 1.02 } : {}}
            whileTap={selected.size > 0 ? { scale: 0.97 } : {}}
            disabled={selected.size === 0}
            className="px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            style={selected.size > 0
              ? { backgroundColor: '#C4A94D', border: '1px solid #C4A94D' }
              : { backgroundColor: '#191919', border: '1px solid #4A4540' }
            }
          >
            Scan {selected.size > 0 ? `${selected.size} Chat${selected.size !== 1 ? 's' : ''}` : 'Chats'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
