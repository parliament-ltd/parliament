// Whether a board is narrower than it needs, from its own width rather than
// the window's, since boards share the width of the space and can be
// stretched (C126).

import { useLayoutEffect, useState } from 'react'

/**
 * Whether the element the returned ref is set on is narrower than `px`,
 * kept current as it is stretched.
 * @param {number} px
 * @returns {[(el: HTMLElement|null) => void, boolean]}
 */
export function useNarrower(px) {
  const [el, setEl] = useState(null)
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    if (!el) return undefined
    const look = () => setNarrow(el.clientWidth > 0 && el.clientWidth < px)
    look()
    if (typeof ResizeObserver === 'undefined') return undefined
    const watch = new ResizeObserver(look)
    watch.observe(el)
    return () => watch.disconnect()
  }, [el, px])
  return [setEl, narrow]
}
