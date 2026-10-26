#pragma once
#include "board.hpp"
#include "power_policy.hpp"
#include <string>
namespace remora {
enum class View { Home,Pregame,Guide,Playing,Settings,Sound,Display,Profile,Name,Stats,Network,WifiScan,WifiMethod,Text,WifiStatus,Portal,Ota,System,Diagnostics,LedTest,SpeakerTest,DisplayTest,ButtonTest,Secret,Profiles,ProfileAction,ConfirmDelete,ConfirmFirst,SlotsFull,FirstCountdown,Boot,ConfirmShutdown,Shutdown,Notice };
struct UiModel {
 Preferences* prefs=nullptr;GameEngine*engine=nullptr;View view=View::Home;
 PowerPhase power=PowerPhase::Standby;Battery battery;bool usb=false;
 int tutorial=-1;int64_t tutorialAt=0;bool tutorialReveal=false,tutorialDialog=true;
 int selection=0,game=0,guidePage=0,guidePages=1,displayRow=0,soundRow=0,testKey=0;
 int64_t now=0,animationStart=0,spiDeadline=0,exitStarted=-1;
 int peekGame=0,peekSide=0;std::string entry,entryTitle="PLAYER",status;int cursor=0,charIndex=0,charGroup=0;
 bool password=false,showPassword=false,canCancelName=false,passwordRequired=false,wifiFromScan=false;std::array<uint32_t,6>nav{};
};
std::string tutorialMessage(int step,const std::string& name);
void uiInit();void uiDraw(UiModel&,bool force=false);void uiInvalidate();
}
