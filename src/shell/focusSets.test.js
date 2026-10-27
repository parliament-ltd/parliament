import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { shipped, planFocusSet, planFocusOff, outOfFocusFor, focusBoardsOf } from './arrangement'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { validateBackup } from '../lib/validate'
import { messages as en } from '../locales/en/messages.mjs'

// Focus sets, kept with their room (stage 14, piece 1; C253).

const i18n = setupI18n({ locale: 'en', messages: { en } })
const space = () => ({ ...shipped('almanac'), columns: [['room'], ['almanac'], ['library']], context: { room: 'c1' }, addressed: 'room' })
const mode = { id: 'mode_1', scope: 'room', schema: 'x', meta: { name: 'Essay room' }, components: [] }
const at = (value, { a = space(), focus = { room: { id: 'mode_1', name: 'Essay room', mode }, set: null } } = {}) => {
  const p = preview(value, { mode: 'command', arrangement: a, screens: { focus } })
  return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '', also: (p.says?.also ?? []).map((x) => say(i18n, x.message, x.values)) }
}

describe('a focus set (C253 piece 1)', () => {
  it('lays the boards out left to right and keeps what was there for focus:off', () => {
    const p = planFocusSet(space(), ['room', 'collection'])
    expect(p.next.columns).toEqual([['room'], ['collection']])
    expect(p.next.focus.columns).toEqual([['room'], ['almanac'], ['library']])
    const changed = planFocusSet(p.next, ['library']).next
    expect(changed.focus.columns).toEqual([['room'], ['almanac'], ['library']])
    expect(planFocusOff(changed).next.columns).toEqual([['room'], ['almanac'], ['library']])
    expect(planFocusSet(p.next, ['room', 'collection']).says.message).toBe('focusSetAlready')
    expect(focusBoardsOf(space())).toEqual(['room', 'almanac', 'library'])
  })
  it('turns off when something needs a board it hides', () => {
    const focused = planFocusSet(space(), ['room']).next
    expect(outOfFocusFor(focused, 'collection').columns).toEqual([['room'], ['almanac'], ['library']])
    expect(outOfFocusFor(focused, 'room')).toBeNull()
    expect(outOfFocusFor(space(), 'collection')).toBeNull()
  })
})

describe('focus:room collection and focus:save on the Enter line (C253 (a), (b))', () => {
  it('focuses and keeps the set with the room on screen', () => {
    const p = at('>focus:room collection')
    expect(p.text).toBe('Enter focuses on the chat and Collection, in that order. Nothing is lost, and focus:off brings back what was here')
    expect(p.also).toEqual(['It is kept as the focus of Essay room: focus: alone brings it back'])
    expect(p.act).toMatchObject({ kind: 'focusSet', modeId: 'mode_1', after: { focus: ['room', 'collection'] } })
    expect(p.next.columns).toEqual([['room'], ['collection']])
  })
  it('takes boards by their names, and says which it does not know', () => {
    expect(at('>focus:records plan').act.after.focus).toEqual(['almanac', 'docket'])
    expect(at('>focus:room owls').text).toBe('focus: takes boards by name: room, collection, reflection, records, library, and plan. owls is not one')
  })
  it('keeps what is on screen with focus:save, and uses the set with focus: alone', () => {
    const s = at('>focus:save')
    expect(s.text).toBe('Enter keeps what is on screen now as the focus of Essay room: the chat, Records, and Library')
    expect(s.act.after.focus).toEqual(['room', 'almanac', 'library'])
    expect(s.next ?? null).toBeNull()
    const alone = at('>focus:', { focus: { room: { id: 'mode_1', name: 'Essay room', mode }, set: ['room', 'collection'] } })
    expect(alone.next.columns).toEqual([['room'], ['collection']])
  })
  it('focuses without keeping when no room is on screen, and not in the Lab', () => {
    expect(at('>focus:collection', { focus: { room: null, set: null } }).also).toEqual(['No room is on screen, so it is not kept as a focus'])
    expect(at('>focus:room', { a: { ...space(), lab: { columns: [['almanac']], popped: [], addressed: 'almanac', bar: { at: 'top', side: 'center', popped: false } } } }).text).toBe('focus: works outside the Lab. done: leaves it first')
  })
  it('keeps a room record readable with a focus, and refuses a wrong one', () => {
    expect(validateBackup({ conversations: [], modes: [{ ...mode, focus: ['room', 'collection'] }] }).valid).toBe(true)
    expect(validateBackup({ conversations: [], modes: [{ ...mode, focus: 'room' }] }).valid).toBe(false)
  })
})
