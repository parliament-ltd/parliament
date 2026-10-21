import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { MOTION } from './motion'

// The timings run from script must say what the tokens say (C111).
const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8')
const ms = (name) => parseInt(tokens.split(`--ch-dur-${name}: calc(`)[1], 10)

describe('the bar\'s motion', () => {
  it('matches the tokens, slowed by half again from the bar reference', () => {
    expect(MOTION).toEqual({ wipe: ms('wipe'), fade: ms('fade'), slide: ms('slide'), morph: ms('morph') })
    expect(MOTION).toEqual({ wipe: 420, fade: 240, slide: 540, morph: 690 })
  })
})
