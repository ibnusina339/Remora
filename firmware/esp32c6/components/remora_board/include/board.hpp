#pragma once
#include <array>
#include <cstdint>
#include <string>
#include <atomic>
#include "esp_err.h"
#include "esp_lcd_panel_ops.h"
#include "lvgl.h"
#include "game_engine.hpp"
namespace remora {
inline constexpr int Keys[]={1,2,3,4,6,7};
inline constexpr int HoldPin=14,PeripheralPin=15,UsbPin=8,AdcPin=0,AudioPin=16,VibrationPin=17,TftClock=18,TftMosi=19,TftDc=20,TftReset=5;
inline constexpr int ProfileCount=5;
struct UserProfile {
 bool used=false,tutorialDone=false;uint8_t difficulty[GameCount]{};int records[GameCount][5]{};uint32_t phraseCounters[GameCount]{};
 int master=70,bgm=35,sfx=75,brightness=100,leds=60;bool ocean=false;char player[8]="PLAYER";uint32_t games=0,wins=0;
};
struct Preferences:UserProfile {
 UserProfile profiles[ProfileCount];int active=0,spiMHz=10;bool spiPending=false,firstLoginPending=true;
 int resumeMode=-1,resumeDifficulty=1,resumeLevel=0,resumeScore=0,resumeClears=0;
};
Preferences defaults();void load(Preferences&);void save(Preferences&);
bool switchProfile(Preferences&,int);bool addProfile(Preferences&,int);bool removeProfile(Preferences&,int);
struct Battery {int mv=0,percent=0;bool valid=false,critical=false;};
void earlyInit();uint8_t readKeys();bool usbPresent();Battery sampleBattery();
void peripherals(bool on);bool peripheralsOn();void fullCutoff();void standbySleep();
void setLeds(const std::array<uint32_t,6>&,int brightness);
void displayInitLvgl();esp_err_t displayStart(int mhz);void displayStop();bool displayWait();
float displayFps();uint32_t displayErrors();int displayClock();
void audioStart();void audioStop();void audioVolumes(int,int,int);void audioMenu(bool);void audioEffect(const char*);void audioMeow();void vibrate(int milliseconds);
struct WifiNetwork {std::string ssid;int rssi=0;bool secured=false;};
void networkScan();bool networkScanning();std::vector<WifiNetwork>networkScanResults();std::string networkScanMessage();std::string networkConnectionMessage();
void networkInit();void networkConnect(const std::string&,const std::string&);void networkConnectSaved();void networkPortal();void networkStop();bool networkConnected();bool networkPortalActive();std::string networkName();std::string portalPassword();
struct OtaStatus {bool busy=false,available=false;int progress=0;std::string version,message;};
void otaCheck();void otaInstall();OtaStatus otaStatus();void otaCancel();
extern lv_display_t* display;
}
