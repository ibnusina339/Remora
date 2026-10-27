const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const{launch,png}=require('./pixel-harness.cjs');
// Real game-over hook: two results never prompt, the third meaningful result waits 2.8s.
const app=launch();app.boot();const shots=[];
function shot(){app.show({});for(const[x,y,w,h]of app.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,`${app.state().view}: ${x},${y},${w},${h}`);shots.push(Buffer.from(app.pixels));}
for(let i=0;i<3;i++){app.test.arcade.start('classic');app.test.state.score=700;app.test.state.clears=2;app.test.arcade.fail('TEST');app.advance(2799);assert.equal(app.state().view,'gameover');app.advance(1);assert.equal(app.state().view,i===2?'ratingInvite':'gameover');}
shot();app.press(6);assert.equal(app.state().view,'ratingStars');app.press(3);app.press(6);app.press(3);assert.equal(app.state().view,'ratingThanks');app.press(6);assert.equal(app.state().view,'gameover');
// Global setting is visible only in XDAXA and survives a reload / profile switch.
app.show({view:'profiles',profileSelection:5});app.press(6);app.press(3);app.press(3);app.press(3);app.show({view:'settings',selection:11});app.press(6);assert.equal(app.state().view,'ratingPromptSettings');shot();app.press(1);assert.equal(app.state().ratePromptEnabled,false);app.press(4);assert.equal(app.state().view,'settings');
const reload=launch(app.store);reload.boot();assert.equal(reload.state().ratePromptEnabled,false);assert.notEqual(reload.state().activeProfile,5);
require('./rating-shared-profile-smoke.cjs');
// MONO persists, keeps useful color cues, and pregame header contains only battery UI.
app.show({view:'profiles',profileSelection:0});app.press(6);app.press(6);app.show({view:'theme',theme:'OCEAN'});app.press(3);assert.equal(app.state().theme,'MONO');app.press(4);
app.show({view:'pregame',modeSelection:4,theme:'MONO',display:100});shot();for(let y=6;y<22;y++)for(let x=10;x<210;x++){const p=(y*320+x)*3;assert.deepEqual([...app.pixels.subarray(p,p+3)],[16,16,16]);}
app.show({view:'stats',games:12345678,best:99999999,theme:'MONO'});shot();
app.show({view:'profiles',profileSelection:5,theme:'MONO'});shot();
const mono=launch(app.store);mono.boot();assert.equal(mono.state().theme,'MONO');
const dataPng=Buffer.alloc(960*480*3);shots.forEach((frame,i)=>{for(let y=0;y<240;y++)frame.copy(dataPng,((Math.floor(i/3)*240+y)*960+i%3*320)*3,y*960,(y+1)*960);});fs.mkdirSync('previews',{recursive:true});fs.writeFileSync('previews/remora-polish-030.png',png(960,480,dataPng));
console.log('Polish: rare optional rating invite, cooldown, global XDAXA toggle, return flow, MONO persistence, clean header and large stats OK');
