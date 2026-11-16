// Alarms (C303 (a), ruled 16 November: "Yes, build both"; parliament-alarms-
// v1.html). Three kinds: a timer (in), a time of day (at), and a break after
// so much work (every), whose count starts over after ten minutes away. Kept
// on this device, in the settings (alarms), never in a backup. Each is the
// time it rings, never a count, as a browser slows timers in a tab out of
// sight. Pure, so it is tested alone; the ringing is the page's.

export const NAME_MOST = 200
export const ALARMS_MOST = 50
/** Away this long, and a break's count starts over: you took your break. */
export const AWAY_MS = 10 * 60_000
const MINUTE = 60_000

/**
 * A length of time as people write it: 25m, 1h30, 1h30m, 90s, 2h, 25
 * (minutes), 25 min. In milliseconds, or null.
 */
export function durationOf(text) {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, '')
  if (!t) return null
  let ms = null
  let m
  if ((m = /^(\d{1,4})(?:m|min|mins|minute|minutes)?$/.exec(t))) ms = Number(m[1]) * MINUTE
  // "1h30": the bare number after hours is minutes.
  else if ((m = /^(\d{1,3})(?:h|hr|hrs|hour|hours)(?:(\d{1,2})(?:m|min|mins|minute|minutes)?)?$/.exec(t))) ms = (Number(m[1]) * 60 + Number(m[2] ?? 0)) * MINUTE
  else if ((m = /^(\d{1,5})(?:s|sec|secs|second|seconds)$/.exec(t))) ms = Number(m[1]) * 1000
  if (ms == null) return null
  return ms >= 1000 && ms <= 7 * 24 * 60 * MINUTE ? ms : null
}

/**
 * A time of day as people write it: 15:30, 3:30pm, 3pm, 9am, 15.30. The next
 * time it comes, from `now`: today, or tomorrow if it has gone. { at, tomorrow } or null.
 */
export function timeOf(text, now = new Date()) {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, '')
  const m = /^(\d{1,2})(?:[:.](\d{2}))?(am|pm)?$/.exec(t)
  if (!m || (!m[2] && !m[3])) return null
  let h = Number(m[1])
  const min = Number(m[2] ?? 0)
  if (m[3]) {
    if (h < 1 || h > 12) return null
    h = (h % 12) + (m[3] === 'pm' ? 12 : 0)
  }
  if (h > 23 || min > 59) return null
  const at = new Date(now)
  at.setHours(h, min, 0, 0)
  const tomorrow = at.getTime() <= now.getTime()
  if (tomorrow) at.setDate(at.getDate() + 1)
  return { at, tomorrow }
}

const nameOf = (text) => String(text ?? '').replace(/^["“”']+|["“”']+$/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MOST)

/**
 * What alarm: says, its text read: { open } alone; { off, n } (n null for
 * every one); { quiet: true|false }; { later, ms, n }; or { set: { kind,
 * ms | at, tomorrow, name } }; { bad } when it cannot be read.
 */
export function readAlarm(text, now = new Date()) {
  const t = String(text ?? '').trim()
  if (!t) return { open: true }
  const [first, ...rest] = t.split(/\s+/)
  const word = first.toLowerCase()
  if (word === 'off') {
    const n = rest.length ? Number(rest[0]) : null
    if (rest.length && (!Number.isInteger(n) || n < 1)) return { bad: 'alarmHow' }
    return { off: true, n }
  }
  if (word === 'quiet') return rest[0]?.toLowerCase() === 'off' ? { quiet: false } : { quiet: true }
  if (word === 'every') {
    const ms = durationOf(rest[0])
    if (ms == null || ms < MINUTE) return { bad: 'alarmEveryHow' }
    return { set: { kind: 'every', ms, name: nameOf(rest.slice(1).join(' ')) } }
  }
  const time = timeOf(first, now)
  if (time) return { set: { kind: 'at', at: time.at, tomorrow: time.tomorrow, name: nameOf(rest.join(' ')) } }
  const ms = durationOf(first)
  if (ms != null) {
    // alarm:5m 2: the second, five minutes later.
    if (rest.length === 1 && /^\d{1,2}$/.test(rest[0])) return { later: true, ms, n: Number(rest[0]) }
    return { set: { kind: 'in', ms, name: nameOf(rest.join(' ')) } }
  }
  return { bad: 'alarmHow' }
}

/** A new alarm as stored: its id, name, kind, length (minutes) and the time it rings. */
export function makeAlarm({ kind, ms = null, at = null, name = '' }, { id, now = new Date() }) {
  const when = kind === 'at' ? new Date(at) : new Date(now.getTime() + ms)
  return {
    id, name: nameOf(name), kind,
    ...(kind === 'at' ? {} : { minutes: Math.round((ms / MINUTE) * 1000) / 1000 }),
    at: when.toISOString(), on: true, rang: null,
  }
}

const atOf = (a) => Date.parse(a?.at ?? '')
/** The alarms in the order the board shows them: those to ring, soonest first; then those off; then those rung. */
export function ordered(alarms) {
  const rank = (a) => (a.rang ? 2 : a.on ? 0 : 1)
  return [...(alarms ?? [])].sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? atOf(b) - atOf(a) : atOf(a) - atOf(b)))
}

/** The next alarm to ring, or null. */
export const nextOf = (alarms) => ordered(alarms).find((a) => a.on && !a.rang) ?? null

/**
 * The alarms brought up to `now`. active: when the page was last in use;
 * opened: the page has just opened; returned: you have just come back after
 * ten minutes or more away. Returns
 *   due     those to ring now
 *   alarms  the list as it is now: a timer or a time of day missed while the
 *           page was closed is rung, saying when; a break whose time came
 *           while you were away, or with the page closed, or that you have
 *           come back to, counts again from now, with no ring.
 */
export function settle(alarms, { now = new Date(), active = now, opened = false, returned = false } = {}) {
  const t = now.getTime()
  const away = t - active.getTime() >= AWAY_MS
  const due = []
  const next = (alarms ?? []).map((a) => {
    if (!a.on || a.rang) return a
    const at = atOf(a)
    if (a.kind === 'every') {
      if (returned || ((opened || away) && at <= t)) return { ...a, at: new Date(t + a.minutes * MINUTE).toISOString() }
      if (at <= t) due.push(a)
      return a
    }
    if (at > t) return a
    if (opened) return { ...a, rang: a.at, missed: true }
    due.push(a)
    return a
  })
  return { alarms: next, due }
}

/** An alarm rung: a timer or a time of day rang; a break counts again from now. */
export function rung(alarm, now = new Date()) {
  if (alarm.kind === 'every') return { ...alarm, at: new Date(now.getTime() + alarm.minutes * MINUTE).toISOString() }
  return { ...alarm, rang: now.toISOString() }
}

/** "5 more minutes": the same alarm, ringing that much later, from now. */
export function later(alarm, ms, now = new Date()) {
  const base = alarm.rang || atOf(alarm) <= now.getTime() ? now.getTime() : atOf(alarm)
  const { missed, ...rest } = alarm
  void missed
  return { ...rest, at: new Date(base + ms).toISOString(), rang: null, on: true }
}

/** The time left, as the board writes it: 03:12, 1:05:00; negative as 00:00. */
export function leftOf(alarm, now = new Date()) {
  const ms = Math.max(0, atOf(alarm) - now.getTime())
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (x) => String(x).padStart(2, '0')
  return h ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`
}

/** Alarms rung before today, taken off the board: one that rang stays until the next day. */
export function tidy(alarms, now = new Date()) {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return (alarms ?? []).filter((a) => !a.rang || Date.parse(a.rang) >= day.getTime())
}

/** Whether a stored list of alarms is as one is written: checked when read back. */
export function isAlarm(a) {
  return Boolean(a) && typeof a === 'object' && typeof a.id === 'string' && a.id.length <= 64
    && ['in', 'at', 'every'].includes(a.kind) && typeof a.name === 'string' && a.name.length <= NAME_MOST
    && !Number.isNaN(Date.parse(a.at)) && typeof a.on === 'boolean'
    && (a.rang === null || !Number.isNaN(Date.parse(a.rang)))
    && (a.kind === 'at' || (typeof a.minutes === 'number' && a.minutes > 0))
}

/** A length as said: whole minutes, else seconds (a 15-second timer is not 0.25 minutes). */
export const lengthOf = (minutes) => (Number.isInteger(minutes) ? { unit: 'm', amount: minutes } : { unit: 's', amount: Math.round(minutes * 60) })
