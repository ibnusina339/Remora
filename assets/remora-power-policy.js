/* Rev K2 sheet 9 plus charging KEY1 peek. No platform or rendering dependencies. */
(function(root){
  'use strict';
  function create(){
    let phase='off',until=0,combo=-1,peek=-1,peekConsumed=false,lastUsb=false,low=false,charge=false;
    function begin(now,input){phase='standby';lastUsb=input.usb;low=false;charge=false;combo=-1;peek=-1;peekConsumed=false;return update(now,input);}
    function update(now,{usb,percent,keys=0,critical=false}){
      if(phase==='off')return phase;
      const wasLow=low,wasCharge=charge;
      if(percent<=5)low=true;else if(percent>=10)low=false;
      if(!usb)charge=false;else if(percent>=80)charge=true;
      const inserted=usb&&!lastUsb;lastUsb=usb;
      if(critical){phase='cutoff';return phase;}
      if(low&&!wasLow){phase='lowNotice';until=now+2000;}
      else if(charge&&!wasCharge){phase='chargeNotice';until=now+2000;}
      else if(phase==='standby'&&inserted){phase='usbNotice';until=now+2000;}
      if(['lowNotice','chargeNotice','usbNotice','batteryPeek'].includes(phase)&&now>=until)phase='standby';
      if(keys!==1){peek=-1;peekConsumed=false;}
      if(phase==='standby'&&usb&&keys===1&&!peekConsumed){
        if(peek<0)peek=now;
        if(now-peek>=2000){phase='batteryPeek';until=now+5000;peekConsumed=true;}
      }else if(phase!=='batteryPeek')peek=-1;
      if(phase==='standby'&&!low&&!charge&&keys===5){
        if(combo<0)combo=now;
        if(now-combo>=2000){phase='play';combo=-1;}
      }else combo=-1;
      return phase;
    }
    return {begin,update,off(){phase='off';},standby(){phase='standby';combo=-1;peek=-1;},phase:()=>phase,locks:()=>({low,charge})};
  }
  root.RemoraPowerPolicy={create};
})(typeof window==='undefined'?globalThis:window);
