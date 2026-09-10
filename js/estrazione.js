(function(){
  var fileInput = document.getElementById('demo-file');
  var dropZone = document.getElementById('demo-drop');
  var stage = document.getElementById('demo-stage');
  var statusEl = document.getElementById('demo-status');
  var outEl = document.getElementById('demo-out');
  var runBtn = document.getElementById('demo-run');
  var keyInput = document.getElementById('demo-key');
  var modelInput = document.getElementById('demo-model');
  var taskSelect = document.getElementById('demo-task');

  var currentImage = null; // { dataUrl, mediaType, base64, width, height }

  function setStatus(msg, isErr){
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('err', !!isErr);
  }

  function loadFile(file){
    if (!file || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)){
      setStatus('Formato non supportato: usa JPG, PNG o WebP.', true);
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e){
      var dataUrl = e.target.result;
      var img = new Image();
      img.onload = function(){
        currentImage = {
          dataUrl: dataUrl,
          mediaType: file.type,
          base64: dataUrl.split(',')[1],
          width: img.naturalWidth,
          height: img.naturalHeight
        };
        stage.innerHTML = '<img src="' + dataUrl + '" alt="Immagine caricata per il test">';
        runBtn.disabled = false;
        setStatus('Immagine caricata (' + img.naturalWidth + '×' + img.naturalHeight + 'px). Pronta per l\'estrazione.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  dropZone.addEventListener('click', function(){ fileInput.click(); });
  dropZone.addEventListener('dragover', function(e){ e.preventDefault(); dropZone.classList.add('drag'); });
  dropZone.addEventListener('dragleave', function(){ dropZone.classList.remove('drag'); });
  dropZone.addEventListener('drop', function(e){
    e.preventDefault(); dropZone.classList.remove('drag');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function(){
    if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
  });

  function promptFor(task){
    if (task === 'testo'){
      return 'Analizza questa immagine di un diagramma o rota manoscritta medievale. ' +
        'Individua ogni parola o breve etichetta scritta visibile (anche in latino abbreviato) e la sua posizione approssimativa. ' +
        'Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo né backtick, nel formato: ' +
        '{"parole":[{"testo":"...", "x":0-100, "y":0-100, "w":0-100, "h":0-100}]}. ' +
        'x,y,w,h sono percentuali rispetto alla larghezza/altezza dell\'immagine, con (0,0) in alto a sinistra. Se non trovi testo, restituisci un array vuoto.';
    }
    return 'Analizza questa immagine di un diagramma o rota manoscritta medievale. ' +
      'Elenca i principali elementi grafici del disegno (es. cerchi concentrici, settori radiali, linee di intersezione, riquadri, figure) con una brevissima descrizione e la loro posizione approssimativa. ' +
      'Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo né backtick, nel formato: ' +
      '{"elementi":[{"tipo":"...", "descrizione":"...", "x":0-100, "y":0-100}]}.';
  }

  function stripFences(text){
    return text.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
  }

  runBtn.addEventListener('click', function(){
    if (!currentImage){ setStatus('Carica prima un\'immagine.', true); return; }
    var key = keyInput.value.trim();
    if (!key){ setStatus('Inserisci una API key di Anthropic (usata solo nel browser, non viene salvata).', true); return; }
    var model = (modelInput.value || 'claude-sonnet-5').trim();
    var task = taskSelect.value;

    runBtn.disabled = true;
    setStatus('Invio della richiesta al modello…');
    outEl.innerHTML = '';
    clearOverlay();

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: currentImage.mediaType, data: currentImage.base64 } },
            { type: 'text', text: promptFor(task) }
          ]
        }]
      })
    })
    .then(function(res){
      if (!res.ok){
        return res.json().catch(function(){ return {}; }).then(function(errBody){
          throw new Error('Errore API (' + res.status + '): ' + (errBody.error && errBody.error.message ? errBody.error.message : res.statusText));
        });
      }
      return res.json();
    })
    .then(function(data){
      var textBlock = (data.content || []).find(function(b){ return b.type === 'text'; });
      if (!textBlock) throw new Error('Risposta senza contenuto testuale.');
      var parsed = JSON.parse(stripFences(textBlock.text));
      renderResult(task, parsed);
      setStatus('Estrazione completata.');
    })
    .catch(function(err){
      var msg = err.message || String(err);
      if (/Failed to fetch/i.test(msg)){
        msg += ' — probabile blocco CORS o rete: alcuni browser/estensioni impediscono la chiamata diretta ad api.anthropic.com da una pagina statica.';
      }
      setStatus(msg, true);
    })
    .finally(function(){ runBtn.disabled = false; });
  });

  function clearOverlay(){
    var old = stage.querySelector('.demo-overlay-svg');
    if (old) old.remove();
  }

  function renderResult(task, parsed){
    clearOverlay();
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'demo-overlay-svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    var items = task === 'testo' ? (parsed.parole || []) : (parsed.elementi || []);
    var rows = [];

    items.forEach(function(it){
      if (task === 'testo'){
        var x = clampPct(it.x), y = clampPct(it.y), w = clampPct(it.w || 8), h = clampPct(it.h || 4);
        var rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', x); rect.setAttribute('y', y);
        rect.setAttribute('width', w); rect.setAttribute('height', h);
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', '#A3402C');
        rect.setAttribute('stroke-width', '0.35');
        svg.appendChild(rect);
        rows.push('<tr><td>' + escapeHTML(it.testo || '') + '</td><td>x ' + x.toFixed(0) + '%, y ' + y.toFixed(0) + '%</td></tr>');
      } else {
        var cx = clampPct(it.x), cy = clampPct(it.y);
        var circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', '1.4');
        circle.setAttribute('fill', '#2C4A66');
        svg.appendChild(circle);
        rows.push('<tr><td>' + escapeHTML(it.tipo || '') + '</td><td>' + escapeHTML(it.descrizione || '') + '</td></tr>');
      }
    });

    stage.appendChild(svg);

    var head = task === 'testo' ? '<tr><th>Testo rilevato</th><th>Posizione</th></tr>' : '<tr><th>Elemento</th><th>Descrizione</th></tr>';
    outEl.innerHTML = rows.length
      ? '<table><thead>' + head + '</thead><tbody>' + rows.join('') + '</tbody></table>'
      : '<p class="field-hint">Nessun elemento restituito dal modello per questa immagine.</p>';
  }

  function clampPct(n){
    n = Number(n); if (isNaN(n)) n = 0;
    return Math.min(100, Math.max(0, n));
  }
  function escapeHTML(s){
    return (s || '').toString().replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
})();
