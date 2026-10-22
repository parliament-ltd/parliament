import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { roomLabel } from './say'
import { dayOf, agoOf } from './when'

// inspect:<number>: one thing in detail, under the bar, wherever you are
// (arrangements spec §4, "inspect: replaces the inspector"; Almanac v30's
// peek). Read-only. Escape closes it. Everything in it is someone's words
// or a model's, so it is drawn as text.

/** @param {{ row: object }} props a row from almanacRows.js */
export default function Inspect({ row }) {
  const { i18n } = useLingui()
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
