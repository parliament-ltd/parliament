# Parliament: languages, sources, Mistral and networks

**Date:** October 16, 2026
**Status:** Recommendations from a planning conversation, plus the confirmed decisions listed in §0. Items marked **Unverified** must be checked before any code depends on them.
**Read with:** `parliament-v2-brief.md`, `parliament-v2-refactor-scope.md`, `mode-workshop-architecture.md`, `parliament_mode_file_format.md`, `model-picker-field-type-spec.md`, `consent-flow-ui-spec.md`. If this doc disagrees with any of them, those docs win. Flag the conflict instead of choosing silently (scope §7).

---

## 0. Decisions and scope changes

**Confirmed decisions (October 16, 2026):**

1. **Multi-language support moves into Phase 1** of the V2 refactor: the groundwork (§2.1, §4, the key rules in §5) and the user-facing language features (§2.2, §3).
2. **The `model-picker` field type and additional providers move into Phase 1**, including Mistral.

**`parliament-v2-refactor-scope.md` still contradicts these and needs updating:**

- The Phase 1 goal says Phase 1 is "composition, not features", and its "not required" list excludes the model-picker field type and provider work beyond V1.
- Phase 2 item 2.3 lists the `model-picker` field type as an Agent-tier prerequisite. It now lands in Phase 1; the consent flow can stay in Phase 2.
- §5 (Deferred) lists multi-language support (UI localization and Resources translation) as post-V2.
- Phase 1 exit criteria (1.8) and testing (§6) need entries for languages and providers.

Whether anything needs a native app instead of the existing PWA is covered in §7.4.

Mistral remains blocked on the CORS check in §7.1.

---

## 1. Summary

- Treat three jobs separately: interface translation, reply language, and layout for every writing system.
- Most sources are English-heavy. Badge them, and make any translation opt-in with its cost shown.
- Mistral is the strongest provider for European languages, but it may not accept browser requests. Test this before building. Installing the PWA does not change that.
- Kiwix works inside the existing PWA by reading ZIM files directly, with no server. A native app is only needed if Mistral's CORS check fails.
- Chrome now asks permission before a site can reach `localhost`, which affects Ollama and kiwix-serve. Parliament needs a screen before that prompt and a recovery path if it's denied.
- Never infer language or location from an IP address. VPNs make IP-based guesses wrong.
- Kiwix plus a local model is a version of Parliament that works with no internet at all. Position it as a feature for low-connectivity and censored regions.

---

## 2. Interface translation

### 2.1 Groundwork (ship in English, do early)

- **Library:** react-i18next (or Lingui for a smaller bundle and compile-time checks).
- **Locale files:** static JSON, lazy-loaded per language. vite-plugin-pwa precaches the active locale so offline use keeps working. No backend needed.
- **Plurals:** ICU message format. Simple `count === 1` logic fails for Russian, Arabic, Polish and others.
- **Formatting:** `Intl.NumberFormat` for spending (amounts stay in USD, formatted per locale), `Intl.DateTimeFormat` for dates, `Intl.RelativeTimeFormat` for "edited 4 days ago".
- **Guardrail:** eslint-plugin-i18next to block hardcoded user-facing strings.
- **Testing:** a pseudo-locale (accented, lengthened text such as `[Śéţţîñĝš ~~~]`) to expose missed strings and overflow.

### 2.2 Choosing the language

- Default from `navigator.languages`. Never from IP.
- Store the choice in IndexedDB settings. Settings is a shell-level surface, not a room feature.
- The picker lists languages by their own names ("Deutsch", "日本語"), never by flags.

### 2.3 Translation workflow

- Weblate (open source, free hosting for open-source projects) or Crowdin (free for open source), synced with GitHub.
- Claude drafts the first pass. Native speakers review, starting with privacy and security copy.
- First two languages: **Arabic** (right-to-left) and **Japanese** (CJK). They break layouts the most. European languages are mostly translation work after that.

---

## 3. Reply language

- A separate "Reply in" setting, defaulting to the UI language and added to the system prompt for every provider. Users often want a UI in one language and replies in another.
- **Token cost:** many non-Latin scripts use more tokens for the same content. The context meter and spending estimates must use real counts:
  - Anthropic: pre-flight token counting endpoint.
  - Mistral: no pre-flight counting. Use the `usage` figures from each response.
  - Ollama: `prompt_eval_count`.

---

## 4. Layout and writing systems

- **Right-to-left** (Arabic, Hebrew, Persian, Urdu): use Tailwind logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) instead of `ml-`/`mr-`/`left-`/`right-`, and set `dir` on `<html>`. Layouts mirror. Flip Framer Motion `x` animations and directional icons (chevrons, arrows).
- **Messages:** `dir="auto"` on every message bubble, since users mix languages within a chat regardless of UI language.
- **Section labels:** the `uppercase tracking-wider` style must depend on the language. It does nothing in CJK and breaks letter joining in Arabic.
- **Text expansion:** German and Finnish often run about 30% longer than English. Segmented controls and buttons need room.
- **Fonts:** the system font covers almost every script. The brand serif probably does not, so it needs script-specific fallbacks.

---

## 5. V2-specific rules

- **Component manifests** (Phase 1.1 contract): `name`, `description` and config field labels must be translatable. First-party components can use keys into locale files. Community components need a `localized` map in the manifest.
- **Mode files and backups store keys and IDs, never translated strings.** A room saved with a German UI must restore correctly in English.
- **Names:** "Parliament" stays untranslated. Built-in template names (Writing studio, Data workspace, etc.) are UI copy and get translated. Names users give their own rooms are never translated.
- **Commands** (`spread:`, `map:`, `open:`, `diff:`) stay in English so shared tips and docs work everywhere. Localized aliases can come later.
- **Copy conventions** (sentence case, no em dashes) need per-language equivalents. Sentence case does not apply in scripts without letter case.
- **Resources library** translation is also listed post-V2 in scope §5. The same key rules apply when it happens.

---

## 6. Sources

| Source | Language behavior | Handling |
|---|---|---|
| Wikipedia | Separate edition per language | Query the user's edition (`ja.wikipedia.org`). Fall back through language links, then English. Show which edition a result came from. |
| Wikidata | Labels in many languages | Request labels with a fallback chain (user language, then English). |
| Kiwix | Archives in many languages | Let users choose archive languages and link the matching downloads. Works in the PWA by reading ZIM files directly (§7.4). |
| arXiv, Europe PMC, Crossref, OpenAlex, Open Library | Mostly English; metadata stays in the work's publication language | Badge as English-mostly. arXiv still needs its CORS test. |
| Hacker News (via Algolia) | English only | Badge. |
| Brave Search | Takes language and country settings | Pass the user's settings through. Billed per request on the user's key. **Unverified:** CORS. |
| News (later) | Depends on region | Choose sources per region, not one global outlet. |
| Open-Meteo | Forecasts are numbers; geocoding takes a language setting | Ship translated labels for the numeric weather codes. Pass the language to geocoding. |
| Openverse | Search relies mostly on English tags | Badge. Expect fewer results for non-English searches. |

**Rules for English-only sources**

- Badge each source in the picker: "English only" or "in your language", alongside the existing "your key", "on your machine" and "later" marks.
- Query translation is **opt-in with its cost shown**, for example "Translate query (1 small model call)". A local model keeps it free and fits the "no model call" label better.
- Result translation is per-card, on request, with the cost shown.
- Query translation is a model call made for the user, so it probably falls under the Agent-tier consent flow (see open question 6).

---

## 7. Providers

### 7.1 Mistral (confirmed for V2)

**Blocking check: browser access. Unverified.**
A third-party guide (API Status Check, August 2026) says `api.mistral.ai` does not send `Access-Control-Allow-Origin` for browser origins, so direct browser calls fail at the preflight. This is not from Mistral's docs, and it could not be confirmed during this conversation. Test it from a blank page served from parliament.ltd with an `OPTIONS` preflight that requests the `authorization` header.

If it is blocked, the options in order of fit with Parliament's design:

1. **Open-weight Mistral models through Ollama.** Same model family, runs locally, no CORS issue.
2. **Desktop shell.** Native apps are not subject to browser CORS. Installing the PWA does not help here (§7.4). See open question 3.
3. **Opt-in relay as a Netlify Function.** Every user's key and prompts would pass through Parliament's server. This breaks the "no servers" promise, so it must be clearly labeled and never the default.

**Regional endpoints**

| Endpoint | Processing location | Price |
|---|---|---|
| `api.mistral.ai` | Global, no location commitment | List price |
| `api.eu.mistral.ai` | EU and EFTA data centers | 1.1× list price |
| `api.us.mistral.ai` | US data centers | 1.1× list price |

- Add a "Processing region" setting under Mistral. Spending estimates apply the 1.1× rate for regional endpoints.
- Regional endpoints only serve models hosted in that region and lack stateful features (Agents, Batch, Files API). Load the model list from the chosen endpoint with `getModels`, which fits the model-picker's unavailable-model fallback.
- **Privacy wording:** account configuration, API keys, billing and usage analytics may be handled outside the chosen region. "Your messages are processed in the EU" is accurate. "Your data stays in the EU" is not.
- **CSP:** all three hosts need allowlist entries.
- **Processing region is set by URL, not IP.** A VPN user on the EU endpoint still gets EU processing.

**Other details**

- **Pin dated model IDs in mode files.** Mistral regularly re-points its `-latest` aliases, so a room saved with `mistral-large-latest` could change behavior later.
- **Label model origin.** Mistral now hosts third-party open models too (starting with Z.ai's GLM-5.2), so not every model from Mistral is Mistral-made.
- **Language tags:** Mistral lists French, English, German, Italian, Spanish, Dutch and Portuguese as first-tier languages. Reflect this in the model picker.
- **Country availability: Unverified.** No published supported-countries list was found. Do not claim Mistral covers regions other providers don't until checked against Mistral's terms.

### 7.2 Local models (Ollama, LM Studio, llama.cpp)

- Language quality varies widely. Llama 3.1 officially supports eight languages; Qwen is much stronger in Chinese; small models degrade in less widely used languages. Tag models with their supported languages in the picker.
- Other scripts are slower to generate on local hardware and fill context faster.
- Use a **multilingual embedding model** for relevance filtering and reranking. Many popular embedding models are English-only and silently produce poor matches for other languages.

### 7.3 Anthropic

- The API is only offered in supported countries. Using a VPN to get around this is against its terms. Parliament must never suggest a VPN as a workaround.

### 7.4 PWA or native app?

**Rule:** installing a PWA does not change browser security rules. An installed Parliament has the same origin and the same CORS and local-network restrictions as the website. A service worker cannot read a cross-origin response the server has not allowed either.

**Mistral: a PWA does not help.** If `api.mistral.ai` does not allow browser origins (§7.1), the only routes are Ollama with open-weight Mistral models, a native shell, or an opt-in relay.

**Kiwix: a PWA works, with no server.** Kiwix's own PWA proves the approach:

- ZIM files are read in small slices through the File API, so the archive never has to fit in memory. Compressed slices are decompressed by WebAssembly.
- A service worker serves article pages built from the archive.
- Archives can live in the Origin Private File System (no permission prompts, fast) or stay on disk, with File System Access handles saved in IndexedDB. Handles need a re-grant with a click each session.

Constraints:

| Constraint | Detail | Implication |
|---|---|---|
| Archive size | Full English Wikipedia with images is over 110 GB. | Offer smaller editions (no images, topic subsets) for OPFS; large archives stay on disk. |
| Firefox | Caps OPFS at 10 GB; no `showOpenFilePicker()`. | Large archives on Firefox are re-picked each session with a file input. |
| Safari / iOS | Partial OPFS support. On iOS only Safari allows service workers. | Test iOS early; it may be read-only or small-archive only. |
| Exporting from OPFS | Needs `showSaveFilePicker()`, missing on mobile and desktop Firefox. | Warn that archives downloaded into Parliament may not be extractable later. |
| Full-text search | Kiwix's write-up does not say how full-text search works in the browser; their docs note it only works on iOS 15+. **Unverified.** | Plan for title search first; investigate full-text separately. |
| **License** | **Kiwix JS is GPL-3.0.** | Parliament is MIT, so it cannot bundle Kiwix JS code without changing license. Write a reader against the open ZIM format, or check the license of any ZIM library before using it. |

**Optional power-user route:** talk to `kiwix-serve` on localhost. Two problems: its manual documents no CORS option (**Unverified** whether browser requests work), and it falls under Chrome's local network permission below.

**Result:** a native app is only needed for Mistral, and only if the CORS check fails. Brave Search and arXiv still need their CORS tests and could add to that list.

### 7.5 Chrome's local network permission (affects Ollama)

- Since Chrome 142, a public HTTPS page that fetches `localhost` or a private IP must first get a permission the user grants through a prompt. Chrome 145 split it into separate local-network and loopback permissions.
- **Denying is sticky.** Chrome does not ask again; the user must re-grant it in site settings.
- Chrome 156 (stable around October 20, 2026) removes the enterprise opt-out.
- **Unverified:** whether installed PWAs are treated differently. Test in the installed app.

What Parliament needs:

- An explanation screen before the first Ollama or kiwix-serve request, so the prompt isn't a surprise. The prompt can be triggered deliberately with a `fetch()` to the local address.
- A recovery screen when the permission was denied, with steps to re-grant it in site settings.
- Add both to the Ollama setup flow, alongside `OLLAMA_ORIGINS`.

---

## 8. Networks and VPNs

**Never infer language or location from IP**

- UI language comes from the browser (§2.2).
- "Weather here" uses the browser's location permission or a typed city.
- parliament.ltd: no Netlify location-based redirects for language. Use the browser language plus a manual switcher.
- Time zone comes from the operating system, so `Intl` dates are unaffected by VPNs.

**Shared VPN addresses**

- Free APIs that limit per IP (such as Algolia for Hacker News) may return 429s the user didn't cause. Some news sites put bot challenges in front of VPN traffic, which browser requests can't pass.
- Show a specific error state: "This source isn't reachable from your current network", with a suggestion to turn off the VPN for that source.
- Wikipedia allows reading from VPN addresses but usually blocks editing. If the "you could help fix this" link ships, note that editing may not work on a VPN.

**Workplace VPNs and proxies**

- Some block provider hosts outright.
- Some buffer streamed responses, so replies arrive all at once or time out. Detect a stalled stream and fall back to a non-streaming request.

**Local network**

- Some VPN clients have a "block local network" option that cuts off an Ollama instance on another machine (`192.168.x.x`). An instance on `localhost` is usually unaffected. Add this to Ollama setup troubleshooting.

**Privacy**

- The "what leaves this browser, and where" panel should list which sources see the user's IP address. A VPN hides the IP from sources, but the API key still identifies the user to the model provider.
- Privacy browsers (such as Tor Browser) often clear IndexedDB on close. Detect this and prompt users to back up.

---

## 9. Browser support

**Approach:** publish a status table on parliament.ltd and in Settings, and use feature detection in the app (`'documentPictureInPicture' in window`, `'showOpenFilePicker' in window`, `navigator.storage.persist`). Never detect browsers by user-agent string. A feature that is unavailable shows what happens instead, rather than disappearing.

**Recommendation line:** "Parliament works in all modern browsers. Pop-outs that stay on top and Kiwix files kept on disk need a Chromium-based browser (Chrome, Edge, Brave, Arc, Vivaldi) or, for pop-outs, Firefox 151+." Avoid "use Chrome": privacy-minded users will read that as a mixed message.

| Feature | Chromium (Chrome, Edge, Brave, Arc) | Firefox | Safari (macOS) | Mobile |
|---|---|---|---|---|
| Core app (IndexedDB, Web Crypto, offline) | Yes | Yes | Yes, but see storage row | Yes |
| Install as an app | Yes | Windows only, since Firefox 143 (not the Microsoft Store build) | Yes (Add to Dock) | Android: yes. iOS: Safari only (Add to Home Screen) |
| Always-on-top pop-outs (Document Picture-in-Picture) | Yes, 116+ | Yes, 151+ | **No** | No |
| Ordinary pop-out windows (`window.open`) | Yes | Yes | Yes | No |
| Kiwix files on disk, remembered (File System Access) | Yes, re-grant each session | No (re-pick each session) | No (re-pick each session) | No |
| Kiwix in private storage (OPFS) | Yes | Yes; best-effort quota is 10 GiB, raised by persistent storage | Partial | Partial |
| Persistent storage request | Decided automatically from usage | User sees a prompt | Decided automatically from usage | Varies |
| Local network permission (Ollama, kiwix-serve) | Prompt since Chrome 142 (§7.5) | **Unverified** | **Unverified** | n/a |

**Pop-outs in Safari:** do not disable them. Fall back to an ordinary popup window: it works on any screen but does not stay on top. The `pop:` command preview (the `pre()` rule) should say so before Enter, for example "Opens as a regular window (Safari can't keep it on top)." Both kinds must open from a user action, such as pressing Enter on a command, or popup blockers stop them.

Document Picture-in-Picture limits that apply everywhere: only one such window at a time (opening another closes the first), no fullscreen inside it, and it closes when the opener tab closes, navigates or reloads.

**Safari storage risk (highest priority):** with tracking prevention on, Safari deletes script-written data (IndexedDB included) for a site the user hasn't interacted with in the last seven days of browser use. For a local-first app that keeps every conversation in IndexedDB, that is data loss. **Unverified:** whether the Dock or Home Screen app is exempt (MDN does not confirm it). Until confirmed:

- Detect Safari-in-a-tab and recommend installing Parliament to the Dock or Home Screen.
- Call `navigator.storage.persist()` after the user has meaningful data, and show the result in Settings.
- Show "last backup" prominently and nudge a backup after a few days without one.

**Mobile:** no pop-outs of either kind. Pop-out is an extension of navigation, never the navigation model (existing rule).

## 10. Offline and censored regions

Users in countries that block sites like Wikipedia often rely on VPNs to reach them. Kiwix plus a local model gives them a Parliament that works with no internet connection, which few chat interfaces offer. If worldwide accessibility is a goal, present this combination as a feature in positioning and docs, not as a niche setting.

---

## 11. Open questions

1. **Scope doc update.** `parliament-v2-refactor-scope.md` needs updating to match §0. Phase 1 grows substantially; does any Phase 1 work move out to make room?
2. **Mistral CORS result.** If blocked, which fallback from §7.1?
3. **Desktop shell.** Kiwix works in the PWA (§7.4), so a native app is only needed for Mistral if its CORS check fails, and possibly for Brave or arXiv. Is a native shell worth it for those, or are Ollama and opt-in fallbacks enough?
4. **Community manifests.** Is an English name and description required as a baseline? Who translates community components?
5. **First languages and reviewers.** Arabic and Japanese are recommended for layout reasons. Are native reviewers available?
6. **Query translation and consent.** Which model translates queries by default (local or a small hosted model)? Is it Agent-tier and therefore subject to `consent-flow-ui-spec.md`?
7. **Mistral default region.** Global or EU, given the 10% surcharge?
8. **Mistral country availability.** Check against Mistral's terms.
9. **Provider suggestions by language.** Should Parliament suggest a provider that suits the user's language, or would that read as steering?
10. **Other surfaces.** Does parliament.ltd get translated? In which languages are the contributor docs (scope §3.4) written?
11. **Translation licensing.** Confirm translation contributions are covered by the project license (Weblate/Crowdin settings).
12. **Kiwix reader.** Write Parliament's own ZIM reader (MIT) or find a compatibly licensed library? How is full-text search handled?
13. **Kiwix storage default.** Download archives into Parliament's private storage (fast, no prompts, hard to export on some browsers) or point at files on disk (re-grant each session)?
14. **Safari eviction.** Confirm whether Dock and Home Screen installs are exempt from Safari's seven-day deletion. If not, is a backup nudge enough, or should Parliament warn Safari users more strongly?
15. **Browser status page.** Where does the status table live: parliament.ltd, Settings, or both? Who keeps it current as browsers ship features?

---

## 12. References

- Mistral regional inference: https://docs.mistral.ai/inference/regional-inference
- Mistral API CORS error (third-party, Aug 2026): https://apistatuscheck.com/blog/mistral-api-cors-error
- Mistral first-tier languages (third-party): https://bestllmfor.com/meilleur-llm/multilingue-europeen/
- Mistral third-party open models: https://gigazine.net/gsc_news/en/20260813-mistral-ai-third-party-open-model/
- Mistral supported countries (third-party, no list found): https://rgb.ir/en/ai/mistral/
- Kiwix PWA case study (web.dev): https://web.dev/case-studies/kiwix
- Kiwix JS PWA wiki (license, browser support): https://github.com/kiwix/kiwix-js-pwa/wiki
- kiwix-serve manual: https://www.mankier.com/1/kiwix-serve
- Chrome local network access (Chrome blog): https://developer.chrome.com/blog/local-network-access
- Chrome 156 local network access (third-party): https://www.superchargebrowser.com/library/chrome-156-local-network-access/
- Document Picture-in-Picture browser support (third-party, Aug 2026): https://www.rabbitpair.com/en/products/dualpip/faqs/document-pip-browser-limits
- Storage quotas and eviction criteria (MDN): https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- WebKit storage policy (to confirm Home Screen exemption): https://webkit.org/blog/14403/updates-to-storage-policy/
- Firefox 143 web apps on Windows: https://gigazine.net/gsc_news/en/20250917-firefox-143
