import { describe, it, expect } from 'vitest'
import { durationOf, timeOf, readAlarm, makeAlarm, ordered, nextOf, settle, rung, later, leftOf, tidy, isAlarm, AWAY_MS } from './alarms'

// Alarms (C303 (a)): a timer, a time of day, a break after so much work.
const now = new Date(2026, 10, 16, 14, 12, 0)
const MIN = 60_000

describe('times as people write them', () => {
  it('reads lengths', () => {
    expect(durationOf('25m')).toBe(25 * MIN)
    expect(durationOf('1h30')).toBe(90 * MIN)
    expect(durationOf('1h30m')).toBe(90 * MIN)
    expect(durationOf('90s')).toBe(90_000)
    expect(durationOf('25')).toBe(25 * MIN)
    expect(durationOf('25 min')).toBe(25 * MIN)
    expect(durationOf('soon')).toBe(null)
    expect(durationOf('0m')).toBe(null)
  })

  it('reads times of day, tomorrow when gone', () => {
    expect(timeOf('15:30', now)).toMatchObject({ tomorrow: false })
    expect(timeOf('15:30', now).at.getHours()).toBe(15)
    expect(timeOf('3:30pm', now).at.getHours()).toBe(15)
    expect(timeOf('9am', now)).toMatchObject({ tomorrow: true })
    expect(timeOf('25:00', now)).toBe(null)
    expect(timeOf('15', now)).toBe(null)
  })

  it('reads what alarm: says', () => {
    expect(readAlarm('')).toEqual({ open: true })
    expect(readAlarm('25m tea')).toMatchObject({ set: { kind: 'in', ms: 25 * MIN, name: 'tea' } })
    expect(readAlarm('15:30 "Call Anna"', now)).toMatchObject({ set: { kind: 'at', name: 'Call Anna', tomorrow: false } })
    expect(readAlarm('every 50m "Take a break"')).toMatchObject({ set: { kind: 'every', ms: 50 * MIN, name: 'Take a break' } })
    expect(readAlarm('off 2')).toEqual({ off: true, n: 2 })
    expect(readAlarm('off')).toEqual({ off: true, n: null })
    expect(readAlarm('5m 2')).toEqual({ later: true, ms: 5 * MIN, n: 2 })
    expect(readAlarm('quiet')).toEqual({ quiet: true })
    expect(readAlarm('quiet off')).toEqual({ quiet: false })
    expect(readAlarm('every 10s')).toEqual({ bad: 'alarmEveryHow' })
    expect(readAlarm('whenever')).toEqual({ bad: 'alarmHow' })
  })
})

describe('the alarms over time', () => {
  const tea = makeAlarm({ kind: 'in', ms: 25 * MIN, name: 'Tea' }, { id: 'a1', now })
  const anna = makeAlarm({ kind: 'at', at: new Date(2026, 10, 16, 15, 30), name: 'Call Anna' }, { id: 'a2', now })
  const breaks = makeAlarm({ kind: 'every', ms: 50 * MIN, name: 'Take a break' }, { id: 'a3', now })

  it('orders them soonest first, then off, then rung', () => {
    const off = { ...anna, id: 'a4', on: false }
    const gone = { ...tea, id: 'a5', rang: now.toISOString() }
    expect(ordered([gone, off, anna, breaks, tea]).map((a) => a.id)).toEqual(['a1', 'a3', 'a2', 'a4', 'a5'])
    expect(nextOf([anna, tea]).id).toBe('a1')
    expect(isAlarm(tea) && isAlarm(anna) && isAlarm(breaks)).toBe(true)
    expect(isAlarm({ ...tea, kind: 'soon' })).toBe(false)
  })

  it('rings a timer when its time comes, and marks one missed while closed', () => {
    const at = new Date(now.getTime() + 25 * MIN)
    expect(settle([tea], { now: at }).due.map((a) => a.id)).toEqual(['a1'])
    const missed = settle([tea], { now: at, opened: true })
    expect(missed.due).toEqual([])
    expect(missed.alarms[0]).toMatchObject({ rang: tea.at, missed: true })
    expect(rung(tea, at).rang).toBe(at.toISOString())
  })

  it('counts a break by work: away ten minutes, or closed, it starts over with no ring', () => {
    const at = new Date(now.getTime() + 50 * MIN)
    expect(settle([breaks], { now: at, active: at }).due.map((a) => a.id)).toEqual(['a3'])
    const away = settle([breaks], { now: at, active: new Date(at.getTime() - AWAY_MS) })
    expect(away.due).toEqual([])
    expect(Date.parse(away.alarms[0].at)).toBe(at.getTime() + 50 * MIN)
    const back = settle([breaks], { now: new Date(now.getTime() + 20 * MIN), returned: true })
    expect(Date.parse(back.alarms[0].at)).toBe(now.getTime() + 70 * MIN)
    // Rung, it counts again from then.
    expect(Date.parse(rung(breaks, at).at)).toBe(at.getTime() + 50 * MIN)
  })

  it('rings five minutes later, says the time left, and clears those rung before today', () => {
    const at = new Date(now.getTime() + 25 * MIN)
    const again = later(rung(tea, at), 5 * MIN, at)
    expect(again).toMatchObject({ rang: null, on: true })
    expect(Date.parse(again.at)).toBe(at.getTime() + 5 * MIN)
    expect(leftOf(tea, new Date(now.getTime() + 21 * MIN + 48_000))).toBe('03:12')
    expect(leftOf(anna, now)).toBe('1:18:00')
    const yesterday = { ...tea, rang: new Date(2026, 10, 15, 9).toISOString() }
    expect(tidy([yesterday, anna], now).map((a) => a.id)).toEqual(['a2'])
  })
})
