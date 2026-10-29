import { describe, it, expect } from 'vitest'
import { copyStyles, openPopout, closePopout, fitSize } from './popout'

// Small stand-ins for documents and windows, enough for what popout.js does.
function fakeDoc(nodes = []) {
  const head = { children: [], appendChild(n) { this.children.push(n) } }
  const body = { children: [], className: '', appendChild(n) { this.children.push(n) }, replaceChildren() { this.children = [] } }
  return {
    head, body, title: '', documentElement: { lang: 'sv', dir: 'ltr' },
    querySelectorAll: () => nodes,
    createElement: (tag) => ({ tagName: tag.toUpperCase(), className: '' }),
  }
}
const node = (tagName, extra = {}) => ({ tagName, ...extra, cloneNode() { return { tagName, copied: true } } })

describe('styles in a popped window', () => {
  it('arrive as links to the built stylesheet; style text only in development', () => {
    const page = fakeDoc([node('LINK'), node('STYLE'), node('LINK')])
    const built = fakeDoc()
    expect(copyStyles(page, built, { dev: false })).toEqual({ links: 2, inline: 0 })
    expect(built.head.children.every((n) => n.tagName === 'LINK')).toBe(true)
    expect(copyStyles(page, fakeDoc(), { dev: true })).toEqual({ links: 2, inline: 1 })
  })
})

describe('opening a window', () => {
  it('opens a blank, same-origin window with a title that names the board', async () => {
    const opened = []
    const win = { document: fakeDoc() }
    const host = { open: (url, name, features) => { opened.push({ url, name, features }); return win } }
    const handle = await openPopout({ what: 'board', name: 'parliament-library', title: 'Library · Parliament', from: fakeDoc([node('LINK')]), host })
    expect(opened).toEqual([{ url: '', name: 'parliament-library', features: 'popup,width=760,height=600' }])
    expect(handle.win.document.title).toBe('Library · Parliament')
    expect(handle.win.document.documentElement.lang).toBe('sv')
    expect(handle.win.document.body.className).toBe('ch-window')
    expect(handle.container.className).toBe('ch-window-root')
  })

  it('uses the window that stays on top for the bar where there is one', async () => {
    const asked = []
    const host = {
      documentPictureInPicture: { requestWindow: async (size) => { asked.push(size); return { document: fakeDoc() } } },
      open: () => { throw new Error('should not open an ordinary window') },
    }
    const handle = await openPopout({ what: 'bar', name: 'parliament-bar', title: 'Parliament', onTop: true, from: fakeDoc(), host })
    expect(asked).toEqual([{ width: 600, height: 150 }])
    expect(handle).not.toBeNull()
  })

  it('falls back to an ordinary window where there is none, and says null when blocked', async () => {
    const win = { document: fakeDoc() }
    expect(await openPopout({ what: 'bar', name: 'b', title: 'P', onTop: true, from: fakeDoc(), host: { open: () => win } })).not.toBeNull()
    expect(await openPopout({ what: 'board', name: 'x', title: 'P', from: fakeDoc(), host: { open: () => null } })).toBeNull()
  })

  it('closes a window once, and copes with one already gone', () => {
    let closes = 0
    const win = { closed: false, close() { closes++; this.closed = true } }
    closePopout({ win })
    closePopout({ win })
    closePopout(null)
    expect(closes).toBe(1)
  })
})

describe('a popped board opens at its size on the page (C280)', () => {
  const usual = { width: 760, height: 600 }
  const screen = { availWidth: 1920, availHeight: 1040 }
  it('takes the size asked, kept between a least one and the screen', () => {
    expect(fitSize({ width: 612.4, height: 380 }, usual, screen)).toEqual({ width: 612, height: 380 })
    expect(fitSize({ width: 100, height: 90 }, usual, screen)).toEqual({ width: 320, height: 240 })
    expect(fitSize({ width: 5000, height: 4000 }, usual, screen)).toEqual({ width: 1920, height: 1040 })
  })
  it('opens at the usual size for a board not on the page', () => {
    expect(fitSize(null, usual, screen)).toBe(usual)
  })
})
