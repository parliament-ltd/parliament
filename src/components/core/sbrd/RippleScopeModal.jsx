// RippleScopeModal — cross-document ripple scan modal. Lifted from
// V1 secretarybird ChatLayout.jsx with the ripple-scan loop pulled
// into a reusable component owned by ripple-analysis@1.0.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { SPRING_SMOOTH } from '../../../lib/constants'
import {
  listConversations, getSetting, setSetting, getSbrdDocument, getConversation,
  saveSbrdDocument,
} from '../../../lib/db'
import { getProvider } from '../../../providers'
import { loadApiKey } from '../../../lib/crypto'

const GOLD = '#B8A070'
const RIPPLE_WARN = '#E5A620'

/**
 * Cross-document ripple scan: per selected conversation, ask Claude
 * (haiku) whether the current doc's edits create contradictions in
 * the other doc; merge any flags back via setRipplesByParaId.
 *
 * Returns the total flag count surfaced on the current document.
 */
async function runRippleScan({
  selectedIds,
  paragraphs,
  conversationTitle,
  currentConvId,
  saveScope,
  generateManifest,
  onProgress,
  setRipplesByParaId,
}) {
  const apiKey = await loadApiKey()
  if (!apiKey) return 0

  const currentParaList = paragraphs.filter(p => p.text?.trim())
  if (!currentParaList.length) return 0

  const currentDocText = currentParaList
    .map(p => `[${p.id}] ${p.type === 'heading' || p.type === 'heading2' ? '# ' : ''}${p.text}`)
    .join('\n\n')

  const changedParas = paragraphs.filter(p => p.text !== p.baseline && !p.claudeOrigin)
  const editContext = changedParas.length
    ? `\n\nRecent edits in Document A (for context):\n${changedParas.map(p =>
        `[${p.id}] was: "${p.baseline?.slice(0, 100)}" → now: "${p.text.slice(0, 100)}"`,
      ).join('\n')}`
    : ''

  const validCurrentIds = new Set(currentParaList.map(p => p.id))
  const provider = getProvider('anthropic')
  const sourceTitle = conversationTitle || 'Current document'
  let totalFlagCount = 0
  const manifestEntries = []

  for (let i = 0; i < selectedIds.length; i++) {
    const convId = selectedIds[i]
    onProgress?.(i + 1, selectedIds.length)

    const [extDoc, extConv] = await Promise.all([
      getSbrdDocument(convId),
      getConversation(convId),
    ])
    if (!extDoc?.paragraphs?.length) continue

    const extTitle = extConv?.title || 'Untitled'
    const extParaList = extDoc.paragraphs.filter(p => p.text?.trim())
    const validExtIds = new Set(extParaList.map(p => p.id))
    const extDocText = extParaList
      .map(p => `[${p.id}] ${p.type === 'heading' || p.type === 'heading2' ? '# ' : ''}${p.text}`)
      .join('\n\n')

    const systemPrompt = `You are a cross-document consistency checker for a writing tool.

DOCUMENT A — "${sourceTitle}" (paragraph IDs in brackets):
${currentDocText}${editContext}

DOCUMENT B — "${extTitle}" (paragraph IDs in brackets):
${extDocText}

Find inconsistencies, contradictions, or continuity breaks between the two documents — mismatched facts, character names, timeline events, locations, or tone conflicts.

Respond ONLY with valid JSON, no prose, no markdown fences:
{
  "currentFlags": [{"paraId":"id-from-DOCUMENT-A","type":"contradiction|inconsistency|dependency_break|tone_shift","severity":"low|medium|high","summary":"one sentence, name '${extTitle}'"}],
  "externalFlags": [{"paraId":"id-from-DOCUMENT-B","type":"contradiction|inconsistency|dependency_break|tone_shift","severity":"low|medium|high","summary":"one sentence, name '${sourceTitle}'"}],
  "externalSuggestions": [{"paraId":"id-from-DOCUMENT-B","find":"exact verbatim text to replace — must exist word-for-word in the paragraph","replace":"corrected text","reasoning":"brief reason referencing Document A"}]
}

RULES:
- currentFlags and externalFlags paraIds must come from their respective document only.
- externalSuggestions paraIds must come ONLY from Document B IDs above.
- "find" must be a short, unique, verbatim substring of the paragraph's current text.
- Provide a suggestion for every externalFlag where a concrete text fix is possible.
- If no inconsistencies, return: {"currentFlags":[],"externalFlags":[],"externalSuggestions":[]}`

    let resp = ''
    const abort = new AbortController()
    try {
      await provider.sendMessage(
        apiKey,
        [{ role: 'user', content: 'Check cross-document consistency.' }],
        'claude-haiku',
        chunk => { resp += chunk },
        abort.signal,
        systemPrompt,
      )
      const match = resp.match(/\{[\s\S]*\}/)
      if (!match) continue
      const parsed = JSON.parse(match[0])

      const currentFlags = (parsed.currentFlags || []).filter(f => validCurrentIds.has(f.paraId))
      if (currentFlags.length) {
        const flagsByParaId = {}
        for (const flag of currentFlags) {
          flagsByParaId[flag.paraId] = { ...flag, sourceDoc: extTitle }
        }
        setRipplesByParaId(flagsByParaId)
        totalFlagCount += currentFlags.length
      }

      const externalFlags = (parsed.externalFlags || []).filter(f => validExtIds.has(f.paraId))
      const externalSuggestions = (parsed.externalSuggestions || []).filter(s => validExtIds.has(s.paraId))

      if (externalFlags.length || externalSuggestions.length) {
        const updatedExtParas = extDoc.paragraphs.map(p => {
          const flag = externalFlags.find(f => f.paraId === p.id)
          const suggs = externalSuggestions
            .filter(s => s.paraId === p.id && s.find && p.text.includes(s.find))
            .map((s, idx) => ({
              id: `ripple-${convId}-${Date.now()}-${idx}`,
              find: s.find,
              replace: s.replace,
              reasoning: s.reasoning || '',
            }))
          return {
            ...p,
            ...(flag ? { ripple: { ...flag, sourceDoc: sourceTitle } } : {}),
            ...(suggs.length ? { claudeSuggestions: [...(p.claudeSuggestions || []), ...suggs] } : {}),
          }
        })
        await saveSbrdDocument(convId, {
          paragraphs: updatedExtParas,
          suggestionStates: extDoc.suggestionStates,
          submittedReplies: extDoc.submittedReplies,
        })
        totalFlagCount += externalFlags.length
        if (generateManifest) {
          manifestEntries.push({ doc: extTitle, flags: externalFlags, suggestions: externalSuggestions })
        }
      }
    } catch {
      // skip — network or parse error for this chat
    }
  }

  if (saveScope) {
    await setSetting(`sbrd-ripple-scope-${currentConvId}`, selectedIds)
  }
  if (generateManifest && manifestEntries.length) {
    await setSetting(`sbrd-ripple-manifest-${currentConvId}`, {
      scannedAt: new Date().toISOString(),
      scannedDocs: selectedIds.length,
      entries: manifestEntries,
    })
  }

  return totalFlagCount
}

export default function RippleScopeModal({
  currentId, currentTitle, paragraphs, setRipplesByParaId, onClose,
}) {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [generateManifest, setGenerateManifest] = useState(false)
  const [saveScope, setSaveScope] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(null)
  const [scanResult, setScanResult] = useState(null)

  useEffect(() => {
    Promise.all([
      listConversations(),
      getSetting(`sbrd-ripple-scope-${currentId}`),
    ]).then(([all, savedScope]) => {
      const filtered = all.filter(c => c.id !== currentId)
      setConversations(filtered)
      if (savedScope?.length) {
        const validIds = new Set(savedScope.filter(sid => filtered.some(c => c.id === sid)))
        if (validIds.size) setSelected(validIds)
      }
    })
  }, [currentId])

  const toggleAll = () => {
    if (selected.size === conversations.length) setSelected(new Set())
    else setSelected(new Set(conversations.map(c => c.id)))
  }

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })

  const estTokens = selected.size * 500
  const estCost = (estTokens / 1000000 * 3).toFixed(2)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={SPRING_SMOOTH}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl shadow-black/10 border border-[#E9E9E7] p-6 w-[480px] max-h-[70vh] flex flex-col"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--p-text-primary)' }}>Expand Ripple Scope</h3>
            <p className="text-xs text-[#6B7C93] mt-1">Select chats to scan for cross-document consistency impacts.</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#6B7C93]"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-[#6B7C93] uppercase tracking-wider">Chats</span>
          <button onClick={toggleAll} className="text-[10px] font-medium transition-colors" style={{ color: GOLD }}>
            {selected.size === conversations.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 mb-4 min-h-0">
          {conversations.length === 0 && (
            <p className="text-[11px] text-[#6B7C93] text-center py-6">No other chats found.</p>
          )}
          {conversations.map(conv => (
            <label key={conv.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F5F5F5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={selected.has(conv.id)}
                onChange={() => toggle(conv.id)}
                className="rounded"
                style={{ accentColor: GOLD }}
              />
              <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--p-text-primary)' }}>
                {conv.title || 'Untitled'}
              </span>
            </label>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="px-3 py-2 rounded-lg bg-[#F5F5F5] mb-4 text-[11px] text-[#6B7C93]">
            Scanning {selected.size} chat{selected.size !== 1 ? 's' : ''} · ~{estTokens.toLocaleString()} tokens · estimated cost ${estCost}
          </div>
        )}

        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={generateManifest}
              onChange={e => setGenerateManifest(e.target.checked)}
              style={{ accentColor: GOLD }}
            />
            <div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--p-text-primary)' }}>Generate Revision Manifest</span>
              <p className="text-[10px] text-[#6B7C93]">Save results as a persistent manifest you can act on later</p>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveScope}
              onChange={e => setSaveScope(e.target.checked)}
              style={{ accentColor: GOLD }}
            />
            <div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--p-text-primary)' }}>Save Scope</span>
              <p className="text-[10px] text-[#6B7C93]">Remember this chat list across sessions</p>
            </div>
          </label>
        </div>

        {scanning && scanProgress && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px] text-[#6B7C93] flex items-center gap-2" style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
            <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: GOLD }} />
            Scanning {scanProgress.current} of {scanProgress.total} chat{scanProgress.total !== 1 ? 's' : ''}…
          </div>
        )}

        {scanResult !== null && !scanning && (
          <div
            className="mb-3 px-3 py-2.5 rounded-lg text-[11px] leading-relaxed"
            style={
              scanResult > 0
                ? { backgroundColor: `${RIPPLE_WARN}12`, border: `1px solid ${RIPPLE_WARN}30`, color: RIPPLE_WARN }
                : { backgroundColor: 'rgba(107,124,147,0.08)', border: '1px solid rgba(107,124,147,0.2)', color: '#6B7C93' }
            }
          >
            {scanResult > 0
              ? `Found ${scanResult} potential inconsistenc${scanResult !== 1 ? 'ies' : 'y'}. Flags have been added to the affected documents' Impact Analysis panels.`
              : 'No inconsistencies found across the selected documents.'}
          </div>
        )}

        <div className="flex items-center gap-2 justify-end">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            disabled={scanning}
            className="px-4 py-2 text-xs font-semibold text-[#6B7C93] hover:bg-[#F5F5F5] rounded-lg transition-colors disabled:opacity-40"
          >
            {scanResult !== null ? 'Close' : 'Cancel'}
          </motion.button>
          {scanResult === null && (
            <motion.button
              whileHover={selected.size > 0 && !scanning ? { scale: 1.02 } : {}}
              whileTap={selected.size > 0 && !scanning ? { scale: 0.97 } : {}}
              disabled={selected.size === 0 || scanning}
              onClick={async () => {
                setScanning(true)
                setScanResult(null)
                setScanProgress({ current: 0, total: selected.size })
                try {
                  const count = await runRippleScan({
                    selectedIds: [...selected],
                    paragraphs,
                    conversationTitle: currentTitle,
                    currentConvId: currentId,
                    saveScope,
                    generateManifest,
                    onProgress: (current, total) => setScanProgress({ current, total }),
                    setRipplesByParaId,
                  })
                  setScanResult(count)
                } catch {
                  setScanResult(0)
                } finally {
                  setScanning(false)
                  setScanProgress(null)
                }
              }}
              className="flex items-center gap-2 px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              style={selected.size > 0
                ? { backgroundColor: '#C4A94D', border: '1px solid #C4A94D' }
                : { backgroundColor: '#191919', border: '1px solid #4A4540' }}
            >
              {scanning && <Loader2 className="w-3 h-3 animate-spin" />}
              {scanning ? 'Scanning…' : `Scan ${selected.size > 0 ? `${selected.size} Chat${selected.size !== 1 ? 's' : ''}` : 'Chats'}`}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
