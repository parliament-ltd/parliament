import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { roomLabel } from './say'
import { dayOf, agoOf } from './when'
import { useBand } from './useNarrower'

// Records (refactor-plan.md, stage 5, piece 3, and stage 6; Almanac v30):
// everything made, one row each with its number, pinned rows first. A click
// on a row writes open:<number> in the bar, and Enter opens it, so the bar
// stays the one actor (C125).
//
// The search and filters in force read as one line at the top (C132 (c)),
// with how many rows they leave. A click on one removes it at once, as
// clear:<its name> does from the bar; it only changes what is shown.
//
// The columns follow the board's own width: all of v30's at full width,
// fewer as it narrows. The id column is always there (almanac spec §3).

// Commands, which stay English.
const CLEAR = (k) => `clear:${k}`

const WIDE = 720
const MEDIUM = 460
const COLUMNS = [
  ['type', 'id', 'title', 'active'],
  ['type', 'id', 'title', 'room', 'active'],
  ['type', 'id', 'title', 'room', 'tags', 'created', 'active'],
]
const HEAD = {
  type: COPY.almanac.colType, id: COPY.almanac.colId, title: COPY.almanac.colTitle, room: COPY.almanac.colRoom,
  tags: COPY.almanac.colTags, created: COPY.almanac.colCreated, active: COPY.almanac.colActive,
}

function Cell({ column, row }) {
  const { i18n } = useLingui()
  switch (column) {
    case 'type':
      return <td className="c-type"><span className={`ch-kpill k-${row.kind}`}>{i18n._(COPY.kinds[row.kind])}</span></td>
    case 'id':
      return <td className="c-id">{row.num}</td>
    case 'title': {
      const quoted = row.kind === 'term' || row.kind === 'quote'
      const sub = row.kind === 'docket' ? i18n._(COPY.counts.branches, { count: row.branches }) : row.summary
      return (
        <td className="c-title">
          {quoted
            ? <div className="t-q" dir="auto">{row.text}</div>
            : <div className="t-t" dir="auto">{row.title || i18n._(COPY.almanac.untitled)}</div>}
          {sub && <div className="t-s" dir="auto">{sub}</div>}
          {row.pinned && <div className="t-mk">{i18n._(COPY.almanac.pinned)}</div>}
        </td>
      )
    }
    case 'room':
      return <td className="c-room" dir="auto">{row.room ? roomLabel(i18n, row.room) : ''}</td>
    case 'tags':
      return <td className="c-tags">{row.tags.map((t) => <span key={t} className="ch-tag" dir="auto">{t}</span>)}</td>
    case 'created':
      return <td className="c-when">{dayOf(i18n, row.createdAt)}</td>
    default:
      return <td className="c-when">{agoOf(i18n, row.activeAt)}</td>
  }
}

/** The search and filters in force, each a click that removes it. */
function InForce({ search, line, count, onClear }) {
  const { i18n } = useLingui()
  const item = (k, label, isCommand) => (
    <button key={`${k}:${label}`} type="button" className="ch-alm-f" title={i18n._(COPY.almanac.removes, { command: CLEAR(k) })} onClick={() => onClear(k)}>
      <span dir={isCommand ? 'ltr' : 'auto'}>{label}</span>
      <span className="x" aria-hidden="true">{'×'}</span>
    </button>
  )
  return (
    <div className="ch-alm-in ch-marg" role="group" aria-label={i18n._(COPY.almanac.filtersLabel)}>
      {search && item('search', i18n._(COPY.almanac.searchFor, { text: search }), false)}
      {line.map((f) => item(f.k, f.text, true))}
      <span className="ch-alm-count">{i18n._(COPY.almanac.shown, { count })}</span>
      <button type="button" className="ch-alm-clear" onClick={() => onClear('filters')}>{CLEAR('filters')}</button>
    </div>
  )
}

/**
 * @param {{ rows: object[]|null, filtered?: { search: string, line: Array<{ k: string, text: string }> }|null,
 *   addressed: boolean, onAddress: (board: string) => void, onWrite: (text: string) => void, onClear?: (k: string) => void }} props
 *   rows: the rows the view shows (recordsFilter.js), null while they are read; filtered: the search and
 *   filters in force, null at rest; onClear: removes one kind, or 'filters' for all of them
 */
export default function AlmanacBoard({ rows, filtered = null, addressed, onAddress, onWrite, onClear }) {
  const { i18n } = useLingui()
  const [ref, band] = useBand([MEDIUM, WIDE])
  const columns = COLUMNS[band]
  const open = (row) => onWrite(`>open:${row.num}`)

  let body
  if (rows === null) body = <p className="ch-marg ch-alm-note">{i18n._(COPY.almanac.loading)}</p>
  else if (!rows.length) body = <p className="ch-marg ch-alm-note">{i18n._(filtered ? COPY.almanac.noneMatch : COPY.almanac.empty)}</p>
  else {
    body = (
      <table className="ch-atable">
        <thead>
          <tr>{columns.map((c) => <th key={c} scope="col" className={`c-${c}`}>{i18n._(HEAD[c])}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.kind}:${row.id}`}
              tabIndex={0}
              title={i18n._(COPY.almanac.rowHelp, { num: row.num })}
              onClick={() => open(row)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); open(row) } }}
            >
              {columns.map((c) => <Cell key={c} column={c} row={row} />)}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <article
      className={`ch-card ch-almanac${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('almanac')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.almanac)}</h2>
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      {filtered && rows && <InForce search={filtered.search} line={filtered.line} count={rows.length} onClear={(k) => onClear?.(k)} />}
      <div className="ch-alm" ref={ref}>{body}</div>
    </article>
  )
}
