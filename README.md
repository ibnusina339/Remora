# REMORA

Konsol enam keyswitch RGB dengan 11 game, maskot sapi, dan kucing rahasia. Repo ini berisi simulator browser serta **firmware native ESP32-C6 SuperMini** untuk skema Rev K2.

Target: ESP32-C6FH4 flash 4 MB, TFT ST7789V 320×240, enam SK6812 MINI-E, PAM8302A PWM, TP4056 protection. Firmware memakai ESP-IDF **5.5.2** dan LVGL **9.2.2**.

Versi terbaru: **[v0.3.0](https://github.com/ibnusina339/Remora/releases/tag/v0.3.0)**, dengan SFX tambahan, ajakan rating opsional, dan tema White / Black.

## Mulai

- **Simulator:** buka `index.html`, klik ON, lalu tahan keyswitch kiri atas + kanan atas dua detik. Keyboard **Q + E** juga bisa. Ikuti penamaan dan tutorial pada profil baru.
- **Perangkat:** unduh binary dari [GitHub Releases](https://github.com/ibnusina339/Remora/releases) dan ikuti [panduan flash](docs/FLASHING.md).
- **Kontrol:** Q W E / A S D atau **numpad 4 5 6 / 1 2 3** mewakili posisi keyswitch. Numpad mengikuti posisi fisiknya, termasuk saat Num Lock mati. Warna dan petunjuk pada layar mengikuti fungsi tombol; tidak ada penomoran tombol pada UI.
- **Matikan:** tahan kiri atas + kanan atas / KEY1 + KEY3 dua detik, lalu hijau untuk matikan atau merah untuk batal. Di numpad: tahan **4 + 6**.
- **Keluar game:** tahan kiri bawah / KEY4 **dua detik**. Escape tersedia di simulator.

## Fitur

- Classic, Reverse, Reaction, Light Maze, Whack-a-Light, Hot Potato, Direction Shift, Missing Key, Signal Decoder, Snake dan Pong. Space Invader sudah dihapus.
- INFO berhalaman dengan teks lebih besar, Retry langsung, Difficulty tersimpan per game, tahan navigasi carousel untuk bergeser terus.
- **Lima profil lokal:** nama, rekor per game/Difficulty, statistik, preferensi dan tutorial terpisah. Tidak membutuhkan cloud/Wi-Fi.
- **First Login:** membuat pemain baru saat penyalaan berikutnya, setelah countdown tiga detik. Jika lima slot penuh, hapus satu profil dulu.
- Tutorial dialog ketik dengan sapaan nama pemain dan kucing duduk **tanpa lidah**. Skip rahasia KEY4 + KEY6 tiga detik.
- Software lock Rev K2: baterai ≤5% / pulih ≥10%; USB charger + baterai ≥80% mengunci game. Standby memakai light sleep.
- Saat charging standby, KEY1 saja dua detik menampilkan persen baterai lima detik. Tanpa USB, KEY1 saja diabaikan.
- Volume utama, BGM dan SFX 0–100%; enam meow pendek, efek game dan musik menu.
- SPI 10 MHz default, trial 16/20/26/40 MHz, konfirmasi 15 detik, fallback setelah timeout/error/reset saat trial. FPS hardware diukur pada perangkat.
- OTA GitHub Releases dengan Semantic Versioning, SHA-256, dua slot aplikasi, boot rollback dan partisi profil terpisah.

Mulai v0.2.0 tersedia tutorial lebih ringkas, kontrol Snake KEY2/5/6/4 dan pilihan SCAN WIFI pada menu Settings → Network. Wi-Fi dipindai setelah memilih Scan, tanpa input nama jaringan manual pada perangkat. Simulator menampilkan contoh jaringan; pemindaian asli berjalan di firmware ESP32. Lihat [catatan v0.2.0](docs/releases/v0.2.0.md).

- **Rate Me:** rating setengah bintang untuk setiap game dan lima aspek Remora; saran maksimal dua. Lima profil pemain ditambah XDAXA yang dilindungi kode akses. [Panduan rating](docs/RATINGS.md).

## Dokumentasi

| Topik | Panduan |
| --- | --- |
| Pemasangan dan build | [FLASHING](docs/FLASHING.md) |
| Pin, baterai, USB dan software lock | [POWER_AND_PINS](docs/POWER_AND_PINS.md) |
| Profil, tutorial dan ketahanan data | [PROFILES](docs/PROFILES.md) |
| Rilis dan pembaruan OTA | [OTA](docs/OTA.md) |
| Modul, rendering dan performa | [ARCHITECTURE](docs/ARCHITECTURE.md) |
| Desain fisik simulator dan aturan game | [SIMULATOR_DESIGN](docs/SIMULATOR_DESIGN.md) |
| Skema pengguna Rev K2 | [PDF](docs/hardware/REMORA_Schematic_Rev_K2_A4.pdf) |

`firmware/esp32c6` adalah target aktif. Source game dibagi per kelompok; driver, penyimpanan, OTA dan UI terpisah. Perubahan kecil cukup mengedit modul terkait; binary OTA tetap aplikasi lengkap. Balancing game tidak diubah pada pekerjaan firmware ini.

## Pengujian

```sh
mkdir -p previews
node tests/ui-smoke.cjs
node tests/power-policy-smoke.cjs
node tests/profiles-smoke.cjs
g++ -std=gnu++17 -I firmware/esp32c6/components/remora_core/include firmware/esp32c6/components/remora_core/src/*.cpp firmware/esp32c6/tests/core_test.cpp -o remora-core
./remora-core
```

GitHub Actions menjalankan tes dan build ESP-IDF resmi. Tag `v` + VERSION menerbitkan `remora-full.bin`, `remora-esp32c6.bin`, manifest dan petunjuk flash.

**Status:** firmware berhasil dikompilasi dan tes logika/UI otomatis tersedia. Belum diuji pada board fisik pengguna. Pad GPIO23, kalibrasi ADC, orientasi LCD dan kestabilan SPI harus diperiksa saat pemasangan. Data profil bertahan pada OTA dengan peta partisi tetap; erase seluruh chip tetap menghapusnya. Simulator menyimpan data di browser dan tidak mengendalikan hardware.
