import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown } from 'lucide-react'
import { usePelican } from '../../../stores/PelicanContext'
import { SPRING_SMOOTH } from '../../../lib/constants'

const PAGE_SIZE = 100

/**
 * TableCanvas — sortable, paginated data grid from real parsed file data.
 *
 * - Sticky header with sort triggers on each column
 * - Numeric columns right-aligned
 * - "Load more" pagination (PAGE_SIZE rows at a time)
 * - Applies active filters from PelicanContext
 */
export default function TableCanvas({ fileId, sortColumn, sortDir, onSort, filters }) {
  const { getParsedData, activeFile } = usePelican()
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [visibleRows, setVisibleRows] = useState(PAGE_SIZE)

  useEffect(() => {
    if (!fileId) return
    setLoading(true)
    setVisibleRows(PAGE_SIZE)
    getParsedData(fileId).then(data => {
      setParsed(data)
      setLoading(false)
    })
  }, [fileId, getParsedData])

  const { columns, sortedRows, totalRows } = useMemo(() => {
    if (!parsed) return { columns: [], sortedRows: [], totalRows: 0 }
    const { headers, rows, columnTypes } = parsed

    // Apply filters
    let filtered = rows
    for (const f of (filters || [])) {
      filtered = filtered.filter(row => {
        if (f.op === 'in') return f.values.includes(String(row[f.column]))
        if (f.op === '=') return String(row[f.column]) === String(f.values)
        return true
      })
    }

    // Sort
    let sorted = [...filtered]
    if (sortColumn) {
      sorted.sort((a, b) => {
        const av = a[sortColumn]
        const bv = b[sortColumn]
        const isNum = columnTypes[sortColumn] === 'number'
        if (isNum) {
          const an = parseFloat(av) || 0
          const bn = parseFloat(bv) || 0
          return sortDir === 'asc' ? an - bn : bn - an
        }
        const as = String(av ?? '')
        const bs = String(bv ?? '')
        return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
      })
    }

    // Limit columns to first 12 for wide tables
    const columns = headers.slice(0, 12).map(h => ({
      key: h,
      type: columnTypes[h] || 'string',
    }))

    return { columns, sortedRows: sorted, totalRows: sorted.length }
  }, [parsed, sortColumn, sortDir, filters])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xs text-[#787774]"
        >
          Loading table…
        </motion.div>
      </div>
    )
  }

  if (!parsed || columns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-[#787774]">No data to display.</p>
      </div>
    )
  }

  const displayRows = sortedRows.slice(0, visibleRows)
  const hasMore = visibleRows < totalRows

  return (
    <div className="h-full overflow-auto plcn-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: '#E9E9E7 transparent' }}>
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="plcn-table-head" style={{ backgroundColor: '#FAFAFA' }}>
            {columns.map(({ key, type }) => (
              <th
                key={key}
                onClick={() => onSort(key)}
                className={`text-left px-4 py-3 text-[10px] font-medium text-[#787774] uppercase tracking-wider cursor-pointer hover:text-[#191919] transition-colors select-none whitespace-nowrap ${
                  type === 'number' ? 'text-right' : ''
                }`}
                style={{ borderBottom: '1px solid #F1F1EF' }}
              >
                <div className={`flex items-center gap-1 ${type === 'number' ? 'justify-end' : ''}`}>
                  {key.replace(/_/g, ' ')}
                  {sortColumn === key && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={SPRING_SMOOTH}
                    >
                      <ArrowUpDown className="w-3 h-3 text-[#B8A070]" />
                    </motion.span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: Math.min(i * 0.01, 0.3) }}
              className="hover:bg-[#FAFAFA] transition-colors cursor-default plcn-table-row"
              style={{ borderBottom: '1px solid #F1F1EF' }}
            >
              {columns.map(({ key, type }) => (
                <td
                  key={key}
                  className={`px-4 py-2.5 text-[#787774] whitespace-nowrap max-w-[200px] truncate ${
                    type === 'number'
                      ? 'text-right font-medium text-[#191919] tabular-nums'
                      : ''
                  }`}
                  title={String(row[key] ?? '')}
                >
                  {formatCell(row[key], type)}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div
        className="px-4 py-3 flex items-center justify-between sticky bottom-0 bg-[#FAFAFA] plcn-table-foot"
        style={{ borderTop: '1px solid #F1F1EF' }}
      >
        <span className="text-[10px] text-[#787774]">
          Showing {displayRows.length.toLocaleString()} of {totalRows.toLocaleString()} rows
          {activeFile && ` · ${activeFile.name}`}
        </span>
        {hasMore && (
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setVisibleRows(v => v + PAGE_SIZE)}
              className="px-3 py-1 text-[10px] font-medium text-[#787774] border border-[#E9E9E7] rounded-md hover:border-[#B8A070] hover:text-[#B8A070] transition-colors"
            >
              Load {Math.min(PAGE_SIZE, totalRows - visibleRows).toLocaleString()} more
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setVisibleRows(totalRows)}
              className="px-3 py-1 text-[10px] font-medium text-[#787774] border border-[#E9E9E7] rounded-md hover:border-[#B8A070] hover:text-[#B8A070] transition-colors"
            >
              Load all
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Cell formatting ──────────────────────────────────────

function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return '—'
  if (type === 'number') {
    const n = parseFloat(value)
    if (isNaN(n)) return String(value)
    // Use compact notation for large numbers
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
    if (Math.abs(n) >= 1_000) return n.toLocaleString()
    // Show decimals only if needed
    return Number.isInteger(n) ? n.toString() : n.toFixed(2)
  }
  return String(value)
}
