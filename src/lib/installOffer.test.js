import { describe, it, expect, beforeEach } from 'vitest'
import { catchInstallOffer, installOffer, onInstallOffer, takeInstallOffer, installedHere, _reset } from './installOffer'

// The browser's offer to install Parliament, caught as the page starts (C294).
describe('the offer to install', () => {
  beforeEach(() => _reset())
  const fakeWindow = () => {
    const handlers = {}
    return { addEventListener: (t, fn) => { handlers[t] = fn }, fire: (t, e) => handlers[t]?.(e) }
  }
  it('is kept from the moment it comes, before anything is drawn, and used once', () => {
    const win = fakeWindow()
    catchInstallOffer(win)
    let prevented = false
    const offer = { preventDefault: () => { prevented = true } }
    const heard = []
    onInstallOffer((o) => heard.push(o))
    win.fire('beforeinstallprompt', offer)
    expect(prevented).toBe(true)
    expect(installOffer()).toBe(offer)
    expect(takeInstallOffer()).toBe(offer)
    expect(installOffer()).toBeNull()
    expect(heard).toEqual([offer, null])
  })
  it('is gone once the app is installed', () => {
    const win = fakeWindow()
    catchInstallOffer(win)
    win.fire('beforeinstallprompt', { preventDefault() {} })
    win.fire('appinstalled')
    expect(installOffer()).toBeNull()
  })
  it('knows the app is installed where the browser says so, and says no where it cannot tell', async () => {
    expect(await installedHere({ getInstalledRelatedApps: async () => [{ platform: 'webapp' }] })).toBe(true)
    expect(await installedHere({ getInstalledRelatedApps: async () => [] })).toBe(false)
    expect(await installedHere({})).toBe(false)
    expect(await installedHere({ getInstalledRelatedApps: async () => { throw new Error('no') } })).toBe(false)
  })
})
