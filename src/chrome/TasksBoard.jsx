import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { say } from './say'
import { dayOf } from './when'

// The Tasks board (C301 (g), ruled 16 November, v4): every task with a box,
// newest first, and one open in place, with its sub-tasks, where each one's
// answer landed, and its runs. A box ticks, as tick: does. A plus adds a
// task, or a sub-task, in place: its name, a description, its kind (none,
// yours; a prompt; a search; a command), its model, its rooms and its flow.
// Words on it are only "done" and "running": a task with no model is yours.
//
// tasks: tasksBoard.taskRows; open: tasksBoard.openTaskOf; models: the
// picker's rows, by group; rooms: [{ chatId, num, title }]; validate(line):
// what the bar would say of a command, to check it as it is written.

const KINDS = ['yours', 'prompt', 'search', 'command']
const KIND_WORDS = { yours: COPY.tasks.kindNone, prompt: COPY.tasks.kindPrompt, search: COPY.tasks.kindSearch, command: COPY.tasks.kindCommand }
const PILL_WORDS = { prompt: COPY.tasks.pillPrompt, search: COPY.tasks.pillSearch, command: COPY.tasks.pillCommand }
// Commands, which stay English.
const TICK = (num, n, on) => (n == null ? `tick:${on ? '' : 'off '}${num}` : `tick:${on ? '' : 'off '}${num} ${n}`)
const RUN = (num) => `>run:${num}`
const OPEN = (num) => `open:${num}`
const OPEN_RUN = (n) => `open:run ${n}`
const DELETE_SUB = (num, n) => `delete:${num}a ${n}`

const kindOfModel = (id, models) => (id && (models?.source ?? []).some((r) => r.id === id) ? 'search' : id ? 'prompt' : 'yours')

function Box({ on, label, onClick, disabled = false }) {
  return (
    <button type="button" role="checkbox" aria-checked={on ? 'true' : 'false'} aria-label={label} className={`ch-tk-box${on ? ' on' : ''}`} onClick={onClick} disabled={disabled}>
      {on && <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  )
}

function Plus({ label, onClick, sub = false }) {
  return (
    <button type="button" className={`ch-tk-plus${sub ? ' sub' : ''}`} onClick={onClick}>
      <span className="ch-tk-p" aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

const Sep = () => <span className="ch-pl-sep" aria-hidden="true">·</span>

function Where({ where, i18n }) {
  if (!where) return null
  if (where.room != null) return <span className="ch-tk-chip">{i18n._(COPY.tasks.room, { num: where.room })}</span>
  if (where.branch) return <span className="ch-tk-chip">{where.branch}</span>
  if (where.ownBranch) return <span className="ch-tk-chip faint">{i18n._(COPY.tasks.ownBranch)}</span>
  return null
}

// The models a kind can ask: a prompt, the models and those on this
// computer; a search, the sources.
function modelOptions(kind, models) {
  if (kind === 'search') return models?.source ?? []
  if (kind === 'prompt') return [...(models?.model ?? []), ...(models?.local ?? [])].filter((r) => !r.later && !r.unchecked)
  return []
}

// A task or a sub-task, added in place (v4, §2). sub: { task } for a
// sub-task, which starts with its task's kind and model.
// A sub-task's room (C301 (g), "Yes, add into"): as its task's (null), a
// room's chat, or 'own' for a chat of its own. fixedKind: a sub-task being
// changed keeps its kind.
function TaskForm({ sub = null, models, rooms, validate, nameOf, onKeep, onCancel, start = null, defaultModel = null, fixedKind = false }) {
  const { i18n } = useLingui()
  const taskKind = sub ? kindOfModel(sub.task.model, models) : 'yours'
  const [title, setTitle] = useState(start?.title ?? '')
  const [words, setWords] = useState(start?.description ?? '')
  const [kind, setKind] = useState(start?.kind ?? taskKind)
  const [model, setModel] = useState(start?.model ?? null)
  const [command, setCommand] = useState(start?.command ?? '')
  const [into, setInto] = useState(start?.into ?? null)
  const [picked, setPicked] = useState(start?.rooms ?? [])
  const [find, setFind] = useState('')
  const [flow, setFlow] = useState(start?.flow ?? 'oneByOne')
  const name = useRef(null)
  useEffect(() => { name.current?.focus() }, [])
  const options = modelOptions(kind, models)
  // A sub-task's model is the task's unless one is picked.
  const fallback = options.some((r) => r.id === defaultModel) ? defaultModel : options[0]?.id ?? null
  const chosen = sub && model == null && kind === taskKind ? null : model ?? fallback
  const line = command.trim().replace(/^>/, '').trim()
  const checked = kind === 'command' && line ? validate(line) : null
  const refused = kind === 'command' && (!line || (checked && !checked.act && !checked.next))
  const canKeep = title.trim() !== '' && !refused && (kind !== 'prompt' && kind !== 'search' ? true : Boolean(chosen) || Boolean(sub))
  const found = find.trim()
    ? rooms.filter((r) => !picked.includes(r.chatId) && r.chatId !== into && (String(r.num).startsWith(find.trim()) || r.title.toLocaleLowerCase().includes(find.trim().toLocaleLowerCase()))).slice(0, 6)
    : []
  const asks = kind === 'prompt' || kind === 'search'
  const intoRoom = into && into !== 'own' ? rooms.find((r) => r.chatId === into) : null
  const keep = () => {
    if (!canKeep) return
    onKeep({
      title: title.trim(), kind,
      ...(sub ? { words: words.trim(), into: asks ? into : null } : { description: words.trim(), rooms: picked, flow }),
      model: kind === 'prompt' || kind === 'search' ? chosen : null,
      ...(kind === 'command' ? { command: line } : {}),
    })
  }
  return (
    <div className={`ch-tk-form${sub ? ' sub' : ''}`} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }}>
      <label className="ch-tk-f">
        <span className="ch-tk-k">{i18n._(COPY.tasks.fieldName)}</span>
        <input ref={name} className="ch-tk-in" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') keep() }} />
      </label>
      {kind !== 'command' && (
        <label className="ch-tk-f">
          <span className="ch-tk-k">{i18n._(sub ? (kind === 'search' ? COPY.tasks.fieldSearch : kind === 'prompt' ? COPY.tasks.fieldPrompt : COPY.tasks.fieldWords) : COPY.tasks.fieldDescription)}</span>
          <textarea className="ch-tk-in" rows={2} value={words} maxLength={sub ? 100000 : 4000} placeholder={i18n._(COPY.tasks.ifYouLike)} onChange={(e) => setWords(e.target.value)} />
        </label>
      )}
      <div className="ch-tk-f" role="radiogroup" aria-label={i18n._(COPY.tasks.fieldKind)}>
        <span className="ch-tk-k">{i18n._(COPY.tasks.fieldKind)}</span>
        <span className="ch-tk-pick">
          {KINDS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k ? 'true' : 'false'} className={`ch-tk-opt${kind === k ? ' on' : ''}`} disabled={fixedKind && kind !== k} onClick={() => { setKind(k); setModel(null) }}>{i18n._(KIND_WORDS[k])}</button>
          ))}
        </span>
      </div>
      {(kind === 'prompt' || kind === 'search') && (
        <label className="ch-tk-f">
          <span className="ch-tk-k">{i18n._(kind === 'search' ? COPY.tasks.fieldSource : COPY.tasks.fieldModel)}</span>
          <select className="ch-tk-in ch-tk-drop" value={chosen ?? ''} onChange={(e) => setModel(e.target.value || null)}>
            {sub && kind === taskKind && <option value="">{i18n._(COPY.tasks.asTask, { name: nameOf(sub.task.model) })}</option>}
            {options.map((r) => <option key={r.id} value={r.id}>{r.name}{r.needsKey ? ` · ${i18n._(COPY.tasks.needsKey)}` : ''}</option>)}
          </select>
        </label>
      )}
      {kind === 'command' && (
        <>
          <label className="ch-tk-f">
            <span className="ch-tk-k">{i18n._(COPY.tasks.fieldCommand)}</span>
            <input className="ch-tk-in ch-tk-cmd" value={command} maxLength={2000} spellCheck={false} placeholder={i18n._(COPY.tasks.commandExample)} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') keep() }} />
          </label>
          {checked?.says && (
            <div className="ch-tk-f"><span className="ch-tk-k" /><span className={`ch-marg${refused ? ' ch-tk-bad' : ''}`}>{say(i18n, checked.says.message, checked.says.values)}</span></div>
          )}
          <div className="ch-tk-f"><span className="ch-tk-k" /><span className="ch-marg">{i18n._(COPY.tasks.commandWaits)}</span></div>
        </>
      )}
      {!sub && (
        <>
          <div className="ch-tk-f">
            <span className="ch-tk-k">{i18n._(COPY.tasks.fieldRooms)}</span>
            <span className="ch-tk-pick">
              {picked.map((id) => {
                const r = rooms.find((x) => x.chatId === id)
                return (
                  <span key={id} className="ch-tk-opt on">
                    {i18n._(COPY.tasks.room, { num: r?.num ?? '?' })}
                    <button type="button" className="ch-tk-x" aria-label={i18n._(COPY.tasks.roomOff, { num: r?.num ?? '?' })} onClick={() => setPicked(picked.filter((x) => x !== id))}>×</button>
                  </span>
                )
              })}
              <span className="ch-tk-find">
                <input className="ch-tk-in" value={find} placeholder={i18n._(COPY.tasks.findRooms)} aria-label={i18n._(COPY.tasks.findRooms)} onChange={(e) => setFind(e.target.value)} />
                {found.length > 0 && (
                  <span className="ch-tk-menu" role="listbox">
                    {found.map((r) => (
                      <button key={r.chatId} type="button" role="option" aria-selected="false" onClick={() => { setPicked([...picked, r.chatId].slice(0, 20)); setFind('') }}>{r.num} · {r.title}</button>
                    ))}
                  </span>
                )}
              </span>
              {!picked.length && <span className="ch-marg">{i18n._(kind === 'yours' || kind === 'command' ? COPY.tasks.noRoom : COPY.tasks.ownRoom)}</span>}
            </span>
          </div>
          <div className="ch-tk-f">
            <span className="ch-tk-k">{i18n._(COPY.tasks.fieldFlow)}</span>
            <span className="ch-tk-seg" role="radiogroup" aria-label={i18n._(COPY.tasks.fieldFlow)}>
              <button type="button" role="radio" aria-checked={flow === 'together' ? 'true' : 'false'} className={flow === 'together' ? 'on' : undefined} disabled={start?.ran} onClick={() => setFlow('together')}>{i18n._(COPY.tasks.flowTogether)}</button>
              <button type="button" role="radio" aria-checked={flow === 'oneByOne' ? 'true' : 'false'} className={flow === 'oneByOne' ? 'on' : undefined} disabled={start?.ran} onClick={() => setFlow('oneByOne')}>{i18n._(COPY.tasks.flowOneByOne)}</button>
            </span>
          </div>
        </>
      )}
      {sub && asks && (
        <div className="ch-tk-f" role="radiogroup" aria-label={i18n._(COPY.tasks.fieldRoom)}>
          <span className="ch-tk-k">{i18n._(COPY.tasks.fieldRoom)}</span>
          <span className="ch-tk-pick">
            <button type="button" role="radio" aria-checked={into == null ? 'true' : 'false'} className={`ch-tk-opt${into == null ? ' on' : ''}`} onClick={() => setInto(null)}>{i18n._(COPY.tasks.asTaskWhere)}</button>
            {intoRoom && <span className="ch-tk-opt on" role="radio" aria-checked="true">{i18n._(COPY.tasks.room, { num: intoRoom.num })}</span>}
            <button type="button" role="radio" aria-checked={into === 'own' ? 'true' : 'false'} className={`ch-tk-opt${into === 'own' ? ' on' : ''}`} onClick={() => setInto('own')}>{i18n._(COPY.tasks.ownBranch)}</button>
            <span className="ch-tk-find">
              <input className="ch-tk-in" value={find} placeholder={i18n._(COPY.tasks.findRooms)} aria-label={i18n._(COPY.tasks.findRooms)} onChange={(e) => setFind(e.target.value)} />
              {found.length > 0 && (
                <span className="ch-tk-menu" role="listbox">
                  {found.map((r) => (
                    <button key={r.chatId} type="button" role="option" aria-selected="false" onClick={() => { setInto(r.chatId); setFind('') }}>{r.num} · {r.title}</button>
                  ))}
                </span>
              )}
            </span>
          </span>
        </div>
      )}
      <div className="ch-tk-f">
        <span className="ch-tk-k" />
        <span className="ch-tk-acts">
          <button type="button" className="ch-tk-keep" disabled={!canKeep} onClick={keep}>{i18n._(start ? COPY.tasks.keep : sub ? COPY.tasks.addSub : COPY.tasks.add)}</button>
          <button type="button" className="ch-tk-cancel" onClick={onCancel}>{i18n._(COPY.tasks.cancel)}</button>
        </span>
      </div>
    </div>
  )
}

// A sub-task not yet sent can be changed in place, its kind kept: its name,
// its words, its model and its room (C301 (g), "Yes, add into").
function Sub({ task, s, nameOf, onRun, onDelete, form = null, onChangeSub }) {
  const { i18n } = useLingui()
  const [changing, setChanging] = useState(false)
  if (changing && form) {
    return (
      <TaskForm
        {...form} sub={{ task }} fixedKind
        start={{ title: s.title, description: s.command ? '' : s.words, kind: s.kind, model: s.ownModel, into: s.into, command: s.command ?? '' }}
        onCancel={() => setChanging(false)}
        onKeep={(f) => {
          const asks = f.kind === 'prompt' || f.kind === 'search'
          onChangeSub(task.docketId, s.stepId, {
            title: f.title,
            ...(f.kind === 'yours' ? { text: f.words } : f.kind === 'command' ? { command: f.command } : { prompt: f.words || f.title }),
            ...(asks ? { model: f.model ?? null, into: f.into ?? null } : {}),
          })
          setChanging(false)
        }}
      />
    )
  }
  return (
    <div className={`ch-tk-sub${s.status === 'done' ? ' done' : ''}${s.waits ? ' waits' : ''}`}>
      <Box
        on={s.status === 'done'} disabled={!s.changes && s.status !== 'done'}
        label={i18n._(COPY.tasks.tickSub, { n: s.n, num: task.num, title: s.title })}
        onClick={() => { if (s.changes || s.status === 'done') onRun(TICK(task.num, s.n, s.status !== 'done')) }}
      />
      <span className="ch-tk-title" dir="auto">{s.title || i18n._(COPY.tasks.untitled)}</span>
      <span className="ch-tk-end">
        {s.status === 'done' && <span className="ch-tk-state">{i18n._(COPY.plan.statusDone)}</span>}
        {s.status === 'running' && <span className="ch-tk-state running"><span className="ch-pl-dot" aria-hidden="true" />{i18n._(COPY.plan.statusRunning)}</span>}
        {s.changes && s.status !== 'done' && form && <button type="button" className="ch-tk-l" onClick={() => setChanging(true)}>{i18n._(COPY.tasks.change)}</button>}
        {s.changes && s.status !== 'done' && <button type="button" className="ch-tk-del" aria-label={i18n._(COPY.tasks.deleteSub, { n: s.n, num: task.num })} title={i18n._(COPY.tasks.deleteSub, { n: s.n, num: task.num })} onClick={() => onDelete(DELETE_SUB(task.num, s.n))}>×</button>}
      </span>
      {s.words && s.named && s.words.trim() !== s.title && <span className="ch-tk-words" dir="auto">{s.words}</span>}
      {(s.kind !== 'yours') && (
        <span className="ch-tk-who">
          <span className="ch-tk-kind">{i18n._(PILL_WORDS[s.kind])}</span>
          {s.command && <span className="ch-tk-cmd">{s.command}</span>}
          {s.model && <span className={`ch-tk-chip${s.asTask ? ' faint' : ''}`}>{s.asTask ? i18n._(COPY.tasks.asTaskChip, { name: nameOf(s.model) }) : nameOf(s.model)}</span>}
          <Where where={s.where} i18n={i18n} />
          {s.status === 'paused' && <><Sep /><span className="ch-marg">{i18n._(COPY.plan.ended, { why: s.ended ?? 'other' })}</span></>}
        </span>
      )}
      {s.kind === 'command' && s.status !== 'done' && <span className="ch-tk-words ch-marg">{i18n._(s.waits ? COPY.tasks.commandNow : COPY.tasks.commandWaits)}</span>}
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

function Open({ task, nameOf, models, rooms, validate, defaultModel = null, onRun, onWrite, onChange, onAddSub, onChangeSub, onDelete }) {
  const { i18n } = useLingui()
  const [adding, setAdding] = useState(false)
  const [changing, setChanging] = useState(false)
  const when = (iso) => dayOf(i18n, iso)
  return (
    <div className="ch-tk-main">
      {changing ? (
        <TaskForm
          models={models} rooms={rooms} validate={validate} nameOf={nameOf} defaultModel={defaultModel}
          start={{ title: task.title, description: task.description, kind: task.kind, model: task.model, rooms: task.rooms.map((r) => r.chatId), flow: task.flow, ran: task.ran }}
          onCancel={() => setChanging(false)}
          onKeep={(f) => { onChange(task.num, task.docketId, { title: f.title, description: f.description, model: f.model, rooms: f.rooms, ...(task.ran ? {} : { flow: f.flow }) }); setChanging(false) }}
        />
      ) : (
        <div className="ch-tk-head">
          <Box on={task.done} label={i18n._(COPY.tasks.tickTask, { num: task.num, title: task.title })} onClick={() => onRun(TICK(task.num, null, !task.ticked))} />
          <h3 dir="auto">{task.title || i18n._(COPY.tasks.untitled)}</h3>
          <span className="ch-tk-end">
            {task.done && <span className="ch-tk-state">{i18n._(COPY.plan.statusDone)}</span>}
            {task.isTask && <button type="button" className="ch-tk-l" onClick={() => setChanging(true)}>{i18n._(COPY.tasks.change)}</button>}
          </span>
          {task.description && <span className="ch-tk-desc" dir="auto">{task.description}</span>}
          <span className="ch-tk-meta">
            {task.kind !== 'yours' && <span className="ch-tk-kind">{i18n._(PILL_WORDS[task.kind])}</span>}
            {task.model && <span className="ch-tk-chip">{nameOf(task.model)}</span>}
            {task.rooms.map((r) => <span key={r.chatId} className="ch-tk-chip">{i18n._(COPY.tasks.room, { num: r.num ?? '?' })}</span>)}
            <span className="ch-marg">
              {i18n._(task.flow === 'together' ? COPY.tasks.flowTogetherLow : COPY.tasks.flowOneByOneLow)}
              {task.subs.length > 0 && <> · {i18n._(COPY.tasks.doneOf, { done: task.doneCount, count: task.subs.length })}</>}
            </span>
            <button type="button" className="ch-tk-l" onClick={() => onWrite(RUN(task.num))}>{RUN(task.num).slice(1)}</button>
          </span>
        </div>
      )}
      {task.subs.map((s) => <Sub key={s.stepId ?? s.n} task={task} s={s} nameOf={nameOf} onRun={onRun} onDelete={onDelete} onChangeSub={onChangeSub} form={{ models, rooms, validate, nameOf, defaultModel }} />)}
      {adding
        ? <TaskForm sub={{ task }} models={models} rooms={rooms} validate={validate} nameOf={nameOf} defaultModel={defaultModel} onCancel={() => setAdding(false)} onKeep={(f) => { onAddSub(task.num, task.docketId, task.n, f); setAdding(false) }} />
        : <Plus sub label={i18n._(COPY.tasks.addSubPlus)} onClick={() => setAdding(true)} />}
      {task.runs.length > 0 && (
        <div className="ch-tk-runs">
          <h4>{i18n._(COPY.tasks.runs)}</h4>
          <ul>
            {task.runs.map((r) => (
              <li key={r.n}>
                <span>{i18n._(COPY.tasks.runN, { n: r.n })}</span>
                <span className="ch-marg">
                  {when(r.createdAt)}
                  {r.state?.waits && <> · {i18n._(COPY.tasks.runWaits, { title: r.state.waits })}</>}
                  {r.state?.running && <> · {i18n._(COPY.plan.statusRunning)}</>}
                  {r.state?.done && <> · {i18n._(COPY.plan.statusDone)}</>}
                  {r.state?.paused && <> · {i18n._(COPY.plan.statusPaused)}</>}
                </span>
                {!r.latest && <button type="button" className="ch-tk-l" onClick={() => onRun(OPEN_RUN(r.n))}>{OPEN_RUN(r.n)}</button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function TasksBoard({ tasks, open, addressed, onAddress, nameOf = (id) => id, defaultModel = null, models, rooms = [], validate = () => null, onOpen, onRun, onWrite, onAdd, onChange, onAddSub, onChangeSub, onDelete }) {
  const { i18n } = useLingui()
  const [adding, setAdding] = useState(false)
  return (
    <article className={`ch-card ch-plan ch-tasks${addressed ? ' addressed' : ''}`} aria-current={addressed ? 'true' : undefined} onMouseDown={() => onAddress('docket')}>
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.docket)}</h2>
      </header>
      <div className="ch-cbody">
        {adding
          ? <TaskForm models={models} rooms={rooms} validate={validate} nameOf={nameOf} defaultModel={defaultModel} onCancel={() => setAdding(false)} onKeep={(f) => { onAdd(f); setAdding(false) }} />
          : <Plus label={i18n._(COPY.tasks.addPlus)} onClick={() => setAdding(true)} />}
        {tasks && !tasks.length && !adding && (
          <div className="ch-pl-none">
            <p>{i18n._(COPY.tasks.none)}</p>
            <p className="ch-marg">{i18n._(COPY.tasks.noneHow)}</p>
          </div>
        )}
        {(tasks ?? []).map((t) => (t.num === open?.num
          ? <Open key={t.num} task={open} nameOf={nameOf} defaultModel={defaultModel} models={models} rooms={rooms} validate={validate} onRun={onRun} onWrite={onWrite} onChange={onChange} onAddSub={onAddSub} onChangeSub={onChangeSub} onDelete={onDelete} />
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
        {open && !(tasks ?? []).some((t) => t.num === open.num) && (
          <Open task={open} nameOf={nameOf} defaultModel={defaultModel} models={models} rooms={rooms} validate={validate} onRun={onRun} onWrite={onWrite} onChange={onChange} onAddSub={onAddSub} onChangeSub={onChangeSub} onDelete={onDelete} />
        )}
      </div>
    </article>
  )
}
