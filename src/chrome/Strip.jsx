import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { strip, wordFor, isRoom } from '../shell/boards'

// The board strip: every board in its fixed order, open ones underlined, and
// what each shows after its title (editing spec, "Focus"). A click opens the
// board or points the bar at it, and never closes it (C102 to C105, Part 7).
//
// It ends with "calm: off" and "focus: off", marginalia both (stage 14,
// pieces 1 and 2; C253; C255 (d); C292): a click on either turns it on or off
// at once, as calm:, calm:off, focus: and focus:off do, and says what ran
// under the bar. focus opens no menu (C292; Stefan, 5 November: "let's not
// have focus open a menu"): a set of boards is typed, focus:room collection.
//
// On a phone (piece 5; C261 (c)) it is how you move between boards, one
// shown at a time: each open room has its own entry, by its chat's number,
// and focus is not offered.

/**
 * @param {{ arrangement: object, onPick: (board: string) => void, onRun?: (line: string) => void,
 *   phone?: { rooms: { board: string, num: number|null }[] }|null }} props
 */
export default function Strip({ arrangement, onPick, onRun = null, calm = false, phone = null, globe = null }) {
  const { i18n } = useLingui()
  const on = Boolean(arrangement.focus)
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
          // The command a click is the same as, on hover (C286 (d)).
          title={i18n._(COPY.shell.focusRuns, { command: isRoom(b.board) ? 'room:' : `open:${wordFor(b.board)}` })}
          onClick={() => onPick(b.board, Boolean(b.exact))}
        >
          <span dir="ltr">{b.title}</span>
          {b.context != null && <span className="ch-ctx">{String(b.context)}</span>}
        </button>
      ))}
      {onRun && (
        <span className="ch-marg ch-scalm">
          <button type="button" className={calm ? 'on' : undefined} aria-pressed={calm}
            title={i18n._(COPY.shell.calmTitle, { command: calm ? 'calm:off' : 'calm:' })}
            onClick={() => onRun(calm ? 'calm:off' : 'calm:')}>
            {i18n._(calm ? COPY.shell.calmOn : COPY.shell.calmOff)}
          </button>
        </span>
      )}
      {onRun && !phone && (
        <span className="ch-marg ch-sfocus">
          <button type="button" className={on ? 'on' : undefined} aria-pressed={on}
            title={i18n._(COPY.shell.focusTitle, { command: on ? 'focus:off' : 'focus:' })}
            onClick={() => onRun(on ? 'focus:off' : 'focus:')}>
            {i18n._(on ? COPY.shell.focusOn : COPY.shell.focusOff)}
          </button>
        </span>
      )}
      {/* The language, at the end of the header (1 November). */}
      {globe && <span className="ch-sglobe">{globe}</span>}
    </nav>
  )
}
