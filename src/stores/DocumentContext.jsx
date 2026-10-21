// DocumentContext — Phase 1 PR-11b.
//
// Owns the document state that V1 SecretarybirdChatLayout used to own
// inline. Mounted at App.jsx (between FileShelfProvider and BrowserRouter,
// alongside Annotations / BranchPanel / CollabMode / FileShelf) so every
// /chat/:id surface in a Drafting Desk room — document-canvas@1.0,
// claude-comments@1.0, ripple-analysis@1.0 — reads the same in-memory
// copy of paragraphs / comments / suggestions / ripple flags.
//
// Why a shared context (not the hostAPI bus): same reasoning as
// FileShelfContext (PR-11a). The hostAPI's three Phase 1 events are
// change-notification pipes; they do not retain state, so a late
// subscriber (e.g. ripple-analysis mounting after the user has typed
// some paragraphs) would miss the most recent payload. A React Context
// covers both initial subscribers and late ones.
//
// State is per-conversation. When `useChat().activeConversationId`
// transitions between two distinct non-null ids, the document state
// flushes and reloads against the `sbrd_documents` IndexedDB store.
// Transient nulls are ignored so a conversation→homepage→conversation
// round trip preserves the editing state (matches V1's per-mount
// lifetime).
//
// The bus stays at three Phase 1 events — PR-11b does not expand it.

import {
  createContext, useCallback, useContext, useEffect, useMemo,
  useRef, useState,
} from 'react'
import {
  getSbrdDocument, saveSbrdDocument, getConversation, getBranches,
  createConversation, updateConversation,
} from '../lib/db'
import { gateway, hasKey, DEFAULT_MODEL_PROVIDER as PROVIDER } from '../net'
import { useChat } from './ChatContext'

const DocumentContext = createContext(null)

// Stable empty references so consumers' memos don't invalidate on
// transient null windows during conversation switches. Same trick
// AnnotationsContext / FileShelfContext use.
const EMPTY_PARAGRAPHS = Object.freeze([])
const EMPTY_REPLIES = Object.freeze({})

// One-paragraph seed used when the conversation has no sbrd_documents
// record yet. Mirrors V1: a contentEditable paragraph row needs at
// least one row to exist for the user to type into.
function makeSeedParagraph() {
  return {
    id: `p-${crypto.randomUUID()}`,
    type: 'paragraph',
    text: '',
    baseline: '',
    comments: [],
  }
}

// Migrate old segments-based paragraphs (pre-V2 sbrd shape) on read.
// Lifted verbatim from V1 secretarybird ChatLayout.jsx.
function migrateParagraph(p) {
  if (p.text !== undefined && p.text !== null) {
    return { ...p, text: String(p.text ?? ''), baseline: String(p.baseline ?? p.text ?? '') }
  }
  const text = (p.segments || []).filter(s => s.type !== 'deletion').map(s => s.content).join('')
  const baseline = (p.segments || [])
    .filter(s => s.type !== 'insertion' && s.type !== 'suggestion')
    .map(s => s.content).join('')
  const result = { ...p, text, baseline }
  delete result.segments
  return result
}

export function DocumentProvider({ children }) {
  const { activeConversationId } = useChat()

  // ── Persistent document state (mirrors sbrd_documents) ───────────────
  const [paragraphs, setParagraphs] = useState(EMPTY_PARAGRAPHS)
  const [submittedReplies, setSubmittedReplies] = useState(EMPTY_REPLIES)
  const [conversationTitle, setConversationTitle] = useState('')
  const [branches, setBranches] = useState([])
  const [loaded, setLoaded] = useState(false)

  // ── Cross-component UI state shared between document-canvas
  //    (markup-mode gutter) and claude-comments / ripple-analysis ───
  const [showMarkup, setShowMarkup] = useState(false)
  const [rippleEnabled, setRippleEnabled] = useState(true)
  const [selectedParagraph, setSelectedParagraph] = useState(null)
  const [expandedComments, setExpandedComments] = useState(new Set())
  const [activeCommentId, setActiveCommentId] = useState(null)
  const [hoveredRipple, setHoveredRipple] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyInputs, setReplyInputs] = useState({})
  const [addingCommentToParaId, setAddingCommentToParaId] = useState(null)
  const [newCommentText, setNewCommentText] = useState('')
  const [selectionInfo, setSelectionInfo] = useState(null)

  // ── Submit / branch flow state ───────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  // ── Toast (Submit-and-Branch success message) ────────────────────────
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)
  const showToast = useCallback((text) => {
    clearTimeout(toastTimerRef.current)
    setToast({ text })
    toastTimerRef.current = setTimeout(() => setToast(null), 3200)
  }, [])
  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  // ── Track the conversation we last loaded; ignore transient nulls ──
  const loadedFor = useRef(null)
  const saveTimerRef = useRef(null)
  // What was loaded (or the seed for a new document). Until the paragraphs
  // or replies are replaced by an edit, there is nothing to save.
  const untouchedRef = useRef({ paragraphs: null, replies: EMPTY_REPLIES })

  useEffect(() => {
    if (activeConversationId == null) return
    if (loadedFor.current === activeConversationId) return

    loadedFor.current = activeConversationId
    setLoaded(false)
    setParagraphs(EMPTY_PARAGRAPHS)
    setSubmittedReplies(EMPTY_REPLIES)
    setConversationTitle('')
    setBranches([])
    // UI state also resets on conversation change — matches V1's
    // per-mount lifetime.
    setShowMarkup(false)
    setSelectedParagraph(null)
    setExpandedComments(new Set())
    setActiveCommentId(null)
    setHoveredRipple(null)
    setReplyingTo(null)
    setReplyInputs({})
    setAddingCommentToParaId(null)
    setNewCommentText('')
    setSelectionInfo(null)

    let cancelled = false
    Promise.all([
      getConversation(activeConversationId),
      getSbrdDocument(activeConversationId),
      getBranches(activeConversationId),
    ]).then(([conv, doc, branchList]) => {
      if (cancelled) return
      setConversationTitle(conv?.title || 'Untitled')
      setBranches(Array.isArray(branchList) ? branchList : [])
      const loadedParagraphs = doc?.paragraphs?.length ? doc.paragraphs.map(migrateParagraph) : [makeSeedParagraph()]
      const loadedReplies = doc?.submittedReplies || EMPTY_REPLIES
      untouchedRef.current = { paragraphs: loadedParagraphs, replies: loadedReplies }
      setParagraphs(loadedParagraphs)
      setSubmittedReplies(loadedReplies)
      setLoaded(true)
    }).catch((err) => {
      if (cancelled) return
      if (import.meta.env.DEV) {
        console.warn('[DocumentContext] load failed:', err)
      }
      untouchedRef.current = { paragraphs: [makeSeedParagraph()], replies: EMPTY_REPLIES }
      setParagraphs(untouchedRef.current.paragraphs)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [activeConversationId])

  // ── Auto-save (1s debounce) — only writes when loaded
  //    and we have an active conversation. Skips writes when
  //    paragraphs is the EMPTY_PARAGRAPHS sentinel (mid-switch).
  useEffect(() => {
    if (!loaded || activeConversationId == null) return
    if (paragraphs === EMPTY_PARAGRAPHS) return
    // Nothing is written until the first edit: opening a chat leaves no
    // record behind, and opening a document does not rewrite it.
    if (paragraphs === untouchedRef.current.paragraphs && submittedReplies === untouchedRef.current.replies) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveSbrdDocument(activeConversationId, { paragraphs, submittedReplies }).catch((err) => {
        if (import.meta.env.DEV) console.warn('[DocumentContext] save failed:', err)
      })
    }, 1000)
    return () => clearTimeout(saveTimerRef.current)
  }, [paragraphs, submittedReplies, loaded, activeConversationId])

  // ── Title derivation: title or first heading paragraph drives the
  //    conversation title. Persists when changed.
  useEffect(() => {
    if (!loaded || activeConversationId == null) return
    const titlePara = paragraphs.find(p => p.type === 'title')
      ?? paragraphs.find(p => p.type === 'heading')
    const derived = titlePara?.text?.trim() || ''
    if (derived && derived !== conversationTitle) {
      setConversationTitle(derived)
      updateConversation(activeConversationId, { title: derived }).catch(() => {})
    }
  }, [paragraphs, loaded, activeConversationId, conversationTitle])

  // ── Paragraph mutators ───────────────────────────────────────────────

  const updateParagraphText = useCallback((paraId, newText) => {
    setParagraphs(prev => prev.map(p => p.id === paraId ? { ...p, text: newText } : p))
  }, [])

  const splitParagraph = useCallback((paraId, cursorOffset) => {
    setParagraphs(prev => {
      const idx = prev.findIndex(p => p.id === paraId)
      if (idx === -1) return prev
      const para = prev[idx]
      const before = para.text.slice(0, cursorOffset)
      const after = para.text.slice(cursorOffset)
      const newPara = {
        id: `p-${crypto.randomUUID()}`,
        type: (para.type === 'heading' || para.type === 'heading2' || para.type === 'title')
          ? 'paragraph' : para.type,
        text: after,
        baseline: after,
        comments: [],
      }
      return [...prev.slice(0, idx), { ...para, text: before }, newPara, ...prev.slice(idx + 1)]
    })
  }, [])

  const mergeParagraph = useCallback((paraId) => {
    setParagraphs(prev => {
      const idx = prev.findIndex(p => p.id === paraId)
      if (idx === 0 || idx === -1) return prev
      const prevPara = prev[idx - 1]
      const currPara = prev[idx]
      const mergedText = prevPara.text + currPara.text
      return [
        ...prev.slice(0, idx - 1),
        { ...prevPara, text: mergedText },
        ...prev.slice(idx + 1),
      ]
    })
  }, [])

  const setParagraphType = useCallback((paraId, newType) => {
    setParagraphs(prev => prev.map(p => p.id === paraId ? { ...p, type: newType } : p))
  }, [])

  // ── Comment mutators ─────────────────────────────────────────────────

  const toggleExpandedComment = useCallback((commentId) => {
    setExpandedComments(prev => {
      const n = new Set(prev)
      if (n.has(commentId)) n.delete(commentId)
      else n.add(commentId)
      return n
    })
  }, [])

  const submitReply = useCallback((commentId) => {
    const text = replyInputs[commentId]?.trim()
    if (!text) return
    setSubmittedReplies(prev => ({ ...prev, [commentId]: [...(prev[commentId] || []), { text }] }))
    setReplyInputs(prev => ({ ...prev, [commentId]: '' }))
    setReplyingTo(null)
  }, [replyInputs])

  const addComment = useCallback((paraId) => {
    const text = newCommentText.trim()
    if (!text) return
    const selectedText = selectionInfo?.paraId === paraId ? selectionInfo.selectedText : null
    setParagraphs(prev => prev.map(p =>
      p.id === paraId
        ? {
            ...p,
            comments: [
              ...(p.comments || []),
              { id: `c${Date.now()}`, text, selectedText, claudeReply: null },
            ],
          }
        : p,
    ))
    setNewCommentText('')
    setAddingCommentToParaId(null)
    setSelectionInfo(null)
  }, [newCommentText, selectionInfo])

  const deleteComment = useCallback((paraId, commentId) => {
    setParagraphs(prev => prev.map(p =>
      p.id === paraId
        ? { ...p, comments: (p.comments || []).filter(c => c.id !== commentId) }
        : p,
    ))
    setActiveCommentId(prev => prev === commentId ? null : prev)
    setExpandedComments(prev => {
      if (!prev.has(commentId)) return prev
      const n = new Set(prev); n.delete(commentId); return n
    })
    setReplyInputs(prev => {
      if (!(commentId in prev)) return prev
      const n = { ...prev }; delete n[commentId]; return n
    })
    setSubmittedReplies(prev => {
      if (!(commentId in prev)) return prev
      const n = { ...prev }; delete n[commentId]; return n
    })
    setReplyingTo(prev => prev === commentId ? null : prev)
  }, [])

  // ── Suggestion / Claude-origin handlers ──────────────────────────────

  const acceptSuggestion = useCallback((paraId, suggId) => {
    setParagraphs(prev => prev.map(p => {
      if (p.id !== paraId) return p
      const sugg = p.claudeSuggestions?.find(s => s.id === suggId)
      if (!sugg) return p
      const newText = sugg.find ? p.text.replace(sugg.find, sugg.replace) : p.text
      const remaining = (p.claudeSuggestions || []).filter(s => s.id !== suggId)
      return { ...p, text: newText, claudeSuggestions: remaining.length ? remaining : undefined }
    }))
  }, [])

  const rejectSuggestion = useCallback((paraId, suggId) => {
    setParagraphs(prev => prev.map(p => {
      if (p.id !== paraId) return p
      const remaining = (p.claudeSuggestions || []).filter(s => s.id !== suggId)
      return { ...p, claudeSuggestions: remaining.length ? remaining : undefined }
    }))
  }, [])

  const acceptOrigin = useCallback((paraId) => {
    setParagraphs(prev => prev.map(p =>
      p.id === paraId ? { ...p, claudeOrigin: undefined, baseline: p.text } : p,
    ))
  }, [])

  const rejectOrigin = useCallback((paraId) => {
    setParagraphs(prev => prev.filter(p => p.id !== paraId))
  }, [])

  // ── Ripple handlers ──────────────────────────────────────────────────

  const dismissRipple = useCallback((paraId) => {
    setParagraphs(prev => prev.map(p => p.id === paraId ? { ...p, ripple: null } : p))
    setHoveredRipple(prev => prev === paraId ? null : prev)
  }, [])

  // setRipplesByParaId: write the result of an external ripple scan
  // (used by RippleScopeModal) onto the current paragraphs.
  const setRipplesByParaId = useCallback((flagsByParaId) => {
    if (!flagsByParaId || Object.keys(flagsByParaId).length === 0) return
    setParagraphs(prev => prev.map(p =>
      flagsByParaId[p.id] ? { ...p, ripple: flagsByParaId[p.id] } : p,
    ))
  }, [])

  // ── Bulk operations: Accept All / Clear All ──────────────────────────

  const acceptAll = useCallback(() => {
    setParagraphs(prev => {
      const withSuggestions = prev.map(p => {
        if (!p.claudeSuggestions?.length) return p
        let text = p.text
        for (const sugg of p.claudeSuggestions) {
          if (sugg.find) text = text.replace(sugg.find, sugg.replace)
        }
        return { ...p, text, claudeSuggestions: undefined }
      })
      return withSuggestions.map(p => ({
        ...p,
        baseline: p.text,
        claudeNote: undefined,
        claudeOrigin: undefined,
      }))
    })
  }, [])

  const clearAll = useCallback(() => {
    setParagraphs(prev => {
      const withSuggestions = prev.map(p => {
        if (!p.claudeSuggestions?.length) return p
        let text = p.text
        for (const sugg of p.claudeSuggestions) {
          if (sugg.find) text = text.replace(sugg.find, sugg.replace)
        }
        return { ...p, text, claudeSuggestions: undefined }
      })
      return withSuggestions.map(p => ({
        ...p,
        baseline: p.text,
        comments: [],
        claudeNote: undefined,
        claudeOrigin: undefined,
        ripple: undefined,
      }))
    })
  }, [])

  // ── Submit & Branch ──────────────────────────────────────────────────
  //
  // Single Composer-tier model call (user-action triggered, per
  // refactor/tier-classification.md). Returns commentReplies +
  // optional rippleFlags + rippleSuggestions in one JSON blob — the
  // V1 "Submit" prompt verbatim. Persists the resulting paragraph
  // set, then creates a branch with the same room as the source.

  const submitAndBranch = useCallback(async () => {
    if (activeConversationId == null) return
    setSubmitting(true)

    let finalParagraphs = paragraphs

    try {
      // The gateway picks the key (stage 4); here only whether there is one.
      if (await hasKey(PROVIDER)) {

        const docLines = paragraphs.map(p => {
          const prefix = p.type === 'heading' ? '# ' : ''
          const changed = p.text !== p.baseline ? ` (changed from: "${p.baseline}")` : ''
          return `[${p.id}] ${prefix}${p.text}${changed}`
        }).join('\n\n')

        const allComments = paragraphs.flatMap(p =>
          (p.comments || []).map(c => ({
            commentId: c.id,
            paraId: p.id,
            selected: c.selectedText ? `on "${c.selectedText}" ` : '',
            text: c.text,
          })),
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
  "commentReplies": [{"commentId": "...", "reply": "...", "suggestions": [{"find": "exact verbatim text to replace", "replace": "replacement text", "reasoning": "brief reason"}]}]${rippleEnabled ? `,
  "rippleFlags": [{"paraId": "...", "type": "contradiction|dependency_break|opportunity|tone_shift|duplication", "severity": "low|medium|high", "summary": "...", "sourceEdit": "..."}],
  "rippleSuggestions": [{"paraId": "...", "suggestions": [{"find": "exact text to find", "replace": "replacement", "reasoning": "brief reason"}]}]` : ''}
}

Reply to every comment helpfully and concisely. When a comment requests a text edit, rewrite, or improvement, include "suggestions" for that reply — each suggestion must use a short, unique, verbatim substring of the paragraph as "find". Omit "suggestions" when the comment is a question or general feedback that does not call for a text change.${rippleEnabled ? ' Include rippleFlags only for genuine cross-paragraph impacts caused by the edits — omit if none. Include rippleSuggestions with concrete fix suggestions for flagged paragraphs — omit if none.' : ''}`

        let fullResponse = ''
        const abort = new AbortController()
        await gateway.call(PROVIDER, 'sendMessage', [
          [{ role: 'user', content: 'Please review the submission above.' }],
          'claude-sonnet',
          chunk => { fullResponse += chunk },
          abort.signal,
          systemPrompt,
        ], { label: 'document review' })

        try {
          const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            const commentParaMap = {}
            paragraphs.forEach(p =>
              (p.comments || []).forEach(c => { commentParaMap[c.id] = p.id }),
            )

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

            if (parsed.commentReplies?.length) {
              finalParagraphs = finalParagraphs.map(p => {
                const repliesForPara = parsed.commentReplies.filter(
                  r => commentParaMap[r.commentId] === p.id && r.suggestions?.length,
                )
                if (!repliesForPara.length) return p
                const newSuggs = repliesForPara.flatMap((r, ri) =>
                  r.suggestions.map((s, si) => ({
                    id: `cr-${Date.now()}-${ri}-${si}`,
                    find: String(s.find || ''),
                    replace: String(s.replace || ''),
                    reasoning: String(s.reasoning || ''),
                  })),
                )
                return { ...p, claudeSuggestions: [...(p.claudeSuggestions || []), ...newSuggs] }
              })
            }

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
          }
        } catch {
          // Malformed JSON — proceed without replies; branch still creates.
        }
      }
    } catch {
      // API unavailable — still create branch with the unsubmitted edits.
    }

    // Save current version (with any Claude replies) then create branch.
    // Cancel the auto-save timer so the post-branch state isn't doubly
    // written by the debounce.
    clearTimeout(saveTimerRef.current)
    try {
      await saveSbrdDocument(activeConversationId, {
        paragraphs: finalParagraphs,
        submittedReplies,
      })
      // Create the branch carrying the source room over so the new
      // branch renders via the V2 RoomShell pipeline.
      const sourceConv = await getConversation(activeConversationId)
      const branch = await createConversation({
        title: `Branch: ${conversationTitle || 'Untitled'}`,
        parentId: activeConversationId,
        room: sourceConv?.room ?? null,
      })
      // Fresh paragraphs on the branch: baselines reset to current text,
      // comments cleared (start the new version with a clean slate).
      const freshParagraphs = finalParagraphs.map(p => ({
        ...p,
        baseline: p.text,
        comments: [],
      }))
      await saveSbrdDocument(branch.id, {
        paragraphs: freshParagraphs,
        submittedReplies: {},
      })
      const updated = await getBranches(activeConversationId)
      setBranches(updated)
      showToast('Edits submitted. A new branch was created.')
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[DocumentContext] submitAndBranch failed:', err)
    } finally {
      setSubmitting(false)
      setShowSubmitConfirm(false)
    }
  }, [activeConversationId, paragraphs, submittedReplies, conversationTitle, rippleEnabled, showToast])

  // ── Derived counts (memoized — read by sidebar tabs) ────────────────
  const counts = useMemo(() => {
    const pendingComments = paragraphs.reduce((a, p) => a + (p.comments?.length || 0), 0)
    const pendingSuggestions = paragraphs.reduce(
      (a, p) => a + (p.claudeSuggestions?.length || 0) + (p.claudeOrigin ? 1 : 0),
      0,
    )
    const pendingRipples = paragraphs.filter(p => p.ripple).length
    const hasEdits = paragraphs.some(p => p.text !== p.baseline)
    const hasSubmittableChanges = hasEdits || paragraphs.some(p => p.comments?.length > 0)
    return { pendingComments, pendingSuggestions, pendingRipples, hasEdits, hasSubmittableChanges }
  }, [paragraphs])

  const value = {
    // Data
    paragraphs,
    submittedReplies,
    conversationTitle,
    branches,
    loaded,
    counts,

    // UI state
    showMarkup,
    setShowMarkup,
    rippleEnabled,
    setRippleEnabled,
    selectedParagraph,
    setSelectedParagraph,
    expandedComments,
    activeCommentId,
    setActiveCommentId,
    hoveredRipple,
    setHoveredRipple,
    replyingTo,
    setReplyingTo,
    replyInputs,
    setReplyInputs,
    addingCommentToParaId,
    setAddingCommentToParaId,
    newCommentText,
    setNewCommentText,
    selectionInfo,
    setSelectionInfo,
    submitting,
    showSubmitConfirm,
    setShowSubmitConfirm,
    toast,
    showToast,

    // Mutators
    updateParagraphText,
    splitParagraph,
    mergeParagraph,
    setParagraphType,
    toggleExpandedComment,
    submitReply,
    addComment,
    deleteComment,
    acceptSuggestion,
    rejectSuggestion,
    acceptOrigin,
    rejectOrigin,
    dismissRipple,
    setRipplesByParaId,
    acceptAll,
    clearAll,
    submitAndBranch,
    setParagraphs,
  }

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>
}

export function useDocument() {
  const ctx = useContext(DocumentContext)
  if (!ctx) throw new Error('useDocument must be used within DocumentProvider')
  return ctx
}
