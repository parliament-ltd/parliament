// Words written straight into the new chrome's markup belong in the copy
// table (src/copy.js), where they can be translated (refactor-plan.md,
// stage 3; C87). This rule finds them: text between tags, a string in braces,
// and the attributes people read (title, placeholder, alt, aria-label).
//
// It applies to the new chrome's folders only (eslint.config.js); today's
// screens are replaced rather than translated. Numbers, punctuation and
// symbols on their own are fine. Commands stay English and are not words of
// the interface: write them as code, `{'>'}` or from the verb registry.

const LETTER = /\p{L}/u
// Addresses are data, not words: 201, 201a, 207b.
const ADDRESS = /\b\d+[a-z]{0,3}\b/giu
const READ_ATTRIBUTES = new Set(['title', 'placeholder', 'alt', 'aria-label', 'aria-description', 'aria-placeholder', 'label'])

const short = (text) => (text.length > 40 ? `${text.slice(0, 39)}…` : text)

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Words of the interface come from the copy table, not the markup' },
    messages: {
      text: 'Words belong in the copy table (src/copy.js), not in the markup: "{{text}}"',
      attribute: 'The {{name}} text belongs in the copy table (src/copy.js): "{{text}}"',
    },
    schema: [],
  },
  create(context) {
    const words = (value) => typeof value === 'string' && LETTER.test(value.replace(ADDRESS, ''))
    return {
      JSXText(node) {
        const text = node.value.trim()
        if (words(text)) context.report({ node, messageId: 'text', data: { text: short(text) } })
      },
      'JSXExpressionContainer > Literal'(node) {
        if (node.parent.parent?.type === 'JSXAttribute') return
        if (words(node.value)) context.report({ node, messageId: 'text', data: { text: short(node.value) } })
      },
      JSXAttribute(node) {
        const name = typeof node.name.name === 'string' ? node.name.name : null
        if (!name || !READ_ATTRIBUTES.has(name)) return
        const v = node.value
        const value = v?.type === 'Literal' ? v.value
          : v?.type === 'JSXExpressionContainer' && v.expression.type === 'Literal' ? v.expression.value
            : null
        if (words(value)) context.report({ node, messageId: 'attribute', data: { name, text: short(value) } })
      },
    }
  },
}
