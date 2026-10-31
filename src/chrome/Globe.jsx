import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { ownNameOf } from '../lib/languages'

// The globe (ruled 16 October; stage 9, piece 4; C184): a sign someone
// faced with a language they cannot read still recognises. It sits beside
// the page's language by its own name, as marginalia, and opens the
// languages' picker. "The globe means language": nothing else uses it.

const GLOBE = '\u{1F310}'
const OPENS = '▾'

/**
 * @param {{ now: string, onOpen: (from: HTMLElement) => void }} props now: the page's language.
 *   onOpen gets the globe itself, so the menu can open right under it (30 October).
 */
export default function Globe({ now, onOpen }) {
  const { i18n } = useLingui()
  const own = ownNameOf(now)
  return (
    <button
      type="button"
      className="ch-marg ch-globe"
      aria-label={i18n._(COPY.languagePicker.globe, { language: own })}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => onOpen?.(e.currentTarget)}
    >
      <span aria-hidden="true">{GLOBE}</span> <span lang={now}>{own}</span> <span aria-hidden="true">{OPENS}</span>
    </button>
  )
}
