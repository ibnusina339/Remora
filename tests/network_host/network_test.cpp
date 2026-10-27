// Execute production network.cpp, with only ESP-IDF I/O replaced.
#include "board.hpp"
#include <iostream>
#ifndef REMORA_NETWORK_SOURCE
#define REMORA_NETWORK_SOURCE "../../firmware/esp32c6/components/remora_board/src/network.cpp"
#endif
#include REMORA_NETWORK_SOURCE
using fixture::require;
static void reset(){
 fixture::task=1;remora::networkStop();
 remora::initialized=false;remora::radioTask=nullptr;remora::connectionGeneration=0;
 remora::idlePolicy={};remora::activityAt=0;remora::lastAppliedActivity=-1;
 remora::scanResults.clear();remora::scanMessage.clear();remora::ssid.clear();
 fixture::starts=fixture::stops=fixture::connects=fixture::scanReads=fixture::scanClears=fixture::serverStops=0;
 fixture::milliseconds=0;fixture::driverStarted=false;fixture::receiveHook={};fixture::saved.clear();
 fixture::stationConfig={};fixture::stationConfigWrites=0;
}
static void tick(int64_t now,bool otaBusy=false,bool networkScreen=true){fixture::milliseconds=now;remora::networkIdleTick(now,networkScreen,otaBusy);}
static httpd_req_t request(){httpd_req_t r;r.body="ssid=Fixture+network&pass=fixturepass";r.content_len=int(r.body.size());return r;}
static void post(httpd_req_t&r){fixture::onTask(2,[&]{return remora::connectPost(&r);});}
static void scanEvent(){fixture::onTask(3,[]{remora::event(nullptr,WIFI_EVENT,WIFI_EVENT_SCAN_DONE,nullptr);return 0;});}
static void selectionConfig(){
 const auto&c=fixture::stationConfig.sta;
 require(c.scan_method==WIFI_ALL_CHANNEL_SCAN,"shared SSID stopped at first matching AP");
 require(c.sort_method==WIFI_CONNECT_AP_BY_SIGNAL,"AP selection did not prefer strongest signal");
 require(!c.bssid_set&&c.channel==0,"AP selection pinned an old BSSID/channel");
 require(c.threshold.rssi==-127,"weak compatible AP was filtered out");
 require(c.failure_retry_cnt==1,"per-AP retries were not bounded to one");
}
static int passed=0,failed=0;
template<class F>static void test(const char*name,F action){try{reset();action();++passed;std::cout<<"PASS "<<name<<'\n';}catch(const std::exception&e){++failed;std::cerr<<"FAIL "<<name<<": "<<e.what()<<'\n';}}
int main(){
 test("open shared SSID uses all-channel AP selection without WPA password",[]{
  remora::networkConnect("Shared school SSID","");selectionConfig();
  const auto&c=fixture::stationConfig.sta;
  require(fixture::stationConfigWrites==1&&fixture::connects==1,"station config was not applied before connect");
  require(std::string(reinterpret_cast<const char*>(c.ssid))=="Shared school SSID","SSID changed");
  require(c.password[0]==0&&c.threshold.authmode==WIFI_AUTH_OPEN,"open AP received a password/security requirement");
 });
 test("secured shared SSID keeps password and WPA2 security threshold",[]{
  remora::networkConnect("Shared secured SSID","fixturepass");selectionConfig();
  const auto&c=fixture::stationConfig.sta;
  require(std::string(reinterpret_cast<const char*>(c.password))=="fixturepass","secured AP password changed");
  require(c.threshold.authmode==WIFI_AUTH_WPA2_PSK,"secured selection weakened auth threshold");
 });
 test("saved reconnect replaces stale AP hints and retains credentials",[]{
  fixture::saved["ssid"]="Saved shared SSID";fixture::saved["pass"]="savedpass";
  fixture::stationConfig.sta.channel=11;fixture::stationConfig.sta.bssid_set=true;
  fixture::stationConfig.sta.sort_method=WIFI_CONNECT_AP_BY_SECURITY;
  remora::networkConnectSaved();selectionConfig();
  const auto&c=fixture::stationConfig.sta;
  require(fixture::stationConfigWrites==1&&fixture::connects==1,"saved reconnect did not configure station");
  require(std::string(reinterpret_cast<const char*>(c.ssid))=="Saved shared SSID","saved SSID lost");
  require(std::string(reinterpret_cast<const char*>(c.password))=="savedpass"&&c.threshold.authmode==WIFI_AUTH_WPA2_PSK,"saved credentials/security lost");
 });
 test("HTTP only queues; app_main dispatches once after delay",[]{
  remora::networkPortal();auto r=request();post(r);require(r.error==0,"POST rejected");
  require(fixture::connects==0,"HTTP called driver");tick(599);require(fixture::connects==0,"connected early");
  tick(600);require(fixture::connects==1,"queued connection not dispatched");
  require(fixture::saved["ssid"]=="Fixture network","SSID not saved");
  require(fixture::saved["pass"]=="fixturepass","password changed");
  tick(1200);require(fixture::connects==1,"request dispatched twice");require(fixture::serverStops==1,"portal not stopped");
 });
 test("stop cancels delayed connection and cannot resurrect radio",[]{
  remora::networkPortal();auto r=request();post(r);fixture::milliseconds=200;remora::networkStop();
  int starts=fixture::starts;tick(600);tick(10000);
  require(!remora::networkRadioActive()&&!fixture::driverStarted,"radio restarted");require(fixture::starts==starts&&fixture::connects==0,"stale connect ran");
 });
 test("POST finishing while stop runs cannot enqueue after stop",[]{
  remora::networkPortal();auto r=request();fixture::receiveHook=[]{fixture::onTask(1,[]{remora::networkStop();return 0;});};post(r);
  require(r.error==400,"in-flight POST accepted after stop");tick(600);
  require(fixture::connects==0&&!remora::networkRadioActive(),"in-flight POST resurrected radio");
 });
 test("old POST rejected even if portal is reopened during request",[]{
  remora::networkPortal();auto r=request();fixture::receiveHook=[]{fixture::onTask(1,[]{remora::networkPortal();return 0;});};post(r);
  require(r.error==400,"old session POST accepted");tick(600);require(fixture::connects==0,"old portal session connected");
 });
 test("pending setup connection waits through OTA busy",[]{
  remora::networkPortal();auto r=request();post(r);tick(600,true);require(fixture::connects==0,"connection disrupted OTA");
  tick(601);require(fixture::connects==1,"connection not resumed after OTA");
 });
 test("scan event does not call driver on event task",[]{
  remora::networkScan();scanEvent();require(fixture::scanReads==0,"event task read scan");
  tick(100);require(fixture::scanReads==2,"main did not read scan");require(!remora::networkScanning(),"scan stuck busy");
  require(remora::networkScanResults().size()==1,"scan result missing");
 });
 test("late scan completion after stop is ignored",[]{
  remora::networkScan();remora::networkStop();int clears=fixture::scanClears;scanEvent();tick(100);
  require(fixture::scanReads==0&&fixture::scanClears==clears,"stopped scan callback accessed driver");
  require(!remora::networkRadioActive()&&!remora::networkScanning(),"scan revived stopped radio");
 });
 test("completion queued before stop is discarded",[]{
  remora::networkScan();scanEvent();remora::networkStop();tick(100);
  require(fixture::scanReads==0,"queued scan read after stop");require(!remora::networkScanning(),"cancelled scan stuck");
 });
 test("HTTP activity prevents an idle stop based on an older snapshot",[]{
  remora::networkPortal();int64_t old=remora::activityAt;fixture::milliseconds=10;
  httpd_req_t r;fixture::onTask(2,[&]{return remora::page(&r);});
  require(!remora::stopRadio(true,old),"idle stop ignored concurrent activity");require(remora::networkRadioActive(),"radio stopped despite activity");
 });
 test("automatic stop keeps saved Wi-Fi credentials",[]{
  fixture::saved["ssid"]="Saved network";fixture::saved["pass"]="savedpass";
  remora::networkScan();scanEvent();tick(0,false,false);tick(30000,false,false);
  require(!remora::networkRadioActive(),"outside-menu idle radio stayed on");
  require(remora::networkConnectionMessage()=="WIFI OTOMATIS MATI. HUBUNGKAN LAGI.","idle status was overwritten");
  require(fixture::saved["ssid"]=="Saved network"&&fixture::saved["pass"]=="savedpass","idle stop erased Wi-Fi settings");
 });
 test("driver mutation from another task is rejected",[]{
  remora::networkPortal();bool rejected=false;
  try{fixture::onTask(2,[]{remora::networkStop();return 0;});}catch(const std::runtime_error&){rejected=true;}
  require(rejected&&remora::networkRadioActive(),"cross-task stop bypassed owner guard");
 });
 std::cout<<passed<<" passed, "<<failed<<" failed\n";return failed?1:0;
}
