# OTA dari GitHub Releases

Repo publik: [ibnusina339/Remora](https://github.com/ibnusina339/Remora). Perangkat tidak menyimpan token GitHub.

1. Sambungkan Wi-Fi lewat Settings → Network → SCAN WIFI, pilih jaringan lalu isi password jika terkunci. Jaringan terbuka tidak memerlukan password. Pada firmware lama v0.1.0, gunakan Phone Setup atau input manual untuk menyambung sebelum memperbarui.
2. Pilih OTA Update. Pengecekan memakai GitHub API release stabil terbaru.
3. Jika versi lebih baru tersedia dan baterai minimal 30%, hijau memasang update.
4. Firmware masuk slot aplikasi yang tidak aktif. Boot slot baru dipilih setelah seluruh verifikasi lolos.

Captive portal tidak mengatasi halaman login Wi-Fi publik. Jaringan tanpa password dapat langsung dipakai bila menyediakan koneksi internet tanpa portal tambahan. Wi-Fi membutuhkan DNS/HTTPS GitHub yang dapat diakses. Waktu perangkat disinkronkan melalui SNTP sebelum HTTPS; jika NTP tidak terjangkau, perangkat meminta mencoba lagi. TLS memverifikasi sertifikat lewat CA bundle.

**Mulai v0.1.1:** Settings → Network membuka menu tanpa memindai otomatis. Pilih SCAN WIFI, lalu pilih jaringan dan isi password hanya jika terkunci. Jaringan terbuka langsung disambungkan. Input nama Wi-Fi manual pada perangkat dihapus; Phone Setup, koneksi tersimpan dan OTA tetap tersedia pada menu Network. Simulator memakai daftar jaringan contoh berlabel SIMULASI; firmware ESP32 melakukan pemindaian asli. Pengujian pada perangkat fisik tetap diperlukan.

## Versi dan berkas

`firmware/esp32c6/VERSION` berisi Semantic Versioning, contoh `0.1.0`, `0.1.1`, `0.2.0`. Parser membandingkan setiap komponen sebagai bilangan sehingga 1.10.0 lebih baru daripada 1.9.9; mendukung aturan prerelease/build SemVer. OTA hanya mengambil release stabil, menolak versi sama/lebih lama dan prerelease.

Workflow tag `v0.1.0` harus cocok dengan VERSION. Rilis menyertakan:

- `remora-full.bin`: bootloader + partisi + aplikasi, untuk flash awal lewat USB.
- `remora-esp32c6.bin`: aplikasi untuk OTA.
- `manifest.json`: versi, board `esp32c6-supermini-k2`, ukuran, SHA-256 dan schema userdata.
- `FLASHING.md`: petunjuk pemasangan.

Pemeriksaan meliputi URL aset dari repo ini, SemVer, identitas board, nama proyek pada app descriptor, ukuran, SHA-256 dan validasi image ESP-IDF. SHA-256 mendeteksi kerusakan; ini **belum firmware signing/Secure Boot**. Akses penerbit repo menentukan firmware yang dipercaya.

Jika unduhan gagal/terputus, image aktif tidak diganti. Bootloader rollback diaktifkan. Image baru dikonfirmasi setelah inisialisasi NVS, input/ADC, alokasi framebuffer dan transfer LCD awal berhasil; ini tidak menguji tampilan secara visual. Profil berada di partisi terpisah dan tidak dihapus OTA.

## Menerbitkan update

1. Edit hanya modul yang perlu berubah dan perbarui VERSION.
2. Push ke main; tunggu semua tes dan build firmware berhasil.
3. Buat tag `v` diikuti VERSION lalu push tag.
4. Workflow membangun dan mengunggah release beserta manifest otomatis.

Jangan mengganti peta partisi pada update biasa. Perubahan schema harus membaca data lama dan mempertahankan nilai yang sudah ada. Lihat [PROFILES.md](PROFILES.md).

Implementasi waktu mengikuti [ESP-NETIF SNTP ESP-IDF 5.5.2](https://docs.espressif.com/projects/esp-idf/en/v5.5.2/esp32c6/api-reference/network/esp_netif_programming.html#sntp-service).
