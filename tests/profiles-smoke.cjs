const assert=require('node:assert/strict'),{launch}=require('./pixel-harness.cjs');
const app=launch({value:null});app.boot();app.press(5);app.press(6);
assert.equal(app.state().playerName,'A');assert.equal(app.state().tutorialStep,0);
app.advance(3000);app.capture(require('node:path').resolve('previews/remora-tutorial.png'));
// Exercise actual tutorial controls and per-game preference persistence.
app.press(6);assert.equal(app.state().tutorialStep,1);app.press(2);assert.equal(app.state().view,'gameInfo');
app.advance(3000);app.press(6);assert.equal(app.state().view,'pregame');app.press(3);assert.equal(app.state().difficulty,2);
for(let i=0;i<3;i++){app.advance(3000);app.press(6);}assert.equal(app.state().tutorialStep,-1);
function settings(){app.show({power:'on',view:'settings',mode:null,tutorialStep:-1});}
function add(name){settings();app.show({selection:9});app.press(6);app.press(6);assert.equal(app.state().view,'firstLoginCountdown');app.advance(3020);assert.equal(app.state().power,'standby');app.down(1);app.down(3);app.advance(2020);app.up(1);app.up(3);app.advance(2500);assert.equal(app.state().view,'nameEditor');app.show({nameChars:[name,...Array(6).fill(null)]});app.press(6);assert.equal(app.state().playerName,name);assert.equal(app.state().tutorialStep,0);app.down(4);app.down(6);app.advance(3020);app.up(4);app.up(6);}
app.show({records:{'classic:2':1234},masterVolume:20});settings();app.show({selection:5});app.press(6);app.press(4);
for(const name of ['B','C','D','E'])add(name);
assert.equal(app.state().profiles.filter(Boolean).length,5);
settings();app.show({selection:9});app.press(6);app.press(6);assert.equal(app.state().view,'slotsFull');assert.equal(app.state().profiles.filter(Boolean).length,5);
app.press(6);app.show({profileSelection:0});app.press(6);app.press(6);assert.equal(app.state().playerName,'A');assert.equal(app.state().records['classic:2'],1234);assert.equal(app.state().masterVolume,20);
settings();app.show({selection:5});app.press(6);app.show({profileSelection:4});app.press(6);app.press(5);app.press(5);app.press(6);assert.equal(app.state().view,'deleteProfile');app.press(6);assert.equal(app.state().profiles.filter(Boolean).length,4);
add('F');assert.equal(app.state().profiles.filter(Boolean).length,5);
const reloaded=launch(app.store);reloaded.boot();assert.equal(reloaded.state().playerName,'F');assert.equal(reloaded.state().tutorialStep,-1);
// Pending SPI survives a crash but the unconfirmed clock does not.
reloaded.show({view:'display',displaySelection:1});reloaded.press(3);assert.equal(reloaded.state().spiTrial,true);
const fallback=launch(app.store);assert.equal(fallback.state().spiMHz,10);assert.equal(fallback.state().spiTrial,false);
fallback.boot();fallback.show({view:'display',displaySelection:1});fallback.press(3);fallback.advance(15020);assert.equal(fallback.state().spiMHz,10);
console.log('Profiles: five slots, name tutorial, first-login restart, no overwrite, switching, delete, reload and SPI rollback OK');

// Suspending releases held movement, while wake keys do not become gameplay input.
const paused=launch();paused.boot();paused.test.arcade.start('pong');paused.down(3);paused.advance(80);paused.setBattery(5);paused.up(3);paused.advance(2020);paused.setBattery(10);paused.down(1);paused.down(3);paused.advance(2020);paused.up(1);paused.up(3);const x=paused.state().game.playerX;paused.advance(80);assert.equal(paused.state().game.playerX,x);
