// Checks text from sources before it goes into a prompt (security notes
// §1.4; C176), then is thrown away. It runs here rather than in the page,
// so a crafted text can neither freeze the page nor reach the window that
// holds the keys, and the page stops it after a time limit (sourceCheck.js).
// No network, no model: plain code only.
import { checkText } from './included.js'

self.onmessage = (event) => {
  try {
    const texts = Array.isArray(event.data?.texts) ? event.data.texts : []
    self.postMessage({ ok: true, results: texts.map((t) => checkText(t)) })
  } catch (err) {
    self.postMessage({ ok: false, error: String(err?.message || err) })
  }
}
