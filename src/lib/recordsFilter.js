// Search and filters on Records (refactor-plan.md, stage 6, piece 1;
// Almanac v30's filter schemes; C132, C133).
//
// The view is what the table shows: a search, the filters in force and an
// order. Search narrows as it is typed; filters are commands, applied on
// Enter and kept until cleared (C132 (b)). Commas mean "or", a minus leaves
// out, two filters of one kind on one line must both hold, and a filter
// typed later replaces the earlier one of its kind (v30).
//
// Keywords and quotes are rows only when filtered for, or when a search
// finds their words (A19, C133): the table at rest shows chats, plans and
// notes. Archived rows show only under in:archive (C135, C143 (c)).
//
// Pure: rows come from almanacRows.js, and the names people read (rooms,
// collections, models, sources) come in through ctx, so nothing here needs
// the copy table or the stores.

/** The filters, in the order the line at the top of Records lists them. */
export const FILTERS = Object.freeze(['type', 'tag', 'in', 'has', 'from', 'model', 'cost', 'since', 'until'])
/** What clear: takes: everything, the search, the order, or one kind of filter. */
export const CLEARS = Object.freeze(['filters', 'search', 'sort', ...FILTERS])

const DEFAULT_SORT = Object.freeze({ by: 'active', asc: false })
export const EMPTY_VIEW = Object.freeze({ search: '', filters: Object.freeze([]), sort: DEFAULT_SORT })

// The kinds as people name them (C131) and as rows carry them.
const TYPE_KIND = Object.freeze({ chat: 'chat', note: 'note', keyword: 'term', quote: 'quote', plan: 'docket', highlight: 'highlight', edit: 'edit', ask: 'ask', suggestion: 'suggestion' })
const HAS_KIND = Object.freeze({ note: 'note', keyword: 'term', quote: 'quote', highlight: 'highlight' })
// Rows only when filtered for, or found by a search (A19; C133). One line.
const ON_REQUEST = new Set(['term', 'quote'])
// Rows only under their own type: filter (C56, C220 (j)): not even a search finds them.
const ONLY_TYPED = new Set(['edit', 'ask', 'suggestion'])
/** Whether a row is an edit, an ask or a suggestion: a change in a reply, acted on by its own commands (C220, C229). */
export const isChangeRow = (row) => Boolean(row) && ONLY_TYPED.has(row.kind)

const DAY = 86_400_000
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

const lower = (text) => String(text ?? '').toLocaleLowerCase()
const isDefaultSort = (sort) => !sort || (sort.by === DEFAULT_SORT.by && sort.asc === DEFAULT_SORT.asc)

/** True when the view shows the table at rest. */
export const isAtRest = (view) => !view?.search?.trim() && !view?.filters?.length && isDefaultSort(view?.sort)

// ── Reading one filter ──────────────────────────────────

// The arguments of a command, lists opened out.
const flat = (values = []) => values.flatMap((a) => (a.kind === 'list' ? a.items : [a]))
// An argument as the person wrote it: quoted text without its quotes.
const typed = (a) => (a?.kind === 'text' ? a.value : a?.text ?? '')
// An argument written back into a command, quoted when it needs to be.
const written = (a) => {
  const t = typed(a)
  return /[\s,"]/.test(t) || t === '' ? `"${t}"` : t
}

// A day from what since: or until: was given (C132 (e)): 7d, 3w, 2m, 1y,
// today, yesterday, a month's English name, 2026-09-01, or a date with
// slashes in the order the reader's language writes dates. since: takes the
// start of the day, until: its end. Null when it cannot be read.
function slashOrder(locale) {
  try {
    const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date(2026, 10, 22))
    return parts.filter((p) => ['day', 'month', 'year'].includes(p.type)).map((p) => p.type)
  } catch {
    return ['month', 'day', 'year']
  }
}

function dayStart(y, m, d) {
  const t = new Date(y, m, d)
  return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d ? t : null
}

/**
 * @param {string} value as typed
 * @param {{ now?: number, locale?: string, end?: boolean }} [opts]
 * @returns {{ at: number, day: string }|null} at: the moment it means; day: that day, as 2026-09-01
 */
export function readDay(value, { now = Date.now(), locale = 'en', end = false } = {}) {
  const v = lower(value).trim()
  const today = new Date(now)
  let start = null
  let last = null // the last day of a month, for until:
  let m
  if ((m = /^(\d{1,4})\s*([dwmy])$/.exec(v))) {
    const n = Number(m[1])
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (m[2] === 'd') d.setDate(d.getDate() - n)
    if (m[2] === 'w') d.setDate(d.getDate() - 7 * n)
    if (m[2] === 'm') d.setMonth(d.getMonth() - n)
    if (m[2] === 'y') d.setFullYear(d.getFullYear() - n)
    start = d
  } else if (v === 'today' || v === 'yesterday') {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (v === 'yesterday' ? 1 : 0))
  } else if (v.length >= 3 && MONTHS.some((name) => name.startsWith(v))) {
    // The last such month that has begun: in October, september is this
    // year's and november last year's.
    const month = MONTHS.findIndex((name) => name.startsWith(v))
    const year = month <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1
    start = new Date(year, month, 1)
    last = new Date(year, month + 1, 0)
  } else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v))) {
    start = dayStart(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  } else if ((m = /^(\d{1,4})[/.](\d{1,2})[/.](\d{1,4})$/.exec(v))) {
    const order = /^\d{4}$/.test(m[1]) ? ['year', 'month', 'day'] : slashOrder(locale)
    const got = {}
    order.forEach((part, i) => { got[part] = Number(m[i + 1]) })
    const year = got.year < 100 ? 2000 + got.year : got.year
    start = dayStart(year, got.month - 1, got.day)
  }
  if (!start) return null
  const day = end && last ? last : start
  const at = end ? new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime() - 1 : start.getTime()
  const pad = (n) => String(n).padStart(2, '0')
  return { at, day: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}` }
}

/** An amount for cost: (C132 (h)): >0.50, <=1, 0.18, $2. Null when it cannot be read. */
export function readCost(value) {
  const m = /^([<>]=?)?\$?(\d*\.?\d+)$/.exec(String(value ?? '').replace(/\s/g, ''))
  return m ? { op: m[1] ?? '=', n: Number(m[2]) } : null
}

// A name as typed against names people read: the same name first, then
// names that start with it.
function byName(name, list) {
  const n = lower(name).trim()
  const same = list.filter((x) => lower(x.label) === n)
  return same.length ? same : list.filter((x) => lower(x.label).startsWith(n))
}

/**
 * One filter command, read and checked against what is here.
 * @param {{ verb: string, minus?: boolean, match: { values: object[] } }} step a command the registry matched
 * @param {{ rows?: object[], rooms?: Array<{ id: string, label: string }>, collections?: Array<{ id: string, label: string }>,
 *   now?: number, locale?: string }} ctx
 * @returns {{ filter: { k: string, neg: boolean, v: Array<*>, text: string } }|{ bad: { message: string, values?: object } }}
 *   text: the filter as a command, for the line at the top of Records
 */
export function readFilter(step, ctx = {}) {
  const k = step.verb
  const neg = Boolean(step.minus)
  const args = flat(step.match?.values ?? [])
  const head = `${neg ? '-' : ''}${k}:`
  const text = `${head}${args.map(written).join(',')}`
  const ok = (v, shown = text) => ({ filter: { k, neg, v, text: shown } })

  switch (k) {
    case 'type': return ok(args.map((a) => TYPE_KIND[a.value]))
    case 'has': return ok(args.map((a) => HAS_KIND[a.value]))
    case 'tag':
    case 'model': return ok(args.map((a) => lower(typed(a))))
    case 'from': {
      if (args[0]?.kind === 'word' && args[0].value === 'run') return ok([{ run: args[1].value }], `${head}run ${args[1].value}`)
      const rows = ctx.rows ?? []
      const v = []
      for (const a of args) {
        const chat = rows.find((r) => r.kind === 'chat' && r.num === a.num)
        const plan = rows.some((r) => r.docketNum === a.num)
        if (a.letter) {
          if (!rows.some((r) => r.docketNum === a.num && r.branch === a.letter)) return { bad: { message: 'numNone', values: { num: a.text } } }
          v.push({ plan: a.num, branch: a.letter })
        } else if (chat) v.push({ chat: a.num })
        else if (plan) v.push({ plan: a.num })
        else if (rows.some((r) => r.num === a.num)) return { bad: { message: 'fromWhat', values: { num: a.num } } }
        else return { bad: { message: 'numNone', values: { num: a.num } } }
      }
      return ok(v)
    }
    case 'in': {
      // A trailing room or collection says which, where both have the name (C132 (f)).
      const raw = step.match?.values ?? []
      const last = raw[raw.length - 1]
      const which = raw.length > 1 && last.kind === 'word' && (last.value === 'room' || last.value === 'collection') ? last.value : null
      const names = flat(which ? raw.slice(0, -1) : raw)
      const rooms = new Set()
      const collections = new Set()
      let archive = false
      for (const a of names) {
        const name = typed(a)
        // in:archive: what is archived, unless a room or collection is meant (C143 (c)).
        if (!which && name.trim().toLocaleLowerCase() === 'archive') { archive = true; continue }
        const r = which === 'collection' ? [] : byName(name, ctx.rooms ?? [])
        const c = which === 'room' ? [] : byName(name, ctx.collections ?? [])
        if (r.length && c.length) return { bad: { message: 'inWhich', values: { name } } }
        if (!r.length && !c.length) {
          const message = which === 'room' ? 'inNoRoom' : which === 'collection' ? 'inNoCollection' : 'inNone'
          return { bad: { message, values: { name } } }
        }
        r.forEach((x) => rooms.add(x.id))
        c.forEach((x) => collections.add(x.id))
      }
      const shown = `${head}${names.map(written).join(',')}${which ? ` ${which}` : ''}`
      return ok([{ rooms: [...rooms], collections: [...collections], archive }], shown)
    }
    case 'cost': {
      const v = args.map((a) => readCost(typed(a)))
      if (v.some((x) => !x)) return { bad: { message: 'costBad' } }
      return ok(v)
    }
    case 'since':
    case 'until': {
      const v = args.map((a) => readDay(typed(a), { now: ctx.now, locale: ctx.locale, end: k === 'until' }))
      if (!v.length || v.some((x) => !x)) return { bad: { message: 'dateBad', values: { verb: `${k}:` } } }
      return ok(v)
    }
    default:
      return { bad: { message: 'later', values: { verb: `${k}:` } } }
  }
}

/** sort: created, active, oldest or newest. Oldest and newest keep what is sorted by (v30). */
export function readSort(word, sort = DEFAULT_SORT) {
  if (word === 'created' || word === 'active') return { by: word, asc: false }
  return { by: sort.by, asc: word === 'oldest' }
}

// ── Changing the view ───────────────────────────────────

/**
 * The view after one line of commands, in the order they were typed: each
 * `{ filter }`, `{ sort }`, `{ clear }`, or `{ replace }` for a whole view
 * (a saved search, C140). A filter typed on this line
 * replaces the ones of its kind from before; two of one kind on this line
 * must both hold.
 * @returns {object} the new view
 */
export function nextView(view = EMPTY_VIEW, steps = []) {
  let next = { search: view.search ?? '', filters: [...(view.filters ?? [])], sort: view.sort ?? DEFAULT_SORT }
  const named = new Set()
  for (const s of steps) {
    if (s.replace) {
      next = { search: s.replace.search ?? '', filters: [...(s.replace.filters ?? [])], sort: s.replace.sort ?? DEFAULT_SORT }
      named.clear()
    } else if (s.clear) {
      if (s.clear === 'filters') next = { search: '', filters: [], sort: DEFAULT_SORT }
      else if (s.clear === 'search') next = { ...next, search: '' }
      else if (s.clear === 'sort') next = { ...next, sort: DEFAULT_SORT }
      else next = { ...next, filters: next.filters.filter((f) => f.k !== s.clear) }
    } else if (s.sort) {
      next = { ...next, sort: s.sort }
    } else if (s.filter) {
      const { k } = s.filter
      if (!named.has(k)) {
        next = { ...next, filters: next.filters.filter((f) => f.k !== k) }
        named.add(k)
      }
      next = { ...next, filters: [...next.filters, s.filter] }
    }
  }
  return next
}

/** What clear:<word> would remove from this view, or null when there is nothing to. */
export function clears(view = EMPTY_VIEW, word) {
  if (word === 'filters') return isAtRest(view) ? null : { what: 'filters' }
  if (word === 'search') return view.search?.trim() ? { what: 'search' } : null
  if (word === 'sort') return isDefaultSort(view.sort) ? null : { what: 'sort' }
  const gone = (view.filters ?? []).filter((f) => f.k === word)
  return gone.length ? { what: 'filter', filters: gone.map((f) => f.text) } : null
}

// ── Showing ─────────────────────────────────────────────

/** The words of a search: every word must appear; quotes keep a phrase together. */
export function searchTerms(text) {
  const out = []
  const re = /"([^"]*)"|“([^”]*)”|(\S+)/g
  let m
  while ((m = re.exec(String(text ?? '')))) {
    const term = lower(m[1] ?? m[2] ?? m[3]).trim()
    if (term) out.push(term)
  }
  return out
}

// Everything a row can be found by, in lower case: its title, summary,
// text, tags and room, and the words inside a chat.
const hay = new WeakMap()
function haystack(row, ctx) {
  if (!hay.has(row)) {
    const room = ctx.roomLabel?.(row) ?? ''
    hay.set(row, lower([row.title, row.summary, row.text, (row.tags ?? []).join(' '), room].filter(Boolean).join('\n')) + (row.words ? `\n${row.words}` : ''))
  }
  return hay.get(row)
}

// Whether a model or a source answered, by any part of its id or name.
function answeredBy(row, value, ctx) {
  const named = (list, id) => list.find((x) => x.id === id || x.apiId === id)
  const has = (id, list) => lower(id).includes(value) || lower(named(list, id)?.name).includes(value)
  return (row.models ?? []).some((id) => has(id, ctx.models ?? [])) || (row.sources ?? []).some((id) => has(id, ctx.sources ?? []))
}

function costFits(cost, { op, n }) {
  if (cost == null) return false
  if (op === '>') return cost > n
  if (op === '>=') return cost >= n
  if (op === '<') return cost < n
  if (op === '<=') return cost <= n
  return Math.abs(cost - n) < 0.005
}

const at = (iso) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? t : null
}

/** Whether a row passes one filter. */
export function passes(row, f, ctx = {}) {
  const hit = f.v.some((v) => {
    switch (f.k) {
      case 'type': return row.kind === v
      case 'tag': return (row.tags ?? []).some((t) => lower(t) === v || lower(t).startsWith(v))
      case 'model': return answeredBy(row, v, ctx)
      case 'has': return (row.marks ?? []).includes(v)
      case 'in': return (v.archive && Boolean(row.archived)) || (row.roomId != null && v.rooms.includes(row.roomId)) || (row.collections ?? []).some((c) => v.collections.includes(c))
      case 'from':
        if (v.run != null) return row.run === v.run
        if (v.chat != null) return row.chatNum === v.chat && row.kind !== 'chat'
        if (v.branch) return row.docketNum === v.plan && row.branch === v.branch
        return row.docketNum === v.plan && row.kind !== 'docket'
      case 'cost': return (row.kind === 'chat' || row.kind === 'docket') && costFits(row.cost, v)
      case 'since': { const t = at(row.createdAt); return t != null && t >= v.at }
      case 'until': { const t = at(row.createdAt); return t != null && t <= v.at }
      default: return true
    }
  })
  return f.neg ? !hit : hit
}

const time = (iso) => at(iso) ?? 0

function order(rows, sort = DEFAULT_SORT) {
  const key = sort.by === 'created' ? 'createdAt' : 'activeAt'
  const dir = sort.asc ? 1 : -1
  return [...rows].sort((a, b) => (
    Number(b.pinned) - Number(a.pinned)
    || dir * (time(a[key]) - time(b[key]))
    || dir * (a.num - b.num)
  ))
}

/**
 * The rows the view shows, in its order. Pinned rows lead whatever the
 * order (v30).
 * @param {object[]} rows from almanacRows.js
 * @param {object} view
 * @param {{ roomLabel?: (row: object) => string, models?: object[], sources?: object[] }} ctx
 */
export function applyView(rows, view = EMPTY_VIEW, ctx = {}) {
  const terms = searchTerms(view.search)
  const filters = view.filters ?? []
  const asked = new Set(filters.filter((f) => f.k === 'type' && !f.neg).flatMap((f) => f.v))
  // A tag: filter asks for what carries the tag, keywords and quotes too, so
  // tag:favorite lists every favourite (A19, C147 (a)).
  const byTag = filters.some((f) => f.k === 'tag' && !f.neg)
  const archive = filters.some((f) => f.k === 'in' && !f.neg && f.v.some((x) => x.archive))
  const shown = rows.filter((row) => {
    if (row.archived && !archive) return false
    const found = terms.length > 0 && terms.every((t) => haystack(row, ctx).includes(t))
    if (terms.length && !found) return false
    if (ONLY_TYPED.has(row.kind) && !asked.has(row.kind)) return false
    if (ON_REQUEST.has(row.kind) && !asked.has(row.kind) && !found && !byTag) return false
    return filters.every((f) => passes(row, f, ctx))
  })
  return order(shown, view.sort)
}

/**
 * How many rows a cost: filter leaves out because their cost is not known
 * (C132 (h)): the chats and plans that pass everything else.
 */
export function costUnknown(rows, view, ctx = {}) {
  if (!(view.filters ?? []).some((f) => f.k === 'cost')) return 0
  const rest = { ...view, filters: view.filters.filter((f) => f.k !== 'cost') }
  return applyView(rows, rest, ctx).filter((r) => (r.kind === 'chat' || r.kind === 'docket') && r.cost == null).length
}

/** The view as commands, in order, for the line at the top of Records. */
export function viewLine(view = EMPTY_VIEW) {
  const filters = [...(view.filters ?? [])].sort((a, b) => FILTERS.indexOf(a.k) - FILTERS.indexOf(b.k))
  const out = filters.map((f) => ({ k: f.k, text: f.text }))
  if (!isDefaultSort(view.sort)) {
    const word = view.sort.asc ? 'oldest' : view.sort.by === 'created' ? 'created' : 'newest'
    out.push({ k: 'sort', text: view.sort.asc && view.sort.by === 'created' ? 'sort:created sort:oldest' : `sort:${word}` })
  }
  return out
}
