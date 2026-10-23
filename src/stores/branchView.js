// Which branch each slider on screen shows (refactor-plan.md, stage 8,
// piece 2; branch slider v9; C173). No React here; chatHooks.js reads it.
//
// The slider in a room shows one tab at a time. Which one is kept here, by
// group, so the bar can step through tabs with ⌥← ⌥→ (or ← → when the field
// is empty), and so the reply can follow the tab being viewed (piece 3).
// Kept for the page only: viewing a tab changes nothing stored.

import { stepFrom } from '../lib/branchGroups'

const viewed = new Map() // group id -> chat id
const shown = [] // sliders on screen, the latest last: { groupId, chats }
const listeners = new Set()

function tell() {
  for (const fn of [...listeners]) fn()
}

/** Listens for any change; returns the function that stops listening. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The tab a group's slider shows, or null for its first. */
export const viewedIn = (groupId) => viewed.get(groupId) ?? null

/** Shows a tab. */
export function setViewed(groupId, chatId) {
  if (viewed.get(groupId) === chatId) return
  viewed.set(groupId, chatId)
  tell()
}

/**
 * A slider is on screen; returns the function that takes it off. meta:
 * what the bar needs to send to its branches (piece 3): { line, carried,
 * members: [{ chatId, letter, address, name }] }.
 */
export function onScreen(groupId, chats, meta = {}) {
  const entry = { groupId, chats: [...chats], line: meta.line ?? chats[0], carried: Boolean(meta.carried), members: meta.members ?? [] }
  shown.push(entry)
  tell()
  return () => {
    const at = shown.indexOf(entry)
    if (at >= 0) shown.splice(at, 1)
    tell()
  }
}

/** The slider on screen the bar steps through: the latest drawn. */
export const lastShown = () => shown[shown.length - 1] ?? null

/**
 * Steps the latest slider on screen one tab along. Returns whether there is
 * a slider to step (so the keys are taken), whether or not it moved.
 */
export function step(dir) {
  const s = lastShown()
  if (!s) return false
  const now = viewedIn(s.groupId) ?? s.chats[0]
  const next = stepFrom(s.chats, now, dir)
  if (next) setViewed(s.groupId, next)
  return true
}

/** For tests. */
export function _reset() {
  viewed.clear()
  shown.length = 0
  listeners.clear()
}
