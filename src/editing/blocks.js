// A reply's editable form as it is stored: `blocks` on its message (C212 (b)).
//
// Parliament's own plain form, never HTML and never the editor's own format,
// so a backup stays readable whatever editor follows. Each block:
//   { id, type, text?, level?, anchor?, kind?, checked?, rows?, data?, struck? }
// type is one of paragraph, heading, list, quote, code, divider, table, chart.
// text is a list of runs: { text, bold?, italic?, code?, link?, struck?, added?,
// ask?, answer?, replaced? } or { break: true } for a line break, or
// { point } for an ask at a point; struck and added hold an edit's id, ask,
// answer, replaced and point an ask's (piece 4; C218).
//
// What is read back is treated as text from outside (a backup, a restored
// file): only known types and fields are taken, every value is made the kind
// it should be, and links keep only web and mail addresses.

import { schema, safeHref, STRUCK, ADDED, ASK, ANSWER, REPLACED } from './schema'

const TYPE_OF = { paragraph: 'paragraph', heading: 'heading', list_item: 'list', quote: 'quote', code_block: 'code', divider: 'divider', table: 'table', chart: 'chart' }
const NODE_OF = Object.fromEntries(Object.entries(TYPE_OF).map(([node, type]) => [type, node]))
const KINDS = ['bullet', 'number', 'check']

const editId = (v) => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length > 0 && v.length <= 64) ? v : null

function runsOf(node) {
  const runs = []
  node.forEach((child) => {
    if (child.type === schema.nodes.ask_point) {
      runs.push({ point: child.attrs.ask })
      return
    }
    const run = child.isText ? { text: child.text } : { break: true }
    for (const m of child.marks) {
      if (m.type === STRUCK) run.struck = m.attrs.edit
      else if (m.type === ADDED) run.added = m.attrs.edit
      else if (m.type === ASK) run.ask = m.attrs.ask
      else if (m.type === ANSWER) run.answer = m.attrs.ask
      else if (m.type === REPLACED) run.replaced = m.attrs.ask
      else if (m.type === schema.marks.link) run.link = m.attrs.href
      else if (m.type === schema.marks.bold) run.bold = true
      else if (m.type === schema.marks.italic) run.italic = true
      else if (m.type === schema.marks.code) run.code = true
    }
    runs.push(run)
  })
  return runs
}

/** A reply's document in its stored form. */
export function toBlocks(doc) {
  const out = []
  doc.forEach((node) => {
    const type = TYPE_OF[node.type.name]
    if (!type) return
    // An empty line opened between two blocks is not part of the reply.
    if (node.attrs.gap && node.content.size === 0) return
    const b = { id: node.attrs.id, type }
    if (node.isTextblock) b.text = runsOf(node)
    if (type === 'heading') {
      b.level = node.attrs.level
      if (node.attrs.anchor) b.anchor = node.attrs.anchor
    }
    if (type === 'list') {
      b.kind = node.attrs.kind
      if (node.attrs.checked) b.checked = true
    }
    if (type === 'table') b.rows = node.attrs.rows.map((row) => row.map(String))
    if (type === 'chart') b.data = node.attrs.data
    if (node.attrs.struck != null) b.struck = node.attrs.struck
    out.push(b)
  })
  return out
}

function inlineOf(runs, codeLine) {
  const nodes = []
  for (const r of Array.isArray(runs) ? runs : []) {
    if (!r || typeof r !== 'object') continue
    if (editId(r.point) != null) {
      if (!codeLine) nodes.push(schema.nodes.ask_point.create({ ask: r.point }))
      continue
    }
    const marks = []
    const s = editId(r.struck)
    const a = s == null ? editId(r.added) : null
    if (s != null) marks.push(STRUCK.create({ edit: s }))
    if (a != null) marks.push(ADDED.create({ edit: a }))
    for (const [key, type] of [['ask', ASK], ['answer', ANSWER], ['replaced', REPLACED]]) {
      if (!codeLine && editId(r[key]) != null) marks.push(type.create({ ask: r[key] }))
    }
    if (!codeLine) {
      const href = r.link ? safeHref(r.link) : null
      if (href) marks.push(schema.marks.link.create({ href }))
      if (r.bold === true) marks.push(schema.marks.bold.create())
      if (r.italic === true) marks.push(schema.marks.italic.create())
      if (r.code === true) marks.push(schema.marks.code.create())
    }
    if (r.break === true && !codeLine) {
      nodes.push(schema.nodes.hard_break.create(null, null, marks))
      continue
    }
    const text = typeof r.text === 'string' ? r.text : ''
    if (text) nodes.push(schema.text(text, marks))
  }
  return nodes
}

/**
 * The words still standing in a stored form, as plain text: struck words
 * left out, the person's kept; a line each, lists marked as typed. What an
 * edited prompt now asks (again:), and what joining a prompt to its reply
 * puts in the bar (C214 (b)). A table or chart struck whole is left out; one
 * standing is written as its text.
 * @param {unknown} blocks
 * @returns {string}
 */
export function wordsOf(blocks) {
  if (!Array.isArray(blocks)) return ''
  const lines = []
  let number = 0
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue
    if (b.type !== 'list' || b.kind !== 'number') number = 0
    if (editId(b.struck) != null) continue
    if (b.type === 'divider') { lines.push('---'); continue }
    if (b.type === 'table') {
      lines.push((Array.isArray(b.rows) ? b.rows : []).filter(Array.isArray).map((r) => r.map((c) => String(c ?? '')).join(' | ')).join('\n'))
      continue
    }
    if (b.type === 'chart') continue
    const text = (Array.isArray(b.text) ? b.text : [])
      // An answer not yet accepted is not the reply's yet (C218).
      .filter((r) => r && typeof r === 'object' && editId(r.struck) == null && editId(r.answer) == null)
      .map((r) => (r.break === true ? '\n' : typeof r.text === 'string' ? r.text : ''))
      .join('')
    if (b.type === 'heading') lines.push(`${'#'.repeat([1, 2, 3].includes(b.level) ? b.level : 1)} ${text}`)
    else if (b.type === 'list') lines.push(`${b.kind === 'number' ? `${++number}.` : b.kind === 'check' ? (b.checked ? '- [x]' : '- [ ]') : '-'} ${text}`)
    else if (b.type === 'quote') lines.push(`> ${text}`)
    else if (b.type === 'code') lines.push(`\`\`\`\n${text}\n\`\`\``)
    else lines.push(text)
  }
  return lines.filter((l) => l.trim() !== '').join('\n\n').trim()
}

/**
 * A stored reply's document, or null when nothing usable is stored.
 * @param {unknown} blocks the stored form
 * @param {() => string} nextBlockId for a block that came without an id
 */
export function fromBlocks(blocks, nextBlockId) {
  if (!Array.isArray(blocks)) return null
  const nodes = []
  const seen = new Set()
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue
    const name = NODE_OF[b.type]
    if (!name) continue
    let id = typeof b.id === 'string' && b.id && b.id.length <= 64 ? b.id : nextBlockId()
    if (seen.has(id)) id = nextBlockId()
    seen.add(id)
    const struck = editId(b.struck)
    const attrs = { id }
    if (name === 'heading') {
      attrs.level = [1, 2, 3].includes(b.level) ? b.level : 1
      attrs.anchor = typeof b.anchor === 'string' && /^[\w-]{1,120}$/.test(b.anchor) ? b.anchor : null
    }
    if (name === 'list_item') {
      attrs.kind = KINDS.includes(b.kind) ? b.kind : 'bullet'
      attrs.checked = b.checked === true
    }
    if (name === 'divider' || name === 'table' || name === 'chart') attrs.struck = struck
    if (name === 'table') attrs.rows = Array.isArray(b.rows) ? b.rows.filter(Array.isArray).map((row) => row.map((c) => String(c ?? ''))) : []
    if (name === 'chart') attrs.data = typeof b.data === 'string' ? b.data : ''
    const type = schema.nodes[name]
    nodes.push(type.isTextblock ? type.create(attrs, inlineOf(b.text, name === 'code_block')) : type.create(attrs))
  }
  if (!nodes.length) return null
  return schema.nodes.doc.create(null, nodes)
}
