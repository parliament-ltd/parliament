import { createContext, useContext, useState, useCallback, useRef } from 'react'
import {
  listFiles, addFile, updateFile, deleteFile, getFileData,
} from '../lib/db'
import {
  parseFile, compressForStorage, decompressFromStorage, buildColumnStats,
} from '../lib/fileParser'

/**
 * PelicanContext — file staging + canvas state for Pelican mode.
 *
 * Chat state (messages, streaming, sendMessage) lives in ChatContext.
 * This context owns everything specific to the data analysis workspace:
 *   - staged files (persisted in IndexedDB)
 *   - which files are "in context" for Claude
 *   - canvas view + chart type selection
 *   - table sort state
 *   - inspector panel state
 *   - parsed data cache (per session — avoids re-decompressing on every render)
 */

const PelicanContext = createContext(null)

// ── Chart series colors (Notion × Dusty Gold palette) ─────
export const SERIES_COLORS = ['#B8A070', '#0F7B6C', '#D9730D', '#787774', '#E03E3E']

// ── Data viz region/category color map ────────────────────
export function getCategoryColor(index) {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}

export function PelicanProvider({ children }) {
  // ── File state ────────────────────────────────────────
  const [files, setFiles] = useState([])              // file metadata records
  const [contextFiles, setContextFiles] = useState(new Set()) // file IDs in context
  const [activeFileId, setActiveFileId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  // ── Canvas state ──────────────────────────────────────
  const [canvasView, setCanvasView] = useState('chart')   // 'chart' | 'table' | 'summary'
  const [activeChart, setActiveChart] = useState('bar')   // 'bar' | 'line' | 'area' | 'scatter' | 'pie'
  const [activeFilters, setActiveFilters] = useState([])

  // ── Table state ───────────────────────────────────────
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  // ── Inspector state ───────────────────────────────────
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState(null)

  // ── Parsed data cache (session only, not persisted) ───
  // Map of fileId → { headers, rows, columnTypes, columnStats }
  const parsedCache = useRef(new Map())

  // ─── Load files for a conversation ───────────────────

  const loadFiles = useCallback(async (conversationId) => {
    const fileList = await listFiles(conversationId)
    setFiles(fileList)
    const inCtx = new Set(fileList.filter(f => f.inContext).map(f => f.id))
    setContextFiles(inCtx)
    if (fileList.length > 0 && !activeFileId) {
      setActiveFileId(fileList[0].id)
    }
  }, [activeFileId])

  // ─── Upload + parse a new file ────────────────────────

  const uploadFile = useCallback(async (file, conversationId) => {
    setUploading(true)
    setUploadError(null)
    try {
      // Parse the file into structured data
      const { headers, rows, columnTypes, meta } = await parseFile(file)

      // Compress for storage
      const compressed = await compressForStorage(file)

      // Persist to IndexedDB
      const record = await addFile(
        {
          conversationId,
          name: meta.name,
          type: meta.type,
          rows: meta.rows,
          cols: meta.cols,
          sizeBytes: meta.sizeBytes,
        },
        compressed
      )

      // Cache parsed data for this session
      const columnStats = buildColumnStats(headers, rows, columnTypes)
      parsedCache.current.set(record.id, { headers, rows, columnTypes, columnStats })

      setFiles(prev => [...prev, record])
      setContextFiles(prev => new Set([...prev, record.id]))
      setActiveFileId(record.id)
      return record
    } catch (err) {
      setUploadError(err.message || 'Failed to parse file')
      throw err
    } finally {
      setUploading(false)
    }
  }, [])

  // ─── Get parsed data for a file (from cache or IndexedDB) ─

  const getParsedData = useCallback(async (fileId) => {
    if (parsedCache.current.has(fileId)) {
      return parsedCache.current.get(fileId)
    }

    const fileMeta = files.find(f => f.id === fileId)
    if (!fileMeta) return null

    const stored = await getFileData(fileId)
    if (!stored) return null

    const { headers, rows, columnTypes } = await decompressFromStorage(stored.data, fileMeta.type)
    const columnStats = buildColumnStats(headers, rows, columnTypes)
    const parsed = { headers, rows, columnTypes, columnStats }
    parsedCache.current.set(fileId, parsed)
    return parsed
  }, [files])

  // ─── Context file toggle ──────────────────────────────

  const toggleContext = useCallback(async (fileId) => {
    const inCtx = contextFiles.has(fileId)
    const newInCtx = !inCtx
    await updateFile(fileId, { inContext: newInCtx })
    setContextFiles(prev => {
      const next = new Set(prev)
      newInCtx ? next.add(fileId) : next.delete(fileId)
      return next
    })
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, inContext: newInCtx } : f))
  }, [contextFiles])

  // ─── Remove a staged file ─────────────────────────────

  const removeFile = useCallback(async (fileId) => {
    await deleteFile(fileId)
    parsedCache.current.delete(fileId)
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setContextFiles(prev => { const n = new Set(prev); n.delete(fileId); return n })
    if (activeFileId === fileId) {
      setActiveFileId(prev => {
        const remaining = files.filter(f => f.id !== fileId)
        return remaining.length > 0 ? remaining[0].id : null
      })
    }
  }, [activeFileId, files])

  // ─── Table sort ───────────────────────────────────────

  const handleSort = useCallback((col) => {
    setSortColumn(prev => {
      if (prev === col) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return col
      }
      setSortDir('desc')
      return col
    })
  }, [])

  // ─── Add / remove a filter ────────────────────────────

  const addFilter = useCallback((filter) => {
    setActiveFilters(prev => [...prev, filter])
  }, [])

  const removeFilter = useCallback((index) => {
    setActiveFilters(prev => prev.filter((_, i) => i !== index))
  }, [])

  // ─── Derived: active file metadata ───────────────────

  const activeFile = files.find(f => f.id === activeFileId) || null

  const value = {
    // file state
    files,
    contextFiles,
    activeFileId,
    activeFile,
    uploading,
    uploadError,
    setActiveFileId,
    loadFiles,
    uploadFile,
    getParsedData,
    toggleContext,
    removeFile,

    // canvas state
    canvasView,
    setCanvasView,
    activeChart,
    setActiveChart,
    activeFilters,
    addFilter,
    removeFilter,

    // table state
    sortColumn,
    sortDir,
    handleSort,

    // inspector state
    inspectorCollapsed,
    setInspectorCollapsed,
    selectedColumn,
    setSelectedColumn,
  }

  return <PelicanContext.Provider value={value}>{children}</PelicanContext.Provider>
}

export function usePelican() {
  const ctx = useContext(PelicanContext)
  if (!ctx) throw new Error('usePelican must be used within PelicanProvider')
  return ctx
}
