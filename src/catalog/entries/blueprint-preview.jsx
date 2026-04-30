// Self-contained render wrapper for blueprint@1.0.
//
// Renders a simple grid of "rooms" (one per user-built room mode plus the
// homepage). Each room highlights with a gold border when the bus
// publishes `row-hover` carrying its conversation's `room` reference.
// Clicking a room navigates to a chat in that room (Phase 2 will switch
// this to navigating to /edit/:roomId once the editor lands at PR-8).
//
// The full SVG floor-plan visualization in
// refactor/parliament_homepage_v2 (2).html is deliberately deferred —
// PR-6's exit criterion is "hovering a chat row highlights its room on
// the blueprint", which the simple grid satisfies. PR-8's editor will
// drive richer fidelity once homepage editing is live.
//
// Lives in its own file so blueprint.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useEffect, useMemo, useState } from 'react'
import { useConversations } from '../../stores/ConversationContext'
import { listModes } from '../../lib/modes'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'

const ACCENT_GOLD = 'var(--p-accent-gold, #B8A070)'

export default function BluePreview({ hostAPI } = {}) {
  const { conversations } = useConversations()
  const [rooms, setRooms] = useState([])
  const [hoveredConvId, setHoveredConvId] = useState(null)

  // Subscribe to row-hover events. chats@1.0 publishes `{ conversationId }`.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe(PHASE_1_EVENTS.ROW_HOVER, (payload) => {
      setHoveredConvId(payload?.conversationId ?? null)
    })
  }, [hostAPI])

  // Load room modes once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const modes = await listModes({ scope: 'room' })
        if (!cancelled) setRooms(modes || [])
      } catch {
        if (!cancelled) setRooms([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  // For each room mode, count how many conversations are assigned to it
  // (via `conversation.room`). Rooms with zero conversations still render
  // — the homepage shows them as "empty rooms" the user can fill.
  const roomTiles = useMemo(() => {
    const byRoom = new Map()
    for (const conv of conversations) {
      const key = conv?.room || null
      if (!key) continue
      byRoom.set(key, (byRoom.get(key) || 0) + 1)
    }
    return rooms.map(r => ({
      id: r.id,
      name: r.meta?.name || r.id,
      description: r.meta?.description || '',
      layoutRef: r.layout?.ref || '',
      schemeRef: r.scheme?.ref || '',
      count: byRoom.get(r.id) || 0,
    }))
  }, [rooms, conversations])

  // The currently-hovered conversation tells us which room to highlight.
  const hoveredRoomId = useMemo(() => {
    if (!hoveredConvId) return null
    const c = conversations.find(c => c.id === hoveredConvId)
    return c?.room || null
  }, [hoveredConvId, conversations])

  if (roomTiles.length === 0) {
    return (
      <div className="text-sm text-[var(--p-text-secondary)]">
        No rooms yet. Build one with <span className="text-[var(--p-text-primary)]">+ Build a room</span>.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {roomTiles.map(tile => {
        const isActive = hoveredRoomId === tile.id
        return (
          <div
            key={tile.id}
            className="rounded-lg border bg-white p-4 transition-all"
            style={{
              borderColor: isActive ? ACCENT_GOLD : 'var(--p-border)',
              boxShadow: isActive ? '0 0 0 3px rgba(184,160,112,0.18)' : 'none',
              transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
            }}
          >
            <div className="text-sm font-medium text-[var(--p-text-primary)]">
              {tile.name}
            </div>
            {tile.description && (
              <p className="text-xs text-[var(--p-text-secondary)] mt-1 line-clamp-2">
                {tile.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--p-text-muted)]">
              <code>{tile.layoutRef}</code>
              {tile.schemeRef && <span>· {tile.schemeRef}</span>}
            </div>
            <div className="mt-2 text-xs text-[var(--p-text-secondary)]">
              {tile.count} conversation{tile.count === 1 ? '' : 's'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
