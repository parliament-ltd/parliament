// AnnotationsContext — shared per-conversation annotation state for the
// V2 RoomShell chat path (PR-10a.6).
//
// Watches useChat().activeConversationId and (re)loads
// notes, and highlights from IndexedDB whenever the active conversation
// changes. Consumers — messages@1.0's render, the right-rail
// highlights@1.0 / notes@1.0, the per-message Star/StickyNote
// handlers — all see the same in-memory copy. A write through this
// context's mutators (addNote, addHighlight, etc.)
// updates IndexedDB AND the in-memory state, so other consumers
// observe the change immediately without polling.
//
// ─── Why a context, not three separate component-owned stores ───────────
//
// V1 Albatross owned favoritesMap, notesMap, highlightsList in the
// ChatLayout component and passed them down. The V2 catalog model puts
// the chat shell behind <RoomShell>; messages@1.0, highlights@1.0,
// notes@1.0 don't share a parent that owns this state. Two options:
//
//   (a) each component reads its own slice from IndexedDB and they
//       communicate via bus events ("favorite-toggled" etc.).
//   (b) a small shared context owns the state and all consumers read
//       through it.
//
// (b) wins: the bus has a 3-event Phase 1 cap (per refactor/v2-phase1-
// audit.md NQ-4), and an in-memory cache shared across consumers is
// what V1 had anyway. This context is mounted in App.jsx alongside
// the other app-level providers; the audit's §2.8a "Component data
// plumbing" rule treats it as another existing context that catalog
// components self-bind to.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  getNotes,
  getOwnNotes,
  getPins,
  addNote as dbAddNote,
  updateNote as dbUpdateNote,
  moveNote as dbMoveNote,
  deleteNote as dbDeleteNote,
  getHighlights,
  addHighlight as dbAddHighlight,
  deleteHighlight as dbDeleteHighlight,
  moveHighlight as dbMoveHighlight,
} from '../lib/db'
import { useChat } from './ChatContext'
import { useMessages } from './chatHooks'
import { includesWord } from '../lib/textUtils'
import { onRecordsChanged } from '../lib/records'
import { commentsOf } from '../lib/comments'

const AnnotationsContext = createContext(null)

// Stable empty references for the !loaded path. Using fresh
// `new Map()` etc. on every render would invalidate consumer memos
// every render; reusing these constants keeps `useMemo([favorites])`
// equivalent across renders when there's no active conversation.
const EMPTY_MAP = new Map()
const EMPTY_SET = new Set()
const EMPTY_ARRAY = []

// conversationId: the chat of the room this serves, with several rooms
// open (C175 (a)); without it, the open chat.
export function AnnotationsProvider({ children, conversationId = null }) {
  const chat = useChat()
  const activeConversationId = conversationId ?? chat.activeConversationId
  const messages = useMessages(activeConversationId)

  // notes are keyed by messageId → record. highlights is a
  // flat list because a highlight is identified by (term, message) and
  // navigation needs all message ids that contain a term. Favourites
  // retired into the tag favorite (R6, approved 2 November; C286 (m)):
  // tagadd:favorite reply does what the heart did.
  const [notes, setNotes] = useState(new Map())
  // Comments (C301 (c)): every note of the chat, the notes of their own and
  // the chat's quotes, read for the comments on words and on whole messages.
  const [chatNotes, setChatNotes] = useState([])
  const [ownNotes, setOwnNotes] = useState([])
  const [chatPins, setChatPins] = useState([])
  const [notesRev, setNotesRev] = useState(0)
  const [highlights, setHighlights] = useState([])
  // showNotes is per-conversation UI state — which note panels are
  // currently expanded inline on a MessageCard. Lives here rather than
  // inside messages@1.0 so toggling from the side-rail (or a future
  // contribution) updates the same set.
  const [showNotes, setShowNotes] = useState(new Set())
  // Highlight occurrence cursor — per term, which message-id index in
  // the occurrence list the user is on. Reset when the active
  // conversation changes.
  const [highlightCursor, setHighlightCursor] = useState({})
  const [loadedFor, setLoadedFor] = useState(null)

  // ─── Load on conversation change ─────────────────────────
  //
  // When activeConversationId is null we deliberately don't clear the
  // in-memory state — the lint rule react-hooks/set-state-in-effect
  // would flag synchronous setState in an effect, and consumers gate
  // visibility via the `loaded` flag below anyway. Stale state stays
  // resident but invisible until the next conversation activates and
  // the load resolves.
  useEffect(() => {
    if (!activeConversationId) return undefined
    let cancelled = false
    Promise.all([
      getNotes(activeConversationId),
      getHighlights(activeConversationId),
      getOwnNotes().catch(() => []),
      getPins(activeConversationId).catch(() => []),
    ]).then(([ns, hls, own, pins]) => {
      if (cancelled) return
      // The card's note panel holds the note on the whole message; a comment on words is not it.
      setNotes(new Map(ns.filter(n => !n.passage).map(n => [n.messageId, n])))
      setChatNotes(ns)
      setOwnNotes(own)
      setChatPins(pins)
      setHighlights(hls)
      if (loadedFor !== activeConversationId) {
        setShowNotes(new Set())
        setHighlightCursor({})
      }
      setLoadedFor(activeConversationId)
    }).catch(err => {
      if (cancelled) return
      // On a load failure we leave any prior state in place — better than
      // wiping the user's view if a transient db read fails.
      if (import.meta.env.DEV) console.warn('[AnnotationsContext] load failed:', err)
    })
    return () => { cancelled = true }
    // loadedFor is read, not followed: a reload keeps the open panels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, notesRev])
  // A note or quote written, changed or taken back elsewhere (the bar, the
  // Collection, undo:, another tab): read again, so its comment shows or goes.
  useEffect(() => onRecordsChanged((c) => { if (c.kind === 'note' || c.kind === 'quote') setNotesRev((n) => n + 1) }), [])

  // Derived: true only when our loaded data corresponds to the
  // currently-active conversation. Consumers check this to avoid
  // rendering stale annotations during a conversation switch.
  const loaded = activeConversationId != null && loadedFor === activeConversationId

  // ─── Notes ───────────────────────────────────────────────
  const toggleNotePanel = useCallback((messageId) => {
    setShowNotes(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }, [])

  /**
   * Save (or clear) the note for a message. Empty text deletes; non-empty
   * text either updates an existing record or creates a new one.
   */
  const saveNote = useCallback(async (messageId, text) => {
    if (!activeConversationId) return
    const existing = notes.get(messageId)
    const trimmed = (text || '').trim()
    if (existing) {
      if (trimmed) {
        try {
          const updated = await dbUpdateNote(existing.id, trimmed)
          setNotes(prev => new Map(prev).set(messageId, updated))
        } catch { /* tolerate */ }
      } else {
        try { await dbDeleteNote(existing.id) } catch { /* tolerate */ }
        setNotes(prev => { const n = new Map(prev); n.delete(messageId); return n })
      }
    } else if (trimmed) {
      try {
        const rec = await dbAddNote({ conversationId: activeConversationId, messageId, text: trimmed })
        setNotes(prev => new Map(prev).set(messageId, rec))
      } catch { /* tolerate */ }
    }
  }, [notes, activeConversationId])

  const deleteNote = useCallback(async (noteId) => {
    if (!noteId) return
    try { await dbDeleteNote(noteId) } catch { /* tolerate */ }
    setNotes(prev => {
      const n = new Map(prev)
      for (const [k, v] of n) if (v.id === noteId) n.delete(k)
      return n
    })
  }, [])

  /**
   * A comment on words (C301 (c)): the words, which time they come in the
   * message, and the comment. Said by its number under the bar, and a
   * collection started with the chat when there is none, as a highlight does.
   */
  const addComment = useCallback(async (messageId, { passage, nth = 0, text }) => {
    const words = String(text ?? '').trim()
    if (!activeConversationId || !messageId || !words || !passage) return null
    try {
      const rec = await dbAddNote({ conversationId: activeConversationId, messageId, text: words, passage, nth })
      setChatNotes(prev => [...prev, rec])
      // An id and a number, never the words.
      window.dispatchEvent(new CustomEvent('parliament-commented', { detail: { chatId: activeConversationId, num: Number.isInteger(rec?.num) ? rec.num : null } }))
      return rec
    } catch {
      return null
    }
  }, [activeConversationId])

  // A comment's words changed in the text: stored as they now are, so it is
  // drawn there again (C304).
  useEffect(() => {
    const on = async (e) => {
      const moves = Array.isArray(e.detail?.moves) ? e.detail.moves : []
      for (const m of moves) {
        if (typeof m?.id !== 'string' || typeof m.passage !== 'string' || !m.passage) continue
        try {
          await dbMoveNote(m.id, { passage: m.passage, nth: m.nth })
          setChatNotes((prev) => prev.map((n) => (n.id === m.id ? { ...n, passage: m.passage, nth: m.nth } : n)))
        } catch { /* kept as it was */ }
      }
    }
    window.addEventListener('parliament-comments-moved', on)
    return () => window.removeEventListener('parliament-comments-moved', on)
  }, [])

  // A highlight's words changed in the text: stored as they now are, so it
  // is drawn there again (C304).
  useEffect(() => {
    const on = async (e) => {
      const moves = Array.isArray(e.detail?.moves) ? e.detail.moves : []
      for (const m of moves) {
        if (typeof m?.id !== 'string' || typeof m.text !== 'string' || !m.text) continue
        try {
          await dbMoveHighlight(m.id, { text: m.text, nth: m.nth })
          setHighlights((prev) => prev.map((h) => (h.id === m.id ? { ...h, text: m.text, nth: m.nth } : h)))
        } catch { /* kept as it was */ }
      }
    }
    window.addEventListener('parliament-highlights-moved', on)
    return () => window.removeEventListener('parliament-highlights-moved', on)
  }, [])

  // ─── Highlights ──────────────────────────────────────────

  /**
   * Add a highlight on a specific message id. The text is stored as-is;
   * occurrence counting (across all messages of the conversation)
   * happens at render time via `aggregatedHighlights` below.
   */
  // nth: which time the words come in the message, so it is marked only there (C285).
  const addHighlight = useCallback(async (messageId, text, color, nth = 0) => {
    if (!activeConversationId || !text?.trim()) return
    try {
      const rec = await dbAddHighlight({
        conversationId: activeConversationId,
        messageId,
        text: text.trim(),
        color,
        nth: Number.isInteger(nth) && nth >= 0 ? nth : 0,
      })
      setHighlights(prev => [...prev, rec])
      // The shell starts a collection with this chat when there is none yet
      // (31 October; C283), and says it is kept, by its number (C291 (k)). An id and a number, never the words.
      window.dispatchEvent(new CustomEvent('parliament-highlighted', { detail: { chatId: activeConversationId, num: Number.isInteger(rec?.num) ? rec.num : null } }))
    } catch { /* tolerate */ }
  }, [activeConversationId])

  /**
   * Add a highlight from a side-rail action (no specific message in
   * focus). Picks the first message that contains the term — matches V1
   * Albatross's add-from-sidebar behavior.
   */
  const addHighlightFromSidebar = useCallback(async (text, color) => {
    if (!activeConversationId || !text?.trim()) return
    const t = text.trim()
    // PR-23: previously this returned early when there were no messages
    // to anchor to, silently dropping the new highlight. Allow the
    // record to be created with messageId=null so the term persists and
    // takes effect once messages arrive. The navigate-to-occurrence
    // flow still resolves to specific messages at runtime via the
    // aggregated ids list.
    const firstMatch = messages.find(m => m.content && includesWord(m.content, t))
    const messageId = firstMatch?.id || messages[0]?.id || null
    try {
      const rec = await dbAddHighlight({
        conversationId: activeConversationId,
        messageId,
        text: t,
        color,
      })
      setHighlights(prev => [...prev, rec])
    } catch { /* tolerate */ }
  }, [activeConversationId, messages])

  /**
   * Remove all highlight records for a term. The HighlightList passes us
   * the array of record ids it knows about (from `aggregatedHighlights`).
   */
  const deleteHighlights = useCallback(async (ids) => {
    if (!Array.isArray(ids) || !ids.length) return
    for (const id of ids) {
      try { await dbDeleteHighlight(id) } catch { /* tolerate */ }
    }
    const idSet = new Set(ids)
    setHighlights(prev => prev.filter(h => !idSet.has(h.id)))
  }, [])

  /**
   * Find the message ids in chronological order that contain the given
   * highlight term. Used by navigateHighlight to scroll between
   * occurrences.
   */
  const getHighlightOccurrences = useCallback((text) => {
    if (!text) return []
    return messages
      .filter(m => m.content && includesWord(m.content, text))
      .map(m => m.id)
  }, [messages])

  /**
   * Scroll to the next/previous occurrence of a highlight term across
   * the message list. Mirrors V1 Albatross navigation. The DOM element
   * id `msg-{id}` is set by MessageCard.
   */
  const navigateHighlight = useCallback((text, direction) => {
    const occurrences = getHighlightOccurrences(text)
    if (!occurrences.length) return
    const currentIdx = highlightCursor[text] ?? -1
    const nextIdx = direction === 'prev'
      ? (currentIdx - 1 + occurrences.length) % occurrences.length
      : (currentIdx + 1) % occurrences.length
    setHighlightCursor(prev => ({ ...prev, [text]: nextIdx }))
    const msgId = occurrences[nextIdx]
    document.getElementById(`msg-${msgId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [getHighlightOccurrences, highlightCursor])

  // When `loaded` is false, expose empty collections rather than the
  // stale state from a previous conversation. Mutators are still
  // available; calling them while !loaded is a no-op (the
  // activeConversationId guard inside each mutator prevents writes
  // against the wrong conversation).
  const exposedNotes = loaded ? notes : EMPTY_MAP
  const exposedHighlights = loaded ? highlights : EMPTY_ARRAY
  const exposedShowNotes = loaded ? showNotes : EMPTY_SET
  const comments = useMemo(
    () => (loaded ? commentsOf({ notes: chatNotes, own: ownNotes, pins: chatPins, messages, conversationId: activeConversationId }) : EMPTY_MAP),
    [loaded, chatNotes, ownNotes, chatPins, messages, activeConversationId],
  )

  const value = {
    // State
    notes: exposedNotes,
    highlights: exposedHighlights,
    showNotes: exposedShowNotes,
    // Each message's comments, on words and on the whole of it (C301 (c)).
    comments,
    activeConversationId,
    loaded,

    // Mutators
    toggleNotePanel,
    saveNote,
    deleteNote,
    addComment,
    addHighlight,
    addHighlightFromSidebar,
    deleteHighlights,
    navigateHighlight,
  }

  return <AnnotationsContext.Provider value={value}>{children}</AnnotationsContext.Provider>
}

export function useAnnotations() {
  const ctx = useContext(AnnotationsContext)
  if (!ctx) throw new Error('useAnnotations must be used within AnnotationsProvider')
  return ctx
}
