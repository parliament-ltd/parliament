# Parliament: every command

Written from the command registry (`src/commands/verbs.js`) by `npm run reference`. Do not edit by hand: a test fails when this file and the registry differ.

Type a command in the bar after `>`. The line under the bar says what Enter will do before you press it. Commands stay in English in every language.

## The bar

| Type | What it does |
| --- | --- |
| `>` | Type a command. The > stays in the field |
| `p>`, `prompt>` | Write a prompt. Nothing is sent before Enter |
| `s>`, `search>` | Search |
| `?`, `help`, `?open` | Every command, or how one works |

## Go to

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `records:` | Bring Records and the Collection beside what is on screen | `records:` | everywhere | no |
| `plan:` | Bring the Plan board beside what is on screen | `plan:` | everywhere | no |
| `library:` | Bring the Library beside what is on screen, or one shelf of it | `library:`, `library:themes` | everywhere | no |
| `settings:` | Bring Settings beside what is on screen, or one section of it | `settings:`, `settings:data` | everywhere | no |
| `room:` | Bring the last room beside what is on screen, or a room by name | `room:` | everywhere | no |
| `jump:242` | Scroll to a number on this board | `jump:242` | everywhere | no |
| `tour:` | Show the welcome steps, put them away, or show the second list | `tour:`, `tour:off`, `tour:advanced` | everywhere | no |
| `letter:` | Read the newest letter from the maker of Parliament, one by its number, or the list of them | `letter:`, `letter:1`, `letter:all` | everywhere | no |

## Start

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `new:chat` | Make a chat, plan, room, collection, framework, branch, step, run or block | `new:chat`, `new:plan`, `new:plan "Grant application"`, `new:room`, `new:room guided`, `new:collection`, `new:framework "Editor" "Make each sentence shorter"`, `new:branch 207`, `new:branch 201a 2`, `new:branch "Shorter"`, `new:step`, `new:step 201b "Who built it?"`, `new:run`, `new:block` | everywhere | yes |
| `open:207` | Open a board, or anything by its number or name | `open:207`, `open:201a`, `open:201a summary`, `open:run 1`, `open:"Writing Studio"`, `open:library`, `open:records`, `open:settings keys` | everywhere | no |
| `close:records` | Take a board off the screen, or close the letter. Nothing is lost | `close:records`, `close:204`, `close:welcome` | everywhere | yes |

## Run

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `run:201b` | Run one branch. The Enter line says which run and what it costs Costs: the line names the model and the price first. | `run:201b` | Plan, Records | no |
| `stop:201b` | Halt a run, or every run in every window | `stop:`, `stop:201b`, `stop:all` | everywhere | no |
| `diff:` | Set two runs of a plan side by side, and mark what differs | `diff:`, `diff:1`, `diff:off` | Plan | no |
| `again:201a` | Ask again from the edited prompt, as a new branch Costs: the line names the model and the price first. | `again:201a` | everywhere | no |

## Filters

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `type:chat` | Show some kinds of thing | `type:chat`, `type:note,chat`, `type:edit` | Records, Collection | no |
| `tag:research` | Show what carries a tag. A minus leaves it out | `tag:research`, `-tag:research`, `tag:essay,research` | Records, Collection | no |
| `model:opus` | Show what a model or a source answered | `model:opus`, `model:wikipedia` | Records, Collection | no |
| `from:201b` | Show what came from a chat, a plan, a branch or a run | `from:203`, `from:201b`, `from:run 3` | Records, Collection | no |
| `in:"Q2 evidence"` | Show what is in a collection, or was made in a room | `in:"Q2 evidence"`, `in:"Code Lab"`, `in:"Code Lab" room` | Records, Collection | no |
| `has:keyword` | Show what holds notes, keywords, quotes or highlights | `has:note`, `has:keyword`, `has:quote`, `has:highlight` | Records, Collection | no |
| `cost:>0.50` | Show plans by what they cost | `cost:>0.50` | Records, Collection | no |
| `since:7d` | Show what was made since a date | `since:7d`, `since:3w`, `since:september`, `since:09/01/26` | Records, Collection | no |
| `until:09/10/26` | Show what was made until a date | `until:09/10/26` | Records, Collection | no |
| `sort:active` | Order the table | `sort:active`, `sort:oldest`, `sort:yours` | Records, Collection | no |
| `save:"Water tower"` | Keep this search under a name | `save:"Water tower"` | Records | yes |

## Collection

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `add:207, 216` | Put things into the collection, or blocks into a room | `add:207, 216`, `add:highlights, notes` | Records, Collection, Lab | yes |
| `rm:207` | Take things out of the collection, or blocks out of a room | `rm:207`, `rm:notes` | Records, Collection, Lab | yes |
| `clear:` | Empty the collection, remove every filter, or one kind of filter | `clear:`, `clear:filters`, `clear:tag`, `clear:search` | Records, Collection | yes |
| `compare:201a 201b` | Set two or more side by side. Nothing is sent | `compare:201a 201b`, `compare:201, 207` | Records, Collection, Library, Rooms | no |
| `name:"Q2 evidence"` | Name what the bar is pointed at: a room, a collection or a chat. With two names, rename a saved arrangement | `name:"Q2 evidence"`, `name:207 "New title"`, `name:"Review desk" "Two screens"` | everywhere | yes |
| `heading:"Sources"` | Add a heading to a collection in your own order | `heading:"Sources"`, `heading:"Sources" before 215` | Collection | yes |
| `summarize:207, 216` | Write a dated summary of some cards as a note. One model call Costs: the line names the model and the price first. | `summarize:207, 216` | Records, Collection | yes |
| `forget:"Surprised me"` | Remove a saved search, collection, framework of yours or arrangement | `forget:"Surprised me"`, `forget:"Q2" collection`, `forget:"Editor" framework`, `forget:"Review desk" arrangement` | everywhere | yes |

## Tags

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `tagadd:essay 207, 216` | Tag things, or what is selected | `tagadd:essay 207, 216` | Records, Collection | yes |
| `retag:essay to "Long form"` | Rename a tag everywhere | `retag:essay to "Long form"` | Records, Collection | yes |
| `untag:essay 207` | Remove a tag from some things, or from everything | `untag:essay 207` | Records, Collection | yes |

## Items

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `inspect:207` | Look at one thing in detail, where you are | `inspect:207`, `inspect:highlights` | everywhere | no |
| `pin:207` | Keep something at the top of its list | `pin:207`, `pin:201b`, `pin:"Rail candidates"` | everywhere | yes |
| `archive:209` | Put something away without deleting it | `archive:209`, `archive:off 209` | everywhere | yes |
| `copy:207` | Copy something as Markdown | `copy:207` | everywhere | no |
| `export:md 201` | Download as Markdown or JSONL to read elsewhere. It cannot be restored | `export:md 201`, `export:jsonl 207, 216`, `export:md records` | Records, Collection | no |
| `note:203 "Try it without the ending"` | Write a note for people. It is never sent | `note:203 "Try it without the ending"`, `note:"Check the dates"` | everywhere | yes |
| `delete:207` | Delete something by its number. What has been sent goes for good, after a second Enter Asks for a second Enter. | `delete:207`, `delete:207, 216`, `delete:201c`, `delete:201c all`, `delete:201a 2` | everywhere | no |
| `undo:` | Take back the last command, or one edit. It stops at a run | `undo:`, `undo:242` | everywhere | no |

## Editing

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `tell:"Keep it under a page"` | Write a note the model reads with your next prompt | `tell:"Keep it under a page"` | Rooms | yes |
| `ask:"Add the year it opened"` | Ask about the selected words in a reply, in your own words. It goes with your next prompt | `ask:`, `ask:"Add the year it opened"` | Rooms, Plan, Reflection, Collection | no |
| `strikethrough:` | Strike the selected words in a reply. Its number with undo: takes it back | `strikethrough:` | Rooms, Plan, Reflection, Collection | no |
| `to:201a` | Send the next prompt to one branch, or to all | `to:201a`, `to:201a, 201c`, `to:all` | everywhere | yes |
| `accept:244` | Accept a suggestion | `accept:244`, `accept:all` | Rooms, Plan, Reflection, Collection | yes |
| `reject:244` | Turn down a suggestion | `reject:244`, `reject:all` | Rooms, Plan, Reflection, Collection | yes |
| `hold:242` | Keep a branch or an edit from going until you say | `hold:242`, `hold:201c`, `hold:off 242` | Rooms, Plan, Reflection, Collection | yes |
| `markup:off` | Show replies marked up, or clean | `markup:on`, `markup:off` | Rooms, Plan, Reflection, Collection | yes |
| `by:haiku` | Choose who answers in this chat: a model, or a source with no tokens | `by:`, `by:haiku`, `by:mistral small`, `by:wikipedia` | everywhere | yes |
| `thinking:off` | Let models that can think do so before answering, shown as they go, or not | `thinking:`, `thinking:on`, `thinking:off` | everywhere | yes |
| `framework:pushback` | Choose the frameworks that shape every reply: standing instructions sent with each prompt | `framework:pushback`, `framework:pushback, uncertain`, `framework:off` | everywhere | yes |
| `helper:haiku` | Choose the model that reads text from sources, and translates it | `helper:`, `helper:haiku`, `helper:off` | everywhere | yes |
| `reply:swedish` | Choose the language replies come in, by its code or its name | `reply:`, `reply:sv`, `reply:swedish`, `reply:svenska`, `reply:off` | everywhere | yes |
| `privacy:on` | Swap email addresses, phone numbers, and bank and card numbers for placeholders before a prompt goes, names too, or not | `privacy:`, `privacy:on`, `privacy:names`, `privacy:off` | everywhere | yes |
| `check:` | Check the last answer from a source for words that try to instruct a model | `check:` | everywhere | no |
| `web:` | Let the model search the web for your next prompt only | `web:`, `web:off` | everywhere | no |
| `attach:` | Attach files to your next prompt | `attach:` | everywhere | no |
| `include:201b` | Bring an answer from a source into your next prompt, sent as material marked as data | `include:`, `include:201b`, `include:201b, 201c`, `include:off` | everywhere | no |
| `translate:` | Translate the last answer from a source into your language. On or off: translate what you ask sources that read only English Costs: the line names the model and the price first. | `translate:`, `translate:on`, `translate:off` | everywhere | no |
| `ripple:on` | Carry edits across branches as suggestions. Each check is a model call Costs: the line names the model and the price first. | `ripple:on`, `ripple:off` | Rooms | yes |
| `sweep:201a editor` | Check a reply or branch against a framework's rule, one suggestion per sentence Costs: the line names the model and the price first. | `sweep:201a editor` | Rooms, Reflection | no |
| `reflect:` | Ask for a synthesis of a chat and its markings, with questions Costs: the line names the model and the price first. | `reflect:` | Reflection | no |

## Layout

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `bar:bottom` | Move the bar on the page | `bar:top`, `bar:bottom`, `bar:left`, `bar:center`, `bar:right` | everywhere | yes |
| `pop:records` | Put a board or the bar in its own window, place it, or bring it back | `pop:records`, `pop:201b`, `pop:settings keys`, `pop:library display 2`, `pop:command`, `pop:back`, `pop:back library`, `pop:left` | everywhere | yes |
| `move:library left` | Move a board to the left, right or middle, or a branch in its plan | `move:library left`, `move:201c after 201a` | everywhere | yes |
| `swap:records collection` | Swap two boards | `swap:records collection` | everywhere | yes |
| `reset:` | Put the boards back as shipped and close the windows | `reset:` | everywhere | yes |
| `width:60%` | Choose how much of the width a board takes, or put every width back | `width:60%`, `width:library 30%`, `width:204 40%`, `width:even` | everywhere | yes |
| `cols:-room +created` | Hide or show columns of the table | `cols:-room +created`, `cols:` | Records | yes |
| `focus:` | Clear the screen to your chosen boards, keep that set, or come back | `focus:`, `focus:sym col`, `focus:save`, `focus:off` | everywhere | yes |
| `calm:` | Show less detail until you come near it, or all of it again | `calm:`, `calm:off` | everywhere | yes |
| `arrange:"Review desk"` | Switch to or save a whole arrangement, windows included | `arrange:`, `arrange:"Review desk"`, `arrange:save "Review desk"`, `arrange:"Review desk" 207` | everywhere | yes |

## Building rooms

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `set:notes order oldest` | Change a setting of a block or of Parliament. The Enter line states the change in full | `set:notes order oldest`, `set:contents most 50`, `set:input web on`, `set:default haiku` | Lab, Rooms, Settings | yes |

## Settings and data

| Command | What it does | Forms | Works on | `undo:` |
| --- | --- | --- | --- | --- |
| `api:` | Add or replace a key, in its own field. Never type a key here | `api:`, `api:mistral`, `api:new` | everywhere | no |
| `backup:` | Download a backup of everything but your keys | `backup:` | everywhere | no |
| `restore:` | Bring a backup back | `restore:` | everywhere | no |
| `import:` | Open a file made elsewhere. It says what the file is before anything happens | `import:` | everywhere | no |
| `language:ja` | Change the language, by its code or its name | `language:`, `language:ja`, `language:japanese`, `language:日本語`, `language:browser` | everywhere | yes |

## Named, not built yet

The bar knows these words and says they come later.

- `resources:`: Open the guides and references, with every command in full
- `rewrite:234`: Write a new dated summary beside the old one

## In a later release

The Lab, where rooms are built, comes in a later release with its commands. The bar knows these words and says so.

- `lab:`: Go to the Lab, where rooms are built
- `duplicate:"Writing studio"`: Copy a room, yours or a template, and open the copy in the Lab
- `edit:"Reading room"`: Open a room in the Lab to change it
- `done:`: Leave the Lab with your changes
- `place:notes right`: Put a block in a slot of the room, or move it
- `layout:"Three-panel"`: Choose the shape of a room
- `theme:"Deep Calm"`: Choose a room's colours and type
- `device:desktop`: Say what the room is built for
- `local:on`: Say whether a room sends only to models on this computer
