import { useLingui } from '@lingui/react'
import Globe from './Globe'
import { COPY } from '../copy'
import { STEPS, nextStep, ADVANCED_STEPS, ADVANCED_GROUPS, nextAdvanced } from '../shell/welcome'
import { actCommand } from '../lib/cardActs'
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
  highlight: COPY.welcome.stepHighlight,
}

// What a step's command line says, where it is more than its command.
function howOf(i18n, s, keyed, roomNum = null) {
  // name: with the room's number, then its name (31 October): from the
  // welcome page the bar points at the page, not the room.
  if (s.id === 'name') return i18n._(COPY.welcome.stepNameHow, { command: roomNum ? `name:${roomNum} "…"` : 'name:' })
  if (s.id === 'command') return i18n._(COPY.welcome.stepCommandHow, { keys: modKey() === '⌘' ? '⌘K' : 'Ctrl+K', command: s.shows })
  if (s.id === 'ask') return i18n._(keyed ? COPY.welcome.stepAskHow : COPY.welcome.stepAskHowFree, { command: s.shows })
  // Backspace over selected words strikes them (30 October): the key people already know.
  if (s.id === 'strike') return i18n._(COPY.welcome.stepStrikeHow, { keys: modKey() === '⌘' ? '⌫' : 'Backspace' })
  if (s.id === 'send') return i18n._(COPY.welcome.stepSendHow, { command: s.shows })
  if (s.id === 'highlight') return i18n._(COPY.welcome.stepHighlightHow)
  return s.shows
}

// The second list (welcome spec §13; tour:advanced): its headings and steps.
const HEADINGS = {
  sources: COPY.welcome.advancedSources,
  collection: COPY.welcome.advancedCollection,
  space: COPY.welcome.advancedSpace,
}
const ADVANCED_TITLES = {
  sources: COPY.welcome.stepSources,
  compare: COPY.welcome.stepCompare,
  highlight: COPY.welcome.stepPassage,
  collection: COPY.welcome.stepCollection,
  noteQuotes: COPY.welcome.stepNoteQuotes,
  summary: COPY.welcome.stepSummary,
  arrange: COPY.welcome.stepArrange,
}

// What a step of the second list says beside it, and what a click writes.
// compare: and note: carry the numbers they would take, where they are known
// (welcome.js, advancedNumbers), as name: carries the room's number.
function advancedHow(i18n, s, nums) {
  if (s.id === 'sources') return { how: i18n._(COPY.welcome.stepSourcesHow, { command: s.shows }), writes: s.writes }
  if (s.id === 'compare') {
    if (nums?.compare) return { how: `compare:${nums.compare.join(' ')}`, writes: `>compare:${nums.compare.join(' ')}` }
    return { how: i18n._(COPY.welcome.stepCompareHow, { command: s.shows, example: 'compare:201a 201b' }), writes: s.writes }
  }
  if (s.id === 'highlight') return { how: i18n._(COPY.welcome.stepHighlightHow), writes: null }
  if (s.id === 'noteQuotes') {
    if (nums?.quotes?.length) return { how: `note:${nums.quotes.join(', ')} "…"`, writes: actCommand.note(nums.quotes) }
    return { how: i18n._(COPY.welcome.stepNoteQuotesHow, { command: s.shows }), writes: s.writes }
  }
  if (s.id === 'summary') return { how: i18n._(COPY.welcome.stepSummaryHow, { command: s.shows }), writes: s.writes }
  return { how: s.shows, writes: s.writes }
}

// One step, in either list: its number, what to do, then the command, which
// a click writes in the bar. A step no command does yet says what to do,
// and writes nothing (C282).
function StepRow({ n, title, how, writes, done, next, onWrite }) {
  return (
    <li className={done ? 'done' : next ? 'next' : undefined}>
      <span className="n">{n}</span>
      <span>
        <span className="t">{title}</span>
        {writes
          ? <button type="button" className="c" dir="ltr" onClick={() => onWrite(writes)}>{how}</button>
          : <span className="c">{how}</span>}
      </span>
    </li>
  )
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

// A line with several commands in it, each a link that writes it in the bar.
function withCommands(i18n, descriptor, commands, onWrite) {
  const names = Object.keys(commands)
  const marks = Object.fromEntries(names.map((n, i) => [n, `${MARK}${i}${MARK}`]))
  const parts = i18n._(descriptor, marks).split(new RegExp(`${MARK}([0-9]+)${MARK}`))
  return parts.map((part, i) => {
    if (i % 2 === 0) return part
    const command = commands[names[Number(part)]]
    return <button key={i} type="button" className="c" dir="ltr" onClick={() => onWrite(command.startsWith('>') ? command : `>${command}`)}>{command}</button>
  })
}

/**
 * @param {{ welcome: import('../shell/welcome').Welcome, addressed: boolean, onAddress: (board: string) => void,
 *   onWrite: (text: string) => void, barSlot: (el: HTMLElement|null) => void,
 *   keep?: { asking: boolean, onAsk: () => void }|null }} props
 *   keep: when the browser has not agreed to keep Parliament's data and there is something to lose (C94)
 *   advancedNums: the numbers the second list's compare: and note: are shown with, where known
 */
export default function WelcomeBoard({ welcome, addressed, onAddress, onWrite, barSlot, keep = null, languages = null, onLanguage, keyed = false, roomNum = null, advancedNums = null }) {
  const { i18n } = useLingui()
  const next = nextStep(welcome)
  // One list at a time: the second in the first's place (tour:advanced),
  // offered by one quiet line under the first, or under the ending once it
  // is done (W §13). tour:off puts either away, and the offer with it.
  const advanced = !welcome.off && welcome.advanced
  const steps = !welcome.off && !welcome.advanced && !welcome.finished
  const offer = !welcome.off && !welcome.advanced
  const nextFurther = nextAdvanced(welcome)
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
              {STEPS.map((s, i) => (
                <StepRow
                  key={s.id} n={i + 1} title={i18n._(TITLES[s.id], { board: i18n._(COPY.boards.collection) })}
                  how={howOf(i18n, s, keyed, roomNum)} writes={s.writes && (s.id === 'name' && roomNum ? `>name:${roomNum} ""` : s.writes)}
                  done={welcome.done.includes(s.id)} next={next?.id === s.id} onWrite={onWrite}
                />
              ))}
            </ol>
          )}
          {/* The second list: the same lines, numbered on through three short
              headings in the same serif, so it reads as small lists (W §13). */}
          {advanced && (
            <div className="ch-steps ch-asteps" role="group" aria-label={i18n._(COPY.welcome.advancedSteps)}>
              {ADVANCED_GROUPS.map((g) => (
                <section key={g}>
                  <h2 className="ch-stepsh">{i18n._(HEADINGS[g])}</h2>
                  <ol>
                    {ADVANCED_STEPS.filter((s) => s.group === g).map((s) => {
                      const { how, writes } = advancedHow(i18n, s, advancedNums)
                      return (
                        <StepRow
                          key={s.id} n={ADVANCED_STEPS.indexOf(s) + 1} title={i18n._(ADVANCED_TITLES[s.id])} how={how} writes={writes}
                          done={(welcome.advancedDone ?? []).includes(s.id)} next={nextFurther?.id === s.id} onWrite={onWrite}
                        />
                      )
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
          <div className="ch-wbar" ref={barSlot} />
          {/* The ending (W §7): one line once the steps are done. The letter
              is letter one, opened by letter: rather than drawn here (C279 (d)). */}
          {welcome.finished && <p className="ch-wnow">{withCommand(i18n, COPY.welcome.now, 'focus:', onWrite)}</p>}
          {offer && (
            <p className="ch-wfurther ch-marg">
              <button type="button" onClick={() => onWrite('>tour:advanced')}>{i18n._(COPY.welcome.further)}</button>
            </p>
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
            {/* Stefan's words, 2 November (C286 (e)): one line each. */}
            <li>{withCommand(i18n, COPY.welcome.startPrompt, 'p>', onWrite)}</li>
            <li>{withCommands(i18n, COPY.welcome.startCommands, { first: '>', second: '?' }, onWrite)}</li>
            <li>{withCommand(i18n, COPY.welcome.startHistory, 'open:records', onWrite)}</li>
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
      {/* The source, public since 28 October. */}
      <a href="https://github.com/parliament-ltd/parliament" target="_blank" rel="noopener noreferrer">{i18n._(COPY.welcome.footLicence)}</a>
      <span className="sep" aria-hidden="true">·</span>
      <a href="mailto:support@parliament.ltd">{i18n._(COPY.welcome.footBuilders)}</a>
    </footer>
  )
}
