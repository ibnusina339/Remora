const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{launch,png}=require('./pixel-harness.cjs');
const app=launch();app.boot();const shots=[];
function shot(){app.show({});for(const[x,y,w,h]of app.drawCalls)assert.ok(x>=0&&y>=0&&x+w<=320&&y+h<=240,`${app.state().view}: overflow ${x},${y},${w},${h}`);shots.push(Buffer.from(app.pixels));}
function rate(){app.show({view:'home',modeSelection:11,tutorialStep:-1});app.press(6);assert.equal(app.state().view,'rateMenu');}
assert.equal(app.state().profiles.length,6);assert.equal(app.state().profiles[5].playerName,'XDAXA');assert.equal(app.state().profiles.slice(0,5).filter(Boolean).length,1);
app.show({modeSelection:11});shot();rate();app.press(6);app.press(6);assert.equal(app.state().view,'ratingStars');
app.press(6);assert.equal(app.state().view,'ratingStars');assert.equal(app.state().rateStars[0],0);
for(let i=0;i<5;i++)app.press(3);assert.equal(app.state().rateStars[0],5);shot();app.press(6);assert.equal(app.state().view,'ratingSuggestions');
app.press(6);app.press(5);app.press(6);app.press(5);app.press(6);assert.equal(app.state().rateSuggestions,3);assert.equal(app.state().rateHint,'MAKSIMAL DUA SARAN');shot();
app.press(3);assert.equal(app.state().view,'ratingThanks');shot();let records=JSON.parse(app.store.extra['remora-ratings']);assert.equal(records.length,1);assert.equal(records[0].stars[0],5);assert.equal(records[0].suggestions,3);assert.equal(records[0].profileName,'PLAYER');
rate();app.press(5);app.press(6);for(let i=0;i<5;i++){app.press(6);assert.equal(app.state().view,'ratingStars');app.press(3);app.press(6);}assert.equal(app.state().view,'ratingThanks');records=JSON.parse(app.store.extra['remora-ratings']);assert.equal(records.length,2);assert.deepEqual(records[1].stars,[1,1,1,1,1]);
app.show({view:'stats'});app.press(3);app.press(3);app.press(3);assert.equal(app.state().view,'stats');
app.show({view:'profiles',profileSelection:5});app.press(6);assert.equal(app.state().view,'devGate');app.press(6);assert.equal(app.state().activeProfile,0);app.press(3);app.press(3);assert.equal(app.state().view,'devGate');app.press(3);assert.equal(app.state().playerName,'XDAXA');assert.equal(app.state().activeProfile,5);
app.show({view:'stats'});app.press(3);app.press(3);app.press(3);assert.equal(app.state().view,'rateResults');app.press(6);assert.equal(app.state().rateRecords.length,1);shot();app.press(6);assert.equal(app.state().view,'rateReport');assert.ok(app.state().rateReportRows.some(v=>v==='DARI PLAYER'));assert.ok(app.state().rateReportRows.some(v=>v==='STARS:5'));
app.press(4);app.press(4);app.press(5);app.press(6);app.press(6);assert.equal(app.state().rateReportRows.length,13);for(let i=0;i<7;i++)app.press(5);assert.equal(app.state().rateScroll,7);shot();
const reloaded=launch(app.store);reloaded.boot();assert.notEqual(reloaded.state().playerName,'XDAXA');assert.equal(JSON.parse(reloaded.store.extra['remora-ratings']).length,2);assert.equal(reloaded.state().profiles[5].playerName,'XDAXA');
// Direct profile API also protects the reserved slot and rejects name spoofing.
const vm=require('node:vm'),sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/remora-profiles.js'),'utf8'),sandbox);
const memory={},storage={getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v},p=sandbox.window.RemoraProfiles.create(storage,{playerName:'',tutorialDone:false}),state={};p.load(state);assert.equal(p.remove(state,5),false);assert.equal(p.switch(state,5),false);assert.equal(p.add(state,'XDAXA','BAD'),false);for(let i=0;i<5;i++)assert.equal(p.add(state,'U'+i,''+i),true);assert.equal(p.firstLogin(),false);assert.equal(p.snapshot().profiles[5].playerName,'XDAXA');
const data=Buffer.alloc(960*480*3);shots.forEach((frame,i)=>{for(let y=0;y<240;y++)frame.copy(data,((Math.floor(i/3)*240+y)*960+i%3*320)*3,y*960,(y+1)*960);});fs.mkdirSync('previews',{recursive:true});fs.writeFileSync('previews/remora-ratings.png',png(960,480,data));
console.log('Ratings: half stars, required answers, two suggestions max, append-only records, developer gates, profile safety, persistence and scrolling OK');

// Logical off/on locks XDAXA again, while its saved records remain available.
app.power();app.advance(2600);app.power();app.down(1);app.down(3);app.advance(2020);app.up(1);app.up(3);app.advance(2500);assert.notEqual(app.state().playerName,'XDAXA');assert.equal(app.state().developerUnlocked,false);
