#include "game_engine.hpp"
namespace remora {
std::vector<int>GameEngine::neighbors(int n)const{int x=n%s.cols,y=n/s.cols;std::vector<int>a;if(y>0)a.push_back(n-s.cols);if(x<s.cols-1)a.push_back(n+1);if(y<s.rows-1)a.push_back(n+s.cols);if(x>0)a.push_back(n-1);return a;}
int GameEngine::mazeTarget(int n)const{int offset=n==1?-1:n==2?-s.cols:n==3?1:n==5?s.cols:0;if(!offset)return -1;int t=s.current+offset;return has(neighbors(s.current),t)?t:-1;}
void GameEngine::maze(){
 bool master=s.difficulty==4;int d=s.difficulty,growth=stage();
 s.cols=std::min(master?18:12,(int[]){6,7,8,9,14}[d]+(growth+1)/2);s.rows=std::min(master?12:7,(int[]){4,5,5,6,9}[d]+growth/2);
 int size=s.cols*s.rows;s.start=rnd(size);s.current=s.start;s.links.resize(size);
 std::vector<int>parent(size,-1),depth(size),stack={s.start},seen={s.start};
 while(!stack.empty()){
  int cell=stack.back(),next=-1;auto choices=neighbors(cell);shuffle(choices);
  for(int n:choices)if(!has(seen,n)){next=n;break;}
  if(next<0){stack.pop_back();continue;}
  s.links[cell].push_back(next);s.links[next].push_back(cell);parent[next]=cell;depth[next]=depth[cell]+1;seen.push_back(next);stack.push_back(next);
 }
 s.goal=int(std::max_element(depth.begin(),depth.end())-depth.begin());
 for(int n=s.goal;n!=-1;n=parent[n])s.path.insert(s.path.begin(),n);
 int len=s.path.size(),portalIndex=d>=1?len/3:len/2;
 if(d>=1){s.portalFrom=s.path[portalIndex];s.portalTo=s.path[len*2/3];}
 s.mazeMission=s.level%3; // Key hunt, milk harvest, then a straightforward expedition.
 int keyDetour=0;
 if(s.mazeMission==1){
  std::vector<std::pair<int,int>>choices;
  for(int i=1;i<portalIndex;i++)for(int branch:s.links[s.path[i]])if(!has(s.path,branch)){
   choices.push_back({branch,2});
   for(int leaf:s.links[branch])if(!has(s.path,leaf)&&leaf!=s.path[i])choices.push_back({leaf,4});
  }
  if(!choices.empty()){auto selected=choices[rnd(choices.size())];s.mazeKey=selected.first;keyDetour=selected.second;}
  else s.mazeKey=s.path[std::max(1,portalIndex/2)];
  s.mazeGate=s.path[len-2];
 }
 std::vector<int>reachable;
 for(int i=1;i<len-1;i++)if((d<1||i<portalIndex||i>=len*2/3)&&s.path[i]!=s.mazeKey&&s.path[i]!=s.mazeGate)reachable.push_back(s.path[i]);
 int count=master?std::min(4,2+extra()):1;
 if(s.mazeMission==2)count=std::max(count,3);
 count=std::min(count,int(reachable.size()));
 for(int i=0;i<count;i++)s.bonuses.push_back(reachable[(i+1)*reachable.size()/count-1]);
 int optimum=len-1-(d>=1?len*2/3-portalIndex:0)+keyDetour;
 s.moveLimit=optimum+std::max(0,(int[]){24,18,12,8,3}[d]-extra());
 s.visited={s.start};s.scanCharges=hard()?(master?1:2):0;
 s.stepWindow=hard()?std::max(master?450:700,int(std::lround((int[]){0,0,2600,1900,1000}[d]*pace()))):0;
 s.mapVisible=true;
 if(!hard()){s.phase=Phase::MazeInput;return;}
 s.phase=Phase::MazePreview;
 later((int[]){0,0,8000,6500,4000}[d],[this]{s.mapVisible=false;s.phase=Phase::MazeInput;deadline(s.stepWindow);});
}
void GameEngine::mazePress(int n){
 if(n==6){
  if(s.phase==Phase::MazeInput&&s.scanCharges>0&&!s.scanActive){
   --s.scanCharges;s.scanActive=true;s.mapVisible=true;s.scanUntil=s.now+1400;deadline(s.stepWindow+1400);
   if(sound){sound("portal");}later(1400,[this]{if(s.phase==Phase::MazeInput){s.mapVisible=false;s.scanActive=false;}});
  }
  return;
 }
 if(n!=1&&n!=2&&n!=3&&n!=5)return;
 int t=mazeTarget(n);
 if(t<0||!has(s.links[s.current],t)){if(hard())fail("MENABRAK DINDING");return;}
 if(s.mazeGate>=0&&t==s.mazeGate&&!s.mazeKeyTaken){s.reason="CARI KUNCI K DAHULU";if(sound)sound("warning");return;}
 s.reason.clear();s.current=t;++s.moves;if(sound)sound("step");
 if(hard()&&s.moves>s.moveLimit){fail("TERLALU BANYAK LANGKAH");return;}
 if(!has(s.visited,t)){s.visited.push_back(t);points(10);}
 if(t==s.mazeKey&&!s.mazeKeyTaken){s.mazeKeyTaken=true;points(35);if(sound)sound("bonus");}
 if(t==s.portalFrom&&!s.portalUsed){s.current=s.portalTo;s.portalUsed=true;points(15);if(sound)sound("portal");if(!has(s.visited,s.current))s.visited.push_back(s.current);}
 if(has(s.bonuses,s.current)&&!has(s.collected,s.current)){
  s.collected.push_back(s.current);points(s.mazeMission==2?25+15*int(s.collected.size()):40);if(sound)sound("bonus");
 }
 if(s.current==s.goal){
  if((hard()||s.mazeMission==2)&&s.collected.size()!=s.bonuses.size()){if(hard()){fail("BONUS BELUM DIAMBIL");return;}s.reason="MASIH ADA SUSU";deadline(s.stepWindow);return;}
  clear();
 }else deadline(s.stepWindow);
}
}
