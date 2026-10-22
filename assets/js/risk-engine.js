// Pure Function: ไม่วินิจฉัยโรค ไม่ตั้งเกณฑ์ค่าน้ำวิชาการขึ้นเอง
(function(S){
  S.evaluateCageRisk=function(obs,history,config,now,species='grouper',context={}){
    const reasons=[],missingFields=[],ruleIds=[],recommendedTasks=[];let urgency='unknown',dataQuality='complete';
    if(!obs)return{urgency,dataQuality:'missing',reasons:['ยังไม่มีข้อมูลการวัด'],missingFields:['do','temperature','salinity','ph'],ruleIds:['DATA-00'],recommendedTasks:['บันทึกค่าน้ำและอาการ'],version:config.ruleVersion,ageHours:0};
    const age=Math.max(0,(new Date(now)-new Date(obs.measuredAt))/3600000);
    for(const key of Object.keys(config.units)){
      if(obs.values[key]===null||obs.values[key]===undefined){missingFields.push(key);if(dataQuality!=='stale')dataQuality='missing';}
      else if(age>config.freshnessHours[key]){dataQuality='stale';reasons.push(key+' อายุ '+age.toFixed(1)+' ชม. เกินช่วงเดโม '+config.freshnessHours[key]+' ชม.');ruleIds.push('DATA-AGE-'+key);recommendedTasks.push('วัด '+key+' ซ้ำพร้อมเวลา');}
      if(obs.values[key]===0){reasons.push(key+' วัดได้ 0 ต้องตรวจเครื่องและยืนยันค่า ไม่ใช่ข้อมูลที่ขาด');ruleIds.push('DATA-ZERO');recommendedTasks.push('ตรวจเครื่องวัดและวัดซ้ำ');if(dataQuality==='complete')dataQuality='check';}
    }
    if(missingFields.length){ruleIds.push('DATA-MISSING');recommendedTasks.push('เพิ่มค่าที่ขาด: '+missingFields.join(', '));}
    if(missingFields.includes('do'))reasons.push('ยังประเมินออกซิเจนไม่ได้ เพราะไม่มี DO');
    if(obs.symptoms.some(x=>['ลอยหัว','พบปลาตาย'].includes(x))){urgency='urgent';ruleIds.push('SYM-01');reasons.push('พบอาการ '+obs.symptoms.join(', ')+' ต้องเร่งตรวจและส่งต่อ ยังไม่วินิจฉัยสาเหตุ');recommendedTasks.unshift('เร่งตรวจอาการและติดต่อผู้รับผิดชอบ');}
    else if(obs.symptoms.some(x=>['กินอาหารลดลง','ว่ายผิดปกติ'].includes(x))){urgency='watch';ruleIds.push('SYM-02');reasons.push('มีอาการที่ต้องตรวจเพิ่มเติม ยังไม่ทราบสาเหตุ');recommendedTasks.push('ตรวจอาการและบันทึกติดตาม');}
    const h=history.filter(o=>o.cageId===obs.cageId&&o.source===obs.source&&o.point===obs.point&&o.values.do!==null&&o.values.do!==undefined&&new Date(o.measuredAt)<=new Date(obs.measuredAt)).sort((a,b)=>new Date(a.measuredAt)-new Date(b.measuredAt));
    const unique=h.filter((o,i)=>!i||o.measuredAt!==h[i-1].measuredAt).slice(-3);
    if(unique.length===3&&unique[0].values.do>unique[1].values.do&&unique[1].values.do>unique[2].values.do){
      if(urgency!=='urgent')urgency='watch';ruleIds.push('TREND-DO-01');
      reasons.push('DO ลดลงสองช่วง: '+unique.map(o=>o.values.do+' mg/L ณ '+S.util.date(o.measuredAt)).join(' → ')+' (กฎสาธิต)');recommendedTasks.push('ตรวจเครื่องและวัด DO ซ้ำ');
    }else if(unique.length<3)reasons.push('ข้อมูลที่เปรียบเทียบได้ยังไม่ครบ 3 เวลา จึงไม่สรุปแนวโน้มลดลงสองช่วง');
    if(context.openUrgentIncident){urgency='urgent';ruleIds.push('INC-OPEN');reasons.push('เหตุเร่งตรวจเดิมยังเปิดอยู่ ต้องตรวจผลติดตาม ไม่ลดระดับจากค่าน้ำชุดใหม่อัตโนมัติ');recommendedTasks.unshift('ตรวจติดตามเหตุเร่งด่วนเดิม');}
    if(urgency==='unknown'&&!missingFields.length&&dataQuality==='complete')urgency='routine';
    if(!['urgent','watch'].includes(urgency))reasons.push('ยังไม่พบเหตุเตือนจากอาการและแนวโน้มที่รองรับในข้อมูลที่มี');
    reasons.push('ยังไม่มีเกณฑ์ค่าน้ำสัมบูรณ์ที่ผู้เชี่ยวชาญยืนยันสำหรับปลาและระยะเลี้ยงนี้ จึงไม่ตัดสินว่าปลาปลอดภัย');
    if(species!=='grouper')reasons.push('รองรับการบันทึกข้อมูลและอาการ แต่ยังไม่มีกฎค่าน้ำเฉพาะชนิดนี้');
    return{urgency,dataQuality,reasons,missingFields,ruleIds:[...new Set(ruleIds)],recommendedTasks:[...new Set(recommendedTasks)],version:config.ruleVersion,ageHours:age};
  };
})(SPARK);
