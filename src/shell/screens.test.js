import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { numberScreens, screensNow, readScreens, placeOn, popDisplayLine, mustAsk } from './screens'
import { mapOf, mapFoot, savedNow, moveCommand } from './screensMap'
import { shipped } from './arrangement'
import { savedOf } from '../lib/savedArrangements'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { messages as en } from '../locales/en/messages.mjs'

const i18n = setupI18n({ locale: 'en', messages: { en } })
const laptop = { isPrimary: true, left: 0, top: 0, width: 1512, height: 982, availLeft: 0, availTop: 25, availWidth: 1512, availHeight: 950 }
const big = { isPrimary: false, left: 1512, top: -400, width: 2560, height: 1440, availLeft: 1512, availTop: -400, availWidth: 2560, availHeight: 1415 }
const side = { isPrimary: false, left: -1920, top: 0, width: 1920, height: 1080 }

describe('screens, numbered (C259 (c))', () => {
  it('the main screen first, the rest left to right', () => {
    const list = numberScreens([big, side, laptop], laptop)
    expect(list.map((s) => [s.n, s.width, s.current])).toEqual([[1, 1512, true], [2, 1920, false], [3, 2560, false]])
  })
  it('knows what it can without asking, and reads the rest once allowed', async () => {
    const g = { getScreenDetails: async () => ({ screens: [laptop, big], currentScreen: big }), screen: { isExtended: true },
      navigator: { permissions: { query: async () => ({ state: 'prompt' }) } } }
    expect(await screensNow(g)).toEqual({ can: true, extended: true, width: null, permission: 'prompt' })
    const got = await readScreens(null, g)
    expect(got.list.map((s) => [s.n, s.current])).toEqual([[1, false], [2, true]])
    expect(await screensNow({ screen: { width: 1512 } })).toEqual({ can: false, extended: false, width: 1512, permission: null })
    expect(await readScreens(null, { getScreenDetails: async () => { throw new Error('refused') } })).toBeNull()
  })
  it('places a window at the top of its screen, or at its edge', () => {
    const list = numberScreens([laptop, big], laptop)
    expect(placeOn(list, 2)).toEqual({ left: 1512 + 900, top: -400 })
    expect(placeOn(list, 2, 'right')).toEqual({ left: 1512 + 2560 - 760, top: -400 })
    expect(placeOn(list, 3)).toBeNull()
  })
})

describe('pop:… display 2 on the Enter line (C259 (d) to (f))', () => {
  const line = (displays) => {
    const p = preview('>pop:library display 2', { mode: 'command', arrangement: { ...shipped('almanac'), columns: [['almanac'], ['library']] }, screens: { displays } })
    return say(i18n, p.says.message, p.says.values)
  }
  const list = numberScreens([laptop, big], laptop)
  it('says what happens on this computer before Enter', () => {
    expect(line({ can: true, extended: true, permission: 'granted', list })).toBe('Enter puts Library in its own window on display 2')
    expect(line({ can: true, extended: true, permission: 'prompt', list: null })).toBe('Enter puts Library in its own window on display 2. The browser asks once whether Parliament may place windows on your screens')
    expect(line({ can: true, extended: false, permission: 'prompt', list: null })).toBe('Display 2 is not connected. Enter opens Library in its own window here')
    expect(line({ can: false, extended: false, permission: null, list: null })).toBe('This browser cannot place windows on other screens. Enter opens Library in its own window here')
    expect(line({ can: true, extended: true, permission: 'denied', list: null })).toBe('The browser was told not to let Parliament place windows. Enter opens Library in its own window here')
    expect(line({ can: true, extended: false, permission: 'denied', list: null })).toBe('Display 2 is not connected. Enter opens Library in its own window here')
    expect(popDisplayLine({ message: 'popDisplay', values: { board: 'library', display: 3 } }, { can: true, extended: true, permission: 'granted', list }).message).toBe('popDisplayNone')
  })
  it('asks only once, and only where it can', () => {
    expect(mustAsk({ can: true, extended: true, permission: 'prompt', list: null })).toBe(true)
    expect(mustAsk({ can: true, extended: true, permission: 'granted', list })).toBe(false)
    expect(mustAsk({ can: true, extended: true, permission: 'denied', list: null })).toBe(false)
    expect(mustAsk({ can: true, extended: false, permission: 'prompt', list: null })).toBe(false)
  })
})

describe('the map (C259 (a), (b))', () => {
  const list = numberScreens([laptop, big], laptop)
  const a = { ...shipped('almanac'), columns: [['library'], ['room']], popped: [], addressed: 'room' }
  it('draws each screen with the boards and windows on it', () => {
    const map = mapOf({ ...a, popped: [{ board: 'collection', display: 2, side: null, from: 2 }] }, null, { can: true, extended: true, list })
    expect(map.map((s) => [s.n, s.items.map((it) => [it.board, it.window, it.addressed])])).toEqual([
      [1, [['library', false, false], ['room', false, true]]],
      [2, [['collection', true, false]]],
    ])
  })
  it('shows what the line typed would move, before Enter', () => {
    const next = { ...a, columns: [['room']], popped: [{ board: 'library', display: 2, side: null, from: 0 }], addressed: 'library' }
    const map = mapOf(a, next, { can: true, extended: true, list })
    expect(map[0].items[0]).toMatchObject({ board: 'library', mark: 'leaving', to: { n: 2, current: false, window: true } })
    expect(map[1].items).toEqual([{ board: 'library', addressed: true, mark: 'ghost', window: true, win: 'library' }])
  })
  it('before the browser says more, this screen and another, unnumbered', () => {
    const map = mapOf({ ...a, popped: [{ board: 'collection', display: 2, side: null, from: 2 }] }, null, { can: true, extended: true, list: null })
    expect(map.map((s) => [s.key, s.n, s.items.map((it) => it.board)])).toEqual([['here', null, ['library', 'room']], ['other', null, ['collection']]])
    // A window for a screen not here sits on this one (C259 (e)).
    expect(mapOf({ ...a, popped: [{ board: 'collection', display: 3, side: null, from: 2 }] }, null, { can: true, extended: true, list })[0].items.map((it) => it.board)).toContain('collection')
  })
  it('says at its foot what this browser and computer allow', () => {
    expect(mapFoot({ can: false })).toBe('cannot')
    expect(mapFoot({ can: true, extended: true, permission: 'denied' })).toBe('refused')
    expect(mapFoot({ can: true, extended: false, permission: 'denied' })).toBe('one')
    expect(mapFoot({ can: true, extended: false })).toBe('one')
    expect(mapFoot({ can: true, extended: true, list })).toBeNull()
  })
  it('names the saved arrangement the screen is, and writes the command a board moves by', () => {
    const desk = { ...savedOf(a, 'x', 'Review desk') }
    expect(savedNow(a, [desk])?.name).toBe('Review desk')
    expect(savedNow({ ...a, addressed: 'library' }, [desk])).toBeNull()
    const screens = mapOf(a, null, { can: true, extended: true, list })
    expect(moveCommand({ board: 'library', window: false }, 'library', screens)).toBe('pop:library display 2')
    expect(moveCommand({ board: 'library', window: true }, 'library', screens)).toBe('pop:back library')
  })
})
