// Vista tabellare, in tempo reale, di window.ISIDORO_CORPUS (js/data.js) —
// pensata per controllare al volo i dati man mano che vengono aggiunti e
// per copiare rapidamente una riga o un URL.
(function(){
  var DATA = window.ISIDORO_CORPUS || [];
  var body = document.getElementById('datatable-body');
  var searchInput = document.getElementById('datatable-search');
  var emptyMsg = document.getElementById('datatable-empty');
  var countEl = document.getElementById('datatable-count');
  var copyJsonBtn = document.getElementById('datatable-copy-json');
  if (!body) return; // sezione presente solo in index.html

  var rows = [];
  DATA.forEach(function(ms){
    ms.pages.forEach(function(page){
      rows.push({ ms: ms, page: page });
    });
  });

  function escapeHTML(s){
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function copyText(text, btn){
    var done = function(ok){
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = ok ? 'Copiato ✓' : 'Errore';
      setTimeout(function(){ btn.textContent = old; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done(true);
      } catch(e){ done(false); }
    }
  }

  function render(filterText){
    var q = (filterText || '').toLowerCase();
    body.innerHTML = '';
    var shown = 0;
    var lastSiglum = null;

    rows.forEach(function(r){
      var ms = r.ms, page = r.page;
      var haystack = [ms.siglum, ms.institution, page.folio, page.title, page.media, page.url, page.sourceUrl]
        .join(' ').toLowerCase();
      if (q && haystack.indexOf(q) === -1) return;
      shown++;

      var tr = document.createElement('tr');
      if (ms.siglum !== lastSiglum){ tr.className = 'datatable-group-start'; lastSiglum = ms.siglum; }

      var url = page.url || '';
      var shortUrl = url.length > 46 ? url.slice(0, 22) + '…' + url.slice(-20) : url;

      tr.innerHTML =
        '<td><b>' + escapeHTML(ms.siglum) + '</b><br><span class="dt-sub">' + escapeHTML(ms.institution) + '</span></td>' +
        '<td>' + escapeHTML(page.folio) + '</td>' +
        '<td>' + escapeHTML(page.title || '—') + '</td>' +
        '<td>' + escapeHTML(page.media || '—') + '</td>' +
        '<td>' + (page.embeddable ? '<span class="dt-yes">sì</span>' : '<span class="dt-no">no</span>') + '</td>' +
        '<td class="dt-url" title="' + escapeHTML(url) + '">' + (url ? '<code>' + escapeHTML(shortUrl) + '</code>' : '—') + '</td>' +
        '<td class="dt-actions"></td>';

      var actions = tr.querySelector('.dt-actions');
      var copyRowBtn = document.createElement('button');
      copyRowBtn.type = 'button'; copyRowBtn.className = 'btn-quiet btn-sm';
      copyRowBtn.textContent = 'Copia riga';
      copyRowBtn.addEventListener('click', function(){
        var tsv = [ms.siglum, ms.institution, page.folio, page.title || '', page.media || '', page.embeddable ? 'sì' : 'no', page.url || '', page.sourceUrl || ''].join('\t');
        copyText(tsv, copyRowBtn);
      });
      actions.appendChild(copyRowBtn);

      if (url){
        var copyUrlBtn = document.createElement('button');
        copyUrlBtn.type = 'button'; copyUrlBtn.className = 'btn-quiet btn-sm';
        copyUrlBtn.textContent = 'Copia URL';
        copyUrlBtn.addEventListener('click', function(){ copyText(url, copyUrlBtn); });
        actions.appendChild(copyUrlBtn);
      }

      body.appendChild(tr);
    });

    emptyMsg.hidden = shown > 0;
    countEl.textContent = shown + ' / ' + rows.length + ' pagine';
  }

  document.addEventListener('DOMContentLoaded', function(){
    render('');
    searchInput.addEventListener('input', function(){ render(searchInput.value); });
    copyJsonBtn.addEventListener('click', function(){
      copyText(JSON.stringify(DATA, null, 2), copyJsonBtn);
    });
  });
})();
