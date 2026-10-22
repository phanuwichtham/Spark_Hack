(function (S) {
  S.util = {
    esc: value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    clone: value => JSON.parse(JSON.stringify(value)),
    id: prefix => prefix + '-' + (globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0,12) : Date.now().toString(36)+Math.random().toString(36).slice(2,7)),
    kg: value => new Intl.NumberFormat('th-TH',{maximumFractionDigits:3}).format(Number(value||0))+' กก.',
    money: satang => new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(satang/100)+' บาท',
    date: value => value ? new Date(value).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'ยังไม่มีข้อมูล',
    localTime: value => new Date(new Date(value).getTime()+7*3600000).toISOString().slice(0,19),
    fromThaiTime: value => value ? new Date(value+(value.length===16?':00':'')+'+07:00').toISOString() : null,
    query: key => new URLSearchParams(location.search).get(key),
    weight: value => Math.round(Number(value)*1000)/1000,
    user: state => state.users.find(u=>u.id===state.currentUserId),
    find: (state,type,id) => state[type].find(x=>x.id===id),
    download(name,data) {
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'application/json'})); a.download=name; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    }
  };
})(SPARK);
