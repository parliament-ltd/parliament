// canvas-centric@1.0 — data-workspace layout. A wide canvas region (charts,
// tables, dashboards) flanked by a left rail (file shelf etc.), a chat panel
// on the right for conversational analysis, an inspector below the chat for
// column / schema details, and a docked input bar beneath the canvas.
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1:
//   left-rail (single) | canvas (stack) + input-dock (single) | chat-panel (stack) + inspector (stack)
//
// PR-11a: canvas capacity bumped from 'single' to 'stack' so the Data
// Workspace template can stack chart-canvas + table-canvas + summary-dashboard
// vertically. V1 Pelican toggled between them via tabs; the V2 decomposition
// scrolls instead, since each canvas component now ships its own empty-state
// when no file-shelf is present in the room (per audit §3.17).

const RAIL_BASE   = 'flex flex-col gap-3 p-3 overflow-y-auto bg-white'
const RAIL_BORDER = 'border-[var(--p-border)]'

function renderSlot(nodes) {
  if (!nodes || nodes.length === 0) return null
  return nodes
}

export default {
  name: 'canvas-centric',
  version: '1.0',
  displayName: 'Canvas-centric',
  scope: 'room',
  slots: [
    { id: 'left-rail',  capacity: 'single' },
    { id: 'canvas',     capacity: 'stack'  },
    { id: 'chat-panel', capacity: 'stack'  },
    { id: 'inspector',  capacity: 'stack'  },
    { id: 'input-dock', capacity: 'single' },
  ],

  render: ({ slotContents = {} }) => {
    const left      = slotContents['left-rail']
    const canvas    = slotContents['canvas']
    const input     = slotContents['input-dock']
    const chat      = slotContents['chat-panel']
    const inspector = slotContents['inspector']
    const hasRight  = (chat && chat.length > 0) || (inspector && inspector.length > 0)

    return (
      <div className="flex h-full min-h-[480px] bg-[var(--p-bg-base)]">
        {/* Left rail */}
        {left && left.length > 0 && (
          <aside className={`w-60 shrink-0 border-r ${RAIL_BORDER} ${RAIL_BASE}`}>
            {renderSlot(left)}
          </aside>
        )}

        {/* Center: canvas + input */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 overflow-auto">
            {renderSlot(canvas)}
          </div>
          {input && input.length > 0 && (
            <div className="border-t border-[var(--p-border)] p-3 bg-white">
              {renderSlot(input)}
            </div>
          )}
        </main>

        {/* Right: chat panel above, inspector below */}
        {hasRight && (
          <aside className={`w-80 shrink-0 border-l ${RAIL_BORDER} flex flex-col bg-white`}>
            {chat && chat.length > 0 && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {renderSlot(chat)}
              </div>
            )}
            {inspector && inspector.length > 0 && (
              <div className="border-t border-[var(--p-border)] p-3 max-h-72 overflow-y-auto space-y-3">
                {renderSlot(inspector)}
              </div>
            )}
          </aside>
        )}
      </div>
    )
  },
}
