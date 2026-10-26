const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const{launch,png}=require('./pixel-harness.cjs');
// Real game-over hook: two results never prompt, the third meaningful result waits 2.8s.
const app=launch();app.boot();const shots=[];
function shot(){app.show({});for(const[x,y,w,h]of app.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,`${app.state().view}: ${x},${y},${w},${h}`);shots.push(Buffer.from(app.pixels));}
for(let i=0;i<3;i++){app.test.arcade.start('classic');app.test.state.score=700;app.test.state.clears=2;app.test.arcade.fail('TEST');app.advance(2799);assert.equal(app.state().view,'gameover');app.advance(1);assert.equal(app.state().view,i===2?'ratingInvite':'gameover');}
shot();app.press(6);assert.equal(app.state().view,'ratingStars');app.press(3);app.press(6);app.press(3);assert.equal(app.state().view,'ratingThanks');app.press(6);assert.equal(app.state().view,'gameover');
// Global setting is visible only in XDAXA and survives a reload / profile switch.
app.show({view:'profiles',profileSelection:5});app.press(6);app.press(3);app.press(3);app.press(3);app.show({view:'settings',selection:10});app.press(6);assert.equal(app.state().view,'ratingPromptSettings');shot();app.press(1);assert.equal(app.state().ratePromptEnabled,false);app.press(4);assert.equal(app.state().view,'settings');
const reload=launch(app.store);reload.boot();assert.equal(reload.state().ratePromptEnabled,false);assert.notEqual(reload.state().activeProfile,5);
// The independent scheduler tests ten-minute cooldown without running thousands of UI frames.
const sandbox={window:{RemoraArcade:{catalog:[{mode:'classic'},{mode:'reverse'},{mode:'snake'}]}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('assets/remora-ratings.js','utf8'),sandbox);
const data={},storage={getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},s={playerId:'A',playerName:'PLAYER',activeProfile:0,mode:'classic',view:'gameover'},queue=[],cues=[];let now=0;
const rating=sandbox.window.RemoraRatings.create({state:s,storage,profiles:{},render(){},save(){},home(){s.view='home';},now:()=>now,later:fn=>queue.push(fn),sfx:n=>cues.push(n)});
const finish=(mode='classic',score=700,clears=2)=>{s.mode=mode;s.view='gameover';rating.gameOver({mode,score,clears,newRecord:false});};
finish();finish();assert.equal(queue.length,0);finish();assert.equal(queue.length,1);queue.shift()();assert.equal(s.view,'ratingInvite');assert.ok(cues.includes('invite'));rating.press(4);
now=700000;for(let i=0;i<5;i++)finish('reverse');assert.equal(queue.length,0);finish('reverse');assert.equal(queue.length,1);queue.shift()();rating.press(4);
for(let i=0;i<9;i++)finish('snake');assert.equal(queue.length,0,'cooldown ignored');now+=600001;finish('snake');assert.equal(queue.length,1);
s.activeProfile=5;s.developerUnlocked=true;rating.openPromptSettings();rating.press(1);s.activeProfile=0;s.view='gameover';queue.shift()();assert.equal(s.view,'gameover','disabled pending invite still appeared');finish('classic');assert.equal(queue.length,0);
s.activeProfile=5;s.developerUnlocked=true;rating.openPromptSettings();rating.press(3);s.activeProfile=0;finish('classic');assert.equal(queue.length,0,'same player/game was prompted twice');
// Already-rated games and developer gameplay never prompt.
const rated={...s,playerId:'RATED',view:'gameover',mode:'classic',activeProfile:0},ratedQueue=[];
data['remora-ratings']=JSON.stringify([{id:1,profileId:'RATED',profileName:'R',game:0,stars:[5],suggestions:0}]);
const r2=sandbox.window.RemoraRatings.create({state:rated,storage,render(){},save(){},profiles:{},home(){},now:()=>now,later:f=>ratedQueue.push(f)});for(let i=0;i<10;i++)r2.gameOver({mode:'classic',score:900,clears:4});assert.equal(ratedQueue.length,0);
rated.activeProfile=5;rated.developerUnlocked=true;rated.playerId='XDAXA';for(let i=0;i<10;i++)r2.gameOver({mode:'reverse',score:900,clears:4});assert.equal(ratedQueue.length,0);
// MONO persists, keeps useful color cues, and pregame header contains only battery UI.
app.show({view:'profiles',profileSelection:0});app.press(6);app.press(6);app.show({view:'theme',theme:'OCEAN'});app.press(3);assert.equal(app.state().theme,'MONO');app.press(4);
app.show({view:'pregame',modeSelection:4,theme:'MONO',display:100});shot();for(let y=6;y<22;y++)for(let x=10;x<210;x++){const p=(y*320+x)*3;assert.deepEqual([...app.pixels.subarray(p,p+3)],[16,16,16]);}
app.show({view:'stats',games:12345678,best:99999999,theme:'MONO'});shot();
app.show({view:'profiles',profileSelection:5,theme:'MONO'});shot();
const mono=launch(app.store);mono.boot();assert.equal(mono.state().theme,'MONO');
const dataPng=Buffer.alloc(960*480*3);shots.forEach((frame,i)=>{for(let y=0;y<240;y++)frame.copy(dataPng,((Math.floor(i/3)*240+y)*960+i%3*320)*3,y*960,(y+1)*960);});fs.mkdirSync('previews',{recursive:true});fs.writeFileSync('previews/remora-polish-030.png',png(960,480,dataPng));
console.log('Polish: rare optional rating invite, cooldown, global XDAXA toggle, return flow, MONO persistence, clean header and large stats OK');
