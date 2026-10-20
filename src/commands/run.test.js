import { describe, it, expect } from 'vitest'
import { runLine } from './run'

const steps = [{ verb: 'bar' }, { verb: 'open' }, { verb: 'pop' }]

describe('running a line of commands (C99)', () => {
  it('runs every command, left to right', async () => {
    const order = []
    const result = await runLine(steps, (s) => { order.push(s.verb); return { ok: true } })
    expect(order).toEqual(['bar', 'open', 'pop'])
    expect(result).toEqual({ ok: true, done: steps })
  })

  it('stops at the first that fails and says which did not run', async () => {
    const order = []
    const result = await runLine(steps, async (s) => {
      order.push(s.verb)
      return s.verb === 'open' ? { ok: false, error: 'no such board' } : { ok: true }
    })
    expect(order).toEqual(['bar', 'open'])
    expect(result).toEqual({ ok: false, done: [steps[0]], stopped: steps[1], error: 'no such board', skipped: [steps[2]] })
  })

  it('treats an action that throws as a failure', async () => {
    const result = await runLine(steps, (s) => { if (s.verb === 'bar') throw new Error('boom'); return { ok: true } })
    expect(result.ok).toBe(false)
    expect(result.stopped).toBe(steps[0])
    expect(result.error.message).toBe('boom')
    expect(result.skipped).toEqual(steps.slice(1))
  })

  it('makes the whole line one undo step, whether it finishes or stops', async () => {
    const calls = []
    const undo = { begin: () => calls.push('begin'), end: (r) => calls.push(`end ${r.ok}`) }
    await runLine(steps, () => ({ ok: true }), undo)
    await runLine(steps, (s) => ({ ok: s.verb !== 'pop' }), undo)
    expect(calls).toEqual(['begin', 'end true', 'begin', 'end false'])
  })
})
