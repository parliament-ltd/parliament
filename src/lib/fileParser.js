/**
 * fileParser.js — Pelican file parsing + compression
 *
 * Supports: CSV, TSV, XLSX, JSON
 *
 * Text formats (CSV/TSV/JSON) are gzip-compressed before storage using the
 * native Compression Streams API — no library required, ~70-90% size reduction.
 * XLSX files are already ZIP-compressed internally, stored as raw ArrayBuffer.
 *
 * Exported functions:
 *   parseFile(file)          → { headers, rows, columnTypes, meta }
 *   compressForStorage(file) → ArrayBuffer (compressed bytes)
 *   decompressFromStorage(ab, type) → parsed { headers, rows, columnTypes }
 *   buildColumnStats(headers, rows, columnTypes) → columnStats[]
 *   buildDataSample(headers, rows, maxRows) → CSV string for Claude prompts
 */

import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ─── Type Inference ───────────────────────────────────────

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                   // 2025-07-01
  /^\d{2}\/\d{2}\/\d{4}$/,                 // 07/01/2025
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,        // ISO datetime
]

function inferType(values) {
  const nonNull = values.filter(v => v !== null && v !== '' && v !== undefined)
  if (nonNull.length === 0) return 'string'

  const sample = nonNull.slice(0, 50)

  if (sample.every(v => typeof v === 'boolean' || v === 'true' || v === 'false' || v === 'TRUE' || v === 'FALSE')) {
    return 'boolean'
  }
  if (sample.every(v => !isNaN(parseFloat(v)) && isFinite(v))) {
    return 'number'
  }
  if (sample.every(v => DATE_PATTERNS.some(p => p.test(String(v).trim())))) {
    return 'date'
  }
  return 'string'
}

function inferColumnTypes(headers, rows) {
  const types = {}
  for (const header of headers) {
    const values = rows.map(row => row[header])
    types[header] = inferType(values)
  }
  return types
}

// ─── CSV / TSV Parsing ────────────────────────────────────

function parseCSVText(text, delimiter = ',') {
  const result = Papa.parse(text, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: h => h.trim(),
  })

  const headers = result.meta.fields || []
  const rows = result.data
  const columnTypes = inferColumnTypes(headers, rows)

  return { headers, rows, columnTypes }
}

// ─── XLSX Parsing ─────────────────────────────────────────

function parseXLSXBuffer(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  const json = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })
  if (json.length === 0) return { headers: [], rows: [], columnTypes: {} }

  const headers = Object.keys(json[0]).map(h => String(h).trim())
  const rows = json.map(row => {
    const clean = {}
    for (const h of headers) clean[h] = row[h] ?? null
    return clean
  })

  const columnTypes = inferColumnTypes(headers, rows)
  return { headers, rows, columnTypes }
}

// ─── JSON Parsing ─────────────────────────────────────────

function parseJSONText(text) {
  const data = JSON.parse(text)
  const arr = Array.isArray(data) ? data : data.data || data.rows || []
  if (arr.length === 0) return { headers: [], rows: [], columnTypes: {} }

  const headers = Object.keys(arr[0]).map(h => String(h).trim())
  const rows = arr.map(row => {
    const clean = {}
    for (const h of headers) clean[h] = row[h] ?? null
    return clean
  })

  const columnTypes = inferColumnTypes(headers, rows)
  return { headers, rows, columnTypes }
}

// ─── Main Entry: parseFile ────────────────────────────────

/**
 * Parse a File object into structured data.
 * @param {File} file
 * @returns {Promise<{ headers, rows, columnTypes, meta }>}
 *   meta: { name, type, rows (count), cols, sizeBytes }
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  let parsed

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer()
    parsed = parseXLSXBuffer(buffer)
  } else if (ext === 'tsv') {
    const text = await file.text()
    parsed = parseCSVText(text, '\t')
  } else if (ext === 'json') {
    const text = await file.text()
    parsed = parseJSONText(text)
  } else {
    // Default: CSV
    const text = await file.text()
    parsed = parseCSVText(text)
  }

  return {
    ...parsed,
    meta: {
      name: file.name,
      type: ext === 'xlsx' || ext === 'xls' ? 'xlsx'
          : ext === 'tsv' ? 'tsv'
          : ext === 'json' ? 'json'
          : 'csv',
      rows: parsed.rows.length,
      cols: parsed.headers.length,
      sizeBytes: file.size,
    },
  }
}

// ─── Compression ──────────────────────────────────────────

/**
 * Compress a File for persistent storage in IndexedDB.
 * - Text files (CSV/TSV/JSON): gzip-compressed via Compression Streams API
 * - XLSX/XLS: stored as raw ArrayBuffer (already ZIP-compressed)
 * @returns {Promise<ArrayBuffer>}
 */
export async function compressForStorage(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'xlsx' || ext === 'xls') {
    return file.arrayBuffer()
  }

  // Text: read → gzip compress
  const text = await file.text()
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)

  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(bytes)
  writer.close()

  const chunks = []
  const reader = cs.readable.getReader()
  let done = false
  while (!done) {
    const { value, done: d } = await reader.read()
    if (value) chunks.push(value)
    done = d
  }

  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result.buffer
}

// ─── Decompression + Re-parse ─────────────────────────────

/**
 * Decompress stored bytes and re-parse into structured data.
 * @param {ArrayBuffer} storedBuffer - from IndexedDB file_data store
 * @param {string} type - 'csv' | 'tsv' | 'xlsx' | 'xls' | 'json'
 * @returns {Promise<{ headers, rows, columnTypes }>}
 */
export async function decompressFromStorage(storedBuffer, type) {
  if (type === 'xlsx' || type === 'xls') {
    return parseXLSXBuffer(storedBuffer)
  }

  // Decompress gzip → text
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(new Uint8Array(storedBuffer))
  writer.close()

  const chunks = []
  const reader = ds.readable.getReader()
  let done = false
  while (!done) {
    const { value, done: d } = await reader.read()
    if (value) chunks.push(value)
    done = d
  }

  const decoder = new TextDecoder()
  const text = chunks.map(c => decoder.decode(c, { stream: true })).join('')

  if (type === 'json') return parseJSONText(text)
  if (type === 'tsv') return parseCSVText(text, '\t')
  return parseCSVText(text)
}

// ─── Column Statistics ────────────────────────────────────

/**
 * Build per-column stats for the Inspector panel.
 * @returns {Array<{ name, type, nulls, unique, sample }>}
 */
export function buildColumnStats(headers, rows, columnTypes) {
  return headers.map(header => {
    const values = rows.map(r => r[header])
    const nullCount = values.filter(v => v === null || v === '' || v === undefined).length
    const nonNull = values.filter(v => v !== null && v !== '' && v !== undefined)
    const uniqueCount = new Set(nonNull.map(String)).size
    const sample = nonNull[0] != null ? String(nonNull[0]) : '—'

    return {
      name: header,
      type: columnTypes[header] || 'string',
      nulls: nullCount,
      unique: uniqueCount,
      sample: sample.length > 20 ? sample.slice(0, 20) + '…' : sample,
    }
  })
}

// ─── Claude Data Sample ───────────────────────────────────

/**
 * Build a compact CSV-format sample for Claude prompts.
 * Includes headers + up to maxRows rows.
 */
export function buildDataSample(headers, rows, maxRows = 50) {
  const sampleRows = rows.slice(0, maxRows)
  const lines = [
    headers.join(','),
    ...sampleRows.map(row =>
      headers.map(h => {
        const v = row[h]
        if (v === null || v === undefined) return ''
        const s = String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(',')
    ),
  ]
  return lines.join('\n')
}
