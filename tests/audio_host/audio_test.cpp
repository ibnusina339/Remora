#include "stubs/audio_platform.hpp"
#include "../../firmware/esp32c6/components/remora_board/src/audio.cpp"
#include <iostream>
using namespace remora;
static void fresh(){audioStop();audioMenu(false);audioVolumes(70,35,75);audioStart();assert(!audioSamplingActive());assert(!pwm.enabled&&pwm.idle==0);}
int main(){
 fresh();
 assert(createdTimer->args.skip_unhandled_events);
 assert(configuredPwm.freq_hz==80000&&configuredPwm.duty_resolution==8);
 // A silent boot must never schedule the 8 kHz mixer or leave a carrier on.
 assert(timerStarts==0&&llDutyWrites==0);
 audioStart();assert(timerStarts==0);

 auto writes=llDutyWrites,callbacks=timerCallbacks;
 audioEffect("clear");assert(audioSamplingActive()&&createdTimer->period==125);
 drainAudio();assert(!audioSamplingActive()&&!pwm.enabled);
 assert(llDutyWrites>writes&&llDutyWrites-writes<timerCallbacks-callbacks);
 assert(std::adjacent_find(duties.begin(),duties.end())==duties.end());

 // Repeated menu synchronizations must retain one clock, with real mixing.
 fresh();auto starts=timerStarts;audioMenu(true);
 for(int i=0;i<20;++i)audioMenu(true);
 assert(timerStarts==starts+1);
 writes=llDutyWrites;
 for(int i=0;i<20000;++i)fireSample();
 assert(audioSamplingActive()&&llDutyWrites>writes+1000&&pwm.enabled);
 audioMenu(false);assert(!audioSamplingActive()&&!pwm.enabled);

 // Muting SFX drops suppressed work while leaving independent BGM active.
 fresh();audioMenu(true);audioEffect("off");audioMeow();fireSample();
 audioVolumes(70,35,0);assert(audioSamplingActive());
 assert(duration==0&&sample==-1&&uxQueueMessagesWaiting(notes)==0);
 audioMenu(false);assert(!audioSamplingActive()&&!pwm.enabled);
 starts=timerStarts;audioEffect("clear");audioMeow();assert(timerStarts==starts);
 audioVolumes(70,35,75);assert(!audioSamplingActive());
 audioVolumes(0,35,75);audioMenu(true);audioEffect("clear");
 assert(!audioSamplingActive()&&!pwm.enabled);
 audioVolumes(70,0,75);assert(!audioSamplingActive());
 audioEffect("confirm");drainAudio();assert(!pwm.enabled);
 audioVolumes(70,35,75);assert(audioSamplingActive());
 audioVolumes(0,35,75);assert(!audioSamplingActive()&&!pwm.enabled);
 audioMenu(false);audioVolumes(70,35,75);assert(!audioSamplingActive());

 // A queued effect arriving during idle-stop must get a fresh clock.
 fresh();audioEffect("step");
 onTimerStop=[](){audioEffect("confirm");};
 unsigned limit=1000;
 while(onTimerStop&&limit--)fireSample();
 assert(limit&&audioSamplingActive()&&createdTimer->active);
 assert(uxQueueMessagesWaiting(notes)>0);
 drainAudio();assert(!pwm.enabled);

 // A dispatched callback retained across stop cannot re-enable the output.
 fresh();audioMenu(true);audioMeow();fireSample();
 auto delayed=createdTimer->args.callback;
 audioStop();writes=llDutyWrites;delayed(nullptr);
 assert(llDutyWrites==writes&&!pwm.enabled&&!audioSamplingActive());
 audioStart();assert(!audioSamplingActive());audioEffect("clear");drainAudio();

 // Recorded samples use the same clock and stop without an extra stale cue.
 fresh();int previous=-1;
 for(int i=0;i<12;++i){audioMeow();assert(last!=previous);previous=last;assert(audioSamplingActive());drainAudio();assert(sample==-1&&!pwm.enabled);}
 audioVolumes(200,-20,200);assert(master==100&&music==0&&effects==100);
 audioStop();assert(!audioSamplingActive()&&!pwm.enabled&&criticalDepth==0);
 std::cout<<"Audio: silent boot, bounded LL updates, one sampling clock, mute, stop/wake race, pending callback and PCM lifecycle OK\n";
}
