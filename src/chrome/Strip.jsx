import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { strip, wordFor, isRoom } from '../shell/boards'
import BirdsMark from './BirdsMark'

// The board strip: every board in its fixed order, open ones underlined, and
// what each shows after its title (editing spec, "Focus"). A click opens the
// board or points the bar at it, and never closes it (C102 to C105, Part 7).
//
// It ends with "markup ▾" and "focus: off", marginalia both. markup opens
// the markup menu under itself, as the globe opens the languages (C301 (b);
// it took the place of "calm: off", C255 (d)). A click on focus turns it on
// or off at once, as focus: and focus:off do, and says what ran under the
// bar. focus opens no menu (C292; Stefan, 5 November: "let's not have focus
// open a menu"): a set of boards is typed, focus:room collection.
//
// It starts with the birds, small, and after the boards come import: and
// tour:, each run by a click as focus is, and said under the bar (C302 (e);
// Stefan, 15 November: "let's add import: to the top row next to plan:,
// let's also add tour: and we can add the small bird logo to the top left").
//
// On a phone (piece 5; C261 (c)) it is how you move between boards, one
// shown at a time: each open room has its own entry, by its chat's number,
// and focus is not offered.

/**
 * @param {{ arrangement: object, onPick: (board: string) => void, onRun?: (line: string) => void,
 *   phone?: { rooms: { board: string, num: number|null }[] }|null }} props
 */
/**
 * markup: { open, onOpen(from) }: whether the markup menu is open, and
 * opening it under the word that was clicked (C301 (b)).
 */
export default function Strip({ arrangement, onPick, onRun = null, markup = null, phone = null, globe = null, alarm = null }) {
  const { i18n } = useLingui()
  const on = Boolean(arrangement.focus)
  // The birds fold the boards away and bring them back (C301 (f); Stefan,
  // 16 November: "when a user selects 'Focus: On' that 'Room:' 'Collection:'
  // etc. slide to the left. Clicking the bird icon opens the top nav to the
  // right ... Clicking the bird icon again hides the menu"). Focus folds
  // them and focus:off brings them back; a click on the birds does either.
  // Kept in this tab only. On a phone the strip is how you move, so it stays.
  const [folded, setFolded] = useState(on)
  // Focus turning on or off folds or opens them, once, as it changes.
  const [wasOn, setWasOn] = useState(on)
  if (wasOn !== on) {
    setWasOn(on)
    setFolded(on)
  }
  const foldable = !phone
  const hidden = foldable && folded
  return (
    <nav className={`ch-strip${hidden ? ' folded' : ''}`} aria-label={i18n._(COPY.shell.strip)}>
      {foldable
        ? (
          <button type="button" className="ch-sbirds-b" aria-expanded={!folded} aria-controls="ch-sboards"
            title={i18n._(folded ? COPY.shell.boardsShow : COPY.shell.boardsHide)}
            aria-label={i18n._(folded ? COPY.shell.boardsShow : COPY.shell.boardsHide)}
            onClick={() => setFolded((f) => !f)}>
            <BirdsMark className="ch-sbirds" />
          </button>
        )
        : <BirdsMark className="ch-sbirds" />}
      <span id="ch-sboards" className="ch-sboards" inert={hidden || undefined}>
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
      {/* Written as the boards are, capitalised (Stefan, 16 November); the
          commands they run stay English. */}
      {onRun && [['import:', 'Import:'], ['tour:', 'Tour:']].map(([command, shown]) => (
        <button key={command} type="button" className="ch-btitle ch-scmd" dir="ltr" title={i18n._(COPY.shell.focusRuns, { command })} onClick={() => onRun(command)}>
          {shown}
        </button>
      ))}
      {/* The next alarm, while any is set (C303 (a)). */}
      {alarm}
      </span>
      {markup && (
        <span className="ch-marg ch-smarkup">
          <button type="button" className={markup.open ? 'on' : undefined} aria-expanded={markup.open} aria-haspopup="true"
            title={i18n._(COPY.shell.markupTitle, { command: 'markup:' })}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => markup.onOpen(e.currentTarget)}>
            {i18n._(COPY.shell.markupMenu)} <span aria-hidden="true">▾</span>
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
