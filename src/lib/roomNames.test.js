import { describe, it, expect } from 'vitest'
import { roomName, cleanRoomName, ROOM_NAME_MAX } from './roomNames'

describe('what a room is called (C40, C90)', () => {
  it('a template\'s name is the template, to be shown in the reader\'s language', () => {
    expect(roomName({ meta: { name: 'Writing Studio', template: 'writing-studio@1.0' } })).toEqual({ template: 'writing-studio@1.0' })
    // Rooms made before the template was recorded are known by the name.
    expect(roomName({ meta: { name: 'Drafting Desk' } })).toEqual({ template: 'drafting-desk@1.0' })
  })

  it('a name its owner gave it is theirs, even in a template\'s room', () => {
    expect(roomName({ meta: { name: 'Barn owls', template: 'writing-studio@1.0' } })).toEqual({ own: 'Barn owls' })
    expect(roomName({ meta: { name: '  Murano  ' } })).toEqual({ own: 'Murano' })
  })

  it('no name, or the stored "New room", is no name', () => {
    expect(roomName({ meta: { name: '' } })).toBeNull()
    expect(roomName({ meta: { name: 'New room' } })).toBeNull()
    expect(roomName({ meta: { name: '', template: 'quiet-room@1.0' } })).toEqual({ template: 'quiet-room@1.0' })
    expect(roomName(null)).toBeNull()
  })

  it('keeps a typed name tidy, and refuses an empty or overlong one', () => {
    expect(cleanRoomName('  Barn   owls ')).toEqual({ name: 'Barn owls' })
    expect(cleanRoomName('   ')).toEqual({ error: 'empty' })
    expect(cleanRoomName('x'.repeat(ROOM_NAME_MAX + 1))).toEqual({ error: 'long' })
    expect(cleanRoomName('ü'.repeat(ROOM_NAME_MAX))).toEqual({ name: 'ü'.repeat(ROOM_NAME_MAX) })
  })
})
