const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={window:{}};vm.createContext(box);vm.runInContext(fs.readFileSync('assets/remora-network-idle.js','utf8'),box);
const create=()=>box.window.RemoraNetworkIdle.create();
for(const [screen,setup,interval]of [[false,false,30000],[true,false,120000],[true,true,300000]]){
 const p=create();assert.ok(!p.due(0,true,screen,setup,false));assert.ok(!p.due(interval-1,true,screen,setup,false));assert.ok(p.due(interval,true,screen,setup,false));p.touch(interval);assert.ok(!p.due(interval*2-1,true,screen,setup,false));assert.ok(p.due(interval*2,true,screen,setup,false));
}
let p=create();assert.ok(!p.due(0,true,true,false,false));assert.ok(!p.due(600000,true,true,false,true));assert.ok(!p.due(719999,true,true,false,false));assert.ok(p.due(720000,true,true,false,false));
p=create();assert.ok(!p.due(0,true,true,false,false));assert.ok(!p.due(110000,true,false,false,false));assert.ok(!p.due(139999,true,false,false,false));assert.ok(p.due(140000,true,false,false,false));assert.ok(!p.due(999999,false,false,false,false));
const {launch}=require('./pixel-harness.cjs');
function fresh(values={}){const app=launch();app.boot();app.show({autoOffMinutes:0,wifiConfigured:true,wifiSSID:'SAVED NETWORK',...values});return app;}
// Home/menu navigation must not keep a radio connection alive.
const home=fresh({view:'home',wifiPower:'on'});home.advance(20);home.jump(15000);home.press(3);home.advance(20);assert.equal(home.state().wifiPower,'on');home.jump(14940);home.advance(20);assert.equal(home.state().wifiPower,'on');home.advance(20);assert.equal(home.state().wifiPower,'off');assert.ok(home.state().wifiAutoStopped);assert.equal(home.state().wifiSSID,'SAVED NETWORK');assert.ok(home.state().wifiConfigured);
const userData=home.store.extra['remora-profiles'];home.jump(600000);home.advance(20);assert.equal(home.state().wifiPower,'off');assert.equal(home.store.extra['remora-profiles'],userData);
// Network buttons give the network screen a fresh two-minute window.
const screen=fresh({view:'network',wifiPower:'on'});screen.advance(20);screen.jump(119960);screen.advance(20);assert.equal(screen.state().wifiPower,'on');screen.press(2);screen.jump(119960);screen.advance(20);assert.equal(screen.state().wifiPower,'on');screen.advance(20);assert.equal(screen.state().wifiPower,'off');
// Leaving the network UI starts a thirty-second grace period, not a stale deadline.
const leave=fresh({view:'network',wifiPower:'on'});leave.advance(20);leave.jump(110000);leave.press(4);leave.advance(20);assert.equal(leave.state().view,'settings');leave.jump(29960);leave.advance(20);assert.equal(leave.state().wifiPower,'on');leave.advance(20);assert.equal(leave.state().wifiPower,'off');
// Existing game-start and standby/off immediate shutdown remain intact.
const game=fresh({view:'pregame',modeSelection:0,wifiPower:'on'});game.press(6);assert.equal(game.state().wifiPower,'off');assert.ok(game.state().wifiConfigured);assert.equal(game.state().wifiSSID,'SAVED NETWORK');
const shutdown=fresh({view:'home',wifiPower:'on'});shutdown.power();assert.equal(shutdown.state().wifiPower,'off');
// Real setup form input extends AP lifetime; expiry stops AP and shows honest status.
const ap=fresh({view:'network',networkSelection:1});ap.press(6);assert.equal(ap.state().wifiPower,'ap');ap.advance(20);ap.jump(299960);ap.advance(20);assert.equal(ap.state().wifiPower,'ap');ap.el('portal-form').listeners.input[0]({});ap.jump(299960);ap.advance(20);assert.equal(ap.state().wifiPower,'ap');ap.advance(20);assert.equal(ap.state().wifiPower,'off');assert.equal(ap.state().view,'wifiStatus');assert.ok(ap.state().wifiAutoStopped);assert.equal(ap.state().wifiSSID,'SAVED NETWORK');
// An active scan and valid connection attempt are protected; their end starts fresh idle time.
const scan=fresh({view:'network',networkSelection:0});scan.press(6);scan.jump(400000);scan.advance(20);assert.ok(scan.state().wifiScanBusy);assert.equal(scan.state().wifiPower,'on');scan.advance(800);assert.ok(!scan.state().wifiScanBusy);scan.jump(119900);scan.advance(20);assert.equal(scan.state().wifiPower,'on');scan.advance(100);assert.equal(scan.state().wifiPower,'off');
const connect=fresh({view:'wifiScan',wifiPower:'on',wifiScanBusy:false,wifiScanSelection:0,wifiNetworks:[{ssid:'OPEN NETWORK',secured:false,rssi:-60}]});connect.press(6);assert.equal(connect.state().wifiPower,'connecting');connect.jump(10000);connect.advance(20);assert.equal(connect.state().wifiPower,'connecting');connect.advance(1300);assert.equal(connect.state().wifiPower,'on');assert.equal(connect.state().wifiSSID,'OPEN NETWORK');
// A wedged connection times out rather than protecting the radio forever; stale result cannot reconnect it.
const stuck=fresh({view:'wifiScan',wifiPower:'on',wifiScanBusy:false,wifiScanSelection:0,wifiNetworks:[{ssid:'OPEN NETWORK',secured:false,rssi:-60}]});stuck.press(6);stuck.jump(21000);stuck.advance(20);assert.equal(stuck.state().view,'wifiResult');assert.match(stuck.state().networkError,/BELUM TERHUBUNG/);stuck.advance(1300);assert.equal(stuck.state().wifiSSID,'SAVED NETWORK');
// OTA protects the radio and clears stale offer only after a complete fresh idle interval.
const ota=fresh({view:'networkDemo',networkOperation:'OTA UPDATE',wifiPower:'on',otaBusy:true,otaAvailable:true,otaVersion:'v9.9.9',otaProgress:25});ota.advance(20);ota.jump(600000);ota.advance(20);assert.equal(ota.state().wifiPower,'on');ota.show({otaBusy:false});ota.advance(20);ota.jump(119940);ota.advance(20);assert.equal(ota.state().wifiPower,'on');ota.advance(40);assert.equal(ota.state().wifiPower,'off');assert.ok(!ota.state().otaAvailable);assert.equal(ota.state().otaVersion,'');assert.equal(ota.state().otaProgress,0);assert.match(ota.state().otaMessage,/otomatis mati/);
console.log('Wi-Fi idle: 30s menus, 120s network, 300s setup, real activity, immediate game/off, protected operations, stale offers/callbacks and saved data OK');
