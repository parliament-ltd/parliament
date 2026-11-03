import { useMemo } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { wordDiff, diffCounts } from '../lib/wordDiff'

// compare:218 231 (stage 6, piece 7; C145 (i); collection board v3): two
// notes, keywords or quotes side by side under the bar, as inspect: shows
// one, with what changed word by word. compare:201a 201b (C289): the last
// reply of each of two branches, the same way. Worked out here: nothing is
// sent. Everything in it is someone's words or a model's, so it is drawn as
// text.

/**
 * @param {{ a: object, b: object }} props two rows from almanacRows.js, or two
 *   replies ({ kind: 'reply', address, who, text }, cardActs.js replySide)
 */
export default function Compare({ a, b }) {
  const { i18n } = useLingui()
  const parts = useMemo(() => wordDiff(a.text, b.text), [a.text, b.text])
  const counts = diffCounts(parts)
  const reply = (row) => row.kind === 'reply'
  const name = (row) => (reply(row) ? i18n._(COPY.compare.reply, { address: row.address }) : i18n._(COPY.collections.card, { kind: row.kind, num: row.num }))
  const id = (row) => (reply(row) ? row.address : row.num)
  return (
    <section className="ch-inspect ch-compare" aria-label={i18n._(COPY.compare.label, { a: name(a), b: name(b) })}>
      <div className="ch-compare-sides">
        {[a, b].map((row) => (
          <div key={id(row)}>
            <div className="ch-inspect-head">
              <span className={`ch-kpill k-${reply(row) ? 'chat' : row.kind}`}>{reply(row) ? i18n._(COPY.compare.replyKind) : i18n._(COPY.kinds[row.kind])}</span>
              <span className="c-id">{id(row)}</span>
              {reply(row) && row.who && <span className="ch-marg" dir="auto">{row.who}</span>}
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
        {i18n._(COPY.compare.legend, { a: id(a), b: id(b) })}
      </p>
      <p className="ch-marg ch-inspect-foot">{i18n._(COPY.compare.close)}</p>
    </section>
  )
}
