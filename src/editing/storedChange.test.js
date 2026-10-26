import { describe, it, expect } from 'vitest'
import { changeStored } from './storedChange'

// Changes to a stored form from outside its editor (stage 11, piece 5; C220 (d)).

const textOf = (blocks) => blocks.map((b) => (b.text ?? []).map((r) => r.text ?? '').join('')).join('\n')
const marksOf = (blocks) => blocks.flatMap((b) => (b.text ?? []).flatMap((r) => ['struck', 'added', 'ask', 'answer', 'replaced', 'point'].filter((k) => r[k] != null)))
const para = (...runs) => [{ id: 'b1', type: 'paragraph', text: runs }]

describe('undo:242 on a stored form', () => {
  it('stands the struck words again and takes the added ones out', () => {
    const blocks = para({ text: 'Not gone out in ' }, { text: 'eleven', struck: 'e1' }, { text: 'ninety', added: 'e1' }, { text: ' years.' })
    const out = changeStored(blocks, 'undoEdit', 'e1')
    expect(textOf(out.blocks)).toBe('Not gone out in eleven years.')
    expect(marksOf(out.blocks)).toEqual([])
    expect(out.edits.size).toBe(0)
  })

  it('leaves other edits as they were', () => {
    const blocks = para({ text: 'A ', struck: 'e1' }, { text: 'B ' }, { text: 'C', added: 'e2' })
    const out = changeStored(blocks, 'undoEdit', 'e1')
    expect(textOf(out.blocks)).toBe('A B C')
    expect([...out.edits.keys()]).toEqual(['e2'])
  })

  it('is null when the edit is not there', () => {
    expect(changeStored(para({ text: 'Plain.' }), 'undoEdit', 'e9')).toBeNull()
    expect(changeStored(null, 'undoEdit', 'e1')).toBeNull()
  })
})

describe('accept:, reject: and delete: on a stored ask', () => {
  const answered = () => para({ text: 'Not gone out in ' }, { text: 'eleven years', ask: 'q1', replaced: 'q1' }, { text: 'nearly a century', answer: 'q1' }, { text: '.' })

  it('accept keeps the answer as the reply and the passage goes', () => {
    const out = changeStored(answered(), 'accept', 'q1')
    expect(textOf(out.blocks)).toBe('Not gone out in nearly a century.')
    expect(marksOf(out.blocks)).toEqual([])
    expect(out.asks.size).toBe(0)
  })

  it('undo takes the answer back and the passage stays', () => {
    const out = changeStored(answered(), 'undo', 'q1')
    expect(textOf(out.blocks)).toBe('Not gone out in eleven years.')
    expect(marksOf(out.blocks)).toEqual([])
  })

  it('drop takes an ask on a passage, or at a point, out', () => {
    const passage = changeStored(para({ text: 'Not gone out in ' }, { text: 'eleven years', ask: 'q1' }, { text: '.' }), 'drop', 'q1')
    expect(textOf(passage.blocks)).toBe('Not gone out in eleven years.')
    expect(marksOf(passage.blocks)).toEqual([])
    const point = changeStored(para({ text: 'Before ' }, { point: 'q2' }, { text: 'after.' }), 'drop', 'q2')
    expect(textOf(point.blocks)).toBe('Before after.')
    expect(marksOf(point.blocks)).toEqual([])
  })
})
