<!-- Security, privacy and dependency audit
     Read-only audit by a research agent, 11 October 2026, of branch
     claude/almanac-docket-inventory at d570e5f. Filed as delivered, with paths
     made relative to the repo root. Facts first; the auditor's opinion is in
     its assessment section and carries no authority of its own. -->

# Security, privacy and dependency audit: project-apollo

Branch `claude/almanac-docket-inventory`, HEAD `d570e5f`, audited 2026-10-11. Read-only: no repo file was changed, nothing installed. Two throwaway scripts were written to the session scratchpad only.

Conventions
- Paths are relative to `` (absolute index of key files at the end).
- "Facts" come from code or command output. "Assessment" is my judgement.
- Web-checked points carry [S#] (sources at the end, all fetched 2026-10-11). Anything I could not confirm is marked **unverified**. To respect copyright I paraphrase web sources.
- `dist/` is an untracked local build dated 3 June 2026. I used it only as evidence of what the bundlers emit. Nothing was tested against a live deployment.

## Headline

1. The app's own code has no HTML injection sinks, no eval, no WASM, no third-party origins for scripts, fonts or images. Baseline XSS posture is good.
2. The one known-vulnerable code path that touches untrusted input in production is `xlsx@0.18.5` (two high advisories, no fix on npm, parses user files and restored backup blobs on the main thread).
3. Several privacy and security statements shown to users are not accurate as written (network claims, the network log claim, "never leaves your browser", "open source", the CSP printed in SECURITY.md).
4. Two user-facing safety controls do not do what they say: "Don't save" key mode, and "Delete everything".
5. The API key encryption protects the key at rest and in exports. It does not protect against any script running in the origin. That fact should decide the third-party blocks architecture.
6. Backup restore validation is shallow: arbitrary settings keys, unvalidated nested objects, no size caps. No script execution results, because there are no sinks.
7. `npm audit --omit=dev`: 3 high (react-router, react-router-dom, xlsx). Full audit: 22 (2 critical, 13 high, 5 moderate, 2 low), the rest dev tooling.

---

# PART A: Headers and platform

## 1. netlify.toml

**Facts** (`netlify.toml`, 46 lines)
- Build (L1-3): `command = "npm run build"`, `publish = "dist"`. No Node version pin anywhere (no `.nvmrc`, no `engines`, no `[build.environment]`).
- Redirects: L18-21 `/assets/*` to `/assets/:splat` status 404 (non-forced, so only missing files 404); L23-26 `/*` to `/index.html` status 200.
- One header block, `for = "/*"` (L29-45). CSP exactly (L35):

  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.anthropic.com; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-ancestors 'none'; worker-src 'self'; manifest-src 'self';`

- Other headers: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (L37), `X-Frame-Options: DENY` (L39), `X-Content-Type-Options: nosniff` (L41), `Referrer-Policy: no-referrer` (L43), `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` (L45).
- Absent: COOP, COEP, CORP, any Cache-Control rule, any reporting. No `public/_headers` or `public/_redirects`.
- CSP exists only as this Netlify header. There is no `<meta>` CSP and no `server.headers`/`preview.headers` in `vite.config.js`, so `npm run dev` and `vite preview` run with no CSP at all.

**Missing versus a hardened static-SPA baseline**

| Item | State today | Note |
|---|---|---|
| `base-uri` | missing | Not a fetch directive, so `default-src` does not cover it [S16]. Use `'none'`. |
| `form-action` | missing | Same. Forms can post to any host today. The app's one `<form>` (`src/components/core/HighlightList.jsx:105-106`) calls `preventDefault`, so `'none'` or `'self'` is safe. |
| `frame-src` | implicit `'self'` via default-src | App has no iframes. SECURITY.md claims `frame-src 'none'`; the header does not say it. |
| `object-src`, `frame-ancestors` | present | Good. |
| `style-src-elem` / `style-src-attr` | not split; `'unsafe-inline'` allows both | See item 3: the built bundle appears not to need `'unsafe-inline'` at all. |
| `require-trusted-types-for` / `trusted-types` | missing | Feasible with three accommodations (item 3). Supported in Chrome 83+, Safari 26+, Firefox 148+ [S19]. |
| `upgrade-insecure-requests` | missing | Low value on an HTTPS-only site. Its interaction with a future `http://localhost:11434` is **unverified**; test before adding. |
| `img-src ... data:` | present | No `data:` URL exists in `src/` or in the built CSS; the only `<img>` is `/parliament_logo.png` (`src/components/core/MessageList.jsx:38-39`). `data:` looks removable. |
| `webrtc 'block'` | missing | In the CSP3 draft [S14]; browser support **unverified**. Optional. |
| Reporting (`report-to`) | missing | Needs an endpoint, which the no-backend rule excludes. Informational. |
| HSTS | present, no `preload` | Fine. |
| Referrer-Policy | `no-referrer` | Good. |
| Permissions-Policy | 4 features denied | Short list. Also `microphone=()` conflicts with the shipped voice feature (item 11). |
| COOP | missing | `Cross-Origin-Opener-Policy: same-origin` is the baseline. |
| CORP | missing | `Cross-Origin-Resource-Policy: same-origin` is cheap. |
| COEP | missing | Not needed (no SharedArrayBuffer). |

**Assessment**
- The script policy is the part that matters and it is strict. The gaps are cheap and none is exploitable today because no injection point exists.
- Two documents disagree with this file. `CLAUDE.md` says provider and source hosts are "each listed in `netlify.toml`"; only Anthropic is listed. `SECURITY.md:21-31` prints a CSP that includes `frame-src 'none'` and `base-uri 'self'` (not deployed) and omits `frame-ancestors`, `worker-src`, `manifest-src` (deployed). Worth recording in `docs/spec/conflicts.md`.

## 2. index.html, public/, vite.config.js, service worker

**Facts**
- `index.html` (31 lines): no inline script, no inline style. One module script (L28). Meta: charset, viewport, theme-color, three `apple-mobile-web-app-*`. Links: icon, manifest, apple-touch-icon, and `<link rel="preconnect" href="https://api.anthropic.com" />` (L24, no `crossorigin`).
- `public/`: `manifest.webmanifest` (name Parliament, `start_url` and `scope` `/`, three icon entries all pointing at `/parliament_logo.png`; description says "all data stays in your browser"), `parliament_logo.png` (228 KB), `flight_logo.png` (198 KB, referenced nowhere in `src/`, `index.html` or the manifest, but precached).
- `vite.config.js`: `registerType: 'prompt'` (L14), `injectRegister: null` (L18), `manifest: false` (L21). No source maps configured (none in `dist/`).
- Precache (L26, L31): `**/*.{js,css,html,woff2,png,svg,ico,webmanifest}` minus `**/{catalog,component,module}-*.js`. In the June build that is 19 entries: index.html, all JS and CSS chunks, 7 Inter woff2 files (218 KB), both PNGs, the manifest.
- `navigateFallback: '/index.html'` (L34), `cleanupOutdatedCaches: true` (L42).
- Runtime caching, two rules: (a) L54-55 `/^https:\/\/api\.anthropic\.com\//` handler `NetworkOnly`; (b) L66-78 same-origin `/assets/` paths matching `(catalog|component|module)-`, `CacheFirst`, cache `parliament-modules-v2`, 50 entries, 30 days, statuses 0 and 200.
- The only `lazy()` imports in `src/` are the two dev-only routes (`src/App.jsx:29-35`), so rule (b) matches nothing today.
- Registration: `useRegisterSW` in `src/stores/PWAContext.jsx:36-46`. No periodic update timer.

**API responses and the service worker: confirmed not cached.** The emitted `dist/sw.js` registers rule (a) for `"GET"` only. Every API call in `src/providers/anthropic.js` is a POST (L178-179, 218-219, 291-292, 426-427), so no route matches and the request passes straight to the network. `NetworkOnly` never writes a cache in any case. Precache and rule (b) are same-origin only.

**Assessment**
- Sound. The Anthropic rule is inert for POST but harmless.
- The preconnect opens a connection to Anthropic on every page load, before any key exists. It carries no content but it is network activity that the copy says does not happen (item 11).

## 3. Inline script, eval, blob/data scripts, WASM, HTML sinks, Trusted Types

**Facts: source grep over `src/`**

| API | Uses | Attacker-influenced text reaches it? |
|---|---|---|
| `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`, `createContextualFragment`, `srcdoc` | none | n/a |
| `eval`, `new Function`, string `setTimeout`/`setInterval` | none. `src/lib/mathEval.js` is a hand-written parser (header comment L3: "Replaces `new Function()` for the `calculate` tool") | Model tool input reaches the parser, which allow-lists tokens |
| WebAssembly, `new Worker`, `importScripts` | none | n/a |
| inline `<script>` / `<style>` | none in `index.html` | n/a |
| `document.createElement('style')` | `src/views/SchemePicker.jsx:32-37`, dev-only route, fed by the static `SCHEMES` constant | No |
| `blob:` URLs | downloads only: `src/lib/backup.js:272`, `src/views/SettingsView.jsx:763,784`, `src/components/core/DocumentCanvas.jsx:209`, `src/catalog/entries/review-render.jsx:173` | Blob content is user data, used as a file download, never as script |
| `data:` URLs | none | n/a |
| `contentEditable` | `src/components/core/sbrd/DocumentParagraph.jsx:204,240,276,322` | Yes, but text only: writes `el.textContent` (L84), reads `textContent` (L92), paste forced to `text/plain` (L174-179). No `onDrop` handler. |
| `document.execCommand` | `'insertText'` (`DocumentParagraph.jsx:178`, `DocumentCanvas.jsx:151`), `'copy'` fallback (`src/catalog/entries/messages-render.jsx:288`) | Plain text only |
| `setAttribute('data-scheme', …)` | `src/views/ChatView.jsx:221-229` from `mode.scheme.ref` | A restored mode file controls an attribute value. Harmless. |
| React `style` from stored data | `src/components/LibraryCard.jsx:128-135` `style={{ background: bg }}` from a `librarySchemes` row | A restored backup can supply `url(...)`. In production `img-src` blocks the load. No script path. |
| CSS selector built from data | `DocumentParagraph.jsx:167` `[data-para-id="${prevPara.id}"]` | Restored paragraph ids could break the selector (throws). Use `CSS.escape` or refs. |

**Facts: built bundle (June `dist/`)**
- No `eval(`, `new Function(`, `WebAssembly` in any chunk.
- `innerHTML` assignments: React DOM internals (only used when rendering `<script>` or `dangerouslySetInnerHTML`, neither of which the app does) and one live one: `node_modules/decode-named-character-reference/index.dom.js` sets `element.innerHTML = '&' + value + ';'` on a detached `<i>`. It is pulled in by micromark (react-markdown) through the package's `browser` export condition. The value is an alphanumeric entity name from the markdown tokenizer, so it is not an injection vector.
- `navigator.serviceWorker.register(<string>)` in workbox-window (vite-plugin-pwa's generated code calls `new Workbox("…")` with a string).
- `importScripts(<string>)` in the generated `sw.js` loader.
- PapaParse contains a blob-worker and XHR path. Neither is enabled: the two calls (`src/lib/fileParser.js:59`, `src/lib/fileUpload.js:247`) pass no `worker` or `download` option.
- No `createElement("style")` with content, no `setAttribute("style"`, no `.cssText` in any chunk except framer-motion's `popLayout` helper. `mode="popLayout"` is not used in `src/` (all ten `AnimatePresence mode=` uses are `"wait"`).

**Would `require-trusted-types-for 'script'` break anything?** Yes, three things, none in app code [S19]:
1. Markdown rendering whenever text contains a named entity such as `&amp;` (the micromark decoder above).
2. Service worker registration (string URL to a TrustedScriptURL sink).
3. The service worker itself, if the directive is also sent on `/sw.js`: workers take their CSP from their own response [S16] and the `/*` rule covers `/sw.js`, where `importScripts` is a sink.

Smallest route: alias `decode-named-character-reference` to its non-DOM build in Vite (removes 1), register the worker with a TrustedScriptURL or a ten-line `default` policy that allows only `/sw.js` (fixes 2), and either keep the directive off the worker files or switch vite-plugin-pwa to `injectManifest` with a single-file worker (fixes 3).

**Assessment**
- Nothing relies on inline script, eval, blob/data scripts or WASM.
- `style-src 'unsafe-inline'` looks removable: React and framer-motion set styles through the CSSOM property interface, which CSP does not block; only `style` attributes in markup, `setAttribute('style')` and `cssText` are blocked [S17], and the bundle uses none. Trial on a deploy preview before committing.

## 4. window.open, target=_blank, messaging, storage, clipboard, media, speech

| API | Location | Purpose | Note |
|---|---|---|---|
| `window.open` | `src/views/SettingsView.jsx:611` | Opens `https://console.anthropic.com/settings/limits` | No `noopener,noreferrer` feature string. Destination is trusted; still fix. |
| `target="_blank"` | `SettingsView.jsx:478`; `src/components/core/CitationLink.jsx:44,63`; `src/components/build/wizard/IgnitionStep.jsx:475`; `src/components/core/CitedMarkdown.jsx:45,64` | Console links, links in assistant output | Every one has `rel="noopener noreferrer"`. `CitedMarkdown.jsx` is imported nowhere (dead code). |
| `postMessage`, `BroadcastChannel` | `src/lib/bus.js:51-65` | Cross-tab signals with a field allow-list (`sanitizeSignal`, L30-44) | Only `bus.test.js` imports it. No channel is opened at runtime today. No `message` listeners anywhere in `src/`. |
| Web Locks | `src/lib/bus.js:84-85` | Docket lock | Unused at runtime. |
| `localStorage` | `src/main.jsx:20-21`; `src/lib/migration.js:91-92,113-114` | Remove and one-time read of legacy `parliament-mode` | No writes anywhere. |
| `sessionStorage` | `src/lib/crypto.js:151` | Scrub legacy key | No writes. |
| `document.cookie` | none | | |
| `navigator.clipboard` | `writeText` only: `src/views/SelectorLayout.jsx:437,738`; `src/catalog/entries/favorites-preview.jsx:163-164`; `messages-render.jsx:282`; `DocumentCanvas.jsx:180` | Copy buttons | No clipboard reads. Paste is read from the paste event (`DocumentParagraph.jsx:176`). |
| `navigator.mediaDevices` | none | | |
| SpeechRecognition | `src/hooks/useVoiceInput.js:25-27,45-52,82`; consumer `src/catalog/entries/voice-input-render.jsx:43-48` | Voice to text | `continuous=false`, `interimResults=true`, `lang` from config. No `processLocally`, no `available()`/`install()`. See item 11. |
| Others | `navigator.storage.estimate` (`src/lib/db.js:946-947`), `navigator.onLine` (`PWAContext.jsx:19`), `navigator.vibrate` (`src/catalog/layouts/stacked-sections.jsx:164`), `navigator.platform` (`src/components/editor/EditorTopBar.jsx:26`) | | |

---

# PART B: Secrets and data

## 5. src/lib/crypto.js

**Facts**
- Device key: `crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt'])` (L29-33). `false` is the extractable flag.
- The `CryptoKey` object is stored in a separate database: `parliament-keystore` v1, store `encryption-keys`, record `{ id: 'api-key-encryption', key }` (L3-4, L15-21, L36).
- Encrypt (L54-66): fresh random 12-byte IV per call (L56). Ciphertext and IV are stored as number arrays in the main `parliament` DB, `settings` store, key `parliament-api-key` (L82, L88-95).
- Modes: `'persistent'` writes as above. `'memory'` does nothing on save (L98-102, comment "Caller is responsible for holding this in React state") and `loadApiKey('memory')` returns `null` (L130-132). Any other value, including legacy `'session'`, is treated as persistent (L103-106, L133-136).
- Backup KDF: PBKDF2-HMAC-SHA-256, 16-byte random salt, 12-byte IV, AES-GCM-256, non-extractable derived key (L171-194). 210,000 iterations for `.parliament` files (L165), 100,000 for legacy `.apb` (L169, L202). The restore path reads the iteration count from the file with no upper bound (`src/lib/backup.js:296`).
- Plaintext key exposure, checked: every `console.*` call in `src/` (none logs the key or a request); provider error strings (status codes only, `src/providers/anthropic.js:189-190,299-341`); URLs (never); the network log (no headers or bodies, item 6). The key is held in component-local state only while being typed (`SettingsView.jsx:114`, `IgnitionStep.jsx:96`). It is sent as the `x-api-key` header to `api.anthropic.com` only (`anthropic.js:167-174`).
- `src/views/HomepageView.jsx:36` and `src/views/SelectorView.jsx:23` decrypt the key just to test whether one exists.

**Facts: the "Don't save" mode**
- Offered in Settings as "Don't save: Re-enter every time for maximum security" (`SettingsView.jsx:88-91`).
- After validation, `saveApiKey(apiKey, 'memory')` is a no-op and no shared holder exists. The send path calls `loadApiKey(settings.storageMode)` (`src/catalog/entries/input-render.jsx:199-210`), gets `null`, and shows "No API key configured".
- Switching to this mode only updates the setting (`SettingsView.jsx:163`). An already stored encrypted key is not deleted.
- Several callers ignore the mode and read the stored key regardless: `loadApiKey()` with the default in `src/stores/DocumentContext.jsx:403`, `src/components/core/SummaryDashboard.jsx:75`, `src/components/core/sbrd/RippleScopeModal.jsx:36`; `loadApiKey('persistent')` in `HomepageView.jsx:36`, `SelectorView.jsx:23`, `IgnitionStep.jsx:114`; and `src/catalog/entries/chats-preview.jsx:185` keys off a `settings.persistKey` field that does not exist.

**Assessment**
- Construction is correct: 256-bit GCM, random IV per encryption, non-extractable key, ciphertext and key in different databases.
- What a non-extractable key protects against: the raw device key cannot be exported by script, and the ciphertext is useless if it leaves the browser alone (in a backup, an export, a copied IndexedDB record).
- What it does not protect against: any script running on the origin (a compromised dependency, an XSS, an in-origin third-party block, an extension with page access) can open both databases and call `decrypt`, or simply wrap `fetch` and read the header, exactly as `networkLog.js` wraps `fetch` today. The Web Crypto draft itself notes that script injection is equivalent to code execution and that anyone with access to device storage may recover key material [S22].
- So the sentence "Even scripts running on the page cannot export the raw encryption key" (`SettingsView.jsx:1215`, `SECURITY.md:14`) is literally true and practically misleading.
- The memory mode is neither functional nor protective as built.
- 210,000 iterations is below the current OWASP figure of 600,000 for PBKDF2-HMAC-SHA256 [S21]. The comment at `crypto.js:161` attributes 210k to OWASP 2023; that figure was the SHA-512 number.

## 6. src/lib/networkLog.js

**Facts**
- Wraps `window.fetch` once (L57-96), installed from `src/main.jsx:9`.
- Per request it stores `id, timestamp, method, host, path, status, ok, durationMs, error` (L69-79). `path` is pathname plus query string (L31). No request headers, no bodies, no response data.
- In-memory ring buffer of 100 (L7, L20-26). Lost on reload. Never persisted.

**Assessment**
- Safe: it cannot capture the key or chat content.
- It is not a complete record of network activity. It sees page-context `fetch()` only. It does not see the preconnect, service worker requests, static asset loads, navigations and link clicks, the Web Speech service, or anything Anthropic does server-side for web search. Vite's modulepreload polyfill also calls `fetch` before the wrapper is installed. The copy "records every outbound request this app makes" (`SettingsView.jsx:1223`, `src/components/NetworkActivityCard.jsx:44`) overstates it.
- Once keyless sources ship, their query strings (the user's search text) will appear in this in-memory list.

## 7. Backups

**Facts: what is excluded**
- `SETTINGS_BLOCKLIST = new Set(['parliament-api-key'])` (`src/lib/backupFormat.js:15`). It is a one-entry blocklist, applied on export (`src/lib/backup.js:172`) and on import (`backupFormat.js:139,207`; `backup.js:478`).
- Every other `settings` row is exported when the "preferences" category is included. That category is off by default in the custom list (`src/components/BackupRestoreModal.jsx:52`) but included by "Back up everything" (L301, L118-120) and by the pre-migration backup (`src/lib/upgradeCheck.js:47-56`).
- `settings` also holds user content: `scratchpad-text` (`src/catalog/entries/scratchpad-render.jsx:7`) and `parrotPersonas` (`src/components/CollabModal.jsx:53`), though the category is described as "Tour state, UI preferences. Not required for most users." (`BackupRestoreModal.jsx:43`).
- The legacy path has no blocklist at all: `exportAllData()` returns `settings: await db.getAll('settings')` (`src/lib/db.js:985`), so the "Export JSON" and "Export Encrypted (.apb)" buttons (`SettingsView.jsx:935-940`) write the API key's ciphertext and IV into the file. `importData()` (`db.js:992-1018`) writes any settings key that is not already present, including `parliament-api-key`.

**Would future provider keys leak into backups?** Yes. Any key stored under another `settings` name would be exported (as ciphertext plus IV, in a plain JSON file unless a password is set), restored into other browsers where it cannot be decrypted, and in replace mode it would overwrite a working local key.

**Facts: restore**
- Flow: `parseBackupFile` (`backupFormat.js:52-86`) then `validateContents` then `restoreContents` (`backup.js:346-490`). Validation runs before any write (`BackupRestoreModal.jsx:171-175, 198-202`).
- Stores written: a fixed list of 16 in the `parliament` DB. Arbitrary object stores: no. The keystore DB is never touched.
- Arbitrary settings keys: yes. `validateSetting` checks only that `key` is a string of at most 200 characters; "value is intentionally unrestricted" (`src/lib/validate.js:96-100`). A file can set `storageMode`, `defaultModel` (an unknown model id is passed to the API unchanged, `anthropic.js:161-164`), `chosenHomeRoomId`, the `migration_v2_*` flags, `parrotPersonas` (saved system prompts), `scratchpad-text`, `backupLog`.
- Checked: ids up to 128 chars, a few required fields per record, dates, total item count up to 50,000, per-string cap of 1,000,000 chars on the fields that are checked, duplicate ids, cross-references, parent cycles (`validate.js:5-6, 238-366`).
- Not checked: overall file size (`file.text()` then `JSON.parse` on the main thread); size of `file_data` blobs (base64-decoded before validation, `backupFormat.js:180-184`); any field not named in a validator (records are spread whole, e.g. `restorePlan.js:56,68`), such as `attachmentMeta`, `aiSummary`, `tags`; the contents of `sbrd_documents.paragraphs` (only "is an array", `validate.js:130-144`); mode `components[]`, `config`, `meta`, `layoutConfig` (`validate.js:151-172`); extra fields on library rows, including scheme `variants`; the PBKDF2 iteration count.
- Reaching an HTML sink: no, because none exists. Restored message text goes through the same react-markdown path as model output (item 10). Restored `file_data` with `type: 'xlsx'` does reach the vulnerable SheetJS parser (`src/stores/FileShelfContext.jsx:145-147`).
- Replace mode clears `settings` except `browserFingerprint` (`backup.js:371-378`). That deletes the stored API key ciphertext. The undo snapshot excludes the key too, so Undo does not bring it back. The snapshot lives only in memory for 60 seconds (`src/stores/BackupContext.jsx:35-42`), and the wipe and writes are separate transactions.

**Is the unencrypted backup the default?** Yes. `passwordOn` starts `false` (`BackupRestoreModal.jsx:76`) and both buttons use it (L135). The upgrade gate labels the password "optional" and enforces no minimum length (`src/components/UpgradeGate.jsx:51,79`), while the modal requires 8 characters (L125-128).

**Assessment**
- The worst a crafted backup can do today: plant settings and personas, crash or freeze specific views with malformed nested data or huge strings, exhaust memory, and feed a malicious spreadsheet to SheetJS. It cannot run script while there are no sinks and `script-src 'self'` holds.
- Replace the blocklist with an allow-list of exportable settings keys, or move secrets out of `settings` entirely into the keystore DB. The second option also fixes the replace-wipes-key behaviour.

## 8. "Delete everything"

**Facts**
- Caller `SettingsView.jsx:838-843`: `clearAllData()`, `deleteApiKey()`, reload.
- `clearAllData` (`db.js:1022-1031`) clears exactly: `conversations, messages, highlights, notes, favorites, pins, settings, files, file_data, sbrd_documents`.
- Not cleared: `modes` (every room the user built, plus homepage customisation: names, descriptions, per-component config), `libraryLayouts`, `libraryRooms`, `libraryComponents`, `librarySchemes`, `libraryResources`, the `parliament-keystore` database (the device key), Cache Storage, the service worker registration.
- Copy: "Permanently delete all data from this browser. This cannot be undone." (L958) and the modal lists "conversations, messages, highlights, notes, favorites, pinned references, and settings" plus the API key (L1104).

**Assessment**
- User-authored rooms survive a button labelled as deleting all data. The leftover device key is harmless once the ciphertext is gone. Either widen the clear (needs your approval under the no-deletion rule, though this is a user-initiated delete) or change the copy to say rooms are kept.

## 9. File uploads

**Facts**

| Path | Types | Limits | Parsing | Storage |
|---|---|---|---|---|
| File shelf (`src/components/core/FileShelf.jsx`, `src/stores/FileShelfContext.jsx:107-136`, `src/lib/fileParser.js`) | Picker: `.csv,.tsv,.xlsx,.xls,.json` (`FileShelf.jsx:36`). The drop handler (L54-59) accepts any file; unknown extensions are parsed as CSV (`fileParser.js:135-139`). | None. No size check anywhere. | xlsx/xls: `XLSX.read(arrayBuffer, { type: 'array', cellDates: true })` then `sheet_to_json` (`fileParser.js:77,81`). csv/tsv: PapaParse with `dynamicTyping` (L59-65). json: `JSON.parse` (L98). All on the main thread. | Raw bytes in IndexedDB `file_data` (gzip for text, raw for xlsx), metadata in `files`, parsed rows in an in-memory cache (`FileShelfContext.jsx:70`). Included in backups. |
| File attach (`src/catalog/entries/file-attach-render.jsx`, `src/lib/fileUpload.js`) | JPEG, PNG, GIF, WebP, PDF, and about 45 text and code extensions (`fileUpload.js:31-56`) | 10 MB per image or PDF (L19), 10 attachments per message (L26), text truncated at 200 KB or 15,000 chars (L10-11) | Images and PDFs are not parsed locally: base64, then sent to Anthropic as `image` or `document` blocks for that turn only (L166-188). Text is inlined inside an `<attached_file>` wrapper that neutralises closing tags (L147-155). CSV is summarised with PapaParse (L245-265). | Binary is never persisted. Text is persisted inside the user message. Chip metadata (name, size, type) is persisted. |

- docx is not supported on either path. PDF is never parsed in the browser.
- No parsed content reaches an HTML sink: table cells, column stats and chart labels are React text nodes.
- File shelf data sent to the model (`SummaryDashboard.jsx:78-90`) is interpolated into the prompt without the boundary wrapper that attachments get.

**Assessment**
- The exposure is the SheetJS parser plus the absence of a size limit (item 15).

## 10. Markdown rendering of model output

**Facts**
- `react-markdown@10.1.0` with `remark-gfm`. No `rehype-raw`, no `urlTransform`, no `allowedElements`/`disallowedElements`, no `skipHtml` anywhere.
- Six files import it. Main path: `src/components/core/MessageCard.jsx:218-220` with `a: CitationLink` and a `code` override that renders ```` ```chart ```` blocks through a hand-written SVG renderer. Four other sites use defaults: `SelectorLayout.jsx:458-460`, `src/components/ReviewModal.jsx:257-259`, `src/components/BranchCreationPanel.jsx:268`, `favorites-preview.jsx:204-206`. Sixth is the unused `CitedMarkdown.jsx`.
- Library behaviour, read from `node_modules/react-markdown/lib/index.js`: raw HTML nodes are converted to text (L360-366); the default URL transform keeps only `http, https, irc, ircs, mailto, xmpp` and relative URLs (L124, L421-443).
- `CitationLink.jsx:8-13` additionally rejects `javascript:`, `data:`, `vbscript:`, `file:` and renders such links as plain text.

**Answers**
- Clickable `javascript:` or `data:` URL: no, blocked twice on the main path and once (library default) elsewhere.
- Raw HTML: no, shown as text.
- Image from an arbitrary host: the `<img>` element is emitted for `![x](https://host/p?d=…)`. In production the load is blocked by `img-src 'self' data:`. In dev, in `vite preview`, or on any host without the Netlify header it would load. The hosting header is the only control.
- The four default sites render links with no `target` and no `rel`, so a click navigates the app's own tab away.

**Assessment**
- Safe by library default plus CSP. Make it safe by construction: one shared Markdown component with a fixed link policy and images disabled or turned into links.

---

# PART C: Privacy claims versus behaviour

## 11. Claims and actual egress

**Claims, verbatim**

| # | Location | Text |
|---|---|---|
| 1 | `README.md:3-5` | "runs entirely in your browser. Bring your own API key — there is no backend, no account, and nothing leaves your machine except API calls to Anthropic." |
| 2 | `SECURITY.md:3` | "designed so that you never need to trust us with your data." |
| 3 | `SECURITY.md:7` | "The only network requests the app makes are directly from your browser to Anthropic's API when you send a message." |
| 4 | `SECURITY.md:14` | "Even JavaScript running on the page cannot export the raw key material." |
| 5 | `SECURITY.md:16` | "persistent (survives browser restarts), session-only (cleared when the browser closes), or memory-only (never written to disk)." |
| 6 | `SECURITY.md:21-33` | A CSP listing, then "the app can only make network requests to itself and Anthropic's API." |
| 7 | `SECURITY.md:45` | ".apb ... PBKDF2 (100,000 iterations, SHA-256)" |
| 8 | `SECURITY.md:52-53` | "We do not use analytics, tracking, or advertising scripts" / "We do not make network requests to any service other than Anthropic's API" |
| 9 | `SECURITY.md:63` | "please open a GitHub issue or contact us directly." |
| 10 | `SettingsView.jsx:45` | "It is encrypted with AES-GCM and stored only in your browser." |
| 11 | `SettingsView.jsx:476` | "Your API key is encrypted using the Web Crypto API (AES-GCM) before being stored. It never leaves your browser." |
| 12 | `SettingsView.jsx:1196` | "Open source and community-driven." |
| 13 | `SettingsView.jsx:1211` | "There is no backend server, no database, and no user accounts. Nothing is transmitted anywhere except directly to Anthropic's API when you send a message." |
| 14 | `SettingsView.jsx:1215` | "Even scripts running on the page cannot export the raw encryption key." |
| 15 | `SettingsView.jsx:1219` | "We have no way to see, access, or recover it." |
| 16 | `SettingsView.jsx:1223` | "The Network Activity log below records every outbound request this app makes. You can confirm only Anthropic's API ever receives data. When the app launches publicly, the full source will be on GitHub for line-by-line review." |
| 17 | `NetworkActivityCard.jsx:44` | "Every outbound network request this app makes is recorded here. ... Only requests to api.anthropic.com should appear." |
| 18 | `IgnitionStep.jsx:492` | "Encrypted with AES-GCM and stored locally. Never leaves your browser." |
| 19 | `public/manifest.webmanifest:4` | "no accounts, no servers, all data stays in your browser." |

**Every way data leaves the device today**

(a) **fetch targets.** Only `https://api.anthropic.com/v1/messages` (`anthropic.js:178,218,291`). `count_tokens` (L426) has no caller. Not only "when you send a message":
- key validation sends a one-token "hi" (L216-226);
- after the first exchange three background Haiku calls resend the opening messages for title, summary and tags (`src/stores/ChatContext.jsx:92-112`);
- further calls from branch summaries, review synthesis, document submit, ripple analysis, data insights and bulk regenerate.
The API key travels in a header on every one.

(b) **Web Speech API.**
- In the code: default settings, no on-device request (`useVoiceInput.js:45-52`). The component ships in the Pocket Chat template (`src/lib/seedTemplates.js:147`) and a migration injects it into rooms (`src/lib/migration.js:315-357`).
- Browser behaviour as of October 2026:
  - Default is server-based. MDN: "Your audio is sent to a web service for recognition processing" [S1], and it names Chrome as an example [S2].
  - On-device option exists: `processLocally = true`, with `SpeechRecognition.available()` and `install()` to check and download language packs [S1][S8]. Compat data: Chrome desktop 139 (released 5 August 2025 [S4]); not Chrome Android; Safari no; Firefox preview builds only [S3]. With the default `false` the browser may choose local or remote [S8].
  - Edge: Microsoft's page (updated 6 October 2026) describes the local model as available in Canary and Dev 150+ behind a flag [S5]. Which cloud service stable Edge uses is **unverified**.
  - Safari: `webkitSpeechRecognition` since 14.1 [S3]. Where Apple processes the audio is **unverified** (third-party testing reports it fails offline and needs Siri or Dictation enabled).
  - Firefox release: no `SpeechRecognition` [S3]; the app shows a disabled mic there (`voice-input-render.jsx:85-97`).
- Important interaction: the deployed `Permissions-Policy: microphone=()` very likely disables the feature in production. The Web Speech draft makes `start()` request the `microphone` permission and fire `not-allowed` on denial [S6]; the Permissions spec returns "denied" when Permissions Policy disallows the feature for the document [S7]. A third-party project reported this exact failure with `microphone=()` (I saw it only as a search summary; the page itself returned 404). **Not tested on the live site.** In dev there is no header, so the mic works there and audio goes to the browser vendor.
- This traffic is made by the browser, not by page JavaScript, so neither CSP `connect-src` nor the in-app network log sees it.

(c) **External links.** `console.anthropic.com` (three places) and any http(s) link in model output. A click sends a request to that host. `Referrer-Policy: no-referrer` and `rel=noreferrer` keep the app URL out of it.

(d) **Fonts and assets from other origins.** None. Inter is bundled (`src/main.jsx:3`). 'Source Serif 4' is referenced by name only (`DocumentCanvas.jsx:229`), resolved from local fonts or Georgia.

(e) **Service worker and hosting.** The browser fetches `/sw.js`, precache files and the manifest from the app's own origin. Netlify therefore sees IP address, user agent and time for every visitor. No user content. Workbox has no telemetry. Plus the preconnect to Anthropic on every load (`index.html:24`).

(f) **Anthropic server-side web search.** `web_search_20250305`, `max_uses: 3` (`anthropic.js:35-39`), armed by the user for one message (`src/catalog/entries/web-search-render.jsx`). Anthropic's documentation says the API runs the searches and returns results with citations, at $10 per 1,000 searches plus tokens [S23]. So search queries derived from the conversation leave Anthropic for a search backend. The in-app description says only "Uses Anthropic API credits." (`src/catalog/entries/web-search.jsx:36`). Side observation: the stream parser handles only `text_delta` and client tool input (`anthropic.js:369-411`), so API citation data is dropped; the same documentation asks that citations be shown when displaying web search output to end users [S23]. Worth a product check.

**Assessment of the claims**
- 1, 3, 8, 13: not accurate as written. See (a), (b), (e), (f).
- 4, 14: true and misleading (item 5).
- 5: "session-only" no longer exists (`src/stores/SettingsContext.jsx:40-44`); "memory-only" does not work.
- 6: the printed CSP is not the deployed one.
- 7: describes the legacy format only; the current `.parliament` format is not described.
- 9: the repo is private, so nobody outside can open an issue.
- 11, 18: the key leaves the browser on every request. It should say it is sent only to Anthropic.
- 12, 16: see item 12.
- 16, 17: the log sees page `fetch()` only.
- 2: holds only in the sense that there is no server-side store. Users still trust whatever bundle the host serves on each load, and cannot compare it with source while the repo is private.

## 12. Licence

**Facts**
- `LICENSE` L1-3: "MIT License" / blank / "Copyright (c) 2026 Solofsson25". Standard MIT text follows.
- `README.md:70-72`: "## License" / "See [LICENSE](LICENSE)." and L37: "The repo is private until the app reaches public-launch quality."
- Settings: "Open source and community-driven." (L1196) next to a disabled "View on GitHub" button titled "Available when the app launches publicly" (L1198-1200).
- Remote is `https://github.com/Solofsson25/project-apollo.git`. An unauthenticated request to that URL returned HTTP 404 on 2026-10-11 [S27].

**Assessment**
- "Open source on GitHub" would not be accurate today. The code is MIT-licensed but not publicly available. "MIT licensed; source will be published at launch" is accurate now. The existing "Open source and community-driven" line has the same problem.
- All 467 commits carry one personal Gmail address as author. Publishing the history publishes it. Decide before going public, keeping the no-force-push rule in mind.

## 13. document.title and URLs

**Facts**
- `document.title` is never set in `src/`. The tab title is always "Parliament" (`index.html:6`).
- Routes (`src/App.jsx:64-95`): `/`, `/chats`, `/chat/:id`, `/settings`, `/edit`, `/edit/:roomId`, `/edit-home`, `/build`; dev-only `/dev/migration`, `/catalog`.
- URL contents: `:id` is a `crypto.randomUUID()` (`db.js:462-464`); `:roomId` is `mode_<uuid>` or `home_default`; query strings are `?tab=<fixed tab name>` (`src/components/editor/EditorLeftRail.jsx:60-80`), `?ignite=<roomId>` (`src/views/BuildView.jsx:69`), and dev-only `?upgrade-gate`. No hash usage. No search text in any URL.
- Router state (in `history.state`, not the URL): `seedMode` (a whole draft room including its name), `returnToRoomId`, `initialTray`, `fromChat` (`src/views/EditorView.jsx:122-123, 270-272`).
- Download filenames do carry titles: `${conversationTitle || 'document'}.md` (`DocumentCanvas.jsx:212`) and a slugged title (`review-render.jsx:176`).
- Edge case: a restored backup may carry ids that are arbitrary strings up to 128 characters; those would appear in `/chat/<id>`.

**Assessment**
- Clean. No user content in titles or URLs in normal use.

---

# PART D: Dependencies

## 14. package.json, audit, outdated

**package.json** (name `parliament`, private, version `0.0.0`, ESM; scripts dev, build, lint, preview, test)
- dependencies: `@dnd-kit/core ^6.3.1`, `@dnd-kit/modifiers ^9.0.0`, `@dnd-kit/sortable ^10.0.0`, `@dnd-kit/utilities ^3.2.2`, `@fontsource-variable/inter ^5.2.8`, `framer-motion ^12.34.4`, `idb ^8.0.3`, `lucide-react ^0.576.0`, `papaparse ^5.5.3`, `react ^19.2.0`, `react-dom ^19.2.0`, `react-markdown ^10.1.0`, `react-router-dom ^7.13.1`, `recharts ^3.8.0`, `remark-gfm ^4.0.1`, `xlsx ^0.18.5`.
- devDependencies: `@eslint/js ^9.39.1`, `@tailwindcss/vite ^4.2.1`, `@types/react ^19.2.7`, `@types/react-dom ^19.2.3`, `@vitejs/plugin-react ^5.1.1`, `eslint ^9.39.1`, `eslint-plugin-react-hooks ^7.0.1`, `eslint-plugin-react-refresh ^0.4.24`, `globals ^16.5.0`, `tailwindcss ^4.2.1`, `vite ^7.3.1`, `vite-plugin-pwa ^1.2.0`, `vitest ^3.2.7`.
- Installed: react and react-dom 19.2.4, react-router-dom 7.13.1, vite 7.3.1, others at the listed minimums. Lockfile v3 is tracked. npm reports 171 prod packages, 715 total. No CI config and no dependency-update automation in the repo.

**`npm audit --omit=dev`: 3 high**

| Package | Advisories | Fix | Does the vulnerable path apply here? |
|---|---|---|---|
| `react-router` 7.13.1 (via react-router-dom) | 12: GHSA-49rj-9fvp-4h2h, -8646-j5j9-6r62, -8x6r-g9mw-2r78, -rxv8-25v2-qmq8, -84g9-w2xq-vcv6, -wrjc-x8rr-h8h6, -h8fp-f39c-q6mh, -337j-9hxr-rhxg, -chx6-hx7r-mcp5, -2j2x-hqr9-3h42, -qwww-vcr4-c8h2, -f22v-gfqf-p8f3 | Yes, in range (7.18.4) | The app uses Declarative mode only (`BrowserRouter`, `Routes`, `App.jsx:2,58-96`). Five advisories I opened say Declarative mode is not affected (49rj, rxv8, chx6, 337j, 2j2x) [S12]. Six concern RSC, SSR hydration, prerender, the manifest endpoint or document requests, which the app does not use (judged from titles; not individually opened). The remaining one, wrjc (open redirect through `<Link>`/`useNavigate` paths, fixed in 7.18.0), does not state a mode. Every `navigate()` target here starts with a fixed segment (`/chat/${id}`, `/edit/${id}`), so I do not see an exploit. Update anyway. |
| `react-router-dom` 7.13.1 | via react-router | Yes | Same. |
| `xlsx` 0.18.5 | GHSA-4r6h-8v6p-xvw6 (prototype pollution reading crafted files, CVSS 7.8, fixed 0.19.3); GHSA-5pgg-2g8v-p4x9 (ReDoS, 7.5, fixed 0.20.2) | **No** (`fixAvailable: false`) | **Yes.** `XLSX.read` runs on user-chosen files and restored blobs. Item 15. |

**Full `npm audit`: 22** (2 critical, 13 high, 5 moderate, 2 low). The other 19 are dev-only and not shipped:

| Package | Severity | Fix | Relevance |
|---|---|---|---|
| vitest, tinypool, @vitest/mocker | critical / moderate | vitest 5.0.3, a major bump | Test runner on the dev machine only |
| vite 7.3.1 | high | in range (7.3.7) | Dev-server file-read and `fs.deny` bypasses, two specific to Windows, plus a Windows NTLM hash disclosure in the editor launcher. Relevant to this Windows machine while `npm run dev` runs. |
| esbuild | low | yes | Dev-server file read on Windows. Same. |
| postcss, source-map-js, nanoid, browserslist, baseline-browser-mapping, brace-expansion, fast-uri, js-yaml, @humanfs/node, @babel/core, @babel/plugin-transform-modules-systemjs, serialize-javascript, @rollup/plugin-terser, workbox-build | high to low | yes | Build-time tools processing your own source. Not reachable by users. |

**`npm outdated`: a major or more behind**
- Runtime: `framer-motion` 12.34.4 (latest 14.1.0), `lucide-react` 0.576.0 (latest 1.55.0).
- Dev: `vite` 7 (8.3.4), `vitest` 3 (5.0.3), `vite-plugin-pwa` 1 (2.0.0), `@vitejs/plugin-react` 5 (6.1.2), `eslint` and `@eslint/js` 9 (10), `globals` 16 (17), `eslint-plugin-react-refresh` 0.4 (0.5).
- In-range updates waiting: react and react-dom 19.3.0, react-router-dom 7.18.4, recharts 3.10.1, papaparse 5.7.0, idb 8.0.4, tailwind 4.3.3.
- `xlsx` shows as current only because npm's `latest` tag is frozen at 0.18.5.

## 15. xlsx (SheetJS)

**Facts**
- Installed 0.18.5 from `registry.npmjs.org`. `npm view xlsx` on 2026-10-11: `latest` is 0.18.5, published 2022-03-24 [S11].
- The vendor's documentation says the npm registry copy is out of date, names its own CDN as the authoritative source, documents 0.20.3 at `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, and recommends vendoring the tarball [S10].
- Vendor advisory for CVE-2023-30533: all versions through 0.19.2 are affected when reading crafted files; export-only use is not; fix is 0.19.3 or later from the vendor CDN [S9]. The ReDoS (CVE-2024-22363) is fixed in 0.20.2 per the GitHub advisory in the audit output.
- Usage: one file, two calls, `src/lib/fileParser.js:77` and `:81`, reached from (a) File shelf upload (`FileShelfContext.jsx:111`) and (b) re-parsing stored bytes (`FileShelfContext.jsx:147`), which a restored backup can supply.
- `fileParser.js` is imported statically through `FileShelfContext`, so SheetJS sits in the main bundle for every user (1.3 MB index chunk in the June build).

**Assessment**
- This is the affected operation: reading untrusted files. Realistic impact here: a tab freeze that recurs whenever the poisoned conversation's data room opens, and prototype pollution in the page that can decrypt the API key. Turning pollution into script execution would need a gadget and is constrained by `script-src 'self'` and the lack of sinks.
- Options, smallest first: (1) drop `.xlsx/.xls` support for now and keep CSV/TSV/JSON (needs your approval under the no-deletion rule); (2) vendor the 0.20.3 tarball into the repo, lazy-load it, parse in a Worker, and cap file size. Do not leave 0.18.5.

## 16. Runtime dependencies: use and droppability

Counts are files in `src/` that import the package.

| Package | Files | Used for | Drop if (a) drag and drop goes | Drop if (b) system fonts and CSS transitions |
|---|---|---|---|---|
| `@dnd-kit/core` | 5 | Editor drag and drop (`src/views/EditorView.jsx:18`, `src/components/editor/EditorCanvas.jsx:11`, `EditorHoldingTray.jsx:15`, `EditorLeftRail.jsx:32`), homepage reorder (`stacked-sections.jsx:35`) | Yes | n/a |
| `@dnd-kit/sortable` | 2 | Homepage reorder (`stacked-sections.jsx:40`, `src/components/SectionCard.jsx:16`) | Yes | n/a |
| `@dnd-kit/modifiers` | 1 | `stacked-sections.jsx:41` | Yes | n/a |
| `@dnd-kit/utilities` | 1 | `SectionCard.jsx:17` | Yes | n/a |
| `@fontsource-variable/inter` | 1 | Side-effect import `src/main.jsx:3`; 7 woff2 files, 218 KB, precached | n/a | Yes |
| `framer-motion` | 57 | `motion.*` in 54 files, `AnimatePresence` in 30, plus `MotionConfig` and `useReducedMotion`. Features: enter/exit, `whileHover`/`whileTap`, stagger variants, `layoutId` (22 uses in 9 files). No drag, scroll or motion values. | n/a | Yes, but it is a 57-file rewrite. Exit animations (78 `exit=` props) and shared-layout animations have no one-line CSS equivalent; they need a small presence helper or to be dropped. |
| `lucide-react` | 72 | 114 distinct icons | No | No |
| `papaparse` | 2 | CSV/TSV parsing (`fileParser.js:59`), CSV attachment summary (`fileUpload.js:247`) | No | No |
| `recharts` | 1 | `src/components/core/ChartCanvas.jsx:2-7` only (the chart-canvas component). 417 KB chunk, 38 transitive packages. Inline message charts use the dependency-free `ChartRenderer.jsx`. | No | No. Separate question: it could be replaced by extending the in-house SVG renderer. |
| `react-markdown` | 6 | Model output and snippets (item 10). 81 transitive packages. | No | No |
| `remark-gfm` | 6 | Tables, strikethrough, autolinks in the same sites | No | No |
| `react-router-dom` | 21 | Routing | No | No |
| `idb` | 3 | `db.js:1`, `crypto.js:15` (dynamic), `upgradeCheck.js:7` | No | No |
| `xlsx` | 1 | Item 15 | No | No |
| `react`, `react-dom` | 103 / 2 | Core | No | No |

## 17. dist, .gitignore, secrets

**Facts**
- `git ls-files dist` returns nothing. `dist/` exists locally (3 June build) and is ignored.
- `.gitignore`: log patterns, `node_modules`, `dist`, `dist-ssr`, `*.local`, editor folders (`.vscode/*` except `extensions.json`, `.idea`, `.DS_Store`, `*.suo`, `*.ntvs*`, `*.njsproj`, `*.sln`, `*.sw?`). It does not list `.env`; none exists or was ever committed.
- Secret scan of the 268 tracked files (266 text): 0 private key blocks, 0 AWS/GitHub/Slack/Google/Netlify tokens, 0 JWTs, 0 bearer literals, 0 OpenAI-style keys.
- `sk-ant-` appears 12 times, all placeholders or test stubs (0 to 6 characters after the prefix): `docs/design-snapshots/phone-current.html:94,95`, `settings-current.html:36`, `wizard-current.html:62`, `docs/spec/parliament_settings_v1.html:910,1264`, `refactor/phase-1-testing.md:3196`, `refactor/v1-mockups-archive/settings-mobile.jsx:230`, `settings.jsx:157`, `IgnitionStep.jsx:440`, `SettingsView.jsx:427`, `src/lib/bus.test.js:6`.
- History scan across all 467 commits for a long `sk-ant-` token or a private key block: 0 hits. No `.env`, `.pem` or `.key` file was ever committed.
- Personal data: one commit author identity (a Gmail address) on all 467 commits; the GitHub handle in `LICENSE`. No other email addresses in tracked files.
- Untracked and outside this scan: `.claude/`, `.pr-body.md`, five `continuation-*.md` files and several new `docs/spec/` files. A quick check of the top-level notes for long `sk-ant-` tokens found none.

---

# PART E: Assessment

## 18. Prioritised findings

Calibration: I found nothing that lets a remote party read chats or the key without the user opening a malicious file, restoring a malicious backup, or a supply-chain compromise. Severity reflects that.

### True today

| # | Sev | Risk in plain language | Smallest sound fix |
|---|---|---|---|
| T1 | High | `xlsx@0.18.5` parses untrusted spreadsheets (uploads and restored backup blobs) with two known high advisories and no npm fix, on the main thread, with no size limit. | Remove xlsx/xls support, or vendor 0.20.3, parse in a Worker, cap size. Removal needs your approval. |
| T2 | Medium | Privacy copy says things that are not true (claims 1, 3, 5, 6, 8, 9, 11, 12, 13, 16, 17, 18 in item 11). For a product whose pitch is "verify it yourself", this is the most visible problem. | Rewrite the copy to list real egress: Anthropic (key in header, extra background calls), the host serving the app, the browser's speech service if voice is used, web search via Anthropic. Rename the log to "requests made by this page". Regenerate SECURITY.md from `netlify.toml`. |
| T3 | Medium | Voice input: in production the app's own `microphone=()` header very likely makes it fail; anywhere without that header it sends audio to the browser vendor by default, invisible to the in-app log. | Decide. Either remove it, or set `microphone=(self)`, set `processLocally = true`, gate on `SpeechRecognition.available()`, and hide the mic where on-device is unavailable. Say so in the UI. |
| T4 | Medium | "Don't save" key mode does not work (chat cannot find the key) and does not delete a previously stored key, which other code paths keep using. | One key module with an in-memory holder and a single `getApiKey()`. Call `deleteApiKey()` when switching to memory mode. Route all 12 callers through it. |
| T5 | Medium | "Delete everything" leaves every room the user built, the library tables, the device key database, caches and the service worker. | Clear `modes` and `library*` too, delete the keystore DB, clear Cache Storage, unregister the worker. Or change the copy. Your call under the no-deletion rule. |
| T6 | Medium | Restore trusts the file too much: any settings key and value, unvalidated nested objects, no size limits, file-supplied KDF iteration count. The legacy import path has no blocklist and the legacy export writes the key ciphertext. | Build clean records from validated fields instead of spreading. Allow-list settings keys with per-key types. Cap file size, blob size and paragraph counts. Clamp iterations. Remove the legacy export buttons (already R10 in the change plan) and apply the blocklist on legacy import. |
| T7 | Low | CSP and header gaps: no `base-uri`, no `form-action`, no COOP or CORP, short Permissions-Policy, no Trusted Types, styles allow inline. CSP exists only on Netlify, so dev and preview never exercise it. | Add `base-uri 'none'; form-action 'none'; frame-src 'none'`, COOP and CORP `same-origin`, a longer Permissions-Policy. Put the production CSP in `preview.headers` so `vite preview` catches regressions. Trial dropping `'unsafe-inline'` and `data:`. Trusted Types after the three accommodations in item 3. |
| T8 | Low | Markdown: remote images are stopped only by the hosting header; four render sites use default links; one dead component. | One shared Markdown component: images disabled or rendered as links, `CitationLink` everywhere. |
| T9 | Low | Backups are unencrypted by default; PBKDF2 at 210k is below the current 600k recommendation for SHA-256; the minimum password length is enforced in one of three places. | 600k for new files (the header already records the count, so old files stay readable). Same minimum everywhere. Make "no password" a visible choice. |
| T10 | Low | `react-router-dom` 7.13.1 carries 12 advisories; none appears to apply to this usage. Dev tools carry Windows-relevant dev-server advisories. | Update in range to 7.18.4. Run `npm audit fix` for dev tools. Plan the vitest major. |
| T11 | Low | Small hygiene: `window.open` without `noopener` (`SettingsView.jsx:611`); key and backup password inputs lack `autocomplete` hints, so a password manager may offer to save and sync the API key (`src/components/Input.jsx:27`, `IgnitionStep.jsx:434`, `BackupRestoreModal.jsx:496,667`); two views decrypt the key just to check it exists. | Add `'noopener,noreferrer'`. Add `autoComplete="off"` plus manager-ignore attributes. Add a `hasApiKey()` that does not decrypt. |
| T12 | Info | Key encryption is at-rest protection only (item 5). Not a bug. It is the design limit that drives item 19. | Fix the copy. Keep `script-src 'self'`. Move key ciphertext into the keystore DB. |
| T13 | Info | Replace-restore silently deletes the saved API key; restore is not atomic and the undo copy is memory-only; "preferences" holds scratchpad text and personas but is described as tour state. | Keep the key out of `settings`. Offer the pre-replace snapshot as a download. Fix the category description. |
| T14 | Info | No CI, no dependency update automation, Node not pinned. `capabilityRequirements` on catalog entries are labels nothing enforces, and some are wrong (`summary-dashboard` calls the model while declaring only `storage:read`). | Pin Node. Run audit in CI. Decide whether capabilities are documentation or a contract. |
| T15 | Info | Web search citations are not surfaced; File shelf data goes into prompts without the data-boundary wrapper that attachments get. | Parse citation events. Reuse the wrapper. |
| T16 | Info | Publishing the repo publishes the commit author email. | Decide before launch. |

### Will matter once the planned features land

**More providers (Mistral, Ollama on `http://localhost:11434`)**
- Key storage: with today's blocklist every new key leaks into backups and gets restored elsewhere (item 7). Fix T6/T12 first.
- Key routing: each key must be sent only to its own provider's fixed host. Never take a base URL from a mode file, a setting or a backup. Validate `defaultModel` against the provider's list (today an unknown id is passed through, `anthropic.js:161-164`).
- CSP: list exact hosts and exact ports. Never `http://localhost:*`: that would let any injected script talk to every local service.
- Ollama guidance: tell users to set `OLLAMA_ORIGINS` to the app's origin, not `*`, or any website can drive their local models.
- Browser behaviour: your change plan already records the Chrome local-network prompt and the Safari block. Chrome's announcement is [S25].
- Preconnect only to providers the user has configured.
- Every allow-listed API host is also somewhere an injected script could send data using an attacker's own account. `connect-src` narrows exfiltration; it does not end it.

**Keyless sources (Wikipedia, Hacker News, OpenAlex)**
- Search text goes to those hosts. Say so per source. Send requests with `credentials: 'omit'`.
- Their responses are untrusted text. Render as text or through the shared Markdown component. Never use an HTML field such as Wikipedia's HTML extract.
- Treat source text as possible prompt injection once it is fed to a model, especially with the command line as the actor and dockets running steps unattended. Source text must never be able to trigger commands.
- Prefer exact hosts over `https://*.wikipedia.org`.
- Thumbnails would need `img-src` for a media host. Decide whether to show them at all.

**Pop-out windows drawn by the opener**
- A window opened to `about:blank` is same-origin with the opener and inherits its CSP (HTML policy container rules [S13]). Load styles with a `<link>` to the hashed CSS file, not copied `<style>` text, or the pop-out will force `'unsafe-inline'` to stay.
- `noopener` cannot be used, since the opener needs the handle. That is acceptable because the window stays same-origin; never navigate it to an external URL.
- No new trust boundary: the pop-out has no code of its own. The `bus.js` allow-list is the right pattern for the tab channel.
- Adding COOP `same-origin` should be compatible with same-origin pop-outs; test it (**unverified**).

**Editable message content**
- Keep the current pattern from `DocumentParagraph.jsx`: store type and text, write and read `textContent`, force paste to plain text. The editing spec's "list of blocks ... rather than one HTML string" matches this.
- Close the gaps: add a drop handler or use `contenteditable="plaintext-only"` (Firefox from 136; other engines earlier; secondary sources [S26]); escape ids used in selectors; never round-trip through `innerHTML`.
- If rich HTML is ever stored, that is the moment a sanitizer and Trusted Types stop being optional.

**Third-party blocks:** item 19.

## 19. Third-party blocks loaded at runtime

**What such code could reach if it ran in the app's own origin**
- All data: it can open `parliament` and read every chat, note, file and room.
- All keys: it can open `parliament-keystore`, take the `CryptoKey` object and call `decrypt` on the stored ciphertext. Non-extractable does not help (item 5). Database names and record layout are fixed and visible in `crypto.js`.
- Everything in transit: it can wrap `window.fetch` and read the `x-api-key` header and every prompt and reply. It can log keystrokes, including a key or a backup password as it is typed.
- Persistence: it can write into Cache Storage, which the service worker serves the app from, so one execution can survive removal of the block and reloads (my analysis of how Workbox precache serves files; not externally verified).
- The network within CSP: it can spend the user's credits on allowed provider hosts.
- Exfiltration that CSP does not stop:
  - Top-level navigation, for example setting `location` to an attacker URL with data in it. CSP has no navigation directive; the proposed `navigate-to` was dropped from the specification and never shipped (secondary sources [S20]; the current CSP draft's navigation directives are only `form-action` and `frame-ancestors` [S14]).
  - Form submission, unrestricted today because `form-action` is absent.
  - Allowed API hosts used with the attacker's own account.
  - Possibly resource hints and WebRTC, depending on the browser (**unverified**).
- The user's trust: permission prompts appear under the app's name, and it can draw anything anywhere, including a fake key prompt.

Conclusion: in-origin third-party code means handing over everything. CSP limits where it sends data, not whether.

**Sound architectures**

A. **Review and ship (first-party catalogue).**
- Blocks are code in the repository, reviewed, built into the bundle. What users share at runtime is data only: mode files that reference blocks by name and carry config validated against each block's schema.
- This is what the code already does: a static registry (`src/catalog/index.js:53-101`), exact-match lookup, unknown refs skipped (`src/components/RoomShell.jsx:150-155`).
- CSP changes: none.
- To make review meaningful, give blocks a real boundary: they receive a scoped host API and may not import `providers`, `crypto` or `db` directly (a lint rule on `src/catalog/entries/**`), and the underscore methods on `hostAPI` (`src/lib/hostAPI.js:228-241`) stop being callable by every block.
- A declarative variant (blocks as JSON interpreted by first-party code) gives outside authors a route with no code execution.

B. **Sandboxed iframe with an opaque origin and a message-passing capability API.**
- The block runs inside `<iframe sandbox="allow-scripts">` without `allow-same-origin`. That forces an opaque origin: no access to the app's IndexedDB, Cache Storage, service worker or DOM [S15].
- MDN warns that combining `allow-scripts` and `allow-same-origin` on same-origin content lets the frame remove its own sandbox, and that sandboxed content should also be served from a separate origin [S15].
- The host document must be a real file fetched from the network with its own CSP header, not `srcdoc`, `blob:`, `data:` or `about:blank`. Those local-scheme documents inherit the embedder's policy [S13][S14], so the frame would be bound by the app's `script-src 'self'` (with `'self'` resolved against the inherited policy's origin [S14]) and could not run arbitrary block code unless the app's own CSP were loosened, which must not happen.
- A network-fetched host page gets its policy from its own response. Give it, for example: `default-src 'none'; script-src 'unsafe-eval'` (or `blob:`); `connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors <app origin>`, plus the CSP `sandbox allow-scripts` directive so it stays sandboxed even if opened directly.
- Sandbox flags: `allow-scripts` only. No top navigation, popups, forms, modals or downloads.
- Parent CSP changes: `script-src 'self'` stays. `frame-src` must allow the host page (`'self'` or the separate blocks origin). The current blanket `frame-ancestors 'none'` and `X-Frame-Options: DENY` on `/*` would block framing a same-site host page, so header rules must become path-specific. How Netlify combines overlapping header rules is not stated in its documentation [S24] (**unverified**); since extra CSP policies can only restrict further [S16], test this or host the page on a second site.
- Remaining exfiltration routes and what closes them:
  - The frame navigating itself: restricted by the parent's `frame-src`, which governs what loads into child frames [S14].
  - Its own requests: closed by its own `default-src 'none'`.
  - Top navigation and popups: closed by the sandbox.
  - Resource hints, WebRTC, timing channels: residual and browser-dependent (**unverified**).
  - The capability API itself: the real surface.
- Capability API: hand the frame a `MessageChannel` port at start-up (an opaque origin reports its origin as `null`, so origin checks are useless). Validate every request against a schema in the host. Never pass a key into the frame: the host makes model calls on the block's behalf, within limits and with consent tied to declared capabilities. Scope storage reads to the current conversation. Draw visible provenance around third-party blocks, since they can still imitate UI inside their own rectangle.
- Process isolation: whether Chrome puts a same-site sandboxed frame in its own process is **unverified**. Serving the host page from a different site is the safer assumption.
- Not boundaries: a same-origin Web Worker (it can open IndexedDB) and any in-origin dynamic import.

**Recommendation**
- Plan on A for this refactor and write the capability-scoped host API now, used by first-party blocks, so the seam exists.
- Add B only if runtime third-party code becomes a real requirement, and then on a separate origin.
- Rule out in writing: any design that needs another script host, `blob:` scripts or `'unsafe-eval'` in the app's own CSP.

---

## Conflicts worth recording in docs/spec/conflicts.md

1. `CLAUDE.md` says provider and source hosts are listed in `netlify.toml`; only Anthropic is.
2. `SECURITY.md` prints a CSP that differs from the deployed one, and describes a "session-only" key mode that no longer exists.
3. `Permissions-Policy: microphone=()` against `voice-input@1.0` being treated as live (conflicts.md C24).
4. Editor copy says a room "can be exported as a mode file and shared" (`src/components/editor/EditorRightRail.jsx:364`); no import or export exists in code. The only way a foreign mode file enters is a backup restore.

## Unverified items, collected

- Voice input failing on the deployed site because of `microphone=()` (spec reasoning plus one secondary report; not tested live).
- Which cloud service stable Edge and Safari use for speech.
- Browser support for the CSP `webrtc` directive; CSP coverage of resource hints.
- Whether `upgrade-insecure-requests` affects `http://localhost` requests.
- How Netlify merges overlapping header rules.
- Chrome process isolation of sandboxed same-site iframes.
- COOP `same-origin` with `about:blank` pop-outs.
- Six react-router advisories judged from titles, not opened.
- Cache Storage persistence in item 19 is my own analysis.

## Sources (all fetched 2026-10-11)

- [S1] MDN, Using the Web Speech API (modified 2026-08-31): https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
- [S2] MDN, SpeechRecognition (modified 2026-08-19): https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- [S3] MDN browser-compat-data, SpeechRecognition: https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SpeechRecognition.json
- [S4] Chrome 139 release post (2025-08-05): https://developer.chrome.com/blog/new-in-chrome-139
- [S5] Microsoft Edge docs, SpeechRecognition API (updated 2026-10-06): https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api
- [S6] Web Speech API draft (2026-09-18): https://webaudio.github.io/web-speech-api/
- [S7] W3C Permissions (WD 2025-10-06): https://www.w3.org/TR/permissions/
- [S8] MDN, SpeechRecognition.processLocally: https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally
- [S9] SheetJS advisory CVE-2023-30533: https://cdn.sheetjs.com/advisories/CVE-2023-30533.html ; GitHub advisories https://github.com/advisories/GHSA-4r6h-8v6p-xvw6 and https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
- [S10] SheetJS install docs: https://docs.sheetjs.com/docs/getting-started/installation/frameworks
- [S11] npm registry metadata, `npm view xlsx`, run locally
- [S12] GitHub advisories: https://github.com/advisories/GHSA-wrjc-x8rr-h8h6 , GHSA-chx6-hx7r-mcp5 , GHSA-2j2x-hqr9-3h42 , GHSA-337j-9hxr-rhxg , GHSA-49rj-9fvp-4h2h , GHSA-rxv8-25v2-qmq8 (same URL pattern)
- [S13] HTML Standard, policy containers (7.1.7) and sandboxing: https://html.spec.whatwg.org/multipage/browsers.html#policy-containers
- [S14] CSP Level 3 editor's draft (2026-09-16), sections 2.2, 6.1.5, 6.2.1, 6.2.2, 7.8, 8.6: https://w3c.github.io/webappsec-csp/
- [S15] MDN, iframe element, sandbox (modified 2026-10-01): https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- [S16] MDN, Content-Security-Policy header (modified 2026-03-22): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- [S17] MDN, style-src (modified 2025-12-15): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src
- [S18] MDN, connect-src (modified 2026-07-03): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src
- [S19] MDN, Trusted Types API (modified 2026-05-14): https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API ; compat data https://raw.githubusercontent.com/mdn/browser-compat-data/main/http/headers/Content-Security-Policy.json
- [S20] `navigate-to` removal, secondary: https://content-security-policy.com/navigate-to/
- [S21] OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- [S22] Web Cryptography editor's draft (2026-08-11), sections 5.2 and 6.2: https://w3c.github.io/webcrypto/
- [S23] Anthropic docs, web search tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- [S24] Netlify docs, custom headers: https://docs.netlify.com/manage/routing/headers/
- [S25] Chrome, Local Network Access (2025-06-09): https://developer.chrome.com/blog/local-network-access
- [S26] `contenteditable="plaintext-only"` support, secondary: https://caniuse.com/mdn-html_global_attributes_contenteditable_plaintext-only
- [S27] https://github.com/Solofsson25/project-apollo returned HTTP 404 unauthenticated

## Key files (absolute)

- `netlify.toml`
- `index.html`
- `vite.config.js`
- `package.json`
- `public\manifest.webmanifest`
- `README.md`
- `SECURITY.md`
- `LICENSE`
- `src\main.jsx`
- `src\App.jsx`
- `src\lib\crypto.js`
- `src\lib\networkLog.js`
- `src\lib\db.js`
- `src\lib\backup.js`
- `src\lib\backupFormat.js`
- `src\lib\restorePlan.js`
- `src\lib\validate.js`
- `src\lib\upgradeCheck.js`
- `src\lib\fileParser.js`
- `src\lib\fileUpload.js`
- `src\lib\bus.js`
- `src\lib\hostAPI.js`
- `src\lib\mathEval.js`
- `src\providers\anthropic.js`
- `src\hooks\useVoiceInput.js`
- `src\stores\ChatContext.jsx`
- `src\stores\FileShelfContext.jsx`
- `src\stores\SettingsContext.jsx`
- `src\stores\PWAContext.jsx`
- `src\stores\BackupContext.jsx`
- `src\views\SettingsView.jsx`
- `src\views\ChatView.jsx`
- `src\views\HomepageView.jsx`
- `src\components\BackupRestoreModal.jsx`
- `src\components\UpgradeGate.jsx`
- `src\components\NetworkActivityCard.jsx`
- `src\components\RoomShell.jsx`
- `src\components\LibraryCard.jsx`
- `src\components\Input.jsx`
- `src\components\build\wizard\IgnitionStep.jsx`
- `src\components\core\MessageCard.jsx`
- `src\components\core\CitationLink.jsx`
- `src\components\core\CitedMarkdown.jsx`
- `src\components\core\FileShelf.jsx`
- `src\components\core\ChartCanvas.jsx`
- `src\components\core\DocumentCanvas.jsx`
- `src\components\core\sbrd\DocumentParagraph.jsx`
- `src\catalog\index.js`
- `src\catalog\entries\input-render.jsx`
- `src\catalog\entries\voice-input-render.jsx`
- `src\catalog\entries\web-search-render.jsx`
- `src\catalog\entries\file-attach-render.jsx`
- `node_modules\react-markdown\lib\index.js`
- `node_modules\decode-named-character-reference\index.dom.js`
- `dist\sw.js` (stale local build, evidence only)
