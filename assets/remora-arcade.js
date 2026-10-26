/* Gameplay state machines. All deadlines use the host's cancellable timer queue. */
(function(root){
  'use strict';
  const catalog=[
    {name:'CLASSIC',mode:'classic',pose:'stand',guide:['INGAT LAMPU, ULANGI URUTANNYA.','HARD+: POLA BARU TIAP LEVEL.','HARD+: SPEED DAN POLA PANJANG.']},
    {name:'REVERSE',mode:'reverse',pose:'back',guide:['ULANGI WARNA DARI AKHIR KE AWAL.','HARD+: POLA BARU DAN SPEED.','EXPERT+: CERMIN POSISI TOMBOL.']},
    {name:'REACTION',mode:'reaction',pose:'alert',guide:['TULISAN GO HIJAU: TEKAN WARNA TARGET.','HARD+: TULISAN GO MERAH = JANGAN TEKAN.','EXPERT: CERMIN = POSISI LAWAN 180 DERAJAT.','ATAS KIRI/KANAN <> BAWAH KANAN/KIRI.','ATAS TENGAH <> BAWAH TENGAH.','MASTER: TOMBOL SEBELAH SATU BARIS.']},
    {name:'LIGHT MAZE',mode:'maze',pose:'graze',guide:['ATAS: TOMBOL TENGAH ATAS.','KANAN: TOMBOL KANAN ATAS.','BAWAH: TENGAH BAWAH. KIRI: KIRI ATAS.','P PORTAL. * BONUS. G GOAL.','MASTER: PETA BESAR DAN BONUS WAJIB.']},
    {name:'WHACK-A-LIGHT',mode:'whack',pose:'jump',guide:['HIJAU TAP. MERAH JANGAN TAP.','BIRU DOUBLE TAP. KUNING HOLD.','UNGU: TOMBOL SEBELAH SATU BARIS.','HARD+: BEBERAPA ISYARAT SEKALIGUS.']},
    {name:'HOT POTATO',mode:'potato',pose:'run',guide:['TUNGGU SINYAL DI NODE TARGET.','TEKAN HANYA SAAT WARNA HIJAU.','HARD+: PUTAR BALIK DI TENGAH.','EXPERT+: TARGET MERAH ITU JEBAKAN.']},
    {name:'DIRECTION SHIFT',mode:'direction',pose:'roll',guide:['COCOKKAN PANAH DENGAN KARTU ARAH.','BLOK WARNA MENUNJUKKAN TOMBOL.','IKUTI ROTASI DAN CERMIN POSISI.','HARD+: INGAT MAPPING ARAH.','MASTER: RANGKAIAN PANAH.']},
    {name:'MISSING KEY',mode:'missing',pose:'peek',guide:['INGAT POLA PERTAMA.','PUTARAN KEDUA ADA LAMPU HILANG.','TEBAK SESUAI URUTAN CELAHNYA.','HARD+: 2 CELAH. MASTER: REVERSE.']},
    {name:'SIGNAL DECODER',mode:'decoder',pose:'listen',guide:['EASY/NORMAL 4 BIT. HARD+ 5-7 BIT.','UBAH BINER MENJADI ANGKA DESIMAL.','ATAS KIRI/KANAN: PINDAH DIGIT.','TENGAH ATAS TAMBAH, BAWAH KURANG.','BAWAH KIRI HAPUS. KANAN OK.','EXPERT INVERT. MASTER LSB DULU.']},
    {name:'SNAKE',mode:'snake',pose:'graze',guide:['GIRING ULAR SAPI MENCARI RUMPUT.','ATAS TENGAH NAIK, BAWAH TENGAH TURUN.','BAWAH KIRI/KANAN: KIRI/KANAN.','EASY-HARD: TEMBUS SISI LAYAR.','EXPERT/MASTER: DINDING MEMATIKAN.','HINDARI BATU DAN TUBUH SENDIRI.','MAKAN RUMPUT UNTUK NAIK LEVEL.']},
    {name:'PONG',mode:'pong',pose:'expert',guide:['PANTULKAN BOLA SUSU KE LAWAN.','ATAS KIRI/KANAN: GESER PAPAN.','BOLA MAKIN CEPAT SELAMA RALLY.','ARAHKAN PANTULAN DARI TEPI PAPAN.','JANGAN BIARKAN BOLA JATUH.']}
  ];
  const K=['#c49bef','#75d9e8','#ffd76b','#ff797d','#79acfa','#8bdcad'];
  const keyNames=['UNGU','CYAN','KUNING','MERAH','BIRU','HIJAU'];
  const colors={safe:'#8bdcad',blocked:'#ff797d',portal:'#79acfa',bonus:'#ffd76b',purple:'#c49bef'};
  const playable=new Set(['ready','watch','input','clear','wrong','gameover','reactionWait','reactionGo','reactionFake','reactionResult','mazePreview','mazeInput','whackInput','potatoInput','directionPreview','directionInput','missingWatch','missingReplay','missingInput','decoderWatch','decoderInput','snakeInput','pongInput']);
  function create(host){
    const s=host.state,now=host.now,rand=host.random||Math.random;
    const r=n=>Math.floor(rand()*n),key=()=>1+r(6),stage=()=>Math.floor(Math.max(0,s.level-1)/5),difficulty=()=>s.difficulty,extraStage=()=>Math.floor(stage()/3),hard=()=>difficulty()>=2;
    const pace=()=>Math.max(.55,.94**stage()),burden=()=>Math.floor(stage()/2);
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=r(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
    const actionKey=n=>(s.keyPalette||K).indexOf(K[n-1])+1;
    function refreshKeyPalette(){
      const previous=s.keyPalette||K;
      // Keep a mapping stable for the whole level. Every colour moves when it changes.
      if(!hard()&&s.level!==1&&(s.level-1)%5!==0)return;
      if(!hard()&&s.level===1){s.keyPalette=K.slice();return;}
      let next;
      for(let attempt=0;attempt<24;attempt++){
        const candidate=shuffle(previous.slice());
        if(candidate.every((c,i)=>c!==previous[i]&&c!==K[i])){next=candidate;break;}
      }
      if(!next)next=Array.from({length:5},(_,i)=>previous.slice(i+1).concat(previous.slice(0,i+1))).find(a=>a.every((c,i)=>c!==previous[i]&&c!==K[i]))||previous.slice(1).concat(previous[0]);
      // Retain the colours of a growing Easy/Normal memory pattern after moving keys.
      s.sequence=(s.sequence||[]).map(n=>next.indexOf(previous[n-1])+1);
      s.keyPalette=next;
    }
    const active=()=>s.power==='on'&&!!s.mode&&playable.has(s.view);
    let deadlineToken=0,waveToken=0,holdToken=0;
    function cancel(){host.cancel();deadlineToken++;waveToken++;holdToken++;}
    function draw(){s.gameLEDs=leds();host.render();}
    function sfx(name){host.sfx?.(name);}
    function resetDeadline(){deadlineToken++;s.speedDeadline=0;s.speedWindow=0;}
    function deadline(ms){
      resetDeadline();if(!ms)return;
      const ticket=deadlineToken;s.speedWindow=ms;s.speedDeadline=now()+ms;
      host.later(()=>{if(ticket===deadlineToken&&active())fail('WAKTU HABIS');},ms);
    }
    function phrase(){s.phraseCounters=s.phraseCounters||{};const n=s.phraseCounters[s.mode]||0;s.phraseCounters[s.mode]=n+1;return root.RemoraFeedback.win(s.mode,n);}
    function points(n){s.score+=n;s.totalCorrect++;host.save();}
    function remember(value,lower=false){
      const record=s.mode+':'+s.difficulty,prev=s.records[record];
      if(prev==null||(lower?value<prev:value>prev))s.records[record]=value;
      if(!lower)s.best=Math.max(s.best||0,s.score);
      host.save();
    }
    function clear(next){
      cancel();s.clears++;s.score+=100+s.level*10;s.view='clear';s.message=phrase();s.endMessage=s.level%5===0?'TEMPO NAIK SEDIKIT':'';s.pulse=0;
      sfx('clear');
      if(s.mode!=='reaction')remember(s.score);
      draw();host.say(s.message);host.later(next||nextLevel,1450);
    }
    function fail(reason='SALAH TOMBOL'){
      if(!s.mode)return;
      cancel();s.failureReason=reason;s.view='gameover';s.pulse=0;
      const value=s.mode==='reaction'?null:s.score;
      const newRecord=value!==null&&s.recordAtStart!=null&&value>s.recordAtStart;
      sfx(newRecord?'recordFail':'fail');
      const bag=root.RemoraFeedback.lossVariants(s.mode,s.score,s.clears,newRecord),last=s.phraseCounters['lossLast:'+s.mode];
      const choices=bag.filter(n=>n!==last),variant=choices[r(choices.length)];s.phraseCounters['lossLast:'+s.mode]=variant;
      const feedback=root.RemoraFeedback.loss(s.mode,s.score,s.clears,newRecord,variant);
      s.message=feedback.title;s.endMessage=feedback.line;s.feedbackTier=feedback.tier;
      if(value!==null)remember(value);
      host.gameOver?.({mode:s.mode,score:s.score,clears:s.clears,newRecord});
      draw();host.say(reason+'. '+s.message+'. Skor '+s.score);
    }
    function start(mode){
      cancel();s.mode=mode;s.level=0;s.sequence=[];s.keyPalette=K.slice();s.inputIndex=0;s.score=0;s.combo=0;s.clears=0;s.message='';s.endMessage='';s.failureReason='';
      s.elapsed=0;s.result='';s.pulse=0;s.game={};s.games++;s.wifiPower='off';s.recordAtStart=s.records[mode+':'+s.difficulty];host.save();nextLevel();
    }
    function nextLevel(){
      cancel();s.level++;s.challengeStage=stage();s.effectiveDifficulty=difficulty();s.inputIndex=0;s.pulse=0;s.game={};resetDeadline();
      refreshKeyPalette();
      ({classic:memory,reverse:memory,reaction:reaction,maze:maze,whack:whack,potato:potato,direction:direction,missing:missing,decoder:decoder,snake,pong}[s.mode])();
    }
    function freshPattern(length,previous=[]){
      const result=Array.from({length},key);
      if(previous.length&&result[0]===previous[0])result[0]=result[0]%6+1;
      return result;
    }
    function memory(){
      if(hard())s.sequence=freshPattern(Math.min(30,[0,0,4,6,8][difficulty()]+Math.floor((s.level-1)/2)),s.sequence);
      else s.sequence.push(key());
      s.view='ready';s.game.mirror=s.mode==='reverse'&&difficulty()>=3;draw();
      host.later(()=>{
        s.view='watch';draw();
        const interval=Math.max(130,Math.round([1050,850,400,280,190][difficulty()]*pace()));
        s.sequence.forEach((n,i)=>{
          host.later(()=>{s.pulse=n;host.tone(n);draw();},250+i*interval);
          host.later(()=>{s.pulse=0;draw();},250+i*interval+Math.round(interval*.6));
        });
        host.later(()=>{s.view='input';s.pulse=0;deadline(hard()?Math.max(300,Math.round([0,0,1000,700,480][difficulty()]*pace())):0);draw();},300+s.sequence.length*interval);
      },650);
    }
    function memoryPress(n){
      let expected=s.mode==='reverse'?s.sequence[s.sequence.length-1-s.inputIndex]:s.sequence[s.inputIndex];
      if(s.game.mirror)expected=7-expected;
      if(n!==expected){fail('URUTAN TIDAK TEPAT');return;}
      s.inputIndex++;s.combo++;points(10);sfx('correct');
      if(s.inputIndex===s.sequence.length)clear();
      else {deadline(hard()?Math.max(300,Math.round([0,0,1000,700,480][difficulty()]*pace())):0);draw();}
    }
    function reaction(){
      s.game={hits:0,times:[],required:Math.min(15,[1,1,3,5,7][difficulty()]+burden()),fakeUsed:false};reactionCue();
    }
    function reactionCue(){
      cancel();s.view='reactionWait';s.target=key();s.pulse=0;draw();
      host.later(()=>{
        if(hard()&&!s.game.fakeUsed&&rand()<.6){
          s.game.fakeUsed=true;s.view='reactionFake';draw();host.later(reactionCue,320);return;
        }
        s.game.fakeUsed=false;s.view='reactionGo';s.reactionStart=now();s.pulse=s.target;
        sfx('go');
        deadline(Math.max(200,Math.round([3000,2200,700,450,320][difficulty()]*pace())));draw();
      },700+r(1400));
    }
    function reactionPress(n){
      if(s.view!=='reactionGo'){fail(s.view==='reactionFake'?'TERTIPU GO MERAH':'TERLALU AWAL');return;}
      const expected=difficulty()===4?neighbor(s.target,1):difficulty()===3?7-s.target:s.target;
      if(n!==expected){fail('TARGET TIDAK TEPAT');return;}
      const elapsed=Math.round(now()-s.reactionStart);cancel();s.game.times.push(elapsed);s.game.hits++;points(50);sfx('correct');
      s.message=phrase();
      if(s.game.hits>=s.game.required){
        s.clears++;s.elapsed=Math.round(s.game.times.reduce((a,b)=>a+b,0)/s.game.times.length);s.result='GREAT!';s.view='reactionResult';s.endMessage=s.level%5===0?'TEMPO NAIK SEDIKIT':'LEVEL BERIKUTNYA...';
        remember(s.elapsed,true);s.bestReaction=s.bestReaction==null?s.elapsed:Math.min(s.bestReaction,s.elapsed);host.save();draw();host.later(nextLevel,1450);return;
      }
      s.view='clear';draw();host.later(reactionCue,950);
    }
    function mazeNeighbors(n,cols,rows){
      const x=n%cols,y=Math.floor(n/cols),out=[];
      if(y>0)out.push(n-cols);if(x<cols-1)out.push(n+1);if(y<rows-1)out.push(n+cols);if(x>0)out.push(n-1);return out;
    }
    function mazeTarget(n){
      const g=s.game,offset={1:-1,2:-g.cols,3:1,5:g.cols}[n];
      if(offset==null)return null;const target=g.current+offset;
      return mazeNeighbors(g.current,g.cols,g.rows).includes(target)?target:-1;
    }
    function mazeOpen(a,b){return s.game.links[a].includes(b);}
    function maze(){
      const master=difficulty()===4,growth=stage(),cols=Math.min(master?18:12,[6,7,8,9,14][difficulty()]+Math.ceil(growth/2)),rows=Math.min(master?12:7,[4,5,5,6,9][difficulty()]+Math.floor(growth/2));
      const size=cols*rows,start=r(size),links=Array.from({length:size},()=>[]),parent=Array(size).fill(-1),depth=Array(size).fill(0),stack=[start],seen=new Set(stack);
      while(stack.length){const cell=stack.at(-1),next=shuffle(mazeNeighbors(cell,cols,rows)).find(n=>!seen.has(n));
        if(next==null){stack.pop();continue;}links[cell].push(next);links[next].push(cell);parent[next]=cell;depth[next]=depth[cell]+1;seen.add(next);stack.push(next);
      }
      const goal=depth.indexOf(Math.max(...depth)),path=[];for(let n=goal;n!==-1;n=parent[n])path.unshift(n);
      const portal=difficulty()>=1?{from:path[Math.floor(path.length/3)],to:path[Math.floor(path.length*2/3)]}:null;
      const optimum=path.length-1-(portal?path.indexOf(portal.to)-path.indexOf(portal.from):0);
      const bonusCount=master?Math.min(4,2+extraStage()):1;
      const bonuses=master?[...Array.from({length:bonusCount-1},(_,i)=>path[Math.max(1,Math.floor(path.length/3*(i+1)/bonusCount))]),path.at(-2)]:[path.at(-2)];
      s.game={cols,rows,links,path,current:start,start,goal,portal,bonus:path.at(-2),bonuses,collectedBonuses:[],bonusTaken:false,moves:0,moveLimit:optimum+Math.max(0,[24,18,12,8,3][difficulty()]-extraStage()),visited:[start],portalUsed:false,mapVisible:true,bumped:false,stepWindow:hard()?Math.max(master?450:700,Math.round([0,0,2600,1900,1000][difficulty()]*pace())):0};
      if(!hard()){s.view='mazeInput';draw();return;}
      s.view='mazePreview';draw();host.later(()=>{s.game.mapVisible=false;s.view='mazeInput';deadline(s.game.stepWindow);draw();},[0,0,8000,6500,4000][difficulty()]);
    }
    function mazePress(n){
      const g=s.game,target=mazeTarget(n);if(target==null)return;
      if(target<0||!mazeOpen(g.current,target)){g.bumped=true;if(hard())fail('MENABRAK DINDING');else draw();return;}
      g.bumped=false;g.current=target;g.moves++;sfx('step');
      if(hard()&&g.moves>g.moveLimit){fail('TERLALU BANYAK LANGKAH');return;}
      if(!g.visited.includes(target)){g.visited.push(target);points(10);}
      if(g.portal&&target===g.portal.from&&!g.portalUsed){g.current=g.portal.to;points(15);g.portalUsed=true;sfx('portal');if(!g.visited.includes(g.current))g.visited.push(g.current);}
      if(g.bonuses.includes(g.current)&&!g.collectedBonuses.includes(g.current)){g.collectedBonuses.push(g.current);g.bonusTaken=g.collectedBonuses.length===g.bonuses.length;points(40);sfx('bonus');}
      if(g.current===g.goal){if(hard()&&!g.bonusTaken){fail('BONUS BELUM DIAMBIL');return;}clear();}
      else {deadline(g.stepWindow);draw();}
    }
    function neighbor(n,dir){const col=(n-1)%3;return n+(col+dir<0||col+dir>2?-dir:dir);}
    function whack(){s.game={wave:0,total:Math.min(28,[3,5,7,9,12][difficulty()]+burden()),cues:[],purpleDir:1};whackWave();}
    function whackWave(){
      cancel();const g=s.game;g.wave++;g.purpleDir=difficulty()>=3?(rand()<.5?-1:1):1;g.cues=[];s.view='whackInput';
      const count=[1,1,2,2,3][difficulty()],types=difficulty()===0?['tap','avoid']:['tap','avoid','double','hold','neighbor'],reserved=new Set();
      for(let i=0;i<count;i++){
        let cue;
        for(let tries=0;tries<100;tries++){
          const type=types[r(types.length)],n=key(),target=type==='neighbor'?neighbor(n,g.purpleDir):n;
          if(type==='neighbor'&&((n-1)%3+g.purpleDir<0||(n-1)%3+g.purpleDir>2))continue;
          if(reserved.has(n)||reserved.has(target))continue;
          cue={key:n,target,type,taps:0,done:false,holding:false};reserved.add(n);reserved.add(target);break;
        }
        if(cue)g.cues.push(cue);
      }
      const ms=Math.max(850,Math.round([2600,2300,1500,1200,1050][difficulty()]*pace()));
      s.speedWindow=ms;s.speedDeadline=now()+ms;const ticket=waveToken;
      host.later(()=>{
        if(ticket!==waveToken||s.view!=='whackInput')return;
        for(const cue of g.cues){if(cue.type==='avoid'){cue.done=true;points(15);}}
        if(g.cues.every(c=>c.done))whackComplete();else fail('ISYARAT TERLEWAT');
      },ms);draw();
    }
    function whackComplete(){if(s.game.wave>=s.game.total)clear();else host.later(whackWave,140);}
    function whackPress(n){
      const g=s.game,c=g.cues.find(c=>!c.done&&c.target===n);
      if(!c){fail('TOMBOL TIDAK SESUAI');return;}
      if(c.type==='avoid'){fail('MERAH JANGAN DITEKAN');return;}
      if(c.type==='hold'){fail('KUNING HARUS DITAHAN');return;}
      if(c.type==='double'){
        const ms=[650,550,360,280,210][difficulty()];
        if(!c.taps){c.taps=1;c.firstTap=now();host.later(()=>{if(s.view==='whackInput'&&g===s.game&&!c.done)fail('DOUBLE TAP TERLAMBAT');},ms);draw();return;}
        if(now()-c.firstTap>ms){fail('DOUBLE TAP TERLAMBAT');return;}
      }
      c.done=true;points(25);sfx('correct');draw();if(g.cues.every(v=>v.done))whackComplete();
    }
    function needsHold(n){return s.view==='whackInput'&&s.game.cues.some(c=>!c.done&&c.type==='hold'&&c.target===n);}
    function keyDown(n){
      if(s.view==='pongInput'&&active()){
        if(n===1||n===3){if(!s.game.held[n]){s.game.held[n]=true;press(n);}return true;}
      }
      if(!active()||!needsHold(n))return false;
      const g=s.game,c=g.cues.find(c=>!c.done&&c.type==='hold'&&c.target===n);if(c.holding)return true;
      c.holding=true;c.holdStart=now();const ticket=holdToken;
      host.later(()=>{
        if(ticket!==holdToken||s.view!=='whackInput'||s.game!==g||!c.holding||c.done)return;
        c.done=true;points(30);sfx('correct');draw();if(g.cues.every(v=>v.done))whackComplete();
      },[650,650,650,700,750][difficulty()]);draw();return true;
    }
    function keyUp(n){
      if(s.view==='pongInput'){
        if(n===1||n===3){delete s.game.held[n];return true;}
      }
      if(s.view!=='whackInput')return false;
      const c=s.game.cues.find(c=>c.type==='hold'&&c.target===n&&c.holding);if(!c)return false;
      c.holding=false;if(!c.done)fail('HOLD TERLALU SINGKAT');return true;
    }
    function potato(){s.game={hits:0,total:Math.min(16,[2,3,4,5,6][difficulty()]+burden())};potatoRound();}
    function potatoRound(){
      cancel();const g=s.game;g.target=key();g.index=r(6);g.dir=difficulty()===0?1:rand()<.5?-1:1;g.steps=0;g.reversed=false;g.green=false;s.view='potatoInput';
      deadline(Math.round([15000,12000,9000,8000,7000][difficulty()]*Math.max(.7,.98**stage())));potatoTick();
    }
    function potatoTick(){
      if(s.view!=='potatoInput')return;
      const g=s.game,order=[1,2,3,6,5,4];g.index=(g.index+g.dir+6)%6;g.signal=order[g.index];g.steps++;
      if(hard()&&!g.reversed&&g.steps===4){g.dir*=-1;g.reversed=true;}
      g.green=g.signal===g.target&&!(difficulty()>=3&&Math.floor(g.steps/6)%2===0);
      draw();host.later(potatoTick,Math.max(130,Math.round([650,500,320,230,170][difficulty()]*pace())));
    }
    function potatoPress(n){
      const g=s.game;if(n!==g.target||g.signal!==g.target||!g.green){fail('KENTANG GOSONG');return;}
      cancel();g.hits++;points(40);sfx('correct');if(g.hits>=g.total)clear();else {s.view='ready';draw();host.later(potatoRound,450);}
    }
    const baseDirections=[2,3,5,1];
    function direction(){s.game={round:0,total:Math.min(24,[3,4,6,8,10][difficulty()]+burden()),rotation:0,mirror:false,chain:[]};directionCue();}
    function directionCue(){
      cancel();const g=s.game;g.round++;g.rotation=difficulty()===0?0:r(4);g.mirror=difficulty()>=3&&rand()<.5;
      g.chain=Array.from({length:difficulty()===4?Math.min(6,3+extraStage()):difficulty()===3&&extraStage()>0?2:1},()=>r(4));g.chainIndex=0;g.mapping=baseDirections.map((_,d)=>baseDirections[((g.mirror?-d:d)+g.rotation+4)%4]);
      g.answerWindow=Math.max(500,Math.round([6000,4500,1900,1300,950][difficulty()]*pace()));
      s.view='directionPreview';draw();host.later(()=>{s.view='directionInput';deadline(g.answerWindow);draw();},[1200,950,600,450,650][difficulty()]);
    }
    function directionPress(n){
      const g=s.game,expected=g.mapping[g.chain[g.chainIndex]];
      if(n!==expected){fail('ARAH TERBALIK');return;}
      g.chainIndex++;points(25);sfx('correct');
      if(g.chainIndex===g.chain.length){if(g.round>=g.total)clear();else directionCue();}
      else {deadline(g.answerWindow);draw();}
    }
    function missing(){
      const length=Math.min(24,[3,4,6,8,10][difficulty()]+Math.floor((s.level-1)/3)),sequence=freshPattern(length);
      s.sequence=sequence;const gaps=shuffle(Array.from({length},(_,i)=>i)).slice(0,Math.min(6,[1,1,2,3,3][difficulty()]+extraStage())).sort((a,b)=>a-b);
      const order=Array.from({length},(_,i)=>i);if(difficulty()===4)order.reverse();
      s.game={gaps,order,answers:order.filter(i=>gaps.includes(i)).map(i=>sequence[i]),index:0,slot:0,gap:false};
      s.view='missingWatch';missingPlayback(false);
    }
    function missingPlayback(replay){
      cancel();const g=s.game,order=replay?g.order:Array.from({length:s.sequence.length},(_,i)=>i),interval=Math.round([750,600,380,270,195][difficulty()]*pace());
      s.view=replay?'missingReplay':'missingWatch';s.pulse=0;draw();
      order.forEach((index,i)=>{
        host.later(()=>{g.slot=i;g.gap=replay&&g.gaps.includes(index);s.pulse=g.gap?0:s.sequence[index];draw();},250+i*interval);
        host.later(()=>{s.pulse=0;draw();},250+i*interval+Math.round(interval*.6));
      });
      host.later(()=>{
        if(!replay){s.pulse=0;g.gap=false;draw();host.later(()=>missingPlayback(true),700);}
        else {s.view='missingInput';s.pulse=0;g.gap=false;deadline(hard()?Math.round([0,0,2600,1900,1300][difficulty()]*pace()):0);draw();}
      },300+order.length*interval);
    }
    function missingPress(n){
      const g=s.game;if(n!==g.answers[g.index]){fail('KUNCI HILANG SALAH');return;}g.index++;points(40);sfx('correct');
      if(g.index===g.answers.length)clear();else {deadline(Math.round([0,0,2600,1900,1300][difficulty()]*pace()));draw();}
    }
    function decoder(){
      const bitCount=[4,4,5,6,7][difficulty()],range=2**bitCount,answers=[],invert=difficulty()>=3,lsb=difficulty()===4;
      s.decoderRecent=s.decoderRecent||[];
      for(let i=0;i<Math.min(6,[1,1,2,3,3][difficulty()]+extraStage());i++){
        // Choose from the whole bit range without repeating any of the last four codes.
        const choices=Array.from({length:range},(_,n)=>n).filter(n=>!s.decoderRecent.includes(n));const n=choices[r(choices.length)];
        answers.push(n);s.decoderRecent.push(n);s.decoderRecent=s.decoderRecent.slice(-4);
      }
      s.game={answers,bitCount,invert,lsb,index:0,bit:null,group:0,slot:0,signalKey:actionKey(2),digits:[0,0,0],digitIndex:2,answerWindow:difficulty()===0?0:Math.max(7000,Math.round([0,20000,16000,13000,11000][difficulty()]*Math.max(.65,.97**stage())))};const signals=[];
      answers.forEach((n,group)=>{let bits=Array.from({length:bitCount},(_,i)=>n>>(bitCount-1-i)&1);if(lsb)bits.reverse();bits.forEach((bit,slot)=>signals.push({bit:invert?1-bit:bit,group,slot}));signals.push({bit:null,group,slot:bitCount});});
      s.view='decoderWatch';const interval=Math.max(140,Math.round([800,600,400,300,230][difficulty()]*pace()));draw();
      signals.forEach((signal,i)=>{
        host.later(()=>{Object.assign(s.game,signal);if(signal.bit!=null)host.tone(signal.bit?6:1);draw();},250+i*interval);
        host.later(()=>{s.game.bit=null;draw();},250+i*interval+Math.round(interval*.65));
      });
      host.later(()=>{s.view='decoderInput';s.game.bit=null;deadline(s.game.answerWindow);draw();},300+signals.length*interval);
    }
    function decoderPress(n){
      const g=s.game;
      if(n===2||n===5)g.digits[g.digitIndex]=(g.digits[g.digitIndex]+(n===5?9:1))%10;
      else if(n===1||n===3)g.digitIndex=(g.digitIndex+(n===1?2:1))%3;
      else if(n===4)g.digits[g.digitIndex]=0;
      else if(n===6){
        if(Number(g.digits.join(''))!==g.answers[g.index]){fail('KODE TIDAK COCOK');return;}g.index++;g.acceptedAt=now();points(45+g.bitCount*5);sfx('correct');
        if(g.index===g.answers.length){clear();return;}g.digits=[0,0,0];g.digitIndex=2;deadline(g.answerWindow);
      }
      draw();
    }
    function snakeFood(){
      const g=s.game,free=[];
      for(let cell=0;cell<g.cols*g.rows;cell++)if(!g.body.includes(cell)&&!g.rocks.includes(cell))free.push(cell);
      g.food=free[r(free.length)];
    }
    function snake(){
      const cols=26,rows=13,head=6*cols+5,body=[head,head-1,head-2],rocks=[];
      const choices=shuffle(Array.from({length:cols*rows},(_,n)=>n).filter(n=>n%cols>10&&n%cols<cols-2&&Math.floor(n/cols)>1&&Math.floor(n/cols)<rows-2));
      rocks.push(...choices.slice(0,hard()?Math.min(24,4+difficulty()*2+stage()):0));
      s.game={cols,rows,body,rocks,dir:3,nextDir:3,eaten:0,goal:3+Math.floor(difficulty()/2),tickMs:Math.max(90,Math.round([270,225,185,155,130][difficulty()]*pace()))};
      snakeFood();s.view='snakeInput';draw();host.later(snakeTick,s.game.tickMs);
    }
    function snakePress(n){
      n=({4:1,2:2,6:3,5:5})[n];const g=s.game;if(!n||g.nextDir!==g.dir)return;
      if(({1:3,3:1,2:5,5:2})[g.dir]!==n)g.nextDir=n;
    }
    function snakeTick(){
      if(s.view!=='snakeInput')return;const g=s.game,head=g.body[0],dx={1:-1,3:1}[g.nextDir]||0,dy={2:-1,5:1}[g.nextDir]||0;let x=head%g.cols+dx,y=Math.floor(head/g.cols)+dy;
      if(difficulty()<3){x=(x+g.cols)%g.cols;y=(y+g.rows)%g.rows;}
      const next=y*g.cols+x,eating=next===g.food;
      if(x<0||x>=g.cols||y<0||y>=g.rows||g.rocks.includes(next)||g.body.slice(0,eating?undefined:-1).includes(next)){fail('ULAR SAPI MENABRAK');return;}
      g.dir=g.nextDir;g.body.unshift(next);
      if(eating){g.eaten++;points(35);sfx('food');if(g.eaten>=g.goal){clear();return;}snakeFood();}
      else g.body.pop();draw();host.later(snakeTick,g.tickMs);
    }
    function pongBall(){
      const g=s.game,angle=(rand()<.5?-1:1)*(.3+rand()*.25);g.rally=0;
      g.ball={x:160,y:82,vx:Math.sin(angle)*g.baseSpeed,vy:Math.cos(angle)*g.baseSpeed};
      g.aiTarget=160;g.aiError=(rand()-.5)*g.aiErrorRange;
    }
    function pong(){
      s.game={playerX:160,aiX:160,held:{},width:[52,46,40,34,28][difficulty()],aiWidth:[48,50,52,54,56][difficulty()],hits:0,goal:Math.min(12,[3,4,5,6,7][difficulty()]+burden()),lives:[3,3,2,2,1][difficulty()],tick:0,
        baseSpeed:[4,4.8,5.7,6.6,7.5][difficulty()]/pace(),maxSpeed:Math.min(17,[7.6,8.6,9.6,10.6,11.8][difficulty()]/pace()),
        aiSpeed:Math.min(9,[3.3,4,4.8,5.7,6.6][difficulty()]/pace()),aiReaction:[10,8,6,4,3][difficulty()],aiErrorRange:[46,34,22,14,6][difficulty()]};
      pongBall();s.view='pongInput';draw();host.later(pongTick,40);
    }
    function pongBounce(opponent){
      const g=s.game,b=g.ball,offset=(b.x-(opponent?g.aiX:g.playerX))/((opponent?g.aiWidth:g.width)/2);
      const aim=opponent?(g.playerX<160?1:-1)*(.35+difficulty()*.1)+offset*.2:offset*.92+((g.held[3]?1:0)-(g.held[1]?1:0))*.1;
      const angle=Math.max(-1,Math.min(1,aim)),speed=Math.min(g.maxSpeed,Math.hypot(b.vx,b.vy)*1.035);
      b.vx=Math.sin(angle)*speed;b.vy=Math.cos(angle)*speed*(opponent?1:-1);g.rally++;
      if(!opponent){points(5);g.aiError=(rand()-.5)*g.aiErrorRange;}
      sfx('bounce');
    }
    function pongPress(n){const g=s.game;if(n===1||n===3)g.playerX=Math.max(18+g.width/2,Math.min(302-g.width/2,g.playerX+(n===1?-14:14)));draw();}
    function pongTick(){
      if(s.view!=='pongInput')return;const g=s.game,b=g.ball;g.tick++;
      g.playerX=Math.max(18+g.width/2,Math.min(302-g.width/2,g.playerX+((g.held[3]?1:0)-(g.held[1]?1:0))*8));
      if(g.tick%g.aiReaction===1||g.tick===1){
        if(b.vy<0){const impact=b.x+b.vx*Math.max(0,(b.y-51)/-b.vy),fold=((impact-22)%552+552)%552;g.aiTarget=22+(fold<=276?fold:552-fold)+g.aiError;}
        else g.aiTarget=160+(b.x-160)*.2;
      }
      const aiHalf=g.aiWidth/2;g.aiX=Math.max(18+aiHalf,Math.min(302-aiHalf,g.aiX+Math.max(-g.aiSpeed,Math.min(g.aiSpeed,g.aiTarget-g.aiX))));
      // Small physics steps keep fast balls from tunnelling through either paddle.
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(b.vx),Math.abs(b.vy))/3));
      for(let i=0;i<steps;i++){
        const oldY=b.y;b.x+=b.vx/steps;b.y+=b.vy/steps;
        if(b.x<22||b.x>298){b.x=b.x<22?44-b.x:596-b.x;b.vx*=-1;sfx('bounce');}
        if(b.vy<0&&oldY>=51&&b.y<=51&&Math.abs(b.x-g.aiX)<aiHalf+3){b.y=102-b.y;pongBounce(true);}
        if(b.vy>0&&oldY<=150&&b.y>=150&&Math.abs(b.x-g.playerX)<g.width/2+3){b.y=300-b.y;pongBounce(false);}
      }
      if(b.y<33){g.hits++;points(65);sfx('food');if(g.hits>=g.goal){clear();return;}pongBall();}
      if(b.y>168){g.lives--;sfx('damage');if(g.lives<=0){fail('BOLA SUSU TERLEWAT');return;}pongBall();}
      draw();host.later(pongTick,40);
    }
    function press(n){
      if(!active())return false;
      const v=s.view;
      if(v==='input')memoryPress(n);
      else if(v.startsWith('reaction')&&v!=='reactionResult')reactionPress(n);
      else if(v==='mazeInput')mazePress(n);
      else if(v==='whackInput')whackPress(n);
      else if(v==='potatoInput')potatoPress(n);
      else if(v==='directionInput')directionPress(n);
      else if(v==='missingInput')missingPress(n);
      else if(v==='decoderInput')decoderPress(n);
      else if(v==='snakeInput')snakePress(n);
      else if(v==='pongInput')pongPress(n);
      // Preview phases deliberately consume button input without starting another action.
      return !['gameover','reactionResult'].includes(v);
    }
    function leds(){
      const out=Array(6).fill('transparent'),g=s.game||{},v=s.view,palette=s.keyPalette||K;
      if(!s.mode)return out;
      if(v==='watch'||v==='missingWatch'||v==='missingReplay'){if(s.pulse)out[s.pulse-1]=palette[s.pulse-1];}
      else if(['input','missingInput'].includes(v))return palette.slice();
      else if(v==='decoderInput')return palette.slice();
      else if(v==='reactionGo'||v==='reactionFake')out[s.target-1]=v==='reactionGo'?palette[s.target-1]:colors.blocked;
      else if(v==='mazePreview'||v==='mazeInput')for(const n of [1,2,3,5]){const target=mazeTarget(n);out[n-1]=target<0||!mazeOpen(g.current,target)?colors.blocked:g.portal&&!g.portalUsed&&target===g.portal.from?colors.portal:g.bonuses.includes(target)&&!g.collectedBonuses.includes(target)?colors.bonus:palette[n-1];}
      else if(v==='whackInput'){for(const cue of g.cues)if(!cue.done)out[cue.key-1]={tap:colors.safe,avoid:colors.blocked,double:colors.portal,hold:colors.bonus,neighbor:colors.purple}[cue.type];}
      else if(v==='potatoInput')out[g.signal-1]=g.green?colors.safe:colors.blocked;
      else if(v==='directionPreview'||v==='directionInput')for(const n of baseDirections)out[n-1]=palette[n-1];
      else if(v==='decoderWatch'&&g.bit!=null)out[(g.signalKey||2)-1]=g.bit?colors.bonus:colors.portal;
      else if(v==='snakeInput')for(const n of [2,4,5,6])out[n-1]=palette[n-1];
      else if(v==='pongInput')for(const n of [1,3])out[n-1]=palette[n-1];
      return out;
    }
    function pauseInputs(){holdToken++;if(s.game.held)s.game.held={};for(const c of s.game.cues||[])c.holding=false;}
    return {start,press,keyDown,keyUp,pauseInputs,needsHold,active,leds,fail,nextLevel,actionKey};
  }
  root.RemoraArcade={catalog,create,colors,keyColors:K,keyNames,directionBase:[2,3,5,1]};
})(typeof window==='undefined'?globalThis:window);
