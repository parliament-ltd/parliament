import { describe, it, expect } from 'vitest'
import { costMark, findModel, answererRows, findAnswerers, answererFor, KEYLESS_DEFAULT } from './answerers'

const metered = (i, o) => ({ type: 'metered', inputPerMillion: i, outputPerMillion: o })
const HAIKU = metered(1, 5)

const DESTS = [
  { id: 'anthropic', kind: 'model', name: 'Anthropic', key: true, ships: true },
  { id: 'mistral', kind: 'model', name: 'Mistral', key: true, ships: false },
  { id: 'ollama', kind: 'local', name: 'Ollama', key: false, ships: false },
  { id: 'wikipedia', kind: 'source', name: 'Wikipedia', key: false, ships: true, sourceKind: 'reference' },
  { id: 'hackernews', kind: 'source', name: 'Hacker News', key: false, ships: false, sourceKind: 'discussion' },
  { id: 'openalex', kind: 'source', name: 'OpenAlex', key: false, ships: false, sourceKind: 'research' },
]
const MODELS = {
  anthropic: [
    { id: 'claude-haiku-9', apiId: 'claude-haiku-9-20990101', name: 'Haiku 9', cost: HAIKU },
    { id: 'claude-opus-9', apiId: 'claude-opus-9', name: 'Opus 9', cost: metered(15, 75) },
    { id: 'claude-sonnet-9', apiId: 'claude-sonnet-9', name: 'Sonnet 9', cost: metered(3, 15) },
    { id: 'claude-sonnet-8', apiId: 'claude-sonnet-8', name: 'Sonnet 8', cost: metered(3, 15), current: false, aliases: ['claude-sonnet'] },
    { id: 'claude-opus-7', apiId: 'claude-opus-7', name: 'Opus 7', cost: metered(15, 75), current: false, retired: true, aliases: ['claude-opus'] },
  ],
}
const modelsOf = (id) => MODELS[id] ?? []

describe('costMark', () => {
  it('marks a price as a multiple of the reference', () => {
    expect(costMark(metered(15, 75), HAIKU)).toBe('×15')
    expect(costMark(metered(3, 15), HAIKU)).toBe('×3')
    expect(costMark(HAIKU, HAIKU)).toBe('×1')
  })
  it('adds input and output, so two prices in another ratio still make one mark', () => {
    expect(costMark(metered(2, 6), HAIKU)).toBe('×1') // 8 / 6
    expect(costMark(metered(4, 12), HAIKU)).toBe('×3') // 16 / 6
  })
  it('shows one figure below ×1', () => {
    expect(costMark(metered(0.1, 0.3), HAIKU)).toBe('×0.07')
    expect(costMark(metered(0.5, 1.5), HAIKU)).toBe('×0.3')
  })
  it('says free for a model on this machine, and nothing when it cannot tell', () => {
    expect(costMark({ type: 'free-local' }, HAIKU)).toBe('free')
    expect(costMark(null, HAIKU)).toBeNull()
    expect(costMark(metered(3, 15), null)).toBeNull()
  })
})

describe('findModel', () => {
  it('finds a model by its id, its API id or an old short id', () => {
    const list = MODELS.anthropic
    expect(findModel(list, 'claude-opus-9').name).toBe('Opus 9')
    expect(findModel(list, 'claude-haiku-9-20990101').name).toBe('Haiku 9')
    expect(findModel(list, 'claude-sonnet').name).toBe('Sonnet 8') // what the old id stood for, not the newest
    expect(findModel(list, 'nothing')).toBeNull()
  })
})

describe('answererRows', () => {
  const rows = answererRows({ destinations: DESTS, modelsOf, keys: { anthropic: true }, reference: HAIKU })

  it('lists the current models in three groups, priciest first', () => {
    expect(rows.model.map((r) => r.id)).toEqual(['claude-opus-9', 'claude-sonnet-9', 'claude-haiku-9', 'mistral'])
    expect(rows.model.map((r) => r.mark)).toEqual(['×15', '×3', '×1', null])
  })
  it('leaves out older models, which stay only to name and price what they answered', () => {
    expect(rows.model.some((r) => r.id === 'claude-sonnet-8')).toBe(false)
  })
  it('marks a provider not built yet as later, in its group', () => {
    expect(rows.model.at(-1)).toMatchObject({ id: 'mistral', later: true })
    expect(rows.local).toEqual([expect.objectContaining({ id: 'ollama', later: true })])
  })
  it('lists sources by the kind of question they answer', () => {
    expect(rows.source.map((r) => r.id)).toEqual(['wikipedia', 'openalex', 'hackernews'])
    expect(rows.source.map((r) => r.later)).toEqual([false, true, true])
  })
  it('says which models need a key that is not here', () => {
    const none = answererRows({ destinations: DESTS, modelsOf, keys: {}, reference: HAIKU })
    expect(none.model.filter((r) => !r.later).every((r) => r.needsKey)).toBe(true)
    expect(rows.model.filter((r) => !r.later).some((r) => r.needsKey)).toBe(false)
  })
})

describe('findAnswerers', () => {
  const rows = answererRows({ destinations: DESTS, modelsOf, keys: { anthropic: true }, reference: HAIKU })
  it('finds one by any part of its name', () => {
    expect(findAnswerers(rows, 'haiku').map((r) => r.id)).toEqual(['claude-haiku-9'])
    expect(findAnswerers(rows, 'HACKER').map((r) => r.id)).toEqual(['hackernews'])
  })
  it('prefers an exact id or name to a part of one', () => {
    expect(findAnswerers(rows, 'wikipedia').map((r) => r.id)).toEqual(['wikipedia'])
    expect(findAnswerers(rows, 'opus 9').map((r) => r.id)).toEqual(['claude-opus-9'])
  })
  it('finds several when a word fits several', () => {
    expect(findAnswerers(rows, 'anthropic').map((r) => r.id)).toEqual(['claude-opus-9', 'claude-sonnet-9', 'claude-haiku-9'])
    expect(findAnswerers(rows, 'nothing here')).toEqual([])
  })
})

describe('answererFor', () => {
  const base = { destinations: DESTS, modelsOf, defaultProvider: 'anthropic' }
  it('answers as before when nothing is chosen: the default model with a key, Wikipedia without', () => {
    expect(answererFor({ ...base, keys: { anthropic: true }, defaultModel: 'claude-sonnet-9' })).toMatchObject({ id: 'claude-sonnet-9', chosen: false, needsKey: false })
    expect(answererFor({ ...base, keys: {}, defaultModel: 'claude-sonnet-9' })).toMatchObject({ id: KEYLESS_DEFAULT, group: 'source', chosen: false })
  })
  it('follows the chat\'s own choice, and says when it needs a key that is not here', () => {
    expect(answererFor({ ...base, chosen: 'wikipedia', keys: { anthropic: true } })).toMatchObject({ id: 'wikipedia', chosen: true })
    expect(answererFor({ ...base, chosen: 'claude-haiku-9', keys: {} })).toMatchObject({ id: 'claude-haiku-9', chosen: true, needsKey: true })
  })
  it('reads an old id as the model it stood for, and marks one no longer served', () => {
    expect(answererFor({ ...base, keys: { anthropic: true }, defaultModel: 'claude-sonnet' })).toMatchObject({ id: 'claude-sonnet-8', name: 'Sonnet 8', gone: false })
    expect(answererFor({ ...base, keys: { anthropic: true }, defaultModel: 'claude-opus' })).toMatchObject({ id: 'claude-opus-7', gone: true })
    expect(answererFor({ ...base, keys: { anthropic: true }, defaultModel: 'made-up' })).toMatchObject({ gone: true })
  })
  it('marks a source not built yet as later', () => {
    expect(answererFor({ ...base, chosen: 'hackernews' })).toMatchObject({ id: 'hackernews', later: true })
  })
})

describe('models on this computer (stage 7, piece 4; C33, C163)', () => {
  const local = [{ id: 'ollama', kind: 'local', name: 'Ollama', key: false, ships: true }, ...DESTS.filter((d) => d.id !== 'ollama')]
  const found = [{ id: 'ollama:qwen3.5:9b', apiId: 'qwen3.5:9b', name: 'qwen3.5:9b', cost: { type: 'free-local' } }]
  const base = { destinations: local, defaultProvider: 'anthropic' }

  it('shows one row that says it is not checked, until a check lists the models', () => {
    const before = answererRows({ destinations: local, modelsOf: (id) => (id === 'ollama' ? [] : modelsOf(id)), reference: HAIKU })
    expect(before.local).toEqual([expect.objectContaining({ id: 'ollama', unchecked: true, later: false })])
    const after = answererRows({ destinations: local, modelsOf: (id) => (id === 'ollama' ? found : modelsOf(id)), reference: HAIKU })
    expect(after.local).toEqual([expect.objectContaining({ id: 'ollama:qwen3.5:9b', mark: 'free', needsKey: false })])
  })
  it('knows a chosen local model before a check lists it, and says it is unchecked', () => {
    const none = answererFor({ ...base, modelsOf: (id) => (id === 'ollama' ? [] : modelsOf(id)), chosen: 'ollama:qwen3.5:9b' })
    expect(none).toMatchObject({ group: 'local', name: 'qwen3.5:9b', provider: 'ollama', unchecked: true, gone: false })
    const listed = answererFor({ ...base, modelsOf: (id) => (id === 'ollama' ? found : modelsOf(id)), chosen: 'ollama:qwen3.5:9b' })
    expect(listed).toMatchObject({ group: 'local', name: 'qwen3.5:9b', needsKey: false })
    expect(listed.unchecked).toBeUndefined()
  })
})
