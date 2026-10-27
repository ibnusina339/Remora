#pragma once
#include "network_idle_policy.hpp"
#include <cassert>
static void testNetworkIdle(){
 using namespace remora;
 NetworkIdlePolicy outside;assert(!outside.due(0,true,false,false,false));assert(!outside.due(29999,true,false,false,false));assert(outside.due(30000,true,false,false,false));
 NetworkIdlePolicy screen;assert(!screen.due(0,true,true,false,false));assert(!screen.due(119999,true,true,false,false));screen.touch(119999);assert(!screen.due(239998,true,true,false,false));assert(screen.due(239999,true,true,false,false));
 NetworkIdlePolicy setup;assert(!setup.due(0,true,true,true,false));assert(!setup.due(299999,true,true,true,false));setup.touch(299999);assert(!setup.due(599998,true,true,true,false));assert(setup.due(599999,true,true,true,false));
 for(int operation=0;operation<3;operation++){
  NetworkIdlePolicy busy;assert(!busy.due(0,true,true,false,false));assert(!busy.due(600000,true,true,false,true));assert(!busy.due(719999,true,true,false,false));assert(busy.due(720000,true,true,false,false));
 }
 NetworkIdlePolicy leave;assert(!leave.due(0,true,true,false,false));assert(!leave.due(110000,true,false,false,false));assert(!leave.due(139999,true,false,false,false));assert(leave.due(140000,true,false,false,false));
 NetworkIdlePolicy off;assert(!off.due(0,false,false,false,true));assert(!off.due(600000,false,false,false,false));assert(!off.due(600001,true,false,false,false));assert(!off.due(630000,true,false,false,false));assert(off.due(630001,true,false,false,false));
}
