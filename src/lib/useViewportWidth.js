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
//
// A room hosted as a board on the shell is often narrower than the window.
// The board says so through RoomHost, and then the room's own width
// decides, not the window's: a narrow room draws the narrow form its layout
// has, the conversation first (C126).
//
// The board also says which form the room takes (roomForm.js; C279 (b)):
// its columns open, as strips beside a chat that takes its width, or its
// narrow form. A room drawn anywhere else is open, or narrow by the window.

import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Set by a board that hosts a room, from the room's own width and whether it
 * has the screen to itself: { narrow, form, alone, systemFor }. narrow is
 * form === 'narrow', for what reads only that.
 */
export const RoomHost = createContext(null)

export function useIsNarrow(threshold = 768) {
  const host = useContext(RoomHost)
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

  return host ? host.narrow : isNarrow
}

/**
 * Which form a room's layout takes (roomForm.js): its board's, or, drawn
 * anywhere else, open unless the window is narrow.
 * @returns {'open'|'strips'|'narrow'}
 */
export function useRoomForm() {
  const host = useContext(RoomHost)
  const narrow = useIsNarrow(768)
  if (host?.form) return host.form
  return narrow ? 'narrow' : 'open'
}
