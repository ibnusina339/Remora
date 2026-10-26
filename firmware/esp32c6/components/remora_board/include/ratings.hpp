#pragma once
#include <array>
#include <vector>
#include <string>
#include <cstdint>
namespace remora {
inline constexpr int RatingLimit=64;
inline constexpr const char* RatingQuestions[]={"DAYA TARIK TAMPILAN","KEUNIKAN REMORA","KEMUDAHAN NAVIGASI","KENYAMANAN KONTROL","KEPUASAN KESELURUHAN"};
inline constexpr const char* RatingSuggestions[]={"TERLALU MUDAH","TERLALU SULIT","TEMPO TERLALU CEPAT","KONTROL MEMBINGUNGKAN","PETUNJUK KURANG JELAS","TAMPILAN SULIT DIBACA","SUARA KURANG NYAMAN"};
struct RatingRecord {uint32_t id=0,owner=0;std::string name;int game=-1;std::array<uint8_t,5>stars{};uint8_t suggestions=0;};
std::vector<RatingRecord> loadRatings();
bool saveRating(RatingRecord&);
std::vector<std::string> ratingReport(const RatingRecord&);
}
