(function(){
  var DATA = window.ISIDORO_CORPUS || [];
  var V = window.IsidoroViewer;
  var SEL_KEY = 'isidoro_selection_v1';

  var msBlocksEl = document.getElementById('ms-blocks');
  var filtersEl = document.getElementById('filters');
  var compareBar = document.getElementById('compare-bar');
  var compareCount = document.getElementById('compare-count');
  var lightbox = document.getElementById('lightbox');
  var lbImg, lbStage, panzoom;
  var flatPages = []; // {ms, page, idx}
  var currentFlatIdx = -1;

  function loadSelection(){
    try { return JSON.parse(localStorage.getItem(SEL_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function saveSelection(sel){
    localStorage.setItem(SEL_KEY, JSON.stringify(sel));
  }
  function refKey(ms, page){ return ms.siglum + '|' + page.folio; }

  function updateCompareBar(){
    var sel = loadSelection();
    if (sel.length > 0){
      compareBar.hidden = false;
      compareCount.textContent = sel.length;
    } else {
      compareBar.hidden = true;
    }
  }

  function toggleSelect(ms, page, btnEl, cardEl){
    var sel = loadSelection();
    var key = refKey(ms, page);
    var i = sel.findIndex(function(s){ return s.k === key; });
    if (i >= 0){
      sel.splice(i,1);
      cardEl.classList.remove('selected');
      btnEl.textContent = '+';
    } else {
      if (sel.length >= 6){
        alert('Puoi selezionare al massimo 6 pagine da confrontare alla volta.');
        return;
      }
      sel.push({ k: key, siglum: ms.siglum, folio: page.folio });
      cardEl.classList.add('selected');
      btnEl.textContent = '✓';
    }
    saveSelection(sel);
    updateCompareBar();
  }

  function buildFolioCard(ms, page, idx){
    var sel = loadSelection();
    var isSel = sel.some(function(s){ return s.k === refKey(ms, page); });

    var card = document.createElement('div');
    card.className = 'folio-card' + (isSel ? ' selected' : '');

    var thumb = document.createElement('div');
    thumb.className = 'folio-thumb';
    V.buildThumb(thumb, ms, page);

    var selBtn = document.createElement('button');
    selBtn.className = 'folio-select';
    selBtn.type = 'button';
    selBtn.setAttribute('aria-label', 'Aggiungi al confronto');
    selBtn.textContent = isSel ? '✓' : '+';
    selBtn.addEventListener('click', function(e){
      e.stopPropagation();
      toggleSelect(ms, page, selBtn, card);
    });
    thumb.appendChild(selBtn);

    var info = document.createElement('div');
    info.className = 'folio-info';
    info.innerHTML = '<div class="folio-folio">f. ' + escapeHTML(page.folio) + '</div>' +
      (page.title ? '<div class="folio-title">' + escapeHTML(page.title) + '</div>' : '');

    card.appendChild(thumb);
    card.appendChild(info);
    card.addEventListener('click', function(){ openLightbox(idx); });

    return card;
  }

  function escapeHTML(s){
    return (s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function render(activeSiglum){
    msBlocksEl.innerHTML = '';
    flatPages = [];
    DATA.forEach(function(ms){
      ms.pages.forEach(function(page){
        flatPages.push({ ms: ms, page: page });
      });
    });

    DATA.forEach(function(ms){
      if (activeSiglum && activeSiglum !== 'all' && ms.siglum !== activeSiglum) return;

      var block = document.createElement('section');
      block.className = 'ms-block';
      block.id = 'ms-' + ms.siglum.replace(/\W+/g,'-').toLowerCase();

      var head = document.createElement('div');
      head.className = 'ms-head';
      head.innerHTML =
        '<div><h3>' + escapeHTML(ms.siglum) + '</h3>' +
        '<div class="ms-meta">' +
          '<span><b>' + escapeHTML(ms.institution) + '</b></span>' +
          '<span>' + escapeHTML(ms.century_label) + '</span>' +
          '<span>' + escapeHTML(ms.dimensions) + '</span>' +
          '<span>' + escapeHTML(ms.folios) + '</span>' +
        '</div>' +
        (ms.note ? '<p class="ms-note">' + escapeHTML(ms.note) + '</p>' : '') +
        '</div>' +
        '<div class="ms-count">' + ms.pages.length + ' pagine con diagramma censite</div>';

      var grid = document.createElement('div');
      grid.className = 'page-grid';

      ms.pages.forEach(function(page){
        var idx = flatPages.findIndex(function(fp){ return fp.ms === ms && fp.page === page; });
        grid.appendChild(buildFolioCard(ms, page, idx));
      });

      block.appendChild(head);
      block.appendChild(grid);
      msBlocksEl.appendChild(block);
    });
  }

  function buildFilters(){
    filtersEl.innerHTML = '';
    var allBtn = filterButton('Tutti i manoscritti', 'all', true);
    filtersEl.appendChild(allBtn);
    DATA.forEach(function(ms){
      filtersEl.appendChild(filterButton(ms.siglum, ms.siglum, false));
    });
  }
  function filterButton(label, val, pressed){
    var b = document.createElement('button');
    b.className = 'filter-btn';
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.addEventListener('click', function(){
      filtersEl.querySelectorAll('.filter-btn').forEach(function(x){ x.setAttribute('aria-pressed','false'); });
      b.setAttribute('aria-pressed','true');
      render(val);
    });
    return b;
  }

  // ---------- Lightbox ----------
  function initLightbox(){
    lbImg = document.getElementById('lb-img');
    lbStage = document.getElementById('lb-stage');
    panzoom = new V.PanZoom(lbStage, lbImg);

    document.getElementById('lb-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function(e){ if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function(e){
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') stepLightbox(1);
      if (e.key === 'ArrowLeft') stepLightbox(-1);
    });
    document.getElementById('lb-zoom-in').addEventListener('click', function(){ panzoom.zoomBy(1.25); });
    document.getElementById('lb-zoom-out').addEventListener('click', function(){ panzoom.zoomBy(1/1.25); });
    document.getElementById('lb-reset').addEventListener('click', function(){ panzoom.reset(); });
    document.getElementById('lb-prev').addEventListener('click', function(){ stepLightbox(-1); });
    document.getElementById('lb-next').addEventListener('click', function(){ stepLightbox(1); });
  }

  function stepLightbox(dir){
    if (currentFlatIdx < 0) return;
    var next = currentFlatIdx + dir;
    if (next < 0) next = flatPages.length - 1;
    if (next >= flatPages.length) next = 0;
    openLightbox(next);
  }

  function openLightbox(idx){
    var entry = flatPages[idx];
    if (!entry) return;
    currentFlatIdx = idx;
    var ms = entry.ms, page = entry.page;

    document.getElementById('lb-title').textContent = ms.siglum + (page.title ? ' — ' + page.title : '');
    document.getElementById('lb-meta').textContent = 'f. ' + page.folio + ' · ' + ms.institution;
    var openLink = document.getElementById('lb-open-original');
    if (page.url){
      openLink.href = page.url; openLink.hidden = false;
    } else {
      openLink.hidden = true;
    }

    panzoom.reset();
    if (V.isEmbeddable(page)){
      lbImg.style.display = '';
      lbImg.src = page.url;
      lbImg.alt = V.folioLabel(ms, page);
      document.getElementById('lb-noimg').hidden = true;
    } else {
      lbImg.style.display = 'none';
      document.getElementById('lb-noimg').hidden = false;
    }

    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox(){
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('DOMContentLoaded', function(){
    buildFilters();
    render('all');
    initLightbox();
    updateCompareBar();

    document.getElementById('clear-selection').addEventListener('click', function(){
      saveSelection([]);
      render(document.querySelector('.filter-btn[aria-pressed="true"]').textContent === 'Tutti i manoscritti' ? 'all' :
        document.querySelector('.filter-btn[aria-pressed="true"]').textContent);
      updateCompareBar();
    });
  });
})();
