import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { newestEntry, noticeLines } from './changelog'

describe('the changelog (C272 (g))', () => {
  it('reads the newest entry: its version and its lines', () => {
    const md = '# Changelog\n\nIntro.\n\n## 0.6.0\n\n- One\n- Two\n\n## 0.5.0\n\n- Old\n'
    expect(newestEntry(md)).toEqual({ version: '0.6.0', lines: ['One', 'Two'] })
    expect(newestEntry('nothing')).toBeNull()
  })
  it('shows the first few lines, as text, and says when there are more', () => {
    expect(noticeLines({ version: '0.5.0', lines: ['a', 'b', 'c', 'd', 'e'] })).toEqual({ version: '0.5.0', lines: ['a', 'b', 'c', 'd'], more: true })
    expect(noticeLines({ lines: [7, '<b>x</b>'] })).toEqual({ version: '', lines: ['<b>x</b>'], more: false })
    expect(noticeLines(null)).toBeNull()
    expect(noticeLines({ lines: 'x' })).toBeNull()
  })
  it('the file in the repository has an entry for this version', () => {
    const md = readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8')
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    const entry = newestEntry(md)
    expect(entry.version.startsWith(pkg.version)).toBe(true)
    expect(entry.lines.length).toBeGreaterThan(0)
    expect(md).not.toMatch(/—/)
  })
})
