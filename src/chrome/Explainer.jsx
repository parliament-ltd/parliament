import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import BirdsMark from './BirdsMark'
import { PARLIAMENT_VERSION } from '../lib/version'

// What Parliament is, in a few lines, under its logo (C316; Stefan, 18
// November: "add a little explainer over to the right centered vertically",
// and in About "the logo (center-aligned) ... along with the short
// description"). The logo is the square: white on the paper, the bar's own
// shadow, the three birds in ink inside it, and no gold. It stands on the
// paper, not on a board of its own.
//
// Beside the first screen's empty room until anything is typed there or in
// the bar (Shell.jsx); and at the head of Settings, About (about), centred,
// where its last line starts "Parliament is in beta." Nothing is stored.

const SOURCE = 'https://github.com/parliament-ltd/parliament'

/** The logo alone: the white square with the birds. */
export function LogoSquare({ className = '' }) {
  return (
    <span className={`ch-logo${className ? ` ${className}` : ''}`} aria-hidden="true">
      <BirdsMark />
    </span>
  )
}

/** @param {{ about?: boolean }} props about: the version line as About says it */
export default function Explainer({ about = false }) {
  const { i18n } = useLingui()
  return (
    <aside className={`ch-explain${about ? ' about' : ''}`} aria-label={i18n._(COPY.settings.aboutName)}>
      <LogoSquare />
      <p className="ch-ex-name">{i18n._(COPY.settings.aboutName)}</p>
      <p className="ch-ex-desc">{i18n._(COPY.welcome.explainer)}</p>
      <p className="ch-ex-ver">
        {i18n._(about ? COPY.settings.aboutBeta : COPY.welcome.explainerBeta, { version: PARLIAMENT_VERSION })}{' '}
        <a href={SOURCE} target="_blank" rel="noopener noreferrer">{i18n._(COPY.welcome.footLicence)}</a>
      </p>
    </aside>
  )
}
