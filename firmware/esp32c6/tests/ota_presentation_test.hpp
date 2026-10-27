#pragma once
#include "../components/remora_ui/include/ota_presentation.hpp"
#include <cassert>
static void testOtaPresentation(){
 using namespace remora;
 struct Fixture {bool busy,available;const char*version;const char*message;OtaPresentation expected;};
 const Fixture fixtures[]={
  {false,true,"v0.4.1","Ready to update to 0.4.1 version",OtaPresentation::Ready},
  {false,true,"0.4.1","Ready to update to 0.4.1 version",OtaPresentation::Ready},
  {true,true,"v0.4.1","Ready to update to 0.4.1 version",OtaPresentation::Message},
  {false,false,"v0.4.1","Ready to update to 0.4.1 version",OtaPresentation::Message},
  {false,true,"v0.4.2","Ready to update to 0.4.1 version",OtaPresentation::Message},
  {false,false,"0.4.1","Latest firmware",OtaPresentation::Latest},
  {true,false,"0.4.1","Latest firmware",OtaPresentation::Message},
  {false,true,"0.4.1","Latest firmware",OtaPresentation::Message},
  {false,true,"v0.4.1","Update dibatalkan; firmware lama tetap aktif.",OtaPresentation::Message},
  {false,true,"v0.4.1","Update gagal/diverifikasi gagal.",OtaPresentation::Message},
  {false,true,"v0.4.1","Update selesai. Restart...",OtaPresentation::Message},
 };
 for(const auto&f:fixtures)assert(otaPresentation(f.busy,f.available,f.version,f.message)==f.expected);
}
