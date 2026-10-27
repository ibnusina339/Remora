#pragma once
#include <string>
namespace remora {
enum class OtaPresentation { Message, Ready, Latest };
inline std::string otaVersionLabel(std::string version){
 if(!version.empty()&&version.front()=='v')version.erase(0,1);
 return version;
}
inline OtaPresentation otaPresentation(bool busy,bool available,const std::string&version,const std::string&message){
 if(busy)return OtaPresentation::Message;
 if(available&&!version.empty()&&message=="Ready to update to "+otaVersionLabel(version)+" version")return OtaPresentation::Ready;
 if(!available&&message=="Latest firmware")return OtaPresentation::Latest;
 return OtaPresentation::Message;
}
}
