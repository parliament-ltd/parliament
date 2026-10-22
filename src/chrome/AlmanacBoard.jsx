import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { roomLabel } from './say'
import { dayOf, agoOf } from './when'
import { useBand } from './useNarrower'
import { rowRange, seenPart } from './rowWindow'

// Records (refactor-plan.md, stage 5, piece 3, and stage 6; Almanac v30):
// everything made, one row each with its number, pinned rows first. A click
// on a row writes open:<number> in the bar, and Enter opens it, so the bar
// stays the one actor (C125).
//
// At the top, one line each, shown only when there is something to show:
// the saved searches, a click showing one as open:"…" does (C140); and the
// search and filters in force, with how many rows they leave, a click on one
// removing it as clear:<its name> does (C132 (c)). Both only change what is
// shown, so they act at once.
//
// The columns are the ones the person keeps (cols:, C141), less what the
// board's own width cannot fit: all of v30's at full width, fewer as it
// narrows. The id and the title are always there (almanac spec §3).
//
// Only the rows in view, and about a screen either side, are drawn (C142);
// the rest are blank space of the height they will take.

// Commands, which stay English.
const CLEAR = (k) => `clear:${k}`
const SAVE = 'save:'

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
const keyOf = (row) => `${row.kind}:${row.id}`
// Before the first measure: enough rows for a tall window.
const FIRST = { start: 0, end: 40, before: 0, after: 0 }

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
          {row.erasedFrom != null && <div className="t-mk">{i18n._(COPY.almanac.erasedFrom, { num: row.erasedFrom })}</div>}
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

/** The saved searches, each a click that shows it (C140 (a)). */
function Saved({ saved, current, onOpen }) {
  const { i18n } = useLingui()
  return (
    <div className="ch-alm-saved ch-marg" role="group" aria-label={i18n._(COPY.almanac.saved)}>
      <span className="k">{i18n._(COPY.almanac.saved)}</span>
      {saved.map((s) => (
        <button
          key={s.id}
          type="button"
          className={s.id === current ? 'on' : undefined}
          aria-current={s.id === current ? 'true' : undefined}
          title={i18n._(COPY.almanac.openSavedHelp, { name: s.name })}
          onClick={() => onOpen(s)}
        >
          <span dir="auto">{s.name}</span>
        </button>
      ))}
    </div>
  )
}

/** The search and filters in force, each a click that removes it. */
function InForce({ search, line, count, saved, onClear, onSave }) {
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
      {!saved && <button type="button" className="ch-alm-cmd" title={i18n._(COPY.almanac.saveHelp)} onClick={onSave}>{SAVE}</button>}
      <button type="button" className="ch-alm-cmd" onClick={() => onClear('filters')}>{CLEAR('filters')}</button>
    </div>
  )
}

/**
 * Draws only the rows in view and a screen either side (C142). Heights are
 * measured as rows are drawn; until then they are guessed.
 */
function useRowWindow(rows) {
  const body = useRef(null) // the table's body, where rows are drawn
  const heights = useRef(new Map())
  const [range, setRange] = useState(FIRST)
  const rowsNow = useRef(rows)
  // The rows as last drawn, for placing from a scroll; kept before the other effects run.
  useLayoutEffect(() => { rowsNow.current = rows }, [rows])
  const drawn = Boolean(rows?.length) // the table, and its body, are there

  const place = useCallback(() => {
    const el = body.current
    const list = rowsNow.current ?? []
    if (!el) return
    const { top, bottom } = seenPart(el)
    const next = rowRange(list.map((r) => heights.current.get(keyOf(r))), top, bottom, { overscan: Math.max(bottom - top, 400) })
    setRange((was) => (was.start === next.start && was.end === next.end && was.before === next.before && was.after === next.after ? was : next))
  }, [])

  // Scrolling anywhere above it, and the window changing size, move the view.
  useEffect(() => {
    const el = body.current
    if (!el) return undefined
    const doc = el.ownerDocument
    const win = doc.defaultView
    // Placing is a little arithmetic, and draws only when the rows change.
    doc.addEventListener('scroll', place, { capture: true, passive: true })
    win.addEventListener('resize', place)
    return () => {
      doc.removeEventListener('scroll', place, { capture: true })
      win.removeEventListener('resize', place)
    }
  }, [place, drawn])

  // After drawing: measure what was drawn, and place again if anything moved.
  useLayoutEffect(() => {
    const el = body.current
    if (!el) return
    let changed = false
    for (const tr of el.querySelectorAll('tr[data-k]')) {
      const h = tr.getBoundingClientRect().height
      if (h && heights.current.get(tr.dataset.k) !== h) { heights.current.set(tr.dataset.k, h); changed = true }
    }
    if (changed || range === FIRST) place()
  })

  // New rows (a search, a filter): place again.
  useLayoutEffect(() => { place() }, [rows, place])
  return [body, range]
}

/**
 * @param {{ rows: object[]|null, filtered?: { search: string, line: Array<{ k: string, text: string }> }|null,
 *   columns?: string[], saved?: object[], currentSaved?: string|null,
 *   addressed: boolean, onAddress: (board: string) => void, onWrite: (text: string) => void,
 *   onClear?: (k: string) => void, onOpenSaved?: (saved: object) => void }} props
 *   rows: the rows the view shows (recordsFilter.js), null while they are read; filtered: the search and
 *   filters in force, null at rest; columns: the ones the person keeps (cols:); saved: the saved searches;
 *   currentSaved: the id of the one on screen
 */
export default function AlmanacBoard({ rows, filtered = null, columns: kept = null, saved = [], currentSaved = null, addressed, onAddress, onWrite, onClear, onOpenSaved, backup = null, onBackupLater }) {
  const { i18n } = useLingui()
  const [ref, band] = useBand([MEDIUM, WIDE])
  const columns = COLUMNS[band].filter((c) => !kept || kept.includes(c))
  const open = (row) => onWrite(`>open:${row.num}`)
  const [body, range] = useRowWindow(rows)

  let table
  if (rows === null) table = <p className="ch-marg ch-alm-note">{i18n._(COPY.almanac.loading)}</p>
  else if (!rows.length) table = <p className="ch-marg ch-alm-note">{i18n._(filtered ? COPY.almanac.noneMatch : COPY.almanac.empty)}</p>
  else {
    const start = Math.min(range.start, rows.length)
    const end = Math.min(Math.max(range.end, start), rows.length)
    const gap = (h, key) => (h > 0 ? <tr key={key} className="ch-gap" aria-hidden="true" style={{ height: h }}><td colSpan={columns.length} /></tr> : null)
    table = (
      <table className="ch-atable" aria-rowcount={rows.length + 1}>
        <thead>
          <tr aria-rowindex={1}>{columns.map((c) => <th key={c} scope="col" className={`c-${c}`}>{i18n._(HEAD[c])}</th>)}</tr>
        </thead>
        <tbody ref={body}>
          {gap(range.before, 'before')}
          {rows.slice(start, end).map((row, i) => (
            <tr
              key={keyOf(row)}
              data-k={keyOf(row)}
              data-num={row.num}
              aria-rowindex={start + i + 2}
              tabIndex={0}
              title={i18n._(COPY.almanac.rowHelp, { num: row.num })}
              onClick={() => open(row)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); open(row) } }}
            >
              {columns.map((c) => <Cell key={c} column={c} row={row} />)}
            </tr>
          ))}
          {gap(range.after, 'after')}
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
      {backup && (
        // The backup reminder: one line, in ink, only when it is due (C146 (a), C94).
        <p className="ch-marg ch-alm-backup" role="note">
          <span>{backup.atRisk ? i18n._(COPY.almanac.backupAtRisk) : backup.days == null ? i18n._(COPY.almanac.backupNever) : i18n._(COPY.almanac.backupDays, { days: backup.days })}</span>
          <a href="/settings">{i18n._(COPY.welcome.keepBackup, { board: i18n._(COPY.boards.settings) })}</a>
          <button type="button" onClick={() => onBackupLater?.()}>{i18n._(COPY.almanac.backupLater)}</button>
        </p>
      )}
      {saved.length > 0 && <Saved saved={saved} current={currentSaved} onOpen={(s) => onOpenSaved?.(s)} />}
      {filtered && rows && (
        <InForce
          search={filtered.search}
          line={filtered.line}
          count={rows.length}
          saved={Boolean(currentSaved)}
          onClear={(k) => onClear?.(k)}
          onSave={() => onWrite(`>${SAVE}"`)}
        />
      )}
      <div className="ch-alm" ref={ref}>{table}</div>
    </article>
  )
}
