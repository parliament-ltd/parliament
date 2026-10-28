import { describe, it, expect } from 'vitest'
import { ownScript, installPolicy } from './trustedTypes'

const HERE = 'https://www.parliament.ltd/'

describe('the Trusted Types policy (C270 (d))', () => {
  it('lets a script\'s address through only when it is one of this site\'s own built files', () => {
    expect(ownScript('/sw.js', HERE)).toBe('https://www.parliament.ltd/sw.js')
    expect(ownScript('/assets/spreadsheetWorker-Ab12.js', HERE)).toBe('https://www.parliament.ltd/assets/spreadsheetWorker-Ab12.js')
    expect(ownScript('https://evil.example/assets/x.js', HERE)).toBeNull()
    expect(ownScript('/assets/../evil.js', HERE)).toBeNull()
    expect(ownScript('/src/main.jsx', HERE)).toBeNull()
    expect(ownScript('data:text/javascript,alert(1)', HERE)).toBeNull()
    expect(ownScript('javascript:alert(1)', HERE)).toBeNull()
  })

  it('makes one default policy that refuses HTML and script text', () => {
    let made = null
    const g = { location: { href: HERE }, trustedTypes: { defaultPolicy: null, createPolicy: (name, rules) => { made = { name, rules }; return made } } }
    installPolicy(g)
    expect(made.name).toBe('default')
    expect(() => made.rules.createHTML('<img src=x onerror=alert(1)>')).toThrow()
    expect(() => made.rules.createScript('alert(1)')).toThrow()
    expect(made.rules.createScriptURL('/sw.js')).toBe('https://www.parliament.ltd/sw.js')
    expect(() => made.rules.createScriptURL('https://evil.example/x.js')).toThrow()
    expect(installPolicy({ trustedTypes: { defaultPolicy: {}, createPolicy: () => { throw new Error('twice') } } })).toBeNull()
    expect(installPolicy({})).toBeNull()
  })
})
