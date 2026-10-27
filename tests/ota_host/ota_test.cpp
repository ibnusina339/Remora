// Compile and execute the actual updater, replacing ESP-IDF I/O at its boundary.
#include "board.hpp"
#include "cJSON.h"
#include <fstream>
#include <iostream>
#include <iterator>
#ifndef REMORA_OTA_SOURCE
#define REMORA_OTA_SOURCE "../../firmware/esp32c6/components/remora_board/src/ota.cpp"
#endif
#include REMORA_OTA_SOURCE

using namespace fixture;
static std::string releaseBody,manifestBody,imageBody,tag,manifestUrl,binaryUrl;
static int passed=0,failed=0;
static int jsonAllocations=0;
static bool metadataAllocated=false;
static void* trackedMetadataMalloc(size_t n){metadataAllocated=true;return std::malloc(n);}
static void* trackedJsonMalloc(size_t size){void*p=malloc(size);if(p)++jsonAllocations;return p;}
static void trackedJsonFree(void*p){if(p)--jsonAllocations;free(p);}
static std::string read(const std::string& path) {
 std::ifstream f(path,std::ios::binary);require(bool(f),"fixture file missing");
 return std::string(std::istreambuf_iterator<char>(f),{});
}
static std::string digest(const std::string& data) {
 unsigned char hash[32];unsigned n;EVP_Digest(data.data(),data.size(),hash,&n,EVP_sha256(),nullptr);
 char hex[65];for(unsigned i=0;i<32;++i)snprintf(hex+i*2,3,"%02x",hash[i]);return hex;
}
static std::string edit(const std::string& body,const char* key,const std::string& value) {
 auto j=cJSON_Parse(body.c_str());require(j,"invalid JSON fixture");
 cJSON_ReplaceItemInObject(j,key,cJSON_CreateString(value.c_str()));char* s=cJSON_PrintUnformatted(j);
 std::string out=s;cJSON_free(s);cJSON_Delete(j);return out;
}
static std::string number(const std::string& body,const char* key,double value) {
 auto j=cJSON_Parse(body.c_str());require(j,"invalid JSON fixture");
 cJSON_ReplaceItemInObject(j,key,cJSON_CreateNumber(value));char* s=cJSON_PrintUnformatted(j);
 std::string out=s;cJSON_free(s);cJSON_Delete(j);return out;
}
static void reset() {
 require(clients==0,"leaked HTTP client from previous test");require(!flashActive,"leaked flash transaction");
 beforeHttpOpen={};routes.clear();requests.clear();tasks.clear();written.clear();clients=begin=end=aborts=boot=restarts=reads=insecure=0;headRequests=getRequests=headReads=0;
 wifi=taskOk=initOk=partOk=beginOk=writeOk=endOk=bootOk=ntpOk=true;fixture::clock=1800000000;
 partition={};current={};strcpy(current.version,"0.1.0");strcpy(current.project_name,"Remora");
 remora::status={};remora::cancelled=false;remora::imageUrl.clear();remora::expectedHash.clear();remora::expectedSize=0;
 cancel=[] {remora::otaCancel();};
 routes[remora::Latest].status=302;routes[remora::Latest].redirect=std::string(remora::TagPrefix)+tag;routes[manifestUrl].body=manifestBody;routes[binaryUrl].body=imageBody;
}
static void check(bool available=true) {
 remora::otaCheck();require(remora::otaStatus().busy||!wifi||!taskOk,"check did not start");run();
 require(remora::otaStatus().available==available,"incorrect update availability");
 require(!remora::otaStatus().busy,"check stuck busy");require(clients==0,"HTTP leak after check");
}
static void install(bool success) {
 remora::otaInstall();run();require(restarts==int(success),"unexpected restart decision");
 require(!remora::otaStatus().busy,"install stuck busy");require(clients==0,"HTTP leak after install");
 require(!flashActive,"flash handle leaked");
 if(success){require(begin==1&&end==1&&boot==1&&aborts==0,"bad successful flash sequence");
  require(std::string(written.begin(),written.end())==imageBody,"flash differs from downloaded binary");}
 else require(boot==0||!bootOk,"unverified image selected as boot partition");

}
static void test(const char* name,const std::function<void()>& fn) {
 try{reset();fn();++passed;std::cout<<"PASS "<<name<<'\n';}
 catch(const std::exception& e){++failed;std::cerr<<"FAIL "<<name<<": "<<e.what()<<'\n';
  // Continue independent cases after a regression, while still reporting failure.
  clients=0;flashActive=false;}
}
int main(int argc,char** argv) {
 try{
 require(argc==2,"usage: ota-test fixture-directory");std::string dir=argv[1];
 releaseBody=read(dir+"/release.json");manifestBody=read(dir+"/manifest.json");imageBody=read(dir+"/firmware.bin");
 auto j=cJSON_Parse(releaseBody.c_str());require(j,"release JSON parse failed");tag=remora::str(j,"tag_name");cJSON_Delete(j);
 manifestUrl=std::string(remora::Prefix)+tag+"/manifest.json";binaryUrl=std::string(remora::Prefix)+tag+"/remora-esp32c6.bin";
 test("public release -> exact image -> inactive slot -> reboot",[]{check();install(true);});
 test("manifest JSON allocations are released after validation",[]{
  cJSON_Hooks hooks{trackedJsonMalloc,trackedJsonFree};cJSON_InitHooks(&hooks);
  beforeHttpOpen=[](const std::string&url){if(url==manifestUrl)require(jsonAllocations==0,"JSON allocated before manifest HTTPS");};
  try{check();require(jsonAllocations==0,"JSON allocation leak");}
  catch(...){cJSON_InitHooks(nullptr);beforeHttpOpen={};throw;}
  cJSON_InitHooks(nullptr);beforeHttpOpen={};
 });
 test("complete HTTP messages do not wait for another read",[]{
  routes[manifestUrl].failAfter=(manifestBody.size()+1023)/1024;
  check();routes[binaryUrl].failAfter=(imageBody.size()+2047)/2048;install(true);
 });
 test("metadata allocation failure never opens HTTPS",[]{
  auto data=remora::get(manifestUrl,4096,+[](size_t)->void*{return nullptr;});
  require(!data&&clients==0&&reads==0,"failed metadata allocation opened network");
 });
 test("bounded metadata allocated before TLS and NUL terminated",[]{
  metadataAllocated=false;beforeHttpOpen=[](const std::string&){require(metadataAllocated,"TLS opened before bounded metadata allocation");};
  auto data=remora::get(manifestUrl,4096,trackedMetadataMalloc);beforeHttpOpen={};
  require(bool(data)&&data.size==manifestBody.size()&&std::string(data.c_str())==manifestBody,"metadata differs or lacks NUL");
 });
 test("ready status shows exact stable version",[]{check();auto version=tag[0]=='v'?tag.substr(1):tag;require(remora::otaStatus().message=="Ready to update to "+version+" version","ready message mismatch");});
 test("latest status requires installed stable version",[]{strncpy(current.version,tag.c_str(),31);check(false);require(remora::otaStatus().message=="Latest firmware","latest message mismatch");});
 test("prerelease tag never claims latest",[]{routes[remora::Latest].redirect=std::string(remora::TagPrefix)+"v99.0.0-rc.1";check(false);require(remora::otaStatus().message!="Latest firmware"&&getRequests==0,"prerelease incorrectly offered or called latest");});
 test("latest uses one bounded HEAD and never reads release body",[]{
  routes[remora::Latest].body=std::string(500000,'x');check();
  require(headRequests==1&&headReads==0&&getRequests==1,"latest discovery fetched a release body or extra connection");
  require(requests[0].url==remora::Latest&&requests[0].method==HTTP_METHOD_HEAD&&requests[0].disableAutoRedirect,"latest HEAD followed a redirect");
  require(requests[0].rxBuffer==1024&&requests[0].txBuffer==512,"latest HEAD buffers exceed intended budget");
  require(requests[1].url==manifestUrl&&requests[1].txBuffer==4096,"manifest path or signed-URL request buffer incorrect");
 });
 test("all supported latest redirect statuses resolve",[]{for(int code:{301,302,303,307,308}){routes[remora::Latest].status=code;check();}require(headRequests==5&&headReads==0,"HEAD discovery repeated or read body");});
 test("nonredirect latest statuses are rejected",[]{for(int code:{200,300,304,305,399}){routes[remora::Latest].status=code;check(false);}require(getRequests==0,"nonredirect fetched assets");});
 test("latest Location header is case insensitive",[]{routes[remora::Latest].headers={{"location",std::string(remora::TagPrefix)+tag}};check();});
 test("missing latest Location rejected",[]{routes[remora::Latest].redirect.clear();check(false);require(getRequests==0,"missing Location fetched assets");});
 test("duplicate latest Locations rejected",[]{auto location=std::string(remora::TagPrefix)+tag;routes[remora::Latest].headers={{"Location",location},{"location",location}};check(false);require(getRequests==0,"ambiguous Location fetched assets");});
 test("overlong latest Location rejected",[]{routes[remora::Latest].redirect=std::string(remora::TagPrefix)+std::string(257,'a');check(false);require(getRequests==0,"oversized Location fetched assets");});
 test("overlong tag tail rejected within Location buffer",[]{routes[remora::Latest].redirect=std::string(remora::TagPrefix)+"v1.2.3+"+std::string(122,'a');check(false);require(getRequests==0,"tag tail exceeded bounded length");});
 test("unsafe latest tag characters rejected",[]{for(const char*tail:{"v1.2.3/other","v1.2.3?query=1","v1.2.3#fragment","v1.2.3%2Fother","v1.2.3 bad","v1.2.3_bad"}){routes[remora::Latest].redirect=std::string(remora::TagPrefix)+tail;check(false);}require(getRequests==0,"unsafe tag fetched assets");});
 test("empty latest tag rejected",[]{routes[remora::Latest].redirect=remora::TagPrefix;check(false);require(getRequests==0,"empty tag fetched assets");});
 test("lookalike GitHub host rejected",[]{routes[remora::Latest].redirect="https://github.com.evil/ibnusina339/Remora/releases/tag/"+tag;check(false);require(getRequests==0,"lookalike host fetched assets");});
 test("malformed manifest rejected",[]{routes[manifestUrl].body="{broken json";check(false);});
 test("empty manifest rejected",[]{routes[manifestUrl].body.clear();check(false);});
 test("manifest HTTPS downgrade never opened",[]{auto&r=routes[manifestUrl];r.status=302;r.redirect="http://example.test/manifest.json";routes[r.redirect].body=manifestBody;check(false);require(insecure==0,"insecure asset redirect opened");});
 test("manifest HTTP 403 rejected",[]{routes[manifestUrl].status=403;check(false);});
 test("manifest header failure rejected",[]{routes[manifestUrl].headersOk=false;check(false);});
 test("stable tag determines both asset paths",[]{check();install(true);require(requests.size()==3&&requests[1].url==manifestUrl&&requests[2].url==binaryUrl,"assets were not pinned to stable tag");});
 test("17-byte reads split image header safely",[]{check();routes[binaryUrl].chunk=17;install(true);});
 test("GitHub HTTPS asset redirect",[]{check();auto& r=routes[binaryUrl];r.status=302;r.redirect="https://release-assets.githubusercontent.com/fixture.bin";routes[r.redirect].body=imageBody;install(true);});
 test("long signed GitHub asset URL fits request buffer",[]{
  auto&r=routes[manifestUrl];r.status=302;r.redirect="https://release-assets.githubusercontent.com/"+std::string(1800,'x');routes[r.redirect].body=manifestBody;
  auto&b=routes[binaryUrl];b.status=302;b.redirect="https://release-assets.githubusercontent.com/"+std::string(1800,'y');routes[b.redirect].body=imageBody;
  check();install(true);
 });
 test("same semantic version is not offered",[]{strncpy(current.version,tag.c_str(),31);check(false);});
 test("older release is not offered",[]{strcpy(current.version,"99.0.0");check(false);});
 test("draft-only latest endpoint 404 is not called latest",[]{routes[remora::Latest].status=404;check(false);require(remora::otaStatus().message!="Latest firmware"&&getRequests==0,"missing stable release reported as latest");});
 test("malformed stable tag is rejected",[]{routes[remora::Latest].redirect=std::string(remora::TagPrefix)+"version-not-semver";check(false);require(getRequests==0,"malformed tag fetched assets");});
 test("wrong board rejected",[]{routes[manifestUrl].body=edit(manifestBody,"board","other-board");check(false);});
 test("wrong asset rejected",[]{routes[manifestUrl].body=edit(manifestBody,"asset","remora-full.bin");check(false);});
 test("manifest/tag version mismatch rejected",[]{routes[manifestUrl].body=edit(manifestBody,"version","9.0.0");check(false);});
 test("nonhex SHA-256 rejected before install",[]{routes[manifestUrl].body=edit(manifestBody,"sha256",std::string(64,'z'));check(false);});
 test("image larger than OTA slot rejected before offer",[]{routes[manifestUrl].body=number(manifestBody,"size",partition.size+1);check(false);});
 test("fractional size rejected",[]{routes[manifestUrl].body=number(manifestBody,"size",4096.5);check(false);});
 test("tiny image rejected before offer",[]{routes[manifestUrl].body=number(manifestBody,"size",16);check(false);});
 test("latest redirect to another repository rejected",[]{routes[remora::Latest].redirect="https://github.com/other/Remora/releases/tag/"+tag;check(false);require(getRequests==0,"foreign repo fetched assets");});
 test("HTTP 403 rejected",[]{routes[remora::Latest].status=403;check(false);});
 test("HTTP header read error rejected",[]{routes[remora::Latest].headersOk=false;check(false);});
 test("incomplete manifest transfer rejected",[]{routes[manifestUrl].complete=false;check(false);});
 test("oversized manifest bounded",[]{routes[manifestUrl].body=std::string(4097,' ');check(false);});
 test("HTTPS downgrade never opened",[]{auto&r=routes[remora::Latest];r.status=302;r.redirect="http://example.test/release";routes[r.redirect].body=releaseBody;check(false);require(insecure==0,"insecure redirect opened");});
 test("asset redirect loop bounded",[]{routes[manifestUrl].status=302;routes[manifestUrl].redirect=manifestUrl;check(false);require(getRequests<=9,"asset redirect loop unbounded");});
 test("truncated image never boots",[]{check();routes[binaryUrl].body.resize(8192);install(false);require(aborts==1,"truncated write not aborted");});
 test("corrupt image rejected by real SHA-256",[]{check();routes[binaryUrl].body[9000]^=1;install(false);require(aborts==1,"hash mismatch not aborted");});
 test("extra binary bytes rejected",[]{check();routes[binaryUrl].body+='x';install(false);});
 test("incomplete HTTP body even with matching bytes rejected",[]{check();routes[binaryUrl].complete=false;install(false);});
 test("binary read error aborts write",[]{check();routes[binaryUrl].failAfter=3;install(false);require(aborts==1,"read error did not aborts");});
 test("cancel after flash began aborts",[]{check();routes[binaryUrl].cancelAfter=2;install(false);require(aborts==1,"cancel did not aborts");});
 test("wrong project rejected before erase",[]{routes[binaryUrl].body.replace(80,6,"Other!");routes[manifestUrl].body=edit(manifestBody,"sha256",digest(routes[binaryUrl].body));check();install(false);require(begin==0,"wrong project erased slot");});
 test("wrong app version rejected before erase",[]{routes[binaryUrl].body.replace(48,5,"9.0.0");routes[manifestUrl].body=edit(manifestBody,"sha256",digest(routes[binaryUrl].body));check();install(false);require(begin==0,"wrong version erased slot");});
 test("wrong ESP image magic rejected before erase",[]{routes[binaryUrl].body[0]=0;routes[manifestUrl].body=edit(manifestBody,"sha256",digest(routes[binaryUrl].body));check();install(false);require(begin==0,"wrong image erased slot");});
 test("Wi-Fi lost between check and install",[]{check();wifi=false;install(false);require(begin==0&&!remora::otaStatus().available,"offline install retained stale offer");});
 test("cancel during latest HEAD suppresses offer",[]{routes[remora::Latest].cancelOnHeaders=true;check(false);require(getRequests==0,"cancelled HEAD fetched manifest");});
 test("cancel during manifest read suppresses offer",[]{routes[manifestUrl].cancelAfter=0;check(false);});
 test("esp_ota_begin failure leaves old boot",[]{check();beginOk=false;install(false);require(aborts==0,"invalid handle aborted");});
 test("esp_ota_write failure aborts",[]{check();writeOk=false;install(false);require(aborts==1,"write failure did not aborts");});
 test("esp_ota_end validation failure does not reuse freed handle",[]{check();endOk=false;install(false);require(end==1&&aborts==0,"ended handle reused");});
 test("boot selection failure does not reboot",[]{check();bootOk=false;install(false);});
 test("no inactive OTA partition rejected",[]{partOk=false;check(false);});
 test("offline check clears stale available offer",[]{check();wifi=false;check(false);install(false);require(begin==0,"offline check left installable offer");});
 test("NTP failure refuses insecure clock workaround",[]{fixture::clock=0;ntpOk=false;check(false);require(reads==0,"HTTPS attempted before clock sync");});
 test("NTP recovery allows update",[]{fixture::clock=0;check();install(true);});
 test("task allocation failure clears busy",[]{taskOk=false;check(false);});
 test("TLS/open failure releases client",[]{routes[remora::Latest].connect=false;check(false);});
 test("client allocation failure handled",[]{initOk=false;check(false);});
 std::cout<<passed<<" OTA scenarios passed; "<<failed<<" failed\n";
 return failed?1:0;
 }catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 2;}
}
