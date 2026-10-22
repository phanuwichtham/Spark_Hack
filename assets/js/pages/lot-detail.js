SPARK.page=function(){
  const S=SPARK,U=S.ui,s=U.state(),e=U.e,u=U.user(),l=s.lots.find(l=>l.id===S.util.query('id'));
  if(!l){U.missing('ล็อต');return;}
  const orders=U.allowedOrders(s).filter(o=>s.reservations.some(r=>r.orderId===o.id&&r.lotId===l.id));
  if(u.role!=='coordinator'&&l.ownerId!==u.id&&!orders.length){U.missing('ล็อตที่บัญชีนี้เข้าถึงได้');return;}
  const c=s.cages.find(c=>c.id===l.cageId),p=s.plans.find(p=>p.id===l.planId),h=s.harvests.find(h=>h.id===l.harvestId),owner=s.users.find(u=>u.id===l.ownerId);
  U.html('#lot-overview','<article class="card"><div class="card-head"><div><span class="cage-id">'+e(l.id)+'</span><h2>'+e(c.name)+'</h2><p class="small muted">เจ้าของ '+e(owner.name)+' • '+e(c.id)+'</p></div>'+U.tag(l.storage)+'</div><div class="support"><div><strong>'+S.util.kg(l.kg)+'</strong><small>น้ำหนักแรกเข้าล็อต</small></div><div><strong>'+S.util.kg(S.calc.lotRemaining(s,l))+'</strong><small>คงเหลือในล็อต</small></div></div><div class="badge-row">'+U.tag(l.quality)+'</div></article>');
  U.html('#lot-source','<dl class="key-value"><dt>กระชัง → เหตุ</dt><dd>'+e(c.id+' → '+(p.incidentId||'ขายปกติ ไม่มีเหตุ'))+'</dd><dt>แผน → จับจริง</dt><dd>'+e(p.id+' → '+h.id)+'</dd><dt>วันจับ</dt><dd>'+e(S.util.date(h.at))+'</dd><dt>ชั่งจริงทั้งรอบ</dt><dd>'+S.util.kg(h.actualKg)+'</dd><dt>ผู้ตรวจคุณภาพ</dt><dd>'+e(l.inspector||'รอตรวจ')+'</dd><dt>ที่เก็บ</dt><dd>'+e(l.storage==='cold'?p.coldPlace||'พื้นที่เย็นกลุ่มจำลอง':l.storage==='hold'?'จุดพักตรวจคุณภาพจำลอง':'จุดเตรียมส่งจำลอง')+'</dd></dl>'+(u.role!=='buyer'?'<div class="actions">'+U.link('cage-detail.html?id='+c.id,'กระชังต้นทาง')+U.link('harvest.html?cage='+c.id,'ดูแผนจับ')+'</div>':''));
  U.html('#lot-orders',orders.map(o=>'<div class="row"><div>'+e(o.id)+'<p class="small muted">'+e(U.label(o.status))+'</p></div>'+U.link('order-detail.html?id='+o.id,'เปิดออเดอร์','btn small secondary')+'</div>').join('')||'<p class="small muted">ยังไม่มีออเดอร์จากล็อตนี้ สต็อกพักเย็นไม่ใช่ยอดขาย</p>');
  U.html('#lot-timeline',U.timeline(s,p.id)+(u.role==='buyer'?orders.map(o=>U.timeline(s,o.id)).join(''):''));
};
