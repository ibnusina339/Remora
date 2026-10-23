/* Original procedural menu music and short game cues. One shared Web Audio mixer. */
(function(root){
  'use strict';
  function create(){
    let ctx,master,bgm,sfxBus,loop=null,step=0,scene='',previousPower='off',lastMeow=-1;
    const meowBuffers=new Map();
    let levels={master:70,bgm:35,sfx:75};const voices=new Set();
    const frequency=n=>440*2**((n-69)/12);
    function unlock(){
      const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;
      try{
        if(!ctx){ctx=new Audio();master=ctx.createGain();bgm=ctx.createGain();sfxBus=ctx.createGain();bgm.connect(master);sfxBus.connect(master);master.connect(ctx.destination);apply();}
        if(ctx.state==='suspended')ctx.resume()?.catch?.(()=>{});
      }catch(_){return;}
    }
    function apply(){if(!ctx)return;for(const [node,value]of [[master,levels.master],[bgm,levels.bgm],[sfxBus,levels.sfx]]){node.gain.cancelScheduledValues(ctx.currentTime);if(!value)node.gain.setValueAtTime(0,ctx.currentTime);else node.gain.setTargetAtTime(value/100,ctx.currentTime,.025);}}
    function note(hz,duration=.12,type='triangle',bus='sfx',delay=0,volume=.12,endHz){
      if(!ctx||ctx.state!=='running'||!levels.master||!levels[bus]||voices.size>=32)return;
      const start=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(hz,start);
      if(endHz)osc.frequency.exponentialRampToValueAtTime(endHz,start+duration);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(gain);gain.connect(bus==='bgm'?bgm:sfxBus);const voice={osc,bus};voices.add(voice);
      osc.onended=()=>{voices.delete(voice);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+duration+.02);
    }
    function meow(){
      const samples=root.RemoraMeowSamples||[];
      if(!ctx||ctx.state!=='running'||!levels.master||!levels.sfx||!samples.length)return;
      // Retapping restarts one voice instead of stacking several loud meows.
      for(const v of voices)if(v.kind==='meow'){try{v.osc.stop();}catch(_){}voices.delete(v);}
      if(voices.size>=32)return;
      const candidate=Math.floor(Math.random()*(samples.length-(lastMeow>=0&&samples.length>1?1:0)));
      const selected=samples.length>1&&lastMeow>=0&&candidate>=lastMeow?candidate+1:candidate;
      lastMeow=selected;const sample=samples[selected];
      if(!meowBuffers.has(selected)){
        const bytes=root.atob(sample.pcm16),buffer=ctx.createBuffer(1,bytes.length/2,sample.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++){const value=bytes.charCodeAt(i*2)|(bytes.charCodeAt(i*2+1)<<8);data[i]=(value>=32768?value-65536:value)/32768;}
        meowBuffers.set(selected,buffer);
      }
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=meowBuffers.get(selected);gain.gain.setValueAtTime(.75,ctx.currentTime);source.connect(gain);gain.connect(sfxBus);
      const voice={osc:source,bus:'sfx',kind:'meow'};voices.add(voice);
      source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();};source.start(ctx.currentTime);
    }
    function effect(name){
      const sequences={boot:[60,64,67,72],off:[72,67,60,48],clear:[64,67,72,76],fail:[60,58,53],confirm:[67,72],back:[64,60],secret:[72,79,84,88],food:[72,79],hit:[79,84],damage:[48,43],go:[79],correct:[76],move:[67],step:[55],bounce:[74]};
      if(name==='meow'){meow();return;}
      if(name==='shoot'){note(1050,.09,'square','sfx',0,.045,250);return;}
      (sequences[name]||sequences.move).forEach((n,i)=>note(frequency(n),name==='fail'?.22:.12,name==='bounce'?'sine':'triangle','sfx',i*.075,name==='step'?.035:.11));
    }
    function stopMusic(){if(loop!==null){clearInterval(loop);loop=null;}for(const v of voices)if(v.bus==='bgm'){try{v.osc.stop();}catch(_){}}}
    function musicTick(){
      const melody=[64,67,71,67,64,62,60,null,62,65,69,65,62,60,59,null,60,64,67,64,60,59,57,null,59,62,67,71,69,67,64,null];
      const n=melody[step%melody.length];if(n!=null)note(frequency(n),.18,'triangle','bgm',0,.12);
      if(step%4===0)note(frequency([48,43,45,47][Math.floor(step/8)%4]),.42,'sine','bgm',0,.15);
      if(step%8===4)note(frequency(79),.07,'sine','bgm',0,.045);step++;
    }
    function sync(s){
      levels={master:s.masterVolume??70,bgm:s.bgmVolume??35,sfx:s.sfxVolume??75};apply();
      scene=s.power==='on'&&['home','modeSelect','pregame','gameInfo','settings','sound','display','theme','leds','battery','profile','stats','network','system'].includes(s.view)?'menu':'';
      if(scene&&ctx?.state==='running'&&levels.master&&levels.bgm){if(loop===null){step=0;musicTick();loop=setInterval(musicTick,150);}}
      else stopMusic();
      if(s.power!==previousPower){if(s.power==='boot')effect('boot');if(s.power==='shutdown')effect('off');previousPower=s.power;}
    }
    function tone(n){note(frequency([60,62,64,67,69,72][n-1]||60),.17,'sine');}
    function silence(){stopMusic();for(const v of voices){try{v.osc.stop();}catch(_){}}}
    return {unlock,sync,effect,tone,silence,status:()=>({levels:{...levels},scene,musicPlaying:loop!==null,voices:voices.size})};
  }
  root.RemoraAudio={create};
})(typeof window==='undefined'?globalThis:window);
