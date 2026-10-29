import { describe, it, expect } from 'vitest'
import { initialField, fieldReducer, fieldValue, shownValue, showsHeld, dropsHeld } from './field'

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

describe('a saved search opened on Records (C140)', () => {
  it('puts its words in the search and changes nothing else', () => {
    const s = fieldReducer(initialField('search'), { type: 'input', value: '>save:"x"' })
    const t = fieldReducer(s, { type: 'setSearch', value: 'barn owl' })
    expect(t.text).toEqual({ search: 'barn owl', command: 'save:"x"', prompt: '' })
    expect(t.mode).toBe('command')
    expect(fieldReducer(t, { type: 'setSearch', value: 'barn owl' })).toBe(t)
  })
})

describe('a prompt written in from a room (stage 11, piece 2; C214 (b))', () => {
  it('turns the field to a prompt with those words, opened, and keeps what was typed elsewhere', () => {
    let s = fieldReducer(initialField('prompt'), { type: 'input', value: '>open:records' })
    s = { ...s, minimised: true, editingReply: true }
    s = fieldReducer(s, { type: 'draft', value: 'Write the opening. It had not gone out in a century.' })
    expect(s.mode).toBe('prompt')
    expect(fieldValue(s)).toBe('Write the opening. It had not gone out in a century.')
    expect([s.minimised, s.editingReply, s.focused]).toEqual([false, false, true])
    expect(s.text.command).toBe('open:records')
  })
})

describe('a prompt edited in the chat, held as a placeholder (Stefan, 29 October)', () => {
  const words = 'Write the opening. It had not gone out in a century, and the whole of the reply after it, which can be a lot.'
  const held = () => fieldReducer(initialField('prompt'), { type: 'draft', value: words })

  it('holds the words for Enter and shows the placeholder in their place', () => {
    const s = held()
    expect(showsHeld(s)).toBe(true)
    expect(shownValue(s)).toBe('')
    // What Enter sends and the Enter line reads: the words as they are.
    expect(fieldValue(s)).toBe(words)
    expect(s.text.prompt).toBe(words)
  })

  it('takes what is typed in place of the held words, and drops them', () => {
    const s = held()
    expect(dropsHeld(s, 'H')).toBe(true)
    const t = typing(s, 'H', 'Ho', 'How tall')
    expect([t.mode, t.text.prompt, t.held, shownValue(t)]).toEqual(['prompt', 'How tall', false, 'How tall'])
    // A paste does the same.
    expect(fieldReducer(s, { type: 'input', value: 'pasted words' }).text.prompt).toBe('pasted words')
  })

  it('keeps them held through a command, as typed text stays with its mode, and shows them again after', () => {
    const s = held()
    expect(dropsHeld(s, '>')).toBe(false)
    let t = typing(s, '>', '>api:')
    expect([t.mode, t.text.command, t.text.prompt, showsHeld(t)]).toEqual(['command', 'api:', words, false])
    t = fieldReducer({ ...t, focused: true }, { type: 'escape' })
    expect([t.mode, showsHeld(t), fieldValue(t)]).toEqual(['prompt', true, words])
    // Written from outside, as a step's command is: held too.
    expect(fieldReducer(s, { type: 'input', value: '>api:' }).text.prompt).toBe(words)
  })

  it('clears them with Escape, and with Backspace or Delete (drop), and nothing else', () => {
    const s = { ...held(), focused: true }
    const t = fieldReducer(s, { type: 'escape' })
    expect([t.mode, t.text.prompt, t.held, t.focused]).toEqual(['prompt', '', false, true])
    // The next Escape does what Escape does.
    expect(fieldReducer(t, { type: 'escape' }).focused).toBe(false)
    expect(fieldReducer(s, { type: 'drop' })).toMatchObject({ held: false, text: { prompt: '' } })
    const plain = typing(initialField('prompt'), 'my words')
    expect(fieldReducer(plain, { type: 'drop' })).toBe(plain)
  })

  it('lets go once sent, and a draft again holds the new words', () => {
    const s = fieldReducer(held(), { type: 'sent' })
    expect([s.text.prompt, s.held, showsHeld(s)]).toEqual(['', false, false])
    const again = fieldReducer(held(), { type: 'draft', value: 'Other words' })
    expect([showsHeld(again), fieldValue(again)]).toEqual([true, 'Other words'])
    // Nothing to hold, nothing held.
    expect(showsHeld(fieldReducer(initialField('prompt'), { type: 'draft', value: '' }))).toBe(false)
  })

  it('never holds what was typed in the field itself', () => {
    const s = typing(initialField('prompt'), 'typed here')
    expect([showsHeld(s), shownValue(s), dropsHeld(s, 'typed here!')]).toEqual([false, 'typed here', false])
  })
})
