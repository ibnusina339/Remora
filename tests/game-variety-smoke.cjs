const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={window:{}};vm.createContext(sandbox);
for(const file of ['remora-feedback.js','remora-arcade.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),sandbox);
function launch(mode,difficulty,seed=37,level=1){
 let time=0,id=0;const queue=new Map(),tones=[],state={power:'on',difficulty,records:{},phraseCounters:{},best:0,bestReaction:null,games:0,totalCorrect:0};
 const engine=sandbox.window.RemoraArcade.create({state,now:()=>time,random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},later:(fn,ms)=>queue.set(++id,{fn,time:time+ms}),cancel:()=>queue.clear(),render(){},save(){},say(){},tone:n=>tones.push(n)});
 function advance(ms){const end=time+ms;for(let loops=0;;loops++){const next=[...queue].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];if(!next)break;assert.ok(loops<10000);queue.delete(next[0]);time=next[1].time;next[1].fn();}time=end;}
 engine.start(mode);if(level!==1){state.level=level-1;engine.nextLevel();}
 if(state.view==='mazePreview')advance([0,0,8000,6500,4000][difficulty]);
 return {s:state,e:engine,advance,tones};
}
const solve=require('./maze-solver.cjs');let maps=0,branchKeys=0;
for(let d=0;d<5;d++)for(let seed=1;seed<=40;seed++)for(const level of [1,2,3,16,17,18]){
 const {s,e}=launch('maze',d,seed*733,level),g=s.game;maps++;
 assert.equal(g.mission,level%3);assert.equal(s.view,'mazeInput');
 if(g.key>=0&&!g.path.includes(g.key))branchKeys++;
 if(g.mission===2)assert.ok(g.bonuses.length>=3);
 for(let moves=0;s.view==='mazeInput'&&moves<1000;moves++)e.press(solve(g,d>=2));
 assert.equal(s.view,'clear',JSON.stringify({d,seed,level,reason:s.failureReason}));
 if(g.mission===1)assert.ok(g.keyTaken);
 if(d>=2||g.mission===2)assert.equal(g.collectedBonuses.length,g.bonuses.length);
 if(d>=2)assert.ok(g.moves<=g.moveLimit,'key detour must fit the move budget');
}
assert.ok(branchKeys>0,'key missions should include real branch exploration');
for(let d=0;d<5;d++){
 const {s,e,advance}=launch('maze',d),g=s.game;
 assert.equal(g.mapVisible,d<2);
 if(d<2){e.press(6);assert.equal(g.scanCharges,0);assert.ok(g.mapVisible);continue;}
 const charges=g.scanCharges;e.press(6);assert.equal(g.scanCharges,charges-1);assert.ok(g.mapVisible&&g.scanActive);assert.equal(e.leds()[5],'transparent');
 e.press(6);assert.equal(g.scanCharges,charges-1,'holding/repeating scan cannot consume extra charges');
 advance(1399);assert.ok(g.mapVisible);advance(1);assert.ok(!g.mapVisible&&!g.scanActive);assert.equal(s.view,'mazeInput');
}
{
 const {s,e}=launch('maze',2),g=s.game,adjacent=g.links[g.gate][0],delta=g.gate-adjacent,key=delta===-g.cols?2:delta===g.cols?5:delta===1?3:1;
 g.current=adjacent;const moves=g.moves,score=s.score;e.press(key);assert.equal(g.current,adjacent);assert.equal(g.moves,moves);assert.equal(s.score,score);assert.match(g.hint,/KUNCI/);assert.equal(s.view,'mazeInput');
 g.keyTaken=true;e.press(key);assert.equal(g.current,g.gate);
}
{
 const {s,e,advance}=launch('snake',0,37,3),g=s.game;assert.ok(g.goldenFood);g.body=[g.cols+4];g.rocks=[];g.dir=g.nextDir=3;g.food=g.body[0]+1;
 advance(g.tickMs);assert.equal(s.score,90);assert.equal(g.eaten,1);assert.equal(g.body.length,2);assert.equal(s.view,'snakeInput');
}
{
 const {s,advance}=launch('snake',0,37,3),g=s.game;g.body=[g.cols+4];g.rocks=[];g.dir=g.nextDir=3;g.food=g.cols*3+4;
 advance(6500+g.tickMs);assert.ok(!g.goldenFood);assert.equal(s.score,0);assert.equal(s.view,'snakeInput','expired gold reverts to grass without a penalty');
}
for(let d=0;d<5;d++){
 const {s,advance}=launch('pong',d),g=s.game,initial=g.milkTargetX,base=g.width,lives=g.lives,goal=g.goal;
 g.ball={x:initial,y:102,vx:0,vy:-4};advance(40);assert.equal(s.score,20);assert.notEqual(g.milkTargetX,initial);assert.equal(g.paddleBoostUntil,g.clock+5000);
 g.ball={x:g.milkTargetX,y:102,vx:0,vy:-4};advance(40);assert.equal(s.score,20,'target cooldown prevents repeated scoring');assert.equal(g.width,base+8);
 g.ball={x:160,y:100,vx:0,vy:0};advance(5040);assert.equal(g.width,base);assert.equal(g.lives,lives);assert.equal(g.goal,goal);assert.equal(g.hits,0);
 g.ball={x:g.milkTargetX,y:100,vx:0,vy:4};advance(40);assert.equal(s.score,20,'opponent returns cannot collect player bonuses');
}
console.log(`Game variety: ${maps} mazes solvable, key/gate/scan, gold expiry and Pong bonus/cooldown OK`);

// Render the new objectives at actual LCD resolution and keep all drawing on-screen.
const {launch:pixel}=require('./pixel-harness.cjs'),app=pixel();app.boot();
for(const [mode,difficulty,level]of [['maze',0,1],['maze',2,2],['maze',4,18],['snake',0,3],['pong',0,1]]){
 const {s}=launch(mode,difficulty,37,level);app.show({...s,batteryPercent:78,animationTime:0});
 for(const [x,y,w,h]of app.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,`${mode} draws outside LCD: ${[x,y,w,h]}`);
 app.capture(path.join(__dirname,`../previews/variety-${mode}-${difficulty}.png`));
}
console.log('Game variety: LCD-size render bounds and five preview captures OK');
