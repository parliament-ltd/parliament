// The free check on text from sources, in a worker made for one check and
// then thrown away (security notes §1.4; C176): invisible characters out,
// words that read like instructions found. A check that takes too long is
// stopped, and then nothing is included. Where the page has no workers (the
// tests), the same plain code runs here.
import { checkText } from './included'

export const CHECK_TIMEOUT_MS = 5000

/**
 * @param {string[]} texts
 * @returns {Promise<Array<{ text: string, removed: number, phrases: string[] }>>}
 */
export function checkSourceTexts(texts, { timeoutMs = CHECK_TIMEOUT_MS } = {}) {
  const list = (texts ?? []).map((t) => String(t ?? ''))
  if (typeof Worker === 'undefined') return Promise.resolve(list.map((t) => checkText(t)))
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./sourceCheckWorker.js', import.meta.url), { type: 'module' })
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error('Checking the text from the source took too long, so it was stopped.'))
    }, timeoutMs)
    const finish = () => { clearTimeout(timer); worker.terminate() }
    worker.onmessage = (event) => {
      finish()
      const { ok, results, error } = event.data || {}
      if (ok && Array.isArray(results) && results.length === list.length) resolve(results)
      else reject(new Error(error || 'The text from the source could not be checked.'))
    }
    worker.onerror = () => {
      finish()
      reject(new Error('The text from the source could not be checked.'))
    }
    worker.postMessage({ texts: list })
  })
}
