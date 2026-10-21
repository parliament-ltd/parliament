import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import './chrome.css'
import { initDB } from '../lib/db'
import { loadArrangement, saveArrangement } from '../lib/arrangements'
import { keepCommand, readCommands, stepRecall } from '../lib/commandHistory'
import { fieldReducer, initialField, fieldValue } from '../shell/field'
import { barKey, isTextField } from '../shell/keys'
import { shipped, restingMode, address, planOpen } from '../shell/arrangement'
import { readField } from '../commands/parse'
import { complete } from '../commands/registry'
import { preview } from './preview'
import Field from './Field'
import EnterLine from './EnterLine'
import Reference from './Reference'
import Strip from './Strip'
import Board from './Board'

// The new shell (refactor-plan.md §4 and stage 3): the board strip, the
// boards as the arrangement places them, and the bar. In development (and in
// builds made with VITE_PROTOTYPES=1) it lives at /shell, beside today's
// screens, until each of them is replaced. Its boards are placeholders until
// their stages draw them; the field, the Enter line, `?`, and open:, close:,
// move:, swap:, bar: and reset: work.

const ARRANGEMENT = 'almanac'
// The boards that take the wide column where they stand.
const MAIN = new Set(['almanac', 'canvas', 'room', 'docket', 'settings', 'welcome'])

export default function Shell() {
  const [arrangement, setArrangement] = useState(() => shipped(ARRANGEMENT))
  const [field, dispatch] = useReducer(fieldReducer, 'search', initialField)
  const [reference, setReference] = useState(null) // { topic } while ? is open
  const [lines, setLines] = useState([])
  const walk = useRef({ lines: [], index: -1, draft: '' })
  const input = useRef(null)
  const db = useRef(null)

  // This device's arrangement and history, once the database is open.
  useEffect(() => {
    let live = true
    initDB().then(async (handle) => {
      db.current = handle
      const [kept, history] = await Promise.all([loadArrangement(handle, ARRANGEMENT), readCommands(handle)])
      if (live) { setArrangement(kept); setLines(history) }
    }).catch(() => {})
    return () => { live = false }
  }, [])

  // The field rests where the addressed board rests (C44).
  const resting = restingMode(arrangement)
  useEffect(() => { dispatch({ type: 'surface', resting }) }, [resting])

  const value = fieldValue(field)
  const view = useMemo(() => preview(value, { mode: field.mode, arrangement }), [value, field.mode, arrangement])

  const commit = useCallback((next) => {
    if (!next) return
    setArrangement(next)
    if (db.current) saveArrangement(db.current, next).catch(() => {})
  }, [])

  // `/` outside text fields, and Cmd/Ctrl+K from anywhere, open the field.
  useEffect(() => {
    function onKey(e) {
      const active = document.activeElement
      const inBar = active === input.current
      const what = barKey(e, { inTextField: !inBar && isTextField(active), inBar })
      if (what === 'focus' || what === 'open') {
        e.preventDefault()
        input.current?.focus()
        dispatch({ type: 'open' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function enter() {
    if (field.mode !== 'command') return
    const { answer, next } = view
    if (answer.state === 'help') {
      setReference({ topic: answer.values?.verb ? answer.values.verb.replace(/:$/, '') : null })
      dispatch({ type: 'ran' })
      return
    }
    if (answer.fill) { dispatch({ type: 'input', value: answer.fill }); return }
    if (!next) return
    commit(next)
    setReference(null)
    const body = readField(value, field.mode).body
    if (db.current) {
      keepCommand(db.current, body)
        .then((kept) => (kept ? readCommands(db.current).then(setLines) : null))
        .catch(() => {})
    }
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
      const [first] = complete(field.text.command, arrangement.addressed)
      if (first) { e.preventDefault(); dispatch({ type: 'recall', value: first }) }
    }
  }

  function pickBoard(board) {
    const here = arrangement.columns.flat().includes(board) || arrangement.popped.some((p) => p.board === board)
    commit(here ? address(arrangement, board) : planOpen(arrangement, board).next)
  }

  function pickCommand(form) {
    dispatch({ type: 'input', value: `>${form}` })
    setReference(null)
    input.current?.focus()
  }

  const bar = arrangement.bar
  const dock = (
    <div className={`ch-dock ${bar.at} ${bar.side}`}>
      <div className="ch-dock-in">
        <Field
          ref={input}
          state={field}
          onInput={(v) => { walk.current = { lines, index: -1, draft: '' }; dispatch({ type: 'input', value: v }) }}
          onKeyDown={onKeyDown}
          onFocus={() => dispatch({ type: 'focus' })}
          onBlur={() => dispatch({ type: 'blur' })}
        />
        <EnterLine mode={field.mode} resting={field.resting} empty={!field.text[field.mode]} says={view.says} addressed={arrangement.addressed} />
        {reference && <Reference board={arrangement.addressed} topic={reference.topic} onPick={pickCommand} />}
      </div>
    </div>
  )

  return (
    <div className={`ch-shell bar-${bar.at}`}>
      <Strip arrangement={arrangement} onPick={pickBoard} />
      {/* One bar in one place, moved by its class, so moving it never loses
          the field's focus or what is typed. */}
      {dock}
      <main className="ch-stage">
        {arrangement.columns.map((column) => (
          <div key={column.join(' ')} className={`ch-col${column.some((b) => MAIN.has(b)) ? ' main' : ''}`}>
            {column.map((board) => (
              <Board key={board} board={board} addressed={arrangement.addressed === board} onAddress={(b) => { if (b !== arrangement.addressed) commit(address(arrangement, b)) }} />
            ))}
          </div>
        ))}
      </main>
    </div>
  )
}
