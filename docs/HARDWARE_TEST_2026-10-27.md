# Pengujian REMORA pada ESP32-C6 — 27 Oktober 2026

Board pengguna diuji melalui **COM13**, tanpa layar atau periferal lain. Wi-Fi yang digunakan sesuai instruksi: **MAN Insan Cendekia Paser**, tanpa password WPA tetapi menggunakan portal login. Laporan diperbarui setelah autentikasi portal, unduhan OTA fisik, dan pengujian rollback. Hasil ini memisahkan pengujian langsung pada chip dari pengujian komputer.

**Status sementara:** akses internet dan penulisan binary OTA v0.4.0 berhasil. Aplikasi v0.4.0 kemudian mengalami watchdog saat boot; perangkat kembali ke image diagnostik melalui rollback. Kandidat perbaikan v0.4.1 belum dinyatakan lulus end-to-end.

## Hasil utama

| Pengujian | Hasil dan batas |
|---|---|
| Identifikasi board | ESP32-C6FH4 QFN32 rev 0.2, flash 4 MB, kristal 40 MHz; USB Serial/JTAG 303A:1001. |
| Core game pada chip | 11 game × 5 difficulty, power policy, rating core, dan SemVer lulus. Memakai core sebelum tambahan misi/bonus v0.4.0; perubahan game sesudah tes ini diuji terpisah di komputer/CI. |
| Renderer pada chip | 75 layar/frame lulus menggunakan LVGL dan framebuffer 320×240. Tidak mengirim gambar melalui SPI ke LCD karena layar belum dipasang. |
| Memori renderer | Framebuffer 153.600 byte + dua draw buffer total 20.480 byte dialokasikan. Free heap sekitar 88.440 byte sesudah alokasi dan sekitar 84 KB ketika Wi-Fi tersambung. Ini bukan pengukuran FPS LCD. |
| Data NVS | Sentinel di `userdata` berhasil dibaca setelah restart, reflashing diagnostik, instalasi OTA, dan rollback (`BENCH\|NVS\|VERIFY\|ESP_OK`). Ini belum membuktikan seluruh profil/rekor melalui aplikasi produksi yang stabil. |
| Wi-Fi dan portal | Login tamu **Tamu** berhasil. Perangkat memperoleh akses internet: pemeriksaan gstatic **204**, HTTPS example.com **200**, dan API GitHub Releases **200**, dengan verifikasi sertifikat tetap aktif. |
| Radio Wi-Fi | Pembacaan langsung terakhir: **RSSI −60 dBm**, kanal **6**, bandwidth **20 MHz**. Kecepatan PHY TX/RX terpisah belum terukur; bukan disamakan dengan throughput atau kapasitas maksimum radio. |
| Pemeriksaan update | **3 dari 3** pemeriksaan berulang berhasil menawarkan v0.4.0 melalui jaringan asli, dengan framebuffer tetap dialokasikan. Pesan: `Ready to update to 0.4.0 version`. |
| Unduhan dan flash OTA | Binary publik v0.4.0 **1.792.192 byte** selesai **100%**, dipilih untuk boot, dan hasil baca ulang slot aplikasi cocok SHA-256 dengan aset publik. |
| Boot dan rollback | Boot aplikasi produksi v0.4.0 mengalami watchdog pada task `esp_timer`. Sesudah reset normal, bootloader menandai `ota_1` **ABORTED (4)** dan kembali ke diagnostik `ota_0` **VALID (2)**; sentinel NVS tetap terbaca. |
| Isi board saat laporan diperbarui | Image diagnostik **0.2.0** di `ota_0`; **bukan** isi flash awal yang telah dipulihkan. |

## Portal jaringan: hambatan awal sudah terselesaikan

Tes HTTP konektivitas menerima **302** menuju:

```text
http://icpaser.net/login?dst=http%3A%2F%2Fconnectivitycheck.gstatic.com%2Fgenerate%5F204
```

Pada percobaan awal, ESP32 mendapat IP tetapi belum memiliki akses internet penuh. HTTPS ke `example.com` dan endpoint latest GitHub sama-sama gagal; TLS berakhir dengan `MBEDTLS_ERR_SSL_CONN_EOF (-0x7280)`. SNTP juga belum menjawab. Hasil awal ini menjelaskan kegagalan sebelum login, bukan status koneksi terakhir.

Setelah login portal menggunakan akun tamu yang diizinkan pengguna, pemeriksaan gstatic menerima 204 dan kedua tujuan HTTPS menerima 200. Pemeriksaan metadata dan pengunduhan aset GitHub kemudian berhasil. Identitas akun portal pribadi tidak dipersistenkan ke firmware/repository; log autentikasi dan backup privat tetap di luar repository publik.

RSSI diambil melalui API STA, bukan estimasi dari komputer. API publik ESP-IDF 5.5.2 menyediakan `esp_wifi_sta_get_rssi`, `esp_wifi_sta_get_ap_info`, `esp_wifi_sta_get_negotiated_phymode`, dan `esp_wifi_get_bandwidth`, tetapi tidak menyediakan getter bitrate PHY TX/RX STA saat ini secara terpisah. Karena itu laporan tidak mengubah field driver `max_rate` menjadi dua angka Mbps. Lihat [header API resmi ESP-IDF 5.5.2](https://github.com/espressif/esp-idf/blob/v5.5.2/components/esp_wifi/include/esp_wifi.h).

## OTA fisik dan masalah boot yang ditemukan

Updater dari sumber kandidat perbaikan diperiksa tiga kali berturut-turut saat framebuffer 153.600 byte dan draw buffer 20.480 byte masih dialokasikan; semuanya selesai dengan penawaran v0.4.0. Transfer berikutnya mencapai 100%, menulis slot nonaktif, dan meminta restart.

Hasil baca ulang `ota-slot1-v040-readback.bin` berukuran **1.792.192 byte** memiliki SHA-256 yang sama dengan firmware publik v0.4.0:

```text
a2a4c91ee90d89526dfd2280ed3c1aac170a05681bbbc652e283eb32b02d2cb0
```

Keberhasilan transfer ini **belum berarti aplikasi produksi stabil**. Boot v0.4.0 memicu task watchdog dengan CPU berada pada `esp_timer`. Analisis audio menemukan `ledc_set_duty` lama memerlukan sekitar **160 µs**, melebihi periode callback audio **125 µs**. Perbaikan runtime dan hasil uji diagnostiknya dicatat di bagian v0.4.1 di bawah.

Setelah reset normal, diagnostik melaporkan `ota_0` VALID (2), `ota_1` ABORTED (4), dan verifikasi sentinel `userdata` ESP_OK. Ini merupakan bukti rollback bootloader dan retensi sentinel melalui percobaan OTA yang gagal boot. Pengujian seluruh profil/rekor, boot stabil kandidat perbaikan, dan gangguan daya tetap belum selesai.

## Perbaikan dari pengujian nyata

1. Konfigurasi konsol lama `CONFIG_ESP_CONSOLE_UART_NONE` menimpa pilihan USB. Dihapus agar USB Serial/JTAG dapat menampilkan status.
2. Task event Wi-Fi/IP mengalami stack protection fault dengan ukuran default 2.816 byte. Ditingkatkan menjadi **6.144 byte**; koneksi kemudian berhasil mendapat IP tanpa crash tersebut.

Keduanya dimasukkan ke firmware v0.4.0. Error awal pada harness renderer karena alokasi temporer berulang diperbaiki pada harness pengujian saja, bukan diklaim sebagai bug produk. Pengujian lanjutan juga menemukan kebutuhan membatasi memori metadata/redirect OTA dan biaya callback audio; kelulusan akhir kandidat v0.4.1 belum diklaim di sini.

## Backup dan pemulihan

Pemulihan **pertama** menulis seluruh flash awal, membaca ulang **4.194.304 byte**, dan membandingkan isinya byte demi byte: identik. SHA-256 backup dan readback pertama:

```text
8db70e2cdf2dee4458d0882492ee87ac798dd350ebd3f419eda19b9a91208445
```

Pada pemulihan **kedua**, proses penulisan dan pemeriksaan hash oleh alat flash berhasil, tetapi pembacaan ulang penuh macet. Karena itu pemulihan kedua tidak diklaim identik berdasarkan readback. Pengujian selanjutnya kembali memasang diagnostik; board saat ini menjalankan diagnostik 0.2.0 setelah rollback, bukan flash awal.

Peta partisi awal board berbeda dari peta REMORA. Backup penuh dibuat sebelum pemasangan image diagnostik. Backup berpotensi memuat data privat perangkat, sehingga **tidak dimasukkan ke repositori publik**.

Bukti lokal disimpan di `C:\Users\Admin\.codex\visualizations\2026\09\26\01a0ddf0-8c53-77c1-a61b-1bc60c6d267b\hardware-test-2026-10-27`, termasuk `guest-session.log`, `ota-slot1-readback.log`, `ota-slot1-v040-readback.bin`, `post-ota-boot.log`, `rollback-after-ota.log`, serta laporan backup/restore awal. File log portal dan backup privat tidak dipublikasikan.

## Pengujian komputer yang melengkapi

Regresi OTA menjalankan sumber updater produksi dengan I/O ESP-IDF terkontrol: **71 skenario**, mencakup hash/ukuran salah, image rusak/terpotong, transfer gagal, cancel, offline, kegagalan flash dan pemilihan boot. Uji akses GitHub publik dari komputer memvalidasi manifest, descriptor, ukuran, dan SHA-256 tanpa token. Ini tidak menggantikan instalasi OTA fisik.

Tambahan gameplay v0.4.0 diuji dengan solver 1.200 peta, pemeriksaan gerbang/scan, expiry bonus Snake, cooldown bonus Pong, render ukuran LCD, dan suite regresi. Hasil build/release dicatat di GitHub Actions.

LCD fisik, warna panel, kelancaran SPI/FPS, tombol fisik, ADC baterai, charger, audio, motor, dan deep sleep rangkaian lengkap belum diuji karena periferal belum dipasang.

## Uji perbaikan audio dan hemat Wi-Fi v0.4.1

Sumber runtime perbaikan berhasil dibangun dengan ESP-IDF 5.5.2. Pada diagnostik COM13, framebuffer dan draw buffer tetap dialokasikan, radio aktif, lalu audio BGM/PCM/SFX dijalankan 12 detik dan diikuti dua detik senyap. Hasil: **120/120 pemeriksaan clock aktif**, waktu **14.000 ms**, tidak ada watchdog, dan clock sampel berhenti saat senyap. Tidak ada speaker terpasang; ini bukan penilaian kualitas bunyi atau pengukuran waveform.

Radio kemudian diuji tanpa aktivitas: dari keadaan aktif menjadi mati pada **30.001 ms**. `NVSVERIFY` kembali **ESP_OK**. Kebijakan produksi memakai 30 detik di luar menu jaringan, 120 detik tanpa aktivitas pada menu jaringan, dan 300 detik pada setup ponsel. Scan, koneksi yang masih berlangsung, serta OTA dilindungi; mulai game dan standby/mati mematikan radio segera. Setup HTTP dan input jaringan mengulang timer. Pengurangan arus boost belum diukur.

Pada percobaan jaringan paling akhir, lima upaya koneksi tidak menemukan SSID sekolah (reason 201). Scan memakai runtime baru maupun image diagnostik lama yang sebelumnya berhasil sama-sama tidak melihat SSID tersebut. Karena itu RSSI −60 dBm di atas adalah pembacaan koneksi sebelumnya, bukan sinyal saat ini. Pemeriksaan ini tidak memastikan penyebab perubahan penerimaan radio. **Instalasi OTA fisik v0.4.1 sampai boot produksi belum dibuktikan**; jaringan sekolah perlu terlihat kembali dan periferal/baterai perlu dipasang untuk pemeriksaan kesehatan boot.

Regresi komputer terbaru menjalankan **71 skenario OTA (0 gagal)** dan **11 skenario lifecycle Wi-Fi (0 gagal)** pada sumber produksi, termasuk pembatalan koneksi tertunda, callback scan setelah stop, dan perlindungan operasi aktif. [Build dan hasil tes](https://github.com/ibnusina339/Remora/actions/runs/40487837323). Suite audio terpisah lulus pada CI, mencakup mute, idle-low, clock tunggal, dan callback sesudah stop.

Bukti lokal tambahan: `runtime-idle-audio.log`, `old-radio-scan.log`, dan `flash-runtime-bench.log`. Tidak ada log autentikasi atau backup privat yang dipublikasikan.

Board terakhir dikembalikan ke diagnostik runtime terbaru (descriptor 0.2.0), dengan radio tidak dinyalakan. Status slot aktif VALID dan `NVSVERIFY` ESP_OK; lihat bukti lokal `runtime-final-state.log`. Firmware produksi v0.4.1 tersedia terpisah melalui GitHub Releases.

## Verifikasi rilis publik v0.4.1

[Rilis v0.4.1](https://github.com/ibnusina339/Remora/releases/tag/v0.4.1) telah diterbitkan. [Pemeriksaan rilis](https://github.com/ibnusina339/Remora/actions/runs/40488874494) lulus, mencakup build ESP-IDF, 71 skenario OTA, 11 skenario lifecycle Wi-Fi, suite audio, core game, dan simulasi UI.

Pemeriksaan komputer tanpa token mengonfirmasi HEAD `releases/latest` mengembalikan **302** ke tag v0.4.1. Manifest, binary OTA, dan full image terunduh melalui HTTPS tervalidasi. Binary **1,798,816 byte**, descriptor **0.4.1 / Remora**, SHA-256:

```text
b7a32dfdea8fe85ef5166bdcb14f9b471297b248efa5603232056200f298ee8f
```

Full image memuat binary yang identik di offset 0x20000 dan berakhir sebelum partisi userdata 0x3e0000; schema userdata tetap 1. Ini melengkapi validasi publik/komputer, bukan klaim instalasi OTA fisik v0.4.1 sampai boot produksi.
