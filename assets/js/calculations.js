(function(S){
  const w=S.util.weight;
  S.calc={
    latest(s,cageId){return s.observations.filter(o=>o.cageId===cageId).reverse().sort((a,b)=>new Date(b.measuredAt)-new Date(a.measuredAt))[0]||null;},
    active(s,r){return r.status==='active'&&(!r.expiresAt||new Date(r.expiresAt)>new Date(s.demoNow));},
    reserved(s,cageId){return w(s.reservations.filter(r=>r.cageId===cageId&&!r.lotId&&this.active(s,r)).reduce((n,r)=>n+r.kg,0));},
    available(s,cageId){const c=S.util.find(s,'cages',cageId);return c?w(Math.max(0,c.liveKg-this.reserved(s,cageId))):0;},
    offerAvailable(s,productId){const p=S.util.find(s,'products',productId),c=p&&S.util.find(s,'cages',p.cageId);return c?w(Math.max(0,Math.min(c.offerKg,this.available(s,c.id)))):0;},
    lotRemaining(s,lot){return w(lot.kg-s.deliveries.filter(d=>d.status==='received'&&d.lotIds.includes(lot.id)).reduce((n,d)=>n+(d.lotUse[lot.id]||0),0));},
    orderParts(s,o){
      const parts=[];
      for(const r of s.reservations.filter(r=>r.orderId===o.id&&['active','fulfilled'].includes(r.status))){
        const l=r.lotId&&S.util.find(s,'lots',r.lotId),planId=l?l.planId:o.planId;if(!planId)continue;
        let part=parts.find(p=>p.planId===planId);if(!part){part={planId,kg:0};parts.push(part);}part.kg=w(part.kg+r.kg);
      }
      return parts.length?parts:o.planId?[{planId:o.planId,kg:o.allocatedKg}]:[];
    },
    orderShares(s,o){
      const parts=this.orderParts(s,o),total=parts.reduce((n,p)=>n+p.kg,0),sale=Math.round(o.acceptedKg*o.priceSatang);let used=0,usedKg=0;
      return parts.map((p,i)=>{const last=i===parts.length-1,money=last?sale-used:Math.round(sale*(total?p.kg/total:0)),kg=last?w(o.acceptedKg-usedKg):w(o.acceptedKg*(total?p.kg/total:0));used+=money;usedKg=w(usedKg+kg);return {...p,amountSatang:money,acceptedKg:kg};});
    },
    planOrders(s,planId){return s.orders.filter(o=>!['cancelled','rejected'].includes(o.status)&&this.orderParts(s,o).some(p=>p.planId===planId));},
    support(s,p){const accepted=w(this.planOrders(s,p.id).filter(o=>o.buyerConfirmed).reduce((n,o)=>n+this.orderParts(s,o).filter(x=>x.planId===p.id).reduce((sum,x)=>sum+x.kg,0),0)),cold=p.coldConfirmed?p.coldKg:0;return{accepted,cold,unsupported:w(Math.max(0,p.proposedKg-accepted-cold))};},
    finance(s,planId){
      const plans=planId?s.plans.filter(p=>p.id===planId):s.plans,ids=new Set(plans.map(p=>p.id));
      const orders=s.orders.filter(o=>!['cancelled','rejected'].includes(o.status)&&this.orderParts(s,o).some(p=>ids.has(p.planId)));
      const rows=orders.flatMap(o=>this.orderShares(s,o).filter(p=>ids.has(p.planId)).map(p=>({...p,order:o})));
      const sales=rows.reduce((n,r)=>n+r.amountSatang,0),collected=rows.filter(r=>r.order.collected).reduce((n,r)=>n+r.amountSatang,0);
      const costs=plans.filter(p=>p.harvestId).reduce((n,p)=>n+p.costs.pack+p.costs.transport+p.costs.group,0);
      const paid=s.financialEntries.filter(x=>ids.has(x.planId)&&x.type==='payout').reduce((n,x)=>n+x.amountSatang,0);
      const acceptedKg=w(rows.reduce((n,r)=>n+r.acceptedKg,0));
      const booked=orders.reduce((n,o)=>n+Math.round(o.requestedKg*o.priceSatang*this.orderParts(s,o).filter(p=>ids.has(p.planId)).reduce((sum,p)=>sum+p.kg,0)/(o.allocatedKg||1)),0);
      return{sales,collected,costs,paid,net:sales-costs,unpaid:Math.max(0,sales-costs-paid),uncollected:sales-collected,acceptedKg,perKg:acceptedKg?Math.round((sales-costs)/acceptedKg):0,booked};
    }
  };
})(SPARK);
