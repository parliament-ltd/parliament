import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { preview, BUILT } from './preview'
import { say } from './say'
import { shipped } from '../shell/arrangement'
import { messages as en } from '../locales/en/messages.mjs'

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
const almanac = () => shipped('almanac')
const words = (value, a = almanac()) => {
  const p = preview(value, { mode: 'command', arrangement: a })
  return { ...p, text: say(i18n, p.says.message, p.says.values) }
}

describe('what Enter would do', () => {
  it('says it in words, with board names from the copy table', () => {
    const p = words('>open:library')
    expect(p.text).toBe('Enter opens Library on the right')
    expect(p.next.columns).toEqual([['almanac'], ['collection'], ['library']])
  })

  it('refuses before Enter, and Enter then runs nothing', () => {
    const p = words('>close:library')
    expect(p.text).toBe('Library is not open')
    expect(p.next).toBeNull()
  })

  it('plans a line whole, so it never stops half done', () => {
    const p = words('>open:library close:settings')
    expect(p.text).toBe('Settings is not open')
    expect(p.next).toBeNull()
    const q = words('>open:library move:library left')
    expect(q.text).toBe('Enter runs 2 commands in turn: open: and move:')
    expect(q.next.columns[0]).toEqual(['library'])
  })

  it('says a verb is not built yet, including forms of built verbs that wait for later', () => {
    expect(words('>open:207').text).toBe('open: is not built yet')
    expect(words('>pop:settings keys').text).toBe('pop: is not built yet')
    expect(words('>tour:').text).toBe('tour: is not built yet')
  })

  it('plans pop:, which opens windows', () => {
    expect(BUILT.has('pop')).toBe(true)
    expect(words('>pop:library').text).toBe('Enter puts Library in its own window')
    expect(words('>pop:command').text).toBe('Enter puts the bar in its own window')
    expect(words('>pop:back').text).toBe('No board is in its own window')
  })

  it('answers renamed verbs, places and lists in words', () => {
    expect(words('>hide:library').text).toBe('That verb is now close:. Enter writes it in')
    expect(words('>bar:sideways').text).toBe('bar: takes top, bottom, left, center, or right')
    expect(words('>bar:bottom').text).toBe('Enter moves the bar to the bottom')
    expect(words('>move:collection left').text).toBe('Enter moves Collection to the left')
  })

  it('names where a verb works', () => {
    const p = preview('>type:chat', { mode: 'command', arrangement: shipped('settings') })
    expect(say(i18n, p.says.message, p.says.values)).toBe('type: works on Almanac and Collection')
  })
})
