// Self-contained render wrapper for favorites@1.0 (PR-14 rewrite to spec).
//
// Spec source: refactor/parliament_homepage_v2 (2).html, the section
// labelled "FAVORITES". Cards show a 3-line snippet plus a meta line
// with a gold star icon and the source conversation title. A copy
// button materializes top-right on hover, fades in with a small lift,
// and flashes gold with a checkmark for ~1.5s after a successful copy.
//
// PR-14 user-direction additions on top of the spec:
//   - An "Edit" button at the top of the section body toggles bulk-edit
//     mode. In edit mode every card grows a 15px gold checkbox; the
//     spec's gold bulk toolbar appears with Delete + Clear once any
//     card is checked. Same affordance pattern as chats@1.0.
//
// All visual classes (`.favs-grid`, `.fav-card`, `.fav-copy`,
// `.fav-snippet`, `.fav-star`, `.bulk-toolbar` reuse) live in
// src/index.css under the "Homepage v2 favorites" block.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, Trash2, Star, Pencil } from 'lucide-react'
import Markdown from '../../components/core/Markdown'
import { initDB, deleteFavorite as dbDeleteFavorite } from '../../lib/db'
import { useConversations } from '../../stores/ConversationContext'

async function loadAllFavoritesHydrated(conversations) {
  const db = await initDB()
  const records = await db.getAll('favorites')
  if (!records.length) return []
  const titles = {}
  for (const c of conversations || []) {
    titles[c.id] = c.title || 'New conversation'
  }
  const out = []
  for (const fav of records) {
    try {
      const msg = await db.get('messages', fav.messageId)
      if (!msg) continue
      out.push({
        id: fav.id,
        snippet: (msg.content || '').slice(0, 240),
        source: titles[fav.conversationId] || 'Unknown conversation',
        sourceConversationId: fav.conversationId,
      })
    } catch { /* deleted message — skip */ }
  }
  return out
}

export default function FavoritesPreview() {
  const { conversations } = useConversations()
  const navigate = useNavigate()
  const [favs, setFavs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const reload = async () => {
    setLoading(true)
    try {
      const list = await loadAllFavoritesHydrated(conversations)
      setFavs(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations])

  const toggleSelected = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitEditMode = () => {
    setEditing(false)
    setSelected(new Set())
  }

  const onDeleteSelected = async () => {
    if (selected.size === 0) return
    const ok = window.confirm(`Remove ${selected.size} favorite${selected.size === 1 ? '' : 's'}?`)
    if (!ok) return
    for (const id of selected) {
      await dbDeleteFavorite(id)
    }
    setFavs(prev => prev.filter(f => !selected.has(f.id)))
    exitEditMode()
  }

  if (loading) {
    return <div className="text-sm text-[var(--p-text-muted)]">Loading favorites…</div>
  }

  if (favs.length === 0) {
    return (
      <div className="text-sm text-[var(--p-text-secondary)]">
        No favorites yet. Star a message in any conversation to save it here.
      </div>
    )
  }

  const hasSelection = selected.size > 0

  return (
    <div>
      {/* Edit toggle / bulk toolbar — same affordance as chats@1.0 */}
      <div className={`favs-toolbar${hasSelection ? ' has-selection' : ''}`}>
        {hasSelection ? (
          <div className="bulk-toolbar show">
            <span className="bulk-count">{selected.size} selected</span>
            <div className="bulk-actions">
              <button type="button" className="bulk-btn danger" onClick={onDeleteSelected} aria-label="Remove">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="bulk-tip">Remove</span>
              </button>
            </div>
            <button type="button" className="bulk-clear" onClick={exitEditMode}>Done</button>
          </div>
        ) : (
          <button
            type="button"
            className={`favs-edit-btn${editing ? ' active' : ''}`}
            onClick={() => editing ? exitEditMode() : setEditing(true)}
            aria-pressed={editing}
          >
            <Pencil className="w-3 h-3" />
            <span>{editing ? 'Done' : 'Edit'}</span>
          </button>
        )}
      </div>

      <div className="favs-grid">
        {favs.map(f => (
          <FavCard
            key={f.id}
            fav={f}
            editing={editing}
            selected={selected.has(f.id)}
            onToggleSelected={() => toggleSelected(f.id)}
            onOpen={() => navigate(`/chat/${f.sourceConversationId}`)}
          />
        ))}
      </div>
    </div>
  )
}

function FavCard({ fav, editing, selected, onToggleSelected, onOpen }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async (e) => {
    e.stopPropagation()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fav.snippet)
      }
    } catch { /* clipboard denied — still flash for feedback */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={`fav-card${selected ? ' selected' : ''}${editing ? ' editing' : ''}`}
      onClick={() => editing ? onToggleSelected() : onOpen()}
    >
      {editing ? (
        <button
          type="button"
          className={`fav-checkbox${selected ? ' checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleSelected() }}
          aria-label="Select favorite"
        >
          <svg viewBox="0 0 14 14" fill="none">
            <polyline points="3,7.5 6,10 11,4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          className={`fav-copy${copied ? ' copied' : ''}`}
          onClick={onCopy}
          title={copied ? 'Copied' : 'Copy snippet'}
          aria-label="Copy snippet"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      )}

      {/* PR-29: render as markdown so formatting from the source
          message (bold, code, lists, links) carries through the
          snippet. Partial markdown at the 240-char truncation
          renders as best-effort (react-markdown is forgiving). */}
      <div className="fav-snippet fav-snippet-md">
        <Markdown>
          {fav.snippet}
        </Markdown>
      </div>
      <div className="fav-meta">
        <Star className="fav-star w-2.5 h-2.5" />
        <span className="fav-source">{fav.source}</span>
      </div>
    </div>
  )
}
