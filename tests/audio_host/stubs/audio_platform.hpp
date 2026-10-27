#pragma once
#include <algorithm>
#include <atomic>
#include <cassert>
#include <cstdint>
#include <cstring>
#include <deque>
#include <functional>
#include <stdexcept>
#include <vector>
using esp_err_t=int;
constexpr int ESP_OK=0,ESP_ERR_NO_MEM=-1,ESP_ERR_INVALID_STATE=-2;
#define ESP_ERROR_CHECK(value) do{if((value)!=ESP_OK)throw std::runtime_error("ESP_ERROR_CHECK");}while(false)
using portMUX_TYPE=int;
#define portMUX_INITIALIZER_UNLOCKED 0
inline int criticalDepth=0;
#define portENTER_CRITICAL(lock) do{(void)(lock);++criticalDepth;}while(false)
#define portEXIT_CRITICAL(lock) do{(void)(lock);assert(criticalDepth>0);--criticalDepth;}while(false)
using BaseType_t=int;
constexpr int pdTRUE=1;
struct MockQueue{unsigned capacity,itemSize;std::deque<std::vector<uint8_t>>items;};
using QueueHandle_t=MockQueue*;
inline QueueHandle_t xQueueCreate(unsigned capacity,unsigned itemSize){return new MockQueue{capacity,itemSize,{}};}
inline int xQueueReset(QueueHandle_t queue){queue->items.clear();return pdTRUE;}
inline unsigned uxQueueMessagesWaiting(QueueHandle_t queue){return queue->items.size();}
inline int xQueueSend(QueueHandle_t queue,const void*item,unsigned){if(queue->items.size()>=queue->capacity)return 0;const auto*p=static_cast<const uint8_t*>(item);queue->items.emplace_back(p,p+queue->itemSize);return pdTRUE;}
inline int xQueueReceive(QueueHandle_t queue,void*item,unsigned){if(queue->items.empty())return 0;std::memcpy(item,queue->items.front().data(),queue->itemSize);queue->items.pop_front();return pdTRUE;}
struct esp_timer_create_args_t{void(*callback)(void*)=nullptr;void*arg=nullptr;const char*name=nullptr;bool skip_unhandled_events=false;};
struct MockTimer{esp_timer_create_args_t args;bool active=false;unsigned period=0;};
using esp_timer_handle_t=MockTimer*;
inline MockTimer*createdTimer=nullptr;
inline unsigned timerStarts=0,timerStops=0,timerCallbacks=0;
inline std::function<void()>onTimerStop;
inline esp_err_t esp_timer_create(const esp_timer_create_args_t*args,esp_timer_handle_t*timer){*timer=createdTimer=new MockTimer{*args};return ESP_OK;}
inline esp_err_t esp_timer_start_periodic(esp_timer_handle_t timer,unsigned period){assert(criticalDepth>0);if(timer->active)return ESP_ERR_INVALID_STATE;timer->active=true;timer->period=period;++timerStarts;return ESP_OK;}
inline esp_err_t esp_timer_stop(esp_timer_handle_t timer){assert(criticalDepth>0);if(!timer->active)return ESP_ERR_INVALID_STATE;timer->active=false;++timerStops;if(onTimerStop){auto callback=std::move(onTimerStop);onTimerStop=nullptr;callback();}return ESP_OK;}
inline int64_t esp_timer_get_time(){return int64_t(timerCallbacks)*125;}
inline uint32_t esp_random(){static uint32_t next=0;return next++;}
inline void fireSample(){assert(createdTimer&&createdTimer->active);++timerCallbacks;createdTimer->args.callback(createdTimer->args.arg);assert(criticalDepth==0);}
inline void drainAudio(unsigned maximum=50000){while(createdTimer->active&&maximum--)fireSample();assert(!createdTimer->active);}
using gpio_num_t=int;
constexpr int GPIO_MODE_OUTPUT=1;
inline int gpio_set_level(gpio_num_t,int){return ESP_OK;}
inline int gpio_set_direction(gpio_num_t,int){return ESP_OK;}
constexpr int LEDC_LOW_SPEED_MODE=0,LEDC_CHANNEL_0=0,LEDC_TIMER_0=0,LEDC_TIMER_8_BIT=8,LEDC_AUTO_CLK=0,LEDC_INTR_DISABLE=0;
struct ledc_timer_config_t{int speed_mode=0,duty_resolution=0,timer_num=0,freq_hz=0,clk_cfg=0;};
struct ledc_channel_config_t{int gpio_num=0,speed_mode=0,channel=0,timer_sel=0,duty=0,intr_type=0;};
struct ledc_dev_t{bool enabled=false;int duty=128,idle=0;};
inline ledc_dev_t pwm;
inline ledc_timer_config_t configuredPwm;
inline unsigned llDutyWrites=0,llUpdates=0,driverStops=0;
inline std::vector<int>duties;
inline int ledc_timer_config(const ledc_timer_config_t*config){configuredPwm=*config;return ESP_OK;}
inline int ledc_channel_config(const ledc_channel_config_t*config){pwm.duty=config->duty;pwm.enabled=true;return ESP_OK;}
inline int ledc_stop(int,int,int idle){pwm.idle=idle;pwm.enabled=false;++driverStops;return ESP_OK;}
#define LEDC_LL_GET_HW() (&pwm)
inline void ledc_ll_set_duty_int_part(ledc_dev_t*hw,int,int,int duty){assert(criticalDepth>0);assert(duty>=8&&duty<=248);hw->duty=duty;++llDutyWrites;duties.push_back(duty);}
inline void ledc_ll_set_sig_out_en(ledc_dev_t*hw,int,int,bool enabled){assert(criticalDepth>0);hw->enabled=enabled;}
inline void ledc_ll_set_duty_start(ledc_dev_t*,int,int){assert(criticalDepth>0);}
inline void ledc_ll_ls_channel_update(ledc_dev_t*,int,int){assert(criticalDepth>0);++llUpdates;}
inline void ledc_ll_set_idle_level(ledc_dev_t*hw,int,int,int idle){assert(criticalDepth>0);hw->idle=idle;}
// No ledc_set_duty stub: the high-rate path must not reintroduce the C6
// driver's per-sample gamma reconfiguration/delays.
namespace remora{
inline constexpr int AudioPin=16,VibrationPin=17;
inline constexpr uint8_t meow0[]={128,160,210,180,125,80,45,80,128};
inline constexpr const uint8_t*Meows[]={meow0,meow0,meow0,meow0,meow0,meow0};
inline constexpr unsigned MeowLengths[]={9,9,9,9,9,9};
}
