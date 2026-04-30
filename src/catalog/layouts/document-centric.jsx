// document-centric@1.0 — drafting-desk layout. A document canvas in the
// center for long-form writing, an outline rail on the left for navigation,
// a margin column on the right for inline annotations (claude-comments,
// ripple-analysis), and a chat panel docked below the margin for
// conversational drafting.
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1:
//   outline (single) | document (single) | margin (stack) + chat-panel (stack)

const RAIL_BASE   = 'flex flex-col gap-3 p-3 overflow-y-auto bg-white'
const RAIL_BORDER = 'border-[var(--p-border)]'

function renderSlot(nodes) {
  if (!nodes || nodes.length === 0) return null
  return nodes
}

export default {
  name: 'document-centric',
  version: '1.0',
  displayName: 'Document-centric',
  scope: 'room',
  slots: [
    { id: 'outline',    capacity: 'single' },
    { id: 'document',   capacity: 'single' },
    { id: 'margin',     capacity: 'stack'  },
    { id: 'chat-panel', capacity: 'stack'  },
  ],

  render: ({ slotContents = {} }) => {
    const outline  = slotContents['outline']
    const document = slotContents['document']
    const margin   = slotContents['margin']
    const chat     = slotContents['chat-panel']
    const hasRight = (margin && margin.length > 0) || (chat && chat.length > 0)

    return (
      <div className="flex h-full min-h-[480px] bg-[var(--p-bg-base)]">
        {/* Outline rail */}
        {outline && outline.length > 0 && (
          <aside className={`w-56 shrink-0 border-r ${RAIL_BORDER} ${RAIL_BASE}`}>
            {renderSlot(outline)}
          </aside>
        )}

        {/* Document canvas */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-white">
          {renderSlot(document)}
        </main>

        {/* Right: margin annotations above, chat panel below */}
        {hasRight && (
          <aside className={`w-80 shrink-0 border-l ${RAIL_BORDER} flex flex-col bg-white`}>
            {margin && margin.length > 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {renderSlot(margin)}
              </div>
            )}
            {chat && chat.length > 0 && (
              <div className="border-t border-[var(--p-border)] p-3 max-h-72 overflow-y-auto space-y-3">
                {renderSlot(chat)}
              </div>
            )}
          </aside>
        )}
      </div>
    )
  },
}
