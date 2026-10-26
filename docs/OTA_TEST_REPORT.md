# Pengujian OTA REMORA

Tanggal: 26 Oktober 2026. Kandidat firmware: v0.3.0.

## Hasil akses GitHub asli

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

Tidak ada papan ESP32-C6 terdeteksi pada port komputer; semua port yang tersedia adalah serial Bluetooth. Karena itu penulisan flash nyata, gangguan daya, kualitas Wi-Fi, reboot ke image baru, rollback bootloader dan retensi profil nyata **belum diuji pada perangkat**. Simulator browser juga tidak melakukan flash OTA.

Partisi aplikasi dan userdata tetap terpisah; peta partisi tidak diubah pada v0.3.0. Mock flash hanya menerima target slot aplikasi nonaktif. Pemeriksaan ini tidak menggantikan pengujian backup/restore dan persistensi pada hardware.

Setelah perangkat tersedia: isi baterai minimal 30%, gunakan firmware versi lama dengan peta partisi yang sama, simpan profil/rekor contoh, sambungkan Wi-Fi lalu jalankan Settings > Network > OTA Update. Pastikan versi baru aktif setelah restart dan profil/rekor masih ada. Uji gangguan unduhan secara terpisah. Jangan gunakan erase-flash untuk pengujian retensi data.
