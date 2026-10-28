// The documents written from the code (stage 15, piece 5; C272 (d), (e)):
// docs/verbs.md from the command registry, and SECURITY.md's policy block
// from the headers. Run with WRITE_REFERENCE=1 (npm run reference) to write
// them; otherwise the test fails when either is out of date.
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { describe, it, expect, vi } from 'vitest'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }) }))

const { verbsMarkdown } = await import('../commands/referenceDoc')
const { withPolicy } = await import('./policyDoc')
const { BUILT } = await import('../chrome/preview')

const VERBS_MD = new URL('../../docs/verbs.md', import.meta.url)
const SECURITY_MD = new URL('../../SECURITY.md', import.meta.url)
const normal = (s) => s.replace(/\r\n/g, '\n')
const write = process.env.WRITE_REFERENCE === '1'

describe('documents written from the code', () => {
  it('docs/verbs.md matches the command registry', () => {
    const now = verbsMarkdown(BUILT)
    if (write) writeFileSync(VERBS_MD, now)
    expect(normal(readFileSync(VERBS_MD, 'utf8'))).toBe(now)
    expect(now).toContain('| `records:` |')
  })

  it('SECURITY.md prints the headers both sites send', () => {
    const text = normal(readFileSync(SECURITY_MD, 'utf8'))
    const now = withPolicy(text)
    if (write) writeFileSync(SECURITY_MD, now)
    expect(normal(readFileSync(SECURITY_MD, 'utf8'))).toBe(now)
  })
})
