// Who translates, and translating (refactor-plan.md, stage 7, piece 6;
// LPN §6; C84, C85, C166).
//
// In the order C84 gives, never a translation service in the background:
//   1. the browser's own translation, where the browser has it and can do
//      the pair (found by feature detection, never by the browser's name).
//      Its makers say it runs on the device and sends nothing out; the page
//      makes no request for it (research of 22 October 2026: Chrome 138 and
//      later on a computer, and Edge; not in Firefox or Safari, not on
//      phones, not in workers);
//   2. the helper (`helper:`), the model the person chose to read text from
//      sources; unchosen, a model on this computer once a check has listed
//      one; else the small model of a provider with a key, named on the
//      Enter line with its cost.
//
// Pure apart from the browser's own translation, which is reached through
// the scope passed in, so tests can stand one in.

// How long the browser's checks may take: some browsers that have the
// interface never answer it (found in an embedded browser, 22 October), and
// a check must never hold up a prompt.
export const CHECK_MS = 3000
const within = (ms, promise) => Promise.race([promise, new Promise((resolve) => { setTimeout(() => resolve(null), ms) })])

/** Whether a word from the browser's availability check means it can translate the pair, now or after a download. */
const CAN = new Set(['available', 'downloadable', 'downloading'])

/**
 * The browser's own translation and language detection, where it has them.
 * @param {object} [scope] globalThis, or a stand-in
 */
export function onDevice(scope = globalThis, { checkMs = CHECK_MS } = {}) {
  const T = scope?.Translator
  const D = scope?.LanguageDetector
  const has = typeof T?.availability === 'function' && typeof T?.create === 'function'
  const detects = typeof D?.create === 'function'
  return {
    has,
    detects,
    /**
     * Whether it can translate from one language into another: 'available',
     * 'downloadable' (the browser fetches its language pack first, on
     * Enter, which needs a key press or a click), 'downloading', or null.
     */
    async can(from, to) {
      if (!has || !from || !to || from === to) return null
      try {
        const a = await within(checkMs, T.availability({ sourceLanguage: from, targetLanguage: to }))
        return CAN.has(a) ? a : null
      } catch {
        return null
      }
    },
    /** Translates the pieces, each on its own, keeping empty ones empty. */
    async translate(pieces, { from, to, signal } = {}) {
      if (!has) throw new Error('This browser has no translation of its own')
      const t = await T.create({ sourceLanguage: from, targetLanguage: to, signal })
      try {
        const out = []
        for (const p of pieces) out.push(p ? String(await t.translate(p, { signal })) : p)
        return out
      } finally {
        t.destroy?.()
      }
    },
    /** The language some text is in, when the browser is fairly sure; else null. */
    async detect(text) {
      if (!detects || !String(text ?? '').trim()) return null
      try {
        const d = await within(checkMs, D.create())
        if (!d) return null
        try {
          const [best] = (await within(checkMs, d.detect(String(text)))) ?? []
          return best && best.detectedLanguage !== 'und' && best.confidence >= 0.6 ? best.detectedLanguage : null
        } finally {
          d.destroy?.()
        }
      } catch {
        return null
      }
    },
  }
}

/**
 * Who translates, given what the browser can do and who the helper is.
 * @param {{ browser?: string|null, helper?: object|null }} input
 *   browser: what the browser said it can do for the pair (onDevice().can);
 *   helper: the model that reads text from sources (helperOf), or null
 * @returns {{ kind: 'browser', downloads: boolean }|{ kind: 'model', helper: object }|{ kind: 'none', helper: object|null }}
 *   none: nothing can translate here (no translation in the browser, and no
 *   helper, or a helper that needs a key or a check first)
 */
export function translatorFor({ browser = null, helper = null } = {}) {
  if (browser) return { kind: 'browser', downloads: browser !== 'available' }
  if (helper && !helper.needsKey && !helper.unchecked && !helper.later && !helper.gone) return { kind: 'model', helper }
  return { kind: 'none', helper }
}
