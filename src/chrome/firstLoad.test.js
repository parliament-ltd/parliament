import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { INTRO, showIntro, introTimes } from './firstLoad'
import BirdsMark, { BIRDS } from './BirdsMark'

// The birds on first load (C279 (e)).
const svg = readFileSync(new URL('../../docs/spec/parliament-birds.svg', import.meta.url), 'utf8')
const css = readFileSync(new URL('./chrome.css', import.meta.url), 'utf8')
const intro = readFileSync(new URL('./Intro.jsx', import.meta.url), 'utf8')

describe('when the birds come in', () => {
  it('only on the very first start: no space kept and nothing made', () => {
    expect(showIntro({ kept: false, fresh: true })).toBe(true)
    expect(showIntro({ kept: true, fresh: true })).toBe(false)
    expect(showIntro({ kept: false, fresh: false })).toBe(false)
    expect(showIntro({ kept: true, fresh: false })).toBe(false)
  })

  it('never where the space cannot be kept, since every start would be a first', () => {
    expect(showIntro({ kept: false, fresh: true, canKeep: false })).toBe(false)
  })
})

describe('how long they take', () => {
  it('one bird, then two, then three, then the page, in about 1.2 seconds', () => {
    const t = introTimes()
    expect(t.birds).toEqual([0, INTRO.between, 2 * INTRO.between])
    // Each bird is in before the page starts to come.
    expect(t.birds[2] + t.bird).toBeLessThan(t.out)
    expect(t.end).toBe(t.out + t.fade)
    expect(t.end).toBeGreaterThanOrEqual(1000)
    expect(t.end).toBeLessThanOrEqual(1400)
  })

  it('with reduced motion, shows the three at once, still, and the page follows', () => {
    const t = introTimes({ reduced: true })
    expect(t.birds).toEqual([0, 0, 0])
    expect(t.bird).toBe(0)
    expect(t.fade).toBe(0)
    expect(t.out).toBe(t.end)
    expect(t.end).toBeLessThan(introTimes().end)
  })

  it('sets the timings the stylesheet reads', () => {
    for (const name of ['--intro-bird', '--intro-2', '--intro-3', '--intro-out', '--intro-fade']) {
      expect(intro, name).toContain(`'${name}'`)
      expect(css, name).toContain(`var(${name}`)
    }
  })
})

describe('the mark, in three birds', () => {
  const d = svg.match(/<path d="([^"]+)"/)[1].trim()
  const paint = 'fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"'

  it('holds the file\'s shape, one bird at a time, in the file\'s order', () => {
    expect(BIRDS).toHaveLength(3)
    expect(BIRDS.join(' ')).toBe(d)
    expect(BIRDS.map((b) => b.slice(0, b.indexOf(' ')))).toEqual(['M498,685', 'M894,732', 'M651,911'])
  })

  it('draws the mark as the one shape it was, so the welcome card\'s looks as before', () => {
    expect(renderToStaticMarkup(h(BirdsMark, { className: 'ch-wlogo' }))).toBe(
      `<svg class="ch-wlogo" viewBox="478 665 752 640" fill="none" aria-hidden="true" focusable="false"><path d="${d}" ${paint}></path></svg>`,
    )
  })

  it('draws the birds apart for the birds on first load, each in the same ink and outline', () => {
    const out = renderToStaticMarkup(h(BirdsMark, { className: 'ch-intro-mark', apart: true }))
    expect(out).toContain('viewBox="478 665 752 640"')
    expect(out).toContain('aria-hidden="true"')
    expect(out.match(/<path [^>]*>/g)).toEqual(BIRDS.map((b) => `<path d="${b}" ${paint}>`))
    expect(intro).toMatch(/<BirdsMark className="ch-intro-mark" apart \/>/)
  })
})
