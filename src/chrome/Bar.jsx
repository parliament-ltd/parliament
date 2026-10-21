import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { fieldReducer, initialField, fieldValue } from '../shell/field'
import { barKey, isTextField } from '../shell/keys'
import { stepRecall } from '../lib/commandHistory'
import { restingMode } from '../shell/arrangement'
import { readField } from '../commands/parse'
import { complete } from '../commands/registry'
import { preview } from './preview'
import Field from './Field'
import EnterLine from './EnterLine'
import Reference from './Reference'

// One bar: the field, its Enter line and the ? reference, pointed at one
// board. The page has one, and so does every popped window (C6: each window
// keeps its own bar). Its keys are listened for on the document it is drawn
// in, so a popped window answers / and Cmd/Ctrl+K itself.
//
// The bar plans; the shell runs. onRun gets the planned arrangement and
// returns a promise of a notice key for the Enter line (say, a window the
// browser would not open), or null.

export default function Bar({ arrangement, board, doc, lines, onRun, onFocusBoard, className, autoFocus = false, onTop = true }) {
  const target = useMemo(() => ({ ...arrangement, addressed: board }), [arrangement, board])
  const resting = restingMode(target)
  const [field, dispatch] = useReducer(fieldReducer, resting, initialField)
  const [reference, setReference] = useState(null) // { topic } while ? is open
  const [notice, setNotice] = useState(null)
  const walk = useRef({ lines: [], index: -1, draft: '' })
  const input = useRef(null)

  useEffect(() => { dispatch({ type: 'surface', resting }) }, [resting])
  useEffect(() => { if (autoFocus) input.current?.focus() }, [autoFocus])

  // `/` outside text fields, and Cmd/Ctrl+K from anywhere, in this document.
  useEffect(() => {
    if (!doc) return undefined
    function onKey(e) {
      const active = doc.activeElement
      const inBar = active === input.current
      const what = barKey(e, { inTextField: !inBar && isTextField(active), inBar })
      if (what === 'focus' || what === 'open') {
        e.preventDefault()
        input.current?.focus()
        dispatch({ type: 'open' })
      }
    }
    doc.addEventListener('keydown', onKey)
    return () => doc.removeEventListener('keydown', onKey)
  }, [doc])

  const value = fieldValue(field)
  const view = useMemo(() => preview(value, { mode: field.mode, arrangement: target }), [value, field.mode, target])
  const says = notice ? { message: notice } : (view.says.message === 'popCommand' && !onTop ? { ...view.says, also: 'popOrdinary' } : view.says)

  async function enter() {
    if (field.mode !== 'command') return
    const { answer, next } = view
    if (answer.state === 'help') {
      setReference({ topic: answer.values?.verb ? answer.values.verb.replace(/:$/, '') : null })
      dispatch({ type: 'ran' })
      return
    }
    if (answer.fill) { dispatch({ type: 'input', value: answer.fill }); return }
    if (!next) return
    const body = readField(value, field.mode).body
    const refused = await onRun(next, body)
    if (refused) { setNotice(refused); return }
    setReference(null)
    walk.current = { lines, index: -1, draft: '' }
    dispatch({ type: 'ran' })
  }

  function onKeyDown(e) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') { e.preventDefault(); enter(); return }
    if (e.key === 'Escape') {
      e.preventDefault()
      if (reference) { setReference(null); return }
      if (field.mode === field.resting) input.current?.blur()
      dispatch({ type: 'escape' })
      return
    }
    if (field.mode !== 'command') return
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      walk.current = stepRecall({ ...walk.current, lines }, e.key === 'ArrowUp' ? 'up' : 'down', field.text.command)
      dispatch({ type: 'recall', value: walk.current.value })
      return
    }
    if (e.key === 'Tab') {
      const [first] = complete(field.text.command, board)
      if (first) { e.preventDefault(); dispatch({ type: 'recall', value: first }) }
    }
  }

  function pick(form) {
    dispatch({ type: 'input', value: `>${form}` })
    setReference(null)
    input.current?.focus()
  }

  return (
    <div className={className}>
      <div className="ch-dock-in">
        <Field
          ref={input}
          state={field}
          onInput={(v) => { walk.current = { lines, index: -1, draft: '' }; setNotice(null); dispatch({ type: 'input', value: v }) }}
          onKeyDown={onKeyDown}
          onFocus={() => { dispatch({ type: 'focus' }); onFocusBoard?.(board) }}
          onBlur={() => dispatch({ type: 'blur' })}
        />
        <EnterLine mode={field.mode} resting={field.resting} empty={!field.text[field.mode]} says={says} addressed={board} />
        {reference && <Reference board={board} topic={reference.topic} onPick={pick} />}
      </div>
    </div>
  )
}
