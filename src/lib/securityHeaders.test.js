import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { SECURITY_HEADERS, VAULT_HEADERS, VAULT_SITE, PAGE_SITE } from './securityHeaders.js'
import { connectOrigins as vaultAllows } from '../../vault/allow.js'
import { vaultOrigins } from '../net/list.js'

// netlify.toml is what the deployed site is served with; securityHeaders.js is
// what `vite preview` uses. They must say the same thing.
function headersFromNetlifyToml(file = '../../netlify.toml') {
  const toml = readFileSync(new URL(file, import.meta.url), 'utf8')
  const block = toml.split('[headers.values]')[1] ?? ''
  const out = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

describe('security headers', () => {
  it('match between netlify.toml and the preview configuration', () => {
    expect(headersFromNetlifyToml()).toEqual(SECURITY_HEADERS)
  })

  // The key vault (stage 15; research/vault-design.md §8).
  it('give the vault its own headers, which match its netlify.toml and its own list', () => {
    expect(headersFromNetlifyToml('../../vault/netlify.toml')).toEqual(VAULT_HEADERS)
    expect(vaultAllows()).toEqual(vaultOrigins())
    expect(VAULT_HEADERS['Content-Security-Policy']).toContain(`connect-src ${vaultOrigins().join(' ')};`)
    expect(VAULT_HEADERS['Content-Security-Policy']).toContain(`frame-ancestors ${PAGE_SITE};`)
  })

  it('let the page frame the vault and nothing else, and reach no keyed provider itself', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']
    expect(csp).toContain(`frame-src ${VAULT_SITE};`)
    for (const o of vaultOrigins()) expect(csp).not.toContain(o)
  })

  // No wildcard host or port, except one ruled by name: every language
  // edition of Wikipedia (C110, 20 October). A new wildcard needs a ruling
  // and a change here.
  const RULED_WILDCARDS = new Set(['https://*.wikipedia.org'])

  it('never allow a wildcard host or port, except the one ruled', () => {
    for (const value of Object.values(SECURITY_HEADERS)) {
      for (const wild of value.match(/https?:\/\/[^\s;]*\*[^\s;]*/g) ?? []) {
        expect(RULED_WILDCARDS.has(wild), wild).toBe(true)
      }
      expect(value).not.toMatch(/:\*/)
      expect(value).not.toMatch(/(^|[\s;])\*([\s;]|$)/)
    }
  })

  it('keep scripts to this site only', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("script-src 'self';")
  })
})
