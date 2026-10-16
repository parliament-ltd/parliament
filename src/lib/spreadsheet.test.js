import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { sheetToRows } from './spreadsheet.js'

function workbookBytes(aoa) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
}

describe('sheetToRows', () => {
  it('uses the vendored SheetJS, not the vulnerable npm copy', () => {
    expect(XLSX.version).toBe('0.20.3')
  })

  it('reads headers and rows from the first sheet', () => {
    const out = sheetToRows(XLSX, workbookBytes([['Name', 'Count'], ['a', 1], ['b', 2]]))
    expect(out.headers).toEqual(['Name', 'Count'])
    expect(out.rows).toEqual([{ Name: 'a', Count: '1' }, { Name: 'b', Count: '2' }])
  })

  it('returns nothing for an empty sheet', () => {
    expect(sheetToRows(XLSX, workbookBytes([]))).toEqual({ headers: [], rows: [] })
  })

  it('cannot be steered by a column called __proto__', () => {
    // SheetJS drops such a column; what matters is that no row and no other
    // object gains a different prototype.
    const out = sheetToRows(XLSX, workbookBytes([['__proto__', 'x'], ['polluted', 1]]))
    expect(Object.getPrototypeOf(out.rows[0])).toBe(Object.prototype)
    expect(out.rows[0].x).toBe('1')
    expect({}.polluted).toBeUndefined()
  })
})
