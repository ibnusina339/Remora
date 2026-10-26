const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {launch,png}=require('./pixel-harness.cjs');
const app=launch({value:null});app.boot();app.show({nameChars:[...'REMORA_',]});app.press(6);app.advance(2500);
assert.equal(app.state().tutorialStep,0);assert.ok(!fs.readFileSync('assets/remora-tutorial.js','utf8').includes('MEOW'));
app.show({});assert.ok(app.drawCalls.some(([x,y,w,h])=>x===16&&y===140&&w===288&&h===2));
const shots=[Buffer.from(app.pixels)];app.press(6);assert.equal(app.state().tutorialStep,1);app.advance(2500);app.press(6);assert.equal(app.state().tutorialDialog,false);
app.show({});assert.ok(!app.drawCalls.some(([x,y,w])=>x===16&&y===140&&w===288));shots.push(Buffer.from(app.pixels));
app.press(2);assert.equal(app.state().tutorialStep,2);assert.equal(app.state().tutorialDialog,true);app.advance(2500);
app.press(3);assert.equal(app.state().tutorialStep,2);assert.equal(app.state().tutorialDialog,false);const page=app.state().guidePage;app.press(1);assert.equal(app.state().tutorialDialog,false);assert.ok(app.state().guidePage<=page);
app.press(6);assert.equal(app.state().tutorialStep,3);app.press(3);assert.equal(app.state().tutorialStep,4);assert.equal(app.state().tutorialDialog,true);
// Snake input keys and lamps, while the logical movement rules are unchanged.
const snake=launch();snake.boot();snake.show({difficulty:0});snake.test.arcade.start('snake');
snake.press(2);assert.equal(snake.state().game.nextDir,2);snake.advance(snake.state().game.tickMs);snake.press(4);assert.equal(snake.state().game.nextDir,1);snake.advance(snake.state().game.tickMs);snake.press(5);assert.equal(snake.state().game.nextDir,5);snake.advance(snake.state().game.tickMs);snake.press(6);assert.equal(snake.state().game.nextDir,3);
assert.deepEqual(snake.keys.map(k=>k.attrs['data-action']),['','UP','','LEFT','DOWN','RIGHT']);
snake.press(1);snake.press(3);assert.equal(snake.state().game.nextDir,3);
const arrow=launch();arrow.boot();arrow.test.arcade.start('snake');arrow.press(2);arrow.advance(arrow.state().game.tickMs);arrow.document.listeners.keydown[0]({key:'ArrowLeft',preventDefault(){}});arrow.document.listeners.keyup[0]({key:'ArrowLeft'});assert.equal(arrow.state().game.nextDir,1);arrow.advance(2001);assert.notEqual(arrow.state().view,'home');
// Network opens a menu without scanning; only SCAN WIFI starts a scan.
const wifi=launch();wifi.boot();wifi.show({view:'settings',selection:6});wifi.press(6);assert.equal(wifi.state().view,'network');assert.equal(wifi.state().wifiScanBusy,false);wifi.advance(1000);assert.equal(wifi.state().view,'network');assert.equal(wifi.state().wifiNetworks.length,0);
wifi.press(6);assert.equal(wifi.state().view,'wifiScan');assert.equal(wifi.state().wifiScanBusy,true);wifi.advance(800);assert.equal(wifi.state().wifiNetworks.length,3);shots.push(Buffer.from(wifi.pixels));
wifi.press(6);assert.equal(wifi.state().view,'textEntry');assert.equal(wifi.state().textKind,'password');
wifi.document.listeners.keydown[0]({key:'Enter',preventDefault(){}});assert.equal(wifi.state().view,'textEntry');assert.equal(wifi.state().textError,'PASSWORD DIPERLUKAN');
wifi.document.listeners.keydown[0]({key:'Escape',preventDefault(){}});assert.equal(wifi.state().view,'wifiScan');
wifi.press(5);wifi.press(6);assert.equal(wifi.state().view,'wifiConnecting');wifi.advance(1200);assert.equal(wifi.state().wifiSSID,'WiFi Terbuka');assert.equal(wifi.state().networkError,'');wifi.advance(1250);assert.equal(wifi.state().view,'wifiScan');
wifi.press(2);wifi.press(6);wifi.show({textBuffer:'password123'});wifi.document.listeners.keydown[0]({key:'Enter',preventDefault(){}});assert.equal(wifi.state().view,'wifiConnecting');wifi.advance(1200);assert.equal(wifi.state().wifiSSID,'REMORA Home');assert.equal(wifi.state().manualPassword,'');wifi.advance(1250);
wifi.press(1);assert.equal(wifi.state().wifiScanBusy,true);wifi.press(4);wifi.advance(1000);assert.equal(wifi.state().view,'network');assert.equal(wifi.state().wifiScanBusy,false);wifi.press(4);assert.equal(wifi.state().view,'settings');
// Direct SSID entry was removed; other network choices still open their own screens.
wifi.press(6);wifi.press(5);wifi.press(6);assert.equal(wifi.state().view,'phoneSetup');wifi.press(4);assert.equal(wifi.state().view,'network');wifi.press(5);wifi.press(6);assert.equal(wifi.state().view,'networkDemo');
assert.ok(!fs.readFileSync('index.html','utf8').includes("startTextEntry('ssid')"));
assert.ok(!fs.readFileSync('assets/remora-pixel-ui.js','utf8').includes('TYPE MANUALLY'));
const contact=Buffer.alloc(960*240*3);shots.forEach((shot,i)=>{for(let y=0;y<240;y++)shot.copy(contact,(y*960+i*320)*3,y*960,(y+1)*960);});fs.mkdirSync('previews',{recursive:true});fs.writeFileSync(path.resolve('previews/tutorial-snake-wifi.png'),png(960,240,contact));
console.log('Tutorial: compact centered dialog, hide/reappear; Snake: 2/5/6/4; Wi-Fi: menu before scan, no SSID editor, secured/open selection, cancel and rescan OK');
