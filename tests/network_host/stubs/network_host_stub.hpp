#pragma once
#include <algorithm>
#include <atomic>
#include <cstdint>
#include <cstring>
#include <functional>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>
namespace fixture {
inline int task=1,starts=0,stops=0,connects=0,scanReads=0,scanClears=0,serverStops=0;
inline int64_t milliseconds=0;
inline bool driverStarted=false;
inline std::function<void()>receiveHook;
inline std::map<std::string,std::string>saved;
inline void require(bool ok,const char*message){if(!ok)throw std::runtime_error(message);}
inline void driver(){require(task==1,"Wi-Fi driver called outside app_main");}
template<class F>auto onTask(int id,F action){int old=task;task=id;try{auto result=action();task=old;return result;}catch(...){task=old;throw;}}
}
using esp_err_t=int;
inline constexpr int ESP_OK=0,ESP_FAIL=-1;
#define ESP_ERROR_CHECK(value) fixture::require((value)==ESP_OK,"ESP call failed")
#define configASSERT(value) fixture::require(bool(value),"radio task owner assertion")
using TaskHandle_t=void*;
inline TaskHandle_t xTaskGetCurrentTaskHandle(){return reinterpret_cast<void*>(uintptr_t(fixture::task));}
inline int64_t esp_timer_get_time(){return fixture::milliseconds*1000;}
inline uint32_t esp_random(){return 1234;}
using esp_event_base_t=const char*;
inline constexpr esp_event_base_t WIFI_EVENT="wifi",IP_EVENT="ip";
inline constexpr int ESP_EVENT_ANY_ID=-1,WIFI_EVENT_SCAN_DONE=1,WIFI_EVENT_STA_DISCONNECTED=2,IP_EVENT_STA_GOT_IP=3;
inline esp_err_t esp_event_loop_create_default(){return ESP_OK;}
using EventHandler=void(*)(void*,esp_event_base_t,int32_t,void*);
inline esp_err_t esp_event_handler_register(esp_event_base_t,int,EventHandler,void*){return ESP_OK;}
inline esp_err_t esp_netif_init(){return ESP_OK;}
inline void*esp_netif_create_default_wifi_sta(){return nullptr;}
inline void*esp_netif_create_default_wifi_ap(){return nullptr;}
struct wifi_init_config_t{};
#define WIFI_INIT_CONFIG_DEFAULT() wifi_init_config_t{}
inline constexpr int WIFI_MODE_STA=1,WIFI_MODE_AP=2,WIFI_IF_STA=1,WIFI_IF_AP=2,WIFI_AUTH_OPEN=0,WIFI_AUTH_WPA2_PSK=3,WIFI_PS_MIN_MODEM=1;
struct wifi_scan_config_t{bool show_hidden=false;};
struct wifi_ap_record_t{uint8_t ssid[33]{};int rssi=-50,authmode=WIFI_AUTH_OPEN;};
struct wifi_config_t{
 struct{uint8_t ssid[32]{},password[64]{};struct{int authmode=0;}threshold;}sta;
 struct{uint8_t ssid[33]{},password[64]{};int ssid_len=0,channel=0,max_connection=0,authmode=0;}ap;
};
inline esp_err_t esp_wifi_init(wifi_init_config_t*){fixture::driver();return ESP_OK;}
inline esp_err_t esp_wifi_set_mode(int){fixture::driver();return ESP_OK;}
inline esp_err_t esp_wifi_set_config(int,wifi_config_t*){fixture::driver();return ESP_OK;}
inline esp_err_t esp_wifi_start(){fixture::driver();fixture::driverStarted=true;++fixture::starts;return ESP_OK;}
inline esp_err_t esp_wifi_stop(){fixture::driver();fixture::driverStarted=false;++fixture::stops;return ESP_OK;}
inline esp_err_t esp_wifi_disconnect(){fixture::driver();return ESP_OK;}
inline esp_err_t esp_wifi_connect(){fixture::driver();++fixture::connects;return ESP_OK;}
inline esp_err_t esp_wifi_set_ps(int){fixture::driver();return ESP_OK;}
inline esp_err_t esp_wifi_scan_start(wifi_scan_config_t*,bool){fixture::driver();return ESP_OK;}
inline esp_err_t esp_wifi_scan_stop(){fixture::driver();return ESP_OK;}
inline esp_err_t esp_wifi_clear_ap_list(){fixture::driver();++fixture::scanClears;return ESP_OK;}
inline esp_err_t esp_wifi_scan_get_ap_num(uint16_t*n){fixture::driver();fixture::require(fixture::driverStarted,"scan read after stop");++fixture::scanReads;*n=1;return ESP_OK;}
inline esp_err_t esp_wifi_scan_get_ap_records(uint16_t*n,wifi_ap_record_t*aps){fixture::driver();fixture::require(fixture::driverStarted,"scan read after stop");++fixture::scanReads;if(*n){strcpy(reinterpret_cast<char*>(aps[0].ssid),"Fixture network");aps[0].rssi=-42;}return ESP_OK;}
using nvs_handle_t=int;
inline constexpr int NVS_READWRITE=1,NVS_READONLY=0;
inline esp_err_t nvs_open(const char*,int,nvs_handle_t*h){*h=1;return ESP_OK;}
inline esp_err_t nvs_set_str(nvs_handle_t,const char*key,const char*value){fixture::saved[key]=value;return ESP_OK;}
inline esp_err_t nvs_get_str(nvs_handle_t,const char*key,char*out,size_t*size){auto it=fixture::saved.find(key);if(it==fixture::saved.end())return ESP_FAIL;if(it->second.size()+1>*size)return ESP_FAIL;strcpy(out,it->second.c_str());*size=it->second.size()+1;return ESP_OK;}
inline esp_err_t nvs_commit(nvs_handle_t){return ESP_OK;}
inline void nvs_close(nvs_handle_t){}
using httpd_handle_t=void*;
struct httpd_req_t{int content_len=0;std::string body,response;size_t position=0;int error=0;};
struct httpd_config_t{int max_uri_handlers=0;};
#define HTTPD_DEFAULT_CONFIG() httpd_config_t{}
inline constexpr int HTTP_GET=0,HTTP_POST=1,HTTPD_400_BAD_REQUEST=400;
struct httpd_uri_t{const char*uri=nullptr;int method=0;esp_err_t(*handler)(httpd_req_t*)=nullptr;};
inline esp_err_t httpd_start(httpd_handle_t*h,httpd_config_t*){fixture::driver();*h=reinterpret_cast<void*>(uintptr_t(5));return ESP_OK;}
inline esp_err_t httpd_stop(httpd_handle_t){fixture::driver();++fixture::serverStops;return ESP_OK;}
inline esp_err_t httpd_register_uri_handler(httpd_handle_t,httpd_uri_t*){return ESP_OK;}
inline esp_err_t httpd_resp_set_type(httpd_req_t*,const char*){return ESP_OK;}
inline esp_err_t httpd_resp_sendstr(httpd_req_t*r,const char*text){r->response=text;return ESP_OK;}
inline esp_err_t httpd_resp_send_err(httpd_req_t*r,int code,const char*text){r->error=code;r->response=text;return ESP_FAIL;}
inline int httpd_req_recv(httpd_req_t*r,char*out,size_t count){
 if(fixture::receiveHook){auto hook=std::move(fixture::receiveHook);fixture::receiveHook={};hook();}
 auto n=std::min(count,r->body.size()-r->position);memcpy(out,r->body.data()+r->position,n);r->position+=n;return int(n);
}
namespace remora {
struct WifiNetwork{std::string ssid;int rssi=0;bool secured=false;};
void networkInit();void networkStop();void networkAutoStop();void networkConnect(const std::string&,const std::string&);
void networkScan();bool networkScanning();bool networkPortalActive();bool networkConnecting();bool networkRadioActive();
bool networkIdleTick(int64_t,bool,bool);
}
