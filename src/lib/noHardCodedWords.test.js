import { describe, it } from 'vitest'
import { RuleTester } from 'eslint'
import rule from '../../eslint-rules/no-hard-coded-words.js'

// The lint rule that keeps the new chrome's words in the copy table (C87).

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
})

tester.run('no-hard-coded-words', rule, {
  valid: [
    { code: 'const a = <span>{i18n._(COPY.boards.almanac)}</span>' },
    { code: "const a = <span>{'>'} · 201a</span>" },
    { code: 'const a = <span>{count} · 3</span>' },
    { code: "const a = <input placeholder={i18n._(COPY.modes.search)} className='field' />" },
    { code: "const a = <div data-mode='command' />" },
  ],
  invalid: [
    { code: 'const a = <span>Almanac</span>', errors: [{ messageId: 'text' }] },
    { code: "const a = <span>{'Save a backup'}</span>", errors: [{ messageId: 'text' }] },
    { code: "const a = <input placeholder='Search' />", errors: [{ messageId: 'attribute' }] },
    { code: "const a = <button aria-label={'Close'} />", errors: [{ messageId: 'attribute' }] },
    { code: 'const a = <p>Ask it to keep the data</p>', errors: [{ messageId: 'text' }] },
  ],
})
