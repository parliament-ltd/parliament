// single-column-with-sheet@1.0 — pocket-chat / mobile layout. A single
// vertical message column with a docked input bar at the bottom and an
// optional sheet that can slide up from the bottom edge for context
// (highlights, notes, branches, settings) without leaving the chat.
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1:
//   msg-area (single) + input-dock (single) | sheet (stack, overlay)
//
// In Phase 1 the sheet is rendered as a collapsible panel docked beneath
// the input dock — full bottom-sheet animation is deferred. Sheet content
// is hidden by default; clicking the small chevron handle expands it. The
// `data-sheet-open` attribute is set on the root for components that want
// to react to expansion.

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

function renderSlot(nodes) {
  if (!nodes || nodes.length === 0) return null
  return nodes
}

// Render is invoked by RoomShell as a React component (`<LayoutRender ... />`),
// so it is free to use hooks. Defined inline on the entry object so this
// file has only one default export — no other component-like exports
// to confuse react-refresh.
export default {
  name: 'single-column-with-sheet',
  version: '1.0',
  displayName: 'Single column with sheet',
  scope: 'room',
  slots: [
    { id: 'msg-area',   capacity: 'single' },
    { id: 'input-dock', capacity: 'single' },
    { id: 'sheet',      capacity: 'stack'  },
  ],

  render: function SingleColumnWithSheetRoot({ slotContents = {} }) {
    const msgs  = slotContents['msg-area']
    const input = slotContents['input-dock']
    const sheet = slotContents['sheet']
    const hasSheet = sheet && sheet.length > 0
    const [open, setOpen] = useState(false)

    return (
      <div
        className="flex flex-col h-full min-h-[480px] bg-[var(--p-bg-base)]"
        data-sheet-open={hasSheet && open ? 'true' : 'false'}
      >
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {renderSlot(msgs)}
        </div>

        {/* Input dock */}
        {input && input.length > 0 && (
          <div className="border-t border-[var(--p-border)] p-3 bg-white">
            {renderSlot(input)}
          </div>
        )}

        {/* Sheet — collapsible bottom panel */}
        {hasSheet && (
          <div className="border-t border-[var(--p-border)] bg-white">
            <button
              onClick={() => setOpen((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--p-text-secondary)] hover:text-[var(--p-gold-light)] transition-colors"
              aria-expanded={open}
            >
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              Sheet
            </button>
            {open && (
              <div className="max-h-72 overflow-y-auto p-3 space-y-3 border-t border-[var(--p-border-subtle)]">
                {renderSlot(sheet)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  },
}
