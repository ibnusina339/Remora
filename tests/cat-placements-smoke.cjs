const assert=require('node:assert/strict');
const fs=require('node:fs');
const {launch,png}=require('./pixel-harness.cjs');
const app=launch();app.boot();
const first=app.state().peekInfoGame;
assert.ok(first>=0&&first<11);
app.power();app.advance(2600);app.power();app.advance(2500);
assert.notEqual(app.state().peekInfoGame,first,'choose a new guide on the next power-on');
const chosen=app.state().peekInfoGame;
const shots=[];
for(const side of ['left','right']){
  let changedGuides=0;
  for(let modeSelection=0;modeSelection<11;modeSelection++){
    app.show({view:'gameInfo',modeSelection,peekInfoGame:-1,peekInfoSide:side,peekInfoBottom:64});
    const plain=Buffer.from(app.pixels);
    app.show({peekInfoGame:chosen});
    let changed=false;
    for(let y=0;y<240;y++)for(let x=0;x<320;x++){
      const p=(y*320+x)*3;
      if(!plain.subarray(p,p+3).equals(app.pixels.subarray(p,p+3))){
        changed=true;
        assert.ok(side==='left'?x<20:x>=300,'cat must not cover guide text/cards');
        assert.ok(y>=33&&y<64,'cat escaped its reserved vertical slot');
      }
    }
    if(changed)changedGuides++;
    if(modeSelection===chosen)shots.push(Buffer.from(app.pixels));
    for(const [x,y,w,h]of app.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,'clipped cat overflow');
  }
  assert.equal(changedGuides,1,'cat must appear in exactly one game guide per boot');
}
// At the two edges the same crop must face inward by exact horizontal mirroring.
for(let y=33;y<64;y++)for(let x=0;x<20;x++){
  const a=(y*320+x)*3,b=(y*320+319-x)*3;
  assert.ok(shots[0].subarray(a,a+3).equals(shots[1].subarray(b,b+3)),'peek must mirror from the right wall');
}
const contact=Buffer.alloc(640*240*3);
shots.forEach((shot,i)=>{for(let y=0;y<240;y++)shot.copy(contact,(y*640+i*320)*3,y*960,(y+1)*960);});
fs.writeFileSync('previews/remora-cat-peek.png',png(640,240,contact));
console.log('Cat: one random guide per boot, inward mirror, no text overlap, native pixel bounds OK');
