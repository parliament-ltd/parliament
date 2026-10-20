# Browsers

Which browsers Parliament is tested in, and how. Started 20 October 2026
(C94). The site's own browser support table comes from this at stage 15.

Parliament decides by feature, never by the browser's name (refactor-plan.md,
stage 3). This list says where each feature is known to be present.

## Tested in

| Browser | Engine | Why | Status |
|---|---|---|---|
| Chrome | Chromium | The most common; has the always-on-top window | Pop-out tried 20 October (`research/popout-prototype.md`) |
| Firefox | Gecko | The second engine | Not yet |
| LibreWolf | Gecko | Stefan uses it (C94). Deletes site data on close; fingerprint resistance on | Not yet |
| Zen | Gecko | Stefan uses it (C94). Firefox's privacy settings | Not yet |
| Safari | WebKit | Not a concern for now (Windows) | Waits |
| Phones | | "Built for a computer for now" (stage 5) | Later |

## What differs

| Feature | Chromium | Firefox, LibreWolf, Zen |
|---|---|---|
| Always-on-top window (`pop:command`) | Yes | No: an ordinary window, and the Enter line says so |
| Voice on the device (C70) | Chrome on desktop | No: the microphone stays hidden |
| Keeping storage when asked (C88) | Decided by the browser, silently | The browser asks the person |
| Site data kept after closing | Yes | Yes in Firefox and Zen; **deleted in LibreWolf** unless the site is allowed |
| Reported language | The person's | LibreWolf: always US English |
| Reported time zone | The person's | LibreWolf: UTC |
| WebGL | Yes | LibreWolf: off. Parliament does not use it |

## A short test, for each browser

About ten minutes. On the dev server (`npm run dev`, then
`http://localhost:5173`), or under the real headers (`vite preview`, see
`research/popout-prototype.md`).

1. **Opens and keeps data.** Open `/chats`. Make a chat and send nothing.
   Close the browser completely and open it again. Is the chat still there?
   (In LibreWolf, expect it gone by default; then allow the site's data in
   Settings, under Privacy, Cookies and Site Data, Manage Exceptions, and try
   again.)
2. **Keeping storage.** In Settings, under Data and backups, the Storage card
   says whether the browser keeps the data. Press "Ask it to keep the data",
   answer the browser's question, close the browser, open it again. In
   LibreWolf: does the data survive with persistent storage granted but no
   exception?
3. **Backup and restore.** Make a backup from Settings; restore it with
   "merge": everything should be skipped as already there.
4. **The pop-out.** `/dev/popout`: `> pop:command`, then in the window `/`,
   Ctrl+K, Escape, select the sentence, `> pop:back`. Reload the tab with the
   window open: the window should close.
5. **Language.** Note what language the browser reports (LibreWolf will say US
   English whatever it is set to).

Write down what differs from Chrome; it goes into the table above.
