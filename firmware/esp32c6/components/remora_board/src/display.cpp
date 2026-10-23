#include "board.hpp"
#include "esp_check.h"
#include "driver/spi_master.h"
#include "esp_lcd_io_spi.h"
#include "esp_lcd_panel_io.h"
#include "esp_system.h"
#include "esp_lcd_panel_vendor.h"
#include "esp_heap_caps.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "sdkconfig.h"
namespace remora {
lv_display_t*display=nullptr;static esp_lcd_panel_handle_t panel;static esp_lcd_panel_io_handle_t io;static bool bus=false;static std::atomic<bool>inflight{false};static std::atomic<uint32_t>errors{0},frames{0};static int mhz=10;static int64_t fpsAt=0;static float fps=0;
static bool completed(esp_lcd_panel_io_handle_t,esp_lcd_panel_io_event_data_t*,void*){inflight=false;lv_display_flush_ready(display);return false;}
static void flush(lv_display_t*d,const lv_area_t*a,uint8_t*p){if(!panel||!peripheralsOn()){lv_display_flush_ready(d);return;}size_t count=(a->x2-a->x1+1)*(a->y2-a->y1+1);lv_draw_sw_rgb565_swap(p,count);inflight=true;if(lv_display_flush_is_last(d))frames++;auto err=esp_lcd_panel_draw_bitmap(panel,a->x1,a->y1,a->x2+1,a->y2+1,p);if(err!=ESP_OK){errors++;inflight=false;lv_display_flush_ready(d);}}
bool displayWait(){auto until=esp_timer_get_time()+500000;while(inflight&&esp_timer_get_time()<until)vTaskDelay(pdMS_TO_TICKS(1));if(inflight){errors++;return false;}return true;}
esp_err_t displayStart(int clock){displayStop();spi_bus_config_t b{};b.sclk_io_num=TftClock;b.mosi_io_num=TftMosi;b.miso_io_num=-1;b.quadwp_io_num=-1;b.quadhd_io_num=-1;b.max_transfer_sz=320*16*2;auto e=spi_bus_initialize(SPI2_HOST,&b,SPI_DMA_CH_AUTO);if(e!=ESP_OK)return e;bus=true;esp_lcd_panel_io_spi_config_t c{};c.dc_gpio_num=TftDc;c.cs_gpio_num=-1;c.pclk_hz=clock*1000000;c.lcd_cmd_bits=8;c.lcd_param_bits=8;c.spi_mode=0;c.trans_queue_depth=4;esp_lcd_panel_io_callbacks_t callbacks{};callbacks.on_color_trans_done=completed;e=esp_lcd_new_panel_io_spi((esp_lcd_spi_bus_handle_t)SPI2_HOST,&c,&io);if(e!=ESP_OK)return e;esp_lcd_panel_io_register_event_callbacks(io,&callbacks,nullptr);esp_lcd_panel_dev_config_t dev{};dev.reset_gpio_num=TftReset;dev.rgb_ele_order=LCD_RGB_ELEMENT_ORDER_RGB;dev.bits_per_pixel=16;e=esp_lcd_new_panel_st7789(io,&dev,&panel);if(e!=ESP_OK)return e;ESP_RETURN_ON_ERROR(esp_lcd_panel_reset(panel),"lcd","reset");ESP_RETURN_ON_ERROR(esp_lcd_panel_init(panel),"lcd","init");esp_lcd_panel_swap_xy(panel,true);esp_lcd_panel_mirror(panel,
#ifdef CONFIG_REMORA_TFT_MIRROR_X
 true,
#else
 false,
#endif

#ifdef CONFIG_REMORA_TFT_MIRROR_Y
 true
#else
 false
#endif
 );esp_lcd_panel_invert_color(panel,
#ifdef CONFIG_REMORA_TFT_INVERT
 true
#else
 false
#endif
 );esp_lcd_panel_disp_on_off(panel,true);mhz=clock;return ESP_OK;}
void displayStop(){if(!displayWait()){esp_restart();return;}if(panel){esp_lcd_panel_del(panel);panel=nullptr;}if(io){esp_lcd_panel_io_del(io);io=nullptr;}if(bus){spi_bus_free(SPI2_HOST);bus=false;}}
void displayInitLvgl(){lv_init();lv_tick_set_cb([]()->uint32_t{return esp_timer_get_time()/1000;});display=lv_display_create(320,240);auto a=heap_caps_malloc(320*16*2,MALLOC_CAP_DMA|MALLOC_CAP_INTERNAL),b=heap_caps_malloc(320*16*2,MALLOC_CAP_DMA|MALLOC_CAP_INTERNAL);assert(a&&b);lv_display_set_color_format(display,LV_COLOR_FORMAT_RGB565);lv_display_set_buffers(display,a,b,320*16*2,LV_DISPLAY_RENDER_MODE_PARTIAL);lv_display_set_flush_cb(display,flush);}
int displayClock(){return mhz;}uint32_t displayErrors(){return errors.load();}
float displayFps(){auto now=esp_timer_get_time();if(now-fpsAt>=1000000){fps=frames.exchange(0)*1000000.f/(now-fpsAt);fpsAt=now;}return fps;}
}
