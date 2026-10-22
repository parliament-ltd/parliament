import { describe, it, expect } from 'vitest'
import { searchWords } from './searchWords'

describe('what a question to a source searches for (C168)', () => {
  it('leaves out a leading question phrase, an article and the question mark', () => {
    expect(searchWords('What is a barn owl?')).toBe('barn owl')
    expect(searchWords('Who wrote Hamlet?')).toBe('Hamlet')
    expect(searchWords('How tall is the Eiffel Tower?')).toBe('Eiffel Tower')
    expect(searchWords("what's photosynthesis")).toBe('photosynthesis')
    expect(searchWords('Tell me about the Hanseatic League.')).toBe('Hanseatic League')
    expect(searchWords('What does entropy mean?')).toBe('entropy')
    expect(searchWords('When did the Berlin Wall fall?')).toBe('Berlin Wall fall')
  })

  it('leaves a search alone, apart from a closing question mark', () => {
    expect(searchWords('barn owl')).toBe('barn owl')
    expect(searchWords('rust borrow checker?')).toBe('rust borrow checker')
    expect(searchWords('Whatever happened to Fortran')).toBe('Whatever happened to Fortran')
    expect(searchWords('Howl (poem)')).toBe('Howl (poem)')
  })

  it('keeps the question when the rule would leave nothing', () => {
    expect(searchWords('What is?')).toBe('What is')
    expect(searchWords('Explain')).toBe('Explain')
  })

  it('is English only for now', () => {
    expect(searchWords('Vad är en tornuggla?', 'sv')).toBe('Vad är en tornuggla')
    expect(searchWords('What is a barn owl?', 'en-GB')).toBe('barn owl')
  })
})

describe('the Enter line says what a source searches for (C168)', async () => {
  const { setupI18n } = await import('@lingui/core')
  const { messages: en } = await import('../locales/en/messages.mjs')
  const { promptPreview } = await import('../chrome/preview')
  const { say } = await import('../chrome/say')
  const i18n = setupI18n({ locale: 'en', messages: { en } })
  i18n.activate('en')
  const wiki = { id: 'wikipedia', group: 'source', name: 'Wikipedia' }
  const also = (text, searchLang = 'en') => (promptPreview(text, { room: 'c1', keyed: false, answerer: wiki, searchLang }).says.also ?? []).map((x) => say(i18n, x.message, x.values))

  it('when it is not the question as typed', () => {
    expect(also('What is a barn owl?')).toEqual(['It goes as a search for “barn owl”'])
    expect(also('barn owl?')).toEqual([])
    expect(also('Vad är en tornuggla?', 'sv')).toEqual([])
  })
})
