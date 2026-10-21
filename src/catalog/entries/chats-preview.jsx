// Self-contained render wrapper for chats@1.0 (PR-14 rewrite to spec).
//
// Spec source: refactor/parliament_homepage_v2 (2).html, the section
// labelled "CHATS". 5-column grid, custom 15px gold-tinted checkbox,
// view toggle with Sparkles/StickyNote/Highlighter/GitBranch icons,
// bulk toolbar that replaces the search+toggle when any row is checked.
//
// All visual classes (`.chats-toolbar`, `.chat-row`, `.bulk-toolbar`,
// `.topic-chip` …) live in src/index.css under the "Homepage v2 chats"
// block. The spec was built around precise grid widths and custom
// checkbox SVGs; matching it cleanly via Tailwind utilities would lose
// fidelity, so PR-14 ports the CSS verbatim from the HTML and keeps the
// JSX a thin shell over it.
//
// Row hover still publishes PHASE_1_EVENTS.ROW_HOVER on the room
// hostAPI bus so blueprint@1.0 can highlight the matching room — this
// is the "hover a chat row, illuminate the corresponding room" behavior
// from refactor/parliament_v2_design_decisions.md §5.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, StickyNote, Highlighter, GitBranch, Pin, RotateCw, Trash2 } from 'lucide-react'
import { useConversations } from '../../stores/ConversationContext'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'
import { getMessages, initDB } from '../../lib/db'
import { fieldsFromDescription } from '../../lib/chatTitles'
import { gateway, hasKey, DEFAULT_MODEL_PROVIDER as PROVIDER } from '../../net'
import { useIsNarrow } from '../../lib/useViewportWidth'

// ─── View toggle config ──────────────────────────────────────

const VIEWS = [
  { id: 'summary',    label: 'Summary',    icon: Sparkles    },
  { id: 'notes',      label: 'Notes',      icon: StickyNote  },
  { id: 'highlights', label: 'Highlights', icon: Highlighter },
  { id: 'branches',   label: 'Branches',   icon: GitBranch   },
]

// ─── Topic chip palette ──────────────────────────────────────
//
// Eight stable colors hashed off the tag text so the same tag always
// lights up the same color across reloads. Roughly mirrors the spec's
// per-tag handpicked colors (Essay=brown, Drafting=purple, Auth=teal …)
// without hardcoding any particular tag.
const TOPIC_PALETTE = [
  { bg: 'rgba(184,160,112,0.15)', fg: '#8B6A10' }, // brown/gold
  { bg: 'rgba(124,108,212,0.12)', fg: '#5A4AB0' }, // purple
  { bg: 'rgba(15,123,108,0.12)',  fg: '#0F7B6C' }, // teal
  { bg: 'rgba(184,92,0,0.12)',    fg: '#8B4A10' }, // amber
  { bg: 'rgba(236,72,153,0.12)',  fg: '#BE3878' }, // pink
  { bg: 'rgba(20,184,166,0.12)',  fg: '#0F766E' }, // mint
  { bg: 'rgba(59,130,246,0.12)',  fg: '#1D4ED8' }, // blue
  { bg: 'rgba(120,113,108,0.12)', fg: '#57534E' }, // stone
]

function hashTag(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0) % TOPIC_PALETTE.length
}

// ─── Date helpers ────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return ''
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMin = Math.floor((now - then) / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function absoluteDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────

export default function ChatsPreview({ config = {}, hostAPI } = {}) {
  const { conversations, deleteConversations, updateConversation } = useConversations()
  const navigate = useNavigate()

  const [view, setView]       = useState(config.defaultView || 'summary')
  const [query, setQuery]     = useState('')
  const [selected, setSelected] = useState(new Set())

  // PR-18a: below 768px, move the view-toggle out of the toolbar
  // (where it competes with the search input for horizontal space)
  // and into the footer alongside the conversation count. Frees the
  // toolbar for a full-width search input on phones.
  const isNarrow = useIsNarrow(768)

  // PR-26: notes + highlights aren't hydrated on conversation records,
  // so the 'Notes' and 'Highlights' views always showed "No notes /
  // highlights". Load them once from IndexedDB and group by
  // conversationId, then merge into each row at render time. Re-fetches
  // when the conversation set changes (new conv, deletion) — note /
  // highlight CRUD inside a chat won't auto-propagate, but a homepage
  // re-visit picks them up.
  const [notesByConv, setNotesByConv] = useState(new Map())
  const [highlightsByConv, setHighlightsByConv] = useState(new Map())
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const db = await initDB()
        const [allNotes, allHighlights] = await Promise.all([
          db.getAll('notes'),
          db.getAll('highlights'),
        ])
        if (cancelled) return
        const nMap = new Map()
        for (const n of allNotes) {
          if (!n.conversationId) continue
          if (!nMap.has(n.conversationId)) nMap.set(n.conversationId, [])
          nMap.get(n.conversationId).push(n)
        }
        const hMap = new Map()
        for (const h of allHighlights) {
          if (!h.conversationId) continue
          if (!hMap.has(h.conversationId)) hMap.set(h.conversationId, [])
          hMap.get(h.conversationId).push(h)
        }
        setNotesByConv(nMap)
        setHighlightsByConv(hMap)
      } catch { /* tolerate */ }
    }
    load()
    return () => { cancelled = true }
  }, [conversations.length])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const enrich = (c) => ({
      ...c,
      notes: notesByConv.get(c.id) || [],
      highlights: highlightsByConv.get(c.id) || [],
    })
    if (!q) return conversations.map(enrich)
    return conversations
      .filter(c => {
        const hay = [c.title || '', c.aiSummary || '', ...(c.tags || [])].join(' ').toLowerCase()
        return hay.includes(q)
      })
      .map(enrich)
  }, [conversations, query, notesByConv, highlightsByConv])

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const onPinSelected = async () => {
    if (selected.size === 0) return
    for (const id of selected) {
      await updateConversation(id, { pinned: true })
    }
    clearSelection()
  }

  const onDeleteSelected = async () => {
    if (selected.size === 0) return
    const ok = window.confirm(`Delete ${selected.size} conversation${selected.size === 1 ? '' : 's'}?`)
    if (!ok) return
    await deleteConversations([...selected])
    clearSelection()
  }

  const onRegenerateSelected = async () => {
    if (selected.size === 0) return
    // The gateway picks the key (stage 4); this read a setting that never
    // existed (conflicts Part 4) and fell back to the saved key anyway.
    if (!(await hasKey(PROVIDER))) return
    const ids = [...selected]
    await Promise.allSettled(ids.map(async (convId) => {
      try {
        const msgs = await getMessages(convId)
        if (msgs.length < 2) return
        const messagesToUse = msgs.slice(0, 6).map(m => ({ role: m.role, content: m.content }))
        // One request per chat for its title, summary and tags (C62).
        const fields = fieldsFromDescription(await gateway.call(PROVIDER, 'generateMetadata', [messagesToUse], { label: 'regenerate title, summary and tags' }))
        if (Object.keys(fields).length) await updateConversation(convId, fields)
      } catch (err) {
        if (import.meta.env.DEV) console.warn('regenerate failed for', convId, err)
      }
    }))
    clearSelection()
  }

  const publishHover = (conversationId) => {
    hostAPI?.publish?.(PHASE_1_EVENTS.ROW_HOVER, { conversationId })
  }
  // Clear hover on unmount so blueprint doesn't keep stale highlight.
  useEffect(() => () => publishHover(null), []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasSelection = selected.size > 0

  const viewToggle = (
    <div className="view-toggle">
      {VIEWS.map(v => {
        const Icon = v.icon
        const active = v.id === view
        return (
          <button
            key={v.id}
            type="button"
            className={active ? 'active' : ''}
            onClick={() => setView(v.id)}
            title={v.label}
          >
            <Icon className="w-3 h-3" />
            <span>{v.label}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div>
      {/* Toolbar — search + view toggle, replaced by bulk toolbar when rows are selected.
          On narrow viewports the view toggle drops out of the toolbar and renders in the
          footer instead, freeing the toolbar for a full-width search input. */}
      <div className={`chats-toolbar${hasSelection ? ' has-selection' : ''}`}>
        {hasSelection ? (
          <div className="bulk-toolbar show">
            <span className="bulk-count">{selected.size} selected</span>
            <div className="bulk-actions">
              <button type="button" className="bulk-btn" onClick={onPinSelected} aria-label="Pin">
                <Pin className="w-3.5 h-3.5" />
                <span className="bulk-tip">Pin</span>
              </button>
              <button type="button" className="bulk-btn" onClick={onRegenerateSelected} aria-label="Regenerate summaries">
                <RotateCw className="w-3.5 h-3.5" />
                <span className="bulk-tip">Regenerate summaries</span>
              </button>
              <button type="button" className="bulk-btn danger" onClick={onDeleteSelected} aria-label="Delete">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="bulk-tip">Delete</span>
              </button>
            </div>
            <button type="button" className="bulk-clear" onClick={clearSelection}>Clear</button>
          </div>
        ) : (
          <>
            <div className="chats-search">
              <Search className="search-icon" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats, notes, highlights, tags…"
              />
            </div>
            {!isNarrow && viewToggle}
          </>
        )}
      </div>

      {/* Row table */}
      {filtered.length === 0 ? (
        <div className="text-sm text-[var(--p-text-secondary)] py-6 text-center">
          {query ? 'No matches.' : 'No conversations yet. Start one from any room.'}
        </div>
      ) : (
        <div className="chat-table">
          {filtered.map(c => (
            <ChatRow
              key={c.id}
              chat={c}
              view={view}
              selected={selected.has(c.id)}
              onToggleSelected={() => toggleOne(c.id)}
              onOpen={() => navigate(`/chat/${c.id}`)}
              onMouseEnter={() => publishHover(c.id)}
              onMouseLeave={() => publishHover(null)}
            />
          ))}
        </div>
      )}

      <div className="chat-footer">
        <span>{filtered.length} conversation{filtered.length === 1 ? '' : 's'}</span>
        {isNarrow && !hasSelection && viewToggle}
      </div>
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────

function ChatRow({ chat, view, selected, onToggleSelected, onOpen, onMouseEnter, onMouseLeave }) {
  const tags = chat.tags || []
  const notes = chat.notes || []
  const highlights = chat.highlights || []
  const isBranch = !!chat.parentId

  let secondLine = ''
  if (view === 'summary') secondLine = chat.aiSummary || '—'
  else if (view === 'notes') secondLine = notes.length > 0 ? notes.map(n => n.text).join(' · ') : 'No notes'
  else if (view === 'highlights') secondLine = highlights.length > 0 ? highlights.map(h => h.text).join(' · ') : 'No highlights'
  else if (view === 'branches') secondLine = isBranch ? `↳ branched from ${chat.parentTitle || 'parent'}` : 'Main thread'

  return (
    <div
      className={`chat-row${selected ? ' selected' : ''}`}
      onClick={onOpen}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-room={chat.room || ''}
    >
      <button
        type="button"
        className={`chat-checkbox${selected ? ' checked' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleSelected() }}
        aria-label="Select chat"
      >
        <svg viewBox="0 0 14 14" fill="none">
          <polyline points="3,7.5 6,10 11,4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="chat-text">
        <div className="chat-title">
          <span className="chat-title-text">{chat.title || 'Untitled conversation'}</span>
        </div>
        <div className="chat-summary">{secondLine}</div>
      </div>

      <div className="chat-topics">
        {tags.slice(0, 3).map(t => {
          const palette = TOPIC_PALETTE[hashTag(t)]
          return (
            <span key={t} className="topic-chip" style={{ background: palette.bg, color: palette.fg }}>
              {t}
            </span>
          )
        })}
      </div>

      <div className="chat-date">{relativeTime(chat.updatedAt)}</div>
      <div className="chat-date">{absoluteDate(chat.updatedAt)}</div>
    </div>
  )
}
