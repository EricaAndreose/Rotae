# Le rotae di Isidoro — corpus e strumenti di lettura computazionale

Sito statico (HTML/CSS/JS, senza build) per la verifica del primo anno di dottorato:
raccoglie il corpus di manoscritti isidoriani con rotae/diagrammi, uno strumento di
confronto affiancato con zoom sincronizzato, e la documentazione (+ un piccolo demo
live opzionale) degli esperimenti di lettura computazionale dei diagrammi.

## Struttura

```
index.html         Introduzione + hero a "rota" di navigazione
corpus.html         Schedatura manoscritti + visore a lightbox con zoom/pan
confronto.html       Selezione multipla + confronto affiancato sincronizzato
estrazione.html      Metodo, showcase illustrativo, demo live opzionale
css/style.css        Tutto lo stile del sito
js/data.js           Dati del corpus (generati da ISIDORO_MS_-_Foglio1.csv)
js/nav.js            Menu mobile / link attivo
js/viewer.js         Fallback immagini + pan/zoom condiviso
js/corpus.js         Logica pagina Corpus
js/confronto.js       Logica pagina Confronto
js/estrazione.js      Logica pagina Estrazione (demo live)
```

## Aggiornare i dati del corpus

I dati di manoscritti e pagine vivono in `js/data.js`, nell'oggetto
`window.ISIDORO_CORPUS`. È un array di manoscritti, ciascuno con un array `pages`;
ogni pagina ha `folio`, `url` (immagine) e `title` (facoltativo). Il campo
`embeddable` indica se l'URL può essere mostrato direttamente come `<img>` (URL
IIIF Image API, oppure una copia locale in `img/`) oppure va offerto solo come
link esterno (es. pagine "ark" di alcuni portali che non restituiscono un file
immagine grezzo). Il campo opzionale `sourceUrl` punta invece alla scheda
originale del portale, quando `url` è una copia locale: viene usato dal link
"Apri la scheda / immagine originale". Per aggiungere un manoscritto o una
pagina, modifica direttamente questo file seguendo la stessa struttura — la
tabella nella sezione "Dati del corpus" di `index.html` legge lo stesso file,
quindi ogni modifica è visibile lì subito, senza bisogno di aggiornare altro.

### Immagini locali (Ms. 184, Besançon)

Il portale di Besançon non offre un URL immagine incorporabile (solo pagine
"ark" del visore), quindi le immagini di Ms. 184 vanno salvate a mano in
`img/ms184/`, con un nome file numerato come il folio di appartenenza —
convenzione e elenco esatto dei nomi attesi in `img/ms184/README.md`.

## Confronto: zoom, pannelli e annotazioni

Nella pagina Confronto, ogni pannello si adatta automaticamente alla pagina
intera all'apertura e con «Reimposta» (lo zoom minimo/massimo è calcolato
in proporzione a questa vista, non fisso, così resta utile anche quando i
pannelli sono piccoli confrontando più di due pagine). L'elenco laterale
delle pagine disponibili si può richiudere (««») per fare spazio; con due
sole pagine selezionate i pannelli sono più grandi. La «modalità
annotazione» permette di segnare punti precisi sul disegno (restano
ancorati al punto esatto dell'immagine, indipendentemente da zoom/
spostamento) o di scrivere appunti generali per pagina: tutto è salvato
solo nel browser (`localStorage`, chiavi `isidoro_annotations_v1` e
`isidoro_notes_v1`), non su un server.

## Nota sul demo live di estrazione IA

Il demo in `estrazione.html` chiama direttamente `api.anthropic.com` dal browser,
usando una API key inserita dall'utente (mai salvata, mai inviata a server terzi
diversi da Anthropic). È pensato come dimostrazione rapida e didattica, distinta
dalla pipeline di ricerca vera e propria (DSV + SAM + regionalizzazione via
`shapely.polygonize`), che gira come codice Python e non è replicata qui.

## Licenza delle immagini

Le immagini dei manoscritti restano di proprietà e sotto licenza delle rispettive
istituzioni conservatrici (Bibliothèque municipale de Besançon, Médiathèque
d'agglomération de Cambrai, Bibliothèque Suzanne Martinet di Laon); sono qui
richiamate tramite i loro servizi di digitalizzazione pubblici, a fini di studio.
Verifica le condizioni d'uso di ciascun portale prima di un eventuale riuso al di
fuori del contesto della tesi.
