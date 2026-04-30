// AnnotationsContext — shared per-conversation annotation state for the
// V2 RoomShell chat path (PR-10a.6).
//
// Watches useChat().activeConversationId and (re)loads favorites,
// notes, and highlights from IndexedDB whenever the active conversation
// changes. Consumers — messages@1.0's render, the right-rail
// highlights@1.0 / notes@1.0, the per-message Star/StickyNote
// handlers — all see the same in-memory copy. A write through this
// context's mutators (toggleFavorite, addNote, addHighlight, etc.)
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

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  getFavorites,
  addFavorite as dbAddFavorite,
  deleteFavorite as dbDeleteFavorite,
  getNotes,
  addNote as dbAddNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  getHighlights,
  addHighlight as dbAddHighlight,
  deleteHighlight as dbDeleteHighlight,
} from '../lib/db'
import { useChat } from './ChatContext'
import { includesWord } from '../lib/textUtils'

const AnnotationsContext = createContext(null)

// Stable empty references for the !loaded path. Using fresh
// `new Map()` etc. on every render would invalidate consumer memos
// every render; reusing these constants keeps `useMemo([favorites])`
// equivalent across renders when there's no active conversation.
const EMPTY_MAP = new Map()
const EMPTY_SET = new Set()
const EMPTY_ARRAY = []

export function AnnotationsProvider({ children }) {
  const { activeConversationId, messages } = useChat()

  // favorites/notes are keyed by messageId → record. highlights is a
  // flat list because a highlight is identified by (term, message) and
  // navigation needs all message ids that contain a term.
  const [favorites, setFavorites] = useState(new Map())
  const [notes, setNotes] = useState(new Map())
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
      getFavorites(activeConversationId),
      getNotes(activeConversationId),
      getHighlights(activeConversationId),
    ]).then(([favs, ns, hls]) => {
      if (cancelled) return
      setFavorites(new Map(favs.map(f => [f.messageId, f])))
      setNotes(new Map(ns.map(n => [n.messageId, n])))
      setHighlights(hls)
      setShowNotes(new Set())
      setHighlightCursor({})
      setLoadedFor(activeConversationId)
    }).catch(err => {
      if (cancelled) return
      // On a load failure we leave any prior state in place — better than
      // wiping the user's view if a transient db read fails.
      if (import.meta.env.DEV) console.warn('[AnnotationsContext] load failed:', err)
    })
    return () => { cancelled = true }
  }, [activeConversationId])

  // Derived: true only when our loaded data corresponds to the
  // currently-active conversation. Consumers check this to avoid
  // rendering stale annotations during a conversation switch.
  const loaded = activeConversationId != null && loadedFor === activeConversationId

  // ─── Favorites ───────────────────────────────────────────
  const toggleFavorite = useCallback(async (messageId) => {
    if (!activeConversationId) return
    const existing = favorites.get(messageId)
    if (existing) {
      try { await dbDeleteFavorite(existing.id) } catch { /* tolerate */ }
      setFavorites(prev => { const n = new Map(prev); n.delete(messageId); return n })
    } else {
      try {
        const rec = await dbAddFavorite({ conversationId: activeConversationId, messageId })
        setFavorites(prev => new Map(prev).set(messageId, rec))
      } catch { /* tolerate */ }
    }
  }, [favorites, activeConversationId])

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

  // ─── Highlights ──────────────────────────────────────────

  /**
   * Add a highlight on a specific message id. The text is stored as-is;
   * occurrence counting (across all messages of the conversation)
   * happens at render time via `aggregatedHighlights` below.
   */
  const addHighlight = useCallback(async (messageId, text, color) => {
    if (!activeConversationId || !text?.trim()) return
    try {
      const rec = await dbAddHighlight({
        conversationId: activeConversationId,
        messageId,
        text: text.trim(),
        color,
      })
      setHighlights(prev => [...prev, rec])
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
    const firstMatch = messages.find(m => m.content && includesWord(m.content, t))
    const messageId = firstMatch?.id || messages[0]?.id
    if (!messageId) return
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
  const exposedFavorites = loaded ? favorites : EMPTY_MAP
  const exposedNotes = loaded ? notes : EMPTY_MAP
  const exposedHighlights = loaded ? highlights : EMPTY_ARRAY
  const exposedShowNotes = loaded ? showNotes : EMPTY_SET

  const value = {
    // State
    favorites: exposedFavorites,
    notes: exposedNotes,
    highlights: exposedHighlights,
    showNotes: exposedShowNotes,
    activeConversationId,
    loaded,

    // Mutators
    toggleFavorite,
    toggleNotePanel,
    saveNote,
    deleteNote,
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
