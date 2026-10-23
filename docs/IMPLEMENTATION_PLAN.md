# REMORA implementation scope

- UI: larger paginated guides, direct Retry, per-game difficulty, held carousel navigation.
- Rev K2 power: 5% low latch / 10% recovery, USB 80% game lock, KEY1+KEY3 2-second start, exact key mask, light sleep.
- User addition: charging standby + KEY1 only 2 seconds -> battery percentage 5 seconds; no USB -> ignore KEY1 alone.
- Firmware: ESP-IDF + LVGL 9.2, native game modules, ST7789 SPI DMA, SK6812 RMT, PWM PAM8302A audio, vibration, ADC, NVS, Wi-Fi, HTTPS GitHub Releases OTA.
- SPI trial: 10 MHz default, 16/20/26/40 MHz experimental, confirmation timeout, reboot/error recovery.
- No game balancing changes; existing browser rules remain the reference.
- Physical board and GPIO23 pad must still be verified; no claim of hardware validation.

- Five local profiles; First Login creates a new player, requires a free slot, persists a three-second shutdown state, and greets the selected name in a typewriter tutorial with the neutral sitting cat.
- Cloud cancelled by user; NVS userdata persists separately from OTA application slots.
