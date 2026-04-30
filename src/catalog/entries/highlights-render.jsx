// highlights@1.0 — live render for the V2 RoomShell chat path.
//
// PR-10a.6. Self-binds to AnnotationsContext per refactor/v2-phase1-
// audit.md §2.8a.
//
// Aggregates raw highlight records (one per term-message-color tuple)
// into the (term, color, count, ids) shape HighlightList expects:
// each unique term collapses to one row, the count is the number of
// messages in this conversation that contain the term, and `ids` is
// the array of underlying highlight record ids that the row's trash
// button should remove.
//
// The aggregation lives here (not in the context) because counting
// occurrences requires the live message list and the matcher rule —
// component-shaped rather than context-shaped concerns.

import { useMemo } from 'react'
import HighlightList from '../../components/core/HighlightList'
import { useAnnotations } from '../../stores/AnnotationsContext'
import { useChat } from '../../stores/ChatContext'
import { includesWord } from '../../lib/textUtils'

export default function HighlightsRender({ config = {} } = {}) {
  const {
    highlights,
    addHighlightFromSidebar,
    deleteHighlights,
    navigateHighlight,
  } = useAnnotations()
  const { messages } = useChat()

  // Aggregate raw records into the per-term shape HighlightList expects.
  // Group by lowercase text so "Foo" and "foo" collapse to one row,
  // matching V1 Albatross's case-insensitive treatment.
  const aggregated = useMemo(() => {
    if (!highlights.length) return []
    const groups = new Map()
    for (const hl of highlights) {
      const key = (hl.text || '').toLowerCase()
      if (!groups.has(key)) {
        groups.set(key, { text: hl.text, color: hl.color, ids: [] })
      }
      groups.get(key).ids.push(hl.id)
    }
    // Count each term's occurrences across the message list.
    return Array.from(groups.values()).map(g => ({
      ...g,
      count: messages.filter(m => m.content && includesWord(m.content, g.text)).length,
    }))
  }, [highlights, messages])

  const handleAdd = (text, color) => {
    addHighlightFromSidebar(text, color)
  }

  const handleRemove = (ids) => {
    deleteHighlights(ids)
  }

  const handleNavigate = (text, direction) => {
    navigateHighlight(text, direction)
  }

  // `showAddForm` config doesn't have a HighlightList prop today —
  // HighlightList always shows the add form. Hiding the form would
  // require extending HighlightList; deferred until the Phase 2 editor
  // exposes per-component visibility toggles. For now config.showAddForm
  // is reserved.
  void config

  return (
    <div className="px-4 py-4">
      <HighlightList
        highlights={aggregated}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onNavigate={handleNavigate}
      />
    </div>
  )
}
