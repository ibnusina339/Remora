idf_component_register(SRCS "src/pixel_ui.cpp" INCLUDE_DIRS "include" REQUIRES remora_board remora_core lvgl esp_timer)
target_compile_features(${COMPONENT_LIB} PUBLIC cxx_std_17)
