import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { SOURCE } from '../lib/words'

// The Dictionary board (C303 (b), ruled 16 November; parliament-dictionary-
// v1.html): a word, what it means by kind, and beside it the words that mean
// the same and its opposites. Two halves, side by side when wide, as tabs
// when narrow; dictionary: opens the first, thesaurus: the second. Its words
// come from lists shipped with Parliament, looked up beside the page;
// nothing is sent.
//
// look: { word, half, result: { found, near, missing } | null, from: a
// selection's place or null }. A word clicked takes the selection's place,
// as an edit, when the look-up came from one; otherwise it is looked up.

const KIND = { noun: COPY.dictionary.noun, verb: COPY.dictionary.verb, adjective: COPY.dictionary.adjective, adverb: COPY.dictionary.adverb }

export default function DictionaryBoard({ look = null, addressed, onAddress, onLook, onHalf, onReplace }) {
  const { i18n } = useLingui()
  const half = look?.half ?? 'meanings'
  const r = look?.result ?? null
  const found = r?.found ?? null
  const replacing = Boolean(look?.from)
  const word = (w) => (
    <button key={w} type="button" className="ch-dc-w" dir="auto"
      title={i18n._(replacing ? COPY.dictionary.putHelp : COPY.dictionary.lookHelp, { word: w, was: look?.from?.word ?? '' })}
      onClick={() => (replacing ? onReplace(w) : onLook(w, half))}>{w}</button>
  )
  return (
    <article className={`ch-card ch-dict${addressed ? ' addressed' : ''}`} aria-current={addressed ? 'true' : undefined} onMouseDown={() => onAddress('dictionary')} data-half={half}>
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.dictionary)}</h2>
        <span className="ch-dc-tabs" role="tablist">
          {[['meanings', COPY.dictionary.meanings], ['same', COPY.dictionary.same]].map(([h, words]) => (
            <button key={h} type="button" role="tab" aria-selected={half === h ? 'true' : 'false'} className={half === h ? 'on' : undefined} onClick={() => onHalf(h)}>{i18n._(words)}</button>
          ))}
        </span>
      </header>
      <div className="ch-cbody">
        {!look && (
          <div className="ch-pl-none">
            <p>{i18n._(COPY.dictionary.none)}</p>
            <p className="ch-marg">{i18n._(COPY.dictionary.noneHow)}</p>
          </div>
        )}
        {look && !r && <p className="ch-marg">{i18n._(COPY.dictionary.looking, { word: look.word })}</p>}
        {r?.missing && <p className="ch-marg">{i18n._(COPY.dictionary.missing)}</p>}
        {r && !r.missing && !found && (
          <div className="ch-pl-none">
            <p>{i18n._(COPY.dictionary.notFound, { word: r.word || look.word })}</p>
            {r.near?.length > 0 && <p className="ch-marg">{i18n._(COPY.dictionary.didYouMean)} {r.near.map((w) => <button key={w} type="button" className="ch-dc-w" onClick={() => onLook(w, half)}>{w}</button>)}</p>}
          </div>
        )}
        {found && (
          <>
            <p className="ch-dc-word" dir="auto">{found.word}</p>
            {replacing && <p className="ch-marg ch-dc-from">{i18n._(COPY.dictionary.fromText, { word: look.from.word })}</p>}
            <div className="ch-dc-grid">
              <div className="ch-dc-means">
                {found.groups.map((g) => (
                  <div key={g.kind}>
                    <p className="ch-dc-pos">{i18n._(KIND[g.kind] ?? KIND.noun)}</p>
                    <ol>
                      {g.meanings.map((m, i) => (
                        <li key={i} dir="auto">{m.definition}{m.example && <span className="ch-dc-eg">"{m.example}"</span>}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
              <div className="ch-dc-same">
                <p className="ch-dc-h">{i18n._(COPY.dictionary.same)}</p>
                {found.same.length ? <div className="ch-dc-ws">{found.same.map(word)}</div> : <p className="ch-marg">{i18n._(COPY.dictionary.noSame)}</p>}
                {found.opposite.length > 0 && (
                  <>
                    <p className="ch-dc-h">{i18n._(COPY.dictionary.opposite)}</p>
                    <div className="ch-dc-ws">{found.opposite.map(word)}</div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
        <p className="ch-marg ch-dc-src">{i18n._(COPY.dictionary.source, SOURCE)}</p>
      </div>
    </article>
  )
}
