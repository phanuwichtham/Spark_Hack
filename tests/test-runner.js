document.addEventListener('DOMContentLoaded',()=>{
  function run(){const r=SPARK.runDomainTests();document.querySelector('#summary').textContent='ผ่าน '+r.passed+'/'+r.total+' • ไม่ผ่าน '+r.failed;document.querySelector('#results').innerHTML=r.results.map(x=>'<article class="card"><strong style="color:'+(x.pass?'var(--primary)':'var(--red)')+'">'+(x.pass?'✓ ผ่าน':'✕ ไม่ผ่าน')+'</strong> '+SPARK.util.esc(x.name)+(x.error?'<p>'+SPARK.util.esc(x.error)+'</p>':'')+'</article>').join('');}
  document.querySelector('#run').onclick=run;run();
});
