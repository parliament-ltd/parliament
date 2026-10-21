import { describe, it, expect } from 'vitest'
import { dayOf, agoOf } from './when'

const now = Date.parse('2026-10-21T12:00:00Z')
const en = { locale: 'en' }
const sv = { locale: 'sv' }

describe('dates in the Almanac', () => {
  it('writes the day, with the year only when it is not this year', () => {
    expect(dayOf(en, '2026-10-20T12:00:00Z', now)).toBe('Oct 20')
    expect(dayOf(en, '2025-03-02T12:00:00Z', now)).toBe('Mar 2, 2025')
    expect(dayOf(sv, '2026-10-20T12:00:00Z', now)).toMatch(/^20 okt/)
    expect(dayOf(en, 'not a date', now)).toBe('')
  })

  it('says how long ago within a week, then the day', () => {
    expect(agoOf(en, '2026-10-21T11:59:40Z', now)).toBe('now')
    expect(agoOf(en, '2026-10-21T11:45:00Z', now)).toBe('15 minutes ago')
    expect(agoOf(en, '2026-10-21T10:00:00Z', now)).toBe('2 hours ago')
    expect(agoOf(en, '2026-10-20T10:00:00Z', now)).toBe('yesterday')
    expect(agoOf(en, '2026-10-10T10:00:00Z', now)).toBe('Oct 10')
    expect(agoOf(sv, '2026-10-21T10:00:00Z', now)).toMatch(/2 timmar sedan/)
  })
})
