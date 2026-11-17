import { describe, it, expect } from 'vitest'
import { spokenInto } from './spoken'
import { lookup } from '../commands/registry'

const isVerb = (word) => lookup(word) != null

describe('what speech adds to the field (17 November)', () => {
  it('puts a prompt after what is typed, as said', () => {
    expect(spokenInto('prompt', '', 'Make it shorter.')).toBe('Make it shorter.')
    expect(spokenInto('prompt', 'Make it ', 'shorter, please.')).toBe('Make it shorter, please.')
    // A typed word ending in s keeps its s (the old join took it away).
    expect(spokenInto('prompt', 'Tell me about owls', 'and bats')).toBe('Tell me about owls and bats')
  })

  it('searches for the words without the stop speech puts at the end', () => {
    expect(spokenInto('search', '', 'Barn owls.')).toBe('Barn owls')
    expect(spokenInto('search', 'owls', 'at night?')).toBe('owls at night')
    expect(spokenInto('search', '', '富士山。')).toBe('富士山')
  })

  it('joins a spoken command to its first word with a colon', () => {
    expect(spokenInto('command', '', 'Open collection.', { isVerb })).toBe('open:collection')
    expect(spokenInto('command', '', 'alarm 25m tea', { isVerb })).toBe('alarm:25m tea')
    expect(spokenInto('command', '', 'Tour', { isVerb })).toBe('tour:')
  })

  it('leaves words that name no command, and words after a typed command, as heard', () => {
    expect(spokenInto('command', '', 'Hello there.', { isVerb })).toBe('Hello there')
    expect(spokenInto('command', 'open:', 'settings', { isVerb })).toBe('open:settings')
    expect(spokenInto('command', 'alarm:25m', 'tea', { isVerb })).toBe('alarm:25m tea')
  })

  it('changes nothing for nothing heard', () => {
    expect(spokenInto('prompt', 'kept ', '  ')).toBe('kept ')
    expect(spokenInto('search', 'kept', '.')).toBe('kept')
  })
})
