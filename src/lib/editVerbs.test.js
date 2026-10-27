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
    expect(at('>accept:242').text).toBe('242 is not an ask or a suggestion. accept: and reject: settle the answer to an ask, or a suggestion')
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

describe('strikethrough: and tell: (piece 7; C225)', () => {
  const telling = (room, held = []) => (value) => {
    const p = preview(value, { mode: 'command', arrangement: { ...shipped('almanac'), addressed: 'room' }, screens: { telling: { room, held } } })
    return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '' }
  }
  it('strikethrough: strikes the selection in the reply last in focus', () => {
    const p = at('>strikethrough:')
    expect(p.text).toBe('Enter strikes the words you selected in a reply. They stay, struck, and go with your next prompt as an edit')
    expect(p.act).toEqual({ kind: 'strike' })
  })
  it('tell: holds a note for the next prompt in the room, and undo: takes it back', () => {
    const p = telling('c202')('>tell:"Keep it under a page"')
    expect(p.text).toBe('Enter holds this note for your next prompt here. The model reads it once, with that prompt')
    expect(p.act).toEqual({ kind: 'tell', room: 'c202', notes: ['Keep it under a page'], before: [] })
    const two = telling('c202', ['Keep it under a page'])('>tell:"Plainer words"')
    expect(two.text).toBe('Enter holds this note for your next prompt here. The model reads it once, with that prompt, 2 notes in all')
    expect(two.act.notes).toEqual(['Keep it under a page', 'Plainer words'])
    expect(two.act.before).toEqual(['Keep it under a page'])
    // A room with no chat yet holds it too, for its first prompt.
    expect(telling(null)('>tell:"Short"').act).toMatchObject({ room: null, notes: ['Short'] })
  })
  it('tell: refuses what cannot be held', () => {
    expect(telling(undefined)('>tell:"Short"')).toMatchObject({ act: null, text: 'A note goes with a prompt in a room. Open one first: room:' })
    expect(telling('c202')('>tell:""').text).toBe('tell: does not take that. For example: tell:"Keep it under a page"')
    expect(telling('c202', ['Short'])('>tell:"Short"').text).toBe('That note is held already')
    expect(telling('c202')(`>tell:"${'a'.repeat(1001)}"`).text).toBe('A note holds up to 1000 characters')
    expect(telling('c202', Array.from({ length: 10 }, (_, i) => `n${i}`))('>tell:"more"').text).toBe('Up to 10 notes wait for one prompt')
  })
})

describe('accept: and reject: on suggestions (stage 12, piece 1; C229 (e))', () => {
  const sug = (num, made, chatId, change = {}) => ({
    kind: 'suggestion', num, id: `m9:s${num}`, chatId, chatNum: 202, messageId: 'm9', store: 'suggestions', docketNum: 201, branch: 'b',
    title: '', text: '', tags: [], pinned: false, archived: false,
    change: { kind: 'suggestion', made, mark: `s${num}`, part: 'reply', struck: 'a', suggested: 'b', from: {}, model: null, state: 'open', ...change },
  })
  const rows = [
    { kind: 'chat', num: 202, id: 'c202', chatId: 'c202', store: 'conversations', docketNum: 201, branch: 'a', title: '', text: '', tags: [], pinned: false, archived: false },
    ...ROWS.filter((r) => r.kind !== 'chat'),
    sug(250, 'ripple', 'c203'), sug(251, 'sweep', 'c202'), sug(252, 'ripple', 'c203', { state: 'accepted' }),
  ]
  const on = (value) => {
    const p = preview(value, { mode: 'command', arrangement: { ...shipped('almanac'), addressed: 'room' }, screens: { records: { rows }, roomChat: 'c202' } })
    return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : '', also: (p.says?.also ?? []).map((x) => say(i18n, x.message, x.values)) }
  }
  it('accepts Ripple\'s as an edit of yours, and a sweep\'s as the reply\'s words', () => {
    expect(on('>accept:250')).toMatchObject({
      text: 'Enter accepts Ripple’s suggestion 250: each becomes an edit of yours in its branch, and goes with your next prompt there',
      act: { kind: 'storedChange', changes: [{ how: 'acceptSuggestion', num: 250, mark: 's250', messageId: 'm9', conversationId: 'c203' }] },
    })
    expect(on('>accept:251').text).toBe('Enter accepts the sweep’s suggestion 251: the suggested words become the reply’s, and the struck ones go')
    expect(on('>reject:250, 251')).toMatchObject({ text: 'Enter turns down the suggestions 250 and 251: the reply stays as it is', act: { changes: [{ how: 'rejectSuggestion' }, { how: 'rejectSuggestion' }] } })
    expect(on('>accept:252').text).toBe('Suggestion 252 was accepted already')
  })
  it('takes in accept:all the suggestions waiting in the room\'s chat and its plan\'s branches, with the answers', () => {
    const p = on('>accept:all')
    expect(p.act.changes.map((c) => c.num).sort()).toEqual([244, 250, 251])
    expect(p.also).toHaveLength(2)
  })
  it('points undo: and delete: to accept: and reject:', () => {
    expect(on('>undo:250').text).toBe('A suggestion is settled with accept:250 or reject:250')
    expect(on('>delete:250').text).toBe('A suggestion is turned down with reject:250, and kept as the record of it')
  })
})
