#include "board.hpp"
#include "semver.hpp"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "esp_ota_ops.h"
#include "esp_app_desc.h"
#include "esp_app_format.h"
#include "esp_system.h"
#include "esp_netif_sntp.h"
#include "mbedtls/sha256.h"
#include "cJSON.h"
#include <ctime>
#include <mutex>
#include <cstring>
#include <algorithm>

namespace remora {
static constexpr const char* Api="https://api.github.com/repos/ibnusina339/Remora/releases/latest";
static constexpr const char* Prefix="https://github.com/ibnusina339/Remora/releases/download/";
static constexpr size_t ImageDescriptorEnd=sizeof(esp_image_header_t)+sizeof(esp_image_segment_header_t)+sizeof(esp_app_desc_t);
static OtaStatus status;
static std::mutex mutex;
static std::atomic<bool> cancelled{false};
static std::string imageUrl,expectedHash;
static int expectedSize=0;

static void set(const std::string& message,int progress=-1) {
 std::lock_guard<std::mutex> lock(mutex);status.message=message;
 if(progress>=0)status.progress=progress;
}
OtaStatus otaStatus() { std::lock_guard<std::mutex> lock(mutex);return status; }
void otaCancel() { cancelled=true; }
static void finished() { std::lock_guard<std::mutex> lock(mutex);status.busy=false; }
static std::string str(const cJSON* json,const char* key) {
 auto value=cJSON_GetObjectItemCaseSensitive(json,key);
 return cJSON_IsString(value)?value->valuestring:"";
}
static void close(esp_http_client_handle_t client) {
 esp_http_client_close(client);esp_http_client_cleanup(client);
}
static esp_http_client_handle_t open(const std::string& url) {
 if(cancelled||url.rfind("https://",0)!=0)return nullptr;
 esp_http_client_config_t config{};
 config.url=url.c_str();config.transport_type=HTTP_TRANSPORT_OVER_SSL;
 config.crt_bundle_attach=esp_crt_bundle_attach;config.timeout_ms=15000;
 config.buffer_size=2048;config.keep_alive_enable=true;config.max_redirection_count=8;
 auto client=esp_http_client_init(&config);
 if(!client)return nullptr;
 esp_http_client_set_header(client,"User-Agent","Remora-ESP32C6");
 esp_http_client_set_header(client,"Accept",url==Api?"application/vnd.github+json":"application/octet-stream");
 // Streaming mode handles redirects explicitly, retaining certificate checks.
 for(int redirects=0;redirects<=8&&!cancelled;++redirects) {
  if(esp_http_client_get_transport_type(client)!=HTTP_TRANSPORT_OVER_SSL||
     esp_http_client_open(client,0)!=ESP_OK||esp_http_client_fetch_headers(client)<0)break;
  int code=esp_http_client_get_status_code(client);
  if(code==200)return client;
  if(code==403||code==429)set("GitHub membatasi akses. Coba lagi nanti.");
  if(code<300||code>=400||redirects==8||esp_http_client_set_redirection(client)!=ESP_OK)break;
  esp_http_client_close(client);
 }
 close(client);return nullptr;
}
static bool synchronizeClock() {
 if(time(nullptr)>1700000000)return true;
 set("Sinkronisasi waktu HTTPS...");
 esp_sntp_config_t config=ESP_NETIF_SNTP_DEFAULT_CONFIG("pool.ntp.org");
 if(esp_netif_sntp_init(&config)!=ESP_OK)return false;
 bool ok=false;
 for(int i=0;i<30&&!cancelled;++i) {
  if(esp_netif_sntp_sync_wait(pdMS_TO_TICKS(500))==ESP_OK){ok=true;break;}
 }
 esp_netif_sntp_deinit();return ok&&time(nullptr)>1700000000;
}
static std::string get(const std::string& url,size_t limit) {
 auto client=open(url);if(!client)return {};
 std::string body;char buffer[1024];bool ok=true;
 while(!cancelled) {
  int n=esp_http_client_read(client,buffer,sizeof(buffer));
  if(n<0){ok=false;break;}
  if(!n)break;
  if(body.size()+n>limit){ok=false;break;}
  body.append(buffer,n);
 }
 ok=ok&&!cancelled&&esp_http_client_is_complete_data_received(client);
 close(client);return ok?body:std::string{};
}
static bool validManifest(const cJSON* manifest,const SemVer& release) {
 auto size=cJSON_GetObjectItemCaseSensitive(manifest,"size");
 auto part=esp_ota_get_next_update_partition(nullptr);
 auto version=SemVer::parse(str(manifest,"version"));
 expectedHash=str(manifest,"sha256");
 // Check bounds before integer conversion and before presenting an update.
 if(!part||!cJSON_IsNumber(size)||size->valuedouble<double(ImageDescriptorEnd)||
    size->valuedouble>double(part->size))return false;
 expectedSize=size->valueint;
 bool hashOk=expectedHash.size()==64&&std::all_of(expectedHash.begin(),expectedHash.end(),[](char c){
  return (c>='0'&&c<='9')||(c>='a'&&c<='f');
 });
 return size->valuedouble==double(expectedSize)&&hashOk&&!imageUrl.empty()&&
  str(manifest,"board")=="esp32c6-supermini-k2"&&str(manifest,"asset")=="remora-esp32c6.bin"&&
  version.valid&&version.compare(release)==0;
}
static void checkTask(void*) {
 imageUrl.clear();expectedHash.clear();expectedSize=0;
 if(!synchronizeClock()) {
  set("Waktu belum sinkron. Periksa internet/NTP lalu coba lagi.");
  finished();vTaskDelete(nullptr);return;
 }
 set("Memeriksa GitHub Releases...");
 auto body=get(Api,24576);auto json=cJSON_Parse(body.c_str());bool ok=false;
 if(json&&!cJSON_IsTrue(cJSON_GetObjectItem(json,"prerelease"))&&!cJSON_IsTrue(cJSON_GetObjectItem(json,"draft"))) {
  auto tag=str(json,"tag_name");auto next=SemVer::parse(tag);
  auto current=SemVer::parse(esp_app_get_description()->version);
  if(next.valid&&next.pre.empty()&&current.valid&&next.compare(current)>0) {
   const auto base=std::string(Prefix)+tag+"/";std::string manifestUrl;
   auto assets=cJSON_GetObjectItem(json,"assets");cJSON* asset;
   cJSON_ArrayForEach(asset,assets) {
    auto name=str(asset,"name"),url=str(asset,"browser_download_url");
    if(name=="manifest.json"&&url==base+name)manifestUrl=url;
    if(name=="remora-esp32c6.bin"&&url==base+name)imageUrl=url;
   }
   // Release the large GitHub document before starting another TLS session.
   // With the framebuffer allocated, retaining both JSON copies can exhaust C6 heap.
   cJSON_Delete(json);json=nullptr;std::string{}.swap(body);
   auto text=get(manifestUrl,4096);auto manifest=cJSON_Parse(text.c_str());
   if(manifest){ok=validManifest(manifest,next);cJSON_Delete(manifest);}
   if(ok&&!cancelled) {
    std::lock_guard<std::mutex> lock(mutex);
    status.available=true;status.version=tag;status.message="Update tersedia. Hijau: pasang.";
   }
  }else if(next.valid&&current.valid)set("Firmware sudah terbaru.");
 }
 if(json)cJSON_Delete(json);
 {
  std::lock_guard<std::mutex> lock(mutex);
  if(cancelled){status.available=false;status.message="Pemeriksaan dibatalkan.";}
  else if(!ok&&status.message=="Memeriksa GitHub Releases...")status.message="Release/manifest belum tersedia atau tidak cocok.";
  status.busy=false;
 }
 vTaskDelete(nullptr);
}
static void installTask(void*) {
 set("Mengunduh firmware...",0);
 auto part=esp_ota_get_next_update_partition(nullptr);esp_ota_handle_t ota=0;
 bool begun=false,ok=part&&expectedSize>=int(ImageDescriptorEnd)&&expectedSize<=int(part->size);
 auto client=ok?open(imageUrl):nullptr;ok=client!=nullptr;
 mbedtls_sha256_context sha;mbedtls_sha256_init(&sha);
 const bool shaReady=mbedtls_sha256_starts(&sha,0)==0;ok=ok&&shaReady;
 size_t received=0;uint8_t buffer[2048];std::string header;
 while(ok&&!cancelled) {
  int n=esp_http_client_read(client,reinterpret_cast<char*>(buffer),sizeof(buffer));
  if(n<0){ok=false;break;}
  if(!n)break;
  if(size_t(n)>size_t(expectedSize)-received){ok=false;break;}
  received+=n;
  if(!begun) {
   header.append(reinterpret_cast<char*>(buffer),n);
   if(header.size()<ImageDescriptorEnd)continue;
   esp_app_desc_t desc;
   memcpy(&desc,header.data()+sizeof(esp_image_header_t)+sizeof(esp_image_segment_header_t),sizeof(desc));
   auto version=SemVer::parse(std::string(desc.version,strnlen(desc.version,sizeof(desc.version))));
   auto wanted=SemVer::parse(otaStatus().version);
   if(uint8_t(header[0])!=0xe9||desc.magic_word!=ESP_APP_DESC_MAGIC_WORD||!version.valid||
      version.compare(wanted)!=0||strncmp(desc.project_name,"Remora",sizeof(desc.project_name))!=0) {
    ok=false;break;
   }
   if(esp_ota_begin(part,expectedSize,&ota)!=ESP_OK){ok=false;break;}
   begun=true;
   ok=mbedtls_sha256_update(&sha,reinterpret_cast<const uint8_t*>(header.data()),header.size())==0&&
      esp_ota_write(ota,header.data(),header.size())==ESP_OK;
   header.clear();
  }else {
   ok=mbedtls_sha256_update(&sha,buffer,n)==0&&esp_ota_write(ota,buffer,n)==ESP_OK;
  }
  set("Mengunduh firmware...",int(received*100/expectedSize));taskYIELD();
 }
 if(client){ok=ok&&esp_http_client_is_complete_data_received(client);close(client);}
 uint8_t digest[32]{};
 const bool hashOk=shaReady&&mbedtls_sha256_finish(&sha,digest)==0;
 mbedtls_sha256_free(&sha);char hex[65];
 for(int i=0;i<32;++i)snprintf(hex+i*2,3,"%02x",digest[i]);
 ok=ok&&hashOk&&!cancelled&&begun&&received==size_t(expectedSize)&&expectedHash==hex;
 if(ok){ok=esp_ota_end(ota)==ESP_OK;begun=false;} // end frees the handle on failure too.
 if(!ok&&begun)esp_ota_abort(ota);
 if(ok)ok=!cancelled&&esp_ota_set_boot_partition(part)==ESP_OK;
 if(ok){set("Update selesai. Restart...",100);vTaskDelay(pdMS_TO_TICKS(1000));esp_restart();}
 else set(cancelled?"Update dibatalkan; firmware lama tetap aktif.":"Update gagal/diverifikasi gagal.");
 finished();vTaskDelete(nullptr);
}
void otaCheck() {
 std::lock_guard<std::mutex> lock(mutex);
 if(status.busy)return;
 status.available=false;status.version.clear();status.progress=0;
 if(!networkConnected()){status.message="Wi-Fi belum terhubung.";return;}
 status.busy=true;cancelled=false;
 if(xTaskCreate(checkTask,"ota-check",8192,nullptr,3,nullptr)!=pdPASS){status.busy=false;status.message="Memori OTA tidak cukup.";}
}
void otaInstall() {
 std::lock_guard<std::mutex> lock(mutex);
 if(status.busy||!status.available)return;
 if(!networkConnected()){status.available=false;status.message="Wi-Fi terputus. Periksa update lagi.";return;}
 status.busy=true;cancelled=false;
 if(xTaskCreate(installTask,"ota-install",8192,nullptr,3,nullptr)!=pdPASS){status.busy=false;status.message="Memori OTA tidak cukup.";}
}
}
