// Render component for quick-stats@1.0. Lives in its own file so the
// manifest entry stays a clean default-export.

import { useEffect, useState } from 'react'
import { initDB } from '../../lib/db'
import { useConversations } from '../../stores/ConversationContext'

export default function QuickStatsRender() {
  const { conversations } = useConversations()
  const [counts, setCounts] = useState({ messages: 0, highlights: 0, notes: 0 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const db = await initDB()
        const [msgs, hls, ns] = await Promise.all([
          db.count('messages'),
          db.count('highlights'),
          db.count('notes'),
        ])
        if (!cancelled) setCounts({ messages: msgs, highlights: hls, notes: ns })
      } catch {
        /* swallow — fresh DB or no stores */
      }
    })()
    return () => { cancelled = true }
  }, [])

  const stats = [
    { label: 'Conversations', value: conversations.length },
    { label: 'Messages',      value: counts.messages },
    { label: 'Highlights',    value: counts.highlights },
    { label: 'Notes',         value: counts.notes },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="rounded-lg border border-[var(--p-border)] bg-white p-3">
          <div className="text-xs uppercase tracking-wider text-[var(--p-text-secondary)]">{s.label}</div>
          <div className="text-2xl font-semibold text-[var(--p-text-primary)] mt-1 tabular-nums">{s.value}</div>
        </div>
      ))}
    </div>
  )
}
