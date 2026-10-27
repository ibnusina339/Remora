#include "board.hpp"
#include "esp_random.h"
#include "nvs.h"
#include "nvs_flash.h"
#include "cJSON.h"
#include <algorithm>
#include <cstring>
namespace remora {
static UserProfile fresh(){UserProfile p;for(int i=0;i<GameCount;i++){p.difficulty[i]=1;for(int d=0;d<5;d++)p.records[i][d]=-1;}return p;}
Preferences defaults(){Preferences p;static_cast<UserProfile&>(p)=fresh();for(auto&u:p.profiles)u=fresh();p.profiles[DeveloperSlot].used=true;p.profiles[DeveloperSlot].tutorialDone=true;strcpy(p.profiles[DeveloperSlot].player,"XDAXA");p.profiles[DeveloperSlot].id=0x58444158;return p;}
static int val(cJSON*j,const char*k,int fallback){auto v=cJSON_GetObjectItemCaseSensitive(j,k);return cJSON_IsNumber(v)?v->valueint:fallback;}
static bool flag(cJSON*j,const char*k,bool fallback){auto v=cJSON_GetObjectItemCaseSensitive(j,k);return cJSON_IsBool(v)?cJSON_IsTrue(v):fallback;}
static cJSON*read(nvs_handle_t n,const char*key){size_t size=0;if(nvs_get_str(n,key,nullptr,&size)!=ESP_OK||size>16384)return cJSON_CreateObject();std::string s(size,'\0');if(nvs_get_str(n,key,s.data(),&size)!=ESP_OK)return cJSON_CreateObject();auto j=cJSON_Parse(s.c_str());return j?j:cJSON_CreateObject();}
static void put(nvs_handle_t n,const char*key,cJSON*j){char*s=cJSON_PrintUnformatted(j);if(s){nvs_set_str(n,key,s);cJSON_free(s);}cJSON_Delete(j);}
static void set(cJSON*j,const char*k,int v){cJSON_DeleteItemFromObject(j,k);cJSON_AddNumberToObject(j,k,v);}
static void setBool(cJSON*j,const char*k,bool v){cJSON_DeleteItemFromObject(j,k);cJSON_AddBoolToObject(j,k,v);}
static void setText(cJSON*j,const char*k,const char*v){cJSON_DeleteItemFromObject(j,k);cJSON_AddStringToObject(j,k,v);}
// Compact optional fields preserve profiles written before v0.3.0.
static void loadRatingPlay(cJSON*j,UserProfile&u){
 auto all=cJSON_GetObjectItem(j,"ratingPlay");
 for(int g=0;g<GameCount;g++){
  auto row=cJSON_GetArrayItem(all,g);auto& p=u.ratingPlay[g];
  auto get=[&](int i,int fallback,int lo,int hi){auto v=cJSON_GetArrayItem(row,i);return cJSON_IsNumber(v)?std::clamp(v->valueint,lo,hi):fallback;};
  p.games=get(0,0,0,2000000000);p.lastAsk=get(1,0,0,p.games);p.changeAt=get(2,0,0,p.games);
  p.difficulty=get(3,-1,-1,4);p.baseline=get(4,0,0,30000000);p.recent=get(5,0,0,30000000);
  p.baselineCount=get(6,0,0,3);p.recentCount=get(7,0,0,2);p.prompted=get(8,0,0,1);p.lastAskAt=-1;
  p.recentMin=get(9,10000000,0,10000000);p.recentMax=get(10,0,0,10000000);
  if(cJSON_GetArraySize(row)<11){p.recent=0;p.recentCount=0;}
 }
}
static void saveRatingPlay(cJSON*j,const UserProfile&u){
 cJSON_DeleteItemFromObject(j,"ratingPlay");auto all=cJSON_AddArrayToObject(j,"ratingPlay");
 for(const auto& p:u.ratingPlay){
  auto row=cJSON_CreateArray();
  const int values[]={int(p.games),int(p.lastAsk),int(p.changeAt),p.difficulty,p.baseline,p.recent,p.baselineCount,p.recentCount,p.prompted,p.recentMin,p.recentMax};
  for(int value:values){cJSON_AddItemToArray(row,cJSON_CreateNumber(value));}
  cJSON_AddItemToArray(all,row);
 }
}

static void loadUser(cJSON*j,UserProfile&u){u=fresh();auto id=cJSON_GetObjectItem(j,"id");u.id=cJSON_IsNumber(id)?uint32_t(id->valuedouble):0;u.used=flag(j,"used",false);u.tutorialDone=flag(j,"tutorialDone",false);auto name=cJSON_GetObjectItem(j,"name");if(cJSON_IsString(name))strncpy(u.player,name->valuestring,7);u.player[7]=0;u.autoOffMinutes=validAutoOff(val(j,"autoOffMinutes",5));u.master=std::clamp(val(j,"master",70),0,100);u.bgm=std::clamp(val(j,"bgm",35),0,100);u.sfx=std::clamp(val(j,"sfx",75),0,100);u.brightness=std::clamp(val(j,"brightness",100),10,100);u.leds=std::clamp(val(j,"leds",60),0,100);u.ocean=flag(j,"ocean",false);u.mono=flag(j,"mono",false);u.ratingAsked=std::clamp(val(j,"ratingAsked",0),0,2047);u.games=std::max(0,val(j,"games",0));u.wins=std::max(0,val(j,"wins",0));loadRatingPlay(j,u);auto d=cJSON_GetObjectItem(j,"difficulty"),r=cJSON_GetObjectItem(j,"records"),c=cJSON_GetObjectItem(j,"phrases");for(int g=0;g<GameCount;g++){u.phraseCounters[g]=std::max(0,val(c,GameIds[g],0));auto v=cJSON_GetObjectItem(d,GameIds[g]);if(cJSON_IsNumber(v))u.difficulty[g]=std::clamp(v->valueint,0,4);auto row=cJSON_GetObjectItem(r,GameIds[g]);for(int i=0;i<5;i++){v=cJSON_GetArrayItem(row,i);if(cJSON_IsNumber(v))u.records[g][i]=v->valueint;}}}
static void saveUser(cJSON*j,const UserProfile&u){cJSON_DeleteItemFromObject(j,"id");cJSON_AddNumberToObject(j,"id",u.id);setBool(j,"used",u.used);setBool(j,"tutorialDone",u.tutorialDone);setText(j,"name",u.player);set(j,"autoOffMinutes",validAutoOff(u.autoOffMinutes));set(j,"master",u.master);set(j,"bgm",u.bgm);set(j,"sfx",u.sfx);set(j,"brightness",u.brightness);set(j,"leds",u.leds);setBool(j,"ocean",u.ocean);setBool(j,"mono",u.mono);set(j,"ratingAsked",u.ratingAsked);set(j,"games",u.games);set(j,"wins",u.wins);saveRatingPlay(j,u);cJSON_DeleteItemFromObject(j,"difficulty");auto d=cJSON_AddObjectToObject(j,"difficulty");cJSON_DeleteItemFromObject(j,"records");auto r=cJSON_AddObjectToObject(j,"records");cJSON_DeleteItemFromObject(j,"phrases");auto c=cJSON_AddObjectToObject(j,"phrases");for(int g=0;g<GameCount;g++){cJSON_AddNumberToObject(c,GameIds[g],u.phraseCounters[g]);cJSON_AddNumberToObject(d,GameIds[g],u.difficulty[g]);auto row=cJSON_AddArrayToObject(r,GameIds[g]);for(int i=0;i<5;i++)cJSON_AddItemToArray(row,cJSON_CreateNumber(u.records[g][i]));}}
void load(Preferences&p){p=defaults();nvs_handle_t n;if(nvs_open_from_partition("userdata","remora",NVS_READONLY,&n)!=ESP_OK)return;auto j=read(n,"device");p.active=std::clamp(val(j,"active",0),0,ProfileCount-1);p.spiMHz=val(j,"spiMHz",10);p.spiPending=flag(j,"spiPending",false);p.firstLoginPending=flag(j,"firstLogin",true);p.ratingPrompt.enabled=flag(j,"ratingPrompts",true);p.ratingPrompt.completed=std::max(0,val(j,"ratingGames",0));p.ratingPrompt.lastPromptGame=std::max(0,val(j,"ratingLastGame",0));p.resumeMode=val(j,"resumeMode",-1);p.resumeDifficulty=val(j,"resumeDifficulty",1);p.resumeLevel=val(j,"resumeLevel",0);p.resumeScore=val(j,"resumeScore",0);p.resumeClears=val(j,"resumeClears",0);cJSON_Delete(j);for(int i=0;i<ProfileCount;i++){char key[12];snprintf(key,sizeof(key),"profile%d",i);j=read(n,key);loadUser(j,p.profiles[i]);if(!p.profiles[i].id)p.profiles[i].id=i+1;cJSON_Delete(j);}nvs_close(n);p.profiles[DeveloperSlot].used=true;p.profiles[DeveloperSlot].tutorialDone=true;strcpy(p.profiles[DeveloperSlot].player,"XDAXA");p.profiles[DeveloperSlot].id=0x58444158;if(p.active==DeveloperSlot){p.active=0;for(int i=0;i<UserProfileCount;i++)if(p.profiles[i].used){p.active=i;break;}}static_cast<UserProfile&>(p)=p.profiles[p.active];if(p.spiPending||(p.spiMHz!=10&&p.spiMHz!=16&&p.spiMHz!=20&&p.spiMHz!=26&&p.spiMHz!=40)){p.spiMHz=10;p.spiPending=false;save(p);}}
void save(Preferences&p){p.profiles[p.active]=static_cast<UserProfile&>(p);nvs_handle_t n;if(nvs_open_from_partition("userdata","remora",NVS_READWRITE,&n)!=ESP_OK)return;auto j=read(n,"device");set(j,"schema",1);set(j,"active",p.active);set(j,"spiMHz",p.spiMHz);setBool(j,"spiPending",p.spiPending);setBool(j,"firstLogin",p.firstLoginPending);setBool(j,"ratingPrompts",p.ratingPrompt.enabled);set(j,"ratingGames",p.ratingPrompt.completed);set(j,"ratingLastGame",p.ratingPrompt.lastPromptGame);set(j,"resumeMode",p.resumeMode);set(j,"resumeDifficulty",p.resumeDifficulty);set(j,"resumeLevel",p.resumeLevel);set(j,"resumeScore",p.resumeScore);set(j,"resumeClears",p.resumeClears);put(n,"device",j);for(int i=0;i<ProfileCount;i++){char key[12];snprintf(key,sizeof(key),"profile%d",i);j=read(n,key);saveUser(j,i==p.active?static_cast<const UserProfile&>(p):p.profiles[i]);put(n,key,j);}nvs_commit(n);nvs_close(n);}
bool switchProfile(Preferences&p,int slot,bool developer){if(slot==DeveloperSlot&&!developer)return false;if(slot<0||slot>=ProfileCount||!p.profiles[slot].used)return false;p.profiles[p.active]=static_cast<UserProfile&>(p);p.active=slot;static_cast<UserProfile&>(p)=p.profiles[slot];p.resumeMode=-1;save(p);return true;}
bool addProfile(Preferences&p,int slot){if(slot<0||slot>=UserProfileCount||p.profiles[slot].used)return false;p.profiles[p.active]=static_cast<UserProfile&>(p);p.active=slot;static_cast<UserProfile&>(p)=fresh();p.used=true;p.id=esp_random();p.player[0]=0;p.firstLoginPending=false;p.resumeMode=-1;save(p);return true;}
bool removeProfile(Preferences&p,int slot){if(slot<0||slot>=UserProfileCount)return false;p.profiles[p.active]=static_cast<UserProfile&>(p);p.profiles[slot]=fresh();if(slot==p.active){int next=-1;for(int i=0;i<UserProfileCount;i++)if(p.profiles[i].used){next=i;break;}p.active=next<0?0:next;static_cast<UserProfile&>(p)=next<0?fresh():p.profiles[next];if(next<0)p.firstLoginPending=true;}p.resumeMode=-1;save(p);return true;}
void lockDeveloper(Preferences&p){if(p.active!=DeveloperSlot){return;}p.profiles[DeveloperSlot]=static_cast<UserProfile&>(p);int next=0;for(int i=0;i<UserProfileCount;i++)if(p.profiles[i].used){next=i;break;}p.active=next;static_cast<UserProfile&>(p)=p.profiles[next];if(!p.used)p.firstLoginPending=true;save(p);}

}
