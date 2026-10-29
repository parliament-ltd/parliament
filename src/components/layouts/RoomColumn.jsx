// RoomColumn: one side column of a room's layout, with its button (C279 (b)).
//
// - Open form (the room alone on screen): the column in its place beside the
//   chat, as before. Its button, at the column's inner edge, closes it to a
//   24px strip and opens it again (PR-27's toggle, now on every column with
//   blocks, so the stored panelButtons stop mattering; they stay stored).
// - Strips (sharing the screen): the column is a 24px strip with its button,
//   and the chat takes the room's width. The button opens the column over
//   the chat's edge, inside the room, at the column's width; the layout
//   closes it on Escape or a click on the chat (useColumns.js).
//
// The column's blocks stay mounted while it is closed, so nothing in them is
// lost, but out of reach (inert) until it opens. The tree is the same in both
// forms, so changing form keeps them too.

import { useId } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLingui } from '@lingui/react'
import { COPY } from '../../copy'

const WORDS = {
  left: { name: COPY.room.columnLeft, open: COPY.room.openLeft, close: COPY.room.closeLeft },
  right: { name: COPY.room.columnRight, open: COPY.room.openRight, close: COPY.room.closeRight },
}

/**
 * @param {{ side: 'left'|'right', form: 'open'|'strips', open: boolean, onToggle: () => void,
 *   width: number, className?: string, contentClassName?: string, children: import('react').ReactNode }} props
 *   width: the column's width in pixels, open in its place or over the chat;
 *   className: the column as the layout draws it open in its place;
 *   contentClassName: its blocks' holder
 */
export default function RoomColumn({ side, form, open, onToggle, width, className = '', contentClassName = '', children }) {
  const { i18n } = useLingui()
  const id = useId()
  const words = WORDS[side]
  const strip = form === 'strips'
  // The chevron points the way the column will go.
  const Chevron = (side === 'left') === open ? ChevronLeft : ChevronRight
  const label = i18n._(open ? words.close : words.open)
  const state = strip ? ` strip${open ? ' shown' : ''}` : (open ? '' : ' layout-panel-collapsed')
  return (
    <aside
      className={`layout-panel ${side}${state} ${strip ? '' : className}`}
      style={{ '--column': `${width}px` }}
      aria-label={i18n._(words.name)}
      data-column={side}
    >
      {/* First, so Tab goes from the button into the column it opened. */}
      <button
        type="button"
        className={`layout-panel-toggle ${side}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
      >
        <Chevron className="w-3 h-3" aria-hidden="true" />
      </button>
      <div id={id} className={`layout-panel-content ${contentClassName}`} inert={!open}>
        {children}
      </div>
    </aside>
  )
}
