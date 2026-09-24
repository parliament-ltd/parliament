# Parliament — Settings: decisions

Companion to `parliament_settings_v1.html`. Dated 23 September 2026. First pass.
Reads alongside `almanac-spec-decisions.md` and `docket-spec-decisions.md`, and
replaces the design in `parliament-settings-current.html` (main `5ac8a1d`).

The mockup carries what can be demonstrated: the stacked sections, the moving
navy rule, the key panel, the bar positions, the verbs and their Enter lines.
Its header comment is the record for those and should be treated as
authoritative where the two disagree. This document holds the reasoning, the
rules that live on other surfaces, and what the implementation must do that a
mockup cannot show.

---

## 1. What changed

| Was | Now | Why |
|---|---|---|
| One section at a time, sidebar nav | All sections stacked in one card; rail as index | Six sections is a page, not an app. Reading down beats clicking across |
| No command line | The bar, as on every surface | The bar is how you arrive and leave; Settings is a surface |
| Gold on selection, toggles, links | Ink; gold only for the live action | The gold rule (Almanac v24) |
| Title Case headings | Sentence case, no em dashes in UI copy | House style |
| API Configuration + Model Preferences | **API keys**: providers, their keys, their models, the default | A key belongs next to the cost it unlocks |
| Dollar prices and speed on each model | Cost marks (`×15`) | Marks for choosing, dollars for billing (§9) |
| Session usage | This month, and costliest runs | Cost belongs to the run |
| Auto-compress: Automatic | Removed | It would write a branch without asking (§10) |
| Export as .apb / JSON | Removed; `.parliament` only | One format, versioned (§11) |
| Theme: light / dark | Removed | Dark mode is deferred; a dead option is worse than none |
| "Only api.anthropic.com should appear" | Every host named by who called it | No longer true with Mistral, Ollama and sources |

---

## 2. The surface

**Stacked, with a rail.** One card holds every section in order. The left rail
is an index in the shape of the Almanac's saved-searches rail: section name,
italic description, and the section's alias. It follows the scroll and sticks
while the card moves under it.

**Every section has an alias**, shown beside its title the way ids are shown:
mono, `--p-ink-3`, no fill, never changes colour. It is what you type after
`open:settings`. Sections are registered in `PANELS` with their aliases, so a
section is not finished until it is registered (Almanac spec §9).

| Section | Alias | Also answers to |
|---|---|---|
| API keys | `keys` | key, api, models, model, providers |
| Spending | `spending` | spend, cost, budget, usage |
| Context and defaults | `context` | defaults, default |
| Data and backups | `data` | backup, backups, storage |
| Appearance | `appearance` | look, text, desks |
| About and security | `about` | security, network, privacy |

**Search finds settings, and only that.** Typing narrows the card to matching
rows, hides sections with none, dims their rail entries, and the hint line
says how many match. A word that names a section shows the whole section.
Escape clears. Search never interprets.

---

## 3. The navy rule follows the section

On Settings the addressed thing is a section, not the page. The navy rule
therefore sits on the card's left edge beside the section you are in and
slides to the next one as you scroll. It also moves when `open:settings
<section>` lands, and when `set:` changes something in another section, so
the rule always shows where the last thing happened.

- It **replaces** the page-edge rule on this surface. Two navy lines on one
  screen would ask which one means "addressed".
- It lives inside the card, so it **travels with the card** when Settings is
  popped. The page it left has no rule.
- The current section is the last one whose top has passed about a third of
  the way down the viewport; at the foot of the page, the last section wins,
  since short final sections never reach the top.
- The slide is 320 ms and stops under `prefers-reduced-motion`.

**This generalises.** Any surface whose content is long and sectioned can move
its rule to the section, provided the section is what commands act on. The
Almanac's table is not sectioned and keeps the page rule.

---

## 4. Visual rules on this surface

- **Gold is the live action and nothing else**: keyboard focus, an engaged key
  field, marginalia under the pointer, the active rail entry (as in the
  Almanac). Everything that used to be gold is ink.
- **Selection is the table's ink wash** (`--ink-wash`), on model rows and
  radio rows alike. Segmented controls show the chosen option on a white face
  with a hairline, not a fill.
- **Help text is plain sans in `--p-ink-2`.** Italic serif means marginalia,
  and marginalia is always clickable. Rail descriptions stay italic because
  each sits inside a button.
- **Pills are never interactive; marginalia always is** (docket spec §8). Every
  italic line on Settings does something: "get a key at console.mistral.ai",
  "api:mistral opens this from anywhere", "add a key to use it".
- **Secondary buttons carry the structural dotted border**, like the field.
- **Red appears once**, on Delete everything. It is the one action in the
  product that undo cannot reach, and it is the one place the palette spends
  a hue it otherwise does not have.

---

## 5. The command line on Settings

Same grammar as everywhere: leaders at position 0, the Enter line says what
Enter will do before you press it, a scheme never changes kind.

| Verb | Example | Does |
|---|---|---|
| `open:` | `open:settings spending` | Scroll to and address a section. `open:<id>` leaves Settings |
| `pop:` | `pop:settings keys` · `pop:back` | Settings in its own window, at a section; back again |
| `set:` | `set:default haiku` | Change a setting; the Enter line states the change in full |
| `api:` | `api:` · `api:mistral` · `api:new` | The key panel (§6) |
| `undo:` | | Put back the last change, including bar moves |
| `backup:` · `restore:` | | Download a `.parliament` file; pick one to restore |
| `bar:` | `bar:left` · `bar:pop` | Where the command line sits (§7) |
| `alm:` `sym:` `lab:` | | Leave for another surface |
| `?` / `help:` | | Every command, grouped: Settings, Go to, Data, Layout |

**`set:` names**, each with its own parser and its own sentence for the Enter
line: `default`, `budget`, `warn`, `summary`, `threshold`, `compress`, `room`,
`reminder`, `text`, `keys`. The Enter line is generated from the parser, never
written beside it, so it cannot drift. Refusals explain themselves:
`set:default mistral` says Mistral Large needs a Mistral key first;
`set:compress auto` says automatic is gone and why.

**Prompt mode** hands a question to the Symposium. Nothing from Settings
travels with it.

**The hint line advertises the key that works where focus is.** Outside a
field: "press / or ⌘K". Inside a key field: "press ⌘K" only, because `/` is a
character there. ⌘K fires from inside fields.

**`undo:` covers** every `set:`, every click on the page, key saves and
removals, forgetting a desk, and bar moves. It does not reach Delete
everything, which is not a command at all.

**`open:settings` is the one place `open:` takes a named place** rather than
an address (Almanac spec §3). Kept deliberately; see §14.

---

## 6. Keys: `api:`

**No keys in the command line, for security.** The line keeps a history in
browser storage, so a key typed there would be kept too. A voice command,
when it comes, would speak it aloud. Keys go into password fields and only
there.

**`api:` is the fast path to those fields, from any surface.** It opens a
panel under the field, in the same position and style as the `?` reference,
listing each provider with its status: key ends `4f2a` · replace, needs a key
· add one, no key which is fine (OpenAlex), no key · found on your machine
(Ollama). It closes on Escape, which returns focus to the command line, or
when the line is turned to any other command.

| Form | Enter line | Result |
|---|---|---|
| `api:` | Enter lists your providers and their keys | Panel opens |
| `api:mistral` | Enter opens the Mistral key field; no keys in the command line, for security | Panel opens with Mistral's field focused |
| `api:anthropic` *(key saved)* | Anthropic has a key ending 4f2a; Enter opens it for replacing; … | Field opens for a replacement |
| `api:new` | Enter opens the Mistral key field, the first without a key; … | First keyless provider, named before Enter |
| `api:mistral sk-…` | *refused*: no keys in the command line, for security; delete it, and Enter opens the field | Nothing |

**Why a panel, not a window and not a trip to Settings.** Adding or checking a
key is a ten-second errand, taken in the middle of something else. A window
is too heavy; leaving the surface loses your place. The panel is a peek.

**Why `api:` and not `add:key`.** In the Almanac, `add:` puts ids into the
collection at once. `add:key` only moved focus to a field. Same word, two
kinds of act, which the scheme rule forbids. `api:` is its own verb, short to
say, and names what you are after.

**Why a provider name wins over `new`.** A key always belongs to a provider,
so `api:mistral` is the precise form. `api:new` is kept for when you don't
care which; it resolves to the first provider without a key and says so.

**Defences, in the implementation:**
- A line with anything after the provider is refused before Enter.
- History never stores a line containing `sk-` or a run of 28+ key-like
  characters, whatever the verb.
- `set:key` is refused and points at `api:`.

On Settings itself, each key field carries marginalia reading "api:mistral
opens this from anywhere", which puts that command in the field when clicked.

---

## 7. Where the command line sits

`bar:` works as the Almanac spec §4 describes, now built.

| Form | Result |
|---|---|
| `bar:top` | A line above the card. The default |
| `bar:bottom` | A line fixed under the card, hint line above the field |
| `bar:left` · `bar:right` | A square in its own column, reserving three lines for the Enter line |
| `bar:pop` | Its own window, keeping the shape it had |
| `bar:dock` | Back to its position on the page |

- **Positions and states are separate axes.** Any position implies dock: a
  popped bar given `bar:left` docks first, then moves.
- **Left and right make the field a square**, because a line of text pinned to
  a vertical edge is either rotated and unusable or a narrow column pretending
  otherwise. The square reserves three lines so wrapping never moves the page.
- **The popped command line is a panel, not a surface.** It does not wear the
  navy rule; its commands still act on Settings; the Enter line names the
  target at its head (`settings`, or `settings, popped`). This follows Almanac
  spec §7 over the docket mockup, which drew the rule on a popped bar.
- **Settings and the command line pop independently.** Both can be out at once.
- The position is kept per device and restored by `undo:`.

---

## 8. API keys

One section holds the providers, their keys, the models each key unlocks, and
the default for new chats.

**Grouped by provider**: Anthropic, Mistral, Ollama, Sources. Within each
group, rows run most expensive first.

| Provider | Models and marks | Key |
|---|---|---|
| Anthropic | Claude Fable 5.1 `×?` · Opus 5.5 `×15` · Sonnet 5 `×3` · Haiku 4.5 `×1` | Required |
| Mistral | Mistral Large `×?` · Mistral Small `×?` | Required |
| Ollama | Llama 3.1 8B `free` | None. Needs `OLLAMA_ORIGINS` set to the page's address |
| Sources | Wikipedia, arXiv, Europe PMC, Hacker News, Open Library, Openverse, Wikidata, OpenAlex, News *(not yet)* | None; OpenAlex takes an optional key for a higher rate limit |

- **Sources carry no mark column**, because they are not models. The group's
  marginalia says it once: "no key needed; Auto uses these for lookups; 0
  tokens". Sources are listed read-only; their roles (responder, material,
  trigger) are not configurable yet.
- **Auto is the default**, at the top, above the groups. Its marginalia says
  what it does: lookups go to a source at 0 tokens, everything else to a
  named model. That model is a picker, so it grows a caret on card hover.
- **The default is chosen from the model rows.** Picking a row makes it the
  default for new chats; its marginalia says so.
- **A provider without a key** shows its models in `--p-ink-3`, unpickable,
  with "add a key to use it", which opens the field. Removing a key that the
  default depends on puts the default back to Auto.
- **A saved key** shows as dots and its last four characters, with Check,
  Replace and Remove. Replace opens an empty field and a way to keep the old
  one; Escape also keeps it.
- **Keeping keys** is one setting for all providers: remember in this browser,
  or enter them each visit. Keys are encrypted with Web Crypto (AES-GCM,
  non-extractable) and sent only to their own provider.
- **Marks compare cost per token against Haiku.** The lede says so, once.

---

## 9. Spending

**Marks where you are choosing; dollars where you are billed.** Settings'
spending section is the bill, so it is in dollars.

- **This month**: one sentence of spend, runs and chats, then the four
  costliest recent runs, each as id, title, run, cost. A row opens that run.
  The session figures are gone; cost belongs to the run.
- **Warn before a costly run** (new): Off, $0.50, $1, $5. Above this amount,
  the Enter line leads with the cost before a `run:`. The Enter line is the
  only guard on execution (Almanac spec §5.1), so this is where a budget
  actually bites.
- **Monthly budget alert**: a switch and an amount. Informational. It warns;
  it does not stop anything.
- **Hard limits** live with each provider's console. Settings links to them
  rather than pretending to enforce one.

---

## 10. Context and defaults

- **Summary depth**: brief or detailed.
- **Context warning**: 10–95 %, steps of 5.
- **When a chat passes it**: Ask me first, or Disabled. **Automatic is gone.**
  Compressing makes a branch, and a branch is written into the chat's docket,
  or creates a docket if the chat has none (docket spec §3). Doing that
  unasked breaks the rule that model-produced actions land as planned nodes
  and never run.
- **Room for new dockets** (new): room belongs to the branch, so a new
  docket's first branch needs one to start in.

---

## 11. Data and backups

- **Backup and restore**: one `.parliament` file holding rooms, chats,
  dockets, the library and every marking. `.apb` and JSON export are gone.
- **The format version is shown**: "Backups are format 1. Any older backup
  restores; one from a newer Parliament asks you to update first." That line
  is a promise, and does not ship until these hold:
  1. **A file with no version field is format 1.** Every backup written so
     far has none and must be read, not rejected.
  2. **A file from a newer format is refused with a message**, never
     half-read. Silently dropping unknown fields loses data without warning.
  3. **Migrations are kept forever**, each tested against a fixture file of
     its format.
- **Backup reminder**: daily, weekly, monthly, never, counted from the last
  backup. The last backup date is shown.
- **Storage**: a meter and plain counts.
- **Delete everything**: red, explained, and armed only after typing the word
  `delete`. Not a command.

---

## 12. Appearance

- **Text size**: compact, default, large, with a preview.
- **Desks on this device** (new): desks are made with `arrange:save`, kept per
  device, and not in backups, so without this list they would be invisible.
  Each can be forgotten, and `undo:` brings it back.
- **No theme choice** until dark mode exists.

---

## 13. About and security

- **Privacy copy rewritten.** Requests go from the browser straight to the
  providers and sources you use, and nowhere else. No servers, no accounts.
- **The network log is grouped by host**, each named by who called it:
  `api.anthropic.com` Anthropic, `localhost:11434` Ollama, `en.wikipedia.org`
  Wikipedia. The instruction is now "every host should be a provider or source
  you use; if one is not, something is wrong".

---

## 14. Divergences from the specs, deliberate

1. **Grouped by provider.** Almanac spec §8 says the answered-by picker is one
   flat list with no groups. That rule stands for the picker. Settings groups
   by provider because this is where keys live, and a key belongs to a
   provider, not a model.
2. **`open:settings`.** Almanac spec §3 says `open:` takes addressable things.
   Settings is a place. Kept as the one named place `open:` accepts; `pop:`
   already takes both classes.
3. **The rule on a section, not the page** (§3).

---

## 15. Changes required elsewhere

**Verb table (all surfaces).**
- Add `api:`, `api:<provider>`, `api:new`. The key panel belongs to the bar,
  not to Settings, so it must work from the Almanac, the docket and the
  Symposium.
- Add `open:settings <section>` and `pop:settings <section>`.
- Generate the `set:` names into the docs from the `SETTERS` registry, the
  same way docket spec §6 generates the verb docs.

**Command history.** The key-shaped-line filter (§6) belongs in the shared
history code, not in Settings.

**Almanac spec §7.** Record that a sectioned surface may move the rule to the
section (§3), and that a popped command line does not wear it (§7). The
docket mockup's popped bar should lose its rule.

**Almanac spec §8.** Update the model names to Opus 5.5, Sonnet 5, Haiku 4.5
and Fable 5.1, and add the marks still owed.

**`run:` Enter line.** Needs to read the warn threshold from Settings and lead
with the cost when a run exceeds it.

**The inventory (Almanac spec §13).** Add Settings, the key panel and `bar:`
with their states.

---

## 16. Still open

1. **Cost marks** for Fable 5.1, Mistral Large and Mistral Small. Shown as
   `×?`.
2. **`new:api`** as an alias for `api:new`, for people who reach for `new:`
   when making things. Cheap, but it puts a non-thing in `new:`'s noun list.
3. **Consent grants from `invoke:`** (V2). Settings is the obvious place to
   list and revoke them.
4. **Source roles.** Not configurable until manifests are live.
5. **Does the section rule suit the docket?** A docket is sectioned by branch.
   If commands there act on a branch, the rule could follow the branch the
   same way. Worth trying once a docket runs long.
