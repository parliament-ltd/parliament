import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { headerRules, headersFile } from '../../scripts/standby.mjs'
import { SECURITY_HEADERS, VAULT_HEADERS } from './securityHeaders'

// The standby on Cloudflare Pages serves the same headers as Netlify (C286 (o)).
const rulesOf = (path) => headerRules(readFileSync(path, 'utf8'))

describe('the standby site\'s _headers', () => {
  it('carries every header the site is served with, exactly', () => {
    const [page] = rulesOf('netlify.toml')
    expect(page.path).toBe('/*')
    expect(Object.fromEntries(page.values)).toEqual(SECURITY_HEADERS)
  })

  it('and the vault\'s, for its own site', () => {
    const [vault] = rulesOf('vault/netlify.toml')
    expect(vault.path).toBe('/*')
    expect(Object.fromEntries(vault.values)).toEqual(VAULT_HEADERS)
  })

  it('writes one rule per path, each header on its own indented line', () => {
    const file = headersFile([{ path: '/*', values: [['X-Frame-Options', 'DENY'], ['Referrer-Policy', 'no-referrer']] }])
    expect(file.split('\n').slice(1)).toEqual(['/*', '  X-Frame-Options: DENY', '  Referrer-Policy: no-referrer', ''])
    expect(() => headersFile([{ path: '/*', values: [['A', 'one\ntwo']] }])).toThrow()
  })
})
