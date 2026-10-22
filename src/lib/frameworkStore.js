// Frameworks of the person's own, kept in the version 6 list `collabs`
// (stage 7, piece 5; C164). Each record: { id, name, instruction, builtIn:
// false, on: false, fromPersona, createdAt }, as the upgrade made them from
// personas (A13). `on` is not read: frameworks belong to a chat.

/** Every framework of the person's own, oldest first. */
export async function readOwnFrameworks(db) {
  if (!db?.objectStoreNames?.contains('collabs')) return []
  const all = await db.getAll('collabs')
  return all.filter((c) => !c.builtIn).sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
}

/**
 * Keeps one: a new one, or the words of one there already (before), which
 * keeps its id so chats it is on carry on with it.
 * @returns {Promise<object>} the record as kept
 */
export async function keepOwnFramework(db, { name, instruction, before = null, newId, now }) {
  const record = before
    ? { ...before, name, instruction }
    : { id: newId(), name, instruction, builtIn: false, on: false, fromPersona: null, createdAt: now }
  await db.put('collabs', record)
  return record
}

/** Removes one, by id. Chats it was on go on without it. */
export async function removeOwnFramework(db, id) {
  await db.delete('collabs', id)
}

/** Puts one back as it was, for undo: (C134). */
export async function restoreOwnFramework(db, record) {
  await db.put('collabs', record)
}
