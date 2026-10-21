import { describe, it, expect } from 'vitest'
import { catalogueItems, SHELVES, LIBRARY_BOARDS } from './catalogue'

const blocks = [
  { name: 'messages', displayName: 'Messages', description: 'The conversation.', surfaces: ['room'] },
  { name: 'input', displayName: 'Input', description: 'The message box.', surfaces: ['room'] },
  { name: 'web-search', displayName: 'Web search', description: 'Names a provider.', surfaces: ['room'] },
  { name: 'chats', displayName: 'Chats', description: 'A homepage list.', surfaces: ['homepage'] },
]
const layouts = [
  { name: 'three-panel', version: '1.0', displayName: 'Three-panel', scope: 'room', slots: [{ id: 'left-rail' }, { id: 'msg-area' }, { id: 'input-dock' }] },
  { name: 'stacked-sections', version: '1.0', displayName: 'Stacked sections', scope: 'homepage', slots: [{ id: 'a' }] },
]
const storedLayouts = [
  { id: 'three-panel@1.0', displayName: 'Three-panel', description: 'Dual sidebars.', status: 'available', scopes: ['room'] },
  { id: 'split-view@1.0', displayName: 'Split view', description: 'Two panes.', status: 'coming-soon', scopes: ['room'] },
]
const templates = [
  { id: 'writing-studio@1.0', scope: 'room', status: 'available', description: 'A versatile chat.', layout: { ref: 'three-panel@^1.0' }, scheme: { ref: 'parliament@1.0' },
    components: [{ ref: 'messages@^1.0' }, { ref: 'input@^1.0' }, { ref: 'web-search@^1.0' }] },
  { id: 'kingfisher@1.0', scope: 'room', status: 'coming-soon', description: 'Later.', components: [] },
]
const themes = [{ id: 'parliament@1.0', displayName: 'Parliament Default', description: 'Warm white.' }]
const modes = [
  { id: 'mode_1', scope: 'room', meta: { name: 'Owl desk' }, layout: { ref: 'three-panel@1.0' }, scheme: { ref: 'parliament@1.0' }, components: [{ ref: 'messages@1.0' }] },
  { id: 'home', scope: 'homepage', meta: { name: 'Home' } },
]
const all = () => catalogueItems({ modes, storedLayouts, resources: [], blocks, layouts, templates, themes })
const shelf = (name) => all().filter((i) => i.shelf === name)

describe('the catalogue, read in one place (stage 5, piece 4)', () => {
  it('lists your rooms first, then the templates, with their layout, theme and blocks', () => {
    const rooms = shelf('room')
    expect(rooms.map((r) => r.key)).toEqual(['room:mode_1', 'template:writing-studio@1.0', 'template:kingfisher@1.0'])
    expect(rooms[0]).toMatchObject({ mine: true, name: { own: 'Owl desk' }, layout: 'Three-panel', theme: 'Parliament Default', blocks: 1 })
    // Web search is a feature of the input, so it is not counted as a block.
    expect(rooms[1]).toMatchObject({ name: { template: 'writing-studio@1.0' }, blocks: 2, soon: false })
    expect(rooms[2].soon).toBe(true)
  })

  it('lists the boards that ship prebuilt', () => {
    expect(shelf('board').map((b) => b.board)).toEqual([...LIBRARY_BOARDS])
  })

  it('takes layouts from the registry, and the ones still to come from the store', () => {
    const l = shelf('layout')
    expect(l.map((x) => [x.name, x.soon ?? false])).toEqual([['Three-panel', false], ['Split view', true]])
    expect(l[0]).toMatchObject({ places: 3, description: 'Dual sidebars.' })
  })

  it('lists blocks for rooms, with the input\'s features on it rather than as blocks', () => {
    const b = shelf('block')
    expect(b.map((x) => x.name)).toEqual(['Messages', 'Input'])
    expect(b[1].features).toEqual(['web-search', 'voice-input', 'file-attach'])
  })

  it('lists themes, and resources when there are any', () => {
    expect(shelf('theme').map((t) => t.name)).toEqual(['Parliament Default'])
    expect(shelf('resource')).toEqual([])
    const withOne = catalogueItems({ modes: [], storedLayouts: [], resources: [{ id: 'r1', displayName: 'Style guide', status: 'coming-soon', format: 'PDF' }], blocks: [], layouts: [], templates: [], themes: [] })
    expect(withOne.find((i) => i.shelf === 'resource')).toMatchObject({ name: 'Style guide', soon: true, format: 'PDF' })
  })

  it('takes the app\'s own templates and themes when none are given', () => {
    const items = catalogueItems()
    expect(items.filter((i) => i.shelf === 'room' && i.template).length).toBeGreaterThan(3)
    expect(items.filter((i) => i.shelf === 'theme').length).toBeGreaterThan(3)
    expect(SHELVES).toHaveLength(6)
  })
})
