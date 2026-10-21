import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { fieldReducer, initialField, fieldValue } from '../shell/field'
import { barKey, isTextField } from '../shell/keys'
import { stepRecall } from '../lib/commandHistory'
import { restingMode } from '../shell/arrangement'
import { readField } from '../commands/parse'
import { complete } from '../commands/registry'
import { preview, promptPreview } from './preview'
import { roomLabel } from './say'
import Field from './Field'
import EnterLine from './EnterLine'
import Reference from './Reference'
import Inspect from './Inspect'
import KeyPanel from './KeyPanel'

// One bar: the field, its Enter line and the ? reference, pointed at one
// board. The page has one, and so does every popped window (C6: each window
// keeps its own bar). Its keys are listened for on the document it is drawn
// in, so a popped window answers / and Cmd/Ctrl+K itself.
//
// While a reply on a board is being edited, the field folds into a circle
// (C108). Hovering opens it without taking focus, after 140ms of intent, and
// it folds again 600ms after the pointer leaves if nothing was typed; a
// click or Cmd/Ctrl+K opens it; Escape folds it and puts the caret back in
// the reply. Timers run on the clock of the window the bar is in.
//
// The bar plans; the shell runs. onRun gets the planned arrangement, or the
// screen alm: or sym: goes to, and returns a promise of a notice for the
// Enter line (say, a window the browser would not open), or null.
//
// A prompt goes to the room the screen shows (stage 4). `prompt` is what
// the shell knows about where it would go: the room, whether there is a
// key, the names and the price. The Enter line says who receives it and
// what it costs before Enter; onPrompt sends it, and answers at once
// whether it went ({ refused } or { done }), then once it is answered
// (done resolves to a notice, or null).

export default function Bar({ arrangement, board, doc, lines, screens, prompt, onRun, onPrompt, onFocusBoard, className, autoFocus = false, onTop = true, write = null, onMode, welcome = null, inspect = null, onInspectClose, keyPanel = null, onKeyFocus, onKeySaved, onKeysClose }) {
  const { i18n } = useLingui()
  const target = useMemo(() => ({ ...arrangement, addressed: board }), [arrangement, board])
  const resting = restingMode(target)
  const [field, dispatch] = useReducer(fieldReducer, resting, initialField)
  const [reference, setReference] = useState(null) // { topic } while ? is open
  const [notice, setNotice] = useState(null) // a key of COPY.enter, or { message, values }
  const walk = useRef({ lines: [], index: -1, draft: '' })
  const input = useRef(null)
  const reply = useRef(null) // the reply being edited, to return the caret to
  const hover = useRef(0)
  const win = doc?.defaultView ?? window

  useEffect(() => { dispatch({ type: 'surface', resting }) }, [resting])

  // A command written into the field from outside, as a welcome step's when
  // clicked (stage 5): it waits for Enter.
  useEffect(() => {
    if (!write) return
    dispatch({ type: 'input', value: write.value })
    input.current?.focus()
  }, [write])

  // The field's mode, for the welcome page's first step.
  useEffect(() => { onMode?.(field.mode) }, [field.mode, onMode])
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

  // Editing a reply on a board folds the field; leaving it opens the field.
  useEffect(() => {
    if (!doc) return undefined
    const onBoard = (el) => isTextField(el) && el !== input.current && Boolean(el.closest?.('.ch-stage'))
    function onFocusIn(e) {
      if (onBoard(e.target)) { reply.current = e.target; dispatch({ type: 'editReply' }) }
    }
    function onFocusOut(e) {
      if (e.target !== reply.current) return
      const to = e.relatedTarget
      if (to === input.current || onBoard(to) || to?.closest?.('.ch-field')) return
      dispatch({ type: 'doneEditing' })
    }
    doc.addEventListener('focusin', onFocusIn)
    doc.addEventListener('focusout', onFocusOut)
    return () => { doc.removeEventListener('focusin', onFocusIn); doc.removeEventListener('focusout', onFocusOut) }
  }, [doc])

  // Hover opens the folded field after 140ms of intent, and lets it fold
  // again 600ms after the pointer leaves.
  const hoverAfter = (ms, type) => {
    win.clearTimeout(hover.current)
    hover.current = win.setTimeout(() => dispatch({ type }), ms)
  }
  useEffect(() => () => win.clearTimeout(hover.current), [win])
  const folded = field.minimised

  const value = fieldValue(field)
  const view = useMemo(() => preview(value, { mode: field.mode, arrangement: target, screens }), [value, field.mode, target, screens])
  const prompting = field.mode === 'prompt'
  const promptView = useMemo(() => (prompting ? promptPreview(field.text.prompt, prompt) : null), [prompting, field.text.prompt, prompt])
  const planned = prompting ? promptView.says : (view.says.message === 'popCommand' && !onTop ? { ...view.says, also: 'popOrdinary' } : view.says)
  const says = notice ? (typeof notice === 'string' ? { message: notice } : notice) : planned

  // Who answers a prompt here, inside the prompt field.
  let marginalia = null
  if (prompt && prompt.room !== undefined && prompt.keyed != null) {
    marginalia = prompt.keyed
      ? i18n._(COPY.field.answeredBy, { model: prompt.model })
      : i18n._(COPY.field.answeredFrom, { source: prompt.source })
  }
  const room = prompt && prompt.room !== undefined
    ? { chat: prompt.chat ?? null, name: prompt.room ? roomLabel(i18n, prompt.roomName ?? null) : null }
    : undefined

  async function send() {
    if (!promptView?.ready || !onPrompt) return
    const out = await onPrompt(field.text.prompt.trim(), prompt)
    if (out?.refused) { setNotice(out.refused); return }
    dispatch({ type: 'sent' })
    const failed = await out?.done
    if (failed) setNotice(failed)
  }

  async function enter() {
    if (prompting) { await send(); return }
    if (field.mode !== 'command') return
    const { answer, next, go, act } = view
    if (answer.state === 'help') {
      setReference({ topic: answer.values?.verb ? answer.values.verb.replace(/:$/, '') : null })
      dispatch({ type: 'ran' })
      return
    }
    if (answer.fill) { dispatch({ type: 'input', value: answer.fill }); return }
    if (!next && !go && !act) return
    const body = readField(value, field.mode).body
    const refused = await onRun(next, body, go, act)
    if (refused) { setNotice(refused); return }
    setReference(null)
    walk.current = { lines, index: -1, draft: '' }
    dispatch({ type: 'ran', to: view.after ?? null })
  }

  function onKeyDown(e) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') { e.preventDefault(); enter(); return }
    if (e.key === 'Escape') {
      e.preventDefault()
      if (reference) { setReference(null); return }
      if (inspect) { onInspectClose?.(); return }
      if (keyPanel) { onKeysClose?.(); return }
      // The field's rule first, then the caret: moving the caret blurs the
      // field, which would otherwise come before the Escape.
      dispatch({ type: 'escape' })
      if (field.mode === field.resting) {
        // In the resting mode, back to what you were doing: the reply, if
        // one was being edited, with the field folded again.
        if (field.editingReply && reply.current?.isConnected) reply.current.focus()
        else input.current?.blur()
      }
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
        <div className="ch-frow">
        <Field
          ref={input}
          state={field}
          folded={folded}
          win={win}
          marginalia={marginalia}
          ink={prompt?.room !== undefined ? prompt?.ink ?? null : null}
          inkKey={prompt?.room ?? null}
          onOpen={() => { dispatch({ type: 'open' }); input.current?.focus() }}
          onHover={() => { if (field.minimised || field.peek) hoverAfter(140, 'hover') }}
          onLeave={() => { if (field.minimised || field.peek) hoverAfter(600, 'leave') }}
          onInput={(v) => {
            walk.current = { lines, index: -1, draft: '' }
            setNotice(null)
            // The key panel closes when the line turns to another command.
            if (keyPanel && !/^>\s*api:/i.test(v)) onKeysClose?.()
            dispatch({ type: 'input', value: v })
          }}
          onKeyDown={onKeyDown}
          onFocus={() => { dispatch({ type: 'focus' }); onFocusBoard?.(board) }}
          onBlur={() => dispatch({ type: 'blur' })}
        />
        </div>
        <EnterLine hidden={folded} mode={field.mode} resting={field.resting} empty={!field.text[field.mode]} says={says} addressed={board} room={room} welcome={welcome} />
        {reference && <Reference board={board} topic={reference.topic} onPick={pick} />}
        {!reference && inspect && <Inspect row={inspect} />}
        {!reference && !inspect && keyPanel && (
          <KeyPanel
            keys={keyPanel.keys}
            noKey={keyPanel.noKey}
            focus={keyPanel.focus}
            holdOnly={keyPanel.holdOnly}
            onFocus={(id) => onKeyFocus?.(id)}
            onSaved={(id, fresh) => { onKeySaved?.(id, fresh); input.current?.focus() }}
            onClose={() => { onKeysClose?.(); input.current?.focus() }}
          />
        )}
      </div>
    </div>
  )
}
