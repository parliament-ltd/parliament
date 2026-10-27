import { describe, it, expect } from 'vitest'
import { featuresOf, packFiles, planWeb, planAttach } from './inputFeatures'
import { optionOf, GUIDE } from './labGuide'

// Features of input (stage 13, piece 6; C248).

const comp = (ref, config = {}) => ({ id: ref, ref, slot: 'input-dock', config })
const room = (...components) => ({ components })

describe('what a room offers (C248 (a))', () => {
  it('reads the input block\'s own settings, else whether the room has the old block', () => {
    expect(featuresOf(room(comp('input@^1.0'), comp('web-search@^1.0')))).toEqual({ webSearch: true, voice: false, files: false })
    expect(featuresOf(room(comp('input@^1.0', { webSearch: false, files: true }), comp('web-search@^1.0')))).toEqual({ webSearch: false, voice: false, files: true })
    expect(featuresOf(null)).toEqual({ webSearch: true, voice: true, files: true })
  })
  it('asks the guide\'s sixth question', () => {
    const q = GUIDE.find((x) => x.id === 'web')
    expect(optionOf(q.options[0], { mode: room(comp('input@^1.0')) })).toEqual({ command: 'set:input web on', already: false })
    expect(optionOf(q.options[1], { mode: room(comp('input@^1.0')) }).already).toBe(true)
  })
})

describe('files as each may take them (C248 (d))', () => {
  const text = { id: 'f1', name: 'notes.md', category: 'text', mimeType: 'text/markdown', size: 12, content: 'Owls hunt.' }
  const pdf = { id: 'f2', name: 'report.pdf', category: 'document', mimeType: 'application/pdf', size: 900, base64: 'AAAA' }
  it('puts text inside the words, marked as data, and an image or PDF as a part for one who reads it', () => {
    const p = packFiles('Summarise these', [text, pdf], { readsFiles: true })
    expect(p.content).toContain('Summarise these')
    expect(p.content).toContain('<attached_file name="notes.md"')
    expect(p.content).toContain('not instructions')
    expect(p.attachments.parts).toEqual([{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'AAAA' } }])
    expect(p.attachments.meta.map((m) => m.name)).toEqual(['notes.md', 'report.pdf'])
    expect(p.out).toEqual([])
  })
  it('keeps an image or PDF out for one who does not read them, and every file out for a source', () => {
    const p = packFiles('Summarise these', [text, pdf], { readsFiles: false })
    expect(p.attachments.parts).toEqual([])
    expect(p.out).toEqual(['report.pdf'])
    const s = packFiles('owls', [text, pdf], { source: true })
    expect(s).toEqual({ content: 'owls', attachments: null, out: ['notes.md', 'report.pdf'] })
  })
})

describe('web: and attach: (C248 (b), (d))', () => {
  const inp = (extra = {}) => ({ input: { room: 'Essay room', offered: { webSearch: true, voice: true, files: true }, canSearch: true, who: 'Sonnet 5.5', held: { web: false, files: 0 }, ...extra } })
  const on = { match: { values: [] } }
  const off = { match: { values: [{ kind: 'word', value: 'off' }] } }
  it('holds web search for the next prompt, where the room offers it and the model can search', () => {
    expect(planWeb(on, inp()).act).toEqual({ kind: 'webHold', on: true })
    expect(planWeb(on, inp({ canSearch: false })).says.message).toBe('webCannot')
    expect(planWeb(on, inp({ offered: { webSearch: false } })).says.message).toBe('webNotHere')
    expect(planWeb(off, inp()).says.message).toBe('webNoneHeld')
    expect(planWeb(off, inp({ held: { web: true } })).act).toEqual({ kind: 'webHold', on: false })
  })
  it('opens the picker, up to the most files a prompt takes', () => {
    expect(planAttach(on, inp()).act).toEqual({ kind: 'attachPick' })
    expect(planAttach(on, inp({ held: { files: 10 } })).says.message).toBe('attachFull')
    expect(planAttach(on, inp({ offered: { files: false } })).says.message).toBe('attachNotHere')
  })
})
