import { describe, it, expect } from 'vitest'
import { schema } from './schema'
import { replyFromMarkdown } from './fromMarkdown'
import { createIds } from './track'
import { shownDecorations } from './shown'

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
