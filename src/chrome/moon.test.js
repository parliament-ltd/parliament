import { describe, it, expect } from 'vitest'
import { CHEVRON, MOON, shapeAt, turnAt, ease } from './moon'

describe('the chevron and the moon', () => {
  it('share 136 matched points, so every frame between them is a real shape', () => {
    expect(CHEVRON).toHaveLength(136)
    expect(MOON).toHaveLength(136)
    for (const [x, y] of [...CHEVRON, ...MOON]) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(24)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(24)
    }
  })

  it('draw as closed paths, the chevron at 0 and the moon at 1', () => {
    expect(shapeAt(0)).toMatch(/^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+){135}Z$/)
    expect(shapeAt(0)).not.toBe(shapeAt(1))
    expect(shapeAt(0.5)).not.toBe(shapeAt(0))
  })

  it('turn up to 14 degrees in the middle, and none at the ends', () => {
    expect(turnAt(0)).toBeCloseTo(0)
    expect(turnAt(1)).toBeCloseTo(0)
    expect(turnAt(0.5)).toBeCloseTo(-14)
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeCloseTo(0.5)
  })
})
