// toc@1.0 — live render for the V2 RoomShell chat path.
//
// PR-10a.8 wired the user-prompts mode (V1 Albatross parity). PR-13 added
// the response-headings mode for the build wizard's "Table of Contents"
// feature — the spec describes it as "tracking the structure of long
// pieces," which means scanning assistant-message markdown headings.
//
// Both modes self-bind to ChatContext and scroll-jump on click:
//   - user-prompts:      target id `msg-{messageId}` (whole message)
//   - response-headings: target id `msg-{messageId}-h-{idx}` (specific
//                        heading; MessageCard injects these ids in
//                        document order via a closure counter — see
//                        src/components/core/MessageCard.jsx).
//
// Reader tier (no model calls). Config:
//   - mode:       'user-prompts' | 'response-headings'  (default: user-prompts)
//   - maxItems:   number   (default: 50)
//   - truncateAt: number   (default: 60)

import { useCallback, useMemo } from 'react'
import TOC from '../../components/core/TOC'
import { useChat } from '../../stores/ChatContext'

const HEADING_RE = /^(#{1,4})\s+(.+?)\s*$/gm

export default function TocRender({ config = {} } = {}) {
  const { messages } = useChat()

  const mode = config.mode === 'response-headings' ? 'response-headings' : 'user-prompts'
  const truncateAt = typeof config.truncateAt === 'number' ? config.truncateAt : 60
  const maxItems = typeof config.maxItems === 'number' ? config.maxItems : 50

  const items = useMemo(() => {
    if (!messages?.length) return []
    const labels = mode === 'response-headings'
      ? extractHeadings(messages, truncateAt)
      : extractUserPrompts(messages, truncateAt)
    if (labels.length > maxItems) return labels.slice(labels.length - maxItems)
    return labels
  }, [messages, mode, truncateAt, maxItems])

  // PR-28: report the active mode + the reason items[] is empty so a
  // blank ToC says something useful instead of the old generic "Items
  // will appear here." Lets us tell at a glance whether the room is
  // in user-prompts mode with no user messages yet, or response-
  // headings mode and the assistant hasn't written any.
  const emptyMessage = useMemo(() => {
    if (!messages?.length) {
      return 'Send a message to start. The table of contents updates as the conversation grows.'
    }
    if (mode === 'response-headings') {
      return 'No markdown headings (#, ##, ###, ####) detected in assistant replies yet. This list shows response headings — switch the toc component to "user-prompts" mode in the editor to list your messages instead.'
    }
    return 'No user messages in this conversation yet.'
  }, [messages?.length, mode])

  const handleNavigate = useCallback((targetId) => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: 'smooth',
      block: mode === 'response-headings' ? 'start' : 'center',
    })
  }, [mode])

  return (
    <div className="px-2 py-3">
      <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider px-3 mb-2">
        Table of Contents
      </h3>
      <TOC items={items} onNavigate={handleNavigate} emptyMessage={emptyMessage} />
    </div>
  )
}

// User-prompts mode: one entry per user message, content truncated.
// Target id is the message wrapper (`msg-{id}`).
function extractUserPrompts(messages, truncateAt) {
  const labels = []
  for (const msg of messages) {
    if (msg.role !== 'user') continue
    const raw = (msg.content || '').replace(/\s+/g, ' ').trim()
    if (!raw) continue
    const label = raw.length > truncateAt
      ? `${raw.slice(0, truncateAt).trimEnd()}…`
      : raw
    labels.push({ id: `msg-${msg.id}`, label, level: 1 })
  }
  return labels
}

// Response-headings mode: one entry per markdown heading in assistant
// messages, hierarchical by H1/H2/H3/H4 level. Target id is the heading
// anchor that MessageCard injects in document order.
function extractHeadings(messages, truncateAt) {
  const labels = []
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue
    const content = msg.content || ''
    if (!content.includes('#')) continue
    HEADING_RE.lastIndex = 0
    let match
    let idx = 0
    while ((match = HEADING_RE.exec(content)) !== null) {
      const level = match[1].length
      const raw = match[2].replace(/\s+/g, ' ').trim()
      if (!raw) { idx++; continue }
      const label = raw.length > truncateAt
        ? `${raw.slice(0, truncateAt).trimEnd()}…`
        : raw
      labels.push({ id: `msg-${msg.id}-h-${idx}`, label, level })
      idx++
    }
  }
  return labels
}
