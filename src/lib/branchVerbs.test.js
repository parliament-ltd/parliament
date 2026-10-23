import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { messages as en } from '../locales/en/messages.mjs'
import { preview, promptPreview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped } from '../shell/arrangement'
import { replyTargets } from './branchGroups'

// The reply target among a prompt's branches (stage 8, piece 3; C174).

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
const members = [
  { chatId: 'a', letter: 'a', address: '201a', name: 'Sonnet 5.5' },
  { chatId: 'b', letter: 'b', address: '201b', name: 'Wikipedia' },
  { chatId: 'c', letter: 'c', address: '201c', name: 'Opus 5.5' },
]
const shown = (over = {}) => ({ groupId: 'g1', chats: ['a', 'b', 'c'], line: 'a', carried: false, members, ...over })
const line = (value, held = null, s = shown()) => {
  const p = preview(value, { mode: 'command', arrangement: shipped('almanac'), screens: { branching: { shown: s, held } } })
  return { ...p, text: say(i18n, p.says.message, p.says.values) }
}

describe('where the next prompt goes', () => {
  it('follows the tab viewed, until one branch is carried on', () => {
    expect(replyTargets({ shown: shown(), viewed: 'b' })).toEqual({ chats: ['b'], why: 'viewed' })
    expect(replyTargets({ shown: shown(), viewed: null })).toEqual({ chats: ['a'], why: 'line' })
    expect(replyTargets({ shown: shown({ carried: true }), viewed: 'b' })).toEqual({ chats: ['a'], why: 'carried' })
  })

  it('goes where to: holds it, for that prompt’s branches only', () => {
    expect(replyTargets({ shown: shown(), viewed: 'b', held: { groupId: 'g1', chats: ['a', 'c'] } })).toEqual({ chats: ['a', 'c'], why: 'held' })
    expect(replyTargets({ shown: shown(), viewed: 'b', held: { groupId: 'g0', chats: ['x'] } })).toEqual({ chats: ['b'], why: 'viewed' })
    expect(replyTargets({ shown: null })).toBeNull()
  })
})

describe('to: (C174)', () => {
  it('holds one branch, several, or all', () => {
    expect(line('>to:201b')).toMatchObject({ text: 'Enter sends your next prompts to 201b, carrying on Wikipedia’s branch, until changed', act: { kind: 'replyTo', groupId: 'g1', chats: ['b'], before: null } })
    expect(line('>to:201a, 201c').text).toBe('Enter sends your next prompts to 201a and 201c, each carrying its own branch on, until changed')
    expect(line('>to:all')).toMatchObject({ text: 'Enter sends your next prompts to all 3 branches, each carrying its own on, until changed', act: { chats: ['a', 'b', 'c'] } })
  })

  it('names what it replaces, and refuses what is not here', () => {
    expect(line('>to:201c', { groupId: 'g1', chats: ['b'] }).act.before).toEqual(['b'])
    expect(line('>to:201b', { groupId: 'g1', chats: ['b'] }).text).toBe('Your prompts go there already')
    expect(line('>to:201d').text).toBe('No branch 201d here. The branches are 201a, 201b, and 201c')
    expect(line('>to:201b', null, null).text).toBe('to: chooses among the branches of a prompt sent to several, and there are none on screen')
  })
})

describe('the Enter line among branches', () => {
  const room = { room: 'a', keyed: true, keyedBy: { anthropic: true }, historyChars: 0, systemChars: 0 }
  const wiki = { id: 'wikipedia', group: 'source', name: 'Wikipedia' }
  const sonnet = { id: 'claude-sonnet-5-5', group: 'model', name: 'Sonnet 5.5', price: { type: 'metered', inputPerMillion: 2, outputPerMillion: 10 } }
  const words = (target) => {
    const p = promptPreview('And how far?', { ...room, ...target })
    return [say(i18n, p.says.message, p.says.values), ...(p.says.also ?? []).map((x) => say(i18n, x.message, x.values))]
  }

  it('says which branch it carries on, and that the room moves to it', () => {
    expect(words({ answerer: wiki, toBranch: '201b' })).toEqual(['Enter asks Wikipedia, which needs no key and costs nothing', 'It carries 201b on, and the room moves to it'])
  })

  it('says when the reply viewed is not the one carried on', () => {
    expect(words({ answerer: sonnet, carriesOn: { line: '201a', viewed: '201c' } })[1]).toBe('It carries 201a on, not the reply you are viewing. open:201c carries that one on in a room of its own')
  })

  it('names each branch carried on, with its cost', () => {
    expect(words({ many: [sonnet, wiki], toMany: ['201a', '201b'] })).toEqual([
      'Enter sends this to 201a and 201b, each carrying its own branch on: under $0.01 in all to send',
      '1. Sonnet 5.5, about 3 tokens, under $0.01',
      '2. Wikipedia, no key and no cost',
    ])
  })
})
