# Pengujian REMORA pada ESP32-C6 — 27 Oktober 2026

Board pengguna diuji melalui **COM13**, tanpa layar atau periferal lain. Wi-Fi yang digunakan sesuai instruksi: **MAN Insan Cendekia Paser**, tanpa password WPA. Hasil ini memisahkan pengujian langsung pada chip dari pengujian komputer.

## Hasil utama

| Pengujian | Hasil dan batas |
|---|---|
| Identifikasi board | ESP32-C6FH4 QFN32 rev 0.2, flash 4 MB, kristal 40 MHz; USB Serial/JTAG 303A:1001. |
| Core game pada chip | 11 game × 5 difficulty, power policy, rating core, dan SemVer lulus. Memakai core sebelum tambahan misi/bonus v0.4.0; perubahan game sesudah tes ini diuji terpisah di komputer/CI. |
| Renderer pada chip | 75 layar/frame lulus menggunakan LVGL dan framebuffer 320×240. Tidak mengirim gambar melalui SPI ke LCD karena layar belum dipasang. |
| Memori renderer | Framebuffer 153.600 byte + dua draw buffer total 20.480 byte dialokasikan. Free heap sekitar 88.440 byte sesudah alokasi dan sekitar 84 KB ketika Wi-Fi tersambung. Ini bukan pengukuran FPS LCD. |
| Data NVS | Penulisan dan pembacaan sentinel di `userdata` berhasil setelah restart dan reflashing image diagnostik. Ini belum membuktikan retensi seluruh profil melalui OTA sukses. |
| Wi-Fi | SSID ditemukan sebagai jaringan terbuka; akhirnya tersambung dengan IP 10.10.3.232. Asosiasi pertama sempat timeout, retry berhasil. |
| OTA pada perangkat | **Belum berhasil end-to-end.** Jaringan memerlukan login portal sehingga HTTPS GitHub tidak tersedia. Tidak ada binary update yang diunduh atau diinstal lewat OTA. |
| Pemulihan board | Seluruh flash 4 MB awal dipulihkan, lalu dibaca ulang dan dibandingkan byte demi byte: identik. Board ditinggalkan dengan isi awalnya. |

## Hambatan jaringan yang terkonfirmasi

Tes HTTP konektivitas menerima **302** menuju:

```text
http://icpaser.net/login?dst=http%3A%2F%2Fconnectivitycheck.gstatic.com%2Fgenerate%5F204
```

Wi-Fi tanpa password tetap dapat memerlukan login portal. ESP32 mendapat IP tetapi belum memiliki akses internet penuh. HTTPS ke `example.com` dan endpoint latest GitHub sama-sama gagal; TLS berakhir dengan `MBEDTLS_ERR_SSL_CONN_EOF (-0x7280)`.

SNTP `pool.ntp.org` juga tidak menjawab dalam jendela 15 detik. Untuk diagnosis saja, waktu UTC dari komputer diberikan lewat serial; handshake HTTPS tetap gagal. Percobaan Wi-Fi b/g/n dan menonaktifkan power save tidak mengubah hasil. Verifikasi sertifikat HTTPS tetap aktif. Portal tidak dilewati atau diloginkan secara otomatis.

Pengujian OTA fisik berikutnya memerlukan jaringan yang menyediakan akses internet ke ESP32 tanpa portal, atau sesi portal yang telah diotorisasi untuk perangkat tersebut. Download, perpindahan slot boot, rollback, retensi profil lewat OTA sukses, dan ketahanan terhadap putus daya **belum dapat dinyatakan lulus** dari tes ini.

## Perbaikan dari pengujian nyata

1. Konfigurasi konsol lama `CONFIG_ESP_CONSOLE_UART_NONE` menimpa pilihan USB. Dihapus agar USB Serial/JTAG dapat menampilkan status.
2. Task event Wi-Fi/IP mengalami stack protection fault dengan ukuran default 2.816 byte. Ditingkatkan menjadi **6.144 byte**; koneksi kemudian berhasil mendapat IP tanpa crash tersebut.

Keduanya dimasukkan ke firmware v0.4.0. Error awal pada harness renderer karena alokasi temporer berulang diperbaiki pada harness pengujian saja, bukan diklaim sebagai bug produk.

## Backup dan pemulihan

Ukuran backup dan readback: **4.194.304 byte**. SHA-256 keduanya:

```text
8db70e2cdf2dee4458d0882492ee87ac798dd350ebd3f419eda19b9a91208445
```

Peta partisi awal board berbeda dari peta REMORA. Backup penuh dibuat sebelum pemasangan image diagnostik. Backup berpotensi memuat data privat perangkat, sehingga **tidak dimasukkan ke repositori publik**.

Bukti lokal disimpan di `C:\Users\Admin\.codex\visualizations\2026\09\26\01a0ddf0-8c53-77c1-a61b-1bc60c6d267b\hardware-test-2026-10-27`, termasuk `connectivity-final.log`, `bench-serial-final.log`, `backup-report.json`, `restore-report.json`, backup dan readback.

## Pengujian komputer yang melengkapi

Regresi OTA menjalankan sumber updater produksi dengan I/O ESP-IDF terkontrol: **43 skenario**, mencakup hash/ukuran salah, image rusak/terpotong, transfer gagal, cancel, offline, kegagalan flash dan pemilihan boot. Uji akses GitHub publik dari komputer memvalidasi manifest, descriptor, ukuran, dan SHA-256 tanpa token. Ini tidak menggantikan instalasi OTA fisik.

Tambahan gameplay v0.4.0 diuji dengan solver 1.200 peta, pemeriksaan gerbang/scan, expiry bonus Snake, cooldown bonus Pong, render ukuran LCD, dan suite regresi. Hasil build/release dicatat di GitHub Actions.

LCD fisik, warna panel, kelancaran SPI/FPS, tombol fisik, ADC baterai, charger, audio, motor, dan deep sleep rangkaian lengkap belum diuji karena periferal belum dipasang.
