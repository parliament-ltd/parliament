// The one way in to Delete everything (stage 9, piece 3; C73; T5; C183):
// the button in Settings, after its word is typed. Never a command, a link,
// or something a saved button, a reply or a file can set off.
//
// This tab lets go of its databases first and will not open them again, so
// nothing here writes them back; then everything goes (eraseAll.js), and the
// page is covered by a notice saying so (DbStateNotice).

import { closeDB, DB_NAME, TRIAL_DB_NAME, DB_STATE_EVENT } from './db'
import { closeKeyDB } from './crypto'
import { KEY_DB_NAME } from './keyStore'
import { eraseEverything } from './eraseAll'
import { eraseVault } from '../net'

/**
 * @param {{ onBlocked?: (name: string) => void }} [options]
 * @returns {Promise<{ databases: string[], caches: number, workers: number }>}
 */
export async function deleteEverything({ onBlocked } = {}) {
  // The keys at the vault's own address first: only the vault can reach them (stage 15).
  await eraseVault()
  closeDB()
  closeKeyDB()
  const done = await eraseEverything({ known: [DB_NAME, TRIAL_DB_NAME, KEY_DB_NAME], onBlocked })
  window.dispatchEvent(new CustomEvent(DB_STATE_EVENT, { detail: 'erasedHere' }))
  return done
}
