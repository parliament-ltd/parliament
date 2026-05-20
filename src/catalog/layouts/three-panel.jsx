// three-panel@1.0 — desktop default. Two rails flanking a center
// message area with a docked input bar beneath it.
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1:
//   left-rail (single) | msg-area (single) + input-dock (single) | right-rail (stack) + right-rail-extra (stack)
//
// PR-16: under 768px the layout swaps to a narrow tree — left-rail
// becomes a hamburger drawer, right-rail+extra fold into a panel
// toggled from the in-layout NarrowChrome. The desktop tree is
// untouched at ≥768px. Render is collapsed into a single inlined
// function (matches single-column-with-sheet's pattern) so the file
// has only one component-shaped declaration — keeps fast-refresh
// happy.

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useIsNarrow } from '../../lib/useViewportWidth'
import NarrowDrawer from '../../components/layouts/NarrowDrawer'
import NarrowChrome from '../../components/layouts/NarrowChrome'

const RAIL_BASE   = 'flex flex-col gap-3 p-3 overflow-y-auto bg-white'
const RAIL_BORDER = 'border-[var(--p-border)]'

function renderSlot(nodes) {
  if (!nodes || nodes.length === 0) return null
  return nodes
}

// PR-27: per-slot panel-toggle opt-in. The Layout section in the editor
// flips mode.layoutConfig.panelButtons[slotId]; the runtime renders a
// chevron handle on the matching aside and a click animates a collapse.
function panelEnabled(mode, slotId) {
  return mode?.layoutConfig?.panelButtons?.[slotId] === true
}

export default {
  name: 'three-panel',
  version: '1.0',
  displayName: 'Three-panel',
  scope: 'room',
  slots: [
    { id: 'left-rail',        capacity: 'stack'  },
    { id: 'msg-area',         capacity: 'single' },
    { id: 'input-dock',       capacity: 'single' },
    { id: 'right-rail',       capacity: 'stack'  },
    { id: 'right-rail-extra', capacity: 'stack'  },
  ],

  render: function ThreePanelRender({ slotContents = {}, mode }) {
    const left       = slotContents['left-rail']
    const msgs       = slotContents['msg-area']
    const input      = slotContents['input-dock']
    const right      = slotContents['right-rail']
    const rightExtra = slotContents['right-rail-extra']
    const hasRight   = (right && right.length > 0) || (rightExtra && rightExtra.length > 0)
    const hasLeft    = left && left.length > 0
    const isNarrow   = useIsNarrow(768)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [panelOpen, setPanelOpen]   = useState(false)
    // PR-27: desktop panel-collapse local state. Defaults to expanded.
    // The chevron handle is only rendered when the user has opted into
    // it for that slot via the editor's Layout section.
    const [leftCollapsed,  setLeftCollapsed]  = useState(false)
    const [rightCollapsed, setRightCollapsed] = useState(false)
    const leftToggleEnabled  = panelEnabled(mode, 'left-rail')
    const rightToggleEnabled = panelEnabled(mode, 'right-rail')

    if (isNarrow) {
      // h-[100dvh] (dynamic viewport height) anchors the narrow tree to
      // the viewport so stacked sections (chrome / body / sheet / input)
      // stay within bounds when the chat route's parent chain has no
      // enforced height. Using dvh over vh handles iOS Safari's
      // collapsing toolbar.
      return (
        <div className="flex flex-col h-[100dvh] bg-[var(--p-bg-base)]">
          <NarrowChrome
            onLeftClick={hasLeft ? () => setDrawerOpen(true) : undefined}
            onRightClick={hasRight ? () => setPanelOpen((v) => !v) : undefined}
            rightLabel="Sheet"
            rightActive={panelOpen}
          />

          {panelOpen ? (
            <main className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-white">
              {renderSlot(right)}
              {renderSlot(rightExtra)}
            </main>
          ) : (
            <main className="flex-1 min-h-0 flex flex-col min-w-0">
              <div className="flex-1 min-h-0">
                {renderSlot(msgs)}
              </div>
              {/* PR-18f: narrow input-dock loses border-t + horizontal padding;
                  the chat fades into the input via .messages-fade-mask
                  (matches Claude). InputArea card carries its own 16px gutter. */}
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
          <aside
            className={`layout-panel w-56 shrink-0 border-r ${RAIL_BORDER} ${RAIL_BASE} ${
              leftToggleEnabled && leftCollapsed ? 'layout-panel-collapsed' : ''
            }`}
          >
            <div className="layout-panel-content flex flex-col gap-3">
              {renderSlot(left)}
            </div>
            {leftToggleEnabled && (
              <button
                type="button"
                className="layout-panel-toggle left"
                onClick={() => setLeftCollapsed((v) => !v)}
                aria-label={leftCollapsed ? 'Expand left rail' : 'Collapse left rail'}
              >
                {leftCollapsed
                  ? <ChevronRight className="w-3 h-3" />
                  : <ChevronLeft className="w-3 h-3" />}
              </button>
            )}
          </aside>
        )}

        {/* Center: messages + input */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            {renderSlot(msgs)}
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

        {/* Right rail (stack) */}
        {hasRight && (
          <aside
            className={`layout-panel w-72 shrink-0 border-l ${RAIL_BORDER} ${RAIL_BASE} ${
              rightToggleEnabled && rightCollapsed ? 'layout-panel-collapsed' : ''
            }`}
          >
            <div className="layout-panel-content flex flex-col gap-3">
              {renderSlot(right)}
              {renderSlot(rightExtra)}
            </div>
            {rightToggleEnabled && (
              <button
                type="button"
                className="layout-panel-toggle right"
                onClick={() => setRightCollapsed((v) => !v)}
                aria-label={rightCollapsed ? 'Expand right rail' : 'Collapse right rail'}
              >
                {rightCollapsed
                  ? <ChevronLeft className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />}
              </button>
            )}
          </aside>
        )}
      </div>
    )
  },
}
