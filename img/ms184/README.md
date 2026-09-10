# Immagini locali — Ms. 184 (Besançon)

Le pagine digitalizzate di Besançon sono servite da un visore "ark" che non
restituisce un file immagine grezzo incorporabile (niente IIIF Image API),
quindi per questo manoscritto le immagini vanno salvate qui a mano, con un
nome file che corrisponde al folio, così come indicato in `js/data.js`.

Metti in questa cartella i seguenti file (stesso formato, stesso nome —
minuscolo, senza spazi, `r`/`v` per recto/verso):

| Folio       | Nome file richiesto |
|-------------|----------------------|
| 10 recto    | `10r.jpg`            |
| 14 recto    | `14r.jpg`            |
| 17 recto    | `17r.jpg`            |
| 18 verso    | `18v.jpg`            |
| 19 verso    | `19v.jpg`            |
| 24 recto    | `24r.jpg`            |
| 34 recto    | `34r.jpg`            |
| 46 recto    | `46r.jpg`            |
| 56 recto    | `56r.jpg`            |

Finché un file non è presente, la pagina corrispondente mostra semplicemente
il segnaposto "Immagine non incorporabile" (nessun errore bloccante) — puoi
quindi aggiungerle una alla volta, senza dover toccare il codice.

Se aggiungi altri folii di Ms. 184 in `js/data.js`, usa la stessa
convenzione (`<numero><r|v>.jpg`) e imposta `"embeddable": true` e
`"url": "img/ms184/<numero><r|v>.jpg"`; il campo `"sourceUrl"` può restare
il link alla scheda originale del portale di Besançon, usato dal sito come
link "Apri la scheda / immagine originale".

Se un'immagine non è in `.jpg`, aggiorna l'estensione nel campo `url` di
quella pagina in `js/data.js` di conseguenza (es. `.png`).
