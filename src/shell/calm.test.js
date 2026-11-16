import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { showOf, modeOf, hiddenClasses } from '../lib/markupShow'

// Calm (stage 14, piece 2; C255) retired into the markup menu (C301 (b)).
// What it drew where a reply has something marked stays, with edits hidden
// (Stefan, 29 October: "little blue checkmarks ... can we not have those?"):
// v5's margin tick, a rule at the reply's edge, in the chat's ink.

const css = readFileSync(new URL('../chrome/chrome.css', import.meta.url), 'utf8')
const hideRules = css.split('}').filter((rule) => rule.includes('.ch-shell.hide-edits'))

describe("the markup menu's settings (C301 (b))", () => {
  it('shows every kind unless set to false, and starts in editing', () => {
    expect(showOf(undefined)).toEqual({ edits: true, highlights: true, prompts: true, comments: true })
    expect(showOf({ highlights: false })).toEqual({ edits: true, highlights: false, prompts: true, comments: true })
    expect(showOf('off')).toEqual({ edits: true, highlights: true, prompts: true, comments: true })
    expect(modeOf(undefined)).toBe('editing')
    expect(modeOf('suggesting')).toBe('suggesting')
    expect(modeOf('anything')).toBe('editing')
  })

  it('gives the shell a class for each kind hidden in the text', () => {
    expect(hiddenClasses(showOf())).toBe('')
    expect(hiddenClasses(showOf({ edits: false, prompts: false }))).toBe(' hide-edits hide-prompts')
    // Comments are drawn in the text now (C301 (c)), so they hide too.
    expect(hiddenClasses(showOf({ comments: false }))).toBe(' hide-comments')
  })
})

describe('a reply with something marked, its edits hidden', () => {
  it('draws no check mark, and nothing of it is blue', () => {
    expect(hideRules.length).toBeGreaterThan(5)
    for (const rule of hideRules) {
      expect(rule).not.toMatch(/\\2713|\\2714|✓|✔/)
      expect(rule).not.toContain('--ch-you')
    }
  })

  it('keeps a rule at its edge in ink instead, and darkens the rule a source answer has', () => {
    const marked = hideRules.filter((rule) => rule.includes('.p-msg-reply') && rule.includes(':has(') && rule.includes('.p-msg-body'))
    expect(marked.length).toBe(2)
    expect(marked.every((rule) => rule.includes('var(--ch-ink-3)'))).toBe(true)
    expect(marked.some((rule) => /::before[\s\S]*content: ""/.test(rule))).toBe(true)
    expect(marked.some((rule) => rule.includes('border-inline-start-color'))).toBe(true)
  })

  it('stays editable: nothing makes the reply read-only', () => {
    expect(hideRules.join('}')).not.toMatch(/pointer-events:\s*none[^}]*\.p-text|user-select:\s*none/)
  })
})
