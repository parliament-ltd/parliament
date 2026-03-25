import Papa from 'papaparse'

/**
 * Max file size (bytes) we'll attempt to read and include in a message.
 * Larger files are truncated to stay under token limits.
 */
const MAX_FILE_BYTES = 200 * 1024  // 200 KB
const MAX_PREVIEW_CHARS = 15_000   // ~3–4k tokens

/**
 * Accepted file extensions and their display labels.
 */
export const ACCEPTED_TYPES = '.txt,.md,.csv,.json,.xml,.yaml,.yml,.log'

/**
 * Reads an uploaded File and returns a structured attachment object.
 * @param {File} file
 * @returns {Promise<{ name: string, size: number, type: string, content: string, preview: string, truncated: boolean }>}
 */
export async function readUploadedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (file.size > MAX_FILE_BYTES) {
    return readTruncated(file, ext)
  }

  if (ext === 'csv') {
    return readCsv(file)
  }

  return readText(file, ext)
}

/* ── Helpers ──────────────────────────────────────────────── */

async function readText(file, ext) {
  const text = await file.text()
  const truncated = text.length > MAX_PREVIEW_CHARS
  const content = truncated ? text.slice(0, MAX_PREVIEW_CHARS) : text
  return {
    name: file.name,
    size: file.size,
    type: ext,
    content,
    truncated,
  }
}

async function readCsv(file) {
  const text = await file.text()
  const result = Papa.parse(text, { header: true, skipEmptyLines: true })
  const rows = result.data
  const fields = result.meta?.fields ?? []

  // Represent as readable table summary
  const header = fields.join(', ')
  const rowsText = rows
    .slice(0, 200) // cap rows
    .map((row) => fields.map((f) => String(row[f] ?? '')).join(', '))
    .join('\n')

  const content = `Columns: ${header}\nRows (${rows.length} total):\n${rowsText}`
  const truncated = rows.length > 200

  return {
    name: file.name,
    size: file.size,
    type: 'csv',
    content,
    rowCount: rows.length,
    columns: fields,
    truncated,
  }
}

async function readTruncated(file, ext) {
  // Read the first MAX_FILE_BYTES bytes
  const slice = file.slice(0, MAX_FILE_BYTES)
  const text = await slice.text()
  return {
    name: file.name,
    size: file.size,
    type: ext,
    content: text,
    truncated: true,
  }
}

/**
 * Formats an attachment for inclusion in a user message.
 */
export function formatAttachmentForMessage(attachment) {
  const truncationNote = attachment.truncated
    ? `\n[Note: file truncated to first ~200 KB]`
    : ''
  return `[Attached file: ${attachment.name}]${truncationNote}\n---\n${attachment.content}\n---\n\n`
}
