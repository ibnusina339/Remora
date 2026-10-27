(function(root){
 'use strict';
 const intervals=[0,1,2,5,10,15,30];
 const valid=value=>intervals.includes(value)?value:5;
 function create(){
  let last=-1;
  return {touch(now){last=now;},due(now,minutes,active){
   if(!active||last<0){last=now;return false;}
   minutes=valid(minutes);return minutes>0&&now-last>=minutes*60000;
  }};
 }
 root.RemoraIdlePolicy={intervals,valid,create};
})(typeof window==='undefined'?globalThis:window);
