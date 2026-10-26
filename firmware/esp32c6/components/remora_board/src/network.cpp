#include "board.hpp"
#include "esp_wifi.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "esp_http_server.h"
#include "esp_random.h"
#include "esp_timer.h"
#include "nvs.h"
#include <mutex>
#include <cstring>
namespace remora {
static bool initialized=false,started=false;static std::atomic<bool>connected{false},portal{false};static std::string ssid,password;static std::mutex mutex;static httpd_handle_t server;
static int64_t connectingAt=0;static std::atomic<bool>scanRunning{false};static std::vector<WifiNetwork>scanResults;static std::string scanMessage,connectionMessage="BELUM TERHUBUNG";
static void event(void*,esp_event_base_t base,int32_t id,void*){
 if(base==IP_EVENT&&id==IP_EVENT_STA_GOT_IP){connected=true;std::lock_guard<std::mutex>l(mutex);connectionMessage="TERHUBUNG";}
 if(base==WIFI_EVENT&&id==WIFI_EVENT_STA_DISCONNECTED){connected=false;std::lock_guard<std::mutex>l(mutex);connectionMessage="GAGAL/TERPUTUS. COBA LAGI.";}
 if(base==WIFI_EVENT&&id==WIFI_EVENT_SCAN_DONE){
  uint16_t count=0;esp_wifi_scan_get_ap_num(&count);count=std::min<uint16_t>(count,24);std::vector<wifi_ap_record_t>aps(count);std::vector<WifiNetwork>found;
  if(count&&esp_wifi_scan_get_ap_records(&count,aps.data())==ESP_OK){for(size_t i=0;i<count;i++){auto&a=aps[i];std::string name((char*)a.ssid,strnlen((char*)a.ssid,32));if(name.empty())continue;bool secure=a.authmode!=WIFI_AUTH_OPEN;if(std::none_of(found.begin(),found.end(),[&](const auto&n){return n.ssid==name&&n.secured==secure;}))found.push_back({name,int(a.rssi),secure});}std::sort(found.begin(),found.end(),[](const auto&a,const auto&b){return a.rssi>b.rssi;});}else esp_wifi_clear_ap_list();
  std::lock_guard<std::mutex>l(mutex);if(scanRunning){scanResults=std::move(found);scanMessage=scanResults.empty()?"JARINGAN TIDAK DITEMUKAN":"";}scanRunning=false;
 }
}
void networkInit(){if(initialized)return;ESP_ERROR_CHECK(esp_netif_init());ESP_ERROR_CHECK(esp_event_loop_create_default());esp_netif_create_default_wifi_sta();esp_netif_create_default_wifi_ap();wifi_init_config_t cfg=WIFI_INIT_CONFIG_DEFAULT();ESP_ERROR_CHECK(esp_wifi_init(&cfg));esp_event_handler_register(WIFI_EVENT,ESP_EVENT_ANY_ID,event,nullptr);esp_event_handler_register(IP_EVENT,IP_EVENT_STA_GOT_IP,event,nullptr);initialized=true;}
void networkScan(){
 if(scanRunning){return;}
 networkInit();
 if(!started||portal){networkStop();auto err=esp_wifi_set_mode(WIFI_MODE_STA);if(err==ESP_OK)err=esp_wifi_start();if(err!=ESP_OK){std::lock_guard<std::mutex>l(mutex);scanMessage="WIFI BELUM SIAP. SCAN LAGI.";return;}started=true;}
 {std::lock_guard<std::mutex>l(mutex);scanResults.clear();scanMessage="MEMINDAI...";scanRunning=true;}
 wifi_scan_config_t config{};config.show_hidden=false;auto err=esp_wifi_scan_start(&config,false);
 if(err!=ESP_OK){std::lock_guard<std::mutex>l(mutex);scanRunning=false;scanMessage="SCAN GAGAL. COBA LAGI.";}
}
bool networkScanning(){return scanRunning;}
std::vector<WifiNetwork>networkScanResults(){std::lock_guard<std::mutex>l(mutex);return scanResults;}
std::string networkScanMessage(){std::lock_guard<std::mutex>l(mutex);return scanMessage;}
std::string networkConnectionMessage(){std::lock_guard<std::mutex>l(mutex);if(connected)return "TERHUBUNG: "+ssid;if(connectionMessage=="MENGHUBUNGKAN..."&&esp_timer_get_time()/1000-connectingAt>20000)return "BELUM TERHUBUNG. COBA LAGI.";return connectionMessage;}
void networkConnect(const std::string&name,const std::string&pass){if(name.empty()||name.size()>32||pass.size()>63||(!pass.empty()&&pass.size()<8))return;networkInit();networkStop();wifi_config_t cfg{};memcpy(cfg.sta.ssid,name.data(),name.size());memcpy(cfg.sta.password,pass.data(),pass.size());cfg.sta.threshold.authmode=pass.empty()?WIFI_AUTH_OPEN:WIFI_AUTH_WPA2_PSK;ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA,&cfg));ESP_ERROR_CHECK(esp_wifi_start());started=true;{std::lock_guard<std::mutex>l(mutex);connectionMessage="MENGHUBUNGKAN...";connectingAt=esp_timer_get_time()/1000;}esp_wifi_set_ps(WIFI_PS_MIN_MODEM);ESP_ERROR_CHECK(esp_wifi_connect());{std::lock_guard<std::mutex>l(mutex);ssid=name;}nvs_handle_t n;if(nvs_open("wifi",NVS_READWRITE,&n)==ESP_OK){nvs_set_str(n,"ssid",name.c_str());nvs_set_str(n,"pass",pass.c_str());nvs_commit(n);nvs_close(n);}}
void networkConnectSaved(){nvs_handle_t n;if(nvs_open("wifi",NVS_READONLY,&n)!=ESP_OK)return;char name[33]{},pass[65]{};size_t a=sizeof(name),b=sizeof(pass);if(nvs_get_str(n,"ssid",name,&a)==ESP_OK){nvs_get_str(n,"pass",pass,&b);nvs_close(n);networkConnect(name,pass);memset(pass,0,sizeof(pass));return;}nvs_close(n);}
void networkStop(){if(initialized&&started&&scanRunning.exchange(false))esp_wifi_scan_stop();if(server){httpd_stop(server);server=nullptr;}portal=false;if(initialized&&started){esp_wifi_disconnect();esp_wifi_stop();started=false;}connected=false;}
bool networkConnected(){return connected;}bool networkPortalActive(){return portal;}
std::string networkName(){std::lock_guard<std::mutex>l(mutex);return ssid;}
std::string portalPassword(){std::lock_guard<std::mutex>l(mutex);return password;}
static std::string decode(const std::string&s){std::string out;for(size_t i=0;i<s.size();i++){if(s[i]=='+')out+=' ';else if(s[i]=='%'&&i+2<s.size()){char h[3]={s[i+1],s[i+2],0};out+=char(strtol(h,nullptr,16));i+=2;}else out+=s[i];}return out;}
static esp_err_t page(httpd_req_t*r){httpd_resp_set_type(r,"text/html");return httpd_resp_sendstr(r,"<!doctype html><meta name='viewport' content='width=device-width'><title>REMORA Wi-Fi</title><h1>REMORA Wi-Fi</h1><form method='post' action='/connect'><label>SSID <input name='ssid' maxlength='32' required></label><p><label>Password <input name='pass' type='password' minlength='8' maxlength='63'></label><p><button>Connect</button></form>");}
static std::string pendingName,pendingPass;
static void connectTask(void*){vTaskDelay(pdMS_TO_TICKS(600));auto n=pendingName,p=pendingPass;pendingPass.clear();networkConnect(n,p);std::fill(p.begin(),p.end(),0);vTaskDelete(nullptr);}
static esp_err_t connectPost(httpd_req_t*r){if(r->content_len>256||r->content_len<=0)return httpd_resp_send_err(r,HTTPD_400_BAD_REQUEST,"Invalid size");std::string body(r->content_len,'\0');int got=0;while(got<r->content_len){int n=httpd_req_recv(r,body.data()+got,r->content_len-got);if(n<=0)return ESP_FAIL;got+=n;}std::string name,pass;size_t pos=0;while(pos<body.size()){auto end=body.find('&',pos);auto part=body.substr(pos,end==body.npos?end:end-pos);auto eq=part.find('=');if(eq!=part.npos){auto key=part.substr(0,eq),value=decode(part.substr(eq+1));if(key=="ssid")name=value;if(key=="pass")pass=value;}if(end==body.npos)break;pos=end+1;}if(name.empty()||name.size()>32||pass.size()>63||(!pass.empty()&&pass.size()<8))return httpd_resp_send_err(r,HTTPD_400_BAD_REQUEST,"SSID/password invalid");pendingName=name;pendingPass=pass;httpd_resp_sendstr(r,"Saved. REMORA is connecting. Return to the device.");xTaskCreate(connectTask,"wifi-connect",4096,nullptr,4,nullptr);return ESP_OK;}
void networkPortal(){networkInit();networkStop();char code[13];snprintf(code,sizeof(code),"RM%08lx",(unsigned long)esp_random());{std::lock_guard<std::mutex>l(mutex);password=code;ssid="REMORA-SETUP";}wifi_config_t cfg{};strcpy((char*)cfg.ap.ssid,"REMORA-SETUP");strcpy((char*)cfg.ap.password,code);cfg.ap.ssid_len=12;cfg.ap.channel=1;cfg.ap.max_connection=1;cfg.ap.authmode=WIFI_AUTH_WPA2_PSK;ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP,&cfg));ESP_ERROR_CHECK(esp_wifi_start());started=true;httpd_config_t conf=HTTPD_DEFAULT_CONFIG();conf.max_uri_handlers=2;ESP_ERROR_CHECK(httpd_start(&server,&conf));httpd_uri_t get{};get.uri="/";get.method=HTTP_GET;get.handler=page;httpd_register_uri_handler(server,&get);httpd_uri_t post{};post.uri="/connect";post.method=HTTP_POST;post.handler=connectPost;httpd_register_uri_handler(server,&post);portal=true;}
}
