import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { STEPS, nextStep } from '../shell/welcome'

// The welcome page's card (refactor-plan.md, stage 5; welcome spec §2 to
// §4, welcome v9). One large card: "Welcome", the eight steps, the field
// under them, and the letter beside them. The page is the lesson: every
// step is a real command, crossed off when the thing itself happens.
//
// The field is the shell's one bar, drawn into the slot here while it rests
// in the card (`barSlot`); bar:bottom moves it to the foot of the screen.
// A step's command, clicked, is written into the field and waits for Enter.

const TITLES = {
  command: COPY.welcome.stepCommand,
  bar: COPY.welcome.stepBar,
  ask: COPY.welcome.stepAsk,
  almanac: COPY.welcome.stepAlmanac,
  name: COPY.welcome.stepName,
  pop: COPY.welcome.stepPop,
  library: COPY.welcome.stepLibrary,
  key: COPY.welcome.stepKey,
}

/**
 * @param {{ welcome: import('../shell/welcome').Welcome, addressed: boolean, onAddress: (board: string) => void,
 *   onWrite: (text: string) => void, barSlot: (el: HTMLElement|null) => void }} props
 */
export default function WelcomeBoard({ welcome, addressed, onAddress, onWrite, barSlot }) {
  const { i18n } = useLingui()
  const next = nextStep(welcome)
  const steps = !welcome.off && !welcome.finished
  return (
    <article
      className={`ch-card ch-welcome${addressed ? ' addressed' : ''}${welcome.finished ? ' finished' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('welcome')}
    >
      <div className="ch-wscroll">
        <div className="ch-wgrid">
          <h1 className="ch-wh">
            {i18n._(COPY.welcome.heading)}
            <span className="ch-wto">{i18n._(COPY.welcome.headingTo)}</span>
          </h1>
          {steps && (
            <ol className="ch-steps" aria-label={i18n._(COPY.welcome.steps)}>
              {STEPS.map((s, i) => {
                const done = welcome.done.includes(s.id)
                const how = s.id === 'ask' ? i18n._(COPY.welcome.stepAskHow, { command: s.shows }) : s.shows
                return (
                  <li key={s.id} className={done ? 'done' : next?.id === s.id ? 'next' : undefined}>
                    <span className="n">{i + 1}</span>
                    <span>
                      <span className="t">{i18n._(TITLES[s.id])}</span>
                      <button type="button" className="c" dir="ltr" onClick={() => onWrite(s.writes)}>{how}</button>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          <div className="ch-wbar" ref={barSlot} />
          <div className="ch-letter">
            <p>{i18n._(COPY.welcome.letter1)}</p>
            <p>{i18n._(COPY.welcome.letter2)}</p>
            <p>{i18n._(COPY.welcome.letter3)}</p>
            <p>{i18n._(COPY.welcome.letter4)}</p>
            <p className="sig">{'— '}{i18n._(COPY.welcome.signature)}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

/** The page's foot, outside the card (W §9; C123). */
export function WelcomeFoot() {
  const { i18n } = useLingui()
  return (
    <footer className="ch-foot ch-marg">
      <span>{i18n._(COPY.welcome.footMade)}</span>
      <span className="sep" aria-hidden="true">·</span>
      <span>{i18n._(COPY.welcome.footLicence)}</span>
      <span className="sep" aria-hidden="true">·</span>
      <a href="mailto:support@parliament.ltd">{i18n._(COPY.welcome.footBuilders)}</a>
    </footer>
  )
}
