// FileShelfContext — Phase 1 PR-11a.
//
// Owns the file-staging state that V1 PelicanContext used to own. Mounted
// at App.jsx (between ChatProvider and BrowserRouter, alongside
// AnnotationsContext / BranchPanelContext / CollabModeContext) so every
// /chat/:id surface — the file-shelf@1.0 component, the canvas trio
// (chart-canvas / table-canvas / summary-dashboard), and column-inspector
// — reads the same in-memory copy.
//
// Why a shared context (not the hostAPI bus): the hostAPI's three
// Phase 1 events are change-notification pipes; they do not retain state,
// so a late subscriber (e.g. summary-dashboard mounting after the user
// has already uploaded a file) would miss the most recent payload. A
// React Context covers both shapes — initial subscribers and late ones
// see the same snapshot. PR-11a still publishes file-context-changed on
// the bus to keep the audit's documented event surface honest, but the
// canonical state read happens through this hook. Same precedent as
// AnnotationsContext (PR-10a.6) which carries annotations even though
// per-message handlers could in principle round-trip via the bus.
//
// State is per-conversation. When `useChat().activeConversationId`
// transitions between two distinct non-null ids, the parsed-data cache
// flushes and the staged-files list reloads against IndexedDB. Transient
// nulls are ignored so a conversation→homepage→conversation round trip
// preserves the cache (matches V1 PelicanContext's per-mount lifetime
// when a user toggled away from the canvas and back).

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react'
import {
  listFiles, addFile, updateFile, deleteFile, getFileData,
} from '../lib/db'
import {
  parseFile, compressForStorage, decompressFromStorage, buildColumnStats,
} from '../lib/fileParser'
import { useChat } from './ChatContext'

const FileShelfContext = createContext(null)

// ── Stable empty references so consumers' memos don't invalidate on
//    transient null windows during conversation switches. Same trick
//    AnnotationsContext uses.
const EMPTY_FILES = Object.freeze([])
const EMPTY_CONTEXT_FILES = Object.freeze(new Set())

// ── Series colors used by chart-canvas + summary-dashboard. Lifted from
//    V1 PelicanContext so call sites can import from one place.
export const SERIES_COLORS = ['#B8A070', '#0F7B6C', '#D9730D', '#787774', '#E03E3E']

export function getCategoryColor(index) {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}

export function FileShelfProvider({ children }) {
  const { activeConversationId } = useChat()

  const [files, setFiles] = useState(EMPTY_FILES)
  const [contextFiles, setContextFiles] = useState(EMPTY_CONTEXT_FILES)
  const [activeFileId, setActiveFileId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  // `loaded` flips true once the first listFiles() call resolves for the
  // current conversation. Lets consumers distinguish "loading" from
  // "loaded but empty". Mirrors AnnotationsContext.loaded.
  const [loaded, setLoaded] = useState(false)

  // Parsed-data cache — survives across re-renders of canvas components
  // but flushes on conversation switch. Map<fileId, parsed>.
  const parsedCache = useRef(new Map())
  // Track the conversation id we last loaded files for, so we don't
  // double-load when activeConversationId transiently flickers.
  const loadedFor = useRef(null)

  // Reload staged files whenever the active conversation changes between
  // two distinct non-null ids. Transient nulls (e.g. ChatView clearing
  // ChatContext during route nav back to the same conversation) skip.
  useEffect(() => {
    if (activeConversationId == null) return
    if (loadedFor.current === activeConversationId) return

    loadedFor.current = activeConversationId
    parsedCache.current = new Map()
    setLoaded(false)
    setFiles(EMPTY_FILES)
    setContextFiles(EMPTY_CONTEXT_FILES)
    setActiveFileId(null)

    let cancelled = false
    listFiles(activeConversationId).then((list) => {
      if (cancelled) return
      const safe = Array.isArray(list) ? list : []
      setFiles(safe)
      setContextFiles(new Set(safe.filter(f => f.inContext).map(f => f.id)))
      setActiveFileId(safe.length > 0 ? safe[0].id : null)
      setLoaded(true)
    }).catch((err) => {
      if (cancelled) return
      if (import.meta.env.DEV) {
        console.warn('[FileShelfContext] listFiles failed:', err)
      }
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [activeConversationId])

  const uploadFileFor = useCallback(async (file, conversationId) => {
    setUploading(true)
    setUploadError(null)
    try {
      const { headers, rows, columnTypes, meta } = await parseFile(file)
      const compressed = await compressForStorage(file)
      const record = await addFile(
        {
          conversationId,
          name: meta.name,
          type: meta.type,
          rows: meta.rows,
          cols: meta.cols,
          sizeBytes: meta.sizeBytes,
        },
        compressed,
      )
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

  const getParsedData = useCallback(async (fileId) => {
    if (!fileId) return null
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

  const removeFile = useCallback(async (fileId) => {
    await deleteFile(fileId)
    parsedCache.current.delete(fileId)
    let nextActive = activeFileId
    setFiles(prev => {
      const remaining = prev.filter(f => f.id !== fileId)
      if (activeFileId === fileId) {
        nextActive = remaining.length > 0 ? remaining[0].id : null
      }
      return remaining
    })
    setContextFiles(prev => { const n = new Set(prev); n.delete(fileId); return n })
    if (nextActive !== activeFileId) setActiveFileId(nextActive)
  }, [activeFileId])

  const value = {
    files,
    contextFiles,
    activeFileId,
    setActiveFileId,
    uploading,
    uploadError,
    loaded,
    uploadFile: uploadFileFor,
    getParsedData,
    toggleContext,
    removeFile,
  }

  return <FileShelfContext.Provider value={value}>{children}</FileShelfContext.Provider>
}

export function useFileShelf() {
  const ctx = useContext(FileShelfContext)
  if (!ctx) throw new Error('useFileShelf must be used within FileShelfProvider')
  return ctx
}
