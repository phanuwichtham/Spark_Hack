(function(){
'use strict';
const cfg=window.SPARK.databaseConfig||{},status=document.querySelector('#status'),requestForm=document.querySelector('#request'),updateForm=document.querySelector('#update');
const params=new URLSearchParams(location.hash.slice(1));
let token=params.get('access_token');
const recovery=params.get('type')==='recovery',linkError=params.get('error_description')||params.get('error');
// Remove credentials from the address bar before any network request. Never store them.
history.replaceState(null,'',location.pathname);
function say(message){status.textContent=message;}
async function api(path,body,access,method='POST'){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
 try{const headers={'apikey':cfg.publishableKey,'Content-Type':'application/json'};if(access)headers.Authorization='Bearer '+access;
 const response=await fetch(cfg.url+path,{method,headers,signal:controller.signal,...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.msg||data.message||data.error_description||data.error||'ทำรายการไม่สำเร็จ กรุณาขอลิงก์ใหม่');return data;
 }catch(e){if(e.name==='AbortError')throw Error('การเชื่อมต่อหมดเวลา กรุณาลองเข้าสู่ระบบด้วยรหัสใหม่ก่อนทำซ้ำ');throw e;}finally{clearTimeout(timer);}
}
async function init(){
 if(!cfg.enabled||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url||'')||!cfg.publishableKey||cfg.publishableKey.startsWith('sb_secret_')){token=null;say('กรุณาตั้งค่า assets/js/database-config.js ด้วย URL และ Publishable key ของโปรเจกต์');return;}
 if(token&&recovery&&!linkError){try{await api('/auth/v1/user',null,token,'GET');updateForm.hidden=false;say('กรอกรหัสผ่านใหม่อย่างน้อย 8 ตัว และให้ผ่านเงื่อนไขของโปรเจกต์');return;}catch(e){say('ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่');}}
 else say(linkError?'ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่':'กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่');
 token=null;requestForm.hidden=false;
}
requestForm.onsubmit=async e=>{e.preventDefault();const button=requestForm.querySelector('button');button.disabled=true;
 try{const redirect=new URL('reset-password.html',location.href).href;await api('/auth/v1/recover?redirect_to='+encodeURIComponent(redirect),{email:document.querySelector('#email').value.trim()});say('หากอีเมลนี้มีบัญชี ระบบจะส่งลิงก์ให้ กรุณาตรวจกล่องจดหมายและสแปม แล้วใช้ลิงก์ฉบับล่าสุด');}catch(error){say(error.message);}finally{button.disabled=false;}};
updateForm.onsubmit=async e=>{e.preventDefault();const password=document.querySelector('#password'),confirmation=document.querySelector('#confirm'),button=updateForm.querySelector('button');
 if(password.value!==confirmation.value){say('รหัสผ่านทั้งสองช่องไม่ตรงกัน');return;}button.disabled=true;
 try{await api('/auth/v1/user',{password:password.value},token,'PUT');token=null;password.value='';confirmation.value='';updateForm.hidden=true;say('บันทึกรหัสผ่านใหม่แล้ว กลับหน้าเข้าสู่ระบบและใช้รหัสผ่านใหม่ได้เลย');}catch(error){say(error.message);}finally{button.disabled=false;}};
init();
})();