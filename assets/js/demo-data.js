// Seed โหลดครั้งแรกหรือเมื่อยืนยันเริ่มชุดใหม่เท่านั้น ทุกข้อมูลเป็นสมมติ
(function (S) {
  S.seed = function(scenario='normal',clock=new Date(Math.floor(Date.now()/1000)*1000).toISOString()) {
    const ago=h=>new Date(new Date(clock).getTime()-h*3600000).toISOString();
    const observation=(id,cageId,h,values,symptoms=[])=>({id,cageId,values,symptoms,measuredAt:ago(h),receivedAt:clock,symptomAt:ago(h),source:'เครื่องวัดจำลอง',point:'ผิวน้ำ 0.5 ม.',instrument:'ต้องตรวจสอบตามรอบ',recorder:'ข้อมูลสมมติ',note:''});
    const buyer=(id,name,optin=true)=>({id,name,role:'buyer',contact:id.toLowerCase()+'@example.invalid',optin,species:'grouper',maxKg:40,offerProductIds:['P01'],offerDate:S.util.localTime(clock).slice(0,10),offerWindow:'09:00–12:00'});
    return {
      schemaVersion:1,revision:0,updatedAt:clock,demoNow:clock,scenario,
      currentUserId:scenario==='normal'?'R01':scenario==='missing'?'F03':'F01',
      users:[
        {id:'F01',name:'พี่สมชาย',role:'farmer'},{id:'F02',name:'พี่มาลี',role:'farmer'},{id:'F03',name:'พี่อนันต์',role:'farmer'},
        buyer('R01','ร้านครัวริมเล • ร้าน A'),buyer('R02','ร้านบ้านทะเล • ร้าน B'),buyer('R03','ร้านอ่าวสงขลา • ร้าน C',false),
        {id:'CO01',name:'คุณนิด • ผู้ประสาน',role:'coordinator'}
      ],
      cages:[
        {id:'C01',ownerId:'F01',name:'ปลาเก๋าดอกแดง',species:'grouper',productId:'P01',stage:'เตรียมเสนอขาย',count:250,avgKg:0.8,liveKg:200,offerKg:50,surveyAt:clock},
        {id:'C02',ownerId:'F02',name:'ปลาเก๋าดอกแดง',species:'grouper',productId:'P02',stage:'ระยะขุน',count:130,avgKg:1,liveKg:130,offerKg:0,surveyAt:ago(24)},
        {id:'C03',ownerId:'F01',name:'ปลาเก๋าดอกแดง',species:'grouper',productId:'P01',stage:'ติดตามอาการ',count:100,avgKg:0.8,liveKg:80,offerKg:0,surveyAt:clock},
        {id:'C04',ownerId:'F03',name:'ปลากะพงสามน้ำ',species:'seabass',productId:'P03',stage:'ระยะขุน',count:100,avgKg:1,liveKg:100,offerKg:0,surveyAt:clock}
      ],
      observations:[
        observation('OBS-01','C01',2,{do:5.1,temperature:29,salinity:18,ph:7.5}),
        observation('OBS-02','C01',1,{do:5.3,temperature:29.2,salinity:18,ph:7.6}),
        observation('OBS-03','C01',0,{do:5.2,temperature:29.1,salinity:18,ph:7.5}),
        observation('OBS-04','C02',28,{do:4.8,temperature:30,salinity:17,ph:7.4}),
        observation('OBS-05','C03',0,{do:3.2,temperature:31,salinity:18,ph:null},['ลอยหัว']),
        observation('OBS-06','C04',0,{do:null,temperature:30,salinity:16,ph:null})
      ],
      products:[
        {id:'P01',name:'ปลาเก๋าดอกแดง • ไซซ์จาน',species:'grouper',size:'0.6–1.2 กก./ตัว',priceSatang:34000,image:'grouper.webp',cageId:'C01'},
        {id:'P02',name:'ปลาเก๋าดอกแดง • ตัวใหญ่',species:'grouper',size:'มากกว่า 1.2 กก./ตัว',priceSatang:32000,image:'grouper.webp',cageId:'C02'},
        {id:'P03',name:'ปลากะพงสามน้ำ',species:'seabass',size:'ประมาณ 1 กก./ตัว',priceSatang:18000,image:'seabass.webp',cageId:'C04'}
      ],
      assessments:[],incidents:[],tasks:[],orders:[],reservations:[],offers:[],plans:[],harvests:[],lots:[],deliveries:[],qualityChecks:[],financialEntries:[],audit:[],notifications:[],drafts:{},processedActions:[]
    };
  };
})(SPARK);
