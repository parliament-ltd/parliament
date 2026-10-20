import { describe, it, expect } from 'vitest'
import { detectFeatures, popKind } from './features'

describe('feature detection', () => {
  it('finds what a browser has, by the feature and never the name', () => {
    const chromeLike = {
      documentPictureInPicture: { requestWindow() {} },
      getScreenDetails() {},
      navigator: { storage: { persist() {} }, locks: { request() {} }, userAgent: 'Firefox' },
      BroadcastChannel: function () {},
      CompressionStream: function () {},
      crypto: { subtle: { encrypt() {} } },
    }
    expect(detectFeatures(chromeLike)).toEqual({ onTop: true, screens: true, persist: true, channel: true, locks: true, compression: true, crypto: true })
  })

  it('reports what is missing, as in Firefox, LibreWolf and Zen today', () => {
    const firefoxLike = {
      navigator: { storage: { persist() {} }, locks: { request() {} }, userAgent: 'Chrome' },
      BroadcastChannel: function () {},
      CompressionStream: function () {},
      crypto: { subtle: { encrypt() {} } },
    }
    const f = detectFeatures(firefoxLike)
    expect(f.onTop).toBe(false)
    expect(f.screens).toBe(false)
    expect(f.persist).toBe(true)
    expect(popKind(f)).toBe('ordinary')
  })

  it('copes with a bare global', () => {
    expect(Object.values(detectFeatures({})).every((v) => v === false)).toBe(true)
  })

  it('runs against the real global without throwing', () => {
    expect(typeof detectFeatures().crypto).toBe('boolean')
  })
})
