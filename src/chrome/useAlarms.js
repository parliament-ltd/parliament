import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSetting } from '../lib/db'
import { tabBus } from '../lib/bus'
import { ordered, nextOf, settle, rung, later, tidy, isAlarm, AWAY_MS } from '../lib/alarms'

// The alarms ringing (C303 (a), ruled 16 November; parliament-alarms-v1.html
// §3, §4). One timer, for the next alarm, never longer than a minute so a
// clock changed or a computer woken is caught; checked again whenever the tab
// is seen. Several tabs open: they take turns under one lock, each reading the
// alarms as stored before it rings, so only one rings. Other tabs hear by a
// signal alone. A break counts work: the page in use, the count starting over
// after ten minutes away.
//
// alarms, quiet: as in the settings; save(list): stores them (settings),
// and tells the other tabs.

const LOCK = 'parliament-alarms'
const withLock = (fn) => (typeof navigator !== 'undefined' && navigator.locks?.request ? navigator.locks.request(LOCK, fn) : fn())

// A short chime, made here: two soft notes. Nothing fetched.
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const note = (freq, start) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime + start)
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.6)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + start)
      o.stop(ctx.currentTime + start + 0.65)
    }
    note(880, 0)
    note(660, 0.32)
    setTimeout(() => ctx.close().catch(() => {}), 1500)
  } catch { /* no sound here */ }
}

export function useAlarms({ alarms: stored, quiet, save: saveGiven, words }) {
  const alarms = useMemo(() => (Array.isArray(stored) ? stored.filter(isAlarm) : []), [stored])
  // The same list, and the same save, from render to render: the bar reads
  // the alarms, and a list new each time would draw it again and again.
  const list = useMemo(() => ordered(alarms), [alarms])
  const saveRef = useRef(saveGiven)
  useEffect(() => { saveRef.current = saveGiven })
  const save = useCallback((l, o) => saveRef.current(l, o), [])
  const now = useRef(alarms)
  useEffect(() => { now.current = alarms }, [alarms])
  const [ringing, setRinging] = useState([])
  const active = useRef(Date.now())
  const title = useRef(null)
  const wordsNow = useRef(words)
  useEffect(() => { wordsNow.current = words })

  const ring = useCallback((list) => {
    if (!list.length) return
    setRinging((was) => [...was.filter((r) => !list.some((a) => a.id === r.id)), ...list.map((a) => ({ id: a.id, name: a.name, kind: a.kind, minutes: a.minutes ?? null, at: new Date().toISOString() }))])
    if (!quiet) chime()
    const w = wordsNow.current
    const name = list[0].name || w.alarm
    if (typeof document !== 'undefined' && document.hidden) {
      if (title.current == null) title.current = document.title
      document.title = w.title(name)
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(name, { body: w.body(list[0]), tag: `parliament-alarm-${list[0].id}`, silent: true }) } catch { /* not here */ }
    }
  }, [quiet])

  // Brought up to now, under the lock, from the alarms as stored.
  const check = useCallback(async ({ opened = false, returned = false } = {}) => {
    await withLock(async () => {
      const read = await getSetting('alarms').catch(() => null)
      const list = (Array.isArray(read) ? read : now.current).filter(isAlarm)
      const at = new Date()
      const { alarms: next, due } = settle(tidy(list, at), { now: at, active: new Date(active.current), opened, returned })
      const after = next.map((a) => (due.some((d) => d.id === a.id) ? rung(a, at) : a))
      if (JSON.stringify(after) !== JSON.stringify(list)) await save(after, { quietly: false })
      ring(due)
    })
  }, [save, ring])

  // The page opened: what rang while it was closed shows as rung.
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current) return
    opened.current = true
    check({ opened: true })
  }, [check])

  // One timer, for the next alarm, at most a minute.
  const next = useMemo(() => nextOf(alarms), [alarms])
  useEffect(() => {
    if (!next) return undefined
    const wait = Math.max(250, Math.min(60_000, Date.parse(next.at) - Date.now() + 50))
    const t = setTimeout(() => { check() }, wait)
    return () => clearTimeout(t)
  }, [next, check])

  // Seen again, used again, told by another tab.
  useEffect(() => {
    const seen = () => {
      if (document.hidden) return
      if (title.current != null) { document.title = title.current; title.current = null }
      check()
    }
    let last = 0
    const used = () => {
      const t = Date.now()
      if (t - last < 5000) return
      last = t
      const back = t - active.current >= AWAY_MS
      active.current = t
      if (back && now.current.some((a) => a.on && !a.rang && a.kind === 'every')) check({ returned: true })
    }
    document.addEventListener('visibilitychange', seen)
    window.addEventListener('pointerdown', used, true)
    window.addEventListener('keydown', used, true)
    const off = tabBus().on((s) => {
      if (s.type !== 'alarms') return
      getSetting('alarms').then((read) => { if (Array.isArray(read)) save(read, { quietly: true }) }).catch(() => {})
    })
    return () => {
      document.removeEventListener('visibilitychange', seen)
      window.removeEventListener('pointerdown', used, true)
      window.removeEventListener('keydown', used, true)
      off()
    }
  }, [check, save])

  const stop = useCallback((id) => setRinging((was) => was.filter((r) => r.id !== id)), [])
  const fiveMore = useCallback(async (id, ms = 5 * 60_000) => {
    setRinging((was) => was.filter((r) => r.id !== id))
    const list = now.current.map((a) => (a.id === id ? later(a, ms) : a))
    await save(list, { quietly: false })
  }, [save])

  return { alarms: list, next, ringing, stop, fiveMore }
}
