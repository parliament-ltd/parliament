# Components and arrangements: decisions

Session summary, September 28, 2026. Follows the refactor strategy chat (Sep 26), which left open whether the Almanac, Docket and Symposium are rooms, components or shell surfaces.

Status marks: **Decided** (you ruled on it), **Proposed** (suggested, not yet confirmed), **Open**, **Deferred**.

---

## 1. The model

**Decided.** The Almanac, Docket and Symposium are **components**, not surfaces. What were called pages are **arrangements**: predetermined combinations of components. Users edit these components in the Lab like any other component, and can edit arrangements too.

**Decided.** The current pages are not rooms. The Almanac must be addable to any arrangement the user chooses, so it can't be tied to one room.

**Decided.** A **room** is a special type of component that holds components. An arrangement is the whole screen. A room is a portable bundle placed inside an arrangement.

This puts the three surfaces inside the V2 room/layout/component model the refactor docs already describe, so there is one system instead of two.

### Proposed rules for rooms

- **One level deep.** Rooms go inside arrangements, never inside other rooms.
- **Exactly one Symposium per room.** A room is "a conversation and what belongs to it." A conversation belongs to the room around its Symposium, which keeps `room:` meaningful in the command bar and marginalia.
- **Scope follows the boundary.** A room's scheme applies inside its edges only. A room declares the capabilities its children need, and consent prompts name the room.
- **Editing enters the room.** In the builder, a room selects as one block. Double-click or `edit:` on it exposes its internal slots, like groups in a drawing tool.

---

## 2. Placement

**Decided.** Some components can't go in rooms. Placement comes from what a component reads:

| Placement | Reads | Examples |
|---|---|---|
| Arrangement-only | Across all records | Almanac, Settings |
| Room-only | One conversation; needs a Symposium beside it | Contents, highlights, branch view |
| Either | Works alone, or scopes to a conversation | Notes, source panel |

**Proposed.** Placement becomes a field on each catalog entry, alongside "which slots it fits in." While dragging, the builder greys out targets a component can't enter and gives a one-line reason.

### The docket

**Proposed: either.** A docket is a plan whose runs produce many chats, and it can exist before any chat does.

- Room-only would force a room open to plan before chatting or to watch a run from elsewhere.
- Arrangement-only would lose the link where a fork's new branch appears beside the conversation.
- **Either:** inside a room it follows that room's conversation. In an arrangement it shows whichever docket you address.

Cost: one component, two data sources. It must say which it's in, with a marginalia line such as "following this chat" or "201". A pin may be needed to hold a room's docket still while viewing other chats.

---

## 3. Customization

**Decided.** Customization is part of Parliament's purpose: rethinking the relationship with AI and how people interact with it. It is never required.

- Ship **sample sets of everything**, so nobody has to customize.
- Arrangements can be **saved**.
- `reset:` returns any shipped arrangement (the Almanac's, for example) to its suggested default.

### Proposed floors

- The command line stays part of the shell, not a component, so `lab:` always works.
- The Lab can't edit its own arrangement.
- At least one arrangement must contain a Symposium.
- Config is editable; invariants aren't. Users can change the Almanac's columns or the docket's marginalia density. They can't change runs being immutable, selection surviving a change of search, or collections holding pointers.

### Proposed: execution becomes a capability

"Only the Symposium executes" was a surface rule. It becomes a declared `execute` capability. Symposium and Docket declare it; the Almanac doesn't unless deliberately given it.

---

## 4. Tradeoffs reviewed

| Risk | Response |
|---|---|
| Testing multiplies across placements and schemes | Accepted; placement rules limit the combinations |
| Contracts harden once users save arrangements | Arrangement versioning and migration needed |
| Loss of design control | `reset:`, saved arrangements, sample sets |
| Most users never customize | Sample sets; customization offered, not required |
| Commands need a general answer for "which component is addressed?" | Open; the navy rule was designed for known screens |
| Building the platform before the product | Not applicable; this is a refactor of a live system |
| Mobile | **Deferred** |

---

## 5. Performance

Composability itself costs little. A slot is a container, and one level of nesting is negligible. The risk is several live components updating more than they need to.

- **Streaming:** tokens in a Symposium must not re-render neighbours. Each component subscribes only to the data it shows.
- **Running docket timer:** its own narrow update path.
- **Broadcast repaints:** replace `paintAll()` with repainting only what changed. Arbitrary arrangements make the broadcast pattern worse.
- **Large Almanacs:** a few thousand chats is fine. Tens of thousands need row virtualization and IndexedDB indexes for search.
- **Lazy loading:** code for components not in the current arrangement loads only when placed.

These are cheap if they're in the component contract from the start and expensive to retrofit. The Claude Code refactor prompt should state that components subscribe to slices of state and updates stay local.

---

## 6. Open

1. **Docket placement:** confirm "either," and whether a pin is needed.
2. **Naming shipped arrangements.** If the default arrangement is called "Almanac," `alm:` is ambiguous. Either the verbs go to wherever the component lives (focus it here if present, otherwise open its default arrangement), or shipped arrangements get their own names.
3. **Can a room hold "either" components** such as notes, and does that blur rooms and arrangements?
4. **Command addressing** when arbitrary components share a screen.

## 7. Deferred

- Folding window arrangements (`arrange:`) into arrangements, with an arrangement allowed to span windows.
- Mobile behaviour of arbitrary arrangements.

## 8. Changes required elsewhere

- **Claude Code prompt:** the room builder was listed as out of scope. The data model phase still needs to treat the Almanac, Docket and Symposium as components before the change plan is written, and needs the performance rules in §5.
- **Almanac spec §1 and refactor docs:** "the room is a lens, not a fourth surface" is superseded. Rooms now sit inside arrangements.
- **Component catalog:** add a placement field and capability declarations for the three new components.
