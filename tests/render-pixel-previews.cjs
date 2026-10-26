const fs=require('node:fs');
const path=require('node:path');
const {launch,png}=require('./pixel-harness.cjs');
const target=path.resolve(__dirname,'../previews');fs.mkdirSync(target,{recursive:true});
const app=launch();app.boot();const base=app.state();
const pages=[...Array.from({length:13},(_,modeSelection)=>({view:'home',modeSelection})),
  {view:'pregame',modeSelection:0},{view:'pregame',modeSelection:0,difficulty:2},
  {view:'settings',selection:0},{view:'battery'},
  {view:'chargeRequired',batteryPercent:4},{view:'chargeRequired',batteryPercent:4,charging:true},
  {view:'home',modeSelection:1,theme:'OCEAN'},
  {view:'input',mode:'classic',level:3,sequence:[1,2,3],inputIndex:1}];
const frames=pages.map(values=>{app.show({...base,...values});return Buffer.from(app.pixels);});
function sheet(selected,columns,file){
  const w=320*columns,h=240*Math.ceil(selected.length/columns),data=Buffer.alloc(w*h*3);
  selected.forEach((index,n)=>{for(let y=0;y<240;y++)frames[index].copy(data,((Math.floor(n/columns)*240+y)*w+n%columns*320)*3,y*320*3,(y+1)*320*3);});
  fs.writeFileSync(path.join(target,file),png(w,h,data));
}
sheet(pages.map((_,i)=>i),3,'pixel-contact-sheet.png');
sheet([0,13],2,'remora-menu-pregame.png');
sheet([16,17],2,'remora-battery-charge.png');
sheet([3,4,5,6,7,8],2,'remora-new-games.png');
const gameplay=[];
for(const [mode,ms]of [['maze',0],['whack',0],['potato',50],['direction',0],['missing',4000],['decoder',900]]){
  app.show({...base,difficulty:2});app.test.arcade.start(mode);app.advance(ms);gameplay.push(frames.length);frames.push(Buffer.from(app.pixels));
}
sheet(gameplay,2,'remora-gameplay.png');
const expanded=[];
for(const [mode,difficulty,ms]of [['maze',0,0],['maze',4,4000],['decoder',2,1000],['decoder',4,5820]]){
  app.show({...base,difficulty});app.test.arcade.start(mode);app.advance(ms);expanded.push(frames.length);frames.push(Buffer.from(app.pixels));
}
sheet(expanded,2,'remora-maze-decoder.png');
sheet([3,8,expanded[0],expanded[3],13,14],2,'remora-ui-polish.png');
const colourUpdate=[];
for(const [mode,difficulty,previousLevel]of [['direction',1,0],['direction',4,5],['maze',4,0],['maze',4,20]]){
  app.show({...base,difficulty});app.test.arcade.start(mode);if(previousLevel){app.test.state.level=previousLevel;app.test.arcade.nextLevel();}
  colourUpdate.push(frames.length);frames.push(Buffer.from(app.pixels));
}
app.test.arcade.fail('WARNA TIDAK SESUAI');colourUpdate.push(frames.length);frames.push(Buffer.from(app.pixels));
app.show({...base,difficulty:1});app.test.arcade.start('classic');app.down(4);app.advance(1100);colourUpdate.push(frames.length);frames.push(Buffer.from(app.pixels));
sheet(colourUpdate,2,'remora-colour-progress.png');
app.up(4);
const retro=[];
for(const [i,mode]of [[9,'snake'],[10,'pong']]){
  app.show({...base,mode:null,view:'home',modeSelection:i});retro.push(frames.length);frames.push(Buffer.from(app.pixels));
  app.show({...base,difficulty:1});app.test.arcade.start(mode);app.advance(mode==='snake'?500:200);retro.push(frames.length);frames.push(Buffer.from(app.pixels));
}
app.show({...base,mode:null,view:'sound'});retro.push(frames.length);frames.push(Buffer.from(app.pixels));
app.power();app.advance(450);retro.push(frames.length);frames.push(Buffer.from(app.pixels));
sheet(retro,2,'remora-retro-audio.png');
console.log('Pixel renderer previews saved in previews/');
