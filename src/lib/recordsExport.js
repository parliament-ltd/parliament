// Export from Records (refactor-plan.md, stage 6, piece 5; Almanac v30;
// collection board v3; C138): rows as Markdown or JSONL, to read elsewhere.
// It is not a backup and cannot be restored.
//
// What goes in, each once: a plan with its chats; a chat that is not in an
// exported plan, with its notes, keywords and quotes; a note, keyword or
// quote whose chat is not exported. Each item gives its number, kind, title,
// room, dates and tags; a chat its messages (you, the model's name, or the
// source's name) and markings; a source its page, revision and licence.
// Hidden messages stay out and are counted. No settings, no keys, and
// attachments by name only.
//
// exportItems, exportMarkdown, exportJsonl and exportName are pure;
// gatherExport reads what it needs through the accessors it is given.

import { chatMarkdown, markingMarkdown } from './recordsMarkdown'

const MARKS = new Set(['note', 'term', 'quote'])
// The kinds by the words people use (C131), in the file.
const KIND_WORD = Object.freeze({ chat: 'chat', docket: 'plan', note: 'note', term: 'keyword', quote: 'quote' })
const byBranch = (a, b) => String(a.branch ?? '').localeCompare(String(b.branch ?? ''))
const keyOf = (r) => `${r.kind}:${r.id}`

/**
 * The items an export holds, each once, in the order named.
 * @param {object[]} picked rows named, or shown
 * @param {object[]} rows every row of Records
 * @returns {Array<{ row: object, chats?: object[] }>}
 */
export function exportItems(picked, rows) {
  const plans = new Set(picked.filter((r) => r.kind === 'docket').map((r) => r.num))
  const inPlan = new Set(rows.filter((r) => r.kind === 'chat' && plans.has(r.docketNum)).map((r) => r.chatId))
  const chats = new Set([...inPlan, ...picked.filter((r) => r.kind === 'chat').map((r) => r.chatId)])
  const seen = new Set()
  const out = []
  for (const r of picked) {
    if (seen.has(keyOf(r))) continue
    seen.add(keyOf(r))
    if (r.kind === 'docket') out.push({ row: r, chats: rows.filter((c) => c.kind === 'chat' && c.docketNum === r.num).sort(byBranch) })
    else if (r.kind === 'chat') { if (!inPlan.has(r.chatId)) out.push({ row: r }) }
    else if (MARKS.has(r.kind) && !(r.chatId && chats.has(r.chatId))) out.push({ row: r })
  }
  return out
}

/** The chats an export reads messages from. */
export const chatsOf = (items) => items.flatMap((i) => (i.row.kind === 'docket' ? i.chats : i.row.kind === 'chat' ? [i.row] : []))

/**
 * Reads what each item holds: a chat's messages (hidden ones left out and
 * counted), its document's text and its markings.
 * @param {Array<{ row: object, chats?: object[] }>} items from exportItems
 * @param {object[]} rows every row of Records
 * @param {{ messagesOf: (chatId: string) => Promise<object[]>, documentOf: (chatId: string) => Promise<object|null>,
 *   hiddenOf: (chatId: string) => Set<string> }} read
 * @returns {Promise<{ data: object[], hidden: number }>}
 */
export async function gatherExport(items, rows, { messagesOf, documentOf, hiddenOf }) {
  let hidden = 0
  const chat = async (row) => {
    const all = await messagesOf(row.chatId)
    const out = hiddenOf(row.chatId) ?? new Set()
    hidden += all.filter((m) => out.has(m.id) && m.content).length
    const doc = await documentOf(row.chatId)
    return {
      row,
      messages: all.filter((m) => m.content && !out.has(m.id)),
      document: (doc?.paragraphs ?? []).map((p) => p?.text).filter(Boolean),
      markings: rows.filter((r) => MARKS.has(r.kind) && r.chatId && r.chatId === row.chatId),
    }
  }
  const data = []
  for (const item of items) {
    if (item.row.kind === 'docket') data.push({ row: item.row, chats: await Promise.all(item.chats.map(chat)) })
    else if (item.row.kind === 'chat') data.push(await chat(item.row))
    else data.push({ row: item.row })
  }
  return { data, hidden }
}

// ── Markdown ────────────────────────────────────────────

const chatArg = (d, words) => ({
  num: d.row.num,
  title: d.row.title,
  facts: words.facts(d.row),
  messages: d.messages,
  document: d.document,
  markings: d.markings.map((m) => ({ kind: m.kind, num: m.num, text: m.text })),
})

/** The items as Markdown, footnotes numbered across them, one after another. */
export function itemsMarkdown(data, words) {
  const notes = { next: 1 }
  return data.map((d) => {
    if (d.row.kind === 'chat') return chatMarkdown(chatArg(d, words), words, notes)
    if (d.row.kind === 'docket') {
      const head = [`# ${String(d.row.title ?? '').trim() || words.untitled}`, words.facts(d.row).join(' · ')].filter(Boolean)
      return [...head, ...d.chats.map((c) => chatMarkdown(chatArg(c, words), words, notes, 2))].join('\n\n')
    }
    return markingMarkdown({ kind: d.row.kind, num: d.row.num, text: d.row.text, chatNum: d.row.chatNum, erasedFrom: d.row.erasedFrom }, words)
  }).join('\n\n---\n\n')
}

/** A whole export as Markdown: a line saying what it is, then the items. */
export function exportMarkdown(data, words) {
  return `*${words.exported}*\n\n---\n\n${itemsMarkdown(data, words)}\n`
}

// ── JSONL ───────────────────────────────────────────────

/**
 * One line of JSON per item, for reading by other tools. Keys are English,
 * as data; the person's words and the models' are as written.
 * @param {object[]} data from gatherExport
 * @param {{ by: (message: object) => string, room: (row: object) => string }} names
 */
export function exportJsonl(data, names) {
  const message = (m) => ({
    role: m.role,
    by: m.role === 'user' ? null : names.by(m),
    model: m.role === 'assistant' && !m.source ? m.model ?? null : undefined,
    source: m.source?.id
      ? { name: m.source.name ?? m.source.id, page: m.source.title ?? null, url: m.source.url ?? null, revision: m.source.revision ?? null, licence: m.source.licence?.name ?? null }
      : undefined,
    text: m.content,
    at: m.createdAt ?? null,
    attachments: Array.isArray(m.attachmentMeta) && m.attachmentMeta.length ? m.attachmentMeta.map((a) => a.name) : undefined,
  })
  const base = (row) => ({
    num: row.num,
    kind: KIND_WORD[row.kind] ?? row.kind,
    title: row.kind === 'chat' || row.kind === 'docket' ? row.title ?? '' : undefined,
    text: MARKS.has(row.kind) ? row.text ?? '' : undefined,
    room: names.room(row) || null,
    created: row.createdAt ?? null,
    active: row.activeAt ?? null,
    tags: row.tags ?? [],
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived),
  })
  const chat = (d) => ({
    ...base(d.row),
    plan: d.row.docketNum ?? null,
    branch: d.row.branch ?? null,
    messages: d.messages.map(message),
    document: d.document.length ? d.document : undefined,
    markings: d.markings.map((m) => ({ num: m.num, kind: KIND_WORD[m.kind], text: m.text })),
  })
  const line = (d) => {
    if (d.row.kind === 'chat') return chat(d)
    if (d.row.kind === 'docket') return { ...base(d.row), chats: d.chats.map(chat) }
    return { ...base(d.row), from: d.row.chatNum ?? undefined, erasedFrom: d.row.erasedFrom ?? undefined }
  }
  return data.map((d) => JSON.stringify(line(d))).join('\n') + '\n'
}

// ── The file ────────────────────────────────────────────

/**
 * The file's name: numbers and a day, never a title (C138).
 * @param {{ format: 'md'|'jsonl', nums?: number[], scope: 'numbers'|'records'|'shown', day: string }} what
 */
export function exportName({ format, nums = [], scope, day }) {
  const what = scope === 'records' ? 'records'
    : scope === 'shown' ? 'records-shown'
      : nums.length <= 4 ? nums.join('-') : `${nums[0]}-and-${nums.length - 1}-more`
  return `parliament-${what}-${day}.${format === 'jsonl' ? 'jsonl' : 'md'}`
}

/** The media type of a format. */
export const exportType = (format) => (format === 'jsonl' ? 'application/x-ndjson;charset=utf-8' : 'text/markdown;charset=utf-8')
