#pragma once
#include <array>
#include <algorithm>
#include <cstdint>
namespace remora {
inline constexpr std::array<int,7> AutoOffIntervals={0,1,2,5,10,15,30};
inline int validAutoOff(int minutes){return std::find(AutoOffIntervals.begin(),AutoOffIntervals.end(),minutes)!=AutoOffIntervals.end()?minutes:5;}
class IdlePolicy {
 int64_t last_=-1;
public:
 void touch(int64_t now){last_=now;}
 bool due(int64_t now,int minutes,bool active){
  if(!active||last_<0){touch(now);return false;}
  minutes=validAutoOff(minutes);
  return minutes>0&&now-last_>=int64_t(minutes)*60000;
 }
};
}
