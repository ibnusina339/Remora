#pragma once
#include "ota_platform.hpp"
namespace remora {
struct OtaStatus {bool busy=false,available=false;int progress=0;std::string version,message;};
inline bool networkConnected() { return fixture::wifi; }
void otaCheck();void otaInstall();OtaStatus otaStatus();void otaCancel();
}
