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
IIIF Image API) oppure va offerto solo come link esterno (es. pagine "ark" di
alcuni portali che non restituiscono un file immagine grezzo). Per aggiungere un
manoscritto o una pagina, modifica direttamente questo file seguendo la stessa
struttura.

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
