import { describe, it, expect } from 'vitest'
import { GUIDE, optionOf, guideAfter, verbOf } from './labGuide'
import { planNewRoom } from './lab'

// The guide (stage 13, piece 4; C244 (d), (e)).

const layouts = [{ key: 'three-panel', name: 'Three panels' }, { key: 'document-centric', name: 'Document in the middle' }]
const themes = [{ key: 'deep-calm', name: 'Deep calm' }]
const mode = {
  layout: { ref: 'three-panel@1.0' }, scheme: { ref: 'parliament@1.0' }, deviceClass: 'visual-pointer', meta: { name: '' },
  components: [{ ref: 'messages@^1.0' }, { ref: 'input@^1.0' }, { ref: 'notes@^1.0' }],
}
const at = (q, o) => optionOf(GUIDE.find((x) => x.id === q).options.find((x) => x.id === o), { mode, layouts, themes, nameWords: 'Essay room' })

describe('the guide (C244 (d))', () => {
  it('asks five questions, the web search one waiting for piece 6', () => {
    expect(GUIDE.map((q) => q.verb)).toEqual(['layout', 'device', 'add', 'theme', 'name'])
  })
  it('writes each answer as a command, and knows one that is so already', () => {
    expect(at('for', 'writing')).toEqual({ command: 'layout:"Document in the middle"', already: false })
    expect(at('for', 'talking')).toEqual({ command: 'layout:"Three panels"', already: true })
    expect(at('where', 'desk').already).toBe(true)
    expect(at('where', 'phone')).toEqual({ command: 'device:mobile', already: false })
    expect(at('reach', 'keywordsNotes')).toEqual({ command: 'add:keywords, notes', already: false })
    expect(at('feel', 'deep-calm')).toEqual({ command: 'theme:"Deep calm"', already: false })
    expect(at('name', 'essay')).toEqual({ command: 'name:"Essay room"', already: false })
    expect(at('name', 'own').command).toBe('name:"')
  })
})

describe('how the guide moves (C244 (e))', () => {
  it('moves on when its question\'s command runs on its room, and not otherwise', () => {
    const g = { room: 'mode_1', step: 0 }
    expect(verbOf('>layout:"Three panels"')).toBe('layout')
    expect(guideAfter(g, 'mode_1', 'layout:"Document in the middle"')).toEqual({ room: 'mode_1', step: 1 })
    expect(guideAfter(g, 'mode_1', 'theme:"Deep calm"')).toBe(g)
    expect(guideAfter(g, 'mode_2', 'layout:"Three panels"')).toBe(g)
    expect(guideAfter(null, 'mode_1', 'layout:"Three panels"')).toBeNull()
  })
  it('comes with new:room guided', () => {
    expect(planNewRoom(true)).toEqual({ says: { message: 'newRoomGuided' }, act: { kind: 'newRoom', guided: true } })
  })
})
