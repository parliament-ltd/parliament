// file-attach@1.0 — production render (PR-18e).
//
// No slot UI of its own (returns null). The visible affordance lives
// inside input@1.0:
//   - The `+` overflow menu item (from this manifest's `inputAction`
//     contribution).
//   - The attachments chip strip above the textarea (rendered by
//     InputArea reading hostAPI.getAttachments()).
//
// What this component owns:
//   - The hidden <input type="file"> picker, mounted at the document
//     body level so it's always accessible regardless of how the
//     component is slotted.
//   - Local React state of the staged attachment list.
//   - Subscriptions:
//       input-action:file-attach        → open the picker
//       attachments-changed              → reflect external removals
//                                          (chip × calls _setAttachments)
//       message-sent                     → clear on successful send
//   - Reading uploaded files (image/PDF base64 or text inline via the
//     existing lib/fileUpload pipeline) with error handling for
//     unsupported types / oversize files / read failures.
//
// File limits:
//   - 10 MB per binary file (image / PDF). Hard reject.
//   - 200 KB per text/code file (truncated above).
//   - Up to 10 attachments per message. Hard reject above.
//
// Errors are published on the room bus as `attach-error` events so
// input@1.0 can surface them via its inline error slot. The picker
// processes files one at a time so a single bad file doesn't abort
// the rest.

import { useEffect, useRef, useState } from 'react'
import {
  readUploadedFile,
  categorizeFile,
  MAX_ATTACHMENTS_PER_MESSAGE,
  ACCEPTED_FILE_TYPES,
} from '../../lib/fileUpload'

export default function FileAttachRender({ hostAPI, componentId } = {}) {
  const [attachments, setAttachments] = useState([])
  const fileInputRef = useRef(null)
  const inputElRef = useRef(null)

  // Mount a hidden <input type="file"> at the document body so the
  // picker works even when this component's own JSX render is null.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = ACCEPTED_FILE_TYPES
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    input.style.top = '-9999px'
    input.style.opacity = '0'
    input.setAttribute('aria-hidden', 'true')
    document.body.appendChild(input)
    inputElRef.current = input
    fileInputRef.current = input
    const onChange = async (e) => {
      const files = Array.from(e.target?.files || [])
      e.target.value = '' // reset so re-picking the same file fires onChange
      if (files.length === 0) return
      await ingestFiles(files)
    }
    input.addEventListener('change', onChange)
    return () => {
      input.removeEventListener('change', onChange)
      try { document.body.removeChild(input) } catch { /* already removed */ }
      inputElRef.current = null
      fileInputRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push the current list into the hostAPI registry whenever it changes
  // so input@1.0's chip strip stays in sync. _setAttachments handles
  // both "replace with new list" and "clear" (empty array).
  useEffect(() => {
    if (!hostAPI || !componentId) return
    hostAPI._setAttachments?.(componentId, attachments)
  }, [attachments, hostAPI, componentId])

  // Reflect external removals — chip × clicks call
  // hostAPI._setAttachments(componentId, shorterList) directly.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe('attachments-changed', (payload) => {
      if (!payload) return
      if (payload.componentId !== componentId) return
      // If the registry was just set to a different count than our local
      // state, sync down. Skip echoes where it already matches.
      const current = hostAPI.getAttachments?.() || []
      const mine = current.filter(a => a.componentId === componentId)
      setAttachments(prev => {
        if (prev.length === mine.length) return prev
        return mine.map(a => ({ ...a }))
      })
    })
  }, [hostAPI, componentId])

  // Open picker on `+` menu tap.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe('input-action:file-attach', () => {
      fileInputRef.current?.click()
    })
  }, [hostAPI])

  // Clear after a successful send.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe('message-sent', () => {
      setAttachments(prev => (prev.length === 0 ? prev : []))
    })
  }, [hostAPI])

  async function ingestFiles(files) {
    for (const file of files) {
      // Enforce the per-message cap as we go so a 50-file drop doesn't
      // blow past the limit in a single batch.
      let proceed = true
      setAttachments(prev => {
        if (prev.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
          publishError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`)
          proceed = false
          return prev
        }
        return prev
      })
      if (!proceed) break

      // Fast reject of unsupported types before we even read the file.
      if (!categorizeFile(file)) {
        const ext = file.name.split('.').pop() || 'this file type'
        publishError(`Sorry, .${ext} files aren't supported. Try an image, PDF, or text/code file.`)
        continue
      }

      try {
        const attachment = await readUploadedFile(file)
        setAttachments(prev => {
          if (prev.length >= MAX_ATTACHMENTS_PER_MESSAGE) return prev
          return [...prev, attachment]
        })
      } catch (err) {
        publishError(err?.message || 'Could not read that file.')
      }
    }
  }

  function publishError(message) {
    if (!hostAPI?.publish) return
    // We don't have an `attach-error` event in the known-events list;
    // input@1.0 subscribes via prefix match on `input-action:` only.
    // Use a fresh prefix `attach:` for status events.
    hostAPI.publish('attach:error', { message })
  }

  // Contribution-only component: no rendered surface in any slot.
  // The visible state lives in input@1.0's `+` menu (manifest) and
  // chip strip (hostAPI.getAttachments() reader).
  return null
}
