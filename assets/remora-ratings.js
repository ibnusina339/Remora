(function(root){
 'use strict';
 const questions=['DAYA TARIK TAMPILAN','KEUNIKAN REMORA','KEMUDAHAN NAVIGASI','KENYAMANAN KONTROL','KEPUASAN KESELURUHAN'];
 const suggestions=['TERLALU MUDAH','TERLALU SULIT','TEMPO TERLALU CEPAT','KONTROL MEMBINGUNGKAN','PETUNJUK KURANG JELAS','TAMPILAN SULIT DIBACA','SUARA KURANG NYAMAN'];
 const thanks='terimakasih sudah kasih rating buat Remora, segala masukan sangat berarti';
 const views=new Set(['rateMenu','rateGames','ratingStars','ratingSuggestions','ratingThanks','devGate','rateResults','rateArchive','rateReport','ratingInvite','ratingPromptSettings']);
 function create(host){
  const s=host.state;let records=[],gateCount=0,gateAt=-Infinity,resultCount=0,resultAt=-Infinity;
  try{const value=JSON.parse(host.storage.getItem('remora-ratings')||'[]');if(Array.isArray(value))records=value;}catch(_){}
  s.developerUnlocked=false;
  const developer=()=>s.activeProfile===5&&s.developerUnlocked;
  let policy={enabled:true,completed:0,lastPromptGame:0,asked:{},play:{}},lastPromptAt=-Infinity,rateReturn=null,askTimes={};
  try{const saved=JSON.parse(host.storage.getItem('remora-rating-policy'));if(saved&&typeof saved==='object')policy={...policy,...saved,asked:saved.asked||{},play:saved.play||{}};}catch(_){}
  s.ratePromptEnabled=policy.enabled!==false;
  const policyWrite=()=>{try{host.storage.setItem('remora-rating-policy',JSON.stringify(policy));return true;}catch(_){return false;}};
  const sfx=name=>host.sfx?.(name);
  function openPromptSettings(){if(!developer())return;s.ratePromptEnabled=policy.enabled!==false;s.view='ratingPromptSettings';host.render();}
  // A lane belongs to a profile/game. Difficulty changes restart score comparison.
  const laneFor=(profile,game)=>{
   const key=profile+':'+game;
   const lane=policy.play[key]||(policy.play[key]={games:0,lastAsk:0,changeAt:0,difficulty:-1,baseline:0,recent:0,baselineCount:0,recentCount:0,prompted:false,recentMin:10000000,recentMax:0});
   if(!Number.isFinite(lane.recentMin)||!Number.isFinite(lane.recentMax))Object.assign(lane,{recent:0,recentCount:0,recentMin:10000000,recentMax:0});
   return lane;
  };
  const changed=lane=>!!lane.changeAt&&lane.games>=lane.changeAt&&lane.games-lane.changeAt<6;
  function observe(lane,difficulty,score){
   lane.games++;
   if(lane.difficulty!==difficulty)Object.assign(lane,{difficulty,baseline:0,recent:0,baselineCount:0,recentCount:0,changeAt:0,recentMin:10000000,recentMax:0});
   score=Math.min(10000000,Math.max(0,Math.round(score||0)));
   if(lane.baselineCount<3){lane.baseline+=score;lane.baselineCount++;return;}
   lane.recent+=score;lane.recentMin=Math.min(lane.recentMin,score);lane.recentMax=Math.max(lane.recentMax,score);if(++lane.recentCount<3)return;
   const large=Math.abs(lane.baseline-lane.recent)>=1800&&(lane.recent>=lane.baseline*2||lane.baseline>=lane.recent*2);
   const consistent=(lane.recent>=lane.baseline*2&&lane.recentMin*12>=lane.baseline*5)||(lane.baseline>=lane.recent*2&&lane.recentMax*4<=lane.baseline);
   if(large){if(consistent){lane.changeAt=lane.games;lane.baseline=lane.recent;}}
   else lane.baseline=Math.floor((lane.baseline*3+lane.recent)/4);
   lane.recent=0;lane.recentCount=0;lane.recentMin=10000000;lane.recentMax=0;
  }
  function markAsked(lane,key){
   Object.assign(lane,{prompted:true,lastAsk:lane.games,changeAt:0});askTimes[key]=host.now();
   policy.lastPromptGame=policy.completed;lastPromptAt=host.now();
  }
  function gameOver(info){
   const game=root.RemoraArcade.catalog.findIndex(g=>g.mode===info.mode);
   if(game<0)return;
   const profile=s.playerId,key=profile+':'+game,lane=laneFor(profile,game);
   observe(lane,info.difficulty??s.difficulty??1,info.score);policy.completed++;if(!policyWrite())return;
   const eligible=()=>{
    const change=changed(lane),gap=lane.games-lane.lastAsk;
    const repeatReady=!lane.prompted||(gap>=(change?6:12)&&(askTimes[key]===undefined||host.now()-askTimes[key]>=(change?600000:1800000)));
    const meaningful=info.clears>=2||info.score>=600||(info.newRecord&&info.clears>=1)||change;
    return s.playerId===profile&&policy.enabled!==false&&records.length<64&&!developer()&&repeatReady&&meaningful&&policy.completed>=3&&(!policy.lastPromptGame||policy.completed-policy.lastPromptGame>=6)&&host.now()-lastPromptAt>=600000;
   };
   if(!eligible())return;
   host.later?.(()=>{
    if(s.view!=='gameover'||s.mode!==info.mode||!eligible())return;
    markAsked(lane,key);if(!policyWrite())return;s.rateInviteGame=game;s.view='ratingInvite';sfx('invite');host.render();
   },2800);
  }

  function open(){rateReturn=null;s.view='rateMenu';s.rateSelection=0;s.rateHint='';host.render();}
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
   try{host.storage.setItem('remora-ratings',JSON.stringify(next));records=next;if(s.rateKind>=0)markAsked(laneFor(s.playerId,s.rateKind),s.playerId+':'+s.rateKind);else{policy.lastPromptGame=policy.completed;lastPromptAt=host.now();}policyWrite();s.view='ratingThanks';s.rateHint='';sfx('ratingSaved');}catch(_){s.rateHint='GAGAL SIMPAN. COBA LAGI';}
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
   if(['rateResults','rateArchive','rateReport','ratingPromptSettings'].includes(s.view)&&!developer()){s.view='stats';host.render();return true;}
   s.rateHint='';sfx(key===4?'back':s.view==='ratingStars'&&(key===1||key===3)?'star':key===6?'confirm':'move');
   if(s.view==='ratingPromptSettings'){
    if(key===1||key===3){policy.enabled=key===3;s.ratePromptEnabled=policy.enabled;policyWrite();sfx('confirm');}
    else if(key===4||key===6){s.view='settings';s.selection=11;}
   }else if(s.view==='ratingInvite'){
    if(key===4){s.view='gameover';rateReturn=null;sfx('back');}
    else if(key===6){const game=s.rateInviteGame;start(game);rateReturn='gameover';sfx('confirm');}
   }else if(s.view==='devGate'){
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
    else if(key===4){if(s.rateQuestion>0)s.rateQuestion--;else if(rateReturn){s.view=rateReturn;rateReturn=null;}else{s.view=s.rateKind<0?'rateMenu':'rateGames';s.rateSelection=s.rateKind<0?1:s.rateKind;}}
    else if(key===6){if(!s.rateStars[s.rateQuestion])s.rateHint='ISI MINIMAL SETENGAH BINTANG';else if(s.rateKind>=0){s.view='ratingSuggestions';s.rateSelection=0;}else if(s.rateQuestion<4)s.rateQuestion++;else saveRecord();}
   }else if(s.view==='ratingSuggestions'){
    if(key===2||key===5)s.rateSelection=(s.rateSelection+(key===2?6:1))%7;
    else if(key===4)s.view='ratingStars';
    else if(key===3)saveRecord();
    else if(key===6){const bit=1<<s.rateSelection,count=s.rateSuggestions.toString(2).replace(/0/g,'').length;if(s.rateSuggestions&bit)s.rateSuggestions^=bit;else if(count<2)s.rateSuggestions|=bit;else s.rateHint='MAKSIMAL DUA SARAN';}
   }else if(s.view==='ratingThanks'){
    if(key===4||key===6){if(rateReturn){s.view=rateReturn;rateReturn=null;}else open();}
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
   if(s.rateHint)sfx('warning');host.render();return true;
  }
  return {open,gate,press,statsKey,gameOver,openPromptSettings,isView:view=>views.has(view)};
 }
 root.RemoraRatings={questions,suggestions,thanks,create};
})(typeof window==='undefined'?globalThis:window);
