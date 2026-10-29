import { describe, it, expect, afterEach } from 'vitest'
import { crosses, pressed, moved, lifted, keyed, isReleased, release, restore, onRelease, watchAcross } from './across'

// Editors stand for their root elements; null for text that is no editor's.
const PROMPT = { name: 'the prompt alone' }
const REPLY = { name: 'a reply in a tab' }
const PAIR = { name: 'a prompt and its reply, one editor' }

const press = (over = {}) => pressed({
  released: false, primary: true, mouse: true, inChat: true, onControl: false,
  shift: false, anchorInChat: false, anchorHost: null, targetHost: PROMPT, ...over,
})

describe('a selection across cards (C280 (d))', () => {
  afterEach(() => restore())

  it('crosses when a drag leaves the editor it began in, or enters one from outside', () => {
    expect(crosses(PROMPT, REPLY)).toBe(true)
    expect(crosses(PROMPT, null)).toBe(true)
    expect(crosses(null, REPLY)).toBe(true)
    expect(crosses(PAIR, PAIR)).toBe(false)
    expect(crosses(null, null)).toBe(false)
  })

  it('watches a press of the main mouse button on words in the chat', () => {
    expect(press()).toEqual({ act: null, drag: { host: PROMPT } })
    expect(press({ targetHost: null })).toEqual({ act: null, drag: { host: null } })
  })

  it('leaves alone a press on a control, outside the chat, by a finger, or of another button', () => {
    for (const over of [{ onControl: true }, { inChat: false }, { mouse: false }, { primary: false }]) {
      expect(press(over).drag).toBe(null)
    }
  })

  it('gives the editors back on any press, before it does anything', () => {
    expect(press({ released: true }).act).toBe('restore')
    expect(press({ released: true, inChat: false })).toEqual({ act: 'restore', drag: null })
    expect(press({ released: true, onControl: true }).act).toBe('restore')
  })

  it('runs a selection on into another card with Shift and a click', () => {
    expect(press({ shift: true, anchorInChat: true, anchorHost: PROMPT, targetHost: REPLY })).toEqual({ act: 'release', drag: { host: PROMPT } })
    expect(press({ shift: true, anchorInChat: true, anchorHost: null, targetHost: PROMPT }).act).toBe('release')
  })

  it('leaves Shift and a click inside one editor to the editor, as before', () => {
    expect(press({ shift: true, anchorInChat: true, anchorHost: PAIR, targetHost: PAIR })).toEqual({ act: null, drag: { host: PAIR } })
    expect(press({ shift: true, anchorInChat: false, anchorHost: null, targetHost: PROMPT }).act).toBe(null)
  })

  it('lets go when a held drag reaches another card in the chat', () => {
    const drag = { host: PROMPT }
    expect(moved({ drag, released: false, held: true, inChat: true, overHost: REPLY })).toBe('release')
    expect(moved({ drag, released: false, held: true, inChat: true, overHost: null })).toBe('release')
    expect(moved({ drag: { host: null }, released: false, held: true, inChat: true, overHost: PROMPT })).toBe('release')
  })

  it('keeps a drag inside one editor an editor, so a prompt and its reply still join (C214)', () => {
    expect(moved({ drag: { host: PAIR }, released: false, held: true, inChat: true, overHost: PAIR })).toBe(null)
  })

  it('does nothing for a move with no drag, the button up, outside the chat, or already let go', () => {
    const drag = { host: PROMPT }
    expect(moved({ drag: null, released: false, held: true, inChat: true, overHost: REPLY })).toBe(null)
    expect(moved({ drag, released: false, held: false, inChat: true, overHost: REPLY })).toBe(null)
    expect(moved({ drag, released: false, held: true, inChat: false, overHost: REPLY })).toBe(null)
    expect(moved({ drag, released: true, held: true, inChat: true, overHost: REPLY })).toBe(null)
  })

  it('gives a selection that ends inside one editor back to it, to strike or ask about', () => {
    expect(lifted({ drag: { host: REPLY }, released: true, anchorHost: REPLY, focusHost: REPLY })).toBe('restore')
  })

  it('keeps the editors let go while the selection runs across cards, or lies outside them', () => {
    expect(lifted({ drag: { host: PROMPT }, released: true, anchorHost: PROMPT, focusHost: REPLY })).toBe(null)
    expect(lifted({ drag: { host: PROMPT }, released: true, anchorHost: null, focusHost: null })).toBe(null)
    expect(lifted({ drag: { host: PROMPT }, released: false, anchorHost: PROMPT, focusHost: PROMPT })).toBe(null)
    expect(lifted({ drag: null, released: true, anchorHost: PROMPT, focusHost: PROMPT })).toBe(null)
  })

  it('gives the editors back on a key, so Tab reaches them again', () => {
    for (const key of ['Tab', 'a', 'Escape', 'ArrowDown', 'Enter', 'Backspace']) expect(keyed({ released: true, key })).toBe('restore')
    expect(keyed({ released: true, key: 'x', ctrl: true, shift: true })).toBe('restore')
    expect(keyed({ released: true, key: 'k', ctrl: true })).toBe('restore')
  })

  it('keeps them let go for a modifier, a copy, or Shift extending the selection', () => {
    for (const key of ['Shift', 'Control', 'Alt', 'Meta']) expect(keyed({ released: true, key })).toBe(null)
    expect(keyed({ released: true, key: 'c', ctrl: true })).toBe(null)
    expect(keyed({ released: true, key: 'C', meta: true })).toBe(null)
    expect(keyed({ released: true, key: 'Insert', ctrl: true })).toBe(null)
    for (const key of ['ArrowRight', 'ArrowUp', 'End', 'PageDown']) expect(keyed({ released: true, key, shift: true })).toBe(null)
  })

  it('does nothing on a key while the editors are editors', () => {
    expect(keyed({ released: false, key: 'Tab' })).toBe(null)
  })

  it('tells each editor when it lets go and when it comes back, once each', () => {
    const told = []
    const stop = onRelease((on) => told.push(on))
    expect(isReleased()).toBe(false)
    release()
    release()
    expect(isReleased()).toBe(true)
    restore()
    restore()
    stop()
    release()
    expect(told).toEqual([true, false])
  })

  it('watches nothing without a page', () => {
    expect(watchAcross(null)()).toBe(undefined)
  })
})
