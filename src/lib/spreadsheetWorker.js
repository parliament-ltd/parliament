// Reads one spreadsheet, then is thrown away.
//
// SheetJS runs here rather than in the page: a crafted file can then neither
// freeze the page nor reach the window that holds the keys, and the page can
// stop it after a timeout (see readSpreadsheet in fileParser.js).
import * as XLSX from 'xlsx'
import { sheetToRows } from './spreadsheet.js'

self.onmessage = (event) => {
  try {
    const { headers, rows } = sheetToRows(XLSX, event.data.buffer)
    self.postMessage({ ok: true, headers, rows })
  } catch (err) {
    self.postMessage({ ok: false, error: String(err?.message || err) })
  }
}
