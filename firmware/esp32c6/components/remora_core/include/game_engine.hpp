#pragma once
#include <array>
#include <vector>
#include <string>
#include <functional>
#include <cstdint>
#include <algorithm>
#include <cmath>
namespace remora {
template<class T> inline bool has(const std::vector<T>&v,const T&n){return std::find(v.begin(),v.end(),n)!=v.end();}
constexpr int GameCount=11;
inline constexpr const char* GameNames[]={"CLASSIC","REVERSE","REACTION","LIGHT MAZE","WHACK-A-LIGHT","HOT POTATO","DIRECTION SHIFT","MISSING KEY","SIGNAL DECODER","SNAKE","PONG"};
inline constexpr const char* GameIds[]={"classic","reverse","reaction","maze","whack","potato","direction","missing","decoder","snake","pong"};
inline constexpr uint32_t KeyColors[]={0xc49bef,0x75d9e8,0xffd76b,0xff797d,0x79acfa,0x8bdcad};
enum class Phase { Ready,Watch,Input,Clear,Over,ReactionWait,ReactionGo,ReactionFake,ReactionResult,MazePreview,MazeInput,Whack,Potato,DirectionPreview,DirectionInput,MissingWatch,MissingReplay,MissingInput,DecoderWatch,DecoderInput,Snake,Pong };
struct Cue {int key=0,target=0,type=0,taps=0;bool done=false,holding=false;int64_t first=0;};
struct GameState {
 int mode=0,difficulty=1,level=0,score=0,clears=0,input=0,pulse=0,target=0;
 Phase phase=Phase::Ready;std::string message,reason,endMessage;int recordAtStart=-1;
 std::array<uint32_t,6> palette{};std::vector<int>sequence;
 int hits=0,required=0,total=0,round=0,index=0,slot=0,group=0,signal=1,dir=1,steps=0,rotation=0,chainIndex=0,purpleDir=1;
 bool mirror=false,fakeUsed=false,green=false,reversed=false,gap=false,invert=false,lsb=false;
 std::vector<int> times,chain,answers,gaps,order,recent;std::array<int,4>mapping{};
 int64_t now=0,deadline=0,window=0,reactionStart=0,answerWindow=0;int elapsed=0;
 int cols=0,rows=0,current=0,start=0,goal=0,portalFrom=-1,portalTo=-1,moves=0,moveLimit=0,stepWindow=0;
 bool mapVisible=true,portalUsed=false;std::vector<std::vector<int>>links;std::vector<int>path,visited,bonuses,collected;
 std::vector<Cue>cues;int bitCount=4,bit=-1,digitIndex=2,signalKey=2;std::array<int,3>digits{};
 std::vector<int>body,rocks;int food=0,nextDir=3,eaten=0,tickMs=200;
 float playerX=160,aiX=160,width=46,aiWidth=50,bx=160,by=82,vx=0,vy=0,baseSpeed=0,maxSpeed=0,aiSpeed=0,aiError=0,aiErrorRange=0,aiTarget=160;
 int lives=3,tick=0,rally=0,aiReaction=8;std::array<bool,7>held{};
};
class GameEngine {
 struct Timer{int64_t at;uint64_t order;std::function<void()>fn;};std::vector<Timer>timers_;uint64_t order_=0;uint32_t random_=37;std::array<int,GameCount>lastEnding_{{-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1}};
 void later(int,std::function<void()>);void cancel();void deadline(int);void points(int);void clear();void fail(const char*);int rnd(int);int key();float random();
 float pace()const;int stage()const;int extra()const;int burden()const;bool hard()const;std::vector<int>pattern(int,const std::vector<int>& previous={});void shuffle(std::vector<int>&);void refreshPalette();
 void memory();void memoryPress(int);void reaction();void reactionCue();void reactionPress(int);
 void maze();void mazePress(int);std::vector<int>neighbors(int)const;int mazeTarget(int)const;
 void whack();void whackWave();void whackComplete();void whackPress(int);int neighbor(int,int)const;
 void potato();void potatoRound();void potatoTick();void potatoPress(int);void direction();void directionCue();void directionPress(int);
 void missing();void missingPlayback(bool);void missingPress(int);void decoder();void decoderPress(int);
 void snake();void snakeFood();void snakePress(int);void snakeTick();void pong();void pongBall();void pongBounce(bool);void pongPress(int);void pongTick();
public:
 std::array<uint32_t,GameCount>winCounts{};
 GameState s;std::function<void(const char*)>sound;std::function<void(int,int,bool)>record;
 void start(int mode,int difficulty,uint32_t seed=37);void nextLevel();void advance(int milliseconds);void press(int);bool keyDown(int);void keyUp(int);
 std::array<uint32_t,6> leds()const;
 bool finished()const{return s.phase==Phase::Over||s.phase==Phase::ReactionResult;}
};
}
