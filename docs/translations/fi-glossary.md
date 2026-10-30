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

## Lock Parliament
- the lock (the feature, the Settings row) → lukitus; to lock → lukita; locked → lukittu ("Parliament on lukittu").
- Lock now → Lukitse nyt. Lock it (step 4) → Lukitse. Encrypt and lock → Salaa ja lukitse.
- unlock → avata lukitus; Unlock (button) → Avaa lukitus; unlocks Parliament → avaa Parliamentin lukituksen. Where the English says "opens Parliament", the Finnish says "avaa Parliamentin".
- passphrase → salalause. The usual Finnish word; kept apart from salasana, which stays for backup passwords.
- recovery code → palautuskoodi.
- passkey → pääsyavain. The term Apple and Google use in Finnish. Kept apart from API-avain: in lock copy the API keys are "tallennetut avaimesi", never "pääsyavain", and a passkey is never just "avain".
- idle → käyttämättä. The label "Locks when idle for" → "Lukittuu, kun käyttämättä on kulunut", so the choices follow it in the nominative as the subject of "kulua": 15 minuuttia, 1 tunti, 8 tuntia. ("kestää" was ruled out: it would need the accusative, "tunnin".)
- set up the lock → ottaa lukitus käyttöön; turn the lock off → poistaa lukitus käytöstä.
- encrypt → salata; decrypt → purkaa salaus.
- password manager → salasanojen hallintaohjelma.
- shown once → näytetään tämän kerran (no "vain" added).

## Plans and running (stage 10, drafted 24 October 2026)
- a step runs (intransitive) → ajetaan ("se ajetaan, jos edellinen epäonnistuu"). Keeps one verb for run throughout (ajo, ajaa, ajetaan); "käynnistyy" reads more naturally on its own but would split the term.
- did not run → jäi ajamatta; has never run → ei ole koskaan ajettu; not in run 2 → ei ajossa 2.
- step {index} of {address} → haaran {address} vaihe {index}; in run {run} → ajossa {run}; run {run} of plan {num} → suunnitelman {num} ajo {run}; run 1 of 2 → ajo 1/2.
- has started (a run, a step) → on alkanut. Nothing has started → Mikään ei ole alkanut.
- statuses: done → valmis; running → käynnissä; waiting → odottaa; paused → keskeytynyt (verb: keskeytyi). Paused covers failures and stalls as well as stops, so the intransitive "keskeytynyt" (it got interrupted), not "keskeytetty" (someone paused it). stopped → pysäytetty, as branches.stopped.
- stop, halt → pysäyttää. What is done stays done and paid for → Tehty pysyy tehtynä ja maksettuna.
- condition → ehto; its condition was not met → sen ehto ei täyttynyt.
- the four conditions: once the one before finishes → kun edellinen (vaihe) on valmis; if the one before fails → jos edellinen epäonnistuu; if nothing is found → jos mitään ei löydy; whatever happens → joka tapauksessa; whatever the one before does → edellisestä riippumatta.
- hold (hold:), held → pito: asettaa pitoon, pidossa, vapauttaa pidosta. Hard choice: from the phone's call on hold ("pidossa", "aseta pitoon"); "pidätetty" sounds like an arrest, "odottaa" is taken by the waiting status. Kept apart from "mukaan varattu", the answer held for the next prompt.
- one after another → peräkkäin. All at once → Kaikki yhtä aikaa. Order (the picker's group) → Järjestys.
- side by side → rinnakkain; beside run {run} → ajon {run} rinnalla.
- compare, what differs → verrata, erot; in ink → musteella.
- an earlier run, kept as it was (a record) → aiempi ajo, säilytetty ennallaan.
- fixed (a step that has started) → sitä ei voi enää muuttaa. "Lukittu" is left to Lock Parliament.
- plan it again → suunnitella uudelleen. with nothing in it → tyhjä ("tyhjä suunnitelma").
- no chat until it runs → ei keskustelua ennen ajoa (label); in a sentence "Sillä ei ole keskustelua ennen kuin se ajetaan".
- as the branch (a step's answerer) → sama kuin haaralla.
- step list (the block) → Vaihelista. "Luettelo" is the Records board.
- on the {board} board → taulussa {board}, by the placeholder rule; not "{board}-taululla".
- then (in by:wikipedia then sonnet) → stays English, a word of the command ("Kirjoita sana then kunkin nimen väliin").
- deleted (C199: delete: replaces erase:) → poistettu; deleted for good → poistettu pysyvästi. The redrafted lines no longer use pyyhkiä.
- a second Enter → toinen Enter ("Toinen Enter poistaa sen pysyvästi"); after a second Enter → toisen Enter-painalluksen jälkeen.
- spending (the Settings section) → kulut; spending (the act) → kulutus.
- a costly run → kallis ajo. Warn before a costly run → Varoita ennen kallista ajoa. Off (its choice) → Pois.
- hard limits → Ehdottomat rajat; cap → katto; monthly limit → kuukausiraja. "Kulukatot" was the alternative; "ehdoton" carries the contrast with the warning, which stops nothing.
- run of a plan (in the month's count) → suunnitelma-ajo; chat on its own → erillinen keskustelu.

## Typography
- Quotation marks ”…” (U+201D both sides). ASCII quotes only inside commands (open:"{name}", name:"…").
- Decimal comma in prose (1,1). Values typed into commands stay ASCII (cost: >0.50, <1 or 0.18).
- Names inflect when they are literal text, not placeholders: Parliamentin, Parliamentissa, Parliamentiin, Wikipediaan. Multi-word names take a spaced hyphen: Claude Code -työkalulla.

## Edits, asks, the Lab and other screens (drafted 30 October 2026)
- ask (on a reply) → kysymys (kind.ask already); the ask box → kysymysruutu; asked of {name} → kysytty mallilta {name}. Asks tab → Kysymykset.
- edit (struck or typed over) → muokkaus; strike, struck → yliviivata, yliviivattu; Edits tab → Muokkaukset.
- markup, marked up → muutosmerkit, muutosmerkein; clean → puhdas, puhtaina. Kept apart from merkintä, which stays for markings (notes, keywords, quotes).
- tell, told → kertoa, kerrottu; told once → kertaalleen ("Mukana kertaalleen: …"); told to {name} → kerrottu mallille {name}.
- hold back (an edit or an ask) → asettaa pitoon, pidossa; let it go → vapauttaa (pidosta). The same pito as plans' hold:.
- accept → hyväksyä; reject, turn down → hylätä; settle → ratkaista; take back (an answer) → kumota, kumottu.
- the passage (the words an ask is on) → tekstikohta.
- Ripple → stays a name, inflected as literal text: Ripple, Ripplen, Ripplen ehdotus. The marker before a number stays "ripple 244", like the command.
- sweep → läpikäynti; to sweep {address} as {name} → käydä läpi haara {address} kehyksellä {name}; the sweep's suggestions → läpikäynnin ehdotukset.
- review (the bar over Suggestions) → arviointi. proposal (Reflection) → suositus, kept apart from ehdotus.
- reflect on → pohtia; synthesis → synteesi; session → istunto. {head} in Reflection is a chat's or a plan's number → kohde {head}.
- slot (a place in a room's layout) → paikka: "paikasta {fromSlot} paikkaan {toSlot}". The slot names: alusta, keskustelupaneeli, asiakirja, syöttöalue, tarkastelupaneeli, vasen sivupalsta, marginaali, keskustelu, jäsennys, oikea sivupalsta, oikea alempi sivupalsta, liukupaneeli.
- rail → sivupalsta. Not sivupalkki: palkki is the bar. A room's left and right column → vasen ja oikea palsta. inspector → tarkastelupaneeli.
- room for one (space in a slot) → tilaa yhdelle; room for more → tilaa useammalle. Never huone.
- Built for (label) → Laite: tietokone, puhelin. Sends to (label) → Lähettää: kenelle tahansa, vain tälle koneelle.
- A block setting's label is followed by its choice in the nominative, because the choice words also show alone on the block's row ("Esitystapa: mittari", "Näkyvissä: tämä ajo").
- tick, untick → valita, poistaa valinta; {count} ticked → {count} valittu.
- calm (calm:) → rauhoittaa näkymä; calm: on, calm: off → calm: päällä, calm: pois (as framework: ei mitään). on, off as a block's switch → päällä, pois.
- the guide (new:room guided) → opas. letter (from the maker) → kirje; not read yet → lukematta.
- key store, key vault → avainsäilö.
- in beta → beeta (beside a language), beetavaiheessa (in a sentence). coming soon → tulossa, as library.pillSoon.
- display {n} → näyttö {n}; screen → näyttö; on screen → näytöllä. A popped window → erillinen ikkuna.
- Runs {command} → Suorittaa komennon {command}; Ran {command} → Suoritettu: {command}.
- {n} of {total} → {n}/{total}, as library.shown. A percentage written by hand → {n} %, with a space.
- arrangement → järjestely (as before); arrange:save "review desk" → arrange:save "arviointipöytä". Example room and layout names are the Finnish ones the page shows: edit:"Kirjoitusstudio", layout:"Kolme paneelia".

## Second round, 30 October 2026
- the start card (shown before anything is open) → Aloitus, as group.start. One room, as a board's name in a sentence → Huone ("Enter siirtää taulun Huone vasemmalle").
- key vault (keys.parliament.ltd) → avainsäilö, also in the privacy lines: "Avaimia säilyttää Parliamentin avainsäilö".
- the welcome letter keeps the writer's voice: first person, his fragments and trailing dots, the reader as sinä. Signed Stef.
