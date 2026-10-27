import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { schema } from './schema'
import { replyFromMarkdown } from './fromMarkdown'
import { track, createIds, collectEdits, undoEdit } from './track'
import { toBlocks, fromBlocks, wordsOf } from './blocks'
import { placeSuggestions, placeInStored, suggestionsIn, settleSuggestion, settleStored, carriesSuggestion } from './suggestions'
import { SKIP } from './track'

// Suggestions in place (stage 12, piece 1; C229).

const TEXT = 'The furnace had not gone out in eleven years. Ferro kept it lit.'

function setup(markdown = TEXT) {
  const ids = createIds(240)
  const doc = replyFromMarkdown(markdown, ids.block)
  return { ids, state: EditorState.create({ doc, selection: TextSelection.atStart(doc) }) }
}

// Apply the transactions a settle gives, as the editor does.
function settle(state, id, how, ids) {
  let s = state
  for (const make of settleSuggestion(s, id, how)) {
    const tr = make(s)
    s = s.apply(tr.getMeta(SKIP) ? tr : track(s, tr, { ids }))
  }
  return s
}

const words = (state) => wordsOf(toBlocks(state.doc))

describe('placing a suggestion', () => {
  it('strikes the quoted words in its colour and suggests its own after them, not as the reply\'s words yet', () => {
    const { state } = setup()
    const out = placeSuggestions(state, [{ id: 's1', kind: 'ripple', quote: 'eleven years', text: 'nearly a century' }])
    expect(out.placed).toEqual(['s1'])
    const s = suggestionsIn(out.state.doc).get('s1')
    expect(s).toMatchObject({ kind: 'ripple', struck: 'eleven years', suggested: 'nearly a century' })
    expect(s.places).toHaveLength(1)
    expect(words(out.state)).toBe(TEXT)
    // Kept and read back the same.
    const blocks = toBlocks(out.state.doc)
    expect(blocks[0].text.find((r) => r.suggestIn === 's1')).toMatchObject({ text: 'nearly a century', suggestKind: 'ripple' })
    expect(toBlocks(fromBlocks(blocks, () => 'x'))).toEqual(blocks)
  })

  it('lands only on unmarked words found exactly once', () => {
    const { state } = setup('the cat and the dog')
    const twice = placeSuggestions(state, [{ id: 's1', kind: 'sweep', quote: 'the', text: 'a' }])
    expect(twice).toMatchObject({ placed: [], missed: ['s1'] })
    expect(placeSuggestions(state, [{ id: 's2', kind: 'sweep', quote: 'the cow', text: 'x' }]).missed).toEqual(['s2'])
    // A second suggestion cannot land on the first's words.
    const both = placeSuggestions(state, [{ id: 'a', kind: 'sweep', quote: 'cat', text: 'lion' }, { id: 'b', kind: 'sweep', quote: 'cat and', text: 'x' }])
    expect(both).toMatchObject({ placed: ['a'], missed: ['b'] })
  })

  it('does not land on words you edited', () => {
    const { ids } = setup()
    let { state } = setup()
    const from = 1 + TEXT.indexOf('eleven')
    state = state.apply(track(state, state.tr.delete(from, from + 6), { ids }))
    expect(placeSuggestions(state, [{ id: 's1', kind: 'ripple', quote: 'eleven years', text: 'x' }]).missed).toEqual(['s1'])
  })

  it('builds a stored form for a reply never edited, its text unchanged', () => {
    const out = placeInStored(null, TEXT, [{ id: 's1', kind: 'sweep', quote: 'Ferro kept it lit.', text: 'Ferro kept it burning.' }])
    expect(out.placed).toEqual(['s1'])
    expect(out.suggestions.get('s1')).toMatchObject({ kind: 'sweep', suggested: 'Ferro kept it burning.' })
    expect(wordsOf(out.blocks)).toBe(TEXT)
    expect(placeInStored(null, TEXT, [{ id: 's2', kind: 'sweep', quote: 'nowhere', text: 'x' }])).toMatchObject({ blocks: null, placed: [], missed: ['s2'] })
  })
})

describe('settling a suggestion', () => {
  const placed = (kind) => {
    const { ids, state } = setup()
    return { ids, state: placeSuggestions(state, [{ id: 's1', kind, quote: 'eleven years', text: 'nearly a century' }]).state }
  }

  it('rejected, leaves the reply as it was', () => {
    for (const kind of ['ripple', 'sweep']) {
      const { ids, state } = placed(kind)
      const s = settle(state, 's1', 'reject', ids)
      expect(s.doc.eq(setup().state.doc)).toBe(true)
      expect(carriesSuggestion(s.doc, 's1')).toBe(false)
    }
  })

  it('a sweep\'s accepted, its words become the reply\'s and the struck ones go', () => {
    const { ids, state } = placed('sweep')
    const s = settle(state, 's1', 'accept', ids)
    expect(words(s)).toBe(TEXT.replace('eleven years', 'nearly a century'))
    expect(collectEdits(s.doc)).toEqual([])
    expect(suggestionsIn(s.doc).size).toBe(0)
  })

  it('Ripple\'s accepted, becomes an edit of yours, which its undo takes back', () => {
    const { ids, state } = placed('ripple')
    const s = settle(state, 's1', 'accept', ids)
    const edits = collectEdits(s.doc)
    expect(edits).toHaveLength(1)
    expect(edits[0]).toMatchObject({ struck: 'eleven years', added: 'nearly a century' })
    expect(words(s)).toBe(TEXT.replace('eleven years', 'nearly a century'))
    const back = s.apply(undoEdit(s, edits[0].id))
    expect(back.doc.eq(setup().state.doc)).toBe(true)
  })

  it('the same on the stored form, from the bar', () => {
    const stored = toBlocks(placed('ripple').state.doc)
    const out = settleStored(stored, 's1', 'accept')
    expect([...out.edits.values()][0]).toMatchObject({ struck: 'eleven years', added: 'nearly a century' })
    expect(out.suggestions.size).toBe(0)
    expect(settleStored(stored, 'nope', 'accept')).toBeNull()
    const sweep = settleStored(toBlocks(placed('sweep').state.doc), 's1', 'reject')
    expect(wordsOf(sweep.blocks)).toBe(TEXT)
    expect(sweep.edits.size).toBe(0)
  })

  it('keeps the words you type beside it yours, never the suggestion\'s', () => {
    const { ids, state } = placed('ripple')
    const end = state.doc.content.size - 1
    let s = state.apply(state.tr.setSelection(TextSelection.create(state.doc, end)))
    s = s.apply(track(s, s.tr.insertText(' Still.', end), { ids }))
    expect(suggestionsIn(s.doc).get('s1').suggested).toBe('nearly a century')
    expect(schema.marks.suggest_in).toBeTruthy()
  })
})
