// Self-contained render wrapper for favorites@1.0.
//
// Loads every favorite across every conversation, hydrates with the
// source message text + conversation title, renders as a stack of
// snippet cards. Click a card → navigate to the source conversation.
//
// Lives in its own file so favorites.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
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
        snippet: (msg.content || '').slice(0, 200),
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

  const onRemove = async (id) => {
    await dbDeleteFavorite(id)
    setFavs(prev => prev.filter(f => f.id !== id))
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {favs.map(f => (
        <div
          key={f.id}
          className="rounded-lg border border-[var(--p-border)] bg-white p-3 cursor-pointer hover:border-[var(--p-accent-gold,#B8A070)] transition-colors group"
          onClick={() => navigate(`/chat/${f.sourceConversationId}`)}
        >
          <p
            className="text-xs text-[var(--p-text-primary)] leading-relaxed"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {f.snippet}
          </p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--p-border-subtle)]">
            <span className="text-[10px] text-[var(--p-text-secondary)] truncate flex-1 mr-2">
              {f.source}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(f.id) }}
              className="p-1 rounded text-[var(--p-text-secondary)] hover:text-[var(--p-error,#E03E3E)] opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove favorite"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
