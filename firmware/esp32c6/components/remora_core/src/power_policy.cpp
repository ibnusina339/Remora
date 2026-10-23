#include "power_policy.hpp"
namespace remora {
PowerPhase PowerPolicy::begin(int64_t now,PowerInput i){phase_=PowerPhase::Standby;last_usb_=i.usb;low_=charge_=false;combo_=peek_=-1;peek_consumed_=false;return update(now,i);}
PowerPhase PowerPolicy::update(int64_t now,PowerInput i){
 if(phase_==PowerPhase::Off)return phase_;
 bool was_low=low_,was_charge=charge_,inserted=i.usb&&!last_usb_;last_usb_=i.usb;
 if(i.percent<=5)low_=true;else if(i.percent>=10)low_=false;
 if(!i.usb)charge_=false;else if(i.percent>=80)charge_=true;
 if(i.critical)return phase_=PowerPhase::Cutoff;
 if(low_&&!was_low){phase_=PowerPhase::LowNotice;until_=now+2000;}
 else if(charge_&&!was_charge){phase_=PowerPhase::ChargeNotice;until_=now+2000;}
 else if(phase_==PowerPhase::Standby&&inserted){phase_=PowerPhase::UsbNotice;until_=now+2000;}
 if((phase_==PowerPhase::LowNotice||phase_==PowerPhase::ChargeNotice||phase_==PowerPhase::UsbNotice||phase_==PowerPhase::BatteryPeek)&&now>=until_)phase_=PowerPhase::Standby;
 if(i.keys!=1){peek_=-1;peek_consumed_=false;}
 if(phase_==PowerPhase::Standby&&i.usb&&i.keys==1&&!peek_consumed_){if(peek_<0)peek_=now;if(now-peek_>=2000){phase_=PowerPhase::BatteryPeek;until_=now+5000;peek_consumed_=true;}}
 else if(phase_!=PowerPhase::BatteryPeek)peek_=-1;
 if(phase_==PowerPhase::Standby&&!low_&&!charge_&&i.keys==5){if(combo_<0)combo_=now;if(now-combo_>=2000){phase_=PowerPhase::Play;combo_=-1;}}
 else combo_=-1;
 return phase_;
}
}
