# Finnish glossary (fi draft)

One line per term: English → Finnish, with the reason where it was a hard choice.

## How placeholders are handled
- A placeholder never takes a case ending. It stands in the nominative after a head noun that carries the case ("palveluun {provider}", "haarasta {address}", "kokoelmaan {name}", "taulun {board}", "mallia {name}", "lähteestä {source}", "kielelle {language}"), as the subject ("{name} vastaa täällä"), or after a colon ("Enter arkistoi: {nums}").
- Generic head noun for a numbered thing of unknown kind → kohde ("Enter kopioi Markdown-muodossa: {num}", "ennen kohdetta {num}"). When it is known to be a chat → keskustelu {num}; a branch → haara {address}.
- Lists of unknown length after a plural label take a colon ("Liitteet: {names}", "Haarat: {nums}").
- Enter and Escape are never inflected: they stay as written and are the subject of the Enter line ("Enter avaa…", "Escape palaa palkkiin"). Where a case is needed, a compound carries it: Enter-rivi, Enter-painallus.

## The terms asked for
- chat → keskustelu. "a new chat" → uusi keskustelu.
- plan (docket) → suunnitelma. Plain and exact; "ohjelma" would clash with the program Ollama is.
- branch → haara (haarat); to branch → haarauttaa; carry a branch on → jatkaa.
- room → huone. Keeps the building metaphor that runs through the board names (Kirjasto, Paja, hyllyt).
- board → taulu. As in Finnish kanban tools; "taulukko" stays free for table.
- the bar → palkki. Finnish UI says hakupalkki, osoitepalkki; "kenttä" is kept for input fields (avainkenttä).
- prompt → kehote. The established Finnish term in AI interfaces.
- reply → vastaus.
- answer → vastaus. Finnish has one word; a source's answer is "vastaus lähteestä {source}" or "lähteen vastaus", so context keeps them apart, as in English.
- marking (notes, keywords, quotes, favourites together) → merkintä (merkinnät).
- note → muistiinpano.
- keyword (kind.term) → avainsana.
- quote → lainaus; the Quote button → Lainaa.
- highlight → korostus. "Lit" for keywords is rendered as "erottuvat omalla värillään" so it does not overlap.
- favourite → suosikki; the Favorites collection → Suosikit.
- collection → kokoelma.
- model → malli.
- provider → palveluntarjoaja; with a name as head noun → palvelu ("palveluun {provider}", "Palvelun {provider} avainsivu"). For the local one (Ollama) → ohjelma ("ohjelmaan {provider}"), since it is a program on the computer, not a service.
- source (Wikipedia and the like) → lähde.
- key → avain; API key → API-avain; key field → avainkenttä.
- helper → apuri. Short and friendly; "apumalli" was the alternative.
- backup → varmuuskopio; to back up → varmuuskopioida; Back up (title) → Varmuuskopioi.
- restore, bring back → palauttaa ("Palauta varmuuskopio").
- undo, take back → kumota; the undo history → kumoaminen ("Kumottu: {line}").
- the Enter line → Enter-rivi; the line under the bar → palkin alla oleva rivi.
- the privacy filter → tietosuojasuodatin. "Tietosuoja" is the standard Finnish word for data privacy.
- framework (a stance a reply is written under) → kehys (kehykset). Hard choice: "viitekehys" (frame of reference) is the exact sense but long; "näkökulma" fits "Written under" but not "Show reasoning"; "ohje" clashes with guides. "Kehys" is short and works in every line ("Kirjoitettu kehyksin: {names}").

## Board names (also as {board} values, always nominative)
- Records → Luettelo. A numbered table of everything made. "Arkisto" would clash with archive (in:archive); "Rekisteri" sounds official.
- Collection → Kokoelma. Library → Kirjasto. Plan → Suunnitelma. Settings → Asetukset.
- Lab → Paja. A workshop where rooms are built; "Laboratorio" is long and "Labra" colloquial.
- Canvas → Alusta; canvas in block names → -alusta (Kaavioalusta, Asiakirja-alusta, Taulukkoalusta). "Pohja" is taken by template.
- Reflection → Pohdinta. Its description uses "peilata" for the reflecting-back sense.
- Rooms → Huoneet. Blocks → Lohkot. Welcome page → Tervetulosivu.

## Other recurring words
- block → lohko. layout → asettelu. theme → teema. template → pohja (Huonepohjat). shelf → hylly. resources → aineistot.
- arrangement → järjestely. column (layout) → palsta; column (table) → sarake. pane → ruutu; panel → paneeli; sheet (slides up) → liukupaneeli.
- card → kortti. row → rivi. tag → tunniste. heading → otsikko.
- token → tokeni (tokenia). call (to a model) → kutsu ("yksi kutsu", "Ei kutsua"); model call → mallikutsu.
- cost on the Enter line → hinta {cost}; under {cost} → hinta alle {cost}; in all → yhteensä {cost}.
- Marks (the ×15 cost badges) → kertoimet. Kept apart from markings.
- run (of a plan) → ajo; to run a command → suorittaa; to run a branch → ajaa.
- step → vaihe. ask (kind) → kysymys. edit (kind) → muokkaus. suggestion → ehdotus.
- erase (for good) → pyyhkiä pysyvästi; erased → pyyhitty. delete → poistaa. remove → poistaa.
- archive → arkistoida. pin → kiinnittää.
- search → haku; saved search → tallennettu haku. filter → suodatin.
- command → komento; the command line → komentorivi.
- placeholder (privacy) → paikkamerkki; swap for placeholders → korvata paikkamerkeillä.
- context (of a model) → konteksti.
- think (models) → miettiä; thinking → miettiminen; can think → osaa miettiä.
- preview (model) → esiversio. streaming → suoratoisto. trained on → käytetään koulutukseen.
- who answers (as a noun) → vastaaja ("Enter valitsee keskustelun {num} vastaajaksi: {name}").
- focus (focus:) → keskittymistila.
- point the bar at → kohdistaa palkki; the bar points here → palkki kohdistuu tähän.
- beside what is here / on screen → näkyvien rinnalle; brings {boards} beside → tuo näkyviin myös: {boards}.
- what is here (in backup and restore) → nykyinen sisältö.
- held (an answer waiting for the next prompt) → mukaan varattu.
- line (that a chat carries on) → linja; thread → säie.
- in its own window → omassa ikkunassaan. tab → välilehti. pop-ups → ponnahdusikkunat.
- this computer → tämä kone; your machine → oma koneesi; this device → tämä laite. "Nothing leaves it" → "Mitään ei lähde koneelta".
- as shipped → alkuperäinen ("palauttaa näkymän alkuperäiseksi").
- network activity → verkkoliikenne; host → palvelin.
- 1.1 times the price → 1,1-kertainen hinta.

## Typography
- Quotation marks ”…” (U+201D both sides). ASCII quotes only inside commands (open:"{name}", name:"…").
- Decimal comma in prose (1,1). Values typed into commands stay ASCII (cost: >0.50, <1 or 0.18).
- Names inflect when they are literal text, not placeholders: Parliamentin, Parliamentissa, Parliamentiin, Wikipediaan. Multi-word names take a spaced hyphen: Claude Code -työkalulla.
