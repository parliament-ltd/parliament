import { describe, it, expect } from 'vitest'
import { targetsOf, planPin, planArchive, planTitle, planTagAdd, planUntag, planRetag, planRowLine, planCopy, planErase, cleanTag, TITLE_MAX, TAG_MAX } from './rowVerbs'
import { enterLine } from '../commands/registry'
import { BUILT } from '../chrome/preview'

// The row verbs (stage 6, piece 3; C143).

const row = (num, kind, extra = {}) => ({
  num, kind, id: `${kind}${num}`, store: { chat: 'conversations', docket: 'dockets', note: 'notes', term: 'highlights', quote: 'pins' }[kind],
  title: `${kind} ${num}`, text: null, tags: [], tagsMine: [], pinned: false, archived: false, docketNum: null, branch: null, ...extra,
})
const rows = [
  row(202, 'chat', { docketNum: 201, branch: 'a', tags: ['owls'] }),
  row(204, 'chat', { docketNum: 203, branch: 'a', tags: ['Essay', 'owls'], tagsMine: ['Essay'], pinned: true }),
  row(206, 'chat', { docketNum: 203, branch: 'b' }),
  row(203, 'docket', { docketNum: 203, title: 'barn owl' }),
  row(210, 'note', { text: 'Check the range map', tags: ['owls'] }),
]
const steps = (line) => {
  const a = enterLine(`>${line}`, { mode: 'command', board: 'almanac', built: BUILT })
  if (a.state !== 'ready') throw new Error(`${line}: ${a.message}`)
  return a.steps
}
const plan = (line) => planRowLine(steps(line), rows)

describe('which rows a command names', () => {
  const args = (line) => steps(line)[0].match.values
  it('takes numbers, a branch for its chat, and a plan of one branch for its chat (C127)', () => {
    expect(targetsOf(args('pin:204, 210'), rows).rows.map((r) => r.num)).toEqual([204, 210])
    expect(targetsOf(args('pin:203b'), rows).rows.map((r) => r.num)).toEqual([206])
    expect(targetsOf(args('pin:201'), rows).rows.map((r) => r.num)).toEqual([202])
    expect(targetsOf(args('pin:299'), rows).bad).toEqual({ message: 'numNone', values: { num: '299' } })
  })
})

describe('pin: and archive:', () => {
  it('pins what it names, and unpins when every one is pinned (C143 (a))', () => {
    expect(planPin([rows[0], rows[1]])).toMatchObject({ says: { message: 'pinOn', values: { nums: [202] } }, changes: [{ store: 'conversations', id: 'chat202', set: { pinned: true }, expect: { pinned: false } }] })
    expect(planPin([rows[1]])).toMatchObject({ says: { message: 'pinOff', values: { nums: [204] } }, changes: [{ set: { pinned: false } }] })
  })

  it('archives row by row, and archive:off brings one back', () => {
    expect(plan('archive:203').changes).toEqual([{ store: 'dockets', id: 'docket203', num: 203, set: { archived: true }, expect: { archived: false } }])
    expect(planArchive([rows[0]], true).says).toEqual({ message: 'archiveNot' })
    expect(plan('archive:off 202')).toEqual({ bad: { message: 'archiveNot' } })
  })
})

describe('name: by number (C143 (d))', () => {
  it('names a chat or a plan, and nothing that is its own words', () => {
    expect(planTitle(rows[0], '  Barn   owls ')).toMatchObject({ says: { message: 'nameTitle', values: { num: 202, name: 'Barn owls' } }, changes: [{ set: { title: 'Barn owls' }, expect: { title: 'chat 202' } }] })
    expect(planTitle(rows[4], 'x').says).toEqual({ message: 'nameNoTitle', values: { num: 210 } })
    expect(planTitle(rows[0], 'chat 202').says.message).toBe('nameSameTitle')
    expect(planTitle(rows[0], 'x'.repeat(TITLE_MAX + 1)).says).toEqual({ message: 'nameTitleLong', values: { max: TITLE_MAX } })
    expect(plan('name:203 "Owl plan"').changes[0]).toMatchObject({ store: 'dockets', set: { title: 'Owl plan' } })
  })
})

describe('the tag verbs (C136, C143 (e))', () => {
  it('tagadd: adds the person\'s tag, matching in any case', () => {
    expect(planTagAdd('essay', [rows[0], rows[1]])).toMatchObject({
      says: { message: 'tagAdd', values: { tag: 'essay', nums: [202] } },
      changes: [{ id: 'chat202', set: { tags: ['owls', 'essay'], tagsMine: ['essay'] }, expect: { tags: ['owls'], tagsMine: [] } }],
    })
    expect(planTagAdd('ESSAY', [rows[1]]).says).toEqual({ message: 'tagAlready', values: { tag: 'ESSAY' } })
    expect(cleanTag('x'.repeat(TAG_MAX + 1))).toEqual({ error: 'long' })
    expect(plan('tagadd:essay')).toEqual({ bad: { message: 'tagWhich', values: { example: 'tagadd:essay 207, 216' } } })
  })

  it('untag: takes a tag off some, or off everything that carries it', () => {
    expect(planUntag('OWLS', [rows[0]], rows)).toMatchObject({ says: { message: 'untag', values: { nums: [202] } }, changes: [{ set: { tags: [], tagsMine: [] } }] })
    const all = plan('untag:owls')
    expect(all.says).toEqual({ message: 'untagAll', values: { tag: 'owls', count: 3 } })
    expect(all.changes.map((c) => c.num)).toEqual([202, 204, 210])
    expect(plan('untag:nothing')).toEqual({ bad: { message: 'tagNowhere', values: { tag: 'nothing' } } })
  })

  it('retag: renames everywhere, merging into a tag that exists, and the tag becomes the person\'s', () => {
    const p = planRetag('owls', 'essay', rows)
    expect(p.says).toEqual({ message: 'retag', values: { from: 'owls', to: 'essay', count: 3 }, also: [{ message: 'retagMerge', values: { to: 'essay' } }] })
    expect(p.changes.find((c) => c.num === 204).set).toEqual({ tags: ['Essay'], tagsMine: ['essay'] })
    expect(p.changes.find((c) => c.num === 202).set).toEqual({ tags: ['essay'], tagsMine: ['essay'] })
    expect(planRetag('owls', 'owls', rows).says.message).toBe('retagSame')
    expect(planRetag('owls', 'Owls', rows).changes[0].set.tags).toEqual(['Owls'])
  })
})

describe('a line of row commands (C143 (g))', () => {
  it('plans each on the rows the last one left, and merges what one record gets', () => {
    const p = plan('pin:202 tagadd:essay 202')
    expect(p.changes).toEqual([{
      store: 'conversations', id: 'chat202', num: 202,
      set: { pinned: true, tags: ['owls', 'essay'], tagsMine: ['essay'] },
      expect: { pinned: false, tags: ['owls'], tagsMine: [] },
    }])
    expect(p.each.map((s) => s.message)).toEqual(['pinOn', 'tagAdd'])
  })

  it('stops at a command that would change nothing, and says why', () => {
    expect(plan('pin:202 archive:off 202')).toEqual({ bad: { message: 'archiveNot' } })
  })
})

describe('copy:', () => {
  it('names one thing to copy', () => {
    expect(planCopy(steps('copy:203b')[0].match.values, rows)).toMatchObject({ says: { message: 'copyOne', values: { num: 206 } }, row: { num: 206 } })
  })
})

describe('delete: of what has been sent (C137; C199)', () => {
  const erows = [
    row(204, 'chat', { chatId: 'c204', docketNum: 203, branch: 'a', title: 'barn owl' }),
    row(206, 'chat', { chatId: 'c206', docketNum: 203, branch: 'b', title: 'Essay plan' }),
    row(203, 'docket', { docketNum: 203 }),
    row(202, 'chat', { chatId: 'c202', docketNum: 201, branch: 'a', title: 'Shortcut test' }),
    row(210, 'note', { chatId: 'c204', text: 'Check the range map' }),
    row(211, 'term', { chatId: 'c204', text: 'Tyto' }),
  ]
  const erase = (line) => {
    const a = enterLine(`>${line}`, { mode: 'command', board: 'almanac', built: BUILT })
    if (a.state !== 'ready') throw new Error(`${line}: ${a.message}`)
    return planErase(a.steps[0].match.values, erows)
  }

  it('names what goes, what stays, and that undo cannot bring it back', () => {
    const p = erase('delete:204')
    expect(p.says).toEqual({
      message: 'eraseItems', values: { erasing: [{ num: 204, title: 'barn owl' }] },
      also: [{ message: 'eraseMarksStay', values: { count: 2 } }, { message: 'eraseUndo', values: { count: 1 } }],
    })
    expect(p.erase).toEqual({ chats: [{ id: 'c204', num: 204 }], marks: [], keepMarks: true, nums: [204] })
  })

  it('takes the markings too with all', () => {
    const p = erase('delete:204 all')
    expect(p.says.also[0]).toEqual({ message: 'eraseMarksGo', values: { count: 2 } })
    expect(p.erase.keepMarks).toBe(false)
  })

  it('takes every chat of a plan by its number, and says the plan goes (C137 (b))', () => {
    const p = erase('delete:203')
    expect(p.erase.chats.map((c) => c.num)).toEqual([204, 206])
    expect(p.says.also).toContainEqual({ message: 'erasePlanGoes', values: { count: 1, nums: [203] } })
  })

  it('takes a branch\'s chat, and a plan of one branch by its chat (C127)', () => {
    expect(erase('delete:203b').erase.chats).toEqual([{ id: 'c206', num: 206 }])
    const one = erase('delete:201')
    expect(one.erase.chats).toEqual([{ id: 'c202', num: 202 }])
    expect(one.says.also).toContainEqual({ message: 'erasePlanGoes', values: { count: 1, nums: [201] } })
  })

  it('erases a note or keyword by its number, and several at once', () => {
    const p = erase('delete:210, 211')
    expect(p.erase.marks).toEqual([{ store: 'notes', id: 'note210', num: 210 }, { store: 'highlights', id: 'term211', num: 211 }])
    expect(p.says.values.erasing).toEqual([{ num: 210, title: 'Check the range map' }, { num: 211, title: 'Tyto' }])
  })

  it('refuses a number that is not here', () => {
    expect(erase('delete:299')).toEqual({ bad: { message: 'numNone', values: { num: '299' } } })
  })
})
