import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { schema } from './schema'
import { replyFromMarkdown } from './fromMarkdown'
import { createIds } from './track'
import { commentDecorations, commentsPlugin, commentsKey, passageAt, saidOf, anchorsOf } from './comments'

// Comments in the text (C301 (c)): over their words, the nth time those
// words come in their own message, and the comment after them.

function pairOf(prompt, reply) {
  const ids = createIds(240)
  const section = (part, message, doc) => schema.nodes.section.create({ part, message }, doc.content)
  return schema.nodes.doc.create(null, [
    section('prompt', 'p1', replyFromMarkdown(prompt, ids.block)),
    section('reply', 'r1', replyFromMarkdown(reply, ids.block)),
  ])
}
const doc = pairOf('owls and more owls', 'Barn owls hunt.\n\nOwls are quiet, and owls fly at night.')
const comment = (passage, nth, text = 'Ask Anna', num = 231) => ({ num, id: `n${num}`, text, passage, nth })
// The words each tint covers, and the widgets after them.
const tinted = (d, shown) => commentDecorations(d, shown).find().filter((x) => x.from !== x.to).map((x) => d.textBetween(x.from, x.to))
const widgets = (d, shown) => commentDecorations(d, shown).find().filter((x) => x.from === x.to)

describe('comments drawn over their words', () => {
  it('tints the passage where it was written, the nth time in its own message, with the comment after it', () => {
    const shown = { sections: { r1: [comment('owls', 2)] } }
    expect(tinted(doc, shown)).toEqual(['owls'])
    const [w] = widgets(doc, shown)
    const third = commentDecorations(doc, shown).find().find((x) => x.from !== x.to)
    expect(w.from).toBe(third.to)
    // The prompt's own owls are not the reply's.
    expect(tinted(doc, { sections: { p1: [comment('owls', 1)] } })).toEqual(['owls'])
    expect(tinted(doc, { sections: { r1: [comment('owls', 9)] } })).toEqual([])
  })

  it('says its first line only when long, with more, and all of it when opened', () => {
    const words = { more: 'more', less: 'less' }
    const long = comment('hunt', 0, 'I think this belongs first, the lease runs out in June and the landlord will not extend it for another year at least.')
    expect(saidOf(long, false, words)).toMatchObject({ toggle: 'more' })
    expect(saidOf(long, false, words).said).toMatch(/…$/)
    expect(saidOf(long, true, words)).toEqual({ said: long.text, toggle: 'less' })
    expect(saidOf(comment('hunt', 0, 'Ask Anna'), false, words)).toEqual({ said: 'Ask Anna', toggle: null })
  })

  it('draws a reply edited on its own, with no sections, from its list', () => {
    const ids = createIds(300)
    const reply = replyFromMarkdown('Barn owls hunt at night.', ids.block)
    expect(tinted(reply, { list: [comment('hunt', 0)] })).toEqual(['hunt'])
  })

  it('takes its comments as a transaction\'s meta, and shows one whole on more', () => {
    let state = EditorState.create({ doc, plugins: [commentsPlugin()] })
    state = state.apply(state.tr.setMeta(commentsKey, { sections: { r1: [comment('hunt', 0, 'x '.repeat(60))] } }))
    expect(commentsKey.getState(state).set.find()).toHaveLength(2)
    state = state.apply(state.tr.setMeta(commentsKey, { toggle: '231' }))
    expect(commentsKey.getState(state).open.has('231')).toBe(true)
  })
})

describe('what a selection is a comment on', () => {
  // The positions of the nth "owls" in the reply.
  const places = []
  doc.descendants((node, pos) => {
    if (!node.isText) return
    for (let i = node.text.toLowerCase().indexOf('owls'); i !== -1; i = node.text.toLowerCase().indexOf('owls', i + 1)) places.push(pos + i)
  })
  const select = (from, to) => EditorState.create({ doc, selection: TextSelection.create(doc, from, to) })

  it('names its message, its words and which time they come in it', () => {
    // places: the prompt's two owls, then the reply's three.
    const at = passageAt(select(places[4], places[4] + 4))
    expect(at).toMatchObject({ messageId: 'r1', passage: 'owls', nth: 2 })
    expect(passageAt(select(places[1], places[1] + 4))).toMatchObject({ messageId: 'p1', passage: 'owls', nth: 1 })
  })

  it('widens a selection to whole words, and trims its spaces', () => {
    expect(passageAt(select(places[2] + 1, places[2] + 3))).toMatchObject({ passage: 'owls', nth: 0 })
    expect(passageAt(select(places[2] - 1, places[2] + 5))).toMatchObject({ passage: 'owls', nth: 0 })
  })

  it('is nothing with nothing selected, and says so across paragraphs', () => {
    expect(passageAt(select(places[2], places[2]))).toBeNull()
    expect(passageAt(select(places[2], places[3] + 2))).toEqual({ why: 'block' })
  })

  it('counts the words as they are drawn, so the comment lands where it was written', () => {
    const at = passageAt(select(places[3], places[3] + 4))
    expect(tinted(doc, { sections: { [at.messageId]: [comment(at.passage, at.nth)] } })).toEqual(['Owls'])
    const tint = commentDecorations(doc, { sections: { r1: [comment(at.passage, at.nth)] } }).find().find((x) => x.from !== x.to)
    expect(tint.from).toBe(places[3])
  })
})

describe('a comment as its words change (C304)', () => {
  const start = () => {
    const state = EditorState.create({ doc, plugins: [commentsPlugin()] })
    return state.apply(state.tr.setMeta(commentsKey, { sections: { r1: [comment('hunt', 0)] } }))
  }
  const tintedIn = (state) => commentsKey.getState(state).set.find().filter((x) => x.spec?.words).map((x) => state.doc.textBetween(x.from, x.to))
  const huntAt = (state) => {
    let at = -1
    state.doc.descendants((n, pos) => { if (at < 0 && n.isText && n.text.includes('hunt')) at = pos + n.text.indexOf('hunt') })
    return at
  }

  it('keeps it while a letter changes, with its words as they now are', () => {
    let state = start()
    const at = huntAt(state)
    expect(tintedIn(state)).toEqual(['hunt'])
    // "hunt" to "haunt": one letter added inside.
    state = state.apply(state.tr.insertText('a', at + 1))
    expect(tintedIn(state)).toEqual(['haunt'])
    expect(anchorsOf(state)).toEqual([{ key: '231', message: 'r1', passage: 'haunt', nth: 0 }])
    // A letter typed at its end stays in its words.
    state = state.apply(state.tr.insertText('s', at + 5))
    expect(anchorsOf(state)[0].passage).toBe('haunts')
  })

  it('takes it away only when all its letters are gone, with its box', () => {
    let state = start()
    const at = huntAt(state)
    state = state.apply(state.tr.delete(at, at + 3))
    expect(tintedIn(state)).toEqual(['t'])
    state = state.apply(state.tr.delete(at, at + 1))
    expect(commentsKey.getState(state).set.find()).toEqual([])
  })
})
