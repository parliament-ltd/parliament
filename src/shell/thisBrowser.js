// "This browser" in Settings (stage 15, piece 5; C272 (f)): each thing
// Parliament uses, and whether it works here, found by trying each one and
// never by the browser's name (C94). Where one does not, Settings says what
// happens instead. docs/spec/browsers.md is the full table.

import { detectFeatures } from './features'

export const ABILITIES = Object.freeze(['onTop', 'screens', 'persist', 'voice', 'passkeys', 'compression', 'channel', 'trustedTypes'])

/**
 * @param {{ g?: object, voice?: () => Promise<string>, passkeys?: () => Promise<boolean> }} [use]
 *   voice: the on-device speech check; passkeys: whether to offer passkeys
 * @returns {Promise<Array<{ id: string, works: boolean }>>}
 */
export async function browserAbilities({ g = globalThis, voice = async () => 'unavailable', passkeys = async () => false } = {}) {
  const f = detectFeatures(g)
  const voiceNow = await voice().catch(() => 'unavailable')
  const works = {
    onTop: f.onTop,
    screens: f.screens,
    persist: f.persist,
    voice: ['available', 'downloadable', 'downloading'].includes(voiceNow),
    passkeys: Boolean(await passkeys().catch(() => false)),
    compression: f.compression,
    channel: f.channel && f.locks,
    trustedTypes: typeof g.trustedTypes?.createPolicy === 'function',
  }
  return ABILITIES.map((id) => ({ id, works: Boolean(works[id]) }))
}
