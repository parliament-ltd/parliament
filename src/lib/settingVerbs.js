// Settings as a board (refactor-plan.md, stage 9, piece 1; settings spec
// §2 and §5; Settings v1; C181). Its sections and the words that name them,
// and set:, each setting with its own reader and its own Enter line, so the
// line cannot drift from what Enter does. Pure.

import { findAnswerers } from '../net/answerers'
import { namesFrom } from './frameworks'

// The sections live with the boards (shell/boards.js), so open:settings
// keys is planned with the space.
export { SECTIONS, sectionOf } from '../shell/boards'

const said = (a) => (a?.kind === 'text' ? a.value : a?.text ?? String(a?.value ?? ''))
const onOff = (word) => (word === 'on' ? true : word === 'off' ? false : null)

// Each setting: the setting it changes, how a value is read from what is
// typed (or why not), and what the Enter line says. ctx: the settings now,
// the picker's rows, the rooms a new chat can start in.
const SETTERS = {
  // The model for new chats, and for chats that have not chosen one (C150, C155).
  default: {
    key: 'defaultModel',
    read(words, ctx) {
      const word = words.join(' ').trim()
      if (!word) return { bad: { message: 'setNeeds', values: { name: 'default', example: 'set:default sonnet' } } }
      const found = findAnswerers(ctx.rows ?? { model: [], local: [], source: [] }, word)
      if (!found.length) return { bad: { message: 'setDefaultNone', values: { word } } }
      if (found.length > 1) return { bad: { message: 'byWhich', values: { word, names: found.map((r) => r.name), example: `set:default "${found[0].name}"` } } }
      const r = found[0]
      if (r.group === 'source') return { bad: { message: 'setDefaultSource', values: { name: r.name } } }
      if (r.later) return { bad: { message: 'byLater', values: { name: r.name } } }
      if (r.needsKey) return { bad: { message: 'byNeedsKey', values: { name: r.name, provider: r.providerName, command: `api:${r.provider}` } } }
      return { value: r.id, values: { name: r.name } }
    },
    says: () => 'setDefault',
  },
  // Keys kept in this browser, or for this tab only (settings spec §8).
  keys: {
    key: 'storageMode',
    read([w]) {
      if (w === 'remember' || w === 'save') return { value: 'persistent' }
      if (w === 'forget' || w === 'tab') return { value: 'memory' }
      return { bad: { message: 'setChoose', values: { name: 'keys', words: ['set:keys remember', 'set:keys forget'] } } }
    },
    says: (v) => (v === 'memory' ? 'setKeysForget' : 'setKeysRemember'),
  },
  // The one request after a chat's first answer that names it (C62).
  title: {
    key: 'describeNewChats',
    read([w]) {
      const v = onOff(w)
      return v == null ? { bad: { message: 'setChoose', values: { name: 'title', words: ['set:title on', 'set:title off'] } } } : { value: v }
    },
    says: (v) => (v ? 'setTitleOn' : 'setTitleOff'),
  },
  // Whether a reply goes on when its chat is left (C109).
  finish: {
    key: 'finishRepliesOnLeave',
    read([w]) {
      const v = onOff(w)
      return v == null ? { bad: { message: 'setChoose', values: { name: 'finish', words: ['set:finish on', 'set:finish off'] } } } : { value: v }
    },
    says: (v) => (v ? 'setFinishOn' : 'setFinishOff'),
  },
  // Text size (settings spec §12).
  text: {
    key: 'fontSize',
    read([w]) {
      if (w === 'compact' || w === 'default' || w === 'large') return { value: w }
      return { bad: { message: 'setChoose', values: { name: 'text', words: ['set:text compact', 'set:text default', 'set:text large'] } } }
    },
    says: () => 'setText',
  },
  // Where a provider that offers it processes prompts (C159).
  region: {
    key: 'mistralRegion',
    read([w], ctx) {
      if (w === 'global' || w === 'eu' || w === 'us') return { value: w, values: { provider: ctx.regionProvider ?? '' } }
      return { bad: { message: 'setChoose', values: { name: 'region', words: ['set:region global', 'set:region eu', 'set:region us'] } } }
    },
    says: () => 'setRegion',
  },
  // The room a new chat starts in (settings spec §10, "room for new dockets").
  room: {
    key: 'newChatRoom',
    read(words, ctx) {
      const word = words.join(' ').trim().toLowerCase()
      const rooms = ctx.rooms ?? []
      if (!word) return { bad: { message: 'setRoomList', values: { names: rooms.map((r) => r.name) } } }
      const found = rooms.filter((r) => r.name.toLowerCase() === word)
      const near = found.length ? found : rooms.filter((r) => r.name.toLowerCase().includes(word))
      if (!near.length) return { bad: { message: 'setRoomNone', values: { word, names: rooms.map((r) => r.name) } } }
      if (near.length > 1) return { bad: { message: 'setRoomWhich', values: { word, names: near.map((r) => r.name) } } }
      return { value: near[0].id, values: { room: near[0].name } }
    },
    says: () => 'setRoom',
  },
  // How often to remind about backups, counted from the last one (settings
  // spec §11; stage 9, piece 2; C182).
  reminder: {
    key: 'backupReminder',
    read([w]) {
      if (w === 'daily' || w === 'weekly' || w === 'monthly' || w === 'never') return { value: w }
      return { bad: { message: 'setChoose', values: { name: 'reminder', words: ['set:reminder daily', 'set:reminder weekly', 'set:reminder monthly', 'set:reminder never'] } } }
    },
    says: () => 'setReminder',
  },
}

// Names that set: answers with a reason rather than a change.
const REFUSED = {
  // Keys never go in the bar, which keeps a history (settings spec §6).
  key: { message: 'setKey' },
  // It would write a branch without asking (settings spec §10).
  compress: { message: 'setCompress' },
  // R28: nothing reads them today, so they are not offered (put to Stefan).
  summary: { message: 'setNothing', values: { name: 'summary' } },
  threshold: { message: 'setNothing', values: { name: 'threshold' } },
  budget: { message: 'setNothing', values: { name: 'budget' } },
  theme: { message: 'setNothing', values: { name: 'theme' } },
  // Read by run:, which comes with stage 10.
  warn: { message: 'later', values: { verb: 'set:warn' } },
}

/** The names set: takes, in the order the Enter line lists them. */
export const SETTER_NAMES = Object.freeze(Object.keys(SETTERS))

/** The setting a set: name changes, or null. */
export const settingOf = (name) => SETTERS[name]?.key ?? null

/**
 * set:<name> <value> (settings spec §5; C181). screens.setting: { values,
 * rows, rooms, regionProvider }: the settings now, the picker's rows, the
 * rooms a new chat can start in, and the provider that offers a region.
 * @returns {{ says: object, act: object|null }}
 */
export function planSet(step, screens = {}) {
  const ctx = screens.setting ?? {}
  const [first, ...rest] = step.match?.values ?? []
  const name = String(first?.value ?? first?.text ?? '').toLowerCase()
  if (!name) return { says: { message: 'setList', values: { words: SETTER_NAMES.map((n) => `set:${n}`) } }, act: null }
  if (REFUSED[name]) return { says: REFUSED[name], act: null }
  const setter = SETTERS[name]
  if (!setter) return { says: { message: 'setUnknown', values: { word: name, words: SETTER_NAMES.map((n) => `set:${n}`) } }, act: null }
  const words = name === 'default' || name === 'room' ? namesFrom(rest) : rest.map((a) => said(a).toLowerCase())
  const r = setter.read(words, ctx)
  if (r.bad) return { says: r.bad, act: null }
  const before = ctx.values?.[setter.key] ?? null
  if (before === r.value) return { says: { message: 'setSame' }, act: null }
  return {
    says: { message: setter.says(r.value), values: { ...(r.values ?? {}), size: r.value, where: r.value, every: r.value } },
    act: { kind: 'setting', key: setter.key, value: r.value, before },
  }
}
