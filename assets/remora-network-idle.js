(function(root){
 'use strict';
 function create(){
  let last=-1,active=false,context='outside';
  return {touch(now){last=now;},due(now,radio,networkScreen,setupPortal,protectedOperation){
   const next=setupPortal?'setup':networkScreen?'screen':'outside';
   if(!radio){active=false;last=now;return false;}
   if(!active||next!==context||protectedOperation){active=true;context=next;last=now;return false;}
   const interval=next==='setup'?300000:next==='screen'?120000:30000;
   return last>=0&&now-last>=interval;
  }};
 }
 root.RemoraNetworkIdle={create};
})(typeof window==='undefined'?globalThis:window);
