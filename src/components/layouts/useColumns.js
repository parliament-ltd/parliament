// Which of a room's side columns are open (C279 (b)). Each room starts as its
// form says (roomForm.js): open alone on screen, closed as strips; and starts
// again whenever its form changes, so a room that comes to share the screen
// closes its columns, and opens them again once it is alone. Nothing is
// remembered.
//
// As strips, an open column lies over the chat's edge, and Escape, its button
// again or a click on the chat closes it. Escape is the room's while the focus
// is in it, or nowhere; the bar's own Escape comes first.

import { useCallback, useEffect, useRef, useState } from 'react'
import { columnsAt, toggleColumn } from '../../lib/roomForm'

/**
 * @param {'open'|'strips'|'narrow'} form
 * @returns {{ open: { left: boolean, right: boolean }, toggle: (side: 'left'|'right') => void,
 *   close: () => void, over: boolean, root: { current: HTMLElement|null } }}
 *   over: a strip is open over the chat; root: for the layout's outer element
 */
export function useColumns(form) {
  const [held, setHeld] = useState(() => ({ form, ...columnsAt(form) }))
  // A new form starts its columns again.
  if (held.form !== form) setHeld({ form, ...columnsAt(form) })
  const open = held.form === form ? { left: held.left, right: held.right } : columnsAt(form)
  const toggle = useCallback((side) => setHeld((h) => ({ form: h.form, ...toggleColumn(h, side, h.form) })), [])
  const close = useCallback(() => setHeld((h) => ({ form: h.form, left: false, right: false })), [])
  const over = form === 'strips' && (open.left || open.right)

  const root = useRef(null)
  useEffect(() => {
    const el = root.current
    if (!over || !el) return undefined
    const doc = el.ownerDocument
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const at = doc.activeElement
      if (at && at !== doc.body && !el.contains(at)) return
      e.preventDefault()
      // From inside an open column, back to its button, as the column closes.
      const column = at && at !== doc.body ? at.closest('[data-column]') : null
      setHeld((h) => ({ form: h.form, left: false, right: false }))
      column?.querySelector(':scope > .layout-panel-toggle')?.focus()
    }
    doc.addEventListener('keydown', onKey)
    return () => doc.removeEventListener('keydown', onKey)
  }, [over])

  return { open, toggle, close, over, root }
}
