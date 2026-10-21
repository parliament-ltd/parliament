import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { reference } from '../commands/registry'

// The ? reference: every command that works on the board the bar points at,
// grouped, generated from the verb list (docket spec §6). `?bar` shows one
// verb. It opens under the field, where the api: panel will open too, and
// Escape closes it. A click writes the example into the field for Enter.

export default function Reference({ board, topic, onPick }) {
  const { i18n } = useLingui()
  const groups = reference(board)
    .map((g) => ({ ...g, rows: topic ? g.rows.filter((r) => r.verb === topic) : g.rows }))
    .filter((g) => g.rows.length)
  return (
    <section className="ch-ref" aria-label={i18n._(COPY.shell.referenceName)}>
      <div className="ch-ref-head"><span className="ch-marg">{i18n._(COPY.shell.referenceClose)}</span></div>
      {groups.map((g) => (
        <div key={g.group}>
          <h3>{i18n._(g.title)}</h3>
          {g.rows.map((row) => (topic ? row.forms : [row.example]).map((form) => (
            <button key={form} type="button" className="ch-ref-row" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(form)}>
              <span className="ch-code" dir="ltr">{form}</span>
              <span className="gloss">{i18n._(row.gloss)}</span>
            </button>
          )))}
        </div>
      ))}
    </section>
  )
}
