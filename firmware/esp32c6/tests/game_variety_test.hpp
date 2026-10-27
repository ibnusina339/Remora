#pragma once
static void testGameVariety(){
 using namespace remora;
 for(int d=0;d<5;d++)for(int seed=1;seed<=40;seed++)for(int level:{1,2,3,16,17,18}){
  GameEngine e;e.start(3,d,seed*733);if(level!=1){e.s.level=level-1;e.nextLevel();}
  while(e.s.phase==Phase::MazePreview)e.advance(10);
  assert(e.s.mazeMission==level%3);if(e.s.mazeMission==2)assert(e.s.bonuses.size()>=3);
  for(int count=0;e.s.phase==Phase::MazeInput&&count<1000;count++)e.press(mazeInputKey(e.s));
  assert(e.s.phase==Phase::Clear);if(e.s.mazeMission==1)assert(e.s.mazeKeyTaken);
  if(d>=2||e.s.mazeMission==2)assert(e.s.collected.size()==e.s.bonuses.size());
  if(d>=2)assert(e.s.moves<=e.s.moveLimit);
 }
 for(int d=0;d<5;d++){
  GameEngine e;e.start(3,d);while(e.s.phase==Phase::MazePreview)e.advance(10);auto&s=e.s;
  assert(s.mapVisible==(d<2));int count=s.scanCharges;e.press(6);
  if(d<2){assert(s.scanCharges==0&&s.mapVisible);continue;}
  assert(s.scanCharges==count-1&&s.scanActive&&s.mapVisible);e.press(6);assert(s.scanCharges==count-1);
  e.advance(1399);assert(s.mapVisible);e.advance(1);assert(!s.mapVisible&&!s.scanActive&&s.phase==Phase::MazeInput);
 }
 {
  GameEngine e;e.start(3,2);while(e.s.phase==Phase::MazePreview)e.advance(10);auto&s=e.s;
  s.current=s.links[s.mazeGate][0];int old=s.current,delta=s.mazeGate-old,key=delta==-s.cols?2:delta==s.cols?5:delta==1?3:1;
  e.press(key);assert(s.current==old&&s.moves==0&&s.phase==Phase::MazeInput);s.mazeKeyTaken=true;e.press(key);assert(s.current==s.mazeGate);
 }
 {
  GameEngine e;e.start(9,0);e.s.level=2;e.nextLevel();auto&s=e.s;assert(s.goldenFood);s.body={s.cols+4};s.rocks.clear();s.dir=s.nextDir=3;s.food=s.body[0]+1;
  e.advance(s.tickMs);assert(s.score==90&&s.eaten==1&&s.body.size()==2&&s.phase==Phase::Snake);
 }
 {
  GameEngine e;e.start(9,0);e.s.level=2;e.nextLevel();auto&s=e.s;s.body={s.cols+4};s.rocks.clear();s.dir=s.nextDir=3;s.food=s.cols*3+4;
  e.advance(6500+s.tickMs);assert(!s.goldenFood&&s.score==0&&s.phase==Phase::Snake);
 }
 for(int d=0;d<5;d++){
  GameEngine e;e.start(10,d);auto&s=e.s;float target=s.milkTargetX,base=s.width;int lives=s.lives,goal=s.goal;
  s.bx=target;s.by=102;s.vx=0;s.vy=-4;e.advance(40);assert(s.score==20&&s.milkTargetX!=target&&s.paddleBoostUntil==s.now+5000);
  s.bx=s.milkTargetX;s.by=102;s.vy=-4;e.advance(40);assert(s.score==20&&s.width==base+8);
  s.bx=160;s.by=100;s.vx=s.vy=0;e.advance(5040);assert(s.width==base&&s.lives==lives&&s.goal==goal&&s.hits==0);
  s.bx=s.milkTargetX;s.by=100;s.vy=4;e.advance(40);assert(s.score==20);
 }
}
