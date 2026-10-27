// Retired with R10, approved by Stefan on 22 October 2026 and carried out on 27 October 2026:
// the old JSON export, which the export button in the old Settings page called.
// Was exportAllData() in src/lib/db.js. Nothing imports it and it is not built.
// Files it made still restore (backupFormat.js reads them). To restore: move it
// back into db.js, where initDB is.

import { initDB } from '../../lib/db'

export async function exportAllData() {
  const db = await initDB()
  return {
    conversations: await db.getAll('conversations'),
    messages: await db.getAll('messages'),
    highlights: await db.getAll('highlights'),
    notes: await db.getAll('notes'),
    favorites: await db.getAll('favorites'),
    pins: await db.getAll('pins'),
    settings: await db.getAll('settings'),
    sbrd_documents: await db.getAll('sbrd_documents'),
    exportedAt: new Date().toISOString(),
    version: 1,
  }
}
