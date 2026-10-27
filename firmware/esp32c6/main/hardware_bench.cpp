// Bench-only entrypoint. No LCD/ADC/keys/power GPIO. Audio GPIO is driven only by explicit AUDIO commands.
#ifdef NDEBUG
#undef NDEBUG
#endif
#include "board.hpp"
#include "pixel_ui.hpp"
#include "esp_log.h"
#include "esp_ota_ops.h"
#include "esp_app_desc.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "esp_wifi.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <cstdio>
#include <cstdlib>
#include <sys/time.h>
#include <cstring>
#include <string>
#include "core_bench.inc"
using namespace remora;
namespace remora {
bool audioSamplingActive();
bool networkRadioActive();
bool networkIdleTick(int64_t,bool,bool);
void otaInvalidateOffer();
}
static void audioTest(){
 audioStart();audioVolumes(70,35,75);audioMenu(true);
 auto begin=esp_timer_get_time()/1000;int active=0;
 for(int i=0;i<120;i++){
  if(i%20==0)audioMeow();
  if(i%10==0)audioEffect(i%20?"correct":"fail");
  if(audioSamplingActive())active++;
  vTaskDelay(pdMS_TO_TICKS(100));
 }
 audioMenu(false);audioVolumes(70,0,0);vTaskDelay(pdMS_TO_TICKS(2000));
 bool idle=!audioSamplingActive();audioStop();
 printf("BENCH|AUDIO|%s|active_checks=%d/120|elapsed_ms=%lld|idle_clock_stopped=%d|gpio=16|speaker_connected=0\n",active==120&&idle?"PASS":"FAIL",active,(long long)(esp_timer_get_time()/1000-begin),idle);
}
static void idleTest(){
 bool before=networkRadioActive();auto begin=esp_timer_get_time()/1000;int64_t stopped=-1;
 while(esp_timer_get_time()/1000-begin<32000){
  auto now=esp_timer_get_time()/1000;
  if(networkIdleTick(now,false,otaStatus().busy)){otaInvalidateOffer();stopped=now-begin;}
  vTaskDelay(pdMS_TO_TICKS(100));
 }
 bool off=!networkRadioActive();
 printf("BENCH|WIFI_IDLE|%s|radio_before=%d|radio_after=%d|stopped_after_ms=%lld|connected=%d\n",before&&off&&stopped>=30000&&stopped<=31000?"PASS":"FAIL",before,!off,(long long)stopped,networkConnected());
}
static const char* Ssid="MAN Insan Cendekia Paser";
static constexpr const char* Sentinel="REMORA-COM13-OTA-20261027";
static void wifiEvent(void*,esp_event_base_t,int32_t id,void* data){
 printf("BENCH|WIFI_EVENT|id=%ld|stackFree=%lu\n",(long)id,(unsigned long)uxTaskGetStackHighWaterMark(nullptr));
 if(id==WIFI_EVENT_STA_DISCONNECTED){auto*d=static_cast<wifi_event_sta_disconnected_t*>(data);printf("BENCH|WIFI_DISCONNECTED|reason=%d|rssi=%d\n",d->reason,d->rssi);}
 if(id==WIFI_EVENT_STA_CONNECTED)printf("BENCH|WIFI_ASSOCIATED\n");
}
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
static void linkInfo(){
 wifi_ap_record_t ap{};int rssi=0;wifi_phy_mode_t phy{};wifi_bandwidth_t bw{};
 auto e=esp_wifi_sta_get_ap_info(&ap);if(e!=ESP_OK){printf("BENCH|LINK|connected=0|error=%s\n",esp_err_to_name(e));return;}
 esp_wifi_sta_get_rssi(&rssi);esp_wifi_sta_get_negotiated_phymode(&phy);esp_wifi_get_bandwidth(WIFI_IF_STA,&bw);
 printf("BENCH|LINK|connected=1|rssi=%d|phy=%d|bandwidth_mhz=%d|channel=%u|tx_mbps=not_exposed|rx_mbps=not_exposed\n",rssi,int(phy),bw==WIFI_BW_HT20?20:bw==WIFI_BW_HT40?40:0,unsigned(ap.primary));
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
 if(!initialized){load(preferences);displayInitLvgl();uiInit();initialized=true;}
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
static esp_err_t probeEvent(esp_http_client_event_t* e){
 if(e->event_id==HTTP_EVENT_ON_HEADER&&e->header_key&&e->header_value&&strcasecmp(e->header_key,"Location")==0)
  printf("BENCH|PROBE_REDIRECT|%.220s\n",e->header_value);
 return ESP_OK;
}
static void probe(){
 for(const char* url:{"http://connectivitycheck.gstatic.com/generate_204","https://example.com","https://api.github.com/repos/ibnusina339/Remora/releases/latest"}){
  esp_http_client_config_t c{};c.url=url;c.timeout_ms=8000;c.buffer_size=1024;c.crt_bundle_attach=esp_crt_bundle_attach;c.event_handler=probeEvent;
  auto h=esp_http_client_init(&c);if(!h){printf("BENCH|PROBE|ALLOC_FAILED\n");continue;}
  esp_http_client_set_header(h,"User-Agent","Remora-ESP32C6");auto e=esp_http_client_open(h,0);
  auto length=e==ESP_OK?esp_http_client_fetch_headers(h):-1;int code=e==ESP_OK?esp_http_client_get_status_code(h):0;
  printf("BENCH|PROBE|url=%s|open=%s|headers=%lld|status=%d\n",url,esp_err_to_name(e),(long long)length,code);
  esp_http_client_close(h);esp_http_client_cleanup(h);
 }
}
static std::string portalCookie;
static esp_err_t portalEvent(esp_http_client_event_t* e){
 if(e->event_id==HTTP_EVENT_ON_DATA&&e->user_data){auto&body=*static_cast<std::string*>(e->user_data);if(body.size()+e->data_len>24576)return ESP_FAIL;body.append(static_cast<const char*>(e->data),e->data_len);}
 if(e->event_id==HTTP_EVENT_ON_HEADER&&e->header_key&&e->header_value){
  if(!strcasecmp(e->header_key,"Location"))printf("BENCH|PORTAL_REDIRECT|%.300s\n",e->header_value);
  if(!strcasecmp(e->header_key,"Set-Cookie")){std::string v=e->header_value;v=v.substr(0,v.find(';'));if(!portalCookie.empty())portalCookie+="; ";portalCookie+=v;}
 }
 return ESP_OK;
}
static void portalPage(const std::string& path,const std::string& form=""){
 std::string url="http://10.10.10.1"+path,body;
 esp_http_client_config_t c{};c.url=url.c_str();c.timeout_ms=8000;c.buffer_size=1024;c.event_handler=portalEvent;c.user_data=&body;c.disable_auto_redirect=true;
 auto h=esp_http_client_init(&c);if(!h){printf("BENCH|PORTAL|ALLOC_FAILED\n");return;}
 esp_http_client_set_header(h,"User-Agent","Remora-ESP32C6");esp_http_client_set_header(h,"Host","icpaser.net");esp_http_client_set_header(h,"Connection","close");
 if(!portalCookie.empty())esp_http_client_set_header(h,"Cookie",portalCookie.c_str());
 if(!form.empty()){esp_http_client_set_method(h,HTTP_METHOD_POST);esp_http_client_set_header(h,"Content-Type","application/x-www-form-urlencoded");esp_http_client_set_post_field(h,form.data(),form.size());}
 auto e=esp_http_client_perform(h);int code=esp_http_client_get_status_code(h);esp_http_client_cleanup(h);
 printf("BENCH|PORTAL|path=%s|method=%s|open=%s|status=%d\n",path.c_str(),form.empty()?"GET":"POST",esp_err_to_name(e),code);
 printf("BENCH|PORTAL_BODY_BEGIN\n%s\nBENCH|PORTAL_BODY_END|bytes=%u\n",body.c_str(),unsigned(body.size()));
}
extern "C" void app_main(){
 setvbuf(stdout,nullptr,_IONBF,0);setvbuf(stdin,nullptr,_IONBF,0);
 auto n=nvs_flash_init();auto u=nvs_flash_init_partition("userdata");
 printf("BENCH|BOOT|version=%s|reset=%d|nvs=%s|userdata=%s\n",esp_app_get_description()->version,int(esp_reset_reason()),esp_err_to_name(n),esp_err_to_name(u));
 if(n!=ESP_OK||u!=ESP_OK){printf("BENCH|FATAL|NVS_INIT\n");return;}
 // Only this isolated diagnostic image is confirmed without display/ADC checks.
 auto valid=esp_ota_mark_app_valid_cancel_rollback();printf("BENCH|DIAGNOSTIC_IMAGE|confirm=%s\n",esp_err_to_name(valid));
 networkInit();esp_event_handler_register(WIFI_EVENT,ESP_EVENT_ANY_ID,wifiEvent,nullptr);
 status();printf("BENCH|READY|STATUS SCAN SCANRESULT CONNECT LEGACY CHECK INSTALL CANCEL TIME PROBE CORE UI NVSSET NVSVERIFY ARM REBOOT\n");
 std::string line;
 while(true){
  int c=getchar();
  if(c==EOF){clearerr(stdin);vTaskDelay(pdMS_TO_TICKS(20));continue;}
  if(c=='\r')continue;
  if(c!='\n'){if(line.size()<4096)line+=char(c);continue;}
  auto command=line;line.clear();
  if(command=="STATUS")status();
  else if(command=="SCAN"){networkScan();printf("BENCH|SCAN|START\n");}
  else if(command=="SCANRESULT"){
   printf("BENCH|SCAN|busy=%d|message=%s\n",networkScanning(),networkScanMessage().c_str());
   for(auto&r:networkScanResults())printf("BENCH|AP|ssid=%s|secured=%d|rssi=%d\n",r.ssid.c_str(),r.secured,r.rssi);
  }
  else if(command=="CONNECT"){networkConnect(Ssid,"");printf("BENCH|CONNECT|START|ssid=%s|password=EMPTY\n",Ssid);}
  else if(command=="LEGACY"){networkStop();auto e=esp_wifi_set_protocol(WIFI_IF_STA,WIFI_PROTOCOL_11B|WIFI_PROTOCOL_11G|WIFI_PROTOCOL_11N);printf("BENCH|LEGACY_WIFI|%s\n",esp_err_to_name(e));networkConnect(Ssid,"");esp_wifi_set_ps(WIFI_PS_NONE);}
  else if(command.rfind("TIME ",0)==0){timeval value{};value.tv_sec=strtoll(command.c_str()+5,nullptr,10);auto err=value.tv_sec>1700000000?settimeofday(&value,nullptr):-1;printf("BENCH|HOST_TIME|epoch=%lld|result=%d\n",(long long)value.tv_sec,err);}
  else if(command=="PORTAL")portalPage("/login");
  else if(command.rfind("PAGE /",0)==0)portalPage(command.substr(5));
  else if(command.rfind("LOGIN ",0)==0)portalPage("/login",command.substr(6));
  else if(command=="LINK")linkInfo();
  else if(command=="FAST"){auto e=esp_wifi_set_ps(WIFI_PS_NONE);printf("BENCH|FAST|%s\n",esp_err_to_name(e));}
  else if(command=="AUDIOTEST")audioTest();
  else if(command=="AUDIOON"){audioStart();audioVolumes(70,35,75);audioMenu(true);printf("BENCH|AUDIOON|active=%d\n",audioSamplingActive());}
  else if(command=="AUDIOOFF"){audioStop();printf("BENCH|AUDIOOFF|active=%d\n",audioSamplingActive());}
  else if(command=="IDLETEST")idleTest();
  else if(command=="PROBE")probe();
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
