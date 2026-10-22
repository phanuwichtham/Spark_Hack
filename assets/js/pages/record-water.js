SPARK.page=function(){
  const S=SPARK,U=S.ui,s=U.state(),u=U.user(),c=U.allowedCages(s).find(c=>c.id===S.util.query('cage'));
  if(!c){U.missing('กระชังที่บัญชีนี้บันทึกได้');return;}
  document.querySelector('#water-cage-title').textContent='กระชัง '+c.id+' • '+c.name;
  const f=document.querySelector('#water-form'),draft=s.drafts[u.id+':water:'+c.id];
  // ไม่เติมค่าน้ำปกติให้ฟอร์ม ค่าว่างหมายถึงไม่มีข้อมูล
  for(const k of ['do','temperature','salinity','ph','point','note'])f.elements[k].value=draft?.[k]??'';
  f.elements.measuredAt.value=draft?.measuredAt||S.util.localTime(s.demoNow);f.elements.symptomAt.value=draft?.symptomAt||S.util.localTime(s.demoNow);
  f.elements.source.value=draft?.source||'กรอกเอง';f.elements.instrument.value=draft?.instrument||'ยังไม่ยืนยัน';
  f.querySelectorAll('[name=symptoms]').forEach(x=>x.checked=(draft?.symptoms||[]).includes(x.value));
  const latest=S.calc.latest(s,c.id);
  U.html('#last-saved-water',latest?'<p class="small muted">'+U.e(S.util.date(latest.measuredAt))+' • '+U.e(latest.source)+'</p><dl class="key-value">'+Object.keys(S.config.units).map(k=>'<dt>'+U.e(k)+' '+S.config.units[k]+'</dt><dd>'+U.e(latest.values[k]??'ไม่มีข้อมูล')+'</dd>').join('')+'</dl><p class="small">อาการ: '+U.e(latest.symptoms.join(', ')||'ยังไม่พบอาการที่ระบุ')+'</p><div class="actions">'+U.link('risk.html?cage='+c.id,'ดูผลจากชุดล่าสุด','btn small secondary')+'</div>':U.empty('ยังไม่มีข้อมูล'));
  const save=()=>{const fd=new FormData(f),d=Object.fromEntries(fd);d.symptoms=fd.getAll('symptoms');try{S.domain.dispatch({type:'SAVE_DRAFT',key:'water:'+c.id,value:d});document.querySelector('#draft-status').textContent='เก็บร่างแล้ว • ยังไม่ประเมิน';}catch(err){document.querySelector('#draft-status').textContent='เก็บร่างไม่สำเร็จ';U.toast(err.message,true);}};
  f.oninput=save;f.onchange=save;document.querySelector('#save-water-draft').onclick=save;
  U.form(f,fd=>{const d=Object.fromEntries(fd);return U.submit({type:'RECORD_WATER',actionId:f.dataset.actionId||(f.dataset.actionId=S.util.id('ACT')),cageId:c.id,...d,values:Object.fromEntries(Object.keys(S.config.units).map(k=>[k,d[k]])),symptoms:fd.getAll('symptoms'),measuredAt:S.util.fromThaiTime(d.measuredAt),symptomAt:S.util.fromThaiTime(d.symptomAt)},'risk.html?cage='+c.id);});
};
