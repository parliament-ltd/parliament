import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { messages as en } from '../locales/en/messages.mjs'
import { sectionOf, SECTIONS, SETTER_NAMES } from './settingVerbs'
import { factsOf, costsByMonth } from './chatFacts'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped, SPACE, planOpen } from '../shell/arrangement'
import { cleanArrangement } from './arrangements'

// Settings as a board, and set: (stage 9, piece 1; C181).

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
const words = (says) => [say(i18n, says.message, says.values), ...(says.also ?? []).map((x) => say(i18n, x.message, x.values))]

const rows = {
  model: [
    { id: 'claude-opus-5-5', group: 'model', name: 'Opus 5.5', provider: 'anthropic', providerName: 'Anthropic', needsKey: false },
    { id: 'claude-sonnet-5-5', group: 'model', name: 'Sonnet 5.5', provider: 'anthropic', providerName: 'Anthropic', needsKey: false },
    { id: 'mistral-small-4', group: 'model', name: 'Mistral Small 4', provider: 'mistral', providerName: 'Mistral', needsKey: true },
  ],
  local: [],
  source: [{ id: 'wikipedia', group: 'source', name: 'Wikipedia', provider: 'wikipedia' }],
}
const values = { defaultModel: 'claude-sonnet-5-5', storageMode: 'persistent', describeNewChats: true, finishRepliesOnLeave: false, fontSize: 'default', mistralRegion: 'global', newChatRoom: null }
const rooms = [{ id: 'writing-studio@1.0', name: 'Writing studio' }, { id: 'code-lab@1.0', name: 'Code lab' }]
const onSettings = () => planOpen(shipped(SPACE), 'settings').next
const line = (value, over = {}) => {
  const p = preview(value, { mode: 'command', arrangement: onSettings(), screens: { setting: { values, rows, rooms, regionProvider: 'Mistral', ...over } } })
  return { ...p, text: p.says ? words(p.says)[0] : '' }
}

describe('the sections', () => {
  it('are six, each named by its alias and the words that mean it', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(['keys', 'spending', 'context', 'data', 'appearance', 'about'])
    expect(['api', 'cost', 'defaults', 'backups', 'text', 'privacy', 'nothing'].map(sectionOf)).toEqual(['keys', 'spending', 'context', 'data', 'appearance', 'about', null])
  })

  it('open:settings keys opens Settings at that section, kept with the space', () => {
    const p = preview('>open:settings backups', { mode: 'command', arrangement: shipped(SPACE), screens: {} })
    expect(words(p.says)[0]).toBe('Enter opens Settings at Data and backups')
    expect([p.next.addressed, p.next.context.settings]).toEqual(['settings', 'data'])
    expect(cleanArrangement(JSON.parse(JSON.stringify(p.next))).context.settings).toBe('data')
    const q = preview('>open:settings colours', { mode: 'command', arrangement: shipped(SPACE), screens: {} })
    expect(words(q.says)[0]).toBe('Settings has no section called colours. The sections are keys, spending, context, data, appearance and about')
  })
})

describe('set:', () => {
  it('lists what it takes, and says what it does not know', () => {
    expect(SETTER_NAMES).toEqual(['default', 'keys', 'title', 'finish', 'text', 'region', 'room'])
    expect(line('>set:').text).toBe('set: changes a setting: set:default, set:keys, set:title, set:finish, set:text, set:region, or set:room')
    expect(line('>set:colour blue').text).toBe('No setting called colour. set: takes set:default, set:keys, set:title, set:finish, set:text, set:region, or set:room')
  })

  it('makes a model the one for new chats, by name, and refuses what cannot be', () => {
    expect(line('>set:default opus')).toMatchObject({ text: 'Enter makes Opus 5.5 the model for new chats, and for chats that have not chosen one', act: { kind: 'setting', key: 'defaultModel', value: 'claude-opus-5-5', before: 'claude-sonnet-5-5' } })
    expect(line('>set:default mistral small').text).toBe('Mistral Small 4 needs a key for Mistral. api:mistral adds one')
    expect(line('>set:default wikipedia').text).toBe('Wikipedia is a source. The model for new chats is a model; by: chooses a source for one chat')
    expect(line('>set:default sonnet').text).toBe('That is the setting already')
  })

  it('says each change in full before Enter', () => {
    expect(line('>set:keys forget')).toMatchObject({ text: 'Enter holds your keys for this tab only and removes the saved copies. You enter them again each visit', act: { key: 'storageMode', value: 'memory' } })
    expect(line('>set:title off').text).toBe('Enter turns off naming new chats: a new chat is named from its first words, with no request')
    expect(line('>set:finish on').text).toBe('Enter lets a reply finish when you leave its chat')
    expect(line('>set:text large')).toMatchObject({ text: 'Enter makes the text large', act: { key: 'fontSize', value: 'large' } })
    expect(line('>set:region eu').text).toBe('Enter has Mistral process your prompts in the EU, at 1.1 times the price')
    expect(line('>set:room code lab')).toMatchObject({ text: 'Enter starts new chats in Code lab', act: { key: 'newChatRoom', value: 'code-lab@1.0' } })
    expect(line('>set:text huge').text).toBe('set:text takes set:text compact, set:text default, or set:text large')
  })

  it('explains what it will not do', () => {
    expect(line('>set:key abc').text).toBe('Keys go in their own field, never the bar, which keeps a history. api: opens it')
    expect(line('>set:compress auto').text).toBe('Automatic compression is gone: it would write a branch without asking. open:201a summary makes one when you ask')
    expect(line('>set:budget 20').text).toBe('set:budget changes nothing in Parliament today, so it is not offered')
  })

  it('works where the bar points at Settings', () => {
    const p = preview('>set:text large', { mode: 'command', arrangement: shipped(SPACE), screens: { setting: { values } } })
    expect(p.act ?? null).toBeNull()
  })
})

describe('spending by month', () => {
  it('prices each month a chat had replies in', () => {
    const f = factsOf({ model: 'claude-sonnet-5-5' }, [
      { role: 'assistant', content: 'a', model: 'm', usage: { input: 1_000_000, output: 0 }, createdAt: '2026-09-30T10:00:00Z' },
      { role: 'assistant', content: 'b', model: 'm', usage: { input: 0, output: 1_000_000 }, createdAt: '2026-10-02T10:00:00Z' },
      { role: 'assistant', content: 'c', createdAt: '2026-08-01T10:00:00Z' },
    ])
    expect(costsByMonth(f, () => ({ inputPerMillion: 2, outputPerMillion: 10 }))).toEqual({ '2026-09': 2, '2026-10': 10, '2026-08': null })
  })
})
