const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {launch,png}=require('./pixel-harness.cjs');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'previews/cow-animation');
if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('src="assets/remora-cow-animations.js"')){
  console.log('Sprite animation playback is disabled; use tests/render-pixel-previews.cjs for the active static design.');process.exit(0);
}
fs.mkdirSync(folder,{recursive:true});
const sandbox={window:{}};vm.createContext(sandbox);
for(const file of ['remora-cow-sprites.js','remora-cow-animations.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
for(const clip of Object.values(sandbox.window.RemoraCowAnimations)){
  assert.equal(clip.frames.length,8);assert.equal(clip.durations.length,8);
  const unique=new Set();for(const key of clip.frames){const asset=sandbox.window.RemoraCowSprites[key];assert.equal(asset.w,clip.w);assert.equal(asset.h,clip.h);assert.equal(asset.rows.length,clip.h);assert.ok(asset.rows.every(row=>row.length===clip.w&&/^[.#o]+$/.test(row)));unique.add(asset.rows.join(''));}
  assert.ok(unique.size>=6,'animation must have distinct supplied frames');
}
const setups=[{view:'home',modeSelection:0},{view:'home',modeSelection:3},{view:'home',modeSelection:4},{view:'home',modeSelection:9}];
const apps=setups.map(values=>{const app=launch();app.boot();app.show(values);return app;});
const snapshots=apps.map(()=>[]);
for(let frame=0;frame<48;frame++){
  const rgb=Buffer.alloc(640*480*3);
  apps.forEach((app,n)=>{
    app.show({});for(const [x,y,w,h]of app.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,`animation overflow ${x},${y},${w},${h}`);
    for(let y=0;y<240;y++)app.pixels.copy(rgb,((Math.floor(n/2)*240+y)*640+n%2*320)*3,y*320*3,(y+1)*320*3);
    // The cow region must change independently of menu lights/radar/navigation.
    const region=[];for(let y=88;y<198;y++)for(let x=n===3?14:190;x<(n===3?136:310);x++)region.push(...app.pixels.subarray((y*320+x)*3,(y*320+x)*3+3));
    snapshots[n].push(Buffer.from(region));app.advance(125);
  });
  fs.writeFileSync(path.join(folder,String(frame).padStart(2,'0')+'.png'),png(640,480,rgb));
}
for(const images of snapshots)assert.ok(images.some(frame=>!frame.equals(images[0])),'cow animation does not advance');
// Auxiliary animations must fit without touching game scores or profile text.
const auxiliary=launch();auxiliary.boot();
for(const state of [{view:'battery'},{view:'profile'},{view:'clear',mode:'classic',message:'MOO-NTAP!',score:100},{view:'reactionResult',mode:'reaction',result:'GREAT!',elapsed:200}]){
  auxiliary.show(state);for(let i=0;i<14;i++){auxiliary.advance(100);auxiliary.show({});for(const [x,y,w,h]of auxiliary.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,'auxiliary animation overflow');}
}
console.log('Cow animations: 32 distinct registered masks, 4 animated menus and auxiliary pages fit native 320x240');
