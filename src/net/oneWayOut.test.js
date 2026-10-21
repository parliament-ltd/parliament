import { describe, it, expect } from 'vitest'
import { ESLint } from 'eslint'

// The lint rule that keeps the gateway the only way out (eslint.config.js,
// stage 4): code outside src/net cannot import provider code or the key
// functions, or call the network itself.

const eslint = new ESLint() // from the project folder, where vitest runs
const problems = async (code, filePath) => {
  const [result] = await eslint.lintText(code, { filePath })
  return result.messages.filter((m) => m.severity === 2).map((m) => m.ruleId)
}

describe('one way out', () => {
  it('refuses provider code, key functions and the network outside src/net', async () => {
    const block = 'src/catalog/entries/example.jsx'
    expect(await problems("import { getProvider } from '../../providers'\nexport const a = getProvider", block)).toContain('no-restricted-imports')
    expect(await problems("import { loadApiKey } from '../../lib/crypto'\nexport const a = loadApiKey", block)).toContain('no-restricted-imports')
    expect(await problems("import { readSavedKey } from '../../lib/keyStore'\nexport const a = readSavedKey", block)).toContain('no-restricted-imports')
    expect(await problems("export const a = () => fetch('https://example.org')", block)).toContain('no-restricted-globals')
    expect(await problems("export const a = () => window.fetch('https://example.org')", block)).toContain('no-restricted-properties')
  })

  it('allows the gateway, and backup encryption from crypto', async () => {
    const block = 'src/catalog/entries/example.jsx'
    expect(await problems("import { gateway, hasKey } from '../../net'\nexport const a = [gateway, hasKey]", block)).toEqual([])
    expect(await problems("import { encryptExport } from '../../lib/crypto'\nexport const a = encryptExport", block)).toEqual([])
  })

  it('lets src/net itself reach providers and keys', async () => {
    expect(await problems("import { getProvider } from '../providers'\nexport const a = getProvider", 'src/net/example.js')).toEqual([])
  })
})
