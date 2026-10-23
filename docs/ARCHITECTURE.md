# Struktur perangkat lunak

Target aktif: `firmware/esp32c6`, ESP-IDF **5.5.2**, LVGL **9.2.2**, led_strip **3.0.1**, ESP32-C6FH4 dengan flash 4 MB. Implementasi JavaScript hanya berjalan di simulator; perangkat memakai C++ native.

| Perubahan | Berkas yang biasanya diedit |
| --- | --- |
| Kebijakan daya | `components/remora_core/src/power_policy.cpp` |
| Classic, Reverse, Reaction | `components/remora_core/src/game_memory.cpp` |
| Maze | `components/remora_core/src/game_maze.cpp` |
| Whack, Potato, Direction | `components/remora_core/src/game_reflex.cpp` |
| Missing, Decoder | `components/remora_core/src/game_codes.cpp` |
| Snake, Pong | `components/remora_core/src/game_arcade.cpp` |
| Tampilan, dialog tutorial | `components/remora_ui/src/pixel_ui.cpp` |
| Input, perpindahan halaman | `main/app_main.cpp` |
| Profil/NVS | `components/remora_board/src/storage.cpp` |
| SPI/LVGL DMA | `components/remora_board/src/display.cpp` |
| Audio PWM | `components/remora_board/src/audio.cpp` |
| Wi-Fi/portal | `components/remora_board/src/network.cpp` |
| GitHub OTA | `components/remora_board/src/ota.cpp` |
| Pin fisik | `components/remora_board/include/board.hpp`, `main/Kconfig.projbuild` |

Nama path tabel relatif terhadap `firmware/esp32c6`. Parameter balancing mempertahankan aturan simulator. Mengedit satu modul cukup untuk perubahan source; sistem build mengompilasi ulang berkas terkait. **Berkas OTA tetap satu image aplikasi lengkap**, bukan upload satu berkas C++ secara terpisah.

`remora_core` tidak bergantung ESP-IDF sehingga seluruh 11 game × 5 preset, SemVer dan power policy diuji di komputer lewat `tests/core_test.cpp`. Board dan driver bergantung SDK. GitHub Actions membangun dengan container resmi Espressif dan menghasilkan image yang benar untuk C6.

## Renderer dan kelancaran

- Resolusi native **320 × 240 RGB565**; font bitmap dan koordinat bulat.
- Satu canvas framebuffer 153.600 byte; dua buffer transfer DMA masing-masing 10.240 byte. Aset berada di flash.
- Hash pita delapan baris membatasi invalidasi ke wilayah yang berubah; layar statis tidak terus dikirim penuh.
- Callback transfer SPI memberi tahu LVGL ketika DMA selesai. Semua pemanggilan LVGL dilakukan dari satu task.
- UI game/dialog dijadwalkan sekitar 16 ms; halaman statis sekitar 100 ms. Ini jadwal pembaruan, **bukan janji 60 FPS LCD**.
- Waktu game berhenti selama lock/standby; pola dan antrean timer tetap berada di RAM saat light sleep. S0 benar-benar memutus daya sehingga state RAM hilang, sedangkan profil/rekor tetap di NVS.
- Audio PWM 80 kHz dengan mixer PCM 8 kHz, volume utama/BGM/SFX terpisah; meow pendek disimpan di flash.
- Wi-Fi dihentikan ketika mulai bermain dan sebelum standby.

Pada SPI 10 MHz, batas pengiriman framebuffer penuh sekitar 8 FPS sebelum overhead; partial update dapat lebih cepat. Frekuensi lebih tinggi perlu pengujian kabel, modul, catu dan level sinyal pada perangkat asli.

## Display → SPI Clock

Default **10 MHz** sesuai Rev K2. Pilihan uji: **16, 20, 26, 40 MHz**. Setelah perubahan, pengguna harus mengonfirmasi STABIL dalam 15 detik. Tidak dikonfirmasi → kembali 10 MHz. Flag trial disimpan sebelum mengganti clock; reset saat trial → boot kembali 10 MHz. Error transfer atau DMA macet memicu pemulihan/reset dengan default aman.

FPS adalah jumlah frame transfer selesai pada perangkat; simulator tidak memalsukan angka FPS hardware. MCU tidak dapat mengenali semua artefak visual, sehingga konfirmasi pengguna tetap dibutuhkan. Kecerahan dilakukan pada warna framebuffer karena skema tidak menyediakan pin kontrol backlight.

## Aset dan verifikasi

`node tools/export-firmware-assets.cjs` mengekspor sprite, font, guide, 15 ucapan sukses/game, respons game over dan enam potongan meow dari aset simulator. `python tools/export-boot-logo.py` mengemas logo yang sama untuk firmware. Header hasil ekspor disertakan agar build tidak membutuhkan aplikasi pengolah gambar.

Tes simulator: `node tests/ui-smoke.cjs`, `node tests/power-policy-smoke.cjs`, `node tests/profiles-smoke.cjs`. Pratinjau tes berasal dari renderer piksel lokal, bukan screenshot browser/perangkat.
