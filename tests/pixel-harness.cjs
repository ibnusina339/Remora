const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
function png(width,height,data){
  function chunk(type,bytes){const t=Buffer.from(type),body=Buffer.concat([t,bytes]);let crc=0xffffffff;for(const n of body){crc^=n;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const result=Buffer.alloc(bytes.length+12);result.writeUInt32BE(bytes.length);body.copy(result,4);result.writeUInt32BE((crc^0xffffffff)>>>0,result.length-4);return result;}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
  const rows=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++)Buffer.from(data).copy(rows,y*(width*3+1)+1,y*width*3,(y+1)*width*3);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
function launch(store={value:JSON.stringify({playerName:'PLAYER',playerId:'RM2026',display:100})}){
  const elements=new Map(),pixels=Buffer.alloc(320*240*3),drawCalls=[];
  let now=0,id=0,timers=new Map();
  const make=()=>({listeners:{},attrs:{},style:{values:{},setProperty(k,v){this.values[k]=v;}},classList:{toggle(){}},hidden:false,value:'',checked:false,
    addEventListener(k,f){(this.listeners[k]||=[]).push(f)},setAttribute(k,v){this.attrs[k]=v},reset(){}});
  const el=(name)=>{if(!elements.has(name))elements.set(name,make());return elements.get(name)};
  const context={globalAlpha:1,fillStyle:'#000000',setTransform(...args){if(args.join(',')!=='1,0,0,1,0,0')throw Error('Non-native canvas transform');},drawImage(){},
    fillRect(x,y,w,h){
      if(![x,y,w,h].every(Number.isInteger))throw Error('Fractional pixel coordinates');
      drawCalls.push([x,y,w,h]);
      let hex=this.fillStyle.replace('#','');if(hex.length===3)hex=[...hex].map(c=>c+c).join('');
      const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));const a=this.globalAlpha;
      for(let yy=Math.max(0,y);yy<Math.min(240,y+h);yy++)for(let xx=Math.max(0,x);xx<Math.min(320,x+w);xx++){const p=(yy*320+xx)*3;for(let k=0;k<3;k++)pixels[p+k]=Math.round(rgb[k]*a+pixels[p+k]*(1-a));}
    }};
  el('screen').getContext=()=>context;
  const keys=Array.from({length:6},make);
  const document={getElementById:el,querySelectorAll:()=>keys,listeners:{},addEventListener(k,f){(this.listeners[k]||=[]).push(f)}};
  const schedule=(fn,ms,repeat=0)=>{timers.set(++id,{fn,time:now+ms,repeat});return id;};
  const sandbox={document,window:{},Image:class{complete=false;naturalWidth=0;},performance:{now:()=>now},localStorage:{getItem:k=>k==='remora-sim'?store.value:(store.extra||{})[k]??null,setItem:(k,v)=>{if(k==='remora-sim')store.value=v;else(store.extra||={})[k]=v;},removeItem:k=>{delete(store.extra||{})[k];}},
    setTimeout:(f,t)=>schedule(f,t),clearTimeout:n=>timers.delete(n),setInterval:(f,t)=>schedule(f,t,t),clearInterval:n=>timers.delete(n),
    requestAnimationFrame:f=>schedule(()=>f(now),16),cancelAnimationFrame:n=>timers.delete(n),Math,console};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/remora-cow-sprites.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/remora-cat-sprites.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/remora-feedback.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/remora-meow-sample.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/remora-audio.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/remora-arcade.js'),'utf8'),sandbox);
  for(const file of ['remora-power-policy.js','remora-display-settings.js','remora-profiles.js','remora-tutorial.js','remora-ratings.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/remora-pixel-ui.js'),'utf8'),sandbox);
  let script=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n').split('<script>')[1].split('</script>')[0];
  script=script.replace('      render();\n    })();','      window.__test = {state, render, arcade};\n      render();\n    })();');
  vm.runInContext(script,sandbox);
  function advance(ms){const end=now+ms;let steps=0;for(;;){const entries=[...timers].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time);if(!entries.length)break;if(++steps>10000)throw Error('Timer loop');const [key,t]=entries[0];now=t.time;timers.delete(key);if(t.repeat)timers.set(key,{...t,time:now+t.repeat});t.fn();}now=end;}
  return {store,el,keys,document,pixels,drawCalls,advance,ctx:context,
    press:n=>sandbox.window.remoraSimulator.press(n),state:()=>sandbox.window.remoraSimulator.getState(),
    setBattery:n=>sandbox.window.remoraSimulator.setBatteryPercent(n),
    setCharging:n=>sandbox.window.remoraSimulator.setCharging(n),
    down:n=>sandbox.window.remoraSimulator.keyDown(n),up:n=>sandbox.window.remoraSimulator.keyUp(n),
    boot(){el('power-switch').listeners.click[0]();sandbox.window.remoraSimulator.keyDown(1);sandbox.window.remoraSimulator.keyDown(3);advance(2020);sandbox.window.remoraSimulator.keyUp(1);sandbox.window.remoraSimulator.keyUp(3);advance(2500);},power(){el('power-switch').listeners.click[0]();},
    show(values){Object.assign(sandbox.window.__test.state,values);drawCalls.length=0;sandbox.window.__test.render();},
    capture(file){fs.writeFileSync(file,png(320,240,pixels));},test:sandbox.window.__test};
}
module.exports={launch,png};
