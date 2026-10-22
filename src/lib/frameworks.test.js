import { describe, it, expect } from 'vitest'
import { BUILT_IN, frameworkList, frameworksOf, instructionsOf, recordOf, findFrameworks, readFrameworks, cleanOwn, MOST } from './frameworks'

// Frameworks (stage 7, piece 5; C164).

const NAMES = { challenge: 'Challenge artifacts', reasoning: 'Show reasoning', pushback: 'Push back on me', alts: 'Offer alternatives', uncertain: 'Flag uncertainty' }
const nameOf = (f) => (f.builtIn ? NAMES[f.id] : f.name)
const own = [
  { id: 'e1', name: 'Editor', instruction: 'Make each sentence more concise. Never combine sentences.' },
  { id: 'p1', name: null, instruction: '  From a persona.  ' },
  { id: 'x1', name: 'Empty', instruction: '   ' },
]
const list = frameworkList(own)
const word = (value) => ({ kind: 'word', value, text: value })

describe('frameworks', () => {
  it('lists the five built in, then the person\'s own that say something', () => {
    expect(list.map((f) => f.id)).toEqual(['challenge', 'reasoning', 'pushback', 'alts', 'uncertain', 'own:e1', 'own:p1'])
    expect(BUILT_IN.every((f) => f.instruction.length > 20)).toBe(true)
  })

  it('stacks the instructions in the order chosen, as the system prompt', () => {
    expect(instructionsOf(['own:e1', 'uncertain'], list)).toBe(`${own[0].instruction}\n\n${BUILT_IN[4].instruction}`)
    expect(instructionsOf([], list)).toBe('')
    expect(frameworksOf(['gone', 'pushback'], list).map((f) => f.id)).toEqual(['pushback'])
  })

  it('records what a reply was written under, keeping the name of one of the person\'s own', () => {
    expect(recordOf(['pushback', 'own:e1'], list)).toEqual([{ id: 'pushback' }, { id: 'own:e1', name: 'Editor' }])
  })

  it('finds one by its id, its name, or the start of its name', () => {
    expect(findFrameworks('pushback', list, nameOf).map((f) => f.id)).toEqual(['pushback'])
    expect(findFrameworks('push back on me', list, nameOf).map((f) => f.id)).toEqual(['pushback'])
    expect(findFrameworks('edit', list, nameOf).map((f) => f.id)).toEqual(['own:e1'])
    expect(findFrameworks('nothing', list, nameOf)).toEqual([])
  })

  it('reads framework: words in order, off, or nothing to show the picker', () => {
    const list1 = { kind: 'list', items: [word('pushback'), word('uncertain')] }
    expect(readFrameworks([list1], { list, nameOf })).toEqual({ ids: ['pushback', 'uncertain'], same: false })
    expect(readFrameworks([word('off')], { list, nameOf, now: ['pushback'] })).toEqual({ ids: [], same: false })
    expect(readFrameworks([word('pushback')], { list, nameOf, now: ['pushback'] }).same).toBe(true)
    expect(readFrameworks([], { list, nameOf })).toEqual({ show: true })
    expect(readFrameworks([{ kind: 'text', value: 'Editor' }], { list, nameOf }).ids).toEqual(['own:e1'])
  })

  it('refuses a word that names none, or several', () => {
    expect(readFrameworks([word('nope')], { list, nameOf }).bad.message).toBe('frameworkNone')
    const two = frameworkList([{ id: 'a', name: 'Editor one', instruction: 'x' }, { id: 'b', name: 'Editor two', instruction: 'y' }])
    expect(readFrameworks([word('editor')], { list: two, nameOf }).bad).toMatchObject({ message: 'frameworkWhich', values: { names: ['Editor one', 'Editor two'] } })
    const many = frameworkList(Array.from({ length: MOST + 1 }, (_, i) => ({ id: `n${i}`, name: `N${i}`, instruction: 'x' })))
    const all = { kind: 'list', items: many.filter((f) => !f.builtIn).map((f) => word(f.name.toLowerCase())) }
    expect(readFrameworks([all], { list: many, nameOf }).bad.message).toBe('frameworkMost')
  })

  it('checks a framework of the person\'s own before it is kept', () => {
    expect(cleanOwn(' Editor ', ' Be brief. ')).toEqual({ name: 'Editor', instruction: 'Be brief.' })
    expect(cleanOwn('', 'x').error).toBe('name')
    expect(cleanOwn('Editor', ' ').error).toBe('instruction')
    expect(cleanOwn('x'.repeat(61), 'y').error).toBe('nameLong')
  })
})
