// What speech adds to the bar's field (17 November; C70): voice in every
// mode, on a computer and on a phone, turned into words on the device.
// Pure: the bar hands it what the field holds in the mode it is in and the
// words heard, and writes back what it returns.
//
// - A prompt takes the words as they were said, after what is typed.
// - A search takes them without the stop or comma the speech put at the end.
// - A command spoken from nothing has its first word, when that names a
//   command, joined to the rest by the colon commands are typed with:
//   "Open collection." is open:collection. After words already typed, the
//   words go on the end as heard, straight after a colon. Nothing runs
//   before Enter.

// The marks speech puts at the end of what it heard, in the languages offered.
const END = /[\s.,!?;:。、！？，．]+$/u

/**
 * @param {'search'|'command'|'prompt'} mode
 * @param {string} now what the field holds in that mode (a command without its >)
 * @param {string} said the words heard
 * @param {{ isVerb?: (word: string) => boolean }} [known] whether a word names a command
 * @returns {string} what the field holds in that mode after them
 */
export function spokenInto(mode, now, said, { isVerb = () => false } = {}) {
  const words = String(said ?? '').trim()
  const before = String(now ?? '').replace(/\s+$/, '')
  if (!words) return String(now ?? '')
  if (mode === 'prompt') return before ? `${before} ${words}` : words
  const plain = words.replace(END, '')
  if (!plain) return String(now ?? '')
  // After a command's colon, its words follow it with no space: open: and settings, open:settings.
  if (mode === 'command' && before.endsWith(':')) return before + plain
  if (mode === 'search' || before) return before ? `${before} ${plain}` : plain
  const [first, ...rest] = plain.split(/\s+/)
  const verb = first.toLowerCase()
  return isVerb(verb) ? `${verb}:${rest.join(' ')}` : plain
}
