import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { shipped } from './arrangement'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { messages as en } from '../locales/en/messages.mjs'

// calm: and calm:off (stage 14, piece 2; C255 (d)).

const i18n = setupI18n({ locale: 'en', messages: { en } })
const at = (value, on) => {
  const p = preview(value, { mode: 'command', arrangement: shipped('almanac'), screens: { calm: { on } } })
  return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '' }
}

describe('calm (C255)', () => {
  it('turns on and off as a setting of this device, one step for undo:', () => {
    expect(at('>calm:', false)).toMatchObject({ text: 'Enter calms the screen: details wait until you are near them', act: { kind: 'setting', key: 'calm', value: true, before: false } })
    expect(at('>calm:off', true)).toMatchObject({ text: 'Enter shows every detail again', act: { kind: 'setting', key: 'calm', value: false, before: true } })
  })
  it('says when it is so already', () => {
    expect(at('>calm:', true).text).toBe('The screen is calm already. calm:off shows every detail')
    expect(at('>calm:off', false).text).toBe('Every detail shows already. calm: calms the screen')
  })
})
