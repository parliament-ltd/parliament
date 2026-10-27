import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { sizeOf, smallRefusal, PHONE, NARROW } from './sizes'
import { shipped } from './arrangement'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { messages as en } from '../locales/en/messages.mjs'

const i18n = setupI18n({ locale: 'en', messages: { en } })
// A stand-in for matchMedia: a width, and whether the screen is touch-only.
const screenOf = (width, touchOnly = false) => (q) => (q === PHONE ? width < 760 || touchOnly : q === NARROW ? width <= 1100 : false)

describe('screen sizes (C261 (a))', () => {
  it('a phone under 760 or touch-only, a narrow window to 1,100, wider beyond', () => {
    expect(sizeOf(screenOf(375))).toBe('phone')
    expect(sizeOf(screenOf(1024, true))).toBe('phone')
    expect(sizeOf(screenOf(900))).toBe('narrow')
    expect(sizeOf(screenOf(1400))).toBe('wide')
  })
})

describe('commands that do not fit a small screen (C261 (b), (d), (e))', () => {
  const a = { ...shipped('almanac'), columns: [['almanac'], ['library']] }
  const line = (value, size) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens: { size } })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }
  it('says so on a phone, and changes nothing', () => {
    expect(line('>pop:library', 'phone')).toMatchObject({ text: 'pop: works on a wider screen. On a phone one board shows at a time', next: null })
    expect(line('>focus:', 'phone').text).toBe('On a phone one board shows at a time, so focus: is not needed')
    expect(line('>bar:top', 'phone').text).toBe('On a phone the bar stays at the bottom. bar:top works on a wider screen')
    expect(line('>width:library 40%', 'narrow').text).toBe('width: works on a wider window')
  })
  it('lets the rest through: windows home, the bar elsewhere, and everything wider', () => {
    expect(smallRefusal([{ verb: 'pop', match: { values: [{ value: 'back' }] } }], 'phone')).toBeNull()
    expect(smallRefusal([{ verb: 'bar', match: { values: [{ value: 'left' }] } }], 'phone')).toBeNull()
    expect(smallRefusal([{ verb: 'pop', match: { values: [{ value: 'library' }] } }], 'narrow')).toBeNull()
    expect(smallRefusal([{ verb: 'width', match: { values: [] } }], 'wide')).toBeNull()
    expect(line('>open:settings', 'phone').next).toBeTruthy()
  })
})
