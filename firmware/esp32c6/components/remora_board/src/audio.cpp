#include "board.hpp"
#include "meow_samples.hpp"
#include "driver/ledc.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_random.h"
#include <cstring>
#include <atomic>
namespace remora {
static esp_timer_handle_t timer;static std::atomic<int>master{70},music{35},effects{75},cue{0},duration{0},sample{-1},sampleAt{0};static std::atomic<bool>menu{false};static bool running=false;static uint32_t phase=0,bassPhase=0,ticks=0;static int last=-1;static int64_t vibUntil=0;
static void tick(void*){int mix=0,n=sample.load();if(n>=0){int p=sampleAt++;if(unsigned(p)<MeowLengths[n])mix+=(int(Meows[n][p])-128)*effects.load()/100;else sample=-1;}int remain=duration.load();if(remain>0){duration=remain-1;phase+=uint32_t(cue.load())*65536/8000;int triangle=(phase>>8)&255;triangle=triangle<128?triangle:255-triangle;mix+=(triangle-64)*effects.load()/100*std::min(remain,160)/160;}if(menu){const int melody[]={330,392,494,392,330,294,262,0,294,349,440,349,294,262,247,0};int hz=melody[(ticks/1200)%16];bassPhase+=hz*65536/8000;int a=(bassPhase>>8)&255;mix+=(a<128?a-64:191-a)*music.load()/500;}ticks++;mix=std::clamp(mix*master.load()/100,-120,120);ledc_set_duty(LEDC_LOW_SPEED_MODE,LEDC_CHANNEL_0,128+mix);ledc_update_duty(LEDC_LOW_SPEED_MODE,LEDC_CHANNEL_0);}
void audioStart(){if(running)return;ledc_timer_config_t t{};t.speed_mode=LEDC_LOW_SPEED_MODE;t.duty_resolution=LEDC_TIMER_8_BIT;t.timer_num=LEDC_TIMER_0;t.freq_hz=80000;t.clk_cfg=LEDC_AUTO_CLK;ESP_ERROR_CHECK(ledc_timer_config(&t));ledc_channel_config_t c{};c.gpio_num=AudioPin;c.speed_mode=LEDC_LOW_SPEED_MODE;c.channel=LEDC_CHANNEL_0;c.timer_sel=LEDC_TIMER_0;c.duty=128;c.intr_type=LEDC_INTR_DISABLE;ESP_ERROR_CHECK(ledc_channel_config(&c));if(!timer){esp_timer_create_args_t a{};a.callback=tick;a.name="pcm8k";ESP_ERROR_CHECK(esp_timer_create(&a,&timer));}ESP_ERROR_CHECK(esp_timer_start_periodic(timer,125));running=true;}
void audioStop(){if(!running)return;menu=false;duration=0;sample=-1;esp_timer_stop(timer);ledc_stop(LEDC_LOW_SPEED_MODE,LEDC_CHANNEL_0,0);gpio_set_level(gpio_num_t(VibrationPin),0);running=false;}
void audioVolumes(int a,int b,int c){master=a;music=b;effects=c;}
void audioMenu(bool enabled){menu=enabled;}
void audioEffect(const char*name){if(!running)return;int hz=!std::strcmp(name,"high")?880:!std::strcmp(name,"low")?220:!std::strcmp(name,"fail")?160:!std::strcmp(name,"clear")?880:!std::strcmp(name,"back")?330:!std::strcmp(name,"food")?990:!std::strcmp(name,"bounce")?660:520;cue=hz;duration=!std::strcmp(name,"fail")?2000:!std::strcmp(name,"clear")?1800:650;}
void audioMeow(){if(!running)return;int n=esp_random()%(last<0?6:5);if(n>=last&&last>=0)n++;last=n;sample=-1;sampleAt=0;sample=n;}
void vibrate(int milliseconds){if(milliseconds>0){gpio_set_direction(gpio_num_t(VibrationPin),GPIO_MODE_OUTPUT);gpio_set_level(gpio_num_t(VibrationPin),1);vibUntil=esp_timer_get_time()+milliseconds*1000;}else if(vibUntil&&esp_timer_get_time()>=vibUntil){gpio_set_level(gpio_num_t(VibrationPin),0);vibUntil=0;}}
}
