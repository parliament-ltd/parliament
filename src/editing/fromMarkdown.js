// A reply's Markdown, as stored, read into the blocks of schema.js (stage 11,
// piece 1). The stored text is never changed: the editable form is made from
// it, and the model goes on reading the original (editing spec, "When edits
// reach the model"; C212 (b)). Read by the same rules as every reply drawn
// as Markdown (Markdown.jsx): HTML in the text stays text, links keep only
// web and mail addresses, and an image is never loaded but becomes a link
// named by its alt text.
//
// unified and remark-parse arrive with react-markdown, which draws replies.

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { schema, safeHref } from './schema'

const parser = unified().use(remarkParse).use(remarkGfm)

// Every text the model wrote, flattened: for table cells and anything with no
// place of its own.
function plain(node) {
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code' || node.type === 'html') return node.value ?? ''
  if (node.type === 'break') return ' '
  if (node.type === 'image') return node.alt ? `[${node.alt}]` : ''
  return (node.children ?? []).map(plain).join('')
}

function inline(nodes, marks = []) {
  const out = []
  for (const n of nodes ?? []) {
    if (n.type === 'text' || n.type === 'html') {
      if (n.value) out.push(schema.text(n.value, marks))
    } else if (n.type === 'inlineCode') {
      if (n.value) out.push(schema.text(n.value, [...marks, schema.marks.code.create()]))
    } else if (n.type === 'strong') {
      out.push(...inline(n.children, [...marks, schema.marks.bold.create()]))
    } else if (n.type === 'emphasis') {
      out.push(...inline(n.children, [...marks, schema.marks.italic.create()]))
    } else if (n.type === 'link') {
      const href = safeHref(n.url)
      out.push(...inline(n.children, href ? [...marks, schema.marks.link.create({ href })] : marks))
    } else if (n.type === 'image') {
      const href = safeHref(n.url)
      const label = n.alt || n.url || ''
      if (label) out.push(schema.text(label, href ? [...marks, schema.marks.link.create({ href })] : marks))
    } else if (n.type === 'break') {
      out.push(schema.nodes.hard_break.create(null, null, marks))
    } else {
      // Strikethrough the model wrote (~~ ~~), images, footnotes: their words, plainly.
      const text = plain(n)
      if (text) out.push(schema.text(text, marks))
    }
  }
  return out
}

// A chart keeps its own text, drawn by the chart renderer every reply uses.
const chartFrom = (code, attrs) => schema.nodes.chart.create({ ...attrs, data: String(code ?? '') })

/**
 * The blocks of a reply.
 * @param {string} markdown the reply as stored
 * @param {() => string} nextBlockId gives each block its id
 * @param {{ anchors?: string }} [opts] anchors: the prefix of the ids the
 *   table of contents finds headings by (msg-<message id>), counted as it
 *   counts them, levels 1 to 4 in order
 */
export function replyFromMarkdown(markdown, nextBlockId, { anchors = null } = {}) {
  const tree = parser.parse(String(markdown ?? ''))
  const blocks = []
  let headings = 0
  const attrs = () => ({ id: nextBlockId() })
  const walk = (node, inQuote = false) => {
    switch (node.type) {
      case 'heading':
        blocks.push(schema.nodes.heading.create({
          ...attrs(),
          level: Math.min(3, node.depth),
          anchor: anchors && node.depth <= 4 ? `${anchors}-h-${headings++}` : null,
        }, inline(node.children)))
        break
      case 'paragraph':
        blocks.push((inQuote ? schema.nodes.quote : schema.nodes.paragraph).create(attrs(), inline(node.children)))
        break
      case 'blockquote':
        for (const c of node.children) walk(c, true)
        break
      case 'list':
        for (const item of node.children) {
          const kind = item.checked != null ? 'check' : node.ordered ? 'number' : 'bullet'
          item.children.forEach((c, i) => {
            if (i === 0 && c.type === 'paragraph') blocks.push(schema.nodes.list_item.create({ ...attrs(), kind, checked: Boolean(item.checked) }, inline(c.children)))
            else walk(c, inQuote)
          })
        }
        break
      case 'code': {
        const chart = node.lang === 'chart' ? chartFrom(node.value, attrs()) : null
        blocks.push(chart ?? schema.nodes.code_block.create(attrs(), node.value ? schema.text(node.value) : null))
        break
      }
      case 'thematicBreak':
        blocks.push(schema.nodes.divider.create(attrs()))
        break
      case 'table': {
        // Cells keep the model's bold, italics, code and links (C222 (a)).
        const table = attrs()
        const rows = node.children.filter((row) => row.children.length).map((row, r) => schema.nodes.table_row.create(null, row.children.map((cell) => schema.nodes.table_cell.create({ id: nextBlockId(), header: r === 0 }, inline(cell.children)))))
        if (rows.length) blocks.push(schema.nodes.table.create(table, rows))
        break
      }
      default: {
        const text = plain(node)
        if (text) blocks.push(schema.nodes.paragraph.create(attrs(), schema.text(text)))
      }
    }
  }
  for (const node of tree.children) walk(node)
  if (!blocks.length) blocks.push(schema.nodes.paragraph.create(attrs()))
  return schema.nodes.doc.create(null, blocks)
}

/** A prompt: its lines as paragraphs, no formatting read into it. */
export function promptFromText(text, nextBlockId) {
  const lines = String(text ?? '').split('\n')
  return schema.nodes.doc.create(null, lines.map((line) => schema.nodes.paragraph.create({ id: nextBlockId() }, line ? schema.text(line) : null)))
}
