// Setting up a model on this computer (C293): the steps the key panel numbers
// under api:ollama, with the one command for this computer's system where
// there is one. Ollama answers only the sites it is told to, through the
// setting OLLAMA_ORIGINS, and how a setting is made differs by system. Pure,
// but for reading the system from the browser.

/** A small model to start with, as the panel suggests it. */
export const MODEL_COMMAND = 'ollama pull llama3.2'

/** This computer's system, as far as the browser says: 'windows', 'mac' or 'other'. */
export function systemOf(nav = globalThis.navigator) {
  const said = String(nav?.userAgentData?.platform ?? nav?.platform ?? '').toLowerCase()
  if (said.includes('win')) return 'windows'
  if (said.includes('mac')) return 'mac'
  return 'other'
}

/**
 * The command that lets the local model answer this page, and only it, on
 * this system; null where it is not one line (Linux runs it as a service).
 * @param {'windows'|'mac'|'other'} system
 * @param {string} origin this page's origin, as the panel shows it
 */
export function originsCommand(system, origin) {
  if (system === 'windows') return `setx OLLAMA_ORIGINS "${origin}"`
  if (system === 'mac') return `launchctl setenv OLLAMA_ORIGINS "${origin}"`
  return null
}
