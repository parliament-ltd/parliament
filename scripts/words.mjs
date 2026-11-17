// node scripts/words.mjs <folder> (C303 (b), ruled 16 November: "good with
// lean"): the Dictionary board's word lists, from Open English WordNet's
// JSON release (english-wordnet-2025-json.zip, unpacked into <folder>),
// written to public/words/en/ in small pieces, one per first two letters, each
// fetched from Parliament's own address only when a word in it is looked up.
//
// Each piece maps a word, in lower case, to what the board shows of it:
//   m  its meanings, at most MEANINGS: [kind, definition, example?], the
//      kind n (noun), v (verb), a (adjective) or r (adverb)
//   s  words that mean the same, at most SAME
//   o  its opposites, at most OPPOSITES
//   w  the word as written, where that is not its lower case ("Paris")
// Shortened from the release, as its licence (CC BY 4.0) allows with credit.
// Its notice, which must go with every copy, is written beside the pieces as
// LICENSE.txt (NOTICE below), so it ships with the site and the release.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { shardOf, splitShardOf } from '../src/lib/words.js'

const MEANINGS = 6
const EXAMPLES = 3 // the first meanings that keep an example
const SAME = 16
const OPPOSITES = 6
// A piece larger than this is split by the first three letters.
const PIECE_MOST = 120_000
const EDITION = '2025'

// The notice that goes with the word lists. The two licence texts are as
// Open English WordNet gives them (LICENSE.md and WNDB_License.txt in
// github.com/globalwordnet/english-wordnet), word for word.
const NOTICE = `Parliament's word lists, in this folder, are shortened from Open English
WordNet ${EDITION} (https://en-word.net/,
https://github.com/globalwordnet/english-wordnet).

Changed by Parliament: each word keeps at most ${MEANINGS} meanings, an example
for the first ${EXAMPLES}, ${SAME} words that mean the same and ${OPPOSITES} opposites, and
the lists are split into small files by their first letters. Made by
scripts/words.mjs in Parliament's repository.

This resource is derived from Princeton WordNet under the WordNet License and
further developed under the Creative Commons Attribution 4.0 International
License. You may share and adapt this resource providing attribution is given
to both Princeton WordNet and the Open English Wordnet team.

=======================================================================

Open English WordNet License

Copyright (c) 2019-present, The Open English WordNet Team.

This work is licensed under a Creative Commons Attribution 4.0
International License. To view a copy of this license, visit

http://creativecommons.org/licenses/by/4.0/

=======================================================================

WordNet License

This software and database is being provided to you, the LICENSEE, by
the Open English Wordnet team under the Creative Commons Attribution 4.0
International License (CC-BY 4.0).

Open English Wordnet 2023 Copyright 2023 by the Open English Wordnet team.

Permission to use, copy, modify and distribute this software and
database and its documentation for any purpose and without fee or
royalty is hereby granted, provided that you agree to comply with
the following copyright notice and statements, including the disclaimer,
and that the same appear on ALL copies of the software, database and
documentation, including modifications that you make for internal
use or for distribution.

WordNet 3.1 Copyright 2011 by Princeton University.  All rights reserved.

THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON
UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PRINCETON
UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF MERCHANT-
ABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE
OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT
INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR
OTHER RIGHTS.

The name of Princeton University or Princeton may not be used in
advertising or publicity pertaining to distribution of the software
and/or database.  Title to copyright in this software, database and
any associated documentation shall at all times remain with
Princeton University and LICENSEE agrees to preserve same.
`

const from = process.argv[2]
if (!from) { console.error('node scripts/words.mjs <folder with the unpacked JSON release>'); process.exit(1) }
const files = readdirSync(from)
const read = (f) => JSON.parse(readFileSync(join(from, f), 'utf8'))

// Every synset, by its id.
const synsets = new Map()
for (const f of files.filter((n) => /^(noun|verb|adj|adv)\..+\.json$/.test(n))) {
  for (const [id, s] of Object.entries(read(f))) synsets.set(id, s)
}
// Every word's senses, and each synset's senses, for opposites.
const entries = new Map()
const bySynset = new Map()
for (const f of files.filter((n) => /^entries-.+\.json$/.test(n))) {
  for (const [lemma, byPos] of Object.entries(read(f))) {
    entries.set(lemma, byPos)
    for (const e of Object.values(byPos)) {
      for (const sense of e.sense ?? []) {
        if (!bySynset.has(sense.synset)) bySynset.set(sense.synset, [])
        bySynset.get(sense.synset).push(sense)
      }
    }
  }
}
const lemmaOfSense = (id) => String(id).split('%')[0].replace(/_/g, ' ')
const KIND = { n: 'n', v: 'v', a: 'a', s: 'a', r: 'r' }
const clean = (t) => String(t ?? '').replace(/\s+/g, ' ').trim()

const pieces = new Map()
for (const [lemma, byPos] of entries) {
  const key = lemma.toLowerCase()
  const m = []
  const same = []
  const opposite = []
  const add = (list, word, most) => {
    const w = clean(word)
    if (w && w.toLowerCase() !== key && !list.includes(w) && list.length < most) list.push(w)
  }
  for (const [pos, e] of Object.entries(byPos)) {
    for (const sense of e.sense ?? []) {
      const syn = synsets.get(sense.synset)
      if (!syn) continue
      if (m.length < MEANINGS) {
        const def = clean(syn.definition?.[0])
        const eg = clean(syn.example?.[0])
        if (def) m.push(eg && m.length < EXAMPLES ? [KIND[pos] ?? pos, def, eg] : [KIND[pos] ?? pos, def])
      }
      for (const w of syn.members ?? []) add(same, w, SAME)
      for (const a of sense.antonym ?? []) add(opposite, lemmaOfSense(a), OPPOSITES)
      // An adjective that leans on another (a satellite): the other's opposites.
      if (syn.partOfSpeech === 's') {
        for (const head of syn.similar ?? []) {
          for (const hs of bySynset.get(head) ?? []) for (const a of hs.antonym ?? []) add(opposite, lemmaOfSense(a), OPPOSITES)
        }
      }
    }
  }
  if (!m.length) continue
  // Adjectives also take the words of the meanings they lean on, after their own.
  for (const e of Object.values(byPos)) {
    for (const sense of e.sense ?? []) {
      for (const sim of synsets.get(sense.synset)?.similar ?? []) for (const w of synsets.get(sim)?.members ?? []) add(same, w, SAME)
    }
  }
  const entry = { m, ...(same.length ? { s: same } : {}), ...(opposite.length ? { o: opposite } : {}), ...(lemma !== key ? { w: lemma } : {}) }
  const shard = shardOf(key)
  if (!pieces.has(shard)) pieces.set(shard, Object.create(null))
  const piece = pieces.get(shard)
  // "Paris" and "paris": the lower case's own entry first.
  if (Object.hasOwn(piece, key)) piece[key] = { ...piece[key], m: [...piece[key].m, ...entry.m].slice(0, MEANINGS), s: [...new Set([...(piece[key].s ?? []), ...(entry.s ?? [])])].slice(0, SAME) }
  else piece[key] = entry
}

// Pieces too large for one look-up split again, by the first three letters.
for (const [name, piece] of [...pieces]) {
  if (Buffer.byteLength(JSON.stringify(piece)) <= PIECE_MOST) continue
  pieces.delete(name)
  for (const [word, entry] of Object.entries(piece)) {
    const sub = splitShardOf(word)
    if (!pieces.has(sub)) pieces.set(sub, Object.create(null))
    pieces.get(sub)[word] = entry
  }
}

const out = join('public', 'words', 'en')
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
let bytes = 0
const names = [...pieces.keys()].sort()
for (const name of names) {
  const body = JSON.stringify(pieces.get(name))
  bytes += Buffer.byteLength(body)
  // "p-" first: con, aux, prn and nul are names Windows keeps for itself.
  writeFileSync(join(out, `p-${name}.json`), body + '\n')
}
const index = { edition: EDITION, source: 'Open English WordNet', licence: 'CC BY 4.0', url: 'https://en-word.net/', pieces: names }
writeFileSync(join(out, 'index.json'), JSON.stringify(index) + '\n')
writeFileSync(join(out, 'LICENSE.txt'), NOTICE)
console.log(`${[...entries.keys()].length} words read, ${names.length} pieces written to ${out}, ${(bytes / 1e6).toFixed(1)} MB in all, the largest ${Math.max(...names.map((n) => Buffer.byteLength(JSON.stringify(pieces.get(n))))) / 1e3} kB`)
