// The verb reference, docs/verbs.md, written from the registry (stage 15,
// piece 5; C272 (e)), so the document can never drift from what the bar
// does. The `?` reference in the bar is drawn from the same list.
// `npm run reference` writes it; a test fails when it is out of date.

import { GROUPS, LEADERS, VERBS } from './verbs'
import { offered } from '../lib/release'
import { COPY } from '../copy'

const boardName = (key) => COPY.boards[key]?.message ?? key
const code = (s) => `\`${String(s).replace(/`/g, '\\`')}\``
const cell = (s) => String(s).replace(/\|/g, '\\|')

function where(on) {
  if (!on || on === 'everywhere') return 'everywhere'
  return [...new Set([].concat(on).map(boardName))].join(', ')
}

/**
 * @param {Set<string>} built the verbs that do something today; the rest are
 *   listed apart as named, not built
 */
export function verbsMarkdown(built) {
  const out = []
  out.push('# Parliament: every command')
  out.push('')
  out.push('Written from the command registry (`src/commands/verbs.js`) by `npm run reference`. Do not edit by hand: a test fails when this file and the registry differ.')
  out.push('')
  out.push('Type a command in the bar after `>`. The line under the bar says what Enter will do before you press it. Commands stay in English in every language.')
  out.push('')
  out.push(`## ${LEADERS.title.message}`)
  out.push('')
  out.push('| Type | What it does |')
  out.push('| --- | --- |')
  for (const r of LEADERS.rows) out.push(`| ${(r.forms ?? [r.example]).map(code).join(', ')} | ${cell(r.gloss.message)} |`)
  const later = []
  const held = VERBS.filter((v) => !offered(v.verb))
  for (const g of GROUPS) {
    const rows = VERBS.filter((v) => v.group === g.key && offered(v.verb))
    const now = rows.filter((v) => built.has(v.verb))
    later.push(...rows.filter((v) => !built.has(v.verb)))
    if (!now.length) continue
    out.push('')
    out.push(`## ${g.title.message}`)
    out.push('')
    out.push('| Command | What it does | Forms | Works on | `undo:` |')
    out.push('| --- | --- | --- | --- | --- |')
    for (const v of now) {
      const forms = (v.forms ?? [v.example]).map(code).join(', ')
      const notes = [v.spends ? 'Costs: the line names the model and the price first.' : null, v.destructive ? 'Asks for a second Enter.' : null].filter(Boolean).join(' ')
      out.push(`| ${code(v.example)} | ${cell(v.gloss.message)}${notes ? ` ${notes}` : ''} | ${forms} | ${where(v.on)} | ${v.undoable ? 'yes' : 'no'} |`)
    }
  }
  if (later.length) {
    out.push('')
    out.push('## Named, not built yet')
    out.push('')
    out.push('The bar knows these words and says they come later.')
    out.push('')
    for (const v of later) out.push(`- ${code(v.example)}: ${v.gloss.message}`)
  }
  if (held.length) {
    out.push('')
    out.push('## In a later release')
    out.push('')
    out.push('The Lab, where rooms are built, comes in a later release with its commands. The bar knows these words and says so.')
    out.push('')
    for (const v of held) out.push(`- ${code(v.example)}: ${v.gloss.message}`)
  }
  out.push('')
  return out.join('\n')
}
