#pragma once
#include <cstdint>
namespace remora {
struct RatingPromptPolicy {
 bool enabled=true;uint32_t completed=0,lastPromptGame=0;int64_t lastPromptAt=-1;
 bool eligible(int score,int clears,bool record,bool rated,bool asked,bool developer,int64_t now)const{
  const bool meaningful=clears>=2||score>=600||(record&&clears>=1);
  return enabled&&!rated&&!asked&&!developer&&meaningful&&completed>=3&&(!lastPromptGame||completed-lastPromptGame>=6)&&(lastPromptAt<0||now-lastPromptAt>=600000);
 }
 void shown(int64_t now){lastPromptGame=completed;lastPromptAt=now;}
};
}
