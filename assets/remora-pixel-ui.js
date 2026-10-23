/* REMORA 320x240 renderer. Integer geometry, bitmap text and selected cow masks. */
(function (root) {
  'use strict';
  const F = {
    A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',
    C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',
    E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',
    G:'01111/10000/10000/10111/10001/10001/01111',H:'10001/10001/10001/11111/10001/10001/10001',
    I:'111/010/010/010/010/010/111',J:'00111/00010/00010/00010/10010/10010/01100',
    K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',
    M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/11001/10101/10011/10011/10001',
    O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',
    Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',
    S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',
    U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',
    W:'10001/10001/10001/10101/10101/10101/01010',X:'10001/10001/01010/00100/01010/10001/10001',
    Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111',
    '0':'01110/10001/10011/10101/11001/10001/01110','1':'010/110/010/010/010/010/111',
    '2':'01110/10001/00001/00010/00100/01000/11111','3':'11110/00001/00001/01110/00001/00001/11110',
    '4':'00010/00110/01010/10010/11111/00010/00010','5':'11111/10000/10000/11110/00001/00001/11110',
    '6':'01110/10000/10000/11110/10001/10001/01110','7':'11111/00001/00010/00100/01000/01000/01000',
    '8':'01110/10001/10001/01110/10001/10001/01110','9':'01110/10001/10001/01111/00001/00001/01110',
    ' ':'000/000/000/000/000/000/000','.':'0/0/0/0/0/1/1',':':'0/1/1/0/1/1/0',
    '-':'000/000/000/111/000/000/000','_':'00000/00000/00000/00000/00000/00000/11111',
    '/':'00001/00001/00010/00100/01000/10000/10000','%':'11001/11010/00010/00100/01000/01011/10011',
    '!':'1/1/1/1/1/0/1','?':'01110/10001/00001/00010/00100/00000/00100',
    '+':'00000/00100/00100/11111/00100/00100/00000','<':'0001/0010/0100/1000/0100/0010/0001',
    '>':'1000/0100/0010/0001/0010/0100/1000','=':'00000/00000/11111/00000/11111/00000/00000',
    '*':'00000/10101/01110/11111/01110/10101/00000',"'":'1/1/0/0/0/0/0'
  };
  Object.assign(F, {"a":"0000/0000/0110/0001/0111/1001/0111","b":"0000/1000/1000/1110/1001/1001/1110","c":"0000/0000/0111/1000/1000/1000/0111","d":"0000/0001/0001/0111/1001/1001/0111","e":"0000/0000/0110/1001/1111/1000/0111","f":"0000/0011/0100/1110/0100/0100/0100","g":"0000/0000/0111/1001/0111/0001/1110","h":"0000/1000/1000/1110/1001/1001/1001","i":"0000/0100/0000/1100/0100/0100/1110","j":"0000/0010/0000/0110/0010/1010/0100","k":"0000/1000/1000/1010/1100/1010/1001","l":"0000/1100/0100/0100/0100/0100/1110","m":"0000/0000/1101/1111/1001/1001/1001","n":"0000/0000/1110/1001/1001/1001/1001","o":"0000/0000/0110/1001/1001/1001/0110","p":"0000/0000/1110/1001/1110/1000/1000","q":"0000/0000/0111/1001/0111/0001/0001","r":"0000/0000/1011/1100/1000/1000/1000","s":"0000/0000/0111/1000/0110/0001/1110","t":"0000/0100/1110/0100/0100/0100/0011","u":"0000/0000/1001/1001/1001/1001/0111","v":"0000/0000/1001/1001/1001/0110/0110","w":"0000/0000/1001/1001/1111/1111/1001","x":"0000/0000/1001/0110/0110/0110/1001","y":"0000/0000/1001/1001/0111/0001/1110","z":"0000/0000/1111/0010/0100/1000/1111","\"":"0000/1001/1001/0000/0000/0000/0000","#":"0000/1001/1111/1001/1111/1001/1001","$":"0000/0110/1010/0110/0101/1100/0110","&":"0000/0100/1010/0100/1010/1001/0110","(":"0000/0010/0100/1000/1000/0100/0010",")":"0000/0100/0010/0001/0001/0010/0100",",":"0000/0000/0000/0000/0000/0100/1000",";":"0000/0000/0100/0000/0100/1000/0000","@":"0000/0110/1001/1101/1101/1000/0111","[":"0000/0110/0100/0100/0100/0100/0110","\\":"0000/1000/0100/0100/0010/0010/0001","]":"0000/0110/0010/0010/0010/0010/0110","^":"0000/0110/1001/0000/0000/0000/0000","`":"0000/0100/0010/0000/0000/0000/0000","{":"0000/0011/0100/1100/0100/0100/0011","|":"0000/0100/0100/0100/0100/0100/0100","}":"0000/1100/0010/0011/0010/0010/1100","~":"0000/0000/0110/1100/0000/0000/0000","✓":"0000/0000/0001/0001/1001/0110/0000","×":"0000/1001/0110/0110/1001/0000/0000"});
  const P={black:'#090b0d',bg:'#1c1711',panel:'#30261a',paper:'#f4ebd6',amber:'#ffbc68',dim:'#b39a78',line:'#68543c',green:'#8bdcad',red:'#ff797d',cyan:'#75d9e8',purple:'#c49bef',yellow:'#ffd76b',blue:'#79acfa'};
  const keys=root.RemoraArcade.keyColors, keyNames=root.RemoraArcade.keyNames, directionBase=root.RemoraArcade.directionBase;
  const games=[...root.RemoraArcade.catalog.map(g=>g.name),'SETTINGS'];
  const levels=['EASY','NORMAL','HARD','EXPERT','MASTER'];
  const difficultyNotes=['PELAN DAN SANTAI','TEMPO SEIMBANG','SPEED AKTIF','SPEED LEBIH CEPAT','SPEED MAKSIMAL'];
  function create(ctx, catalog) {
    let s, nav = [];
    let classicPreviewCycle=-1,classicPreviewKeys=[];
    let reversePreviewCycle=-1,reversePreviewKeys=[];
    const rect=(x,y,w,h,c=P.paper)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(0,Math.round(w)),Math.max(0,Math.round(h)));};
    function line(x0,y0,x1,y1,c=P.paper,width=1) {
      x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
      const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
      let err=dx+dy;
      for(;;){rect(x0,y0,width,width,c);if(x0===x1&&y0===y1)break;const e=err*2;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
    }
    function frame(x,y,w,h,c=P.line,t=1){rect(x,y,w,t,c);rect(x,y+h-t,w,t,c);rect(x,y,t,h,c);rect(x+w-t,y,t,h,c);}
    function poly(points,c){
      const min=Math.min(...points.map(p=>p[1])),max=Math.max(...points.map(p=>p[1]));
      for(let y=Math.ceil(min);y<max;y++){
        const xs=[];
        for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
        xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)rect(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,c);
      }
    }
    function text(str,x,y,scale=1,c=P.paper,align='left'){
      const letters=[...String(str)];
      const widths=letters.map(ch=>(F[ch]||F['?']).split('/')[0].length);
      const width=(widths.reduce((a,b)=>a+b+1,0)-1)*scale;
      if(align==='center')x-=Math.floor(width/2);else if(align==='right')x-=width;
      letters.forEach((ch,i)=>{const rows=(F[ch]||F['?']).split('/');rows.forEach((row,yy)=>[...row].forEach((p,xx)=>{if(p==='1')rect(x+xx*scale,y+yy*scale,scale,scale,c);}));x+=(widths[i]+1)*scale;});
    }
    function star(x,y,c=P.amber,k=1){rect(x+2*k,y, k,5*k,c);rect(x,y+2*k,5*k,k,c);}
    function ring(x,y,r,c=P.amber){let a=r,b=0,err=0;while(a>=b){[[a,b],[b,a],[-b,a],[-a,b],[-a,-b],[-b,-a],[b,-a],[a,-b]].forEach(([u,v])=>rect(x+u,y+v,1,1,c));b++;if(err<=0)err+=2*b+1;if(err>0){a--;err-=2*a+1;}}}
    function arrow(x,y,dir,c=P.amber,k=1){for(let i=0;i<6;i++)rect(x+(dir<0?5-i:i)*k,y+i*k,k,(11-i*2)*k,c);}
    const spriteRuns = new Map();
    function sprite(name,x,y,k=1){
      const asset=root.RemoraCowSprites[name];
      if(!asset)return;
      if(!spriteRuns.has(name)){
        const rows=asset.rows,mask=(xx,yy)=>yy>=0&&yy<asset.h&&xx>=0&&xx<asset.w&&rows[yy][xx]!=='.';
        const runs=[];
        for(let yy=-1;yy<=asset.h;yy++){
          let last=null,start=-1;
          for(let xx=-1;xx<=asset.w+1;xx++){
            let value=xx>=0&&xx<asset.w&&yy>=0&&yy<asset.h?rows[yy][xx]:'.';
            if(value==='.'&&xx<=asset.w&&[-1,0,1].some(dy=>[-1,0,1].some(dx=>mask(xx+dx,yy+dy))))value='+';
            if(xx===asset.w+1)value='.';
            if(value!==last){if(last&&last!=='.')runs.push([start,yy,xx-start,last]);start=xx;last=value;}
          }
        }
        spriteRuns.set(name,runs);
      }
      const animated=['home','modeSelect','pregame','chargeRequired','clear','gameover','reactionResult'].includes(s.view);
      for(const [xx,yy,w,value] of spriteRuns.get(name))rect(x+xx*k,y+yy*k,w*k,k,value==='#'?P.black:value==='o'?P.paper:P.dim);
      if(animated&&(s.animationTime||0)%4200>3950&&asset.eyes){for(const [ex,ey,ew,eh]of asset.eyes){rect(x+ex*k,y+ey*k,ew*k,eh*k,P.paper);rect(x+ex*k,y+(ey+Math.floor(eh/2))*k,ew*k,k,P.black);}}
    }
    function centeredSprite(name,cx,bottom,k=1){const a=root.RemoraCowSprites[name];sprite(name,Math.round(cx-a.w*k/2),bottom-a.h*k,k);}
    const catRuns=new Map();
    function catSprite(name,cx,bottom,mirror=false,scale=1){
      const a=root.RemoraCatSprites?.[name];if(!a)return;
      if(!catRuns.has(name)){
        const runs=[];
        a.rows.forEach((row,y)=>{let start=0;for(let x=1;x<=a.w;x++)if(row[x]!==row[start]){if(row[start]!=='.')runs.push([start,y,x-start,row[start]]);start=x;}});
        catRuns.set(name,runs);
      }
      const left=Math.round(cx-a.w*scale/2),top=bottom-a.h*scale;
      for(const [x,y,w,c]of catRuns.get(name)){
        const start=left+Math.round((mirror?a.w-x-w:x)*scale),l=Math.max(0,start),r=Math.min(320,start+Math.max(1,Math.round(w*scale)));
        if(r>l)rect(l,Math.round(top+y*scale),r-l,Math.max(1,Math.round(scale)),c==='#'?P.black:c==='g'?'#999999':'#ffffff');
      }
    }
    function cow(x,y,k=2,mood='calm',body=true,accessory=0){
      // Compatibility for ancillary pages: draw cropped masks, never the old polygon cow.
      const name=accessory?['happy','easy','normal','hard','expert','master'][accessory]:mood==='sleep'?'sad':mood==='hard'?'surprised':body?'sit':'happy';
      const asset=root.RemoraCowSprites[name],w=35*k,h=(body?44:30)*k;
      const scale=Math.min(w/asset.w,h/asset.h),outW=Math.round(asset.w*scale),outH=Math.round(asset.h*scale);
      // Nearest sampling into integer pixels also works at small auxiliary sizes.
      for(let yy=0;yy<outH;yy++)for(let xx=0;xx<outW;xx++){
        const v=asset.rows[Math.min(asset.h-1,Math.floor(yy/scale))][Math.min(asset.w-1,Math.floor(xx/scale))];
        if(v!=='.')rect(x+xx,y+yy,1,1,v==='#'?P.black:P.paper);
      }
    }
    function icon(name,x,y,c=P.amber,k=1){
      const patterns={
        sound:['00100000','01100100','11100010','11101010','11101010','11100010','01100100','00100000'],
        sun:['00010000','01000100','00111000','01111100','00111000','01000100','00010000','00000000'],
        theme:['00111100','01110010','11110001','11110001','11110001','11110001','01110010','00111100'],
        light:['01111110','11000011','10011001','10011001','11000011','01111110','00111100','00111100'],
        difficulty:['01000010','01100110','11111111','11000011','10100101','10000001','10111101','01111110'],
        battery:['11111110','10000011','10111011','10111011','10111011','10000011','11111110','00000000'],
        profile:['00111100','01111110','01111110','00111100','00011000','01111110','11111111','11111111'],
        wifi:['00111100','11000011','00000000','00111100','01000010','00000000','00011000','00011000'],
        system:['00011000','01011010','01111110','11100111','11100111','01111110','01011010','00011000'],
        stats:['11111111','10111101','10111101','01111110','00111100','00011000','00011000','00111100'],
        info:['00111100','01000010','10011001','10000001','10011001','10011001','01000010','00111100'],
        edit:['00000110','00001111','00011110','00111100','01111000','11110000','11100000','11000000']
      };
      (patterns[name]||patterns.system).forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==='1')rect(x+xx*k,y+yy*k,k,k,c);}));
    }
    function header(title='REMORA',extra=''){
      text(title,10,10,1,P.amber);if(extra)text(extra,160,10,1,P.dim,'center');
      const c=P.amber;
      text(s.batteryPercent+'%',278,10,1,P.paper,'right');frame(285,8,23,11,c);rect(309,11,2,5,c);
      rect(288,11,Math.round(17*s.batteryPercent/100),5,c);line(10,25,309,25,P.line);
    }
    function footer(labels,palette=keys){
      nav = labels;
      rect(0,208,320,32,P.bg);line(10,208,309,208,P.line);
      labels.forEach((label,i)=>{if(!label)return;const x=10+(i%3)*102,y=213+Math.floor(i/3)*14;rect(x,y,11,11,palette[i]);text(label,x+16,y+2,1,palette[i]);});
    }
    function miniCow(x,y,k=1){
      const rows=['.#......#.','.oo####oo.','##oooooo##','.oo#oo#oo.','.oooooooo.','..######..','..oooooo..','..o#oo#o..','..oooooo..','...####...'];
      rows.forEach((row,yy)=>[...row].forEach((p,xx)=>{if(p!=='.')rect(x+xx*k,y+yy*k,k,k,p==='#'?P.black:P.paper);}));
    }
    const cowWhite='#f5f5f2';
    function snakePatch(x,y,size,index){
      rect(x,y,size,size,cowWhite);
      const k=Math.max(1,Math.floor(size/5)),side=index%3;
      if(side===0){rect(x,y,3*k,2*k,P.black);rect(x+k,y+k,3*k,2*k,P.black);rect(x+size-2*k,y+size-2*k,2*k,2*k,P.black);}
      else if(side===1){rect(x+size-3*k,y,3*k,3*k,P.black);rect(x+size-4*k,y+k,2*k,2*k,P.black);rect(x,y+size-2*k,2*k,2*k,P.black);}
      else{rect(x,y+size-3*k,3*k,3*k,P.black);rect(x+k,y+size-4*k,2*k,2*k,P.black);rect(x+size-2*k,y,2*k,2*k,P.black);}
    }
    function snakeHead(x,y,k=1){
      const mask=['..#......#..','.#o#....#o#.','.#oo####oo#.','##oooooooo##','#oo#oooo#oo#','.#oooooooo#.','.#o#oooo#o#.','..########..','.#oooooooo#.','.#oo#oo#oo#.','..#oooooo#..','...######...'];
      mask.forEach((row,yy)=>[...row].forEach((p,xx)=>{if(p!=='.')rect(x+xx*k,y+yy*k,k,k,p==='#'?P.black:cowWhite);}));
    }
    const menuMasks=new Map();
    function menuMascot(name){
      if(!menuMasks.has(name)){
        const a=root.RemoraCowSprites[name],scale=Math.min(104/a.w,100/a.h),w=Math.round(a.w*scale),h=Math.round(a.h*scale),rows=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>a.rows[Math.min(a.h-1,Math.floor(y/scale))][Math.min(a.w-1,Math.floor(x/scale))]).join('')),runs=[];
        const solid=(x,y)=>y>=0&&y<h&&x>=0&&x<w&&rows[y][x]!=='.';
        for(let y=-1;y<=h;y++){let last='.',start=-1;for(let x=-1;x<=w+1;x++){let v=solid(x,y)?rows[y][x]:'.';if(v==='.'&&x<=w&&[-1,0,1].some(dy=>[-1,0,1].some(dx=>solid(x+dx,y+dy))))v='+';if(x===w+1)v='.';if(v!==last){if(last!=='.')runs.push([start,y,x-start,last]);start=x;last=v;}}}
        menuMasks.set(name,{w,h,runs});
      }
      const a=menuMasks.get(name),left=Math.round(250-a.w/2),top=196-a.h;
      a.runs.forEach(([x,y,w,v])=>rect(left+x,top+y,w,1,v==='#'?P.black:v==='o'?P.paper:P.dim));
    }
    function compass(x,y,dir,c=P.amber,k=2){
      const pts=[[-2,10],[-2,-1],[-7,-1],[0,-10],[7,-1],[2,-1],[2,10]];
      poly(pts.map(([u,v])=>{const rotated=[[u,v],[-v,u],[-u,-v],[v,-u]][dir%4];return [x+rotated[0]*k,y+rotated[1]*k];}),c);
    }
    function ground(){line(16,199,303,199,P.line);}
    function scene(which){
      const phase=Math.floor((s.animationTime||0)/350)%6;
      ground();
      if(which===0){
        const time=s.animationTime||0,cycle=Math.floor(time/2800),elapsed=time%2800;
        if(cycle!==classicPreviewCycle){
          const pool=[0,1,2,3,4,5];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
          let chosen=pool.slice(0,3+Math.floor(Math.random()*2));
          if(chosen.join(',')===classicPreviewKeys.join(','))chosen=chosen.map(n=>(n+1)%6);
          classicPreviewKeys=chosen;classicPreviewCycle=cycle;
        }
        const step=Math.floor(elapsed/450),active=step<classicPreviewKeys.length&&elapsed%450<320?classicPreviewKeys[step]:-1;
        rect(16,81,164,105,P.panel);frame(16,81,164,105,P.line,2);
        rect(23,88,150,15,P.amber);text('MEMORY SEQUENCE',98,92,1,P.black,'center');
        for(let i=0;i<6;i++){const x=28+i%3*47,y=112+Math.floor(i/3)*34;if(i===active)rect(x,y,39,27,keys[i]);else frame(x,y,39,27,P.amber);}
        centeredSprite('stand',250,196);
      }else if(which===1){
        const time=s.animationTime||0,cycle=Math.floor(time/2800),step=Math.floor(time/350)%8,reverse=step>=3;
        if(cycle!==reversePreviewCycle){
          const pool=[0,1,2,3,4,5];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
          let chosen=pool.slice(0,3);if(chosen.join(',')===reversePreviewKeys.join(','))chosen=chosen.map(n=>(n+1)%6);
          reversePreviewKeys=chosen;reversePreviewCycle=cycle;
        }
        rect(16,80,169,106,P.panel);
        reversePreviewKeys.forEach((n,i)=>{if(step===i)rect(48+i*44,91,15,21,keys[n]);});
        line(43,131,154,131,P.amber,2);arrow(reverse?29:148,121,reverse?-1:1,P.amber,2);
        reversePreviewKeys.slice().reverse().forEach((n,i)=>{if(step===i+4)rect(48+i*44,154,15,21,keys[n]);});
        centeredSprite('back',251,196);star(294,82);
      }else if(which===2){
        ring(94,135,50,P.line);ring(94,135,33,P.amber);ring(94,135,16,P.line);
        line(38,135,150,135,P.line);line(94,79,94,191,P.line);const radar=[[126,101],[140,131],[121,170],[65,167],[47,136],[67,98]][phase];line(94,135,...radar,P.amber,2);rect(radar[0]-3,radar[1],6,6,P.amber);
        text('GO!',153,166,2,P.amber);centeredSprite('alert',254,196);star(192,81);
      }else if(which===3){
        rect(20,83,163,108,P.panel);frame(20,83,163,108,P.paper,2);
        for(const [a,b,c,d]of [[44,83,44,109],[69,108,118,108],[94,83,94,108],[143,83,143,158],[20,134,69,134],[69,134,69,159],[94,134,119,134],[119,134,119,182],[44,158,44,191],[44,182,94,182],[143,158,183,158]])line(a,b,c,d,P.paper,2);
        text('G',163,174,1,P.green);text('P',51,167,1,P.blue);star(153,123,P.yellow);
        const route=[[32,96],[57,96],[57,121],[82,121],[82,146],[107,146],[107,170],[132,170],[132,184],[163,184]],point=route[Math.floor((s.animationTime||0)/350)%route.length];
        rect(point[0]-3,point[1]-3,7,7,P.amber);
        centeredSprite('graze',250,196);
      }else if(which===4){
        for(let i=0;i<6;i++){const x=26+i%3*49,y=92+Math.floor(i/3)*50,c=[P.green,P.red,P.blue,P.yellow,P.purple,P.green][i];rect(x,y,39,36,P.panel);frame(x,y,39,36,c);if(i===phase)rect(x+5,y+5,29,26,c);}
        centeredSprite('jump',250,196);
      }else if(which===5){
        const points=[[60,89],[115,89],[154,130],[115,174],[60,174],[24,130]];
        points.forEach(([x,y],i)=>{ring(x,y,11,keys[i]);if(i===phase)rect(x-7,y-7,15,15,keys[i]);});
        poly([[75,109],[108,109],[122,121],[120,146],[105,159],[77,155],[64,142],[65,125]],P.amber);text('HOT',94,129,1,P.black,'center');
        centeredSprite('run',250,196);
      }else if(which===6){
        compass(96,132,phase%4,P.amber,3);ring(96,132,51,P.line);text('ROTATE',96,188,1,P.dim,'center');centeredSprite('roll',252,196);
      }else if(which===7){
        rect(19,89,163,89,P.panel);for(let i=0;i<6;i++){const x=27+i%3*50,y=99+Math.floor(i/3)*35;frame(x,y,40,27,i===phase?P.purple:P.line);if(i===phase)text('?',x+20,y+7,2,P.purple,'center');}
        centeredSprite('peek',249,196);
      }else if(which===8){
        rect(18,85,165,105,P.panel);for(let i=0;i<4;i++){const lit=i===phase%4;frame(25+i*38,94,33,38,lit?P.amber:P.line);text([1,0,1,1][i],41+i*38,102,3,lit?P.amber:P.paper,'center');}
        arrow(96,142,1,P.amber);text('11',117,140,3,P.amber);text('BINARY > DECIMAL',101,173,1,P.dim,'center');centeredSprite('listen',249,196);
      }else if(which===9){
        rect(16,81,164,105,P.panel);frame(16,81,164,105,P.line,2);const path=[[40,103],[52,103],[64,103],[76,103],[76,115],[76,127],[88,127],[100,127],[112,127],[124,127]];
        path.forEach(([x,y],i)=>snakePatch(x,y,12,i));snakeHead(134,121,2);
        for(const [x,y]of [[151,100],[40,158],[151,165]]){line(x,y+8,x-3,y+3,P.green);line(x,y+8,x,y,P.green);line(x,y+8,x+4,y+2,P.green);}
        centeredSprite('sit',250,196);
      }else if(which===10){
        rect(16,81,164,105,P.panel);
        poly([[39,78],[150,78],[163,90],[163,179],[153,191],[35,191],[25,179],[25,90]],P.line);
        rect(31,87,126,84,P.amber);rect(157,91,5,79,P.dim);
        rect(39,84,110,14,P.black);text('MOO PONG',94,88,1,P.paper,'center');
        rect(37,101,115,65,P.bg);frame(37,101,115,65,P.paper,2);
        for(let y=107;y<160;y+=9)rect(94,y,1,4,P.line);
        const bx=[57,75,94,113,134,112][phase],by=[116,124,132,141,148,140][phase],leftY=phase<3?110:139,rightY=phase<3?137:111;
        rect(44,leftY,5,18,P.paper);rect(44,leftY+5,5,5,P.black);rect(140,rightY,5,18,P.paper);rect(140,rightY+9,5,4,P.black);
        rect(bx-5,by-2,2,2,P.dim);rect(bx,by,5,5,P.paper);rect(bx+2,by+1,1,2,P.black);
        poly([[31,168],[157,168],[166,183],[22,183]],P.amber);line(25,183,163,183,P.paper);
        rect(50,169,3,9,P.black);rect(47,165,9,6,P.paper);rect(50,165,3,3,P.black);ring(120,176,4,P.cyan);ring(137,176,4,P.purple);
        rect(35,187,118,5,P.line);rect(37,192,12,4,P.black);rect(139,192,12,4,P.black);menuMascot('expert');
      }else{
        centeredSprite('drink',74,196);rect(15,198,289,3,P.amber);
        rect(160,84,140,104,P.panel);frame(160,84,140,104,P.line,2);
        for(let i=0;i<3;i++){icon(['sound','sun','theme'][i],172,99+i*29,P.amber,2);line(199,106+i*29,286,106+i*29,P.line,2);rect(209+i*22,101+i*29,7,12,P.paper);}
      }
    }
    function carousel(){
      const i=s.modeSelection;header();
      text(games[i],160,39,3,P.paper,'center');scene(i);
      footer(['PREV',i<catalog.length?'INFO':null,'NEXT',null,null,i<catalog.length?'PLAY':'OPEN']);
    }
    function record(){const key=catalog[s.modeSelection]?.mode+':'+s.difficulty;return s.records[key];}
    function pregame(){
      const i=s.modeSelection,r=record(),reaction=catalog[i].mode==='reaction';header('READY TO PLAY',games[i]);
      text(games[i],14,39,2,P.paper);text('DIFFICULTY',14,68,1,P.dim);
      rect(11,83,182,59,P.panel);frame(11,83,182,59,P.amber,2);arrow(21,102,-1,s.difficulty>0?P.purple:P.line);arrow(173,102,1,s.difficulty<4?P.yellow:P.line);
      text(levels[s.difficulty],103,94,2,P.amber,'center');
      for(let n=0;n<5;n++)rect(66+n*15,120,10,5,n<=s.difficulty?P.amber:P.line);
      centeredSprite(['easy','normal','hard','expert','master'][s.difficulty],251,154);
      const notes={classic:['PELAN DAN SANTAI','TEMPO SEIMBANG','POLA BARU + SPEED','6 LANGKAH + SPEED','8 LANGKAH + SPEED'],reverse:['REVERSE SANTAI','REVERSE NORMAL','POLA BARU + SPEED','REVERSE + CERMIN','CERMIN + SPEED'],reaction:['SATU SINYAL','SATU SINYAL','3 GO + JEBAKAN','5 GO + CERMIN','7 GO + SEBELAH'],maze:['PETA 6 X 4','PETA 7 X 5 + PORTAL','8 X 5 + KABUT','9 X 6 + MEMORI','14 X 9 + DUA BONUS'],whack:['HIJAU / MERAH','LIMA WARNA','2 ISYARAT BERSAMA','2 ISYARAT + KIRI','3 ISYARAT + KIRI'],potato:['PUTARAN SANTAI','GANTI ARAH','BALIK DI TENGAH','TARGET JEBAKAN','JEBAKAN + TURBO'],direction:['WARNA TETAP','ROTASI WARNA','INGAT WARNA','WARNA + CERMIN','RANGKAIAN WARNA'],missing:['SATU CELAH','SATU CELAH','DUA CELAH','TIGA CELAH','3 CELAH + REVERSE'],decoder:['4 BIT / 0-15','4 BIT / 0-15','5 BIT / 0-31','6 BIT + INVERT','7 BIT + INVERT + LSB']};
      notes.snake=['RUMPUT SANTAI','ULAR NORMAL','PAGAR + BATU','ULAR CEPAT','PADANG EKSTREM'];notes.pong=['LAWAN PREDIKTIF','RALLY CEPAT','PAPAN 40 PIKSEL','PAPAN 34 PIKSEL','SATU NYAWA + TURBO'];
      const note=notes[catalog[i].mode][s.difficulty];
      text(note,103,150,1,P.dim,'center');
      line(13,167,306,167,P.line);icon('stats',14,179,P.amber,2);text(reaction?'BEST REACTION':'TOP SCORE',39,177,1,P.dim);
      text(r==null?'--':String(r),300,179,2,P.paper,'right');text(reaction?'MS / LEBIH KECIL LEBIH BAIK':'REKOR PADA DIFFICULTY INI',39,193,1,P.dim);
      footer([s.difficulty>0?'EASIER':null,null,s.difficulty<4?'HARDER':null,'BACK',null,'START']);
    }
    function info(){
      header('GAME GUIDE');text(games[s.modeSelection],27,36,2,P.paper);
      const lines=[];for(const source of catalog[s.modeSelection].guide){let row='';for(const word of source.split(' ')){if((row+' '+word).trim().length>23){lines.push(row);row=word;}else row=(row+' '+word).trim();}if(row)lines.push(row);lines.push('');}
      if(lines.at(-1)==='')lines.pop();
      const perPage=7;s.guidePages=Math.max(1,Math.ceil(lines.length/perPage));const page=Math.max(0,Math.min(s.guidePages-1,s.guidePage||0));
      rect(11,59,298,142,P.panel);lines.slice(page*perPage,(page+1)*perPage).forEach((v,i)=>text(v,20,66+i*19,2,P.paper));
      if(s.modeSelection===s.peekInfoGame){const right=s.peekInfoSide==='right',a=root.RemoraCatSprites.peek;catSprite('peek',right?300+a.w/2:20-a.w/2,56,right);}
      footer([page>0?'PREV':null,null,page<s.guidePages-1?'NEXT':null,'BACK',null,'PLAY']);
    }
    function list(title,items,index,icons){
      header(title);
      const first=Math.min(Math.max(0,index-1),Math.max(0,items.length-4));
      items.slice(first,first+4).forEach((item,r)=>{
        const j=first+r,y=39+r*40,selected=j===index,c=selected?P.black:P.paper;
        if(selected){rect(9,y+3,296,32,P.amber);rect(13,y,288,38,P.amber);}else {rect(13,y+3,288,32,P.panel);line(15,y+37,297,y+37,P.line);}
        icon(icons?.[j]||'system',19,y+10,c,2);text(item,47,y+11,2,c);
        if(selected)arrow(288,y+12,1,P.black);
      });
      for(let y=39;y<196;y+=4)rect(313,y,1,2,P.line);rect(312,39+Math.round(index/Math.max(1,items.length-1)*139),3,16,P.paper);
      footer([null,'UP',null,'BACK','DOWN','SELECT']);
    }
    function detail(title,value,note,symbol='system',labels=['LESS',null,'MORE','BACK',null,'SAVE']){
      header('SETTINGS',title);icon(symbol,146,43,P.amber,3);text(title,160,81,2,P.dim,'center');text(value,160,116,String(value).length>12?2:3,P.paper,'center');text(note,160,166,1,P.dim,'center');footer(labels);
      if(title==='THEME')catSprite('roll',275,198);
    }
    function battery(){
      header('BATTERY');const c=P.amber;
      rect(19,68,157,65,P.panel);frame(19,68,157,65,c,3);rect(177,87,8,27,c);
      for(let i=0;i<5;i++)rect(27+i*28,76,23,49,s.batteryPercent>i*20?c:P.line);
      centeredSprite('sit',254,152);
      text(s.batteryPercent+'%',98,155,3,c,'center');text(s.batteryVoltage.toFixed(2)+' V',255,167,2,c,'center');
      text(s.charging?'SEDANG MENGISI DAYA':s.batteryPercent<=15?'ISI DAYA SEGERA':'DAYA SIAP UNTUK BERMAIN',160,190,1,P.dim,'center');footer([null,null,null,'BACK']);
    }
    function chargeRequired(){
      const c=P.amber;
      frame(35,80,88,53,c,3);rect(124,96,7,21,c);
      if(s.charging)poly([[84,87],[68,108],[79,108],[73,128],[94,101],[84,101]],c);
      else {line(64,93,96,121,c,5);line(64,121,96,93,c,5);}
      centeredSprite('sleep',223,150);
      text(s.charging?'CHARGING':'CHARGE BATTERY',160,170,2,c,'center');
    }
    function pads(annotations=[]){
      const led=s.gameLEDs||[],g=s.game||{};
      for(let i=0;i<6;i++){
        const x=22+i%3*94,y=76+Math.floor(i/3)*48,c=led[i],lit=c&&c!=='transparent';
        frame(x,y,88,40,lit?c:P.line,2);if(lit)rect(x+4,y+4,80,32,c);
        if(annotations[i])text(annotations[i],x+44,y+29,1,lit?P.black:P.paper,'center');
      }
    }
    function gameStatus(note=''){
      text('LV '+s.level,13,177,1,P.dim);text('SCORE '+s.score,307,177,1,P.paper,'right');
      if(s.challengeStage)text('TAHAP '+s.challengeStage,153,177,1,P.amber,'center');
      if(s.speedDeadline&&s.speedWindow){
        const remaining=Math.max(0,s.speedDeadline-(s.animationTime||0)),fraction=Math.min(1,remaining/s.speedWindow),urgent=fraction<.25;
        frame(13,193,294,9,P.line);rect(15,195,Math.round(290*fraction),5,urgent?P.red:P.amber);
        rect(138,194,44,7,P.bg);text((Math.ceil(remaining/100)/10).toFixed(1)+'s',160,194,1,urgent?P.red:P.paper,'center');
      }else if(note)text(note,160,195,1,P.dim,'center');
      const bottom=s.mode==='whack'?((s.effectiveDifficulty??s.difficulty)<2?'YELLOW HOLD / BLUE DOUBLE':''):s.mode==='potato'?(s.game.hits||0)+' / '+(s.game.total||1)+' SAFE CATCHES':s.mode==='decoder'?(s.view==='decoderInput'?'':(s.game.invert?'HIGH=0 LOW=1':'HIGH=1 LOW=0')+(s.game.lsb?' / LSB':' / MSB')):s.mode==='maze'?'':'TAHAN KIRI BAWAH 2S: KELUAR';
      text(bottom,160,223,1,P.dim,'center');
    }
    function feedbackText(message,y){
      const width=str=>[...str].reduce((total,ch)=>total+(F[ch]||F['?']).split('/')[0].length+1,0)*2;
      if(width(message)<=296){text(message,160,y,2,P.paper,'center');return;}
      const lines=[''];for(const word of message.split(' ')){const last=lines.length-1,candidate=lines[last]?lines[last]+' '+word:word;if(width(candidate)>296&&lines[last])lines.push(word);else lines[last]=candidate;}
      lines.slice(0,2).forEach((value,i)=>text(value,160,y-6+i*18,2,P.paper,'center'));
    }
    function gameplay(){
      const entry=catalog.find(g=>g.mode===s.mode),v=s.view,g=s.game||{},difficulty=s.effectiveDifficulty??s.difficulty,gameKeys=s.keyPalette||keys;
      header(entry?.name||'REMORA',levels[difficulty]);
      if(['gameover','reactionResult','wrong','clear'].includes(v)){
        const good=v==='clear'||v==='reactionResult'&&s.result==='GREAT!';
        text(v==='gameover'?'GAME OVER':v==='clear'?'LEVEL CLEAR':good?'GREAT!':'COBA LAGI',160,41,2,good?P.green:P.amber,'center');
      if(v==='gameover'){rect(16,60,288,15,P.panel);text(s.failureReason||'',160,64,1,P.amber,'center');}
        cow(125,79,2,good||s.feedbackTier>=2?'happy':'sleep',false,good?1:s.feedbackTier===4?5:s.feedbackTier===3?3:0);
        text(v==='reactionResult'?s.elapsed+' MS':'SCORE '+s.score,160,142,2,P.amber,'center');
        feedbackText(s.message||'MOO, COBA LAGI!',170);text(s.endMessage||'',160,197,1,P.dim,'center');
        if(v==='gameover'||v==='reactionResult')footer([null,null,null,'MENU',null,v==='reactionResult'?'NEXT':'RETRY']);return;
      }
      if(['snake','pong'].includes(s.mode)){
        if(s.mode==='snake'){
          text('RUMPUT '+g.eaten+' / '+g.goal,160,29,1,P.green,'center');frame(28,41,264,132,P.line);
          g.rocks.forEach(n=>{const x=30+n%g.cols*10,y=42+Math.floor(n/g.cols)*10;rect(x+1,y+1,8,8,P.dim);rect(x+3,y,3,2,P.paper);});
          g.body.slice(1).forEach((n,i)=>{const x=30+n%g.cols*10,y=42+Math.floor(n/g.cols)*10;snakePatch(x,y,10,i);});
          snakeHead(29+g.body[0]%g.cols*10,41+Math.floor(g.body[0]/g.cols)*10);
          const x=35+g.food%g.cols*10,y=43+Math.floor(g.food/g.cols)*10;line(x,y+7,x-3,y+2,P.green);line(x,y+7,x,y,P.green);line(x,y+7,x+3,y+2,P.green);
          gameStatus();footer(['LEFT','UP','RIGHT',null,'DOWN'],gameKeys);
        }else{
          text('POIN '+g.hits+'/'+g.goal,17,28,1,P.paper);text('NYAWA '+g.lives,303,28,1,P.paper,'right');frame(16,38,288,132,P.line);
          for(let x=22;x<298;x+=12)rect(x,101,5,1,P.line);
          rect(g.aiX-(g.aiWidth||48)/2,42,g.aiWidth||48,6,P.paper);rect(g.aiX-15,42,8,6,P.black);rect(g.aiX+10,42,5,6,P.black);
          rect(g.playerX-g.width/2,153,g.width,7,P.paper);rect(g.playerX-10,153,8,7,P.black);rect(g.playerX+9,153,5,7,P.black);
          rect(g.ball.x-3,g.ball.y-3,6,6,P.paper);rect(g.ball.x-1,g.ball.y-2,2,2,P.black);miniCow(24,126);
          gameStatus();footer(['LEFT',null,'RIGHT'],gameKeys);
        }
        return;
      }
      if(v.startsWith('reaction')){
        const go=v==='reactionGo',fake=v==='reactionFake';text(go||fake?'GO!':'WAIT...',160,46,4,go?P.green:fake?P.red:P.amber,'center');
        cow(23,105,2,go?'hard':'sleep',false,go?4:0);
        if(go||fake)rect(196,103,25,35,gameKeys[s.target-1]);else text('...',208,103,5,P.paper,'center');
        const hint=fake?'JANGAN TEKAN':!go?'TUNGGU GO HIJAU':difficulty===4?'TOMBOL SEBELAH':difficulty===3?'TOMBOL CERMIN':'TEKAN WARNA TARGET';
        text(hint,207,155,1,P.dim,'center');
        text((g.hits||0)+' / '+(g.required||1)+' GO',160,166,1,P.paper,'center');gameStatus();return;
      }
      if(s.mode==='maze'){
        const master=difficulty===4;
        text(v==='mazePreview'?'INGAT PETA':'CARI GOAL',160,master?33:40,master?1:2,P.amber,'center');
        const cellW=Math.floor(276/g.cols),cellH=Math.floor((master?120:106)/g.rows),left=Math.floor((320-g.cols*cellW)/2),top=master?44:58;
        if(v==='mazeInput')nav=['LEFT','UP','RIGHT',null,'DOWN',null];
        const known=n=>g.mapVisible||g.visited.includes(n)||n===g.current||g.links[g.current].includes(n);
        for(let n=0;n<g.cols*g.rows;n++){
          const x=left+n%g.cols*cellW,y=top+Math.floor(n/g.cols)*cellH,visible=known(n),visited=g.visited.includes(n);
          rect(x+1,y+1,cellW-1,cellH-1,visited?P.panel:visible?P.bg:P.black);
          if(!visible){rect(x+Math.floor(cellW/2),y+Math.floor(cellH/2),1,1,P.line);continue;}
          const wall=P.paper;
          if(!g.links[n].includes(n-g.cols))line(x,y,x+cellW,y,wall);
          if(n%g.cols===g.cols-1||!g.links[n].includes(n+1))line(x+cellW,y,x+cellW,y+cellH,wall);
          if(!g.links[n].includes(n+g.cols))line(x,y+cellH,x+cellW,y+cellH,wall);
          if(n%g.cols===0||!g.links[n].includes(n-1))line(x,y,x,y+cellH,wall);
          const label=n===g.goal?'G':g.portal&&!g.portalUsed&&(n===g.portal.from||n===g.portal.to)?'P':g.bonuses.includes(n)&&!g.collectedBonuses.includes(n)?'*':n===g.start?'S':'';
          if(label)text(label,x+Math.floor(cellW/2),y+Math.floor((cellH-7)/2),1,label==='P'?P.blue:label==='*'?P.yellow:P.green,'center');
        }
        const px=left+g.current%g.cols*cellW,py=top+Math.floor(g.current/g.cols)*cellH;
        rect(px+3,py+3,cellW-5,cellH-5,P.amber);rect(px+Math.floor(cellW/2)-1,py+Math.floor(cellH/2)-1,3,3,P.black);
        text(g.cols+' X '+g.rows+' / '+(g.mapVisible?'MAP':'FOG'),160,168,1,P.dim,'center');
        gameStatus(g.bumped?'DINDING! COBA ARAH LAIN':'S START / G GOAL / P PORTAL / * BONUS');
        if(difficulty>=2)text('BONUS '+g.collectedBonuses.length+'/'+g.bonuses.length+' / MOVES '+g.moves+'/'+g.moveLimit,160,208,1,P.dim,'center');
        rect(0,220,320,20,P.bg);for(const [i,x,label]of [[0,10,'LEFT'],[1,85,'UP'],[2,157,'RIGHT'],[4,246,'DOWN']]){const c=s.gameLEDs?.[i]&&s.gameLEDs[i]!=='transparent'?s.gameLEDs[i]:gameKeys[i];rect(x,223,10,10,c);text(label,x+14,224,1,c);}
        return;
      }
      if(s.mode==='whack'){
        text('WAVE '+(g.wave||1)+' / '+(g.total||1),160,42,2,P.amber,'center');
        const labels=Array(6).fill('');if(difficulty<2)for(const c of g.cues||[])labels[c.key-1]=c.done?'OK':{tap:'TAP',avoid:'NO TAP',double:c.taps?'TAP AGAIN':'DOUBLE',hold:c.holding?'HOLD...':'HOLD',neighbor:g.purpleDir<0?'LEFT':'RIGHT'}[c.type];
        pads(labels);gameStatus();return;
      }
      if(s.mode==='potato'){
        text('TARGET',101,42,2,P.amber);rect(183,42,10,14,gameKeys[(g.target||1)-1]);text(g.dir<0?'<':'>',204,42,2,P.amber);const labels=Array(6).fill('');labels[(g.target||1)-1]='TARGET';pads(labels);
        gameStatus();return;
      }
      if(s.mode==='direction'){
        const dir=g.chain?.[g.chainIndex||0]||0;
        text('ROTATE '+(g.rotation||0)*90+(g.mirror?' + MIRROR':''),160,43,2,P.amber,'center');
        if(difficulty===4&&v==='directionPreview'){
          const columns=g.chain.length>3?2:1;g.chain?.forEach((direction,i)=>compass(columns===1?85:48+i%2*67,83+Math.floor(i/columns)*29,direction,P.paper,1));
        }
        else if(difficulty===4)text('?',86,94,5,P.paper,'center');
        else compass(85,117,dir,P.paper,3);
        if(v==='directionPreview'||difficulty<2){
          for(let d=0;d<4;d++){const x=173+d%2*61,y=80+Math.floor(d/2)*40;frame(x,y,52,33,P.line);compass(x+14,y+16,d,P.amber,1);rect(x+34,y+10,10,14,gameKeys[(g.mapping?.[d]||directionBase[d])-1]);}
        }else text('MEMORY',239,112,1,P.dim,'center');
        text('STEP '+((g.chainIndex||0)+1)+' / '+(g.chain?.length||1),160,161,1,P.dim,'center');gameStatus();return;
      }
      if(s.mode==='missing'){
        text(v==='missingInput'?'APA YANG HILANG?':v==='missingReplay'?'CARI CELAHNYA':'INGAT POLA',160,42,2,P.amber,'center');pads();
        text(v==='missingInput'?(g.index||0)+' / '+(g.answers?.length||1)+' CELAH':g.gap?'?':(g.slot||0)+1+' / '+s.sequence.length,160,166,1,P.paper,'center');gameStatus();return;
      }
      if(s.mode==='decoder'){
        text(v==='decoderInput'?'DECODE ANGKANYA':'DENGAR / LIHAT',160,42,2,P.amber,'center');
        if(v==='decoderInput'){
          nav=['< DIGIT','HAPUS','DIGIT >','- ANGKA','OK','+ ANGKA'];
          text('DESIMAL 0-'+(2**g.bitCount-1),160,64,1,P.dim,'center');
          for(let i=0;i<3;i++){const x=91+i*48,selected=i===g.digitIndex;rect(x,80,42,49,selected?P.amber:P.panel);frame(x,80,42,49,selected?P.amber:P.line,2);text(g.digits[i],x+21,87,5,selected?P.black:P.paper,'center');if(selected)poly([[x+17,133],[x+25,133],[x+21,137]],P.amber);}
          text('JAWAB KODE '+(g.index+1)+' / '+g.answers.length,160,147,1,P.paper,'center');
          if(g.acceptedAt!=null&&(s.animationTime||0)-g.acceptedAt<900)text('KODE BENAR!',160,163,1,P.green,'center');
        }else {
          frame(89,74,142,76,g.bit==null?P.line:g.bit?P.yellow:P.blue,2);text(g.bit==null?'...':g.bit?'HIGH':'LOW',160,98,3,g.bit?P.yellow:P.blue,'center');
          const x=Math.floor((320-g.bitCount*24)/2);for(let i=0;i<g.bitCount;i++)rect(x+i*24,158,16,4,i===g.slot?P.paper:P.line);
          text('KODE '+(g.group+1)+' / '+g.answers.length+' / '+g.bitCount+' BIT',160,64,1,P.dim,'center');
        }
        gameStatus();
        if(v==='decoderInput')for(const [i,label]of nav.entries()){
          const x=14+i%3*103,y=207+Math.floor(i/3)*16;rect(x,y,9,9,gameKeys[i]);text(label,x+14,y+1,1,gameKeys[i]);
        }
        return;
      }
      text(v==='ready'?'GET READY':v==='watch'?'WATCH THE LIGHTS':'YOUR TURN',160,41,2,v==='input'?P.green:P.amber,'center');
      pads();gameStatus(s.mode==='reverse'?(g.mirror?'REVERSE + CERMIN POSISI':'ULANG DARI AKHIR KE AWAL'):(s.inputIndex||0)+' / '+s.sequence.length+' LANGKAH');
    }
    function draw(state){
      s=state;nav=[];
      const ocean=s.theme==='OCEAN';
      P.bg=ocean?'#101c26':'#1c1711';P.panel=ocean?'#1a2e3b':'#30261a';
      P.line=ocean?'#415f71':'#68543c';P.dim=ocean?'#9fb9ca':'#b39a78';P.amber=ocean?'#9dd3e8':'#ffbc68';
      ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;rect(0,0,320,240,s.power==='off'||s.power==='sleep'?'#000000':P.bg);
      if(s.power==='off'||s.power==='sleep'||s.power==='standby'){if(s.power==='standby')rect(0,0,320,240,'#000000');return;}
      if(s.power==='shutdown'){header('REMORA');centeredSprite('sleep',160,155);catSprite('sleep',269,155);text('SAMPAI MOO-LAGI!',160,175,2,P.paper,'center');return;}
      if(s.power==='boot')return;
      const v=s.view;
      if(v==='powerNotice'){
        header('REMORA');const low=s.noticeKind==='lowNotice',lock=s.noticeKind==='chargeNotice';
        if(low){chargeRequired();text('PULIH MINIMAL 10%',160,192,1,P.dim,'center');return;}
        text(low?'BATERAI RENDAH':lock?'CABUT USB':'USB TERHUBUNG',160,42,2,P.amber,'center');
        text(s.batteryPercent+'%',160,100,5,P.paper,'center');
        text(low?'PULIH MINIMAL 10%':lock?'GAME TERKUNCI 80%':'ESTIMASI BATERAI',160,163,2,P.dim,'center');
        text(s.noticeKind==='batteryPeek'?'STANDBY SETELAH 5 DETIK':'KEMBALI STANDBY',160,191,1,P.dim,'center');
      }
      else if(v==='chargeRequired')chargeRequired();
      else if(v==='secretCat'){
        header('REMORA','RAHASIA');text('MEOW... BUKAN MOO!',160,33,1,P.paper,'center');
        catSprite('secretStand',160,196);
        footer([null,null,null,'BACK',null,'MEOW']);
      }
      else if(v==='home'||v==='modeSelect')carousel();
      else if(v==='pregame')pregame();
      else if(v==='gameInfo')info();
      else if(v==='settings')list('SETTINGS',['SOUND','DISPLAY','THEME','KEY LIGHT','BATTERY','PROFILES','NETWORK','SYSTEM','STATS','FIRST LOGIN'],s.selection,['sound','sun','theme','light','battery','profile','wifi','system','stats']);
      else if(v==='profiles')list('PROFILES / 5 SLOTS',s.profiles.map((p,i)=>p?(i===s.activeProfile?'> ':'')+p.playerName:'+ ADD PLAYER'),s.profileSelection);
      else if(v==='profileAction')list('PLAYER',['SWITCH USER','EDIT NAME','DELETE USER'],s.profileAction);
      else if(v==='deleteProfile')detail('HAPUS PEMAIN?',s.profiles[s.profileTarget]?.playerName||'','REKOR PEMAIN INI AKAN DIHAPUS','profile',[null,null,null,'BATAL',null,'HAPUS']);
      else if(v==='firstLoginConfirm')detail('FIRST LOGIN','PEMAIN BARU','PROFIL LAMA TETAP TERSIMPAN','profile',[null,null,null,'BATAL',null,'YA']);
      else if(v==='slotsFull')detail('SLOT PENUH','5 / 5 PEMAIN','HAPUS SATU PROFIL DAHULU','profile',[null,null,null,'BATAL',null,'PROFILES']);
      else if(v==='firstLoginCountdown')detail('FIRST LOGIN',Math.max(0,3-Math.floor((s.animationTime-s.firstLoginAt)/1000)),'TERSIMPAN / REMORA AKAN MATI','profile',[]);
      else if(v==='network')list('NETWORK',['SETUP WIFI','OTA UPDATE','WIFI STATUS','FORGET WIFI'],s.networkSelection,['wifi','system','wifi','wifi']);
      else if(v==='system')list('SYSTEM',['DIAGNOSTICS','BUTTON TEST','LED TEST','SPEAKER TEST','DISPLAY TEST'],s.systemSelection,['system','light','light','sound','sun']);
      else if(v==='wifiMethod')list('WIFI SETUP',['TYPE MANUALLY','PHONE SETUP'],s.methodSelection,['edit','wifi']);
      else if(v==='battery')battery();
      else if(v==='sound'){
        header('SOUND MIXER');
        const rows=[['UTAMA',s.masterVolume??70],['BGM MENU',s.bgmVolume??35],['SFX',s.sfxVolume??75]];
        rows.forEach(([label,value],i)=>{const y=37+i*51,selected=i===(s.soundSelection||0);rect(11,y,298,45,P.panel);if(selected)frame(11,y,298,45,P.amber,2);text(label,22,y+8,1,selected?P.amber:P.paper);text(value+'%',298,y+8,1,P.paper,'right');frame(22,y+25,276,9,P.line);rect(24,y+27,Math.round(272*value/100),5,selected?P.amber:P.dim);});
        footer(['VOL -','UP','VOL +','BACK','DOWN','BACK']);
      }
      else if(v==='display'){
        header('DISPLAY');
        text('KECERAHAN',15,46,2,s.displaySelection===0?P.amber:P.paper);text(s.display+'%',302,72,3,P.paper,'right');
        text('SPI CLOCK',15,114,2,s.displaySelection===1?P.amber:P.paper);text(s.spiMHz+' MHZ',302,140,3,P.paper,'right');
        text(s.spiTrial?'KONFIRMASI '+s.spiRemaining+'S / AUTO 10 MHZ':'FPS DIUKUR PADA PERANGKAT',160,187,1,P.dim,'center');
        footer(s.spiTrial?[null,null,null,'RESET',null,'STABIL']:['LESS','UP','MORE','BACK','DOWN',null]);
      }
      else if(['leds','theme'].includes(v)){
        const titles={sound:'SOUND',display:'DISPLAY',leds:'KEY LIGHT',theme:'THEME'},symbols={sound:'sound',display:'sun',leds:'light',theme:'theme'};
        const value=v==='sound'?(s.sound?'ON':'OFF'):v==='display'?s.display+'%':v==='leds'?s.leds+'%':s.theme;
        detail(titles[v],value,'',symbols[v]);
      }else if(v==='profile'){
        header('PROFILE');catSprite('groom',160,111);text(s.playerName||'PLAYER',160,122,3,P.paper,'center');text('ID '+s.playerId.slice(-8),160,162,1,P.dim,'center');footer([null,null,null,'BACK',null,'EDIT']);
      }else if(v==='stats'){
        header('ACHIEVEMENTS');catSprite('happy',257,87);
        [['GAMES',s.games],['BEST SCORE',s.best],['REACTION',s.bestReaction==null?'--':s.bestReaction+' MS']].forEach(([a,b],i)=>{text(a,15,57+i*49,1,P.dim);text(b,304,74+i*49,2,P.paper,'right');line(15,96+i*49,304,96+i*49,P.line);});footer([null,null,null,'BACK']);
      }else if(v==='nameEditor'){
        header(s.namePurpose==='first'?'WELCOME TO REMORA':'EDIT PROFILE');cow(132,37,1,'happy',false);text('SIAPA NAMAMU?',160,83,2,P.paper,'center');
        s.nameChars.forEach((ch,i)=>{const x=17+i*42;frame(x,118,35,36,i===s.nameCursor?P.amber:P.line,2);text(ch||'_',x+17,129,2,i===s.nameCursor?P.amber:P.paper,'center');});
        text(s.nameError||'IKUTI WARNA TOMBOL DI BAWAH',160,181,1,s.nameError?P.red:P.dim,'center');footer(['LEFT','PREV','RIGHT','DELETE','NEXT','SAVE']);
      }else if(v==='textEntry'){
        header(s.textKind==='ssid'?'WIFI NAME':'WIFI PASSWORD');text('GROUP '+['ABC','abc','123','SYM'][s.textGroup],15,49,2,P.amber);
        frame(12,85,296,37,P.line);const value=s.textKind==='password'&&!s.showPassword?'*'.repeat(s.textBuffer.length):s.textBuffer;text(value.slice(-24)||'_',20,98,1,P.paper);
        text('CHAR: '+s.textCurrentChar,15,139,2,P.paper);text(s.textError||'TAHAN HIJAU: SELESAI',15,174,1,s.textError?P.red:P.dim);if(s.textKind==='password')text('TAHAN MERAH: SHOW / HIDE',15,192,1,P.dim);footer(['GROUP-','PREV','GROUP+','DELETE','NEXT','ADD']);
      }else if(v==='diagnostics'){
        header('DIAGNOSTICS');const rows=[['FW','PIXEL 1.0'],['PLAYER',s.playerName],['BATTERY',s.batteryPercent+'%'],['VOLTAGE',s.batteryVoltage.toFixed(2)+'V'],['FREE HEAP','SIM'],['UPTIME',Math.floor((performance.now()-s.bootStartedAt)/1000)+'S'],['WIFI',s.wifiPower],['RSSI','--'],['DEVICE ID',s.playerId.slice(-6)],['GAMES',s.games],['INPUTS',s.totalCorrect]];
        rows.slice(s.diagnosticsOffset,s.diagnosticsOffset+6).forEach(([a,b],i)=>{text(a,15,43+i*26,1,P.dim);text(b,304,43+i*26,1,P.paper,'right');});footer([null,'UP',null,'BACK','DOWN']);
      }else if(v==='displayTest'){
        header('DISPLAY TEST','320 X 240');[P.red,P.amber,P.green,P.cyan,P.blue,P.purple].forEach((c,i)=>rect(12+i*50,49,46,112,c));text('NATIVE PIXELS / NO SMOOTHING',160,183,1,P.paper,'center');footer([null,null,null,'BACK']);
      }else if(v==='buttonTest'||v==='speakerTest'){
        header(v==='buttonTest'?'BUTTON TEST':'SPEAKER TEST');for(let i=0;i<6;i++){const x=48+i%3*78,y=55+Math.floor(i/3)*61;frame(x,y,66,48,keys[i],2);if(s.testKey===i+1)rect(x+4,y+4,58,40,keys[i]);}text('TAHAN KIRI BAWAH UNTUK KEMBALI',160,212,1,P.dim,'center');
      }else if(v==='ledTest'){detail('LED TEST',['RED','GREEN','BLUE','WHITE'][s.ledTestColor],'LIHAT KEENAM TOMBOL','light',[null,null,null,'BACK']);}
      else if(v==='phoneSetup'){
        header('PHONE SETUP');text('HUBUNGKAN PONSEL KE:',15,48,1,P.dim);text('REMORA-'+s.playerId.slice(-4),15,71,2,P.amber);text('PASS: '+s.portalAPPassword,15,108,1,P.paper);text('OPEN 192.168.4.1',15,137,2,P.paper);text('FORM DEMO ADA DI BAWAH KONSOL',15,184,1,P.dim);footer([null,null,null,'BACK']);
      }else if(['wifiNotSet','wifiConfirm','wifiConnecting','wifiResult','wifiStatus','forgetWifi','networkDemo'].includes(v)){
        const details={wifiNotSet:['WIFI','WIFI NOT SET','SETUP WIFI?', 'SETUP'],wifiConfirm:['CONNECT WIFI',s.manualSSID.slice(-18),'SIMULATED CONNECTION','CONNECT'],wifiConnecting:['WIFI','CONNECTING...','SIMULATION',null],wifiResult:['WIFI',s.networkError?'FAILED':'CONNECTED',s.networkError||s.wifiSSID,'RETRY'],wifiStatus:['WIFI STATUS',s.wifiPower==='off'?'WIFI OFF':'WIFI ON',s.wifiSSID||'NO NETWORK',null],forgetWifi:['FORGET WIFI','HAPUS JARINGAN?',s.wifiSSID||'NONE','CONFIRM'],networkDemo:[s.networkOperation,'NETWORK DEMO','NO SERVER CONNECTED',null]};
        const [a,b,c,d]=details[v];
        const busy=v==='wifiConnecting'||(v==='wifiResult'&&!s.networkError);
        detail(a,b,c,'wifi',busy?[]:[null,null,v==='wifiResult'&&s.networkError?'EDIT':null,v==='wifiConfirm'?'EDIT':'BACK',null,d]);
      }else gameplay();
      if(s.tutorialStep>=0){
        const message=root.RemoraTutorial.message(s.tutorialStep,s.playerName),shown=s.tutorialReveal?message.length:Math.max(0,Math.floor((s.animationTime-s.tutorialStartedAt)/30));
        frame(8,108,304,96,P.amber,2);rect(10,110,300,92,P.panel);rect(15,98,54,15,P.panel);frame(15,98,54,15,P.amber);text('MEOW',24,102,1,P.paper);
        const cat=root.RemoraCatSprites.sit;catSprite('sit',40,184,false,48/cat.w);
        const rows=[];let row='';for(const word of message.slice(0,shown).split(' ')){if((row+' '+word).trim().length>19){rows.push(row);row=word;}else row=(row+' '+word).trim();}rows.push(row);
        rows.slice(0,4).forEach((v,i)=>text(v,77,121+i*18,2,P.paper));footer([null,s.tutorialStep===1?'INFO':null,s.tutorialStep===3?'HARDER':null,null,null,'NEXT']);
      }
      if(s.exitHolding&&(s.animationTime||0)-s.exitHoldStarted>=900){
        const progress=Math.min(1,((s.animationTime||0)-s.exitHoldStarted)/2000);
        rect(34,91,252,50,P.panel);frame(34,91,252,50,P.red,2);text('TAHAN KIRI BAWAH 2S: KELUAR',160,103,1,P.paper,'center');
        frame(45,121,230,9,P.line);rect(47,123,Math.round(226*progress),5,P.red);
      }
    }
    return {draw,rect,text,cow,sprite,footer,keys,labels:()=>nav.slice(),navigationColors:()=>keys.map((color,i)=>nav[i]?color:'transparent')};
  }
  root.RemoraPixelUI={create,palette:P,font:F};
})(typeof window==='undefined'?globalThis:window);
