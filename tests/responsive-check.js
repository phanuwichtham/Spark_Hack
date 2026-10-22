document.addEventListener('DOMContentLoaded',()=>{
  const s=SPARK.store.get(),e=SPARK.util.esc,widths=[360,390,768,1280,1440];let report=[];
  const pages=['index','dashboard','cages','cage-detail.html?id=C03','record-water.html?cage=C03','risk.html?cage=C03','tasks','harvest.html?cage=C03','marketplace','order.html?product=P01','orders','order-detail.html?id='+(s.orders[0]?.id||'INVALID'),'offers','allocation','delivery','lots','lot-detail.html?id='+(s.lots[0]?.id||'INVALID'),'finance','guide'].map(p=>p.includes('.html')?p:p+'.html');
  const select=document.querySelector('#page-choice');select.innerHTML=pages.map(p=>'<option>'+e(p)+'</option>').join('');select.value='dashboard.html';
  function frame(page,width){const box=document.createElement('article');box.className='frame-box';const title=document.createElement('h2');title.textContent=width+' px · '+page;box.append(title);const iframe=document.createElement('iframe');iframe.title=page+' ที่ '+width+' px';iframe.width=width;iframe.src='../'+page;box.append(iframe);return{box,iframe};}
  function show(){const target=document.querySelector('#frames');target.replaceChildren();for(const width of widths)target.append(frame(select.value,width).box);}
  document.querySelector('#rotate-frame').onclick=()=>{const f=document.querySelector('#frames .frame-box:first-child iframe');if(f){f.width=Number(f.width)===360?768:360;f.previousElementSibling.textContent=f.width+' px · สลับแนวจำลอง (คงหน้าและข้อมูลเดิม)';}};
  document.querySelector('#show-frames').onclick=show;select.onchange=show;show();
  document.querySelector('#run-matrix').onclick=async()=>{
    const button=document.querySelector('#run-matrix');button.disabled=true;report=[];const target=document.querySelector('#frames');target.replaceChildren();
    for(const page of pages)for(const width of widths){
      const{box,iframe}=frame(page,width);target.replaceChildren(box);
      await new Promise(resolve=>{iframe.onload=()=>setTimeout(resolve,80);});
      const d=iframe.contentDocument;
      if(['orders.html','delivery.html','marketplace.html'].includes(page)){const title=d.querySelector('.card h3');if(title)title.textContent='ร้านอาหารทะเลบ้านศาลาหุมสาขาท่าเรือริมทะเลสาบSongkhlaCommunityRestaurantLongName';}
      const overflow=d.documentElement.scrollWidth>d.documentElement.clientWidth+1,broken=[...d.images].filter(i=>i.complete&&!i.naturalWidth).length;
      report.push({page,width,viewport:iframe.contentWindow.innerWidth,scrollWidth:d.documentElement.scrollWidth,overflow,brokenImages:broken,pass:!overflow&&!broken&&!!d.querySelector('h1')});
      document.querySelector('#matrix-summary').textContent='ตรวจแล้ว '+report.length+'/95 • ไม่ผ่าน '+report.filter(r=>!r.pass).length;
    }
    document.querySelector('#matrix-result').hidden=false;document.querySelector('#matrix-result').textContent=JSON.stringify({total:report.length,failed:report.filter(r=>!r.pass)},null,2);
    button.disabled=false;document.querySelector('#download-result').disabled=false;
  };
  document.querySelector('#download-result').onclick=()=>SPARK.util.download('responsive-test-results.json',JSON.stringify(report,null,2));
});
