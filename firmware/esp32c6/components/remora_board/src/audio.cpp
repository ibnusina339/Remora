#include "board.hpp"
#include "meow_samples.hpp"
#include "driver/ledc.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_random.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include <cstring>
#include <atomic>
#include <initializer_list>
namespace remora {
struct CueNote{int hz,ms;};
static QueueHandle_t notes;static esp_timer_handle_t timer;
static std::atomic<int>master{70},music{35},effects{75},cue{0},duration{0},sample{-1},sampleAt{0};
static std::atomic<bool>menu{false};static bool running=false;static uint32_t phase=0,bassPhase=0,ticks=0;static int noteLength=0,last=-1;static int64_t vibUntil=0;
static void tick(void*){
 int mix=0,n=sample.load();if(n>=0){int p=sampleAt++;if(unsigned(p)<MeowLengths[n])mix+=(int(Meows[n][p])-128)*effects.load()/100;else sample=-1;}
 int remain=duration.load();if(remain<=0&&notes){CueNote next;if(xQueueReceive(notes,&next,0)==pdTRUE){cue=next.hz;noteLength=next.ms*8;duration=remain=noteLength;}}
 if(remain>0){duration=remain-1;phase+=uint32_t(cue.load())*65536/8000;int triangle=(phase>>8)&255;triangle=triangle<128?triangle:255-triangle;int envelope=std::min(160,std::min(remain,noteLength-remain));mix+=(triangle-64)*effects.load()/100*envelope/160;}
 if(menu){const int melody[]={330,392,494,392,330,294,262,0,294,349,440,349,294,262,247,0};int hz=melody[(ticks/1200)%16];bassPhase+=hz*65536/8000;int a=(bassPhase>>8)&255;mix+=(a<128?a-64:191-a)*music.load()/500;}
 ticks++;mix=std::clamp(mix*master.load()/100,-120,120);ledc_set_duty(LEDC_LOW_SPEED_MODE,LEDC_CHANNEL_0,128+mix);ledc_update_duty(LEDC_LOW_SPEED_MODE,LEDC_CHANNEL_0);
}
void audioStart(){if(running){return;}if(!notes){notes=xQueueCreate(12,sizeof(CueNote));ESP_ERROR_CHECK(notes?ESP_OK:ESP_ERR_NO_MEM);}ledc_timer_config_t t{};t.speed_mode=LEDC_LOW_SPEED_MODE;t.duty_resolution=LEDC_TIMER_8_BIT;t.timer_num=LEDC_TIMER_0;t.freq_hz=80000;t.clk_cfg=LEDC_AUTO_CLK;ESP_ERROR_CHECK(ledc_timer_config(&t));ledc_channel_config_t c{};c.gpio_num=AudioPin;c.speed_mode=LEDC_LOW_SPEED_MODE;c.channel=LEDC_CHANNEL_0;c.timer_sel=LEDC_TIMER_0;c.duty=128;c.intr_type=LEDC_INTR_DISABLE;ESP_ERROR_CHECK(ledc_channel_config(&c));if(!timer){esp_timer_create_args_t a{};a.callback=tick;a.name="pcm8k";ESP_ERROR_CHECK(esp_timer_create(&a,&timer));}ESP_ERROR_CHECK(esp_timer_start_periodic(timer,125));running=true;}
void audioStop(){if(!running){return;}menu=false;duration=0;sample=-1;esp_timer_stop(timer);if(notes)xQueueReset(notes);ledc_stop(LEDC_LOW_SPEED_MODE,LEDC_CHANNEL_0,0);gpio_set_level(gpio_num_t(VibrationPin),0);running=false;}
void audioVolumes(int a,int b,int c){master=a;music=b;effects=c;}
void audioMenu(bool enabled){menu=enabled;}
static void melody(std::initializer_list<CueNote> sequence){if(!running||!notes){return;}xQueueReset(notes);duration=0;for(const auto&note:sequence)xQueueSend(notes,&note,0);}
void audioEffect(const char*name){
 if(!running){return;}
 if(!std::strcmp(name,"fail"))melody({{392,110},{349,100},{294,140},{196,260}});
 else if(!std::strcmp(name,"recordFail"))melody({{659,80},{784,90},{988,120},{784,80},{392,100},{196,220}});
 else if(!std::strcmp(name,"clear"))melody({{523,90},{659,90},{784,90},{1046,180}});
 else if(!std::strcmp(name,"ratingSaved"))melody({{659,70},{784,90},{1046,170}});
 else if(!std::strcmp(name,"invite"))melody({{659,90},{784,130}});
 else if(!std::strcmp(name,"boot"))melody({{262,80},{330,80},{392,80},{523,140}});
 else if(!std::strcmp(name,"off"))melody({{523,120},{392,120},{262,160},{131,260}});
 else if(!std::strcmp(name,"portal"))melody({{330,45},{494,45},{740,65},{988,100}});
 else if(!std::strcmp(name,"bonus"))melody({{784,60},{988,60},{1175,110}});
 else if(!std::strcmp(name,"food"))melody({{784,60},{1046,110}});
 else if(!std::strcmp(name,"damage"))melody({{220,100},{147,170}});
 else if(!std::strcmp(name,"confirm"))melody({{392,55},{523,90}});
 else if(!std::strcmp(name,"back"))melody({{330,55},{262,70}});
 else if(!std::strcmp(name,"warning"))melody({{247,90},{220,110}});
 else if(!std::strcmp(name,"star"))melody({{784,45}});
 else if(!std::strcmp(name,"bounce"))melody({{740,45}});
 else if(!std::strcmp(name,"step"))melody({{196,35}});
 else if(!std::strcmp(name,"correct"))melody({{659,65},{784,65}});
 else if(!std::strcmp(name,"high"))melody({{880,170}});
 else if(!std::strcmp(name,"low"))melody({{220,170}});
 else melody({{520,55}});
}
void audioMeow(){if(!running){return;}int n=esp_random()%(last<0?6:5);if(n>=last&&last>=0)n++;last=n;sample=-1;sampleAt=0;sample=n;}
void vibrate(int milliseconds){if(milliseconds>0){gpio_set_direction(gpio_num_t(VibrationPin),GPIO_MODE_OUTPUT);gpio_set_level(gpio_num_t(VibrationPin),1);vibUntil=esp_timer_get_time()+milliseconds*1000;}else if(vibUntil&&esp_timer_get_time()>=vibUntil){gpio_set_level(gpio_num_t(VibrationPin),0);vibUntil=0;}}
}
