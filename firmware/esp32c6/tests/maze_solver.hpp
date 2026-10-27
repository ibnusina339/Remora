#pragma once
#include "game_engine.hpp"
#include <cassert>
static int mazeInputKey(const remora::GameState&s){
 bool key=s.mazeKey>=0&&!s.mazeKeyTaken;int target=key?s.mazeKey:s.goal;
 if(!key&&(s.difficulty>=2||s.mazeMission==2))for(int n:s.bonuses)if(!remora::has(s.collected,n)){target=n;break;}
 struct Node{int cell;bool used;int first;};std::vector<Node>queue={{s.current,s.portalUsed,0}};
 std::vector<bool>seen(s.links.size()*2);seen[s.current*2+s.portalUsed]=true;
 for(size_t i=0;i<queue.size();i++){
  auto current=queue[i];if(current.cell==target&&current.first)return current.first;
  for(int next:s.links[current.cell]){
   if(key&&(next==s.mazeGate||next==s.portalFrom))continue;
   int delta=next-current.cell,first=current.first?current.first:delta==-s.cols?2:delta==s.cols?5:delta==1?3:1;
   bool jump=!current.used&&next==s.portalFrom,used=current.used||jump;int cell=jump?s.portalTo:next;
   if(!seen[cell*2+used]){seen[cell*2+used]=true;queue.push_back({cell,used,first});}
  }
 }
 assert(false&&"Maze objective unreachable");return 1;
}
