# Memasang REMORA pada ESP32-C6 SuperMini

Target: ESP32-C6FH4 4 MB, ST7789V 320x240, skema Rev K2. Tidak untuk ESP32-C3/S3.

## Sebelum flash

- S0 OFF dan USB charger TP4056 dilepas, sesuai skema.
- Hubungkan hanya USB ESP32-C6 ke komputer. GPIO9 harus HIGH untuk boot normal.
- Cocokkan pad GPIO23 untuk SK6812; GPIO8 dipakai USB_SENSE, bukan LED bawaan.
- Pengujian listrik/pinout fisik, kalibrasi ADC, polaritas layar dan driver motor tetap perlu dilakukan.

## Dari binary rilis

Gunakan `remora-full.bin` HANYA untuk pemasangan awal dengan peta partisi Rev K2 ini:

    python -m esptool --chip esp32c6 --port COM5 write_flash 0x0 remora-full.bin

Ganti COM5 sesuai perangkat. Jika bootloader tidak masuk otomatis, tahan BOOT/GPIO9 sambil reset sesuai board.

Update berikutnya: Settings > Network > OTA Update. Jangan tulis merged image lewat OTA; OTA hanya menerima `remora-esp32c6.bin`.

## Dari source

ESP-IDF 5.5.2 dan Python dari lingkungan ESP-IDF:

    cd firmware/esp32c6
    idf.py set-target esp32c6
    idf.py build
    idf.py -p COM5 flash monitor

Jangan jalankan `erase-flash` jika ingin mempertahankan profil. OTA dan `idf.py flash` dengan peta partisi tetap tidak menghapus partisi userdata. Backup tetap dianjurkan sebelum perubahan peta partisi; firmware menolak downgrade lewat OTA.

## Penyalaan

S0 ON menyediakan catu; dari standby tahan KEY1+KEY3 selama 2 detik, sementara KEY2/4/5/6 dilepas. Di game, tahan KEY4 dua detik untuk keluar. Saat standby dan USB charger hadir, KEY1 saja dua detik membuka baterai selama lima detik.
