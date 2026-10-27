#pragma once
#include "board.hpp"
#include "ratings.hpp"
#include "power_policy.hpp"
#include <string>
namespace remora {
enum class View { Home,Pregame,Guide,Playing,Settings,Sound,Display,Profile,Name,Stats,Network,WifiScan,WifiMethod,Text,WifiStatus,Portal,Ota,System,Diagnostics,LedTest,SpeakerTest,DisplayTest,ButtonTest,Secret,Profiles,ProfileAction,ConfirmDelete,ConfirmFirst,SlotsFull,FirstCountdown,Boot,ConfirmShutdown,Shutdown,Notice,DevGate,RateMenu,RateGames,RatingStars,RatingSuggestions,RatingThanks,RateResults,RateArchive,RateReport,RateInvite,RatePromptSettings,AutoOff };
struct UiModel {
 Preferences* prefs=nullptr;GameEngine*engine=nullptr;View view=View::Home;
 PowerPhase power=PowerPhase::Standby;Battery battery;bool usb=false;
 int tutorial=-1;int64_t tutorialAt=0;bool tutorialReveal=false,tutorialDialog=true;
 int selection=0,game=0,guidePage=0,guidePages=1,displayRow=0,soundRow=0,testKey=0;
 int64_t now=0,animationStart=0,spiDeadline=0,exitStarted=-1;
 int peekGame=0,peekSide=0;std::string entry,entryTitle="PLAYER",status;int cursor=0,charIndex=0,charGroup=0;
 bool rateFromInvite=false;int rateInviteMode=0;int64_t rateInviteAt=0;bool developerUnlocked=false;int rateKind=-1,rateStep=0,rateTips=0,rateFilter=0,rateScroll=0;std::array<uint8_t,5>rateStars{};std::vector<RatingRecord>ratingRecords;std::vector<std::string>rateReportRows;
 bool password=false,showPassword=false,canCancelName=false,passwordRequired=false,wifiFromScan=false;std::array<uint32_t,6>nav{};
};
std::string tutorialMessage(int step,const std::string& name);
void uiInit();void uiDraw(UiModel&,bool force=false);void uiInvalidate();
}
