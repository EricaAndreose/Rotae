// Utilità condivise: caricamento immagine (con fallback per URL non incorporabili)
// e uno strumento di pan/zoom minimale usato dal corpus e dal confronto.

window.IsidoroViewer = (function(){

  // Alcuni URL della schedatura (es. Besançon) puntano a una pagina "ark"
  // di un visore, non a un file immagine grezzo: li trattiamo come link esterni.
  function isEmbeddable(page){
    return !!page.embeddable;
  }

  function folioLabel(ms, page){
    var t = page.title ? ' — "' + page.title + '"' : '';
    return ms.siglum + ', f. ' + page.folio + t;
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
  function PanZoom(stageEl, imgEl, opts){
    this.stage = stageEl;
    this.img = imgEl;
    this.scale = 1; this.tx = 0; this.ty = 0;
    this.minScale = 0.4; this.maxScale = 6;
    this.onChange = (opts && opts.onChange) || null;
    this._drag = null;
    this._bind();
  }

  PanZoom.prototype._apply = function(){
    this.img.style.transform = 'translate(-50%,-50%) translate(' + this.tx + 'px,' + this.ty + 'px) scale(' + this.scale + ')';
    if (this.onChange) this.onChange(this.getState());
  };

  PanZoom.prototype.getState = function(){
    return { scale: this.scale, tx: this.tx, ty: this.ty };
  };
  PanZoom.prototype.setState = function(s){
    this.scale = s.scale; this.tx = s.tx; this.ty = s.ty; this._apply();
  };

  PanZoom.prototype.reset = function(){
    this.scale = 1; this.tx = 0; this.ty = 0; this._apply();
  };

  PanZoom.prototype.zoomBy = function(factor, center){
    var next = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    this.scale = next;
    this._apply();
  };

  PanZoom.prototype._bind = function(){
    var self = this;
    this.stage.addEventListener('wheel', function(e){
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.12 : 1/1.12;
      self.zoomBy(factor);
    }, { passive: false });

    this.stage.addEventListener('pointerdown', function(e){
      self._drag = { x: e.clientX, y: e.clientY, tx: self.tx, ty: self.ty };
      self.stage.setPointerCapture(e.pointerId);
    });
    this.stage.addEventListener('pointermove', function(e){
      if (!self._drag) return;
      self.tx = self._drag.tx + (e.clientX - self._drag.x);
      self.ty = self._drag.ty + (e.clientY - self._drag.y);
      self._apply();
    });
    ['pointerup','pointercancel','pointerleave'].forEach(function(evt){
      self.stage.addEventListener(evt, function(){ self._drag = null; });
    });

    this.img.addEventListener('dragstart', function(e){ e.preventDefault(); });
  };

  return { isEmbeddable: isEmbeddable, folioLabel: folioLabel, buildThumb: buildThumb, placeholderHTML: placeholderHTML, PanZoom: PanZoom };
})();
