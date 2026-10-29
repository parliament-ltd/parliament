import { describe, it, expect } from 'vitest'
import { answererRows } from '../net/answerers'
import { answerGroups, answerFacts, footOf } from './menus'

// The menus under the bar, drawn as the ? reference is (29 October).

const metered = (i, o) => ({ type: 'metered', inputPerMillion: i, outputPerMillion: o })
const HAIKU = metered(1, 5)
const DESTS = [
  { id: 'anthropic', kind: 'model', name: 'Anthropic', key: true, ships: true, data: { training: 'no', kept: 'days30' } },
  { id: 'mistral', kind: 'model', name: 'Mistral', key: true, ships: true, data: { training: 'optOut', kept: 'days30' } },
  { id: 'later-one', kind: 'model', name: 'Later One', key: true, ships: false },
  { id: 'ollama', kind: 'local', name: 'Ollama', key: false, ships: true, data: { training: 'no', kept: 'device' } },
  { id: 'wikipedia', kind: 'source', name: 'Wikipedia', key: false, ships: true, sourceKind: 'reference', answersIn: 'yours' },
  { id: 'hackernews', kind: 'source', name: 'Hacker News', key: false, ships: true, sourceKind: 'discussion', answersIn: 'english' },
  { id: 'openalex', kind: 'source', name: 'OpenAlex', key: false, ships: true, sourceKind: 'research', answersIn: 'mostlyEnglish', perDay: 100 },
  { id: 'another-paper', kind: 'source', name: 'Another', key: false, ships: true, sourceKind: 'research' },
]
const MODELS = {
  anthropic: [
    { id: 'opus-9', name: 'Opus 9', cost: metered(15, 75) },
    { id: 'haiku-9', name: 'Haiku 9', cost: HAIKU, thinks: true },
  ],
  mistral: [
    { id: 'large-9', name: 'Large 9', cost: metered(2, 6), preview: true, data: { training: 'always' }, maker: 'Mistral' },
    { id: 'glm-9', name: 'GLM 9', cost: metered(1, 5), maker: 'Elsewhere' },
  ],
}
const modelsOf = (id) => MODELS[id] ?? []
const rows = answererRows({ destinations: DESTS, modelsOf, keys: { anthropic: true }, reference: HAIKU })

describe('who answers, in groups', () => {
  const groups = answerGroups(rows)

  it('heads each provider’s models with its name from the list, in the list’s order', () => {
    expect(groups.map((g) => g.key)).toEqual(['model:anthropic', 'model:mistral', 'later', 'local', 'source'])
    expect(groups.slice(0, 2).map((g) => g.name)).toEqual(['Anthropic', 'Mistral'])
    expect(groups[0].rows.map((r) => r.id)).toEqual(['opus-9', 'haiku-9'])
    expect(groups[1].rows.map((r) => r.id)).toEqual(['large-9', 'glm-9'])
  })

  it('says once, at the heading, that a provider waits for a key', () => {
    expect(groups[0].needsKey).toBe(false)
    expect(groups[1]).toMatchObject({ needsKey: true, provider: 'mistral' })
  })

  it('puts providers not built yet together, and names the other groups from the copy table', () => {
    expect(groups[2]).toMatchObject({ group: 'later', name: null })
    expect(groups[2].rows.map((r) => r.id)).toEqual(['later-one'])
    expect(groups.slice(2).every((g) => g.name === null)).toBe(true)
  })

  it('marks a source where the kind of question it answers changes', () => {
    const src = groups.at(-1).rows
    expect(src.map((r) => r.id)).toEqual(['wikipedia', 'openalex', 'another-paper', 'hackernews'])
    expect(src.map((r) => r.kindStarts)).toEqual([true, true, false, true])
  })

  it('leaves out a group with nothing in it', () => {
    expect(answerGroups({ model: [], local: [], source: rows.source }).map((g) => g.key)).toEqual(['source'])
    expect(answerGroups({})).toEqual([])
  })
})

describe('the facts on a row of who answers', () => {
  const byId = (id) => [...rows.model, ...rows.local, ...rows.source].find((r) => r.id === id)

  it('gives a model its cost mark first, then what it can do and what is done with what it is sent', () => {
    expect(answerFacts(byId('opus-9'))).toEqual([{ mark: '×15' }, { copy: 'trainNo' }, { copy: 'kept30' }])
    expect(answerFacts(byId('haiku-9'))).toEqual([{ mark: '×1' }, { copy: 'thinks' }, { copy: 'trainNo' }, { copy: 'kept30' }])
  })

  it('says a preview, who made it where that is not its provider, and trained on whatever you choose in ink', () => {
    expect(answerFacts(byId('large-9'))).toEqual([{ mark: '×1' }, { copy: 'preview' }, { copy: 'trainAlways', warn: true }, { copy: 'kept30' }])
    expect(answerFacts(byId('glm-9'))).toEqual([{ mark: '×1' }, { copy: 'madeBy', values: { maker: 'Elsewhere' } }, { copy: 'trainOptOut' }, { copy: 'kept30' }])
  })

  it('keeps the cost mark on a model whose provider has no key here', () => {
    expect(byId('large-9').needsKey).toBe(true)
    expect(answerFacts(byId('large-9'))[0]).toEqual({ mark: '×1' })
  })

  it('says later alone for a row not built yet', () => {
    expect(answerFacts(byId('later-one'))).toEqual([{ copy: 'later' }])
  })

  it('says models on this computer are not checked yet, and stay on it', () => {
    expect(answerFacts(byId('ollama'))).toEqual([{ copy: 'unchecked' }, { copy: 'keptDevice' }])
  })

  it('gives a source no cost, only the language it answers in where that is not yours', () => {
    expect(answerFacts(byId('wikipedia'))).toEqual([])
    expect(answerFacts(byId('hackernews'))).toEqual([{ copy: 'englishOnly' }])
    expect(answerFacts(byId('openalex'))).toEqual([{ copy: 'mostlyEnglish' }])
  })
})

describe('a menu’s foot', () => {
  it('says one sentence after another, leaving out any it does not have', () => {
    expect(footOf('Marks compare.', null, 'A click ticks it.', '', 'Escape closes this')).toBe('Marks compare. A click ticks it. Escape closes this')
  })
})
