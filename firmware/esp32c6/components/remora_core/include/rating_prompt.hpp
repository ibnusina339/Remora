#pragma once
#include <cstdint>
#include <algorithm>
namespace remora {
// Performance is a reminder hint, never a claim about the player's identity.
struct RatingPlayStats {
 uint32_t games=0,lastAsk=0,changeAt=0;
 int difficulty=-1,baseline=0,recent=0;
 uint8_t baselineCount=0,recentCount=0;
 bool prompted=false;
 int64_t lastAskAt=-1; // Uptime only; never persisted across reboots.
 void observe(int modeDifficulty,int score) {
  ++games;
  if(modeDifficulty!=difficulty){difficulty=modeDifficulty;baseline=recent=0;baselineCount=recentCount=0;changeAt=0;}
  score=std::clamp(score,0,10000000);
  if(baselineCount<3){baseline+=score;++baselineCount;return;}
  recent+=score;
  if(++recentCount<3)return;
  int delta=baseline>recent?baseline-recent:recent-baseline;
  if(delta>=1800&&(recent>=2*baseline||baseline>=2*recent)){
   changeAt=games;baseline=recent;
  }else baseline=(baseline*3+recent)/4;
  recent=0;recentCount=0;
 }
 bool changed()const {return changeAt&&games>=changeAt&&games-changeAt<6;}
 bool ready(int64_t now)const {
  if(!prompted)return true;
  uint32_t gap=games>=lastAsk?games-lastAsk:0;
  const bool change=changed();
  return gap>=(change?6u:12u)&&(lastAskAt<0||now-lastAskAt>=(change?600000:1800000));
 }
 void shown(int64_t now){prompted=true;lastAsk=games;lastAskAt=now;changeAt=0;}
};
struct RatingPromptPolicy {
 bool enabled=true;uint32_t completed=0,lastPromptGame=0;int64_t lastPromptAt=-1;
 bool eligible(int score,int clears,bool record,bool developer,int64_t now,const RatingPlayStats& play)const {
  const bool meaningful=clears>=2||score>=600||(record&&clears>=1)||play.changed();
  return enabled&&!developer&&meaningful&&play.ready(now)&&completed>=3&&
   (!lastPromptGame||completed-lastPromptGame>=6)&&(lastPromptAt<0||now-lastPromptAt>=600000);
 }
 void shown(int64_t now){lastPromptGame=completed;lastPromptAt=now;}
};
}
