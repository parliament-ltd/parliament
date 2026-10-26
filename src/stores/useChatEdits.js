import { useEffect, useState } from 'react'
import { getEditsOfChat, getAsksOfChat } from '../lib/db'
import { onRecordsChanged } from '../lib/records'

// The edit records of the chats a room shows (stage 11, piece 3; C216), kept
// as they are stored: which edits wait, which were told and closed, and how
// many wait in each branch. Read again whenever an edit changes, here or in
// another tab.

const EMPTY = new Map()

/**
 * @param {string[]} chatIds
 * @param {'edits'|'asks'} [list] which records: edits, or asks (piece 4; C218)
 * @returns {Map<string, object[]>} the records of each chat, by its id
 */
export function useChatEdits(chatIds, list = 'edits') {
  const key = [...new Set((chatIds ?? []).filter(Boolean))].sort().join('|')
  const [byChat, setByChat] = useState(EMPTY)
  useEffect(() => {
    if (!key) return undefined
    let live = true
    const load = async () => {
      const next = new Map()
      const read = list === 'asks' ? getAsksOfChat : getEditsOfChat
      for (const id of key.split('|')) next.set(id, await read(id).catch(() => []))
      if (live) setByChat(next)
    }
    load()
    const kind = list === 'asks' ? 'ask' : 'edit'
    const off = onRecordsChanged((c) => { if (c.kind === kind) load() })
    return () => {
      live = false
      off()
    }
  }, [key, list])
  return key ? byChat : EMPTY
}
