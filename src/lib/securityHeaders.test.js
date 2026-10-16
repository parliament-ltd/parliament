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

  it('never allow a wildcard host or port', () => {
    for (const value of Object.values(SECURITY_HEADERS)) {
      expect(value).not.toMatch(/https?:\/\/[^\s;]*\*/)
      expect(value).not.toMatch(/:\*/)
    }
  })

  it('keep scripts to this site only', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("script-src 'self';")
  })
})
