// What a room is called (refactor-plan.md, stage 4; C40, C90). Pure.
//
// A room's name is kept on its room record (`meta.name`). Rooms made from a
// built-in template store the template's English name there, which is a
// word of the interface, not the person's (C90): the new screens show it
// in the reader's language, until the room's owner names it with name:.
// A room made with no name was stored as "New room", also no name of the
// person's.

import { TEMPLATES } from './seedTemplates'

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))
const BY_NAME = new Map(TEMPLATES.filter((t) => t.scope === 'room').map((t) => [t.displayName, t.id]))
const NO_NAME = new Set(['', 'new room'])

/** The longest name name: gives a room. */
export const ROOM_NAME_MAX = 80

/**
 * What a room is called: { own } for a name its owner gave it, { template }
 * for a built-in template's name (to be shown in the reader's language), or
 * null for none.
 * @param {{ meta?: { name?: string, template?: string } }|null} mode
 */
export function roomName(mode) {
  const name = typeof mode?.meta?.name === 'string' ? mode.meta.name.trim() : ''
  const key = mode?.meta?.template ?? BY_NAME.get(name) ?? null
  const template = key ? BY_ID.get(key) ?? null : null
  if (template && name === template.displayName) return { template: template.id }
  if (NO_NAME.has(name.toLowerCase())) return template ? { template: template.id } : null
  return { own: name }
}

/**
 * A name as name: would keep it: the words typed, without surrounding space,
 * or a reason it cannot be kept ('empty' or 'long').
 */
export function cleanRoomName(text) {
  const name = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!name) return { error: 'empty' }
  if (Array.from(name).length > ROOM_NAME_MAX) return { error: 'long' }
  return { name }
}
