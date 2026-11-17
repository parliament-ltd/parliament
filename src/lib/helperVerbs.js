// alarm:, dictionary:, thesaurus: and calc: (C303, ruled 16 November). Each
// says what Enter would do before it is pressed; the shell does it. Nothing
// here is sent anywhere: alarms are kept on this device, words are looked up
// in lists shipped with Parliament, and sums are worked out here.
//
// screens.alarms: the alarms in board order; screens.calcLocale: the
// language a sum's answer is written in.

import { readAlarm, ALARMS_MOST } from './alarms'
import { evaluate, format } from './sums'
import { wordOf } from './words'

const BOARD_ALARMS = 'alarms'
const rawOf = (step) => String(step.match?.values?.[0] ?? '').trim()
const clock = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const lengthOf = (ms) => (ms % 60_000 === 0 ? { unit: 'm', amount: ms / 60_000 } : { unit: 's', amount: Math.round(ms / 1000) })

/** alarm: and what follows it (parliament-alarms-v1.html §2). */
export function planAlarm(step, screens = {}, now = new Date()) {
  const said = readAlarm(rawOf(step), now)
  const list = screens.alarms ?? []
  if (said.bad) return { says: { message: said.bad }, act: null }
  if (said.open) return { says: { message: 'alarmOpen', values: { board: BOARD_ALARMS } }, act: { kind: 'alarmOpen' } }
  if (said.quiet !== undefined) return { says: { message: said.quiet ? 'alarmQuiet' : 'alarmQuietOff' }, act: { kind: 'alarmQuiet', quiet: said.quiet } }
  if (said.off) {
    if (said.n == null) {
      if (!list.length) return { says: { message: 'alarmNoneAll' }, act: null }
      return { says: { message: 'alarmOffAll', values: { count: list.length } }, act: { kind: 'alarmOff', ids: list.map((a) => a.id), confirm: true } }
    }
    const a = list[said.n - 1]
    if (!a) return { says: { message: 'alarmNone', values: { n: said.n } }, act: null }
    return { says: { message: 'alarmOff', values: { n: said.n, name: a.name, named: a.name ? 'yes' : 'no' } }, act: { kind: 'alarmOff', ids: [a.id] } }
  }
  if (said.later) {
    const a = list[said.n - 1]
    if (!a) return { says: { message: 'alarmNone', values: { n: said.n } }, act: null }
    const base = a.rang || Date.parse(a.at) <= now.getTime() ? now.getTime() : Date.parse(a.at)
    return {
      says: { message: 'alarmLater', values: { n: said.n, name: a.name, named: a.name ? 'yes' : 'no', ...lengthOf(said.ms), at: clock(new Date(base + said.ms)) } },
      act: { kind: 'alarmLater', id: a.id, ms: said.ms },
    }
  }
  if (list.length >= ALARMS_MOST) return { says: { message: 'alarmMany', values: { most: ALARMS_MOST } }, act: null }
  const s = said.set
  const named = s.name ? 'yes' : 'no'
  if (s.kind === 'every') return { says: { message: 'alarmEvery', values: { name: s.name, named, minutes: Math.round(s.ms / 60_000) } }, act: { kind: 'alarmSet', set: s } }
  if (s.kind === 'at') {
    const left = Math.max(1, Math.round((s.at.getTime() - now.getTime()) / 60_000))
    return { says: { message: 'alarmAt', values: { name: s.name, named, at: clock(s.at), tomorrow: s.tomorrow ? 'yes' : 'no', hours: Math.floor(left / 60), minutes: left % 60 } }, act: { kind: 'alarmSet', set: { ...s, at: s.at.toISOString() } } }
  }
  return { says: { message: 'alarmIn', values: { name: s.name, named, ...lengthOf(s.ms), at: clock(new Date(now.getTime() + s.ms)) } }, act: { kind: 'alarmSet', set: s } }
}

/**
 * dictionary:reluctant, thesaurus:reluctant, and either alone, which takes
 * the word selected in your text (parliament-dictionary-v1.html §2).
 */
export function planLookUp(step, half = 'meanings') {
  const raw = rawOf(step).replace(/^"([\s\S]*)"$/, '$1')
  if (!raw) return { says: { message: half === 'same' ? 'lookUpSameSelection' : 'lookUpSelection' }, act: { kind: 'lookUp', half, word: null } }
  const word = wordOf(raw)
  if (!word) return { says: { message: 'lookUpHow' }, act: null }
  return { says: { message: half === 'same' ? 'lookUpSame' : 'lookUp', values: { word, board: 'dictionary' } }, act: { kind: 'lookUp', half, word } }
}

/** align:center, align:right, align:left (C304): the lines in hand. */
export function planAlign(step) {
  const word = step.match?.values?.[0]?.value
  if (!['center', 'right', 'left'].includes(word)) return { says: { message: 'alignHow' }, act: null }
  return { says: { message: 'alignGo', values: { align: word } }, act: { kind: 'lay', align: word } }
}

/** indent: and indent:off (C304): the lines in hand, one step in or out. */
export function planIndent(step) {
  const off = step.match?.values?.[0]?.value === 'off'
  return { says: { message: off ? 'indentOffGo' : 'indentGo' }, act: { kind: 'lay', by: off ? -1 : 1 } }
}

const SUM_SAYS = { divideByZero: 'calcDivide', bracket: 'calcBracket', char: 'calcChar', power: 'calcPower', empty: 'calcHow', number: 'calcSyntax', syntax: 'calcSyntax', end: 'calcSyntax' }

/** calc:48000*2/12, worked out on the line under the bar as it is typed (§4). */
export function planCalc(step, screens = {}) {
  const raw = rawOf(step)
  if (!raw) return { says: { message: 'calcHow' }, act: null }
  try {
    const { text, exact } = format(evaluate(raw), screens.calcLocale ?? 'en')
    return { says: { message: exact ? 'calcIs' : 'calcAbout', values: { result: text } }, act: { kind: 'calc', result: text, exact } }
  } catch (err) {
    return { says: { message: SUM_SAYS[err?.code] ?? 'calcSyntax' }, act: null }
  }
}
