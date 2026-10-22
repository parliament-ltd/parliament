import { describe, it, expect } from 'vitest'
import { initialField, fieldReducer, fieldValue } from './field'

// Types each value in turn, as the input reports it after each edit.
const typing = (state, ...values) => values.reduce((s, value) => fieldReducer(s, { type: 'input', value }), state)
const act = (state, ...types) => types.reduce((s, type) => fieldReducer(s, { type }), state)
const almanac = () => act(initialField('search'), 'focus')
const room = () => act(initialField('prompt'), 'focus')

describe('the leaders', () => {
  it('> enters command mode and stays in the field', () => {
    const s = typing(almanac(), '>', '>open:201')
    expect(s.mode).toBe('command')
    expect(fieldValue(s)).toBe('>open:201')
    expect(s.text.command).toBe('open:201')
  })

  it('p> and s> are swallowed', () => {
    const p = typing(almanac(), 'p', 'p>')
    expect(p.mode).toBe('prompt')
    expect(fieldValue(p)).toBe('')
    const s = typing(room(), 's', 's>')
    expect(s.mode).toBe('search')
    expect(fieldValue(s)).toBe('')
  })

  it('switch from command mode too: >p> and >s>', () => {
    expect(typing(almanac(), '>', '>p', '>p>').mode).toBe('prompt')
    expect(typing(room(), '>', '>s', '>s>').mode).toBe('search')
  })

  it('take a pasted line with them', () => {
    const s = typing(almanac(), '>open:207')
    expect(s).toMatchObject({ mode: 'command', text: { command: 'open:207' } })
    expect(typing(almanac(), 'p>why is the sky blue').text.prompt).toBe('why is the sky blue')
  })

  it('swallow a repeated leader in its own mode', () => {
    expect(fieldValue(typing(room(), 'p>hello'))).toBe('hello')
  })
})

describe('what was typed stays with its mode (C44)', () => {
  it('so typing > again brings back an unfinished command', () => {
    let s = typing(almanac(), 'water', '>water')
    // A leader typed in front of a search leaves the search behind.
    expect(s).toMatchObject({ mode: 'command', text: { search: 'water', command: '' } })
    s = typing(s, '>op', '>open:2')
    s = act(s, 'escape')
    expect(s.mode).toBe('search')
    expect(fieldValue(s)).toBe('water')
    s = typing(s, '>water')
    expect(fieldValue(s)).toBe('>open:2')
  })
})

describe('Escape (A3)', () => {
  it('never deletes text, and takes the field to the mode the screen rests in', () => {
    let s = typing(room(), 'draft of a question', '>', '>bar:bot')
    s = act(s, 'escape')
    expect(s.mode).toBe('prompt')
    expect(fieldValue(s)).toBe('draft of a question')
    expect(s.text.command).toBe('bar:bot')
    expect(s.focused).toBe(true)
  })

  it('in the resting mode, returns you to what you were doing', () => {
    const s = act(almanac(), 'escape')
    expect(s.focused).toBe(false)
    expect(s.minimised).toBe(false)
  })

  it('folds the field again if you were editing a reply', () => {
    let s = act(initialField('prompt'), 'editReply')
    expect(s.minimised).toBe(true)
    s = act(s, 'open')
    expect(s).toMatchObject({ minimised: false, focused: true })
    s = act(s, 'escape')
    expect(s).toMatchObject({ minimised: true, focused: false })
  })

  it('does nothing when the field is out of the way', () => {
    const s = initialField('search')
    expect(act(s, 'escape')).toBe(s)
  })
})

describe('Backspace', () => {
  it('deleting the > leaves command mode', () => {
    const s = typing(almanac(), '>', '')
    expect(s.mode).toBe('search')
    expect(fieldValue(s)).toBe('')
  })

  it('what is left after the > becomes the resting mode\'s text', () => {
    const s = typing(almanac(), '>water', 'water')
    expect(s).toMatchObject({ mode: 'search', text: { search: 'water', command: '' } })
  })

  it('in an empty prompt does nothing, since the p> is gone already', () => {
    const s = typing(room(), '')
    expect(s.mode).toBe('prompt')
  })
})

describe('after a command runs', () => {
  it('the field resets to > and keeps focus', () => {
    const s = act(typing(almanac(), '>bar:bottom'), 'ran')
    expect(fieldValue(s)).toBe('>')
    expect(s).toMatchObject({ mode: 'command', focused: true })
  })

  it('turns to prompt mode where the command asks for it (focus:, W §7)', () => {
    const s = fieldReducer(typing(almanac(), '>focus:'), { type: 'ran', to: 'prompt' })
    expect(s).toMatchObject({ mode: 'prompt', focused: true })
    expect(s.text.command).toBe('')
  })
})

describe('the screen changes', () => {
  it('the resting mode follows it, unless a command is being typed', () => {
    let s = act(almanac(), 'focus')
    s = fieldReducer(s, { type: 'surface', resting: 'prompt' })
    expect(s).toMatchObject({ mode: 'prompt', resting: 'prompt' })
    s = typing(s, '>open:2')
    s = fieldReducer(s, { type: 'surface', resting: 'search' })
    expect(s).toMatchObject({ mode: 'command', resting: 'search' })
  })
})

describe('the folded circle (C108)', () => {
  it('hovering opens it without focus, and it folds when the pointer leaves', () => {
    let s = act(initialField('prompt'), 'editReply', 'hover')
    expect(s).toMatchObject({ minimised: false, peek: true, focused: false })
    s = act(s, 'leave')
    expect(s).toMatchObject({ minimised: true, peek: false })
  })

  it('stays open once something is typed', () => {
    let s = act(initialField('prompt'), 'editReply', 'hover', 'focus')
    s = typing(s, 'a thought')
    s = act(s, 'leave')
    expect(s.minimised).toBe(false)
  })

  it('opens in the mode it was left in', () => {
    let s = typing(room(), '>', '>pop:')
    s = act(s, 'editReply', 'open')
    expect(fieldValue(s)).toBe('>pop:')
  })
})

describe('finishing an edit', () => {
  it('opens the field again, and does nothing when no reply was being edited', () => {
    const s = act(initialField('prompt'), 'editReply', 'doneEditing')
    expect(s).toMatchObject({ editingReply: false, minimised: false })
    const t = initialField('prompt')
    expect(act(t, 'doneEditing')).toBe(t)
  })
})

describe('clearing the search on Records (C132 (c))', () => {
  it('empties the search and nothing else', () => {
    let s = fieldReducer(initialField('search'), { type: 'input', value: 'barn owl' })
    s = fieldReducer(s, { type: 'input', value: '>clear:filters' })
    const t = act(s, 'clearSearch')
    expect(t.text).toEqual({ search: '', command: 'clear:filters', prompt: '' })
    expect(t.mode).toBe('command')
    expect(act(t, 'clearSearch')).toBe(t)
  })
})
