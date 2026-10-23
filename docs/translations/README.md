# Translations for review

First drafts of every word in the copy table, in Japanese (`ja`), Simplified
Chinese (`zh-Hans`), Swedish (`sv`) and Finnish (`fi`), drafted by Claude on
23 October 2026 for Stefan to read (C87, C184). None of them ships yet: they
are offered in development only, marked "draft", and the production build
leaves them out.

## What is here

For each language:

- `<tag>-glossary.md`: the terms the drafter settled on (English to the
  language), with a reason where the choice was hard. Read this first: a
  changed term changes many lines.
- `<tag>-doubts.md`: the lines the drafter was unsure of, with why.

The words themselves are in `src/locales/<tag>/messages.po` (each `msgid` is
an id from `src/copy.js`, each `msgstr` the draft).

## How to read them in place

1. `npm run dev`, open the page.
2. Type `>language:sv` (or `ja`, `zh-Hans`, `fi`, or the language's own name),
   or click the globe at the top of the welcome page or in Settings.
3. `>language:browser` goes back.

## How a draft was checked

A script compared every line with the English: the same placeholders, the
same plural and select cases, every command kept as typed (commands stay
English in every language), and no dashes. Every draft passes. The script
cannot judge the language itself; that is the review.

## Settled since drafting

- **The word typed to arm a replace** now has its own entry
  (`backup.replaceWord`), as Delete everything's has (`erase.word`): the
  drafters kept "replace" in English because the code compared against the
  English word. It is now ersätt, korvaa and 替换; Japanese keeps
  `replace` and `delete`, as its drafter chose (typing them needs no input
  method).
- **Example words inside commands** are translated in all four (ruled 23
  October): the verbs and the command's form stay English, the quoted words
  are the person's own text (`name:"Tornugglor"`).
- **Commands the checker flagged as missing** (14 per language) are English
  prose that happens to put a verb before a colon ("instructions to a model:
  …"); none is a command.

## Open across languages

- **Sentences joined on screen from two entries** (the key page's link and
  the sentence after it, the sort labels) cannot be reordered by a
  translation. They should become one entry with a placeholder.
- **`compare:` on Japanese and Chinese:** it compares word by word, and these
  languages put no spaces between words.

## Shipping a language

Once read and corrected, move its tag from `DRAFT_LANGUAGES` to
`SHIPPED_LANGUAGES` in `src/i18n.js`. The first one shipped also turns on the
page's opt-out of the browser's own translation (C84).
