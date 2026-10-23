import { useLingui } from '@lingui/react'
import Globe from './Globe'
import { COPY } from '../copy'
import { STEPS, nextStep } from '../shell/welcome'
import { useNarrower } from './useNarrower'
import BirdsMark from './BirdsMark'

// Below this width the card is one column: steps, field, then the letter
// (welcome spec §5), however it got narrow (C126).
const CARD_WIDE = 760

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

// A line with a command in it, where the command is a link that writes it
// in the bar: the sentence is translated whole, and split where the command
// goes, so a language can put it anywhere.
const MARK = '\u0000'
function withCommand(i18n, descriptor, command, onWrite) {
  const [before, after = ''] = i18n._(descriptor, { command: MARK }).split(MARK)
  return (
    <>
      {before}
      <button type="button" className="c" dir="ltr" onClick={() => onWrite(`>${command}`)}>{command}</button>
      {after}
    </>
  )
}

/**
 * @param {{ welcome: import('../shell/welcome').Welcome, addressed: boolean, onAddress: (board: string) => void,
 *   onWrite: (text: string) => void, barSlot: (el: HTMLElement|null) => void,
 *   keep?: { asking: boolean, onAsk: () => void }|null }} props
 *   keep: when the browser has not agreed to keep Parliament's data and there is something to lose (C94)
 */
export default function WelcomeBoard({ welcome, addressed, onAddress, onWrite, barSlot, keep = null, languages = null, onLanguage }) {
  const { i18n } = useLingui()
  const next = nextStep(welcome)
  const steps = !welcome.off && !welcome.finished
  const [cardRef, narrow] = useNarrower(CARD_WIDE)
  return (
    <article
      ref={cardRef}
      className={`ch-card ch-welcome${addressed ? ' addressed' : ''}${welcome.finished ? ' finished' : ''}${narrow ? ' narrow' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('welcome')}
    >
      <div className="ch-wscroll">
        <div className="ch-wgrid">
          <div className="ch-wtop">
            <h1 className="ch-wh">
              <BirdsMark className="ch-wlogo" />
              {i18n._(COPY.welcome.heading)}
              <span className="ch-wto">{i18n._(COPY.welcome.headingTo)}</span>
            </h1>
            <p className="ch-wsmall ch-marg">{i18n._(COPY.welcome.small)}</p>
            {languages && <Globe now={languages.now} onOpen={onLanguage} />}
          </div>
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
          {welcome.finished ? (
            // The ending (W §7): the letter gives way to one line.
            <p className="ch-wnow">{withCommand(i18n, COPY.welcome.now, 'focus:', onWrite)}</p>
          ) : (
            <div className="ch-letter">
              <p>{i18n._(COPY.welcome.letter1)}</p>
              <p>{i18n._(COPY.welcome.letter2)}</p>
              <p>{i18n._(COPY.welcome.letter3)}</p>
              <p>{i18n._(COPY.welcome.letter4)}</p>
              <p className="sig">{'— '}{i18n._(COPY.welcome.signature)}</p>
            </div>
          )}
          {keep && (
            <div className="ch-wkeep" role="note">
              <p>{i18n._(COPY.welcome.keepNot)}</p>
              <p className="ch-marg">
                <button type="button" disabled={keep.asking} onClick={keep.onAsk}>{i18n._(keep.asking ? COPY.welcome.keepAsking : COPY.welcome.keepAsk)}</button>
                <span className="sep" aria-hidden="true"> · </span>
                <button type="button" onClick={() => onWrite('>open:settings data')}>{i18n._(COPY.welcome.keepBackup, { board: i18n._(COPY.boards.settings) })}</button>
              </p>
            </div>
          )}
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
