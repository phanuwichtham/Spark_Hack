SPARK.page=function(){
  const S=SPARK,U=S.ui,s=U.state();
  const render=()=>{const q=document.querySelector('#search').value.toLowerCase(),filter=document.querySelector('#status-filter').value;U.html('#orders-list',U.allowedOrders(s).filter(o=>(o.id+' '+s.users.find(u=>u.id===o.buyerId).name).toLowerCase().includes(q)).filter(o=>filter==='all'||o.status===filter||(filter==='waiting'&&o.status==='allocated')).reverse().map(o=>U.orderCard(s,o)).join('')||U.empty('ยังไม่มีออเดอร์ที่ตรงกับรายการ','เริ่มคำขอซื้อได้จากหน้าสั่งปลา','marketplace.html','เลือกปลา'));};
  render();document.querySelector('#search').oninput=render;document.querySelector('#status-filter').onchange=render;
};
