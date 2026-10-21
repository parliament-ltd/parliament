import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { MOTION } from './motion'

// The timings run from script must say what the tokens say (C111 to C113).
const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8')
const ms = (name) => parseInt(tokens.split(`--ch-${name}: calc(`)[1], 10)

describe('the bar\'s motion', () => {
  it('matches the tokens, slowed by half again from the bar reference', () => {
    expect(MOTION.wipe).toBe(ms('dur-wipe'))
    expect(MOTION.fade).toBe(ms('dur-fade'))
    expect(MOTION.slide).toBe(ms('dur-slide'))
    expect(MOTION.morph).toBe(ms('dur-morph'))
    expect(MOTION.hold).toBe(ms('mark-hold'))
    expect([MOTION.wipe, MOTION.fade, MOTION.slide, MOTION.morph]).toEqual([420, 240, 540, 540])
  })

  it('lets the chevron hold, travel, and become the moon as it reaches the centre (C113)', () => {
    expect(MOTION.hold).toBeGreaterThan(0)
    expect(MOTION.morphAfter).toBeLessThan(MOTION.slide)
    // The change ends after the circle has landed, where it is seen.
    expect(MOTION.hold + MOTION.morphAfter + MOTION.morph).toBeGreaterThan(MOTION.hold + MOTION.slide)
  })
})
