const assert=require('node:assert/strict');
const fs=require('node:fs');
const {launch}=require('./pixel-harness.cjs');
const fresh=()=>{const app=launch();app.boot();return app;};
const menu=fresh();
assert.equal(menu.state().view,'home');
for(let i=0;i<12;i++){assert.equal(menu.state().modeSelection,i);menu.press(3);}
assert.equal(menu.state().modeSelection,0);
menu.press(1);assert.equal(menu.state().modeSelection,11);
menu.press(6);assert.equal(menu.state().view,'settings');
menu.press(4);assert.equal(menu.state().view,'home');assert.equal(menu.state().modeSelection,11);
menu.press(3);assert.equal(menu.state().modeSelection,0);
for(let index=0;index<11;index++){
  const app=fresh();for(let i=0;i<index;i++)app.press(3);
  app.press(2);assert.equal(app.state().view,'gameInfo');
  app.press(4);assert.equal(app.state().view,'home');
  app.press(6);assert.equal(app.state().view,'pregame');
  for(let i=0;i<8;i++)app.press(1);assert.equal(app.state().difficulty,0);
  for(let i=0;i<8;i++)app.press(3);assert.equal(app.state().difficulty,4);
  app.press(6);assert.equal(app.state().view,['ready','ready','reactionWait','mazePreview','whackInput','potatoInput','directionPreview','missingWatch','decoderWatch','snakeInput','pongInput'][index]);
  app.power();app.advance(6000);assert.equal(app.state().power,'off');
}
// Exercise actual timers and button input for a completed Classic round.
const classic=fresh();classic.press(6);classic.press(6);classic.advance(2400);
assert.equal(classic.state().view,'input');
classic.press(classic.state().sequence[0]);assert.equal(classic.state().view,'clear');
classic.advance(4300);assert.equal(classic.state().view,'input');
classic.press(classic.state().sequence[0]%6+1);classic.advance(1100);
assert.equal(classic.state().view,'gameover');assert.equal(classic.state().records['classic:1'],120);
classic.press(6);assert.equal(classic.state().view,'ready');
const reload=launch(classic.store);reload.boot();assert.equal(reload.state().records['classic:1'],120);
reload.press(6);reload.press(3);assert.equal(reload.state().records['classic:2'],undefined);
// Reaction records are minimum times, stored separately from point scores.
const reaction=fresh();reaction.press(3);reaction.press(3);reaction.press(6);reaction.press(6);
while(reaction.state().view==='reactionWait')reaction.advance(10);
reaction.advance(180);reaction.press(reaction.state().target);
assert.equal(reaction.state().result,'GREAT!');const best=reaction.state().records['reaction:1'];
assert.ok(best>=180&&best<200);reaction.press(6);
while(reaction.state().view==='reactionWait')reaction.advance(10);
reaction.advance(300);reaction.press(reaction.state().target);assert.equal(reaction.state().records['reaction:1'],best);
// Speed is enabled only in Classic at Hard and above; Reverse keeps its logic.
const speed=fresh();speed.press(6);speed.press(3);speed.press(6);speed.advance(5000);assert.equal(speed.state().mode,'classic');assert.equal(speed.state().view,'gameover');
const untimed=fresh();untimed.press(6);untimed.press(6);untimed.advance(7000);assert.equal(untimed.state().view,'input');assert.equal(untimed.state().speedDeadline,0);
const reverse=fresh();reverse.press(3);reverse.press(6);reverse.press(6);reverse.advance(2400);
reverse.press(reverse.state().sequence[0]);reverse.advance(4300);for(const n of reverse.state().sequence.slice().reverse())reverse.press(n);assert.equal(reverse.state().view,'clear');
// Every settings entry opens and returns, including physical-key list navigation.
const settings=fresh();settings.press(1);settings.press(6);
for(const expected of ['sound','display','theme','leds','battery','profiles','network','system','stats','firstLoginConfirm']){
  settings.press(6);assert.equal(settings.state().view,expected);settings.press(4);assert.equal(settings.state().view,'settings');settings.press(5);
}
assert.equal(settings.state().selection,0);
settings.press(6);const sound=settings.state().masterVolume;settings.press(3);assert.equal(settings.state().masterVolume,sound+10);settings.press(5);settings.press(1);assert.equal(settings.state().bgmVolume,25);settings.press(5);settings.press(3);assert.equal(settings.state().sfxVolume,85);settings.press(4);
settings.press(5);settings.press(6);settings.press(3);assert.equal(settings.state().display,100);
// Rev K2 locks, standby charging peek, and exact two-button resume.
const low=fresh();low.press(6);low.press(6);low.advance(2400);low.setBattery(5);assert.equal(low.state().view,'powerNotice');
const games=low.state().games;for(let i=1;i<=6;i++)low.press(i);assert.equal(low.state().games,games);
low.advance(2020);assert.equal(low.state().power,'standby');assert.ok(low.pixels.every(v=>v===0));
low.setCharging(true);assert.equal(low.state().view,'powerNotice');low.advance(2020);
low.down(1);low.advance(2020);assert.equal(low.state().noticeKind,'batteryPeek');low.up(1);low.advance(5020);assert.equal(low.state().power,'standby');
low.setBattery(10);low.setCharging(false);low.down(1);low.down(3);low.advance(2020);low.up(1);low.up(3);assert.equal(low.state().view,'input');
const first=launch({value:null});first.boot();assert.equal(first.state().view,'nameEditor');first.press(5);first.press(6);assert.equal(first.state().playerName,'A');assert.equal(first.state().tutorialStep,0);
first.down(4);first.down(6);first.advance(3020);first.up(4);first.up(6);assert.equal(first.state().tutorialStep,-1);
// Physical mouse/keyboard input drives the same hold mechanism as the engine.
const holds=fresh();holds.show({mode:'whack',view:'whackInput',game:{wave:1,total:1,purpleDir:1,cues:[{key:2,target:2,type:'hold',done:false,holding:false}]}});
holds.keys[1].listeners.pointerdown[0]({pointerId:1});holds.advance(700);holds.keys[1].listeners.pointerup[0]();holds.keys[1].listeners.click[0]();assert.equal(holds.state().view,'clear');
const earlyHold=fresh();earlyHold.show({mode:'whack',view:'whackInput',game:{wave:1,total:1,cues:[{key:2,target:2,type:'hold',done:false,holding:false}]}});
earlyHold.document.listeners.keydown[0]({key:'w',preventDefault(){}});earlyHold.advance(50);earlyHold.document.listeners.keyup[0]({key:'w'});assert.equal(earlyHold.state().view,'gameover');
// Menu cow pixels change across a blink; battery X changes only when charging.
const animated=fresh();const region=()=>{const out=[];for(let y=130;y<150;y++)for(let x=240;x<285;x++)out.push(...animated.pixels.subarray((y*320+x)*3,(y*320+x)*3+3));return out;};
const before=region();animated.advance(4000-animated.state().animationTime%4200);assert.notDeepEqual(region(),before);
animated.setBattery(4);const cross=Buffer.from(animated.pixels);animated.setCharging(true);assert.notDeepEqual(animated.pixels,cross);
// Every new screen draws inside the native 320x240 bounds, using integer pixels.
const render=fresh();
const pages=[...Array.from({length:12},(_,modeSelection)=>({view:'home',modeSelection})),
  ...Array.from({length:5},(_,difficulty)=>({view:'pregame',modeSelection:0,difficulty})),
  ...Array.from({length:9},(_,selection)=>({view:'settings',selection})),
  ...['chargeRequired','gameInfo','battery','stats','profile','nameEditor','wifiMethod','network','system','diagnostics','displayTest','buttonTest','speakerTest','ledTest','sound','display','leds','theme','phoneSetup','textEntry','wifiNotSet','wifiConfirm','wifiConnecting','wifiResult','wifiStatus','forgetWifi','networkDemo'].map(view=>({view,modeSelection:0}))];
for(const values of pages){render.show(values);for(const [x,y,w,h]of render.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,`${values.view}: overflow ${x},${y},${w},${h}`);}
for(const mode of ['classic','reverse','reaction','maze','whack','potato','direction','missing','decoder','snake','pong']){
  render.show({power:'on',difficulty:4});render.drawCalls.length=0;render.test.arcade.start(mode);render.advance(400);
  for(const [x,y,w,h]of render.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,`${mode}: overflow ${x},${y},${w},${h}`);
}
assert.equal(render.ctx.imageSmoothingEnabled,false);
// Expanded maps, fog and decimal answer controls fit at the maximum native sizes.
for(const mode of ['maze','decoder']){
  render.show({power:'on',difficulty:4});render.test.arcade.start(mode);
  if(mode==='maze'){render.test.state.level=100;render.test.arcade.nextLevel();render.advance(4000);}
  else render.advance(5820);
  assert.equal(render.state().view,mode==='maze'?'mazeInput':'decoderInput');
  render.show({});
  for(const [x,y,w,h]of render.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,`${mode} input: overflow ${x},${y},${w},${h}`);
}
render.show({view:'gameInfo',modeSelection:8});
for(const [x,y,w,h]of render.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,'decoder guide overflow');
render.show({power:'on',difficulty:0});render.test.arcade.start('maze');render.advance(3500);
const g=render.test.state.game,next=g.links[g.current][0],delta=next-g.current;
const arrow=delta===-g.cols?'ArrowUp':delta===g.cols?'ArrowDown':delta===1?'ArrowRight':'ArrowLeft';
render.document.listeners.keydown[0]({key:arrow,preventDefault(){}});assert.equal(render.state().game.current,next);
render.test.arcade.start('decoder');render.advance(4300);
render.document.listeners.keydown[0]({key:'ArrowUp',preventDefault(){}});assert.equal(render.state().game.digits[2],1);
render.document.listeners.keydown[0]({key:'Backspace',preventDefault(){}});assert.equal(render.state().game.digits[2],0);
assert.equal(render.keys[4].attrs['data-action'],'OK');assert.match(render.keys[4].attrs['aria-label'],/OK/);
assert.match(render.el('simulator-hint').textContent,/tengah bawah: OK/);
render.show({view:'pregame',modeSelection:8,difficulty:4});assert.equal(render.keys[2].attrs['data-action'],'');
render.show({view:'pregame',modeSelection:8,difficulty:0});assert.equal(render.keys[0].attrs['data-action'],'');
const colourKeys=['#c49bef','#75d9e8','#ffd76b','#ff797d','#79acfa','#8bdcad'];
const pregameLights=['#8d8876','#8d8876',colourKeys[2],colourKeys[3],'#8d8876',colourKeys[5]];
for(let i=0;i<6;i++){assert.equal(render.keys[i].style.values['--key-color'],pregameLights[i]);assert.doesNotMatch(render.keys[i].attrs['aria-label'],/Tombol \d/);}
render.show({view:'whackInput',mode:'whack',game:{wave:1,total:1,purpleDir:1,cues:[{key:1,target:1,type:'tap',done:false}]}});
assert.equal(render.keys[0].style.values['--key-color'],colourKeys[5]);
assert.ok(!render.drawCalls.some(([x,y,w,h])=>x===58&&y===82&&w===15&&h===21),'redundant block inside a full coloured pad must be absent');
for(const [mode,view]of [['classic','input'],['reverse','input'],['missing','missingInput'],['whack','whackInput'],['potato','potatoInput']]){
  render.show({mode,view,game:{target:1,signal:1,green:true,cues:[],answers:[1]},sequence:[1],gameLEDs:colourKeys});
  for(let i=0;i<6;i++){
    const x=22+i%3*94,y=76+Math.floor(i/3)*48;
    assert.ok(render.drawCalls.some(([xx,yy,w,h])=>xx===x+4&&yy===y+4&&w===80&&h===32),mode+' full pad colour');
    assert.ok(!render.drawCalls.some(([xx,yy,w,h])=>xx===x+36&&yy===y+6&&w===15&&h===21),mode+' redundant swatch');
  }
}
render.show({mode:'whack',view:'whackInput'});
render.show({game:{wave:1,total:1,purpleDir:1,cues:[{key:1,target:1,type:'avoid',done:false}]}});assert.equal(render.keys[0].style.values['--key-color'],colourKeys[3]);
render.show({difficulty:1});render.test.arcade.start('direction');render.show({});
assert.ok(render.drawCalls.some(([x,y,w,h])=>x===207&&y===90&&w===10&&h===14),'old direction card digit position must contain a digit-size block');
const shuffled=fresh();shuffled.show({difficulty:2});shuffled.test.arcade.start('decoder');shuffled.advance(7000);
assert.equal(shuffled.state().view,'decoderInput');
const okKey=5,addKey=6;
assert.equal(shuffled.keys[okKey-1].attrs['data-action'],'OK');
shuffled.document.listeners.keydown[0]({key:'ArrowUp',preventDefault(){}});assert.equal(shuffled.state().game.digits[2],1);
shuffled.press(addKey);assert.equal(shuffled.state().game.digits[2],2);
assert.equal(shuffled.keys[addKey-1].style.values['--key-color'],shuffled.state().keyPalette[5]);
const numbered=fresh();numbered.document.listeners.keydown[0]({key:'3',preventDefault(){}});assert.equal(numbered.state().modeSelection,0);
numbered.document.listeners.keydown[0]({key:'e',preventDefault(){}});assert.equal(numbered.state().modeSelection,1);
assert.doesNotMatch(fs.readFileSync('index.html','utf8'),/content:\s*attr\(data-key\)/);
assert.doesNotMatch(fs.readFileSync('assets/remora-pixel-ui.js','utf8'),/text\(i\+1/);
// Red hold cancels every game timer; a short red hold remains an ordinary input.
for(const mode of ['classic','reverse','reaction','maze','whack','potato','direction','missing','decoder','snake','pong']){
  const exit=fresh();exit.test.arcade.start(mode);exit.down(4);exit.advance(1999);assert.notEqual(exit.state().view,'home',mode+' early exit');exit.advance(1);assert.equal(exit.state().view,'home',mode+' force exit');exit.advance(8000);assert.equal(exit.state().view,'home',mode+' stale timer');
}
const pointerExit=fresh();pointerExit.test.arcade.start('classic');pointerExit.keys[3].listeners.pointerdown[0]({pointerId:1});pointerExit.advance(2000);pointerExit.keys[3].listeners.pointerup[0]();pointerExit.keys[3].listeners.click[0]();assert.equal(pointerExit.state().view,'home');
const shortExit=fresh();shortExit.test.arcade.start('maze');shortExit.down(4);shortExit.advance(400);shortExit.up(4);shortExit.advance(1800);assert.equal(shortExit.state().view,'mazeInput');
const keyExit=fresh();keyExit.test.arcade.start('classic');keyExit.document.listeners.keydown[0]({key:'a',preventDefault(){}});keyExit.advance(2000);keyExit.document.listeners.keyup[0]({key:'a'});assert.equal(keyExit.state().view,'home');
const emergency=fresh();emergency.test.arcade.start('classic');emergency.down(4);emergency.setBattery(4);emergency.advance(1500);assert.equal(emergency.state().view,'powerNotice');
const interrupted=fresh();interrupted.test.arcade.start('classic');interrupted.document.listeners.keydown[0]({key:'a',preventDefault(){}});interrupted.document.listeners.keydown[0]({key:'Escape',preventDefault(){}});interrupted.press(6);interrupted.document.listeners.keyup[0]({key:'a'});assert.equal(interrupted.state().view,'pregame');
assert.doesNotMatch(fs.readFileSync('assets/remora-pixel-ui.js','utf8'),/drawImage\(|fillText\(|\.arc\(/);
// Visible maps start immediately; fog modes retain their actual memory phase.
for(const difficulty of [0,1,2,3,4]){const app=fresh();app.show({difficulty});app.test.arcade.start('maze');assert.equal(app.state().view,difficulty<2?'mazeInput':'mazePreview');assert.equal(app.state().game.mapVisible,true);}
const shutdown=fresh();shutdown.power();assert.equal(shutdown.state().power,'shutdown');shutdown.advance(1100);assert.equal(shutdown.state().power,'shutdown');assert.ok(shutdown.pixels.some(v=>v>0));shutdown.advance(1000);assert.equal(shutdown.state().power,'shutdown');shutdown.advance(500);assert.equal(shutdown.state().power,'off');assert.ok(shutdown.pixels.every(v=>v===0));
const mixer=fresh();mixer.press(1);mixer.press(6);mixer.press(6);for(let i=0;i<12;i++)mixer.press(1);assert.equal(mixer.state().masterVolume,0);for(let i=0;i<12;i++)mixer.press(3);assert.equal(mixer.state().masterVolume,100);const reloaded=launch(mixer.store);assert.equal(reloaded.state().masterVolume,100);
// Paddle movement stops on release.
for(const mode of ['pong']){
  const app=fresh();app.test.arcade.start(mode);const x=app.state().game.playerX;
  app.document.listeners.keydown[0]({key:'ArrowRight',preventDefault(){}});app.advance(240);assert.ok(app.state().game.playerX>x,mode+' held movement');
  app.document.listeners.keyup[0]({key:'ArrowRight'});const stopped=app.state().game.playerX;app.advance(160);assert.equal(app.state().game.playerX,stopped,mode+' movement release');
}
const cowSnake=fresh();cowSnake.test.arcade.start('snake');const tail=cowSnake.state().game.body[1],sx=30+tail%26*10,sy=42+Math.floor(tail/26)*10,tailColours=new Set();
for(let y=sy;y<sy+10;y++)for(let x=sx;x<sx+8;x++){const p=(y*320+x)*3;tailColours.add(cowSnake.pixels.subarray(p,p+3).toString('hex'));}
assert.deepEqual([...tailColours].sort(),['090b0d','f5f5f2'],'snake body must be black and white');
for(const modeSelection of [0,9,10]){render.show({power:'on',view:'home',mode:null,modeSelection,exitHolding:false});assert.ok(render.drawCalls.some(([x,y,w,h])=>x===16&&y===81&&w===164&&h===105),'menu illustration size must match Classic');}
console.log('REMORA: 11-game carousel, decoder controls, 2s force exit, shutdown, mixer and pixel bounds OK');
