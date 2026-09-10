(function(){
  var DATA = window.ISIDORO_CORPUS || [];
  var V = window.IsidoroViewer;
  var SEL_KEY = 'isidoro_selection_v1';
  var ANNOT_KEY = 'isidoro_annotations_v1';
  var NOTES_KEY = 'isidoro_notes_v1';
  var PICKER_KEY = 'isidoro_picker_collapsed_v1';

  var pickerList = document.getElementById('picker-list');
  var searchInput = document.getElementById('picker-search');
  var stageEl = document.getElementById('compare-stage');
  var syncToggle = document.getElementById('sync-toggle');
  var annotateToggle = document.getElementById('annotate-toggle');
  var clearBtn = document.getElementById('clear-all');
  var fitAllBtn = document.getElementById('fit-all');
  var layoutEl = document.getElementById('confronto-layout');
  var pickerToggle = document.getElementById('picker-toggle');
  var pickerReopen = document.getElementById('picker-reopen');

  var flat = [];
  DATA.forEach(function(ms){ ms.pages.forEach(function(page){ flat.push({ ms: ms, page: page }); }); });

  function refKey(ms, page){ return ms.siglum + '|' + page.folio; }
  function escapeHTML(s){
    return (s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function debounce(fn, wait){
    var t;
    return function(){
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function(){ fn.apply(ctx, args); }, wait);
    };
  }

  // ---------- Selezione (condivisa con Corpus) ----------
  function loadSelection(){
    try { return JSON.parse(localStorage.getItem(SEL_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveSelection(sel){ localStorage.setItem(SEL_KEY, JSON.stringify(sel)); }

  function isSelected(ms, page){
    return loadSelection().some(function(s){ return s.k === refKey(ms, page); });
  }

  function setSelected(ms, page, on){
    var sel = loadSelection();
    var key = refKey(ms, page);
    var i = sel.findIndex(function(s){ return s.k === key; });
    if (on && i < 0){
      if (sel.length >= 6){ alert('Massimo 6 pagine confrontabili alla volta.'); return false; }
      sel.push({ k: key, siglum: ms.siglum, folio: page.folio });
    } else if (!on && i >= 0){
      sel.splice(i,1);
    }
    saveSelection(sel);
    return true;
  }

  // ---------- Annotazioni (segnalibri sul disegno) ----------
  function loadAnnotations(){
    try { return JSON.parse(localStorage.getItem(ANNOT_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function saveAnnotations(obj){ localStorage.setItem(ANNOT_KEY, JSON.stringify(obj)); }

  function addPin(key, x, y){
    var all = loadAnnotations();
    var arr = all[key] || (all[key] = []);
    var id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
    arr.push({ id: id, x: Math.round(x), y: Math.round(y), text: '', created: Date.now() });
    saveAnnotations(all);
    return id;
  }
  function updatePinText(key, id, text){
    var all = loadAnnotations();
    var arr = all[key] || [];
    var p = arr.find(function(a){ return a.id === id; });
    if (p){ p.text = text; p.updated = Date.now(); saveAnnotations(all); }
  }
  function deletePin(key, id){
    var all = loadAnnotations();
    var arr = all[key] || [];
    var i = arr.findIndex(function(a){ return a.id === id; });
    if (i >= 0){ arr.splice(i,1); all[key] = arr; saveAnnotations(all); }
  }

  // ---------- Note generali (testo libero per pagina) ----------
  function loadNotes(){
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function saveNotes(obj){ localStorage.setItem(NOTES_KEY, JSON.stringify(obj)); }

  // ---------- Pannello laterale ----------
  function buildPicker(filterText){
    pickerList.innerHTML = '';
    var q = (filterText || '').toLowerCase();
    flat.forEach(function(entry){
      var ms = entry.ms, page = entry.page;
      var haystack = (ms.siglum + ' ' + ms.institution + ' ' + page.folio + ' ' + page.title).toLowerCase();
      if (q && haystack.indexOf(q) === -1) return;

      var row = document.createElement('label');
      row.className = 'picker-item';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = isSelected(ms, page);
      cb.addEventListener('change', function(){
        var ok = setSelected(ms, page, cb.checked);
        if (!ok) { cb.checked = false; return; }
        renderStage();
      });
      var txt = document.createElement('span');
      txt.innerHTML = escapeHTML('f. ' + page.folio) + (page.title ? ' — ' + escapeHTML(page.title) : '') +
        '<br><span class="grp">' + escapeHTML(ms.siglum) + '</span>';
      row.appendChild(cb);
      row.appendChild(txt);
      pickerList.appendChild(row);
    });
    if (!pickerList.children.length){
      pickerList.innerHTML = '<p class="picker-hint">Nessuna pagina corrisponde alla ricerca.</p>';
    }
  }

  function setPickerCollapsed(collapsed){
    layoutEl.classList.toggle('picker-collapsed', collapsed);
    pickerToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    pickerToggle.textContent = collapsed ? '»' : '«';
    pickerToggle.title = collapsed ? "Mostra l'elenco delle pagine" : "Nascondi l'elenco per fare spazio";
    pickerReopen.hidden = !collapsed;
    try { localStorage.setItem(PICKER_KEY, collapsed ? '1' : '0'); } catch(e){}
    // Il pannello di confronto cambia larghezza: ricalcola i limiti di zoom
    // senza però forzare un nuovo adattamento, per non perdere la vista corrente.
    panzooms.forEach(function(pz){ pz.updateBounds(); });
  }

  // ---------- Palco di confronto ----------
  var panzooms = [];
  var currentCount = 0;

  function sizeClass(n){
    if (n <= 1) return 'n1';
    if (n === 2) return 'n2';
    if (n === 3) return 'n3';
    return 'nmany';
  }

  function computeColumns(n){
    if (n <= 1) return 1;
    if (n === 2) return (window.innerWidth < 700) ? 1 : 2;
    return (window.innerWidth < 700) ? 1 : Math.min(n, 3);
  }

  function renderStage(){
    var sel = loadSelection();
    panzooms = [];
    currentCount = sel.length;
    if (!sel.length){
      stageEl.innerHTML = '<div class="compare-empty">Seleziona due o più pagine dall\'elenco a sinistra per confrontarle affiancate. Lo zoom e lo spostamento possono restare sincronizzati fra i pannelli; con «modalità annotazione» puoi segnare punti precisi del disegno o scrivere appunti generali.</div>';
      return;
    }
    var grid = document.createElement('div');
    grid.className = 'compare-grid compare-grid--' + sizeClass(sel.length);
    grid.style.gridTemplateColumns = 'repeat(' + computeColumns(sel.length) + ', 1fr)';

    sel.forEach(function(s){
      var entry = flat.find(function(e){ return refKey(e.ms, e.page) === s.k; });
      if (!entry) return;
      var ms = entry.ms, page = entry.page;
      var key = s.k;

      var panel = document.createElement('div');
      panel.className = 'compare-panel';

      var stageDiv = document.createElement('div');
      stageDiv.className = 'compare-panel-stage';
      panel.appendChild(stageDiv);

      var annotPanel = document.createElement('div');
      annotPanel.className = 'compare-annot-panel';

      if (V.isEmbeddable(page)){
        var img = document.createElement('img');
        img.src = page.url;
        img.alt = V.folioLabel(ms, page);
        img.addEventListener('error', function(){
          stageDiv.innerHTML = '<div class="ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#B7AF9B;">Immagine non incorporabile</div>';
        });

        var svgNS = 'http://www.w3.org/2000/svg';
        var overlay = document.createElementNS(svgNS, 'svg');
        overlay.setAttribute('class', 'annot-layer');

        stageDiv.appendChild(img);
        stageDiv.appendChild(overlay);

        var pz = new V.PanZoom(stageDiv, img, {
          overlay: overlay,
          onChange: function(state){ if (syncToggle.checked) applyToAll(state, pz); }
        });
        panzooms.push(pz);

        // ---- Annotazioni: elenco e ancoraggio sul disegno ----
        var head = document.createElement('div');
        head.className = 'compare-annot-head';
        head.innerHTML = '<span>Annotazioni</span>';
        var fitBtn = document.createElement('button');
        fitBtn.type = 'button'; fitBtn.className = 'btn-quiet btn-sm';
        fitBtn.textContent = 'Adatta';
        fitBtn.addEventListener('click', function(){ pz.fit(); });
        head.appendChild(fitBtn);

        var pinList = document.createElement('ul');
        pinList.className = 'compare-pin-list';

        var panelCtx = { key: key, overlay: overlay, listEl: pinList, pz: pz };

        function renderPins(){
          var all = loadAnnotations();
          var pins = all[key] || [];
          overlay.innerHTML = '';
          pinList.innerHTML = '';
          if (!pins.length){
            var hint = document.createElement('li');
            hint.className = 'compare-pin-empty';
            hint.textContent = annotateToggle.checked
              ? "Clicca su un punto del disegno per segnarlo."
              : "Attiva «Modalità annotazione» per segnare punti sul disegno.";
            pinList.appendChild(hint);
            return;
          }
          pins.forEach(function(p, i){
            var r = Math.max(6, (img.naturalWidth || 800) * 0.008);
            var g = document.createElementNS(svgNS, 'g');
            g.setAttribute('class', 'pin-marker');
            var c = document.createElementNS(svgNS, 'circle');
            c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', r.toFixed(1));
            c.setAttribute('class', 'pin-dot');
            c.style.strokeWidth = Math.max(1, r * 0.14).toFixed(1);
            var t = document.createElementNS(svgNS, 'text');
            t.setAttribute('x', p.x); t.setAttribute('y', p.y + r * 0.35);
            t.setAttribute('class', 'pin-num');
            t.setAttribute('font-size', (r * 1.05).toFixed(1));
            t.textContent = (i + 1);
            var title = document.createElementNS(svgNS, 'title');
            title.textContent = p.text || ('Punto ' + (i + 1));
            g.appendChild(c); g.appendChild(t); g.appendChild(title);
            g.addEventListener('click', function(e){
              e.stopPropagation();
              var ta = pinList.querySelector('li[data-pin-id="' + p.id + '"] textarea');
              if (ta){ ta.focus(); ta.scrollIntoView({ block: 'nearest' }); }
            });
            overlay.appendChild(g);

            var li = document.createElement('li');
            li.className = 'compare-pin-item';
            li.setAttribute('data-pin-id', p.id);
            var row = document.createElement('div');
            row.className = 'compare-pin-row';
            var num = document.createElement('span');
            num.className = 'pin-num-badge';
            num.textContent = (i + 1);
            var ta = document.createElement('textarea');
            ta.value = p.text || '';
            ta.rows = 2;
            ta.placeholder = 'Descrivi questo punto…';
            ta.addEventListener('input', debounce(function(){
              updatePinText(key, p.id, ta.value);
              var titleEl = g.querySelector('title');
              if (titleEl) titleEl.textContent = ta.value || ('Punto ' + (i + 1));
            }, 350));
            var del = document.createElement('button');
            del.type = 'button'; del.className = 'compare-pin-del';
            del.setAttribute('aria-label', 'Elimina annotazione');
            del.textContent = '×';
            del.addEventListener('click', function(){
              deletePin(key, p.id);
              renderPins();
            });
            row.appendChild(num); row.appendChild(ta); row.appendChild(del);
            li.appendChild(row);
            pinList.appendChild(li);
          });
        }
        renderPins();

        // Clic (non trascinamento) sull'immagine in modalità annotazione: nuovo punto.
        var downPt = null;
        stageDiv.addEventListener('pointerdown', function(e){ downPt = { x: e.clientX, y: e.clientY }; });
        stageDiv.addEventListener('click', function(e){
          if (!annotateToggle.checked || !downPt) return;
          var dx = e.clientX - downPt.x, dy = e.clientY - downPt.y;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) return; // era un trascinamento, non un clic
          if (e.target && e.target.closest && e.target.closest('.pin-marker')) return;
          var pt = pz.clientToImage(e.clientX, e.clientY);
          var id = addPin(key, pt.x, pt.y);
          renderPins();
          var ta = pinList.querySelector('li[data-pin-id="' + id + '"] textarea');
          if (ta) ta.focus();
        });

        annotPanel.appendChild(head);
        annotPanel.appendChild(pinList);
      } else {
        stageDiv.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#B7AF9B;font-family:var(--font-mono);font-size:0.8rem;text-align:center;padding:1em;">Immagine non incorporabile in questa vista — vedi la scheda nel Corpus</div>';
        annotPanel.innerHTML = '<div class="compare-annot-head"><span>Annotazioni</span></div><p class="picker-hint" style="margin:0 0 0.6rem;">Segnare punti sul disegno richiede l\'immagine incorporata — qui puoi comunque lasciare un appunto generale.</p>';
      }

      // ---- Nota generale, sempre disponibile ----
      var noteTa = document.createElement('textarea');
      noteTa.className = 'compare-note';
      noteTa.rows = 2;
      noteTa.placeholder = 'Appunti generali su questa pagina…';
      var notesAll = loadNotes();
      noteTa.value = notesAll[key] || '';
      var noteStatus = document.createElement('span');
      noteStatus.className = 'compare-note-status';
      noteTa.addEventListener('input', debounce(function(){
        var all = loadNotes();
        all[key] = noteTa.value;
        saveNotes(all);
        noteStatus.textContent = 'Salvato nel browser';
        clearTimeout(noteStatus._t);
        noteStatus._t = setTimeout(function(){ noteStatus.textContent = ''; }, 1600);
      }, 400));
      annotPanel.appendChild(noteTa);
      annotPanel.appendChild(noteStatus);

      var cap = document.createElement('div');
      cap.className = 'compare-caption';
      cap.innerHTML = '<span>' + escapeHTML(ms.siglum) + ', f. ' + escapeHTML(page.folio) + (page.title ? ' — ' + escapeHTML(page.title) : '') + '</span>';

      var rm = document.createElement('button');
      rm.className = 'compare-remove';
      rm.type = 'button';
      rm.setAttribute('aria-label', 'Rimuovi dal confronto');
      rm.textContent = '×';
      rm.addEventListener('click', function(){
        setSelected(ms, page, false);
        buildPicker(searchInput.value);
        renderStage();
      });

      stageDiv.appendChild(cap);
      stageDiv.appendChild(rm);
      panel.appendChild(annotPanel);
      grid.appendChild(panel);
    });

    stageEl.innerHTML = '';
    stageEl.appendChild(grid);
  }

  function applyToAll(state, source){
    panzooms.forEach(function(pz){
      if (pz === source) return;
      pz.scale = state.scale; pz.tx = state.tx; pz.ty = state.ty;
      pz._apply();
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    buildPicker('');
    renderStage();

    var collapsedSaved = false;
    try { collapsedSaved = localStorage.getItem(PICKER_KEY) === '1'; } catch(e){}
    if (collapsedSaved) setPickerCollapsed(true);

    searchInput.addEventListener('input', function(){ buildPicker(searchInput.value); });
    clearBtn.addEventListener('click', function(){
      saveSelection([]);
      buildPicker(searchInput.value);
      renderStage();
    });
    pickerToggle.addEventListener('click', function(){
      setPickerCollapsed(!layoutEl.classList.contains('picker-collapsed'));
    });
    pickerReopen.addEventListener('click', function(){ setPickerCollapsed(false); });

    fitAllBtn.addEventListener('click', function(){
      panzooms.forEach(function(pz){ pz.fit(); });
    });

    annotateToggle.addEventListener('change', function(){
      stageEl.classList.toggle('annotate-active', annotateToggle.checked);
    });

    // Ridimensionamento: ricalcola solo il numero di colonne della griglia —
    // il singolo pannello aggiorna da sé i limiti di zoom (vedi viewer.js).
    window.addEventListener('resize', debounce(function(){
      var grid = stageEl.querySelector('.compare-grid');
      if (grid) grid.style.gridTemplateColumns = 'repeat(' + computeColumns(currentCount) + ', 1fr)';
    }, 120));
  });
})();
