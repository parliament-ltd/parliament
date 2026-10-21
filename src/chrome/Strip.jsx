import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { strip } from '../shell/boards'

// The board strip: every board in its fixed order, open ones underlined, and
// what each shows after its title (editing spec, "Focus"). A click opens the
// board or points the bar at it, and never closes it (C102 to C105, Part 7).

export default function Strip({ arrangement, onPick }) {
  const { i18n } = useLingui()
  return (
    <nav className="ch-strip" aria-label={i18n._(COPY.shell.strip)}>
      {strip(arrangement).map((b) => (
        <button
          key={b.board}
          type="button"
          className={`ch-btitle${b.here ? ' here' : ''}`}
          aria-current={b.addressed ? 'true' : undefined}
          aria-label={i18n._(COPY.boards[b.board])}
          onClick={() => onPick(b.board)}
        >
          <span dir="ltr">{b.title}</span>
          {b.context != null && <span className="ch-ctx">{String(b.context)}</span>}
        </button>
      ))}
    </nav>
  )
}
