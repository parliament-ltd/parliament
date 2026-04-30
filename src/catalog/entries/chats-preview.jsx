// Self-contained render wrapper for chats@1.0.
//
// Homepage-section view of the user's conversation list. Renders a search
// box, a view toggle (Summary / Notes / Highlights / Branches), and a
// flat list of rows. Each row's mouseenter/leave publishes `row-hover`
// on the room bus so blueprint@1.0 can highlight the matching room.
//
// The full V1 selector — sidebars, family colors, branch hierarchy,
// inline note editing, regenerate-summaries — stays at /chats per
// PR-6's "Preserve V1 selector at /chats" requirement. This component
// is the homepage section, not a wholesale port.
//
// Lives in its own file so chats.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trash2, X } from 'lucide-react'
import { useConversations } from '../../stores/ConversationContext'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'

const VIEW_OPTIONS = ['summary', 'notes', 'highlights', 'branches']

const SEGMENT_BTN_BASE = 'px-3 py-1.5 text-xs font-medium rounded-md transition-colors'

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

export default function ChatsPreview({ config = {}, hostAPI } = {}) {
  const { conversations, deleteConversations } = useConversations()
  const navigate = useNavigate()

  const [view, setView]       = useState(config.defaultView || 'summary')
  const [query, setQuery]     = useState('')
  const [selected, setSelected] = useState(new Set())

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => {
      const hay = [
        c.title || '',
        c.aiSummary || '',
        ...(c.tags || []),
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [conversations, query])

  const allSelected = filteredConversations.length > 0 &&
    filteredConversations.every(c => selected.has(c.id))

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filteredConversations.map(c => c.id)))
  }

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onDeleteSelected = async () => {
    if (selected.size === 0) return
    const ok = window.confirm(`Delete ${selected.size} conversation${selected.size === 1 ? '' : 's'}?`)
    if (!ok) return
    await deleteConversations([...selected])
    setSelected(new Set())
  }

  const publishHover = (conversationId) => {
    hostAPI?.publish?.(PHASE_1_EVENTS.ROW_HOVER, { conversationId })
  }

  // Clear hover on unmount so blueprint doesn't keep stale highlight.
  useEffect(() => () => publishHover(null), [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Toolbar: search + view toggle + bulk actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--p-text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats, summaries, tags…"
            className="w-full bg-white rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--p-text-primary)] outline-none border border-[var(--p-border)] focus:border-[var(--p-accent-gold,#B8A070)] transition-colors placeholder:text-[var(--p-text-muted)]"
          />
        </div>

        <div className="inline-flex bg-[var(--p-bg-subtle,#FAFAFA)] rounded-lg p-1 border border-[var(--p-border)]">
          {VIEW_OPTIONS.map(v => {
            const active = v === view
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`${SEGMENT_BTN_BASE} ${
                  active
                    ? 'bg-white text-[var(--p-text-primary)] shadow-sm border border-[var(--p-border)]'
                    : 'text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] hover:border-[var(--p-accent-gold,#B8A070)] transition-colors"
        >
          {allSelected ? 'Clear selection' : 'Select all'}
        </button>

        {selected.size > 0 && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--p-error,#E03E3E)] text-[var(--p-error,#E03E3E)] bg-white hover:bg-[rgba(224,62,62,0.06)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete {selected.size}
            <X
              className="w-3.5 h-3.5 ml-1 hover:scale-110"
              onClick={(e) => { e.stopPropagation(); setSelected(new Set()) }}
            />
          </button>
        )}
      </div>

      {/* Row list */}
      {filteredConversations.length === 0 ? (
        <div className="text-sm text-[var(--p-text-secondary)] py-6 text-center">
          {query ? 'No matches.' : 'No conversations yet. Start one from any room.'}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--p-border-subtle)]">
          {filteredConversations.map(c => (
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
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--p-text-muted)]">
        <span>{filteredConversations.length} conversation{filteredConversations.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  )
}

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
    <li
      className={`flex items-start gap-3 py-3 px-2 rounded transition-colors cursor-pointer ${
        selected ? 'bg-[var(--p-bg-alt,#FAFAFA)]' : 'hover:bg-[var(--p-bg-subtle,#FAFAFA)]'
      }`}
      onClick={onOpen}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => {}}
        onClick={(e) => { e.stopPropagation(); onToggleSelected() }}
        className="mt-1 accent-[var(--p-accent-gold,#B8A070)]"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--p-text-primary)] truncate">
          {chat.title || 'Untitled conversation'}
        </div>
        <div className="text-xs text-[var(--p-text-secondary)] truncate mt-0.5">
          {secondLine}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.slice(0, 3).map(t => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--p-code-bg,#F7F6F3)] text-[var(--p-text-secondary)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="text-xs text-[var(--p-text-muted)] tabular-nums shrink-0 pt-0.5">
        {relativeTime(chat.updatedAt)}
      </div>
    </li>
  )
}
