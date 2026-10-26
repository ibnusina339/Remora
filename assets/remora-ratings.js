(function(root){
 'use strict';
 const questions=['DAYA TARIK TAMPILAN','KEUNIKAN REMORA','KEMUDAHAN NAVIGASI','KENYAMANAN KONTROL','KEPUASAN KESELURUHAN'];
 const suggestions=['TERLALU MUDAH','TERLALU SULIT','TEMPO TERLALU CEPAT','KONTROL MEMBINGUNGKAN','PETUNJUK KURANG JELAS','TAMPILAN SULIT DIBACA','SUARA KURANG NYAMAN'];
 const thanks='terimakasih sudah kasih rating buat Remora, segala masukan sangat berarti';
 const views=new Set(['rateMenu','rateGames','ratingStars','ratingSuggestions','ratingThanks','devGate','rateResults','rateArchive','rateReport']);
 function create(host){
  const s=host.state;let records=[],gateCount=0,gateAt=-Infinity,resultCount=0,resultAt=-Infinity;
  try{const value=JSON.parse(host.storage.getItem('remora-ratings')||'[]');if(Array.isArray(value))records=value;}catch(_){}
  s.developerUnlocked=false;
  const developer=()=>s.activeProfile===5&&s.developerUnlocked;
  function open(){s.view='rateMenu';s.rateSelection=0;s.rateHint='';host.render();}
  function gate(){gateCount=0;gateAt=-Infinity;s.view='devGate';host.render();}
  function start(kind){s.rateKind=kind;s.rateQuestion=0;s.rateStars=[0,0,0,0,0];s.rateSuggestions=0;s.rateHint='';s.view='ratingStars';}
  function report(record){
   const rows=['RATE '+record.id,'DARI '+record.profileName,'ID '+record.profileId];
   if(record.game>=0){rows.push(root.RemoraArcade.catalog[record.game].name,'STARS:'+record.stars[0],'SARAN');let any=false;suggestions.forEach((value,i)=>{if(record.suggestions&(1<<i)){rows.push(value);any=true;}});if(!any)rows.push('TIDAK ADA SARAN DIPILIH');}
   else questions.forEach((question,i)=>rows.push(question,'STARS:'+record.stars[i]));
   return rows;
  }
  function saveRecord(){
   const stars=s.rateStars.slice(0,s.rateKind<0?5:1);
   if(stars.some(n=>!Number.isInteger(n)||n<1||n>10)){s.rateHint='MINIMAL SETENGAH BINTANG';return;}
   if(records.length>=64){s.rateHint='ARSIP PENUH. HUBUNGI DEVELOPER';return;}
   const record={id:records.reduce((n,r)=>Math.max(n,r.id||0),0)+1,profileId:s.playerId,profileName:s.playerName,game:s.rateKind,stars,suggestions:s.rateSuggestions};
   const next=[...records,record];
   try{host.storage.setItem('remora-ratings',JSON.stringify(next));records=next;s.view='ratingThanks';s.rateHint='';}catch(_){s.rateHint='GAGAL SIMPAN. COBA LAGI';}
  }
  function statsKey(key){
   if(!developer()){resultCount=0;return false;}
   if(key!==3){resultCount=0;return false;}
   const now=host.now();resultCount=now-resultAt<2000?resultCount+1:1;resultAt=now;
   if(resultCount===3){resultCount=0;s.view='rateResults';s.rateSelection=0;host.render();}
   return true;
  }
  function press(key){
   if(!views.has(s.view))return false;
   if(['rateResults','rateArchive','rateReport'].includes(s.view)&&!developer()){s.view='stats';host.render();return true;}
   s.rateHint='';
   if(s.view==='devGate'){
    if(key===4)s.view='profiles';
    else if(key===3){const now=host.now();gateCount=now-gateAt<2000?gateCount+1:1;gateAt=now;if(gateCount===3){host.profiles.switch(s,5,true);s.developerUnlocked=true;host.save();host.home();return true;}}
    else gateCount=0;
   }else if(s.view==='rateMenu'){
    if(key===2||key===5)s.rateSelection=1-s.rateSelection;
    else if(key===4){host.home();return true;}
    else if(key===6){if(s.rateSelection===0){s.view='rateGames';s.rateSelection=0;}else start(-1);}
   }else if(s.view==='rateGames'){
    if(key===2||key===5)s.rateSelection=(s.rateSelection+(key===2?10:1))%11;
    else if(key===4){s.view='rateMenu';s.rateSelection=0;}
    else if(key===6)start(s.rateSelection);
   }else if(s.view==='ratingStars'){
    if(key===1||key===3)s.rateStars[s.rateQuestion]=Math.max(1,Math.min(10,s.rateStars[s.rateQuestion]+(key===1?-1:1)));
    else if(key===4){if(s.rateQuestion>0)s.rateQuestion--;else{s.view=s.rateKind<0?'rateMenu':'rateGames';s.rateSelection=s.rateKind<0?1:s.rateKind;}}
    else if(key===6){if(!s.rateStars[s.rateQuestion])s.rateHint='ISI MINIMAL SETENGAH BINTANG';else if(s.rateKind>=0){s.view='ratingSuggestions';s.rateSelection=0;}else if(s.rateQuestion<4)s.rateQuestion++;else saveRecord();}
   }else if(s.view==='ratingSuggestions'){
    if(key===2||key===5)s.rateSelection=(s.rateSelection+(key===2?6:1))%7;
    else if(key===4)s.view='ratingStars';
    else if(key===3)saveRecord();
    else if(key===6){const bit=1<<s.rateSelection,count=s.rateSuggestions.toString(2).replace(/0/g,'').length;if(s.rateSuggestions&bit)s.rateSuggestions^=bit;else if(count<2)s.rateSuggestions|=bit;else s.rateHint='MAKSIMAL DUA SARAN';}
   }else if(s.view==='ratingThanks'){
    if(key===4||key===6)open();
   }else if(s.view==='rateResults'){
    if(key===2||key===5)s.rateSelection=1-s.rateSelection;
    else if(key===4)s.view='stats';
    else if(key===6){s.rateFilter=s.rateSelection;s.rateRecords=records.filter(r=>(r.game>=0)===(s.rateFilter===0));s.rateSelection=0;s.view='rateArchive';}
   }else if(s.view==='rateArchive'){
    if((key===2||key===5)&&s.rateRecords.length)s.rateSelection=(s.rateSelection+(key===2?s.rateRecords.length-1:1))%s.rateRecords.length;
    else if(key===4){s.view='rateResults';s.rateSelection=s.rateFilter;}
    else if(key===6&&s.rateRecords.length){s.rateReportRows=report(s.rateRecords[s.rateSelection]);s.rateScroll=0;s.view='rateReport';}
   }else if(s.view==='rateReport'){
    if(key===2||key===5)s.rateScroll=Math.max(0,Math.min(Math.max(0,s.rateReportRows.length-5),s.rateScroll+(key===2?-1:1)));
    else if(key===4)s.view='rateArchive';
   }
   host.render();return true;
  }
  return {open,gate,press,statsKey,isView:view=>views.has(view)};
 }
 root.RemoraRatings={questions,suggestions,thanks,create};
})(typeof window==='undefined'?globalThis:window);
