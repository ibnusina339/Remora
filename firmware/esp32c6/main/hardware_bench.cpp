// Bench-only entrypoint. No LCD, ADC, keys, audio, motor or power GPIO is driven.
#ifdef NDEBUG
#undef NDEBUG
#endif
#include "board.hpp"
#include "pixel_ui.hpp"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_app_desc.h"
#include "esp_system.h"
#include "esp_netif.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <cstdio>
#include <cstring>
#include <string>
#include "core_bench.inc"
using namespace remora;
static const char* Ssid="MAN Insan Cendekia Paser";
static constexpr const char* Sentinel="REMORA-COM13-OTA-20261027";
static void status(){
 auto p=esp_ota_get_running_partition();auto o=otaStatus();esp_ota_img_states_t st=ESP_OTA_IMG_UNDEFINED;
 auto err=esp_ota_get_state_partition(p,&st);
 printf("BENCH|STATUS|version=%s|slot=%s|state=%d|stateErr=%s|wifi=%d|busy=%d|available=%d|progress=%d|offer=%s|heap=%lu|minHeap=%lu|message=%s\n",esp_app_get_description()->version,p->label,int(st),esp_err_to_name(err),networkConnected(),o.busy,o.available,o.progress,o.version.c_str(),(unsigned long)esp_get_free_heap_size(),(unsigned long)esp_get_minimum_free_heap_size(),o.message.c_str());
 for(int subtype:{ESP_PARTITION_SUBTYPE_APP_OTA_0,ESP_PARTITION_SUBTYPE_APP_OTA_1}){
  auto part=esp_partition_find_first(ESP_PARTITION_TYPE_APP,esp_partition_subtype_t(subtype),nullptr);
  if(part){auto result=esp_ota_get_state_partition(part,&st);printf("BENCH|SLOT|label=%s|state=%d|error=%s\n",part->label,int(st),esp_err_to_name(result));}
 }
 if(networkConnected()){
  esp_netif_ip_info_t ip{};auto net=esp_netif_get_handle_from_ifkey("WIFI_STA_DEF");
  if(net&&esp_netif_get_ip_info(net,&ip)==ESP_OK)printf("BENCH|IP|" IPSTR "\n",IP2STR(&ip.ip));
 }
 fflush(stdout);
}
static void sentinel(bool write){
 nvs_handle_t n=0;auto err=nvs_open_from_partition("userdata","bench_ota",write?NVS_READWRITE:NVS_READONLY,&n);
 if(err==ESP_OK){
  if(write){err=nvs_set_str(n,"sentinel",Sentinel);if(err==ESP_OK)err=nvs_commit(n);}
  char value[64]{};size_t size=sizeof(value);
  if(err==ESP_OK)err=nvs_get_str(n,"sentinel",value,&size);
  if(err==ESP_OK&&strcmp(value,Sentinel))err=ESP_FAIL;
  nvs_close(n);
 }
 printf("BENCH|NVS|%s|%s\n",write?"WRITE":"VERIFY",esp_err_to_name(err));fflush(stdout);
}
static void renderTest(){
 static bool initialized=false;static Preferences preferences;static GameEngine engine;
 if(!initialized){preferences=defaults();load(preferences);displayInitLvgl();uiInit();initialized=true;}
 UiModel model;model.prefs=&preferences;model.engine=&engine;model.power=PowerPhase::Play;
 model.battery={3970,78,true,false};model.now=1000;int frames=0;
 for(int game=0;game<GameCount;game++){
  model.game=game;model.view=View::Home;uiDraw(model,true);lv_timer_handler();++frames;
  for(int difficulty=0;difficulty<5;difficulty++){
   preferences.difficulty[game]=difficulty;model.view=View::Pregame;uiDraw(model,true);lv_timer_handler();++frames;
  }
 }
 for(auto view:{View::Settings,View::Sound,View::Display,View::Profiles,View::Stats,View::RateMenu,View::RateInvite,View::ConfirmShutdown,View::Shutdown}){
  model.view=view;uiDraw(model,true);lv_timer_handler();++frames;
 }
 printf("BENCH|UI|PASS|frames=%d|framebuffer=153600|draw_buffers=20480|lcd_connected=0|heap=%lu\n",frames,(unsigned long)esp_get_free_heap_size());
}
extern "C" void app_main(){
 setvbuf(stdout,nullptr,_IONBF,0);setvbuf(stdin,nullptr,_IONBF,0);
 auto n=nvs_flash_init();auto u=nvs_flash_init_partition("userdata");
 printf("BENCH|BOOT|version=%s|reset=%d|nvs=%s|userdata=%s\n",esp_app_get_description()->version,int(esp_reset_reason()),esp_err_to_name(n),esp_err_to_name(u));
 if(n!=ESP_OK||u!=ESP_OK){printf("BENCH|FATAL|NVS_INIT\n");return;}
 // Only this isolated diagnostic image is confirmed without display/ADC checks.
 auto valid=esp_ota_mark_app_valid_cancel_rollback();printf("BENCH|DIAGNOSTIC_IMAGE|confirm=%s\n",esp_err_to_name(valid));
 status();printf("BENCH|READY|STATUS SCAN SCANRESULT CONNECT CHECK INSTALL CANCEL CORE UI NVSSET NVSVERIFY ARM REBOOT\n");
 std::string line;
 while(true){
  int c=getchar();
  if(c==EOF){clearerr(stdin);vTaskDelay(pdMS_TO_TICKS(20));continue;}
  if(c=='\r')continue;
  if(c!='\n'){if(line.size()<80)line+=char(c);continue;}
  auto command=line;line.clear();
  if(command=="STATUS")status();
  else if(command=="SCAN"){networkScan();printf("BENCH|SCAN|START\n");}
  else if(command=="SCANRESULT"){
   printf("BENCH|SCAN|busy=%d|message=%s\n",networkScanning(),networkScanMessage().c_str());
   for(auto&r:networkScanResults())printf("BENCH|AP|ssid=%s|secured=%d|rssi=%d\n",r.ssid.c_str(),r.secured,r.rssi);
  }
  else if(command=="CONNECT"){networkConnect(Ssid,"");printf("BENCH|CONNECT|START|ssid=%s|password=EMPTY\n",Ssid);}
  else if(command=="CHECK"){otaCheck();printf("BENCH|CHECK|START\n");}
  else if(command=="INSTALL"){otaInstall();printf("BENCH|INSTALL|START\n");}
  else if(command=="CANCEL"){otaCancel();printf("BENCH|CANCEL|REQUESTED\n");}
  else if(command=="CORE"){printf("BENCH|CORE|START|games=11|presets=5\n");runCoreTests();printf("BENCH|CORE|PASS\n");}
  else if(command=="UI")renderTest();
  else if(command=="NVSSET")sentinel(true);
  else if(command=="NVSVERIFY")sentinel(false);
  else if(command=="ARM"){auto e=esp_ota_set_boot_partition(esp_ota_get_running_partition());printf("BENCH|ARM|%s\n",esp_err_to_name(e));if(e==ESP_OK){vTaskDelay(pdMS_TO_TICKS(150));esp_restart();}}
  else if(command=="REBOOT"){printf("BENCH|REBOOT\n");vTaskDelay(pdMS_TO_TICKS(150));esp_restart();}
  else if(!command.empty())printf("BENCH|UNKNOWN|%s\n",command.c_str());
 }
}
