import { describe, it, expect } from 'vitest'
import { readDay, readCost, readFilter, readSort, nextView, clears, applyView, costUnknown, viewLine, searchTerms, isAtRest, EMPTY_VIEW } from './recordsFilter'
import { parse, enterLine } from '../commands/registry'

// Search and filters on Records (stage 6, piece 1; C132, C133).

// 21 October 2026, at noon, in this machine's time.
const NOW = new Date(2026, 9, 21, 12).getTime()

// A command as the registry matches it, ready for readFilter.
function step(line) {
  const answer = enterLine(`>${line}`, { board: 'almanac', built: new Set(['type', 'tag', 'model', 'from', 'in', 'has', 'cost', 'since', 'until', 'sort', 'clear']) })
  if (answer.state !== 'ready') throw new Error(`${line}: ${answer.message}`)
  return answer.steps[0]
}
const steps = (line) => enterLine(`>${line}`, { board: 'almanac', built: new Set(['type', 'tag', 'model', 'from', 'in', 'has', 'cost', 'since', 'until', 'sort', 'clear']) }).steps

const iso = (y, m, d) => new Date(y, m - 1, d, 9).toISOString()
const row = (num, kind, extra = {}) => ({
  num, kind, id: `${kind}${num}`, title: `${kind} ${num}`, text: null, summary: null, tags: [], pinned: false,
  roomId: null, room: null, createdAt: iso(2026, 10, 1), activeAt: iso(2026, 10, 1),
  chatNum: kind === 'chat' ? num : null, docketNum: null, branch: null, run: null,
  marks: [], models: [], sources: [], cost: null, collections: [], words: '', ...extra,
})

const rows = [
  row(202, 'chat', { title: 'Shortcut test', roomId: 'mode_owl', docketNum: 201, branch: 'a', run: 1, tags: ['owls', 'Research'], models: ['claude-sonnet'], cost: 0.42, marks: ['term'], createdAt: iso(2026, 10, 20), activeAt: iso(2026, 10, 21), words: 'which keys move the bar' }),
  row(204, 'chat', { title: 'barn owl', roomId: 'mode_writing', docketNum: 203, branch: 'a', run: 1, sources: ['wikipedia'], cost: 0, createdAt: iso(2026, 9, 2), activeAt: iso(2026, 10, 2), collections: ['fav'], words: 'the barn owl hunts by sound' }),
  row(206, 'chat', { title: 'Essay plan', docketNum: 203, branch: 'b', run: 1, tags: ['essay'], models: ['claude-opus-4-7'], cost: null, pinned: true, createdAt: iso(2026, 10, 15), activeAt: iso(2026, 10, 15) }),
  row(203, 'docket', { title: 'barn owl', docketNum: 203, cost: null, chatNums: [204, 206], createdAt: iso(2026, 9, 2), activeAt: iso(2026, 10, 15) }),
  row(210, 'note', { text: 'Check the range map', title: 'Check the range map', chatNum: 204, docketNum: 203, branch: 'a', run: 1, roomId: 'mode_writing' }),
  row(211, 'term', { text: 'Tyto alba', title: 'Tyto alba', chatNum: 202, docketNum: 201, branch: 'a', run: 1, roomId: 'mode_owl' }),
  row(212, 'quote', { text: 'Barn owls hunt by sound', title: 'Barn owls hunt by sound', chatNum: 204, docketNum: 203, branch: 'a', run: 1 }),
]
const rooms = [{ id: 'mode_owl', label: 'Owl questions' }, { id: 'mode_writing', label: 'Writing studio' }, { id: 'mode_lab', label: 'Code Lab' }]
const collections = [{ id: 'fav', label: 'Favorites' }, { id: 'lab', label: 'Code Lab' }]
const models = [{ id: 'claude-sonnet', apiId: 'claude-sonnet-4-6', name: 'Claude Sonnet' }, { id: 'claude-opus-4-7', apiId: 'claude-opus-4-7', name: 'Claude Opus 4.7' }]
const sources = [{ id: 'wikipedia', name: 'Wikipedia' }]
const ctx = { roomLabel: (r) => rooms.find((x) => x.id === r.roomId)?.label ?? '', models, sources }
const read = { rows, rooms, collections, now: NOW, locale: 'en-US' }

const view = (line, from = EMPTY_VIEW) => nextView(from, steps(line).map((s) => {
  if (s.verb === 'sort') return { sort: readSort(s.match.values[0].value, from.sort) }
  if (s.verb === 'clear') return { clear: s.match.values[0].value }
  const r = readFilter(s, read)
  if (r.bad) throw new Error(r.bad.message)
  return { filter: r.filter }
}))
const nums = (v) => applyView(rows, v, ctx).map((r) => r.num)

describe('the table at rest (A19, C133)', () => {
  it('shows chats, plans and notes, pinned first, then the most recently active', () => {
    expect(nums(EMPTY_VIEW)).toEqual([206, 202, 203, 204, 210])
  })

  it('shows keywords and quotes when filtered for', () => {
    expect(nums(view('type:keyword'))).toEqual([211])
    expect(nums(view('type:keyword,quote'))).toEqual([212, 211])
  })

  it('shows keywords and quotes a search finds', () => {
    expect(nums({ ...EMPTY_VIEW, search: 'tyto' })).toEqual([211])
  })

  it('does not bring them with has: or from:', () => {
    expect(nums(view('from:202'))).toEqual([])
  })
})

describe('search (C132 (a))', () => {
  it('needs every word, in any order, and keeps a quoted phrase together', () => {
    expect(searchTerms('owl "by sound"  Barn')).toEqual(['owl', 'by sound', 'barn'])
    expect(nums({ ...EMPTY_VIEW, search: 'sound barn' })).toEqual([204, 212])
    expect(nums({ ...EMPTY_VIEW, search: '"barn owls"' })).toEqual([212])
  })

  it('reads titles, tags, rooms and the words inside a chat', () => {
    expect(nums({ ...EMPTY_VIEW, search: 'research' })).toEqual([202])
    expect(nums({ ...EMPTY_VIEW, search: 'owl questions' })).toEqual([202, 211])
    expect(nums({ ...EMPTY_VIEW, search: 'keys move' })).toEqual([202])
  })
})

describe('the filters', () => {
  it('type: by the words people use (C131)', () => {
    expect(nums(view('type:plan'))).toEqual([203])
    expect(nums(view('type:chat,note'))).toEqual([206, 202, 204, 210])
    expect(nums(view('-type:chat'))).toEqual([203, 210])
  })

  it('tag: matches a tag or the start of one, in any case; a minus leaves it out', () => {
    expect(nums(view('tag:research'))).toEqual([202])
    expect(nums(view('tag:ess'))).toEqual([206])
    expect(nums(view('tag:essay,owls'))).toEqual([206, 202])
    expect(nums(view('type:chat -tag:owls'))).toEqual([206, 204])
  })

  it('model: by any part of a model or a source name (C132 (g))', () => {
    expect(nums(view('model:sonnet'))).toEqual([202])
    expect(nums(view('model:"opus 4.7"'))).toEqual([206])
    expect(nums(view('model:wikipedia'))).toEqual([204])
  })

  it('from: a chat, a plan, a branch or a run (C132 (i))', () => {
    expect(nums(view('from:204'))).toEqual([210])
    expect(nums(view('from:203'))).toEqual([206, 204, 210])
    expect(nums(view('from:203b'))).toEqual([206])
    expect(nums(view('from:run 1'))).toEqual([206, 202, 204, 210])
    expect(readFilter(step('from:299'), read).bad).toEqual({ message: 'numNone', values: { num: 299 } })
    expect(readFilter(step('from:210'), read).bad).toEqual({ message: 'fromWhat', values: { num: 210 } })
    expect(readFilter(step('from:203z'), read).bad.message).toBe('numNone')
  })

  it('in: a room or a collection by name (C132 (f))', () => {
    expect(nums(view('in:"owl questions"'))).toEqual([202])
    expect(nums(view('in:writing'))).toEqual([204, 210])
    expect(nums(view('in:favorites'))).toEqual([204])
    expect(readFilter(step('in:"Code Lab"'), read).bad).toEqual({ message: 'inWhich', values: { name: 'Code Lab' } })
    expect(nums(view('in:"Code Lab" collection'))).toEqual([])
    expect(readFilter(step('in:"Code Lab" room'), read).filter.text).toBe('in:"Code Lab" room')
    expect(readFilter(step('in:attic'), read).bad).toEqual({ message: 'inNone', values: { name: 'attic' } })
    expect(readFilter(step('in:attic room'), read).bad).toEqual({ message: 'inNoRoom', values: { name: 'attic' } })
  })

  it('has: what holds a note, keyword or quote', () => {
    expect(nums(view('has:keyword'))).toEqual([202])
    expect(nums(view('-has:keyword type:chat'))).toEqual([206, 204])
  })

  it('cost: on chats and plans with a known cost, never guessed (C132 (h))', () => {
    expect(readCost('>0.50')).toEqual({ op: '>', n: 0.5 })
    expect(readCost('$2')).toEqual({ op: '=', n: 2 })
    expect(readCost('<= 1')).toEqual({ op: '<=', n: 1 })
    expect(readCost('cheap')).toBeNull()
    expect(nums(view('cost:>0.10'))).toEqual([202])
    expect(nums(view('cost:<1'))).toEqual([202, 204])
    expect(nums(view('cost:0'))).toEqual([204])
    expect(costUnknown(rows, view('cost:<1'), ctx)).toBe(2)
    expect(readFilter(step('cost:lots'), read).bad).toEqual({ message: 'costBad' })
  })

  it('since: and until: by the day made', () => {
    expect(nums(view('since:7d'))).toEqual([206, 202])
    expect(nums(view('until:september'))).toEqual([203, 204])
    expect(nums(view('since:2026-10-15 until:2026-10-15'))).toEqual([206])
    expect(readFilter(step('since:soon'), read).bad).toEqual({ message: 'dateBad', values: { verb: 'since:' } })
  })

  it('sort: by when made or last active, either way; pinned rows still lead', () => {
    expect(nums(view('sort:oldest'))).toEqual([206, 210, 204, 203, 202])
    expect(nums(view('sort:created'))).toEqual([206, 202, 210, 204, 203])
  })
})

describe('days (C132 (e))', () => {
  const day = (v, opts = {}) => readDay(v, { now: NOW, locale: 'en-US', ...opts })?.day ?? null
  it('reads spans back from today, and today and yesterday', () => {
    expect(day('7d')).toBe('2026-10-14')
    expect(day('3w')).toBe('2026-09-30')
    expect(day('2m')).toBe('2026-08-21')
    expect(day('1y')).toBe('2025-10-21')
    expect(day('today')).toBe('2026-10-21')
    expect(day('yesterday')).toBe('2026-10-20')
  })

  it('takes a month as the last one that has begun, and until: takes its end', () => {
    expect(day('september')).toBe('2026-09-01')
    expect(day('sep', { end: true })).toBe('2026-09-30')
    expect(day('november')).toBe('2025-11-01')
    expect(day('ma')).toBeNull() // too short to know march from may
  })

  it('reads slashes in the order the reader\'s language writes dates', () => {
    expect(day('09/10/26')).toBe('2026-09-10')
    expect(day('09/10/26', { locale: 'en-GB' })).toBe('2026-10-09')
    expect(day('9.10.2026', { locale: 'fi' })).toBe('2026-10-09')
    expect(day('2026/09/10', { locale: 'sv' })).toBe('2026-09-10')
    expect(day('2026-02-30')).toBeNull()
  })

  it('takes since: from the start of the day and until: to its end', () => {
    const start = readDay('2026-10-15', { now: NOW }).at
    const end = readDay('2026-10-15', { now: NOW, end: true }).at
    expect(end - start).toBe(86_400_000 - 1)
  })
})

describe('changing the view', () => {
  it('replaces a filter of the same kind typed later, and keeps two typed on one line (v30)', () => {
    const a = view('tag:owls')
    expect(view('tag:essay', a).filters.map((f) => f.text)).toEqual(['tag:essay'])
    expect(view('tag:owls -tag:essay').filters.map((f) => f.text)).toEqual(['tag:owls', '-tag:essay'])
    expect(view('type:chat', a).filters.map((f) => f.text)).toEqual(['tag:owls', 'type:chat'])
  })

  it('clears one kind, the search, the order, or everything (C132 (c))', () => {
    const a = { ...view('type:chat tag:owls sort:oldest'), search: 'owl' }
    expect(clears(a, 'tag')).toEqual({ what: 'filter', filters: ['tag:owls'] })
    expect(clears(a, 'cost')).toBeNull()
    expect(nextView(a, [{ clear: 'tag' }]).filters.map((f) => f.k)).toEqual(['type'])
    expect(nextView(a, [{ clear: 'search' }]).search).toBe('')
    expect(nextView(a, [{ clear: 'sort' }]).sort).toEqual(EMPTY_VIEW.sort)
    expect(isAtRest(nextView(a, [{ clear: 'filters' }]))).toBe(true)
    expect(clears(EMPTY_VIEW, 'filters')).toBeNull()
  })

  it('writes the filters in force back as commands, in one order', () => {
    expect(viewLine(view('since:7d -tag:essay type:chat sort:oldest')).map((x) => x.text)).toEqual(['type:chat', '-tag:essay', 'since:7d', 'sort:oldest'])
    expect(viewLine(view('in:"Owl questions"'))[0].text).toBe('in:"Owl questions"')
  })
})

describe('reading a filter checks it before Enter', () => {
  it('keeps the words as typed, quoted where they need it', () => {
    expect(readFilter(step('tag:"long form",Essay'), read).filter).toMatchObject({ k: 'tag', v: ['long form', 'essay'], text: 'tag:"long form",Essay' })
  })

  it('leaves the registry to refuse a kind it does not know', () => {
    expect(enterLine('>type:term', { board: 'almanac', built: new Set(['type']) }).state).toBe('misfit')
    expect(enterLine('>has:docket', { board: 'almanac', built: new Set(['has']) }).state).toBe('misfit')
    expect(parse('in:"Code Lab" room').commands[0].args).toHaveLength(2)
  })
})

describe('the archive (C135, C143 (c))', () => {
  const archived = [...rows, row(214, 'chat', { title: 'Old owls', archived: true }), row(215, 'note', { title: 'Old note', text: 'Old note', archived: true })]
  const at = (v) => applyView(archived, v, ctx).map((r) => r.num)
  it('hides what is archived, and in:archive shows only that', () => {
    expect(at(EMPTY_VIEW)).not.toContain(214)
    expect(at({ ...EMPTY_VIEW, search: 'old' })).toEqual([])
    const v = nextView(EMPTY_VIEW, [{ filter: readFilter(step('in:archive'), read).filter }])
    expect(at(v)).toEqual([215, 214])
    expect(readFilter(step('in:archive room'), read).bad).toEqual({ message: 'inNoRoom', values: { name: 'archive' } })
  })
})
