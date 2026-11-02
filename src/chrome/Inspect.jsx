import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { roomLabel } from './say'
import { dayOf, agoOf } from './when'

// inspect:<number>: one thing in detail, under the bar, wherever you are
// (arrangements spec §4, "inspect: replaces the inspector"; Almanac v30's
// peek). Read-only. Escape closes it. Everything in it is someone's words
// or a model's, so it is drawn as text.

/**
 * @param {{ row: object, onPick?: (form: string) => void }} props a row from
 *   almanacRows.js, or a list: { list: 'highlights', chatNum, rows } (C287)
 */
export default function Inspect({ row, onPick = null }) {
  const { i18n } = useLingui()
  if (row.list) return <InspectList list={row} onPick={onPick} />
  const quoted = row.kind === 'term' || row.kind === 'quote'
  const facts = [
    row.room ? roomLabel(i18n, row.room) : null,
    row.kind === 'docket' ? i18n._(COPY.counts.branches, { count: row.branches }) : null,
    row.createdAt ? i18n._(COPY.inspect.created, { day: dayOf(i18n, row.createdAt) }) : null,
    row.activeAt ? i18n._(COPY.inspect.active, { ago: agoOf(i18n, row.activeAt) }) : null,
    row.pinned ? i18n._(COPY.almanac.pinned) : null,
    row.erasedFrom != null ? i18n._(COPY.almanac.erasedFrom, { num: row.erasedFrom }) : null,
  ].filter(Boolean)
  const opens = row.kind === 'chat' || (row.kind === 'docket' && row.chatId)
  return (
    <section className="ch-inspect" aria-label={i18n._(COPY.inspect.label, { num: row.num })}>
      <div className="ch-inspect-head">
        <span className={`ch-kpill k-${row.kind}`}>{i18n._(COPY.kinds[row.kind])}</span>
        <span className="c-id">{row.num}</span>
        {row.tags.length > 0 && (
          <span className="ch-inspect-tags">{row.tags.map((t) => <span key={t} className="ch-tag" dir="auto">{t}</span>)}</span>
        )}
      </div>
      {quoted
        ? <blockquote dir="auto">{row.text}</blockquote>
        : <h3 dir="auto">{row.title || i18n._(COPY.almanac.untitled)}</h3>}
      {row.summary && <p dir="auto">{row.summary}</p>}
      {row.kind === 'note' && row.text && row.text !== row.title && <p dir="auto">{row.text}</p>}
      {facts.length > 0 && <p className="ch-marg">{facts.join(' · ')}</p>}
      <p className="ch-marg ch-inspect-foot">
        {opens ? i18n._(COPY.inspect.openChat, { num: row.num }) : i18n._(COPY.inspect.close)}
      </p>
    </section>
  )
}

/** inspect:highlights (C287): the highlights of the room's chat, each a click from jump: to its place. */
function InspectList({ list, onPick }) {
  const { i18n } = useLingui()
  return (
    <section className="ch-inspect" aria-label={i18n._(COPY.inspect.highlights, { num: list.chatNum ?? '' })}>
      <div className="ch-inspect-head">
        <h3>{i18n._(COPY.inspect.highlights, { num: list.chatNum ?? '' })}</h3>
      </div>
      <ol className="ch-inspect-list">
        {list.rows.map((r) => (
          <li key={r.num}>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick?.(`jump:${r.num}`)}>
              <span className="c-id">{r.num}</span>
              <span dir="auto">{r.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="ch-marg ch-inspect-foot">{i18n._(COPY.inspect.listFoot)}</p>
    </section>
  )
}
