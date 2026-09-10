(function(){
  var DATA = window.ISIDORO_CORPUS || [];
  var V = window.IsidoroViewer;
  var SEL_KEY = 'isidoro_selection_v1';

  var pickerList = document.getElementById('picker-list');
  var searchInput = document.getElementById('picker-search');
  var stageEl = document.getElementById('compare-stage');
  var syncToggle = document.getElementById('sync-toggle');
  var clearBtn = document.getElementById('clear-all');

  var flat = [];
  DATA.forEach(function(ms){ ms.pages.forEach(function(page){ flat.push({ ms: ms, page: page }); }); });

  function refKey(ms, page){ return ms.siglum + '|' + page.folio; }
  function escapeHTML(s){
    return (s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

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

  var panzooms = [];

  function renderStage(){
    var sel = loadSelection();
    panzooms = [];
    if (!sel.length){
      stageEl.innerHTML = '<div class="compare-empty">Seleziona due o più pagine dall\'elenco a sinistra per confrontarle affiancate. Lo zoom e lo spostamento possono restare sincronizzati fra i pannelli.</div>';
      return;
    }
    var grid = document.createElement('div');
    grid.className = 'compare-grid';
    grid.style.gridTemplateColumns = sel.length === 1 ? '1fr' : (window.innerWidth < 700 ? '1fr' : 'repeat(' + Math.min(sel.length,3) + ', 1fr)');

    sel.forEach(function(s){
      var entry = flat.find(function(e){ return refKey(e.ms, e.page) === s.k; });
      if (!entry) return;
      var ms = entry.ms, page = entry.page;

      var panel = document.createElement('div');
      panel.className = 'compare-panel';

      if (V.isEmbeddable(page)){
        var img = document.createElement('img');
        img.src = page.url;
        img.alt = V.folioLabel(ms, page);
        img.addEventListener('error', function(){
          panel.innerHTML = '<div class="ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#B7AF9B;">Immagine non incorporabile</div>' + panel.innerHTML;
        });
        panel.appendChild(img);
        var pz = new V.PanZoom(panel, img, {
          onChange: function(state){ if (syncToggle.checked) applyToAll(state, pz); }
        });
        panzooms.push(pz);
      } else {
        panel.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#B7AF9B;font-family:var(--font-mono);font-size:0.8rem;text-align:center;padding:1em;">Immagine non incorporabile in questa vista — vedi la scheda nel Corpus</div>';
      }

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

      panel.appendChild(cap);
      panel.appendChild(rm);
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
    searchInput.addEventListener('input', function(){ buildPicker(searchInput.value); });
    clearBtn.addEventListener('click', function(){
      saveSelection([]);
      buildPicker(searchInput.value);
      renderStage();
    });
    window.addEventListener('resize', function(){ renderStage(); });
  });
})();
