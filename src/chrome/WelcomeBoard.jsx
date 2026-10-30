import { useLingui } from '@lingui/react'
import Globe from './Globe'
import { COPY } from '../copy'
import { STEPS, nextStep } from '../shell/welcome'
import { useNarrower } from './useNarrower'
import { modKey } from '../shell/keys'
import BirdsMark from './BirdsMark'

// Below this width the card is one column: steps, field, then the letter
// (welcome spec §5), however it got narrow (C126).
const CARD_WIDE = 760

// The welcome page's card (refactor-plan.md, stage 5; welcome spec §2 to
// §4, welcome v9). One large card: "Welcome", the ten steps, the field
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
  lab: COPY.welcome.stepLab,
  key: COPY.welcome.stepKey,
  strike: COPY.welcome.stepStrike,
  send: COPY.welcome.stepSend,
}

// What a step's command line says, where it is more than its command.
function howOf(i18n, s, keyed) {
  if (s.id === 'command') return i18n._(COPY.welcome.stepCommandHow, { keys: modKey() === '⌘' ? '⌘K' : 'Ctrl+K', command: s.shows })
  if (s.id === 'ask') return i18n._(keyed ? COPY.welcome.stepAskHow : COPY.welcome.stepAskHowFree, { command: s.shows })
  // Backspace over selected words strikes them (30 October): the key people already know.
  if (s.id === 'strike') return i18n._(COPY.welcome.stepStrikeHow, { keys: modKey() === '⌘' ? '⌫' : 'Backspace' })
  if (s.id === 'send') return i18n._(COPY.welcome.stepSendHow, { command: s.shows })
  return s.shows
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
      <button type="button" className="c" dir="ltr" onClick={() => onWrite(command.endsWith('>') ? command : `>${command}`)}>{command}</button>
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
export default function WelcomeBoard({ welcome, addressed, onAddress, onWrite, barSlot, keep = null, languages = null, onLanguage, keyed = false }) {
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
      {/* The language in the card's top corner, where many sites keep it (29 October). */}
      {languages && <div className="ch-wlang"><Globe now={languages.now} onOpen={onLanguage} /></div>}
      <div className="ch-wscroll">
        <div className="ch-wgrid">
          <div className="ch-wtop">
            <h1 className="ch-wh">
              <BirdsMark className="ch-wlogo" />
              {i18n._(COPY.welcome.heading)}
              <span className="ch-wto">{i18n._(COPY.welcome.headingTo)}</span>
            </h1>
          </div>
          {steps && (
            <ol className="ch-steps" aria-label={i18n._(COPY.welcome.steps)}>
              {STEPS.map((s, i) => {
                const done = welcome.done.includes(s.id)
                const how = howOf(i18n, s, keyed)
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
          {/* The ending (W §7): one line once the steps are done. The letter
              is letter one, opened by letter: rather than drawn here (C279 (d)). */}
          {welcome.finished && <p className="ch-wnow">{withCommand(i18n, COPY.welcome.now, 'focus:', onWrite)}</p>}
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

/**
 * The start card (30 October; C282): when the welcome page closes with
 * nothing else open, the birds in the middle of the screen with the bar
 * under them, and how to open a room. Each command is a link that writes it
 * in the bar; nothing is opened for the person. It gives way to the first
 * board opened.
 * @param {{ addressed: boolean, onAddress: (board: string) => void, onWrite: (text: string) => void,
 *   barSlot: (el: HTMLElement|null) => void, languages?: { now: string }|null, onLanguage?: () => void }} props
 */
export function StartBoard({ addressed, onAddress, onWrite, barSlot, languages = null, onLanguage }) {
  const { i18n } = useLingui()
  return (
    <article
      className={`ch-card ch-welcome ch-start${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      aria-label={i18n._(COPY.boards.start)}
      onMouseDown={() => onAddress('start')}
    >
      {languages && <div className="ch-wlang"><Globe now={languages.now} onOpen={onLanguage} /></div>}
      <div className="ch-wscroll">
        <div className="ch-sgrid">
          <BirdsMark className="ch-slogo" />
          <div className="ch-wbar" ref={barSlot} />
          <ul className="ch-shint">
            <li>{withCommand(i18n, COPY.welcome.startRoom, 'p>', onWrite)}</li>
            <li>{withCommand(i18n, COPY.welcome.startOpen, 'open:records', onWrite)}</li>
            <li>{withCommand(i18n, COPY.welcome.startTour, 'tour:', onWrite)}</li>
          </ul>
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
      <span>{i18n._(COPY.welcome.small)}</span>
      <span className="sep" aria-hidden="true">·</span>
      <span>{i18n._(COPY.welcome.footMade)}</span>
      <span className="sep" aria-hidden="true">·</span>
      <span>{i18n._(COPY.welcome.footLicence)}</span>
      <span className="sep" aria-hidden="true">·</span>
      <a href="mailto:support@parliament.ltd">{i18n._(COPY.welcome.footBuilders)}</a>
    </footer>
  )
}
