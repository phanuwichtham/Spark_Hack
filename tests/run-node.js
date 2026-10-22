const fs=require('fs'),vm=require('vm'),path=require('path'),root=path.resolve(__dirname,'..'),memory=new Map();
const context={console,Intl,Date,Math,JSON,URL,URLSearchParams,crypto:require('crypto').webcrypto,localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}};
context.window=context;vm.createContext(context);
for(const name of['config','utils','demo-data','calculations','risk-engine','store','domain'])vm.runInContext(fs.readFileSync(path.join(root,'assets/js',name+'.js'),'utf8'),context,{filename:name+'.js'});
vm.runInContext(fs.readFileSync(path.join(__dirname,'domain-tests.js'),'utf8'),context);
const report=context.SPARK.runDomainTests();
function add(name,fn){try{fn();report.results.push({name,pass:true});report.passed++;}catch(e){report.results.push({name,pass:false,error:e.message});report.failed++;}report.total++;}
add('Store ล้มเหลวไม่อัปเดต state ว่าบันทึกสำเร็จ',()=>{const rev=context.SPARK.store.get().revision,write=context.localStorage.setItem;context.localStorage.setItem=()=>{throw Error('QuotaExceeded');};try{let failed=false;try{context.SPARK.domain.dispatch({type:'SET_USER',userId:'CO01'});}catch(e){failed=true;}if(!failed||context.SPARK.store.get().revision!==rev)throw Error('state เปลี่ยนแม้บันทึกไม่ได้');}finally{context.localStorage.setItem=write;}});
add('Store ตรวจ revision อีกแท็บก่อนเขียนทับ',()=>{const key=context.SPARK.config.storageKey,raw=memory.get(key),data=JSON.parse(raw);data.revision++;memory.set(key,JSON.stringify(data));let failed=false;try{context.SPARK.domain.dispatch({type:'SET_USER',userId:'CO01'});}catch(e){failed=true;}memory.set(key,raw);if(!failed)throw Error('เขียนทับ revision ใหม่');});
add('Refresh store ไม่ seed ทับบัญชีและข้อมูลเดิม',()=>{context.SPARK.domain.dispatch({type:'SET_USER',userId:'CO01'});const raw=memory.get(context.SPARK.config.storageKey);vm.runInContext(fs.readFileSync(path.join(root,'assets/js/store.js'),'utf8'),context);if(context.SPARK.store.get().currentUserId!=='CO01'||raw!==memory.get(context.SPARK.config.storageKey))throw Error('seed ทับ');});
for(const row of report.results)console.log((row.pass?'PASS ':'FAIL ')+row.name+(row.error?' — '+row.error:''));
console.log(JSON.stringify({passed:report.passed,failed:report.failed,total:report.total}));
if(process.argv.includes('--json'))fs.writeFileSync(path.join(__dirname,'node-test-results.json'),JSON.stringify(report,null,2));
process.exitCode=report.failed?1:0;
