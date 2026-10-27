import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { planLocal, localOf } from './lab'
import { validateBackup } from './validate'
import { preview, promptPreview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped } from '../shell/arrangement'
import { messages as en } from '../locales/en/messages.mjs'

// Local-only rooms (stage 13, piece 5; C246).

const i18n = setupI18n({ locale: 'en', messages: { en } })
const words = (s) => say(i18n, s.message, s.values)
const mode = { id: 'mode_1', scope: 'room', schema: 'x', meta: { name: 'Essay room' }, components: [] }
const step = (word) => ({ match: { values: [{ kind: 'word', value: word }] } })
const lab = (m) => ({ lab: { room: { id: 'mode_1', mode: m, name: 'Essay room' } } })

describe('local:on and local:off (C246 (b), (c))', () => {
  it('sets the field only when on, and takes it away when off', () => {
    const on = planLocal(step('on'), lab(mode))
    expect(words(on.says)).toBe('Enter makes Essay room send only to models on this computer')
    expect(on.act.after.localOnly).toBe(true)
    const off = planLocal(step('off'), lab({ ...mode, localOnly: true }))
    expect('localOnly' in off.act.after).toBe(false)
    expect(words(planLocal(step('off'), lab(mode)).says)).toBe('It sends to anyone already')
    expect(localOf({ localOnly: true })).toBe(true)
    expect(localOf(mode)).toBe(false)
  })
  it('keeps every backup readable: a room with none, or true or false, and nothing else', () => {
    expect(validateBackup({ conversations: [], modes: [mode] }).valid).toBe(true)
    expect(validateBackup({ conversations: [], modes: [{ ...mode, localOnly: true }] }).valid).toBe(true)
    expect(validateBackup({ conversations: [], modes: [{ ...mode, localOnly: 'yes' }] }).valid).toBe(false)
  })
})

describe('what a local-only room holds back (C246 (d))', () => {
  const lo = { room: 'Essay room', helper: 'Haiku 5.5', helperLocal: false, isLocal: (w) => w?.provider === 'ollama' }
  const base = { room: 'c1', chat: 201, keyed: true, provider: 'Anthropic', perMillion: 3 }
  it('refuses a prompt to a hosted model or a source, and lets one to this computer go', () => {
    const hosted = promptPreview('hello', { ...base, localOnly: lo, answerer: { group: 'model', provider: 'anthropic', name: 'Sonnet 5.5' } })
    expect(hosted.ready).toBe(false)
    expect(words(hosted.says)).toBe('Essay room sends only to models on this computer, and Sonnet 5.5 is not one. by: a model on this computer, or local:off')
    expect(promptPreview('hello', { ...base, localOnly: lo, answerer: { group: 'source', name: 'Wikipedia' } }).ready).toBe(false)
    const here = promptPreview('hello', { ...base, localOnly: lo, answerer: { group: 'model', provider: 'ollama', name: 'Llama' } })
    expect(here.says.message).not.toBe('promptLocalOnly')
  })
  it('refuses the helper\'s commands unless the helper is on this computer', () => {
    const a = { ...shipped('almanac'), columns: [['room']], addressed: 'room', context: { room: 'c1' } }
    const p = preview('>sweep:', { mode: 'command', arrangement: a, screens: { localOnly: lo } })
    expect(words(p.says)).toBe('Essay room sends only to models on this computer, and the helper, Haiku 5.5, is not one. helper: a model on this computer first')
    expect(preview('>ripple:off', { mode: 'command', arrangement: a, screens: { localOnly: lo } }).says.message).not.toBe('localOnlyHelper')
    expect(preview('>sweep:', { mode: 'command', arrangement: a, screens: { localOnly: { ...lo, helperLocal: true } } }).says.message).not.toBe('localOnlyHelper')
  })
})
