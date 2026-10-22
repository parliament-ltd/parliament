import { describe, it, expect } from 'vitest'
import { chatMarkdown, planMarkdown, markingMarkdown } from './recordsMarkdown'

// What copy: writes (stage 6, piece 3; C143 (f)).

const words = {
  you: 'You',
  untitled: 'Untitled',
  by: (m) => (m.source ? m.source.name : m.model === 'claude-sonnet' ? 'Claude Sonnet' : m.model),
  heading: { note: 'Notes', term: 'Keywords', quote: 'Quotes', document: 'The document' },
  kind: (k) => ({ note: 'Note', term: 'Keyword', quote: 'Quote' })[k],
  from: (n) => `from ${n}`,
  revision: (r) => `revision ${r}`,
}
const wiki = { id: 'wikipedia', name: 'Wikipedia', title: 'Barn owl', url: 'https://en.wikipedia.org/wiki/Barn_owl', revision: '1380781076', licence: { name: 'CC BY-SA 4.0' } }

describe('a chat as Markdown', () => {
  it('says who said what, footnotes its sources, and lists its markings', () => {
    const text = chatMarkdown({
      num: 204, title: 'barn owl', facts: ['204', 'Writing studio', '21 Oct'],
      messages: [
        { role: 'user', content: 'barn owl' },
        { role: 'assistant', content: 'The barn owl hunts by sound.', source: wiki },
        { role: 'user', content: 'And at night?' },
        { role: 'assistant', content: 'Mostly at night.', model: 'claude-sonnet' },
        { role: 'assistant', content: '' },
      ],
      markings: [{ kind: 'note', num: 210, text: 'Check the\nrange map' }, { kind: 'term', num: 211, text: 'Tyto' }],
    }, words)
    expect(text).toBe([
      '# barn owl',
      '204 · Writing studio · 21 Oct',
      '**You**', 'barn owl',
      '**Wikipedia[^1]**', 'The barn owl hunts by sound.',
      '**You**', 'And at night?',
      '**Claude Sonnet**', 'Mostly at night.',
      '## Notes', '- 210: Check the range map',
      '## Keywords', '- 211: Tyto',
      '[^1]: Wikipedia, “Barn owl”, revision 1380781076, CC BY-SA 4.0. <https://en.wikipedia.org/wiki/Barn_owl>',
    ].join('\n\n'))
  })

  it('carries a document chat\'s text, and names an untitled chat', () => {
    expect(chatMarkdown({ num: 205, title: '', document: ['First paragraph.', 'Second.'] }, words))
      .toBe('# Untitled\n\n## The document\n\nFirst paragraph.\n\nSecond.')
  })
})

describe('a plan and a marking', () => {
  it('numbers footnotes across a plan\'s chats', () => {
    const one = { num: 204, title: 'a', messages: [{ role: 'assistant', content: 'x', source: wiki }] }
    const two = { num: 206, title: 'b', messages: [{ role: 'assistant', content: 'y', source: wiki }] }
    const text = planMarkdown([one, two], words)
    expect(text).toContain('**Wikipedia[^2]**')
    expect(text.split('\n\n---\n\n')).toHaveLength(2)
  })

  it('quotes a keyword or quote, and keeps a note as written, with where it came from', () => {
    expect(markingMarkdown({ kind: 'quote', num: 212, text: 'Hunts by\nsound', chatNum: 204 }, words)).toBe('> Hunts by\n> sound\n\nQuote 212 · from 204')
    expect(markingMarkdown({ kind: 'note', num: 210, text: 'Range map', chatNum: null }, words)).toBe('Range map\n\nNote 210')
  })
})
