const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),sandbox={window:{}};vm.createContext(sandbox);
for(const file of ['remora-cow-sprites.js','remora-cat-sprites.js','remora-feedback.js','remora-arcade.js','remora-pixel-ui.js','remora-meow-sample.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',file),'utf8'),sandbox);
const dest=path.join(root,'firmware/esp32c6/components/remora_core/include');fs.mkdirSync(dest,{recursive:true});
const {RemoraFeedback:f,RemoraArcade:a,RemoraPixelUI:u,RemoraCowSprites:cows,RemoraCatSprites:cats,RemoraMeowSamples:meows}=sandbox.window;
let out='#pragma once\nnamespace remora {\ninline constexpr const char* WinPhrases[11][15]={\n';
for(const g of a.catalog)out+='{'+Array.from({length:15},(_,i)=>JSON.stringify(f.win(g.mode,i))).join(',')+'},\n';out+='};\ninline constexpr const char* LossTitles[11][5]={\n';
for(const g of a.catalog)out+='{'+f.tiers[g.mode].map(s=>JSON.stringify(s)).join(',')+'},\n';out+='};\ninline constexpr const char* LossEndings[23]={'+Array.from({length:23},(_,i)=>JSON.stringify(f.loss('classic',0,0,false,i).line)).join(',')+'};\ninline constexpr uint8_t LossMasks[23]={'+Array.from({length:23},(_,i)=>i<3?31:f.extraEndings[i-3].tiers.reduce((m,n)=>m|(1<<n),0)).join(',')+'};\n}\n';fs.writeFileSync(path.join(dest,'game_feedback.hpp'),out);
const assetDir=path.join(root,'firmware/esp32c6/components/remora_ui/include');fs.mkdirSync(assetDir,{recursive:true});
out='#pragma once\n#include <cstdint>\nnamespace remora {\nstruct Sprite {int w,h;const uint8_t*data;};\n';
const sprites={...Object.fromEntries(Object.entries(cows).map(([k,v])=>['cow_'+k,v])),...Object.fromEntries(Object.entries(cats).map(([k,v])=>['cat_'+k,v]))};
for(const [name,a]of Object.entries(sprites)){
 const values=a.rows.join('').split('').map(c=>({'.':0,'#':1,o:2,g:3})[c]);const bytes=[];for(let i=0;i<values.length;i+=4)bytes.push((values[i]||0)|((values[i+1]||0)<<2)|((values[i+2]||0)<<4)|((values[i+3]||0)<<6));
 out+=`inline constexpr uint8_t ${name}_data[]={${bytes.join(',')}};\ninline constexpr Sprite ${name}={${a.w},${a.h},${name}_data};\n`;
}
out+='struct Glyph {char c;uint8_t w;uint8_t rows[7];};\ninline constexpr Glyph Font[]={\n';
for(const [ch,shape]of Object.entries(u.font))if(ch.length===1&&ch.charCodeAt(0)<127){const rows=shape.split('/');out+='{'+JSON.stringify(ch)+'.0'+','+rows[0].length+',{'+rows.map(row=>parseInt(row,2)).join(',')+'}},\n';}
// Character literal generation avoids quote/backslash ambiguities.
out=out.replace(/\{"((?:\\.|[^"\\])*)"\.0,/g,(m,c)=>'{'+String(JSON.parse('"'+c+'"').charCodeAt(0))+',');
out+='};\ninline constexpr const char* Guides[11][9]={\n';for(const g of a.catalog)out+='{'+g.guide.map(JSON.stringify).join(',')+'},\n';out+='};\n}\n';fs.writeFileSync(path.join(assetDir,'pixel_assets.hpp'),out);
const audioDir=path.join(root,'firmware/esp32c6/components/remora_board/include');fs.mkdirSync(audioDir,{recursive:true});
out='#pragma once\n#include <cstdint>\nnamespace remora {\n';const lengths=[];
for(let i=0;i<meows.length;i++){const m=meows[i],pcm=Buffer.from(m.pcm16,'base64'),n=Math.floor(pcm.length/2*8000/m.sampleRate),values=[];for(let j=0;j<n;j++){const p=Math.min(pcm.length/2-1,Math.floor(j*m.sampleRate/8000));values.push(Math.max(0,Math.min(255,128+Math.round(pcm.readInt16LE(p*2)/256))));}lengths.push(n);out+=`inline constexpr uint8_t Meow${i}[]={${values.join(',')}};\n`;}
out+='inline constexpr const uint8_t* Meows[]={Meow0,Meow1,Meow2,Meow3,Meow4,Meow5};\ninline constexpr unsigned MeowLengths[]={'+lengths.join(',')+'};\n}\n';fs.writeFileSync(path.join(audioDir,'meow_samples.hpp'),out);
console.log('Generated native 2-bit sprites, bitmap fonts, guides, feedback and six PCM meows.');
