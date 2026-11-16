import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { passageAt } from '../../editing/comments'
import { NOTE_MAX } from '../../lib/cardActs'

// The COMMENT box (C301 (c); parliament-comments-v1.html, section 2): Ctrl+Alt+M
// on selected words opens it at the passage. Enter keeps the comment on those
// words, Escape drops it. A comment is for people and is never sent.

/**
 * @param {{ current: import('prosemirror-view').EditorView|null }} viewRef
 * @param {(c: { messageId: string, passage: string, nth: number, text: string }) => void} onKept
 * @param {{ label: string, placeholder: string, keys: string }} words
 * @param {(line: string) => void} say what is said under the text when no box opens
 * @param {{ pick: string, block: string }} why its words
 * @param {string|null} [messageId] a reply edited on its own: its message
 */
export function useCommentBox(viewRef, onKept, words, say, why, messageId = null) {
  const [box, setBox] = useState(null)
  const input = useRef(null)
  const keptRef = useRef(onKept)
  const sayRef = useRef(say)
  const whyRef = useRef(why)
  useEffect(() => { keptRef.current = onKept; sayRef.current = say; whyRef.current = why })
  const close = useCallback(() => {
    setBox(null)
    viewRef.current?.focus()
  }, [viewRef])
  const open = useCallback((view) => {
    const at = passageAt(view.state, messageId)
    if (!at) { sayRef.current?.(whyRef.current?.pick ?? ''); return true }
    if (at.why) { sayRef.current?.(whyRef.current?.block ?? ''); return true }
    const c = view.coordsAtPos(at.to)
    sayRef.current?.('')
    setBox({ x: c.left, y: c.bottom + 6, ...at })
    setTimeout(() => input.current?.focus(), 0)
    return true
  }, [messageId])
  const keep = (value) => {
    const text = String(value ?? '').trim().slice(0, NOTE_MAX)
    if (box && text) keptRef.current?.({ messageId: box.messageId, passage: box.passage, nth: box.nth, text })
    close()
  }
  const element = box && (
    <div className="p-ask-box p-cm-box" role="dialog" aria-label={words.label} style={{ left: box.x, top: box.y }}>
      <span className="p-ask-label">{words.label}</span>
      <input
        ref={input}
        type="text"
        maxLength={NOTE_MAX}
        placeholder={words.placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); keep(e.currentTarget.value) }
          else if (e.key === 'Escape') { e.preventDefault(); close() }
        }}
        onBlur={(e) => { if (!e.currentTarget.value.trim()) setBox(null) }}
      />
      <span className="p-cm-keys">{words.keys}</span>
    </div>
  )
  const options = useMemo(() => ({ onComment: (view) => open(view) }), [open])
  return { element, options }
}
