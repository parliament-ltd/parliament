import { describe, it, expect } from 'vitest'
import { commentsOf, firstLineOf } from './comments'

// Comments by message (C301 (c)): on words, or on the whole of a message.

const messages = [{ id: 'm1', content: 'Barn owls hunt at night.' }, { id: 'm2', content: 'Why at night?' }]

describe('each message\'s comments', () => {
  it('puts a note with a passage on its words, and one without on the whole message', () => {
    const out = commentsOf({
      conversationId: 'c1', messages,
      notes: [
        { id: 'a', num: 233, conversationId: 'c1', messageId: 'm1', text: 'Check the figures' },
        { id: 'b', num: 231, conversationId: 'c1', messageId: 'm1', text: 'Ask Anna', passage: 'owls', nth: 0 },
      ],
    })
    expect(out.get('m1')).toEqual({
      words: [{ num: 231, id: 'b', text: 'Ask Anna', passage: 'owls', nth: 0 }],
      whole: [{ num: 233, id: 'a', text: 'Check the figures' }],
    })
  })

  it('puts a note of its own quoting a whole message under that message, as comment:reply writes it', () => {
    const out = commentsOf({
      conversationId: 'c1', messages,
      pins: [{ num: 245, targetConversationId: 'c1', sourceMessageId: 'm2', content: 'Why at night?' }, { num: 246, targetConversationId: 'c1', sourceMessageId: 'm1', content: 'owls' }],
      own: [
        { id: 'o1', num: 250, conversationId: null, text: 'Answer this first', quotes: [245] },
        // A passage quoted, not the whole message: not a comment on it.
        { id: 'o2', num: 251, conversationId: null, text: 'Owls', quotes: [246] },
        // A summary, or a note quoting several: a card's, not a message's.
        { id: 'o3', num: 252, conversationId: null, text: 'Summary', quotes: [245], summary: { from: [245] } },
      ],
    })
    expect(out.get('m2').whole.map((c) => c.num)).toEqual([250])
    expect(out.get('m1')).toBeUndefined()
  })

  it('leaves out a note with no words or no message, and a passage kept before reads as the first time', () => {
    const out = commentsOf({ conversationId: 'c1', messages, notes: [
      { id: 'x', num: 1, conversationId: 'c1', messageId: null, text: 'No message' },
      { id: 'y', num: 2, conversationId: 'c1', messageId: 'm1', text: '   ' },
      { id: 'z', num: 3, conversationId: 'c1', messageId: 'm1', text: 'Yes', passage: 'hunt' },
    ] })
    expect(out.get('m1')).toEqual({ words: [{ num: 3, id: 'z', text: 'Yes', passage: 'hunt', nth: 0 }], whole: [] })
  })
})

describe('a comment\'s first line', () => {
  it('is the whole comment when short, and cut at a word with more when long', () => {
    expect(firstLineOf('Anna wanted five, ask her')).toEqual({ line: 'Anna wanted five, ask her', more: false })
    const long = firstLineOf('I think this belongs first, the lease runs out in June and the landlord will not extend', 40)
    expect(long.more).toBe(true)
    expect(long.line).toBe('I think this belongs first, the lease…')
    expect(firstLineOf('First line\nSecond line')).toEqual({ line: 'First line', more: true })
  })
})
