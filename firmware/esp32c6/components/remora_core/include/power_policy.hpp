#pragma once
#include <cstdint>
namespace remora {
enum class PowerPhase { Off, Standby, Play, LowNotice, ChargeNotice, UsbNotice, BatteryPeek, Cutoff };
struct PowerInput { bool usb=false; int percent=0; uint8_t keys=0; bool critical=false; };
class PowerPolicy {
 PowerPhase phase_=PowerPhase::Off;
 int64_t until_=0,combo_=-1,peek_=-1;
 bool last_usb_=false,low_=false,charge_=false,peek_consumed_=false;
public:
 PowerPhase begin(int64_t now,PowerInput input);
 PowerPhase update(int64_t now,PowerInput input);
 void standby(){phase_=PowerPhase::Standby;combo_=peek_=-1;}
 void off(){phase_=PowerPhase::Off;}
 PowerPhase phase()const{return phase_;}
 bool low()const{return low_;} bool charge()const{return charge_;}
};
}
