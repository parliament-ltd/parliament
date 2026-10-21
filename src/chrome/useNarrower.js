// How wide a board is, from its own width rather than the window's, since
// boards share the width of the space and can be stretched (C126). Each
// hook answers in steps, so a board draws again only when its width crosses
// one, not on every pixel of a stretch.

import { useLayoutEffect, useState } from 'react'

/**
 * How many of `edges` (in pixels, rising) the element the returned ref is
 * set on is at least as wide as: 0 below the first, edges.length at or past
 * the last. Kept current as it is stretched.
 * @param {number[]} edges
 * @returns {[(el: HTMLElement|null) => void, number]}
 */
export function useBand(edges) {
  const [el, setEl] = useState(null)
  const [band, setBand] = useState(edges.length)
  const key = edges.join(',')
  useLayoutEffect(() => {
    if (!el) return undefined
    const limits = key.split(',').map(Number)
    const look = () => {
      const width = el.clientWidth
      if (width > 0) setBand(limits.filter((px) => width >= px).length)
    }
    look()
    if (typeof ResizeObserver === 'undefined') return undefined
    const watch = new ResizeObserver(look)
    watch.observe(el)
    return () => watch.disconnect()
  }, [el, key])
  return [setEl, band]
}

/**
 * Whether the element the returned ref is set on is narrower than `px`,
 * kept current as it is stretched.
 * @param {number} px
 * @returns {[(el: HTMLElement|null) => void, boolean]}
 */
export function useNarrower(px) {
  const [ref, band] = useBand([px])
  return [ref, band === 0]
}
