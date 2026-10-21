import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from './Markdown'
import { safeUrl } from '../../lib/safeUrl'

const html = (text, components) => renderToStaticMarkup(h(Markdown, { components }, text))

describe('the one Markdown component (T8)', () => {
  it('keeps web and mail links, and nothing else', () => {
    expect(safeUrl('https://en.wikipedia.org/wiki/Owl')).toBe('https://en.wikipedia.org/wiki/Owl')
    expect(safeUrl('mailto:a@b.c')).toBe('mailto:a@b.c')
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', '/settings', '#top', 'file:///etc', '']) {
      expect(safeUrl(bad), bad).toBe('')
    }
  })

  it('opens links in a new tab with no opener, and drops unsafe ones to text', () => {
    const out = html('[owl](https://example.org) and [bad](javascript:alert(1)) and [in](/settings)')
    expect(out).toContain('href="https://example.org"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).not.toContain('javascript:')
    expect(out).not.toContain('href="/settings"')
    expect(out).toContain('bad')
  })

  it('never loads an image: it becomes a link named by its alt text', () => {
    const out = html('![a barn owl](https://example.org/owl.png)')
    expect(out).not.toContain('<img')
    expect(out).toContain('href="https://example.org/owl.png"')
    expect(out).toContain('a barn owl')
  })

  it('shows raw HTML as text, never as markup', () => {
    const out = html('Hi <script>alert(1)</script> <b>bold</b>')
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('<b>')
  })

  it('lets a caller draw other elements, but not links or images', () => {
    const out = html('# Title\n\n[x](https://example.org)', { h1: ({ children }) => h('h1', { id: 't' }, children), a: () => h('span', null, 'hijacked') })
    expect(out).toContain('<h1 id="t">Title</h1>')
    expect(out).not.toContain('hijacked')
  })
})
