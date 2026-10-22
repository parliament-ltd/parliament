// Retired with R7, approved by Stefan on 22 October 2026: The homepage's recent activity, drawn.
// Was src/catalog/entries/recent-activity-render.jsx. Nothing imports it and it is not built. To restore:
// Move it back with recent-activity.jsx.

// Render component for recent-activity@1.0. Lives in its own file so
// the manifest entry stays a clean default-export.

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../../stores/ConversationContext'

function relativeTime(iso) {
  if (!iso) return ''
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

export default function RecentActivityRender({ config = {} }) {
  const limit = config.limit ?? 5
  const { conversations } = useConversations()
  const navigate = useNavigate()

  const recent = useMemo(() => {
    return [...conversations]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, limit)
  }, [conversations, limit])

  if (recent.length === 0) {
    return <div className="text-sm text-[var(--p-text-secondary)]">No recent activity.</div>
  }

  return (
    <ul className="divide-y divide-[var(--p-border-subtle)]">
      {recent.map(c => (
        <li
          key={c.id}
          onClick={() => navigate(`/chat/${c.id}`)}
          className="flex items-center justify-between py-2 px-1 cursor-pointer hover:bg-[var(--p-bg-subtle,#FAFAFA)] rounded transition-colors"
        >
          <span className="text-sm text-[var(--p-text-primary)] truncate flex-1 mr-3">
            {c.title || 'Untitled'}
          </span>
          <span className="text-xs text-[var(--p-text-muted)] tabular-nums">
            {relativeTime(c.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}
