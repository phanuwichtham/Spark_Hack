SPARK.page=function(){
  const S=SPARK,U=S.ui,s=U.state(),u=U.user();
  if(!U.gate(['farmer','coordinator'])){U.html('#cage-list',U.empty('เลือกบทบาทผู้เลี้ยงหรือผู้ประสาน','ร้านเริ่มจากหน้าสั่งปลา','marketplace.html','สั่งปลา'));document.querySelector('#add-cage-section').hidden=true;return;}
  const render=()=>{
    const q=document.querySelector('#search').value.toLowerCase(),filter=document.querySelector('#risk-filter').value;
    U.html('#cage-list',U.allowedCages(s).filter(c=>(c.id+' '+c.name).toLowerCase().includes(q)).filter(c=>{const r=U.risk(s,c);return filter==='all'||filter===r.urgency||(filter==='unknown'&&r.dataQuality!=='complete');}).map(c=>U.cageCard(s,c)).join('')||U.empty('ไม่พบกระชังที่ตรงกับการค้นหา'));
  };
  render();document.querySelector('#search').oninput=render;document.querySelector('#risk-filter').onchange=render;
  U.html('#ownerId',s.users.filter(x=>x.role==='farmer'&&(u.role==='coordinator'||x.id===u.id)).map(x=>'<option value="'+x.id+'">'+U.e(x.name)+'</option>').join(''));
  U.form(document.querySelector('#add-cage-form'),fd=>U.submit({type:'ADD_CAGE',...Object.fromEntries(fd)},s=>'cage-detail.html?id='+s.lastResultId));
};
