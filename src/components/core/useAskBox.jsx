import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startAsk, newAskId } from '../../editing/asks'

// The ASK box of a reply edited in place (stage 11, piece 4; the editing
// spec, "Asks"; C218): opened with Ctrl+Shift+K on the selected words, or at
// the cursor for a point, or from ask: in the bar (C218 (a), option 2). The
// person writes the ask in their own words; Enter keeps it (the passage
// marked, a marker after it), Escape drops it. Nothing goes anywhere until
// the next prompt to the branch.

// The editor last in focus: ask: in the bar acts there, on the selection it
// kept when the bar took the focus.
let lastFocused = null
const MAX = 1000

/**
 * @param {{ current: import('prosemirror-view').EditorView|null }} viewRef
 * @param {(id: string, question: string) => void} onKept called once an ask is kept
 * @param {{ label: string, placeholder: string }} words
 * @param {(state: import('prosemirror-state').EditorState) => boolean} [canAsk]
 *   false where the selection is not in a reply
 */
export function useAskBox(viewRef, onKept, words, canAsk) {
  const [box, setBox] = useState(null)
  const input = useRef(null)
  const me = useRef({})
  const keptRef = useRef(onKept)
  const canRef = useRef(canAsk)
  useEffect(() => { keptRef.current = onKept; canRef.current = canAsk })
  const close = useCallback(() => {
    setBox(null)
    viewRef.current?.focus()
  }, [viewRef])
  const open = useCallback((view) => {
    const sel = view.state.selection
    const c = view.coordsAtPos(sel.to)
    setBox({ x: c.left, y: c.bottom + 6, from: sel.from, to: sel.to })
    setTimeout(() => input.current?.focus(), 0)
    return true
  }, [])
  // Keeps an ask on a range of the editor: its question first, so the save
  // that follows has it.
  const keepAt = useCallback((v, range, question) => {
    const text = String(question ?? '').trim().slice(0, MAX)
    if (!v || !text) return false
    const id = newAskId()
    keptRef.current?.(id, text)
    v.dispatch(startAsk(v.state, id, range))
    return true
  }, [])
  const keep = (question) => {
    // On the selection as it was when the box opened.
    if (box) keepAt(viewRef.current, { from: box.from, to: box.to }, question)
    close()
  }

  useEffect(() => {
    const token = me.current
    const onFocus = (e) => {
      const dom = viewRef.current?.dom
      if (dom && dom.contains(e.target)) lastFocused = token
    }
    // ask: from the bar. detail.taken says back whether it was done here.
    const onBarAsk = (e) => {
      const detail = e.detail
      if (!detail || detail.taken || lastFocused !== token) return
      const v = viewRef.current
      if (!v || !v.dom.isConnected) return
      if (canRef.current && !canRef.current(v.state)) { detail.taken = 'askNotPrompt'; return }
      detail.taken = true
      if (detail.question) keepAt(v, v.state.selection, detail.question)
      else open(v)
    }
    document.addEventListener('focusin', onFocus)
    window.addEventListener('parliament-ask', onBarAsk)
    return () => {
      document.removeEventListener('focusin', onFocus)
      window.removeEventListener('parliament-ask', onBarAsk)
      if (lastFocused === token) lastFocused = null
    }
  }, [viewRef, keepAt, open])

  const element = box && (
    <div className="p-ask-box" role="dialog" aria-label={words.label} style={{ left: box.x, top: box.y }}>
      <span className="p-ask-label">{words.label}</span>
      <input
        ref={input}
        type="text"
        maxLength={MAX}
        placeholder={words.placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); keep(e.currentTarget.value) }
          else if (e.key === 'Escape') { e.preventDefault(); close() }
        }}
        onBlur={(e) => { if (!e.currentTarget.value.trim()) setBox(null) }}
      />
    </div>
  )
  const options = useMemo(() => ({ onAsk: (view) => open(view) }), [open])
  return { options, element, close }
}
