// When the backup reminder shows (backup spec §5.1), and how much harder it
// pushes when the browser has not agreed to keep Parliament's data (C94,
// ruled 20 October): from the first chat instead of the fifth, after a day
// without a backup instead of thirty, and a dismissal lasts a day.
//
// Kept free of app imports so it can be tested in Node.

/**
 * @param {object} s
 * @param {number} s.chatCount
 * @param {number} s.roomCount
 * @param {number} s.accountAgeDays
 * @param {number|null} s.daysSinceLast       null when never backed up
 * @param {number|null} s.daysSinceDismissed  null when never dismissed
 * @param {boolean|null} s.storageKept        null when the browser cannot say
 * @param {'daily'|'weekly'|'monthly'|'never'|null} [s.every] how often, as chosen
 *   in Settings (stage 9; C182): never shows no reminder; unset waits thirty days
 * @returns {{ show: boolean, atRisk: boolean }}
 */
export function backupReminderDue({ chatCount, roomCount, accountAgeDays, daysSinceLast, daysSinceDismissed, storageKept, every = null }) {
  const atRisk = storageKept === false
  if (every === 'never') return { show: false, atRisk }
  const enough = atRisk ? chatCount >= 1 : chatCount >= 5 || roomCount >= 2 || accountAgeDays >= 7
  const chosen = { daily: 1, weekly: 7, monthly: 30 }[every] ?? 30
  const wait = atRisk ? Math.min(1, chosen) : chosen
  const recentlyBackedUp = daysSinceLast !== null && daysSinceLast < wait
  const recentlyDismissed = daysSinceDismissed !== null && daysSinceDismissed < wait
  return { show: enough && !recentlyBackedUp && !recentlyDismissed, atRisk }
}
