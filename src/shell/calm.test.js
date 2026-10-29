import { readFileSync } from 'node:fs'
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

// What calm draws where a reply has something marked (Stefan, 29 October:
// "little blue checkmarks ... can we not have those?"): v5's margin tick, a
// rule at the reply's edge, in the chat's ink, not a blue check mark.
const css = readFileSync(new URL('../chrome/chrome.css', import.meta.url), 'utf8')
const calmRules = css.split('}').filter((rule) => rule.includes('.ch-shell.calm'))

describe('a reply with something marked, at rest in calm', () => {
  it('draws no check mark, and nothing of calm is blue', () => {
    expect(calmRules.length).toBeGreaterThan(5)
    for (const rule of calmRules) {
      expect(rule).not.toMatch(/\\2713|\\2714|✓|✔/)
      expect(rule).not.toContain('--ch-you')
    }
  })

  it('keeps a rule at its edge in ink instead, and darkens the rule a source answer has', () => {
    const marked = calmRules.filter((rule) => rule.includes('.p-msg-reply') && rule.includes(':has(') && rule.includes('.p-msg-body'))
    expect(marked.length).toBe(2)
    expect(marked.every((rule) => rule.includes('var(--ch-ink-3)'))).toBe(true)
    expect(marked.some((rule) => /::before[\s\S]*content: ""/.test(rule))).toBe(true)
    expect(marked.some((rule) => rule.includes('border-inline-start-color'))).toBe(true)
  })
})
