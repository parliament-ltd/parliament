import { useMemo } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { wordDiff, diffCounts } from '../lib/wordDiff'

// compare:218 231 (stage 6, piece 7; C145 (i); collection board v3): two
// notes, keywords or quotes side by side under the bar, as inspect: shows
// one, with what changed word by word. Worked out here: nothing is sent.
// Everything in it is someone's words or a model's, so it is drawn as text.

/** @param {{ a: object, b: object }} props two rows from almanacRows.js */
export default function Compare({ a, b }) {
  const { i18n } = useLingui()
  const parts = useMemo(() => wordDiff(a.text, b.text), [a.text, b.text])
  const counts = diffCounts(parts)
  const name = (row) => i18n._(COPY.collections.card, { kind: row.kind, num: row.num })
  return (
    <section className="ch-inspect ch-compare" aria-label={i18n._(COPY.compare.label, { a: name(a), b: name(b) })}>
      <div className="ch-compare-sides">
        {[a, b].map((row) => (
          <div key={row.num}>
            <div className="ch-inspect-head">
              <span className={`ch-kpill k-${row.kind}`}>{i18n._(COPY.kinds[row.kind])}</span>
              <span className="c-id">{row.num}</span>
            </div>
            <blockquote dir="auto">{row.text}</blockquote>
          </div>
        ))}
      </div>
      <p className="ch-compare-diff" dir="auto">
        {parts.map((p, i) => (p.op === 'same'
          ? <span key={i}>{p.text}</span>
          : p.op === 'gone' ? <del key={i}>{p.text}</del> : <ins key={i}>{p.text}</ins>))}
      </p>
      <p className="ch-marg">
        {counts.gone || counts.added ? i18n._(COPY.compare.counts, counts) : i18n._(COPY.compare.same)}
        {' · '}
        {i18n._(COPY.compare.legend, { a: a.num, b: b.num })}
      </p>
      <p className="ch-marg ch-inspect-foot">{i18n._(COPY.compare.close)}</p>
    </section>
  )
}
