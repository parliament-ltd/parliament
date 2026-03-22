import { useState, useRef, useCallback } from 'react'

/**
 * useShimmer — power-on shimmer state machine.
 *
 * Fires once per session when an API key is first validated.
 * Exposes:
 *   triggerShimmer()  — call on first valid key; no-ops if already fired
 *   shimmerPhase      — 0 (idle) | 1 (key input) | 2 (cards) | 3 (nav) | 4 (sidebar)
 *   shimmerDone       — true after the full sequence completes; persists for the session
 */
export function useShimmer() {
  const hasShimmered = useRef(false)
  const [shimmerPhase, setShimmerPhase] = useState(0)
  const [shimmerDone, setShimmerDone] = useState(false)

  const triggerShimmer = useCallback(() => {
    if (hasShimmered.current) return
    hasShimmered.current = true

    setShimmerPhase(1)
    setTimeout(() => setShimmerPhase(2), 200)
    setTimeout(() => setShimmerPhase(3), 400)
    setTimeout(() => setShimmerPhase(4), 500)
    setTimeout(() => {
      setShimmerPhase(0)
      setShimmerDone(true)
    }, 2000)
  }, [])

  return { triggerShimmer, shimmerPhase, shimmerDone }
}
