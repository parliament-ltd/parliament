// Stage 11 spike (C205): what a reply is made of once it can be edited.
// Throwaway: reached only from /dev/editing. Not part of the product.
//
// A reply is a flat list of blocks, each with an id, a type and its text
// (editing spec, "Blocks and the / menu", technical point 1). Marks are of
// two kinds:
//   - the model's own: bold, italic, code and links. Shown as written, never
//     put on or taken off by the person (C58, ruled 24 October).
//   - the two an edit leaves: struck (the model's words, removed) and added
//     (the person's words), each carrying its edit's id.
// Tables and charts are whole blocks (atoms): struck as a unit, not edited
// inside, at first (C58).
//
// Nothing here is ever rendered as HTML: every node draws through toDOM
// arrays, whose strings become text nodes.

import { Schema } from 'prosemirror-model'

const id = { id: { default: null } }
const struck = { struck: { default: null } }
const blockAttr = (node) => ({ 'data-block': node.attrs.id })
const readId = (dom) => ({ id: dom.getAttribute('data-block') })

// Links the model wrote keep only addresses that go somewhere ordinary.
export function safeHref(href) {
  try {
    const url = new URL(String(href), 'https://invalid.example')
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) && !String(href).startsWith('/') ? url.href : null
  } catch {
    return null
  }
}

// A whole block that has been struck is drawn inside <del>, so it reads as
// removed to a screen reader as well as to the eye.
const wrapStruck = (node, inner) => (node.attrs.struck
  ? ['del', { class: 'pm-blk', 'data-edit': String(node.attrs.struck), 'data-block': node.attrs.id }, inner]
  : inner)

export const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block', content: 'inline*', attrs: { ...id },
      toDOM: (n) => ['p', blockAttr(n), 0],
      parseDOM: [{ tag: 'p', getAttrs: readId }],
    },
    heading: {
      group: 'block', content: 'inline*', attrs: { ...id, level: { default: 1 } }, defining: true,
      // Levels 1 to 3 of a reply sit under the page's own headings.
      toDOM: (n) => [`h${n.attrs.level + 2}`, { ...blockAttr(n), class: `pm-h${n.attrs.level}` }, 0],
      parseDOM: [3, 4, 5].map((h) => ({ tag: `h${h}`, getAttrs: (dom) => ({ ...readId(dom), level: h - 2 }) })),
    },
    // Bulleted, numbered and checklist items are blocks of their own, so
    // Enter, Backspace and / treat them like any other line.
    list_item: {
      group: 'block', content: 'inline*', attrs: { ...id, kind: { default: 'bullet' }, checked: { default: false } }, defining: true,
      toDOM: (n) => ['div', { ...blockAttr(n), class: `pm-li pm-${n.attrs.kind}`, 'data-checked': n.attrs.checked ? 'true' : 'false' },
        ...(n.attrs.kind === 'check'
          ? [['span', { class: 'pm-box', contenteditable: 'false', role: 'checkbox', 'aria-checked': n.attrs.checked ? 'true' : 'false', 'aria-label': 'Done' }]]
          : []),
        ['span', { class: 'pm-lt' }, 0]],
      parseDOM: [{
        tag: 'div.pm-li', contentElement: 'span.pm-lt',
        getAttrs: (dom) => ({ ...readId(dom), kind: ['bullet', 'number', 'check'].find((k) => dom.classList.contains(`pm-${k}`)) ?? 'bullet', checked: dom.getAttribute('data-checked') === 'true' }),
      }],
    },
    quote: {
      group: 'block', content: 'inline*', attrs: { ...id }, defining: true,
      toDOM: (n) => ['blockquote', blockAttr(n), ['p', 0]],
      parseDOM: [{ tag: 'blockquote', contentElement: 'p', getAttrs: readId }],
    },
    code_block: {
      group: 'block', content: 'text*', marks: 'struck added', code: true, attrs: { ...id }, defining: true,
      toDOM: (n) => ['pre', blockAttr(n), ['code', 0]],
      parseDOM: [{ tag: 'pre', preserveWhitespace: 'full', getAttrs: readId }],
    },
    divider: {
      group: 'block', atom: true, selectable: true, attrs: { ...id, ...struck },
      toDOM: (n) => wrapStruck(n, ['hr', blockAttr(n)]),
      parseDOM: [{ tag: 'hr', getAttrs: readId }],
    },
    // A table the model wrote: a whole block for now (C58).
    table: {
      group: 'block', atom: true, selectable: true, attrs: { ...id, ...struck, rows: { default: [] } },
      toDOM: (n) => wrapStruck(n, ['div', { ...blockAttr(n), class: 'pm-table' },
        ['table', ['tbody', ...n.attrs.rows.map((row, r) => ['tr', ...row.map((cell) => [r === 0 ? 'th' : 'td', String(cell)])])]]]),
      parseDOM: [{ tag: 'div.pm-table', getAttrs: readId }],
    },
    // A chart from the model's chart tool: a whole block for now (C58).
    chart: {
      group: 'block', atom: true, selectable: true, attrs: { ...id, ...struck, title: { default: '' }, bars: { default: [] } },
      toDOM: (n) => {
        const bars = n.attrs.bars
        const max = Math.max(1, ...bars.map((b) => Number(b.value) || 0))
        const w = 300 / Math.max(1, bars.length)
        const svg = 'http://www.w3.org/2000/svg'
        return wrapStruck(n, ['figure', { ...blockAttr(n), class: 'pm-chart' },
          [`${svg} svg`, { viewBox: '0 0 300 110', role: 'img', 'aria-label': String(n.attrs.title) },
            ...bars.map((b, i) => {
              const h = Math.round(((Number(b.value) || 0) / max) * 90)
              return [`${svg} rect`, { x: String(i * w + 6), y: String(100 - h), width: String(Math.max(2, w - 12)), height: String(h), class: 'pm-bar' }]
            })],
          ['figcaption', String(n.attrs.title)]])
      },
      parseDOM: [{ tag: 'figure.pm-chart', getAttrs: readId }],
    },
    text: { group: 'inline' },
    hard_break: {
      group: 'inline', inline: true, selectable: false,
      toDOM: () => ['br'],
      parseDOM: [{ tag: 'br' }],
    },
  },
  marks: {
    // The two marks an edit leaves come first, so they wrap the model's own.
    struck: {
      attrs: { edit: {} }, inclusive: false, excludes: 'added',
      toDOM: (m) => ['del', { class: 'pm-struck', 'data-edit': String(m.attrs.edit) }, 0],
      parseDOM: [{ tag: 'del[data-edit]', getAttrs: (dom) => ({ edit: Number(dom.getAttribute('data-edit')) }) }],
    },
    added: {
      attrs: { edit: {} }, inclusive: true, excludes: 'struck',
      toDOM: (m) => ['ins', { class: 'pm-added', 'data-edit': String(m.attrs.edit) }, 0],
      parseDOM: [{ tag: 'ins[data-edit]', getAttrs: (dom) => ({ edit: Number(dom.getAttribute('data-edit')) }) }],
    },
    link: {
      attrs: { href: {} }, inclusive: false,
      toDOM: (m) => ['a', { href: m.attrs.href, rel: 'noopener noreferrer nofollow', target: '_blank' }, 0],
      parseDOM: [{ tag: 'a[href]', getAttrs: (dom) => { const href = safeHref(dom.getAttribute('href')); return href ? { href } : false } }],
    },
    bold: { toDOM: () => ['strong', 0], parseDOM: [{ tag: 'strong' }, { tag: 'b' }] },
    italic: { toDOM: () => ['em', 0], parseDOM: [{ tag: 'em' }, { tag: 'i' }] },
    code: { toDOM: () => ['code', 0], parseDOM: [{ tag: 'code' }] },
  },
})

export const { struck: STRUCK, added: ADDED } = schema.marks
export const isEditMark = (m) => m.type === STRUCK || m.type === ADDED
