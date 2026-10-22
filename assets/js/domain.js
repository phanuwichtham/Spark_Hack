/* ทุก mutation ผ่าน dispatch/reduce นี้ เงินเป็นสตางค์ น้ำหนักเป็นกิโลกรัม 3 ตำแหน่ง
   การกันปริมาณเป็นบัญชีเดียว ย้ายไปล็อตหลังชั่งจริง ไม่สร้างซ้ำ */
(function(S){
  const {clone,id,weight:w}=S.util;
  const require=(ok,message)=>{if(!ok)throw Error(message);};
  const number=(value,label,min=0)=>{const n=Number(value);require(value!==null&&value!==''&&Number.isFinite(n)&&n>=min,label+' ไม่ถูกต้อง');return n;};
  function reduce(original,a){
    const s=clone(original),now=s.demoNow,actor=S.util.user(s);
    if(a.actionId&&s.processedActions.includes(a.actionId))return s;
    let result=null;
    const get=(type,key)=>{const x=S.util.find(s,type,key);require(x,'ไม่พบข้อมูล '+key);return x;};
    const coordinator=()=>require(actor.role==='coordinator','ต้องเลือกบทบาทผู้ประสานกลุ่ม');
    const owner=c=>require(actor.role==='coordinator'||actor.id===c.ownerId,'เลือกเจ้าของกระชังหรือผู้ประสานก่อน');
    const buyer=o=>require(actor.role==='buyer'&&actor.id===o.buyerId,'เลือกบัญชีร้านที่เกี่ยวข้องก่อน');
    const log=(type,entityId,message)=>s.audit.push({id:id('AUD'),type,entityId,message,at:now,actorId:actor.id});
    const notify=(userId,text,url)=>s.notifications.push({id:id('N'),userId,text,url,at:now,read:false});
    const reserve=data=>{
      const kg=w(number(data.kg,'ปริมาณกันไว้',0.001));
      require(kg<=S.calc.available(s,data.cageId)+0.0001,'ปลาว่างไม่พอ เหลือประมาณ '+S.calc.available(s,data.cageId)+' กก.');
      s.reservations.push({id:id('RES'),status:'active',lotId:null,...data,kg});
    };
    switch(a.type){
      case 'SET_USER':get('users',a.userId);s.currentUserId=a.userId;break;
      case 'SAVE_DRAFT':s.drafts[actor.id+':'+a.key]=clone(a.value);break;
      case 'READ_NOTIFICATION':{
        const n=get('notifications',a.id);require(n.userId===actor.id,'ไม่ใช่แจ้งเตือนบัญชีนี้');n.read=true;break;
      }
      case 'ADVANCE_CLOCK':coordinator();s.demoNow=new Date(new Date(now).getTime()+number(a.hours,'ชั่วโมง',0.001)*3600000).toISOString();break;
      case 'ADD_CAGE':{
        require(actor.role!=='buyer','ร้านเพิ่มกระชังไม่ได้');const ownerId=actor.role==='farmer'?actor.id:a.ownerId;
        require(get('users',ownerId).role==='farmer','เลือกบัญชีผู้เลี้ยง');
        const count=number(a.count,'จำนวนปลา',1),avgKg=number(a.avgKg,'น้ำหนักเฉลี่ย',0.001);
        result=id('C');s.cages.push({id:result,ownerId,species:a.species,name:a.species==='seabass'?'ปลากะพงสามน้ำ':'ปลาเก๋าดอกแดง',productId:a.species==='seabass'?'P03':'P01',stage:a.stage||'ระยะขุน',count,avgKg,liveKg:w(count*avgKg),offerKg:0,surveyAt:now});break;
      }
      case 'ADJUST_CAGE':{
        const c=get('cages',a.cageId);owner(c);require(a.reason?.trim(),'ระบุเหตุผลสำรวจ/ตาย/ย้าย');
        const kg=w(number(a.liveKg,'ประมาณการใหม่'));require(kg>=S.calc.reserved(s,c.id),'ต่ำกว่ายอดกันไว้ ต้องปรับแผนก่อน');
        c.liveKg=kg;c.surveyAt=now;log('cage',c.id,'ปรับประมาณการ '+kg+' กก.: '+a.reason);break;
      }
      case 'RECORD_WATER':{
        const c=get('cages',a.cageId);owner(c);const measured=new Date(a.measuredAt);
        require(Number.isFinite(measured.getTime())&&measured<=new Date(now),'วันเวลาวัดไม่ถูกต้องหรืออยู่ในอนาคตของนาฬิกาสาธิต');
        require(['กรอกเอง','เครื่องวัดจำลอง','เซนเซอร์จำลอง'].includes(a.source),'เลือกแหล่งข้อมูล');
        const values={};
        for(const key of Object.keys(S.config.units)){
          const v=a.values[key];values[key]=v===''||v===null||v===undefined?null:number(v,key);
          if(values[key]!==null)require(values[key]<={do:50,temperature:60,salinity:100,ph:14}[key],'ตรวจหน่วยและรูปแบบ '+key+' หรือเว้นว่างหากไม่มีข้อมูล');
        }
        if(a.symptomAt)require(Number.isFinite(new Date(a.symptomAt).getTime())&&new Date(a.symptomAt)<=new Date(now),'เวลาสังเกตอาการไม่ถูกต้อง');
        result=id('OBS');s.observations.push({id:result,cageId:c.id,values,measuredAt:measured.toISOString(),receivedAt:now,source:a.source,point:a.point||'ไม่ระบุ',instrument:a.instrument||'ยังไม่ยืนยัน',symptoms:a.symptoms||[],symptomAt:a.symptomAt||a.measuredAt,recorder:actor.name,note:a.note||''});
        delete s.drafts[actor.id+':water:'+c.id];log('cage',c.id,'บันทึกค่าน้ำ '+result);break;
      }
      case 'CREATE_CARE':{
        const c=get('cages',a.cageId);owner(c);const obs=S.calc.latest(s,c.id);
        let incident=s.incidents.find(i=>i.cageId===c.id&&i.status!=='closed');
        const risk=S.evaluateCageRisk(obs,s.observations,S.config,now,c.species,{openUrgentIncident:incident?.urgency==='urgent'});
        if(!incident){incident={id:id('INC'),cageId:c.id,status:'open',createdAt:now,reason:risk.reasons[0]};s.incidents.push(incident);}
        incident.urgency=risk.urgency;result=incident.id;
        let assessment=s.assessments.find(x=>x.incidentId===incident.id&&x.observationId===obs?.id&&x.version===risk.version);
        if(!assessment){assessment={id:id('RA'),incidentId:incident.id,cageId:c.id,observationId:obs?.id,at:now,...risk};s.assessments.push(assessment);}
        for(const description of risk.recommendedTasks.length?risk.recommendedTasks:['ติดตามข้อมูลและขอผู้รับผิดชอบตรวจ']){
          if(!s.tasks.some(t=>t.incidentId===incident.id&&t.description===description&&(t.status!=='done'||t.assessmentId===assessment.id)))
            s.tasks.push({id:id('TASK'),incidentId:incident.id,assessmentId:assessment.id,cageId:c.id,description,status:'unassigned',assignee:null,evidence:'',notes:[],dueAt:new Date(new Date(now).getTime()+3600000).toISOString()});
        }
        log('incident',incident.id,'ประเมินและเชื่อมงานด้วย '+risk.ruleIds.join(', '));notify(c.ownerId,'มีงานดูแล '+c.id,'tasks.html?incident='+incident.id);break;
      }
      case 'TASK_UPDATE':{
        const t=get('tasks',a.taskId);if(t.assignee!==actor.id)owner(get('cages',t.cageId));
        const transitions={unassigned:['assigned'],assigned:['working','followup'],working:['followup','done'],followup:['working','done'],done:[]};
        require(transitions[t.status].includes(a.status),'ลำดับสถานะงานไม่ถูกต้อง');
        if(a.status==='assigned'){t.assignee=actor.id;t.acceptedAt=now;}
        if(a.assignee){coordinator();require(get('users',a.assignee).role!=='buyer','มอบหมายให้ผู้เลี้ยงหรือผู้ประสาน');t.assignee=a.assignee;}
        if(['followup','done'].includes(a.status))require(a.evidence?.trim(),'บันทึกผล หลักฐาน หรือเหตุส่งต่อ');
        t.status=a.status;if(a.evidence)t.evidence=a.evidence;t.notes.push({at:now,actorId:actor.id,text:a.evidence||a.status});
        log('incident',t.incidentId,'งาน '+t.id+' → '+a.status+' '+(a.evidence||''));break;
      }
      case 'CLOSE_INCIDENT':{
        const i=get('incidents',a.incidentId);owner(get('cages',i.cageId));
        require(s.tasks.filter(t=>t.incidentId===i.id).every(t=>t.status==='done'),'ต้องตรวจงานทั้งหมดให้เสร็จพร้อมหลักฐาน');
        require(a.reason?.trim()&&a.followup?.trim(),'กรอกผลติดตามและเหตุผลปิดเหตุ');require(i.status!=='closed','ปิดเหตุแล้ว');
        i.status='closed';i.reasonClosed=a.reason;i.followup=a.followup;log('incident',i.id,'ปิดเหตุ: '+a.reason+' / ผลติดตาม '+a.followup);break;
      }
      case 'CREATE_ORDER':{
        require(actor.role==='buyer','เลือกบัญชีร้านก่อน');const p=get('products',a.productId),kg=w(number(a.kg,'จำนวน',0.001));
        require(kg<=S.calc.offerAvailable(s,p.id),'จำนวนเกินปริมาณพร้อมเสนอขาย ติดต่อผู้ประสาน');
        require(a.receiveDate&&a.receiveDate>=S.util.localTime(now).slice(0,10),'เลือกวันที่รับปัจจุบันหรือหลังจากนี้');require(a.place?.trim()&&a.window?.trim(),'ระบุจุดและช่วงเวลารับ');
        if(a.optin){
          require(a.extraWindow&&a.channel&&a.extraDate,'ระบุเงื่อนไขรับข้อเสนอครบก่อน');const pref=get('products',a.offerProductId||p.id);
          actor.optin=true;actor.maxKg=number(a.extraKg,'ปริมาณรับเพิ่ม',0.001);actor.species=pref.species;actor.offerProductIds=[pref.id];actor.offerDate=a.extraDate;actor.offerWindow=a.extraWindow;actor.offerChannel=a.channel;
        }
        result=id('ORD');s.orders.push({id:result,buyerId:actor.id,productId:p.id,priceSatang:p.priceSatang,requestedKg:kg,allocatedKg:0,acceptedKg:0,buyerConfirmed:false,farmerConfirmed:false,farmerConfirmations:[],collected:false,status:'requested',planId:null,receiveDate:a.receiveDate,place:a.place,window:a.window,note:a.note||'',createdAt:now});
        delete s.drafts[actor.id+':order:'+p.id];log('order',result,'ส่งคำขอซื้อ รอผู้ประสานยืนยัน');notify('CO01','คำขอซื้อใหม่ '+S.util.kg(kg),'order-detail.html?id='+result);break;
      }
      case 'ALLOCATE':{
        coordinator();const o=get('orders',a.orderId),c=get('cages',a.cageId),p=get('products',o.productId),kg=w(number(a.kg,'ปริมาณจัดสรร',0.001));
        require(['requested','allocated'].includes(o.status),'ออเดอร์ยืนยันหรือยกเลิกแล้ว');require(c.productId===p.id,'ชนิดหรือขนาดปลาไม่ตรง');require(a.reason?.trim(),'ระบุเหตุผลจัดสรร');
        const previous=s.reservations.filter(r=>r.orderId===o.id&&r.status==='active');
        require(!a.append||(a.lotId&&previous.every(r=>r.lotId)),'การเพิ่มแหล่งต้องเป็นล็อตหลังจับทุกส่วน');
        const priorKg=a.append?previous.reduce((n,r)=>n+r.kg,0):0;require(priorKg+kg<=o.requestedKg+0.0001,'จัดสรรรวมเกินคำขอ');
        if(!a.append)previous.forEach(r=>r.status='released');
        if(a.lotId){
          const l=get('lots',a.lotId);require(l.quality==='passed'&&l.cageId===c.id,'ล็อตต้องตรงกระชังและผ่านคุณภาพ');
          const held=s.reservations.filter(r=>r.lotId===l.id&&r.status==='active').reduce((n,r)=>n+r.kg,0);
          require(kg<=S.calc.lotRemaining(s,l)-held+0.0001,'ล็อตมีปริมาณว่างไม่พอ');
          s.reservations.push({id:id('RES'),orderId:o.id,cageId:c.id,lotId:l.id,kg,status:'active'});
          if(!a.append)o.planId=l.planId;o.harvested=true;o.fromLots=true;
        }else{
          reserve({orderId:o.id,cageId:c.id,kg});o.planId=s.plans.find(p=>p.cageId===c.id&&p.status==='draft')?.id||null;o.harvested=false;o.fromLots=false;
        }
        o.cageId=c.id;o.allocatedKg=w(priorKg+kg);o.cageIds=[...new Set(s.reservations.filter(r=>r.orderId===o.id&&r.status==='active').map(r=>r.cageId))];
        o.farmerConfirmed=false;o.buyerConfirmed=false;o.farmerConfirmations=[];o.status='allocated';if(o.harvested)o.weighedKg=o.allocatedKg;o.allocationReason=a.reason;
        log('order',o.id,'จัดสรร '+kg+' กก. จาก '+c.id+': '+a.reason);break;
      }
      case 'CONFIRM_ORDER':{
        const o=get('orders',a.orderId);require(['allocated','waiting','confirmed'].includes(o.status),'ต้องจัดสรรก่อนยืนยัน');
        if(actor.role==='buyer'){buyer(o);o.buyerConfirmed=true;}
        else{
          const owners=[...new Set((o.cageIds||[o.cageId]).map(cageId=>get('cages',cageId).ownerId))];require(owners.includes(actor.id),'เลือกเจ้าของกระชังผู้เลี้ยง');
          o.farmerConfirmations=[...new Set([...(o.farmerConfirmations||[]),actor.id])];o.farmerConfirmed=owners.every(x=>o.farmerConfirmations.includes(x));
        }
        o.status=o.buyerConfirmed&&o.farmerConfirmed?'confirmed':'waiting';log('order',o.id,'ยืนยันโดย '+actor.name);break;
      }
      case 'CANCEL_ORDER':{
        const o=get('orders',a.orderId);require(actor.role==='coordinator'||actor.id===o.buyerId,'ไม่ใช่ออเดอร์บัญชีนี้');
        require((!o.harvested||o.fromLots)&&!['sent','received','partial','closed'].includes(o.status),'จับ/ส่งแล้ว ให้แจ้งปัญหาแทน');require(a.reason?.trim(),'ระบุเหตุผล');
        o.status='cancelled';s.reservations.filter(r=>r.orderId===o.id).forEach(r=>r.status='released');s.offers.filter(x=>x.orderId===o.id).forEach(x=>x.status='cancelled');log('order',o.id,'ยกเลิก: '+a.reason);break;
      }
      case 'CREATE_PLAN':{
        const c=get('cages',a.cageId);owner(c);require(!s.plans.some(p=>p.cageId===c.id&&!['cancelled','harvested'].includes(p.status)),'กระชังนี้มีแผนที่ยังไม่จบแล้ว');
        const kg=w(number(a.kg,'ปริมาณเสนอจับ',0.001)),cold=w(number(a.coldKg,'ปริมาณพักเย็น'));require(kg<=c.liveKg&&cold<=kg,'ปริมาณเกินปลาประมาณการ/แผน');require(a.reason?.trim(),'ระบุเหตุผลพิจารณา');
        result=id('PLAN');s.plans.push({id:result,cageId:c.id,incidentId:a.incidentId||null,proposedKg:kg,coldKg:cold,status:'draft',quality:'pending',vehicleConfirmed:false,coldConfirmed:false,transportKg:kg,reason:a.reason,date:a.date||S.util.localTime(now).slice(0,10),createdAt:now,remainingCare:a.remainingCare||'เจ้าของดูแลต่อ ตรวจอาการและบันทึกซ้ำ',responsibleId:c.ownerId,costs:{pack:25000,transport:50000,group:25000}});
        s.orders.filter(o=>o.cageId===c.id&&!o.planId&&!['cancelled'].includes(o.status)).forEach(o=>o.planId=result);
        log('plan',result,'ร่างแผน ยังไม่หักปลาหรือสร้างรายได้');break;
      }
      case 'CHECK_PLAN':{
        coordinator();const p=get('plans',a.planId);require(p.status==='draft','แผนไม่ใช่ร่าง');require(['pending','passed','rejected'].includes(a.quality),'สถานะคุณภาพไม่ถูกต้อง');require(a.inspector?.trim(),'ระบุผู้ตรวจและยืนยันความเหมาะสม');
        p.quality=a.quality;p.inspector=a.inspector;p.vehicleConfirmed=!!a.vehicleConfirmed;p.coldConfirmed=!!a.coldConfirmed;p.coldKg=w(number(a.coldKg,'พื้นที่เย็น'));p.transportKg=w(number(a.transportKg,'กำลังรถ'));
        p.vehicle=a.vehicle||'รถกลุ่มจำลอง';p.coldPlace=a.coldPlace||'พื้นที่เย็นกลุ่มจำลอง';require(p.coldKg<=S.config.coldCapacityKg,'พื้นที่เย็นเกินกำลังเดโม');
        s.qualityChecks.push({id:id('QC'),planId:p.id,status:p.quality,inspector:p.inspector,at:now});log('plan',p.id,'ตรวจคุณภาพและกำลังรองรับ: '+p.quality);break;
      }
      case 'APPROVE_PLAN':{
        coordinator();const p=get('plans',a.planId),support=S.calc.support(s,p),orders=S.calc.planOrders(s,p.id);
        require(p.status==='draft','แผนอนุมัติแล้ว');require(p.quality==='passed'&&p.inspector,'ต้องตรวจคุณภาพผ่านและยืนยันความเหมาะสม');
        require(p.vehicleConfirmed&&p.transportKg>=support.accepted,'รถยังไม่รองรับ');require(support.unsupported===0,'ยังไม่มีทางรองรับ '+support.unsupported+' กก.');
        require(support.accepted+p.coldKg<=p.proposedKg,'ออเดอร์และพักเย็นรวมเกินแผน');require(orders.every(o=>o.buyerConfirmed&&o.farmerConfirmed),'ร้านและผู้เลี้ยงต้องยืนยันทุกออเดอร์');
        require(!p.coldKg||p.coldConfirmed,'ต้องยืนยันพื้นที่เย็น');
        const used=s.plans.filter(x=>x.id!==p.id&&x.status==='approved').reduce((n,x)=>n+x.coldKg,0)+s.lots.filter(l=>l.storage==='cold').reduce((n,l)=>n+S.calc.lotRemaining(s,l),0);
        require(used+p.coldKg<=S.config.coldCapacityKg,'พื้นที่เย็นรวมไม่พอ');
        if(p.coldKg)reserve({planId:p.id,cageId:p.cageId,kind:'cold',kg:p.coldKg});
        p.status='approved';p.approverId=actor.id;log('plan',p.id,'อนุมัติแผน ยังไม่หักปลามีชีวิต');break;
      }
      case 'CANCEL_PLAN':{
        coordinator();const p=get('plans',a.planId);require(!p.harvestId,'จับจริงแล้ว ยกเลิกไม่ได้');require(a.reason?.trim(),'ระบุเหตุผล');
        p.status='cancelled';
        for(const o of s.orders.filter(o=>o.planId===p.id)){o.status='cancelled';s.reservations.filter(r=>r.orderId===o.id).forEach(r=>r.status='released');}
        for(const off of s.offers.filter(x=>x.planId===p.id)){off.status='cancelled';s.reservations.filter(r=>r.offerId===off.id).forEach(r=>r.status='released');}
        s.reservations.filter(r=>r.planId===p.id).forEach(r=>r.status='released');log('plan',p.id,'ยกเลิก: '+a.reason);break;
      }
      case 'HARVEST':{
        const p=get('plans',a.planId),c=get('cages',p.cageId);owner(c);require(p.status==='approved'&&!p.harvestId,'บันทึกจับแล้วหรือยังไม่อนุมัติ');
        const actual=w(number(a.actualKg,'น้ำหนักชั่งจริง',0.001)),orders=S.calc.planOrders(s,p.id),allocated=w(orders.reduce((n,o)=>n+o.allocatedKg,0)),cold=w(actual-allocated);
        require(actual<=p.proposedKg&&actual<=c.liveKg,'น้ำหนักเกินแผนหรือประมาณการ');require(actual>=allocated,'น้ำหนักจริงน้อยกว่ายอดจัดสรร ต้องปรับแผนก่อน');require(cold<=p.coldKg,'ส่วนเกินไม่มีพื้นที่เย็นรองรับ');
        result=id('HR');s.harvests.push({id:result,planId:p.id,cageId:c.id,actualKg:actual,at:now,recorderId:actor.id});p.harvestId=result;p.actualKg=actual;p.status='harvested';c.liveKg=w(c.liveKg-actual);c.offerKg=w(Math.max(0,c.offerKg-actual));
        const lot=(kg,storage)=>({id:id('LOT'),kg,storage,cageId:c.id,ownerId:c.ownerId,planId:p.id,harvestId:result,quality:p.quality,inspector:p.inspector,at:now,productId:c.productId});
        let orderLot;if(allocated){orderLot=lot(allocated,'dispatch');s.lots.push(orderLot);}if(cold)s.lots.push(lot(cold,'cold'));
        for(const o of orders){o.harvested=true;o.status='preparing';o.weighedKg=o.allocatedKg;s.reservations.filter(r=>r.orderId===o.id&&r.status==='active').forEach(r=>r.lotId=orderLot.id);}
        s.reservations.filter(r=>r.planId===p.id&&r.kind==='cold').forEach(r=>r.status='converted');
        for(const [kind,amountSatang] of Object.entries(p.costs))s.financialEntries.push({id:id('FIN'),type:'cost',kind,planId:p.id,amountSatang,at:now});
        log('plan',p.id,'ชั่งจริง '+actual+' กก. จัดส่ง '+allocated+' / พักเย็น '+cold);break;
      }
      case 'DRAFT_OFFER':{
        coordinator();const p=get('plans',a.planId),c=get('cages',p.cageId),b=get('users',a.buyerId),product=get('products',c.productId);
        require(p.status==='draft','ต้องเป็นแผนร่าง');require(b.role==='buyer'&&b.optin&&b.species===c.species,'ร้านยังไม่สมัครใจหรือชนิดไม่ตรง');require(!b.offerProductIds||b.offerProductIds.includes(product.id),'ขนาดปลาไม่ตรงที่สมัครใจ');require(!b.offerDate||b.offerDate===p.date,'วันรับไม่ตรงที่สมัครใจ');
        const kg=w(number(a.kg,'ปริมาณเสนอ',0.001));require(kg<=b.maxKg&&kg<=p.proposedKg,'เกินเงื่อนไขร้านหรือแผน');require(a.receiveWindow&&(!b.offerWindow||b.offerWindow===a.receiveWindow),'ช่วงเวลารับไม่ตรงที่สมัครใจ');
        const expires=new Date(a.expiresAt||new Date(new Date(now).getTime()+6*3600000));require(Number.isFinite(expires.getTime())&&expires>new Date(now),'เวลาหมดอายุไม่ถูกต้อง');
        result=id('OFR');s.offers.push({id:result,planId:p.id,buyerId:b.id,productId:product.id,kg,priceSatang:product.priceSatang,status:'draft',expiresAt:expires.toISOString(),date:p.date,place:a.place||'ท่าเรือชุมชน (จำลอง)',window:a.receiveWindow,qualityCondition:'ผ่านการตรวจคุณภาพและผู้รับผิดชอบยืนยันก่อนจับ'});break;
      }
      case 'SEND_OFFER':{
        coordinator();const off=get('offers',a.offerId),p=get('plans',off.planId);require(p.status==='draft'&&off.status==='draft','ข้อเสนอส่งแล้วหรือแผนไม่อยู่ระหว่างร่าง');require(new Date(off.expiresAt)>new Date(now),'หมดอายุ');
        const pending=s.offers.filter(x=>x.planId===p.id&&x.id!==off.id&&x.status==='sent'&&new Date(x.expiresAt)>new Date(now)).reduce((n,x)=>n+x.kg,0);
        require(off.kg+pending+S.calc.support(s,p).accepted<=p.proposedKg,'เสนอเกินแผน');reserve({cageId:p.cageId,offerId:off.id,kg:off.kg,expiresAt:off.expiresAt});off.status='sent';
        log('offer',off.id,'ส่งข้อเสนอในเว็บเดโมเท่านั้น');notify(off.buyerId,'ข้อเสนอปลาใหม่ '+S.util.kg(off.kg),'offers.html');break;
      }
      case 'RESPOND_OFFER':{
        const off=get('offers',a.offerId);buyer(off);require(off.status==='sent'&&new Date(off.expiresAt)>new Date(now),'ข้อเสนอไม่รอคำตอบหรือหมดอายุ');
        const r=s.reservations.find(r=>r.offerId===off.id&&r.status==='active');require(r,'ไม่พบการกันปริมาณ');
        if(a.response==='decline'){off.status='rejected';r.status='released';break;}
        const kg=w(number(a.kg,'ปริมาณตอบรับ',0.001));require(kg<=off.kg,'ตอบรับเกินข้อเสนอ');const p=get('plans',off.planId);
        result=id('ORD');off.status=kg===off.kg?'accepted':'partial';off.acceptedKg=kg;off.orderId=result;r.orderId=result;r.kg=kg;r.expiresAt=null;
        s.orders.push({id:result,buyerId:off.buyerId,productId:off.productId,priceSatang:off.priceSatang,requestedKg:kg,allocatedKg:kg,acceptedKg:0,cageId:p.cageId,cageIds:[p.cageId],planId:p.id,offerId:off.id,buyerConfirmed:true,farmerConfirmed:false,farmerConfirmations:[],collected:false,status:'waiting',receiveDate:off.date,place:off.place,window:off.window,createdAt:now});
        log('order',result,'จากข้อเสนอ '+off.id+' ตอบรับจริง '+kg+' กก.');break;
      }
      case 'CANCEL_OFFER':case 'EXPIRE_OFFER':{
        coordinator();const off=get('offers',a.offerId);if(['cancelled','expired','rejected'].includes(off.status))break;
        require(!['accepted','partial'].includes(off.status),'ตอบรับแล้ว ให้ยกเลิกออเดอร์ที่เชื่อมกัน');if(a.type==='EXPIRE_OFFER')require(new Date(off.expiresAt)<=new Date(now),'ยังไม่หมดอายุ');
        off.status=a.type==='EXPIRE_OFFER'?'expired':'cancelled';s.reservations.filter(r=>r.offerId===off.id&&r.status==='active').forEach(r=>r.status='released');break;
      }
      case 'CREATE_DELIVERY':{
        coordinator();const o=get('orders',a.orderId);require(o.harvested&&o.buyerConfirmed&&o.farmerConfirmed,'ต้องชั่งจริงและยืนยันทุกฝ่าย');require(!s.deliveries.some(d=>d.orderId===o.id),'มีรอบส่งแล้ว');
        const rs=s.reservations.filter(r=>r.orderId===o.id&&r.status==='active');require(rs.length&&rs.every(r=>r.lotId&&get('lots',r.lotId).quality==='passed'),'ล็อตต้องผ่านคุณภาพ');
        result=id('DEL');s.deliveries.push({id:result,orderId:o.id,planId:o.planId,lotIds:[...new Set(rs.map(r=>r.lotId))],lotUse:rs.reduce((m,r)=>{m[r.lotId]=w((m[r.lotId]||0)+r.kg);return m;},{}),kg:w(rs.reduce((n,r)=>n+r.kg,0)),status:'scheduled',vehicle:a.vehicle||'รถกลุ่มจำลอง',appointment:o.receiveDate+' '+o.window,at:now});
        log('order',o.id,'นัดรอบส่ง '+result);break;
      }
      case 'DISPATCH':{
        coordinator();const d=get('deliveries',a.deliveryId);require(d.status==='scheduled','รอบส่งนี้ส่งแล้ว');d.status='sent';get('orders',d.orderId).status='sent';log('order',d.orderId,'ส่งแล้ว '+d.id);break;
      }
      case 'RECEIVE':{
        const d=get('deliveries',a.deliveryId),o=get('orders',d.orderId);buyer(o);require(d.status==='sent','ต้องส่งแล้วและยังไม่รับมอบ');
        const kg=w(number(a.acceptedKg,'น้ำหนักรับจริง'));require(kg<=d.kg,'รับเกินน้ำหนักส่ง');if(kg<d.kg)require(a.issue?.trim(),'ระบุปัญหาที่รับไม่ครบ');
        d.status='received';d.acceptedKg=kg;d.issue=a.issue||'';o.acceptedKg=kg;o.status=kg===d.kg?'received':'partial';
        s.reservations.filter(r=>r.orderId===o.id).forEach(r=>r.status='fulfilled');
        if(kg<d.kg){let returned=0;d.lotIds.forEach((lotId,index)=>{const l=get('lots',lotId),last=index===d.lotIds.length-1,rejected=last?w(d.kg-kg-returned):w((d.kg-kg)*d.lotUse[lotId]/d.kg);returned=w(returned+rejected);if(rejected)s.lots.push({...clone(l),id:id('LOT'),kg:rejected,storage:'hold',quality:'pending',returnOf:d.id,at:now});});}
        s.financialEntries.push({id:id('FIN'),type:'sale',orderId:o.id,planId:o.planId,amountSatang:Math.round(kg*o.priceSatang),shares:S.calc.orderShares(s,o),at:now});log('order',o.id,'รับจริง '+kg+' กก. '+(a.issue||''));break;
      }
      case 'REPORT_ISSUE':{
        const o=get('orders',a.orderId);require(actor.role==='coordinator'||actor.id===o.buyerId,'ไม่ใช่บัญชีที่เกี่ยวข้อง');require(a.issue?.trim(),'ระบุปัญหา');o.issue=a.issue;log('order',o.id,'แจ้งปัญหา: '+a.issue);break;
      }
      case 'SET_COSTS':{
        coordinator();const p=get('plans',a.planId);require(!s.financialEntries.some(e=>e.planId===p.id&&e.type==='payout'),'จ่ายแล้ว ห้ามแก้ค่าใช้จ่ายย้อนหลัง');
        for(const key of ['pack','transport','group'])p.costs[key]=Math.round(number(a[key],'ค่าใช้จ่าย')*100);
        s.financialEntries.filter(e=>e.planId===p.id&&e.type==='cost').forEach(e=>e.amountSatang=p.costs[e.kind]);log('plan',p.id,'ปรับค่าใช้จ่ายระดับแผนครั้งเดียว');break;
      }
      case 'COLLECT':{
        coordinator();const o=get('orders',a.orderId);require(['received','partial'].includes(o.status)&&!o.collected,'ยังไม่รับมอบหรือบันทึกชำระแล้ว');
        o.collected=true;s.financialEntries.push({id:id('FIN'),type:'collection',orderId:o.id,planId:o.planId,amountSatang:Math.round(o.acceptedKg*o.priceSatang),at:now});log('order',o.id,'บันทึกชำระในเดโม');break;
      }
      case 'PAYOUT':{
        coordinator();const p=get('plans',a.planId),orders=S.calc.planOrders(s,p.id),f=S.calc.finance(s,p.id);
        require(p.harvestId&&orders.length&&orders.every(o=>['received','partial','closed'].includes(o.status)&&o.collected),'ต้องรับมอบและเก็บเงินครบก่อนจ่าย');require(f.unpaid>0,'ไม่มีเงินค้างจ่าย');
        s.financialEntries.push({id:id('FIN'),type:'payout',planId:p.id,ownerId:get('cages',p.cageId).ownerId,amountSatang:f.unpaid,at:now});log('plan',p.id,'จ่ายผู้เลี้ยงในเดโม '+S.util.money(f.unpaid));break;
      }
      case 'CLOSE_ORDER':{
        coordinator();const o=get('orders',a.orderId);require(['received','partial'].includes(o.status)&&o.collected,'ต้องรับมอบและชำระก่อนปิด');o.status='closed';log('order',o.id,'ปิดออเดอร์หลังรับมอบและชำระในเดโม');break;
      }
      default:throw Error('ไม่รู้จักรายการ '+a.type);
    }
    if(a.actionId)s.processedActions.push(a.actionId);s.lastResultId=result;s.updatedAt=new Date().toISOString();return s;
  }
  S.domain={reduce,dispatch(action){return S.store.commit(reduce(S.store.get(),{actionId:S.util.id('ACT'),...action}));}};
})(SPARK);
