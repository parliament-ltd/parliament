// How big the screen is, for small screens (stage 14, piece 5; C253 (i),
// C261 (a)): a phone is under 760 pixels wide, or a screen with touch and no
// pointer that hovers, at any width; a narrow window is 760 to 1,100. The
// layout follows the screen as it is now; nothing is stored.

import { useSyncExternalStore } from 'react'

export const PHONE = '(max-width: 759.98px), (hover: none) and (pointer: coarse)'
export const NARROW = '(max-width: 1100px)'

/** 'phone', 'narrow' or 'wide', given a function that answers a media query. */
export function sizeOf(matches) {
  if (matches(PHONE)) return 'phone'
  if (matches(NARROW)) return 'narrow'
  return 'wide'
}

const matchesIn = (g) => (query) => Boolean(g.matchMedia?.(query)?.matches)

function subscribe(onChange) {
  const lists = typeof window.matchMedia === 'function' ? [PHONE, NARROW].map((q) => window.matchMedia(q)) : []
  for (const l of lists) l.addEventListener?.('change', onChange)
  return () => { for (const l of lists) l.removeEventListener?.('change', onChange) }
}

/** The screen's size now, and again whenever it changes. */
export function useScreenSize() {
  return useSyncExternalStore(subscribe, () => sizeOf(matchesIn(window)), () => 'wide')
}

/**
 * What a command that does not fit this screen says instead (C261 (b), (d),
 * (e)), or null when it fits.
 * @param {{ verb: string, match?: { values?: object[] } }[]} steps
 * @param {'phone'|'narrow'|'wide'|undefined} size
 */
export function smallRefusal(steps, size) {
  if (size !== 'phone' && size !== 'narrow') return null
  for (const s of steps) {
    if (s.verb === 'width') return { message: 'smallWidth' }
    if (size !== 'phone') continue
    if (s.verb === 'pop' && s.match?.values?.[0]?.value !== 'back') return { message: 'smallPop' }
    if (s.verb === 'focus') return { message: 'smallFocus' }
    if (s.verb === 'bar' && s.match?.values?.[0]?.value === 'top') return { message: 'smallBar' }
  }
  return null
}
