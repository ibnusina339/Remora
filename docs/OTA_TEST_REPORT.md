# Pengujian OTA REMORA

Diperbarui: **27 Oktober 2026**. Laporan mencakup regresi komputer awal v0.3.0 dan pengujian nyata ESP32-C6 terhadap firmware publik v0.4.0. Kandidat perbaikan v0.4.1 belum dinyatakan lulus end-to-end.

## Hasil terbaru pada ESP32-C6

Board COM13 diuji tanpa LCD atau periferal. Login portal Wi-Fi **MAN Insan Cendekia Paser** menggunakan akun tamu yang diizinkan pengguna berhasil; pemeriksaan gstatic menerima **204**, HTTPS example.com **200**, dan API GitHub Releases **200**. Verifikasi sertifikat HTTPS tetap aktif.

| Tahap | Hasil langsung pada perangkat |
|---|---|
| Periksa versi dari GitHub | **3/3** pemeriksaan berulang berhasil, dengan framebuffer dan draw buffer masih dialokasikan. Versi publik v0.4.0 ditawarkan sebagai `Ready to update to 0.4.0 version`. |
| Unduh dan tulis binary | Selesai **100%**, **1.792.192 byte** ditulis ke slot aplikasi nonaktif dan dipilih untuk boot. |
| Verifikasi isi slot | Readback slot OTA cocok dengan SHA-256 firmware publik v0.4.0: `a2a4c91ee90d89526dfd2280ed3c1aac170a05681bbbc652e283eb32b02d2cb0`. |
| Boot aplikasi produksi | **Belum lulus.** v0.4.0 memicu watchdog pada task `esp_timer`. Analisis callback audio menemukan `ledc_set_duty` lama sekitar 160 µs, melebihi periode audio 125 µs. Perbaikan masih berlangsung. |
| Rollback | Setelah reset normal, bootloader kembali ke diagnostik `ota_0` VALID (2); image `ota_1` ditandai ABORTED (4). |
| Persistensi | Sentinel `userdata` tetap lulus `NVSVERIFY` sesudah percobaan OTA dan rollback. Ini belum membuktikan semua profil/rekor pada aplikasi produksi yang stabil. |

**Kesimpulan sementara:** jaringan, pemeriksaan versi, transfer firmware, penulisan flash, kecocokan binary, dan rollback telah dibuktikan. Boot produksi yang stabil serta kelulusan akhir kandidat v0.4.1 masih menunggu perbaikan dan pengujian ulang. Board saat laporan diperbarui menjalankan **image diagnostik 0.2.0**, bukan isi flash awal.

RSSI langsung terakhir **−60 dBm**, kanal **6**, bandwidth **20 MHz**. Bitrate PHY TX/RX terpisah belum diukur; API STA publik ESP-IDF 5.5.2 menyediakan RSSI/mode PHY/bandwidth, tanpa getter kecepatan TX/RX saat ini secara terpisah. Angka kapasitas maksimum atau throughput tidak dilaporkan sebagai penggantinya. Referensi: [API Wi-Fi resmi ESP-IDF 5.5.2](https://github.com/espressif/esp-idf/blob/v5.5.2/components/esp_wifi/include/esp_wifi.h).

Bukti transfer, boot, rollback, persistensi, dan batas pemulihan board dirinci dalam [laporan perangkat 27 Oktober](HARDWARE_TEST_2026-10-27.md). Log autentikasi dan backup privat tidak dimasukkan ke repository publik; identitas akun portal pribadi tidak dipersistenkan ke firmware/repository.

## Pengujian komputer awal — 26 Oktober 2026

Pengunduhan di komputer ini dilakukan **tanpa token**, dengan validasi sertifikat HTTPS dan User-Agent perangkat. Endpoint latest saat pengujian menunjuk v0.2.0. Manifest dan binary mengikuti pengalihan HTTPS GitHub dengan sukses.

- Metadata release: 17.088 byte, di bawah batas firmware 24.576 byte.
- Binary: 1.773.760 byte, muat di slot OTA 1.966.080 byte.
- SHA-256: `34d9db2e5ce7e6b1054cc5474d4e85605a005274c578bc16c2ad938da2499f93`.
- Board, tag, nama proyek Remora dan versi app descriptor cocok.

## Regresi pada kode updater asli

Pengujian mengompilasi sumber `ota.cpp` produksi, mengganti batas ESP-IDF berupa HTTP, FreeRTOS, SNTP dan flash dengan I/O terkontrol. JSON memakai cJSON dan hash dihitung sungguhan dengan OpenSSL. Ini bukan implementasi OTA kedua.

[Baseline](https://github.com/ibnusina339/Remora/actions/runs/40292336345): 29 lolos, 11 gagal. [Setelah perbaikan awal](https://github.com/ibnusina339/Remora/actions/runs/40292642126): 40 lolos, 0 gagal. [Build lengkap dengan 43 skenario](https://github.com/ibnusina339/Remora/actions/runs/40293072591) lulus, termasuk magic image, Wi-Fi putus tepat sebelum install, serta cancel saat memeriksa release.

Kasus yang dicakup:

- Download sukses menulis byte yang sama ke partisi aplikasi nonaktif, memvalidasi image, memilih boot lalu restart.
- Pembacaan 17 byte per potongan, sehingga app descriptor terbelah ke beberapa pembacaan; pengalihan aset HTTPS dan batas redirect.
- Versi sama/lebih lama, draft/prerelease, board/aset/versi/hash/ukuran tidak cocok, lokasi aset dari tag lain, serta partisi OTA tidak tersedia.
- Respons 403, header gagal, metadata terlalu besar/tidak lengkap, downgrade HTTP, kegagalan TLS dan alokasi client/task.
- Image rusak/terpotong/berlebih, transfer belum lengkap, read error, cancel, proyek/versi/magic image salah.
- Kegagalan begin/write/end/set-boot; handle yang sudah dilepas oleh end tidak di-abort lagi. Image aktif tidak dipilih ulang pada kegagalan verifikasi.
- Penawaran update kedaluwarsa saat offline serta sinkronisasi waktu gagal/berhasil.

Perbaikan menolak 11 kondisi baseline yang sebelumnya lolos atau masih menampilkan penawaran. Ketentuan SHA-256 dan validasi image yang sebelumnya sudah bekerja tetap diuji.

## Batas pengujian

Pada pengujian komputer **26 Oktober 2026**, belum ada papan ESP32-C6 terdeteksi; hasil bagian tersebut memakai I/O terkontrol. Pengujian perangkat **27 Oktober** di bagian atas kemudian membuktikan transfer/flash nyata, readback, rollback, dan retensi sentinel. Simulator browser tetap tidak melakukan flash OTA.

Partisi aplikasi dan userdata tetap terpisah; peta partisi tidak diubah pada v0.3.0. Mock flash hanya menerima target slot aplikasi nonaktif. Pemeriksaan ini tidak menggantikan pengujian backup/restore dan persistensi pada hardware.

Pengujian yang masih diperlukan: boot stabil kandidat perbaikan sampai image dikonfirmasi valid, seluruh profil/rekor contoh tetap ada setelah update, serta gangguan unduhan/daya. Untuk retensi gunakan peta partisi yang sama dan jangan menjalankan erase-flash. LCD fisik, FPS/SPI, tombol, audio keluaran, baterai, charger, dan deep sleep rangkaian lengkap belum diuji karena periferal belum terpasang.

## Catatan pemulihan board

Pemulihan pertama flash awal 4 MB memiliki readback yang identik. Pada pemulihan kedua, penulisan dan pemeriksaan hash alat flash berhasil, tetapi readback penuh macet; tidak ada klaim kesamaan byte demi byte untuk pemulihan kedua. Pengujian berikutnya kembali memasang diagnostik, dan rollback terakhir kembali ke diagnostik 0.2.0.
