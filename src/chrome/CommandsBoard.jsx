import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { ReferenceColumns } from './Reference'
import { referenceGroups, anyAway } from './referenceGroups'

// The command menu as a board (29 October; C280): the ? reference, every
// command in its columns, as a board to keep open beside the work, move, or
// pop into a window of its own (open:commandmenu, pop:commandmenu). It types
// nothing: a click writes the command into the one bar, and Enter runs it.
// Commands for another board than the one the bar points at are fainter.

/**
 * @param {{ board: string|null, addressed: boolean, onAddress: (board: string) => void, onPick: (form: string) => void }} props
 *   board: the board the bar points at, or null when it points here
 */
export default function CommandsBoard({ board, addressed, onAddress, onPick }) {
  const { i18n } = useLingui()
  const groups = referenceGroups(board)
  return (
    <article
      className={`ch-card ch-commands${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('commands')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.commands)}</h2>
        {anyAway(groups) && <span className="ch-marg">{i18n._(COPY.shell.referenceFainter)}</span>}
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      <div className="ch-cbody ch-ref ch-ref-board">
        <ReferenceColumns groups={groups} onPick={onPick} />
        <p className="ch-ref-foot">{i18n._(COPY.shell.referenceKeys, { example: '?bar' })}</p>
      </div>
    </article>
  )
}
