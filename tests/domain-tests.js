// รันตรรกะชุดเดียวกับเว็บในหน่วยความจำ ไม่เขียนทับชุดข้อมูลผู้ใช้
(function(S){
  S.runDomainTests=function(){
    let state;const results=[],clock='2026-10-21T05:00:00.000Z';
    const assert=(ok,message='เงื่อนไขไม่ผ่าน')=>{if(!ok)throw Error(message);};
    const equal=(a,b)=>assert(a===b,JSON.stringify(a)+' ≠ '+JSON.stringify(b));
    const fails=fn=>{let rejected=false;try{fn();}catch(e){rejected=true;}assert(rejected,'รายการที่ควรปฏิเสธกลับสำเร็จ');};
    const test=(name,fn)=>{try{state=S.seed('normal',clock);fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}};
    const act=a=>{state=S.domain.reduce(state,a);return state.lastResultId;};
    const as=userId=>act({type:'SET_USER',userId});
    const order=(user,kg)=>{as(user);return act({type:'CREATE_ORDER',productId:'P01',kg,receiveDate:'2026-10-21',place:'ท่าเรือจำลอง',window:'09:00–12:00'});};
    function normal(){
      const a=order('R01',20),b=order('R02',30);as('CO01');
      for(const key of[a,b])act({type:'ALLOCATE',orderId:key,cageId:'C01',kg:state.orders.find(o=>o.id===key).requestedKg,reason:'ตามขนาดและรอบส่ง'});
      as('F01');for(const key of[a,b])act({type:'CONFIRM_ORDER',orderId:key});
      as('R01');act({type:'CONFIRM_ORDER',orderId:a});as('R02');act({type:'CONFIRM_ORDER',orderId:b});as('CO01');
      const p=act({type:'CREATE_PLAN',cageId:'C01',kg:50,coldKg:0,reason:'รอบขายปกติ'});
      act({type:'CHECK_PLAN',planId:p,quality:'passed',inspector:'ผู้ตรวจสมมติ',vehicleConfirmed:true,coldConfirmed:false,transportKg:50,coldKg:0});act({type:'APPROVE_PLAN',planId:p});return{a,b,p};
    }
    function offer(){
      as('F01');const incident=act({type:'CREATE_CARE',cageId:'C03'}),p=act({type:'CREATE_PLAN',cageId:'C03',kg:50,coldKg:20,reason:'เพิ่มทางเลือกหลังตรวจอาการ',incidentId:incident});
      as('CO01');const off=act({type:'DRAFT_OFFER',planId:p,buyerId:'R01',kg:30,receiveWindow:'09:00–12:00'});act({type:'SEND_OFFER',offerId:off});return{p,off};
    }
    function urgent(){
      const {p,off}=offer();as('R01');const o=act({type:'RESPOND_OFFER',offerId:off,response:'accept',kg:30});as('F01');act({type:'CONFIRM_ORDER',orderId:o});as('CO01');
      act({type:'CHECK_PLAN',planId:p,quality:'passed',inspector:'ผู้ตรวจสมมติ',vehicleConfirmed:true,coldConfirmed:true,transportKg:50,coldKg:20});act({type:'APPROVE_PLAN',planId:p});return{p,o,off};
    }
    function receive(o,kg){
      as('CO01');const d=act({type:'CREATE_DELIVERY',orderId:o});act({type:'DISPATCH',deliveryId:d});as(state.orders.find(x=>x.id===o).buyerId);
      act({type:'RECEIVE',deliveryId:d,acceptedKg:kg,issue:kg<state.orders.find(x=>x.id===o).allocatedKg?'กล่องเสียหาย (จำลอง)':''});return d;
    }
    const risk=cage=>S.evaluateCageRisk(S.calc.latest(state,cage),state.observations,S.config,clock);
    test('DO ไม่มีข้อมูลคงเป็น null ไม่แปลงเป็นศูนย์',()=>{equal(S.calc.latest(state,'C04').values.do,null);assert(risk('C04').missingFields.includes('do'));});
    test('ขาด DO ต้องอธิบายว่ายังประเมินออกซิเจนไม่ได้',()=>assert(risk('C04').reasons.some(x=>x.includes('ยังประเมินออกซิเจนไม่ได้'))));
    test('อาการลอยหัวและข้อมูลขาดยัง urgent',()=>{equal(risk('C03').urgency,'urgent');assert(risk('C03').missingFields.includes('ph'));});
    test('หนึ่งเวลาไม่สร้างแนวโน้ม',()=>{const o=S.calc.latest(state,'C03');assert(!S.evaluateCageRisk(o,[o],S.config,clock).ruleIds.includes('TREND-DO-01'));});
    test('DO ลดลงสองช่วงใช้ค่าจริงและเวลาที่เปรียบเทียบได้',()=>{const h=state.observations.filter(o=>o.cageId==='C01');h.forEach((o,i)=>o.values.do=6-i);assert(S.evaluateCageRisk(h[2],h,S.config,clock).ruleIds.includes('TREND-DO-01'));});
    test('ข้อมูลต่างความลึกไม่รวมสร้างแนวโน้ม',()=>{const h=state.observations.filter(o=>o.cageId==='C01');h.forEach((o,i)=>{o.values.do=6-i;o.point='จุด '+i;});assert(!S.evaluateCageRisk(h[2],h,S.config,clock).ruleIds.includes('TREND-DO-01'));});
    test('ข้อมูลเก่าแสดง stale',()=>equal(risk('C02').dataQuality,'stale'));
    test('DO0 ไม่เป็น missing และต้องตรวจเครื่อง',()=>{const o=S.calc.latest(state,'C04');o.values.do=0;const r=S.evaluateCageRisk(o,[o],S.config,clock);assert(!r.missingFields.includes('do'));assert(r.ruleIds.includes('DATA-ZERO'));});
    test('ค่าปัจจุบันไม่ถูกข้อมูลย้อนหลังทับ',()=>{as('F01');act({type:'RECORD_WATER',cageId:'C01',measuredAt:'2026-10-20T05:00:00Z',values:{do:2},source:'กรอกเอง'});equal(S.calc.latest(state,'C01').id,'OBS-03');});
    test('เวลาวัดอนาคตถูกปฏิเสธ',()=>{as('F01');fails(()=>act({type:'RECORD_WATER',cageId:'C01',measuredAt:'2027-01-01',values:{},source:'กรอกเอง'}));});
    test('ตัวเลขมีหน่วยปนไม่ผ่าน validation',()=>{as('F01');fails(()=>act({type:'RECORD_WATER',cageId:'C01',measuredAt:clock,values:{do:'3.2%'},source:'กรอกเอง'}));});
    test('บันทึกแยกค่า0และค่าว่าง',()=>{as('F01');act({type:'RECORD_WATER',cageId:'C03',measuredAt:clock,values:{do:0,ph:''},source:'กรอกเอง'});equal(state.observations.at(-1).values.do,0);equal(state.observations.at(-1).values.ph,null);});
    test('เวลาเท่ากันใช้รายการที่รับใหม่สุด',()=>{as('F01');const id=act({type:'RECORD_WATER',cageId:'C03',measuredAt:clock,values:{do:4},source:'กรอกเอง'});equal(S.calc.latest(state,'C03').id,id);});
    test('กดประเมินซ้ำไม่สร้างเหตุหรือ assessment ซ้ำ',()=>{as('F01');act({type:'CREATE_CARE',cageId:'C03'});act({type:'CREATE_CARE',cageId:'C03'});equal(state.incidents.length,1);equal(state.assessments.length,1);});
    test('รับงานเก็บคนและเวลา แต่เหตุไม่ปิด',()=>{as('F01');act({type:'CREATE_CARE',cageId:'C03'});act({type:'TASK_UPDATE',taskId:state.tasks[0].id,status:'assigned'});assert(state.tasks[0].acceptedAt);equal(state.incidents[0].status,'open');});
    test('งานยังไม่ครบห้ามปิดเหตุเพราะขายปลา',()=>{as('F01');const i=act({type:'CREATE_CARE',cageId:'C03'});fails(()=>act({type:'CLOSE_INCIDENT',incidentId:i,reason:'ขายแล้ว',followup:'ขายแล้ว'}));});
    test('ทำงานเสร็จต้องมีหลักฐาน',()=>{as('F01');act({type:'CREATE_CARE',cageId:'C03'});const taskId=state.tasks[0].id;act({type:'TASK_UPDATE',taskId,status:'assigned'});act({type:'TASK_UPDATE',taskId,status:'working'});fails(()=>act({type:'TASK_UPDATE',taskId,status:'done'}));});
    test('เหตุเร่งเดิมยังเปิด ไม่ลดระดับจากค่าน้ำใหม่',()=>equal(S.evaluateCageRisk(S.calc.latest(state,'C01'),state.observations,S.config,clock,'grouper',{openUrgentIncident:true}).urgency,'urgent'));
    test('คำขอซื้อยังไม่กันน้ำหนักและไม่สร้างเงิน',()=>{order('R01',20);equal(S.calc.reserved(state,'C01'),0);equal(state.financialEntries.length,0);});
    test('สั่งเกินปริมาณพร้อมเสนอขายถูกปฏิเสธ',()=>fails(()=>order('R01',51)));
    test('ส่งคำขอไม่ติ๊ก optin หรือยืนยันซื้ออัตโนมัติ',()=>{order('R01',20);equal(state.orders[0].buyerConfirmed,false);});
    test('ยกเลิกคำขอคืน reservation ถูกต้องและกดซ้ำไม่เกิน',()=>{const o=order('R01',20);as('CO01');act({type:'ALLOCATE',orderId:o,cageId:'C01',kg:20,reason:'ทดสอบ'});equal(S.calc.reserved(state,'C01'),20);act({type:'CANCEL_ORDER',orderId:o,reason:'ยกเลิก'});act({type:'CANCEL_ORDER',orderId:o,reason:'กดซ้ำ'});equal(S.calc.reserved(state,'C01'),0);});
    test('จัดสรรเกินคำขอหรือปลาไม่ผ่าน',()=>{const o=order('R01',20);as('CO01');fails(()=>act({type:'ALLOCATE',orderId:o,cageId:'C01',kg:201,reason:'ทดสอบ'}));});
    test('ร่าง/อนุมัติยังไม่หักปลาและไม่สร้างรายได้',()=>{const {p}=normal();equal(state.cages[0].liveKg,200);equal(state.harvests.length,0);equal(S.calc.finance(state,p).sales,0);equal(S.calc.reserved(state,'C01'),50);});
    test('ไม่มีทางรองรับห้ามอนุมัติ',()=>{as('CO01');const p=act({type:'CREATE_PLAN',cageId:'C03',kg:50,coldKg:0,reason:'ทดสอบ'});act({type:'CHECK_PLAN',planId:p,quality:'passed',inspector:'ผู้ตรวจ',vehicleConfirmed:true,transportKg:50,coldKg:0});fails(()=>act({type:'APPROVE_PLAN',planId:p}));});
    test('คุณภาพไม่ผ่านห้ามอนุมัติเพื่อขายอาหาร',()=>{const {p}=normal(),plan=state.plans.find(x=>x.id===p);plan.status='draft';plan.quality='rejected';fails(()=>act({type:'APPROVE_PLAN',planId:p}));});
    test('C03 ชั่ง47 ได้ล็อต30+17และเหลือมีชีวิตประมาณ33',()=>{const {p}=urgent();act({type:'HARVEST',planId:p,actualKg:47});equal(state.lots.reduce((n,l)=>n+l.kg,0),47);equal(state.lots.find(l=>l.storage==='cold').kg,17);equal(state.cages.find(c=>c.id==='C03').liveKg,33);});
    test('กดจับซ้ำ ActionID เดิมไม่หักปลาอีก',()=>{const {p}=urgent();act({type:'HARVEST',planId:p,actualKg:47,actionId:'once'});act({type:'HARVEST',planId:p,actualKg:47,actionId:'once'});equal(state.harvests.length,1);equal(state.cages.find(c=>c.id==='C03').liveKg,33);fails(()=>act({type:'HARVEST',planId:p,actualKg:47}));});
    test('Reservation ย้ายไปล็อต ไม่กันปลามีชีวิตซ้ำ',()=>{const {p}=normal();act({type:'HARVEST',planId:p,actualKg:50});equal(S.calc.reserved(state,'C01'),0);equal(state.reservations.filter(r=>r.status==='active').length,2);assert(state.reservations.every(r=>r.lotId));});
    test('340×50 หัก250/500/250 เหลือ16000หรือ320ต่อกก.',()=>{const {p,a,b}=normal();act({type:'HARVEST',planId:p,actualKg:50});receive(a,20);receive(b,30);const f=S.calc.finance(state,p);equal(f.sales,1700000);equal(f.costs,100000);equal(f.net,1600000);equal(f.perKg,32000);});
    test('รับบางส่วนคิดตามรับจริงและพักส่วนไม่รับตรวจ',()=>{const {p,a,b}=normal();act({type:'HARVEST',planId:p,actualKg:50});receive(a,18);receive(b,30);equal(S.calc.finance(state,p).sales,1632000);equal(state.lots.find(l=>l.storage==='hold').kg,2);equal(state.lots.find(l=>l.storage==='hold').quality,'pending');});
    test('รับเกินจำนวนส่งถูกปฏิเสธ',()=>{const {p,a}=normal();act({type:'HARVEST',planId:p,actualKg:50});as('CO01');const d=act({type:'CREATE_DELIVERY',orderId:a});act({type:'DISPATCH',deliveryId:d});as('R01');fails(()=>act({type:'RECEIVE',deliveryId:d,acceptedKg:21}));});
    test('รับมอบซ้ำไม่เพิ่มยอดขาย',()=>{const {p,a}=normal();act({type:'HARVEST',planId:p,actualKg:50});const d=receive(a,20);fails(()=>act({type:'RECEIVE',deliveryId:d,acceptedKg:20}));equal(state.financialEntries.filter(e=>e.type==='sale').length,1);});
    test('เงินค้างรับไม่ใช่เงินจ่ายแล้ว',()=>{const {p,a,b}=normal();act({type:'HARVEST',planId:p,actualKg:50});receive(a,20);receive(b,30);equal(S.calc.finance(state,p).paid,0);equal(S.calc.finance(state,p).uncollected,1700000);as('CO01');fails(()=>act({type:'PAYOUT',planId:p}));});
    test('ชำระและจ่ายในเดโมห้ามบันทึกเงินซ้ำ',()=>{const {p,a,b}=normal();act({type:'HARVEST',planId:p,actualKg:50});receive(a,20);receive(b,30);as('CO01');act({type:'COLLECT',orderId:a});act({type:'COLLECT',orderId:b});act({type:'PAYOUT',planId:p});equal(S.calc.finance(state,p).paid,1600000);fails(()=>act({type:'PAYOUT',planId:p}));fails(()=>act({type:'COLLECT',orderId:a}));});
    test('พักเย็น17ไม่สร้างรายได้และไม่ปิดเหตุ',()=>{const {p,o}=urgent();act({type:'HARVEST',planId:p,actualKg:47});receive(o,30);equal(S.calc.finance(state,p).sales,1020000);equal(state.incidents[0].status,'open');});
    test('ข้อเสนอหมดอายุกดยกเลิกซ้ำไม่คืนเกิน',()=>{const {off}=offer();act({type:'ADVANCE_CLOCK',hours:24});equal(S.calc.reserved(state,'C03'),0);act({type:'EXPIRE_OFFER',offerId:off});act({type:'EXPIRE_OFFER',offerId:off});equal(S.calc.available(state,'C03'),80);});
    test('ตอบรับบางส่วนสร้างออเดอร์และกันเพียงยอดตอบรับ',()=>{const {off}=offer();as('R01');act({type:'RESPOND_OFFER',offerId:off,response:'accept',kg:20});equal(state.orders.length,1);equal(S.calc.reserved(state,'C03'),20);fails(()=>act({type:'RESPOND_OFFER',offerId:off,response:'accept',kg:20}));});
    test('ปฏิเสธข้อเสนอไม่สร้างออเดอร์และคืนกันไว้',()=>{const {off}=offer();as('R01');act({type:'RESPOND_OFFER',offerId:off,response:'decline'});equal(state.orders.length,0);equal(S.calc.reserved(state,'C03'),0);});
    test('บัญชีร้านอื่นยืนยันไม่ได้',()=>{const o=order('R01',20);as('CO01');act({type:'ALLOCATE',orderId:o,cageId:'C01',kg:20,reason:'ทดสอบ'});as('R02');fails(()=>act({type:'CONFIRM_ORDER',orderId:o}));});
    test('สลับบทบาทไม่ seed ข้อมูลใหม่',()=>{const o=order('R01',20);as('CO01');as('F01');as('R01');equal(state.orders[0].id,o);equal(state.orders.length,1);});
    test('น้ำหนักสามตำแหน่งและเงินเป็นสตางค์',()=>{const o=order('R01',0.125);equal(state.orders.find(x=>x.id===o).requestedKg,0.125);equal(Math.round(0.125*34000),4250);});
    function multi(){
      const {p,o}=urgent();act({type:'HARVEST',planId:p,actualKg:47});receive(o,30);as('CO01');const p2=act({type:'CREATE_PLAN',cageId:'C03',kg:20,coldKg:20,reason:'รอบถัดไป'});
      act({type:'CHECK_PLAN',planId:p2,quality:'passed',inspector:'ผู้ตรวจ',vehicleConfirmed:true,coldConfirmed:true,transportKg:20,coldKg:20});act({type:'APPROVE_PLAN',planId:p2});act({type:'HARVEST',planId:p2,actualKg:20});
      const l1=state.lots.find(l=>l.planId===p&&l.storage==='cold'),l2=state.lots.find(l=>l.planId===p2&&l.storage==='cold'),n=order('R02',25);as('CO01');
      act({type:'ALLOCATE',orderId:n,cageId:'C03',lotId:l1.id,kg:17,reason:'ล็อตแรก'});act({type:'ALLOCATE',orderId:n,cageId:'C03',lotId:l2.id,kg:8,reason:'เพิ่มล็อต',append:true});
      as('F01');act({type:'CONFIRM_ORDER',orderId:n});as('R02');act({type:'CONFIRM_ORDER',orderId:n});return{p,p2,n,l1};
    }
    test('หนึ่งออเดอร์รับหลายล็อตโดยไม่เพิ่มปลาจากอากาศ',()=>{const {n}=multi();const d=receive(n,25);equal(state.deliveries.find(x=>x.id===d).lotIds.length,2);equal(state.lots.reduce((n,l)=>n+S.calc.lotRemaining(state,l),0),12);});
    test('หลายล็อตแยกยอดเข้าแผนไม่คิดซ้ำทั้งออเดอร์',()=>{const {p,p2,n}=multi();receive(n,25);equal(S.calc.finance(state,p).sales,47*34000);equal(S.calc.finance(state,p2).sales,8*34000);equal(S.calc.finance(state).sales,55*34000);});
    test('รับบางส่วนหลายล็อตรวมสตางค์ครบและคืนปลาเท่าจริง',()=>{const {n}=multi();receive(n,20);const shares=S.calc.orderShares(state,state.orders.find(o=>o.id===n));equal(shares.reduce((n,x)=>n+x.amountSatang,0),680000);equal(state.lots.filter(l=>l.storage==='hold').reduce((n,l)=>n+l.kg,0),5);});
    return{passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,total:results.length,results};
  };
})(SPARK);
