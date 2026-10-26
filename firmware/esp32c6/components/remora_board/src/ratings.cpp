#include "ratings.hpp"
#include "game_engine.hpp"
#include "nvs.h"
#include "cJSON.h"
#include <algorithm>
namespace remora {
std::vector<RatingRecord> loadRatings(){
 std::vector<RatingRecord> out;nvs_handle_t n;
 if(nvs_open_from_partition("userdata","feedback",NVS_READONLY,&n)!=ESP_OK)return out;
 size_t size=0;if(nvs_get_str(n,"ratings",nullptr,&size)!=ESP_OK||size>24576){nvs_close(n);return out;}
 std::string raw(size,'\0');auto err=nvs_get_str(n,"ratings",raw.data(),&size);nvs_close(n);if(err!=ESP_OK)return out;
 auto all=cJSON_Parse(raw.c_str());if(!cJSON_IsArray(all)){cJSON_Delete(all);return out;}
 for(int i=0;i<std::min(RatingLimit,cJSON_GetArraySize(all));i++){
  auto j=cJSON_GetArrayItem(all,i);RatingRecord r;
  auto id=cJSON_GetObjectItem(j,"id"),owner=cJSON_GetObjectItem(j,"owner"),name=cJSON_GetObjectItem(j,"name"),game=cJSON_GetObjectItem(j,"game"),stars=cJSON_GetObjectItem(j,"stars"),tips=cJSON_GetObjectItem(j,"tips");
  if(!cJSON_IsNumber(id)||!cJSON_IsNumber(owner)||!cJSON_IsString(name)||!cJSON_IsNumber(game))continue;
  r.id=id->valuedouble;r.owner=owner->valuedouble;r.name=std::string(name->valuestring).substr(0,7);r.game=game->valueint;if(r.game<-1||r.game>=GameCount)continue;
  bool valid=true;for(int k=0;k<(r.game<0?5:1);k++){auto v=cJSON_GetArrayItem(stars,k);if(!cJSON_IsNumber(v)||v->valueint<1||v->valueint>10){valid=false;break;}r.stars[k]=v->valueint;}
  if(!valid){continue;}
  r.suggestions=cJSON_IsNumber(tips)?tips->valueint&127:0;out.push_back(r);
 }
 cJSON_Delete(all);return out;
}
bool saveRating(RatingRecord&r){
 if(r.game<-1||r.game>=GameCount||__builtin_popcount(r.suggestions)>2)return false;
 for(int i=0;i<(r.game<0?5:1);i++)if(r.stars[i]<1||r.stars[i]>10)return false;
 auto records=loadRatings();if(records.size()>=RatingLimit){return false;}r.id=1;for(auto&v:records)r.id=std::max(r.id,v.id+1);records.push_back(r);
 auto all=cJSON_CreateArray();for(auto&v:records){auto j=cJSON_CreateObject();cJSON_AddNumberToObject(j,"id",v.id);cJSON_AddNumberToObject(j,"owner",v.owner);cJSON_AddStringToObject(j,"name",v.name.c_str());cJSON_AddNumberToObject(j,"game",v.game);cJSON_AddNumberToObject(j,"tips",v.suggestions);auto stars=cJSON_AddArrayToObject(j,"stars");for(int i=0;i<(v.game<0?5:1);i++)cJSON_AddItemToArray(stars,cJSON_CreateNumber(v.stars[i]));cJSON_AddItemToArray(all,j);}
 char*raw=cJSON_PrintUnformatted(all);cJSON_Delete(all);if(!raw){return false;}nvs_handle_t n;bool ok=false;
 if(nvs_open_from_partition("userdata","feedback",NVS_READWRITE,&n)==ESP_OK){ok=nvs_set_str(n,"ratings",raw)==ESP_OK&&nvs_commit(n)==ESP_OK;nvs_close(n);}cJSON_free(raw);return ok;
}
std::vector<std::string> ratingReport(const RatingRecord&r){
 std::vector<std::string> rows={"RATE "+std::to_string(r.id),"DARI "+r.name,"ID "+std::to_string(r.owner)};
 if(r.game>=0){rows.push_back(GameNames[r.game]);rows.push_back("STARS:"+std::to_string(r.stars[0]));rows.push_back("SARAN");bool any=false;for(int i=0;i<7;i++)if(r.suggestions&(1<<i)){rows.push_back(RatingSuggestions[i]);any=true;}if(!any)rows.push_back("TIDAK ADA SARAN DIPILIH");}
 else for(int i=0;i<5;i++){rows.push_back(RatingQuestions[i]);rows.push_back("STARS:"+std::to_string(r.stars[i]));}
 return rows;
}

} // namespace remora
