import { describe, it, expect } from 'vitest'
import { STATUS } from './docketModel'
import { taskRows, openTaskOf, answersOf, pastedLines } from './tasksBoard'
import { planBoardOf } from './planBoard'
import { planPromptPreview, planTick, planNewSub, planNewTask } from './planVerbs'

// The Tasks board (C301 (g), v4): every task newest first, one open with its
// sub-tasks, where each answer landed, and its runs.

const chats = {
  'c-204': { num: 204, title: 'First, the budget', branch: 'a', docketNum: 204 },
  'c-210': { num: 210, title: 'Find the figures', branch: 'b', docketNum: 207 },
}
const chatOf = (id) => chats[id] ?? null
const isSource = (m) => m === 'openalex'
const step = (id, extra = {}) => ({ id, status: STATUS.READY, prompt: `Prompt ${id}`, model: null, condition: null, ...extra })
const task = (num, extra = {}, steps = [], runExtra = {}) => ({
  docket: { id: `d-${num}`, num, title: `Task ${num}`, createdAt: `2026-11-16T10:0${num % 10}:00.000Z`, branches: [{ letter: 'a' }], order: ['a'], flow: 'oneByOne', ...extra },
  runs: [{ id: `r-${num}`, docketId: `d-${num}`, n: 1, createdAt: '2026-11-16T10:00:00.000Z', branches: { a: { status: STATUS.READY, chatId: null, steps }, ...runExtra } }],
})

describe('the tasks, as rows', () => {
  it('lists tasks newest first, leaving a chat filed alone out', () => {
    const alone = { docket: { id: 'd-1', num: 201, title: 'A chat', createdAt: '2026-11-17T00:00:00.000Z', branches: [{ letter: 'a' }], order: ['a'] }, runs: [{ n: 1, branches: { a: { chatId: 'c', steps: [step('s', { messageId: 'm', status: STATUS.DONE })] } } }] }
    const rows = taskRows([task(207), task(209), alone], { isSource, chatOf })
    expect(rows.map((r) => r.num)).toEqual([209, 207])
  })

  it('shows a task with no sub-tasks as what it is, and one with some by their count', () => {
    const [bare] = taskRows([task(207, { model: 'openalex', rooms: ['c-204'] })], { isSource, chatOf })
    expect(bare).toMatchObject({ kind: 'search', model: 'openalex', where: { room: 204 }, count: 0 })
    const [some] = taskRows([task(208, {}, [step('a'), step('b')])], { isSource, chatOf })
    expect(some).toMatchObject({ kind: null, count: 2, done: false })
  })

  it('is done when every sub-task is, or when ticked', () => {
    expect(taskRows([task(207, {}, [step('a', { status: STATUS.DONE })])], { chatOf })[0].done).toBe(true)
    expect(taskRows([task(207, { doneAt: '2026-11-16T12:00:00.000Z' }, [step('a')])], { chatOf })[0]).toMatchObject({ done: true, ticked: true })
  })
})

describe('the open task', () => {
  it('reads each sub-task: its kind, its model or the task’s, and where it goes', () => {
    const plan = task(207, { model: 'claude-sonnet-5-5', rooms: ['c-204'] }, [
      step('p1', { title: 'Draft the summary', status: STATUS.DONE }),
      step('s2', { title: 'Find the figures', model: 'openalex' }),
      step('t3', { prompt: '', title: 'Check the figures', todo: { text: 'With Anna', doneAt: null } }),
      step('c4', { prompt: '', title: 'Compare', command: 'compare:204 199' }),
    ])
    const answers = answersOf([{ chatId: 'c-204', messages: [{ id: 'm1', role: 'user', step: 'p1', content: 'Draft' }, { id: 'm2', role: 'assistant', content: 'The land trust asks…', model: 'claude-sonnet-5-5' }] }])
    const open = openTaskOf(plan, { answers, isSource, chatOf })
    expect(open.subs.map((s) => s.kind)).toEqual(['prompt', 'search', 'yours', 'command'])
    expect(open.subs[0]).toMatchObject({ title: 'Draft the summary', model: 'claude-sonnet-5-5', asTask: true, where: { room: 204 }, status: 'done', answer: { text: 'The land trust asks…', chatNum: 204 } })
    expect(open.subs[1]).toMatchObject({ model: 'openalex', asTask: false, where: { room: 204 } })
    expect(open.subs[2]).toMatchObject({ words: 'With Anna', model: null, where: null })
    expect(open.subs[3]).toMatchObject({ command: 'compare:204 199', where: null })
    expect(open).toMatchObject({ kind: 'prompt', flow: 'oneByOne', doneCount: 1, done: false, ran: false })
  })

  it('names a branch of the task where an answer went, all at once', () => {
    const plan = task(207, { model: 'claude-sonnet-5-5', flow: 'together' }, [step('p1', { status: STATUS.DONE }), step('p2')])
    const answers = answersOf([{ chatId: 'c-210', messages: [{ id: 'm1', role: 'user', step: 'p1' }, { id: 'm2', role: 'assistant', content: 'Figures' }] }])
    const open = openTaskOf(plan, { answers, isSource, chatOf })
    expect(open.subs[0].where).toEqual({ branch: '207b', chatNum: 210 })
    expect(open.subs[1].where).toEqual({ ownBranch: true })
  })

  it('names a sub-task’s own room, or its own branch, over its task’s (into)', () => {
    const plan = task(207, { model: 'claude-sonnet-5-5', rooms: ['c-204'] }, [step('p1', { into: 'c-210' }), step('p2', { into: 'own' }), step('p3')])
    const open = openTaskOf(plan, { isSource, chatOf })
    expect(open.subs.map((x) => x.where)).toEqual([{ room: 210 }, { ownBranch: true }, { room: 204 }])
    expect(open.subs.map((x) => x.into)).toEqual(['c-210', 'own', null])
  })

  it('lists its runs, the one waiting for you with where', () => {
    const plan = task(207, {}, [step('t1', { prompt: '', title: 'Check', todo: { text: '', doneAt: null } }), step('p2')])
    const open = openTaskOf(plan, { chatOf, waitsAt: 't1', running: true })
    expect(open.runs).toEqual([{ n: 1, createdAt: '2026-11-16T10:00:00.000Z', state: { waits: 'Check' }, started: false, latest: true }])
    expect(open.subs[0].waits).toBe(true)
    expect(openTaskOf(plan, { chatOf }).runs).toEqual([])
  })
})

describe('the task commands', () => {
  const screensOf = (plan, extra = {}) => ({ plan: planBoardOf(plan), ...extra })

  it('new:task makes a task; new:subtask adds one of the task’s kind', () => {
    expect(planNewTask({ match: { values: [null, { kind: 'text', value: 'Moving house' }] } })).toMatchObject({ act: { kind: 'newTask', title: 'Moving house' } })
    const yours = planNewSub({ match: { values: [null, { kind: 'address', num: 207 }, { kind: 'text', value: 'Book the van' }] } }, screensOf(task(207)))
    expect(yours.act).toMatchObject({ kind: 'planStep', letter: 'a', title: 'Book the van', todo: true, prompt: '' })
    const asks = planNewSub({ match: { values: [null, { kind: 'text', value: 'Draft it' }] } }, screensOf(task(207, { model: 'claude-sonnet-5-5' })))
    expect(asks.act).toMatchObject({ title: 'Draft it', prompt: 'Draft it' })
    expect(asks.act.todo).toBeUndefined()
  })

  it('tick:207 ticks the task; tick:207 2 a sub-task; one sent is refused', () => {
    const plan = task(207, {}, [step('p1', { messageId: 'm1', status: STATUS.DONE }), step('t2', { prompt: '', todo: { text: 'Call', doneAt: null } })])
    const sc = screensOf(plan)
    expect(planTick({ match: { values: [{ kind: 'address', num: 207 }] } }, sc)).toMatchObject({ act: { kind: 'tickTask', done: true }, says: { message: 'taskTickGoYours' } })
    expect(planTick({ match: { values: [{ kind: 'address', num: 207 }, { kind: 'number', value: 2 }] } }, sc)).toMatchObject({ act: { kind: 'tickTodo', letter: 'a', stepId: 't2', done: true } })
    expect(planTick({ match: { values: [{ kind: 'address', num: 207 }, { kind: 'number', value: 1 }] } }, sc)).toMatchObject({ act: null, says: { message: 'tickSent' } })
    // A task not open, ticked from its row.
    const other = planTick({ match: { values: [{ kind: 'address', num: 209 }] } }, { ...sc, tasks: [{ num: 209, docketId: 'd-209', title: 'Pack', ticked: false }] })
    expect(other).toMatchObject({ act: { kind: 'tickTask', docketId: 'd-209', done: true } })
  })

  it('a prompt typed on the board adds the task’s next sub-task, by its number', () => {
    const out = planPromptPreview('Tighten it', planBoardOf(task(207, {}, [step('p1')])))
    expect(out).toMatchObject({ ready: true, says: { message: 'planPromptStep', values: { index: 2, address: '207' } }, act: { letter: 'a' } })
  })
})

describe('a pasted list (C309)', () => {
  it('makes one name a line, empty lines left out, and keeps a command as words', () => {
    expect(pastedLines('Ring Anna\r\n>delete:everything\n\n  Check   the budget ')).toEqual(['Ring Anna', '>delete:everything', 'Check the budget'])
  })
  it('leaves one line to be typed as it is, and takes no more than the most', () => {
    expect(pastedLines('Just one')).toBeNull()
    expect(pastedLines('a\nb\nc', 2)).toEqual(['a', 'b'])
    expect(pastedLines(`${'x'.repeat(300)}\ny`)[0]).toHaveLength(200)
  })
})
