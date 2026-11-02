import { describe, it, expect } from 'vitest'
import { schema } from './schema'
import { promptFromText } from './fromMarkdown'
import { createIds } from './track'
import { titleDecorations } from './titles'

const answer = 'Nintendo Co., Ltd. is a Japanese video game company.\nList of Nintendo arcade video games\nList of Nintendo home video games.\nKyoto'
const links = ['List of Nintendo arcade video games', 'List of Nintendo home video games']

// A prompt and its reply as one document, as the room draws a source's answer.
function pairOf(prompt, reply) {
  const ids = createIds(240)
  const section = (part, message, doc) => schema.nodes.section.create({ part, message }, doc.content)
  return schema.nodes.doc.create(null, [
    section('prompt', 'p1', promptFromText(prompt, ids.block)),
    section('reply', 'r1', promptFromText(reply, ids.block)),
  ])
}
const titlesOf = (doc, titles) => titleDecorations(doc, titles).find().map((d) => d.spec.title)
// The line each widget sits at the end of.
const linesOf = (doc, titles) => titleDecorations(doc, titles).find().map((d) => doc.resolve(d.from).parent.textContent)

describe('the ask after a line that is a title (C287)', () => {
  it('sits at the end of each line of the reply that is a title, and nowhere else', () => {
    const doc = pairOf('when was nintendo founded', answer)
    expect(titlesOf(doc, { sections: { r1: links } })).toEqual(links)
    expect(linesOf(doc, { sections: { r1: links } })).toEqual(['List of Nintendo arcade video games', 'List of Nintendo home video games.'])
    const at = titleDecorations(doc, { sections: { r1: links } }).find()
    for (const d of at) expect(doc.resolve(d.from).parentOffset).toBe(doc.resolve(d.from).parent.content.size)
  })

  it('draws on a reply on its own, and never on a message with no titles', () => {
    const ids = createIds(1)
    const alone = promptFromText(answer, ids.block)
    expect(titlesOf(alone, { titles: links })).toEqual(links)
    expect(titleDecorations(alone, {}).find()).toEqual([])
    // The prompt's words are not the reply's: a prompt that is a title has no ask.
    const doc = pairOf('List of Nintendo arcade video games', 'Nothing here')
    expect(titlesOf(doc, { sections: { r1: links } })).toEqual([])
  })

  it('reads a line as it stands: struck words left out', () => {
    const ids = createIds(1)
    const struck = schema.marks.struck.create({ edit: 1 })
    const line = schema.nodes.paragraph.create({ id: ids.block() }, [
      schema.text('List of Nintendo arcade video games'),
      schema.text(' and more', [struck]),
    ])
    const doc = schema.nodes.doc.create(null, [line])
    expect(titlesOf(doc, { titles: links })).toEqual(['List of Nintendo arcade video games'])
    const added = schema.marks.added.create({ edit: 2 })
    const typed = schema.nodes.doc.create(null, [schema.nodes.paragraph.create({ id: ids.block() }, [
      schema.text('List of Nintendo arcade video games'),
      schema.text(' and more', [added]),
    ])])
    expect(titlesOf(typed, { titles: links })).toEqual([])
  })

  it('changes nothing in the document: decorations only', () => {
    const doc = pairOf('when was nintendo founded', answer)
    const before = JSON.stringify(doc.toJSON())
    titleDecorations(doc, { sections: { r1: links } })
    expect(JSON.stringify(doc.toJSON())).toBe(before)
  })
})
