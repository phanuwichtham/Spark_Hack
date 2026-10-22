SPARK.page=function(){
  const S=SPARK,U=S.ui;
  document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>U.scenario(b.dataset.scenario));
  document.querySelector('#export-state').onclick=()=>S.util.download('spark-fish-backup.json',JSON.stringify(U.state(),null,2));
  document.querySelector('#reset-demo').onclick=()=>U.scenario('normal');
  document.querySelector('#advance-clock').disabled=U.user().role!=='coordinator';
  document.querySelector('#advance-clock').onclick=()=>U.act({type:'ADVANCE_CLOCK',hours:24});
};
