import { useLingui } from '@lingui/react'
import { COPY } from '../copy'

// A board on the page. Until each board's own blocks are drawn (stages 4 to
// 13) it shows its name and says so. The navy rule marks the one the bar
// points at; a click points the bar at it.

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
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      <div className="ch-cbody">
        <p className="ch-marg">{i18n._(COPY.shell.boardLater)}</p>
      </div>
    </article>
  )
}
