SPARK.page=function(){
  const S=SPARK,U=S.ui,s=U.state(),u=U.user(),p=s.products.find(p=>p.id===S.util.query('product')),e=U.e;
  if(!p){U.missing('สินค้า');return;}if(!U.gate(['buyer'])){document.querySelector('#order-form').hidden=true;return;}
  const f=document.querySelector('#order-form');let step=1;f.noValidate=true;f.dataset.actionId=f.dataset.actionId||S.util.id('ACT');
  U.html('#order-product','<div class="fish-summary"><img src="assets/images/'+e(p.image)+'" alt="ภาพสร้างประกอบ '+e(p.name)+'" width="1024" height="1024"><div><h2>'+e(p.name)+'</h2><p class="small muted">'+e(p.size)+'</p><p class="product-price">'+S.util.money(p.priceSatang)+'/กก.</p></div></div><p class="small muted" style="margin-top:15px">พร้อมเสนอขาย '+S.util.kg(S.calc.offerAvailable(s,p.id))+' • รอยืนยัน</p>');
  U.html('#order-buyer',e(u.name)+'<br>'+e(u.contact)+'<br><small>บัญชีและข้อมูลติดต่อสมมติ</small>');
  f.elements.receiveDate.value=S.util.localTime(s.demoNow).slice(0,10);f.elements.receiveDate.min=f.elements.receiveDate.value;f.elements.extraDate.value=f.elements.receiveDate.value;f.elements.offerProductId.value=p.id;
  const draft=s.drafts[u.id+':order:'+p.id];if(draft)for(const[k,v]of Object.entries(draft)){if(f.elements[k]&&k!=='optin')f.elements[k].value=v;}f.elements.optin.checked=!!draft?.optin;
  function refresh(){document.querySelector('#optin-fields').hidden=!f.elements.optin.checked;const kg=Number(f.elements.kg.value)||0;U.html('#order-summary','<div class="amount-line">'+e(p.name)+'</div><div class="amount-line"><span>จำนวน</span><strong>'+S.util.kg(kg)+'</strong></div><div class="amount-line"><span>ต่อ กก.</span><strong>'+S.util.money(p.priceSatang)+'</strong></div><div class="amount-line total"><span>สินค้าโดยประมาณ</span><strong>'+S.util.money(Math.round(kg*p.priceSatang))+'</strong></div><div class="amount-line"><span>ค่าขนส่ง</span><span>รอยืนยัน</span></div>');}
  function save(){const value=Object.fromEntries(new FormData(f));value.optin=f.elements.optin.checked;try{S.domain.dispatch({type:'SAVE_DRAFT',key:'order:'+p.id,value});}catch(err){U.toast(err.message,true);}refresh();}
  function show(n){step=n;document.querySelectorAll('[data-step]').forEach(x=>x.hidden=Number(x.dataset.step)!==n);document.querySelectorAll('[data-step-label]').forEach(x=>x.classList.toggle('active',Number(x.dataset.stepLabel)===n));document.querySelector('#order-prev').hidden=n===1;document.querySelector('#order-next').hidden=n===3;document.querySelector('#order-submit').hidden=n!==3;}
  f.oninput=save;f.onchange=save;refresh();show(1);
  document.querySelector('#order-next').onclick=()=>{if(step===2){const kg=Number(f.elements.kg.value);if(!(kg>0&&kg<=S.calc.offerAvailable(U.state(),p.id))){U.toast('จำนวนต้องมากกว่า 0 และไม่เกินปริมาณพร้อมเสนอขาย',true);return;}if(!f.elements.receiveDate.value||!f.elements.window.value){U.toast('เลือกวันและช่วงเวลารับ',true);return;}}show(Math.min(3,step+1));};
  document.querySelector('#order-prev').onclick=()=>show(Math.max(1,step-1));
  document.querySelector('#minus-kg').onclick=()=>{f.elements.kg.value=Math.max(0,Number(f.elements.kg.value)-1);save();};
  document.querySelector('#plus-kg').onclick=()=>{f.elements.kg.value=Number(f.elements.kg.value)+1;save();};
  U.form(f,fd=>{if(step!==3){document.querySelector('#order-next').click();return;}return U.submit({type:'CREATE_ORDER',actionId:f.dataset.actionId,productId:p.id,...Object.fromEntries(fd),optin:fd.has('optin')},s=>'order-detail.html?id='+s.lastResultId);});
};
