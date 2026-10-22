// Node-only contract tests. Fake network, not a live Supabase project.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),DB={state:null,fail:false,wait:null,calls:[],members:new Set(['alice','bob']),admins:new Set(['alice'])};
const clone=x=>JSON.parse(JSON.stringify(x));
function client(user,options={}){
  const memory=new Map(),ctx={console,Intl,Date,Math,JSON,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,
    crypto:require('node:crypto').webcrypto,setInterval:()=>0,
    sessionStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},
    localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},document:{hidden:false,body:{innerHTML:''},querySelector:()=>null},
    fetch:async(url,req)=>{
      const body=JSON.parse(req.body),user=req.headers.Authorization?.slice(7);DB.calls.push({url,body,headers:req.headers});
      const result=(data,status=200)=>({ok:status<400,status,json:async()=>clone(data)});
      if(url.includes('grant_type=refresh_token'))return result({access_token:body.refresh_token,refresh_token:body.refresh_token,expires_in:3600});
      if(!DB.members.has(user))return result({code:'42501'},403);
      if(url.endsWith('spark_read'))return result(DB.state);
      if(DB.fail)return result({message:'Simulated write failure'},500);
      if(DB.wait)await DB.wait;
      if(body.p_expected_revision!==(DB.state?.revision||0))return result({code:'40001'},409);
      if((body.p_reset||!DB.state)&&!DB.admins.has(user))return result({code:'42501'},403);
      DB.state={...clone(body.p_state),revision:(DB.state?.revision||0)+1};return result(DB.state);
    }};
  ctx.window=ctx;vm.createContext(ctx);
  for(const n of ['config','utils','demo-data','calculations','risk-engine','store','domain','database-config'])vm.runInContext(fs.readFileSync(path.join(root,'assets/js',n+'.js'),'utf8'),ctx);
  Object.assign(ctx.SPARK.databaseConfig,{enabled:true,url:'https://test.supabase.co',publishableKey:'sb_publishable_test',...options});
  memory.set('spark-cloud:https://test.supabase.co:spark-team:auth',JSON.stringify({access_token:user,refresh_token:user,expires_at:options.expired?0:Date.now()/1000+3600}));
  vm.runInContext(fs.readFileSync(path.join(root,'assets/js/cloud.js'),'utf8'),ctx);
  ctx.SPARK.testContext=ctx;return ctx.SPARK;
}
let passed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name,e);process.exitCode=1;}}
(async()=>{
  const a=client('alice');
  await test('first admin initializes shared demo once',async()=>{assert.equal(await a.cloud.init(),true);assert.equal(DB.state.revision,1);assert.equal(DB.state.currentUserId,undefined);assert.equal(DB.state.drafts,undefined);});
  const b=client('bob');await b.cloud.init();
  await test('second device reads same revision and no reseed',()=>{assert.equal(b.store.get().revision,1);});
  await test('role switching stays local and does not send RPC',()=>{const count=DB.calls.length;a.domain.dispatch({type:'SET_USER',userId:'F01'});assert.equal(a.store.get().currentUserId,'F01');assert.equal(b.store.get().currentUserId,'R01');assert.equal(DB.calls.length,count);});
  await test('drafts are personal and do not send RPC',()=>{const count=DB.calls.length;a.domain.dispatch({type:'SAVE_DRAFT',key:'water:C01',value:{do:'5'}});assert.equal(a.store.get().drafts['F01:water:C01'].do,'5');assert.equal(b.store.get().drafts['F01:water:C01'],undefined);assert.equal(DB.calls.length,count);});
  await test('write is visible to another newly loaded device',async()=>{a.domain.dispatch({type:'SET_USER',userId:'CO01'});await a.domain.dispatch({type:'ADVANCE_CLOCK',hours:24});const fresh=client('bob');await fresh.cloud.init();assert.equal(fresh.store.get().revision,2);assert.equal(fresh.store.get().demoNow,a.store.get().demoNow);});
  await test('stale writer rejected without overwriting local or remote state',async()=>{await assert.rejects(b.domain.dispatch({type:'CREATE_ORDER',productId:'P01',kg:5,receiveDate:b.store.get().demoNow.slice(0,10),place:'test',window:'09:00'}),/ข้อมูลกลางเปลี่ยน/);assert.equal(b.store.get().revision,1);assert.equal(DB.state.orders.length,0);});
  await test('network failure does not announce a successful write',async()=>{DB.fail=true;await assert.rejects(a.domain.dispatch({type:'ADVANCE_CLOCK',hours:24}),/Simulated/);DB.fail=false;assert.equal(a.store.get().revision,2);assert.equal(DB.state.revision,2);});
  await test('duplicate clicks while pending cannot submit a second write',async()=>{let done;DB.wait=new Promise(r=>done=r);const promise=a.domain.dispatch({type:'ADVANCE_CLOCK',hours:24});await assert.rejects(a.domain.dispatch({type:'ADVANCE_CLOCK',hours:24}),/กำลังบันทึก/);done();DB.wait=null;await promise;assert.equal(a.store.get().revision,3);});
  await test('only admin may call reset RPC',async()=>{const fresh=client('bob');await fresh.cloud.init();await assert.rejects(fresh.store.reset('urgent'),/ไม่มีสิทธิ์/);assert.equal(DB.state.revision,3);});
  await test('reset is shared but selected role remains independent',async()=>{await a.store.reset('urgent');assert.equal(a.store.get().currentUserId,'F01');const fresh=client('bob');await fresh.cloud.init();assert.equal(fresh.store.get().scenario,'urgent');assert.equal(fresh.store.get().currentUserId,'R01');});
  await test('expired auth token is refreshed before RPC',async()=>{const expired=client('bob',{expired:true});assert.equal(await expired.cloud.init(),true);assert.ok(DB.calls.some(c=>c.url.includes('grant_type=refresh_token')));});
  await test('publishable key is apikey only; JWT is Authorization',()=>{const call=DB.calls.find(c=>c.url.endsWith('spark_read'));assert.equal(call.headers.apikey,'sb_publishable_test');assert.equal(call.headers.Authorization,'Bearer alice');});
  await test('local demo remains synchronous when cloud disabled',()=>{const local=client('alice',{enabled:false});assert.equal(local.cloud.enabled,false);const result=local.domain.dispatch({type:'SET_USER',userId:'CO01'});assert.equal(result.currentUserId,'CO01');assert.equal(result.then,undefined);});
  for(const [name,user,options] of [['nonmember is blocked','stranger',{}],['secret key blocked before network','alice',{publishableKey:'sb_secret_NEVER_USE'}],['invalid URL blocked before network','alice',{url:'http://invalid.test'}]]){
    await test(name,async()=>{const blocked=client(user,options),ctx=blocked.testContext;ctx.document.querySelector=()=>({});assert.equal(await blocked.cloud.init(),false);assert.match(ctx.document.body.innerHTML,/เข้าสู่ระบบฐานข้อมูลกลาง/);});
  }
  console.log(JSON.stringify({passed,failed:process.exitCode?1:0,total:16}));
})();
