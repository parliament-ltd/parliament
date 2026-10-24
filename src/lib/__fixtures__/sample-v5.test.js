import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { getEntry } from '../../catalog'
import { getLayoutEntry } from '../../catalog/layouts'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }) }))

// The sample backup is read by /dev/migration's "Read the sample", and a
// trial copy made from it should draw its rooms (C204). The room drawing
// looks refs up as name@major.minor, so the same spelling is read here.
const sample = JSON.parse(readFileSync(new URL('./sample-v5.json', import.meta.url), 'utf8'))
const key = (ref) => ref.replace(/@[\^~]?(\d+\.\d+)(\.0)?$/, '@$1')

describe('the sample backup', () => {
  it('has rooms that draw: a registered layout, and the messages and input blocks in its slots', () => {
    expect(sample.contents.rooms.length).toBeGreaterThan(0)
    for (const room of sample.contents.rooms) {
      const layout = getLayoutEntry(key(room.layout.ref))
      expect(layout, room.id).toBeTruthy()
      const slots = new Set(layout.slots.map((s) => s.id))
      for (const block of room.components) {
        expect(getEntry(key(block.ref)), `${room.id} ${block.ref}`).toBeTruthy()
        expect(slots.has(block.slot), `${room.id} ${block.slot}`).toBe(true)
      }
      expect(room.components.map((b) => key(b.ref))).toEqual(expect.arrayContaining(['messages@1.0', 'input@1.0']))
    }
  })
})
