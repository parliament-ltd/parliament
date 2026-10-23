import { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import {
  CATEGORIES, BACKUP_PASSWORD_MIN, buildBackupFile, buildManifest, decryptBackup, downloadBlob,
  gatherBackupContents, recordBackup, restoreContents, validateContents, flatV1ToContents,
} from '../lib/backup'
import { OFF_UNLESS_CHOSEN } from '../lib/backupData'
import { longDay } from './say'

// Backups from the bar (refactor-plan.md, stage 9, piece 2; settings spec
// §11; A21; audit T9 and T13; C182). backup: opens this panel under the
// field: what goes in, and whether the file has a password, said plainly
// either way. restore: and import: open a file picker first; the file is
// read and said before anything changes, and a "replace" offers what it is
// about to replace as a download first. A password is typed only into the
// fields here, never the bar, and is let go once used.
//
// Layouts and preferences go in only when ticked (ruled 20 October). The
// old homepage travels with rooms.

const SHOWN = CATEGORIES.filter((c) => c !== 'homepage')
const LABEL = {
  chats: COPY.backup.catChats, annotations: COPY.backup.catAnnotations, rooms: COPY.backup.catRooms,
  library: COPY.backup.catLibrary, preferences: COPY.backup.catPreferences, layouts: COPY.backup.catLayouts,
}
const ABOUT = {
  chats: COPY.backup.catChatsAbout, annotations: COPY.backup.catAnnotationsAbout, rooms: COPY.backup.catRoomsAbout,
  library: COPY.backup.catLibraryAbout, preferences: COPY.backup.catPreferencesAbout, layouts: COPY.backup.catLayoutsAbout,
}
const COUNTS = ['chats', 'rooms', 'notes', 'highlights', 'pins']

function PasswordChoice({ withPassword, onChoose, name }) {
  const { i18n } = useLingui()
  return (
    <div className="ch-picks" role="radiogroup" aria-label={i18n._(COPY.backup.passwordTitle)}>
      {[[true, COPY.backup.withPassword, COPY.backup.withPasswordAbout], [false, COPY.backup.noPassword, COPY.backup.noPasswordAbout]].map(([v, l, h]) => (
        <label key={String(v)} className={`ch-pick${withPassword === v ? ' on' : ''}`}>
          <input type="radio" name={name} className="ch-sr" checked={withPassword === v} onChange={() => onChoose(v)} />
          <span className="dot" /><span><span className="pl">{i18n._(l)}</span><span className="ph">{i18n._(h)}</span></span>
        </label>
      ))}
    </div>
  )
}

// Two password fields, read only when used; never kept in state.
function PasswordFields({ first, second, label }) {
  const { i18n } = useLingui()
  return (
    <div className="ch-bk-pw">
      <input ref={first} type="password" autoComplete="new-password" data-1p-ignore data-lpignore="true" aria-label={label} placeholder={i18n._(COPY.backup.passwordPlaceholder, { count: BACKUP_PASSWORD_MIN })} />
      <input ref={second} type="password" autoComplete="new-password" data-1p-ignore data-lpignore="true" aria-label={i18n._(COPY.backup.passwordAgain)} placeholder={i18n._(COPY.backup.passwordAgain)} />
    </div>
  )
}

/** A password from the two fields, or why not; the fields are cleared. */
function readPassword(first, second) {
  const a = first.current?.value ?? ''
  const b = second.current?.value ?? ''
  if (a.length < BACKUP_PASSWORD_MIN) return { bad: 'short' }
  if (a !== b) return { bad: 'differ' }
  if (first.current) first.current.value = ''
  if (second.current) second.current.value = ''
  return { password: a }
}

async function makeBackup(categories, password) {
  const cats = categories.includes('rooms') ? [...categories, 'homepage'] : categories
  const contents = await gatherBackupContents(cats)
  const manifest = buildManifest(contents)
  const { blob, filename } = await buildBackupFile({ contents, password })
  downloadBlob(blob, filename)
  await recordBackup({ filename, size: blob.size, encrypted: Boolean(password), categories: cats, manifest })
  return filename
}

/**
 * @param {{ mode: 'backup'|'restore'|'import', file?: { name: string, parsed?: object, error?: string, other?: boolean }|null,
 *   onClose: () => void, onDone: (says: object) => void }} props
 */
export default function BackupPanel({ mode, file = null, onClose, onDone }) {
  const { i18n } = useLingui()
  const say = (d, v) => i18n._(d, v)
  const [picked, setPicked] = useState(() => new Set(SHOWN.filter((c) => !OFF_UNLESS_CHOSEN.includes(c))))
  const [withPassword, setWithPassword] = useState(true)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const pw1 = useRef(null)
  const pw2 = useRef(null)
  const unlockField = useRef(null)
  const panel = useRef(null)

  // Restoring: the file's contents once readable, and how they come back.
  const parsed = file?.parsed ?? null
  const plain = parsed && ((parsed.kind === 'v2' && !parsed.envelope.encrypted) || parsed.kind === 'v1-json')
  const [contents, setContents] = useState(null)
  const [strategy, setStrategy] = useState('merge')
  const [keptCopy, setKeptCopy] = useState(null)
  const confirmField = useRef(null)
  const [armed, setArmed] = useState(false)
  const [keepWithPassword, setKeepWithPassword] = useState(true)
  const keep1 = useRef(null)
  const keep2 = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    const el = panel.current
    el?.addEventListener('keydown', onKey)
    return () => el?.removeEventListener('keydown', onKey)
  }, [onClose])

  // A file with nothing locked is read at once, so it can be said.
  const readable = plain ? (parsed.kind === 'v2' ? parsed.envelope.contents : flatV1ToContents(parsed.envelope)) : null
  const shown = contents ?? readable
  const check = shown ? validateContents(shown) : null

  const toggle = (c) => setPicked((was) => {
    const next = new Set(was)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    return next
  })

  async function runBackup() {
    if (busy) return
    setProblem(null)
    const cats = SHOWN.filter((c) => picked.has(c))
    if (!cats.length) { setProblem(COPY.backup.problemNothing); return }
    let password = null
    if (withPassword) {
      const r = readPassword(pw1, pw2)
      if (r.bad) { setProblem(r.bad === 'short' ? COPY.backup.problemShort : COPY.backup.problemDiffer); return }
      password = r.password
    }
    setBusy(true)
    try {
      const filename = await makeBackup(cats, password)
      onDone({ message: password ? 'backupDoneLocked' : 'backupDoneOpen', values: { filename } })
    } catch {
      setProblem(COPY.backup.problemFailed)
    } finally {
      setBusy(false)
    }
  }

  async function unlock() {
    if (busy || !parsed) return
    setProblem(null)
    const password = unlockField.current?.value ?? ''
    if (!password) { setProblem(COPY.backup.problemNeedPassword); return }
    setBusy(true)
    try {
      const c = await decryptBackup(parsed, password)
      if (unlockField.current) unlockField.current.value = ''
      setContents(c)
    } catch {
      setProblem(COPY.backup.problemUnlock)
    } finally {
      setBusy(false)
    }
  }

  // Before a replace, what is here, as a backup of its own (T13).
  async function keepWhatIsHere() {
    if (busy) return
    setProblem(null)
    let password = null
    if (keepWithPassword) {
      const r = readPassword(keep1, keep2)
      if (r.bad) { setProblem(r.bad === 'short' ? COPY.backup.problemShort : COPY.backup.problemDiffer); return }
      password = r.password
    }
    setBusy(true)
    try {
      setKeptCopy(await makeBackup(SHOWN.filter((c) => c !== 'layouts'), password))
    } catch {
      setProblem(COPY.backup.problemFailed)
    } finally {
      setBusy(false)
    }
  }

  async function bringBack() {
    if (busy || !shown || !check?.valid) return
    if (strategy === 'replace' && !armed) return
    setBusy(true)
    setProblem(null)
    try {
      const summary = await restoreContents(shown, { strategy })
      const total = (k) => Object.values(summary).reduce((sum, s) => sum + (s?.[k] || 0), 0)
      onDone({ message: strategy === 'replace' ? 'restoreReplaced' : 'restoreMerged', values: { count: total('added') + total('copied'), copies: total('copied'), skipped: total('skipped') }, reload: true })
    } catch {
      setProblem(COPY.backup.problemRestore)
      setBusy(false)
    }
  }

  const counts = shown ? buildManifest(shown).counts : parsed?.envelope?.manifest?.counts ?? null
  const created = parsed?.envelope?.createdAt ?? null

  return (
    <div className="ch-keys ch-backup" ref={panel} role="region" aria-label={say(mode === 'backup' ? COPY.backup.titleBackup : COPY.backup.titleRestore)}>
      <div className="ch-keys-head">
        <span className="ch-btitle">{say(mode === 'backup' ? COPY.backup.titleBackup : COPY.backup.titleRestore)}</span>
        <button type="button" className="ch-marg ch-keyact" onMouseDown={(e) => e.preventDefault()} onClick={onClose}>{say(COPY.backup.close)}</button>
      </div>

      {mode === 'backup' && (
        <>
          <p className="ch-keys-note">{say(COPY.backup.lede)}</p>
          <div className="ch-bk-cats">
            {SHOWN.map((c) => (
              <label key={c} className="ch-bk-cat">
                <input type="checkbox" checked={picked.has(c)} onChange={() => toggle(c)} />
                <span><span className="pl">{say(LABEL[c])}</span><span className="ph">{say(ABOUT[c])}</span></span>
              </label>
            ))}
          </div>
          <PasswordChoice withPassword={withPassword} onChoose={setWithPassword} name="bk-pw" />
          {withPassword && <PasswordFields first={pw1} second={pw2} label={say(COPY.backup.passwordTitle)} />}
          {problem && <p className="ch-keys-note warn" role="alert">{say(problem, { count: BACKUP_PASSWORD_MIN })}</p>}
          <div className="ch-bk-act">
            <button type="button" className="ch-bk-btn" disabled={busy} onClick={runBackup}>{say(withPassword ? COPY.backup.downloadLocked : COPY.backup.downloadOpen)}</button>
          </div>
        </>
      )}

      {mode !== 'backup' && file && (
        <>
          {file.error && <p className="ch-keys-note warn" role="alert">{say(COPY.backup.fileUnreadable, { name: file.name, reason: file.error })}</p>}
          {file.other && <p className="ch-keys-note">{say(COPY.backup.fileOther, { name: file.name })}</p>}
          {parsed && (
            <>
              <p className="ch-keys-note">
                {say(COPY.backup.fileIs, { name: file.name, day: created ? longDay(i18n, created.slice(0, 10)) : '', dated: created ? 'yes' : 'no' })}
                {' '}{say(parsed.kind === 'v1-apb' || parsed.envelope?.encrypted ? COPY.backup.fileLocked : COPY.backup.fileOpen)}
              </p>
              {counts && (
                <p className="ch-keys-note">{say(COPY.backup.fileHolds, Object.fromEntries(COUNTS.map((k) => [k, counts[k] ?? 0])))}</p>
              )}
              {!shown && (
                <div className="ch-bk-pw">
                  <input ref={unlockField} type="password" autoComplete="off" data-1p-ignore data-lpignore="true" aria-label={say(COPY.backup.unlockLabel)} placeholder={say(COPY.backup.unlockLabel)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); unlock() } }} />
                  <button type="button" className="ch-bk-btn" disabled={busy} onClick={unlock}>{say(COPY.backup.unlock)}</button>
                </div>
              )}
              {shown && check && !check.valid && <p className="ch-keys-note warn" role="alert">{say(COPY.backup.fileInvalid, { reason: check.error })}</p>}
              {shown && check?.valid && (
                <>
                  <div className="ch-picks" role="radiogroup" aria-label={say(COPY.backup.howTitle)}>
                    {[['merge', COPY.backup.merge, COPY.backup.mergeAbout], ['replace', COPY.backup.replace, COPY.backup.replaceAbout]].map(([v, l, h]) => (
                      <label key={v} className={`ch-pick${strategy === v ? ' on' : ''}`}>
                        <input type="radio" name="bk-how" className="ch-sr" checked={strategy === v} onChange={() => { setStrategy(v); setArmed(false) }} />
                        <span className="dot" /><span><span className="pl">{say(l)}</span><span className="ph">{say(h)}</span></span>
                      </label>
                    ))}
                  </div>
                  {strategy === 'replace' && (
                    <div className="ch-bk-replace">
                      <p className="ch-keys-note">{keptCopy ? say(COPY.backup.keptHere, { filename: keptCopy }) : say(COPY.backup.keepFirst)}</p>
                      {!keptCopy && (
                        <>
                          <PasswordChoice withPassword={keepWithPassword} onChoose={setKeepWithPassword} name="bk-keep-pw" />
                          {keepWithPassword && <PasswordFields first={keep1} second={keep2} label={say(COPY.backup.passwordTitle)} />}
                          <div className="ch-bk-act"><button type="button" className="ch-bk-btn" disabled={busy} onClick={keepWhatIsHere}>{say(COPY.backup.keepDownload)}</button></div>
                        </>
                      )}
                      <label className="ch-bk-confirm">
                        <span>{say(COPY.backup.typeReplace, { word: say(COPY.backup.replaceWord) })}</span>
                        <input ref={confirmField} type="text" autoComplete="off" spellCheck={false} aria-label={say(COPY.backup.typeReplace, { word: say(COPY.backup.replaceWord) })}
                          onChange={(e) => setArmed(e.target.value.trim().toLowerCase() === say(COPY.backup.replaceWord).toLowerCase())} />
                      </label>
                    </div>
                  )}
                  {problem && <p className="ch-keys-note warn" role="alert">{say(problem, { count: BACKUP_PASSWORD_MIN })}</p>}
                  <div className="ch-bk-act">
                    <button type="button" className="ch-bk-btn" disabled={busy || (strategy === 'replace' && !armed)} onClick={bringBack}>
                      {say(strategy === 'replace' ? COPY.backup.doReplace : COPY.backup.doMerge)}
                    </button>
                  </div>
                </>
              )}
              {!shown && problem && <p className="ch-keys-note warn" role="alert">{say(problem, { count: BACKUP_PASSWORD_MIN })}</p>}
            </>
          )}
        </>
      )}
    </div>
  )
}
