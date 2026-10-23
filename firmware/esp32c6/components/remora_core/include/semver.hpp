#pragma once
#include <string>
namespace remora {
struct SemVer { unsigned major=0,minor=0,patch=0;std::string pre;bool valid=false;static SemVer parse(std::string);int compare(const SemVer&)const; };
}
