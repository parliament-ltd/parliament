# Pop-out prototype

Stage 3 starts here (refactor-plan.md). The question: can the bar be popped
into a window of its own (`pop:command`, welcome page step 6) and stay
dependable? Written 19 October 2026. Throwaway: `src/views/PopoutPrototype.jsx`
goes once there is a verdict.

## What it tries

From the audit (`state-architecture.md` 11c) and the security audit's notes on
pop-outs:

1. Opening from Enter, without a pop-up blocker stopping it.
2. Styles in the new window, under the content security policy and the
   cross-origin opener policy the site sends.
3. Keys, selection and focus inside the window.
4. Timers and animation when the tab that opened it is hidden. The audit
   calls this the highest risk.
5. Closing either side: closing the window brings the bar back; closing or
   reloading the tab closes the window.
6. Two kinds of window: an ordinary one (`window.open`), and the one that
   stays on top, which Chromium browsers offer (Document Picture-in-Picture).

The window has no code of its own. React draws the bar into it from the tab
through a portal; the window is blank, same-origin and never navigated.

## How to run it

In development, at `http://localhost:5173/dev/popout` after `npm run dev`.

Under the real security headers, a production build made with the prototype
switched on, then served by `vite preview` (which sends the same headers as
the site):

```
VITE_PROTOTYPES=1 npm run build
npm run preview -- --port 4173
```

then `http://localhost:4173/dev/popout`. An ordinary `npm run build` leaves
the prototype out.

On the page: type `> pop:command` and press Enter, or `> pop:pip` for the
window that stays on top. In the window, try `/`, Ctrl+K (Cmd+K), Escape,
selecting the sentence, and `> pop:back`. Then hide the tab for ten seconds
(switch to another tab, or minimise the window it is in) and come back. The
panel under "What happens" counts timer ticks and frames for the tab and for
the window, and lists visibility changes.

## What the in-app browser showed (19 October)

- **It opens no windows at all.** `window.open` returned nothing after a real
  Enter, and the always-on-top window failed with "Internal error: no
  window". It is the Claude app's embedded browser; this says nothing about
  Chrome, Firefox or Safari. The window tests need a real browser.
- **The bar itself works:** Ctrl+K opens command mode with `>`, Escape clears,
  `/` jumps to the field (checked with a synthetic key, since the testing
  tool's typed `/` sends no key event), and selection is read from the bar's
  own document.
- `crossOriginIsolated` is false on the dev server, as expected; the headers
  apply under `vite preview`.

## What to look for in a real browser

Expectations from how browsers behave, **not yet seen**:

- **Opening:** Enter counts as the click a pop-up blocker wants, so both kinds
  should open. Only one always-on-top window per tab.
- **Styles:** each `<link>` is copied as a link, which `style-src 'self'`
  allows. Each `<style>` element is cloned, which needs `'unsafe-inline'`; the
  panel counts both, since stage 3 wants to drop `'unsafe-inline'`.
- **The hidden tab:** this tab's timers slow to about once a second (and once
  a minute after five minutes), and its frames stop. The window's own timers
  and frames should keep going while the window is visible. The two dots show
  the difference: the top one is moved by framer-motion on this tab's frames
  and should freeze; the lower one is a CSS animation run by the window and
  should keep moving.
- **Closing:** closing the window should bring the bar back to the page;
  reloading the tab should close the window.
- **Safari and Firefox:** no always-on-top window; `pop:pip` says so, and
  `pop:command` opens an ordinary window.

## What it would mean for stage 3

If the expectations hold, the bar can be popped dependably on these rules:

1. A popped window has no code of its own; the tab draws into it.
2. Styles reach it as links to the built stylesheet, not copied text.
3. Keys are handled per window, by one key manager attached to each.
4. Selection, focus and lookups use the bar's own document, never the tab's.
5. Anything in a popped window that runs on a clock (timers, frames) uses
   that window's clock. Its animations are CSS, not framer-motion.
6. Closing either side is handled: the window brings the bar back; the tab
   closes its windows.
7. Where there is no always-on-top window, the Enter line says the window will
   not stay on top (refactor-plan.md, stage 3, feature detection).

If the hidden-tab test fails even for the window's own clock (for example if
a browser freezes a window whose opener is hidden), `pop:command` should not
be promised on the welcome page, and step 6 needs another verb.
