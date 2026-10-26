import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { preview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped } from '../shell/arrangement'
import { messages as en } from '../locales/en/messages.mjs'

// Edits and asks by number (stage 11, piece 5; C220 (d)).

const i18n = setupI18n({ locale: 'en', messages: { en } })
const row = (kind, num, change) => ({
  kind, num, id: `m1:${change.mark}`, chatId: 'c202', chatNum: 202, messageId: 'm1', store: kind === 'edit' ? 'edits' : 'asks',
  title: '', text: '', tags: [], pinned: false, archived: false, change: { kind, part: 'reply', held: false, sent: null, ...change },
})
const ROWS = [
  { kind: 'chat', num: 202, id: 'c202', chatId: 'c202', store: 'conversations', title: 'Barn owls', text: '', tags: [], pinned: false, archived: false },
  row('edit', 242, { mark: 'e1', struck: 'eleven', added: 'ninety' }),
  row('edit', 243, { mark: 'e2', struck: 'a', added: 'b', sent: { to: 'haiku', at: '2026-10-26T10:00:00Z', into: null } }),
  row('ask', 244, { mark: 'q1', question: 'Shorter', state: 'answered', answer: { text: 'x', inPlace: true }, sent: { to: 'haiku' } }),
  row('ask', 245, { mark: 'q2', question: 'Add the year', state: 'answered', answer: { text: 'y', inPlace: false }, sent: { to: 'haiku' } }),
  row('ask', 246, { mark: 'q3', question: 'Plainer', state: 'open' }),
]
const at = (value, addressed = 'room') => {
  const p = preview(value, { mode: 'command', arrangement: { ...shipped('almanac'), addressed }, screens: { records: { rows: ROWS }, roomChat: 'c202' } })
  return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '' }
}

describe('undo:242, one edit', () => {
  it('takes a waiting edit out, and refuses one told already', () => {
    const p = at('>undo:242')
    expect(p.text).toBe('Enter takes edit 242 out: the struck words stand again and yours go. undo: brings it back')
    expect(p.act).toEqual({ kind: 'storedChange', changes: [{ how: 'undoEdit', num: 242, mark: 'e1', messageId: 'm1', conversationId: 'c202' }] })
    expect(at('>undo:243')).toMatchObject({ act: null, text: 'Edit 243 has been told to a model, so it stays. Change the text again, and that goes as a new edit' })
    expect(at('>undo:202').text).toBe('undo: with a number takes back one edit, and 202 is not one')
    expect(at('>undo:246').text).toBe('An ask waiting to go is dropped with delete:246')
  })
})

describe('accept: and reject: on answered asks', () => {
  it('settles an answer in place, and only reject: one on its card only', () => {
    expect(at('>accept:244').text).toBe('Enter keeps the answer to ask 244 in the reply, and the passage goes')
    expect(at('>accept:244').act.changes[0]).toMatchObject({ how: 'accept', mark: 'q1' })
    expect(at('>reject:244').act.changes[0]).toMatchObject({ how: 'undo' })
    expect(at('>accept:245').act).toBeNull()
    expect(at('>reject:245').act.changes[0]).toMatchObject({ how: 'undoHere' })
    expect(at('>accept:246').text).toBe('Ask 246 has no answer yet')
    expect(at('>accept:242').text).toBe('242 is not an ask. accept: and reject: settle the answer to an ask')
    expect(at('>accept:all').act.changes.map((c) => c.num)).toEqual([244])
    expect(at('>reject:all').act.changes.map((c) => c.how)).toEqual(['undo', 'undoHere'])
  })
})

describe('delete: on asks, and the other commands', () => {
  it('drops an ask not yet sent, and keeps one sent', () => {
    expect(at('>delete:246').act).toEqual({ kind: 'storedChange', changes: [{ how: 'drop', num: 246, mark: 'q3', messageId: 'm1', conversationId: 'c202' }] })
    expect(at('>delete:244').text).toBe('Ask 244 has gone to a model, so it stays. accept: or reject: settles its answer')
    expect(at('>delete:242').text).toBe('An edit is taken back with undo:242')
  })

  it('refuses pin: and the like on an edit, and holds it from the Collection', () => {
    expect(at('>pin:242').text).toBe('242 is an edit or an ask. Its own commands act on it: hold:, undo:, accept:, reject:, jump:')
    expect(at('>hold:242', 'collection').act).toEqual({ kind: 'holdEdits', edits: [{ num: 242, id: 'm1:e1', list: 'edits' }], held: true })
    expect(at('>hold:246', 'collection').act.edits[0].list).toBe('asks')
  })
})
