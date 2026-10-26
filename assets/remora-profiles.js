(function(root){
  'use strict';
  const limit=5,fields=['sound','masterVolume','bgmVolume','sfxVolume','display','theme','leds','difficulty','best','bestReaction','games','totalCorrect','records','difficultyByGame','phraseCounters','playerName','playerId','tutorialDone'];
  const clone=v=>JSON.parse(JSON.stringify(v));
  function create(storage,defaults,legacy={}){
    let data;try{data=JSON.parse(storage.getItem('remora-profiles'));}catch(_){}
    if(!data||!Array.isArray(data.profiles))data={schema:1,active:0,firstLoginPending:!legacy.playerName,profiles:legacy.playerName?[{...clone(defaults),...clone(legacy),tutorialDone:true}]:[]};
    data.profiles=Array.from({length:limit},(_,i)=>data.profiles[i]||null);
    data.profiles.push({...clone(defaults),...(data.developer||{}),playerName:'XDAXA',playerId:'XDAXA',tutorialDone:true});
    data.active=Number(data.active)>=limit?Math.max(0,data.profiles.slice(0,limit).findIndex(Boolean)):Math.max(0,Math.min(limit-1,Number(data.active)||0));
    const write=()=>{data.developer=data.profiles[limit];storage.setItem('remora-profiles',JSON.stringify(data));};
    const pick=state=>Object.fromEntries(fields.filter(k=>state[k]!==undefined).map(k=>[k,clone(state[k])]));
    function capture(state){if(data.profiles[data.active])data.profiles[data.active]={...data.profiles[data.active],...pick(state)};write();}
    function apply(state,slot){Object.assign(state,clone(defaults),clone(data.profiles[slot]||{}));data.active=slot;write();}
    return {limit,snapshot:()=>clone(data),empty:()=>data.profiles.slice(0,limit).findIndex(p=>!p),capture,
      load(state){apply(state,data.active);},
      lockDeveloper(state){if(data.active!==limit)return;capture(state);const next=data.profiles.slice(0,limit).findIndex(Boolean);apply(state,Math.max(0,next));if(next<0)data.firstLoginPending=true;write();},
      switch(state,slot,developer=false){if(slot===limit&&!developer)return false;if(!data.profiles[slot])return false;capture(state);apply(state,slot);return true;},
      add(state,name,id){if(name==='XDAXA')return false;const slot=data.profiles.slice(0,limit).findIndex(p=>!p);if(slot<0)return false;capture(state);data.profiles[slot]={...clone(defaults),playerName:name,playerId:id,tutorialDone:false};apply(state,slot);data.firstLoginPending=false;write();return true;},
      remove(state,slot){if(slot===limit||!data.profiles[slot])return false;capture(state);data.profiles[slot]=null;if(data.active===slot){const next=data.profiles.slice(0,limit).findIndex(Boolean);apply(state,next<0?0:next);}write();return true;},
      firstLogin(){if(data.profiles.slice(0,limit).every(Boolean))return false;data.firstLoginPending=true;write();return true;},
      finish(state){state.tutorialDone=true;data.firstLoginPending=false;capture(state);}
    };
  }
  root.RemoraProfiles={create,limit};
})(typeof window==='undefined'?globalThis:window);
