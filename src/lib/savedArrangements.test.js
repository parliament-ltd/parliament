import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { shipped } from '../shell/arrangement'
import { cleanArrangement } from './arrangements'
import { savedOf, spaceFrom, findSaved } from './savedArrangements'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { messages as en } from '../locales/en/messages.mjs'

// Saved arrangements (stage 14, piece 3; C257).

const i18n = setupI18n({ locale: 'en', messages: { en } })
const space = () => ({ ...shipped('almanac'), columns: [['room'], ['collection']], popped: [{ board: 'library', display: 2, side: 'right', from: 2 }], context: { room: 'c1', collection: 'col_1' }, addressed: 'room', widths: { room: 2 } })
const desk = cleanArrangement(savedOf(space(), 'abc', 'Review desk'))
const at = (value, { a = space(), saved = [desk], rows = [] } = {}) => {
  const p = preview(value, { mode: 'command', arrangement: a, screens: { arrangements: { saved }, roomChat: 'c9', records: { rows } } })
  return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '' }
}

describe('a saved arrangement, kept (C257 (a), (d))', () => {
  it('keeps the boards, windows, widths and what boards show, not which chats rooms show', () => {
    expect(desk).toMatchObject({ id: 'saved:abc', name: 'Review desk', columns: [['room'], ['collection']], widths: { room: 2 }, context: { collection: 'col_1' } })
    expect(desk.popped).toEqual([{ board: 'library', display: 2, side: 'right', from: 2 }])
    expect(desk.context.room).toBeUndefined()
  })
  it('reads only with a name, and a backup keeps reading the rest', () => {
    expect(cleanArrangement({ ...desk, name: '' })).toBeNull()
    expect(cleanArrangement({ ...desk, name: 'x'.repeat(81) })).toBeNull()
    expect(cleanArrangement({ ...shipped('almanac'), id: 'space' }).name).toBeUndefined()
  })
  it('switches with the chat the bar points at, or one named, in its room', () => {
    expect(spaceFrom(desk, space(), 'c9').context).toEqual({ collection: 'col_1', room: 'c9' })
    expect(findSaved([desk], 'review').found.name).toBe('Review desk')
  })
})

describe('arrange: on the Enter line (C257 (b))', () => {
  it('saves under a name, or says it replaces one', () => {
    const p = at('>arrange:save "Writing desk"')
    expect(p.text).toBe('Enter keeps what is on screen as Writing desk, windows and their screens included. The chats in rooms are not kept')
    expect(p.act).toMatchObject({ kind: 'arrangeSave', record: { name: 'Writing desk' }, before: null })
    expect(at('>arrange:save "review desk"')).toMatchObject({ text: 'Enter keeps what is on screen as review desk, in place of the one saved under that name', act: { record: { id: 'saved:abc' }, before: { id: 'saved:abc' } } })
  })
  it('switches by name or start, with a number in its room', () => {
    const p = at('>arrange:"Review"')
    expect(p.text).toBe('Enter switches to Review desk. undo: brings back the screen as it is')
    expect(p.next).toMatchObject({ id: 'space', columns: [['room'], ['collection']], context: { room: 'c9' } })
    expect(at('>arrange:"Review desk" 207', { rows: [{ kind: 'chat', num: 207, chatId: 'c207' }] }).next.context.room).toBe('c207')
    expect(at('>arrange:"Nowhere"').text).toBe('No arrangement is called Nowhere. Yours are Review desk')
  })
  it('lists them, and stays out of the Lab', () => {
    expect(at('>arrange:').text).toBe('Your arrangements: Review desk. arrange:"name" switches to one')
    expect(at('>arrange:', { saved: [] }).text).toBe('No arrangement is saved yet. arrange:save "a name" keeps what is on screen')
    expect(at('>arrange:"Review desk"', { a: { ...space(), lab: { columns: [['almanac']], popped: [], addressed: 'almanac', bar: { at: 'top', side: 'center', popped: false } } } }).text).toBe('arrange: works outside the Lab. done: leaves it first')
  })
  it('is forgotten by name, undo: bringing it back', () => {
    expect(at('>forget:"Review desk"')).toMatchObject({ text: 'Enter forgets the arrangement Review desk. undo: brings it back', act: { kind: 'arrangeForget', id: 'saved:abc' } })
    expect(at('>forget:"Review desk" arrangement').act.kind).toBe('arrangeForget')
  })
})
