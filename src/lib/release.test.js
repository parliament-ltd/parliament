import { describe, it, expect } from 'vitest'
import { LAB, LAB_VERBS, DEFAULT_TEMPLATE, HIDDEN_TEMPLATES, offered, shownInLibrary, newChatTemplate } from './release'
import { TEMPLATES } from './seedTemplates'
import { catalogueItems } from './catalogue'

describe('what this release offers (C279 (a))', () => {
  it('waits with the Lab, and the default room is a template that exists', () => {
    expect(LAB).toBe(false)
    expect(TEMPLATES.some((t) => t.id === DEFAULT_TEMPLATE && t.scope === 'room')).toBe(true)
  })

  it('offers every command but the Lab\'s, and all of them once the Lab is on', () => {
    expect(LAB_VERBS.every((v) => !offered(v))).toBe(true)
    expect(offered('open')).toBe(true)
    expect(offered('set')).toBe(true)
    expect(LAB_VERBS.every((v) => offered(v, true))).toBe(true)
  })

  it('shows in the Library every room someone made, the default template, and no shelf for building', () => {
    const mine = { id: 'm1', scope: 'room', meta: { name: 'Mine' }, layout: { ref: 'three-panel@1' }, components: [] }
    const items = catalogueItems({ modes: [mine], layouts: [{ name: 'three-panel', version: '1', displayName: 'Three panels', scope: 'room', slots: [] }] })
    const shown = items.filter((i) => shownInLibrary(i))
    expect(shown.some((i) => i.mine && i.id === 'm1')).toBe(true)
    expect(shown.filter((i) => i.template).map((i) => i.template)).toEqual([DEFAULT_TEMPLATE])
    expect(shown.some((i) => ['layout', 'block', 'theme'].includes(i.shelf))).toBe(false)
    expect(shown.some((i) => i.shelf === 'board')).toBe(true)
    expect(items.filter((i) => shownInLibrary(i, true))).toEqual(items)
  })

  it('hides the rooms someone made from Drafting Desk, by its name or its words, until the Lab is back (C288 (a))', () => {
    const desk = TEMPLATES.find((t) => t.id === 'drafting-desk@1.0')
    const studio = TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE)
    const room = (id, name, description) => ({ id, scope: 'room', meta: { name, description }, components: [] })
    const modes = [
      room('d1', desk.displayName, desk.description),
      room('d2', 'Essay drafts', desk.description),
      room('w1', studio.displayName, studio.description),
      room('o1', 'Owl notes', 'Mine alone'),
    ]
    const items = catalogueItems({ modes })
    const mine = (lab) => items.filter((i) => i.mine && shownInLibrary(i, lab)).map((i) => i.id)
    expect(HIDDEN_TEMPLATES).toEqual(['drafting-desk@1.0'])
    expect(mine()).toEqual(['w1', 'o1'])
    expect(mine(true)).toEqual(['d1', 'd2', 'w1', 'o1'])
  })

  it('starts new chats in the default room while the room chosen is not offered (C288 (a))', () => {
    expect(newChatTemplate('drafting-desk@1.0')).toBeUndefined()
    expect(newChatTemplate('data-workspace@1.0')).toBeUndefined()
    expect(newChatTemplate(DEFAULT_TEMPLATE)).toBe(DEFAULT_TEMPLATE)
    expect(newChatTemplate(null)).toBeUndefined()
    expect(newChatTemplate('drafting-desk@1.0', true)).toBe('drafting-desk@1.0')
  })
})
