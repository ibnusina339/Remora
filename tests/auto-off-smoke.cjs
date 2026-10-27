const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={window:{}};vm.createContext(box);vm.runInContext(fs.readFileSync('assets/remora-idle-policy.js','utf8'),box);
const create=()=>box.window.RemoraIdlePolicy.create();
let p=create();assert.ok(!p.due(0,5,true));assert.ok(!p.due(299999,5,true));assert.ok(p.due(300000,5,true));
p.touch(299999);assert.ok(!p.due(300000,5,true));assert.ok(p.due(599999,5,true));
p=create();p.touch(0);assert.ok(!p.due(99999999,0,true));assert.ok(!p.due(99999999,5,false));assert.ok(!p.due(100000000,5,true));
assert.equal(box.window.RemoraIdlePolicy.valid(-1),5);assert.equal(box.window.RemoraIdlePolicy.valid(60),5);
const{launch}=require('./pixel-harness.cjs');
const app=launch();app.boot();assert.equal(app.state().autoOffMinutes,5);
app.press(6);app.jump(299960);app.advance(20);assert.equal(app.state().power,'on');app.advance(20);assert.equal(app.state().power,'shutdown');app.advance(2600);assert.equal(app.state().power,'standby');
// A physical button restarts the timer; renderer/game timers alone do not.
const input=launch();input.boot();input.press(6);input.jump(299900);input.down(2);input.up(2);input.jump(200);input.advance(20);assert.equal(input.state().power,'on');input.jump(300000);input.advance(20);assert.equal(input.state().power,'shutdown');
// OFF and saving the chosen interval into this profile survive a reload.
const setting=launch();setting.boot();setting.show({view:'settings',selection:10});setting.press(6);assert.equal(setting.state().view,'autoOff');
setting.press(1);assert.equal(setting.state().autoOffMinutes,2);setting.press(1);setting.press(1);assert.equal(setting.state().autoOffMinutes,0);setting.press(6);assert.equal(setting.state().view,'settings');setting.jump(3600000);setting.advance(20);assert.equal(setting.state().power,'on');
const saved=launch(setting.store);saved.boot();assert.equal(saved.state().autoOffMinutes,0);
// OTA activity receives a fresh full interval when it ends.
const ota=launch();ota.boot();ota.show({otaBusy:true});ota.jump(400000);ota.advance(20);assert.equal(ota.state().power,'on');ota.show({otaBusy:false});ota.jump(299960);ota.advance(20);assert.equal(ota.state().power,'on');ota.advance(20);assert.equal(ota.state().power,'shutdown');
// New profiles default to five minutes while the existing profile keeps its value.
setting.show({view:'profiles',profileSelection:1});setting.press(6);setting.show({nameChars:[...'NEW____']});setting.press(6);assert.equal(setting.state().autoOffMinutes,5);setting.show({tutorialStep:-1,view:'profiles',profileSelection:0});setting.press(6);setting.press(6);assert.equal(setting.state().autoOffMinutes,0);
console.log('Auto Off: five-minute default, exact deadline, real input reset, shutdown/standby, OFF, per-profile persistence and OTA protection OK');
