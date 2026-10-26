const assert=require('node:assert/strict');
const {launch}=require('./pixel-harness.cjs');
function controls(app,keyboard){const nums=[4,5,6,1,2,3];return {
  down(n){if(keyboard)app.document.listeners.keydown[0]({key:String(nums[n-1]),code:'Numpad'+nums[n-1],preventDefault(){}});else app.keys[n-1].listeners.pointerdown[0]({pointerId:n});},
  up(n){if(keyboard)app.document.listeners.keyup[0]({key:String(nums[n-1]),code:'Numpad'+nums[n-1]});else{app.keys[n-1].listeners.pointerup[0]();app.keys[n-1].listeners.click[0]();}},
  tap(n){this.down(n);this.up(n);}
};}
for(const keyboard of [false,true]){
  const app=launch();app.boot();const input=controls(app,keyboard),original=app.state().playerName;
  input.tap(1);input.tap(6);for(let i=0;i<5;i++)input.tap(5);input.tap(6);input.tap(5);
  assert.equal(app.state().view,'profiles');const saved=app.store.extra['remora-profiles'];
  input.tap(6);assert.equal(app.state().view,'nameEditor');assert.equal(app.keys[3].attrs['data-action'],'BATAL');
  input.tap(4);assert.equal(app.state().view,'profiles');assert.equal(app.store.extra['remora-profiles'],saved);
  input.tap(6);input.tap(5);input.tap(3);input.tap(5);assert.equal(app.keys[3].attrs['data-action'],'DELETE');
  input.tap(4);assert.equal(app.state().view,'nameEditor');assert.equal(app.state().nameChars.filter(c=>c!==null).length,1);
  // Hold cancel discards the remaining draft and must not leak a click into the list.
  input.down(4);app.advance(999);assert.equal(app.state().view,'nameEditor');app.advance(1);input.up(4);assert.equal(app.state().view,'profiles');
  assert.equal(app.state().playerName,original);assert.equal(app.state().profiles.filter(Boolean).length,1);assert.equal(app.store.extra['remora-profiles'],saved);
  input.tap(6);input.tap(5);app.document.listeners.keydown[0]({key:'Escape',preventDefault(){}});assert.equal(app.state().view,'profiles');assert.equal(app.store.extra['remora-profiles'],saved);
  // Saving still creates one user and starts their tutorial after cancellation attempts.
  input.tap(6);input.tap(5);input.tap(6);assert.equal(app.state().tutorialStep,0);assert.equal(app.state().profiles.filter(Boolean).length,2);
}
console.log('Profiles: blank cancel, short delete, held cancel, Escape, no slot/data changes and successful save via pointer/numpad OK');
