/* Shared, trusted-team demo. No SDK/CDN/build step; Auth + PostgREST RPC.
   Business role switching is simulation, NOT production authorization. */
(function(S){
  'use strict';
  const cfg=S.databaseConfig||{},copy=S.util.clone,esc=S.util.esc;
  let session=null,state=null,personal={currentUserId:null,drafts:{}},busy=false,refreshing=null;
  const namespace='spark-cloud:'+cfg.url+':'+cfg.workspace;
  const sessionKey=namespace+':auth',personalKey=namespace+':personal';
  const enabled=cfg.enabled===true;
  function status(message,error=false){
    const el=document.querySelector('#cloud-status');if(el){el.textContent=message;el.className=error?'notice warning':'notice';}
  }
  function clean(value){const v=copy(value);delete v.currentUserId;delete v.drafts;delete v.lastResultId;return v;}
  function overlay(){const v=copy(state);v.currentUserId=personal.currentUserId||v.users[0].id;v.drafts=copy(personal.drafts);return v;}
  function remember(){sessionStorage.setItem(sessionKey,JSON.stringify(session));}
  function savePersonal(){sessionStorage.setItem(personalKey,JSON.stringify(personal));}
  async function request(path,body,authenticated=true){
    if(authenticated)await ensureSession();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
    try{
      const headers={'apikey':cfg.publishableKey,'Content-Type':'application/json'};
      if(authenticated)headers.Authorization='Bearer '+session.access_token;
      const response=await fetch(cfg.url+path,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        if(data.code==='40001')throw Error('ข้อมูลกลางเปลี่ยนแล้ว กดโหลดข้อมูลล่าสุดก่อนทำรายการอีกครั้ง (ร่างยังอยู่)');
        if(response.status===401)throw Error('การเข้าสู่ระบบหมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่');
        if(response.status===403||data.code==='42501')throw Error('ไม่มีสิทธิ์ในทีมนี้ หรือรายการนี้ต้องให้ผู้ดูแลทีมทำ');
        throw Error(data.msg||data.message||data.error_description||data.error||'เชื่อมต่อไม่สำเร็จ ('+response.status+')');
      }
      return data;
    }catch(error){
      if(error.name==='AbortError')throw Error('เครือข่ายหมดเวลา ยังไม่ทราบผลบันทึก กรุณาโหลดข้อมูลล่าสุดก่อนลองใหม่');
      if(error instanceof TypeError)throw Error('เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจอินเทอร์เน็ตและ URL แล้วโหลดข้อมูลล่าสุด');
      throw error;
    }finally{clearTimeout(timer);}
  }
  async function ensureSession(){
    if(!session?.access_token)throw Error('กรุณาเข้าสู่ระบบ');
    if((session.expires_at||0)>Date.now()/1000+60)return;
    if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token},false).then(data=>{session=data;session.expires_at=Math.floor(Date.now()/1000)+data.expires_in;remember();}).finally(()=>refreshing=null);
    await refreshing;
  }
  async function read(){return request('/rest/v1/rpc/spark_read',{p_workspace:cfg.workspace});}
  async function write(next,reset=false){
    if(busy)throw Error('กำลังบันทึก กรุณารอสักครู่');
    const draftsAtSubmit=copy(personal.drafts);busy=true;status('กำลังบันทึกฐานข้อมูลกลาง…');
    try{
      const result=await request('/rest/v1/rpc/spark_commit',{p_workspace:cfg.workspace,p_expected_revision:state?.revision??0,p_state:clean(next),p_reset:reset});
      // Local state changes only after the database acknowledges the write.
      state=result;
      // Clear only consumed drafts that have not been edited while the request was pending.
      for(const key of Object.keys(draftsAtSubmit))if(!(key in (next.drafts||{}))&&JSON.stringify(personal.drafts[key])===JSON.stringify(draftsAtSubmit[key]))delete personal.drafts[key];
      try{savePersonal();}catch(error){/* cloud write already acknowledged */}
      status('บันทึกฐานข้อมูลกลางแล้ว • รุ่น '+state.revision);
      return {...overlay(),lastResultId:next.lastResultId};
    }catch(error){status(error.message,true);throw error;}finally{busy=false;}
  }
  function authScreen(message=''){
    document.body.innerHTML='<main class="cloud-login card"><div class="eyebrow">ปลาศาลาหุม · พื้นที่ทีม</div><h1>เข้าสู่ระบบฐานข้อมูลกลาง</h1><p>ใช้บัญชีที่ผู้ดูแลเพิ่มให้ สมาชิกในทีมเห็นข้อมูลสาธิตชุดเดียวกัน</p><form id="cloud-login-form"><div class="field"><label for="cloud-email">อีเมล</label><input id="cloud-email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="cloud-password">รหัสผ่าน</label><input id="cloud-password" name="password" type="password" autocomplete="current-password" required></div><p id="cloud-login-error" class="notice warning" role="alert" '+(message?'':'hidden')+'>'+esc(message)+'</p><button class="btn">เข้าสู่ระบบ</button></form><p class="small muted">ใช้ข้อมูลสมมติเท่านั้น · บัญชีจริงนี้ใช้เข้าทีม ส่วนบทบาทในแอปยังเป็นเดโมที่สลับได้</p><button id="cloud-clear" class="btn secondary">ล้างการเข้าสู่ระบบในแท็บนี้</button></main>';
    document.querySelector('#cloud-clear').onclick=()=>{sessionStorage.removeItem(sessionKey);location.reload();};
    document.querySelector('#cloud-login-form').onsubmit=async event=>{
      event.preventDefault();const button=event.submitter,form=event.currentTarget,err=document.querySelector('#cloud-login-error');button.disabled=true;
      try{const fd=new FormData(form);session=await request('/auth/v1/token?grant_type=password',{email:fd.get('email'),password:fd.get('password')},false);session.expires_at=Math.floor(Date.now()/1000)+session.expires_in;remember();location.reload();}
      catch(error){err.textContent=error.message;err.hidden=false;}finally{button.disabled=false;}
    };
  }
  const cloud=S.cloud={
    enabled,
    async init(){
      if(!enabled)return true;
      try{
        if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url)||!cfg.workspace||!cfg.publishableKey)throw Error('ตั้งค่า database-config.js ให้ครบก่อนเปิดโหมดฐานข้อมูลกลาง');
        if(cfg.publishableKey.startsWith('sb_secret_'))throw Error('ห้ามใช้ secret key ในเว็บ เปลี่ยนเป็น publishable key ทันที');
        if(cfg.publishableKey.startsWith('eyJ')){try{const claims=JSON.parse(atob(cfg.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claims.role!=='anon')throw Error('ใช้ legacy anon key เท่านั้น');}catch(error){throw Error('API key ไม่ถูกต้อง ห้ามใช้ service_role');}}
        session=JSON.parse(sessionStorage.getItem(sessionKey)||'null');personal=JSON.parse(sessionStorage.getItem(personalKey)||'null')||personal;
        if(!session){authScreen();return false;}
        state=await read();
        if(!state){const seed=S.seed('normal');await write(seed,true);}
        // Authentication is independent of role simulation. Never share selected role/drafts.
        if(!state.users.some(u=>u.id===personal.currentUserId))personal.currentUserId='R01';
        S.store={get:overlay,issue:()=>null,raw:()=>JSON.stringify(overlay()),commit:write,
          async reset(scenario){const next=S.seed(scenario);await write(next,true);personal.currentUserId=next.currentUserId;personal.drafts={};savePersonal();return overlay();}};
        S.domain.dispatch=function(action){
          const next=S.domain.reduce(overlay(),{actionId:S.util.id('ACT'),...action});
          if(['SET_USER','SAVE_DRAFT'].includes(action.type)){const previous=personal;personal={currentUserId:next.currentUserId,drafts:next.drafts};try{savePersonal();}catch(error){personal=previous;throw Error('บันทึกร่างในแท็บไม่ได้');}return overlay();}
          return write(next);
        };
        setInterval(()=>cloud.poll(),Math.max(5000,Number(cfg.pollMilliseconds)||12000));
        return true;
      }catch(error){authScreen(error.message);return false;}
    },
    async poll(){
      if(!state||busy||document.hidden)return;
      try{const fresh=await read();if(fresh&&fresh.revision!==state.revision)status('มีข้อมูลใหม่จากสมาชิก กดโหลดข้อมูลล่าสุดก่อนทำรายการ • ไม่รีเฟรชทับฟอร์มที่กำลังกรอก',true);}
      catch(error){status(error.message,true);}
    },
    mount(){
      if(!enabled)return;
      let bar=document.querySelector('#cloud-bar');
      if(!bar){bar=document.createElement('section');bar.id='cloud-bar';bar.className='cloud-bar';document.querySelector('main')?.prepend(bar);}
      if(!bar)return;
      bar.innerHTML='<div id="cloud-status" class="notice" role="status">ฐานข้อมูลกลาง • '+esc(cfg.workspace)+' • รุ่น '+state.revision+'</div><div class="actions"><button class="btn small secondary" id="cloud-refresh">โหลดข้อมูลล่าสุด</button><button class="btn small secondary" id="cloud-logout">ออกจากระบบ</button></div>';
      document.querySelector('#cloud-refresh').onclick=()=>{if(!S.ui.dirty||confirm('โหลดข้อมูลล่าสุด? ร่างค่าน้ำ/คำสั่งซื้อที่บันทึกไว้ยังอยู่ แต่ช่องอื่นที่ยังไม่บันทึกอาจหาย')){S.ui.dirty=false;location.reload();}};
      document.querySelector('#cloud-logout').onclick=async()=>{
        if(S.ui.dirty&&!confirm('มีช่องที่ยังไม่บันทึก ต้องการออกจากระบบ?'))return;
        if(busy){S.ui.toast('รอให้บันทึกเสร็จก่อนออกจากระบบ',true);return;}
        try{await request('/auth/v1/logout',{});}catch(error){/* local sign-out still succeeds */}
        sessionStorage.removeItem(sessionKey);sessionStorage.removeItem(personalKey);S.ui.dirty=false;location.reload();
      };
    }
  };
})(SPARK);
