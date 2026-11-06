import { describe, it, expect, vi } from 'vitest'
import { reloadIntoWaiting } from './swUpdate'

function worker() {
  const on = {}
  return {
    state: 'installed',
    sent: [],
    postMessage(m) { this.sent.push(m) },
    addEventListener(type, fn) { on[type] = fn },
    become(state) { this.state = state; on.statechange?.() },
  }
}
const navWith = (waiting) => ({ serviceWorker: { getRegistration: async () => ({ waiting }) } })

describe('reloadIntoWaiting (C294 (c))', () => {
  it('asks the waiting version to start, and reloads once it runs', async () => {
    const w = worker()
    const reload = vi.fn()
    const later = vi.fn()
    expect(await reloadIntoWaiting({ nav: navWith(w), reload, later })).toBe('waiting')
    expect(w.sent).toEqual([{ type: 'SKIP_WAITING' }])
    expect(reload).not.toHaveBeenCalled()
    w.become('activating')
    expect(reload).not.toHaveBeenCalled()
    w.become('activated')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads after a while even if the version never says it runs, and only once', async () => {
    const w = worker()
    const reload = vi.fn()
    let fallback
    await reloadIntoWaiting({ nav: navWith(w), reload, later: (fn) => { fallback = fn } })
    fallback()
    w.become('activated')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads at once when nothing is waiting, or the browser cannot say', async () => {
    const reload = vi.fn()
    expect(await reloadIntoWaiting({ nav: navWith(null), reload, later: vi.fn() })).toBe('now')
    expect(await reloadIntoWaiting({ nav: {}, reload, later: vi.fn() })).toBe('now')
    const failing = { serviceWorker: { getRegistration: async () => { throw new Error('no') } } }
    expect(await reloadIntoWaiting({ nav: failing, reload, later: vi.fn() })).toBe('now')
    expect(reload).toHaveBeenCalledTimes(3)
  })
})
