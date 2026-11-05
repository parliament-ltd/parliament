import { useMemo } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { wordDiff, diffCounts, sharedShare, wordsFound } from '../lib/wordDiff'
import { COMPARE_READS } from '../lib/cardActs'

// compare:218 231 (stage 6, piece 7; C145 (i); collection board v3): two
// notes, keywords or quotes side by side under the bar, as inspect: shows
// one, with what changed word by word. compare:201a 201b (C289): the last
// reply of each of two branches, the same way. Worked out here: nothing is
// sent to a model.
//
// Words, not meaning (C290): the panel says so at the top, and plainly when
// the two share few words, offering compare: … meaning, which asks the
// helper how they differ. Its answer is shown below, labelled as the
// model's reading. Everything in the panel is someone's words or a model's,
// so it is drawn as text.

// Below this share of words in common, and with at least this many words,
// the marks say little about how the two differ.
const FEW_SHARED = 1 / 3
const FEW_SHARED_MIN = 8

/**
 * @param {{ a: object, b: object, meaning?: { model: string, state: 'asking'|'done'|'failed', text?: string, cut?: string[] }|null,
 *   onWrite?: (form: string) => void }} props two rows from almanacRows.js, or two replies
 *   ({ kind: 'reply', address, who, text }, cardActs.js replySide); meaning, a model's reading of them (C290)
 */
export default function Compare({ a, b, meaning = null, onWrite = null }) {
  const { i18n } = useLingui()
  const parts = useMemo(() => wordDiff(a.text, b.text), [a.text, b.text])
  const counts = diffCounts(parts)
  const reply = (row) => row.kind === 'reply'
  const name = (row) => (reply(row) ? i18n._(COPY.compare.reply, { address: row.address }) : i18n._(COPY.collections.card, { kind: row.kind, num: row.num }))
  const id = (row) => (reply(row) ? row.address : row.num)
  const command = `compare:${id(a)} ${id(b)} meaning`
  const write = onWrite && !meaning
    ? <button type="button" className="ch-compare-ask" title={i18n._(COPY.compare.writes, { command })} onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(command)}>{command}</button>
    : null
  const few = !meaning && sharedShare(counts) < FEW_SHARED && Math.max(counts.same + counts.gone, counts.same + counts.added) >= FEW_SHARED_MIN
  return (
    <section className="ch-inspect ch-compare" aria-label={i18n._(COPY.compare.label, { a: name(a), b: name(b) })}>
      <p className="ch-marg ch-compare-what">
        {i18n._(COPY.compare.wordsOnly)}
        {write && <>{' · '}{write}</>}
      </p>
      {(!wordsFound(a.text) || !wordsFound(b.text)) && <p className="ch-marg">{i18n._(COPY.compare.wholeSentences)}</p>}
      <div className="ch-compare-sides">
        {[a, b].map((row) => (
          <div key={id(row)}>
            <div className="ch-inspect-head">
              <span className={`ch-kpill k-${reply(row) ? 'chat' : row.kind}`}>{reply(row) ? i18n._(COPY.compare.replyKind) : i18n._(COPY.kinds[row.kind])}</span>
              <span className="c-id">{id(row)}</span>
              {reply(row) && row.who && <span className="ch-marg" dir="auto">{row.who}</span>}
            </div>
            {String(row.text ?? '').trim() ? <blockquote dir="auto">{row.text}</blockquote> : <p className="ch-marg">{i18n._(COPY.compare.empty)}</p>}
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
      {few && (
        <p className="ch-compare-few">
          {i18n._(COPY.compare.fewShared)}
          {write && <>{' '}{write}</>}
        </p>
      )}
      {meaning && (
        <div className="ch-compare-meaning" aria-live="polite">
          <h3>{i18n._(COPY.compare.meaningHead, { model: meaning.model })}</h3>
          {meaning.state === 'asking' && <p className="ch-marg">{i18n._(COPY.compare.meaningAsking, { model: meaning.model })}</p>}
          {meaning.state === 'failed' && <p className="ch-marg">{i18n._(COPY.compare.meaningFailed, { model: meaning.model })}</p>}
          {meaning.state === 'done' && (
            <>
              <p className="ch-compare-reading" dir="auto">{meaning.text}</p>
              {(meaning.cut ?? []).map((address) => (
                <p key={address} className="ch-marg">{i18n._(COPY.compare.meaningCut, { address, count: COMPARE_READS })}</p>
              ))}
              <p className="ch-marg">{i18n._(COPY.compare.meaningCheck)}</p>
            </>
          )}
        </div>
      )}
      <p className="ch-marg ch-inspect-foot">{meaning ? i18n._(COPY.compare.closeMeaning, { model: meaning.model }) : i18n._(COPY.compare.close)}</p>
    </section>
  )
}
