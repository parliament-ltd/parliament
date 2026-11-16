// The page's side of the Dictionary board's look-ups (C303 (b)): one worker,
// made the first time a word is looked up, answering by id.

let worker = null
let next = 0
const waiting = new Map()

function workerOf() {
  if (!worker) {
    worker = new Worker(new URL('./wordsWorker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (event) => {
      const { id, ...rest } = event.data ?? {}
      const done = waiting.get(id)
      if (done) { waiting.delete(id); done(rest) }
    }
    worker.onerror = () => {
      for (const done of waiting.values()) done({ ok: false })
      waiting.clear()
      worker = null
    }
  }
  return worker
}

/** A word looked up: { ok, word, found: entryView | null, near: string[], missing? }. */
export function lookUp(word) {
  if (typeof Worker === 'undefined') return Promise.resolve({ ok: false })
  const id = ++next
  return new Promise((resolve) => {
    waiting.set(id, resolve)
    workerOf().postMessage({ id, word: String(word ?? '').slice(0, 200) })
  })
}
