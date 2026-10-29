import { useLingui } from '@lingui/react'
import { COPY } from '../copy'

// A board on the page. Until each board's own blocks are drawn (stages 4 to
// 13) it shows its name and says so, with one line of stand-in reply to
// edit, so folding the bar into a circle (C108) can be tried before rooms
// arrive. What is typed there is kept nowhere. The navy rule marks the board
// the bar points at; a click points the bar at it.

export default function Board({ board, addressed, onAddress }) {
  const { i18n } = useLingui()
  return (
    <article
      className={`ch-card${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress(board)}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards[board])}</h2>
      </header>
      <div className="ch-cbody">
        <p className="ch-marg">{i18n._(COPY.shell.boardLater)}</p>
        <p className="ch-reply" contentEditable suppressContentEditableWarning spellCheck={false} dir="auto">
          {i18n._(COPY.shell.sampleReply)}
        </p>
      </div>
    </article>
  )
}
