// Reading the first sheet of a workbook into headers and rows.
//
// Pure: the SheetJS module is passed in, so this runs inside the spreadsheet
// worker in the app and directly in Node in the tests.

/**
 * @param {object} XLSX  the SheetJS module
 * @param {ArrayBuffer} buffer  the file's bytes
 * @returns {{ headers: string[], rows: Array<Record<string, unknown>> }}
 */
export function sheetToRows(XLSX, buffer) {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { headers: [], rows: [] }

  const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false })
  if (json.length === 0) return { headers: [], rows: [] }

  const headers = Object.keys(json[0]).map(h => String(h).trim())
  // Object.fromEntries defines each column as an own property, so a column
  // named "__proto__" stays a column and never changes the row's prototype.
  const rows = json.map(row => Object.fromEntries(headers.map(h => [h, row[h] ?? null])))
  return { headers, rows }
}
