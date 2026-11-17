import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { besideOf } from './phoneBoards'

// The arrows at the right edge of a phone, between the boards one above
// another (17 November; phoneBoards.js).

function Chevron({ up }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={up ? 'M3.5 10 8 5.5l4.5 4.5' : 'M3.5 6 8 10.5 12.5 6'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The arrows at the right edge: the board above and the one below.
 * @param {{ order: string[], addressed: string, nameOf: (board: string) => string, onGo: (board: string) => void }} props
 */
export function BoardArrows({ order, addressed, nameOf, onGo }) {
  const { i18n } = useLingui()
  if (order.length < 2) return null
  const { above, below } = besideOf(order, addressed)
  return (
    <nav className="ch-jump" aria-label={i18n._(COPY.shell.strip)}>
      <button type="button" disabled={!above} aria-label={above ? i18n._(COPY.shell.boardUp, { board: nameOf(above) }) : undefined}
        onMouseDown={(e) => e.preventDefault()} onClick={() => above && onGo(above)}>
        <Chevron up />
      </button>
      <button type="button" disabled={!below} aria-label={below ? i18n._(COPY.shell.boardDown, { board: nameOf(below) }) : undefined}
        onMouseDown={(e) => e.preventDefault()} onClick={() => below && onGo(below)}>
        <Chevron />
      </button>
    </nav>
  )
}
