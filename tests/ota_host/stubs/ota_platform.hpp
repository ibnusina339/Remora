#pragma once
// Only the platform boundary is replaced. Tests compile the production ota.cpp.
#include <atomic>
#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>
#include <map>
#include <functional>
#include <ctime>
#include <cstring>
#include <algorithm>
#include <stdexcept>
#include <openssl/evp.h>

using esp_err_t = int;
constexpr int ESP_OK=0, ESP_FAIL=-1, pdPASS=1;
constexpr int HTTP_TRANSPORT_OVER_SSL=2, HTTP_TRANSPORT_OVER_TCP=1;
#define pdMS_TO_TICKS(x) (x)
struct esp_partition_t { uint32_t address=0x1f0000, size=0x1e0000; };
using esp_ota_handle_t = unsigned;
struct esp_image_header_t { uint8_t bytes[24]; };
struct esp_image_segment_header_t { uint8_t bytes[8]; };
struct esp_app_desc_t {
 uint32_t magic_word=0xabcd5432, secure_version=0, reserved1[2]{};
 char version[32]{},project_name[32]{}; uint8_t rest[176]{};
};
static_assert(sizeof(esp_app_desc_t)==256);
constexpr uint32_t ESP_APP_DESC_MAGIC_WORD=0xabcd5432;
struct esp_sntp_config_t {};
#define ESP_NETIF_SNTP_DEFAULT_CONFIG(host) esp_sntp_config_t{}

namespace fixture {
struct Response {
 std::string body,redirect;
 int status=200,chunk=2048,failAfter=-1,cancelAfter=-1;
 bool headersOk=true,complete=true,connect=true;
};
inline std::map<std::string,Response> routes;
inline std::vector<std::function<void()>> tasks;
inline esp_partition_t partition;
inline esp_app_desc_t current;
inline std::vector<uint8_t> written;
inline int clients=0,begin=0,end=0,aborts=0,boot=0,restarts=0,reads=0,insecure=0;
inline bool wifi=true,taskOk=true,initOk=true,partOk=true,beginOk=true,writeOk=true,endOk=true,bootOk=true;
inline bool flashActive=false,ntpOk=true;
inline time_t clock=1800000000;
inline std::function<void()> cancel;
// OTA mock only accepts the inactive app partition. There is no userdata erase API.

inline void require(bool ok,const char* message) { if(!ok)throw std::runtime_error(message); }
inline void run() { while(!tasks.empty()){auto task=tasks.front();tasks.erase(tasks.begin());task();} }
}
inline int xTaskCreate(void(*fn)(void*),const char*,unsigned,void* arg,int,void*) {
 if(!fixture::taskOk)return 0;
 fixture::tasks.push_back([=]{fn(arg);});return pdPASS;
}
inline void vTaskDelete(void*) {}
inline void vTaskDelay(int) {}
inline void taskYIELD() {}
inline void esp_restart() { ++fixture::restarts; }
inline const esp_app_desc_t* esp_app_get_description() { return &fixture::current; }
inline const esp_partition_t* esp_ota_get_next_update_partition(const void*) { return fixture::partOk?&fixture::partition:nullptr; }
inline int esp_ota_begin(const esp_partition_t* p,size_t size,esp_ota_handle_t* h) {
 fixture::require(p==&fixture::partition&&size<=p->size,"write outside inactive OTA partition");
 ++fixture::begin;if(!fixture::beginOk)return ESP_FAIL;*h=1;fixture::flashActive=true;return ESP_OK;
}
inline int esp_ota_write(esp_ota_handle_t h,const void* data,size_t len) {
 fixture::require(h==1&&fixture::flashActive,"invalid OTA write handle");
 if(!fixture::writeOk)return ESP_FAIL;
 const auto* b=static_cast<const uint8_t*>(data);fixture::written.insert(fixture::written.end(),b,b+len);return ESP_OK;
}
inline int esp_ota_end(esp_ota_handle_t) {
 fixture::require(fixture::flashActive,"OTA end without active handle");
 fixture::flashActive=false;++fixture::end;return fixture::endOk?ESP_OK:ESP_FAIL;
}
inline int esp_ota_abort(esp_ota_handle_t) {
 fixture::require(fixture::flashActive,"aborts after esp_ota_end freed handle");
 fixture::flashActive=false;++fixture::aborts;return ESP_OK;
}
inline int esp_ota_set_boot_partition(const esp_partition_t* p) {
 fixture::require(p==&fixture::partition,"wrong boot partition");++fixture::boot;return fixture::bootOk?ESP_OK:ESP_FAIL;
}
inline int esp_netif_sntp_init(esp_sntp_config_t*) { return ESP_OK; }
inline int esp_netif_sntp_sync_wait(int) { if(fixture::ntpOk)fixture::clock=1800000000;return fixture::ntpOk?ESP_OK:ESP_FAIL; }
inline void esp_netif_sntp_deinit() {}
// Linux linker redirects only time(), avoiding preprocessor changes to std headers.
extern "C" time_t __wrap_time(time_t* out) { if(out)*out=fixture::clock;return fixture::clock; }

inline int esp_crt_bundle_attach(void*) { return ESP_OK; }
struct esp_http_client_config_t {
 const char* url=nullptr;int transport_type=0;int(*crt_bundle_attach)(void*)=nullptr;
 int timeout_ms=0,buffer_size=0,max_redirection_count=0;bool keep_alive_enable=false;
};
struct MockHttp { std::string url;size_t offset=0;int count=0;std::map<std::string,std::string>headers; };
using esp_http_client_handle_t=MockHttp*;
inline MockHttp* esp_http_client_init(const esp_http_client_config_t* c) {
 fixture::require(c->crt_bundle_attach&&c->transport_type==HTTP_TRANSPORT_OVER_SSL,"HTTPS certificate verification missing");
 if(!fixture::initOk)return nullptr;
 ++fixture::clients;return new MockHttp{c->url,0,0,{}};
}
inline int esp_http_client_set_header(MockHttp* h,const char* k,const char* v) { h->headers[k]=v;return ESP_OK; }
inline int esp_http_client_open(MockHttp* h,int) {
 fixture::require(h->headers["User-Agent"]=="Remora-ESP32C6","missing firmware user agent");
 if(h->url.rfind("https://",0)!=0)++fixture::insecure;
 h->offset=0;h->count=0;
 return fixture::routes.count(h->url)&&fixture::routes.at(h->url).connect?ESP_OK:ESP_FAIL;
}
inline int64_t esp_http_client_fetch_headers(MockHttp* h) { const auto&r=fixture::routes.at(h->url);return r.headersOk?int64_t(r.body.size()):-1; }
inline int esp_http_client_get_status_code(MockHttp* h) { return fixture::routes.at(h->url).status; }
inline int esp_http_client_set_redirection(MockHttp* h) {
 auto url=fixture::routes.at(h->url).redirect;if(url.empty())return ESP_FAIL;h->url=url;return ESP_OK;
}
inline int esp_http_client_get_transport_type(MockHttp* h) { return h->url.rfind("https://",0)==0?HTTP_TRANSPORT_OVER_SSL:HTTP_TRANSPORT_OVER_TCP; }
inline int esp_http_client_read(MockHttp* h,char* data,int len) {
 const auto&r=fixture::routes.at(h->url);++fixture::reads;
 if(r.cancelAfter>=0&&h->count>=r.cancelAfter)fixture::cancel();
 if(r.failAfter>=0&&h->count>=r.failAfter)return ESP_FAIL;
 ++h->count;size_t n=std::min({size_t(len),size_t(r.chunk),r.body.size()-h->offset});
 memcpy(data,r.body.data()+h->offset,n);h->offset+=n;return int(n);
}
inline bool esp_http_client_is_complete_data_received(MockHttp* h) { const auto&r=fixture::routes.at(h->url);return r.complete&&h->offset==r.body.size(); }
inline int esp_http_client_close(MockHttp*) { return ESP_OK; }
inline int esp_http_client_cleanup(MockHttp* h) { --fixture::clients;delete h;return ESP_OK; }

struct mbedtls_sha256_context { EVP_MD_CTX* ctx=nullptr; };
inline void mbedtls_sha256_init(mbedtls_sha256_context* c) { c->ctx=EVP_MD_CTX_new(); }
inline int mbedtls_sha256_starts(mbedtls_sha256_context* c,int) { return EVP_DigestInit_ex(c->ctx,EVP_sha256(),nullptr)==1?0:-1; }
inline int mbedtls_sha256_update(mbedtls_sha256_context* c,const unsigned char* b,size_t n) { return EVP_DigestUpdate(c->ctx,b,n)==1?0:-1; }
inline int mbedtls_sha256_finish(mbedtls_sha256_context* c,unsigned char* b) { unsigned n=0;return EVP_DigestFinal_ex(c->ctx,b,&n)==1?0:-1; }
inline void mbedtls_sha256_free(mbedtls_sha256_context* c) { EVP_MD_CTX_free(c->ctx); }
