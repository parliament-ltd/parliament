import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { strip, wordFor, isRoom } from '../shell/boards'
import { FOCUS_BOARDS } from '../shell/arrangement'

// The board strip: every board in its fixed order, open ones underlined, and
// what each shows after its title (editing spec, "Focus"). A click opens the
// board or points the bar at it, and never closes it (C102 to C105, Part 7).
//
// It ends with "focus: off ▾" (stage 14, piece 1; C253): a click on "focus"
// turns it on or off at once, as focus: and focus:off do; the caret opens a
// picker of the boards with numbered ticks, the numbers their order left to
// right, which writes focus:room collection into the bar for Enter. Before
// it, "calm: off" turns calm on or off at once (piece 2; C255 (d)).
//
// On a phone (piece 5; C261 (c)) it is how you move between boards, one
// shown at a time: each open room has its own entry, by its chat's number,
// and focus is not offered.

/**
 * @param {{ arrangement: object, onPick: (board: string) => void,
 *   focus?: { set: string[]|null }|null, onRun?: (line: string) => void, onWrite?: (text: string) => void,
 *   phone?: { rooms: { board: string, num: number|null }[] }|null }} props
 */
export default function Strip({ arrangement, onPick, focus = null, onRun = null, onWrite = null, calm = false, phone = null }) {
  const { i18n } = useLingui()
  const [picking, setPicking] = useState(false)
  const [ticked, setTicked] = useState([])
  const on = Boolean(arrangement.focus)
  const boardWord = (b) => (b === 'room' ? i18n._(COPY.enter.focusTheChat) : i18n._(COPY.boards[b]))
  const open = () => {
    setTicked(Array.isArray(focus?.set) ? focus.set.filter((b) => FOCUS_BOARDS.includes(b)) : [])
    setPicking((p) => !p)
  }
  const tick = (b) => {
    const next = ticked.includes(b) ? ticked.filter((x) => x !== b) : [...ticked, b]
    setTicked(next)
    if (next.length) onWrite?.(`>focus:${next.map(wordFor).join(' ')}`)
  }
  return (
    <nav className="ch-strip" aria-label={i18n._(COPY.shell.strip)}>
      {strip(arrangement).flatMap((b) => (phone && b.board === 'room' && phone.rooms.length
        ? phone.rooms.map((r) => ({ board: r.board, title: b.title, context: r.num, here: true, exact: true, addressed: arrangement.addressed === r.board }))
        : [b])).map((b) => (
        <button
          key={b.board}
          type="button"
          className={`ch-btitle${b.here ? ' here' : ''}`}
          aria-current={b.addressed ? 'true' : undefined}
          aria-label={[i18n._(COPY.boards[isRoom(b.board) ? 'room' : b.board]), b.context].filter((x) => x != null).join(' ')}
          onClick={() => onPick(b.board, Boolean(b.exact))}
        >
          <span dir="ltr">{b.title}</span>
          {b.context != null && <span className="ch-ctx">{String(b.context)}</span>}
        </button>
      ))}
      {onRun && (
        <span className="ch-marg ch-scalm">
          <button type="button" className={calm ? 'on' : undefined} aria-pressed={calm}
            title={i18n._(COPY.shell.focusRuns, { command: calm ? 'calm:off' : 'calm:' })}
            onClick={() => onRun(calm ? 'calm:off' : 'calm:')}>
            {i18n._(calm ? COPY.shell.calmOn : COPY.shell.calmOff)}
          </button>
        </span>
      )}
      {onRun && !phone && (
        <span className="ch-marg ch-sfocus">
          <button type="button" className={on ? 'on' : undefined} aria-pressed={on}
            title={i18n._(COPY.shell.focusRuns, { command: on ? 'focus:off' : 'focus:' })}
            onClick={() => onRun(on ? 'focus:off' : 'focus:')}>
            {i18n._(on ? COPY.shell.focusOn : COPY.shell.focusOff)}
          </button>
          <button type="button" className="car" aria-expanded={picking} aria-label={i18n._(COPY.shell.focusPick)} onClick={open}>▾</button>
          {picking && (
            <span className="ch-fpick" role="group" aria-label={i18n._(COPY.shell.focusPick)}>
              <span className="k">{i18n._(COPY.shell.focusPickHead)}</span>
              {FOCUS_BOARDS.map((b) => {
                const n = ticked.indexOf(b) + 1
                return (
                  <button key={b} type="button" role="checkbox" aria-checked={n > 0} className={n ? 'on' : undefined} onClick={() => tick(b)}>
                    <span className="n" aria-hidden="true">{n || ''}</span>{boardWord(b)}
                  </button>
                )
              })}
            </span>
          )}
        </span>
      )}
    </nav>
  )
}
