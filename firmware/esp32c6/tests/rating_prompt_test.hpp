#pragma once
#include "rating_prompt.hpp"
#include <cassert>
static void testRatingPrompts(){
 using namespace remora;
 RatingPromptPolicy policy;RatingPlayStats play;
 policy.completed=2;assert(!policy.eligible(1000,2,false,false,0,play));
 policy.completed=3;for(int i=0;i<3;i++){play.observe(1,1000);}
 assert(policy.eligible(1000,2,false,false,0,play));policy.shown(0);play.shown(0);
 for(int i=0;i<12;i++){play.observe(1,1000);}policy.completed+=12;
 assert(!policy.eligible(1000,2,false,false,1799999,play));assert(policy.eligible(1000,2,false,false,1800000,play));
 assert(!policy.eligible(1000,2,false,true,1800000,play));policy.enabled=false;assert(!policy.eligible(1000,2,false,false,1800000,play));policy.enabled=true;
 RatingPlayStats changed;for(int i=0;i<3;i++){changed.observe(1,2000);}changed.shown(0);
 changed.observe(1,0);changed.observe(1,2000);changed.observe(1,2000);assert(!changed.changed());
 for(int i=0;i<3;i++){changed.observe(1,100);}assert(changed.changed());
 assert(!changed.ready(599999));assert(changed.ready(600000));
 policy.completed=30;assert(policy.eligible(100,0,false,false,600000,changed));changed.shown(600000);assert(!changed.changed());
 RatingPlayStats spike;for(int i=0;i<3;i++){spike.observe(1,1000);}spike.observe(1,100000);spike.observe(1,1000);spike.observe(1,1000);assert(!spike.changed());assert(spike.baseline==3000);for(int i=0;i<3;i++){spike.observe(1,1000);}assert(!spike.changed());
 RatingPlayStats difficulty;for(int i=0;i<3;i++){difficulty.observe(1,2000);}difficulty.shown(0);
 for(int i=0;i<6;i++){difficulty.observe(3,100);}assert(!difficulty.changed());assert(!difficulty.ready(600000));
 auto reboot=play;reboot.lastAskAt=-1;reboot.shown(0);reboot.lastAskAt=-1;
 for(int i=0;i<11;i++){reboot.observe(1,1000);}assert(!reboot.ready(0));reboot.observe(1,1000);assert(reboot.ready(0));
}
