const fs=require('node:fs');
const path=require('node:path');
const {launch}=require('./pixel-harness.cjs');
const reverse=process.argv[2]==='1';
const target=path.resolve(__dirname,'../previews',reverse?'reverse-menu-animation':'menu-animation');fs.mkdirSync(target,{recursive:true});
const app=launch();app.boot();if(reverse)app.show({modeSelection:1});
for(let i=0;i<36;i++){app.capture(path.join(target,String(i).padStart(2,'0')+'.png'));app.advance(125);}
console.log('Native menu animation frames saved');
