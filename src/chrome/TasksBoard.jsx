import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { say } from './say'
import { dayOf } from './when'
import { pastedLines as linesOf } from '../lib/tasksBoard'

// The Tasks board (C301 (g), v4; made simpler as v5, C309, ruled 17
// November: "go ahead and build"). Every task with a box, newest first, and
// one open in place, with its sub-tasks, where each one's answer landed, and
// its runs.
//
// A task is added as a to-do list adds one: an empty box and a field, "Add a
// task" gone when it is clicked. While the caret is in it a Model pill
// shows; Enter alone saves a task of yours and leaves the caret for the
// next. Model opens the rest under the name, with no labels: a description,
// Prompt, Search and Command as pills (picked again to turn off; none on is
// yours), who answers, rooms, the flow as a switch, and Save.
//
// The open task is laid out as that row: its name and description written
// where they stand, kept on leaving or Enter, Escape putting them back; its
// pills open their lists in place. A sub-task not yet sent is written in
// place too, its pills shown while the caret is in it; it moves by its grip,
// or Alt and the arrows. Each change is an act, said under the bar and taken
// back by undo:. A pasted list becomes sub-tasks, one of yours a line, its
// lines never read as commands. Run puts run:207 in the bar, which says what
// goes and what it costs; the board never sends by itself.
//
// tasks: tasksBoard.taskRows; open: tasksBoard.openTaskOf; models: the
// picker's rows, by group; rooms: [{ chatId, num, title }]; validate(line):
// what the bar would say of a command, to check it as it is written.

const KINDS = ['prompt', 'search', 'command']
const KIND_WORDS = { prompt: COPY.tasks.kindPrompt, search: COPY.tasks.kindSearch, command: COPY.tasks.kindCommand }
const PILL_WORDS = { prompt: COPY.tasks.pillPrompt, search: COPY.tasks.pillSearch, command: COPY.tasks.pillCommand }
// Commands, which stay English.
const TICK = (num, n, on) => (n == null ? `tick:${on ? '' : 'off '}${num}` : `tick:${on ? '' : 'off '}${num} ${n}`)
const RUN = (num) => `>run:${num}`
const OPEN = (num) => `open:${num}`
const OPEN_RUN = (n) => `open:run ${n}`
const DELETE_SUB = (num, n) => `delete:${num}a ${n}`
const TITLE_MOST = 200

const asks = (kind) => kind === 'prompt' || kind === 'search'

// The models a kind can ask: a prompt, the models and those on this
// computer; a search, the sources.
function modelOptions(kind, models) {
  if (kind === 'search') return models?.source ?? []
  if (kind === 'prompt') return [...(models?.model ?? []), ...(models?.local ?? [])].filter((r) => !r.later && !r.unchecked)
  return []
}
const firstOf = (kind, models, defaultModel) => {
  const options = modelOptions(kind, models)
  return options.some((r) => r.id === defaultModel) ? defaultModel : options[0]?.id ?? null
}

// What the bar would say of a command line: { line, refused, says }.
function checkLine(text, validate) {
  const line = String(text ?? '').trim().replace(/^>/, '').trim()
  const checked = line ? validate(line) : null
  return { line, refused: !line || Boolean(checked && !checked.act && !checked.next), says: checked?.says ?? null }
}

// A text area as tall as its words.
const grow = (el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` } }

function Box({ on, label, onClick, disabled = false }) {
  return (
    <button type="button" role="checkbox" aria-checked={on ? 'true' : 'false'} aria-label={label} className={`ch-tk-box${on ? ' on' : ''}`} onClick={onClick} disabled={disabled}>
      {on && <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  )
}

function Where({ where, i18n }) {
  if (!where) return null
  if (where.room != null) return <span className="ch-tk-chip">{i18n._(COPY.tasks.room, { num: where.room })}</span>
  if (where.branch) return <span className="ch-tk-chip">{where.branch}</span>
  if (where.ownBranch) return <span className="ch-tk-chip faint">{i18n._(COPY.tasks.ownBranch)}</span>
  return null
}

// Text written where it stands (C309): no box, no outline; kept when the
// caret leaves it or on Enter, put back by Escape. A name left empty goes
// back to what it was.
function InPlace({ value, onKeep, multiline = false, className = '', placeholder, label, maxLength, required = false, mono = false, onKeyDown = null, onFocus = null }) {
  // draft: the words while written in; kept: what was kept, until the
  // stored value comes back with it.
  const [draft, setDraft] = useState(null)
  const [kept, setKept] = useState(null)
  const [seen, setSeen] = useState(value)
  if (value !== seen) { setSeen(value); setKept(null) }
  const now = draft ?? kept ?? value ?? ''
  const dropped = useRef(false)
  const el = useRef(null)
  useEffect(() => { if (multiline) grow(el.current) }, [now, multiline])
  const keep = () => {
    const words = draft ?? ''
    setDraft(null)
    if (dropped.current) { dropped.current = false; return }
    const next = multiline ? words.replace(/\s+$/, '') : words.replace(/\s+/g, ' ').trim()
    if (required && !next) return
    if (next !== (value ?? '')) { setKept(next); onKeep(next) }
  }
  const keys = (e) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (e.key === 'Escape') { e.stopPropagation(); dropped.current = true; e.currentTarget.blur() }
    if (e.key === 'Enter' && (!multiline || !e.shiftKey)) { e.preventDefault(); e.currentTarget.blur() }
  }
  const props = {
    ref: el, className: `ch-tk-in ch-tk-place ${className}${mono ? ' ch-tk-cmd' : ''}`, value: now, placeholder, 'aria-label': label, maxLength, dir: 'auto',
    spellCheck: mono ? false : undefined, autoComplete: 'off',
    onChange: (e) => setDraft(e.target.value), onFocus: (e) => { setDraft(now); onFocus?.(e) }, onBlur: keep, onKeyDown: keys,
  }
  return multiline ? <textarea rows={1} {...props} /> : <input type="text" {...props} />
}

// Prompt, Search, Command: picked again, or another picked, to turn off.
function Kinds({ kind, onPick, only = KINDS, disabled = false }) {
  const { i18n } = useLingui()
  return (
    <span className="ch-tk-kinds" role="radiogroup" aria-label={i18n._(COPY.tasks.kindsLabel)}>
      {only.map((k) => (
        <button key={k} type="button" role="radio" aria-checked={kind === k ? 'true' : 'false'} className={`ch-tk-kp${kind === k ? ' on' : ''}`} disabled={disabled}
          onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(kind === k ? null : k)}>{i18n._(KIND_WORDS[k])}</button>
      ))}
    </span>
  )
}

// A pill that opens its list where it is: who answers, a room, where a
// sub-task goes. find: a field above the list, for rooms by number or name.
function Choose({ children, label, options, onPick, find = false, dashed = false, ghost = false }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const here = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!here.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('touchstart', away)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('touchstart', away) }
  }, [open])
  const words = q.trim().toLocaleLowerCase()
  const shown = (find && words ? options.filter((o) => o.key?.startsWith(words) || o.name.toLocaleLowerCase().includes(words)) : options).slice(0, find ? 8 : 40)
  return (
    <span className="ch-tk-anchor" ref={here} onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) } }}>
      <button type="button" className={`ch-tk-pill${dashed ? ' dashed' : ''}${ghost ? ' ghost' : ''}`} aria-expanded={open} aria-haspopup="listbox" aria-label={label}
        onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(!open); setQ('') }}>
        {children}
      </button>
      {open && (
        <span className="ch-tk-menu" role="listbox" aria-label={label}>
          {find && <input className="ch-tk-in ch-tk-findin" autoFocus value={q} placeholder={i18n._(COPY.tasks.findRooms)} aria-label={i18n._(COPY.tasks.findRooms)} onChange={(e) => setQ(e.target.value)} />}
          {shown.map((o) => (
            <button key={o.id ?? 'none'} type="button" role="option" aria-selected={o.on ? 'true' : 'false'} className={o.on ? 'on' : undefined}
              onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(false); onPick(o.id) }}>{o.name}</button>
          ))}
        </span>
      )}
    </span>
  )
}

const V = () => <span className="ch-tk-v" aria-hidden="true">▾</span>

// The flow, as the switch Alarms and Settings use, between its two words;
// faint once the task has run, since it is set then (C309, A).
function FlowSwitch({ flow, ran = false, onFlow }) {
  const { i18n } = useLingui()
  const together = flow === 'together'
  const set = (f) => { if (!ran && f !== flow) onFlow(f) }
  return (
    <span className={`ch-tk-flow${ran ? ' ran' : ''}`}>
      <span className={`ch-tk-fw${together ? '' : ' on'}`} aria-hidden="true" onMouseDown={(e) => e.preventDefault()} onClick={() => set('oneByOne')}>{i18n._(COPY.tasks.flowOneByOne)}</span>
      <button type="button" role="switch" aria-checked={together ? 'true' : 'false'} aria-label={i18n._(COPY.tasks.flowTogether)} className={`ch-tk-sw${together ? ' on' : ''}`} disabled={ran}
        title={ran ? i18n._(COPY.tasks.flowSet) : undefined} onMouseDown={(e) => e.preventDefault()} onClick={() => set(together ? 'oneByOne' : 'together')}>
        <span />
      </button>
      <span className={`ch-tk-fw${together ? ' on' : ''}`} aria-hidden="true" onMouseDown={(e) => e.preventDefault()} onClick={() => set('together')}>{i18n._(COPY.tasks.flowTogether)}</span>
    </span>
  )
}

function whoOptions(kind, models, i18n, { chosen, asTask = null } = {}) {
  const list = modelOptions(kind, models).map((r) => ({ id: r.id, name: r.needsKey ? `${r.name} · ${i18n._(COPY.tasks.needsKey)}` : r.name, on: r.id === chosen }))
  return asTask ? [{ id: null, name: asTask, on: chosen == null }, ...list] : list
}
const roomOptions = (rooms, i18n, skip = []) => rooms
  .filter((r) => !skip.includes(r.chatId))
  .map((r) => ({ id: r.chatId, key: String(r.num), name: r.title ? `${r.num} · ${r.title}` : i18n._(COPY.tasks.room, { num: r.num }) }))

// The row that adds a task, or a sub-task (sub: { task }), as a to-do list
// does (C309). onPaste(titles): a pasted list, as sub-tasks of yours.
function AddRow({ sub = null, models, rooms, validate, nameOf, defaultModel, onSave, onPaste = null }) {
  const { i18n } = useLingui()
  const taskKind = sub ? sub.task.kind : 'yours'
  const [title, setTitle] = useState('')
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState(null)
  const [words, setWords] = useState('')
  const [model, setModel] = useState(null)
  const [command, setCommand] = useState('')
  const [picked, setPicked] = useState([])
  const [into, setInto] = useState(null)
  const [flow, setFlow] = useState('oneByOne')
  const [pasted, setPasted] = useState(null)
  const name = useRef(null)
  const wordsEl = useRef(null)
  const cmdEl = useRef(null)
  useEffect(() => { grow(wordsEl.current) }, [words, open])
  const k = kind ?? 'yours'
  // A sub-task of its task's kind takes the task's model unless one is picked.
  const sameAsTask = Boolean(sub) && k === taskKind && asks(k)
  const chosen = asks(k) ? (model ?? (sameAsTask ? null : firstOf(k, models, defaultModel))) : null
  const cmd = k === 'command' ? checkLine(command, validate) : null
  const canSave = title.trim() !== '' && !cmd?.refused && (!asks(k) || Boolean(chosen) || sameAsTask)
  const reset = () => {
    setTitle(''); setOpen(false); setKind(null); setWords(''); setModel(null); setCommand(''); setPicked([]); setInto(null); setFlow('oneByOne'); setPasted(null)
  }
  const save = () => {
    if (pasted) { onPaste?.(pasted); reset(); name.current?.focus(); return }
    // Enter alone: a task of yours; a sub-task as its task is.
    const shut = !open
    const kk = shut ? (sub && asks(taskKind) ? taskKind : 'yours') : k
    if (!title.trim() || (!shut && !canSave)) return
    const m = asks(kk) ? (shut ? null : chosen) : null
    onSave({
      title: title.replace(/\s+/g, ' ').trim(), kind: kk,
      ...(sub ? { words: shut ? '' : words.trim(), into: asks(kk) && !shut ? into : null } : { description: shut ? '' : words.trim(), rooms: asks(kk) && !shut ? picked : [], flow: shut ? 'oneByOne' : flow }),
      model: m,
      ...(kk === 'command' ? { command: cmd.line } : {}),
    })
    reset()
    // Enter keeps you typing (C309, a): the caret stays for the next one.
    name.current?.focus()
  }
  const openMore = () => {
    setOpen(true)
    setKind(sub ? (asks(taskKind) ? taskKind : 'prompt') : 'prompt')
    requestAnimationFrame(() => wordsEl.current?.focus())
  }
  const pick = (next) => {
    setKind(next)
    setModel(null)
    if (next === 'command') requestAnimationFrame(() => cmdEl.current?.focus())
  }
  const hint = sub ? (k === 'prompt' ? COPY.tasks.fieldPrompt : k === 'search' ? COPY.tasks.fieldSearch : COPY.tasks.fieldDescription) : COPY.tasks.fieldDescription
  const intoRoom = into && into !== 'own' ? rooms.find((r) => r.chatId === into) : null
  return (
    <div
      className={`ch-tk-add${sub ? ' sub' : ''}${open ? ' open' : ''}${title ? ' typed' : ''}`}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        if (pasted) { setTitle(`${title} ${pasted.join(' ')}`.replace(/\s+/g, ' ').trim().slice(0, TITLE_MOST)); setPasted(null); return }
        reset()
        e.target.blur?.()
      }}
    >
      <span className="ch-tk-box ghost" aria-hidden="true" />
      <input
        ref={name} type="text" className="ch-tk-in ch-tk-name" value={title} maxLength={TITLE_MOST} dir="auto" autoComplete="off"
        placeholder={i18n._(sub ? COPY.tasks.addSubPlus : COPY.tasks.addPlus)} aria-label={i18n._(sub ? COPY.tasks.addSubPlus : COPY.tasks.addPlus)}
        onChange={(e) => { setTitle(e.target.value); setPasted(null) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
        onPaste={onPaste ? (e) => { const lines = linesOf(e.clipboardData?.getData('text')); if (lines) { e.preventDefault(); setPasted(lines) } } : undefined}
      />
      {!open && <button type="button" className="ch-tk-pill ghost ch-tk-more-pill" onMouseDown={(e) => e.preventDefault()} onClick={openMore}>{i18n._(COPY.tasks.fieldModel)}</button>}
      {pasted && <span className="ch-tk-pasted ch-marg" role="status">{i18n._(COPY.tasks.pasted, { count: pasted.length })}</span>}
      {open && (
        <div className="ch-tk-more">
          {(!sub || k !== 'command') && (
            <textarea ref={wordsEl} rows={1} className="ch-tk-in ch-tk-desc" value={words} maxLength={sub ? 100000 : 4000} dir="auto"
              placeholder={i18n._(hint)} aria-label={i18n._(hint)} onChange={(e) => setWords(e.target.value)} />
          )}
          {k === 'command' && (
            <>
              <input ref={cmdEl} type="text" className="ch-tk-in ch-tk-cmd" value={command} maxLength={2000} spellCheck={false} autoComplete="off"
                placeholder={i18n._(COPY.tasks.commandExample)} aria-label={i18n._(COPY.tasks.kindCommand)}
                onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
              <span className={`ch-marg${cmd.line && cmd.refused ? ' ch-tk-bad' : ''}`}>
                {cmd.line && cmd.says ? say(i18n, cmd.says.message, cmd.says.values) : i18n._(COPY.tasks.commandWaits)}
              </span>
            </>
          )}
          <div className="ch-tk-pills">
            <Kinds kind={kind} onPick={pick} />
            {asks(k) && (
              <>
                <span className="ch-tk-sep" aria-hidden="true" />
                <Choose label={i18n._(COPY.tasks.fieldModel)} options={whoOptions(k, models, i18n, { chosen, asTask: sameAsTask ? i18n._(COPY.tasks.asTask, { name: nameOf(sub.task.model) }) : null })} onPick={setModel} dashed={chosen == null}>
                  {chosen != null ? nameOf(chosen) : sameAsTask ? i18n._(COPY.tasks.asTaskChip, { name: nameOf(sub.task.model) }) : i18n._(COPY.tasks.fieldModel)}<V />
                </Choose>
                {!sub && picked.map((id) => {
                  const r = rooms.find((x) => x.chatId === id)
                  return (
                    <span key={id} className="ch-tk-chip">
                      {i18n._(COPY.tasks.room, { num: r?.num ?? '?' })}
                      <button type="button" className="ch-tk-x" aria-label={i18n._(COPY.tasks.roomOff, { num: r?.num ?? '?' })} onMouseDown={(e) => e.preventDefault()} onClick={() => setPicked(picked.filter((x) => x !== id))}>×</button>
                    </span>
                  )
                })}
                {!sub && picked.length < 20 && (
                  <Choose label={i18n._(COPY.tasks.addRoom)} options={roomOptions(rooms, i18n, picked)} onPick={(id) => setPicked([...picked, id])} find ghost>
                    {i18n._(COPY.tasks.addRoom)}
                  </Choose>
                )}
                {sub && (
                  <Choose label={i18n._(COPY.tasks.fieldRoom)} dashed={into == null} find
                    options={[{ id: null, name: i18n._(COPY.tasks.asTaskWhere), on: into == null }, { id: 'own', key: '', name: i18n._(COPY.tasks.ownBranch), on: into === 'own' }, ...roomOptions(rooms, i18n).map((o) => ({ ...o, on: o.id === into }))]}
                    onPick={setInto}>
                    {into == null ? i18n._(COPY.tasks.asTaskWhere) : into === 'own' ? i18n._(COPY.tasks.ownBranch) : i18n._(COPY.tasks.room, { num: intoRoom?.num ?? '?' })}<V />
                  </Choose>
                )}
              </>
            )}
          </div>
          <div className="ch-tk-foot">
            {!sub && <FlowSwitch flow={flow} onFlow={setFlow} />}
            <span className="ch-tk-acts">
              <button type="button" className="ch-tk-save" disabled={!canSave} onMouseDown={(e) => e.preventDefault()} onClick={save}>{i18n._(COPY.tasks.save)}</button>
              <button type="button" className="ch-tk-cancel" onMouseDown={(e) => e.preventDefault()} onClick={reset}>{i18n._(COPY.tasks.cancel)}</button>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// A sub-task (C309): written in place while it has not been sent; its
// pills shown while the caret is in it; moved by its grip or Alt and the
// arrows. place: { first, last } of where it can go, from 0.
function Sub({ task, s, nameOf, models, rooms, validate, defaultModel, onRun, onDelete, onChangeSub, onMoveSub, movable }) {
  const { i18n } = useLingui()
  const [here, setHere] = useState(false)
  const [cmdNow, setCmdNow] = useState(null)
  const row = useRef(null)
  const drag = useRef(null)
  const change = (set) => onChangeSub(task.num, task.docketId, s.n, s.stepId, set)
  const editable = s.changes && s.status !== 'done'
  const move = (to) => { if (to >= movable.first && to <= movable.last && to !== s.n - 1) onMoveSub(task.num, task.docketId, s.n, s.stepId, to) }
  const pickKind = (next) => {
    setCmdNow(null)
    if (next === 'command') { setCmdNow(''); return }
    if (next == null) { change({ kind: 'yours' }); return }
    // Of its task's kind, it takes the task's model; else the first there is.
    change({ kind: next, model: next === task.kind ? null : firstOf(next, models, defaultModel) })
  }
  const keyMove = (e) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    move(s.n - 1 + (e.key === 'ArrowUp' ? -1 : 1))
  }
  // The grip: the row follows the pointer, and lands where it is let go.
  const gripDown = (e) => {
    if (!editable) return
    const list = [...(row.current?.parentElement?.querySelectorAll(':scope > .ch-tk-sub') ?? [])]
    drag.current = { id: e.pointerId, y: e.clientY, mids: list.map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2 }), to: s.n - 1 }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    row.current?.classList.add('lifted')
  }
  const gripMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dy = e.clientY - d.y
    if (row.current) row.current.style.transform = `translateY(${dy}px)`
    const mid = d.mids[s.n - 1] + dy
    let to = d.mids.filter((m, k) => k !== s.n - 1 && m < mid).length
    to = Math.max(movable.first, Math.min(movable.last, to))
    d.to = to
  }
  const gripUp = (e) => {
    const d = drag.current
    drag.current = null
    if (row.current) { row.current.style.transform = ''; row.current.classList.remove('lifted') }
    if (d && d.id === e.pointerId) move(d.to)
  }
  const cmd = cmdNow != null ? checkLine(cmdNow, validate) : null
  const kindNow = cmdNow != null ? 'command' : s.kind === 'yours' ? null : s.kind
  const hint = s.kind === 'prompt' ? COPY.tasks.fieldPrompt : s.kind === 'search' ? COPY.tasks.fieldSearch : COPY.tasks.fieldDescription
  const intoRoom = s.into && s.into !== 'own' ? rooms.find((r) => r.chatId === s.into) : null
  return (
    <div
      ref={row}
      className={`ch-tk-sub${s.status === 'done' ? ' done' : ''}${s.waits ? ' waits' : ''}${here && editable ? ' here' : ''}`}
      onFocus={() => setHere(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setHere(false); setCmdNow(null) } }}
      onKeyDown={editable ? keyMove : undefined}
    >
      {editable && movable.last > movable.first
        ? (
          <button type="button" className="ch-tk-grip" aria-label={i18n._(COPY.tasks.moveSub, { n: s.n })} title={i18n._(COPY.tasks.moveSub, { n: s.n })}
            onPointerDown={gripDown} onPointerMove={gripMove} onPointerUp={gripUp} onPointerCancel={gripUp}
            onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); move(s.n - 1 + (e.key === 'ArrowUp' ? -1 : 1)) } }}>
            <svg viewBox="0 0 8 12" width="8" height="12" aria-hidden="true"><g fill="currentColor"><circle cx="2" cy="2" r="1" /><circle cx="6" cy="2" r="1" /><circle cx="2" cy="6" r="1" /><circle cx="6" cy="6" r="1" /><circle cx="2" cy="10" r="1" /><circle cx="6" cy="10" r="1" /></g></svg>
          </button>
        )
        : null}
      <Box
        on={s.status === 'done'} disabled={!s.changes && s.status !== 'done'}
        label={i18n._(COPY.tasks.tickSub, { n: s.n, num: task.num, title: s.title })}
        onClick={() => { if (s.changes || s.status === 'done') onRun(TICK(task.num, s.n, s.status !== 'done')) }}
      />
      {editable
        ? <InPlace value={s.named ? s.title : ''} placeholder={s.title || i18n._(COPY.tasks.untitled)} label={i18n._(COPY.tasks.subName, { n: s.n })} maxLength={TITLE_MOST} className="ch-tk-title" onKeep={(title) => change({ title })} />
        : <span className="ch-tk-title" dir="auto">{s.title || i18n._(COPY.tasks.untitled)}</span>}
      <span className="ch-tk-end">
        {s.status === 'done' && <span className="ch-tk-state">{i18n._(COPY.plan.statusDone)}</span>}
        {s.status === 'running' && <span className="ch-tk-state running"><span className="ch-pl-dot" aria-hidden="true" />{i18n._(COPY.plan.statusRunning)}</span>}
        {editable && <button type="button" className="ch-tk-del" aria-label={i18n._(COPY.tasks.deleteSub, { n: s.n, num: task.num })} title={i18n._(COPY.tasks.deleteSub, { n: s.n, num: task.num })} onClick={() => onDelete(DELETE_SUB(task.num, s.n))}>×</button>}
      </span>
      {/* Its words: a description of yours, the prompt, what to search for, or the command line. */}
      {editable && s.kind === 'command' && cmdNow == null && (
        <InPlace value={s.command ?? ''} mono required label={i18n._(COPY.tasks.kindCommand)} className="ch-tk-words" maxLength={2000}
          onKeep={(line) => { if (!checkLine(line, validate).refused) change({ command: line }) }} />
      )}
      {editable && s.kind !== 'command' && cmdNow == null && (s.words || here) && (
        <InPlace value={s.words} multiline placeholder={i18n._(hint)} label={i18n._(hint)} className="ch-tk-words" maxLength={s.kind === 'yours' ? 2000 : 100000}
          onKeep={(words) => change(s.kind === 'yours' ? { text: words } : { prompt: words })} />
      )}
      {editable && cmdNow != null && (
        <span className="ch-tk-words ch-tk-cmdnow">
          <input type="text" className="ch-tk-in ch-tk-cmd" autoFocus value={cmdNow} maxLength={2000} spellCheck={false} autoComplete="off" placeholder={i18n._(COPY.tasks.commandExample)} aria-label={i18n._(COPY.tasks.kindCommand)}
            onChange={(e) => setCmdNow(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.stopPropagation(); setCmdNow(null) }
              if (e.key === 'Enter' && !cmd.refused) { e.preventDefault(); change({ kind: 'command', command: cmd.line }); setCmdNow(null) }
            }} />
          <span className={`ch-marg${cmd.line && cmd.refused ? ' ch-tk-bad' : ''}`}>{cmd.line && cmd.says ? say(i18n, cmd.says.message, cmd.says.values) : i18n._(COPY.tasks.commandEnter)}</span>
        </span>
      )}
      {!editable && s.words && s.named && s.words.trim() !== s.title && <span className="ch-tk-words" dir="auto">{s.words}</span>}
      {editable && here
        ? (
          <span className="ch-tk-who">
            <Kinds kind={kindNow} onPick={pickKind} />
            {asks(s.kind) && cmdNow == null && (
              <>
                <span className="ch-tk-sep" aria-hidden="true" />
                <Choose label={i18n._(COPY.tasks.fieldModel)} dashed={s.asTask}
                  options={whoOptions(s.kind, models, i18n, { chosen: s.asTask ? null : s.model, asTask: s.kind === task.kind ? i18n._(COPY.tasks.asTask, { name: nameOf(task.model) }) : null })}
                  onPick={(id) => change({ model: id })}>
                  {s.asTask ? i18n._(COPY.tasks.asTaskChip, { name: nameOf(s.model) }) : nameOf(s.model)}<V />
                </Choose>
                <Choose label={i18n._(COPY.tasks.fieldRoom)} dashed={!s.into} find
                  options={[{ id: null, name: i18n._(COPY.tasks.asTaskWhere), on: !s.into }, { id: 'own', key: '', name: i18n._(COPY.tasks.ownBranch), on: s.into === 'own' }, ...roomOptions(rooms, i18n).map((o) => ({ ...o, on: o.id === s.into }))]}
                  onPick={(into) => change({ into })}>
                  {!s.into ? i18n._(COPY.tasks.asTaskWhere) : s.into === 'own' ? i18n._(COPY.tasks.ownBranch) : i18n._(COPY.tasks.room, { num: intoRoom?.num ?? '?' })}<V />
                </Choose>
              </>
            )}
          </span>
        )
        : s.kind !== 'yours' && (
          <span className="ch-tk-who">
            <span className="ch-tk-kind">{i18n._(PILL_WORDS[s.kind])}</span>
            {s.command && !editable && <span className="ch-tk-cmd">{s.command}</span>}
            {s.model && <span className={`ch-tk-chip${s.asTask ? ' faint' : ''}`}>{s.asTask ? i18n._(COPY.tasks.asTaskChip, { name: nameOf(s.model) }) : nameOf(s.model)}</span>}
            <Where where={s.where} i18n={i18n} />
            {s.status === 'paused' && <><span className="ch-pl-sep" aria-hidden="true">·</span><span className="ch-marg">{i18n._(COPY.plan.ended, { why: s.ended ?? 'other' })}</span></>}
          </span>
        )}
      {s.kind === 'command' && s.status !== 'done' && !here && <span className="ch-tk-words ch-marg">{i18n._(s.waits ? COPY.tasks.commandNow : COPY.tasks.commandWaits)}</span>}
      {s.kind === 'yours' && s.waits && <span className="ch-tk-words ch-marg">{i18n._(COPY.tasks.yoursNow)}</span>}
      {s.answer && (
        <div className="ch-tk-answer" dir="auto">
          <span className="ch-tk-by">{i18n._(COPY.tasks.answerBy, { name: s.answer.model ? nameOf(s.answer.model) : '', num: s.answer.chatNum ?? '' })}</span>
          {' '}{s.answer.text}{' '}
          {s.answer.chatNum != null && <button type="button" className="ch-tk-l" onClick={() => onRun(OPEN(s.answer.chatNum))}>{OPEN(s.answer.chatNum)}</button>}
        </div>
      )}
    </div>
  )
}

function Open({ task, nameOf, models, rooms, validate, defaultModel = null, onRun, onWrite, onChange, onAddSub, onChangeSub, onMoveSub, onPasteSubs, onDelete }) {
  const { i18n } = useLingui()
  const set = (fields) => onChange(task.num, task.docketId, fields)
  const when = (iso) => dayOf(i18n, iso)
  // A task's own kind is its model's: a prompt, a search, or yours (its
  // command, if it has one, is its sub-task).
  const kind = task.kind === 'yours' ? null : task.kind
  const pickKind = (next) => set({ model: next ? firstOf(next, models, defaultModel) : null })
  const sendable = Boolean(task.model) || task.subs.some((s) => s.kind !== 'yours' && s.open)
  // Where sub-tasks can move: after every one sent or running.
  const firstFree = task.subs.reduce((at, s, k) => (!s.changes ? k + 1 : at), 0)
  const movable = { first: firstFree, last: task.subs.length - 1 }
  const latest = task.runs.find((r) => r.latest) ?? task.runs[0] ?? null
  const earlier = task.runs.filter((r) => r !== latest)
  return (
    <div className="ch-tk-main">
      <div className="ch-tk-head">
        <Box on={task.done} label={i18n._(COPY.tasks.tickTask, { num: task.num, title: task.title })} onClick={() => onRun(TICK(task.num, null, !task.ticked))} />
        <InPlace value={task.title} required placeholder={i18n._(COPY.tasks.untitled)} label={i18n._(COPY.tasks.taskName, { num: task.num })} maxLength={TITLE_MOST} className="ch-tk-h" onKeep={(title) => set({ title })} />
        <span className="ch-tk-end">{task.done && <span className="ch-tk-state">{i18n._(COPY.plan.statusDone)}</span>}</span>
        <div className="ch-tk-rest">
          <InPlace value={task.description} multiline placeholder={i18n._(COPY.tasks.fieldDescription)} label={i18n._(COPY.tasks.fieldDescription)} maxLength={4000} className="ch-tk-desc" onKeep={(description) => set({ description })} />
          <div className="ch-tk-pills">
            <Kinds kind={kind} only={['prompt', 'search']} onPick={pickKind} />
            {kind && (
              <>
                <span className="ch-tk-sep" aria-hidden="true" />
                <Choose label={i18n._(COPY.tasks.fieldModel)} options={whoOptions(kind, models, i18n, { chosen: task.model })} onPick={(model) => set({ model })}>
                  {nameOf(task.model)}<V />
                </Choose>
                {task.rooms.map((r) => (
                  <span key={r.chatId} className="ch-tk-chip">
                    {i18n._(COPY.tasks.room, { num: r.num ?? '?' })}
                    <button type="button" className="ch-tk-x" aria-label={i18n._(COPY.tasks.roomOff, { num: r.num ?? '?' })} onClick={() => set({ rooms: task.rooms.filter((x) => x.chatId !== r.chatId).map((x) => x.chatId) })}>×</button>
                  </span>
                ))}
                {task.rooms.length < 20 && (
                  <Choose label={i18n._(COPY.tasks.addRoom)} options={roomOptions(rooms, i18n, task.rooms.map((r) => r.chatId))} onPick={(id) => set({ rooms: [...task.rooms.map((r) => r.chatId), id] })} find ghost>
                    {i18n._(COPY.tasks.addRoom)}
                  </Choose>
                )}
              </>
            )}
          </div>
          <div className="ch-tk-foot">
            <FlowSwitch flow={task.flow} ran={task.ran} onFlow={(flow) => set({ flow })} />
            {task.subs.length > 0 && <span className="ch-marg">{i18n._(COPY.tasks.doneOf, { done: task.doneCount, count: task.subs.length })}</span>}
            {sendable && (
              <span className="ch-tk-acts">
                <button type="button" className="ch-tk-run" title={RUN(task.num).slice(1)} onClick={() => onWrite(RUN(task.num))}>
                  <svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true"><path d="M2 1.2v7.6L8.6 5z" fill="currentColor" /></svg>
                  {i18n._(COPY.tasks.run)}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
      {task.subs.map((s) => (
        <Sub key={s.stepId ?? s.n} task={task} s={s} nameOf={nameOf} models={models} rooms={rooms} validate={validate} defaultModel={defaultModel}
          onRun={onRun} onDelete={onDelete} onChangeSub={onChangeSub} onMoveSub={onMoveSub} movable={movable} />
      ))}
      <AddRow sub={{ task }} models={models} rooms={rooms} validate={validate} nameOf={nameOf} defaultModel={defaultModel}
        onSave={(f) => onAddSub(task.num, task.docketId, task.n, f)} onPaste={(titles) => onPasteSubs(task.num, task.docketId, titles)} />
      {/* The latest run on one line, the earlier ones behind open:run (C309, f). */}
      {latest && (
        <div className="ch-tk-runs1">
          <span>{i18n._(COPY.tasks.runN, { n: latest.n })}</span>
          <span className="ch-marg">
            {when(latest.createdAt)}
            {latest.state?.waits && <> · {i18n._(COPY.tasks.runWaits, { title: latest.state.waits })}</>}
            {latest.state?.running && <> · {i18n._(COPY.plan.statusRunning)}</>}
            {latest.state?.done && <> · {i18n._(COPY.plan.statusDone)}</>}
            {latest.state?.paused && <> · {i18n._(COPY.plan.statusPaused)}</>}
          </span>
          {earlier.map((r) => <button key={r.n} type="button" className="ch-tk-l" onClick={() => onRun(OPEN_RUN(r.n))}>{OPEN_RUN(r.n)}</button>)}
        </div>
      )}
    </div>
  )
}

export default function TasksBoard({ tasks, open, addressed, onAddress, nameOf = (id) => id, defaultModel = null, models, rooms = [], validate = () => null, onOpen, onRun, onWrite, onAdd, onChange, onAddSub, onChangeSub, onMoveSub, onPasteSubs, onDelete }) {
  const { i18n } = useLingui()
  const shared = { nameOf, defaultModel, models, rooms, validate, onRun, onWrite, onChange, onAddSub, onChangeSub, onMoveSub, onPasteSubs, onDelete }
  return (
    <article className={`ch-card ch-plan ch-tasks${addressed ? ' addressed' : ''}`} aria-current={addressed ? 'true' : undefined} onMouseDown={() => onAddress('docket')}>
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.docket)}</h2>
      </header>
      <div className="ch-cbody">
        {/* An empty board shows the row alone (C309, g). */}
        <AddRow models={models} rooms={rooms} validate={validate} nameOf={nameOf} defaultModel={defaultModel} onSave={onAdd} />
        {(tasks ?? []).map((t) => (t.num === open?.num
          ? <Open key={t.num} task={open} {...shared} />
          : (
            <div key={t.num} className={`ch-tk-task${t.done ? ' done' : ''}`}>
              <Box on={t.done} label={i18n._(COPY.tasks.tickTask, { num: t.num, title: t.title })} onClick={() => onRun(TICK(t.num, null, !t.ticked))} />
              <button type="button" className="ch-tk-t" dir="auto" onClick={() => onOpen(t.num)}>{t.title || i18n._(COPY.tasks.untitled)}</button>
              <span className="ch-tk-end">{t.done && <span className="ch-tk-state">{i18n._(COPY.plan.statusDone)}</span>}</span>
              <span className="ch-tk-facts ch-marg">
                {t.count > 0
                  ? i18n._(COPY.tasks.subCount, { count: t.count })
                  : (
                    <>
                      {t.kind && <span className="ch-tk-kind">{i18n._(PILL_WORDS[t.kind])}</span>}
                      {t.model && <span className="ch-tk-chip">{nameOf(t.model)}</span>}
                      <Where where={t.where} i18n={i18n} />
                    </>
                  )}
              </span>
            </div>
          )))}
        {open && !(tasks ?? []).some((t) => t.num === open.num) && <Open task={open} {...shared} />}
      </div>
    </article>
  )
}
