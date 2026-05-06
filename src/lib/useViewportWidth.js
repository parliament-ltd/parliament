// useViewportWidth — small hook for route-level responsive decisions (PR-15).
//
// Most responsive behavior in Parliament is CSS-driven (media queries in
// src/index.css), which is the right tool when the change is cosmetic
// (hide a column, swap a grid, drop a label). This hook covers the cases
// where the decision is route- or render-level and CSS can't reach: the
// editor's "needs wider screen" gate (PR-15) replaces the entire view
// instead of restyling it, and PR-16's room-layout narrow modes will
// branch on the same threshold to swap rail composition entirely.
//
// SSR-safe via the `typeof window` guard even though Parliament has no
// SSR — costs nothing and keeps the hook portable if a renderer ever
// shows up at build time.

import { useEffect, useState } from 'react'

export function useIsNarrow(threshold = 768) {
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < threshold
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsNarrow(window.innerWidth < threshold)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [threshold])

  return isNarrow
}
