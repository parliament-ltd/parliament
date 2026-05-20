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
//
// PR-16: under 768px the canvas stays in the body; chat-panel becomes a
// chevron-handle slide-up sheet between canvas and input-dock; the
// left-rail file-shelf becomes a hamburger drawer; inspector folds into
// a panel toggled from NarrowChrome. Auto-open-sheet-on-send is not
// implemented — the user taps the chevron to see Claude's reply. Render
// is inlined as a single named function so the file has one
// component-shaped declaration (matches single-column-with-sheet).

import { useState } from 'react'
import { useIsNarrow } from '../../lib/useViewportWidth'
import NarrowDrawer from '../../components/layouts/NarrowDrawer'
import NarrowChrome from '../../components/layouts/NarrowChrome'
import NarrowSheet from '../../components/layouts/NarrowSheet'

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
  // PR-19i: description on the manifest is the source of truth; the
  // libraryLayouts IDB seed is fire-once, so library-preview.jsx
  // enriches from this field at read time to ship rewrites without
  // an IDB migration.
  description: 'A center canvas (chart, table, dashboard) flanked by a sidebar and a chat panel. For working with data and files.',
  scope: 'room',
  slots: [
    { id: 'left-rail',  capacity: 'stack'  },
    { id: 'canvas',     capacity: 'stack'  },
    { id: 'chat-panel', capacity: 'stack'  },
    { id: 'inspector',  capacity: 'stack'  },
    { id: 'input-dock', capacity: 'single' },
  ],

  render: function CanvasCentricRender({ slotContents = {} }) {
    const left      = slotContents['left-rail']
    const canvas    = slotContents['canvas']
    const input     = slotContents['input-dock']
    const chat      = slotContents['chat-panel']
    const inspector = slotContents['inspector']
    const hasLeft      = left && left.length > 0
    const hasChat      = chat && chat.length > 0
    const hasInspector = inspector && inspector.length > 0
    const hasRight     = hasChat || hasInspector
    const isNarrow     = useIsNarrow(768)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [panelOpen, setPanelOpen]   = useState(false)

    if (isNarrow) {
      // h-[100dvh] anchors the narrow tree to the viewport so stacked
      // canvas content (chart + table + summary) doesn't push the
      // chat sheet and input dock off-screen. The parent route doesn't
      // enforce a height; locking here makes the narrow stack fit.
      return (
        <div className="flex flex-col h-[100dvh] bg-[var(--p-bg-base)]">
          <NarrowChrome
            onLeftClick={hasLeft ? () => setDrawerOpen(true) : undefined}
            onRightClick={hasInspector ? () => setPanelOpen((v) => !v) : undefined}
            rightLabel="Inspector"
            rightActive={panelOpen}
          />

          {panelOpen ? (
            <main className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-white">
              {renderSlot(inspector)}
            </main>
          ) : (
            <main className="flex-1 min-h-0 flex flex-col min-w-0">
              <div className="flex-1 min-h-0 overflow-auto">
                {renderSlot(canvas)}
              </div>
              {hasChat && (
                <NarrowSheet label="Chat">
                  {renderSlot(chat)}
                </NarrowSheet>
              )}
              {/* PR-18f: narrow input-dock loses border-t + horizontal padding;
                  the canvas above fades into the input via .messages-fade-mask
                  on any contained MessageList. */}
              {input && input.length > 0 && (
                // PR-25: narrow input dock matches chat-base bg too.
                <div className="bg-[var(--p-bg-base)] py-2">
                  {renderSlot(input)}
                </div>
              )}
            </main>
          )}

          {hasLeft && (
            <NarrowDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              <div className={RAIL_BASE}>
                {renderSlot(left)}
              </div>
            </NarrowDrawer>
          )}
        </div>
      )
    }

    return (
      <div className="flex h-full min-h-[480px] bg-[var(--p-bg-base)]">
        {/* Left rail */}
        {hasLeft && (
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
            // PR-25: input dock matches the chat-base background and
            // drops its separator line. The input itself lives in a
            // `.chat-input-card` (PR-23) — wrapping it in another bg
            // colour + border made the dock feel like a tray under the
            // card; matching bg-base lets the card float in the chat
            // surface naturally.
            <div className="p-3 bg-[var(--p-bg-base)]">
              {renderSlot(input)}
            </div>
          )}
        </main>

        {/* Right: chat panel above, inspector below */}
        {hasRight && (
          <aside className={`w-80 shrink-0 border-l ${RAIL_BORDER} flex flex-col bg-white`}>
            {hasChat && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {renderSlot(chat)}
              </div>
            )}
            {hasInspector && (
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
