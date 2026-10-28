import { describe, it, expect } from 'vitest'
import { browserAbilities, ABILITIES } from './thisBrowser'

describe('this browser (C272 (f))', () => {
  it('finds each thing by trying it, and says which work', async () => {
    const none = await browserAbilities({ g: {} })
    expect(none.map((a) => a.id)).toEqual(ABILITIES)
    expect(none.every((a) => !a.works)).toBe(true)
    const g = {
      documentPictureInPicture: { requestWindow() {} }, getScreenDetails() {}, navigator: { storage: { persist() {} }, locks: { request() {} } },
      BroadcastChannel: function B() {}, CompressionStream: function C() {}, crypto: { subtle: { encrypt() {} } }, trustedTypes: { createPolicy() {} },
    }
    const all = await browserAbilities({ g, voice: async () => 'downloadable', passkeys: async () => true })
    expect(all.every((a) => a.works)).toBe(true)
    expect((await browserAbilities({ g, voice: async () => { throw new Error('no') } })).find((a) => a.id === 'voice').works).toBe(false)
  })
})
