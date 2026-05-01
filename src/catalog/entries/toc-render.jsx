// toc@1.0 — live render for the V2 RoomShell chat path.
//
// PR-10a.8. Self-binds to ChatContext per refactor/v2-phase1-audit.md
// §2.8a. Derives a table-of-contents list from user-role messages
// (matches V1 Albatross's TOC behavior — assistant replies don't
// stand alone as section markers; users frame the conversation) and
// scroll-jumps to the source message on click.
//
// MessageCard sets `id="msg-{id}"` on its outer container, so
// onNavigate is a one-line scrollIntoView lookup — same pattern the
// notes-render side rail uses for its click-to-scroll behavior.
//
// Reader tier (no model calls). Config-driven truncation: `truncateAt`
// caps the label length, `maxItems` caps how many user messages show
// before older ones drop off the bottom of the list.

import { useCallback, useMemo } from 'react'
import TOC from '../../components/core/TOC'
import { useChat } from '../../stores/ChatContext'

export default function TocRender({ config = {} } = {}) {
  const { messages } = useChat()

  const truncateAt = typeof config.truncateAt === 'number' ? config.truncateAt : 60
  const maxItems = typeof config.maxItems === 'number' ? config.maxItems : 50

  const items = useMemo(() => {
    if (!messages?.length) return []
    const labels = []
    for (const msg of messages) {
      if (msg.role !== 'user') continue
      const raw = (msg.content || '').replace(/\s+/g, ' ').trim()
      if (!raw) continue
      const label = raw.length > truncateAt
        ? `${raw.slice(0, truncateAt).trimEnd()}…`
        : raw
      labels.push({ id: msg.id, label })
    }
    // Keep the most recent maxItems entries — users scrolling far up
    // a long conversation usually want recent context, not the very
    // first messages.
    if (labels.length > maxItems) return labels.slice(labels.length - maxItems)
    return labels
  }, [messages, truncateAt, maxItems])

  const handleNavigate = useCallback((id) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [])

  return (
    <div className="px-2 py-3">
      <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider px-3 mb-2">
        Table of Contents
      </h3>
      <TOC items={items} onNavigate={handleNavigate} />
    </div>
  )
}
