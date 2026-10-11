# Welcome v9: inline editing, strike and note

Backup spec for `parliament_welcome_v9.html`. Dated 6 October 2026.
Extends `welcome-spec-decisions.md` (which still describes eight steps).
Where they disagree, this doc and the v9 header comment win.

---

## 1. Why

To set Parliament apart from the first minutes. In other AI tools the
conversation is a fixed log: Canvas, artifacts and inline editors change a
separate document beside the chat, never the chat itself. In Parliament the
conversation is working material you edit, strike, reply to and prompt from.
(Source: the 6 October chat comparing Odysseus, Parliament and Omarchy.)

The intro shows this by having people do it, right after adding a key.

---

## 2. Replies are editable by default

- **Every reply can be edited in place.** Click into it and type. No edit
  mode, no button.
- Hovering a reply shows a faint off-white wash (`--subtle`); focus adds a
  hairline ring. Enter leaves the reply.
- The first reply carries one line of marginalia: *click to edit; select a
  line to strike it*.
- Edits are stored with the message, so they survive re-rendering.

---

## 3. Two new steps

The first list now has ten steps. These follow the key step:

| # | Step | How | Crossed off when |
|---|------|-----|------------------|
| 9 | Strike through a line | select it, then strike (or ⌘⇧X) | a strike is made |
| 10 | Leave the AI a note | type beside it, then Note for the AI | a strike is noted |

Neither has a command; the hint line by the field says what to do instead
("select a line in a reply, then strike"). The ending ("Welcome / to
Parliament", then `focus:`) comes after step 10.

---

## 4. Striking

- Selecting text inside one reply shows a small floating button above it:
  **strike**, with the shortcut **⌘⇧X**.
- **The words stay in the reply, struck through** (ink-3 text, ink line),
  rather than being removed.
- Striking opens the **Collection** on the right, with a card for the strike:
  - a type label, **STRIKE**, and an id (from 214 up)
  - where it came from: *in 201 · reply 1*
  - the struck words, struck
  - a box labelled **Reply or replacement**
- **What is typed in the box appears in the reply as you type**, right after
  the strike, in ink with a dotted underline. A strike with an empty box shows
  nothing extra.

---

## 5. Note for the AI

This settles the question left open in the Odysseus chat: does the model see
an edit?

- **Edits are yours until noted.** Striking and replacing change what you
  see, not what the model reads.
- **Note for the AI** marks the card *noted*. The strike and your words go to
  the model with the next prompt, once. *take it back* un-notes it.
- The card head says: *yours until you note it for the AI*.
- **The prompt line counts what will go:** "1 note for the AI goes with this".
- **A keyless source reads no notes.** With Wikipedia as the source, the line
  says "1 note waiting; Wikipedia reads none", and the note waits for the next
  prompt to a model. The card and the toast say the same.
- A model's next reply acknowledges having read the note (placeholder text in
  the mockup).

---

## 6. The placeholder reply

So there is something worth striking, the Wikipedia placeholder has three
sentences: the summary line, a stand-in for the opening sentence, and one
standing in for "a detail you might not agree with". The last one invites the
strike. In the product this is the real article summary.

---

## 7. Open

1. **Struck words and the model's memory.** A noted strike tells the model
   what changed. Should an un-noted edit also change what the model reads, so
   a deleted wrong assumption is truly gone? Today: no, only noted edits reach
   it.
2. **Is the original kept?** The struck words stay visible; a plain inline
   edit overwrites. Version history for edited replies is not designed yet.
3. **Comments versus notes.** "Note for the AI" is a note the model reads. A
   note to yourself (Collection Board v3's `note:`) is not sent. The two need
   distinct names wherever both appear.
4. **A verb.** Striking has a button and a shortcut but no command. Something
   like `strike:` may be needed for the command line to stay complete.
5. **Prompting from a spot.** Replying from inside a reply (where the answer
   lands: in place, at the bottom, or as a branch) is still undecided.
6. **Update `welcome-spec-decisions.md`** to ten steps and this behaviour.
