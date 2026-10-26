const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const sandbox={window:{}};vm.createContext(sandbox);
for(const file of ['remora-feedback.js','remora-arcade.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),sandbox);
const {catalog,create}=sandbox.window.RemoraArcade;
function launch(mode,difficulty,seed=37,fixedRandom){
  let time=0,id=0,queue=new Map();const tones=[];
  const state={power:'on',difficulty,records:{},phraseCounters:{},best:0,bestReaction:null,games:0,totalCorrect:0};
  const engine=create({state,now:()=>time,random:()=>{if(fixedRandom!=null)return fixedRandom;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},
    later:(fn,ms)=>queue.set(++id,{fn,time:time+ms}),cancel:()=>queue.clear(),render(){},save(){},say(){},tone:n=>tones.push(n)});
  function advance(ms){const end=time+ms;let loops=0;for(;;){const entries=[...queue].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time);if(!entries.length)break;assert.ok(++loops<10000,'timer loop');const [key,t]=entries[0];queue.delete(key);time=t.time;t.fn();}time=end;}
  function until(condition,limit=30000){for(let n=0;n<limit/10;n++){if(condition())return;advance(10);}throw Error(mode+': stalled at '+state.view);}
  engine.start(mode);return {state,engine,advance,until,tones};
}
function solve(app){
  const {state:s,engine:e,advance,until}=app;
  for(let guard=0;guard<10000;guard++){
    if(s.view==='clear'||s.view==='reactionResult')return;
    assert.notEqual(s.view,'gameover',s.mode+': '+s.failureReason);
    if(s.view==='input'){
      let n=s.mode==='reverse'?s.sequence[s.sequence.length-1-s.inputIndex]:s.sequence[s.inputIndex];if(s.game.mirror)n=7-n;e.press(n);
    }else if(s.view==='mazeInput'){const next=s.game.path[s.game.path.indexOf(s.game.current)+1],offset=next-s.game.current;e.press(offset===-s.game.cols?2:offset===s.game.cols?5:offset===1?3:1);}
    else if(s.view==='whackInput'){
      const wave=s.game.wave,cues=s.game.cues;
      for(const c of cues)if(c.type==='hold')e.keyDown(c.target);
      for(const c of cues){if(['tap','neighbor'].includes(c.type))e.press(c.target);if(c.type==='double'){e.press(c.target);advance(20);e.press(c.target);}}
      until(()=>{for(const c of cues)if(c.done&&c.holding)e.keyUp(c.target);return s.view!=='whackInput'||s.game.wave!==wave;},5000);
    }else if(s.view==='potatoInput'){until(()=>s.game.green||s.view==='gameover');e.press(s.game.target);}
    else if(s.view==='directionInput')e.press(s.game.mapping[s.game.chain[s.game.chainIndex]]);
    else if(s.view==='missingInput')e.press(s.game.answers[s.game.index]);
    else if(s.view==='decoderInput')enterDecimal(app,s.game.answers[s.game.index]);
    else if(s.view==='snakeInput'){
      const g=s.game,queue=[[g.body[0],[]]],seen=new Set(g.body.slice(0,-1).concat(g.rocks));seen.delete(g.body[0]);let route;
      for(let i=0;i<queue.length;i++){const [cell,path]=queue[i];if(cell===g.food){route=path;break;}for(const [n,delta]of [[1,-1],[2,-g.cols],[3,1],[5,g.cols]]){const next=cell+delta;if(next<0||next>=g.cols*g.rows||Math.abs(delta)===1&&Math.floor(next/g.cols)!==Math.floor(cell/g.cols)||seen.has(next))continue;seen.add(next);queue.push([next,path.concat(n)]);}}
      assert.ok(route?.length,'snake has a route to grass');e.press(({1:4,2:2,3:6,5:5})[route[0]]);advance(g.tickMs);
    }
    else if(s.view==='pongInput'){const g=s.game;g.ball={x:24,y:34,vx:0,vy:-3};advance(40);}
    else if(s.view==='reactionGo'){
      advance(150);const d=s.effectiveDifficulty??s.difficulty,t=s.target,n=d===4?(t-1)%3===2?t-1:t+1:d===3?7-t:t;e.press(n);
      if(s.view==='clear'&&s.game.hits<s.game.required)advance(950);
    }else advance(10);
  }
  throw Error(s.mode+': did not complete level');
}
function enterDecimal(app,value){
  const {state:s,engine:e}=app,digits=String(value).padStart(3,'0').split('').map(Number);
  for(let i=2;i>=0;i--){const amount=(digits[i]-s.game.digits[i]+10)%10;for(let j=0;j<(amount<=5?amount:10-amount);j++)e.press(amount<=5?2:5);if(i>0)e.press(1);}
  e.press(6);
}
for(const entry of catalog)for(let difficulty=0;difficulty<5;difficulty++){
  const app=launch(entry.mode,difficulty);solve(app);
  assert.ok(app.state.score>0);assert.ok(app.state.message);
  assert.ok(app.state.records[entry.mode+':'+difficulty]!=null,entry.mode+': record absent');
  if(entry.mode==='decoder'){assert.ok(app.tones.includes(1)||app.tones.includes(6));if(difficulty>=2)assert.ok(app.state.game.answers.length>=2);}
}
// New Hard patterns must not grow the previous sequence; Easy/Normal still do.
for(const difficulty of [0,1,2,3,4]){
  const app=launch('classic',difficulty),old=app.state.sequence.slice(),oldColours=old.map(n=>app.state.keyPalette[n-1]);solve(app);app.advance(1450);
  assert.equal(app.state.sequence.length,old.length+(difficulty<2?1:0));
  if(difficulty<2)assert.deepEqual(Array.from(app.state.sequence.slice(0,-1)),Array.from(old));
  else assert.notEqual(app.state.keyPalette[app.state.sequence[0]-1],oldColours[0]);
}
// Wrong inputs, early release and missed deadlines must actually end the round.
for(const mode of ['classic','reverse','maze','direction','missing','decoder']){
  const app=launch(mode,2);app.until(()=>['input','mazeInput','directionInput','missingInput','decoderInput'].includes(app.state.view));
  if(mode==='maze'){
    const g=app.state.game;const invalid=[1,2,3,5].find(n=>{const target=g.current+({1:-1,2:-g.cols,3:1,5:g.cols}[n]);return !g.links[g.current].includes(target);});app.engine.press(invalid);
  }else if(mode==='direction')app.engine.press(4);
  else if(mode==='decoder')enterDecimal(app,(app.state.game.answers[0]+1)%32);
  else {let expected=mode==='missing'?app.state.game.answers[0]:mode==='reverse'?app.state.sequence.at(-1):app.state.sequence[0];app.engine.press(expected%6+1);}
  assert.equal(app.state.view,'gameover',mode);
}
for(const type of ['avoid','double','hold','neighbor']){
  let app,cue;for(let seed=1;seed<=100;seed++){app=launch('whack',1,seed*9876541);cue=app.state.game.cues.find(c=>c.type===type);if(cue)break;}
  assert.ok(cue,type+' not generated');
  if(type==='hold'){app.engine.keyDown(cue.target);app.advance(100);app.engine.keyUp(cue.target);}
  else if(type==='double'){app.engine.press(cue.target);app.advance(560);}
  else app.engine.press(cue.key);
  assert.equal(app.state.view,'gameover',type+' failure not enforced');
}
const timed=launch('classic',4);timed.until(()=>timed.state.view==='input');timed.advance(600);assert.equal(timed.state.view,'gameover');
const premature=launch('reaction',2);premature.engine.press(1);assert.equal(premature.state.view,'gameover');
const burnt=launch('potato',3);burnt.until(()=>!burnt.state.game.green);burnt.engine.press(burnt.state.game.target);assert.equal(burnt.state.view,'gameover');
// Larger mazes stay connected, have real walls and a solvable route through the bonus.
for(let difficulty=0;difficulty<5;difficulty++)for(let seed=1;seed<=12;seed++){
  const app=launch('maze',difficulty,seed*771),g=app.state.game;
  assert.ok(g.cols>=6&&g.rows>=4);assert.equal(g.links.reduce((sum,links)=>sum+links.length,0),2*(g.cols*g.rows-1));
  for(let cell=0;cell<g.links.length;cell++)for(const n of g.links[cell]){
    assert.ok(g.links[n].includes(cell));assert.ok(Math.abs(n-cell)===g.cols||Math.abs(n-cell)===1&&Math.floor(n/g.cols)===Math.floor(cell/g.cols));
  }
  assert.ok(g.path.includes(g.bonus));solve(app);assert.ok(app.state.game.bonusTaken);
}
const growing=launch('maze',4);const width=growing.state.game.cols;growing.state.level=5;growing.engine.nextLevel();assert.equal(growing.state.game.cols,width+1);assert.equal(growing.state.game.rows,9);solve(growing);
growing.state.level=100;growing.engine.nextLevel();assert.equal(growing.state.game.cols,18);assert.equal(growing.state.game.rows,12);solve(growing);assert.equal(growing.state.game.collectedBonuses.length,4);
// Each difficulty sends all 4-7 bits, covers its full range and accepts decimal input.
for(let difficulty=0;difficulty<5;difficulty++){
  const seen=new Set(),bits=[4,4,5,6,7][difficulty];
  for(let seed=1;seed<=30;seed++){
    const app=launch('decoder',difficulty,seed*9876541);assert.equal(app.state.game.bitCount,bits);
    for(const value of app.state.game.answers){assert.ok(value>=0&&value<2**bits);seen.add(value);}
    app.until(()=>app.state.view==='decoderInput');assert.equal(app.tones.length,app.state.game.answers.length*bits);
    for(let i=0;i<app.state.game.answers.length;i++){
      let received=app.tones.slice(i*bits,(i+1)*bits).map(n=>n===6?1:0);if(difficulty>=3)received=received.map(n=>1-n);if(difficulty===4)received.reverse();
      assert.equal(parseInt(received.join(''),2),app.state.game.answers[i],'transmitted code differs from decimal answer');
    }
    solve(app);
  }
  assert.ok([...seen].some(n=>n>6),'codes must exceed old six-key range');
  const app=launch('decoder',difficulty),old=Array.from(app.state.game.answers);solve(app);app.advance(1450);
  assert.ok(app.state.game.answers.every(n=>!old.includes(n)),'recent codes repeated');
  for(const random of [0,1-Number.EPSILON]){
    const edge=launch('decoder',difficulty,37,random);assert.equal(edge.state.game.answers[0],random===0?0:2**bits-1);solve(edge);
  }
}
const edit=launch('decoder',0);edit.until(()=>edit.state.view==='decoderInput');edit.engine.press(5);assert.equal(edit.state.game.digits[2],9);edit.engine.press(4);assert.equal(edit.state.game.digits[2],0);edit.engine.press(3);assert.equal(edit.state.game.digitIndex,0);edit.engine.press(1);assert.equal(edit.state.game.digitIndex,2);
// Variety and score-sensitive responses, including record-breaking runs.
for(const entry of catalog){const feedback=sandbox.window.RemoraFeedback;assert.equal(new Set(feedback.success[entry.mode]).size,15);assert.equal(feedback.loss(entry.mode,0,0,false).tier,0);assert.equal(feedback.loss(entry.mode,1800,9,false).tier,3);assert.equal(feedback.loss(entry.mode,200,1,true).tier,4);}
// Completing actual rounds reaches level 6/11 without changing the selected difficulty.
for(const entry of catalog){
  const app=launch(entry.mode,0);let previous;
  for(let level=1;level<=11;level++){
    assert.equal(app.state.level,level);assert.equal(app.state.difficulty,0);
    assert.equal(app.state.effectiveDifficulty,0);
    assert.equal(app.state.challengeStage,Math.floor((level-1)/5));
    solve(app);
    if(level===5)previous=app.state.score;
    if(level===6)assert.ok(app.state.score>previous);
    if(level<11)app.advance(1450);
  }
  const master=launch(entry.mode,4);master.state.level=5;master.engine.nextLevel();solve(master);
  assert.equal(master.state.challengeStage,1);assert.equal(master.state.effectiveDifficulty,4);
}
const normalMemory=launch('classic',1);normalMemory.state.level=5;normalMemory.engine.nextLevel();assert.equal(normalMemory.state.effectiveDifficulty,1);assert.equal(normalMemory.state.game.mirror,false);
const directionBoost=launch('direction',4);const firstChain=directionBoost.state.game.chain.length;directionBoost.state.level=5;directionBoost.engine.nextLevel();assert.equal(directionBoost.state.game.chain.length,firstChain);directionBoost.state.level=15;directionBoost.engine.nextLevel();assert.equal(directionBoost.state.game.chain.length,firstChain+1);
// Every game changes its key palette at higher difficulty, without changing mid-level.
const canonical=Array.from(sandbox.window.RemoraArcade.keyColors);
for(const entry of catalog){
  const app=launch(entry.mode,2),first=Array.from(app.state.keyPalette);
  assert.equal(new Set(first).size,6);assert.ok(first.every((c,i)=>c!==canonical[i]));
  solve(app);assert.deepEqual(Array.from(app.state.keyPalette),first);
  app.advance(1450);assert.ok(app.state.keyPalette.every((c,i)=>c!==first[i]));
  const gentle=launch(entry.mode,1);const original=Array.from(gentle.state.keyPalette);gentle.state.level=5;gentle.engine.nextLevel();assert.ok(gentle.state.keyPalette.every((c,i)=>c!==original[i]));
}
// Level 6 keeps selected rules and makes timers only 6% tighter; map grows one axis.
for(const mode of ['classic','reaction','maze','whack','potato','direction','missing','decoder']){
  const app=launch(mode,2);app.state.level=4;app.engine.nextLevel();
  app.until(()=>['input','reactionGo','mazeInput','whackInput','potatoInput','directionInput','missingInput','decoderInput'].includes(app.state.view));
  const oldWindow=app.state.speedWindow,oldPalette=Array.from(app.state.keyPalette);app.state.level=5;app.engine.nextLevel();
  app.until(()=>['input','reactionGo','mazeInput','whackInput','potatoInput','directionInput','missingInput','decoderInput'].includes(app.state.view));
  assert.equal(app.state.effectiveDifficulty,2);assert.ok(app.state.speedWindow>=oldWindow*.9,mode+' timer jump');
  assert.ok(app.state.keyPalette.every((c,i)=>c!==oldPalette[i]));
}
const feedback=sandbox.window.RemoraFeedback;assert.equal(feedback.extraEndings.length,20);assert.equal(new Set(feedback.extraEndings.map(v=>v.text)).size,20);assert.equal(new Set(feedback.extraEndings.map(v=>v.tone)).size,4);
const randomReply=launch('classic',0);let lastLine;for(let i=0;i<35;i++){randomReply.engine.start('classic');randomReply.engine.fail('TEST');assert.notEqual(randomReply.state.endMessage,lastLine);lastLine=randomReply.state.endMessage;}
const deadSnake=launch('snake',3);deadSnake.state.game.body=[0,1,2];deadSnake.state.game.dir=1;deadSnake.state.game.nextDir=1;deadSnake.advance(deadSnake.state.game.tickMs);assert.equal(deadSnake.state.view,'gameover');
const lostPong=launch('pong',4);lostPong.state.game.lives=1;lostPong.state.game.ball={x:24,y:167,vx:0,vy:4};lostPong.advance(40);assert.equal(lostPong.state.view,'gameover');
// Stronger Pong applies to every preset, without a large jump at level six.
for(let d=0;d<5;d++){
  const app=launch('pong',d),g=app.state.game;
  assert.ok(g.width<[64,58,52,46,40][d]);assert.ok(Math.hypot(g.ball.vx,g.ball.vy)>Math.hypot(1.4+d*.2,2.5+d*.4));
  assert.ok(g.aiSpeed>[1.8,2.1,2.4,2.7,3][d]);assert.ok(g.aiErrorRange<[170,140,100,64,40][d]);
  const original=g.baseSpeed;app.state.level=5;app.engine.nextLevel();assert.ok(app.state.game.baseSpeed/original<1.07);
}
const fastPong=launch('pong',4);fastPong.state.game.ball={x:160,y:142,vx:0,vy:20};fastPong.advance(40);assert.ok(fastPong.state.game.ball.vy<0,'fast ball tunneled through paddle');assert.equal(fastPong.state.game.rally,1);assert.ok(Math.hypot(fastPong.state.game.ball.vx,fastPong.state.game.ball.vy)<=fastPong.state.game.maxSpeed+.001);
const predictive=launch('pong',3);predictive.state.game.ball={x:290,y:125,vx:5,vy:-6};predictive.state.game.aiError=0;predictive.advance(40);assert.ok(predictive.state.game.aiTarget>240&&predictive.state.game.aiTarget<250,'AI must predict the wall reflection');assert.ok(predictive.state.game.aiX>160);
const rally=launch('pong',1),initialSpeed=rally.state.game.baseSpeed;rally.state.game.ball={x:160,y:147,vx:0,vy:initialSpeed};rally.advance(40);assert.ok(Math.hypot(rally.state.game.ball.vx,rally.state.game.ball.vy)>initialSpeed,'rally speed must grow');
console.log('Arcade: all 11 games x 5 difficulties complete; controls, collisions, progression, records and feedback OK');

for(let d=0;d<5;d++)for(const dir of [1,2,3,5]){
 const a=launch('snake',d),g=a.state.game;
 const head=dir===1?6*g.cols:dir===3?7*g.cols-1:dir===2?5:(g.rows-1)*g.cols+5;
 const expected=dir===1?7*g.cols-1:dir===3?6*g.cols:dir===2?(g.rows-1)*g.cols+5:5;
 g.body=[head];g.rocks=[];g.food=3*g.cols+10;g.dir=g.nextDir=dir;a.advance(g.tickMs);
 if(d<3){assert.equal(a.state.view,'snakeInput');assert.equal(g.body[0],expected);}else assert.equal(a.state.view,'gameover');
}
console.log('Snake: four-edge wrapping on Easy/Normal/Hard; fatal walls on Expert/Master OK');
