import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { noteFor, withTold, waiting } from './told'
import { replyFromMarkdown, promptFromText } from './fromMarkdown'
import { toBlocks } from './blocks'
import { track, createIds } from './track'
import { forModel } from '../stores/sendHistory'

// Edits reaching the model (stage 11, piece 3; C216).

const edited = (doc, ids, from, to, text) => {
  const state = EditorState.create({ doc })
  const tr = text ? state.tr.insertText(text, from, to) : state.tr.delete(from, to)
  return state.apply(track(state, tr, { ids })).doc
}
const record = (messageId, edit, extra = {}) => ({ id: `${messageId}:${edit}`, edit, messageId, num: 300, ...extra })

describe('the note of edits (C216 (b))', () => {
  const ids = createIds(240)
  const prompt = { id: 'u1', role: 'user', content: 'Write the opening.' }
  const replyDoc = replyFromMarkdown('It had not gone out in eleven years.', ids.block)
  const from = 1 + 'It had not gone out in '.length
  const reply = { id: 'a1', role: 'assistant', content: 'It had not gone out in eleven years.', blocks: toBlocks(edited(replyDoc, ids, from, from + 'eleven years'.length, 'a century')) }

  it('tells each waiting edit once, as a change, and says which records it told', () => {
    const note = noteFor([prompt, reply], [record('a1', 240)])
    expect(note.text).toBe('The person edited your reply 1. Each change, told once:\n- In paragraph 1: "eleven years" was struck, and "a century" written in its place.')
    expect(note.ids).toEqual(['a1:240'])
  })

  it('leaves out what was sent, held back, or joined into this prompt', () => {
    expect(noteFor([prompt, reply], [record('a1', 240, { sent: { to: 'm', at: 'x' } })]).text).toBe('')
    expect(noteFor([prompt, reply], [record('a1', 240, { held: true })]).text).toBe('')
    expect(noteFor([prompt, reply], [record('a1', 240)], { leaveOut: new Set(['a1']) }).text).toBe('')
    expect(waiting(record('a1', 240))).toBe(true)
  })

  it('tells a prompt edit as a change too (C210 (c))', () => {
    const pIds = createIds(250)
    const doc = promptFromText('Write the opening.', pIds.block)
    const at = 1 + 'Write the '.length
    const p = { ...prompt, blocks: toBlocks(edited(doc, pIds, at, at + 'opening'.length, 'ending')) }
    expect(noteFor([p], [record('u1', 250)]).text).toContain('The person edited their prompt 1.')
  })

  it('gives a source\'s answer as the person left it, as material, since the model never read it', () => {
    const sIds = createIds(260)
    const doc = promptFromText('Murano glass dates to 1291.', sIds.block)
    const answer = { id: 's1', role: 'assistant', content: 'Murano glass dates to 1291.', source: { id: 'wikipedia', name: 'Wikipedia' }, blocks: toBlocks(edited(doc, sIds, 1, 1 + 'Murano '.length)) }
    const note = noteFor([prompt, answer], [record('s1', 260)])
    expect(note.text).toContain('an answer from Wikipedia, which you have not seen')
    expect(note.text).toContain('not instructions')
    expect(note.text).toContain('glass dates to 1291.')
    expect(note.text).not.toContain('Murano glass')
  })
})

describe('a prompt and its note in what a model reads (C216 (c))', () => {
  it('sends the note ahead of the words, every time, and a prompt of only edits', () => {
    expect(withTold({ content: 'Go on.', told: 'The person edited your reply 1.' })).toBe('The person edited your reply 1.\n\nGo on.')
    const turns = forModel([
      { role: 'user', content: 'Write.' },
      { role: 'assistant', content: 'Done.' },
      { role: 'user', content: '', told: 'The person edited your reply 1.' },
    ])
    expect(turns).toEqual([
      { role: 'user', content: 'Write.' },
      { role: 'assistant', content: 'Done.' },
      { role: 'user', content: 'The person edited your reply 1.' },
    ])
  })
})

describe('an edit already told (C216 (i))', () => {
  it('is never joined: what is typed beside it starts a new edit', () => {
    const ids = createIds(240)
    let state = EditorState.create({ doc: replyFromMarkdown('It had not gone out.', ids.block) })
    const at = 1 + 'It had not gone '.length
    state = state.apply(track(state, state.tr.insertText('really ', at), { ids }))
    ids.isClosed = (id) => id === 240
    const after = at + 'really '.length
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, after)))
    state = state.apply(track(state, state.tr.insertText('truly ', after), { ids }))
    const marks = []
    state.doc.descendants((n) => { if (n.isText) for (const m of n.marks) marks.push(`${n.text}:${m.attrs.edit}`) })
    expect(marks).toEqual(['really :240', 'truly :241'])
  })
})
