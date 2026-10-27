#include "pixel_ui.hpp"
#include "board.hpp"
#include "power_policy.hpp"
#include "esp_timer.h"
#include "esp_random.h"
#include "esp_ota_ops.h"
#include "esp_app_desc.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <cstring>
namespace remora {
static IdlePolicy idle;static Preferences prefs;static GameEngine game;static UiModel ui;static PowerPolicy power;static View resumeView=View::Home;
static bool suspended=false,dirty=false,newName=false;static uint8_t stable=0,rawPrevious=0,consumed=0;static int64_t rawAt=0,exitAt=-1,repeatAt=0,skipAt=-1,saveAt=0,batteryAt=-1000,frameAt=0;static int repeatKey=0,secretTaps=0;static int64_t secretAt=0;static uint32_t errorsAtTrial=0;static int selectedProfile=0;static std::string pendingSsid;
static int pendingProfileSlot=-1;
static bool shutdownFrozen=false;static int64_t shutdownAt=-1;static View shutdownReturn=View::Home;
static int64_t now(){return esp_timer_get_time()/1000;}
static bool inNetworkUi(){return ui.view==View::Network||ui.view==View::WifiScan||ui.view==View::Portal||ui.view==View::Ota||(ui.view==View::Text&&ui.entryTitle=="WIFI PASSWORD")||(ui.view==View::WifiStatus&&(ui.entryTitle=="WIFI"||ui.entryTitle=="OTA"));}
static void persist(){save(prefs);dirty=false;saveAt=now();}
static void checkpoint(){if(ui.view==View::Playing){prefs.resumeMode=game.s.mode;prefs.resumeDifficulty=game.s.difficulty;prefs.resumeLevel=game.s.level;prefs.resumeScore=game.s.score;prefs.resumeClears=game.s.clears;}persist();}
static void tutorialStep(int step){ui.tutorial=step;ui.tutorialAt=now();ui.tutorialReveal=false;ui.tutorialDialog=true;if(step<=1||step==6)ui.view=View::Home;else if(step==2){ui.view=View::Guide;ui.guidePage=0;}else if(step==3||step==4)ui.view=View::Pregame;else ui.view=View::Settings;ui.game=0;ui.selection=0;}
static void finishTutorial(){ui.tutorial=-1;prefs.tutorialDone=true;prefs.firstLoginPending=false;persist();ui.view=View::Home;ui.game=0;}
static void home(){ui.rateInviteAt=0;ui.view=View::Home;exitAt=ui.exitStarted=-1;repeatKey=0;consumed|=stable;prefs.resumeMode=-1;}
static void nameEditor(bool fresh,bool cancellable=false){if(!fresh&&prefs.active==DeveloperSlot){ui.view=View::Profiles;return;}pendingProfileSlot=-1;ui.canCancelName=cancellable;newName=fresh;ui.view=View::Name;ui.entryTitle=fresh?"PEMAIN BARU":"EDIT NAME";ui.entry=fresh?"":prefs.player;ui.charGroup=0;ui.charIndex=0;}
static void cancelNameEditor(){if(ui.view!=View::Name||!ui.canCancelName)return;pendingProfileSlot=-1;ui.canCancelName=false;ui.entry.clear();newName=false;ui.view=View::Profiles;ui.selection=selectedProfile;}
static bool gameOverSeen=false;
static void startGame(){gameOverSeen=false;ui.rateInviteAt=0;networkStop();std::copy(std::begin(prefs.phraseCounters),std::end(prefs.phraseCounters),game.winCounts.begin());game.start(ui.game,prefs.difficulty[ui.game],esp_random());game.s.recordAtStart=prefs.records[ui.game][prefs.difficulty[ui.game]];ui.view=View::Playing;prefs.games++;prefs.resumeMode=-1;dirty=true;}
static void boot(){audioEffect("boot");lockDeveloper(prefs);ui.developerUnlocked=false;ui.view=View::Boot;ui.animationStart=now();int old=ui.peekGame;ui.peekGame=(old+1+esp_random()%(GameCount-1))%GameCount;ui.peekSide=esp_random()%2;}
static void clockReset(){prefs.spiMHz=10;prefs.spiPending=false;persist();displayStart(10);uiInvalidate();}
static void setPhase(PowerPhase phase){auto old=ui.power;if(old==phase)return;ui.power=phase;exitAt=ui.exitStarted=-1;repeatKey=0;if(phase==PowerPhase::Play){consumed|=stable;peripherals(true);if(displayStart(prefs.spiMHz)!=ESP_OK){prefs.spiMHz=10;prefs.spiPending=false;persist();ESP_ERROR_CHECK(displayStart(10));}uiInvalidate();if(suspended){ui.view=resumeView;suspended=false;game.s.held.fill(false);}else boot();}
 else if(phase==PowerPhase::Standby){otaCancel();networkStop();checkpoint();peripherals(false);}
 else if(phase==PowerPhase::Cutoff){checkpoint();otaCancel();networkStop();fullCutoff();}
 else{if(old==PowerPhase::Play){resumeView=ui.view;suspended=true;for(auto &c:game.s.cues)c.holding=false;game.s.held.fill(false);checkpoint();}otaCancel();peripherals(true);if(displayStart(10)!=ESP_OK){peripherals(false);return;}uiInvalidate();ui.view=View::Notice;}}
static void shutdownGesture(int64_t t){
 if(ui.view==View::ConfirmShutdown)return;
 bool eligible=ui.power==PowerPhase::Play&&ui.view!=View::Boot&&ui.view!=View::FirstCountdown&&ui.view!=View::Shutdown&&!otaStatus().busy;
 if(eligible&&stable==5){
  if(!shutdownFrozen){shutdownFrozen=true;shutdownReturn=ui.view;shutdownAt=t;consumed|=5;exitAt=ui.exitStarted=-1;repeatKey=0;game.s.held.fill(false);for(auto&c:game.s.cues)c.holding=false;}
  if(t-shutdownAt>=2000){checkpoint();ui.view=View::ConfirmShutdown;}
 }else if(shutdownFrozen){if(ui.tutorial>=0)ui.tutorialAt+=t-shutdownAt;shutdownFrozen=false;shutdownAt=-1;}
}
static int devTaps=0,resultTaps=0;static int64_t devTapAt=-2001,resultTapAt=-2001;
static bool developer(){return prefs.active==DeveloperSlot&&ui.developerUnlocked;}
static bool ratingInviteEligible(int64_t t){
 auto&s=game.s;bool record=s.recordAtStart>=0&&s.score>s.recordAtStart;
 if(!prefs.ratingPrompt.eligible(s.score,s.clears,record,developer(),t,prefs.ratingPlay[s.mode]))return false;
 return loadRatings().size()<RatingLimit;
}
static void ratingGameOverTick(int64_t t){
 if(ui.power!=PowerPhase::Play)return;
 if(ui.view==View::Playing&&game.s.phase==Phase::Over&&!gameOverSeen){
  gameOverSeen=true;prefs.ratingPrompt.completed++;
  prefs.ratingPlay[game.s.mode].observe(game.s.difficulty,game.s.score);
  if(ratingInviteEligible(t)){ui.rateInviteMode=game.s.mode;ui.rateInviteAt=t+2800;}
  dirty=true;
 }
 if(ui.rateInviteAt&&t>=ui.rateInviteAt){
  ui.rateInviteAt=0;
  if(ui.view==View::Playing&&game.s.phase==Phase::Over&&ratingInviteEligible(t)){
   prefs.ratingPlay[game.s.mode].shown(t);prefs.ratingPrompt.shown(t);persist();
   ui.view=View::RateInvite;audioEffect("invite");
  }
 }
}

static void ratingSave(){RatingRecord record;record.owner=prefs.id;record.name=prefs.player;record.game=ui.rateKind;record.stars=ui.rateStars;record.suggestions=ui.rateTips;if(saveRating(record)){if(record.game>=0)prefs.ratingPlay[record.game].shown(now());prefs.ratingPrompt.shown(now());persist();ui.status.clear();ui.view=View::RatingThanks;audioEffect("ratingSaved");}else ui.status="GAGAL SIMPAN / ARSIP PENUH";}
static void ratingStart(int kind,bool fromInvite=false){ui.rateFromInvite=fromInvite;ui.rateKind=kind;ui.rateStep=0;ui.rateStars.fill(0);ui.rateTips=0;ui.status.clear();ui.view=View::RatingStars;}
static bool ratingPress(int key){
 if(ui.view==View::DevGate){if(key==4)ui.view=View::Profiles;else if(key==3){devTaps=now()-devTapAt<2000?devTaps+1:1;devTapAt=now();if(devTaps==3){switchProfile(prefs,DeveloperSlot,true);ui.developerUnlocked=true;devTaps=0;home();}}else devTaps=0;return true;}
 if(ui.view<View::RateMenu||ui.view>View::RatePromptSettings){return false;}
 if((ui.view==View::RateResults||ui.view==View::RateArchive||ui.view==View::RateReport||ui.view==View::RatePromptSettings)&&!developer()){ui.view=View::Stats;return true;}
 ui.status.clear();audioEffect(key==4?"back":ui.view==View::RatingStars&&(key==1||key==3)?"star":key==6?"confirm":"move");
 switch(ui.view){
 case View::RatePromptSettings:if(key==1||key==3){prefs.ratingPrompt.enabled=key==3;ui.rateInviteAt=0;persist();}else if(key==4||key==6){ui.view=View::Settings;ui.selection=12;}break;
 case View::RateInvite:if(key==4){ui.view=View::Playing;ui.rateFromInvite=false;}else if(key==6)ratingStart(ui.rateInviteMode,true);break;
 case View::RateMenu:if(key==2||key==5)ui.selection=1-ui.selection;else if(key==4)home();else if(key==6){if(ui.selection==0){ui.view=View::RateGames;ui.selection=0;}else ratingStart(-1);}break;
 case View::RateGames:if(key==2||key==5)ui.selection=(ui.selection+(key==2?10:1))%11;else if(key==4){ui.view=View::RateMenu;ui.selection=0;}else if(key==6)ratingStart(ui.selection);break;
 case View::RatingStars:if(key==1||key==3)ui.rateStars[ui.rateStep]=std::clamp(int(ui.rateStars[ui.rateStep])+(key==1?-1:1),1,10);else if(key==4){if(ui.rateStep)ui.rateStep--;else if(ui.rateFromInvite){ui.view=View::Playing;ui.rateFromInvite=false;}else{ui.view=ui.rateKind<0?View::RateMenu:View::RateGames;ui.selection=ui.rateKind<0?1:ui.rateKind;}}else if(key==6){if(!ui.rateStars[ui.rateStep])ui.status="ISI MINIMAL SETENGAH BINTANG";else if(ui.rateKind>=0){ui.view=View::RatingSuggestions;ui.selection=0;}else if(ui.rateStep<4)ui.rateStep++;else ratingSave();}break;
 case View::RatingSuggestions:if(key==2||key==5)ui.selection=(ui.selection+(key==2?6:1))%7;else if(key==4)ui.view=View::RatingStars;else if(key==3)ratingSave();else if(key==6){int bit=1<<ui.selection;if(ui.rateTips&bit)ui.rateTips^=bit;else if(__builtin_popcount(ui.rateTips)<2)ui.rateTips|=bit;else ui.status="MAKSIMAL DUA SARAN";}break;
 case View::RatingThanks:if(key==4||key==6){ui.view=ui.rateFromInvite?View::Playing:View::RateMenu;ui.rateFromInvite=false;ui.selection=0;}break;
 case View::RateResults:if(key==2||key==5)ui.selection=1-ui.selection;else if(key==4)ui.view=View::Stats;else if(key==6){ui.rateFilter=ui.selection;ui.ratingRecords.clear();for(auto&r:loadRatings())if((r.game>=0)==(ui.rateFilter==0))ui.ratingRecords.push_back(r);ui.selection=0;ui.view=View::RateArchive;}break;
 case View::RateArchive:if(key==4){ui.view=View::RateResults;ui.selection=ui.rateFilter;}else if(!ui.ratingRecords.empty()){if(key==2||key==5)ui.selection=(ui.selection+(key==2?int(ui.ratingRecords.size())-1:1))%ui.ratingRecords.size();else if(key==6){ui.rateReportRows=ratingReport(ui.ratingRecords[ui.selection]);ui.rateScroll=0;ui.view=View::RateReport;}}break;
 case View::RateReport:if(key==4)ui.view=View::RateArchive;else if(key==2||key==5)ui.rateScroll=std::clamp(ui.rateScroll+(key==2?-1:1),0,std::max(0,int(ui.rateReportRows.size())-5));break;
 default:break;
 }
 if(!ui.status.empty())audioEffect("warning");
 return true;
}

static void press(int key){if(ui.power!=PowerPhase::Play)return;
 if(ui.view==View::ConfirmShutdown){if(key==4){ui.view=shutdownReturn;if(ui.tutorial>=0)ui.tutorialAt+=now()-shutdownAt;shutdownFrozen=false;shutdownAt=-1;}else if(key==6){ui.view=View::Shutdown;ui.animationStart=now();ui.tutorial=-1;shutdownFrozen=false;shutdownAt=-1;suspended=false;otaCancel();audioEffect("off");persist();}return;}
 if(shutdownFrozen){return;}
 if(ui.view==View::Boot||ui.view==View::FirstCountdown||ui.view==View::Shutdown)return;
 if(ui.tutorial>=0){if(ui.tutorialDialog){if(key!=6){if(!((ui.tutorial==1&&key==2)||(ui.tutorial==3&&key==3)||(ui.tutorial==2&&(key==1||key==3))))return;ui.tutorialDialog=false;}else{if(!ui.tutorialReveal&&now()-ui.tutorialAt<int64_t(tutorialMessage(ui.tutorial,prefs.player).size()*30)&&key==6){ui.tutorialReveal=true;return;}if(ui.tutorial>0&&ui.tutorial<6){ui.tutorialDialog=false;return;}}}if(ui.tutorial==0&&key==6)tutorialStep(1);else if(ui.tutorial==1&&key==2)tutorialStep(2);else if(ui.tutorial==2&&(key==1||key==3))ui.guidePage=std::clamp(ui.guidePage+(key==1?-1:1),0,ui.guidePages-1);else if(ui.tutorial==2&&key==6)tutorialStep(3);else if(ui.tutorial==3&&key==3){prefs.difficulty[0]=std::min(4,int(prefs.difficulty[0])+1);dirty=true;tutorialStep(4);}else if(ui.tutorial==4&&key==6)tutorialStep(5);else if(ui.tutorial==5&&(key==2||key==5))ui.selection=(ui.selection+(key==2?11:1))%12;else if(ui.tutorial==5&&key==6)tutorialStep(6);else if(ui.tutorial==6&&key==6)finishTutorial();return;}
 if(ratingPress(key))return;
 if(ui.view==View::Stats&&developer()){if(key==3){resultTaps=now()-resultTapAt<2000?resultTaps+1:1;resultTapAt=now();if(resultTaps==3){ui.view=View::RateResults;ui.selection=0;resultTaps=0;}return;}resultTaps=0;}
 audioEffect(key==4?"back":"move");
 switch(ui.view){
 case View::Home:if(key==1||key==3)ui.game=(ui.game+(key==1?GameCount+1:1))%(GameCount+2);else if(key==2&&ui.game<GameCount){ui.view=View::Guide;ui.guidePage=0;}else if(key==6){if(ui.game==GameCount){ui.view=View::RateMenu;ui.selection=0;}else if(ui.game==GameCount+1){ui.view=View::Settings;ui.selection=0;}else ui.view=View::Pregame;}else if(key==5){if(now()-secretAt>1500)secretTaps=0;secretAt=now();if(++secretTaps>=5){secretTaps=0;ui.view=View::Secret;}}else secretTaps=0;break;
 case View::Guide:if(key==1||key==3)ui.guidePage=std::clamp(ui.guidePage+(key==1?-1:1),0,ui.guidePages-1);else if(key==4)home();else if(key==6)ui.view=View::Pregame;break;
 case View::Pregame:if(key==1||key==3){prefs.difficulty[ui.game]=std::clamp(int(prefs.difficulty[ui.game])+(key==1?-1:1),0,4);dirty=true;}else if(key==4)home();else if(key==6)startGame();break;
 case View::Playing:if(game.finished()){if(key==4)home();else if(key==6){if(game.s.phase==Phase::ReactionResult)game.nextLevel();else startGame();}}else game.press(key);break;
 case View::Settings:if(key==2||key==5){int count=developer()?13:12;ui.selection=(ui.selection+(key==2?count-1:1))%count;}else if(key==4)home();else if(key==6){switch(ui.selection){case 0:ui.view=View::Sound;break;case 1:ui.view=View::Display;break;case 2:ui.view=View::WifiStatus;ui.entryTitle="THEME";ui.status=prefs.mono?"WHITE / BLACK":prefs.ocean?"OCEAN":"AMBER";break;case 3:ui.view=View::WifiStatus;ui.entryTitle="KEY LIGHT";ui.status=std::to_string(prefs.leds)+"%";break;case 4:ui.view=View::WifiStatus;ui.entryTitle="BATTERY";ui.status=std::to_string(ui.battery.percent)+"% / "+std::to_string(ui.battery.mv)+" MV";break;case 5:ui.view=View::Profiles;ui.selection=prefs.active;persist();break;case 6:ui.view=View::Network;ui.selection=0;ui.wifiFromScan=false;break;case 7:ui.view=View::System;ui.selection=0;break;case 8:ui.view=View::Stats;break;case 9:ui.view=View::ConfirmFirst;break;case 10:ui.view=View::AutoOff;break;case 11:ui.view=View::Shutdown;ui.animationStart=now();audioEffect("off");checkpoint();break;case 12:if(developer())ui.view=View::RatePromptSettings;break;}}break;
 case View::AutoOff:if(key==4||key==6){ui.view=View::Settings;ui.selection=10;persist();}else if(key==1||key==3){int i=std::find(AutoOffIntervals.begin(),AutoOffIntervals.end(),validAutoOff(prefs.autoOffMinutes))-AutoOffIntervals.begin();prefs.autoOffMinutes=AutoOffIntervals[std::clamp(i+(key==1?-1:1),0,6)];persist();}break;
 case View::Sound:if(key==4||key==6)ui.view=View::Settings;else if(key==2||key==5)ui.soundRow=(ui.soundRow+(key==2?2:1))%3;else if(key==1||key==3){int*values[]={&prefs.master,&prefs.bgm,&prefs.sfx};*values[ui.soundRow]=std::clamp(*values[ui.soundRow]+(key==1?-10:10),0,100);dirty=true;}break;
 case View::Display:if(prefs.spiPending){if(key==6){prefs.spiPending=false;persist();}else if(key==4)clockReset();}else if(key==2||key==5)ui.displayRow=1-ui.displayRow;else if(key==4)ui.view=View::Settings;else if(key==1||key==3){if(ui.displayRow==0){prefs.brightness=std::clamp(prefs.brightness+(key==1?-10:10),10,100);dirty=true;}else{const int clocks[]={10,16,20,26,40};int index=std::find(clocks,clocks+5,prefs.spiMHz)-clocks;int next=clocks[std::clamp(index+(key==1?-1:1),0,4)];prefs.spiPending=true;persist();ui.spiDeadline=now()+15000;errorsAtTrial=displayErrors();if(displayStart(next)!=ESP_OK){clockReset();}else{prefs.spiMHz=next;uiInvalidate();}}}break;
 case View::Profiles:if(key==2||key==5)ui.selection=(ui.selection+(key==2?ProfileCount-1:1))%ProfileCount;else if(key==4)ui.view=View::Settings;else if(key==6){selectedProfile=ui.selection;if(selectedProfile==DeveloperSlot){ui.view=View::DevGate;devTaps=0;}else if(!prefs.profiles[selectedProfile].used){nameEditor(true,true);pendingProfileSlot=selectedProfile;}else{ui.view=View::ProfileAction;ui.selection=0;}}break;
 case View::ProfileAction:if(key==2||key==5)ui.selection=(ui.selection+(key==2?2:1))%3;else if(key==4){ui.view=View::Profiles;ui.selection=selectedProfile;}else if(key==6){if(ui.selection==0){switchProfile(prefs,selectedProfile);home();if(!prefs.player[0])nameEditor(true);else if(!prefs.tutorialDone)tutorialStep(0);}else if(ui.selection==1){switchProfile(prefs,selectedProfile);nameEditor(false,true);}else ui.view=View::ConfirmDelete;}break;
 case View::ConfirmDelete:if(key==4)ui.view=View::Profiles;else if(key==6){removeProfile(prefs,selectedProfile);ui.view=View::Profiles;ui.selection=prefs.active;}break;
 case View::SlotsFull:if(key==4)ui.view=View::Settings;else if(key==6){ui.view=View::Profiles;ui.selection=prefs.active;}break;
 case View::ConfirmFirst:if(key==4)ui.view=View::Settings;else if(key==6){if(std::all_of(std::begin(prefs.profiles),std::begin(prefs.profiles)+UserProfileCount,[](const auto&p){return p.used;})){ui.view=View::SlotsFull;break;}prefs.firstLoginPending=true;persist();ui.view=View::FirstCountdown;ui.animationStart=now();suspended=false;}break;
 case View::Name:case View::Text:{if(ui.view==View::Text)ui.status.clear();const char*groups[]={"ABCDEFGHIJKLMNOPQRSTUVWXYZ ","abcdefghijklmnopqrstuvwxyz ","0123456789","!@#$%^&*()-_=+.,?/"};if(key==1||key==3){ui.charGroup=(ui.charGroup+(key==1?3:1))%4;ui.charIndex=0;}else if(key==2||key==5)ui.charIndex=(ui.charIndex+(key==2?int(strlen(groups[ui.charGroup]))-1:1))%strlen(groups[ui.charGroup]);else if(key==4){if(ui.view==View::Text&&ui.wifiFromScan&&ui.entry.empty()){ui.view=View::WifiScan;ui.selection=0;}else if(ui.view==View::Name&&ui.canCancelName&&ui.entry.empty())cancelNameEditor();else if(!ui.entry.empty())ui.entry.pop_back();}else if(key==6&&ui.entry.size()<size_t(ui.view==View::Name?7:ui.password?63:32))ui.entry+=groups[ui.charGroup][ui.charIndex];break;}
 case View::WifiScan:{auto nets=networkScanResults();if(key==4){ui.view=View::Network;ui.selection=0;ui.wifiFromScan=false;}else if(key==1){ui.selection=0;networkScan();}else if(!networkScanning()&&!nets.empty()){ui.selection=std::clamp(ui.selection,0,int(nets.size())-1);if(key==2||key==5)ui.selection=(ui.selection+(key==2?int(nets.size())-1:1))%nets.size();else if(key==6){auto net=nets[ui.selection];pendingSsid=net.ssid;ui.wifiFromScan=true;ui.passwordRequired=net.secured;ui.entry.clear();ui.status.clear();if(net.secured){ui.view=View::Text;ui.entryTitle="WIFI PASSWORD";ui.password=true;ui.charGroup=ui.charIndex=0;}else{networkConnect(net.ssid,"");ui.view=View::WifiStatus;ui.entryTitle="WIFI";ui.status=networkConnectionMessage();}}}break;}
 case View::Network:if(key==2||key==5)ui.selection=(ui.selection+(key==2?4:1))%5;else if(key==4)ui.view=View::Settings;else if(key==6){if(ui.selection==0){ui.view=View::WifiScan;ui.selection=0;ui.wifiFromScan=true;networkScan();}else if(ui.selection==1){networkPortal();ui.view=View::Portal;}else if(ui.selection==2){networkConnectSaved();ui.view=View::WifiStatus;ui.entryTitle="WIFI";ui.status="MENGHUBUNGKAN...";}else if(ui.selection==3){ui.view=View::WifiStatus;ui.entryTitle="WIFI";ui.status=networkConnected()?networkName():"BELUM TERHUBUNG";}else{ui.view=View::Ota;otaCheck();}}break;
 case View::Ota:if(key==4){otaCancel();if(!otaStatus().busy)ui.view=View::Network;}else if(key==6&&!otaStatus().busy){if(otaStatus().available){if(!ui.battery.valid||ui.battery.percent<30){ui.status="OTA PERLU BATERAI MINIMAL 30%";ui.view=View::WifiStatus;ui.entryTitle="OTA";}else{persist();otaInstall();}}else otaCheck();}break;
 case View::Portal:if(key==4){networkStop();ui.view=View::Network;}break;
 case View::System:if(key==2||key==5)ui.selection=(ui.selection+(key==2?4:1))%5;else if(key==4)ui.view=View::Settings;else if(key==6){View views[]={View::Diagnostics,View::ButtonTest,View::LedTest,View::SpeakerTest,View::DisplayTest};ui.view=views[ui.selection];ui.entryTitle="DIAGNOSTICS";ui.status=std::string("FW ")+esp_app_get_description()->version+" / HEAP "+std::to_string(esp_get_free_heap_size())+" / ADC "+std::to_string(ui.battery.mv)+" MV";}break;
 case View::ButtonTest:case View::SpeakerTest:case View::LedTest:if(key==4)ui.view=View::System;else{ui.testKey=key;if(ui.view==View::SpeakerTest)audioEffect("tone");}break;
 case View::Secret:if(key==4)home();else if(key==6)audioMeow();break;
 default:if(ui.entryTitle=="WIFI"&&(key==4||key==6)){ui.view=ui.wifiFromScan?View::WifiScan:View::Network;ui.selection=0;}else if(ui.entryTitle=="THEME"&&(key==1||key==3)){int theme=(prefs.mono?2:prefs.ocean?1:0)+(key==1?2:1);theme%=3;prefs.ocean=theme==1;prefs.mono=theme==2;ui.status=prefs.mono?"WHITE / BLACK":prefs.ocean?"OCEAN":"AMBER";dirty=true;}else if(ui.entryTitle=="KEY LIGHT"&&(key==1||key==3)){prefs.leds=std::clamp(prefs.leds+(key==1?-10:10),0,100);ui.status=std::to_string(prefs.leds)+"%";dirty=true;}else if(key==4||key==6)ui.view=View::Settings;break;
 }
}
static void finishEntry(){if(ui.view==View::Name){if(ui.entry.empty()||ui.entry=="XDAXA")return;if(pendingProfileSlot>=0){if(!addProfile(prefs,pendingProfileSlot))return;pendingProfileSlot=-1;}ui.canCancelName=false;strncpy(prefs.player,ui.entry.c_str(),7);prefs.player[7]=0;prefs.used=true;persist();if(prefs.firstLoginPending||newName||!prefs.tutorialDone)tutorialStep(0);else ui.view=View::Profiles;}else if(ui.view==View::Text){if((ui.passwordRequired&&ui.entry.empty())||(!ui.entry.empty()&&ui.entry.size()<8)){ui.status="PASSWORD MINIMAL 8 KARAKTER";return;}networkConnect(pendingSsid,ui.entry);std::fill(ui.entry.begin(),ui.entry.end(),0);ui.entry.clear();ui.view=View::WifiStatus;ui.entryTitle="WIFI";ui.status="MENGHUBUNGKAN...";}}
static void down(int key){if(ui.power!=PowerPhase::Play||ui.tutorial>=0||shutdownFrozen)return;if(ui.view==View::Playing&&!game.finished()){if(key==4){exitAt=ui.exitStarted=now();}if(game.keyDown(key))consumed|=1<<(key-1);}else if(ui.view==View::Home&&(key==1||key==3)){repeatKey=key;repeatAt=now()+500;}}
static void tick(){int64_t t=now();ui.now=t;uint8_t raw=readKeys();if(raw!=rawPrevious){rawPrevious=raw;rawAt=t;}if(t-rawAt>=20&&raw!=stable){auto before=stable;stable=raw;idle.touch(t);if(inNetworkUi())networkActivity();shutdownGesture(t);for(int i=0;i<6;i++)if((stable&(1<<i))&&!(before&(1<<i)))down(i+1);for(int i=0;i<6;i++)if(!(stable&(1<<i))&&(before&(1<<i))){game.keyUp(i+1);if(i==3)exitAt=ui.exitStarted=-1;if(repeatKey==i+1)repeatKey=0;if(!(consumed&(1<<i)))press(i+1);consumed&=~(1<<i);}}
 if(t-batteryAt>=1000){auto battery=sampleBattery();if(battery.valid)ui.battery=battery;batteryAt=t;}ui.usb=usbPresent();PowerInput input{ui.usb,ui.battery.valid?ui.battery.percent:0,stable,ui.battery.critical};auto nextPower=power.update(t,input);if(nextPower!=PowerPhase::Play&&shutdownFrozen){ui.view=shutdownReturn;if(ui.tutorial>=0)ui.tutorialAt+=t-shutdownAt;shutdownFrozen=false;shutdownAt=-1;}setPhase(nextPower);shutdownGesture(t);
 if(ui.power==PowerPhase::Cutoff){vTaskDelay(pdMS_TO_TICKS(100));return;}if(ui.power==PowerPhase::Standby){standbySleep();return;}
 if(networkIdleTick(t,inNetworkUi(),otaStatus().busy)){
  otaInvalidateOffer();
  if(ui.view==View::Portal){ui.view=View::WifiStatus;ui.entryTitle="WIFI";ui.wifiFromScan=false;ui.status=networkConnectionMessage();}
 }
 if(idle.due(t,prefs.autoOffMinutes,ui.power==PowerPhase::Play&&ui.view!=View::Boot&&ui.view!=View::Shutdown&&ui.view!=View::FirstCountdown&&!otaStatus().busy)){
  ui.view=View::Shutdown;ui.animationStart=t;ui.tutorial=-1;ui.rateInviteAt=0;suspended=false;shutdownFrozen=false;shutdownAt=-1;
  repeatKey=0;exitAt=ui.exitStarted=-1;consumed|=stable;otaCancel();networkStop();audioEffect("off");persist();
 }
 if(ui.view==View::Boot&&t-ui.animationStart>=2400){if(prefs.firstLoginPending||!prefs.used){int empty=-1;for(int i=0;i<UserProfileCount;i++)if(!prefs.profiles[i].used){empty=i;break;}if(empty>=0){addProfile(prefs,empty);nameEditor(true);}else{ui.view=View::SlotsFull;ui.selection=prefs.active;}}else if(!prefs.player[0])nameEditor(true);else{ui.view=View::Home;if(!prefs.tutorialDone)tutorialStep(0);}}
 if(ui.view==View::FirstCountdown&&t-ui.animationStart>=3000){suspended=false;power.standby();setPhase(PowerPhase::Standby);return;}
 if(ui.view==View::Shutdown&&t-ui.animationStart>=2500){suspended=false;power.standby();setPhase(PowerPhase::Standby);return;}
 if(!shutdownFrozen&&ui.tutorial>=0&&stable==40){if(skipAt<0)skipAt=t;if(t-skipAt>=3000){finishTutorial();consumed|=40;}}else skipAt=-1;
 static int64_t entryAt=-1;if(!shutdownFrozen&&(ui.view==View::Name||ui.view==View::Text)&&stable==32){if(entryAt<0)entryAt=t;if(t-entryAt>=650){finishEntry();consumed|=32;entryAt=-1;}}else entryAt=-1;
 static int64_t cancelNameAt=-1;if(!shutdownFrozen&&ui.view==View::Name&&ui.canCancelName&&stable==8){if(cancelNameAt<0)cancelNameAt=t;if(t-cancelNameAt>=1000){cancelNameEditor();consumed|=8;cancelNameAt=-1;}}else cancelNameAt=-1;
 if(exitAt>=0&&t-exitAt>=2000){home();consumed|=8;}
 if(repeatKey&&t>=repeatAt){consumed|=1<<(repeatKey-1);press(repeatKey);repeatAt=t+150;}
 static int64_t gameAt=t;if(!shutdownFrozen&&ui.power==PowerPhase::Play&&ui.view==View::Playing&&!game.finished())game.advance(std::min(int64_t(100),t-gameAt));else if(!shutdownFrozen&&ui.view==View::Playing&&game.s.phase==Phase::ReactionResult)game.advance(std::min(int64_t(100),t-gameAt));gameAt=t;
 ratingGameOverTick(t);
 if(prefs.spiPending&&(t>=ui.spiDeadline||displayErrors()!=errorsAtTrial))clockReset();
 if(ui.view==View::WifiStatus&&ui.entryTitle=="WIFI")ui.status=networkConnectionMessage();
 audioVolumes(prefs.master,prefs.bgm,prefs.sfx);audioMenu(ui.power==PowerPhase::Play&&ui.view!=View::Playing&&ui.view!=View::Secret&&ui.view!=View::Shutdown&&ui.view!=View::Boot);vibrate(0);
 if(dirty&&t-saveAt>=5000)persist();
 int interval=ui.view==View::Playing||ui.tutorial>=0||ui.view==View::Boot||ui.view==View::FirstCountdown?16:100;
 if(t-frameAt>=interval&&peripheralsOn()){uiDraw(ui);setLeds(ui.view==View::Playing?game.leds():ui.nav,prefs.leds);frameAt=t;}
 lv_timer_handler();
}
}
extern "C" void app_main(){using namespace remora;earlyInit();auto err=nvs_flash_init();if(err!=ESP_OK){fullCutoff();return;}err=nvs_flash_init_partition("userdata");if(err!=ESP_OK){fullCutoff();return;}load(prefs);displayInitLvgl();uiInit();ui.prefs=&prefs;ui.engine=&game;ui.power=PowerPhase::Off;game.sound=[](const char*s){audioEffect(s);};game.record=[](int mode,int value,bool lower){int &r=prefs.records[mode][game.s.difficulty];if(r<0||(lower?value<r:value>r))r=value;if(game.s.phase==Phase::Clear||game.s.phase==Phase::ReactionResult)prefs.wins++;std::copy(game.winCounts.begin(),game.winCounts.end(),std::begin(prefs.phraseCounters));dirty=true;};ui.battery=sampleBattery();ui.usb=usbPresent();auto phase=power.begin(now(),{ui.usb,ui.battery.valid?ui.battery.percent:0,0,ui.battery.critical});setPhase(phase);
 // Validate the first DMA flush before confirming an OTA image. No visual stability claim.
 peripherals(true);if(displayStart(10)!=ESP_OK){esp_restart();return;}ui.view=View::Boot;ui.animationStart=now();ui.now=now();uiDraw(ui,true);lv_timer_handler();if(!displayWait()||!ui.battery.valid){esp_restart();return;}peripherals(false);ui.view=View::Notice;
 const esp_partition_t*running=esp_ota_get_running_partition();esp_ota_img_states_t state;if(esp_ota_get_state_partition(running,&state)==ESP_OK&&state==ESP_OTA_IMG_PENDING_VERIFY)esp_ota_mark_app_valid_cancel_rollback();
 while(true){tick();vTaskDelay(pdMS_TO_TICKS(5));}}
