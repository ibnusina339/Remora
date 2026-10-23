#include "board.hpp"
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_sleep.h"
#include "esp_timer.h"
#include "led_strip.h"
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
namespace remora {
static int ledPrevious=-1;static std::array<uint32_t,6>ledLast{};
static adc_oneshot_unit_handle_t adc;static adc_cali_handle_t cal;static bool calibrated=false,on=false;static led_strip_handle_t strip=nullptr;
void earlyInit(){gpio_hold_dis(gpio_num_t(HoldPin));gpio_set_direction(gpio_num_t(HoldPin),GPIO_MODE_OUTPUT);gpio_set_level(gpio_num_t(HoldPin),1);gpio_set_direction(gpio_num_t(PeripheralPin),GPIO_MODE_OUTPUT);gpio_set_level(gpio_num_t(PeripheralPin),0);for(int n:{AudioPin,VibrationPin,TftClock,TftMosi,TftDc,TftReset,CONFIG_REMORA_LED_PIN}){gpio_reset_pin(gpio_num_t(n));gpio_set_direction(gpio_num_t(n),GPIO_MODE_OUTPUT);gpio_set_level(gpio_num_t(n),0);}for(int n:Keys){gpio_set_direction(gpio_num_t(n),GPIO_MODE_INPUT);gpio_pullup_en(gpio_num_t(n));gpio_pulldown_dis(gpio_num_t(n));}gpio_set_direction(gpio_num_t(UsbPin),GPIO_MODE_INPUT);gpio_set_pull_mode(gpio_num_t(UsbPin),GPIO_FLOATING);adc_oneshot_unit_init_cfg_t unit{};unit.unit_id=ADC_UNIT_1;ESP_ERROR_CHECK(adc_oneshot_new_unit(&unit,&adc));adc_oneshot_chan_cfg_t channel{};channel.atten=ADC_ATTEN_DB_6;channel.bitwidth=ADC_BITWIDTH_DEFAULT;ESP_ERROR_CHECK(adc_oneshot_config_channel(adc,ADC_CHANNEL_0,&channel));
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
 adc_cali_curve_fitting_config_t cfg{};cfg.unit_id=ADC_UNIT_1;cfg.chan=ADC_CHANNEL_0;cfg.atten=ADC_ATTEN_DB_6;cfg.bitwidth=ADC_BITWIDTH_DEFAULT;calibrated=adc_cali_create_scheme_curve_fitting(&cfg,&cal)==ESP_OK;
#endif
}
uint8_t readKeys(){uint8_t mask=0;for(int i=0;i<6;i++)if(!gpio_get_level(gpio_num_t(Keys[i])))mask|=1<<i;return mask;}
bool usbPresent(){return gpio_get_level(gpio_num_t(UsbPin))==0;}
Battery sampleBattery(){int total=0;for(int i=0;i<16;i++){int v=0;if(adc_oneshot_read(adc,ADC_CHANNEL_0,&v)!=ESP_OK)return {};total+=v;}int raw=total/16,mv=0;if(!calibrated||adc_cali_raw_to_voltage(cal,raw,&mv)!=ESP_OK)return {};mv=int(int64_t(mv)*147*CONFIG_REMORA_ADC_SCALE_PERMILLE/47/1000);if(mv<2000||mv>4600)return {};static float filtered=0;filtered=filtered?filtered*.75f+mv*.25f:mv;mv=int(filtered);const int curve[][2]={{3300,0},{3500,10},{3650,20},{3750,40},{3850,60},{3950,75},{4050,90},{4150,100}};int percent=mv>=4150?100:0;for(int i=1;i<8;i++)if(mv<=curve[i][0]){int a=curve[i-1][0],b=curve[i][0];percent=std::clamp(curve[i-1][1]+(mv-a)*(curve[i][1]-curve[i-1][1])/(b-a),0,100);break;}static int criticalCount=0;criticalCount=mv<=CONFIG_REMORA_CRITICAL_MV?criticalCount+1:0;return {mv,percent,true,criticalCount>=3};}
bool peripheralsOn(){return on;}
void peripherals(bool enable){if(on==enable)return;if(enable){gpio_set_level(gpio_num_t(PeripheralPin),1);vTaskDelay(pdMS_TO_TICKS(30));on=true;ledPrevious=-1;led_strip_config_t cfg{};cfg.strip_gpio_num=CONFIG_REMORA_LED_PIN;cfg.max_leds=6;cfg.led_model=LED_MODEL_SK6812;cfg.color_component_format=LED_STRIP_COLOR_COMPONENT_FMT_GRB;led_strip_rmt_config_t rmt{};rmt.clk_src=RMT_CLK_SRC_DEFAULT;rmt.resolution_hz=10000000;ESP_ERROR_CHECK(led_strip_new_rmt_device(&cfg,&rmt,&strip));audioStart();}else{displayWait();displayStop();audioStop();if(strip){led_strip_clear(strip);led_strip_del(strip);strip=nullptr;}gpio_set_level(gpio_num_t(PeripheralPin),0);for(int n:{AudioPin,VibrationPin,TftClock,TftMosi,TftDc,TftReset,CONFIG_REMORA_LED_PIN}){gpio_reset_pin(gpio_num_t(n));gpio_set_direction(gpio_num_t(n),GPIO_MODE_OUTPUT);gpio_set_level(gpio_num_t(n),0);}on=false;}}
void setLeds(const std::array<uint32_t,6>&colors,int brightness){if(!strip||!on)return;if(colors==ledLast&&brightness==ledPrevious)return;ledLast=colors;ledPrevious=brightness;for(int i=0;i<6;i++)led_strip_set_pixel(strip,i,((colors[i]>>16)&255)*brightness/100,((colors[i]>>8)&255)*brightness/100,(colors[i]&255)*brightness/100);led_strip_refresh(strip);}
void fullCutoff(){peripherals(false);networkStop();gpio_hold_dis(gpio_num_t(HoldPin));gpio_set_level(gpio_num_t(HoldPin),0);}
void standbySleep(){networkStop();peripherals(false);gpio_set_level(gpio_num_t(HoldPin),1);gpio_hold_en(gpio_num_t(HoldPin));gpio_sleep_sel_dis(gpio_num_t(HoldPin));gpio_wakeup_disable(gpio_num_t(UsbPin));gpio_wakeup_disable(gpio_num_t(Keys[0]));gpio_wakeup_disable(gpio_num_t(Keys[2]));int level=gpio_get_level(gpio_num_t(UsbPin));gpio_wakeup_enable(gpio_num_t(UsbPin),level?GPIO_INTR_LOW_LEVEL:GPIO_INTR_HIGH_LEVEL);uint8_t keys=readKeys();if(keys==0){gpio_wakeup_enable(gpio_num_t(Keys[0]),GPIO_INTR_LOW_LEVEL);gpio_wakeup_enable(gpio_num_t(Keys[2]),GPIO_INTR_LOW_LEVEL);}esp_sleep_enable_gpio_wakeup();esp_sleep_enable_timer_wakeup(keys?20000:2000000);esp_light_sleep_start();gpio_hold_dis(gpio_num_t(HoldPin));}
}
