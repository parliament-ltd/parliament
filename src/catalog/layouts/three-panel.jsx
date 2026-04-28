// three-panel@1.0 — desktop default. Two rails flanking a center
// message area with a docked input bar beneath it.
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1:
//   left-rail (single) | msg-area (single) + input-dock (single) | right-rail (stack) + right-rail-extra (stack)

const RAIL_BASE   = 'flex flex-col gap-3 p-3 overflow-y-auto bg-white'
const RAIL_BORDER = 'border-[var(--p-border)]'

function renderSlot(nodes) {
  if (!nodes || nodes.length === 0) return null
  return nodes
}

export default {
  name: 'three-panel',
  version: '1.0',
  displayName: 'Three-panel',
  scope: 'room',
  slots: [
    { id: 'left-rail',        capacity: 'single' },
    { id: 'msg-area',         capacity: 'single' },
    { id: 'input-dock',       capacity: 'single' },
    { id: 'right-rail',       capacity: 'stack'  },
    { id: 'right-rail-extra', capacity: 'stack'  },
  ],

  render: ({ slotContents = {} }) => {
    const left       = slotContents['left-rail']
    const msgs       = slotContents['msg-area']
    const input      = slotContents['input-dock']
    const right      = slotContents['right-rail']
    const rightExtra = slotContents['right-rail-extra']
    const hasRight   = (right && right.length > 0) || (rightExtra && rightExtra.length > 0)

    return (
      <div className="flex h-full min-h-[480px] bg-[var(--p-bg-primary)]">
        {/* Left rail */}
        {left && left.length > 0 && (
          <aside className={`w-56 shrink-0 border-r ${RAIL_BORDER} ${RAIL_BASE}`}>
            {renderSlot(left)}
          </aside>
        )}

        {/* Center: messages + input */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            {renderSlot(msgs)}
          </div>
          {input && input.length > 0 && (
            <div className="border-t border-[var(--p-border)] p-3 bg-white">
              {renderSlot(input)}
            </div>
          )}
        </main>

        {/* Right rail (stack) */}
        {hasRight && (
          <aside className={`w-72 shrink-0 border-l ${RAIL_BORDER} ${RAIL_BASE}`}>
            {renderSlot(right)}
            {renderSlot(rightExtra)}
          </aside>
        )}
      </div>
    )
  },
}
