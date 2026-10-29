// document-centric@1.0 — drafting-desk layout. A document canvas in the
// center for long-form writing, an outline rail on the left for navigation,
// a margin column on the right for inline annotations (claude-comments,
// ripple-analysis), and a chat panel docked below the margin for
// conversational drafting.
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1:
//   outline (single) | document (single) | margin (stack) + chat-panel (stack)
//
// PR-16: under 768px the document fills the body; chat-panel becomes a
// chevron-handle slide-up sheet; outline becomes a hamburger drawer; margin
// folds into a panel toggled from NarrowChrome. No input-dock slot — chat
// components carry their own input. Render is inlined as a single named
// function so the file has one component-shaped declaration (matches
// single-column-with-sheet).
//
// C279 (b): on the shell the room's form decides (roomForm.js), as in
// three-panel. Alone on screen, the outline and the right column stand
// open, each with a button; sharing it, the document takes the room's width
// and they are strips, each opening over the document's edge.

import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { useRoomForm } from '../../lib/useViewportWidth'
import NarrowDrawer from '../../components/layouts/NarrowDrawer'
import NarrowChrome from '../../components/layouts/NarrowChrome'
import NarrowSheet from '../../components/layouts/NarrowSheet'
import RoomColumn from '../../components/layouts/RoomColumn'
import { useColumns } from '../../components/layouts/useColumns'
import { COPY } from '../../copy'

const RAIL_BASE   = 'flex flex-col gap-3 p-3 overflow-y-auto bg-white'
const RAIL_BORDER = 'border-[var(--p-border)]'
// The outline's width (w-56) and the right column's (w-80).
const OUTLINE_WIDTH = 224
const MARGIN_WIDTH  = 320

function renderSlot(nodes) {
  if (!nodes || nodes.length === 0) return null
  return nodes
}

export default {
  name: 'document-centric',
  version: '1.0',
  displayName: 'Document-centric',
  // PR-19i: manifest is the source of truth. See canvas-centric for the
  // enrichment rationale.
  description: 'An editable document with margin notes for comments and analysis alongside the draft. For writing and editing.',
  scope: 'room',
  slots: [
    { id: 'outline',    capacity: 'single' },
    { id: 'document',   capacity: 'single' },
    { id: 'margin',     capacity: 'stack'  },
    { id: 'chat-panel', capacity: 'stack'  },
  ],

  render: function DocumentCentricRender({ slotContents = {} }) {
    const outline  = slotContents['outline']
    const document = slotContents['document']
    const margin   = slotContents['margin']
    const chat     = slotContents['chat-panel']
    const hasOutline = outline && outline.length > 0
    const hasMargin  = margin && margin.length > 0
    const hasChat    = chat && chat.length > 0
    const hasRight   = hasMargin || hasChat
    const { i18n }   = useLingui()
    const form       = useRoomForm()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [panelOpen, setPanelOpen]   = useState(false)
    // The outline and the right column, open or closed: each room starts as
    // its form says.
    const columns = useColumns(form)

    if (form === 'narrow') {
      // h-[100dvh] anchors the narrow tree to the viewport so stacked
      // sections (chrome / body / sheet) stay within bounds. The parent
      // route doesn't enforce a height; locking here makes it fit.
      return (
        <div className="flex flex-col h-[100dvh] bg-[var(--p-bg-base)]">
          <NarrowChrome
            onLeftClick={hasOutline ? () => setDrawerOpen(true) : undefined}
            onRightClick={hasMargin ? () => setPanelOpen((v) => !v) : undefined}
            rightWords={{ show: COPY.room.showMargin, hide: COPY.room.hideMargin }}
            rightActive={panelOpen}
          />

          {panelOpen ? (
            <main className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-white">
              {renderSlot(margin)}
            </main>
          ) : (
            <main className="flex-1 min-h-0 flex flex-col min-w-0">
              <div className="flex-1 min-h-0 overflow-y-auto bg-white">
                {renderSlot(document)}
              </div>
              {hasChat && (
                <NarrowSheet label={i18n._(COPY.room.chatSheet)}>
                  {renderSlot(chat)}
                </NarrowSheet>
              )}
            </main>
          )}

          {hasOutline && (
            <NarrowDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              <div className={RAIL_BASE}>
                {renderSlot(outline)}
              </div>
            </NarrowDrawer>
          )}
        </div>
      )
    }

    return (
      <div className="flex h-full min-h-[480px] bg-[var(--p-bg-base)]" ref={columns.root}>
        {/* Outline rail. Its padding is its blocks' holder's, so the rail
            looks the same open in its place or over the document. */}
        {hasOutline && (
          <RoomColumn
            side="left" form={form} open={columns.open.left} onToggle={() => columns.toggle('left')}
            width={OUTLINE_WIDTH} className={`border-r ${RAIL_BORDER} bg-white`}
            contentClassName="flex flex-col gap-3 p-3 overflow-y-auto"
          >
            {renderSlot(outline)}
          </RoomColumn>
        )}

        {/* Document canvas. A click on it closes a column open over it
            (C279 (b)). */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-white" onPointerDown={columns.over ? columns.close : undefined}>
          {renderSlot(document)}
        </main>

        {/* Right: margin annotations above, chat panel below */}
        {hasRight && (
          <RoomColumn
            side="right" form={form} open={columns.open.right} onToggle={() => columns.toggle('right')}
            width={MARGIN_WIDTH} className={`border-l ${RAIL_BORDER} flex flex-col bg-white`}
            contentClassName="flex-1 flex flex-col min-h-0"
          >
            {hasMargin && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {renderSlot(margin)}
              </div>
            )}
            {hasChat && (
              <div className="border-t border-[var(--p-border)] p-3 max-h-72 overflow-y-auto space-y-3">
                {renderSlot(chat)}
              </div>
            )}
          </RoomColumn>
        )}
      </div>
    )
  },
}
