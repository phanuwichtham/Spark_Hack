SPARK.page=function(){
  const S=SPARK,U=S.ui,s=U.state(),u=U.user(),e=U.e,o=U.allowedOrders(s).find(o=>o.id===S.util.query('id'));
  if(!o){U.missing('ออเดอร์ที่เข้าถึงได้ เลือกบัญชีที่เกี่ยวข้อง');return;}
  const p=s.products.find(p=>p.id===o.productId),b=s.users.find(b=>b.id===o.buyerId),d=s.deliveries.find(d=>d.orderId===o.id);
  U.html('#order-overview','<article class="card"><div class="card-head"><div><span class="cage-id">'+e(o.id)+'</span><h2>'+e(p.name)+'</h2><p class="muted">'+e(b.name)+'</p></div>'+U.tag(o.status)+'</div><dl class="key-value"><dt>วัน/ช่วงเวลารับ</dt><dd>'+e(o.receiveDate+' '+o.window)+'</dd><dt>จุดรับ / ส่ง</dt><dd>'+e(o.place)+'</dd></dl></article>');
  let action='<div class="badge-row">'+U.tag(o.buyerConfirmed?'complete':'unknown','ร้าน '+(o.buyerConfirmed?'ยืนยันแล้ว':'รอยืนยัน'))+U.tag(o.farmerConfirmed?'complete':'unknown','ผู้เลี้ยง '+(o.farmerConfirmed?'ยืนยันแล้ว':'รอยืนยัน'))+'</div>';
  if(['allocated','waiting','confirmed'].includes(o.status)&&((u.role==='buyer'&&!o.buyerConfirmed)||(u.role==='farmer'&&!o.farmerConfirmed)))action+='<button class="btn" id="confirm-order">ยืนยันออเดอร์ในบทบาทนี้</button>';
  if(u.role==='coordinator'&&o.status==='requested')action+=U.link('allocation.html','จัดสรรปลาให้ออเดอร์','btn');
  if(u.role!=='buyer'&&o.cageId)action+='<div class="actions">'+U.link('harvest.html?cage='+o.cageId,'ดูแผนจับ')+U.link('delivery.html','จัดรอบส่ง')+'</div>';
  if(d)action+='<div class="receipt-note">รอบส่ง '+e(d.id)+' • '+e(U.label(d.status))+'<br>'+e(d.appointment)+'<br>'+U.link('delivery.html','ติดตาม / บันทึกรับมอบ','btn small secondary')+'</div>';
  if(u.role==='coordinator'&&o.collected&&['received','partial'].includes(o.status))action+='<div class="actions"><button class="btn secondary" id="close-order">ปิดออเดอร์</button></div>';
  U.html('#order-actions',action);
  const reservations=s.reservations.filter(r=>r.orderId===o.id);
  U.html('#order-trace','<p class="small">'+e(o.cageId?'กระชัง '+(o.cageIds||[o.cageId]).join(', '):'รอจัดสรรกระชัง')+' → '+e(o.planId||'รอแผนจับ')+'</p>'+reservations.map(r=>'<div class="row"><span>'+e(r.id)+' • '+S.util.kg(r.kg)+' • '+e(r.status)+'</span>'+(r.lotId?U.link('lot-detail.html?id='+r.lotId,'ดูล็อต','btn small secondary'):'<small>กันจากปลามีชีวิต</small>')+'</div>').join('')+(o.offerId?'<p class="small">จากข้อเสนอ '+e(o.offerId)+'</p>':'')+'<p class="small muted">เหตุผล: '+e(o.allocationReason||'ตามการตอบรับข้อเสนอ หรือรอจัดสรร')+'</p>');
  U.html('#order-amounts','<dl class="key-value"><dt>ขอซื้อ</dt><dd>'+S.util.kg(o.requestedKg)+'</dd><dt>จัดสรร</dt><dd>'+S.util.kg(o.allocatedKg)+'</dd><dt>ชั่งจริง</dt><dd>'+S.util.kg(o.weighedKg)+'</dd><dt>รับจริง</dt><dd>'+S.util.kg(o.acceptedKg)+'</dd><dt>ราคาต่อ กก.</dt><dd>'+S.util.money(o.priceSatang)+'</dd></dl><div class="amount-line total"><span>ยอดขายรับมอบ</span><strong>'+S.util.money(Math.round(o.acceptedKg*o.priceSatang))+'</strong></div>'+U.tag(o.collected?'complete':'unknown',o.collected?'บันทึกชำระแล้วในเดโม':'ยังไม่บันทึกเก็บเงิน')+'<p class="small muted" style="margin-top:12px">ค่าใช้จ่ายหักระดับแผนครั้งเดียว ไม่หักเต็มก้อนซ้ำต่อออเดอร์</p>'+(o.issue?'<div class="notice warning" style="margin-top:15px">'+e(o.issue)+'</div>':''));
  U.html('#order-timeline',U.timeline(s,o.id));
  document.querySelector('#confirm-order')?.addEventListener('click',()=>U.act({type:'CONFIRM_ORDER',orderId:o.id}));
  document.querySelector('#close-order')?.addEventListener('click',()=>U.act({type:'CLOSE_ORDER',orderId:o.id}));
  const form=document.querySelector('#order-issue-form');form.hidden=u.role==='farmer';U.form(form,fd=>U.submit({type:'REPORT_ISSUE',orderId:o.id,issue:fd.get('issue')}));
  document.querySelector('#cancel-order').hidden=(!!o.harvested&&!o.fromLots)||['sent','received','partial','closed','cancelled'].includes(o.status);
  document.querySelector('#cancel-order').onclick=()=>{const reason=form.elements.issue.value;if(!reason.trim()){U.toast('กรอกเหตุผลยกเลิกในรายละเอียด',true);return;}U.confirm('ยกเลิกคำขอซื้อ?','คืนการกันปริมาณของออเดอร์นี้ พร้อมบันทึกเหตุผล',()=>U.submit({type:'CANCEL_ORDER',orderId:o.id,reason}));};
};
