// บันทึกสำเร็จก่อนอัปเดต UI พร้อมตรวจ revision ป้องกันการเขียนทับอีกแท็บ
(function(S){
  let state=null,problem=null;
  const valid=s=>s&&s.schemaVersion===S.config.schemaVersion&&Number.isInteger(s.revision)&&['users','cages','orders','observations','incidents','tasks','plans','lots','deliveries','reservations','offers','financialEntries','audit','notifications','processedActions','products','harvests','qualityChecks','assessments'].every(k=>Array.isArray(s[k]))&&s.demoNow&&s.drafts;
  function load(){
    try{const raw=localStorage.getItem(S.config.storageKey);if(raw){const data=JSON.parse(raw);if(!valid(data))throw Error('โครงสร้างข้อมูลไม่ตรงรุ่น');state=data;}else{const next=S.seed();localStorage.setItem(S.config.storageKey,JSON.stringify(next));state=next;}}
    catch(err){problem='เปิดหรือจัดเก็บข้อมูลไม่ได้: '+err.message+' ข้อมูลเดิมยังไม่ถูกล้าง';}
  }
  S.store={
    get(){if(!state&&!problem)load();if(!state)throw Error(problem);return S.util.clone(state);},
    issue(){if(!state&&!problem)load();return problem;},
    raw(){try{return localStorage.getItem(S.config.storageKey)||'';}catch(e){return '';}},
    commit(next){
      let disk;try{disk=JSON.parse(localStorage.getItem(S.config.storageKey));}catch(e){throw Error('ข้อมูลในเครื่องเสียหาย จึงไม่เขียนทับ');}
      if(!disk||disk.revision!==state.revision)throw Error('อีกแท็บเปลี่ยนข้อมูลแล้ว โปรดโหลดหน้าใหม่ก่อนบันทึก');
      next.revision=state.revision+1;
      try{localStorage.setItem(S.config.storageKey,JSON.stringify(next));}catch(e){throw Error('บันทึกไม่สำเร็จ: พื้นที่เต็มหรือปิดการจัดเก็บ '+e.message);}
      state=next;return S.util.clone(state);
    },
    reset(scenario){const next=S.seed(scenario);let rev=0;try{rev=JSON.parse(localStorage.getItem(S.config.storageKey)).revision||0;}catch(e){}next.revision=rev+1;localStorage.setItem(S.config.storageKey,JSON.stringify(next));state=next;problem=null;return next;}
  };
  if(typeof window.addEventListener==='function')window.addEventListener('storage',event=>{if(event.key===S.config.storageKey)window.dispatchEvent(new CustomEvent('spark:external'));});
})(SPARK);
