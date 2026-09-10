// Utilità condivise: caricamento immagine (con fallback per URL non incorporabili)
// e uno strumento di pan/zoom minimale usato dal corpus e dal confronto.

window.IsidoroViewer = (function(){

  // Alcuni URL della schedatura (es. Besançon) puntano a una pagina "ark"
  // di un visore, non a un file immagine grezzo: li trattiamo come link esterni,
  // a meno che non esista una copia locale (vedi img/ms184/README.md).
  function isEmbeddable(page){
    return !!page.embeddable;
  }

  function folioLabel(ms, page){
    var t = page.title ? ' — "' + page.title + '"' : '';
    return ms.siglum + ', f. ' + page.folio + t;
  }

  // Link da usare per "apri la scheda originale": se l'immagine mostrata è
  // una copia locale (es. Ms. 184), sourceUrl punta alla pagina del portale.
  function sourceUrl(page){
    return page.sourceUrl || page.url;
  }

  // Costruisce il contenuto di una miniatura: <img> se incorporabile,
  // altrimenti un segnaposto con link alla scheda originale.
  function buildThumb(container, ms, page){
    container.innerHTML = '';
    if (isEmbeddable(page)){
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = 'Miniatura: ' + folioLabel(ms, page);
      img.src = page.url;
      img.addEventListener('error', function(){
        container.innerHTML = placeholderHTML(ms, page);
      }, { once: true });
      container.appendChild(img);
    } else {
      container.innerHTML = placeholderHTML(ms, page);
    }
  }

  function placeholderHTML(ms, page){
    return '<div class="ph">Immagine non incorporabile<br>in questa vista.<br>' +
      '<span style="color:var(--ink-soft)">' + ms.siglum + ', f. ' + page.folio + '</span></div>';
  }

  // ---------- Pan / zoom ----------
  // stageEl: contenitore con overflow:hidden
  // imgEl: l'immagine da trasformare
  // opts.overlay: elemento opzionale (es. <svg> per le annotazioni) trasformato
  //   in sincronia con imgEl, dimensionato sullo spazio pixel dell'immagine
  //   naturale — utile per ancorare segnalibri a un punto preciso del disegno
  //   indipendentemente da zoom/spostamento.
  function PanZoom(stageEl, imgEl, opts){
    opts = opts || {};
    this.stage = stageEl;
    this.img = imgEl;
    this.overlay = opts.overlay || null;
    this.scale = 1; this.tx = 0; this.ty = 0;
    this.fitScale = 1;
    this.minScale = 0.4; this.maxScale = 6; // ricalcolati non appena l'immagine è pronta
    this.onChange = opts.onChange || null;
    this._drag = null;
    this._bind();
    this.onImageChanged();
  }

  // Da richiamare quando l'immagine cambia sorgente (es. lightbox che passa
  // a un'altra pagina) o quando viene creata: ricalcola i limiti di zoom e
  // adatta la vista non appena le dimensioni naturali sono note.
  PanZoom.prototype.onImageChanged = function(){
    var self = this;
    function ready(){
      // Se l'immagine è già in cache, "load" (o img.complete) può scattare
      // in modo sincrono, prima ancora che il pannello sia stato inserito
      // nel DOM (es. costruito dentro un elemento ancora staccato): in quel
      // momento clientWidth/clientHeight varrebbero 0 e il "fit" verrebbe
      // calcolato su un riquadro fittizio, con uno zoom iniziale minuscolo.
      // Un doppio rAF rimanda il calcolo al frame successivo, quando il
      // layout reale del pannello è garantito.
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ self.updateBounds(); self.fit(); });
      });
    }
    if (this.img.complete && this.img.naturalWidth){ ready(); }
    else { this.img.addEventListener('load', ready, { once: true }); }
  };

  PanZoom.prototype.updateBounds = function(){
    var nw = this.img.naturalWidth || 1, nh = this.img.naturalHeight || 1;
    var cw = this.stage.clientWidth || 1, ch = this.stage.clientHeight || 1;
    this.fitScale = Math.min(cw / nw, ch / nh) || 1;
    // Permette di allontanarsi ben oltre il "fit" (utile con pannelli piccoli)
    // e di avvicinarsi molto oltre la dimensione naturale.
    this.minScale = this.fitScale * 0.15;
    this.maxScale = Math.max(this.fitScale * 14, 6);
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale));
    if (this.overlay){
      this.overlay.setAttribute('viewBox', '0 0 ' + nw + ' ' + nh);
      this.overlay.style.width = nw + 'px';
      this.overlay.style.height = nh + 'px';
    }
  };

  PanZoom.prototype._apply = function(){
    var t = 'translate(-50%,-50%) translate(' + this.tx + 'px,' + this.ty + 'px) scale(' + this.scale + ')';
    this.img.style.transform = t;
    if (this.overlay) this.overlay.style.transform = t;
    if (this.onChange) this.onChange(this.getState());
  };

  PanZoom.prototype.getState = function(){
    return { scale: this.scale, tx: this.tx, ty: this.ty };
  };
  PanZoom.prototype.setState = function(s){
    this.scale = s.scale; this.tx = s.tx; this.ty = s.ty; this._apply();
  };

  // Adatta l'intera immagine al pannello (equivalente a "reimposta").
  PanZoom.prototype.fit = function(){
    this.scale = this.fitScale || 1; this.tx = 0; this.ty = 0; this._apply();
  };
  PanZoom.prototype.reset = function(){ this.fit(); };

  PanZoom.prototype.zoomBy = function(factor){
    var next = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    this.scale = next;
    this._apply();
  };

  // Converte una posizione del puntatore (coordinate client, es. e.clientX/Y)
  // nello spazio pixel dell'immagine naturale — usato per ancorare le
  // annotazioni a un punto preciso del disegno.
  PanZoom.prototype.clientToImage = function(clientX, clientY){
    var r = this.stage.getBoundingClientRect();
    var nw = this.img.naturalWidth || 1, nh = this.img.naturalHeight || 1;
    var centerX = r.left + r.width / 2 + this.tx;
    var centerY = r.top + r.height / 2 + this.ty;
    var x = (clientX - centerX) / this.scale + nw / 2;
    var y = (clientY - centerY) / this.scale + nh / 2;
    return { x: Math.min(nw, Math.max(0, x)), y: Math.min(nh, Math.max(0, y)) };
  };

  PanZoom.prototype._bind = function(){
    var self = this;
    this.stage.addEventListener('wheel', function(e){
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.12 : 1/1.12;
      self.zoomBy(factor);
    }, { passive: false });

    this.stage.addEventListener('pointerdown', function(e){
      if (self.dragDisabled) return;
      self._drag = { x: e.clientX, y: e.clientY, tx: self.tx, ty: self.ty, moved: false };
      self.stage.setPointerCapture(e.pointerId);
    });
    this.stage.addEventListener('pointermove', function(e){
      if (!self._drag) return;
      var dx = e.clientX - self._drag.x, dy = e.clientY - self._drag.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) self._drag.moved = true;
      self.tx = self._drag.tx + dx;
      self.ty = self._drag.ty + dy;
      self._apply();
    });
    ['pointerup','pointercancel','pointerleave'].forEach(function(evt){
      self.stage.addEventListener(evt, function(){ self._drag = null; });
    });

    this.img.addEventListener('dragstart', function(e){ e.preventDefault(); });

    window.addEventListener('resize', function(){ self.updateBounds(); });
  };

  return {
    isEmbeddable: isEmbeddable, folioLabel: folioLabel, sourceUrl: sourceUrl,
    buildThumb: buildThumb, placeholderHTML: placeholderHTML, PanZoom: PanZoom
  };
})();
