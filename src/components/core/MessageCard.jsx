import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from './Markdown'
import {
  Star, StickyNote, GitBranch, Trash2, MoreVertical,
  Eye, Copy, ArrowRightCircle, Pencil, Quote,
  Image as ImageIcon, FileText,
} from 'lucide-react'
import { SPRING_SNAPPY, SPRING_GENTLE, DUSTY_GOLD, HIGHLIGHT_COLORS } from '../../lib/constants'
import { indexOfWord } from '../../lib/textUtils'
import { stripAttachedFileBlocks, formatSize } from '../../lib/fileUpload'
import { useLingui } from '@lingui/react'
import { COPY } from '../../copy'
import ChartRenderer from './ChartRenderer'
import EditableReply from './EditableReply'
import CitationLink from './CitationLink'
import { modelFacts } from '../../net'
import { instructionLike } from '../../lib/injection'

const NO_QUOTES = Object.freeze([])

// PR-18e: chip-icon lookup for the attachmentMeta strip rendered under
// user messages in history. Icons only (no thumbnails) — base64 isn't
// persisted, and the chips are a memory aid not a thumbnail gallery.
const ATTACHMENT_CATEGORY_ICON = { image: ImageIcon, document: FileText, text: FileText }
function iconForAttachment(category) { return ATTACHMENT_CATEGORY_ICON[category] || FileText }

/* ── Message entrance animation ─────────────────────────── */

const messageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { ...SPRING_GENTLE, delay: i * 0.08 },
  }),
}

/* ── MessageCard ─────────────────────────────────────────── */

export default function MessageCard({
  id, type, content, number, index = 0,
  isGhostText = false,
  stoppedNote = null, // why a cut-off reply stopped, when it was left (C109)
  source = null, // where an answer from a source came from (stage 4)
  frameworks = null, // the frameworks a reply was written under (stage 7; C164)
  translation = null, // an answer from a source translated on request (C166 (f))
  citations = null, // the sources a reply cited from a web search (C167 (f))
  asked = null, // a question translated before it went to a source (C85, C166 (g))
  summary = null, // the summary a branch starts from: { address, name }, either null when not known (C175)
  included = null, // answers from sources brought into this prompt (C176)
  tells = null, // the tell: notes this prompt carried, in the person's words (C225 (d))
  thinking = null, // a model's thinking: { text, live, answering, since } while it streams, { text, ms } after (C165)
  isFavorited = false, showNotes = false,
  savedNoteText = '',
  highlights = [],
  // Passages of this message kept as quotes, each { num, text } (C145 (a), (b)).
  quotes = NO_QUOTES,
  isPopoverActive = false, onPopoverChange,
  onNote, onFavorite, onNoteSave, onHighlight, onContinue, onDelete, onBranch,
  onHide, onCopyText, onMoveToBranch, onPinForReference, onQuote,
  attachmentMeta,
  // A finished reply is edited in place (stage 11, piece 1; C210, C212):
  // editable says this one can be; blocks is its editable form once saved;
  // onSaveEdits keeps it; clean shows the result only (markup · clean).
  editable = false, blocks = null, onSaveEdits, clean = false,
  // A prompt and its reply edited as one (stage 11, piece 2; C214): the
  // editor draws this card, and its text for this card is hostContent, put
  // where the card's text goes. Everything else on the card stays the
  // card's own and is never part of the text. editedLine: said under an
  // edited prompt.
  hostContent = null, editedLine = null,
  // Edits already told to a model (C216 (i)); toldTo: who was told the
  // edits this prompt carried, for a prompt that was only those (C216 (e)).
  closedEdits, toldTo = null,
  // Asks (C218): each one's number and state, settling one, and the words.
  askInfo, onSettleAsk, askWords,
}) {
  const fixed = hostContent ? { contentEditable: false, suppressContentEditableWarning: true } : {}
  const { i18n } = useLingui()
  // PR-18e: strip persisted `<attached_file>...</attached_file>` boundary
  // blocks from the display text so the user sees only their prose. The
  // wrapped form stays in the persisted message so Claude still has the
  // file content on follow-up turns; only the rendered surface is clean.
  const displayContent = useMemo(
    () => (type === 'user' && typeof content === 'string'
      ? stripAttachedFileBlocks(content)
      : content),
    [content, type],
  )
  const [noteText, setNoteText] = useState(savedNoteText)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [popoverPos, setPopoverPos] = useState(null)
  const contentRef = useRef(null)
  // A translated answer shows its translation; one click shows the source's own words.
  const [original, setOriginal] = useState(false)
  const translated = Boolean(source && translation && !original)

  useEffect(() => {
    setNoteText(savedNoteText)
  }, [savedNoteText])

  const handleNoteBlur = () => {
    if (noteText !== savedNoteText) onNoteSave?.(noteText)
  }

  const handleCopy = () => {
    onCopyText?.()
    setCopied(true)
    setShowMenu(false)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleFavoriteClick = () => { onFavorite?.() }

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length < 2) {
      onPopoverChange?.(false)
      setPopoverPos(null)
      return
    }
    const range = selection.getRangeAt(0)
    if (!contentRef.current?.contains(range.commonAncestorContainer)) {
      onPopoverChange?.(false)
      setPopoverPos(null)
      return
    }
    const rect = range.getBoundingClientRect()
    const containerRect = contentRef.current.getBoundingClientRect()
    setPopoverPos({
      text,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top  - containerRect.top  - 8,
    })
    onPopoverChange?.(true)
  }, [onPopoverChange])

  const handleHighlightColor = (color) => {
    if (popoverPos?.text) onHighlight?.(popoverPos.text, color)
    setPopoverPos(null)
    onPopoverChange?.(false)
    window.getSelection()?.removeAllRanges()
  }

  // Quote: the selected words kept beside the chat, numbered, never sent (C145 (a)).
  const handleQuote = () => {
    if (popoverPos?.text) onQuote?.(popoverPos.text)
    setPopoverPos(null)
    onPopoverChange?.(false)
    window.getSelection()?.removeAllRanges()
  }

  /* ── Render content with highlights + Markdown ──────────── */

  const highlightTerms = useMemo(() => {
    if (!highlights.length) return []
    const seen = new Map()
    for (const hl of highlights) {
      const key = hl.text.toLowerCase()
      if (!seen.has(key)) {
        const bgColor = HIGHLIGHT_COLORS.find(c => c.color === hl.color)?.bg || 'rgba(184,160,112,0.18)'
        seen.set(key, { text: hl.text, bg: bgColor })
      }
    }
    return Array.from(seen.values())
  }, [highlights])

  const renderContent = useMemo(() => {
    // A prompt that was only the person's edits, told (C216 (e)).
    if (!displayContent && type === 'user' && toldTo) return <p className="text-sm italic text-[var(--p-text-secondary)]">{i18n._(COPY.chat.toldOnly, { name: toldTo })}</p>
    if (!displayContent) return null

    // A finished reply edited in place, a source's answer too, as plain text (stage 11).
    if (editable && type === 'assistant' && onSaveEdits) {
      return (
        <EditableReply
          id={id}
          content={displayContent}
          blocks={blocks}
          plain={Boolean(source)}
          terms={highlightTerms}
          quotes={quotes}
          quotedTitle={(num) => i18n._(COPY.chat.quoted, { num })}
          clean={clean}
          onSave={onSaveEdits}
          closedEdits={closedEdits}
          askInfo={askInfo}
          onSettleAsk={onSettleAsk}
          askWords={askWords}
        />
      )
    }

    // An answer from a source is plain text and is shown as text: never as
    // HTML, and not read as Markdown either (stage 4). A list of results
    // (stage 7) is drawn from its note, each result's words as text.
    // A translation (C166 (f)) is text from outside too, and drawn the same way.
    if (source?.shape === 'list' && Array.isArray(source.items)) {
      const items = translated && Array.isArray(translation.items)
        ? source.items.map((it, i) => ({ ...it, title: translation.items[i]?.title || it.title, text: translation.items[i]?.text ?? it.text }))
        : source.items
      return <SourceResults items={items} />
    }
    if (source) {
      const text = translated && typeof translation.text === 'string' ? translation.text : displayContent
      return <p className="parliament-md text-[15px] whitespace-pre-wrap" dir="auto" lang={translated ? translation.lang : undefined}>{text}</p>
    }

    function highlightString(text) {
      const ranges = []
      // A quoted passage, where it sits, in ink; a click finds its card (C145 (b)).
      for (const q of quotes) {
        // A pinned copy of the whole message is not a passage.
        if (!q.text || q.text === displayContent) continue
        const idx = text.indexOf(q.text)
        if (idx >= 0) ranges.push({ start: idx, end: idx + q.text.length, quote: q.num })
      }
      for (const hl of highlightTerms) {
        let startIndex = 0
        while (startIndex < text.length) {
          const idx = indexOfWord(text, hl.text, startIndex)
          if (idx === -1) break
          ranges.push({ start: idx, end: idx + hl.text.length, bg: hl.bg })
          startIndex = idx + hl.text.length
        }
      }
      if (ranges.length === 0) return text

      ranges.sort((a, b) => a.start - b.start)
      const merged = [ranges[0]]
      for (let i = 1; i < ranges.length; i++) {
        const last = merged[merged.length - 1]
        if (ranges[i].start >= last.end) merged.push(ranges[i])
      }

      const fragments = []
      let cursor = 0
      for (const r of merged) {
        if (cursor < r.start) fragments.push(text.slice(cursor, r.start))
        if (r.quote != null) {
          const num = r.quote
          fragments.push(
            <mark
              key={`q-${r.start}`}
              className="p-quoted"
              data-quote-num={num}
              title={i18n._(COPY.chat.quoted, { num })}
              onClick={() => { if (window.getSelection()?.isCollapsed !== false) window.dispatchEvent(new CustomEvent('parliament-find-card', { detail: { num } })) }}
            >
              {text.slice(r.start, r.end)}
            </mark>
          )
          cursor = r.end
          continue
        }
        fragments.push(
          <mark
            key={`hl-${r.start}`}
            style={{ backgroundColor: r.bg, borderRadius: '2px', padding: '0 1px', color: 'inherit' }}
          >
            {text.slice(r.start, r.end)}
          </mark>
        )
        cursor = r.end
      }
      if (cursor < text.length) fragments.push(text.slice(cursor))
      return fragments
    }

    function applyHighlights(children) {
      if (!highlightTerms.length && !quotes.length) return children
      return React.Children.map(children, (child) => {
        if (typeof child === 'string') return highlightString(child)
        if (child && child.props && child.props.children) {
          return React.cloneElement(child, {
            ...child.props,
            children: applyHighlights(child.props.children),
          })
        }
        return child
      })
    }

    // Heading anchor injector — always on, independent of highlight state.
    // toc@1.0's `response-headings` mode (PR-13) scans message content with
    // the same /^(#{1,4})\s+/m regex and reconstructs anchor ids in
    // document order, so the index must match what react-markdown produces
    // here. ReactMarkdown processes the mdast→hast tree depth-first so
    // h1..h4 callbacks fire in document order; a closure counter is
    // sufficient to keep the indices aligned.
    let headingIdx = 0
    const headingId = () => `msg-${id}-h-${headingIdx++}`

    const marked = highlightTerms.length > 0 || quotes.length > 0
    const maybeHL = marked ? applyHighlights : (c) => c
    const baseComponents = {
      h1: ({ children, ...props }) => <h1 {...props} id={headingId()}>{maybeHL(children)}</h1>,
      h2: ({ children, ...props }) => <h2 {...props} id={headingId()}>{maybeHL(children)}</h2>,
      h3: ({ children, ...props }) => <h3 {...props} id={headingId()}>{maybeHL(children)}</h3>,
      h4: ({ children, ...props }) => <h4 {...props} id={headingId()}>{maybeHL(children)}</h4>,
    }

    const highlightedComponents = marked ? {
      ...baseComponents,
      p:          ({ children, ...props }) => <p          {...props}>{applyHighlights(children)}</p>,
      li:         ({ children, ...props }) => <li         {...props}>{applyHighlights(children)}</li>,
      td:         ({ children, ...props }) => <td         {...props}>{applyHighlights(children)}</td>,
      th:         ({ children, ...props }) => <th         {...props}>{applyHighlights(children)}</th>,
      strong:     ({ children, ...props }) => <strong     {...props}>{applyHighlights(children)}</strong>,
      em:         ({ children, ...props }) => <em         {...props}>{applyHighlights(children)}</em>,
      blockquote: ({ children, ...props }) => <blockquote {...props}>{applyHighlights(children)}</blockquote>,
    } : baseComponents

    const chartCodeComponent = ({ className, children }) => {
      const lang = (className || '').replace('language-', '')
      if (lang === 'chart') {
        return <ChartRenderer data={String(children).trim()} />
      }
      return <code className={className}>{children}</code>
    }

    return (
      <div className="parliament-md text-[15px]">
        <Markdown components={{ ...highlightedComponents, code: chartCodeComponent }}>
          {displayContent}
        </Markdown>
      </div>
    )
  }, [id, displayContent, highlightTerms, quotes, source, i18n, translated, translation, editable, type, blocks, clean, onSaveEdits, closedEdits, toldTo, askInfo, onSettleAsk, askWords])

  return (
    <motion.div
      id={`msg-${id}`}
      custom={index}
      variants={index !== undefined ? messageVariants : undefined}
      initial={index !== undefined ? 'hidden' : false}
      animate={index !== undefined ? 'show' : { opacity: isGhostText ? 0.55 : 1 }}
      layout="position"
      className={`relative group ${type === 'user' ? 'ml-12' : 'mr-12'}`}
    >
      <motion.div
        whileHover={{ borderColor: '#E0E0E0' }}
        transition={{ duration: 0.2 }}
        className={`rounded-lg border transition-colors ${
          isGhostText ? 'border-dashed border-[#9B9A97]' : 'border-[#E9E9E7]'
        }`}
        style={{ backgroundColor: 'var(--p-bg-surface)' }}
      >
        {/* Header row */}
        <div
          {...fixed}
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--p-border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
              #{number}
            </span>
            {(isFavorited || savedNoteText) && (
              <div className="flex items-center gap-1.5">
                {isFavorited && (
                  <Star
                    className="w-3 h-3"
                    style={{ fill: DUSTY_GOLD, color: DUSTY_GOLD, strokeLinejoin: 'round' }}
                  />
                )}
                {savedNoteText && <StickyNote className="w-3 h-3 text-[#D9730D]" />}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <MsgIconButton onClick={handleFavoriteClick} active={isFavorited} title="Favorite">
              <Star
                className="w-3.5 h-3.5"
                style={isFavorited ? { fill: DUSTY_GOLD, color: DUSTY_GOLD, strokeLinejoin: 'round' } : {}}
              />
            </MsgIconButton>
            <MsgIconButton onClick={onNote} active={showNotes} title="Add note">
              <StickyNote className="w-3.5 h-3.5" />
            </MsgIconButton>
            <MsgIconButton onClick={onBranch} title="Branch from here">
              <GitBranch className="w-3.5 h-3.5" />
            </MsgIconButton>
            <MsgIconButton onClick={onDelete} title="Delete message">
              <Trash2 className="w-3.5 h-3.5" />
            </MsgIconButton>
            <div className="relative">
              <MsgIconButton onClick={() => setShowMenu(!showMenu)} title="More options">
                <MoreVertical className="w-3.5 h-3.5" />
              </MsgIconButton>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-8 w-44 border border-[#E9E9E7] rounded-lg shadow-xl z-30 overflow-hidden bg-white"
                  >
                    <MenuButton icon={Eye} onClick={() => { onHide?.(); setShowMenu(false) }}>
                      Hide message
                    </MenuButton>
                    <MenuButton icon={ArrowRightCircle} onClick={() => { onMoveToBranch?.(); setShowMenu(false) }}>
                      Send to branch
                    </MenuButton>
                    <MenuButton icon={Quote} onClick={() => { onPinForReference?.(); setShowMenu(false) }}>
                      {i18n._(COPY.chat.quoteMessage)}
                    </MenuButton>
                    <MenuButton icon={Copy} onClick={() => { handleCopy(); setShowMenu(false) }}>
                      {copied ? 'Copied!' : 'Copy text'}
                    </MenuButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content */}
        {/* Typing in an edited reply puts the highlight picker away. */}
        <div className="px-4 py-4 overflow-hidden relative" ref={contentRef} onMouseUp={handleMouseUp} onKeyDown={() => { if (popoverPos) { setPopoverPos(null); onPopoverChange?.(false) } }}>
          <div className="text-sm leading-relaxed" style={{ color: 'var(--p-text-primary)' }}>
            {thinking?.text && <div {...fixed}><Thinking thinking={thinking} /></div>}
            {hostContent ? <HostedText el={hostContent} /> : renderContent}
            {/* A source that found nothing says so where its answer would be. */}
            {source?.found === false && <SourceLine source={source} />}
          </div>

          {/* PR-18e: attachment chips on user messages — a memory aid
              showing what files were attached on this turn. Base64 data
              isn't persisted, so follow-up turns lose binary context;
              the chips help users understand why Claude might reference
              an image they no longer "see" in the rendered text. */}
          {type === 'user' && Array.isArray(attachmentMeta) && attachmentMeta.length > 0 && (
            <div
              {...fixed}
              className="mt-2 flex flex-wrap gap-1.5"
              title="Attachments are visible to Claude only on the turn they were sent. Re-attach if you need them in follow-ups."
            >
              {attachmentMeta.map((meta) => {
                const Icon = iconForAttachment(meta.category)
                return (
                  <div
                    key={meta.id || `${meta.name}-${meta.size}`}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{
                      backgroundColor: 'rgba(155,154,151,0.10)',
                      color: 'var(--p-text-primary)',
                      border: '1px solid #E9E9E7',
                    }}
                  >
                    <Icon className="w-3 h-3 shrink-0 text-[var(--p-text-secondary)]" />
                    <span className="truncate max-w-[180px]" title={meta.name}>{meta.name}</span>
                    {typeof meta.size === 'number' && (
                      <span className="text-[10px] opacity-60">{formatSize(meta.size)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Highlight color picker popover */}
          <AnimatePresence>
            {isPopoverActive && popoverPos && (() => {
              const showBelow = popoverPos.y < 40
              return (
                <motion.div
                  {...fixed}
                  initial={{ opacity: 0, scale: 0.9, y: showBelow ? -4 : 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: showBelow ? -4 : 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute z-40 flex items-center gap-1 px-2 py-1.5 bg-white border border-[#E9E9E7] rounded-lg shadow-lg"
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    left: Math.max(0, popoverPos.x - 60),
                    top:  showBelow ? popoverPos.y + 24 : popoverPos.y - 32,
                  }}
                >
                  <Pencil className="w-3 h-3 text-[var(--p-text-secondary)] mr-1" />
                  {HIGHLIGHT_COLORS.map((c) => (
                    <motion.button
                      key={c.id}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleHighlightColor(c.color)}
                      className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: c.color }}
                      title={c.id}
                    />
                  ))}
                  {onQuote && !source && (
                    <>
                      <span className="mx-1 text-[var(--p-text-muted)]" aria-hidden="true">·</span>
                      <button type="button" onClick={handleQuote} className="p-quote-btn" title={i18n._(COPY.chat.quoteHelp)}>
                        {i18n._(COPY.chat.quote)}
                      </button>
                    </>
                  )}
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </div>

        {/* Notes panel */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              {...fixed}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_SNAPPY}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0">
                <div className="border border-[#E9E9E7] rounded-lg p-3" style={{ backgroundColor: '#FEFCE8' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-3.5 h-3.5 text-[#D9730D]" />
                    <span className="text-xs font-medium text-[#D9730D]">Note</span>
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onBlur={handleNoteBlur}
                    placeholder="Add a note about this message..."
                    className="w-full bg-transparent text-xs text-[var(--p-text-secondary)] resize-none focus:outline-none placeholder:text-[var(--p-text-muted)]"
                    rows={2}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div {...fixed}>
      {stoppedNote && (
        <p className="mt-2 text-xs italic text-[var(--p-text-secondary)]">{stoppedNote}</p>
      )}

      {/* Where an answer from a source came from: the page, its revision and
          its licence (stage 4). Words come from the copy table. */}
      {source && source.found !== false && <SourceLine source={source} />}
      {/* Words that read like instructions to a model, marked, never blocked (C169). */}
      {source && source.found !== false && <InstructionLine text={displayContent} />}
      {/* Its translation, by whom, and the source's own words a click away (C166 (f)). */}
      {source && translation && <TranslationLine translation={translation} original={original} onToggle={() => setOriginal((o) => !o)} />}
      {/* The question as it went, when it was translated first (C85). */}
      {type === 'user' && asked && <AskedLine asked={asked} />}
      {/* Answers from sources brought into this prompt, and how they went (C176). */}
      {type === 'user' && Array.isArray(included) && included.length > 0 && <IncludedLine included={included} />}
      {/* The notes it carried for the model, told once (C225 (d)). As text. */}
      {type === 'user' && Array.isArray(tells) && tells.map((t, i) => (
        <p key={i} className="mt-1 text-xs italic text-[var(--p-text-secondary)]" dir="auto">{i18n._(COPY.chat.toldNote, { note: t })}</p>
      ))}
      {/* The summary a branch starts from, said to be one, and by whom (C175). */}
      {summary && <SummaryLine summary={summary} />}
      {/* The frameworks it was written under (C164). */}
      {Array.isArray(frameworks) && frameworks.length > 0 && <FrameworkLine frameworks={frameworks} />}
      {/* The sources a web search found and the reply cited, kept and shown (C167 (f)). */}
      {Array.isArray(citations) && citations.length > 0 && <CitedSources citations={citations} />}

      {/* Ghost text continue button */}
      {isGhostText && content && onContinue && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onContinue}
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#B8A070] border border-[#E9E9E7] hover:border-[#B8A070] transition-colors"
        >
          Continue
        </motion.button>
      )}
      {editedLine}
      </div>
    </motion.div>
  )
}

/* ── Internal sub-components ────────────────────────────── */

// The editor's text for this card, put where the card's text goes. The
// element belongs to the editor (a prompt and its reply as one); React only
// places it.
function HostedText({ el }) {
  const box = useRef(null)
  useLayoutEffect(() => {
    if (box.current && el && el.parentNode !== box.current) box.current.appendChild(el)
  }, [el])
  return <div ref={box} className="p-edit parliament-md text-[15px]" />
}

// A minute and seconds: 2:31.
const clock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// A model's thinking (C165), set apart from the answer: its own label, a
// quiet italic in a narrow column with a dotted rule, never formatted. While
// it thinks, the last lines show and a clock runs, so a long wait is seen
// to be work. Once the answer begins, or later, it folds to one line that
// opens it.
function Thinking({ thinking }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const box = useRef(null)
  const live = thinking.live && !thinking.answering
  useEffect(() => {
    if (!live) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [live])
  useEffect(() => { if (live && box.current) box.current.scrollTop = box.current.scrollHeight }, [live, thinking.text])
  const label = live
    ? i18n._(COPY.chat.thinking, { time: clock(now - (thinking.since ?? now)) })
    : thinking.ms != null ? i18n._(COPY.chat.thought, { minutes: Math.max(1, Math.round(thinking.ms / 60000)), short: thinking.ms < 60000 ? 1 : 0 }) : i18n._(COPY.chat.thoughtUntimed)
  return (
    <div className="parliament-thinking mb-3" aria-live={live ? 'polite' : undefined}>
      <p className="text-xs italic text-[var(--p-text-secondary)] flex gap-1.5 items-baseline">
        <span>{label}</span>
        {!live && (
          <>
            <span aria-hidden="true">·</span>
            <button type="button" className="underline underline-offset-2" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {i18n._(open ? COPY.chat.thoughtHide : COPY.chat.thoughtShow)}
            </button>
          </>
        )}
      </p>
      {(live || open) && (
        <div
          ref={box}
          className={`mt-1 ps-3 border-s border-dotted border-[var(--p-text-secondary)]/40 text-xs italic leading-relaxed text-[var(--p-text-secondary)] whitespace-pre-wrap ${live ? 'max-h-32 overflow-hidden' : 'max-h-80 overflow-y-auto'}`}
          dir="auto"
        >
          {thinking.text}
        </div>
      )}
    </div>
  )
}

// The sources a reply cited from a web search (C167 (f)): each a link that
// shows its whole address before it opens (C146 (b)), with the passages it
// quoted, as text.
function CitedSources({ citations }) {
  const { i18n } = useLingui()
  return (
    <div className="mt-2 text-xs text-[var(--p-text-secondary)]">
      <p className="italic">{i18n._(COPY.cited.heading)}</p>
      <ol className="mt-1 space-y-1 list-decimal ps-5">
        {citations.map((c, i) => (
          <li key={i} dir="auto">
            <CitationLink href={c.url}>{c.title || c.url}</CitationLink>
            {(c.quoted ?? []).map((q, j) => <span key={j} className="block italic">“{q}”</span>)}
          </li>
        ))}
      </ol>
    </div>
  )
}

// A warning under an answer from a source whose words read like
// instructions to a model (security notes §1.4; C169).
function InstructionLine({ text }) {
  const { i18n } = useLingui()
  const phrases = useMemo(() => instructionLike(text), [text])
  if (!phrases.length) return null
  const list = new Intl.ListFormat(i18n.locale, { type: 'conjunction' }).format(phrases.map((p) => `“${p}”`))
  return <p className="mt-1 text-xs italic text-[var(--p-text-primary)]" dir="auto">{i18n._(COPY.chat.instructionLike, { phrases: list })}</p>
}

// A language's name in the reader's language, from the browser.
function languageName(locale, tag) {
  try {
    return new Intl.DisplayNames([locale], { type: 'language', fallback: 'code' }).of(tag) ?? tag
  } catch {
    return tag
  }
}

// "Translated into Swedish by Haiku 5.5 · show the original" (C166 (f)).
function TranslationLine({ translation, original, onToggle }) {
  const { i18n } = useLingui()
  const language = languageName(i18n.locale, translation.lang)
  const words = translation.by === 'browser'
    ? i18n._(COPY.chat.translatedByBrowser, { language })
    : i18n._(COPY.chat.translatedBy, { language, by: modelFacts(translation.by)?.name ?? translation.by })
  return (
    <p className="mt-1 text-xs italic text-[var(--p-text-secondary)]">
      {words}
      <span aria-hidden="true"> · </span>
      <button type="button" onClick={onToggle} className="underline underline-offset-2 italic">
        {i18n._(original ? COPY.chat.showTranslation : COPY.chat.showOriginal)}
      </button>
    </p>
  )
}

// "Asked in English as “barn owls”" (C85).
function AskedLine({ asked }) {
  const { i18n } = useLingui()
  const words = asked.by === 'search' ? i18n._(COPY.chat.searchedFor, { text: asked.text }) : i18n._(COPY.chat.askedAs, { language: languageName(i18n.locale, asked.lang), text: asked.text })
  return <p className="mt-1 text-xs italic text-[var(--p-text-secondary)]" dir="auto">{words}</p>
}

// "With the answer from Wikipedia (Barn owl), sent as material from a
// source, marked as data" (C176), and when words in it read like instructions.
function IncludedLine({ included }) {
  const { i18n } = useLingui()
  const names = included.map((x) => (x.source?.title ? `${x.source?.name ?? x.source?.id} (${x.source.title})` : x.source?.name ?? x.source?.id ?? ''))
  const flagged = included.some((x) => x.phrases?.length)
  return (
    <p className="mt-1 text-xs italic text-[var(--p-text-secondary)]" dir="auto">
      {i18n._(COPY.chat.includedWith, { count: included.length, sources: new Intl.ListFormat(i18n.locale, { type: 'conjunction' }).format(names) })}
      {flagged && <> {i18n._(COPY.chat.includedFlagged)}</>}
    </p>
  )
}

// "A summary of 203b, written by Haiku 5.5": a branch started from a summary
// carries on from it, and models are sent it as what came before (C175).
function SummaryLine({ summary }) {
  const { i18n } = useLingui()
  const name = summary.name || i18n._(COPY.chat.summaryBy)
  const words = summary.address ? i18n._(COPY.chat.summaryOf, { address: summary.address, name }) : i18n._(COPY.chat.summaryOfGone, { name })
  return <p className="mt-2 text-xs italic text-[var(--p-text-secondary)]" dir="auto">{words}</p>
}

// "Written under Push back on me and Editor": the built in by their names in
// the reader's language, the person's own by the name it had, and one of
// those since removed with no name kept, said so (C164).
function FrameworkLine({ frameworks }) {
  const { i18n } = useLingui()
  const names = frameworks.map((f) => (COPY.frameworks[f?.id] ? i18n._(COPY.frameworks[f.id]) : f?.name || i18n._(COPY.chat.frameworkGone)))
  return <p className="mt-2 text-xs italic text-[var(--p-text-secondary)]">{i18n._(COPY.chat.writtenUnder, { names: new Intl.ListFormat(i18n.locale, { type: 'conjunction' }).format(names) })}</p>
}

// A date as a source gives it: a year stays a year; a full date is written
// the way the reader's language writes one.
function sourceDate(locale, date) {
  if (!date || /^\d{1,4}$/.test(date)) return date || null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
  } catch {
    return date.slice(0, 10)
  }
}

// The results of a source that answers with a list (Hacker News, OpenAlex;
// stage 7, piece 2): each its title as a link that shows its whole address
// before it opens (C146 (b)), then its date and facts, then any passage.
// Every word of the source is text; the facts' words come from the copy table.
function SourceResults({ items }) {
  const { i18n } = useLingui()
  const facts = (it) => [
    sourceDate(i18n.locale, it.date),
    it.facts?.authors,
    it.facts?.points != null && i18n._(COPY.chat.sourcePoints, { count: Number(it.facts.points) || 0 }),
    it.facts?.comments != null && i18n._(COPY.chat.sourceComments, { count: Number(it.facts.comments) || 0 }),
  ].filter(Boolean)
  return (
    <ol className="parliament-md text-[15px] space-y-3 list-none p-0 m-0">
      {items.map((it, i) => (
        <li key={i} dir="auto">
          {it.url || it.discussion ? <CitationLink href={it.url ?? it.discussion}>{it.title}</CitationLink> : <span>{it.title}</span>}
          <span className="block text-xs italic text-[var(--p-text-secondary)]">
            {facts(it).join(' · ')}
            {it.discussion && it.url && (
              <>
                {facts(it).length ? ' · ' : ''}
                <CitationLink href={it.discussion}>{i18n._(COPY.chat.sourceDiscussion)}</CitationLink>
              </>
            )}
          </span>
          {it.text && <span className="block mt-1 whitespace-pre-wrap">{it.text}</span>}
        </li>
      ))}
    </ol>
  )
}

// "Answered from Wikipedia · Barn owl · revision 1381083335 · CC BY-SA 4.0",
// each part a link where it has one; or that nothing was found (stage 4).
function SourceLine({ source }) {
  const { i18n } = useLingui()
  const name = source.name || source.id
  if (source.found === false) {
    return <p className="italic text-[var(--p-text-secondary)]">{i18n._(COPY.chat.sourceNothing, { source: name })}</p>
  }
  const link = (href, text) => (href && /^https:\/\//.test(href)
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{text}</a>
    : <span>{text}</span>)
  const parts = [
    <span key="from">{i18n._(COPY.chat.answeredFrom, { source: name })}</span>,
    source.title && <span key="title">{link(source.url, source.title)}</span>,
    source.revision && <span key="rev">{i18n._(COPY.chat.sourceRevision, { revision: source.revision })}</span>,
    source.licence?.name && <span key="lic">{link(source.licence.url, source.licence.name)}</span>,
  ].filter(Boolean)
  return (
    <p className="mt-2 text-xs italic text-[var(--p-text-secondary)] flex flex-wrap gap-x-1.5">
      {parts.flatMap((p, i) => (i ? [<span key={`s${i}`} aria-hidden="true">·</span>, p] : [p]))}
    </p>
  )
}

function MsgIconButton({ onClick, children, active = false, title }) {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-[#B8A070]/15 text-[#B8A070]'
          : 'border border-transparent hover:border-[var(--p-text-primary)]/20 text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'
      }`}
    >
      {children}
    </motion.button>
  )
}

function MenuButton({ icon: Icon, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-xs text-[var(--p-text-secondary)] border border-transparent hover:border-[var(--p-text-primary)]/20 hover:text-[var(--p-text-primary)] transition-colors flex items-center gap-2"
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  )
}
