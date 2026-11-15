import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { schema } from './schema'
import { heldDecorations, heldPlugin, heldKey } from './held'

// Edits held back, drawn dashed (C301 (b)): a decoration over each held edit's words.

const doc = () => schema.node('doc', null, [
  schema.node('paragraph', { id: 'b1' }, [
    schema.text('It had '),
    schema.text('eleven', [schema.marks.struck.create({ edit: 'e1' })]),
    schema.text('ninety', [schema.marks.added.create({ edit: 'e1' })]),
    schema.text(' years, '),
    schema.text('now', [schema.marks.added.create({ edit: 'e2' })]),
  ]),
])

describe('held edits, drawn dashed', () => {
  it('marks the words of each held edit, and nothing else', () => {
    const set = heldDecorations(doc(), new Set(['e1']))
    const found = set.find().map((d) => [d.from, d.to, d.type.attrs.class])
    expect(found).toHaveLength(2)
    expect(found.every(([, , cls]) => cls === 'pm-held')).toBe(true)
    expect(heldDecorations(doc(), new Set()).find()).toHaveLength(0)
  })

  it('takes the held set as a transaction\'s meta, and keeps it as the text changes', () => {
    let state = EditorState.create({ doc: doc(), plugins: [heldPlugin()] })
    expect(heldKey.getState(state).set.find()).toHaveLength(0)
    state = state.apply(state.tr.setMeta(heldKey, new Set(['e2'])))
    expect(heldKey.getState(state).set.find()).toHaveLength(1)
    state = state.apply(state.tr.insertText('Then ', 1))
    expect(heldKey.getState(state).set.find()).toHaveLength(1)
  })
})
