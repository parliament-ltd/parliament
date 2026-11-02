import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { LETTERS, letterOf } from './letters'
import { dayOf } from './when'

// letter: under the bar (C279 (c)): one letter, or the list of them with
// letter:all. Escape closes it, as it closes ? and inspect:. Since 2 November
// the letter is a board (C286 (q)): LetterBoard below, which moves, pops and
// closes like any other.

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

/**
 * @param {{ letter: { n?: number, all?: boolean }, read: number[], onPick: (form: string) => void }} props
 *   onPick: writes a command into the bar, as a row of ? does
 */
export default function Letter({ letter, read, onPick }) {
  const { i18n } = useLingui()
  if (letter.all) {
    return (
      <section className="ch-letterp" aria-label={i18n._(COPY.letter.list)}>
        <div className="ch-letterp-head">
          <h3>{i18n._(COPY.letter.list)}</h3>
          <span className="ch-marg">{i18n._(COPY.shell.referenceClose)}</span>
        </div>
        <ol className="ch-letterp-list">
          {[...LETTERS].reverse().map((l) => (
            <li key={l.n}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(`letter:${l.n}`)}>
                <span className="n">{i18n._(COPY.letter.heading, { n: l.n })}</span>
                <span className="ch-marg">{dayOf(i18n, l.date)}{read.includes(l.n) ? '' : ` · ${i18n._(COPY.letter.unread)}`}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    )
  }
  const l = letterOf(letter.n)
  if (!l) return null
  return (
    <section className="ch-letterp" aria-label={i18n._(COPY.letter.heading, { n: l.n })}>
      <div className="ch-letterp-head">
        <h3>{i18n._(COPY.letter.heading, { n: l.n })}<span className="ch-marg">{dayOf(i18n, l.date)}</span></h3>
        <span className="ch-marg">{i18n._(COPY.shell.referenceClose)}</span>
      </div>
      <div className="ch-letter">
        {l.paragraphs.map((p) => <p key={p.id}>{i18n._(p)}</p>)}
        <p className="sig">{i18n._(l.closing)}<br />{i18n._(l.signature)}</p>
      </div>
    </section>
  )
}
