import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { SECURITY_HEADERS } from './securityHeaders.js'

// netlify.toml is what the deployed site is served with; securityHeaders.js is
// what `vite preview` uses. They must say the same thing.
function headersFromNetlifyToml() {
  const toml = readFileSync(new URL('../../netlify.toml', import.meta.url), 'utf8')
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
