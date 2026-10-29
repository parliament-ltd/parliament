import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { referenceGroups, anyAway } from './referenceGroups'
import { andList, boardName } from './say'

// The ? reference: every command, grouped, generated from the verb list
// (docket spec §6). It lists every command on every board, as a complete
// reference (C279 (f), ruled 29 October); one that works on another board is
// fainter and names where it works. The Lab's commands wait for a later
// release and are left out (C279 (a)). `?bar` shows one verb's forms.
//
// Drawn as Almanac v30 draws it: under the bar and as wide as the stage, its
// groups flowing into as many columns as fit, each row the command and what
// it does, the keys at its foot. Escape closes it. A click writes the
// command into the field for Enter.

// The example the foot gives of one command's forms. Commands stay English.
const ONE_VERB = '?bar'

export default function Reference({ board, topic, onPick }) {
  const { i18n } = useLingui()
  const groups = referenceGroups(board, topic)
  const fainter = !topic && anyAway(groups)
  return (
    <section className="ch-ref" aria-label={i18n._(COPY.shell.referenceName)}>
      <header className="ch-ref-head">
        <h2>{i18n._(COPY.shell.referenceTitle)}</h2>
        {fainter && <span className="ch-marg">{i18n._(COPY.shell.referenceFainter)}</span>}
      </header>
      <ReferenceColumns groups={groups} topic={topic} onPick={onPick} />
      <p className="ch-ref-foot">{i18n._(COPY.shell.referenceKeys, { example: ONE_VERB })} {i18n._(COPY.shell.referenceClose)}</p>
    </section>
  )
}

/** The groups in v30's flowing columns, each row a command and what it does; the ? panel and the command menu board share it. */
export function ReferenceColumns({ groups, topic = null, onPick }) {
  const { i18n } = useLingui()
  const where = (row) => i18n._(COPY.shell.referenceOn, { boards: andList(i18n, row.on.map((b) => boardName(i18n, b))) })
  return (
      <div className="ch-ref-cols">
        {groups.map((g) => (
          <div key={g.group} className="ch-ref-grp">
            <h3>{i18n._(g.title)}</h3>
            {g.rows.map((row) => (topic ? row.forms : [row.example]).map((form) => (
              <button key={form} type="button" className={`ch-ref-row${row.here ? '' : ' away'}`} title={form} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(form)}>
                <span className="ch-code" dir="ltr">{form}</span>
                <span className="gloss">
                  {i18n._(row.gloss)}
                  {!row.here && <span className="on"><span className="sep" aria-hidden="true">·</span>{where(row)}</span>}
                </span>
              </button>
            )))}
          </div>
        ))}
      </div>
  )
}
