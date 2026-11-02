import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { LETTERS, letterOf } from './letters'
import { dayOf } from './when'

// The letter (C279 (c)) as a board since 2 November (C286 (q)): one letter,
// or the list of them with letter:all. It moves, pops and closes like any
// other board. The panel under the bar it replaced was removed on Stefan's
// yes (C287).

/**
 * The letter as a board: one letter (which: its number) or the list ('all').
 * @param {{ which: number|'all', read: number[], addressed: boolean, onAddress: (board: string) => void, onPick: (form: string) => void }} props
 */
export function LetterBoard({ which, read, addressed, onAddress, onPick }) {
  const { i18n } = useLingui()
  const l = which === 'all' ? null : letterOf(which)
  return (
    <article
      className={`ch-card ch-letterb${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('letter')}
    >
      <header className="ch-chead">
        <h2>{l ? i18n._(COPY.letter.heading, { n: l.n }) : i18n._(COPY.letter.list)}</h2>
        {l && <span className="ch-marg">{dayOf(i18n, l.date)}</span>}
      </header>
      <div className="ch-cbody">
        {l
          ? (
            <div className="ch-letter">
              {l.paragraphs.map((p) => <p key={p.id}>{i18n._(p)}</p>)}
              <p className="sig">{i18n._(l.closing)}<br />{i18n._(l.signature)}</p>
            </div>
          )
          : (
            <ol className="ch-letterp-list">
              {[...LETTERS].reverse().map((x) => (
                <li key={x.n}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(`letter:${x.n}`)}>
                    <span className="n">{i18n._(COPY.letter.heading, { n: x.n })}</span>
                    <span className="ch-marg">{dayOf(i18n, x.date)}{read.includes(x.n) ? '' : ` · ${i18n._(COPY.letter.unread)}`}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
      </div>
    </article>
  )
}
