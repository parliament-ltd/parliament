import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { preview, promptPreview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped } from '../shell/arrangement'
import { messages as en } from '../locales/en/messages.mjs'
import { nameOf } from './languages'

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
const nameIn = (tag) => nameOf(tag, 'en')
const line = (value, screens) => {
  const p = preview(value, { mode: 'command', arrangement: shipped('almanac'), screens })
  return { ...p, text: say(i18n, p.says.message, p.says.values), also: (p.says.also ?? []).map((x) => say(i18n, x.message, x.values)) }
}

describe('reply: (C166 (a))', () => {
  const screens = (setting = null, now = { tag: 'en', how: 'interface' }) => ({ reply: { setting, now, locale: 'en', nameOf: nameIn } })

  it('sets the language replies come in, by its code or its name in any form', () => {
    for (const v of ['>reply:sv', '>reply:swedish', '>reply:svenska', '>reply:Swedish']) {
      const p = line(v, screens())
      expect(p.text).toBe('Enter has replies come in Swedish, whatever language you write in, from every model')
      expect(p.act).toEqual({ kind: 'setting', key: 'replyLanguage', value: 'sv', before: null })
    }
    expect(line('>reply:traditional chinese', screens()).act.value).toBe('zh-Hant')
  })

  it('says how replies stand, and when nothing changes', () => {
    expect(line('>reply:', screens()).text).toBe('Replies come in English, the language of this page. reply: and a language changes it')
    expect(line('>reply:', screens('sv', { tag: 'sv', how: 'set' })).text).toBe('Replies come in Swedish, whatever language you write in. reply:off asks for none')
    expect(line('>reply:', screens('off', { tag: null, how: 'off' })).text).toMatch(/^No language is asked for/)
    expect(line('>reply:swedish', screens('sv', { tag: 'sv', how: 'set' })).act).toBeNull()
  })

  it('turns off, and names nothing it does not know', () => {
    expect(line('>reply:off', screens('sv')).act).toEqual({ kind: 'setting', key: 'replyLanguage', value: 'off', before: 'sv' })
    expect(line('>reply:off', screens('off')).act).toBeNull()
    expect(line('>reply:klingonish', screens()).text).toBe('No language called klingonish is known here. Try its name in English, or a code like sv')
  })
})

describe('language: in beta, and coming soon (C282)', () => {
  const screens = { language: { offered: [{ tag: 'en' }, { tag: 'sv', beta: true }], coming: ['es'], chosen: null, locale: 'en', reply: null, browserTag: 'en' } }

  it('says a language in beta is still being worked on, and that Spanish is coming soon', () => {
    const sv = line('>language:sv', screens)
    expect(sv.next ?? sv.act).toBeTruthy()
    expect(sv.also).toContain('This translation is in beta: some words may still read oddly')
    const es = line('>language:es', screens)
    expect(es.act ?? null).toBeNull()
    expect(es.text).toBe('Spanish is coming soon. language: takes English or svenska')
  })
})

describe('helper: (C166 (d))', () => {
  const rows = {
    model: [
      { id: 'claude-haiku-5-5', group: 'model', name: 'Haiku 5.5', provider: 'anthropic', providerName: 'Anthropic', needsKey: false },
      { id: 'mistral-small-4', group: 'model', name: 'Mistral Small 4', provider: 'mistral', providerName: 'Mistral', needsKey: true },
    ],
    local: [{ id: 'ollama:bonsai-2:9b', group: 'local', name: 'bonsai-2:9b', provider: 'ollama', providerName: 'Ollama', needsKey: false }],
    source: [{ id: 'wikipedia', group: 'source', name: 'Wikipedia', provider: 'wikipedia', providerName: 'Wikipedia', needsKey: false }],
  }
  const screens = (stored = null, now = rows.model[0]) => ({ helping: { now: now && { ...now, chosen: Boolean(stored) }, rows, stored } })

  it('chooses a model or one on this computer, never a source', () => {
    expect(line('>helper:haiku', screens()).act).toEqual({ kind: 'setting', key: 'helper', value: 'claude-haiku-5-5', before: null })
    expect(line('>helper:bonsai', screens()).text).toBe('Enter has bonsai-2:9b read and translate text from sources')
    expect(line('>helper:wikipedia', screens()).text).toBe("wikipedia is a source. The helper is a model: helper: and a model's name")
  })

  it('needs the key of a model’s provider', () => {
    expect(line('>helper:mistral small', screens()).text).toBe('Mistral Small 4 needs a key for Mistral. api:mistral adds one')
  })

  it('says who it is, and goes back to the usual', () => {
    expect(line('>helper:', screens()).text).toBe('Haiku 5.5 reads and translates text from sources here, as no other is chosen. helper: and a model chooses one')
    expect(line('>helper:off', screens('ollama:bonsai-2:9b')).act).toEqual({ kind: 'setting', key: 'helper', value: null, before: 'ollama:bonsai-2:9b' })
    expect(line('>helper:', screens(null, null)).text).toMatch(/^No model here can read text from sources/)
  })
})

describe('translate: (C166 (f), (g))', () => {
  const haiku = { id: 'claude-haiku-5-5', group: 'model', name: 'Haiku 5.5', provider: 'anthropic', providerName: 'Anthropic', price: { type: 'metered', inputPerMillion: 0.1, outputPerMillion: 0.5 } }
  const last = { messageId: 'm2', source: 'Hacker News', question: 'barn owls', chars: 400, from: 'en', translated: null }
  const screens = (over = {}) => ({ translating: { room: 'c1', num: 204, last, to: 'sv', who: { kind: 'model', helper: haiku }, queries: false, nameOf: nameIn, ...over } })

  it('translates the last answer from a source, naming who and what it costs', () => {
    const p = line('>translate:', screens())
    expect(p.text).toBe('Enter translates the answer from Hacker News to “barn owls” into Swedish. The original stays')
    expect(p.also).toEqual(['By Haiku 5.5, which is sent the text: about 455 tokens, under $0.01'])
    expect(p.act).toMatchObject({ kind: 'translate', chatId: 'c1', messageId: 'm2', from: 'en', to: 'sv' })
  })

  it('by the browser’s own translation, saying nothing is sent', () => {
    expect(line('>translate:', screens({ who: { kind: 'browser', downloads: false } })).also).toEqual(['By this browser’s own translation, which its maker says runs on this device. Nothing is sent'])
    expect(line('>translate:', screens({ who: { kind: 'browser', downloads: true } })).also[0]).toMatch(/fetches the language first/)
  })

  it('by a model on this computer, free', () => {
    const local = { id: 'ollama:bonsai-2:9b', group: 'local', name: 'bonsai-2:9b', provider: 'ollama', price: { type: 'free-local' } }
    expect(line('>translate:', screens({ who: { kind: 'model', helper: local } })).also).toEqual(['By bonsai-2:9b on this computer. Nothing leaves it'])
  })

  it('refuses what is in the language already, or translated, or with no one to do it', () => {
    expect(line('>translate:', screens({ to: 'en' })).text).toBe('The answer from Hacker News is in English already')
    expect(line('>translate:', screens({ last: { ...last, translated: 'sv' } })).text).toBe('The answer from Hacker News is translated into Swedish already')
    expect(line('>translate:', screens({ who: { kind: 'none', helper: null } })).text).toMatch(/^Nothing here can translate it/)
    expect(line('>translate:', screens({ who: { kind: 'none', helper: { ...haiku, needsKey: true } } })).text).toBe('Haiku 5.5 needs a key for Anthropic. api:anthropic adds one')
    expect(line('>translate:', screens({ last: null })).text).toBe('No answer from a source here to translate')
  })

  it('turns translating questions on and off, a setting', () => {
    expect(line('>translate:on', screens()).act).toEqual({ kind: 'setting', key: 'translateQueries', value: true, before: false })
    expect(line('>translate:off', screens({ queries: true })).act).toEqual({ kind: 'setting', key: 'translateQueries', value: false, before: true })
    expect(line('>translate:off', screens()).act).toBeNull()
  })

  it('stands alone on a line, since it can spend', () => {
    expect(line('>translate: reply:sv', screens()).act ?? null).toBeNull()
  })
})

describe('the prompt’s Enter line (C166)', () => {
  const room = { room: 'c1', streaming: false, keyed: true, keyedBy: { anthropic: true }, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0 }
  const sonnet = { id: 'claude-sonnet-5-5', group: 'model', name: 'Sonnet 5.5', provider: 'anthropic', providerName: 'Anthropic', price: { type: 'metered', inputPerMillion: 2, outputPerMillion: 10 } }
  const also = (target) => (promptPreview('owls?', { ...room, ...target }).says.also ?? []).map((x) => say(i18n, x.message, x.values))

  it('names the language replies come in', () => {
    expect(also({ answerer: sonnet, replyIn: 'Swedish' })).toContain('Replies come in Swedish. reply: changes it')
    expect(also({ answerer: sonnet })).toEqual([])
  })

  it('names the edition a source is asked in', () => {
    const wiki = { id: 'wikipedia', group: 'source', name: 'Wikipedia' }
    expect(also({ answerer: wiki, edition: 'Swedish' })).toEqual(['From its Swedish edition, or the English one if nothing is found there'])
  })

  it('names a question that goes translated, by whom and at what cost', () => {
    const hn = { id: 'hackernews', group: 'source', name: 'Hacker News' }
    const query = { from: 'sv', to: 'en', who: { kind: 'browser', downloads: false } }
    expect(also({ answerer: hn, query, nameOf: nameIn })).toEqual([
      'Your question goes translated into English, which it reads best, unless it is in English already',
      'By this browser’s own translation, which its maker says runs on this device. Nothing is sent',
    ])
    expect(also({ answerer: hn, query: { ...query, who: { kind: 'none' } }, nameOf: nameIn })).toEqual(['It reads English best, and nothing here can translate your question, so it goes as typed'])
    expect(also({ answerer: hn, translateLater: 'Swedish' })).toEqual(['Its answer comes in English. translate: puts it in Swedish afterwards'])
  })
})

describe('language: (ruled 16 October; C166 (b); C184)', () => {
  const offered = [{ tag: 'en', draft: false }, { tag: 'ja', draft: true }, { tag: 'zh-Hans', draft: true }, { tag: 'sv', draft: true }, { tag: 'fi', draft: true }]
  const screens = (over = {}) => ({ language: { offered, chosen: null, locale: 'en', reply: null, browserTag: 'en', ...over } })

  it('takes a code or a name, in English or in the language itself, and says what follows', () => {
    for (const v of ['>language:sv', '>language:swedish', '>language:svenska', '>language:Swedish']) {
      const p = line(v, screens())
      expect(p.text).toBe('Enter puts the page in svenska, and your replies and searches follow it')
      expect(p.says.locale).toBe('sv')
      expect(p.act).toEqual({ kind: 'language', tag: 'sv', before: { interfaceLanguage: null, replyLanguage: null } })
      expect(p.also).toEqual(['This translation is a draft, waiting to be read'])
    }
    expect(line('>language:日本語', screens()).act.tag).toBe('ja')
    expect(line('>language:chinese', screens()).act.tag).toBe('zh-Hans')
    expect(line('>language:simplified chinese', screens()).act.tag).toBe('zh-Hans')
  })

  it('ends a reply language of its own, and one undo: puts both back', () => {
    const p = line('>language:fi', screens({ reply: 'de' }))
    expect(p.act).toEqual({ kind: 'language', tag: 'fi', before: { interfaceLanguage: null, replyLanguage: 'de' } })
    expect(p.also[0]).toBe('Replies stop keeping a language of their own')
  })

  it('opens the picker bare, or says only one language is here', () => {
    expect(line('>language:', screens())).toMatchObject({ text: 'Enter opens the list of languages', act: { kind: 'languagePicker' } })
    const only = line('>language:', screens({ offered: [{ tag: 'en', draft: false }] }))
    expect(only.text).toBe('Only English so far. Other languages come once they are translated and read')
    expect(only.act ?? null).toBeNull()
  })

  it('goes back to the browser, and refuses what is not here', () => {
    const back = line('>language:browser', screens({ chosen: 'sv' }))
    expect(back.text).toBe('Enter has the page follow your browser again: English')
    expect(back.act).toEqual({ kind: 'language', tag: null, before: { interfaceLanguage: 'sv', replyLanguage: null } })
    expect(line('>language:browser', screens()).text).toBe('The page follows your browser already')
    expect(line('>language:german', screens()).text).toBe('German is not here yet. language: takes English, 日本語, 简体中文, svenska, or suomi')
    expect(line('>language:traditional chinese', screens()).act ?? null).toBeNull()
    expect(line('>language:klingonese', screens()).text).toBe('No language called klingonese. language: takes a code or a name, as in language:sv or language:svenska')
    expect(line('>language:sv', screens({ chosen: 'sv', locale: 'sv' })).text).toBe('The page is in svenska already')
  })
})
