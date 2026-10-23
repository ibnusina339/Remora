#include "semver.hpp"
#include <algorithm>
#include <cctype>
#include <climits>
#include <vector>
namespace remora {
static bool num(const std::string&s){return !s.empty()&&std::all_of(s.begin(),s.end(),[](unsigned char c){return std::isdigit(c);});}
static bool integer(const std::string&s,unsigned &n){if(!num(s)||(s.size()>1&&s[0]=='0'))return false;unsigned long long v=0;for(char c:s){v=v*10+c-'0';if(v>UINT_MAX)return false;}n=static_cast<unsigned>(v);return true;}
static std::vector<std::string> split(const std::string&s,char sep){std::vector<std::string>v;size_t a=0,b;do{b=s.find(sep,a);v.push_back(s.substr(a,b==s.npos?b:b-a));a=b+1;}while(b!=s.npos);return v;}
static bool identifiers(const std::string&s,bool pre){for(auto&p:split(s,'.')){if(p.empty())return false;for(unsigned char c:p)if(!std::isalnum(c)&&c!='-')return false;if(pre&&num(p)&&p.size()>1&&p[0]=='0')return false;}return true;}
SemVer SemVer::parse(std::string s){SemVer v;if(!s.empty()&&s[0]=='v')s.erase(0,1);auto b=s.find('+');if(b!=s.npos){if(!identifiers(s.substr(b+1),false))return v;s=s.substr(0,b);}b=s.find('-');if(b!=s.npos){v.pre=s.substr(b+1);if(!identifiers(v.pre,true))return v;s=s.substr(0,b);}auto p=split(s,'.');if(p.size()!=3||!integer(p[0],v.major)||!integer(p[1],v.minor)||!integer(p[2],v.patch))return v;v.valid=true;return v;}
int SemVer::compare(const SemVer&o)const{for(auto p:{std::pair<unsigned,unsigned>{major,o.major},{minor,o.minor},{patch,o.patch}})if(p.first!=p.second)return p.first>p.second?1:-1;if(pre==o.pre)return 0;if(pre.empty())return 1;if(o.pre.empty())return -1;auto a=split(pre,'.'),b=split(o.pre,'.');for(size_t i=0;i<std::min(a.size(),b.size());++i){if(a[i]==b[i])continue;bool na=num(a[i]),nb=num(b[i]);if(na!=nb)return na?-1:1;if(na&&a[i].size()!=b[i].size())return a[i].size()>b[i].size()?1:-1;return a[i]>b[i]?1:-1;}return a.size()>b.size()?1:-1;}
}
