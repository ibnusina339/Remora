/* Clock trials are emulated here. Physical FPS is measured by the firmware. */
(function(root){
  const clocks=[10,16,20,26,40],timeout=15000;
  function create(storage){
    let selected=Number(storage.getItem('remora-spi-mhz'))||10;
    if(!clocks.includes(selected)||storage.getItem('remora-spi-pending'))selected=10;
    storage.setItem('remora-spi-mhz',String(selected));storage.removeItem?.('remora-spi-pending');
    let pending=false,deadline=0;
    return {clocks,current:()=>selected,pending:()=>pending,remaining:now=>Math.max(0,Math.ceil((deadline-now)/1000)),
      trial(value,now){selected=value;pending=true;deadline=now+timeout;storage.setItem('remora-spi-pending','1');},
      confirm(){pending=false;storage.setItem('remora-spi-mhz',String(selected));storage.removeItem?.('remora-spi-pending');},
      reset(){selected=10;pending=false;storage.setItem('remora-spi-mhz','10');storage.removeItem?.('remora-spi-pending');},
      tick(now){if(pending&&now>=deadline){this.reset();return true;}return false;}};
  }
  root.RemoraDisplaySettings={create,clocks,timeout};
})(typeof window==='undefined'?globalThis:window);
