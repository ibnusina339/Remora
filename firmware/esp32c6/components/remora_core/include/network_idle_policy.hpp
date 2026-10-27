#pragma once
#include <cstdint>
namespace remora {
class NetworkIdlePolicy {
 enum class Context { Outside, Screen, Setup };
 int64_t last_=-1;bool active_=false;Context context_=Context::Outside;
public:
 void touch(int64_t now){last_=now;}
 bool due(int64_t now,bool radio,bool networkScreen,bool setupPortal,bool protectedOperation){
  auto context=setupPortal?Context::Setup:networkScreen?Context::Screen:Context::Outside;
  if(!radio){active_=false;last_=now;return false;}
  if(!active_||context!=context_||protectedOperation){active_=true;context_=context;last_=now;return false;}
  int64_t interval=context==Context::Setup?300000:context==Context::Screen?120000:30000;
  return last_>=0&&now-last_>=interval;
 }
};
}
