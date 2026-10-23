/* Original hand-built pixel cat. Geometry is authored here, with no image input. */
(function(root){
  'use strict';
  const width=36,height=38,pixelSize=4,grid=Array.from({length:height},()=>Array(width).fill('.'));
  function span(y,left,right,value='w'){for(let x=left;x<=right;x++)if(x>=0&&x<width&&y>=0&&y<height)grid[y][x]=value;}
  function box(x,y,w,h,value='w'){for(let row=y;row<y+h;row++)span(row,x,x+w-1,value);}
  function polygon(points){
    for(let y=0;y<height;y++){
      const intersections=[];
      for(let i=0;i<points.length;i++){const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];if((ay<=y+.5&&by>y+.5)||(by<=y+.5&&ay>y+.5))intersections.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));}
      intersections.sort((a,b)=>a-b);for(let i=0;i<intersections.length;i+=2)span(y,Math.ceil(intersections[i]-.5),Math.floor(intersections[i+1]-.5));
    }
  }
  // Upright ears, broad round head and plump sitting body.
  polygon([[7,13],[8,8],[10,3],[12,5],[14,10]]);
  polygon([[19,10],[22,3],[24,5],[26,12]]);
  [[8,11,22],[9,9,24],[10,8,25],[11,8,25],[12,7,26],[13,7,26],[14,7,26],[15,7,26],[16,8,25],[17,8,25],[18,9,24],[19,9,24]].forEach(([y,l,r])=>span(y,l,r));
  [[20,9,24],[21,9,24],[22,9,24],[23,8,24],[24,8,24],[25,8,24],[26,8,24],[27,8,24],[28,8,24],[29,8,24],[30,8,24],[31,9,24],[32,9,23],[33,10,23],[34,11,22],[35,12,14],[35,18,21]].forEach(([y,l,r])=>span(y,l,r));
  // Curled tail and two pairs of straight white whiskers.
  polygon([[23,29],[27,29],[29,27],[29,24],[28,24],[28,23],[30,21],[32,23],[33,26],[33,29],[32,31],[30,33],[25,34],[23,32]]);
  span(14,3,8);span(17,3,8);span(14,25,30);span(17,25,30);
  // One native pixel of black outline, with no antialiasing.
  const silhouette=grid.map(row=>row.slice());
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(silhouette[y][x]==='.'&&[-1,0,1].some(dy=>[-1,0,1].some(dx=>silhouette[y+dy]?.[x+dx]==='w')))grid[y][x]='b';
  // Three forehead stripes and square, neutral eyes.
  box(12,8,2,3,'g');box(16,8,2,2,'g');box(20,8,2,3,'g');
  box(11,12,3,3,'e');box(21,12,3,3,'e');
  const palette=['#000000','#ffffff','#999999','#202020'],indices={b:0,w:1,g:2,e:3},runs=[];
  grid.forEach((row,y)=>{let start=0;for(let x=1;x<=width;x++)if(x===width||row[x]!==row[start]){if(row[start]!=='.')runs.push([start*pixelSize,y*pixelSize,(x-start)*pixelSize,indices[row[start]]]);start=x;}});
  root.RemoraSecretCat={w:width*pixelSize,h:height*pixelSize,pixelSize,palette,runs,construction:'hand-built'};
})(typeof window==='undefined'?globalThis:window);
