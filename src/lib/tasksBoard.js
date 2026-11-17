// What the Tasks board shows (C301 (g), ruled 16 November, v4): every task
// with a box, newest first, and the one open, with its sub-tasks, where each
// one's answer landed, and its runs. Worked out from the stored plans; the
// board draws it. Pure, so it is tested alone.

import { STATUS, isTodo } from './docketModel'
import { FLOWS, isCommand, isTaskish, kindOf, modelOf, taskDone, taskOf, titleOf } from './taskModel'

const laneOf = (run) => run?.branches?.a ?? null
const latestOf = (runs) => [...(runs ?? [])].sort((a, b) => a.n - b.n).at(-1) ?? null

/**
 * The tasks, newest first, each as a row: its box, its name, what it is.
 * isSource(model id): whether it names a source; chatOf(chat id): { num, title }.
 */
export function taskRows(plans, { isSource = () => false, chatOf = () => null } = {}) {
  return (plans ?? [])
    .filter(({ docket, runs }) => isTaskish(docket, runs))
    .map(({ docket, runs }) => {
      const t = taskOf(docket)
      const steps = laneOf(latestOf(runs))?.steps ?? []
      const room = t.rooms.length ? chatOf(t.rooms[0]) : null
      const lane = latestOf(runs)?.branches?.a
      const own = lane?.chatId ? chatOf(lane.chatId) : null
      return {
        docketId: docket.id,
        num: docket.num,
        title: t.title,
        description: t.description,
        createdAt: docket.createdAt ?? '',
        done: taskDone(docket, steps),
        ticked: Boolean(t.doneAt),
        count: steps.length,
        // A task with no sub-tasks shows what it is itself.
        kind: steps.length ? null : (t.model ? (isSource(t.model) ? 'search' : 'prompt') : null),
        model: t.model,
        where: steps.length ? null : room ? { room: room.num } : own ? { branch: `${docket.num}a` } : null,
        isTask: FLOWS.includes(docket.flow),
      }
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.num - a.num)
}

/**
 * The open task: the plan as stored ({ docket, runs }), at its last run,
 * with each sub-task's answer as found in the chats (answers: step id ->
 * { chatId, text, model }), who runs here (waits: step id of the one a run
 * waits at, running: whether it runs).
 */
export function openTaskOf(plan, { answers = new Map(), isSource = () => false, chatOf = () => null, waitsAt = null, running = false } = {}) {
  if (!plan?.docket) return null
  const { docket } = plan
  const runs = [...(plan.runs ?? [])].sort((a, b) => a.n - b.n)
  const run = runs.at(-1) ?? null
  const t = taskOf(docket)
  const steps = laneOf(run)?.steps ?? []
  const roomChat = t.rooms.length ? chatOf(t.rooms[0]) : null
  const own = laneOf(run)?.chatId ? chatOf(laneOf(run).chatId) : null
  const ran = runs.length > 1 || runs.some((r) => Object.values(r.branches ?? {}).some((b) => b?.chatId || (b?.steps ?? []).some((s) => s.messageId || s.status === STATUS.RUNNING || s.status === STATUS.PAUSED)))
  const subs = steps.map((s, i) => {
    const kind = kindOf(s, docket, isSource)
    const answer = s.id ? answers.get(s.id) ?? null : null
    const landed = answer ? chatOf(answer.chatId) : null
    const asks = kind === 'prompt' || kind === 'search'
    let where = null
    if (asks) {
      const room = typeof s.into === 'string' && s.into !== 'own' ? chatOf(s.into) : null
      if (landed?.branch && landed.docketNum === docket.num) where = { branch: `${docket.num}${landed.branch}`, chatNum: landed.num }
      else if (landed) where = { room: landed.num }
      // Its own room, or a chat of its own (C301 (g), "Yes, add into").
      else if (s.into === 'own') where = { ownBranch: true }
      else if (room) where = { room: room.num }
      else if (t.flow === 'together') where = { ownBranch: true }
      else if (roomChat) where = { room: roomChat.num }
      else where = { branch: `${docket.num}a`, chatNum: own?.num ?? null }
    }
    const status = s.status === STATUS.RUNNING ? 'running' : s.status === STATUS.DONE ? 'done' : s.status === STATUS.PAUSED ? 'paused' : null
    return {
      stepId: s.id ?? null,
      n: i + 1,
      title: titleOf(s),
      named: typeof s.title === 'string' && s.title.trim() !== '',
      words: isTodo(s) ? String(s.todo.text ?? '') : isCommand(s) ? '' : String(s.prompt ?? ''),
      command: isCommand(s) ? s.command : null,
      into: typeof s.into === 'string' && s.into ? s.into : null,
      ownModel: s.model ?? null,
      kind,
      model: asks ? modelOf(s, docket) : null,
      asTask: asks && !s.model,
      where,
      status,
      ended: s.ended ?? null,
      open: !s.messageId && s.status !== STATUS.RUNNING && s.status !== STATUS.DONE,
      // Only a sub-task not yet sent changes; one sent is a record.
      changes: !s.messageId && s.status !== STATUS.RUNNING,
      waits: waitsAt != null && waitsAt === s.id,
      answer: answer && answer.text ? { text: answer.text, model: answer.model ?? null, chatNum: landed?.num ?? null } : null,
    }
  })
  const runRows = [...runs].reverse().map((r) => {
    const lane = (laneOf(r)?.steps ?? [])
    const isLatest = r.n === run?.n
    const waiting = isLatest && waitsAt ? lane.find((s) => s.id === waitsAt) : null
    const any = lane.some((s) => s.messageId || s.status !== STATUS.READY)
    let state = null
    if (waiting) state = { waits: titleOf(waiting) }
    else if (isLatest && running) state = { running: true }
    else if (lane.length && lane.every((s) => s.status === STATUS.DONE)) state = { done: true }
    else if (lane.some((s) => s.status === STATUS.PAUSED)) state = { paused: true }
    return { n: r.n, createdAt: r.createdAt ?? '', state, started: any, latest: isLatest }
  }).filter((r) => r.started || !r.latest || r.state)
  return {
    docketId: docket.id,
    num: docket.num,
    isTask: FLOWS.includes(docket.flow),
    title: t.title,
    description: t.description,
    model: t.model,
    kind: t.model ? (isSource(t.model) ? 'search' : 'prompt') : 'yours',
    rooms: t.rooms.map((id) => ({ chatId: id, ...(chatOf(id) ?? {}) })),
    flow: t.flow,
    ticked: Boolean(t.doneAt),
    done: taskDone(docket, steps),
    doneCount: steps.filter((s) => s.status === STATUS.DONE).length,
    ran,
    n: run?.n ?? 1,
    subs,
    runs: runRows,
    // Branches of before, with steps of their own: shown as the plan they are.
    older: !FLOWS.includes(docket.flow) && Object.entries(run?.branches ?? {}).some(([l, b]) => l !== 'a' && (b?.steps ?? []).length > 0),
  }
}

/**
 * The answer each sub-task got, from the messages of the chats it may have
 * gone into: the reply after the prompt that names it (m.step).
 * @param {Array<{ chatId: string, messages: object[] }>} chats
 */
export function answersOf(chats) {
  const out = new Map()
  for (const { chatId, messages } of chats ?? []) {
    const list = messages ?? []
    list.forEach((m, i) => {
      if (m.role !== 'user' || typeof m.step !== 'string') return
      const reply = list.slice(i + 1).find((x) => x.role === 'assistant')
      const text = reply && typeof reply.content === 'string' ? reply.content : ''
      out.set(m.step, { chatId, text: text.replace(/\s+/g, ' ').trim().slice(0, 400), model: reply?.model ?? null })
    })
  }
  return out
}

/** The most lines a paste makes into sub-tasks at once (C309). */
export const PASTE_MOST = 50

/**
 * A paste of several lines, as sub-tasks' names (C309): each line, its
 * spaces closed up, empty ones left out, cut to a name's length; null for
 * one line, which is typed as it is. Pasted text is data: a line starting
 * with > is a name like any other, never a command.
 */
export function pastedLines(text, most = PASTE_MOST) {
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  return lines.length > 1 ? lines.slice(0, most).map((l) => l.slice(0, 200)) : null
}
