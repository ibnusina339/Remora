#include "power_policy.hpp"
#include "idle_policy.hpp"
#include "rating_prompt_test.hpp"
#include "semver.hpp"
#include "game_engine.hpp"
#include "maze_solver.hpp"
#include <cassert>
#include <iostream>
#include <cstring>
#include "game_variety_test.hpp"
using namespace remora;
static void solve(GameEngine&e){for(int tries=0;tries<100000;tries++){auto&s=e.s;if(s.phase==Phase::Clear||s.phase==Phase::ReactionResult)return;assert(s.phase!=Phase::Over);switch(s.phase){case Phase::Input:{int n=s.sequence[s.mode==1?s.sequence.size()-1-s.input:s.input];if(s.mirror)n=7-n;e.press(n);break;}case Phase::ReactionGo:{e.advance(150);int n=s.target;if(s.difficulty==3)n=7-n;if(s.difficulty==4)n+=(n-1)%3==2?-1:1;e.press(n);break;}case Phase::MazeInput:e.press(mazeInputKey(s));break;case Phase::Whack:{int round=s.round;for(size_t i=0;i<s.cues.size()&&s.round==round&&s.phase==Phase::Whack;i++){auto c=s.cues[i];if(c.done||c.type==1)continue;if(c.type==3)e.keyDown(c.target);else{e.press(c.target);if(c.type==2){e.advance(20);e.press(c.target);}}}e.advance(10);break;}case Phase::Potato:if(s.green)e.press(s.target);else e.advance(10);break;case Phase::DirectionInput:e.press(s.mapping[s.chain[s.chainIndex]]);break;case Phase::MissingInput:e.press(s.answers[s.index]);break;case Phase::DecoderInput:{int n=s.answers[s.index];for(int digit=2;digit>=0;digit--){int value=digit==2?n%10:digit==1?n/10%10:n/100;while(s.digits[s.digitIndex]!=value)e.press(2);if(digit)e.press(1);}e.press(6);break;}case Phase::Snake:s.food=s.body[0]+1;e.press(6);e.advance(s.tickMs);break;case Phase::Pong:s.bx=24;s.by=34;s.vx=0;s.vy=-3;e.advance(40);break;default:e.advance(10);break;}}assert(false);}
int main(){auto v=SemVer::parse("1.10.0"),old=SemVer::parse("1.9.9");assert(v.valid&&v.compare(old)>0);assert(!SemVer::parse("01.2.3").valid);assert(SemVer::parse("1.0.0-alpha.2").compare(SemVer::parse("1.0.0-alpha.10"))<0);assert(SemVer::parse("1.0.0+build").compare(SemVer::parse("1.0.0"))==0);PowerPolicy p;PowerInput i{false,50,0,false};assert(p.begin(0,i)==PowerPhase::Standby);i.keys=5;p.update(10,i);assert(p.update(2010,i)==PowerPhase::Play);i.usb=true;i.percent=80;assert(p.update(2020,i)==PowerPhase::ChargeNotice);assert(p.update(4020,i)==PowerPhase::Standby);for(int g=0;g<GameCount;g++)for(int d=0;d<5;d++){GameEngine e;e.start(g,d);solve(e);assert(e.s.score>0);}GameEngine decoder;std::vector<int>bits;decoder.sound=[&](const char*name){if(!std::strcmp(name,"high"))bits.push_back(1);else if(!std::strcmp(name,"low"))bits.push_back(0);};decoder.start(8,0,37);while(decoder.s.phase!=Phase::DecoderInput)decoder.advance(10);assert(bits.size()==4);int decoded=0;for(int bit:bits)decoded=decoded*2+bit;assert(decoded==decoder.s.answers[0]);

for(int d=0;d<5;d++)for(int dir:{1,2,3,5}){GameEngine e;e.start(9,d,37);auto&s=e.s;int head=dir==1?6*s.cols:dir==3?7*s.cols-1:dir==2?5:(s.rows-1)*s.cols+5;int expected=dir==1?7*s.cols-1:dir==3?6*s.cols:dir==2?(s.rows-1)*s.cols+5:5;s.body={head};s.rocks.clear();s.food=3*s.cols+10;s.dir=s.nextDir=dir;e.advance(s.tickMs);if(d<3){assert(s.phase==Phase::Snake);assert(s.body[0]==expected);}else assert(s.phase==Phase::Over);}
testRatingPrompts();
testGameVariety();
IdlePolicy idle;assert(!idle.due(0,5,true));assert(!idle.due(299999,5,true));assert(idle.due(300000,5,true));idle.touch(300000);assert(!idle.due(599999,5,true));assert(idle.due(600000,5,true));assert(!idle.due(900000,5,false));assert(!idle.due(900001,5,true));assert(!idle.due(99999999,0,true));assert(validAutoOff(-1)==5&&validAutoOff(0)==0);

std::cout<<"Native core: all 11 games x 5 presets, power policy and SemVer OK\n";}
