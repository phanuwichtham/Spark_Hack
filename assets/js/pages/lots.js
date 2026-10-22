SPARK.page=function(){
  const S=SPARK,U=S.ui,s=U.state(),e=U.e;
  if(!U.gate(['farmer','coordinator'])){U.html('#lot-list',U.empty('ร้านตรวจที่มาผ่านออเดอร์ของตน','เปิดออเดอร์เพื่อดูลอตที่เกี่ยวข้อง','orders.html','ออเดอร์'));return;}
  const cages=U.allowedCages(s).map(c=>c.id);
  U.html('#lot-list',s.lots.filter(l=>cages.includes(l.cageId)).map(l=>'<article class="card"><div class="card-head"><div><span class="cage-id">'+e(l.id)+'</span><h3>'+e(s.cages.find(c=>c.id===l.cageId).name)+'</h3></div>'+U.tag(l.storage)+'</div><dl class="key-value"><dt>น้ำหนักแรกเข้าล็อต</dt><dd>'+S.util.kg(l.kg)+'</dd><dt>คงเหลือในล็อต</dt><dd>'+S.util.kg(S.calc.lotRemaining(s,l))+'</dd><dt>กระชังต้นทาง</dt><dd>'+e(l.cageId)+'</dd></dl><div class="badge-row">'+U.tag(l.quality)+'</div><div class="actions">'+U.link('lot-detail.html?id='+l.id,'ตรวจย้อนกลับ →')+(l.quality==='passed'&&l.storage==='cold'&&U.user().role==='coordinator'?U.link('allocation.html','จัดสรรล็อตให้คำขอซื้อ'):'')+'</div></article>').join('')||U.empty('ยังไม่มีล็อตหลังจับ','ล็อตเกิดเมื่อบันทึกน้ำหนักชั่งจริง','harvest.html','ดูแผนจับ'));
};
