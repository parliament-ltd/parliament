// The row verbs of Records (refactor-plan.md, stage 6, piece 3; Almanac
// v30; C143): pin:, archive:, name:, tagadd:, retag:, untag: and copy:.
//
// Each is planned from the rows as Records holds them, before Enter: which
// rows it names, what it would change on each, and what the Enter line says.
// A change names the fields it expects to find, so the write path can refuse
// one that something else has overtaken meanwhile (records.changeRecords).
//
// Pure: rows come from almanacRows.js; the Enter line's words from the copy
// table, by key.

export const TITLE_MAX = 120
export const TAG_MAX = 40

const lower = (text) => String(text ?? '').toLocaleLowerCase()
const sameTag = (a, b) => lower(a) === lower(b)
const typed = (a) => (a?.kind === 'text' ? a.value : a?.text ?? '')
const flat = (values = []) => values.flatMap((a) => (a.kind === 'list' ? a.items : [a]))
const nums = (rows) => rows.map((r) => r.num)

// A field as a row carries it, for what a change expects to find.
const FIELD = {
  pinned: (r) => Boolean(r.pinned),
  archived: (r) => Boolean(r.archived),
  tags: (r) => [...(r.tags ?? [])],
  tagsMine: (r) => [...(r.tagsMine ?? [])],
  title: (r) => r.title ?? '',
}
const change = (row, set) => ({
  store: row.store, id: row.id, num: row.num, set,
  expect: Object.fromEntries(Object.keys(set).map((k) => [k, FIELD[k](row)])),
})

/**
 * The rows some addresses name (C143 (a)): a number's row; a branch's chat
 * (201b); a plan of one branch's chat, which stands for it (C127).
 * @returns {{ rows: object[] }|{ bad: { message: string, values?: object } }}
 */
export function targetsOf(args, rows, { changes = false } = {}) {
  const out = []
  for (const a of flat(args)) {
    if (a.kind !== 'address' && a.kind !== 'number') return { bad: { message: 'byNumber' } }
    const num = a.kind === 'number' ? a.value : a.num
    const row = a.letter
      ? rows.find((r) => r.kind === 'chat' && r.docketNum === num && r.branch === a.letter)
      : rows.find((r) => r.num === num) ?? rows.find((r) => r.kind === 'chat' && r.docketNum === num)
    if (!row) return { bad: { message: 'numNone', values: { num: a.text ?? String(num) } } }
    // Edits and asks are changed by their own commands (C220 (d)).
    if (!changes && (row.kind === 'edit' || row.kind === 'ask')) return { bad: { message: 'changeNotThis', values: { num: String(num) } } }
    if (!out.includes(row)) out.push(row)
  }
  return { rows: out }
}

/** pin:. Pins what it names; when every one is pinned, unpins them (C143 (a)). */
export function planPin(targets) {
  const off = targets.every((r) => r.pinned)
  const moving = targets.filter((r) => Boolean(r.pinned) === off)
  return {
    says: { message: off ? 'pinOff' : 'pinOn', values: { nums: nums(moving) } },
    changes: moving.map((r) => change(r, { pinned: !off })),
  }
}

/** archive: and archive:off, row by row (C135, C143 (c)). */
export function planArchive(targets, off = false) {
  const moving = targets.filter((r) => Boolean(r.archived) === off)
  if (!moving.length) return { says: { message: off ? 'archiveNot' : 'archiveAlready' }, changes: [] }
  return {
    says: { message: off ? 'archiveOff' : 'archiveOn', values: { nums: nums(moving) } },
    changes: moving.map((r) => change(r, { archived: !off })),
  }
}

/** A title as typed, or why it cannot be one. */
export function cleanTitle(text) {
  const title = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!title) return { error: 'empty' }
  if ([...title].length > TITLE_MAX) return { error: 'long' }
  return { title }
}

/** name:207 "…": a chat or a plan (C143 (d)). */
export function planTitle(row, text) {
  if (row.kind !== 'chat' && row.kind !== 'docket') return { says: { message: 'nameNoTitle', values: { num: row.num } }, changes: [] }
  const clean = cleanTitle(text)
  if (clean.error === 'empty') return { says: { message: 'nameEmpty' }, changes: [] }
  if (clean.error === 'long') return { says: { message: 'nameTitleLong', values: { max: TITLE_MAX } }, changes: [] }
  if (clean.title === (row.title ?? '')) return { says: { message: 'nameSameTitle', values: { num: row.num } }, changes: [] }
  return { says: { message: 'nameTitle', values: { num: row.num, name: clean.title } }, changes: [change(row, { title: clean.title })] }
}

/** A tag as typed, or why it cannot be one (C143 (e)). */
export function cleanTag(text) {
  const tag = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!tag) return { error: 'empty' }
  if ([...tag].length > TAG_MAX) return { error: 'long' }
  return { tag }
}

const carries = (row, tag) => (row.tags ?? []).some((t) => sameTag(t, tag))

/** tagadd:essay 207, 216. The tag becomes the person's on each (C136). */
export function planTagAdd(tag, targets) {
  const moving = targets.filter((r) => !carries(r, tag))
  if (!moving.length) return { says: { message: 'tagAlready', values: { tag } }, changes: [] }
  return {
    says: { message: 'tagAdd', values: { tag, nums: nums(moving) } },
    changes: moving.map((r) => change(r, { tags: [...(r.tags ?? []), tag], tagsMine: [...(r.tagsMine ?? []), tag] })),
  }
}

/** untag:essay 207, or untag:essay alone for everything that carries it. */
export function planUntag(tag, targets, all) {
  const pool = targets ?? all
  const moving = pool.filter((r) => carries(r, tag))
  if (!moving.length) return { says: { message: targets ? 'tagNone' : 'tagNowhere', values: { tag } }, changes: [] }
  const changes = moving.map((r) => change(r, {
    tags: (r.tags ?? []).filter((t) => !sameTag(t, tag)),
    tagsMine: (r.tagsMine ?? []).filter((t) => !sameTag(t, tag)),
  }))
  return targets
    ? { says: { message: 'untag', values: { tag, nums: nums(moving) } }, changes }
    : { says: { message: 'untagAll', values: { tag, count: moving.length } }, changes }
}

/** retag:essay to "Long form": everywhere, merging into a tag that exists; it becomes the person's. */
export function planRetag(from, to, all) {
  if (from === to) return { says: { message: 'retagSame' }, changes: [] }
  const moving = all.filter((r) => carries(r, from))
  if (!moving.length) return { says: { message: 'tagNowhere', values: { tag: from } }, changes: [] }
  const merging = !sameTag(from, to) && all.some((r) => carries(r, to))
  const changes = moving.map((r) => {
    const tags = []
    for (const t of r.tags ?? []) {
      const next = sameTag(t, from) ? to : t
      if (!tags.some((x) => sameTag(x, next))) tags.push(next)
    }
    const mine = (r.tagsMine ?? []).filter((t) => !sameTag(t, from) && !sameTag(t, to))
    return change(r, { tags, tagsMine: [...mine, to] })
  })
  const says = { message: 'retag', values: { from, to, count: moving.length } }
  if (merging) says.also = [{ message: 'retagMerge', values: { to } }]
  return { says, changes }
}

// ── A line of row commands ──────────────────────────────

/** The row verbs, and whether a step is one (name: only with a number). */
export const ROW_VERBS = Object.freeze(['pin', 'archive', 'name', 'tagadd', 'retag', 'untag'])
export const isRowStep = (step) => ROW_VERBS.includes(step.verb)
  && (step.verb !== 'name' || ['address', 'number'].includes(step.match?.values?.[0]?.kind))

// Applies a change to a row's copy, so the next command on the line sees it.
const applied = (row, set) => ({ ...row, ...set })

/**
 * One command of a line, planned on the rows as the line has left them.
 * @returns {{ says: object, changes: object[] }|{ bad: object }}
 */
function planStep(step, rows) {
  const args = step.match?.values ?? []
  switch (step.verb) {
    case 'pin':
    case 'archive': {
      // pin:"Rail candidates" pins a collection, which comes with the Collection (piece 6).
      if (step.verb === 'pin' && (args[0]?.kind === 'text' || args[0]?.kind === 'word')) return { bad: { message: 'later', values: { verb: 'pin:' } } }
      const off = step.verb === 'archive' && args[0]?.kind === 'word' && args[0].value === 'off'
      const t = targetsOf(off ? args.slice(1) : args, rows)
      if (t.bad) return t
      return step.verb === 'pin' ? planPin(t.rows) : planArchive(t.rows, off)
    }
    case 'name': {
      const t = targetsOf([args[0]], rows)
      if (t.bad) return t
      return planTitle(t.rows[0], typed(args[1]))
    }
    case 'tagadd':
    case 'untag': {
      const clean = cleanTag(typed(args[0]))
      if (clean.error === 'long') return { bad: { message: 'tagLong', values: { max: TAG_MAX } } }
      if (clean.error) {
        // The words are missing, as when the Tag act wrote tagadd:"" 207 (C145 (f)).
        const nums = args.length > 1 ? flat(args.slice(1)).map((a) => a.num ?? a.value).filter((n) => n != null).join(', ') : '207, 216'
        return { bad: { message: 'tagWords', values: { example: `${step.verb}:essay ${nums}` } } }
      }
      if (args.length < 2) {
        if (step.verb === 'tagadd') return { bad: { message: 'tagWhich', values: { example: `tagadd:${args[0].text} 207, 216` } } }
        return planUntag(clean.tag, null, rows)
      }
      const t = targetsOf(args.slice(1), rows)
      if (t.bad) return t
      return step.verb === 'tagadd' ? planTagAdd(clean.tag, t.rows) : planUntag(clean.tag, t.rows, rows)
    }
    case 'retag': {
      const from = cleanTag(typed(args[0]))
      const to = cleanTag(typed(args[2]))
      if (from.error === 'long' || to.error === 'long') return { bad: { message: 'tagLong', values: { max: TAG_MAX } } }
      if (from.error || to.error) return { bad: { message: 'takesExample', values: { verb: 'retag:', example: 'retag:essay to "Long form"' } } }
      return planRetag(from.tag, to.tag, rows)
    }
    default:
      return { bad: { message: 'later', values: { verb: `${step.verb}:` } } }
  }
}

/**
 * A line of row commands (C143 (g)), each planned on the rows as the one
 * before left them. Changes to one record are merged, keeping what the first
 * expected, so undo takes the line back whole.
 * @param {object[]} steps the registry's steps
 * @param {object[]} rows every row of Records
 * @returns {{ says: object, changes: object[], each: object[] }|{ bad: object }}
 */
export function planRowLine(steps, rows) {
  let now = rows
  const merged = new Map()
  const each = []
  for (const step of steps) {
    const p = planStep(step, now)
    if (p.bad) return p
    if (!p.changes.length) return { bad: p.says }
    each.push(p.says)
    const byKey = new Map(p.changes.map((c) => [`${c.store}:${c.id}`, c]))
    now = now.map((r) => (byKey.has(`${r.store}:${r.id}`) ? applied(r, byKey.get(`${r.store}:${r.id}`).set) : r))
    for (const [key, c] of byKey) {
      const was = merged.get(key)
      merged.set(key, was ? { ...was, set: { ...was.set, ...c.set }, expect: { ...c.expect, ...was.expect } } : c)
    }
  }
  return { says: each[0], each, changes: [...merged.values()] }
}

// ── erase: (C137) ──────────────────────────────────────

const MARKS = new Set(['note', 'term', 'quote'])
const short = (text, max = 40) => {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  return [...t].length > max ? `${[...t].slice(0, max - 1).join('')}…` : t
}

/**
 * erase:207, 216, or erase:207 all (C137). Numbers only. A plan's number
 * takes every chat in it, a branch its chat (C137 (b)). A chat's notes,
 * keywords and quotes stay, detached and marked, unless `all` takes them
 * too (C137 (c)). The Enter line names everything that goes, says what
 * stays, and that undo cannot bring it back.
 * @returns {{ says: object, erase: { chats: object[], marks: object[], keepMarks: boolean, nums: number[] } }|{ bad: object }}
 */
export function planErase(args, rows) {
  const all = args.length > 1 && args[args.length - 1].kind === 'word' && args[args.length - 1].value === 'all'
  const named = flat(all ? args.slice(0, -1) : args)
  const chats = []
  const marks = []
  const plans = []
  const add = (list, row) => { if (!list.includes(row)) list.push(row) }
  for (const a of named) {
    if (a.kind !== 'address' && a.kind !== 'number') return { bad: { message: 'byNumber' } }
    const num = a.kind === 'number' ? a.value : a.num
    const plan = !a.letter && rows.find((r) => r.kind === 'docket' && r.num === num)
    if (plan) {
      add(plans, plan)
      for (const r of rows.filter((x) => x.kind === 'chat' && x.docketNum === num)) add(chats, r)
      continue
    }
    const t = targetsOf([a], rows)
    if (t.bad) return t
    const row = t.rows[0]
    if (row.kind === 'chat') add(chats, row)
    else if (MARKS.has(row.kind)) add(marks, row)
  }
  const chatIds = new Set(chats.map((c) => c.chatId))
  // The notes, keywords and quotes inside what goes, other than those named.
  const inside = rows.filter((r) => MARKS.has(r.kind) && chatIds.has(r.chatId) && !marks.includes(r))
  // A plan goes with its last chat: say so for every plan left with none.
  const planNums = [...new Set(chats.map((c) => c.docketNum).filter((n) => n != null))]
    .filter((n) => rows.filter((r) => r.kind === 'chat' && r.docketNum === n).every((r) => chatIds.has(r.chatId)))
  const going = [...chats, ...marks]
  const also = []
  if (inside.length) also.push({ message: all ? 'eraseMarksGo' : 'eraseMarksStay', values: { count: inside.length } })
  if (planNums.length) also.push({ message: 'erasePlanGoes', values: { count: planNums.length, nums: planNums } })
  also.push({ message: 'eraseUndo', values: { count: going.length } })
  return {
    says: { message: 'eraseItems', values: { erasing: going.map((r) => ({ num: r.num, title: short(r.kind === 'chat' ? r.title : r.text) })) }, also },
    erase: {
      chats: chats.map((c) => ({ id: c.chatId, num: c.num })),
      marks: marks.map((m) => ({ store: m.store, id: m.id, num: m.num })),
      keepMarks: !all,
      nums: going.map((r) => r.num),
    },
  }
}

/** copy:207. One thing, whose markdown the shell builds (C143 (f)). */
export function planCopy(args, rows) {
  const t = targetsOf(args, rows)
  if (t.bad) return t
  return { says: { message: 'copyOne', values: { num: t.rows[0].num } }, row: t.rows[0] }
}
