SPARK.page=function(){
  const S=SPARK,U=S.ui,s=U.state(),u=U.user(),e=U.e,cages=U.allowedCages(s),orders=U.allowedOrders(s),plans=U.allowedPlans(s);
  const tasks=s.tasks.filter(t=>t.status!=='done'&&(cages.some(c=>c.id===t.cageId)||t.assignee===u.id));
  const metric=(href,label,value,sub,icon)=>'<a class="card metric-card link-card" href="'+href+'">'+U.icon(icon)+'<span class="metric-label">'+label+'</span><strong class="metric">'+value+'</strong><small class="muted">'+sub+'</small></a>';
  U.html('#dashboard-greeting','<p class="muted" style="margin-bottom:22px">สวัสดี '+e(u.name)+' · '+S.config.roleNames[u.role]+' <span class="tag">ข้อมูลสมมติ</span></p>');
  if(u.role==='buyer'){
    U.html('#dashboard-metrics',metric('orders.html','คำขอและออเดอร์',orders.length,'ของร้านที่เลือก','order')+metric('offers.html','ข้อเสนอรอคำตอบ',s.offers.filter(o=>o.buyerId===u.id&&o.status==='sent').length,'เฉพาะข้อเสนอในเว็บ','offer')+metric('delivery.html','รอบส่งที่เกี่ยวข้อง',s.deliveries.filter(d=>orders.some(o=>o.id===d.orderId)).length,'ดูนัดรับและรับมอบ','truck')+metric('marketplace.html','ปลาพร้อมเสนอขาย',S.util.kg(S.calc.offerAvailable(s,'P01')),'รอผู้ประสานยืนยัน','fish'));
    document.querySelector('#dashboard-section-title').textContent='ออเดอร์ล่าสุดของร้าน';
    U.html('#dashboard-cages',orders.slice(-4).reverse().map(o=>U.orderCard(s,o)).join('')||U.empty('ยังไม่มีคำขอซื้อ','เลือกปลาแล้วส่งคำขอซื้อ','marketplace.html','เลือกปลา'));
  }else{
    const unpaid=plans.reduce((n,p)=>n+S.calc.finance(s,p.id).unpaid,0);
    U.html('#dashboard-metrics',metric('cages.html','กระชังต้องเร่งตรวจ',cages.filter(c=>U.risk(s,c).urgency==='urgent').length,'ดูหลักฐานและข้อมูลที่ขาด','water')+metric('tasks.html','งานที่ยังไม่เสร็จ',tasks.length,'รับงานและบันทึกผลติดตาม','task')+metric('cages.html','ข้อมูลต้องเพิ่มเติม',cages.filter(c=>U.risk(s,c).dataQuality!=='complete').length,'ข้อมูลขาด เก่า หรือต้องตรวจ','clock')+metric('finance.html','เงินสุทธิค้างจ่าย',S.util.money(unpaid),'แยกจากเงินจ่ายแล้ว','money'));
    U.html('#dashboard-cages',cages.slice().sort((a,b)=>(U.risk(s,a).urgency==='urgent'?-1:1)-(U.risk(s,b).urgency==='urgent'?-1:1)).slice(0,4).map(c=>U.cageCard(s,c)).join(''));
  }
  U.html('#dashboard-next',tasks.slice(0,3).map(t=>'<a class="card link-card" href="tasks.html?incident='+e(t.incidentId)+'"><div class="card-head"><h3>'+e(t.description)+'</h3>'+U.tag(t.status)+'</div><p class="small muted">'+e(t.cageId)+' • '+e(S.util.date(t.dueAt))+'</p></a>').join('')+orders.filter(o=>['requested','allocated','waiting'].includes(o.status)).slice(0,3).map(o=>'<a class="card link-card" href="order-detail.html?id='+e(o.id)+'"><h3>ออเดอร์ '+e(o.id)+'</h3><p class="small muted">'+e(U.label(o.status))+' • '+S.util.kg(o.requestedKg)+'</p></a>').join('')||U.empty('เริ่มต้นงานถัดไป','เลือกกระชังเพื่อบันทึกค่าน้ำ หรือเริ่มส่งคำขอซื้อ',u.role==='buyer'?'marketplace.html':'cages.html','เริ่มทดลอง'));
};
