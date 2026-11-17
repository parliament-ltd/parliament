import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { schema } from './schema'
import { replyFromMarkdown } from './fromMarkdown'
import { createIds } from './track'
import { shownDecorations, shownPlugin, shownKey, lightsOf } from './shown'

// A prompt and its reply as one document, as the room draws them.
function pairOf(prompt, reply) {
  const ids = createIds(240)
  const section = (part, message, doc) => schema.nodes.section.create({ part, message }, doc.content)
  return schema.nodes.doc.create(null, [
    section('prompt', 'p1', replyFromMarkdown(prompt, ids.block)),
    section('reply', 'r1', replyFromMarkdown(reply, ids.block)),
  ])
}
// The words each decoration covers, in order.
const marked = (doc, shown) => shownDecorations(doc, shown).find().map((d) => doc.textBetween(d.from, d.to))
const at = (doc, shown) => shownDecorations(doc, shown).find().map((d) => d.from)

describe('highlights (C285)', () => {
  const doc = pairOf('owls and more owls', 'Barn owls hunt.\n\nOwls are quiet, and owls fly at night.')

  it('marks a highlight only where it was selected: the nth time its words come in its own message', () => {
    const first = at(doc, { sections: { r1: { highlights: [{ text: 'owls', bg: 'x', nth: 0 }] } } })
    const third = at(doc, { sections: { r1: { highlights: [{ text: 'owls', bg: 'x', nth: 2 }] } } })
    expect(first).toHaveLength(1)
    expect(third).toHaveLength(1)
    expect(third[0]).toBeGreaterThan(first[0])
    // The prompt's own owls are not the reply's.
    expect(marked(doc, { sections: { r1: { highlights: [{ text: 'owls', bg: 'x', nth: 0 }] } } })).toEqual(['owls'])
  })

  it('marks the first time for a highlight kept before, with no place of its own', () => {
    expect(marked(doc, { sections: { p1: { highlights: [{ text: 'owls', bg: 'x' }] } } })).toEqual(['owls'])
  })

  it('marks nothing where the words no longer come that often', () => {
    expect(marked(doc, { sections: { r1: { highlights: [{ text: 'owls', bg: 'x', nth: 9 }] } } })).toEqual([])
  })
})

describe('a highlight as its words change (C304)', () => {
  const doc = pairOf('owls and more owls', ['Barn owls hunt.', 'Owls are quiet, and owls fly at night.'].join('\n\n'))
  const start = (extra = {}) => {
    const state = EditorState.create({ doc, plugins: [shownPlugin()] })
    return state.apply(state.tr.setMeta(shownKey, { sections: { r1: { highlights: [{ id: 'h1', text: 'hunt', bg: 'x', nth: 0 }], ...extra } } }))
  }
  const litIn = (state) => shownKey.getState(state).set.find().filter((d) => d.spec?.light).map((d) => state.doc.textBetween(d.from, d.to))
  const huntAt = (state) => {
    let at = -1
    state.doc.descendants((n, pos) => { if (at < 0 && n.isText && n.text.includes('hunt')) at = pos + n.text.indexOf('hunt') })
    return at
  }

  it('keeps it while a letter changes, with its words as they now are', () => {
    let state = start()
    const at = huntAt(state)
    expect(litIn(state)).toEqual(['hunt'])
    // "hunt" to "haunt": one letter added inside.
    state = state.apply(state.tr.insertText('a', at + 1))
    expect(litIn(state)).toEqual(['haunt'])
    expect(lightsOf(state)).toEqual([{ key: 'h1', message: 'r1', text: 'haunt', nth: 0 }])
    // A letter typed at its end stays in its words.
    state = state.apply(state.tr.insertText('s', at + 5))
    expect(lightsOf(state)[0].text).toBe('haunts')
  })

  it('takes it away only when all its letters are gone, or all are struck', () => {
    let state = start()
    const at = huntAt(state)
    state = state.apply(state.tr.delete(at, at + 3))
    expect(litIn(state)).toEqual(['t'])
    state = state.apply(state.tr.delete(at, at + 1))
    expect(litIn(state)).toEqual([])
    let struck = start()
    struck = struck.apply(struck.tr.addMark(at, at + 4, schema.marks.struck.create({ edit: 'e1' })))
    expect(litIn(struck)).toEqual([])
  })

  it('still finds a quote by its words after the text changes', () => {
    let state = start({ quotes: [{ num: 7, text: 'fly at night' }] })
    const at = huntAt(state)
    state = state.apply(state.tr.insertText('a', at + 1))
    const quoted = shownKey.getState(state).set.find().filter((d) => d.type.attrs?.class === 'p-quoted')
    expect(quoted.map((d) => state.doc.textBetween(d.from, d.to))).toEqual(['fly at night'])
  })
})
