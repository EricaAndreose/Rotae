// Navigazione condivisa: toggle menu mobile + evidenzia la pagina corrente
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links){
      toggle.addEventListener('click', function(){
        var open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.querySelectorAll('a').forEach(function(a){
        a.addEventListener('click', function(){ links.classList.remove('open'); });
      });
    }

    var here = (document.body.getAttribute('data-page') || '').trim();
    if (here){
      document.querySelectorAll('.nav-links a[data-page]').forEach(function(a){
        if (a.getAttribute('data-page') === here){
          a.setAttribute('aria-current', 'page');
        }
      });
    }
  });
})();
