// Solve objectives, including off-route keys and the one-use portal.
module.exports=function mazeKey(g,hard){
 const key=g.key??-1,gate=g.gate??-1,needKey=key>=0&&!g.keyTaken;
 const missing=(g.bonuses||[]).find(n=>!(g.collectedBonuses||[]).includes(n));
 const target=needKey?key:(hard||g.mission===2)&&missing!==undefined?missing:g.goal;
 const queue=[{cell:g.current,used:!!g.portalUsed,first:0}],seen=new Set([g.current+':'+!!g.portalUsed]);
 for(let i=0;i<queue.length;i++){
  const state=queue[i];if(state.cell===target&&state.first)return state.first;
  for(const neighbor of g.links[state.cell]){
   if(needKey&&(neighbor===gate||neighbor===g.portal?.from))continue;
   const delta=neighbor-state.cell,first=state.first||(delta===-g.cols?2:delta===g.cols?5:delta===1?3:1);
   const teleport=g.portal&&!state.used&&neighbor===g.portal.from,cell=teleport?g.portal.to:neighbor,used=state.used||teleport,id=cell+':'+used;
   if(!seen.has(id)){seen.add(id);queue.push({cell,used,first});}
  }
 }
 throw Error('Maze objective is unreachable');
};
