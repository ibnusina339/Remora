const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
let contexts=0,started=0,stopped=0,recordedStarted=0;const buffers=[],played=[],intervals=new Map();let timerId=0;
const parameter=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){assert.ok(v>0);this.value=v;}});
class AudioContext {
  constructor(){contexts++;this.state='running';this.currentTime=0;this.destination={};}
  createGain(){return {gain:parameter(),connect(){},disconnect(){}};}
  createOscillator(){return {frequency:parameter(),connect(){},disconnect(){},start(t){assert.ok(t>=0);started++;},stop(){stopped++;}};}
  createBuffer(channels,length,sampleRate){assert.equal(channels,1);const data=new Float32Array(length),buffer={sampleRate,length,getChannelData:()=>data};buffers.push(buffer);return buffer;}
  createBufferSource(){return {connect(){},disconnect(){},start(){assert.ok(this.buffer?.length>0);played.push(this.buffer);recordedStarted++;},stop(){stopped++;}};}
}
let randomIndex=0;const randomValues=[0,.19,.38,.57,.76,.99];
const controlledMath=Object.create(Math);controlledMath.random=()=>randomValues[randomIndex++%randomValues.length];
const sandbox={Math:controlledMath,window:{AudioContext,atob:value=>Buffer.from(value,'base64').toString('binary')},setInterval:fn=>{intervals.set(++timerId,fn);return timerId;},clearInterval:id=>intervals.delete(id)};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('assets/remora-meow-sample.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('assets/remora-audio.js','utf8'),sandbox);
const audio=sandbox.window.RemoraAudio.create(),s={power:'on',view:'home',masterVolume:70,bgmVolume:35,sfxVolume:75};
audio.unlock();audio.unlock();assert.equal(contexts,1);audio.sync(s);assert.equal(audio.status().musicPlaying,true);assert.equal(intervals.size,1);
for(let i=0;i<8;i++)audio.sync(s);assert.equal(intervals.size,1,'duplicate music loops');
audio.sync({...s,view:'snakeInput'});assert.equal(intervals.size,0);assert.ok(stopped>0);
let before=started;audio.effect('shoot');assert.ok(started>before);
before=started;audio.effect('fail');assert.ok(started-before>=4,'missing game-over melody');before=started;audio.effect('recordFail');assert.ok(started-before>=6,'missing new-record ending');
before=started;audio.effect('meow');assert.equal(recordedStarted,1);assert.equal(started,before,'meow must use the real sample, not oscillators');assert.equal(buffers.length,1);assert.equal(buffers[0].sampleRate,22050);
assert.equal(sandbox.window.RemoraMeowSamples.length,6);
const voiceCount=audio.status().voices;
for(let i=1;i<12;i++){audio.effect('meow');assert.equal(audio.status().voices,voiceCount,'repeated meows must not stack');}
assert.equal(recordedStarted,12);assert.equal(buffers.length,6,'each of six samples must be decoded only once');
assert.equal(new Set(played).size,6,'all six variants must be playable');
for(let i=1;i<played.length;i++)assert.notEqual(played[i],played[i-1],'same meow repeated immediately');
for(const buffer of buffers){const pcm=buffer.getChannelData(0);assert.ok(pcm.length/22050>.6&&pcm.length/22050<1.3);assert.ok(Math.max(...pcm.map(Math.abs))<=.801);assert.ok(Math.sqrt(pcm.reduce((sum,n)=>sum+n*n,0)/pcm.length)>.02,'meow sample is silent');}
audio.sync({...s,view:'snakeInput',sfxVolume:0});before=started;audio.effect('shoot');audio.tone(1);assert.equal(started,before,'muted SFX still makes voices');
audio.effect('meow');assert.equal(recordedStarted,12,'SFX mute must mute the recordings');
audio.sync({...s,masterVolume:0});before=started;audio.effect('clear');assert.equal(started,before);assert.equal(intervals.size,0);
audio.sync({...s,bgmVolume:0});assert.equal(intervals.size,0);before=started;audio.effect('correct');assert.ok(started>before,'BGM mute must preserve SFX');
audio.sync({...s,power:'shutdown'});assert.equal(intervals.size,0);audio.silence();
console.log('Audio: six real single-meow clips, cached decoding, no immediate repeats/stacking, mixer and mute OK');
