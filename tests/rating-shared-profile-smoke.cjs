const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(data={}){
 const box={window:{RemoraArcade:{catalog:[{mode:'classic'},{mode:'reverse'}]}}};vm.createContext(box);vm.runInContext(fs.readFileSync('assets/remora-ratings.js','utf8'),box);
 const storage={getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},s={playerId:'SAME',playerName:'PLAYER',activeProfile:0,mode:'classic',difficulty:1,view:'gameover'},queue=[];
 let now=0;const r=box.window.RemoraRatings.create({state:s,storage,profiles:{},render(){},save(){},home(){s.view='home';},now:()=>now,later:f=>queue.push(f)});
 const flush=()=>{while(queue.length)queue.shift()();};
 return {data,s,r,queue,flush,time:t=>now=t,finish(score=1000,mode='classic',difficulty=1,clears=2){s.mode=mode;s.difficulty=difficulty;s.view='gameover';r.gameOver({mode,difficulty,score,clears,newRecord:false});flush();return s.view==='ratingInvite';},decline(){r.press(4);},lane:()=>JSON.parse(data['remora-rating-policy']).play['SAME:0']};
}
const a=harness();assert.ok(!a.finish());assert.ok(!a.finish());assert.ok(a.finish());a.decline();
// Ordinary repeat: same game/profile already asked, exactly 12 more results AND 30min.
for(let i=0;i<11;i++)assert.ok(!a.finish());a.time(1799999);assert.ok(!a.finish());a.time(1800000);assert.ok(a.finish());a.decline();
// Results remain independent even when both respondents use the same profile.
a.r.press(6); // no-op on gameover
a.s.view='ratingInvite';a.s.rateInviteGame=0;a.r.press(6);a.r.press(3);a.r.press(6);a.r.press(3);assert.equal(a.s.view,'ratingThanks');a.r.press(6);
for(let i=0;i<11;i++)assert.ok(!a.finish());a.time(3600001);assert.ok(a.finish());a.r.press(6);a.r.press(3);a.r.press(3);a.r.press(6);a.r.press(3);
const records=JSON.parse(a.data['remora-ratings']);assert.equal(records.length,2);assert.equal(records[0].profileId,records[1].profileId);assert.notEqual(records[0].id,records[1].id);assert.notDeepEqual(records[0].stars,records[1].stars);
// A consistent drop can invite weaker players too; one bad game cannot.
const b=harness();b.finish(2000);b.finish(2000);assert.ok(b.finish(2000));b.decline();b.time(600000);
assert.ok(!b.finish(0,'classic',1,0));assert.ok(!b.finish(2000));assert.ok(!b.finish(2000),'one outlier triggered a change');
assert.ok(!b.finish(100,'classic',1,0));assert.ok(!b.finish(100,'classic',1,0));assert.ok(b.finish(100,'classic',1,0),'consistent lower scores never invited');b.decline();
// A stable improvement is also a hint, only after all cooldowns.
const c=harness();c.finish();c.finish();c.finish();c.decline();c.time(599999);
for(let i=0;i<6;i++)assert.ok(!c.finish(4000));c.time(600000);assert.ok(c.finish(4000));c.decline();
// Separate game/difficulty, identity and the global developer switch remain isolated.
const d=harness();d.finish(2000);d.finish(2000);d.finish(2000);d.decline();d.time(600000);
for(let i=0;i<6;i++)assert.ok(!d.finish(100,'classic',3,0),'difficulty switch was treated as new player');
assert.ok(d.finish(1000,'reverse'));d.decline();
d.s.activeProfile=5;d.s.developerUnlocked=true;d.r.openPromptSettings();d.r.press(1);d.s.activeProfile=0;d.time(4000000);for(let i=0;i<20;i++)assert.ok(!d.finish());
d.s.activeProfile=5;d.s.developerUnlocked=true;d.r.openPromptSettings();d.r.press(3);for(let i=0;i<3;i++)assert.ok(!d.finish(),'developer got a reminder');
// A reboot keeps the game gap, while uptime timestamps are deliberately reset.
const seed=harness();seed.finish();seed.finish();seed.finish();seed.decline();const reboot=harness(seed.data);for(let i=0;i<11;i++)assert.ok(!reboot.finish());assert.ok(reboot.finish());
// Rated in an older version is no longer a permanent block.
const oldData={'remora-ratings':JSON.stringify([{id:1,profileId:'SAME',profileName:'PLAYER',game:0,stars:[4],suggestions:0}]),'remora-rating-policy':JSON.stringify({enabled:true,completed:20,lastPromptGame:10,asked:{'SAME:0':true}})};
const migrated=harness(oldData);assert.ok(migrated.finish());
// Queued invitations recheck the profile and enabled setting.
const pending=harness();pending.finish();pending.finish();pending.s.view='gameover';pending.r.gameOver({mode:'classic',score:1000,clears:2});pending.s.playerId='OTHER';pending.flush();assert.equal(pending.s.view,'gameover');
console.log('Shared profile rating: repeated records, 12 games/30min, 3-vs-3 score hint, 6 games/10min, outlier/difficulty isolation, migration and global off OK');
