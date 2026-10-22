import { describe, it, expect } from 'vitest'
import { findPrivate, countPrivate, createVeil, veilRequest, SWAP_NOTE } from './privacyFilter'

const kinds = (t) => findPrivate(t).map((f) => `${f.kind}:${f.value}`)

describe('finding fixed formats (C167)', () => {
  it('finds email addresses', () => {
    expect(kinds('Write to anna.berg+work@example.co.uk today.')).toEqual(['email:anna.berg+work@example.co.uk'])
    expect(kinds('mail stefan@parliament.ltd, or support@parliament.ltd')).toEqual(['email:stefan@parliament.ltd', 'email:support@parliament.ltd'])
  })

  it('finds phone numbers in the usual shapes', () => {
    expect(kinds('Call +46 70 123 45 67 or 070-123 45 67.')).toEqual(['phone:+46 70 123 45 67', 'phone:070-123 45 67'])
    expect(kinds('Ring (555) 123-4567 or 555-123-4567')).toEqual(['phone:(555) 123-4567', 'phone:555-123-4567'])
    expect(kinds('+44 20 7946 0958')).toEqual(['phone:+44 20 7946 0958'])
  })

  it('leaves alone dates, versions, years, sums and short numbers', () => {
    expect(kinds('On 2026-10-22 we shipped 0.40.8; it cost 1 234 kronor in 1999, ticket 4021.')).toEqual([])
    expect(kinds('Ollama 0.40.8 on port 11434, model bonsai-2:9b')).toEqual([])
    expect(kinds('commit 2b5855b and id 168547c4abc566ba975bab0e006449b5b7206602')).toEqual([])
    expect(kinds('a range 10-20 and 3 - 4')).toEqual([])
  })

  it('finds a bank account number only when its check digits hold', () => {
    expect(kinds('Pay SE45 5000 0000 0583 9825 7466')).toEqual(['iban:SE45 5000 0000 0583 9825 7466'])
    expect(kinds('GB82WEST12345698765432')).toEqual(['iban:GB82WEST12345698765432'])
    expect(kinds('SE45 5000 0000 0583 9825 7467')).toEqual([])
  })

  it('finds a card number only when its Luhn digit holds', () => {
    expect(kinds('card 4111 1111 1111 1111 expires')).toEqual(['card:4111 1111 1111 1111'])
    expect(kinds('4111 1111 1111 1112')).toEqual([])
    expect(kinds('0000 0000 0000 0000')).toEqual([])
  })

  it('counts each value once, by kind', () => {
    expect(countPrivate(['a@b.se and a@b.se', 'c@d.se, +46 70 123 45 67'])).toEqual({ email: 2, phone: 1, iban: 0, card: 0 })
  })
})

describe('swapping out and back', () => {
  it('gives one value one placeholder through a request, numbered by first appearance', () => {
    const veil = createVeil()
    expect(veil.out('Mail a@b.se, then c@d.se, then a@b.se again.')).toBe('Mail [EMAIL_1], then [EMAIL_2], then [EMAIL_1] again.')
    expect(veil.out('Call +46 70 123 45 67')).toBe('Call [PHONE_1]')
    expect(veil.found()).toEqual({ email: 2, phone: 1, iban: 0, card: 0 })
  })

  it('puts them back in the reply, and leaves placeholders it never made', () => {
    const veil = createVeil()
    veil.out('a@b.se')
    expect(veil.back('Sent to [EMAIL_1]; [EMAIL_9] is not one of ours.')).toBe('Sent to a@b.se; [EMAIL_9] is not one of ours.')
  })

  it('swaps a whole request, the system prompt included, and tells the model why', () => {
    const r = veilRequest({
      messages: [{ role: 'user', content: 'Draft a note to a@b.se' }, { role: 'assistant', content: 'To a@b.se: hello' }, { role: 'user', content: [{ type: 'text', text: 'and +46 70 123 45 67' }, { type: 'image', source: {} }] }],
      system: 'Sign it from me@home.se',
    })
    expect(r.messages[0].content).toBe('Draft a note to [EMAIL_1]')
    expect(r.messages[1].content).toBe('To [EMAIL_1]: hello')
    expect(r.messages[2].content[0].text).toBe('and [PHONE_1]')
    expect(r.messages[2].content[1]).toEqual({ type: 'image', source: {} })
    expect(r.system).toBe(`Sign it from [EMAIL_2]\n\n${SWAP_NOTE}`)
  })

  it('changes nothing, and adds no note, when nothing is found', () => {
    const r = veilRequest({ messages: [{ role: 'user', content: 'What is a barn owl?' }], system: null })
    expect(r.messages[0].content).toBe('What is a barn owl?')
    expect(r.system).toBeNull()
    expect(r.veil.swapped()).toBe(false)
  })
})
