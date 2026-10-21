import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { BOARDS, boardEntry, boardByTitle, strip } from './boards'
import {
  SHIPPED, shipped, shippedFor, restingMode, address, plan, ARRANGEMENT_VERBS, NEW_ROOM, roomArrangementId, roomChat,
  planOpen, planClose, planMove, planSwap, planPop, planPopBack, planPopSide, planPopBar, planBar, planReset,
} from './arrangement'
import { enterLine } from '../commands/registry'
import { BOARD_NAMES } from '../commands/verbs'
import { COPY } from '../copy'

const almanac = () => shipped('almanac')
const keep = (p) => { expect(p.next, p.says.message).not.toBeNull(); return p.next }

describe('the boards registry', () => {
  it('knows every board a command can name, and its name in the copy table', () => {
    for (const name of BOARD_NAMES) {
      expect(boardEntry(name), name).not.toBeNull()
      expect(COPY.boards[name], name).toBeDefined()
    }
    for (const key of Object.keys(BOARDS)) expect(COPY.boards[key], key).toBeDefined()
  })

  it('reads short titles in any case, with or without the colon', () => {
    expect(boardByTitle('sym')).toBe('room')
    expect(boardByTitle('Col:')).toBe('collection')
    expect(boardByTitle('xyz')).toBeNull()
  })

  it('gives rooms, dockets and the Almanac the right to run things', () => {
    const run = Object.keys(BOARDS).filter((k) => BOARDS[k].can.includes('execute')).sort()
    expect(run).toEqual(['almanac', 'docket', 'room'])
  })

  it('draws the strip in its fixed order, marking what is open and addressed', () => {
    const a = { ...almanac(), context: { collection: 'Q2 evidence' } }
    const s = strip(a)
    expect(s.map((x) => x.title)).toEqual(['Sym:', 'Col:', 'Ref:', 'Alm:', 'Lib:', 'Dkt:'])
    expect(s.find((x) => x.board === 'almanac')).toMatchObject({ here: true, addressed: true })
    expect(s.find((x) => x.board === 'collection')).toMatchObject({ here: true, addressed: false, context: 'Q2 evidence' })
    expect(s.find((x) => x.board === 'library').here).toBe(false)
  })
})

describe('shipped arrangements', () => {
  it('each starts from its suggested default', () => {
    expect(almanac()).toMatchObject({ columns: [['almanac'], ['collection']], addressed: 'almanac', bar: { at: 'top', side: 'center', popped: false }, popped: [] })
    expect(shipped('lab').columns).toEqual([['library'], ['canvas'], ['blocks']])
    expect(shipped('room:mode_1', { room: 'mode_1' })).toMatchObject({ id: 'room:mode_1', columns: [['room']], bar: { at: 'bottom' }, context: { room: 'mode_1' } })
    expect(shippedFor('room:mode_1')).toBe('room')
    expect(() => shipped('nowhere')).toThrow()
  })

  it('name a room for its chat, and know an empty room (stage 4)', () => {
    expect(roomArrangementId('c-1')).toBe('room:c-1')
    expect(roomChat('room:c-1')).toBe('c-1')
    expect(roomChat(NEW_ROOM)).toBeNull()
    expect(roomChat('room:')).toBeNull()
    expect(roomChat('almanac')).toBeUndefined()
    expect(roomChat(undefined)).toBeUndefined()
    expect(shipped(NEW_ROOM).columns).toEqual([['room']])
  })

  it('are fresh copies, so changing one leaves the default alone', () => {
    const a = almanac()
    a.columns[0].push('library')
    expect(SHIPPED.almanac.columns[0]).toEqual(['almanac'])
  })

  it('rest the field where the documents say (C44)', () => {
    expect(restingMode(almanac())).toBe('search')
    expect(restingMode(shipped('room:x'))).toBe('prompt')
    expect(restingMode(shipped('docket'))).toBe('prompt')
    expect(restingMode(shipped('lab'))).toBe('search') // the Lab rests in search, whatever is addressed
    expect(restingMode(address(almanac(), 'collection'))).toBe('search')
  })
})

describe('open:', () => {
  it('brings a board onto the screen at the right and points the bar at it', () => {
    const p = planOpen(almanac(), 'library')
    expect(p.says).toEqual({ message: 'openBoard', values: { board: 'library' } })
    expect(p.next).toMatchObject({ columns: [['almanac'], ['collection'], ['library']], addressed: 'library' })
  })

  it('points the bar at a board that is here already', () => {
    expect(planOpen(almanac(), 'collection')).toMatchObject({ says: { message: 'openHere' }, next: { addressed: 'collection' } })
    expect(planOpen(almanac(), 'almanac')).toMatchObject({ next: null, says: { message: 'openAddressed' } })
  })

  it('brings a popped board forward', () => {
    const a = keep(planPop(almanac(), 'collection'))
    const p = planOpen(address(a, 'almanac'), 'collection')
    expect(p).toMatchObject({ says: { message: 'openPopped' }, next: { addressed: 'collection' } })
  })

  it('changes nothing until it is kept', () => {
    const a = almanac()
    planOpen(a, 'library')
    expect(a.columns).toEqual([['almanac'], ['collection']])
  })
})

describe('close:', () => {
  it('takes the addressed board off the screen, and the bar goes to the one before', () => {
    const a = address(keep(planOpen(almanac(), 'library')), 'library')
    const p = planClose(a)
    expect(p.says).toEqual({ message: 'closeBoard', values: { board: 'library' } })
    expect(p.next).toMatchObject({ columns: [['almanac'], ['collection']], addressed: 'collection' })
  })

  it('keeps the last board open, and boards an arrangement cannot do without', () => {
    const one = keep(planClose(almanac(), 'collection'))
    expect(planClose(one)).toMatchObject({ next: null, says: { message: 'closeLast' } })
    expect(planClose(shipped('welcome'))).toMatchObject({ next: null, says: { message: 'closeFixed' } })
    expect(planClose(almanac(), 'library')).toMatchObject({ next: null, says: { message: 'closeNotHere' } })
  })

  it('closes a popped board and its window', () => {
    const a = keep(planPop(almanac(), 'collection'))
    expect(keep(planClose(a, 'collection'))).toMatchObject({ columns: [['almanac']], popped: [] })
  })
})

describe('move: and swap:', () => {
  const three = () => keep(planOpen(almanac(), 'library')) // almanac | collection | library

  it('move: takes a board to the left or right end, and the others shift along', () => {
    expect(keep(planMove(three(), 'library', 'left')).columns).toEqual([['library'], ['almanac'], ['collection']])
    expect(keep(planMove(three(), 'almanac', 'right')).columns).toEqual([['collection'], ['library'], ['almanac']])
  })

  it('move: to the middle puts it between the others (C103)', () => {
    expect(keep(planMove(three(), 'library', 'middle')).columns).toEqual([['almanac'], ['library'], ['collection']])
  })

  it('move: refuses when the board is there already, or in a window', () => {
    expect(planMove(three(), 'almanac', 'left')).toMatchObject({ next: null, says: { message: 'moveThere', values: { place: 'left' } } })
    const popped = keep(planPop(three(), 'library'))
    expect(planMove(popped, 'library', 'left')).toMatchObject({ next: null, says: { message: 'moveIsPopped' } })
  })

  it('swap: exchanges two boards', () => {
    expect(keep(planSwap(almanac(), 'almanac', 'collection')).columns).toEqual([['collection'], ['almanac']])
    expect(planSwap(almanac(), 'almanac', 'almanac')).toMatchObject({ next: null, says: { message: 'swapSame' } })
    expect(planSwap(almanac(), 'almanac', 'library')).toMatchObject({ next: null, says: { message: 'closeNotHere' } })
  })
})

describe('pop: and pop:back', () => {
  it('pop: gives a board its own window, on a screen if named', () => {
    const p = planPop(almanac(), 'collection')
    expect(p.says.message).toBe('popBoard')
    expect(p.next).toMatchObject({ columns: [['almanac']], popped: [{ board: 'collection', display: null, side: null, from: 1 }], addressed: 'collection' })
    expect(planPop(almanac(), 'library', 2)).toMatchObject({ says: { message: 'popDisplay', values: { display: 2 } }, next: { popped: [{ board: 'library', display: 2 }] } })
  })

  it('pop: keeps the last board on the page, and does not pop twice', () => {
    const one = keep(planClose(almanac(), 'collection'))
    expect(planPop(one, 'almanac')).toMatchObject({ next: null, says: { message: 'popLast' } })
    const a = keep(planPop(almanac(), 'collection'))
    expect(planPop(a, 'collection')).toMatchObject({ next: null, says: { message: 'popAlready' } })
  })

  it('pop:back brings every window back to where it stood, or one by name (C104)', () => {
    let a = keep(planOpen(almanac(), 'library'))
    a = keep(planPop(a, 'almanac'))
    a = keep(planPop(a, 'library'))
    expect(a.columns).toEqual([['collection']])
    const all = planPopBack(a)
    expect(all.says).toEqual({ message: 'popBackAll', values: { count: 2 } })
    expect(all.next.columns).toEqual([['almanac'], ['collection'], ['library']])
    const one = planPopBack(a, 'library')
    expect(one.says.message).toBe('popBackOne')
    expect(one.next).toMatchObject({ columns: [['collection'], ['library']], popped: [{ board: 'almanac' }] })
    expect(planPopBack(almanac())).toMatchObject({ next: null, says: { message: 'popNothing' } })
  })

  it('pop:left and pop:right place the window of the addressed board (C105)', () => {
    const a = keep(planPop(almanac(), 'collection'))
    expect(keep(planPopSide(a, 'left')).popped[0].side).toBe('left')
    expect(planPopSide(almanac(), 'left')).toMatchObject({ next: null, says: { message: 'popNotPopped' } })
  })

  it('pop:command puts the bar in its own window, and pop:back command brings it back', () => {
    const a = keep(planPopBar(almanac(), true))
    expect(a.bar).toEqual({ at: 'top', side: 'center', popped: true })
    expect(planPopBar(a, true)).toMatchObject({ next: null, says: { message: 'barPoppedAlready' } })
    expect(keep(planPopBar(a, false)).bar.popped).toBe(false)
  })
})

describe('bar: and reset:', () => {
  it('bar: moves the bar on the page, and brings it back from a window', () => {
    expect(keep(planBar(almanac(), 'bottom')).bar).toEqual({ at: 'bottom', side: 'center', popped: false })
    // Left and right are the other axis: where the field sits and folds (C106).
    expect(keep(planBar(keep(planBar(almanac(), 'bottom')), 'left')).bar).toEqual({ at: 'bottom', side: 'left', popped: false })
    expect(planBar(almanac(), 'center')).toMatchObject({ next: null, says: { message: 'barThere', values: { place: 'center' } } })
    expect(planBar(almanac(), 'top')).toMatchObject({ next: null, says: { message: 'barThere', values: { place: 'top' } } })
    expect(keep(planBar(keep(planPopBar(almanac(), true)), 'top')).bar.popped).toBe(false)
  })

  it('reset: puts the arrangement back as shipped, closing its windows, and keeps what boards show', () => {
    let a = { ...almanac(), context: { collection: 'Q2 evidence' } }
    a = keep(planOpen(a, 'library'))
    a = keep(planPop(a, 'library'))
    a = keep(planBar(a, 'bottom'))
    const p = planReset(a)
    expect(p.says).toEqual({ message: 'resetArrangement', values: { count: 1 } })
    expect(p.next).toMatchObject({ columns: [['almanac'], ['collection']], popped: [], bar: { at: 'top' }, context: { collection: 'Q2 evidence' } })
    expect(planReset(almanac())).toMatchObject({ next: null, says: { message: 'resetAlready' } })
  })
})

describe('from a typed command', () => {
  const built = new Set(ARRANGEMENT_VERBS)
  const run = (a, line) => {
    const answer = enterLine(line, { mode: 'command', built, board: a.addressed })
    expect(answer.state, `${line}: ${answer.message}`).toBe('ready')
    return answer.steps.map((step) => plan(a, step))
  }

  it('plans what Enter would do, for each verb', () => {
    const a = almanac()
    expect(run(a, '>open:library')[0].says.message).toBe('openBoard')
    expect(run(a, '>close:collection')[0].says.message).toBe('closeBoard')
    expect(run(a, '>move:collection left')[0].says.message).toBe('moveBoard')
    expect(run(a, '>swap:almanac collection')[0].says.message).toBe('swapBoards')
    expect(run(a, '>pop:collection')[0].says.message).toBe('popBoard')
    expect(run(a, '>pop:library display 2')[0].says).toMatchObject({ message: 'popDisplay', values: { display: 2 } })
    expect(run(a, '>pop:command')[0].says.message).toBe('popCommand')
    expect(run(a, '>pop:back')[0].says.message).toBe('popNothing')
    expect(run(a, '>bar:bottom')[0].says.message).toBe('barMove')
    expect(run(a, '>reset:')[0].says.message).toBe('resetAlready')
  })

  it('leaves forms that need later stages unanswered', () => {
    const a = almanac()
    expect(run(a, '>open:207')[0]).toBeNull()
    expect(run(a, '>pop:settings keys')[0]).toBeNull()
    expect(run(a, '>open:lab')[0]).toBeNull()
  })

  it('plans a line of several commands in turn, each on the arrangement the last one made', () => {
    let a = almanac()
    const answer = enterLine('>open:library move:library left bar:bottom', { mode: 'command', built })
    for (const step of answer.steps) a = keep(plan(a, step))
    expect(a).toMatchObject({ columns: [['library'], ['almanac'], ['collection']], bar: { at: 'bottom' } })
  })
})

describe('the copy table', () => {
  it('has a sentence for everything the arrangement says', () => {
    const source = readFileSync(new URL('./arrangement.js', import.meta.url), 'utf8')
    const messages = [...source.matchAll(/(?:refuse|go)\([^'`]*'([a-zA-Z]+)'/g)].map((m) => m[1])
    expect(messages.length).toBeGreaterThan(20)
    for (const m of new Set(messages)) expect(COPY.enter[m], m).toBeDefined()
  })
})
