import { useCallback, useMemo, useRef } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import EditableMessages from '../components/core/EditableMessages'
import { draftWords } from '../lib/writing'

// An empty room is a page you type into (C301 (f); ruled 16 November). What
// you write is your own text: never sent by itself, marked like any reply,
// its prompts answered in it. Nothing is kept until you pause: then its chat
// is made, numbered and titled from its first words here, with nothing sent,
// and the room shows it, the caret where you left it. A prompt typed in the
// bar, with nothing written here, starts a chat as before.
//
// While the chat is being made, what you type waits, and is typed into your
// text once the room shows it.

const NEW = 'new-writing'
const NO_WORDS = Object.freeze({ joined: '', label: '' })

/**
 * @param {{ onStart: (saved: { blocks: object[], content: string, typed: () => string }) => Promise<unknown> }} props
 */
export default function WritePage({ onStart }) {
  const { i18n } = useLingui()
  const making = useRef(false)
  const typed = useRef('')
  const message = useMemo(() => ({ id: NEW, role: 'user', writing: true, content: '', blocks: [{ id: 'b0', type: 'paragraph', text: [] }] }), [])
  const sections = useMemo(() => [{ part: 'writing', message, card: { id: NEW, type: 'user', writing: true, content: '' } }], [message])
  const words = useMemo(() => ({ ...NO_WORDS, label: i18n._(COPY.chat.writingLabel) }), [i18n])

  const onSave = useCallback(async (id, saved) => {
    if (making.current || id !== NEW) return
    const content = draftWords(saved.blocks)
    if (!content.trim()) return
    making.current = true
    typed.current = ''
    try {
      await onStart?.({ blocks: saved.blocks, content, typed: () => typed.current })
    } finally {
      making.current = false
    }
  }, [onStart])

  // Keys pressed while the chat is being made wait for your text.
  const onKeyDownCapture = useCallback((e) => {
    if (!making.current || e.nativeEvent?.isComposing) return
    if (e.key === 'Enter') typed.current += '\n'
    else if (e.key === 'Backspace') typed.current = typed.current.slice(0, -1)
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typed.current += e.key
    else return
    e.preventDefault()
  }, [])

  return (
    <div className="ch-cbody ch-room-empty ch-write-new" style={{ '--ph': JSON.stringify(i18n._(COPY.room.writeHere)) }} onKeyDownCapture={onKeyDownCapture}>
      <EditableMessages sections={sections} untracked onSave={onSave} words={words} />
    </div>
  )
}
