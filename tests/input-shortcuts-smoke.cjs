const assert=require('node:assert/strict');
const {launch}=require('./pixel-harness.cjs');
function pointer(app){return {
  down(n){app.keys[n-1].listeners.pointerdown[0]({pointerId:n});},
  up(n){app.keys[n-1].listeners.pointerup[0]();app.keys[n-1].listeners.click[0]();},
  tap(n){this.down(n);this.up(n);}
};}
function keyboard(app){const digits=[4,5,6,1,2,3];return {
  down(n){app.document.listeners.keydown[0]({key:String(digits[n-1]),code:'Numpad'+digits[n-1],preventDefault(){}});},
  up(n){app.document.listeners.keyup[0]({key:String(digits[n-1]),code:'Numpad'+digits[n-1]});},
  tap(n){this.down(n);this.up(n);}
};}
// Use actual pointer/keyboard event handlers: direct simulator.press previously hid this bug.
for(const controls of [pointer,keyboard]){
  const app=launch({value:null});app.boot();const input=controls(app);
  input.tap(5);input.tap(6);assert.equal(app.state().tutorialStep,0);
  input.tap(6);assert.equal(app.state().tutorialStep,0);assert.equal(app.state().tutorialReveal,true);
  input.tap(6);assert.equal(app.state().tutorialStep,1);
  for(const [key,step]of [[2,2],[6,3],[3,4],[6,5],[6,6],[6,-1]]){app.advance(2500);if(app.state().tutorialStep<6){input.tap(6);assert.equal(app.state().tutorialDialog,false);}input.tap(key);assert.equal(app.state().tutorialStep,step);}
  assert.equal(app.state().view,'home');
}
const skip=launch({value:null});skip.boot();const skipInput=pointer(skip);skipInput.tap(5);skipInput.tap(6);
skipInput.down(4);skipInput.down(6);skip.advance(2999);assert.ok(skip.state().tutorialStep>=0);skip.advance(1);skipInput.up(4);skipInput.up(6);assert.equal(skip.state().tutorialStep,-1);assert.equal(skip.state().view,'home');
for(const controls of [pointer,keyboard]){
  const app=launch();app.boot();const input=controls(app);
  input.down(1);app.advance(80);assert.equal(app.state().modeSelection,0);input.down(3);app.advance(1999);assert.notEqual(app.state().view,'shutdownConfirm');app.advance(1);assert.equal(app.state().view,'shutdownConfirm');
  input.up(1);input.up(3);assert.equal(app.state().view,'shutdownConfirm');assert.equal(app.state().modeSelection,0);input.tap(4);assert.equal(app.state().view,'home');
  input.down(3);input.down(1);app.advance(2000);input.up(3);input.up(1);assert.equal(app.state().view,'shutdownConfirm');input.tap(6);assert.equal(app.state().power,'shutdown');app.advance(2600);assert.equal(app.state().power,'standby');
  input.down(1);input.down(3);app.advance(2020);input.up(1);input.up(3);app.advance(2500);assert.equal(app.state().view,'home');
}
// The power chord freezes deadlines and resumes on Cancel; KEY4 still exits games.
const game=launch();game.boot();game.show({difficulty:2});game.test.arcade.start('classic');game.advance(2600);assert.equal(game.state().view,'input');
const keys=keyboard(game),remaining=game.state().speedDeadline-game.state().animationTime;
keys.down(1);keys.down(3);game.advance(2000);keys.up(1);keys.up(3);assert.equal(game.state().view,'shutdownConfirm');game.advance(3000);keys.tap(4);assert.equal(game.state().view,'input');assert.ok(Math.abs(game.state().speedDeadline-game.state().animationTime-remaining)<25);
keys.down(4);game.advance(2000);keys.up(4);assert.equal(game.state().view,'home');
const low=launch();low.boot();low.down(1);low.down(3);low.advance(2000);assert.equal(low.state().view,'shutdownConfirm');low.setBattery(5);low.up(1);low.up(3);assert.equal(low.state().view,'powerNotice');low.advance(2020);assert.equal(low.state().power,'standby');
console.log('Input: pointer/numpad tutorial, secret skip, shutdown confirmation, cancel/resume, force exit and battery preemption OK');

// An aborted chord consumes both releases, and normal single taps still navigate.
for(const controls of [pointer,keyboard])for(const order of [[1,3],[3,1]]){
 const app=launch();app.boot();const input=controls(app);
 input.down(order[0]);app.advance(120);assert.equal(app.state().modeSelection,0);
 input.down(order[1]);app.advance(600);assert.equal(app.state().modeSelection,0);
 input.up(order[0]);input.up(order[1]);assert.equal(app.state().view,'home');assert.equal(app.state().modeSelection,0);
 input.tap(3);assert.equal(app.state().modeSelection,1);input.tap(1);assert.equal(app.state().modeSelection,0);
 input.down(3);app.advance(650);assert.equal(app.state().modeSelection,2);input.up(3);assert.equal(app.state().modeSelection,2);
}
console.log('KEY1+KEY3: both orders, staggered presses, canceled holds, no page drift and single-key repeat OK');
