// three-panel@1.0 — desktop default. Two rails flanking a center
// message area with a docked input bar beneath it.
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1:
//   left-rail (single) | msg-area (single) + input-dock (single) | right-rail (stack) + right-rail-extra (stack)
//
// PR-16: under 768px the layout swaps to a narrow tree — left-rail
// becomes a hamburger drawer, right-rail+extra fold into a panel
// toggled from the in-layout NarrowChrome. Render is collapsed into a
// single inlined function (matches single-column-with-sheet's pattern)
// so the file has only one component-shaped declaration — keeps
// fast-refresh happy.
//
// C279 (b): on the shell the room's form decides (roomForm.js). Alone on
// screen, the rails stand open beside the chat; sharing it, they are strips
// with a button each, and the chat takes the room's width; the narrow tree
// only when there is no room for a chat at all.

import { useState } from 'react'
import { useRoomForm } from '../../lib/useViewportWidth'
import NarrowDrawer from '../../components/layouts/NarrowDrawer'
import NarrowChrome from '../../components/layouts/NarrowChrome'
import RoomColumn from '../../components/layouts/RoomColumn'
import { useColumns } from '../../components/layouts/useColumns'
import { COPY } from '../../copy'

// Narrow-drawer rail class. The desktop tree uses .layout-rail-card
// (in index.css) for its card-shaped rails instead — see the desktop
// return below.
const RAIL_BASE = 'flex flex-col gap-3 p-3 overflow-y-auto bg-white'

// PR-28: desktop rails are now card-shaped (no hard L/R border, rail
// content lives inside .layout-rail-card with a soft inset-ring shadow).
// The 12px aside padding bottom-aligns the rail card with the input card
// in the center column (whose wrapper also carries p-3).
// The aside drops bg-base in PR-28e so the chat-room-frame's 64%-
// transparent surface (and the dot texture beneath it) reads through
// the rail's outer gutter.
const RAIL_OUTER = 'p-3 flex flex-col'
const RAIL_INNER = 'layout-rail-card flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3'
// Each rail's width (w-72), open beside the chat or over it.
const RAIL_WIDTH = 288

function renderSlot(nodes) {
  if (!nodes || nodes.length === 0) return null
  return nodes
}

// PR-27's per-slot opt-in, mode.layoutConfig.panelButtons, is no longer
// read: every rail with blocks has its button (C279 (b)). It stays stored.

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

  render: function ThreePanelRender({ slotContents = {} }) {
    const left       = slotContents['left-rail']
    const msgs       = slotContents['msg-area']
    const input      = slotContents['input-dock']
    const right      = slotContents['right-rail']
    const rightExtra = slotContents['right-rail-extra']
    const hasRight   = (right && right.length > 0) || (rightExtra && rightExtra.length > 0)
    const hasLeft    = left && left.length > 0
    const form       = useRoomForm()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [panelOpen, setPanelOpen]   = useState(false)
    // The rails, open or closed: each room starts as its form says.
    const columns = useColumns(form)

    if (form === 'narrow') {
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
            rightWords={{ show: COPY.room.openRight, hide: COPY.room.closeRight }}
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
      // PR-28e: outer flex drops bg-base so .chat-room-frame's
      // 64%-transparent surface and the chat-page-bg dot texture
      // read through.
      <div className="flex h-full min-h-[480px]" ref={columns.root}>
        {/* Left rail */}
        {hasLeft && (
          <RoomColumn
            side="left" form={form} open={columns.open.left} onToggle={() => columns.toggle('left')}
            width={RAIL_WIDTH} className={RAIL_OUTER} contentClassName={RAIL_INNER}
          >
            {renderSlot(left)}
          </RoomColumn>
        )}

        {/* Center: messages + input. A click on the chat closes a rail
            open over it (C279 (b)). */}
        <main className="flex-1 flex flex-col min-w-0" onPointerDown={columns.over ? columns.close : undefined}>
          <div className="flex-1 min-h-0">
            {renderSlot(msgs)}
          </div>
          {input && input.length > 0 && (
            // PR-25 set the input wrapper to bg-base so the chat-input-card
            // floated against the chat surface. PR-28e drops the explicit
            // bg-base so the .chat-room-frame's 64%-transparent surface
            // (and the dot texture below it) reads through the wrapper's
            // 12px gutter around the input card.
            <div className="p-3">
              {renderSlot(input)}
            </div>
          )}
        </main>

        {/* Right rail (stack) */}
        {hasRight && (
          <RoomColumn
            side="right" form={form} open={columns.open.right} onToggle={() => columns.toggle('right')}
            width={RAIL_WIDTH} className={RAIL_OUTER} contentClassName={RAIL_INNER}
          >
            {renderSlot(right)}
            {renderSlot(rightExtra)}
          </RoomColumn>
        )}
      </div>
    )
  },
}
