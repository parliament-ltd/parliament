// Lingui: the copy table's catalogues (refactor-plan.md, stage 3; C87;
// Lingui chosen 20 October).
//
// English is the source. Two test languages are generated from it on every
// compile, never translated by hand: en-XA, every word accented and 40%
// longer, to catch words left out of the table and text that overflows; and
// ar-XB, the same text written right to left, to catch layouts that do not
// mirror. Real languages: Japanese, Simplified Chinese, Swedish and Finnish
// first (C87), drafted for Stefan's review and offered in development only
// until he has read them (i18n.js, DRAFT_LANGUAGES; C184).
//
// `npm run i18n` collects the wording from the code into
// src/locales/{locale}/messages.po and compiles each into messages.js.

import { defineConfig } from '@lingui/cli'
import { formatter } from '@lingui/format-po'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'en-XA', 'ar-XB', 'ja', 'zh-Hans', 'sv', 'fi'],
  pseudoLocale: [
    { locale: 'en-XA', prepend: '[', append: ']', extend: 0.4 },
    { locale: 'ar-XB', rightToLeft: true },
  ],
  fallbackLocales: { default: 'en' },
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['<rootDir>/src'],
      exclude: ['**/*.test.js', '**/node_modules/**'],
    },
  ],
  // No line numbers or file origins, so a catalogue changes only when the
  // wording does.
  format: formatter({ origins: false, lineNumbers: false }),
  compileNamespace: 'es',
  orderBy: 'messageId',
})
