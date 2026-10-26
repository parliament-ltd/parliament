import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { replyFromMarkdown } from './fromMarkdown'
import { toBlocks, fromBlocks, wordsOf } from './blocks'
import { asksIn, editsIn } from './edits'
import { startAsk, settleAsk, dropAsk, placeAnswer, answersIn, withoutAnswers } from './asks'
import { track, createIds, SKIP } from './track'

// Asks (stage 11, piece 4; C218).

const reply = 'The furnace had not gone out in eleven years.'
const setup = () => {
  const ids = createIds(240)
  const doc = replyFromMarkdown(reply, ids.block)
  return { ids, state: EditorState.create({ doc }) }
}
const at = (state, text) => 1 + state.doc.child(0).textContent.indexOf(text)
const select = (state, from, to = from) => state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))

describe('an ask on a passage', () => {
  it('marks the passage, is not an edit, and comes back the same from the stored form', () => {
    let { state, ids } = setup()
    const from = at(state, 'eleven years')
    state = select(state, from, from + 'eleven years'.length)
    const tr = startAsk(state, 'q1')
    expect(tr.getMeta(SKIP)).toBe(true)
    state = state.apply(track(state, tr, { ids }))
    expect(editsIn(state.doc).size).toBe(0)
    expect(asksIn(state.doc).get('q1')).toMatchObject({ passage: 'eleven years', point: false })
    const back = fromBlocks(JSON.parse(JSON.stringify(toBlocks(state.doc))), ids.block)
    expect(back.eq(state.doc)).toBe(true)
  })

  it('takes its answer in place, then settles: accept keeps the answer, undo the passage', () => {
    let { state, ids } = setup()
    const from = at(state, 'eleven years')
    state = select(state, from, from + 'eleven years'.length)
    state = state.apply(startAsk(state, 'q1'))
    const placed = placeAnswer(toBlocks(state.doc), 'q1', 'nearly a century', 'eleven years')
    expect(placed[0].text.map((r) => r.text)).toEqual(['The furnace had not gone out in ', 'eleven years', 'nearly a century', '.'])
    expect(wordsOf(placed)).toBe('The furnace had not gone out in eleven years.')
    const answered = EditorState.create({ doc: fromBlocks(placed, ids.block) })
    expect(asksIn(answered.doc).get('q1').answer).toBe('nearly a century')
    const accepted = answered.apply(settleAsk(answered, 'q1', 'accept'))
    expect(accepted.doc.textContent).toBe('The furnace had not gone out in nearly a century.')
    expect(toBlocks(accepted.doc)[0].text).toEqual([{ text: 'The furnace had not gone out in nearly a century.' }])
    const undone = answered.apply(settleAsk(answered, 'q1', 'undo'))
    expect(toBlocks(undone.doc)[0].text).toEqual([{ text: 'The furnace had not gone out in eleven years.' }])
  })

  it('puts the answer on its card only when the passage changed since it was asked', () => {
    let { state } = setup()
    const from = at(state, 'eleven years')
    state = select(state, from, from + 'eleven years'.length)
    state = state.apply(startAsk(state, 'q1'))
    expect(placeAnswer(toBlocks(state.doc), 'q1', 'a century', 'twelve years')).toBeNull()
    expect(placeAnswer(toBlocks(state.doc), 'q9', 'a century', '')).toBeNull()
  })
})

describe('an ask at a point', () => {
  it('sits where the cursor was, knows the words before it, and can be dropped', () => {
    let { state, ids } = setup()
    state = select(state, at(state, '.'))
    state = state.apply(track(state, startAsk(state, 'q2'), { ids }))
    expect(asksIn(state.doc).get('q2')).toMatchObject({ point: true, passage: 'furnace had not gone out in eleven years' })
    expect(toBlocks(state.doc)[0].text).toEqual([{ text: 'The furnace had not gone out in eleven years' }, { point: 'q2' }, { text: '.' }])
    const placed = placeAnswer(toBlocks(state.doc), 'q2', 'In 1880 it still burned.', '')
    expect(placed[0].text[2]).toEqual({ text: ' In 1880 it still burned.', answer: 'q2' })
    const dropped = state.apply(dropAsk(state, 'q2'))
    expect(dropped.doc.textContent).toBe(reply)
  })
})

describe('answers in a reply', () => {
  it('are read by number as text, and taken out of the reply as shown', () => {
    const content = 'Here you are.\n\n[ask 241]\nnearly a century\n[/ask]\n\n[ask 242] In 1880 it still burned. [/ask]\n\nAnything else?'
    expect([...answersIn(content)]).toEqual([[241, 'nearly a century'], [242, 'In 1880 it still burned.']])
    expect(withoutAnswers(content)).toBe('Here you are.\n\nAnything else?')
  })
})
