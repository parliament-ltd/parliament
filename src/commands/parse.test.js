import { describe, it, expect } from 'vitest'
import { leaderOf, readField, readArg, parseCommand, shapedLikeKey } from './parse'

// A small stand-in for the registry: the verbs these tests use.
const KNOWN = { open: {}, type: {}, tag: {}, add: {}, name: {}, set: {}, bar: {}, tell: { rest: true }, note: { rest: true } }
const lookup = (verb) => KNOWN[verb] ?? null
const parse = (body) => parseCommand(body, lookup)

describe('the leaders', () => {
  it('are read at position 0, in any case', () => {
    expect(leaderOf('>open:201')).toMatchObject({ mode: 'command', swallow: false, length: 1 })
    expect(leaderOf('p>why')).toMatchObject({ mode: 'prompt', swallow: true, length: 2 })
    expect(leaderOf('Prompt>why')).toMatchObject({ mode: 'prompt', length: 7 })
    expect(leaderOf('s>almanac')).toMatchObject({ mode: 'search', length: 2 })
    expect(leaderOf('search>x')).toMatchObject({ mode: 'search', length: 7 })
    expect(leaderOf(' >open')).toBeNull()
    expect(leaderOf('open:201')).toBeNull()
  })

  it('set the mode of the field, keeping the > and swallowing the others', () => {
    expect(readField('>open:201', 'search')).toMatchObject({ mode: 'command', body: 'open:201' })
    expect(readField('p>why is the sky blue', 'search')).toMatchObject({ mode: 'prompt', body: 'why is the sky blue' })
    expect(readField('hello', 'prompt')).toMatchObject({ mode: 'prompt', body: 'hello', leader: null })
    expect(readField('>p>why', 'search')).toMatchObject({ mode: 'prompt', body: 'why' })
    expect(readField('>s>', 'prompt')).toMatchObject({ mode: 'search', body: '' })
  })
})

describe('arguments', () => {
  it('are typed: addresses, numbers, words and quoted text', () => {
    expect(readArg('201a')).toMatchObject({ kind: 'address', num: 201, letter: 'a' })
    expect(readArg('207B')).toMatchObject({ kind: 'address', num: 207, letter: 'b' })
    expect(readArg('201-205')).toMatchObject({ kind: 'word' }) // no ranges (C96)
    expect(readArg('3')).toMatchObject({ kind: 'number', value: 3 })
    expect(readArg('200')).toMatchObject({ kind: 'number', value: 200 })
    expect(readArg('60%')).toMatchObject({ kind: 'percent', value: 60 })
    expect(readArg('60%%')).toMatchObject({ kind: 'word' })
    expect(readArg('Bottom')).toMatchObject({ kind: 'word', value: 'bottom', text: 'Bottom' })
    expect(readArg('"Field notes"')).toMatchObject({ kind: 'text', value: 'Field notes', closed: true })
    expect(readArg('“Field notes”')).toMatchObject({ kind: 'text', value: 'Field notes' })
    expect(readArg('"Field no')).toMatchObject({ kind: 'text', value: 'Field no', closed: false })
  })

  it('never read i, l or o as a branch letter', () => {
    expect(readArg('201i').kind).toBe('word')
    expect(readArg('201o').kind).toBe('word')
  })
})

describe('a command line', () => {
  it('reads a verb and what it takes', () => {
    const { commands } = parse('open:201a summary')
    expect(commands).toHaveLength(1)
    expect(commands[0]).toMatchObject({ verb: 'open', text: '201a summary', start: 0, end: 17 })
    expect(commands[0].args.map((a) => a.kind)).toEqual(['address', 'word'])
  })

  it('reads the verb in any case and allows a space after the colon', () => {
    expect(parse('Open: 201').commands[0]).toMatchObject({ verb: 'open', text: '201' })
  })

  it('keeps quoted names whole, straight or curly', () => {
    expect(parse('name:"Field notes, October"').commands[0].args).toMatchObject([{ kind: 'text', value: 'Field notes, October' }])
    expect(parse('name:“Field notes”').commands[0].text).toBe('Field notes')
  })

  it('joins items with commas into a list, with or without spaces', () => {
    for (const line of ['add:201,203,207b', 'add:201, 203, 207b', 'add:201 ,203, 207b']) {
      const [arg] = parse(line).commands[0].args
      expect(arg.kind, line).toBe('list')
      expect(arg.items.map((a) => a.text), line).toEqual(['201', '203', '207b'])
    }
  })

  it('takes several words where a verb needs them', () => {
    const [cmd] = parse('set:default haiku').commands
    expect(cmd.args.map((a) => a.value)).toEqual(['default', 'haiku'])
  })

  it('lets filters share a line', () => {
    const { commands } = parse('type:chat tag:research')
    expect(commands.map((c) => [c.verb, c.text])).toEqual([['type', 'chat'], ['tag', 'research']])
  })

  it('keeps the rest of the line as text for a verb that takes text', () => {
    const { commands } = parse('tell:keep it short, and see type:chat at https://example.org')
    expect(commands).toHaveLength(1)
    expect(commands[0].text).toBe('keep it short, and see type:chat at https://example.org')
    expect(commands[0].args.length).toBeGreaterThan(0)
  })

  it('reads the arguments of a verb that keeps the rest, for its action', () => {
    const [cmd] = parse('note:203 "Try it without the ending"').commands
    expect(cmd.args.map((a) => a.kind)).toEqual(['address', 'text'])
    expect(cmd.raw).toBe('203 "Try it without the ending"')
  })

  it('reads a minus in front of a verb, for filters that leave things out', () => {
    const { commands } = parse('-tag:research type:chat')
    expect(commands.map((c) => [c.verb, c.minus])).toEqual([['tag', true], ['type', false]])
  })

  it('keeps what followed the colon as typed', () => {
    expect(parse('name: "Field notes" ').commands[0]).toMatchObject({ raw: '"Field notes"', text: 'Field notes' })
  })

  it('starts a command at a mistyped verb too, so it can be answered', () => {
    expect(parse('bar:bottom opne:207').commands.map((c) => c.verb)).toEqual(['bar', 'opne'])
  })

  it('does not take a link for a verb', () => {
    const { commands } = parse('open:201 https://example.org')
    expect(commands).toHaveLength(1)
    expect(commands[0].args.map((a) => a.text)).toEqual(['201', 'https://example.org'])
  })

  it('reads an unknown verb at the start, so it can be answered', () => {
    expect(parse('rename:"x"').commands[0]).toMatchObject({ verb: 'rename', text: 'x' })
    expect(parse('frobnicate:201').commands[0].verb).toBe('frobnicate')
  })

  it('keeps words typed before any verb apart', () => {
    expect(parse('almanac').loose).toBe('almanac')
    expect(parse('almanac').commands).toEqual([])
    expect(parse('').commands).toEqual([])
  })

  it('reads ? and help, with or without a topic', () => {
    expect(parse('?').help).toEqual({ topic: null })
    expect(parse(' ? ').help).toEqual({ topic: null })
    expect(parse('?name').help).toEqual({ topic: 'name' })
    expect(parse('help').help).toEqual({ topic: null })
    expect(parse('help:').help).toEqual({ topic: null })
    expect(parse('Help:bar').help).toEqual({ topic: 'bar' })
    expect(parse('helper:on').help).toBeNull()
  })
})

describe('a line shaped like a key', () => {
  it('is caught whatever the verb', () => {
    expect(shapedLikeKey('api:anthropic sk-ant-api03-abc')).toBe(true)
    expect(shapedLikeKey('sk-proj-xyz')).toBe(true)
    expect(shapedLikeKey('api:mistral 8fQ2kLmN0pR4sT6uV8wX0yZ2aB4cD6eF')).toBe(true)
    expect(shapedLikeKey('note:3f9a1c7e5b2d4f6a8c0e1b3d5f7a9c2e')).toBe(true)
  })

  it('leaves ordinary commands alone', () => {
    expect(shapedLikeKey('tagadd:risk-analysis')).toBe(false)
    expect(shapedLikeKey('tell:ask-me-again-when-the-numbers-are-in')).toBe(false)
    expect(shapedLikeKey('tagadd:2026-10-20-meeting-notes-for-the-team')).toBe(false)
    expect(shapedLikeKey('open:201a summary')).toBe(false)
    expect(shapedLikeKey('set:input web search on')).toBe(false)
  })
})
