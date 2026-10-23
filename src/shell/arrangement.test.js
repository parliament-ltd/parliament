import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { BOARDS, boardEntry, boardByTitle, boardFor, wordFor, strip } from './boards'
import {
  SHIPPED, shipped, shippedFor, restingMode, address, plan, ARRANGEMENT_VERBS,
  SPACE, arrangementBoards, roomOnScreen, planBring, planRoom,
  usualShare, columnShares, withShares, withUsualShares, planWidth, planWidthEven, WIDTH_RANGE,
  planFocus, planFocusOff, planCols, recordsColumns, RECORDS_COLUMNS,
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
      expect(boardEntry(boardFor(name)), name).not.toBeNull()
      expect(COPY.boards[boardFor(name)], name).toBeDefined()
    }
    // People read Records and Plan; the boards keep their ids (C131).
    expect(boardFor('records')).toBe('almanac')
    expect(boardFor('plan')).toBe('docket')
    expect(wordFor('almanac')).toBe('records')
    expect(wordFor('library')).toBe('library')
    for (const key of Object.keys(BOARDS)) expect(COPY.boards[key], key).toBeDefined()
  })

  it('reads short titles in any case, with or without the colon', () => {
    expect(boardByTitle('sym')).toBe('room')
    expect(boardByTitle('Records:')).toBe('almanac')
    expect(boardByTitle('plan')).toBe('docket')
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
    expect(s.map((x) => x.title)).toEqual(['Room:', 'Collection:', 'Reflection:', 'Records:', 'Library:', 'Plan:'])
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

describe('open: on the welcome page (stage 5)', () => {
  it('stacks boards in one column on the right of the card (W §5)', () => {
    const a = keep(planOpen(shipped('welcome'), 'almanac'))
    expect(a.columns).toEqual([['welcome'], ['almanac']])
    const b = keep(planOpen(a, 'library'))
    expect(b.columns).toEqual([['welcome'], ['almanac', 'library']])
    expect(b.addressed).toBe('library')
    const withChat = { ...shipped('welcome'), columns: [['welcome'], ['room']] }
    expect(keep(planOpen(withChat, 'almanac')).columns).toEqual([['welcome'], ['room'], ['almanac']])
  })
})

describe('one space (C125)', () => {
  it('starts from the Almanac, and says which boards each arrangement brings', () => {
    expect(shipped(SPACE).columns).toEqual([['almanac'], ['collection']])
    expect(arrangementBoards('almanac')).toEqual(['almanac', 'collection'])
    expect(arrangementBoards('welcome')).toEqual(['welcome'])
    expect(arrangementBoards('nowhere')).toEqual([])
  })

  it('brings an arrangement\'s missing boards beside what is here: alm: brings the Almanac and the Collection', () => {
    const w = { ...shipped('welcome'), id: SPACE }
    const p = planBring(w, 'almanac')
    expect(p.says).toEqual({ message: 'bringBoards', values: { boards: ['almanac', 'collection'] } })
    expect(p.next.columns).toEqual([['welcome'], ['almanac', 'collection']])
    expect(p.next.addressed).toBe('almanac')
    // With one of them here, only the other comes.
    const half = keep(planOpen(w, 'collection'))
    expect(keep(planBring(half, 'almanac')).columns).toEqual([['welcome'], ['collection', 'almanac']])
    // With all here, the bar points at the first; then there is nothing to do.
    const all = { ...p.next, addressed: 'collection' }
    expect(keep(planBring(all, 'almanac')).addressed).toBe('almanac')
    expect(planBring(p.next, 'almanac')).toMatchObject({ next: null, says: { message: 'bringHere' } })
  })

  it('brings the welcome card back on the left (tour:)', () => {
    expect(keep(planBring(shipped(SPACE), 'welcome')).columns).toEqual([['welcome'], ['almanac'], ['collection']])
  })

  it('brings the last room beside what is here (sym:), beside the welcome card when it is there', () => {
    const a = keep(planRoom(shipped(SPACE), 'c1'))
    expect(a.columns).toEqual([['almanac'], ['collection'], ['room']])
    expect(roomOnScreen(a)).toBe('c1')
    expect(planRoom(a, 'c1')).toMatchObject({ next: null, says: { message: 'roomHere' } })
    // Another chat: a room of its own beside (C175 (a), ruled 23 October).
    const b = keep(planRoom(a, 'c2'))
    expect(b.columns).toEqual([['almanac'], ['collection'], ['room'], ['room-2']])
    expect(roomOnScreen(b)).toBe('c2')
    const w = keep(planBring({ ...shipped('welcome'), id: SPACE }, 'almanac'))
    expect(keep(planRoom(w, 'c1')).columns).toEqual([['welcome'], ['room'], ['almanac', 'collection']])
  })

  it('knows an empty room, whose first prompt starts its chat, and no room at all', () => {
    const empty = keep(planRoom(shipped(SPACE), null))
    expect(roomOnScreen(empty)).toBeNull()
    expect(planRoom(empty, null)).toMatchObject({ next: null, says: { message: 'newRoomHere' } })
    expect(roomOnScreen(shipped(SPACE))).toBeUndefined()
  })

  it('closes a room or the welcome card by what it is, and a closed room is no room', () => {
    const a = keep(planRoom({ ...shipped('welcome'), id: SPACE }, 'c1'))
    const p = planClose(a, 'room')
    expect(p.says.message).toBe('closeRoom')
    expect(roomOnScreen(p.next)).toBeUndefined()
    expect(planClose(a, 'welcome').says.message).toBe('closeWelcome')
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
    // The welcome card can be closed in the space (C125), but not when it is the last board.
    expect(planClose(shipped('welcome'))).toMatchObject({ next: null, says: { message: 'closeLast' } })
    expect(keep(planClose({ ...shipped('welcome'), columns: [['welcome'], ['almanac']] }, 'welcome')).columns).toEqual([['almanac']])
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

describe('focus: (stage 5, piece 6; W §7)', () => {
  const space = () => keep(planRoom(keep(planBring({ ...shipped('welcome'), id: SPACE }, 'almanac')), 'c1'))

  it('clears the space to the chat alone, keeping what was there', () => {
    const a = space()
    const p = planFocus(a)
    expect(p.says).toEqual({ message: 'focusClosing', values: { boards: ['welcome', 'almanac', 'collection'] } })
    expect(p.next).toMatchObject({ columns: [['room']], popped: [], addressed: 'room', bar: { at: 'bottom', popped: false } })
    expect(p.next.context.room).toBe('c1')
    expect(p.next.focus.columns).toEqual(a.columns)
    expect(planFocus(p.next).says.message).toBe('focusAlready')
  })

  it('closes windows too, and brings them back with focus:off', () => {
    const a = keep(planPop(space(), 'almanac'))
    const f = keep(planFocus(a))
    expect(f.popped).toEqual([])
    const back = planFocusOff(f)
    expect(back.says).toEqual({ message: 'focusOff', values: { boards: ['welcome', 'collection', 'almanac'] } })
    expect(back.next.columns).toEqual(a.columns)
    expect(back.next.popped).toEqual(a.popped)
    expect(back.next.focus).toBeUndefined()
  })

  it('takes the last chat when the space has no room, and refuses with nothing to focus on', () => {
    const a = { ...shipped('welcome'), id: SPACE }
    expect(planFocus(a, 'c9').next.context.room).toBe('c9')
    expect(planFocus(a).says.message).toBe('focusNothing')
    expect(planFocusOff(a).says.message).toBe('focusOffNot')
  })

  it('reset: ends focus', () => {
    expect(keep(planReset(keep(planFocus(space())))).focus).toBeUndefined()
  })
})

describe('widths (C126)', () => {
  const share = (a, board) => {
    const shares = columnShares(a)
    const k = a.columns.findIndex((c) => c.includes(board))
    return Math.round((shares[k] / shares.reduce((x, y) => x + y, 0)) * 100)
  }

  it('gives each column its usual share: 1, or 2 for a main board', () => {
    expect(usualShare('room')).toBe(2)
    expect(usualShare('almanac')).toBe(2)
    expect(usualShare('collection')).toBe(1)
    expect(usualShare('welcome')).toBe(1)
    expect(columnShares(shipped(SPACE))).toEqual([2, 1])
    // A column of stacked boards takes the largest share among them.
    expect(columnShares({ ...shipped(SPACE), columns: [['welcome'], ['almanac', 'collection']] })).toEqual([1, 2])
  })

  it('keeps a stretch by board, so a board keeps its width when it moves and comes back', () => {
    const a = withShares(shipped(SPACE), { 0: 3.25, 1: 0.75 })
    expect(a.widths).toEqual({ almanac: 3.25, collection: 0.75 })
    expect(columnShares(a)).toEqual([3.25, 0.75])
    const moved = keep(planMove(a, 'almanac', 'right'))
    expect(columnShares(moved)).toEqual([0.75, 3.25])
    const back = keep(planOpen(keep(planClose(a, 'collection')), 'collection'))
    expect(columnShares(back)).toEqual([3.25, 0.75])
    expect(withUsualShares(a, [0]).widths).toEqual({ collection: 0.75 })
  })

  it('width:60% gives the board the bar points at that part of the width', () => {
    const p = planWidth(shipped(SPACE), 'almanac', 60)
    expect(p.says).toEqual({ message: 'widthIt', values: { board: 'almanac', percent: 60 } })
    expect(share(p.next, 'almanac')).toBe(60)
    expect(share(p.next, 'collection')).toBe(40)
    const named = planWidth(shipped(SPACE), 'collection', 25, true)
    expect(named.says.message).toBe('widthSet')
    expect(share(named.next, 'collection')).toBe(25)
    expect(named.next.addressed).toBe('collection')
  })

  it('refuses a width it cannot give', () => {
    const a = shipped(SPACE)
    expect(planWidth(a, 'almanac', 5).says).toEqual({ message: 'widthRange', values: WIDTH_RANGE })
    expect(planWidth(a, 'almanac', 95).says.message).toBe('widthRange')
    expect(planWidth(a, 'almanac', 67).says.message).toBe('widthThere')
    expect(planWidth(a, 'library', 30).says.message).toBe('closeNotHere')
    expect(planWidth(keep(planPop(a, 'collection')), 'collection', 30).says.message).toBe('widthPopped')
    expect(planWidth(keep(planClose(a, 'collection')), 'almanac', 30).says.message).toBe('widthAlone')
  })

  it('counts a column held at its least width as it is drawn', () => {
    // Columns share the width by share; one below its least width is held there.
    const draw = (shares, least, total) => {
      const held = new Set()
      for (;;) {
        const left = total - [...held].reduce((sum, i) => sum + least[i], 0)
        const free = shares.reduce((sum, s, i) => (held.has(i) ? sum : sum + s), 0)
        const px = shares.map((s, i) => (held.has(i) ? least[i] : (s / free) * left))
        const below = px.findIndex((w, i) => !held.has(i) && w < least[i])
        if (below < 0) return px
        held.add(below)
      }
    }
    const a = { ...shipped(SPACE), columns: [['welcome'], ['room'], ['almanac']], addressed: 'room', context: { room: 'c1' } }
    const layout = { columns: a.columns, widths: [260, 346, 346], least: [260, 300, 180] }
    const p = planWidth(a, 'room', 50, false, layout)
    expect(p.says.message).toBe('widthIt')
    expect(Math.round(draw(columnShares(p.next), layout.least, 952)[1])).toBe(476)
    expect(planWidth(a, 'room', 60, false, layout).says).toEqual({ message: 'widthMost', values: { percent: 53 } })
    expect(planWidth(a, 'room', 20, false, layout).says).toEqual({ message: 'widthLeast', values: { percent: 32 } })
    expect(planWidth(a, 'almanac', 36, false, layout).says.message).toBe('widthThere')
    expect(planWidth(a, 'room', 50, false, { ...layout, stacked: true }).says.message).toBe('widthStacked')
    // Measured for another space, the layout is left aside.
    expect(planWidth(a, 'room', 50, false, { ...layout, columns: [['almanac']] }).says.message).toBe('widthIt')
  })

  it('width:even and reset: put every width back', () => {
    const a = keep(planWidth(shipped(SPACE), 'almanac', 70))
    const even = planWidthEven(a)
    expect(even.says.message).toBe('widthEven')
    expect(even.next.widths).toEqual({})
    expect(planWidthEven(even.next).says.message).toBe('widthEvenAlready')
    expect(keep(planReset(a)).widths).toEqual({})
  })

  it('reads width: from the bar', () => {
    const run = (a, line) => {
      const answer = enterLine(line, { mode: 'command', built: new Set(ARRANGEMENT_VERBS), board: a.addressed })
      expect(answer.state, `${line}: ${answer.message}`).toBe('ready')
      return answer.steps.map((step) => plan(a, step))
    }
    const a = shipped(SPACE)
    expect(run(a, '>width:60%')[0].says.message).toBe('widthIt')
    expect(run(a, '>width:collection 30%')[0].says.message).toBe('widthSet')
    expect(run(keep(planWidth(a, 'almanac', 70)), '>width:even')[0].says.message).toBe('widthEven')
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
    expect(run(a, '>swap:records collection')[0].says.message).toBe('swapBoards')
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

describe('cols: (stage 6, piece 2; C141)', () => {
  const space = () => shipped(SPACE)
  it('hides and shows columns, in their order, and says which', () => {
    let a = space()
    const p = planCols(a, ['-room', '-tags'])
    expect(p.says).toEqual({ message: 'colsHide', values: { cols: ['room', 'tags'] } })
    a = keep(p)
    expect(recordsColumns(a)).toEqual(['type', 'id', 'title', 'created', 'active'])
    const q = planCols(a, ['+tags', '-created'])
    expect(q.says).toEqual({ message: 'colsHide', values: { cols: ['created'] }, also: [{ message: 'colsShow', values: { cols: ['tags'] } }] })
    expect(recordsColumns(keep(q))).toEqual(['type', 'id', 'title', 'tags', 'active'])
  })

  it('keeps nothing once every column shows again', () => {
    const a = keep(planCols(space(), ['-room']))
    expect(keep(planCols(a, ['room'])).recordsCols).toBeUndefined()
  })

  it('takes v30 words, keeps the title and number, and says which show', () => {
    expect(recordsColumns(keep(planCols(space(), ['-date', '-last'])))).toEqual(['type', 'id', 'title', 'room', 'tags'])
    expect(planCols(space(), ['-id']).says).toEqual({ message: 'colsStays', values: { col: 'id' } })
    expect(planCols(space(), ['-title']).next).toBeNull()
    expect(planCols(space(), ['-colour']).says).toEqual({ message: 'colsUnknown', values: { word: 'colour', words: RECORDS_COLUMNS } })
    expect(planCols(space(), ['+room']).says.message).toBe('colsSame')
    expect(planCols(space(), []).says).toEqual({ message: 'colsNow', values: { board: 'almanac', cols: RECORDS_COLUMNS } })
  })

  it('is read from a typed line', () => {
    const answer = enterLine('>cols:-room +created', { mode: 'command', built: new Set(ARRANGEMENT_VERBS), board: 'almanac' })
    expect(plan(space(), answer.steps[0]).says).toEqual({ message: 'colsHide', values: { cols: ['room'] } })
  })

  it('is put back by reset:, which counts it as a change', () => {
    const a = keep(planCols(space(), ['-room']))
    const p = planReset(a)
    expect(p.says.message).toBe('resetArrangement')
    expect(p.next.recordsCols).toBeUndefined()
  })
})
