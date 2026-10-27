# Wi-Fi hemat daya — v0.4.1

REMORA menyalakan Wi-Fi saat pemain memilih scan, koneksi, atau setup. Membuka halaman Network saja tidak memulai scan.

| Kondisi | Kapan radio dimatikan |
|---|---|
| Di luar halaman jaringan | 30 detik tidak digunakan |
| Pada halaman Wi-Fi/OTA | 2 menit tanpa input jaringan, setelah proses aktif selesai |
| Hotspot REMORA-SETUP | 5 menit tanpa input jaringan atau aktivitas halaman setup |
| Mulai game, standby, atau mati | Segera |

Scan, proses koneksi, dan pengecekan/pemasangan OTA menahan timer agar radio tidak berhenti di tengah proses. Upaya koneksi yang tidak selesai tidak menahan timer selamanya: perlindungannya dibatasi 20 detik. Setelah operasi selesai, waktu idle dihitung lagi. Input pada game/menu biasa tidak memperpanjang Wi-Fi; input halaman jaringan dan request setup HTTP memperpanjangnya.

Saat otomatis mati, firmware memanggil `esp_wifi_stop()`, menutup hotspot/server setup, membatalkan permintaan koneksi tertunda, dan menampilkan “Wi-Fi otomatis mati. Hubungkan lagi.” Tawaran OTA lama dibersihkan; hubungkan Wi-Fi dan periksa versi kembali sebelum memasang firmware. SSID/password tersimpan, profil, preferensi, rekor, dan rating tidak dihapus.

Penjadwalan koneksi dan pembacaan hasil scan berlangsung pada task aplikasi utama. Callback HTTP/event hanya mengantrekan pekerjaan sehingga callback terlambat tidak menyalakan radio lagi setelah stop. Tidak ada perubahan peta partisi atau schema userdata.

## Hasil pengujian

- ESP32-C6 COM13: radio aktif benar-benar berhenti setelah **30.001 ms** tanpa aktivitas; sentinel NVS tetap terbaca.
- Tes policy dan simulator mencakup batas 30/120/300 detik, aktivitas nyata, operasi terlindungi, mulai game, dan standby.
- 11 tes sumber `network.cpp` dengan I/O driver terkontrol menguji pembatalan setup, callback terlambat, kepemilikan task, dan retensi kredensial.

Tes fisik ini mengonfirmasi penghentian radio. Pengurangan arus baterai/boost converter perlu diukur pada rangkaian lengkap. Lihat [laporan hardware](HARDWARE_TEST_2026-10-27.md) dan [laporan OTA](OTA_TEST_REPORT.md).

## SSID dual-band dan beberapa akses poin — v0.4.2

Pada jaringan yang menyiarkan satu nama untuk 2,4/5 GHz, ESP32-C6 hanya memindai dan menghubungkan radio **2,4 GHz**. Driver memindai seluruh kanal, mengurutkan kandidat berdasarkan sinyal, tidak mengunci BSSID/kanal, dan mencoba ulang satu kali per akses poin. Jaringan terbuka tetap terbuka; ambang keamanan jaringan berpassword tetap WPA2. Akses poin 5 GHz tidak menjadi kandidat.

SSID/password disimpan seperti biasa. Bila perangkat berpindah lokasi, koneksi ulang dapat memilih akses poin 2,4 GHz lain dengan nama yang sama. Banyak kandidat/retry dapat memperpanjang proses; tidak ada klaim bahwa koneksi selalu selesai dalam 20 detik. Batas 20 detik hanya menahan penghitung idle, bukan membatalkan driver secara paksa.
