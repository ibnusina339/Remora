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
static Preferences prefs;static GameEngine game;static UiModel ui;static PowerPolicy power;static View resumeView=View::Home;
static bool suspended=false,dirty=false,newName=false;static uint8_t stable=0,rawPrevious=0,consumed=0;static int64_t rawAt=0,exitAt=-1,repeatAt=0,skipAt=-1,saveAt=0,batteryAt=-1000,frameAt=0;static int repeatKey=0,secretTaps=0;static int64_t secretAt=0;static uint32_t errorsAtTrial=0;static int selectedProfile=0;static std::string pendingSsid;
static int64_t now(){return esp_timer_get_time()/1000;}
static void persist(){save(prefs);dirty=false;saveAt=now();}
static void checkpoint(){if(ui.view==View::Playing){prefs.resumeMode=game.s.mode;prefs.resumeDifficulty=game.s.difficulty;prefs.resumeLevel=game.s.level;prefs.resumeScore=game.s.score;prefs.resumeClears=game.s.clears;}persist();}
static void tutorialStep(int step){ui.tutorial=step;ui.tutorialAt=now();ui.tutorialReveal=false;if(step<=1)ui.view=View::Home;else if(step==2){ui.view=View::Guide;ui.guidePage=0;}else if(step==3||step==4)ui.view=View::Pregame;else ui.view=View::Settings;ui.game=0;ui.selection=0;}
static void finishTutorial(){ui.tutorial=-1;prefs.tutorialDone=true;prefs.firstLoginPending=false;persist();ui.view=View::Home;ui.game=0;}
static void home(){ui.view=View::Home;exitAt=ui.exitStarted=-1;repeatKey=0;consumed|=stable;prefs.resumeMode=-1;}
static void nameEditor(bool fresh){newName=fresh;ui.view=View::Name;ui.entryTitle=fresh?"PEMAIN BARU":"EDIT NAME";ui.entry=fresh?"":prefs.player;ui.charGroup=0;ui.charIndex=0;}
static void startGame(){networkStop();game.start(ui.game,prefs.difficulty[ui.game],esp_random());ui.view=View::Playing;prefs.games++;prefs.resumeMode=-1;dirty=true;}
static void boot(){ui.view=View::Boot;ui.animationStart=now();int old=ui.peekGame;ui.peekGame=(old+1+esp_random()%(GameCount-1))%GameCount;ui.peekSide=esp_random()%2;}
static void clockReset(){prefs.spiMHz=10;prefs.spiPending=false;persist();displayStart(10);uiInvalidate();}
static void setPhase(PowerPhase phase){auto old=ui.power;if(old==phase)return;ui.power=phase;exitAt=ui.exitStarted=-1;repeatKey=0;if(phase==PowerPhase::Play){peripherals(true);if(displayStart(prefs.spiMHz)!=ESP_OK){prefs.spiMHz=10;prefs.spiPending=false;persist();ESP_ERROR_CHECK(displayStart(10));}uiInvalidate();if(suspended){ui.view=resumeView;suspended=false;game.s.held.fill(false);}else boot();}
 else if(phase==PowerPhase::Standby){otaCancel();checkpoint();peripherals(false);}
 else if(phase==PowerPhase::Cutoff){checkpoint();otaCancel();fullCutoff();}
 else{if(old==PowerPhase::Play){resumeView=ui.view;suspended=true;for(auto &c:game.s.cues)c.holding=false;game.s.held.fill(false);checkpoint();}otaCancel();peripherals(true);if(displayStart(10)!=ESP_OK){peripherals(false);return;}uiInvalidate();ui.view=View::Notice;}}
static void press(int key){if(ui.power!=PowerPhase::Play)return;if(ui.view==View::Boot||ui.view==View::FirstCountdown||ui.view==View::Shutdown)return;
 if(ui.tutorial>=0){if(!ui.tutorialReveal&&now()-ui.tutorialAt<int64_t(tutorialMessage(ui.tutorial,prefs.player).size()*30)&&key==6){ui.tutorialReveal=true;return;}if(ui.tutorial==0&&key==6)tutorialStep(1);else if(ui.tutorial==1&&key==2)tutorialStep(2);else if(ui.tutorial==2&&key==6)tutorialStep(3);else if(ui.tutorial==3&&key==3){prefs.difficulty[0]=std::min(4,int(prefs.difficulty[0])+1);dirty=true;tutorialStep(4);}else if(ui.tutorial==4&&key==6)tutorialStep(5);else if(ui.tutorial==5&&key==6)tutorialStep(6);else if(ui.tutorial==6&&key==6)finishTutorial();return;}
 audioEffect(key==4?"back":"move");
 switch(ui.view){
 case View::Home:if(key==1||key==3)ui.game=(ui.game+(key==1?GameCount:1))%(GameCount+1);else if(key==2&&ui.game<GameCount){ui.view=View::Guide;ui.guidePage=0;}else if(key==6){if(ui.game==GameCount){ui.view=View::Settings;ui.selection=0;}else ui.view=View::Pregame;}else if(key==5){if(now()-secretAt>1500)secretTaps=0;secretAt=now();if(++secretTaps>=5){secretTaps=0;ui.view=View::Secret;}}else secretTaps=0;break;
 case View::Guide:if(key==1||key==3)ui.guidePage=std::clamp(ui.guidePage+(key==1?-1:1),0,ui.guidePages-1);else if(key==4)home();else if(key==6)ui.view=View::Pregame;break;
 case View::Pregame:if(key==1||key==3){prefs.difficulty[ui.game]=std::clamp(int(prefs.difficulty[ui.game])+(key==1?-1:1),0,4);dirty=true;}else if(key==4)home();else if(key==6)startGame();break;
 case View::Playing:if(game.finished()){if(key==4)home();else if(key==6){if(game.s.phase==Phase::ReactionResult)game.nextLevel();else startGame();}}else game.press(key);break;
 case View::Settings:if(key==2||key==5)ui.selection=(ui.selection+(key==2?10:1))%11;else if(key==4)home();else if(key==6){switch(ui.selection){case 0:ui.view=View::Sound;break;case 1:ui.view=View::Display;break;case 2:ui.view=View::WifiStatus;ui.entryTitle="THEME";ui.status=prefs.ocean?"OCEAN":"AMBER";break;case 3:ui.view=View::WifiStatus;ui.entryTitle="KEY LIGHT";ui.status=std::to_string(prefs.leds)+"%";break;case 4:ui.view=View::WifiStatus;ui.entryTitle="BATTERY";ui.status=std::to_string(ui.battery.percent)+"% / "+std::to_string(ui.battery.mv)+" MV";break;case 5:ui.view=View::Profiles;ui.selection=prefs.active;persist();break;case 6:ui.view=View::Network;ui.selection=0;break;case 7:ui.view=View::System;ui.selection=0;break;case 8:ui.view=View::Stats;break;case 9:ui.view=View::ConfirmFirst;break;case 10:ui.view=View::Shutdown;ui.animationStart=now();checkpoint();break;}}break;
 case View::Sound:if(key==4||key==6)ui.view=View::Settings;else if(key==2||key==5)ui.soundRow=(ui.soundRow+(key==2?2:1))%3;else if(key==1||key==3){int*values[]={&prefs.master,&prefs.bgm,&prefs.sfx};*values[ui.soundRow]=std::clamp(*values[ui.soundRow]+(key==1?-10:10),0,100);dirty=true;}break;
 case View::Display:if(prefs.spiPending){if(key==6){prefs.spiPending=false;persist();}else if(key==4)clockReset();}else if(key==2||key==5)ui.displayRow=1-ui.displayRow;else if(key==4)ui.view=View::Settings;else if(key==1||key==3){if(ui.displayRow==0){prefs.brightness=std::clamp(prefs.brightness+(key==1?-10:10),10,100);dirty=true;}else{const int clocks[]={10,16,20,26,40};int index=std::find(clocks,clocks+5,prefs.spiMHz)-clocks;int next=clocks[std::clamp(index+(key==1?-1:1),0,4)];prefs.spiPending=true;persist();ui.spiDeadline=now()+15000;errorsAtTrial=displayErrors();if(displayStart(next)!=ESP_OK){clockReset();}else{prefs.spiMHz=next;uiInvalidate();}}}break;
 case View::Profiles:if(key==2||key==5)ui.selection=(ui.selection+(key==2?ProfileCount-1:1))%ProfileCount;else if(key==4)ui.view=View::Settings;else if(key==6){selectedProfile=ui.selection;if(!prefs.profiles[selectedProfile].used){addProfile(prefs,selectedProfile);nameEditor(true);}else{ui.view=View::ProfileAction;ui.selection=0;}}break;
 case View::ProfileAction:if(key==2||key==5)ui.selection=(ui.selection+(key==2?2:1))%3;else if(key==4){ui.view=View::Profiles;ui.selection=selectedProfile;}else if(key==6){if(ui.selection==0){switchProfile(prefs,selectedProfile);home();if(!prefs.tutorialDone)tutorialStep(0);}else if(ui.selection==1){switchProfile(prefs,selectedProfile);nameEditor(false);}else ui.view=View::ConfirmDelete;}break;
 case View::ConfirmDelete:if(key==4)ui.view=View::Profiles;else if(key==6){removeProfile(prefs,selectedProfile);ui.view=View::Profiles;ui.selection=prefs.active;}break;
 case View::SlotsFull:if(key==4)ui.view=View::Settings;else if(key==6){ui.view=View::Profiles;ui.selection=prefs.active;}break;
 case View::ConfirmFirst:if(key==4)ui.view=View::Settings;else if(key==6){if(std::all_of(std::begin(prefs.profiles),std::end(prefs.profiles),[](const auto&p){return p.used;})){ui.view=View::SlotsFull;break;}prefs.firstLoginPending=true;persist();ui.view=View::FirstCountdown;ui.animationStart=now();suspended=false;}break;
 case View::Name:case View::Text:{const char*groups[]={"ABCDEFGHIJKLMNOPQRSTUVWXYZ ","abcdefghijklmnopqrstuvwxyz ","0123456789","!@#$%^&*()-_=+.,?/"};if(key==1||key==3){ui.charGroup=(ui.charGroup+(key==1?3:1))%4;ui.charIndex=0;}else if(key==2||key==5)ui.charIndex=(ui.charIndex+(key==2?int(strlen(groups[ui.charGroup]))-1:1))%strlen(groups[ui.charGroup]);else if(key==4&&!ui.entry.empty())ui.entry.pop_back();else if(key==6&&ui.entry.size()<size_t(ui.view==View::Name?7:ui.password?63:32))ui.entry+=groups[ui.charGroup][ui.charIndex];break;}
 case View::Network:if(key==2||key==5)ui.selection=(ui.selection+(key==2?4:1))%5;else if(key==4)ui.view=View::Settings;else if(key==6){if(ui.selection==0){networkPortal();ui.view=View::Portal;}else if(ui.selection==1){ui.view=View::Text;ui.entryTitle="WIFI NAME";ui.entry.clear();ui.password=false;ui.charIndex=0;ui.charGroup=0;}else if(ui.selection==2){networkConnectSaved();ui.view=View::WifiStatus;ui.entryTitle="WIFI";ui.status="MENGHUBUNGKAN...";}else if(ui.selection==3){ui.view=View::WifiStatus;ui.entryTitle="WIFI";ui.status=networkConnected()?networkName():"BELUM TERHUBUNG";}else{ui.view=View::Ota;otaCheck();}}break;
 case View::Ota:if(key==4){otaCancel();if(!otaStatus().busy)ui.view=View::Network;}else if(key==6&&!otaStatus().busy){if(otaStatus().available){if(!ui.battery.valid||ui.battery.percent<30){ui.status="OTA PERLU BATERAI MINIMAL 30%";ui.view=View::WifiStatus;ui.entryTitle="OTA";}else{persist();otaInstall();}}else otaCheck();}break;
 case View::Portal:if(key==4){networkStop();ui.view=View::Network;}break;
 case View::System:if(key==2||key==5)ui.selection=(ui.selection+(key==2?4:1))%5;else if(key==4)ui.view=View::Settings;else if(key==6){View views[]={View::Diagnostics,View::ButtonTest,View::LedTest,View::SpeakerTest,View::DisplayTest};ui.view=views[ui.selection];ui.entryTitle="DIAGNOSTICS";ui.status=std::string("FW ")+esp_app_get_description()->version+" / HEAP "+std::to_string(esp_get_free_heap_size())+" / ADC "+std::to_string(ui.battery.mv)+" MV";}break;
 case View::ButtonTest:case View::SpeakerTest:case View::LedTest:if(key==4)ui.view=View::System;else{ui.testKey=key;if(ui.view==View::SpeakerTest)audioEffect("tone");}break;
 case View::Secret:if(key==4)home();else if(key==6)audioMeow();break;
 default:if(ui.entryTitle=="THEME"&&(key==1||key==3)){prefs.ocean=!prefs.ocean;ui.status=prefs.ocean?"OCEAN":"AMBER";dirty=true;}else if(ui.entryTitle=="KEY LIGHT"&&(key==1||key==3)){prefs.leds=std::clamp(prefs.leds+(key==1?-10:10),0,100);ui.status=std::to_string(prefs.leds)+"%";dirty=true;}else if(key==4||key==6)ui.view=View::Settings;break;
 }
}
static void finishEntry(){if(ui.view==View::Name){if(ui.entry.empty())return;strncpy(prefs.player,ui.entry.c_str(),7);prefs.player[7]=0;prefs.used=true;persist();if(prefs.firstLoginPending||newName||!prefs.tutorialDone)tutorialStep(0);else ui.view=View::Profiles;}else if(ui.view==View::Text){if(!ui.password){if(ui.entry.empty())return;pendingSsid=ui.entry;ui.entry.clear();ui.entryTitle="WIFI PASSWORD";ui.password=true;}else{networkConnect(pendingSsid,ui.entry);std::fill(ui.entry.begin(),ui.entry.end(),0);ui.entry.clear();ui.view=View::WifiStatus;ui.entryTitle="WIFI";ui.status="MENGHUBUNGKAN...";}}}
static void down(int key){if(ui.power!=PowerPhase::Play||ui.tutorial>=0)return;if(ui.view==View::Playing&&!game.finished()){if(key==4){exitAt=ui.exitStarted=now();}if(game.keyDown(key))consumed|=1<<(key-1);}else if(ui.view==View::Home&&(key==1||key==3)){repeatKey=key;repeatAt=now()+500;press(key);consumed|=1<<(key-1);}}
static void tick(){int64_t t=now();ui.now=t;uint8_t raw=readKeys();if(raw!=rawPrevious){rawPrevious=raw;rawAt=t;}if(t-rawAt>=20&&raw!=stable){auto before=stable;stable=raw;for(int i=0;i<6;i++)if((stable&(1<<i))&&!(before&(1<<i)))down(i+1);for(int i=0;i<6;i++)if(!(stable&(1<<i))&&(before&(1<<i))){game.keyUp(i+1);if(i==3)exitAt=ui.exitStarted=-1;if(repeatKey==i+1)repeatKey=0;if(!(consumed&(1<<i)))press(i+1);consumed&=~(1<<i);}}
 if(t-batteryAt>=1000){auto battery=sampleBattery();if(battery.valid)ui.battery=battery;batteryAt=t;}ui.usb=usbPresent();PowerInput input{ui.usb,ui.battery.valid?ui.battery.percent:0,stable,ui.battery.critical};setPhase(power.update(t,input));
 if(ui.power==PowerPhase::Cutoff){vTaskDelay(pdMS_TO_TICKS(100));return;}if(ui.power==PowerPhase::Standby){standbySleep();return;}
 if(ui.view==View::Boot&&t-ui.animationStart>=2400){if(prefs.firstLoginPending||!prefs.used){int empty=-1;for(int i=0;i<ProfileCount;i++)if(!prefs.profiles[i].used){empty=i;break;}if(empty>=0){addProfile(prefs,empty);nameEditor(true);}else{ui.view=View::SlotsFull;ui.selection=prefs.active;}}else{ui.view=View::Home;if(!prefs.tutorialDone)tutorialStep(0);}}
 if(ui.view==View::FirstCountdown&&t-ui.animationStart>=3000){suspended=false;power.standby();setPhase(PowerPhase::Standby);return;}
 if(ui.view==View::Shutdown&&t-ui.animationStart>=2500){suspended=false;power.standby();setPhase(PowerPhase::Standby);return;}
 if(ui.tutorial>=0&&stable==40){if(skipAt<0)skipAt=t;if(t-skipAt>=3000){finishTutorial();consumed|=40;}}else skipAt=-1;
 static int64_t entryAt=-1;if((ui.view==View::Name||ui.view==View::Text)&&stable==32){if(entryAt<0)entryAt=t;if(t-entryAt>=650){finishEntry();consumed|=32;entryAt=-1;}}else entryAt=-1;
 if(exitAt>=0&&t-exitAt>=2000){home();consumed|=8;}
 if(repeatKey&&t>=repeatAt){press(repeatKey);repeatAt=t+150;}
 static int64_t gameAt=t;if(ui.power==PowerPhase::Play&&ui.view==View::Playing&&!game.finished())game.advance(std::min(int64_t(100),t-gameAt));else if(ui.view==View::Playing&&game.s.phase==Phase::ReactionResult)game.advance(std::min(int64_t(100),t-gameAt));gameAt=t;
 if(prefs.spiPending&&(t>=ui.spiDeadline||displayErrors()!=errorsAtTrial))clockReset();
 audioVolumes(prefs.master,prefs.bgm,prefs.sfx);audioMenu(ui.power==PowerPhase::Play&&ui.view!=View::Playing&&ui.view!=View::Secret);vibrate(0);
 if(dirty&&t-saveAt>=5000)persist();
 int interval=ui.view==View::Playing||ui.tutorial>=0||ui.view==View::Boot||ui.view==View::FirstCountdown?16:100;
 if(t-frameAt>=interval&&peripheralsOn()){uiDraw(ui);setLeds(ui.view==View::Playing?game.leds():ui.nav,prefs.leds);frameAt=t;}
 lv_timer_handler();
}
}
extern "C" void app_main(){using namespace remora;earlyInit();auto err=nvs_flash_init();if(err!=ESP_OK){fullCutoff();return;}err=nvs_flash_init_partition("userdata");if(err!=ESP_OK){fullCutoff();return;}load(prefs);displayInitLvgl();uiInit();ui.prefs=&prefs;ui.engine=&game;ui.power=PowerPhase::Off;game.sound=[](const char*s){audioEffect(s);};game.record=[](int mode,int value,bool lower){int &r=prefs.records[mode][game.s.difficulty];if(r<0||(lower?value<r:value>r))r=value;prefs.wins=std::max(prefs.wins,uint32_t(game.s.clears));dirty=true;};ui.battery=sampleBattery();ui.usb=usbPresent();auto phase=power.begin(now(),{ui.usb,ui.battery.valid?ui.battery.percent:0,0,ui.battery.critical});setPhase(phase);
 // Confirm only after NVS, ADC/input setup, LVGL and framebuffer allocations succeed.
 const esp_partition_t*running=esp_ota_get_running_partition();esp_ota_img_states_t state;if(esp_ota_get_state_partition(running,&state)==ESP_OK&&state==ESP_OTA_IMG_PENDING_VERIFY)esp_ota_mark_app_valid_cancel_rollback();
 while(true){tick();vTaskDelay(pdMS_TO_TICKS(5));}}
